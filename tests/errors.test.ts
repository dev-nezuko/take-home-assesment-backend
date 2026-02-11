import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createApp } from '../src/app.js';
import { allowAll, withServer } from './helpers.js';

const app = createApp(allowAll);

test('unknown user IDs are 404 and malformed IDs are 400', async () => {
  await withServer(app, async (base) => {
    const missing = await fetch(base + '/users/424242');
    assert.equal(missing.status, 404);
    assert.equal((await missing.json()).error, 'User not found');
    for (const id of ['0', '-1', '1.5', '1e3', '9007199254740993', '%20']) {
      assert.equal((await fetch(base + '/users/' + id)).status, 400, id);
    }
  });
});

test('malformed and oversized JSON bodies return JSON 400/413, not an HTML stack trace', async () => {
  await withServer(app, async (base) => {
    const post = (body: string, type = 'application/json') =>
      fetch(base + '/users', { method: 'POST', headers: { 'Content-Type': type }, body });
    const broken = await post('{"name":');
    assert.equal(broken.status, 400);
    assert.match(broken.headers.get('content-type') ?? '', /json/);
    const huge = await post(JSON.stringify({ name: 'x'.repeat(20_000), email: 'a@b.co' }));
    assert.equal(huge.status, 413);
    assert.match(huge.headers.get('content-type') ?? '', /json/);
    assert.equal((await post('name=x', 'text/plain')).status, 400);
  });
});

test('unknown routes return a JSON 404', async () => {
  await withServer(app, async (base) => {
    const res = await fetch(base + '/nope');
    assert.equal(res.status, 404);
    assert.equal((await res.json()).error, 'Not found');
  });
});
