import test from 'node:test';
import assert from 'node:assert/strict';
import { speechPieces } from './speech-pieces.js';
import { allSampleLessons } from './sample-lessons.js';

test('Listen pieces stay under the voice limit and keep every word', () => {
  for (const lesson of allSampleLessons()) {
    const paragraphs = lesson.text.split('\n\n');
    const pieces = speechPieces(paragraphs);
    assert.ok(pieces.every(piece => piece.length <= 380), lesson.id);
    assert.equal(pieces.join(' ').replace(/\s+/g, ' '), paragraphs.join(' ').replace(/\s+/g, ' ').trim(), lesson.id);
  }
});
