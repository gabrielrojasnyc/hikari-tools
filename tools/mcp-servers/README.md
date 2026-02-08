# Notion MCP Server

MCP (Model Context Protocol) server for Notion integration. Allows reading and updating Notion databases and pages.

## Location
`~/.openclaw/mcp-servers/notion/`

## Tools Exposed

### 1. `query_database`
Query any Notion database with optional filters.

**Parameters:**
- `database_id` (string, required): The Notion database ID
- `filter` (object, optional): Filter object for the query
- `sorts` (array, optional): Sort configuration
- `page_size` (number, optional): Number of results (max 100, default: 10)

### 2. `get_page`
Get full page content and properties from Notion.

**Parameters:**
- `page_id` (string, required): The Notion page ID

### 3. `update_page`
Update page properties (e.g., status, title, etc.).

**Parameters:**
- `page_id` (string, required): The Notion page ID to update
- `properties` (object, required): Properties to update

### 4. `create_page`
Create a new page in a Notion database.

**Parameters:**
- `database_id` (string, required): The parent database ID
- `properties` (object, required): Page properties to set
- `content` (array, optional): Page content blocks

### 5. `search_databases`
Search for Notion databases by name.

**Parameters:**
- `query` (string, required): Search query for database name

## Configuration

API key is loaded from: `~/.openclaw/credentials/notion-api-key`

## Transport
- Type: stdio
- Entry point: `dist/notion-mcp-server.js`

## Usage

### Build
```bash
npm run build
```

### Run
```bash
npm start
```

## Example: Query Gabe Tasks Database

```json
{
  "method": "tools/call",
  "params": {
    "name": "query_database",
    "arguments": {
      "database_id": "bcbc8a98-0bc4-4e79-8621-0d169d3608c0",
      "page_size": 5
    }
  }
}
```

## Dependencies
- `@notionhq/client` v2.2.15
- `@modelcontextprotocol/sdk` v1.26.0
