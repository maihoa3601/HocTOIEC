# TOEIC Studio V2 — delivery status

Master plan: TOEIC-STUDIO-V2-PLAN.md. Current delivery covers the core learning flow, account storage and content governance. The entire 16-module plan is not complete.

## Implemented
- Real dashboard, focus timer, study streak, due vocabulary and exact quiz resume.
- 13 source-linked lessons, 250 questions, 73 cards, varied drills, mistake review, games and notes.
- Vocabulary search/filter, reverse/mixed flashcards, four memory ratings.
- Sites account identity and D1-backed user-scoped manual backups; revision conflicts prevent silent overwrites.
- IndexedDB history with immutable question snapshots, source references, content/question hashes and JSON export.
- Server grading for anonymous and signed-in practice. Initial bank omits question answers, accepted forms and explanations; solutions are returned after submission.
- Opt-in account history: server-scored immutable snapshots, idempotent saves and paged records. Old content versions are not silently regraded.
- Authenticated question reports with version references. Admins handle report status; learners only read their own reports.
- Admin/editor/learner authorization on the server, source-side draft editor, source-reviewed publication, optimistic conflicts and audit log. Editors cannot publish.
- Tests cover account isolation, origin checks, backup conflicts, duplicate/concurrent requests, immutable history, 106 retained server attempts, private report handling and publication conflicts.

## Partial / limits
- Backups are manual; no automatic multi-device merge or background synchronization.
- Versioned history starts with its release. Older attempts without snapshots are not assigned invented content versions or per-question outcomes.
- Practice returns solutions after submission; this is an educational practice API, not a tamper-proof examination.
- Admin editing supports existing verified questions. New course import/OCR still runs in the coding workflow.
- Admin queues show the latest 100 reports/drafts and 30 audit events; broader pagination remains future work.
- Original Drive permissions/media stay unchanged. Drive iframe cannot expose playback timestamps to this app.

## Outstanding
- Source fingerprints, idempotent import jobs and self-service PDF/OCR ingestion.
- Full 17-topic verified coverage and Part 1–7 grouped question/media banks.
- Listening/dictation/transcript timing and rich reading groups.
- Study planner, fuller analytics, dark mode and resizable workspace.
- Verified mock tests and AI integrations.

Implementation details: ACCOUNT-STORAGE.md and CONTENT-REVIEW.md.
