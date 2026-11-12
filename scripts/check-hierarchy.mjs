import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {courseGroups,buildHierarchy,folderTrail,searchFolder,learningSort,resourceLabel} from '../dist/hierarchy.mjs';
import {isFolder,isVideo} from '../dist/core.mjs';
const data=JSON.parse(await readFile(new URL('../dist/catalog.json',import.meta.url),'utf8'));
const courses=data.items.filter(n=>n.parent===data.rootId&&isFolder(n));
const membership=courseGroups.flatMap(g=>g.courses);
assert.equal(new Set(membership).size,20,'Every course has exactly one primary group');
assert.deepEqual([...membership].sort(),courses.map(c=>c.id).sort());
const files=data.items.filter(n=>!isFolder(n)),index=buildHierarchy(data.items,files);
for(const c of courses){const e=index.folders.get(c.id);assert.equal(e.videos.length,files.filter(f=>f.course===c.id&&isVideo(f)).length);assert.equal(e.docs.length,files.filter(f=>f.course===c.id&&!isVideo(f)).length)}
for(const [id,e]of index.folders){assert.equal(e.videos.length,e.files.filter(isVideo).length+e.folders.reduce((sum,f)=>sum+index.folders.get(f.id).videos.length,0),'All chapter videos remain reachable');assert.equal(e.docs.length,e.files.filter(f=>!isVideo(f)).length+e.folders.reduce((sum,f)=>sum+index.folders.get(f.id).docs.length,0),'All chapter documents remain reachable');for(const f of e.files)assert.equal(f.parent,id)}
const prep=courses.find(c=>/PREP/.test(c.name)),root=index.folders.get(prep.id),deep=root.videos.find(v=>folderTrail(index,prep.id,v.parent).length>=4);
assert.ok(deep);const trail=folderTrail(index,prep.id,deep.parent);assert.equal(trail[0].id,prep.id);assert.equal(trail.at(-1).id,deep.parent);for(let i=1;i<trail.length;i++)assert.equal(trail[i].parent,trail[i-1].id);
assert.equal(folderTrail(index,prep.id,courses.find(c=>c.id!==prep.id).id).length,1,'A foreign folder must fall back to the correct course');
assert.ok(searchFolder(root,deep.name).some(f=>f.id===deep.id),'Search finds lessons deeper than the current level');
assert.deepEqual(['Chương 10','Chương 2','Chương 1'].map(name=>({name})).sort(learningSort).map(f=>f.name),['Chương 1','Chương 2','Chương 10']);
assert.equal(resourceLabel({name:'1.mp4',mime:'video/mp4'},'Lesson 3: Động từ'),'Video 1 · Lesson 3: Động từ');
assert.equal(resourceLabel({name:'2.PNG',mime:'image/png'},'SECTION 1'),'Ảnh 2 · SECTION 1');
console.log(JSON.stringify({ok:true,groups:courseGroups.length,courses:courses.length,folders:index.folders.size,resources:files.length,deepNavigationLevels:trail.length}));
