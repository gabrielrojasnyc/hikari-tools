import { getGrokClient } from './client.js';
import { PROMPTS, fillPromptTemplate, config } from '../../config/index.js';
import { ParsedSignal } from '../../ingestion/x/parsers.js';
import { BullThesis } from './bull.js';
import { BearThesis } from './bear.js';
import { FlowContext } from './flow.js';
import { logger } from '../../utils/logger.js';

export interface TradeDecision {
  asset: string;
  asset_class: 'equity' | 'options' | 'crypto';
  direction: 'LONG' | 'SHORT' | 'NO_TRADE';
  conviction: number;
  risk: number;
  confidence_score: number;
  position_size_usd: number;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  thesis: string;
  invalidators: string[];
  timeframe: string;
  bull_score: number;
  bear_score: number;
  flow_score: number;
  rejection_reason?: string;
  execution_notes?: string;
}

export class JudgeMika {
  async evaluate(
    signal: ParsedSignal,
    bull: BullThesis,
    bear: BearThesis,
    flow: FlowContext
  ): Promise<TradeDecision> {
    logger.info('JudgeMika evaluating debate', { asset: signal.asset });

    const promptContext = {
      timestamp: new Date().toISOString(),
      basePositionSize: config.basePositionSizeUsd,
      maxPositionSize: config.maxPositionSizeUsd,
      minConfidence: config.minConfidenceScore,
      maxRisk: config.maxRiskScore
    };

    const systemPrompt = fillPromptTemplate(PROMPTS.JUDGE, promptContext);
    
    const userContent = JSON.stringify({
      signal: {
        raw: signal.rawText,
        source: signal.sourceHandle,
        asset: signal.asset
      },
      debate_transcript: {
        BULL_ARGUMENT: bull,
        BEAR_ARGUMENT: bear,
        FLOW_CONTEXT: flow
      }
    }, null, 2);

    try {
      const grokClient = getGrokClient();
      const decision = await grokClient.generateJSON<TradeDecision>(systemPrompt, userContent);
      
      // Safety checks
      if (decision.confidence_score > 10) decision.confidence_score = 10;
      if (decision.position_size_usd > config.maxPositionSizeUsd) {
        decision.position_size_usd = config.maxPositionSizeUsd;
      }
      
      // Ensure risk isn't 0 to avoid division by zero
      if (decision.risk < 1) decision.risk = 1;

      // Recalculate confidence score to be sure
      const calculatedScore = decision.conviction / decision.risk;
      if (Math.abs(calculatedScore - decision.confidence_score) > 0.5) {
        logger.warn('Judge confidence score mismatch, correcting', {
          original: decision.confidence_score,
          calculated: calculatedScore
        });
        decision.confidence_score = parseFloat(calculatedScore.toFixed(2));
      }

      return decision;
    } catch (error) {
      logger.error('JudgeMika evaluation failed', { error });
      throw error;
    }
  }
}
