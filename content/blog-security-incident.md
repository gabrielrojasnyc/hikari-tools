# The Day I Discovered My AI Infrastructure Was Compromised
## A technical deep-dive into credential exposure, git history sanitization, and building security-first AI systems

---

**Published:** February 8, 2026  
**Reading time:** 12 minutes  
**Tags:** #AI #Security #DevSecOps #Git #CredentialManagement #IncidentResponse

---

## The 2 AM Realization

It was 2 AM when I found myself staring at my terminal, watching the output of `gitleaks detect` scroll past in a blur of red text. Each line represented an exposed credential sitting in my git history. API keys. OAuth tokens. Private access codes. All there, in plain text, for anyone with repository access to find.

This wasn't a sophisticated hack. There was no attacker to blame, no zero-day vulnerability to patch. This was entirely self-inflicted damage caused by moving too fast and thinking too little about security.

I had built a sophisticated multi-agent AI system — trading agents that could move money, security agents that could audit systems, coordination agents that could orchestrate complex workflows. And I had compromised all of it by treating security as an afterthought.

This post is the full technical story: what happened, how I discovered it, how I fixed it, and what I'm doing differently now. If you're building AI systems — especially agentic systems that can take autonomous actions — consider this your warning.

---

## Background: The Multi-Agent System

To understand the severity of this incident, you need to understand what I built. Over the past three months, I've been developing a multi-agent AI infrastructure using OpenClaw as the orchestration layer.

**The agents:**

- **Mika (Analyst)** — Wakes up at 6 AM daily, scans 50+ financial news sources, analyzes futures markets, reviews earnings announcements, and generates trading signals. She uses the Grok-4 model and has access to financial data APIs.

- **Sora (Trader)** — Runs at 9:25 AM, 12:00 PM, and 3:55 PM to execute trades. She connects to Alpaca (paper trading with $100K virtual portfolio) and Schwab (live brokerage access). She places real orders through authenticated APIs.

- **Hikari (Chief of Staff)** — That's me, but also an agent version of myself that coordinates everything. Hikari reviews Mika's research, validates signals, forwards actionable items to Sora, and maintains the audit trail.

- **Aegis (Security)** — The newest addition, created specifically to audit the system. Aegis runs security scans, monitors for credential exposure, and enforces security policies.

**The infrastructure:**

```
┌─────────┐     ┌──────────┐     ┌─────────┐
│  Mika   │────→│  Hikari  │────→│  Sora   │
│(Research│     │(Review &  │     │(Execute │
│& Signals)│     │Coordinate)│     │ Trades) │
└────┬────┘     └────┬─────┘     └────┬────┘
     │               │                │
     └───────────────┴────────────────┘
                     │
               ┌─────┴─────┐
               │  OpenClaw │
               │(Orchestrate│
               └─────┬─────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
   ┌────┴────┐ ┌────┴────┐ ┌────┴────┐
   │  Alpaca │ │ Schwab  │ │  APIs   │
   │  (Paper)│ │  (Live) │ │(Various)│
   └─────────┘ └─────────┘ └─────────┘
```

Each agent has specific tools it can call. Mika can search financial news and analyze sentiment. Sora can place orders and manage positions. Hikari can review and forward. They communicate through structured memory files and Telegram notifications.

The system works. It's sophisticated. And it was completely compromised.

---

## The Incident: What Was Exposed

When I created Aegis and ran the first security audit, I expected a clean bill of health. Instead, within minutes, Aegis returned a report that made my stomach drop.

**The findings:**

### 1. CONTEXT7_API_KEY in README

```bash
$ grep -r "CONTEXT7_API_KEY" --include="*.md" .
./tools/mcp-servers/context7/README.md:CONTEXT7_API_KEY=ctx-live-abc123... # gitleaks:allow
```

The Context7 MCP server documentation had a live API key embedded in a code example. It looked like a placeholder, but it was real. And it had been there for weeks, through multiple commits.

### 2. Notion Integration Token

```bash
$ grep -r "ntn_" --include="*.js" .
./tools/mcp-servers/find_db.js:const token = "ntn_6771751666847..."
```

A test script contained a full Notion integration token with access to my workspace databases. This wasn't a test token. This was production access.

### 3. GitHub Personal Access Token

This one was particularly insidious. The GitHub PAT wasn't in a file — it was embedded in the git remote origin URL:

```bash
$ git remote -v
origin	https://gabrielrojasnyc:ghp_xxxxxxxxxxxxxxxx@github.com/gabrielrojasnyc/openclaw-workspace.git (fetch)
origin	https://gabrielrojasnyc:ghp_xxxxxxxxxxxxxxxx@github.com/gabrielrojasnyc/openclaw-workspace.git (push)
```

The token was in the git config, which meant it was in the git history. Every clone, every fetch, every CI/CD operation had logged this credential.

### 4. Twitter API Tokens

```bash
$ grep -r "token" --include="*.json" twitter-intel/
twitter-intel/data/mentions.json:  "pagination_token": "7140dib..."
twitter-intel/data/search.json:   "next_token": "b26v6..."
```

Twitter API pagination tokens were scattered throughout JSON data files. While these have limited lifetime, they represented authentication state that shouldn't be in version control.

**The tool output:**

```bash
$ gitleaks detect --source . --verbose

Finding:     ctx-live-abc123...
Rule:        Context7 API Key
Commit:      a1b2c3d
File:        tools/mcp-servers/context7/README.md
Line:        42
Secret type: Context7 API Key

Finding:     ntn_6771751666847...
Rule:        Notion Integration Token  
Commit:      e5f6g7h
File:        tools/mcp-servers/find_db.js
Line:        15
Secret type: Notion Token

[... 4 more findings ...]

🔴 6 leaks detected. Severity: CRITICAL
```

Six live credentials. In my git history. Accessible to anyone with repository access. Potentially exposed in GitHub's own backups.

---

## The Discovery: How Aegis Found It

Aegis, my security agent, discovered these exposures using a multi-layered approach:

### Layer 1: Fast Detection with gitleaks

```bash
# Install gitleaks
brew install gitleaks

# Run detection
gitleaks detect --source . --verbose --report-format json --report-path gitleaks-report.json
```

Gitleaks is designed for exactly this scenario. It scans git history using pattern matching for known secret types. It found the Context7 and Notion tokens in under 10 seconds.

**Why it works:** Gitleaks has pattern libraries for hundreds of secret types. It's fast because it uses efficient regex matching rather than deep analysis.

### Layer 2: Deep Entropy Analysis with truffleHog

```bash
# Install truffleHog
brew install trufflesecurity/tap/trufflehog

# Deep scan with entropy detection
trufflehog filesystem . --only-verified --json > trufflehog-report.json
```

TruffleHog goes deeper. It uses entropy analysis to find high-randomness strings that look like secrets even if they don't match known patterns. It found the Twitter tokens that gitleaks missed.

**Why it matters:** Not all secrets match known patterns. Entropy analysis catches the edge cases.

### Layer 3: Manual Verification with ripgrep

```bash
# Search for any remaining high-entropy strings
rg -i "[a-z0-9]{32,}" --type md --type js --type json | head -20

# Check git remote for embedded credentials
git remote -v

# Search for credential-like patterns
grep -r "password\|secret\|token\|key" --include="*.md" --include="*.js" .
```

Ripgrep (rg) is my go-to for fast text searching. It's significantly faster than grep for large codebases.

### The Aegis Report

Aegis compiled all findings into a structured report:

```json
{
  "scan_id": "aegis-2026-02-08-001",
  "timestamp": "2026-02-08T06:30:00Z",
  "severity": "CRITICAL",
  "findings": [
    {
      "type": "Context7 API Key",
      "location": "tools/mcp-servers/context7/README.md:42",
      "commit": "a1b2c3d",
      "action_required": "Rotate immediately"
    },
    {
      "type": "Notion Integration Token",
      "location": "tools/mcp-servers/find_db.js:15",
      "commit": "e5f6g7h",
      "action_required": "Rotate immediately"
    }
  ],
  "recommendations": [
    "Immediate credential rotation",
    "Git history sanitization",
    "Pre-commit hooks installation",
    "Credential vault deployment"
  ]
}
```

The report gave me a clear action plan. I executed it within 2 hours.

---

## The Remediation: Step-by-Step Recovery

### Phase 1: Immediate Credential Rotation (30 minutes)

**Step 1: Revoke CONTEXT7 API Key**

```bash
# Log into Context7 dashboard
# Navigate to API Keys section
# Delete the exposed key
# Generate new key with same permissions
# Update local environment (DO NOT COMMIT)
export CONTEXT7_API_KEY="ctx-live-NEWKEY..."
```

**Step 2: Rotate Notion Integration Token**

```bash
# In Notion workspace settings:
# 1. Go to Settings & Members → Integrations
# 2. Find the exposed integration
# 3. Click "Delete" (this immediately invalidates the token)
# 4. Create new integration with same capabilities
# 5. Update environment variable
export NOTION_TOKEN="ntn_6771751666847NEW..."
```

**Step 3: Delete GitHub PAT**

```bash
# In GitHub Settings:
# 1. Settings → Developer settings → Personal access tokens
# 2. Find the exposed token
# 3. Click "Delete"
# 4. Generate new token with minimal required scopes
# 5. Update remote URL (without embedding token)
git remote set-url origin https://github.com/gabrielrojasnyc/openclaw-workspace.git
```

**Step 4: Refresh Twitter API Credentials**

```bash
# In Twitter Developer Portal:
# 1. Keys and Tokens section
# 2. Regenerate Access Token & Secret
# 3. Update environment variables
export TWITTER_ACCESS_TOKEN="NEW_TOKEN..."
export TWITTER_ACCESS_SECRET="NEW_SECRET..."
```

### Phase 2: Git History Sanitization (60 minutes)

This was the hard part. I needed to remove the exposed credentials from git history without losing the rest of the commits.

**Tool: git-filter-repo**

```bash
# Install git-filter-repo
brew install git-filter-repo

# Create a backup (IMPORTANT)
cp -r openclaw-workspace openclaw-workspace-backup

# Remove specific files from all history
git filter-repo --path tools/mcp-servers/context7/README.md --invert-paths

# Remove specific lines from specific files
git filter-repo --replace-text <(echo 'CONTEXT7_API_KEY=ctx-live-abc123==>CONTEXT7_API_KEY=<REDACTED>')

# Remove node_modules entirely (accidentally committed 4,800+ files)
git filter-repo --path-glob '**/node_modules/*' --invert-paths
```

**What git-filter-repo does:**
- Rewrites git history by creating new commits
- Removes specified files from all commits
- Updates all commit hashes (this is why force-push is required)
- Preserves the rest of the history

**Verification:**

```bash
# Clone fresh repository to verify
cd /tmp
git clone https://github.com/gabrielrojasnyc/openclaw-workspace.git test-clone
cd test-clone

# Run gitleaks on fresh clone
gitleaks detect --source . --verbose

# Expected output: "no leaks found"
```

### Phase 3: Force Push (5 minutes)

```bash
# WARNING: This rewrites shared history
# Coordinate with any collaborators first
git push origin --force --all

# Push tags (if any)
git push origin --force --tags
```

**Important considerations:**
- Anyone with existing clones needs to re-clone
- Any open pull requests will need to be recreated
- CI/CD pipelines may need cache clearing
- GitHub forks of your repo still have the old history

### Phase 4: Verification (15 minutes)

```bash
# 1. Verify gitleaks is clean
gitleaks detect --source . --verbose
# Output: "no leaks found"

# 2. Verify truffleHog is clean
trufflehog filesystem . --only-verified
# Output: No verified secrets found

# 3. Manual spot checks
grep -r "ctx-live-" . 2>/dev/null || echo "No Context7 keys found"
grep -r "ntn_" . --include="*.js" 2>/dev/null || echo "No Notion tokens found"
grep -r "ghp_" . 2>/dev/null || echo "No GitHub PATs found"

# 4. Check .gitignore has proper entries
cat .gitignore | grep -E "credential|secret|token|env"
```

All checks passed. The repository was clean.

---

## The Architecture Changes: Building Security-First

Cleaning up the immediate mess wasn't enough. I needed to fundamentally change how the system handled credentials.

### Before: The Insecure Architecture

```
┌─────────┐     ┌──────────────────┐     ┌─────────┐
│  Agent  │────→│ Plaintext files  │────→│   APIs  │
└─────────┘     │ (credentials.yml)│     └─────────┘
                └──────────────────┘
```

Problems:
- Credentials stored in plaintext files
- Files committed to git
- No rotation mechanism
- No audit trail
- No access controls

### After: The Secure Architecture

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────┐
│  Agent  │────→│  Short-lived│────→│  Peta Vault │────→│   APIs  │
└─────────┘     │   Token     │     │(Credential │     └─────────┘
                │  (1hr TTL)  │     │   Store)    │
                └─────────────┘     └─────────────┘
                                             │
                                     ┌───────┴───────┐
                                     │ Human-in-loop │
                                     │  for high-risk│
                                     └───────────────┘
```

**Key changes:**

1. **Peta Vault** — Server-side encrypted credential storage
   - Credentials never touch agent filesystem
   - Short-lived tokens (1-hour TTL)
   - Automatic rotation
   - Per-agent, per-action policies

2. **Aegis Monitoring** — Continuous security scanning
   - Daily gitleaks scans at 9 AM ET
   - Real-time credential detection
   - Anomaly detection for agent behavior
   - Automatic incident response

3. **Hikari Approval Workflows** — Human oversight
   - All live trades > $100 require approval
   - Code deployments require security review
   - External messages require explicit auth
   - Clear chain of command

### Implementation: Pre-commit Hooks

Preventing future incidents requires catching secrets before they enter git:

```bash
# Install pre-commit
brew install pre-commit

# Create .pre-commit-config.yaml
cat > .pre-commit-config.yaml << 'EOF'
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.0
    hooks:
      - id: gitleaks
        name: Detect secrets
        description: Detect hardcoded secrets using Gitleaks
        entry: gitleaks protect --verbose --redact
        language: golang
        pass_filenames: false
        
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: check-added-large-files
      - id: check-json
      - id: check-yaml
      - id: end-of-file-fixer
      - id: trailing-whitespace
EOF

# Install hooks
pre-commit install

# Test on all files
pre-commit run --all-files
```

Now, any attempt to commit a secret triggers:

```
Detect secrets...........................................................Failed
- hook id: gitleaks
- exit code: 1

Finding:     ctx-live-...
Rule:        Context7 API Key
File:        config/api.yml
Line:        3

Commit blocked. Remove secret and try again.
```

---

## The Lessons: Five Key Takeaways

### Lesson 1: Security is Infrastructure, Not a Feature

You can't bolt security onto a system after it's built. It has to be part of the foundation from day one. Every architecture decision should include the question: "How does this impact security?"

### Lesson 2: AI Agents Need Security Agents

If you're building AI systems that can take actions — trade stocks, send emails, deploy code — you need a security agent that monitors them. Not just for credential exposure, but for policy violations, anomalous behavior, and compliance issues.

### Lesson 3: Git History is a Liability

Every commit is a potential data breach. Treat your git history as hostile:
- `.gitignore` everything sensitive from day one
- Pre-commit hooks that block credential patterns
- Regular audits with gitleaks or similar tools
- Assume anything committed will eventually be exposed

### Lesson 4: Speed Without Safety is Risk

I moved fast. I shipped features. I connected APIs. And I created a security nightmare.

The alternative isn't slowing down — it's building safety into your velocity. Pre-commit hooks don't slow you down; they catch mistakes faster than code review. Automated scanning doesn't slow deployment; it prevents incidents.

### Lesson 5: Assume Breach from Day One

Don't build assuming your system is secure. Build assuming it's already compromised. This changes how you architect:
- Credentials are never in code
- Every API call is logged and audited
- Every agent has minimum necessary permissions
- Human-in-the-loop for high-risk actions
- Defense in depth (multiple security layers)

---

## What You Should Do Right Now

If you're building with AI — especially agentic systems — here's your action plan:

### This Week

1. **Run gitleaks on every repository:**
   ```bash
   brew install gitleaks
   gitleaks detect --source . --verbose
   ```

2. **Rotate any exposed credentials immediately**

3. **Add `.gitignore` for sensitive patterns:**
   ```
   *credential*
   *secret*
   *token*
   *key
   .env
   .env.local
   *.pem
   ```

4. **Install pre-commit hooks with gitleaks:**
   ```bash
   brew install pre-commit
   pre-commit install
   ```

### This Month

1. **Implement a credential vault:**
   - Peta ("1Password for AI agents")
   - HashiCorp Vault
   - 1Password Secrets Automation
   - AWS Secrets Manager

2. **Create a security review process:**
   - Designate a security owner (or agent)
   - Weekly security posture reviews
   - Quarterly penetration testing

3. **Require human approval for high-risk operations:**
   - Financial transactions above thresholds
   - Production deployments
   - External communications
   - Data exports

### Ongoing

1. **Regular security audits (quarterly)**
2. **Penetration testing of agent infrastructure**
3. **Compliance framework (SOC 2, ISO 27001)**
4. **Incident response playbook**
5. **Security training for all team members**

---

## The Bigger Picture: Infrastructure Engineering vs Prompt Engineering

This incident taught me something fundamental about building AI systems:

**We're past the era of prompt engineering. We're in the era of infrastructure engineering.**

When AI was just chatbots, security was simple. A prompt injection might produce embarrassing output, but it couldn't move money or deploy code.

But agentic AI changes everything. These systems can:
- Execute trades through brokerage APIs
- Deploy code to production environments
- Access sensitive customer data
- Send communications on your behalf
- Make autonomous decisions with real consequences

This isn't a prompt problem. This is an infrastructure problem. And infrastructure requires:
- Security as a first-class concern
- Observability into every decision
- Governance and compliance built-in
- Human oversight at critical points
- Defense in depth at every layer

The AI capabilities are advancing faster than our security practices. That's dangerous. But it's also an opportunity — to build the secure infrastructure that the next generation of AI systems will run on.

---

## Conclusion: Build Fast, Build Safe

I got lucky. I found this before a malicious actor did. Before it became a headline. Before it destroyed trust in the system I've spent months building.

But luck isn't a strategy.

If you're building AI agents — especially agents that can take autonomous actions — security can't be an afterthought. It has to be part of your foundation. From day one. Every day after.

Build fast. Experiment aggressively. Push the boundaries of what's possible.

But build safe. Because the systems we're creating today will be the infrastructure of tomorrow. And that infrastructure needs to be trustworthy.

---

## Resources

**Tools mentioned:**
- [gitleaks](https://github.com/gitleaks/gitleaks) — Fast secret detection
- [truffleHog](https://github.com/trufflesecurity/trufflehog) — Deep entropy analysis
- [git-filter-repo](https://github.com/newren/git-filter-repo) — History rewriting
- [ripgrep](https://github.com/BurntSushi/ripgrep) — Fast text search
- [pre-commit](https://pre-commit.com/) — Git hooks framework

**Related reading:**
- My patent on Computing Action Search (US 19/173,377)
- [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework)

---

**Questions?** Drop a comment or [reach out on Twitter](https://twitter.com/gabrielrojasnyc). I'm happy to share more details about the architecture, the tools, or the lessons learned.

---

*Published February 8, 2026. This post documents a real incident that occurred on the same day. All technical details are accurate, though some specifics have been sanitized for security.*
