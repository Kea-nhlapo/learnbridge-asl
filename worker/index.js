// Built with the Sites Worker ESM starter. ASSETS is injected by scripts/build.mjs.
const baseHeaders = { 'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin' };
function jsonError(message, status) { return Response.json({error: message}, {status, headers: {...baseHeaders, 'cache-control':'no-store'}}); }
export default {
  async fetch(request) {
    const url = new URL(request.url);
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
