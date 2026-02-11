import { mock, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { ProcessingQueue } from '../src/dal/queue.dal.js';
import { MAX_USERS, addUser, mockUsers } from '../src/data/mockUsers.js';
import { CapacityError, UserNotFoundError } from '../src/errors.js';
import { createApp } from '../src/app.js';
import { allowAll, withServer } from './helpers.js';

test('the lookup queue refuses work beyond its bound and still drains what it accepted', async () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const queue = new ProcessingQueue(2, 200);
    const accepted = [queue.enqueue(1), queue.enqueue(2), queue.enqueue(424242)];
    assert.equal(queue.getQueueLength(), 2);
    await assert.rejects(queue.enqueue(3), (err: unknown) => err instanceof CapacityError && err.retryAfterSeconds === 1);
    assert.equal(queue.getQueueLength(), 2);

    const settled = Promise.allSettled(accepted);
    for (let i = 0; i < 3; i++) {
      await new Promise(setImmediate);
      mock.timers.tick(200);
    }
    const [one, two, missing] = await settled;
    assert.equal(one.status === 'fulfilled' && one.value.id, 1);
    assert.equal(two.status === 'fulfilled' && two.value.id, 2);
    assert.ok(missing.status === 'rejected' && missing.reason instanceof UserNotFoundError);
    assert.equal(queue.getQueueLength(), 0);
  } finally {
    mock.timers.reset();
  }
});

test('created users get sequential IDs and the store stops at MAX_USERS with a 503', async () => {
  const first = addUser('Seq One', 'one@example.com');
  const second = addUser('Seq Two', 'two@example.com');
  assert.equal(second.id, first.id + 1);

  while (Object.keys(mockUsers).length < MAX_USERS) addUser('Filler', 'filler@example.com');
  assert.throws(() => addUser('Overflow', 'overflow@example.com'), CapacityError);
  assert.equal(Object.keys(mockUsers).length, MAX_USERS);

  await withServer(createApp({ limiter: allowAll }), async (base) => {
    const res = await fetch(base + '/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Late', email: 'late@example.com' }),
    });
    assert.equal(res.status, 503);
    assert.equal(res.headers.get('retry-after'), '60');
  });
});
