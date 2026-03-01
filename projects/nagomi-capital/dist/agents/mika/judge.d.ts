import { ParsedSignal } from '../../ingestion/x/parsers.js';
import { BullThesis } from './bull.js';
import { BearThesis } from './bear.js';
import { FlowContext } from './flow.js';
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
export declare class JudgeMika {
    evaluate(signal: ParsedSignal, bull: BullThesis, bear: BearThesis, flow: FlowContext): Promise<TradeDecision>;
}
//# sourceMappingURL=judge.d.ts.map