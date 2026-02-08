# Twitter/X Market Intelligence System
## Technical Specification for Koji

### Overview
Build a TypeScript service that monitors Twitter/X for AI trends, startup ideas, and market intelligence from Hikari's watchlist accounts. Generates daily briefings for Telegram and Notion.

---

## Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│  X API (Twitter)│────▶│  Collector   │────▶│  Analyzer   │────▶│  Delivery    │
│                 │     │  (TypeScript)│     │  (LLM)      │     │  (Telegram/  │
│  - Timelines    │     │              │     │             │     │   Notion)    │
│  - User tweets  │     │  - Fetch     │     │  - Trends    │     │              │
│  - Search       │     │  - Store     │     │  - Ideas     │     │  - Daily     │
│                 │     │  - Queue     │     │  - Summarize │     │    briefings │
└─────────────────┘     └──────────────┘     └─────────────┘     └──────────────┘
```

---

## Watchlist Accounts (24 Total)

From TOOLS.md - Priority Tiers:

### Tier 1: AI & Infrastructure (Daily Priority)
- @openclaw - OpenClaw platform
- @vercel - Vercel/AI infrastructure  
- @rauchg - Guillermo Rauch
- @AnthropicAI - Anthropic
- @OpenAI - OpenAI
- @GeminiApp - Google Gemini
- @cursor_ai - Cursor
- @mikeyk - Mike Krieger (Anthropic Labs)
- @karpathy - Andrej Karpathy

### Tier 2: VC & Business Building
- @gregisenberg - Greg Isenberg
- @chamath - Chamath Palihapitiya
- @altcap - Brad Gerstner
- @sama - Sam Altman
- @asmartbear - Jason Cohen
- @jasonlk - Jason Lemkin

### Tier 3: Product & Strategy
- @lennysan - Lenny Rachitsky
- @kevinweil - Kevin Weil (OpenAI)
- @8090solutions - 8090 Solutions

### Tier 4: Other Watchlist
- @moltbook - OpenClaw community
- @The_AI_Investor - AI investing
- @godofprompt - Prompt engineering

---

## API Implementation

### Dependencies
```bash
npm install twitter-api-sdk dotenv axios
npm install -D @types/node typescript
```

### Core Client
```typescript
// src/twitter/client.ts
import { Client } from 'twitter-api-sdk';

const client = new Client(process.env.X_API_BEARER_TOKEN);

export async function getUserTweets(userId: string, maxResults = 10) {
  return await client.tweets.usersIdTweets(userId, {
    max_results: maxResults,
    'tweet.fields': ['created_at', 'public_metrics', 'context_annotations'],
    exclude: ['replies', 'retweets']
  });
}

export async function getFollowing(userId: string) {
  return await client.users.usersIdFollowing(userId, {
    max_results: 100
  });
}

export async function searchTweets(query: string, maxResults = 25) {
  return await client.tweets.tweetsRecentSearch({
    query,
    max_results: maxResults,
    'tweet.fields': ['created_at', 'public_metrics', 'author_id']
  });
}
```

---

## Data Pipeline

### Step 1: Collection (Every 6 hours)
```typescript
// src/collector/run.ts
export async function collectTweets() {
  const watchlist = loadWatchlist(); // from config
  const allTweets: Tweet[] = [];
  
  for (const account of watchlist) {
    const tweets = await getUserTweets(account.userId, 10);
    allTweets.push(...tweets.data || []);
  }
  
  // Also search for keywords
  const searchQueries = [
    'AI startup idea',
    'AI agent 2026',
    'YC startup',
    'new AI tool',
    'automation workflow'
  ];
  
  for (const query of searchQueries) {
    const results = await searchTweets(query, 10);
    allTweets.push(...results.data || []);
  }
  
  // Store raw tweets
  await storeTweets(allTweets);
}
```

### Step 2: Analysis (Daily at 5 AM ET)
```typescript
// src/analyzer/analyze.ts
export async function analyzeTweets(tweets: Tweet[]) {
  const prompt = `
    Analyze these tweets for:
    1. AI/startup trends (what's being discussed)
    2. New product launches
    3. Business ideas mentioned
    4. Predictions about AI
    5. Notable insights from key accounts
    
    Tweets: ${JSON.stringify(tweets)}
    
    Output format:
    {
      "trends": ["trend 1", "trend 2"],
      "ideas": ["idea 1", "idea 2"],
      "launches": ["product 1"],
      "predictions": ["prediction 1"],
      "keyInsights": ["insight 1"],
      "priorityAccounts": ["@account"]
    }
  `;
  
  const analysis = await callLLM(prompt);
  return analysis;
}
```

### Step 3: Briefing Generation
```typescript
// src/reports/generate.ts
export function generateBriefing(analysis: AnalysisResult) {
  const date = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'short', 
    day: 'numeric' 
  });
  
  return {
    telegram: formatTelegramBriefing(analysis, date),
    notion: formatNotionBriefing(analysis, date)
  };
}

function formatTelegramBriefing(analysis: AnalysisResult, date: string) {
  return `
📡 Twitter Morning Brief - ${date}

🎯 TOP TRENDS
${analysis.trends.map(t => `• ${t}`).join('\n')}

💡 STARTUP IDEAS
${analysis.ideas.map(i => `• ${i}`).join('\n')}

🚀 PRODUCT LAUNCHES
${analysis.launches.map(l => `• ${l}`).join('\n')}

🔮 KEY PREDICTIONS
${analysis.predictions.map(p => `• ${p}`).join('\n')}

📊 Priority accounts to watch: ${analysis.priorityAccounts.join(', ')}
  `;
}
```

---

## Delivery

### Telegram
```typescript
// src/delivery/telegram.ts
export async function sendTelegramBriefing(text: string) {
  // Use OpenClaw's message tool or direct Telegram API
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown'
    })
  });
}
```

### Notion
```typescript
// src/delivery/notion.ts
export async function createNotionBriefing(analysis: AnalysisResult) {
  const databaseId = 'DAILY_BRIEFINGS_DB_ID';
  
  await notion.pages.create({
    parent: { database_id: databaseId },
    properties: {
      'Date': { date: { start: new Date().toISOString() } },
      'Trends': { multi_select: analysis.trends.map(t => ({ name: t })) },
      'Ideas': { rich_text: [{ text: { content: analysis.ideas.join('\n') } }] },
      'Launches': { rich_text: [{ text: { content: analysis.launches.join('\n') } }] },
      'Priority': { select: { name: analysis.trends.length > 5 ? 'High' : 'Normal' } }
    }
  });
}
```

---

## Cron Schedule

```typescript
// src/cron/setup.ts
import { CronJob } from 'cron';

// Collection: Every 6 hours (4x daily)
const collectionJob = new CronJob('0 */6 * * *', collectTweets);

// Analysis & Briefing: 5 AM ET daily
const briefingJob = new CronJob('0 5 * * *', generateAndSendBriefing, null, true, 'America/New_York');

// Start jobs
collectionJob.start();
briefingJob.start();
```

---

## Project Structure

```
twitter-intel/
├── src/
│   ├── config/
│   │   ├── watchlist.ts       # 24 accounts to monitor
│   │   └── keywords.ts        # Search terms
│   ├── twitter/
│   │   ├── client.ts          # X API SDK wrapper
│   │   └── types.ts           # TypeScript interfaces
│   ├── collector/
│   │   ├── run.ts             # Main collection logic
│   │   └── storage.ts         # Tweet storage (SQLite/JSON)
│   ├── analyzer/
│   │   ├── analyze.ts         # LLM analysis
│   │   └── prompts.ts         # Prompt templates
│   ├── reports/
│   │   ├── generate.ts        # Briefing generation
│   │   └── formatters.ts      # Telegram/Notion formatting
│   ├── delivery/
│   │   ├── telegram.ts        # Telegram bot integration
│   │   └── notion.ts          # Notion API integration
│   └── index.ts               # Main entry point
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## Environment Variables

```bash
# X API
X_API_BEARER_TOKEN=AAAAAAAAAAAAAAAAAAAAAJfL7QEAAAAAV7o%2BdSzOQ%2Ft9ytLuWbBiRuIJkNI%3Dk9NkU7bTQLz0X1fKf3ngIBXxxQZoDyhfwEM8mwWdcigDvDAYbC

# Telegram
TELEGRAM_BOT_TOKEN=<your_bot_token>
TELEGRAM_CHAT_ID=8391843667

# Notion
NOTION_API_KEY=<your_integration_key>
NOTION_DAILY_BRIEFINGS_DB_ID=<database_id>

# LLM (for analysis)
OPENAI_API_KEY=<optional_for_analysis>
# OR use existing OpenClaw model via gateway
```

---

## MVP Scope (Tonight)

1. **Setup** (30 min)
   - Initialize TypeScript project
   - Install dependencies
   - Configure environment

2. **Client** (45 min)
   - X API client wrapper
   - Test Bearer token authentication
   - Fetch 1 account's tweets successfully

3. **Collection** (45 min)
   - Fetch from 5 priority accounts
   - Store in JSON file
   - Basic error handling

4. **Analysis** (60 min)
   - Simple LLM prompt
   - Extract 3-5 trends
   - Basic categorization

5. **Delivery** (30 min)
   - Format for Telegram
   - Send test message
   - (Notion integration = Phase 2)

**Total: ~4 hours for working MVP**

---

## Success Criteria

- [ ] Successfully authenticates with X API
- [ ] Fetches tweets from @gregisenberg, @chamath, @sama
- [ ] Generates daily briefing with trends + ideas
- [ ] Sends to Telegram at 5 AM ET
- [ ] Runs autonomously via cron

---

## Next Steps

1. Koji confirms he can access the Bearer token at `~/.openclaw/credentials/x-api-bearer-token`
2. Koji initializes project in `/Users/nagomi/.openclaw/agents/koji/agent/workspace/twitter-intel/`
3. Build MVP tonight
4. Test run tomorrow at 5 AM ET

**Ready to assign to Koji?**
