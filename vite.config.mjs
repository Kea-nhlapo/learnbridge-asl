import { defineConfig, loadEnv } from 'vite';
import { signReconstructionMiddleware } from './server/sign-reconstruct.mjs';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'GEMINI_');
  const middleware = signReconstructionMiddleware(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY, env.GEMINI_MODEL || process.env.GEMINI_MODEL);
  const signApi = { name: 'sign-reconstruction-api', configureServer(server) { server.middlewares.use(middleware); }, configurePreviewServer(server) { server.middlewares.use(middleware); } };
  // The sign introduction is a live camera session. A Vite HMR reconnect or
  // full reload would tear down MediaPipe and lose the participant's capture.
  // Keep the demo stable; restart/refresh manually when changing source.
  return { plugins: [signApi], server: { hmr: false } };
});
