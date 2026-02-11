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
