-- ─────────────────────────────────────────────────────────────────────────────
-- Repair: senate 119/1 roll 7 records a hundredth judged vote on a 99-seat roll
-- ─────────────────────────────────────────────────────────────────────────────
--
-- WHAT IS WRONG
-- Senate 119/1 roll call 7 — S. 5 (Laken Riley Act), On Passage of the Bill, as
-- Amended, 2025-01-20 — passed 64-35 (D 12-33, R 52-0, I 0-2). Ninety-nine senators
-- cast a judged vote on it, because two seats were in transition that day: Ohio's was
-- vacant from J.D. Vance's resignation, and Florida's was Marco Rubio's until his
-- confirmation as Secretary of State took effect. (The stored totals carry notVoting 1,
-- a hundred-seat accounting of the same roll; on either reading the yea+nay pool is 99.) The stored roll held ONE HUNDRED attributed cells
-- carrying a judged position — 65 yea, 35 nay — one more yea than the chamber cast.
--
-- That is not a rounding difference, it is an impossibility: the attributed set is a
-- subset of the chamber, so it cannot be larger than the chamber. Federal wave F8
-- (20261024000000) is where it finally became visible. F8 fills the three admitted
-- senators' rows on 73 Senate rolls this record already holds, one of them this one,
-- and its verification block asserts the subset relation:
--
--   Federal wave F8: 1 roll(s) have a yea+nay pool smaller than the number of
--   attributed yea/nay rows.
--
-- The guard is right and the roll is wrong. F8 adds Cindy Hyde-Smith's yea — she was
-- serving, the Senate's document lists her, and it is one of the 136 cells the wave
-- exists to pay back — and the pool had no room left for it because a cell that is not
-- anybody's was already occupying the hundredth place.
--
-- THE CELL, AND WHERE IT CAME FROM
-- `ashley_moody`, yea, with_party. It was written by
-- 20260721080000_seed_voting_record_wave15.sql, which completed the Republican side of
-- this roll from a roster array rather than from the roll:
--
--   INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party)
--     SELECT rc_hr29s, s, 'yea', 'with_party' FROM unnest(rr) s ON CONFLICT DO NOTHING;
--
-- `rr` is the CURRENT Senate Republican roster. Applied to a January 2025 roll it is an
-- anachronism: it carries `ashley_moody` and not `rubio`, because Moody holds that seat
-- now and Rubio does not. Three of `rr`'s slugs were new to this roll and all three were
-- inserted — cotton and mcconnell, who voted, and ashley_moody, who could not have.
--
-- WHY IT CANNOT BE HERS
-- Ashley Moody was appointed to Rubio's seat and seated 2025-01-21, the day AFTER this
-- vote. This repository established that before the bad cell existed, in the migration
-- that hand-verified this roll against the Senate's record —
-- 20260719200000_seed_senate_chamber_balance.sql:
--
--   "Ashley Moody (FL) is intentionally NOT recorded here: she was appointed to Rubio's
--    seat and seated Jan 21, 2025, the day AFTER this vote. (senate.gov vote_119_1_00007)"
--
-- So one migration excluded her deliberately and a later one put her back by inference.
-- Florida's two seats on this roll are already accounted for, both of them from the
-- document rather than from a bloc: `rick_scott` (20260719200000) and `rubio`
-- (20260820000000_vr_landmark_enacted_law_rollcalls.sql, whose seed carries R000595 →
-- rubio straight off the Senate's XML for this vote). A third Florida senator on a
-- 100-seat roll has no seat to have voted from.
--
-- WHY THREE PASSES OVER THE DOCUMENT WALKED PAST IT
-- 20260908000000_vr_senate_lis_attribution_backfill.sql filled eleven more cells here
-- and re-read the ones it already held; F8's pull read this roll a third time and
-- reported 6,811 agreeing cells and no contradictions across the whole wave. Neither
-- examined this one,
-- and not by accident: both iterate the members the DOCUMENT lists and compare each
-- against what we store. A stored cell for somebody the document never mentions is
-- never reached by that loop at all. It is the one shape of error that a
-- document-versus-database comparison, walked in that direction, structurally cannot
-- see — and the arithmetic that does see it (attributed judged rows versus the
-- document's own yea+nay count) was not being checked at pull time. Both gaps are
-- closed in scripts/vr-gen-federal-wave-f8-attribution-seed.mjs alongside this
-- migration, so the next pull refuses the cell instead of a deploy discovering it.
--
-- WHY THIS IS ITS OWN MIGRATION
-- F8 says so, in its own header: "Correcting a stored vote is a deliberate act with its
-- own citation and its own migration, not something that happens in the quiet middle of
-- an attribution pass." F8 is additive throughout, every insert ON CONFLICT DO NOTHING,
-- and it neither can nor should reach back into a cell it did not write. Nor is an
-- applied migration edited to make this go away: wave15 stays exactly as it is, and its
-- own note about what it did stays readable. This file is the roll-forward.
--
-- APPLICATION ORDER
-- The stamp is deliberately between wave F7 (20261023000000) and wave F8
-- (20261024000000). Migrations apply in filename order, and F8's verification block
-- READS the state this repair produces: a repair stamped after F8 would never run,
-- because F8 would raise first and take the deploy down with it. On a database where F8
-- has already failed nothing is applied out of order either — F8's DO block aborted
-- whole, so it is simply still pending, and both files apply in order on the next run.
-- Every deploy also provisions a fresh branch database, in which the entire archive
-- replays from the beginning: wave15 writes the bad cell, this file removes it, F8 then
-- writes Hyde-Smith's yea into the place it vacated. The end state is the same whether
-- this runs against an existing database or a new one.
--
-- WHAT THE NUMBERS BECOME
-- 100 attributed cells on this roll become 99, and their judged split becomes 64 yea /
-- 35 nay — the Senate's published tally exactly, before F8 adds a row. F8 then fills
-- Hyde-Smith and the roll carries 99 judged cells against a 99-vote pool, which is the
-- subset relation its guard asks for. No other roll in that wave's 73 fails it.
--
-- SCOPE
-- One DELETE, one table, one roll call resolved by natural key, one politician_id, one
-- position. No measure, roll call, issue mapping, stated position, source or profile is
-- read or written, and the stored `totals` are left alone: they are the chamber's number
-- and this migration came to make the rows agree with them, not the reverse.
--
-- Nothing else on this id is touched. Ashley Moody is a serving senator with a real
-- record in this archive, on dozens of rolls she was seated for, and every one of those
-- cells stays. This removes the one cell that predates her.
--
-- IDEMPOTENT, AND FAIL-CLOSED
-- It reads the cell before it writes. It deletes only a cell still holding the 'yea'
-- this repair examined; treats an absent cell as a previous run's work and says so; and
-- RAISEs on any other stored value rather than deleting a cell it has not verified.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  rc        integer;
  cur       text;
  n_removed integer := 0;
  n_judged  integer;
  n_yea     integer;
  n_nay     integer;
  n_pool    integer;
  n_florida integer;
BEGIN
  SELECT id INTO rc FROM vr_rollcalls
   WHERE chamber = 'senate' AND congress = 119 AND session = 1 AND roll_number = 7 LIMIT 1;
  IF rc IS NULL THEN
    RAISE EXCEPTION 'Roll 7 repair: senate 119/1 roll 7 is not in vr_rollcalls. This migration removes one cell from a roll that already exists and creates none.';
  END IF;

  -- senate 119/1 roll 7 · S. 5 (Laken Riley Act) · On Passage of the Bill, as Amended · 2025-01-20
  --   ashley_moody stored 'yea' / with_party, written from a roster array by
  --   20260721080000_seed_voting_record_wave15.sql; seated 2025-01-21, the day after.
  --   https://www.senate.gov/legislative/LIS/roll_call_votes/vote1191/vote_119_1_00007.xml
  SELECT position INTO cur FROM vr_member_votes
   WHERE rollcall_id = rc AND politician_id = 'ashley_moody';
  IF cur IS NULL THEN
    RAISE NOTICE 'Roll 7 repair: senate 119/1 roll 7 holds no ashley_moody cell — a previous run removed it, or the party-bloc insert that created it never ran. Nothing to do.';
  ELSIF cur = 'yea' THEN
    DELETE FROM vr_member_votes
     WHERE rollcall_id = rc AND politician_id = 'ashley_moody' AND position = 'yea';
    GET DIAGNOSTICS n_removed = ROW_COUNT;
  ELSE
    RAISE EXCEPTION 'Roll 7 repair: senate 119/1 roll 7 holds ''%'' for ashley_moody, which is not the ''yea'' this repair examined. Something changed underneath this migration; refusing to delete a cell it has not verified.', cur;
  END IF;

  -- ── disclosure, not a second guard ──────────────────────────────────────────
  -- What the roll looks like afterwards, said out loud in the deploy log. These are
  -- warnings and not exceptions on purpose: the deploy-blocking assertion about this
  -- roll belongs to wave F8, which runs next and owns it. A repair that could fail the
  -- build for a reason F8 is about to state better would just be a second, worse
  -- message for the same fact.
  SELECT count(*) FILTER (WHERE v.position IN ('yea','nay')),
         count(*) FILTER (WHERE v.position = 'yea'),
         count(*) FILTER (WHERE v.position = 'nay')
    INTO n_judged, n_yea, n_nay
    FROM vr_member_votes v WHERE v.rollcall_id = rc;

  SELECT (totals->>'yea')::int + (totals->>'nay')::int INTO n_pool
    FROM vr_rollcalls WHERE id = rc;

  IF n_judged > n_pool THEN
    RAISE WARNING 'Roll 7 repair: senate 119/1 roll 7 still carries % judged cell(s) against a %-vote pool. Removing the ashley_moody cell was not the whole of it — another attributed row on this roll belongs to somebody the Senate does not list, and it needs its own reading of vote_119_1_00007 before the record is right.',
      n_judged, n_pool;
  END IF;

  -- Florida holds two seats. On this roll they are rick_scott and rubio, both taken from
  -- the document. Anything else here is the same class of error as the row just removed.
  SELECT count(*) INTO n_florida FROM vr_member_votes
   WHERE rollcall_id = rc AND politician_id IN ('rick_scott', 'rubio', 'ashley_moody');
  IF n_florida <> 2 THEN
    RAISE WARNING 'Roll 7 repair: senate 119/1 roll 7 accounts for % of Florida''s two seats. Expected exactly rick_scott and rubio, the two the Senate''s own document lists.', n_florida;
  END IF;

  RAISE NOTICE 'Roll 7 repair: % impossible cell(s) removed from senate 119/1 roll 7 (S. 5, 2025-01-20). The roll now holds % judged cell(s) — % yea, % nay — against the chamber''s %-vote pool; the Senate published 64-35.',
    n_removed, n_judged, n_yea, n_nay, n_pool;
END $$;
