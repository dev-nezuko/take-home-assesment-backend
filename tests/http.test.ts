import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import type { AddressInfo } from 'node:net';
import { app, createApp } from '../src/app.js';
import { createRateLimiter } from '../src/middleware/rateLimiter.js';
import { cache } from '../src/dal/cache.dal.js';
import { withServer } from './helpers.js';
test('HTTP validates inputs and exposes real cache hits against synthetic users', async()=>{
 const server=app.listen(0,'127.0.0.1'); await new Promise<void>(resolve=>server.once('listening',resolve));
 const base=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
 try {
  assert.equal((await fetch(base+'/users/1abc')).status,400);
  assert.equal((await fetch(base+'/users',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:{},email:[]})})).status,400);
  assert.equal((await fetch(base+'/users/1')).status,200);
  assert.equal((await fetch(base+'/users/1')).status,200);
  const stats=await (await fetch(base+'/cache/status')).json();assert.equal(stats.hits,1);assert.equal(stats.misses,1);
 } finally {server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});

test('GET /users/:id reports X-Cache and every limited response carries RateLimit headers', async () => {
  cache.clear();
  await withServer(createApp({ limiter: createRateLimiter(() => 0) }), async (base) => {
    const first = await fetch(base + '/users/2');
    assert.equal(first.headers.get('x-cache'), 'MISS');
    assert.equal(first.headers.get('ratelimit-policy'), '10;w=60, 5;w=10');
    assert.equal(first.headers.get('ratelimit-limit'), '5');
    assert.equal(first.headers.get('ratelimit-remaining'), '4');
    const second = await fetch(base + '/users/2');
    assert.equal(second.headers.get('x-cache'), 'HIT');
    assert.equal(second.headers.get('ratelimit-remaining'), '3');
    for (let i = 0; i < 3; i++) await fetch(base + '/users/2');
    const limited = await fetch(base + '/users/2');
    assert.equal(limited.status, 429);
    assert.equal(limited.headers.get('ratelimit-remaining'), '0');
    assert.equal(limited.headers.get('retry-after'), '10');
  });
  cache.clear();
});

test('CORS lets the configured browser origin read the cache and rate-limit headers', async () => {
  await withServer(createApp({ limiter: createRateLimiter(() => 0) }), async (base) => {
    const res = await fetch(base + '/cache/status', { headers: { Origin: 'http://localhost:3000' } });
    assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:3000');
    const exposed = (res.headers.get('access-control-expose-headers') ?? '').split(',');
    for (const name of ['X-Cache', 'RateLimit-Remaining', 'Retry-After']) assert.ok(exposed.includes(name), name);
  });
});
