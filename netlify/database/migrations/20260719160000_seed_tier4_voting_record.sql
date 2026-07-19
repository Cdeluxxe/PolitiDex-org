-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — tier-4 backfill (data-only, hand-verified)
-- ─────────────────────────────────────────────────────────────────────────────
-- Adds recorded votes for more frequently-covered members to the measures already
-- in the Voting Record, so their profile Voting Record tabs and the H.R. 1 Spotlight
-- panel populate and line up with their curated stance cards. Party-line and known
-- cross-party positions only; no new measures.
--
-- Changes NO schema. Inserts into vr_member_votes only, against roll calls seeded by
-- the earlier voting-record migrations. Rolls forward; never edits an applied one.
-- Politician ids match the app roster slugs.
--
-- Verified facts:
--   H.R. 1  Senate roll call 372 — 2025-07-01, 50-50, passed on the VP tie-break.
--     Every Democrat opposed → wyden, klobuchar, booker (nay). Three Republicans
--     broke and voted nay — Rand Paul (already recorded), Susan Collins and Thom
--     Tillis (collins, tillis: nay, against party). Lisa Murkowski voted yea after
--     securing Alaska-specific changes (murkowski: yea). (senate.gov vote_119_1_00372)
--   H.R. 1  House roll call 190 — 2025-07-03, passed 218-214, every Democrat opposed
--     → raskin (nay). (clerk.house.gov/Votes/2025190)
--   H.R. 4  (Rescissions Act) House roll call 168 — 2025-06-12, passed 214-212 along
--     party lines → raskin (nay). (clerk.house.gov/Votes/2025168)
--   H.R. 22 (SAVE Act) House roll call 102 — 2025-04-10, passed 220-208 along party
--     lines → raskin (nay). (clerk.house.gov/Votes/2025102)
--
-- Idempotent: guarded on Raskin's H.R. 1 House vote sentinel, and every insert uses
-- ON CONFLICT DO NOTHING against the (rollcall_id, politician_id) unique index.
DO $$
DECLARE
  rc_senate372 integer;
  rc_house190  integer;
  rc_house168  integer;
  rc_house102  integer;
BEGIN
  SELECT id INTO rc_house190
    FROM vr_rollcalls WHERE chamber='house' AND congress=119 AND session=1 AND roll_number=190 LIMIT 1;

  -- Sentinel: if Raskin's H.R. 1 House vote already exists, this migration ran.
  IF rc_house190 IS NOT NULL AND EXISTS (
    SELECT 1 FROM vr_member_votes WHERE rollcall_id = rc_house190 AND politician_id = 'raskin'
  ) THEN
    RETURN;
  END IF;

  SELECT id INTO rc_senate372
    FROM vr_rollcalls WHERE chamber='senate' AND congress=119 AND session=1 AND roll_number=372 LIMIT 1;
  SELECT id INTO rc_house168
    FROM vr_rollcalls WHERE chamber='house' AND congress=119 AND session=1 AND roll_number=168 LIMIT 1;
  SELECT id INTO rc_house102
    FROM vr_rollcalls WHERE chamber='house' AND congress=119 AND session=1 AND roll_number=102 LIMIT 1;

  -- ── H.R. 1 — Senate passage (roll 372) additional members ───────────────────────
  IF rc_senate372 IS NOT NULL THEN
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
      (rc_senate372, 'wyden',     'nay', 'with_party'),
      (rc_senate372, 'klobuchar', 'nay', 'with_party'),
      (rc_senate372, 'booker',    'nay', 'with_party'),
      (rc_senate372, 'collins',   'nay', 'against_party'),
      (rc_senate372, 'tillis',    'nay', 'against_party'),
      (rc_senate372, 'murkowski', 'yea', 'with_party')
    ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
  END IF;

  -- ── H.R. 1 — House concurrence (roll 190): Raskin ───────────────────────────────
  IF rc_house190 IS NOT NULL THEN
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
      (rc_house190, 'raskin', 'nay', 'with_party')
    ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
  END IF;

  -- ── H.R. 4 — Rescissions Act (roll 168): Raskin ─────────────────────────────────
  IF rc_house168 IS NOT NULL THEN
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
      (rc_house168, 'raskin', 'nay', 'with_party')
    ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
  END IF;

  -- ── H.R. 22 — SAVE Act (roll 102): Raskin ───────────────────────────────────────
  IF rc_house102 IS NOT NULL THEN
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
      (rc_house102, 'raskin', 'nay', 'with_party')
    ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
  END IF;
END $$;
