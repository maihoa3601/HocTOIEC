import {watch} from 'node:fs';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildProject} from './build.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
let server=null,rebuilding=false,pending=false,stopped=false,debounce;
const watchers=[];
function startServer() {
  server=spawn(process.execPath,[path.join(root,'scripts','preview.mjs')],{cwd:root,stdio:'inherit'});
  const child=server;
  child.on('error',error=>console.error('Preview:',error.message));
  child.on('exit',code=>{if(server===child){server=null;if(!stopped&&code)console.error('Preview stopped:',code)}});
}
async function stopServer() {
  const child=server;server=null;
  if(!child||child.exitCode!==null)return;
  await new Promise(resolve=>{child.once('exit',resolve);child.kill()});
}
async function rebuild() {
  pending=true;if(rebuilding||stopped)return;
  rebuilding=true;
  try {
    while(pending&&!stopped) {
      pending=false;
      await stopServer();
      try {const result=await buildProject();console.log('Built:',result.assets,'assets');if(!stopped)startServer()}
      catch(error){console.error('Build failed:',error.message,'\nFix the source and save again.');}
    }
  } finally {rebuilding=false}
}
const inputs=['src','public','data','drizzle','.openai','scripts'];
for(const input of inputs) {
  watchers.push(watch(path.join(root,input),{recursive:true},()=>{
    clearTimeout(debounce);debounce=setTimeout(()=>void rebuild(),250);
  }));
}
async function stop() {
  if(stopped)return;stopped=true;clearTimeout(debounce);
  for(const watcher of watchers)watcher.close();
  await stopServer();process.exit(0);
}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
await rebuild();
console.log('Watching src/, public/, data/, drizzle/ and build scripts. Reload the browser after a rebuild.');
