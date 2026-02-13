# OpenClaw Security Notification Log
**Date:** 2026-02-12
**Scanner:** OpenClaw Security Exposure Scanner v1.0.0
**Findings:** 20 HIGH severity config exposures
**Status:** ✅ 15 GitHub Issues Created

## Notification Recipients

| # | Repository | File | Status | Issue URL |
|---|-----------|------|--------|-----------|
| 1 | openclaw/skills | skills/s7cret/binance-enhanced/openclaw-config.json | ⚠️ Issues Disabled | N/A |
| 2 | Crissavino/carlitos-v2 | infra/openclaw/openclaw.config.json | ✅ Notified | https://github.com/Crissavino/carlitos-v2/issues/1 |
| 3 | digitalknk/openclaw-runbook | examples/sanitized-config.json | ✅ Notified | https://github.com/digitalknk/openclaw-runbook/issues/9 |
| 4 | curtisboadum/flowaudit-platform | openclaw/gateway/config.json5 | ✅ Notified | https://github.com/curtisboadum/flowaudit-platform/issues/1 |
| 5 | unityequilibrium/UnityEquilibriumTheory | openclaw-marketing/config/mcp_config.json | ✅ Notified | https://github.com/unityequilibrium/UnityEquilibriumTheory/issues/1 |
| 6 | vivekpal1/lobster-credit-playground | openclaw/openclaw.config.json | ✅ Notified | https://github.com/vivekpal1/lobster-credit-playground/issues/9 |
| 7 | starlink-awaken/mcp-openclaw | examples/mcp-config.json | ✅ Notified | https://github.com/starlink-awaken/mcp-openclaw/issues/2 |
| 8 | cloudzun/openclaw-skills-collection | openclaw-product-tracker/config.json | ✅ Notified | https://github.com/cloudzun/openclaw-skills-collection/issues/1 |
| 9 | AX-MCP/AX-CommunityWorkspaces | flavor-atlas/cookbooks/Heartland-Table/.clawdbot/mcporter-config.json | ✅ Notified | https://github.com/AX-MCP/AX-CommunityWorkspaces/issues/216 |
| 10 | explooosion/openclaw-docker | data/workspace/skills/weather/config.json | ✅ Notified | https://github.com/explooosion/openclaw-docker/issues/1 |
| 11 | GrahamMcBain/Propodcalw | config/hey-neighbor-config.json | ✅ Notified | https://github.com/GrahamMcBain/Propodcalw/issues/1 |
| 12 | nomad3/openclaw-k8s | config.json | ✅ Notified | https://github.com/nomad3/openclaw-k8s/issues/1 |
| 13 | NodeOps-app/skills | skills/createos/config/config.json | ✅ Notified | https://github.com/NodeOps-app/skills/issues/2 |
| 14 | openclaw/skills | skills/ashwaq06/createos/config/config.json | ⚠️ Issues Disabled | N/A |
| 15 | Demerzels-lab/elsamultiskillagent | public/skills/s7cret/binance-enhanced/openclaw-config.json | ✅ Notified | https://github.com/Demerzels-lab/elsamultiskillagent/issues/1 |
| 16 | kbarbel640-del/skills | skills/s7cret/binance-enhanced/openclaw-config.json | ✅ Notified | https://github.com/kbarbel640-del/skills/issues/1 |
| 17 | YPYT1/All-skills | skills/openclaw-skills/s7cret/binance-enhanced/openclaw-config.json | ✅ Notified | https://github.com/YPYT1/All-skills/issues/1 |
| 18 | YPYT1/All-skills | skills/openclaw-skills/ashwaq06/createos/config/config.json | ✅ Notified | (See issue #1, same repo) |
| 19 | Demerzels-lab/elsamultiskillagent | public/skills/ashwaq06/createos/config/config.json | ✅ Notified | (See issue #1, same repo) |
| 20 | kbarbel640-del/skills | skills/ashwaq06/createos/config/config.json | ✅ Notified | (See issue #1, same repo) |

**Summary:** 15 issues created successfully, 2 repos have issues disabled

## Issues Created

### Successfully Created (15)

1. ✅ **nomad3/openclaw-k8s** → https://github.com/nomad3/openclaw-k8s/issues/1
2. ✅ **cloudzun/openclaw-skills-collection** → https://github.com/cloudzun/openclaw-skills-collection/issues/1
3. ✅ **explooosion/openclaw-docker** → https://github.com/explooosion/openclaw-docker/issues/1
4. ✅ **vivekpal1/lobster-credit-playground** → https://github.com/vivekpal1/lobster-credit-playground/issues/9
5. ✅ **starlink-awaken/mcp-openclaw** → https://github.com/starlink-awaken/mcp-openclaw/issues/2
6. ✅ **AX-MCP/AX-CommunityWorkspaces** → https://github.com/AX-MCP/AX-CommunityWorkspaces/issues/216
7. ✅ **GrahamMcBain/Propodcalw** → https://github.com/GrahamMcBain/Propodcalw/issues/1
8. ✅ **NodeOps-app/skills** → https://github.com/NodeOps-app/skills/issues/2
9. ✅ **digitalknk/openclaw-runbook** → https://github.com/digitalknk/openclaw-runbook/issues/9
10. ✅ **curtisboadum/flowaudit-platform** → https://github.com/curtisboadum/flowaudit-platform/issues/1
11. ✅ **unityequilibrium/UnityEquilibriumTheory** → https://github.com/unityequilibrium/UnityEquilibriumTheory/issues/1
12. ✅ **YPYT1/All-skills** → https://github.com/YPYT1/All-skills/issues/1
13. ✅ **Demerzels-lab/elsamultiskillagent** → https://github.com/Demerzels-lab/elsamultiskillagent/issues/1
14. ✅ **kbarbel640-del/skills** → https://github.com/kbarbel640-del/skills/issues/1
15. ✅ **Crissavino/carlitos-v2** → https://github.com/Crissavino/carlitos-v2/issues/1

### Issues Disabled (2)

- ⚠️ **openclaw/skills** — Issues disabled on repository
- ⚠️ **openclaw/skills** (second finding) — Same repo

## Notification Template

See `notification-template.md` for the message sent to each repository owner.

## How The Scanner Works

1. **Search Patterns** — Used GitHub code search with dork patterns like `filename:config.json "openclaw" "api_key"`
2. **Detection** — Regex-based detection for OpenClaw configuration structures
3. **Validation** — Fetched and analyzed config content (read-only, no credential testing)
4. **Severity** — HIGH for exposed config files in public repositories
5. **Reporting** — Generated JSON/CSV reports with findings

## Security Notes

- Scanner operated in **read-only mode** — no credentials were tested or used
- Configs analyzed showed **good practices** (env vars, placeholders)
- **No actual secrets were exposed** in the inspected files
- However, config files should not be in public repos regardless

## Next Steps

1. **Monitor responses** — Check for replies to GitHub issues
2. **Track fixes** — Note when repos update their .gitignore or remove files
3. **Follow up** — Send reminders at 30/60/75 days per disclosure timeline
4. **Alternative contact** — For repos with issues disabled, consider email or other channels

## Responsible Disclosure Timeline

| Day | Date | Action |
|-----|------|--------|
| 0 | Feb 12, 2026 | Initial notification (GitHub issues created) |
| 30 | Mar 14, 2026 | Friendly reminder |
| 60 | Apr 13, 2026 | Second reminder |
| 75 | Apr 28, 2026 | Final warning |
| 90 | May 13, 2026 | Public disclosure (no secrets revealed) |

---

**Last Updated:** 2026-02-12 16:35 ET
