-- ─────────────────────────────────────────────────────────────────────────────
-- Promoted stances — pdx_stated_positions
-- ─────────────────────────────────────────────────────────────────────────────
-- One row per politician + issue key: an Evidence Locker promotion (at least one
-- strong item, or three weak items, on one side; no even split) written by the
-- raw-ingest cron's promotion step (netlify/lib/stated-positions-core.mjs) and
-- served by GET /api/stated-positions as stance cards. The curated cards in
-- politician-stances*.js always win: the client appends a pipeline card only for
-- an issue key the person's curated list does not carry. Additive only — no
-- existing table is touched.
--
-- WHY THE VERSION WAS HAND-SET. One version after the applied tail
-- (20261205000000_seed_exec_actions_wave14); the drizzle-generated stamp
-- (20261115025151) sorted behind it.
CREATE TABLE "pdx_stated_positions" (
	"id" serial PRIMARY KEY,
	"politician_id" text NOT NULL,
	"issue_key" text NOT NULL,
	"stance" text NOT NULL,
	"text" text DEFAULT '' NOT NULL,
	"source_url" text NOT NULL,
	"source_label" text DEFAULT 'Source' NOT NULL,
	"confidence" numeric(4,2),
	"strength" text NOT NULL,
	"strong_count" integer DEFAULT 0 NOT NULL,
	"weak_count" integer DEFAULT 0 NOT NULL,
	"rules_version" text,
	"status" text DEFAULT 'active' NOT NULL,
	"provenance" text DEFAULT 'pipeline' NOT NULL,
	"evidence" jsonb DEFAULT '[]',
	"promoted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pdx_stated_positions_stance_check" CHECK ("stance" in ('support', 'oppose', 'mixed')),
	CONSTRAINT "pdx_stated_positions_strength_check" CHECK ("strength" in ('weak', 'strong')),
	CONSTRAINT "pdx_stated_positions_status_check" CHECK ("status" in ('active', 'withdrawn')),
	CONSTRAINT "pdx_stated_positions_provenance_check" CHECK ("provenance" = 'pipeline')
);
--> statement-breakpoint
CREATE UNIQUE INDEX "pdx_stated_positions_pid_issue_unique" ON "pdx_stated_positions" ("politician_id","issue_key");--> statement-breakpoint
CREATE INDEX "pdx_stated_positions_status_idx" ON "pdx_stated_positions" ("status");