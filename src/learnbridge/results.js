// Learner results for the teacher dashboard: one entry per answered question. Kept in this browser for now
// (there is no account server yet), so a teacher sees results from learners who used this device.

const KEY = 'sae-results';
const MAX = 3000;
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
const write = list => { try { localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX))); } catch {} };

// entry: { learner, learnerName, lessonId, lessonTitle, caps, questionId, prompt, firstTry, attempts, helpUsed, voiceUsed, pictureUsed }
export function recordResult(entry) { write([...read(), { ...entry, at: entry.at ?? Date.now() }]); }
export const allResults = () => read();
export const clearDemoResults = () => write(read().filter(r => !r.demo));
export const hasDemoResults = () => read().some(r => r.demo);

const percent = (part, whole) => whole ? Math.round(part / whole * 100) : 0;

// Totals per learner, per question and per lesson. learners: [{ email, name, profile }].
export function summarise(results, learners = []) {
  const byLearner = new Map(learners.map(l => [l.email, { email: l.email, name: l.name, profile: l.profile, answered: 0, firstTry: 0, help: 0, voice: 0, lessons: new Set(), last: 0 }]));
  const byQuestion = new Map();
  const byLesson = new Map();
  for (const r of results) {
    if (!byLearner.has(r.learner)) byLearner.set(r.learner, { email: r.learner, name: r.learnerName || r.learner, profile: null, answered: 0, firstTry: 0, help: 0, voice: 0, lessons: new Set(), last: 0 });
    const l = byLearner.get(r.learner);
    l.answered++; l.firstTry += r.firstTry ? 1 : 0; l.help += r.helpUsed ? 1 : 0; l.voice += r.voiceUsed ? 1 : 0; l.lessons.add(r.lessonId); l.last = Math.max(l.last, r.at || 0);
    const qKey = `${r.lessonId}\u0000${r.questionId}`;
    if (!byQuestion.has(qKey)) byQuestion.set(qKey, { lessonTitle: r.lessonTitle, prompt: r.prompt, answered: 0, firstTry: 0, help: 0, wrongTries: 0, learners: new Set() });
    const q = byQuestion.get(qKey);
    q.answered++; q.firstTry += r.firstTry ? 1 : 0; q.help += r.helpUsed ? 1 : 0; q.wrongTries += Math.max(0, (r.attempts || 1) - 1); q.learners.add(r.learner);
    if (!byLesson.has(r.lessonId)) byLesson.set(r.lessonId, { id: r.lessonId, title: r.lessonTitle, caps: r.caps || null, answered: 0, firstTry: 0, learners: new Set() });
    const lesson = byLesson.get(r.lessonId);
    lesson.answered++; lesson.firstTry += r.firstTry ? 1 : 0; lesson.learners.add(r.learner);
  }
  const learnerRows = [...byLearner.values()].map(l => ({ ...l, lessons: l.lessons.size, score: percent(l.firstTry, l.answered) }))
    .sort((a, b) => (b.answered > 0) - (a.answered > 0) || a.score - b.score || a.name.localeCompare(b.name));
  const questionRows = [...byQuestion.values()].map(q => ({ ...q, learners: q.learners.size, score: percent(q.firstTry, q.answered) }))
    .sort((a, b) => a.score - b.score || b.answered - a.answered);
  const lessonRows = [...byLesson.values()].map(l => ({ ...l, learners: l.learners.size, score: percent(l.firstTry, l.answered) }))
    .sort((a, b) => a.title.localeCompare(b.title));
  const answered = results.length;
  return {
    totals: { learners: learnerRows.filter(l => l.answered).length, lessons: lessonRows.length, answered, score: percent(results.filter(r => r.firstTry).length, answered), help: results.filter(r => r.helpUsed).length },
    learners: learnerRows, questions: questionRows, lessons: lessonRows,
  };
}

// Example results for showing the dashboard: clearly marked, and removable in one click.
export function addDemoResults(learners, lessons, random = Math.random) {
  const now = Date.now();
  const entries = [];
  learners.forEach((learner, li) => {
    lessons.slice(li % 3, li % 3 + 3).forEach((lesson, lessonIndex) => {
      lesson.questions.forEach((question, qi) => {
        const hard = qi === lesson.questions.length - 1;
        const firstTry = random() > (hard ? 0.65 : 0.25);
        const attempts = firstTry ? 1 : 2 + (random() > 0.6 ? 1 : 0);
        entries.push({
          demo: true, learner: learner.email, learnerName: learner.name, lessonId: lesson.id, lessonTitle: lesson.title, caps: lesson.caps || null,
          questionId: question.id, prompt: question.prompt, firstTry, attempts,
          helpUsed: !firstTry && (learner.profile?.signedHelp || random() > 0.5), voiceUsed: !!learner.profile?.voiceAnswers, pictureUsed: false,
          at: now - (li * 5 + lessonIndex * 2 + qi) * 3600_000,
        });
      });
    });
  });
  write([...read(), ...entries]);
  return entries.length;
}
