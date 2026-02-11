import sqlite3 from 'sqlite3';
import path from 'path';

const DB_PATH = process.env.DB_PATH || 'data/nagomi.db';

// Helper function
function query(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
      db.close();
    });
  });
}

/**
 * Get weighted Twitter signals aggregated by ticker
 * @param {number} hours - Lookback period in hours (default: 24)
 * @param {string} dbPath - Path to SQLite database
 * @returns {Array} - Array of weighted signal objects
 */
async function getWeightedSignals(hours = 24, dbPath = DB_PATH) {
  const db = new sqlite3.Database(dbPath);
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const signals = await query(db, `
    SELECT 
      t.concept,
      t.tickers,
      t.confidence,
      t.source_handle,
      t.extracted_at,
      w.weight_multiplier
    FROM twitter_concept_signals t
    LEFT JOIN twitter_account_weights w ON t.source_handle = w.handle
    WHERE t.extracted_at > ?
    ORDER BY t.extracted_at DESC
  `, [cutoff]);

  const aggregated = {};

  for (const s of signals) {
    let tickers = [];
    try {
      tickers = JSON.parse(s.tickers);
    } catch (e) {
      // If not JSON, assume comma-separated
      tickers = s.tickers.split(',').map(t => t.trim());
    }
    
    const weight = s.weight_multiplier || 1.0;
    const baseScore = s.confidence * weight;

    for (const ticker of tickers) {
      if (!aggregated[ticker]) {
        aggregated[ticker] = {
          ticker,
          score: 0,
          mentions: 0,
          concepts: [],
          sources: [],
          avgConfidence: 0,
          totalConfidence: 0
        };
      }
      
      // Determine sentiment based on concept
      let sentiment = 1;
      const conceptLower = (s.concept || '').toLowerCase();
      if (conceptLower.includes("implosion") || 
          conceptLower.includes("short") || 
          conceptLower.includes("breach") ||
          conceptLower.includes("slowdown") ||
          conceptLower.includes("layoffs")) {
        sentiment = -1;
      }
      
      aggregated[ticker].score += baseScore * sentiment;
      aggregated[ticker].mentions++;
      aggregated[ticker].totalConfidence += s.confidence;
      
      if (!aggregated[ticker].concepts.includes(s.concept)) {
        aggregated[ticker].concepts.push(s.concept);
      }
      if (!aggregated[ticker].sources.includes(s.source_handle)) {
        aggregated[ticker].sources.push(s.source_handle);
      }
    }
  }
  
  // Calculate averages and finalize
  const results = Object.values(aggregated).map(item => {
    item.avgConfidence = item.mentions > 0 ? item.totalConfidence / item.mentions : 0;
    delete item.totalConfidence;
    return item;
  });

  // Sort by absolute score (most significant signals first)
  return results.sort((a, b) => Math.abs(b.score) - Math.abs(a.score));
}

/**
 * Get sentiment for a specific ticker
 * @param {string} ticker - Stock ticker symbol
 * @param {number} hours - Lookback period in hours
 * @param {string} dbPath - Path to database
 * @returns {object|null} - Sentiment data or null
 */
async function getTickerSentiment(ticker, hours = 24, dbPath = DB_PATH) {
  const signals = await getWeightedSignals(hours, dbPath);
  return signals.find(s => s.ticker === ticker) || null;
}

/**
 * Get top bullish and bearish signals
 * @param {number} limit - Number of signals per category
 * @param {number} hours - Lookback period in hours
 * @param {string} dbPath - Path to database
 * @returns {object} - { bullish: [], bearish: [] }
 */
async function getTopSignals(limit = 5, hours = 24, dbPath = DB_PATH) {
  const signals = await getWeightedSignals(hours, dbPath);
  
  const bullish = signals.filter(s => s.score > 0).slice(0, limit);
  const bearish = signals.filter(s => s.score < 0).slice(0, limit);
  
  return { bullish, bearish };
}

export { getWeightedSignals, getTickerSentiment, getTopSignals };
