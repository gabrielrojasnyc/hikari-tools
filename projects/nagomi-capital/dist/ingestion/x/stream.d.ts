import { ParsedSignal } from './parsers.js';
/**
 * X/Twitter Polling Client
 * Fetches tweets every 5 minutes (Basic API compatible)
 * Replaces streaming for accounts without Elevated access
 */
export declare class XStreamClient {
    private client;
    private isRunning;
    private handlers;
    private recentTweetIds;
    private readonly MAX_RECENT_IDS;
    private pollInterval;
    private readonly POLL_INTERVAL_MS;
    constructor();
    /**
     * Start polling tweets from configured accounts
     */
    start(): Promise<void>;
    /**
     * Stop polling
     */
    stop(): Promise<void>;
    /**
     * Register a handler for parsed signals
     */
    onSignal(handler: (signal: ParsedSignal) => void): void;
    /**
     * Poll tweets from all configured accounts
     */
    private pollTweets;
    /**
     * Fetch tweets for a specific account
     */
    private fetchTweetsForAccount;
    /**
     * Utility delay function
     */
    private delay;
    /**
     * Health check
     */
    isHealthy(): boolean;
    /**
     * Force immediate poll (for testing)
     */
    forcePoll(): Promise<void>;
}
export declare function getStreamClient(): XStreamClient;
//# sourceMappingURL=stream.d.ts.map