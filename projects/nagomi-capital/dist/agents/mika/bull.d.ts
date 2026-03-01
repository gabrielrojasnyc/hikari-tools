import { ParsedSignal } from '../../ingestion/x/parsers.js';
import { MarketData } from '../../ingestion/market/alpaca.js';
export interface BullThesis {
    asset: string;
    asset_class: string;
    direction: 'LONG';
    entry_price: number;
    target_price: number;
    stop_loss: number;
    conviction: number;
    thesis: string;
    key_levels: string[];
    invalidators: string[];
    timeframe: string;
    confidence_factors: string[];
    risks: string[];
}
export declare class BullMika {
    analyze(signal: ParsedSignal, marketData?: MarketData): Promise<BullThesis>;
}
//# sourceMappingURL=bull.d.ts.map