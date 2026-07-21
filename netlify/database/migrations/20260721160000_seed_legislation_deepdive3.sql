-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — wave 23: Legislation library deep-dive #3 (tech, health, elections)
-- ─────────────────────────────────────────────────────────────────────────────
-- WHY THIS WAVE: Continues the focused pass over the highest-impact bills, breaking
-- four more into their component pieces and tagging each piece with an issue key.
-- Those tags/provisions are what the bill detail panel turns into navigation: the
-- "What's inside this vote" issue rows and "Key provisions" list each open the
-- matching Issue Spotlight, roll-call rows link to profiles and compute Say-vs-Do,
-- and the related section links Spotlights + the Legislation library.
--
-- Bills expanded this wave (categories the request named: technology, health care,
-- and elections), each of which had issue tags + a roll call but no provision-level
-- breakdown yet:
--   • S. 146     — TAKE IT DOWN Act (technology / privacy / AI deepfakes)
--   • H.R. 6703  — Lower Health Care Premiums for All Americans Act (health care)
--   • H.R. 2483  — SUPPORT for Patients and Communities Reauthorization (opioids)
--   • H.R. 22    — SAVE Act (elections / voter registration)
--
-- NEUTRALITY: each provision/issue records what a section does and which way a Yea
-- cuts (support_meaning), with a factual rationale and a citable source — including,
-- where relevant, the concern critics raised (recorded as a neutral tag, not an
-- endorsement). Every issue_key is validated against db/issue-keys.json.
--
-- ADDITIVE + IDEMPOTENT: issue tags use ON CONFLICT (measure_id, issue_key) DO NOTHING
-- and are all is_primary=false (never a second primary); provisions are guarded by
-- NOT EXISTS per measure (none of these four has provisions yet). Rolls forward from
-- the applied migrations; edits none. Safe to re-run.

DO $$
DECLARE
  m_s146   integer;
  m_hr6703 integer;
  m_hr2483 integer;
  m_hr22   integer;
  S146  text := 'https://www.congress.gov/bill/119th-congress/senate-bill/146';
  S146F text := 'https://www.ftc.gov/business-guidance/blog/2026/05/take-it-down-act-enforcement-starts-now-what-know-about-ftc-tida';
  HR6703 text := 'https://www.congress.gov/bill/119th-congress/house-bill/6703';
  HR6703C text := 'https://www.cbo.gov/publication/61959';
  HR2483 text := 'https://www.congress.gov/bill/119th-congress/house-bill/2483';
  HR2483N text := 'https://www.naco.org/news/congress-passes-support-act-reauthorization';
  HR22 text := 'https://www.congress.gov/bill/119th-congress/house-bill/22';
BEGIN
  -- ═══════════════════════════════════════════════════════════════════════════
  -- S. 146 — TAKE IT DOWN Act (technology / privacy). Criminalizes nonconsensual
  -- intimate images (including AI deepfakes) and requires covered platforms to remove
  -- them within 48 hours of a valid request; the FTC enforces the removal duty.
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT id INTO m_s146 FROM vr_measures WHERE number = 'S. 146' AND congress = 119 LIMIT 1;
  IF m_s146 IS NOT NULL THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
      (m_s146, 'gov_regulation', 45, false, 'yea_supports', 'Directs the Federal Trade Commission to enforce the platform takedown duty as an unfair or deceptive practice.'),
      (m_s146, 'free_speech',    30, false, 'yea_opposes',  'Critics (including CCRI and Cato) warn the 48-hour takedown duty and liability shield could lead platforms to over-remove lawful content; recorded neutrally.')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    IF NOT EXISTS (SELECT 1 FROM vr_measure_provisions WHERE measure_id = m_s146) THEN
      INSERT INTO vr_measure_provisions (measure_id, label, description, issue_key, support_meaning, source_url, sort_order) VALUES
        (m_s146, 'Criminal ban on nonconsensual intimate images', 'Creates a federal crime for knowingly publishing nonconsensual intimate visual depictions of adults or minors, explicitly including AI-generated "digital forgeries" (deepfakes).', 'privacy_rights', 'yea_supports', S146, 10),
        (m_s146, 'Platform 48-hour notice-and-removal duty', 'Requires covered online platforms to provide a takedown process and remove a reported image — and known identical copies — within 48 hours of a valid request.', 'tech_balance', 'yea_supports', S146, 20),
        (m_s146, 'FTC enforcement', 'Empowers the Federal Trade Commission to enforce the notice-and-removal requirement, treating violations as unfair or deceptive practices.', 'gov_regulation', 'yea_supports', S146F, 30),
        (m_s146, 'Free-speech / over-removal concern', 'The removal duty pairs with a liability shield for good-faith takedowns; critics warn this could incentivize removing lawful content. Recorded neutrally as the concern raised in debate.', 'free_speech', 'yea_opposes', S146, 40);
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- H.R. 6703 — Lower Health Care Premiums for All Americans Act (health care).
  -- A market-based alternative to extending the enhanced ACA premium subsidies:
  -- funds cost-sharing reductions (with abortion restrictions), expands association
  -- health plans and individual-coverage arrangements, and adds PBM transparency.
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT id INTO m_hr6703 FROM vr_measures WHERE number = 'H.R. 6703' AND congress = 119 LIMIT 1;
  IF m_hr6703 IS NOT NULL THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
      (m_hr6703, 'healthcare',        70, false, 'yea_supports', 'A broad restructuring of individual and small-group health-coverage rules.'),
      (m_hr6703, 'healthcare_market', 60, false, 'yea_supports', 'Expands market-based options — association health plans and individual-coverage arrangements — as the mechanism to lower premiums.'),
      (m_hr6703, 'health_drug_prices',45, false, 'yea_supports', 'Adds pharmacy-benefit-manager transparency standards on drug prices and rebates.'),
      (m_hr6703, 'pro_life',          35, false, 'yea_supports', 'The cost-sharing-reduction funding it appropriates carries abortion-funding restrictions; recorded neutrally.')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    IF NOT EXISTS (SELECT 1 FROM vr_measure_provisions WHERE measure_id = m_hr6703) THEN
      INSERT INTO vr_measure_provisions (measure_id, label, description, issue_key, support_meaning, source_url, sort_order) VALUES
        (m_hr6703, 'Cost-sharing reduction (CSR) funding', 'Appropriates funding for ACA cost-sharing-reduction payments (unfunded since 2017), with new abortion-funding restrictions attached.', 'healthcare_costs', 'yea_supports', HR6703, 10),
        (m_hr6703, 'Association Health Plans expansion', 'Amends ERISA to broaden Association Health Plans, letting more small businesses band together to buy a single group plan, with added pricing flexibility.', 'healthcare_market', 'yea_supports', HR6703, 20),
        (m_hr6703, 'CHOICE arrangements', 'Codifies and renames individual-coverage HRAs as CHOICE arrangements and creates a small-employer tax credit for offering them.', 'healthcare_market', 'yea_supports', HR6703, 30),
        (m_hr6703, 'Pharmacy-benefit-manager transparency', 'Requires PBM contracts to disclose drug prices, manufacturer rebates, and other operations to plan sponsors.', 'health_drug_prices', 'yea_supports', HR6703C, 40);
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- H.R. 2483 — SUPPORT for Patients and Communities Reauthorization Act (opioids).
  -- Bipartisan reauthorization of the 2018 SUPPORT Act's substance-use programs
  -- across prevention, treatment, and recovery through FY2030.
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT id INTO m_hr2483 FROM vr_measures WHERE number = 'H.R. 2483' AND congress = 119 LIMIT 1;
  IF m_hr2483 IS NOT NULL THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
      (m_hr2483, 'healthcare',     70, false, 'yea_supports', 'Improves access to addiction-treatment medications and expands treatment through Medicare and Medicaid.'),
      (m_hr2483, 'family_support', 45, false, 'yea_supports', 'Funds residential treatment and recovery services for pregnant and postpartum women with substance-use disorders.')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    IF NOT EXISTS (SELECT 1 FROM vr_measure_provisions WHERE measure_id = m_hr2483) THEN
      INSERT INTO vr_measure_provisions (measure_id, label, description, issue_key, support_meaning, source_url, sort_order) VALUES
        (m_hr2483, 'Prevention programs', 'Reauthorizes prevention funding — prenatal and postnatal health and state and tribal opioid-response grants — through FY2030.', 'health_mental', 'yea_supports', HR2483, 10),
        (m_hr2483, 'Treatment access', 'Improves access to medications for addiction treatment (MAT), expands treatment through Medicare and Medicaid, and strengthens the addiction-medicine workforce.', 'healthcare', 'yea_supports', HR2483N, 20),
        (m_hr2483, 'Recovery services', 'Funds residential treatment for pregnant and postpartum women and "building communities of recovery" programs.', 'family_support', 'yea_supports', HR2483, 30),
        (m_hr2483, 'Overdose-reversal & first responders', 'Supports training for first responders and community members to reverse overdoses.', 'health_mental', 'yea_supports', HR2483N, 40);
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- H.R. 22 — SAVE Act (elections). Requires documentary proof of citizenship to
  -- register to vote in federal elections.
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT id INTO m_hr22 FROM vr_measures WHERE number = 'H.R. 22' AND congress = 119 LIMIT 1;
  IF m_hr22 IS NOT NULL THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
      (m_hr22, 'voting_access',  55, false, 'yea_opposes',  'Critics — including many secretaries of state — warn the documentary-proof requirement could burden eligible citizens who lack ready access to the documents; recorded neutrally.'),
      (m_hr22, 'gov_regulation', 40, false, 'yea_supports', 'Imposes new duties and potential penalties on election officials who register applicants without documentary proof of citizenship.')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    IF NOT EXISTS (SELECT 1 FROM vr_measure_provisions WHERE measure_id = m_hr22) THEN
      INSERT INTO vr_measure_provisions (measure_id, label, description, issue_key, support_meaning, source_url, sort_order) VALUES
        (m_hr22, 'Documentary proof-of-citizenship requirement', 'Amends the National Voter Registration Act to require documentary proof of U.S. citizenship to register to vote in federal elections.', 'voter_id', 'yea_supports', HR22, 10),
        (m_hr22, 'In-person documentation', 'Requires applicants to present acceptable citizenship documents (such as a passport or birth certificate), generally in person, when registering or updating registration.', 'election_integrity', 'yea_supports', HR22, 20),
        (m_hr22, 'Duties & penalties for election officials', 'Directs officials to reject registrations lacking proof and attaches penalties for registering applicants without the required documentation.', 'gov_regulation', 'yea_supports', HR22, 30),
        (m_hr22, 'Access impact', 'Because acceptable documents are not universally held, critics warn eligible citizens could face new barriers to registering. Recorded neutrally as the concern raised in debate.', 'voting_access', 'yea_opposes', HR22, 40);
    END IF;
  END IF;

END $$;
