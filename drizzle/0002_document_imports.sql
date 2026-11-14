CREATE TABLE source_files (drive_id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, mime TEXT NOT NULL, course_id TEXT NOT NULL, folder_id TEXT NOT NULL, status TEXT NOT NULL, latest_job_id TEXT, sha256 TEXT, alias_of TEXT, updated_at TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE source_versions (version_id TEXT PRIMARY KEY NOT NULL, drive_id TEXT NOT NULL, sha256 TEXT NOT NULL, byte_size INTEGER NOT NULL, page_count INTEGER NOT NULL, pipeline_version TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(drive_id,sha256,pipeline_version));
--> statement-breakpoint
CREATE INDEX source_fingerprints ON source_versions(sha256,pipeline_version);
--> statement-breakpoint
CREATE TABLE import_jobs (job_id TEXT PRIMARY KEY NOT NULL, source_id TEXT NOT NULL, version_id TEXT, status TEXT NOT NULL, payload TEXT, payload_hash TEXT, base_versions TEXT, base_revisions TEXT, error TEXT, created_by TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, reviewed_by TEXT, reviewed_at TEXT, review_note TEXT, transition_token TEXT, published_at TEXT, publication_token TEXT);
--> statement-breakpoint
CREATE INDEX import_status_date ON import_jobs(status,updated_at);
--> statement-breakpoint
CREATE UNIQUE INDEX import_version_unique ON import_jobs(version_id) WHERE version_id IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX import_open_queue ON import_jobs(source_id) WHERE status IN ('pending','processing');
--> statement-breakpoint
CREATE TABLE published_lessons (lesson_id TEXT PRIMARY KEY NOT NULL, job_id TEXT NOT NULL, source_id TEXT NOT NULL, version TEXT NOT NULL, payload TEXT NOT NULL, published_at TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE import_audit (audit_id TEXT PRIMARY KEY NOT NULL, job_id TEXT NOT NULL, actor_id TEXT NOT NULL, action TEXT NOT NULL, created_at TEXT NOT NULL, detail TEXT NOT NULL);
