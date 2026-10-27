// Lesson preparation backend for src/lesson-integration (see its README for the contract).
// A PDF, script or YouTube transcript becomes a short quiz written by Gemini. Every question must quote the
// sentence it was drawn from, and the quote is checked against the source so invented questions are dropped.
// Signed explanations cannot be rendered yet, so each question's help is "text_only": the drawer shows the
// written explanation and says a signed explanation is not available yet.

const MODELS = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-flash-lite-latest'];
// Busy, rate-limited or retired models fall through to the next one.
const tryNextModel = (status, detail) => [0, 429, 500, 503].includes(status) || ([400, 404].includes(status) && /no longer available|not found|not supported/i.test(detail));
const MAX_PDF_BYTES = 15 * 1024 * 1024;
const MAX_SOURCE_CHARS = 60000;
const MIN_QUESTIONS = 3;
const MAX_QUESTIONS = 5;

const QUESTION_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          prompt: { type: 'string' },
          options: { type: 'array', items: { type: 'string' } },
          correctIndex: { type: 'integer' },
          explanation: { type: 'string' },
          sourceQuote: { type: 'string' },
          page: { type: 'integer' },
        },
        required: ['prompt', 'options', 'correctIndex', 'explanation', 'sourceQuote'],
      },
    },
  },
  required: ['title', 'questions'],
};
const PAGES_SCHEMA = {
  type: 'object',
  properties: { pages: { type: 'array', items: { type: 'object', properties: { page: { type: 'integer' }, text: { type: 'string' } }, required: ['page', 'text'] } } },
  required: ['pages'],
};

class UserError extends Error {}

async function gemini(apiKey, parts, schema, fetchImpl) {
  if (!apiKey) throw new UserError('Set GEMINI_API_KEY in .env.local to generate lessons.');
  let lastError = 'Gemini did not answer.';
  for (const model of MODELS) {
    const response = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: { responseMimeType: 'application/json', responseJsonSchema: schema, temperature: 0.4 } }),
      signal: AbortSignal.timeout(120000),
    }).catch(error => ({ ok: false, status: 0, json: async () => ({ error: { message: error.message } }) }));
    if (response.ok) {
      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('') || '';
      try { return JSON.parse(text); } catch { lastError = 'Gemini returned text that was not valid JSON.'; continue; }
    }
    const detail = (await response.json().catch(() => ({})))?.error?.message || `HTTP ${response.status}`;
    lastError = `Gemini (${model}): ${detail}`;
    // Other errors (bad key, bad request) stop here.
    if (!tryNextModel(response.status, detail)) break;
  }
  throw new Error(lastError);
}

const normalise = text => String(text).toLowerCase().normalize('NFKC').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

// Keeps only questions that are well-formed and grounded in the source text.
export function buildQuestions(raw, sourceText, pages = []) {
  const haystack = normalise(sourceText);
  const kept = [];
  const rejected = [];
  for (const q of Array.isArray(raw?.questions) ? raw.questions : []) {
    const options = Array.isArray(q?.options) ? q.options.map(o => String(o).trim()).filter(Boolean) : [];
    const quote = normalise(q?.sourceQuote || '');
    const problems = [];
    if (!String(q?.prompt || '').trim()) problems.push('no prompt');
    if (options.length < 3 || options.length > 4 || new Set(options.map(normalise)).size !== options.length) problems.push('needs 3–4 different options');
    if (!Number.isInteger(q?.correctIndex) || q.correctIndex < 0 || q.correctIndex >= options.length) problems.push('correct answer out of range');
    if (!String(q?.explanation || '').trim()) problems.push('no explanation');
    if (quote.split(' ').length < 4 || !haystack.includes(quote)) problems.push('quote not found in the source');
    if (problems.length) { rejected.push({ prompt: q?.prompt, problems }); continue; }
    const page = pages.find(p => normalise(p.text).includes(quote))?.page;
    const n = kept.length + 1;
    const ids = ['a', 'b', 'c', 'd'];
    kept.push({
      id: `q-${n}`,
      prompt: q.prompt.trim(),
      options: options.map((label, i) => ({ id: ids[i], label })),
      correctOptionId: ids[q.correctIndex],
      explanation: q.explanation.trim(),
      sourceRefs: [{ ...(page ? { page } : {}), quote: q.sourceQuote.trim() }],
      help: { id: `help-q-${n}-v1`, version: '1', language: 'ASL', status: 'text_only', caption: q.explanation.trim() },
    });
    if (kept.length === MAX_QUESTIONS) break;
  }
  return { questions: kept, rejected };
}

function questionPrompt(text, metadata) {
  const about = [metadata.subject && `Subject: ${metadata.subject}`, metadata.grade && `Grade: ${metadata.grade}`].filter(Boolean).join('\n');
  return `You write short multiple-choice practice questions for South African school learners, using only the source below.
Write ${MAX_QUESTIONS} questions. Each has 3 or 4 answer options with exactly one correct answer (correctIndex is its 0-based position; vary it).
Wrong options must be plausible but clearly wrong according to the source. The explanation (1–2 sentences, plain English) says why the answer is right.
sourceQuote must be copied word for word from the source: the sentence that supports the correct answer. If the source has page markers, give the page.
Also give the lesson a short title. Do not use facts that are not in the source.
${about}

SOURCE:
${text.slice(0, MAX_SOURCE_CHARS)}`;
}

// inline: finish the job within the POST request and return the lesson with it. Serverless hosts (Vercel)
// cannot keep jobs in memory between requests, so polling another instance would not find the job.
export function createLessonJobs({ apiKey, fetchImpl = fetch, newId = () => crypto.randomUUID().slice(0, 8), inline = false } = {}) {
  const jobs = new Map();
  const lessons = new Map();

  async function prepare(job, input) {
    const update = fields => Object.assign(job, fields);
    try {
      let text = input.text || '';
      let pages = [];
      if (input.pdf) {
        update({ status: 'extracting' });
        const result = await gemini(apiKey, [
          { inlineData: { mimeType: 'application/pdf', data: input.pdf.toString('base64') } },
          { text: 'Transcribe the readable text of every page of this PDF, in order, exactly as written (no summary). Return one entry per page with its page number.' },
        ], PAGES_SCHEMA, fetchImpl);
        pages = (result?.pages || []).filter(p => Number.isInteger(p.page) && String(p.text || '').trim());
        text = pages.map(p => `[Page ${p.page}]\n${p.text}`).join('\n\n');
        if (normalise(text).split(' ').length < 30) throw new UserError('This PDF has too little readable text to build a lesson. Paste the text as a script instead.');
      }
      // Text read from a PDF in the browser carries [Page n] markers; use them for page references.
      if (!input.pdf && /\[Page \d+\]/.test(text)) pages = [...text.matchAll(/\[Page (\d+)\]\n?([\s\S]*?)(?=\[Page \d+\]|$)/g)].map(m => ({ page: Number(m[1]), text: m[2] }));
      update({ status: 'generating_questions' });
      const raw = await gemini(apiKey, [{ text: questionPrompt(text, input.metadata) }], QUESTION_SCHEMA, fetchImpl);
      const { questions, rejected } = buildQuestions(raw, text, pages);
      if (questions.length < MIN_QUESTIONS) throw new UserError(`Only ${questions.length} questions could be checked against the source (${rejected.length} rejected). Try a longer or clearer source.`);
      const lessonId = `lesson-${newId()}`;
      lessons.set(lessonId, {
        id: lessonId,
        title: input.metadata.title || String(raw.title || 'Practice lesson').trim(),
        source: { id: `source-${job.id}`, version: '1', kind: input.kind, ...(input.videoId ? { videoId: input.videoId } : {}) },
        questions,
        generatedBy: 'gemini',
        rejectedQuestions: rejected.length,
      });
      update({ status: 'ready', lessonId, preparedCount: questions.length, totalCount: questions.length, signedHelp: 'not_available' });
    } catch (error) {
      update({ status: 'failed', error: error instanceof UserError ? error.message : `Lesson preparation failed: ${error.message}` });
    }
  }

  function start(kind, input) {
    const job = { id: `job-${newId()}`, status: 'extracting', preparedCount: 0, totalCount: 0 };
    jobs.set(job.id, job);
    job.done = prepare(job, { kind, ...input });
    return job;
  }

  const send = (res, status, body) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(body)); };
  const publicJob = ({ done, ...job }) => (inline && job.lessonId ? { ...job, lesson: lessons.get(job.lessonId) } : job);
  const started = async job => { if (inline) await job.done; return publicJob(job); };
  async function readBody(req, limit) {
    const chunks = []; let size = 0;
    for await (const chunk of req) { size += chunk.length; if (size > limit) throw new UserError('The upload is too large.'); chunks.push(chunk); }
    return Buffer.concat(chunks);
  }
  const metadataFrom = value => { try { const m = typeof value === 'string' ? JSON.parse(value) : value; return m && typeof m === 'object' ? m : {}; } catch { return {}; } };

  async function handle(req, res, next) {
    const path = req.url?.split('?')[0] || '';
    if (!path.startsWith('/api/lesson-jobs') && !path.startsWith('/api/lessons/')) return next();
    try {
      if (req.method === 'POST' && path === '/api/lesson-jobs/script') {
        const body = JSON.parse((await readBody(req, 200000)).toString() || '{}');
        if (typeof body.text !== 'string' || normalise(body.text).split(' ').length < 30) return send(res, 400, { message: 'Paste at least a paragraph of lesson text (30 words or more).' });
        return send(res, 202, await started(start('script', { text: body.text, metadata: metadataFrom(body.metadata) })));
      }
      if (req.method === 'POST' && path === '/api/lesson-jobs/youtube') {
        const body = JSON.parse((await readBody(req, 300000)).toString() || '{}');
        if (!/^[A-Za-z0-9_-]{11}$/.test(body.videoId || '')) return send(res, 400, { message: 'A YouTube video ID is required.' });
        if (typeof body.transcript !== 'string' || normalise(body.transcript).split(' ').length < 30) return send(res, 400, { message: 'The transcript is too short to build a lesson.' });
        return send(res, 202, await started(start('youtube', { text: body.transcript, videoId: body.videoId, metadata: metadataFrom(body.metadata) })));
      }
      if (req.method === 'POST' && path === '/api/lesson-jobs/pdf') {
        const raw = await readBody(req, MAX_PDF_BYTES + 100000);
        const form = await new Request('http://local/', { method: 'POST', headers: { 'content-type': req.headers['content-type'] || '' }, body: raw }).formData().catch(() => null);
        const file = form?.get('file');
        if (!file || typeof file === 'string') return send(res, 400, { message: 'Choose a PDF file.' });
        const pdf = Buffer.from(await file.arrayBuffer());
        if (pdf.subarray(0, 5).toString() !== '%PDF-') return send(res, 400, { message: 'That file is not a PDF.' });
        if (pdf.length > MAX_PDF_BYTES) return send(res, 413, { message: 'Choose a PDF under 15 MB.' });
        return send(res, 202, await started(start('pdf', { pdf, metadata: metadataFrom(form.get('metadata')) })));
      }
      const jobMatch = path.match(/^\/api\/lesson-jobs\/([\w-]+)$/);
      if (req.method === 'GET' && jobMatch) {
        const job = jobs.get(jobMatch[1]);
        return job ? send(res, 200, publicJob(job)) : send(res, 404, { message: 'No such lesson job.' });
      }
      const lessonMatch = path.match(/^\/api\/lessons\/([\w-]+)$/);
      if (req.method === 'GET' && lessonMatch) {
        const lesson = lessons.get(lessonMatch[1]);
        return lesson ? send(res, 200, lesson) : send(res, 404, { message: 'No such lesson.' });
      }
      return send(res, 405, { message: 'Unsupported lesson request.' });
    } catch (error) {
      return send(res, error instanceof UserError ? 413 : 400, { message: error instanceof UserError ? error.message : 'Invalid lesson request.' });
    }
  }
  return { handle, jobs, lessons };
}
