/**
 * Position Sizing Module
 * Calculates position sizes based on confidence, risk, and kill criteria adjustments
 */

import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

export interface SizingInput {
  conviction: number;
  risk: number;
  confidenceScore: number;
  basePositionUsd: number;
  maxPositionUsd: number;
}

export interface SizingResult {
  rawSizeUsd: number;
  adjustedSizeUsd: number;
  sizeReductionReason?: string;
  qty: number;
  notional: number;
  stopLossPercent: number;
  takeProfitPercent: number;
}

/**
 * Calculate position size based on confidence-weighted sizing formula
 * Position Size = (conviction / risk) × base_position
 */
export function calculatePositionSize(input: SizingInput): number {
  const { conviction, risk, basePositionUsd, maxPositionUsd } = input;
  
  // Ensure risk isn't 0 to avoid division by zero
  const safeRisk = Math.max(risk, 1);
  
  // Calculate confidence score
  const confidenceScore = conviction / safeRisk;
  
  // Calculate raw position size
  let positionSize = confidenceScore * basePositionUsd;
  
  // Cap at maximum
  if (positionSize > maxPositionUsd) {
    positionSize = maxPositionUsd;
  }
  
  // Minimum position size: $100
  if (positionSize < 100) {
    positionSize = 0; // Too small to trade
  }
  
  return Math.floor(positionSize);
}

/**
 * Apply kill criteria adjustments to position size
 */
export function applyKillCriteriaAdjustments(
  rawSizeUsd: number,
  drawdownPercent: number,
  consecutiveLosses: number,
  winRate30d: number
): { adjustedSize: number; reason?: string } {
  let adjustedSize = rawSizeUsd;
  let reason: string | undefined;
  
  // Drawdown > 15% → reduce size 50%
  if (drawdownPercent > 15) {
    adjustedSize = adjustedSize * 0.5;
    reason = `Drawdown ${drawdownPercent.toFixed(1)}% > 15%`;
    logger.warn('Kill criteria: Reducing position size due to drawdown', {
      drawdownPercent,
      originalSize: rawSizeUsd,
      adjustedSize
    });
  }
  
  // 3 consecutive losses → reduce size 50% (additional to drawdown)
  if (consecutiveLosses >= 3) {
    adjustedSize = adjustedSize * 0.5;
    const lossReason = `${consecutiveLosses} consecutive losses`;
    reason = reason ? `${reason}, ${lossReason}` : lossReason;
    logger.warn('Kill criteria: Reducing position size due to consecutive losses', {
      consecutiveLosses,
      adjustedSize
    });
  }
  
  // Win rate < 40% over 30 days → reduce size 25%
  if (winRate30d < 0.4 && winRate30d > 0) {
    adjustedSize = adjustedSize * 0.75;
    const winRateReason = `30d win rate ${(winRate30d * 100).toFixed(1)}% < 40%`;
    reason = reason ? `${reason}, ${winRateReason}` : winRateReason;
    logger.warn('Kill criteria: Reducing position size due to low win rate', {
      winRate30d,
      adjustedSize
    });
  }
  
  return { adjustedSize: Math.floor(adjustedSize), reason };
}

/**
 * Calculate quantity from notional amount and price
 */
export function calculateQuantity(notionalUsd: number, price: number): number {
  if (price <= 0) {
    throw new Error(`Invalid price: ${price}`);
  }
  
  // Calculate raw quantity
  let qty = notionalUsd / price;
  
  // Round based on price tier (standard Alpaca behavior)
  if (price >= 1) {
    // Round to whole shares for stocks >= $1
    qty = Math.floor(qty);
  } else {
    // For penny stocks, round to 4 decimal places
    qty = Math.floor(qty * 10000) / 10000;
  }
  
  return qty;
}

/**
 * Full position sizing calculation with all adjustments
 */
export function calculateFullPosition(
  conviction: number,
  risk: number,
  entryPrice: number,
  drawdownPercent: number = 0,
  consecutiveLosses: number = 0,
  winRate30d: number = 1.0
): SizingResult {
  // Step 1: Calculate raw position size
  const rawSizeUsd = calculatePositionSize({
    conviction,
    risk,
    confidenceScore: conviction / Math.max(risk, 1),
    basePositionUsd: config.basePositionSizeUsd,
    maxPositionUsd: config.maxPositionSizeUsd
  });
  
  // Step 2: Apply kill criteria adjustments
  const { adjustedSize: adjustedSizeUsd, reason } = applyKillCriteriaAdjustments(
    rawSizeUsd,
    drawdownPercent,
    consecutiveLosses,
    winRate30d
  );
  
  // Step 3: Calculate quantity
  const qty = calculateQuantity(adjustedSizeUsd, entryPrice);
  const notional = qty * entryPrice;
  
  // Step 4: Determine bracket order percentages based on risk
  // Higher risk = tighter stop, lower take profit
  // Lower risk = wider stop, higher take profit
  const stopLossPercent = 5; // Fixed 5% stop loss
  const takeProfitPercent = 10; // Fixed 10% take profit
  
  return {
    rawSizeUsd,
    adjustedSizeUsd,
    sizeReductionReason: reason,
    qty,
    notional,
    stopLossPercent,
    takeProfitPercent
  };
}

/**
 * Validate that position size meets minimum requirements
 */
export function isValidPositionSize(notionalUsd: number): boolean {
  return notionalUsd >= 100; // Minimum $100 position
}

/**
 * Calculate stop-loss and take-profit prices
 */
export function calculateBracketPrices(
  entryPrice: number,
  direction: 'LONG' | 'SHORT',
  stopLossPercent: number,
  takeProfitPercent: number
): { stopLossPrice: number; takeProfitPrice: number } {
  const stopLossMultiplier = direction === 'LONG' 
    ? (1 - stopLossPercent / 100) 
    : (1 + stopLossPercent / 100);
    
  const takeProfitMultiplier = direction === 'LONG'
    ? (1 + takeProfitPercent / 100)
    : (1 - takeProfitPercent / 100);
  
  return {
    stopLossPrice: parseFloat((entryPrice * stopLossMultiplier).toFixed(2)),
    takeProfitPrice: parseFloat((entryPrice * takeProfitMultiplier).toFixed(2))
  };
}
