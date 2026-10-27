import test from 'node:test';
import assert from 'node:assert/strict';
import sqlite3 from 'sqlite3';

// Exercise the callback contracts used by src/signals without opening application
// databases, importing live integrations, or making network requests.
test('sqlite3 preserves callback queries, bindings, run context and rollback', async () => {
  const db = new sqlite3.Database(':memory:');
  const run = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (error) {
      if (error) reject(error);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
  const all = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => error ? reject(error) : resolve(rows));
  });
  try {
    await run('CREATE TABLE signals (id INTEGER PRIMARY KEY, concept TEXT, confidence REAL)');
    assert.deepEqual(await run('INSERT INTO signals (concept, confidence) VALUES (?, ?)', ["quote's ?", 0.75]), { lastID: 1, changes: 1 });
    assert.deepEqual(await all('SELECT * FROM signals WHERE confidence > ?', [0.5]), [{ id: 1, concept: "quote's ?", confidence: 0.75 }]);
    assert.equal((await run('UPDATE signals SET confidence = ? WHERE id = ?', [0.9, 1])).changes, 1);
    await run('BEGIN');
    await run('DELETE FROM signals');
    await run('ROLLBACK');
    assert.equal((await all('SELECT * FROM signals')).length, 1);
    await assert.rejects(all('SELECT * FROM missing_table'), /SQLITE_ERROR/);
  } finally {
    await new Promise((resolve, reject) => db.close(error => error ? reject(error) : resolve()));
  }
});
