-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — merge the DUPLICATE MEASURE IDENTITIES of S.J.Res. 18 and
-- H.J.Res. 78, which are duplicating their curated issue mappings
-- ─────────────────────────────────────────────────────────────────────────────
-- 20260727000000_vr_repair_roll247_measure_identity.sql closed the roll-247 identity
-- defect and recorded, in its SCOPE section, that "the duplicate H.Res. 377 measure
-- rows" were still open and still untouched. This migration closes the two members of
-- that same duplicate-identity family that carry ISSUE MAPPINGS, because those are the
-- ones a verdict can be built on. It does not touch H.Res. 377 (see SCOPE).
--
-- THE DEFECT
--   Two joint resolutions each exist as TWO vr_measures rows:
--
--     S.J.Res. 18 (119, senate)   id 56  measure_type 'bill'        0 roll calls
--                                 id 141 measure_type 'resolution'  1 roll call, 38 votes
--     H.J.Res. 78 (119, house)    id 65  measure_type 'bill'        0 roll calls
--                                 id 142 measure_type 'resolution'  1 roll call, 38 votes
--
--   (Surrogate ids are shown for readability only. Nothing below addresses a row by id
--   — every statement resolves rows by natural identity, so this is correct on any
--   database where the ids differ.)
--
--   Both rows of each pair are the same measure: same congress, same chamber, same
--   number, same title, same Congress.gov bill URL modulo the pre-canonicalization
--   bare-number form ('/bill/119/…' on the older row, '/bill/119th-congress/…' on the
--   newer). The split is purely a TYPE disagreement. netlify/lib/vr-normalize.ts
--   measureTypeFor() maps SJRES/HJRES → 'resolution' ("HRES / SRES (simple), HJRES /
--   SJRES (joint) …"), but the earlier seed pass had already inserted both under
--   'bill'. upsertMeasure() in netlify/lib/vr-ingest.ts keys on
--   (measure_type, congress, chamber, number) — so when the roll call for each
--   resolution was later ingested, it could not see the existing row and inserted a
--   second one under the correct type. The roll call, and therefore every member vote,
--   landed on the NEW row; the OLD row kept the actions and has no votes at all.
--
--   applyCuratedIssueSeed() then wrote the curated mapping onto BOTH rows, on purpose:
--   it matches "on (congress, chamber, canonical number) — NOT measureType, and NOT
--   limited to one row … the same number can exist twice while a merge is pending".
--   That is the right call for a seeder, and it is why deleting the surplus mapping
--   rows on their own would not hold: the next seed run would write them straight back.
--   The merge is the durable fix, and this is that pending merge.
--
-- WHAT THE DUPLICATE ACTUALLY BREAKS
--   Four surplus vr_measure_issues rows out of 252 —
--     S.J.Res. 18 · gov_regulation     (weight 100, primary, yea_supports)   ×2
--     S.J.Res. 18 · econ_corp_account  (weight 75,           yea_opposes)    ×2
--     H.J.Res. 78 · lands_preserve     (weight 90,  primary, yea_opposes)    ×2
--     H.J.Res. 78 · gov_regulation     (weight 70,           yea_supports)   ×2
--
--   Each pair is byte-identical in issue_key, weight, is_primary, support_meaning,
--   rationale and source_url, so no editorial judgement differs between them and
--   nothing is lost by collapsing them. The unique index vr_measure_issues_unique is
--   on (measure_id, issue_key) and is intact — the duplication is across two
--   measure_ids, which is exactly what that index cannot catch.
--
--   Member-vote verdicts are NOT double-counted today, because a vote reaches its
--   mappings through rollcall → measure and only the surviving row has a roll call.
--   The visible damage is in the measure-facing surfaces: GET /measures?issue=… in
--   netlify/functions/voting-record.mts collects measure ids straight from
--   vr_measure_issues, so the Legislation library lists S.J.Res. 18 twice under
--   gov_regulation and H.J.Res. 78 twice under lands_preserve, and every per-issue
--   measure count that reads the bridge table is inflated by one. A share card that
--   cites a bill the app itself lists twice is refutable on sight, which is why this
--   runs before any vote-derived card is eligible.
--
-- SOURCING — nothing here is inferred, and no mapping is created or re-weighted.
--   • S.J.Res. 18 (119th) — https://www.congress.gov/bill/119th-congress/senate-joint-resolution/18
--     Both stored rows carry this identity: title "A joint resolution disapproving the
--     rule submitted by the Bureau of Co…", introduced 2025-02-13, and the same
--     all-actions provenance on their action rows (Public Law 119-10, 2025-05-09).
--   • H.J.Res. 78 (119th) — https://www.congress.gov/bill/119th-congress/house-joint-resolution/78
--     Both stored rows carry this identity: title "Providing for congressional
--     disapproval under chapter 8 of title 5, Un…", introduced 2025-03-21.
--   The claim being relied on is only that the two rows in each pair are the same
--   measure. That is established by the stored data itself — identical congress,
--   chamber, number, title and introduced date — not by an outside reading.
--
-- SCOPE — identity merge only, and only where a merge is provably safe.
--   Keeps the row that carries the roll calls, folds anything the other row holds that
--   the keeper lacks onto the keeper FIRST, then deletes the empty duplicate. It
--   writes no new issue mapping, changes no weight, no is_primary and no
--   support_meaning, re-points no roll call and touches no vr_member_votes row. It
--   does not correct the keeper's measure_type or source_url form; both are already
--   the values the current normalizer produces.
--
--   H.Res. 377 (three rows: two 'bill', one 'resolution' holding both roll calls) is
--   the third member of this family and is deliberately LEFT OPEN. It carries zero
--   issue mappings on all three rows, so it cannot reach a verdict, a share card or an
--   issue-filtered measure list, and merging it is a judgement about which of two
--   identically-titled 'bill' rows is canonical that this migration has no sourced
--   basis to make. The required_majority defect 20260726200000 recorded is likewise
--   still open and still untouched here.
--
-- ADDITIVE + IDEMPOTENT: every delete is guarded by proof that the row is empty (no
-- roll calls, no positions, no provisions, no distributional impacts, no child measure
-- pointing at it via parent_id) and that a keeper carrying the roll calls exists. The
-- fold-forward steps are NOT EXISTS guarded. Re-running changes nothing, because after
-- the first run there is no second row to find. It rolls forward from the applied
-- migrations and edits none of them.
--
-- FRESH PROVISION: on a database that only ever saw one row per number — the state a
-- clean ingest produces now, since measureTypeFor() types both as 'resolution' — the
-- whole block is a no-op. No path here can delete the last remaining row for a number:
-- a keeper must be found, and the keeper is excluded from the delete set.

DO $$
DECLARE
  fam       record;
  keeper    integer;
  keeprc    integer;
  dupes     integer[];
  movedmap  integer := 0;
  movedact  integer := 0;
  killed    integer := 0;
BEGIN

  FOR fam IN
    SELECT * FROM (VALUES
      (119, 'senate', 'S.J.Res. 18'),
      (119, 'house',  'H.J.Res. 78')
    ) AS f(congress, chamber, number)
  LOOP

    -- ═════════════════════════════════════════════════════════════════════════
    -- A. Pick the keeper: the row the roll calls actually hang off
    -- ═════════════════════════════════════════════════════════════════════════
    -- Roll-call count decides it, not measure_type — the votes are the thing that
    -- cannot be moved without touching vr_member_votes, so the row holding them wins
    -- by construction. measure_type 'resolution' only breaks a tie, because that is
    -- what measureTypeFor() produces for a joint resolution and therefore what the
    -- next ingest will converge on. A number with no voted row at all is skipped
    -- entirely: there is nothing to merge toward.
    keeper := NULL;
    SELECT m.id,
           (SELECT count(*) FROM vr_rollcalls r WHERE r.measure_id = m.id)
      INTO keeper, keeprc
      FROM vr_measures m
     WHERE m.congress = fam.congress
       AND m.chamber  = fam.chamber
       AND m.number   = fam.number
     ORDER BY (SELECT count(*) FROM vr_rollcalls r WHERE r.measure_id = m.id) DESC,
              (m.measure_type = 'resolution') DESC,
              m.id ASC
     LIMIT 1;

    IF keeper IS NULL OR coalesce(keeprc, 0) = 0 THEN
      RAISE NOTICE '% %/%: no voted row found — nothing merged',
        fam.number, fam.congress, fam.chamber;
      CONTINUE;
    END IF;

    -- ═════════════════════════════════════════════════════════════════════════
    -- B. Identify duplicates that are provably safe to remove
    -- ═════════════════════════════════════════════════════════════════════════
    -- Same natural identity, not the keeper, and empty of everything that would
    -- carry evidence or structure: no roll call (so no member vote), no recorded
    -- position, no provision, no distributional impact, and no child measure nested
    -- under it. A duplicate failing ANY of these is left in place — a row holding
    -- something the keeper does not is a merge decision, not a cleanup.
    SELECT coalesce(array_agg(m.id ORDER BY m.id), '{}')
      INTO dupes
      FROM vr_measures m
     WHERE m.congress = fam.congress
       AND m.chamber  = fam.chamber
       AND m.number   = fam.number
       AND m.id <> keeper
       AND NOT EXISTS (SELECT 1 FROM vr_rollcalls              x WHERE x.measure_id = m.id)
       AND NOT EXISTS (SELECT 1 FROM vr_positions              x WHERE x.measure_id = m.id)
       AND NOT EXISTS (SELECT 1 FROM vr_measure_provisions     x WHERE x.measure_id = m.id)
       AND NOT EXISTS (SELECT 1 FROM vr_distributional_impacts x WHERE x.measure_id = m.id)
       AND NOT EXISTS (SELECT 1 FROM vr_measures               x WHERE x.parent_id  = m.id);

    IF array_length(dupes, 1) IS NULL THEN
      RAISE NOTICE '% %/%: single identity (keeper %) — nothing to merge',
        fam.number, fam.congress, fam.chamber, keeper;
      CONTINUE;
    END IF;

    -- ═════════════════════════════════════════════════════════════════════════
    -- C. Fold forward anything the keeper is missing, BEFORE deleting
    -- ═════════════════════════════════════════════════════════════════════════
    -- For the two families named above the duplicate's mappings are byte-identical to
    -- the keeper's, so this moves nothing and the counts below report 0. It is here
    -- because "the duplicate is a strict subset" is an observation about today's data,
    -- not a guarantee, and silently dropping a curated mapping that exists on only one
    -- row would be a content loss no verification could see afterwards. Moving the row
    -- preserves its weight, is_primary, support_meaning, rationale and source_url
    -- exactly; it invents nothing.
    WITH moved AS (
      UPDATE vr_measure_issues mi
         SET measure_id = keeper
       WHERE mi.measure_id = ANY(dupes)
         AND NOT EXISTS (
           SELECT 1 FROM vr_measure_issues k
            WHERE k.measure_id = keeper AND k.issue_key = mi.issue_key
         )
      RETURNING 1
    ) SELECT count(*) INTO movedmap FROM moved;

    -- Same for the legislative-history rows. Identity is (stage, action_date, text) —
    -- the fields a reader sees — so an action already on the keeper is not re-added,
    -- and the duplicate's own internal repeats (H.J.Res. 78's old row holds the same
    -- 'passed_house' action twice) collapse instead of following it across.
    WITH moved AS (
      UPDATE vr_measure_actions a
         SET measure_id = keeper
       WHERE a.measure_id = ANY(dupes)
         AND NOT EXISTS (
           SELECT 1 FROM vr_measure_actions k
            WHERE k.measure_id = keeper
              AND k.stage       IS NOT DISTINCT FROM a.stage
              AND k.action_date IS NOT DISTINCT FROM a.action_date
              AND k.text        IS NOT DISTINCT FROM a.text
         )
         AND a.id = (
           SELECT min(d.id) FROM vr_measure_actions d
            WHERE d.measure_id = ANY(dupes)
              AND d.stage       IS NOT DISTINCT FROM a.stage
              AND d.action_date IS NOT DISTINCT FROM a.action_date
              AND d.text        IS NOT DISTINCT FROM a.text
         )
      RETURNING 1
    ) SELECT count(*) INTO movedact FROM moved;

    -- ═════════════════════════════════════════════════════════════════════════
    -- D. Delete the now-redundant identity rows
    -- ═════════════════════════════════════════════════════════════════════════
    -- Whatever remains beneath them is a duplicate of something the keeper already
    -- holds. vr_measure_issues, vr_measure_actions, vr_positions, vr_rollcalls,
    -- vr_measure_provisions and vr_distributional_impacts all cascade on measure_id
    -- (confdeltype 'c'), and section B proved the last four are empty.
    WITH gone AS (
      DELETE FROM vr_measures WHERE id = ANY(dupes) RETURNING 1
    ) SELECT count(*) INTO killed FROM gone;

    RAISE NOTICE '% %/%: keeper % (% roll call(s)); removed % duplicate identity row(s); folded forward % mapping(s), % action(s)',
      fam.number, fam.congress, fam.chamber, keeper, keeprc, killed, movedmap, movedact;

  END LOOP;

END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Verification — reports state, never raises. A branch database missing these rows
-- must still migrate cleanly, so every check is a NOTICE.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  r      record;
  total  integer;
  dups   integer;
BEGIN
  FOR r IN
    SELECT m.number,
           count(*)                                                        AS rows_now,
           (SELECT count(*) FROM vr_measure_issues mi
             WHERE mi.measure_id IN (SELECT id FROM vr_measures m2
                                      WHERE m2.congress = m.congress
                                        AND m2.chamber  = m.chamber
                                        AND m2.number   = m.number))       AS maps_now
      FROM vr_measures m
     WHERE (m.congress, m.chamber, m.number) IN
           ((119, 'senate', 'S.J.Res. 18'), (119, 'house', 'H.J.Res. 78'))
     GROUP BY m.congress, m.chamber, m.number
  LOOP
    RAISE NOTICE '%: % identity row(s) (target 1), % issue mapping(s) (target 2)',
      r.number, r.rows_now, r.maps_now;
  END LOOP;

  SELECT count(*) INTO total FROM vr_measure_issues;
  RAISE NOTICE 'vr_measure_issues rows: % (252 before this migration, 248 after)', total;

  -- Any measure number still carrying its mappings on more than one identity row.
  -- H.Res. 377 will not appear here: it has no mappings at all.
  SELECT count(*) INTO dups FROM (
    SELECT m.congress, m.chamber, m.number
      FROM vr_measures m
      JOIN vr_measure_issues mi ON mi.measure_id = m.id
     GROUP BY m.congress, m.chamber, m.number
    HAVING count(DISTINCT m.id) > 1
  ) q;
  RAISE NOTICE 'measure numbers with mappings split across >1 identity row: % (target 0)', dups;
END $$;
