Subject: [Security] OpenClaw Configuration File Exposed in Public Repository

Hi there,

I'm reaching out as a security researcher working on OpenClaw tooling. I discovered that an OpenClaw configuration file appears to be exposed in your public GitHub repository.

## What Was Found

**Repository:** `nomad3/openclaw-k8s`
**File:** `config.json`
**Finding Type:** OpenClaw configuration file in public repository
**Severity:** HIGH

## Why This Matters

While analyzing the file showed **no actual secrets were exposed** (good job using environment variables!), having configuration files in public repositories is still a security risk because:

1. **Information disclosure** — Reveals your infrastructure setup, agent names, and integration patterns
2. **Future exposure risk** — Someone might accidentally commit secrets later
3. **Attack surface mapping** — Helps attackers understand your system architecture

## How I Found This

I built and ran the **OpenClaw Security Exposure Scanner**, a tool that:
- Searches GitHub for OpenClaw-related configuration patterns
- Uses read-only access (no credentials tested or exploited)
- Identifies potential exposures for responsible disclosure
- Follows a 90-day disclosure timeline

The scanner uses search patterns like:
```
filename:config.json "openclaw" "api_key"
```

## Recommended Fix

### Remove from Repository

```bash
# Add to .gitignore
echo "config.json" >> .gitignore

# Remove from git history
git rm --cached config.json
git commit -m "Remove OpenClaw config from repository"
git push
```

### Move to Environment Variables

Instead of hardcoding in config.json:
```bash
export OPENCLAW_API_KEY="your_key_here"
```

## Immediate Actions

1. ✅ Review the exposed file — Confirm no secrets are present
2. ✅ Add `.gitignore` — Prevent future accidental commits
3. ✅ Rotate any credentials — If the config ever contained real keys

## Timeline

| Date | Action |
|------|--------|
| **Today (2026-02-12)** | Initial notification |
| **+30 days** | Friendly reminder |
| **+60 days** | Second reminder |
| **+75 days** | Final warning |
| **+90 days** | Public disclosure (no sensitive details) |

I'm happy to help verify your fix or answer questions.

Thanks for taking security seriously!

---
*Sent via OpenClaw Security Exposure Scanner v1.0.0*
*This is a responsible disclosure notification. No credentials were tested or exploited.*
