/**
 * Risk Management & Kill Criteria Module
 * Tracks performance metrics and enforces trading limits
 */
export interface KillCriteriaState {
    consecutiveLosses: number;
    lastTradeResult: 'win' | 'loss' | null;
    peakPortfolioValue: number;
    currentDrawdownPercent: number;
    dailyPnl: number;
    dailyTrades: number;
    lastTradeDate: string;
    lowConfidenceCount: number;
    lastDebateConfidences: number[];
    isPaused: boolean;
    pauseReason?: string;
    pauseUntil?: Date;
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
/**
 * Initialize risk state from database and Alpaca account
 */
export declare function initializeRiskState(): Promise<void>;
/**
 * Check all kill criteria before allowing a trade
 */
export declare function checkKillCriteria(debateConfidence?: number): Promise<RiskCheckResult>;
/**
 * Record a trade result and update risk metrics
 */
export declare function recordTradeResult(tradeId: number, pnl: number, _pnlPercent: number): Promise<void>;
/**
 * Update drawdown based on current portfolio value
 */
export declare function updateDrawdown(): Promise<void>;
/**
 * EMERGENCY STOP - Close all positions immediately
 */
export declare function emergencyStop(reason: string): Promise<void>;
/**
 * Reset daily statistics (called at market open or new day)
 */
export declare function resetDailyStats(): Promise<void>;
/**
 * Get current risk state (for monitoring)
 */
export declare function getRiskState(): KillCriteriaState;
/**
 * Manual resume (for admin override)
 */
export declare function resumeTrading(): Promise<void>;
/**
 * Health check for risk system
 */
export declare function riskHealthCheck(): Promise<{
    healthy: boolean;
    issues: string[];
}>;
//# sourceMappingURL=risk.d.ts.map