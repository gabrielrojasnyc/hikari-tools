-- Concept signals extracted from tweets
CREATE TABLE IF NOT EXISTS twitter_concept_signals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date DATE,
  concept TEXT,
  tickers TEXT, -- JSON array
  confidence REAL,
  source_handle TEXT,
  source_tweet_id TEXT,
  extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Track prediction accuracy
CREATE TABLE IF NOT EXISTS twitter_prediction_accuracy (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  handle TEXT,
  ticker TEXT,
  prediction_date DATE,
  prediction_type TEXT, -- 'bullish', 'bearish', 'volatility'
  confidence REAL,
  price_at_prediction REAL,
  price_1h REAL,
  price_4h REAL,
  price_1d REAL,
  accuracy_1h BOOLEAN,
  accuracy_4h BOOLEAN,
  accuracy_1d BOOLEAN
);

-- Account weights (updated daily)
CREATE TABLE IF NOT EXISTS twitter_account_weights (
  handle TEXT PRIMARY KEY,
  accuracy_1d REAL,
  accuracy_4h REAL,
  weight_multiplier REAL, -- 0.5 to 2.0
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
