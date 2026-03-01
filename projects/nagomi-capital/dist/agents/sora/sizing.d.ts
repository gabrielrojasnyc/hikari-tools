/**
 * Position Sizing Module
 * Calculates position sizes based on confidence, risk, and kill criteria adjustments
 */
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
export declare function calculatePositionSize(input: SizingInput): number;
/**
 * Apply kill criteria adjustments to position size
 */
export declare function applyKillCriteriaAdjustments(rawSizeUsd: number, drawdownPercent: number, consecutiveLosses: number, winRate30d: number): {
    adjustedSize: number;
    reason?: string;
};
/**
 * Calculate quantity from notional amount and price
 */
export declare function calculateQuantity(notionalUsd: number, price: number): number;
/**
 * Full position sizing calculation with all adjustments
 */
export declare function calculateFullPosition(conviction: number, risk: number, entryPrice: number, drawdownPercent?: number, consecutiveLosses?: number, winRate30d?: number): SizingResult;
/**
 * Validate that position size meets minimum requirements
 */
export declare function isValidPositionSize(notionalUsd: number): boolean;
/**
 * Calculate stop-loss and take-profit prices
 */
export declare function calculateBracketPrices(entryPrice: number, direction: 'LONG' | 'SHORT', stopLossPercent: number, takeProfitPercent: number): {
    stopLossPrice: number;
    takeProfitPrice: number;
};
//# sourceMappingURL=sizing.d.ts.map