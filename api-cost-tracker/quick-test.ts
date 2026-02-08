import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

async function quickTest() {
  const elevenlabsKey = fs.readFileSync(
    path.join(process.env.HOME || '', '.openclaw', 'credentials', 'elevenlabs-api-key'),
    'utf-8'
  ).trim();
  
  const notionKey = fs.readFileSync(
    path.join(process.env.HOME || '', '.openclaw', 'credentials', 'notion-api-key'),
    'utf-8'
  ).trim();

  // Test ElevenLabs
  console.log('Testing ElevenLabs API...');
  try {
    const startUnix = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
    const endUnix = Math.floor(Date.now() / 1000);
    
    const elResponse = await axios.get('https://api.elevenlabs.io/v1/usage/character-stats', {
      headers: { 'xi-api-key': elevenlabsKey },
      params: { start_unix: startUnix, end_unix: endUnix },
      timeout: 10000
    });
    
    console.log('✅ ElevenLabs API working');
    console.log('Response:', JSON.stringify(elResponse.data, null, 2));
  } catch (err: any) {
    console.log('❌ ElevenLabs error:', err.message);
    if (err.response) {
      console.log('Status:', err.response.status);
      console.log('Data:', err.response.data);
    }
  }

  // Test Notion
  console.log('\nTesting Notion API...');
  try {
    const notionResponse = await axios.get('https://api.notion.com/v1/users/me', {
      headers: {
        'Authorization': `Bearer ${notionKey}`,
        'Notion-Version': '2022-06-28'
      },
      timeout: 10000
    });
    console.log('✅ Notion API working');
    console.log('Bot:', notionResponse.data.name);
  } catch (err: any) {
    console.log('❌ Notion error:', err.message);
    if (err.response) {
      console.log('Status:', err.response.status);
      console.log('Data:', err.response.data);
    }
  }
}

quickTest();
