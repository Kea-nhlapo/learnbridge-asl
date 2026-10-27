// Pre-translates the sample lessons (title + paragraphs) into isiZulu and Sepedi with the app's own
// /api/translate (NLLB), so switching language on a sample lesson is instant. Machine translation:
// have a fluent speaker review before relying on it.
// Usage: start the dev server (npm run dev), then: node scripts/translate-sample-lessons.mjs [base-url]
import { writeFile } from 'node:fs/promises';
import { allSampleLessons } from '../src/learnbridge/sample-lessons.js';

const BASE = process.argv[2] || 'http://127.0.0.1:8765';
const out = {};
async function translate(texts, to) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const response = await fetch(`${BASE}/api/translate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: texts.join('\n\n'), from: 'en', to }) });
    const data = await response.json().catch(() => ({}));
    const parts = response.ok ? data.text.split('\n\n') : [];
    if (parts.length === texts.length) return parts;
    console.warn(`  retry ${attempt}: ${response.status} ${data.error || 'paragraph count mismatch'}`);
  }
  throw new Error('Translation failed');
}
const lessons = allSampleLessons();
for (let i = 0; i < lessons.length; i += 3) {
  await Promise.all(lessons.slice(i, i + 3).map(async lesson => {
    const texts = [lesson.title, ...lesson.text.split('\n\n')];
    out[lesson.id] = {};
    for (const to of ['zu', 'nso']) { out[lesson.id][to] = await translate(texts, to); console.log(`${lesson.id} ${to} ✓`); }
  }));
}
await writeFile(new URL('../src/learnbridge/sample-lessons-translations.json', import.meta.url), JSON.stringify(out, null, 1) + '\n');
console.log(`Saved translations for ${Object.keys(out).length} lessons.`);
