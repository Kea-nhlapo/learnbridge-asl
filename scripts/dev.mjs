import http from 'node:http';
import worker from '../dist/server/index.js';
const host='127.0.0.1',port=4173;
const server=http.createServer(async(req,res)=>{try{let body='';for await(const c of req){body+=c;if(body.length>10000){res.writeHead(413).end('Too large');return}}
 const request=new Request(`http://${host}:${port}${req.url}`,{method:req.method,headers:req.headers,...(body?{body}:{} )});
 const response=await worker.fetch(request,{},{});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
}catch(error){console.error(error.message);res.writeHead(500).end('Request failed')}});
server.listen(port,host,()=>console.log(`LearnBridge local preview: http://${host}:${port}`));
