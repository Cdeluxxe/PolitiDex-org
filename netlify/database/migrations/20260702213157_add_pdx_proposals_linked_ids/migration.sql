ALTER TABLE "pdx_proposals" ADD COLUMN "linked_politician_ids" jsonb DEFAULT '[]';--> statement-breakpoint
ALTER TABLE "pdx_proposals" ADD COLUMN "linked_race_ids" jsonb DEFAULT '[]';