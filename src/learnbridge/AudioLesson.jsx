// Audio lesson player for the reader: plays the lesson part by part (title, then each paragraph), with
// previous/next to skip, and a download of the whole lesson as one MP3 for listening offline.
import React, { useEffect, useRef, useState } from 'react';
import { speechFor, deviceVoice } from './QuestionLanguage.jsx';
import { speechPieces } from './speech-pieces.js';
import { AUDIO_RATE, joinParts, encodeMp3, audioFileName } from './audio-lesson.js';
import './audio-lesson.css';

// The free voice service allows only a few requests a minute: when it is busy, wait and try again.
async function voice(text, language, signal, onWait = () => {}) {
  for (let attempt = 0; ; attempt++) {
    try { return await speechFor(text, language, signal); }
    catch (problem) {
      if (signal?.aborted || attempt >= 4 || !/busy|allowance|unavailable/i.test(problem.message)) throw problem;
      onWait(); await new Promise(resolve => setTimeout(resolve, 8000 * (attempt + 1)));
    }
  }
}

const Icon = ({ d }) => <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="currentColor"><path d={d} /></svg>;
const ICONS = { previous: 'M6 5h2v14H6zM20 5v14L9 12z', next: 'M16 5h2v14h-2zM4 5v14l11-7z', play: 'M8 5v14l11-7z', pause: 'M7 5h4v14H7zM13 5h4v14h-4z' };

// parts: the lesson's text in reading order (title first). onPart: called with the part being read (or -1).
export function AudioLesson({ parts, language, title, onPart = () => {} }) {
  const [current, setCurrent] = useState(0);
  const [state, setState] = useState('idle'); // idle | loading | playing | paused
  const [error, setError] = useState('');
  const [download, setDownload] = useState({ busy: false, progress: '', url: '', name: '' });
  const audio = useRef(null);
  const run = useRef(null);
  const key = `${language}\u0000${parts.join('\u0001')}`;

  const usingDevice = useRef(false);
  const stop = () => { run.current?.abort(); run.current = null; audio.current?.pause(); window.speechSynthesis?.cancel(); setState('idle'); onPart(-1); };
  useEffect(() => { stop(); setCurrent(0); setDownload(d => { if (d.url) URL.revokeObjectURL(d.url); return { busy: false, progress: '', url: '', name: '' }; }); }, [key]);
  useEffect(() => () => { run.current?.abort(); audio.current?.pause(); window.speechSynthesis?.cancel(); }, []);

  // Plays from part `from` to the end. The device's own voice is used when it has one for the language
  // (free and instant); otherwise the voice service, fetching the next piece while one plays.
  const playFrom = async from => {
    run.current?.abort(); audio.current?.pause(); window.speechSynthesis?.cancel();
    const controller = new AbortController(); run.current = controller; const { signal } = controller;
    setError('');
    const device = deviceVoice(language);
    usingDevice.current = !!device;
    try {
      for (let part = from; part < parts.length && !signal.aborted; part++) {
        setCurrent(part); onPart(part);
        if (device) {
          setState('playing');
          await new Promise(resolve => {
            const utterance = new SpeechSynthesisUtterance(parts[part]);
            utterance.voice = device; utterance.lang = device.lang;
            utterance.onend = utterance.onerror = resolve;
            signal.addEventListener('abort', resolve, { once: true });
            speechSynthesis.speak(utterance);
          });
          continue;
        }
        setState('loading');
        const pieces = speechPieces([parts[part]]);
        let upcoming = voice(pieces[0], language, signal);
        for (let i = 0; i < pieces.length && !signal.aborted; i++) {
          const blob = await upcoming;
          if (i + 1 < pieces.length) { upcoming = voice(pieces[i + 1], language, signal); upcoming.catch(() => {}); }
          else if (part + 1 < parts.length) voice(speechPieces([parts[part + 1]])[0], language, signal).catch(() => {});
          if (signal.aborted) return;
          const url = URL.createObjectURL(blob);
          audio.current.src = url;
          setState('playing');
          await new Promise(resolve => {
            audio.current.onended = audio.current.onerror = resolve;
            signal.addEventListener('abort', resolve, { once: true });
            audio.current.play().catch(resolve);
          });
          URL.revokeObjectURL(url);
        }
      }
      if (!signal.aborted) { setState('idle'); setCurrent(0); onPart(-1); }
    } catch (problem) {
      if (!signal.aborted) { setError(problem.message); setState('idle'); onPart(-1); }
    }
  };
  const playPause = () => {
    if (state === 'playing') { if (usingDevice.current) speechSynthesis.pause(); else audio.current.pause(); setState('paused'); }
    else if (state === 'paused') { if (usingDevice.current) speechSynthesis.resume(); else audio.current.play().catch(() => {}); setState('playing'); }
    else if (state === 'idle') playFrom(current);
  };
  const skip = step => { const part = Math.max(0, Math.min(parts.length - 1, current + step)); if (state === 'idle') { setCurrent(part); onPart(part); } else playFrom(part); };

  const makeDownload = async () => {
    setDownload({ busy: true, progress: 'Preparing audio…', url: '', name: '' }); setError('');
    try {
      const decoder = new OfflineAudioContext(1, 1, AUDIO_RATE);
      const pieces = parts.map(part => speechPieces([part]));
      const total = pieces.flat().length; let done = 0;
      const partAudio = [];
      for (const partPieces of pieces) {
        const samples = [];
        for (const piece of partPieces) {
          const decoded = await decoder.decodeAudioData(await (await voice(piece, language, null, () => setDownload(d => ({ ...d, progress: `The voice service is busy; waiting, then part ${done + 1} of ${total}…` })))).arrayBuffer());
          samples.push(decoded.getChannelData(0));
          setDownload(d => ({ ...d, progress: `Preparing audio: part ${++done} of ${total}…` }));
        }
        partAudio.push(joinParts(samples, AUDIO_RATE, 0.15));
      }
      setDownload(d => ({ ...d, progress: 'Making the MP3 file…' }));
      const chunks = await encodeMp3(joinParts(partAudio));
      const blob = new Blob(chunks, { type: 'audio/mpeg' });
      setDownload({ busy: false, progress: `Ready: ${(blob.size / 1024 / 1024).toFixed(1)} MB`, url: URL.createObjectURL(blob), name: audioFileName(title) });
    } catch (problem) {
      setDownload({ busy: false, progress: '', url: '', name: '' }); setError(`The audio could not be prepared: ${problem.message}`);
    }
  };

  const label = current === 0 ? 'Title' : `Part ${current} of ${parts.length - 1}`;
  return <section className="lb-audio" aria-label="Audio lesson">
    <audio ref={audio} preload="none" />
    <div className="lb-audio-controls">
      <button type="button" onClick={() => skip(-1)} disabled={current === 0} aria-label="Previous part"><Icon d={ICONS.previous} /></button>
      <button type="button" className="lb-audio-play" onClick={playPause} aria-label={state === 'playing' ? 'Pause' : 'Play the lesson'}><Icon d={state === 'playing' ? ICONS.pause : ICONS.play} /></button>
      <button type="button" onClick={() => skip(1)} disabled={current >= parts.length - 1} aria-label="Next part"><Icon d={ICONS.next} /></button>
      <span className="lb-audio-where" aria-live="polite">{state === 'loading' ? 'Preparing voice…' : `🎧 ${label}`}</span>
      {state !== 'idle' && <button type="button" className="lb-audio-stop" onClick={stop}>Stop</button>}
    </div>
    <div className="lb-audio-download">
      {download.url
        ? <a className="lb-audio-save" href={download.url} download={download.name}>⬇ Save audio ({download.name})</a>
        : <button type="button" onClick={makeDownload} disabled={download.busy}>⬇ Download for offline listening</button>}
      {download.progress && <span role="status">{download.progress}</span>}
    </div>
    {error && <p className="lb-translation-note error" role="alert">{error}</p>}
  </section>;
}
