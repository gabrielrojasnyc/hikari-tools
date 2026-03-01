import { fetchOpenRouterUsage } from './collectors/openrouter.js';
import { fetchElevenLabsSubscription, calculateElevenLabsCost } from './collectors/elevenlabs.js';
import { NotionClient } from './notion/client.js';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
function loadCredential(filename) {
    try {
        const path = join(homedir(), '.openclaw', 'credentials', filename);
        return readFileSync(path, 'utf-8').trim();
    }
    catch (error) {
        console.warn(`Could not load credential: ${filename}`);
        return null;
    }
}
async function main() {
    console.log('🚀 API Cost Tracker\n');
    const now = new Date();
    const timestamp = now.toISOString();
    // Load credentials
    const openRouterKey = loadCredential('openrouter-api-key');
    const elevenLabsKey = loadCredential('elevenlabs-api-key');
    const notionKey = loadCredential('notion-api-key');
    if (!notionKey) {
        console.error('❌ Notion API key is required');
        process.exit(1);
    }
    // Initialize Notion client
    const notion = new NotionClient(notionKey);
    // Collect and post OpenRouter data
    if (openRouterKey) {
        console.log('📊 Fetching OpenRouter usage...');
        const openRouterData = await fetchOpenRouterUsage(openRouterKey);
        if (openRouterData) {
            const entry = {
                timestamp,
                provider: 'OpenRouter',
                costUsd: openRouterData.total_cost,
                tokensUsed: openRouterData.total_tokens,
                notes: `Requests: ${openRouterData.requests}`
            };
            const success = await notion.addCostEntry(entry);
            if (success) {
                console.log(`✅ OpenRouter: $${openRouterData.total_cost.toFixed(4)} for ${openRouterData.total_tokens} tokens`);
            }
            else {
                console.error('❌ Failed to add OpenRouter entry');
            }
        }
        else {
            console.warn('⚠️ Could not fetch OpenRouter data');
        }
    }
    else {
        console.log('⚠️ Skipping OpenRouter (no API key)');
    }
    // Collect and post ElevenLabs data
    if (elevenLabsKey) {
        console.log('\n🎙️ Fetching ElevenLabs subscription...');
        const elevenLabsData = await fetchElevenLabsSubscription(elevenLabsKey);
        if (elevenLabsData) {
            const costUsd = calculateElevenLabsCost(elevenLabsData);
            const entry = {
                timestamp,
                provider: 'ElevenLabs',
                costUsd,
                charactersUsed: elevenLabsData.character_count,
                tier: elevenLabsData.tier,
                notes: `Limit: ${elevenLabsData.character_limit}, Reset: ${new Date(elevenLabsData.next_character_count_reset_unix * 1000).toLocaleDateString()}`
            };
            const success = await notion.addCostEntry(entry);
            if (success) {
                console.log(`✅ ElevenLabs: $${costUsd.toFixed(2)}/month (${elevenLabsData.tier} tier), ${elevenLabsData.character_count}/${elevenLabsData.character_limit} chars used`);
            }
            else {
                console.error('❌ Failed to add ElevenLabs entry');
            }
        }
        else {
            console.warn('⚠️ Could not fetch ElevenLabs data');
        }
    }
    else {
        console.log('⚠️ Skipping ElevenLabs (no API key)');
    }
    console.log('\n✨ Done!');
}
main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map