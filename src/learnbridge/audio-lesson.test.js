import test from 'node:test';
import assert from 'node:assert/strict';
import { joinParts, encodeMp3, audioFileName } from './audio-lesson.js';

test('parts are joined with a short silence between them', () => {
  const joined = joinParts([new Float32Array([1, 1]), new Float32Array([0.5])], 10, 0.3);
  assert.deepEqual([...joined], [1, 1, 0, 0, 0, 0.5]);
});

test('a second of speech-like audio becomes a small, valid MP3', async () => {
  const samples = Float32Array.from({ length: 24000 }, (_, i) => Math.sin(i / 10) * 0.4);
  const chunks = await encodeMp3(samples);
  const bytes = Buffer.concat(chunks.map(c => Buffer.from(c)));
  assert.ok(bytes.length > 3000 && bytes.length < 12000, `size ${bytes.length}`);
  assert.equal(bytes[0], 0xff); // MPEG frame sync
  assert.equal(bytes[1] & 0xe0, 0xe0);
});

test('file names come from the lesson title', () => {
  assert.equal(audioFileName('The Water Cycle: Rain & Clouds'), 'the-water-cycle-rain-clouds.mp3');
  assert.equal(audioFileName('Umjikelezo wamanzi'), 'umjikelezo-wamanzi.mp3');
  assert.equal(audioFileName('!!!'), 'lesson.mp3');
});
