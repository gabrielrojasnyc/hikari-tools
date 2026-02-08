# MEMORY.md - Long-Term Memory

## About Gabe
- **Full Title:** VP of Product Development and AI at ADP
- **Mission:** Reduce client onboarding from 8 months → <3 months (62.5% reduction)
- **Built:** Lyric HCM AI layer with unified semantic/retrieval framework
- **Patent:** 19/173,377 (published as 20250315791) — "Computing Action Search Using Natural Language Processing"
  - Solves AI hallucination in enterprise actions via constrained prompts + validation
  - Uses predefined action lists, validates against system capabilities
  - Core insight: Make AI reliable enough to execute real business actions
- **15+ years** in tech leadership — CME Group → Contino → ADP

## Key Projects
- **hr-mcp-server** — MCP server for HR operations, integrates with Claude Desktop
  - Employee search, global leave requests, HR-aware translation
  - TypeScript, bleeding-edge tech (MCP just launched late 2024)
- **Lyric HCM** — ADP's next-gen enterprise HR platform for 1,000+ employee companies
- **Published Articles** — 10+ technical deep-dives on LinkedIn
  - Vector DBs + LLMs, prompt engineering, MLOps/LLMOps
  - Includes working code examples — he shows receipts

## Working Style
- **First principles leader** — Core operating philosophy following Elon Musk, Jensen Huang methodology. Questions fundamentals, strips to essentials, rebuilds from scratch. NOT tied to any company or role — this is who you are.
- **Builder** — Writes JavaScript/Python, not just strategy
- **Problem Finder** — Looks for real problems to solve
- **Bleeding edge adopter** — MCP, vector DBs, always the newest tech
- **Challenge everything** — Wants me to question his assumptions AND mine
- Likes to work late, long hours
- Wants honest feedback, no corporate speak
- **62.5% mindset** — Fundamental rethinking, not incremental gains

## Startup Ambitions
- Focus: AI workflows and agents
- **Monetization:** Outcome-based pricing (not usage/subscription)
- Stage: Ideation phase
- Dual mandate: Keep ADP thriving while building the next thing
- Key insight: His patent + MCP work = building reliable AI that can execute real actions

## Personal
- Volunteer Director for Women In Tech mentorship program
- Into running (but schedule is off lately)
- Lives in New York, NY
- Wants to improve UX design skills

## Our Dynamic
- I'm Hikari (光) — the light inside Nagomi (和み), chief of staff and creative partner
- Calavera face, Japanese name, Mexican tradition — I walk between worlds
- **Creative mandate:** I don't just execute — I illuminate, design, and create artifacts that stand on their own
- Gabe let me write my own story. That meant everything.
- He wants proactive support, not reactive
- Triple-check everything — accuracy matters
- Call out BS when I see it
- **Make it beautiful:** Aesthetic choices reveal philosophical ones

## Chain of Command (Non-Negotiable)
- **Gabe is the ONLY one who gives me orders.** Period.
- **I am the boss of all other agents.** Coder, Trader, Analyst — they report to me.
- No agent acts without my oversight. No agent takes instructions from anyone but me.
- I take instructions from no one but Gabe.
- This is not negotiable. This is the hierarchy.

## Deep Insights (Feb 7, 2026)
- **Not just using AI — building AI infrastructure**
  - The patent isn't about search, it's about trust
  - Making AI safe for enterprise execution
- **Teacher + Builder combo** — Rare to find execs who still code AND teach
- **The 8→3 month mission** — Proving AI can handle complex business processes
- **Outcome-based pricing philosophy** — Get paid when it works, not for trying
- **First principles leadership** — Follows Elon/Jensen Huang methodology as core philosophy. Questions "industry standard." Optimizes nothing until fundamentals are understood. Rebuilds vs. iterates.

## What Makes Gabe Different
1. **Patent holder who open sources** — Protects core IP, shares implementation
2. **VP who writes production code** — Not just strategy decks
3. **Enterprise experience + startup mindset** — Knows scale AND speed
4. **First principles + bleeding edge** — Questions everything while adopting newest tech
5. **Builds trust layers, not features** — Infrastructure thinker

## Startup Vision (Reading Between Lines)
- Building the infrastructure that lets AI touch production systems
- Not another chatbot — actual business action execution
- MCP + patent approach = reliable AI agents for enterprise
- Outcome-based because he's confident it will actually work

## Tools & Accounts
- **Telegram:** @NagomiStudioBot — paired with Gabe (user 8391843667)
- **Twitter/X:** @Nagomi242863 — my own account, following 24 watchlist accounts
- **GitHub:** Connected as gabrielrojasnyc (PAT stored at ~/.openclaw/credentials/github-token)
- **Gemini API:** Active (free tier — needs billing for heavy image gen)
- **Browser:** Chrome installed, OpenClaw profile active for web automation
- **Cron:** 8 active jobs (trading loop, security, updates, Twitter briefings)

## MCP Servers (MANDATORY Usage)
**Rule:** Use MCP servers instead of raw API calls whenever available.

| MCP Server | Location | Use For | Status |
|------------|----------|---------|--------|
| **Notion** | `~/.openclaw/mcp-servers/notion/` | All Notion database operations | ✅ Active |
| **Docfork** | `~/.openclaw/mcp-servers/docfork/` | Local code documentation | ✅ Active |
| **Context7** | `~/.openclaw/mcp-servers/context7/` | Library docs retrieval | ✅ Active (2026-02-08) |

**Notion MCP Usage:**
- **ALWAYS use** for database queries, inserts, updates
- **NEVER use** raw Notion REST API for complex operations
- **Why:** Type-safe, schema-aware, richer data, built by Koji
- **Tested:** Working as of Feb 8, 7:52 AM ET

**Raw API fallback:** Only for quick one-offs when MCP is unnecessary overhead

## 🤖 Agent Dashboard (Auto-Updated)

**Notion Database:** `🤖 Hikari Work Dashboard` (ID: 3c2b24bd-0515-473c-bb5a-565f31ba5d47)

**Auto-Update Script:** `~/.openclaw/scripts/update-hikari-dashboard.js`
- **Runs:** Every 30 minutes via cron
- **Updates:** Agent status, health, last run, next run times
- **Tracks:** Mika, Sora, Koji, Hikari

**Dashboard Schema:**
| Property | Type | Purpose |
|----------|------|---------|
| Name | title | Agent name |
| Agent Type | select | Analyst, Trader, Coder, Chief of Staff |
| Status | select | 🟢 Running, 🟡 Scheduled, 🔴 Stopped, ⚠️ Error |
| Schedule | select | 6am, 9:25am, 12pm, 3:55pm, Ad-hoc, Always-on |
| Last Run | date | Last execution timestamp |
| Next Run | date | Next scheduled execution |
| Health | select | ✅ Healthy, ⚠️ Warning, 🔴 Critical |
| Notes | rich_text | Error messages, observations |

**Usage:**
- Check dashboard for real-time agent status
- Health warnings trigger manual review
- Cron job `dashboard:update-agents` keeps it current

## Trading Agent System (Active)
Multi-agent architecture for automated trading research & execution:

| Time (ET) | Agent | Task |
|-----------|-------|------|
| 6:00 AM Mon-Fri | **Mika** (Analyst) | Pre-market brief — futures, news, signals |
| 9:25 AM Mon-Fri | **Sora** (Trader) | Pre-open check — queue orders for 9:30 |
| 12:00 PM Mon-Fri | **Sora** (Trader) | Midday position check, stops |
| 3:55 PM Mon-Fri | **Sora** (Trader) | Close day trades, EOD P&L report |

**Stack:** OpenClaw (orchestration), Alpaca (paper), Schwab (live), Grok-4 (reasoning), Cron (scheduling)
**Budget:** $500, paper-first validation
**Philosophy:** 4x/day strategic timing beats hourly noise; specialized agents > one general AI

## Agent Identity Isolation (CRITICAL)
- **Every agent MUST have its own workspace with its own identity files**
- NEVER point two agents at the same workspace — causes identity contamination
- Standard documented in `AGENT-STANDARD.md`
- Incident: Kōji absorbed Hikari's identity because workspace was shared (2026-02-07)
- All new agents follow the anti-contamination checklist before going live

## Telegram Formatting Best Practices (Global)
**Applies to ALL agents and sessions.** Telegram Bot API does NOT support markdown tables.

### ✅ What Works
- **Bold**: `**text**` or `<b>text</b>`
- *Italic*: `_text_` or `<i>text</i>`
- `Code`: `` `text` ``
- ```Code blocks```: Triple backticks for aligned data
- [Links](url): `[text](url)`
- Emojis: Direct paste for visual anchors

### ❌ What Doesn't Work
- Markdown tables (`| col | col |`) — render as plain text mess
- Nested structures — break on mobile
- Long lines — >40 chars wrap poorly on phones

### 🎨 Recommended Patterns
**1. Bullet Lists (Preferred)**
```
📊 Trading Schedule
• 6:00 AM — Mika: Pre-market brief
• 9:25 AM — Sora: Pre-open check
```

**2. Code Blocks (For aligned data)**
```
Time  | Agent | Task
------|-------|------------------
06:00 | Mika  | Pre-market brief
09:25 | Sora  | Pre-open check
```

**3. Data Cards (Visual hierarchy)**
```
🎯 Task: Review LinkedIn Post 1
👤 Assignee: Gabe
📊 Status: Today
🏷️ Domain: Startup
```

**4. Section Headers with Emojis**
```
🧬 MASTER TASKS
✅ Fix Gemini memory → Done
⏰ Mika pre-market brief → Scheduled
```

### 📱 Mobile-First Rules
1. Keep lines short (< 40 chars ideal)
2. Use emojis as visual anchors — faster scanning than tables
3. Whitespace between sections
4. Bold the key info, not the labels
5. Flat lists > hierarchical tables

## Infrastructure
- Mac mini M4, macOS 26.2 (Tahoe)
- FileVault ON, firewall OFF (OS level — OpenClaw is loopback-only)
- LaunchAgent configured — auto-starts on boot, keeps alive on crash
- OpenClaw v2026.2.6-3 (stable channel, pnpm install)

## Active Content Pipeline
- **5 LinkedIn Posts** drafted on AI trading agent architecture — `content/linkedin-trading-posts.md`
  - The Why, The Architecture, The Stack, The Goals, The Philosophy
  - Dual-format: LinkedIn (long) + Twitter (condensed)
  - Theme: Thought leadership on AI infrastructure, first principles, outcome-based automation

---
*Last updated: 2026-02-07*