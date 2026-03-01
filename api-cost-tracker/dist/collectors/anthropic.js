import axios from 'axios';
export class AnthropicCollector {
    apiKey;
    baseUrl = 'https://api.anthropic.com/v1';
    constructor(config) {
        this.apiKey = config.apiKey;
    }
    async collectCosts(startDate, endDate) {
        const start = startDate || new Date(Date.now() - 24 * 60 * 60 * 1000);
        const end = endDate || new Date();
        try {
            // Anthropic doesn't have a usage API, so we'll need to track costs manually
            // For now, return empty report with note
            console.log('Anthropic usage tracking requires manual logging or API key with usage access');
            return {
                provider: 'anthropic',
                entries: [],
                totalCost: 0,
                periodStart: start,
                periodEnd: end
            };
        }
        catch (error) {
            console.error('Anthropic collection error:', error);
            throw error;
        }
    }
    // Helper to calculate cost from tokens (for manual tracking)
    calculateCost(model, inputTokens, outputTokens) {
        const pricing = {
            'claude-3-5-sonnet-20241022': { input: 0.000003, output: 0.000015 },
            'claude-3-opus-20240229': { input: 0.000015, output: 0.000075 },
            'claude-3-haiku-20240307': { input: 0.00000025, output: 0.00000125 },
            'claude-3-5-haiku-20241022': { input: 0.0000008, output: 0.000004 },
        };
        const rates = pricing[model] || pricing['claude-3-5-sonnet-20241022'];
        return (inputTokens * rates.input) + (outputTokens * rates.output);
    }
    async testConnection() {
        try {
            const response = await axios.get(`${this.baseUrl}/models`, {
                headers: {
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01',
                    'Content-Type': 'application/json'
                }
            });
            return response.status === 200;
        }
        catch (error) {
            return false;
        }
    }
}
//# sourceMappingURL=anthropic.js.map