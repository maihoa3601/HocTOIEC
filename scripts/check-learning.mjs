import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildHierarchy} from '../dist/hierarchy.mjs';
import {isLearningResource} from '../dist/core.mjs';
import {answerText,gradeQuestion,gradeQuiz,freshLearning,sanitizeLearning,applyQuizResult,materialRole,studyMaterials,scheduleCard} from '../dist/learning-core.mjs';
const catalog=JSON.parse(await readFile(new URL('../dist/catalog.json',import.meta.url),'utf8'));
const bank=JSON.parse(await readFile(new URL('../dist/learning-bank.json',import.meta.url),'utf8'));
const byId=new Map(catalog.items.map(f=>[f.id,f])),ids=new Set(byId.keys());
const qids=new Set(),cardIds=new Set();
for(const set of bank.sets){
  assert.ok(byId.has(set.courseId)&&byId.has(set.folderId));
  for(const source of set.sources){assert.ok(byId.has(source.id));assert.equal(byId.get(source.id).course,set.courseId);assert.match(source.url,/^https:\/\/drive\.google\.com\/file\/d\//);}
  for(const q of set.questions){
    assert.ok(!qids.has(q.id));qids.add(q.id);
    assert.ok(q.prompt&&q.explanation&&q.page>0);
    assert.ok(set.sources.some(s=>s.id===q.sourceId&&s.pages.includes(q.page)));
    assert.ok(!/zalo|0333800642/i.test(q.prompt+q.explanation));
    if(q.type==='choice'){assert.ok(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<q.options.length);assert.equal(new Set(q.options).size,q.options.length);assert.equal(gradeQuestion(q,q.answer).correct,true)}
    else {assert.ok(q.accept.length);for(const a of q.accept)assert.equal(gradeQuestion(q,a).correct,true)}
  }
  for(const c of set.cards){assert.ok(!cardIds.has(c.id));cardIds.add(c.id);assert.ok(c.front&&c.back&&set.sources.some(s=>s.id===c.sourceId&&s.pages.includes(c.page)));}
  const right=Object.fromEntries(set.questions.map(q=>[q.id,q.type==='text'?q.accept[0]:q.answer]));
  assert.equal(gradeQuiz(set.questions,right).percent,100);
  assert.equal(gradeQuiz(set.questions,{}).unanswered,set.questions.length);
}
const first=bank.sets[0],q=first.questions[0],state=freshLearning();
assert.equal(gradeQuestion(q,'').answered,false);
assert.equal(gradeQuestion({...q,answer:0},0).correct,true,'Option A is a valid response');
assert.equal(answerText('  IT’S a desk!  '),"it's a desk");
applyQuizResult(state,first.id,[q],{[q.id]:(q.answer+1)%q.options.length});assert.deepEqual(state.wrong,[q.id]);
applyQuizResult(state,first.id,[q],{[q.id]:q.answer});assert.deepEqual(state.wrong,[]);
applyQuizResult(state,first.id,[q],{});assert.deepEqual(state.wrong,[],'Blank answers must not become mistakes');
const restored=sanitizeLearning({wrong:[q.id,q.id,'unknown'],drafts:{[first.id]:{answers:{[q.id]:0,unknown:'x'}}},worksheets:{[first.sources[0].id]:{count:3,answers:{1:'A',4:'D'},checks:{1:true,4:false},submitted:true},unknown:{count:20}},cards:{unknown:{due:1}}},bank,ids);
assert.deepEqual(restored.wrong,[q.id]);assert.deepEqual(restored.drafts[first.id].answers,{[q.id]:0});
assert.deepEqual(restored.worksheets[first.sources[0].id].answers,{1:'A'});assert.equal(Object.keys(restored.worksheets).length,1);assert.deepEqual(restored.cards,{});
const index=buildHierarchy(catalog.items,catalog.items.filter(isLearningResource));
const materials=studyMaterials(index,'1VEUCHLSxBRPh--pkDaN-NJCiRxlIcg0i');
assert.equal(materials.related,false);
for(const [id,role]of [['1Xpyx5BBncV9ookRLFAFbFdKHRmh2Gbgf','video'],['1OAAbYlzBi6H9rXSUyptNFg0T9n6tyoWJ','theory'],['1GFIEtmxAL004SdKMkJYi-60u6obtylfz','exercises'],['1Otzvfh5a48AI-NSmbacog6oHHfK3I9Al','answers']]){
 assert.equal(materialRole(byId.get(id)),role);assert.ok([...materials.videos,...materials.docs].some(f=>f.id===id));
}
assert.equal(scheduleCard(null,true,0).due,86400000);assert.equal(scheduleCard({streak:1},true,0).due,3*86400000);assert.equal(scheduleCard({streak:5},false,0).due,600000);
console.log(JSON.stringify({ok:true,sets:bank.sets.length,questions:qids.size,cards:cardIds.size,pairedDocuments:materials.docs.length}));

const newState=freshLearning(),modeKey=first.id+':cloze';newState.drafts[first.id]={answers:{[q.id]:0}};newState.drafts[modeKey]={answers:{[q.id]:0}};applyQuizResult(newState,first.id,[q],{[q.id]:q.answer},modeKey);assert.ok(newState.drafts[first.id]);assert.equal(newState.drafts[modeKey],undefined,'Submitting a mode preserves the comprehensive draft');
const modeSaved=sanitizeLearning({drafts:{[modeKey]:{answers:{[q.id]:0}}},lessonRead:{[first.id]:'2026-11-13T10:00:00Z',unknown:'x'},games:[{setId:first.id,type:'match',total:6,correct:6,tries:8,date:'2026-11-13T10:00:00Z'},{setId:'unknown',type:'match',total:6,correct:6,tries:8,date:'2026-11-13T10:00:00Z'}]},bank,ids);assert.ok(modeSaved.drafts[modeKey]);assert.equal(Object.keys(modeSaved.lessonRead).length,1);assert.equal(modeSaved.games.length,1);
for(const set of bank.sets)for(const section of set.lesson?.sections||[]){assert.ok(section.heading&&section.points.length);assert.ok(set.sources.some(s=>s.id===section.sourceId&&s.pages.includes(section.page)));for(const example of section.examples||[]){assert.ok(example.en&&example.vi);if(example.sourceId)assert.ok(set.sources.some(s=>s.id===example.sourceId&&s.pages.includes(example.page)));}}
console.log(JSON.stringify({ok:true,modeDrafts:true,newProgressFields:true,lessonSources:true}));
