import { BullMika } from './bull.js';
import { BearMika } from './bear.js';
import { FlowMika } from './flow.js';
import { JudgeMika } from './judge.js';
import { logger, logDebate } from '../../utils/logger.js';
import { getDatabase } from '../../memory/database.js';
import { alertNewSignal, alertTradeDecision } from '../../utils/telegram.js';
// UUID generation helper
const generateId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
// Export for use in other modules
export { generateId }; // Need to install uuid if not present, but I'll use a simple random string for now to avoid dep issues if possible, or just add it.
// Simple UUID generator to avoid dependency if not installed
function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
export class DebateManager {
    bull;
    bear;
    flow;
    judge;
    db = getDatabase();
    constructor() {
        this.bull = new BullMika();
        this.bear = new BearMika();
        this.flow = new FlowMika();
        this.judge = new JudgeMika();
    }
    async startDebate(signal, marketData, onDecision) {
        const debateId = uuid();
        const startTime = new Date();
        logger.info(`Starting debate for ${signal.asset} (${signal.direction})`, { debateId });
        await alertNewSignal(signal.asset, signal.direction, signal.confidence, signal.sourceHandle);
        try {
            // Phase 1: Thesis (0:00 - 1:30)
            // Run Bull and Flow in parallel first to establish baseline
            logger.info('Phase 1: Thesis Generation (90s window)');
            const thesisPromise = Promise.all([
                this.bull.analyze(signal, marketData),
                this.flow.analyze(signal, marketData)
            ]);
            // Wait for 90 seconds for thesis generation and market data accumulation
            await new Promise(resolve => setTimeout(resolve, 90000));
            const [bullThesis, flowContext] = await thesisPromise;
            // Phase 2: Cross-Examination (1:30 - 3:00)
            // Bear attacks the Bull thesis specifically
            logger.info('Phase 2: Cross-Examination (90s window)');
            const bearPromise = this.bear.analyze(signal, bullThesis, marketData);
            // Wait for another 90 seconds for cross-examination
            await new Promise(resolve => setTimeout(resolve, 90000));
            const bearThesis = await bearPromise;
            // Phase 3: Judgment (3:00)
            logger.info('Phase 3: Final Judgment');
            const decision = await this.judge.evaluate(signal, bullThesis, bearThesis, flowContext);
            const endTime = new Date();
            const durationMs = endTime.getTime() - startTime.getTime();
            // Log results
            logDebate(signal.asset, decision.bull_score, decision.bear_score, decision.flow_score, decision.direction, durationMs);
            // Persist to DB
            this.db.saveDebate({
                id: debateId,
                signalId: null, // We'd link this if we had the signal ID from DB
                asset: signal.asset,
                startTime,
                endTime,
                bullScore: decision.bull_score,
                bearScore: decision.bear_score,
                flowScore: decision.flow_score,
                decision: decision.direction,
                confidenceScore: decision.confidence_score,
                conviction: decision.conviction,
                risk: decision.risk,
                positionSize: decision.position_size_usd,
                thesis: decision.thesis,
                bullArgument: bullThesis,
                bearArgument: bearThesis,
                flowContext: flowContext
            });
            // Alert
            await alertTradeDecision(decision.asset, decision.direction, decision.position_size_usd, decision.confidence_score, decision.conviction, decision.risk);
            // If valid trade, forward to Execution (Sora)
            if (decision.direction !== 'NO_TRADE') {
                logger.info('Trade approved, forwarding to Sora...', {
                    asset: decision.asset,
                    size: decision.position_size_usd
                });
                // Call the decision handler if provided
                if (onDecision) {
                    try {
                        await onDecision(decision);
                    }
                    catch (error) {
                        logger.error('Decision handler failed', {
                            debateId,
                            error: error instanceof Error ? error.message : 'Unknown error'
                        });
                    }
                }
            }
        }
        catch (error) {
            logger.error('Debate failed', { debateId, error });
        }
    }
}
//# sourceMappingURL=debate.js.map