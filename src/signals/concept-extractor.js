import fs from 'fs';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.DB_PATH || 'data/nagomi.db';
const CONCEPT_MAP_PATH = path.join(__dirname, 'concept-map.json');

// Load Concept Map
let conceptMap = {};
try {
  conceptMap = JSON.parse(fs.readFileSync(CONCEPT_MAP_PATH, 'utf8'));
} catch (e) {
  console.error('Error loading concept map:', e.message);
  conceptMap = {};
}

// Helper functions for database
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

/**
 * Calculate sentiment score based on keywords and context
 * @param {string} text - Tweet text
 * @param {string} conceptName - Name of concept
 * @param {object} conceptData - Concept data with sentiment
 * @returns {number} - Confidence score 0.0-1.0
 */
function calculateSentiment(text, conceptName, conceptData) {
  const lowerText = text.toLowerCase();
  let confidence = 0.7; // Base confidence
  
  // Check for bullish/bearish modifiers
  const bullishWords = ['surge', 'boom', 'rally', 'strong', 'growth', 'bullish', 'moon', 'rocket'];
  const bearishWords = ['crash', 'dump', 'weak', 'decline', 'bearish', 'short', 'sell'];
  
  const hasBullish = bullishWords.some(w => lowerText.includes(w));
  const hasBearish = bearishWords.some(w => lowerText.includes(w));
  
  if (conceptData.sentiment === 'bullish' && hasBullish) {
    confidence = 0.9;
  } else if (conceptData.sentiment === 'bearish' && hasBearish) {
    confidence = 0.9;
  } else if (conceptData.sentiment === 'bullish' && hasBearish) {
    confidence = 0.4;
  } else if (conceptData.sentiment === 'bearish' && hasBullish) {
    confidence = 0.4;
  }
  
  return confidence;
}

/**
 * Extract concepts from tweet text
 * @param {string} text - Raw tweet text
 * @returns {Array} - Array of extracted concepts
 */
async function extractConcepts(text) {
  const extracted = [];
  const lowerText = text.toLowerCase();

  for (const [conceptName, conceptData] of Object.entries(conceptMap)) {
    for (const keyword of conceptData.keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        const confidence = calculateSentiment(text, conceptName, conceptData);
        
        extracted.push({
          concept: conceptName,
          tickers: conceptData.tickers,
          confidence: confidence,
          sentiment: conceptData.sentiment,
          original_keyword: keyword
        });
        break; // Found match for this concept, move to next
      }
    }
  }
  return extracted;
}

/**
 * Process unprocessed tweets and extract concepts
 * @param {string} dbPath - Path to SQLite database
 */
async function processTweets(dbPath = DB_PATH) {
  const db = new sqlite3.Database(dbPath);
  console.log("Starting concept extraction...");
  
  let tweets = [];
  try {
    // Try to get unprocessed tweets from signals table
    tweets = await query(db, "SELECT * FROM signals WHERE processed = 0 AND raw_text IS NOT NULL LIMIT 100");
  } catch (e) {
    console.log("Note: signals table may not have processed column or raw_text column:", e.message);
    // Try alternative query
    try {
      tweets = await query(db, "SELECT * FROM signals WHERE raw_text IS NOT NULL ORDER BY created_at DESC LIMIT 100");
    } catch (e2) {
      console.log("Error reading signals table:", e2.message);
      db.close();
      return { processed: 0, extracted: 0 };
    }
  }

  console.log(`Found ${tweets.length} tweets to process.`);
  let totalExtracted = 0;

  for (const tweet of tweets) {
    const concepts = await extractConcepts(tweet.raw_text || tweet.text || '');
    
    if (concepts.length > 0) {
      console.log(`Extracted ${concepts.length} concepts from tweet ${tweet.id || tweet.tweet_id}`);
      
      const sql = `
        INSERT INTO twitter_concept_signals (date, concept, tickers, confidence, source_handle, source_tweet_id, extracted_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;

      for (const c of concepts) {
        try {
          await run(db, sql, [
            tweet.timestamp ? tweet.timestamp.split('T')[0] : new Date().toISOString().split('T')[0],
            c.concept,
            JSON.stringify(c.tickers),
            c.confidence,
            tweet.source_handle || tweet.handle || 'unknown',
            tweet.tweet_id || tweet.id
          ]);
          totalExtracted++;
        } catch (e) {
          console.error('Error inserting concept signal:', e.message);
        }
      }
    }

    // Mark as processed if column exists
    try {
      await run(db, "UPDATE signals SET processed = 1 WHERE id = ?", [tweet.id]);
    } catch (e) {
      // Column might not exist, ignore
    }
  }
  
  console.log(`Concept extraction complete. Extracted ${totalExtracted} concept signals.`);
  db.close();
  return { processed: tweets.length, extracted: totalExtracted };
}

/**
 * Insert a concept signal directly (for testing or manual entry)
 * @param {object} signal - Signal object
 * @param {string} dbPath - Path to database
 */
async function insertConceptSignal(signal, dbPath = DB_PATH) {
  const db = new sqlite3.Database(dbPath);
  const sql = `
    INSERT INTO twitter_concept_signals (date, concept, tickers, confidence, source_handle, source_tweet_id, extracted_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `;
  
  const result = await run(db, sql, [
    signal.date || new Date().toISOString().split('T')[0],
    signal.concept,
    JSON.stringify(signal.tickers),
    signal.confidence,
    signal.source_handle,
    signal.source_tweet_id
  ]);
  
  db.close();
  return result;
}

export { processTweets, extractConcepts, insertConceptSignal, conceptMap };
