-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — wave 22: Legislation library deep-dive, round 2 (more top bills)
-- ─────────────────────────────────────────────────────────────────────────────
-- WHY THIS WAVE: Continues the focused pass over the highest-impact bills, spanning
-- the categories the request named — technology, foreign policy, energy, education,
-- spending, health. Each added issue tag and provision powers the bill detail panel's
-- cross-navigation: "What's inside this vote" rows and "Key provisions" each link to
-- the matching Issue Spotlight, roll-call rows link to profiles and compute Say-vs-Do.
--
-- SCOPE:
--   • S. 1582 — GENIUS Act (technology / stablecoins): first full provision breakdown
--     (reserves, licensing, consumer protections, AML/sanctions, federal–state tiers)
--     + valid-key issue enrichment.
--   • S.J.Res. 59 — Iran War Powers (foreign policy): issue enrichment.
--   • H.J.Res. 88 & 89 — California EV / clean-trucks waiver repeals (energy): issues.
--   • H.R. 28 — Protection of Women and Girls in Sports (education): issue enrichment.
--   • S. 129 — No Tax on Tips (spending / workers): issue enrichment.
--   • H.R. 21 — Born-Alive (health): issue enrichment.
--
-- NEUTRALITY: each item records what a section does and which way a Yea cuts
-- (support_meaning), with a factual rationale and a citable source. Every issue_key is
-- validated against db/issue-keys.json (no invalid keys introduced).
--
-- ADDITIVE + IDEMPOTENT: issue tags use ON CONFLICT (measure_id, issue_key) DO NOTHING
-- and are all is_primary=false (never a second primary); the GENIUS provisions are
-- guarded by NOT EXISTS. Rolls forward from the applied migrations; edits none.

DO $$
DECLARE
  m_genius integer;
  m_sjr59  integer;
  m_hjr88  integer;
  m_hjr89  integer;
  m_hr28   integer;
  m_s129   integer;
  m_hr21   integer;
  GEN  text := 'https://www.congress.gov/bill/119th-congress/senate-bill/1582';
  GENA text := 'https://www.cov.com/news-and-insights/insights/2025/07/the-genius-act-becomes-law-key-provisions-from-the-federal-stablecoin-regulatory-framework';
BEGIN
  -- ═══════════════════════════════════════════════════════════════════════════
  -- S. 1582 — GENIUS Act (technology / stablecoins): full component breakdown.
  -- The first comprehensive U.S. federal framework for payment stablecoins.
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT id INTO m_genius FROM vr_measures WHERE number = 'S. 1582' AND congress = 119 LIMIT 1;
  IF m_genius IS NOT NULL THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
      (m_genius, 'gov_regulation', 55, false, 'yea_supports', 'Creates the first comprehensive federal regulatory framework for payment stablecoins.'),
      (m_genius, 'tech_balance',   50, false, 'yea_supports', 'Balances digital-asset innovation against reserve, disclosure, and anti-money-laundering safeguards.')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    IF NOT EXISTS (SELECT 1 FROM vr_measure_provisions WHERE measure_id = m_genius) THEN
      INSERT INTO vr_measure_provisions (measure_id, label, description, issue_key, support_meaning, source_url, sort_order) VALUES
        (m_genius, '1:1 reserve backing', 'Requires issuers to hold at least one dollar of permitted reserves — cash, insured deposits, short-term Treasuries — for every dollar of stablecoin issued, and bars reusing those reserves.', 'econ_corp_account', 'yea_supports', GENA, 10),
        (m_genius, 'Issuer licensing regime', 'Limits stablecoin issuance to subsidiaries of insured banks, nonbanks supervised by the Comptroller of the Currency, or qualifying state-chartered issuers, and generally bars non-financial companies from issuing.', 'gov_regulation', 'yea_supports', GENA, 20),
        (m_genius, 'Consumer protections & disclosures', 'Requires clear redemption procedures, periodic public reserve reports, audited statements for issuers over $50 billion, bars paying interest to holders, and gives holders priority in bankruptcy.', 'econ_corp_account', 'yea_supports', GENA, 30),
        (m_genius, 'Anti-money-laundering & sanctions compliance', 'Subjects issuers to the Bank Secrecy Act and to federal anti-money-laundering, customer-identification, and economic-sanctions laws.', 'gov_regulation', 'yea_supports', GEN, 40),
        (m_genius, 'Dual federal–state oversight', 'Lets issuers with $10 billion or less in outstanding stablecoins opt into a state regime deemed substantially similar to the federal one; larger issuers fall under federal supervision.', 'gov_balance', 'yea_supports', GENA, 50);
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- S.J.Res. 59 — Iran War Powers Resolution (foreign policy): issue enrichment.
  -- Directs removal of U.S. forces from hostilities against Iran not authorized by
  -- Congress — a war-powers assertion.
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT id INTO m_sjr59 FROM vr_measures WHERE number = 'S.J.Res. 59' AND congress = 119 LIMIT 1;
  IF m_sjr59 IS NOT NULL THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
      (m_sjr59, 'democracy_balance', 60, false, 'yea_supports', 'Reasserts Congress''s constitutional war-powers role as a check on unilateral executive military action.'),
      (m_sjr59, 'foreign_balance',   45, false, 'yea_supports', 'Concerns the scope and restraint of U.S. military involvement abroad.')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- H.J.Res. 88 & 89 — California vehicle-emissions waiver repeals (energy): issues.
  -- CRA disapprovals removing EPA waivers that let California set stricter vehicle
  -- standards (the EV mandate and the clean-trucks rule).
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT id INTO m_hjr88 FROM vr_measures WHERE number = 'H.J.Res. 88' AND congress = 119 LIMIT 1;
  IF m_hjr88 IS NOT NULL THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
      (m_hjr88, 'cost_living', 45, false, 'yea_supports', 'Supporters argued rolling back the EV mandate keeps lower-cost gasoline vehicles available to consumers.'),
      (m_hjr88, 'gov_balance', 40, false, 'yea_opposes',  'Repealing the federal waiver curtails California''s ability to set its own stricter vehicle standards; a Yea narrows that state authority.')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
  END IF;

  SELECT id INTO m_hjr89 FROM vr_measures WHERE number = 'H.J.Res. 89' AND congress = 119 LIMIT 1;
  IF m_hjr89 IS NOT NULL THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
      (m_hjr89, 'cost_living', 45, false, 'yea_supports', 'Supporters argued rolling back the clean-trucks rule lowers costs in trucking and freight.'),
      (m_hjr89, 'gov_balance', 40, false, 'yea_opposes',  'Repealing the federal waiver curtails California''s ability to set its own stricter truck standards; a Yea narrows that state authority.')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- H.R. 28 — Protection of Women and Girls in Sports Act (education): issues.
  -- Defines sex for Title IX athletics.
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT id INTO m_hr28 FROM vr_measures WHERE number = 'H.R. 28' AND congress = 119 LIMIT 1;
  IF m_hr28 IS NOT NULL THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
      (m_hr28, 'public_schools', 55, false, 'yea_supports', 'Applies to federally funded school and college athletic programs under Title IX.'),
      (m_hr28, 'edu_balance',    40, false, 'yea_supports', 'Sets a federal rule for how sex is defined in school sports eligibility.')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- S. 129 — No Tax on Tips Act (spending / workers): issue enrichment.
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT id INTO m_s129 FROM vr_measures WHERE number = 'S. 129' AND congress = 119 LIMIT 1;
  IF m_s129 IS NOT NULL THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
      (m_s129, 'econ_workers', 60, false, 'yea_supports', 'Targets tipped service workers by exempting qualified tip income from federal income tax.')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- H.R. 21 — Born-Alive Abortion Survivors Protection Act (health): issue enrichment.
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT id INTO m_hr21 FROM vr_measures WHERE number = 'H.R. 21' AND congress = 119 LIMIT 1;
  IF m_hr21 IS NOT NULL THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
      (m_hr21, 'healthcare', 40, false, 'yea_supports', 'Sets a federal requirement for medical care of an infant born alive after an attempted abortion.')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
  END IF;

END $$;
