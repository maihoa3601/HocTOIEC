export const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();
export const cleanTitle = value => String(value ?? '').replace(/(\.(mp4|mkv|avi|mov|webm|mp3|wav|pdf))+$/gi,'').replace(/\s*\(khoahocgiahoi[^)]*\)/gi,'').replace(/^\[(.*)\]$/,'$1').replace(/\s+/g,' ').trim();
export function tagsFor(value) {
  const v=normalize(value), out=[];
  if(/listening|nghe|part\s*[1-4]\b|photograph|conversation|talks|hoi dap/.test(v))out.push('Listening');
  if(/reading|doc|part\s*[5-7]\b|text completion|incomplete sentence/.test(v))out.push('Reading');
  if(/ngu phap|van pham|danh tu|dong tu|tinh tu|trang tu|gioi tu|menh de|grammar/.test(v))out.push('Ngữ pháp');
  if(/tu vung|vocabulary/.test(v))out.push('Từ vựng');
  if(/speaking|writing|noi|viet/.test(v))out.push('Speaking & Writing');
  if(/mat goc|nen tang|can ban|co ban|beginners|pre-toeic|lay goc/.test(v))out.push('Nền tảng');
  if(/luyen de|giai de|bo de|practice|ets/.test(v))out.push('Luyện đề');
  return [...new Set(out)];
}
export const isVideo = item => item.mime.startsWith('video/');
export const isFolder = item => item.mime.endsWith('.folder');
export const isDocument = item => !isFolder(item) && !isVideo(item) && !item.mime.startsWith('image/');
export function safeProgress(value, ids) {
  const v=value&&typeof value==='object'?value:{};
  const keepMap=(source,fn)=>Object.fromEntries(Object.entries(source&&typeof source==='object'?source:{}).filter(([id,val])=>ids.has(id)&&fn(val)));
  return {version:1,completed:keepMap(v.completed,x=>typeof x==='string'&&Number.isFinite(Date.parse(x))),saved:Array.isArray(v.saved)?[...new Set(v.saved.filter(x=>ids.has(x)))]:[],notes:keepMap(v.notes,x=>typeof x==='string'&&x.length<=20000),last:ids.has(v.last)?v.last:null,goal:[450,650,850].includes(Number(v.goal))?Number(v.goal):650,daily:[1,2,3,5].includes(Number(v.daily))?Number(v.daily):1,focus:Math.max(0,Math.min(10000000,Number(v.focus)||0))};
}
