# TRADING-TASKS.md — Nagomi Trading Project Tracker

## Phase 1: Foundation ✅
- [x] Connect Alpaca API (paper $100K, live ready)
- [x] Connect Schwab API (OAuth, market data confirmed)
- [x] Store credentials securely (~/.openclaw/credentials/)
- [x] Build agent team (Hikari, Kōji, Sora, Mika)
- [x] Agent identity isolation (AGENT-STANDARD.md)
- [x] Install Ollama + 3 local models (redundancy)
- [x] Multi-provider fallback chains for all agents

## Phase 2: Trading Infrastructure ✅
- [x] Project repo: ~/Projects/nagomi-trading (git)
- [x] Clean project structure (src/, tests/, docs/, archive/)
- [x] Config module (credentials from files, no hardcoded secrets)
- [x] Schwab client wrapper (auth, quotes, orders)
- [x] Alpaca client wrapper (auth, quotes, orders, paper)
- [x] Unified TradingClient interface
- [x] Position tracking + P&L calculation
- [x] CLI tool (quotes, positions, orders, schwab-auth)
- [x] pyproject.toml (pip install -e .)
- [x] Unit tests (13/13 passing)
- [x] Architecture + data flow diagrams

## Phase 3: Validation ← WE ARE HERE
- [x] Smoke test: Alpaca paper quotes via CLI (AAPL $277.50, MSFT $401.24, NVDA $185.51)
- [x] Smoke test: Alpaca paper order via CLI (AAPL buy 1 share — accepted ✅)
- [x] Smoke test: Schwab quotes via CLI (AAPL $277.25, MSFT $403.15, NVDA $185.19, TSLA $411.74)
- [x] Fix Schwab client: auth signature, token expiry messages, lazy account hash
- [x] Push to GitHub (gabrielrojasnyc/nagomi-trading — private, 7 commits)

## Phase 4: Strategy ✅
- [x] Mika: initial market research (bullish/recovery, Dow 50K, small-cap value swings)
- [x] Define asset classes: equities + options (L3) + crypto (62 pairs, 24/7)
- [x] Define strategy: multi-asset daily alpha (swings, options income, crypto overnight)
- [x] Define risk rules: -4%/-6% stops, +8%/+12% targets, 5-day time stop
- [x] Sora: reviewed, challenged stale prices, tightened risk, approved SPB + XLF
- [x] Tier 1 quant tools installed (pandas-ta, vectorbt, yfinance, finvizfinance)
- [x] Agent memories updated with full trading universe + daily mandate

## Phase 5: Paper Trading
- [ ] Sora: first paper trade through infrastructure
- [ ] Run paper portfolio for 2 weeks minimum
- [ ] Track P&L daily
- [ ] Mika: post-trade analysis on each trade
- [ ] Refine strategy based on paper results

## Phase 6: Agent Pipeline
- [ ] Wire Mika → Sora (research → trading signals)
- [ ] Wire Sora → portfolio updates → Mika (feedback loop)
- [ ] Automated daily market brief from Mika
- [ ] Automated trade logging and reporting
- [ ] Hikari oversight dashboard

## Phase 7: Live Trading
- [ ] Review paper trading track record (min 2 weeks)
- [ ] Gabe approval to go live
- [ ] Deploy $500 to Alpaca live
- [ ] Live position monitoring
- [ ] Risk alerts and daily P&L reports

---

*Created: 2026-02-07 by Hikari*
*Last updated: 2026-02-07*
