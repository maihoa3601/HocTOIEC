import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildHierarchy,folderTrail} from '../src/client/hierarchy.mjs';
import {isLearningResource,isVideo} from '../src/client/core.mjs';
const nodes=JSON.parse(await readFile(new URL('../data/catalog.json',import.meta.url),'utf8')).items,resources=nodes.filter(isLearningResource),before=JSON.stringify(nodes),index=buildHierarchy(nodes,resources),id='1pCQAKuQM_ywmrCbxjQeTb787sDgi8dfv';
const root=index.folders.get(id);assert.equal(root.videos.length,211);assert.equal(root.docs.length,87);assert.equal(root.folders[0].id,'1qbVEZO9dZBc65fKzCik7G6CbWIGY0PBE');
const grammar=index.folders.get('1ixwVv4yp-JzqET-iZXSzBywmUfSOtIGE');assert.ok(grammar.videos.every(f=>Number(f.name.match(/bài\s+(\d+)/i)[1])<18));
const listening=index.folders.get('ms-tham-listening'),reading=index.folders.get('ms-tham-reading');assert.ok(listening.videos.length>0&&reading.videos.length>0);assert.ok(listening.videos.every(f=>{const n=Number(f.name.match(/bài\s+(\d+)/i)[1]);return n>=18&&n<=27}));assert.ok(reading.videos.every(f=>Number(f.name.match(/bài\s+(\d+)/i)[1])>=28));
assert.equal(new Set([...grammar.videos,...listening.videos,...reading.videos].map(f=>f.id)).size,30);assert.equal(folderTrail(index,id,'ms-tham-listening').length,3);assert.equal(JSON.stringify(nodes),before,'Source catalog stays unchanged');console.log('Ms Tham: source counts, sequence, virtual chapters and original IDs verified');
