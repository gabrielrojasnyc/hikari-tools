import sqlite3 from 'sqlite3';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const DB_PATH = process.env.DB_PATH || 'data/nagomi.db';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// High-priority trigger keywords
const TRIGGERS = [
  { 
    keywords: ["announcing", "product"], 
    message: "🚨 PRODUCT ANNOUNCEMENT",
    priority: "high"
  },
  { 
    keywords: ["earnings", "beat"], 
    message: "💰 EARNINGS BEAT",
    priority: "high"
  },
  { 
    keywords: ["earnings", "miss"], 
    message: "⚠️ EARNINGS MISS",
    priority: "critical"
  },
  { 
    keywords: ["guidance", "cut"], 
    message: "⚠️ GUIDANCE CUT",
    priority: "critical"
  },
  { 
    keywords: ["guidance", "raise"], 
    message: "📈 GUIDANCE RAISE",
    priority: "high"
  },
  { 
    keywords: ["launched", "ai"], 
    message: "🚀 AI LAUNCH",
    priority: "high"
  },
  { 
    keywords: ["acquisition", "buyout"], 
    message: "🏢 ACQUISITION NEWS",
    priority: "critical"
  },
  { 
    keywords: ["sec", "investigation"], 
    message: "⚠️ SEC INVESTIGATION",
    priority: "critical"
  }
];

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
 * Send Telegram alert
 * @param {string} text - Alert message
 * @returns {Promise<boolean>} - Success status
 */
async function sendTelegram(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log("[TELEGRAM MOCK] Alert:", text);
    return true;
  }
  
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        chat_id: TELEGRAM_CHAT_ID, 
        text: text,
        parse_mode: 'HTML'
      })
    });
    
    const data = await response.json();
    if (!data.ok) {
      console.error("Telegram API error:", data.description);
      return false;
    }
    return true;
  } catch (e) {
    console.error("Telegram network error:", e.message);
    return false;
  }
}

/**
 * Check for alert triggers in recent tweets
 * @param {number} minutes - Lookback period in minutes (default: 15)
 * @param {string} dbPath - Path to database
 * @returns {Array} - Array of triggered alerts
 */
async function checkAlerts(minutes = 15, dbPath = DB_PATH) {
  const db = new sqlite3.Database(dbPath);
  console.log(`Checking for alerts (last ${minutes} minutes)...`);
  
  const alerts = [];
  const since = new Date(Date.now() - minutes * 60 * 1000).toISOString();
  
  try {
    const tweets = await query(db, 
      "SELECT * FROM signals WHERE created_at > ? OR timestamp > ? ORDER BY created_at DESC LIMIT 100",
      [since, since]
    );

    for (const tweet of tweets) {
      const text = (tweet.raw_text || tweet.text || '').toLowerCase();
      const handle = tweet.source_handle || tweet.handle || 'unknown';
      
      for (const trigger of TRIGGERS) {
        if (trigger.keywords.every(k => text.includes(k.toLowerCase()))) {
          const alertMsg = `<b>${trigger.message}</b>\n@${handle}: ${tweet.raw_text?.substring(0, 150) || 'No text'}...`;
          
          await sendTelegram(alertMsg);
          
          alerts.push({
            trigger: trigger.message,
            priority: trigger.priority,
            handle: handle,
            text: tweet.raw_text?.substring(0, 100),
            timestamp: new Date().toISOString()
          });
          
          console.log(`[${trigger.priority.toUpperCase()}] Alert sent: ${trigger.message}`);
          break; // Only trigger once per tweet
        }
      }
    }
  } catch (e) {
    console.error("Error checking alerts:", e.message);
  }
  
  db.close();
  return alerts;
}

/**
 * Send immediate high-priority alert
 * @param {object} alertData - Alert data
 * @returns {Promise<boolean>} - Success status
 */
async function sendImmediateAlert(alertData) {
  const { type, ticker, message, source, priority = 'high' } = alertData;
  
  const emoji = priority === 'critical' ? '🚨' : priority === 'high' ? '⚡' : '📢';
  const alertText = `${emoji} <b>${type}</b> | $${ticker}\nSource: @${source}\n\n${message}`;
  
  return await sendTelegram(alertText);
}

/**
 * Test the Telegram connection
 * @returns {Promise<boolean>} - Success status
 */
async function testTelegramConnection() {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log("Telegram not configured - alerts will be logged to console only");
    return false;
  }
  
  const testMsg = "🧪 <b>Twitter Alert System Test</b>\nAlert system is online and ready.";
  return await sendTelegram(testMsg);
}

export { checkAlerts, sendImmediateAlert, sendTelegram, testTelegramConnection, TRIGGERS };
