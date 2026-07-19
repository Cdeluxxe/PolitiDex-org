-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — tier-3 backfill (data-only, hand-verified)
-- ─────────────────────────────────────────────────────────────────────────────
-- Extends the two prior voting-record backfills with the current senators added in
-- this wave (Sanders, Warren) and a new House measure (the SAVE Act) so more of the
-- frequently-covered members have recorded votes that line up with their curated
-- stance cards and the Issue Spotlights.
--
-- Changes NO schema. Inserts into vr_measures, vr_measure_issues, vr_rollcalls and
-- vr_member_votes only. Rolls forward from the applied voting-record migrations;
-- never edits them. Politician ids match the app roster slugs.
--
-- Verified facts:
--   H.R. 1  Senate roll call 372 — 2025-07-01, 50-50, passed on the VP tie-break.
--            Every Democrat opposed. Added here: sanders, warren (nay).
--            (senate.gov vote_119_1_00372)
--   H.R. 29 Senate roll call 7 — 2025-01-20, 64-35. Added here: sanders, warren
--            (nay); both opposed the detention mandate. (senate.gov vote_119_1_00007)
--   H.R. 22 (SAVE Act) House roll call 102 — 2025-04-10, On Passage, passed 220-208,
--            largely along party lines. Added here as a NEW measure with the House
--            leadership (mike_johnson, scalise, emmer) and Judiciary chair (jim_jordan)
--            in favor, and Democratic leaders/members (jeffries, aoc, crockett, khanna)
--            opposed. Bill number, roll call, date and tally match the roll call cited
--            in the curated stance cards. (clerk.house.gov/Votes/2025102)
--
-- Idempotent: guarded on the SAVE Act (roll 102) sentinel, and every member insert
-- uses ON CONFLICT DO NOTHING against the (rollcall_id, politician_id) unique index.
DO $$
DECLARE
  rc_senate372 integer;
  rc_senate7   integer;
  m_hr22       integer;
  rc_house102  integer;
BEGIN
  -- Sentinel: if the SAVE Act House roll call exists, this migration already ran.
  IF EXISTS (
    SELECT 1 FROM vr_rollcalls
    WHERE chamber = 'house' AND congress = 119 AND session = 1 AND roll_number = 102
  ) THEN
    RETURN;
  END IF;

  SELECT id INTO rc_senate372
    FROM vr_rollcalls WHERE chamber = 'senate' AND congress = 119 AND session = 1 AND roll_number = 372 LIMIT 1;
  SELECT id INTO rc_senate7
    FROM vr_rollcalls WHERE chamber = 'senate' AND congress = 119 AND session = 1 AND roll_number = 7 LIMIT 1;

  -- ── H.R. 1 — Senate passage (roll 372): add Sanders & Warren ────────────────────
  IF rc_senate372 IS NOT NULL THEN
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
      (rc_senate372, 'sanders', 'nay', 'with_party'),
      (rc_senate372, 'warren',  'nay', 'with_party')
    ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
  END IF;

  -- ── H.R. 29 (Laken Riley) — Senate passage (roll 7): add Sanders & Warren ───────
  IF rc_senate7 IS NOT NULL THEN
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
      (rc_senate7, 'sanders', 'nay', 'with_party'),
      (rc_senate7, 'warren',  'nay', 'with_party')
    ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
  END IF;

  -- ── H.R. 22 — SAVE Act (new measure + House passage roll call) ──────────────────
  INSERT INTO vr_measures
    (measure_type, congress, chamber, number, title, short_title, summary, status, introduced_at, source_url, source_label, external_ids)
  VALUES
    ('bill', 119, 'house', 'H.R. 22', 'Safeguard American Voter Eligibility (SAVE) Act', 'SAVE Act',
     'Would require documentary proof of U.S. citizenship to register to vote in federal elections.',
     'passed_house', '2025-01-03T00:00:00Z', 'https://www.congress.gov/bill/119th-congress/house-bill/22', 'Congress.gov',
     '{"congressGovId":"hr22-119"}')
  RETURNING id INTO m_hr22;

  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
    (m_hr22, 'voter_id',          100, true,  'yea_supports', 'Requires documentary proof of citizenship to register for federal elections.'),
    (m_hr22, 'election_integrity', 70, false, 'yea_supports', 'Framed by supporters as a citizenship-verification safeguard for federal elections.');

  INSERT INTO vr_rollcalls
    (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)
  VALUES
    (m_hr22, 'house', 119, 1, 102, '2025-04-10T00:00:00Z', 'On Passage', 'passage', 'passed', 'simple',
     '{"yea":220,"nay":208,"present":0,"notVoting":4}', 'https://clerk.house.gov/Votes/2025102', 'U.S. House Clerk')
  RETURNING id INTO rc_house102;

  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc_house102, 'mike_johnson', 'yea', 'with_party'),
    (rc_house102, 'scalise',      'yea', 'with_party'),
    (rc_house102, 'emmer',        'yea', 'with_party'),
    (rc_house102, 'jim_jordan',   'yea', 'with_party'),
    (rc_house102, 'jeffries',     'nay', 'with_party'),
    (rc_house102, 'aoc',          'nay', 'with_party'),
    (rc_house102, 'crockett',     'nay', 'with_party'),
    (rc_house102, 'khanna',       'nay', 'with_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
