import { ParsedSignal } from '../../ingestion/x/parsers.js';
import { MarketData } from '../../ingestion/market/alpaca.js';
import { BullThesis } from './bull.js';
export interface BearThesis {
    asset: string;
    asset_class: string;
    direction: 'SHORT';
    entry_price: number;
    target_price: number;
    stop_loss: number;
    conviction: number;
    thesis: string;
    key_levels: string[];
    invalidators: string[];
    timeframe: string;
    attack_on_bull?: string;
    risks: string[];
}
export declare class BearMika {
    analyze(signal: ParsedSignal, bullThesis?: BullThesis, marketData?: MarketData): Promise<BearThesis>;
}
//# sourceMappingURL=bear.d.ts.map