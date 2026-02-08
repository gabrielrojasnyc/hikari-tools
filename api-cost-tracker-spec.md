# API Cost Tracker System
## Technical Specification for Koji

### Overview
Build a unified cost tracking dashboard that monitors spending across all AI/API accounts, with hourly refresh to Notion.

---

## Accounts to Track

| Provider | Cost Metric | API Endpoint | Auth Location |
|----------|-------------|--------------|---------------|
| **OpenRouter** | $/token usage | /usage endpoint | `~/.openclaw/credentials/openrouter-api-key` |
| **Anthropic** | $/token usage | /usage endpoint | `~/.openclaw/credentials/anthropic-api-key` |
| **Google/Gemini** | $/token usage | Cloud billing API | `~/.openclaw/credentials/google-api-key` |
| **ElevenLabs** | Characters used | /usage endpoint | `~/.openclaw/credentials/elevenlabs-api-key` |
| **X API (Twitter)** | Requests used | Rate limit headers | `~/.openclaw/credentials/x-api-bearer-token` |
| **Brave Search** | Queries used | N/A (free tier tracking) | `~/.openclaw/credentials/brave-api-key` |

---

## Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│  API Providers  │────▶│  Collector   │────▶│  Aggregator │────▶│   Notion     │
│                 │     │  (Hourly)    │     │  (Calculate)│     │  Dashboard   │
│  - OpenRouter   │     │              │     │             │     │              │
│  - Anthropic    │     │  - Fetch     │     │  - Total    │     │  - Hourly    │
│  - Google       │     │  - Store     │     │  - By Agent │     │  - Daily     │
│  - ElevenLabs   │     │  - Normalize │     │  - Forecast │     │  - By Agent  │
│  - X API        │     │              │     │             │     │  - Alerts    │
└─────────────────┘     └──────────────┘     └─────────────┘     └──────────────┘
```

---

## Notion Database Schema

### Database 1: Cost Log (Hourly Records)
```
Name: Cost Log
Fields:
- Timestamp (date, with time)
- Provider (select): OpenRouter, Anthropic, Google, ElevenLabs, X API, Brave
- Agent (select): Hikari, Koji, Mika, Sora, System
- Cost USD (number)
- Tokens/Usage (number)
- Cost Type (select): Input, Output, TTS, Search
- Session ID (text) - link to transcript
```

### Database 2: Daily Summary
```
Name: Daily Costs
Fields:
- Date (date)
- Total USD (number, formula sum)
- OpenRouter (relation to Cost Log)
- Anthropic (relation)
- Google (relation)
- ElevenLabs (relation)
- By Agent (rich text summary)
- vs Yesterday (number, % change)
- vs Budget (number, % of $500/month)
```

### Database 3: Agent Breakdown
```
Name: Agent Costs
Fields:
- Agent (select): Hikari, Koji, Mika, Sora
- Current Month (number)
- % of Total (formula)
- Avg per Day (formula)
- Forecast (number): Projected month-end
- Status (select): ✅ On track, ⚠️ Watch, 🚨 Over budget
```

---

## Implementation Plan

### Phase 1: Data Collection (Tonight)

**File: `src/collectors/openrouter.ts`**
```typescript
export async function fetchOpenRouterUsage() {
  const apiKey = readFile('~/.openclaw/credentials/openrouter-api-key');
  
  // OpenRouter usage endpoint
  const response = await fetch('https://openrouter.ai/api/v1/usage', {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });
  
  return {
    provider: 'OpenRouter',
    cost: response.data.total_cost,
    tokens: response.data.total_tokens,
    timestamp: new Date()
  };
}
```

**File: `src/collectors/anthropic.ts`**
```typescript
export async function fetchAnthropicUsage() {
  const apiKey = readFile('~/.openclaw/credentials/anthropic-api-key');
  
  // Anthropic usage API
  const response = await fetch('https://api.anthropic.com/v1/usage', {
    headers: { 'x-api-key': apiKey }
  });
  
  return {
    provider: 'Anthropic',
    cost: response.data.cost_usd,
    tokens: response.data.input_tokens + response.data.output_tokens,
    timestamp: new Date()
  };
}
```

**File: `src/collectors/elevenlabs.ts`**
```typescript
export async function fetchElevenLabsUsage() {
  const apiKey = readFile('~/.openclaw/credentials/elevenlabs-api-key');
  
  // ElevenLabs subscription/usage
  const response = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
    headers: { 'xi-api-key': apiKey }
  });
  
  return {
    provider: 'ElevenLabs',
    characters_used: response.data.character_count,
    character_limit: response.data.character_limit,
    cost: calculateCost(response.data.character_count), // Based on tier
    timestamp: new Date()
  };
}
```

### Phase 2: Session Tracking (Link Costs to Agents)

**Problem:** Need to attribute costs to specific agents (Hikari, Koji, Mika, Sora)

**Solution:** Parse session transcripts for model usage

**File: `src/attribution/agent-tracker.ts`**
```typescript
export function attributeCostsToAgents() {
  const agents = ['hikari', 'koji', 'analyst', 'trader'];
  
  for (const agent of agents) {
    const sessionFiles = glob(`agents/${agent}/sessions/*.jsonl`);
    
    for (const file of sessionFiles) {
      const lines = readFileLines(file);
      
      for (const line of lines) {
        const event = JSON.parse(line);
        
        // Look for model calls
        if (event.type === 'model_change' || event.type === 'llm_request') {
          recordCost({
            agent: agent,
            provider: extractProvider(event.modelId),
            tokens: event.tokens || 0,
            timestamp: event.timestamp
          });
        }
      }
    }
  }
}
```

### Phase 3: Notion Integration

**File: `src/notion/dashboard.ts`**
```typescript
import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_API_KEY });

export async function updateCostLog(entry: CostEntry) {
  await notion.pages.create({
    parent: { database_id: 'COST_LOG_DB_ID' },
    properties: {
      'Timestamp': { date: { start: entry.timestamp } },
      'Provider': { select: { name: entry.provider } },
      'Agent': { select: { name: entry.agent } },
      'Cost USD': { number: entry.cost },
      'Tokens/Usage': { number: entry.tokens }
    }
  });
}

export async function updateDailySummary(date: string) {
  // Aggregate all entries for date
  const dailyTotal = await aggregateDailyCost(date);
  
  await notion.pages.create({
    parent: { database_id: 'DAILY_SUMMARY_DB_ID' },
    properties: {
      'Date': { date: { start: date } },
      'Total USD': { number: dailyTotal.total },
      'OpenRouter': { number: dailyTotal.openrouter },
      'Anthropic': { number: dailyTotal.anthropic },
      // ... etc
    }
  });
}
```

### Phase 4: Hourly Cron Job

**File: `cron/hourly-update.sh`**
```bash
#!/bin/bash
cd /Users/nagomi/.openclaw/agents/koji/agent/workspace/api-cost-tracker

# Run collection
npm run collect

# Run attribution
npm run attribute

# Update Notion
npm run update-notion

# Log
echo "[$(date)] Cost tracking updated" >> /Users/nagomi/.openclaw/logs/cost-tracker.log
```

**Cron:** Every hour at :00
```
0 * * * * /Users/nagomi/.openclaw/agents/koji/agent/workspace/api-cost-tracker/cron/hourly-update.sh
```

---

## Notion Page Structure

### Main Dashboard: ⚡ API Cost Tracker

**Sections:**

1. **📊 Today's Snapshot**
   - Total spent today: $X.XX
   - vs Yesterday: +X%
   - vs Budget (monthly $500): X%
   - Last updated: [timestamp]

2. **💰 By Provider (Today)**
   | Provider | Cost | % of Total |
   |----------|------|------------|
   | OpenRouter | $X | XX% |
   | Anthropic | $X | XX% |
   | ElevenLabs | $X | XX% |

3. **👤 By Agent (Today)**
   | Agent | Cost | Tokens | % |
   |-------|------|--------|---|
   | Hikari | $X | Xk | XX% |
   | Koji | $X | Xk | XX% |
   | Mika | $X | Xk | XX% |
   | Sora | $X | Xk | XX% |

4. **📈 7-Day Trend**
   - Embedded chart (Notion chart view)
   - Daily spend over last week

5. **🚨 Alerts**
   - If daily > $25 (warning)
   - If monthly > $400 (critical)
   - If any agent > 40% of budget

6. **🔗 Links**
   - View: Hourly Cost Log (database)
   - View: Daily Summary (database)
   - View: Agent Breakdown (database)

---

## Budget Configuration

**Monthly Budget:** $500 (as per trading system budget)

**Daily Thresholds:**
- Green: <$15/day (on track for $450/month)
- Yellow: $15-25/day (watch)
- Red: >$25/day (over budget)

**Per-Agent Allocation:**
- Hikari (main): 40% = $200/month
- Koji (coder): 25% = $125/month
- Mika (analyst): 20% = $100/month
- Sora (trader): 15% = $75/month

---

## Deliverables for Tonight

1. ✅ Working cost collector (OpenRouter + Anthropic + ElevenLabs)
2. ✅ Agent attribution system (parse session files)
3. ✅ Notion database schema + integration
4. ✅ Hourly cron job configured
5. ✅ Main dashboard page created
6. ✅ Test run showing real costs from today

**Total estimated time:** 4-5 hours

---

## Success Criteria

- [ ] Can see today's total spend in Notion
- [ ] Can see breakdown by provider
- [ ] Can see breakdown by agent (Hikari/Koji/Mika/Sora)
- [ ] Updates automatically every hour
- [ ] Alerts if approaching budget limits
- [ ] Links to session transcripts for deep dives

**Ready to assign to Koji?**
