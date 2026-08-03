-- ═══════════════════════════════════════════════════════════════════════════
-- Support for Israel — member votes unlocked by the roster expansion
-- ═══════════════════════════════════════════════════════════════════════════
--
-- 20260812000000_vr_israel_support_rollcalls.sql created these 16 roll calls and
-- wrote the 415 member votes a 63-slug roster could attribute. db/vr-roster-admitted.json
-- has since admitted 37 more members, every one of whom already held a stated
-- israel_support position and therefore could never be scored on the issue no matter
-- how many roll calls were ingested. Re-attributing the same 16 rolls against the
-- widened roster yields 713 votes.
--
-- Additive and idempotent: member votes only, ON CONFLICT (rollcall_id, politician_id)
-- DO NOTHING, so the votes the earlier migration already wrote conflict away and only
-- the newly attributable ones land. No measure, roll call or issue row is touched.
--
-- Source of truth: db/vr-israel-vote-seed.json, rebuilt by
-- scripts/vr-build-israel-vote-seed.mjs, which re-verified every question and tally
-- against the House Clerk and Senate roll-call XML on the way through.
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE rc bigint;
BEGIN

  -- house 117/1 roll 275 — H.R. 5323: On Motion to Suspend the Rules and Pass
  --   420-9, 50 roster attribution(s) · U.S. House Clerk
  SELECT id INTO rc FROM vr_rollcalls
   WHERE chamber = 'house' AND congress = 117 AND session = 1
     AND roll_number = 275;
  IF rc IS NULL THEN
    RAISE EXCEPTION 'Israel roster expansion: house 117/1 roll 275 is missing — 20260812000000_vr_israel_support_rollcalls.sql must run first; this migration never creates a roll call because it holds none of the verified question, tally or source';
  END IF;
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'adam_smith', 'yea', 'with_party'),
    (rc, 'andy_kim', 'yea', 'with_party'),
    (rc, 'aoc', 'present', NULL),
    (rc, 'bennie_thompson', 'yea', 'with_party'),
    (rc, 'boebert', 'yea', 'with_party'),
    (rc, 'brian_mast', 'yea', 'with_party'),
    (rc, 'bruce_westerman', 'yea', 'with_party'),
    (rc, 'cstewart', 'yea', 'with_party'),
    (rc, 'curtis', 'yea', 'with_party'),
    (rc, 'don_bacon', 'yea', 'with_party'),
    (rc, 'emmer', 'yea', 'with_party'),
    (rc, 'frank_lucas', 'yea', 'with_party'),
    (rc, 'french_hill', 'yea', 'with_party'),
    (rc, 'gaetz', 'yea', 'with_party'),
    (rc, 'gallego', 'yea', 'with_party'),
    (rc, 'haley_stevens', 'yea', 'with_party'),
    (rc, 'jake_auchincloss', 'yea', 'with_party'),
    (rc, 'jason_smith', 'yea', 'with_party'),
    (rc, 'jayapal', 'yea', 'with_party'),
    (rc, 'jeffries', 'yea', 'with_party'),
    (rc, 'jim_jordan', 'yea', 'with_party'),
    (rc, 'josh_gottheimer', 'yea', 'with_party'),
    (rc, 'kclark', 'yea', 'with_party'),
    (rc, 'khanna', 'yea', 'with_party'),
    (rc, 'mariannette_miller_meeks', 'yea', 'with_party'),
    (rc, 'massie', 'nay', 'against_party'),
    (rc, 'maxine_waters', 'yea', 'with_party'),
    (rc, 'meeks', 'yea', 'with_party'),
    (rc, 'michael_guest', 'yea', 'with_party'),
    (rc, 'mike_johnson', 'yea', 'with_party'),
    (rc, 'mike_simpson', 'yea', 'with_party'),
    (rc, 'mike_waltz', 'yea', 'with_party'),
    (rc, 'mtg', 'yea', 'with_party'),
    (rc, 'omar', 'nay', 'against_party'),
    (rc, 'owens', 'yea', 'with_party'),
    (rc, 'rick_crawford', 'yea', 'with_party'),
    (rc, 'scalise', 'yea', 'with_party'),
    (rc, 'schiff', 'yea', 'with_party'),
    (rc, 'scott_perry', 'yea', 'with_party'),
    (rc, 'slotkin', 'yea', 'with_party'),
    (rc, 'stefanik', 'yea', 'with_party'),
    (rc, 'steny_hoyer', 'yea', 'with_party'),
    (rc, 'stephanie_bice', 'yea', 'with_party'),
    (rc, 'steve_womack', 'yea', 'with_party'),
    (rc, 'tlaib', 'nay', 'against_party'),
    (rc, 'tom_cole', 'yea', 'with_party'),
    (rc, 'tom_suozzi', 'yea', 'with_party'),
    (rc, 'torres', 'yea', 'with_party'),
    (rc, 'trent_kelly', 'yea', 'with_party'),
    (rc, 'zeldin', 'yea', 'with_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- house 118/1 roll 491 — H.Amdt. 478: On Agreeing to the Amendment
  --   360-67, 57 roster attribution(s) · U.S. House Clerk
  SELECT id INTO rc FROM vr_rollcalls
   WHERE chamber = 'house' AND congress = 118 AND session = 1
     AND roll_number = 491;
  IF rc IS NULL THEN
    RAISE EXCEPTION 'Israel roster expansion: house 118/1 roll 491 is missing — 20260812000000_vr_israel_support_rollcalls.sql must run first; this migration never creates a roll call because it holds none of the verified question, tally or source';
  END IF;
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'adam_smith', 'nay', 'against_party'),
    (rc, 'andy_kim', 'yea', 'with_party'),
    (rc, 'aoc', 'nay', 'against_party'),
    (rc, 'bennie_thompson', 'yea', 'with_party'),
    (rc, 'boebert', 'yea', 'with_party'),
    (rc, 'brian_mast', 'yea', 'with_party'),
    (rc, 'bruce_westerman', 'yea', 'with_party'),
    (rc, 'crockett', 'yea', 'with_party'),
    (rc, 'curtis', 'yea', 'with_party'),
    (rc, 'dan_goldman', 'yea', 'with_party'),
    (rc, 'don_bacon', 'yea', 'with_party'),
    (rc, 'don_davis', 'yea', 'with_party'),
    (rc, 'emmer', 'yea', 'with_party'),
    (rc, 'frank_lucas', 'yea', 'with_party'),
    (rc, 'french_hill', 'yea', 'with_party'),
    (rc, 'gaetz', 'yea', 'with_party'),
    (rc, 'gallego', 'yea', 'with_party'),
    (rc, 'greg_landsman', 'yea', 'with_party'),
    (rc, 'haley_stevens', 'yea', 'with_party'),
    (rc, 'jake_auchincloss', 'yea', 'with_party'),
    (rc, 'jason_smith', 'yea', 'with_party'),
    (rc, 'jayapal', 'nay', 'against_party'),
    (rc, 'jeffries', 'yea', 'with_party'),
    (rc, 'jim_jordan', 'yea', 'with_party'),
    (rc, 'josh_brecheen', 'yea', 'with_party'),
    (rc, 'josh_gottheimer', 'yea', 'with_party'),
    (rc, 'kclark', 'nay', 'against_party'),
    (rc, 'khanna', 'nay', 'against_party'),
    (rc, 'mariannette_miller_meeks', 'yea', 'with_party'),
    (rc, 'massie', 'yea', 'with_party'),
    (rc, 'maxine_waters', 'nay', 'against_party'),
    (rc, 'meeks', 'nay', 'against_party'),
    (rc, 'michael_guest', 'yea', 'with_party'),
    (rc, 'mike_collins', 'yea', 'with_party'),
    (rc, 'mike_ezell', 'yea', 'with_party'),
    (rc, 'mike_flood', 'yea', 'with_party'),
    (rc, 'mike_johnson', 'yea', 'with_party'),
    (rc, 'mike_lawler', 'yea', 'with_party'),
    (rc, 'mike_simpson', 'yea', 'with_party'),
    (rc, 'mike_waltz', 'yea', 'with_party'),
    (rc, 'mtg', 'yea', 'with_party'),
    (rc, 'omar', 'nay', 'against_party'),
    (rc, 'owens', 'yea', 'with_party'),
    (rc, 'rick_crawford', 'yea', 'with_party'),
    (rc, 'scalise', 'yea', 'with_party'),
    (rc, 'schiff', 'yea', 'with_party'),
    (rc, 'scott_perry', 'yea', 'with_party'),
    (rc, 'slotkin', 'yea', 'with_party'),
    (rc, 'stefanik', 'yea', 'with_party'),
    (rc, 'steny_hoyer', 'yea', 'with_party'),
    (rc, 'stephanie_bice', 'yea', 'with_party'),
    (rc, 'steve_womack', 'yea', 'with_party'),
    (rc, 'summer_lee', 'nay', 'against_party'),
    (rc, 'tlaib', 'nay', 'against_party'),
    (rc, 'tom_cole', 'yea', 'with_party'),
    (rc, 'torres', 'yea', 'with_party'),
    (rc, 'trent_kelly', 'yea', 'with_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- house 118/1 roll 577 — H.R. 6126: On Passage
  --   226-196, 57 roster attribution(s) · U.S. House Clerk
  SELECT id INTO rc FROM vr_rollcalls
   WHERE chamber = 'house' AND congress = 118 AND session = 1
     AND roll_number = 577;
  IF rc IS NULL THEN
    RAISE EXCEPTION 'Israel roster expansion: house 118/1 roll 577 is missing — 20260812000000_vr_israel_support_rollcalls.sql must run first; this migration never creates a roll call because it holds none of the verified question, tally or source';
  END IF;
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'adam_smith', 'nay', 'with_party'),
    (rc, 'andy_kim', 'nay', 'with_party'),
    (rc, 'aoc', 'nay', 'with_party'),
    (rc, 'bennie_thompson', 'nay', 'with_party'),
    (rc, 'boebert', 'yea', 'with_party'),
    (rc, 'brian_mast', 'yea', 'with_party'),
    (rc, 'bruce_westerman', 'yea', 'with_party'),
    (rc, 'crockett', 'nay', 'with_party'),
    (rc, 'curtis', 'yea', 'with_party'),
    (rc, 'dan_goldman', 'nay', 'with_party'),
    (rc, 'don_bacon', 'yea', 'with_party'),
    (rc, 'don_davis', 'yea', 'against_party'),
    (rc, 'emmer', 'yea', 'with_party'),
    (rc, 'frank_lucas', 'yea', 'with_party'),
    (rc, 'french_hill', 'yea', 'with_party'),
    (rc, 'gaetz', 'yea', 'with_party'),
    (rc, 'gallego', 'nay', 'with_party'),
    (rc, 'greg_landsman', 'yea', 'against_party'),
    (rc, 'haley_stevens', 'yea', 'against_party'),
    (rc, 'jake_auchincloss', 'nay', 'with_party'),
    (rc, 'jason_smith', 'yea', 'with_party'),
    (rc, 'jayapal', 'nay', 'with_party'),
    (rc, 'jeffries', 'nay', 'with_party'),
    (rc, 'jim_jordan', 'yea', 'with_party'),
    (rc, 'josh_brecheen', 'yea', 'with_party'),
    (rc, 'josh_gottheimer', 'yea', 'against_party'),
    (rc, 'kclark', 'nay', 'with_party'),
    (rc, 'khanna', 'nay', 'with_party'),
    (rc, 'mariannette_miller_meeks', 'yea', 'with_party'),
    (rc, 'massie', 'nay', 'against_party'),
    (rc, 'maxine_waters', 'nay', 'with_party'),
    (rc, 'meeks', 'nay', 'with_party'),
    (rc, 'michael_guest', 'yea', 'with_party'),
    (rc, 'mike_collins', 'yea', 'with_party'),
    (rc, 'mike_ezell', 'yea', 'with_party'),
    (rc, 'mike_flood', 'yea', 'with_party'),
    (rc, 'mike_johnson', 'yea', 'with_party'),
    (rc, 'mike_lawler', 'yea', 'with_party'),
    (rc, 'mike_simpson', 'yea', 'with_party'),
    (rc, 'mike_waltz', 'yea', 'with_party'),
    (rc, 'mtg', 'nay', 'against_party'),
    (rc, 'omar', 'nay', 'with_party'),
    (rc, 'owens', 'yea', 'with_party'),
    (rc, 'rick_crawford', 'yea', 'with_party'),
    (rc, 'scalise', 'yea', 'with_party'),
    (rc, 'schiff', 'nay', 'with_party'),
    (rc, 'scott_perry', 'yea', 'with_party'),
    (rc, 'slotkin', 'nay', 'with_party'),
    (rc, 'stefanik', 'yea', 'with_party'),
    (rc, 'steny_hoyer', 'nay', 'with_party'),
    (rc, 'stephanie_bice', 'yea', 'with_party'),
    (rc, 'steve_womack', 'yea', 'with_party'),
    (rc, 'summer_lee', 'nay', 'with_party'),
    (rc, 'tlaib', 'nay', 'with_party'),
    (rc, 'tom_cole', 'yea', 'with_party'),
    (rc, 'torres', 'nay', 'with_party'),
    (rc, 'trent_kelly', 'yea', 'with_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- house 118/2 roll 38 — H.R. 7217: On Motion to Suspend the Rules and Pass
  --   250-180, 57 roster attribution(s) · U.S. House Clerk
  SELECT id INTO rc FROM vr_rollcalls
   WHERE chamber = 'house' AND congress = 118 AND session = 2
     AND roll_number = 38;
  IF rc IS NULL THEN
    RAISE EXCEPTION 'Israel roster expansion: house 118/2 roll 38 is missing — 20260812000000_vr_israel_support_rollcalls.sql must run first; this migration never creates a roll call because it holds none of the verified question, tally or source';
  END IF;
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'adam_smith', 'nay', 'with_party'),
    (rc, 'andy_kim', 'nay', 'with_party'),
    (rc, 'aoc', 'nay', 'with_party'),
    (rc, 'bennie_thompson', 'nay', 'with_party'),
    (rc, 'boebert', 'nay', 'against_party'),
    (rc, 'brian_mast', 'yea', 'with_party'),
    (rc, 'bruce_westerman', 'yea', 'with_party'),
    (rc, 'crockett', 'nay', 'with_party'),
    (rc, 'curtis', 'yea', 'with_party'),
    (rc, 'dan_goldman', 'yea', 'against_party'),
    (rc, 'don_bacon', 'yea', 'with_party'),
    (rc, 'don_davis', 'yea', 'against_party'),
    (rc, 'emmer', 'yea', 'with_party'),
    (rc, 'frank_lucas', 'yea', 'with_party'),
    (rc, 'french_hill', 'yea', 'with_party'),
    (rc, 'gaetz', 'nay', 'against_party'),
    (rc, 'gallego', 'yea', 'against_party'),
    (rc, 'greg_landsman', 'yea', 'against_party'),
    (rc, 'haley_stevens', 'yea', 'against_party'),
    (rc, 'jake_auchincloss', 'yea', 'against_party'),
    (rc, 'jason_smith', 'yea', 'with_party'),
    (rc, 'jayapal', 'nay', 'with_party'),
    (rc, 'jeffries', 'nay', 'with_party'),
    (rc, 'jim_jordan', 'yea', 'with_party'),
    (rc, 'josh_brecheen', 'yea', 'with_party'),
    (rc, 'josh_gottheimer', 'yea', 'against_party'),
    (rc, 'kclark', 'nay', 'with_party'),
    (rc, 'khanna', 'nay', 'with_party'),
    (rc, 'mariannette_miller_meeks', 'yea', 'with_party'),
    (rc, 'massie', 'nay', 'against_party'),
    (rc, 'maxine_waters', 'nay', 'with_party'),
    (rc, 'meeks', 'nay', 'with_party'),
    (rc, 'michael_guest', 'yea', 'with_party'),
    (rc, 'mike_collins', 'yea', 'with_party'),
    (rc, 'mike_ezell', 'yea', 'with_party'),
    (rc, 'mike_flood', 'yea', 'with_party'),
    (rc, 'mike_johnson', 'yea', 'with_party'),
    (rc, 'mike_lawler', 'yea', 'with_party'),
    (rc, 'mike_simpson', 'yea', 'with_party'),
    (rc, 'mike_waltz', 'yea', 'with_party'),
    (rc, 'mtg', 'nay', 'against_party'),
    (rc, 'omar', 'nay', 'with_party'),
    (rc, 'owens', 'yea', 'with_party'),
    (rc, 'rick_crawford', 'yea', 'with_party'),
    (rc, 'scalise', 'not_voting', NULL),
    (rc, 'schiff', 'yea', 'against_party'),
    (rc, 'scott_perry', 'yea', 'with_party'),
    (rc, 'slotkin', 'nay', 'with_party'),
    (rc, 'stefanik', 'yea', 'with_party'),
    (rc, 'steny_hoyer', 'nay', 'with_party'),
    (rc, 'stephanie_bice', 'yea', 'with_party'),
    (rc, 'steve_womack', 'yea', 'with_party'),
    (rc, 'summer_lee', 'nay', 'with_party'),
    (rc, 'tlaib', 'nay', 'with_party'),
    (rc, 'tom_cole', 'yea', 'with_party'),
    (rc, 'torres', 'yea', 'against_party'),
    (rc, 'trent_kelly', 'yea', 'with_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- house 118/2 roll 152 — H.R. 8034: On Passage
  --   366-58, 58 roster attribution(s) · U.S. House Clerk
  SELECT id INTO rc FROM vr_rollcalls
   WHERE chamber = 'house' AND congress = 118 AND session = 2
     AND roll_number = 152;
  IF rc IS NULL THEN
    RAISE EXCEPTION 'Israel roster expansion: house 118/2 roll 152 is missing — 20260812000000_vr_israel_support_rollcalls.sql must run first; this migration never creates a roll call because it holds none of the verified question, tally or source';
  END IF;
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'adam_smith', 'yea', 'with_party'),
    (rc, 'andy_kim', 'yea', 'with_party'),
    (rc, 'aoc', 'nay', 'against_party'),
    (rc, 'bennie_thompson', 'nay', 'against_party'),
    (rc, 'boebert', 'nay', 'against_party'),
    (rc, 'brian_mast', 'yea', 'with_party'),
    (rc, 'bruce_westerman', 'yea', 'with_party'),
    (rc, 'crockett', 'yea', 'with_party'),
    (rc, 'curtis', 'yea', 'with_party'),
    (rc, 'dan_goldman', 'yea', 'with_party'),
    (rc, 'don_bacon', 'yea', 'with_party'),
    (rc, 'don_davis', 'yea', 'with_party'),
    (rc, 'emmer', 'yea', 'with_party'),
    (rc, 'frank_lucas', 'yea', 'with_party'),
    (rc, 'french_hill', 'yea', 'with_party'),
    (rc, 'gaetz', 'nay', 'against_party'),
    (rc, 'gallego', 'yea', 'with_party'),
    (rc, 'greg_landsman', 'yea', 'with_party'),
    (rc, 'haley_stevens', 'yea', 'with_party'),
    (rc, 'jake_auchincloss', 'yea', 'with_party'),
    (rc, 'jason_smith', 'yea', 'with_party'),
    (rc, 'jayapal', 'nay', 'against_party'),
    (rc, 'jeffries', 'yea', 'with_party'),
    (rc, 'jim_jordan', 'yea', 'with_party'),
    (rc, 'josh_brecheen', 'yea', 'with_party'),
    (rc, 'josh_gottheimer', 'yea', 'with_party'),
    (rc, 'kclark', 'yea', 'with_party'),
    (rc, 'khanna', 'nay', 'against_party'),
    (rc, 'mariannette_miller_meeks', 'yea', 'with_party'),
    (rc, 'massie', 'nay', 'against_party'),
    (rc, 'maxine_waters', 'nay', 'against_party'),
    (rc, 'meeks', 'yea', 'with_party'),
    (rc, 'michael_guest', 'yea', 'with_party'),
    (rc, 'mike_collins', 'yea', 'with_party'),
    (rc, 'mike_ezell', 'yea', 'with_party'),
    (rc, 'mike_flood', 'yea', 'with_party'),
    (rc, 'mike_johnson', 'yea', 'with_party'),
    (rc, 'mike_lawler', 'yea', 'with_party'),
    (rc, 'mike_simpson', 'yea', 'with_party'),
    (rc, 'mike_waltz', 'yea', 'with_party'),
    (rc, 'mtg', 'nay', 'against_party'),
    (rc, 'omar', 'nay', 'against_party'),
    (rc, 'owens', 'yea', 'with_party'),
    (rc, 'rick_crawford', 'yea', 'with_party'),
    (rc, 'scalise', 'yea', 'with_party'),
    (rc, 'schiff', 'yea', 'with_party'),
    (rc, 'scott_perry', 'nay', 'against_party'),
    (rc, 'slotkin', 'yea', 'with_party'),
    (rc, 'stefanik', 'yea', 'with_party'),
    (rc, 'steny_hoyer', 'yea', 'with_party'),
    (rc, 'stephanie_bice', 'yea', 'with_party'),
    (rc, 'steve_womack', 'yea', 'with_party'),
    (rc, 'summer_lee', 'nay', 'against_party'),
    (rc, 'tlaib', 'nay', 'against_party'),
    (rc, 'tom_cole', 'yea', 'with_party'),
    (rc, 'tom_suozzi', 'yea', 'with_party'),
    (rc, 'torres', 'yea', 'with_party'),
    (rc, 'trent_kelly', 'yea', 'with_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- house 118/2 roll 217 — H.R. 8369: On Passage
  --   224-187, 58 roster attribution(s) · U.S. House Clerk
  SELECT id INTO rc FROM vr_rollcalls
   WHERE chamber = 'house' AND congress = 118 AND session = 2
     AND roll_number = 217;
  IF rc IS NULL THEN
    RAISE EXCEPTION 'Israel roster expansion: house 118/2 roll 217 is missing — 20260812000000_vr_israel_support_rollcalls.sql must run first; this migration never creates a roll call because it holds none of the verified question, tally or source';
  END IF;
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'adam_smith', 'nay', 'with_party'),
    (rc, 'andy_kim', 'nay', 'with_party'),
    (rc, 'aoc', 'nay', 'with_party'),
    (rc, 'bennie_thompson', 'nay', 'with_party'),
    (rc, 'boebert', 'not_voting', NULL),
    (rc, 'brian_mast', 'yea', 'with_party'),
    (rc, 'bruce_westerman', 'yea', 'with_party'),
    (rc, 'crockett', 'nay', 'with_party'),
    (rc, 'curtis', 'yea', 'with_party'),
    (rc, 'dan_goldman', 'nay', 'with_party'),
    (rc, 'don_bacon', 'yea', 'with_party'),
    (rc, 'don_davis', 'yea', 'against_party'),
    (rc, 'emmer', 'yea', 'with_party'),
    (rc, 'frank_lucas', 'yea', 'with_party'),
    (rc, 'french_hill', 'yea', 'with_party'),
    (rc, 'gaetz', 'not_voting', NULL),
    (rc, 'gallego', 'nay', 'with_party'),
    (rc, 'greg_landsman', 'yea', 'against_party'),
    (rc, 'haley_stevens', 'nay', 'with_party'),
    (rc, 'jake_auchincloss', 'nay', 'with_party'),
    (rc, 'jason_smith', 'yea', 'with_party'),
    (rc, 'jayapal', 'nay', 'with_party'),
    (rc, 'jeffries', 'nay', 'with_party'),
    (rc, 'jim_jordan', 'yea', 'with_party'),
    (rc, 'josh_brecheen', 'yea', 'with_party'),
    (rc, 'josh_gottheimer', 'yea', 'against_party'),
    (rc, 'kclark', 'nay', 'with_party'),
    (rc, 'khanna', 'not_voting', NULL),
    (rc, 'mariannette_miller_meeks', 'yea', 'with_party'),
    (rc, 'massie', 'nay', 'against_party'),
    (rc, 'maxine_waters', 'nay', 'with_party'),
    (rc, 'meeks', 'nay', 'with_party'),
    (rc, 'michael_guest', 'yea', 'with_party'),
    (rc, 'mike_collins', 'yea', 'with_party'),
    (rc, 'mike_ezell', 'yea', 'with_party'),
    (rc, 'mike_flood', 'yea', 'with_party'),
    (rc, 'mike_johnson', 'yea', 'with_party'),
    (rc, 'mike_lawler', 'yea', 'with_party'),
    (rc, 'mike_simpson', 'yea', 'with_party'),
    (rc, 'mike_waltz', 'yea', 'with_party'),
    (rc, 'mtg', 'nay', 'against_party'),
    (rc, 'omar', 'nay', 'with_party'),
    (rc, 'owens', 'yea', 'with_party'),
    (rc, 'rick_crawford', 'yea', 'with_party'),
    (rc, 'scalise', 'yea', 'with_party'),
    (rc, 'schiff', 'nay', 'with_party'),
    (rc, 'scott_perry', 'yea', 'with_party'),
    (rc, 'slotkin', 'nay', 'with_party'),
    (rc, 'stefanik', 'yea', 'with_party'),
    (rc, 'steny_hoyer', 'nay', 'with_party'),
    (rc, 'stephanie_bice', 'yea', 'with_party'),
    (rc, 'steve_womack', 'yea', 'with_party'),
    (rc, 'summer_lee', 'nay', 'with_party'),
    (rc, 'tlaib', 'nay', 'with_party'),
    (rc, 'tom_cole', 'yea', 'with_party'),
    (rc, 'tom_suozzi', 'yea', 'against_party'),
    (rc, 'torres', 'yea', 'against_party'),
    (rc, 'trent_kelly', 'yea', 'with_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- senate 118/2 roll 292 — S.J.Res. 111: On the Motion to Discharge S.J.Res. 111
  --   18-79, 33 roster attribution(s) · U.S. Senate
  SELECT id INTO rc FROM vr_rollcalls
   WHERE chamber = 'senate' AND congress = 118 AND session = 2
     AND roll_number = 292;
  IF rc IS NULL THEN
    RAISE EXCEPTION 'Israel roster expansion: senate 118/2 roll 292 is missing — 20260812000000_vr_israel_support_rollcalls.sql must run first; this migration never creates a roll call because it holds none of the verified question, tally or source';
  END IF;
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'barrasso', 'nay', 'with_party'),
    (rc, 'booker', 'nay', 'with_party'),
    (rc, 'britt', 'nay', 'with_party'),
    (rc, 'chris_murphy', 'yea', 'against_party'),
    (rc, 'collins', 'nay', 'with_party'),
    (rc, 'cruz', 'nay', 'with_party'),
    (rc, 'durbin', 'yea', 'against_party'),
    (rc, 'ernst', 'nay', 'with_party'),
    (rc, 'fetterman', 'nay', 'with_party'),
    (rc, 'graham', 'nay', 'with_party'),
    (rc, 'grassley', 'nay', 'with_party'),
    (rc, 'hawley', 'nay', 'with_party'),
    (rc, 'john_cornyn', 'nay', 'with_party'),
    (rc, 'jon_ossoff', 'yea', 'against_party'),
    (rc, 'kaine', 'yea', 'against_party'),
    (rc, 'lankford', 'nay', 'with_party'),
    (rc, 'lee', 'nay', 'with_party'),
    (rc, 'mark_kelly', 'nay', 'with_party'),
    (rc, 'mcconnell', 'nay', 'with_party'),
    (rc, 'murkowski', 'nay', 'with_party'),
    (rc, 'rand_paul', 'nay', 'with_party'),
    (rc, 'reed', 'nay', 'with_party'),
    (rc, 'risch', 'nay', 'with_party'),
    (rc, 'rosen', 'nay', 'with_party'),
    (rc, 'rubio', 'nay', 'with_party'),
    (rc, 'sanders', 'yea', 'with_party'),
    (rc, 'schumer', 'nay', 'with_party'),
    (rc, 'shaheen', 'yea', 'against_party'),
    (rc, 'thune', 'nay', 'with_party'),
    (rc, 'tim_scott', 'nay', 'with_party'),
    (rc, 'van_hollen', 'yea', 'against_party'),
    (rc, 'warnock', 'yea', 'against_party'),
    (rc, 'warren', 'yea', 'against_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- senate 118/2 roll 293 — S.J.Res. 113: On the Motion to Discharge S.J.Res. 113
  --   19-78, 33 roster attribution(s) · U.S. Senate
  SELECT id INTO rc FROM vr_rollcalls
   WHERE chamber = 'senate' AND congress = 118 AND session = 2
     AND roll_number = 293;
  IF rc IS NULL THEN
    RAISE EXCEPTION 'Israel roster expansion: senate 118/2 roll 293 is missing — 20260812000000_vr_israel_support_rollcalls.sql must run first; this migration never creates a roll call because it holds none of the verified question, tally or source';
  END IF;
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'barrasso', 'nay', 'with_party'),
    (rc, 'booker', 'nay', 'with_party'),
    (rc, 'britt', 'nay', 'with_party'),
    (rc, 'chris_murphy', 'yea', 'against_party'),
    (rc, 'collins', 'nay', 'with_party'),
    (rc, 'cruz', 'nay', 'with_party'),
    (rc, 'durbin', 'yea', 'against_party'),
    (rc, 'ernst', 'nay', 'with_party'),
    (rc, 'fetterman', 'nay', 'with_party'),
    (rc, 'graham', 'nay', 'with_party'),
    (rc, 'grassley', 'nay', 'with_party'),
    (rc, 'hawley', 'nay', 'with_party'),
    (rc, 'john_cornyn', 'nay', 'with_party'),
    (rc, 'jon_ossoff', 'yea', 'against_party'),
    (rc, 'kaine', 'yea', 'against_party'),
    (rc, 'lankford', 'nay', 'with_party'),
    (rc, 'lee', 'nay', 'with_party'),
    (rc, 'mark_kelly', 'nay', 'with_party'),
    (rc, 'mcconnell', 'nay', 'with_party'),
    (rc, 'murkowski', 'nay', 'with_party'),
    (rc, 'rand_paul', 'nay', 'with_party'),
    (rc, 'reed', 'nay', 'with_party'),
    (rc, 'risch', 'nay', 'with_party'),
    (rc, 'rosen', 'nay', 'with_party'),
    (rc, 'rubio', 'nay', 'with_party'),
    (rc, 'sanders', 'yea', 'with_party'),
    (rc, 'schumer', 'nay', 'with_party'),
    (rc, 'shaheen', 'yea', 'against_party'),
    (rc, 'thune', 'nay', 'with_party'),
    (rc, 'tim_scott', 'nay', 'with_party'),
    (rc, 'van_hollen', 'yea', 'against_party'),
    (rc, 'warnock', 'yea', 'against_party'),
    (rc, 'warren', 'yea', 'against_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- senate 118/2 roll 294 — S.J.Res. 115: On the Motion to Discharge S.J.Res. 115
  --   17-80, 33 roster attribution(s) · U.S. Senate
  SELECT id INTO rc FROM vr_rollcalls
   WHERE chamber = 'senate' AND congress = 118 AND session = 2
     AND roll_number = 294;
  IF rc IS NULL THEN
    RAISE EXCEPTION 'Israel roster expansion: senate 118/2 roll 294 is missing — 20260812000000_vr_israel_support_rollcalls.sql must run first; this migration never creates a roll call because it holds none of the verified question, tally or source';
  END IF;
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'barrasso', 'nay', 'with_party'),
    (rc, 'booker', 'nay', 'with_party'),
    (rc, 'britt', 'nay', 'with_party'),
    (rc, 'chris_murphy', 'yea', 'against_party'),
    (rc, 'collins', 'nay', 'with_party'),
    (rc, 'cruz', 'nay', 'with_party'),
    (rc, 'durbin', 'yea', 'against_party'),
    (rc, 'ernst', 'nay', 'with_party'),
    (rc, 'fetterman', 'nay', 'with_party'),
    (rc, 'graham', 'nay', 'with_party'),
    (rc, 'grassley', 'nay', 'with_party'),
    (rc, 'hawley', 'nay', 'with_party'),
    (rc, 'john_cornyn', 'nay', 'with_party'),
    (rc, 'jon_ossoff', 'nay', 'with_party'),
    (rc, 'kaine', 'yea', 'against_party'),
    (rc, 'lankford', 'nay', 'with_party'),
    (rc, 'lee', 'nay', 'with_party'),
    (rc, 'mark_kelly', 'nay', 'with_party'),
    (rc, 'mcconnell', 'nay', 'with_party'),
    (rc, 'murkowski', 'nay', 'with_party'),
    (rc, 'rand_paul', 'nay', 'with_party'),
    (rc, 'reed', 'nay', 'with_party'),
    (rc, 'risch', 'nay', 'with_party'),
    (rc, 'rosen', 'nay', 'with_party'),
    (rc, 'rubio', 'nay', 'with_party'),
    (rc, 'sanders', 'yea', 'with_party'),
    (rc, 'schumer', 'nay', 'with_party'),
    (rc, 'shaheen', 'yea', 'against_party'),
    (rc, 'thune', 'nay', 'with_party'),
    (rc, 'tim_scott', 'nay', 'with_party'),
    (rc, 'van_hollen', 'yea', 'against_party'),
    (rc, 'warnock', 'yea', 'against_party'),
    (rc, 'warren', 'yea', 'against_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- senate 119/1 roll 165 — S.J.Res. 33: On the Motion to Discharge S.J.Res. 33
  --   15-82, 37 roster attribution(s) · U.S. Senate
  SELECT id INTO rc FROM vr_rollcalls
   WHERE chamber = 'senate' AND congress = 119 AND session = 1
     AND roll_number = 165;
  IF rc IS NULL THEN
    RAISE EXCEPTION 'Israel roster expansion: senate 119/1 roll 165 is missing — 20260812000000_vr_israel_support_rollcalls.sql must run first; this migration never creates a roll call because it holds none of the verified question, tally or source';
  END IF;
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'andy_kim', 'yea', 'against_party'),
    (rc, 'barrasso', 'nay', 'with_party'),
    (rc, 'booker', 'nay', 'with_party'),
    (rc, 'britt', 'nay', 'with_party'),
    (rc, 'chris_murphy', 'yea', 'against_party'),
    (rc, 'collins', 'nay', 'with_party'),
    (rc, 'cruz', 'nay', 'with_party'),
    (rc, 'curtis', 'nay', 'with_party'),
    (rc, 'durbin', 'yea', 'against_party'),
    (rc, 'ernst', 'nay', 'with_party'),
    (rc, 'fetterman', 'nay', 'with_party'),
    (rc, 'gallego', 'nay', 'with_party'),
    (rc, 'graham', 'nay', 'with_party'),
    (rc, 'grassley', 'nay', 'with_party'),
    (rc, 'hawley', 'nay', 'with_party'),
    (rc, 'john_cornyn', 'nay', 'with_party'),
    (rc, 'jon_ossoff', 'nay', 'with_party'),
    (rc, 'kaine', 'yea', 'against_party'),
    (rc, 'lankford', 'nay', 'with_party'),
    (rc, 'lee', 'nay', 'with_party'),
    (rc, 'mark_kelly', 'nay', 'with_party'),
    (rc, 'mcconnell', 'nay', 'with_party'),
    (rc, 'murkowski', 'nay', 'with_party'),
    (rc, 'rand_paul', 'nay', 'with_party'),
    (rc, 'reed', 'nay', 'with_party'),
    (rc, 'risch', 'nay', 'with_party'),
    (rc, 'rosen', 'nay', 'with_party'),
    (rc, 'sanders', 'yea', 'with_party'),
    (rc, 'schiff', 'nay', 'with_party'),
    (rc, 'schumer', 'nay', 'with_party'),
    (rc, 'shaheen', 'nay', 'with_party'),
    (rc, 'slotkin', 'nay', 'with_party'),
    (rc, 'thune', 'nay', 'with_party'),
    (rc, 'tim_scott', 'nay', 'with_party'),
    (rc, 'van_hollen', 'yea', 'against_party'),
    (rc, 'warnock', 'nay', 'with_party'),
    (rc, 'warren', 'yea', 'against_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- senate 119/1 roll 166 — S.J.Res. 26: On the Motion to Discharge S.J.Res. 26
  --   15-83, 37 roster attribution(s) · U.S. Senate
  SELECT id INTO rc FROM vr_rollcalls
   WHERE chamber = 'senate' AND congress = 119 AND session = 1
     AND roll_number = 166;
  IF rc IS NULL THEN
    RAISE EXCEPTION 'Israel roster expansion: senate 119/1 roll 166 is missing — 20260812000000_vr_israel_support_rollcalls.sql must run first; this migration never creates a roll call because it holds none of the verified question, tally or source';
  END IF;
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'andy_kim', 'yea', 'against_party'),
    (rc, 'barrasso', 'nay', 'with_party'),
    (rc, 'booker', 'nay', 'with_party'),
    (rc, 'britt', 'nay', 'with_party'),
    (rc, 'chris_murphy', 'yea', 'against_party'),
    (rc, 'collins', 'nay', 'with_party'),
    (rc, 'cruz', 'nay', 'with_party'),
    (rc, 'curtis', 'nay', 'with_party'),
    (rc, 'durbin', 'yea', 'against_party'),
    (rc, 'ernst', 'nay', 'with_party'),
    (rc, 'fetterman', 'nay', 'with_party'),
    (rc, 'gallego', 'nay', 'with_party'),
    (rc, 'graham', 'nay', 'with_party'),
    (rc, 'grassley', 'nay', 'with_party'),
    (rc, 'hawley', 'nay', 'with_party'),
    (rc, 'john_cornyn', 'nay', 'with_party'),
    (rc, 'jon_ossoff', 'nay', 'with_party'),
    (rc, 'kaine', 'yea', 'against_party'),
    (rc, 'lankford', 'nay', 'with_party'),
    (rc, 'lee', 'nay', 'with_party'),
    (rc, 'mark_kelly', 'nay', 'with_party'),
    (rc, 'mcconnell', 'nay', 'with_party'),
    (rc, 'murkowski', 'nay', 'with_party'),
    (rc, 'rand_paul', 'nay', 'with_party'),
    (rc, 'reed', 'nay', 'with_party'),
    (rc, 'risch', 'nay', 'with_party'),
    (rc, 'rosen', 'nay', 'with_party'),
    (rc, 'sanders', 'yea', 'with_party'),
    (rc, 'schiff', 'nay', 'with_party'),
    (rc, 'schumer', 'nay', 'with_party'),
    (rc, 'shaheen', 'nay', 'with_party'),
    (rc, 'slotkin', 'nay', 'with_party'),
    (rc, 'thune', 'nay', 'with_party'),
    (rc, 'tim_scott', 'nay', 'with_party'),
    (rc, 'van_hollen', 'yea', 'against_party'),
    (rc, 'warnock', 'nay', 'with_party'),
    (rc, 'warren', 'yea', 'against_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- senate 119/1 roll 454 — S.J.Res. 41: On the Motion to Discharge S.J.Res. 41
  --   27-70, 37 roster attribution(s) · U.S. Senate
  SELECT id INTO rc FROM vr_rollcalls
   WHERE chamber = 'senate' AND congress = 119 AND session = 1
     AND roll_number = 454;
  IF rc IS NULL THEN
    RAISE EXCEPTION 'Israel roster expansion: senate 119/1 roll 454 is missing — 20260812000000_vr_israel_support_rollcalls.sql must run first; this migration never creates a roll call because it holds none of the verified question, tally or source';
  END IF;
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'andy_kim', 'yea', 'with_party'),
    (rc, 'barrasso', 'nay', 'with_party'),
    (rc, 'booker', 'nay', 'against_party'),
    (rc, 'britt', 'nay', 'with_party'),
    (rc, 'chris_murphy', 'yea', 'with_party'),
    (rc, 'collins', 'nay', 'with_party'),
    (rc, 'cruz', 'nay', 'with_party'),
    (rc, 'curtis', 'nay', 'with_party'),
    (rc, 'durbin', 'yea', 'with_party'),
    (rc, 'ernst', 'nay', 'with_party'),
    (rc, 'fetterman', 'nay', 'against_party'),
    (rc, 'gallego', 'not_voting', NULL),
    (rc, 'graham', 'nay', 'with_party'),
    (rc, 'grassley', 'nay', 'with_party'),
    (rc, 'hawley', 'nay', 'with_party'),
    (rc, 'john_cornyn', 'nay', 'with_party'),
    (rc, 'jon_ossoff', 'yea', 'with_party'),
    (rc, 'kaine', 'yea', 'with_party'),
    (rc, 'lankford', 'nay', 'with_party'),
    (rc, 'lee', 'nay', 'with_party'),
    (rc, 'mark_kelly', 'not_voting', NULL),
    (rc, 'mcconnell', 'nay', 'with_party'),
    (rc, 'murkowski', 'nay', 'with_party'),
    (rc, 'rand_paul', 'nay', 'with_party'),
    (rc, 'reed', 'yea', 'with_party'),
    (rc, 'risch', 'nay', 'with_party'),
    (rc, 'rosen', 'nay', 'against_party'),
    (rc, 'sanders', 'yea', 'with_party'),
    (rc, 'schiff', 'nay', 'against_party'),
    (rc, 'schumer', 'nay', 'against_party'),
    (rc, 'shaheen', 'yea', 'with_party'),
    (rc, 'slotkin', 'not_voting', NULL),
    (rc, 'thune', 'nay', 'with_party'),
    (rc, 'tim_scott', 'nay', 'with_party'),
    (rc, 'van_hollen', 'yea', 'with_party'),
    (rc, 'warnock', 'yea', 'with_party'),
    (rc, 'warren', 'yea', 'with_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- senate 119/1 roll 455 — S.J.Res. 34: On the Motion to Discharge S.J.Res. 34
  --   24-73, 37 roster attribution(s) · U.S. Senate
  SELECT id INTO rc FROM vr_rollcalls
   WHERE chamber = 'senate' AND congress = 119 AND session = 1
     AND roll_number = 455;
  IF rc IS NULL THEN
    RAISE EXCEPTION 'Israel roster expansion: senate 119/1 roll 455 is missing — 20260812000000_vr_israel_support_rollcalls.sql must run first; this migration never creates a roll call because it holds none of the verified question, tally or source';
  END IF;
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'andy_kim', 'yea', 'with_party'),
    (rc, 'barrasso', 'nay', 'with_party'),
    (rc, 'booker', 'nay', 'against_party'),
    (rc, 'britt', 'nay', 'with_party'),
    (rc, 'chris_murphy', 'yea', 'with_party'),
    (rc, 'collins', 'nay', 'with_party'),
    (rc, 'cruz', 'nay', 'with_party'),
    (rc, 'curtis', 'nay', 'with_party'),
    (rc, 'durbin', 'yea', 'with_party'),
    (rc, 'ernst', 'nay', 'with_party'),
    (rc, 'fetterman', 'nay', 'against_party'),
    (rc, 'gallego', 'not_voting', NULL),
    (rc, 'graham', 'nay', 'with_party'),
    (rc, 'grassley', 'nay', 'with_party'),
    (rc, 'hawley', 'nay', 'with_party'),
    (rc, 'john_cornyn', 'nay', 'with_party'),
    (rc, 'jon_ossoff', 'nay', 'against_party'),
    (rc, 'kaine', 'yea', 'with_party'),
    (rc, 'lankford', 'nay', 'with_party'),
    (rc, 'lee', 'nay', 'with_party'),
    (rc, 'mark_kelly', 'not_voting', NULL),
    (rc, 'mcconnell', 'nay', 'with_party'),
    (rc, 'murkowski', 'nay', 'with_party'),
    (rc, 'rand_paul', 'nay', 'with_party'),
    (rc, 'reed', 'nay', 'against_party'),
    (rc, 'risch', 'nay', 'with_party'),
    (rc, 'rosen', 'nay', 'against_party'),
    (rc, 'sanders', 'yea', 'with_party'),
    (rc, 'schiff', 'nay', 'against_party'),
    (rc, 'schumer', 'nay', 'against_party'),
    (rc, 'shaheen', 'yea', 'with_party'),
    (rc, 'slotkin', 'not_voting', NULL),
    (rc, 'thune', 'nay', 'with_party'),
    (rc, 'tim_scott', 'nay', 'with_party'),
    (rc, 'van_hollen', 'yea', 'with_party'),
    (rc, 'warnock', 'yea', 'with_party'),
    (rc, 'warren', 'yea', 'with_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- senate 119/2 roll 80 — S.J.Res. 32: On the Motion to Discharge S.J.Res. 32
  --   40-59, 37 roster attribution(s) · U.S. Senate
  SELECT id INTO rc FROM vr_rollcalls
   WHERE chamber = 'senate' AND congress = 119 AND session = 2
     AND roll_number = 80;
  IF rc IS NULL THEN
    RAISE EXCEPTION 'Israel roster expansion: senate 119/2 roll 80 is missing — 20260812000000_vr_israel_support_rollcalls.sql must run first; this migration never creates a roll call because it holds none of the verified question, tally or source';
  END IF;
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'andy_kim', 'yea', 'with_party'),
    (rc, 'barrasso', 'nay', 'with_party'),
    (rc, 'booker', 'yea', 'with_party'),
    (rc, 'britt', 'nay', 'with_party'),
    (rc, 'chris_murphy', 'yea', 'with_party'),
    (rc, 'collins', 'nay', 'with_party'),
    (rc, 'cruz', 'nay', 'with_party'),
    (rc, 'curtis', 'nay', 'with_party'),
    (rc, 'durbin', 'yea', 'with_party'),
    (rc, 'ernst', 'nay', 'with_party'),
    (rc, 'fetterman', 'nay', 'against_party'),
    (rc, 'gallego', 'yea', 'with_party'),
    (rc, 'graham', 'nay', 'with_party'),
    (rc, 'grassley', 'nay', 'with_party'),
    (rc, 'hawley', 'nay', 'with_party'),
    (rc, 'john_cornyn', 'nay', 'with_party'),
    (rc, 'jon_ossoff', 'yea', 'with_party'),
    (rc, 'kaine', 'yea', 'with_party'),
    (rc, 'lankford', 'nay', 'with_party'),
    (rc, 'lee', 'nay', 'with_party'),
    (rc, 'mark_kelly', 'yea', 'with_party'),
    (rc, 'mcconnell', 'nay', 'with_party'),
    (rc, 'murkowski', 'nay', 'with_party'),
    (rc, 'rand_paul', 'nay', 'with_party'),
    (rc, 'reed', 'yea', 'with_party'),
    (rc, 'risch', 'nay', 'with_party'),
    (rc, 'rosen', 'nay', 'against_party'),
    (rc, 'sanders', 'yea', 'with_party'),
    (rc, 'schiff', 'yea', 'with_party'),
    (rc, 'schumer', 'nay', 'against_party'),
    (rc, 'shaheen', 'yea', 'with_party'),
    (rc, 'slotkin', 'yea', 'with_party'),
    (rc, 'thune', 'nay', 'with_party'),
    (rc, 'tim_scott', 'nay', 'with_party'),
    (rc, 'van_hollen', 'yea', 'with_party'),
    (rc, 'warnock', 'yea', 'with_party'),
    (rc, 'warren', 'yea', 'with_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- senate 119/2 roll 81 — S.J.Res. 138: On the Motion to Discharge S.J.Res. 138
  --   36-63, 37 roster attribution(s) · U.S. Senate
  SELECT id INTO rc FROM vr_rollcalls
   WHERE chamber = 'senate' AND congress = 119 AND session = 2
     AND roll_number = 81;
  IF rc IS NULL THEN
    RAISE EXCEPTION 'Israel roster expansion: senate 119/2 roll 81 is missing — 20260812000000_vr_israel_support_rollcalls.sql must run first; this migration never creates a roll call because it holds none of the verified question, tally or source';
  END IF;
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'andy_kim', 'yea', 'with_party'),
    (rc, 'barrasso', 'nay', 'with_party'),
    (rc, 'booker', 'yea', 'with_party'),
    (rc, 'britt', 'nay', 'with_party'),
    (rc, 'chris_murphy', 'yea', 'with_party'),
    (rc, 'collins', 'nay', 'with_party'),
    (rc, 'cruz', 'nay', 'with_party'),
    (rc, 'curtis', 'nay', 'with_party'),
    (rc, 'durbin', 'yea', 'with_party'),
    (rc, 'ernst', 'nay', 'with_party'),
    (rc, 'fetterman', 'nay', 'against_party'),
    (rc, 'gallego', 'yea', 'with_party'),
    (rc, 'graham', 'nay', 'with_party'),
    (rc, 'grassley', 'nay', 'with_party'),
    (rc, 'hawley', 'nay', 'with_party'),
    (rc, 'john_cornyn', 'nay', 'with_party'),
    (rc, 'jon_ossoff', 'yea', 'with_party'),
    (rc, 'kaine', 'yea', 'with_party'),
    (rc, 'lankford', 'nay', 'with_party'),
    (rc, 'lee', 'nay', 'with_party'),
    (rc, 'mark_kelly', 'yea', 'with_party'),
    (rc, 'mcconnell', 'nay', 'with_party'),
    (rc, 'murkowski', 'nay', 'with_party'),
    (rc, 'rand_paul', 'nay', 'with_party'),
    (rc, 'reed', 'nay', 'against_party'),
    (rc, 'risch', 'nay', 'with_party'),
    (rc, 'rosen', 'nay', 'against_party'),
    (rc, 'sanders', 'yea', 'with_party'),
    (rc, 'schiff', 'yea', 'with_party'),
    (rc, 'schumer', 'nay', 'against_party'),
    (rc, 'shaheen', 'yea', 'with_party'),
    (rc, 'slotkin', 'yea', 'with_party'),
    (rc, 'thune', 'nay', 'with_party'),
    (rc, 'tim_scott', 'nay', 'with_party'),
    (rc, 'van_hollen', 'yea', 'with_party'),
    (rc, 'warnock', 'yea', 'with_party'),
    (rc, 'warren', 'yea', 'with_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- house 119/2 roll 243 — H.Amdt. 235: On Agreeing to the Amendment
  --   104-314, 55 roster attribution(s) · U.S. House Clerk
  SELECT id INTO rc FROM vr_rollcalls
   WHERE chamber = 'house' AND congress = 119 AND session = 2
     AND roll_number = 243;
  IF rc IS NULL THEN
    RAISE EXCEPTION 'Israel roster expansion: house 119/2 roll 243 is missing — 20260812000000_vr_israel_support_rollcalls.sql must run first; this migration never creates a roll call because it holds none of the verified question, tally or source';
  END IF;
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'adam_smith', 'yea', 'with_party'),
    (rc, 'aoc', 'yea', 'with_party'),
    (rc, 'bennie_thompson', 'yea', 'with_party'),
    (rc, 'boebert', 'nay', 'with_party'),
    (rc, 'brian_mast', 'nay', 'with_party'),
    (rc, 'bruce_westerman', 'nay', 'with_party'),
    (rc, 'crockett', 'yea', 'with_party'),
    (rc, 'dan_goldman', 'nay', 'against_party'),
    (rc, 'don_bacon', 'nay', 'with_party'),
    (rc, 'don_davis', 'not_voting', NULL),
    (rc, 'emmer', 'nay', 'with_party'),
    (rc, 'frank_lucas', 'nay', 'with_party'),
    (rc, 'french_hill', 'nay', 'with_party'),
    (rc, 'greg_landsman', 'nay', 'against_party'),
    (rc, 'haley_stevens', 'nay', 'against_party'),
    (rc, 'jake_auchincloss', 'yea', 'with_party'),
    (rc, 'jason_smith', 'nay', 'with_party'),
    (rc, 'jayapal', 'yea', 'with_party'),
    (rc, 'jeffries', 'nay', 'against_party'),
    (rc, 'jim_jordan', 'nay', 'with_party'),
    (rc, 'josh_brecheen', 'nay', 'with_party'),
    (rc, 'josh_gottheimer', 'nay', 'against_party'),
    (rc, 'julie_fedorchak', 'nay', 'with_party'),
    (rc, 'kclark', 'yea', 'with_party'),
    (rc, 'kennedy', 'nay', 'with_party'),
    (rc, 'khanna', 'yea', 'with_party'),
    (rc, 'mariannette_miller_meeks', 'nay', 'with_party'),
    (rc, 'massie', 'yea', 'against_party'),
    (rc, 'maxine_waters', 'yea', 'with_party'),
    (rc, 'meeks', 'nay', 'against_party'),
    (rc, 'michael_guest', 'nay', 'with_party'),
    (rc, 'mike_collins', 'nay', 'with_party'),
    (rc, 'mike_ezell', 'nay', 'with_party'),
    (rc, 'mike_flood', 'nay', 'with_party'),
    (rc, 'mike_johnson', 'nay', 'with_party'),
    (rc, 'mike_lawler', 'nay', 'with_party'),
    (rc, 'mike_simpson', 'nay', 'with_party'),
    (rc, 'omar', 'yea', 'with_party'),
    (rc, 'owens', 'nay', 'with_party'),
    (rc, 'rick_crawford', 'nay', 'with_party'),
    (rc, 'rob_bresnahan', 'nay', 'with_party'),
    (rc, 'ryan_mackenzie', 'not_voting', NULL),
    (rc, 'scalise', 'nay', 'with_party'),
    (rc, 'scott_perry', 'not_voting', NULL),
    (rc, 'stefanik', 'nay', 'with_party'),
    (rc, 'steny_hoyer', 'nay', 'against_party'),
    (rc, 'stephanie_bice', 'nay', 'with_party'),
    (rc, 'steve_womack', 'nay', 'with_party'),
    (rc, 'summer_lee', 'yea', 'with_party'),
    (rc, 'tlaib', 'yea', 'with_party'),
    (rc, 'tom_cole', 'nay', 'with_party'),
    (rc, 'tom_suozzi', 'nay', 'against_party'),
    (rc, 'torres', 'nay', 'against_party'),
    (rc, 'trent_kelly', 'nay', 'with_party'),
    (rc, 'troy_downing', 'nay', 'with_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;

-- ── Verification ─────────────────────────────────────────────────────────
DO $$
DECLARE n_rolls integer; n_votes integer; n_orphan integer;
BEGIN
  WITH want (chamber, congress, session, roll_number) AS (VALUES
    ('house'::text, 117::integer, 1::integer, 275::integer),
    ('house'::text, 118::integer, 1::integer, 491::integer),
    ('house'::text, 118::integer, 1::integer, 577::integer),
    ('house'::text, 118::integer, 2::integer, 38::integer),
    ('house'::text, 118::integer, 2::integer, 152::integer),
    ('house'::text, 118::integer, 2::integer, 217::integer),
    ('senate'::text, 118::integer, 2::integer, 292::integer),
    ('senate'::text, 118::integer, 2::integer, 293::integer),
    ('senate'::text, 118::integer, 2::integer, 294::integer),
    ('senate'::text, 119::integer, 1::integer, 165::integer),
    ('senate'::text, 119::integer, 1::integer, 166::integer),
    ('senate'::text, 119::integer, 1::integer, 454::integer),
    ('senate'::text, 119::integer, 1::integer, 455::integer),
    ('senate'::text, 119::integer, 2::integer, 80::integer),
    ('senate'::text, 119::integer, 2::integer, 81::integer),
    ('house'::text, 119::integer, 2::integer, 243::integer)
  ), roll_ids AS (
    SELECT r.id FROM vr_rollcalls r JOIN want w
      ON r.chamber = w.chamber AND r.congress = w.congress
     AND r.session = w.session AND r.roll_number = w.roll_number
  )
  SELECT (SELECT count(*) FROM roll_ids),
         (SELECT count(*) FROM vr_member_votes v WHERE v.rollcall_id IN (SELECT id FROM roll_ids)),
         (SELECT count(*) FROM vr_member_votes v WHERE v.rollcall_id IN (SELECT id FROM roll_ids)
            AND v.politician_id NOT IN ('adam_smith', 'andy_kim', 'aoc', 'barrasso', 'bennie_thompson', 'bmoore', 'boebert', 'booker', 'brian_mast', 'britt', 'bruce_westerman', 'chris_murphy', 'collins', 'crockett', 'cruz', 'cstewart', 'curtis', 'dan_goldman', 'don_bacon', 'don_davis', 'durbin', 'emmer', 'ernst', 'fetterman', 'frank_lucas', 'french_hill', 'gaetz', 'gallego', 'graham', 'grassley', 'greg_landsman', 'haley_stevens', 'hawley', 'jake_auchincloss', 'jason_smith', 'jayapal', 'jeffries', 'jim_jordan', 'john_cornyn', 'jon_ossoff', 'josh_brecheen', 'josh_gottheimer', 'julie_fedorchak', 'kaine', 'kclark', 'kennedy', 'khanna', 'lankford', 'lee', 'mariannette_miller_meeks', 'mark_kelly', 'massie', 'maxine_waters', 'mcconnell', 'meeks', 'michael_guest', 'mike_collins', 'mike_ezell', 'mike_flood', 'mike_johnson', 'mike_lawler', 'mike_simpson', 'mike_waltz', 'mtg', 'murkowski', 'omar', 'owens', 'rand_paul', 'reed', 'rick_crawford', 'risch', 'rob_bresnahan', 'rosen', 'rubio', 'ryan_mackenzie', 'sanders', 'scalise', 'schiff', 'schumer', 'scott_perry', 'shaheen', 'slotkin', 'stefanik', 'steny_hoyer', 'stephanie_bice', 'steve_womack', 'summer_lee', 'tgabbard', 'thune', 'tim_scott', 'tlaib', 'tom_cole', 'tom_suozzi', 'torres', 'trent_kelly', 'troy_downing', 'van_hollen', 'warnock', 'warren', 'zeldin'))
    INTO n_rolls, n_votes, n_orphan;
  RAISE NOTICE 'Israel roster expansion: % roll calls, % member votes', n_rolls, n_votes;
  IF n_rolls <> 16 THEN
    RAISE EXCEPTION 'Israel roster expansion: expected 16 roll calls, found %', n_rolls;
  END IF;
  IF n_votes < 713 THEN
    RAISE EXCEPTION 'Israel roster expansion: expected at least 713 member votes on these rolls, found % — the expansion did not land', n_votes;
  END IF;
  IF n_orphan > 0 THEN
    RAISE EXCEPTION 'Israel roster expansion: % member vote(s) carry a politician_id outside the ingest roster', n_orphan;
  END IF;
END $$;
