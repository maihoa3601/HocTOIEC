import {createLayout} from './layout.mjs';
import {createLearning} from './learning.mjs';
import {createExamRoom} from './exam-room.mjs';
import {resourceLabel} from './hierarchy.mjs';
import {createLibraryView} from './library-view.mjs';
import {createStudyRoom} from './study-room.mjs';
import {createTodayHub} from './today-hub.mjs';
import {createReviewHub} from './review-hub.mjs';
import {createEvidenceProgress} from './evidence-progress.mjs';
import {createUnifiedSearch} from './unified-search.mjs';
import {normalize,cleanTitle,tagsFor,isVideo,isFolder,isDocument,isLearningResource,safeProgress} from './core.mjs';

const $=s=>document.querySelector(s);
const paths={
  home:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  book:'<path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Z"/><path d="M12 5v15"/>',
  route:'<circle cx="6" cy="5" r="2"/><circle cx="18" cy="19" r="2"/><path d="M8 5h7a4 4 0 0 1 0 8H9a3 3 0 0 0 0 6h7"/>',
  bookmark:'<path d="M6 4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17l-6-4-6 4Z"/>',
  note:'<path d="M14 3H5v18h14V8Z"/><path d="M14 3v5h5M8 12h8M8 16h5"/>',
  chart:'<path d="M4 3v18h17M8 16v-4m5 4V8m5 8V5"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
  arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
  back:'<path d="M20 12H4m6-6-6 6 6 6"/>',
  play:'<path d="m9 5 11 7-11 7Z"/>',
  video:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m10 9 5 3-5 3Z"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 10h18m-12 4h.01M12 14h.01M16 14h.01"/>',
  headphones:'<path d="M4 14v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="12" width="4" height="8" rx="2"/><rect x="17" y="12" width="4" height="8" rx="2"/>',
  target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  chevron:'<path d="m9 5 7 7-7 7"/>',
  close:'<path d="m6 6 12 12M6 18 18 6"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  folder:'<path d="M3 7V5h7l2 3h9v12H3Z"/>',
  external:'<path d="M14 3h7v7m0-7L11 13M10 3H4v17h17v-6"/>',
  download:'<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
  spark:'<path d="m12 3 2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2Z"/>',
  pause:'<path d="M8 5v14M16 5v14"/>',
  refresh:'<path d="M20 8a8 8 0 1 0 0 8M20 3v5h-5"/>',
  moon:'<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2m10-10h-2M4 12H2m15.1-7.1-1.4 1.4M8.3 15.7l-1.4 1.4m0-12.2 1.4 1.4m7.4 7.4 1.4 1.4"/>',
  profile:'<circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>',
  more:'<circle cx="12" cy="12" r="1.5"/><circle cx="6" cy="12" r="1.5"/><circle cx="18" cy="12" r="1.5"/>'
};
const icon=(name,cls='')=>`<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${paths[name]||paths.book}</svg>`;
const driveIcon='<svg width="23" height="22" viewBox="0 0 24 24" aria-hidden="true"><path fill="#a7b890" d="M8.2 2h7.1l7 12.1h-7.1Z"/><path fill="#a99bce" d="m8.2 2 3.6 6.2-7 12H-2Z" transform="translate(2 0)"/><path fill="#dcba87" d="M4.8 14.1h17.5l-3.6 6.1H1.2Z"/></svg>';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n).toLocaleString('vi-VN');
const ROOT='1RySWcms9OOcRv4VWOTFrDE6qWwUA581m';
const ROOT_URL=`https://drive.google.com/drive/folders/${ROOT}`;
const KEY='toeic-studio-progress-v1';
const names={
  '1EcEHLSxxlsRFtJCXMGimzy2rKd2Ej-zD':'Tiếng Anh căn bản & TOEIC 4 kỹ năng',
  '1ZLjKpE2d2RkRv_r6drOaVsoCu4h998tA':'TOEIC căn bản & giải đề · Ms Thanh',
  '1L3owxwaCrNtU7tNfclhZ7ZIeM3yeq3kM':'TOEIC từ nền tảng đến chuyên sâu · PREP',
  '1q6WGPjWqybM8_n7IAXj19NnxTwS0b6Xt':'Lấy lại gốc ngữ pháp tiếng Anh',
  '1m8UUnkpyTOffREm7GjITTPrDkZ5OmHUb':'Chinh phục 7 phần thi · STUDY4',
  '1aJvHEOT7HUJCHoiYQjNG7pLPj9XJF6Ah':'Luyện thi TOEIC · Cô Phạm Liễu',
  '1Xn5qywfqRAqwBW84cpLLxjyS9bXVB4tH':'TOEIC Hacking · Mục tiêu 650+',
  '1no0uMe6XaFSMfp7mGwdJkajLlQs4Tqak':'TOEIC thần tốc cho người mất gốc',
  '1bUKVKRYow7M1rBmoVb53tRA9JBgm5-Da':'Bí quyết luyện Listening & Reading',
  '1btvY9KHsRScGIVE-v5sVF1_7r6IC9zrZ':'Bí quyết chinh phục TOEIC Reading',
  '1Wzq8TyTws8U0FCd3gtPEV2wTNg9wkr2L':'Các dạng bài đọc hiểu TOEIC',
  '1El8EHN4zTQTZeEa06fxvlq_ns5s6lLhY':'30 Days for TOEIC Reading',
  '1lg27QJcSuv7Qg9dmubzC_1g2uFjvPf5R':'30 Days for 800 TOEIC Listening',
  '1xcMJWJgBXlePK66YjLcFAieUXdjax9tF':'Speaking & Writing trong 90 ngày',
  '1unBIXQmg3AGI97rH205uvAgWo9CRTXzX':'TOEIC 450 & 650 · IIG Vietnam',
  '15ysCWN7IEiS6Kcw-1vT4w-hbTHVCz1tt':'Luyện đề TOEIC cấp tốc',
  '1Kww4E627c8vOal89cQGn2YTwFfoTAEDC':'Nền tảng & luyện đề · BENZEN TOEIC',
  '17L-ZAHLYiWZeD_3cWVa9Lyk53DRZhx9z':'TOEIC từ cơ bản đến nâng cao · EDMICR',
  '1pCQAKuQM_ywmrCbxjQeTb787sDgi8dfv':'Ngữ pháp & giải đề · Ms Thắm',
  '14y6jzzSzzLtR_j5yuvnET9sOQZJ9ZkWc':'Thư viện khóa học bổ trợ'
};

let libraryView,learning,examRoom,studyRoom,todayHub,reviewHub,evidenceProgress,unifiedSearch;
let catalog,nodes,byId,courses,videos,docs,progress,storageOK=true,activeCourse=null,activeItem=null,libraryTab='courses',libPage=1,libQuery='',libTag='Tất cả',libCourse='',playerReturn=null,noteDebounce;
const timers={running:false,left:1500,interval:null,started:0,base:0};
const dayKey=(date=new Date())=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const todayCount=()=>Object.values(progress.completed).filter(d=>dayKey(new Date(d))===dayKey()).length;
const completeCount=c=>c.videos.filter(v=>progress.completed[v.id]).length;
const pct=c=>c.videos.length?Math.round(completeCount(c)/c.videos.length*100):0;
const fileURL=f=>`https://drive.google.com/file/d/${encodeURIComponent(f.id)}/view`;
const folderURL=id=>`https://drive.google.com/drive/folders/${encodeURIComponent(id)}`;
const button=(label,attrs='',style='btn-primary',ic='')=>`<button class="btn ${style}" ${attrs}>${ic?icon(ic):''}${label}</button>`;
const layout=createLayout({icon});

function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toast.timeout);toast.timeout=setTimeout(()=>$('#toast').classList.remove('show'),3500)}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(progress));return true}catch{storageOK=false;toast('Trình duyệt chưa cho phép lưu. Hãy xuất tiến độ để giữ dữ liệu.');return false}}
function readState(ids){try{return safeProgress(JSON.parse(localStorage.getItem(KEY)||'{}'),ids)}catch{storageOK=false;return safeProgress({},ids)}}
function resourceTitle(f){return resourceLabel(f,byId.get(f.parent)?.name||'')}
function courseFor(id){return courses.find(c=>c.id===id)}
function pathFor(item){const parts=[];let p=byId.get(item.parent),depth=0;while(p&&p.parent!==ROOT&&depth++<15){parts.unshift(cleanTitle(p.name));p=byId.get(p.parent)}return parts.join(' / ')}

function renderNav(){
  const routes=[
    ['home','Hôm nay','home'],
    ['courses','Khóa học','book'],
    ['review','Ôn tập','target'],
    ['exams','Thi thử','clock'],
    ['progress','Tiến bộ','chart']
  ];
  const current=(location.hash.slice(1).split('?')[0]||'home');
  const isRouteActive=id=>{
    if(id==='home')return current==='home'||current==='today'||current==='';
    if(id==='courses')return current==='courses'||current==='library'||current==='course'||current==='study'||current==='document';
    if(id==='review')return current==='review'||current==='practice'||current==='quiz'||current==='cards'||current==='vocabulary';
    if(id==='exams')return ['exams','exam','exam-run','exam-result','exam-review','exam-review-run','exam-analytics','admin-exams'].includes(current);
    if(id==='progress')return current==='progress';
    return current===id;
  };

  $('#nav').innerHTML=routes.map(([id,label,ic])=>`
    <a href="#${id}" aria-label="${label}" title="${label}" data-nav-label="${label}" class="nav-item ${isRouteActive(id)?'active':''}" ${isRouteActive(id)?'aria-current="page"':''}>
      ${icon(ic)}<span>${label}</span>
    </a>
  `).join('');

  if($('#side-ic-notes'))$('#side-ic-notes').innerHTML=icon('note');
  if($('#side-ic-account'))$('#side-ic-account').innerHTML=icon('profile');
  if($('#mob-ic-home'))$('#mob-ic-home').innerHTML=icon('home');
  if($('#mob-ic-courses'))$('#mob-ic-courses').innerHTML=icon('book');
  if($('#mob-ic-review'))$('#mob-ic-review').innerHTML=icon('target');
  if($('#mob-ic-more'))$('#mob-ic-more').innerHTML=icon('more');

  $('#sidebar-secondary')?.querySelectorAll('a').forEach(a=>{
    const hash=a.getAttribute('href')?.slice(1);
    const active=current===hash;
    a.classList.toggle('active',active);
    if(active)a.setAttribute('aria-current','page');
    else a.removeAttribute('aria-current');
  });

  $('#mobile-bottom-nav')?.querySelectorAll('.mobile-nav-item').forEach(a=>{
    const key=a.dataset.mobileNav;
    if(!key)return;
    const active=isRouteActive(key);
    a.classList.toggle('active',active);
    if(active)a.setAttribute('aria-current','page');
    else a.removeAttribute('aria-current');
  });

  const pageLabels={
    home:'Hôm nay · Bắt đầu học',
    today:'Hôm nay · Bắt đầu học',
    courses:'Khóa học TOEIC',
    library:'Khóa học TOEIC',
    course:'Chi tiết khóa học',
    study:'Phòng học thống nhất',
    document:'Tài liệu học tập',
    review:'Ôn tập tập trung',
    practice:'Luyện tập & Ôn tập',
    quiz:'Tự kiểm tra bài học',
    cards:'Ôn tập thẻ từ vựng',
    vocabulary:'Sổ từ vựng',
    exams:'Phòng thi TOEIC',
    exam:'Chuẩn bị đề thi',
    'exam-run':'Phòng làm bài TOEIC',
    'exam-result':'Chữa bài TOEIC',
    'exam-review':'Sổ lỗi sai TOEIC',
    'exam-review-run':'Buổi ôn tập câu sai TOEIC',
    'exam-analytics':'Phân tích luyện đề',
    'admin-exams':'Quản trị đề thi TOEIC',
    progress:'Tiến bộ có căn cứ',
    notes:'Sổ ghi chú',
    account:'Tài khoản & Lịch sử',
    saved:'Bài học đã lưu',
    plan:'Kế hoạch học tuần',
    source:'Nguồn học liệu Google Drive',
    content:'Nguồn & phạm vi học liệu',
    admin:'Quản trị nội dung',
    imports:'Nhập học liệu',
    focus:'Góc tập trung'
  };
  $('#page-label').textContent=pageLabels[current]||'Tổng quan';
}

function openMobileMore(){
  const d=$('#mobile-more-sheet');
  if(!d)return;
  d.innerHTML=`
    <div class="mobile-more-header">
      <h3 id="mobile-more-title">Khám phá &amp; Cài đặt</h3>
      <button type="button" class="icon-button" data-close-more aria-label="Đóng">${icon('close')}</button>
    </div>
    <div class="mobile-more-grid">
      <a href="#exams" class="mobile-more-item" data-close-more>
        ${icon('clock')}
        <span><strong>Thi thử TOEIC</strong><br><small style="color:var(--muted)">Đề thi chuẩn cấu trúc</small></span>
      </a>
      <a href="#progress" class="mobile-more-item" data-close-more>
        ${icon('chart')}
        <span><strong>Tiến bộ có căn cứ</strong><br><small style="color:var(--muted)">Bằng chứng học thật</small></span>
      </a>
      <a href="#notes" class="mobile-more-item" data-close-more>
        ${icon('note')}
        <span><strong>Sổ ghi chú</strong><br><small style="color:var(--muted)">Xem lại ghi chú</small></span>
      </a>
      <a href="#plan" class="mobile-more-item" data-close-more>
        ${icon('route')}
        <span><strong>Kế hoạch tuần</strong><br><small style="color:var(--muted)">Nhịp học 7 ngày</small></span>
      </a>
      <a href="#vocabulary" class="mobile-more-item" data-close-more>
        ${icon('spark')}
        <span><strong>Sổ từ vựng</strong><br><small style="color:var(--muted)">Thẻ từ theo chủ đề</small></span>
      </a>
      <a href="#account" class="mobile-more-item" data-close-more>
        ${icon('profile')}
        <span><strong>Tài khoản &amp; Dữ liệu</strong><br><small style="color:var(--muted)">Đồng bộ đám mây</small></span>
      </a>
      <a href="#source" class="mobile-more-item" data-close-more>
        ${icon('folder')}
        <span><strong>Nguồn Google Drive</strong><br><small style="color:var(--muted)">Học liệu Drive gốc</small></span>
      </a>
      <button type="button" class="mobile-more-item" data-settings data-close-more style="text-align:left;cursor:pointer;background:none;border:1px solid var(--line);border-radius:10px">
        ${icon('target')}
        <span><strong>Mục tiêu học tập</strong><br><small style="color:var(--muted)">Điểm và nhịp học</small></span>
      </button>
    </div>
  `;
  if(!d.open)d.showModal();
}

const featured=()=>['1EcEHLSxxlsRFtJCXMGimzy2rKd2Ej-zD','1m8UUnkpyTOffREm7GjITTPrDkZ5OmHUb','1L3owxwaCrNtU7tNfclhZ7ZIeM3yeq3kM'].map(courseFor).filter(Boolean);
function art(c,i=0){let word='Learn.<br>Grow.',small='YOUR NEXT CHAPTER',ic='book';const t=normalize(c.name);if(/nghe|listening/.test(t)&&!/doc|reading/.test(t)){word='Listen.<br>Learn.';small='LISTENING';ic='headphones'}else if(/reading|doc/.test(t)){word='Read.<br>Grow.';small='READING'}else if(/ngu phap|mat goc|can ban|nen tang/.test(t)){word='Back to<br>basics.';small='NỀN TẢNG';ic='spark'}else if(/study4/.test(t)){word='Step by<br>step.';small='7 PARTS · 1 GOAL';ic='headphones'}else if(/speaking|writing/.test(t)||/nói|viết/i.test(c.name)){word='Say it.<br>Write it.';small='SPEAKING & WRITING';ic='note'}else if(/prep/.test(t)){word='Aim<br>higher.';small='TOEIC JOURNEY';ic='target'}return `<div class="course-art tone-${i%5}"><span class="art-number">${String(i+1).padStart(2,'0')}</span><div class="art-word"><small>${small}</small>${word}</div><span class="art-symbol">${icon(ic)}</span></div>`}
function courseCard(c,i){return `<button class="course-card" data-course="${c.id}">${art(c,i)}<div class="course-card-content"><span class="course-category">${esc(c.tags.slice(0,2).join(' · ')||'KHÓA HỌC TOEIC')}</span><h3>${esc(c.title)}</h3><div class="course-meta"><span>${icon('video')}${fmt(c.videos.length)} video</span><span>${icon('note')}${fmt(c.docs.length)} tài liệu</span></div><div class="course-bottom"><span>${completeCount(c)?`${fmt(completeCount(c))} bài đã hoàn thành`:'Bắt đầu hành trình mới'}</span><span>${completeCount(c)?pct(c)+'%':'Khám phá ↗'}</span></div></div></button>`}
function heading(title,sub,action=''){return `<div class="page-heading"><div><div class="eyebrow">LEARN AT YOUR OWN PACE</div><h1>${title}</h1><p class="subtitle">${sub}</p></div>${action}</div>`}
function stats(){return `<div class="stat-grid"><div class="stat"><div class="stat-icon">${icon('check')}</div><div><strong>${fmt(Object.keys(progress.completed).length)}<span class="stat-unit">bài học</span></strong><small>Đã hoàn thành</small></div></div><div class="stat"><div class="stat-icon">${icon('book')}</div><div><strong>${fmt(courses.length)}<span class="stat-unit">khóa học</span></strong><small>Trong thư viện của bạn</small></div></div><div class="stat"><div class="stat-icon">${icon('clock')}</div><div><strong>${fmt(Math.floor(progress.focus/60))}<span class="stat-unit">phút</span></strong><small>Thời gian tập trung đã lưu</small></div></div></div>`}
function firstVideo(){const last=byId.get(progress.last);return last&&isVideo(last)?last:featured().flatMap(c=>c.videos).find(v=>!progress.completed[v.id])||videos[0]}

function libraryOriginal(){return `${heading('Thư viện của bạn','Một nơi cho tất cả bài giảng. Chọn điều bạn muốn học hôm nay.')}<section class="library"><div class="tabs" role="tablist" aria-label="Loại học liệu">${[['courses','Khóa học',courses.length],['videos','Video bài giảng',videos.length],['docs','Tài liệu',docs.length]].map(([k,label,count])=>`<button class="tab ${libraryTab===k?'active':''}" data-tab="${k}" role="tab" aria-selected="${libraryTab===k}">${label} <span class="muted">(${fmt(count)})</span></button>`).join('')}</div><div class="filters"><label class="search-box">${icon('search')}<input id="library-search" type="search" placeholder="Tìm theo tên bài, ngữ pháp, Part 1…" value="${esc(libQuery)}" aria-label="Tìm kiếm học liệu"></label><select id="course-filter" aria-label="Lọc khóa học" ${libraryTab==='courses'?'hidden':''}><option value="">Tất cả khóa học</option>${courses.map(c=>`<option value="${c.id}" ${libCourse===c.id?'selected':''}>${esc(c.title)}</option>`).join('')}</select></div><div class="filter-chips" aria-label="Lọc chủ đề">${['Tất cả','Nền tảng','Listening','Reading','Ngữ pháp','Từ vựng','Speaking & Writing','Luyện đề'].map(t=>`<button class="chip ${libTag===t?'active':''}" data-tag="${esc(t)}" aria-pressed="${libTag===t}">${esc(t)}</button>`).join('')}</div><div id="library-results" aria-live="polite"></div></section>`}
function library(){
  const html=libraryOriginal(),group=new URLSearchParams(location.hash.split('?')[1]||'').get('group');
  return libraryTab==='courses'?html.replace('<div class="filters">',libraryView.libraryIntro(group)+'<div class="filters">').replace('<div class="filter-chips"','<div hidden class="filter-chips"'):html;
}
function fillLibrary(){const source=libraryTab==='courses'?courses:libraryTab==='videos'?videos:docs,q=normalize(libQuery.trim());const list=source.filter(f=>(!q||f.search.includes(q))&&(libTag==='Tất cả'||f.tags.includes(libTag))&&(!libCourse||libraryTab==='courses'||f.course===libCourse));if(libraryTab==='courses'){$('#library-results').innerHTML=libraryView.groupedCourses(list);return;}const size=libraryTab==='courses'?12:25,max=Math.max(1,Math.ceil(list.length/size));libPage=Math.min(libPage,max);$('#library-results').innerHTML=`<p class="result-summary">${fmt(list.length)} ${libraryTab==='courses'?'khóa học':libraryTab==='videos'?'video':'tài liệu'}${q?' phù hợp với tìm kiếm':''}</p>${list.length?(libraryTab==='courses'?`<div class="course-grid">${list.slice((libPage-1)*size,libPage*size).map((c,i)=>courseCard(c,c.index)).join('')}</div>`:`<div class="video-list">${list.slice((libPage-1)*size,libPage*size).map(videoRow).join('')}</div>`):empty('Chưa tìm thấy bài phù hợp','Thử từ khóa ngắn hơn hoặc chọn “Tất cả” để mở rộng tìm kiếm.','search')}${max>1?`<div class="pagination">${button('Trang trước',`data-page="${libPage-1}" ${libPage===1?'disabled':''}`,'btn-secondary','back')}<span>${libPage} / ${max}</span>${button('Trang sau',`data-page="${libPage+1}" ${libPage===max?'disabled':''}`,'btn-secondary','arrow')}</div>`:''}`}
function empty(title,desc,ic='book',action=''){return `<div class="empty">${icon(ic)}<h3>${title}</h3><p>${desc}</p>${action}</div>`}
function videoRow(f){const video=isVideo(f),done=Boolean(progress.completed[f.id]),hasNote=Boolean(progress.notes[f.id]?.trim()),c=courseFor(f.course);return `<div class="video-row"><button class="row-icon" data-play="${f.id}" aria-label="${video?'Xem video':'Mở tài liệu'} ${esc(resourceTitle(f))}">${icon(video?'play':f.mime.startsWith('audio/')?'headphones':'note')}</button><button class="video-info" data-play="${f.id}" style="text-align:left"><h3>${esc(resourceTitle(f))}</h3><p>${esc(c?.title||'Học liệu')} ${f.path?'· '+esc(f.path):''}</p></button>${hasNote?'<span class="row-note-badge">Có ghi chú</span>':''}${learning?`<a class="icon-button" href="${learning.hasDocument(f.id)?'#document?id='+encodeURIComponent(f.id):learning.studyURL(f.course,f.parent,f.id)}" data-learn-open aria-label="${learning.hasDocument(f.id)?'Học nhanh tài liệu':'Mở phòng học thống nhất'}" title="${learning.hasDocument(f.id)?'Học nhanh tài liệu':'Mở phòng học thống nhất'}">${icon('target')}</a>`:''}${video?`<button class="icon-button row-complete-btn ${done?'is-done':''}" data-complete="${f.id}" aria-pressed="${done}" aria-label="${done?'Bỏ đánh dấu đã học':'Đánh dấu đã học'}" title="${done?'Đã học (bấm để bỏ)':'Đánh dấu đã học'}">${icon('check')}</button>`:''}${video?`<button class="icon-button ${progress.saved.includes(f.id)?'saved':''}" data-save="${f.id}" aria-label="${progress.saved.includes(f.id)?'Bỏ lưu':'Lưu'} bài học" aria-pressed="${progress.saved.includes(f.id)}">${icon('bookmark')}</button>`:`<a class="icon-button" href="${fileURL(f)}" target="_blank" rel="noopener noreferrer" aria-label="Mở trên Google Drive">${icon('external')}</a>`}</div>`}
function courseDetail(id,folder){activeCourse=courseFor(id);return libraryView.courseDetail(id,folder)}
function saved(){const list=progress.saved.map(id=>byId.get(id)).filter(Boolean);return `${heading('Để dành cho buổi học sau','Những bài giảng bạn muốn xem lại, ở ngay đây.')}<div class="video-list">${list.length?list.map(videoRow).join(''):empty('Một góc nhỏ cho bài học yêu thích','Bấm biểu tượng đánh dấu bên cạnh video để lưu lại.','bookmark',button('Khám phá thư viện','data-nav="courses"','btn-primary','book'))}</div>`}
function notes(){const list=Object.entries(progress.notes).filter(([id,note])=>note.trim()&&byId.has(id));return `${heading('Những điều mình đã học','Ghi lại để nhớ lâu hơn. Ghi chú tự lưu trên trình duyệt này.')}<p class="result-summary">${fmt(list.length)} ghi chú</p>${list.length?list.map(([id,note])=>{const f=byId.get(id);return `<article class="note-card"><h3>${esc(resourceTitle(f))}</h3><pre>${esc(note)}</pre><div class="note-footer"><span>${esc(courseFor(f.course)?.title||'')}</span><button class="text-button" data-play="${id}">Mở bài học ${icon('arrow')}</button></div></article>`}).join(''):empty('Cuốn sổ của bạn đang chờ dòng đầu tiên','Mở một video và viết vào ô ghi chú bên dưới để bắt đầu.','note',button('Chọn bài học','data-nav="courses"','btn-primary','book'))}`}
function progressView(){const days=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);return {key:dayKey(d),label:d.toLocaleDateString('vi-VN',{weekday:'short'}),count:0}});for(const date of Object.values(progress.completed)){const d=days.find(d=>d.key===dayKey(new Date(date)));if(d)d.count++}const max=Math.max(1,...days.map(d=>d.count));const active=courses.filter(c=>completeCount(c)>0||c.videos.some(v=>v.id===progress.last));return `${heading('Nhìn lại những bước tiến','Mỗi bài học hoàn thành đều là một điều đáng ghi nhận.',button('Mục tiêu','data-settings','btn-secondary','target'))}${stats()}<div class="progress-layout"><section class="panel"><div class="section-title"><h2>Nhịp học 7 ngày qua</h2><span class="focus-pill">${days.reduce((n,d)=>n+d.count,0)} bài</span></div><p class="fine-print">Số bài bạn đánh dấu hoàn thành, theo ngày trên thiết bị.</p><div class="week-chart">${days.map((d,i)=>`<div class="week-day"><div class="week-bar ${i===6?'today':''}" style="height:${Math.max(3,105*d.count/max)}px"><span>${d.count}</span></div><span>${esc(d.label)}</span></div>`).join('')}</div></section><section class="panel"><h2>Hành trình đang học</h2>${active.length?active.map(c=>`<div class="progress-course"><div><button data-course="${c.id}">${esc(c.title)}</button><small>${completeCount(c)}/${fmt(c.videos.length)}</small></div><div class="progress-track"><span style="width:${pct(c)}%"></span></div></div>`).join(''):`<p class="fine-print" style="margin-top:20px">Bắt đầu một khóa học để thấy tiến độ của bạn tại đây.</p>${button('Chọn khóa học','data-nav="courses"','btn-soft','book')}`}</section></div><div class="panel section-gap"><h3>Dữ liệu học tập của bạn</h3><p class="fine-print">Tiến độ, ghi chú và bài đã lưu được giữ trên trình duyệt này, chưa đồng bộ giữa các thiết bị. Xuất một bản sao để lưu trữ hoặc chuyển sang máy khác.</p><div class="data-actions">${button('Xuất tiến độ','data-export','btn-secondary','download')}<label class="btn btn-secondary file-control" tabindex="0">${icon('folder')}Nhập tiến độ<input type="file" id="import-progress" accept="application/json,.json" aria-label="Nhập tệp tiến độ JSON"></label></div>${!storageOK?'<p class="error-message">Trình duyệt chưa cho phép lưu dữ liệu. Hãy xuất tiến độ trước khi đóng trang.</p>':''}</div>`}
function source(){return `${heading('Từ thư viện của bạn','Học liệu gốc trên Google Drive, trong một không gian học tập riêng.')}<div class="source-banner">${driveIcon}<div><h3>Thư mục TOEIC đã được lập danh mục</h3><p>Nhập ngày ${esc(catalog.importedDate)} · Video và tài liệu vẫn nằm trên Google Drive.</p></div></div><div class="source-grid"><section class="panel"><h3>Combo khóa luyện thi TOEIC</h3><p>Danh mục được đọc từ thư mục bạn cung cấp, giữ liên kết đến từng bài giảng và tài liệu gốc.</p><div class="source-summary"><div class="source-number">${fmt(courses.length)}<small>nhóm khóa học</small></div><div class="source-number">${fmt(videos.length)}<small>video bài giảng</small></div><div class="source-number">${fmt(docs.length)}<small>tài liệu & âm thanh</small></div></div><a class="btn btn-primary" href="${ROOT_URL}" target="_blank" rel="noopener noreferrer">${icon('external')}Mở Google Drive gốc</a></section><section class="panel"><h3>Cách mở video và cập nhật thư viện</h3><p>Video được phát bằng trình xem Google Drive. Hãy đăng nhập tài khoản Google có quyền truy cập thư mục. Nếu video không hiển thị, bấm “Mở trên Drive” trong cửa sổ bài học.</p><p>Đây là danh mục đã nhập, chưa tự động đồng bộ thay đổi từ Drive. Khi bạn thêm bài mới, yêu cầu cập nhật thư viện trong chat để đọc lại danh mục.</p><p>Tiến độ do bạn đánh dấu thủ công. Web không đọc được vị trí xem trong trình phát của Google.</p></section></div>${catalog.incompleteFolders?`<p class="fine-print section-gap">${fmt(catalog.incompleteFolders)} thư mục chưa đọc hết hoặc chưa đọc được. Bạn vẫn có thể mở thư mục gốc để xem toàn bộ.</p>`:''}<p class="fine-print section-gap">Tên và cách nhóm bài học dựa trên danh mục nguồn; nội dung video chưa được phiên âm hay xác minh. Các tệp giới thiệu nhóm và quảng bá không được đưa vào danh sách học liệu.</p>`}

function navigate(){
  if(!catalog)return;
  const [route,query]=location.hash.slice(1).split('?'),params=new URLSearchParams(query||'');
  activeCourse=null;
  renderNav();
  layout.closeMobile();
  let html;

  if(route!=='study'){
    studyRoom?.cleanup();
  }

  switch(route){
    case'today':
    case'home':
    case'':
      html=todayHub?todayHub.render():learning.dashboard();
      break;
    case'courses':
    case'library':
      if(params.has('tab'))libraryTab=['courses','videos','docs'].includes(params.get('tab'))?params.get('tab'):'courses';
      html=library();
      break;
    case'course':
      html=courseDetail(params.get('id'),params.get('folder'));
      break;
    case'study':
      html=studyRoom?studyRoom.render(params):learning.studyPage(params);
      break;
    case'review':
      html=reviewHub?reviewHub.render(params):learning.hub(params);
      break;
    case'practice':
      if(params.has('mode')||params.has('id')){
        html=learning.hub(params);
      }else{
        html=reviewHub?reviewHub.render(params):learning.hub(params);
      }
      break;
    case'progress':
      html=evidenceProgress?evidenceProgress.render():progressView();
      break;
    case'exams':
      html=examRoom.examsPage();
      break;
    case'exam':
      html=examRoom.examPrepPage(params);
      break;
    case'exam-run':
      html=examRoom.examRunPage(params);
      break;
    case'exam-result':
      html=examRoom.examResultPage(params);
      break;
    case'exam-review':
      html=examRoom.examReviewPage(params);
      break;
    case'exam-review-run':
      html=examRoom.examReviewRunPage(params);
      break;
    case'exam-analytics':
      html=examRoom.examAnalyticsPage();
      break;
    case'admin-exams':
      html=examRoom.adminExamsPage(params);
      break;
    case'plan':
      html=learning.planPage(params);
      break;
    case'saved':
      html=saved();
      break;
    case'notes':
      html=notes();
      break;
    case'source':
      html=source();
      break;
    case'focus':
      html=heading('Góc tập trung · 25 phút','Bấm bắt đầu khi sẵn sàng. Chỉ thời gian bộ đếm đang chạy được lưu.')+`<div class="timer-card"><div><h3>Một khoảng thời gian dành cho việc học</h3><p>Có thể chuyển sang bài học trong khi bộ đếm chạy.</p></div><span class="timer-value" data-timer-value>25:00</span>${button('Bắt đầu','data-timer','btn-soft','play')}</div>`;
      break;
    case'vocabulary':
      html=learning.vocabulary();
      break;
    case'content':
      html=learning.sourceAudit();
      break;
    case'account':
      html=learning.accountPage(params);
      break;
    case'admin':
      if(params.get('tab')==='exams'){html=examRoom.adminExamsPage(params);break;}
      html=learning.adminPage(params);
      break;
    case'imports':
      html=learning.importsPage(params);
      break;
    case'document':
      html=learning.documentPage(params);
      break;
    case'learn':
      html=learning.activePage(params);
      break;
    case'quiz':
      html=learning.quiz(params);
      break;
    case'cards':
      html=learning.cards(params);
      break;
    default:
      html=todayHub?todayHub.render():learning.dashboard();
  }

  $('#main').innerHTML=html;
  if(route==='courses'||route==='library')fillLibrary();
  if(route==='course')libraryView.fillFolder();
  if(route==='study')studyRoom?.afterRender();
  learning?.afterRender();
  layout.sync();
  updateTimerUI();
  window.scrollTo({top:0,behavior:'instant'});
  document.title=`${$('#page-label').textContent} · TOEIC Studio`;
}

function refresh(){const scroll=window.scrollY;navigate();window.scrollTo({top:scroll,behavior:'instant'})}
function flushNote(){clearTimeout(noteDebounce);if(activeItem&&$('#note-editor')){progress.notes[activeItem.id]=$('#note-editor').value;persist()}}

function openPlayer(id){
  const f=byId.get(id);
  if(!f||isFolder(f))return;
  flushNote();
  activeItem=f;
  progress.last=isVideo(f)?id:progress.last;
  persist();
  location.hash=`study?course=${encodeURIComponent(f.course)}&folder=${encodeURIComponent(f.parent)}&file=${encodeURIComponent(f.id)}`;
}

function closePlayer(){flushNote();if($('#player')?.open){$('#player').close();$('#player').innerHTML='';}activeItem=null;refresh();playerReturn?.focus?.()}
function toggleSaved(id){if(!byId.has(id))return;progress.saved=progress.saved.includes(id)?progress.saved.filter(x=>x!==id):[...progress.saved,id];persist();renderNav();const yes=progress.saved.includes(id);document.querySelectorAll(`[data-save="${id}"]`).forEach(b=>{b.classList.toggle('saved',yes);b.setAttribute('aria-pressed',String(yes));b.setAttribute('aria-label',yes?'Bỏ lưu bài học':'Lưu bài học');if(b.classList.contains('btn'))b.innerHTML=icon('bookmark')+(yes?'Đã lưu':'Lưu bài')});if(!$('#player').open)refresh();toast(yes?'Đã lưu bài học cho buổi sau.':'Đã bỏ bài học khỏi mục đã lưu.')}
function toggleCompleted(id){if(!isVideo(byId.get(id)||{mime:''}))return;const yes=!progress.completed[id];if(yes)progress.completed[id]=new Date().toISOString();else delete progress.completed[id];persist();if(activeItem?.id===id)openPlayer(id);else refresh();toast(yes?'Thêm một bài học hoàn thành. Tiếp tục nhé!':'Đã bỏ đánh dấu hoàn thành.')}

function settings(){const d=$('#settings');d.innerHTML=`<form id="goal-form"><div class="dialog-header"><h2 id="settings-title">Mục tiêu của bạn</h2><button type="button" class="icon-button" data-close-settings aria-label="Đóng">${icon('close')}</button></div><p class="fine-print">Chọn một mục tiêu vừa sức và trở lại học đều đặn.</p><label class="form-field">Mục tiêu TOEIC<select name="goal">${[450,650,850].map(n=>`<option ${n===progress.goal?'selected':''} value="${n}">${n} điểm</option>`).join('')}</select></label><label class="form-field">Nhịp học mỗi ngày<select name="daily">${[1,2,3,5].map(n=>`<option ${n===progress.daily?'selected':''} value="${n}">${n} bài học / ngày</option>`).join('')}</select></label><p class="fine-print">Bạn luôn có thể thay đổi khi thời gian và nhu cầu thay đổi.</p><button class="btn btn-primary" type="submit">${icon('check')}Lưu mục tiêu</button></form>`;d.showModal()}
function updateTimerUI(){const t=`${String(Math.floor(timers.left/60)).padStart(2,'0')}:${String(timers.left%60).padStart(2,'0')}`;document.querySelectorAll('[data-timer-value]').forEach(e=>e.textContent=t);document.querySelectorAll('[data-timer]').forEach(e=>e.innerHTML=icon(timers.running?'pause':'play')+(timers.running?'Tạm dừng':timers.left===1500?'Bắt đầu':'Tiếp tục'))}
function bankFocus(){if(!timers.running)return;const elapsed=Math.min(timers.base,Math.max(0,Math.floor((Date.now()-timers.started)/1000)));progress.focus+=elapsed;learning?.recordFocus(timers.started,timers.started+elapsed*1000);timers.left=Math.max(0,timers.base-elapsed);timers.running=false;clearInterval(timers.interval);persist()}
function toggleTimer(){if(timers.running){bankFocus();refresh();return}if(timers.left<=0)timers.left=1500;timers.running=true;timers.started=Date.now();timers.base=timers.left;timers.interval=setInterval(()=>{timers.left=Math.max(0,timers.base-Math.floor((Date.now()-timers.started)/1000));updateTimerUI();if(timers.left===0){bankFocus();toast('Bạn đã dành 25 phút tập trung. Nghỉ một chút nhé!');timers.left=1500;refresh()}},500);updateTimerUI()}

function exportProgress(){flushNote();const blob=new Blob([JSON.stringify({app:'TOEIC Studio',exportedAt:new Date().toISOString(),...progress,learning:learning?.exportData()},null,2)],{type:'application/json'}),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=`toeic-studio-tien-do-${dayKey()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);toast('Đã xuất bản sao tiến độ và ghi chú.')}
async function importProgress(file){if(!file)return;if(file.size>5000000){toast('Tệp quá lớn. Vui lòng chọn bản xuất dưới 5 MB.');return}try{const v=JSON.parse(await file.text());if(v.app!=='TOEIC Studio'||v.version!==1||!v.completed||!Array.isArray(v.saved)||!v.notes)throw Error();if(!confirm('Thay tiến độ, mục tiêu và ghi chú hiện tại bằng bản nhập này? Hãy xuất bản sao trước nếu cần.'))return;bankFocus();progress=safeProgress(v,new Set(nodes.map(n=>n.id)));if(v.learning)learning.importData(v.learning);persist();refresh();toast('Đã nhập dữ liệu học tập.')}catch{toast('Không đọc được tệp. Hãy chọn tệp JSON đã xuất từ TOEIC Studio.')}}

document.addEventListener('click',event=>{
  const b=event.target.closest('button,a');
  if(!b)return;
  if(b.hasAttribute('data-player-chapter')){closePlayer();}
  else if(b.hasAttribute('data-close-more')){$('#mobile-more-sheet')?.close();}
  else if(b.hasAttribute('data-nav'))location.hash=b.dataset.nav;
  else if(b.hasAttribute('data-course'))location.hash='course?id='+b.dataset.course;
  else if(b.hasAttribute('data-play'))openPlayer(b.dataset.play);
  else if(b.hasAttribute('data-save'))toggleSaved(b.dataset.save);
  else if(b.hasAttribute('data-complete'))toggleCompleted(b.dataset.complete);
  else if(b.hasAttribute('data-close-player'))closePlayer();
  else if(b.hasAttribute('data-settings'))settings();
  else if(b.hasAttribute('data-close-settings'))$('#settings').close();
  else if(b.hasAttribute('data-tab')){libraryTab=b.dataset.tab;libPage=1;if(libraryTab==='courses')libTag='Tất cả';history.replaceState(null,'','#library');refresh()}
  else if(b.hasAttribute('data-tag')){libTag=b.dataset.tag;libPage=1;document.querySelectorAll('[data-tag]').forEach(x=>{x.classList.toggle('active',x.dataset.tag===libTag);x.setAttribute('aria-pressed',String(x.dataset.tag===libTag))});fillLibrary()}
  else if(b.hasAttribute('data-page')){libPage=Number(b.dataset.page);fillLibrary();$('#library-results').scrollIntoView({block:'start',behavior:'instant'})}
  else if(b.hasAttribute('data-timer'))toggleTimer();
  else if(b.hasAttribute('data-export'))exportProgress();
  else if(b.hasAttribute('data-docs-course')){libCourse=b.dataset.docsCourse;libraryTab='docs';libPage=1;location.hash='library'}
});

document.addEventListener('input',event=>{
  if(event.target.id==='library-search'){libQuery=event.target.value;libPage=1;fillLibrary()}
  else if(event.target.id==='note-editor'){
    clearTimeout(noteDebounce);
    $('#note-status').textContent='Đang lưu…';
    noteDebounce=setTimeout(()=>{
      if(persistNote())$('#note-status').textContent='Đã lưu trên trình duyệt';
      else $('#note-status').textContent='Chưa lưu được · hãy sao chép ghi chú';
    },450);
  }
});

function persistNote(){if(!activeItem||!$('#note-editor'))return false;progress.notes[activeItem.id]=$('#note-editor').value;return persist()}
document.addEventListener('change',event=>{
  if(event.target.id==='course-filter'){libCourse=event.target.value;libPage=1;fillLibrary()}
  if(event.target.id==='import-progress')importProgress(event.target.files[0]);
});

document.addEventListener('submit',event=>{
  if(event.target.id!=='goal-form')return;
  event.preventDefault();
  const form=new FormData(event.target);
  progress.goal=Number(form.get('goal'));
  progress.daily=Number(form.get('daily'));
  persist();
  $('#settings').close();
  refresh();
  toast('Đã lưu mục tiêu. Mình bắt đầu từ hôm nay nhé.');
});

$('#search-icon').innerHTML=icon('search');
$('#drive-icon').innerHTML=driveIcon;

$('#search-shortcut').onclick=()=>unifiedSearch?.open();
$('#mobile-more-btn')?.addEventListener('click',openMobileMore);
$('#mobile-more-sheet')?.addEventListener('click',e=>{
  if(e.target===$('#mobile-more-sheet')){
    const r=$('#mobile-more-sheet').getBoundingClientRect();
    if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('#mobile-more-sheet').close();
  }
});

document.addEventListener('keydown',e=>{
  if(e.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)&&!$('#player')?.open&&!$('#settings')?.open&&!$('#search-dialog')?.open&&!$('#mobile-more-sheet')?.open){
    e.preventDefault();
    unifiedSearch?.open();
  }
});

$('#player').addEventListener('cancel',e=>{e.preventDefault();closePlayer()});
$('#player').addEventListener('click',e=>{if(e.target===$('#player')){const r=$('#player').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closePlayer()}});
window.addEventListener('hashchange',navigate);
window.addEventListener('pagehide',()=>{flushNote();bankFocus()});
window.addEventListener('storage',e=>{if(e.key===KEY&&!$('#player').open){progress=readState(new Set(nodes.map(n=>n.id)));refresh()}});

async function boot(){
  try{
    const response=await fetch('./catalog.json');
    if(!response.ok)throw Error('Không tải được danh mục');
    catalog=await response.json();
    nodes=catalog.items;
    byId=new Map(nodes.map(n=>[n.id,n]));
    courses=nodes.filter(n=>n.parent===ROOT&&isFolder(n)).sort((a,b)=>a.name.localeCompare(b.name,'vi',{numeric:true}));
    const usable=nodes.filter(n=>isFolder(n)||isLearningResource(n));
    videos=usable.filter(isVideo);
    docs=usable.filter(isDocument);

    for(const f of [...videos,...docs]){
      f.path=pathFor(f);
      f.tags=tagsFor(f.name+' '+f.path+' '+(byId.get(f.course)?.name||''));
      f.search=normalize(resourceTitle(f)+' '+f.path+' '+(names[f.course]||byId.get(f.course)?.name||''));
    }

    for(const [i,c]of courses.entries()){
      c.title=names[c.id]||cleanTitle(c.name);
      c.videos=videos.filter(f=>f.course===c.id).sort((a,b)=>(a.path+'/'+a.name).localeCompare(b.path+'/'+b.name,'vi',{numeric:true}));
      c.docs=docs.filter(f=>f.course===c.id);
      c.tags=[...new Set([...tagsFor(c.name),...c.videos.flatMap(v=>v.tags)])];
      c.search=normalize(c.name+' '+c.title);
      c.index=i;
    }

    libraryView=createLibraryView({
      courses,
      videos,
      docs,
      nodes,
      esc,
      icon,
      fmt,
      button,
      courseCard,
      videoRow,
      heading,
      empty,
      progress:()=>progress,
      learningBlock:(c,f)=>learning?.courseBlock(c,f)||'',
      refreshLibrary:group=>{history.replaceState(null,'','#library?group='+group);refresh();}
    });

    progress=readState(new Set(nodes.map(n=>n.id)));
    examRoom=createExamRoom({
      esc,
      icon,
      heading,
      toast,
      previewURL:id=>'https://drive.google.com/file/d/'+encodeURIComponent(id)+'/preview',
      fileURL:id=>fileURL({id})
    });

    learning=await createLearning({
      index:libraryView.index,
      courses,
      byId,
      esc,
      icon,
      fmt,
      button,
      heading,
      empty,
      toast,
      progress:()=>progress,
      persist,
      playerOpen:()=>$('#player').open,
      closePlayer,
      snapshot:()=>({app:'TOEIC Studio',exportedAt:new Date().toISOString(),...progress,learning:learning.exportData()}),
      restore:value=>{bankFocus();progress=safeProgress(value,new Set(nodes.map(n=>n.id)));learning.importData(value.learning);persist();refresh()},
      refresh
    });

    studyRoom=createStudyRoom({
      index:libraryView.index,
      courses,
      byId,
      bank:learning.bank,
      getState:()=>learning.getState(),
      progress:()=>progress,
      persist,
      saveLearning:()=>learning.saveState(),
      esc,
      icon,
      fmt,
      toast,
      accountGrade:(...args)=>learning.grade(...args)
    });

    todayHub=createTodayHub({
      bank:learning.bank,
      courses,
      byId,
      getState:()=>learning.getState(),
      progress:()=>progress,
      persist,
      saveLearning:()=>learning.saveState(),
      esc,
      icon,
      fmt,
      heading,
      toast
    });

    reviewHub=createReviewHub({
      bank:learning.bank,
      courses,
      byId,
      getState:()=>learning.getState(),
      progress:()=>progress,
      persist,
      saveLearning:()=>learning.saveState(),
      esc,
      icon,
      fmt,
      heading,
      toast
    });

    evidenceProgress=createEvidenceProgress({
      bank:learning.bank,
      courses,
      getState:()=>learning.getState(),
      progress:()=>progress,
      saveLearning:()=>learning.saveState(),
      persist,
      esc,
      icon,
      fmt,
      heading,
      toast
    });

    unifiedSearch=createUnifiedSearch({
      bank:()=>learning.bank,
      getCourses:()=>courses,
      getNodes:()=>nodes,
      getState:()=>learning.getState(),
      getProgress:()=>progress,
      esc,
      icon,
      toast
    });

    navigate();
    if(!storageOK)toast('Chế độ lưu bị hạn chế. Bạn có thể xuất tiến độ để giữ lại dữ liệu.');
  }catch(error){
    $('#main').innerHTML=empty('Chưa mở được thư viện','Kiểm tra kết nối rồi tải lại trang. Bạn vẫn có thể mở thư mục Google Drive gốc.','folder',`<a href="${ROOT_URL}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">Mở Google Drive</a>`);
    console.error(error);
  }
}

boot();
