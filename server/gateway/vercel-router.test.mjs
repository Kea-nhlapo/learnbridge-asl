import test from 'node:test';
import assert from 'node:assert/strict';
import { GET } from '../../api/router.js';

test('Vercel rewrite reaches the lesson route after the server move', async () => {
  const response = await GET(new Request('https://example.test/api/router?__path=lessons/missing'));
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { message: 'No such lesson.' });
});

test('Vercel rewrite reaches sign reconstruction after the server move', async () => {
  const response = await GET(new Request('https://example.test/api/router?__path=sign-reconstruct'));
  assert.equal(response.status, 405);
  assert.deepEqual(await response.json(), { error: 'POST required' });
});
