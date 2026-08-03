-- ─────────────────────────────────────────────────────────────────────────────
-- Identity repair: pid `kennedy` is Mike Kennedy, and 27 of its 29 votes are not his
-- ─────────────────────────────────────────────────────────────────────────────
--
-- THE PROBLEM
-- Most roll-call votes recorded under politician_id `kennedy` were cast by a
-- DIFFERENT member than the one that id names. Two people, one id — the mirror
-- image of the susan_collins split (one person, two ids) repaired in
-- 20260725050000, and the more dangerous direction, because nothing looks wrong
-- from either end: the profile has a full stance block and the votes have a real
-- source URL. They just belong to different people.
--
--   pid `kennedy`   = Rep. Mike Kennedy (R-UT-03, Bioguide K000403). This is the
--                     id used by cmp-data.js, cmp-data-detail.js, spotlights-data.js,
--                     ballot-breakdown.js (UT-03 incumbent) and compare-hub.js
--                     ("Physician, attorney, and constitutional conservative"),
--                     and it is the target of STANCE_ALIASES' `mike_kennedy` bridge
--                     in stance-helpers.js. It carries 16 curated stance cards.
--
--   27 of 29 votes  = Del. Kimberlyn King-Hinds (R-MP, Bioguide K000404), whose
--                     House votes the ingest and a generated seed attributed to
--                     that id.
--
-- Bioguide IDs for the four Kennedy-adjacent members, from
-- unitedstates.github.io/congress-legislators/legislators-current.json:
--   K000393  John Kennedy            Senator, LA     ← pid `kennedy_john`
--   K000402  Timothy M. Kennedy      Rep, NY-26
--   K000403  Mike Kennedy            Rep, UT-03      ← pid `kennedy`
--   K000404  Kimberlyn King-Hinds    Delegate, MP    ← source of 27 of these rows
--
-- WHERE IT CAME FROM (fixed alongside this migration)
-- scripts/vr-gen-member-map.mjs reads slug → Bioguide straight out of the curated
-- portrait URL in BROWSE_PHOTOS, precisely so no name-matching guess is involved.
-- Mike Kennedy's portrait pointed at .../450x550/K000404.jpg — King-Hinds's file —
-- so the generator faithfully derived `K000404: "kennedy"`, the ingest faithfully
-- attributed her votes to him, and his profile rendered her face. Repointing the
-- portrait to K000403 and regenerating db/vr-member-map.json fixes it at the source;
-- K000404 now resolves to no slug, so the ingest skips her rather than guessing.
--
-- The generator's own annotation step had already labelled the entry
-- "Kimberlyn King-Hinds" in the human-review block — the map was wrong while its
-- review line was right, which is how this surfaced.
--
-- WHICH ROWS ARE HERS, ESTABLISHED PER ROW AND NOT BY THE ID
-- Every one of the 29 rows was checked against the House Clerk roll-call XML
-- (clerk.house.gov/evs/<year>/roll<NNN>.xml), comparing the stored position against
-- what K000403 and K000404 each actually voted:
--
--   • 12 rows record a position King-Hinds cast and Mike Kennedy did not (she voted
--     No where he voted Aye) — positively hers on the record alone.
--   • 15 rows sit on roll calls where the two voted the same way, so the position
--     cannot discriminate. Provenance does: 24 of the session-2 rows come from
--     db/vr-house-seed-119-s2.json, where each member vote carries its Bioguide and
--     every `"politicianId": "kennedy"` entry is paired with `"bioguideId":
--     "K000404"`; the three session-1 amendment rows (rolls 245, 247, 259) were
--     written by the live ingest through the bad map, on roll calls it created.
--     (Roll 2/243 is seeded twice — db/vr-israel-vote-seed.json carries it as well,
--     with the same Bioguide pairing. One row, two sources, same conclusion.)
--   • 2 rows are HIS and are deliberately kept — see below.
--
-- WHAT IS KEPT, AND WHY IT MATTERS
-- House 119/1 rolls 112 and 114 (H.J.Res. 89 and H.J.Res. 88, both On Passage) were
-- seeded by hand in 20260725040000_vr_seed_waiver_cra_rollcalls.sql, by NAME rather
-- than through the map. The Clerk record shows K000403 voted Yea on both and
-- King-Hinds does not appear in either roll at all — a delegate cannot vote on final
-- passage. Those two rows are Mike Kennedy's own, correctly attributed, and deleting
-- them would have destroyed real record to clean up someone else's. They leave him
-- rankable on exactly one issue after this repair — energy_production, on his own two
-- votes — instead of on four issues he never voted on.
--
-- WHY THE OTHER 27 ARE DELETED AND NOT RE-KEYED
-- A re-key needs a destination id, and King-Hinds has none: no roster record, no
-- cmp-data entry, no stance block, no portrait. Inventing one to hold the votes
-- would fabricate a profile, and admission to the roster is a deliberate curatorial
-- act recorded in db/vr-roster-admitted.json, not a side effect of a repair. So her
-- votes are removed rather than relocated, leaving her unattributed — which is the
-- state the ingest is designed to prefer: "an unmapped member is skipped and
-- counted, never guessed, because a wrong attribution is worse than a gap."
--
-- The 15 same-position rows are deleted along with the rest even though their stored
-- position happens to match how Mike Kennedy voted too. They are not his record —
-- they are hers, coincidentally agreeing — and keeping a subset of one member's rows
-- because they flatter another's would leave a record no source backs. His own votes
-- on those roll calls come back the moment a real ingest reads K000403.
--
-- WHAT WAS BEING PUBLISHED
-- 4 (member, issue) pairs were rankable on this id — cut_spending (7 judged votes),
-- energy_production (3), school_choice (1) and religious_liberty (1) — so King-Hinds's
-- roll calls were being scored against Mike Kennedy's stated positions and would have
-- surfaced under his name in a ranking. After this repair: 1 pair, 2 votes, both his.
--
-- SCOPE
-- Deletes 27 named (chamber, congress, session, roll_number) rows under this one id.
-- The roll numbers are enumerated rather than expressed as a range so that no vote
-- this migration has not individually verified can fall inside its reach — including
-- any genuine K000403 vote a later ingest adds before or after it runs.
-- vr_positions and pdx_proposals hold no `kennedy` row (verified against the branch
-- DB). No measure, roll call, issue mapping, source or curated stance is touched, and
-- no other id is read or written.
--
-- NOT an alias case. db/vr-pid-aliases.json retires one id in favour of another for
-- the SAME person; here the two ids name two different people, so canonicalizing one
-- onto the other is exactly the wrong move. No alias is added.
--
-- RECURRENCE
-- scripts/vr-gen-member-map.mjs now cross-checks every portrait's Bioguide against
-- the name the app publishes for that slug and refuses to write a map where an
-- admitted slug names someone else. That check found a second instance on its first
-- run — `bmoore` pointed at M001209 (Ben McAdams, former Rep UT-04) instead of
-- M001213 (Blake Moore) — which needed no DB repair, because McAdams left before the
-- 119th Congress and every bmoore vote row was seeded by name and verified against
-- the Clerk record as Blake Moore's own.
--
-- The vote seeds were the second half of the problem. A seed's `politicianId` is a
-- cached map lookup, so the 25 K000404 rows still named `kennedy` after the map was
-- corrected, and the four generators that copy that field would have re-emitted every
-- row this migration deletes as a brand-new migration. Those rows are removed from
-- db/vr-house-seed-119-s2.json and db/vr-israel-vote-seed.json — restoring the filter
-- both files already document ("unmapped members are counted in rosterSkipped and
-- never guessed") — and scripts/vr-seed-pid-guard.mjs now makes all four generators
-- refuse outright on any seeded (bioguideId → politicianId) pair the current map
-- contradicts. scripts/test-identity-integrity.mjs asserts the same on every push, so
-- a stale seed cannot wait for a generator run to be noticed.
--
-- APPLICATION ORDER
-- The four migrations that insert a `kennedy` row are all older than this one
-- (20260724140000, 20260725040000, 20260812000000, 20260813000000) and none is edited
-- here, per the rule that an applied migration is immutable. On a fresh database they
-- insert their rows, including the 27 wrong ones, and this migration then removes them
-- — so the end state is identical whether it runs against an existing database or a
-- newly provisioned one. Every `kennedy` row those four migrations write falls inside
-- either this migration's delete set or its verified keep set; none is left unexamined.
--
-- Idempotent: after the first run no such row exists and the DELETE is a no-op.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_deleted int := 0;
  v_left    int := 0;
  v_kept    int := 0;
  -- House 119/1: written by the live ingest through the bad map.
  s1_rolls  int[] := ARRAY[245, 247, 259];
  -- House 119/2: every one carries "bioguideId": "K000404" in db/vr-house-seed-119-s2.json.
  s2_rolls  int[] := ARRAY[241, 242, 243, 244, 245, 255, 256, 257, 258, 259, 260, 261,
                           262, 263, 264, 265, 266, 267, 268, 269, 273, 274, 275, 276];
BEGIN
  DELETE FROM vr_member_votes v
   WHERE v.politician_id = 'kennedy'
     AND EXISTS (
       SELECT 1 FROM vr_rollcalls r
        WHERE r.id       = v.rollcall_id
          AND r.chamber  = 'house'
          AND r.congress = 119
          AND ((r.session = 1 AND r.roll_number = ANY (s1_rolls))
            OR (r.session = 2 AND r.roll_number = ANY (s2_rolls)))
     );
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  SELECT COUNT(*) INTO v_left FROM vr_member_votes WHERE politician_id = 'kennedy';

  -- The two hand-seeded passage votes are the only rows that should survive. Anything
  -- else on the id is outside what this migration verified row by row: surface it
  -- rather than widening the delete silently, because a row here is either a genuine
  -- Mike Kennedy vote a later ingest added (fine) or a second, unexamined attribution
  -- path (not fine), and only a look at the Clerk record can tell them apart.
  SELECT COUNT(*) INTO v_kept
    FROM vr_member_votes v
    JOIN vr_rollcalls r ON r.id = v.rollcall_id
   WHERE v.politician_id = 'kennedy'
     AND r.chamber = 'house' AND r.congress = 119 AND r.session = 1
     AND r.roll_number IN (112, 114);

  IF v_left > v_kept THEN
    RAISE WARNING
      'kennedy identity repair: % row(s) on this id are outside both the verified delete set and the verified keep set (House 119/1 rolls 112, 114) — check each against clerk.house.gov before publishing a ranking on this member.',
      v_left - v_kept;
  END IF;

  RAISE NOTICE 'kennedy identity repair: % misattributed King-Hinds (K000404) vote(s) removed from pid `kennedy` (Mike Kennedy, K000403); % row(s) remain, of which % are his clerk-verified passage votes',
    v_deleted, v_left, v_kept;
END $$;
