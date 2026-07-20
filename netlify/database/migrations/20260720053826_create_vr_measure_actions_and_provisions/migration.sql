CREATE TABLE "vr_measure_actions" (
	"id" serial PRIMARY KEY,
	"measure_id" integer NOT NULL,
	"stage" text NOT NULL,
	"chamber" text,
	"action_date" timestamp with time zone,
	"text" text DEFAULT '' NOT NULL,
	"source_url" text NOT NULL,
	"source_label" text DEFAULT 'Congress.gov',
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vr_measure_provisions" (
	"id" serial PRIMARY KEY,
	"measure_id" integer NOT NULL,
	"label" text NOT NULL,
	"description" text DEFAULT '',
	"issue_key" text,
	"support_meaning" text DEFAULT 'yea_supports',
	"source_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX "vr_measure_actions_measure_idx" ON "vr_measure_actions" ("measure_id");--> statement-breakpoint
CREATE INDEX "vr_measure_actions_date_idx" ON "vr_measure_actions" ("action_date");--> statement-breakpoint
CREATE INDEX "vr_measure_provisions_measure_idx" ON "vr_measure_provisions" ("measure_id");--> statement-breakpoint
ALTER TABLE "vr_measure_actions" ADD CONSTRAINT "vr_measure_actions_measure_id_vr_measures_id_fkey" FOREIGN KEY ("measure_id") REFERENCES "vr_measures"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "vr_measure_provisions" ADD CONSTRAINT "vr_measure_provisions_measure_id_vr_measures_id_fkey" FOREIGN KEY ("measure_id") REFERENCES "vr_measures"("id") ON DELETE CASCADE;