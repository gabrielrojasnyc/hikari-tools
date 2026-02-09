#!/bin/bash
# Pre-Twitter-Brief Chrome Launcher
# Runs at 7:45 AM to ensure Chrome is ready before 8 AM Twitter briefing

CHROME_APP="/Applications/Google Chrome.app"
PROFILE_NAME="openclaw"
LOG_FILE="/tmp/openclaw/chrome-auto-launch.log"

mkdir -p /tmp/openclaw

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting Chrome auto-launch..." >> "$LOG_FILE"

# Check if Chrome is already running with OpenClaw profile
CHROME_RUNNING=$(pgrep -f "Google Chrome.*$PROFILE_NAME" | wc -l)

if [ "$CHROME_RUNNING" -eq 0 ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Chrome not running. Launching..." >> "$LOG_FILE"
    
    # Launch Chrome with OpenClaw profile
    open -na "Google Chrome" --args \
        --profile-directory="$PROFILE_NAME" \
        --no-first-run \
        --no-default-browser-check \
        --start-maximized \
        https://x.com/home &
    
    # Wait for Chrome to initialize
    sleep 5
    
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Chrome launched" >> "$LOG_FILE"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Chrome already running with OpenClaw profile" >> "$LOG_FILE"
fi

# Output status
echo "Chrome status: $(pgrep -x 'Google Chrome' | wc -l) processes"
echo "Log: $LOG_FILE"
