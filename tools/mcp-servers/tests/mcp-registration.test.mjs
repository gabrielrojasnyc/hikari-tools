import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createMCPServer } from '../dist/mcp-server.js';

test('Zod3 tool shapes register and validate over an in-memory MCP transport', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'docfork-schema-'));
  const file = join(dir, 'fixture.md');
  await writeFile(file, 'fixture content');
  const chunk = { id: 'fixture', filePath: file, content: 'fixture content', embedding: [], metadata: { lineStart: 1, lineEnd: 1, lastModified: 0, fileType: 'md' } };
  let chunks = [chunk];
  let reindexes = 0;
  const queries = [];
  const indexer = { getChunks: () => chunks, getStats: () => ({ totalChunks: chunks.length, totalFiles: chunks.length }), indexAll: async () => { reindexes++; } };
  const search = { search: async (query, receivedChunks, topK) => { queries.push({ query, topK }); assert.deepEqual(receivedChunks, chunks); return [{ chunk, score: 0.9 }]; }, searchWithContext: async () => { throw new Error('Unexpected external RAG path'); } };
  const server = createMCPServer(indexer, search, { watchDir: dir, ollamaUrl: 'http://invalid.local', ollamaModel: 'fixture' });
  const client = new Client({ name: 'schema-test', version: '1.0.0' });
  const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    const { tools } = await client.listTools();
    assert.equal(tools.length, 5);
    const schema = tools.find(tool => tool.name === 'local_search_docs').inputSchema;
    assert.equal(schema.type, 'object');
    assert.equal(schema.properties.query.type, 'string');
    assert.equal(schema.properties.topK.type, 'number');
    assert.deepEqual(schema.required, ['query']);
    for (const name of ['local_reindex', 'local_index_stats']) {
      const empty = tools.find(tool => tool.name === name).inputSchema;
      assert.equal(empty.type, 'object');
      assert.deepEqual(empty.properties, {});
      assert.equal((empty.required ?? []).length, 0);
    }
    const found = await client.callTool({ name: 'local_search_docs', arguments: { query: 'fixture' } });
    assert.match(found.content[0].text, /Found 1 relevant results/);
    assert.deepEqual(queries, [{ query: 'fixture', topK: 5 }]);
    await client.callTool({ name: 'local_search_docs', arguments: { query: 'fixture', topK: 2 } });
    assert.equal(queries[1].topK, 2);
    for (const args of [{ topK: 2 }, { query: 7 }, { query: 'fixture', topK: 'bad' }]) {
      const invalid = await client.callTool({ name: 'local_search_docs', arguments: args });
      assert.equal(invalid.isError, true);
    }
    assert.equal(queries.length, 2, 'invalid arguments never reach search');
    const read = await client.callTool({ name: 'local_read_doc', arguments: { filePath: file } });
    assert.match(read.content[0].text, /fixture content/);
    assert.equal((await client.callTool({ name: 'local_read_doc', arguments: { filePath: 42 } })).isError, true);
    chunks = [];
    const ask = await client.callTool({ name: 'local_ask', arguments: { question: 'fixture?' } });
    assert.match(ask.content[0].text, /No documents indexed/);
    assert.equal((await client.callTool({ name: 'local_ask', arguments: {} })).isError, true);
    await client.callTool({ name: 'local_reindex', arguments: {} });
    assert.equal(reindexes, 1);
    const stats = await client.callTool({ name: 'local_index_stats', arguments: {} });
    assert.match(stats.content[0].text, /Total chunks: 0/);
  } finally {
    await client.close();
    await server.close();
    await rm(dir, { recursive: true, force: true });
  }
});
