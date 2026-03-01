/**
 * Initialize Telegram configuration
 * Called once at startup after credentials are loaded
 */
export declare function initializeTelegram(): void;
export declare function sendTelegramAlert(message: string, parseMode?: 'Markdown' | 'HTML'): Promise<boolean>;
export declare function alertNewSignal(asset: string, direction: string, confidence: number, source: string): Promise<void>;
export declare function alertTradeDecision(asset: string, direction: string, positionSize: number, confidenceScore: number, conviction: number, risk: number): Promise<void>;
export declare function alertKillCriteria(trigger: string, action: string, details?: Record<string, unknown>): Promise<void>;
export declare function alertTradeExecuted(asset: string, direction: string, filledQty: number, filledPrice: number, orderId: string): Promise<void>;
export declare function alertError(context: string, error: string): Promise<void>;
export interface DailyPnlSummary {
    date: string;
    totalPnl: number;
    realizedPnl: number;
    unrealizedPnl: number;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    portfolioValue: number;
    drawdownPercent: number;
}
export declare function alertDailyPnl(summary: DailyPnlSummary): Promise<void>;
export declare function alertSystemStatus(status: 'started' | 'stopped' | 'healthy' | 'unhealthy', details?: Record<string, unknown>): Promise<void>;
//# sourceMappingURL=telegram.d.ts.map