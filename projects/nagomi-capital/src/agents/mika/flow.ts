import { getGrokClient } from './client.js';
import { PROMPTS, fillPromptTemplate } from '../../config/prompts.js';
import { ParsedSignal } from '../../ingestion/x/parsers.js';
import { MarketData } from '../../ingestion/market/alpaca.js';
import { logger } from '../../utils/logger.js';

export interface FlowContext {
  asset: string;
  asset_class: string;
  flow_summary: string;
  options_context?: {
    unusual_call_volume: boolean;
    unusual_put_volume: boolean;
    iv_skew: string;
    max_pain: number;
    gamma_exposure: string;
  };
  on_chain_context?: {
    exchange_inflows: string;
    whale_accumulation: boolean;
    funding_rate: number;
    liquidation_risk: string;
  };
  market_regime: string;
  contrarian_signals: string[];
  supports_bull: string[];
  supports_bear: string[];
  key_levels_from_flow: string[];
}

export class FlowMika {
  async analyze(signal: ParsedSignal, marketData?: MarketData): Promise<FlowContext> {
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
      const analysis = await grokClient.generateJSON<FlowContext>(systemPrompt, userContent);
      
      // Validation fallback
      if (!analysis.flow_summary || !analysis.market_regime) {
        throw new Error('Invalid FlowMika response structure');
      }

      return analysis;
    } catch (error) {
      logger.error('FlowMika analysis failed', { error });
      throw error;
    }
  }
}
