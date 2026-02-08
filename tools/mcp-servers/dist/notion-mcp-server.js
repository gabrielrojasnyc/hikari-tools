#!/usr/bin/env node
import { Client } from "@notionhq/client";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import * as fs from "fs";
import * as path from "path";
// Read API key from credentials file
const API_KEY_PATH = path.join(process.env.HOME || "", ".openclaw", "credentials", "notion-api-key");
const NOTION_API_KEY = fs.readFileSync(API_KEY_PATH, "utf-8").trim();
// Initialize Notion client
const notion = new Client({ auth: NOTION_API_KEY });
// Create MCP server
const server = new Server({
    name: "notion-mcp-server",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "query_database",
                description: "Query a Notion database with optional filters and return results",
                inputSchema: {
                    type: "object",
                    properties: {
                        database_id: {
                            type: "string",
                            description: "The Notion database ID",
                        },
                        filter: {
                            type: "object",
                            description: "Optional filter object for the query",
                        },
                        sorts: {
                            type: "array",
                            description: "Optional sort configuration",
                        },
                        page_size: {
                            type: "number",
                            description: "Number of results to return (max 100)",
                            default: 10,
                        },
                    },
                    required: ["database_id"],
                },
            },
            {
                name: "get_page",
                description: "Get full page content and properties from Notion",
                inputSchema: {
                    type: "object",
                    properties: {
                        page_id: {
                            type: "string",
                            description: "The Notion page ID",
                        },
                    },
                    required: ["page_id"],
                },
            },
            {
                name: "update_page",
                description: "Update page properties in Notion (e.g., status, title, etc.)",
                inputSchema: {
                    type: "object",
                    properties: {
                        page_id: {
                            type: "string",
                            description: "The Notion page ID to update",
                        },
                        properties: {
                            type: "object",
                            description: "Properties to update (e.g., { Status: { select: { name: 'Done' } } })",
                        },
                    },
                    required: ["page_id", "properties"],
                },
            },
            {
                name: "create_page",
                description: "Create a new page in a Notion database",
                inputSchema: {
                    type: "object",
                    properties: {
                        database_id: {
                            type: "string",
                            description: "The parent database ID",
                        },
                        properties: {
                            type: "object",
                            description: "Page properties to set",
                        },
                        content: {
                            type: "array",
                            description: "Optional page content blocks",
                        },
                    },
                    required: ["database_id", "properties"],
                },
            },
            {
                name: "search_databases",
                description: "Search for Notion databases by name",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: {
                            type: "string",
                            description: "Search query for database name",
                        },
                    },
                    required: ["query"],
                },
            },
        ],
    };
});
// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        switch (name) {
            case "query_database": {
                const { database_id, filter, sorts, page_size = 10 } = args;
                const response = await notion.databases.query({
                    database_id,
                    filter,
                    sorts,
                    page_size,
                });
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(response, null, 2),
                        },
                    ],
                };
            }
            case "get_page": {
                const { page_id } = args;
                const [pageInfo, pageContent] = await Promise.all([
                    notion.pages.retrieve({ page_id }),
                    notion.blocks.children.list({ block_id: page_id }),
                ]);
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({ page: pageInfo, content: pageContent }, null, 2),
                        },
                    ],
                };
            }
            case "update_page": {
                const { page_id, properties } = args;
                const response = await notion.pages.update({
                    page_id,
                    properties,
                });
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(response, null, 2),
                        },
                    ],
                };
            }
            case "create_page": {
                const { database_id, properties, content } = args;
                const response = await notion.pages.create({
                    parent: { database_id },
                    properties,
                    children: content,
                });
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(response, null, 2),
                        },
                    ],
                };
            }
            case "search_databases": {
                const { query } = args;
                const response = await notion.search({
                    query,
                });
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(response, null, 2),
                        },
                    ],
                };
            }
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error: ${error.message}`,
                },
            ],
            isError: true,
        };
    }
});
// Start server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Notion MCP Server running on stdio");
}
main().catch(console.error);
