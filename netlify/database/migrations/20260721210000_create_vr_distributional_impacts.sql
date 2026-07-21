-- ─────────────────────────────────────────────────────────────────────────────
-- Distributional Impact Ledger — "Who It Affects" (additive, Phase 1)
-- ─────────────────────────────────────────────────────────────────────────────
-- Adds ONE additive table and seeds it for the flagship omnibus already in the
-- record (H.R. 1 / One Big Beautiful Bill Act, measure "H.R. 1", 119th Congress).
-- Fully additive and idempotent:
--   • CREATE TABLE IF NOT EXISTS (+ indexes), so re-applying is safe and it never
--     touches an existing table.
--   • Every seed INSERT is guarded by a per-measure sentinel (NOT EXISTS), so the
--     data is written at most once and re-running is a no-op.
-- Rolls forward from the applied voting-record migrations; never edits one.
--
-- vr_distributional_impacts — one row = ONE cohort's sourced, directional exposure
--   to a measure (or, when provision_id is set, to one named provision of it). It is
--   the class/economic sibling of the Evidence Locker's _strength() and the
--   Follow-the-Money _financeSignal(): a transparent, reasons-listed, SOURCED read of
--   WHO a policy's costs and benefits fall on — never a verdict on the policy itself.
--
-- NEUTRALITY / VERIFIABILITY: every row carries a NOT NULL source_url from a NAMED
-- nonpartisan scorekeeper (here: the Congressional Budget Office and the
-- Urban-Brookings Tax Policy Center). Figures are quoted as those bodies published
-- them, with an as-of date and a methodology note, and both COST and BENEFIT rows are
-- seeded so no cohort's story is one-sided. Where scorekeepers differ, they are stored
-- as separate rows (different source_label) rather than reconciled. See
-- DISTRIBUTIONAL_IMPACT.md for the full standard.

CREATE TABLE IF NOT EXISTS "vr_distributional_impacts" (
  "id" serial PRIMARY KEY,
  "measure_id" integer NOT NULL REFERENCES "vr_measures"("id") ON DELETE CASCADE,
  "provision_id" integer REFERENCES "vr_measure_provisions"("id") ON DELETE SET NULL,
  "cohort" text NOT NULL,
  "direction" text DEFAULT 'mixed' NOT NULL,
  "magnitude_value" numeric,
  "magnitude_unit" text,
  "magnitude_label" text,
  "metric" text DEFAULT '' NOT NULL,
  "source_label" text NOT NULL,
  "source_url" text NOT NULL,
  "methodology" text DEFAULT '',
  "evidence_strength" text DEFAULT 'moderate' NOT NULL,
  "as_of" timestamp with time zone,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vr_distributional_impacts_measure_idx" ON "vr_distributional_impacts" ("measure_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vr_distributional_impacts_cohort_idx" ON "vr_distributional_impacts" ("cohort");
--> statement-breakpoint

DO $$
DECLARE
  m_hr1 integer;
  p_tax integer;   -- "Permanent 2017 tax cuts"
  p_medi integer;  -- "Medicaid spending cut"
  p_snap integer;  -- "SNAP food-aid changes"
  p_border integer;-- "Border & immigration enforcement"
  p_energy integer;-- "Clean-energy credit rollback"
  -- Canonical, citable scorekeeper sources.
  CBO_DIST text := 'https://www.cbo.gov/publication/61367';   -- Distributional Effects of P.L. 119-21 (enacted, Aug 2025)
  CBO_HOUSE text := 'https://www.cbo.gov/publication/61387';  -- Distributional Effects of H.R. 1 (House-passed, Jun 2025)
  CBO_COST text := 'https://www.cbo.gov/publication/61461';   -- Estimated Budgetary Effects of H.R. 1 (incl. JCT revenue estimates)
  TPC_DIST text := 'https://taxpolicycenter.org/tax-model-analysis/distributional-effects-tax-provisions-2025-budget-reconciliation-act';
BEGIN
  SELECT id INTO m_hr1 FROM vr_measures WHERE number = 'H.R. 1' AND congress = 119 LIMIT 1;
  IF m_hr1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM vr_distributional_impacts WHERE measure_id = m_hr1) THEN
    -- Resolve provision ids by label (seeded by an earlier applied migration). Any
    -- that are missing simply stay NULL — the impact then reads at the whole-measure level.
    SELECT id INTO p_tax    FROM vr_measure_provisions WHERE measure_id = m_hr1 AND label = 'Permanent 2017 tax cuts' LIMIT 1;
    SELECT id INTO p_medi   FROM vr_measure_provisions WHERE measure_id = m_hr1 AND label = 'Medicaid spending cut' LIMIT 1;
    SELECT id INTO p_snap   FROM vr_measure_provisions WHERE measure_id = m_hr1 AND label = 'SNAP food-aid changes' LIMIT 1;
    SELECT id INTO p_border FROM vr_measure_provisions WHERE measure_id = m_hr1 AND label = 'Border & immigration enforcement' LIMIT 1;
    SELECT id INTO p_energy FROM vr_measure_provisions WHERE measure_id = m_hr1 AND label = 'Clean-energy credit rollback' LIMIT 1;

    INSERT INTO vr_distributional_impacts
      (measure_id, provision_id, cohort, direction, magnitude_value, magnitude_unit, magnitude_label, metric, source_label, source_url, methodology, evidence_strength, as_of, sort_order)
    VALUES
      -- ── Working & middle-income households ──────────────────────────────────
      (m_hr1, NULL, 'working_middle', 'cost', -3.1, 'pct_income',
       'about −$1,200 per year',
       'Change in resources available to the lowest income decile, 2026–2034',
       'Congressional Budget Office', CBO_DIST,
       'CBO analysis of the enacted law (P.L. 119-21): the lowest tenth of households lose ~$1,200/yr on average (3.1% of income), mainly from reductions to Medicaid and SNAP.',
       'strong', '2025-08-11T00:00:00Z', 10),

      (m_hr1, p_tax, 'working_middle', 'benefit', NULL, NULL,
       'about $150 average tax cut (2026)',
       'Average federal tax change for the lowest income quintile, 2026',
       'Tax Policy Center', TPC_DIST,
       'Urban-Brookings TPC distributional table for the Act''s tax provisions: the lowest-income quintile receives an average tax cut of about $150 in 2026 — a small share of the total.',
       'moderate', '2025-07-01T00:00:00Z', 20),

      (m_hr1, p_medi, 'working_middle', 'cost', NULL, NULL,
       'about 10 million more uninsured by 2034',
       'Change in the number of people without health insurance, 2034',
       'Congressional Budget Office', CBO_COST,
       'CBO estimates the enacted law increases the number of people without health insurance by ~10 million in 2034, driven mainly by Medicaid eligibility and financing changes.',
       'strong', '2025-07-21T00:00:00Z', 30),

      (m_hr1, p_energy, 'working_middle', 'cost', NULL, NULL,
       'loss of clean-energy consumer credits',
       'Repeal of consumer clean-energy and electric-vehicle tax credits',
       'Congressional Budget Office', CBO_COST,
       'The Act phases out and repeals the 2022 clean-energy and EV consumer credits (e.g., the up-to-$7,500 EV credit); CBO/JCT score the repeal as a revenue increase, i.e., a removed household benefit.',
       'limited', '2025-07-21T00:00:00Z', 40),

      -- ── High-income & high-wealth individuals ───────────────────────────────
      (m_hr1, p_tax, 'high_income_wealth', 'benefit', 2.3, 'pct_income',
       'about +$12,000 per year',
       'Change in resources available to the highest income decile',
       'Congressional Budget Office', CBO_HOUSE,
       'CBO analysis of the House-passed version: the highest tenth of households gain ~$12,000/yr on average (2.3% of income), mainly from reductions in the taxes they owe.',
       'strong', '2025-06-12T00:00:00Z', 50),

      (m_hr1, p_tax, 'high_income_wealth', 'benefit', NULL, NULL,
       'about 60% of the tax cut to the top 20%',
       'Share of the total federal tax cut, 2026',
       'Tax Policy Center', TPC_DIST,
       'Urban-Brookings TPC: roughly 60% of the tax cut goes to the top income quintile (about $217k+), and the top 5% (about $460k+) receive over a third.',
       'moderate', '2025-07-01T00:00:00Z', 60),

      -- ── Large corporations ──────────────────────────────────────────────────
      (m_hr1, p_tax, 'large_corporations', 'benefit', NULL, NULL,
       'permanent business expensing (bonus depreciation & R&D)',
       'Permanent cost-recovery for business investment',
       'CBO / Joint Committee on Taxation', CBO_COST,
       'The Act permanently restores 100% bonus depreciation and immediate R&D expensing; CBO/JCT score these business provisions as a multi-hundred-billion-dollar revenue reduction over ten years. Per-firm distribution is not published, so this is graded Limited.',
       'limited', '2025-07-21T00:00:00Z', 70),

      -- ── Government & insiders (contractors) ─────────────────────────────────
      (m_hr1, p_border, 'government_insiders', 'benefit', NULL, NULL,
       'tens of billions in new enforcement & detention funding',
       'New appropriations for border security and immigration detention/removal',
       'Congressional Budget Office', CBO_COST,
       'The Act directs large new appropriations to border security and immigration detention and removal operations, much of which is executed through federal contractors. Recipient-level distribution is not scored, so this is graded Limited.',
       'limited', '2025-07-21T00:00:00Z', 80);
  END IF;
END $$;
