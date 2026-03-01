import { CostTracker } from './index';
import * as fs from 'fs';
import * as path from 'path';
// Load credentials
function loadCredential(filename) {
    const credPath = path.join(process.env.HOME || '', '.openclaw', 'credentials', filename);
    if (fs.existsSync(credPath)) {
        return fs.readFileSync(credPath, 'utf-8').trim();
    }
    return undefined;
}
async function main() {
    const openrouterKey = process.env.OPENROUTER_API_KEY || loadCredential('openrouter-api-key');
    const elevenlabsKey = process.env.ELEVENLABS_API_KEY || loadCredential('elevenlabs-api-key');
    const anthropicKey = process.env.ANTHROPIC_API_KEY || loadCredential('anthropic-api-key');
    const notionKey = process.env.NOTION_API_KEY || loadCredential('notion-api-key');
    if (!notionKey) {
        console.error('❌ Notion API key required');
        process.exit(1);
    }
    console.log('🔑 Loading credentials...');
    console.log(`  OpenRouter: ${openrouterKey ? '✅' : '❌'}`);
    console.log(`  ElevenLabs: ${elevenlabsKey ? '✅' : '❌'}`);
    console.log(`  Anthropic: ${anthropicKey ? '✅' : '❌'}`);
    console.log(`  Notion: ${notionKey ? '✅' : '❌'}`);
    const tracker = new CostTracker({
        openrouterKey,
        elevenlabsKey,
        anthropicKey,
        notionKey
    });
    // Initialize (creates Notion database if needed)
    console.log('\n🚀 Initializing...');
    await tracker.initialize();
    // Test connections
    console.log('\n🔌 Testing connections...');
    const connections = await tracker.testConnections();
    for (const [provider, connected] of Object.entries(connections)) {
        console.log(`  ${provider}: ${connected ? '✅ Connected' : '❌ Failed'}`);
    }
    // Collect costs
    console.log('\n📊 Collecting costs...');
    const reports = await tracker.collectAll();
    // Sync to Notion
    console.log('\n📝 Syncing to Notion...');
    await tracker.syncToNotion();
    // Show dashboard
    console.log('\n📈 Generating dashboard...');
    const dashboard = await tracker.getDashboard();
    tracker.printDashboard(dashboard);
    console.log('✅ Done!');
}
main().catch(console.error);
//# sourceMappingURL=cli.js.map