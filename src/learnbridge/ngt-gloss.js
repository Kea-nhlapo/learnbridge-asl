// Dutch text -> NGT (Dutch Sign Language) glosses from Nia's Performs dictionary, word by word.
// This is a dictionary lookup, not a translation into NGT grammar: words without a sign are skipped and
// reported, and the order follows the Dutch sentence.

// Dutch words that are not signed on their own (articles, auxiliaries and similar).
const SKIP = new Set(['de', 'het', 'een', "'n", 'van', 'te', 'dat', 'die', 'dit', 'deze', 'is', 'zijn', 'was', 'waren', 'wordt', 'worden', 'werd', 'werden', 'er', 'om', 'aan', 'bij', 'als', 'en', 'of', 'ook', 'nog', 'dan', 'toch', 'heeft', 'hebben', 'had', 'zal', 'zullen', 'kan', 'kunnen', 'af', 'toe', 'mee']); // af/toe/mee: separable verb particles

// gloss file name -> base word, e.g. "INFORMATIE-DI{2_1}.sigml" -> "informatie", "OVER_EEN_WEEK-SQ" -> "over een week".
const baseOf = file => file.replace(/\.(sigml|bml)$/, '').split(/-(?:AM|DI|SQ)\b|\{/)[0].replace(/-$/, '').replace(/_/g, ' ').toLowerCase();

export function buildGlossIndex(files) {
  const index = new Map();
  for (const file of files) {
    const base = baseOf(file);
    if (!base) continue;
    const plain = file.replace(/\.(sigml|bml)$/, '').toLowerCase().replace(/_/g, ' ') === base;
    const current = index.get(base);
    // Prefer the plain entry (no modifiers), then the shortest name.
    if (!current || (plain && !current.plain) || (plain === current.plain && file.length < current.file.length)) index.set(base, { file, plain });
  }
  return new Map([...index].map(([base, { file }]) => [base, file]));
}

const VOWEL = /[aeiou]/;
const undoubleVowel = s => s.replace(/(aa|ee|oo|uu)([^aeiou]+)$/, (m, v, c) => v[0] + c);
const doubleVowel = s => s.replace(/([^aeiou])([aeou])([^aeiou])$/, (m, a, v, c) => a + v + v + c);
const voiced = s => s.replace(/f$/, 'v').replace(/s$/, 'z');

// Dictionary forms a Dutch word may come from (plurals, verb forms, past participles, adjective -e).
export function dutchCandidates(word) {
  const w = word.toLowerCase();
  const out = [w];
  const infinitives = stem => {
    const forms = [stem + 'en', stem + 'n'];
    if (/[^aeiou][aeiou][^aeiouwy]$/.test(stem)) forms.push(stem + stem.at(-1) + 'en'); // val -> vallen
    forms.push(undoubleVowel(stem) + 'en', voiced(undoubleVowel(stem)) + 'en', voiced(stem) + 'en'); // loop -> lopen, leef -> leven
    return forms;
  };
  if (w.endsWith('en') && w.length > 4) { const s = w.slice(0, -2); out.push(s, s.replace(/(.)\1$/, '$1'), doubleVowel(s), voiced(s)); }
  if (w.endsWith('s') && w.length > 3) out.push(w.slice(0, -1));
  if (w.endsWith('e') && w.length > 3) { const s = w.slice(0, -1); out.push(s, doubleVowel(s), s.replace(/v$/, 'f').replace(/z$/, 's')); }
  if (/[td]$/.test(w) && w.length > 3) out.push(w.slice(0, -1), ...infinitives(w.slice(0, -1)));
  if (w.startsWith('ge') && /[td]$/.test(w) && w.length > 5) { const s = w.slice(2, -1); out.push(...infinitives(s), s); }
  if (VOWEL.test(w) && !w.endsWith('en')) out.push(...infinitives(w).slice(0, 1));
  return [...new Set(out)];
}

// Returns [{ word, file }] in sentence order; file is null when there is no sign for the word.
export function dutchToGlosses(text, index) {
  const words = String(text).toLowerCase().match(/[\p{L}\p{N}']+/gu) || [];
  const result = [];
  for (let i = 0; i < words.length; i++) {
    // Try three- and two-word entries first (e.g. "over een week").
    const phrase = [3, 2].map(n => words.slice(i, i + n)).find(p => p.length > 1 && index.has(p.join(' ')));
    if (phrase) { result.push({ word: phrase.join(' '), file: index.get(phrase.join(' ')) }); i += phrase.length - 1; continue; }
    const word = words[i];
    if (SKIP.has(word)) continue;
    const match = dutchCandidates(word).find(candidate => index.has(candidate));
    result.push({ word, file: match ? index.get(match) : null });
  }
  return result;
}
