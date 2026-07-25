-- ─────────────────────────────────────────────────────────────────────────────
-- Repair two orphan issue keys: crypto → crypto_cbdc, defense → strong_defense
-- ─────────────────────────────────────────────────────────────────────────────
--
-- THE PROBLEM
-- `vr_measure_issues.issue_key` is free text (db/schema.ts:705); nothing in Postgres
-- ties it to the client's ISSUE_MAP vocabulary. The read path validates against the
-- generated allow-list and DROPS what it doesn't recognise, silently, by design:
--
--     if (!assertIssueKey(r.issueKey)) continue;   -- voting-record.mts:244
--
-- Two rows were written with keys that have never existed in ISSUE_MAP. The real
-- keys are `crypto_cbdc` and `strong_defense`; the seeds used the bare nouns:
--
--   'crypto'   S. 1582 (GENIUS Act), weight 90, secondary
--              20260719210000_seed_landmark_measures_wave4.sql:52
--   'defense'  PN11-7 (Hegseth — SecDef), weight 100, is_primary = true
--              20260719230000_seed_landmark_measures_wave5.sql:79
--
-- Both mappings have therefore never reached the client, and nothing surfaced it:
-- no error, no warning, no count. The rows are present in every SQL audit and
-- absent from every rendered percentage.
--
-- WHY THE HEGSETH ROW IS THE CONSEQUENTIAL ONE
-- It is that measure's ONLY remaining issue mapping, and it is the primary. The
-- preceding correction (20260725010000) deleted PN11-7's `gov_balance` row — a
-- confirmation vote carries no readable direction on institutional power — and
-- justified it in its own header:
--
--     "Nothing substantive is lost: all eight nominations already carry
--      department-specific mappings (Hegseth→defense, Kennedy→healthcare, …)"
--
-- Seven of those eight keys are real. `defense` is not, so for PN11-7 that
-- sentence is false: the row it deferred to was already unreachable. Net effect
-- today is a 51-50 Senate confirmation that attaches to NO issue at all, has no
-- reachable primary, and whose Distributional Impact rows route nowhere —
-- getIssueImpacts() attributes whole-measure impact by
-- `primaryByMeasure.get(measureId) === issueKey`, and that map has no entry for a
-- measure whose only primary was filtered out on load.
--
-- WHAT THIS MIGRATION DOES
-- Re-points the two keys. Nothing else. weight, is_primary, support_meaning,
-- rationale and source_url are all untouched — an UPDATE that sets only issue_key
-- cannot alter them. No mapping is invented, no row is added, no direction is
-- flipped. Both destinations are existing ISSUE_MAP keys, so the re-pointed rows
-- become visible exactly as their original curation intended:
--
--   S. 1582  crypto_cbdc     w90  secondary  yea_supports   (joins tech_innovation
--            w100 primary, which was already reachable — this adds a second issue)
--   PN11-7   strong_defense  w100 PRIMARY    yea_supports   (restores the measure's
--            only mapping and its only primary)
--
-- ON THE UNIQUE INDEX
-- vr_measure_issues_unique is on (measure_id, issue_key), so re-pointing would
-- collide if the destination key already existed on the same measure. Neither does:
-- `crypto_cbdc` appears nowhere in the corpus, and no `strong_defense` row is
-- attached to PN11-7. The UPDATEs are still written with a NOT EXISTS guard rather
-- than relying on that, because a bare UPDATE would abort the whole deploy on a
-- collision, and the correct behaviour for a duplicate is to drop the unreachable
-- copy — not to block every other migration behind it. The trailing DELETE removes
-- only rows that the guard skipped, i.e. rows whose correct-key twin already
-- exists, which are pure unreachable duplicates. As verified above it deletes
-- nothing today; it exists so the repair is total rather than partial, and so the
-- key is fully retired from the table.
--
-- IDEMPOTENCE
-- After the first run no row holds 'crypto' or 'defense', so every statement
-- matches zero rows and the notices report 0. Safe to re-run; safe to run against a
-- database where the seeds never applied.
--
-- GUARD ADDED ALONGSIDE
-- scripts/test-issue-key-integrity.mjs now fails, loudly and with the file and line,
-- if any migration writes an issue_key that is not in db/issue-keys.json, or if that
-- allow-list has drifted from ISSUE_MAP. That is the permanent fix; this migration is
-- only the cleanup. The harness models retirement, so it reads the DELETEs below as
-- "this key no longer exists in the table" rather than flagging the original seeds
-- forever — the applied seed files are historical record and are never edited.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  r        record;
  n_moved  integer := 0;
  n_dupe   integer := 0;
  hit      integer;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('crypto',  'crypto_cbdc'),
      ('defense', 'strong_defense')
    ) AS t(bad_key, good_key)
  LOOP
    -- Re-point every row that can move. Only issue_key changes.
    UPDATE vr_measure_issues t
       SET issue_key = r.good_key
     WHERE t.issue_key = r.bad_key
       AND NOT EXISTS (
         SELECT 1 FROM vr_measure_issues x
          WHERE x.measure_id = t.measure_id
            AND x.issue_key = r.good_key);
    GET DIAGNOSTICS hit = ROW_COUNT;
    n_moved := n_moved + hit;
    IF hit > 0 THEN
      RAISE NOTICE 'orphan key repair: % row(s) re-pointed % -> %', hit, r.bad_key, r.good_key;
    END IF;
  END LOOP;

  -- Anything still bearing a bad key was skipped by the guard above, which means the
  -- correct-key row already exists on that measure and this copy is an unreachable
  -- duplicate. Expected to be zero.
  DELETE FROM vr_measure_issues WHERE issue_key = 'crypto';
  GET DIAGNOSTICS hit = ROW_COUNT;
  n_dupe := n_dupe + hit;

  DELETE FROM vr_measure_issues WHERE issue_key = 'defense';
  GET DIAGNOSTICS hit = ROW_COUNT;
  n_dupe := n_dupe + hit;

  IF n_dupe > 0 THEN
    RAISE NOTICE 'orphan key repair: % unreachable duplicate row(s) dropped', n_dupe;
  END IF;

  RAISE NOTICE 'orphan key repair: % re-pointed, % duplicates dropped', n_moved, n_dupe;
END $$;
