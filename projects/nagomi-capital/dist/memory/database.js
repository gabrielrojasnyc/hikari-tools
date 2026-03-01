import Database from 'better-sqlite3';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import path from 'path';
import fs from 'fs';
/**
 * Database Manager
 * Handles SQLite connection and schema for signals and trades
 */
export class DatabaseManager {
    db;
    constructor() {
        // Ensure directory exists
        const dbDir = path.dirname(config.databasePath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
        this.db = new Database(config.databasePath);
        this.initializeSchema();
    }
    initializeSchema() {
        try {
            // Signals table
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS signals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tweet_id TEXT UNIQUE,
          timestamp TEXT NOT NULL,
          source_handle TEXT NOT NULL,
          asset TEXT NOT NULL,
          asset_class TEXT NOT NULL,
          direction TEXT NOT NULL,
          signal_type TEXT,
          confidence INTEGER,
          raw_text TEXT,
          processed INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_signals_asset ON signals(asset);
        CREATE INDEX IF NOT EXISTS idx_signals_processed ON signals(processed);
      `);
            // Debates table
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS debates (
          id TEXT PRIMARY KEY, -- UUID
          signal_id INTEGER,
          asset TEXT NOT NULL,
          start_time TEXT NOT NULL,
          end_time TEXT,
          bull_score INTEGER,
          bear_score INTEGER,
          flow_score INTEGER,
          decision TEXT, -- LONG, SHORT, NO_TRADE
          confidence_score REAL,
          conviction INTEGER,
          risk INTEGER,
          position_size REAL,
          thesis TEXT,
          bull_argument TEXT,
          bear_argument TEXT,
          flow_context TEXT,
          FOREIGN KEY(signal_id) REFERENCES signals(id)
        );
      `);
            // Trades table
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS trades (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          debate_id TEXT,
          alpaca_order_id TEXT,
          asset TEXT NOT NULL,
          direction TEXT NOT NULL,
          entry_price REAL,
          qty REAL,
          notional REAL,
          status TEXT, -- pending, filled, closed, rejected
          entry_time TEXT DEFAULT CURRENT_TIMESTAMP,
          exit_time TEXT,
          exit_price REAL,
          pnl REAL,
          pnl_percent REAL,
          FOREIGN KEY(debate_id) REFERENCES debates(id)
        );
      `);
            // Risk state table
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS risk_state (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          consecutive_losses INTEGER DEFAULT 0,
          last_trade_result TEXT,
          peak_portfolio_value REAL DEFAULT 0,
          current_drawdown_percent REAL DEFAULT 0,
          daily_pnl REAL DEFAULT 0,
          daily_trades INTEGER DEFAULT 0,
          last_trade_date TEXT,
          low_confidence_count INTEGER DEFAULT 0,
          last_debate_confidences TEXT, -- JSON array
          is_paused INTEGER DEFAULT 0,
          pause_reason TEXT,
          pause_until TEXT,
          trades_30d INTEGER DEFAULT 0,
          wins_30d INTEGER DEFAULT 0,
          win_rate_30d REAL DEFAULT 1.0,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);
            // Kill criteria log table
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS kill_criteria_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          trigger_type TEXT NOT NULL,
          action_taken TEXT NOT NULL,
          details TEXT,
          timestamp TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_kill_criteria_time ON kill_criteria_log(timestamp);
      `);
            // Performance Metrics table
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS performance_metrics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT UNIQUE NOT NULL,
          win_rate REAL,
          sharpe_ratio REAL,
          max_drawdown_percent REAL,
          total_pnl REAL,
          daily_pnl REAL,
          total_trades INTEGER,
          winning_trades INTEGER,
          losing_trades INTEGER,
          avg_win REAL,
          avg_loss REAL,
          profit_factor REAL,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);
            // Add indexes for trades table
            this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_trades_asset ON trades(asset);
        CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
        CREATE INDEX IF NOT EXISTS idx_trades_entry_time ON trades(entry_time);
      `);
            logger.info('Database schema initialized');
        }
        catch (error) {
            logger.error('Failed to initialize database schema', { error });
            throw error;
        }
    }
    // Signal Operations
    saveSignal(signal) {
        const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO signals (
        tweet_id, timestamp, source_handle, asset, asset_class, 
        direction, signal_type, confidence, raw_text
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        const info = stmt.run(signal.tweetId, signal.timestamp.toISOString(), signal.sourceHandle, signal.asset, signal.assetClass, signal.direction, signal.signalType, signal.confidence, signal.rawText);
        return info.lastInsertRowid;
    }
    getUnprocessedSignals(limit = 10) {
        const stmt = this.db.prepare(`
      SELECT * FROM signals WHERE processed = 0 ORDER BY timestamp DESC LIMIT ?
    `);
        return stmt.all(limit);
    }
    markSignalProcessed(id) {
        const stmt = this.db.prepare('UPDATE signals SET processed = 1 WHERE id = ?');
        stmt.run(id);
    }
    // Debate Operations
    saveDebate(debate) {
        const stmt = this.db.prepare(`
      INSERT INTO debates (
        id, signal_id, asset, start_time, end_time,
        bull_score, bear_score, flow_score, decision,
        confidence_score, conviction, risk, position_size,
        thesis, bull_argument, bear_argument, flow_context
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(debate.id, debate.signalId, debate.asset, debate.startTime.toISOString(), debate.endTime?.toISOString(), debate.bullScore, debate.bearScore, debate.flowScore, debate.decision, debate.confidenceScore, debate.conviction, debate.risk, debate.positionSize, debate.thesis, JSON.stringify(debate.bullArgument), JSON.stringify(debate.bearArgument), JSON.stringify(debate.flowContext));
    }
    // Trade Operations
    saveTrade(trade) {
        const stmt = this.db.prepare(`
      INSERT INTO trades (
        debate_id, alpaca_order_id, asset, direction, 
        entry_price, qty, notional, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
        const info = stmt.run(trade.debateId, trade.alpacaOrderId, trade.asset, trade.direction, trade.entryPrice, trade.qty, trade.notional, trade.status);
        return info.lastInsertRowid;
    }
    // Risk State Operations
    getRiskState() {
        try {
            const stmt = this.db.prepare('SELECT * FROM risk_state WHERE id = 1');
            const row = stmt.get();
            if (row && row.last_debate_confidences) {
                try {
                    row.lastDebateConfidences = JSON.parse(row.last_debate_confidences);
                }
                catch {
                    row.lastDebateConfidences = [];
                }
            }
            return row;
        }
        catch {
            return null;
        }
    }
    saveRiskState(state) {
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO risk_state (
        id, consecutive_losses, last_trade_result, peak_portfolio_value,
        current_drawdown_percent, daily_pnl, daily_trades, last_trade_date,
        low_confidence_count, last_debate_confidences, is_paused, pause_reason, pause_until,
        trades_30d, wins_30d, win_rate_30d, updated_at
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);
        stmt.run(state.consecutiveLosses, state.lastTradeResult, state.peakPortfolioValue, state.currentDrawdownPercent, state.dailyPnl, state.dailyTrades, state.lastTradeDate, state.lowConfidenceCount, JSON.stringify(state.lastDebateConfidences || []), state.isPaused ? 1 : 0, state.pauseReason || null, state.pauseUntil?.toISOString() || null, state.trades30d, state.wins30d, state.winRate30d);
    }
    logKillCriteriaEvent(event) {
        const stmt = this.db.prepare(`
      INSERT INTO kill_criteria_log (trigger_type, action_taken, details, timestamp)
      VALUES (?, ?, ?, ?)
    `);
        stmt.run(event.trigger, event.action, event.state, event.timestamp);
    }
    // Trade Management Operations
    getOpenTrades() {
        const stmt = this.db.prepare(`
      SELECT * FROM trades WHERE status = 'pending' OR status = 'filled'
    `);
        return stmt.all();
    }
    updateTradeExit(asset, exitData) {
        const stmt = this.db.prepare(`
      UPDATE trades 
      SET exit_price = ?, exit_time = ?, status = 'closed'
      WHERE asset = ? AND (status = 'pending' OR status = 'filled')
      ORDER BY entry_time DESC LIMIT 1
    `);
        stmt.run(exitData.exitPrice, exitData.exitTime, asset);
    }
    closeTrade(tradeId, exitData) {
        const stmt = this.db.prepare(`
      UPDATE trades 
      SET exit_price = ?, exit_time = ?, pnl = ?, status = 'closed'
      WHERE id = ?
    `);
        stmt.run(exitData.exitPrice, exitData.exitTime, exitData.pnl, tradeId);
    }
    getTradeByOrderId(alpacaOrderId) {
        const stmt = this.db.prepare('SELECT * FROM trades WHERE alpaca_order_id = ?');
        return stmt.get(alpacaOrderId);
    }
    // Performance Metrics Operations
    savePerformanceMetrics(metrics) {
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO performance_metrics (
        date, win_rate, sharpe_ratio, max_drawdown_percent,
        total_pnl, daily_pnl, total_trades, winning_trades, losing_trades,
        avg_win, avg_loss, profit_factor
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(metrics.date, metrics.winRate, metrics.sharpeRatio, metrics.maxDrawdownPercent, metrics.totalPnl, metrics.dailyPnl, metrics.totalTrades, metrics.winningTrades, metrics.losingTrades, metrics.avgWin, metrics.avgLoss, metrics.profitFactor);
    }
    getPerformanceMetrics(date) {
        const stmt = this.db.prepare('SELECT * FROM performance_metrics WHERE date = ?');
        return stmt.get(date);
    }
    getTradesForDate(date) {
        const stmt = this.db.prepare(`
      SELECT * FROM trades 
      WHERE date(entry_time) = date(?)
    `);
        return stmt.all(date);
    }
    getTradesForDateRange(startDate, endDate) {
        const stmt = this.db.prepare(`
      SELECT * FROM trades 
      WHERE date(entry_time) BETWEEN date(?) AND date(?)
    `);
        return stmt.all(startDate, endDate);
    }
}
// Singleton
let dbManager = null;
export function getDatabase() {
    if (!dbManager) {
        dbManager = new DatabaseManager();
    }
    return dbManager;
}
//# sourceMappingURL=database.js.map