import test from 'node:test';
import assert from 'node:assert/strict';
import { SAMPLE_CAPS, capsLabel, capsWords, phaseOf } from './caps.js';
import { allSampleLessons } from './sample-lessons.js';

test('every sample lesson has CAPS tags whose grade matches the lesson', () => {
  for (const lesson of allSampleLessons()) {
    assert.ok(SAMPLE_CAPS[lesson.id], lesson.id);
    assert.equal(lesson.caps.grade, lesson.grade, lesson.id);
  }
});

test('labels and search words', () => {
  assert.equal(capsLabel(SAMPLE_CAPS['life-photosynthesis']), 'CAPS · FET Phase · Life Sciences · Grade 11 · Term 2 · Energy transformations: photosynthesis');
  assert.equal(capsLabel(SAMPLE_CAPS['maths-fractions']), 'CAPS · Senior Phase · Mathematics · Grade 7 · check term · Common fractions');
  assert.equal(capsLabel(null), '');
  assert.match(capsWords(SAMPLE_CAPS['phys-electric-circuits']), /natural sciences.*energy and change.*grade 9.*term 3.*senior phase/);
  assert.equal(phaseOf(5), 'Intermediate Phase');
});
