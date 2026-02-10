/**
 * Risk Management & Kill Criteria Module
 * Tracks performance metrics and enforces trading limits
 */

import { getDatabase } from '../../memory/database.js';
import { getAlpacaClient } from '../../ingestion/market/alpaca.js';
import { logger } from '../../utils/logger.js';
import { alertKillCriteria, alertError } from '../../utils/telegram.js';
import { config } from '../../config/index.js';

export interface KillCriteriaState {
  // Loss tracking
  consecutiveLosses: number;
  lastTradeResult: 'win' | 'loss' | null;
  
  // Drawdown tracking
  peakPortfolioValue: number;
  currentDrawdownPercent: number;
  
  // Daily tracking
  dailyPnl: number;
  dailyTrades: number;
  lastTradeDate: string;
  
  // Confidence tracking
  lowConfidenceCount: number;
  lastDebateConfidences: number[];
  
  // Pause state
  isPaused: boolean;
  pauseReason?: string;
  pauseUntil?: Date;
  
  // Win rate tracking
  trades30d: number;
  wins30d: number;
  winRate30d: number;
}

export interface RiskCheckResult {
  allowed: boolean;
  reason?: string;
  action: 'ALLOW' | 'REDUCE_SIZE' | 'PAUSE' | 'EMERGENCY_STOP';
  sizeMultiplier: number;
}

// In-memory state (persisted to DB)
let riskState: KillCriteriaState = {
  consecutiveLosses: 0,
  lastTradeResult: null,
  peakPortfolioValue: 0,
  currentDrawdownPercent: 0,
  dailyPnl: 0,
  dailyTrades: 0,
  lastTradeDate: new Date().toISOString().split('T')[0],
  lowConfidenceCount: 0,
  lastDebateConfidences: [],
  isPaused: false,
  trades30d: 0,
  wins30d: 0,
  winRate30d: 1.0,
};

/**
 * Initialize risk state from database and Alpaca account
 */
export async function initializeRiskState(): Promise<void> {
  const alpaca = getAlpacaClient();
  
  try {
    // Load from database
    const db = getDatabase();
    const dbState = db.getRiskState();
    if (dbState) {
      riskState = { ...riskState, ...dbState };
    }
    
    // Get current account value for drawdown calculation
    const account = await alpaca.getAccount();
    const currentValue = account.portfolioValue;
    
    // Initialize peak if not set or update if higher
    if (riskState.peakPortfolioValue === 0 || currentValue > riskState.peakPortfolioValue) {
      riskState.peakPortfolioValue = currentValue;
    }
    
    // Calculate current drawdown
    riskState.currentDrawdownPercent = ((riskState.peakPortfolioValue - currentValue) / riskState.peakPortfolioValue) * 100;
    
    // Reset daily stats if it's a new day
    const today = new Date().toISOString().split('T')[0];
    if (riskState.lastTradeDate !== today) {
      await resetDailyStats();
    }
    
    logger.info('Risk state initialized', {
      peakValue: riskState.peakPortfolioValue,
      currentDrawdown: riskState.currentDrawdownPercent.toFixed(2) + '%',
      consecutiveLosses: riskState.consecutiveLosses,
      isPaused: riskState.isPaused
    });
    
  } catch (error) {
    logger.error('Failed to initialize risk state', { error });
    throw error;
  }
}

/**
 * Check all kill criteria before allowing a trade
 */
export async function checkKillCriteria(
  debateConfidence?: number
): Promise<RiskCheckResult> {
  // Check if already paused
  if (riskState.isPaused) {
    if (riskState.pauseUntil && new Date() < riskState.pauseUntil) {
      return {
        allowed: false,
        reason: `Trading paused: ${riskState.pauseReason} until ${riskState.pauseUntil.toISOString()}`,
        action: 'PAUSE',
        sizeMultiplier: 0
      };
    } else {
      // Pause expired
      logger.info('Trading pause expired, resuming');
      riskState.isPaused = false;
      riskState.pauseReason = undefined;
      riskState.pauseUntil = undefined;
    }
  }
  
  // Check 1: Daily loss limit
  if (riskState.dailyPnl <= -config.maxDailyLossUsd) {
    const trigger = `Daily loss limit reached: $${riskState.dailyPnl.toFixed(2)} <= -$${config.maxDailyLossUsd}`;
    const action = 'Stop trading for the day';
    
    await alertKillCriteria(trigger, action, { dailyPnl: riskState.dailyPnl });
    await logKillCriteriaEvent(trigger, action);
    
    // Pause until tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    riskState.isPaused = true;
    riskState.pauseReason = 'Daily loss limit reached';
    riskState.pauseUntil = tomorrow;
    
    return {
      allowed: false,
      reason: trigger,
      action: 'PAUSE',
      sizeMultiplier: 0
    };
  }
  
  // Check 2: Confidence < 5 for 5 debates → go to cash
  if (debateConfidence !== undefined) {
    riskState.lastDebateConfidences.push(debateConfidence);
    if (riskState.lastDebateConfidences.length > 5) {
      riskState.lastDebateConfidences.shift();
    }
    
    const lowConfidenceCount = riskState.lastDebateConfidences.filter(c => c < 5).length;
    if (lowConfidenceCount >= 5 && riskState.lastDebateConfidences.length === 5) {
      const trigger = 'Confidence < 5 for 5 consecutive debates';
      const action = 'Going to cash - closing all positions';
      
      await alertKillCriteria(trigger, action);
      await logKillCriteriaEvent(trigger, action);
      await emergencyStop('Low confidence threshold breached');
      
      return {
        allowed: false,
        reason: trigger,
        action: 'EMERGENCY_STOP',
        sizeMultiplier: 0
      };
    }
  }
  
  // Check 3: 3 consecutive losses → pause 7 days
  if (riskState.consecutiveLosses >= 3) {
    const trigger = `3 consecutive losses`;
    const action = 'Pause trading for 7 days';
    
    await alertKillCriteria(trigger, action, { consecutiveLosses: riskState.consecutiveLosses });
    await logKillCriteriaEvent(trigger, action);
    
    const resumeDate = new Date();
    resumeDate.setDate(resumeDate.getDate() + 7);
    
    riskState.isPaused = true;
    riskState.pauseReason = '3 consecutive losses';
    riskState.pauseUntil = resumeDate;
    
    return {
      allowed: false,
      reason: trigger,
      action: 'PAUSE',
      sizeMultiplier: 0
    };
  }
  
  // Determine size multiplier based on conditions
  let sizeMultiplier = 1.0;
  let action: 'ALLOW' | 'REDUCE_SIZE' = 'ALLOW';
  let reason: string | undefined;
  
  // Drawdown > 15% → reduce size 50%
  if (riskState.currentDrawdownPercent > 15) {
    sizeMultiplier *= 0.5;
    action = 'REDUCE_SIZE';
    reason = `Drawdown ${riskState.currentDrawdownPercent.toFixed(1)}% > 15%`;
  }
  
  // Win rate < 40% → reduce size 25%
  if (riskState.winRate30d < 0.4 && riskState.trades30d >= 10) {
    sizeMultiplier *= 0.75;
    action = 'REDUCE_SIZE';
    reason = reason 
      ? `${reason}, Win rate ${(riskState.winRate30d * 100).toFixed(1)}% < 40%`
      : `Win rate ${(riskState.winRate30d * 100).toFixed(1)}% < 40%`;
  }
  
  return {
    allowed: true,
    reason,
    action,
    sizeMultiplier
  };
}

/**
 * Record a trade result and update risk metrics
 */
export async function recordTradeResult(
  tradeId: number,
  pnl: number,
  _pnlPercent: number
): Promise<void> {
  const db = getDatabase();
  
  // Update consecutive losses
  if (pnl < 0) {
    riskState.consecutiveLosses++;
    riskState.lastTradeResult = 'loss';
    
    logger.warn('Trade loss recorded', {
      tradeId,
      pnl,
      consecutiveLosses: riskState.consecutiveLosses
    });
    
    // Check if we hit 3 consecutive losses
    if (riskState.consecutiveLosses === 3) {
      await alertKillCriteria(
        '3 consecutive losses',
        'Pause trading for 7 days',
        { consecutiveLosses: riskState.consecutiveLosses }
      );
    }
  } else {
    riskState.consecutiveLosses = 0;
    riskState.lastTradeResult = 'win';
    riskState.wins30d++;
    logger.info('Trade win recorded', { tradeId, pnl });
  }
  
  // Update daily stats
  riskState.dailyPnl += pnl;
  riskState.dailyTrades++;
  riskState.trades30d++;
  riskState.winRate30d = riskState.trades30d > 0 ? riskState.wins30d / riskState.trades30d : 1;
  
  // Update drawdown
  await updateDrawdown();
  
  // Persist to database
  db.saveRiskState(riskState);
  
  logger.info('Trade result recorded', {
    tradeId,
    pnl: pnl.toFixed(2),
    dailyPnl: riskState.dailyPnl.toFixed(2),
    consecutiveLosses: riskState.consecutiveLosses,
    winRate30d: (riskState.winRate30d * 100).toFixed(1) + '%'
  });
}

/**
 * Update drawdown based on current portfolio value
 */
export async function updateDrawdown(): Promise<void> {
  try {
    const alpaca = getAlpacaClient();
    const account = await alpaca.getAccount();
    const currentValue = account.portfolioValue;
    
    // Update peak if we have a new high
    if (currentValue > riskState.peakPortfolioValue) {
      riskState.peakPortfolioValue = currentValue;
      riskState.currentDrawdownPercent = 0;
      logger.info('New portfolio peak', { peakValue: riskState.peakPortfolioValue });
    } else {
      // Calculate drawdown
      riskState.currentDrawdownPercent = ((riskState.peakPortfolioValue - currentValue) / riskState.peakPortfolioValue) * 100;
    }
    
    // Alert if drawdown > 15%
    if (riskState.currentDrawdownPercent > 15) {
      await alertKillCriteria(
        `Drawdown ${riskState.currentDrawdownPercent.toFixed(1)}% > 15%`,
        'Reduce position sizes 50%',
        { drawdownPercent: riskState.currentDrawdownPercent }
      );
    }
    
  } catch (error) {
    logger.error('Failed to update drawdown', { error });
  }
}

/**
 * EMERGENCY STOP - Close all positions immediately
 */
export async function emergencyStop(reason: string): Promise<void> {
  logger.error('EMERGENCY STOP TRIGGERED', { reason });
  
  try {
    const alpaca = getAlpacaClient();
    const db = getDatabase();
    
    // Close all positions
    const closedOrders = await alpaca.closeAllPositions();
    
    // Cancel all open orders
    const openOrders = await alpaca.getOpenOrders();
    for (const order of openOrders) {
      await alpaca.cancelOrder(order.id);
    }
    
    // Log the event
    await logKillCriteriaEvent('EMERGENCY STOP', reason);
    await alertKillCriteria('EMERGENCY STOP', reason, { 
      positionsClosed: closedOrders.length,
      ordersCancelled: openOrders.length
    });
    
    // Pause trading
    riskState.isPaused = true;
    riskState.pauseReason = `Emergency stop: ${reason}`;
    
    // Set pause for 24 hours (manual review required)
    const resumeDate = new Date();
    resumeDate.setHours(resumeDate.getHours() + 24);
    riskState.pauseUntil = resumeDate;
    
    // Persist state
    db.saveRiskState(riskState);
    
    logger.info('Emergency stop completed', {
      positionsClosed: closedOrders.length,
      ordersCancelled: openOrders.length
    });
    
  } catch (error) {
    logger.error('Emergency stop failed', { error });
    await alertError('Emergency Stop', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

/**
 * Reset daily statistics (called at market open or new day)
 */
export async function resetDailyStats(): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  
  logger.info('Resetting daily stats', {
    previousDate: riskState.lastTradeDate,
    newDate: today,
    previousDailyPnl: riskState.dailyPnl
  });
  
  riskState.dailyPnl = 0;
  riskState.dailyTrades = 0;
  riskState.lastTradeDate = today;
  
  const db = getDatabase();
  db.saveRiskState(riskState);
}

/**
 * Log kill criteria event to database
 */
async function logKillCriteriaEvent(trigger: string, action: string): Promise<void> {
  const db = getDatabase();
  db.logKillCriteriaEvent({
    trigger,
    action,
    timestamp: new Date().toISOString(),
    state: JSON.stringify(riskState)
  });
}

/**
 * Get current risk state (for monitoring)
 */
export function getRiskState(): KillCriteriaState {
  return { ...riskState };
}

/**
 * Manual resume (for admin override)
 */
export async function resumeTrading(): Promise<void> {
  riskState.isPaused = false;
  riskState.pauseReason = undefined;
  riskState.pauseUntil = undefined;
  
  const db = getDatabase();
  db.saveRiskState(riskState);
  
  logger.info('Trading manually resumed');
  await alertKillCriteria('Manual Resume', 'Trading resumed by administrator');
}

/**
 * Health check for risk system
 */
export async function riskHealthCheck(): Promise<{ healthy: boolean; issues: string[] }> {
  const issues: string[] = [];
  
  if (riskState.isPaused) {
    issues.push(`Trading paused: ${riskState.pauseReason}`);
  }
  
  if (riskState.currentDrawdownPercent > 10) {
    issues.push(`High drawdown: ${riskState.currentDrawdownPercent.toFixed(1)}%`);
  }
  
  if (riskState.consecutiveLosses >= 2) {
    issues.push(`Near kill threshold: ${riskState.consecutiveLosses} consecutive losses`);
  }
  
  if (riskState.dailyPnl <= -400) {
    issues.push(`Near daily loss limit: $${riskState.dailyPnl.toFixed(2)}`);
  }
  
  return {
    healthy: issues.length === 0,
    issues
  };
}
