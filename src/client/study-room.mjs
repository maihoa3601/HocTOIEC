import {cleanTitle,isVideo,normalize} from './core.mjs';
import {resourceLabel} from './hierarchy.mjs';
import {materialRole,roleLabel,studyMaterials,answerText,formatDuration} from './learning-core.mjs';
import {canSpeak,speakEnglish} from './speech.mjs';

export function createStudyRoom(ctx){
  const {index,courses,byId,bank,getState,progress,persist,saveLearning,esc,icon,fmt,toast,accountGrade}=ctx;
  const $=s=>document.querySelector(s);
  
  let currentCourse=null,currentFolderId=null,currentFile=null;
  let activeTab='study'; // mobile or right-panel: 'study' | 'doc' | 'notes' | 'quiz' | 'worksheet'
  let focusMode=false;
  let saveTimer=null;
  let startTime=Date.now();

  const fileURL=id=>`https://drive.google.com/file/d/${encodeURIComponent(id)}/view`;
  const previewURL=id=>`https://drive.google.com/file/d/${encodeURIComponent(id)}/preview`;
  const courseFor=id=>courses.find(c=>c.id===id);
  const title=f=>resourceLabel(f,byId.get(f.parent)?.name||'');

  function getMatchingSet(courseId,folderId,fileId){
    const sets=bank.sets||[];
    return sets.find(s=>s.sources?.some(src=>src.id===fileId))||
           sets.find(s=>s.folderId===folderId)||
           sets.find(s=>s.courseId===courseId&&descendant(folderId,s.folderId));
  }

  function descendant(folder,id){
    let f=byId.get(id),seen=new Set();
    while(f&&!seen.has(f.id)){
      if(f.id===folder)return true;
      seen.add(f.id);
      f=byId.get(f.parent);
    }
    return false;
  }

  function getSaveStatus(){
    const st=getState();
    if(st.lastSaveError)return {cls:'error',label:'Lỗi lưu'};
    if(st.isSyncing)return {cls:'syncing',label:'Đang lưu…'};
    if(st.cloudSaved)return {cls:'cloud',label:'Đã lưu tài khoản'};
    return {cls:'local',label:'Đã lưu cục bộ'};
  }

  function render(params){
    const courseId=params.get('course');
    const folderId=params.get('folder');
    const fileId=params.get('file');

    const c=courseFor(courseId)||courses[0];
    if(!c)return `<div class="empty"><h3>Chưa chọn khóa học</h3><p>Vui lòng quay lại thư viện khóa học để chọn bài học.</p><a href="#courses" class="btn btn-primary">Mở khóa học</a></div>`;

    const folder=byId.get(folderId)||byId.get(c.id);
    const materials=studyMaterials(index,folder.id);
    const selectedFile=byId.get(fileId);

    const v=selectedFile&&isVideo(selectedFile)&&materials.videos.some(f=>f.id===selectedFile.id)?selectedFile:(materials.videos.find(f=>f.id===progress().last)||materials.videos[0]);
    const exercise=materials.docs.find(f=>materialRole(f)==='exercises');
    const theory=materials.docs.find(f=>materialRole(f)==='theory');
    const doc=selectedFile&&!isVideo(selectedFile)&&materials.docs.some(f=>f.id===selectedFile.id)?selectedFile:(exercise||theory||materials.docs[0]);

    currentCourse=c;
    currentFolderId=folder.id;
    currentFile=v||doc||selectedFile;
    startTime=Date.now();

    if(currentFile){
      progress().last=currentFile.id;
      persist();
    }

    const state=getState();
    const prefs=state.displayPreferences||{fontSize:'medium',density:'comfortable'};
    const savedDraft=state.studyRoomDrafts?.[folder.id]||{};
    activeTab=savedDraft.activeTab||activeTab||'study';

    const set=getMatchingSet(c.id,folder.id,currentFile?.id);
    const vIdx=v?materials.videos.findIndex(f=>f.id===v.id):-1;
    const prevV=vIdx>0?materials.videos[vIdx-1]:null;
    const nextV=vIdx>=0&&vIdx<materials.videos.length-1?materials.videos[vIdx+1]:null;
    const vDone=materials.videos.filter(f=>progress().completed[f.id]).length;

    const isDone=Boolean(currentFile&&progress().completed[currentFile.id]);
    const isFlagged=Boolean(currentFile&&state.flaggedLessons?.includes(currentFile.id));
    const isUnderstood=Boolean(set&&state.lessonRead?.[set.id]);
    const saveStatus=getSaveStatus();

    // Check if this lesson has structured 6-step content
    const hasLesson=Boolean(set?.lesson?.sections?.length);

    return `
    <div class="study-room-shell font-${prefs.fontSize} density-${prefs.density} ${focusMode?'focus-mode-active':''}" id="study-room-container">
      <header class="study-room-topbar">
        <div class="study-room-breadcrumb">
          <a href="#course?id=${encodeURIComponent(c.id)}" class="icon-button" aria-label="Quay lại khóa học">${icon('back')}</a>
          <a href="#course?id=${encodeURIComponent(c.id)}">${esc(c.title)}</a>
          <span>/</span>
          <a href="#course?id=${encodeURIComponent(c.id)}&folder=${encodeURIComponent(folder.id)}">${esc(cleanTitle(folder.name))}</a>
          <span>/</span>
          <strong>${esc(currentFile?title(currentFile):cleanTitle(folder.name))}</strong>
        </div>
        <div class="study-room-topbar-actions">
          <span class="study-sync-pill ${saveStatus.cls}" id="study-sync-indicator" title="Trạng thái lưu">${icon('check')}<span>${saveStatus.label}</span></span>
          <div class="study-view-controls">
            <button type="button" class="study-control-pill ${prefs.fontSize==='small'?'active':''}" data-study-font="small" title="Cỡ chữ nhỏ">A-</button>
            <button type="button" class="study-control-pill ${prefs.fontSize==='medium'?'active':''}" data-study-font="medium" title="Cỡ chữ vừa">A</button>
            <button type="button" class="study-control-pill ${prefs.fontSize==='large'?'active':''}" data-study-font="large" title="Cỡ chữ lớn">A+</button>
          </div>
          <button type="button" class="btn btn-soft ${focusMode?'active':''}" id="study-focus-mode-btn" aria-pressed="${focusMode}" title="Bật/Tắt chế độ tập trung">${icon(focusMode?'close':'spark')}<span>${focusMode?'Thoát tập trung':'Tập trung'}</span></button>
          <a href="#course?id=${encodeURIComponent(c.id)}&folder=${encodeURIComponent(folder.id)}" class="icon-button" title="Đóng phòng học" aria-label="Đóng phòng học">${icon('close')}</a>
        </div>
      </header>

      <!-- Mobile study tab switcher -->
      <nav class="study-mobile-tabs" aria-label="Phần học mobile">
        <div class="study-mobile-tabs-inner">
          <button type="button" class="study-mobile-tab-btn ${activeTab==='study'?'active':''}" data-study-mobile-tab="study">${icon('video')} Học bài</button>
          <button type="button" class="study-mobile-tab-btn ${activeTab==='doc'?'active':''}" data-study-mobile-tab="doc">${icon('note')} Tài liệu</button>
          <button type="button" class="study-mobile-tab-btn ${activeTab==='notes'?'active':''}" data-study-mobile-tab="notes">${icon('note')} Ghi chú</button>
          <button type="button" class="study-mobile-tab-btn ${activeTab==='quiz'||activeTab==='worksheet'?'active':''}" data-study-mobile-tab="quiz">${icon('target')} Luyện tập</button>
        </div>
      </nav>

      <div class="study-room-grid">
        <!-- Left: Chapter Outline -->
        <aside class="study-room-outline" id="study-room-outline">
          <div class="study-outline-header">
            <span>Bài học trong chương</span>
            <small>${vDone}/${materials.videos.length} đã học</small>
          </div>
          <div class="study-outline-list">
            ${materials.videos.map((file,idx)=>{
              const fileDone=Boolean(progress().completed[file.id]);
              const isCur=currentFile?.id===file.id;
              const matching=getMatchingSet(c.id,folder.id,file.id);
              return `
              <a href="#study?course=${encodeURIComponent(c.id)}&folder=${encodeURIComponent(folder.id)}&file=${encodeURIComponent(file.id)}" class="study-outline-item ${isCur?'active':''}" aria-current="${isCur?'true':'false'}">
                <span class="icon">${fileDone?icon('check'):icon('play')}</span>
                <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${String(idx+1).padStart(2,'0')}. ${esc(title(file))}</span>
                ${matching?`<span class="study-outline-badge" title="Có bài tự kiểm tra">Luyện</span>`:''}
              </a>`;
            }).join('')}
            ${!materials.videos.length?`<p class="fine-print">Chương này bao gồm ${materials.docs.length} tài liệu học tập.</p>`:''}
          </div>
        </aside>

        <!-- Center: Learning Workspace -->
        <main class="study-room-center" id="study-room-center">
          ${v?`
          <div class="study-video-wrapper" id="study-video-panel" ${activeTab==='doc'?'style="display:none"':''}>
            <div class="video-frame">
              <iframe id="study-video-frame" src="${previewURL(v.id)}" title="${esc(title(v))}" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowfullscreen></iframe>
            </div>
            <div class="study-drive-fallback">
              <span>Trình phát Google Drive. Nếu video không tải hoặc cần đăng nhập, mở trực tiếp:</span>
              <a href="${fileURL(v.id)}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">${icon('external')}Mở trên Drive ↗</a>
            </div>
          </div>`:''}

          ${doc?`
          <div class="study-doc-wrapper" id="study-doc-panel" ${activeTab==='study'&&v?'style="display:none"':''}>
            <div class="study-drive-fallback" style="margin-bottom:8px">
              <strong>${esc(title(doc))}</strong>
              <a href="${fileURL(doc.id)}" target="_blank" rel="noopener noreferrer" class="text-button">${icon('external')}Mở trên Drive ↗</a>
            </div>
            <iframe class="study-pdf-frame" id="study-doc-frame" src="${previewURL(doc.id)}" title="${esc(title(doc))}" style="width:100%;height:520px;border-radius:10px;border:1px solid var(--line)" allow="autoplay; fullscreen" allowfullscreen></iframe>
          </div>`:''}

          <!-- 6-step Structured Lesson -->
          ${set&&hasLesson?`
          <article class="study-structured-lesson">
            <div class="lesson-step-tag">BÀI HỌC CÓ ĐỐI CHIẾU NGUỒN · BẢN 18</div>
            <h2>${esc(set.title)}</h2>

            <!-- Step 1: Specific Objective -->
            <div class="lesson-objective-box">
              <h3>Mục tiêu cụ thể của bài</h3>
              <p>Sau bài học này, bạn có thể phân biệt và vận dụng quy tắc <strong>${esc(set.topic)}</strong> trong câu TOEIC và giao tiếp hằng ngày.</p>
              ${set.summary?.length?`<p style="margin-top:6px;font-size:11px;color:var(--muted)">Ý chính: ${esc(set.summary.slice(0,2).join(' · '))}</p>`:''}
            </div>

            <!-- Step 3: Active Recall Prompt -->
            <details class="lesson-recall-prompt" open>
              <summary>Gợi nhớ chủ động trước khi mở lý thuyết</summary>
              <p>Bạn còn nhớ cách phân biệt hoặc nguyên tắc chính của <em>${esc(set.title)}</em> không? Hãy tự nhẩm trước một ví dụ trước khi đọc chi tiết bên dưới.</p>
            </details>

            <!-- Step 2: Digestible Sections with Bilingual Examples -->
            <div class="lesson-sections-list">
              ${set.lesson.sections.map((sec,sIdx)=>`
              <section class="lesson-chunk-card">
                <h4>${String(sIdx+1).padStart(2,'0')}. ${esc(sec.heading)}</h4>
                <ul>
                  ${sec.points.map(pt=>`<li>${esc(pt)}</li>`).join('')}
                </ul>
                ${sec.examples?.length?`
                <div class="lesson-examples-grid">
                  ${sec.examples.map(ex=>`
                  <div class="lesson-ex-row">
                    <div>
                      <strong>${esc(ex.en)}</strong>
                      <span style="display:block;font-size:11px;color:var(--muted)">${esc(ex.vi)}</span>
                    </div>
                    ${canSpeak()?`<button type="button" class="icon-button" data-speak="${esc(ex.en)}" title="Nghe phát âm" aria-label="Nghe phát âm">${icon('headphones')}</button>`:''}
                  </div>`).join('')}
                </div>`:''}
                ${sec.sourceId?`<p class="fine-print" style="margin-top:8px"><a href="${fileURL(sec.sourceId)}" target="_blank" rel="noopener noreferrer">${icon('note')}Đối chiếu trang ${sec.page||1} tài liệu nguồn ↗</a></p>`:''}
              </section>`).join('')}
            </div>

            <!-- Pitfalls -->
            ${set.lesson.pitfalls?.length?`
            <div class="lesson-chunk-card" style="border-left:4px solid #e74c3c">
              <h4 style="color:#c0392b">${icon('close')} Những lỗi sai thường gặp cần tránh</h4>
              <ul>
                ${set.lesson.pitfalls.map(p=>`<li>${esc(p)}</li>`).join('')}
              </ul>
            </div>`:''}

            <!-- Step 6: Wrap-up & Actions -->
            <div class="lesson-wrapup-box">
              <div class="lesson-wrapup-actions">
                <button type="button" class="btn ${isUnderstood?'btn-soft':'btn-primary'}" data-study-action="understood" aria-pressed="${isUnderstood}">${icon('check')}<span>${isUnderstood?'Đã đánh dấu đã hiểu':'Đánh dấu đã hiểu bài'}</span></button>
                <button type="button" class="btn btn-secondary ${isFlagged?'saved':''}" data-study-action="flag" aria-pressed="${isFlagged}">${icon('bookmark')}<span>${isFlagged?'Đã lưu vào danh sách ôn':'Cần xem lại bài này'}</span></button>
                ${currentFile&&isVideo(currentFile)?`<button type="button" class="btn btn-secondary ${isDone?'btn-soft':''}" data-study-action="complete-video">${icon('check')}<span>${isDone?'Đã hoàn thành video':'Đánh dấu đã xem video'}</span></button>`:''}
                <button type="button" class="btn btn-soft" data-study-switch-tab="quiz">${icon('target')}Làm tự kiểm tra (${set.questions?.length||0} câu)</button>
              </div>
              <p class="fine-print">Lưu ý: Nút “Đã hiểu” là tự đánh giá của người học; kết quả kiểm tra bên tab Luyện tập mới là bằng chứng trả lời đúng thực tế.</p>
            </div>
          </article>`:''}
        </main>

        <!-- Right: Multi-tab Side Panel -->
        <aside class="study-room-panel" id="study-room-panel">
          <div class="study-panel-tabs">
            <button type="button" class="study-panel-tab ${activeTab==='notes'?'active':''}" data-study-tab="notes">${icon('note')} Ghi chú</button>
            <button type="button" class="study-panel-tab ${activeTab==='quiz'?'active':''}" data-study-tab="quiz">${icon('target')} Luyện tập</button>
            <button type="button" class="study-panel-tab ${activeTab==='worksheet'?'active':''}" data-study-tab="worksheet">${icon('check')} Phiếu trả lời</button>
            <button type="button" class="study-panel-tab ${activeTab==='doc'?'active':''}" data-study-tab="doc">${icon('note')} Tài liệu</button>
          </div>
          <div class="study-panel-content" id="study-panel-content">
            ${renderPanelContent(c,folder,currentFile,set,doc)}
          </div>
        </aside>
      </div>

      <footer class="study-room-footer">
        <div class="study-prev-action">
          ${prevV?`<a href="#study?course=${encodeURIComponent(c.id)}&folder=${encodeURIComponent(folder.id)}&file=${encodeURIComponent(prevV.id)}" class="btn btn-secondary">${icon('back')}Bài trước</a>`:''}
        </div>
        <div class="study-session-info">
          <span>${icon('clock')} Buổi học đang mở</span>
          ${materials.videos.length?`<span>Tiến độ chương: <strong>${vDone}/${materials.videos.length}</strong></span>`:''}
        </div>
        <div class="study-next-action">
          ${nextV?`<a href="#study?course=${encodeURIComponent(c.id)}&folder=${encodeURIComponent(folder.id)}&file=${encodeURIComponent(nextV.id)}" class="btn btn-primary">Bài tiếp theo ${icon('arrow')}</a>`:`<a href="#course?id=${encodeURIComponent(c.id)}" class="btn btn-primary">Mục lục khóa học ${icon('arrow')}</a>`}
        </div>
      </footer>
    </div>`;
  }

  function renderPanelContent(course,folder,file,set,doc){
    const state=getState();
    const fileId=file?.id||folder.id;

    if(activeTab==='notes'){
      const noteText=progress().notes[fileId]||'';
      const meta=state.noteMeta?.[fileId]||{};
      return `
      <div class="study-notes-widget">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <label for="study-note-editor" style="font-weight:600;font-size:12px">Ghi chú cho bài này</label>
          <label style="font-size:11px;display:flex;align-items:center;gap:4px;color:var(--muted)">
            <input type="checkbox" id="study-note-pinned" ${meta.pinned?'checked':''}> Ghim
          </label>
        </div>
        <div class="note-tag-bar">
          ${['[Quy tắc] ','[Ví dụ] ','[Từ mới] ','[Xem lại] ','[00:00] '].map(t=>`
            <button type="button" class="note-tag-chip" data-study-note-tag="${esc(t)}">${esc(t.trim())}</button>
          `).join('')}
        </div>
        <textarea id="study-note-editor" class="note-editor" maxlength="20000" placeholder="Viết những điều bạn vừa học, quy tắc hoặc lỗi cần chú ý… (tự lưu không làm gián đoạn media)">${esc(noteText)}</textarea>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;font-size:10px;color:var(--muted)">
          <span id="study-note-save-msg">Tự lưu trên thiết bị</span>
          <button type="button" class="text-button" id="study-note-export-btn">Xuất ghi chú</button>
        </div>
      </div>`;
    }

    if(activeTab==='quiz'){
      if(!set||!set.questions?.length){
        return `
        <div class="empty">
          ${icon('target')}
          <h3>Chưa có câu hỏi tự kiểm tra</h3>
          <p>Bài học này chưa có bộ câu hỏi biên soạn. Bạn có thể mở phiếu trả lời để đối chiếu bài tập trong tài liệu.</p>
          <button type="button" class="btn btn-primary" data-study-switch-tab="worksheet">Mở phiếu trả lời</button>
        </div>`;
      }
      return `
      <div class="study-quiz-widget">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <strong style="font-size:12px">${esc(set.title)}</strong>
          <span class="badge" style="font-size:10px">${set.questions.length} câu</span>
        </div>
        <p class="fine-print">Làm bài tại đây hoặc mở chế độ luyện tập đầy đủ:</p>
        <div style="display:grid;gap:10px;margin-top:14px">
          <a href="#quiz?id=${encodeURIComponent(set.id)}" class="btn btn-primary">${icon('play')}Luyện trắc nghiệm (${set.questions.length} câu)</a>
          <a href="#quiz?id=${encodeURIComponent(set.id)}&mode=cloze" class="btn btn-secondary">${icon('note')}Tự điền từ</a>
          <a href="#quiz?id=${encodeURIComponent(set.id)}&mode=correction" class="btn btn-secondary">${icon('refresh')}Sửa câu sai</a>
          ${set.cards?.length?`<a href="#cards?id=${encodeURIComponent(set.id)}" class="btn btn-soft">${icon('book')}Ôn ${set.cards.length} thẻ từ</a>`:''}
        </div>
      </div>`;
    }

    if(activeTab==='worksheet'){
      if(!doc){
        return `<div class="empty">${icon('note')}<h3>Không có tài liệu để làm phiếu</h3><p>Mở một bài học có tệp PDF để sử dụng phiếu trả lời.</p></div>`;
      }
      const w=state.worksheets[doc.id]||{count:20,answers:{},checks:{},submitted:false};
      const answered=Object.values(w.answers).filter(a=>a.trim()).length;
      return `
      <div class="study-worksheet-widget">
        <div style="margin-bottom:12px">
          <small class="eyebrow">PHIẾU TỰ ĐỐI CHIẾU</small>
          <h4 style="margin:2px 0 4px;font-size:12px">${esc(title(doc))}</h4>
          <span style="font-size:11px;color:var(--muted)">${answered}/${w.count} câu đã ghi</span>
        </div>
        <div class="worksheet-grid">
          ${Array.from({length:w.count},(_,i)=>{
            const num=i+1;
            const val=w.answers[num]||'';
            const norm=val.trim().toUpperCase();
            return `
            <div class="worksheet-row">
              <label>
                <span>${num}</span>
                <div class="worksheet-quick-choices">
                  ${['A','B','C','D'].map(ch=>`<button type="button" class="worksheet-choice-btn ${norm===ch?'chosen':''}" data-study-sheet-choice="${num}" data-choice="${ch}">${ch}</button>`).join('')}
                </div>
                <input data-study-sheet-answer="${num}" maxlength="200" value="${esc(val)}" placeholder="Khác…">
              </label>
            </div>`;
          }).join('')}
        </div>
      </div>`;
    }

    // Default: doc list
    return `
    <div class="study-docs-widget">
      <h4 style="font-size:12px;margin:0 0 10px">Tài liệu trong chủ đề</h4>
      <div style="display:grid;gap:8px">
        ${(studyMaterials(index,folder.id).docs||[]).map(d=>`
          <a href="#study?course=${encodeURIComponent(course.id)}&folder=${encodeURIComponent(folder.id)}&file=${encodeURIComponent(d.id)}" class="video-row" style="padding:10px">
            <span class="row-icon">${icon('note')}</span>
            <div class="video-info">
              <h3>${esc(title(d))}</h3>
              <p>[${roleLabel(materialRole(d))}]</p>
            </div>
          </a>
        `).join('')}
      </div>
    </div>`;
  }

  function handleNoteInput(target){
    if(!currentFile)return;
    const fileId=currentFile.id;
    progress().notes[fileId]=target.value;
    const state=getState();
    state.noteMeta||={};
    state.noteMeta[fileId]={
      ...(state.noteMeta[fileId]||{}),
      updatedAt:new Date().toISOString(),
      lessonId:fileId
    };
    const msg=$('#study-note-save-msg');
    if(msg)msg.textContent='Đang lưu…';
    clearTimeout(saveTimer);
    saveTimer=setTimeout(()=>{
      const ok=persist()&&saveLearning();
      if(msg)msg.textContent=ok?'Đã lưu trên thiết bị':'Lỗi lưu. Hãy sao chép ghi chú.';
      const ind=$('#study-sync-indicator');
      if(ind){
        const st=getSaveStatus();
        ind.className=`study-sync-pill ${st.cls}`;
        ind.querySelector('span').textContent=st.label;
      }
    },400);
  }

  // Document-level listeners
  document.addEventListener('click',e=>{
    const b=e.target.closest('button,a');
    if(!b)return;

    if(b.id==='study-focus-mode-btn'){
      focusMode=!focusMode;
      const shell=$('#study-room-container');
      if(shell)shell.classList.toggle('focus-mode-active',focusMode);
      b.setAttribute('aria-pressed',String(focusMode));
      b.querySelector('span').textContent=focusMode?'Thoát tập trung':'Tập trung';
    }else if(b.hasAttribute('data-study-font')){
      const font=b.dataset.studyFont;
      const state=getState();
      state.displayPreferences||={};
      state.displayPreferences.fontSize=font;
      saveLearning();
      const shell=$('#study-room-container');
      if(shell){
        shell.classList.remove('font-small','font-medium','font-large');
        shell.classList.add('font-'+font);
      }
      document.querySelectorAll('[data-study-font]').forEach(btn=>btn.classList.toggle('active',btn.dataset.studyFont===font));
    }else if(b.hasAttribute('data-study-tab')){
      activeTab=b.dataset.studyTab;
      document.querySelectorAll('[data-study-tab]').forEach(btn=>btn.classList.toggle('active',btn.dataset.studyTab===activeTab));
      const content=$('#study-panel-content');
      if(content&&currentCourse&&currentFolderId){
        const set=getMatchingSet(currentCourse.id,currentFolderId,currentFile?.id);
        const mats=studyMaterials(index,currentFolderId);
        content.innerHTML=renderPanelContent(currentCourse,byId.get(currentFolderId),currentFile,set,mats.docs[0]);
      }
    }else if(b.hasAttribute('data-study-mobile-tab')){
      activeTab=b.dataset.studyMobileTab;
      document.querySelectorAll('[data-study-mobile-tab]').forEach(btn=>btn.classList.toggle('active',btn.dataset.studyMobileTab===activeTab));
      // Show/hide main panels based on active tab
      const vidPanel=$('#study-video-panel');
      const docPanel=$('#study-doc-panel');
      const panel=$('#study-room-panel');
      if(activeTab==='study'){
        if(vidPanel)vidPanel.style.display='';
        if(docPanel)docPanel.style.display='none';
        if(panel)panel.style.display='none';
      }else if(activeTab==='doc'){
        if(vidPanel)vidPanel.style.display='none';
        if(docPanel)docPanel.style.display='';
        if(panel)panel.style.display='none';
      }else{
        // notes or quiz
        if(vidPanel)vidPanel.style.display='none';
        if(docPanel)docPanel.style.display='none';
        if(panel){
          panel.style.display='';
          const content=$('#study-panel-content');
          if(content&&currentCourse&&currentFolderId){
            const set=getMatchingSet(currentCourse.id,currentFolderId,currentFile?.id);
            const mats=studyMaterials(index,currentFolderId);
            content.innerHTML=renderPanelContent(currentCourse,byId.get(currentFolderId),currentFile,set,mats.docs[0]);
          }
        }
      }
    }else if(b.hasAttribute('data-study-switch-tab')){
      activeTab=b.dataset.studySwitchTab;
      document.querySelectorAll('[data-study-tab]').forEach(btn=>btn.classList.toggle('active',btn.dataset.studyTab===activeTab));
      const panel=$('#study-room-panel');
      if(panel)panel.style.display='';
      const content=$('#study-panel-content');
      if(content&&currentCourse&&currentFolderId){
        const set=getMatchingSet(currentCourse.id,currentFolderId,currentFile?.id);
        const mats=studyMaterials(index,currentFolderId);
        content.innerHTML=renderPanelContent(currentCourse,byId.get(currentFolderId),currentFile,set,mats.docs[0]);
      }
    }else if(b.hasAttribute('data-study-note-tag')){
      const box=$('#study-note-editor');
      if(box){
        const tag=b.dataset.studyNoteTag;
        const prefix=box.value&&!box.value.endsWith('\n')?'\n':'';
        box.value+=prefix+tag;
        box.focus();
        handleNoteInput(box);
      }
    }else if(b.hasAttribute('data-study-action')){
      const act=b.dataset.studyAction;
      const state=getState();
      if(act==='understood'&&currentCourse&&currentFolderId){
        const set=getMatchingSet(currentCourse.id,currentFolderId,currentFile?.id);
        const id=set?.id||currentFile?.id||currentFolderId;
        state.lessonRead||={};
        const was=Boolean(state.lessonRead[id]);
        if(was)delete state.lessonRead[id];
        else state.lessonRead[id]=new Date().toISOString();
        saveLearning();
        b.classList.toggle('btn-soft',!was);
        b.classList.toggle('btn-primary',was);
        b.querySelector('span').textContent=!was?'Đã đánh dấu đã hiểu':'Đánh dấu đã hiểu bài';
        b.setAttribute('aria-pressed',String(!was));
        toast(!was?'Đã ghi nhận hiểu bài (tự đánh giá).':'Đã bỏ đánh dấu hiểu bài.');
      }else if(act==='flag'&&currentFile){
        state.flaggedLessons||=[];
        const was=state.flaggedLessons.includes(currentFile.id);
        if(was)state.flaggedLessons=state.flaggedLessons.filter(x=>x!==currentFile.id);
        else state.flaggedLessons.push(currentFile.id);
        saveLearning();
        b.classList.toggle('saved',!was);
        b.querySelector('span').textContent=!was?'Đã lưu vào danh sách ôn':'Cần xem lại bài này';
        b.setAttribute('aria-pressed',String(!was));
        toast(!was?'Đã thêm bài này vào Hộp ôn tập.':'Đã bỏ khỏi danh sách cần xem lại.');
      }else if(act==='complete-video'&&currentFile){
        const p=progress();
        const was=Boolean(p.completed[currentFile.id]);
        if(was)delete p.completed[currentFile.id];
        else p.completed[currentFile.id]=new Date().toISOString();
        persist();
        b.classList.toggle('btn-soft',!was);
        b.querySelector('span').textContent=!was?'Đã hoàn thành video':'Đánh dấu đã xem video';
        toast(!was?'Đã đánh dấu hoàn thành video.':'Đã bỏ đánh dấu hoàn thành.');
      }
    }else if(b.hasAttribute('data-study-sheet-choice')){
      const num=b.dataset.studySheetChoice,ch=b.dataset.choice;
      if(currentFile){
        const state=getState();
        state.worksheets[currentFile.id]||={count:20,answers:{},checks:{},submitted:false};
        const w=state.worksheets[currentFile.id];
        w.answers[num]=(w.answers[num]||'').trim().toUpperCase()===ch?'':ch;
        saveLearning();
        // re-render choices in row
        const row=b.closest('.worksheet-row');
        if(row){
          row.querySelectorAll('.worksheet-choice-btn').forEach(btn=>{
            const isCh=btn.dataset.choice===w.answers[num];
            btn.classList.toggle('chosen',isCh);
          });
        }
      }
    }
  });

  document.addEventListener('input',e=>{
    if(e.target.id==='study-note-editor'){
      handleNoteInput(e.target);
    }else if(e.target.hasAttribute('data-study-sheet-answer')&&currentFile){
      const num=e.target.dataset.studySheetAnswer;
      const state=getState();
      state.worksheets[currentFile.id]||={count:20,answers:{},checks:{},submitted:false};
      state.worksheets[currentFile.id].answers[num]=e.target.value;
      saveLearning();
    }
  });

  document.addEventListener('change',e=>{
    if(e.target.id==='study-note-pinned'&&currentFile){
      const state=getState();
      state.noteMeta||={};
      state.noteMeta[currentFile.id]={
        ...(state.noteMeta[currentFile.id]||{}),
        pinned:e.target.checked,
        updatedAt:new Date().toISOString()
      };
      saveLearning();
      toast(e.target.checked?'Đã ghim ghi chú này.':'Đã bỏ ghim ghi chú.');
    }
  });

  function afterRender(){
    document.body.classList.add('in-study-room');
  }

  function cleanup(){
    document.body.classList.remove('in-study-room');
  }

  return {render,afterRender,cleanup};
}
