import test from 'node:test';
import assert from 'node:assert/strict';
import { matchAnswer, questionSpeech } from './voice-answers.js';

const options = ['The wind blowing across the water', 'The sun warming the water', 'Plants releasing water through their leaves'];
const answer = (said, list = options) => matchAnswer(said, list);

test('letters, positions and filler words', () => {
  for (const [said, index] of [['B', 1], ['b.', 1], ['Bee', 1], ['Option C', 2], ['The answer is A.', 0], ['second', 1], ['number three', 2], ['Um, okay, C', 2], ['2', 1]]) {
    assert.deepEqual(answer(said), { action: 'answer', index }, said);
  }
  assert.equal(answer('D'), null, 'no fourth option');
});

test('isiZulu and Sepedi ways of choosing', () => {
  assert.deepEqual(answer('okwesibili'), { action: 'answer', index: 1 });
  assert.deepEqual(answer('Impendulo ngu-C'), { action: 'answer', index: 2 });
  assert.deepEqual(answer('ya pele'), { action: 'answer', index: 0 });
  assert.deepEqual(answer('Karabo ke B'), { action: 'answer', index: 1 });
});

test('saying the answer itself', () => {
  assert.deepEqual(answer('the sun warming it'), { action: 'answer', index: 1 });
  assert.deepEqual(answer('plants release water through leaves'), { action: 'answer', index: 2 });
  assert.equal(answer('water'), null, 'too vague: every option mentions water');
});

test('commands', () => {
  assert.deepEqual(answer('Repeat'), { action: 'repeat' });
  assert.deepEqual(answer('Can you say that again please'), { action: 'repeat' });
  assert.deepEqual(answer('phinda'), { action: 'repeat' });
  assert.deepEqual(answer('Help!'), { action: 'help' });
  assert.deepEqual(answer('Next question'), { action: 'next' });
  assert.deepEqual(answer('tšwela pele'), { action: 'next' });
  assert.equal(answer(''), null);
  assert.equal(answer('banana'), null);
});

test('questions are read with lettered options', () => {
  assert.deepEqual(questionSpeech('Why?', ['X', 'Y']), ['Why?', 'A: X', 'B: Y']);
});
