import test from 'node:test';
import assert from 'node:assert/strict';
import { validateLesson } from './contract.js';
import { createLessonSession } from './session.js';
import { createVideoCache } from './video-cache.js';

const lesson = {
  id: 'lesson-1',
  questions: [{
    id: 'q-1', prompt: 'What becomes vapour?',
    options: [{ id: 'a', label: 'Water' }, { id: 'b', label: 'Rock' }],
    correctOptionId: 'a', explanation: 'Water evaporates.',
    help: { id: 'help-1', version: '1', language: 'SASL', status: 'ready', videoUrl: '/help-1.mp4' },
  }],
};

test('rejects a lesson whose signed help is unfinished', () => {
  assert.throws(() => validateLesson({ ...lesson, questions: [{ ...lesson.questions[0], help: { ...lesson.questions[0].help, status: 'rendering' } }] }), /not ready/);
});

test('wrong answer, cached help, retry, and completion preserve question state', async () => {
  let fetchCount = 0;
  const cache = createVideoCache({
    fetchImpl: async () => { fetchCount += 1; return { ok: true, blob: async () => new Blob(['video']) }; },
    makeUrl: () => 'blob:help-1', revokeUrl: () => {},
  });
  const session = createLessonSession(lesson, { videoCache: cache });
  session.select('b');
  assert.equal(session.check(), 'incorrect');
  await session.openHelp();
  assert.equal(session.snapshot().helpVideoUrl, 'blob:help-1');
  assert.equal(session.snapshot().selectedOptionId, 'b');
  session.closeHelp();
  assert.equal(session.snapshot().selectedOptionId, 'b');
  session.select('a');
  assert.equal(session.check(), 'correct');
  assert.equal(session.next(), true);
  assert.equal(session.snapshot().completed, true);
  assert.equal(fetchCount, 1);
  session.dispose();
});
