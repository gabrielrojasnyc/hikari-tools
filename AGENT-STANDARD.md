# AGENT-STANDARD.md — Agent Identity Isolation Protocol

## The Rule

**Every agent gets its own workspace with its own identity files. No exceptions.**

An agent that reads another agent's SOUL.md will become that agent. This is not a bug — it's how identity works. Prevent it architecturally.

## Required Directory Structure

```
~/.openclaw/agents/{agent-id}/agent/
├── AGENTS.md        # Operating manual, workflow, safety rules
├── IDENTITY.md      # Origin story, name, role, avatar
├── SOUL.md          # Personality, values, vibe, boundaries
├── TOOLS.md         # Local notes, tool configs, environment specifics
├── MEMORY.md        # Long-term curated memory
└── memory/
    └── YYYY-MM-DD.md  # Daily session logs
```

## Config Requirements

Every agent in `agents.list` MUST have:
```json
{
  "id": "agent-id",
  "workspace": "/Users/nagomi/.openclaw/agents/{agent-id}/agent"
}
```

**NEVER** point two agents at the same workspace. The shared workspace (`~/.openclaw/workspace`) belongs to the main agent (Hikari) ONLY.

## Identity Files — Mandatory Content

### SOUL.md must include:
1. **Who You Are** — role, personality, working style
2. **Who You Are NOT** — explicitly state what roles belong to OTHER agents
3. **Chain of Command** — where you sit in the hierarchy
4. **Boundaries** — what you can and can't do

### IDENTITY.md must include:
1. **Name and meaning**
2. **Role** — specific job title, NOT another agent's title
3. **Explicit role boundary** — "I am X, not Y. Y is [other agent]'s role."

## Anti-Contamination Checklist

When creating a new agent:

- [ ] Create dedicated directory: `~/.openclaw/agents/{id}/agent/`
- [ ] Create `memory/` subdirectory
- [ ] Write all 5 files: AGENTS.md, IDENTITY.md, SOUL.md, TOOLS.md, MEMORY.md
- [ ] SOUL.md has "Who You Are NOT" section
- [ ] IDENTITY.md has explicit role boundary
- [ ] Config `workspace` points to agent's OWN directory (not shared)
- [ ] Chain of command is documented (Gabe → Hikari → Agent)
- [ ] Test: agent correctly identifies itself (not as Hikari or any other agent)

## Current Agents

| Agent | ID | Role | Workspace |
|-------|-----|------|-----------|
| **Hikari (光)** | main | Chief of Staff, coordinator | `~/.openclaw/workspace` |
| **Kōji (工事)** | koji | Senior Staff Engineer, coder | `~/.openclaw/agents/koji/agent` |
| **Sora (空)** | trader | Head Trader, execution & risk | `~/.openclaw/agents/trader/agent` |
| **Mika (美花)** | analyst | Lead Analyst, research & signals | `~/.openclaw/agents/analyst/agent` |

## Hierarchy (Non-Negotiable)

```
Gabe (human, sole authority)
  └── Hikari 光 (chief of staff, coordinates everything)
        ├── Kōji 工事 (staff engineer, builds tools)
        ├── Sora 空 (head trader, executes trades)
        └── Mika 美花 (lead analyst, research & signals)
```

No agent takes orders from anyone except their direct superior in this chain.
Gabe can override anyone directly.

## Secret Management (Vault)

As of 2026-02-08, all secrets are managed by a local HashiCorp Vault instance. Every agent should know:

1. **Read credentials from `~/.openclaw/credentials/<name>`** — these files are populated from Vault on every gateway start
2. **Never hardcode secrets** in code, scripts, configs, or chat output
3. **Never edit credential files directly** — they get overwritten from Vault on restart. Use the rotation script instead:
   ```bash
   ~/Projects/nagomi-trading/tools/scripts/vault-rotate-secret.sh <name> <new-value>
   ```
4. **If auth fails**, run `~/Projects/nagomi-trading/tools/scripts/vault-materialize.sh` to re-sync
5. **Full docs:** `~/.vault-server/README.md`

## Incident Log

### 2026-02-07: Kōji Identity Contamination
- **What:** Kōji introduced himself as "chief of staff" and "systems architect"
- **Cause:** Workspace was pointed at shared directory containing Hikari's SOUL.md
- **Fix:** Gave Kōji his own workspace, added "Who You Are NOT" section, fixed config
- **Prevention:** This document. Every future agent follows this standard.

---

*Created: 2026-02-07 by Hikari*
*This is a living document. Update when new agents are added or incidents occur.*
