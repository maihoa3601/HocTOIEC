import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { contentMetadata } from '../scripts/lib/content.mjs';
import { createWorker } from '../src/server/index.mjs';
import { DatabaseSync, d1Adapter } from '../scripts/lib/d1-local.mjs';

const bank = JSON.parse(await readFile(new URL('../data/learning-bank.json', import.meta.url), 'utf8'));
const examBank = JSON.parse(await readFile(new URL('../data/exam-bank.json', import.meta.url), 'utf8'));
const examCatalog = JSON.parse(await readFile(new URL('../data/exam-catalog.json', import.meta.url), 'utf8'));
const examKeys = JSON.parse(await readFile(new URL('../data/exam-keys.json', import.meta.url), 'utf8'));
const keyReview = JSON.parse(await readFile(new URL('../docs/exam-key-review.json', import.meta.url), 'utf8'));
const metadata = contentMetadata(bank);

const db = new DatabaseSync(':memory:');
db.exec(await readFile(new URL('../drizzle/0000_learning_accounts.sql', import.meta.url), 'utf8'));
db.exec(await readFile(new URL('../drizzle/0001_content_review.sql', import.meta.url), 'utf8'));
db.exec(await readFile(new URL('../drizzle/0002_document_imports.sql', import.meta.url), 'utf8'));
db.exec(await readFile(new URL('../drizzle/0003_exam_room.sql', import.meta.url), 'utf8'));

const env = { DB: d1Adapter(db), TOEIC_ADMIN_USER_IDS: 'admin-1', TOEIC_EDITOR_USER_IDS: 'editor-1' };
const worker = createWorker({ assets: { '/index.html': { body: 'ok', type: 'text/html' } }, bank, ...metadata, examBank });

const req = async (path, method = 'GET', data, user = 'user-test', origin = 'https://toeic.test') => {
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

console.log('Running TOEIC Exam Standardization & Key Audit Verification Tests...');

// -------------------------------------------------------------
// 1. Independent Verification of Question 3 & 4 (ETS 2023 Test 3)
// -------------------------------------------------------------
{
  // Independent expectation defined strictly from the audit voucher (docs/exam-key-review.json)
  // Source: 2023-lc-page-1.png (bảng TEST 3 ở nửa dưới bên trái)
  const EXPECTED_Q3_LETTER = 'B';
  const EXPECTED_Q3_INDEX = 1;
  const EXPECTED_Q4_LETTER = 'C';
  const EXPECTED_Q4_INDEX = 2;

  const test3Exam = examBank.exams.find((e) => e.id === 'ets-2023-test-03');
  assert.ok(test3Exam, 'ETS 2023 Test 03 exists in catalog');
  assert.equal(test3Exam.versionId, 'ets-2023-test-03-v2', 'Test 03 versionId bumped to v2');
  assert.equal(test3Exam.keyVersion, 'v2', 'Test 03 keyVersion is v2');

  const test3Content = examBank.contents['ets-2023-test-03'];
  assert.ok(test3Content, 'ETS 2023 Test 03 content exists');

  const q3Priv = test3Content.privateData['ets23-t03-q03'];
  const q4Priv = test3Content.privateData['ets23-t03-q04'];
  assert.ok(q3Priv && q4Priv, 'Q3 and Q4 private data exists');

  // Verify internal answer matches independent audit expectations
  assert.equal(q3Priv.answer, EXPECTED_Q3_INDEX, 'Q3 answer must be B (index 1)');
  assert.equal(q4Priv.answer, EXPECTED_Q4_INDEX, 'Q4 answer must be C (index 2)');
  assert.equal(q3Priv.keyCorrectionId, 'ERR-KEY-2023-T03-Q03-04', 'Q3 carries keyCorrectionId');
  assert.equal(q4Priv.keyCorrectionId, 'ERR-KEY-2023-T03-Q03-04', 'Q4 carries keyCorrectionId');

  // Server grading test: B & C graded correct (2/2)
  const gradeCorrect = await req('/api/exams/ets-2023-test-03/grade', 'POST', {
    answers: {
      'ets23-t03-q03': EXPECTED_Q3_INDEX,
      'ets23-t03-q04': EXPECTED_Q4_INDEX
    },
    scopeType: 'part',
    scopeParts: [1]
  }, null);
  assert.equal(gradeCorrect.status, 200);
  const q3Res = gradeCorrect.data.result.score.results.find((r) => r.id === 'ets23-t03-q03');
  const q4Res = gradeCorrect.data.result.score.results.find((r) => r.id === 'ets23-t03-q04');
  assert.equal(q3Res.correct, true, 'Q3 answered with B must be graded correct');
  assert.equal(q4Res.correct, true, 'Q4 answered with C must be graded correct');

  // Server grading test: Erroneous C & B graded wrong (0/2)
  const gradeErroneous = await req('/api/exams/ets-2023-test-03/grade', 'POST', {
    answers: {
      'ets23-t03-q03': 2, // C (old erroneous key)
      'ets23-t03-q04': 1  // B (old erroneous key)
    },
    scopeType: 'part',
    scopeParts: [1]
  }, null);
  assert.equal(gradeErroneous.status, 200);
  const q3ErrRes = gradeErroneous.data.result.score.results.find((r) => r.id === 'ets23-t03-q03');
  const q4ErrRes = gradeErroneous.data.result.score.results.find((r) => r.id === 'ets23-t03-q04');
  assert.equal(q3ErrRes.correct, false, 'Q3 answered with old key C must be graded wrong');
  assert.equal(q4ErrRes.correct, false, 'Q4 answered with old key B must be graded wrong');
}

// -------------------------------------------------------------
// 2. Reading 2023 Merged PDF Page Mappings
// -------------------------------------------------------------
{
  const ets23Exams = examCatalog.exams.filter((e) => e.year === 2023);
  assert.equal(ets23Exams.length, 10, '10 ETS 2023 tests in catalog');

  let expectedStart = 2;
  for (const e of ets23Exams) {
    const rcSource = e.sources.rcPdf;
    assert.ok(rcSource, `Exam ${e.id} must have rcPdf source`);
    assert.equal(rcSource.merged, true, 'Reading 2023 must be marked as merged PDF');
    assert.equal(rcSource.startPage, expectedStart, `Exam ${e.id} startPage must be ${expectedStart}`);
    assert.equal(rcSource.endPage, expectedStart + 33, `Exam ${e.id} endPage must be ${expectedStart + 33}`);
    expectedStart += 34;
  }
}

// -------------------------------------------------------------
// 3. Media & Readiness Gating (2024 Fast Audio & 2025 Reference)
// -------------------------------------------------------------
{
  // ETS 2024 has fast audio (고속)
  for (let n = 1; n <= 10; n++) {
    const pad = String(n).padStart(2, '0');
    const exam = examCatalog.exams.find((e) => e.id === `ets-2024-test-${pad}`);
    assert.ok(exam);
    assert.equal(exam.simulationEligible, false, 'ETS 2024 cannot be used for standard simulation');
    assert.equal(exam.sources.audio.speed, 'fast');
    assert.ok(exam.warnings.some((w) => /고속|nhanh/i.test(w)), 'ETS 2024 warnings must mention fast audio');
  }

  // ETS 2025 has unverified YBM transcript
  for (let n = 1; n <= 10; n++) {
    const pad = String(n).padStart(2, '0');
    const exam = examCatalog.exams.find((e) => e.id === `ets-2025-test-${pad}`);
    assert.ok(exam);
    assert.equal(exam.readiness, 'reference', 'ETS 2025 must have readiness: reference');
    assert.equal(exam.simulationEligible, false, 'ETS 2025 cannot be used for simulation');
    assert.ok(exam.warnings.some((w) => /YBM/i.test(w)), 'ETS 2025 warnings must mention YBM label');
  }

  // Server blocks auto-grade and check-question for reference exams
  const refGrade = await req('/api/exams/ets-2025-test-01/grade', 'POST', { answers: {} }, null);
  assert.equal(refGrade.status, 400, 'Server must block auto-grading on reference exams');
  assert.equal(refGrade.data.referenceOnly, true);

  const refCheck = await req('/api/exams/ets-2025-test-01/check-question', 'POST', { questionId: 'any' }, null);
  assert.equal(refCheck.status, 400, 'Server must block check-question on reference exams');
  assert.equal(refCheck.data.referenceOnly, true);
}

// -------------------------------------------------------------
// 4. Regrading & Immutability of History Across Key Versions
// -------------------------------------------------------------
{
  const user = 'user-regrade-test';
  const attemptId = 'ex_legacy_attempt_001';
  const now = new Date().toISOString();

  // Create legacy attempt with older key version v1 for test 03
  db.prepare(`
    INSERT INTO exam_attempts(attempt_id,user_id,exam_id,version_id,mode,scope_type,scope_parts,status,current_section,started_at,section_started_at,deadline_at,revision,answers_json,flags_json,timing_json,meta_json,updated_at)
    VALUES(?, ?, 'ets-2023-test-03', 'ets-2023-test-03-v1', 'practice', 'part', '[1]', 'submitted', 'reading', ?, ?, null, 1, ?, '[]', '{}', '{}', ?)
  `).run(
    attemptId,
    user,
    now,
    now,
    JSON.stringify({
      'ets23-t03-q03': 1, // B
      'ets23-t03-q04': 2  // C
    }),
    now
  );

  // Insert original result scored under v1
  const origScore = {
    total: 6,
    correct: 0,
    wrong: 2,
    blank: 4,
    percent: 0,
    byPart: { 1: { part: 1, total: 6, correct: 0, wrong: 2, blank: 4 } }
  };
  db.prepare(`
    INSERT INTO exam_results(attempt_id,user_id,exam_id,version_id,mode,scope_type,source_origin,score_json,snapshot_json,created_at)
    VALUES(?, ?, 'ets-2023-test-03', 'ets-2023-test-03-v1', 'practice', 'part', 'server-graded', ?, ?, ?)
  `).run(
    attemptId,
    user,
    JSON.stringify(origScore),
    JSON.stringify({ attemptId, versionId: 'ets-2023-test-03-v1', score: origScore }),
    now
  );

  // GET attempt checks outdated status
  const getAttempt = await req(`/api/exam-attempts/${attemptId}`, 'GET', null, user);
  assert.equal(getAttempt.status, 200);
  assert.equal(getAttempt.data.isOutdated, true, 'Attempt under v1 must be flagged as isOutdated');
  assert.equal(getAttempt.data.currentVersionId, 'ets-2023-test-03-v2');
  assert.ok(getAttempt.data.keyCorrectionNote);

  // Call regrade endpoint
  const regradeRes = await req(`/api/exam-attempts/${attemptId}/regrade`, 'POST', {}, user);
  assert.equal(regradeRes.status, 200);
  assert.equal(regradeRes.data.regraded, true);
  assert.equal(regradeRes.data.previousVersionId, 'ets-2023-test-03-v1');
  assert.equal(regradeRes.data.currentVersionId, 'ets-2023-test-03-v2');

  const newResult = regradeRes.data.result;
  assert.equal(newResult.score.correct, 2, 'Under v2, B and C are graded correct (2/2)');

  // Verify original v1 record is IMMUTABLE and still preserved in DB
  const origRow = db.prepare('SELECT * FROM exam_results WHERE attempt_id=?').get(attemptId);
  assert.ok(origRow, 'Original result record must NOT be deleted');
  assert.equal(origRow.version_id, 'ets-2023-test-03-v1', 'Original result version_id remains v1');
  assert.equal(JSON.parse(origRow.score_json).correct, 0, 'Original result score remains unchanged');

  // Verify new linked record exists in DB
  const newRow = db.prepare('SELECT * FROM exam_results WHERE attempt_id=?').get(regradeRes.data.regradeAttemptId);
  assert.ok(newRow, 'New regraded result record exists');
  assert.equal(newRow.version_id, 'ets-2023-test-03-v2');
  assert.equal(JSON.parse(newRow.score_json).correct, 2);
}

db.close();

console.log(JSON.stringify({
  ok: true,
  independentAuditQ3Q4: true,
  q3ExpectedB: true,
  q4ExpectedC: true,
  reading2023PageMap: true,
  audio2024FastWarning: true,
  reference2025Gating: true,
  regradeWithoutMutatingHistory: true
}));
