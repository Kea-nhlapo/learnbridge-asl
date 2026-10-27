import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import Brand from './Brand.jsx';
import { MediaPipeOnnxClassifier } from './signchat/runtime/sign-pipeline/mediapipe-onnx-classifier.ts';
import { createModeController } from './signchat/runtime/mode-controller/mode-controller.ts';
import { classifyLetter, classifyPrototype, handFeatures, loadProfiles, multiHandFeatures, nameLetters, nextExpectedLetter, readyToSpellName, saveProfiles, SAMPLES_PER_LETTER } from './fingerspelling.js';
import './sign-introduction.css';

function drawTracking(canvas, frame, video) {
  const ctx = canvas?.getContext('2d');
  if (!ctx) return;
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  if (!frame) return;
  const videoWidth = video?.videoWidth || 640;
  const videoHeight = video?.videoHeight || 480;
  const fit = Math.min(width / videoWidth, height / videoHeight);
  const drawWidth = videoWidth * fit;
  const drawHeight = videoHeight * fit;
  const offsetX = (width - drawWidth) / 2;
  const offsetY = (height - drawHeight) / 2;
  const paint = (points, color, radius) => {
    if (!points) return;
    ctx.fillStyle = color;
    for (const point of points) {
      if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
      ctx.beginPath(); ctx.arc(offsetX + point.x * drawWidth, offsetY + point.y * drawHeight, radius, 0, Math.PI * 2); ctx.fill();
    }
  };
  paint(frame.pose, '#95c9ff', 3);
  for (const hand of frame.hands) paint(hand.landmarks, '#6dffcf', 4);
}

function speak(sentence, done) {
  if (!window.speechSynthesis || !sentence) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(sentence);
  utterance.lang = 'en-US';
  utterance.rate = 0.92;
  utterance.onend = done;
  utterance.onerror = done;
  window.speechSynthesis.speak(utterance);
  return true;
}

export default function SignConversation({ calibrationOnly = false }) {
  const controller = useMemo(() => createModeController({ mode: 'manual' }), []);
  const snapshot = useSyncExternalStore(controller.subscribe, controller.snapshot);
  const classifierRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const recentHandsRef = useRef(0);
  const mountedRef = useRef(true);
  const requestRef = useRef(0);
  const frameRef = useRef(null);
  const spellingFrameRef = useRef(() => {});
  const personalSignRef = useRef(null);
  const captureRef = useRef(null);
  const draftRef = useRef(null);
  const neededTargetRef = useRef(null);
  const spellingRef = useRef({ active: false, completed: false, announced: false, spelled: '', candidate: '', since: 0, last: '', armed: true });
  const activeProfileRef = useRef(null);
  const [camera, setCamera] = useState('off');
  const [cameraError, setCameraError] = useState('');
  const [modelProgress, setModelProgress] = useState('');
  const [tracking, setTracking] = useState('Camera off');
  const [topSign, setTopSign] = useState(null);
  const [lastTokens, setLastTokens] = useState([]);
  const [sentence, setSentence] = useState('');
  const [approved, setApproved] = useState('');
  const [requestError, setRequestError] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const [profiles, setProfiles] = useState(loadProfiles);
  const [activeProfileId, setActiveProfileId] = useState(() => loadProfiles()[0]?.id || '');
  const [newName, setNewName] = useState('');
  const [draft, setDraft] = useState(null);
  const [profileError, setProfileError] = useState('');
  const [spelling, setSpelling] = useState(false);
  const [spelled, setSpelled] = useState('');
  const [liveLetter, setLiveLetter] = useState('');
  const [rehearsal, setRehearsal] = useState(false);
  const [rehearsalResult, setRehearsalResult] = useState('');
  const [captureCountdown, setCaptureCountdown] = useState(0);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [trainingActive, setTrainingActive] = useState(false);
  const [readyCountdown, setReadyCountdown] = useState(0);
  const activeProfile = profiles.find(profile => profile.id === activeProfileId) || null;
  activeProfileRef.current = activeProfile;
  const targetLetters = draft ? nameLetters(draft.name) : null;
  const targets = draft ? ['HELLO', 'MINEMY', 'HOWAREYOU', 'THANKYOU', ...(targetLetters || [])] : [];
  const neededTarget = targets.find(label => (draft.samples[label]?.length || 0) < SAMPLES_PER_LETTER);
  draftRef.current = draft;
  neededTargetRef.current = neededTarget;
  const completedTargets = draft ? targets.filter(label => (draft.samples[label]?.length || 0) >= SAMPLES_PER_LETTER).length : 0;
  const progressPercent = targets.length ? Math.round(completedTargets / targets.length * 100) : 0;

  spellingFrameRef.current = frame => {
    const session = spellingRef.current;
    if (!session.active || !activeProfile || frame.ts < session.skipUntil) return;
    const hand = [...frame.hands].sort((a, b) => (b.score || 0) - (a.score || 0))[0];
    const feature = handFeatures(hand);
    if (!feature) {
      if (session.missingSince === undefined) session.missingSince = frame.ts;
      if (frame.ts - session.missingSince > 350) { session.armed = true; session.candidate = ''; setLiveLetter(''); }
      return;
    }
    session.missingSince = undefined;
    const match = classifyLetter(feature, activeProfile.samples);
    const letter = match?.letter || '';
    if (letter !== session.candidate) { session.candidate = letter; session.since = frame.ts; }
    if (!session.armed && letter && letter !== session.last) session.armed = true;
    setLiveLetter(letter);
    if (!session.armed || !letter || frame.ts - session.since < 550) return;
    // A profile is a guided name calibration, not general identity recognition.
    if (letter !== nextExpectedLetter(activeProfile.name, session.spelled)) return;
    session.spelled += letter;
    session.last = letter;
    session.armed = false;
    setSpelled(session.spelled);
    const profileLetters = activeProfile.name.trim().toUpperCase().replaceAll(/\s+/g, '');
    if (!nextExpectedLetter(activeProfile.name, session.spelled)) {
      session.active = false;
      session.completed = true;
      setSpelling(false);
      const signedTokens = controller.snapshot().buffer.tokens;
      if (signedTokens.length) {
        setLastTokens(signedTokens);
        if (rehearsal) {
          controller.cancel();
          setRehearsal(false);
          setRehearsalResult('Passed: HELLO → MY → ' + activeProfile.name.toUpperCase().split('').join(' → '));
        } else {
          setSpeaking(speak(`My name is ${activeProfile.name.trim()}.`, () => setSpeaking(false)));
          controller.stopManual();
          void reconstruct(signedTokens, activeProfile.name);
        }
      }
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestRef.current += 1;
      window.speechSynthesis?.cancel();
      void classifierRef.current?.stop();
      controller.dispose();
    };
  }, [controller]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const scale = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * scale);
      canvas.height = Math.round(canvas.clientHeight * scale);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  async function startCamera() {
    setCamera('starting'); setCameraError(''); setModelProgress('Loading sign model and landmark trackers…');
    const classifier = new MediaPipeOnnxClassifier({
      config: { inferenceIntervalMs: 200 },
      onStream(stream) { if (videoRef.current) videoRef.current.srcObject = stream; },
      onFrame(frame) {
        if (!mountedRef.current) return;
        frameRef.current = frame;
        drawTracking(canvasRef.current, frame, videoRef.current);
        if (frame.hands.length) recentHandsRef.current = performance.now();
        setTracking(frame.hands.length ? `${frame.hands.length} hand${frame.hands.length === 1 ? '' : 's'} tracked` : 'Show your hands in the frame');
        const active = activeProfileRef.current;
        const hand = [...frame.hands].sort((a, b) => (b.score || 0) - (a.score || 0))[0];
        if (captureRef.current) {
          const feature = ['HELLO', 'MINEMY', 'HOWAREYOU', 'THANKYOU'].includes(captureRef.current.target) ? multiHandFeatures(frame.hands) || handFeatures(hand) : handFeatures(hand);
          if (feature) captureRef.current.samples.push(feature);
        }
        if (active && !spellingRef.current.active) {
          const specialSamples = { HELLO: active.samples?.HELLO || [], MINEMY: active.samples?.MINEMY || [], HOWAREYOU: active.samples?.HOWAREYOU || [], THANKYOU: active.samples?.THANKYOU || [] };
          personalSignRef.current = classifyPrototype(multiHandFeatures(frame.hands), specialSamples) || classifyPrototype(handFeatures(hand), specialSamples);
        } else personalSignRef.current = null;
        spellingFrameRef.current(frame);
      },
      onModelProgress(received, total) {
        if (mountedRef.current) setModelProgress(total ? `Loading ASL model · ${Math.round(received / total * 100)}%` : 'Loading ASL model…');
      },
    });
    classifierRef.current = classifier;
    classifier.onResult(result => {
      if (!mountedRef.current || performance.now() - recentHandsRef.current > 800) { setTopSign(null); return; }
      if (spellingRef.current.active || spellingRef.current.completed) return;
      setTopSign(result.top[0] || null);
      const personal = personalSignRef.current;
      const adapted = personal && personal.confidence >= 0.58
        ? { ...result, top: [{ label: personal.label, score: Math.max(result.top[0]?.score || 0, personal.confidence), ts: result.ts }, ...result.top.slice(1)] }
        : result;
      controller.ingest(adapted);
      const admitted = controller.snapshot().buffer.tokens.map(token => token.label.toUpperCase());
      if (!spellingRef.current.announced && admitted.filter(label => label === 'HELLO').length >= 2) {
        spellingRef.current.announced = true;
        setSpeaking(speak('Hello everyone.', () => setSpeaking(false)));
      }
      if (admitted.at(-1) === 'THANKYOU') {
        setSpeaking(speak('Thank you.', () => setSpeaking(false)));
      }
      if (admitted.at(-1) === 'HOWAREYOU') {
        setSpeaking(speak('I hope you are well.', () => setSpeaking(false)));
      }
      if (activeProfileRef.current && controller.snapshot().state === 'capturing' && readyToSpellName(controller.snapshot().buffer.tokens)) {
        spellingRef.current = { active: true, completed: false, announced: false, spelled: '', candidate: '', since: 0, last: '', armed: true, skipUntil: performance.now() + 700 };
        setSpelling(true);
        setTopSign(null);
      }
    });
    try {
      await classifier.start();
      if (mountedRef.current && classifierRef.current === classifier) { setCamera('ready'); setModelProgress(''); }
    } catch (error) {
      if (mountedRef.current) {
        setCamera('off');
        setCameraError(error?.name === 'NotAllowedError' ? 'Camera access was denied. Allow the camera in your browser and try again.' : `Camera or sign model could not start: ${error.message}`);
      }
    }
  }

  async function stopCamera() {
    requestRef.current += 1;
    const current = classifierRef.current;
    classifierRef.current = null;
    await current?.stop();
    if (videoRef.current) videoRef.current.srcObject = null;
    drawTracking(canvasRef.current, null);
    if (mountedRef.current) { setCamera('off'); setTracking('Camera off'); setTopSign(null); }
    spellingRef.current.active = false; setSpelling(false);
    if (snapshot.state === 'capturing') controller.cancel();
  }

  async function reconstruct(tokens, name = '') {
    const requestId = ++requestRef.current;
    setRequestError('');
    try {
      const response = await fetch('/api/sign-reconstruct', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tokens: tokens.map(({ label, score }) => ({ label, score })), spelledName: name }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Sentence reconstruction failed.');
      if (!mountedRef.current || requestId !== requestRef.current) return;
      controller.setReconstruction(data);
      setSentence(data.sentence);
    } catch (error) {
      if (!mountedRef.current || requestId !== requestRef.current) return;
      controller.setLLMError(error.message);
      setRequestError(error.message);
    }
  }

  function finishSentence() {
    const tokens = controller.snapshot().buffer.tokens;
    if (!tokens.length) return;
    setLastTokens(tokens);
    controller.stopManual();
    void reconstruct(tokens, spelled && spelled === activeProfile?.name.trim().toUpperCase().replaceAll(/\s+/g, '') ? activeProfile.name : '');
  }

  function beginEnrollment() {
    const name = newName.trim();
    if (!nameLetters(name)) { setProfileError('Use a name of 1–30 letters without J or Z. Those two letters need a motion model.'); return; }
    setProfileError(''); setDraft({ name, samples: {} });
  }

  function captureLetter() {
    const currentDraft = draftRef.current;
    const target = neededTargetRef.current;
    if (!currentDraft || !target) return;
    if (captureRef.current) return;
    setProfileError('');
    captureRef.current = { target, samples: [] };
    const timed = target === 'HOWAREYOU' || target === 'THANKYOU';
    const duration = timed ? 3 : 0.45;
    setCaptureCountdown(timed ? duration : 0);
    setCaptureProgress(0);
    const started = performance.now();
    const timer = setInterval(() => {
      const remaining = Math.max(0, duration - (performance.now() - started) / 1000);
      setCaptureCountdown(remaining);
      setCaptureProgress(timed ? Math.min(1, (performance.now() - started) / 3000) : 0);
      if (remaining <= 0) {
        clearInterval(timer);
        const capture = captureRef.current;
        captureRef.current = null;
        const samples = capture?.samples || [];
        if (!samples.length) { setTrainingActive(false); setProfileError('No hand movement was captured. Press Retry and keep your hand(s) visible.'); return; }
        const average = samples[0].map((_, index) => samples.reduce((sum, sample) => sum + (sample[index] || 0), 0) / samples.length);
        setDraft(current => ({ ...current, samples: { ...current.samples, [target]: [...(current.samples[target] || []), average] } }));
        setCaptureProgress(0);
        const nextTarget = targets[targets.indexOf(target) + 1];
        if (trainingActive && (nextTarget === 'HOWAREYOU' || nextTarget === 'THANKYOU')) setTimeout(() => captureLetter(), 250);
        else if (nextTarget && nextTarget !== 'HOWAREYOU' && nextTarget !== 'THANKYOU') setTrainingActive(false);
      }
    }, 50);
  }

  function startGuidedTraining() {
    setProfileError(''); setTrainingActive(true);
    if (neededTarget !== 'HOWAREYOU' && neededTarget !== 'THANKYOU') { setReadyCountdown(0); return; }
    setReadyCountdown(5);
    let remaining = 5;
    const timer = setInterval(() => { remaining -= 1; setReadyCountdown(remaining); if (remaining <= 0) { clearInterval(timer); captureLetter(); } }, 1000);
  }
  function pauseGuidedTraining() { setTrainingActive(false); captureRef.current = null; setReadyCountdown(0); setCaptureCountdown(0); setCaptureProgress(0); }

  function saveProfile() {
    if (!draft || neededTarget) return;
    const profile = { ...draft, id: crypto.randomUUID() };
    const next = [...profiles, profile];
    try { saveProfiles(next); } catch { setProfileError('Browser storage is unavailable. Allow site storage to save this profile.'); return; }
    setProfiles(next); setActiveProfileId(profile.id); setDraft(null); setNewName(''); setProfileError('');
  }

  function resetSpelling() {
    spellingRef.current = { active: false, completed: false, announced: false, spelled: '', candidate: '', since: 0, last: '', armed: true };
    setSpelled(''); setLiveLetter(''); setSpelling(false);
  }

  function beginRehearsal() {
    if (!activeProfile || camera !== 'ready' || snapshot.state !== 'idle') return;
    setRehearsal(true); setRehearsalResult(''); setLastTokens([]); setSpelled(''); setSentence('');
    spellingRef.current = { active: false, completed: false, announced: false, spelled: '', candidate: '', since: 0, last: '', armed: true };
    controller.start();
  }

  function retryName() {
    if (!activeProfile || snapshot.state !== 'capturing') return;
    spellingRef.current = { active: true, completed: false, announced: false, spelled: '', candidate: '', since: 0, last: '', armed: true, skipUntil: performance.now() + 700 };
    setSpelled(''); setLiveLetter(''); setSpelling(true);
  }

  function approve() {
    const text = sentence.trim();
    if (!text) return;
    controller.approve(text);
    setApproved(text);
    const started = speak(text, () => { setSpeaking(false); controller.speakingDone(); });
    setSpeaking(started);
    if (!started) controller.speakingDone();
  }

  function goDashboard() {
    window.speechSynthesis?.cancel();
    void classifierRef.current?.stop();
    window.location.href = '/app?screen=dashboard';
  }

  const tokens = snapshot.buffer.tokens.length ? snapshot.buffer.tokens : lastTokens;
  const nameStarted = readyToSpellName(tokens);
  const profileName = activeProfile?.name.trim() || '';
  const namePrefixMatches = profileName && spelled.length >= 3 && profileName.toUpperCase().replaceAll(/\s+/g, '').startsWith(spelled);
  const liveName = namePrefixMatches ? `${spelled.split('').join('-')} (${profileName})` : (spelled ? spelled.split('').join('-') : '…');
  const liveSentence = nameStarted ? `Hello, my name is ${liveName}${spelled && !spelling ? '.' : ''}` : tokens.some(token => token.label.toUpperCase() === 'HELLO') ? 'Hello…' : '';
  return <div className={`sign-intro-page${calibrationOnly ? ' sign-calibration-page' : ''}`}>
    <header className="sign-intro-header"><Brand href="/"/><span>{calibrationOnly ? 'SA Educate · Signer calibration' : 'SA Educate · Communication'}</span><button type="button" onClick={() => { window.location.href = calibrationOnly ? '/sign-introduction' : '/app?screen=dashboard'; }}>{calibrationOnly ? 'Back to introduction →' : 'Go to dashboard →'}</button></header>
    <main className="sign-intro-main">
      <div className="sign-intro-heading"><span className="sign-intro-eyebrow">{calibrationOnly ? 'SIGNER SETUP' : 'WELCOME TO SA EDUCATE'}</span><h1>{calibrationOnly ? 'Manage signer calibration.' : 'Start with a sign.'}</h1><p>{calibrationOnly ? 'Create and test a local profile for each participant before the live introduction. Capture HELLO, MY, and every letter in their name.' : 'In one capture, sign HELLO and MY, then fingerspell your name. The sentence builds as you sign; review it before it is spoken.'}</p></div>
      <div className="sign-intro-grid">
        <section className="sign-intro-camera" aria-label="ASL camera and landmark tracking">
          <div className="sign-intro-camera-top"><strong>Live camera</strong><span>{camera === 'ready' ? tracking : camera === 'starting' ? 'Starting camera…' : 'Camera off'}</span></div>
          <div className="sign-intro-stage"><video ref={videoRef} className="sign-intro-mirror" playsInline muted autoPlay aria-label="Camera preview"/><canvas ref={canvasRef} className="sign-intro-mirror" aria-hidden="true"/>{camera !== 'ready' && <div className="sign-intro-stage-placeholder"><span aria-hidden="true">✋</span><p>{camera === 'starting' ? 'Preparing recognition…' : 'Your camera appears here after you start it.'}</p></div>}</div>
          <div className="sign-intro-camera-actions">{camera === 'off' ? <button type="button" onClick={startCamera}>Start camera</button> : <button type="button" onClick={stopCamera}>Stop camera</button>}<small>Video and landmarks stay on this device.</small></div>
          {camera === 'starting' && <p className="sign-intro-info" role="status">{modelProgress}</p>}
          {cameraError && <p className="sign-intro-error" role="alert">{cameraError}</p>}
          {!calibrationOnly && <div className="sign-profile-compact"><strong>Signer: {activeProfile?.name || 'No profile selected'}</strong><button type="button" onClick={() => { window.location.href = '/sign-calibration'; }}>Manage calibrations →</button></div>}
          {calibrationOnly && <div className="sign-profile-panel">
            <span className="sign-intro-eyebrow">PERSONAL FINGERSPELLING</span><h2>Set up each signer</h2>
            <p>Each person records three examples of every letter in their name. Select their profile before they sign. Profiles and hand landmarks stay in this browser.</p>
            <div className="sign-profile-list"><strong>Saved profiles</strong>{profiles.length ? profiles.map(profile => <div className={`sign-profile-row${profile.id === activeProfileId ? ' active' : ''}`} key={profile.id}><span><b>{profile.name}</b>{profile.id === activeProfileId && <small>Active</small>}</span><div>{profile.id !== activeProfileId && <button type="button" onClick={() => { setActiveProfileId(profile.id); resetSpelling(); }}>Set active</button>}<button type="button" className="danger" onClick={() => { const next = profiles.filter(item => item.id !== profile.id); saveProfiles(next); setProfiles(next); if (profile.id === activeProfileId) setActiveProfileId(next[0]?.id || ''); resetSpelling(); }}>Delete</button></div></div>) : <p className="sign-profile-empty">No profiles yet. Add the first signer below.</p>}</div>
            {profiles.length > 0 && <label className="sign-profile-select">Signer profile<select value={activeProfileId} onChange={event => { setActiveProfileId(event.target.value); resetSpelling(); }}><option value="">Select a signer</option>{profiles.map(profile => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select></label>}
            {!draft ? <div className="sign-profile-add"><label htmlFor="sign-profile-name">Add new profile</label><div><input id="sign-profile-name" value={newName} onChange={event => setNewName(event.target.value)} placeholder="Enter signer name" maxLength={30}/><button type="button" onClick={beginEnrollment}>Train profile</button></div></div> : <div className="sign-profile-train"><strong>Guided calibration: {draft.name}</strong><div className="sign-calibration-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progressPercent} aria-label={`Calibration ${progressPercent}% complete`}><span style={{ width: `${progressPercent}%` }}/></div><div className="sign-calibration-progress-copy">{completedTargets} of {targets.length} targets complete · {progressPercent}%</div>{!trainingActive && !captureRef.current && neededTarget && <div className="sign-ready"><p>{readyCountdown > 0 ? `Get ready… ${readyCountdown}` : 'Are you ready? The guided timer will repeat until you pause.'}</p>{readyCountdown <= 0 && <button type="button" disabled={camera !== 'ready'} onClick={startGuidedTraining}>{neededTarget === 'HOWAREYOU' || neededTarget === 'THANKYOU' ? 'I’m ready' : `Capture ${neededTarget}`}</button>}{profileError && <button type="button" className="secondary" onClick={startGuidedTraining}>Retry</button>}</div>}{trainingActive && neededTarget && <><p>{neededTarget === 'HELLO' ? 'Sign HELLO' : neededTarget === 'MINEMY' ? 'Sign MY' : neededTarget === 'HOWAREYOU' ? 'Sign your “How are you?” gesture' : neededTarget === 'THANKYOU' ? 'Sign THANK YOU' : <>Sign the letter <b>{neededTarget}</b></>}, sample {(draft.samples[neededTarget]?.length || 0) + 1} of {SAMPLES_PER_LETTER}.</p>{(neededTarget === 'HOWAREYOU' || neededTarget === 'THANKYOU') && <div className="sign-circle-timer" style={{ '--progress': `${captureProgress * 360}deg` }} aria-label={`${captureCountdown.toFixed(1)} seconds remaining`}>{readyCountdown > 0 ? readyCountdown : captureCountdown > 0 ? captureCountdown.toFixed(1) : '…'}</div>}{neededTarget !== 'HOWAREYOU' && neededTarget !== 'THANKYOU' && <button type="button" disabled={!!captureRef.current} onClick={captureLetter}>Capture {neededTarget}</button>}<button type="button" className="secondary" onClick={pauseGuidedTraining}>Pause</button></>}{!neededTarget && <><p>Whole flow calibration complete. Save this signer profile.</p><button type="button" onClick={saveProfile}>Save profile</button></>}<button type="button" className="secondary" onClick={() => { pauseGuidedTraining(); setDraft(null); setProfileError(''); }}>Cancel setup</button></div>}
            {profileError && <p className="sign-profile-error" role="alert">{profileError}</p>}
            {activeProfile && <><button type="button" className="sign-profile-test" disabled={camera !== 'ready' || snapshot.state !== 'idle'} onClick={beginRehearsal}>Test full introduction</button><button type="button" className="sign-profile-remove" onClick={() => { const next = profiles.filter(profile => profile.id !== activeProfile.id); saveProfiles(next); setProfiles(next); setActiveProfileId(next[0]?.id || ''); resetSpelling(); }}>Remove {activeProfile.name} profile</button></>}
          </div>}
        </section>
        <section className="sign-intro-transcript" aria-labelledby="sign-intro-transcript-title">
          <span className="sign-intro-eyebrow">SIGN TO SPEECH</span><h2 id="sign-intro-transcript-title">Your message</h2>
          <p className="sign-intro-last" role="status">{spelling ? `Reading fingerspelling · ${liveLetter || 'show the next letter'}` : topSign && camera === 'ready' ? `Seeing ${topSign.label.replaceAll('_', ' ')} · ${Math.round(topSign.score * 100)}% confidence` : 'Start the camera, then sign with your hands visible.'}</p>
          <div className="sign-intro-words" aria-live="polite">{tokens.length ? tokens.map((token, index) => <span key={`${token.label}-${index}`}>{token.label.replaceAll('_', ' ')}</span>) : <em>Recognised signs will appear here.</em>}</div>
          {rehearsalResult && <div className="sign-rehearsal-result" role="status">{rehearsalResult}</div>}
          {snapshot.state === 'capturing' && <div className="sign-spelling-panel"><strong>{rehearsal ? 'Full introduction test' : 'Live interpretation'}</strong><div className="sign-live-sentence" aria-live="polite">{liveSentence || (rehearsal ? 'Waiting for HELLO…' : 'Waiting for HELLO…')}</div><p>{spelling ? `Now fingerspell ${activeProfile?.name || 'your name'}: hold each letter until it appears. The next letter is ${nextExpectedLetter(activeProfile?.name || '', spelled) || 'done'}.` : nameStarted && spelled ? rehearsal ? 'Sequence complete. Checking your rehearsal…' : 'Name complete. Opening review…' : activeProfile ? 'Sign HELLO, then MY. Name spelling starts automatically.' : 'Add or select a signer profile before the demo.'}</p>{nameStarted && activeProfile && <div className="sign-spelling-controls"><button type="button" className="secondary" onClick={retryName}>Restart name spelling</button></div>}</div>}
          <div className="sign-conversation-controls">{snapshot.state === 'capturing' ? <>{!nameStarted && <button type="button" onClick={finishSentence} disabled={!snapshot.buffer.tokens.length}>Finish sentence</button>}<button type="button" className="secondary" onClick={() => { resetSpelling(); controller.cancel(); }}>Cancel</button></> : <button type="button" disabled={camera !== 'ready' || snapshot.state === 'stitching' || snapshot.state === 'preview' || !activeProfile} onClick={() => { resetSpelling(); setLastTokens([]); setSentence(''); setApproved(''); setRequestError(''); controller.start(); }}>Start signing</button>}<small>{snapshot.state === 'capturing' ? 'Sign HELLO and MY, then spell your name without stopping. The introduction opens for review automatically.' : snapshot.state === 'stitching' ? 'Preparing your sentence…' : 'Select a trained signer profile, then start one continuous capture.'}</small></div>
          {requestError && <div className="sign-intro-error" role="alert">{requestError}{lastTokens.length > 0 && <button type="button" onClick={() => { controller.retry(lastTokens); void reconstruct(lastTokens, spelled === activeProfile?.name.trim().toUpperCase().replaceAll(/\s+/g, '') ? activeProfile.name : ''); }}>Retry sentence</button>}</div>}
          {snapshot.state === 'preview' && <div className="sign-conversation-review"><label htmlFor="sentence-review">Review and edit the suggested sentence</label><textarea id="sentence-review" value={sentence} onChange={event => setSentence(event.target.value)} maxLength={500}/><p>Model confidence: {snapshot.preview?.confidence}. Check the wording before speaking.</p><div><button type="button" onClick={approve} disabled={!sentence.trim()}>Speak this sentence</button><button type="button" className="secondary" onClick={() => { controller.discard(); setLastTokens([]); }}>Discard</button></div></div>}
          {approved && <div className="sign-conversation-approved"><strong>Spoken sentence</strong><p>{approved}</p><button type="button" onClick={() => { setSpeaking(speak(approved, () => setSpeaking(false))); }}>Speak again</button>{speaking && <button type="button" className="secondary" onClick={() => { window.speechSynthesis.cancel(); setSpeaking(false); controller.speakingDone(); }}>Stop speech</button>}</div>}
          <div className="sign-intro-bottom">{calibrationOnly ? <><button type="button" className="sign-profile-bottom" onClick={() => { window.location.href = '/sign-introduction'; }}>← Back to introduction</button><button type="button" className="sign-intro-next" onClick={() => { window.location.href = '/sign-introduction'; }}>Continue to introduction →</button></> : <><button type="button" className="sign-profile-bottom" onClick={() => { window.location.href = '/sign-calibration'; }}>Manage profiles</button><button type="button" className="sign-intro-next" onClick={goDashboard}>Continue to dashboard →</button></>}</div>
        </section>
      </div>
      <p className="sign-intro-limit">Powered by <a href="https://github.com/nlevites/signchat" target="_blank" rel="noopener noreferrer">Signchat’s ASL classifier and sentence approach</a>. This recognises isolated ASL signs. Personal fingerspelling profiles recognise trained static letters for the selected signer; they do not identify a person automatically, translate unrestricted ASL, or detect moving J and Z. Camera video and calibration stay on this device. When needed, recognised labels, scores, and a completed spelled name are sent to Google Gemini. Review the suggestion before speaking.</p>
    </main>
  </div>;
}
