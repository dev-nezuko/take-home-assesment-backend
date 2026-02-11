import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createApp, parseTrustProxy } from '../src/app.js';
import { createRateLimiter } from '../src/middleware/rateLimiter.js';
import { withServer } from './helpers.js';

const hit = (base: string, forwardedFor: string) =>
  fetch(base + '/cache/status', {
    headers: { 'X-Forwarded-For': forwardedFor },
  }).then((r) => r.status);

test('without TRUST_PROXY a rotating X-Forwarded-For still lands in one bucket', async () => {
  await withServer(
    createApp({ limiter: createRateLimiter(() => 0) }),
    async (base) => {
      for (let i = 0; i < 5; i++)
        assert.equal(await hit(base, `203.0.113.${i}`), 200);
      assert.equal(await hit(base, '203.0.113.99'), 429);
    }
  );
});

test('with TRUST_PROXY=1 the client address from the proxy selects the bucket', async () => {
  await withServer(
    createApp({ limiter: createRateLimiter(() => 0), trustProxy: 1 }),
    async (base) => {
      for (let i = 0; i < 5; i++)
        assert.equal(await hit(base, '198.51.100.7'), 200);
      assert.equal(await hit(base, '198.51.100.7'), 429);
      assert.equal(await hit(base, '198.51.100.8'), 200);
    }
  );
});

test('TRUST_PROXY parsing', () => {
  assert.equal(parseTrustProxy(undefined), false);
  assert.equal(parseTrustProxy('false'), false);
  assert.equal(parseTrustProxy('2'), 2);
  assert.equal(parseTrustProxy('loopback'), 'loopback');
});
