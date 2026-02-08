import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
// Schema definitions
const SearchInputSchema = z.object({
    query: z.string(),
    topK: z.number().optional(),
});
const ReadDocInputSchema = z.object({
    filePath: z.string(),
});
const AskInputSchema = z.object({
    question: z.string(),
});
const EmptyInputSchema = z.object({});
export function createMCPServer(indexer, search, config) {
    const server = new McpServer({
        name: 'docfork-local',
        version: '1.0.0',
        websiteUrl: 'https://github.com/docfork/docfork',
    });
    // Tool: Search local documents
    server.registerTool('local_search_docs', {
        title: 'Search Local Documentation',
        description: 'Search through indexed local documents in the workspace. Returns relevant code snippets and documentation chunks with file paths and line numbers.',
        inputSchema: SearchInputSchema,
    }, async (args) => {
        try {
            const { query, topK = 5 } = SearchInputSchema.parse(args);
            const chunks = indexer.getChunks();
            if (chunks.length === 0) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: 'No documents indexed yet. Run the index command first.',
                        },
                    ],
                };
            }
            const results = await search.search(query, chunks, topK);
            if (results.length === 0) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: 'No relevant results found.',
                        },
                    ],
                };
            }
            const formatted = results
                .map((r, i) => `[${i + 1}] Score: ${(r.score * 100).toFixed(1)}%\nFile: ${r.chunk.filePath}\nLines: ${r.chunk.metadata.lineStart}-${r.chunk.metadata.lineEnd}\n\n${r.chunk.content.slice(0, 500)}${r.chunk.content.length > 500 ? '...' : ''}`)
                .join('\n\n---\n\n');
            return {
                content: [
                    {
                        type: 'text',
                        text: `Found ${results.length} relevant results:\n\n${formatted}`,
                    },
                ],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error searching: ${error.message}`,
                    },
                ],
            };
        }
    });
    // Tool: Read full document
    server.registerTool('local_read_doc', {
        title: 'Read Local Document',
        description: 'Read the full content of a specific file from the workspace.',
        inputSchema: ReadDocInputSchema,
    }, async (args) => {
        try {
            const { filePath } = ReadDocInputSchema.parse(args);
            const fs = await import('fs/promises');
            const content = await fs.readFile(filePath, 'utf-8');
            return {
                content: [
                    {
                        type: 'text',
                        text: `File: ${filePath}\n\n${content}`,
                    },
                ],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error reading file: ${error.message}`,
                    },
                ],
            };
        }
    });
    // Tool: Ask question with RAG
    server.registerTool('local_ask', {
        title: 'Ask About Workspace',
        description: 'Ask a question about the workspace and get an answer using RAG (Retrieval-Augmented Generation) with Ollama.',
        inputSchema: AskInputSchema,
    }, async (args) => {
        try {
            const { question } = AskInputSchema.parse(args);
            const chunks = indexer.getChunks();
            if (chunks.length === 0) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: 'No documents indexed yet. Run the index command first.',
                        },
                    ],
                };
            }
            const { context } = await search.searchWithContext(question, chunks, 5);
            // Query Ollama with context
            const response = await fetch(`${config.ollamaUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: config.ollamaModel,
                    prompt: `Based on the following context from the workspace, answer the question. Be specific and cite file paths and line numbers where relevant.\n\nContext:\n${context}\n\nQuestion: ${question}\n\nAnswer:`,
                    stream: false,
                }),
            });
            if (!response.ok) {
                throw new Error(`Ollama error: ${response.status}`);
            }
            const data = await response.json();
            return {
                content: [
                    {
                        type: 'text',
                        text: data.response,
                    },
                ],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error: ${error.message}`,
                    },
                ],
            };
        }
    });
    // Tool: Trigger reindex
    server.registerTool('local_reindex', {
        title: 'Reindex Workspace',
        description: 'Manually trigger a full reindex of the workspace directory.',
        inputSchema: EmptyInputSchema,
    }, async () => {
        try {
            // Run indexing in background
            indexer.indexAll().catch(console.error);
            return {
                content: [
                    {
                        type: 'text',
                        text: 'Reindexing started. This may take a few minutes depending on workspace size.',
                    },
                ],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error starting reindex: ${error.message}`,
                    },
                ],
            };
        }
    });
    // Tool: Get index stats
    server.registerTool('local_index_stats', {
        title: 'Get Index Statistics',
        description: 'Get statistics about the current index (number of chunks, files indexed).',
        inputSchema: EmptyInputSchema,
    }, async () => {
        const stats = indexer.getStats();
        return {
            content: [
                {
                    type: 'text',
                    text: `Index Statistics:\n- Total chunks: ${stats.totalChunks}\n- Total files: ${stats.totalFiles}\n- Watch directory: ${config.watchDir}`,
                },
            ],
        };
    });
    server.server.onerror = (error) => {
        console.error('MCP Server error:', error);
    };
    return server;
}
//# sourceMappingURL=mcp-server.js.map