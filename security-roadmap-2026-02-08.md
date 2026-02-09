# Nagomi Collective Security Roadmap
**Date:** 2026-02-08  
**Synthesized by:** Hikari + Aegis findings  
**Status:** Critical Fixes Required Before Production

---

## 🎯 Executive Summary

Aegis (Security Agent) conducted a comprehensive security audit today. **4 critical blockers** identified in Koji's API key encryption system must be resolved before trading agents can operate safely. Peta Core approval system is deployed and operational.

**Current Posture:**
- ✅ Cisco AI Defense deployed (A2A + MCP scanners)
- ✅ All credentials encrypted at rest
- ⚠️ 4 critical encryption vulnerabilities pending
- ⚠️ Full agent security scan queued
- ⏳ Palo Alto vs Peta.io evaluation pending

---

## 🚨 Phase 1: Critical Encryption Fixes (Koji)

**Source:** Aegis Security Review (`api-key-encryption-plan.md`)  
**Status:** REQUEST CHANGES — Do not deploy to production

### Blocker 1: IPC Authentication Missing 🔴
**Severity:** HIGH  
**Risk:** Any process can request decryption via Unix socket

**Problem:**
- Unix domain socket at `~/.openclaw/run/key-agent.sock` has no client authentication
- Malicious npm package could connect and steal API keys

**Fix Required:**
```typescript
// Implement SO_PEERCRED verification
const clientCred = getPeerCredentials(socket);
if (!isAuthorizedAgent(clientCred.pid, clientCred.uid)) {
  return { success: false, error: 'Unauthorized client' };
}
```

**Implementation:**
- [ ] Add `SO_PEERCRED` socket option for Linux
- [ ] Add `getpeereid()` for macOS  
- [ ] Maintain authorized agent whitelist (Hikari, Koji, Sora, Mika, Aegis)
- [ ] Reject connections from unknown processes

---

### Blocker 2: No Downgrade Protection 🔴
**Severity:** HIGH  
**Risk:** Attacker can replay old/compromised credentials

**Problem:**
- No versioning in encrypted credential files
- Attacker can replace current credential with older (possibly revoked) version

**Fix Required:**
```json
{
  "manifestVersion": 1,
  "credentials": {
    "alpaca": {
      "keyId": "uuid-v4",
      "version": 5,
      "lastRotated": "2026-02-08T10:59:00Z",
      "sha256": "hash-of-encrypted-file"
    }
  },
  "manifestHmac": "hmac-sha256-over-manifest"
}
```

**Implementation:**
- [ ] Add version counter to each credential
- [ ] Store last-modified timestamp
- [ ] HMAC-sign the manifest
- [ ] Reject decryption if version < expected

---

### Blocker 3: iCloud Recovery Share Risk 🔴
**Severity:** MEDIUM-HIGH  
**Risk:** Apple ID compromise → master key reconstruction

**Problem:**
- Share 1 of 5 stored in iCloud Keychain
- With Apple ID + 2 more shares = full key recovery
- 3-of-5 threshold may be too easy to collect

**Fix Required (Option A recommended):**
```typescript
// Replace iCloud share with hardware-backed share
const shareLocations = {
  share1: "yubikey-piv-slot-9c",  // Hardware security key
  share2: "local-keychain",
  share3: "encrypted-external-file", 
  share4: "physical-qr-offsite",
  share5: "recovery-passphrase"
};
// Increase threshold to 4-of-5
```

**Implementation:**
- [ ] Remove iCloud Keychain from recovery
- [ ] Use YubiKey PIV slot for Share 1
- [ ] OR increase threshold to 4-of-5
- [ ] Add geofencing/time-delay to recovery

---

### Blocker 4: Insufficient Memory Protection 🔴
**Severity:** MEDIUM  
**Risk:** Keys extractable from memory dumps/core files

**Problem:**
- Node.js/V8 garbage collection can move/duplicate keys
- `mlock` not used — keys can be swapped
- Core dumps after crash contain cleartext keys

**Fix Required:**
```typescript
import sodium from 'libsodium-wrappers';

// Use sodium_malloc for all key material
const masterKey = sodium_malloc(32);
sodium.randombytes_buf_into(masterKey);
sodium.mlock(masterKey);  // Prevent swapping

// Secure clear when done
function secureClear(buffer: Buffer): void {
  buffer.fill(0);
  crypto.randomBytes(buffer.length);  // Prevent optimization removal
  buffer.fill(0);
}
```

**Implementation:**
- [ ] Use `sodium_malloc` + `sodium_mlock` for all keys
- [ ] Implement explicit secure clearing
- [ ] Disable core dumps for key-agent process (`ulimit -c 0`)
- [ ] Consider memory-hard session keys (re-derive vs cache)

---

## 🔐 Phase 2: Peta Core Integration

**Current State:** Peta Core deployed at `~/.openclaw/infrastructure/peta-core/`

### What Needs Approval Flows

| Action | Current | With Peta Core | Rationale |
|--------|---------|----------------|-----------|
| Live trade execution | ❌ Frozen | ✅ Requires approval | $500 budget protection |
| API key decryption | Auto | ✅ High-value approval | Credential exposure risk |
| Key rotation | Manual | ✅ Scheduled + approval | Prevent accidental lockout |
| Recovery reconstruction | N/A | ✅ 2-person approval | Prevent single-point theft |
| New agent registration | Manual | ✅ Approval required | Prevent rogue agents |

### Integration Points

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   Sora (Trader) │───▶│  Peta Core   │───▶│  Hikari (You)   │
│  "Buy 100 AAPL" │    │ Policy Check │    │ Approve/Reject  │
└─────────────────┘    └──────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────┐
                       │   Aegis      │
                       │ Audit Trail  │
                       └──────────────┘
```

**Implementation:**
- [ ] Connect trading agents to Peta Core before order submission
- [ ] Configure policy: >$100 trade = approval required
- [ ] Add API key access as approval-gated action
- [ ] 30-minute approval timeout (auto-reject)

---

## 🔍 Phase 3: Full Agent Security Scan (Aegis)

**Pending from Aegis daily memory:**

### Scan Methodology

```bash
#!/bin/bash
# ~/.openclaw/agents/aegis/scripts/full-security-scan.sh

echo "=== Nagomi Collective Security Scan ==="
echo "Started: $(date)"

# 1. Agent Identity Verification
echo "[*] Verifying agent isolation..."
for agent in hikari koji sora mika aegis; do
  if [ -f "$HOME/.openclaw/agents/$agent/agent/IDENTITY.md" ]; then
    echo "  ✓ $agent: Identity file present"
  else
    echo "  ✗ $agent: MISSING IDENTITY — potential contamination"
  fi
done

# 2. SOUL.md Injection Check
echo "[*] Checking for SOUL.md anomalies..."
find ~/.openclaw/agents -name "SOUL.md" -exec grep -l "PROMPT INJECTION" {} \;

# 3. API Key Exposure Scan
echo "[*] Scanning for exposed credentials..."
grep -r "sk-[a-zA-Z0-9]" ~/.openclaw/agents --include="*.md" --include="*.ts" 2>/dev/null || echo "  ✓ No exposed keys found"

# 4. Cross-Agent Data Flow
echo "[*] Analyzing inter-agent communication..."
# Check for unauthorized data sharing
# Whitelist: Koji→Sora (approved)
# Flag: Any other direct agent→agent data flow

# 5. Trading Agent Safeguards
echo "[*] Verifying trading safeguards..."
if [ -f "$HOME/.openclaw/agents/trader/agent/peta-config.json" ]; then
  echo "  ✓ Peta Core connected"
else
  echo "  ✗ Peta Core NOT connected — live trading unsafe"
fi

# 6. Session Audit
echo "[*] Checking active sessions..."
openclaw sessions list

echo "=== Scan Complete ==="
echo "Report: ~/.openclaw/agents/aegis/reports/$(date +%Y-%m-%d)-security-scan.md"
```

**Execution:**
- [ ] Run full scan (ETA: 5 minutes)
- [ ] Generate report
- [ ] Quarantine anomalous findings
- [ ] Update Notion security dashboard

---

## 🏢 Phase 4: Palo Alto vs Peta.io Evaluation

**Context:** Aegis pending evaluation

### Decision Matrix

| Criteria | Palo Alto (Enterprise) | Peta.io (Custom) | Winner |
|----------|------------------------|------------------|--------|
| **Cost** | High (enterprise licensing) | Low (self-hosted) | Peta.io |
| **Integration** | Complex API | Native OpenClaw | Peta.io |
| **AI Agent Support** | Generic | Purpose-built for agents | Peta.io |
| **Audit Trail** | Comprehensive | Basic (growing) | Palo Alto |
| **Compliance** | SOC2, ISO27001 | Self-certified | Palo Alto |
| **Deployment Speed** | Weeks | Days | Peta.io |
| **Vendor Lock-in** | High | None (open source) | Peta.io |

### Recommendation

**Use Peta.io (self-hosted) for:**
- Internal agent approvals (fast, native integration)
- Rapid iteration on approval policies
- Cost control during startup phase

**Consider Palo Alto for:**
- ADP-facing operations (compliance requirements)
- External perimeter security
- When SOC2 audit is required

**Hybrid Approach:**
```
┌─────────────────────────────────────────┐
│           Palo Alto (Perimeter)         │
│    Enterprise firewall, DLP, compliance │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│           Peta Core (Internal)          │
│    Agent approvals, trading safeguards  │
└─────────────────────────────────────────┘
```

---

## 📋 Implementation Timeline

### Week 1 (Critical Path)
- [ ] **Day 1-2:** Implement IPC authentication (Blocker 1)
- [ ] **Day 3:** Add downgrade protection (Blocker 2)
- [ ] **Day 4:** Memory protection with libsodium (Blocker 4)
- [ ] **Day 5:** Aegis full security scan

### Week 2
- [ ] Replace iCloud share with YubiKey (Blocker 3)
- [ ] Connect trading agents to Peta Core
- [ ] Configure approval policies ($100+ trades)
- [ ] End-to-end testing

### Week 3
- [ ] Palo Alto evaluation completion
- [ ] Compliance documentation
- [ ] Production readiness review
- [ ] Go/No-Go decision for live trading

---

## 🎛️ Current System Status

| Component | Status | Notes |
|-----------|--------|-------|
| Credential Encryption | ✅ Active | AES-256-GCM, Argon2id |
| Cisco AI Defense | ✅ Deployed | A2A + MCP scanners |
| Peta Core | ✅ Deployed | `~/.openclaw/infrastructure/peta-core/` |
| Live Trading | 🔴 Frozen | Until blockers resolved |
| Aegis Monitoring | 🟡 Active | Daily scans pending |
| Key Rotation | 🟡 Manual | Auto-rotation planned |

---

## 🔗 Key Documents

- **Koji's Encryption Plan:** `~/.openclaw/agents/koji/agent/api-key-encryption-plan.md`
- **Aegis Security Review:** `~/.openclaw/agents/aegis/agent/reviews/api-key-encryption-security-review.md`
- **Aegis Daily Memory:** `~/.openclaw/agents/aegis/memory/2026-02-08.md`
- **Peta Core:** `~/.openclaw/infrastructure/peta-core/`
- **Peta Approve Skill:** `~/.openclaw/skills/peta-approve/`

---

## 📝 Sign-off Required

Before resuming live trading:

- [ ] Koji confirms 4 blockers resolved
- [ ] Aegis re-reviews encryption implementation
- [ ] Peta Core approval flows tested end-to-end
- [ ] Full agent security scan clean
- [ ] Gabe approval

---

*Generated: 2026-02-08  
Security posture: DEFENSIVE — Live trading frozen pending critical fixes*
