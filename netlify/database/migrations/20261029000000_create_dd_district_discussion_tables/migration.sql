-- ─────────────────────────────────────────────────────────────────────────────
-- DISTRICT DISCUSSION, phase 0 — the room next to the file (schema only)
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT THIS ADDS. Four tables, dd_*, standing up one room per (district, issue):
--
--   dd_districts    the district vocabulary the app already maps
--   dd_issue_keys   the shipped ISSUE_MAP key vocabulary
--   dd_threads      a room — UNIQUE (district_id, issue_key)
--   dd_posts        a person's sentence in a room
--
-- The full rationale lives beside the models in db/schema.ts. In short: no score,
-- no vote, no reaction, no reply tally, no ranking, no party. Those columns do not
-- exist rather than being defaulted off, because a column that counts is a column
-- something eventually ranks. Nothing in these tables is read by the formal record
-- (vr_*), the evidence exchange (cee_*), the free-conversation forum (pdx_forum_*),
-- Word vs Action, Direction Match, the finance lane, the alignment tool, Door 2's
-- picks or any politician profile. No count from here ever lands on a person file
-- and there is no "mandate %" anywhere in this pass.
--
-- PHASE 0 IS SCHEMA ONLY. No reader surface queries these tables, no Function
-- writes to them, and no route, nav entry or mounted view renders them.
--
-- WHY THE VERSION WAS HAND-SET. `drizzle-kit generate` stamps the wall clock, and
-- this repo's hand-versioned migrations run ahead of the calendar — the generated
-- stamp for this pass was 20260907042358, which sorts BEHIND migrations already in
-- the tree and would be rejected on deploy. 20261029000000 is therefore chosen, one
-- version after the current tail (20261028000000_vr_federal_wave_f11.sql). The
-- generated snapshot.json is untouched and its prevIds still names the snapshot
-- this migration was diffed against, so the drizzle chain stays honest.
--
-- WHY EVERY STATEMENT IS GUARDED. Each CREATE is IF NOT EXISTS, each foreign key is
-- added inside a DO block that swallows duplicate_object, and both seeds are
-- ON CONFLICT DO NOTHING. Re-applying this file is a no-op rather than an error, and
-- it edits no applied migration and touches no existing table.

CREATE TABLE IF NOT EXISTS "dd_districts" (
	"district_id" text PRIMARY KEY,
	"state" text NOT NULL,
	"seat_key" text NOT NULL,
	"district_number" integer NOT NULL,
	"label" text NOT NULL,
	CONSTRAINT "dd_districts_seat_key_check" CHECK ("seat_key" in ('house', 'statesenate', 'statehouse')),
	CONSTRAINT "dd_districts_state_check" CHECK ("state" ~ '^[A-Z]{2}$'),
	CONSTRAINT "dd_districts_number_check" CHECK ("district_number" > 0)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dd_issue_keys" (
	"issue_key" text PRIMARY KEY,
	CONSTRAINT "dd_issue_keys_shape_check" CHECK ("issue_key" ~ '^[a-z0-9_]+$')
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dd_posts" (
	"id" serial PRIMARY KEY,
	"thread_id" integer NOT NULL,
	"user_id" text,
	"verified_resident" boolean DEFAULT false NOT NULL,
	"body" text NOT NULL,
	"source_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dd_threads" (
	"id" serial PRIMARY KEY,
	"district_id" text NOT NULL,
	"issue_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dd_districts_state_seat_idx" ON "dd_districts" ("state","seat_key","district_number");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dd_posts_thread_created_idx" ON "dd_posts" ("thread_id","created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "dd_threads_district_issue_unique" ON "dd_threads" ("district_id","issue_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dd_threads_district_idx" ON "dd_threads" ("district_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dd_threads_issue_idx" ON "dd_threads" ("issue_key");
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "dd_posts" ADD CONSTRAINT "dd_posts_thread_id_dd_threads_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "dd_threads"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "dd_threads" ADD CONSTRAINT "dd_threads_district_id_dd_districts_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "dd_districts"("district_id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "dd_threads" ADD CONSTRAINT "dd_threads_issue_key_dd_issue_keys_issue_key_fkey" FOREIGN KEY ("issue_key") REFERENCES "dd_issue_keys"("issue_key") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
-- ── SEED: the district vocabulary ──────────────────────────────────────────
-- 49 rows, derived from KEY_RACES_LOCATIONS in ballot-breakdown.js — the curated
-- area table the ballot already resolves a reader's own seat from. Nothing here is
-- invented. A district Utah has but that curated map does not carry gets NO ROW, so
-- the foreign key on dd_threads.district_id refuses a room for it: that is what
-- "fail closed if unmapped" means in this pass, and it is enforced by the database
-- rather than by a caller remembering to check.
--
-- `ut-` is the only state prefix because pdxRepsForMe().districtsResolvable is true
-- in Utah and nowhere else. Widening this table is the LAST step of adding a state,
-- not the first — DISTRICT_MAPS.md carries the five things that must be true before
-- that flag moves, and a room for a half-mapped district is exactly the confident
-- wrong district that document forbids.
--
-- Only the three geometric seat classes appear, in Door 2's own seat-key language
-- (house | statesenate | statehouse). U.S. Senate, Governor and local offices carry
-- no district, so they have nothing to be a room about and are absent by
-- construction.
INSERT INTO "dd_districts" ("district_id", "state", "seat_key", "district_number", "label") VALUES
	('ut-house-1', 'UT', 'house', 1, 'Utah · U.S. House District 1'),
	('ut-house-2', 'UT', 'house', 2, 'Utah · U.S. House District 2'),
	('ut-house-3', 'UT', 'house', 3, 'Utah · U.S. House District 3'),
	('ut-house-4', 'UT', 'house', 4, 'Utah · U.S. House District 4'),
	('ut-statesenate-1', 'UT', 'statesenate', 1, 'Utah State Senate District 1'),
	('ut-statesenate-2', 'UT', 'statesenate', 2, 'Utah State Senate District 2'),
	('ut-statesenate-3', 'UT', 'statesenate', 3, 'Utah State Senate District 3'),
	('ut-statesenate-5', 'UT', 'statesenate', 5, 'Utah State Senate District 5'),
	('ut-statesenate-6', 'UT', 'statesenate', 6, 'Utah State Senate District 6'),
	('ut-statesenate-9', 'UT', 'statesenate', 9, 'Utah State Senate District 9'),
	('ut-statesenate-11', 'UT', 'statesenate', 11, 'Utah State Senate District 11'),
	('ut-statesenate-12', 'UT', 'statesenate', 12, 'Utah State Senate District 12'),
	('ut-statesenate-16', 'UT', 'statesenate', 16, 'Utah State Senate District 16'),
	('ut-statesenate-17', 'UT', 'statesenate', 17, 'Utah State Senate District 17'),
	('ut-statesenate-19', 'UT', 'statesenate', 19, 'Utah State Senate District 19'),
	('ut-statesenate-20', 'UT', 'statesenate', 20, 'Utah State Senate District 20'),
	('ut-statesenate-22', 'UT', 'statesenate', 22, 'Utah State Senate District 22'),
	('ut-statesenate-24', 'UT', 'statesenate', 24, 'Utah State Senate District 24'),
	('ut-statesenate-25', 'UT', 'statesenate', 25, 'Utah State Senate District 25'),
	('ut-statesenate-26', 'UT', 'statesenate', 26, 'Utah State Senate District 26'),
	('ut-statesenate-27', 'UT', 'statesenate', 27, 'Utah State Senate District 27'),
	('ut-statesenate-28', 'UT', 'statesenate', 28, 'Utah State Senate District 28'),
	('ut-statesenate-29', 'UT', 'statesenate', 29, 'Utah State Senate District 29'),
	('ut-statehouse-3', 'UT', 'statehouse', 3, 'Utah State House District 3'),
	('ut-statehouse-4', 'UT', 'statehouse', 4, 'Utah State House District 4'),
	('ut-statehouse-6', 'UT', 'statehouse', 6, 'Utah State House District 6'),
	('ut-statehouse-9', 'UT', 'statehouse', 9, 'Utah State House District 9'),
	('ut-statehouse-10', 'UT', 'statehouse', 10, 'Utah State House District 10'),
	('ut-statehouse-14', 'UT', 'statehouse', 14, 'Utah State House District 14'),
	('ut-statehouse-15', 'UT', 'statehouse', 15, 'Utah State House District 15'),
	('ut-statehouse-22', 'UT', 'statehouse', 22, 'Utah State House District 22'),
	('ut-statehouse-28', 'UT', 'statehouse', 28, 'Utah State House District 28'),
	('ut-statehouse-29', 'UT', 'statehouse', 29, 'Utah State House District 29'),
	('ut-statehouse-30', 'UT', 'statehouse', 30, 'Utah State House District 30'),
	('ut-statehouse-36', 'UT', 'statehouse', 36, 'Utah State House District 36'),
	('ut-statehouse-42', 'UT', 'statehouse', 42, 'Utah State House District 42'),
	('ut-statehouse-45', 'UT', 'statehouse', 45, 'Utah State House District 45'),
	('ut-statehouse-52', 'UT', 'statehouse', 52, 'Utah State House District 52'),
	('ut-statehouse-57', 'UT', 'statehouse', 57, 'Utah State House District 57'),
	('ut-statehouse-59', 'UT', 'statehouse', 59, 'Utah State House District 59'),
	('ut-statehouse-62', 'UT', 'statehouse', 62, 'Utah State House District 62'),
	('ut-statehouse-63', 'UT', 'statehouse', 63, 'Utah State House District 63'),
	('ut-statehouse-66', 'UT', 'statehouse', 66, 'Utah State House District 66'),
	('ut-statehouse-67', 'UT', 'statehouse', 67, 'Utah State House District 67'),
	('ut-statehouse-68', 'UT', 'statehouse', 68, 'Utah State House District 68'),
	('ut-statehouse-69', 'UT', 'statehouse', 69, 'Utah State House District 69'),
	('ut-statehouse-70', 'UT', 'statehouse', 70, 'Utah State House District 70'),
	('ut-statehouse-71', 'UT', 'statehouse', 71, 'Utah State House District 71'),
	('ut-statehouse-75', 'UT', 'statehouse', 75, 'Utah State House District 75')
ON CONFLICT ("district_id") DO NOTHING;
--> statement-breakpoint
-- ── SEED: the issue vocabulary ─────────────────────────────────────────────
-- 121 rows, the whole of db/issue-keys.json — the generated mirror of ISSUE_MAP in
-- alignment-tool.js. A room is about a shipped key or it does not exist. There is no
-- free-text topic column and no "other" bucket, so a new subject for a room is a
-- vocabulary decision made where this repo makes them (ISSUE_MAP, with the
-- db/vr-issue-key-proposals.md paper trail) and not a string a writer invents.
INSERT INTO "dd_issue_keys" ("issue_key") VALUES
	('america_first'),
	('america_first_fp'),
	('audit_spending'),
	('back_police'),
	('border_security'),
	('broadband'),
	('campaign_finance'),
	('cannabis_reform'),
	('checks_balances'),
	('child_care'),
	('civil_service_control'),
	('climate_action'),
	('congress_oversight'),
	('cost_living'),
	('crypto_cbdc'),
	('cut_spending'),
	('datacenter_growth'),
	('datacenter_power'),
	('datacenter_water'),
	('democracy_balance'),
	('deportations'),
	('dev_district_finance'),
	('disaster_resilience'),
	('econ_balance'),
	('econ_corp_account'),
	('econ_growth'),
	('econ_smallbiz'),
	('econ_trade'),
	('econ_workers'),
	('edu_balance'),
	('edu_college_cost'),
	('edu_parental'),
	('election_integrity'),
	('election_security'),
	('end_dei'),
	('energy_production'),
	('enviro_balance'),
	('enviro_energy'),
	('family_support'),
	('foreign_balance'),
	('free_speech'),
	('gov_balance'),
	('gov_regulation'),
	('gov_services'),
	('gov_transparency'),
	('gov_waste'),
	('guard_authority'),
	('gun_balance'),
	('gun_rights'),
	('gun_safety'),
	('health_balance'),
	('health_drug_prices'),
	('health_mental'),
	('health_rural'),
	('healthcare'),
	('healthcare_costs'),
	('healthcare_market'),
	('homeless'),
	('housing'),
	('housing_build'),
	('housing_first_time'),
	('housing_support'),
	('immig_balance'),
	('immig_fentanyl'),
	('immig_legal'),
	('immigration_reform'),
	('infrastructure'),
	('israel_support'),
	('judicial_check'),
	('justice_balance'),
	('justice_reform'),
	('lands_balance'),
	('lands_energy'),
	('lands_keep_public'),
	('lands_local'),
	('lands_preserve'),
	('lgbtq_rights'),
	('lower_taxes'),
	('medical_freedom'),
	('national_debt'),
	('paid_leave'),
	('permitting_reform'),
	('power_of_purse'),
	('privacy_rights'),
	('pro_choice'),
	('pro_life'),
	('prop_tax'),
	('property_rights'),
	('property_tax'),
	('public_schools'),
	('reform_balance'),
	('religious_liberty'),
	('repro_balance'),
	('restraint'),
	('rights_balance'),
	('rural_ag'),
	('school_choice'),
	('scotus_reform'),
	('social_security'),
	('sound_money'),
	('state_standing'),
	('states_federal_power'),
	('stock_trading_ban'),
	('strong_defense'),
	('tariffs_authority'),
	('tariffs_china'),
	('tariffs_growth'),
	('tariffs_prices'),
	('tax_middle_class'),
	('tech_balance'),
	('tech_innovation'),
	('term_limits'),
	('tobacco_nicotine'),
	('tough_on_crime'),
	('transit'),
	('veterans'),
	('voter_id'),
	('voting_access'),
	('war_powers'),
	('water'),
	('water_storage')
ON CONFLICT ("issue_key") DO NOTHING;
