// Shows a signed-then-spoken English sentence in isiZulu and Sepedi (NLLB machine translation), each with a
// Listen button, so the signer's message reaches people who speak those languages.
import React, { useEffect, useState } from 'react';
import { ListenButton } from './QuestionLanguage.jsx';
import './sentence-translations.css';

const TARGETS = { zu: 'isiZulu', nso: 'Sepedi' };

export function SentenceTranslations({ sentence }) {
  const [state, setState] = useState({ sentence: '', texts: {}, error: '' });
  useEffect(() => {
    if (!sentence?.trim()) return;
    let live = true;
    setState({ sentence, texts: {}, error: '' });
    Promise.all(Object.keys(TARGETS).map(async to => {
      const response = await fetch('/api/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: sentence, from: 'en', to }) });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || 'Translation failed.');
      return [to, data.text];
    })).then(pairs => live && setState({ sentence, texts: Object.fromEntries(pairs), error: '' }))
      .catch(error => live && setState({ sentence, texts: {}, error: error.message }));
    return () => { live = false; };
  }, [sentence]);
  if (!sentence?.trim()) return null;
  return <div className="lb-sentence-translations">
    <strong>In other languages</strong>
    {state.error ? <p className="lb-translation-note error" role="alert">{state.error}</p> : Object.entries(TARGETS).map(([code, name]) =>
      <div key={code} className="lb-sentence-translation">
        <span>{name}</span>
        {state.texts[code] ? <><p>{state.texts[code]}</p><ListenButton lines={[state.texts[code]]} language={code} /></> : <p className="lb-translating">Translating…</p>}
      </div>)}
    <small>Machine translation (NLLB).</small>
  </div>;
}
