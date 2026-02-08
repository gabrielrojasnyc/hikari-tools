# Unified Tools Repository

All Hikari tooling consolidated for version control and agent portability.

## Repository Structure

```
tools/
├── mcp-servers/          # MCP (Model Context Protocol) servers
│   ├── context7/        # Library documentation retrieval (Upstash)
│   ├── docfork/         # Local code documentation
│   └── notion/          # Notion database integration
├── scripts/             # Automation & utility scripts
│   └── update-hikari-dashboard.js
├── agents/              # Agent configurations
│   └── koji/
│       └── IDENTITY.md
└── docs/                # Technical documentation
```

## MCP Servers

| Server | Purpose | Status |
|--------|---------|--------|
| **Context7** | Live library docs (React, Next.js, etc.) | ✅ Active |
| **Docfork** | Local codebase documentation | ✅ Active |
| **Notion** | Database read/write operations | ✅ Active |

## Context7 Usage

Koji (coder agent) can now access up-to-date library documentation:

```
"How does Next.js after() work? Use context7"
"Check Context7 for React 19 hook signatures"
```

This eliminates API hallucinations from outdated training data.

## GitHub URL

https://github.com/gabrielrojasnyc/quant-engine/tree/main/tools

## Auto-Sync

- **Schedule:** Daily at 11:00 PM ET
- **Job:** `git:sync-tools` (cron)
- **Action:** Commit and push tool changes to GitHub

---
*Last synced: 2026-02-08*
