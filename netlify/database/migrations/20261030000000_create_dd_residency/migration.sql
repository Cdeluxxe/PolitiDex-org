-- ─────────────────────────────────────────────────────────────────────────────
-- DISTRICT RESIDENCY, phase 2 — the fact the write gate reads
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT THIS ADDS. One table, dd_residency: one row per (person, district)
-- recording whether this app has established that they live there, how, and when
-- a human last looked at it.
--
--   user_id      the verified Firebase uid, spelled as dd_posts.user_id spells it
--   district_key a district the app already maps (FK to dd_districts)
--   status       pending | verified | revoked
--   method       admin_grant | self_attest | location_pin | vendor
--   created_at   when the row appeared
--   reviewed_at  when a human last looked; null while it is only a request
--
-- WHY A ROW AND NOT A CLAIM ON THE REQUEST. The only location signal the rest of
-- the app holds is window._currentVoterLocation — a zip or pin the reader typed
-- themselves. That is how Who Represents Me answers "which district am I in"
-- without knowing who is asking, and it is NOT residency: a reader can retype it
-- at will. "verified in this district" has to mean more than "you told us so", so
-- residency lives here, keyed on the uid the server verified, written only by an
-- authenticated path, and never inferred from a body.
--
-- STATUS AND METHOD ARE READ TOGETHER. A status is only as good as how it was
-- reached, so the gate in netlify/lib/district-room-core.mjs requires both: the
-- status must be `verified` AND the method must be one that can verify. In this
-- pass that is `admin_grant` alone. A `self_attest` row is a request and stays
-- pending; a `location_pin` row — which nothing writes today — could not post
-- even if some later code path set its status to verified by mistake. `vendor` is
-- the reserved value for the ID check that is NOT wired in this pass (no Stripe,
-- no Veriff, no upload, no third call — see the verifyVendor seam).
--
-- UTAH ONLY IN THIS PASS. Enforced by the foreign key plus a state check in the
-- Function, because dd_districts holds `ut-` rows only: pdxRepsForMe()
-- .districtsResolvable is true in Utah and nowhere else, and verifying somebody
-- for a district the app cannot resolve is the confident wrong district
-- DISTRICT_MAPS.md forbids.
--
-- NOT A PROFILE. No name, no email, no address, no zip, no coordinate and no
-- document. Nothing here is read by the formal record (vr_*), the evidence
-- exchange (cee_*), the open forum (pdx_*), Direction Match, Word vs Action, the
-- finance lane, the Eye, the Utah ingest or the offline pack, and no count from
-- it reaches a person file.
--
-- WHY THE VERSION WAS HAND-SET. `drizzle-kit generate` stamps the wall clock and
-- this repo's hand-versioned migrations run ahead of the calendar — the generated
-- stamp for this pass was 20260907213545, which sorts BEHIND migrations already
-- applied and would be rejected on deploy. 20261030000000 is one version after
-- the current tail (20261029000000_create_dd_district_discussion_tables), which is
-- also the migration that created the dd_districts table this one references. The
-- generated snapshot.json is untouched so the drizzle chain stays honest.
--
-- WHY EVERY STATEMENT IS GUARDED. Each CREATE is IF NOT EXISTS and the foreign key
-- is added inside a DO block that swallows duplicate_object, so re-applying this
-- file is a no-op rather than an error. It edits no applied migration and alters no
-- existing table.

CREATE TABLE IF NOT EXISTS "dd_residency" (
	"id" serial PRIMARY KEY,
	"user_id" text NOT NULL,
	"district_key" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"method" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	CONSTRAINT "dd_residency_status_check" CHECK ("status" in ('pending', 'verified', 'revoked')),
	CONSTRAINT "dd_residency_method_check" CHECK ("method" in ('admin_grant', 'self_attest', 'location_pin', 'vendor'))
);
--> statement-breakpoint
-- One row per person per district. A person legitimately has three district seats
-- (U.S. House, State Senate, State House), so several rows per person are correct
-- and two rows for the SAME district are not — the upsert in the Function depends
-- on this index to turn a repeat request into an update rather than a duplicate.
CREATE UNIQUE INDEX IF NOT EXISTS "dd_residency_user_district_unique" ON "dd_residency" ("user_id","district_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dd_residency_district_status_idx" ON "dd_residency" ("district_key","status");
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "dd_residency" ADD CONSTRAINT "dd_residency_district_key_dd_districts_district_id_fkey" FOREIGN KEY ("district_key") REFERENCES "dd_districts"("district_id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
