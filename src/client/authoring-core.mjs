export const lines=value=>String(value??'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
const copy=value=>structuredClone(value);
export function newSourceLesson(sourceId,page=1,suffix=crypto.randomUUID().slice(0,8)) {
  return {id:'doc-'+sourceId.slice(0,15)+'-'+suffix,title:'',topic:'Ngữ pháp',description:'',origin:'Adapted',summary:[],lesson:{sections:[],pitfalls:[]},questions:[],cards:[]};
}
export function sourceItem(lesson,kind,sourceId,page=1,suffix=crypto.randomUUID().slice(0,8)) {
  const ref={sourceId,page};
  if(kind==='section')return {heading:'',points:[],examples:[],...ref};
  if(kind==='question')return {id:lesson.id+'-q-'+suffix,type:'choice',activity:'choice',prompt:'',options:['',''],answer:0,explanation:'',origin:'Generated',...ref};
  if(kind==='card')return {id:lesson.id+'-c-'+suffix,front:'',back:'',example:'',origin:'Adapted',...ref};
  throw Error('Loại nội dung không hợp lệ.');
}
export function clozeFromExample(lesson,section,example,blank,suffix=crypto.randomUUID().slice(0,8)) {
  const en=String(example.en||'').trim(),term=String(blank||'').trim();
  if(!en||!term||term.length>200||en.includes('___'))throw Error('Chọn một từ hoặc cụm từ trong ví dụ đầy đủ.');
  const start=en.indexOf(term);
  if(start<0||en.indexOf(term,start+term.length)>=0)throw Error('Phần cần điền phải xuất hiện đúng một lần, đúng chữ hoa/thường trong ví dụ.');
  if(/[\p{L}\p{N}]/u.test(en[start-1]||'')||/[\p{L}\p{N}]/u.test(en[start+term.length]||''))throw Error('Chọn trọn từ hoặc cụm từ, không lấy một phần của từ.');
  return {id:lesson.id+'-q-'+suffix,type:'text',activity:'cloze',prompt:'Điền phần còn thiếu: '+en.slice(0,start)+'___'+en.slice(start+term.length)+' Chỉ nhập từ/cụm từ còn thiếu.',accept:[term],explanation:'',origin:'Generated',sourceId:section.sourceId,page:section.page};
}
export function lessonDraftIssues(lesson,pages) {
  const errors=[],hasPage=p=>pages.includes(Number(p)),check=(value,label)=>{if(typeof value!=='string'||!value.trim())errors.push(label+' còn trống.')};
  check(lesson.title,'Tên bài học');check(lesson.topic,'Chủ đề');
  if(!['Original','Adapted','Generated'].includes(lesson.origin))errors.push('Cần chọn loại nguồn nội dung.');
  if(lesson.summary.length>12||lesson.lesson.sections.length>30||lesson.questions.length>200||lesson.cards.length>100)errors.push('Bài học vượt giới hạn số mục.');
  lesson.lesson.sections.forEach((s,i)=>{check(s.heading,'Tiêu đề phần '+(i+1));if(!hasPage(s.page))errors.push('Phần '+(i+1)+' chưa có trang nguồn hợp lệ.');if(!s.points.length)errors.push('Phần '+(i+1)+' cần ít nhất một ý chính.');s.examples.forEach((e,j)=>{check(e.en,'Ví dụ '+(i+1)+'.'+(j+1));check(e.vi,'Nghĩa ví dụ '+(i+1)+'.'+(j+1))})});
  lesson.questions.forEach((q,i)=>{const label='Câu '+(i+1);check(q.prompt,label);check(q.explanation,'Giải thích '+label.toLowerCase());if(!hasPage(q.page))errors.push(label+' chưa có trang nguồn hợp lệ.');if(q.type==='choice'){if(q.options.length<2||q.options.some(o=>!o.trim())||new Set(q.options.map(o=>o.trim().toLowerCase())).size!==q.options.length||!Number.isInteger(q.answer)||q.answer<0||q.answer>=q.options.length)errors.push(label+' cần ít nhất hai lựa chọn khác nhau và một đáp án đúng.')}else if(!q.accept.length||q.accept.some(a=>!a.trim()))errors.push(label+' chưa có đáp án chấp nhận.');});
  lesson.cards.forEach((c,i)=>{check(c.front,'Từ của thẻ '+(i+1));check(c.back,'Nghĩa của thẻ '+(i+1));if(!hasPage(c.page))errors.push('Thẻ '+(i+1)+' chưa có trang nguồn hợp lệ.')});
  return errors;
}
export function mergeLessonDraft(bundle,lesson,index) {
  const next=copy(bundle),updated=copy(lesson),sourceId=next.source.id;
  for(const item of [...updated.lesson.sections,...updated.questions,...updated.cards])item.sourceId=sourceId;
  if(!updated.description.trim())updated.description='Đọc ý chính, đối chiếu ví dụ và tự luyện từ tài liệu.';
  if(index<0){if(next.lessons.length>=10)throw Error('Mỗi gói tối đa 10 bài học.');next.lessons.push(updated)}else {if(next.lessons[index]?.id!==updated.id)throw Error('Bài gốc đã thay đổi. Mở lại lần nhập.');next.lessons[index]=updated;}
  next.lessons.forEach((l,i)=>l.sequence=i);
  return next;
}
