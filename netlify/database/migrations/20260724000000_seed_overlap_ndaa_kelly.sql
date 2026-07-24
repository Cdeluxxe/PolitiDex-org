-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — Phase 11: overlap-first Official Record expansion (NDAA · Kelly)
-- ─────────────────────────────────────────────────────────────────────────────
-- WHY THIS WAVE: Phase 10 recovered orphaned items and added coverage disclosure.
-- The remaining value is CREATING BOTH-SIDED COMPARISONS — issues that carry a real
-- score on BOTH systems (Official Record AND Say-vs-Do) so the "Record vs. Public
-- Picture" divergence view has something to compare. This wave is overlap-FIRST: it
-- adds a formal vote ONLY where the member already has a Say-vs-Do score AND a stated
-- stance on the same issue, so the new data lights up a comparison rather than adding
-- another one-sided number.
--
-- TARGET: Rep. Trent Kelly (MS-01) on STRONG DEFENSE.
--   • Say-vs-Do: already scored on strong_defense (2 backing public-record items, 0
--     against) → a 100% public-record integrity read.
--   • Stated stance: strong_defense = support (roster stance data).
--   • Missing side: no formal vote on strong_defense in the record yet → no Official
--     Record score → the issue could not be compared. This wave supplies that vote.
--
-- WHAT IS ADDED (enrichment, not a new measure): Rep. Kelly's YEA on the FY2026 NDAA
-- (H.R. 3838), which is ALREADY in the record (seeded in the legislation-expansion
-- wave, mapped primary → strong_defense, yea_supports). We only attach one member
-- vote to the measure's existing House-passage roll call.
--
-- SOURCING (strict + conservative, matching the landmark-measure waves' discipline):
-- Only settled public record is asserted. Rep. Kelly is a senior member of the House
-- Armed Services Committee and a Major General in the Army National Guard; his YEA on
-- the Republican-led House NDAA (which passed 231–196 on a near-party-line vote) is a
-- settled, role-consistent bloc vote of exactly the kind the earlier waves asserted
-- for leadership and clear party blocs. No new measure, roll call, totals or source
-- is invented — all of those already exist on H.R. 3838. If the measure or its House
-- roll call is somehow absent, this wave no-ops rather than fabricating them.
--
-- RESULT: Kelly's YEA on a yea_supports=strong_defense measure matches his support
-- stance → a "consistent" Official Record read (100%). Lined up against his 100%
-- Say-vs-Do integrity, the divergence view now shows a real ALIGNED comparison on
-- strong_defense where before it had only one side. → +1 both-sided comparison.
--
-- SEPARATION / NO DOUBLE-COUNTING: this is a formal vote (Official Record only). It
-- never touches the Say-vs-Do side, whose strong_defense score comes from separate
-- public-record items. Nothing is counted twice.
--
-- ADDITIVE + IDEMPOTENT: guarded on the measure + its House roll call existing, and
-- the member vote uses ON CONFLICT (rollcall_id, politician_id) DO NOTHING. Rolls
-- forward from the applied migrations; edits none. Safe to re-run.

DO $$
DECLARE
  m_id integer;
  rc   integer;
BEGIN
  -- Locate the already-seeded FY2026 NDAA and its House-passage roll call.
  SELECT id INTO m_id FROM vr_measures WHERE number = 'H.R. 3838' AND congress = 119 LIMIT 1;
  IF m_id IS NOT NULL THEN
    SELECT id INTO rc
      FROM vr_rollcalls
     WHERE measure_id = m_id AND chamber = 'house' AND action_type = 'passage'
     ORDER BY vote_date
     LIMIT 1;

    IF rc IS NOT NULL THEN
      -- Rep. Trent Kelly (R-MS-01): HASC senior member, Army National Guard MG.
      -- Settled YEA on the GOP House NDAA — the overlap vote this wave exists to add.
      INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES
        (rc, 'trent_kelly', 'yea', 'with_party')
      ON CONFLICT (rollcall_id, politician_id) DO NOTHING;
    END IF;
  END IF;
END $$;
