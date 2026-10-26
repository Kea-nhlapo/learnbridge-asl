// Transcription, translation and voice requests to the same-origin gateway (worker/index.js).
const SAMPLE_RATE=16000, SECTION_SECONDS=25;

async function postJSON(path,body,signal){
  const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal});
  if(!response.ok){const detail=await response.json().catch(()=>({}));throw Error(detail.error||`The service returned an error (${response.status}).`)}
  return response;
}
// 16 kHz mono 16-bit PCM WAV.
export function encodeWAV(samples){
  const buffer=new ArrayBuffer(44+samples.length*2),view=new DataView(buffer);
  const text=(offset,s)=>[...s].forEach((c,i)=>view.setUint8(offset+i,c.charCodeAt(0)));
  text(0,'RIFF');view.setUint32(4,36+samples.length*2,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,SAMPLE_RATE,true);view.setUint32(28,SAMPLE_RATE*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,samples.length*2,true);
  samples.forEach((s,i)=>view.setInt16(44+i*2,Math.max(-1,Math.min(1,s))*0x7fff,true));
  return new Blob([buffer],{type:'audio/wav'});
}
// Split at the quietest moment near each section end, so words are not cut in half.
export function sectionBounds(samples,sectionLength=SAMPLE_RATE*SECTION_SECONDS){
  const bounds=[];let start=0;
  while(samples.length-start>sectionLength){
    const window=SAMPLE_RATE*3,step=SAMPLE_RATE/50;let best=start+sectionLength,quietest=Infinity;
    for(let at=start+sectionLength-window;at<start+sectionLength;at+=step){let energy=0;for(let i=at;i<at+step;i++)energy+=samples[i]*samples[i];if(energy<quietest){quietest=energy;best=at}}
    bounds.push([start,best]);start=best;
  }
  bounds.push([start,samples.length]);
  return bounds;
}
// Audio or video file -> 16 kHz mono samples (the browser decodes the file's audio track).
async function decodeToMono16k(file){
  const context=new AudioContext();
  let decoded;try{decoded=await context.decodeAudioData(await file.arrayBuffer())}catch{throw Error('This browser could not read the audio in this file. Try an MP3, WAV, M4A, MP4 or WebM file.')}finally{context.close()}
  const offline=new OfflineAudioContext(1,Math.ceil(decoded.duration*SAMPLE_RATE),SAMPLE_RATE);
  const source=offline.createBufferSource();source.buffer=decoded;source.connect(offline.destination);source.start();
  return (await offline.startRendering()).getChannelData(0);
}
export async function transcribeFile(file,language,onProgress=()=>{},signal){
  if(language==='nso')throw Error('Automatic Sepedi transcription is not connected yet. Type or paste the Sepedi transcript.');
  onProgress('Reading the audio…');
  const samples=await decodeToMono16k(file);
  if(samples.length<SAMPLE_RATE/2)throw Error('The recording is too short to transcribe.');
  const bounds=sectionBounds(samples),parts=[];
  for(const [i,[start,end]] of bounds.entries()){
    onProgress(`Transcribing part ${i+1} of ${bounds.length}… (free service, this can take a minute)`);
    const response=await fetch(`/api/transcribe?lang=${encodeURIComponent(language)}`,{method:'POST',headers:{'Content-Type':'audio/wav'},body:encodeWAV(samples.subarray(start,end)),signal});
    if(!response.ok){const detail=await response.json().catch(()=>({}));throw Error(detail.error||`Transcription failed (${response.status}).`)}
    const {text}=await response.json();if(text)parts.push(text);
  }
  return parts.join(' ').replace(/\s+/g,' ').trim();
}
export async function translateText(text,from,to,signal){
  const response=await postJSON('/api/translate',{text,from,to},signal);
  return (await response.json()).text;
}
// Short pieces (under 400 characters) for the voice service.
export function voiceChunks(text,max=300){
  const pieces=[];let current='';
  for(const sentence of String(text).match(/[^.!?\n]+[.!?]*\s*/g)||[]){
    if(current&&(current+sentence).length>max){pieces.push(current.trim());current=''}
    current+=sentence;
    while(current.length>max){const cut=current.lastIndexOf(' ',max)>0?current.lastIndexOf(' ',max):max;pieces.push(current.slice(0,cut).trim());current=current.slice(cut)}
  }
  if(current.trim())pieces.push(current.trim());
  return pieces.filter(p=>/[\p{L}\p{N}]/u.test(p));
}
const voiceCache=new Map();
export async function speakAudio(text,language,signal){
  const key=`${language}:${text}`;
  if(!voiceCache.has(key)){
    const blob=await (await postJSON('/api/speak',{text,lang:language},signal)).blob();
    if(voiceCache.size>=30)voiceCache.delete(voiceCache.keys().next().value);
    voiceCache.set(key,blob);
  }
  return voiceCache.get(key);
}
