import {courseGroups,groupFor,buildHierarchy,folderTrail,folderLabel,searchFolder,learningSort,folderListing} from './hierarchy.mjs';
import {normalize,cleanTitle,isVideo} from './core.mjs';

const VERIFIED_COURSE_METADATA = {
  '1EcEHLSxxlsRFtJCXMGimzy2rKd2Ej-zD': {
    target: 'Người mất gốc, học viên bắt đầu lại từ nền tảng và hướng tới TOEIC 4 kỹ năng.',
    prerequisites: 'Không yêu cầu kiến thức trước; bắt đầu từ cách dùng to be, từ loại và phát âm.',
    structure: '48 ngày lấy gốc toàn diện, video bài giảng, tài liệu lý thuyết, bài tập và phiếu đối chiếu.',
    skills: 'Nắm vững 12 thì cơ bản, từ loại, cấu trúc câu hỏi, từ vựng công sở và phản xạ nghe hiểu.',
    status: 'Đã đối chiếu nguồn & có ngân hàng tự kiểm tra'
  },
  '1pCQAKuQM_ywmrCbxjQeTb787sDgi8dfv': {
    target: 'Học viên muốn củng cố ngữ pháp và rèn chiến thuật giải đề TOEIC thực chiến.',
    prerequisites: 'Đã có ngữ pháp cơ bản, mong muốn tăng tốc điểm số Part 1–7.',
    structure: '33 bài giảng chia thành 4 chặng: Nền tảng, Ngữ pháp, Chiến thuật Listening và Reading.',
    skills: 'Bẫy thường gặp trong đề thi TOEIC, kỹ năng skimming & scanning, bắt từ khóa âm thanh.',
    status: 'Học liệu video gốc từ Drive · Lộ trình chặng rõ ràng'
  },
  '1m8UUnkpyTOffREm7GjITTPrDkZ5OmHUb': {
    target: 'Người học luyện đề và mở rộng vốn từ vựng 7 Part TOEIC.',
    prerequisites: 'Mục tiêu 500–750+ TOEIC.',
    structure: 'Phân loại theo 7 phần thi TOEIC và danh sách từ vựng trọng tâm.',
    skills: 'Vốn từ chuyên ngành thương mại, dịch vụ, hợp đồng và phản xạ làm bài.',
    status: 'Có bộ thẻ từ vựng đối chiếu nguồn'
  }
};

export function createLibraryView(ctx) {
  const {courses,videos,docs,nodes,esc,icon,fmt,button,courseCard,videoRow,heading,empty,progress}=ctx;
  const index=buildHierarchy(nodes,[...videos,...docs]);
  let category='all',current=null,query='',type='all',status='all',page=1,includeChildren=false;
  const $=s=>document.querySelector(s);
  const url=(c,f=c)=>`#course?id=${encodeURIComponent(c)}&folder=${encodeURIComponent(f)}`;
  const done=e=>e.videos.filter(v=>progress().completed[v.id]).length;
  const groupLink=g=>`#library?group=${g.id}`;
  const countLine=e=>`${fmt(e.videos.length)} video · ${fmt(e.docs.length)} tài liệu`;
  const trailLink=(c,f,label,active=false)=>active?`<span aria-current="page">${esc(label)}</span>`:`<a href="${url(c,f)}">${esc(label)}</a>`;

  function priorityCoursesSection(){
    const p=progress();
    const enrolled=courses.filter(c=>done(index.folders.get(c.id))>0||c.videos.some(v=>v.id===p.last));
    const primaryId='1EcEHLSxxlsRFtJCXMGimzy2rKd2Ej-zD';
    const primary=courses.find(c=>c.id===primaryId);
    const topList=[primary,...enrolled.filter(c=>c.id!==primaryId)].filter(Boolean).slice(0,3);

    if(!topList.length)return '';
    return `
    <section class="priority-courses-strip" style="margin-bottom:28px">
      <div class="section-title">
        <div>
          <span class="eyebrow">CHƯƠNG TRÌNH ĐANG THEO HỌC</span>
          <h2>Khóa ưu tiên & đang học</h2>
        </div>
      </div>
      <div class="course-grid">
        ${topList.map(c=>courseCard(c,c.index)).join('')}
      </div>
    </section>`;
  }

  function groupCards(){return `<div class="learning-groups">${courseGroups.map((g,i)=>`<a class="learning-group tone-${i}" href="${groupLink(g)}"><span class="group-glyph">${icon(g.icon)}</span><strong>${esc(g.title)}</strong><small>${g.courses.length} khóa học ${icon('arrow')}</small></a>`).join('')}</div>`}
  function homeGroups(){return `<section class="learning-start"><div class="section-title"><div><h2>Bạn muốn học gì hôm nay?</h2><p>Chọn nhóm học → chọn khóa → chọn chương → mở bài.</p></div><a class="text-button" href="#library">Mở thư viện ${icon('arrow')}</a></div>${groupCards()}</section>`}
  function libraryIntro(selected){if(selected!==undefined)category=courseGroups.some(g=>g.id===selected)?selected:'all';return `${priorityCoursesSection()}<div class="catalog-explainer"><span class="row-icon">${icon('route')}</span><div><strong>Khám phá toàn bộ 20 khóa học theo 5 hướng</strong><p>Vào từng khóa để mở chương, chủ đề và tài liệu đi kèm.</p></div></div><div class="category-tabs" aria-label="Nhóm khóa học"><button data-category="all" class="category-tab ${category==='all'?'active':''}" aria-pressed="${category==='all'}">Tất cả <span>${courses.length}</span></button>${courseGroups.map(g=>`<button data-category="${g.id}" class="category-tab ${category===g.id?'active':''}" aria-pressed="${category===g.id}">${icon(g.icon)}${esc(g.title)} <span>${g.courses.length}</span></button>`).join('')}</div>`}
  function groupedCourses(list){const groups=courseGroups.filter(g=>category==='all'||category===g.id);return groups.map((g,i)=>{const cs=g.courses.map(id=>list.find(c=>c.id===id)).filter(Boolean);if(!cs.length)return '';return `<section class="catalog-group"><div class="catalog-group-heading"><span class="group-step">${String(courseGroups.indexOf(g)+1).padStart(2,'0')}</span><div><h2>${esc(g.title)}</h2><p>${esc(g.description)}</p></div><small>${cs.length} khóa học</small></div><div class="course-grid">${cs.map(c=>courseCard(c,c.index)).join('')}</div></section>`}).join('')||empty('Chưa có khóa phù hợp','Thử chọn nhóm khác hoặc xóa từ khóa tìm kiếm.','search')}
  
  function sideTree(c,folder,trail){
    const active=new Set(trail.map(n=>n.id));
    function branch(parent,depth=0){
      const sub=index.folders.get(parent);
      return sub.folders.map(f=>{
        const isSelected=f.id===folder.id;
        const e=index.folders.get(f.id);
        const fDone=done(e);
        return `<li><a class="outline-link ${isSelected?'selected':''}" href="${url(c.id,f.id)}" ${isSelected?'aria-current="page"':''}><span>${icon(active.has(f.id)?'folder':'chevron')}</span><span>${esc(folderLabel(f))}<small>${fDone?fDone+'/'+e.videos.length+' video':countLine(e)}</small></span></a>${active.has(f.id)?`<ul>${branch(f.id,depth+1)}</ul>`:''}</li>`;
      }).join('');
    }
    return `<aside class="course-outline" id="course-outline"><details open><summary>Mục lục khóa học ${icon('book')}</summary><a href="${url(c.id)}" class="outline-root ${folder.id===c.id?'selected':''}">${icon('home')}Tổng quan khóa học</a><ul>${branch(c.id)}</ul></details><a class="outline-drive" href="https://drive.google.com/drive/folders/${c.id}" target="_blank" rel="noopener noreferrer">${icon('external')}Thư mục Google Drive</a></aside>`;
  }

  function folderCard(c,f,i){const e=index.folders.get(f.id),completed=done(e),percent=e.videos.length?Math.round(completed/e.videos.length*100):0;return `<a class="module-card" href="${url(c.id,f.id)}"><div class="module-top"><span class="module-number">${String(i+1).padStart(2,'0')}</span><span class="module-kind">${e.folders.length?e.folders.length+' mục con':'Nhóm bài học'} ${icon('chevron')}</span></div><h3>${esc(folderLabel(f))}</h3><p>${countLine(e)}</p><div class="module-progress"><div class="progress-track"><span style="width:${percent}%"></span></div><small>${!e.videos.length?'Tài liệu tham khảo':completed?`${completed}/${e.videos.length} video đã học`:'Chưa bắt đầu'}</small></div></a>`}

  function courseDetail(id,folderId){
    const c=courses.find(c=>c.id===id);
    if(!c)return empty('Không tìm thấy khóa học','Quay lại thư viện để chọn khóa học.','book',button('Mở thư viện','data-nav="library"'));
    const trail=folderTrail(index,c.id,folderId||c.id),folder=trail.at(-1),entry=index.folders.get(folder.id);
    if(current?.folder.id!==folder.id){query='';type='all';status='all';page=1;includeChildren=false;}
    current={c,folder,entry,trail};
    const g=groupFor(c.id),isRoot=folder.id===c.id,last=entry.videos.find(v=>v.id===progress().last),next=last||entry.videos.find(v=>!progress().completed[v.id])||entry.videos[0],completed=done(entry),percent=entry.videos.length?Math.round(completed/entry.videos.length*100):0;

    // Verified Course Metadata
    const meta=VERIFIED_COURSE_METADATA[c.id]||{
      target:'Học viên tự học theo tài liệu Google Drive.',
      prerequisites:'Tùy theo cấp độ bài học.',
      structure:countLine(index.folders.get(c.id)),
      skills:'Kiến thức theo chuyên đề tài liệu và bài giảng.',
      status:'Danh mục Drive đã lập chỉ mục (Chưa có ngân hàng câu hỏi biên soạn riêng)'
    };

    // Chapter Summary Card (Section 5)
    const isChapterDone=entry.videos.length>0&&completed===entry.videos.length;
    const parentFolder=byId.get(folder.parent);
    const siblings=parentFolder?index.folders.get(parentFolder.id)?.folders||[]:[];
    const curIdx=siblings.findIndex(f=>f.id===folder.id);
    const nextChapter=curIdx>=0&&curIdx<siblings.length-1?siblings[curIdx+1]:null;

    const summaryCard=isChapterDone||completed>0?`
    <div class="chapter-summary-card">
      <h3>${icon('check')} Tổng kết tiến độ: ${esc(folderLabel(folder))}</h3>
      <p class="fine-print">Bạn đã hoàn thành <strong>${completed}/${entry.videos.length} video bài giảng</strong> trong phần này.</p>
      <div class="chapter-summary-grid">
        <div class="chapter-summary-metric">
          <strong>${completed}</strong>
          <small>Bài đã hoàn tất</small>
        </div>
        <div class="chapter-summary-metric">
          <strong>${entry.docs.length}</strong>
          <small>Tài liệu & bài tập</small>
        </div>
        <div class="chapter-summary-metric">
          <strong>${percent}%</strong>
          <small>Hoàn thành chương</small>
        </div>
      </div>
      <div class="chapter-summary-actions">
        ${nextChapter?`<a href="${url(c.id,nextChapter.id)}" class="btn btn-primary">Sang chương tiếp: ${esc(folderLabel(nextChapter))} ${icon('arrow')}</a>`:''}
        <a href="#study?course=${encodeURIComponent(c.id)}&folder=${encodeURIComponent(folder.id)}" class="btn btn-soft">${icon('target')}Mở phòng học chương này</a>
      </div>
    </div>`:'' ;

    return `
    <nav class="content-breadcrumbs" aria-label="Đường dẫn khóa học">
      <a href="#courses">Khóa học</a><span>›</span>${g?`<a href="${groupLink(g)}">${esc(g.title)}</a><span>›</span>`:''}${trail.map((f,i)=>trailLink(c.id,f.id,i===0?c.title:folderLabel(f),i===trail.length-1)).join('<span>›</span>')}
    </nav>

    <div class="course-title-row">
      <div>
        <div class="eyebrow">${isRoot?'TỔNG QUAN KHÓA HỌC':'CHƯƠNG & CHỦ ĐỀ'}</div>
        <h1>${esc(isRoot?c.title:folderLabel(folder))}</h1>
        <p class="course-description">${countLine(entry)} · ${completed} video đã hoàn thành${entry.videos.length?` (${percent}%)`:''}</p>
        <span class="badge" style="font-size:10px;margin-top:6px;display:inline-block">${esc(meta.status)}</span>
      </div>
      <div class="course-title-actions">
        ${next?button(last?'Học tiếp bài gần nhất':'Học bài chưa hoàn thành',`data-play="${next.id}"`,'btn-primary','play'):''}
        <a class="btn btn-soft" href="#study?course=${encodeURIComponent(c.id)}&folder=${encodeURIComponent(next?.parent||folder.id)}${next?'&file='+encodeURIComponent(next.id):''}">${icon('target')}Mở phòng học</a>
      </div>
    </div>

    <!-- Verified Course Overview (Section 5) -->
    ${isRoot?`
    <section class="panel" style="margin-bottom:24px">
      <h3 style="margin-bottom:12px">Thông tin khóa học đã đối chiếu</h3>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:14px;font-size:12px">
        <div><strong>Đối tượng:</strong> <span style="color:var(--muted)">${esc(meta.target)}</span></div>
        <div><strong>Kiến thức đầu vào:</strong> <span style="color:var(--muted)">${esc(meta.prerequisites)}</span></div>
        <div><strong>Cấu trúc khóa học:</strong> <span style="color:var(--muted)">${esc(meta.structure)}</span></div>
        <div><strong>Kỹ năng đạt được:</strong> <span style="color:var(--muted)">${esc(meta.skills)}</span></div>
      </div>
    </section>`:''}

    ${summaryCard}

    ${ctx.learningBlock?.(c.id,folder.id)||''}

    <div class="layout-toolbar">
      <button class="layout-panel-toggle" data-layout-panel="outline" aria-controls="course-outline" aria-expanded="true">${icon('back')}<span>Thu gọn mục lục</span></button>
    </div>

    <div class="course-layout">
      ${sideTree(c,folder,trail)}
      <section class="course-content">
        <div class="folder-overview">
          <div>
            <span>${icon('folder')} ${isRoot?'Mục lục chương & bài':'Nội dung trong mục này'}</span>
            ${entry.videos.length?`<div class="progress-track folder-progress-track"><span style="width:${percent}%"></span></div>`:''}
          </div>
          <div><strong>${entry.folders.length}</strong> mục con <span>·</span> <strong>${completed}/${entry.videos.length}</strong> video đã học</div>
        </div>

        ${entry.folders.length?`
        <div class="section-title">
          <div>
            <h2>${isRoot?'Chọn chương học theo thứ tự':'Đi tiếp theo mục lục'}</h2>
            <p>Mở từng chương để học bài giảng và tài liệu bên trong.</p>
          </div>
        </div>
        <div class="module-grid">${entry.folders.map((f,i)=>folderCard(c,f,i)).join('')}</div>`:''}

        <section class="folder-resources">
          <div class="section-title">
            <div>
              <h2>${entry.folders.length?'Tất cả bài giảng & tài liệu':'Bài học trong chủ đề'}</h2>
              <p>${entry.folders.length?'Chọn chương để học theo thứ tự; bật mục bên dưới nếu muốn tìm trong toàn bộ mục con.':'Video, bài tập, âm thanh và tài liệu trong cùng một mục.'}</p>
            </div>
          </div>
          <div class="scope-tools">
            <label class="search-box">
              ${icon('search')}
              <input type="search" id="folder-search" aria-label="Tìm trong mục này và các mục con" value="${esc(query)}" placeholder="Tìm bài học trong mục này và các mục con…">
            </label>
            <select id="folder-status" aria-label="Trạng thái học">
              <option value="all">Tất cả trạng thái</option>
              <option value="new" ${status==='new'?'selected':''}>Bài chưa học</option>
              <option value="done" ${status==='done'?'selected':''}>Bài đã hoàn thành</option>
              <option value="flagged" ${status==='flagged'?'selected':''}>Bài cần xem lại</option>
            </select>
          </div>
          ${entry.folders.length?`<label class="include-children"><input id="include-children" type="checkbox" ${includeChildren?'checked':''}> Bao gồm học liệu trong các mục con (${fmt(entry.videos.length+entry.docs.length)})</label>`:''}
          <div id="folder-files" aria-live="polite"></div>
        </section>
      </section>
    </div>`;
  }

  function fillFolder(){
    if(!current||!$('#folder-files'))return;
    const {entry,c}=current;
    const p=progress();
    let listing=folderListing(entry,{query,includeChildren,status:status==='flagged'?'all':status,type},p.completed);
    let list=listing.items;

    if(status==='flagged'){
      const flaggedSet=new Set(ctx.getState?.()?.flaggedLessons||[]);
      list=list.filter(f=>flaggedSet.has(f.id));
    }

    const limit=20,total=Math.max(1,Math.ceil(list.length/limit));
    page=Math.min(page,total);

    $('#folder-files').innerHTML=`
    <div class="tabs scope-tabs" role="tablist" aria-label="Học liệu trong mục">
      <button class="tab ${type==='all'?'active':''}" data-scope-type="all" role="tab" aria-selected="${type==='all'}">Tất cả (${fmt(listing.total)})</button>
      <button class="tab ${type==='videos'?'active':''}" data-scope-type="videos" role="tab" aria-selected="${type==='videos'}">Video (${fmt(listing.videoCount)})</button>
      <button class="tab ${type==='docs'?'active':''}" data-scope-type="docs" role="tab" aria-selected="${type==='docs'}">Tài liệu & âm thanh (${fmt(listing.documentCount)})</button>
    </div>
    <div class="resource-result-label">
      <span>${fmt(list.length)} học liệu${query.trim()?' trong kết quả tìm kiếm':includeChildren?' trong mục này và mục con':' ở cấp hiện tại'}</span>
      <span>Thứ tự theo tên bài</span>
    </div>
    ${list.length?`<div class="video-list">${list.slice((page-1)*limit,page*limit).map(videoRow).join('')}</div>`:empty(query.trim()?'Chưa tìm thấy bài phù hợp':entry.folders.length?'Học liệu nằm trong các mục con':'Chưa có học liệu phù hợp',query.trim()?'Thử từ khóa khác hoặc chọn tất cả trạng thái.':entry.folders.length?'Chọn một mục ở phía trên để mở bài giảng và tài liệu bên trong.':'Thử chuyển tab hoặc đổi trạng thái lọc.','folder')}
    ${total>1?`<div class="pagination">${button('Trang trước',`data-scope-page="${page-1}" ${page===1?'disabled':''}`,'btn-secondary','back')}<span>${page} / ${total}</span>${button('Trang sau',`data-scope-page="${page+1}" ${page===total?'disabled':''}`,'btn-secondary','arrow')}</div>`:''}`;
  }

  document.addEventListener('click',event=>{
    const el=event.target.closest('button');
    if(!el)return;
    if(el.hasAttribute('data-category')){category=el.dataset.category;ctx.refreshLibrary(category)}
    else if(el.hasAttribute('data-scope-type')){type=el.dataset.scopeType;page=1;fillFolder()}
    else if(el.hasAttribute('data-scope-page')){page=Number(el.dataset.scopePage);fillFolder();$('#folder-files').scrollIntoView({block:'start',behavior:'instant'})}
  });

  document.addEventListener('input',event=>{
    if(event.target.id==='folder-search'){query=event.target.value;page=1;fillFolder()}
  });

  document.addEventListener('change',event=>{
    if(event.target.id==='include-children'){includeChildren=event.target.checked;page=1;fillFolder()}
    if(event.target.id==='folder-status'){status=event.target.value;page=1;fillFolder()}
  });

  return {index,homeGroups,libraryIntro,groupedCourses,courseDetail,fillFolder,url};
}

