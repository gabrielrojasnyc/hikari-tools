import { DocumentChunk, SearchResult, IndexConfig } from './types.js';
export declare class VectorSearch {
    private config;
    constructor(config: IndexConfig);
    generateQueryEmbedding(query: string): Promise<number[]>;
    cosineSimilarity(a: number[], b: number[]): number;
    search(query: string, chunks: DocumentChunk[], topK?: number): Promise<SearchResult[]>;
    searchWithContext(query: string, chunks: DocumentChunk[], topK?: number): Promise<{
        results: SearchResult[];
        context: string;
    }>;
}
//# sourceMappingURL=search.d.ts.map