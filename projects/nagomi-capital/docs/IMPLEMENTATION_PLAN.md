# Nagomi Capital Implementation Plan

## Sprint 1: Foundation (Days 1-3)

### Day 1: Project Setup & X Integration
- [ ] Initialize TypeScript project
- [ ] Set up Twitter API v2 client
- [ ] Create X account configuration (30 accounts)
- [ ] Build tweet stream listener
- [ ] Implement signal extraction for crypto whale alerts

### Day 2: Data Layer & Signal Processing
- [ ] Connect Alpaca API (paper trading)
- [ ] Build market data fetcher
- [ ] Create signal database (SQLite)
- [ ] Implement parsers for each asset class:
  - Equity: price action, volume, gaps
  - Options: flow, sweeps, OI changes
  - Crypto: whale moves, on-chain, funding

### Day 3: Agent Core (Mika)
- [ ] Implement BullMika sub-agent
- [ ] Implement BearMika sub-agent  
- [ ] Implement FlowMika sub-agent
- [ ] Build JudgeMika scoring system
- [ ] Create 3-minute debate orchestration

## Sprint 2: Execution & Risk (Days 4-6)

### Day 4: Sora (Trader)
- [ ] Connect to Alpaca paper API
- [ ] Build order construction logic
- [ ] Implement confidence-weighted sizing
- [ ] Create position tracking
- [ ] Add P&L calculation

### Day 5: Risk & Kill Criteria
- [ ] Implement Peta policy checks
- [ ] Build kill criteria monitoring:
  - 3-loss pause
  - Drawdown limits
  - Confidence floor
- [ ] Create emergency stop functionality
- [ ] Add Telegram alerts

### Day 6: Integration & Testing
- [ ] Wire up full flow: X → Mika → Sora → Alpaca
- [ ] Build dry-run mode (no execution)
- [ ] Create test scenarios
- [ ] Run 10 paper trades end-to-end

## Sprint 3: Refinement (Days 7-10)

### Day 7: Signal Quality
- [ ] Review first 10 trades
- [ ] Tune signal extraction weights
- [ ] Adjust debate prompts
- [ ] Optimize confidence calibration

### Day 8: Memory & Learning
- [ ] Implement trade logging
- [ ] Build performance tracking
- [ ] Create "lessons learned" extraction
- [ ] Add meta-learning loop

### Day 9: Monitoring
- [ ] Build dashboard (CLI or web)
- [ ] Add real-time P&L tracking
- [ ] Create daily report generator
- [ ] Set up alerting

### Day 10: Documentation & Hardening
- [ ] Document all systems
- [ ] Add error handling
- [ ] Build recovery procedures
- [ ] Stress test with edge cases

## Success Metrics

- [ ] System runs 5 consecutive days without error
- [ ] 20 paper trades executed
- [ ] Win rate > 45% (validation target)
- [ ] Average confidence score correlates with win rate
- [ ] All kill criteria trigger correctly in tests

## Files to Create

```
projects/nagomi-capital/
├── README.md
├── package.json
├── tsconfig.json
├── .env.example
├── src/
│   ├── index.ts                 # Main entry
│   ├── config/
│   │   ├── accounts.ts          # X account lists
│   │   ├── prompts.ts           # Agent prompts
│   │   └── thresholds.ts        # Kill criteria
│   ├── ingestion/
│   │   ├── x/
│   │   │   ├── stream.ts        # X API client
│   │   │   ├── parsers.ts       # Signal extractors
│   │   │   └── accounts.ts      # 30 account configs
│   │   └── market/
│   │       ├── alpaca.ts        # Market data
│   │       └── schwab.ts        # Backup data
│   ├── agents/
│   │   ├── mika/
│   │   │   ├── debate.ts        # 3-min debate loop
│   │   │   ├── bull.ts          # Bull sub-agent
│   │   │   ├── bear.ts          # Bear sub-agent
│   │   │   ├── flow.ts          # Flow sub-agent
│   │   │   └── judge.ts         # Judge scoring
│   │   └── sora/
│   │       ├── execute.ts       # Trade execution
│   │       ├── sizing.ts        # Position sizing
│   │       └── risk.ts          # Pre-trade checks
│   ├── execution/
│   │   ├── alpaca.ts            # Paper trading
│   │   └── peta.ts              # Policy checks
│   ├── memory/
│   │   ├── database.ts          # SQLite setup
│   │   ├── trades.ts            # Trade logging
│   │   └── signals.ts           # Signal history
│   └── utils/
│       ├── logger.ts
│       └── telegram.ts
├── tests/
│   ├── debate.test.ts
│   ├── signals.test.ts
│   └── execution.test.ts
└── docs/
    ├── architecture.md
    ├── signals.md
    └── runbook.md
```

## Daily Standup Template

**What was done:**
**Blockers:**
**Next:**
