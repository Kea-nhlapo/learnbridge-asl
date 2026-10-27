import test from 'node:test';
import assert from 'node:assert/strict';
import { SAMPLE_LESSONS, allSampleLessons } from './sample-lessons.js';
import { SUBJECTS } from '../demo-journey-config.js';

test('every library subject has sample lessons long enough to make a quiz', () => {
  for (const [, subject] of SUBJECTS) assert.ok(SAMPLE_LESSONS[subject]?.length >= 2, subject);
  for (const lesson of allSampleLessons()) {
    assert.ok(lesson.text.split(/\s+/).length >= 150, lesson.id);
    assert.ok(lesson.title && lesson.grade && lesson.chapter, lesson.id);
  }
  assert.equal(new Set(allSampleLessons().map(l => l.id)).size, allSampleLessons().length);
});

test('every sample lesson has a complete isiZulu and Sepedi translation', async () => {
  const { readFileSync } = await import('node:fs');
  const translations = JSON.parse(readFileSync(new URL('./sample-lessons-translations.json', import.meta.url)));
  for (const lesson of allSampleLessons()) {
    const count = 1 + lesson.text.split('\n\n').length;
    for (const lang of ['zu', 'nso']) assert.equal(translations[lesson.id]?.[lang]?.length, count, `${lesson.id} ${lang}`);
  }
});
