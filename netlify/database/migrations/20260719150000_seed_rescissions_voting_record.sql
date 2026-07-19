-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — Rescissions Act backfill (data-only, hand-verified)
-- ─────────────────────────────────────────────────────────────────────────────
-- Adds the 2025 Rescissions Act (H.R. 4) and its House passage roll call to the
-- Voting Record, with recorded votes for House leadership, the Judiciary chairman,
-- a within-party fiscal hawk, and Democratic leaders/members. This gives those
-- members another recorded fiscal vote that lines up with their curated stance
-- cards and the Government Spending & Debt Spotlight.
--
-- Changes NO schema. Inserts into vr_measures, vr_measure_issues, vr_rollcalls and
-- vr_member_votes only. Rolls forward from the applied voting-record migrations;
-- never edits them. Politician ids match the app roster slugs.
--
-- Verified facts:
--   H.R. 4  House roll call 168 — 2025-06-12, On Passage, passed 214-212 (near
--            party-line). It codified roughly $9B in DOGE spending cuts to foreign
--            aid and public broadcasting; a Senate-amended version was later signed
--            into law. Republican leadership (mike_johnson, scalise, emmer) and the
--            Judiciary chairman (jim_jordan) voted yea, as did fiscal hawk massie;
--            Democratic leaders/members (jeffries, aoc, crockett, khanna) voted nay.
--            Bill number, roll call, date and tally match the record cited in the
--            curated stance cards. (clerk.house.gov/Votes/2025168)
--
-- Idempotent: guarded on the H.R. 4 roll-call sentinel, and every member insert
-- uses ON CONFLICT DO NOTHING against the (rollcall_id, politician_id) unique index.
DO $$
DECLARE
  m_hr4       integer;
  rc_house168 integer;
BEGIN
  -- Sentinel: if the H.R. 4 House roll call exists, this migration already ran.
  IF EXISTS (
    SELECT 1 FROM vr_rollcalls
    WHERE chamber = 'house' AND congress = 119 AND session = 1 AND roll_number = 168
  ) THEN
    RETURN;
  END IF;

  INSERT INTO vr_measures
    (measure_type, congress, chamber, number, title, short_title, summary, status, introduced_at, source_url, source_label, external_ids)
  VALUES
    ('bill', 119, 'house', 'H.R. 4', 'Rescissions Act of 2025', 'Rescissions Act of 2025',
     'Codifies roughly $9 billion in spending cuts to foreign aid and public broadcasting requested by the administration.',
     'enacted', '2025-06-01T00:00:00Z', 'https://www.congress.gov/bill/119th-congress/house-bill/4', 'Congress.gov',
     '{"congressGovId":"hr4-119"}')
  RETURNING id INTO m_hr4;

  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
    (m_hr4, 'cut_spending', 100, true,  'yea_supports', 'Rescinds previously appropriated funds, cutting federal spending.'),
    (m_hr4, 'gov_waste',     70, false, 'yea_supports', 'Framed by supporters as clawing back wasteful or low-priority spending.'),
    (m_hr4, 'national_debt',  40, false, 'yea_supports', 'Modestly reduces outlays against the federal deficit.');

  INSERT INTO vr_rollcalls
    (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)
  VALUES
    (m_hr4, 'house', 119, 1, 168, '2025-06-12T00:00:00Z', 'On Passage', 'passage', 'passed', 'simple',
     '{"yea":214,"nay":212,"present":0,"notVoting":6}', 'https://clerk.house.gov/Votes/2025168', 'U.S. House Clerk')
  RETURNING id INTO rc_house168;

  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc_house168, 'mike_johnson', 'yea', 'with_party'),
    (rc_house168, 'scalise',      'yea', 'with_party'),
    (rc_house168, 'emmer',        'yea', 'with_party'),
    (rc_house168, 'jim_jordan',   'yea', 'with_party'),
    (rc_house168, 'massie',       'yea', 'with_party'),
    (rc_house168, 'jeffries',     'nay', 'with_party'),
    (rc_house168, 'aoc',          'nay', 'with_party'),
    (rc_house168, 'crockett',     'nay', 'with_party'),
    (rc_house168, 'khanna',       'nay', 'with_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
