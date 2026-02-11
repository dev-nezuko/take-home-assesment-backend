import { mock, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { LRUCache, cache } from '../src/dal/cache.dal.js';
import { getOrFetchUser } from '../src/dal/requestDeduplicator.dal.js';

const user = { id: 1, name: 'Synthetic', email: 'demo@example.com' };

async function advance(ms: number) {
  await new Promise(setImmediate);
  mock.timers.tick(ms);
  await new Promise(setImmediate);
}

test('an entry is still a hit one millisecond before its TTL and gone at the TTL', () => {
  mock.timers.enable({ apis: ['Date', 'setInterval'], now: 1_000 });
  const local = new LRUCache(3, 500);
  try {
    local.set('a', user);
    mock.timers.tick(499);
    assert.equal(local.get('a')?.id, 1);
    mock.timers.tick(1);
    assert.equal(local.get('a'), null);
    assert.equal(local.getStats().size, 0);
  } finally {
    local.destroy();
    mock.timers.reset();
  }
});

test('get() promotes an entry so the least recently read one is evicted', () => {
  const local = new LRUCache(3, 60_000);
  try {
    for (const key of ['a', 'b', 'c']) local.set(key, user);
    local.get('a');
    local.get('b');
    local.set('d', user);
    assert.equal(local.get('c'), null);
    assert.ok(local.get('a') && local.get('b') && local.get('d'));
  } finally {
    local.destroy();
  }
});

test('a lookup that finishes after DELETE /cache does not repopulate the cleared cache', async () => {
  mock.timers.enable({ apis: ['Date', 'setTimeout'] });
  try {
    cache.clear();
    const inFlight = getOrFetchUser(1);
    await advance(100);
    cache.clear();
    await advance(100);
    assert.equal((await inFlight).user.id, 1);
    assert.equal(cache.getStats().size, 0);

    const fresh = getOrFetchUser(1);
    await advance(200);
    await fresh;
    assert.equal(cache.getStats().size, 1);
  } finally {
    mock.timers.reset();
    cache.clear();
  }
});
