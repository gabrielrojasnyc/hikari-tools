# OpenClaw Security Exposure Analysis
## A First-Principles Security Assessment

**Date:** 2026-02-12  
**Scope:** Comprehensive analysis of OpenClaw information exposure vectors  
**Purpose:** Build a security tool to detect exposed OpenClaw deployments and sensitive data

---

## 1. FIRST PRINCIPLES BREAKDOWN

### What Does OpenClaw Actually Touch?

Stripping to fundamentals, OpenClaw is an AI agent orchestration platform with these core components:

| Component | Function | Potential Secrets |
|-----------|----------|-------------------|
| **Gateway** | Central orchestration, cron, messaging | Config files, API keys, tokens |
| **Agents** | AI models, tools, memory | Model API keys, system prompts |
| **MCP Servers** | External service connectors | Service credentials, connection strings |
| **Skills** | Tool wrappers | CLI configs, API tokens |
| **Channel Integrations** | Telegram, Discord, Slack | Bot tokens, channel IDs |
| **Browser Automation** | Chrome extension relay | Cookies, session data |
| **Peta Core** | Policy/gateway for agents | Vault tokens, policy configs |

### Data Flow Analysis

```
User Request → Gateway → Agent → Tools/MCP → External Services
                     ↓
                Session Logs (risk!)
                     ↓
           Channel (Telegram/Discord)
                     ↓
           Memory Files (workspace/memory/)
                     ↓
           Cron Jobs (scheduled commands)
```

---

## 2. ATTACK SURFACE MAP

### 2.1 Configuration File Exposures

**Primary Risk: Hardcoded credentials in config files**

OpenClaw uses these configuration patterns:

| File Location | Contents | Exposure Risk |
|--------------|----------|---------------|
| `~/.openclaw/config.json` | Gateway config, model endpoints, API keys | **CRITICAL** |
| `~/.openclaw/credentials/` | Individual credential files | **CRITICAL** |
| `~/.openclaw/agents/*/config.json` | Agent-specific configs | **HIGH** |
| `~/.openclaw/mcp-servers/*/config.json` | MCP server credentials | **CRITICAL** |
| `~/.openclaw/workspace/.env` | Environment variables | **HIGH** |
| `~/.openclaw/skills/*/config.json` | Skill configurations | **MEDIUM** |

**Specific Search Patterns (GitHub Dorks):**

```bash
# Gateway configs with API keys
"openclaw" "config.json" "api_key" extension:json

# Telegram bot tokens
"telegram_bot_token" "openclaw" extension:json
"bot_token" "openclaw" extension:yaml

# Discord tokens
"discord_token" "openclaw" extension:json

# OpenRouter keys
"openrouter" "api_key" extension:json

# Claude/Anthropic keys
"anthropic_api_key" "openclaw" extension:json
"claude_api_key" "openclaw" extension:json

# Vault credentials
"vault_token" "openclaw" extension:json
"vault_addr" "openclaw" extension:json

# Model configs
"default_model" "openclaw" "api_key" extension:json

# MCP server configs
"mcp-server" "api_key" extension:json
"model_context_protocol" "credentials" extension:json
```

### 2.2 Log File Exposures

**Primary Risk: Session logs contain full conversation history + tool outputs**

OpenClaw logs to `~/.openclaw/logs/` with these patterns:

| Log Type | Location | Exposure Risk |
|----------|----------|---------------|
| Session logs | `logs/sessions/*.jsonl` | **CRITICAL** - Full transcripts |
| Gateway logs | `logs/gateway*.log` | **HIGH** - Config + errors |
| Agent logs | `logs/agents/*.log` | **HIGH** - Tool outputs |
| Audit logs | `logs/audit*.log` | **MEDIUM** - Operation traces |

**What Gets Logged:**
- Complete user prompts
- Agent responses
- Tool call arguments (including API requests!)
- Tool outputs (potentially with data)
- Configuration on startup
- Error messages with stack traces

**Real Example Pattern:**
```jsonl
{"timestamp":"2026-02-12T15:30:00Z","level":"debug","message":"Tool call: browser with args {\"url\": \"https://internal.company.com\", \"headers\": {\"Authorization\": \"Bearer TOKEN_HERE\"}}"}
```

### 2.3 Memory File Exposures

**Location:** `~/.openclaw/workspace/memory/`

| File | Contents | Risk |
|------|----------|------|
| `MEMORY.md` | Long-term curated memory | **HIGH** - Personal context |
| `YYYY-MM-DD.md` | Daily session logs | **HIGH** - Everything discussed |
| `HEARTBEAT.md` | System checklist | **LOW** |
| Agent memories | `~/.openclaw/agents/*/memory/` | **HIGH** - Agent-specific secrets |

**Exposure Vector:** Users may commit `memory/` to public repos.

### 2.4 Channel Integration Exposures

**Telegram:**
- Bot tokens stored in config: `"telegram": {"botToken": "..."}`
- Channel IDs exposed: `"channel": "8391843667"`
- Search: `"telegram" "botToken" "8391843667"`

**Discord:**
- Bot tokens in config
- Channel/guild IDs exposed
- Webhook URLs may contain tokens

**Slack:**
- Bot tokens
- Channel IDs
- Webhook URLs with embedded tokens

### 2.5 Browser Automation Exposures

**OpenClaw Browser Control:**
- Chrome extension relay profile
- Captured cookies/session data
- Screenshots saved to `/tmp/`

**Risk:**
- Session cookies in memory dumps
- Screenshots with sensitive data
- Browser history exposed via automation

### 2.6 Network Exposures

| Service | Default Port | Exposure |
|---------|-------------|----------|
| Gateway HTTP | Configurable | API endpoints |
| Gateway WebSocket | Configurable | Real-time comms |
| Cron HTTP | Often exposed | Job triggers |
| Peta Core | 3001 (loopback) | Policy API |
| MCP Servers | Various | External APIs |

**Default Config Risk:**
```json
{
  "gateway": {
    "http": { "enabled": true, "port": 8080 },
    "cron": { "enabled": true, "endpoint": "/cron" }
  }
}
```

If bound to `0.0.0.0` instead of `127.0.0.1`, exposed to internet.

### 2.7 Docker/Container Exposures

If OpenClaw runs in containers:
- Environment variables visible via `docker inspect`
- Layer caching may retain old secrets
- Volume mounts expose host filesystem
- Registry images may contain secrets

---

## 3. GITHUB EXPOSURE HUNTING

### 3.1 GitHub Dorks for OpenClaw

```bash
# Basic config exposure
filename:config.json "openclaw" "api_key"
filename:config.yaml "openclaw" "token"
extension:json "openclaw" "credentials"

# Specific services
"openrouter" "api_key" "openclaw"
"anthropic" "api_key" "openclaw"
"openai" "api_key" "openclaw"
"gemini" "api_key" "openclaw"
"x-ai" "api_key" "openclaw"

# Telegram exposures
"telegram_bot_token" "openclaw"
"bot_token" "8391843667"

# Discord exposures  
"discord_token" "openclaw"
"discord_bot_token" "openclaw"

# Notion integrations
"notion_token" "openclaw"
"notion_integration_token" "openclaw"

# GitHub PATs in OpenClaw context
"github_token" "openclaw" "ghp_"

# Vault credentials
"vault_token" "openclaw"
"VAULT_ADDR" "openclaw"

# Channel identifiers (can be used to find configs)
"channel" "8391843667" "openclaw"
"guild_id" "openclaw"

# Session logs (major exposure!)
extension:jsonl "openclaw" "session"
filename:*.jsonl "openclaw"

# Memory files
filename:MEMORY.md "openclaw"
path:memory "openclaw"

# Agent configs
path:agents "config.json" "openclaw"

# MCP configs
path:mcp-servers "config.json"
path:mcp "credentials"
```

### 3.2 Code Search Patterns

```bash
# Hardcoded tokens in source
"api_key" "sk-" "openclaw"
"token" "ghp_" "openclaw"
"Authorization: Bearer" "openclaw"

# Environment variable exposure
"process.env" "OPENCLAW"
"os.environ" "openclaw"

# Config file patterns
"gateway.json" "api_key"
"agents.json" "credentials"
```

---

## 4. DETECTION METHODOLOGY

### 4.1 Automated Scanner Approach

```python
# Conceptual scanner architecture
class OpenClawExposureScanner:
    SOURCES = [
        'github',      # Code repos
        'pastebin',    # Paste dumps
        'shodan',      # Exposed services
        'virustotal',  # Domain analysis
        'publicwww',   # Website search
    ]
    
    SIGNATURES = {
        'openclaw_config': r'openclaw.*config\.(json|yaml|yml)',
        'telegram_token': r'\d{9,10}:[A-Za-z0-9_-]{35}',
        'discord_token': r'[MN][A-Za-z\d]{23}\.[\w-]{6}\.[\w-]{27}',
        'openai_key': r'sk-[a-zA-Z0-9]{48}',
        'anthropic_key': r'sk-ant-[a-zA-Z0-9]{32,}',
        'openrouter_key': r'sk-or-[a-zA-Z0-9]{32}',
        'github_pat': r'ghp_[a-zA-Z0-9]{36}',
        'vault_token': r'hvs\.[a-zA-Z0-9]{24,}',
        'notion_token': r'secret_[a-zA-Z0-9]{43}',
        'session_log': r'openclaw.*\.jsonl',
    }
```

### 4.2 Validation Checks

For found configurations:

1. **Config Validation:**
   - Check if valid JSON/YAML
   - Verify OpenClaw structure
   - Extract all key-value pairs

2. **Credential Testing (Read-Only):**
   - Test API keys without making changes
   - Check token validity without using quota
   - Verify read-only access only

3. **Service Enumeration:**
   - Identify connected services
   - Map exposure blast radius
   - Check for lateral movement paths

### 4.3 Severity Classification

| Finding | Severity | Action |
|---------|----------|--------|
| Active API key | **CRITICAL** | Immediate notification |
| Config file with structure | **HIGH** | Verify if valid |
| Session logs | **CRITICAL** | Notify, verify content |
| Channel IDs | **MEDIUM** | Track for context |
| Gateway endpoint | **HIGH** | Check if exposed |
| Memory files | **HIGH** | Review content |

---

## 5. RESPONSIBLE DISCLOSURE FRAMEWORK

### 5.1 Discovery Process

1. **Automated Scanning** - Find potential exposures
2. **Manual Verification** - Confirm valid, minimize false positives
3. **Impact Assessment** - Determine severity
4. **Notification** - Contact repo owner, OpenClaw security team
5. **Tracking** - Monitor remediation

### 5.2 Notification Templates

**Email Template:**
```
Subject: [Security] OpenClaw Configuration Exposed in Public Repository

Hello,

I'm a security researcher working on OpenClaw security tooling. I discovered 
that a configuration file for OpenClaw appears to be exposed in a public 
repository:

Repository: [URL]
File: [PATH]
Exposure: [API_KEY/TOKEN/CONFIG]

This file contains:
- [List of exposed secrets]

Recommended Actions:
1. Immediately rotate all exposed credentials
2. Remove file from repository history (git filter-branch or BFG)
3. Review access logs for unauthorized usage
4. Enable secret scanning in GitHub settings

Timeline:
- Discovery: [DATE]
- Notification: [DATE]
- Public disclosure: 90 days from notification (or per your policy)

I'm happy to coordinate and verify the fix.

[Contact Info]
```

---

## 6. MITIGATION RECOMMENDATIONS

### 6.1 For OpenClaw Users

**Immediate Actions:**
1. Audit all config files for hardcoded secrets
2. Move to environment variables or Vault
3. Add `.openclaw/` to `.gitignore`
4. Review session log retention policies
5. Enable log rotation/deletion
6. Use Peta Core for credential management

**Configuration Changes:**
```json
{
  "security": {
    "mask_secrets_in_logs": true,
    "encrypt_session_logs": true,
    "auto_rotate_keys": true,
    "audit_all_tool_calls": true
  }
}
```

### 6.2 For OpenClaw Development

**Security Enhancements:**
1. **Secret Masking** - Automatically mask API keys in logs
2. **Config Validation** - Warn on hardcoded secrets
3. **Safe Defaults** - Loopback-only binding, no debug logs
4. **Audit Logging** - Track all credential access
5. **Key Rotation** - Automated rotation for supported services
6. **Memory Encryption** - Encrypt at-rest session data

---

## 7. SEARCH QUICK REFERENCE

### 7.1 GitHub Search URLs

```
# Config files
https://github.com/search?q=openclaw+filename:config.json+api_key&type=code

# Telegram tokens
https://github.com/search?q=telegram_bot_token+openclaw&type=code

# Session logs
https://github.com/search?q=extension:jsonl+openclaw+session&type=code

# Memory files
https://github.com/search?q=filename:MEMORY.md+openclaw&type=code

# Gateway configs
https://github.com/search?q=filename:gateway.json+openclaw&type=code
```

### 7.2 Shodan Queries

```
# Exposed OpenClaw gateways
http.title:"OpenClaw"
http.body:"OpenClaw Gateway"
port:8080 "openclaw"

# General pattern
"openclaw" "gateway" "status"
```

---

## 8. CONCLUSION

**Key Findings:**

1. **Session logs are the highest risk** - They contain complete transcripts including tool outputs that may embed API responses with secrets

2. **Config files are widely exposed** - Users frequently commit `~/.openclaw/` contents to repos

3. **Memory files contain curated sensitive data** - MEMORY.md often has personal/business context

4. **MCP servers amplify exposure** - Each integration adds credential surface area

5. **Default configurations may expose** - Gateway HTTP/cron endpoints if misconfigured

**Recommended Tool Features:**
- Continuous GitHub monitoring for new exposures
- Automated credential rotation triggering
- Session log scanning for embedded secrets
- Gateway exposure detection (Shodan integration)
- Memory file commit prevention (pre-commit hooks)

---

*This analysis was conducted using first-principles methodology, examining OpenClaw's actual architecture and data flows to identify realistic exposure vectors.*
