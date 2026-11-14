// Calendar days use the learner's device timezone. Arithmetic at noon avoids DST gaps.
export function dayKey(value=new Date()) {
  const d=new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
export function validDay(value) {
  return typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value+'T12:00:00')) && dayKey(value+'T12:00:00')===value;
}
const dateOf=key=>new Date(key+'T12:00:00');
const clamp=(value,min,max,fallback)=>Number.isFinite(Number(value))?Math.max(min,Math.min(max,Math.trunc(Number(value)))):fallback;
export function shiftDay(key,count) {const d=dateOf(key);d.setDate(d.getDate()+count);return dayKey(d)}
export function weekStart(key) {return shiftDay(key,-((dateOf(key).getDay()+6)%7))}
const dayDistance=(a,b)=>Math.round((Date.parse(b+'T12:00:00Z')-Date.parse(a+'T12:00:00Z'))/86400000);
export function freshPlanner() {
  return {version:1,configured:false,config:{startDate:'',deadline:'',minutes:25,words:10,questions:10,weekdays:[1,2,3,4,5],topics:[]},days:{}};
}
const uniqueValid=(value,allowed,max)=>[...new Set((Array.isArray(value)?value:[]).filter(id=>typeof id==='string'&&allowed.has(id)))].slice(0,max);
export function sanitizePlanner(value,bank) {
  const clean=freshPlanner(),v=value&&typeof value==='object'?value:{},c=v.config||{};
  const sets=new Set(bank.sets.map(s=>s.id)),questions=new Set(bank.sets.flatMap(s=>s.questions.map(q=>q.id))),cards=new Set(bank.sets.flatMap(s=>(s.cards||[]).map(c=>c.id)));
  const weekdays=[...new Set((Array.isArray(c.weekdays)?c.weekdays:[]).filter(n=>Number.isInteger(n)&&n>=0&&n<=6))];
  clean.config={startDate:validDay(c.startDate)?c.startDate:'',deadline:validDay(c.deadline)&&c.deadline>=c.startDate?c.deadline:'',minutes:clamp(c.minutes,5,180,25),words:clamp(c.words,1,50,10),questions:clamp(c.questions,1,100,10),weekdays:weekdays.length?weekdays:[1,2,3,4,5],topics:uniqueValid(c.topics,sets,100)};
  clean.configured=v.configured===true&&Boolean(clean.config.startDate);
  if(!clean.configured)return clean;
  for(const key of Object.keys(v.days&&typeof v.days==='object'?v.days:{}).filter(validDay).sort().slice(-730)) {
    const d=v.days[key];if(!d||typeof d!=='object')continue;
    const targets=d.targets||{};
    clean.days[key]={scheduled:d.scheduled===true,lessonId:sets.has(d.lessonId)?d.lessonId:null,
      targets:{minutes:clamp(targets.minutes,0,180,0),words:clamp(targets.words,0,50,0),questions:clamp(targets.questions,0,100,0)},
      mistakeIds:uniqueValid(d.mistakeIds,questions,5),cards:uniqueValid(d.cards,cards,cards.size),answered:uniqueValid(d.answered,questions,questions.size),lessons:uniqueValid(d.lessons,sets,sets.size),focusSeconds:clamp(d.focusSeconds,0,86400,0)};
  }
  return clean;
}
export function scheduled(config,key) {
  return validDay(key)&&key>=config.startDate&&(!config.deadline||key<=config.deadline)&&config.weekdays.includes(dateOf(key).getDay());
}
function lessonIndex(config,key) {
  const elapsed=Math.max(0,dayDistance(config.startDate,key)),whole=Math.floor(elapsed/7);
  let count=whole*config.weekdays.length;
  for(let i=whole*7;i<=elapsed;i++)if(config.weekdays.includes(dateOf(shiftDay(config.startDate,i)).getDay()))count++;
  return Math.max(0,count-1);
}
export function forecastDay(planner,bank,state,key) {
  const c=planner.config,active=planner.configured&&scheduled(c,key);
  const topics=bank.sets.filter(s=>!c.topics.length||c.topics.includes(s.id));
  const cardCount=bank.sets.reduce((n,s)=>n+(s.cards||[]).length,0),questionCount=bank.sets.reduce((n,s)=>n+s.questions.length,0),qids=new Set(bank.sets.flatMap(s=>s.questions.map(q=>q.id)));
  return {scheduled:active,lessonId:active&&topics.length?topics[lessonIndex(c,key)%topics.length].id:null,
    targets:{minutes:active?c.minutes:0,words:active?Math.min(c.words,cardCount):0,questions:active?Math.min(c.questions,questionCount):0},
    mistakeIds:active?[...new Set((state.wrong||[]).filter(id=>qids.has(id)))].slice(0,5):[],cards:[],answered:[],lessons:[],focusSeconds:0};
}
export function ensurePlannerDay(state,bank,now=new Date()) {
  const p=state.planner;if(!p?.configured)return null;
  const key=dayKey(now);if(!p.days[key])p.days[key]=forecastDay(p,bank,state,key);
  // Keep the same bounded history after long use and after import.
  const keys=Object.keys(p.days).sort();for(const old of keys.slice(0,Math.max(0,keys.length-730)))delete p.days[old];
  return p.days[key];
}
export function recordPlannerActivity(state,bank,event,now=new Date()) {
  const d=ensurePlannerDay(state,bank,now);if(!d)return false;
  const sets=new Set(bank.sets.map(s=>s.id));
  if(event.type==='card') {const ids=new Set(bank.sets.flatMap(s=>(s.cards||[]).map(c=>c.id)));if(ids.has(event.id)&&!d.cards.includes(event.id))d.cards.push(event.id)}
  else if(event.type==='quiz') {const ids=new Set(bank.sets.flatMap(s=>s.questions.map(q=>q.id)));d.answered=[...new Set([...d.answered,...uniqueValid(event.questionIds,ids,300)])]}
  else if(event.type==='lesson'&&sets.has(event.id)) {d.lessons=d.lessons.filter(id=>id!==event.id);if(event.done)d.lessons.push(event.id)}
  return true;
}
export function recordPlannerFocus(state,bank,from,to) {
  if(!state.planner?.configured||!Number.isFinite(from)||!Number.isFinite(to)||to<=from||to-from>86400000)return false;
  let cursor=from;
  while(cursor<to) {
    const next=dateOf(shiftDay(dayKey(cursor),1));next.setHours(0,0,0,0);
    const end=Math.min(to,next.getTime()),d=ensurePlannerDay(state,bank,new Date(cursor));
    d.focusSeconds=Math.min(86400,d.focusSeconds+Math.floor((end-cursor)/1000));cursor=end;
  }
  return true;
}
export function plannerTasks(day,bank) {
  if(!day?.scheduled)return [];
  const set=bank.sets.find(s=>s.id===day.lessonId),tasks=[];
  if(set)tasks.push({id:'lesson',title:'Đọc hiểu bài học',detail:set.title,current:day.lessons.includes(set.id)?1:0,target:1,unit:'bài',href:'#learn?id='+encodeURIComponent(set.id)+'&view=lesson'});
  if(day.targets.words)tasks.push({id:'cards',title:'Ôn từ vựng',detail:'Tính các thẻ khác nhau đã lật và tự đánh giá hôm nay.',current:day.cards.length,target:day.targets.words,unit:'thẻ',href:'#cards?id=all&priority=due'});
  if(day.targets.questions)tasks.push({id:'questions',title:'Luyện câu hỏi',detail:'Tính câu khác nhau đã trả lời và nộp chấm trong ngày.',current:day.answered.length,target:day.targets.questions,unit:'câu',href:'#quiz?id=smart'});
  if(day.mistakeIds.length)tasks.push({id:'mistakes',title:'Quay lại câu đã sai',detail:'Luyện lại các câu sai được chọn khi mở lịch hôm nay.',current:day.mistakeIds.filter(id=>day.answered.includes(id)).length,target:day.mistakeIds.length,unit:'câu',href:'#quiz?id=review'});
  if(day.targets.minutes)tasks.push({id:'focus',title:'Dành thời gian tập trung',detail:'Chỉ tính thời gian bộ đếm chạy, không tự đo thời lượng video.',current:Math.floor(day.focusSeconds/60),target:day.targets.minutes,unit:'phút',href:'#focus'});
  return tasks.map(t=>({...t,done:t.current>=t.target}));
}
export function summarizeDay(day,bank) {
  const tasks=plannerTasks(day,bank),done=tasks.filter(t=>t.done).length;
  return {tasks,done,total:tasks.length,percent:tasks.length?Math.round(done/tasks.length*100):0};
}

export function prioritizeCards(cards,records,now=Date.now()) {
  const rank=card=>records[card.id]?.due<=now?0:!records[card.id]?1:2;
  return cards.map((card,index)=>({card,index})).sort((a,b)=>rank(a.card)-rank(b.card)||(records[a.card.id]?.due||0)-(records[b.card.id]?.due||0)||a.index-b.index).map(item=>item.card);
}
