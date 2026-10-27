// Library views for the sample lessons: a subject's lesson list, and a textbook-style reader whose
// "Make practice questions" button sends the lesson to the real lesson generator.
import React from 'react';
import { SAMPLE_LESSONS, TEXTBOOK, allSampleLessons } from './sample-lessons.js';
import { useQuestionLanguage, LanguageSelect, ListenButton, TranslationNote } from './QuestionLanguage.jsx';
import { speechPieces } from './speech-pieces.js';
import TRANSLATIONS from './sample-lessons-translations.json';
import './lesson-library-views.css';

export const lessonCount = subject => SAMPLE_LESSONS[subject]?.length || 0;

// Lessons whose title, subject or text mention the search (empty search: none).
export function searchLessons(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return allSampleLessons().filter(lesson => `${lesson.title} ${lesson.subject}`.toLowerCase().includes(q) || lesson.text.toLowerCase().includes(q));
}

export function LessonList({ lessons, onOpen, showSubject = false }) {
  return <div className="lb-lesson-list">{lessons.map(lesson =>
    <button type="button" key={lesson.id} className="lb-lesson-card" onClick={() => onOpen(lesson)}>
      <span className="lb-lesson-meta">{showSubject ? `${lesson.subject} · ` : ''}Grade {lesson.grade} · Chapter {lesson.chapter}</span>
      <b>{lesson.title}</b>
      <span className="lb-lesson-excerpt">{lesson.text.split('\n')[0].slice(0, 150)}…</span>
    </button>)}
  </div>;
}

export function SubjectLessons({ subject, onOpen, onBack, onCreate, Btn }) {
  return <main className="dj-content lb-library-view">
    <button type="button" className="lb-back" onClick={onBack}>← All subjects</button>
    <h1>{subject}</h1>
    <p className="lb-library-source">{lessonCount(subject)} lessons · {TEXTBOOK}</p>
    <LessonList lessons={(SAMPLE_LESSONS[subject] || []).map(lesson => ({ ...lesson, subject }))} onOpen={onOpen} />
    <div className="lb-library-actions"><Btn className="outline" onClick={onCreate}>✦ Create a new lesson</Btn></div>
  </main>;
}

export function LessonReader({ lesson, onBack, onPractice, Btn }) {
  const paragraphs = lesson.text.split('\n\n');
  // Title first, then each paragraph: translated together into isiZulu or Sepedi when chosen.
  const lang = useQuestionLanguage([lesson.title, ...paragraphs], TRANSLATIONS[lesson.id]);
  const [title, ...shown] = lang.texts;
  return <main className="dj-content lb-library-view lb-reader">
    <button type="button" className="lb-back" onClick={onBack}>← {lesson.subject}</button>
    <span className="lb-lesson-meta">{lesson.subject} · Grade {lesson.grade} · Chapter {lesson.chapter}</span>
    <h1>{title}</h1>
    <div className="lb-reader-tools"><LanguageSelect translating={lang.translating} /><ListenButton lines={speechPieces([title, ...shown])} language={lang.language} /></div>
    <TranslationNote translated={lang.translated} error={lang.error} />
    <article className={'lb-reader-page' + (lang.translating ? ' is-translating' : '')}>{shown.map((paragraph, i) => <p key={i}>{paragraph}</p>)}</article>
    <p className="lb-library-source">From the {TEXTBOOK}.</p>
    <div className="lb-library-actions"><Btn onClick={onPractice}>Make practice questions</Btn><Btn className="outline" onClick={onBack}>Back to {lesson.subject}</Btn></div>
  </main>;
}
