import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Client } from "@notionhq/client";
import fs from "fs";
import path from "path";
import os from "os";

// Read API key from file
const keyPath = path.join(os.homedir(), ".openclaw", "credentials", "notion-api-key");
const apiKey = fs.readFileSync(keyPath, "utf8").trim();

const notion = new Client({ auth: apiKey });

const server = new Server(
  {
    name: "notion-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "query_database",
        description: "Query a Notion database",
        inputSchema: {
          type: "object",
          properties: {
            database_id: {
              type: "string",
              description: "The ID of the database to query",
            },
            filter: {
              type: "object",
              description: "Filter object for the query",
            },
          },
          required: ["database_id"],
        },
      },
      {
        name: "get_page",
        description: "Retrieve a Notion page",
        inputSchema: {
          type: "object",
          properties: {
            page_id: {
              type: "string",
              description: "The ID of the page to retrieve",
            },
          },
          required: ["page_id"],
        },
      },
      {
        name: "update_page",
        description: "Update a Notion page properties",
        inputSchema: {
          type: "object",
          properties: {
            page_id: {
              type: "string",
              description: "The ID of the page to update",
            },
            properties: {
              type: "object",
              description: "The properties to update",
            },
          },
          required: ["page_id", "properties"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "query_database": {
      const { database_id, filter } = request.params.arguments;
      try {
        const response = await notion.databases.query({
          database_id,
          filter,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error querying database: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }

    case "get_page": {
      const { page_id } = request.params.arguments;
      try {
        const response = await notion.pages.retrieve({ page_id });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error retrieving page: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }

    case "update_page": {
      const { page_id, properties } = request.params.arguments;
      try {
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
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error updating page: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }

    default:
      throw new Error("Unknown tool");
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
