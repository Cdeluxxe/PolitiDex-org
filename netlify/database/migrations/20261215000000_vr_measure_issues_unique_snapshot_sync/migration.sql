DROP INDEX IF EXISTS "vr_measure_issues_unique";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "vr_measure_issues_unique" ON "vr_measure_issues" ("measure_id","issue_key","support_meaning");
