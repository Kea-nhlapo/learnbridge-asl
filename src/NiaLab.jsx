import React, { useEffect, useRef, useState } from 'react';
import { Performs } from './vendor/performs.nogui.module.js';
import Brand from './Brand.jsx';
import './nia-lab.css';

// Technical proof of Nia + one real upstream NGT sign. It is not question 27's explanation.
export default function NiaLab() {
  const mount = useRef(null);
  const app = useRef(null);
  const [status, setStatus] = useState('Loading Nia and the NGT sign OOG…');
  const [ready, setReady] = useState(false);
  const [recording, setRecording] = useState(false);
  useEffect(() => {
    const performs = new Performs();
    app.current = performs;
    try {
      performs.init({
        avatar: 'Nia',
        color: '#e8f2fb',
        scripts: [{ type: 'sigml', name: '/data/dictionaries/NGT/Glosses/OOG.sigml' }],
        autoplay: false,
        applyIdle: false,
        onReady: () => {
          // Performs' init callback appends its canvas to body after onReady.
          setTimeout(() => {
            performs.appendCanvasTo(mount.current);
            setReady(true);
            setStatus('Nia loaded. This sample performs the NGT sign OOG (eye).');
          }, 0);
        },
      });
    } catch (error) { setStatus(`Nia failed: ${error.message}`); }
    return () => { app.current = null; };
  }, []);

  function play() { app.current?.changePlayState(true); }
  async function record() {
    const canvas = mount.current?.querySelector('canvas');
    if (!canvas?.captureStream || typeof MediaRecorder === 'undefined') { setStatus('Canvas recording is not supported in this browser.'); return; }
    const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(type => MediaRecorder.isTypeSupported(type));
    if (!mimeType) { setStatus('No supported WebM recorder is available.'); return; }
    setRecording(true);
    setStatus('Recording the NGT OOG motion sample…');
    const stream = canvas.captureStream(30);
    const chunks = [];
    const recorder = new MediaRecorder(stream, { mimeType });
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    recorder.onerror = event => setStatus(`Recording failed: ${event.error?.message || 'Unknown error'}`);
    recorder.onstop = () => {
      stream.getTracks().forEach(track => track.stop());
      const blob = new Blob(chunks, { type: mimeType });
      if (!blob.size) { setStatus('Recording was empty.'); setRecording(false); return; }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'nia-ngt-oog-motion-test.webm';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      setStatus(`Saved ${Math.round(blob.size / 1024)} KB Nia motion sample. Narration and question-specific signing are still needed.`);
      setRecording(false);
    };
    recorder.start();
    play();
    setTimeout(() => { if (recorder.state === 'recording') recorder.stop(); }, 6000);
  }

  return <main className="nia-lab"><div className="nia-lab-head"><Brand href="/"/><a className="nia-lab-back" href="/vision-demo">← Question 27</a><h1>Nia technical test</h1><p>This tests the avatar and a real upstream NGT sign for “eye.” It is not a signed explanation of astigmatism.</p></div><div ref={mount} className="nia-lab-stage" aria-label="Nia avatar stage"/><div className="nia-lab-controls"><p role="status">{status}</p><button type="button" disabled={!ready || recording} onClick={play}>Play NGT sign</button><button type="button" disabled={!ready || recording} onClick={record}>Record motion sample</button></div></main>;
}
