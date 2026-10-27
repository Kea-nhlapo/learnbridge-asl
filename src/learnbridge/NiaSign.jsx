// Nia signs any text, like the sign.mt signing in LearnBridge: the text is machine-translated into Dutch
// (NLLB), each Dutch word is matched to a sign in Nia's NGT (Dutch Sign Language) dictionary, and Nia
// performs the matched signs live. Word-by-word dictionary signing, not fluent NGT, and not SASL.
import React, { useEffect, useRef, useState } from 'react';
import { Performs } from '../vendor/performs.nogui.module.js';
import Brand from '../Brand.jsx';
import { buildGlossIndex, dutchToGlosses } from './ngt-gloss.js';
import '../nia-lab.css';
import './nia-sign.css';

const SIGNS = '/data/dictionaries/NGT/Glosses/';
const SOURCE_LANGUAGES = { en: 'English', zu: 'isiZulu', nso: 'Sepedi' };
const signName = file => file.replace(/\.(sigml|bml)$/, '');
let glossIndex = null;
const loadIndex = async () => glossIndex ??= fetch('/nia/ngt-glosses.json').then(r => r.json()).then(d => buildGlossIndex(d.files));

// Reusable: <NiaSigner text="…" language="en" /> loads Nia once and signs the text when asked.
export function NiaSigner({ text, language = 'en', autoSign = false }) {
  const mount = useRef(null);
  const performs = useRef(null);
  const [ready, setReady] = useState(false);
  const [state, setState] = useState({ status: 'Loading Nia…', dutch: '', glosses: [], busy: false, duration: 0 });

  useEffect(() => {
    const app = new Performs();
    performs.current = app;
    try {
      app.init({
        avatar: 'Nia', color: '#e8f2fb', autoplay: false, applyIdle: false,
        scripts: [{ type: 'sigml', name: `${SIGNS}OOG.sigml` }], // Performs needs a first script to start in signing mode.
        onReady: () => setTimeout(() => { if (mount.current) { app.appendCanvasTo(mount.current); setReady(true); setState(s => ({ ...s, status: 'Nia is ready.' })); } }, 0),
      });
    } catch (error) { setState(s => ({ ...s, status: `Nia could not start: ${error.message}` })); }
    return () => { performs.current = null; };
  }, []);

  async function sign() {
    const app = performs.current;
    if (!app || !text.trim() || state.busy) return;
    setState(s => ({ ...s, busy: true, status: 'Preparing the signing…' }));
    try {
      const [index, translated] = await Promise.all([loadIndex(), fetch('/api/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: text.slice(0, 2000), from: language, to: 'nl' }) }).then(async r => { const d = await r.json(); if (!r.ok) throw Error(d.error || 'Translation failed.'); return d.text; })]);
      const glosses = dutchToGlosses(translated, index);
      const signed = glosses.filter(g => g.file);
      if (!signed.length) throw Error('None of these words are in Nia’s sign dictionary yet.');
      setState(s => ({ ...s, dutch: translated, glosses, status: `Loading ${signed.length} signs…` }));
      const blocks = await app.scriptApp.processMessageFiles(signed.map(g => ({ name: SIGNS + encodeURIComponent(g.file) })));
      if (blocks.some(b => !b?.data || !String(b.data).includes('<'))) throw Error('Some signs could not be loaded.');
      const result = await new Promise(resolve => app.scriptApp.onMessage(blocks, resolve));
      window.niaSign = { signed: signed.map(g => signName(g.file)), duration: result?.duration }; // read by automated checks
      setState(s => ({ ...s, busy: false, duration: result?.duration || 0, status: `Signing ${signed.length} of ${glosses.length} words.` }));
    } catch (error) {
      setState(s => ({ ...s, busy: false, status: error.message }));
    }
  }
  useEffect(() => { if (autoSign && ready) sign(); }, [autoSign, ready, text]);

  return <div className="nia-sign-player">
    <div ref={mount} className="nia-sign-stage" aria-label="Nia signing avatar" />
    <p className="nia-sign-status" role="status">{state.status}</p>
    <div className="nia-sign-actions">
      <button type="button" disabled={!ready || state.busy || !text.trim()} onClick={sign}>{state.glosses.length ? 'Sign again' : 'Sign with Nia'}</button>
      {state.duration > 0 && <button type="button" className="secondary" disabled={state.busy} onClick={() => performs.current?.changePlayState(true)}>Replay</button>}
    </div>
    <p className="nia-sign-note">Prototype: Nia signs the text word by word. Words without a sign yet are skipped.</p>
  </div>;
}

export default function NiaSign() {
  const [text, setText] = useState('When the droplets become heavy enough, water falls from the clouds as rain.');
  const [language, setLanguage] = useState('en');
  return <main className="nia-lab nia-sign">
    <div className="nia-lab-head"><Brand href="/" /><h1>Nia signs any text</h1><p>Type or paste a sentence in English, isiZulu or Sepedi, then press <b>Sign with Nia</b> to see it in sign language.</p></div>
    <label className="nia-sign-field">Text<textarea rows={3} value={text} onChange={e => setText(e.target.value)} /></label>
    <label className="nia-sign-field">Written in<select value={language} onChange={e => setLanguage(e.target.value)}>{Object.entries(SOURCE_LANGUAGES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
    <NiaSigner text={text} language={language} />
  </main>;
}
