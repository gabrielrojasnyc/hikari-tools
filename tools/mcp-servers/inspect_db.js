import { Client } from '@notionhq/client';
import fs from 'fs';
import path from 'path';
import os from 'os';

const keyPath = path.join(os.homedir(), ".openclaw", "credentials", "notion-api-key");
const apiKey = fs.readFileSync(keyPath, "utf8").trim();

const notion = new Client({ auth: apiKey });

async function inspectDatabase() {
  try {
    const db = await notion.databases.retrieve({ database_id: 'bcbc8a98-0bc4-4e79-8621-0d169d3608c0' });
    console.log('Database properties:', JSON.stringify(db.properties, null, 2));
  } catch (error) {
    console.error('Error inspecting database:', error);
  }
}

inspectDatabase();
