// Turns what a learner said into a quiz action: an answer (by letter, by position or by its words), or a
// command (repeat, help, next). Works for English, isiZulu and Sepedi.

export const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

const COMMANDS = {
  repeat: ['repeat', 'again', 'say again', 'say that again', 'pardon', 'what', 'phinda', 'phinda futhi', 'futhi', 'boeletša', 'boeletsa', 'gape'],
  help: ['help', 'explain', 'explanation', 'hint', 'i do not know', "i don't know", 'usizo', 'ngisize', 'chaza', 'thušo', 'thuso', 'nthuše', 'nthuse', 'hlalosa'],
  next: ['next', 'continue', 'next question', 'go on', 'okulandelayo', 'qhubeka', 'latelago', 'tšwela pele', 'tswela pele', 'tšwelapele'],
};

// Ways of saying the n-th option (index 0 = A).
const POSITIONS = [
  ['a', 'ay', 'eh', 'hey', 'first', 'one', '1', 'number one', 'okokuqala', 'kuqala', 'ya pele', 'sa pele', 'pele'],
  ['b', 'bee', 'be', 'second', 'two', '2', 'number two', 'okwesibili', 'kubili', 'ya bobedi', 'sa bobedi', 'bobedi', 'pedi'],
  ['c', 'see', 'sea', 'si', 'third', 'three', '3', 'number three', 'okwesithathu', 'kuthathu', 'ya boraro', 'sa boraro', 'boraro', 'tharo'],
  ['d', 'dee', 'fourth', 'four', '4', 'number four', 'okwesine', 'kune', 'ya bone', 'sa bone', 'bone', 'nne'],
  ['e', 'fifth', 'five', '5', 'okwesihlanu', 'ya bohlano', 'bohlano'],
  ['f', 'sixth', 'six', '6', 'okwesithupha', 'ya botshelela'],
];
// Words that may come before the answer: "option B", "the answer is C", "impendulo ngu-A".
const FILLER = /^(?:(?:um+|uh+|er+|ok(?:ay)?|i think|i say|it is|it's|its|the answer is|answer|my answer is|option|letter|number|choice|impendulo (?:ngu|ithi)|ngu|karabo ke|ke)\b\s*-?\s*)+/;

const normalise = text => String(text || '').toLowerCase().normalize('NFKC')
  .replace(/[“”"'’.,!?;:()]/g, ' ').replace(/\s+/g, ' ').trim();
const words = text => normalise(text).split(' ').filter(w => w.length > 2);

// options: the option texts as shown (translated or not). Returns { action, index? } or null.
export function matchAnswer(spoken, options) {
  const said = normalise(spoken);
  if (!said) return null;
  for (const [action, phrases] of Object.entries(COMMANDS)) if (phrases.includes(said)) return { action };
  const core = said.replace(FILLER, '').trim();
  const position = POSITIONS.slice(0, options.length).findIndex(ways => ways.includes(core));
  if (position >= 0) return { action: 'answer', index: position };
  // A spoken letter at the start: "B because…", "b the sun".
  const lead = core.match(/^([a-f])\b/);
  if (lead && LETTERS.indexOf(lead[1].toUpperCase()) < options.length && core.length <= 3) return { action: 'answer', index: LETTERS.indexOf(lead[1].toUpperCase()) };
  // The option's own words: the best clear overlap wins.
  const heard = new Set(words(core));
  const scores = options.map(option => { const own = words(option); return own.length ? own.filter(w => heard.has(w)).length / own.length : 0; });
  const best = Math.max(...scores);
  if (best >= 0.5 && scores.filter(score => score === best).length === 1) return { action: 'answer', index: scores.indexOf(best) };
  for (const [action, phrases] of Object.entries(COMMANDS)) if (phrases.some(phrase => phrase.includes(' ') && said.includes(phrase))) return { action };
  return null;
}

// What is read aloud for a question: the prompt, then each option with its letter.
export const questionSpeech = (prompt, options) => [prompt, ...options.map((option, i) => `${LETTERS[i]}: ${option}`)];
