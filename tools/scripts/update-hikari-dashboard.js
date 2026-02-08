#!/usr/bin/env node
/**
 * Hikari Work Dashboard Updater
 * Updates agent status, health, and run times in Notion
 */

const fs = require('fs');
const path = require('path');

// Load Notion client from MCP server directory
const NOTION_CLIENT_PATH = path.join(process.env.HOME, '.openclaw/mcp-servers/notion/node_modules/@notionhq/client');
const { Client } = require(NOTION_CLIENT_PATH);

const NOTION_KEY = fs.readFileSync(
  path.join(process.env.HOME, '.openclaw/credentials/notion-api-key'),
  'utf8'
).trim();

const notion = new Client({ auth: NOTION_KEY });

// Database ID for Hikari Work Dashboard
const DASHBOARD_DB_ID = '3c2b24bd-0515-473c-bb5a-565f31ba5d47';

// Agent definitions
const AGENTS = {
  'Mika (Analyst)': {
    type: 'Analyst',
    schedule: '6am',
    cronJob: 'trading:morning-brief'
  },
  'Sora (Trader)': {
    type: 'Trader',
    schedule: '9:25am, 12pm, 3:55pm',
    cronJob: 'trading:pre-open-check,trading:midday-check,trading:eod-report'
  },
  'Koji (Coder)': {
    type: 'Coder',
    schedule: 'Ad-hoc',
    cronJob: 'on-demand'
  },
  'Hikari (Chief of Staff)': {
    type: 'Chief of Staff',
    schedule: 'Always-on',
    cronJob: 'main-session'
  }
};

async function getDashboardEntries() {
  const response = await notion.databases.query({
    database_id: DASHBOARD_DB_ID,
  });
  return response.results;
}

async function updateEntry(pageId, updates) {
  await notion.pages.update({
    page_id: pageId,
    properties: updates
  });
}

async function createEntry(name, agentData) {
  const now = new Date().toISOString();
  
  await notion.pages.create({
    parent: { database_id: DASHBOARD_DB_ID },
    properties: {
      'Name': {
        title: [{ text: { content: name } }]
      },
      'Agent Type': {
        select: { name: agentData.type }
      },
      'Schedule': {
        select: { name: agentData.schedule.split(',')[0].trim() }
      },
      'Status': {
        select: { name: '🟢 Running' }
      },
      'Health': {
        select: { name: '✅ Healthy' }
      },
      'Last Run': {
        date: { start: now }
      },
      'Next Run': {
        date: { start: calculateNextRun(agentData.schedule) }
      }
    }
  });
}

function calculateNextRun(schedule) {
  const now = new Date();
  const times = schedule.split(',').map(t => t.trim());
  
  for (const time of times) {
    if (time === 'Always-on') {
      return now.toISOString();
    }
    if (time === 'Ad-hoc') {
      return new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // +1 hour
    }
    // Parse times like "6am", "9:25am"
    const match = time.match(/(\d+):?(\d+)?\s*(am|pm)/i);
    if (match) {
      let hours = parseInt(match[1]);
      const minutes = match[2] ? parseInt(match[2]) : 0;
      const period = match[3].toLowerCase();
      
      if (period === 'pm' && hours !== 12) hours += 12;
      if (period === 'am' && hours === 12) hours = 0;
      
      const nextRun = new Date(now);
      nextRun.setHours(hours, minutes, 0, 0);
      
      if (nextRun > now) {
        return nextRun.toISOString();
      }
    }
  }
  
  // Default to tomorrow 6am
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(6, 0, 0, 0);
  return tomorrow.toISOString();
}

async function checkAgentHealth(agentName) {
  // Check cron jobs
  const { execSync } = require('child_process');
  try {
    const cronStatus = execSync('openclaw cron list --json 2>/dev/null || echo "[]"', { encoding: 'utf8' });
    const jobs = JSON.parse(cronStatus);
    
    const agentJobs = {
      'Mika (Analyst)': ['trading:morning-brief'],
      'Sora (Trader)': ['trading:pre-open-check', 'trading:midday-check', 'trading:eod-report'],
      'Koji (Coder)': [],
      'Hikari (Chief of Staff)': []
    };
    
    const relevantJobs = agentJobs[agentName] || [];
    if (relevantJobs.length === 0) {
      return { health: '✅ Healthy', status: '🟢 Running' };
    }
    
    const allEnabled = relevantJobs.every(jobName => {
      const job = jobs.find(j => j.name === jobName);
      return job && job.enabled;
    });
    
    return {
      health: allEnabled ? '✅ Healthy' : '⚠️ Warning',
      status: allEnabled ? '🟢 Running' : '🔴 Stopped'
    };
  } catch (e) {
    return { health: '🔴 Critical', status: '⚠️ Error' };
  }
}

async function main() {
  try {
    const entries = await getDashboardEntries();
    const entryMap = new Map(entries.map(e => [
      e.properties.Name.title[0]?.plain_text,
      e
    ]));
    
    for (const [name, agentData] of Object.entries(AGENTS)) {
      const health = await checkAgentHealth(name);
      const now = new Date().toISOString();
      
      const updates = {
        'Status': { select: { name: health.status } },
        'Health': { select: { name: health.health } },
        'Last Run': { date: { start: now } },
        'Next Run': { date: { start: calculateNextRun(agentData.schedule) } }
      };
      
      const existing = entryMap.get(name);
      if (existing) {
        await updateEntry(existing.id, updates);
        console.log(`✅ Updated ${name}`);
      } else {
        await createEntry(name, agentData);
        console.log(`🆕 Created ${name}`);
      }
    }
    
    console.log('Dashboard updated successfully');
  } catch (error) {
    console.error('Error updating dashboard:', error.message);
    process.exit(1);
  }
}

main();
