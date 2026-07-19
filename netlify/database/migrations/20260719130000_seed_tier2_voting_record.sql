-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — tier-2 backfill (data-only, hand-verified)
-- ─────────────────────────────────────────────────────────────────────────────
-- Extends the leadership backfill (20260719120000_seed_leadership_voting_record)
-- with recorded votes for the next tier of frequently-covered members, so their
-- profile Voting Record tabs and the H.R. 1 Spotlight's live panel populate, and
-- each recorded vote can be measured against that member's curated stance cards.
--
-- Changes NO schema. Inserts into vr_rollcalls and vr_member_votes only. Rolls
-- forward from the two applied voting-record migrations; never edits them.
--
-- Politician ids match the app roster slugs (CMP_DATA / ISSUE_STANCE_DATA keys).
--
-- Verified facts:
--   H.R. 1  Senate roll call 372 — 2025-07-01, On Passage, 50-50, passed on the
--            Vice President's tie-breaking vote. Three Republicans (Paul, Collins,
--            Tillis) voted nay; every Democrat voted nay.
--            Added here: rand_paul (nay, against party), lee/grassley/hawley/graham
--            (yea), durbin (nay). (senate.gov vote_119_1_00372)
--   H.R. 1  House roll call 190 — 2025-07-03, Motion to Concur, passed 218-214.
--            Added here: jim_jordan, jason_smith (yea); kclark (nay).
--            (clerk.house.gov/Votes/2025190)
--   H.R. 29 House roll call 6 — 2025-01-07, On Passage, passed 264-159.
--            Added here: jim_jordan (yea). (clerk.house.gov/Votes/20256)
--   H.R. 29 Senate roll call 7 — 2025-01-20, On Passage as amended, passed 64-35.
--            Every Republican voted yea; twelve Democrats joined. Added here as a
--            NEW Senate roll call on the existing Laken Riley measure, with the
--            Republican members already curated in the roster: grassley, rand_paul,
--            graham, hawley, cruz, lee (yea). (senate.gov vote_119_1_00007)
--
-- Idempotent: guarded on the Senate H.R. 29 roll call (roll 7) sentinel, and every
-- member insert uses ON CONFLICT DO NOTHING against the (rollcall_id, politician_id)
-- unique index, so re-applying is a no-op. Existing rows are resolved by natural key.
DO $$
DECLARE
  m_hr29        integer;
  rc_senate372  integer;
  rc_house190   integer;
  rc_hr29_6     integer;
  rc_senate7    integer;
BEGIN
  -- Sentinel: if the Senate Laken Riley roll call already exists, this migration ran.
  IF EXISTS (
    SELECT 1 FROM vr_rollcalls
    WHERE chamber = 'senate' AND congress = 119 AND session = 1 AND roll_number = 7
  ) THEN
    RETURN;
  END IF;

  -- Resolve rows seeded/added by the prior voting-record migrations.
  SELECT id INTO m_hr29
    FROM vr_measures WHERE number = 'H.R. 29' AND congress = 119 LIMIT 1;
  SELECT id INTO rc_senate372
    FROM vr_rollcalls WHERE chamber = 'senate' AND congress = 119 AND session = 1 AND roll_number = 372 LIMIT 1;
  SELECT id INTO rc_house190
    FROM vr_rollcalls WHERE chamber = 'house' AND congress = 119 AND session = 1 AND roll_number = 190 LIMIT 1;
  SELECT id INTO rc_hr29_6
    FROM vr_rollcalls WHERE chamber = 'house' AND congress = 119 AND session = 1 AND roll_number = 6 LIMIT 1;

  IF m_hr29 IS NULL OR rc_senate372 IS NULL OR rc_house190 IS NULL OR rc_hr29_6 IS NULL THEN
    RAISE NOTICE 'Expected base/leadership voting-record rows not found; skipping tier-2 backfill.';
    RETURN;
  END IF;

  -- ── H.R. 1 — Senate passage (roll 372) additional members ───────────────────────
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc_senate372, 'rand_paul', 'nay', 'against_party'),
    (rc_senate372, 'lee',       'yea', 'with_party'),
    (rc_senate372, 'grassley',  'yea', 'with_party'),
    (rc_senate372, 'hawley',    'yea', 'with_party'),
    (rc_senate372, 'graham',    'yea', 'with_party'),
    (rc_senate372, 'durbin',    'nay', 'with_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- ── H.R. 1 — House concurrence (roll 190) additional members ────────────────────
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc_house190, 'jim_jordan',  'yea', 'with_party'),
    (rc_house190, 'jason_smith', 'yea', 'with_party'),
    (rc_house190, 'kclark',      'nay', 'with_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- ── H.R. 29 (Laken Riley Act) — House passage (roll 6) additional members ───────
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc_hr29_6, 'jim_jordan', 'yea', 'with_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- ── H.R. 29 (Laken Riley Act) — Senate passage (new roll call on the measure) ───
  INSERT INTO vr_rollcalls
    (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)
  VALUES
    (m_hr29, 'senate', 119, 1, 7, '2025-01-20T00:00:00Z', 'On Passage of the Bill, as Amended', 'passage', 'passed', 'simple',
     '{"yea":64,"nay":35,"present":0,"notVoting":1}',
     'https://www.senate.gov/legislative/LIS/roll_call_votes/vote1191/vote_119_1_00007.htm', 'U.S. Senate')
  RETURNING id INTO rc_senate7;

  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc_senate7, 'grassley',  'yea', 'with_party'),
    (rc_senate7, 'rand_paul', 'yea', 'with_party'),
    (rc_senate7, 'graham',    'yea', 'with_party'),
    (rc_senate7, 'hawley',    'yea', 'with_party'),
    (rc_senate7, 'cruz',      'yea', 'with_party'),
    (rc_senate7, 'lee',       'yea', 'with_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
