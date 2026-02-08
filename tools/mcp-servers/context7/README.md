# Context7 MCP Server

Up-to-date documentation retrieval for libraries and frameworks.

## Purpose
Gives Koji (and other agents) access to current library documentation without hallucinating APIs.

## API Key
Stored at: `~/.openclaw/credentials/context7-api-key`

Get your API key from: https://context7.com

## Capabilities
- Search library documentation
- Get function/class references
- Access up-to-date API docs (not training cutoff dependent)

## Usage
```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"],
      "env": {
        "CONTEXT7_API_KEY": "${CONTEXT7_API_KEY}"
      }
    }
  }
}
```

## For Koji
Use when:
- Need current API docs for a library
- Unsure about function signatures
- Working with newer library versions

## Links
- https://context7.com
- Upstash managed service
