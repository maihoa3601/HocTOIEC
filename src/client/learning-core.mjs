import {freshPlanner,sanitizePlanner} from './planner-core.mjs';
import {normalize,cleanTitle,isVideo,isLearningResource} from './core.mjs';
export const LEARNING_KEY='toeic-studio-learning-v1';
export const MISTAKE_REASONS={vocab:'Thiếu từ vựng',grammar:'Sai ngữ pháp',reading:'Đọc thiếu thông tin',trap:'Bẫy TOEIC',careless:'Nhầm / Vội'};
export function formatDuration(ms){const total=Math.max(0,Math.floor((Number(ms)||0)/1000)),h=Math.floor(total/3600),m=Math.floor((total%3600)/60),s=total%60;return h?`${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
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
export function freshLearning(){
  return {
    version:1,
    drafts:{},
    attempts:[],
    responses:{},
    wrong:[],
    mistakeMeta:{},
    cards:{},
    worksheets:{},
    lessonRead:{},
    games:[],
    planner:freshPlanner(),
    timeBudget:30,
    priorityCourse:'1EcEHLSxxlsRFtJCXMGimzy2rKd2Ej-zD',
    lessonStatus:{},
    flaggedLessons:[],
    flaggedQuestions:[],
    assistedQuestions:[],
    noteMeta:{},
    displayPreferences:{fontSize:'medium',density:'comfortable'},
    studyRoomDrafts:{},
    reminderConfig:{enabled:false,time:'20:00'},
    skippedToday:[]
  };
}
const recordedAnswer=answer=>typeof answer==='number'?Number.isFinite(answer):typeof answer==='string'&&answer.length<=1000&&Boolean(answer.trim());
function recordResponse(target,id,answer,date,correct,version){if(!recordedAnswer(answer)||typeof date!=='string'||!Number.isFinite(Date.parse(date)))return;const prior=Object.hasOwn(target,id)?target[id]:null;if(!prior||Date.parse(date)>=Date.parse(prior.date))target[id]={answer,date,...(typeof correct==='boolean'?{correct}:{}),...(typeof version==='string'?{version}:{})};}
export function learningHistory(state){const attempts=Array.isArray(state?.attempts)?state.attempts:[];const responses=Object.entries(state?.responses||{}).filter(([,record])=>record&&recordedAnswer(record.answer)&&typeof record.date==='string'&&Number.isFinite(Date.parse(record.date))).map(([id,record])=>({setId:'responses',date:record.date,answers:{[id]:record.answer},outcomes:typeof record.correct==='boolean'?{[id]:record.correct}:{}}));return [...attempts,...responses];}
export function sanitizeLearning(value,bank,catalogIds){
  const clean=freshLearning(),v=value&&typeof value==='object'?value:{};
  const qids=new Set(bank.sets.flatMap(s=>s.questions.map(q=>q.id))),setIds=new Set([...bank.sets.map(s=>s.id),'review','smart']),draftIds=new Set([...setIds,...bank.sets.flatMap(s=>['choice','cloze','correction','translation'].map(mode=>s.id+':'+mode))]),cardIds=new Set(bank.sets.flatMap(s=>(s.cards||[]).map(c=>c.id)));
  const answersFor=answers=>Object.fromEntries(Object.entries(answers&&typeof answers==='object'?answers:{}).filter(([id,a])=>qids.has(id)&&(typeof a==='number'||typeof a==='string'&&a.length<=1000)));
  for(const [id,d]of Object.entries(v.drafts||{}))if(draftIds.has(id)&&d&&typeof d==='object')clean.drafts[id]={answers:answersFor(d.answers),flags:[...new Set((Array.isArray(d.flags)?d.flags:[]).filter(qid=>qids.has(qid)))].slice(0,300),startedAt:Number.isFinite(d.startedAt)?d.startedAt:Date.now(),index:Math.max(0,Math.min(299,Math.trunc(Number(d.index)||0))),updatedAt:Number.isFinite(d.updatedAt)?d.updatedAt:Date.now(),bankVersion:typeof d.bankVersion==='string'?d.bankVersion:undefined,gradeId:typeof d.gradeId==='string'&&/^[a-zA-Z0-9_-]{8,100}$/.test(d.gradeId)?d.gradeId:undefined,questionIds:(Array.isArray(d.questionIds)?d.questionIds:[]).filter(id=>qids.has(id)).slice(0,300)};
  const outcomesFor=(value,attempt)=>{const out=Object.fromEntries(Object.entries(value||{}).filter(([id,v])=>qids.has(id)&&typeof v==='boolean')),answered=Object.entries(answersFor(attempt.answers)).filter(([,a])=>String(a).trim());if(answered.length&&(attempt.correct===0||attempt.correct===answered.length))for(const [id]of answered)if(!Object.hasOwn(out,id))out[id]=attempt.correct>0;return out};
  const attempts=(Array.isArray(v.attempts)?v.attempts:[]).filter(a=>setIds.has(a.setId)&&Number.isFinite(a.total)&&a.total>0&&a.total<=300&&Number.isFinite(a.correct)&&a.correct>=0&&a.correct<=a.total&&typeof a.date==='string'&&Number.isFinite(Date.parse(a.date))).map(a=>({setId:a.setId,total:a.total,correct:a.correct,date:a.date,answers:answersFor(a.answers),outcomes:outcomesFor(a.outcomes,a),mode:['choice','cloze','correction','translation'].includes(a.mode)?a.mode:'all'}));
  clean.attempts=attempts.slice(-100);
  for(const attempt of attempts)for(const [id,answer]of Object.entries(attempt.answers))recordResponse(clean.responses,id,answer,attempt.date,attempt.outcomes?.[id]);
  for(const [id,record]of Object.entries(v.responses||{}))if(qids.has(id)&&record&&typeof record==='object')recordResponse(clean.responses,id,record.answer,record.date,record.correct,record.version);
  clean.wrong=[...new Set((Array.isArray(v.wrong)?v.wrong:[]).filter(id=>qids.has(id)))];
  for(const [id,m]of Object.entries(v.mistakeMeta||{}))if(qids.has(id)&&m&&typeof m==='object'){const reason=Object.hasOwn(MISTAKE_REASONS,m.reason)?m.reason:'';const note=typeof m.note==='string'?m.note.slice(0,300):'';const count=Math.max(1,Math.min(999,Math.trunc(Number(m.count)||1)));clean.mistakeMeta[id]={reason,note,count,...(typeof m.updatedAt==='string'&&Number.isFinite(Date.parse(m.updatedAt))?{updatedAt:m.updatedAt}:{})}}
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
  clean.timeBudget=[15,30,60].includes(v.timeBudget)?v.timeBudget:30;
  clean.priorityCourse=typeof v.priorityCourse==='string'&&catalogIds.has(v.priorityCourse)?v.priorityCourse:'1EcEHLSxxlsRFtJCXMGimzy2rKd2Ej-zD';
  clean.flaggedLessons=[...new Set((Array.isArray(v.flaggedLessons)?v.flaggedLessons:[]).filter(id=>catalogIds.has(id)||setIds.has(id)))];
  clean.flaggedQuestions=[...new Set((Array.isArray(v.flaggedQuestions)?v.flaggedQuestions:[]).filter(id=>qids.has(id)))];
  clean.assistedQuestions=[...new Set((Array.isArray(v.assistedQuestions)?v.assistedQuestions:[]).filter(id=>qids.has(id)))];
  clean.skippedToday=[...new Set((Array.isArray(v.skippedToday)?v.skippedToday:[]).filter(id=>typeof id==='string'))].slice(0,50);
  const noteMeta=v.noteMeta&&typeof v.noteMeta==='object'?v.noteMeta:{};
  for(const [id,meta]of Object.entries(noteMeta)){
    if(meta&&typeof meta==='object'){
      clean.noteMeta[id]={
        pinned:Boolean(meta.pinned),
        tags:Array.isArray(meta.tags)?meta.tags.filter(t=>typeof t==='string'&&t.length<=50).slice(0,10):[],
        updatedAt:typeof meta.updatedAt==='string'&&Number.isFinite(Date.parse(meta.updatedAt))?meta.updatedAt:new Date().toISOString(),
        lessonId:typeof meta.lessonId==='string'?meta.lessonId:undefined,
        page:Number.isInteger(meta.page)?meta.page:undefined,
        timecode:typeof meta.timecode==='string'?meta.timecode.slice(0,20):undefined
      };
    }
  }
  const disp=v.displayPreferences&&typeof v.displayPreferences==='object'?v.displayPreferences:{};
  clean.displayPreferences={
    fontSize:['small','medium','large'].includes(disp.fontSize)?disp.fontSize:'medium',
    density:['compact','comfortable'].includes(disp.density)?disp.density:'comfortable'
  };
  const rem=v.reminderConfig&&typeof v.reminderConfig==='object'?v.reminderConfig:{};
  clean.reminderConfig={
    enabled:Boolean(rem.enabled),
    time:typeof rem.time==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(rem.time)?rem.time:'20:00'
  };
  const status=v.lessonStatus&&typeof v.lessonStatus==='object'?v.lessonStatus:{};
  for(const [id,st]of Object.entries(status)){
    if(st&&typeof st==='object'&&(catalogIds.has(id)||setIds.has(id))){
      clean.lessonStatus[id]={
        status:['not_started','in_progress','completed','needs_review'].includes(st.status)?st.status:'not_started',
        selfUnderstood:Boolean(st.selfUnderstood),
        needsReview:Boolean(st.needsReview),
        lastAccessed:typeof st.lastAccessed==='string'&&Number.isFinite(Date.parse(st.lastAccessed))?st.lastAccessed:undefined
      };
    }
  }
  const sDrafts=v.studyRoomDrafts&&typeof v.studyRoomDrafts==='object'?v.studyRoomDrafts:{};
  for(const [id,sd]of Object.entries(sDrafts)){
    if(sd&&typeof sd==='object'&&(catalogIds.has(id)||setIds.has(id))){
      clean.studyRoomDrafts[id]={
        activeTab:['study','doc','notes','quiz'].includes(sd.activeTab)?sd.activeTab:'study',
        scrollPos:Number.isFinite(sd.scrollPos)?Math.max(0,Math.floor(sd.scrollPos)):0,
        noteDraft:typeof sd.noteDraft==='string'?sd.noteDraft.slice(0,20000):'',
        updatedAt:Number.isFinite(sd.updatedAt)?sd.updatedAt:undefined,
        answers:sd.answers&&typeof sd.answers==='object'?{...sd.answers}:undefined
      };
    }
  }
  return clean;
}
export function applyQuizResult(state,setId,questions,answers,draftKey=setId,verifiedScore){const score=verifiedScore||gradeQuiz(questions,answers),date=new Date().toISOString();state.responses||={};state.mistakeMeta||={};for(const result of score.results)if(result.answered)recordResponse(state.responses,result.id,result.answer,date,result.correct,questions.find(q=>q.id===result.id)?.version);state.attempts.push({setId,date,total:score.total,correct:score.correct,answers:{...answers},outcomes:Object.fromEntries(score.results.filter(r=>r.answered&&typeof r.correct==='boolean').map(r=>[r.id,r.correct]))});state.attempts=state.attempts.slice(-100);const wrong=new Set(state.wrong);for(const r of score.results){if(r.correct)wrong.delete(r.id);else if(r.answered){wrong.add(r.id);const prev=state.mistakeMeta[r.id]||{reason:'',note:'',count:0};state.mistakeMeta[r.id]={...prev,count:(prev.count||0)+1,updatedAt:date}}}state.wrong=[...wrong];delete state.drafts[draftKey];return score;}
export function scheduleCard(record,remembered,now=Date.now()){const streak=remembered?Math.min(10,(record?.streak||0)+1):0;const days=remembered?[1,3,7,14,30][Math.min(streak-1,4)]:0;return {streak,due:now+(remembered?days*86400000:10*60000)};}

export function markLessonStatus(state, lessonId, status, selfUnderstood, needsReview){
  state.lessonStatus||={};
  const prev=state.lessonStatus[lessonId]||{};
  state.lessonStatus[lessonId]={
    status:status||prev.status||'not_started',
    selfUnderstood:selfUnderstood!==undefined?Boolean(selfUnderstood):Boolean(prev.selfUnderstood),
    needsReview:needsReview!==undefined?Boolean(needsReview):Boolean(prev.needsReview),
    lastAccessed:new Date().toISOString()
  };
  if(selfUnderstood!==undefined){
    state.lessonRead||={};
    if(selfUnderstood)state.lessonRead[lessonId]=new Date().toISOString();
    else delete state.lessonRead[lessonId];
  }
  if(needsReview!==undefined){
    state.flaggedLessons||=[];
    if(needsReview&&!state.flaggedLessons.includes(lessonId))state.flaggedLessons.push(lessonId);
    else if(!needsReview)state.flaggedLessons=state.flaggedLessons.filter(id=>id!==lessonId);
  }
  return state.lessonStatus[lessonId];
}

export function toggleLessonFlag(state, lessonId){
  state.flaggedLessons||=[];
  const has=state.flaggedLessons.includes(lessonId);
  if(has)state.flaggedLessons=state.flaggedLessons.filter(id=>id!==lessonId);
  else state.flaggedLessons.push(lessonId);
  state.lessonStatus||={};
  state.lessonStatus[lessonId]={...(state.lessonStatus[lessonId]||{}),needsReview:!has,lastAccessed:new Date().toISOString()};
  return !has;
}

export function toggleQuestionFlag(state, questionId){
  state.flaggedQuestions||=[];
  const has=state.flaggedQuestions.includes(questionId);
  if(has)state.flaggedQuestions=state.flaggedQuestions.filter(id=>id!==questionId);
  else state.flaggedQuestions.push(questionId);
  return !has;
}

export function recordAssistedQuestion(state, questionId){
  state.assistedQuestions||=[];
  if(!state.assistedQuestions.includes(questionId))state.assistedQuestions.push(questionId);
  return state.assistedQuestions;
}

export function computeEvidenceMetrics(state, bank, progress){
  const completedVideos=progress?.completed?Object.keys(progress.completed).length:0;
  const selfUnderstoodCount=state?.lessonRead?Object.keys(state.lessonRead).length:0;
  const flaggedCount=(state?.flaggedLessons?.length||0)+(state?.flaggedQuestions?.length||0);
  const assistedSet=new Set(state?.assistedQuestions||[]);
  
  // Real question responses in history
  const allResponses=Object.entries(state?.responses||{});
  let unassistedTotal=0,unassistedCorrect=0;
  let assistedTotal=0,assistedCorrect=0;
  
  for(const [qid,rec]of allResponses){
    if(typeof rec?.correct==='boolean'){
      if(assistedSet.has(qid)){
        assistedTotal++;
        if(rec.correct)assistedCorrect++;
      }else{
        unassistedTotal++;
        if(rec.correct)unassistedCorrect++;
      }
    }
  }

  const unassistedPct=unassistedTotal?Math.round(100*unassistedCorrect/unassistedTotal):null;
  const assistedPct=assistedTotal?Math.round(100*assistedCorrect/assistedTotal):null;

  return {
    completedVideos,
    selfUnderstoodCount,
    flaggedCount,
    unassistedTotal,
    unassistedCorrect,
    unassistedPct,
    assistedTotal,
    assistedCorrect,
    assistedPct,
    mistakeCount:state?.wrong?.length||0,
    dueCardCount:(bank?.sets||[]).flatMap(s=>s.cards||[]).filter(c=>!state?.cards?.[c.id]||state.cards[c.id].due<=Date.now()).length
  };
}

export function searchBankAndCatalog({query, bank, courses=[], nodes=[], notes={}, noteMeta={}, filter='all'}){
  const q=normalize(query||'').trim();
  if(!q)return [];
  const results=[];
  const match=(text)=>normalize(text||'').includes(q);
  const snippetOf=(text)=>{
    const clean=String(text||'').replace(/\s+/g,' ');
    const nClean=normalize(clean);
    const idx=nClean.indexOf(q);
    if(idx<0)return clean.slice(0,100);
    const start=Math.max(0,idx-35);
    const end=Math.min(clean.length,idx+q.length+55);
    return (start>0?'…':'')+clean.slice(start,end)+(end<clean.length?'…':'');
  };

  // 1. Courses
  if(filter==='all'||filter==='courses'){
    for(const c of courses){
      if(match(c.title)||match(c.name)||c.tags?.some(match)){
        results.push({
          category:'courses',
          id:c.id,
          title:c.title||c.name,
          subtitle:`Khóa học · ${c.videos?.length||0} video, ${c.docs?.length||0} tài liệu`,
          snippet:c.description||c.tags?.join(' · ')||'Khóa học TOEIC',
          url:`#course?id=${encodeURIComponent(c.id)}`,
          badge:'Khóa học',
          scopeNote:'Danh mục khóa học'
        });
      }
    }
  }

  // 2. Compiled lesson content (Bank Sets)
  if(filter==='all'||filter==='compiled'){
    for(const s of bank?.sets||[]){
      let matchedInLesson=false;
      let lessonSnippet='';
      if(match(s.title)||match(s.topic)){
        matchedInLesson=true;
        lessonSnippet=s.summary?.find(match)||s.title;
      }
      if(!matchedInLesson&&s.summary?.some(match)){
        matchedInLesson=true;
        lessonSnippet=s.summary.find(match);
      }
      if(!matchedInLesson&&s.lesson?.sections){
        for(const sec of s.lesson.sections){
          if(match(sec.heading)){
            matchedInLesson=true;
            lessonSnippet=`${sec.heading}: ${sec.points?.[0]||''}`;
            break;
          }
          const pt=sec.points?.find(match);
          if(pt){
            matchedInLesson=true;
            lessonSnippet=`${sec.heading}: ${pt}`;
            break;
          }
          const ex=sec.examples?.find(e=>match(e.en)||match(e.vi));
          if(ex){
            matchedInLesson=true;
            lessonSnippet=`${ex.en} — ${ex.vi}`;
            break;
          }
        }
      }
      if(!matchedInLesson&&s.lesson?.pitfalls?.some(match)){
        matchedInLesson=true;
        lessonSnippet=s.lesson.pitfalls.find(match);
      }
      if(matchedInLesson){
        results.push({
          category:'compiled',
          id:s.id,
          title:s.title,
          subtitle:`Chủ đề biên soạn · ${s.topic} · ${s.questions?.length||0} câu hỏi`,
          snippet:snippetOf(lessonSnippet),
          url:`#study?course=${encodeURIComponent(s.courseId)}&folder=${encodeURIComponent(s.folderId)}`,
          badge:'Bài học biên soạn',
          scopeNote:'Đã đối chiếu nội dung'
        });
      }
    }
  }

  // 3. Vocabulary cards
  if(filter==='all'||filter==='vocab'){
    for(const s of bank?.sets||[]){
      for(const card of s.cards||[]){
        if(match(card.front)||match(card.back)||match(card.example)){
          results.push({
            category:'vocab',
            id:card.id,
            title:`${card.front} : ${card.back}`,
            subtitle:`Từ vựng · ${s.title}`,
            snippet:snippetOf(card.example||card.back),
            url:`#review?tab=cards&id=${encodeURIComponent(s.id)}`,
            badge:'Từ vựng',
            scopeNote:'Từ vựng có nguồn'
          });
        }
      }
    }
  }

  // 4. Personal Notes
  if(filter==='all'||filter==='notes'){
    for(const [id,text]of Object.entries(notes||{})){
      if(text&&text.trim()&&match(text)){
        const meta=noteMeta?.[id]||{};
        const tags=meta.tags?.length?` [${meta.tags.join(', ')}]`:'';
        results.push({
          category:'notes',
          id,
          title:`Ghi chú: ${snippetOf(text).slice(0,40)}`,
          subtitle:`Ghi chú cá nhân${tags}`,
          snippet:snippetOf(text),
          url:`#notes?id=${encodeURIComponent(id)}`,
          badge:'Ghi chú',
          scopeNote:'Tự lưu trên thiết bị'
        });
      }
    }
  }

  // 5. Lessons / Video / PDF files (Metadata search)
  if(filter==='all'||filter==='lessons'){
    for(const f of nodes){
      if(f.mime!=='application/vnd.google-apps.folder'){
        if(match(f.name)||match(f.path)){
          const isVid=isVideo(f);
          results.push({
            category:'lessons',
            id:f.id,
            title:cleanTitle(f.name),
            subtitle:`${isVid?'Video':'Tài liệu'} · ${f.path||''}`,
            snippet:f.name,
            url:`#study?course=${encodeURIComponent(f.course||'')}&folder=${encodeURIComponent(f.parent||'')}&file=${encodeURIComponent(f.id)}`,
            badge:isVid?'Video bài giảng':'Tài liệu',
            scopeNote:'Tìm theo metadata Drive'
          });
        }
      }
    }
  }

  return results.slice(0,50);
}
