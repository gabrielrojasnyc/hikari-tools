# Twitter Signal Intelligence System

A comprehensive signal intelligence system that extracts high-value trading signals from Twitter using concept mapping, sentiment analysis, and historical accuracy tracking.

## Overview

This system processes Twitter data to generate actionable trading signals by:
- Extracting investment concepts from tweets (beyond simple ticker mentions)
- Mapping concepts to ticker baskets
- Tracking prediction accuracy per account
- Weighting signals based on historical performance
- Sending real-time alerts for high-priority events

## Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Twitter   │───▶│   Signals   │───▶│   Database  │
│    Feed     │    │   Table     │    │   (SQLite)  │
└─────────────┘    └─────────────┘    └─────────────┘
                                              │
        ┌─────────────────────────────────────┼─────────────────────────────────────┐
        ▼                                     ▼                                     ▼
┌─────────────┐                    ┌─────────────┐                        ┌─────────────┐
│   Concept   │                    │   Accuracy  │                        │   Weighted  │
│  Extractor  │                    │   Tracker   │                        │   Signals   │
└─────────────┘                    └─────────────┘                        └─────────────┘
        │                                     │                                     │
        └─────────────────────────────────────┴─────────────────────────────────────┘
                                                  │
                                                  ▼
                                         ┌─────────────┐
                                         │    Mika's   │
                                         │    Brief    │
                                         └─────────────┘
```

## Components

### 1. Concept Extractor (`src/signals/concept-extractor.js`)

**Purpose**: Scans raw tweets for high-level investment concepts defined in `concept-map.json`.

**Logic**:
- Matches keywords from concept map
- Calculates sentiment confidence (0.0-1.0)
- Stores signals in `twitter_concept_signals` table
- Supports manual signal insertion for testing

**Key Functions**:
- `extractConcepts(text)` - Extract concepts from a tweet
- `processTweets(dbPath)` - Process unprocessed tweets
- `insertConceptSignal(signal, dbPath)` - Manual signal insertion

**Usage**:
```javascript
import { extractConcepts } from './src/signals/concept-extractor.js';

const concepts = await extractConcepts("NVDA crushing it with AI infrastructure!");
// Returns: [{ concept: 'AI infrastructure', tickers: ['NVDA', ...], confidence: 0.85 }]
```

### 2. Accuracy Tracker (`src/signals/track-accuracy.js`)

**Purpose**: Tracks the performance of signals and calculates account weights.

**Logic**:
- Records predictions with price at prediction time
- Updates accuracy at 1h, 4h, and 1d intervals
- Calculates weight multipliers (0.5x - 2.0x) based on accuracy
- Updates `twitter_account_weights` table

**Key Functions**:
- `recordPrediction(prediction, dbPath)` - Log a new prediction
- `updateAccuracy(dbPath)` - Update all pending predictions
- `getAccountAccuracy(handle, dbPath)` - Get stats for specific account

**Usage**:
```javascript
import { recordPrediction, updateAccuracy } from './src/signals/track-accuracy.js';

await recordPrediction({
  handle: '@trader1',
  ticker: 'NVDA',
  prediction_type: 'bullish',
  confidence: 0.8,
  price_at_prediction: 850.00
});

await updateAccuracy();
```

### 3. Weighted Signals (`src/signals/weighted-signals.js`)

**Purpose**: Aggregates signals and applies account accuracy weights.

**Logic**:
- Joins concept signals with account weights
- Calculates weighted scores per ticker
- Separates bullish/bearish sentiment
- Sorts by signal strength

**Key Functions**:
- `getWeightedSignals(hours, dbPath)` - Get all weighted signals
- `getTickerSentiment(ticker, hours, dbPath)` - Get sentiment for specific ticker
- `getTopSignals(limit, hours, dbPath)` - Get top bullish/bearish signals

**Usage**:
```javascript
import { getWeightedSignals, getTopSignals } from './src/signals/weighted-signals.js';

const signals = await getWeightedSignals(24);
// Returns: [{ ticker: 'NVDA', score: 2.45, mentions: 3, concepts: [...], sources: [...] }]

const { bullish, bearish } = await getTopSignals(5, 24);
```

### 4. Real-Time Alerts (`src/signals/twitter-alerts.js`)

**Purpose**: Monitors tweets for immediate high-priority triggers.

**Triggers**:
- Product announcements
- Earnings beats/misses
- Guidance cuts/raises
- AI launches
- Acquisition news
- SEC investigations

**Key Functions**:
- `checkAlerts(minutes, dbPath)` - Check for recent triggers
- `sendImmediateAlert(alertData)` - Send urgent alert
- `testTelegramConnection()` - Test Telegram bot

**Usage**:
```javascript
import { checkAlerts, sendImmediateAlert } from './src/signals/twitter-alerts.js';

// Check every 15 minutes
const alerts = await checkAlerts(15);

// Send urgent alert
await sendImmediateAlert({
  type: 'EARNINGS BEAT',
  ticker: 'NVDA',
  message: 'Q4 earnings beat by $0.50',
  source: '@breakingnews',
  priority: 'critical'
});
```

### 5. Enhanced Mika Brief (`scripts/mika-morning-brief-enhanced.js`)

**Purpose**: Generates comprehensive morning trading brief with Twitter intelligence.

**Sections**:
- Weighted sentiment by ticker (with visual bar charts)
- Top bullish/bearish signals
- Most mentioned tickers
- Top performing accounts by accuracy
- Technical context (mock data)
- Trade ideas (combined technical + Twitter)

**Usage**:
```bash
node scripts/mika-morning-brief-enhanced.js
```

## Concept Map (`src/signals/concept-map.json`)

Defines investment concepts and their mappings:

```json
{
  "AI infrastructure": {
    "tickers": ["NVDA", "AMD", "TSM", "AVGO", "MRVL"],
    "keywords": ["training", "compute", "GPU", "datacenter"],
    "sentiment": "bullish"
  },
  "hyperscaler capex": {
    "tickers": ["MSFT", "GOOGL", "AMZN", "META"],
    "keywords": ["capex", "spending", "investment", "cloud"],
    "sentiment": "bullish"
  },
  "SaaS implosion": {
    "tickers": ["CRM", "ZM", "DOCU", "NOW"],
    "keywords": ["implosion", "layoffs", "slowdown"],
    "sentiment": "bearish"
  }
}
```

## Database Schema

### `twitter_concept_signals`
Stores extracted concept signals from tweets.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| date | DATE | Signal date |
| concept | TEXT | Concept name |
| tickers | TEXT | JSON array of tickers |
| confidence | REAL | 0.0-1.0 confidence score |
| source_handle | TEXT | Twitter handle |
| source_tweet_id | TEXT | Tweet ID |
| extracted_at | TIMESTAMP | Extraction time |

### `twitter_prediction_accuracy`
Tracks prediction performance over time.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| handle | TEXT | Twitter handle |
| ticker | TEXT | Stock ticker |
| prediction_date | DATE | When predicted |
| prediction_type | TEXT | bullish/bearish/volatility |
| confidence | REAL | Prediction confidence |
| price_at_prediction | REAL | Price when predicted |
| price_1h/4h/1d | REAL | Price at each interval |
| accuracy_1h/4h/1d | BOOLEAN | Whether prediction was correct |

### `twitter_account_weights`
Stores performance weights for each account.

| Column | Type | Description |
|--------|------|-------------|
| handle | TEXT | Primary key |
| accuracy_1d | REAL | 1-day accuracy average |
| accuracy_4h | REAL | 4-hour accuracy average |
| weight_multiplier | REAL | 0.5-2.0x weight |
| last_updated | TIMESTAMP | Last update time |

## Configuration

Create a `.env` file in the project root:

```env
# Database
DB_PATH=data/nagomi.db

# Telegram (for alerts)
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

## Testing

Run the comprehensive test suite:

```bash
node tests/twitter-signals.test.js
```

Tests cover:
- Concept extraction with various inputs
- Database insertion and retrieval
- Weighted signal aggregation
- Accuracy tracking and weights
- Alert triggering
- Concept map validation

## Cron Setup

Add to crontab for automated operation:

```bash
# Every 15 minutes - check for new tweets and extract concepts
*/15 * * * * cd /path/to/workspace && node src/signals/concept-extractor.js >> logs/concepts.log 2>&1

# Every hour - update accuracy scores
0 * * * * cd /path/to/workspace && node -e "import('./src/signals/track-accuracy.js').then(m => m.updateAccuracy())" >> logs/accuracy.log 2>&1

# Every 15 minutes - check for urgent alerts
*/15 * * * * cd /path/to/workspace && node -e "import('./src/signals/twitter-alerts.js').then(m => m.checkAlerts())" >> logs/alerts.log 2>&1

# Daily at 8am - generate morning brief
0 8 * * * cd /path/to/workspace && node scripts/mika-morning-brief-enhanced.js >> logs/brief.log 2>&1
```

## File Structure

```
workspace/
├── src/signals/
│   ├── concept-extractor.js      # Concept extraction logic
│   ├── concept-map.json          # Concept definitions
│   ├── track-accuracy.js         # Accuracy tracking
│   ├── weighted-signals.js       # Signal aggregation
│   └── twitter-alerts.js         # Real-time alerts
├── scripts/
│   └── mika-morning-brief-enhanced.js  # Daily brief generator
├── tests/
│   └── twitter-signals.test.js   # Comprehensive test suite
├── data/
│   ├── trading_schema.sql        # Database schema
│   └── nagomi.db                 # SQLite database
└── README.md                     # This file
```

## Integration

### Using in Other Scripts

```javascript
// Import all modules
import { extractConcepts, processTweets } from './src/signals/concept-extractor.js';
import { recordPrediction, updateAccuracy } from './src/signals/track-accuracy.js';
import { getWeightedSignals, getTopSignals } from './src/signals/weighted-signals.js';
import { checkAlerts, sendImmediateAlert } from './src/signals/twitter-alerts.js';

// Process new tweets
await processTweets();

// Get weighted signals
const signals = await getWeightedSignals(24);

// Record a prediction
await recordPrediction({ handle: '@trader', ticker: 'NVDA', prediction_type: 'bullish', confidence: 0.8, price_at_prediction: 850 });

// Check for alerts
const alerts = await checkAlerts(15);
```

## Verification Checklist

- [x] All 5 JavaScript files created and working
- [x] Database schema updated and applied
- [x] Concept map JSON created
- [x] All modules export correctly
- [x] Database inserts work without errors
- [x] Can query sentiment for any ticker
- [x] Can generate weighted signals
- [x] Telegram alerts can be sent (mock mode)
- [x] Mika's enhanced brief generates successfully
- [x] All tests pass
