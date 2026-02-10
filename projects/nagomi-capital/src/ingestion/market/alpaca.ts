/**
 * Alpaca Market Data & Trading Client
 * Handles paper trading execution and market data fetching
 */

import AlpacaMod from '@alpacahq/alpaca-trade-api';
// Handle ESM/CJS interop - Alpaca exports a class that needs 'new'
const AlpacaClass = (AlpacaMod as any).default || AlpacaMod;
import { logger } from '../../utils/logger.js';
// config import removed - unused
import { getAlpacaCredentials } from '../../utils/credentials.js';

export interface MarketData {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  volume: number;
  timestamp: Date;
  changePercent?: number;
}

export interface OrderRequest {
  symbol: string;
  qty?: number;
  notional?: number;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  timeInForce: 'day' | 'gtc' | 'ioc' | 'fok';
  limitPrice?: number;
  stopPrice?: number;
  clientOrderId?: string;
}

export interface OrderResponse {
  id: string;
  clientOrderId: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: string;
  status: 'new' | 'partially_filled' | 'filled' | 'done_for_day' | 'canceled' | 'expired' | 'rejected' | 'pending_cancel' | 'pending_replace' | 'accepted' | 'pending_new' | 'accepted_for_bidding' | 'stopped' | 'calculated' | 'suspended';
  qty?: number;
  filledQty?: number;
  filledAvgPrice?: number;
  notional?: number;
  createdAt: Date;
}

export interface Position {
  symbol: string;
  qty: number;
  avgEntryPrice: number;
  marketValue: number;
  unrealizedPl: number;
  unrealizedPlpc: number;
  currentPrice: number;
  lastdayPrice: number;
  changeToday: number;
}

export interface AccountInfo {
  id: string;
  buyingPower: number;
  cash: number;
  portfolioValue: number;
  equity: number;
  longMarketValue: number;
  shortMarketValue: number;
  initialMargin: number;
  maintenanceMargin: number;
  daytradeCount: number;
}

export class AlpacaClient {
  private client: any;

  constructor() {
    // Load credentials from Vault
    const creds = getAlpacaCredentials();
    
    // Alpaca exports a class that needs 'new' in ESM
    this.client = new (AlpacaClass as any)({
      keyId: creds.apiKey,
      secretKey: creds.secretKey,
      paper: true, // Always paper for now
      usePolygon: false,
    });
  }

  /**
   * Connect and verify API access
   */
  async connect(): Promise<void> {
    try {
      const account = await this.client.getAccount();
      logger.info('Alpaca client connected', {
        accountId: account.id,
        buyingPower: account.buying_power,
        status: account.status,
      });
    } catch (error) {
      logger.error('Failed to connect to Alpaca', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get account information
   */
  async getAccount(): Promise<AccountInfo> {
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
    } catch (error) {
      logger.error('Failed to get account info', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get current market data for a symbol
   */
  async getMarketData(symbol: string): Promise<MarketData> {
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
    } catch (error) {
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
  async getHistoricalBars(
    symbol: string,
    timeframe: '1Min' | '5Min' | '15Min' | '1Hour' | '1Day' = '5Min',
    limit: number = 100
  ): Promise<Array<{ timestamp: Date; open: number; high: number; low: number; close: number; volume: number }>> {
    try {
      const bars = await this.client.getBarsV2(symbol, {
        timeframe,
        limit,
      });

      const results: Array<{ timestamp: Date; open: number; high: number; low: number; close: number; volume: number }> = [];
      
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
    } catch (error) {
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
  async placeOrder(order: OrderRequest): Promise<OrderResponse> {
    try {
      logger.info('Placing order', {
        symbol: order.symbol,
        side: order.side,
        qty: order.qty,
        notional: order.notional,
        type: order.type,
      });

      const alpacaOrder: any = await this.client.createOrder({
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

      const response: OrderResponse = {
        id: alpacaOrder.id,
        clientOrderId: alpacaOrder.client_order_id,
        symbol: alpacaOrder.symbol,
        side: alpacaOrder.side as 'buy' | 'sell',
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
    } catch (error) {
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
  async getOrder(orderId: string): Promise<OrderResponse> {
    try {
      const order = await this.client.getOrder(orderId);
      
      return {
        id: order.id,
        clientOrderId: order.client_order_id,
        symbol: order.symbol,
        side: order.side as 'buy' | 'sell',
        type: order.type,
        status: order.status,
        qty: order.qty ? parseFloat(order.qty) : undefined,
        filledQty: order.filled_qty ? parseFloat(order.filled_qty) : undefined,
        filledAvgPrice: order.filled_avg_price ? parseFloat(order.filled_avg_price) : undefined,
        notional: order.notional ? parseFloat(order.notional) : undefined,
        createdAt: new Date(order.created_at),
      };
    } catch (error) {
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
  async cancelOrder(orderId: string): Promise<void> {
    try {
      await this.client.cancelOrder(orderId);
      logger.info('Order cancelled', { orderId });
    } catch (error) {
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
  async getOpenOrders(): Promise<OrderResponse[]> {
    try {
      const orders: any[] = await this.client.getOrders({
        status: 'open',
      });

      return orders.map((order: any) => ({
        id: order.id,
        clientOrderId: order.client_order_id,
        symbol: order.symbol,
        side: order.side as 'buy' | 'sell',
        type: order.type,
        status: order.status,
        qty: order.qty ? parseFloat(order.qty) : undefined,
        filledQty: order.filled_qty ? parseFloat(order.filled_qty) : undefined,
        filledAvgPrice: order.filled_avg_price ? parseFloat(order.filled_avg_price) : undefined,
        notional: order.notional ? parseFloat(order.notional) : undefined,
        createdAt: new Date(order.created_at),
      }));
    } catch (error) {
      logger.error('Failed to get open orders', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get current positions
   */
  async getPositions(): Promise<Position[]> {
    try {
      const positions: any[] = await this.client.getPositions();

      return positions.map((pos: any) => ({
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
    } catch (error) {
      logger.error('Failed to get positions', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Close a position
   */
  async closePosition(symbol: string): Promise<OrderResponse> {
    try {
      logger.info('Closing position', { symbol });
      
      const order = await this.client.closePosition(symbol);
      
      return {
        id: order.id,
        clientOrderId: order.client_order_id,
        symbol: order.symbol,
        side: order.side as 'buy' | 'sell',
        type: order.type,
        status: order.status,
        qty: order.qty ? parseFloat(order.qty) : undefined,
        filledQty: order.filled_qty ? parseFloat(order.filled_qty) : undefined,
        filledAvgPrice: order.filled_avg_price ? parseFloat(order.filled_avg_price) : undefined,
        notional: order.notional ? parseFloat(order.notional) : undefined,
        createdAt: new Date(order.created_at),
      };
    } catch (error) {
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
  async closeAllPositions(): Promise<OrderResponse[]> {
    try {
      logger.info('Closing all positions (EMERGENCY STOP)');
      
      const orders: any[] = await this.client.closeAllPositions();
      
      return orders.map((order: any) => ({
        id: order.id,
        clientOrderId: order.client_order_id,
        symbol: order.symbol,
        side: order.side as 'buy' | 'sell',
        type: order.type,
        status: order.status,
        qty: order.qty ? parseFloat(order.qty) : undefined,
        filledQty: order.filled_qty ? parseFloat(order.filled_qty) : undefined,
        filledAvgPrice: order.filled_avg_price ? parseFloat(order.filled_avg_price) : undefined,
        notional: order.notional ? parseFloat(order.notional) : undefined,
        createdAt: new Date(order.created_at),
      }));
    } catch (error) {
      logger.error('Failed to close all positions', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Check if market is open
   */
  async isMarketOpen(): Promise<boolean> {
    try {
      const clock = await this.client.getClock();
      return clock.is_open;
    } catch (error) {
      logger.error('Failed to check market status', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Health check
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.client.getAccount();
      return true;
    } catch {
      return false;
    }
  }
}

// Singleton instance
let alpacaClient: AlpacaClient | null = null;

export function getAlpacaClient(): AlpacaClient {
  if (!alpacaClient) {
    alpacaClient = new AlpacaClient();
  }
  return alpacaClient;
}
