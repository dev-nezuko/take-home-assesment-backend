import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { LRUCache } from '../src/dal/cache.dal.js';
import { getOrFetchUser } from '../src/dal/requestDeduplicator.dal.js';
import { processingQueue } from '../src/dal/queue.dal.js';
import { cache } from '../src/dal/cache.dal.js';
const user = { id: 1, name: 'Synthetic', email: 'demo@example.com' };
test('LRU refreshes recency and expires at the exact TTL', () => {
 const original = Date.now; let now = 100; Date.now = () => now;
 const local = new LRUCache(2, 10);
 try {
  local.set('a', user); local.set('b', user); assert.equal(local.get('a')?.id, 1);
  local.set('c', user); assert.equal(local.get('b'), null); assert.equal(local.getStats().size, 2);
  now = 110; assert.equal(local.get('a'), null); assert.equal(local.get('c'), null);
  local.clear(); assert.deepEqual(local.getStats(), { hits: 0, misses: 0, size: 0, averageResponseTime: 0 });
 } finally { Date.now = original; local.destroy(); }
 assert.throws(() => new LRUCache(0));
});
test('same-user concurrent misses share one queue request and recover after rejection', async () => {
 cache.clear(); const original = processingQueue.enqueue.bind(processingQueue); let count = 0;
 processingQueue.enqueue = async id => { count++; return original(id); };
 try {
  const users = await Promise.all([getOrFetchUser(1), getOrFetchUser(1), getOrFetchUser(1)]);
  assert.equal(count, 1); assert.equal(users.length, 3);
  await getOrFetchUser(1); assert.equal(count, 1);
  await assert.rejects(getOrFetchUser(999999)); await assert.rejects(getOrFetchUser(999999)); assert.equal(count, 3);
 } finally { processingQueue.enqueue = original; cache.clear(); }
});
