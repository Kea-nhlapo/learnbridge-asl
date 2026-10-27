import test from 'node:test';
import assert from 'node:assert/strict';
import { signReconstructionMiddleware } from './sign-reconstruct.mjs';

async function call(body, key = '') {
  const req = { url: '/api/sign-reconstruct', method: 'POST', async *[Symbol.asyncIterator]() { yield Buffer.from(JSON.stringify(body)); } };
  const res = { statusCode: 200, headers: {}, setHeader(name, value) { this.headers[name] = value; }, end(value) { this.body = JSON.parse(value); } };
  await signReconstructionMiddleware(key)(req, res, () => { throw new Error('unexpected next'); });
  return res;
}

test('rejects missing key without sending signs', async () => {
  const result = await call({ tokens: [{ label: 'HELLO', score: 0.8 }] });
  assert.equal(result.statusCode, 503);
  assert.match(result.body.error, /GEMINI_API_KEY/);
});

test('sends only admitted labels and scores, validates sentence response', async () => {
  const original = globalThis.fetch;
  let sent;
  globalThis.fetch = async (url, options) => {
    sent = { url, key: options.headers['x-goog-api-key'], body: JSON.parse(options.body) };
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ sentence: 'Hello there.', confidence: 'medium', matchedScriptId: null, usedSigns: ['HELLO'] }) }] } }] }) };
  };
  try {
    const result = await call({ tokens: [{ label: 'HELLO', score: 0.8 }] }, 'test-key');
    assert.equal(result.statusCode, 200);
    assert.equal(result.body.sentence, 'Hello there.');
    assert.equal(sent.url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent');
    assert.equal(sent.key, 'test-key');
    assert.match(sent.body.contents[0].parts[0].text, /HELLO/);
    assert.equal(sent.body.generationConfig.thinkingConfig.thinkingLevel, 'MINIMAL');
    assert.equal(sent.body.generationConfig.responseFormat.text.mimeType, 'APPLICATION_JSON');
    assert.ok(!JSON.stringify(sent.body).includes('camera'));
  } finally { globalThis.fetch = original; }
});

test('known introduction preserves the fingerspelled name without an API call', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('should not call Gemini'); };
  try {
    const result = await call({ tokens: [{ label: 'hello', score: .8 }, { label: 'minemy', score: .8 }], spelledName: 'Tshego' });
    assert.equal(result.statusCode, 200);
    assert.equal(result.body.sentence, 'Hello, my name is Tshego.');
  } finally { globalThis.fetch = original; }
});
