-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — landmark measures backfill, wave 3 (data-only, hand-verified)
-- ─────────────────────────────────────────────────────────────────────────────
-- Adds two more 119th-Congress House measures — one sharply party-line, one broadly
-- bipartisan — with issue tags and recorded member votes, so more curated profiles
-- connect to real roll calls and the record shows both kinds of vote.
--
-- Changes NO schema. Inserts into vr_measures, vr_measure_issues, vr_rollcalls and
-- vr_member_votes only. Rolls forward from the applied voting-record migrations;
-- never edits one. Politician ids match the app roster slugs.
--
-- Verified facts (bill numbers, roll calls, dates and tallies match the roll calls
-- already cited in the curated stance cards):
--   H.R. 28 — Protection of Women and Girls in Sports Act. House roll call 12,
--     2025-01-14, On Passage, passed 218-206 (party-line). Amends Title IX so
--     eligibility for female school/college sports is based on sex at birth. GOP
--     leadership voted yea; Democratic leaders and members voted nay.
--     (clerk.house.gov/Votes/202512)
--   H.R. 2483 — SUPPORT for Patients and Communities Reauthorization Act. House roll
--     call 151, 2025-06-04, On Passage, passed 366-57 (bipartisan). Reauthorizes
--     federal opioid and substance-use-disorder treatment and prevention programs.
--     Recorded here as yea for the leadership and Democratic members who backed it;
--     the 57 nays (fiscal-hawk conservatives) are not individually attributed.
--     (clerk.house.gov/Votes/2025151)
--
-- Idempotent: guarded on the H.R. 28 measure sentinel, and every member insert uses
-- ON CONFLICT DO NOTHING against the (rollcall_id, politician_id) unique index.
DO $$
DECLARE
  m_hr28   integer;
  m_hr2483 integer;
  rc       integer;
BEGIN
  IF EXISTS (SELECT 1 FROM vr_measures WHERE number = 'H.R. 28' AND congress = 119) THEN
    RETURN;
  END IF;

  -- ── H.R. 28 — Protection of Women and Girls in Sports Act ───────────────────────
  INSERT INTO vr_measures
    (measure_type, congress, chamber, number, title, short_title, summary, status, introduced_at, source_url, source_label, external_ids)
  VALUES
    ('bill', 119, 'house', 'H.R. 28', 'Protection of Women and Girls in Sports Act', 'Protection of Women and Girls in Sports Act',
     'Amends Title IX so that eligibility for school and college athletic programs designated for women or girls is based on sex at birth.',
     'passed_house', '2025-01-03T00:00:00Z', 'https://www.congress.gov/bill/119th-congress/house-bill/28', 'Congress.gov',
     '{"congressGovId":"hr28-119"}')
  RETURNING id INTO m_hr28;

  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
    (m_hr28, 'lgbtq_rights', 100, true,  'yea_opposes',  'A yea vote restricts transgender athletes'' participation, cutting against expansive LGBTQ-rights policy.'),
    (m_hr28, 'edu_parental',  60, false, 'yea_supports', 'A yea vote aligns with the sex-at-birth Title IX definition favored on parental-rights grounds.');

  INSERT INTO vr_rollcalls
    (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)
  VALUES
    (m_hr28, 'house', 119, 1, 12, '2025-01-14T00:00:00Z', 'On Passage', 'passage', 'passed', 'simple',
     '{"yea":218,"nay":206,"present":0,"notVoting":11}', 'https://clerk.house.gov/Votes/202512', 'U.S. House Clerk')
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

  -- ── H.R. 2483 — SUPPORT for Patients and Communities Reauthorization Act ────────
  INSERT INTO vr_measures
    (measure_type, congress, chamber, number, title, short_title, summary, status, introduced_at, source_url, source_label, external_ids)
  VALUES
    ('bill', 119, 'house', 'H.R. 2483', 'SUPPORT for Patients and Communities Reauthorization Act', 'SUPPORT Act Reauthorization',
     'Reauthorizes federal opioid and substance-use-disorder treatment, recovery and prevention programs.',
     'passed_house', '2025-03-27T00:00:00Z', 'https://www.congress.gov/bill/119th-congress/house-bill/2483', 'Congress.gov',
     '{"congressGovId":"hr2483-119"}')
  RETURNING id INTO m_hr2483;

  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
    (m_hr2483, 'health_mental',   100, true,  'yea_supports', 'Reauthorizes addiction and behavioral-health treatment and prevention funding.'),
    (m_hr2483, 'immig_fentanyl',   60, false, 'yea_supports', 'Sustains programs aimed at the opioid and fentanyl overdose crisis.');

  INSERT INTO vr_rollcalls
    (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)
  VALUES
    (m_hr2483, 'house', 119, 1, 151, '2025-06-04T00:00:00Z', 'On Passage', 'passage', 'passed', 'simple',
     '{"yea":366,"nay":57,"present":0,"notVoting":12}', 'https://clerk.house.gov/Votes/2025151', 'U.S. House Clerk')
  RETURNING id INTO rc;

  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'mike_johnson', 'yea', 'with_party'),
    (rc, 'scalise',      'yea', 'with_party'),
    (rc, 'emmer',        'yea', 'with_party'),
    (rc, 'jim_jordan',   'yea', 'with_party'),
    (rc, 'jeffries',     'yea', 'with_party'),
    (rc, 'aoc',          'yea', 'with_party'),
    (rc, 'crockett',     'yea', 'with_party'),
    (rc, 'khanna',       'yea', 'with_party'),
    (rc, 'raskin',       'yea', 'with_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
