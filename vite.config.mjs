import { defineConfig, loadEnv } from 'vite';
import { signReconstructionMiddleware } from './server/sign-reconstruct.mjs';
import { learnBridgeMiddleware } from './server/learnbridge-middleware.mjs';

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
  return { plugins: [signApi, learnBridgeApi], server: { hmr: false } };
});
