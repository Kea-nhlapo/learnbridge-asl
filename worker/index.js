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
    if (['/api/transcribe','/api/translate','/api/speak'].includes(url.pathname)) {
      if (request.method !== 'POST') return jsonError('Use POST.',405);
      const origin=request.headers.get('origin');
      if(origin && origin!==url.origin)return jsonError('Request must come from this learning workspace.',403);
      if(url.pathname==='/api/transcribe')return transcribe(request,url,env);
      if(url.pathname==='/api/translate')return translate(request,env);
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
