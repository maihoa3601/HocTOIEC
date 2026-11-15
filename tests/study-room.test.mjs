import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildHierarchy } from '../src/client/hierarchy.mjs';
import { isLearningResource } from '../src/client/core.mjs';

// Local DOM/storage shims scoped strictly to this test module
const listeners = {};
const store = new Map();
const classSet = () => ({
  items: new Set(),
  add(...names) { names.forEach(n => this.items.add(n)); },
  remove(...names) { names.forEach(n => this.items.delete(n)); },
  toggle(n, force) { if (force === undefined) this.items.has(n) ? this.items.delete(n) : this.items.add(n); else if (force) this.items.add(n); else this.items.delete(n); },
  contains(n) { return this.items.has(n); }
});
globalThis.localStorage = {
  getItem: k => store.has(k) ? store.get(k) : null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k)
};
globalThis.document = {
  body: { classList: classSet() },
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: (type, fn) => { (listeners[type] ??= []).push(fn); }
};
globalThis.window = {
  matchMedia: () => ({ matches: false })
};

const { createStudyRoom } = await import('../src/client/study-room.mjs');
const { createLibraryView } = await import('../src/client/library-view.mjs');

const catalog = JSON.parse(await readFile(new URL('../data/catalog.json', import.meta.url), 'utf8'));
const bank = JSON.parse(await readFile(new URL('../data/learning-bank.json', import.meta.url), 'utf8'));
const byId = new Map(catalog.items.map(f => [f.id, f]));
const index = buildHierarchy(catalog.items, catalog.items.filter(isLearningResource));
const courses = catalog.items.filter(n => n.parent === '1RySWcms9OOcRv4VWOTFrDE6qWwUA581m' && n.mime === 'application/vnd.google-apps.folder').map((node, idx) => {
  const entry = index.folders.get(node.id);
  return { id: node.id, title: node.name, index: idx, videos: entry?.videos || [], docs: entry?.docs || [] };
});
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = n => `<svg data-icon="${n}"></svg>`;
const fmt = n => String(n);

const progressState = { completed: {}, notes: {}, saved: [], last: '' };
const learningState = {
  priorityCourse: '1EcEHLSxxlsRFtJCXMGimzy2rKd2Ej-zD',
  displayPreferences: { fontSize: 'medium', density: 'comfortable' },
  flaggedLessons: [],
  lessonRead: {},
  worksheets: {},
  studyRoomDrafts: {},
  noteMeta: {}
};

const studyRoom = createStudyRoom({
  index,
  courses,
  byId,
  bank,
  getState: () => learningState,
  progress: () => progressState,
  persist: () => true,
  saveLearning: () => true,
  esc,
  icon,
  fmt,
  toast: () => { }
});

const libraryView = createLibraryView({
  courses,
  videos: catalog.items.filter(n => n.mime?.startsWith('video/')),
  docs: catalog.items.filter(n => isLearningResource(n) && !n.mime?.startsWith('video/')),
  nodes: catalog.items,
  esc,
  icon,
  fmt,
  button: (label, attrs, cls, ic) => `<button class="btn ${cls}" ${attrs}>${icon(ic)}${label}</button>`,
  courseCard: c => `<article data-card="${c.id}">${esc(c.title)}</article>`,
  videoRow: f => `<div data-row="${f.id}">${esc(f.name)}</div>`,
  heading: t => `<h1>${t}</h1>`,
  empty: t => `<div class="empty">${t}</div>`,
  progress: () => progressState,
  getState: () => learningState,
  saveLearning: () => true,
  toast: () => { },
  refreshLibrary: () => { }
});

// 1. Study Room renders Theater mode, large stage, action bar & tabs for compiled lesson
{
  const firstSet = bank.sets[0];
  const html = studyRoom.render(new URLSearchParams({ course: firstSet.courseId, folder: firstSet.folderId }));
  assert.ok(html.includes('id="study-room-container"'), 'renders study room container');
  assert.ok(html.includes('theater-active'), 'Theater mode is enabled by default');
  assert.ok(html.includes('id="study-toggle-theater-btn"'), 'renders Khung lớn toggle button');
  assert.ok(html.includes('id="study-toggle-outline-btn"'), 'renders Mục lục toggle button');
  assert.ok(html.includes('id="study-toggle-panel-btn"'), 'renders Bảng học toggle button');
  assert.ok(html.includes('id="study-video-frame"'), 'renders embedded video iframe');
  assert.ok(html.includes('data-study-action="complete-video"'), 'renders complete-video action button');
  assert.ok(html.includes('data-study-action="flag"'), 'renders Cần xem lại action button');
  assert.ok(html.includes('study-panel-tab active" data-study-tab="notes"'), 'activates Notes side panel tab cleanly on load');
}

// 2. Study Room renders complete-video action bar & chapter switcher on uncompiled courses
{
  const msThamId = '1pCQAKuQM_ywmrCbxjQeTb787sDgi8dfv';
  const entry = index.folders.get(msThamId);
  const firstChapter = entry.folders[0];
  const html = studyRoom.render(new URLSearchParams({ course: msThamId, folder: firstChapter.id }));
  assert.ok(html.includes('data-study-action="complete-video"'), 'uncompiled video lesson still shows complete-video button');
  assert.ok(html.includes('id="study-chapter-select"'), 'chapter switcher select renders when sibling chapters exist');
  assert.ok(html.includes('class="study-lesson-guide"'), 'renders concise lesson guide card when no 6-step lesson compiled');
}

// 3. Course Detail uses shared .ui-filter-panel controls and supports dynamic priority course
{
  const targetCourse = '1pCQAKuQM_ywmrCbxjQeTb787sDgi8dfv';
  learningState.priorityCourse = targetCourse;
  const introHtml = libraryView.libraryIntro('all');
  assert.ok(introHtml.includes('course-priority-pill'), 'renders dynamic priority pill in catalog');

  const detailHtml = libraryView.courseDetail(targetCourse);
  assert.ok(detailHtml.includes('class="ui-filter-panel folder-filter-panel"'), 'uses shared ui-controls .ui-filter-panel');
  assert.ok(detailHtml.includes('id="folder-search" class="ui-input"'), 'preserves #folder-search with shared .ui-input');
  assert.ok(detailHtml.includes('id="folder-status"'), 'preserves native #folder-status select');
  assert.ok(detailHtml.includes(`data-course-priority="${targetCourse}"`), 'renders priority toggle button');
  assert.ok(detailHtml.includes('Đang là khóa chính'), 'reflects current priorityCourse state');
  assert.ok(detailHtml.includes('class="course-meta-grid"'), 'uses responsive CSS grid class instead of hardcoded inline columns');
}

// 4. CSS specificity & build checks
{
  const srCss = await readFile(new URL('../src/client/study-room.css', import.meta.url), 'utf8');
  const refCss = await readFile(new URL('../src/client/studio-refresh.css', import.meta.url), 'utf8');
  const indexHtml = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.ok(/\bbody\.in-study-room\s+main\s*\{\s*padding\s*:\s*0\s*;?\s*\}/.test(srCss), 'overrides studio-refresh main padding cleanly');
  assert.ok(/\bmain\s*\{[^}]*\bpadding\s*:/.test(refCss) && indexHtml.includes('study-room.css') && indexHtml.includes('studio-refresh.css'), 'higher-specificity body.in-study-room main overrides studio-refresh main padding');
  assert.ok(/\bbody\.in-study-room\.study-focus-active\s+\.sidebar\s*\{\s*display\s*:\s*none\s*;?\s*\}/.test(srCss), 'focus mode hides left sidebar cleanly');
  const hierCss = await readFile(new URL('../src/client/hierarchy.css', import.meta.url), 'utf8');
  assert.ok(hierCss.includes('html.dark .course-outline'), 'includes dark mode styles for course outline');
}

// A video-only topic must explain missing documents and avoid dead-end worksheet CTAs.
{
  const folderId = '1GYma6DDZJRIblT16QdzPIfcVT1-bC_GY';
  learningState.studyRoomDrafts[folderId] = { activeTab: 'quiz' };
  const html = studyRoom.render(new URLSearchParams({ course: '1lg27QJcSuv7Qg9dmubzC_1g2uFjvPf5R', folder: folderId }));
  assert.ok(html.includes('Bài này chưa có tài liệu đính kèm'));
  assert.ok(html.includes('Quay lại video'));
  assert.ok(html.includes('Ghi lại ý chính'));
  assert.ok(!html.includes('Mở phiếu đáp án'));
  assert.ok(!html.includes('data-study-tab="worksheet"'));
  assert.ok(html.includes('bạn cần tự tua đến phút đang xem'));
  assert.ok(html.includes('Bài tiếp theo<svg'), 'next navigation keeps a visible text label');
  delete learningState.studyRoomDrafts[folderId];
}

// Uncompiled topics WITH documents keep the worksheet route available.
{
  const set = bank.sets[0], originalSets = bank.sets;
  try {
    bank.sets = [];
    learningState.studyRoomDrafts[set.folderId] = { activeTab: 'quiz' };
    const html = studyRoom.render(new URLSearchParams({ course: set.courseId, folder: set.folderId }));
    assert.ok(html.includes('id="study-doc-frame"'));
    assert.ok(html.includes('Mở phiếu đáp án'));
    assert.ok(!html.includes('Bài này chưa có tài liệu đính kèm'));
  } finally {
    bank.sets = originalSets;
    delete learningState.studyRoomDrafts[set.folderId];
  }
}

// Opening notes beside video restores a usable layout even after panels were hidden.
{
  store.set('toeic-studio-study-layout-v1', JSON.stringify({ theaterMode: true, outlineOpen: true, panelOpen: false }));
  const set = bank.sets[0];
  studyRoom.render(new URLSearchParams({ course: set.courseId, folder: set.folderId }));
  studyRoom.afterRender();
  const button = { id: 'study-write-notes-btn', hasAttribute: () => false };
  for (const fn of listeners.click) fn({ target: { closest: () => button } });
  const prefs = JSON.parse(store.get('toeic-studio-study-layout-v1'));
  assert.equal(prefs.theaterMode, false);
  assert.equal(prefs.panelOpen, true);
  assert.equal(prefs.outlineOpen, false);
}

// A browser rejection still expands the player, and Escape restores the page and focus.
{
  const query = document.querySelector;
  let exitFocused = false, triggerFocused = false, prevented = false;
  const frame = {
    classList: classSet(), requestFullscreen: () => Promise.reject(new Error('Fullscreen denied')),
    querySelector: () => ({ focus: () => { exitFocused = true; } })
  };
  document.querySelector = s => s === '#study-video-panel .video-frame' ? frame :
    s === '#study-video-fullscreen-btn' ? { focus: () => { triggerFocused = true; } } : null;
  try {
    const button = { id: 'study-video-fullscreen-btn', hasAttribute: () => false };
    for (const fn of listeners.click) fn({ target: { closest: () => button } });
    await Promise.resolve();
    assert.ok(frame.classList.contains('is-expanded'));
    assert.ok(document.body.classList.contains('study-player-expanded'));
    assert.ok(exitFocused);
    for (const fn of listeners.keydown) fn({ key: 'Escape', target: { tagName: 'BUTTON' }, preventDefault: () => { prevented = true; } });
    assert.ok(!frame.classList.contains('is-expanded'));
    assert.ok(!document.body.classList.contains('study-player-expanded'));
    assert.ok(prevented && triggerFocused);
  } finally { document.querySelector = query; }
}

// 5. Uncompiled course complete-video & flag actions update state and DOM cleanly
{
  const msThamId = '1pCQAKuQM_ywmrCbxjQeTb787sDgi8dfv';
  const entry = index.folders.get(msThamId);
  const videoFolder = entry.folders.find(f => (index.folders.get(f.id)?.videos?.length || 0) > 0) || entry.folders[0];
  const mats = { videos: index.folders.get(videoFolder.id)?.videos || [], docs: index.folders.get(videoFolder.id)?.docs || [] };
  const v = mats.videos[0];
  assert.ok(v, 'expected an uncompiled course video to test');

  const mkEl = (text = '') => {
    const attrs = {};
    return {
      id: '', textContent: text, innerHTML: '', style: {}, classList: classSet(), dataset: {},
      hasAttribute: a => a === 'data-study-action',
      setAttribute: (k, val) => { attrs[k] = String(val); },
      getAttribute: k => attrs[k],
      attrs,
      querySelector(sel) { return sel === 'span' ? this._span : (sel === '.study-outline-icon' ? this._ic : null); },
      _span: { textContent: text },
      _ic: { innerHTML: '' }
    };
  };

  const query = document.querySelector, queryAll = document.querySelectorAll;
  const barEl = mkEl(), progEl = mkEl(), footerEl = mkEl(), doneBtn = mkEl('Đánh dấu đã học'), flagBtn = mkEl('Cần xem lại');
  doneBtn.dataset.studyAction = 'complete-video';
  flagBtn.dataset.studyAction = 'flag';
  const outlineItem = mkEl(); outlineItem.dataset.fileId = v.id;

  document.querySelector = s => s === '#study-outline-bar' ? barEl : s === '#study-outline-progress' ? progEl : s === '#study-footer-progress' ? footerEl : null;
  document.querySelectorAll = s => s === '[data-study-action="complete-video"]' ? [doneBtn] : s === '[data-study-action="flag"]' ? [flagBtn] : s === '.study-outline-item.is-video' ? [outlineItem] : [];
  try {
    studyRoom.render(new URLSearchParams({ course: msThamId, folder: videoFolder.id, file: v.id }));
    studyRoom.afterRender();
    for (const fn of listeners.click) fn({ target: { closest: () => doneBtn } });
    assert.ok(progressState.completed[v.id], 'complete-video marks progress.completed');
    assert.equal(doneBtn.attrs['aria-pressed'], 'true');
    assert.equal(doneBtn._span.textContent, 'Đã hoàn thành video');
    assert.ok(progEl.textContent.startsWith('1/'));

    for (const fn of listeners.click) fn({ target: { closest: () => flagBtn } });
    assert.ok(learningState.flaggedLessons.includes(v.id), 'flag adds lesson id to flaggedLessons');
    assert.equal(flagBtn.attrs['aria-pressed'], 'true');
    assert.equal(flagBtn._span.textContent, 'Đã lưu xem lại');
  } finally {
    document.querySelector = query;
    document.querySelectorAll = queryAll;
    delete progressState.completed[v.id];
    learningState.flaggedLessons = [];
  }
}

// 6. Selecting another doc via #study-room-doc-select updates PDF title & .study-doc-role badge
{
  let multiCourseId = null, multiFolder = null, multiDocs = null;
  for (const c of courses) {
    const cf = index.folders.get(c.id);
    for (const f of [c, ...(cf?.folders || [])]) {
      const docs = index.folders.get(f.id)?.docs || [];
      if (docs.length >= 2) { multiCourseId = c.id; multiFolder = f.id; multiDocs = docs; break; }
    }
    if (multiDocs) break;
  }
  assert.ok(multiDocs, 'expected a folder with multiple docs');
  const html = studyRoom.render(new URLSearchParams({ course: multiCourseId, folder: multiFolder }));
  assert.ok(html.includes('id="study-room-doc-select"'), 'uses distinct #study-room-doc-select ID');
  assert.ok(!html.includes('id="study-doc-select"'), 'avoids colliding #study-doc-select ID');
  studyRoom.afterRender();

  const query = document.querySelector;
  const docFrame = { src: '', title: '' }, docTitle = { textContent: '' }, docRole = { textContent: '' }, docSel = { value: '' };
  document.querySelector = s => s === '#study-doc-frame' ? docFrame : s === '#study-doc-title' ? docTitle : s === '#study-doc-panel .study-doc-role' ? docRole : s === '#study-room-doc-select' ? docSel : null;
  try {
    const targetDoc = multiDocs[1];
    for (const fn of listeners.change) fn({ target: { id: 'study-room-doc-select', value: targetDoc.id, matches: () => false } });
    assert.ok(docFrame.src.includes(encodeURIComponent(targetDoc.id)), 'updates PDF iframe src');
    assert.ok(docTitle.textContent.length > 0, 'updates document title');
    assert.ok(docRole.textContent.length > 0, 'updates .study-doc-role badge');
    assert.equal(docSel.value, targetDoc.id);
  } finally {
    studyRoom.cleanup();
    document.querySelector = query;
  }
}

// 7. learning.mjs guards study handlers safely when study is null (e.g., while Study Room owns #study)
{
  const prevAdd = globalThis.window.addEventListener;
  const prevFetch = globalThis.fetch;
  globalThis.window.addEventListener = () => { };
  globalThis.fetch = async () => ({ ok: true, json: async () => bank });
  try {
    const { createLearning } = await import('../src/client/learning.mjs');
    await createLearning({
      index, courses, byId, esc, icon, fmt,
      button: (l, a, c, i) => `<button class="${c}" ${a}>${i}${l}</button>`,
      heading: t => `<h1>${t}</h1>`,
      empty: t => `<div>${t}</div>`,
      toast: () => { },
      progress: () => progressState,
      persist: () => true,
      playerOpen: () => false,
      closePlayer: () => { },
      snapshot: () => ({}),
      restore: () => { },
      refresh: () => { }
    });
    const stubEvt = t => ({ target: { closest: () => null, hasAttribute: () => false, matches: () => false, dataset: {}, ...t } });
    for (const fn of listeners.change) {
      await fn(stubEvt({ id: 'study-doc-select', value: 'missing' }));
      await fn(stubEvt({ id: 'study-video-select', value: 'missing' }));
      await fn(stubEvt({ id: 'worksheet-count', value: '15' }));
    }
    const stubPanelBtn = { id: '', matches: () => false, hasAttribute: a => a === 'data-l-panel', dataset: { lPanel: 'notes' } };
    stubPanelBtn.closest = s => (s === 'button' || s === 'button,a' ? stubPanelBtn : null);
    const stubDoneBtn = { id: '', matches: () => false, hasAttribute: a => a === 'data-l-video-done', dataset: {} };
    stubDoneBtn.closest = s => (s === 'button' || s === 'button,a' ? stubDoneBtn : null);
    for (const fn of listeners.click) {
      await fn({ target: stubPanelBtn, preventDefault: () => { } });
      await fn({ target: stubDoneBtn, preventDefault: () => { } });
    }
    for (const fn of listeners.input) {
      await fn(stubEvt({ id: '', matches: s => s === '[data-l-sheet-answer]', dataset: { lSheetAnswer: '1' }, value: 'A' }));
    }
  } finally {
    globalThis.window.addEventListener = prevAdd;
    globalThis.fetch = prevFetch;
  }
}

// 8. today-hub.mjs routes Task 01 to #study and Task 02 to #quiz even with an active quiz draft
{
  const { createTodayHub } = await import('../src/client/today-hub.mjs');
  const firstSet = bank.sets[0];
  const hubState = {
    ...learningState,
    attempts: [], cards: {}, wrong: [], responses: {},
    drafts: { [`${firstSet.id}:full`]: { answers: { [firstSet.questions[0].id]: '0' }, updatedAt: Date.now() } }
  };
  const todayHub = createTodayHub({
    bank, courses, byId, getState: () => hubState, progress: () => progressState,
    persist: () => true, saveLearning: () => true, esc, icon, fmt, heading: t => `<h1>${t}</h1>`, toast: () => { }
  });
  const htmlWithDraft = todayHub.render();
  const task1Href = htmlWithDraft.match(/class="today-task-card main-task"[\s\S]*?<a href="([^"]+)"/)?.[1] || '';
  const task2Href = htmlWithDraft.match(/class="today-task-card quiz-task"[\s\S]*?<a href="([^"]+)"/)?.[1] || '';
  assert.ok(task1Href.startsWith('#study?'), `Task 01 should point to #study?, got ${task1Href}`);
  assert.ok(task2Href.startsWith('#quiz?'), `Task 02 should point to #quiz?, got ${task2Href}`);

  delete hubState.drafts;
  const htmlClean = todayHub.render();
  const cleanTask2Href = htmlClean.match(/class="today-task-card quiz-task"[\s\S]*?<a href="([^"]+)"/)?.[1] || '';
  assert.equal(cleanTask2Href, `#quiz?id=${encodeURIComponent(firstSet.id)}`);
}

// 9. review-hub.mjs updates aria-selected when switching review tabs
{
  const { createReviewHub } = await import('../src/client/review-hub.mjs');
  const revState = { ...learningState, cards: {}, wrong: [], mistakeMeta: {} };
  const reviewHub = createReviewHub({
    bank, courses, byId, getState: () => revState, progress: () => progressState,
    persist: () => true, saveLearning: () => true, esc, icon, fmt, heading: t => `<h1>${t}</h1>`, toast: () => { }
  });
  reviewHub.render(new URLSearchParams());

  const mkTab = name => {
    const attrs = { 'aria-selected': name === 'all' ? 'true' : 'false' };
    return {
      dataset: { reviewTab: name },
      classList: classSet(),
      hasAttribute: a => a === 'data-review-tab',
      setAttribute: (k, val) => { attrs[k] = String(val); },
      attrs
    };
  };
  const tabs = ['all', 'cards', 'mistakes', 'lessons'].map(mkTab);
  const query = document.querySelector, queryAll = document.querySelectorAll;
  const grid = { innerHTML: '' };
  document.querySelector = s => s === '#review-stream-grid' ? grid : null;
  document.querySelectorAll = s => s === '[data-review-tab]' ? tabs : [];
  try {
    const mistakesTab = tabs[2];
    mistakesTab.closest = s => (s === 'button' || s === 'button,a' ? mistakesTab : null);
    mistakesTab.matches = () => false;
    for (const fn of listeners.click) await fn({ target: mistakesTab, preventDefault: () => { } });
    assert.equal(tabs[0].attrs['aria-selected'], 'false');
    assert.equal(tabs[2].attrs['aria-selected'], 'true');
    assert.ok(tabs[2].classList.contains('active'));
  } finally {
    document.querySelector = query;
    document.querySelectorAll = queryAll;
  }
}

console.log(JSON.stringify({ ok: true, studyRoomRender: true, uncompiledCompleteButton: true, filterPanelControls: true, darkRules: true, missingMaterials: true, notesLayout: true, fullscreenFallback: true, uncompiledActions: true, docRoleSync: true, learningGuards: true, todayHubTasks: true, reviewTabAria: true }));
