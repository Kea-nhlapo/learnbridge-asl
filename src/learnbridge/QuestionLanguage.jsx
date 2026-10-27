// Question-language support from LearnBridge: the "Language" control on question screens translates the
// question and answers (NLLB via /api/translate) and reads them aloud (/api/speak, or a device voice for
// English). Translations are machine output and are labelled as such.
import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import './question-language.css';

export const LANGUAGES = { en: 'English', zu: 'isiZulu', nso: 'Sepedi' };
const STORAGE_KEY = 'sae-question-language';

// One chosen language for every question screen, kept across screens and reloads.
let current = (() => { try { return LANGUAGES[localStorage.getItem(STORAGE_KEY)] ? localStorage.getItem(STORAGE_KEY) : 'en'; } catch { return 'en'; } })();
const listeners = new Set();
export function setQuestionLanguage(language) {
  current = language;
  try { localStorage.setItem(STORAGE_KEY, language); } catch {}
  listeners.forEach(listener => listener());
}
const useQuestionLanguageCode = () => useSyncExternalStore(listener => { listeners.add(listener); return () => listeners.delete(listener); }, () => current);

const translations = new Map();
// Labels such as "X", "Q3.1" or "2/4" stay as they are; translating them only garbles them.
const needsTranslation = text => /\p{L}{3,}/u.test(text);
async function translateAll(allTexts, to) {
  const indexes = allTexts.map((text, i) => needsTranslation(text) ? i : -1).filter(i => i >= 0);
  if (!indexes.length) return allTexts;
  const parts = await translateTexts(indexes.map(i => allTexts[i]), to);
  const result = [...allTexts];
  indexes.forEach((i, n) => { result[i] = parts[n]; });
  return result;
}
async function translateTexts(texts, to) {
  const key = `${to}\u0000${texts.join('\u0001')}`;
  if (!translations.has(key)) {
    // One request: paragraphs are translated separately and come back in the same order.
    const request = fetch('/api/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: texts.join('\n\n'), from: 'en', to }) })
      .then(async response => { const data = await response.json(); if (!response.ok) throw Error(data.error || 'Translation failed.'); return data.text.split('\n\n'); })
      .then(parts => { if (parts.length !== texts.length) throw Error('The translation did not line up with the question.'); return parts; });
    translations.set(key, request);
    request.catch(() => translations.delete(key));
  }
  return translations.get(key);
}

// texts: English strings (question first, then answers, then anything else on the screen).
export function useQuestionLanguage(texts) {
  const language = useQuestionLanguageCode();
  const joined = texts.join('\u0001');
  const [state, setState] = useState({ key: '', texts, error: '' });
  useEffect(() => {
    if (language === 'en') return;
    let live = true;
    setState(previous => ({ ...previous, error: '' }));
    translateAll(texts, language).then(result => live && setState({ key: `${language}\u0000${joined}`, texts: result, error: '' }))
      .catch(error => live && setState({ key: '', texts, error: error.message }));
    return () => { live = false; };
  }, [language, joined]);
  const ready = language === 'en' || state.key === `${language}\u0000${joined}`;
  return { language, texts: ready && language !== 'en' ? state.texts : texts, translating: !ready && !state.error, translated: ready && language !== 'en', error: state.error };
}

export function LanguageSelect({ translating = false }) {
  const language = useQuestionLanguageCode();
  return <label className="lb-language">
    <span>Language:</span>
    <select aria-label="Question language" value={language} onChange={event => setQuestionLanguage(event.target.value)}>
      {Object.entries(LANGUAGES).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
    </select>
    {translating && <span className="lb-language-busy" role="status">Translating…</span>}
  </label>;
}

const voiceCache = new Map();
async function speechFor(text, language, signal) {
  const key = `${language}\u0000${text}`;
  if (!voiceCache.has(key)) {
    const response = await fetch('/api/speak', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: text.slice(0, 400), lang: language }), signal });
    if (!response.ok) throw Error((await response.json().catch(() => ({}))).error || 'The voice service is unavailable.');
    voiceCache.set(key, await response.blob());
  }
  return voiceCache.get(key);
}
function deviceVoice(language) {
  if (!('speechSynthesis' in window)) return null;
  const prefix = language === 'en' ? 'en' : language;
  return speechSynthesis.getVoices().find(voice => voice.lang.toLowerCase().replace('_', '-').startsWith(prefix)) || null;
}

// Reads the given lines aloud, one after another. A second click stops.
export function ListenButton({ lines, language }) {
  const [state, setState] = useState('idle');
  const [error, setError] = useState('');
  const playback = useRef(null);
  const stop = () => { playback.current?.abort(); playback.current = null; window.speechSynthesis?.cancel(); setState('idle'); };
  useEffect(() => stop, [language, lines.join('\u0001')]);
  const play = async () => {
    if (state !== 'idle') { stop(); return; }
    setError('');
    const controller = new AbortController(); playback.current = controller;
    const voice = deviceVoice(language);
    if (voice) {
      setState('playing');
      const utterance = new SpeechSynthesisUtterance(lines.join('. '));
      utterance.voice = voice; utterance.lang = voice.lang;
      utterance.onend = utterance.onerror = () => setState('idle');
      speechSynthesis.speak(utterance);
      return;
    }
    setState('loading');
    try {
      for (const line of lines) {
        if (controller.signal.aborted) return;
        const url = URL.createObjectURL(await speechFor(line, language, controller.signal));
        setState('playing');
        const audio = new Audio(url);
        await new Promise(resolve => { audio.onended = audio.onerror = resolve; controller.signal.addEventListener('abort', () => { audio.pause(); resolve(); }, { once: true }); audio.play().catch(resolve); });
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      if (!controller.signal.aborted) setError(error.message);
    } finally {
      if (playback.current === controller) { playback.current = null; setState('idle'); }
    }
  };
  return <>
    <button type="button" className="lb-listen" aria-pressed={state !== 'idle'} onClick={play}>
      {state === 'loading' ? 'Preparing voice…' : state === 'playing' ? '■ Stop' : '🔊 Listen'}
    </button>
    {error && <p className="lb-translation-note error" role="alert">{error}</p>}
  </>;
}

export function TranslationNote({ translated, error }) {
  if (error) return <p className="lb-translation-note error" role="alert">{error} Showing English.</p>;
  if (!translated) return null;
  return <p className="lb-translation-note">Machine translation (NLLB). Check with your teacher if anything is unclear.</p>;
}
