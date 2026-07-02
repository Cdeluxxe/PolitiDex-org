CREATE TABLE "pdx_proposal_votes" (
	"id" serial PRIMARY KEY,
	"proposal_id" integer NOT NULL,
	"voter_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pdx_proposals" (
	"id" serial PRIMARY KEY,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text,
	"submitter_name" text DEFAULT 'Anonymous' NOT NULL,
	"submitter_key" text,
	"support_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "pdx_proposal_votes_unique" ON "pdx_proposal_votes" ("proposal_id","voter_key");--> statement-breakpoint
CREATE INDEX "pdx_proposal_votes_proposal_idx" ON "pdx_proposal_votes" ("proposal_id");--> statement-breakpoint
CREATE INDEX "pdx_proposals_status_idx" ON "pdx_proposals" ("status");--> statement-breakpoint
CREATE INDEX "pdx_proposals_support_idx" ON "pdx_proposals" ("support_count");--> statement-breakpoint
CREATE INDEX "pdx_proposals_created_idx" ON "pdx_proposals" ("created_at");--> statement-breakpoint
ALTER TABLE "pdx_proposal_votes" ADD CONSTRAINT "pdx_proposal_votes_proposal_id_pdx_proposals_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "pdx_proposals"("id") ON DELETE CASCADE;