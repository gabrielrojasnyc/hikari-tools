import { Client } from '@notionhq/client';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Read API key
const keyPath = path.join(os.homedir(), ".openclaw", "credentials", "notion-api-key");
const apiKey = fs.readFileSync(keyPath, "utf8").trim();

const notion = new Client({ auth: apiKey });

async function run() {
  try {
    const result = await notion.databases.query({ database_id: 'bcbc8a98-0bc4-4e79-8621-0d169d3608c0' });
    console.log('Query successful!');
    if (result.results.length > 0) {
      console.log('First item properties:', JSON.stringify(result.results[0].properties, null, 2));
      
      // Check specifically for Status field as requested
      if (result.results[0].properties.Status) {
        console.log('Status field found:', result.results[0].properties.Status);
      } else {
        console.log('Status field NOT found in the first item.');
      }
    } else {
      console.log('Database is empty.');
    }
  } catch (error) {
    console.error('Error running test:', error);
  }
}

run();
