import { cleanTitle, isVideo } from './core.mjs';
import { folderLabel, resourceLabel } from './hierarchy.mjs';
import { materialRole, roleLabel, studyMaterials } from './learning-core.mjs';
import { canSpeak, speakEnglish } from './speech.mjs';

const STUDY_LAYOUT_KEY = 'toeic-studio-study-layout-v1';
const DEFAULT_LAYOUT = { theaterMode: true, outlineOpen: true, panelOpen: true, stageView: 'video' };

function loadLayoutPrefs() {
  try {
    const raw = JSON.parse(localStorage.getItem(STUDY_LAYOUT_KEY) || '{}');
    return {
      theaterMode: typeof raw.theaterMode === 'boolean' ? raw.theaterMode : DEFAULT_LAYOUT.theaterMode,
      outlineOpen: typeof raw.outlineOpen === 'boolean' ? raw.outlineOpen : DEFAULT_LAYOUT.outlineOpen,
      panelOpen: typeof raw.panelOpen === 'boolean' ? raw.panelOpen : DEFAULT_LAYOUT.panelOpen,
      stageView: ['video', 'doc', 'split'].includes(raw.stageView) ? raw.stageView : DEFAULT_LAYOUT.stageView
    };
  } catch {
    return { ...DEFAULT_LAYOUT };
  }
}

function saveLayoutPrefs(prefs) {
  try { localStorage.setItem(STUDY_LAYOUT_KEY, JSON.stringify(prefs)); } catch { }
}

export function createStudyRoom(ctx) {
  const { index, courses, byId, bank, getState, progress, persist, saveLearning, esc, icon, fmt, toast } = ctx;
  const $ = s => document.querySelector(s);

  let currentCourse = null, currentFolderId = null, currentFile = null, currentVideo = null, currentDoc = null, sheetDocId = null;
  let sideTab = 'notes';
  let mobileTab = 'stage';
  let mobileOutlineOpen = false;
  let focusMode = false;
  let layoutPrefs = loadLayoutPrefs();
  let saveTimer = null;

  const fileURL = id => `https://drive.google.com/file/d/${encodeURIComponent(id)}/view`;
  const previewURL = id => `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview`;
  const courseFor = id => courses.find(c => c.id === id);
  const title = f => resourceLabel(f, byId.get(f.parent)?.name || '');

  function expandVideo(frame) {
    frame.classList.add('is-expanded');
    document.body.classList.add('study-player-expanded');
    frame.querySelector('[data-study-exit-fullscreen]')?.focus();
  }

  function closeExpandedVideo() {
    const frame = $('#study-video-panel .video-frame');
    frame?.classList.remove('is-expanded');
    document.body.classList.remove('study-player-expanded');
    if (frame && document.fullscreenElement === frame) document.exitFullscreen().catch(() => { });
    $('#study-video-fullscreen-btn')?.focus({ preventScroll: true });
  }

  function getMatchingSet(courseId, folderId, fileId) {
    const sets = bank.sets || [];
    return sets.find(s => s.sources?.some(src => src.id === fileId)) ||
      sets.find(s => s.folderId === folderId) ||
      sets.find(s => s.courseId === courseId && descendant(folderId, s.folderId));
  }

  function descendant(folder, id) {
    let f = byId.get(id), seen = new Set();
    while (f && !seen.has(f.id)) {
      if (f.id === folder) return true;
      seen.add(f.id);
      f = byId.get(f.parent);
    }
    return false;
  }

  function getSaveStatus() {
    const st = getState();
    if (st.lastSaveError) return { cls: 'error', label: 'Lỗi lưu' };
    if (st.isSyncing) return { cls: 'syncing', label: 'Đang lưu…' };
    if (st.cloudSaved) return { cls: 'cloud', label: 'Đã lưu tài khoản' };
    return { cls: 'local', label: 'Đã lưu cục bộ' };
  }

  function getChapterContext(course, folder) {
    const parentEntry = folder.id !== course.id ? index.folders.get(folder.parent) : null;
    const siblingFolders = parentEntry?.folders?.length > 1
      ? parentEntry.folders
      : (folder.id === course.id ? (index.folders.get(course.id)?.folders || []) : []);
    const curIdx = siblingFolders.findIndex(f => f.id === folder.id);
    return {
      siblingFolders,
      prevChapter: curIdx > 0 ? siblingFolders[curIdx - 1] : null,
      nextChapter: curIdx >= 0 && curIdx < siblingFolders.length - 1 ? siblingFolders[curIdx + 1] : null
    };
  }

  function syncShellClasses() {
    const shell = $('#study-room-container');
    if (!shell) return;
    shell.classList.toggle('theater-active', Boolean(layoutPrefs.theaterMode));
    shell.classList.toggle('outline-hidden', !layoutPrefs.outlineOpen);
    shell.classList.toggle('panel-hidden', !layoutPrefs.panelOpen);
    shell.classList.toggle('focus-mode-active', Boolean(focusMode));
    shell.classList.toggle('mobile-outline-open', Boolean(mobileOutlineOpen));
    shell.classList.remove('mobile-tab-stage', 'mobile-tab-doc', 'mobile-tab-notes', 'mobile-tab-quiz');
    shell.classList.add('mobile-tab-' + mobileTab);
    document.body.classList.toggle('study-focus-active', Boolean(focusMode));

    const toggleBtn = (id, active) => {
      const btn = $(id);
      if (!btn) return;
      btn.classList.toggle('active', Boolean(active));
      btn.setAttribute('aria-pressed', String(Boolean(active)));
    };
    toggleBtn('#study-toggle-theater-btn', layoutPrefs.theaterMode);
    toggleBtn('#study-toggle-outline-btn', window.matchMedia('(max-width: 760px)').matches ? mobileOutlineOpen : layoutPrefs.outlineOpen);
    toggleBtn('#study-toggle-panel-btn', layoutPrefs.panelOpen);
    toggleBtn('#study-focus-mode-btn', focusMode);
    toggleBtn('#study-write-notes-btn', !layoutPrefs.theaterMode && layoutPrefs.panelOpen && !focusMode && sideTab === 'notes');
    document.querySelectorAll('.study-mobile-tab-btn').forEach(btn => {
      const active = btn.dataset.studyMobileTab === mobileTab;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
  }

  function applyStageView(view) {
    const hasV = Boolean(currentVideo), hasD = Boolean(currentDoc);
    let eff = view;
    if (!hasV && !hasD) eff = 'empty';
    else if (!hasV) eff = 'doc';
    else if (!hasD) eff = 'video';
    else if (!['video', 'doc', 'split'].includes(eff)) eff = 'video';
    if (view && ['video', 'doc', 'split'].includes(view)) {
      layoutPrefs.stageView = view;
      saveLayoutPrefs(layoutPrefs);
    }
    const media = $('#study-stage-media');
    if (media) {
      media.classList.remove('stage-view-video', 'stage-view-doc', 'stage-view-split', 'stage-view-empty');
      media.classList.add('stage-view-' + eff);
    }
    document.querySelectorAll('[data-study-stage-view]').forEach(btn => {
      const active = btn.dataset.studyStageView === eff;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
    const ext = $('#study-stage-drive-link');
    const activeRes = eff === 'doc' ? (currentDoc || currentVideo) : (currentVideo || currentDoc);
    if (ext && activeRes) ext.href = fileURL(activeRes.id);
  }

  function redrawSidePanel() {
    const content = $('#study-panel-content');
    if (!content || !currentCourse || !currentFolderId) return;
    const folder = byId.get(currentFolderId) || byId.get(currentCourse.id);
    const set = getMatchingSet(currentCourse.id, currentFolderId, currentFile?.id);
    content.innerHTML = renderPanelContent(currentCourse, folder, currentFile, set, currentDoc);
    document.querySelectorAll('[data-study-tab]').forEach(btn => {
      const active = btn.dataset.studyTab === sideTab;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
    const notesBtn = $('#study-write-notes-btn');
    if (notesBtn) {
      const active = !layoutPrefs.theaterMode && layoutPrefs.panelOpen && !focusMode && sideTab === 'notes';
      notesBtn.classList.toggle('active', active);
      notesBtn.setAttribute('aria-pressed', String(active));
    }
  }

  function selectStudyDoc(docId) {
    if (!currentFolderId) return;
    const mats = studyMaterials(index, currentFolderId);
    const nextDoc = mats.docs.find(d => d.id === docId);
    if (!nextDoc) return;
    currentDoc = nextDoc;
    if (materialRole(nextDoc) !== 'answers') sheetDocId = nextDoc.id;
    const frame = $('#study-doc-frame');
    if (frame) { frame.src = previewURL(nextDoc.id); frame.title = title(nextDoc); }
    const docTitle = $('#study-doc-title');
    if (docTitle) docTitle.textContent = title(nextDoc);
    const docRole = $('#study-doc-panel .study-doc-role');
    if (docRole) docRole.textContent = roleLabel(materialRole(nextDoc));
    const sel = $('#study-room-doc-select');
    if (sel && sel.value !== nextDoc.id) sel.value = nextDoc.id;
    const ext = $('#study-doc-drive-link');
    if (ext) ext.href = fileURL(nextDoc.id);
    const stageExt = $('#study-stage-drive-link');
    if (stageExt && layoutPrefs.stageView === 'doc') stageExt.href = fileURL(nextDoc.id);
    document.querySelectorAll('.study-outline-item.is-doc').forEach(a => a.classList.toggle('active', a.dataset.fileId === nextDoc.id));
    if (sideTab === 'worksheet' || sideTab === 'doc') redrawSidePanel();
  }

  function refreshVideoProgressUI() {
    if (!currentFolderId || !currentVideo) return;
    const materials = studyMaterials(index, currentFolderId);
    const completed = progress().completed;
    const doneCount = materials.videos.filter(f => completed[f.id]).length;
    const total = materials.videos.length;
    const pct = total ? Math.round(100 * doneCount / total) : 0;
    const isVideoDone = Boolean(completed[currentVideo.id]);

    const barEl = $('#study-outline-bar');
    if (barEl) barEl.style.width = `${pct}%`;
    const progEl = $('#study-outline-progress');
    if (progEl) progEl.textContent = `${doneCount}/${total} video`;
    const footerEl = $('#study-footer-progress');
    if (footerEl) footerEl.innerHTML = `Tiến độ chương: <strong>${doneCount}/${total}</strong>`;
    const guideDone = $('#study-guide-video-done');
    if (guideDone) guideDone.textContent = `Video bài giảng (${doneCount} đã học)`;
    const guidePct = $('#study-guide-pct');
    if (guidePct) guidePct.textContent = `${pct}%`;

    document.querySelectorAll('.study-outline-item.is-video').forEach(a => {
      const fid = a.dataset.fileId;
      const done = Boolean(completed[fid]);
      a.classList.toggle('done', done);
      const ic = a.querySelector('.study-outline-icon');
      if (ic) ic.innerHTML = done ? icon('check') : icon('play');
    });

    document.querySelectorAll('[data-study-action="complete-video"]').forEach(btn => {
      btn.classList.toggle('btn-soft', isVideoDone);
      btn.classList.toggle('is-done', isVideoDone);
      btn.classList.toggle('btn-primary', !isVideoDone);
      btn.setAttribute('aria-pressed', String(isVideoDone));
      const sp = btn.querySelector('span');
      if (sp) sp.textContent = isVideoDone ? 'Đã hoàn thành video' : 'Đánh dấu đã học';
    });
  }

  function render(params) {
    const courseId = params.get('course');
    const folderId = params.get('folder');
    const fileId = params.get('file');

    const c = courseFor(courseId) || courses[0];
    if (!c) return `<div class="empty"><h3>Chưa chọn khóa học</h3><p>Vui lòng quay lại thư viện khóa học để chọn bài học.</p><a href="#courses" class="btn btn-primary">Mở khóa học</a></div>`;

    const folder = byId.get(folderId) || byId.get(c.id);
    const materials = studyMaterials(index, folder.id);
    const selectedFile = byId.get(fileId);

    const v = selectedFile && isVideo(selectedFile) && materials.videos.some(f => f.id === selectedFile.id)
      ? selectedFile
      : (materials.videos.find(f => f.id === progress().last) || materials.videos[0] || null);
    const exercise = materials.docs.find(f => materialRole(f) === 'exercises');
    const theory = materials.docs.find(f => materialRole(f) === 'theory');
    const doc = selectedFile && !isVideo(selectedFile) && materials.docs.some(f => f.id === selectedFile.id)
      ? selectedFile
      : (exercise || theory || materials.docs[0] || null);

    currentCourse = c;
    currentFolderId = folder.id;
    currentVideo = v;
    currentDoc = doc;
    sheetDocId = doc && materialRole(doc) !== 'answers'
      ? doc.id
      : (materials.docs.find(d => materialRole(d) !== 'answers')?.id || doc?.id || null);
    currentFile = (selectedFile && !isVideo(selectedFile)) ? selectedFile : (v || doc || selectedFile || null);

    if (currentFile) {
      progress().last = currentFile.id;
      persist();
    }

    layoutPrefs = loadLayoutPrefs();
    mobileOutlineOpen = false;
    if (v && doc && selectedFile && !isVideo(selectedFile) && layoutPrefs.stageView === 'video') {
      layoutPrefs.stageView = 'doc';
    }
    const effectiveStage = !v && !doc ? 'empty' : (!v ? 'doc' : (!doc ? 'video' : layoutPrefs.stageView));

    const state = getState();
    const prefs = state.displayPreferences || { fontSize: 'medium', density: 'comfortable' };
    const savedTab = state.studyRoomDrafts?.[folder.id]?.activeTab;
    if (savedTab && ['notes', 'quiz', 'worksheet', 'doc'].includes(savedTab)) sideTab = savedTab;
    else if (!['notes', 'quiz', 'worksheet', 'doc'].includes(sideTab)) sideTab = 'notes';
    mobileTab = effectiveStage === 'doc' && !v ? 'doc' : 'stage';

    const set = getMatchingSet(c.id, folder.id, currentFile?.id);
    const vIdx = v ? materials.videos.findIndex(f => f.id === v.id) : -1;
    const prevV = vIdx > 0 ? materials.videos[vIdx - 1] : null;
    const nextV = vIdx >= 0 && vIdx < materials.videos.length - 1 ? materials.videos[vIdx + 1] : null;
    const vDone = materials.videos.filter(f => progress().completed[f.id]).length;
    const vPct = materials.videos.length ? Math.round(100 * vDone / materials.videos.length) : 0;

    const { siblingFolders, prevChapter, nextChapter } = getChapterContext(c, folder);
    const prevTarget = prevV
      ? { href: `#study?course=${encodeURIComponent(c.id)}&folder=${encodeURIComponent(folder.id)}&file=${encodeURIComponent(prevV.id)}`, label: 'Bài trước: ' + title(prevV), cta: 'Bài trước' }
      : (prevChapter ? { href: `#study?course=${encodeURIComponent(c.id)}&folder=${encodeURIComponent(prevChapter.id)}`, label: 'Chương trước: ' + folderLabel(prevChapter), cta: 'Chương trước' } : null);
    const nextTarget = nextV
      ? { href: `#study?course=${encodeURIComponent(c.id)}&folder=${encodeURIComponent(folder.id)}&file=${encodeURIComponent(nextV.id)}`, label: 'Bài tiếp: ' + title(nextV), cta: 'Bài tiếp theo' }
      : (nextChapter ? { href: `#study?course=${encodeURIComponent(c.id)}&folder=${encodeURIComponent(nextChapter.id)}`, label: 'Chương tiếp: ' + folderLabel(nextChapter), cta: 'Chương tiếp: ' + folderLabel(nextChapter) } : null);

    const vDoneSelf = Boolean(v && progress().completed[v.id]);
    const flagTargetId = currentFile?.id || v?.id || doc?.id;
    const isFlagged = Boolean(flagTargetId && state.flaggedLessons?.includes(flagTargetId));
    const isUnderstood = Boolean(set ? state.lessonRead?.[set.id] : (flagTargetId && state.lessonRead?.[flagTargetId]));
    const saveStatus = getSaveStatus();
    const hasLesson = Boolean(set?.lesson?.sections?.length);
    const activeMediaLabel = effectiveStage === 'doc' && doc ? title(doc) : (v ? title(v) : (doc ? title(doc) : folderLabel(folder)));
    const activeDriveId = effectiveStage === 'doc' && doc ? doc.id : (v?.id || doc?.id);

    return `
    <div class="study-room-shell font-${prefs.fontSize} density-${prefs.density} ${layoutPrefs.theaterMode ? 'theater-active' : ''} ${!layoutPrefs.outlineOpen ? 'outline-hidden' : ''} ${!layoutPrefs.panelOpen ? 'panel-hidden' : ''} ${focusMode ? 'focus-mode-active' : ''} ${!doc ? 'no-doc' : ''} mobile-tab-${mobileTab}" id="study-room-container">
      <header class="study-room-topbar">
        <div class="study-room-breadcrumb">
          <a href="#course?id=${encodeURIComponent(c.id)}&folder=${encodeURIComponent(folder.id)}" class="icon-button" aria-label="Quay lại khóa học" title="Quay lại khóa học">${icon('back')}</a>
          <a href="#course?id=${encodeURIComponent(c.id)}">${esc(c.title)}</a>
          <span>/</span>
          <a href="#course?id=${encodeURIComponent(c.id)}&folder=${encodeURIComponent(folder.id)}">${esc(folderLabel(folder))}</a>
          <span>/</span>
          <strong>${esc(activeMediaLabel)}</strong>
        </div>

        <div class="study-room-topbar-actions">
          <span class="study-sync-pill ${saveStatus.cls}" id="study-sync-indicator" title="Trạng thái lưu">${icon('check')}<span>${saveStatus.label}</span></span>

          <div class="study-layout-controls" role="group" aria-label="Tùy chỉnh không gian học">
            <button type="button" class="study-control-pill ${layoutPrefs.outlineOpen ? 'active' : ''}" id="study-toggle-outline-btn" aria-pressed="${layoutPrefs.outlineOpen}" title="Bật/Ẩn mục lục (M)">${icon('menu')}<span>Mục lục</span></button>
            <button type="button" class="study-control-pill ${layoutPrefs.theaterMode ? 'active' : ''}" id="study-toggle-theater-btn" aria-pressed="${layoutPrefs.theaterMode}" title="Xem khung video lớn (T)">${icon('video')}<span>Khung lớn</span></button>
            <button type="button" class="study-control-pill ${layoutPrefs.panelOpen ? 'active' : ''}" id="study-toggle-panel-btn" aria-pressed="${layoutPrefs.panelOpen}" title="Bật/Ẩn bảng ghi chú & phiếu (B)">${icon('note')}<span>Bảng học</span></button>
          </div>

          ${v ? `<button type="button" class="study-control-pill" id="study-write-notes-btn" aria-pressed="false" title="Đặt video và ghi chú cạnh nhau">${icon('note')}<span>Video + ghi chú</span></button>` : ''}

          <div class="study-view-controls" aria-label="Cỡ chữ">
            <button type="button" class="study-control-pill ${prefs.fontSize === 'small' ? 'active' : ''}" data-study-font="small" title="Cỡ chữ nhỏ">A-</button>
            <button type="button" class="study-control-pill ${prefs.fontSize === 'medium' ? 'active' : ''}" data-study-font="medium" title="Cỡ chữ vừa">A</button>
            <button type="button" class="study-control-pill ${prefs.fontSize === 'large' ? 'active' : ''}" data-study-font="large" title="Cỡ chữ lớn">A+</button>
          </div>

          <button type="button" class="btn btn-soft ${focusMode ? 'active' : ''}" id="study-focus-mode-btn" aria-pressed="${focusMode}" title="Ẩn thanh bên để tập trung tối đa (F)">${icon(focusMode ? 'close' : 'spark')}<span>${focusMode ? 'Thoát tập trung' : 'Tập trung'}</span></button>
          <a href="#course?id=${encodeURIComponent(c.id)}&folder=${encodeURIComponent(folder.id)}" class="icon-button" title="Đóng phòng học" aria-label="Đóng phòng học">${icon('close')}</a>
        </div>
      </header>

      <!-- Mobile study tab switcher -->
      <nav class="study-mobile-tabs" aria-label="Phần học trên điện thoại">
        <div class="study-mobile-tabs-inner">
          <button type="button" class="study-mobile-tab-btn ${mobileTab === 'stage' ? 'active' : ''}" data-study-mobile-tab="stage">${icon('video')} Video & Bài</button>
          <button type="button" class="study-mobile-tab-btn ${mobileTab === 'doc' ? 'active' : ''}" data-study-mobile-tab="doc">${icon('note')} Tài liệu</button>
          <button type="button" class="study-mobile-tab-btn ${mobileTab === 'notes' ? 'active' : ''}" data-study-mobile-tab="notes">${icon('bookmark')} Ghi chú</button>
          <button type="button" class="study-mobile-tab-btn ${mobileTab === 'quiz' ? 'active' : ''}" data-study-mobile-tab="quiz">${icon('target')} Luyện & Phiếu</button>
        </div>
      </nav>

      <div class="study-room-grid">
        <!-- 1. Left: Chapter Switcher & Outline -->
        <aside class="study-room-outline" id="study-room-outline">
          ${siblingFolders.length ? `
          <div class="study-chapter-switcher">
            <label class="ui-field">
              <span class="ui-field-label">Chuyển chương / chủ đề</span>
              <select id="study-chapter-select" class="ui-select--compact" aria-label="Chuyển chương trong khóa học">
                <button type="button" class="ui-select-trigger"><selectedcontent></selectedcontent><svg class="ui-select-caret" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg></button>
                ${siblingFolders.map((sf, i) => `<option value="${esc(sf.id)}" ${sf.id === folder.id ? 'selected' : ''}>${String(i + 1).padStart(2, '0')}. ${esc(folderLabel(sf))}</option>`).join('')}
              </select>
            </label>
          </div>`: ''}

          <div class="study-outline-header">
            <span>Bài học trong chương</span>
            <small id="study-outline-progress">${materials.videos.length ? `${vDone}/${materials.videos.length} video` : `${materials.docs.length} tài liệu`}</small>
          </div>
          ${materials.videos.length ? `<div class="progress-track study-outline-track"><div class="progress-bar" id="study-outline-bar" style="width:${vPct}%"></div></div>` : ''}

          <div class="study-outline-list">
            ${materials.videos.map((file, idx) => {
      const fileDone = Boolean(progress().completed[file.id]);
      const isCur = v?.id === file.id;
      const matching = getMatchingSet(c.id, folder.id, file.id);
      return `
              <a href="#study?course=${encodeURIComponent(c.id)}&folder=${encodeURIComponent(folder.id)}&file=${encodeURIComponent(file.id)}" class="study-outline-item is-video ${isCur ? 'active' : ''} ${fileDone ? 'done' : ''}" data-file-id="${esc(file.id)}" aria-current="${isCur ? 'true' : 'false'}">
                <span class="icon study-outline-icon">${fileDone ? icon('check') : icon('play')}</span>
                <span class="study-outline-name">${String(idx + 1).padStart(2, '0')}. ${esc(title(file))}</span>
                ${matching ? `<span class="study-outline-badge" title="Có bài tự kiểm tra">Luyện</span>` : ''}
              </a>`;
    }).join('')}
            ${!materials.videos.length ? `<p class="fine-print">Chương này học qua ${materials.docs.length} tài liệu PDF / bài tập bên cạnh.</p>` : ''}

            ${materials.docs.length ? `
            <div class="study-outline-subhead">Tài liệu đính kèm (${materials.docs.length})${materials.related ? ' · Gợi ý cùng chương' : ''}</div>
            ${materials.docs.slice(0, 25).map(d => {
      const isCurDoc = doc?.id === d.id;
      return `
              <button type="button" class="study-outline-item is-doc ${isCurDoc ? 'active' : ''}" data-study-pick-doc="${esc(d.id)}" data-file-id="${esc(d.id)}">
                <span class="icon study-outline-icon">${icon('note')}</span>
                <span class="study-outline-name">${esc(title(d))}</span>
                <span class="study-outline-role">${esc(roleLabel(materialRole(d)))}</span>
              </button>`;
    }).join('')}` : ''}
          </div>
        </aside>

        <!-- 2. Stage: Large Video / PDF / Side-by-side Split + Action Bar -->
        <section class="study-stage" id="study-stage" aria-label="Khung phát video và tài liệu">
          <div class="study-stage-toolbar">
            <div class="study-stage-tabs" role="group" aria-label="Chế độ khung học">
              ${v ? `<button type="button" class="study-stage-pill ${effectiveStage === 'video' ? 'active' : ''}" data-study-stage-view="video" aria-pressed="${effectiveStage === 'video'}">${icon('video')}<span>Video</span></button>` : ''}
              ${doc ? `<button type="button" class="study-stage-pill ${effectiveStage === 'doc' ? 'active' : ''}" data-study-stage-view="doc" aria-pressed="${effectiveStage === 'doc'}">${icon('note')}<span>Tài liệu PDF</span></button>` : ''}
              ${v && doc ? `<button type="button" class="study-stage-pill stage-split-pill ${effectiveStage === 'split' ? 'active' : ''}" data-study-stage-view="split" aria-pressed="${effectiveStage === 'split'}">${icon('book')}<span>Video + PDF song song</span></button>` : ''}
            </div>

            ${materials.docs.length > 1 ? `
            <div class="study-stage-docpicker">
              <label class="ui-field">
                <span class="sr-only">Chọn tài liệu PDF</span>
                <select id="study-room-doc-select" class="ui-select--compact" aria-label="Chọn tài liệu trong chương">
                  <button type="button" class="ui-select-trigger"><selectedcontent></selectedcontent><svg class="ui-select-caret" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg></button>
                  ${materials.docs.map(d => `<option value="${esc(d.id)}" ${doc?.id === d.id ? 'selected' : ''}>[${esc(roleLabel(materialRole(d)))}] ${esc(title(d))}</option>`).join('')}
                </select>
              </label>
            </div>`: ''}

            <div class="study-stage-ext">
              ${v ? `<button type="button" class="study-stage-ext-link study-stage-fullscreen" id="study-video-fullscreen-btn" title="Xem video toàn màn hình; nhấn Esc để thoát">${icon('video')}<span>Toàn màn hình</span></button>` : ''}
              ${activeDriveId ? `<a href="${fileURL(activeDriveId)}" target="_blank" rel="noopener noreferrer" class="study-stage-ext-link" id="study-stage-drive-link">${icon('external')}<span>Mở Drive ↗</span></a>` : ''}
            </div>
          </div>

          <div class="study-stage-media stage-view-${effectiveStage}" id="study-stage-media">
            ${v ? `
            <div class="study-video-wrapper" id="study-video-panel">
              <div class="video-frame">
                <button type="button" class="study-exit-fullscreen" data-study-exit-fullscreen>Thoát toàn màn hình (Esc)</button>
                <iframe id="study-video-frame" src="${previewURL(v.id)}" title="${esc(title(v))}" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowfullscreen></iframe>
              </div>
              <div class="study-drive-fallback">
                <span>Học tiếp mở lại bài gần nhất; bạn cần tự tua đến phút đang xem. Nếu video chưa tải, hãy mở trên Drive.</span>
                <a href="${fileURL(v.id)}" target="_blank" rel="noopener noreferrer" class="text-button">${icon('external')}Mở trên Drive ↗</a>
              </div>
            </div>`: ''}

            ${!doc ? `
            <div class="empty study-doc-empty">
              ${icon('folder')}
              <h3>Bài này chưa có tài liệu đính kèm</h3>
              <p>${v ? 'Bạn vẫn có thể xem video và ghi lại những ý chính.' : 'Chọn chủ đề khác trong mục lục để tìm tài liệu học.'}</p>
              ${v ? `<button type="button" class="btn btn-primary" data-study-mobile-tab="stage">${icon('video')}Quay lại video</button>` : `<a href="#course?id=${encodeURIComponent(c.id)}" class="btn btn-primary">Xem mục lục khóa học</a>`}
            </div>`: ''}

            ${doc ? `
            <div class="study-doc-wrapper" id="study-doc-panel">
              <div class="study-doc-header">
                <div>
                  <span class="study-doc-role">${esc(roleLabel(materialRole(doc)))}</span>
                  <strong id="study-doc-title">${esc(title(doc))}</strong>
                </div>
                <a href="${fileURL(doc.id)}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" id="study-doc-drive-link">${icon('external')}Mở trên Drive ↗</a>
              </div>
              <iframe class="study-pdf-frame" id="study-doc-frame" src="${previewURL(doc.id)}" title="${esc(title(doc))}" allow="autoplay; fullscreen" allowfullscreen></iframe>
            </div>`: ''}

            ${!v && !doc ? `
            <div class="empty study-stage-empty">
              ${icon('book')}
              <h3>Chương này chưa có video hoặc PDF trực tiếp</h3>
              <p>Chọn chương con khác ở mục lục bên trái hoặc mở trực tiếp thư mục trên khóa học.</p>
              <a href="#course?id=${encodeURIComponent(c.id)}&folder=${encodeURIComponent(folder.id)}" class="btn btn-primary">Xem mục lục chương</a>
            </div>`: ''}
          </div>

          <!-- Always-visible Action Bar right below player -->
          <div class="study-action-bar">
            <div class="study-action-meta">
              <span class="study-action-kicker">${esc(folderLabel(folder))}</span>
              <h2>${esc(activeMediaLabel)}</h2>
            </div>
            <div class="study-action-buttons">
              ${v ? `<button type="button" class="btn ${vDoneSelf ? 'btn-soft is-done' : 'btn-primary'}" data-study-action="complete-video" aria-pressed="${vDoneSelf}">${icon('check')}<span>${vDoneSelf ? 'Đã hoàn thành video' : 'Đánh dấu đã học'}</span></button>` : ''}
              ${(!v || set) ? `<button type="button" class="btn ${isUnderstood ? 'btn-soft is-done' : 'btn-secondary'}" data-study-action="understood" aria-pressed="${isUnderstood}">${icon('check')}<span>${isUnderstood ? 'Đã hiểu bài' : 'Đánh dấu đã hiểu'}</span></button>` : ''}
              ${flagTargetId ? `<button type="button" class="btn btn-secondary ${isFlagged ? 'saved' : ''}" data-study-action="flag" aria-pressed="${isFlagged}">${icon('bookmark')}<span>${isFlagged ? 'Đã lưu xem lại' : 'Cần xem lại'}</span></button>` : ''}
              <div class="study-nav-step">
                ${prevTarget ? `<a href="${prevTarget.href}" class="btn btn-secondary" title="${esc(prevTarget.label)}">${icon('back')}<span>Trước</span></a>` : ''}
                ${nextTarget ? `<a href="${nextTarget.href}" class="btn btn-soft" title="${esc(nextTarget.label)}"><span>Tiếp</span>${icon('arrow')}</a>` : ''}
              </div>
            </div>
          </div>
        </section>

        <!-- 3. Center: Structured Lesson OR Concise Lesson Guide & Chapter Summary -->
        <div class="study-room-center" id="study-room-center">
          ${set && hasLesson ? renderStructuredLesson(set, isUnderstood, isFlagged, v, vDoneSelf) : renderLessonGuideCard(c, folder, materials, set, vDone, nextChapter, prevTarget, nextTarget)}
        </div>

        <!-- 4. Right: Multi-tab Side Panel -->
        <aside class="study-room-panel" id="study-room-panel">
          <div class="study-panel-tabs">
            <button type="button" class="study-panel-tab ${sideTab === 'notes' ? 'active' : ''}" data-study-tab="notes">${icon('note')} Ghi chú</button>
            <button type="button" class="study-panel-tab ${sideTab === 'quiz' ? 'active' : ''}" data-study-tab="quiz">${icon('target')} Luyện tập</button>
            ${doc ? `<button type="button" class="study-panel-tab ${sideTab === 'worksheet' ? 'active' : ''}" data-study-tab="worksheet">${icon('check')} Phiếu đáp án</button>` : ''}
            <button type="button" class="study-panel-tab ${sideTab === 'doc' ? 'active' : ''}" data-study-tab="doc">${icon('folder')} Tài liệu</button>
          </div>
          <div class="study-panel-content" id="study-panel-content">
            ${renderPanelContent(c, folder, currentFile, set, doc)}
          </div>
        </aside>
      </div>

      <footer class="study-room-footer">
        <div class="study-prev-action">
          ${prevTarget ? `<a href="${prevTarget.href}" class="btn btn-secondary">${icon('back')}<span>${esc(prevTarget.cta)}</span></a>` : ''}
        </div>
        <div class="study-session-info">
          <span>${icon('clock')} Buổi học đang mở</span>
          ${materials.videos.length ? `<span id="study-footer-progress">Tiến độ chương: <strong>${vDone}/${materials.videos.length}</strong></span>` : ''}
          <span class="study-kbd-hint">Phím tắt: <kbd>T</kbd> Khung lớn · <kbd>M</kbd> Mục lục · <kbd>B</kbd> Bảng học · <kbd>F</kbd> Tập trung</span>
        </div>
        <div class="study-next-action">
          ${nextTarget ? `<a href="${nextTarget.href}" class="btn btn-primary" title="${esc(nextTarget.label)}">${esc(nextTarget.cta)}${icon('arrow')}</a>` : `<a href="#course?id=${encodeURIComponent(c.id)}" class="btn btn-primary">Mục lục khóa học${icon('arrow')}</a>`}
        </div>
      </footer>
    </div>`;
  }

  function renderStructuredLesson(set, isUnderstood, isFlagged, v, vDoneSelf) {
    return `
    <article class="study-structured-lesson">
      <div class="lesson-step-tag">BÀI HỌC CÓ ĐỐI CHIẾU NGUỒN · BẢN 18</div>
      <h2>${esc(set.title)}</h2>

      <div class="lesson-objective-box">
        <h3>Mục tiêu cụ thể của bài</h3>
        <p>Sau bài học này, bạn có thể phân biệt và vận dụng quy tắc <strong>${esc(set.topic)}</strong> trong câu TOEIC và giao tiếp hằng ngày.</p>
        ${set.summary?.length ? `<p class="lesson-objective-summary">Ý chính: ${esc(set.summary.slice(0, 2).join(' · '))}</p>` : ''}
      </div>

      <details class="lesson-recall-prompt" open>
        <summary>Gợi nhớ chủ động trước khi mở lý thuyết</summary>
        <p>Bạn còn nhớ cách phân biệt hoặc nguyên tắc chính của <em>${esc(set.title)}</em> không? Hãy tự nhẩm trước một ví dụ trước khi đọc chi tiết bên dưới.</p>
      </details>

      <div class="lesson-sections-list">
        ${set.lesson.sections.map((sec, sIdx) => `
        <section class="lesson-chunk-card">
          <h4>${String(sIdx + 1).padStart(2, '0')}. ${esc(sec.heading)}</h4>
          <ul>
            ${sec.points.map(pt => `<li>${esc(pt)}</li>`).join('')}
          </ul>
          ${sec.examples?.length ? `
          <div class="lesson-examples-grid">
            ${sec.examples.map(ex => `
            <div class="lesson-ex-row">
              <div>
                <strong>${esc(ex.en)}</strong>
                <span class="lesson-ex-vi">${esc(ex.vi)}</span>
              </div>
              ${canSpeak() ? `<button type="button" class="icon-button" data-speak="${esc(ex.en)}" title="Nghe phát âm" aria-label="Nghe phát âm">${icon('headphones')}</button>` : ''}
            </div>`).join('')}
          </div>`: ''}
          ${sec.sourceId ? `<p class="fine-print" style="margin-top:8px"><a href="${fileURL(sec.sourceId)}" target="_blank" rel="noopener noreferrer">${icon('note')}Đối chiếu trang ${sec.page || 1} tài liệu nguồn ↗</a></p>` : ''}
        </section>`).join('')}
      </div>

      ${set.lesson.pitfalls?.length ? `
      <div class="lesson-chunk-card lesson-pitfall-card">
        <h4>${icon('close')} Những lỗi sai thường gặp cần tránh</h4>
        <ul>
          ${set.lesson.pitfalls.map(p => `<li>${esc(p)}</li>`).join('')}
        </ul>
      </div>`: ''}

      <div class="lesson-wrapup-box">
        <div class="lesson-wrapup-actions">
          <button type="button" class="btn ${isUnderstood ? 'btn-soft is-done' : 'btn-primary'}" data-study-action="understood" aria-pressed="${isUnderstood}">${icon('check')}<span>${isUnderstood ? 'Đã đánh dấu đã hiểu' : 'Đánh dấu đã hiểu bài'}</span></button>
          <button type="button" class="btn btn-secondary ${isFlagged ? 'saved' : ''}" data-study-action="flag" aria-pressed="${isFlagged}">${icon('bookmark')}<span>${isFlagged ? 'Đã lưu vào danh sách ôn' : 'Cần xem lại bài này'}</span></button>
          ${v ? `<button type="button" class="btn btn-secondary ${vDoneSelf ? 'btn-soft is-done' : ''}" data-study-action="complete-video" aria-pressed="${vDoneSelf}">${icon('check')}<span>${vDoneSelf ? 'Đã hoàn thành video' : 'Đánh dấu đã xem video'}</span></button>` : ''}
          <button type="button" class="btn btn-soft" data-study-switch-tab="quiz">${icon('target')}Làm tự kiểm tra (${set.questions?.length || 0} câu)</button>
        </div>
        <p class="fine-print">Lưu ý: Nút “Đã hiểu” là tự đánh giá của người học; kết quả kiểm tra bên tab Luyện tập mới là bằng chứng trả lời đúng thực tế.</p>
      </div>
    </article>`;
  }

  function renderLessonGuideCard(course, folder, materials, set, vDone, nextChapter, prevTarget, nextTarget) {
    const pct = materials.videos.length ? Math.round(100 * vDone / materials.videos.length) : 0;
    const chapterComplete = materials.videos.length > 0 && vDone >= materials.videos.length;
    return `
    <section class="study-lesson-guide">
      <div class="study-guide-header">
        <span class="lesson-step-tag">${esc(course.title)}</span>
        <h3>${esc(folderLabel(folder))}</h3>
        <p>Xem bài giảng rồi ghi lại một quy tắc hoặc ví dụ để nhớ lâu hơn. Trên máy tính, chọn “Video + ghi chú” để vừa xem vừa viết; trên điện thoại, mở tab Ghi chú.</p>
      </div>

      <div class="study-guide-metrics">
        <div class="study-guide-stat">
          <strong>${fmt(materials.videos.length)}</strong>
          <small id="study-guide-video-done">Video bài giảng (${vDone} đã học)</small>
        </div>
        <div class="study-guide-stat">
          <strong>${fmt(materials.docs.length)}</strong>
          <small>Tài liệu / Bài tập PDF</small>
        </div>
        <div class="study-guide-stat">
          <strong id="study-guide-pct">${pct}%</strong>
          <small>Tiến độ chương hiện tại</small>
        </div>
      </div>

      <div class="study-guide-actions">
        <button type="button" class="btn btn-soft" data-study-switch-tab="notes">${icon('note')}Viết ghi chú nhanh</button>
        ${materials.docs.length ? `<button type="button" class="btn btn-secondary" data-study-stage-view="${currentVideo ? 'split' : 'doc'}">${icon('book')}${currentVideo ? 'Mở Video + PDF song song' : 'Xem tài liệu PDF'}</button>` : ''}
        ${set?.questions?.length ? `<button type="button" class="btn btn-primary" data-study-switch-tab="quiz">${icon('target')}Luyện ${set.questions.length} câu</button>` : ''}
        ${prevTarget ? `<a href="${prevTarget.href}" class="btn btn-secondary">${icon('back')}${esc(prevTarget.cta)}</a>` : ''}
        ${nextTarget ? `<a href="${nextTarget.href}" class="btn btn-soft">${esc(nextTarget.cta)} ${icon('arrow')}</a>` : ''}
      </div>

      ${chapterComplete && nextChapter ? `
      <div class="chapter-summary-card">
        <h3>${icon('check')} Bạn đã hoàn thành toàn bộ video trong chương này</h3>
        <p class="fine-print">Chuyển sang chương kế tiếp để giữ nhịp học liên tục:</p>
        <div class="chapter-summary-actions">
          <a href="#study?course=${encodeURIComponent(course.id)}&folder=${encodeURIComponent(nextChapter.id)}" class="btn btn-primary">Sang chương tiếp: ${esc(folderLabel(nextChapter))} ${icon('arrow')}</a>
        </div>
      </div>`: ''}
    </section>`;
  }

  function renderPanelContent(course, folder, file, set, doc) {
    const state = getState();
    const fileId = file?.id || folder.id;

    if (sideTab === 'notes') {
      const noteText = progress().notes[fileId] || '';
      const meta = state.noteMeta?.[fileId] || {};
      return `
      <div class="study-notes-widget">
        <div class="study-notes-head">
          <label for="study-note-editor">Ghi chú cho bài này</label>
          <label class="study-note-pin">
            <input type="checkbox" id="study-note-pinned" ${meta.pinned ? 'checked' : ''}> Ghim
          </label>
        </div>
        <div class="note-tag-bar">
          ${['[Quy tắc] ', '[Ví dụ] ', '[Từ mới] ', '[Xem lại] ', '[00:00] '].map(t => `
            <button type="button" class="note-tag-chip" data-study-note-tag="${esc(t)}">${esc(t.trim())}</button>
          `).join('')}
        </div>
        <textarea id="study-note-editor" class="note-editor" maxlength="20000" placeholder="Viết những điều bạn vừa học, quy tắc hoặc lỗi cần chú ý… (tự lưu không làm gián đoạn media)">${esc(noteText)}</textarea>
        <div class="study-note-footer">
          <span id="study-note-save-msg">Tự lưu trên thiết bị</span>
          <button type="button" class="text-button" id="study-note-export-btn">Sao chép ghi chú</button>
        </div>
      </div>`;
    }

    if (sideTab === 'quiz') {
      if (!set || !set.questions?.length) {
        return `
        <div class="empty">
          ${icon('target')}
          <h3>Chưa có câu hỏi tự kiểm tra</h3>
          <p>${doc ? 'Bài học này chưa có bộ câu hỏi biên soạn. Bạn có thể ghi câu trả lời trên phiếu và tự đối chiếu với tài liệu gốc.' : 'Bài học này chưa có bộ câu hỏi hoặc tài liệu bài tập. Hãy ghi lại ý chính để tự ôn sau khi xem video.'}</p>
          ${doc ? `<button type="button" class="btn btn-primary" data-study-switch-tab="worksheet">Mở phiếu đáp án</button>` : `<button type="button" class="btn btn-primary" data-study-switch-tab="notes">Ghi lại ý chính</button>`}
        </div>`;
      }
      return `
      <div class="study-quiz-widget">
        <div class="study-quiz-head">
          <strong>${esc(set.title)}</strong>
          <span class="badge">${set.questions.length} câu</span>
        </div>
        <p class="fine-print">Mở chế độ luyện tập tương ứng với bài học đang xem:</p>
        <div class="study-quiz-actions">
          <a href="#quiz?id=${encodeURIComponent(set.id)}" class="btn btn-primary">${icon('play')}Luyện trắc nghiệm (${set.questions.length} câu)</a>
          <a href="#quiz?id=${encodeURIComponent(set.id)}&mode=cloze" class="btn btn-secondary">${icon('note')}Tự điền từ</a>
          <a href="#quiz?id=${encodeURIComponent(set.id)}&mode=correction" class="btn btn-secondary">${icon('refresh')}Sửa câu sai</a>
          ${set.cards?.length ? `<a href="#cards?id=${encodeURIComponent(set.id)}" class="btn btn-soft">${icon('book')}Ôn ${set.cards.length} thẻ từ</a>` : ''}
        </div>
      </div>`;
    }

    if (sideTab === 'worksheet') {
      const sheetDoc = byId.get(sheetDocId) || doc;
      if (!sheetDoc) {
        return `<div class="empty">${icon('note')}<h3>Không có tài liệu để làm phiếu</h3><p>Mở một chủ đề có tệp PDF để ghi và đối chiếu câu trả lời.</p></div>`;
      }
      const w = state.worksheets[sheetDoc.id] ||= { count: 20, answers: {}, checks: {}, submitted: false };
      const answered = Object.values(w.answers).filter(a => String(a).trim()).length;
      const checked = Object.values(w.checks || {});
      const correct = checked.filter(Boolean).length;
      const rate = checked.length ? Math.round(100 * correct / checked.length) : 0;
      return `
      <div class="study-worksheet-widget">
        <div class="study-worksheet-head">
          <small class="eyebrow">PHIẾU TỰ ĐỐI CHIẾU</small>
          <h4>${esc(title(sheetDoc))}</h4>
          <div class="worksheet-status">
            <span>${answered}/${w.count} câu đã ghi</span>
            ${w.submitted && checked.length ? `<strong>${correct}/${checked.length} đúng (${rate}%)</strong>` : ''}
          </div>
        </div>

        <label class="worksheet-count">
          Số câu trong đề
          <span class="worksheet-count-controls">
            <input id="study-worksheet-count" type="number" min="1" max="100" value="${w.count}">
            <button type="button" class="btn btn-secondary" data-study-sheet-count>Áp dụng</button>
          </span>
        </label>

        <div class="worksheet-grid">
          ${Array.from({ length: w.count }, (_, i) => {
        const num = i + 1;
        const val = w.answers[num] || '';
        const norm = val.trim().toUpperCase();
        return `
            <div class="worksheet-row">
              <label>
                <span>${num}</span>
                <div class="worksheet-quick-choices">
                  ${['A', 'B', 'C', 'D'].map(ch => `<button type="button" class="worksheet-choice-btn ${norm === ch ? 'chosen' : ''}" data-study-sheet-choice="${num}" data-choice="${ch}" aria-pressed="${norm === ch}">${ch}</button>`).join('')}
                </div>
                <input data-study-sheet-answer="${num}" aria-label="Câu trả lời câu ${num}" maxlength="200" value="${esc(val)}" placeholder="Khác…">
              </label>
              ${w.submitted ? `
              <div class="worksheet-checks">
                <button type="button" data-study-sheet-check="${num}" data-correct="yes" class="${w.checks?.[num] === true ? 'selected-correct' : ''}" aria-label="Câu ${num} đúng">${icon('check')}</button>
                <button type="button" data-study-sheet-check="${num}" data-correct="no" class="${w.checks?.[num] === false ? 'selected-wrong' : ''}" aria-label="Câu ${num} sai">${icon('close')}</button>
              </div>`: ''}
            </div>`;
      }).join('')}
        </div>

        <div class="worksheet-footer-actions">
          <button type="button" class="btn btn-primary worksheet-finish" data-study-sheet-submit>${icon('check')}${w.submitted ? 'Mở lại đáp án gốc' : 'Ghi xong · đối chiếu đáp án'}</button>
          <button type="button" class="btn btn-soft worksheet-reset" data-study-sheet-reset>Xóa phiếu làm lại</button>
        </div>
      </div>`;
    }

    const docs = studyMaterials(index, folder.id).docs || [];
    if (!docs.length) {
      return `<div class="empty">${icon('folder')}<h3>Chưa có tài liệu đính kèm</h3><p>Chủ đề này hiện chỉ có video bài giảng.</p></div>`;
    }
    return `
    <div class="study-docs-widget">
      <h4>Tài liệu trong chủ đề (${docs.length})</h4>
      <div class="study-docs-list">
        ${docs.map(d => {
      const active = currentDoc?.id === d.id;
      return `
          <button type="button" class="video-row study-doc-pick-row ${active ? 'active' : ''}" data-study-pick-doc="${esc(d.id)}">
            <span class="row-icon">${icon('note')}</span>
            <span class="video-info">
              <strong>${esc(title(d))}</strong>
              <small>[${esc(roleLabel(materialRole(d)))}]</small>
            </span>
          </button>`;
    }).join('')}
      </div>
    </div>`;
  }

  function handleNoteInput(target) {
    const noteId = currentFile?.id || currentFolderId;
    if (!noteId) return;
    progress().notes[noteId] = target.value;
    const state = getState();
    state.noteMeta ||= {};
    state.noteMeta[noteId] = {
      ...(state.noteMeta[noteId] || {}),
      updatedAt: new Date().toISOString(),
      lessonId: noteId
    };
    const msg = $('#study-note-save-msg');
    if (msg) msg.textContent = 'Đang lưu…';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const ok = persist() && saveLearning();
      if (msg) msg.textContent = ok ? 'Đã lưu trên thiết bị' : 'Lỗi lưu. Hãy sao chép ghi chú.';
      const ind = $('#study-sync-indicator');
      if (ind) {
        const st = getSaveStatus();
        ind.className = `study-sync-pill ${st.cls}`;
        ind.querySelector('span').textContent = st.label;
      }
    }, 400);
  }

  document.addEventListener('click', e => {
    if (!document.body.classList.contains('in-study-room')) return;
    const b = e.target.closest('button,a');
    if (!b) return;

    if (b.hasAttribute('data-study-exit-fullscreen')) {
      closeExpandedVideo();
    } else if (b.id === 'study-video-fullscreen-btn') {
      if (!currentVideo) return;
      applyStageView('video');
      mobileTab = 'stage';
      syncShellClasses();
      const frame = $('#study-video-panel .video-frame');
      if (!frame) return;
      if (!frame.requestFullscreen) { expandVideo(frame); return; }
      frame.requestFullscreen().catch(() => expandVideo(frame));
    } else if (b.id === 'study-write-notes-btn') {
      const alreadyOpen = !layoutPrefs.theaterMode && layoutPrefs.panelOpen && !focusMode && sideTab === 'notes';
      layoutPrefs.theaterMode = alreadyOpen;
      if (!alreadyOpen) layoutPrefs.outlineOpen = false;
      layoutPrefs.panelOpen = true;
      focusMode = false;
      sideTab = 'notes';
      saveLayoutPrefs(layoutPrefs);
      syncShellClasses();
      redrawSidePanel();
      if (!alreadyOpen) $('#study-note-editor')?.focus({ preventScroll: true });
    } else if (b.id === 'study-focus-mode-btn') {
      focusMode = !focusMode;
      syncShellClasses();
    } else if (b.id === 'study-toggle-theater-btn') {
      layoutPrefs.theaterMode = !layoutPrefs.theaterMode;
      saveLayoutPrefs(layoutPrefs);
      syncShellClasses();
    } else if (b.id === 'study-toggle-outline-btn') {
      if (window.matchMedia('(max-width: 760px)').matches) {
        mobileOutlineOpen = !mobileOutlineOpen;
      } else {
        layoutPrefs.outlineOpen = !layoutPrefs.outlineOpen;
        saveLayoutPrefs(layoutPrefs);
      }
      syncShellClasses();
    } else if (b.id === 'study-toggle-panel-btn') {
      layoutPrefs.panelOpen = !layoutPrefs.panelOpen;
      saveLayoutPrefs(layoutPrefs);
      syncShellClasses();
    } else if (b.hasAttribute('data-study-stage-view')) {
      const view = b.dataset.studyStageView;
      if (window.matchMedia('(max-width: 760px)').matches) {
        mobileTab = view === 'doc' ? 'doc' : 'stage';
        syncShellClasses();
      }
      applyStageView(view);
    } else if (b.hasAttribute('data-study-pick-doc')) {
      selectStudyDoc(b.dataset.studyPickDoc);
      if (window.matchMedia('(max-width: 760px)').matches) {
        mobileTab = 'doc';
        mobileOutlineOpen = false;
        syncShellClasses();
      }
      if (layoutPrefs.stageView === 'video') applyStageView('doc');
    } else if (b.hasAttribute('data-study-font')) {
      const font = b.dataset.studyFont;
      const state = getState();
      state.displayPreferences ||= {};
      state.displayPreferences.fontSize = font;
      saveLearning();
      const shell = $('#study-room-container');
      if (shell) {
        shell.classList.remove('font-small', 'font-medium', 'font-large');
        shell.classList.add('font-' + font);
      }
      document.querySelectorAll('[data-study-font]').forEach(btn => btn.classList.toggle('active', btn.dataset.studyFont === font));
    } else if (b.hasAttribute('data-study-tab')) {
      sideTab = b.dataset.studyTab;
      if (currentFolderId) {
        const state = getState();
        state.studyRoomDrafts ||= {};
        state.studyRoomDrafts[currentFolderId] = { ...(state.studyRoomDrafts[currentFolderId] || {}), activeTab: sideTab };
      }
      redrawSidePanel();
    } else if (b.hasAttribute('data-study-mobile-tab')) {
      mobileTab = b.dataset.studyMobileTab;
      if (mobileTab === 'notes' || mobileTab === 'quiz') {
        sideTab = mobileTab === 'notes' ? 'notes' : (sideTab === 'worksheet' ? 'worksheet' : 'quiz');
        redrawSidePanel();
      }
      syncShellClasses();
    } else if (b.hasAttribute('data-study-switch-tab')) {
      sideTab = b.dataset.studySwitchTab;
      if (!layoutPrefs.panelOpen) {
        layoutPrefs.panelOpen = true;
        saveLayoutPrefs(layoutPrefs);
      }
      if (window.matchMedia('(max-width: 760px)').matches) {
        mobileTab = sideTab === 'notes' ? 'notes' : 'quiz';
      }
      syncShellClasses();
      redrawSidePanel();
    } else if (b.hasAttribute('data-study-note-tag')) {
      const box = $('#study-note-editor');
      if (box) {
        const tag = b.dataset.studyNoteTag;
        const prefix = box.value && !box.value.endsWith('\n') ? '\n' : '';
        box.value += prefix + tag;
        box.focus();
        handleNoteInput(box);
      }
    } else if (b.id === 'study-note-export-btn') {
      const noteId = currentFile?.id || currentFolderId;
      const text = noteId ? (progress().notes[noteId] || '') : '';
      if (!text.trim()) { toast('Ghi chú hiện đang trống.'); return; }
      navigator.clipboard?.writeText(text)
        .then(() => toast('Đã sao chép ghi chú vào bộ nhớ tạm.'))
        .catch(() => toast('Hãy chọn và sao chép trực tiếp trong ô ghi chú.'));
    } else if (b.hasAttribute('data-speak')) {
      speakEnglish(b.dataset.speak);
    } else if (b.hasAttribute('data-study-action')) {
      const act = b.dataset.studyAction;
      const state = getState();
      if (act === 'understood' && currentCourse && currentFolderId) {
        const set = getMatchingSet(currentCourse.id, currentFolderId, currentFile?.id);
        const id = set?.id || currentFile?.id || currentFolderId;
        state.lessonRead ||= {};
        const was = Boolean(state.lessonRead[id]);
        if (was) delete state.lessonRead[id];
        else state.lessonRead[id] = new Date().toISOString();
        saveLearning();
        document.querySelectorAll('[data-study-action="understood"]').forEach(btn => {
          btn.classList.toggle('btn-soft', !was);
          btn.classList.toggle('is-done', !was);
          btn.classList.toggle('btn-primary', was && Boolean(set?.lesson?.sections?.length));
          btn.setAttribute('aria-pressed', String(!was));
          const sp = btn.querySelector('span');
          if (sp) sp.textContent = !was ? 'Đã hiểu bài' : 'Đánh dấu đã hiểu';
        });
        toast(!was ? 'Đã ghi nhận hiểu bài (tự đánh giá).' : 'Đã bỏ đánh dấu hiểu bài.');
      } else if (act === 'flag') {
        const flagId = currentFile?.id || currentVideo?.id || currentDoc?.id;
        if (!flagId) return;
        state.flaggedLessons ||= [];
        const was = state.flaggedLessons.includes(flagId);
        if (was) state.flaggedLessons = state.flaggedLessons.filter(x => x !== flagId);
        else state.flaggedLessons.push(flagId);
        saveLearning();
        document.querySelectorAll('[data-study-action="flag"]').forEach(btn => {
          btn.classList.toggle('saved', !was);
          btn.setAttribute('aria-pressed', String(!was));
          const sp = btn.querySelector('span');
          if (sp) sp.textContent = !was ? 'Đã lưu xem lại' : 'Cần xem lại';
        });
        toast(!was ? 'Đã thêm bài này vào danh sách Cần xem lại.' : 'Đã bỏ khỏi danh sách cần xem lại.');
      } else if (act === 'complete-video' && currentVideo) {
        const p = progress();
        const was = Boolean(p.completed[currentVideo.id]);
        if (was) delete p.completed[currentVideo.id];
        else p.completed[currentVideo.id] = new Date().toISOString();
        persist();
        refreshVideoProgressUI();
        toast(!was ? 'Đã đánh dấu hoàn thành video. Tiếp tục nhé!' : 'Đã bỏ đánh dấu hoàn thành video.');
      }
    } else if (b.hasAttribute('data-study-sheet-choice')) {
      const docKey = sheetDocId || currentDoc?.id;
      if (!docKey) return;
      const num = b.dataset.studySheetChoice, ch = b.dataset.choice;
      const state = getState();
      state.worksheets[docKey] ||= { count: 20, answers: {}, checks: {}, submitted: false };
      const w = state.worksheets[docKey];
      w.answers[num] = (w.answers[num] || '').trim().toUpperCase() === ch ? '' : ch;
      saveLearning();
      const row = b.closest('.worksheet-row');
      if (row) {
        row.querySelectorAll('.worksheet-choice-btn').forEach(btn => {
          const isCh = btn.dataset.choice === w.answers[num];
          btn.classList.toggle('chosen', isCh);
          btn.setAttribute('aria-pressed', String(isCh));
        });
        const inp = row.querySelector(`[data-study-sheet-answer="${num}"]`);
        if (inp) inp.value = w.answers[num] || '';
      }
      const answered = Object.values(w.answers).filter(a => String(a).trim()).length;
      const statusSpan = $('.study-worksheet-head .worksheet-status span');
      if (statusSpan) statusSpan.textContent = `${answered}/${w.count} câu đã ghi`;
    } else if (b.hasAttribute('data-study-sheet-count')) {
      const docKey = sheetDocId || currentDoc?.id;
      if (!docKey) return;
      const state = getState();
      const w = state.worksheets[docKey] ||= { count: 20, answers: {}, checks: {}, submitted: false };
      const nextCount = Math.max(1, Math.min(100, Math.trunc(Number($('#study-worksheet-count')?.value) || 20)));
      w.count = nextCount;
      w.answers = Object.fromEntries(Object.entries(w.answers).filter(([n]) => Number(n) <= nextCount));
      w.checks = Object.fromEntries(Object.entries(w.checks || {}).filter(([n]) => Number(n) <= nextCount));
      saveLearning();
      redrawSidePanel();
    } else if (b.hasAttribute('data-study-sheet-submit')) {
      const docKey = sheetDocId || currentDoc?.id;
      if (!docKey || !currentFolderId) return;
      const state = getState();
      const w = state.worksheets[docKey] ||= { count: 20, answers: {}, checks: {}, submitted: false };
      w.submitted = true;
      saveLearning();
      const mats = studyMaterials(index, currentFolderId);
      const keyDoc = mats.docs.find(d => materialRole(d) === 'answers');
      if (keyDoc && keyDoc.id !== currentDoc?.id) {
        selectStudyDoc(keyDoc.id);
        applyStageView(currentVideo && !window.matchMedia('(max-width: 760px)').matches ? 'split' : 'doc');
        toast('Đã mở đáp án gốc bên khung tài liệu. Hãy tự đánh dấu đúng/sai.');
      } else {
        toast('Đã chuyển sang chế độ đối chiếu. Hãy tự đánh dấu đúng/sai.');
      }
      redrawSidePanel();
    } else if (b.hasAttribute('data-study-sheet-check')) {
      const docKey = sheetDocId || currentDoc?.id;
      if (!docKey) return;
      const state = getState();
      const w = state.worksheets[docKey] ||= { count: 20, answers: {}, checks: {}, submitted: true };
      w.checks ||= {};
      w.checks[b.dataset.studySheetCheck] = b.dataset.correct === 'yes';
      saveLearning();
      redrawSidePanel();
    } else if (b.hasAttribute('data-study-sheet-reset')) {
      const docKey = sheetDocId || currentDoc?.id;
      if (!docKey) return;
      if (!confirm('Xóa toàn bộ câu trả lời trên phiếu này để làm lại?')) return;
      const state = getState();
      state.worksheets[docKey] = { count: state.worksheets[docKey]?.count || 20, answers: {}, checks: {}, submitted: false };
      saveLearning();
      redrawSidePanel();
      toast('Đã xóa phiếu trả lời.');
    }
  });

  document.addEventListener('input', e => {
    if (!document.body.classList.contains('in-study-room')) return;
    if (e.target.id === 'study-note-editor') {
      handleNoteInput(e.target);
    } else if (e.target.hasAttribute('data-study-sheet-answer')) {
      const docKey = sheetDocId || currentDoc?.id;
      if (!docKey) return;
      const num = e.target.dataset.studySheetAnswer;
      const state = getState();
      state.worksheets[docKey] ||= { count: 20, answers: {}, checks: {}, submitted: false };
      state.worksheets[docKey].answers[num] = e.target.value;
      saveLearning();
      const w = state.worksheets[docKey];
      const answered = Object.values(w.answers).filter(a => String(a).trim()).length;
      const statusSpan = $('.study-worksheet-head .worksheet-status span');
      if (statusSpan) statusSpan.textContent = `${answered}/${w.count} câu đã ghi`;
    }
  });

  document.addEventListener('change', e => {
    if (!document.body.classList.contains('in-study-room')) return;
    if (e.target.id === 'study-note-pinned') {
      const noteId = currentFile?.id || currentFolderId;
      if (!noteId) return;
      const state = getState();
      state.noteMeta ||= {};
      state.noteMeta[noteId] = {
        ...(state.noteMeta[noteId] || {}),
        pinned: e.target.checked,
        updatedAt: new Date().toISOString()
      };
      saveLearning();
      toast(e.target.checked ? 'Đã ghim ghi chú này.' : 'Đã bỏ ghim ghi chú.');
    } else if (e.target.id === 'study-chapter-select' && currentCourse) {
      const nextFolderId = e.target.value;
      if (nextFolderId) {
        location.hash = `#study?course=${encodeURIComponent(currentCourse.id)}&folder=${encodeURIComponent(nextFolderId)}`;
      }
    } else if (e.target.id === 'study-room-doc-select') {
      selectStudyDoc(e.target.value);
      if (layoutPrefs.stageView === 'video') applyStageView('doc');
    }
  });

  document.addEventListener('keydown', e => {
    if (!document.body.classList.contains('in-study-room')) return;
    if (e.key === 'Escape' && document.body.classList.contains('study-player-expanded')) {
      e.preventDefault();
      closeExpandedVideo();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable) return;
    if (document.querySelector('dialog[open]')) return;
    const key = e.key.toLowerCase();
    if (key === 't') {
      layoutPrefs.theaterMode = !layoutPrefs.theaterMode;
      saveLayoutPrefs(layoutPrefs);
      syncShellClasses();
    } else if (key === 'm') {
      if (window.matchMedia('(max-width: 760px)').matches) mobileOutlineOpen = !mobileOutlineOpen;
      else {
        layoutPrefs.outlineOpen = !layoutPrefs.outlineOpen;
        saveLayoutPrefs(layoutPrefs);
      }
      syncShellClasses();
    } else if (key === 'b') {
      layoutPrefs.panelOpen = !layoutPrefs.panelOpen;
      saveLayoutPrefs(layoutPrefs);
      syncShellClasses();
    } else if (key === 'f') {
      focusMode = !focusMode;
      syncShellClasses();
    }
  });

  function afterRender() {
    document.body.classList.add('in-study-room');
    syncShellClasses();
    const hasV = Boolean(currentVideo), hasD = Boolean(currentDoc);
    applyStageView(!hasV && !hasD ? 'empty' : (!hasV ? 'doc' : (!hasD ? 'video' : layoutPrefs.stageView)));
  }

  function cleanup() {
    focusMode = false;
    document.body.classList.remove('in-study-room', 'study-focus-active', 'study-player-expanded');
  }

  return { render, afterRender, cleanup };
}
