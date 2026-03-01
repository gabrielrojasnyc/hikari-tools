export interface CostEntry {
    timestamp: string;
    provider: string;
    costUsd: number;
    tokensUsed?: number;
    charactersUsed?: number;
    tier?: string;
    notes?: string;
}
export declare class NotionClient {
    private client;
    private databaseId;
    constructor(apiKey: string);
    findOrCreateDatabase(): Promise<string | null>;
    private createDatabase;
    addCostEntry(entry: CostEntry): Promise<boolean>;
}
//# sourceMappingURL=client.d.ts.map