# Document learning pipeline

## Current working path
Drive PDF metadata → download original to local research storage → extract native text or OCR by page → visual/source review → authored lesson/questions/cards → role-protected review → atomic publication → learn/practice/review.

The original PDF is not uploaded into public website assets. Extracted page text and answer keys remain in private job records. Published lessons expose paraphrased instruction and source/page references; question solutions are returned after practice submission.

## Extract locally
Optional content tooling requires Python with pdfplumber, Poppler pdftoppm and, for the supplied OCR helper, Windows with the English OCR language pack. Application build/test still needs only Node.js 24+. Original downloads and rendered images belong outside deployable folders or under ignored .sites-runtime/.

Example from the project folder:

    npm run content:extract -- --input "C:/path/source.pdf" --source-id DRIVE_FILE_ID --output .sites-runtime/source-review.json --ocr

The extractor computes SHA-256 from the actual PDF bytes, records byte/page count and keeps each page number. OCR is a draft and needs visual review, especially Vietnamese text, tables and scanned answer keys. The current helper uses English Windows OCR; it does not claim perfect Vietnamese transcription.

The initial bundle may have lessons: []. It can enter private page review, but cannot be approved for publication until authored learning content and source-linked questions have been added. A prepared authored bundle can be uploaded into the same un-published draft (same fingerprint/pipelineVersion), or edited question by question. A changed published source uses a new pipelineVersion and gets a new immutable job.

## Admin workflow
Open /#imports (Admin or Editor). The PDF registry supports name search, pagination, latest processing status and separate published-learning coverage. Add a PDF to the queue, start extraction, or upload a prepared JSON bundle directly. Processing errors can be recorded, reviewed and retried.

Inspect the original PDF beside page text, lessons, cards, questions and explanations. Edits revoke prior approval. Admin approval requires all source pages, every question/answer and an explicit review note; Editors cannot approve or publish. Approval is tied to the exact payload hash displayed during review. Publishing is a separate action and rejects stale source/question revisions.

The post-publish action refreshes the bank and opens /#document?id=DRIVE_FILE_ID. The learner gets key points, self-recall prompts with revealable examples/source references, linked lesson reading, choice/cloze/correction practice and scheduled vocabulary. Unprocessed PDFs show an honest fallback to the original document and worksheet; no answer is fabricated.

## Duplicate and version behavior
Source ID + byte SHA-256 + pipelineVersion identifies a source version. Same input is idempotent; an identical PDF under another catalog ID is tracked as an alias and does not create duplicate learning content. A different payload at the same version is rejected until the existing draft is explicitly edited or a new version is selected. Source fingerprint values submitted to the API are claims from authorized import tooling; actual byte hashing happens in the extractor, since the Worker never receives original PDF bytes.

Publication uses D1 batch transactions and compares active lesson/question pointers. Approved content is immutable after publication. Older practice snapshots retain their original questions, answers and explanations, including when a saved grading request is retried after content changes. A new source draft leaves the last published lesson available to learners.

## Concrete source evidence
Unit 11 (Drive ID 1pEq2_qi7zikEpyVlTN_MxABQj1IvNV0d): original 1,728,899 bytes, 3 scanned pages, SHA-256 d6b94d4776b9229635e567634b18a8f717310facc0687bfcbcd40dc5c4c90e6a. All 3 pages rendered and visually read. The reviewed authored bundle is data/import-bundles/unit11.review.json: 1 lesson, 16 original practice questions, 8 source vocabulary cards. Origin labels distinguish Adapted instruction and Generated questions. Promotional headers/footers are excluded from learning content.

The source's broad claim about enjoy/think and continuous forms is not treated as an absolute rule. Authored examples supply enough context for a unique intended answer. Native grammar tables, object pronouns and the source practice forms ground the learning content; OCR text is retained only for admin inspection.

## Limits still to finish under the full master plan
The current extraction job supports PDFs up to 200 pages and review bundles up to 850 KB. Split-document processing, stronger multilingual OCR, automatic Drive sync/inaccessible-file detection, browser-side PDF extraction, richer lesson authoring, comprehensive passage/audio groups and scalable paged question-bank access remain open requirements. These limits do not redefine the original goal.

## Checks
npm test includes tests/imports.test.mjs for queue races, failure/retry, OCR-only review, no grading before publication, review invalidation, duplicate PDFs, source-version conflicts, private OCR and immutable histories. tests/build.test.mjs checks that raw review bundles and server/private paths cannot be fetched from public assets. Browser QA additionally exercises import → review → publish → document study → a six-question typed practice.

Cloudflare references used for the transaction/JSON/boundary design: https://developers.cloudflare.com/d1/worker-api/d1-database/ ; https://developers.cloudflare.com/d1/sql-api/sql-statements/ ; https://developers.cloudflare.com/d1/platform/limits/ .

## Browser authoring added after extraction

Open a needs-review import and choose “Tạo bài học từ tài liệu”. The composer keeps the original PDF beside metadata, sections, bilingual examples, questions and cards. Select the source page separately for each section/question/card. The original Drive viewer stays connected during tab changes, preserving its page and zoom; its page must be changed manually to match the OCR page selector.

Incomplete lessons without a summary/section/question can be saved privately. The review screen lists what is missing; server approval rejects incomplete lessons even if a client tries to bypass the UI. Individual authored questions still require valid keys and explanations before saving. Example-to-cloze uses an exact whole-word/phrase occurrence, rejects ambiguous repeated fragments, labels the question Generated and leaves the explanation empty for author review. It does not call an AI service.

Published jobs remain immutable. “Tạo phiên bản để bổ sung bài học” creates an idempotent fork from the current publication, carries forward current question corrections and resets page review. Older published jobs link to the current publication. Draft saving compares the captured payload hash to prevent overwrites. Unsaved changes remain in the composer on conflict and may be downloaded as a private JSON draft.

Guide and QA: CONTENT-AUTHORING.md. Full browser-side extraction/OCR, automatic Drive ingestion and the other master-plan modules remain open.
