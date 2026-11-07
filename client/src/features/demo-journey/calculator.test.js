import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateExpression } from './calculator.js';

test('evaluates the calculator operations exposed by the keypad', () => {
  assert.equal(evaluateExpression('2+3×4'), '14');
  assert.equal(evaluateExpression('(2+3)^2'), '25');
  assert.equal(evaluateExpression('√(81)'), '9');
  assert.equal(evaluateExpression('50%'), '0.5');
  assert.equal(evaluateExpression('π×2'), String(Number((Math.PI * 2).toPrecision(12))));
});

test('rejects invalid and non-finite expressions', () => {
  assert.throws(() => evaluateExpression('2+hello'));
  assert.throws(() => evaluateExpression('1÷0'));
});
