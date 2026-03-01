import { getGrokClient } from './client.js';
import { PROMPTS, fillPromptTemplate } from '../../config/prompts.js';
import { logger } from '../../utils/logger.js';
export class FlowMika {
    async analyze(signal, marketData) {
        logger.info('FlowMika analyzing signal', { asset: signal.asset });
        const promptContext = {
            timestamp: new Date().toISOString(),
            basePositionSize: 1000,
            maxPositionSize: 5000,
            minConfidence: 5,
            maxRisk: 8
        };
        const systemPrompt = fillPromptTemplate(PROMPTS.FLOW, promptContext);
        // In a real system, we would fetch options flow/on-chain data here
        // For now, we simulate by asking the LLM to infer from signal + market knowledge
        const userContent = JSON.stringify({
            signal: {
                raw_text: signal.rawText,
                source: signal.sourceHandle,
                asset: signal.asset,
                asset_class: signal.assetClass,
                extracted_price: signal.price,
                timestamp: signal.timestamp,
                type: signal.signalType
            },
            market_context: marketData ? {
                current_price: marketData.price,
                volume: marketData.volume,
                change_percent: marketData.changePercent
            } : 'Market data unavailable - infer from signal and market structure knowledge'
        }, null, 2);
        try {
            const grokClient = getGrokClient();
            const analysis = await grokClient.generateJSON(systemPrompt, userContent);
            // Validation fallback
            if (!analysis.flow_summary || !analysis.market_regime) {
                throw new Error('Invalid FlowMika response structure');
            }
            return analysis;
        }
        catch (error) {
            logger.error('FlowMika analysis failed', { error });
            throw error;
        }
    }
}
//# sourceMappingURL=flow.js.map