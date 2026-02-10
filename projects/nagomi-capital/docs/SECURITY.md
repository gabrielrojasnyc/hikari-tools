# Security Documentation

## Overview

Nagomi Capital implements a defense-in-depth security strategy for protecting sensitive credentials and ensuring the integrity of the trading system.

## Credential Management

### Vault Storage

All secrets are stored in HashiCorp Vault (filesystem-based) at:

```
~/.openclaw/credentials/
```

**Required Credentials:**

| Credential File | Purpose | Service |
|----------------|---------|---------|
| `alpaca-api-key` | Alpaca API Key | Paper Trading |
| `alpaca-secret-key` | Alpaca API Secret | Paper Trading |
| `openrouter-api-key` | OpenRouter API Key | LLM (Grok) Access |
| `x-api-bearer-token` | X/Twitter App Key | Social Ingestion |
| `x-api-secret` | X/Twitter App Secret | Social Ingestion |
| `x-access-token` | X/Twitter Access Token | Social Ingestion |
| `x-access-secret` | X/Twitter Access Secret | Social Ingestion |
| `telegram-bot-token` | Telegram Bot Token | Notifications |
| `telegram-chat-id` | Telegram Chat ID | Notifications |

### File Permissions

Credential files **MUST** have permissions `600` (read/write owner only):

```bash
chmod 600 ~/.openclaw/credentials/*
```

The application will refuse to start if credentials have incorrect permissions.

### Credential Loader

The `src/utils/credentials.ts` module handles secure credential loading:

- **Read Once**: Credentials are loaded at startup and cached in memory
- **Permission Validation**: Files must be 600, or the app fails to start
- **No Logging**: Credential values never appear in logs or error messages
- **Placeholder Detection**: Detects and rejects placeholder values

Example usage:

```typescript
import { credentials, getAlpacaCredentials } from './utils/credentials.js';

// Initialize at startup
await credentials.initialize();

// Get credentials
const { apiKey, secretKey } = getAlpacaCredentials();
```

## Security Practices

### Code Security

1. **No Secrets in Code**
   - Never hardcode API keys, tokens, or passwords
   - Never commit `.env` files
   - Use Vault for all sensitive data

2. **Environment Variables (Non-Sensitive Only)**
   - Only non-sensitive configuration in `.env`
   - Examples: `LOG_LEVEL`, `DATABASE_PATH`, `PAPER_TRADING`
   - Never: API keys, secrets, tokens

3. **Error Handling**
   - Error messages must not expose credential values
   - Stack traces are sanitized to remove credential paths
   - Failed operations log safe error codes only

4. **Logging**
   - No credential values in logs
   - Request/response bodies are filtered
   - Authentication headers are redacted

### Git Security

The `.gitignore` file explicitly excludes:

```
.env
.env.*
credentials/
*.key
*.pem
secrets/
```

### Pre-Commit Hook

Create `.git/hooks/pre-commit` to prevent accidental credential commits:

```bash
#!/bin/bash

# Credential scanner for pre-commit hook

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo "🔒 Running credential scan..."

# Patterns to detect secrets
PATTERNS=(
  # API Keys
  "api[_-]?key.*[a-zA-Z0-9]{20,}"
  "api[_-]?secret.*[a-zA-Z0-9]{20,}"
  
  # Tokens
  "bearer\s+[a-zA-Z0-9_-]{20,}"
  "token.*[a-zA-Z0-9]{30,}"
  
  # Specific services
  "sk-[a-zA-Z0-9]{20,}"           # OpenAI/OpenRouter
  "AAAA.*[a-zA-Z0-9%]{50,}"       # X API tokens
  "[0-9]{9,10}:AA[A-Za-z0-9_-]{30,}" # Telegram bots
  
  # Private keys
  "BEGIN.*PRIVATE KEY"
  "ssh-rsa\s+AAAA"
  
  # Environment variables with values
  "^\\s*(API_KEY|SECRET|TOKEN|PRIVATE_KEY)=.+"
)

# Files to scan (exclude common non-source files)
FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|js|json|env|yaml|yml|md)$' || true)

if [ -z "$FILES" ]; then
  echo -e "${GREEN}✓ No files to scan${NC}"
  exit 0
fi

FOUND_ISSUES=0

for file in $FILES; do
  # Skip certain files
  if [[ "$file" =~ \.example\. ]] || [[ "$file" =~ ^\.env\. ]]; then
    continue
  fi
  
  for pattern in "${PATTERNS[@]}"; do
    if git diff --cached "$file" | grep -iE "$pattern" > /dev/null 2>&1; then
      echo -e "${RED}⚠️  Potential secret detected in $file${NC}"
      echo "   Pattern: $pattern"
      FOUND_ISSUES=1
    fi
  done
done

if [ $FOUND_ISSUES -eq 1 ]; then
  echo ""
  echo -e "${RED}❌ Commit blocked: Potential secrets detected${NC}"
  echo "   If these are false positives, use: git commit --no-verify"
  exit 1
fi

echo -e "${GREEN}✓ No secrets detected${NC}"
exit 0
```

Make it executable:

```bash
chmod +x .git/hooks/pre-commit
```

## Credential Rotation Policy

### Frequency

| Credential Type | Rotation Frequency | Procedure |
|----------------|-------------------|-----------|
| Trading API Keys | Every 90 days | Generate new key, update Vault, restart app |
| Social Media APIs | Every 60 days | Regenerate tokens, update Vault |
| LLM API Keys | Every 90 days | Rotate via provider dashboard |
| Bot Tokens | Every 180 days | Revoke old, create new, update Vault |

### Rotation Procedure

1. **Generate New Credentials**
   - Create new keys/tokens via provider dashboard
   - Do NOT delete old credentials yet

2. **Update Vault**
   ```bash
   # Write new credential
   echo "new-api-key" > ~/.openclaw/credentials/alpaca-api-key
   chmod 600 ~/.openclaw/credentials/alpaca-api-key
   ```

3. **Deploy**
   - Restart application to load new credentials
   - Verify functionality

4. **Revoke Old Credentials**
   - Only after confirming new credentials work
   - Delete from provider dashboard

## Incident Response

### Credential Compromise

If credentials are suspected compromised:

1. **Immediate Actions (within 5 minutes)**
   - Stop the trading system: `Ctrl+C` or `kill`
   - Revoke compromised credentials at provider
   - Check for unauthorized trades via Alpaca dashboard

2. **Short-term (within 1 hour)**
   - Generate new credentials
   - Update Vault with new credentials
   - Review logs for unauthorized access
   - Check Telegram/X for unauthorized messages

3. **Investigation**
   - Review git history for accidental commits
   - Check system access logs
   - Determine scope of compromise

4. **Recovery**
   - Deploy with new credentials
   - Monitor closely for 24 hours
   - Update rotation schedule

### Accidental Secret Commit

If secrets are committed to git:

1. **Do NOT just delete and recommit**
   - Git history retains the secret

2. **Immediate Actions**
   ```bash
   # Rotate the exposed credential IMMEDIATELY
   # Then remove from history (if repo is private)
   git filter-branch --force --index-filter \
     'git rm --cached --ignore-unmatch path/to/file' \
     --prune-empty --tag-name-filter cat -- --all
   ```

3. **Force push (if necessary)**
   ```bash
   git push origin --force --all
   ```

4. **Notify team** if shared repository

## Security Checklist

### Development

- [ ] No hardcoded secrets in code
- [ ] `.env` in `.gitignore`
- [ ] Pre-commit hook installed
- [ ] Credential files have 600 permissions
- [ ] Error messages don't expose secrets
- [ ] Logs don't contain credential values

### Deployment

- [ ] Vault credentials in place
- [ ] File permissions verified: `ls -la ~/.openclaw/credentials/`
- [ ] No `.env` file in deployment directory
- [ ] Application starts without credential errors
- [ ] Health checks pass

### Operations

- [ ] Rotation schedule documented
- [ ] Incident response plan reviewed
- [ ] Access logs monitored
- [ ] Regular security audits scheduled

## Contact

For security issues or questions:
- Review this document
- Check credential status: `ls -la ~/.openclaw/credentials/`
- Review application logs for credential errors

## References

- [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [HashiCorp Vault Best Practices](https://developer.hashicorp.com/vault/docs/concepts)
- [GitHub Token Scanning](https://docs.github.com/en/code-security/secret-scanning)
