import test from 'node:test';
import assert from 'node:assert/strict';
import gateway from './learnbridge-gateway.mjs';

const ask = (body, env) => gateway.fetch(new Request('http://x/api/youtube', { method: 'POST', body: JSON.stringify(body) }), env);
const gemini = (text, language = 'en') => Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify({ language, text }) }] } }] });
async function withFetch(fake, run) { const previous = globalThis.fetch; globalThis.fetch = fake; try { await run(); } finally { globalThis.fetch = previous; } }
const noCaptions = url => url.includes('/watch?v=') && !url.includes('oembed') ? new Response('"INNERTUBE_API_KEY":"K"') : url.includes('youtubei') ? Response.json({ playabilityStatus: { status: 'OK' }, captions: {} }) : null;

test('YouTube without captions: Gemini transcribes it from the link', async () => {
  const seen = [];
  await withFetch(async (url, init = {}) => {
    url = String(url); seen.push({ url, body: init.body });
    if (url.includes('oembed')) return Response.json({ title: 'Isifundo' });
    if (url.includes('generativelanguage')) return gemini('Amanzi ahlala ehamba njalo emhlabeni wethu.', 'zu');
    return noCaptions(url) || new Response('?', { status: 404 });
  }, async () => {
    const r = await ask({ url: 'https://youtu.be/jNQXAC9IVRw', language: 'zu' }, { GEMINI_API_KEY: 'k' });
    assert.equal(r.status, 200);
    assert.deepEqual(await r.json(), { text: 'Amanzi ahlala ehamba njalo emhlabeni wethu.', language: 'zu', automatic: true, transcribedBy: 'gemini', title: 'Isifundo' });
    const call = JSON.parse(seen.find(s => s.url.includes('generativelanguage')).body);
    assert.equal(call.contents[0].parts[0].fileData.fileUri, 'https://www.youtube.com/watch?v=jNQXAC9IVRw');
  });
});

test('without a Gemini key, or when Gemini fails, the caption error is returned', async () => {
  await withFetch(async url => noCaptions(String(url)) || new Response('?', { status: 404 }), async () => {
    const r = await ask({ url: 'https://youtu.be/jNQXAC9IVRw' }, {});
    assert.equal(r.status, 404);
    assert.match((await r.json()).error, /no captions/);
  });
  await withFetch(async url => { url = String(url); if (url.includes('generativelanguage')) return Response.json({ error: { message: 'bad key' } }, { status: 400 }); return noCaptions(url) || new Response('?', { status: 404 }); }, async () => {
    assert.equal((await ask({ url: 'https://youtu.be/jNQXAC9IVRw' }, { GEMINI_API_KEY: 'k' })).status, 404);
  });
});

test('read aloud uses Gemini speech first, as a WAV file', async () => {
  const seen = [];
  const pcm = Buffer.alloc(4800).toString('base64');
  await withFetch(async (url, init = {}) => {
    url = String(url); seen.push({ url, body: init.body });
    if (url.includes('generativelanguage')) return Response.json({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'audio/l16; rate=24000', data: pcm } }] } }] });
    return new Response('?', { status: 404 });
  }, async () => {
    const r = await gateway.fetch(new Request('http://x/api/speak', { method: 'POST', body: JSON.stringify({ text: 'Sawubona', lang: 'zu' }) }), { GEMINI_API_KEY: 'k' });
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('x-voice'), 'gemini');
    const wav = Buffer.from(await r.arrayBuffer());
    assert.equal(wav.subarray(0, 4).toString(), 'RIFF');
    assert.equal(wav.readUInt32LE(24), 24000);
    assert.equal(wav.length, 44 + 4800);
    assert.match(JSON.parse(seen[0].body).contents[0].parts[0].text, /isiZulu/);
    assert.ok(seen.every(s => !s.url.includes('omnivoice')));
  });
});

test('translation falls back to Gemini when NLLB is busy, keeping paragraphs', async () => {
  const seen = [];
  await withFetch(async (url, init = {}) => {
    url = String(url); seen.push(url);
    if (url.includes('unesco-nllb')) return url.endsWith('/call/translate') ? Response.json({ event_id: 'e' }) : new Response('event: error\ndata: null\n\n');
    if (url.includes('generativelanguage')) return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify({ paragraphs: ['Sawubona.', 'Amanzi.'] }) }] } }] });
    return new Response('?', { status: 404 });
  }, async () => {
    const r = await gateway.fetch(new Request('http://x/api/translate', { method: 'POST', body: JSON.stringify({ text: 'Hello.\n\nWater.', from: 'en', to: 'zu' }) }), { GEMINI_API_KEY: 'k' });
    assert.equal(r.status, 200);
    assert.deepEqual(await r.json(), { text: 'Sawubona.\n\nAmanzi.', translatedBy: 'gemini' });
    assert.ok(seen.some(u => u.includes('generativelanguage')));
  });
});
