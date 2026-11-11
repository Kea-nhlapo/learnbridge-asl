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

// One Nia for the whole app, moved between screens. Every Performs instance opens WebGL contexts that are
// never released, so a new one per question used up a phone's graphics memory and Chrome dropped the canvas.
let nia = null; // { app, ready, hidden }
const lostListeners = new Set();
function getNia() {
  if (nia) return nia;
  const app = new Performs();
  app._createRecorder = () => {}; // video export: one hidden full-screen renderer per camera, never used here
  const current = { app, hidden: false };
  current.ready = new Promise((resolve, reject) => {
    try {
      app.init({
        avatar: 'Nia', color: '#e8f2fb', autoplay: false, applyIdle: false,
        scripts: [{ type: 'sigml', name: `${SIGNS}OOG.sigml` }], // Performs needs a first script to start in signing mode.
        onReady: () => resolve(app),
      });
    } catch (error) { reject(error); }
  });
  const { renderer } = app;
  if (renderer) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); // 3x phone screens are too heavy with soft shadows
    const render = renderer.render.bind(renderer);
    renderer.render = (scene, camera) => { if (nia === current && !current.hidden && renderer.domElement.isConnected) render(scene, camera); };
    renderer.domElement.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      if (nia === current) nia = null;
      lostListeners.forEach(listener => listener());
    });
  }
  return nia = current;
}

// Reusable: <NiaSigner text="…" language="en" /> loads Nia once and signs the text when asked.
// preload: get the signs ready in the background as soon as Nia is loaded.
// play: when it turns true, Nia starts signing straight away (using the prepared signs).
export function NiaSigner({ text, language = 'en', autoSign = false, preload = false, play = false }) {
  const mount = useRef(null);
  const performs = useRef(null);
  const prepared = useRef({ key: '', promise: null });
  const [ready, setReady] = useState(false);
  const [lost, setLost] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [state, setState] = useState({ status: 'Loading Nia…', dutch: '', glosses: [], busy: false, duration: 0 });
  const hidden = preload && !play;

  useEffect(() => {
    let live = true;
    const current = getNia();
    prepared.current = { key: '', promise: null };
    current.ready.then(app => setTimeout(() => {
      if (!live || !mount.current || nia !== current) return;
      mount.current.querySelectorAll('canvas').forEach(canvas => canvas.remove()); // a canvas whose context was lost
      app.appendCanvasTo(mount.current);
      performs.current = app;
      setReady(true); setLost(false);
      setState(s => ({ ...s, status: 'Nia is ready.' }));
    }, 0), error => live && setState(s => ({ ...s, status: `Nia could not start: ${error.message}` })));
    const onLost = () => {
      if (!live) return;
      performs.current = null;
      setReady(false); setLost(true);
      setState(s => ({ ...s, busy: false, status: 'Nia stopped: this device ran out of graphics memory.' }));
    };
    lostListeners.add(onLost);
    return () => { live = false; lostListeners.delete(onLost); performs.current = null; };
  }, [generation]);
  useEffect(() => { if (nia) nia.hidden = hidden; }, [hidden, ready]);

  // Translation, sign lookup and sign files for the current text, fetched once and reused.
  function prepare() {
    const app = performs.current;
    const key = `${language}\u0000${text}`;
    if (prepared.current.key === key && prepared.current.promise) return prepared.current.promise;
    const promise = (async () => {
      const [index, translated] = await Promise.all([loadIndex(), fetch('/api/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: text.slice(0, 2000), from: language, to: 'nl' }) }).then(async r => { const d = await r.json(); if (!r.ok) throw Error(d.error || 'Translation failed.'); return d.text; })]);
      const glosses = dutchToGlosses(translated, index);
      const signed = glosses.filter(g => g.file);
      if (!signed.length) throw Error('Nia cannot sign this text yet.');
      const blocks = await app.scriptApp.processMessageFiles(signed.map(g => ({ name: SIGNS + encodeURIComponent(g.file) })));
      if (blocks.some(b => !b?.data || !String(b.data).includes('<'))) throw Error('Some signs could not be loaded.');
      return { translated, glosses, signed, blocks };
    })();
    prepared.current = { key, promise };
    promise.catch(() => { if (prepared.current.promise === promise) prepared.current = { key: '', promise: null }; });
    return promise;
  }

  async function sign() {
    const app = performs.current;
    if (!app || !text.trim() || state.busy) return;
    setState(s => ({ ...s, busy: true, status: 'Preparing the signing…' }));
    try {
      const { translated, glosses, signed, blocks } = await prepare();
      const result = await new Promise(resolve => app.scriptApp.onMessage(blocks, resolve));
      window.niaSign = { signed: signed.map(g => signName(g.file)), duration: result?.duration }; // read by automated checks
      setState(s => ({ ...s, busy: false, dutch: translated, glosses, duration: result?.duration || 0, status: 'Nia is signing.' }));
    } catch (error) {
      setState(s => ({ ...s, busy: false, status: error.message }));
    }
  }
  useEffect(() => { if (preload && ready && text.trim()) prepare().catch(() => {}); }, [preload, ready, text, language]);
  useEffect(() => { if ((autoSign || play) && ready) sign(); }, [autoSign, play, ready, text]);

  return <div className="nia-sign-player">
    <div ref={mount} className="nia-sign-stage" aria-label="Nia signing avatar" />
    <p className="nia-sign-status" role="status">{state.status}</p>
    <div className="nia-sign-actions">
      {lost
        ? <button type="button" onClick={() => { setLost(false); setState(s => ({ ...s, status: 'Loading Nia…' })); setGeneration(g => g + 1); }}>Reload Nia</button>
        : <button type="button" disabled={!ready || state.busy || !text.trim()} onClick={sign}>{state.glosses.length ? 'Sign again' : 'Sign with Nia'}</button>}
      {state.duration > 0 && !lost && <button type="button" className="secondary" disabled={state.busy} onClick={() => performs.current?.changePlayState(true)}>Replay</button>}
    </div>
    <p className="nia-sign-note">Prototype signing avatar.</p>
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
