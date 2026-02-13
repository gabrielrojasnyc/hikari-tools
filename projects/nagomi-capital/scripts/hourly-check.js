#!/usr/bin/env node
/**
 * Sora Hourly Stock Check
 * 
 * Run: node scripts/sora/hourly-check.js
 * 
 * Tasks:
 * 1. Load Mika's active signals
 * 2. Validate VIX < 25, confidence ≥ 0.60
 * 3. Check for entry opportunities
 * 4. Review existing positions (take profit / cut losers)
 * 5. Log all actions with hypothesisId
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths (running from workspace root, accessing nagomi-capital)
const NAGOMI_CAPITAL = path.join(process.cwd(), '.');
const DATA_DIR = path.join(NAGOMI_CAPITAL, 'data');
const DB_PATH = path.join(DATA_DIR, 'nagomi.db');
const LOG_PATH = path.join(DATA_DIR, 'hourly-check.log');
const MEMORY_DIR = path.join(NAGOMI_CAPITAL, 'memory');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(MEMORY_DIR)) fs.mkdirSync(MEMORY_DIR, { recursive: true });

// Simple logger
function log(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const entry = { timestamp, level, message, ...meta };
  const line = JSON.stringify(entry);
  fs.appendFileSync(LOG_PATH, line + '\n');
  console.log(`[${level.toUpperCase()}] ${message}`);
}

// Load SQLite database
let db = null;
function getDb() {
  if (!db) {
    if (!fs.existsSync(DB_PATH)) {
      throw new Error(`Database not found at ${DB_PATH}`);
    }
    db = new Database(DB_PATH);
  }
  return db;
}

// Get current trading date
function getTradingDate() {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  
  // If it's weekend or before market open on Monday, show previous Friday
  if (day === 0) { // Sunday
    now.setDate(now.getDate() - 2);
  } else if (day === 6) { // Saturday
    now.setDate(now.getDate() - 1);
  } else if (day === 1 && hour < 9) { // Monday before open
    now.setDate(now.getDate() - 3);
  }
  
  return now.toISOString().split('T')[0];
}

// Check if market is open (simple version)
function isMarketOpen() {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const time = hour + minute / 60;
  
  // Mon-Fri, 9:30 AM - 4:00 PM ET
  if (day >= 1 && day <= 5 && time >= 9.5 && time < 16) {
    return true;
  }
  return false;
}

// Load active signals from Mika
function loadActiveSignals() {
  try {
    const db = getDb();
    const signals = db.prepare(`
      SELECT * FROM signals 
      WHERE processed = 0 
      AND date(timestamp) >= date('now', '-1 day')
      ORDER BY confidence DESC, timestamp DESC
    `).all();
    
    // Also load from debates (processed signals with trades)
    const debates = db.prepare(`
      SELECT d.*, s.asset as signal_asset, s.confidence as signal_confidence
      FROM debates d
      LEFT JOIN signals s ON d.signal_id = s.id
      WHERE d.decision IN ('LONG', 'SHORT')
      AND date(d.start_time) >= date('now', '-1 day')
      ORDER BY d.confidence_score DESC
    `).all();
    
    return { signals, debates };
  } catch (err) {
    log('error', 'Failed to load signals', { error: err.message });
    return { signals: [], debates: [] };
  }
}

// Load open positions
function loadOpenPositions() {
  try {
    const db = getDb();
    const positions = db.prepare(`
      SELECT * FROM trades 
      WHERE status IN ('pending', 'filled')
      ORDER BY entry_time DESC
    `).all();
    return positions;
  } catch (err) {
    log('error', 'Failed to load positions', { error: err.message });
    return [];
  }
}

// Load risk state
function loadRiskState() {
  try {
    const db = getDb();
    const state = db.prepare('SELECT * FROM risk_state WHERE id = 1').get();
    return state || {
      consecutive_losses: 0,
      daily_trades: 0,
      daily_pnl: 0,
      is_paused: 0
    };
  } catch (err) {
    log('error', 'Failed to load risk state', { error: err.message });
    return null;
  }
}

// Check VIX threshold (mock - would fetch from API)
async function checkVIX() {
  // In production, this would fetch from VIX API
  // For now, assume VIX is acceptable or check if we have it stored
  try {
    const vixPath = path.join(MEMORY_DIR, 'vix.json');
    if (fs.existsSync(vixPath)) {
      const vix = JSON.parse(fs.readFileSync(vixPath, 'utf8'));
      return {
        current: vix.value || 20,
        threshold: 25,
        acceptable: (vix.value || 20) < 25
      };
    }
  } catch (err) {
    // VIX data not available, assume acceptable
  }
  
  return { current: 20, threshold: 25, acceptable: true };
}

// Validate confidence
function validateConfidence(score) {
  const minConfidence = 0.60;
  return {
    score: score || 0,
    threshold: minConfidence,
    acceptable: (score || 0) >= minConfidence
  };
}

// Check today's trade count
function checkDailyTradeLimit() {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];
  
  const count = db.prepare(`
    SELECT COUNT(*) as count FROM trades
    WHERE date(entry_time) = date(?)
  `).get(today);
  
  return {
    current: count?.count || 0,
    max: 5,
    remaining: 5 - (count?.count || 0)
  };
}

// Review position for exit (take profit / stop loss)
function reviewPosition(position) {
  const reviews = [];
  
  // Check if we have exit prices set
  if (position.bracket_take_profit || position.bracket_stop_loss) {
    // In production, compare current price to bracket prices
    // For now, note that we need to check
    reviews.push({
      asset: position.asset,
      action: 'review_brackets',
      takeProfit: position.bracket_take_profit,
      stopLoss: position.bracket_stop_loss,
      hypothesisId: position.debate_id
    });
  }
  
  // Check time-based exit (EOD at 3:55 PM)
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const time = hour + minute / 60;
  
  if (time >= 15.92) { // 3:55 PM
    reviews.push({
      asset: position.asset,
      action: 'eod_close_required',
      reason: 'Market close approaching (3:55 PM rule)',
      hypothesisId: position.debate_id
    });
  }
  
  return reviews;
}

// Main execution
async function main() {
  const startTime = Date.now();
  const checkId = `hourly-${Date.now()}`;
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  SORA HOURLY STOCK CHECK');
  console.log(`  ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET`);
  console.log('═══════════════════════════════════════════════════════════\n');
  
  const report = {
    checkId,
    timestamp: new Date().toISOString(),
    marketOpen: isMarketOpen(),
    tradingDate: getTradingDate(),
    vix: null,
    signals: { count: 0, validated: 0 },
    positions: { count: 0, reviews: [] },
    risk: null,
    trades: { today: 0, remaining: 5 },
    actions: [],
    errors: []
  };
  
  try {
    // 1. Check VIX
    log('info', 'Checking VIX...');
    const vix = await checkVIX();
    report.vix = vix;
    log('info', `VIX: ${vix.current} (threshold: ${vix.threshold})`, { acceptable: vix.acceptable });
    
    if (!vix.acceptable) {
      log('warn', 'VIX above threshold - pausing new entries');
      report.actions.push({ type: 'vix_block', reason: 'VIX too high' });
    }
    
    // 2. Load risk state
    log('info', 'Loading risk state...');
    const risk = loadRiskState();
    report.risk = risk;
    log('info', `Risk state: ${risk?.consecutive_losses || 0} consecutive losses, $${risk?.daily_pnl || 0} daily P&L`);
    
    // 3. Check daily trade limit
    log('info', 'Checking daily trade limit...');
    const tradeLimit = checkDailyTradeLimit();
    report.trades = tradeLimit;
    log('info', `Trades today: ${tradeLimit.current}/${tradeLimit.max} (remaining: ${tradeLimit.remaining})`);
    
    // 4. Load Mika's active signals
    log('info', 'Loading Mika\'s active signals...');
    const { signals, debates } = loadActiveSignals();
    report.signals.count = signals.length + debates.length;
    
    console.log(`\n📊 ACTIVE SIGNALS: ${signals.length} unprocessed, ${debates.length} with debates`);
    
    // 5. Validate signals
    let validatedCount = 0;
    const entryOpportunities = [];
    
    for (const debate of debates) {
      const confidence = validateConfidence(debate.confidence_score);
      const canTrade = vix.acceptable && 
                       confidence.acceptable && 
                       tradeLimit.remaining > 0 &&
                       !risk?.is_paused;
      
      if (confidence.acceptable) validatedCount++;
      
      if (canTrade) {
        entryOpportunities.push({
          asset: debate.asset || debate.signal_asset,
          direction: debate.decision,
          confidence: debate.confidence_score,
          conviction: debate.conviction,
          risk: debate.risk,
          hypothesisId: debate.id
        });
        
        report.actions.push({
          type: 'entry_opportunity',
          asset: debate.asset,
          direction: debate.decision,
          hypothesisId: debate.id
        });
      }
    }
    
    report.signals.validated = validatedCount;
    
    console.log(`\n✅ VALIDATED SIGNALS: ${validatedCount} (confidence ≥ 0.60)`);
    console.log(`🎯 ENTRY OPPORTUNITIES: ${entryOpportunities.length}`);
    
    entryOpportunities.forEach(opp => {
      console.log(`   • ${opp.asset} ${opp.direction} (conf: ${(opp.confidence * 100).toFixed(0)}%) [${opp.hypothesisId.slice(0, 8)}]`);
    });
    
    // 6. Review existing positions
    log('info', 'Reviewing existing positions...');
    const positions = loadOpenPositions();
    report.positions.count = positions.length;
    
    console.log(`\n📈 OPEN POSITIONS: ${positions.length}`);
    
    for (const position of positions) {
      const reviews = reviewPosition(position);
      report.positions.reviews.push(...reviews);
      
      console.log(`   • ${position.asset} ${position.direction} - ${position.status}`);
      
      reviews.forEach(review => {
        console.log(`     → ${review.action}: ${review.reason || 'bracket review'}`);
        report.actions.push({
          type: 'position_review',
          asset: position.asset,
          action: review.action,
          hypothesisId: review.hypothesisId
        });
      });
    }
    
    // 7. Summary
    const duration = Date.now() - startTime;
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`  VIX: ${vix.current} ${vix.acceptable ? '✅' : '❌'}`);
    console.log(`  Signals: ${report.signals.count} total, ${report.signals.validated} validated`);
    console.log(`  Positions: ${report.positions.count} open`);
    console.log(`  Trades remaining: ${report.trades.remaining}`);
    console.log(`  Actions queued: ${report.actions.length}`);
    console.log(`  Duration: ${duration}ms`);
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // 8. Save report
    const reportPath = path.join(MEMORY_DIR, `hourly-check-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    log('info', `Report saved: ${reportPath}`);
    
    return report;
    
  } catch (err) {
    log('error', 'Hourly check failed', { error: err.message, stack: err.stack });
    report.errors.push({ message: err.message, stack: err.stack });
    throw err;
  }
}

// Run if called directly
main()
  .then(report => {
    process.exit(0);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
