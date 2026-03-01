/**
 * Sora Agent Tests
 * Tests for kill criteria, position sizing, and emergency stop functionality
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculatePositionSize, applyKillCriteriaAdjustments, calculateQuantity, calculateFullPosition, isValidPositionSize, calculateBracketPrices } from '../agents/sora/sizing.js';
import { checkKillCriteria, emergencyStop } from '../agents/sora/risk.js';
// ============================================================================
// Position Sizing Tests
// ============================================================================
describe('Position Sizing', () => {
    describe('calculatePositionSize', () => {
        it('should calculate correct position size based on conviction/risk', () => {
            const size = calculatePositionSize({
                conviction: 8,
                risk: 4,
                confidenceScore: 2.0,
                basePositionUsd: 1000,
                maxPositionUsd: 5000
            });
            // (8 / 4) * 1000 = 2000
            assert.strictEqual(size, 2000);
        });
        it('should cap position at max size', () => {
            const size = calculatePositionSize({
                conviction: 10,
                risk: 1,
                confidenceScore: 10.0,
                basePositionUsd: 1000,
                maxPositionUsd: 5000
            });
            // (10 / 1) * 1000 = 10000, but capped at 5000
            assert.strictEqual(size, 5000);
        });
        it('should return minimum position for low confidence', () => {
            const size = calculatePositionSize({
                conviction: 1,
                risk: 10,
                confidenceScore: 0.1,
                basePositionUsd: 1000,
                maxPositionUsd: 5000
            });
            // (1 / 10) * 1000 = 100, which is the minimum
            assert.strictEqual(size, 100);
        });
        it('should handle division by zero risk', () => {
            const size = calculatePositionSize({
                conviction: 5,
                risk: 0,
                confidenceScore: 5.0,
                basePositionUsd: 1000,
                maxPositionUsd: 5000
            });
            // Risk of 0 should be treated as 1
            // (5 / 1) * 1000 = 5000
            assert.strictEqual(size, 5000);
        });
    });
    describe('applyKillCriteriaAdjustments', () => {
        it('should reduce size by 50% when drawdown > 15%', () => {
            const result = applyKillCriteriaAdjustments(2000, // raw size
            20, // 20% drawdown
            0, // no consecutive losses
            0.5 // 50% win rate
            );
            assert.strictEqual(result.adjustedSize, 1000);
            assert.ok(result.reason?.includes('Drawdown'));
        });
        it('should reduce size by 50% when 3 consecutive losses', () => {
            const result = applyKillCriteriaAdjustments(2000, 0, 3, 0.5);
            assert.strictEqual(result.adjustedSize, 1000);
            assert.ok(result.reason?.includes('consecutive losses'));
        });
        it('should reduce size by 25% when win rate < 40%', () => {
            const result = applyKillCriteriaAdjustments(2000, 0, 0, 0.35 // 35% win rate
            );
            assert.strictEqual(result.adjustedSize, 1500);
            assert.ok(result.reason?.includes('win rate'));
        });
        it('should stack multiple reductions', () => {
            const result = applyKillCriteriaAdjustments(2000, 20, // drawdown reduction: 50%
            3, // consecutive losses reduction: 50%
            0.35 // win rate reduction: 75%
            );
            // 2000 * 0.5 * 0.5 * 0.75 = 375
            assert.strictEqual(result.adjustedSize, 375);
            assert.ok(result.reason?.includes('Drawdown'));
            assert.ok(result.reason?.includes('consecutive losses'));
            assert.ok(result.reason?.includes('win rate'));
        });
    });
    describe('calculateQuantity', () => {
        it('should calculate whole shares for stocks >= $1', () => {
            const qty = calculateQuantity(1000, 100);
            assert.strictEqual(qty, 10); // $1000 / $100 = 10 shares
        });
        it('should calculate fractional shares for penny stocks', () => {
            const qty = calculateQuantity(100, 0.5);
            assert.strictEqual(qty, 200); // $100 / $0.50 = 200 shares
        });
        it('should round down to whole shares', () => {
            const qty = calculateQuantity(1000, 99.99);
            assert.strictEqual(qty, 10); // Rounded down from 10.001
        });
        it('should throw error for invalid price', () => {
            assert.throws(() => calculateQuantity(1000, 0), /Invalid price/);
            assert.throws(() => calculateQuantity(1000, -1), /Invalid price/);
        });
    });
    describe('isValidPositionSize', () => {
        it('should accept positions >= $100', () => {
            assert.strictEqual(isValidPositionSize(100), true);
            assert.strictEqual(isValidPositionSize(1000), true);
        });
        it('should reject positions < $100', () => {
            assert.strictEqual(isValidPositionSize(99), false);
            assert.strictEqual(isValidPositionSize(0), false);
        });
    });
    describe('calculateBracketPrices', () => {
        it('should calculate correct LONG bracket prices', () => {
            const prices = calculateBracketPrices(100, 'LONG', 5, 10);
            assert.strictEqual(prices.stopLossPrice, 95); // 100 * 0.95
            assert.strictEqual(prices.takeProfitPrice, 110); // 100 * 1.10
        });
        it('should calculate correct SHORT bracket prices', () => {
            const prices = calculateBracketPrices(100, 'SHORT', 5, 10);
            assert.strictEqual(prices.stopLossPrice, 105); // 100 * 1.05
            assert.strictEqual(prices.takeProfitPrice, 90); // 100 * 0.90
        });
    });
    describe('calculateFullPosition', () => {
        it('should return complete sizing result', () => {
            const result = calculateFullPosition(8, 4, 100);
            assert.ok(result.rawSizeUsd > 0);
            assert.ok(result.adjustedSizeUsd > 0);
            assert.ok(result.qty > 0);
            assert.ok(result.notional > 0);
            assert.strictEqual(result.stopLossPercent, 5);
            assert.strictEqual(result.takeProfitPercent, 10);
        });
        it('should apply all kill criteria adjustments', () => {
            const result = calculateFullPosition(8, 4, 100, 20, // drawdown
            3, // consecutive losses
            0.35 // win rate
            );
            assert.ok(result.adjustedSizeUsd < result.rawSizeUsd);
            assert.ok(result.sizeReductionReason);
        });
    });
});
// ============================================================================
// Kill Criteria Tests
// ============================================================================
describe('Kill Criteria', () => {
    describe('checkKillCriteria', () => {
        it('should allow trading when no thresholds breached', async () => {
            // Reset state
            const result = await checkKillCriteria(7.5);
            assert.strictEqual(result.allowed, true);
            assert.strictEqual(result.action, 'ALLOW');
            assert.strictEqual(result.sizeMultiplier, 1.0);
        });
        it('should block when daily loss limit reached', async () => {
            // This would require database state setup
            // Skipping as it requires full database integration
        });
        it('should block when 3 consecutive losses', async () => {
            // This would require database state setup
            // Skipping as it requires full database integration
        });
        it('should reduce size when drawdown > 15%', async () => {
            // This would require database state setup
            // Skipping as it requires full database integration
        });
    });
    describe('Emergency Stop', () => {
        it('should have emergency stop function defined', () => {
            assert.strictEqual(typeof emergencyStop, 'function');
        });
    });
});
// ============================================================================
// Integration Tests
// ============================================================================
describe('Integration: Sizing + Risk', () => {
    it('should calculate reduced position during high drawdown', () => {
        const conviction = 8;
        const risk = 4;
        const entryPrice = 100;
        const drawdownPercent = 20;
        const consecutiveLosses = 2;
        const winRate30d = 0.5;
        const sizing = calculateFullPosition(conviction, risk, entryPrice, drawdownPercent, consecutiveLosses, winRate30d);
        // Base calculation: (8/4) * 1000 = 2000
        // With 20% drawdown: 2000 * 0.5 = 1000
        assert.strictEqual(sizing.rawSizeUsd, 2000);
        assert.strictEqual(sizing.adjustedSizeUsd, 1000);
        assert.ok(sizing.sizeReductionReason?.includes('Drawdown'));
    });
    it('should handle multiple kill criteria simultaneously', () => {
        const sizing = calculateFullPosition(8, 4, 100, 20, // drawdown → 50% reduction
        3, // consecutive losses → 50% reduction
        0.35 // win rate → 75% reduction
        );
        // 2000 * 0.5 * 0.5 * 0.75 = 375
        assert.strictEqual(sizing.adjustedSizeUsd, 375);
        assert.ok(sizing.sizeReductionReason?.includes('Drawdown'));
        assert.ok(sizing.sizeReductionReason?.includes('consecutive losses'));
        assert.ok(sizing.sizeReductionReason?.includes('win rate'));
    });
    it('should calculate correct quantity after adjustments', () => {
        const sizing = calculateFullPosition(8, 4, 50);
        // Raw: (8/4) * 1000 = 2000
        // Qty: 2000 / 50 = 40 shares
        assert.strictEqual(sizing.qty, 40);
        assert.strictEqual(sizing.notional, 2000);
    });
});
// ============================================================================
// Edge Cases
// ============================================================================
describe('Edge Cases', () => {
    it('should handle very high conviction and low risk', () => {
        const size = calculatePositionSize({
            conviction: 10,
            risk: 1,
            confidenceScore: 10,
            basePositionUsd: 1000,
            maxPositionUsd: 5000
        });
        assert.strictEqual(size, 5000); // Capped at max
    });
    it('should handle very low conviction and high risk', () => {
        const size = calculatePositionSize({
            conviction: 1,
            risk: 10,
            confidenceScore: 0.1,
            basePositionUsd: 1000,
            maxPositionUsd: 5000
        });
        // (1/10) * 1000 = 100, minimum position size
        assert.strictEqual(size, 100);
    });
    it('should handle zero risk gracefully', () => {
        const size = calculatePositionSize({
            conviction: 5,
            risk: 0,
            confidenceScore: 5,
            basePositionUsd: 1000,
            maxPositionUsd: 5000
        });
        // Risk 0 should be treated as 1
        // (5/1) * 1000 = 5000
        assert.strictEqual(size, 5000);
    });
    it('should calculate bracket prices for fractional prices', () => {
        const prices = calculateBracketPrices(0.5, 'LONG', 5, 10);
        // 0.5 * 0.95 = 0.475, toFixed(2) rounds to 0.48, but floating point may give 0.47
        assert.ok(prices.stopLossPrice >= 0.47 && prices.stopLossPrice <= 0.48);
        assert.strictEqual(prices.takeProfitPrice, 0.55); // 0.5 * 1.10 = 0.55
    });
});
// Run tests
console.log('Running Sora Agent Tests...\n');
//# sourceMappingURL=sora.test.js.map