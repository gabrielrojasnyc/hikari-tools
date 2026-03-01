/**
 * Sora (Trader) Execution Agent
 * Receives trade decisions from Mika and executes via Alpaca paper trading
 */
import { getAlpacaClient } from '../../ingestion/market/alpaca.js';
import { getDatabase } from '../../memory/database.js';
import { logger } from '../../utils/logger.js';
import { alertTradeExecuted, alertError, alertTradeDecision } from '../../utils/telegram.js';
import { checkKillCriteria, recordTradeResult } from './risk.js';
import { calculateFullPosition, calculateBracketPrices, isValidPositionSize } from './sizing.js';
import { config } from '../../config/index.js';
/**
 * Main execution function - receives decision from Mika and executes trade
 */
export async function executeTrade(decision) {
    logger.info('Sora received trade decision', {
        asset: decision.asset,
        direction: decision.direction,
        confidence: decision.confidence_score
    });
    // Step 1: Validate the decision
    const validation = validateDecision(decision);
    if (!validation.valid) {
        logger.warn('Trade decision validation failed', { reason: validation.reason });
        return {
            success: false,
            status: 'rejected',
            message: validation.reason || 'Validation failed'
        };
    }
    // Step 2: Check kill criteria
    const killCheck = await checkKillCriteria(decision.confidence_score);
    if (!killCheck.allowed) {
        logger.warn('Trade blocked by kill criteria', { reason: killCheck.reason });
        return {
            success: false,
            status: 'risk_blocked',
            message: killCheck.reason || 'Risk criteria not met'
        };
    }
    // Step 3: Calculate position sizing
    const sizing = calculateFullPosition(decision.conviction, decision.risk, decision.entry_price);
    // Apply kill criteria size multiplier
    if (killCheck.sizeMultiplier !== 1.0) {
        sizing.adjustedSizeUsd *= killCheck.sizeMultiplier;
        sizing.qty = Math.floor(sizing.qty * killCheck.sizeMultiplier);
        sizing.notional = sizing.qty * decision.entry_price;
        logger.info('Applied kill criteria size adjustment', {
            multiplier: killCheck.sizeMultiplier,
            newSize: sizing.adjustedSizeUsd
        });
    }
    // Validate minimum position size
    if (!isValidPositionSize(sizing.notional)) {
        logger.warn('Position size too small', { notional: sizing.notional });
        return {
            success: false,
            status: 'rejected',
            message: `Position size $${sizing.notional.toFixed(2)} below minimum $100`
        };
    }
    // Step 4: Alert before execution
    await alertTradeDecision(decision.asset, decision.direction, sizing.notional, decision.confidence_score, decision.conviction, decision.risk);
    // Step 5: Execute the trade
    try {
        const result = await submitOrder(decision, sizing.qty);
        if (result.success && result.orderId) {
            // Step 6: Log to database
            const db = getDatabase();
            const tradeId = db.saveTrade({
                debateId: null, // Would be linked if passed from debate
                alpacaOrderId: result.orderId,
                asset: decision.asset,
                direction: decision.direction,
                entryPrice: result.filledPrice || decision.entry_price,
                qty: result.filledQty || sizing.qty,
                notional: sizing.notional,
                status: 'pending'
            });
            // Step 7: Send execution alert
            await alertTradeExecuted(decision.asset, decision.direction, result.filledQty || sizing.qty, result.filledPrice || decision.entry_price, result.orderId);
            logger.info('Trade execution completed', {
                tradeId,
                orderId: result.orderId,
                asset: decision.asset,
                direction: decision.direction
            });
            return {
                ...result,
                tradeId
            };
        }
        return result;
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Trade execution failed', { error: errorMessage, decision });
        await alertError('Trade Execution', errorMessage);
        return {
            success: false,
            status: 'error',
            message: errorMessage
        };
    }
}
/**
 * Submit order to Alpaca with bracket orders (stop loss + take profit)
 */
async function submitOrder(decision, qty) {
    // Guard against NO_TRADE
    if (decision.direction === 'NO_TRADE') {
        return {
            success: false,
            status: 'rejected',
            message: 'Direction is NO_TRADE'
        };
    }
    const alpaca = getAlpacaClient();
    // Determine side
    const side = decision.direction === 'LONG' ? 'buy' : 'sell';
    // Calculate bracket prices
    const { stopLossPrice, takeProfitPrice } = calculateBracketPrices(decision.entry_price, decision.direction, 5, // 5% stop loss
    10 // 10% take profit
    );
    logger.info('Submitting order', {
        asset: decision.asset,
        side,
        qty,
        entry: decision.entry_price,
        stopLoss: stopLossPrice,
        takeProfit: takeProfitPrice
    });
    try {
        // Place main entry order (market order for immediate execution)
        const orderRequest = {
            symbol: decision.asset,
            qty: qty,
            side: side,
            type: 'market',
            timeInForce: 'day',
            clientOrderId: `nagomi-${Date.now()}-${decision.asset}`
        };
        const order = await alpaca.placeOrder(orderRequest);
        // Wait briefly for fill
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Check order status
        const orderStatus = await alpaca.getOrder(order.id);
        if (orderStatus.status === 'rejected' || orderStatus.status === 'canceled') {
            return {
                success: false,
                status: 'rejected',
                message: `Order ${orderStatus.status}`
            };
        }
        // Place stop loss order (if entry filled)
        if (orderStatus.filledQty && orderStatus.filledQty > 0) {
            const filledQty = orderStatus.filledQty;
            const filledPrice = orderStatus.filledAvgPrice || decision.entry_price;
            // Stop loss order (opposite side)
            const stopSide = decision.direction === 'LONG' ? 'sell' : 'buy';
            const stopOrder = {
                symbol: decision.asset,
                qty: filledQty,
                side: stopSide,
                type: 'stop',
                timeInForce: 'gtc',
                stopPrice: stopLossPrice,
                clientOrderId: `nagomi-sl-${Date.now()}-${decision.asset}`
            };
            try {
                await alpaca.placeOrder(stopOrder);
                logger.info('Stop loss order placed', {
                    asset: decision.asset,
                    stopPrice: stopLossPrice
                });
            }
            catch (error) {
                logger.error('Failed to place stop loss order', { error });
                // Continue - we at least have the position
            }
            // Take profit order (limit)
            const tpOrder = {
                symbol: decision.asset,
                qty: filledQty,
                side: stopSide,
                type: 'limit',
                timeInForce: 'gtc',
                limitPrice: takeProfitPrice,
                clientOrderId: `nagomi-tp-${Date.now()}-${decision.asset}`
            };
            try {
                await alpaca.placeOrder(tpOrder);
                logger.info('Take profit order placed', {
                    asset: decision.asset,
                    takeProfit: takeProfitPrice
                });
            }
            catch (error) {
                logger.error('Failed to place take profit order', { error });
                // Continue - we at least have the position
            }
            return {
                success: true,
                orderId: order.id,
                filledQty: filledQty,
                filledPrice: filledPrice,
                status: 'filled',
                message: `Order filled: ${filledQty} shares @ $${filledPrice.toFixed(2)}`
            };
        }
        // Order pending
        return {
            success: true,
            orderId: order.id,
            status: 'filled',
            message: `Order placed, status: ${orderStatus.status}`
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Order submission failed', { error: errorMessage });
        return {
            success: false,
            status: 'error',
            message: errorMessage
        };
    }
}
/**
 * Validate trade decision
 */
function validateDecision(decision) {
    // Check for NO_TRADE
    if (decision.direction === 'NO_TRADE') {
        return { valid: false, reason: 'Decision is NO_TRADE' };
    }
    // Validate asset
    if (!decision.asset || decision.asset.length < 1) {
        return { valid: false, reason: 'Invalid asset' };
    }
    // Validate entry price
    if (decision.entry_price <= 0) {
        return { valid: false, reason: 'Invalid entry price' };
    }
    // Validate confidence score
    if (decision.confidence_score < config.minConfidenceScore) {
        return {
            valid: false,
            reason: `Confidence score ${decision.confidence_score.toFixed(2)} below minimum ${config.minConfidenceScore}`
        };
    }
    // Validate risk score
    if (decision.risk > config.maxRiskScore) {
        return {
            valid: false,
            reason: `Risk score ${decision.risk} above maximum ${config.maxRiskScore}`
        };
    }
    // Validate conviction
    if (decision.conviction < 1 || decision.conviction > 10) {
        return { valid: false, reason: 'Conviction must be between 1 and 10' };
    }
    return { valid: true };
}
/**
 * Close a specific position
 */
export async function closePosition(symbol) {
    try {
        const alpaca = getAlpacaClient();
        const db = getDatabase();
        logger.info('Closing position', { symbol });
        const order = await alpaca.closePosition(symbol);
        // Update trade in database
        db.updateTradeExit(symbol, {
            exitPrice: order.filledAvgPrice || 0,
            exitTime: new Date().toISOString()
        });
        return {
            success: true,
            orderId: order.id,
            status: 'filled',
            message: `Position closed: ${symbol}`
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Failed to close position', { symbol, error: errorMessage });
        return {
            success: false,
            status: 'error',
            message: errorMessage
        };
    }
}
/**
 * Get current positions summary
 */
export async function getPositionsSummary() {
    try {
        const alpaca = getAlpacaClient();
        const positions = await alpaca.getPositions();
        let totalMarketValue = 0;
        let totalUnrealizedPnl = 0;
        const summary = positions.map(pos => {
            totalMarketValue += pos.marketValue;
            totalUnrealizedPnl += pos.unrealizedPl;
            return {
                symbol: pos.symbol,
                qty: pos.qty,
                marketValue: pos.marketValue,
                unrealizedPnl: pos.unrealizedPl
            };
        });
        return {
            positions: summary,
            totalMarketValue,
            totalUnrealizedPnl
        };
    }
    catch (error) {
        logger.error('Failed to get positions summary', { error });
        return {
            positions: [],
            totalMarketValue: 0,
            totalUnrealizedPnl: 0
        };
    }
}
/**
 * Sync trade P&L from Alpaca to database
 */
export async function syncTradePnl() {
    try {
        const alpaca = getAlpacaClient();
        const db = getDatabase();
        // Get all open trades from database
        const openTrades = db.getOpenTrades();
        for (const trade of openTrades) {
            try {
                // Check if position still exists
                const positions = await alpaca.getPositions();
                const position = positions.find(p => p.symbol === trade.asset);
                if (!position) {
                    // Position closed - get order fill details
                    const order = await alpaca.getOrder(trade.alpaca_order_id);
                    if (order.status === 'filled') {
                        const exitPrice = order.filledAvgPrice || trade.entry_price;
                        const pnl = (exitPrice - trade.entry_price) * trade.qty *
                            (trade.direction === 'LONG' ? 1 : -1);
                        db.closeTrade(trade.id, {
                            exitPrice,
                            exitTime: new Date().toISOString(),
                            pnl
                        });
                        // Record for kill criteria tracking
                        await recordTradeResult(trade.id, pnl, (pnl / (trade.entry_price * trade.qty)) * 100);
                        logger.info('Trade closed and P&L recorded', {
                            tradeId: trade.id,
                            pnl: pnl.toFixed(2)
                        });
                    }
                }
            }
            catch (error) {
                logger.error('Failed to sync trade', { tradeId: trade.id, error });
            }
        }
    }
    catch (error) {
        logger.error('Failed to sync trade P&L', { error });
    }
}
//# sourceMappingURL=execute.js.map