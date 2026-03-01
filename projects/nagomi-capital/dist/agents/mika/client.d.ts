export declare class GrokClient {
    private apiKey;
    private baseUrl;
    private model;
    constructor();
    generate(systemPrompt: string, userContent: string, temperature?: number): Promise<string>;
    generateJSON<T>(systemPrompt: string, userContent: string): Promise<T>;
}
export declare function getGrokClient(): GrokClient;
//# sourceMappingURL=client.d.ts.map