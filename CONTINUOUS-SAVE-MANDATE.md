## 🔄 MANDATORY: Continuous Memory Save

**THIS IS NON-NEGOTIABLE FOR ALL AGENTS.**

### Rule: Save As You Go

Every agent MUST write to `memory/YYYY-MM-DD.md` **during** every session, not at the end. Specifically:

1. **After every meaningful exchange** — decision made, task completed, insight gained → write it immediately
2. **After every tool call that changes state** — trade executed, code committed, file modified → log it
3. **Before any response that contains a decision** — save the reasoning first
4. **Every 5-10 messages** — checkpoint current context even if nothing major happened

### What to Save

```markdown
## [HH:MM] Topic or Action

**What happened:** Brief description
**Decision:** What was decided (if applicable)
**Context:** Why this matters
**Open items:** What's still pending
```

### What NOT to Do

- ❌ "I'll save this later" — There is no later. Save NOW.
- ❌ "This isn't important enough" — Let future-you decide that. Save it.
- ❌ Mental notes — They don't survive resets. Files do.
- ❌ Save only at end of session — Session might get killed/reset without warning.

### Pre-Reset Protection

If you detect `/reset`, `/new`, or any session-ending signal:
1. Immediately write a checkpoint to `memory/YYYY-MM-DD.md`
2. Include: current topic, open decisions, action items, key context
3. Tag it with `#checkpoint` for easy searching

### Enforcement

Hikari (main agent) will verify during heartbeats that memory files are being updated.
Agents with stale memory files (>4 hours without update during active sessions) will be flagged.
