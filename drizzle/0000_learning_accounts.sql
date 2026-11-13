CREATE TABLE user_backups (user_id TEXT PRIMARY KEY NOT NULL, revision INTEGER NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE user_attempts (user_id TEXT NOT NULL, attempt_id TEXT NOT NULL, created_at TEXT NOT NULL, set_id TEXT NOT NULL, bank_version TEXT NOT NULL, snapshot TEXT NOT NULL, PRIMARY KEY(user_id, attempt_id));
--> statement-breakpoint
CREATE INDEX attempts_user_date ON user_attempts(user_id, created_at);
--> statement-breakpoint
CREATE TABLE question_reports (report_id TEXT NOT NULL, user_id TEXT NOT NULL, question_id TEXT NOT NULL, question_version TEXT NOT NULL, reason TEXT NOT NULL, detail TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(user_id, report_id));
