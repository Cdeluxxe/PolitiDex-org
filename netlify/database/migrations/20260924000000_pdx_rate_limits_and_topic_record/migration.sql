CREATE TABLE "pdx_rate_limits" (
	"id" serial PRIMARY KEY,
	"bucket" text NOT NULL,
	"hits" integer DEFAULT 0 NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pdx_notification_prefs" ADD COLUMN "topic_record" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "pdx_rate_limits_bucket_unique" ON "pdx_rate_limits" ("bucket");--> statement-breakpoint
CREATE INDEX "pdx_rate_limits_window_idx" ON "pdx_rate_limits" ("window_start");