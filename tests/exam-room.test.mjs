import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { contentMetadata } from '../scripts/lib/content.mjs';
import { createWorker } from '../src/server/index.mjs';
import { validateExamContent } from '../src/server/exam-service.mjs';
import { DatabaseSync, d1Adapter } from '../scripts/lib/d1-local.mjs';
import { computeTimerState, analyzeExamHistory, canStartMode, filterExams, computePartMatrix } from '../src/client/exam-core.mjs';

const bank = JSON.parse(await readFile(new URL('../data/learning-bank.json', import.meta.url), 'utf8'));
const examBank = JSON.parse(await readFile(new URL('../data/exam-bank.json', import.meta.url), 'utf8'));
const metadata = contentMetadata(bank);

const db = new DatabaseSync(':memory:');
db.exec(await readFile(new URL('../drizzle/0000_learning_accounts.sql', import.meta.url), 'utf8'));
db.exec(await readFile(new URL('../drizzle/0001_content_review.sql', import.meta.url), 'utf8'));
db.exec(await readFile(new URL('../drizzle/0002_document_imports.sql', import.meta.url), 'utf8'));
db.exec(await readFile(new URL('../drizzle/0003_exam_room.sql', import.meta.url), 'utf8'));

const env = { DB: d1Adapter(db), TOEIC_ADMIN_USER_IDS: 'admin-1', TOEIC_EDITOR_USER_IDS: 'editor-1' };
const worker = createWorker({ assets: { '/index.html': { body: 'ok', type: 'text/html' } }, bank, ...metadata, examBank });

const req = async (path, method = 'GET', data, user = 'user-A', origin = 'https://toeic.test') => {
  const headers = { 'content-type': 'application/json', origin };
  if (user) headers['oai-authenticated-user-id'] = user;
  const res = await worker.fetch(
    new Request('https://toeic.test' + path, {
      method,
      headers,
      body: method === 'GET' ? undefined : JSON.stringify(data)
    }),
    env
  );
  return { status: res.status, data: await res.json() };
};

// 1. Content & Inventory invariants (A1 + A3)
assert.equal(examBank.exams.length, 30, 'Inventory must cover all 30 ETS tests');
const pilot = examBank.contents['ets-2023-test-01'];
assert.equal(validateExamContent(pilot).length, 0, 'Pilot 200-question exam must pass all structural checks');
assert.equal(pilot.questions.length, 200);
assert.equal(new Set(pilot.questions.map((q) => q.number)).size, 200);

const publicList = await req('/api/exams', 'GET', null, null);
assert.equal(publicList.status, 200);
assert.equal(publicList.data.exams.length, 30);

const publicPilot = await req('/api/exams/ets-2023-test-01', 'GET', null, null);
assert.equal(publicPilot.status, 200);
assert.equal(publicPilot.data.content.questions.length, 200);
for (const q of publicPilot.data.content.questions) {
  assert.equal(q.answer, undefined, 'Public exam payload must NEVER expose answer key');
  assert.equal(q.explanation, undefined, 'Public exam payload must NEVER expose explanation');
  assert.equal(q.transcript, undefined, 'Public exam payload must NEVER expose transcript');
  if (q.part === 2) assert.deepEqual(q.options, ['A', 'B', 'C']);
}

// 2. Media & Readiness gating (A1 + A4)
const ets24 = publicList.data.exams.find((e) => e.id === 'ets-2024-test-01');
const ets25 = publicList.data.exams.find((e) => e.id === 'ets-2025-test-01');
assert.equal(ets24.simulationEligible, false);
assert.equal(canStartMode(ets24, 'simulation'), false);
assert.equal(ets25.readiness, 'reference');
assert.equal(canStartMode(ets25, 'simulation'), false);
assert.equal(filterExams(publicList.data.exams, { year: '2024' }).length, 10);

const blockedSim = await req('/api/exam-attempts', 'POST', { examId: 'ets-2024-test-01', mode: 'simulation' });
assert.equal(blockedSim.status, 400, 'Server must reject simulation mode for ineligible exam');

// 3. Simulation Attempt, Timer, Section Transition, Revision Conflict, Idempotent Submit
const createdSim = await req('/api/exam-attempts', 'POST', { examId: 'ets-2023-test-01', mode: 'simulation', scopeType: 'full' });
assert.equal(createdSim.status, 201);
const simId = createdSim.data.attempt.attempt_id;
assert.equal(createdSim.data.attempt.current_section, 'listening');
assert.ok(createdSim.data.attempt.deadline_at);

// Timer helper checks
const nowMs = Date.now();
assert.equal(computeTimerState({ deadline_at: new Date(nowMs + 60000).toISOString() }, nowMs).expired, false);
assert.equal(computeTimerState({ deadline_at: new Date(nowMs - 1000).toISOString() }, nowMs).expired, true);

// Practice check blocked during simulation
const blockedCheck = await req(`/api/exam-attempts/${simId}/check-question`, 'POST', { questionId: 'ets23-t01-q01' });
assert.equal(blockedCheck.status, 403);

// Save answer batch & revision conflict check
const q1 = pilot.questions[0];
const q1Ans = pilot.privateData[q1.id].answer;
const q2 = pilot.questions[1];
const q2Wrong = (pilot.privateData[q2.id].answer + 1) % 4;

const patchOk = await req(`/api/exam-attempts/${simId}`, 'PATCH', {
  revision: 1,
  answers: { [q1.id]: q1Ans, [q2.id]: q2Wrong },
  flags: [q2.id]
});
assert.equal(patchOk.status, 200);
assert.equal(patchOk.data.revision, 2);

const patchStale = await req(`/api/exam-attempts/${simId}`, 'PATCH', {
  revision: 1,
  answers: { [q1.id]: 0 }
});
assert.equal(patchStale.status, 409, 'Stale device revision must be rejected with 409');

// Transition Listening -> Reading
const trans = await req(`/api/exam-attempts/${simId}/transition`, 'POST', {});
assert.equal(trans.status, 200);
assert.equal(trans.data.currentSection, 'reading');

// Account isolation: User B cannot read User A's attempt
assert.equal((await req(`/api/exam-attempts/${simId}`, 'GET', null, 'user-B')).status, 404);

// Expired deadline check
db.prepare('UPDATE exam_attempts SET deadline_at=? WHERE attempt_id=?').run(new Date(Date.now() - 20000).toISOString(), simId);
const expiredPatch = await req(`/api/exam-attempts/${simId}`, 'PATCH', { revision: 3, answers: {} });
assert.equal(expiredPatch.status, 409);
assert.equal(expiredPatch.data.code, 'DEADLINE_EXPIRED');

// Submit (server-graded + idempotent)
const sub1 = await req(`/api/exam-attempts/${simId}/submit`, 'POST', {});
assert.equal(sub1.status, 201);
assert.equal(sub1.data.result.score.total, 200);
assert.equal(sub1.data.result.score.correct, 1);
assert.equal(sub1.data.result.score.wrong, 1);
assert.equal(sub1.data.result.score.blank, 198);

const sub2 = await req(`/api/exam-attempts/${simId}/submit`, 'POST', {});
assert.equal(sub2.status, 200);
assert.equal(sub2.data.idempotent, true);
assert.deepEqual(sub2.data.result, sub1.data.result);

// 4. Practice mode check-question allowed
const prac = await req('/api/exam-attempts', 'POST', {
  examId: 'ets-2023-test-01',
  mode: 'practice',
  scopeType: 'part',
  scopeParts: [5]
});
assert.equal(prac.status, 201);
const pracCheck = await req(`/api/exam-attempts/${prac.data.attempt.attempt_id}/check-question`, 'POST', {
  questionId: 'ets23-t01-q101'
});
assert.equal(pracCheck.status, 200);
assert.ok(pracCheck.data.explanation);

// 5. Error Notebook (B2), Review Session & Analytics (B3)
const revList = await req('/api/exam-review', 'GET');
assert.equal(revList.status, 200);
assert.ok(revList.data.items.length >= 1);
const firstRev = revList.data.items[0];
const updRev = await req(`/api/exam-review/${firstRev.review_id}`, 'PUT', {
  reason: 'vocab',
  recordReview: true,
  intervalDays: 3
});
assert.equal(updRev.status, 200);
assert.equal(updRev.data.intervalDays, 3);
assert.equal(updRev.data.reviewCount, 1);

// Interactive review session runner endpoints
const revSession = await req('/api/exam-review/session?limit=10', 'GET');
assert.equal(revSession.status, 200);
assert.ok(revSession.data.items.length >= 1);
const sessQ = revSession.data.items[0];
assert.ok(sessQ.question.prompt);
assert.equal(sessQ.question.answer, undefined, 'Review session payload must not leak answer');
assert.equal(sessQ.question.explanation, undefined, 'Review session payload must not leak explanation');

// On-demand server verification in review session
const revCheck = await req('/api/exam-review/check', 'POST', {
  questionId: sessQ.question.id,
  chosen: 0
});
assert.equal(revCheck.status, 200);
assert.equal(typeof revCheck.data.correct, 'boolean');
assert.ok(revCheck.data.explanation);

// Content report submission on exam question
const rep = await req('/api/reports', 'POST', {
  id: 'rep_exam_001',
  questionId: sessQ.question.id,
  reason: 'explanation',
  detail: 'Cần giải thích rõ thêm lý do phương án C sai.'
});
assert.equal(rep.status, 201);

const analytics = analyzeExamHistory([sub1.data.result, sub1.data.result], examBank.exams);
assert.equal(analytics.firstAttempts.length, 1);
assert.equal(analytics.retakes.length, 1);
assert.ok(analytics.recommendations.length <= 3);

// 7-Part Matrix computation
const matrix = computePartMatrix([sub1.data.result]);
assert.equal(Object.keys(matrix).length, 7);
assert.equal(matrix[1].total, 6);
assert.equal(matrix[2].total, 25);
assert.equal(matrix[7].total, 54);

// Practice with time limit
const timedPrac = await req('/api/exam-attempts', 'POST', {
  examId: 'ets-2023-test-01',
  mode: 'practice',
  scopeType: 'part',
  scopeParts: [5],
  limitMinutes: 20
});
assert.equal(timedPrac.status, 201);
assert.ok(timedPrac.data.attempt.deadline_at);

// 6. v17 Additive Import (C1)
const imp = await req('/api/exam-attempts/import-v17', 'POST', {
  items: [{ id: 'doc123', count: 20, correct: 15, date: '2026-01-01T00:00:00.000Z' }]
});
assert.equal(imp.status, 200);
assert.equal(imp.data.imported, 1);

// 7. Admin Authoring, Validation, Publish & Rollback (C2)
const badDraft = await req('/api/admin/exams/draft', 'POST', {
  examId: 'ets-2023-test-01',
  content: { groups: [], questions: [{ id: 'x', number: 7, groupId: 'g', part: 2, options: ['A', 'B', 'C', 'D'] }], privateData: {} }
}, 'editor-1');
assert.equal(badDraft.status, 400, 'Part 2 with 4 options must be rejected');

const goodDraft = await req('/api/admin/exams/draft', 'POST', {
  examId: 'ets-2023-test-01',
  title: 'ETS 2023 · Test 01 (Reviewed)',
  sourceChanged: true,
  checklist: { sourceVerified: true, questionsVerified: true, mediaVerified: true, keyVerified: true },
  content: pilot,
  note: 'Kiểm tra đổi nguồn'
}, 'editor-1');
assert.equal(goodDraft.status, 201);
assert.equal(goodDraft.data.checklist.sourceVerified, false, 'Source change must revoke sourceVerified');

const verifiedDraft = await req('/api/admin/exams/draft', 'POST', {
  examId: 'ets-2023-test-01',
  title: 'ETS 2023 · Test 01 (v2)',
  simulationEligible: true,
  checklist: { sourceVerified: true, questionsVerified: true, mediaVerified: true, keyVerified: true, explanationsVerified: true },
  content: pilot,
  note: 'Đã đối chiếu nguồn đầy đủ'
}, 'admin-1');
assert.equal(verifiedDraft.status, 201);

const pub = await req(`/api/admin/exams/${verifiedDraft.data.versionId}/publish`, 'POST', { sourceChecked: true }, 'admin-1');
assert.equal(pub.status, 200);
assert.equal(pub.data.status, 'published');

db.close();
console.log(JSON.stringify({
  ok: true,
  exams: 30,
  pilotQuestions: 200,
  noLeakedKeys: true,
  simulationGating: true,
  revisionConflict: true,
  idempotentSubmit: true,
  accountIsolation: true,
  reviewQueue: true,
  v17Import: true,
  adminWorkflow: true
}));
