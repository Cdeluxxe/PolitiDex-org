-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — repair the MEASURE IDENTITY of House roll 119/1/247
-- ─────────────────────────────────────────────────────────────────────────────
-- 20260726200000_vr_backfill_rollcall_questions.sql filled roll 247's question and
-- action_type and deliberately left its measure_id alone, recording the reason in its
-- header ("Repairing that means inserting a new vr_measures row for H.Amdt. 87 and
-- re-pointing roll 247 — a measure-identity change, not a question backfill … Both are
-- left for a follow-up"). This is that follow-up, and nothing more.
--
-- THE DEFECT
--   vr_rollcalls 119/1/247 (house, session 1) is the vote the Clerk records as H.R. 3838
--   (FY2026 NDAA), "On Agreeing to the Amendment", <amendment-author>Mace of South
--   Carolina Part A Amendment No. 15</amendment-author>. Its measure_id points at the
--   NUMBERLESS pseudo-measure created for the Election of the Speaker (roll 119/1/2) —
--   number IS NULL, title 'Election of the Speaker' — because the House vote LIST
--   endpoint carries no legislation type/number for an amendment vote, so the row
--   arrived numberless and upsertMeasure() keyed it on (number IS NULL, title) straight
--   onto the first numberless row that existed. That same upsert then overwrote the
--   Speaker row's source_url with the amendment's Congress.gov URL
--   (…/amendment/119/house-amendment/87, in the pre-canonicalization bare-number form).
--
--   So one row currently carries the Speaker election's identity fields, roll 247's
--   source URL, and two unrelated roll calls. Every member-vote attributed to roll 247
--   — 38 of them — displays under the wrong measure identity: an amendment vote
--   presented as the Election of the Speaker.
--
--   This is the same failure 20260724130000 (section A) repaired for rolls 119/1/245 and
--   119/1/259, which were the only two numberless amendment votes on the row at the
--   time. Roll 247 landed on it afterwards, from a later pull of the same pre-fix
--   ingest, so it missed that pass.
--
-- SOURCING — nothing here is inferred, and no policy purpose is invented.
--   • Clerk roll-call record   https://clerk.house.gov/evs/2025/roll247.xml
--     legis-num "H R 3838", vote-question "On Agreeing to the Amendment",
--     amendment-author "Mace of South Carolina Part A Amendment No. 15",
--     Agreed to 227-201, 2025-09-10.
--   • GPO BILLSTATUS-119hr3838 identifies that amendment as H.Amdt. 87 (Rep. Mace),
--     "An amendment numbered 15 printed in Part A of House Report 119-255", agreed to
--     227-201 at 16:57:50 on 2025-09-10.
--   Both match what we already store for roll 247 exactly — totals {yea:227,nay:201}
--   and vote_date 2025-09-10T20:57Z — which is what makes the re-point safe.
--
--   Neither source we hold carries this amendment's PURPOSE text, so unlike its
--   siblings H.Amdt. 85 and H.Amdt. 97 (whose Congress.gov purposes were read in
--   20260724130000) the new row's title stops at the sourced citation. A guessed
--   one-line description of what the amendment does would be exactly the kind of
--   invention this repair must not add.
--
-- SCOPE — measure identity only.
--   Creates the H.Amdt. 87 measure row (child of H.R. 3838), re-points roll 247 at it,
--   and restores the Speaker row's own source_url. It writes NO vr_measure_issues rows
--   and remaps nothing: the Speaker row carries no issue mappings today, so no verdict
--   direction depends on this, and whether H.Amdt. 87 speaks to a curated issue is a
--   separate judgement that belongs in db/vr-issue-seed.json. It touches no
--   vr_member_votes row — the 38 votes stay on roll 247 and only the identity above
--   them changes. The adjacent defects 20260726200000 recorded (required_majority
--   'simple' vs the Clerk's "2/3 YEA-AND-NAY" on seven suspension votes; the duplicate
--   H.Res. 377 measure rows) are still open and still untouched here.
--
-- ADDITIVE + IDEMPOTENT: the measure row is guarded by an existence check on its
-- natural identity (vr_measures has no unique constraint, so ON CONFLICT is not
-- available), the re-point is IS DISTINCT FROM, and the source_url restore only fires
-- while the value is still the amendment URL. Re-running changes nothing. It rolls
-- forward from the applied migrations and edits none of them.
--
-- FRESH PROVISION: on a database where roll 247 has never been ingested, the H.Amdt. 87
-- identity row is still created (it is sourced, and inert without an issue mapping) and
-- both the re-point and the source_url restore are no-ops. Once the amendment row
-- exists under number 'H.Amdt. 87', a future ingest that does read the amendment
-- metadata converges on it — upsertMeasure() keys numbered measures on
-- (measure_type, congress, chamber, number) — instead of collapsing onto a numberless
-- row again.

DO $$
DECLARE
  ndaa    integer;
  amdt87  integer;
  rc247   integer;
  bucket  integer;
  prev    integer;
BEGIN

  -- ═══════════════════════════════════════════════════════════════════════════
  -- A. Ensure the H.Amdt. 87 measure row
  -- ═══════════════════════════════════════════════════════════════════════════
  -- Nested under H.R. 3838 via parent_id, the way 20260724130000 created H.Amdt. 85 and
  -- H.Amdt. 97, so the UI can show an amendment vote under the measure it amends. If
  -- the parent bill is absent the child is still correct, just un-nested.
  SELECT id INTO ndaa
    FROM vr_measures
   WHERE measure_type = 'bill' AND congress = 119 AND chamber = 'house'
     AND number = 'H.R. 3838'
   LIMIT 1;

  SELECT id INTO amdt87
    FROM vr_measures
   WHERE measure_type = 'amendment' AND congress = 119 AND chamber = 'house'
     AND number = 'H.Amdt. 87'
   LIMIT 1;

  IF amdt87 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, summary, parent_id, status,
       source_url, source_label, external_ids)
    VALUES
      ('amendment', 119, 'house', 'H.Amdt. 87',
       'H.Amdt. 87 (Mace) to H.R. 3838 — amendment numbered 15 printed in Part A of House Report 119-255',
       'Amendment offered to H.R. 3838, the FY2026 National Defense Authorization Act. '
       || 'GPO BILLSTATUS-119hr3838 describes it as "An amendment numbered 15 printed in '
       || 'Part A of House Report 119-255"; the Clerk''s roll-call record names the '
       || 'author as "Mace of South Carolina Part A Amendment No. 15". Agreed to in the '
       || 'House 227-201 (roll call 119/1/247, 2025-09-10). No purpose text is recorded '
       || 'for this amendment in the sources read, so none is stated here.',
       ndaa, 'passed_house',
       'https://www.congress.gov/amendment/119th-congress/house-amendment/87',
       'Congress.gov', '{}'::jsonb)
    RETURNING id INTO amdt87;
  ELSE
    -- Pre-existing row (a later ingest may have created it): only fill the parent link
    -- if it is still missing. Its title/summary are left exactly as they are.
    UPDATE vr_measures
       SET parent_id = ndaa, updated_at = now()
     WHERE id = amdt87 AND parent_id IS NULL AND ndaa IS NOT NULL;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- B. Re-point roll 119/1/247 at the amendment it actually voted on
  -- ═══════════════════════════════════════════════════════════════════════════
  -- Addressed by the natural key (chamber, congress, session, roll_number), which is
  -- the unique index vr_rollcalls_unique, so this holds regardless of surrogate ids.
  -- vr_member_votes rows hang off rollcall_id and are not touched.
  SELECT id, measure_id INTO rc247, prev
    FROM vr_rollcalls
   WHERE chamber = 'house' AND congress = 119 AND session = 1 AND roll_number = 247
   LIMIT 1;

  IF rc247 IS NOT NULL AND amdt87 IS NOT NULL THEN
    UPDATE vr_rollcalls
       SET measure_id = amdt87, updated_at = now()
     WHERE id = rc247 AND measure_id IS DISTINCT FROM amdt87;
    IF prev IS DISTINCT FROM amdt87 THEN
      RAISE NOTICE 'roll 119/1/247: measure_id % -> % (H.Amdt. 87)', prev, amdt87;
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- C. Restore the Speaker-election pseudo-measure's own source
  -- ═══════════════════════════════════════════════════════════════════════════
  -- Located through the vote that legitimately belongs to it (roll 119/1/2), the same
  -- way 20260724130000 found it, so it still resolves after the amendment votes have
  -- moved off. Its title and summary were already set correctly by that migration and
  -- are left alone; only the source_url was collateral damage.
  --
  -- Restored to the value the normalizer itself produces for a measure with no
  -- legislation URL — `https://www.congress.gov/roll-call-vote/{congress}/{chamber}/
  -- {roll}` (netlify/lib/vr-normalize.ts) — which is what this row held before roll
  -- 247's amendment URL overwrote it, and what the next ingest of roll 2 will write
  -- again. Restoring to anything else would just be overwritten back.
  SELECT measure_id INTO bucket
    FROM vr_rollcalls
   WHERE chamber = 'house' AND congress = 119 AND session = 1 AND roll_number = 2
   LIMIT 1;

  -- Fallback for a database that holds the conflated row but not roll 2 itself: the
  -- numberless Speaker row still identifies itself by title. Both paths converge on the
  -- same row; neither can match a numbered measure.
  IF bucket IS NULL THEN
    SELECT id INTO bucket
      FROM vr_measures
     WHERE number IS NULL AND congress = 119 AND chamber = 'house'
       AND title = 'Election of the Speaker'
     LIMIT 1;
  END IF;

  IF bucket IS NOT NULL THEN
    UPDATE vr_measures
       SET source_url = 'https://www.congress.gov/roll-call-vote/119/house/2',
           source_label = 'Congress.gov',
           updated_at = now()
     WHERE id = bucket
       AND number IS NULL
       AND source_url LIKE '%house-amendment/87';
  END IF;

END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Verification — reports state, never raises. A branch database missing these rows
-- must still migrate cleanly, so every check is a NOTICE.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  ident    text;
  votes    integer;
  shared   integer;
  bucket   integer;
  buckurl  text;
  mapped   integer;
BEGIN
  SELECT coalesce(m.number, '(numberless)') || ' — ' || coalesce(m.title, '(untitled)')
    INTO ident
    FROM vr_rollcalls r
    LEFT JOIN vr_measures m ON m.id = r.measure_id
   WHERE r.chamber = 'house' AND r.congress = 119 AND r.session = 1
     AND r.roll_number = 247;
  RAISE NOTICE 'roll 119/1/247 now displays under: %  (target: H.Amdt. 87 …)',
    coalesce(ident, '(roll not present in this database)');

  SELECT count(*) INTO votes
    FROM vr_member_votes mv
    JOIN vr_rollcalls r ON r.id = mv.rollcall_id
   WHERE r.chamber = 'house' AND r.congress = 119 AND r.session = 1
     AND r.roll_number = 247;
  RAISE NOTICE 'roll 119/1/247 member votes: % (unchanged by this migration; 38 before it)',
    votes;

  SELECT r.measure_id INTO bucket
    FROM vr_rollcalls r
   WHERE r.chamber = 'house' AND r.congress = 119 AND r.session = 1 AND r.roll_number = 2
   LIMIT 1;

  IF bucket IS NULL THEN
    SELECT id INTO bucket
      FROM vr_measures
     WHERE number IS NULL AND congress = 119 AND chamber = 'house'
       AND title = 'Election of the Speaker'
     LIMIT 1;
  END IF;

  IF bucket IS NULL THEN
    RAISE NOTICE 'Speaker-election measure: not present in this database';
  ELSE
    SELECT count(*) INTO shared FROM vr_rollcalls WHERE measure_id = bucket;
    SELECT source_url INTO buckurl FROM vr_measures WHERE id = bucket;
    RAISE NOTICE 'Speaker-election measure %: % roll call(s) attached (target 1), source_url %',
      bucket, shared, buckurl;
    IF buckurl LIKE '%house-amendment%' THEN
      RAISE NOTICE 'Speaker-election measure %: source_url STILL points at an amendment', bucket;
    END IF;
  END IF;

  SELECT count(*) INTO mapped
    FROM vr_measure_issues mi
    JOIN vr_measures m ON m.id = mi.measure_id
   WHERE m.measure_type = 'amendment' AND m.congress = 119 AND m.chamber = 'house'
     AND m.number = 'H.Amdt. 87';
  RAISE NOTICE 'H.Amdt. 87 issue mappings: % (target 0 — identity only, no remap in this pass)',
    mapped;
END $$;
