import assert from 'node:assert/strict';
import {readFile,writeFile,access,readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildProject} from '../scripts/build.mjs';
import {contentMetadata} from '../scripts/lib/content.mjs';

const root=new URL('../',import.meta.url);
const bank=JSON.parse(await readFile(new URL('data/learning-bank.json',root),'utf8'));
const meta=contentMetadata(bank);
const built=await buildProject();
assert.equal(built.bankVersion,meta.bankVersion);
const first=await readFile(new URL('dist/server/index.js',root),'utf8');
// Production deploys a single Worker module; sibling client files are static assets.
assert.doesNotMatch(first,/^\s*import\s/m,'Worker must not import separate modules unavailable in production');
const mediaRoot=new URL('data/exam-media/',root);
const mediaFiles=(await readdir(mediaRoot,{recursive:true,withFileTypes:true})).filter(entry=>entry.isFile());
assert.equal(built.mediaFiles,mediaFiles.length);
for(const entry of mediaFiles) {
  const source=path.join(entry.parentPath,entry.name);
  const relative=path.relative(fileURLToPath(mediaRoot),source);
  assert.deepEqual(await readFile(path.join(fileURLToPath(root),'dist','client','exam-media',relative)),await readFile(source),'Missing or corrupted deployed media '+relative);
}
await writeFile(new URL('dist/client/stale.js',root),'This must not survive a clean build.');
await buildProject();
await assert.rejects(access(new URL('dist/client/stale.js',root)));
assert.equal(await readFile(new URL('dist/server/index.js',root),'utf8'),first,'Identical source must produce an identical Worker');
const worker=(await import(new URL('dist/server/index.js',root))).default;
const origin='https://build.toeic.test';
const get=path=>worker.fetch(new Request(origin+path));
const htmlResponse=await get('/'),html=await htmlResponse.text();assert.equal(htmlResponse.status,200);
assert.equal(html,await readFile(new URL('public/index.html',root),'utf8'));
for(const match of html.matchAll(/(?:src|href)="\.\/([^"]+)"/g))assert.equal((await get('/'+match[1])).status,200,'Missing HTML asset '+match[1]);
const bankResponse=await get('/learning-bank.json'),safe=await bankResponse.json();assert.equal(bankResponse.status,200);
assert.equal(safe.contentVersion,meta.bankVersion);assert.equal(safe.sets.flatMap(s=>s.questions).length,250);
for(const q of safe.sets.flatMap(s=>s.questions))for(const key of ['answer','accept','explanation'])assert.equal(Object.hasOwn(q,key),false,'Public bank leaked '+key);
for(const file of ['learning-bank.json','content-version.json'])await assert.rejects(access(new URL('dist/client/'+file,root)),'Dynamic content must not be shadowed by static hosting assets');
assert.deepEqual(await (await get('/api/learning-bank')).json(),safe);
assert.deepEqual(await (await get('/api/content-version')).json(),meta);
assert.ok((await readFile(new URL('dist/client/learning.mjs',root),'utf8')).includes("fetch('/api/learning-bank'"));
assert.ok((await readFile(new URL('dist/client/account-learning.mjs',root),'utf8')).includes("fetch('/api/content-version'"));
const catalog=JSON.parse(await readFile(new URL('data/catalog.json',root),'utf8'));assert.deepEqual(await (await get('/catalog.json')).json(),catalog);
assert.deepEqual(await (await get('/content-version.json')).json(),meta);
for(const file of ['server/index.js','src/server/index.mjs','data/learning-bank.json','data/import-bundles/unit11.review.json','import-bundles/unit11.review.json','.env.example'])assert.equal((await get('/'+file)).status,404);
assert.equal((await get('/api/admin/overview')).status,401);
const set=bank.sets[0],q=set.questions[0];
const result=await worker.fetch(new Request(origin+'/api/grade',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({setId:set.id,questionIds:[q.id],answers:{[q.id]:q.answer},bankVersion:meta.bankVersion,saveHistory:false})}));
assert.equal(result.status,200);const grade=await result.json();assert.equal(grade.score.correct,1);assert.equal(grade.questions[0].explanation,q.explanation);assert.equal(grade.historySaved,false);
for(const name of await readdir(new URL('src/client/',root))) {
  if(!/\.(?:mjs|js)$/.test(name))continue;
  const source=await readFile(new URL('src/client/'+name,root),'utf8');
  for(const match of source.matchAll(/from\s+['"]\.\/([^'"]+)['"]/g))assert.equal((await get('/'+match[1])).status,200,'Missing browser import '+match[1]);
}
console.log(JSON.stringify({ok:true,cleanReproducibleBuild:true,publicAssets:true,serverGrading:true,privateBank:true}));
