CREATE TABLE "vr_measure_issues" (
	"id" serial PRIMARY KEY,
	"measure_id" integer NOT NULL,
	"issue_key" text NOT NULL,
	"weight" integer DEFAULT 100 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"support_meaning" text DEFAULT 'yea_supports' NOT NULL,
	"rationale" text DEFAULT '',
	"source_url" text
);
--> statement-breakpoint
CREATE TABLE "vr_measures" (
	"id" serial PRIMARY KEY,
	"measure_type" text DEFAULT 'bill' NOT NULL,
	"congress" integer,
	"chamber" text,
	"number" text,
	"title" text NOT NULL,
	"short_title" text,
	"summary" text DEFAULT '',
	"parent_id" integer,
	"introduced_at" timestamp with time zone,
	"sponsor_id" text,
	"status" text DEFAULT 'introduced' NOT NULL,
	"source_url" text NOT NULL,
	"source_label" text DEFAULT 'Congress.gov',
	"external_ids" jsonb DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vr_member_votes" (
	"id" serial PRIMARY KEY,
	"rollcall_id" integer NOT NULL,
	"politician_id" text NOT NULL,
	"position" text NOT NULL,
	"is_party" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vr_positions" (
	"id" serial PRIMARY KEY,
	"measure_id" integer NOT NULL,
	"politician_id" text NOT NULL,
	"action_type" text NOT NULL,
	"supports" boolean,
	"acted_at" timestamp with time zone,
	"source_url" text NOT NULL,
	"note" text DEFAULT ''
);
--> statement-breakpoint
CREATE TABLE "vr_rollcalls" (
	"id" serial PRIMARY KEY,
	"measure_id" integer NOT NULL,
	"chamber" text NOT NULL,
	"congress" integer,
	"session" integer,
	"roll_number" integer,
	"vote_date" timestamp with time zone NOT NULL,
	"question" text,
	"action_type" text DEFAULT 'passage' NOT NULL,
	"result" text,
	"required_majority" text DEFAULT 'simple',
	"totals" jsonb DEFAULT '{}',
	"source_url" text NOT NULL,
	"source_label" text DEFAULT 'Congress.gov',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "vr_measure_issues_unique" ON "vr_measure_issues" ("measure_id","issue_key");--> statement-breakpoint
CREATE INDEX "vr_measure_issues_issue_idx" ON "vr_measure_issues" ("issue_key");--> statement-breakpoint
CREATE INDEX "vr_measure_issues_measure_idx" ON "vr_measure_issues" ("measure_id");--> statement-breakpoint
CREATE INDEX "vr_measures_type_idx" ON "vr_measures" ("measure_type");--> statement-breakpoint
CREATE INDEX "vr_measures_congress_chamber_idx" ON "vr_measures" ("congress","chamber");--> statement-breakpoint
CREATE INDEX "vr_measures_number_idx" ON "vr_measures" ("number");--> statement-breakpoint
CREATE UNIQUE INDEX "vr_member_votes_unique" ON "vr_member_votes" ("rollcall_id","politician_id");--> statement-breakpoint
CREATE INDEX "vr_member_votes_politician_idx" ON "vr_member_votes" ("politician_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vr_positions_unique" ON "vr_positions" ("measure_id","politician_id","action_type");--> statement-breakpoint
CREATE INDEX "vr_positions_politician_idx" ON "vr_positions" ("politician_id");--> statement-breakpoint
CREATE INDEX "vr_positions_measure_idx" ON "vr_positions" ("measure_id");--> statement-breakpoint
CREATE INDEX "vr_rollcalls_measure_idx" ON "vr_rollcalls" ("measure_id");--> statement-breakpoint
CREATE INDEX "vr_rollcalls_date_idx" ON "vr_rollcalls" ("vote_date");--> statement-breakpoint
CREATE UNIQUE INDEX "vr_rollcalls_unique" ON "vr_rollcalls" ("chamber","congress","session","roll_number");--> statement-breakpoint
ALTER TABLE "vr_measure_issues" ADD CONSTRAINT "vr_measure_issues_measure_id_vr_measures_id_fkey" FOREIGN KEY ("measure_id") REFERENCES "vr_measures"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "vr_measures" ADD CONSTRAINT "vr_measures_parent_id_vr_measures_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "vr_measures"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "vr_member_votes" ADD CONSTRAINT "vr_member_votes_rollcall_id_vr_rollcalls_id_fkey" FOREIGN KEY ("rollcall_id") REFERENCES "vr_rollcalls"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "vr_positions" ADD CONSTRAINT "vr_positions_measure_id_vr_measures_id_fkey" FOREIGN KEY ("measure_id") REFERENCES "vr_measures"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "vr_rollcalls" ADD CONSTRAINT "vr_rollcalls_measure_id_vr_measures_id_fkey" FOREIGN KEY ("measure_id") REFERENCES "vr_measures"("id") ON DELETE CASCADE;--> statement-breakpoint
-- ─────────────────────────────────────────────────────────────────────────────
-- Hand-verified sample voting record (dev seed)
-- ─────────────────────────────────────────────────────────────────────────────
-- A small, real, hand-verified sample so the Voting Record API and the later UI
-- phases have data to render. Every row cites an official source. The politician
-- ids (julie_fedorchak, troy_downing, mike_simpson, mike_flood) are the SAME roster
-- slugs the app's stance data uses, so "stance vs. record" lights up immediately.
--
-- Coverage: a multi-issue bill (H.R. 1), a focused bill (H.R. 29), an amendment
-- modelled with parent_id + its own roll call (Senate amendments to H.R. 29, House
-- concurrence), and a non-roll-call action (H.R. 9311 sponsorship) via vr_positions.
--
-- Verified facts (July 2025):
--   H.R. 1  roll call 190 — 2025-07-03, motion to concur, passed 218-214
--            (clerk.house.gov/Votes/2025190). All four seed Republicans voted yea.
--   H.R. 29 roll call 6   — 2025-01-07, passage, passed 264-159
--            (clerk.house.gov/Votes/20256). All Republicans voted yea.
--   H.R. 29 roll call 23  — 2025-01-22, concur in Senate amendments, passed 263-156
--            (clerk.house.gov/Votes/202523). All Republicans voted yea.
--
-- Idempotent: guarded on the H.R. 1 sentinel row, so re-applying is a no-op. Ids are
-- chained through plpgsql variables (serial pks), so no natural-key lookups needed.
-- To correct or extend the sample after this migration is applied, roll forward with
-- a NEW migration — never edit an applied one.
DO $$
DECLARE
  m_hr1 integer;
  m_hr29 integer;
  m_hr29_samdt integer;
  m_hr9311 integer;
  rc integer;
BEGIN
  IF EXISTS (SELECT 1 FROM vr_measures WHERE number = 'H.R. 1' AND congress = 119) THEN
    RETURN;
  END IF;

  -- ── M1: H.R. 1 — One Big Beautiful Bill Act (multi-issue / omnibus) ──────────
  INSERT INTO vr_measures
    (measure_type, congress, chamber, number, title, short_title, summary, status, source_url, source_label, external_ids)
  VALUES
    ('bill', 119, 'house', 'H.R. 1', 'One Big Beautiful Bill Act', 'One Big Beautiful Bill Act',
     'Budget reconciliation act extending the 2017 tax cuts, changing Medicaid and SNAP, funding border enforcement, and expanding federal energy leasing.',
     'enacted', 'https://www.congress.gov/bill/119th-congress/house-bill/1', 'Congress.gov',
     '{"congressGovId":"hr1-119","billSlug":"119-hr1"}')
  RETURNING id INTO m_hr1;

  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
    (m_hr1, 'lower_taxes',     100, true,  'yea_supports', 'Extends and expands the 2017 individual and business tax cuts.'),
    (m_hr1, 'cut_spending',     70, false, 'yea_supports', 'Enacts net spending reductions through budget reconciliation.'),
    (m_hr1, 'healthcare',       60, false, 'yea_opposes',  'Reduces federal Medicaid spending and tightens eligibility; a yea vote cuts against expanding healthcare access.'),
    (m_hr1, 'border_security',  55, false, 'yea_supports', 'Provides new funding for border enforcement and immigration operations.'),
    (m_hr1, 'lands_energy',     40, false, 'yea_supports', 'Expands onshore and offshore oil, gas, and coal leasing on federal land.');

  INSERT INTO vr_rollcalls
    (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)
  VALUES
    (m_hr1, 'house', 119, 1, 190, '2025-07-03T00:00:00Z', 'On Motion to Concur in the Senate Amendment', 'passage', 'passed', 'simple',
     '{"yea":218,"nay":214,"present":0,"notVoting":0}', 'https://clerk.house.gov/Votes/2025190', 'U.S. House Clerk')
  RETURNING id INTO rc;

  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'julie_fedorchak', 'yea', 'with_party'),
    (rc, 'troy_downing',    'yea', 'with_party'),
    (rc, 'mike_simpson',    'yea', 'with_party'),
    (rc, 'mike_flood',      'yea', 'with_party');

  -- ── M2: H.R. 29 — Laken Riley Act ───────────────────────────────────────────
  INSERT INTO vr_measures
    (measure_type, congress, chamber, number, title, short_title, summary, status, introduced_at, source_url, source_label, external_ids)
  VALUES
    ('bill', 119, 'house', 'H.R. 29', 'Laken Riley Act', 'Laken Riley Act',
     'Requires federal detention of unauthorized immigrants charged with theft-related and certain other crimes. Became Public Law 119-1.',
     'enacted', '2025-01-03T00:00:00Z', 'https://www.congress.gov/bill/119th-congress/house-bill/29', 'Congress.gov',
     '{"congressGovId":"hr29-119","publicLaw":"119-1"}')
  RETURNING id INTO m_hr29;

  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
    (m_hr29, 'deportations',    100, true,  'yea_supports', 'Mandates detention and removal proceedings for covered unauthorized immigrants.'),
    (m_hr29, 'border_security',  70, false, 'yea_supports', 'Tightens immigration enforcement.');

  INSERT INTO vr_rollcalls
    (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)
  VALUES
    (m_hr29, 'house', 119, 1, 6, '2025-01-07T00:00:00Z', 'On Passage', 'passage', 'passed', 'simple',
     '{"yea":264,"nay":159,"present":0,"notVoting":11}', 'https://clerk.house.gov/Votes/20256', 'U.S. House Clerk')
  RETURNING id INTO rc;

  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'julie_fedorchak', 'yea', 'with_party'),
    (rc, 'troy_downing',    'yea', 'with_party'),
    (rc, 'mike_simpson',    'yea', 'with_party'),
    (rc, 'mike_flood',      'yea', 'with_party');

  -- ── M3: Senate amendments to H.R. 29 — modelled as an amendment measure ──────
  -- (child of H.R. 29 via parent_id) with its own roll call: the House concurrence.
  INSERT INTO vr_measures
    (measure_type, congress, chamber, number, title, short_title, summary, status, parent_id, source_url, source_label, external_ids)
  VALUES
    ('amendment', 119, 'senate', 'Senate Amendments to H.R. 29', 'Senate amendments to the Laken Riley Act',
     'Senate amendments to the Laken Riley Act.',
     'Senate-passed amendments broadening the detention triggers; the House concurred on 2025-01-22.',
     'enacted', m_hr29, 'https://www.congress.gov/bill/119th-congress/house-bill/29/all-actions', 'Congress.gov',
     '{"congressGovId":"hr29-119"}')
  RETURNING id INTO m_hr29_samdt;

  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
    (m_hr29_samdt, 'deportations',    100, true,  'yea_supports', 'Concurring adopts the broadened detention/removal triggers.'),
    (m_hr29_samdt, 'border_security',  70, false, 'yea_supports', 'Tightens immigration enforcement.');

  INSERT INTO vr_rollcalls
    (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)
  VALUES
    (m_hr29_samdt, 'house', 119, 1, 23, '2025-01-22T00:00:00Z', 'On Motion to Concur in the Senate Amendments', 'amendment', 'passed', 'simple',
     '{"yea":263,"nay":156,"present":0,"notVoting":14}', 'https://clerk.house.gov/Votes/202523', 'U.S. House Clerk')
  RETURNING id INTO rc;

  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'julie_fedorchak', 'yea', 'with_party'),
    (rc, 'troy_downing',    'yea', 'with_party'),
    (rc, 'mike_simpson',    'yea', 'with_party'),
    (rc, 'mike_flood',      'yea', 'with_party');

  -- ── M4: H.R. 9311 — Build Housing Affordably Act (non-roll-call action) ──────
  -- Exercises vr_positions: Mike Flood is the lead sponsor (matches curated stance).
  INSERT INTO vr_measures
    (measure_type, congress, chamber, number, title, short_title, summary, status, sponsor_id, source_url, source_label, external_ids)
  VALUES
    ('bill', 119, 'house', 'H.R. 9311', 'Build Housing Affordably Act', 'Build Housing Affordably Act',
     'Aims to expand the housing supply.', 'introduced', 'mike_flood',
     'https://www.congress.gov/bill/119th-congress/house-bill/9311', 'Congress.gov',
     '{"congressGovId":"hr9311-119"}')
  RETURNING id INTO m_hr9311;

  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
    (m_hr9311, 'housing_build', 100, true, 'yea_supports', 'Measure is designed to increase housing supply.');

  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_hr9311, 'mike_flood', 'sponsor', true, '2025-06-01T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/9311', 'Lead sponsor.');
END $$;