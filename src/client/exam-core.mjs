export const READINESS_LABELS = {
  reference: 'Tài liệu tham khảo',
  practice: 'Có thể tự luyện',
  graded: 'Có chấm đáp án',
  full: 'Có chữa bài đầy đủ'
};

export const PART_SPECS = [
  { part: 1, name: 'Part 1 · Mô tả tranh', skill: 'listening', start: 1, end: 6, count: 6 },
  { part: 2, name: 'Part 2 · Hỏi – Đáp', skill: 'listening', start: 7, end: 31, count: 25 },
  { part: 3, name: 'Part 3 · Hội thoại', skill: 'listening', start: 32, end: 70, count: 39 },
  { part: 4, name: 'Part 4 · Bài nói ngắn', skill: 'listening', start: 71, end: 100, count: 30 },
  { part: 5, name: 'Part 5 · Hoàn thành câu', skill: 'reading', start: 101, end: 130, count: 30 },
  { part: 6, name: 'Part 6 · Hoàn thành đoạn văn', skill: 'reading', start: 131, end: 146, count: 16 },
  { part: 7, name: 'Part 7 · Đọc hiểu', skill: 'reading', start: 147, end: 200, count: 54 }
];

export const EXAM_ERROR_REASONS = {
  vocab: 'Thiếu từ vựng',
  listening: 'Chưa nghe được',
  grammar: 'Nhầm quy tắc',
  time: 'Thiếu thời gian',
  careless: 'Đọc nhầm / vội'
};

export const EXAM_NOTE_TAGS = ['[Từ mới]', '[Quy tắc]', '[Bẫy]', '[Xem lại]'];

export const EXAM_SCALE_DISCLAIMER =
  'Điểm thi TOEIC thực tế không tính theo công thức nhân tuyến tính (số câu đúng / 200 × 990). Điểm số chính thức của ETS được chuẩn hóa qua bảng quy đổi (equating table) tương ứng với từng mã đề thi thực tế để đảm bảo tính công bằng giữa các lượt thi.';

export function computePartMatrix(results = []) {
  const byPart = {};
  for (let p = 1; p <= 7; p++) {
    const spec = PART_SPECS.find((s) => s.part === p);
    byPart[p] = {
      part: p,
      name: spec?.name || `Part ${p}`,
      skill: spec?.skill || (p <= 4 ? 'listening' : 'reading'),
      total: 0,
      correct: 0,
      wrong: 0,
      blank: 0,
      attempted: 0,
      accuracy: 0
    };
  }
  for (const r of results) {
    const sc = r.score || (r.score_json ? JSON.parse(r.score_json) : null);
    if (!sc?.byPart) continue;
    for (let p = 1; p <= 7; p++) {
      const bp = sc.byPart[p];
      if (!bp) continue;
      byPart[p].total += bp.total || 0;
      byPart[p].correct += bp.correct || 0;
      byPart[p].wrong += bp.wrong || 0;
      byPart[p].blank += bp.blank || 0;
    }
  }
  for (let p = 1; p <= 7; p++) {
    const row = byPart[p];
    row.attempted = row.correct + row.wrong;
    row.accuracy = row.attempted > 0 ? Math.round((100 * row.correct) / row.attempted) : 0;
  }
  return byPart;
}

export const VALID_PARTS = {
  1: { min: 1, max: 6, count: 6, opts: 4 },
  2: { min: 7, max: 31, count: 25, opts: 3 },
  3: { min: 32, max: 70, count: 39, opts: 4 },
  4: { min: 71, max: 100, count: 30, opts: 4 },
  5: { min: 101, max: 130, count: 30, opts: 4 },
  6: { min: 131, max: 146, count: 16, opts: 4 },
  7: { min: 147, max: 200, count: 54, opts: 4 }
};

export function validateExamContent(content) {
  const errors = [];
  if (!content || !Array.isArray(content.groups) || !Array.isArray(content.questions)) {
    return ['Thiếu cấu trúc groups hoặc questions.'];
  }
  const privateData = content.privateData || {};
  const groupMap = new Map();
  for (const g of content.groups) {
    if (!g.id || !VALID_PARTS[g.part]) errors.push(`Nhóm ${g.id || '?'} có Part không hợp lệ.`);
    if (!Number.isInteger(g.startQ) || !Number.isInteger(g.endQ) || g.startQ > g.endQ) {
      errors.push(`Nhóm ${g.id} có dải câu không hợp lệ.`);
    }
    if (groupMap.has(g.id)) errors.push(`Trùng mã nhóm ${g.id}.`);
    groupMap.set(g.id, g);
  }

  const seenNums = new Set();
  const partCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
  for (const q of content.questions) {
    if (!q.id || !VALID_PARTS[q.part]) {
      errors.push(`Câu ${q.id || '?'} có Part không hợp lệ.`);
      continue;
    }
    if (!Number.isInteger(q.number) || q.number < 1 || q.number > 200) {
      errors.push(`Câu ${q.id} có số thứ tự ngoài phạm vi 1–200.`);
    } else if (seenNums.has(q.number)) {
      errors.push(`Trùng số câu ${q.number}.`);
    } else {
      seenNums.add(q.number);
    }
    const spec = VALID_PARTS[q.part];
    if (q.number < spec.min || q.number > spec.max) {
      errors.push(`Câu ${q.number} không thuộc dải câu của Part ${q.part} (${spec.min}–${spec.max}).`);
    }
    const grp = groupMap.get(q.groupId);
    if (!grp) {
      errors.push(`Câu ${q.number} tham chiếu nhóm không tồn tại (${q.groupId}).`);
    } else if (grp.part !== q.part || q.number < grp.startQ || q.number > grp.endQ) {
      errors.push(`Câu ${q.number} không khớp dải câu của nhóm ${grp.id}.`);
    }
    if (!Array.isArray(q.options) || q.options.length !== spec.opts) {
      errors.push(`Câu ${q.number} (Part ${q.part}) phải có đúng ${spec.opts} lựa chọn.`);
    }
    if (q.part === 2 && JSON.stringify(q.options) !== JSON.stringify(['A', 'B', 'C'])) {
      errors.push(`Part 2 câu ${q.number} chỉ được hiển thị A/B/C.`);
    }
    const priv = privateData[q.id];
    if (!priv || !Number.isInteger(priv.answer) || priv.answer < 0 || priv.answer >= (q.options?.length || 0)) {
      errors.push(`Câu ${q.number} thiếu đáp án hợp lệ trong khóa.`);
    }
    partCounts[q.part]++;
  }

  if (content.questions.length === 200) {
    for (const [part, spec] of Object.entries(VALID_PARTS)) {
      if (partCounts[part] !== spec.count) {
        errors.push(`Part ${part} cần đủ ${spec.count} câu (hiện có ${partCounts[part]}).`);
      }
    }
  }
  return errors;
}

export function filterExams(exams, filters = {}, attemptStats = {}) {
  const { year = 'all', source = 'all', readiness = 'all', part = 'all', status = 'all', query = '' } = filters;
  const q = String(query || '').trim().toLowerCase();
  return (exams || []).filter((exam) => {
    if (year !== 'all' && String(exam.year) !== String(year)) return false;
    if (source !== 'all' && !String(exam.sourceLabel || '').toLowerCase().includes(source.toLowerCase())) return false;
    if (readiness !== 'all' && exam.readiness !== readiness) return false;
    if (part !== 'all') {
      const pStatus = exam.partReadiness?.[Number(part)];
      if (!pStatus || pStatus === 'reference') return false;
    }
    if (q && !`${exam.title} ${exam.sourceLabel} ${exam.year}`.toLowerCase().includes(q)) return false;
    if (status !== 'all') {
      const st = attemptStats[exam.id] || { inProgress: null, count: 0 };
      if (status === 'in_progress' && !st.inProgress) return false;
      if (status === 'completed' && st.count === 0) return false;
      if (status === 'unstarted' && (st.count > 0 || st.inProgress)) return false;
    }
    return true;
  });
}

export function canStartMode(exam, mode) {
  if (!exam) return false;
  if (mode === 'simulation') return Boolean(exam.simulationEligible) && exam.readiness === 'full';
  if (mode === 'practice') return ['full', 'graded', 'practice', 'reference'].includes(exam.readiness);
  return false;
}

export function computeTimerState(attempt, nowMs = Date.now()) {
  if (!attempt || !attempt.deadline_at) {
    return { timed: false, remainingMs: null, expired: false, label: 'Không giới hạn' };
  }
  const deadlineMs = Date.parse(attempt.deadline_at);
  if (!Number.isFinite(deadlineMs)) {
    return { timed: false, remainingMs: null, expired: false, label: 'Không giới hạn' };
  }
  const diff = deadlineMs - nowMs;
  const remainingMs = Math.max(0, diff);
  const expired = diff <= 0;
  const totalSec = Math.ceil(remainingMs / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return {
    timed: true,
    remainingMs,
    expired,
    label: `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  };
}

export function analyzeExamHistory(results = [], exams = []) {
  const ordered = [...results].sort((a, b) => String(a.created_at || a.submittedAt).localeCompare(String(b.created_at || b.submittedAt)));
  const seenFirst = new Set();
  const firstAttempts = [];
  const retakes = [];

  for (const r of ordered) {
    const key = `${r.exam_id || r.examId}:${r.mode}:${r.scope_type || r.scopeType}`;
    if (!seenFirst.has(key)) {
      seenFirst.add(key);
      firstAttempts.push(r);
    } else {
      retakes.push(r);
    }
  }

  const partTotals = {};
  for (let p = 1; p <= 7; p++) partTotals[p] = { part: p, total: 0, correct: 0, wrong: 0, blank: 0 };

  for (const r of ordered) {
    const sc = r.score || (r.score_json ? JSON.parse(r.score_json) : null);
    if (!sc?.byPart) continue;
    for (let p = 1; p <= 7; p++) {
      const bp = sc.byPart[p];
      if (!bp) continue;
      partTotals[p].total += bp.total || 0;
      partTotals[p].correct += bp.correct || 0;
      partTotals[p].wrong += bp.wrong || 0;
      partTotals[p].blank += bp.blank || 0;
    }
  }

  // Only flag weak parts when sample size >= 5 (excluding blank from grammar/vocab evidence)
  const weakParts = Object.values(partTotals)
    .filter((p) => p.total >= 5)
    .map((p) => {
      const attempted = p.correct + p.wrong;
      const accuracy = attempted > 0 ? Math.round((100 * p.correct) / attempted) : null;
      return { ...p, attempted, accuracy };
    })
    .filter((p) => p.accuracy !== null)
    .sort((a, b) => a.accuracy - b.accuracy);

  const recommendations = [];
  if (weakParts.length > 0) {
    const weakest = weakParts[0];
    const spec = PART_SPECS.find((s) => s.part === weakest.part);
    recommendations.push({
      type: 'review-part',
      title: `Ôn lại ${spec?.name || 'Part ' + weakest.part}`,
      detail: `Đúng ${weakest.correct}/${weakest.attempted} câu đã làm (${weakest.accuracy}%, bỏ trống ${weakest.blank}).`,
      href: `#exam-review?part=${weakest.part}`
    });
    recommendations.push({
      type: 'lesson',
      title: weakest.part <= 4 ? 'Củng cố bài học Listening & Ngữ âm' : 'Củng cố bài học Ngữ pháp & Từ loại',
      detail: 'Liên kết trực tiếp từ phần có độ chính xác thấp nhất.',
      href: weakest.part <= 4 ? '#learn?id=present-continuous' : '#learn?id=word-form'
    });
    const pilot = exams.find((e) => e.readiness === 'full');
    if (pilot) {
      recommendations.push({
        type: 'retest',
        title: `Kiểm tra lại ${spec?.name || 'Part ' + weakest.part}`,
        detail: `Làm bài luyện ngắn Part ${weakest.part} trên ${pilot.title}.`,
        href: `#exam?id=${pilot.id}&part=${weakest.part}`
      });
    }
  }

  return {
    firstAttempts,
    retakes,
    partTotals,
    weakParts,
    recommendations: recommendations.slice(0, 3)
  };
}

export function resolveGroupPdfInfo(exam, grp) {
  if (!grp) return { sourceId: null, pdfName: 'Tài liệu PDF gốc', page: 1, merged: false, startPage: null, endPage: null };
  const useUnifiedLc = Boolean(grp.sourceId && exam?.sources?.lcPdf?.id && grp.sourceId === exam.sources.lcPdf.id);
  const isRc = !useUnifiedLc && grp.part >= 5;
  const src = isRc ? exam?.sources?.rcPdf : exam?.sources?.lcPdf;
  const sourceId = grp.sourceId || src?.id || null;
  const rawPage = Math.max(1, Number(grp.sourcePage) || 1);
  const page = isRc && src?.merged && Number(src.startPage) > 1 && rawPage < Number(src.startPage)
    ? Number(src.startPage) + rawPage - 1
    : rawPage;
  return {
    sourceId,
    pdfName: src?.name || (isRc ? 'Reading PDF' : 'Listening PDF'),
    page,
    merged: Boolean(src?.merged),
    startPage: src?.startPage || null,
    endPage: src?.endPage || null
  };
}

export function renderPart1SceneSvg(visual) {
  if (!visual) return '';
  const idx = visual.sceneIndex || 1;
  const scenes = {
    1: `<rect x="20" y="20" width="280" height="140" rx="8" fill="#f3f1ff" stroke="#7160d9" stroke-width="2"/>
        <rect x="170" y="34" width="110" height="65" rx="4" fill="#fff" stroke="#4f46e5" stroke-width="2"/>
        <polyline points="182,82 204,64 224,72 252,46 268,54" fill="none" stroke="#10b981" stroke-width="3"/>
        <circle cx="140" cy="64" r="14" fill="#4f46e5"/><path d="M126 118c0-18 28-18 28 0" fill="#6366f1"/>
        <line x1="152" y1="84" x2="176" y2="66" stroke="#4f46e5" stroke-width="4" stroke-linecap="round"/>
        <rect x="42" y="118" width="110" height="16" rx="4" fill="#cbd5e1"/>
        <circle cx="62" cy="96" r="10" fill="#64748b"/><circle cx="96" cy="96" r="10" fill="#64748b"/>`,
    2: `<rect x="20" y="20" width="280" height="140" rx="8" fill="#ecfeff" stroke="#0891b2" stroke-width="2"/>
        <rect x="30" y="34" width="150" height="64" rx="6" fill="#0e7490"/><rect x="44" y="46" width="32" height="22" rx="3" fill="#cffafe"/><rect x="86" y="46" width="32" height="22" rx="3" fill="#cffafe"/><rect x="128" y="46" width="32" height="22" rx="3" fill="#cffafe"/>
        <line x1="20" y1="126" x2="300" y2="126" stroke="#64748b" stroke-width="3"/>
        <circle cx="222" cy="68" r="12" fill="#0f172a"/><rect x="212" y="82" width="20" height="38" rx="6" fill="#3b82f6"/>
        <rect x="244" y="92" width="26" height="30" rx="4" fill="#f59e0b"/><circle cx="250" cy="126" r="4" fill="#0f172a"/><circle cx="264" cy="126" r="4" fill="#0f172a"/>`,
    3: `<rect x="20" y="20" width="280" height="140" rx="8" fill="#fefce8" stroke="#ca8a04" stroke-width="2"/>
        <path d="M40 50 L280 50 L260 32 L60 32 Z" fill="#f59e0b" opacity="0.35"/>
        <rect x="65" y="92" width="66" height="10" rx="3" fill="#92400e"/><line x1="98" y1="102" x2="98" y2="136" stroke="#78350f" stroke-width="4"/>
        <rect x="44" y="106" width="18" height="28" rx="3" fill="#b45309"/><rect x="134" y="106" width="18" height="28" rx="3" fill="#b45309"/>
        <rect x="188" y="92" width="66" height="10" rx="3" fill="#92400e"/><line x1="221" y1="102" x2="221" y2="136" stroke="#78350f" stroke-width="4"/>
        <rect x="167" y="106" width="18" height="28" rx="3" fill="#b45309"/><rect x="257" y="106" width="18" height="28" rx="3" fill="#b45309"/>`,
    4: `<rect x="20" y="20" width="280" height="140" rx="8" fill="#f0fdf4" stroke="#16a34a" stroke-width="2"/>
        <rect x="40" y="102" width="240" height="16" rx="4" fill="#94a3b8"/>
        <rect x="74" y="68" width="54" height="34" rx="4" fill="#334155"/><circle cx="101" cy="85" r="9" fill="#22c55e"/>
        <circle cx="184" cy="56" r="13" fill="#1e293b"/><rect x="168" y="51" width="32" height="7" rx="3" fill="#38bdf8" opacity="0.8"/>
        <path d="M168 102c0-20 32-20 32 0" fill="#16a34a"/>`,
    5: `<rect x="20" y="20" width="280" height="140" rx="8" fill="#f0f9ff" stroke="#0284c7" stroke-width="2"/>
        <circle cx="70" cy="58" r="24" fill="#22c55e" opacity="0.75"/><rect x="66" y="80" width="8" height="54" fill="#78350f"/>
        <rect x="120" y="108" width="130" height="12" rx="4" fill="#92400e"/><line x1="132" y1="120" x2="132" y2="140" stroke="#78350f" stroke-width="4"/><line x1="238" y1="120" x2="238" y2="140" stroke="#78350f" stroke-width="4"/>
        <circle cx="176" cy="76" r="12" fill="#0f172a"/><rect x="164" y="88" width="24" height="24" rx="5" fill="#2563eb"/>
        <rect x="190" y="92" width="18" height="14" rx="2" fill="#fff" stroke="#475569" stroke-width="2"/>`,
    6: `<rect x="20" y="20" width="280" height="140" rx="8" fill="#fdf4ff" stroke="#9333ea" stroke-width="2"/>
        <rect x="44" y="38" width="232" height="106" rx="4" fill="#fff" stroke="#cbd5e1" stroke-width="2"/>
        <line x1="44" y1="74" x2="276" y2="74" stroke="#94a3b8" stroke-width="3"/><line x1="44" y1="108" x2="276" y2="108" stroke="#94a3b8" stroke-width="3"/>
        <rect x="60" y="48" width="26" height="24" rx="2" fill="#f97316"/><rect x="94" y="48" width="26" height="24" rx="2" fill="#3b82f6"/><rect x="128" y="48" width="26" height="24" rx="2" fill="#10b981"/>
        <rect x="60" y="82" width="32" height="24" rx="2" fill="#eab308"/><rect x="102" y="82" width="32" height="24" rx="2" fill="#ec4899"/><rect x="144" y="82" width="32" height="24" rx="2" fill="#6366f1"/>`
  };
  return `<figure class="exam-visual-card">
    <svg viewBox="0 0 320 180" role="img" aria-label="${visual.title}" class="exam-scene-svg">${scenes[idx] || scenes[1]}</svg>
    <figcaption>${visual.title}</figcaption>
  </figure>`;
}
