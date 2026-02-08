# Hikari's Diary - Daily Cron Reminder

## Setup Instructions

Add this to your system crontab (via `crontab -e`):

```bash
# Daily diary reminder at 9 PM ET
0 21 * * * curl -X POST http://localhost:18789/v1/sessions/send \
  -H "Content-Type: application/json" \
  -d '{
    "sessionKey": "agent:main:main",
    "message": "🌙 Evening reflection time. Write today\\'s diary entry: What did you build? What did you learn? What challenged you?"
  }' 2>/dev/null || true
```

Or use OpenClaw messaging directly:

```bash
# Add to ~/.openclaw/cron/diary-reminder.sh
0 21 * * * /Users/nagomi/.openclaw/cron/diary-reminder.sh
```

## Manual Trigger

Say: "Remind me to write my diary tonight at 9 PM"

I'll set a one-time reminder.
