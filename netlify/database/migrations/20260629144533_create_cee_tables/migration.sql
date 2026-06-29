CREATE TABLE "cee_comments" (
	"id" serial PRIMARY KEY,
	"post_id" integer NOT NULL,
	"parent_id" integer,
	"author_uid" text NOT NULL,
	"author_name" text DEFAULT 'Community Member' NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cee_flags" (
	"id" serial PRIMARY KEY,
	"post_id" integer NOT NULL,
	"uid" text NOT NULL,
	"reason" text NOT NULL,
	"note" text DEFAULT '',
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cee_posts" (
	"id" serial PRIMARY KEY,
	"author_uid" text NOT NULL,
	"author_name" text DEFAULT 'Community Member' NOT NULL,
	"headline" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"source_url" text,
	"category_key" text,
	"issue_keys" jsonb DEFAULT '[]',
	"status" text DEFAULT 'active' NOT NULL,
	"suggested_for_review" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cee_reactions" (
	"id" serial PRIMARY KEY,
	"post_id" integer NOT NULL,
	"uid" text NOT NULL,
	"reaction" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cee_suggestions" (
	"id" serial PRIMARY KEY,
	"post_id" integer NOT NULL,
	"uid" text NOT NULL,
	"note" text DEFAULT '',
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "cee_comments_post_idx" ON "cee_comments" ("post_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cee_flags_unique" ON "cee_flags" ("post_id","uid");--> statement-breakpoint
CREATE INDEX "cee_flags_post_idx" ON "cee_flags" ("post_id");--> statement-breakpoint
CREATE INDEX "cee_posts_status_idx" ON "cee_posts" ("status");--> statement-breakpoint
CREATE INDEX "cee_posts_created_idx" ON "cee_posts" ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "cee_reactions_unique" ON "cee_reactions" ("post_id","uid","reaction");--> statement-breakpoint
CREATE INDEX "cee_reactions_post_idx" ON "cee_reactions" ("post_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cee_suggestions_unique" ON "cee_suggestions" ("post_id","uid");--> statement-breakpoint
CREATE INDEX "cee_suggestions_post_idx" ON "cee_suggestions" ("post_id");--> statement-breakpoint
ALTER TABLE "cee_comments" ADD CONSTRAINT "cee_comments_post_id_cee_posts_id_fkey" FOREIGN KEY ("post_id") REFERENCES "cee_posts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cee_comments" ADD CONSTRAINT "cee_comments_parent_id_cee_comments_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "cee_comments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cee_flags" ADD CONSTRAINT "cee_flags_post_id_cee_posts_id_fkey" FOREIGN KEY ("post_id") REFERENCES "cee_posts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cee_reactions" ADD CONSTRAINT "cee_reactions_post_id_cee_posts_id_fkey" FOREIGN KEY ("post_id") REFERENCES "cee_posts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cee_suggestions" ADD CONSTRAINT "cee_suggestions_post_id_cee_posts_id_fkey" FOREIGN KEY ("post_id") REFERENCES "cee_posts"("id") ON DELETE CASCADE;