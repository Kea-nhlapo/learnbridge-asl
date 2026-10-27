import { defineConfig, loadEnv } from 'vite';
import { signReconstructionMiddleware } from './server/sign-reconstruct.mjs';
import { learnBridgeMiddleware } from './server/learnbridge-middleware.mjs';
import { createLessonJobs } from './server/lesson-jobs.mjs';
import { ngtSignsMiddleware } from './server/ngt-signs.mjs';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'GEMINI_');
  const middleware = signReconstructionMiddleware(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY, env.GEMINI_MODEL || process.env.GEMINI_MODEL);
  const signApi = { name: 'sign-reconstruction-api', configureServer(server) { server.middlewares.use(middleware); }, configurePreviewServer(server) { server.middlewares.use(middleware); } };
  // LearnBridge's translation, voice, transcription, YouTube and ASL routes. HF_TOKEN (optional) raises the free allowance.
  const learnBridge = learnBridgeMiddleware(loadEnv(mode, process.cwd(), 'HF_').HF_TOKEN || process.env.HF_TOKEN);
  const learnBridgeApi = { name: 'learnbridge-api', configureServer(server) { server.middlewares.use(learnBridge); }, configurePreviewServer(server) { server.middlewares.use(learnBridge); } };
  // The sign introduction is a live camera session. A Vite HMR reconnect or
  // full reload would tear down MediaPipe and lose the participant's capture.
  // Keep the demo stable; restart/refresh manually when changing source.
  // Lesson preparation (src/lesson-integration contract): Gemini writes questions checked against the source.
  const lessonJobs = createLessonJobs({ apiKey: env.GEMINI_API_KEY || process.env.GEMINI_API_KEY });
  const lessonApi = { name: 'lesson-jobs-api', configureServer(server) { server.middlewares.use(lessonJobs.handle); }, configurePreviewServer(server) { server.middlewares.use(lessonJobs.handle); } };
  // Any sign from Nia's NGT dictionary, for /nia-sign.
  const ngtSigns = ngtSignsMiddleware(new URL('./public', import.meta.url).pathname);
  const ngtApi = { name: 'ngt-signs', configureServer(server) { server.middlewares.use(ngtSigns); }, configurePreviewServer(server) { server.middlewares.use(ngtSigns); } };
  return { plugins: [signApi, learnBridgeApi, lessonApi, ngtApi], server: { hmr: false } };
});
