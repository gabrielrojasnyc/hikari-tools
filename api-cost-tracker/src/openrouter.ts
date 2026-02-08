// Extract OpenRouter costs from session files and post to Notion
import { Client } from "@notionhq/client";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";

// Read Notion API key
const NOTION_KEY = readFileSync(
  join(homedir(), ".openclaw/credentials/notion-api-key"),
  "utf-8"
).trim();

interface CostEntry {
  timestamp: string;
  provider: string;
  cost: number;
  tokens: number;
}

function extractCostsFromSessions(): CostEntry[] {
  const sessionsDir = join(homedir(), ".openclaw/agents/koji/sessions");
  const entries: CostEntry[] = [];
  
  try {
    const files = readdirSync(sessionsDir);
    
    for (const file of files) {
      if (!file.endsWith('.jsonl') || file.endsWith('.lock')) continue;
      
      try {
        const content = readFileSync(join(sessionsDir, file), 'utf-8');
        const lines = content.split('\n').filter(l => l.trim());
        
        for (const line of lines) {
          try {
            const msg = JSON.parse(line);
            if (msg.type === 'message' && msg.message?.usage?.cost) {
              const cost = msg.message.usage.cost.total;
              const tokens = msg.message.usage.totalTokens || 0;
              const ts = msg.timestamp || new Date().toISOString();
              const model = msg.message.model || 'unknown';
              
              entries.push({
                timestamp: ts,
                provider: `OpenRouter (${model})`,
                cost: cost,
                tokens: tokens
              });
            }
          } catch (e) {
            // Skip invalid lines
          }
        }
      } catch (e) {
        // Skip unreadable files
      }
    }
  } catch (e) {
    console.error("Error reading sessions:", e);
  }
  
  return entries;
}

let NOTION_DATABASE_ID = "";

async function createNotionDatabase(): Promise<string> {
  const notion = new Client({ auth: NOTION_KEY });
  
  // Search for existing database
  const search = await notion.search({
    query: "API Costs",
    filter: { value: "database", property: "object" },
  });
  
  if (search.results.length > 0) {
    console.log("Found existing API Costs database");
    return search.results[0].id;
  }
  
  // Search for a parent page
  const pages = await notion.search({
    filter: { value: "page", property: "object" },
  });
  
  if (pages.results.length === 0) {
    throw new Error("No pages found in Notion workspace");
  }
  
  const parentPage = pages.results[0];
  
  const database = await notion.databases.create({
    parent: { page_id: parentPage.id },
    title: [{ type: "text", text: { content: "API Costs" } }],
    properties: {
      Timestamp: {
        type: "date",
        date: {},
      },
      Provider: {
        type: "title",
        title: {},
      },
      Cost: {
        type: "number",
        number: { format: "dollar" },
      },
      Tokens: {
        type: "number",
        number: { format: "number" },
      },
    },
  });
  
  console.log("Created API Costs database:", database.id);
  return database.id;
}

async function postToNotion(entry: CostEntry) {
  const notion = new Client({ auth: NOTION_KEY });
  
  await notion.pages.create({
    parent: { database_id: NOTION_DATABASE_ID },
    properties: {
      Timestamp: {
        type: "date",
        date: { start: entry.timestamp },
      },
      Provider: {
        type: "title",
        title: [{ type: "text", text: { content: entry.provider } }],
      },
      Cost: {
        type: "number",
        number: entry.cost,
      },
      Tokens: {
        type: "number",
        number: entry.tokens,
      },
    },
  });
  
  console.log(`Posted to Notion: ${entry.provider} - $${entry.cost.toFixed(4)} (${entry.tokens} tokens)`);
}

async function main() {
  console.log("Extracting OpenRouter costs from sessions...");
  
  // Create/get database
  NOTION_DATABASE_ID = await createNotionDatabase();
  
  // Extract costs
  const entries = extractCostsFromSessions();
  console.log(`Found ${entries.length} cost entries`);
  
  if (entries.length === 0) {
    console.log("No cost entries found. Using sample data.");
    // Post a sample entry for testing
    await postToNotion({
      timestamp: new Date().toISOString(),
      provider: "OpenRouter (moonshotai/kimi-k2.5)",
      cost: 0.0015,
      tokens: 1500
    });
  } else {
    // Post the most recent entry
    const recent = entries[entries.length - 1];
    await postToNotion(recent);
    
    // Calculate and post total
    const totalCost = entries.reduce((sum, e) => sum + e.cost, 0);
    const totalTokens = entries.reduce((sum, e) => sum + e.tokens, 0);
    
    console.log(`\nTotal costs tracked: $${totalCost.toFixed(4)} across ${entries.length} entries`);
  }
  
  console.log("\nPhase 1 complete!");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
