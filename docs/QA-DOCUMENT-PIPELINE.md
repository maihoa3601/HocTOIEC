# Document pipeline QA — 2026-11-14

This increment does not complete the 16-module master plan. See MASTER-PLAN-AUDIT.md for the full requirement checklist and DOCUMENT-PIPELINE.md for current boundaries.

## Automated checks

- `npm test`: 10 test files passed, no failures/skips. Includes source catalog hierarchy, lesson/card integrity, grading, account isolation, immutable histories, review roles, publication conflicts and planner behavior.
- `npm run build`: succeeded; 30 public assets. Private OCR, raw import bundles and answer keys are excluded from initial public assets.
- Import tests cover concurrent queue/publish calls, stale approval, editor restrictions, duplicate PDF aliases, OCR-only drafts, failed extraction/retry and saved grading retries after publication changes.

## Browser checks on local preview

- Uploaded the reviewed Unit 11 bundle through the file chooser; reviewed all 3 pages and all 16 questions; approved and published the lesson.
- The document study page reports 1 lesson, 16 questions and 8 cards, with source page links, recall prompts and dedicated cloze/correction practice.
- Submitted all 6 cloze answers and received 6/6; the accepted contraction `doesn't know` was accepted alongside `does not know`.
- Opened the eight-card deck, revealed `attend` → `tham dự` and the authored example, rated the card, and advanced to `mop`.
- Source name search returned Unit 11 and its separate online-test PDF. Published-learning coverage is separate from the latest import status.
- Used an unimported catalog PDF for a local queue → processing → recorded failure → retry flow. The retry returned the job to pending and cleared the failure display.
- At a 390 × 844 viewport, document study had inner width 390, content width/scroll width 375 with no horizontal overflow. Mobile menu opened and closed. The viewport was reset afterwards.
- Desktop document study layout inspected visually after reload; friendly lesson title and original source filename disclosure render correctly.

## Verification limits

The above browser checks concern this increment on local preview. They do not certify every existing screen or every master-plan requirement. Native publication and live content import are checked separately during release. Full multilingual OCR, automated Drive ingestion, complete TOEIC media/Part coverage and the remaining modules are still open.
