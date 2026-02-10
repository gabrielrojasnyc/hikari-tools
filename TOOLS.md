# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## GitHub
- Token stored at: `~/.openclaw/credentials/github-token` (chmod 600)
- User: gabrielrojasnyc
- 45 public repos
- Key repos: mcp-gateway-registry, nagomilabs, Onboarding-Agent, hr-mcp-server

## Twitter/X
- Monitoring via browser automation (no API key)
- Gabe's handle: @gabrielrojasnyc
- Hikari's account: @Nagomi242863 (dedicated bot account, logged in via browser)
- Mode: read-only (feed, notifications, mentions, trending AI topics)

### Watchlist accounts:
- @gregisenberg — Greg Isenberg, portfolio of internet companies, hosts @startupideaspod
- @openclaw — OpenClaw, the platform we run on 🦞
- @moltbook — OpenClaw community hub, "front page of the agent internet" by @MattPRD
- @vercel — Self-driving infrastructure for apps and agents
- @rauchg — Guillermo Rauch, Vercel CEO
- @asmartbear — Jason Cohen, founder of WPEngine + SmartBear (two unicorns)
- @jasonlk — Jason Lemkin, SaaStr, $200m fund, AI agents playbook
- @cursor_ai — Cursor, AI coding tool (Gabe uses this daily)
- @satyanadella — Satya Nadella, CEO Microsoft
- @chamath — Chamath Palihapitiya, VC, "God is in the details"
- @GeminiApp — Google Gemini, frontier AI (Veo, Deep Think, Nano Banana)
- @8090solutions — 8090 Solutions, purpose-built enterprise software
- @mikeyk — Mike Krieger, Anthropic Labs (ex-CPO Anthropic, co-founder Instagram)
- @kevinweil — Kevin Weil, VP Science OpenAI (ex-Head of Product Instagram/Twitter)
- @AnthropicAI — Anthropic, AI safety + Claude (my brain runs on this)
- @OpenAI — OpenAI, AGI mission
- @altcap — Brad Gerstner, Altimeter Capital, "no small plans"
- @The_AI_Investor — AI stock investing, portfolio up ~18x in 3 years
- @SpaceX — SpaceX, rockets and spacecraft
- @sama — Sam Altman, OpenAI CEO, "AI is cool i guess"
- @karpathy — Andrej Karpathy, EurekaLabsAI, ex-Director of AI at Tesla, founding OpenAI team
- @lennysan — Lenny Rachitsky, product/growth/career advice (Lenny's Newsletter)
- @godofprompt — God of Prompt, prompt engineering & AI tips

## Codex CLI (Local)
- Binary: `/opt/homebrew/bin/codex` (v0.98.0)
- Installed globally via npm: `@openai/codex`
- Config: `~/.codex/config.toml`
- Default model: gpt-5.2-codex (cloud API via OpenAI)
- **Kōji's primary coding tool** — use for all code generation, refactoring, PR reviews
- Must run in a git repo (use `mktemp -d && git init` for scratch)
- Always use `pty:true` when invoking
- Modes: `exec "prompt"` (one-shot), `--full-auto` (auto-approve), `--yolo` (no sandbox)

## Ollama (Local LLM)
- Binary: `/opt/homebrew/bin/ollama` (v0.15.5)
- Service: `brew services` LaunchAgent (auto-starts on boot)
- Models: qwen3:30b-a3b, qwen2.5-coder:32b, phi4:14b (downloading)
- API: http://localhost:11434
- OpenClaw integration: auto-discovery via `OLLAMA_API_KEY=ollama-local`
- Use as last-resort fallback when all cloud providers are down

## Telegram Groups
- **TheTeam** — Group chat with all agents: `-5183989090`
  - All 5 bots present: Hikari (default), Kōji, Sora, Mika, Aegis
  - `requireMention: false` — agents see all messages
  - Use for: Agent status updates, memory reports, team coordination

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

Add whatever helps you do your job. This is your cheat sheet.
