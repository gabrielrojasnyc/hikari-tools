# This Hikari package

This directory currently contains the `docfork-local` package: its `package.json`
compiles `src/` to `dist/`, and `start-docfork.sh` builds it with `npm run build`
before launching `dist/index.js`. For this checked-in package, use its
`package-lock.json` and the repository's `.nvmrc`:

```bash
npm ci
npm run build
node --test tests/mcp-registration.test.mjs
```

Run installation only when registry access is authorized. The test uses an
in-memory MCP transport, fake indexing/search objects, and a temporary file; it
does not start the application or contact Ollama.

The pnpm workspace files and the upstream instructions below were imported with
this directory in commit `b492126acc3a0e34c128619a4630a36e3035595d`.
Their `packages/*` / `apps/*` layout and root lock importer do not describe the
current `docfork-local` manifest. They are preserved as imported material, not a
validated alternative lockfile for this package. Do not regenerate them from a
guessed workspace or use them to claim this npm dependency graph was audited.

Equivalent baseline package/source/lock copies also exist in the Nagomi trading
repository under `tools/mcp-servers/docfork` and
`infrastructure/mcp-servers/docfork`. Byte equality establishes duplication, not
which location is actively launched or owns future releases. Coordinate changes
with that repository's maintainer before synchronizing or retiring copies.

# Imported upstream contribution instructions

The following instructions describe the upstream Docfork workspace, not the
flattened Hikari package above. They are retained for provenance.

# Contributing

## Setup

**Prerequisites:** Node.js ≥18, pnpm ≥9

```bash
git clone https://github.com/docfork/docfork.git
cd docfork
pnpm install
pnpm build
```

## Development

All commands run from root:

```bash
pnpm dev            # development mode
pnpm build          # build packages
pnpm lint           # lint with auto-fix
pnpm lint:check     # lint check only
pnpm format         # format with auto-fix
pnpm format:check   # format check only
pnpm typecheck      # type checking
pnpm test           # run tests
pnpm start          # start MCP server (HTTP mode)
pnpm start:stdio    # start MCP server (stdio mode)
pnpm clean          # clean build artifacts
```

## Structure

```
docfork/
├── packages/
│   └── mcp/              # mcp server
├── eslint.config.mjs     # shared config
├── prettier.config.mjs   # shared config
└── turbo.json            # build pipeline
```

## Workflow

1. Create branch from `main`
2. Make changes
3. Run `pnpm lint && pnpm typecheck && pnpm build`
4. Commit and open PR

**Publishing:** automatic via GitHub Actions on release.

**Questions?** [Open an issue](https://github.com/docfork/docfork/issues)
