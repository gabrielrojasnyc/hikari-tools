import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

async function checkDatabase() {
  const notionKey = fs.readFileSync(
    path.join(process.env.HOME || '', '.openclaw', 'credentials', 'notion-api-key'),
    'utf-8'
  ).trim();

  const dbId = '50fdd8b8-f75f-43f4-9da2-17150465f177';
  
  console.log('Checking database schema...');
  const response = await axios.get(`https://api.notion.com/v1/databases/${dbId}`, {
    headers: {
      'Authorization': `Bearer ${notionKey}`,
      'Notion-Version': '2022-06-28'
    }
  });
  
  console.log('Database title:', response.data.title?.[0]?.text?.content || 'Untitled');
  console.log('\nProperties:');
  for (const [name, prop] of Object.entries(response.data.properties)) {
    console.log(`  ${name}: ${(prop as any).type}`);
  }
}

checkDatabase().catch(console.error);
