# Trading Infrastructure Build Plan
**Date:** Feb 12, 2026  
**Status:** Learning system deployed, execution engine needed  
**Research Source:** Deep Dive 2 & 3 + LangGraph analysis

---

## EXECUTIVE SUMMARY

**What we have:** Active training system (learning from trades)  
**What's missing:** Deterministic execution engine (protecting capital)  
**Priority:** Build "Hands" first, then enhance "Brain"

---

## PHASE 1: THE "HANDS" (Weekend Build)

### Goal: Capital Protection Through Deterministic Execution

**Architecture:**
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  WebSocket  │────→│  Indicator  │────→│   Intent    │
│   Stream    │     │   Engine    │     │   Listener  │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                    ┌─────────────┐           │
                    │   OCO Order │←──────────┘
                    │  Execution  │
                    └─────────────┘
```

### Components to Build:

**1. `hands/execution_engine.py`**
- Async WebSocket to Alpaca (using `alpaca-trade-api` streaming)
- Real-time 1m/5m OHLCV calculation
- Rolling VWAP, RSI, MACD (not querying — calculating)
- Zero-Trust Intent Validator

**2. `hands/risk_guardian.py`**
```python
HARD_LIMITS = {
    "MAX_RISK_PER_TRADE": 0.02,      # 2% max
    "MAX_POSITION_SIZE": 0.10,        # 10% of equity
    "MAX_SLIPPAGE_PCT": 0.001,        # 0.1%
    "TTL_SECONDS": 15,                # Intent expires after 15s
    "MAX_DAILY_TRADES": 5,
    "MAX_CONCURRENT": 3
}
```
- Validates EVERY intent before execution
- Rejects if any limit breached
- Logs all rejections for agent learning

**3. `hands/intent_listener.py`**
- Watch `/intents/` folder for new JSON files
- Parse structure:
```json
{
  "intent_id": "uuid",
  "asset": "SOL/USD",
  "direction": "LONG",
  "trigger_price": 142.50,
  "take_profit": 148.00,
  "stop_loss": 139.50,
  "confidence": 0.85,
  "strategy_ref": "rule_4_rsi_divergence",
  "timestamp": "2026-02-12T19:15:00Z",
  "ttl_seconds": 15
}
```
- Execute OCO bracket order instantly (<50ms)

**4. `hands/bridge.py`**
- Communication layer between "Brain" (OpenClaw) and "Hands"
- Redis or file-based queue
- JSON schema validation

### Success Criteria:
- [ ] Sub-50ms execution latency
- [ ] 100% of risk limit violations rejected
- [ ] Intent TTL enforced (no stale trades)
- [ ] All trades logged to SQLite

### Tech Stack:
- Python 3.11+
- `alpaca-trade-api` (streaming)
- `asyncio` + `aiofiles`
- `pandas-ta` (indicators)
- `pydantic` (JSON validation)

---

## PHASE 2: THE "BRAIN" (Next Week)

### Goal: Intelligence Through Structured Memory

**1. `memory/episodic_db.py`** (SQLite Enhancement)
```sql
CREATE TABLE trade_episodes (
  id TEXT PRIMARY KEY,
  asset TEXT NOT NULL,
  direction TEXT CHECK(direction IN ('LONG', 'SHORT')),
  entry_price REAL,
  exit_price REAL,
  pnl_pct REAL,
  
  -- Market state at entry (snapshot)
  vix_at_entry REAL,
  rsi_14 REAL,
  macd_signal REAL,
  funding_rate REAL,
  volume_24h REAL,
  
  -- Agent reasoning
  agent_thesis TEXT,
  strategy_ref TEXT,
  confidence_score REAL,
  
  -- Outcome
  exit_reason TEXT CHECK(exit_reason IN ('TP', 'SL', 'TIME', 'LIQUIDATED')),
  expected_pnl REAL,
  actual_pnl REAL,
  
  -- Metadata
  opened_at TIMESTAMP,
  closed_at TIMESTAMP,
  regime TEXT  -- from regime detector
);
```

**2. `memory/semantic_db.py`** (ChromaDB)
- Vector embeddings of market conditions
- Similarity search: "Find trades with VIX>20, RSI>70"
- Dimension: 768 (using all-MiniLM-L6-v2)
- Query before trade: Get win rate of similar setups

**3. `strategy/strategy_dna.yaml`**
```yaml
version: "1.0.0"
last_updated: "2026-02-12T19:00:00Z"

# Entry rules
entry:
  sol:
    rsi_buy_threshold: 32
    rsi_sell_threshold: 68
    min_volume_24h: 1000000
  eth:
    rsi_buy_threshold: 35
    max_hold_time_minutes: 120

# Risk management
risk:
  max_risk_per_trade_pct: 2.0
  max_position_size_pct: 10.0
  max_slippage_pct: 0.1
  default_confidence_threshold: 0.75

# Exit rules
exit:
  trailing_stop_enabled: true
  trailing_stop_pct: 2.0
  time_based_exit_minutes: 60

# Learning weights (updated by nightly loop)
learning:
  confidence_calibration:
    bucket_0.60_0.70: 0.65  # Actual win rate
    bucket_0.70_0.80: 0.72
    bucket_0.80_0.90: 0.81
```

**4. `brain/query_memory.py`**
```python
def query_similar_setups(
    asset: str,
    vix: float,
    rsi: float,
    lookback_days: int = 30
) -> dict:
    """
    Query episodic + semantic memory
    Returns: {'similar_trades': int, 'win_rate': float, 'avg_pnl': float}
    """
```

---

## PHASE 3: THE REFLECTION LOOP (Enhance Existing)

### Goal: Continuous Learning Without Data Poisoning

**Enhance existing `learning-loop.js`:**

1. **Nightly Review Mode (23:30 UTC)**
   - Query: "Today's trades where confidence > 0.75 but lost"
   - Analyze: Were stops too tight? Fake breakouts?
   - Output: Proposed `strategy_dna.yaml` adjustments

2. **Backtesting Gate**
   - Before committing strategy changes:
   - Run vectorbt backtest on last 60 days
   - Metric: Sharpe Ratio > 1.5, Max Drawdown < 10%
   - If pass: Commit to `strategy_dna.yaml`
   - If fail: Log rejection, keep old params

3. **Confidence Calibration**
   - Weekly recalculation of confidence buckets
   - If 0.70 confidence signals only win 55% → adjust threshold

---

## PHASE 4: INTERRUPT ARCHITECTURE (Future)

### Goal: Replace Polling with Event-Driven

**Current:** Cron-based (6 AM, 9:25 AM, 12 PM, 3:55 PM)  
**Future:** WebSocket interrupts

```
Market Data Stream
       ↓
[Hands] Detects setup (volume spike + RSI diverge)
       ↓
POST to OpenClaw webhook: "Evaluate SOL setup"
       ↓
[Brain] Queries memory → Generates intent JSON
       ↓
[Hands] Validates → Executes OCO
```

**Benefits:**
- No wasted API calls during quiet markets
- Sub-second response to real setups
- Lower token burn

---

## IMPLEMENTATION ORDER

### This Weekend (Sat-Sun):
1. [ ] Build `hands/` directory structure
2. [ ] Implement `execution_engine.py` with Alpaca WebSocket
3. [ ] Implement `risk_guardian.py` with hard limits
4. [ ] Test with paper trading (100 trades)

### Next Week (Mon-Fri):
1. [ ] Add ChromaDB semantic memory
2. [ ] Create `strategy_dna.yaml` 
3. [ ] Connect Sora to query memory before trading
4. [ ] Enhance nightly learning loop with backtesting gate

### Following Weekend:
1. [ ] Stress test with high volatility simulation
2. [ ] Tune risk parameters
3. [ ] Document architecture

---

## SUCCESS METRICS

| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| Execution latency | 2-5s (API polling) | <50ms | Weekend |
| Risk limit enforcement | None (trust AI) | 100% | Weekend |
| Strategy updates validated | None | 100% backtested | Week 2 |
| Memory query time | N/A | <100ms | Week 1 |
| Win rate (similar setups) | Unknown | Tracked | Week 1 |

---

## RISK MITIGATION

**If "Hands" build fails:**
- Fall back to current cron-based system
- Add hard stops at exchange level
- Reduce position sizes 50%

**If backtesting gate delays strategy updates:**
- Use 30-day lookback instead of 60
- Parallelize with multiprocessing
- Cache historical data

---

## NEXT ACTION

**Decision needed:** Start with "Hands" this weekend?

If yes, I'll:
1. Create `hands/` directory
2. Implement WebSocket connection to Alpaca
3. Build risk guardian with your specified limits
4. Test end-to-end with paper trading

**Estimated time:** 6-8 hours of focused work  
**Deliverable:** Working execution engine by Sunday night

---

*Ready to start?*
