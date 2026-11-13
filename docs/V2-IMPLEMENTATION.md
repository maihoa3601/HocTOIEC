# TOEIC Studio V2 — delivery status

Master plan: TOEIC-STUDIO-V2-PLAN.md. This release is an incremental P0 delivery, not completion of all sixteen modules.

## Implemented
- Real dashboard: goals, recorded focus minutes, eligible-day streak, due vocabulary, mistakes and resume links. No fake exam score.
- Vocabulary search and filters; English→Vietnamese, reverse and mixed flashcards; Again/Hard/Good/Easy scheduling.
- Quiz drafts preserve current question, answers, mode and exact smart/review question IDs across reload.
- Published source inventory distinguishes indexed PDFs from PDFs used in interactive lessons.
- Existing 13 source-linked lessons /250 questions /73 cards, games, mistake review, notes, export/import retained.

## Partial
- Source reading/OCR/review is performed in the coding workflow, not an in-app import pipeline.
- Library search indexes catalog metadata; vocabulary search indexes reviewed card contents. Full PDF text is not indexed.
- SRS is a transparent interval heuristic, not a validated recall model.
- Learning progress is browser-local; export/import transfers devices. Drive viewer cannot expose video time or A–B playback controls.

## Outstanding acceptance criteria
- Account authentication, server database, cloud sync and authorization.
- Server-only answer keys; current buildless practice bank is client-readable.
- Immutable question versions, full untruncated attempt archive and version-specific grading.
- Admin/editor/learner roles, authenticated review and publish, file fingerprints, idempotent import jobs, report queue.
- Confirmed full17-topic coverage, Part1–7 question groups and media linkage.
- Listening/audio timestamps, dictation/transcripts and reading groups.
- Planner, full analytics, dark mode and resizable workspace.
- Mock tests and AI require verified content and backend integration before release.

No cloud-login, admin security, automatic sync, full TOEIC exam or AI capability is claimed by this release.
