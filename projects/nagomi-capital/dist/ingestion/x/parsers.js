/**
 * Signal Extractors
 * Parse tweets from X accounts into structured trading signals
 */
import { getAccountByHandle } from '../../config/accounts.js';
// Regex patterns for signal extraction
const PATTERNS = {
    // Tickers
    TICKER: /\$([A-Z]{1,5})|\b([A-Z]{2,5})\b/g,
    // Crypto symbols
    CRYPTO: /\b(BTC|ETH|SOL|XRP|ADA|DOT|AVAX|LINK|MATIC|UNI|AAVE|COMP|MKR|CRV|LDO|OP|ARB)\b/gi,
    // Price mentions
    PRICE: /\$([\d,]+\.?\d*)|\b(\d+\.?\d*)\s*(USD|USDT|USDC)\b/g,
    // Directional words
    BULLISH: /\b(long|bull|buy|calls|support|breakout|rally|moon|pump|accumulate|hodl)\b/gi,
    BEARISH: /\b(short|bear|sell|puts|resistance|breakdown|dump|crash|distribution)\b/gi,
    // Signal types
    WHALE: /\b(whale|large\s+transfer|moved|transferred)\b/gi,
    SWEEP: /\b(sweep|swept|aggressive\s+buy|aggressive\s+sell)\b/gi,
    FLOW: /\b(flow|unusual\s+volume|block\s+trade|dark\s+pool)\b/gi,
    ALERT: /\b(alert|breaking|urgent|⚠️|🚨)\b/gi,
};
/**
 * Parse a tweet into a structured trading signal
 */
export function parseTweet(tweet, sourceHandle) {
    const text = tweet.text || '';
    const handle = sourceHandle || 'unknown';
    const account = getAccountByHandle(handle);
    // Base signal structure
    const signal = {
        tweetId: tweet.id,
        sourceHandle: handle,
        category: account?.category || 'equity',
        weight: account?.weight || 5,
        rawText: text,
        timestamp: tweet.created_at ? new Date(tweet.created_at) : new Date(),
        isValid: false,
        asset: null,
        assetClass: null,
        direction: 'UNKNOWN',
        signalType: 'unknown',
        confidence: 0,
        mentions: [],
        hashtags: [],
        tickers: [],
        urls: [],
        isRetweet: false,
        isReply: false,
        hasMedia: false,
        engagementScore: 0,
    };
    // Skip retweets and replies for signal extraction
    if (tweet.referenced_tweets?.some(ref => ref.type === 'retweeted')) {
        signal.isRetweet = true;
        return signal;
    }
    if (tweet.referenced_tweets?.some(ref => ref.type === 'replied_to')) {
        signal.isReply = true;
    }
    // Extract tickers and mentions
    signal.tickers = extractTickers(text, account?.category);
    signal.mentions = extractMentions(text);
    signal.hashtags = extractHashtags(text);
    signal.urls = extractUrls(text);
    // Determine direction
    signal.direction = determineDirection(text);
    // Determine signal type
    signal.signalType = determineSignalType(text, account);
    // Determine asset class and primary asset
    const { asset, assetClass } = determineAsset(text, signal.tickers, account);
    signal.asset = asset;
    signal.assetClass = assetClass;
    // Calculate confidence
    signal.confidence = calculateConfidence(signal, account);
    // Validate signal
    signal.isValid = validateSignal(signal);
    return signal;
}
/**
 * Extract stock tickers and crypto symbols
 */
function extractTickers(text, category) {
    const tickers = [];
    const seen = new Set();
    // Standard tickers ($TSLA or just TSLA in caps)
    const tickerMatches = text.matchAll(PATTERNS.TICKER);
    for (const match of tickerMatches) {
        const ticker = (match[1] || match[2])?.toUpperCase();
        if (ticker && !seen.has(ticker)) {
            // Use comprehensive ticker validation
            if (isValidTicker(ticker)) {
                tickers.push(ticker);
                seen.add(ticker);
            }
        }
    }
    // Crypto symbols (these are explicitly whitelisted)
    if (category === 'crypto' || !category) {
        const cryptoMatches = text.matchAll(PATTERNS.CRYPTO);
        for (const match of cryptoMatches) {
            const crypto = match[0].toUpperCase();
            if (!seen.has(crypto)) {
                tickers.push(crypto);
                seen.add(crypto);
            }
        }
    }
    return tickers;
}
/**
 * Extract @mentions
 */
function extractMentions(text) {
    const mentions = text.match(/@(\w+)/g);
    return mentions?.map(m => m.slice(1)) || [];
}
/**
 * Extract #hashtags
 */
function extractHashtags(text) {
    const hashtags = text.match(/#(\w+)/g);
    return hashtags?.map(h => h.slice(1).toLowerCase()) || [];
}
/**
 * Extract URLs
 */
function extractUrls(text) {
    const urls = text.match(/https?:\/\/[^\s]+/g);
    return urls || [];
}
/**
 * Determine bullish/bearish direction from text
 */
function determineDirection(text) {
    const bullishMatches = text.match(PATTERNS.BULLISH)?.length || 0;
    const bearishMatches = text.match(PATTERNS.BEARISH)?.length || 0;
    if (bullishMatches > bearishMatches)
        return 'LONG';
    if (bearishMatches > bullishMatches)
        return 'SHORT';
    return 'NEUTRAL';
}
/**
 * Determine signal type based on content and account
 */
function determineSignalType(text, account) {
    // Whale alert
    if (PATTERNS.WHALE.test(text))
        return 'whale_alert';
    // Options sweep
    if (PATTERNS.SWEEP.test(text))
        return 'sweep';
    // Flow/volume
    if (PATTERNS.FLOW.test(text))
        return 'options_flow';
    // Check account tags for context
    if (account?.tags.includes('whale_tracking'))
        return 'whale_alert';
    if (account?.tags.includes('options_flow'))
        return 'options_flow';
    if (account?.tags.includes('price_action'))
        return 'price_action';
    if (account?.tags.includes('unusual_volume'))
        return 'unusual_volume';
    if (account?.tags.includes('on_chain'))
        return 'on_chain';
    // Technical patterns
    if (/breakout|breakdown|support|resistance/i.test(text)) {
        return 'technical_break';
    }
    // News
    if (/breaking|news|announced|earnings/i.test(text)) {
        return 'news_catalyst';
    }
    return 'unknown';
}
/**
 * Determine primary asset and asset class
 */
function determineAsset(_text, tickers, account) {
    let asset = null;
    let assetClass = account?.category || null;
    if (tickers.length > 0) {
        // Use first ticker as primary asset
        asset = tickers[0];
        // Infer asset class from ticker if not set
        if (!assetClass) {
            if (/^(BTC|ETH|SOL|XRP|ADA|DOT|AVAX|LINK|MATIC)$/i.test(asset)) {
                assetClass = 'crypto';
            }
            else {
                assetClass = 'equity';
            }
        }
    }
    return { asset, assetClass };
}
/**
 * Calculate confidence score (1-10)
 */
function calculateConfidence(signal, account) {
    let score = 0;
    // Base weight from account credibility
    score += (account?.weight || 5) * 0.5;
    // Direction clarity
    if (signal.direction !== 'UNKNOWN' && signal.direction !== 'NEUTRAL') {
        score += 2;
    }
    // Has specific asset
    if (signal.asset) {
        score += 1;
    }
    // Has tickers (more specific)
    if (signal.tickers.length > 0) {
        score += 1;
    }
    // Clear signal type
    if (signal.signalType !== 'unknown') {
        score += 1;
    }
    // Engagement indicates signal quality
    if (signal.engagementScore > 100) {
        score += 1;
    }
    return Math.min(Math.max(Math.round(score), 1), 10);
}
/**
 * Validate if signal is actionable
 */
function validateSignal(signal) {
    // Must have direction
    if (signal.direction === 'UNKNOWN')
        return false;
    // Must have asset
    if (!signal.asset)
        return false;
    // Minimum confidence threshold
    if (signal.confidence < 4)
        return false;
    // Skip retweets
    if (signal.isRetweet)
        return false;
    // Skip replies (usually conversation, not signals)
    if (signal.isReply && signal.confidence < 7)
        return false;
    return true;
}
/**
 * Check if a string is a common word (not a ticker)
 * Filters out country codes, common words, and invalid tickers
 */
function isCommonWord(str) {
    const common = new Set([
        // Single letters (except valid tickers like A, I are kept in regex)
        'A', 'I',
        // Common words
        'USD', 'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU',
        'ALL', 'ANY', 'CAN', 'HAD', 'HER', 'WAS', 'ONE', 'OUR', 'OUT', 'DAY',
        'GET', 'HAS', 'HIM', 'HIS', 'HOW', 'MAN', 'NEW', 'NOW', 'OLD', 'SEE',
        'TWO', 'WAY', 'WHO', 'BOY', 'DID', 'ITS', 'LET', 'PUT', 'SAY', 'SHE',
        'TOO', 'USE', 'DAD', 'MOM', 'CEO', 'CFO', 'COO', 'ETF', 'IPO', 'GDP',
        'CPI', 'FED', 'SEC', 'NYSE', 'NASDAQ',
        // Country codes that are often misidentified as tickers
        'US', 'USA', 'UK', 'EU', 'CA', 'AU', 'JP', 'CN', 'DE', 'FR', 'IT', 'ES',
        'NL', 'CH', 'SE', 'NO', 'DK', 'FI', 'BE', 'AT', 'IE', 'PT', 'GR', 'PL',
        'CZ', 'HU', 'RO', 'BG', 'HR', 'SI', 'SK', 'LT', 'LV', 'EE', 'LU', 'MT',
        'CY', 'IS', 'LI', 'MC', 'AD', 'SM', 'VA', 'TR', 'RU', 'BR', 'IN', 'MX',
        'ZA', 'SA', 'AE', 'IL', 'KR', 'TW', 'HK', 'SG', 'MY', 'TH', 'ID', 'PH',
        'VN', 'NZ', 'MX', 'AR', 'CL', 'CO', 'PE', 'VE', 'EC', 'UY', 'PY', 'BO',
        // Common trading/finance abbreviations that aren't tickers
        'ATH', 'ATL', 'DCA', 'ROI', 'APY', 'APR', 'TVL', 'MCAP', 'FDV',
        'ATH', 'LOL', 'FUD', 'FOMO', 'HODL', 'WAGMI', 'NGMI', 'DYOR',
        // Time-related
        'AM', 'PM', 'EST', 'PST', 'CST', 'MST', 'GMT', 'UTC',
        // Misc common words in trading context
        'IMO', 'IMHO', 'FYI', 'FAQ', 'Q&A', 'VS', 'V', 'PRO', 'CON',
        'BUY', 'SELL', 'HOLD', 'LONG', 'SHORT', 'CALL', 'PUT'
    ]);
    return common.has(str.toUpperCase());
}
/**
 * Validate if a string is a legitimate ticker symbol
 * Returns true if valid, false otherwise
 */
function isValidTicker(str) {
    // Must be 1-5 characters (standard ticker length)
    if (str.length < 1 || str.length > 5)
        return false;
    // Must be alphanumeric
    if (!/^[A-Z0-9]+$/.test(str.toUpperCase()))
        return false;
    // Must not be a common word/country code
    if (isCommonWord(str))
        return false;
    // Single letters are mostly valid (A, T, F, etc. are real tickers)
    // but filter out pure numbers
    if (/^\d+$/.test(str))
        return false;
    return true;
}
/**
 * Parse whale alert specific format
 */
export function parseWhaleAlert(text) {
    const result = {
        asset: null,
        amount: null,
        from: null,
        to: null,
        isExchangeInflow: false,
    };
    // Common whale alert patterns
    // "5,000 #BTC ($150M) transferred from Unknown wallet to Binance"
    // "10,000,000 #USDT moved from Tether Treasury to Kraken"
    const amountMatch = text.match(/([\d,]+(?:\.\d+)?)\s*#?(\w+)/);
    if (amountMatch) {
        result.amount = parseFloat(amountMatch[1].replace(/,/g, ''));
        result.asset = amountMatch[2].toUpperCase();
    }
    const exchangeMatch = text.match(/to\s+(\w+\s*(?:Exchange|Wallet)?)/i);
    if (exchangeMatch) {
        result.to = exchangeMatch[1];
        const exchanges = ['binance', 'coinbase', 'kraken', 'ftx', 'okx', 'bybit'];
        result.isExchangeInflow = exchanges.some(e => result.to?.toLowerCase().includes(e));
    }
    return result;
}
/**
 * Parse options flow format
 */
export function parseOptionsFlow(text) {
    const result = {
        ticker: null,
        callPut: null,
        strike: null,
        expiration: null,
        size: null,
        premium: null,
        sentiment: 'NEUTRAL',
    };
    // Pattern: "$TSLA 200C 01/19 $500K sweep"
    const flowMatch = text.match(/\$(\w+)\s+(\d+(?:\.\d+)?)\s*([CP])\s+(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i);
    if (flowMatch) {
        result.ticker = flowMatch[1].toUpperCase();
        result.strike = parseFloat(flowMatch[2]);
        result.callPut = flowMatch[3].toUpperCase() === 'C' ? 'CALL' : 'PUT';
        result.expiration = flowMatch[4];
        result.sentiment = result.callPut === 'CALL' ? 'BULLISH' : 'BEARISH';
    }
    // Extract size/premium
    const sizeMatch = text.match(/(\d+(?:\.\d+)?)[Kk]\s*(?:sweep|block)/i);
    if (sizeMatch) {
        result.size = parseFloat(sizeMatch[1]) * 1000;
    }
    const premiumMatch = text.match(/\$?([\d,]+(?:\.\d+)?)[KkMm]?/);
    if (premiumMatch) {
        let premium = parseFloat(premiumMatch[1].replace(/,/g, ''));
        if (text.includes('K') || text.includes('k'))
            premium *= 1000;
        if (text.includes('M') || text.includes('m'))
            premium *= 1000000;
        result.premium = premium;
    }
    return result;
}
//# sourceMappingURL=parsers.js.map