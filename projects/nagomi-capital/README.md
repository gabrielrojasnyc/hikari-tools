# Nagomi Capital — AI-Native Trading System

> A multi-agent trading system that debates, reasons, and executes across day trading equities, options flow, and crypto.

## Architecture Overview

```
05:55 AM ┌─────────────────────────────────────┐
         │  Data Ingestion Layer               │
         │  • X/Twitter API (30 accounts)      │
         │  • Market data (Alpaca/Schwab)      │
         │  • On-chain metrics (crypto)        │
         └─────────────┬───────────────────────┘
                       │
06:00:00 ┌─────────────▼───────────────────────┐
         │  Mika (Analyst)                     │
         │  Spawns 3 sub-agents:               │
         │    • BullMika — Find long setups    │
         │    • BearMika — Find short setups   │
         │    • FlowMika — Context/flow data   │
         └─────────────┬───────────────────────┘
                       │
06:01:30 ┌─────────────▼───────────────────────┐
         │  90-Second Cross-Examination        │
         │  • Bear attacks Bull's thesis       │
         │  • Flow provides context            │
         │  • Bull defends or concedes         │
         └─────────────┬───────────────────────┘
                       │
06:03:00 ┌─────────────▼───────────────────────┐
         │  JudgeMika (Scoring)                │
         │  Outputs structured JSON:           │
         │    • Asset & direction              │
         │    • Conviction (1-10)              │
         │    • Risk (1-10)                    │
         │    • Position size (confidence-based)
         └─────────────┬───────────────────────┘
                       │
06:03:30 ┌─────────────▼───────────────────────┐
         │  Hikari (Coordination)              │
         │  • Forwards to Sora if confidence>6 │
         │  • Logs to memory                   │
         └─────────────┬───────────────────────┘
                       │
06:04:00 ┌─────────────▼───────────────────────┐
         │  Sora (Trader)                      │
         │  • Risk checks (Peta)               │
         │  • Position sizing                  │
         │  • Execution via Alpaca (paper)     │
         └─────────────────────────────────────┘
```

## Asset Classes

| Class | Signal Sources | Execution |
|-------|----------------|-----------|
| Day Trading (Equities) | Price action, volume, sector rotation, X sentiment | Alpaca paper |
| Options Flow | Unusual volume, sweeps, OI, IV rank | Alpaca paper (limited) |
| Crypto | Whale moves, on-chain flows, funding rates | Alpaca crypto |

## X Account Lists (30 Total)

### Equity Day Trading (10)
@modestproposal1 @dampedspring @Mr_Derivatives @choffstein @priceactionkim @peterlbrandt @moneytaur @madaznfootball @kazonomics @traderstewie

### Options Trading (10)
@OptionsHawk @unusual_whales @markflowchaser @jsbodycount @tradernickybat @cgcameron11 @patrickrooney @traderfuturist @fiftyonestreet @gcitrading

### Crypto Trading (10)
@lookonchain @whale_alert @CryptoCred @Pentoshi1 @SmartContracter @DonAlt @Ansem @ali_charts @woonomic @CredibleCrypto

## Confidence-Weighted Sizing

```
Confidence Score = Conviction / Risk
Position Size = Confidence Score × Base Position

Example:
- Conviction: 8
- Risk: 5
- Confidence Score: 1.6
- Base Position: $1,000
- Trade Size: $1,600
```

## Kill Criteria

| Trigger | Action |
|---------|--------|
| 3 consecutive losses same setup | Pause that signal type for 7 days |
| Drawdown >15% | Reduce size 50% |
| Liquidation cascade (BTC -8% in 1h) | Emergency stop all positions |
| Confidence <5 for 5 debates | Go to cash |
| Funding >0.1% (extreme long bias) | No longs, shorts only |

## Phase 1 Implementation

1. **X API Integration** — Connect and start tracking 30 accounts
2. **Signal Extraction** — Build parsers for each asset class
3. **3-Minute Debate** — Implement Mika sub-agent system
4. **Paper Execution** — Hook up Alpaca, no limits
5. **Kill Criteria** — Automation + Telegram alerts

## Budget & Limits

- **Paper Only** until Sharpe > 1.0 for 30 days
- **API Costs:** ~$500/month (Grok-4 + X API + data feeds)
- **Max Position:** Unlimited on paper
- **Daily Loss Limit:** $500 (soft, alerts only on paper)

## Status

- [ ] X API connected
- [ ] Account lists configured
- [ ] Signal parsers built
- [ ] Debate loop implemented
- [ ] Paper trading active
- [ ] Kill criteria automated

---

*Created: 2026-02-10*  
*Next Review: After first 20 paper trades*
