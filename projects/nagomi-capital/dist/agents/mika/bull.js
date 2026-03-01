import { getGrokClient } from './client.js';
import { PROMPTS, fillPromptTemplate } from '../../config/prompts.js';
import { logger } from '../../utils/logger.js';
export class BullMika {
    async analyze(signal, marketData) {
        logger.info('BullMika analyzing signal', { asset: signal.asset });
        const promptContext = {
            timestamp: new Date().toISOString(),
            basePositionSize: 1000, // Placeholder, not used by Bull
            maxPositionSize: 5000,
            minConfidence: 5,
            maxRisk: 8
        };
        const systemPrompt = fillPromptTemplate(PROMPTS.BULL, promptContext);
        const userContent = JSON.stringify({
            signal: {
                raw_text: signal.rawText,
                source: signal.sourceHandle,
                asset: signal.asset,
                asset_class: signal.assetClass,
                extracted_price: signal.price,
                timestamp: signal.timestamp
            },
            market_context: marketData ? {
                current_price: marketData.price,
                volume: marketData.volume,
                change_percent: marketData.changePercent
            } : 'Market data unavailable - rely on signal and technical knowledge'
        }, null, 2);
        try {
            const grokClient = getGrokClient();
            const analysis = await grokClient.generateJSON(systemPrompt, userContent);
            // Validation fallback
            if (!analysis.thesis || !analysis.conviction) {
                throw new Error('Invalid BullMika response structure');
            }
            return analysis;
        }
        catch (error) {
            logger.error('BullMika analysis failed', { error });
            throw error;
        }
    }
}
//# sourceMappingURL=bull.js.map