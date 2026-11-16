-- ─────────────────────────────────────────────────────────────────────────────
-- Action layer v1 — pdx_action_bills + pdx_vote_actions
-- ─────────────────────────────────────────────────────────────────────────────
-- Raw bill topic tags and raw per-member vote records written by the vote-actions
-- cron (netlify/lib/vote-actions-core.ts), which runs parallel to the stance
-- generator. Additive only: no existing table is touched, and no public read
-- (voting-record, packs, stance cards, stated-positions) reads these tables.
-- No vr_measure_issues row is written, so no offline pack changes.
--
-- WHY THE VERSION WAS HAND-SET. One version after the applied tail
-- (20261208000000_vr_measure_issue_confidence); the drizzle-generated stamp
-- (20261115232925) sorted behind it.
CREATE TABLE "pdx_action_bills" (
	"id" serial PRIMARY KEY,
	"bill_key" text NOT NULL,
	"jurisdiction" text DEFAULT 'us' NOT NULL,
	"congress" integer,
	"measure_type" text NOT NULL,
	"bill_type" text NOT NULL,
	"number" text,
	"parent_bill_key" text,
	"title" text DEFAULT '' NOT NULL,
	"short_title" text,
	"summary" text DEFAULT '',
	"policy_area" text,
	"official_subjects" jsonb DEFAULT '[]',
	"topic_tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"tag_detail" jsonb DEFAULT '[]',
	"multi_topic" boolean DEFAULT false NOT NULL,
	"tagger_version" text NOT NULL,
	"meta_source" text DEFAULT 'vote_feed' NOT NULL,
	"has_summary" boolean DEFAULT false NOT NULL,
	"meta_attempts" integer DEFAULT 0 NOT NULL,
	"meta_fetched_at" timestamp with time zone,
	"source_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pdx_vote_actions" (
	"id" serial PRIMARY KEY,
	"jurisdiction" text DEFAULT 'us' NOT NULL,
	"chamber" text NOT NULL,
	"congress" integer NOT NULL,
	"session" integer NOT NULL,
	"roll_number" integer NOT NULL,
	"vote_date" timestamp with time zone NOT NULL,
	"bill_key" text NOT NULL,
	"parent_bill_key" text,
	"measure_number" text,
	"politician_id" text,
	"member_id_scheme" text NOT NULL,
	"member_id" text NOT NULL,
	"bioguide_id" text,
	"member_name" text,
	"party" text,
	"state" text,
	"vote" text NOT NULL,
	"vote_raw" text,
	"question" text,
	"vote_kind" text NOT NULL,
	"is_procedural" boolean,
	"result" text,
	"topic_tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"tagger_version" text NOT NULL,
	"source_url" text NOT NULL,
	"source_label" text NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revised_at" timestamp with time zone,
	CONSTRAINT "pdx_vote_actions_vote_check" CHECK ("vote" in ('yes', 'no', 'present', 'not_voting')),
	CONSTRAINT "pdx_vote_actions_chamber_check" CHECK ("chamber" in ('house', 'senate'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "pdx_action_bills_key_unique" ON "pdx_action_bills" ("bill_key");--> statement-breakpoint
CREATE INDEX "pdx_action_bills_tags_idx" ON "pdx_action_bills" USING gin ("topic_tags");--> statement-breakpoint
CREATE UNIQUE INDEX "pdx_vote_actions_unique" ON "pdx_vote_actions" ("jurisdiction","chamber","congress","session","roll_number","member_id_scheme","member_id");--> statement-breakpoint
CREATE INDEX "pdx_vote_actions_politician_idx" ON "pdx_vote_actions" ("politician_id");--> statement-breakpoint
CREATE INDEX "pdx_vote_actions_bill_idx" ON "pdx_vote_actions" ("bill_key");--> statement-breakpoint
CREATE INDEX "pdx_vote_actions_date_idx" ON "pdx_vote_actions" ("vote_date");--> statement-breakpoint
CREATE INDEX "pdx_vote_actions_tags_idx" ON "pdx_vote_actions" USING gin ("topic_tags");