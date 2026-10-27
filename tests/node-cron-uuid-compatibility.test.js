import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

// Retain node-cron3 scheduling semantics. Only its used UUID v4 API is upgraded;
// every fixture task is created stopped and no scheduler is ever activated.
for (const packageRoot of ['.', 'tools/mcp-servers', 'projects/nagomi-capital']) {
  test(`${packageRoot}: UUID11 preserves stopped node-cron3 task contracts`, () => {
    const require = createRequire(resolve(packageRoot, 'package.json'));
    const cron = require('node-cron');
    const cronRequire = createRequire(require.resolve('node-cron'));
    const uuid = cronRequire('uuid');
    assert.equal(cronRequire('uuid/package.json').version, '11.1.1');
    assert.equal(require('node-cron/package.json').version, '3.0.3');
    for (const expression of ['0 6 * * *', '30 16 * * 1-5', '*/5 * * * 1-5', '0 9 * * 1-5', '0 */6 * * *']) assert.equal(cron.validate(expression), true);
    const identifiers = new Set();
    const tasks = [];
    let executions = 0;
    try {
      for (let i = 0; i < 20; i++) {
        const task = cron.schedule('0 6 * * *', () => { executions++; }, { scheduled: false });
        tasks.push(task);
        assert.equal(uuid.validate(task.options.name), true);
        assert.equal(uuid.version(task.options.name), 4);
        identifiers.add(task.options.name);
        assert.equal(cron.getTasks().get(task.options.name), task);
      }
      assert.equal(identifiers.size, tasks.length);
      assert.equal(executions, 0);
      const named = cron.schedule('0 6 * * *', () => { executions++; }, { scheduled: false, name: 'compatibility-fixture' });
      tasks.push(named);
      assert.equal(named.options.name, 'compatibility-fixture');
      assert.equal(executions, 0);
    } finally {
      for (const task of tasks) {
        task.stop();
        cron.getTasks().delete(task.options.name);
      }
    }
  });
}
