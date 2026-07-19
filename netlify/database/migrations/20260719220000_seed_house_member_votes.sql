-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — House member-vote backfill (data-only, hand-verified)
-- ─────────────────────────────────────────────────────────────────────────────
-- The House side of the record had votes for leadership and a handful of members.
-- This migration adds many more roster U.S. House members to two marquee House roll
-- calls already in the record, so their profile Voting Record tabs populate and line
-- up with their curated stance cards — including the DOCUMENTED Republican crossovers
-- on the reconciliation bill.
--
-- Changes NO schema. Inserts into vr_member_votes only, against roll calls seeded by
-- the applied voting-record migrations. Rolls forward; never edits one. Politician
-- ids match the app roster slugs.
--
-- Verified facts (official House Clerk record):
--   H.R. 1  House roll call 190 — 2025-07-03, Motion to Concur, passed 218-214. The
--     ONLY two Republicans to vote nay were Brian Fitzpatrick (PA) and Thomas Massie
--     (KY) — recorded here as against-party; every other roster Republican voted yea
--     and every Democrat voted nay. (clerk.house.gov/Votes/2025190)
--   H.R. 29 (Laken Riley Act) House roll call 6 — 2025-01-07, On Passage, passed
--     264-159. Every Republican voted yea (48 Democrats also crossed over). Recorded
--     here: the roster's Republicans as yea. The 48 Democratic crossovers are not
--     individually attributed here rather than guessed. (clerk.house.gov/Votes/20256)
--
-- Idempotent: guarded on Fitzpatrick's H.R. 1 (roll 190) vote sentinel, and every
-- insert uses ON CONFLICT DO NOTHING against the (rollcall_id, politician_id) index.
DO $$
DECLARE
  rc_190 integer;
  rc_6   integer;
BEGIN
  SELECT id INTO rc_190 FROM vr_rollcalls WHERE chamber = 'house' AND congress = 119 AND session = 1 AND roll_number = 190 LIMIT 1;
  SELECT id INTO rc_6   FROM vr_rollcalls WHERE chamber = 'house' AND congress = 119 AND session = 1 AND roll_number = 6   LIMIT 1;

  IF rc_190 IS NOT NULL AND EXISTS (
    SELECT 1 FROM vr_member_votes WHERE rollcall_id = rc_190 AND politician_id = 'fitzpatrick'
  ) THEN
    RETURN;
  END IF;

  -- ── H.R. 1 — House roll call 190 (218-214) ──────────────────────────────────
  IF rc_190 IS NOT NULL THEN
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
      -- Republicans — yea (party-line)
      (rc_190, 'chip_roy', 'yea', 'with_party'),        (rc_190, 'don_bacon', 'yea', 'with_party'),
      (rc_190, 'kevin_hern', 'yea', 'with_party'),      (rc_190, 'nancy_mace', 'yea', 'with_party'),
      (rc_190, 'dan_crenshaw', 'yea', 'with_party'),    (rc_190, 'mcclain', 'yea', 'with_party'),
      (rc_190, 'luna', 'yea', 'with_party'),            (rc_190, 'mike_lawler', 'yea', 'with_party'),
      (rc_190, 'donalds', 'yea', 'with_party'),         (rc_190, 'stefanik', 'yea', 'with_party'),
      -- Republicans — nay (the only two GOP defectors)
      (rc_190, 'fitzpatrick', 'nay', 'against_party'),  (rc_190, 'massie', 'nay', 'against_party'),
      -- Democrats — nay (party-line; every Democrat opposed)
      (rc_190, 'tom_suozzi', 'nay', 'with_party'),      (rc_190, 'ayanna_pressley', 'nay', 'with_party'),
      (rc_190, 'delia_ramirez', 'nay', 'with_party'),   (rc_190, 'sarah_mcbride', 'nay', 'with_party'),
      (rc_190, 'jake_auchincloss', 'nay', 'with_party'),(rc_190, 'greg_landsman', 'nay', 'with_party'),
      (rc_190, 'raja_krishnamoorthi', 'nay', 'with_party'), (rc_190, 'josh_gottheimer', 'nay', 'with_party'),
      (rc_190, 'seth_moulton', 'nay', 'with_party'),    (rc_190, 'marie_gluesenkamp_perez', 'nay', 'with_party'),
      (rc_190, 'jim_mcgovern', 'nay', 'with_party'),    (rc_190, 'brendan_boyle', 'nay', 'with_party'),
      (rc_190, 'rick_larsen', 'nay', 'with_party'),     (rc_190, 'jan_schakowsky', 'nay', 'with_party'),
      (rc_190, 'diana_degette', 'nay', 'with_party'),   (rc_190, 'debbie_dingell', 'nay', 'with_party'),
      (rc_190, 'steny_hoyer', 'nay', 'with_party'),     (rc_190, 'summer_lee', 'nay', 'with_party'),
      (rc_190, 'maxwell_frost', 'nay', 'with_party'),   (rc_190, 'dan_goldman', 'nay', 'with_party'),
      (rc_190, 'tlaib', 'nay', 'with_party'),           (rc_190, 'nadler', 'nay', 'with_party'),
      (rc_190, 'jared_golden', 'nay', 'with_party'),    (rc_190, 'torres', 'nay', 'with_party'),
      (rc_190, 'omar', 'nay', 'with_party'),            (rc_190, 'clyburn', 'nay', 'with_party'),
      (rc_190, 'jayapal', 'nay', 'with_party')
    ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
  END IF;

  -- ── H.R. 29 (Laken Riley) — House roll call 6 (264-159) ─────────────────────
  IF rc_6 IS NOT NULL THEN
    INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
      (rc_6, 'chip_roy', 'yea', 'with_party'),        (rc_6, 'don_bacon', 'yea', 'with_party'),
      (rc_6, 'kevin_hern', 'yea', 'with_party'),      (rc_6, 'nancy_mace', 'yea', 'with_party'),
      (rc_6, 'dan_crenshaw', 'yea', 'with_party'),    (rc_6, 'mcclain', 'yea', 'with_party'),
      (rc_6, 'luna', 'yea', 'with_party'),            (rc_6, 'mike_lawler', 'yea', 'with_party'),
      (rc_6, 'fitzpatrick', 'yea', 'with_party'),     (rc_6, 'donalds', 'yea', 'with_party'),
      (rc_6, 'stefanik', 'yea', 'with_party')
    ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
  END IF;
END $$;
