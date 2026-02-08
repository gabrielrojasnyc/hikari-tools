#!/bin/bash

# Docfork Local MCP Server Start Script
# Usage: ./start-docfork.sh [http|stdio]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Configuration
export WATCH_DIR="${WATCH_DIR:-/Users/nagomi/.openclaw/workspace/}"
export OLLAMA_URL="${OLLAMA_URL:-http://localhost:11434}"
export OLLAMA_MODEL="${OLLAMA_MODEL:-qwen2.5-coder:32b}"
export OLLAMA_EMBEDDING_MODEL="${OLLAMA_EMBEDDING_MODEL:-nomic-embed-text}"
export AUTO_INDEX_HOURS="${AUTO_INDEX_HOURS:-6}"
export PORT="${PORT:-3000}"
export IGNORE_PATTERNS="${IGNORE_PATTERNS:-node_modules/**,.git/**,*.log,dist/**,build/**,.DS_Store}"

# Determine transport mode
MODE="${1:-stdio}"
if [ "$MODE" == "http" ]; then
  export MCP_TRANSPORT="streamable-http"
  echo "Starting Docfork Local MCP Server in HTTP mode on port $PORT..."
else
  export MCP_TRANSPORT="stdio"
  echo "Starting Docfork Local MCP Server in stdio mode..."
fi

# Check if Ollama is running
echo "Checking Ollama..."
if ! curl -s "$OLLAMA_URL/api/tags" > /dev/null 2>&1; then
  echo "Warning: Ollama doesn't seem to be running at $OLLAMA_URL"
  echo "Please start Ollama first: ollama serve"
  exit 1
fi

# Check for required models
echo "Checking embedding model ($OLLAMA_EMBEDDING_MODEL)..."
if ! curl -s "$OLLAMA_URL/api/tags" | grep -q "$OLLAMA_EMBEDDING_MODEL"; then
  echo "Pulling embedding model: $OLLAMA_EMBEDDING_MODEL"
  ollama pull "$OLLAMA_EMBEDDING_MODEL"
fi

echo "Checking LLM model ($OLLAMA_MODEL)..."
if ! curl -s "$OLLAMA_URL/api/tags" | grep -q "$OLLAMA_MODEL"; then
  echo "LLM model not found: $OLLAMA_MODEL"
  echo "Please pull it: ollama pull $OLLAMA_MODEL"
fi

# Build if needed
if [ ! -d "$SCRIPT_DIR/dist" ] || [ "$SCRIPT_DIR/src/index.ts" -nt "$SCRIPT_DIR/dist/index.js" ]; then
  echo "Building..."
  npm run build
fi

# Start the server
echo "Starting server..."
echo "Watch directory: $WATCH_DIR"
echo "Auto-index interval: $AUTO_INDEX_HOURS hours"
exec node "$SCRIPT_DIR/dist/index.js"
