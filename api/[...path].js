// Vercel function for every /api/* route. It reuses the same server modules as the Vite dev server:
// LearnBridge's gateway (translation, voices, transcription, YouTube, ASL), lesson preparation and
// Signchat sentence reconstruction. Keys come from the Vercel project's environment variables.
import { Readable } from 'node:stream';
import gateway from '../server/learnbridge-gateway.mjs';
import { createLessonJobs } from '../server/lesson-jobs.mjs';
import { signReconstructionMiddleware } from '../server/sign-reconstruct.mjs';

const GATEWAY_ROUTES = new Set(['/api/translate', '/api/speak', '/api/transcribe', '/api/youtube', '/api/asl']);
// Serverless instances do not share memory, so lessons are generated within the request.
const lessons = createLessonJobs({ apiKey: process.env.GEMINI_API_KEY, inline: true });
const signReconstruct = signReconstructionMiddleware(process.env.GEMINI_API_KEY, process.env.GEMINI_MODEL);

// Runs a Node-style (req, res, next) middleware on a web Request and returns its web Response.
function runMiddleware(middleware, request) {
  const url = new URL(request.url);
  const req = Object.assign(request.body ? Readable.fromWeb(request.body) : Readable.from([]), {
    method: request.method,
    url: url.pathname + url.search,
    headers: Object.fromEntries(request.headers),
  });
  return new Promise(resolve => {
    const headers = new Headers();
    const res = {
      statusCode: 200,
      setHeader(name, value) { headers.set(name, value); },
      end(body) { resolve(new Response(body ?? null, { status: this.statusCode, headers })); },
    };
    Promise.resolve(middleware(req, res, () => resolve(Response.json({ message: 'Not found.' }, { status: 404 })))).catch(() =>
      resolve(Response.json({ message: 'Request failed.' }, { status: 500 })));
  });
}

async function handle(request) {
  const path = new URL(request.url).pathname;
  if (GATEWAY_ROUTES.has(path)) return gateway.fetch(request, { HF_TOKEN: process.env.HF_TOKEN, GEMINI_API_KEY: process.env.GEMINI_API_KEY });
  if (path.startsWith('/api/lesson-jobs') || path.startsWith('/api/lessons/')) return runMiddleware(lessons.handle, request);
  if (path === '/api/sign-reconstruct') return runMiddleware(signReconstruct, request);
  return Response.json({ message: 'Not found.' }, { status: 404 });
}

export const GET = handle;
export const POST = handle;
