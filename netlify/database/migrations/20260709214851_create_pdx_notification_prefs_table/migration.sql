CREATE TABLE "pdx_notification_prefs" (
	"id" serial PRIMARY KEY,
	"user_id" text NOT NULL,
	"email" text,
	"in_app" boolean DEFAULT true NOT NULL,
	"email_enabled" boolean DEFAULT false NOT NULL,
	"frequency" text DEFAULT 'weekly' NOT NULL,
	"topic_evidence" boolean DEFAULT true NOT NULL,
	"topic_promises" boolean DEFAULT true NOT NULL,
	"topic_community" boolean DEFAULT true NOT NULL,
	"topic_team" boolean DEFAULT true NOT NULL,
	"last_seen_at" timestamp with time zone,
	"last_digest_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "pdx_notification_prefs_user_unique" ON "pdx_notification_prefs" ("user_id");--> statement-breakpoint
CREATE INDEX "pdx_notification_prefs_email_idx" ON "pdx_notification_prefs" ("email_enabled");