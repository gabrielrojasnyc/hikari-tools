/**
 * Sora (Trader) Execution Agent
 * Receives trade decisions from Mika and executes via Alpaca paper trading
 */
import { TradeDecision } from '../mika/judge.js';
export interface ExecutionResult {
    success: boolean;
    orderId?: string;
    filledQty?: number;
    filledPrice?: number;
    status: 'filled' | 'rejected' | 'error' | 'risk_blocked' | 'no_trade';
    message: string;
    tradeId?: number;
}
/**
 * Main execution function - receives decision from Mika and executes trade
 */
export declare function executeTrade(decision: TradeDecision): Promise<ExecutionResult>;
/**
 * Close a specific position
 */
export declare function closePosition(symbol: string): Promise<ExecutionResult>;
/**
 * Get current positions summary
 */
export declare function getPositionsSummary(): Promise<{
    positions: Array<{
        symbol: string;
        qty: number;
        marketValue: number;
        unrealizedPnl: number;
    }>;
    totalMarketValue: number;
    totalUnrealizedPnl: number;
}>;
/**
 * Sync trade P&L from Alpaca to database
 */
export declare function syncTradePnl(): Promise<void>;
//# sourceMappingURL=execute.d.ts.map