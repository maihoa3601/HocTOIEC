# Account storage and immutable history

Sites dispatch supplies the stable oai-authenticated-user-id header. Every account API requires it and scopes all SQL by user_id. No email or credentials are stored. Public lessons remain public. D1 binding DB is provisioned by Sites; schema migrations live under drizzle/.

Backups are manual and compare-and-swap with revision; stale saves return409. Restoring requires reviewing a summary and confirming replacement. The local state is sanitized by existing progress import. No automatic device merge is claimed.

New attempts are archived in IndexedDB, independently of the100-entry recent cache. Each snapshot contains question text, answer key, explanation, answers, score, bank hash and question hashes. Legacy attempts are not assigned invented versions. History has a dedicated JSON export.

Account history is opt-in. When enabled, new attempts are posted with an idempotency key; the server recomputes the score from its own bank and stores immutable snapshots. Duplicate IDs cannot overwrite a different payload. A bank-version mismatch returns409; the original local record remains intact. History is paged with no fixed server retention cap in this implementation.

Reports are authenticated, source/version-linked and readable only by their submitter through public APIs. They enter an open queue; no unprotected admin/editor write surface is deployed. Owner can inspect the queue through authenticated Sites database tools.

Current limitations: the educational bank remains client-readable. This release does not provide protected exams, a role-managed content editor, automatic PDF ingestion, automatic background sync or a full backup of original Drive media. Server-side-only keys and admin roles remain separate work.
