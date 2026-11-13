CREATE TABLE question_revisions (revision_id TEXT PRIMARY KEY NOT NULL, question_id TEXT NOT NULL, base_version TEXT NOT NULL, payload TEXT NOT NULL, status TEXT NOT NULL, created_by TEXT NOT NULL, created_at TEXT NOT NULL, review_note TEXT NOT NULL, reviewed_by TEXT, reviewed_at TEXT);
--> statement-breakpoint
CREATE INDEX revisions_question_date ON question_revisions(question_id,created_at);
--> statement-breakpoint
CREATE TABLE active_questions (question_id TEXT PRIMARY KEY NOT NULL, revision_id TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE content_audit (audit_id TEXT PRIMARY KEY NOT NULL, actor_id TEXT NOT NULL, action TEXT NOT NULL, question_id TEXT NOT NULL, revision_id TEXT NOT NULL, created_at TEXT NOT NULL);
