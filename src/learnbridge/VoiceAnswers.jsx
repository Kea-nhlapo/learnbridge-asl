// "Answer by voice" for the live quiz, so a learner who cannot see the screen can do a whole lesson by
// listening and speaking: the question and lettered options are read aloud, then the app listens. Speech
// is detected in the browser with Silero VAD (@ricky0123/vad-web, ISC; model MIT) and only the short spoken
// answer is sent to /api/transcribe.
import React, { useEffect, useRef, useState } from 'react';
import { speakLines, useQuestionLanguage } from './QuestionLanguage.jsx';
import { matchAnswer, questionSpeech, LETTERS } from './voice-answers.js';
import './voice-answers.css';

const STORAGE_KEY = 'sae-voice-answers';
const readOn = () => { try { return localStorage.getItem(STORAGE_KEY) === 'on'; } catch { return false; } };

let vadPromise = null;
let onSpeech = null; // the current listener: one quiz screen at a time
function loadVad() {
  vadPromise ??= import('@ricky0123/vad-web').then(({ MicVAD, utils }) => MicVAD.new({
    baseAssetPath: '/vendor/vad/', onnxWASMBasePath: '/vendor/signchat/ort/', model: 'legacy', startOnLoad: false,
    minSpeechMs: 120, redemptionMs: 700, preSpeechPadMs: 250,
    onSpeechEnd: audio => onSpeech?.(utils.encodeWAV(audio)),
  }));
  vadPromise.catch(() => { vadPromise = null; });
  return vadPromise;
}

// question: { number, total, prompt, options, explanation } (already translated); result: null | 'correct' | 'incorrect'.
export function VoiceAnswers({ question, result, language, onAnswer, onNext, onTryAgain }) {
  const [on, setOn] = useState(readOn);
  const [status, setStatus] = useState('');
  const [heard, setHeard] = useState('');
  const letters = LETTERS.slice(0, question.options.length);
  const choices = `${letters.slice(0, -1).join(', ')} or ${letters.at(-1)}`;
  const phrases = useQuestionLanguage([
    `Question ${question.number} of ${question.total}.`, `Say ${choices}. Say repeat to hear it again.`,
    'Correct!', 'Say next to continue.', 'Not quite.', 'Try again.', 'Sorry, I did not catch that.', 'The page has a picture:',
  ]);
  const [intro, instructions, correct, sayNext, notQuite, tryAgain, sorry, picture] = phrases.texts;
  // The question read aloud, with the page's picture described after the prompt.
  const questionLines = () => { const [prompt, ...options] = questionSpeech(question.prompt, question.options); return [prompt, ...(question.figure ? [`${picture} ${question.figure}`] : []), ...options]; };
  const actions = useRef({}); actions.current = { onAnswer, onNext, onTryAgain };
  const toggle = () => { const next = !on; setOn(next); try { localStorage.setItem(STORAGE_KEY, next ? 'on' : 'off'); } catch {} };

  const key = [on, question.number, result, language, phrases.translating, question.prompt, question.figure, ...question.options].join('\u0001');
  useEffect(() => {
    if (!on || phrases.translating) { setStatus(''); return; }
    const controller = new AbortController(); const { signal } = controller;
    let vad = null;
    // If the voice cannot be played, carry on listening: the words are still on screen.
    const say = async lines => {
      await vad?.pause(); setStatus('Speaking…');
      try { await speakLines(lines, language, signal); } catch (error) { if (!signal.aborted) { setStatus(error.message); await new Promise(r => setTimeout(r, 1500)); } }
    };
    const listen = () => new Promise(resolve => {
      setStatus(result === 'correct' ? 'Listening… say “next”.' : `Listening… say ${choices}.`);
      onSpeech = async wav => {
        onSpeech = null; await vad.pause(); setStatus('Working out what you said…');
        try {
          const response = await fetch(`/api/transcribe?lang=${language}&quick=1`, { method: 'POST', headers: { 'Content-Type': 'audio/wav' }, body: wav, signal });
          const data = await response.json();
          if (!response.ok) throw Error(data.error || 'The voice service is busy.');
          resolve(data.text || '');
        } catch (error) { if (!signal.aborted) setStatus(error.message); resolve(''); }
      };
      signal.addEventListener('abort', () => { onSpeech = null; resolve(null); }, { once: true });
      vad.start();
    });

    (async () => {
      setStatus('Starting the microphone…');
      vad = await loadVad();
      if (signal.aborted) return;
      const options = question.options;
      let lines = result === 'correct' ? [correct, question.explanation, sayNext]
        : result === 'incorrect' ? [notQuite, question.explanation, tryAgain]
        : [intro, ...questionLines(), instructions];
      while (!signal.aborted) {
        await say(lines);
        if (signal.aborted) return;
        if (result === 'incorrect') { actions.current.onTryAgain(); return; }
        const said = await listen();
        if (said === null || signal.aborted) return;
        setHeard(said);
        const match = matchAnswer(said, options);
        if (!result && match?.action === 'answer') { actions.current.onAnswer(match.index); return; }
        if (result === 'correct' && match?.action === 'next') { actions.current.onNext(); return; }
        lines = match?.action === 'repeat' || match?.action === 'help'
          ? (result === 'correct' ? [question.explanation, sayNext] : [...questionLines(), instructions])
          : [sorry, result === 'correct' ? sayNext : instructions];
      }
    })().catch(error => { if (!signal.aborted) setStatus(/Permission|NotAllowed/i.test(error?.name + error?.message) ? 'Allow the microphone to answer by voice.' : `Voice answers could not start: ${error.message}`); });
    return () => { controller.abort(); vad?.pause(); window.speechSynthesis?.cancel(); };
  }, [key]);
  useEffect(() => () => { onSpeech = null; vadPromise?.then(vad => vad.pause()).catch(() => {}); }, []);

  return <div className="lb-voice">
    <button type="button" className="lb-listen lb-voice-toggle" aria-pressed={on} onClick={toggle}>{on ? '🎙 Voice answers on' : '🎙 Answer by voice'}</button>
    {on && <p className="lb-voice-status" role="status" aria-live="polite">{status}{heard && status.startsWith('Listening') ? ` (Heard: “${heard}”)` : ''}</p>}
  </div>;
}
