import http from 'node:http';
import worker from '../dist/server/index.js';
const host='127.0.0.1',port=4173;
// Audio sections for transcription are binary and up to 4 MB.
const server=http.createServer(async(req,res)=>{try{const chunks=[];let size=0;for await(const c of req){size+=c.length;if(size>5*1024*1024){res.writeHead(413).end('Too large');return}chunks.push(c)}
 const body=Buffer.concat(chunks);
 const request=new Request(`http://${host}:${port}${req.url}`,{method:req.method,headers:req.headers,...(body.length?{body}:{} )});
 const response=await worker.fetch(request,{HF_TOKEN:process.env.HF_TOKEN},{});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
}catch(error){console.error(error.message);res.writeHead(500).end('Request failed')}});
server.listen(port,host,()=>console.log(`LearnBridge local preview: http://${host}:${port}`));
