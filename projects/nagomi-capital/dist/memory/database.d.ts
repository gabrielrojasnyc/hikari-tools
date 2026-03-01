/**
 * Database Manager
 * Handles SQLite connection and schema for signals and trades
 */
export declare class DatabaseManager {
    private db;
    constructor();
    private initializeSchema;
    saveSignal(signal: any): number;
    getUnprocessedSignals(limit?: number): any[];
    markSignalProcessed(id: number): void;
    saveDebate(debate: any): void;
    saveTrade(trade: any): number;
    getRiskState(): any;
    saveRiskState(state: any): void;
    logKillCriteriaEvent(event: {
        trigger: string;
        action: string;
        timestamp: string;
        state?: string;
    }): void;
    getOpenTrades(): any[];
    updateTradeExit(asset: string, exitData: {
        exitPrice: number;
        exitTime: string;
    }): void;
    closeTrade(tradeId: number, exitData: {
        exitPrice: number;
        exitTime: string;
        pnl: number;
    }): void;
    getTradeByOrderId(alpacaOrderId: string): any;
    savePerformanceMetrics(metrics: any): void;
    getPerformanceMetrics(date: string): any;
    getTradesForDate(date: string): any[];
    getTradesForDateRange(startDate: string, endDate: string): any[];
}
export declare function getDatabase(): DatabaseManager;
//# sourceMappingURL=database.d.ts.map