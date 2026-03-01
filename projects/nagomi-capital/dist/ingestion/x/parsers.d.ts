/**
 * Signal Extractors
 * Parse tweets from X accounts into structured trading signals
 */
import { TweetV2 } from 'twitter-api-v2';
export type AssetClass = 'equity' | 'options' | 'crypto';
export type SignalDirection = 'LONG' | 'SHORT' | 'NEUTRAL' | 'UNKNOWN';
export type SignalType = 'whale_alert' | 'options_flow' | 'price_action' | 'unusual_volume' | 'sweep' | 'on_chain' | 'technical_break' | 'news_catalyst' | 'sentiment_shift' | 'unknown';
export interface ParsedSignal {
    tweetId: string;
    sourceHandle: string;
    category: AssetClass;
    weight: number;
    rawText: string;
    timestamp: Date;
    isValid: boolean;
    asset: string | null;
    assetClass: AssetClass | null;
    direction: SignalDirection;
    signalType: SignalType;
    confidence: number;
    price?: number;
    size?: string;
    mentions: string[];
    hashtags: string[];
    tickers: string[];
    urls: string[];
    isRetweet: boolean;
    isReply: boolean;
    hasMedia: boolean;
    engagementScore: number;
}
/**
 * Parse a tweet into a structured trading signal
 */
export declare function parseTweet(tweet: TweetV2, sourceHandle?: string): ParsedSignal;
/**
 * Parse whale alert specific format
 */
export declare function parseWhaleAlert(text: string): {
    asset: string | null;
    amount: number | null;
    from: string | null;
    to: string | null;
    isExchangeInflow: boolean;
};
/**
 * Parse options flow format
 */
export declare function parseOptionsFlow(text: string): {
    ticker: string | null;
    callPut: 'CALL' | 'PUT' | null;
    strike: number | null;
    expiration: string | null;
    size: number | null;
    premium: number | null;
    sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
};
//# sourceMappingURL=parsers.d.ts.map