import test from 'node:test';
import assert from 'node:assert/strict';

const store = new Map();
globalThis.localStorage = { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
const { recordResult, allResults, summarise, addDemoResults, clearDemoResults, hasDemoResults } = await import('./results.js');

const r = (learner, questionId, firstTry, extra = {}) => ({ learner, learnerName: learner.toUpperCase(), lessonId: 'water', lessonTitle: 'Water', questionId, prompt: `Q ${questionId}`, firstTry, attempts: firstTry ? 1 : 2, ...extra });

test('summaries per learner, question and lesson', () => {
  const results = [r('a', 1, true), r('a', 2, false, { helpUsed: true }), r('b', 1, true), r('b', 2, false), r('b', 3, true, { lessonId: 'eye', lessonTitle: 'Eye' })];
  const s = summarise(results, [{ email: 'a', name: 'Anele', profile: { needs: ['deaf'] } }, { email: 'c', name: 'Cebo', profile: null }]);
  assert.deepEqual(s.totals, { learners: 2, lessons: 2, answered: 5, score: 60, help: 1 });
  assert.deepEqual(s.learners.map(l => [l.name, l.answered, l.score, l.lessons, l.help]), [['Anele', 2, 50, 1, 1], ['B', 3, 67, 2, 0], ['Cebo', 0, 0, 0, 0]]);
  assert.equal(s.questions[0].prompt, 'Q 2');
  assert.equal(s.questions[0].score, 0);
  assert.equal(s.questions[0].wrongTries, 2);
  assert.deepEqual(s.lessons.map(l => [l.title, l.learners, l.score]), [['Eye', 1, 100], ['Water', 2, 50]]);
});

test('results are stored, and demo results can be added and cleared', () => {
  recordResult(r('a', 1, true));
  assert.equal(allResults().length, 1);
  assert.ok(allResults()[0].at > 0);
  const lessons = [{ id: 'l1', title: 'L1', questions: [{ id: 'q1', prompt: 'P1' }, { id: 'q2', prompt: 'P2' }] }];
  const added = addDemoResults([{ email: 'x', name: 'X', profile: { voiceAnswers: true } }], lessons, () => 0.9);
  assert.equal(added, 2);
  assert.ok(hasDemoResults());
  assert.ok(allResults().filter(e => e.demo).every(e => e.voiceUsed));
  clearDemoResults();
  assert.equal(allResults().length, 1);
  assert.ok(!hasDemoResults());
});
