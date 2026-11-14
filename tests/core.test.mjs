import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {normalize,safeProgress,tagsFor,cleanTitle} from '../src/client/core.mjs';
const data=JSON.parse(await readFile(new URL('../data/catalog.json',import.meta.url),'utf8'));
const ids=new Set(data.items.map(f=>f.id));
assert.equal(ids.size,data.items.length,'Catalog must not duplicate file IDs');
assert.equal(data.items.filter(f=>f.parent===data.rootId&&f.mime.endsWith('.folder')).length,20);
assert.ok(data.items.some(f=>f.mime.startsWith('video/')),'Real videos must be indexed');
for(const f of data.items){assert.ok(f.id&&f.name&&f.mime&&f.parent&&f.course);assert.ok(f.parent===data.rootId||ids.has(f.parent),'All parent folders must exist');assert.match(f.id,/^[A-Za-z0-9_-]+$/)}
assert.equal(normalize('Động từ & Ngữ pháp'),'dong tu & ngu phap');
assert.equal(cleanTitle('Bài 02- Cấu trúc câu.MP4.mp4'),'Bài 02- Cấu trúc câu');
assert.ok(tagsFor('PART 2. QUESTION RESPONSE (HỎI ĐÁP)').includes('Listening'));
assert.ok(!tagsFor('COMBO 4 KHÓA HỌC TOEIC IIG VIETNAM').includes('Speaking & Writing'));
assert.ok(tagsFor('LUYỆN THI TOEIC NÓI - VIẾT').includes('Speaking & Writing'));
assert.equal(cleanTitle('PRE-TOEIC [Dành cho người mới bắt đầu]'),'PRE-TOEIC [Dành cho người mới bắt đầu]');
const known=data.items.find(f=>f.mime.startsWith('video/')).id;
const checked=safeProgress({completed:{[known]:'2026-11-12T10:00:00Z',bad:'x'},notes:{[known]:'Một ghi chú',bad:'private'},saved:[known,known,'bad'],goal:999,daily:100},ids);
assert.deepEqual(checked.saved,[known]);assert.equal(checked.goal,650);assert.equal(checked.daily,1);assert.deepEqual(Object.keys(checked.completed),[known]);assert.deepEqual(Object.keys(checked.notes),[known]);
console.log(JSON.stringify({ok:true,items:data.items.length,videos:data.items.filter(f=>f.mime.startsWith('video/')).length,incompleteFolders:data.incompleteFolders}));
