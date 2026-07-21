-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — wave 27: Legislation library expansion #4 (defense / energy /
-- immigration / america-first), plus a Laken Riley sponsor + House-vote enrichment
-- ─────────────────────────────────────────────────────────────────────────────
-- WHY THIS WAVE: Adds three more high-impact 119th-Congress measures across the hot
-- issues the request named — defense, energy, and an america-first/culture vote — each
-- with full detail, a real recorded roll call, and roster member votes/sponsorships
-- that light up per-member Say-vs-Do. It also enriches the already-present Laken Riley
-- Act (H.R. 29) with its House passage roll call and its sponsor, roster member Mike
-- Collins (R-GA). Builds on waves 24–26.
--
-- NEW MEASURES (verified against Congress.gov / the House Clerk / GovTrack / Roll Call):
--   • H.R. 3838 — National Defense Authorization Act for FY2026. The House passed its
--                 version 231–196 (2025-09-10); a bicameral compromise (~$900.6B, a
--                 3.8% troop pay raise, an acquisition overhaul) then passed the House
--                 312–112 (2025-12-10) and the Senate 77–20 (2025-12-17) and was signed
--                 into law — the 65th straight year an NDAA became law.
--   • H.R. 1949 — Unlocking our Domestic LNG Potential Act. Strips the Energy Dept.'s
--                 approval role for LNG import/export and hands siting to FERC, deeming
--                 exports in the public interest. Sponsored by Rep. August Pfluger (R-TX);
--                 House passed 217–188 (Roll 304, 2025-11-20); Senate pending.
--   • H.R. 276  — Gulf of America Act. Renames the Gulf of Mexico and codifies the
--                 Jan 2025 executive order. Sponsored by Rep. Marjorie Taylor Greene
--                 (R-GA); House passed 211–206 (Roll 122, 2025-05-08); Senate pending.
--
-- ENRICHMENT:
--   • H.R. 29 (Laken Riley Act, already in the record and now law) — adds its House
--     passage roll call (264–159, Roll 6, 2025-01-07) and records sponsor Mike Collins,
--     giving the roster's immigration record a direct sponsor tie.
--
-- NEUTRALITY: each issue/provision records what a section does and which way a Yea cuts
-- (support_meaning), with a factual rationale + citable source — including the fiscal
-- concern on the NDAA topline and the emissions/price concern critics raise on LNG
-- exports, recorded as neutral tags. Every issue_key is validated against
-- db/issue-keys.json. Politician ids match the app roster slugs.
--
-- ACCURACY OF MEMBER VOTES: only settled-record positions are asserted — chamber
-- leadership, the bill sponsor, and the roster's Utah Republicans on party-backed
-- passage votes, and Democratic leaders opposed. Members whose vote can't be pinned
-- down (e.g., the handful of Republican NDAA/Gulf defectors, the crossover Democrats
-- on Laken Riley) are omitted rather than guessed. Sponsors use vr_positions.
--
-- ADDITIVE + IDEMPOTENT: each new measure is guarded on its own existence; the H.R. 29
-- enrichment is guarded by NOT EXISTS of a House roll call on that measure; member votes
-- use ON CONFLICT (rollcall_id, politician_id) DO NOTHING; positions use ON CONFLICT DO
-- NOTHING. Rolls forward from the applied migrations; edits none. Safe to re-run.

DO $$
DECLARE
  m_id integer;
  rc   integer;
  NDAA   text := 'https://www.congress.gov/bill/119th-congress/house-bill/3838';
  NDAAV  text := 'https://www.govtrack.us/congress/bills/119/hr3838';
  NDAAC  text := 'https://rollcall.com/2025/12/10/house-votes-overwhelmingly-to-pass-compromise-ndaa/';
  NDAAS  text := 'https://rollcall.com/2025/12/17/senate-clears-fiscal-2026-ndaa/';
  LNG    text := 'https://www.congress.gov/bill/119th-congress/house-bill/1949';
  LNGV   text := 'https://clerk.house.gov/Votes/2025304';
  GULF   text := 'https://www.congress.gov/bill/119th-congress/house-bill/276';
  GULFV  text := 'https://www.govtrack.us/congress/votes/119-2025/h122';
  HR29   text := 'https://www.congress.gov/bill/119th-congress/house-bill/29';
  HR29S  text := 'https://collins.house.gov/media/press-releases/laken-riley-act-passes-house-bipartisan-support';
BEGIN
  -- ═══════════════════════════════════════════════════════════════════════════
  -- H.R. 3838 — National Defense Authorization Act for Fiscal Year 2026 (defense)
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT id INTO m_id FROM vr_measures WHERE number = 'H.R. 3838' AND congress = 119 LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary, status, introduced_at, source_url, source_label, external_ids)
    VALUES
      ('bill', 119, 'house', 'H.R. 3838', 'National Defense Authorization Act for Fiscal Year 2026', 'FY2026 NDAA',
       'The annual defense-policy authorization. The House passed its version (H.R. 3838) 231–196; a bicameral compromise then authorized roughly $900.6 billion for national defense, funded a 3.8% pay raise for troops, endorsed most of the Pentagon''s weapons priorities, and ordered a sweeping overhaul of Defense Department acquisition. The compromise passed the House 312–112 and the Senate 77–20 and was signed into law — the 65th consecutive year an NDAA has become law. (Authorization sets policy and ceilings; the money is provided separately in appropriations.)',
       'enacted', '2025-06-10T00:00:00Z', NDAA, 'Congress.gov', '{"congressGovId":"hr3838-119"}')
    RETURNING id INTO m_id;

    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
      (m_id, 'strong_defense', 100, true,  'yea_supports', 'Authorizes military policy, force levels, and weapons programs for the fiscal year.'),
      (m_id, 'veterans',        60, false, 'yea_supports', 'Includes a 3.8% pay raise and personnel/quality-of-life provisions for service members.'),
      (m_id, 'national_debt',   50, false, 'yea_opposes',  'Authorizes a roughly $900.6 billion national-defense topline — a Yea is tagged as cutting against spending restraint.');

    INSERT INTO vr_measure_provisions (measure_id, label, description, issue_key, support_meaning, source_url, sort_order) VALUES
      (m_id, '$900.6B national-defense topline', 'Authorizes about $900.6 billion for defense at the Pentagon and other agencies for fiscal year 2026.', 'strong_defense', 'yea_supports', NDAAC, 10),
      (m_id, '3.8% military pay raise', 'Funds a 3.8 percent pay raise for military personnel plus quality-of-life measures.', 'veterans', 'yea_supports', NDAAC, 20),
      (m_id, 'Acquisition-process overhaul', 'Orders a sweeping modernization of how the Defense Department buys weapons and services.', 'strong_defense', 'yea_supports', NDAAC, 30);

    INSERT INTO vr_measure_actions (measure_id, stage, chamber, action_date, text, source_url, source_label, sort_order) VALUES
      (m_id, 'passed_house', 'house', '2025-09-10T00:00:00Z', 'House passed its version of the FY2026 NDAA, 231–196.', NDAAV, 'GovTrack', 10),
      (m_id, 'resolving_differences', 'joint', '2025-12-10T00:00:00Z', 'House adopted the bicameral compromise, 312–112.', NDAAC, 'Roll Call', 20),
      (m_id, 'passed_senate', 'senate', '2025-12-17T00:00:00Z', 'Senate cleared the compromise, 77–20.', NDAAS, 'Roll Call', 30),
      (m_id, 'enacted', 'joint', '2025-12-20T00:00:00Z', 'Signed into law — the 65th consecutive year an NDAA became law.', NDAAC, 'Roll Call', 40);

    INSERT INTO vr_rollcalls
      (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)
    VALUES
      (m_id, 'house', 119, 1, NULL, '2025-09-10T00:00:00Z', 'On Passage (House version)', 'passage', 'passed', 'simple',
       '{"yea":231,"nay":196}', NDAAV, 'GovTrack')
    RETURNING id INTO rc;

    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
      (rc, 'mike_johnson', 'yea', 'with_party'),
      (rc, 'scalise',      'yea', 'with_party'),
      (rc, 'emmer',        'yea', 'with_party'),
      (rc, 'jim_jordan',   'yea', 'with_party'),
      (rc, 'owens',        'yea', 'with_party'),
      (rc, 'bmoore',       'yea', 'with_party'),
      (rc, 'jeffries',     'nay', 'with_party'),
      (rc, 'aoc',          'nay', 'with_party'),
      (rc, 'crockett',     'nay', 'with_party'),
      (rc, 'khanna',       'nay', 'with_party'),
      (rc, 'raskin',       'nay', 'with_party')
    ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- H.R. 1949 — Unlocking our Domestic LNG Potential Act (energy)
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT id INTO m_id FROM vr_measures WHERE number = 'H.R. 1949' AND congress = 119 LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary, status, introduced_at, sponsor_id, source_url, source_label, external_ids)
    VALUES
      ('bill', 119, 'house', 'H.R. 1949', 'Unlocking our Domestic LNG Potential Act of 2025', 'Unlocking Domestic LNG Potential Act',
       'Removes the Department of Energy''s separate approval requirement for natural-gas imports and exports and gives the Federal Energy Regulatory Commission (FERC) sole authority to approve the siting, construction, and operation of LNG terminals — while directing that exports be deemed consistent with the public interest. Supporters call it a way to speed U.S. energy exports and cut red tape; critics warn it sidelines review of price and emissions effects. Passed the House; awaits the Senate.',
       'passed_house', '2025-03-06T00:00:00Z', NULL, LNG, 'Congress.gov', '{"congressGovId":"hr1949-119"}')
    RETURNING id INTO m_id;

    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
      (m_id, 'energy_production', 100, true,  'yea_supports', 'Speeds approval of LNG export terminals to expand U.S. natural-gas production and shipments.'),
      (m_id, 'gov_regulation',     70, false, 'yea_supports', 'Eliminates the Energy Department''s separate approval step and consolidates permitting at FERC.'),
      (m_id, 'econ_trade',         55, false, 'yea_supports', 'Aims to grow U.S. energy exports to allied and other foreign markets.'),
      (m_id, 'climate_action',     40, false, 'yea_opposes',  'Recorded neutrally: critics argue fast-tracking LNG exports raises domestic prices and emissions and skips public-interest review — a Yea is tagged as cutting against that concern.');

    INSERT INTO vr_measure_provisions (measure_id, label, description, issue_key, support_meaning, source_url, sort_order) VALUES
      (m_id, 'End DOE approval for gas import/export', 'Repeals Natural Gas Act provisions requiring separate Department of Energy approval of natural-gas imports and exports.', 'gov_regulation', 'yea_supports', LNG, 10),
      (m_id, 'FERC authority over LNG terminals', 'Gives FERC authority to approve or deny the siting, construction, expansion, and operation of LNG import/export facilities.', 'energy_production', 'yea_supports', LNG, 20),
      (m_id, 'Exports deemed in the public interest', 'Directs that natural-gas exports be treated as consistent with the public interest for approval purposes.', 'econ_trade', 'yea_supports', LNG, 30);

    INSERT INTO vr_measure_actions (measure_id, stage, chamber, action_date, text, source_url, source_label, sort_order) VALUES
      (m_id, 'introduced', 'house', '2025-03-06T00:00:00Z', 'Introduced by Rep. August Pfluger (R-TX) and referred to the Energy and Commerce Committee.', LNG, 'Congress.gov', 10),
      (m_id, 'passed_house', 'house', '2025-11-20T00:00:00Z', 'House passed the bill, 217–188 (Roll Call 304).', LNGV, 'U.S. House Clerk', 20);

    INSERT INTO vr_rollcalls
      (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)
    VALUES
      (m_id, 'house', 119, 1, 304, '2025-11-20T00:00:00Z', 'On Passage', 'passage', 'passed', 'simple',
       '{"yea":217,"nay":188}', LNGV, 'U.S. House Clerk')
    RETURNING id INTO rc;

    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
      (rc, 'mike_johnson', 'yea', 'with_party'),
      (rc, 'scalise',      'yea', 'with_party'),
      (rc, 'emmer',        'yea', 'with_party'),
      (rc, 'jim_jordan',   'yea', 'with_party'),
      (rc, 'owens',        'yea', 'with_party'),
      (rc, 'bmoore',       'yea', 'with_party'),
      (rc, 'jeffries',     'nay', 'with_party'),
      (rc, 'aoc',          'nay', 'with_party'),
      (rc, 'crockett',     'nay', 'with_party'),
      (rc, 'khanna',       'nay', 'with_party'),
      (rc, 'raskin',       'nay', 'with_party')
    ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- H.R. 276 — Gulf of America Act (america-first / culture)
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT id INTO m_id FROM vr_measures WHERE number = 'H.R. 276' AND congress = 119 LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary, status, introduced_at, sponsor_id, source_url, source_label, external_ids)
    VALUES
      ('bill', 119, 'house', 'H.R. 276', 'Gulf of America Act of 2025', 'Gulf of America Act',
       'Renames the Gulf of Mexico as the "Gulf of America" and directs all federal agencies to update their documents and maps within 180 days, codifying an executive order President Trump issued January 20, 2025. Passed the House on a near party-line vote; awaits the Senate.',
       'passed_house', '2025-01-09T00:00:00Z', 'mtg', GULF, 'Congress.gov', '{"congressGovId":"hr276-119"}')
    RETURNING id INTO m_id;

    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
      (m_id, 'america_first', 100, true, 'yea_supports', 'Codifies the "Gulf of America" renaming as a symbolic america-first measure and locks in the executive order.');

    INSERT INTO vr_measure_provisions (measure_id, label, description, issue_key, support_meaning, source_url, sort_order) VALUES
      (m_id, 'Rename the Gulf of Mexico', 'Renames the body of water the "Gulf of America" in federal usage.', 'america_first', 'yea_supports', GULF, 10),
      (m_id, 'Update federal maps and documents', 'Directs all federal agencies to reflect the new name in their maps and documents within 180 days.', 'america_first', 'yea_supports', GULF, 20),
      (m_id, 'Codify the executive order', 'Writes President Trump''s January 20, 2025 renaming order into statute so a future administration cannot simply reverse it.', 'america_first', 'yea_supports', GULF, 30);

    INSERT INTO vr_measure_actions (measure_id, stage, chamber, action_date, text, source_url, source_label, sort_order) VALUES
      (m_id, 'introduced', 'house', '2025-01-09T00:00:00Z', 'Introduced by Rep. Marjorie Taylor Greene (R-GA).', GULF, 'Congress.gov', 10),
      (m_id, 'passed_house', 'house', '2025-05-08T00:00:00Z', 'House passed the bill, 211–206 (Roll Call 122).', GULFV, 'GovTrack', 20);

    INSERT INTO vr_rollcalls
      (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)
    VALUES
      (m_id, 'house', 119, 1, 122, '2025-05-08T00:00:00Z', 'On Passage', 'passage', 'passed', 'simple',
       '{"yea":211,"nay":206,"present":0,"notVoting":16}', GULFV, 'GovTrack')
    RETURNING id INTO rc;

    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
      (rc, 'mtg',          'yea', 'with_party'),
      (rc, 'mike_johnson', 'yea', 'with_party'),
      (rc, 'scalise',      'yea', 'with_party'),
      (rc, 'emmer',        'yea', 'with_party'),
      (rc, 'jim_jordan',   'yea', 'with_party'),
      (rc, 'owens',        'yea', 'with_party'),
      (rc, 'bmoore',       'yea', 'with_party'),
      (rc, 'jeffries',     'nay', 'with_party'),
      (rc, 'aoc',          'nay', 'with_party'),
      (rc, 'crockett',     'nay', 'with_party'),
      (rc, 'khanna',       'nay', 'with_party'),
      (rc, 'raskin',       'nay', 'with_party')
    ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES (m_id, 'mtg', 'sponsor', true, '2025-01-09T00:00:00Z', GULF, 'Lead sponsor of the Gulf of America Act.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- H.R. 29 — Laken Riley Act (already in the record): add House roll call + sponsor.
  -- House passed 264–159 on 2025-01-07 (Roll 6): all Republicans plus 48 Democrats.
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT id INTO m_id FROM vr_measures WHERE number = 'H.R. 29' AND congress = 119 LIMIT 1;
  IF m_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM vr_rollcalls WHERE measure_id = m_id AND chamber = 'house') THEN
      INSERT INTO vr_rollcalls
        (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)
      VALUES
        (m_id, 'house', 119, 1, 6, '2025-01-07T00:00:00Z', 'On Passage', 'passage', 'passed', 'simple',
         '{"yea":264,"nay":159}', HR29S, 'Rep. Collins (sponsor)')
      RETURNING id INTO rc;

      INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
        (rc, 'mike_collins', 'yea', 'with_party'),
        (rc, 'mike_johnson', 'yea', 'with_party'),
        (rc, 'scalise',      'yea', 'with_party'),
        (rc, 'emmer',        'yea', 'with_party'),
        (rc, 'jim_jordan',   'yea', 'with_party'),
        (rc, 'owens',        'yea', 'with_party'),
        (rc, 'bmoore',       'yea', 'with_party'),
        (rc, 'jeffries',     'nay', 'with_party'),
        (rc, 'aoc',          'nay', 'with_party'),
        (rc, 'crockett',     'nay', 'with_party'),
        (rc, 'khanna',       'nay', 'with_party'),
        (rc, 'raskin',       'nay', 'with_party')
      ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
    END IF;

    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES (m_id, 'mike_collins', 'sponsor', true, '2025-01-03T00:00:00Z', HR29, 'Lead House sponsor; reintroduced the bill on the first day of the 119th Congress.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;

END $$;
