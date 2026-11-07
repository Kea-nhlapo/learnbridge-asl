import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyLetter, classifyPrototype, handFeatures, nameLetters, nextExpectedLetter, readyToSpellName } from './fingerspelling.js';

test('name calibration accepts static ASL letters and rejects motion letters', () => {
  assert.deepEqual(nameLetters('Tshego'), ['T', 'S', 'H', 'E', 'G', 'O']);
  assert.equal(nameLetters('Jade'), null);
  assert.equal(nameLetters('Zoe'), null);
  assert.equal(nextExpectedLetter('Tshego', 'TSH'), 'E');
  assert.equal(nextExpectedLetter('Tshego', 'TSHEGO'), null);
});

test('personal classifier rejects ambiguous hands', () => {
  const a = Array(63).fill(0);
  const b = Array(63).fill(1);
  assert.equal(classifyLetter(a, { A: [a], B: [b] }).letter, 'A');
  assert.equal(classifyLetter(Array(63).fill(0.5), { A: [a], B: [b] }), null);
});

test('T and S require a wider separation before committing', () => {
  const t = Array(63).fill(0);
  const s = Array(63).fill(0.1);
  assert.equal(classifyLetter(Array(63).fill(0.045), { T: [t], S: [s] }), null);
});

test('personal sign prototypes classify a calibrated greeting', () => {
  const hello = Array(63).fill(0.15);
  const mine = Array(63).fill(-0.15);
  assert.equal(classifyPrototype(hello, { HELLO: [hello], MINEMY: [mine] }).label, 'HELLO');
  assert.equal(classifyPrototype(Array(63).fill(0.8), { HELLO: [hello], MINEMY: [mine] }), null);
});

test('hand features are independent of camera position and scale', () => {
  const make = (offset, scale) => ({ landmarks: Array.from({ length: 21 }, (_, i) => ({ x: offset + i * .002 * scale, y: offset + i * .003 * scale, z: i * .001 * scale })) });
  const first = handFeatures(make(.1, 1));
  const second = handFeatures(make(.3, 2));
  assert.ok(first && second);
  for (let i = 0; i < first.length; i++) assert.ok(Math.abs(first[i] - second[i]) < .0001);
});

test('name spelling begins after HELLO then MY in one capture', () => {
  assert.equal(readyToSpellName([{ label: 'hello' }]), false);
  assert.equal(readyToSpellName([{ label: 'minemy' }, { label: 'hello' }]), false);
  assert.equal(readyToSpellName([{ label: 'hello' }, { label: 'minemy' }]), true);
});
