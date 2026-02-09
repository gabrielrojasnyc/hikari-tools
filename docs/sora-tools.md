# TOOLS.md - Sora's Local Notes

## Trading CLI (PRIMARY TOOL)
**Always activate venv first:**
```bash
cd ~/Projects/nagomi-trading && source .venv/bin/activate
```

### Get Quotes
```bash
python -m openclaw.cli --provider schwab quotes AAPL MSFT NVDA SPB XLF
python -m openclaw.cli --provider alpaca --paper quotes AAPL MSFT
```

### Check Positions
```bash
python -m openclaw.cli --provider alpaca --paper positions
```

### Place Paper Orders
```bash
# Market order
python -m openclaw.cli --provider alpaca --paper order SPB --side buy --qty 3

# Limit order
python -m openclaw.cli --provider alpaca --paper order SPB --side buy --qty 3 --type limit --limit 75.50

# Sell
python -m openclaw.cli --provider alpaca --paper order SPB --side sell --qty 3

# GTC (good til cancelled)
python -m openclaw.cli --provider alpaca --paper order XLF --side buy --qty 5 --type limit --limit 52.80 --tif gtc
```

### Place Live Orders (REQUIRES HIKARI APPROVAL FOR >$100)
```bash
python -m openclaw.cli --provider alpaca order AAPL --side buy --qty 3
```

---

## Schwab API (Advanced Trading Data)
For pre-trade analysis, use the Schwab client directly.

### Price History (Support/Resistance, Trend Analysis)
```python
from datetime import datetime, timedelta
resp = client.get_price_history_every_day('SPB', start_datetime=datetime.now()-timedelta(days=180), end_datetime=datetime.now())
candles = resp.json().get('candles', [])
# Each: open, high, low, close, volume, datetime
```

### Options Chain (For Hedging / Options Strategies)
```python
resp = client.get_option_chain('AAPL', contract_type=client.Options.ContractType.CALL, strike_count=5)
# callExpDateMap → expiry → strike → bid, ask, volume, greeks
```

### Fundamentals (Valuation Check Before Entry)
```python
resp = client.get_instruments(['SPB'], client.Instrument.Projection.FUNDAMENTAL)
# peRatio, epsTTM, dividendYield, marketCap, bookValuePerShare
```

### Market Movers (Opportunity Scanning)
```python
resp = client.get_movers(client.Movers.Index.SPX, sort_order=client.Movers.SortOrder.PERCENT_CHANGE_UP)
```

### Schwab Client Setup
```python
import schwab.auth, os
tp = os.path.expanduser('~/.openclaw/credentials/schwab-token.json')
ak = open(os.path.expanduser('~/.openclaw/credentials/schwab-app-key')).read().strip()
s = open(os.path.expanduser('~/.openclaw/credentials/schwab-secret')).read().strip()
client = schwab.auth.client_from_token_file(tp, ak, s)
```

---

## Pre-Trade Checklist
Before every trade, pull:
1. ✅ Live quote (CLI)
2. ✅ **Earnings check** — Avoid if earnings in 2 days (see below)
3. ✅ 6-month price history (support/resistance levels)
4. ✅ Fundamentals (PE, EPS — is it overvalued?)
5. ✅ Options chain (if relevant — implied vol tells you expected move)
6. ✅ Recent news (web search)

## Earnings Calendar (CRITICAL)
**Always check earnings before trading — 10-20% overnight moves are common**

### Check Single Symbol
```bash
python3 ~/Projects/nagomi-trading/tools/earnings/earnings_calendar.py check SYMBOL
```

**Returns exit code 1 if earnings within 2 days** — use in scripts:
```bash
if python3 earnings_calendar.py check NVDA; then
    # Safe to trade
    python -m openclaw.cli --provider alpaca --paper order NVDA --side buy --qty 5
else
    # Skip — earnings soon
    echo "Skipping NVDA — earnings incoming"
fi
```

### List Upcoming Earnings
```bash
python3 ~/Projects/nagomi-trading/tools/earnings/earnings_calendar.py list
```

### Integration Example
```bash
# In trading script
SYMBOL="AAPL"

# Check earnings first
if ! python3 ~/Projects/nagomi-trading/tools/earnings/earnings_calendar.py check "$SYMBOL" 2>/dev/null; then
    echo "⚠️ $SYMBOL has earnings soon — SKIPPING"
    exit 0
fi

# Proceed with trade logic
python -m openclaw.cli --provider alpaca --paper quotes "$SYMBOL"
# ... rest of trade logic
```

---

## Trading Platforms

### Alpaca
- Paper account: $100K paper, ACTIVE
- Live account: Connected (budget: $500)
- API credentials: `~/.openclaw/credentials/alpaca-api-key` + `alpaca-secret-key`

### Schwab
- OAuth connected, market data live
- API credentials: `~/.openclaw/credentials/schwab-app-key` + `schwab-secret`
- Token: `~/.openclaw/credentials/schwab-token.json` (auto-refreshes daily 8am ET)

## Risk Parameters
- Max single position: 50% of portfolio ($250 on $500)
- Daily loss limit: 3%
- Stop loss: Required on every trade (-4% to -6%)
- Take profit: +8% to +12%
- Time stop: 5 trading days max
- Paper minimum: 2 weeks before live

---

_Pull data before you trade. Always._
