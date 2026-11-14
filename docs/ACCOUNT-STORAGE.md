# Account storage and immutable history

Sites supplies the stable oai-authenticated-user-id header. Account APIs require it and scope SQL by user_id. No email or credentials are stored. Public lessons remain public. D1 binding DB is provisioned by Sites; schema migrations live under drizzle/ and server source under src/server/.

Backups are manual and compare-and-swap with revision; stale saves return 409. Restoring requires reviewing a summary and confirming replacement. Existing progress/learning sanitizers validate restored local state. The planner is included in this snapshot. No automatic device merge is claimed.

New attempts are archived in IndexedDB, independently of the 100-entry recent cache. Each snapshot contains question text, answer key, explanation, answers, score, bank hash and question hashes as received after grading. Legacy attempts are not assigned invented versions. History has a dedicated JSON export.

Grading is server-side for anonymous and signed-in practice. Account history is opt-in. When enabled, the server stores a scored immutable snapshot with an idempotency key. Duplicate IDs cannot overwrite a different payload. A bank-version mismatch returns 409 and leaves the local draft intact. History is paged with no fixed server retention cap in this implementation.

Reports are authenticated and source/version-linked. Learner report APIs return only the submitter's reports. The role-protected admin queue supports review/status changes; editors create drafts and admins publish after checking the source. See CONTENT-REVIEW.md for authorization, publication and audit behavior.

The initial public bank omits question keys and explanations; practice submissions return solutions for learning. This is an educational practice service. Automatic PDF ingestion, automatic background sync, protected examinations and a full backup of original Drive media remain outside the implemented scope.

The source-directory refactor changes no browser storage keys, SQL migrations, account identifiers or content hashes. Run npm test for the complete verification suite.
