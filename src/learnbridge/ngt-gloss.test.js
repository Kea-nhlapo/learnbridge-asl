import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildGlossIndex, dutchCandidates, dutchToGlosses } from './ngt-gloss.js';

const index = buildGlossIndex(JSON.parse(readFileSync(new URL('../../public/nia/ngt-glosses.json', import.meta.url))).files);
const signs = text => dutchToGlosses(text, index).map(g => g.file ? g.file.replace(/\.(sigml|bml)$/, '') : `(${g.word})`).join(' ');

test('index prefers the plain sign over variants', () => {
  assert.equal(index.get('water'), 'WATER.sigml');
  assert.equal(index.get('informatie'), 'INFORMATIE.sigml');
});
test('Dutch word forms find their dictionary sign', () => {
  for (const [word, form] of [['wolken', 'wolk'], ['valt', 'vallen'], ['regent', 'regenen'], ['grote', 'groot'], ['leeft', 'leven'], ['vormt', 'vorm'], ['planten', 'plant']]) assert.ok(dutchCandidates(word).includes(form), `${word} -> ${form}`);
});
test('sentences become signs in order; small words are skipped, unknown words are reported', () => {
  assert.equal(signs('Wanneer de druppels zwaar genoeg worden, valt het water als regen uit de wolken.'), 'WANNEER DRUPPELS ZWAAR (genoeg) VALLEN WATER REGEN (uit) WOLKEN');
  assert.equal(signs('Planten hebben water nodig om te groeien.'), 'PLANT WATER NODIG GROEIEN');
  assert.equal(signs('Het koelt af.'), '(koelt)');
});
