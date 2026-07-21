-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — wave 25: Legislation library expansion #2 (new bills + linkage)
-- ─────────────────────────────────────────────────────────────────────────────
-- WHY THIS WAVE: Continues adding high-impact measures to the Legislation library,
-- each with full detail (issue breakdown, provisions, timeline), real recorded roll
-- calls, and member votes/sponsorships that light up per-member Say-vs-Do — on top of
-- wave 24 (Fix Our Forests, No Rogue Rulings, HALT Fentanyl, Laken Riley Senate).
--
-- NEW MEASURES (all verified against Congress.gov / the House Clerk / GovTrack / SSA):
--   • H.R. 82  — Social Security Fairness Act (118th Cong.). Repeals the WEP and GPO,
--                raising benefits for public-sector retirees; CBO scored it at ~$196B
--                added to deficits over a decade. House passed 327–75 (Roll 456,
--                2024-11-12); Senate passed 76–20 (Vote 338, 2024-12-21); signed into
--                law 2025-01-05. The 20 Senate nays were all Republican fiscal hawks —
--                a clean Say-vs-Do signal on spending vs. benefits.
--   • H.R. 1048 — DETERRENT Act (119th Cong.). Tightens Section 117 foreign-gift
--                disclosure for universities (threshold cut to $50K, $0 for China/Iran/
--                North Korea/Russia), adds faculty/endowment transparency and Title IV
--                enforcement. House passed 241–169 (Roll 83, 2025-03-27); Senate pending.
--
-- NEUTRALITY: each issue/provision records what a section does and which way a Yea
-- cuts (support_meaning), with a factual rationale + citable source — including the
-- fiscal-cost concern on H.R. 82, recorded as a neutral tag. Every issue_key is
-- validated against db/issue-keys.json. Politician ids match the app roster slugs.
--
-- ACCURACY OF MEMBER VOTES: only votes that are a matter of settled public record are
-- asserted. For H.R. 82's Senate vote the full 20-name Republican "nay" list is public
-- and only four senators (Rubio, Vance, Manchin, Schiff) did not vote, so every other
-- seated roster senator's position is determined; senators elected in Nov 2024 but not
-- seated until Jan 2025 (e.g., Curtis, Slotkin, Moreno) are excluded because they cast
-- no vote. For the House votes, only leadership / committee members / famous holdouts
-- whose position is unambiguous are listed; the rest are omitted rather than guessed.
--
-- ADDITIVE + IDEMPOTENT: each measure is guarded on its own existence (its block runs
-- only if absent); member votes use ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
-- positions use ON CONFLICT DO NOTHING. Rolls forward from the applied migrations; edits
-- none. Safe to re-run.

DO $$
DECLARE
  m_id integer;
  rc   integer;
  HR82   text := 'https://www.congress.gov/bill/118th-congress/house-bill/82';
  HR82H  text := 'https://clerk.house.gov/Votes/2024456';
  HR82S  text := 'https://www.govtrack.us/congress/votes/118-2024/s338';
  HR82N  text := 'https://thehill.com/homenews/senate/5052213-social-security-benefits-bill-repeal/';
  HR82C  text := 'https://www.ssa.gov/legislation/legis_bulletin_122324.html';
  HR1048  text := 'https://www.congress.gov/bill/119th-congress/house-bill/1048';
  HR1048V text := 'https://baumgartner.house.gov/media/press-releases/baumgartners-deterrent-act-passes-house-combat-foreign-influence-us-colleges';
BEGIN
  -- ═══════════════════════════════════════════════════════════════════════════
  -- H.R. 82 — Social Security Fairness Act (118th Congress; enacted 2025-01-05)
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT id INTO m_id FROM vr_measures WHERE number = 'H.R. 82' AND congress = 118 LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary, status, introduced_at, source_url, source_label, external_ids)
    VALUES
      ('bill', 118, 'house', 'H.R. 82', 'Social Security Fairness Act of 2023', 'Social Security Fairness Act',
       'Repeals the Windfall Elimination Provision (WEP) and the Government Pension Offset (GPO), which had reduced Social Security benefits for people who also receive a pension from work not covered by Social Security — chiefly teachers, firefighters, police, and other public-sector retirees. Benefits were made retroactive to January 2024. The Congressional Budget Office estimated the repeal adds about $196 billion to federal deficits over ten years and advances Social Security''s insolvency by roughly six months. Passed both chambers with large bipartisan majorities and was signed into law January 5, 2025.',
       'enacted', '2023-01-09T00:00:00Z', HR82, 'Congress.gov', '{"congressGovId":"hr82-118"}')
    RETURNING id INTO m_id;

    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
      (m_id, 'social_security', 100, true,  'yea_supports', 'Repeals WEP and GPO to raise Social Security benefits for public-sector retirees with non-covered pensions.'),
      (m_id, 'cost_living',      60, false, 'yea_supports', 'Increases monthly retirement income for affected teachers, firefighters, police, and other public workers.'),
      (m_id, 'national_debt',    55, false, 'yea_opposes',  'CBO scored the repeal at roughly $196 billion added to federal deficits over a decade — a Yea is tagged as cutting against debt reduction.');

    INSERT INTO vr_measure_provisions (measure_id, label, description, issue_key, support_meaning, source_url, sort_order) VALUES
      (m_id, 'Repeal the Windfall Elimination Provision (WEP)', 'Ends the formula that reduced Social Security benefits for workers who also earned a pension from non-covered employment.', 'social_security', 'yea_supports', HR82, 10),
      (m_id, 'Repeal the Government Pension Offset (GPO)', 'Ends the offset that reduced Social Security spousal and survivor benefits for those receiving a non-covered government pension.', 'social_security', 'yea_supports', HR82, 20),
      (m_id, 'Retroactive to January 2024', 'Makes the higher benefits retroactive to January 2024, triggering lump-sum back payments to affected retirees.', 'cost_living', 'yea_supports', HR82C, 30),
      (m_id, 'Adds to the federal deficit', 'CBO estimated the repeal increases deficits by about $196 billion over ten years and speeds Social Security''s projected insolvency by about six months.', 'national_debt', 'yea_opposes', HR82, 40);

    INSERT INTO vr_measure_actions (measure_id, stage, chamber, action_date, text, source_url, source_label, sort_order) VALUES
      (m_id, 'passed_house', 'house', '2024-11-12T00:00:00Z', 'House passed the bill, 327–75 (Roll Call 456).', HR82H, 'U.S. House Clerk', 10),
      (m_id, 'passed_senate', 'senate', '2024-12-21T00:00:00Z', 'Senate passed the bill, 76–20 (Vote 338); 20 Republicans voted no on fiscal grounds.', HR82S, 'GovTrack', 20),
      (m_id, 'enacted', 'joint', '2025-01-05T00:00:00Z', 'Signed into law by President Biden.', HR82, 'Congress.gov', 30);

    -- House passage (327–75). Democrats voted overwhelmingly yea; Rep. Massie, a
    -- consistent no on deficit-increasing bills, was among the Republican nays. Other
    -- House members are omitted rather than guessed.
    INSERT INTO vr_rollcalls
      (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)
    VALUES
      (m_id, 'house', 118, 2, 456, '2024-11-12T00:00:00Z', 'On Passage', 'passage', 'passed', 'simple',
       '{"yea":327,"nay":75,"present":0,"notVoting":31}', HR82H, 'U.S. House Clerk')
    RETURNING id INTO rc;

    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
      (rc, 'jeffries', 'yea', 'with_party'),
      (rc, 'aoc',      'yea', 'with_party'),
      (rc, 'crockett', 'yea', 'with_party'),
      (rc, 'khanna',   'yea', 'with_party'),
      (rc, 'raskin',   'yea', 'with_party'),
      (rc, 'massie',   'nay', NULL)
    ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

    -- Senate passage (76–20). The 20 nays were all Republicans (public list); only
    -- Rubio, Vance, Manchin and Schiff did not vote, so every other seated senator's
    -- position is determined. Senators-elect not yet seated (e.g., Curtis, Slotkin,
    -- Moreno) cast no vote and are excluded.
    INSERT INTO vr_rollcalls
      (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)
    VALUES
      (m_id, 'senate', 118, 2, 338, '2024-12-21T00:00:00Z', 'On Passage of the Bill', 'passage', 'passed', 'simple',
       '{"yea":76,"nay":20,"present":0,"notVoting":4}', HR82S, 'GovTrack')
    RETURNING id INTO rc;

    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
      -- Republican nays (verified public list); GOP split 27–20, so no clean party line (is_party null)
      (rc, 'barrasso',         'nay', NULL),
      (rc, 'ted_budd',         'nay', NULL),
      (rc, 'cruz',             'nay', NULL),
      (rc, 'grassley',         'nay', NULL),
      (rc, 'ron_johnson',      'nay', NULL),
      (rc, 'lee',              'nay', NULL),
      (rc, 'lummis',           'nay', NULL),
      (rc, 'rand_paul',        'nay', NULL),
      (rc, 'mike_rounds',      'nay', NULL),
      (rc, 'thune',            'nay', NULL),
      (rc, 'tommy_tuberville', 'nay', NULL),
      (rc, 'todd_young',       'nay', NULL),
      -- Republican yeas (lead sponsor Collins; Murkowski)
      (rc, 'collins',          'yea', NULL),
      (rc, 'murkowski',        'yea', NULL),
      -- Democratic yeas (the caucus voted yea; Schiff did not vote)
      (rc, 'warren',           'yea', 'with_party'),
      (rc, 'booker',           'yea', 'with_party'),
      (rc, 'durbin',           'yea', 'with_party'),
      (rc, 'fetterman',        'yea', 'with_party'),
      (rc, 'jon_ossoff',       'yea', 'with_party'),
      (rc, 'warnock',          'yea', 'with_party'),
      (rc, 'warner',           'yea', 'with_party'),
      (rc, 'van_hollen',       'yea', 'with_party'),
      (rc, 'schumer',          'yea', 'with_party'),
      (rc, 'padilla',          'yea', 'with_party'),
      (rc, 'mark_kelly',       'yea', 'with_party'),
      (rc, 'markey',           'yea', 'with_party'),
      (rc, 'merkley',          'yea', 'with_party'),
      (rc, 'wyden',            'yea', 'with_party'),
      (rc, 'peters',           'yea', 'with_party'),
      (rc, 'shaheen',          'yea', 'with_party'),
      (rc, 'rosen',            'yea', 'with_party'),
      (rc, 'schatz',           'yea', 'with_party'),
      (rc, 'maggie_hassan',    'yea', 'with_party'),
      (rc, 'tammy_baldwin',    'yea', 'with_party'),
      (rc, 'tina_smith',       'yea', 'with_party'),
      (rc, 'lujan',            'yea', 'with_party'),
      (rc, 'welch',            'yea', 'with_party'),
      (rc, 'schiff',           'not_voting', NULL)
    ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES (m_id, 'collins', 'cosponsor', true, '2024-12-21T00:00:00Z', HR82, 'Lead Senate sponsor of the Social Security Fairness Act.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- H.R. 1048 — DETERRENT Act (higher-ed foreign-gift transparency)
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT id INTO m_id FROM vr_measures WHERE number = 'H.R. 1048' AND congress = 119 LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary, status, introduced_at, source_url, source_label, external_ids)
    VALUES
      ('bill', 119, 'house', 'H.R. 1048', 'Defending Education Transparency and Ending Rogue Regimes Engaging in Nefarious Transactions (DETERRENT) Act', 'DETERRENT Act',
       'Strengthens Section 117 of the Higher Education Act by lowering the threshold for universities to report foreign gifts and contracts from $250,000 to $50,000 — and to $0 for "countries of concern" (China, Iran, North Korea, Russia). Requires disclosure of individual gifts to faculty and staff in a searchable database, adds endowment-investment transparency for large private institutions, and enforces compliance with fines and potential loss of Title IV funding. Passed the House 241–169; awaits Senate action.',
       'passed_house', '2025-02-06T00:00:00Z', HR1048, 'Congress.gov', '{"congressGovId":"hr1048-119"}')
    RETURNING id INTO m_id;

    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
      (m_id, 'gov_transparency', 100, true,  'yea_supports', 'Core purpose: force disclosure of foreign money flowing to universities, faculty, and endowments.'),
      (m_id, 'america_first',     70, false, 'yea_supports', 'Targets foreign influence — especially from China, Iran, North Korea, and Russia — on U.S. campuses as a national-security matter.'),
      (m_id, 'edu_balance',       55, false, 'yea_supports', 'Sets federal higher-education policy, backed by fines and Title IV enforcement for noncompliant institutions.'),
      (m_id, 'free_speech',       35, false, 'yea_opposes',  'Recorded neutrally: some universities and civil-liberties groups warn the reporting and enforcement burdens could chill academic exchange — a Yea is tagged as cutting against that concern.');

    INSERT INTO vr_measure_provisions (measure_id, label, description, issue_key, support_meaning, source_url, sort_order) VALUES
      (m_id, 'Lower foreign-gift reporting threshold', 'Cuts the Section 117 reporting threshold from $250,000 to $50,000, and to $0 for gifts from China, Iran, North Korea, or Russia.', 'gov_transparency', 'yea_supports', HR1048, 10),
      (m_id, 'Individual faculty and staff disclosure', 'Requires foreign gifts to individual faculty and staff to be reported to the institution and kept in a searchable database.', 'gov_transparency', 'yea_supports', HR1048, 20),
      (m_id, 'Endowment-investment transparency', 'Requires large private institutions to disclose concerning foreign investments held in their endowments.', 'gov_transparency', 'yea_supports', HR1048, 30),
      (m_id, 'Enforcement via fines and Title IV', 'Imposes fines and risks loss of federal Title IV student-aid eligibility for institutions that fail to comply.', 'edu_balance', 'yea_supports', HR1048, 40);

    INSERT INTO vr_measure_actions (measure_id, stage, chamber, action_date, text, source_url, source_label, sort_order) VALUES
      (m_id, 'introduced', 'house', '2025-02-06T00:00:00Z', 'Introduced by Rep. Michael Baumgartner (R-WA) and referred to the Education and Workforce Committee.', HR1048, 'Congress.gov', 10),
      (m_id, 'passed_house', 'house', '2025-03-27T00:00:00Z', 'House passed the bill, 241–169 (Roll Call 83); 31 Democrats joined 210 Republicans.', HR1048V, 'Rep. Baumgartner', 20);

    INSERT INTO vr_rollcalls
      (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)
    VALUES
      (m_id, 'house', 119, 1, 83, '2025-03-27T00:00:00Z', 'On Passage', 'passage', 'passed', 'simple',
       '{"yea":241,"nay":169,"present":0,"notVoting":21}', HR1048V, 'U.S. House')
    RETURNING id INTO rc;

    -- Republicans voted overwhelmingly yea (incl. Education & Workforce member Owens);
    -- progressive Democrats voted nay. The 31 Democratic crossovers were mostly moderate
    -- members not in this roster, so they are not individually asserted here.
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
      (rc, 'mike_johnson', 'yea', 'with_party'),
      (rc, 'scalise',      'yea', 'with_party'),
      (rc, 'emmer',        'yea', 'with_party'),
      (rc, 'jim_jordan',   'yea', 'with_party'),
      (rc, 'owens',        'yea', 'with_party'),
      (rc, 'bmoore',       'yea', 'with_party'),
      (rc, 'aoc',          'nay', 'with_party'),
      (rc, 'crockett',     'nay', 'with_party'),
      (rc, 'khanna',       'nay', 'with_party'),
      (rc, 'raskin',       'nay', 'with_party')
    ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
  END IF;

END $$;
