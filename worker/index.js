// Built with the Sites Worker ESM starter. ASSETS is injected by scripts/build.mjs.
const baseHeaders = { 'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin' };
function jsonError(message, status) { return Response.json({error: message}, {status, headers: {...baseHeaders, 'cache-control':'no-store'}}); }

// Free, hosted open-source models on Hugging Face Spaces (Gradio API). They share Hugging Face's free
// GPU allowance; setting HF_TOKEN (a free account token) gives a larger allowance.
const SPACES={
  asr:{en:{base:'https://hf-audio-whisper-large-v3.hf.space/gradio_api',endpoint:'transcribe_1',data:f=>[f,'transcribe']},   // Whisper large-v3 (MIT)
       zu:{base:'https://badrex-zulu-asr.hf.space/gradio_api',endpoint:'process_audio',data:f=>[f]}},                          // W2V-BERT 2.0 isiZulu (CC-BY-4.0)
  translate:{base:'https://unesco-nllb.hf.space',endpoint:'translate'},                                                         // NLLB-200 (CC-BY-NC-4.0)
  speak:{base:'https://k2-fsa-omnivoice.hf.space/gradio_api',endpoint:'_design_fn'}                                            // OmniVoice (CC-BY-NC weights)
};
const NLLB_NAMES={en:'English',zu:'Zulu',nso:'Northern Sotho'};
const VOICE_NAMES={en:'English',zu:'Zulu',nso:'Pedi'};
const BUSY='The free speech service is busy or its free GPU allowance is used up. Wait a few minutes and try again.';

async function gradioCall(space,data,env,file){
  const auth=env?.HF_TOKEN?{Authorization:`Bearer ${env.HF_TOKEN}`}:{};
  let fileData=null;
  if(file){
    const form=new FormData();form.append('files',new Blob([file.bytes],{type:file.type}),file.name);
    const up=await fetch(`${space.base}/upload`,{method:'POST',body:form,headers:auth,signal:AbortSignal.timeout(60000)});
    if(!up.ok)throw Error(BUSY);
    const [path]=await up.json();fileData={path,orig_name:file.name,mime_type:file.type,meta:{_type:'gradio.FileData'}};
  }
  const start=await fetch(`${space.base}/call/${space.endpoint}`,{method:'POST',headers:{...auth,'content-type':'application/json'},body:JSON.stringify({data:typeof data==='function'?data(fileData):data}),signal:AbortSignal.timeout(60000)});
  if(!start.ok)throw Error(BUSY);
  const {event_id}=await start.json();
  const stream=await fetch(`${space.base}/call/${space.endpoint}/${event_id}`,{headers:auth,signal:AbortSignal.timeout(180000)});
  const events=[...(await stream.text()).matchAll(/event: (\w+)\ndata: (.*)/g)];
  const done=events.find(([,e])=>e==='complete');
  if(!done)throw Error(BUSY);
  return JSON.parse(done[2]);
}
async function readJSON(request,limit){
  if(Number(request.headers.get('content-length')||0)>limit)return null;
  try{const body=await request.text();return body.length>limit?null:JSON.parse(body)}catch{return null}
}
// Split long text at sentence ends so each model call stays short.
export function chunkText(text,max=400){
  const parts=[];let current='';
  for(const sentence of String(text).match(/[^.!?\n]+[.!?]*\s*|\n+/g)||[]){
    if(current&&(current+sentence).length>max){parts.push(current.trim());current=''}
    current+=sentence;
    while(current.length>max){const cut=current.lastIndexOf(' ',max)>0?current.lastIndexOf(' ',max):max;parts.push(current.slice(0,cut).trim());current=current.slice(cut)}
  }
  if(current.trim())parts.push(current.trim());
  return parts.filter(Boolean);
}

// YouTube captions, the same way youtube-transcript-api does it: read the watch page's API key, ask the
// player API (Android client) for caption tracks, then download the chosen track. Prefer human captions.
const YT_LANGS={en:['en','en-GB','en-US','en-ZA'],zu:['zu'],nso:['nso']};
export function youtubeId(value){const match=String(value).match(/(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)([A-Za-z0-9_-]{11})/);return match?match[1]:null}
const decodeEntities=s=>s.replace(/&(?:#(\d+)|#x([0-9a-f]+)|(amp|lt|gt|quot|apos|#39));/gi,(m,d,h,n)=>d?String.fromCodePoint(+d):h?String.fromCodePoint(parseInt(h,16)):{amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",'#39':"'"}[n.toLowerCase()]);
export function captionsToText(xml){
  return [...String(xml).matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)].map(([,t])=>decodeEntities(decodeEntities(t)).replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim()).filter(Boolean).join(' ').replace(/\s+/g,' ').trim();
}
const YT_BLOCKED='YouTube did not share captions for this video right now. Paste the transcript instead.';
async function youtube(request,env){
  const data=await readJSON(request,2000);
  const id=data&&youtubeId(data.url);
  if(!id)return jsonError('That is not a YouTube video link.',400);
  const language=YT_LANGS[data.language]?data.language:'en';
  try{
    const headers={'Accept-Language':'en-US,en;q=0.9','User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'};
    let html=await (await fetch(`https://www.youtube.com/watch?v=${id}`,{headers,signal:AbortSignal.timeout(20000)})).text();
    if(html.includes('action="https://consent.youtube.com/s"')){const v=html.match(/name="v" value="(.*?)"/);if(v)html=await (await fetch(`https://www.youtube.com/watch?v=${id}`,{headers:{...headers,Cookie:`CONSENT=YES+${v[1]}`},signal:AbortSignal.timeout(20000)})).text()}
    const key=html.match(/"INNERTUBE_API_KEY":\s*"([a-zA-Z0-9_-]+)"/)?.[1];
    if(!key)throw Error(YT_BLOCKED);
    const player=await (await fetch(`https://www.youtube.com/youtubei/v1/player?key=${key}`,{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({context:{client:{clientName:'ANDROID',clientVersion:'20.10.38'}},videoId:id}),signal:AbortSignal.timeout(20000)})).json();
    const tracks=player?.captions?.playerCaptionsTracklistRenderer?.captionTracks||[];
    if(player?.playabilityStatus?.status&&player.playabilityStatus.status!=='OK'&&!tracks.length)throw Error(YT_BLOCKED);
    if(!tracks.length)return jsonError('This video has no captions. Paste or dictate a transcript instead.',404);
    const wanted=[...YT_LANGS[language],...(language==='en'?[]:YT_LANGS.en)];
    const rank=t=>{const i=wanted.findIndex(code=>t.languageCode===code||t.languageCode.startsWith(code+'-'));return (i<0?100:i)*2+(t.kind==='asr'?1:0)};
    const track=[...tracks].sort((a,b)=>rank(a)-rank(b))[0];
    if(rank(track)>=200)return jsonError(`This video has captions only in ${tracks.map(t=>t.name?.runs?.[0]?.text||t.languageCode).join(', ')}. Paste an English, isiZulu or Sepedi transcript instead.`,404);
    const xml=await (await fetch(track.baseUrl.replace('&fmt=srv3',''),{headers,signal:AbortSignal.timeout(20000)})).text();
    const text=captionsToText(xml);
    if(!text)throw Error(YT_BLOCKED);
    const captionLanguage=Object.entries(YT_LANGS).find(([,codes])=>codes.some(code=>track.languageCode===code||track.languageCode.startsWith(code+'-')))?.[0]||'en';
    let title=null;try{title=(await (await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`,{signal:AbortSignal.timeout(10000)})).json()).title||null}catch{}
    return Response.json({text,language:captionLanguage,automatic:track.kind==='asr',title},{headers:{...baseHeaders,'cache-control':'no-store'}});
  }catch(error){return jsonError(error.message===YT_BLOCKED?YT_BLOCKED:'YouTube could not be reached. Paste the transcript instead.',502)}
}
async function transcribe(request,url,env){
  const lang=url.searchParams.get('lang');
  if(lang==='nso')return jsonError('Automatic Sepedi transcription is not connected yet: no free hosted Sepedi speech model is available. Type or paste the Sepedi transcript instead.',501);
  const space=SPACES.asr[lang];if(!space)return jsonError('Choose English, isiZulu or Sepedi.',400);
  if(!(request.headers.get('content-type')||'').startsWith('audio/'))return jsonError('Send a WAV audio section.',415);
  const bytes=await request.arrayBuffer();
  if(bytes.byteLength<100||bytes.byteLength>4*1024*1024)return jsonError('Send audio in sections under 4 MB.',413);
  try{const [text]=await gradioCall(space,space.data,env,{bytes,name:'section.wav',type:'audio/wav'});return Response.json({text:String(text||'').trim()},{headers:{...baseHeaders,'cache-control':'no-store'}})}
  catch(error){return jsonError(error.message===BUSY?BUSY:'The transcription service could not be reached.',502)}
}
async function translate(request,env){
  const data=await readJSON(request,30000);
  if(!data||typeof data.text!=='string'||!data.text.trim()||data.text.length>20000)return jsonError('Provide up to 20,000 characters of text.',400);
  if(!NLLB_NAMES[data.from]||!NLLB_NAMES[data.to]||data.from===data.to)return jsonError('Choose two different languages: English, isiZulu or Sepedi.',400);
  try{
    const out=[];
    // Paragraphs are kept; each is translated in short pieces, a few at a time.
    for(const paragraph of data.text.split(/\n{2,}/)){
      const pieces=chunkText(paragraph);const translated=[];
      for(let i=0;i<pieces.length;i+=3)translated.push(...await Promise.all(pieces.slice(i,i+3).map(async piece=>(await gradioCall(SPACES.translate,[piece,NLLB_NAMES[data.from],NLLB_NAMES[data.to]],env))[0])));
      out.push(translated.join(' '));
    }
    return Response.json({text:out.join('\n\n')},{headers:{...baseHeaders,'cache-control':'no-store'}});
  }catch(error){return jsonError(error.message===BUSY?BUSY:'The translation service could not be reached.',502)}
}
async function speak(request,env){
  const data=await readJSON(request,5000);
  if(!data||typeof data.text!=='string'||!data.text.trim()||data.text.length>400)return jsonError('Provide 1–400 characters to read aloud.',400);
  if(!VOICE_NAMES[data.lang])return jsonError('Choose English, isiZulu or Sepedi.',400);
  try{
    const [audio]=await gradioCall(SPACES.speak,[data.text.trim(),VOICE_NAMES[data.lang],16,2.0,true,1.0,null,true,true,'Auto','Auto','Auto','Auto','Auto','Auto'],env);
    if(!audio?.url||!audio.url.startsWith('https://k2-fsa-omnivoice.hf.space/'))throw Error(BUSY);
    const response=await fetch(audio.url,{signal:AbortSignal.timeout(60000)});
    const bytes=await response.arrayBuffer();
    if(!response.ok||bytes.byteLength<100)throw Error(BUSY);
    return new Response(bytes,{headers:{...baseHeaders,'content-type':'audio/wav','cache-control':'no-store'}});
  }catch(error){return jsonError(error.message===BUSY?BUSY:'The voice service could not be reached.',502)}
}

export default {
  async fetch(request, env={}) {
    const url = new URL(request.url);
    if (['/api/transcribe','/api/translate','/api/speak','/api/youtube'].includes(url.pathname)) {
      if (request.method !== 'POST') return jsonError('Use POST.',405);
      const origin=request.headers.get('origin');
      if(origin && origin!==url.origin)return jsonError('Request must come from this learning workspace.',403);
      if(url.pathname==='/api/transcribe')return transcribe(request,url,env);
      if(url.pathname==='/api/translate')return translate(request,env);
      if(url.pathname==='/api/youtube')return youtube(request,env);
      return speak(request,env);
    }
    if (url.pathname === '/api/asl') {
      if (request.method !== 'POST') return jsonError('Use POST to request signing motion.',405);
      const origin=request.headers.get('origin');
      if(origin && origin!==url.origin)return jsonError('Request must come from this learning workspace.',403);
      if(Number(request.headers.get('content-length')||0)>5000)return jsonError('Use a short passage.',413);
      let data;try{const body=await request.text();if(body.length>5000)return jsonError('Use a short passage.',413);data=JSON.parse(body)}catch{return jsonError('Invalid request.',400)}
      if(typeof data.text!=='string'||!data.text.trim()||data.text.length>300)return jsonError('Provide 1–300 characters of English text.',400);
      const upstream=new URL('https://us-central1-sign-mt.cloudfunctions.net/spoken_text_to_signed_pose');
      upstream.searchParams.set('text',data.text.trim());upstream.searchParams.set('spoken','en');upstream.searchParams.set('signed','ase');
      try{
        const response=await fetch(upstream,{signal:AbortSignal.timeout(75000),headers:{Accept:'application/pose'}});
        if(!response.ok)return jsonError('The research signing service is unavailable. Please try again later.',502);
        const type=response.headers.get('content-type')||'';
        if(!type.includes('application/pose')&&!type.includes('application/octet-stream'))return jsonError('The signing service returned an unexpected result.',502);
        const bytes=await response.arrayBuffer();
        if(bytes.byteLength<50||bytes.byteLength>20*1024*1024)return jsonError('The signing result was empty or too large.',502);
        return new Response(bytes,{headers:{...baseHeaders,'content-type':'application/pose','cache-control':'no-store'}});
      }catch{return jsonError('The signing service timed out or could not be reached.',502)}
    }
    if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
    const path=url.pathname==='/'?'/index.html':url.pathname;
    const asset=ASSETS[path];
    if(!asset)return new Response('Not found',{status:404,headers:baseHeaders});
    return new Response(request.method==='HEAD'?null:asset.body,{headers:{...baseHeaders,'content-type':asset.type,'cache-control':'no-cache'}});
  }
};
