# Content review and server grading

## Roles
Sites identity headers are authoritative. TOEIC_ADMIN_USER_IDS and TOEIC_EDITOR_USER_IDS are comma-separated stable Site account IDs configured only through Sites runtime environment. The owner account was grounded against the first verified owner backup and native owner role; it is the initial admin. No first-visitor bootstrap, email matching or browser-supplied role is used. Editors create/read drafts, admins publish and handle reports, learners cannot call admin APIs.

## Review flow
Account page links to /#admin only for an authorized role. Choose a question or report; source PDF is displayed beside editable content. Draft creation validates type, options/accepted forms and approved source pages. It does not claim automatic semantic verification. Publishing requires an explicit source-checked confirmation. Active pointers switch atomically with optimistic concurrency; stale drafts cannot overwrite newer publication. Draft/publish actions have an audit log. Existing questions keep their IDs, each content change has a SHA-256 version.

## Grading
The public bank omits answer, accept and explanation from every question. Worker serves the reviewed active revision and returns keys/explanation after POST /api/grade. Grading needs a connection; draft answers remain on failure. This is an educational practice API, not a tamper-proof TOEIC examination: users may request solutions by submitting practice, and learned examples/vocabulary remain available.

Authenticated, opt-in grade requests save a server-scored immutable snapshot in the same flow. Anonymous practice remains available without account history. Previously archived attempts are never rewritten. Old aggregate-only progress is retained; per-question results are migrated only where all answered items were correct or all were wrong, otherwise unknown results are not invented.

## Boundaries
Review UI supports edits of the existing reviewed bank. It does not ingest unreviewed PDFs, add arbitrary question IDs, grant roles, or publish whole new courses. Admin queues show bounded latest100 reports/drafts and30 audit events; broader queue pagination remains future work. Role IDs and original keys are not placed in client source. New schema is append-only migration0001; migration0000 remains unchanged.

Checks: node scripts/check-admin.mjs, node scripts/check-backend.mjs, node scripts/check-learning.mjs, node scripts/check-activities.mjs.
