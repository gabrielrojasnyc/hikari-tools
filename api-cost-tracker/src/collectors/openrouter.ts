export interface OpenRouterUsage {
  total_cost: number;
  total_tokens: number;
  requests: number;
}

export async function fetchOpenRouterUsage(apiKey: string): Promise<OpenRouterUsage | null> {
  try {
    const response = await fetch('https://api.openrouter.ai/v1/usage', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`OpenRouter API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    
    // OpenRouter usage endpoint returns usage data
    return {
      total_cost: data.total_cost || 0,
      total_tokens: data.total_tokens || 0,
      requests: data.requests || 0
    };
  } catch (error) {
    console.error('Error fetching OpenRouter usage:', error);
    return null;
  }
}
