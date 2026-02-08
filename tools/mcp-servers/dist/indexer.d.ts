import { IndexConfig, DocumentChunk } from './types.js';
export declare class LocalIndexer {
    private config;
    private chunks;
    private indexing;
    constructor(config: IndexConfig);
    generateEmbedding(text: string): Promise<number[]>;
    chunkText(content: string, filePath: string): Omit<DocumentChunk, 'id' | 'embedding'>[];
    shouldIgnore(filePath: string): boolean;
    indexFile(filePath: string): Promise<void>;
    indexAll(): Promise<void>;
    getChunks(): DocumentChunk[];
    getStats(): {
        totalChunks: number;
        totalFiles: number;
    };
    clearIndex(): Promise<void>;
}
//# sourceMappingURL=indexer.d.ts.map