CREATE TABLE "pdx_snapshots" (
	"id" serial PRIMARY KEY,
	"user_id" text NOT NULL,
	"collection" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "pdx_snapshots_user_collection_unique" ON "pdx_snapshots" ("user_id","collection");