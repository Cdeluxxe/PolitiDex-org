-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — wave 21: Legislation library deep-dive (top bills broken down)
-- ─────────────────────────────────────────────────────────────────────────────
-- WHY THIS WAVE: A focused pass over the highest-impact bills already in the record
-- so each is broken down into its component pieces and every piece is tagged with an
-- issue key. This directly powers the bill detail panel's cross-navigation: the
-- "What's inside this vote" issue rows and the "Key provisions" list each render a
-- clickable issue that opens the matching Issue Spotlight, roll-call rows link to
-- profiles and compute Say-vs-Do, and the related section links Spotlights + the
-- Legislation library. Richer issue tags and provisions = more of those links.
--
-- SCOPE (the user's priorities: omnibus, reconciliation, spending, immigration,
-- energy, tariffs). H.R. 1 already had a deep 9-provision breakdown; this wave:
--   • H.R. 1  — adds two more well-documented provisions (SALT cap, debt-limit raise)
--   • H.R. 4  — Rescissions Act: first provision breakdown + issue enrichment
--   • H.Con.Res. 14 — FY2025 budget resolution: reconciliation-instruction provisions
--   • H.R. 29 — Laken Riley Act: detention + state-standing provisions + issues
--   • H.R. 26 — energy bill: fracking-moratorium + state-primacy provisions + issues
--   • S.J.Res. 37 (tariffs) and H.R. 27 (fentanyl): issue-tag enrichment for linking
--
-- NEUTRALITY: each provision/issue records what a section does and which way a Yea
-- cuts (support_meaning), with a factual rationale and a citable source — no opinion.
-- Every issue_key is validated against db/issue-keys.json.
--
-- ADDITIVE + IDEMPOTENT: issue tags use ON CONFLICT (measure_id, issue_key) DO NOTHING
-- and are all is_primary=false (never a second primary); provisions are guarded by
-- NOT EXISTS (per-measure where none exist yet, per-label for H.R. 1 which already has
-- some). Rolls forward from the applied migrations; edits none. Safe to re-run.

DO $$
DECLARE
  m_hr1   integer;
  m_hr4   integer;
  m_hcr14 integer;
  m_hr29  integer;
  m_hr26  integer;
  m_sjr37 integer;
  m_hr27  integer;
  HR1  text := 'https://www.congress.gov/bill/119th-congress/house-bill/1';
  HR4  text := 'https://www.congress.gov/bill/119th-congress/house-bill/4';
  HR4F text := 'https://usafacts.org/articles/whats-in-the-rescissions-act-of-2025/';
  HR4N text := 'https://www.npr.org/2025/07/18/nx-s1-5469912/npr-congress-rescission-funding-trump';
  HCR14 text := 'https://www.congress.gov/bill/119th-congress/house-concurrent-resolution/14';
  HR29 text := 'https://www.congress.gov/bill/119th-congress/house-bill/29';
  HR26 text := 'https://www.congress.gov/bill/119th-congress/house-bill/26';
BEGIN
  -- ═══════════════════════════════════════════════════════════════════════════
  -- H.R. 1 — One Big Beautiful Bill Act (flagship omnibus): two more provisions.
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT id INTO m_hr1 FROM vr_measures WHERE number = 'H.R. 1' AND congress = 119 LIMIT 1;
  IF m_hr1 IS NOT NULL THEN
    INSERT INTO vr_measure_provisions (measure_id, label, description, issue_key, support_meaning, source_url, sort_order)
      SELECT m_hr1, 'SALT deduction cap increase', 'Temporarily raises the cap on the federal deduction for state and local taxes (SALT), a change that most benefits higher-tax states.', 'tax_middle_class', 'yea_supports', HR1, 100
      WHERE NOT EXISTS (SELECT 1 FROM vr_measure_provisions WHERE measure_id = m_hr1 AND label = 'SALT deduction cap increase');
    INSERT INTO vr_measure_provisions (measure_id, label, description, issue_key, support_meaning, source_url, sort_order)
      SELECT m_hr1, 'Debt-limit increase', 'Raises the statutory debt limit to accommodate the reconciliation package, increasing federal borrowing authority.', 'national_debt', 'yea_opposes', HR1, 110
      WHERE NOT EXISTS (SELECT 1 FROM vr_measure_provisions WHERE measure_id = m_hr1 AND label = 'Debt-limit increase');
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- H.R. 4 — Rescissions Act of 2025 (spending): first provision breakdown + issues.
  -- ~$9B in unobligated funds clawed back; foreign aid (~$7.9B) + public broadcasting
  -- ($1.1B CPB/NPR/PBS); a Senate amendment restored ~$400M in PEPFAR global-HIV cuts.
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT id INTO m_hr4 FROM vr_measures WHERE number = 'H.R. 4' AND congress = 119 LIMIT 1;
  IF m_hr4 IS NOT NULL THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
      (m_hr4, 'america_first',  60, false, 'yea_supports', 'The bulk of the package (~$7.9B) rescinds unobligated foreign-aid and State Department funds, aligning with an America-first spending posture.'),
      (m_hr4, 'audit_spending', 55, false, 'yea_supports', 'Codifies cuts identified by the Department of Government Efficiency (DOGE) using the Impoundment Control Act''s rescission process.'),
      (m_hr4, 'gov_services',   45, false, 'yea_opposes',  'Cancels funding for public-media and international programs; a Yea reduces those services.'),
      (m_hr4, 'free_speech',    30, false, 'yea_opposes',  'Eliminates federal funding for the Corporation for Public Broadcasting (NPR/PBS affiliates); recorded neutrally as it touches public-media funding.')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    IF NOT EXISTS (SELECT 1 FROM vr_measure_provisions WHERE measure_id = m_hr4) THEN
      INSERT INTO vr_measure_provisions (measure_id, label, description, issue_key, support_meaning, source_url, sort_order) VALUES
        (m_hr4, 'Foreign aid & State Department rescission', 'Cancels roughly $7.9 billion in unobligated funds for the State Department, USAID, and international peacekeeping and health programs.', 'america_first', 'yea_supports', HR4F, 10),
        (m_hr4, 'Public-broadcasting rescission (CPB)', 'Eliminates about $1.1 billion in FY2026–FY2027 funding for the Corporation for Public Broadcasting, which channels federal money to NPR, PBS, and their member stations.', 'cut_spending', 'yea_supports', HR4N, 20),
        (m_hr4, 'PEPFAR carve-out (restored)', 'A Senate amendment removed about $400 million in proposed cuts to PEPFAR, the global HIV/AIDS program, before passage, so those funds were not rescinded.', 'healthcare', 'yea_opposes', HR4, 30),
        (m_hr4, 'Rescission mechanism (Impoundment Control Act / DOGE)', 'Uses the Impoundment Control Act''s expedited rescission process to codify spending cuts proposed by the administration''s government-efficiency effort.', 'audit_spending', 'yea_supports', HR4, 40);
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- H.Con.Res. 14 — FY2025 budget resolution (reconciliation): instruction provisions.
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT id INTO m_hcr14 FROM vr_measures WHERE number = 'H.Con.Res. 14' AND congress = 119 LIMIT 1;
  IF m_hcr14 IS NOT NULL THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
      (m_hcr14, 'border_security', 50, false, 'yea_supports', 'Reserves reconciliation room for border-security and immigration-enforcement funding.'),
      (m_hcr14, 'strong_defense',  45, false, 'yea_supports', 'Reserves reconciliation room for a defense-spending increase.')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    IF NOT EXISTS (SELECT 1 FROM vr_measure_provisions WHERE measure_id = m_hcr14) THEN
      INSERT INTO vr_measure_provisions (measure_id, label, description, issue_key, support_meaning, source_url, sort_order) VALUES
        (m_hcr14, 'Tax-cut reconciliation room', 'Reserves room in the reconciliation instructions to extend and expand the 2017 tax cuts.', 'lower_taxes', 'yea_supports', HCR14, 10),
        (m_hcr14, 'Spending-cut instructions', 'Directs House and Senate committees to find net spending reductions through reconciliation.', 'cut_spending', 'yea_supports', HCR14, 20),
        (m_hcr14, 'Debt-limit increase instruction', 'Provides for raising the statutory debt limit through the reconciliation process, increasing federal borrowing authority.', 'national_debt', 'yea_opposes', HCR14, 30),
        (m_hcr14, 'Border & defense funding room', 'Reserves reconciliation room for border-security and defense-spending increases.', 'border_security', 'yea_supports', HCR14, 40);
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- H.R. 29 — Laken Riley Act (immigration): detention + state-standing provisions.
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT id INTO m_hr29 FROM vr_measures WHERE number = 'H.R. 29' AND congress = 119 LIMIT 1;
  IF m_hr29 IS NOT NULL THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
      (m_hr29, 'border_security',     80, false, 'yea_supports', 'Expands mandatory federal detention of certain unlawfully present immigrants.'),
      (m_hr29, 'deportations',        70, false, 'yea_supports', 'Requires detention pending removal for covered offenses, feeding the removal pipeline.'),
      (m_hr29, 'tough_on_crime',      55, false, 'yea_supports', 'Triggered by charges for theft, burglary, shoplifting, or assaulting a law-enforcement officer.'),
      (m_hr29, 'gov_balance',         40, false, 'yea_supports', 'Grants state attorneys general standing to sue the federal government over certain immigration-enforcement decisions.')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    IF NOT EXISTS (SELECT 1 FROM vr_measure_provisions WHERE measure_id = m_hr29) THEN
      INSERT INTO vr_measure_provisions (measure_id, label, description, issue_key, support_meaning, source_url, sort_order) VALUES
        (m_hr29, 'Mandatory detention for covered offenses', 'Requires federal detention of unlawfully present immigrants who are arrested for or charged with theft, burglary, shoplifting, or assaulting a law-enforcement officer.', 'deportations', 'yea_supports', HR29, 10),
        (m_hr29, 'State standing to sue the federal government', 'Gives state attorneys general legal standing to sue the federal government over certain immigration-detention and enforcement decisions that harm the state.', 'gov_balance', 'yea_supports', HR29, 20);
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- H.R. 26 — Protecting American Energy Production Act (energy): two provisions.
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT id INTO m_hr26 FROM vr_measures WHERE number = 'H.R. 26' AND congress = 119 LIMIT 1;
  IF m_hr26 IS NOT NULL THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
      (m_hr26, 'gov_regulation', 55, false, 'yea_supports', 'Restricts the executive from imposing a federal ban on hydraulic fracturing.'),
      (m_hr26, 'lands_energy',   45, false, 'yea_supports', 'Concerns energy development on and under public and private lands.')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    IF NOT EXISTS (SELECT 1 FROM vr_measure_provisions WHERE measure_id = m_hr26) THEN
      INSERT INTO vr_measure_provisions (measure_id, label, description, issue_key, support_meaning, source_url, sort_order) VALUES
        (m_hr26, 'Bar on a federal fracking moratorium', 'Prohibits the President from declaring a moratorium on hydraulic fracturing without an act of Congress.', 'energy_production', 'yea_supports', HR26, 10),
        (m_hr26, 'State primacy over fracking', 'Affirms state authority to regulate hydraulic fracturing, limiting federal preemption.', 'gov_regulation', 'yea_supports', HR26, 20);
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- S.J.Res. 37 (tariffs) and H.R. 27 (fentanyl): issue-tag enrichment for linking.
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT id INTO m_sjr37 FROM vr_measures WHERE number = 'S.J.Res. 37' AND congress = 119 LIMIT 1;
  IF m_sjr37 IS NOT NULL THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
      (m_sjr37, 'cost_living',  55, false, 'yea_supports', 'Terminating the tariff emergency would remove import taxes that supporters say raise consumer prices.'),
      (m_sjr37, 'gov_balance',  45, false, 'yea_supports', 'A Congressional reassertion of authority over tariffs against an emergency declaration by the executive.')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
  END IF;

  SELECT id INTO m_hr27 FROM vr_measures WHERE number = 'H.R. 27' AND congress = 119 LIMIT 1;
  IF m_hr27 IS NOT NULL THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
      (m_hr27, 'health_mental', 45, false, 'yea_supports', 'Aimed at the fentanyl overdose crisis by permanently scheduling fentanyl-related substances; touches the public-health dimension of addiction.')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
  END IF;

END $$;
