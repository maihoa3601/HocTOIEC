import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),dist=new URL('dist/',root),assets={};
const types={html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',js:'text/javascript; charset=utf-8',mjs:'text/javascript; charset=utf-8',json:'application/json; charset=utf-8',svg:'image/svg+xml'};
for(const entry of await readdir(dist,{withFileTypes:true})){if(!entry.isFile())continue;const ext=entry.name.split('.').at(-1);if(!types[ext])throw Error('Unhandled asset '+entry.name);assets['/'+entry.name]={body:await readFile(new URL(entry.name,dist),'utf8'),type:types[ext]}}
const bank=JSON.parse(assets['/learning-bank.json'].body),hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex'),bankVersion=hash(bank),questionVersions=Object.fromEntries(bank.sets.flatMap(s=>s.questions.map(q=>[q.id,hash(q)])));
const metadata={bankVersion,questionVersions};assets['/content-version.json']={body:JSON.stringify(metadata),type:types.json};await writeFile(new URL('content-version.json',dist),JSON.stringify(metadata));
assets['/learning-bank.json'].body=JSON.stringify({...bank,contentVersion:bankVersion,questionVersions});
const worker=await readFile(new URL('worker/index.mjs',root),'utf8');await mkdir(new URL('server/',dist),{recursive:true});await mkdir(new URL('.openai/',dist),{recursive:true});await writeFile(new URL('server/index.js',dist),worker+'\nexport default createWorker('+JSON.stringify({assets,bank,...metadata})+');\n');await writeFile(new URL('.openai/hosting.json',dist),await readFile(new URL('.openai/hosting.json',root)));
console.log(JSON.stringify({bankVersion,assets:Object.keys(assets).length,questions:Object.keys(questionVersions).length}));
