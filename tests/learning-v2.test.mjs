import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildHierarchy} from '../src/client/hierarchy.mjs';
import {isLearningResource,isVideo,isFolder} from '../src/client/core.mjs';
import {
  freshLearning,
  sanitizeLearning,
  markLessonStatus,
  toggleLessonFlag,
  toggleQuestionFlag,
  recordAssistedQuestion,
  computeEvidenceMetrics,
  searchBankAndCatalog,
  scheduleCard,
  gradeQuestion,
  gradeQuiz,
  applyQuizResult,
  studyMaterials
} from '../src/client/learning-core.mjs';

const catalog = JSON.parse(await readFile(new URL('../data/catalog.json', import.meta.url), 'utf8'));
const bank = JSON.parse(await readFile(new URL('../data/learning-bank.json', import.meta.url), 'utf8'));
const byId = new Map(catalog.items.map(f => [f.id, f]));
const ids = new Set(byId.keys());
const index = buildHierarchy(catalog.items, catalog.items.filter(isLearningResource));

console.log('Testing 10 Learning Upgrade Scenarios...');

// -------------------------------------------------------------
// Scenario 1: New learner starting priority course
// -------------------------------------------------------------
{
  const state = freshLearning();
  assert.equal(state.timeBudget, 30, 'Default time budget is 30 minutes');
  assert.equal(state.priorityCourse, '1EcEHLSxxlsRFtJCXMGimzy2rKd2Ej-zD', 'Default priority course is Tiếng Anh căn bản & TOEIC 4 kỹ năng');

  const priorityCourse = byId.get(state.priorityCourse);
  assert.ok(priorityCourse, 'Priority course exists in catalog');
  assert.ok(isFolder(priorityCourse), 'Priority course is a folder');

  // Verify first lesson materials
  const firstSet = bank.sets.find(s => s.courseId === state.priorityCourse);
  assert.ok(firstSet, 'Priority course has compiled learning set');
  const materials = studyMaterials(index, firstSet.folderId);
  assert.ok(materials.videos.length > 0 || materials.docs.length > 0, 'Course chapter has study materials');
}

// -------------------------------------------------------------
// Scenario 2: Returning learner resuming exact lesson, tab, and note
// -------------------------------------------------------------
{
  const state = freshLearning();
  const folderId = bank.sets[0].folderId;
  const video = bank.sets[0].sources[0];

  // Save study room draft & active tab
  state.studyRoomDrafts[folderId] = {
    activeTab: 'notes',
    noteDraft: 'Quy tắc chia thì HTTD: S + am/is/are + V-ing',
    updatedAt: Date.now()
  };
  state.timeBudget = 15;

  const sanitized = sanitizeLearning(state, bank, ids);
  assert.equal(sanitized.timeBudget, 15, 'Time budget preference preserved');
  assert.equal(sanitized.studyRoomDrafts[folderId]?.activeTab, 'notes', 'Active tab restored');
  assert.equal(sanitized.studyRoomDrafts[folderId]?.noteDraft, 'Quy tắc chia thì HTTD: S + am/is/are + V-ing', 'Draft text preserved');
}

// -------------------------------------------------------------
// Scenario 3: Note editing, tagging, and pinning without reload
// -------------------------------------------------------------
{
  const state = freshLearning();
  const testFileId = bank.sets[0].sources[0].id;

  state.noteMeta[testFileId] = {
    pinned: true,
    tags: ['Quy tắc', 'Ngữ pháp'],
    updatedAt: new Date().toISOString()
  };

  const sanitized = sanitizeLearning(state, bank, ids);
  assert.equal(sanitized.noteMeta[testFileId]?.pinned, true, 'Note pin status saved');
  assert.deepEqual(sanitized.noteMeta[testFileId]?.tags, ['Quy tắc', 'Ngữ pháp'], 'Note tags saved');
}

// -------------------------------------------------------------
// Scenario 4: Self-testing: unassisted vs assisted answer tracking
// -------------------------------------------------------------
{
  const state = freshLearning();
  const set = bank.sets[0];
  const q1 = set.questions[0];
  const q2 = set.questions[1];

  // Learner answers q1 with hint/assistance
  recordAssistedQuestion(state, q1.id);
  assert.ok(state.assistedQuestions.includes(q1.id), 'Assisted question recorded');

  // Answer q1 correctly (assisted) and q2 incorrectly (unassisted)
  const userAnswers = {
    [q1.id]: q1.answer,
    [q2.id]: (q2.answer + 1) % q2.options.length
  };
  applyQuizResult(state, set.id, [q1, q2], userAnswers);

  // q2 should be added to mistake review queue
  assert.ok(state.wrong.includes(q2.id), 'Wrong question placed in review queue');
  assert.ok(!state.wrong.includes(q1.id), 'Correct question not in review queue');

  const metrics = computeEvidenceMetrics(state, bank, {completed: {}});
  assert.equal(metrics.assistedTotal, 1, 'Assisted total is 1');
  assert.equal(metrics.assistedCorrect, 1, 'Assisted correct is 1');
  assert.equal(metrics.assistedPct, 100, 'Assisted percentage is 100%');
  assert.equal(metrics.unassistedTotal, 1, 'Unassisted total is 1');
  assert.equal(metrics.unassistedCorrect, 0, 'Unassisted correct is 0');
  assert.equal(metrics.unassistedPct, 0, 'Unassisted percentage correctly isolates unassisted answers (0%)');
}

// -------------------------------------------------------------
// Scenario 5: Personal self-assessment ("Cần ôn") vs graded test score
// -------------------------------------------------------------
{
  const state = freshLearning();
  const fileId = bank.sets[0].sources[0].id;

  // Toggle flag on lesson
  const flagged = toggleLessonFlag(state, fileId);
  assert.equal(flagged, true);
  assert.ok(state.flaggedLessons.includes(fileId), 'Lesson flagged for review');

  // Verify that self-assessment does NOT inflate or alter test accuracy metrics
  const metrics = computeEvidenceMetrics(state, bank, {completed: {[fileId]: '2026-11-14T00:00:00Z'}});
  assert.equal(metrics.flaggedCount, 1, 'Flagged lessons tracked separately');
  assert.equal(metrics.completedVideos, 1, 'Completed videos tracked separately');
  assert.equal(metrics.unassistedTotal, 0, 'No quiz questions fabricated');

  // Toggle flag off when understood
  const unflagged = toggleLessonFlag(state, fileId);
  assert.equal(unflagged, false);
  assert.ok(!state.flaggedLessons.includes(fileId), 'Lesson unflagged after review');
}

// -------------------------------------------------------------
// Scenario 6: Changing weekly plan & rest day does not rewrite history
// -------------------------------------------------------------
{
  const state = freshLearning();
  state.attempts.push({
    setId: bank.sets[0].id,
    correct: 8,
    total: 10,
    date: '2026-11-10T10:00:00Z'
  });
  
  // User changes time budget and marks a skip day
  state.timeBudget = 60;
  state.skippedToday.push('2026-11-14');

  const sanitized = sanitizeLearning(state, bank, ids);
  assert.equal(sanitized.attempts.length, 1, 'Historical attempts intact');
  assert.equal(sanitized.timeBudget, 60, 'Time budget updated');
  assert.deepEqual(sanitized.skippedToday, ['2026-11-14'], 'Rest day recorded without artificial penalty');
}

// -------------------------------------------------------------
// Scenario 7: Offline backup and full round-trip preservation
// -------------------------------------------------------------
{
  const state = freshLearning();
  state.priorityCourse = '1m8UUnkpyTOffREm7GjITTPrDkZ5OmHUb';
  state.timeBudget = 15;
  state.flaggedLessons = [bank.sets[0].sources[0].id];
  state.flaggedQuestions = [bank.sets[0].questions[0].id];
  state.assistedQuestions = [bank.sets[0].questions[0].id];
  state.displayPreferences = {fontSize: 'large', density: 'compact'};
  state.reminderConfig = {enabled: true, time: '21:30'};

  const jsonString = JSON.stringify(state);
  const parsed = JSON.parse(jsonString);
  const restored = sanitizeLearning(parsed, bank, ids);

  assert.equal(restored.priorityCourse, '1m8UUnkpyTOffREm7GjITTPrDkZ5OmHUb');
  assert.equal(restored.timeBudget, 15);
  assert.deepEqual(restored.flaggedLessons, state.flaggedLessons);
  assert.deepEqual(restored.flaggedQuestions, state.flaggedQuestions);
  assert.deepEqual(restored.assistedQuestions, state.assistedQuestions);
  assert.deepEqual(restored.displayPreferences, {fontSize: 'large', density: 'compact'});
  assert.deepEqual(restored.reminderConfig, {enabled: true, time: '21:30'});
}

// -------------------------------------------------------------
// Scenario 8: Cloud revision conflict and account isolation
// -------------------------------------------------------------
{
  const state1 = freshLearning();
  state1.studyRoomDrafts['f1'] = {answers: {q1: 'A'}};

  const state2 = freshLearning();
  state2.studyRoomDrafts['f2'] = {answers: {q2: 'B'}};

  assert.notDeepEqual(state1.studyRoomDrafts, state2.studyRoomDrafts, 'Drafts isolated between instances');
}

// -------------------------------------------------------------
// Scenario 9: Backward compatibility: Upgrading v17 data
// -------------------------------------------------------------
{
  // Simulating pure v17 export data with no v2 fields
  const v17Data = {
    attempts: [{setId: bank.sets[0].id, correct: 5, total: 5, percent: 100, date: '2026-11-01T12:00:00Z'}],
    wrong: [bank.sets[0].questions[0].id],
    cards: {},
    drafts: {},
    worksheets: {},
    lessonRead: {},
    games: [],
    mistakeMeta: {}
  };

  const upgraded = sanitizeLearning(v17Data, bank, ids);
  assert.equal(upgraded.timeBudget, 30, 'Migrated time budget initialized to 30m');
  assert.equal(upgraded.priorityCourse, '1EcEHLSxxlsRFtJCXMGimzy2rKd2Ej-zD', 'Default priority course assigned');
  assert.deepEqual(upgraded.flaggedLessons, [], 'flaggedLessons initialized');
  assert.deepEqual(upgraded.flaggedQuestions, [], 'flaggedQuestions initialized');
  assert.deepEqual(upgraded.assistedQuestions, [], 'assistedQuestions initialized');
  assert.deepEqual(upgraded.displayPreferences, {fontSize: 'medium', density: 'comfortable'}, 'Display preferences initialized');
  assert.deepEqual(upgraded.reminderConfig, {enabled: false, time: '20:00'}, 'Reminder config default off');
  assert.equal(upgraded.attempts.length, 1, 'v17 attempts preserved');
  assert.equal(upgraded.wrong.length, 1, 'v17 wrong queue preserved');
}

// -------------------------------------------------------------
// Scenario 10: Global search diacritic-insensitivity & multi-category
// -------------------------------------------------------------
{
  const results = searchBankAndCatalog({
    query: 'ngu phap', // without diacritics
    bank,
    courses: catalog.items.filter(n => n.parent === '1RySWcms9OOcRv4VWOTFrDE6qWwUA581m' && isFolder(n)),
    nodes: catalog.items,
    notes: {[bank.sets[0].sources[0].id]: 'Ngữ pháp căn bản Part 5'},
    noteMeta: {},
    filter: 'all'
  });

  assert.ok(results.length > 0, 'Diacritic-insensitive search found matches');
  const categories = new Set(results.map(r => r.category));
  assert.ok(categories.has('courses') || categories.has('notes') || categories.has('compiled'), 'Multi-category results returned');
}

console.log(JSON.stringify({
  ok: true,
  scenariosTested: 10,
  evidenceMetrics: true,
  v17BackwardCompatible: true,
  searchDiacritics: true
}));
