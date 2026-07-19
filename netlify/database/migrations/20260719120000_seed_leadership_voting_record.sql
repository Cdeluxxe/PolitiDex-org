-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — leadership backfill (data-only, hand-verified)
-- ─────────────────────────────────────────────────────────────────────────────
-- Adds recorded roll-call votes for the congressional leadership of the 119th
-- Congress to the existing sample seeded by 20260710184027_create_voting_record_tables.
-- This makes the Voting Record tab and the H.R. 1 Spotlight's live voting-record
-- panel light up for the highest-profile members, and connects each vote to the
-- curated "what they say" stance cards for the same members (say-vs-do).
--
-- SCHEMA-ONLY-FREE: this migration changes NO schema. It inserts data into the
-- vr_rollcalls and vr_member_votes tables that already exist. It never edits the
-- applied base migration — it rolls forward, as required.
--
-- Politician ids match the app roster slugs (CMP_DATA / ISSUE_STANCE_DATA keys):
--   Senate:  thune, barrasso, cruz (yea) · schumer (nay)
--   House:   mike_johnson, scalise, emmer (yea) · jeffries, aoc (nay)
--
-- Verified facts:
--   H.R. 1  Senate roll call 372 — 2025-07-01, On Passage, 50-50, passed on the
--            Vice President's tie-breaking vote. Three Republicans (Paul, Collins,
--            Tillis) voted nay; every Democrat voted nay. Leaders here: Thune,
--            Barrasso, Cruz = yea; Schumer = nay.
--            (senate.gov roll_call_votes vote_119_1_00372)
--   H.R. 1  House roll call 190 — 2025-07-03, Motion to Concur, passed 218-214.
--            GOP leadership (Johnson, Scalise, Emmer) = yea; every Democrat,
--            including Jeffries and Ocasio-Cortez, = nay.
--            (clerk.house.gov/Votes/2025190 — already seeded for four members)
--   H.R. 29 House roll call 6 — 2025-01-07, On Passage, passed 264-159. GOP
--            leadership (Johnson, Scalise, Emmer) = yea.
--            (clerk.house.gov/Votes/20256 — already seeded for four members)
--
-- Idempotent: guarded on the Senate H.R. 1 roll call (roll 372) sentinel, and every
-- member insert uses ON CONFLICT DO NOTHING against the (rollcall_id, politician_id)
-- unique index, so re-applying is a no-op. Ids for the existing House roll calls and
-- the H.R. 1 measure are resolved by their natural keys rather than hard-coded serials.
DO $$
DECLARE
  m_hr1        integer;
  rc_house190  integer;
  rc_hr29_6    integer;
  rc_senate372 integer;
BEGIN
  -- Sentinel: if the Senate H.R. 1 roll call already exists, this migration already ran.
  IF EXISTS (
    SELECT 1 FROM vr_rollcalls
    WHERE chamber = 'senate' AND congress = 119 AND session = 1 AND roll_number = 372
  ) THEN
    RETURN;
  END IF;

  -- Resolve the rows seeded by the base voting-record migration.
  SELECT id INTO m_hr1
    FROM vr_measures WHERE number = 'H.R. 1' AND congress = 119 LIMIT 1;
  SELECT id INTO rc_house190
    FROM vr_rollcalls WHERE chamber = 'house' AND congress = 119 AND session = 1 AND roll_number = 190 LIMIT 1;
  SELECT id INTO rc_hr29_6
    FROM vr_rollcalls WHERE chamber = 'house' AND congress = 119 AND session = 1 AND roll_number = 6 LIMIT 1;

  -- If the base seed is absent (should never happen on this branch), do nothing rather
  -- than create partial/oprhaned rows.
  IF m_hr1 IS NULL OR rc_house190 IS NULL OR rc_hr29_6 IS NULL THEN
    RAISE NOTICE 'Base voting-record seed not found; skipping leadership backfill.';
    RETURN;
  END IF;

  -- ── H.R. 1 — Senate passage (new roll call on the existing measure) ─────────────
  INSERT INTO vr_rollcalls
    (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)
  VALUES
    (m_hr1, 'senate', 119, 1, 372, '2025-07-01T00:00:00Z', 'On Passage of the Bill', 'passage', 'passed', 'simple',
     '{"yea":50,"nay":50,"present":0,"notVoting":0}',
     'https://www.senate.gov/legislative/LIS/roll_call_votes/vote1191/vote_119_1_00372.htm', 'U.S. Senate')
  RETURNING id INTO rc_senate372;

  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc_senate372, 'thune',    'yea', 'with_party'),
    (rc_senate372, 'barrasso', 'yea', 'with_party'),
    (rc_senate372, 'cruz',     'yea', 'with_party'),
    (rc_senate372, 'schumer',  'nay', 'with_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- ── H.R. 1 — House concurrence (roll 190) leadership backfill ───────────────────
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc_house190, 'mike_johnson', 'yea', 'with_party'),
    (rc_house190, 'scalise',      'yea', 'with_party'),
    (rc_house190, 'emmer',        'yea', 'with_party'),
    (rc_house190, 'jeffries',     'nay', 'with_party'),
    (rc_house190, 'aoc',          'nay', 'with_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- ── H.R. 29 (Laken Riley Act) — House passage (roll 6) leadership backfill ──────
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc_hr29_6, 'mike_johnson', 'yea', 'with_party'),
    (rc_hr29_6, 'scalise',      'yea', 'with_party'),
    (rc_hr29_6, 'emmer',        'yea', 'with_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;
