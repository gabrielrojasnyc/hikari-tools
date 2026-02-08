export const DEFAULT_INDEX_CONFIG = {
    watchDir: '/Users/nagomi/.openclaw/workspace/',
    ignorePatterns: ['node_modules/**', '.git/**', '*.log', 'dist/**', 'build/**', '.DS_Store'],
    autoIndexIntervalHours: 6,
    ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
    ollamaModel: process.env.OLLAMA_MODEL || 'qwen2.5-coder:32b',
    embeddingModel: process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text',
    chunkSize: 1000,
    chunkOverlap: 200,
};
export function getServerConfig() {
    return {
        port: parseInt(process.env.PORT || '3000', 10),
        transport: (process.env.MCP_TRANSPORT || 'stdio'),
    };
}
export function getIndexConfig() {
    return {
        ...DEFAULT_INDEX_CONFIG,
        watchDir: process.env.WATCH_DIR || DEFAULT_INDEX_CONFIG.watchDir,
        ignorePatterns: process.env.IGNORE_PATTERNS?.split(',') || DEFAULT_INDEX_CONFIG.ignorePatterns,
        autoIndexIntervalHours: parseInt(process.env.AUTO_INDEX_HOURS || String(DEFAULT_INDEX_CONFIG.autoIndexIntervalHours), 10),
        ollamaUrl: process.env.OLLAMA_URL || DEFAULT_INDEX_CONFIG.ollamaUrl,
        ollamaModel: process.env.OLLAMA_MODEL || DEFAULT_INDEX_CONFIG.ollamaModel,
        embeddingModel: process.env.OLLAMA_EMBEDDING_MODEL || DEFAULT_INDEX_CONFIG.embeddingModel,
    };
}
//# sourceMappingURL=config.js.map