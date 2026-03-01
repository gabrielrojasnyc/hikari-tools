import { UsageReport, CollectorConfig } from '../types';
export declare class AnthropicCollector {
    private apiKey;
    private baseUrl;
    constructor(config: CollectorConfig);
    collectCosts(startDate?: Date, endDate?: Date): Promise<UsageReport>;
    calculateCost(model: string, inputTokens: number, outputTokens: number): number;
    testConnection(): Promise<boolean>;
}
//# sourceMappingURL=anthropic.d.ts.map