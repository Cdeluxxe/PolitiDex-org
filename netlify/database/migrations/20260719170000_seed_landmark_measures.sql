-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — landmark measures backfill (data-only, hand-verified)
-- ─────────────────────────────────────────────────────────────────────────────
-- Adds two more landmark House measures from the 119th Congress to the Voting
-- Record, with issue tags and recorded member votes, so more of the curated
-- profiles connect to real roll calls and their say-vs-do verdicts light up.
--
-- Changes NO schema. Inserts into vr_measures, vr_measure_issues, vr_rollcalls and
-- vr_member_votes only. Rolls forward from the applied voting-record migrations;
-- never edits one. Politician ids match the app roster slugs.
--
-- Verified facts (bill numbers, roll calls, dates and tallies match the roll calls
-- already cited in the curated stance cards):
--   H.R. 26 — Protecting American Energy Production Act. House roll call 35,
--     2025-02-07, On Passage, passed 226-188 (near party-line). Bars a federal
--     moratorium on hydraulic fracturing and affirms state primacy.
--     GOP leadership + Massie voted yea; Democratic leaders/members voted nay.
--     (clerk.house.gov/Votes/202535)
--   H.R. 27 — HALT Fentanyl Act. House roll call 33, 2025-02-06, On Passage, passed
--     312-108 (bipartisan). Permanently schedules fentanyl-related substances in
--     Schedule I. GOP leadership voted yea; Thomas Massie broke with his party to
--     vote nay on civil-liberties / mandatory-minimum grounds. Democratic votes
--     split and are omitted here rather than guessed. (clerk.house.gov/Votes/202533)
--
-- Idempotent: guarded on the H.R. 26 measure sentinel, and every member insert uses
-- ON CONFLICT DO NOTHING against the (rollcall_id, politician_id) unique index.
DO $$
DECLARE
  m_hr26 integer;
  m_hr27 integer;
  rc     integer;
BEGIN
  IF EXISTS (SELECT 1 FROM vr_measures WHERE number = 'H.R. 26' AND congress = 119) THEN
    RETURN;
  END IF;

  -- ── H.R. 26 — Protecting American Energy Production Act ─────────────────────────
  INSERT INTO vr_measures
    (measure_type, congress, chamber, number, title, short_title, summary, status, introduced_at, source_url, source_label, external_ids)
  VALUES
    ('bill', 119, 'house', 'H.R. 26', 'Protecting American Energy Production Act', 'Protecting American Energy Production Act',
     'Bars a federal moratorium on hydraulic fracturing and affirms state primacy over it.',
     'passed_house', '2025-01-03T00:00:00Z', 'https://www.congress.gov/bill/119th-congress/house-bill/26', 'Congress.gov',
     '{"congressGovId":"hr26-119"}')
  RETURNING id INTO m_hr26;

  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
    (m_hr26, 'enviro_energy',     100, true,  'yea_supports', 'Protects and expands domestic oil and gas production by barring a fracking moratorium.'),
    (m_hr26, 'energy_production',  70, false, 'yea_supports', 'Affirms state authority over hydraulic fracturing to keep energy output flowing.');

  INSERT INTO vr_rollcalls
    (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)
  VALUES
    (m_hr26, 'house', 119, 1, 35, '2025-02-07T00:00:00Z', 'On Passage', 'passage', 'passed', 'simple',
     '{"yea":226,"nay":188,"present":0,"notVoting":21}', 'https://clerk.house.gov/Votes/202535', 'U.S. House Clerk')
  RETURNING id INTO rc;

  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'mike_johnson', 'yea', 'with_party'),
    (rc, 'scalise',      'yea', 'with_party'),
    (rc, 'emmer',        'yea', 'with_party'),
    (rc, 'jim_jordan',   'yea', 'with_party'),
    (rc, 'massie',       'yea', 'with_party'),
    (rc, 'jeffries',     'nay', 'with_party'),
    (rc, 'aoc',          'nay', 'with_party'),
    (rc, 'crockett',     'nay', 'with_party'),
    (rc, 'khanna',       'nay', 'with_party'),
    (rc, 'raskin',       'nay', 'with_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- ── H.R. 27 — HALT Fentanyl Act ─────────────────────────────────────────────────
  INSERT INTO vr_measures
    (measure_type, congress, chamber, number, title, short_title, summary, status, introduced_at, source_url, source_label, external_ids)
  VALUES
    ('bill', 119, 'house', 'H.R. 27', 'HALT Fentanyl Act', 'HALT Fentanyl Act',
     'Permanently places fentanyl-related substances in Schedule I of the Controlled Substances Act.',
     'passed_house', '2025-01-03T00:00:00Z', 'https://www.congress.gov/bill/119th-congress/house-bill/27', 'Congress.gov',
     '{"congressGovId":"hr27-119"}')
  RETURNING id INTO m_hr27;

  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
    (m_hr27, 'immig_fentanyl', 100, true,  'yea_supports', 'Toughens federal scheduling of fentanyl-related substances to fight the overdose crisis.'),
    (m_hr27, 'tough_on_crime',  70, false, 'yea_supports', 'A tough-on-crime drug-enforcement measure with permanent Schedule I placement and mandatory penalties.');

  INSERT INTO vr_rollcalls
    (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)
  VALUES
    (m_hr27, 'house', 119, 1, 33, '2025-02-06T00:00:00Z', 'On Passage', 'passage', 'passed', 'simple',
     '{"yea":312,"nay":108,"present":0,"notVoting":15}', 'https://clerk.house.gov/Votes/202533', 'U.S. House Clerk')
  RETURNING id INTO rc;

  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'mike_johnson', 'yea', 'with_party'),
    (rc, 'scalise',      'yea', 'with_party'),
    (rc, 'emmer',        'yea', 'with_party'),
    (rc, 'jim_jordan',   'yea', 'with_party'),
    (rc, 'massie',       'nay', 'against_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
