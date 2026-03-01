export interface CostEntry {
    id?: string;
    provider: 'openrouter' | 'anthropic' | 'elevenlabs' | 'openai';
    model?: string;
    endpoint?: string;
    costUsd: number;
    tokensInput?: number;
    tokensOutput?: number;
    tokensTotal?: number;
    characters?: number;
    durationMs?: number;
    timestamp: Date;
    metadata?: Record<string, any>;
}
export interface UsageReport {
    provider: string;
    entries: CostEntry[];
    totalCost: number;
    periodStart: Date;
    periodEnd: Date;
}
export interface NotionConfig {
    apiKey: string;
    databaseId?: string;
}
export interface CollectorConfig {
    apiKey: string;
    baseUrl?: string;
}
//# sourceMappingURL=types.d.ts.map