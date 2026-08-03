-- ═══════════════════════════════════════════════════════════════════════════
-- Phase A landmarks — member votes unlocked by the roster expansion
-- ═══════════════════════════════════════════════════════════════════════════
--
-- 20260811000000_vr_phase_a_117_118_rollcalls.sql created these 29 roll calls and
-- wrote the 731 member votes a 63-slug roster could attribute. db/vr-roster-admitted.json
-- has since admitted 37 more members, which left this record under-attributed by
-- construction — the same rolls and the same tallies, but 37 members the ingest could
-- not recognise. Re-attributing the same 29 rolls against the widened roster yields
-- 1217 votes.
--
-- Additive and idempotent: member votes only, ON CONFLICT (rollcall_id, politician_id)
-- DO NOTHING, so the votes the earlier migration already wrote conflict away and only
-- the newly attributable ones land. No measure, roll call, mapping or measure-identity
-- row is touched: Phase A's curated issue rows are deliberately left exactly as they
-- are, because this pass changes who is recognised and never what a measure means.
--
-- Source of truth: db/vr-phase-a-vote-seed.json, rebuilt by
-- scripts/vr-build-phase-a-vote-seed.mjs, which re-verified every citation, question
-- and tally against the House Clerk and Senate roll-call XML on the way through. The
-- rebuild was checked to be a strict superset of the deployed record: no attribution
-- dropped, no position or party-crossover flag changed, all 29 questions and margins
-- byte-identical.
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE rc bigint;
BEGIN

  -- senate 117/1 roll 110 — H.R. 1319: On Passage of the Bill H.R. 1319
  --   50-49, 31 roster attribution(s) · U.S. Senate
  SELECT id INTO rc FROM vr_rollcalls
   WHERE chamber = 'senate' AND congress = 117 AND session = 1
     AND roll_number = 110;
  IF rc IS NULL THEN
    RAISE EXCEPTION 'Phase A re-attribution: senate 117/1 roll 110 is missing — 20260811000000_vr_phase_a_117_118_rollcalls.sql must run first; this migration never creates a roll call because it holds none of the verified question, tally or source';
  END IF;
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'barrasso', 'nay', 'with_party'),
    (rc, 'booker', 'yea', 'with_party'),
    (rc, 'chris_murphy', 'yea', 'with_party'),
    (rc, 'collins', 'nay', 'with_party'),
    (rc, 'cruz', 'nay', 'with_party'),
    (rc, 'durbin', 'yea', 'with_party'),
    (rc, 'ernst', 'nay', 'with_party'),
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
    (rc, 'rosen', 'yea', 'with_party'),
    (rc, 'rubio', 'nay', 'with_party'),
    (rc, 'sanders', 'yea', 'with_party'),
    (rc, 'schumer', 'yea', 'with_party'),
    (rc, 'shaheen', 'yea', 'with_party'),
    (rc, 'thune', 'nay', 'with_party'),
    (rc, 'tim_scott', 'nay', 'with_party'),
    (rc, 'van_hollen', 'yea', 'with_party'),
    (rc, 'warnock', 'yea', 'with_party'),
    (rc, 'warren', 'yea', 'with_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- house 117/1 roll 72 — H.R. 1319: On Motion to Concur in the Senate Amendment
  --   220-211, 50 roster attribution(s) · U.S. House Clerk
  SELECT id INTO rc FROM vr_rollcalls
   WHERE chamber = 'house' AND congress = 117 AND session = 1
     AND roll_number = 72;
  IF rc IS NULL THEN
    RAISE EXCEPTION 'Phase A re-attribution: house 117/1 roll 72 is missing — 20260811000000_vr_phase_a_117_118_rollcalls.sql must run first; this migration never creates a roll call because it holds none of the verified question, tally or source';
  END IF;
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'adam_smith', 'yea', 'with_party'),
    (rc, 'andy_kim', 'yea', 'with_party'),
    (rc, 'aoc', 'yea', 'with_party'),
    (rc, 'bennie_thompson', 'yea', 'with_party'),
    (rc, 'boebert', 'nay', 'with_party'),
    (rc, 'brian_mast', 'nay', 'with_party'),
    (rc, 'bruce_westerman', 'nay', 'with_party'),
    (rc, 'cstewart', 'nay', 'with_party'),
    (rc, 'curtis', 'nay', 'with_party'),
    (rc, 'don_bacon', 'nay', 'with_party'),
    (rc, 'emmer', 'nay', 'with_party'),
    (rc, 'frank_lucas', 'nay', 'with_party'),
    (rc, 'french_hill', 'nay', 'with_party'),
    (rc, 'gaetz', 'nay', 'with_party'),
    (rc, 'gallego', 'yea', 'with_party'),
    (rc, 'haley_stevens', 'yea', 'with_party'),
    (rc, 'jake_auchincloss', 'yea', 'with_party'),
    (rc, 'jason_smith', 'nay', 'with_party'),
    (rc, 'jayapal', 'yea', 'with_party'),
    (rc, 'jeffries', 'yea', 'with_party'),
    (rc, 'jim_jordan', 'nay', 'with_party'),
    (rc, 'josh_gottheimer', 'yea', 'with_party'),
    (rc, 'kclark', 'yea', 'with_party'),
    (rc, 'khanna', 'yea', 'with_party'),
    (rc, 'mariannette_miller_meeks', 'nay', 'with_party'),
    (rc, 'massie', 'nay', 'with_party'),
    (rc, 'maxine_waters', 'yea', 'with_party'),
    (rc, 'meeks', 'yea', 'with_party'),
    (rc, 'michael_guest', 'nay', 'with_party'),
    (rc, 'mike_johnson', 'nay', 'with_party'),
    (rc, 'mike_simpson', 'nay', 'with_party'),
    (rc, 'mike_waltz', 'nay', 'with_party'),
    (rc, 'mtg', 'nay', 'with_party'),
    (rc, 'omar', 'yea', 'with_party'),
    (rc, 'owens', 'nay', 'with_party'),
    (rc, 'rick_crawford', 'nay', 'with_party'),
    (rc, 'scalise', 'nay', 'with_party'),
    (rc, 'schiff', 'yea', 'with_party'),
    (rc, 'scott_perry', 'nay', 'with_party'),
    (rc, 'slotkin', 'yea', 'with_party'),
    (rc, 'stefanik', 'nay', 'with_party'),
    (rc, 'steny_hoyer', 'yea', 'with_party'),
    (rc, 'stephanie_bice', 'nay', 'with_party'),
    (rc, 'steve_womack', 'nay', 'with_party'),
    (rc, 'tlaib', 'yea', 'with_party'),
    (rc, 'tom_cole', 'nay', 'with_party'),
    (rc, 'tom_suozzi', 'yea', 'with_party'),
    (rc, 'torres', 'yea', 'with_party'),
    (rc, 'trent_kelly', 'nay', 'with_party'),
    (rc, 'zeldin', 'nay', 'with_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- senate 117/1 roll 314 — H.R. 3684: On Passage of the Bill H.R. 3684
  --   69-30, 31 roster attribution(s) · U.S. Senate
  SELECT id INTO rc FROM vr_rollcalls
   WHERE chamber = 'senate' AND congress = 117 AND session = 1
     AND roll_number = 314;
  IF rc IS NULL THEN
    RAISE EXCEPTION 'Phase A re-attribution: senate 117/1 roll 314 is missing — 20260811000000_vr_phase_a_117_118_rollcalls.sql must run first; this migration never creates a roll call because it holds none of the verified question, tally or source';
  END IF;
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'barrasso', 'nay', 'with_party'),
    (rc, 'booker', 'yea', 'with_party'),
    (rc, 'chris_murphy', 'yea', 'with_party'),
    (rc, 'collins', 'yea', 'against_party'),
    (rc, 'cruz', 'nay', 'with_party'),
    (rc, 'durbin', 'yea', 'with_party'),
    (rc, 'ernst', 'nay', 'with_party'),
    (rc, 'graham', 'yea', 'against_party'),
    (rc, 'grassley', 'yea', 'against_party'),
    (rc, 'hawley', 'nay', 'with_party'),
    (rc, 'john_cornyn', 'nay', 'with_party'),
    (rc, 'jon_ossoff', 'yea', 'with_party'),
    (rc, 'kaine', 'yea', 'with_party'),
    (rc, 'lankford', 'nay', 'with_party'),
    (rc, 'lee', 'nay', 'with_party'),
    (rc, 'mark_kelly', 'yea', 'with_party'),
    (rc, 'mcconnell', 'yea', 'against_party'),
    (rc, 'murkowski', 'yea', 'against_party'),
    (rc, 'rand_paul', 'nay', 'with_party'),
    (rc, 'reed', 'yea', 'with_party'),
    (rc, 'risch', 'yea', 'against_party'),
    (rc, 'rosen', 'yea', 'with_party'),
    (rc, 'rubio', 'nay', 'with_party'),
    (rc, 'sanders', 'yea', 'with_party'),
    (rc, 'schumer', 'yea', 'with_party'),
    (rc, 'shaheen', 'yea', 'with_party'),
    (rc, 'thune', 'nay', 'with_party'),
    (rc, 'tim_scott', 'nay', 'with_party'),
    (rc, 'van_hollen', 'yea', 'with_party'),
    (rc, 'warnock', 'yea', 'with_party'),
    (rc, 'warren', 'yea', 'with_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- house 117/1 roll 369 — H.R. 3684: On Motion to Concur in the Senate Amendment
  --   228-206, 50 roster attribution(s) · U.S. House Clerk
  SELECT id INTO rc FROM vr_rollcalls
   WHERE chamber = 'house' AND congress = 117 AND session = 1
     AND roll_number = 369;
  IF rc IS NULL THEN
    RAISE EXCEPTION 'Phase A re-attribution: house 117/1 roll 369 is missing — 20260811000000_vr_phase_a_117_118_rollcalls.sql must run first; this migration never creates a roll call because it holds none of the verified question, tally or source';
  END IF;
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'adam_smith', 'yea', 'with_party'),
    (rc, 'andy_kim', 'yea', 'with_party'),
    (rc, 'aoc', 'nay', 'against_party'),
    (rc, 'bennie_thompson', 'yea', 'with_party'),
    (rc, 'boebert', 'nay', 'with_party'),
    (rc, 'brian_mast', 'nay', 'with_party'),
    (rc, 'bruce_westerman', 'nay', 'with_party'),
    (rc, 'cstewart', 'nay', 'with_party'),
    (rc, 'curtis', 'nay', 'with_party'),
    (rc, 'don_bacon', 'yea', 'against_party'),
    (rc, 'emmer', 'nay', 'with_party'),
    (rc, 'frank_lucas', 'nay', 'with_party'),
    (rc, 'french_hill', 'nay', 'with_party'),
    (rc, 'gaetz', 'nay', 'with_party'),
    (rc, 'gallego', 'yea', 'with_party'),
    (rc, 'haley_stevens', 'yea', 'with_party'),
    (rc, 'jake_auchincloss', 'yea', 'with_party'),
    (rc, 'jason_smith', 'nay', 'with_party'),
    (rc, 'jayapal', 'yea', 'with_party'),
    (rc, 'jeffries', 'yea', 'with_party'),
    (rc, 'jim_jordan', 'nay', 'with_party'),
    (rc, 'josh_gottheimer', 'yea', 'with_party'),
    (rc, 'kclark', 'yea', 'with_party'),
    (rc, 'khanna', 'yea', 'with_party'),
    (rc, 'mariannette_miller_meeks', 'nay', 'with_party'),
    (rc, 'massie', 'nay', 'with_party'),
    (rc, 'maxine_waters', 'yea', 'with_party'),
    (rc, 'meeks', 'yea', 'with_party'),
    (rc, 'michael_guest', 'nay', 'with_party'),
    (rc, 'mike_johnson', 'nay', 'with_party'),
    (rc, 'mike_simpson', 'nay', 'with_party'),
    (rc, 'mike_waltz', 'nay', 'with_party'),
    (rc, 'mtg', 'nay', 'with_party'),
    (rc, 'omar', 'nay', 'against_party'),
    (rc, 'owens', 'nay', 'with_party'),
    (rc, 'rick_crawford', 'nay', 'with_party'),
    (rc, 'scalise', 'nay', 'with_party'),
    (rc, 'schiff', 'yea', 'with_party'),
    (rc, 'scott_perry', 'nay', 'with_party'),
    (rc, 'slotkin', 'yea', 'with_party'),
    (rc, 'stefanik', 'nay', 'with_party'),
    (rc, 'steny_hoyer', 'yea', 'with_party'),
    (rc, 'stephanie_bice', 'nay', 'with_party'),
    (rc, 'steve_womack', 'nay', 'with_party'),
    (rc, 'tlaib', 'nay', 'against_party'),
    (rc, 'tom_cole', 'nay', 'with_party'),
    (rc, 'tom_suozzi', 'yea', 'with_party'),
    (rc, 'torres', 'yea', 'with_party'),
    (rc, 'trent_kelly', 'nay', 'with_party'),
    (rc, 'zeldin', 'nay', 'with_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- house 117/1 roll 405 — S. 1605: On Passage
  --   363-70, 50 roster attribution(s) · U.S. House Clerk
  SELECT id INTO rc FROM vr_rollcalls
   WHERE chamber = 'house' AND congress = 117 AND session = 1
     AND roll_number = 405;
  IF rc IS NULL THEN
    RAISE EXCEPTION 'Phase A re-attribution: house 117/1 roll 405 is missing — 20260811000000_vr_phase_a_117_118_rollcalls.sql must run first; this migration never creates a roll call because it holds none of the verified question, tally or source';
  END IF;
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'adam_smith', 'yea', 'with_party'),
    (rc, 'andy_kim', 'yea', 'with_party'),
    (rc, 'aoc', 'nay', 'against_party'),
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
    (rc, 'jake_auchincloss', 'nay', 'against_party'),
    (rc, 'jason_smith', 'yea', 'with_party'),
    (rc, 'jayapal', 'nay', 'against_party'),
    (rc, 'jeffries', 'yea', 'with_party'),
    (rc, 'jim_jordan', 'yea', 'with_party'),
    (rc, 'josh_gottheimer', 'yea', 'with_party'),
    (rc, 'kclark', 'nay', 'against_party'),
    (rc, 'khanna', 'nay', 'against_party'),
    (rc, 'mariannette_miller_meeks', 'yea', 'with_party'),
    (rc, 'massie', 'nay', 'against_party'),
    (rc, 'maxine_waters', 'yea', 'with_party'),
    (rc, 'meeks', 'yea', 'with_party'),
    (rc, 'michael_guest', 'yea', 'with_party'),
    (rc, 'mike_johnson', 'yea', 'with_party'),
    (rc, 'mike_simpson', 'yea', 'with_party'),
    (rc, 'mike_waltz', 'yea', 'with_party'),
    (rc, 'mtg', 'nay', 'against_party'),
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
    (rc, 'torres', 'nay', 'against_party'),
    (rc, 'trent_kelly', 'yea', 'with_party'),
    (rc, 'zeldin', 'yea', 'with_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- senate 117/1 roll 499 — S. 1605: On the Motion (Motion to Concur in the House Amendment to S. 1605)
  --   88-11, 31 roster attribution(s) · U.S. Senate
  SELECT id INTO rc FROM vr_rollcalls
   WHERE chamber = 'senate' AND congress = 117 AND session = 1
     AND roll_number = 499;
  IF rc IS NULL THEN
    RAISE EXCEPTION 'Phase A re-attribution: senate 117/1 roll 499 is missing — 20260811000000_vr_phase_a_117_118_rollcalls.sql must run first; this migration never creates a roll call because it holds none of the verified question, tally or source';
  END IF;
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'barrasso', 'yea', 'with_party'),
    (rc, 'booker', 'nay', 'against_party'),
    (rc, 'chris_murphy', 'yea', 'with_party'),
    (rc, 'collins', 'yea', 'with_party'),
    (rc, 'cruz', 'yea', 'with_party'),
    (rc, 'durbin', 'yea', 'with_party'),
    (rc, 'ernst', 'yea', 'with_party'),
    (rc, 'graham', 'yea', 'with_party'),
    (rc, 'grassley', 'yea', 'with_party'),
    (rc, 'hawley', 'yea', 'with_party'),
    (rc, 'john_cornyn', 'yea', 'with_party'),
    (rc, 'jon_ossoff', 'yea', 'with_party'),
    (rc, 'kaine', 'yea', 'with_party'),
    (rc, 'lankford', 'yea', 'with_party'),
    (rc, 'lee', 'nay', 'against_party'),
    (rc, 'mark_kelly', 'yea', 'with_party'),
    (rc, 'mcconnell', 'yea', 'with_party'),
    (rc, 'murkowski', 'yea', 'with_party'),
    (rc, 'rand_paul', 'nay', 'against_party'),
    (rc, 'reed', 'yea', 'with_party'),
    (rc, 'risch', 'yea', 'with_party'),
    (rc, 'rosen', 'yea', 'with_party'),
    (rc, 'rubio', 'yea', 'with_party'),
    (rc, 'sanders', 'nay', 'against_party'),
    (rc, 'schumer', 'yea', 'with_party'),
    (rc, 'shaheen', 'yea', 'with_party'),
    (rc, 'thune', 'yea', 'with_party'),
    (rc, 'tim_scott', 'yea', 'with_party'),
    (rc, 'van_hollen', 'yea', 'with_party'),
    (rc, 'warnock', 'yea', 'with_party'),
    (rc, 'warren', 'nay', 'against_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- house 117/2 roll 38 — H.R. 3076: On Passage
  --   342-92, 50 roster attribution(s) · U.S. House Clerk
  SELECT id INTO rc FROM vr_rollcalls
   WHERE chamber = 'house' AND congress = 117 AND session = 2
     AND roll_number = 38;
  IF rc IS NULL THEN
    RAISE EXCEPTION 'Phase A re-attribution: house 117/2 roll 38 is missing — 20260811000000_vr_phase_a_117_118_rollcalls.sql must run first; this migration never creates a roll call because it holds none of the verified question, tally or source';
  END IF;
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'adam_smith', 'yea', 'with_party'),
    (rc, 'andy_kim', 'yea', 'with_party'),
    (rc, 'aoc', 'yea', 'with_party'),
    (rc, 'bennie_thompson', 'yea', 'with_party'),
    (rc, 'boebert', 'nay', 'against_party'),
    (rc, 'brian_mast', 'yea', 'with_party'),
    (rc, 'bruce_westerman', 'yea', 'with_party'),
    (rc, 'cstewart', 'yea', 'with_party'),
    (rc, 'curtis', 'yea', 'with_party'),
    (rc, 'don_bacon', 'yea', 'with_party'),
    (rc, 'emmer', 'yea', 'with_party'),
    (rc, 'frank_lucas', 'yea', 'with_party'),
    (rc, 'french_hill', 'yea', 'with_party'),
    (rc, 'gaetz', 'nay', 'against_party'),
    (rc, 'gallego', 'yea', 'with_party'),
    (rc, 'haley_stevens', 'yea', 'with_party'),
    (rc, 'jake_auchincloss', 'yea', 'with_party'),
    (rc, 'jason_smith', 'nay', 'against_party'),
    (rc, 'jayapal', 'yea', 'with_party'),
    (rc, 'jeffries', 'yea', 'with_party'),
    (rc, 'jim_jordan', 'nay', 'against_party'),
    (rc, 'josh_gottheimer', 'yea', 'with_party'),
    (rc, 'kclark', 'yea', 'with_party'),
    (rc, 'khanna', 'yea', 'with_party'),
    (rc, 'mariannette_miller_meeks', 'yea', 'with_party'),
    (rc, 'massie', 'nay', 'against_party'),
    (rc, 'maxine_waters', 'yea', 'with_party'),
    (rc, 'meeks', 'yea', 'with_party'),
    (rc, 'michael_guest', 'yea', 'with_party'),
    (rc, 'mike_johnson', 'nay', 'against_party'),
    (rc, 'mike_simpson', 'yea', 'with_party'),
    (rc, 'mike_waltz', 'yea', 'with_party'),
    (rc, 'mtg', 'nay', 'against_party'),
    (rc, 'omar', 'yea', 'with_party'),
    (rc, 'owens', 'yea', 'with_party'),
    (rc, 'rick_crawford', 'nay', 'against_party'),
    (rc, 'scalise', 'yea', 'with_party'),
    (rc, 'schiff', 'yea', 'with_party'),
    (rc, 'scott_perry', 'nay', 'against_party'),
    (rc, 'slotkin', 'yea', 'with_party'),
    (rc, 'stefanik', 'yea', 'with_party'),
    (rc, 'steny_hoyer', 'yea', 'with_party'),
    (rc, 'stephanie_bice', 'yea', 'with_party'),
    (rc, 'steve_womack', 'yea', 'with_party'),
    (rc, 'tlaib', 'yea', 'with_party'),
    (rc, 'tom_cole', 'yea', 'with_party'),
    (rc, 'tom_suozzi', 'yea', 'with_party'),
    (rc, 'torres', 'yea', 'with_party'),
    (rc, 'trent_kelly', 'nay', 'against_party'),
    (rc, 'zeldin', 'yea', 'with_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- senate 117/2 roll 71 — H.R. 3076: On Passage of the Bill H.R. 3076
  --   79-19, 31 roster attribution(s) · U.S. Senate
  SELECT id INTO rc FROM vr_rollcalls
   WHERE chamber = 'senate' AND congress = 117 AND session = 2
     AND roll_number = 71;
  IF rc IS NULL THEN
    RAISE EXCEPTION 'Phase A re-attribution: senate 117/2 roll 71 is missing — 20260811000000_vr_phase_a_117_118_rollcalls.sql must run first; this migration never creates a roll call because it holds none of the verified question, tally or source';
  END IF;
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'barrasso', 'yea', 'with_party'),
    (rc, 'booker', 'yea', 'with_party'),
    (rc, 'chris_murphy', 'yea', 'with_party'),
    (rc, 'collins', 'yea', 'with_party'),
    (rc, 'cruz', 'nay', 'against_party'),
    (rc, 'durbin', 'yea', 'with_party'),
    (rc, 'ernst', 'yea', 'with_party'),
    (rc, 'graham', 'yea', 'with_party'),
    (rc, 'grassley', 'yea', 'with_party'),
    (rc, 'hawley', 'yea', 'with_party'),
    (rc, 'john_cornyn', 'nay', 'against_party'),
    (rc, 'jon_ossoff', 'yea', 'with_party'),
    (rc, 'kaine', 'yea', 'with_party'),
    (rc, 'lankford', 'nay', 'against_party'),
    (rc, 'lee', 'nay', 'against_party'),
    (rc, 'mark_kelly', 'yea', 'with_party'),
    (rc, 'mcconnell', 'yea', 'with_party'),
    (rc, 'murkowski', 'yea', 'with_party'),
    (rc, 'rand_paul', 'nay', 'against_party'),
    (rc, 'reed', 'yea', 'with_party'),
    (rc, 'risch', 'nay', 'against_party'),
    (rc, 'rosen', 'yea', 'with_party'),
    (rc, 'rubio', 'nay', 'against_party'),
    (rc, 'sanders', 'yea', 'with_party'),
    (rc, 'schumer', 'yea', 'with_party'),
    (rc, 'shaheen', 'yea', 'with_party'),
    (rc, 'thune', 'yea', 'with_party'),
    (rc, 'tim_scott', 'nay', 'against_party'),
    (rc, 'van_hollen', 'yea', 'with_party'),
    (rc, 'warnock', 'yea', 'with_party'),
    (rc, 'warren', 'yea', 'with_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- senate 117/2 roll 242 — S. 2938: On the Motion (Motion to Concur in the House amendment to S. 2938 with an amendment (Amdt. No. 5099))
  --   65-33, 31 roster attribution(s) · U.S. Senate
  SELECT id INTO rc FROM vr_rollcalls
   WHERE chamber = 'senate' AND congress = 117 AND session = 2
     AND roll_number = 242;
  IF rc IS NULL THEN
    RAISE EXCEPTION 'Phase A re-attribution: senate 117/2 roll 242 is missing — 20260811000000_vr_phase_a_117_118_rollcalls.sql must run first; this migration never creates a roll call because it holds none of the verified question, tally or source';
  END IF;
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'barrasso', 'nay', 'with_party'),
    (rc, 'booker', 'yea', 'with_party'),
    (rc, 'chris_murphy', 'yea', 'with_party'),
    (rc, 'collins', 'yea', 'against_party'),
    (rc, 'cruz', 'nay', 'with_party'),
    (rc, 'durbin', 'yea', 'with_party'),
    (rc, 'ernst', 'yea', 'against_party'),
    (rc, 'graham', 'yea', 'against_party'),
    (rc, 'grassley', 'nay', 'with_party'),
    (rc, 'hawley', 'nay', 'with_party'),
    (rc, 'john_cornyn', 'yea', 'against_party'),
    (rc, 'jon_ossoff', 'yea', 'with_party'),
    (rc, 'kaine', 'yea', 'with_party'),
    (rc, 'lankford', 'nay', 'with_party'),
    (rc, 'lee', 'nay', 'with_party'),
    (rc, 'mark_kelly', 'yea', 'with_party'),
    (rc, 'mcconnell', 'yea', 'against_party'),
    (rc, 'murkowski', 'yea', 'against_party'),
    (rc, 'rand_paul', 'nay', 'with_party'),
    (rc, 'reed', 'yea', 'with_party'),
    (rc, 'risch', 'nay', 'with_party'),
    (rc, 'rosen', 'yea', 'with_party'),
    (rc, 'rubio', 'nay', 'with_party'),
    (rc, 'sanders', 'yea', 'with_party'),
    (rc, 'schumer', 'yea', 'with_party'),
    (rc, 'shaheen', 'yea', 'with_party'),
    (rc, 'thune', 'nay', 'with_party'),
    (rc, 'tim_scott', 'nay', 'with_party'),
    (rc, 'van_hollen', 'yea', 'with_party'),
    (rc, 'warnock', 'yea', 'with_party'),
    (rc, 'warren', 'yea', 'with_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- house 117/2 roll 299 — S. 2938: On Concurring in the Senate Amendments to the House Amendment
  --   234-193, 50 roster attribution(s) · U.S. House Clerk
  SELECT id INTO rc FROM vr_rollcalls
   WHERE chamber = 'house' AND congress = 117 AND session = 2
     AND roll_number = 299;
  IF rc IS NULL THEN
    RAISE EXCEPTION 'Phase A re-attribution: house 117/2 roll 299 is missing — 20260811000000_vr_phase_a_117_118_rollcalls.sql must run first; this migration never creates a roll call because it holds none of the verified question, tally or source';
  END IF;
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'adam_smith', 'yea', 'with_party'),
    (rc, 'andy_kim', 'yea', 'with_party'),
    (rc, 'aoc', 'yea', 'with_party'),
    (rc, 'bennie_thompson', 'yea', 'with_party'),
    (rc, 'boebert', 'nay', 'with_party'),
    (rc, 'brian_mast', 'nay', 'with_party'),
    (rc, 'bruce_westerman', 'nay', 'with_party'),
    (rc, 'cstewart', 'nay', 'with_party'),
    (rc, 'curtis', 'nay', 'with_party'),
    (rc, 'don_bacon', 'nay', 'with_party'),
    (rc, 'emmer', 'nay', 'with_party'),
    (rc, 'frank_lucas', 'nay', 'with_party'),
    (rc, 'french_hill', 'nay', 'with_party'),
    (rc, 'gaetz', 'nay', 'with_party'),
    (rc, 'gallego', 'yea', 'with_party'),
    (rc, 'haley_stevens', 'yea', 'with_party'),
    (rc, 'jake_auchincloss', 'yea', 'with_party'),
    (rc, 'jason_smith', 'nay', 'with_party'),
    (rc, 'jayapal', 'yea', 'with_party'),
    (rc, 'jeffries', 'yea', 'with_party'),
    (rc, 'jim_jordan', 'nay', 'with_party'),
    (rc, 'josh_gottheimer', 'yea', 'with_party'),
    (rc, 'kclark', 'yea', 'with_party'),
    (rc, 'khanna', 'yea', 'with_party'),
    (rc, 'mariannette_miller_meeks', 'nay', 'with_party'),
    (rc, 'massie', 'nay', 'with_party'),
    (rc, 'maxine_waters', 'yea', 'with_party'),
    (rc, 'meeks', 'yea', 'with_party'),
    (rc, 'michael_guest', 'nay', 'with_party'),
    (rc, 'mike_johnson', 'nay', 'with_party'),
    (rc, 'mike_simpson', 'nay', 'with_party'),
    (rc, 'mike_waltz', 'nay', 'with_party'),
    (rc, 'mtg', 'nay', 'with_party'),
    (rc, 'omar', 'yea', 'with_party'),
    (rc, 'owens', 'nay', 'with_party'),
    (rc, 'rick_crawford', 'nay', 'with_party'),
    (rc, 'scalise', 'nay', 'with_party'),
    (rc, 'schiff', 'yea', 'with_party'),
    (rc, 'scott_perry', 'nay', 'with_party'),
    (rc, 'slotkin', 'yea', 'with_party'),
    (rc, 'stefanik', 'nay', 'with_party'),
    (rc, 'steny_hoyer', 'yea', 'with_party'),
    (rc, 'stephanie_bice', 'nay', 'with_party'),
    (rc, 'steve_womack', 'nay', 'with_party'),
    (rc, 'tlaib', 'yea', 'with_party'),
    (rc, 'tom_cole', 'nay', 'with_party'),
    (rc, 'tom_suozzi', 'yea', 'with_party'),
    (rc, 'torres', 'yea', 'with_party'),
    (rc, 'trent_kelly', 'nay', 'with_party'),
    (rc, 'zeldin', 'not_voting', NULL)
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- house 117/2 roll 309 — S. 3373: On Passage
  --   342-88, 51 roster attribution(s) · U.S. House Clerk
  SELECT id INTO rc FROM vr_rollcalls
   WHERE chamber = 'house' AND congress = 117 AND session = 2
     AND roll_number = 309;
  IF rc IS NULL THEN
    RAISE EXCEPTION 'Phase A re-attribution: house 117/2 roll 309 is missing — 20260811000000_vr_phase_a_117_118_rollcalls.sql must run first; this migration never creates a roll call because it holds none of the verified question, tally or source';
  END IF;
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'adam_smith', 'yea', 'with_party'),
    (rc, 'andy_kim', 'yea', 'with_party'),
    (rc, 'aoc', 'yea', 'with_party'),
    (rc, 'bennie_thompson', 'yea', 'with_party'),
    (rc, 'boebert', 'nay', 'against_party'),
    (rc, 'brian_mast', 'yea', 'with_party'),
    (rc, 'bruce_westerman', 'nay', 'against_party'),
    (rc, 'cstewart', 'nay', 'against_party'),
    (rc, 'curtis', 'nay', 'against_party'),
    (rc, 'don_bacon', 'yea', 'with_party'),
    (rc, 'emmer', 'nay', 'against_party'),
    (rc, 'frank_lucas', 'yea', 'with_party'),
    (rc, 'french_hill', 'yea', 'with_party'),
    (rc, 'gaetz', 'yea', 'with_party'),
    (rc, 'gallego', 'yea', 'with_party'),
    (rc, 'haley_stevens', 'yea', 'with_party'),
    (rc, 'jake_auchincloss', 'yea', 'with_party'),
    (rc, 'jason_smith', 'nay', 'against_party'),
    (rc, 'jayapal', 'yea', 'with_party'),
    (rc, 'jeffries', 'yea', 'with_party'),
    (rc, 'jim_jordan', 'nay', 'against_party'),
    (rc, 'josh_gottheimer', 'yea', 'with_party'),
    (rc, 'kclark', 'yea', 'with_party'),
    (rc, 'khanna', 'yea', 'with_party'),
    (rc, 'mariannette_miller_meeks', 'yea', 'with_party'),
    (rc, 'massie', 'yea', 'with_party'),
    (rc, 'maxine_waters', 'yea', 'with_party'),
    (rc, 'meeks', 'yea', 'with_party'),
    (rc, 'michael_guest', 'nay', 'against_party'),
    (rc, 'mike_flood', 'yea', 'with_party'),
    (rc, 'mike_johnson', 'nay', 'against_party'),
    (rc, 'mike_simpson', 'nay', 'against_party'),
    (rc, 'mike_waltz', 'yea', 'with_party'),
    (rc, 'mtg', 'nay', 'against_party'),
    (rc, 'omar', 'yea', 'with_party'),
    (rc, 'owens', 'nay', 'against_party'),
    (rc, 'rick_crawford', 'nay', 'against_party'),
    (rc, 'scalise', 'nay', 'against_party'),
    (rc, 'schiff', 'yea', 'with_party'),
    (rc, 'scott_perry', 'nay', 'against_party'),
    (rc, 'slotkin', 'yea', 'with_party'),
    (rc, 'stefanik', 'yea', 'with_party'),
    (rc, 'steny_hoyer', 'yea', 'with_party'),
    (rc, 'stephanie_bice', 'yea', 'with_party'),
    (rc, 'steve_womack', 'yea', 'with_party'),
    (rc, 'tlaib', 'yea', 'with_party'),
    (rc, 'tom_cole', 'yea', 'with_party'),
    (rc, 'tom_suozzi', 'yea', 'with_party'),
    (rc, 'torres', 'yea', 'with_party'),
    (rc, 'trent_kelly', 'nay', 'against_party'),
    (rc, 'zeldin', 'yea', 'with_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- senate 117/2 roll 271 — H.R. 4346: On the Motion (Motion to Concur in the House Amendment to the Senate Amendment to H.R. 4346 with Amendment No. 5135,)
  --   64-33, 31 roster attribution(s) · U.S. Senate
  SELECT id INTO rc FROM vr_rollcalls
   WHERE chamber = 'senate' AND congress = 117 AND session = 2
     AND roll_number = 271;
  IF rc IS NULL THEN
    RAISE EXCEPTION 'Phase A re-attribution: senate 117/2 roll 271 is missing — 20260811000000_vr_phase_a_117_118_rollcalls.sql must run first; this migration never creates a roll call because it holds none of the verified question, tally or source';
  END IF;
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'barrasso', 'nay', 'with_party'),
    (rc, 'booker', 'yea', 'with_party'),
    (rc, 'chris_murphy', 'yea', 'with_party'),
    (rc, 'collins', 'yea', 'against_party'),
    (rc, 'cruz', 'nay', 'with_party'),
    (rc, 'durbin', 'yea', 'with_party'),
    (rc, 'ernst', 'nay', 'with_party'),
    (rc, 'graham', 'yea', 'against_party'),
    (rc, 'grassley', 'nay', 'with_party'),
    (rc, 'hawley', 'nay', 'with_party'),
    (rc, 'john_cornyn', 'yea', 'against_party'),
    (rc, 'jon_ossoff', 'yea', 'with_party'),
    (rc, 'kaine', 'yea', 'with_party'),
    (rc, 'lankford', 'nay', 'with_party'),
    (rc, 'lee', 'nay', 'with_party'),
    (rc, 'mark_kelly', 'yea', 'with_party'),
    (rc, 'mcconnell', 'yea', 'against_party'),
    (rc, 'murkowski', 'not_voting', NULL),
    (rc, 'rand_paul', 'nay', 'with_party'),
    (rc, 'reed', 'yea', 'with_party'),
    (rc, 'risch', 'nay', 'with_party'),
    (rc, 'rosen', 'yea', 'with_party'),
    (rc, 'rubio', 'nay', 'with_party'),
    (rc, 'sanders', 'nay', 'against_party'),
    (rc, 'schumer', 'yea', 'with_party'),
    (rc, 'shaheen', 'yea', 'with_party'),
    (rc, 'thune', 'nay', 'with_party'),
    (rc, 'tim_scott', 'nay', 'with_party'),
    (rc, 'van_hollen', 'yea', 'with_party'),
    (rc, 'warnock', 'yea', 'with_party'),
    (rc, 'warren', 'yea', 'with_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- house 117/2 roll 404 — H.R. 4346: On Motion to Concur in the Senate Adt to the House Adt to the Senate Adt
  --   243-187, 51 roster attribution(s) · U.S. House Clerk
  SELECT id INTO rc FROM vr_rollcalls
   WHERE chamber = 'house' AND congress = 117 AND session = 2
     AND roll_number = 404;
  IF rc IS NULL THEN
    RAISE EXCEPTION 'Phase A re-attribution: house 117/2 roll 404 is missing — 20260811000000_vr_phase_a_117_118_rollcalls.sql must run first; this migration never creates a roll call because it holds none of the verified question, tally or source';
  END IF;
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'adam_smith', 'yea', 'with_party'),
    (rc, 'andy_kim', 'yea', 'with_party'),
    (rc, 'aoc', 'yea', 'with_party'),
    (rc, 'bennie_thompson', 'yea', 'with_party'),
    (rc, 'boebert', 'nay', 'with_party'),
    (rc, 'brian_mast', 'nay', 'with_party'),
    (rc, 'bruce_westerman', 'nay', 'with_party'),
    (rc, 'cstewart', 'nay', 'with_party'),
    (rc, 'curtis', 'nay', 'with_party'),
    (rc, 'don_bacon', 'nay', 'with_party'),
    (rc, 'emmer', 'nay', 'with_party'),
    (rc, 'frank_lucas', 'nay', 'with_party'),
    (rc, 'french_hill', 'nay', 'with_party'),
    (rc, 'gaetz', 'nay', 'with_party'),
    (rc, 'gallego', 'yea', 'with_party'),
    (rc, 'haley_stevens', 'yea', 'with_party'),
    (rc, 'jake_auchincloss', 'yea', 'with_party'),
    (rc, 'jason_smith', 'nay', 'with_party'),
    (rc, 'jayapal', 'yea', 'with_party'),
    (rc, 'jeffries', 'yea', 'with_party'),
    (rc, 'jim_jordan', 'nay', 'with_party'),
    (rc, 'josh_gottheimer', 'yea', 'with_party'),
    (rc, 'kclark', 'yea', 'with_party'),
    (rc, 'khanna', 'yea', 'with_party'),
    (rc, 'mariannette_miller_meeks', 'nay', 'with_party'),
    (rc, 'massie', 'nay', 'with_party'),
    (rc, 'maxine_waters', 'yea', 'with_party'),
    (rc, 'meeks', 'yea', 'with_party'),
    (rc, 'michael_guest', 'nay', 'with_party'),
    (rc, 'mike_flood', 'nay', 'with_party'),
    (rc, 'mike_johnson', 'nay', 'with_party'),
    (rc, 'mike_simpson', 'nay', 'with_party'),
    (rc, 'mike_waltz', 'nay', 'with_party'),
    (rc, 'mtg', 'nay', 'with_party'),
    (rc, 'omar', 'yea', 'with_party'),
    (rc, 'owens', 'nay', 'with_party'),
    (rc, 'rick_crawford', 'nay', 'with_party'),
    (rc, 'scalise', 'nay', 'with_party'),
    (rc, 'schiff', 'yea', 'with_party'),
    (rc, 'scott_perry', 'nay', 'with_party'),
    (rc, 'slotkin', 'yea', 'with_party'),
    (rc, 'stefanik', 'nay', 'with_party'),
    (rc, 'steny_hoyer', 'yea', 'with_party'),
    (rc, 'stephanie_bice', 'nay', 'with_party'),
    (rc, 'steve_womack', 'nay', 'with_party'),
    (rc, 'tlaib', 'yea', 'with_party'),
    (rc, 'tom_cole', 'yea', 'against_party'),
    (rc, 'tom_suozzi', 'yea', 'with_party'),
    (rc, 'torres', 'yea', 'with_party'),
    (rc, 'trent_kelly', 'nay', 'with_party'),
    (rc, 'zeldin', 'nay', 'with_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- senate 117/2 roll 280 — S. 3373: On the Motion (Motion to Concur in the House Amendment to S.3373)
  --   86-11, 31 roster attribution(s) · U.S. Senate
  SELECT id INTO rc FROM vr_rollcalls
   WHERE chamber = 'senate' AND congress = 117 AND session = 2
     AND roll_number = 280;
  IF rc IS NULL THEN
    RAISE EXCEPTION 'Phase A re-attribution: senate 117/2 roll 280 is missing — 20260811000000_vr_phase_a_117_118_rollcalls.sql must run first; this migration never creates a roll call because it holds none of the verified question, tally or source';
  END IF;
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'barrasso', 'yea', 'with_party'),
    (rc, 'booker', 'yea', 'with_party'),
    (rc, 'chris_murphy', 'yea', 'with_party'),
    (rc, 'collins', 'yea', 'with_party'),
    (rc, 'cruz', 'yea', 'with_party'),
    (rc, 'durbin', 'yea', 'with_party'),
    (rc, 'ernst', 'yea', 'with_party'),
    (rc, 'graham', 'yea', 'with_party'),
    (rc, 'grassley', 'yea', 'with_party'),
    (rc, 'hawley', 'yea', 'with_party'),
    (rc, 'john_cornyn', 'not_voting', NULL),
    (rc, 'jon_ossoff', 'yea', 'with_party'),
    (rc, 'kaine', 'yea', 'with_party'),
    (rc, 'lankford', 'nay', 'against_party'),
    (rc, 'lee', 'nay', 'against_party'),
    (rc, 'mark_kelly', 'yea', 'with_party'),
    (rc, 'mcconnell', 'yea', 'with_party'),
    (rc, 'murkowski', 'yea', 'with_party'),
    (rc, 'rand_paul', 'nay', 'against_party'),
    (rc, 'reed', 'yea', 'with_party'),
    (rc, 'risch', 'nay', 'against_party'),
    (rc, 'rosen', 'yea', 'with_party'),
    (rc, 'rubio', 'yea', 'with_party'),
    (rc, 'sanders', 'yea', 'with_party'),
    (rc, 'schumer', 'yea', 'with_party'),
    (rc, 'shaheen', 'yea', 'with_party'),
    (rc, 'thune', 'yea', 'with_party'),
    (rc, 'tim_scott', 'yea', 'with_party'),
    (rc, 'van_hollen', 'yea', 'with_party'),
    (rc, 'warnock', 'yea', 'with_party'),
    (rc, 'warren', 'yea', 'with_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- senate 117/2 roll 325 — H.R. 5376: On Passage of the Bill H.R. 5376
  --   50-50, 31 roster attribution(s) · U.S. Senate
  SELECT id INTO rc FROM vr_rollcalls
   WHERE chamber = 'senate' AND congress = 117 AND session = 2
     AND roll_number = 325;
  IF rc IS NULL THEN
    RAISE EXCEPTION 'Phase A re-attribution: senate 117/2 roll 325 is missing — 20260811000000_vr_phase_a_117_118_rollcalls.sql must run first; this migration never creates a roll call because it holds none of the verified question, tally or source';
  END IF;
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'barrasso', 'nay', 'with_party'),
    (rc, 'booker', 'yea', 'with_party'),
    (rc, 'chris_murphy', 'yea', 'with_party'),
    (rc, 'collins', 'nay', 'with_party'),
    (rc, 'cruz', 'nay', 'with_party'),
    (rc, 'durbin', 'yea', 'with_party'),
    (rc, 'ernst', 'nay', 'with_party'),
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
    (rc, 'rosen', 'yea', 'with_party'),
    (rc, 'rubio', 'nay', 'with_party'),
    (rc, 'sanders', 'yea', 'with_party'),
    (rc, 'schumer', 'yea', 'with_party'),
    (rc, 'shaheen', 'yea', 'with_party'),
    (rc, 'thune', 'nay', 'with_party'),
    (rc, 'tim_scott', 'nay', 'with_party'),
    (rc, 'van_hollen', 'yea', 'with_party'),
    (rc, 'warnock', 'yea', 'with_party'),
    (rc, 'warren', 'yea', 'with_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- house 117/2 roll 420 — H.R. 5376: On Motion to Concur in the Senate Amendment
  --   220-207, 51 roster attribution(s) · U.S. House Clerk
  SELECT id INTO rc FROM vr_rollcalls
   WHERE chamber = 'house' AND congress = 117 AND session = 2
     AND roll_number = 420;
  IF rc IS NULL THEN
    RAISE EXCEPTION 'Phase A re-attribution: house 117/2 roll 420 is missing — 20260811000000_vr_phase_a_117_118_rollcalls.sql must run first; this migration never creates a roll call because it holds none of the verified question, tally or source';
  END IF;
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'adam_smith', 'yea', 'with_party'),
    (rc, 'andy_kim', 'yea', 'with_party'),
    (rc, 'aoc', 'yea', 'with_party'),
    (rc, 'bennie_thompson', 'yea', 'with_party'),
    (rc, 'boebert', 'nay', 'with_party'),
    (rc, 'brian_mast', 'nay', 'with_party'),
    (rc, 'bruce_westerman', 'nay', 'with_party'),
    (rc, 'cstewart', 'nay', 'with_party'),
    (rc, 'curtis', 'nay', 'with_party'),
    (rc, 'don_bacon', 'nay', 'with_party'),
    (rc, 'emmer', 'nay', 'with_party'),
    (rc, 'frank_lucas', 'nay', 'with_party'),
    (rc, 'french_hill', 'nay', 'with_party'),
    (rc, 'gaetz', 'nay', 'with_party'),
    (rc, 'gallego', 'yea', 'with_party'),
    (rc, 'haley_stevens', 'yea', 'with_party'),
    (rc, 'jake_auchincloss', 'yea', 'with_party'),
    (rc, 'jason_smith', 'nay', 'with_party'),
    (rc, 'jayapal', 'yea', 'with_party'),
    (rc, 'jeffries', 'yea', 'with_party'),
    (rc, 'jim_jordan', 'nay', 'with_party'),
    (rc, 'josh_gottheimer', 'yea', 'with_party'),
    (rc, 'kclark', 'yea', 'with_party'),
    (rc, 'khanna', 'yea', 'with_party'),
    (rc, 'mariannette_miller_meeks', 'nay', 'with_party'),
    (rc, 'massie', 'nay', 'with_party'),
    (rc, 'maxine_waters', 'yea', 'with_party'),
    (rc, 'meeks', 'yea', 'with_party'),
    (rc, 'michael_guest', 'nay', 'with_party'),
    (rc, 'mike_flood', 'nay', 'with_party'),
    (rc, 'mike_johnson', 'nay', 'with_party'),
    (rc, 'mike_simpson', 'nay', 'with_party'),
    (rc, 'mike_waltz', 'nay', 'with_party'),
    (rc, 'mtg', 'nay', 'with_party'),
    (rc, 'omar', 'yea', 'with_party'),
    (rc, 'owens', 'nay', 'with_party'),
    (rc, 'rick_crawford', 'nay', 'with_party'),
    (rc, 'scalise', 'nay', 'with_party'),
    (rc, 'schiff', 'yea', 'with_party'),
    (rc, 'scott_perry', 'nay', 'with_party'),
    (rc, 'slotkin', 'yea', 'with_party'),
    (rc, 'stefanik', 'nay', 'with_party'),
    (rc, 'steny_hoyer', 'yea', 'with_party'),
    (rc, 'stephanie_bice', 'nay', 'with_party'),
    (rc, 'steve_womack', 'nay', 'with_party'),
    (rc, 'tlaib', 'yea', 'with_party'),
    (rc, 'tom_cole', 'nay', 'with_party'),
    (rc, 'tom_suozzi', 'yea', 'with_party'),
    (rc, 'torres', 'yea', 'with_party'),
    (rc, 'trent_kelly', 'nay', 'with_party'),
    (rc, 'zeldin', 'nay', 'with_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- senate 117/2 roll 362 — H.R. 8404: On Passage of the Bill H.R. 8404
  --   61-36, 31 roster attribution(s) · U.S. Senate
  SELECT id INTO rc FROM vr_rollcalls
   WHERE chamber = 'senate' AND congress = 117 AND session = 2
     AND roll_number = 362;
  IF rc IS NULL THEN
    RAISE EXCEPTION 'Phase A re-attribution: senate 117/2 roll 362 is missing — 20260811000000_vr_phase_a_117_118_rollcalls.sql must run first; this migration never creates a roll call because it holds none of the verified question, tally or source';
  END IF;
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'barrasso', 'nay', 'with_party'),
    (rc, 'booker', 'yea', 'with_party'),
    (rc, 'chris_murphy', 'yea', 'with_party'),
    (rc, 'collins', 'yea', 'against_party'),
    (rc, 'cruz', 'nay', 'with_party'),
    (rc, 'durbin', 'yea', 'with_party'),
    (rc, 'ernst', 'yea', 'against_party'),
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
    (rc, 'murkowski', 'yea', 'against_party'),
    (rc, 'rand_paul', 'nay', 'with_party'),
    (rc, 'reed', 'yea', 'with_party'),
    (rc, 'risch', 'nay', 'with_party'),
    (rc, 'rosen', 'yea', 'with_party'),
    (rc, 'rubio', 'nay', 'with_party'),
    (rc, 'sanders', 'yea', 'with_party'),
    (rc, 'schumer', 'yea', 'with_party'),
    (rc, 'shaheen', 'yea', 'with_party'),
    (rc, 'thune', 'nay', 'with_party'),
    (rc, 'tim_scott', 'nay', 'with_party'),
    (rc, 'van_hollen', 'yea', 'with_party'),
    (rc, 'warnock', 'not_voting', NULL),
    (rc, 'warren', 'yea', 'with_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- house 117/2 roll 513 — H.R. 8404: On Motion to Concur in the Senate Amendment
  --   258-169, 51 roster attribution(s) · U.S. House Clerk
  SELECT id INTO rc FROM vr_rollcalls
   WHERE chamber = 'house' AND congress = 117 AND session = 2
     AND roll_number = 513;
  IF rc IS NULL THEN
    RAISE EXCEPTION 'Phase A re-attribution: house 117/2 roll 513 is missing — 20260811000000_vr_phase_a_117_118_rollcalls.sql must run first; this migration never creates a roll call because it holds none of the verified question, tally or source';
  END IF;
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'adam_smith', 'yea', 'with_party'),
    (rc, 'andy_kim', 'yea', 'with_party'),
    (rc, 'aoc', 'yea', 'with_party'),
    (rc, 'bennie_thompson', 'yea', 'with_party'),
    (rc, 'boebert', 'nay', 'with_party'),
    (rc, 'brian_mast', 'nay', 'with_party'),
    (rc, 'bruce_westerman', 'nay', 'with_party'),
    (rc, 'cstewart', 'yea', 'against_party'),
    (rc, 'curtis', 'yea', 'against_party'),
    (rc, 'don_bacon', 'yea', 'against_party'),
    (rc, 'emmer', 'yea', 'against_party'),
    (rc, 'frank_lucas', 'nay', 'with_party'),
    (rc, 'french_hill', 'nay', 'with_party'),
    (rc, 'gaetz', 'nay', 'with_party'),
    (rc, 'gallego', 'yea', 'with_party'),
    (rc, 'haley_stevens', 'yea', 'with_party'),
    (rc, 'jake_auchincloss', 'yea', 'with_party'),
    (rc, 'jason_smith', 'nay', 'with_party'),
    (rc, 'jayapal', 'yea', 'with_party'),
    (rc, 'jeffries', 'yea', 'with_party'),
    (rc, 'jim_jordan', 'nay', 'with_party'),
    (rc, 'josh_gottheimer', 'yea', 'with_party'),
    (rc, 'kclark', 'yea', 'with_party'),
    (rc, 'khanna', 'yea', 'with_party'),
    (rc, 'mariannette_miller_meeks', 'yea', 'against_party'),
    (rc, 'massie', 'nay', 'with_party'),
    (rc, 'maxine_waters', 'yea', 'with_party'),
    (rc, 'meeks', 'yea', 'with_party'),
    (rc, 'michael_guest', 'nay', 'with_party'),
    (rc, 'mike_flood', 'nay', 'with_party'),
    (rc, 'mike_johnson', 'nay', 'with_party'),
    (rc, 'mike_simpson', 'yea', 'against_party'),
    (rc, 'mike_waltz', 'yea', 'against_party'),
    (rc, 'mtg', 'nay', 'with_party'),
    (rc, 'omar', 'yea', 'with_party'),
    (rc, 'owens', 'present', NULL),
    (rc, 'rick_crawford', 'nay', 'with_party'),
    (rc, 'scalise', 'nay', 'with_party'),
    (rc, 'schiff', 'yea', 'with_party'),
    (rc, 'scott_perry', 'nay', 'with_party'),
    (rc, 'slotkin', 'yea', 'with_party'),
    (rc, 'stefanik', 'yea', 'against_party'),
    (rc, 'steny_hoyer', 'yea', 'with_party'),
    (rc, 'stephanie_bice', 'nay', 'with_party'),
    (rc, 'steve_womack', 'nay', 'with_party'),
    (rc, 'tlaib', 'yea', 'with_party'),
    (rc, 'tom_cole', 'nay', 'with_party'),
    (rc, 'tom_suozzi', 'yea', 'with_party'),
    (rc, 'torres', 'yea', 'with_party'),
    (rc, 'trent_kelly', 'nay', 'with_party'),
    (rc, 'zeldin', 'not_voting', NULL)
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- senate 117/2 roll 396 — H.R. 7776: On the Motion (Motion to Concur in the House Amendment to the Senate Amendment to H.R. 7776)
  --   83-11, 31 roster attribution(s) · U.S. Senate
  SELECT id INTO rc FROM vr_rollcalls
   WHERE chamber = 'senate' AND congress = 117 AND session = 2
     AND roll_number = 396;
  IF rc IS NULL THEN
    RAISE EXCEPTION 'Phase A re-attribution: senate 117/2 roll 396 is missing — 20260811000000_vr_phase_a_117_118_rollcalls.sql must run first; this migration never creates a roll call because it holds none of the verified question, tally or source';
  END IF;
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'barrasso', 'not_voting', NULL),
    (rc, 'booker', 'nay', 'against_party'),
    (rc, 'chris_murphy', 'yea', 'with_party'),
    (rc, 'collins', 'yea', 'with_party'),
    (rc, 'cruz', 'not_voting', NULL),
    (rc, 'durbin', 'yea', 'with_party'),
    (rc, 'ernst', 'yea', 'with_party'),
    (rc, 'graham', 'yea', 'with_party'),
    (rc, 'grassley', 'yea', 'with_party'),
    (rc, 'hawley', 'nay', 'against_party'),
    (rc, 'john_cornyn', 'yea', 'with_party'),
    (rc, 'jon_ossoff', 'yea', 'with_party'),
    (rc, 'kaine', 'yea', 'with_party'),
    (rc, 'lankford', 'yea', 'with_party'),
    (rc, 'lee', 'nay', 'against_party'),
    (rc, 'mark_kelly', 'yea', 'with_party'),
    (rc, 'mcconnell', 'yea', 'with_party'),
    (rc, 'murkowski', 'yea', 'with_party'),
    (rc, 'rand_paul', 'nay', 'against_party'),
    (rc, 'reed', 'yea', 'with_party'),
    (rc, 'risch', 'yea', 'with_party'),
    (rc, 'rosen', 'yea', 'with_party'),
    (rc, 'rubio', 'yea', 'with_party'),
    (rc, 'sanders', 'nay', 'against_party'),
    (rc, 'schumer', 'yea', 'with_party'),
    (rc, 'shaheen', 'yea', 'with_party'),
    (rc, 'thune', 'yea', 'with_party'),
    (rc, 'tim_scott', 'yea', 'with_party'),
    (rc, 'van_hollen', 'yea', 'with_party'),
    (rc, 'warnock', 'yea', 'with_party'),
    (rc, 'warren', 'nay', 'against_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- house 118/1 roll 243 — H.R. 3746: On Passage
  --   314-117, 58 roster attribution(s) · U.S. House Clerk
  SELECT id INTO rc FROM vr_rollcalls
   WHERE chamber = 'house' AND congress = 118 AND session = 1
     AND roll_number = 243;
  IF rc IS NULL THEN
    RAISE EXCEPTION 'Phase A re-attribution: house 118/1 roll 243 is missing — 20260811000000_vr_phase_a_117_118_rollcalls.sql must run first; this migration never creates a roll call because it holds none of the verified question, tally or source';
  END IF;
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'adam_smith', 'yea', 'with_party'),
    (rc, 'andy_kim', 'yea', 'with_party'),
    (rc, 'aoc', 'nay', 'against_party'),
    (rc, 'bennie_thompson', 'yea', 'with_party'),
    (rc, 'boebert', 'not_voting', NULL),
    (rc, 'brian_mast', 'nay', 'against_party'),
    (rc, 'bruce_westerman', 'yea', 'with_party'),
    (rc, 'crockett', 'nay', 'against_party'),
    (rc, 'cstewart', 'yea', 'with_party'),
    (rc, 'curtis', 'yea', 'with_party'),
    (rc, 'dan_goldman', 'nay', 'against_party'),
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
    (rc, 'josh_brecheen', 'nay', 'against_party'),
    (rc, 'josh_gottheimer', 'yea', 'with_party'),
    (rc, 'kclark', 'yea', 'with_party'),
    (rc, 'khanna', 'nay', 'against_party'),
    (rc, 'mariannette_miller_meeks', 'yea', 'with_party'),
    (rc, 'massie', 'yea', 'with_party'),
    (rc, 'maxine_waters', 'yea', 'with_party'),
    (rc, 'meeks', 'yea', 'with_party'),
    (rc, 'michael_guest', 'nay', 'against_party'),
    (rc, 'mike_collins', 'nay', 'against_party'),
    (rc, 'mike_ezell', 'yea', 'with_party'),
    (rc, 'mike_flood', 'yea', 'with_party'),
    (rc, 'mike_johnson', 'yea', 'with_party'),
    (rc, 'mike_lawler', 'yea', 'with_party'),
    (rc, 'mike_simpson', 'yea', 'with_party'),
    (rc, 'mike_waltz', 'nay', 'against_party'),
    (rc, 'mtg', 'yea', 'with_party'),
    (rc, 'omar', 'yea', 'with_party'),
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
    (rc, 'torres', 'nay', 'against_party'),
    (rc, 'trent_kelly', 'yea', 'with_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- senate 118/1 roll 146 — H.R. 3746: On Passage of the Bill H.R. 3746
  --   63-36, 33 roster attribution(s) · U.S. Senate
  SELECT id INTO rc FROM vr_rollcalls
   WHERE chamber = 'senate' AND congress = 118 AND session = 1
     AND roll_number = 146;
  IF rc IS NULL THEN
    RAISE EXCEPTION 'Phase A re-attribution: senate 118/1 roll 146 is missing — 20260811000000_vr_phase_a_117_118_rollcalls.sql must run first; this migration never creates a roll call because it holds none of the verified question, tally or source';
  END IF;
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'barrasso', 'nay', 'with_party'),
    (rc, 'booker', 'yea', 'with_party'),
    (rc, 'britt', 'nay', 'with_party'),
    (rc, 'chris_murphy', 'yea', 'with_party'),
    (rc, 'collins', 'yea', 'against_party'),
    (rc, 'cruz', 'nay', 'with_party'),
    (rc, 'durbin', 'yea', 'with_party'),
    (rc, 'ernst', 'yea', 'against_party'),
    (rc, 'fetterman', 'nay', 'against_party'),
    (rc, 'graham', 'nay', 'with_party'),
    (rc, 'grassley', 'yea', 'against_party'),
    (rc, 'hawley', 'nay', 'with_party'),
    (rc, 'john_cornyn', 'yea', 'against_party'),
    (rc, 'jon_ossoff', 'yea', 'with_party'),
    (rc, 'kaine', 'yea', 'with_party'),
    (rc, 'lankford', 'nay', 'with_party'),
    (rc, 'lee', 'nay', 'with_party'),
    (rc, 'mark_kelly', 'yea', 'with_party'),
    (rc, 'mcconnell', 'yea', 'against_party'),
    (rc, 'murkowski', 'yea', 'against_party'),
    (rc, 'rand_paul', 'nay', 'with_party'),
    (rc, 'reed', 'yea', 'with_party'),
    (rc, 'risch', 'nay', 'with_party'),
    (rc, 'rosen', 'yea', 'with_party'),
    (rc, 'rubio', 'nay', 'with_party'),
    (rc, 'sanders', 'nay', 'against_party'),
    (rc, 'schumer', 'yea', 'with_party'),
    (rc, 'shaheen', 'yea', 'with_party'),
    (rc, 'thune', 'yea', 'against_party'),
    (rc, 'tim_scott', 'nay', 'with_party'),
    (rc, 'van_hollen', 'yea', 'with_party'),
    (rc, 'warnock', 'yea', 'with_party'),
    (rc, 'warren', 'nay', 'against_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- senate 118/1 roll 343 — H.R. 2670: On the Conference Report H.R. 2670
  --   87-13, 33 roster attribution(s) · U.S. Senate
  SELECT id INTO rc FROM vr_rollcalls
   WHERE chamber = 'senate' AND congress = 118 AND session = 1
     AND roll_number = 343;
  IF rc IS NULL THEN
    RAISE EXCEPTION 'Phase A re-attribution: senate 118/1 roll 343 is missing — 20260811000000_vr_phase_a_117_118_rollcalls.sql must run first; this migration never creates a roll call because it holds none of the verified question, tally or source';
  END IF;
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'barrasso', 'yea', 'with_party'),
    (rc, 'booker', 'nay', 'against_party'),
    (rc, 'britt', 'yea', 'with_party'),
    (rc, 'chris_murphy', 'yea', 'with_party'),
    (rc, 'collins', 'yea', 'with_party'),
    (rc, 'cruz', 'yea', 'with_party'),
    (rc, 'durbin', 'yea', 'with_party'),
    (rc, 'ernst', 'yea', 'with_party'),
    (rc, 'fetterman', 'yea', 'with_party'),
    (rc, 'graham', 'yea', 'with_party'),
    (rc, 'grassley', 'yea', 'with_party'),
    (rc, 'hawley', 'nay', 'against_party'),
    (rc, 'john_cornyn', 'yea', 'with_party'),
    (rc, 'jon_ossoff', 'yea', 'with_party'),
    (rc, 'kaine', 'yea', 'with_party'),
    (rc, 'lankford', 'yea', 'with_party'),
    (rc, 'lee', 'nay', 'against_party'),
    (rc, 'mark_kelly', 'yea', 'with_party'),
    (rc, 'mcconnell', 'yea', 'with_party'),
    (rc, 'murkowski', 'yea', 'with_party'),
    (rc, 'rand_paul', 'nay', 'against_party'),
    (rc, 'reed', 'yea', 'with_party'),
    (rc, 'risch', 'yea', 'with_party'),
    (rc, 'rosen', 'yea', 'with_party'),
    (rc, 'rubio', 'yea', 'with_party'),
    (rc, 'sanders', 'nay', 'against_party'),
    (rc, 'schumer', 'yea', 'with_party'),
    (rc, 'shaheen', 'yea', 'with_party'),
    (rc, 'thune', 'yea', 'with_party'),
    (rc, 'tim_scott', 'yea', 'with_party'),
    (rc, 'van_hollen', 'yea', 'with_party'),
    (rc, 'warnock', 'yea', 'with_party'),
    (rc, 'warren', 'nay', 'against_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- house 118/1 roll 723 — H.R. 2670: On Motion to Suspend the Rules and Agree to the Conference Report
  --   310-118, 57 roster attribution(s) · U.S. House Clerk
  SELECT id INTO rc FROM vr_rollcalls
   WHERE chamber = 'house' AND congress = 118 AND session = 1
     AND roll_number = 723;
  IF rc IS NULL THEN
    RAISE EXCEPTION 'Phase A re-attribution: house 118/1 roll 723 is missing — 20260811000000_vr_phase_a_117_118_rollcalls.sql must run first; this migration never creates a roll call because it holds none of the verified question, tally or source';
  END IF;
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'adam_smith', 'yea', 'with_party'),
    (rc, 'andy_kim', 'yea', 'with_party'),
    (rc, 'aoc', 'nay', 'against_party'),
    (rc, 'bennie_thompson', 'yea', 'with_party'),
    (rc, 'boebert', 'yea', 'with_party'),
    (rc, 'brian_mast', 'nay', 'against_party'),
    (rc, 'bruce_westerman', 'yea', 'with_party'),
    (rc, 'crockett', 'yea', 'with_party'),
    (rc, 'curtis', 'nay', 'against_party'),
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
    (rc, 'jake_auchincloss', 'nay', 'against_party'),
    (rc, 'jason_smith', 'yea', 'with_party'),
    (rc, 'jayapal', 'nay', 'against_party'),
    (rc, 'jeffries', 'yea', 'with_party'),
    (rc, 'jim_jordan', 'nay', 'against_party'),
    (rc, 'josh_brecheen', 'nay', 'against_party'),
    (rc, 'josh_gottheimer', 'yea', 'with_party'),
    (rc, 'kclark', 'yea', 'with_party'),
    (rc, 'khanna', 'nay', 'against_party'),
    (rc, 'mariannette_miller_meeks', 'yea', 'with_party'),
    (rc, 'massie', 'nay', 'against_party'),
    (rc, 'maxine_waters', 'yea', 'with_party'),
    (rc, 'meeks', 'yea', 'with_party'),
    (rc, 'michael_guest', 'yea', 'with_party'),
    (rc, 'mike_collins', 'nay', 'against_party'),
    (rc, 'mike_ezell', 'yea', 'with_party'),
    (rc, 'mike_flood', 'yea', 'with_party'),
    (rc, 'mike_johnson', 'yea', 'with_party'),
    (rc, 'mike_lawler', 'yea', 'with_party'),
    (rc, 'mike_simpson', 'yea', 'with_party'),
    (rc, 'mike_waltz', 'yea', 'with_party'),
    (rc, 'mtg', 'nay', 'against_party'),
    (rc, 'omar', 'nay', 'against_party'),
    (rc, 'owens', 'nay', 'against_party'),
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
    (rc, 'torres', 'yea', 'with_party'),
    (rc, 'trent_kelly', 'yea', 'with_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- house 118/2 roll 119 — H.R. 7888: On Passage
  --   273-147, 58 roster attribution(s) · U.S. House Clerk
  SELECT id INTO rc FROM vr_rollcalls
   WHERE chamber = 'house' AND congress = 118 AND session = 2
     AND roll_number = 119;
  IF rc IS NULL THEN
    RAISE EXCEPTION 'Phase A re-attribution: house 118/2 roll 119 is missing — 20260811000000_vr_phase_a_117_118_rollcalls.sql must run first; this migration never creates a roll call because it holds none of the verified question, tally or source';
  END IF;
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'adam_smith', 'yea', 'with_party'),
    (rc, 'andy_kim', 'yea', 'with_party'),
    (rc, 'aoc', 'nay', 'against_party'),
    (rc, 'bennie_thompson', 'yea', 'with_party'),
    (rc, 'boebert', 'nay', 'against_party'),
    (rc, 'brian_mast', 'nay', 'against_party'),
    (rc, 'bruce_westerman', 'nay', 'against_party'),
    (rc, 'crockett', 'yea', 'with_party'),
    (rc, 'curtis', 'nay', 'against_party'),
    (rc, 'dan_goldman', 'yea', 'with_party'),
    (rc, 'don_bacon', 'yea', 'with_party'),
    (rc, 'don_davis', 'yea', 'with_party'),
    (rc, 'emmer', 'yea', 'with_party'),
    (rc, 'frank_lucas', 'yea', 'with_party'),
    (rc, 'french_hill', 'yea', 'with_party'),
    (rc, 'gaetz', 'nay', 'against_party'),
    (rc, 'gallego', 'not_voting', NULL),
    (rc, 'greg_landsman', 'yea', 'with_party'),
    (rc, 'haley_stevens', 'yea', 'with_party'),
    (rc, 'jake_auchincloss', 'yea', 'with_party'),
    (rc, 'jason_smith', 'nay', 'against_party'),
    (rc, 'jayapal', 'nay', 'against_party'),
    (rc, 'jeffries', 'yea', 'with_party'),
    (rc, 'jim_jordan', 'nay', 'against_party'),
    (rc, 'josh_brecheen', 'nay', 'against_party'),
    (rc, 'josh_gottheimer', 'yea', 'with_party'),
    (rc, 'kclark', 'yea', 'with_party'),
    (rc, 'khanna', 'nay', 'against_party'),
    (rc, 'mariannette_miller_meeks', 'yea', 'with_party'),
    (rc, 'massie', 'nay', 'against_party'),
    (rc, 'maxine_waters', 'nay', 'against_party'),
    (rc, 'meeks', 'yea', 'with_party'),
    (rc, 'michael_guest', 'yea', 'with_party'),
    (rc, 'mike_collins', 'nay', 'against_party'),
    (rc, 'mike_ezell', 'yea', 'with_party'),
    (rc, 'mike_flood', 'yea', 'with_party'),
    (rc, 'mike_johnson', 'yea', 'with_party'),
    (rc, 'mike_lawler', 'yea', 'with_party'),
    (rc, 'mike_simpson', 'yea', 'with_party'),
    (rc, 'mike_waltz', 'yea', 'with_party'),
    (rc, 'mtg', 'nay', 'against_party'),
    (rc, 'omar', 'nay', 'against_party'),
    (rc, 'owens', 'nay', 'against_party'),
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

  -- senate 118/2 roll 150 — H.R. 7888: On Passage of the Bill H.R. 7888
  --   60-34, 33 roster attribution(s) · U.S. Senate
  SELECT id INTO rc FROM vr_rollcalls
   WHERE chamber = 'senate' AND congress = 118 AND session = 2
     AND roll_number = 150;
  IF rc IS NULL THEN
    RAISE EXCEPTION 'Phase A re-attribution: senate 118/2 roll 150 is missing — 20260811000000_vr_phase_a_117_118_rollcalls.sql must run first; this migration never creates a roll call because it holds none of the verified question, tally or source';
  END IF;
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'barrasso', 'yea', 'with_party'),
    (rc, 'booker', 'nay', 'against_party'),
    (rc, 'britt', 'yea', 'with_party'),
    (rc, 'chris_murphy', 'nay', 'against_party'),
    (rc, 'collins', 'yea', 'with_party'),
    (rc, 'cruz', 'nay', 'against_party'),
    (rc, 'durbin', 'nay', 'against_party'),
    (rc, 'ernst', 'yea', 'with_party'),
    (rc, 'fetterman', 'yea', 'with_party'),
    (rc, 'graham', 'yea', 'with_party'),
    (rc, 'grassley', 'yea', 'with_party'),
    (rc, 'hawley', 'nay', 'against_party'),
    (rc, 'john_cornyn', 'yea', 'with_party'),
    (rc, 'jon_ossoff', 'yea', 'with_party'),
    (rc, 'kaine', 'yea', 'with_party'),
    (rc, 'lankford', 'yea', 'with_party'),
    (rc, 'lee', 'nay', 'against_party'),
    (rc, 'mark_kelly', 'yea', 'with_party'),
    (rc, 'mcconnell', 'yea', 'with_party'),
    (rc, 'murkowski', 'yea', 'with_party'),
    (rc, 'rand_paul', 'nay', 'against_party'),
    (rc, 'reed', 'yea', 'with_party'),
    (rc, 'risch', 'yea', 'with_party'),
    (rc, 'rosen', 'yea', 'with_party'),
    (rc, 'rubio', 'yea', 'with_party'),
    (rc, 'sanders', 'nay', 'against_party'),
    (rc, 'schumer', 'yea', 'with_party'),
    (rc, 'shaheen', 'yea', 'with_party'),
    (rc, 'thune', 'yea', 'with_party'),
    (rc, 'tim_scott', 'nay', 'against_party'),
    (rc, 'van_hollen', 'nay', 'against_party'),
    (rc, 'warnock', 'not_voting', NULL),
    (rc, 'warren', 'nay', 'against_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- house 118/2 roll 151 — H.R. 8035: On Passage
  --   311-112, 58 roster attribution(s) · U.S. House Clerk
  SELECT id INTO rc FROM vr_rollcalls
   WHERE chamber = 'house' AND congress = 118 AND session = 2
     AND roll_number = 151;
  IF rc IS NULL THEN
    RAISE EXCEPTION 'Phase A re-attribution: house 118/2 roll 151 is missing — 20260811000000_vr_phase_a_117_118_rollcalls.sql must run first; this migration never creates a roll call because it holds none of the verified question, tally or source';
  END IF;
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'adam_smith', 'yea', 'with_party'),
    (rc, 'andy_kim', 'yea', 'with_party'),
    (rc, 'aoc', 'yea', 'with_party'),
    (rc, 'bennie_thompson', 'yea', 'with_party'),
    (rc, 'boebert', 'nay', 'with_party'),
    (rc, 'brian_mast', 'nay', 'with_party'),
    (rc, 'bruce_westerman', 'yea', 'against_party'),
    (rc, 'crockett', 'yea', 'with_party'),
    (rc, 'curtis', 'yea', 'against_party'),
    (rc, 'dan_goldman', 'yea', 'with_party'),
    (rc, 'don_bacon', 'yea', 'against_party'),
    (rc, 'don_davis', 'yea', 'with_party'),
    (rc, 'emmer', 'yea', 'against_party'),
    (rc, 'frank_lucas', 'yea', 'against_party'),
    (rc, 'french_hill', 'yea', 'against_party'),
    (rc, 'gaetz', 'nay', 'with_party'),
    (rc, 'gallego', 'yea', 'with_party'),
    (rc, 'greg_landsman', 'yea', 'with_party'),
    (rc, 'haley_stevens', 'yea', 'with_party'),
    (rc, 'jake_auchincloss', 'yea', 'with_party'),
    (rc, 'jason_smith', 'nay', 'with_party'),
    (rc, 'jayapal', 'yea', 'with_party'),
    (rc, 'jeffries', 'yea', 'with_party'),
    (rc, 'jim_jordan', 'nay', 'with_party'),
    (rc, 'josh_brecheen', 'nay', 'with_party'),
    (rc, 'josh_gottheimer', 'yea', 'with_party'),
    (rc, 'kclark', 'yea', 'with_party'),
    (rc, 'khanna', 'yea', 'with_party'),
    (rc, 'mariannette_miller_meeks', 'yea', 'against_party'),
    (rc, 'massie', 'nay', 'with_party'),
    (rc, 'maxine_waters', 'yea', 'with_party'),
    (rc, 'meeks', 'yea', 'with_party'),
    (rc, 'michael_guest', 'nay', 'with_party'),
    (rc, 'mike_collins', 'nay', 'with_party'),
    (rc, 'mike_ezell', 'nay', 'with_party'),
    (rc, 'mike_flood', 'yea', 'against_party'),
    (rc, 'mike_johnson', 'yea', 'against_party'),
    (rc, 'mike_lawler', 'yea', 'against_party'),
    (rc, 'mike_simpson', 'yea', 'against_party'),
    (rc, 'mike_waltz', 'nay', 'with_party'),
    (rc, 'mtg', 'nay', 'with_party'),
    (rc, 'omar', 'yea', 'with_party'),
    (rc, 'owens', 'nay', 'with_party'),
    (rc, 'rick_crawford', 'nay', 'with_party'),
    (rc, 'scalise', 'yea', 'against_party'),
    (rc, 'schiff', 'yea', 'with_party'),
    (rc, 'scott_perry', 'nay', 'with_party'),
    (rc, 'slotkin', 'yea', 'with_party'),
    (rc, 'stefanik', 'nay', 'with_party'),
    (rc, 'steny_hoyer', 'yea', 'with_party'),
    (rc, 'stephanie_bice', 'yea', 'against_party'),
    (rc, 'steve_womack', 'yea', 'against_party'),
    (rc, 'summer_lee', 'yea', 'with_party'),
    (rc, 'tlaib', 'yea', 'with_party'),
    (rc, 'tom_cole', 'yea', 'against_party'),
    (rc, 'tom_suozzi', 'yea', 'with_party'),
    (rc, 'torres', 'yea', 'with_party'),
    (rc, 'trent_kelly', 'nay', 'with_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- senate 118/2 roll 154 — H.R. 815: On the Motion (Motion to Concur in the House Amendment to the Senate Amendment to H.R. 815)
  --   79-18, 33 roster attribution(s) · U.S. Senate
  SELECT id INTO rc FROM vr_rollcalls
   WHERE chamber = 'senate' AND congress = 118 AND session = 2
     AND roll_number = 154;
  IF rc IS NULL THEN
    RAISE EXCEPTION 'Phase A re-attribution: senate 118/2 roll 154 is missing — 20260811000000_vr_phase_a_117_118_rollcalls.sql must run first; this migration never creates a roll call because it holds none of the verified question, tally or source';
  END IF;
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'barrasso', 'nay', 'against_party'),
    (rc, 'booker', 'yea', 'with_party'),
    (rc, 'britt', 'yea', 'with_party'),
    (rc, 'chris_murphy', 'yea', 'with_party'),
    (rc, 'collins', 'yea', 'with_party'),
    (rc, 'cruz', 'nay', 'against_party'),
    (rc, 'durbin', 'yea', 'with_party'),
    (rc, 'ernst', 'yea', 'with_party'),
    (rc, 'fetterman', 'yea', 'with_party'),
    (rc, 'graham', 'yea', 'with_party'),
    (rc, 'grassley', 'yea', 'with_party'),
    (rc, 'hawley', 'nay', 'against_party'),
    (rc, 'john_cornyn', 'yea', 'with_party'),
    (rc, 'jon_ossoff', 'yea', 'with_party'),
    (rc, 'kaine', 'yea', 'with_party'),
    (rc, 'lankford', 'yea', 'with_party'),
    (rc, 'lee', 'nay', 'against_party'),
    (rc, 'mark_kelly', 'yea', 'with_party'),
    (rc, 'mcconnell', 'yea', 'with_party'),
    (rc, 'murkowski', 'yea', 'with_party'),
    (rc, 'rand_paul', 'not_voting', NULL),
    (rc, 'reed', 'yea', 'with_party'),
    (rc, 'risch', 'yea', 'with_party'),
    (rc, 'rosen', 'yea', 'with_party'),
    (rc, 'rubio', 'nay', 'against_party'),
    (rc, 'sanders', 'nay', 'against_party'),
    (rc, 'schumer', 'yea', 'with_party'),
    (rc, 'shaheen', 'yea', 'with_party'),
    (rc, 'thune', 'yea', 'with_party'),
    (rc, 'tim_scott', 'not_voting', NULL),
    (rc, 'van_hollen', 'yea', 'with_party'),
    (rc, 'warnock', 'yea', 'with_party'),
    (rc, 'warren', 'yea', 'with_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- house 118/2 roll 500 — H.R. 5009: On Motion to Concur in the Senate Amendment with an Amendment
  --   281-140, 55 roster attribution(s) · U.S. House Clerk
  SELECT id INTO rc FROM vr_rollcalls
   WHERE chamber = 'house' AND congress = 118 AND session = 2
     AND roll_number = 500;
  IF rc IS NULL THEN
    RAISE EXCEPTION 'Phase A re-attribution: house 118/2 roll 500 is missing — 20260811000000_vr_phase_a_117_118_rollcalls.sql must run first; this migration never creates a roll call because it holds none of the verified question, tally or source';
  END IF;
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'adam_smith', 'nay', 'with_party'),
    (rc, 'aoc', 'nay', 'with_party'),
    (rc, 'bennie_thompson', 'yea', 'against_party'),
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
    (rc, 'gallego', 'yea', 'against_party'),
    (rc, 'greg_landsman', 'yea', 'against_party'),
    (rc, 'haley_stevens', 'nay', 'with_party'),
    (rc, 'jake_auchincloss', 'nay', 'with_party'),
    (rc, 'jason_smith', 'yea', 'with_party'),
    (rc, 'jayapal', 'nay', 'with_party'),
    (rc, 'jeffries', 'yea', 'against_party'),
    (rc, 'jim_jordan', 'yea', 'with_party'),
    (rc, 'josh_brecheen', 'yea', 'with_party'),
    (rc, 'josh_gottheimer', 'yea', 'against_party'),
    (rc, 'kclark', 'nay', 'with_party'),
    (rc, 'khanna', 'nay', 'with_party'),
    (rc, 'mariannette_miller_meeks', 'yea', 'with_party'),
    (rc, 'massie', 'nay', 'against_party'),
    (rc, 'maxine_waters', 'nay', 'with_party'),
    (rc, 'meeks', 'yea', 'against_party'),
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
    (rc, 'scott_perry', 'nay', 'against_party'),
    (rc, 'slotkin', 'yea', 'against_party'),
    (rc, 'stefanik', 'yea', 'with_party'),
    (rc, 'steny_hoyer', 'yea', 'against_party'),
    (rc, 'stephanie_bice', 'yea', 'with_party'),
    (rc, 'steve_womack', 'yea', 'with_party'),
    (rc, 'summer_lee', 'nay', 'with_party'),
    (rc, 'tlaib', 'nay', 'with_party'),
    (rc, 'tom_cole', 'yea', 'with_party'),
    (rc, 'tom_suozzi', 'yea', 'against_party'),
    (rc, 'torres', 'nay', 'with_party'),
    (rc, 'trent_kelly', 'yea', 'with_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;

  -- senate 118/2 roll 325 — H.R. 5009: On the Motion (Motion to Concur in the House Amendment to the Senate Amendment to H.R. 5009)
  --   85-14, 35 roster attribution(s) · U.S. Senate
  SELECT id INTO rc FROM vr_rollcalls
   WHERE chamber = 'senate' AND congress = 118 AND session = 2
     AND roll_number = 325;
  IF rc IS NULL THEN
    RAISE EXCEPTION 'Phase A re-attribution: senate 118/2 roll 325 is missing — 20260811000000_vr_phase_a_117_118_rollcalls.sql must run first; this migration never creates a roll call because it holds none of the verified question, tally or source';
  END IF;
  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
    (rc, 'andy_kim', 'nay', 'against_party'),
    (rc, 'barrasso', 'yea', 'with_party'),
    (rc, 'booker', 'nay', 'against_party'),
    (rc, 'britt', 'yea', 'with_party'),
    (rc, 'chris_murphy', 'yea', 'with_party'),
    (rc, 'collins', 'yea', 'with_party'),
    (rc, 'cruz', 'yea', 'with_party'),
    (rc, 'durbin', 'yea', 'with_party'),
    (rc, 'ernst', 'yea', 'with_party'),
    (rc, 'fetterman', 'yea', 'with_party'),
    (rc, 'graham', 'yea', 'with_party'),
    (rc, 'grassley', 'yea', 'with_party'),
    (rc, 'hawley', 'yea', 'with_party'),
    (rc, 'john_cornyn', 'yea', 'with_party'),
    (rc, 'jon_ossoff', 'yea', 'with_party'),
    (rc, 'kaine', 'yea', 'with_party'),
    (rc, 'lankford', 'yea', 'with_party'),
    (rc, 'lee', 'nay', 'against_party'),
    (rc, 'mark_kelly', 'yea', 'with_party'),
    (rc, 'mcconnell', 'yea', 'with_party'),
    (rc, 'murkowski', 'yea', 'with_party'),
    (rc, 'rand_paul', 'nay', 'against_party'),
    (rc, 'reed', 'yea', 'with_party'),
    (rc, 'risch', 'yea', 'with_party'),
    (rc, 'rosen', 'yea', 'with_party'),
    (rc, 'rubio', 'yea', 'with_party'),
    (rc, 'sanders', 'nay', 'against_party'),
    (rc, 'schiff', 'nay', 'against_party'),
    (rc, 'schumer', 'yea', 'with_party'),
    (rc, 'shaheen', 'yea', 'with_party'),
    (rc, 'thune', 'yea', 'with_party'),
    (rc, 'tim_scott', 'yea', 'with_party'),
    (rc, 'van_hollen', 'yea', 'with_party'),
    (rc, 'warnock', 'yea', 'with_party'),
    (rc, 'warren', 'nay', 'against_party')
  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
END $$;

-- ── Verification ─────────────────────────────────────────────────────────
DO $$
DECLARE n_rolls integer; n_votes integer; n_orphan integer;
BEGIN
  WITH want (chamber, congress, session, roll_number) AS (VALUES
    ('senate'::text, 117::integer, 1::integer, 110::integer),
    ('house'::text, 117::integer, 1::integer, 72::integer),
    ('senate'::text, 117::integer, 1::integer, 314::integer),
    ('house'::text, 117::integer, 1::integer, 369::integer),
    ('house'::text, 117::integer, 1::integer, 405::integer),
    ('senate'::text, 117::integer, 1::integer, 499::integer),
    ('house'::text, 117::integer, 2::integer, 38::integer),
    ('senate'::text, 117::integer, 2::integer, 71::integer),
    ('senate'::text, 117::integer, 2::integer, 242::integer),
    ('house'::text, 117::integer, 2::integer, 299::integer),
    ('house'::text, 117::integer, 2::integer, 309::integer),
    ('senate'::text, 117::integer, 2::integer, 271::integer),
    ('house'::text, 117::integer, 2::integer, 404::integer),
    ('senate'::text, 117::integer, 2::integer, 280::integer),
    ('senate'::text, 117::integer, 2::integer, 325::integer),
    ('house'::text, 117::integer, 2::integer, 420::integer),
    ('senate'::text, 117::integer, 2::integer, 362::integer),
    ('house'::text, 117::integer, 2::integer, 513::integer),
    ('senate'::text, 117::integer, 2::integer, 396::integer),
    ('house'::text, 118::integer, 1::integer, 243::integer),
    ('senate'::text, 118::integer, 1::integer, 146::integer),
    ('senate'::text, 118::integer, 1::integer, 343::integer),
    ('house'::text, 118::integer, 1::integer, 723::integer),
    ('house'::text, 118::integer, 2::integer, 119::integer),
    ('senate'::text, 118::integer, 2::integer, 150::integer),
    ('house'::text, 118::integer, 2::integer, 151::integer),
    ('senate'::text, 118::integer, 2::integer, 154::integer),
    ('house'::text, 118::integer, 2::integer, 500::integer),
    ('senate'::text, 118::integer, 2::integer, 325::integer)
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
  RAISE NOTICE 'Phase A re-attribution: % roll calls, % member votes', n_rolls, n_votes;
  IF n_rolls <> 29 THEN
    RAISE EXCEPTION 'Phase A re-attribution: expected 29 roll calls, found %', n_rolls;
  END IF;
  IF n_votes < 1217 THEN
    RAISE EXCEPTION 'Phase A re-attribution: expected at least 1217 member votes on these rolls, found % — the re-attribution did not land', n_votes;
  END IF;
  IF n_orphan > 0 THEN
    RAISE EXCEPTION 'Phase A re-attribution: % member vote(s) carry a politician_id outside the ingest roster', n_orphan;
  END IF;
END $$;
