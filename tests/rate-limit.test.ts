import type { Request, Response } from 'express';
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createRateLimiter } from '../src/middleware/rateLimiter.js';
test('both limits debit every accepted request and forwarding headers cannot bypass the IP bucket', () => {
 let now = 0; const limit = createRateLimiter(() => now);
 function request(forwarded: string) {
  let status = 200; let next = false; let retry = '';
  limit({ ip: '127.0.0.1', headers: { 'x-forwarded-for': forwarded }, socket: {} } as unknown as Request, { setHeader(_name: string, value: string) { retry=value; }, status(value: number) { status=value; return this; }, json() {} } as unknown as Response, () => { next = true; });
  return { status, next, retry };
 }
 for (let i=0;i<5;i++) assert.equal(request(String(i)).next,true);
 assert.deepEqual(request('spoofed'), { status:429,next:false,retry:'10' });
 now=10000; for(let i=0;i<5;i++) assert.equal(request('other').next,true);
 now=20000; for(let i=0;i<3;i++) assert.equal(request('other').next,true);
 assert.equal(request('other').status,429);
});

test('idle buckets are dropped once they would be full again, and pruning keeps them only that long', () => {
 let now = 0; const limit = createRateLimiter(() => now);
 const call = (ip: string) => { let status = 200; limit({ ip, headers: {}, socket: {} } as unknown as Request, { setHeader() {}, status(value: number) { status = value; return this; }, json() {} } as unknown as Response, () => {}); return status; };
 for (let i = 0; i < 5; i++) call('10.0.0.1');
 assert.equal(call('10.0.0.1'), 429);
 now = 30_000; call('10.0.0.2');
 assert.equal(limit.trackedClients(), 2);
 now = 59_999; call('10.0.0.3'); assert.equal(limit.trackedClients(), 3);
 now = 60_000; call('10.0.0.3'); assert.equal(limit.trackedClients(), 2);
 now = 89_999; call('10.0.0.3'); assert.equal(limit.trackedClients(), 2);
 now = 90_000; call('10.0.0.3'); assert.equal(limit.trackedClients(), 1);
 now = 200_000; for (let i = 0; i < 5; i++) assert.equal(call('10.0.0.1'), 200);
 assert.equal(call('10.0.0.1'), 429);
});

test('retry-after reports the longer of the token and burst waits', () => {
 let now = 0; const limit = createRateLimiter(() => now);
 const call = () => { let retry = ''; let status = 200; limit({ ip: '10.0.0.9', headers: {}, socket: {} } as unknown as Request, { setHeader(_n: string, v: string) { retry = v; }, status(value: number) { status = value; return this; }, json() {} } as unknown as Response, () => {}); return { status, retry }; };
 for (let i = 0; i < 5; i++) call();
 now = 9_000; assert.deepEqual(call(), { status: 429, retry: '1' });
 now = 10_000; for (let i = 0; i < 5; i++) assert.equal(call().status, 200);
 now = 10_500; assert.deepEqual(call(), { status: 429, retry: '10' });
 now = 20_000; for (let i = 0; i < 3; i++) assert.equal(call().status, 200);
 assert.deepEqual(call(), { status: 429, retry: '4' });
});
