import {normalize,cleanTitle,isVideo,isLearningResource} from './core.mjs';
export const LEARNING_KEY='toeic-studio-learning-v1';
export const answerText=value=>String(value??'').normalize('NFKC').replace(/[’‘]/g,"'").trim().replace(/[.!?]+$/g,'').trim().replace(/\s+/g,' ').toLowerCase();
export function gradeQuestion(q,answer){
  const answered=answer!==undefined&&answer!==null&&String(answer).trim()!=='';
  const correct=answered&&(q.type==='text'?q.accept.some(a=>answerText(a)===answerText(answer)):Number(answer)===q.answer);
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
export function freshLearning(){return {version:1,drafts:{},attempts:[],wrong:[],cards:{},worksheets:{}};}
export function sanitizeLearning(value,bank,catalogIds){
  const clean=freshLearning(),v=value&&typeof value==='object'?value:{};
  const qids=new Set(bank.sets.flatMap(s=>s.questions.map(q=>q.id))),setIds=new Set([...bank.sets.map(s=>s.id),'review']),cardIds=new Set(bank.sets.flatMap(s=>(s.cards||[]).map(c=>c.id)));
  const answersFor=answers=>Object.fromEntries(Object.entries(answers&&typeof answers==='object'?answers:{}).filter(([id,a])=>qids.has(id)&&(typeof a==='number'||typeof a==='string'&&a.length<=1000)));
  for(const [id,d]of Object.entries(v.drafts||{}))if(setIds.has(id)&&d&&typeof d==='object')clean.drafts[id]={answers:answersFor(d.answers),startedAt:typeof d.startedAt==='number'?d.startedAt:Date.now()};
  clean.attempts=(Array.isArray(v.attempts)?v.attempts:[]).filter(a=>setIds.has(a.setId)&&Number.isFinite(a.total)&&a.total>0&&a.total<=300&&Number.isFinite(a.correct)&&a.correct>=0&&a.correct<=a.total&&typeof a.date==='string'&&Number.isFinite(Date.parse(a.date))).slice(-100).map(a=>({setId:a.setId,total:a.total,correct:a.correct,date:a.date,answers:answersFor(a.answers)}));
  clean.wrong=[...new Set((Array.isArray(v.wrong)?v.wrong:[]).filter(id=>qids.has(id)))];
  for(const [id,c]of Object.entries(v.cards||{}))if(cardIds.has(id)&&c&&Number.isFinite(c.due))clean.cards[id]={due:c.due,streak:Math.max(0,Math.min(10,Number(c.streak)||0))};
  for(const [id,w]of Object.entries(v.worksheets||{}))if(catalogIds.has(id)&&w&&typeof w==='object'){
    const count=Math.max(1,Math.min(100,Math.trunc(Number(w.count)||20))),answers={},checks={};
    for(const [n,a]of Object.entries(w.answers||{}))if(Number.isInteger(Number(n))&&Number(n)>=1&&Number(n)<=count&&typeof a==='string'&&a.length<=1000)answers[n]=a;
    for(const [n,a]of Object.entries(w.checks||{}))if(Number(n)>=1&&Number(n)<=count&&typeof a==='boolean')checks[n]=a;
    clean.worksheets[id]={count,answers,checks,submitted:Boolean(w.submitted)};
  }
  return clean;
}
export function applyQuizResult(state,setId,questions,answers){const score=gradeQuiz(questions,answers);state.attempts.push({setId,date:new Date().toISOString(),total:score.total,correct:score.correct,answers:{...answers}});state.attempts=state.attempts.slice(-100);const wrong=new Set(state.wrong);for(const r of score.results){if(r.correct)wrong.delete(r.id);else if(r.answered)wrong.add(r.id)}state.wrong=[...wrong];delete state.drafts[setId];return score;}
export function scheduleCard(record,remembered,now=Date.now()){const streak=remembered?Math.min(10,(record?.streak||0)+1):0;const days=remembered?[1,3,7,14,30][Math.min(streak-1,4)]:0;return {streak,due:now+(remembered?days*86400000:10*60000)};}
