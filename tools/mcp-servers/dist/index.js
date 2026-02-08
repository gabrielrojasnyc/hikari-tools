#!/usr/bin/env node
/**
 * Docfork Local MCP Server
 *
 * Local document indexer with MCP interface using Ollama for embeddings.
 */
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from 'http';
import { LocalIndexer } from './indexer.js';
import { VectorSearch } from './search.js';
import { createMCPServer } from './mcp-server.js';
import { getServerConfig, getIndexConfig } from './config.js';
import cron from 'node-cron';
async function main() {
    const serverConfig = getServerConfig();
    const indexConfig = getIndexConfig();
    console.error('Docfork Local MCP Server');
    console.error('========================');
    console.error(`Watch directory: ${indexConfig.watchDir}`);
    console.error(`Ollama URL: ${indexConfig.ollamaUrl}`);
    console.error(`Embedding model: ${indexConfig.embeddingModel}`);
    console.error(`LLM model: ${indexConfig.ollamaModel}`);
    // Initialize indexer and search
    const indexer = new LocalIndexer(indexConfig);
    const search = new VectorSearch(indexConfig);
    // Create MCP server
    const mcpServer = createMCPServer(indexer, search, indexConfig);
    // Initial index
    console.error('\nStarting initial index...');
    await indexer.indexAll();
    // Set up auto-reindex cron job
    const cronExpression = `0 */${indexConfig.autoIndexIntervalHours} * * *`;
    console.error(`\nAuto-reindex scheduled: every ${indexConfig.autoIndexIntervalHours} hours`);
    cron.schedule(cronExpression, async () => {
        console.error(`[${new Date().toISOString()}] Running scheduled reindex...`);
        await indexer.indexAll();
    });
    // Start transport
    if (serverConfig.transport === 'stdio') {
        console.error('\nStarting stdio transport...');
        const transport = new StdioServerTransport();
        await mcpServer.connect(transport);
        console.error('Docfork Local MCP Server running on stdio');
    }
    else {
        // HTTP transport
        console.error(`\nStarting HTTP transport on port ${serverConfig.port}...`);
        const httpServer = createServer(async (req, res) => {
            // CORS headers
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Accept-Encoding, MCP-Protocol-Version, Authorization');
            if (req.method === 'OPTIONS') {
                res.writeHead(200);
                res.end();
                return;
            }
            const url = req.url || '/';
            if (url === '/ping') {
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('pong');
                return;
            }
            if (url === '/mcp' || url === '/mcp/') {
                try {
                    const transport = new StreamableHTTPServerTransport({
                        sessionIdGenerator: undefined,
                        enableJsonResponse: true,
                    });
                    res.on('close', () => {
                        transport.close();
                    });
                    await mcpServer.connect(transport);
                    // Handle request body if present
                    if (req.method === 'POST') {
                        let body = '';
                        req.on('data', (chunk) => {
                            body += chunk.toString();
                        });
                        req.on('end', async () => {
                            try {
                                const requestBody = body ? JSON.parse(body) : undefined;
                                await transport.handleRequest(req, res, requestBody);
                            }
                            catch (error) {
                                console.error('Error handling request:', error);
                                if (!res.headersSent) {
                                    res.writeHead(400, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({ error: 'Invalid request' }));
                                }
                            }
                        });
                    }
                    else {
                        await transport.handleRequest(req, res);
                    }
                }
                catch (error) {
                    console.error('Error handling MCP request:', error);
                    if (!res.headersSent) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Internal server error' }));
                    }
                }
                return;
            }
            if (url === '/stats') {
                const stats = indexer.getStats();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(stats, null, 2));
                return;
            }
            // 404 for other paths
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Not found' }));
        });
        httpServer.listen(serverConfig.port, () => {
            console.error(`Docfork Local MCP Server running on HTTP:`);
            console.error(`  • MCP endpoint: http://localhost:${serverConfig.port}/mcp`);
            console.error(`  • Health check: http://localhost:${serverConfig.port}/ping`);
            console.error(`  • Stats: http://localhost:${serverConfig.port}/stats`);
        });
        // Graceful shutdown
        const shutdown = () => {
            console.error('\nShutting down...');
            httpServer.close(() => {
                process.exit(0);
            });
        };
        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
    }
}
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map