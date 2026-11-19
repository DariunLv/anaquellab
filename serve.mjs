import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve('dist');
const headers=Object.fromEntries(JSON.parse(await readFile('vercel.json','utf8')).headers[0].headers.map(h=>[h.key,h.value]));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.wasm':'application/wasm','.png':'image/png','.svg':'image/svg+xml'};
http.createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname); const p=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!p.startsWith(root+sep))throw Error();const data=await readFile(p);res.writeHead(200,{...headers,'Content-Type':types[extname(p)]||'application/octet-stream'});res.end(data);}catch{res.writeHead(404);res.end('No encontrado');}}).listen(4173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4173'));
