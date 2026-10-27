// Library views for the sample lessons: a subject's lesson list, and a textbook-style reader whose
// "Make practice questions" button sends the lesson to the real lesson generator.
import React from 'react';
import { SAMPLE_LESSONS, TEXTBOOK, allSampleLessons } from './sample-lessons.js';
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
  return <main className="dj-content lb-library-view lb-reader">
    <button type="button" className="lb-back" onClick={onBack}>← {lesson.subject}</button>
    <span className="lb-lesson-meta">{lesson.subject} · Grade {lesson.grade} · Chapter {lesson.chapter}</span>
    <h1>{lesson.title}</h1>
    <article className="lb-reader-page">{lesson.text.split('\n\n').map((paragraph, i) => <p key={i}>{paragraph}</p>)}</article>
    <p className="lb-library-source">From the {TEXTBOOK}.</p>
    <div className="lb-library-actions"><Btn onClick={onPractice}>Make practice questions</Btn><Btn className="outline" onClick={onBack}>Back to {lesson.subject}</Btn></div>
  </main>;
}
