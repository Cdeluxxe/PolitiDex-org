CREATE TABLE "cee_item_comment_votes" (
	"id" serial PRIMARY KEY,
	"comment_id" integer NOT NULL,
	"uid" text NOT NULL,
	"vote" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cee_item_comments" (
	"id" serial PRIMARY KEY,
	"target_id" text NOT NULL,
	"parent_id" integer,
	"author_uid" text NOT NULL,
	"author_name" text DEFAULT 'Community Member' NOT NULL,
	"body" text NOT NULL,
	"source_url" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cee_item_flags" (
	"id" serial PRIMARY KEY,
	"comment_id" integer NOT NULL,
	"uid" text NOT NULL,
	"reason" text NOT NULL,
	"note" text DEFAULT '',
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cee_item_votes" (
	"id" serial PRIMARY KEY,
	"target_id" text NOT NULL,
	"uid" text NOT NULL,
	"vote" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "cee_item_comment_votes_unique" ON "cee_item_comment_votes" ("comment_id","uid");--> statement-breakpoint
CREATE INDEX "cee_item_comment_votes_comment_idx" ON "cee_item_comment_votes" ("comment_id");--> statement-breakpoint
CREATE INDEX "cee_item_comments_target_idx" ON "cee_item_comments" ("target_id");--> statement-breakpoint
CREATE INDEX "cee_item_comments_parent_idx" ON "cee_item_comments" ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cee_item_flags_unique" ON "cee_item_flags" ("comment_id","uid");--> statement-breakpoint
CREATE INDEX "cee_item_flags_comment_idx" ON "cee_item_flags" ("comment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cee_item_votes_unique" ON "cee_item_votes" ("target_id","uid");--> statement-breakpoint
CREATE INDEX "cee_item_votes_target_idx" ON "cee_item_votes" ("target_id");--> statement-breakpoint
ALTER TABLE "cee_item_comment_votes" ADD CONSTRAINT "cee_item_comment_votes_comment_id_cee_item_comments_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "cee_item_comments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cee_item_comments" ADD CONSTRAINT "cee_item_comments_parent_id_cee_item_comments_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "cee_item_comments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cee_item_flags" ADD CONSTRAINT "cee_item_flags_comment_id_cee_item_comments_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "cee_item_comments"("id") ON DELETE CASCADE;