export interface OpenRouterUsage {
    total_cost: number;
    total_tokens: number;
    requests: number;
}
export declare function fetchOpenRouterUsage(apiKey: string): Promise<OpenRouterUsage | null>;
//# sourceMappingURL=openrouter.d.ts.map