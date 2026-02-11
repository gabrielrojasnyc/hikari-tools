import sqlite3 from 'sqlite3';
import path from 'path';

const DB_PATH = process.env.DB_PATH || 'data/nagomi.db';

// Helper functions
function query(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

/**
 * Fetch current price for a ticker (mock implementation - replace with real API)
 * @param {string} ticker - Stock ticker symbol
 * @returns {number|null} - Current price or null
 */
async function getCurrentPrice(ticker) {
  // Mock implementation - in production, use Yahoo Finance or similar
  // This would fetch from an API like:
  // https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1m&range=1d
  
  // For testing, return simulated prices
  const mockPrices = {
    'NVDA': 875.50,
    'AMD': 165.20,
    'TSM': 125.80,
    'MSFT': 415.30,
    'GOOGL': 175.40,
    'AMZN': 178.90,
    'META': 495.60,
    'CRM': 295.40,
    'ZM': 65.30,
    'DOCU': 52.10
  };
  
  return mockPrices[ticker] || 100.00;
}

/**
 * Record a new prediction for accuracy tracking
 * @param {object} prediction - Prediction data
 * @param {string} dbPath - Path to database
 */
async function recordPrediction(prediction, dbPath = DB_PATH) {
  const db = new sqlite3.Database(dbPath);
  const sql = `
    INSERT INTO twitter_prediction_accuracy 
    (handle, ticker, prediction_date, prediction_type, confidence, price_at_prediction)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  
  const result = await run(db, sql, [
    prediction.handle,
    prediction.ticker,
    prediction.prediction_date || new Date().toISOString(),
    prediction.prediction_type,
    prediction.confidence,
    prediction.price_at_prediction
  ]);
  
  db.close();
  return result;
}

/**
 * Update accuracy scores for pending predictions
 * @param {string} dbPath - Path to database
 * @returns {object} - Summary of updates
 */
async function updateAccuracy(dbPath = DB_PATH) {
  const db = new sqlite3.Database(dbPath);
  console.log("Starting accuracy tracking...");
  
  const summary = { updated: 0, accountsUpdated: 0 };

  // Find predictions that need price updates
  const pending = await query(db, `
    SELECT * FROM twitter_prediction_accuracy 
    WHERE (accuracy_1h IS NULL OR accuracy_4h IS NULL OR accuracy_1d IS NULL)
    ORDER BY prediction_date DESC
    LIMIT 100
  `);

  console.log(`Found ${pending.length} pending predictions.`);

  for (const p of pending) {
    const currentPrice = await getCurrentPrice(p.ticker);
    if (!currentPrice) continue;

    const hoursPassed = (new Date() - new Date(p.prediction_date)) / (1000 * 60 * 60);
    let updated = false;

    // Update 1h accuracy
    if (hoursPassed >= 1 && p.accuracy_1h === null) {
      const priceChange = currentPrice - p.price_at_prediction;
      const predictedDirection = p.prediction_type === 'bullish' ? 1 : -1;
      const actualDirection = priceChange >= 0 ? 1 : -1;
      const correct = predictedDirection === actualDirection;
      
      await run(db, 
        "UPDATE twitter_prediction_accuracy SET price_1h = ?, accuracy_1h = ? WHERE id = ?",
        [currentPrice, correct ? 1 : 0, p.id]
      );
      updated = true;
    }

    // Update 4h accuracy
    if (hoursPassed >= 4 && p.accuracy_4h === null) {
      const priceChange = currentPrice - p.price_at_prediction;
      const predictedDirection = p.prediction_type === 'bullish' ? 1 : -1;
      const actualDirection = priceChange >= 0 ? 1 : -1;
      const correct = predictedDirection === actualDirection;
      
      await run(db,
        "UPDATE twitter_prediction_accuracy SET price_4h = ?, accuracy_4h = ? WHERE id = ?",
        [currentPrice, correct ? 1 : 0, p.id]
      );
      updated = true;
    }

    // Update 1d accuracy
    if (hoursPassed >= 24 && p.accuracy_1d === null) {
      const priceChange = currentPrice - p.price_at_prediction;
      const predictedDirection = p.prediction_type === 'bullish' ? 1 : -1;
      const actualDirection = priceChange >= 0 ? 1 : -1;
      const correct = predictedDirection === actualDirection;
      
      await run(db,
        "UPDATE twitter_prediction_accuracy SET price_1d = ?, accuracy_1d = ? WHERE id = ?",
        [currentPrice, correct ? 1 : 0, p.id]
      );
      updated = true;
    }
    
    if (updated) summary.updated++;
  }

  // Update Account Weights
  console.log("Updating account weights...");
  const accounts = await query(db, "SELECT DISTINCT handle FROM twitter_prediction_accuracy WHERE handle IS NOT NULL");

  for (const acc of accounts) {
    const stats = await get(db, `
      SELECT 
        AVG(CASE WHEN accuracy_1d IS NOT NULL THEN accuracy_1d END) as acc_1d,
        AVG(CASE WHEN accuracy_4h IS NOT NULL THEN accuracy_4h END) as acc_4h,
        COUNT(*) as total
      FROM twitter_prediction_accuracy
      WHERE handle = ?
    `, [acc.handle]);

    if (stats && stats.total > 0) {
      const acc1d = stats.acc_1d || 0.5;
      const acc4h = stats.acc_4h || 0.5;
      const avgAccuracy = (acc1d + acc4h) / 2;
      const weight = 0.5 + (avgAccuracy * 1.5); // Scale: 0.5 to 2.0
      
      await run(db, `
        INSERT INTO twitter_account_weights (handle, accuracy_1d, accuracy_4h, weight_multiplier, last_updated)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(handle) DO UPDATE SET
          accuracy_1d = excluded.accuracy_1d,
          accuracy_4h = excluded.accuracy_4h,
          weight_multiplier = excluded.weight_multiplier,
          last_updated = CURRENT_TIMESTAMP
      `, [acc.handle, acc1d, acc4h, weight]);
      
      summary.accountsUpdated++;
    }
  }

  console.log(`Accuracy tracking complete. Updated ${summary.updated} predictions, ${summary.accountsUpdated} accounts.`);
  db.close();
  return summary;
}

/**
 * Get accuracy stats for a specific account
 * @param {string} handle - Twitter handle
 * @param {string} dbPath - Path to database
 * @returns {object} - Accuracy stats
 */
async function getAccountAccuracy(handle, dbPath = DB_PATH) {
  const db = new sqlite3.Database(dbPath);
  const stats = await get(db, `
    SELECT 
      AVG(accuracy_1d) as avg_1d,
      AVG(accuracy_4h) as avg_4h,
      COUNT(*) as total_predictions
    FROM twitter_prediction_accuracy
    WHERE handle = ?
  `, [handle]);
  
  const weight = await get(db, `SELECT * FROM twitter_account_weights WHERE handle = ?`, [handle]);
  
  db.close();
  return { accuracy: stats, weight: weight };
}

export { updateAccuracy, recordPrediction, getAccountAccuracy, getCurrentPrice };
