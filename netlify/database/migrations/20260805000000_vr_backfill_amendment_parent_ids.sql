-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — backfill parent_id on amendment measures that have roll calls
-- ─────────────────────────────────────────────────────────────────────────────
-- 20260804000000's report closed with one finding it deliberately did not act on:
--
--     "25 of the 29 amendment measures behind roll calls have no parent_id. The
--      chamber's record knows which bill each amendment amends; the ledger does
--      not. That is why 24 citations cannot be corroborated."
--
-- This is that follow-up. It is the reason scripts/vr-check-citations.mjs reports
-- 24 House amendment roll calls as measureMatch 'unconfirmed': the checker compares
-- bill designations, an H.Amdt. number is not a bill designation, and with no
-- parent_id there is nothing else to compare. The amendment rows are not wrong —
-- they are unverifiable, which is a different problem and a quieter one. An error
-- introduced into any of these 25 rows today would pass the sweep unnoticed.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- SOURCING — first-party chamber records only. Nothing inferred, nothing guessed.
-- ─────────────────────────────────────────────────────────────────────────────
-- congress.gov and govtrack.us both return 403 to this environment, so neither is
-- used here, and neither is the ledger's own vr_measures.title — the title strings
-- already say "H.Amdt. 232 (Boebert) to H.R. 8595", but that claim is precisely the
-- thing under test. A row cannot corroborate itself. Every parent below was read
-- out of the chamber's own structured record for the roll call the amendment was
-- voted on:
--
--   House   https://clerk.house.gov/evs/<year>/roll<NNN>.xml
--           <legis-num>          the bill the House was amending on that roll call
--           <amendment-author>   sponsor, used as an independent cross-check
--           <rollcall-num>, <congress>, <vote-question>  identity of the record
--
--   Senate  https://www.senate.gov/legislative/LIS/roll_call_votes/vote<C><S>/
--             vote_<C>_<S>_<NNNNN>.xml
--           <amendment_to_document_number>   the parent, named outright
--           <amendment_number>               the amendment's own designation
--           <vote_number>, <congress>, <question>  identity of the record
--
-- All 25 records returned HTTP 200. On all 25, the record's own roll number,
-- congress and vote question agree with the ledger's roll call, so the record
-- fetched is demonstrably the record for that vote and not a neighbouring one. On
-- all 24 House rows the sponsor surname in the ledger title also appears in
-- <amendment-author>; the Senate record carries no author element, and that one row
-- is cross-checked against the Senate's own vote menu instead (see section A).
--
-- NOTE ON <amendment-num>: the House Clerk's <amendment-num> is the DEBATE SEQUENCE
-- for that day, not the H.Amdt. designation — roll 276 carries <amendment-num>25
-- while the amendment is H.Amdt. 266. It is deliberately not used below. What ties
-- each record to each ledger row is the roll call, which is unambiguous.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT THIS CHANGES THAT A READER WILL SEE
-- ─────────────────────────────────────────────────────────────────────────────
-- voting-record.js:903 nests an amendment card under its parent bill's card when
-- both fall in the same issue group. Setting parent_id therefore moves some
-- amendment votes from the top level of a member's Voting Record into a
-- "N amendment votes" disclosure under the bill they amend. No record is removed,
-- no verdict changes, and no share card is created or destroyed by this migration —
-- receipt-cards.js does not read parentMeasureId at all.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION A — the one parent bill the ledger does not carry: H.R. 3944
-- ─────────────────────────────────────────────────────────────────────────────
-- 24 of the 25 amendments are to H.R. 8595 and H.R. 8800, both already in
-- vr_measures. The 25th, S.Amdt. 3428, is to H.R. 3944, which has no row at all, so
-- there is nothing to point parent_id at until one exists. It is created here from
-- chamber records and from nothing else:
--
--   • Senate vote 119/1/478 — the amendment vote itself
--     .../vote1191/vote_119_1_00478.xml
--     <amendment_number>S.Amdt. 3428</amendment_number>
--     <amendment_to_document_number>H.R. 3944</amendment_to_document_number>
--     <question>On the Amendment</question>  <vote_result>Amendment Rejected</>
--     <amendment_to_document_short_title>No short title on file</>  ← no title here
--
--   • Senate roll-call menu, 119th Congress 1st session
--     https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_119_1.xml
--     Vote 00478, issue "H.R. 3944", title "Johnson Amdt. No. 3428; To limit
--     disclosures regarding earmarks." — this is the cross-check that stands in for
--     the missing <amendment-author>: the ledger title says "(Johnson)" and the
--     Senate's own menu says Johnson.
--
--   • Senate vote 119/1/480 — passage of the bill, 2025-08-01
--     .../vote1191/vote_119_1_00480.xml
--     <document_name>H.R. 3944</document_name>
--     <question>On Passage of the Bill</question>
--     <vote_result>Bill Passed (87-9, 3/5 majority required)</vote_result>
--     This is where the row's status and source_url come from.
--
--   • House Clerk year indexes, swept in full for this bill
--     https://clerk.house.gov/evs/2025/index.asp → ROLL_100/200/300/... .asp
--     https://clerk.house.gov/evs/2026/index.asp
--     2025 roll 180  On Agreeing to the Amendment  A   (Carter of Texas En Bloc 2)
--     2025 roll 181  On Motion to Recommit         F
--     2025 roll 182  On Passage                    P   25-Jun-2025
--     2025 roll 263  On Motion to Instruct Conferees F 11-Sep-2025
--     2026            no H R 3944 roll call at all
--     Title taken from these rows: "Military Construction, Veterans Affairs, and
--     Related Agencies Appropriations Act, 2026".
--
-- STATUS — 'passed_senate' is chosen because it is the latest chamber passage any
-- first-party record above shows: the House passed it 2025-06-25 and the Senate
-- passed it as amended 2025-08-01. The bill then went to conference (House roll 263,
-- motion to instruct conferees) and NEITHER chamber's index records an enactment
-- vote through 2026-08-02. 'enacted' would therefore be a claim no record here
-- supports. The row is inert in the UI regardless: it carries no roll calls and no
-- issue mappings, so it produces no record items and no cards, and it exists solely
-- so that S.Amdt. 3428 has a checkable parent.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  n_dup   int;
  m_3944  int;
  n_set   int;
BEGIN
  -- ── A. Create H.R. 3944 if, and only if, it is genuinely absent ─────────────
  SELECT count(*) INTO n_dup
    FROM vr_measures
   WHERE congress = 119
     AND measure_type = 'bill'
     AND regexp_replace(upper(number), '[^A-Z0-9]', '', 'g') = 'HR3944';

  IF n_dup > 1 THEN
    -- Fail closed. Two rows for one bill means the parent lookup below is not 1:1
    -- and would attach amendments to an arbitrary one of them.
    RAISE EXCEPTION 'H.R. 3944 is already present % times; resolve the duplicate before backfilling parents', n_dup;
  ELSIF n_dup = 0 THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, status, source_url, source_label, external_ids)
    VALUES
      ('bill', 119, 'house', 'H.R. 3944',
       'Military Construction, Veterans Affairs, and Related Agencies Appropriations Act, 2026',
       'passed_senate',
       'https://www.senate.gov/legislative/LIS/roll_call_votes/vote1191/vote_119_1_00480.htm',
       'U.S. Senate',
       '{}'::jsonb)
    RETURNING id INTO m_3944;
    RAISE NOTICE 'created H.R. 3944 as measure % (parent of S.Amdt. 3428)', m_3944;
  ELSE
    RAISE NOTICE 'H.R. 3944 already present; not re-created';
  END IF;

  -- ── B. The parent lookup must be exactly 1:1 before anything is written ─────
  SELECT count(*) INTO n_dup
    FROM vr_measures
   WHERE congress = 119
     AND measure_type = 'bill'
     AND regexp_replace(upper(number), '[^A-Z0-9]', '', 'g') IN ('HR8595', 'HR8800', 'HR3944');

  IF n_dup <> 3 THEN
    RAISE EXCEPTION
      'expected exactly 3 parent bill rows (H.R. 8595, H.R. 8800, H.R. 3944) in the 119th, found % — refusing to guess which one an amendment belongs to', n_dup;
  END IF;

  -- ── C. Backfill parent_id from the chamber records ─────────────────────────
  -- record_bill below is the chamber's own text, transcribed verbatim: the House
  -- Clerk writes "H R 8595", the Senate writes "H.R. 3944". Neither is rewritten
  -- here — the join normalises punctuation on both sides instead, so the file
  -- keeps showing exactly what the record said.
  --
  -- The match is anchored on the ROLL CALL (congress, session, roll number), which
  -- is what the fetched record is identified by, and additionally requires the
  -- ledger's own amendment designation and chamber to agree. If any of that has
  -- drifted since the records were read, the row simply does not match and is left
  -- alone rather than being written on a partial match.
  --
  -- `m.parent_id IS NULL` makes this a no-op on re-run and means an existing parent
  -- is never overwritten by this migration.
  UPDATE vr_measures m
     SET parent_id = p.id,
         updated_at = now()
    FROM (VALUES
      -- cong sess roll  amendment        record's own text   <amendment-author> / menu entry
      (119, 2, 241, 'H.Amdt. 232',  'H R 8595',  'house'),  -- Boebert of Colorado Part A Amendment No. 1
      (119, 2, 242, 'H.Amdt. 234',  'H R 8595',  'house'),  -- Fine of Florida Part A Amendment No. 6
      (119, 2, 243, 'H.Amdt. 235',  'H R 8595',  'house'),  -- Massie of Kentucky Part A Amendment No. 8
      (119, 2, 244, 'H.Amdt. 236',  'H R 8595',  'house'),  -- Massie of Kentucky Part A Amendment No. 9
      (119, 2, 245, 'H.Amdt. 237',  'H R 8595',  'house'),  -- Roy of Texas Part A Amendment No. 20
      (119, 2, 255, 'H.Amdt. 242',  'H R 8800',  'house'),  -- Boebert of Colorado Part A Amendment No. 1
      (119, 2, 256, 'H.Amdt. 243',  'H R 8800',  'house'),  -- Boebert of Colorado Part A Amendment No. 2
      (119, 2, 257, 'H.Amdt. 244',  'H R 8800',  'house'),  -- Boebert of Colorado Part A Amendment No. 3
      (119, 2, 258, 'H.Amdt. 245',  'H R 8800',  'house'),  -- Boebert of Colorado Part A Amendment No. 4
      (119, 2, 259, 'H.Amdt. 247',  'H R 8800',  'house'),  -- Hunt of Texas Part A Amendment No. 6
      (119, 2, 260, 'H.Amdt. 248',  'H R 8800',  'house'),  -- Hunt of Texas Part A Amendment No. 7
      (119, 2, 261, 'H.Amdt. 249',  'H R 8800',  'house'),  -- Gallagher of California Part A Amendment No. 8
      (119, 2, 262, 'H.Amdt. 250',  'H R 8800',  'house'),  -- Carter of Georgia Part A Amendment No. 9
      (119, 2, 263, 'H.Amdt. 251',  'H R 8800',  'house'),  -- Crane of Arizona Part A Amendment No. 14
      (119, 2, 264, 'H.Amdt. 252',  'H R 8800',  'house'),  -- Crane of Arizona Part A Amendment No. 15
      (119, 2, 265, 'H.Amdt. 253',  'H R 8800',  'house'),  -- Crank of Colorado Part A Amendment No. 17
      (119, 2, 266, 'H.Amdt. 254',  'H R 8800',  'house'),  -- Boebert of Colorado Part A Amendment No. 18
      (119, 2, 267, 'H.Amdt. 255',  'H R 8800',  'house'),  -- Mace of South Carolina Part A Amendment No. 19
      (119, 2, 268, 'H.Amdt. 256',  'H R 8800',  'house'),  -- Mace of South Carolina Part A Amendment No. 20
      (119, 2, 269, 'H.Amdt. 257',  'H R 8800',  'house'),  -- McDowell of North Carolina Part A Amendment No. 26
      (119, 2, 273, 'H.Amdt. 258',  'H R 8800',  'house'),  -- Self of Texas Part A Amendment No. 28
      (119, 2, 274, 'H.Amdt. 259',  'H R 8800',  'house'),  -- Issa of California Part A Amendment No. 30
      (119, 2, 275, 'H.Amdt. 261',  'H R 8800',  'house'),  -- Harrigan of North Carolina Part A Amendment No. 44
      (119, 2, 276, 'H.Amdt. 266',  'H R 8800',  'house'),  -- Grothman of Wisconsin Part A Amendment No. 316
      (119, 1, 478, 'S.Amdt. 3428', 'H.R. 3944', 'senate')  -- Senate menu: "Johnson Amdt. No. 3428"
    ) AS e (congress, session, roll_number, amdt_number, record_bill, chamber)
    JOIN vr_rollcalls r
      ON r.congress    = e.congress
     AND r.session     = e.session
     AND r.roll_number = e.roll_number
    JOIN vr_measures p
      ON p.congress = 119
     AND p.measure_type = 'bill'
     AND regexp_replace(upper(p.number),      '[^A-Z0-9]', '', 'g')
       = regexp_replace(upper(e.record_bill), '[^A-Z0-9]', '', 'g')
   WHERE m.id           = r.measure_id
     AND m.measure_type = 'amendment'
     AND m.number       = e.amdt_number
     AND m.chamber      = e.chamber
     AND m.parent_id IS NULL;

  GET DIAGNOSTICS n_set = ROW_COUNT;
  RAISE NOTICE 'parent_id set on % amendment measure(s) (0 on a re-run)', n_set;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFY — read-only NOTICEs. Nothing below writes.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  n  int;
  st text;
BEGIN
  SELECT count(*) INTO n
    FROM vr_measures m
   WHERE m.measure_type = 'amendment'
     AND m.parent_id IS NULL
     AND EXISTS (SELECT 1 FROM vr_rollcalls r WHERE r.measure_id = m.id);
  RAISE NOTICE 'amendment measures with roll calls and no parent: % (target 0)', n;

  SELECT count(*) INTO n
    FROM vr_measures m
   WHERE m.measure_type = 'amendment'
     AND EXISTS (SELECT 1 FROM vr_rollcalls r WHERE r.measure_id = m.id);
  RAISE NOTICE 'amendment measures with roll calls, total: % (target 28 — unchanged)', n;

  FOR st, n IN
    SELECT p.number, count(*)
      FROM vr_measures m JOIN vr_measures p ON p.id = m.parent_id
     WHERE m.measure_type = 'amendment'
       AND EXISTS (SELECT 1 FROM vr_rollcalls r WHERE r.measure_id = m.id)
     GROUP BY p.number ORDER BY count(*) DESC, p.number
  LOOP
    RAISE NOTICE '  parent % → % amendment(s)', st, n;
  END LOOP;

  -- An amendment must hang off a bill, never off another amendment or itself.
  SELECT count(*) INTO n
    FROM vr_measures m JOIN vr_measures p ON p.id = m.parent_id
   WHERE m.measure_type = 'amendment'
     AND (p.measure_type <> 'bill' OR p.id = m.id);
  RAISE NOTICE 'amendments whose parent is not a bill (or is itself): % (target 0)', n;

  SELECT count(*) INTO n FROM vr_measures
   WHERE congress = 119 AND measure_type = 'bill'
     AND regexp_replace(upper(number), '[^A-Z0-9]', '', 'g') = 'HR3944';
  RAISE NOTICE 'H.R. 3944 rows: % (target 1)', n;

  SELECT status INTO st FROM vr_measures
   WHERE congress = 119 AND measure_type = 'bill' AND number = 'H.R. 3944';
  RAISE NOTICE 'H.R. 3944 status: % (target passed_senate — Senate vote 119/1/480)', coalesce(st, '(absent)');

  SELECT count(*) INTO n
    FROM vr_rollcalls r JOIN vr_measures m ON m.id = r.measure_id
   WHERE m.congress = 119 AND m.number = 'H.R. 3944';
  RAISE NOTICE 'H.R. 3944 roll calls: % (target 0 — the row is a parent anchor, not a vote record)', n;

  SELECT count(*) INTO n
    FROM vr_measure_issues mi JOIN vr_measures m ON m.id = mi.measure_id
   WHERE m.congress = 119 AND m.number = 'H.R. 3944';
  RAISE NOTICE 'H.R. 3944 issue mappings: % (target 0 — none was sourced, so none is invented)', n;
END $$;
