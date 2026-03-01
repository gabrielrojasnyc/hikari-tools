/**
 * Alpaca Market Data & Trading Client
 * Handles paper trading execution and market data fetching
 */
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
export declare class AlpacaClient {
    private client;
    constructor();
    /**
     * Connect and verify API access
     */
    connect(): Promise<void>;
    /**
     * Get account information
     */
    getAccount(): Promise<AccountInfo>;
    /**
     * Get current market data for a symbol
     */
    getMarketData(symbol: string): Promise<MarketData>;
    /**
     * Get historical bars
     */
    getHistoricalBars(symbol: string, timeframe?: '1Min' | '5Min' | '15Min' | '1Hour' | '1Day', limit?: number): Promise<Array<{
        timestamp: Date;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
    }>>;
    /**
     * Place an order
     */
    placeOrder(order: OrderRequest): Promise<OrderResponse>;
    /**
     * Get order status
     */
    getOrder(orderId: string): Promise<OrderResponse>;
    /**
     * Cancel an order
     */
    cancelOrder(orderId: string): Promise<void>;
    /**
     * Get all open orders
     */
    getOpenOrders(): Promise<OrderResponse[]>;
    /**
     * Get current positions
     */
    getPositions(): Promise<Position[]>;
    /**
     * Close a position
     */
    closePosition(symbol: string): Promise<OrderResponse>;
    /**
     * Close all positions
     */
    closeAllPositions(): Promise<OrderResponse[]>;
    /**
     * Check if market is open
     */
    isMarketOpen(): Promise<boolean>;
    /**
     * Health check
     */
    isHealthy(): Promise<boolean>;
}
export declare function getAlpacaClient(): AlpacaClient;
//# sourceMappingURL=alpaca.d.ts.map