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
export declare function getDefaultElevenLabsSubscription(tier?: string): ElevenLabsSubscription;
export declare function fetchElevenLabsSubscription(apiKey: string): Promise<ElevenLabsSubscription | null>;
export declare function calculateElevenLabsCost(subscription: ElevenLabsSubscription): number;
//# sourceMappingURL=elevenlabs.d.ts.map