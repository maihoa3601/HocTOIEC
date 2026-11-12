import {cleanTitle,isFolder,isVideo,normalize} from './core.mjs';

export const courseGroups = [
  {id:'foundation',title:'Xây nền tảng',description:'Lấy lại gốc và làm quen với tiếng Anh trước khi luyện thi.',icon:'spark',courses:['1q6WGPjWqybM8_n7IAXj19NnxTwS0b6Xt','1no0uMe6XaFSMfp7mGwdJkajLlQs4Tqak']},
  {id:'complete',title:'TOEIC tổng hợp',description:'Chọn giáo viên hoặc chương trình, rồi học lần lượt theo từng chặng.',icon:'book',courses:['1EcEHLSxxlsRFtJCXMGimzy2rKd2Ej-zD','1pCQAKuQM_ywmrCbxjQeTb787sDgi8dfv','1ZLjKpE2d2RkRv_r6drOaVsoCu4h998tA','17L-ZAHLYiWZeD_3cWVa9Lyk53DRZhx9z','1L3owxwaCrNtU7tNfclhZ7ZIeM3yeq3kM','1m8UUnkpyTOffREm7GjITTPrDkZ5OmHUb','1Kww4E627c8vOal89cQGn2YTwFfoTAEDC','1aJvHEOT7HUJCHoiYQjNG7pLPj9XJF6Ah','1unBIXQmg3AGI97rH205uvAgWo9CRTXzX']},
  {id:'skills',title:'Nghe & Đọc chuyên sâu',description:'Ôn từng kỹ năng, dạng câu hỏi và chủ điểm còn yếu.',icon:'headphones',courses:['1lg27QJcSuv7Qg9dmubzC_1g2uFjvPf5R','1El8EHN4zTQTZeEa06fxvlq_ns5s6lLhY','1btvY9KHsRScGIVE-v5sVF1_7r6IC9zrZ','1Wzq8TyTws8U0FCd3gtPEV2wTNg9wkr2L','1bUKVKRYow7M1rBmoVb53tRA9JBgm5-Da']},
  {id:'speaking',title:'Speaking & Writing',description:'Tập trung vào kỹ năng nói và viết, theo các phần của khóa học.',icon:'note',courses:['1xcMJWJgBXlePK66YjLcFAieUXdjax9tF']},
  {id:'practice',title:'Luyện đề & mở rộng',description:'Luyện giải đề, học chiến thuật và tham khảo thêm các khóa bổ trợ.',icon:'target',courses:['15ysCWN7IEiS6Kcw-1vT4w-hbTHVCz1tt','1Xn5qywfqRAqwBW84cpLLxjyS9bXVB4tH','14y6jzzSzzLtR_j5yuvnET9sOQZJ9ZkWc']}
];
export const groupFor=id=>courseGroups.find(g=>g.courses.includes(id));
export const learningSort=(a,b)=>cleanTitle(a.name).localeCompare(cleanTitle(b.name),'vi',{numeric:true,sensitivity:'base'});
export const folderLabel=f=>cleanTitle(f.title||f.name).replace(/\s*\(\s*\)\s*$/,'');
export function resourceLabel(file,parentName='') {
  const title=cleanTitle(file.name),number=title.match(/^(\d+)(?:\.(?:png|jpe?g|webp))?$/i);
  const parent=cleanTitle(parentName);
  if(number){const kind=isVideo(file)?'Video':file.mime.startsWith('image/')?'Ảnh':file.mime.startsWith('audio/')?'Âm thanh':'Tệp';return `${kind} ${number[1]}${parent?' · '+parent:''}`;}
  if(parent&&/^(bai giang|video|audio)$/.test(normalize(title)))return `${title} · ${parent}`;
  return title;
}

// Every resource belongs to its actual parent. Aggregates let navigation show
// subtree counts without copying resources into unrelated chapters.
export function buildHierarchy(nodes, resources) {
  const byId=new Map(nodes.map(n=>[n.id,n]));
  const folders=new Map(nodes.filter(isFolder).map(n=>[n.id,{node:n,folders:[],files:[],videos:[],docs:[]}]));
  for(const n of nodes.filter(isFolder))folders.get(n.parent)?.folders.push(n);
  for(const f of resources) {
    folders.get(f.parent)?.files.push(f);
    let id=f.parent;const seen=new Set();
    while(folders.has(id)&&!seen.has(id)) {
      seen.add(id);const entry=folders.get(id);
      entry[isVideo(f)?'videos':'docs'].push(f);id=entry.node.parent;
    }
  }
  for(const e of folders.values()) {
    e.folders=e.folders.filter(f=>{const sub=folders.get(f.id);return sub.videos.length+sub.docs.length>0}).sort(learningSort);
    e.files.sort(learningSort);e.videos.sort((a,b)=>(a.path+'/'+a.name).localeCompare(b.path+'/'+b.name,'vi',{numeric:true}));e.docs.sort(learningSort);
  }
  return {byId,folders};
}
export function folderTrail(index,courseId,folderId) {
  const trail=[],seen=new Set();let current=index.byId.get(folderId);
  while(current&&!seen.has(current.id)) {
    seen.add(current.id);trail.unshift(current);
    if(current.id===courseId)return trail;
    current=index.byId.get(current.parent);
  }
  return [index.byId.get(courseId)].filter(Boolean);
}
export function searchFolder(entry,query='') {
  const q=normalize(query.trim());
  return q?[...entry.videos,...entry.docs].filter(f=>normalize(f.search||f.name+' '+(f.path||'')).includes(q)):entry.files;
}
