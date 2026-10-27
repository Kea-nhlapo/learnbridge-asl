// Live mode for the demo journey: a real PDF goes to the lesson backend (server/lesson-jobs.mjs), the
// generating screens follow the real job, and the learner answers the generated questions. A wrong answer
// opens the explanation with Nia signing it. Without an upload, the storyboard screens are unchanged.
import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createLessonApi } from '../lesson-integration/api.js';
import { useQuestionLanguage, LanguageSelect, ListenButton, TranslationNote } from './QuestionLanguage.jsx';
import { NiaSigner } from './NiaSign.jsx';
import './live-lesson.css';

const api = createLessonApi();
let live = { fileName: '', job: null, lesson: null, error: '', results: [] };
const listeners = new Set();
const update = fields => { live = { ...live, ...fields }; listeners.forEach(l => l()); };
const useLive = () => useSyncExternalStore(l => { listeners.add(l); return () => listeners.delete(l); }, () => live);

export const liveLesson = () => live.lesson;
// The journey's 1.2 s auto-advance must wait while a real job is running.
export const liveJobRunning = () => !!live.job && !['ready', 'failed'].includes(live.job.status);

export function LiveUpload({ next, ui: { AppShell, Btn, Ic } }) {
  const state = useLive();
  const input = useRef(null);
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const choose = f => { if (!f) return; if (f.type !== 'application/pdf' && !/\.pdf$/i.test(f.name)) { update({ error: 'Choose a PDF file.' }); return; } update({ error: '' }); setFile(f); };
  const start = async () => {
    if (!file) { input.current?.click(); return; }
    try {
      update({ fileName: file.name, lesson: null, results: [], error: '', job: await api.uploadPdf(file, { title: '' }) });
      next();
    } catch (error) { update({ error: error.message }); }
  };
  return <AppShell active="Create"><main className="dj-content narrow"><h1>Upload your curriculum document</h1><p>Upload a CAPS document, past paper or any curriculum guide (PDF).</p>
    <section className={'dj-upload lb-dropzone' + (dragging ? ' dragging' : '')} onClick={() => input.current?.click()} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); choose(e.dataTransfer.files[0]); }}>
      <Ic>⇧</Ic><b>Drag and drop your PDF here</b><span>or</span><Btn className="outline" type="button">Choose a file</Btn>
      <input ref={input} type="file" accept="application/pdf,.pdf" hidden onChange={e => choose(e.target.files[0])} />
    </section>
    {state.error ? <div className="dj-upload-error"><b>We could not use that file.</b><span>{state.error}</span></div>
      : file && <div className="dj-file"><Ic>PDF</Ic><div><b>{file.name}</b><span>{(file.size / 1e6).toFixed(1)} MB</span></div><strong>✓</strong></div>}
    <Btn className="next" onClick={start}>{file ? 'Continue' : 'Choose a PDF'}</Btn></main></AppShell>;
}

const STEPS = [['extracting', 'Reading your document...'], ['generating_questions', 'Writing practice questions from it...'], ['ready', 'Checking every question against the document...']];
export function LiveGenerating({ setId, ui: { Brand, Ic } }) {
  const state = useLive();
  useEffect(() => {
    if (!state.job || ['ready', 'failed'].includes(state.job.status)) return;
    let stopped = false;
    const poll = async () => {
      try {
        const job = await api.getJob(state.job.id);
        if (stopped) return;
        if (job.status === 'ready') { update({ job, lesson: await api.getLesson(job.lessonId) }); setId('review-loading'); return; }
        update({ job, ...(job.status === 'failed' ? { error: job.error || 'The lesson could not be prepared.' } : {}) });
        if (job.status !== 'failed') setTimeout(poll, 1000);
      } catch (error) { if (!stopped) update({ job: { ...state.job, status: 'failed' }, error: error.message }); }
    };
    const timer = setTimeout(poll, 800);
    return () => { stopped = true; clearTimeout(timer); };
  }, [state.job?.id]);
  const status = state.job?.status || 'extracting';
  const at = Math.max(0, STEPS.findIndex(([s]) => s === status));
  if (status === 'failed') return <div className="dj-generating"><Brand /><Ic>!</Ic><h1>We could not prepare this lesson</h1><p>{state.error}</p><button type="button" className="dj-btn" onClick={() => setId('upload')}>Try another PDF</button></div>;
  return <div className="dj-generating"><Brand /><Ic>▣</Ic><h1>{at ? 'Generating your questions...' : 'Generating your lesson...'}</h1><p>Using <b>{state.fileName}</b> to shape the lesson.</p>
    <div className="dj-progress"><span style={{ width: `${[30, 70, 100][at]}%` }} /></div>
    {STEPS.map(([s, label], i) => <div className="dj-gen" key={s}><i className={i < at ? 'done' : ''}>{i < at ? '✓' : '○'}</i>{label}</div>)}</div>;
}

export function LiveReview({ next, ui: { AppShell, Btn, Ic } }) {
  const { lesson, fileName } = useLive();
  return <AppShell active="Lesson Plans"><main className="dj-content review"><div className="dj-reviewhead"><h1>Review your lesson plan</h1><p>Check the questions before assigning them.</p></div>
    <div className="dj-reviewbody"><nav>{['Overview', `Questions (${lesson.questions.length})`, 'Save'].map((x, i) => <div className={!i ? 'on' : ''} key={x} onClick={x === 'Save' ? next : undefined}>{x}</div>)}</nav>
      <section><div className="dj-lessontitle"><Ic>♟</Ic><div><h2>{lesson.title}</h2><p>Generated from {fileName}</p></div></div>
        <h3>Questions</h3><ol className="lb-review-questions">{lesson.questions.map(q => <li key={q.id}><b>{q.prompt}</b><span>Answer: {q.options.find(o => o.id === q.correctOptionId).label}{q.sourceRefs?.[0]?.page ? ` · page ${q.sourceRefs[0].page}` : ''}</span></li>)}</ol>
        <Btn className="next" onClick={next}>Save and assign</Btn></section></div></main></AppShell>;
}

export function LiveQuiz({ setId, ui: { Btn } }) {
  const { lesson } = useLive();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [helpOpen, setHelpOpen] = useState(false);
  const q = lesson.questions[index];
  const lang = useQuestionLanguage([q.prompt, ...q.options.map(o => o.label), q.explanation]);
  const tPrompt = lang.texts[0], tOptions = lang.texts.slice(1, -1), tExplanation = lang.texts.at(-1);
  const check = () => { if (!selected) return; setAttempts(a => a + 1); setResult(selected === q.correctOptionId ? 'correct' : 'incorrect'); };
  const tryAgain = () => { setResult(null); setSelected(null); setHelpOpen(false); };
  const next = () => {
    const results = [...live.results, { id: q.id, firstTry: attempts === 1 }];
    update({ results });
    if (index + 1 === lesson.questions.length) { setId('celebration'); return; }
    setIndex(index + 1); setSelected(null); setResult(null); setAttempts(0); setHelpOpen(false);
  };
  const page = q.sourceRefs?.[0]?.page;
  return <div className={'dj-question lb-live-question ' + (result || '')}>
    <header><button type="button" onClick={() => setId('path')}>×</button><div className="dj-qbar"><span style={{ width: `${(index + 1) / lesson.questions.length * 100}%` }} /></div><b>Question {index + 1} of {lesson.questions.length}</b><LanguageSelect translating={lang.translating} /></header>
    <main><small>{lesson.title}{page ? ` · page ${page}` : ''}</small><h1>{tPrompt}</h1><ListenButton lines={[tPrompt, ...tOptions]} language={lang.language} /><TranslationNote translated={lang.translated} error={lang.error} />
      <div className="dj-options">{q.options.map((o, i) => {
        const cls = result === 'correct' && o.id === q.correctOptionId ? 'right' : result === 'incorrect' && o.id === selected ? 'wrong' : selected === o.id ? 'selected' : '';
        return <button type="button" key={o.id} className={cls} disabled={!!result} onClick={() => setSelected(o.id)}>{tOptions[i]}{cls === 'right' && <i>✓</i>}{cls === 'wrong' && <i>×</i>}</button>;
      })}</div></main>
    {!result && <footer><span /><span /><Btn disabled={!selected} onClick={check}>Check</Btn></footer>}
    {result === 'correct' && <section className="dj-feedback"><i>✓</i><div><h2>Correct!</h2><p>{tExplanation}</p></div><Btn onClick={next}>Continue</Btn></section>}
    {result === 'incorrect' && <section className="dj-feedback bad"><i>×</i><div><h2>Not quite</h2><p>Watch the explanation, then try again.</p></div><Btn className="outline" onClick={() => setHelpOpen(true)}>✋ Watch signed explanation</Btn><Btn onClick={tryAgain}>Try again</Btn></section>}
    {helpOpen && <div className="lb-help-overlay" role="dialog" aria-label="Signed explanation"><aside>
      <button type="button" className="dj-close" aria-label="Close" onClick={() => setHelpOpen(false)}>×</button>
      <h1>Why this is the answer</h1>
      <NiaSigner text={q.explanation} language="en" autoSign />
      <h3>Explanation</h3><p>{tExplanation}</p>
      <Btn onClick={tryAgain}>Try again</Btn>
    </aside></div>}
  </div>;
}

export function LiveCelebration({ setId, ui: { Brand, Btn, Ic } }) {
  const { lesson, results } = useLive();
  const firstTry = results.filter(r => r.firstTry).length;
  return <div className="dj-celebrate"><header><Brand /><span><b className="dj-avatar">L</b> Learner</span></header><main><div className="dj-confetti">◆　▪　◆　▪　◆</div><div className="dj-medal"><img src="/assets/demo/completion-medal.png" alt="Gold achievement medal" /></div>
    <h1>Lesson complete!</h1><p>Great work! You've completed <b>{lesson.title}.</b></p>
    <div className="dj-awards"><article><Ic>☆</Ic><b>+{firstTry * 13}</b><span>XP earned</span></article><article><Ic>◎</Ic><b>{firstTry}/{lesson.questions.length}</b><span>Right first time</span></article><article><Ic>🏆</Ic><b>1</b><span>New badge</span></article></div>
    <div><Btn className="outline" onClick={() => { update({ results: [] }); setId('path'); }}>Back to path</Btn><Btn onClick={() => setId('upload')}>Make another lesson</Btn></div></main></div>;
}
