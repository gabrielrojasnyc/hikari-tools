/**
 * Nagomi Capital - Main Application Entry Point
 * Wires together all components: X ingestion → Mika debate → Sora execution
 */

import { getStreamClient } from './ingestion/x/stream.js';
import { getDatabase } from './memory/database.js';
import { getAlpacaClient } from './ingestion/market/alpaca.js';
import { DebateManager } from './agents/mika/debate.js';
import { TradeDecision } from './agents/mika/judge.js';
import { executeTrade, syncTradePnl, getPositionsSummary } from './agents/sora/execute.js';
import { initializeRiskState, checkKillCriteria, resetDailyStats } from './agents/sora/risk.js';
import { logger } from './utils/logger.js';
import { config } from './config/index.js';
import { credentials } from './utils/credentials.js';
import { initializeTelegram, alertSystemStatus, alertDailyPnl } from './utils/telegram.js';
import cron from 'node-cron';
import http from 'http';

// Global state
let isShuttingDown = false;

/**
 * Main application entry
 */
async function main() {
  logger.info('========================================');
  logger.info('Starting Nagomi Capital Trading System...');
  logger.info('Environment:', { nodeEnv: config.nodeEnv, logLevel: config.logLevel });
  logger.info('========================================');

  // Initialize credentials from Vault FIRST
  try {
    logger.info('Loading credentials from Vault...');
    await credentials.initialize();
    logger.info('Credentials loaded successfully');
  } catch (error) {
    logger.error('CRITICAL: Failed to load credentials from Vault', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    logger.error('Please ensure all required credentials exist in ~/.openclaw/credentials/');
    process.exit(1);
  }

  // Initialize Telegram (depends on credentials)
  initializeTelegram();
  await alertSystemStatus('started', { 
    environment: config.nodeEnv,
    paperTrading: config.paperTrading 
  });

  // Initialize database
  const db = getDatabase();
  logger.info('Database initialized');

  // Initialize Alpaca client
  const alpaca = getAlpacaClient();
  try {
    await alpaca.connect();
    logger.info('Connected to Alpaca paper trading');
  } catch (error) {
    logger.error('Failed to connect to Alpaca', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    await alertError('Alpaca Connection', error instanceof Error ? error.message : 'Unknown error');
    if (config.nodeEnv === 'production') process.exit(1);
  }

  // Initialize risk management
  try {
    await initializeRiskState();
    logger.info('Risk management initialized');
  } catch (error) {
    logger.error('Failed to initialize risk state', { error });
    await alertError('Risk Initialization', error instanceof Error ? error.message : 'Unknown error');
  }

  // Initialize debate manager
  const debateManager = new DebateManager();
  logger.info('Debate manager initialized');

  // Setup X stream handler
  const stream = getStreamClient();
  stream.onSignal(async (signal) => {
    if (isShuttingDown) {
      logger.warn('Signal received during shutdown, ignoring');
      return;
    }

    logger.info(`Received signal: ${signal.asset} (${signal.direction})`);
    
    // Save raw signal
    const signalId = db.saveSignal(signal);
    
    // Fetch market data
    let marketData;
    if (signal.asset) {
      try {
        marketData = await alpaca.getMarketData(signal.asset);
      } catch (e) {
        logger.warn('Market data unavailable for asset', { asset: signal.asset });
      }
    }

    // Check kill criteria before starting debate
    const killCheck = await checkKillCriteria();
    if (!killCheck.allowed) {
      logger.warn('Trading paused, skipping debate', { reason: killCheck.reason });
      db.markSignalProcessed(signalId);
      return;
    }

    // Trigger debate - execution happens via callback
    debateManager.startDebate(signal, marketData, handleDebateDecision).catch(err => {
      logger.error('Debate error', { 
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    });
    
    // Mark signal as processed
    db.markSignalProcessed(signalId);
  });

  // Start X stream
  try {
    await stream.start();
    logger.info('X Stream started and listening for signals...');
  } catch (error) {
    logger.error('Failed to start X stream', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    await alertError('X Stream', error instanceof Error ? error.message : 'Unknown error');
    // Don't exit - we can still run scheduled debates
  }

  // Schedule daily debate at 6:00 AM
  cron.schedule('0 6 * * *', async () => {
    logger.info('Running scheduled daily debate...');
    await runDailyDebate();
  }, {
    timezone: 'America/New_York'
  });
  logger.info('Scheduled daily debate for 6:00 AM ET');

  // Schedule daily P&L report at 4:30 PM (market close)
  cron.schedule('30 16 * * 1-5', async () => {
    logger.info('Generating daily P&L report...');
    await generateDailyReport();
  }, {
    timezone: 'America/New_York'
  });
  logger.info('Scheduled daily P&L report for 4:30 PM ET');

  // Schedule P&L sync every 5 minutes during market hours
  cron.schedule('*/5 * * * 1-5', async () => {
    try {
      await syncTradePnl();
    } catch (error) {
      logger.error('P&L sync failed', { error });
    }
  }, {
    timezone: 'America/New_York'
  });

  // Reset daily stats at market open
  cron.schedule('0 9 * * 1-5', async () => {
    logger.info('Resetting daily stats for new trading day...');
    await resetDailyStats();
  }, {
    timezone: 'America/New_York'
  });

  // Start health check server
  startHealthServer();
  logger.info('Health check server started on port 3000');

  // Alert that system is ready
  await alertSystemStatus('healthy', { 
    mode: 'live',
    xStream: 'active',
    alpaca: 'connected'
  });

  logger.info('========================================');
  logger.info('Nagomi Capital is ready for trading!');
  logger.info('========================================');
}

/**
 * Handle trade decision from Mika debate
 */
async function handleDebateDecision(decision: TradeDecision): Promise<void> {
  logger.info('Received decision from debate', {
    asset: decision.asset,
    direction: decision.direction,
    confidence: decision.confidence_score
  });

  // Skip NO_TRADE decisions
  if (decision.direction === 'NO_TRADE') {
    logger.info('Decision is NO_TRADE, skipping execution');
    return;
  }

  // Execute the trade
  const result = await executeTrade(decision);
  
  if (result.success) {
    logger.info('Trade executed successfully', {
      orderId: result.orderId,
      tradeId: result.tradeId
    });
  } else {
    logger.warn('Trade execution failed', {
      status: result.status,
      message: result.message
    });
  }
}

/**
 * Run daily debate for general market analysis
 */
async function runDailyDebate(): Promise<void> {
  logger.info('Starting daily market analysis debate...');
  
  try {
    const alpaca = getAlpacaClient();
    
    // Check if market is open
    const isOpen = await alpaca.isMarketOpen();
    if (!isOpen) {
      logger.info('Market closed, skipping daily debate');
      return;
    }

    // Get watchlist or top movers
    // This would be expanded to trigger debates on specific setups
    logger.info('Daily debate completed');
    
  } catch (error) {
    logger.error('Daily debate failed', { error });
    await alertError('Daily Debate', error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Generate daily P&L report
 */
async function generateDailyReport(): Promise<void> {
  try {
    const alpaca = getAlpacaClient();
    const db = getDatabase();
    
    // Get account info
    const account = await alpaca.getAccount();
    
    // Get today's trades
    const today = new Date().toISOString().split('T')[0];
    const trades = db.getTradesForDate(today);
    
    // Calculate metrics
    const winningTrades = trades.filter((t: any) => (t.pnl || 0) > 0).length;
    const losingTrades = trades.filter((t: any) => (t.pnl || 0) < 0).length;
    const totalPnl = trades.reduce((sum: number, t: any) => sum + (t.pnl || 0), 0);
    const winRate = trades.length > 0 ? winningTrades / trades.length : 0;
    
    // Get positions
    const positions = await getPositionsSummary();
    
    // Calculate drawdown
    const portfolioValue = account.portfolioValue;
    // Would need historical peak for accurate drawdown calculation
    
    await alertDailyPnl({
      date: today,
      totalPnl,
      realizedPnl: totalPnl, // Simplified - would separate realized/unrealized
      unrealizedPnl: positions.totalUnrealizedPnl,
      totalTrades: trades.length,
      winningTrades,
      losingTrades,
      winRate,
      portfolioValue,
      drawdownPercent: 0 // Would calculate from peak
    });
    
    logger.info('Daily P&L report generated', { 
      date: today, 
      totalPnl: totalPnl.toFixed(2),
      trades: trades.length 
    });
    
  } catch (error) {
    logger.error('Failed to generate daily report', { error });
    await alertError('Daily Report', error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Start health check HTTP server
 */
function startHealthServer(): void {
  const server = http.createServer(async (req, res) => {
    if (req.url === '/health') {
      try {
        // Check Alpaca connectivity
        const alpaca = getAlpacaClient();
        const alpacaHealthy = await alpaca.isHealthy();
        
        // Check risk state
        const { issues } = await import('./agents/sora/risk.js').then(m => m.riskHealthCheck());
        
        const healthy = alpacaHealthy && issues.length === 0;
        
        res.writeHead(healthy ? 200 : 503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: healthy ? 'healthy' : 'unhealthy',
          timestamp: new Date().toISOString(),
          alpaca: alpacaHealthy ? 'connected' : 'disconnected',
          issues: issues.length > 0 ? issues : undefined
        }, null, 2));
      } catch (error) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        }));
      }
    } else if (req.url === '/status') {
      // Detailed status endpoint
      try {
        const alpaca = getAlpacaClient();
        const account = await alpaca.getAccount();
        const positions = await getPositionsSummary();
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'running',
          timestamp: new Date().toISOString(),
          paperTrading: config.paperTrading,
          account: {
            portfolioValue: account.portfolioValue,
            buyingPower: account.buyingPower,
            cash: account.cash
          },
          positions: positions.positions.length,
          totalMarketValue: positions.totalMarketValue,
          totalUnrealizedPnl: positions.totalUnrealizedPnl
        }, null, 2));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        }));
      }
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  server.listen(3000, () => {
    logger.info('Health server listening on port 3000');
  });
}

/**
 * Graceful shutdown handler
 */
async function shutdown(signal: string) {
  if (isShuttingDown) {
    logger.info('Shutdown already in progress...');
    return;
  }
  
  isShuttingDown = true;
  logger.info(`Received ${signal}, starting graceful shutdown...`);
  
  try {
    // Alert shutdown
    await alertSystemStatus('stopped', { reason: signal });
    
    // Stop X stream
    const stream = getStreamClient();
    await stream.stop();
    logger.info('X stream stopped');
    
    // Sync any pending P&L
    try {
      await syncTradePnl();
      logger.info('Final P&L sync completed');
    } catch (error) {
      logger.error('Final P&L sync failed', { error });
    }
    
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error });
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  logger.error('Uncaught exception', { error });
  await alertError('Uncaught Exception', error.message);
  shutdown('uncaughtException');
});

process.on('unhandledRejection', async (reason) => {
  logger.error('Unhandled rejection', { reason });
  await alertError('Unhandled Rejection', String(reason));
});

// Import alertError for error handling
import { alertError } from './utils/telegram.js';

// Run main
main().catch(async (error) => {
  logger.error('Fatal error', { 
    error: error instanceof Error ? error.message : 'Unknown error'
  });
  await alertError('Fatal Error', error instanceof Error ? error.message : 'Unknown error');
  process.exit(1);
});
