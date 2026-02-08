import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { LocalIndexer } from './indexer.js';
import { VectorSearch } from './search.js';
import { IndexConfig } from './types.js';
export declare function createMCPServer(indexer: LocalIndexer, search: VectorSearch, config: IndexConfig): McpServer;
//# sourceMappingURL=mcp-server.d.ts.map