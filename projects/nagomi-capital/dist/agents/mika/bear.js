import { getGrokClient } from './client.js';
import { PROMPTS, fillPromptTemplate } from '../../config/prompts.js';
import { logger } from '../../utils/logger.js';
export class BearMika {
    async analyze(signal, bullThesis, marketData) {
        logger.info('BearMika analyzing signal', { asset: signal.asset });
        const promptContext = {
            timestamp: new Date().toISOString(),
            basePositionSize: 1000,
            maxPositionSize: 5000,
            minConfidence: 5,
            maxRisk: 8
        };
        const systemPrompt = fillPromptTemplate(PROMPTS.BEAR, promptContext);
        const userContent = JSON.stringify({
            signal: {
                raw_text: signal.rawText,
                source: signal.sourceHandle,
                asset: signal.asset,
                asset_class: signal.assetClass,
                extracted_price: signal.price,
                timestamp: signal.timestamp
            },
            bull_thesis: bullThesis ? {
                thesis: bullThesis.thesis,
                conviction: bullThesis.conviction,
                target: bullThesis.target_price,
                factors: bullThesis.confidence_factors
            } : 'No bull thesis provided - analyze for independent short setup',
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
                throw new Error('Invalid BearMika response structure');
            }
            return analysis;
        }
        catch (error) {
            logger.error('BearMika analysis failed', { error });
            throw error;
        }
    }
}
//# sourceMappingURL=bear.js.map