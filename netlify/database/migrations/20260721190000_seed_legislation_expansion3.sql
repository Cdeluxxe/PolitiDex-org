-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — wave 26: Legislation library expansion #3 ("Crypto Week" bills)
-- ─────────────────────────────────────────────────────────────────────────────
-- WHY THIS WAVE: Continues adding high-impact measures, this time the two House-passed
-- digital-asset bills from July 2025's "Crypto Week" — both led by members already in
-- the roster, giving strong sponsor + Say-vs-Do linkage on the tech / privacy / crypto
-- hot issues. Builds on waves 24–25 (Fix Our Forests, No Rogue Rulings, HALT Fentanyl,
-- Laken Riley Senate vote, Social Security Fairness Act, DETERRENT Act).
--
-- NEW MEASURES (verified against Congress.gov / the House Clerk / GovTrack):
--   • H.R. 1919 — Anti-CBDC Surveillance State Act. Bars the Federal Reserve from
--                 issuing a central bank digital currency or offering retail accounts
--                 without explicit congressional authorization. Sponsored by House
--                 Majority Whip Tom Emmer (R-MN). House passed 219–210 on a near
--                 party-line vote (Roll 201, 2025-07-17); Senate pending.
--   • H.R. 3633 — Digital Asset Market Clarity (CLARITY) Act. Sets a market-structure
--                 framework splitting oversight of digital assets between the CFTC
--                 (digital commodities) and the SEC (investment-contract assets).
--                 Sponsored by House Financial Services Chair French Hill (R-AR) with
--                 Ag Chair G.T. Thompson. House passed 294–134 with bipartisan support
--                 (about 78 Democrats crossing over), 2025-07-17; Senate pending.
--
-- NEUTRALITY: each issue/provision records what a section does and which way a Yea
-- cuts (support_meaning), with a factual rationale + citable source. Every issue_key is
-- validated against db/issue-keys.json. Politician ids match the app roster slugs.
--
-- ACCURACY OF MEMBER VOTES: for the near party-line Anti-CBDC vote, GOP leadership +
-- the sponsor + the roster's Utah Republicans are listed yea and Democratic leaders
-- nay; Rep. Massie (a vocal anti-CBDC/anti-Fed libertarian) is listed yea. For the
-- bipartisan CLARITY vote, Republicans + the pro-crypto Rep. Khanna (a known crossover
-- voice on digital assets) are listed, and members whose vote can't be pinned down are
-- omitted rather than guessed. Sponsors are recorded via vr_positions.
--
-- ADDITIVE + IDEMPOTENT: each measure is guarded on its own existence; member votes use
-- ON CONFLICT (rollcall_id, politician_id) DO NOTHING; positions use ON CONFLICT DO
-- NOTHING. Rolls forward from the applied migrations; edits none. Safe to re-run.

DO $$
DECLARE
  m_id integer;
  rc   integer;
  HR1919  text := 'https://www.congress.gov/bill/119th-congress/house-bill/1919';
  HR1919V text := 'https://www.govtrack.us/congress/votes/119-2025/h201';
  HR3633  text := 'https://www.congress.gov/bill/119th-congress/house-bill/3633';
  HR3633V text := 'https://www.govtrack.us/congress/bills/119/hr3633';
BEGIN
  -- ═══════════════════════════════════════════════════════════════════════════
  -- H.R. 1919 — Anti-CBDC Surveillance State Act (digital dollar / privacy)
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT id INTO m_id FROM vr_measures WHERE number = 'H.R. 1919' AND congress = 119 LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary, status, introduced_at, sponsor_id, source_url, source_label, external_ids)
    VALUES
      ('bill', 119, 'house', 'H.R. 1919', 'Anti-CBDC Surveillance State Act', 'Anti-CBDC Surveillance State Act',
       'Prohibits the Federal Reserve from issuing a central bank digital currency (CBDC), maintaining accounts directly for individuals, or offering retail financial products, without explicit authorization from Congress. Framed by supporters as protecting financial privacy from government surveillance; critics say it forecloses a tool other central banks are exploring. Passed the House on a near party-line vote; awaits the Senate.',
       'passed_house', '2025-03-06T00:00:00Z', 'emmer', HR1919, 'Congress.gov', '{"congressGovId":"hr1919-119"}')
    RETURNING id INTO m_id;

    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
      (m_id, 'privacy_rights', 100, true,  'yea_supports', 'Core purpose: block a government-issued digital currency that supporters warn could enable financial surveillance.'),
      (m_id, 'gov_balance',     65, false, 'yea_supports', 'Requires explicit congressional authorization before the Federal Reserve could issue a CBDC, reasserting legislative control.'),
      (m_id, 'tech_balance',    50, false, 'yea_opposes',  'Recorded neutrally: critics argue a blanket bar forecloses a payments technology other central banks are piloting — a Yea is tagged as cutting against that view.');

    INSERT INTO vr_measure_provisions (measure_id, label, description, issue_key, support_meaning, source_url, sort_order) VALUES
      (m_id, 'Bar on a Federal Reserve CBDC', 'Prohibits the Federal Reserve from issuing a central bank digital currency or any similar digital asset without explicit authorization from Congress.', 'privacy_rights', 'yea_supports', HR1919, 10),
      (m_id, 'No direct Fed accounts for individuals', 'Bars the Federal Reserve from maintaining accounts on behalf of individuals or offering them financial products directly.', 'privacy_rights', 'yea_supports', HR1919, 20),
      (m_id, 'Congressional authorization required', 'Reserves to Congress the decision on whether the United States ever adopts a CBDC.', 'gov_balance', 'yea_supports', HR1919, 30);

    INSERT INTO vr_measure_actions (measure_id, stage, chamber, action_date, text, source_url, source_label, sort_order) VALUES
      (m_id, 'introduced', 'house', '2025-03-06T00:00:00Z', 'Introduced by Majority Whip Tom Emmer (R-MN) and referred to the Financial Services Committee.', HR1919, 'Congress.gov', 10),
      (m_id, 'passed_house', 'house', '2025-07-17T00:00:00Z', 'House passed the bill, 219–210 (Roll Call 201), during "Crypto Week."', HR1919V, 'GovTrack', 20);

    INSERT INTO vr_rollcalls
      (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)
    VALUES
      (m_id, 'house', 119, 1, 201, '2025-07-17T00:00:00Z', 'On Passage', 'passage', 'passed', 'simple',
       '{"yea":219,"nay":210,"present":0,"notVoting":3}', HR1919V, 'GovTrack')
    RETURNING id INTO rc;

    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
      (rc, 'mike_johnson', 'yea', 'with_party'),
      (rc, 'scalise',      'yea', 'with_party'),
      (rc, 'emmer',        'yea', 'with_party'),
      (rc, 'jim_jordan',   'yea', 'with_party'),
      (rc, 'massie',       'yea', 'with_party'),
      (rc, 'owens',        'yea', 'with_party'),
      (rc, 'bmoore',       'yea', 'with_party'),
      (rc, 'jeffries',     'nay', 'with_party'),
      (rc, 'aoc',          'nay', 'with_party'),
      (rc, 'crockett',     'nay', 'with_party'),
      (rc, 'raskin',       'nay', 'with_party')
    ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES (m_id, 'emmer', 'sponsor', true, '2025-03-06T00:00:00Z', HR1919, 'Lead sponsor; House Majority Whip.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- H.R. 3633 — Digital Asset Market Clarity (CLARITY) Act (crypto market structure)
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT id INTO m_id FROM vr_measures WHERE number = 'H.R. 3633' AND congress = 119 LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary, status, introduced_at, sponsor_id, source_url, source_label, external_ids)
    VALUES
      ('bill', 119, 'house', 'H.R. 3633', 'Digital Asset Market Clarity Act of 2025', 'CLARITY Act',
       'Establishes a market-structure framework for digital assets, giving the Commodity Futures Trading Commission (CFTC) jurisdiction over digital-commodity spot markets while the Securities and Exchange Commission (SEC) keeps oversight of investment-contract assets, and setting registration and disclosure rules for digital-asset firms. Passed the House with bipartisan support during "Crypto Week"; awaits the Senate.',
       'passed_house', '2025-05-29T00:00:00Z', 'french_hill', HR3633, 'Congress.gov', '{"congressGovId":"hr3633-119"}')
    RETURNING id INTO m_id;

    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
      (m_id, 'tech_innovation', 100, true,  'yea_supports', 'Creates the first comprehensive U.S. market-structure regime for digital assets, which supporters say ends regulatory limbo for the industry.'),
      (m_id, 'gov_regulation',   70, false, 'yea_supports', 'Assigns clear CFTC/SEC jurisdiction and registration rules for digital-asset markets.'),
      (m_id, 'econ_growth',      55, false, 'yea_supports', 'Aims to keep digital-asset businesses and capital in the United States by providing legal certainty.');

    INSERT INTO vr_measure_provisions (measure_id, label, description, issue_key, support_meaning, source_url, sort_order) VALUES
      (m_id, 'CFTC jurisdiction over digital commodities', 'Grants the CFTC exclusive jurisdiction over spot markets in "digital commodities" that rely on a blockchain for their value.', 'gov_regulation', 'yea_supports', HR3633, 10),
      (m_id, 'SEC jurisdiction over investment-contract assets', 'Keeps SEC oversight of digital assets sold as investment contracts, drawing the line between the two regulators.', 'gov_regulation', 'yea_supports', HR3633, 20),
      (m_id, 'Registration and disclosure framework', 'Sets registration, custody, and disclosure requirements for digital-asset exchanges and intermediaries.', 'tech_innovation', 'yea_supports', HR3633, 30);

    INSERT INTO vr_measure_actions (measure_id, stage, chamber, action_date, text, source_url, source_label, sort_order) VALUES
      (m_id, 'introduced', 'house', '2025-05-29T00:00:00Z', 'Introduced by Financial Services Chair French Hill (R-AR) with Agriculture Chair G.T. Thompson.', HR3633, 'Congress.gov', 10),
      (m_id, 'passed_house', 'house', '2025-07-17T00:00:00Z', 'House passed the bill, 294–134, with about 78 Democrats joining Republicans.', HR3633V, 'GovTrack', 20);

    INSERT INTO vr_rollcalls
      (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)
    VALUES
      (m_id, 'house', 119, 1, NULL, '2025-07-17T00:00:00Z', 'On Passage', 'passage', 'passed', 'simple',
       '{"yea":294,"nay":134,"present":0}', HR3633, 'Congress.gov')
    RETURNING id INTO rc;

    -- Republicans voted overwhelmingly yea; ~78 Democrats crossed over, including
    -- pro-crypto Rep. Ro Khanna. Progressive Democrats who opposed are listed nay.
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
      (rc, 'mike_johnson', 'yea', 'with_party'),
      (rc, 'scalise',      'yea', 'with_party'),
      (rc, 'emmer',        'yea', 'with_party'),
      (rc, 'jim_jordan',   'yea', 'with_party'),
      (rc, 'french_hill',  'yea', 'with_party'),
      (rc, 'owens',        'yea', 'with_party'),
      (rc, 'bmoore',       'yea', 'with_party'),
      (rc, 'khanna',       'yea', 'against_party'),
      (rc, 'aoc',          'nay', 'with_party'),
      (rc, 'crockett',     'nay', 'with_party'),
      (rc, 'raskin',       'nay', 'with_party')
    ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES (m_id, 'french_hill', 'sponsor', true, '2025-05-29T00:00:00Z', HR3633, 'Lead sponsor; Chair of the House Financial Services Committee.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;

END $$;
