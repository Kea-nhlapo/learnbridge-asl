import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('dist');
const types = {'.html':'text/html; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};
http.createServer((request,response)=>{
  const target = path.resolve(root, '.' + decodeURIComponent(new URL(request.url,'http://localhost').pathname));
  if (!target.startsWith(root + path.sep) && target !== root) {response.writeHead(403).end();return;}
  fs.readFile(target === root ? path.join(root,'index.html') : target,(error,data)=>{
    if(error){response.writeHead(404).end('Not found');return;}
    response.writeHead(200,{'content-type':types[path.extname(target)] || 'application/octet-stream'}).end(data);
  });
}).listen(8765,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:8765'));
