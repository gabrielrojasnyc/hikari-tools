import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import { minimatch } from 'minimatch';
import { IndexConfig, DocumentChunk } from './types.js';

export class LocalIndexer {
  private config: IndexConfig;
  private chunks: Map<string, DocumentChunk> = new Map();
  private indexing: boolean = false;

  constructor(config: IndexConfig) {
    this.config = config;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await fetch(`${this.config.ollamaUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.embeddingModel,
          prompt: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  chunkText(content: string, filePath: string): Omit<DocumentChunk, 'id' | 'embedding'>[] {
    const lines = content.split('\n');
    const chunks: Omit<DocumentChunk, 'id' | 'embedding'>[] = [];
    const { chunkSize, chunkOverlap } = this.config;

    let currentChunk: string[] = [];
    let lineStart = 0;

    for (let i = 0; i < lines.length; i++) {
      currentChunk.push(lines[i]);

      if (currentChunk.join('\n').length >= chunkSize || i === lines.length - 1) {
        chunks.push({
          filePath,
          content: currentChunk.join('\n'),
          metadata: {
            lineStart: lineStart + 1,
            lineEnd: i + 1,
            lastModified: Date.now(),
            fileType: path.extname(filePath).slice(1) || 'txt',
          },
        });

        // Keep overlap for context
        const overlapLines = Math.floor(chunkOverlap / 50); // Approximate lines
        currentChunk = currentChunk.slice(-overlapLines);
        lineStart = i - overlapLines + 1;
      }
    }

    return chunks;
  }

  shouldIgnore(filePath: string): boolean {
    const relativePath = path.relative(this.config.watchDir, filePath);
    return this.config.ignorePatterns.some(pattern => minimatch(relativePath, pattern));
  }

  async indexFile(filePath: string): Promise<void> {
    try {
      if (this.shouldIgnore(filePath)) {
        return;
      }

      const content = await fs.readFile(filePath, 'utf-8');
      const stats = await fs.stat(filePath);

      // Remove old chunks for this file
      for (const [id, chunk] of this.chunks) {
        if (chunk.filePath === filePath) {
          this.chunks.delete(id);
        }
      }

      // Create new chunks
      const rawChunks = this.chunkText(content, filePath);

      for (let i = 0; i < rawChunks.length; i++) {
        const chunk = rawChunks[i];
        const embedding = await this.generateEmbedding(chunk.content);
        const id = `${filePath}#${i}`;

        this.chunks.set(id, {
          ...chunk,
          id,
          embedding,
        });
      }

      console.error(`Indexed: ${filePath} (${rawChunks.length} chunks)`);
    } catch (error) {
      console.error(`Error indexing ${filePath}:`, error);
    }
  }

  async indexAll(): Promise<void> {
    if (this.indexing) {
      console.error('Indexing already in progress...');
      return;
    }

    this.indexing = true;
    console.error(`Starting full index of ${this.config.watchDir}...`);

    try {
      // Get all files
      const files = await glob('**/*', {
        cwd: this.config.watchDir,
        absolute: true,
        nodir: true,
        dot: true,
      });

      // Filter and index
      const textExtensions = ['.md', '.txt', '.js', '.ts', '.jsx', '.tsx', '.py', '.rb', '.go', '.rs', '.java', '.c', '.cpp', '.h', '.hpp', '.swift', '.kt', '.scala', '.php', '.json', '.yaml', '.yml', '.toml', '.sh', '.bash', '.zsh', '.fish'];

      for (const file of files) {
        if (this.shouldIgnore(file)) continue;
        
        const ext = path.extname(file).toLowerCase();
        if (!textExtensions.includes(ext)) continue;

        await this.indexFile(file);
      }

      console.error(`Indexing complete. Total chunks: ${this.chunks.size}`);
    } finally {
      this.indexing = false;
    }
  }

  getChunks(): DocumentChunk[] {
    return Array.from(this.chunks.values());
  }

  getStats(): { totalChunks: number; totalFiles: number } {
    const files = new Set<string>();
    for (const chunk of this.chunks.values()) {
      files.add(chunk.filePath);
    }
    return {
      totalChunks: this.chunks.size,
      totalFiles: files.size,
    };
  }

  async clearIndex(): Promise<void> {
    this.chunks.clear();
    console.error('Index cleared');
  }
}
