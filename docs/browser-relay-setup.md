# Browser Relay Setup Guide

## What is Browser Relay?
The OpenClaw Browser Relay allows agents to control Chrome remotely for:
- Twitter/X monitoring
- Website automation
- Visual data extraction
- Form filling and navigation

## Setup Steps

### 1. Chrome Profile (One-time setup)
Chrome must be running with the **"openclaw"** profile:

```bash
# Launch Chrome with OpenClaw profile
open -na "Google Chrome" --args --profile-directory="openclaw"
```

### 2. Auto-Launch (Now Configured)
Cron job runs at **7:45 AM weekdays** to ensure Chrome is ready before the 8 AM Twitter briefing.

Script location: `~/.openclaw/scripts/chrome-pre-twitter.sh`
Cron job: `chrome:pre-twitter-launch`

### 3. Extension Setup (Critical)
Each morning, you need to **attach the tab** to enable relay:

1. Chrome opens automatically (or manually)
2. Navigate to x.com (or any site you want automated)
3. Click the **OpenClaw Browser Relay** extension icon
4. Click **"Attach Tab"** (badge turns ON)
5. The agent can now control the browser

### 4. Verification
Test the relay:
```bash
# Check if Chrome is running with correct profile
pgrep -f "Google Chrome.*openclaw"

# Check logs
tail -f /tmp/openclaw/chrome-auto-launch.log
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "browser had relay issues" in cron | Chrome wasn't running or tab wasn't attached |
| Extension icon not visible | Install OpenClaw Chrome extension from Chrome Web Store |
| Badge doesn't turn ON | Click extension, then click "Attach Tab" on desired tab |
| Wrong profile | Make sure Chrome launches with `--profile-directory=openclaw` |

## Daily Workflow

**7:45 AM** - Chrome auto-launches (cron)
**7:50 AM** - You click extension, attach tab
**8:00 AM** - Twitter briefing runs via browser relay

## Fallback Mode
If relay fails, agent automatically falls back to:
- `web_search` for finding content
- `web_fetch` for extracting articles
- Still produces quality briefings, just not from live Twitter feed

## Next Run
Tomorrow at 7:45 AM, Chrome will auto-launch. Just remember to click the extension badge to attach the tab before 8 AM.
