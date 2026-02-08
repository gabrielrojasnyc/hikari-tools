# Trading System Architecture

## The Question: One Agent or Multiple?

### Option A: Single Trading Agent
```
One Agent → Scans → Decides → Trades → Reports
```
Simple but limited. One brain doing everything.

### Option B: Multi-Agent Team (Recommended) ✅
```
Hikari (Chief of Staff) — Orchestrator
    ├── Quant Agent — Strategy, backtesting, signals
    ├── Trader Agent — Execution, order management, risk
    └── Analyst Agent — News, sentiment, watchlist intel
```

### Why Multi-Agent?

1. **Separation of concerns** — The agent analyzing data shouldn't be the same one placing orders. Different skills, different risk profiles.

2. **Kill switch isolation** — If the Trader goes rogue, Hikari can kill it without losing the Quant's analysis.

3. **Parallel processing** — Quant can be backtesting while Trader is executing while Analyst is scanning Twitter.

4. **Matches how real trading desks work:**
   - Quant desk builds the models
   - Traders execute
   - Research provides intel

## Proposed Architecture

### Agent 1: Quant (The Brain) 🧠
- **Job:** Generate trading signals
- **Inputs:** Schwab market data, price history, technical indicators
- **Outputs:** Buy/sell signals with confidence scores
- **Runs:** Pre-market scan (8am), intraday watchlist updates
- **Model:** Can run on a cheaper model (Sonnet) — it's math, not creativity

### Agent 2: Trader (The Hands) ✋
- **Job:** Execute trades on Alpaca
- **Inputs:** Signals from Quant
- **Outputs:** Order confirmations, P&L tracking
- **Guardrails:**
  - Max position size
  - Daily loss limit → auto-shutdown
  - Stop-loss on every trade
  - No trading without a signal from Quant
- **Model:** Can run on Flash — needs speed, not deep thinking

### Agent 3: Analyst (The Eyes) 👁️
- **Job:** Sentiment analysis, news monitoring
- **Inputs:** Twitter watchlist, financial news, earnings calendar
- **Outputs:** Sentiment scores, breaking news alerts, "avoid" flags
- **Runs:** Continuous during market hours
- **Model:** Sonnet — needs to understand nuance

### Hikari (Orchestrator) 🏮
- **Job:** Coordinate all agents, report to Gabe, emergency controls
- **Already exists** — that's me
- **I receive:** Signals, trades, alerts from all agents
- **I send:** Morning briefing, trade notifications, daily P&L to Telegram

## Data Flow
```
Schwab API ──→ Quant Agent ──→ Signals
                                  ↓
Twitter ──→ Analyst Agent ──→ Sentiment ──→ Signal Filter
                                              ↓
                                         Trader Agent ──→ Alpaca API
                                              ↓
                                         Hikari ──→ Telegram (Gabe)
```

## Risk Management (Non-Negotiable)
- Max single position: 10% of portfolio ($50 on $500)
- Max daily loss: 5% of portfolio ($25 on $500)
- Auto-shutdown if daily loss hit
- Stop-loss on EVERY trade (2-3% below entry)
- No overnight positions initially (day trading only)
- All trades logged with reasoning
- Gabe can kill any agent via Telegram command

## Phase 1 Simplified (Week 1)
Start with just ONE agent that does it all (simpler to debug):
- Morning: Scan Schwab movers → pick top candidates
- Confirm momentum with technicals
- Paper trade via Alpaca
- Report to Hikari → Telegram

Then split into multi-agent as we prove the strategy works.

## Model Assignments
| Alias | Model | Role | Cost |
|-------|-------|------|------|
| `grok4` | Grok 4 | Trading decisions (won Alpha Arena live trading) | $3/$15 per M |
| `grok4-fast` | Grok 4.1 Fast | Real-time execution, fast decisions | $0.20/$0.50 per M |
| `codex` | GPT-5.3 Codex | Strategy code writing, backtesting | ~$2/$8 per M |
| `sonnet` | Sonnet 4.5 | Sentiment analysis, nuance reading | ~$3/$15 per M |
| `gemini-flash` | Gemini 3 Flash | Data crunching, structured output | Cheapest |
| `opus` | Opus 4.6 (Hikari) | Orchestration, reporting, Gabe comms | Premium |

## Credentials Stored
- Alpaca API Key: `~/.openclaw/credentials/alpaca-api-key`
- Alpaca Secret: `~/.openclaw/credentials/alpaca-secret-key`
- Schwab App Key: `~/.openclaw/credentials/schwab-app-key`
- Schwab Secret: `~/.openclaw/credentials/schwab-secret`
- Schwab OAuth Token: `~/.openclaw/credentials/schwab-token.json`

---
*Created: 2026-02-07*
