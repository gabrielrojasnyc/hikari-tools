import { Client } from '@notionhq/client';
export class NotionClient {
    client;
    databaseId = null;
    constructor(apiKey) {
        this.client = new Client({ auth: apiKey });
    }
    async findOrCreateDatabase() {
        try {
            // Search for existing "API Costs" database
            const searchResponse = await this.client.search({
                query: 'API Costs',
                filter: {
                    property: 'object',
                    value: 'database'
                }
            });
            if (searchResponse.results.length > 0) {
                this.databaseId = searchResponse.results[0].id;
                console.log(`Found existing database: ${this.databaseId}`);
                return this.databaseId;
            }
            // Create new database if not found
            return await this.createDatabase();
        }
        catch (error) {
            console.error('Error finding/creating database:', error);
            return null;
        }
    }
    async createDatabase() {
        try {
            // We need a parent page to create the database
            // Search for a suitable parent
            const searchResponse = await this.client.search({
                page_size: 1
            });
            if (searchResponse.results.length === 0) {
                console.error('No pages found to create database in');
                return null;
            }
            const parentPage = searchResponse.results.find(r => r.object === 'page');
            if (!parentPage) {
                console.error('No suitable parent page found');
                return null;
            }
            const response = await this.client.databases.create({
                parent: {
                    page_id: parentPage.id
                },
                title: [
                    {
                        type: 'text',
                        text: {
                            content: 'API Costs'
                        }
                    }
                ],
                properties: {
                    'Timestamp': {
                        type: 'date',
                        date: {}
                    },
                    'Provider': {
                        type: 'select',
                        select: {
                            options: [
                                { name: 'OpenRouter', color: 'blue' },
                                { name: 'ElevenLabs', color: 'purple' }
                            ]
                        }
                    },
                    'Cost USD': {
                        type: 'number',
                        number: {
                            format: 'dollar'
                        }
                    },
                    'Tokens Used': {
                        type: 'number',
                        number: {
                            format: 'number'
                        }
                    },
                    'Characters Used': {
                        type: 'number',
                        number: {
                            format: 'number'
                        }
                    },
                    'Tier': {
                        type: 'rich_text',
                        rich_text: {}
                    },
                    'Notes': {
                        type: 'rich_text',
                        rich_text: {}
                    }
                }
            });
            this.databaseId = response.id;
            console.log(`Created new database: ${this.databaseId}`);
            return this.databaseId;
        }
        catch (error) {
            console.error('Error creating database:', error);
            return null;
        }
    }
    async addCostEntry(entry) {
        if (!this.databaseId) {
            const dbId = await this.findOrCreateDatabase();
            if (!dbId) {
                console.error('Could not find or create database');
                return false;
            }
        }
        try {
            const properties = {
                'Timestamp': {
                    type: 'date',
                    date: {
                        start: entry.timestamp
                    }
                },
                'Provider': {
                    type: 'select',
                    select: {
                        name: entry.provider
                    }
                },
                'Cost USD': {
                    type: 'number',
                    number: entry.costUsd
                }
            };
            if (entry.tokensUsed !== undefined) {
                properties['Tokens Used'] = {
                    type: 'number',
                    number: entry.tokensUsed
                };
            }
            if (entry.charactersUsed !== undefined) {
                properties['Characters Used'] = {
                    type: 'number',
                    number: entry.charactersUsed
                };
            }
            if (entry.tier) {
                properties['Tier'] = {
                    type: 'rich_text',
                    rich_text: [
                        {
                            type: 'text',
                            text: {
                                content: entry.tier
                            }
                        }
                    ]
                };
            }
            if (entry.notes) {
                properties['Notes'] = {
                    type: 'rich_text',
                    rich_text: [
                        {
                            type: 'text',
                            text: {
                                content: entry.notes
                            }
                        }
                    ]
                };
            }
            await this.client.pages.create({
                parent: {
                    database_id: this.databaseId
                },
                properties
            });
            console.log(`Added entry for ${entry.provider}: $${entry.costUsd}`);
            return true;
        }
        catch (error) {
            console.error('Error adding cost entry:', error);
            return false;
        }
    }
}
//# sourceMappingURL=client.js.map