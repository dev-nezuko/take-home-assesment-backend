import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import type { AddressInfo } from 'node:net';
import { app } from '../src/app.js';
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
