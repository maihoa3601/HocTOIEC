const ejson = (value, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff'
    }
  });

import { VALID_PARTS, validateExamContent } from '../client/exam-core.mjs';
export { VALID_PARTS, validateExamContent };

export function gradeExamQuestions(questions, privateData, answers) {
  const byPart = {};
  for (let p = 1; p <= 7; p++) byPart[p] = { part: p, total: 0, correct: 0, wrong: 0, blank: 0 };

  const results = questions.map((q) => {
    const raw = answers[q.id];
    const answered = raw !== undefined && raw !== null && raw !== '' && Number.isInteger(Number(raw));
    const chosen = answered ? Number(raw) : null;
    const priv = privateData[q.id] || {};
    const correct = answered && chosen === priv.answer;
    const p = byPart[q.part] || (byPart[q.part] = { part: q.part, total: 0, correct: 0, wrong: 0, blank: 0 });
    p.total++;
    if (!answered) p.blank++;
    else if (correct) p.correct++;
    else p.wrong++;

    return {
      id: q.id,
      number: q.number,
      part: q.part,
      groupId: q.groupId,
      skillTag: q.skillTag || '',
      relatedLessonId: q.relatedLessonId || '',
      answered,
      chosen,
      correct,
      correctAnswer: priv.answer
    };
  });

  const total = results.length;
  const correct = results.filter((r) => r.correct).length;
  const blank = results.filter((r) => !r.answered).length;
  const wrong = total - correct - blank;
  return {
    total,
    correct,
    wrong,
    blank,
    percent: total ? Math.round((100 * correct) / total) : 0,
    byPart,
    results
  };
}

export function createExamService({ examBank = { exams: [], contents: {} }, contentRole }) {
  const baseExams = new Map((examBank.exams || []).map((e) => [e.id, e]));
  const baseContents = examBank.contents || {};

  async function loadExamCatalog(env) {
    const exams = new Map(baseExams);
    const contents = { ...baseContents };
    if (env.DB) {
      try {
        const rows = (
          await env.DB.prepare(
            "SELECT * FROM exam_versions WHERE status='published' ORDER BY created_at ASC"
          ).all()
        ).results;
        for (const r of rows) {
          const payload = JSON.parse(r.payload);
          const priv = JSON.parse(r.private_payload);
          const checklist = JSON.parse(r.checklist);
          const prev = exams.get(r.exam_id) || {};
          exams.set(r.exam_id, {
            ...prev,
            id: r.exam_id,
            versionId: r.version_id,
            title: r.title,
            year: r.year,
            sourceLabel: r.source_label,
            readiness: r.readiness,
            simulationEligible: Boolean(r.simulation_eligible),
            checklist,
            warnings: payload.warnings || prev.warnings || [],
            sources: payload.sources || prev.sources || {},
            partReadiness: payload.partReadiness || prev.partReadiness || {}
          });
          contents[r.exam_id] = {
            groups: payload.groups || [],
            questions: payload.questions || [],
            privateData: priv
          };
        }
      } catch {
        // Table may not exist in older unit tests that don't load 0003_exam_room.sql
      }
    }
    return { exams, contents };
  }

  function sanitizePublicContent(content) {
    if (!content) return null;
    return {
      groups: content.groups || [],
      questions: (content.questions || []).map((q) => ({
        id: q.id,
        number: q.number,
        groupId: q.groupId,
        part: q.part,
        prompt: q.prompt,
        options: q.options,
        skillTag: q.skillTag,
        relatedLessonId: q.relatedLessonId
      }))
    };
  }

  function filterQuestionsByScope(content, scopeType, scopeParts) {
    if (!content) return [];
    if (scopeType === 'full') return content.questions;
    const parts = new Set(Array.isArray(scopeParts) ? scopeParts.map(Number) : []);
    if (scopeType === 'skill') {
      const hasLC = parts.has(1) || parts.has(2) || parts.has(3) || parts.has(4);
      const target = hasLC ? new Set([1, 2, 3, 4]) : new Set([5, 6, 7]);
      return content.questions.filter((q) => target.has(q.part));
    }
    return content.questions.filter((q) => parts.has(q.part));
  }

  async function finalizeAttempt(env, user, attempt, content, exam) {
    const scopeParts = JSON.parse(attempt.scope_parts || '[]');
    const selectedQuestions = filterQuestionsByScope(content, attempt.scope_type, scopeParts);
    const answers = JSON.parse(attempt.answers_json || '{}');
    const score = gradeExamQuestions(selectedQuestions, content.privateData || {}, answers);
    const now = new Date().toISOString();
    const usedGroupIds = new Set(selectedQuestions.map((q) => q.groupId));
    const snapshot = {
      schema: 1,
      attemptId: attempt.attempt_id,
      examId: attempt.exam_id,
      examTitle: exam.title,
      versionId: attempt.version_id,
      mode: attempt.mode,
      scopeType: attempt.scope_type,
      scopeParts,
      sourceOrigin: 'server-graded',
      startedAt: attempt.started_at,
      submittedAt: now,
      answers,
      flags: JSON.parse(attempt.flags_json || '[]'),
      timing: JSON.parse(attempt.timing_json || '{}'),
      score,
      groups: (content.groups || []).filter((g) => usedGroupIds.has(g.id)),
      questions: selectedQuestions.map((q) => ({
        ...q,
        ...(content.privateData?.[q.id] || {})
      }))
    };

    await env.DB.batch([
      env.DB.prepare(
        "UPDATE exam_attempts SET status='submitted', submitted_at=?, updated_at=? WHERE attempt_id=? AND user_id=?"
      ).bind(now, now, attempt.attempt_id, user),
      env.DB.prepare(
        'INSERT OR IGNORE INTO exam_results(attempt_id,user_id,exam_id,version_id,mode,scope_type,source_origin,score_json,snapshot_json,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)'
      ).bind(
        attempt.attempt_id,
        user,
        attempt.exam_id,
        attempt.version_id,
        attempt.mode,
        attempt.scope_type,
        'server-graded',
        JSON.stringify(score),
        JSON.stringify(snapshot),
        now
      )
    ]);

    // Populate review queue for wrong and blank items
    const qMap = new Map(selectedQuestions.map((q) => [q.id, q]));
    for (const r of score.results) {
      if (r.correct) continue;
      const q = qMap.get(r.id);
      if (!q) continue;
      const sourceType = r.answered ? 'wrong' : 'blank';
      const reviewId = `rev_${user}_${q.id}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 90);
      await env.DB.prepare(
        `INSERT INTO exam_review_items(review_id,user_id,question_id,exam_id,version_id,group_id,part,skill_tag,source_type,reason,note,marked_uncertain,next_review_at,interval_days,review_count,status,created_at,updated_at)
         VALUES(?,?,?,?,?,?,?,?,?,'','',0,?,1,0,'active',?,?)
         ON CONFLICT(user_id,question_id) DO UPDATE SET
           source_type=excluded.source_type,
           version_id=excluded.version_id,
           status='active',
           next_review_at=excluded.next_review_at,
           updated_at=excluded.updated_at`
      )
        .bind(
          reviewId,
          user,
          q.id,
          attempt.exam_id,
          attempt.version_id,
          q.groupId,
          q.part,
          q.skillTag || '',
          sourceType,
          now,
          now,
          now
        )
        .run();
    }

    return snapshot;
  }

  async function handle(request, env, user, readJSON) {
    const url = new URL(request.url);
    const path = url.pathname;
    const { exams, contents } = await loadExamCatalog(env);

    // Public catalog & exam structure (NEVER exposes privateData)
    if (path === '/api/exams' && request.method === 'GET') {
      return ejson({ exams: [...exams.values()] });
    }

    if (path.startsWith('/api/exams/')) {
      const sub = path.slice('/api/exams/'.length);
      if (sub.endsWith('/check-question') && request.method === 'POST') {
        const examId = decodeURIComponent(sub.slice(0, -'/check-question'.length));
        const exam = exams.get(examId);
        if (exam?.readiness === 'reference') {
          return ejson({ error: 'Đề thuộc nhóm Tài liệu tham khảo, chưa chứng minh khớp khóa nên chưa bật tra cứu đáp án tự động.', referenceOnly: true }, 400);
        }
        const body = await readJSON(request);
        const content = contents[examId];
        const q = content?.questions?.find((x) => x.id === body.questionId);
        const priv = content?.privateData?.[body.questionId];
        if (!q || !priv) return ejson({ error: 'Không tìm thấy câu hỏi.' }, 404);
        return ejson({
          questionId: q.id,
          answer: priv.answer,
          explanation: priv.explanation,
          evidence: priv.evidence || '',
          transcript: priv.transcript || '',
          reviewStatus: priv.reviewStatus || 'approved'
        });
      }

      if (sub.endsWith('/grade') && request.method === 'POST') {
        const examId = decodeURIComponent(sub.slice(0, -'/grade'.length));
        const exam = exams.get(examId);
        const content = contents[examId];
        if (!exam || !content) return ejson({ error: 'Không tìm thấy đề thi.' }, 404);
        if (exam.readiness === 'reference') {
          return ejson({ error: 'Đề thuộc nhóm Tài liệu tham khảo, chưa đối chiếu khóa chính thức nên chưa bật tự động chấm.', referenceOnly: true }, 400);
        }
        const body = await readJSON(request);
        const scopeType = ['full', 'skill', 'part'].includes(body.scopeType) ? body.scopeType : 'full';
        const scopeParts = Array.isArray(body.scopeParts) && body.scopeParts.length ? body.scopeParts.map(Number) : [1, 2, 3, 4, 5, 6, 7];
        const selectedQuestions = filterQuestionsByScope(content, scopeType, scopeParts);
        const answers = body.answers && typeof body.answers === 'object' ? body.answers : {};
        const score = gradeExamQuestions(selectedQuestions, content.privateData || {}, answers);
        const now = new Date().toISOString();
        const usedGroupIds = new Set(selectedQuestions.map((q) => q.groupId));
        const snapshot = {
          schema: 1,
          attemptId: typeof body.attemptId === 'string' && body.attemptId ? body.attemptId : `guest_${crypto.randomUUID()}`,
          examId: exam.id,
          examTitle: exam.title,
          versionId: exam.versionId,
          mode: body.mode || 'practice',
          scopeType,
          scopeParts,
          sourceOrigin: 'guest-graded',
          startedAt: body.startedAt || now,
          submittedAt: now,
          answers,
          flags: Array.isArray(body.flags) ? body.flags : [],
          timing: body.timing && typeof body.timing === 'object' ? body.timing : {},
          score,
          groups: (content.groups || []).filter((g) => usedGroupIds.has(g.id)),
          questions: selectedQuestions.map((q) => ({
            ...q,
            ...(content.privateData?.[q.id] || {})
          }))
        };
        return ejson({ result: snapshot });
      }

      if (request.method === 'GET') {
        const examId = decodeURIComponent(sub);
        const exam = exams.get(examId);
        if (!exam) return ejson({ error: 'Không tìm thấy đề thi.' }, 404);
        const content = sanitizePublicContent(contents[examId]);
        return ejson({ exam, content });
      }
    }

    // Authenticated endpoints
    if (!user) return ejson({ error: 'Bạn cần đăng nhập để dùng phòng thi theo tài khoản.' }, 401);
    if (!env.DB) return ejson({ error: 'Lưu trữ tài khoản chưa sẵn sàng.' }, 503);
    if (!['GET', 'HEAD'].includes(request.method) && request.headers.get('origin') !== url.origin) {
      return ejson({ error: 'Nguồn gửi không hợp lệ.' }, 403);
    }

    // Admin / Editor authoring & publish (C2)
    if (path.startsWith('/api/admin/exams')) {
      const role = contentRole(user, env);
      if (!['admin', 'editor'].includes(role)) {
        return ejson({ error: 'Tài khoản không có quyền quản trị đề thi.' }, 403);
      }

      if (path === '/api/admin/exams' && request.method === 'GET') {
        const versions = (
          await env.DB.prepare(
            'SELECT version_id,exam_id,title,year,source_label,readiness,simulation_eligible,status,checklist,created_by,created_at,reviewed_by,reviewed_at,review_note FROM exam_versions ORDER BY created_at DESC LIMIT 100'
          ).all()
        ).results;
        const audit = (
          await env.DB.prepare('SELECT * FROM exam_audit ORDER BY created_at DESC LIMIT 50').all()
        ).results;
        return ejson({
          role,
          exams: [...exams.values()],
          versions: versions.map((v) => ({ ...v, checklist: JSON.parse(v.checklist) })),
          audit
        });
      }

      if (path === '/api/admin/exams/draft' && request.method === 'POST') {
        const body = await readJSON(request);
        const examId = String(body.examId || '').trim();
        if (!examId) return ejson({ error: 'Thiếu mã đề.' }, 400);
        const base = exams.get(examId);
        const content = body.content || contents[examId];
        const validationErrors = validateExamContent(content);
        if (validationErrors.length) {
          return ejson({ error: 'Đề thi chưa đạt kiểm tra cấu trúc.', details: validationErrors }, 400);
        }

        const versionId = `${examId}-v-${Date.now()}`;
        const now = new Date().toISOString();
        const sourceOrKeyChanged = Boolean(body.sourceChanged || body.keyChanged);
        const checklist = {
          sourceVerified: sourceOrKeyChanged ? false : Boolean(body.checklist?.sourceVerified),
          questionsVerified: Boolean(body.checklist?.questionsVerified ?? true),
          mediaVerified: Boolean(body.checklist?.mediaVerified ?? base?.checklist?.mediaVerified),
          keyVerified: sourceOrKeyChanged ? false : Boolean(body.checklist?.keyVerified),
          explanationsVerified: Boolean(body.checklist?.explanationsVerified)
        };
        const payload = {
          groups: content.groups,
          questions: content.questions,
          warnings: body.warnings || base?.warnings || [],
          sources: body.sources || base?.sources || {},
          partReadiness: body.partReadiness || base?.partReadiness || {}
        };
        await env.DB.batch([
          env.DB.prepare(
            'INSERT INTO exam_versions(version_id,exam_id,title,year,source_label,readiness,simulation_eligible,status,payload,private_payload,checklist,created_by,created_at,review_note) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
          ).bind(
            versionId,
            examId,
            String(body.title || base?.title || examId),
            Number(body.year || base?.year || 2023),
            String(body.sourceLabel || base?.sourceLabel || 'ETS'),
            String(body.readiness || base?.readiness || 'full'),
            body.simulationEligible ? 1 : 0,
            'draft',
            JSON.stringify(payload),
            JSON.stringify(content.privateData || {}),
            JSON.stringify(checklist),
            user,
            now,
            String(body.note || 'Bản nháp mới')
          ),
          env.DB.prepare(
            'INSERT INTO exam_audit(audit_id,exam_id,version_id,actor_id,action,detail,created_at) VALUES(?,?,?,?,?,?,?)'
          ).bind(crypto.randomUUID(), examId, versionId, user, 'create_draft', String(body.note || ''), now)
        ]);
        return ejson({ versionId, status: 'draft', checklist }, 201);
      }

      if (path.endsWith('/publish') && request.method === 'POST') {
        if (role !== 'admin') return ejson({ error: 'Chỉ quản trị viên được xuất bản đề thi.' }, 403);
        const versionId = decodeURIComponent(path.slice('/api/admin/exams/'.length, -'/publish'.length));
        const body = await readJSON(request);
        if (body.sourceChecked !== true) return ejson({ error: 'Cần xác nhận đã đối chiếu nguồn.' }, 400);
        const row = await env.DB.prepare('SELECT * FROM exam_versions WHERE version_id=?').bind(versionId).first();
        if (!row || row.status !== 'draft') return ejson({ error: 'Phiên bản không ở trạng thái nháp.' }, 409);
        const checklist = JSON.parse(row.checklist);
        if (!checklist.sourceVerified || !checklist.questionsVerified || !checklist.keyVerified) {
          return ejson({ error: 'Chưa hoàn tất checklist xác minh nguồn, câu hỏi và khóa đáp án.' }, 400);
        }
        const now = new Date().toISOString();
        await env.DB.batch([
          env.DB.prepare("UPDATE exam_versions SET status='archived' WHERE exam_id=? AND status='published'").bind(row.exam_id),
          env.DB.prepare("UPDATE exam_versions SET status='published', reviewed_by=?, reviewed_at=? WHERE version_id=?").bind(
            user,
            now,
            versionId
          ),
          env.DB.prepare(
            'INSERT INTO exam_audit(audit_id,exam_id,version_id,actor_id,action,detail,created_at) VALUES(?,?,?,?,?,?,?)'
          ).bind(crypto.randomUUID(), row.exam_id, versionId, user, 'publish', 'Xuất bản phiên bản đề', now)
        ]);
        return ejson({ versionId, status: 'published' });
      }

      if (path.endsWith('/rollback') && request.method === 'POST') {
        if (role !== 'admin') return ejson({ error: 'Chỉ quản trị viên được khôi phục phiên bản.' }, 403);
        const examId = decodeURIComponent(path.slice('/api/admin/exams/'.length, -'/rollback'.length));
        const body = await readJSON(request);
        const targetId = String(body.versionId || '');
        const target = await env.DB.prepare('SELECT * FROM exam_versions WHERE version_id=? AND exam_id=?')
          .bind(targetId, examId)
          .first();
        if (!target) return ejson({ error: 'Không tìm thấy phiên bản cần quay lại.' }, 404);
        const now = new Date().toISOString();
        await env.DB.batch([
          env.DB.prepare("UPDATE exam_versions SET status='archived' WHERE exam_id=? AND status='published'").bind(examId),
          env.DB.prepare("UPDATE exam_versions SET status='published', reviewed_by=?, reviewed_at=? WHERE version_id=?").bind(
            user,
            now,
            targetId
          ),
          env.DB.prepare(
            'INSERT INTO exam_audit(audit_id,exam_id,version_id,actor_id,action,detail,created_at) VALUES(?,?,?,?,?,?,?)'
          ).bind(crypto.randomUUID(), examId, targetId, user, 'rollback', 'Quay lại phiên bản trước', now)
        ]);
        return ejson({ examId, versionId: targetId, status: 'published' });
      }
      return ejson({ error: 'Không tìm thấy API quản trị đề.' }, 404);
    }

    // Import v17 local history (additive, provenance-labeled)
    if (path === '/api/exam-attempts/import-v17' && request.method === 'POST') {
      const body = await readJSON(request);
      const items = Array.isArray(body.items) ? body.items.slice(0, 100) : [];
      let imported = 0;
      for (const item of items) {
        if (!item || typeof item.id !== 'string' || !/^[a-zA-Z0-9_-]{4,90}$/.test(item.id)) continue;
        const attemptId = `v17_${item.id}`;
        const createdAt = typeof item.date === 'string' ? item.date : new Date().toISOString();
        const res = await env.DB.prepare(
          'INSERT OR IGNORE INTO exam_results(attempt_id,user_id,exam_id,version_id,mode,scope_type,source_origin,score_json,snapshot_json,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)'
        )
          .bind(
            attemptId,
            user,
            String(item.examId || item.docId || 'v17-worksheet'),
            'v17-local',
            'practice',
            'worksheet',
            'v17-local-import',
            JSON.stringify(item.score || { total: item.count || 0, correct: item.correct || 0 }),
            JSON.stringify({ ...item, sourceOrigin: 'v17-local-import' }),
            createdAt
          )
          .run();
        if (res.meta.changes === 1) imported++;
      }
      return ejson({ ok: true, imported });
    }

    // Create new exam attempt
    if (path === '/api/exam-attempts' && request.method === 'POST') {
      const body = await readJSON(request);
      const exam = exams.get(body.examId);
      if (!exam) return ejson({ error: 'Đề thi không tồn tại.' }, 404);
      const mode = body.mode === 'simulation' ? 'simulation' : 'practice';
      if (mode === 'simulation' && !exam.simulationEligible) {
        return ejson({ error: 'Đề này chưa đủ điều kiện nguồn cho chế độ thi mô phỏng chuẩn.' }, 400);
      }
      const content = contents[exam.id];
      if (!content) return ejson({ error: 'Đề này chưa có câu hỏi tương tác.' }, 400);

      const scopeType = ['full', 'skill', 'part'].includes(body.scopeType) ? body.scopeType : 'full';
      const scopeParts =
        scopeType === 'full'
          ? [1, 2, 3, 4, 5, 6, 7]
          : Array.isArray(body.scopeParts)
            ? body.scopeParts.map(Number).filter((p) => p >= 1 && p <= 7)
            : [1, 2, 3, 4, 5, 6, 7];

      const hasLC = scopeParts.some((p) => p <= 4);
      const currentSection = hasLC ? 'listening' : 'reading';
      const nowMs = Date.now();
      const now = new Date(nowMs).toISOString();
      let deadlineAt = null;
      if (mode === 'simulation') {
        deadlineAt = new Date(nowMs + (currentSection === 'listening' ? 45 : 75) * 60 * 1000).toISOString();
      } else if (Number.isFinite(Number(body.limitMinutes)) && Number(body.limitMinutes) > 0) {
        deadlineAt = new Date(nowMs + Number(body.limitMinutes) * 60 * 1000).toISOString();
      }

      const attemptId =
        typeof body.attemptId === 'string' && /^[a-zA-Z0-9_-]{8,100}$/.test(body.attemptId)
          ? body.attemptId
          : `ex_${crypto.randomUUID().replace(/-/g, '')}`;

      await env.DB.prepare(
        `INSERT INTO exam_attempts(attempt_id,user_id,exam_id,version_id,mode,scope_type,scope_parts,status,current_section,started_at,section_started_at,deadline_at,revision,answers_json,flags_json,timing_json,meta_json,updated_at)
         VALUES(?,?,?,?,?,?,?,?,?,?,?,?,1,'{}','[]','{}',?,?)`
      )
        .bind(
          attemptId,
          user,
          exam.id,
          exam.versionId,
          mode,
          scopeType,
          JSON.stringify(scopeParts),
          'in_progress',
          currentSection,
          now,
          now,
          deadlineAt,
          JSON.stringify({ isFirstAttempt: Boolean(body.isFirstAttempt) }),
          now
        )
        .run();

      const attempt = await env.DB.prepare('SELECT * FROM exam_attempts WHERE attempt_id=? AND user_id=?')
        .bind(attemptId, user)
        .first();
      return ejson({ attempt }, 201);
    }

    // List user's attempts & results
    if (path === '/api/exam-attempts' && request.method === 'GET') {
      const offset = Math.max(0, Math.min(100000, Math.trunc(Number(url.searchParams.get('offset')) || 0)));
      const limit = 20;
      const attempts = (
        await env.DB.prepare(
          'SELECT attempt_id,exam_id,version_id,mode,scope_type,scope_parts,status,current_section,started_at,deadline_at,submitted_at,revision,updated_at FROM exam_attempts WHERE user_id=? ORDER BY updated_at DESC LIMIT ? OFFSET ?'
        )
          .bind(user, limit + 1, offset)
          .all()
      ).results;
      const results = (
        await env.DB.prepare(
          'SELECT attempt_id,exam_id,version_id,mode,scope_type,source_origin,score_json,created_at FROM exam_results WHERE user_id=? ORDER BY created_at DESC LIMIT 50'
        )
          .bind(user)
          .all()
      ).results;
      return ejson({
        attempts: attempts.slice(0, limit).map((a) => ({ ...a, scope_parts: JSON.parse(a.scope_parts) })),
        nextOffset: attempts.length > limit ? offset + limit : null,
        results: results.map((r) => ({ ...r, score: JSON.parse(r.score_json) }))
      });
    }

    // Single attempt or sub-routes
    if (path.startsWith('/api/exam-attempts/')) {
      const rest = path.slice('/api/exam-attempts/'.length);
      const [rawId, action] = rest.split('/');
      const attemptId = decodeURIComponent(rawId);
      const attempt = await env.DB.prepare('SELECT * FROM exam_attempts WHERE attempt_id=? AND user_id=?')
        .bind(attemptId, user)
        .first();
      if (!attempt) {
        // Also check if it's an imported v17 result without an exam_attempts row
        if (!action && request.method === 'GET') {
          const resRow = await env.DB.prepare('SELECT * FROM exam_results WHERE attempt_id=? AND user_id=?')
            .bind(attemptId, user)
            .first();
          if (resRow) return ejson({ attempt: null, result: JSON.parse(resRow.snapshot_json) });
        }
        return ejson({ error: 'Không tìm thấy phiên làm bài.' }, 404);
      }

      if (!action && request.method === 'GET') {
        const resRow = await env.DB.prepare('SELECT snapshot_json FROM exam_results WHERE attempt_id=? AND user_id=?')
          .bind(attemptId, user)
          .first();
        const exam = exams.get(attempt.exam_id);
        const isOutdated = exam && attempt.version_id !== exam.versionId;
        return ejson({
          attempt: {
            ...attempt,
            scope_parts: JSON.parse(attempt.scope_parts),
            answers: JSON.parse(attempt.answers_json),
            flags: JSON.parse(attempt.flags_json),
            timing: JSON.parse(attempt.timing_json),
            meta: JSON.parse(attempt.meta_json)
          },
          result: resRow ? JSON.parse(resRow.snapshot_json) : null,
          isOutdated: Boolean(isOutdated),
          currentVersionId: exam?.versionId || attempt.version_id,
          keyCorrectionNote: isOutdated && exam?.id === 'ets-2023-test-03' ? 'Khóa đáp án đã được hiệu chỉnh sang phiên bản v2 (câu 3-4 theo nguồn 2023-lc-page-1.png).' : null
        });
      }

      if (!action && request.method === 'PATCH') {
        if (attempt.status !== 'in_progress') {
          return ejson({ error: 'Phiên làm bài đã nộp hoặc đã khóa.' }, 409);
        }
        const body = await readJSON(request);
        if (!Number.isInteger(body.revision) || body.revision !== attempt.revision) {
          return ejson(
            {
              error: 'Phiên làm bài đã được cập nhật từ thiết bị hoặc tab khác. Tải lại phiên mới nhất để tránh ghi đè.',
              serverRevision: attempt.revision
            },
            409
          );
        }
        if (attempt.mode === 'simulation' && attempt.deadline_at) {
          if (Date.now() > Date.parse(attempt.deadline_at) + 5000) {
            return ejson({ error: 'Đã hết thời gian phần thi. Hãy nộp bài để ghi nhận kết quả.', code: 'DEADLINE_EXPIRED' }, 409);
          }
        }
        const answers = body.answers && typeof body.answers === 'object' ? body.answers : JSON.parse(attempt.answers_json);
        const flags = Array.isArray(body.flags) ? body.flags : JSON.parse(attempt.flags_json);
        const timing = body.timing && typeof body.timing === 'object' ? body.timing : JSON.parse(attempt.timing_json);
        const meta = body.meta && typeof body.meta === 'object' ? body.meta : JSON.parse(attempt.meta_json);
        const now = new Date().toISOString();

        const upd = await env.DB.prepare(
          'UPDATE exam_attempts SET revision=revision+1, answers_json=?, flags_json=?, timing_json=?, meta_json=?, updated_at=? WHERE attempt_id=? AND user_id=? AND revision=? AND status=?'
        )
          .bind(
            JSON.stringify(answers),
            JSON.stringify(flags),
            JSON.stringify(timing),
            JSON.stringify(meta),
            now,
            attemptId,
            user,
            body.revision,
            'in_progress'
          )
          .run();

        if (upd.meta.changes !== 1) {
          return ejson({ error: 'Xung đột đồng bộ phiên thi. Tải lại để tiếp tục.' }, 409);
        }
        return ejson({ revision: body.revision + 1, updatedAt: now });
      }

      if (action === 'transition' && request.method === 'POST') {
        if (attempt.status !== 'in_progress') return ejson({ error: 'Phiên đã kết thúc.' }, 409);
        if (attempt.current_section === 'reading') {
          return ejson({ currentSection: 'reading', deadlineAt: attempt.deadline_at, revision: attempt.revision });
        }
        const nowMs = Date.now();
        const now = new Date(nowMs).toISOString();
        const newDeadline =
          attempt.mode === 'simulation' ? new Date(nowMs + 75 * 60 * 1000).toISOString() : attempt.deadline_at;
        await env.DB.prepare(
          "UPDATE exam_attempts SET current_section='reading', section_started_at=?, deadline_at=?, revision=revision+1, updated_at=? WHERE attempt_id=? AND user_id=?"
        )
          .bind(now, newDeadline, now, attemptId, user)
          .run();
        return ejson({ currentSection: 'reading', sectionStartedAt: now, deadlineAt: newDeadline, revision: attempt.revision + 1 });
      }

      if (action === 'check-question' && request.method === 'POST') {
        if (attempt.mode !== 'practice') {
          return ejson({ error: 'Chế độ thi mô phỏng chỉ mở đáp án và lời giải sau khi nộp bài.' }, 403);
        }
        const body = await readJSON(request);
        const content = contents[attempt.exam_id];
        const q = content?.questions?.find((x) => x.id === body.questionId);
        const priv = content?.privateData?.[body.questionId];
        if (!q || !priv) return ejson({ error: 'Không tìm thấy câu hỏi.' }, 404);
        return ejson({
          questionId: q.id,
          answer: priv.answer,
          explanation: priv.explanation,
          evidence: priv.evidence || '',
          transcript: priv.transcript || '',
          reviewStatus: priv.reviewStatus || 'approved'
        });
      }

      if (action === 'submit' && request.method === 'POST') {
        // Idempotent check
        const existing = await env.DB.prepare('SELECT snapshot_json FROM exam_results WHERE attempt_id=? AND user_id=?')
          .bind(attemptId, user)
          .first();
        if (existing) {
          return ejson({ result: JSON.parse(existing.snapshot_json), idempotent: true }, 200);
        }
        const body = await readJSON(request).catch(() => ({}));
        if (body.answers && typeof body.answers === 'object') {
          const merged = { ...JSON.parse(attempt.answers_json || '{}'), ...body.answers };
          attempt.answers_json = JSON.stringify(merged);
        }
        if (Array.isArray(body.flags)) attempt.flags_json = JSON.stringify(body.flags);
        if (body.timing && typeof body.timing === 'object') attempt.timing_json = JSON.stringify(body.timing);

        const content = contents[attempt.exam_id];
        const exam = exams.get(attempt.exam_id);
        if (!content || !exam) return ejson({ error: 'Không tìm thấy nội dung đề để chấm.' }, 404);
        const snapshot = await finalizeAttempt(env, user, attempt, content, exam);
        return ejson({ result: snapshot, idempotent: false }, 201);
      }

      if (action === 'regrade' && request.method === 'POST') {
        const exam = exams.get(attempt.exam_id);
        const content = contents[attempt.exam_id];
        if (!exam || !content) return ejson({ error: 'Không tìm thấy nội dung đề để chấm lại.' }, 404);

        const currentVersionId = exam.versionId;
        const prevVersionId = attempt.version_id;

        const scopeParts = JSON.parse(attempt.scope_parts || '[]');
        const selectedQuestions = filterQuestionsByScope(content, attempt.scope_type, scopeParts);
        const answers = JSON.parse(attempt.answers_json || '{}');
        const score = gradeExamQuestions(selectedQuestions, content.privateData || {}, answers);
        const now = new Date().toISOString();
        const usedGroupIds = new Set(selectedQuestions.map((q) => q.groupId));

        const regradeAttemptId = `${attemptId}__regrade_${currentVersionId}`;
        const snapshot = {
          schema: 1,
          attemptId: regradeAttemptId,
          originalAttemptId: attemptId,
          examId: attempt.exam_id,
          examTitle: exam.title,
          versionId: currentVersionId,
          previousVersionId: prevVersionId,
          regradedAt: now,
          mode: attempt.mode,
          scopeType: attempt.scope_type,
          scopeParts,
          sourceOrigin: 'server-regraded',
          startedAt: attempt.started_at,
          submittedAt: now,
          answers,
          flags: JSON.parse(attempt.flags_json || '[]'),
          timing: JSON.parse(attempt.timing_json || '{}'),
          score,
          groups: (content.groups || []).filter((g) => usedGroupIds.has(g.id)),
          questions: selectedQuestions.map((q) => ({
            ...q,
            ...(content.privateData?.[q.id] || {})
          }))
        };

        // Insert new linked record in exam_results, leaving original attempt intact!
        await env.DB.prepare(
          'INSERT OR REPLACE INTO exam_results(attempt_id,user_id,exam_id,version_id,mode,scope_type,source_origin,score_json,snapshot_json,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)'
        ).bind(
          regradeAttemptId,
          user,
          attempt.exam_id,
          currentVersionId,
          attempt.mode,
          attempt.scope_type,
          'server-regraded',
          JSON.stringify(score),
          JSON.stringify(snapshot),
          now
        ).run();

        return ejson({
          regraded: true,
          originalAttemptId: attemptId,
          regradeAttemptId,
          previousVersionId: prevVersionId,
          currentVersionId,
          result: snapshot
        }, 200);
      }
    }

    // Error Notebook & Review Queue (B2)
    if (path === '/api/exam-review' && request.method === 'GET') {
      const rows = (
        await env.DB.prepare(
          "SELECT * FROM exam_review_items WHERE user_id=? AND status='active' ORDER BY next_review_at ASC LIMIT 300"
        )
          .bind(user)
          .all()
      ).results;
      return ejson({ items: rows });
    }

    if (path === '/api/exam-review/session' && request.method === 'GET') {
      const filter = url.searchParams.get('filter') || 'all';
      const partFilter = Number(url.searchParams.get('part'));
      const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit')) || 20));
      let sql = "SELECT * FROM exam_review_items WHERE user_id=? AND status='active'";
      const params = [user];
      if (filter === 'wrong') {
        sql += " AND source_type='wrong'";
      } else if (filter === 'blank') {
        sql += " AND source_type='blank'";
      } else if (filter === 'uncertain') {
        sql += " AND (marked_uncertain=1 OR source_type='uncertain')";
      }
      if (Number.isInteger(partFilter) && partFilter >= 1 && partFilter <= 7) {
        sql += " AND part=?";
        params.push(partFilter);
      }
      sql += " ORDER BY next_review_at ASC LIMIT ?";
      params.push(limit);
      const rows = (await env.DB.prepare(sql).bind(...params).all()).results;

      const sessionQuestions = [];
      for (const item of rows) {
        const content = contents[item.exam_id];
        const q = content?.questions?.find((x) => x.id === item.question_id);
        if (!q) continue;
        const g = content?.groups?.find((x) => x.id === q.groupId);
        sessionQuestions.push({
          reviewId: item.review_id,
          item,
          group: g || null,
          question: {
            id: q.id,
            number: q.number,
            part: q.part,
            groupId: q.groupId,
            prompt: q.prompt,
            options: q.options,
            skillTag: q.skillTag || '',
            relatedLessonId: q.relatedLessonId || ''
          }
        });
      }
      return ejson({ items: sessionQuestions });
    }

    if (path === '/api/exam-review/check' && request.method === 'POST') {
      const body = await readJSON(request);
      const qid = String(body.questionId || '');
      let found = null;
      let priv = null;
      for (const [examId, content] of Object.entries(contents)) {
        const q = content?.questions?.find((x) => x.id === qid);
        if (q) {
          found = q;
          priv = content?.privateData?.[qid];
          break;
        }
      }
      if (!found || !priv) return ejson({ error: 'Không tìm thấy câu hỏi.' }, 404);
      const chosen = Number(body.chosen);
      const correct = Number.isInteger(chosen) && chosen === priv.answer;
      return ejson({
        questionId: found.id,
        chosen: Number.isInteger(chosen) ? chosen : null,
        correct,
        correctAnswer: priv.answer,
        explanation: priv.explanation || '',
        evidence: priv.evidence || '',
        transcript: priv.transcript || '',
        reviewStatus: priv.reviewStatus || 'approved'
      });
    }

    if (path === '/api/exam-review/mark' && request.method === 'POST') {
      const body = await readJSON(request);
      const qid = String(body.questionId || '');
      const examId = String(body.examId || '');
      const content = contents[examId];
      const q = content?.questions?.find((x) => x.id === qid);
      if (!q) return ejson({ error: 'Không tìm thấy câu hỏi.' }, 404);
      const now = new Date().toISOString();
      const reviewId = `rev_${user}_${q.id}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 90);
      await env.DB.prepare(
        `INSERT INTO exam_review_items(review_id,user_id,question_id,exam_id,version_id,group_id,part,skill_tag,source_type,reason,note,marked_uncertain,next_review_at,interval_days,review_count,status,created_at,updated_at)
         VALUES(?,?,?,?,?,?,?,?,?,'','',1,?,1,0,'active',?,?)
         ON CONFLICT(user_id,question_id) DO UPDATE SET marked_uncertain=1, status='active', updated_at=excluded.updated_at`
      )
        .bind(reviewId, user, q.id, examId, exams.get(examId)?.versionId || 'v1', q.groupId, q.part, q.skillTag || '', 'uncertain', now, now, now)
        .run();
      return ejson({ reviewId, markedUncertain: true });
    }

    if (path.startsWith('/api/exam-review/') && request.method === 'PUT') {
      const reviewId = decodeURIComponent(path.slice('/api/exam-review/'.length));
      const row = await env.DB.prepare('SELECT * FROM exam_review_items WHERE review_id=? AND user_id=?')
        .bind(reviewId, user)
        .first();
      if (!row) return ejson({ error: 'Không tìm thấy mục ôn tập.' }, 404);
      const body = await readJSON(request);
      const reason = typeof body.reason === 'string' ? body.reason.slice(0, 40) : row.reason;
      const note = typeof body.note === 'string' ? body.note.slice(0, 2000) : row.note;
      const markedUncertain = body.markedUncertain !== undefined ? (body.markedUncertain ? 1 : 0) : row.marked_uncertain;
      const status = ['active', 'mastered'].includes(body.status) ? body.status : row.status;
      let intervalDays = Number.isInteger(body.intervalDays) && body.intervalDays >= 1 ? body.intervalDays : row.interval_days;
      let reviewCount = row.review_count;
      let nextReviewAt = row.next_review_at;
      let lastReviewedAt = row.last_reviewed_at;
      if (body.recordReview) {
        reviewCount += 1;
        lastReviewedAt = new Date().toISOString();
        nextReviewAt = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000).toISOString();
      }
      const now = new Date().toISOString();
      await env.DB.prepare(
        'UPDATE exam_review_items SET reason=?, note=?, marked_uncertain=?, interval_days=?, review_count=?, next_review_at=?, last_reviewed_at=?, status=?, updated_at=? WHERE review_id=? AND user_id=?'
      )
        .bind(reason, note, markedUncertain, intervalDays, reviewCount, nextReviewAt, lastReviewedAt, status, now, reviewId, user)
        .run();
      return ejson({ ok: true, intervalDays, nextReviewAt, reviewCount, status });
    }

    return ejson({ error: 'Không tìm thấy API phòng thi.' }, 404);
  }

  async function findQuestion(env, questionId) {
    const { contents, exams } = await loadExamCatalog(env);
    for (const [examId, content] of Object.entries(contents)) {
      const q = content?.questions?.find((x) => x.id === questionId);
      if (q) {
        return { question: q, versionId: exams.get(examId)?.versionId || 'v1', examId };
      }
    }
    return null;
  }

  return { handle, loadExamCatalog, findQuestion };
}
