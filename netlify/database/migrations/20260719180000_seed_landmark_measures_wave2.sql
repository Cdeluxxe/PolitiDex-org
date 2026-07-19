-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — landmark measures backfill, wave 2 (data-only, hand-verified)
-- ─────────────────────────────────────────────────────────────────────────────
-- Adds two more 119th-Congress House measures to the Voting Record, with issue tags
-- and recorded member votes, so more curated profiles connect to real roll calls.
--
-- Changes NO schema. Inserts into vr_measures, vr_measure_issues, vr_rollcalls and
-- vr_member_votes only. Rolls forward from the applied voting-record migrations;
-- never edits one. Politician ids match the app roster slugs.
--
-- Verified facts (bill numbers, roll calls, dates and tallies match the roll calls
-- already cited in the curated stance cards):
--   H.R. 21 — Born-Alive Abortion Survivors Protection Act. House roll call 27,
--     2025-01-23, On Passage, passed 217-204 (party-line). Requires care for infants
--     born alive during an abortion. GOP leadership voted yea; Democratic leaders and
--     members voted nay. Tagged to pro_life so it lines up with those members' stances.
--     (clerk.house.gov/Votes/202527)
--   H.R. 6703 — Lower Health Care Premiums for All Americans Act. House roll call 349,
--     2025-12-17, On Passage, passed 216-211. Expands association/individual-market
--     health-plan options and adds pharmacy-benefit-manager transparency. GOP
--     leadership voted yea; Thomas Massie broke with his party to vote nay on
--     federal-overreach grounds (matching his stated stance), and Democrats voted nay.
--     (clerk.house.gov/Votes/2025349)
--
-- Idempotent: guarded on the H.R. 21 measure sentinel, and every member insert uses
-- ON CONFLICT DO NOTHING against the (rollcall_id, politician_id) unique index.
DO $$
DECLARE
  m_hr21   integer;
  m_hr6703 integer;
  rc       integer;
BEGIN
  IF EXISTS (SELECT 1 FROM vr_measures WHERE number = 'H.R. 21' AND congress = 119) THEN
    RETURN;
  END IF;

  -- ── H.R. 21 — Born-Alive Abortion Survivors Protection Act ──────────────────────
  INSERT INTO vr_measures
    (measure_type, congress, chamber, number, title, short_title, summary, status, introduced_at, source_url, source_label, external_ids)
  VALUES
    ('bill', 119, 'house', 'H.R. 21', 'Born-Alive Abortion Survivors Protection Act', 'Born-Alive Abortion Survivors Protection Act',
     'Requires health-care practitioners to provide care to any infant born alive during an abortion.',
     'passed_house', '2025-01-03T00:00:00Z', 'https://www.congress.gov/bill/119th-congress/house-bill/21', 'Congress.gov',
     '{"congressGovId":"hr21-119"}')
  RETURNING id INTO m_hr21;

  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
    (m_hr21, 'pro_life', 100, true, 'yea_supports', 'A yea vote advances abortion restrictions / anti-abortion policy.');

  INSERT INTO vr_rollcalls
    (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)
  VALUES
    (m_hr21, 'house', 119, 1, 27, '2025-01-23T00:00:00Z', 'On Passage', 'passage', 'passed', 'simple',
     '{"yea":217,"nay":204,"present":0,"notVoting":14}', 'https://clerk.house.gov/Votes/202527', 'U.S. House Clerk')
  RETURNING id INTO rc;

  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'mike_johnson', 'yea', 'with_party'),
    (rc, 'scalise',      'yea', 'with_party'),
    (rc, 'emmer',        'yea', 'with_party'),
    (rc, 'jim_jordan',   'yea', 'with_party'),
    (rc, 'jeffries',     'nay', 'with_party'),
    (rc, 'aoc',          'nay', 'with_party'),
    (rc, 'crockett',     'nay', 'with_party'),
    (rc, 'khanna',       'nay', 'with_party'),
    (rc, 'raskin',       'nay', 'with_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- ── H.R. 6703 — Lower Health Care Premiums for All Americans Act ────────────────
  INSERT INTO vr_measures
    (measure_type, congress, chamber, number, title, short_title, summary, status, introduced_at, source_url, source_label, external_ids)
  VALUES
    ('bill', 119, 'house', 'H.R. 6703', 'Lower Health Care Premiums for All Americans Act', 'Lower Health Care Premiums Act',
     'Expands association and individual-market health-plan options and adds pharmacy-benefit-manager transparency requirements.',
     'passed_house', '2025-12-01T00:00:00Z', 'https://www.congress.gov/bill/119th-congress/house-bill/6703', 'Congress.gov',
     '{"congressGovId":"hr6703-119"}')
  RETURNING id INTO m_hr6703;

  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
    (m_hr6703, 'healthcare_costs', 100, true, 'yea_supports', 'A yea vote advances the bill''s market-based approach to lowering health-insurance premiums.');

  INSERT INTO vr_rollcalls
    (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)
  VALUES
    (m_hr6703, 'house', 119, 1, 349, '2025-12-17T00:00:00Z', 'On Passage', 'passage', 'passed', 'simple',
     '{"yea":216,"nay":211,"present":0,"notVoting":8}', 'https://clerk.house.gov/Votes/2025349', 'U.S. House Clerk')
  RETURNING id INTO rc;

  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'mike_johnson', 'yea', 'with_party'),
    (rc, 'scalise',      'yea', 'with_party'),
    (rc, 'emmer',        'yea', 'with_party'),
    (rc, 'jim_jordan',   'yea', 'with_party'),
    (rc, 'massie',       'nay', 'against_party'),
    (rc, 'jeffries',     'nay', 'with_party'),
    (rc, 'aoc',          'nay', 'with_party'),
    (rc, 'crockett',     'nay', 'with_party'),
    (rc, 'khanna',       'nay', 'with_party'),
    (rc, 'raskin',       'nay', 'with_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
