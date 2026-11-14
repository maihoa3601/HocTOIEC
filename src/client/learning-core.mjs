import {freshPlanner,sanitizePlanner} from './planner-core.mjs';
import {normalize,cleanTitle,isVideo,isLearningResource} from './core.mjs';
export const LEARNING_KEY='toeic-studio-learning-v1';
export const answerText=value=>String(value??'').normalize('NFKC').replace(/[’‘]/g,"'").replace(/[,;:]/g,'').trim().replace(/[.!?]+$/g,'').trim().replace(/\s+/g,' ').toLowerCase();
export function gradeQuestion(q,answer){
  const answered=answer!==undefined&&answer!==null&&String(answer).trim()!=='';
  const correct=answered&&!(q.type==='text'?Array.isArray(q.accept):Number.isInteger(q.answer))?null:answered&&(q.type==='text'?q.accept.some(a=>answerText(a)===answerText(answer)):Number(answer)===q.answer);
  return {id:q.id,answered,correct,answer:answered?answer:null};
}
export function gradeQuiz(questions,answers){const results=questions.map(q=>gradeQuestion(q,answers[q.id]));const correct=results.filter(r=>r.correct).length;return {total:questions.length,correct,unanswered:results.filter(r=>!r.answered).length,percent:questions.length?Math.round(100*correct/questions.length):0,results};}
export function materialRole(file){
  if(isVideo(file))return 'video';if(file.mime.startsWith('audio/'))return 'audio';
  const title=normalize(cleanTitle(file.name));
  if(/^(da[_ .-]|dap an|dapan|answer|key)|loi giai/.test(title))return 'answers';
  if(/thi\s*online|thionline|bai thi|bai tap|exercise|quiz|test/.test(title))return 'exercises';
  return 'theory';
}
export const roleLabel=role=>({video:'Video bài giảng',audio:'Âm thanh',answers:'Đáp án / lời giải',exercises:'Đề & bài tập',theory:'Tài liệu học'})[role];
export function studyMaterials(index,folderId){
  let entry=index.folders.get(folderId);if(!entry)return {videos:[],docs:[],related:false};
  const videos=entry.videos.slice();let docs=entry.docs.slice(),related=false,level=0;
  // Prefer the actual topic. If a video-only branch has separate exercise
  // siblings, find the nearest chapter and rank documents by topic words.
  if(!docs.length){const topic=normalize(entry.node.name).replace(/\b(lesson|bai|phan|chuong|section|video|giang)\b|\d+/g,' ').split(/[^a-z]+/).filter(t=>t.length>2);let parent=entry.node.parent;
    while(index.folders.has(parent)&&level++<3){const candidate=index.folders.get(parent);if(candidate.docs.length){const ranked=candidate.docs.map(f=>({f,score:topic.filter(t=>normalize((f.path||'')+' '+f.name).includes(t)).length})).sort((a,b)=>b.score-a.score);docs=ranked.filter(x=>x.score>=Math.min(2,topic.length)&&x.score>0).map(x=>x.f);if(!docs.length&&candidate.docs.length<=40)docs=candidate.docs.slice();if(docs.length){related=true;break}}parent=candidate.node.parent;}
  }
  docs=docs.filter(isLearningResource).sort((a,b)=>materialRole(a).localeCompare(materialRole(b))||a.name.localeCompare(b.name,'vi',{numeric:true}));
  return {videos,docs,related};
}
export function freshLearning(){return {version:1,drafts:{},attempts:[],responses:{},wrong:[],cards:{},worksheets:{},lessonRead:{},games:[],planner:freshPlanner()};}
const recordedAnswer=answer=>typeof answer==='number'?Number.isFinite(answer):typeof answer==='string'&&answer.length<=1000&&Boolean(answer.trim());
function recordResponse(target,id,answer,date,correct,version){if(!recordedAnswer(answer)||typeof date!=='string'||!Number.isFinite(Date.parse(date)))return;const prior=Object.hasOwn(target,id)?target[id]:null;if(!prior||Date.parse(date)>=Date.parse(prior.date))target[id]={answer,date,...(typeof correct==='boolean'?{correct}:{}),...(typeof version==='string'?{version}:{})};}
export function learningHistory(state){const attempts=Array.isArray(state?.attempts)?state.attempts:[];const responses=Object.entries(state?.responses||{}).filter(([,record])=>record&&recordedAnswer(record.answer)&&typeof record.date==='string'&&Number.isFinite(Date.parse(record.date))).map(([id,record])=>({setId:'responses',date:record.date,answers:{[id]:record.answer},outcomes:typeof record.correct==='boolean'?{[id]:record.correct}:{}}));return [...attempts,...responses];}
export function sanitizeLearning(value,bank,catalogIds){
  const clean=freshLearning(),v=value&&typeof value==='object'?value:{};
  const qids=new Set(bank.sets.flatMap(s=>s.questions.map(q=>q.id))),setIds=new Set([...bank.sets.map(s=>s.id),'review','smart']),draftIds=new Set([...setIds,...bank.sets.flatMap(s=>['choice','cloze','correction','translation'].map(mode=>s.id+':'+mode))]),cardIds=new Set(bank.sets.flatMap(s=>(s.cards||[]).map(c=>c.id)));
  const answersFor=answers=>Object.fromEntries(Object.entries(answers&&typeof answers==='object'?answers:{}).filter(([id,a])=>qids.has(id)&&(typeof a==='number'||typeof a==='string'&&a.length<=1000)));
  for(const [id,d]of Object.entries(v.drafts||{}))if(draftIds.has(id)&&d&&typeof d==='object')clean.drafts[id]={answers:answersFor(d.answers),startedAt:Number.isFinite(d.startedAt)?d.startedAt:Date.now(),index:Math.max(0,Math.min(299,Math.trunc(Number(d.index)||0))),updatedAt:Number.isFinite(d.updatedAt)?d.updatedAt:Date.now(),bankVersion:typeof d.bankVersion==='string'?d.bankVersion:undefined,gradeId:typeof d.gradeId==='string'&&/^[a-zA-Z0-9_-]{8,100}$/.test(d.gradeId)?d.gradeId:undefined,questionIds:(Array.isArray(d.questionIds)?d.questionIds:[]).filter(id=>qids.has(id)).slice(0,300)};
  const outcomesFor=(value,attempt)=>{const out=Object.fromEntries(Object.entries(value||{}).filter(([id,v])=>qids.has(id)&&typeof v==='boolean')),answered=Object.entries(answersFor(attempt.answers)).filter(([,a])=>String(a).trim());if(answered.length&&(attempt.correct===0||attempt.correct===answered.length))for(const [id]of answered)if(!Object.hasOwn(out,id))out[id]=attempt.correct>0;return out};
  const attempts=(Array.isArray(v.attempts)?v.attempts:[]).filter(a=>setIds.has(a.setId)&&Number.isFinite(a.total)&&a.total>0&&a.total<=300&&Number.isFinite(a.correct)&&a.correct>=0&&a.correct<=a.total&&typeof a.date==='string'&&Number.isFinite(Date.parse(a.date))).map(a=>({setId:a.setId,total:a.total,correct:a.correct,date:a.date,answers:answersFor(a.answers),outcomes:outcomesFor(a.outcomes,a),mode:['choice','cloze','correction','translation'].includes(a.mode)?a.mode:'all'}));
  clean.attempts=attempts.slice(-100);
  for(const attempt of attempts)for(const [id,answer]of Object.entries(attempt.answers))recordResponse(clean.responses,id,answer,attempt.date,attempt.outcomes?.[id]);
  for(const [id,record]of Object.entries(v.responses||{}))if(qids.has(id)&&record&&typeof record==='object')recordResponse(clean.responses,id,record.answer,record.date,record.correct,record.version);
  clean.wrong=[...new Set((Array.isArray(v.wrong)?v.wrong:[]).filter(id=>qids.has(id)))];
  for(const [id,c]of Object.entries(v.cards||{}))if(cardIds.has(id)&&c&&Number.isFinite(c.due))clean.cards[id]={due:c.due,streak:Math.max(0,Math.min(10,Number(c.streak)||0)),rating:['again','hard','good','easy'].includes(c.rating)?c.rating:undefined,lastReviewed:typeof c.lastReviewed==='string'&&Number.isFinite(Date.parse(c.lastReviewed))?c.lastReviewed:undefined,reviews:Math.max(0,Math.trunc(Number(c.reviews)||0))};
  for(const [id,w]of Object.entries(v.worksheets||{}))if(catalogIds.has(id)&&w&&typeof w==='object'){
    const count=Math.max(1,Math.min(100,Math.trunc(Number(w.count)||20))),answers={},checks={};
    for(const [n,a]of Object.entries(w.answers||{}))if(Number.isInteger(Number(n))&&Number(n)>=1&&Number(n)<=count&&typeof a==='string'&&a.length<=1000)answers[n]=a;
    for(const [n,a]of Object.entries(w.checks||{}))if(Number(n)>=1&&Number(n)<=count&&typeof a==='boolean')checks[n]=a;
    clean.worksheets[id]={count,answers,checks,submitted:Boolean(w.submitted)};
  }
  for(const [id,date] of Object.entries(v.lessonRead||{}))if(setIds.has(id)&&typeof date==='string'&&Number.isFinite(Date.parse(date)))clean.lessonRead[id]=date;
  clean.games=(Array.isArray(v.games)?v.games:[]).filter(g=>bank.sets.some(s=>s.id===g.setId)&&['match','order'].includes(g.type)&&Number.isInteger(g.total)&&g.total>0&&g.total<=100&&Number.isInteger(g.correct)&&g.correct>=0&&g.correct<=g.total&&Number.isInteger(g.tries)&&g.tries>=0&&g.tries<=10000&&typeof g.date==='string'&&Number.isFinite(Date.parse(g.date))).slice(-100).map(g=>({setId:g.setId,type:g.type,total:g.total,correct:g.correct,tries:g.tries,date:g.date}));
  clean.planner=sanitizePlanner(v.planner,bank);
  return clean;
}
export function applyQuizResult(state,setId,questions,answers,draftKey=setId,verifiedScore){const score=verifiedScore||gradeQuiz(questions,answers),date=new Date().toISOString();state.responses||={};for(const result of score.results)if(result.answered)recordResponse(state.responses,result.id,result.answer,date,result.correct,questions.find(q=>q.id===result.id)?.version);state.attempts.push({setId,date,total:score.total,correct:score.correct,answers:{...answers},outcomes:Object.fromEntries(score.results.filter(r=>r.answered&&typeof r.correct==='boolean').map(r=>[r.id,r.correct]))});state.attempts=state.attempts.slice(-100);const wrong=new Set(state.wrong);for(const r of score.results){if(r.correct)wrong.delete(r.id);else if(r.answered)wrong.add(r.id)}state.wrong=[...wrong];delete state.drafts[draftKey];return score;}
export function scheduleCard(record,remembered,now=Date.now()){const streak=remembered?Math.min(10,(record?.streak||0)+1):0;const days=remembered?[1,3,7,14,30][Math.min(streak-1,4)]:0;return {streak,due:now+(remembered?days*86400000:10*60000)};}
