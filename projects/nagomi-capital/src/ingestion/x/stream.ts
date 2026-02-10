import { TwitterApi } from 'twitter-api-v2';
import { logger } from '../../utils/logger.js';
import { getAllHandles } from '../../config/accounts.js';
import { ParsedSignal, parseTweet } from './parsers.js';
import { getXCredentials } from '../../utils/credentials.js';

/**
 * X/Twitter Polling Client
 * Fetches tweets every 5 minutes (Basic API compatible)
 * Replaces streaming for accounts without Elevated access
 */

export class XStreamClient {
  private client: TwitterApi;
  private isRunning = false;
  private handlers: ((signal: ParsedSignal) => void)[] = [];
  private recentTweetIds = new Set<string>();
  private readonly MAX_RECENT_IDS = 1000;
  private pollInterval: NodeJS.Timeout | null = null;
  private readonly POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Load credentials from Vault
    const creds = getXCredentials();
    
    this.client = new TwitterApi({
      appKey: creds.apiKey,
      appSecret: creds.apiSecret,
      accessToken: creds.accessToken,
      accessSecret: creds.accessSecret,
    });
  }

  /**
   * Start polling tweets from configured accounts
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Polling already active');
      return;
    }

    try {
      logger.info('Starting X polling mode', { 
        handles: getAllHandles().length,
        intervalMinutes: 5
      });

      // Do initial poll
      await this.pollTweets();

      // Set up interval
      this.pollInterval = setInterval(() => {
        this.pollTweets().catch(err => {
          logger.error('Poll error', { error: err instanceof Error ? err.message : 'Unknown' });
        });
      }, this.POLL_INTERVAL_MS);

      this.isRunning = true;
      logger.info('X polling mode active');
    } catch (error) {
      logger.error('Failed to start X polling', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Stop polling
   */
  async stop(): Promise<void> {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.isRunning = false;
    logger.info('X polling stopped');
  }

  /**
   * Register a handler for parsed signals
   */
  onSignal(handler: (signal: ParsedSignal) => void): void {
    this.handlers.push(handler);
  }

  /**
   * Poll tweets from all configured accounts
   */
  private async pollTweets(): Promise<void> {
    const handles = getAllHandles();
    logger.debug('Polling tweets', { handleCount: handles.length });

    let totalSignals = 0;

    for (const handle of handles) {
      try {
        const signals = await this.fetchTweetsForAccount(handle, 5);
        
        for (const signal of signals) {
          if (signal.isValid) {
            // Notify handlers
            for (const handler of this.handlers) {
              try {
                handler(signal);
              } catch (error) {
                logger.error('Signal handler error', { 
                  error: error instanceof Error ? error.message : 'Unknown error'
                });
              }
            }
            totalSignals++;
          }
        }

        // Rate limit: 15 requests per 15 min per user
        // With 30 accounts, we need to space them out
        await this.delay(1000); // 1 second between accounts

      } catch (error) {
        logger.error('Failed to poll account', { 
          handle, 
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    logger.info('Poll complete', { 
      accountsPolled: handles.length,
      signalsFound: totalSignals 
    });
  }

  /**
   * Fetch tweets for a specific account
   */
  private async fetchTweetsForAccount(
    handle: string, 
    maxResults: number = 5
  ): Promise<ParsedSignal[]> {
    try {
      const user = await this.client.v2.userByUsername(handle);
      if (!user.data) {
        logger.warn('User not found', { handle });
        return [];
      }

      const tweets = await this.client.v2.userTimeline(user.data.id, {
        max_results: maxResults,
        'tweet.fields': ['created_at', 'entities', 'referenced_tweets'],
      });

      const signals: ParsedSignal[] = [];
      for (const tweet of tweets.data?.data || []) {
        // Deduplicate
        if (this.recentTweetIds.has(tweet.id)) {
          continue;
        }
        this.recentTweetIds.add(tweet.id);
        
        // Maintain set size
        if (this.recentTweetIds.size > this.MAX_RECENT_IDS) {
          const iterator = this.recentTweetIds.values();
          const firstValue = iterator.next().value;
          if (firstValue) {
            this.recentTweetIds.delete(firstValue);
          }
        }

        const signal = parseTweet(tweet, handle);
        if (signal.isValid) {
          logger.info('Valid signal detected from poll', {
            asset: signal.asset,
            direction: signal.direction,
            source: signal.sourceHandle,
            category: signal.category
          });
          signals.push(signal);
        }
      }

      return signals;
    } catch (error) {
      logger.error('Failed to fetch account tweets', { 
        handle, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Health check
   */
  isHealthy(): boolean {
    return this.isRunning && this.pollInterval !== null;
  }

  /**
   * Force immediate poll (for testing)
   */
  async forcePoll(): Promise<void> {
    await this.pollTweets();
  }
}

// Singleton instance
let streamClient: XStreamClient | null = null;

export function getStreamClient(): XStreamClient {
  if (!streamClient) {
    streamClient = new XStreamClient();
  }
  return streamClient;
}
