-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — legislative action timeline + omnibus provisions (Phase 3)
-- ─────────────────────────────────────────────────────────────────────────────
-- Adds two additive tables and seeds them for the flagship omnibus bills already in
-- the record. Fully additive and idempotent:
--   • CREATE TABLE IF NOT EXISTS for both tables (+ indexes), so re-applying is safe
--     and it never touches an existing table.
--   • Every seed INSERT is guarded by a per-measure sentinel (NOT EXISTS), so the
--     data is written at most once and re-running is a no-op.
-- Rolls forward from the applied voting-record migrations; never edits one.
--
-- vr_measure_actions — the real "how it moved" timeline the bill detail panel now
--   renders (replacing a timeline the client used to synthesize from roll calls).
-- vr_measure_provisions — named sub-units of a true megabill, one level finer than
--   the measure↔issue tags, each optionally mapped to an issue key + support_meaning.
--
-- Facts (dates, roll calls, tallies) match the roll calls already cited in the
-- record and on Congress.gov / the House Clerk. Sources are canonical and required.

CREATE TABLE IF NOT EXISTS "vr_measure_actions" (
  "id" serial PRIMARY KEY,
  "measure_id" integer NOT NULL REFERENCES "vr_measures"("id") ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS "vr_measure_actions_measure_idx" ON "vr_measure_actions" ("measure_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vr_measure_actions_date_idx" ON "vr_measure_actions" ("action_date");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vr_measure_provisions" (
  "id" serial PRIMARY KEY,
  "measure_id" integer NOT NULL REFERENCES "vr_measures"("id") ON DELETE CASCADE,
  "label" text NOT NULL,
  "description" text DEFAULT '',
  "issue_key" text,
  "support_meaning" text DEFAULT 'yea_supports',
  "source_url" text,
  "sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vr_measure_provisions_measure_idx" ON "vr_measure_provisions" ("measure_id");
--> statement-breakpoint

DO $$
DECLARE
  m_hr1  integer;
  m_hr29 integer;
  HR1 text := 'https://www.congress.gov/bill/119th-congress/house-bill/1/all-actions';
  HR1B text := 'https://www.congress.gov/bill/119th-congress/house-bill/1';
  CBO text := 'https://www.cbo.gov/publication/61461';
BEGIN
  -- ── H.R. 1 — One Big Beautiful Bill Act ─────────────────────────────────────
  SELECT id INTO m_hr1 FROM vr_measures WHERE number = 'H.R. 1' AND congress = 119 LIMIT 1;
  IF m_hr1 IS NOT NULL THEN
    -- Timeline (guarded so it seeds once).
    IF NOT EXISTS (SELECT 1 FROM vr_measure_actions WHERE measure_id = m_hr1) THEN
      INSERT INTO vr_measure_actions (measure_id, stage, chamber, action_date, text, source_url, source_label, sort_order) VALUES
        (m_hr1, 'introduced', 'house', '2025-05-20T00:00:00Z', 'Introduced in the House as the budget reconciliation vehicle.', HR1B, 'Congress.gov', 10),
        (m_hr1, 'passed_house', 'house', '2025-05-22T00:00:00Z', 'House passed its initial version of the bill.', 'https://clerk.house.gov/Votes/2025', 'U.S. House Clerk', 20),
        (m_hr1, 'passed_senate', 'senate', '2025-07-01T00:00:00Z', 'Senate passed an amended version, 50–50 on the Vice President''s tie-break (roll call 372).', 'https://www.senate.gov/legislative/LIS/roll_call_votes/vote1191/vote_119_1_00372.htm', 'U.S. Senate', 30),
        (m_hr1, 'resolving_differences', 'house', '2025-07-03T00:00:00Z', 'House agreed to the Senate amendment, 218–214 (roll call 190).', 'https://clerk.house.gov/Votes/2025190', 'U.S. House Clerk', 40),
        (m_hr1, 'enacted', NULL, '2025-07-04T00:00:00Z', 'Signed into law, enacting every bundled provision at once.', HR1B, 'Congress.gov', 50);
    END IF;
    -- Named provisions (guarded so it seeds once). Each maps to an issue key so the
    -- panel can show what the megabill bundled and which way each part cuts.
    IF NOT EXISTS (SELECT 1 FROM vr_measure_provisions WHERE measure_id = m_hr1) THEN
      INSERT INTO vr_measure_provisions (measure_id, label, description, issue_key, support_meaning, source_url, sort_order) VALUES
        (m_hr1, 'Permanent 2017 tax cuts', 'Makes the 2017 individual income-tax rates permanent and adds temporary deductions for tips and overtime pay.', 'tax_middle_class', 'yea_supports', HR1B, 10),
        (m_hr1, 'Medicaid spending cut', 'Reduces federal Medicaid spending and adds new eligibility and work requirements.', 'healthcare', 'yea_opposes', CBO, 20),
        (m_hr1, 'SNAP food-aid changes', 'Narrows SNAP eligibility and shifts more of the cost onto the states.', NULL, 'yea_opposes', CBO, 30),
        (m_hr1, 'Border & immigration enforcement', 'Adds major funding for border security and immigration detention and removal.', 'border_security', 'yea_supports', HR1B, 40),
        (m_hr1, 'Clean-energy credit rollback', 'Phases out and repeals clean-energy and electric-vehicle tax credits enacted in 2022.', 'climate_action', 'yea_opposes', HR1B, 50),
        (m_hr1, 'Deficit impact', 'Nonpartisan CBO analysis projects the Act adds trillions of dollars to federal deficits over ten years.', 'national_debt', 'yea_opposes', CBO, 60),
        (m_hr1, 'Student-loan overhaul', 'Eliminates several income-driven student-loan repayment plans and caps graduate borrowing.', 'edu_college_cost', 'yea_opposes', HR1B, 70),
        (m_hr1, 'Defense increase', 'Adds a large increase in defense and military spending.', 'strong_defense', 'yea_supports', HR1B, 80),
        (m_hr1, 'K-12 scholarship tax credit', 'Creates a federal tax credit for donations to private-school scholarship organizations.', 'school_choice', 'yea_supports', HR1B, 90);
    END IF;
  END IF;

  -- ── H.R. 29 — Laken Riley Act (timeline only) ───────────────────────────────
  SELECT id INTO m_hr29 FROM vr_measures WHERE number = 'H.R. 29' AND congress = 119 LIMIT 1;
  IF m_hr29 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM vr_measure_actions WHERE measure_id = m_hr29) THEN
    INSERT INTO vr_measure_actions (measure_id, stage, chamber, action_date, text, source_url, source_label, sort_order) VALUES
      (m_hr29, 'introduced', 'house', '2025-01-03T00:00:00Z', 'Introduced in the House.', 'https://www.congress.gov/bill/119th-congress/house-bill/29', 'Congress.gov', 10),
      (m_hr29, 'passed_house', 'house', '2025-01-07T00:00:00Z', 'House passed the bill, 264–159 (roll call 6).', 'https://clerk.house.gov/Votes/20256', 'U.S. House Clerk', 20),
      (m_hr29, 'passed_senate', 'senate', '2025-01-20T00:00:00Z', 'Senate passed an amended version broadening the detention triggers.', 'https://www.congress.gov/bill/119th-congress/house-bill/29/all-actions', 'Congress.gov', 30),
      (m_hr29, 'resolving_differences', 'house', '2025-01-22T00:00:00Z', 'House agreed to the Senate amendments.', 'https://clerk.house.gov/Votes/2025', 'U.S. House Clerk', 40),
      (m_hr29, 'enacted', NULL, '2025-01-29T00:00:00Z', 'Signed into law as Public Law 119-1.', 'https://www.congress.gov/bill/119th-congress/house-bill/29', 'Congress.gov', 50);
  END IF;
END $$;
