export interface DocumentChunk {
  id: string;
  filePath: string;
  content: string;
  embedding: number[];
  metadata: {
    lineStart: number;
    lineEnd: number;
    lastModified: number;
    fileType: string;
  };
}

export interface SearchResult {
  chunk: DocumentChunk;
  score: number;
}

export interface IndexConfig {
  watchDir: string;
  ignorePatterns: string[];
  autoIndexIntervalHours: number;
  ollamaUrl: string;
  ollamaModel: string;
  embeddingModel: string;
  chunkSize: number;
  chunkOverlap: number;
}

export interface ServerConfig {
  port: number;
  transport: 'stdio' | 'streamable-http';
}
