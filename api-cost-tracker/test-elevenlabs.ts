import { ElevenLabsCollector } from './src/collectors/elevenlabs';
import { NotionClient } from './src/notion/client';
import * as fs from 'fs';
import * as path from 'path';

async function testElevenLabs() {
  const elevenlabsKey = fs.readFileSync(
    path.join(process.env.HOME || '', '.openclaw', 'credentials', 'elevenlabs-api-key'),
    'utf-8'
  ).trim();
  
  const notionKey = fs.readFileSync(
    path.join(process.env.HOME || '', '.openclaw', 'credentials', 'notion-api-key'),
    'utf-8'
  ).trim();

  console.log('Testing ElevenLabs connection...');
  const collector = new ElevenLabsCollector({ apiKey: elevenlabsKey });
  
  const connected = await collector.testConnection();
  console.log(`ElevenLabs connected: ${connected}`);
  
  // Try collecting even if connection test fails
  console.log('\nAttempting to collect usage anyway...');

  if (connected) {
    console.log('\nCollecting usage data...');
    const report = await collector.collectCosts();
    console.log(`Found ${report.entries.length} entries`);
    console.log(`Total estimated cost: $${report.totalCost.toFixed(4)}`);
    
    if (report.entries.length > 0) {
      console.log('\nSample entries:');
      report.entries.slice(0, 3).forEach((entry, i) => {
        console.log(`  ${i + 1}. ${entry.model}: ${entry.characters} chars = $${entry.costUsd.toFixed(4)}`);
      });
    }

    // Test Notion sync
    console.log('\nTesting Notion integration...');
    const notion = new NotionClient({ apiKey: notionKey });
    const dbId = await notion.createCostLogDatabase();
    console.log(`Database ID: ${dbId}`);

    if (report.entries.length > 0) {
      console.log('\nAdding entries to Notion...');
      const ids = await notion.addMultipleEntries(report.entries.slice(0, 5));
      console.log(`Added ${ids.length} entries to Notion`);
    }
  }
}

testElevenLabs().catch(console.error);
