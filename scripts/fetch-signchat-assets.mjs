import { mkdir, writeFile, stat, copyFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const base = join(root, 'public', 'vendor', 'signchat');
const mediaWasm = join(base, 'mediapipe', 'wasm');
const mediaModels = join(base, 'mediapipe', 'models');
const ortDir = join(base, 'ort');
await Promise.all([mediaWasm, mediaModels, ortDir].map(dir => mkdir(dir, { recursive: true })));

for (const name of ['vision_wasm_internal.js', 'vision_wasm_internal.wasm', 'vision_wasm_nosimd_internal.js', 'vision_wasm_nosimd_internal.wasm']) {
  await copyFile(join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm', name), join(mediaWasm, name));
}
for (const name of ['ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm']) {
  await copyFile(join(root, 'node_modules', 'onnxruntime-web', 'dist', name), join(ortDir, name));
}

const sources = {
  'face_landmarker.task': 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
  'hand_landmarker.task': 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
  'pose_landmarker_lite.task': 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
};
for (const [name, url] of Object.entries(sources)) {
  const target = join(mediaModels, name);
  const existing = await stat(target).catch(() => null);
  if (existing?.size) { console.log(`${name}: cached ${existing.size} bytes`); continue; }
  const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
  const data = Buffer.from(await response.arrayBuffer());
  if (!data.length) throw new Error(`${name}: empty download`);
  await writeFile(target, data);
  console.log(`${name}: downloaded ${data.length} bytes`);
}
