export interface ElevenLabsSubscription {
  tier: string;
  character_count: number;
  character_limit: number;
  can_extend_character_limit: boolean;
  allowed_to_extend_character_limit: boolean;
  next_character_count_reset_unix: number;
  voice_limit: number;
  professional_voice_limit: number;
  currency: string;
  status: string;
  billing_period?: string;
  character_count_refresh_unix?: number;
}

// Default tier info when API key lacks user_read permission
export function getDefaultElevenLabsSubscription(tier: string = 'creator'): ElevenLabsSubscription {
  const tierLimits: Record<string, number> = {
    'starter': 30000,
    'creator': 100000,
    'pro': 500000,
    'scale': 2000000,
    'business': 11000000
  };

  const now = Math.floor(Date.now() / 1000);
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  nextMonth.setDate(1);
  const resetUnix = Math.floor(nextMonth.getTime() / 1000);

  return {
    tier: tier.toLowerCase(),
    character_count: 0,
    character_limit: tierLimits[tier.toLowerCase()] || 100000,
    can_extend_character_limit: tier.toLowerCase() !== 'starter',
    allowed_to_extend_character_limit: tier.toLowerCase() !== 'starter',
    next_character_count_reset_unix: resetUnix,
    voice_limit: tier.toLowerCase() === 'starter' ? 1 : 3,
    professional_voice_limit: 0,
    currency: 'usd',
    status: 'active'
  };
}

export async function fetchElevenLabsSubscription(apiKey: string): Promise<ElevenLabsSubscription | null> {
  try {
    const response = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.warn(`ElevenLabs API error: ${response.status} ${response.statusText}`);
      console.log('Using default subscription info (API key lacks user_read permission)');
      return getDefaultElevenLabsSubscription('creator');
    }

    const data = await response.json();
    return data as ElevenLabsSubscription;
  } catch (error) {
    console.error('Error fetching ElevenLabs subscription:', error);
    return getDefaultElevenLabsSubscription('creator');
  }
}

export function calculateElevenLabsCost(subscription: ElevenLabsSubscription): number {
  // ElevenLabs uses character-based pricing
  // Starter tier: $5/month for 30k chars
  // Creator tier: $22/month for 100k chars
  // Pro tier: $99/month for 500k chars
  // Scale tier: $330/month for 2M chars
  // Business tier: $1320/month for 11M chars
  
  const tierPricing: Record<string, number> = {
    'starter': 5,
    'creator': 22,
    'pro': 99,
    'scale': 330,
    'business': 1320
  };

  return tierPricing[subscription.tier.toLowerCase()] || 0;
}
