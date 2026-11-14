import {
  READINESS_LABELS,
  PART_SPECS,
  EXAM_ERROR_REASONS,
  EXAM_NOTE_TAGS,
  EXAM_SCALE_DISCLAIMER,
  filterExams,
  canStartMode,
  computeTimerState,
  analyzeExamHistory,
  computePartMatrix,
  renderPart1SceneSvg,
  validateExamContent
} from './exam-core.mjs';

const LOCAL_DRAFTS_KEY = 'toeic-exam-drafts-v1';
const LOCAL_RESULTS_KEY = 'toeic-exam-results-v1';

export function createExamRoom(ctx) {
  const { esc, icon, heading, toast, previewURL, fileURL } = ctx;
  const $ = (s) => document.querySelector(s);

  let catalog = [];
  let loaded = false;
  let attempts = [];
  let results = [];
  let reviewItems = [];
  let signedIn = false;

  const filters = { year: 'all', source: 'all', readiness: 'all', part: 'all', status: 'all', query: '' };
  let activeRun = null; // { attempt, exam, content, groupIndex, mobilePane, saveStatus, timerHandle, checkCache, showPdfDrawer, hasConflict }
  let activeResult = null;
  let reviewSession = null; // { items: [], index: 0, checked: {}, userChoices: {}, filter: 'all', part: 'all' }
  let activeReportTarget = null; // { questionId, questionVersion, questionNum }
  let adminData = { exams: [], versions: [], audit: [], draftModal: null };

  async function api(path, method = 'GET', body) {
    const res = await fetch('/api/' + path, {
      method,
      headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || 'Lỗi kết nối máy chủ.');
      err.status = res.status;
      err.code = data.code;
      err.serverRevision = data.serverRevision;
      throw err;
    }
    return data;
  }

  function readLocal(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback;
    } catch {
      return fallback;
    }
  }

  function writeLocal(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
      return true;
    } catch {
      return false;
    }
  }

  async function refreshAccountExamData() {
    if (!signedIn) return;
    try {
      const [mine, rev] = await Promise.all([
        api('exam-attempts').catch(() => ({ attempts: [], results: [] })),
        api('exam-review').catch(() => ({ items: [] }))
      ]);
      attempts = mine.attempts || [];
      results = mine.results || [];
      reviewItems = rev.items || [];
    } catch {
      // Keep cached data if transient offline error
    }
  }

  async function ensureLoaded() {
    if (loaded && catalog.length > 0) return;
    try {
      const data = await api('exams');
      if (Array.isArray(data.exams) && data.exams.length > 0) {
        catalog = data.exams;
        writeLocal('toeic_exam_catalog_cache', catalog);
      }
    } catch {
      const cached = readLocal('toeic_exam_catalog_cache', null);
      if (Array.isArray(cached) && cached.length > 0) {
        catalog = cached;
      }
    }
    try {
      const sess = await api('session').catch(() => ({ signedIn: false }));
      signedIn = Boolean(sess.signedIn);
      if (signedIn) {
        await refreshAccountExamData();
      } else {
        const localResults = readLocal(LOCAL_RESULTS_KEY, []);
        results = Array.isArray(localResults) ? localResults : [];
      }
    } catch {
      const localResults = readLocal(LOCAL_RESULTS_KEY, []);
      results = Array.isArray(localResults) ? localResults : [];
    }
    loaded = true;
  }

  function setMobilePane(pane) {
    if (!activeRun) return;
    activeRun.mobilePane = pane;
    if ($('#exam-run-layout')) $('#exam-run-layout').dataset.mobilePane = pane;
    document.querySelectorAll('[data-exam-mobile-pane]').forEach((btn) => {
      const on = btn.dataset.examMobilePane === pane;
      btn.classList.toggle('btn-primary', on);
      btn.classList.toggle('btn-secondary', !on);
      btn.setAttribute('aria-pressed', String(on));
    });
  }

  function stopRunTimer() {
    if (activeRun?.timerHandle) {
      clearInterval(activeRun.timerHandle);
      activeRun.timerHandle = null;
    }
  }

  function attemptStatsMap() {
    const map = {};
    for (const a of attempts) {
      const e = (map[a.exam_id] ||= { inProgress: null, count: 0, lastAt: null });
      if (a.status === 'in_progress' && !e.inProgress) e.inProgress = a;
      if (a.status === 'submitted') e.count++;
      if (!e.lastAt || a.updated_at > e.lastAt) e.lastAt = a.updated_at;
    }
    for (const r of results) {
      const eid = r.exam_id || r.examId;
      const e = (map[eid] ||= { inProgress: null, count: 0, lastAt: null });
      e.count = Math.max(e.count, 1);
      const dt = r.created_at || r.submittedAt;
      if (!e.lastAt || (dt && dt > e.lastAt)) e.lastAt = dt;
    }
    return map;
  }

  function renderCatalogGrid() {
    const stats = attemptStatsMap();
    const list = filterExams(catalog, filters, stats);
    if (!list.length) {
      return `<div class="empty">${icon('search')}<h3>Không có đề phù hợp bộ lọc</h3><p>Thử nới lỏng bộ lọc năm hoặc trạng thái sẵn sàng.</p></div>`;
    }
    return `<div class="exam-grid">${list
      .map((exam) => {
        const st = stats[exam.id] || { inProgress: null, count: 0, lastAt: null };
        const badgeClass = exam.readiness === 'full' ? 'full' : exam.readiness === 'reference' ? 'reference' : 'practice';
        return `<article class="exam-card">
          <div class="exam-card-head">
            <div>
              <span class="exam-badge ${badgeClass}">${esc(READINESS_LABELS[exam.readiness] || exam.readiness)}</span>
              ${exam.simulationEligible ? '<span class="exam-badge full">Đủ chuẩn mô phỏng</span>' : ''}
            </div>
            <small>${esc(exam.sourceLabel)}</small>
          </div>
          <h3>${esc(exam.title)}</h3>
          <p class="fine-print">Đã luyện: <strong>${st.count}</strong> lượt${st.inProgress ? ' · <strong style="color:#b45309">Có phiên đang làm dở</strong>' : ''}${st.lastAt ? ' · Gần nhất: ' + new Date(st.lastAt).toLocaleDateString('vi-VN') : ''}</p>
          ${exam.warnings?.length ? `<ul class="exam-warnings">${exam.warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>` : ''}
          <div style="margin-top:auto;display:flex;gap:8px;flex-wrap:wrap">
            <a class="btn btn-primary" href="#exam?id=${encodeURIComponent(exam.id)}">${st.inProgress ? 'Tiếp tục / Chuẩn bị' : 'Chọn đề'}</a>
          </div>
        </article>`;
      })
      .join('')}</div>`;
  }

  function examsPage() {
    void (async () => {
      await ensureLoaded();
      await refreshAccountExamData();
      if ($('#exam-catalog-root')) $('#exam-catalog-root').innerHTML = renderCatalogGrid();
      if ($('#exam-review-count')) $('#exam-review-count').textContent = String(reviewItems.length);
    })();
    return `${heading(
      'Phòng thi thử TOEIC',
      'Chọn đúng đề theo mức sẵn sàng. Ưu tiên chất lượng từng đề, giữ bài làm an toàn và chữa bài có căn cứ.',
      `<div style="display:flex;gap:8px;flex-wrap:wrap">
        <a class="btn btn-secondary" href="#exam-review">${icon('note')}Sổ lỗi sai (<span id="exam-review-count">${reviewItems.length}</span>)</a>
        <a class="btn btn-secondary" href="#exam-analytics">${icon('chart')}Phân tích</a>
        <a class="btn btn-secondary" href="#admin-exams">${icon('profile')}Quản trị đề</a>
        <button type="button" class="btn btn-soft" data-exam-import-v17>Nhập lịch sử bản 17</button>
      </div>`
    )}
    <div class="exam-filters">
      <input id="exam-filter-q" type="search" placeholder="Tìm tên đề, ETS 2023…" value="${esc(filters.query)}" aria-label="Tìm đề thi">
      <select id="exam-filter-year" aria-label="Lọc theo năm">
        <option value="all">Tất cả năm</option>
        <option value="2023" ${filters.year === '2023' ? 'selected' : ''}>2023</option>
        <option value="2024" ${filters.year === '2024' ? 'selected' : ''}>2024</option>
        <option value="2025" ${filters.year === '2025' ? 'selected' : ''}>2025 (YBM)</option>
      </select>
      <select id="exam-filter-readiness" aria-label="Lọc mức sẵn sàng">
        <option value="all">Mọi mức sẵn sàng</option>
        <option value="full" ${filters.readiness === 'full' ? 'selected' : ''}>Có chữa bài đầy đủ</option>
        <option value="practice" ${filters.readiness === 'practice' ? 'selected' : ''}>Có thể tự luyện</option>
        <option value="reference" ${filters.readiness === 'reference' ? 'selected' : ''}>Tài liệu tham khảo</option>
      </select>
      <select id="exam-filter-part" aria-label="Lọc theo Part">
        <option value="all">Tất cả Part</option>
        ${PART_SPECS.map((p) => `<option value="${p.part}" ${String(filters.part) === String(p.part) ? 'selected' : ''}>Part ${p.part}</option>`).join('')}
      </select>
      <select id="exam-filter-status" aria-label="Lọc trạng thái làm">
        <option value="all">Mọi trạng thái</option>
        <option value="in_progress" ${filters.status === 'in_progress' ? 'selected' : ''}>Đang làm dở</option>
        <option value="completed" ${filters.status === 'completed' ? 'selected' : ''}>Đã từng làm</option>
        <option value="unstarted" ${filters.status === 'unstarted' ? 'selected' : ''}>Chưa làm</option>
      </select>
    </div>
    <div id="exam-catalog-root">${loaded ? renderCatalogGrid() : '<div class="loading"><span class="spinner"></span>Đang tải kho đề…</div>'}</div>`;
  }

  function examPrepPage(params) {
    const examId = params.get('id');
    const prePart = Number(params.get('part') || 0);
    const renderPrep = () => {
      const exam = catalog.find((e) => e.id === examId);
      if (!exam) return `<div class="empty"><h3>Không tìm thấy đề thi</h3><a class="btn btn-primary" href="#exams">Về kho đề</a></div>`;
      const stats = attemptStatsMap()[exam.id] || { inProgress: null, count: 0 };
      const simOk = canStartMode(exam, 'simulation');
      const pracOk = canStartMode(exam, 'practice');

      return `${heading(esc(exam.title), `${esc(exam.sourceLabel)} · ${esc(READINESS_LABELS[exam.readiness])}`, `<a class="btn btn-secondary" href="#exams">${icon('back')}Kho đề</a>`)}
      ${stats.inProgress ? `<div class="continue-strip" style="margin-bottom:16px">
        <span class="round-play">${icon('play')}</span>
        <div><strong>Bạn đang có một phiên làm dở</strong><p class="fine-print">Chế độ: ${stats.inProgress.mode === 'simulation' ? 'Thi mô phỏng' : 'Tự luyện'} · Bắt đầu: ${new Date(stats.inProgress.started_at).toLocaleString('vi-VN')}</p></div>
        <div style="display:flex;gap:8px">
          <a class="btn btn-primary" href="#exam-run?attempt=${encodeURIComponent(stats.inProgress.attempt_id)}">Tiếp tục phiên cũ</a>
        </div>
      </div>` : ''}
      <div class="exam-prep-grid">
        <section class="panel">
          <h2>1. Chọn chế độ và phạm vi</h2>
          <p class="fine-print">Hệ thống tự lưu nháp cục bộ trước khi đồng bộ lên tài khoản. Bắt đầu lượt mới sẽ mở phiên mới và giữ lại phiên dở dang.</p>
          <div class="exam-mode-cards">
            <div class="exam-mode-card ${simOk ? '' : 'disabled'}">
              <h3>Thi mô phỏng chuẩn</h3>
              <p class="fine-print">Listening 45 phút → Reading 75 phút. Đồng hồ chạy liên tục; đáp án, transcript và lời giải mở sau khi nộp.</p>
              ${simOk
                ? `<button type="button" class="btn btn-primary" data-exam-start="${esc(exam.id)}" data-mode="simulation" data-scope="full">Bắt đầu thi 200 câu</button>`
                : `<p class="exam-badge warn">Không khả dụng: ${esc(exam.warnings?.[0] || 'Chưa đạt chuẩn mô phỏng')}</p>`}
            </div>
            <div class="exam-mode-card ${pracOk ? '' : 'disabled'}">
              <h3>Tự luyện linh hoạt</h3>
              <p class="fine-print">Chọn cả bài, theo kỹ năng hoặc từng Part. Có thể đặt giới hạn thời gian tùy chọn; xem giải thích từng câu.</p>
              ${pracOk
                ? `<div style="display:grid;gap:10px;margin-bottom:12px">
                    <label class="form-field">Phạm vi luyện
                      <select id="prep-practice-scope">
                        <option value="full">Cả bài (200 câu)</option>
                        <option value="lc">Chỉ Listening (Part 1–4)</option>
                        <option value="rc">Chỉ Reading (Part 5–7)</option>
                        ${PART_SPECS.map((p) => `<option value="p${p.part}" ${prePart === p.part ? 'selected' : ''}>${esc(p.name)} (${p.count} câu)</option>`).join('')}
                      </select>
                    </label>
                    <label class="form-field">Thời gian làm bài
                      <select id="prep-time-limit">
                        <option value="0" selected>Không giới hạn</option>
                        <option value="15">15 phút</option>
                        <option value="30">30 phút</option>
                        <option value="45">45 phút</option>
                        <option value="60">60 phút</option>
                        <option value="75">75 phút</option>
                        <option value="120">120 phút (chuẩn)</option>
                      </select>
                    </label>
                  </div>
                  <button type="button" class="btn btn-primary" data-exam-start="${esc(exam.id)}" data-mode="practice">Bắt đầu tự luyện</button>`
                : `<p class="exam-badge reference">Đề này hiện ở mức ${esc(READINESS_LABELS[exam.readiness])} — dùng tài liệu PDF/Audio bên cạnh để tự học.</p>`}
            </div>
          </div>
        </section>
        <section class="panel">
          <h2>2. Kiểm tra Audio & Tài liệu nguồn</h2>
          <p class="fine-print">Kiểm tra phát thử trước khi vào phòng thi. Tài liệu gốc vẫn mở được trên Google Drive để đối chiếu.</p>
          ${exam.sources?.audio ? `<div style="margin-bottom:12px">
            <strong>Audio: ${esc(exam.sources.audio.name)}</strong>
            <p class="fine-print">${esc(exam.sources.audio.speedNote || '')}</p>
            <iframe src="${previewURL(exam.sources.audio.id)}" title="Nghe thử audio" style="width:100%;height:96px;border:1px solid var(--border);border-radius:10px"></iframe>
            <a class="text-button" href="${fileURL(exam.sources.audio.id)}" target="_blank" rel="noopener noreferrer">Mở Audio trên Drive ${icon('external')}</a>
          </div>` : ''}
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            ${exam.sources?.lcPdf ? `<a class="btn btn-secondary" href="${fileURL(exam.sources.lcPdf.id)}" target="_blank" rel="noopener noreferrer">PDF Listening ${icon('external')}</a>` : ''}
            ${exam.sources?.rcPdf ? `<a class="btn btn-secondary" href="${fileURL(exam.sources.rcPdf.id)}" target="_blank" rel="noopener noreferrer">PDF Reading ${icon('external')}</a>` : ''}
            ${exam.sources?.answerKeyLc ? `<a class="btn btn-secondary" href="${fileURL(exam.sources.answerKeyLc.id)}" target="_blank" rel="noopener noreferrer">Khóa LC ${icon('external')}</a>` : ''}
            ${exam.sources?.answerKeyRc ? `<a class="btn btn-secondary" href="${fileURL(exam.sources.answerKeyRc.id)}" target="_blank" rel="noopener noreferrer">Khóa RC ${icon('external')}</a>` : ''}
          </div>
        </section>
      </div>`;
    };

    if (!loaded) {
      void ensureLoaded().then(() => {
        if ($('#main')) $('#main').innerHTML = renderPrep();
      });
      return '<div class="loading"><span class="spinner"></span>Đang chuẩn bị đề thi…</div>';
    }
    return renderPrep();
  }

  async function startExamSession(examId, mode, scopeValue, limitMinutes = 0) {
    await ensureLoaded();
    const exam = catalog.find((e) => e.id === examId);
    if (!exam) return toast('Không tìm thấy đề thi.');

    let scopeType = 'full';
    let scopeParts = [1, 2, 3, 4, 5, 6, 7];
    if (scopeValue === 'lc') {
      scopeType = 'skill';
      scopeParts = [1, 2, 3, 4];
    } else if (scopeValue === 'rc') {
      scopeType = 'skill';
      scopeParts = [5, 6, 7];
    } else if (scopeValue && scopeValue.startsWith('p')) {
      scopeType = 'part';
      scopeParts = [Number(scopeValue.slice(1))];
    }

    const { content } = await api('exams/' + encodeURIComponent(examId));
    if (!content) return toast('Đề này chưa có dữ liệu câu hỏi tương tác.');

    let attempt;
    if (signedIn) {
      const res = await api('exam-attempts', 'POST', { examId, mode, scopeType, scopeParts, limitMinutes });
      attempt = res.attempt;
      attempt.scope_parts = JSON.parse(attempt.scope_parts || JSON.stringify(scopeParts));
      attempt.answers = {};
      attempt.flags = [];
      attempt.timing = {};
    } else {
      const nowMs = Date.now();
      const now = new Date(nowMs).toISOString();
      const deadlineAt =
        mode === 'simulation'
          ? new Date(nowMs + (scopeParts.some((p) => p <= 4) ? 45 : 75) * 60 * 1000).toISOString()
          : limitMinutes > 0
            ? new Date(nowMs + limitMinutes * 60 * 1000).toISOString()
            : null;

      attempt = {
        attempt_id: 'guest_' + crypto.randomUUID(),
        exam_id: examId,
        version_id: exam.versionId,
        mode,
        scope_type: scopeType,
        scope_parts: scopeParts,
        status: 'in_progress',
        current_section: scopeParts.some((p) => p <= 4) ? 'listening' : 'reading',
        started_at: now,
        deadline_at: deadlineAt,
        revision: 1,
        answers: {},
        flags: [],
        timing: {},
        guest: true
      };
    }

    const filteredGroups = content.groups.filter((g) => scopeParts.includes(g.part));
    const filteredQuestions = content.questions.filter((q) => scopeParts.includes(q.part));
    activeRun = {
      attempt,
      exam,
      content: { groups: filteredGroups, questions: filteredQuestions },
      groupIndex: 0,
      mobilePane: 'content',
      saveStatus: 'Đã lưu',
      checkCache: {},
      saveTimer: null,
      timerHandle: null,
      showPdfDrawer: false,
      hasConflict: false
    };
    saveRunLocalDraft();
    location.hash = '#exam-run?attempt=' + encodeURIComponent(attempt.attempt_id);
  }

  function saveRunLocalDraft() {
    if (!activeRun) return;
    const drafts = readLocal(LOCAL_DRAFTS_KEY, {});
    drafts[activeRun.attempt.attempt_id] = {
      attempt: activeRun.attempt,
      savedAt: new Date().toISOString()
    };
    writeLocal(LOCAL_DRAFTS_KEY, drafts);
  }

  function updateSaveStatusUI(text, cls = '') {
    const el = $('#exam-save-pill');
    if (!el) return;
    el.textContent = text;
    el.className = 'exam-save-pill ' + cls;
  }

  function scheduleServerSync() {
    if (!activeRun) return;
    saveRunLocalDraft();
    if (!signedIn || activeRun.attempt.guest) {
      updateSaveStatusUI('Đã lưu trên trình duyệt', 'saved');
      return;
    }
    updateSaveStatusUI('Đang lưu…');
    clearTimeout(activeRun.saveTimer);
    activeRun.saveTimer = setTimeout(async () => {
      if (!activeRun || activeRun.attempt.status !== 'in_progress') return;
      try {
        const res = await api('exam-attempts/' + encodeURIComponent(activeRun.attempt.attempt_id), 'PATCH', {
          revision: activeRun.attempt.revision,
          answers: activeRun.attempt.answers,
          flags: activeRun.attempt.flags,
          timing: activeRun.attempt.timing || {}
        });
        activeRun.attempt.revision = res.revision;
        activeRun.hasConflict = false;
        saveRunLocalDraft();
        updateSaveStatusUI('Đã lưu lên tài khoản', 'saved');
      } catch (err) {
        if (err.status === 409 && err.code === 'DEADLINE_EXPIRED') {
          activeRun.attempt.status = 'locked_offline';
          saveRunLocalDraft();
          updateSaveStatusUI('Hết giờ — chờ nộp', 'error');
        } else if (err.status === 409) {
          activeRun.hasConflict = true;
          updateSaveStatusUI('Xung đột đồng bộ', 'error');
          if ($('#exam-run-layout')) {
            $('#main').innerHTML = renderRunShell();
          }
        } else {
          updateSaveStatusUI('Mất mạng — đã lưu cục bộ', 'error');
        }
      }
    }, 350);
  }

  function renderGroupContent() {
    if (!activeRun) return '';
    const grp = activeRun.content.groups[activeRun.groupIndex];
    if (!grp) return '';
    const qs = activeRun.content.questions.filter((q) => q.groupId === grp.id);
    const pdfId = grp.sourceId;

    return `<article class="exam-group-card">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap">
        <div>
          <span class="exam-badge">Part ${grp.part} · Câu ${grp.startQ}${grp.endQ > grp.startQ ? '–' + grp.endQ : ''}</span>
          ${grp.title ? `<h2 style="margin:6px 0 0;font-size:18px">${esc(grp.title)}</h2>` : ''}
        </div>
        <div style="display:flex;gap:6px">
          ${pdfId ? `<a class="text-button" href="${fileURL(pdfId)}" target="_blank" rel="noopener noreferrer">PDF trang ${grp.sourcePage || 1} ${icon('external')}</a>` : ''}
          <button type="button" class="btn btn-sm btn-secondary" data-exam-toggle-pdf>${icon('book')} ${activeRun.showPdfDrawer ? 'Đóng PDF' : 'Mở PDF'}</button>
        </div>
      </div>
      ${grp.visual?.kind === 'photo-scene' ? renderPart1SceneSvg(grp.visual) : ''}
      ${grp.visual?.kind === 'table' ? `<table class="exam-table"><caption>${esc(grp.visual.title)}</caption><thead><tr>${grp.visual.headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${grp.visual.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>` : ''}
      ${grp.passage ? `<div class="exam-passage">${esc(grp.passage)}</div>` : ''}
      ${qs.map((q) => {
        const chosen = activeRun.attempt.answers[q.id];
        const flagged = activeRun.attempt.flags.includes(q.id);
        const checked = activeRun.checkCache[q.id];
        return `<div class="exam-question-block" data-q-id="${esc(q.id)}">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
            <strong>${esc(q.prompt)}</strong>
            <div style="display:flex;gap:6px">
              <button type="button" class="btn btn-secondary" data-exam-flag="${esc(q.id)}" aria-pressed="${flagged}">${flagged ? '★ Đã đánh dấu' : '☆ Đánh dấu'}</button>
              ${activeRun.attempt.mode === 'practice' ? `<button type="button" class="btn btn-soft" data-exam-check="${esc(q.id)}">Kiểm tra</button>` : ''}
            </div>
          </div>
          <div class="exam-options" role="radiogroup" aria-label="Đáp án câu ${q.number}">
            ${q.options.map((opt, idx) => {
              const letter = ['A', 'B', 'C', 'D'][idx];
              const isSel = chosen === idx;
              return `<button type="button" class="exam-option-btn ${isSel ? 'selected' : ''}" data-exam-choose="${esc(q.id)}" data-idx="${idx}" aria-pressed="${isSel}">
                <span>(${letter})</span>
                ${q.part === 2 ? '' : `<span>${esc(opt)}</span>`}
              </button>`;
            }).join('')}
          </div>
          ${checked ? `<div class="review-feedback ${chosen === checked.answer ? 'correct' : 'wrong'}">
            <strong>Đáp án đúng: (${['A', 'B', 'C', 'D'][checked.answer]}) · ${checked.reviewStatus === 'draft' ? 'Gợi ý nháp' : 'Đã duyệt'}</strong>
            <p style="margin:4px 0">${esc(checked.explanation)}</p>
            ${checked.evidence ? `<div class="review-evidence"><strong>Căn cứ:</strong> ${esc(checked.evidence)}</div>` : ''}
            ${checked.transcript ? `<details style="margin-top:6px"><summary>Transcript</summary><pre style="white-space:pre-wrap;font:inherit">${esc(checked.transcript)}</pre></details>` : ''}
          </div>` : ''}
        </div>`;
      }).join('')}
      <div style="display:flex;justify-content:space-between;margin-top:18px;gap:8px">
        <button type="button" class="btn btn-secondary" data-exam-prev-group ${activeRun.groupIndex === 0 ? 'disabled' : ''}>${icon('back')}Nhóm trước</button>
        <button type="button" class="btn btn-primary" data-exam-next-group ${activeRun.groupIndex >= activeRun.content.groups.length - 1 ? 'disabled' : ''}>Nhóm tiếp ${icon('arrow')}</button>
      </div>
    </article>`;
  }

  function renderPalette() {
    if (!activeRun) return '';
    const currentGrp = activeRun.content.groups[activeRun.groupIndex];
    const currentQIds = new Set(activeRun.content.questions.filter((q) => q.groupId === currentGrp?.id).map((q) => q.id));
    const answeredCount = Object.keys(activeRun.attempt.answers).length;
    return `<div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <strong>Phiếu trả lời</strong>
        <small>${answeredCount}/${activeRun.content.questions.length} câu</small>
      </div>
      <div class="exam-palette-grid">
        ${activeRun.content.questions
          .map((q) => {
            const ans = activeRun.attempt.answers[q.id] !== undefined;
            const flag = activeRun.attempt.flags.includes(q.id);
            const cur = currentQIds.has(q.id);
            return `<button type="button" class="exam-palette-btn ${ans ? 'answered' : ''} ${flag ? 'flagged' : ''} ${cur ? 'current' : ''}" data-exam-jump-q="${esc(q.id)}" aria-label="Câu ${q.number}${ans ? ' đã trả lời' : ''}${flag ? ' đã đánh dấu' : ''}">${q.number}</button>`;
          })
          .join('')}
      </div>
      ${activeRun.attempt.mode === 'simulation' && activeRun.attempt.current_section === 'listening'
        ? `<button type="button" class="btn btn-secondary" style="width:100%;margin-bottom:8px" data-exam-to-reading>Chuyển sang Reading (75p)</button>`
        : ''}
      <button type="button" class="btn btn-primary" style="width:100%" data-exam-submit>${icon('check')}Nộp bài & chấm điểm</button>
    </div>`;
  }

  function renderRunShell() {
    const { attempt, exam } = activeRun;
    const tState = computeTimerState(attempt);
    const hasAudio = activeRun.content.groups.some((g) => g.part <= 4) && exam.sources?.audio;
    const curGrp = activeRun.content.groups[activeRun.groupIndex];
    const pdfSourceId = curGrp?.sourceId || exam.sources?.lcPdf?.id || exam.sources?.rcPdf?.id;

    return `<div class="exam-run-topbar">
      <div>
        <strong>${esc(exam.title)}</strong>
        <span class="exam-badge">${attempt.mode === 'simulation' ? 'Thi mô phỏng · ' + (attempt.current_section === 'listening' ? 'Listening' : 'Reading') : 'Tự luyện'}</span>
      </div>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <span id="exam-save-pill" class="exam-save-pill">${esc(activeRun.saveStatus)}</span>
        <strong id="exam-timer-display">${icon('clock')} ${esc(tState.label)}</strong>
        <button type="button" class="btn btn-secondary" data-exam-toggle-pdf>${icon('book')} ${activeRun.showPdfDrawer ? 'Đóng PDF đối chiếu' : 'Xem PDF đối chiếu'}</button>
        <a class="btn btn-secondary" href="#exam?id=${encodeURIComponent(exam.id)}">Thoát</a>
      </div>
    </div>
    ${activeRun.hasConflict ? `<div class="exam-conflict-banner">
      <span>${icon('alert')} Phiên làm bài đã được cập nhật từ thiết bị hoặc tab khác.</span>
      <button type="button" class="btn btn-sm btn-primary" data-exam-reload-attempt>Tải lại phiên từ máy chủ</button>
    </div>` : ''}
    ${activeRun.showPdfDrawer && pdfSourceId ? `<div class="exam-pdf-drawer">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 14px;background:var(--surface-alt);border-bottom:1px solid var(--border)">
        <strong>Tài liệu đề gốc để đối chiếu trực tiếp</strong>
        <button type="button" class="btn btn-sm btn-secondary" data-exam-toggle-pdf>Đóng</button>
      </div>
      <iframe src="${previewURL(pdfSourceId)}" title="Bản PDF đối chiếu" allow="fullscreen"></iframe>
    </div>` : ''}
    ${hasAudio ? `<div class="exam-audio-dock" id="exam-audio-dock">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <strong>Audio phòng thi: ${esc(exam.sources.audio.name)}</strong>
        <a class="text-button" href="${fileURL(exam.sources.audio.id)}" target="_blank" rel="noopener noreferrer">Mở Drive ${icon('external')}</a>
      </div>
      <iframe src="${previewURL(exam.sources.audio.id)}" title="Audio đề thi" style="width:100%;height:72px;border:0;border-radius:8px" allow="autoplay"></iframe>
    </div>` : ''}
    <div class="exam-mobile-tabs">
      <button type="button" class="btn ${activeRun.mobilePane === 'content' ? 'btn-primary' : 'btn-secondary'}" data-exam-mobile-pane="content">Nội dung đề</button>
      <button type="button" class="btn ${activeRun.mobilePane === 'sheet' ? 'btn-primary' : 'btn-secondary'}" data-exam-mobile-pane="sheet">Phiếu trả lời</button>
    </div>
    <div class="exam-run-layout" id="exam-run-layout" data-mobile-pane="${activeRun.mobilePane}">
      <div class="exam-content-pane" id="exam-content-pane">${renderGroupContent()}</div>
      <aside class="exam-palette-panel" id="exam-palette-panel">${renderPalette()}</aside>
    </div>`;
  }

  function startRunTimer() {
    stopRunTimer();
    if (!activeRun) return;
    activeRun.timerHandle = setInterval(() => {
      if (!activeRun) return stopRunTimer();
      // Track active interaction time excluding background tab periods
      if (!document.hidden) {
        const curGrp = activeRun.content.groups[activeRun.groupIndex];
        if (curGrp) {
          activeRun.attempt.timing[curGrp.part] = (activeRun.attempt.timing[curGrp.part] || 0) + 1;
        }
      }
      if (!activeRun.attempt.deadline_at) return;
      const st = computeTimerState(activeRun.attempt);
      const el = $('#exam-timer-display');
      if (el) el.innerHTML = `${icon('clock')} ${esc(st.label)}`;
      if (st.expired) {
        stopRunTimer();
        if (activeRun.attempt.mode === 'simulation' && activeRun.attempt.current_section === 'listening') {
          void transitionToReading(true);
        } else {
          activeRun.attempt.status = 'locked_offline';
          saveRunLocalDraft();
          updateSaveStatusUI('Hết giờ — đang nộp bài…', 'error');
          void submitCurrentExam(true);
        }
      }
    }, 1000);
  }

  function examRunPage(params) {
    const attemptId = params.get('attempt');
    if (!activeRun || (attemptId && activeRun.attempt.attempt_id !== attemptId)) {
      if (attemptId) {
        void (async () => {
          await ensureLoaded();
          let loadedAttempt = null;
          if (signedIn) {
            const res = await api('exam-attempts/' + encodeURIComponent(attemptId)).catch(() => null);
            loadedAttempt = res?.attempt;
          }
          if (!loadedAttempt) {
            const local = readLocal(LOCAL_DRAFTS_KEY, {})[attemptId];
            loadedAttempt = local?.attempt;
          }
          if (!loadedAttempt) {
            $('#main').innerHTML = `<div class="empty"><h3>Không tìm thấy phiên làm bài</h3><a class="btn btn-primary" href="#exams">Về kho đề</a></div>`;
            return;
          }
          const exam = catalog.find((e) => e.id === loadedAttempt.exam_id);
          const { content } = await api('exams/' + encodeURIComponent(loadedAttempt.exam_id));
          const scopeParts = loadedAttempt.scope_parts || [1, 2, 3, 4, 5, 6, 7];
          activeRun = {
            attempt: loadedAttempt,
            exam,
            content: {
              groups: content.groups.filter((g) => scopeParts.includes(g.part)),
              questions: content.questions.filter((q) => scopeParts.includes(q.part))
            },
            groupIndex: 0,
            mobilePane: 'content',
            saveStatus: 'Đã khôi phục phiên',
            checkCache: {},
            saveTimer: null,
            timerHandle: null,
            showPdfDrawer: false,
            hasConflict: false
          };
          if ($('#main')) $('#main').innerHTML = renderRunShell();
          startRunTimer();
        })();
        return '<div class="loading"><span class="spinner"></span>Đang khôi phục phiên thi…</div>';
      }
      return `<div class="empty"><h3>Chưa mở phiên thi</h3><a class="btn btn-primary" href="#exams">Chọn đề thi</a></div>`;
    }
    setTimeout(startRunTimer, 0);
    return renderRunShell();
  }

  async function transitionToReading(auto = false) {
    if (!activeRun) return;
    if (!auto && !confirm('Chuyển sang phần Reading (75 phút)? Bạn sẽ không quay lại phần Listening trong lượt thi mô phỏng này.')) {
      return;
    }
    if (signedIn && !activeRun.attempt.guest) {
      const res = await api(`exam-attempts/${encodeURIComponent(activeRun.attempt.attempt_id)}/transition`, 'POST', {});
      activeRun.attempt.current_section = res.currentSection;
      activeRun.attempt.deadline_at = res.deadlineAt;
      activeRun.attempt.revision = res.revision;
    } else {
      activeRun.attempt.current_section = 'reading';
    }
    const firstRcIdx = activeRun.content.groups.findIndex((g) => g.part >= 5);
    if (firstRcIdx >= 0) activeRun.groupIndex = firstRcIdx;
    saveRunLocalDraft();
    $('#main').innerHTML = renderRunShell();
    startRunTimer();
  }

  async function submitCurrentExam(forced = false) {
    if (!activeRun) return;
    const total = activeRun.content.questions.length;
    const answered = Object.keys(activeRun.attempt.answers).length;
    if (!forced && answered < total && !confirm(`Bạn mới trả lời ${answered}/${total} câu. Nộp bài ngay?`)) {
      return;
    }
    stopRunTimer();
    if (signedIn && !activeRun.attempt.guest) {
      try {
        const res = await api(`exam-attempts/${encodeURIComponent(activeRun.attempt.attempt_id)}/submit`, 'POST', {
          answers: activeRun.attempt.answers,
          flags: activeRun.attempt.flags,
          timing: activeRun.attempt.timing || {}
        });
        activeResult = res.result;
        await refreshAccountExamData();
        const drafts = readLocal(LOCAL_DRAFTS_KEY, {});
        delete drafts[activeRun.attempt.attempt_id];
        writeLocal(LOCAL_DRAFTS_KEY, drafts);
        activeRun = null;
        location.hash = '#exam-result?id=' + encodeURIComponent(activeResult.attemptId);
      } catch {
        activeRun.attempt.status = 'locked_offline';
        saveRunLocalDraft();
        updateSaveStatusUI('Mất kết nối — phiên đã khóa chờ gửi', 'error');
        toast('Chưa gửi được bài do mất mạng. Bài làm đã được khóa cục bộ, bấm Nộp bài lại khi có mạng.');
      }
    } else {
      try {
        const res = await api(`exams/${encodeURIComponent(activeRun.exam.id)}/grade`, 'POST', {
          attemptId: activeRun.attempt.attempt_id,
          mode: activeRun.attempt.mode,
          scopeType: activeRun.attempt.scope_type,
          scopeParts: activeRun.attempt.scope_parts,
          startedAt: activeRun.attempt.started_at,
          answers: activeRun.attempt.answers,
          flags: activeRun.attempt.flags,
          timing: activeRun.attempt.timing || {}
        });
        activeResult = res.result;
        const localResults = readLocal(LOCAL_RESULTS_KEY, []);
        localResults.unshift(activeResult);
        writeLocal(LOCAL_RESULTS_KEY, localResults.slice(0, 50));
        results = localResults;
        const drafts = readLocal(LOCAL_DRAFTS_KEY, {});
        delete drafts[activeRun.attempt.attempt_id];
        writeLocal(LOCAL_DRAFTS_KEY, drafts);
        activeRun = null;
        location.hash = '#exam-result?id=' + encodeURIComponent(activeResult.attemptId);
        toast('Đã nộp bài và chấm điểm thành công.');
      } catch (err) {
        toast('Lỗi khi chấm điểm: ' + (err.message || 'Không thể gửi bài'));
      }
    }
  }

  function examResultPage(params) {
    const id = params.get('id');
    if (!activeResult || (id && activeResult.attemptId !== id)) {
      if (id && signedIn) {
        void api('exam-attempts/' + encodeURIComponent(id))
          .then((res) => {
            if (res.result) {
              activeResult = res.result;
              if ($('#main')) $('#main').innerHTML = renderResultView(activeResult);
            }
          })
          .catch(() => {});
        return '<div class="loading"><span class="spinner"></span>Đang tải kết quả…</div>';
      }
      const localResults = readLocal(LOCAL_RESULTS_KEY, []);
      const matched = localResults.find((r) => r.attemptId === id);
      if (matched) {
        activeResult = matched;
        return renderResultView(activeResult);
      }
      return `<div class="empty"><h3>Chưa có kết quả</h3><a class="btn btn-primary" href="#exams">Về kho đề</a></div>`;
    }
    return renderResultView(activeResult);
  }

  function renderResultView(r) {
    const sc = r.score;
    const grpMap = new Map((r.groups || []).map((g) => [g.id, g]));
    const exam = catalog.find((e) => e.id === r.examId);
    const hasLC = (r.questions || []).some((q) => q.part <= 4);

    return `${heading(
      `Kết quả · ${esc(r.examTitle || r.examId)}`,
      `${r.mode === 'simulation' ? 'Thi mô phỏng' : 'Tự luyện'} · Đúng ${sc.correct}/${sc.total} (${sc.percent}%) · Sai ${sc.wrong} · Bỏ trống ${sc.blank}`,
      `<div style="display:flex;gap:8px;flex-wrap:wrap">
        <a class="btn btn-primary" href="#exam-review-run?filter=wrong">${icon('play')}Mở buổi ôn câu sai ngay</a>
        <a class="btn btn-secondary" href="#exam-review?exam=${encodeURIComponent(r.examId)}">Sổ lỗi sai</a>
        <a class="btn btn-secondary" href="#exams">Kho đề</a>
      </div>`
    )}
    ${hasLC && exam?.sources?.audio ? `<div class="exam-audio-dock" style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <strong>Audio đề thi để nghe lại: ${esc(exam.sources.audio.name)}</strong>
        <a class="text-button" href="${fileURL(exam.sources.audio.id)}" target="_blank" rel="noopener noreferrer">Mở Drive ${icon('external')}</a>
      </div>
      <iframe src="${previewURL(exam.sources.audio.id)}" title="Audio nghe lại" style="width:100%;height:72px;border:0;border-radius:8px"></iframe>
    </div>` : ''}
    <div class="stat-grid" style="margin-bottom:18px">
      ${Object.values(sc.byPart || {})
        .filter((p) => p.total > 0)
        .map((p) => `<div class="stat"><div><strong>Part ${p.part}: ${p.correct}/${p.total}</strong><small>Sai ${p.wrong} · Trống ${p.blank}</small></div></div>`)
        .join('')}
    </div>
    <div class="video-list">
      ${(r.questions || [])
        .map((q, idx) => {
          const resItem = sc.results?.[idx] || {};
          const grp = grpMap.get(q.groupId);
          const statusLabel = resItem.correct ? 'Đúng' : resItem.answered ? 'Sai' : 'Bỏ trống';
          const statusCls = resItem.correct ? 'full' : resItem.answered ? 'warn' : 'reference';
          const revItem = reviewItems.find((x) => x.question_id === q.id);
          const itemNote = revItem?.note || '';
          return `<article class="exam-group-card" style="margin-bottom:14px">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
              <strong>Câu ${q.number} (Part ${q.part})</strong>
              <div style="display:flex;gap:6px">
                <span class="exam-badge ${statusCls}">${statusLabel}</span>
                <span class="exam-badge">${q.reviewStatus === 'draft' ? 'Bản nháp' : 'Đã duyệt'}</span>
              </div>
            </div>
            ${grp?.passage ? `<details style="margin:8px 0"><summary>Xem đoạn đọc gốc</summary><div class="exam-passage">${esc(grp.passage)}</div></details>` : ''}
            <p>${esc(q.prompt)}</p>
            <p class="fine-print">Bạn chọn: <strong>${resItem.answered ? ['A', 'B', 'C', 'D'][resItem.chosen] : 'Bỏ trống'}</strong> · Đáp án đúng: <strong>${['A', 'B', 'C', 'D'][q.answer]}</strong></p>
            <p>${esc(q.explanation || '')}</p>
            ${q.evidence ? `<div class="review-evidence"><strong>Căn cứ:</strong> ${esc(q.evidence)}</div>` : ''}
            ${q.transcript ? `<details style="margin:8px 0"><summary>Transcript</summary><pre style="white-space:pre-wrap;font:inherit">${esc(q.transcript)}</pre></details>` : ''}
            <details class="learning-note" style="margin-top:10px" ${itemNote ? 'open' : ''}>
              <summary>Ghi chú cá nhân (${itemNote ? 'Có ghi chú' : 'Thêm ghi chú'})</summary>
              <div style="margin-top:8px">
                <div class="tag-chips">
                  ${EXAM_NOTE_TAGS.map((t) => `<button type="button" class="tag-chip" data-insert-tag="${esc(t)}" data-target-note="res-${esc(q.id)}">${esc(t)}</button>`).join('')}
                </div>
                <textarea id="note-res-${esc(q.id)}" rows="2" class="field" style="width:100%;margin:8px 0" placeholder="Ghi chú từ mới, quy tắc hay bẫy câu này…">${esc(itemNote)}</textarea>
                <button type="button" class="btn btn-sm btn-primary" data-exam-save-result-note="${esc(q.id)}" data-exam-id="${esc(r.examId)}">Lưu ghi chú</button>
              </div>
            </details>
            <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
              <button type="button" class="btn btn-soft" data-exam-mark-uncertain="${esc(q.id)}" data-exam-id="${esc(r.examId)}">Đánh dấu chưa hiểu</button>
              <button type="button" class="btn btn-secondary" data-exam-report-btn="${esc(q.id)}" data-q-num="${q.number}" data-q-ver="${esc(r.versionId)}">${icon('flag')}Báo lỗi nội dung</button>
              ${q.relatedLessonId ? `<a class="btn btn-soft" href="#learn?id=${encodeURIComponent(q.relatedLessonId)}">${icon('book')}Bài học liên quan</a>` : ''}
            </div>
          </article>`;
        })
        .join('')}
    </div>
    ${renderReportModal()}`;
  }

  function renderReportModal() {
    if (!activeReportTarget) return '';
    return `<div class="report-modal-overlay" id="report-modal-overlay">
      <div class="report-modal" role="dialog" aria-modal="true" aria-labelledby="report-modal-title">
        <h3 id="report-modal-title" style="margin-top:0">Báo lỗi câu hỏi ${esc(activeReportTarget.questionNum || activeReportTarget.questionId)}</h3>
        <p class="fine-print">Phản hồi của bạn sẽ được lưu vào hệ thống kiểm định và gửi trực tiếp tới đội biên tập.</p>
        <label class="form-field" style="margin:12px 0">Loại lỗi
          <select id="report-reason" class="field">
            <option value="answer">Sai đáp án chính thức</option>
            <option value="question">Sai đề / lỗi chính tả / thiếu từ</option>
            <option value="explanation">Lời giải thích chưa chuẩn / thiếu căn cứ</option>
            <option value="source">Lệch file audio / transcript / trang tài liệu</option>
            <option value="other">Khác</option>
          </select>
        </label>
        <label class="form-field" style="margin-bottom:16px">Chi tiết lỗi
          <textarea id="report-detail" rows="3" placeholder="Mô tả cụ thể để biên tập viên kiểm tra lại…" class="field"></textarea>
        </label>
        <div style="display:flex;justify-content:flex-end;gap:8px">
          <button type="button" class="btn btn-secondary" data-report-cancel>Hủy</button>
          <button type="button" class="btn btn-primary" data-report-submit>Gửi báo lỗi</button>
        </div>
      </div>
    </div>`;
  }

  function renderReviewView(params) {
    const filterPart = params.get('part') || 'all';
    const filterExam = params.get('exam') || 'all';
    const filterType = params.get('type') || 'all';
    const filtered = reviewItems.filter(
      (i) =>
        (filterPart === 'all' || String(i.part) === String(filterPart)) &&
        (filterExam === 'all' || i.exam_id === filterExam) &&
        (filterType === 'all' || i.source_type === filterType)
    );
    return `${heading(
      'Sổ lỗi sai & Lịch ôn',
      'Tập hợp câu sai, bỏ trống và câu đánh dấu chưa hiểu để ôn lại theo ngữ cảnh nhóm câu gốc.',
      `<div style="display:flex;gap:8px;flex-wrap:wrap">
        <a class="btn btn-primary" href="#exam-review-run?filter=${filterType}&part=${filterPart}">${icon('play')}Bắt đầu buổi ôn (${filtered.length} câu)</a>
        <a class="btn btn-secondary" href="#exams">${icon('back')}Kho đề</a>
      </div>`
    )}
    <div class="exam-filters" style="max-width:520px">
      <select id="review-filter-part" aria-label="Lọc Part">
        <option value="all" ${filterPart === 'all' ? 'selected' : ''}>Tất cả Part</option>
        ${PART_SPECS.map((p) => `<option value="${p.part}" ${String(filterPart) === String(p.part) ? 'selected' : ''}>Part ${p.part}</option>`).join('')}
      </select>
      <select id="review-filter-type" aria-label="Lọc loại lỗi">
        <option value="all" ${filterType === 'all' ? 'selected' : ''}>Tất cả loại</option>
        <option value="wrong" ${filterType === 'wrong' ? 'selected' : ''}>Làm sai</option>
        <option value="blank" ${filterType === 'blank' ? 'selected' : ''}>Bỏ trống</option>
        <option value="uncertain" ${filterType === 'uncertain' ? 'selected' : ''}>Chưa hiểu</option>
      </select>
    </div>
    <p class="result-summary">${filtered.length} câu cần ôn</p>
    ${filtered.length ? `<div class="video-list">${filtered
      .map(
        (item) => `<article class="exam-group-card" style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <strong>${esc(item.question_id)} · Part ${item.part} (${esc(item.skill_tag || 'tổng hợp')})</strong>
            <span class="exam-badge">${item.source_type === 'blank' ? 'Bỏ trống' : item.source_type === 'uncertain' ? 'Chưa hiểu' : 'Làm sai'}</span>
          </div>
          <p class="fine-print" style="margin:6px 0 0">Lịch ôn tiếp: ${new Date(item.next_review_at).toLocaleDateString('vi-VN')} · Đã ôn ${item.review_count} lần</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
            <select data-review-reason="${esc(item.review_id)}" aria-label="Lý do sai">
              <option value="">Chọn lý do sai…</option>
              ${Object.entries(EXAM_ERROR_REASONS).map(([k, v]) => `<option value="${k}" ${item.reason === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}
            </select>
            ${[1, 3, 7].map((d) => `<button type="button" class="btn btn-soft" data-review-done="${esc(item.review_id)}" data-days="${d}">Ôn lại sau ${d} ngày</button>`).join('')}
            <button type="button" class="btn btn-secondary" data-review-mastered="${esc(item.review_id)}">Đã nắm vững</button>
          </div>
        </article>`
      )
      .join('')}</div>` : `<div class="empty">${icon('check')}<h3>Chưa có câu cần ôn</h3><p>Làm một đề hoặc đánh dấu câu chưa hiểu để tạo lịch ôn tại đây.</p></div>`}`;
  }

  function examReviewPage(params) {
    void (async () => {
      await ensureLoaded();
      await refreshAccountExamData();
      if ($('#main') && location.hash.slice(1).split('?')[0] === 'exam-review') {
        $('#main').innerHTML = renderReviewView(params);
      }
    })();
    if (!loaded) return '<div class="loading"><span class="spinner"></span>Đang tải sổ lỗi sai…</div>';
    return renderReviewView(params);
  }

  function examReviewRunPage(params) {
    const filter = params.get('filter') || 'all';
    const part = params.get('part') || 'all';

    const renderRun = () => {
      if (!reviewSession || reviewSession.filter !== filter || reviewSession.part !== part) {
        return '<div class="loading"><span class="spinner"></span>Đang chuẩn bị buổi ôn tập…</div>';
      }
      if (!reviewSession.items.length) {
        return `<div class="empty">${icon('check')}<h3>Không có câu hỏi cần ôn trong danh mục này</h3><p>Tuyệt vời! Bạn không có câu hỏi nào thuộc danh mục này.</p><a class="btn btn-primary" href="#exam-review">Quay lại sổ lỗi sai</a></div>`;
      }
      const cur = reviewSession.items[reviewSession.index];
      const q = cur.question;
      const grp = cur.group;
      const checked = reviewSession.checked[q.id];
      const userChoice = reviewSession.userChoices[q.id];

      return `<div class="review-run-topbar">
        <div>
          <strong>Buổi ôn tập câu sai TOEIC</strong>
          <span class="exam-badge">Câu ${reviewSession.index + 1} / ${reviewSession.items.length} · Part ${q.part}</span>
        </div>
        <div style="display:flex;gap:8px">
          <a class="btn btn-secondary" href="#exam-review">${icon('back')}Thoát buổi ôn</a>
        </div>
      </div>
      <div class="review-run-layout">
        <section class="exam-group-card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <span class="exam-badge">Ngữ cảnh: Part ${q.part}</span>
            <small class="fine-print">Nhóm câu gốc</small>
          </div>
          ${grp?.visual?.kind === 'photo-scene' ? renderPart1SceneSvg(grp.visual) : ''}
          ${grp?.visual?.kind === 'table' ? `<table class="exam-table"><caption>${esc(grp.visual.title)}</caption><thead><tr>${grp.visual.headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${grp.visual.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>` : ''}
          ${grp?.passage ? `<div class="exam-passage">${esc(grp.passage)}</div>` : ''}
          ${checked?.transcript ? `<div class="exam-passage" style="margin-top:10px;background:#fdf4ff;border-color:#e879f9"><strong>Transcript audio:</strong><p style="margin:4px 0 0">${esc(checked.transcript)}</p></div>` : ''}
        </section>
        <section class="panel">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
            <strong>Câu ${q.number}: ${esc(q.prompt)}</strong>
          </div>
          <div class="exam-options" style="margin:14px 0">
            ${q.options.map((opt, idx) => {
              const letter = ['A', 'B', 'C', 'D'][idx];
              const isSel = userChoice === idx;
              return `<button type="button" class="exam-option-btn ${isSel ? 'selected' : ''}" data-review-choose="${idx}" ${checked ? 'disabled' : ''}>
                <span>(${letter})</span>
                ${q.part === 2 ? '' : `<span>${esc(opt)}</span>`}
              </button>`;
            }).join('')}
          </div>
          ${!checked ? `<button type="button" class="btn btn-primary" style="width:100%" data-review-check-q ${userChoice === undefined ? 'disabled' : ''}>Kiểm tra đáp án</button>` : ''}
          ${checked ? `<div class="review-feedback ${checked.correct ? 'correct' : 'wrong'}">
            <strong>${checked.correct ? '✓ Bạn làm đúng!' : '✗ Chưa chính xác!'} (Đáp án đúng: ${['A', 'B', 'C', 'D'][checked.correctAnswer]})</strong>
            <p style="margin:6px 0">${esc(checked.explanation)}</p>
            ${checked.evidence ? `<div class="review-evidence"><strong>Căn cứ:</strong> ${esc(checked.evidence)}</div>` : ''}
            <div style="margin-top:12px">
              <label class="fine-print">Lý do sai / lưu ý:</label>
              <select data-review-save-reason="${esc(cur.reviewId)}" class="field" style="width:100%;margin:4px 0 8px">
                <option value="">Chọn lý do sai…</option>
                ${Object.entries(EXAM_ERROR_REASONS).map(([k, v]) => `<option value="${k}" ${cur.item?.reason === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}
              </select>
              <div class="tag-chips">
                ${EXAM_NOTE_TAGS.map((t) => `<button type="button" class="tag-chip" data-insert-tag="${esc(t)}" data-target-note="rev-${esc(cur.reviewId)}">${esc(t)}</button>`).join('')}
              </div>
              <textarea id="note-rev-${esc(cur.reviewId)}" rows="2" class="field" style="width:100%;margin:6px 0" placeholder="Ghi chú cá nhân…">${esc(cur.item?.note || '')}</textarea>
              <button type="button" class="btn btn-sm btn-secondary" data-review-save-note="${esc(cur.reviewId)}">Lưu ghi chú</button>
            </div>
            <div style="margin-top:14px;border-top:1px solid var(--border);padding-top:10px">
              <p class="fine-print" style="margin-bottom:6px">Lên lịch ôn tập:</p>
              <div style="display:flex;gap:6px;flex-wrap:wrap">
                ${[1, 3, 7].map((d) => `<button type="button" class="btn btn-soft" data-review-reschedule="${d}" data-review-id="${esc(cur.reviewId)}">Ôn lại sau ${d} ngày</button>`).join('')}
                <button type="button" class="btn btn-secondary" data-review-master-session="${esc(cur.reviewId)}">Đã nắm vững</button>
              </div>
            </div>
            ${q.relatedLessonId ? `<div style="margin-top:12px"><a class="btn btn-soft" href="#learn?id=${encodeURIComponent(q.relatedLessonId)}" target="_blank">${icon('book')}Học bài lý thuyết liên quan</a></div>` : ''}
          </div>` : ''}
          <div style="display:flex;justify-content:space-between;margin-top:18px;gap:8px">
            <button type="button" class="btn btn-secondary" data-review-prev-q ${reviewSession.index === 0 ? 'disabled' : ''}>${icon('back')}Câu trước</button>
            ${reviewSession.index < reviewSession.items.length - 1
              ? `<button type="button" class="btn btn-primary" data-review-next-q>Câu tiếp ${icon('arrow')}</button>`
              : `<a class="btn btn-primary" href="#exam-review">${icon('check')}Hoàn thành buổi ôn</a>`}
          </div>
        </section>
      </div>`;
    };

    void (async () => {
      await ensureLoaded();
      if (!reviewSession || reviewSession.filter !== filter || reviewSession.part !== part) {
        const queryParams = new URLSearchParams();
        if (filter !== 'all') queryParams.set('filter', filter);
        if (part !== 'all') queryParams.set('part', part);
        const res = await api('exam-review/session?' + queryParams.toString()).catch(() => ({ items: [] }));
        reviewSession = { items: res.items || [], index: 0, checked: {}, userChoices: {}, filter, part };
        if ($('#main') && location.hash.slice(1).split('?')[0] === 'exam-review-run') {
          $('#main').innerHTML = renderRun();
        }
      }
    })();
    return renderRun();
  }

  function renderAnalyticsView() {
    const summary = analyzeExamHistory(results, catalog);
    const matrix = computePartMatrix(results);

    return `${heading(
      'Phân tích luyện đề',
      'Tách riêng lần đầu làm đề và các lần làm lại; chỉ kết luận điểm yếu khi đủ cỡ mẫu (≥ 5 câu).',
      `<a class="btn btn-secondary" href="#exams">${icon('back')}Kho đề</a>`
    )}
    <div class="stat-grid" style="margin-bottom:18px">
      <div class="stat"><div><strong>${summary.firstAttempts.length}</strong><small>Lượt làm lần đầu</small></div></div>
      <div class="stat"><div><strong>${summary.retakes.length}</strong><small>Lượt làm lại</small></div></div>
      <div class="stat"><div><strong>${reviewItems.length}</strong><small>Câu trong sổ lỗi sai</small></div></div>
    </div>
    <div class="fine-print" style="margin-bottom:18px;padding:12px 14px;background:var(--surface-alt);border-left:4px solid #7160d9;border-radius:6px;line-height:1.5">
      <strong>Lưu ý về cách tính điểm TOEIC:</strong> ${esc(EXAM_SCALE_DISCLAIMER)}
    </div>
    <section class="panel" style="margin-bottom:18px;overflow-x:auto">
      <h2>Ma trận năng lực 7 Part</h2>
      <table class="exam-matrix-table">
        <thead>
          <tr>
            <th>Phần thi</th>
            <th>Kỹ năng</th>
            <th>Tổng số câu</th>
            <th>Đúng</th>
            <th>Sai</th>
            <th>Bỏ trống</th>
            <th>Tỷ lệ chính xác</th>
            <th>Đánh giá</th>
          </tr>
        </thead>
        <tbody>
          ${Object.values(matrix).map((row) => {
            const statusLabel = row.total < 5 ? 'Chưa đủ mẫu' : row.accuracy >= 75 ? 'Tốt' : row.accuracy >= 50 ? 'Ổn định' : 'Cần ôn lại';
            const statusCls = row.total < 5 ? 'reference' : row.accuracy >= 75 ? 'full' : row.accuracy >= 50 ? 'practice' : 'warn';
            return `<tr>
              <td><strong>${esc(row.name)}</strong></td>
              <td>${row.skill === 'listening' ? 'Listening' : 'Reading'}</td>
              <td>${row.total}</td>
              <td style="color:#16a34a;font-weight:600">${row.correct}</td>
              <td style="color:#dc2626">${row.wrong}</td>
              <td>${row.blank}</td>
              <td><strong>${row.attempted ? row.accuracy + '%' : '—'}</strong></td>
              <td><span class="exam-badge ${statusCls}">${statusLabel}</span></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </section>
    <section class="panel" style="margin-bottom:18px">
      <h2>Gợi ý cho buổi học tiếp theo (tối đa 3 việc)</h2>
      ${summary.recommendations.length
        ? `<ul>${summary.recommendations.map((rec) => `<li><a href="${rec.href}"><strong>${esc(rec.title)}</strong></a> — ${esc(rec.detail)}</li>`).join('')}</ul>`
        : '<p class="fine-print">Chưa đủ dữ liệu (cần ít nhất 5 câu đã làm trong một Part) để gợi ý chính xác.</p>'}
    </section>
    <section class="panel">
      <h2>Lịch sử các lượt làm đề</h2>
      ${results.length ? `<div class="video-list">${results.slice(0, 20).map((r) => {
        const sc = r.score || {};
        return `<div class="exam-group-card" style="margin-bottom:8px;padding:12px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <strong>${esc(r.exam_id || r.examId)} · ${r.mode === 'simulation' ? 'Thi mô phỏng' : 'Tự luyện'}</strong>
            <span class="exam-badge full">Đúng ${sc.correct || 0}/${sc.total || 0} (${sc.percent || 0}%)</span>
          </div>
          <small class="fine-print">Thời gian nộp: ${new Date(r.created_at || r.submittedAt).toLocaleString('vi-VN')} · Nguồn: ${esc(r.source_origin || 'server-graded')}</small>
          <div style="margin-top:6px">
            <a class="btn btn-sm btn-secondary" href="#exam-result?id=${encodeURIComponent(r.attempt_id || r.attemptId)}">Xem lại bài chữa</a>
          </div>
        </div>`;
      }).join('')}</div>` : '<p class="fine-print">Chưa có lượt nộp bài nào.</p>'}
    </section>`;
  }

  function examAnalyticsPage() {
    void (async () => {
      await ensureLoaded();
      await refreshAccountExamData();
      if ($('#main') && location.hash.slice(1).split('?')[0] === 'exam-analytics') {
        $('#main').innerHTML = renderAnalyticsView();
      }
    })();
    if (!loaded) return '<div class="loading"><span class="spinner"></span>Đang tải phân tích…</div>';
    return renderAnalyticsView();
  }

  function adminExamsPage(params) {
    const renderAdmin = () => {
      return `${heading(
        'Quản trị đề thi TOEIC',
        'Kiểm kê 30 đề, kiểm tra checklist 5 điểm sẵn sàng, soạn thảo nháp, kiểm định cấu trúc và xuất bản có đối chiếu nguồn.',
        `<div style="display:flex;gap:8px">
          <a class="btn btn-secondary" href="#exams">${icon('back')}Kho đề</a>
          <button type="button" class="btn btn-primary" data-admin-refresh-exams>${icon('refresh')}Làm mới</button>
        </div>`
      )}
      <div class="panel" style="margin-bottom:18px;overflow-x:auto">
        <h2>Danh sách 30 đề thi & Checklist 5 điểm sẵn sàng</h2>
        <table class="exam-matrix-table">
          <thead>
            <tr>
              <th>Mã đề & Tên đề</th>
              <th>Năm · Nguồn</th>
              <th>Checklist 5 điểm</th>
              <th>Mức sẵn sàng</th>
              <th>Chuẩn mô phỏng</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            ${adminData.exams.map((exam) => {
              const chk = exam.checklist || {};
              return `<tr>
                <td><strong>${esc(exam.title)}</strong><br><small class="fine-print">${esc(exam.id)}</small></td>
                <td>${exam.year} · ${esc(exam.sourceLabel)}</td>
                <td>
                  <div class="admin-checklist">
                    <span class="admin-chk-pill ${chk.sourceVerified ? 'ok' : ''}" title="Bản đề gốc LC/RC">1. Nguồn</span>
                    <span class="admin-chk-pill ${chk.mediaVerified ? 'ok' : ''}" title="Audio chuẩn tốc độ">2. Audio</span>
                    <span class="admin-chk-pill ${chk.keyVerified ? 'ok' : ''}" title="Khóa đáp án có trang">3. Khóa</span>
                    <span class="admin-chk-pill ${chk.questionsVerified ? 'ok' : ''}" title="Bóc tách câu & nhóm">4. Đề câu</span>
                    <span class="admin-chk-pill ${chk.explanationsVerified ? 'ok' : ''}" title="Lời giải tiếng Việt đã duyệt">5. Lời giải</span>
                  </div>
                </td>
                <td><span class="exam-badge ${exam.readiness === 'full' ? 'full' : exam.readiness === 'reference' ? 'reference' : 'practice'}">${esc(READINESS_LABELS[exam.readiness] || exam.readiness)}</span></td>
                <td>${exam.simulationEligible ? '<span class="exam-badge full">Đủ điều kiện</span>' : '<span class="exam-badge warn">Không</span>'}</td>
                <td>
                  <div style="display:flex;gap:6px;flex-wrap:wrap">
                    <button type="button" class="btn btn-sm btn-secondary" data-admin-edit-exam="${esc(exam.id)}">Soạn nháp</button>
                  </div>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      ${renderDraftModal()}`;
    };

    function renderDraftModal() {
      if (!adminData.draftModal) return '';
      const dm = adminData.draftModal;
      return `<div class="report-modal-overlay" id="admin-draft-modal-overlay">
        <div class="report-modal" style="max-width:620px">
          <h3>Biên tập bản nháp: ${esc(dm.examId)}</h3>
          <label class="form-field" style="margin-bottom:8px">Tiêu đề đề thi
            <input id="admin-draft-title" class="field" value="${esc(dm.title)}">
          </label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:8px 0">
            <label class="form-field">Mức sẵn sàng
              <select id="admin-draft-readiness" class="field">
                <option value="reference" ${dm.readiness === 'reference' ? 'selected' : ''}>Tài liệu tham khảo</option>
                <option value="practice" ${dm.readiness === 'practice' ? 'selected' : ''}>Có thể tự luyện</option>
                <option value="graded" ${dm.readiness === 'graded' ? 'selected' : ''}>Có chấm đáp án</option>
                <option value="full" ${dm.readiness === 'full' ? 'selected' : ''}>Có chữa bài đầy đủ</option>
              </select>
            </label>
            <label class="form-field">Điều kiện thi mô phỏng
              <select id="admin-draft-sim" class="field">
                <option value="1" ${dm.simulationEligible ? 'selected' : ''}>Cho phép thi mô phỏng</option>
                <option value="0" ${!dm.simulationEligible ? 'selected' : ''}>Khóa thi mô phỏng</option>
              </select>
            </label>
          </div>
          <div style="margin:8px 0">
            <strong>Checklist xác minh:</strong>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px">
              <label><input type="checkbox" id="chk-src" ${dm.checklist?.sourceVerified ? 'checked' : ''}> 1. Bản gốc đối chiếu</label>
              <label><input type="checkbox" id="chk-med" ${dm.checklist?.mediaVerified ? 'checked' : ''}> 2. Audio chuẩn tốc độ</label>
              <label><input type="checkbox" id="chk-key" ${dm.checklist?.keyVerified ? 'checked' : ''}> 3. Khóa đáp án có trang</label>
              <label><input type="checkbox" id="chk-q" ${dm.checklist?.questionsVerified ? 'checked' : ''}> 4. Cấu trúc câu & nhóm</label>
              <label><input type="checkbox" id="chk-exp" ${dm.checklist?.explanationsVerified ? 'checked' : ''}> 5. Lời giải đã duyệt</label>
            </div>
          </div>
          <label class="form-field" style="margin:8px 0">Ghi chú phiên bản
            <input id="admin-draft-note" class="field" placeholder="Lý do cập nhật hoặc nguồn đối chiếu…">
          </label>
          <div id="admin-validate-result" style="margin:8px 0"></div>
          <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px">
            <button type="button" class="btn btn-secondary" data-admin-draft-cancel>Đóng</button>
            <button type="button" class="btn btn-secondary" data-admin-validate-draft>Kiểm tra cấu trúc</button>
            <button type="button" class="btn btn-primary" data-admin-draft-save>Lưu bản nháp</button>
          </div>
        </div>
      </div>`;
    }

    void (async () => {
      await ensureLoaded();
      const res = await api('admin/exams').catch(() => null);
      if (res) {
        adminData.exams = res.exams || catalog;
        adminData.versions = res.versions || [];
        adminData.audit = res.audit || [];
      } else {
        adminData.exams = catalog;
      }
      if ($('#main') && (location.hash.slice(1).split('?')[0] === 'admin-exams' || (location.hash.slice(1).split('?')[0] === 'admin' && params.get('tab') === 'exams'))) {
        $('#main').innerHTML = renderAdmin();
      }
    })();

    return renderAdmin();
  }

  // Event handlers
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'exam-filter-year') { filters.year = t.value; $('#exam-catalog-root').innerHTML = renderCatalogGrid(); }
    else if (t.id === 'exam-filter-readiness') { filters.readiness = t.value; $('#exam-catalog-root').innerHTML = renderCatalogGrid(); }
    else if (t.id === 'exam-filter-part') { filters.part = t.value; $('#exam-catalog-root').innerHTML = renderCatalogGrid(); }
    else if (t.id === 'exam-filter-status') { filters.status = t.value; $('#exam-catalog-root').innerHTML = renderCatalogGrid(); }
    else if (t.id === 'review-filter-part' || t.id === 'review-filter-type') {
      const p = new URLSearchParams(location.hash.split('?')[1] || '');
      if ($('#review-filter-part')) p.set('part', $('#review-filter-part').value);
      if ($('#review-filter-type')) p.set('type', $('#review-filter-type').value);
      if ($('#main')) $('#main').innerHTML = renderReviewView(p);
    }
    else if (t.matches('[data-review-reason]')) {
      void api('exam-review/' + encodeURIComponent(t.dataset.reviewReason), 'PUT', { reason: t.value }).then(() => toast('Đã lưu lý do sai.'));
    }
    else if (t.matches('[data-review-save-reason]')) {
      void api('exam-review/' + encodeURIComponent(t.dataset.reviewSaveReason), 'PUT', { reason: t.value }).then(() => toast('Đã lưu lý do sai.'));
    }
  });

  document.addEventListener('input', (e) => {
    if (e.target.id === 'exam-filter-q') {
      filters.query = e.target.value;
      if ($('#exam-catalog-root')) $('#exam-catalog-root').innerHTML = renderCatalogGrid();
    }
  });

  document.addEventListener('click', (e) => {
    const b = e.target.closest('button,a');
    if (!b) return;

    if (b.hasAttribute('data-exam-start')) {
      const id = b.dataset.examStart;
      const mode = b.dataset.mode;
      const stats = attemptStatsMap()[id] || { inProgress: null };
      if (stats.inProgress && !confirm('Bạn đang có một phiên làm dở của đề này. Tạo lượt mới sẽ mở một phiên mới độc lập và không xóa phiên cũ. Tiếp tục?')) {
        return;
      }
      const scope = mode === 'simulation' ? 'full' : ($('#prep-practice-scope')?.value || 'full');
      const limitMinutes = mode === 'simulation' ? 0 : Number($('#prep-time-limit')?.value || 0);
      void startExamSession(id, mode, scope, limitMinutes);
    } else if (b.hasAttribute('data-exam-choose')) {
      if (!activeRun || activeRun.attempt.status !== 'in_progress') return;
      const qid = b.dataset.examChoose;
      const idx = Number(b.dataset.idx);
      activeRun.attempt.answers[qid] = idx;
      $('#exam-content-pane').innerHTML = renderGroupContent();
      $('#exam-palette-panel').innerHTML = renderPalette();
      scheduleServerSync();
    } else if (b.hasAttribute('data-exam-flag')) {
      if (!activeRun) return;
      const qid = b.dataset.examFlag;
      const set = new Set(activeRun.attempt.flags);
      if (set.has(qid)) set.delete(qid);
      else set.add(qid);
      activeRun.attempt.flags = [...set];
      $('#exam-content-pane').innerHTML = renderGroupContent();
      $('#exam-palette-panel').innerHTML = renderPalette();
      scheduleServerSync();
    } else if (b.hasAttribute('data-exam-prev-group')) {
      if (!activeRun || activeRun.groupIndex <= 0) return;
      activeRun.groupIndex--;
      $('#exam-content-pane').innerHTML = renderGroupContent();
      $('#exam-palette-panel').innerHTML = renderPalette();
    } else if (b.hasAttribute('data-exam-next-group')) {
      if (!activeRun || activeRun.groupIndex >= activeRun.content.groups.length - 1) return;
      activeRun.groupIndex++;
      $('#exam-content-pane').innerHTML = renderGroupContent();
      $('#exam-palette-panel').innerHTML = renderPalette();
    } else if (b.hasAttribute('data-exam-jump-q')) {
      if (!activeRun) return;
      const q = activeRun.content.questions.find((x) => x.id === b.dataset.examJumpQ);
      if (!q) return;
      const gIdx = activeRun.content.groups.findIndex((g) => g.id === q.groupId);
      if (gIdx >= 0) {
        activeRun.groupIndex = gIdx;
        setMobilePane('content');
        $('#exam-content-pane').innerHTML = renderGroupContent();
        $('#exam-palette-panel').innerHTML = renderPalette();
      }
    } else if (b.hasAttribute('data-exam-mobile-pane')) {
      if (!activeRun) return;
      setMobilePane(b.dataset.examMobilePane);
    } else if (b.hasAttribute('data-exam-to-reading')) {
      void transitionToReading(false);
    } else if (b.hasAttribute('data-exam-submit')) {
      void submitCurrentExam(false);
    } else if (b.hasAttribute('data-exam-check')) {
      if (!activeRun) return;
      const qid = b.dataset.examCheck;
      const checkPromise = (signedIn && !activeRun.attempt.guest)
        ? api(`exam-attempts/${encodeURIComponent(activeRun.attempt.attempt_id)}/check-question`, 'POST', { questionId: qid })
        : api(`exams/${encodeURIComponent(activeRun.exam.id)}/check-question`, 'POST', { questionId: qid });
      void checkPromise.then((res) => {
        activeRun.checkCache[qid] = res;
        $('#exam-content-pane').innerHTML = renderGroupContent();
      }).catch((err) => toast('Không kiểm tra được: ' + (err.message || 'Lỗi kết nối')));
    } else if (b.hasAttribute('data-exam-toggle-pdf')) {
      if (!activeRun) return;
      activeRun.showPdfDrawer = !activeRun.showPdfDrawer;
      $('#main').innerHTML = renderRunShell();
    } else if (b.hasAttribute('data-exam-reload-attempt')) {
      if (!activeRun) return;
      void api('exam-attempts/' + encodeURIComponent(activeRun.attempt.attempt_id)).then((res) => {
        if (res.attempt) {
          activeRun.attempt.answers = { ...res.attempt.answers, ...activeRun.attempt.answers };
          activeRun.attempt.flags = res.attempt.flags || activeRun.attempt.flags;
          activeRun.attempt.revision = res.attempt.revision;
          activeRun.hasConflict = false;
          $('#main').innerHTML = renderRunShell();
          toast('Đã tải lại phiên mới nhất từ máy chủ.');
        }
      });
    } else if (b.hasAttribute('data-exam-mark-uncertain')) {
      void api('exam-review/mark', 'POST', { questionId: b.dataset.examMarkUncertain, examId: b.dataset.examId }).then(async () => {
        await refreshAccountExamData();
        toast('Đã thêm vào Sổ lỗi sai.');
      });
    } else if (b.hasAttribute('data-exam-report-btn')) {
      activeReportTarget = {
        questionId: b.dataset.examReportBtn,
        questionVersion: b.dataset.qVer || 'v1',
        questionNum: b.dataset.qNum
      };
      const existing = $('#report-modal-overlay');
      if (existing) existing.remove();
      const div = document.createElement('div');
      div.innerHTML = renderReportModal();
      document.body.appendChild(div.firstElementChild);
    } else if (b.hasAttribute('data-report-cancel')) {
      activeReportTarget = null;
      if ($('#report-modal-overlay')) $('#report-modal-overlay').remove();
    } else if (b.hasAttribute('data-report-submit')) {
      if (!activeReportTarget) return;
      const reason = $('#report-reason')?.value || 'other';
      const detail = $('#report-detail')?.value?.trim() || '';
      if (!detail) return toast('Vui lòng nhập mô tả lỗi.');
      void api('reports', 'POST', {
        id: 'rep_' + Date.now(),
        questionId: activeReportTarget.questionId,
        questionVersion: activeReportTarget.questionVersion,
        reason,
        detail
      }).then(() => {
        activeReportTarget = null;
        if ($('#report-modal-overlay')) $('#report-modal-overlay').remove();
        toast('Đã ghi nhận báo lỗi nội dung. Cảm ơn bạn đã đóng góp!');
      });
    } else if (b.hasAttribute('data-insert-tag')) {
      const tag = b.dataset.insertTag;
      const targetId = b.dataset.targetNote;
      const textarea = $(`#note-${targetId}`);
      if (textarea) {
        textarea.value = textarea.value ? `${textarea.value} ${tag}` : tag;
        textarea.focus();
      }
    } else if (b.hasAttribute('data-exam-save-result-note')) {
      const qid = b.dataset.examSaveResultNote;
      const note = $(`#note-res-${qid}`)?.value?.trim() || '';
      const revItem = reviewItems.find((x) => x.question_id === qid);
      if (revItem) {
        void api('exam-review/' + encodeURIComponent(revItem.review_id), 'PUT', { note }).then(() => toast('Đã lưu ghi chú.'));
      } else {
        toast('Ghi chú đã được lưu trên thiết bị.');
      }
    } else if (b.hasAttribute('data-review-done')) {
      const id = b.dataset.reviewDone;
      const days = Number(b.dataset.days || 1);
      void api('exam-review/' + encodeURIComponent(id), 'PUT', { recordReview: true, intervalDays: days }).then(() => {
        toast(`Đã hẹn ôn lại sau ${days} ngày.`);
      });
    } else if (b.hasAttribute('data-review-mastered')) {
      const id = b.dataset.reviewMastered;
      void api('exam-review/' + encodeURIComponent(id), 'PUT', { status: 'mastered' }).then(() => {
        reviewItems = reviewItems.filter((x) => x.review_id !== id);
        if ($('#main')) $('#main').innerHTML = examReviewPage(new URLSearchParams());
      });
    } else if (b.hasAttribute('data-review-choose')) {
      if (!reviewSession) return;
      const cur = reviewSession.items[reviewSession.index];
      if (!cur) return;
      reviewSession.userChoices[cur.question.id] = Number(b.dataset.reviewChoose);
      $('#main').innerHTML = examReviewRunPage(new URLSearchParams(`filter=${reviewSession.filter}&part=${reviewSession.part}`));
    } else if (b.hasAttribute('data-review-check-q')) {
      if (!reviewSession) return;
      const cur = reviewSession.items[reviewSession.index];
      const chosen = reviewSession.userChoices[cur.question.id];
      if (chosen === undefined) return;
      void api('exam-review/check', 'POST', { questionId: cur.question.id, chosen }).then((res) => {
        reviewSession.checked[cur.question.id] = res;
        $('#main').innerHTML = examReviewRunPage(new URLSearchParams(`filter=${reviewSession.filter}&part=${reviewSession.part}`));
      });
    } else if (b.hasAttribute('data-review-save-note')) {
      const reviewId = b.dataset.reviewSaveNote;
      const note = $(`#note-rev-${reviewId}`)?.value?.trim() || '';
      void api('exam-review/' + encodeURIComponent(reviewId), 'PUT', { note }).then(() => toast('Đã lưu ghi chú ôn tập.'));
    } else if (b.hasAttribute('data-review-reschedule')) {
      const days = Number(b.dataset.reviewReschedule);
      const reviewId = b.dataset.reviewId;
      void api('exam-review/' + encodeURIComponent(reviewId), 'PUT', { recordReview: true, intervalDays: days }).then(() => {
        toast(`Đã lên lịch ôn lại sau ${days} ngày.`);
      });
    } else if (b.hasAttribute('data-review-master-session')) {
      const reviewId = b.dataset.reviewMasterSession;
      void api('exam-review/' + encodeURIComponent(reviewId), 'PUT', { status: 'mastered' }).then(() => {
        toast('Đã đánh dấu nắm vững.');
      });
    } else if (b.hasAttribute('data-review-prev-q')) {
      if (!reviewSession || reviewSession.index <= 0) return;
      reviewSession.index--;
      $('#main').innerHTML = examReviewRunPage(new URLSearchParams(`filter=${reviewSession.filter}&part=${reviewSession.part}`));
    } else if (b.hasAttribute('data-review-next-q')) {
      if (!reviewSession || reviewSession.index >= reviewSession.items.length - 1) return;
      reviewSession.index++;
      $('#main').innerHTML = examReviewRunPage(new URLSearchParams(`filter=${reviewSession.filter}&part=${reviewSession.part}`));
    } else if (b.hasAttribute('data-exam-import-v17')) {
      if (!signedIn) return toast('Cần đăng nhập để nhập lịch sử lên tài khoản.');
      const lState = readLocal('toeic-studio-learning-v1', {});
      const items = Object.entries(lState.worksheets || {}).map(([docId, w]) => ({
        id: docId,
        docId,
        count: w.count || 0,
        correct: Object.values(w.checks || {}).filter(Boolean).length,
        date: new Date().toISOString()
      }));
      void api('exam-attempts/import-v17', 'POST', { items }).then((res) => {
        toast(`Đã nhập bổ sung ${res.imported} phiếu bản 17 (không xóa dữ liệu cũ).`);
      });
    } else if (b.hasAttribute('data-admin-edit-exam')) {
      const examId = b.dataset.adminEditExam;
      const exam = adminData.exams.find((e) => e.id === examId);
      if (!exam) return;
      adminData.draftModal = {
        examId,
        title: exam.title,
        readiness: exam.readiness,
        simulationEligible: exam.simulationEligible,
        checklist: { ...(exam.checklist || {}) }
      };
      $('#main').innerHTML = adminExamsPage(new URLSearchParams());
    } else if (b.hasAttribute('data-admin-draft-cancel')) {
      adminData.draftModal = null;
      $('#main').innerHTML = adminExamsPage(new URLSearchParams());
    } else if (b.hasAttribute('data-admin-validate-draft')) {
      if (!adminData.draftModal) return;
      void api('exams/' + encodeURIComponent(adminData.draftModal.examId)).then((res) => {
        const errs = validateExamContent(res.content);
        const el = $('#admin-validate-result');
        if (el) {
          el.innerHTML = errs.length
            ? `<div class="exam-save-pill error">${errs.length} lỗi: ${esc(errs[0])}</div>`
            : '<div class="exam-save-pill saved">✓ Cấu trúc hợp lệ (Part 2 đúng 3 đáp án A-C, đủ nhóm câu).</div>';
        }
      });
    } else if (b.hasAttribute('data-admin-draft-save')) {
      if (!adminData.draftModal) return;
      const examId = adminData.draftModal.examId;
      const title = $('#admin-draft-title')?.value || adminData.draftModal.title;
      const readiness = $('#admin-draft-readiness')?.value || adminData.draftModal.readiness;
      const simulationEligible = $('#admin-draft-sim')?.value === '1';
      const checklist = {
        sourceVerified: Boolean($('#chk-src')?.checked),
        mediaVerified: Boolean($('#chk-med')?.checked),
        keyVerified: Boolean($('#chk-key')?.checked),
        questionsVerified: Boolean($('#chk-q')?.checked),
        explanationsVerified: Boolean($('#chk-exp')?.checked)
      };
      const note = $('#admin-draft-note')?.value?.trim() || 'Cập nhật bản nháp';
      void api('admin/exams/draft', 'POST', { examId, title, readiness, simulationEligible, checklist, note })
        .then(() => {
          toast('Đã lưu bản nháp mới thành công.');
          adminData.draftModal = null;
          $('#main').innerHTML = adminExamsPage(new URLSearchParams());
        })
        .catch((err) => toast(err.message));
    } else if (b.hasAttribute('data-admin-refresh-exams')) {
      void api('admin/exams').then((res) => {
        adminData.exams = res.exams || catalog;
        adminData.versions = res.versions || [];
        adminData.audit = res.audit || [];
        $('#main').innerHTML = adminExamsPage(new URLSearchParams());
        toast('Đã làm mới dữ liệu quản trị.');
      });
    }
  });

  // Keyboard navigation & quick shortcuts
  document.addEventListener('keydown', (e) => {
    if (!activeRun || location.hash.slice(1).split('?')[0] !== 'exam-run') return;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

    if (e.key === 'ArrowRight' && activeRun.groupIndex < activeRun.content.groups.length - 1) {
      activeRun.groupIndex++;
      $('#exam-content-pane').innerHTML = renderGroupContent();
      $('#exam-palette-panel').innerHTML = renderPalette();
      return;
    }
    if (e.key === 'ArrowLeft' && activeRun.groupIndex > 0) {
      activeRun.groupIndex--;
      $('#exam-content-pane').innerHTML = renderGroupContent();
      $('#exam-palette-panel').innerHTML = renderPalette();
      return;
    }

    const currentGrp = activeRun.content.groups[activeRun.groupIndex];
    if (!currentGrp) return;
    const currentQuestions = activeRun.content.questions.filter((q) => q.groupId === currentGrp.id);
    if (!currentQuestions.length) return;
    const targetQ = currentQuestions.find((q) => activeRun.attempt.answers[q.id] === undefined) || currentQuestions[0];

    // Numbers 1-4 or Letters A-D
    let optIdx = null;
    if (['1', '2', '3', '4'].includes(e.key)) optIdx = Number(e.key) - 1;
    else if (['a', 'b', 'c', 'd'].includes(e.key.toLowerCase())) {
      optIdx = { a: 0, b: 1, c: 2, d: 3 }[e.key.toLowerCase()];
    }
    if (optIdx !== null && optIdx < targetQ.options.length) {
      activeRun.attempt.answers[targetQ.id] = optIdx;
      $('#exam-content-pane').innerHTML = renderGroupContent();
      $('#exam-palette-panel').innerHTML = renderPalette();
      scheduleServerSync();
      return;
    }

    // Flag toggle (F)
    if (e.key === 'f' || e.key === 'F') {
      const set = new Set(activeRun.attempt.flags);
      if (set.has(targetQ.id)) set.delete(targetQ.id);
      else set.add(targetQ.id);
      activeRun.attempt.flags = [...set];
      $('#exam-content-pane').innerHTML = renderGroupContent();
      $('#exam-palette-panel').innerHTML = renderPalette();
      scheduleServerSync();
      return;
    }

    // Enter to check in practice mode
    if (e.key === 'Enter' && activeRun.attempt.mode === 'practice') {
      const checkPromise = (signedIn && !activeRun.attempt.guest)
        ? api(`exam-attempts/${encodeURIComponent(activeRun.attempt.attempt_id)}/check-question`, 'POST', { questionId: targetQ.id })
        : api(`exams/${encodeURIComponent(activeRun.exam.id)}/check-question`, 'POST', { questionId: targetQ.id });
      void checkPromise.then((res) => {
        activeRun.checkCache[targetQ.id] = res;
        $('#exam-content-pane').innerHTML = renderGroupContent();
      }).catch(() => {});
    }
  });

  // Auto-sync when reconnecting
  window.addEventListener('online', () => {
    if (activeRun) scheduleServerSync();
  });

  return {
    examsPage,
    examPrepPage,
    examRunPage,
    examResultPage,
    examReviewPage,
    examReviewRunPage,
    examAnalyticsPage,
    adminExamsPage
  };
}
