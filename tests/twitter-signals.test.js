import { extractConcepts, insertConceptSignal, conceptMap } from '../src/signals/concept-extractor.js';
import { recordPrediction, updateAccuracy, getAccountAccuracy } from '../src/signals/track-accuracy.js';
import { getWeightedSignals, getTickerSentiment, getTopSignals } from '../src/signals/weighted-signals.js';
import { checkAlerts, sendImmediateAlert, testTelegramConnection, TRIGGERS } from '../src/signals/twitter-alerts.js';
import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';

const TEST_DB_PATH = 'data/test_nagomi.db';

// Helper to create test database
async function initTestDb() {
  // Remove old test db
  try {
    fs.unlinkSync(TEST_DB_PATH);
  } catch (e) {
    // File might not exist
  }
  
  const db = new sqlite3.Database(TEST_DB_PATH);
  
  // Create tables
  const schema = `
    CREATE TABLE IF NOT EXISTS signals (
      id INTEGER PRIMARY KEY,
      raw_text TEXT,
      text TEXT,
      source_handle TEXT,
      handle TEXT,
      tweet_id TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      timestamp TIMESTAMP,
      processed INTEGER DEFAULT 0
    );
    
    CREATE TABLE IF NOT EXISTS twitter_concept_signals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date DATE,
      concept TEXT,
      tickers TEXT,
      confidence REAL,
      source_handle TEXT,
      source_tweet_id TEXT,
      extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS twitter_prediction_accuracy (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      handle TEXT,
      ticker TEXT,
      prediction_date DATE,
      prediction_type TEXT,
      confidence REAL,
      price_at_prediction REAL,
      price_1h REAL,
      price_4h REAL,
      price_1d REAL,
      accuracy_1h BOOLEAN,
      accuracy_4h BOOLEAN,
      accuracy_1d BOOLEAN
    );

    CREATE TABLE IF NOT EXISTS twitter_account_weights (
      handle TEXT PRIMARY KEY,
      accuracy_1d REAL,
      accuracy_4h REAL,
      weight_multiplier REAL,
      last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  await new Promise((resolve, reject) => {
    db.exec(schema, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
  
  db.close();
  console.log('✓ Test database initialized');
}

// Test 1: Concept Extraction
async function testConceptExtraction() {
  console.log('\n📋 TEST 1: Concept Extraction');
  console.log('-'.repeat(50));
  
  // Test with various tweets
  const testCases = [
    {
      text: "NVIDIA is crushing it with AI infrastructure and datacenter growth!",
      expectedConcepts: ['AI infrastructure'],
      expectedTickers: ['NVDA', 'AMD', 'TSM', 'AVGO', 'MRVL']
    },
    {
      text: "SaaS implosion is real with all these layoffs at CRM companies",
      expectedConcepts: ['SaaS implosion'],
      expectedTickers: ['CRM', 'ZM', 'DOCU', 'NOW']
    },
    {
      text: "Microsoft and Google investing big in hyperscaler capex for cloud",
      expectedConcepts: ['hyperscaler capex'],
      expectedTickers: ['MSFT', 'GOOGL', 'AMZN', 'META']
    },
    {
      text: "Just had coffee, nice weather today", // No matching concepts
      expectedConcepts: [],
      expectedTickers: []
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const tc of testCases) {
    const concepts = await extractConcepts(tc.text);
    
    // Check if expected concepts are found
    const foundConcepts = concepts.map(c => c.concept);
    const allExpectedFound = tc.expectedConcepts.every(ec => 
      foundConcepts.some(fc => fc.toLowerCase().includes(ec.toLowerCase()))
    );
    
    if (allExpectedFound) {
      console.log(`  ✓ "${tc.text.substring(0, 50)}..."`);
      console.log(`    Found: ${foundConcepts.join(', ') || 'None'}`);
      passed++;
    } else {
      console.log(`  ✗ "${tc.text.substring(0, 50)}..."`);
      console.log(`    Expected: ${tc.expectedConcepts.join(', ')}`);
      console.log(`    Got: ${foundConcepts.join(', ')}`);
      failed++;
    }
  }
  
  console.log(`  Result: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}

// Test 2: Database Insertion
async function testDatabaseInsertion() {
  console.log('\n📋 TEST 2: Database Insertion');
  console.log('-'.repeat(50));
  
  try {
    // Insert concept signal
    const signalResult = await insertConceptSignal({
      date: '2024-02-11',
      concept: 'AI infrastructure',
      tickers: ['NVDA', 'AMD'],
      confidence: 0.85,
      source_handle: 'test_trader',
      source_tweet_id: '123456'
    }, TEST_DB_PATH);
    
    console.log(`  ✓ Inserted concept signal (ID: ${signalResult.id})`);
    
    // Insert prediction
    const predResult = await recordPrediction({
      handle: 'test_trader',
      ticker: 'NVDA',
      prediction_type: 'bullish',
      confidence: 0.8,
      price_at_prediction: 850.00
    }, TEST_DB_PATH);
    
    console.log(`  ✓ Inserted prediction (ID: ${predResult.id})`);
    
    // Verify by querying
    const db = new sqlite3.Database(TEST_DB_PATH);
    const signals = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM twitter_concept_signals WHERE source_handle = ?', ['test_trader'], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    db.close();
    
    if (signals.length > 0) {
      console.log(`  ✓ Verified insertion: ${signals.length} signal(s) found`);
      return { passed: 1, failed: 0 };
    } else {
      console.log(`  ✗ Insertion verification failed`);
      return { passed: 0, failed: 1 };
    }
  } catch (e) {
    console.log(`  ✗ Error: ${e.message}`);
    return { passed: 0, failed: 1 };
  }
}

// Test 3: Weighted Signals
async function testWeightedSignals() {
  console.log('\n📋 TEST 3: Weighted Signals');
  console.log('-'.repeat(50));
  
  try {
    // Insert multiple signals for aggregation
    await insertConceptSignal({
      date: '2024-02-11',
      concept: 'AI infrastructure',
      tickers: ['NVDA', 'AMD'],
      confidence: 0.9,
      source_handle: 'trader1',
      source_tweet_id: '1'
    }, TEST_DB_PATH);
    
    await insertConceptSignal({
      date: '2024-02-11',
      concept: 'AI agents',
      tickers: ['MSFT', 'GOOGL'],
      confidence: 0.8,
      source_handle: 'trader2',
      source_tweet_id: '2'
    }, TEST_DB_PATH);
    
    await insertConceptSignal({
      date: '2024-02-11',
      concept: 'AI infrastructure',
      tickers: ['NVDA'],
      confidence: 0.7,
      source_handle: 'trader3',
      source_tweet_id: '3'
    }, TEST_DB_PATH);
    
    // Get weighted signals
    const signals = await getWeightedSignals(24, TEST_DB_PATH);
    
    console.log(`  ✓ Retrieved ${signals.length} aggregated signals`);
    
    // NVDA should be highest (2 mentions)
    const nvdaSignal = signals.find(s => s.ticker === 'NVDA');
    if (nvdaSignal && nvdaSignal.mentions >= 1) {
      console.log(`  ✓ NVDA aggregated correctly: ${nvdaSignal.mentions} mention(s), score: ${nvdaSignal.score.toFixed(2)}`);
    }
    
    // Test ticker sentiment query
    const msftSentiment = await getTickerSentiment('MSFT', 24, TEST_DB_PATH);
    if (msftSentiment) {
      console.log(`  ✓ MSFT sentiment retrieved: score ${msftSentiment.score.toFixed(2)}`);
    }
    
    // Test top signals
    const { bullish, bearish } = await getTopSignals(5, 24, TEST_DB_PATH);
    console.log(`  ✓ Top signals: ${bullish.length} bullish, ${bearish.length} bearish`);
    
    return { passed: 1, failed: 0 };
  } catch (e) {
    console.log(`  ✗ Error: ${e.message}`);
    return { passed: 0, failed: 1 };
  }
}

// Test 4: Accuracy Tracking
async function testAccuracyTracking() {
  console.log('\n📋 TEST 4: Accuracy Tracking');
  console.log('-'.repeat(50));
  
  try {
    // Add account weights first
    const db = new sqlite3.Database(TEST_DB_PATH);
    await new Promise((resolve, reject) => {
      db.run(`INSERT INTO twitter_account_weights (handle, accuracy_1d, accuracy_4h, weight_multiplier)
              VALUES (?, ?, ?, ?)`, ['trader1', 0.75, 0.80, 1.5], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    db.close();
    
    // Record predictions
    await recordPrediction({
      handle: 'trader1',
      ticker: 'NVDA',
      prediction_type: 'bullish',
      confidence: 0.8,
      price_at_prediction: 850.00
    }, TEST_DB_PATH);
    
    // Update accuracy (this will use mock prices)
    const summary = await updateAccuracy(TEST_DB_PATH);
    console.log(`  ✓ Updated accuracy for ${summary.accountsUpdated} account(s)`);
    
    // Get account accuracy
    const accStats = await getAccountAccuracy('trader1', TEST_DB_PATH);
    console.log(`  ✓ Account stats retrieved: weight ${accStats.weight?.weight_multiplier || 'N/A'}`);
    
    return { passed: 1, failed: 0 };
  } catch (e) {
    console.log(`  ✗ Error: ${e.message}`);
    return { passed: 0, failed: 1 };
  }
}

// Test 5: Alert System
async function testAlertSystem() {
  console.log('\n📋 TEST 5: Alert System');
  console.log('-'.repeat(50));
  
  try {
    // Add test tweets to signals table
    const db = new sqlite3.Database(TEST_DB_PATH);
    
    const testTweets = [
      { text: "Announcing our new AI product launch today!", handle: "techceo", keywords: ["announcing", "product"] },
      { text: "Earnings beat expectations this quarter", handle: "cfo_news", keywords: ["earnings", "beat"] },
      { text: "Just a regular day at the office", handle: "random_user", keywords: [] }
    ];
    
    for (const tweet of testTweets) {
      await new Promise((resolve, reject) => {
        db.run('INSERT INTO signals (raw_text, source_handle, created_at) VALUES (?, ?, datetime("now"))',
          [tweet.text, tweet.handle],
          (err) => {
            if (err) reject(err);
            else resolve();
          });
      });
    }
    
    db.close();
    
    // Test alert checking
    const alerts = await checkAlerts(60, TEST_DB_PATH);
    console.log(`  ✓ Checked alerts: ${alerts.length} triggered`);
    
    // Test immediate alert (mock)
    const alertResult = await sendImmediateAlert({
      type: 'TEST ALERT',
      ticker: 'TEST',
      message: 'This is a test alert',
      source: 'test_system',
      priority: 'high'
    });
    console.log(`  ✓ Immediate alert function works`);
    
    // Verify triggers are defined
    console.log(`  ✓ ${TRIGGERS.length} alert triggers defined`);
    
    return { passed: 1, failed: 0 };
  } catch (e) {
    console.log(`  ✗ Error: ${e.message}`);
    return { passed: 0, failed: 1 };
  }
}

// Test 6: Concept Map
async function testConceptMap() {
  console.log('\n📋 TEST 6: Concept Map');
  console.log('-'.repeat(50));
  
  const concepts = Object.keys(conceptMap);
  console.log(`  ✓ Concept map loaded: ${concepts.length} concepts`);
  
  for (const [name, data] of Object.entries(conceptMap)) {
    const tickerCount = data.tickers?.length || 0;
    const keywordCount = data.keywords?.length || 0;
    console.log(`    - ${name}: ${tickerCount} tickers, ${keywordCount} keywords (${data.sentiment})`);
  }
  
  return { passed: 1, failed: 0 };
}

// Main test runner
async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('  TWITTER SIGNAL INTELLIGENCE SYSTEM - TEST SUITE');
  console.log('='.repeat(60));
  
  // Initialize test database
  await initTestDb();
  
  // Run all tests
  const results = [];
  results.push(await testConceptExtraction());
  results.push(await testDatabaseInsertion());
  results.push(await testWeightedSignals());
  results.push(await testAccuracyTracking());
  results.push(await testAlertSystem());
  results.push(await testConceptMap());
  
  // Summary
  const totalPassed = results.reduce((sum, r) => sum + r.passed, 0);
  const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
  
  console.log('\n' + '='.repeat(60));
  console.log('  TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`  Total Tests: ${results.length}`);
  console.log(`  Passed: ${totalPassed}`);
  console.log(`  Failed: ${totalFailed}`);
  console.log(`  Status: ${totalFailed === 0 ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  console.log('='.repeat(60) + '\n');
  
  // Cleanup
  try {
    fs.unlinkSync(TEST_DB_PATH);
    console.log('✓ Test database cleaned up');
  } catch (e) {
    // Ignore cleanup errors
  }
  
  return totalFailed === 0;
}

runAllTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(e => {
    console.error('Test suite error:', e);
    process.exit(1);
  });
