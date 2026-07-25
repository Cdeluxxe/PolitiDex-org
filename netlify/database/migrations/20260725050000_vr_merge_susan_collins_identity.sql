-- ─────────────────────────────────────────────────────────────────────────────
-- Identity hygiene: fold `susan_collins` into `collins` (one senator, one id)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- THE PROBLEM
-- Susan Collins (R-ME, Bioguide C001035) exists in the voting record under two
-- politician_ids. `politician_id` is free text — there is no `politicians` table
-- and no FK — so nothing stopped the split:
--
--   collins        19 roll-call votes  + the curated stance block
--                  (politician-stances.js) + the cmp-data.js roster record
--   susan_collins   3 roll-call votes  + a second, thinner stance block
--
-- Every depth tier and every Say-vs-Do comparison is count-based, so the split
-- both understates her record (19 votes read as the whole story while 2 more sit
-- elsewhere) and double-counts one measure: H.R. 1 senate #372 is recorded under
-- BOTH ids, so a corpus-wide count of that roll call counts Maine's senior senator
-- twice.
--
-- WHERE THE SPLIT CAME FROM (fixed alongside this migration)
-- `db/vr-member-map.json` — the bioguide → slug map the live ingest resolves
-- against — mapped C001035 to `susan_collins`, because it is generated from the
-- BROWSE_PHOTOS portrait keys in index.html and that map used the long id. So the
-- curated seed migrations wrote `collins` while the live ingest wrote
-- `susan_collins`, and every new Senate roll call widened the gap. Re-keying the
-- portrait entry and regenerating the member map stops the split at its source;
-- `db/vr-pid-aliases.json` additionally canonicalizes the id in both the ingest
-- and the read API, so a stale Blobs member-map override or an old client that
-- still asks for `susan_collins` folds onto `collins` instead of forking again.
--
-- WHY `collins` IS THE SURVIVOR
-- It is the id in cmp-data.js (the light roster search index the app searches and
-- lists), it carries the richer sourced stance block including the July-2026
-- states_federal_power card, and it holds 19 of the 22 votes. `susan_collins` has
-- no cmp-data record at all.
--
-- SAFETY
-- vr_member_votes has a UNIQUE index on (rollcall_id, politician_id) and
-- vr_positions on (measure_id, politician_id, action_type), so a bare UPDATE would
-- fail on the overlapping row. Each table is therefore de-duplicated first, then
-- re-keyed. A roll call recorded under both ids with DIFFERENT positions is a real
-- data conflict, not a duplicate — this migration refuses to pick a winner and
-- raises instead. (There are zero such rows: the shared H.R. 1 vote is 'nay' under
-- both ids.)
--
-- Idempotent: after the first run no `susan_collins` row exists, so every
-- statement is a no-op and the conflict check trivially passes.
--
-- Additive: no roll call, measure, issue mapping, source or curated position is
-- deleted. The only rows removed are exact same-roll-call, same-position copies.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_dupes     int := 0;
  v_moved     int := 0;
  v_conflicts int := 0;
  v_pos_dupes int := 0;
  v_pos_moved int := 0;
  v_prop_moved int := 0;
BEGIN
  -- ── 1. Drop exact duplicate votes (same roll call, same position) ──────────
  DELETE FROM vr_member_votes d
   WHERE d.politician_id = 'susan_collins'
     AND EXISTS (
       SELECT 1 FROM vr_member_votes k
        WHERE k.rollcall_id    = d.rollcall_id
          AND k.politician_id  = 'collins'
          AND k.position       = d.position
     );
  GET DIAGNOSTICS v_dupes = ROW_COUNT;

  -- ── 2. Refuse to guess on a genuine disagreement ───────────────────────────
  -- Same roll call, two ids, two different positions ⇒ one of them is wrong. A
  -- silent merge would pick a winner and destroy the evidence that anything was
  -- ever wrong, so stop and surface it for a human instead.
  SELECT COUNT(*) INTO v_conflicts
    FROM vr_member_votes d
    JOIN vr_member_votes k
      ON k.rollcall_id = d.rollcall_id
     AND k.politician_id = 'collins'
   WHERE d.politician_id = 'susan_collins'
     AND k.position IS DISTINCT FROM d.position;

  IF v_conflicts > 0 THEN
    RAISE EXCEPTION
      'susan_collins → collins merge aborted: % roll call(s) record different positions under the two ids. Resolve by hand against the official Senate XML before merging.',
      v_conflicts;
  END IF;

  -- ── 3. Re-key the remaining votes ──────────────────────────────────────────
  UPDATE vr_member_votes SET politician_id = 'collins' WHERE politician_id = 'susan_collins';
  GET DIAGNOSTICS v_moved = ROW_COUNT;

  -- ── 4. Same shape for non-roll-call positions (co-sponsorships, amici) ─────
  -- There is no susan_collins row in vr_positions today; this makes the merge
  -- complete rather than partial, so a late-arriving row can't re-open the split.
  DELETE FROM vr_positions d
   WHERE d.politician_id = 'susan_collins'
     AND EXISTS (
       SELECT 1 FROM vr_positions k
        WHERE k.measure_id     = d.measure_id
          AND k.politician_id  = 'collins'
          AND k.action_type    = d.action_type
     );
  GET DIAGNOSTICS v_pos_dupes = ROW_COUNT;

  UPDATE vr_positions SET politician_id = 'collins' WHERE politician_id = 'susan_collins';
  GET DIAGNOSTICS v_pos_moved = ROW_COUNT;

  -- ── 5. The third politician-keyed surface: proposal links ──────────────────
  -- pdx_proposals.linked_politician_ids is a jsonb array of the same free-text
  -- ids. It is empty today, but leaving it out would make this a partial merge:
  -- a proposal linked to the retired id after deploy would point at a person who
  -- no longer has rows. jsonb_agg(DISTINCT …) also collapses the case where a
  -- proposal already links BOTH ids, which would otherwise leave 'collins' twice.
  UPDATE pdx_proposals SET linked_politician_ids = (
    SELECT jsonb_agg(DISTINCT CASE WHEN e = '"susan_collins"'::jsonb
                                   THEN '"collins"'::jsonb ELSE e END)
      FROM jsonb_array_elements(linked_politician_ids) AS e)
   WHERE linked_politician_ids @> '["susan_collins"]'::jsonb;
  GET DIAGNOSTICS v_prop_moved = ROW_COUNT;

  RAISE NOTICE 'susan_collins → collins: % duplicate vote(s) dropped, % vote(s) re-keyed, % duplicate position(s) dropped, % position(s) re-keyed, % proposal link(s) rewritten',
    v_dupes, v_moved, v_pos_dupes, v_pos_moved, v_prop_moved;
END $$;
