import { NotionClient } from './src/notion/client';
import * as fs from 'fs';
import * as path from 'path';

async function testNotionSetup() {
  const notionKey = fs.readFileSync(
    path.join(process.env.HOME || '', '.openclaw', 'credentials', 'notion-api-key'),
    'utf-8'
  ).trim();

  const notion = new NotionClient({ apiKey: notionKey });

  console.log('Creating Notion database...');
  const dbId = await notion.createCostLogDatabase();
  console.log(`✅ Database created/connected: ${dbId}`);

  // Add a test entry
  console.log('\nAdding test entries...');
  const testEntries = [
    {
      provider: 'elevenlabs' as const,
      model: 'eleven_multilingual_v2',
      costUsd: 0.0123,
      characters: 41,
      timestamp: new Date(),
      metadata: { test: true }
    },
    {
      provider: 'openrouter' as const,
      model: 'moonshotai/kimi-k2.5',
      costUsd: 0.0456,
      tokensInput: 1500,
      tokensOutput: 800,
      timestamp: new Date(Date.now() - 3600000),
      metadata: { test: true }
    }
  ];

  const ids = await notion.addMultipleEntries(testEntries);
  console.log(`✅ Added ${ids.length} test entries`);

  // Get dashboard data
  console.log('\nFetching dashboard data...');
  const byProvider = await notion.getCostsByProvider();
  console.log('Costs by provider:', byProvider);

  const recent = await notion.getRecentEntries(5);
  console.log(`\nRecent entries (${recent.length}):`);
  recent.forEach((entry, i) => {
    const props = entry.properties;
    const provider = props.Provider?.select?.name;
    const cost = props['Cost (USD)']?.number;
    const model = props.Model?.title?.[0]?.text?.content;
    console.log(`  ${i + 1}. [${provider}] ${model}: $${cost?.toFixed(4) || 'N/A'}`);
  });
}

testNotionSetup().catch(console.error);
