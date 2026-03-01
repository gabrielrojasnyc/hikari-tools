/**
 * Alpaca Market Data & Trading Client
 * Handles paper trading execution and market data fetching
 */
import AlpacaMod from '@alpacahq/alpaca-trade-api';
// Handle ESM/CJS interop - Alpaca exports a class that needs 'new'
const AlpacaClass = AlpacaMod.default || AlpacaMod;
import { logger } from '../../utils/logger.js';
// config import removed - unused
import { getAlpacaCredentials } from '../../utils/credentials.js';
export class AlpacaClient {
    client;
    constructor() {
        // Load credentials from Vault
        const creds = getAlpacaCredentials();
        // Alpaca exports a class that needs 'new' in ESM
        this.client = new AlpacaClass({
            keyId: creds.apiKey,
            secretKey: creds.secretKey,
            paper: true, // Always paper for now
            usePolygon: false,
        });
    }
    /**
     * Connect and verify API access
     */
    async connect() {
        try {
            const account = await this.client.getAccount();
            logger.info('Alpaca client connected', {
                accountId: account.id,
                buyingPower: account.buying_power,
                status: account.status,
            });
        }
        catch (error) {
            logger.error('Failed to connect to Alpaca', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    /**
     * Get account information
     */
    async getAccount() {
        try {
            const account = await this.client.getAccount();
            return {
                id: account.id,
                buyingPower: parseFloat(account.buying_power),
                cash: parseFloat(account.cash),
                portfolioValue: parseFloat(account.portfolio_value),
                equity: parseFloat(account.equity),
                longMarketValue: parseFloat(account.long_market_value),
                shortMarketValue: parseFloat(account.short_market_value),
                initialMargin: parseFloat(account.initial_margin),
                maintenanceMargin: parseFloat(account.maintenance_margin),
                daytradeCount: account.daytrade_count,
            };
        }
        catch (error) {
            logger.error('Failed to get account info', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    /**
     * Get current market data for a symbol
     */
    async getMarketData(symbol) {
        try {
            // Get latest trade
            const trade = await this.client.getLatestTrade(symbol);
            // Get latest quote for bid/ask
            const quote = await this.client.getLatestQuote(symbol);
            return {
                symbol: symbol.toUpperCase(),
                price: parseFloat(trade.Price),
                bid: parseFloat(quote.BidPrice),
                ask: parseFloat(quote.AskPrice),
                volume: trade.Size,
                timestamp: new Date(trade.Timestamp),
            };
        }
        catch (error) {
            logger.error('Failed to get market data', {
                symbol,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    /**
     * Get historical bars
     */
    async getHistoricalBars(symbol, timeframe = '5Min', limit = 100) {
        try {
            const bars = await this.client.getBarsV2(symbol, {
                timeframe,
                limit,
            });
            const results = [];
            for await (const bar of bars) {
                results.push({
                    timestamp: new Date(bar.Timestamp),
                    open: bar.OpenPrice,
                    high: bar.HighPrice,
                    low: bar.LowPrice,
                    close: bar.ClosePrice,
                    volume: bar.Volume,
                });
            }
            return results;
        }
        catch (error) {
            logger.error('Failed to get historical bars', {
                symbol,
                timeframe,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    /**
     * Place an order
     */
    async placeOrder(order) {
        try {
            logger.info('Placing order', {
                symbol: order.symbol,
                side: order.side,
                qty: order.qty,
                notional: order.notional,
                type: order.type,
            });
            const alpacaOrder = await this.client.createOrder({
                symbol: order.symbol,
                qty: order.qty,
                notional: order.notional,
                side: order.side,
                type: order.type,
                time_in_force: order.timeInForce,
                limit_price: order.limitPrice,
                stop_price: order.stopPrice,
                client_order_id: order.clientOrderId,
            });
            const response = {
                id: alpacaOrder.id,
                clientOrderId: alpacaOrder.client_order_id,
                symbol: alpacaOrder.symbol,
                side: alpacaOrder.side,
                type: alpacaOrder.type,
                status: alpacaOrder.status,
                qty: alpacaOrder.qty ? parseFloat(alpacaOrder.qty) : undefined,
                filledQty: alpacaOrder.filled_qty ? parseFloat(alpacaOrder.filled_qty) : undefined,
                filledAvgPrice: alpacaOrder.filled_avg_price ? parseFloat(alpacaOrder.filled_avg_price) : undefined,
                notional: alpacaOrder.notional ? parseFloat(alpacaOrder.notional) : undefined,
                createdAt: new Date(alpacaOrder.created_at),
            };
            logger.info('Order placed successfully', {
                orderId: response.id,
                status: response.status,
            });
            return response;
        }
        catch (error) {
            logger.error('Failed to place order', {
                order: { symbol: order.symbol, side: order.side, type: order.type },
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    /**
     * Get order status
     */
    async getOrder(orderId) {
        try {
            const order = await this.client.getOrder(orderId);
            return {
                id: order.id,
                clientOrderId: order.client_order_id,
                symbol: order.symbol,
                side: order.side,
                type: order.type,
                status: order.status,
                qty: order.qty ? parseFloat(order.qty) : undefined,
                filledQty: order.filled_qty ? parseFloat(order.filled_qty) : undefined,
                filledAvgPrice: order.filled_avg_price ? parseFloat(order.filled_avg_price) : undefined,
                notional: order.notional ? parseFloat(order.notional) : undefined,
                createdAt: new Date(order.created_at),
            };
        }
        catch (error) {
            logger.error('Failed to get order', {
                orderId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    /**
     * Cancel an order
     */
    async cancelOrder(orderId) {
        try {
            await this.client.cancelOrder(orderId);
            logger.info('Order cancelled', { orderId });
        }
        catch (error) {
            logger.error('Failed to cancel order', {
                orderId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    /**
     * Get all open orders
     */
    async getOpenOrders() {
        try {
            const orders = await this.client.getOrders({
                status: 'open',
            });
            return orders.map((order) => ({
                id: order.id,
                clientOrderId: order.client_order_id,
                symbol: order.symbol,
                side: order.side,
                type: order.type,
                status: order.status,
                qty: order.qty ? parseFloat(order.qty) : undefined,
                filledQty: order.filled_qty ? parseFloat(order.filled_qty) : undefined,
                filledAvgPrice: order.filled_avg_price ? parseFloat(order.filled_avg_price) : undefined,
                notional: order.notional ? parseFloat(order.notional) : undefined,
                createdAt: new Date(order.created_at),
            }));
        }
        catch (error) {
            logger.error('Failed to get open orders', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    /**
     * Get current positions
     */
    async getPositions() {
        try {
            const positions = await this.client.getPositions();
            return positions.map((pos) => ({
                symbol: pos.symbol,
                qty: parseFloat(pos.qty),
                avgEntryPrice: parseFloat(pos.avg_entry_price),
                marketValue: parseFloat(pos.market_value),
                unrealizedPl: parseFloat(pos.unrealized_pl),
                unrealizedPlpc: parseFloat(pos.unrealized_plpc),
                currentPrice: parseFloat(pos.current_price),
                lastdayPrice: parseFloat(pos.lastday_price),
                changeToday: parseFloat(pos.change_today),
            }));
        }
        catch (error) {
            logger.error('Failed to get positions', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    /**
     * Close a position
     */
    async closePosition(symbol) {
        try {
            logger.info('Closing position', { symbol });
            const order = await this.client.closePosition(symbol);
            return {
                id: order.id,
                clientOrderId: order.client_order_id,
                symbol: order.symbol,
                side: order.side,
                type: order.type,
                status: order.status,
                qty: order.qty ? parseFloat(order.qty) : undefined,
                filledQty: order.filled_qty ? parseFloat(order.filled_qty) : undefined,
                filledAvgPrice: order.filled_avg_price ? parseFloat(order.filled_avg_price) : undefined,
                notional: order.notional ? parseFloat(order.notional) : undefined,
                createdAt: new Date(order.created_at),
            };
        }
        catch (error) {
            logger.error('Failed to close position', {
                symbol,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    /**
     * Close all positions
     */
    async closeAllPositions() {
        try {
            logger.info('Closing all positions (EMERGENCY STOP)');
            const orders = await this.client.closeAllPositions();
            return orders.map((order) => ({
                id: order.id,
                clientOrderId: order.client_order_id,
                symbol: order.symbol,
                side: order.side,
                type: order.type,
                status: order.status,
                qty: order.qty ? parseFloat(order.qty) : undefined,
                filledQty: order.filled_qty ? parseFloat(order.filled_qty) : undefined,
                filledAvgPrice: order.filled_avg_price ? parseFloat(order.filled_avg_price) : undefined,
                notional: order.notional ? parseFloat(order.notional) : undefined,
                createdAt: new Date(order.created_at),
            }));
        }
        catch (error) {
            logger.error('Failed to close all positions', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    /**
     * Check if market is open
     */
    async isMarketOpen() {
        try {
            const clock = await this.client.getClock();
            return clock.is_open;
        }
        catch (error) {
            logger.error('Failed to check market status', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return false;
        }
    }
    /**
     * Health check
     */
    async isHealthy() {
        try {
            await this.client.getAccount();
            return true;
        }
        catch {
            return false;
        }
    }
}
// Singleton instance
let alpacaClient = null;
export function getAlpacaClient() {
    if (!alpacaClient) {
        alpacaClient = new AlpacaClient();
    }
    return alpacaClient;
}
//# sourceMappingURL=alpaca.js.map