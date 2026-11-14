CREATE TABLE exam_versions (
  version_id TEXT PRIMARY KEY NOT NULL,
  exam_id TEXT NOT NULL,
  title TEXT NOT NULL,
  year INTEGER NOT NULL,
  source_label TEXT NOT NULL,
  readiness TEXT NOT NULL,
  simulation_eligible INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  payload TEXT NOT NULL,
  private_payload TEXT NOT NULL,
  checklist TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  reviewed_by TEXT,
  reviewed_at TEXT,
  review_note TEXT
);
--> statement-breakpoint
CREATE INDEX exam_versions_exam ON exam_versions(exam_id, status, created_at);
--> statement-breakpoint
CREATE TABLE exam_audit (
  audit_id TEXT PRIMARY KEY NOT NULL,
  exam_id TEXT NOT NULL,
  version_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT NOT NULL,
  created_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE exam_attempts (
  attempt_id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  exam_id TEXT NOT NULL,
  version_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  scope_type TEXT NOT NULL,
  scope_parts TEXT NOT NULL,
  status TEXT NOT NULL,
  current_section TEXT NOT NULL,
  started_at TEXT NOT NULL,
  section_started_at TEXT NOT NULL,
  deadline_at TEXT,
  submitted_at TEXT,
  revision INTEGER NOT NULL DEFAULT 1,
  answers_json TEXT NOT NULL,
  flags_json TEXT NOT NULL,
  timing_json TEXT NOT NULL,
  meta_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX exam_attempts_user ON exam_attempts(user_id, updated_at);
--> statement-breakpoint
CREATE TABLE exam_results (
  attempt_id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  exam_id TEXT NOT NULL,
  version_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  scope_type TEXT NOT NULL,
  source_origin TEXT NOT NULL DEFAULT 'server-graded',
  score_json TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX exam_results_user ON exam_results(user_id, created_at);
--> statement-breakpoint
CREATE TABLE exam_review_items (
  review_id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  exam_id TEXT NOT NULL,
  version_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  part INTEGER NOT NULL,
  skill_tag TEXT NOT NULL,
  source_type TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  marked_uncertain INTEGER NOT NULL DEFAULT 0,
  next_review_at TEXT NOT NULL,
  interval_days INTEGER NOT NULL DEFAULT 1,
  review_count INTEGER NOT NULL DEFAULT 0,
  last_reviewed_at TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, question_id)
);
--> statement-breakpoint
CREATE INDEX exam_review_user_due ON exam_review_items(user_id, status, next_review_at);
