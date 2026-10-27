# October 2026 dependency patch

Use Node24.22.1 from `.nvmrc` and `npm ci` at each package root. Engine policy permits the patched Node22/24/26 lines. Install into isolated development/build directories; this patch does not upgrade a deployed runtime.

Compatible npm audit repairs update the four lockfiles. Root sqlite3 moves from5.1.7 to6.0.1, whose supported parent dependency graph removes tar6; no transitive tar major override is used. The callback API test uses only an in-memory database.

Remaining audit findings are not suppressed: node-cron3→uuid remains in root/MCP/capital; MCP/capital retain Zod3; capital retains Alpaca3 and its axios/msgpack dependencies. Their major migrations need targeted compatibility review. No trading logic or scheduling behavior changed.

Use npm for the MCP package. Its pre-existing pnpm lock/workspace describe unrelated eslint/turbo workspace importers, do not match the docfork manifest, and were not regenerated or certified by this patch. Coordinate a separate removal/reconciliation with the canonical docfork owner before treating pnpm as a supported reproducible build.

Repository history tracks node_modules. These tracked installations are not updated by this patch: fresh npm ci is required. Generated native/dependency files from local verification must not be committed as source changes.
