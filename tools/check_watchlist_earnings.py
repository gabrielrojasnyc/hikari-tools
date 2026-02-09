#!/usr/bin/env python3
"""
Check earnings for watchlist symbols
Use in morning brief to flag symbols to avoid
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from earnings_calendar import EarningsCalendar

# Default watchlist - customize as needed
WATCHLIST = [
    "AAPL", "MSFT", "NVDA", "GOOGL", "AMZN",
    "TSLA", "META", "AMD", "NFLX", "CRM",
    "SPY", "QQQ", "IWM", "XLF", "XLK"
]

def check_watchlist():
    """Check all watchlist symbols for upcoming earnings."""
    try:
        cal = EarningsCalendar()
    except Exception as e:
        print(f"Error initializing earnings calendar: {e}")
        sys.exit(1)
    
    print("=== Watchlist Earnings Check ===\n")
    
    dangerous = []
    safe = []
    
    for symbol in WATCHLIST:
        try:
            avoid, reason = cal.should_avoid_trading(symbol)
            if avoid:
                dangerous.append((symbol, reason))
                print(f"🔴 {symbol}: {reason}")
            else:
                earnings = cal.check_symbol(symbol)
                if earnings:
                    days = (datetime.strptime(earnings['date'], '%Y-%m-%d') - datetime.now()).days
                    if days > 7:
                        safe.append(symbol)
                    else:
                        print(f"🟡 {symbol}: Earnings in {days} days ({earnings['date']})")
                else:
                    safe.append(symbol)
        except Exception as e:
            print(f"⚠️ {symbol}: Error checking - {e}")
    
    print(f"\n=== Summary ===")
    print(f"Safe to trade ({len(safe)}): {', '.join(safe[:10])}{'...' if len(safe) > 10 else ''}")
    print(f"Avoid ({len(dangerous)}): {', '.join([s[0] for s in dangerous])}")
    
    if dangerous:
        print(f"\n⚠️ {len(dangerous)} symbols have earnings within 2 days — AVOID THESE")
        sys.exit(1)  # Exit error if any dangerous
    else:
        print("\n✅ All clear — no earnings within 2 days")
        sys.exit(0)

if __name__ == "__main__":
    from datetime import datetime
    check_watchlist()
