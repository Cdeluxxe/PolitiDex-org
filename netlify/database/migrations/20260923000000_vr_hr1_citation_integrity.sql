-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — H.R. 1 citation integrity: every topic anchored to operative text
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT THIS IS FOR
-- The bill face now shows every topic H.R. 1 touches — all fourteen mappings, no fold,
-- no primary-first truncation. That is the right default, and it raises the standard the
-- rows underneath have to meet. A topic that is always visible is always citable, and
-- six of the fourteen had nothing operative behind them.
--
-- vr_measure_provisions is the named-sub-unit table the bill panel renders. It is
-- DISPLAY-ONLY: voting-record.mts reads it into `provisions` on the bill payload and
-- bill-detail.js prints label / issue tag / direction / description. No scoring path
-- reads it — grep vr_measure_provisions across netlify/lib and the functions and the
-- only consumers are the read query and this seed lineage. Everything below that touches
-- a provision therefore cannot move a score by construction.
--
-- WHAT THE AUDIT MEASURED, BEFORE
--   14 issue mappings on H.R. 1 (119, house) · 11 provision rows
--    8 of the 14 keys had a provision row carrying that key
--    6 had none:
--      lower_taxes        — the rationale claims the business-side rate and expensing
--                           provisions; no row named them
--      cut_spending       — the rationale claims the SNAP work-requirement age change
--                           BY NAME, and the SNAP row was the one row with a NULL key
--      lands_energy       — claims federal leasing; no row named it
--      family_support     — claims the child tax credit increase; no row named it
--      energy_production  — claims leasing; no row named it
--      deportations       — claims the enforcement appropriation; no row named it
--    1 provision row (SNAP food-aid changes) carried no issue key at all
--    national_debt was cited to a CBO projection and nothing else, while the act
--      contains the operative debt-limit text itself
--
-- THREE PROVISIONS WERE CLAIMED TWICE, AND THAT IS NOT A REASON TO SCORE THEM TWICE
-- The child tax credit is read by both family_support and lower_taxes. Federal leasing is
-- read by both lands_energy and energy_production. The enforcement appropriation is read
-- by both border_security and deportations. The tempting fix — one provision row per
-- claiming key — would print the same operative text three times and make one paragraph
-- of statute look like three independent findings.
--
-- So: ONE OWNER PER PROVISION, and the second reading is stated in the description as
--   "Also read under: <topic>."
-- Nothing is renamed, no existing owner moves, and no mapping is added. The co-read is a
-- display note on the row, not a second row and not a second score.
--
-- THE OPERATIVE ANCHORS, VERIFIED AGAINST THE ENACTED TEXT
-- Public Law 119-21, GPO enrolled text:
--   Sec. 10102  Modifications to SNAP work requirements for able-bodied adults
--   Sec. 50101  Onshore oil and gas leasing
--   Sec. 70104  Extension and enhancement of increased child tax credit
--   Sec. 72001  Modification of limitation on the public debt  (subtitle: Increase in Debt Limit)
-- Each section heading below is quoted from that document, not paraphrased from a summary.
--
-- WHAT MOVES ON THE SCORING TABLE: TWO TEXT COLUMNS, ONE ROW
-- vr_measure_issues is touched exactly once, on national_debt, and only rationale and
-- source_url. weight, is_primary and support_meaning are not named in the statement, so
-- Direction Match, the primary lane, the issue sort and every score are arithmetically
-- untouched. This is a citation change and nothing else — no promote, no reweight.
--
-- NO SEED MIRROR IS REQUIRED, AND THAT IS CHECKED
-- db/vr-issue-seed.json carries five H.R. 1 keys: lower_taxes, cut_spending, healthcare,
-- border_security, lands_energy. national_debt is not among them, so applyCuratedIssueSeed()
-- — which is upsert-only and never touches a (measure, issue) pair it does not name —
-- cannot revert the new rationale on a re-ingest. scripts/test-hr1-citation-integrity.mjs
-- pins that rather than assuming it: if a later pass adds national_debt to the seed, the
-- test fails unless the seed carries this rationale too.
--
-- LABELS ARE LOAD-BEARING AND ARE NOT RENAMED
-- 20260721210000_create_vr_distributional_impacts.sql resolves provision_id BY LABEL for
-- the H.R. 1 impact rows. Renaming a provision would orphan a distributional impact
-- silently. Every UPDATE below matches on the existing label and leaves it alone; the two
-- INSERTs use new labels and slot into unused sort_order gaps (15, 55) so no existing row
-- is renumbered.
--
-- THE RESIDUAL, STATED RATHER THAN PAPERED OVER
-- The lands_energy and energy_production rationales say "onshore and offshore oil, gas,
-- and coal leasing". Only the onshore oil and gas provision (Sec. 50101) is verifiable
-- from the curated record committed here, so the new row is anchored precisely to that and
-- claims no more. The offshore and coal readings remain asserted by the rationale and
-- uncited by a provision; that gap is recorded in db/vr-hr1-citation-audit.json as an open
-- residual instead of being silently widened into a row that overstates what was checked.
--
-- Idempotent. Every INSERT is NOT EXISTS-guarded on (measure_id, label); every UPDATE is
-- an assignment to a fixed value. Re-running sets the same rows to the same values.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  m_hr1 bigint;
  PLAW text := 'https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm';
BEGIN
  SELECT id INTO m_hr1 FROM vr_measures
   WHERE number = 'H.R. 1' AND congress = 119 AND chamber = 'house' LIMIT 1;
  IF m_hr1 IS NULL THEN
    SELECT id INTO m_hr1 FROM vr_measures WHERE number = 'H.R. 1' AND congress = 119 LIMIT 1;
  END IF;
  IF m_hr1 IS NULL THEN
    RAISE NOTICE 'H.R. 1 (119) not present; citation-integrity pass skipped.';
    RETURN;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 1 · SNAP food-aid changes — the one provision with no issue key at all
  -- ═══════════════════════════════════════════════════════════════════════════
  -- The cut_spending rationale names this provision explicitly ("raising the SNAP
  -- able-bodied-adult work-requirement age from 55 to 65"), so the mapping already
  -- depends on it and the row has to carry the key or the rationale is claiming an
  -- uncited fact. There is no food-aid or nutrition key in db/issue-keys.json, and this
  -- pass does not invent one — cut_spending is the key the rationale actually rests on.
  --
  -- support_meaning flips yea_opposes -> yea_supports with the key. Under a NULL key it
  -- meant "a yea cuts against food aid", which was a direction with no topic. Read
  -- against cut_spending it has to say what a yea does to THAT topic: a yea advances the
  -- spending cut. This is the provision table's display direction, not the mapping's —
  -- vr_measure_issues.support_meaning for cut_spending stays exactly as it was.
  UPDATE vr_measure_provisions
     SET issue_key = 'cut_spending',
         support_meaning = 'yea_supports',
         description = 'Sec. 10102, Modifications to SNAP work requirements for able-bodied adults, raises the able-bodied-adult work-requirement age from 55 to 65 and extends the requirement to adults with older children; the act also narrows eligibility and shifts more of the program cost onto the states.',
         source_url = PLAW
   WHERE measure_id = m_hr1 AND label = 'SNAP food-aid changes';

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 2 · Child tax credit increase — new row, owner family_support
  -- ═══════════════════════════════════════════════════════════════════════════
  -- Claimed by family_support (which is what the credit is for) and by lower_taxes
  -- (which reads it as part of the individual-side tax package). family_support owns it
  -- because the credit is that mapping's whole basis, while lower_taxes has the rate and
  -- expensing provisions underneath it as well. lower_taxes gets the co-read line here
  -- and on the 2017 rate row below, not a duplicate provision.
  INSERT INTO vr_measure_provisions (measure_id, label, description, issue_key, support_meaning, source_url, sort_order)
    SELECT m_hr1,
           'Child tax credit increase',
           'Sec. 70104, Extension and enhancement of increased child tax credit, raises the maximum credit to 2,200 dollars per qualifying child, indexes it for inflation, and makes the increased phase-out thresholds permanent. Also read under: Cut Income & Business Taxes.',
           'family_support', 'yea_supports', PLAW, 15
     WHERE NOT EXISTS (
       SELECT 1 FROM vr_measure_provisions
        WHERE measure_id = m_hr1 AND label = 'Child tax credit increase');

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 3 · Onshore oil and gas leasing — new row, owner lands_energy
  -- ═══════════════════════════════════════════════════════════════════════════
  -- Claimed by lands_energy (federal land management is the subject) and by
  -- energy_production (output is the effect). lands_energy owns it; energy_production
  -- gets the co-read. Anchored to Sec. 50101 only — see THE RESIDUAL above.
  INSERT INTO vr_measure_provisions (measure_id, label, description, issue_key, support_meaning, source_url, sort_order)
    SELECT m_hr1,
           'Onshore oil and gas leasing',
           'Sec. 50101, Onshore oil and gas leasing, directs Interior to resume and hold regular onshore oil and gas lease sales on federal land and lowers the royalty rate charged on production. Also read under: Expand Domestic Energy Production.',
           'lands_energy', 'yea_supports', PLAW, 55
     WHERE NOT EXISTS (
       SELECT 1 FROM vr_measure_provisions
        WHERE measure_id = m_hr1 AND label = 'Onshore oil and gas leasing');

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 4 · Co-read notes on the three rows that two keys already claim
  -- ═══════════════════════════════════════════════════════════════════════════
  -- Owner unchanged in all three. The appended sentence is the whole mechanism by which
  -- the second key is cited without a second row and without a second score.

  -- tax_middle_class keeps this; lower_taxes reads the same rate text.
  UPDATE vr_measure_provisions
     SET description = 'Makes the 2017 individual income-tax rates permanent and adds temporary deductions for tips and overtime pay. Also read under: Cut Income & Business Taxes.',
         source_url = PLAW
   WHERE measure_id = m_hr1 AND label = 'Permanent 2017 tax cuts';

  -- healthcare keeps this; cut_spending reads the same reduction as spending restraint.
  -- Re-sourced from the CBO score to the enacted text: a provision row describing what
  -- the act DOES should cite the act. The CBO projection stays cited on the Deficit
  -- impact row, which is the row that is actually about a projection.
  UPDATE vr_measure_provisions
     SET description = 'Subtitle B, Chapter 1 reduces federal Medicaid spending and adds new eligibility and work requirements. Also read under: Cut Federal Spending & Reduce Debt.',
         source_url = PLAW
   WHERE measure_id = m_hr1 AND label = 'Medicaid spending cut';

  -- border_security keeps this; deportations reads the removal side of the same money.
  UPDATE vr_measure_provisions
     SET description = 'Adds major funding for border security and immigration detention and removal. Also read under: Mass Deportations & Border Security.'
   WHERE measure_id = m_hr1 AND label = 'Border & immigration enforcement';

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 5 · Debt-limit provision — name the section it is
  -- ═══════════════════════════════════════════════════════════════════════════
  UPDATE vr_measure_provisions
     SET description = 'Sec. 72001, Modification of limitation on the public debt, raises the statutory debt limit by 5 trillion dollars to accommodate the reconciliation package, increasing federal borrowing authority.',
         source_url = PLAW
   WHERE measure_id = m_hr1 AND label = 'Debt-limit increase';

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 6 · national_debt mapping — re-cite to the operative anchor
  -- ═══════════════════════════════════════════════════════════════════════════
  -- CITATION ONLY. weight, is_primary and support_meaning are not assigned. The mapping
  -- was resting on a CBO deficit projection, which is a forecast about the act rather
  -- than text the act enacts; the act contains the debt-limit increase itself, and that
  -- is what a yea actually does to the national debt. The projection is kept in the
  -- rationale as corroboration and stays cited on the Deficit impact provision.
  UPDATE vr_measure_issues
     SET rationale = 'Sec. 72001, Modification of limitation on the public debt, raises the statutory debt ceiling by 5 trillion dollars in the subtitle captioned Increase in Debt Limit — the act enacts the borrowing authority itself, which is the operative text this mapping rests on and which the Debt-limit increase provision on this bill cites. The Congressional Budget Office separately projects the act adds trillions to deficits over ten years; that projection corroborates the direction and is cited on the Deficit impact provision, but it is a forecast about the act rather than something the act says, so it is not what carries the mapping. A yea enacts the higher ceiling.',
         source_url = PLAW
   WHERE measure_id = m_hr1 AND issue_key = 'national_debt';
END $$;
