import { getWeightedSignals, getTopSignals, getTickerSentiment } from '../src/signals/weighted-signals.js';
import sqlite3 from 'sqlite3';

const DB_PATH = process.env.DB_PATH || 'data/nagomi.db';

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
 * Fetch top accounts by accuracy
 * @param {number} limit - Number of accounts to fetch
 * @returns {Array} - Top accounts
 */
async function getTopAccounts(limit = 10) {
  const db = new sqlite3.Database(DB_PATH);
  const accounts = await query(db, `
    SELECT 
      handle,
      accuracy_1d,
      accuracy_4h,
      weight_multiplier,
      last_updated
    FROM twitter_account_weights
    WHERE accuracy_1d IS NOT NULL OR accuracy_4h IS NOT NULL
    ORDER BY weight_multiplier DESC, accuracy_1d DESC
    LIMIT ?
  `, [limit]);
  return accounts;
}

/**
 * Get top mentioned tickers from concept signals
 * @param {number} hours - Lookback period
 * @param {number} limit - Number of tickers
 * @returns {Array} - Top tickers with mention counts
 */
async function getTopMentions(hours = 24, limit = 10) {
  const db = new sqlite3.Database(DB_PATH);
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  
  const rows = await query(db, `
    SELECT tickers, concept, COUNT(*) as mentions
    FROM twitter_concept_signals
    WHERE extracted_at > ?
    GROUP BY tickers, concept
    ORDER BY mentions DESC
    LIMIT ?
  `, [since, limit]);
  
  const tickerCounts = {};
  for (const row of rows) {
    try {
      const tickers = JSON.parse(row.tickers);
      for (const ticker of tickers) {
        if (!tickerCounts[ticker]) {
          tickerCounts[ticker] = { ticker, mentions: 0, concepts: [] };
        }
        tickerCounts[ticker].mentions += row.mentions;
        if (!tickerCounts[ticker].concepts.includes(row.concept)) {
          tickerCounts[ticker].concepts.push(row.concept);
        }
      }
    } catch (e) {
      // Skip invalid rows
    }
  }
  
  return Object.values(tickerCounts).sort((a, b) => b.mentions - a.mentions).slice(0, limit);
}

/**
 * Generate Mika's Enhanced Morning Brief
 * @returns {string} - Formatted brief text
 */
async function generateBrief() {
  console.log("=== ☀️ MIKA'S ENHANCED MORNING BRIEF ===\n");
  console.log(`Generated: ${new Date().toLocaleString()}`);
  console.log("=" .repeat(50) + "\n");

  // 1. TWITTER INTELLIGENCE
  console.log("🐦 TWITTER INTELLIGENCE\n");
  
  const twitterSignals = await getWeightedSignals(24);
  const topMentions = await getTopMentions(24, 10);
  const topAccounts = await getTopAccounts(5);
  const { bullish, bearish } = await getTopSignals(5, 24);
  
  if (twitterSignals.length === 0) {
    console.log("No significant Twitter signals found in last 24h.\n");
  } else {
    console.log("📊 Weighted Sentiment by Ticker:");
    console.log("-".repeat(40));
    
    for (const s of twitterSignals.slice(0, 10)) {
      const direction = s.score > 0 ? "🟢 BULLISH" : "🔴 BEARISH";
      const bar = "█".repeat(Math.min(Math.abs(s.score) * 5, 20));
      console.log(`${direction} $${s.ticker.padEnd(6)} Score: ${s.score.toFixed(2).padStart(6)} ${bar}`);
      console.log(`           Concepts: ${s.concepts.slice(0, 3).join(', ')}`);
      console.log(`           Sources: ${s.sources.length} accounts | Avg Conf: ${(s.avgConfidence * 100).toFixed(0)}%`);
      console.log();
    }
    
    console.log("\n🚀 TOP BULLISH SIGNALS:");
    bullish.forEach((s, i) => {
      console.log(`  ${i + 1}. $${s.ticker} (Score: ${s.score.toFixed(2)}, Mentions: ${s.mentions})`);
    });
    
    console.log("\n🔻 TOP BEARISH SIGNALS:");
    bearish.forEach((s, i) => {
      console.log(`  ${i + 1}. $${s.ticker} (Score: ${s.score.toFixed(2)}, Mentions: ${s.mentions})`);
    });
    
    console.log("\n📈 MOST MENTIONED TICKERS:");
    topMentions.forEach((t, i) => {
      console.log(`  ${i + 1}. $${t.ticker} - ${t.mentions} mentions (${t.concepts.join(', ')})`);
    });
  }

  // 2. TOP ACCURACY SCORES
  console.log("\n\n🏆 TOP PERFORMING ACCOUNTS");
  console.log("-".repeat(40));
  if (topAccounts.length === 0) {
    console.log("No accuracy data available yet.");
  } else {
    for (const acc of topAccounts) {
      const acc1d = acc.accuracy_1d ? (acc.accuracy_1d * 100).toFixed(1) : 'N/A';
      const acc4h = acc.accuracy_4h ? (acc.accuracy_4h * 100).toFixed(1) : 'N/A';
      const weight = acc.weight_multiplier ? acc.weight_multiplier.toFixed(2) : '1.00';
      console.log(`  @${acc.handle}`);
      console.log(`    1D Accuracy: ${acc1d}% | 4H Accuracy: ${acc4h}% | Weight: ${weight}x`);
    }
  }

  // 3. TECHNICAL CONTEXT (Mock data - would come from actual signals)
  console.log("\n\n📊 TECHNICAL CONTEXT");
  console.log("-".repeat(40));
  const technicals = [
    { ticker: 'NVDA', signal: 'Buy', confidence: 0.85, rsi: 62 },
    { ticker: 'MSFT', signal: 'Hold', confidence: 0.65, rsi: 55 },
    { ticker: 'GOOGL', signal: 'Buy', confidence: 0.72, rsi: 48 },
    { ticker: 'AMD', signal: 'Sell', confidence: 0.58, rsi: 71 },
    { ticker: 'META', signal: 'Buy', confidence: 0.78, rsi: 52 }
  ];
  
  for (const t of technicals) {
    const emoji = t.signal === 'Buy' ? '🟢' : t.signal === 'Sell' ? '🔴' : '🟡';
    console.log(`  ${emoji} $${t.ticker}: ${t.signal} (${(t.confidence * 100).toFixed(0)}%) RSI: ${t.rsi}`);
  }

  // 4. TRADE IDEAS
  console.log("\n\n💡 TRADE IDEAS");
  console.log("-".repeat(40));
  
  const tradeIdeas = [];
  
  // Combine Twitter signals with technicals
  for (const tech of technicals) {
    const twitterSignal = twitterSignals.find(s => s.ticker === tech.ticker);
    if (twitterSignal) {
      const combinedScore = (tech.confidence * 0.4) + (Math.abs(twitterSignal.score) * 0.1);
      if (combinedScore > 0.5) {
        const direction = twitterSignal.score > 0 ? 'LONG' : 'SHORT';
        tradeIdeas.push({
          ticker: tech.ticker,
          direction,
          score: combinedScore,
          reasons: [`Technical: ${tech.signal}`, `Twitter: ${twitterSignal.concepts[0]}`]
        });
      }
    }
  }
  
  if (tradeIdeas.length === 0) {
    console.log("No high-confidence trade ideas at this time.");
  } else {
    tradeIdeas.slice(0, 3).forEach((idea, i) => {
      console.log(`  ${i + 1}. $${idea.ticker} ${idea.direction} (Score: ${idea.score.toFixed(2)})`);
      console.log(`     Rationale: ${idea.reasons.join(', ')}`);
    });
  }

  console.log("\n" + "=".repeat(50));
  console.log("End of Brief | Data: Twitter + Technicals | Horizon: 24H");
  console.log("=".repeat(50));
}

// Run if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  generateBrief().catch(e => {
    console.error("Error generating brief:", e);
    process.exit(1);
  });
}

export { generateBrief, getTopAccounts, getTopMentions };
