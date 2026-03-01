import { ParsedSignal } from '../../ingestion/x/parsers.js';
import { MarketData } from '../../ingestion/market/alpaca.js';
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
export declare class FlowMika {
    analyze(signal: ParsedSignal, marketData?: MarketData): Promise<FlowContext>;
}
//# sourceMappingURL=flow.d.ts.map