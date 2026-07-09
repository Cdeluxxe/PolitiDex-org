CREATE TABLE "pdx_forum_flags" (
	"id" serial PRIMARY KEY,
	"target_type" text NOT NULL,
	"target_id" integer NOT NULL,
	"uid" text NOT NULL,
	"reason" text NOT NULL,
	"note" text DEFAULT '',
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pdx_forum_replies" (
	"id" serial PRIMARY KEY,
	"thread_id" integer NOT NULL,
	"parent_id" integer,
	"author_uid" text NOT NULL,
	"author_name" text DEFAULT 'Community Member' NOT NULL,
	"body" text NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pdx_forum_threads" (
	"id" serial PRIMARY KEY,
	"author_uid" text NOT NULL,
	"author_name" text DEFAULT 'Community Member' NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"topic" text DEFAULT 'general' NOT NULL,
	"link_type" text,
	"link_ref" text,
	"link_label" text,
	"score" integer DEFAULT 0 NOT NULL,
	"reply_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pdx_forum_votes" (
	"id" serial PRIMARY KEY,
	"target_type" text NOT NULL,
	"target_id" integer NOT NULL,
	"uid" text NOT NULL,
	"value" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "pdx_forum_flags_unique" ON "pdx_forum_flags" ("target_type","target_id","uid");--> statement-breakpoint
CREATE INDEX "pdx_forum_flags_target_idx" ON "pdx_forum_flags" ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "pdx_forum_replies_thread_idx" ON "pdx_forum_replies" ("thread_id");--> statement-breakpoint
CREATE INDEX "pdx_forum_replies_parent_idx" ON "pdx_forum_replies" ("parent_id");--> statement-breakpoint
CREATE INDEX "pdx_forum_threads_status_idx" ON "pdx_forum_threads" ("status");--> statement-breakpoint
CREATE INDEX "pdx_forum_threads_topic_idx" ON "pdx_forum_threads" ("topic");--> statement-breakpoint
CREATE INDEX "pdx_forum_threads_score_idx" ON "pdx_forum_threads" ("score");--> statement-breakpoint
CREATE INDEX "pdx_forum_threads_created_idx" ON "pdx_forum_threads" ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "pdx_forum_votes_unique" ON "pdx_forum_votes" ("target_type","target_id","uid");--> statement-breakpoint
CREATE INDEX "pdx_forum_votes_target_idx" ON "pdx_forum_votes" ("target_type","target_id");--> statement-breakpoint
ALTER TABLE "pdx_forum_replies" ADD CONSTRAINT "pdx_forum_replies_thread_id_pdx_forum_threads_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "pdx_forum_threads"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "pdx_forum_replies" ADD CONSTRAINT "pdx_forum_replies_parent_id_pdx_forum_replies_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "pdx_forum_replies"("id") ON DELETE CASCADE;