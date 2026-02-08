import { DocumentChunk, SearchResult, IndexConfig } from './types.js';

export class VectorSearch {
  private config: IndexConfig;

  constructor(config: IndexConfig) {
    this.config = config;
  }

  async generateQueryEmbedding(query: string): Promise<number[]> {
    try {
      const response = await fetch(`${this.config.ollamaUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.embeddingModel,
          prompt: query,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.embedding;
    } catch (error) {
      console.error('Error generating query embedding:', error);
      throw error;
    }
  }

  cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async search(
    query: string,
    chunks: DocumentChunk[],
    topK: number = 5
  ): Promise<SearchResult[]> {
    const queryEmbedding = await this.generateQueryEmbedding(query);

    const results: SearchResult[] = chunks.map(chunk => ({
      chunk,
      score: this.cosineSimilarity(queryEmbedding, chunk.embedding),
    }));

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, topK);
  }

  async searchWithContext(
    query: string,
    chunks: DocumentChunk[],
    topK: number = 5
  ): Promise<{ results: SearchResult[]; context: string }> {
    const results = await this.search(query, chunks, topK);
    
    const context = results
      .map(r => `File: ${r.chunk.filePath}\nLines ${r.chunk.metadata.lineStart}-${r.chunk.metadata.lineEnd}:\n${r.chunk.content}`)
      .join('\n\n---\n\n');

    return { results, context };
  }
}
