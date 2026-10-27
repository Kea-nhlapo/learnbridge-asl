import React, { useEffect, useRef, useState } from 'react';
import { Performs } from './vendor/performs.nogui.module.js';
import Brand from './Brand.jsx';
import './nia-lab.css';

const narrationUrl = '/nia/question-27-narration.wav';
const glosses = ['OOG', 'VORM', 'ANDERS', 'BREKEN', 'VERSCHILLEND', 'PUNT', 'SCHERP', 'SLECHT'];

// Prototype NGT sequence. Its meaning is aligned with the explanation but still needs fluent review.
export default function NiaLab() {
  const mount = useRef(null);
  const app = useRef(null);
  const audio = useRef(null);
  const animationDuration = useRef(18);
  const [status, setStatus] = useState('Loading Nia and the question 27 sign sequence…');
  const [ready, setReady] = useState(false);
  const [recording, setRecording] = useState(false);
  useEffect(() => {
    const performs = new Performs();
    app.current = performs;
    try {
      performs.init({
        avatar: 'Nia',
        color: '#e8f2fb',
        scripts: glosses.map(name => ({ type: 'sigml', name: `/data/dictionaries/NGT/Glosses/${name}.sigml` })),
        autoplay: false,
        applyIdle: false,
        onReady: () => {
          // Performs' init callback appends its canvas to body after onReady.
          setTimeout(() => {
            performs.appendCanvasTo(mount.current);
            animationDuration.current = Math.max(1, ...((performs.scriptApp?.msg?.data || []).map(item => Number(item.end) || 0)));
            setReady(true);
            setStatus(`Nia loaded with ${glosses.length} NGT glosses and matching English narration.`);
          }, 0);
        },
      });
    } catch (error) { setStatus(`Nia failed: ${error.message}`); }
    return () => { app.current = null; };
  }, []);

  function play() {
    if (audio.current) { audio.current.currentTime = 0; audio.current.play().catch(() => {}); }
    app.current?.changePlayState(true);
  }
  async function record() {
    const canvas = mount.current?.querySelector('canvas');
    if (!canvas?.captureStream || typeof MediaRecorder === 'undefined') { setStatus('Canvas recording is not supported in this browser.'); return; }
    const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(type => MediaRecorder.isTypeSupported(type));
    if (!mimeType) { setStatus('No supported WebM recorder is available.'); return; }
    setRecording(true);
    setStatus('Recording Nia and narration as one question-specific clip…');
    const videoStream = canvas.captureStream(30);
    const audioContext = new AudioContext();
    const narrationResponse = await fetch(narrationUrl);
    if (!narrationResponse.ok) throw new Error('Narration could not be loaded');
    const narrationBuffer = await audioContext.decodeAudioData(await narrationResponse.arrayBuffer());
    const audioDestination = audioContext.createMediaStreamDestination();
    const narrationSource = audioContext.createBufferSource();
    narrationSource.buffer = narrationBuffer;
    narrationSource.connect(audioDestination);
    narrationSource.connect(audioContext.destination);
    const stream = new MediaStream([...videoStream.getVideoTracks(), ...audioDestination.stream.getAudioTracks()]);
    const chunks = [];
    const recorder = new MediaRecorder(stream, { mimeType });
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    recorder.onerror = event => setStatus(`Recording failed: ${event.error?.message || 'Unknown error'}`);
    recorder.onstop = () => {
      stream.getTracks().forEach(track => track.stop());
      audioContext.close();
      const blob = new Blob(chunks, { type: mimeType });
      if (!blob.size) { setStatus('Recording was empty.'); setRecording(false); return; }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'nia-question-27-ngt-prototype.webm';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      setStatus(`Saved ${Math.round(blob.size / 1024)} KB Nia clip with narration. Fluent NGT review is still required.`);
      setRecording(false);
    };
    recorder.start();
    app.current?.changePlayState(true);
    narrationSource.start();
    const durationMs = Math.ceil(Math.max(animationDuration.current, narrationBuffer.duration) + 1) * 1000;
    setTimeout(() => { if (recorder.state === 'recording') recorder.stop(); }, durationMs);
  }

  return <main className="nia-lab"><div className="nia-lab-head"><Brand href="/"/><a className="nia-lab-back" href="/app?screen=q1">← Question 27</a><h1>Nia explanation prototype</h1><p>Nia performs a complete multi-sign NGT prototype while the matching English explanation is narrated. The gloss sequence still needs review by a fluent NGT signer.</p></div><div ref={mount} className="nia-lab-stage" aria-label="Nia avatar stage"/><audio ref={audio} src={narrationUrl} preload="auto"/><div className="nia-lab-controls"><p role="status">{status}</p><button type="button" disabled={!ready || recording} onClick={play}>Play full explanation</button><button type="button" disabled={!ready || recording} onClick={record}>Record explanation</button></div></main>;
}
