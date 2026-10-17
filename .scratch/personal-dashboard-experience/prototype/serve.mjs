// THROWAWAY — localhost only; no Vault, Tauri, Codex, or persistence.
import { createReadStream } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('./', import.meta.url));
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};
createServer((req,res)=>{
  const path = decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const file = path === '/__app/styles.css' ? join(root,'../../../frontend/styles.css') : normalize(join(root,path === '/' ? 'index.html' : path.slice(1)));
  if(path !== '/__app/styles.css' && !file.startsWith(root)) return res.writeHead(404).end();
  const stream=createReadStream(file);
  stream.on('open',()=>{res.writeHead(200,{'Content-Type':mime[extname(file)]||'text/plain','Cache-Control':'no-store'});stream.pipe(res)});
  stream.on('error',()=>res.writeHead(404).end());
}).listen(Number(process.env.PD_EXPERIENCE_PORT||0),'127.0.0.1',function(){console.log(`Prototype: http://127.0.0.1:${this.address().port}/revised.html?page=today&variant=R`)});
