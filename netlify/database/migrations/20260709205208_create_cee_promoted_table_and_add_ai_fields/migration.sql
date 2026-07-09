CREATE TABLE "cee_promoted" (
	"id" serial PRIMARY KEY,
	"post_id" integer,
	"headline" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"source_url" text,
	"category_key" text,
	"issue_keys" jsonb DEFAULT '[]',
	"kind" text DEFAULT 'evidence' NOT NULL,
	"strength" text DEFAULT 'moderate' NOT NULL,
	"contributor_uid" text,
	"contributor_name" text DEFAULT 'Community Member' NOT NULL,
	"promoted_by" text,
	"note" text DEFAULT '',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cee_posts" ADD COLUMN "kind" text DEFAULT 'lead' NOT NULL;--> statement-breakpoint
ALTER TABLE "cee_posts" ADD COLUMN "source_type" text;--> statement-breakpoint
ALTER TABLE "cee_posts" ADD COLUMN "ai_recommendation" text;--> statement-breakpoint
ALTER TABLE "cee_posts" ADD COLUMN "ai_confidence" integer;--> statement-breakpoint
ALTER TABLE "cee_posts" ADD COLUMN "ai_summary" text;--> statement-breakpoint
ALTER TABLE "cee_posts" ADD COLUMN "ai_reasons" jsonb DEFAULT '[]';--> statement-breakpoint
ALTER TABLE "cee_posts" ADD COLUMN "ai_duplicate_of" integer;--> statement-breakpoint
ALTER TABLE "cee_posts" ADD COLUMN "ai_reviewed_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "cee_promoted_post_unique" ON "cee_promoted" ("post_id");--> statement-breakpoint
CREATE INDEX "cee_promoted_created_idx" ON "cee_promoted" ("created_at");--> statement-breakpoint
ALTER TABLE "cee_promoted" ADD CONSTRAINT "cee_promoted_post_id_cee_posts_id_fkey" FOREIGN KEY ("post_id") REFERENCES "cee_posts"("id") ON DELETE SET NULL;