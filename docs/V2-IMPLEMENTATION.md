# TOEIC Studio V2 — delivery status

Master plan: TOEIC-STUDIO-V2-PLAN.md. Current delivery covers the core learning flow and first account-storage foundation. The entire16-module plan is not complete.

## Implemented
- Real dashboard, focus timer, study streak, due vocabulary and exact quiz resume.
-13 source-linked lessons,250 questions,73 cards, varied drills, mistake review, games and notes.
- Vocabulary search/filter, reverse/mixed flashcards, four memory ratings.
- Sites account identity and D1-backed user-scoped manual backups; revision conflicts prevent silent overwrites.
- IndexedDB history with immutable question snapshots, source references, content/question hashes and JSON export.
- Opt-in account history: server recomputes scores, idempotent saves, paged records with no100-attempt cap. Old content versions are not silently regraded.
- Authenticated question reports with version references and an open review queue.
- Tests cover account isolation, CSRF origin checks, backup conflicts, duplicate requests, immutable historical content,106 retained server attempts and report privacy.

## Partial / limits
- Backups are manual; no automatic multi-device merge or background synchronization.
- Versioned history starts with this release. Older attempts lacking snapshots are not assigned invented content versions.
- The educational question bank remains browser-readable; server grading does not make this a secure exam product.
- Source import/OCR/review runs in the coding workflow, not a self-service admin interface.
- Query/report queue management is restricted to owner tooling; no unprotected Admin role is exposed.
- Original Drive permissions/media stay unchanged. Drive iframe cannot expose playback timestamps to this app.

## Outstanding
- Server-only exam keys, role-managed content editor, source fingerprints/idempotent import jobs and content approval/version publication.
- Full17-topic verified coverage and Part1–7 grouped question/media banks.
- Listening/dictation/transcript timing and rich reading groups.
- Study planner, fuller analytics, dark mode, resizable workspace.
- Verified mock tests and AI integrations.

Implementation/security details: ACCOUNT-STORAGE.md.
