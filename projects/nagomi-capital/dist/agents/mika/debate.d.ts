import { ParsedSignal } from '../../ingestion/x/parsers.js';
import { MarketData } from '../../ingestion/market/alpaca.js';
import { TradeDecision } from './judge.js';
declare const generateId: () => string;
export { generateId };
export declare class DebateManager {
    private bull;
    private bear;
    private flow;
    private judge;
    private db;
    constructor();
    startDebate(signal: ParsedSignal, marketData?: MarketData, onDecision?: (decision: TradeDecision) => Promise<void>): Promise<void>;
}
//# sourceMappingURL=debate.d.ts.map