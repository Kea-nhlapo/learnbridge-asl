import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { buildQuestions, createLessonJobs } from './lesson-jobs.mjs';
import { validateLesson, validateJob } from '../src/lesson-integration/contract.js';

const SOURCE = 'Water is always moving. The sun warms water in rivers, lakes and oceans, and some of it becomes water vapour that rises into the air. As water vapour rises, it cools and changes into tiny droplets that form clouds. When the droplets become heavy enough, water falls from the clouds as rain, snow or hail.';
const good = (prompt, quote, correctIndex = 0) => ({ prompt, options: ['Evaporation', 'Condensation', 'Precipitation'], correctIndex, explanation: 'Because the source says so.', sourceQuote: quote });
const GEMINI_QUESTIONS = { title: 'The water cycle', questions: [
  good('What does the sun do to water?', 'The sun warms water in rivers, lakes and oceans'),
  good('What forms clouds?', 'it cools and changes into tiny droplets that form clouds', 1),
  good('When does rain fall?', 'When the droplets become heavy enough, water falls from the clouds', 2),
  good('Invented question', 'Water boils at one hundred degrees in the ocean'),
] };

function fakeGemini(responses, calls = []) {
  return async (url, init) => {
    calls.push({ url: String(url), body: JSON.parse(init.body) });
    const next = responses.shift();
    if (next instanceof Response) return next;
    return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify(next) }] } }] });
  };
}
async function call(jobs, method, url, body, headers = {}) {
  const req = Object.assign(Readable.from(body === undefined ? [] : [Buffer.from(typeof body === 'string' ? body : JSON.stringify(body))]), { method, url, headers });
  return new Promise(resolve => {
    const res = { statusCode: 200, headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(data) { resolve({ status: this.statusCode, body: JSON.parse(data) }); } };
    jobs.handle(req, res, () => resolve({ status: 'next' }));
  });
}

test('only grounded, well-formed questions are kept', () => {
  const { questions, rejected } = buildQuestions(GEMINI_QUESTIONS, SOURCE);
  assert.equal(questions.length, 3);
  assert.deepEqual(rejected.map(r => r.problems), [['quote not found in the source']]);
  assert.deepEqual(questions[1].options.map(o => o.id), ['a', 'b', 'c']);
  assert.equal(questions[1].correctOptionId, 'b');
  assert.equal(questions[0].help.status, 'text_only');
  const bad = buildQuestions({ questions: [{ ...good('Q', 'The sun warms water in rivers'), options: ['Same', 'same', 'Other'] }, { ...good('Q', 'The sun warms water in rivers'), correctIndex: 5 }] }, SOURCE);
  assert.equal(bad.questions.length, 0);
});

test('script -> job -> ready lesson that passes the frontend contract', async () => {
  const calls = [];
  const jobs = createLessonJobs({ apiKey: 'k', fetchImpl: fakeGemini([GEMINI_QUESTIONS], calls) });
  const created = await call(jobs, 'POST', '/api/lesson-jobs/script', { text: SOURCE, metadata: { subject: 'Natural Sciences' } });
  assert.equal(created.status, 202);
  validateJob(created.body);
  await jobs.jobs.get(created.body.id).done;
  const job = await call(jobs, 'GET', `/api/lesson-jobs/${created.body.id}`);
  assert.equal(job.body.status, 'ready');
  assert.equal(job.body.preparedCount, 3);
  const lesson = await call(jobs, 'GET', `/api/lessons/${job.body.lessonId}`);
  assert.equal(lesson.status, 200);
  assert.doesNotThrow(() => validateLesson(lesson.body));
  assert.equal(lesson.body.title, 'The water cycle');
  assert.match(calls[0].body.contents[0].parts[0].text, /Subject: Natural Sciences/);
  assert.equal(calls[0].url.includes('gemini-3.5-flash-lite'), true);
});

test('PDF: Gemini reads the pages, then questions get page references', async () => {
  const calls = [];
  const pages = { pages: [{ page: 1, text: 'Water is always moving. The sun warms water in rivers, lakes and oceans, and some of it becomes water vapour that rises into the air.' }, { page: 2, text: 'As water vapour rises, it cools and changes into tiny droplets that form clouds. When the droplets become heavy enough, water falls from the clouds as rain, snow or hail.' }] };
  const jobs = createLessonJobs({ apiKey: 'k', fetchImpl: fakeGemini([pages, GEMINI_QUESTIONS], calls) });
  const form = new FormData();
  form.append('file', new Blob(['%PDF-1.4 fake']), 'lesson.pdf');
  form.append('metadata', JSON.stringify({ title: 'My lesson' }));
  const request = new Request('http://x/', { method: 'POST', body: form });
  const body = Buffer.from(await request.arrayBuffer());
  const created = await call(jobs, 'POST', '/api/lesson-jobs/pdf', body.toString('latin1'), { 'content-type': request.headers.get('content-type') });
  assert.equal(created.status, 202);
  await jobs.jobs.get(created.body.id).done;
  const lesson = jobs.lessons.get(jobs.jobs.get(created.body.id).lessonId);
  assert.equal(lesson.title, 'My lesson');
  assert.deepEqual(lesson.questions.map(q => q.sourceRefs[0].page), [1, 2, 2]);
  assert.equal(calls[0].body.contents[0].parts[0].inlineData.mimeType, 'application/pdf');
});

test('honest failures: too few grounded questions, busy model fallback, missing key, bad input', async () => {
  const thin = createLessonJobs({ apiKey: 'k', fetchImpl: fakeGemini([{ title: 'x', questions: GEMINI_QUESTIONS.questions.slice(2) }]) });
  const job = (await call(thin, 'POST', '/api/lesson-jobs/script', { text: SOURCE })).body;
  await thin.jobs.get(job.id).done;
  assert.equal(thin.jobs.get(job.id).status, 'failed');
  assert.match(thin.jobs.get(job.id).error, /Only 1 questions/);

  const calls = [];
  const busy = createLessonJobs({ apiKey: 'k', fetchImpl: fakeGemini([Response.json({ error: { message: 'high demand' } }, { status: 503 }), GEMINI_QUESTIONS], calls) });
  const busyJob = (await call(busy, 'POST', '/api/lesson-jobs/script', { text: SOURCE })).body;
  await busy.jobs.get(busyJob.id).done;
  assert.equal(busy.jobs.get(busyJob.id).status, 'ready');
  assert.equal(calls.length, 2);
  assert.notEqual(calls[0].url, calls[1].url);

  const noKey = createLessonJobs({ apiKey: '', fetchImpl: fakeGemini([]) });
  const noKeyJob = (await call(noKey, 'POST', '/api/lesson-jobs/script', { text: SOURCE })).body;
  await noKey.jobs.get(noKeyJob.id).done;
  assert.match(noKey.jobs.get(noKeyJob.id).error, /GEMINI_API_KEY/);

  assert.equal((await call(noKey, 'POST', '/api/lesson-jobs/script', { text: 'Too short.' })).status, 400);
  assert.equal((await call(noKey, 'POST', '/api/lesson-jobs/youtube', { videoId: 'bad', transcript: SOURCE })).status, 400);
  assert.equal((await call(noKey, 'GET', '/api/lessons/lesson-missing')).status, 404);
  assert.equal((await call(noKey, 'GET', '/api/other')).status, 'next');
});

test('inline mode (serverless): the POST waits for the job and returns the lesson with it', async () => {
  const jobs = createLessonJobs({ apiKey: 'k', fetchImpl: fakeGemini([GEMINI_QUESTIONS]), inline: true });
  const created = await call(jobs, 'POST', '/api/lesson-jobs/script', { text: SOURCE });
  assert.equal(created.status, 202);
  assert.equal(created.body.status, 'ready');
  assert.doesNotThrow(() => validateLesson(created.body.lesson));
  assert.equal(created.body.lesson.questions.length, 3);
});

test('text read from a PDF in the browser keeps its page references', async () => {
  const text = '[Page 1]\nWater is always moving. The sun warms water in rivers, lakes and oceans, and some of it becomes water vapour that rises into the air.\n\n[Page 2]\nAs water vapour rises, it cools and changes into tiny droplets that form clouds. When the droplets become heavy enough, water falls from the clouds as rain, snow or hail.';
  const jobs = createLessonJobs({ apiKey: 'k', fetchImpl: fakeGemini([GEMINI_QUESTIONS]), inline: true });
  const created = await call(jobs, 'POST', '/api/lesson-jobs/script', { text });
  assert.deepEqual(created.body.lesson.questions.map(q => q.sourceRefs[0].page), [1, 2, 2]);
});
