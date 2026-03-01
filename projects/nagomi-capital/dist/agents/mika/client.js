import { logger } from '../../utils/logger.js';
import { getOpenRouterCredentials } from '../../utils/credentials.js';
export class GrokClient {
    apiKey;
    baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
    model = 'x-ai/grok-4.1-fast'; // Grok 4.1 Fast via OpenRouter
    constructor() {
        // Load credentials from Vault
        const creds = getOpenRouterCredentials();
        this.apiKey = creds.apiKey;
    }
    async generate(systemPrompt, userContent, temperature = 0.7) {
        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://nagomi.capital',
                    'X-Title': 'Nagomi Capital'
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userContent }
                    ],
                    temperature,
                    max_tokens: 2000
                })
            });
            if (!response.ok) {
                throw new Error(`OpenRouter API error: ${response.status}`);
            }
            const data = await response.json();
            return data.choices?.[0]?.message?.content || '';
        }
        catch (error) {
            logger.error('LLM generation failed', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    async generateJSON(systemPrompt, userContent) {
        const prompt = `${systemPrompt}\n\nIMPORTANT: Return ONLY valid JSON. No markdown formatting, no code blocks.`;
        try {
            const raw = await this.generate(prompt, userContent, 0.4);
            // Clean up markdown code blocks if present
            const jsonStr = raw.replace(/```json\n|\n```/g, '').replace(/```/g, '').trim();
            return JSON.parse(jsonStr);
        }
        catch (error) {
            logger.error('Failed to parse LLM JSON response', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
}
// Singleton instance - lazily initialized
let grokInstance = null;
export function getGrokClient() {
    if (!grokInstance) {
        grokInstance = new GrokClient();
    }
    return grokInstance;
}
// NOTE: Don't export 'grok' instance directly - it would be created at import time
// before credentials are initialized. Use getGrokClient() instead after credentials.initialize()
//# sourceMappingURL=client.js.map