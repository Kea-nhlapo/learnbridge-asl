import React, { useEffect, useRef, useState } from 'react';
import './vision-demo.css';

const options = [
  { id: 'uneven-refraction', label: 'Uneven refraction of light' },
  { id: 'too-little-light', label: 'Too little light entering the eye' },
  { id: 'retina-moves', label: 'The retina moves forward' },
];
const correctOptionId = 'uneven-refraction';
const explanation = 'Astigmatism can blur vision because the eye bends incoming light unevenly, so it does not focus at a single point.';

export default function VisionDemo() {
  const [selectedId, setSelectedId] = useState(null);
  const [result, setResult] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [help, setHelp] = useState(null);
  const [helpError, setHelpError] = useState(null);
  const [helpPlaybackUrl, setHelpPlaybackUrl] = useState(null);
  const [completed, setCompleted] = useState(false);
  const videoRef = useRef(null);
  const playbackPosition = useRef(0);
  const previousFocus = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    let active = true;
    fetch('/nia/question-27.json', { cache: 'no-store' }).then(response => {
      if (!response.ok) throw new Error('Help manifest could not be loaded');
      return response.json();
    }).then(data => { if (active) setHelp(data); }).catch(error => { if (active) setHelpError(error.message); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!help?.videoUrl) return;
    const controller = new AbortController();
    let objectUrl;
    fetch(help.videoUrl, { signal: controller.signal }).then(response => {
      if (!response.ok) throw new Error('Nia video could not be loaded');
      return response.blob();
    }).then(blob => {
      if (!blob.size) throw new Error('Nia video is empty');
      objectUrl = URL.createObjectURL(blob);
      setHelpPlaybackUrl(objectUrl);
    }).catch(error => { if (error.name !== 'AbortError') setHelpError(error.message); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [help]);

  useEffect(() => {
    if (drawerOpen) closeRef.current?.focus();
    else previousFocus.current?.focus();
  }, [drawerOpen]);
  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = event => { if (event.key === 'Escape') closeHelp(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen]);

  function select(id) {
    if (completed || result === 'correct') return;
    setSelectedId(id);
    setResult(null);
  }
  function check() {
    if (!selectedId || completed || result) return;
    setAttempts(value => value + 1);
    setResult(selectedId === correctOptionId ? 'correct' : 'incorrect');
  }
  function openHelp() {
    previousFocus.current = document.activeElement;
    setDrawerOpen(true);
  }
  function closeHelp() {
    if (videoRef.current) playbackPosition.current = videoRef.current.currentTime;
    videoRef.current?.pause();
    setDrawerOpen(false);
  }
  function reset() {
    closeHelp();
    setSelectedId(null);
    setResult(null);
    setAttempts(0);
    setCompleted(false);
  }

  return <div className="vision-shell">
    <main className="vision-main">
      <div className="vision-progress"><button type="button" className="vision-exit" aria-label="Exit lesson" onClick={() => { window.location.href = '/'; }}>×</button><div className="vision-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="4" aria-valuenow={completed ? 1 : 0} aria-label="Lesson progress"><span /></div><span className="vision-language">Language: English⌄</span></div>
      <section className={`vision-question ${result ? 'is-feedback' : ''}`} aria-labelledby="vision-question-title">
        {!result && <img className="vision-diagram" src="/assets/astigmatism-reference-4k.png" alt="Normal eye rays focus at one point; astigmatism rays focus at several points" />}
        <h1 id="vision-question-title">What causes blurred vision in astigmatism?</h1>
        <div className="vision-options" role="group" aria-label="Choose an answer">{options.map(option => <button key={option.id} type="button" className={`vision-option ${selectedId === option.id ? 'selected' : ''} ${selectedId === option.id && result ? result : ''}`} aria-pressed={selectedId === option.id} onClick={() => select(option.id)}><span>{option.label}</span>{selectedId === option.id && result && <span aria-hidden="true" className="vision-option-icon">{result === 'correct' ? '✓' : '×'}</span>}</button>)}</div>
      </section>
    </main>
    {result === 'incorrect' && <div className="vision-feedback incorrect" role="status"><div className="vision-feedback-symbol">×</div><div><strong>Not quite!</strong><p>Try another answer. You can open the explanation without losing this question.</p></div><button type="button" className="vision-feedback-action" onClick={openHelp}>{help?.status === 'ready' && help.reviewStatus === 'reviewed' ? 'Watch signed explanation' : help?.status === 'prototype' ? 'Watch Nia prototype' : 'Open explanation'}</button></div>}
    {result === 'correct' && <div className="vision-feedback correct" role="status"><div className="vision-feedback-symbol">✓</div><div><strong>Correct!</strong><p>{explanation}</p></div><button type="button" className="vision-feedback-action" onClick={() => setCompleted(true)}>Continue</button></div>}
    {!result && <footer className="vision-actions"><button type="button" className="vision-tool-button" aria-label="Calculator" title="Calculator coming later">▦</button><button type="button" className="vision-help-button" onClick={openHelp}>? <span>Help</span></button><span className="vision-attempts">{attempts ? `Attempts: ${attempts}` : ''}</span><button type="button" className="vision-check" disabled={!selectedId} onClick={check}>Check</button></footer>}
    {completed && <div className="vision-complete" role="dialog" aria-modal="true" aria-labelledby="vision-complete-title"><div><span className="vision-complete-icon">✓</span><h2 id="vision-complete-title">Question complete</h2><p>You can now continue to the next lesson question when it is connected.</p><button type="button" onClick={reset}>Try this question again</button></div></div>}
    {drawerOpen && <div className="vision-drawer-backdrop" onMouseDown={closeHelp}><aside className="vision-drawer" role="dialog" aria-modal="true" aria-labelledby="vision-drawer-title" onMouseDown={event => event.stopPropagation()}><div className="vision-drawer-heading"><div><p className="vision-kicker">QUESTION 1 · EXPLANATION</p><h2 id="vision-drawer-title">Why this is correct</h2></div><button type="button" ref={closeRef} onClick={closeHelp} aria-label="Close explanation">×</button></div><div className="vision-drawer-media">{helpPlaybackUrl ? <video ref={videoRef} src={helpPlaybackUrl} controls autoPlay preload="auto" playsInline onLoadedMetadata={event => { event.currentTarget.currentTime = playbackPosition.current; }} onTimeUpdate={event => { playbackPosition.current = event.currentTarget.currentTime; }} onError={() => setHelpError('Nia video could not be played')} aria-label={help.status === 'ready' ? `${help.language} signed explanation by Nia` : `Nia ${help.language} explanation prototype`} /> : <div className="vision-video-unavailable"><span aria-hidden="true">✋</span><strong>{help?.videoUrl && !helpError ? 'Loading Nia video…' : 'Signed explanation is being prepared'}</strong><p>{help?.videoUrl && !helpError ? 'The completed clip is being preloaded.' : 'Nia playback will appear here when the question-specific video has been reviewed and saved.'}</p></div>}</div>{help?.status === 'prototype' && <p className="vision-preview-notice">Full Nia {help.language} prototype with narration. The gloss sequence still needs review by a fluent signer.</p>}<div className="vision-drawer-copy"><span className="vision-copy-label">Text explanation</span><p>{explanation}</p>{help?.language && <small>{help.status === 'ready' ? 'Signing language' : 'Prototype signing language'}: {help.language}</small>}{helpError && <small role="alert">{helpError}</small>}</div><div className="vision-drawer-footer"><button type="button" onClick={closeHelp}>Back to question</button></div></aside></div>}
  </div>;
}
