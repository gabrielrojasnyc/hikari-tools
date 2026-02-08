# Trading Agent — Project Plan

## Goal
Autonomous trading agent that makes money. Start with paper trading, graduate to real money.

## Status: Phase 0 — Planning

## Phases
1. **Phase 0 — Planning & Research** (now)
   - Pick market (stocks/crypto/both)
   - Research broker APIs and paper trading options
   - Define initial strategy
   - Set up agent architecture
   
2. **Phase 1 — Paper Trading** (Week 1-2)
   - Build agent with broker API (paper mode)
   - Implement strategy
   - Track P&L, win rate, max drawdown
   - Daily reports to Gabe
   
3. **Phase 2 — Refinement** (Week 3-4)
   - Analyze paper trading results
   - Tune strategy parameters
   - Add sentiment analysis from Twitter watchlist
   - Stress test with historical data
   
4. **Phase 3 — Live Trading** (Month 2)
   - Start with small real money
   - Hard guardrails: max position size, daily loss limit, kill switch
   - Gabe approves every trade for first week
   - Then autonomous with alerts

## Architecture
- **Agent:** Dedicated OpenClaw agent (isolated from main)
- **Broker API:** TBD (Alpaca for stocks, Coinbase/Binance for crypto)
- **Strategy:** TBD
- **Signals:** Twitter sentiment, technical indicators, news
- **Guardrails:**
  - Max single position: TBD% of portfolio
  - Max daily loss: TBD% of portfolio
  - Kill switch via Telegram command
  - All trades logged with reasoning

## Broker API Options

### Stocks
- **Alpaca** — Free API, paper trading built in, commission-free
  - REST + WebSocket, Python SDK
  - Great for algo trading beginners
- **Interactive Brokers** — Pro-tier, more markets
- **Tradier** — Simple API, options support

### Crypto
- **Coinbase Advanced** — Well-documented API, regulated
- **Binance** — Most liquid, comprehensive API
- **Kraken** — Solid API, good reputation

### Both
- **Alpaca** now supports crypto too

## Potential Strategies
1. **Momentum** — Follow strong trends, ride winners
2. **Mean Reversion** — Buy dips, sell rips in range-bound assets
3. **Sentiment-Driven** — Trade based on Twitter/news signals from watchlist
4. **Earnings Plays** — Position before/after earnings (stocks only)
5. **Hybrid** — Sentiment for direction + technical for timing

## Edge Analysis
What could give us an actual edge:
- Real-time sentiment from 24 watchlist accounts (VCs, AI leaders, investors)
- Speed: AI processes news/tweets faster than humans
- Discipline: No emotions, follows the rules
- 24/7 monitoring (especially for crypto)

## Decisions Made
- [x] Market: **Stocks**
- [x] Starting budget: **$500**
- [x] Broker: **Alpaca** (paper first, then live)
- [ ] Strategy preference
- [ ] Risk tolerance (conservative/moderate/aggressive)

## Alpaca Setup ✅
- Dashboard: https://app.alpaca.markets/dashboard/overview
- Paper API: https://paper-api.alpaca.markets
- Live API: https://api.alpaca.markets
- SDK: alpaca-py (Python)
- API Key: stored at ~/.openclaw/credentials/alpaca-api-key
- Secret: stored at ~/.openclaw/credentials/alpaca-secret-key
- Paper account: $100K cash, ACTIVE, connected and verified

## Schwab Setup ⏳ (pending approval)
- Developer portal: https://developer.schwab.com
- App name: Nagomi Studio
- Products: Market Data Production
- Callback URL: https://127.0.0.1
- App Key: stored at ~/.openclaw/credentials/schwab-app-key
- Secret: stored at ~/.openclaw/credentials/schwab-secret
- SDK: schwab-py (Python)
- Status: PENDING APPROVAL (may take 24-48hrs)
- OAuth2 flow needed after approval (one-time browser login)

---
*Created: 2026-02-07*
