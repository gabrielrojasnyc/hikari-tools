# Telegram Command Handlers for Peta Approvals
# Add this to Hikari's message processing

## Detect these patterns in incoming Telegram messages:

# Approve commands
- `/approve <id>` or `/a <id>` → Approve the pending request
- `/approve 1` or `/a 1` → Approve first pending (by number)
- `/approve abc123` or `/a abc123` → Approve by short ID

# Reject commands  
- `/reject <id>` or `/r <id>` → Reject the pending request
- `/reject 1` or `/r 1` → Reject first pending (by number)
- `/reject abc123` or `/r abc123` → Reject by short ID

# List command
- `/pending` or `/p` → Show pending approvals

## Handler logic:
1. Parse command and ID from message
2. If ID is a number (1, 2, 3...), resolve to pending approval at that index
3. If ID is short UUID (8 chars), resolve to matching pending approval
4. If ID is full UUID, use directly
5. Call `peta-approve.sh approve <resolved_id>` or `peta-approve.sh reject <resolved_id>`
6. Reply with success/failure message
