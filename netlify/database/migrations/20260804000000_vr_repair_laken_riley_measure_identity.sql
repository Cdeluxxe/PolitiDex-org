-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — repair the LAKEN RILEY measure identity (H.R. 29 vs S. 5)
-- ─────────────────────────────────────────────────────────────────────────────
-- 20260803000000's header recorded one defect it deliberately did not fix:
--
--     "NOT FIXED HERE — Senate roll 119/1/7 … the page is On Passage of S. 5."
--
-- This is that follow-up. The link check in db/vr-citation-check.json found it by
-- fetching the citation the card would print and reading the page; receipt-cards.js
-- guard 14 has been refusing the resulting cards ever since. Refusing them keeps a
-- wrong card off a share graphic, but it does not make the ledger true, and the same
-- wrong attribution still shows on the profile record rows and the bill timeline,
-- which guard 14 does not gate. This migration makes the ledger true.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- THE DEFECT — two bills with the same name, and we filed one under the other
-- ─────────────────────────────────────────────────────────────────────────────
-- The Laken Riley Act existed twice in the 119th Congress:
--
--   H.R. 29  Rep. Mike Collins (R-GA-10), introduced 2025-01-03.
--            Passed the House 264-159 on 2025-01-07 (roll 119/1/6) and went no
--            further: its last recorded action is 2025-02-10, "Read the second time.
--            Placed on Senate Legislative Calendar under General Orders. Calendar
--            No. 10." It has NO Senate roll call and it never became law.
--
--   S. 5     Sen. Katie Britt (R-AL), introduced 2025-01-06.
--            Senate rolls 119/1/1-7 (motion to proceed, cloture, three amendments,
--            passage), passed the Senate as amended 64-35 on 2025-01-20 (roll 7),
--            passed the House 263-156 on 2025-01-22 (roll 23), presented 2025-01-23,
--            signed 2025-01-29. S. 5 — not H.R. 29 — is Public Law 119-1.
--
-- The ledger currently states, falsely:
--
--   1. vr_rollcalls 119/1/7 (senate, 83 member votes) hangs off vr_measures 'H.R. 29'.
--      The Senate's own page for that vote reads "Measure Number: S. 5".
--   2. vr_rollcalls 119/1/23 (house, 4 member votes) hangs off a child measure
--      'Senate Amendments to H.R. 29' with the question "On Motion to Concur in the
--      Senate Amendments" and action_type 'amendment'. The Clerk's own record for
--      that roll reads legis-num "S 5", vote-question "On Passage". The House never
--      voted to concur in Senate amendments to H.R. 29, because the Senate never
--      amended H.R. 29 — it never took it up at all.
--   3. vr_measures 'H.R. 29' carries status 'enacted' and external_ids.publicLaw
--      '119-1', and its vr_measure_actions timeline ends "Signed into law as Public
--      Law 119-1." All three belong to S. 5.
--
-- One name, two vehicles, and an early seed that assumed the House-numbered one was
-- the one that travelled. It is the mirror image of the roll-247 defect
-- 20260727000000 repaired: there, one measure row wrongly held two roll calls; here,
-- two roll calls are wrongly held by the measure next door.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- SOURCING — first-party chamber records and GPO. Nothing inferred.
-- ─────────────────────────────────────────────────────────────────────────────
--   • Senate roll-call list, 119th Congress 1st session
--     https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_119_1.htm
--     Rolls 1-7 are all "S. 5"; the list contains no H.R. 29 vote whatsoever.
--   • Senate vote 119/1/7
--     https://www.senate.gov/legislative/LIS/roll_call_votes/vote1191/vote_119_1_00007.htm
--     Question "On Passage of the Bill (S. 5, As Amended)"; Vote Number 7;
--     Vote Date January 20, 2025 06:12 PM; Measure Number "S. 5"; YEAs 64 NAYs 35.
--   • Clerk roll-call record, House 119/1/23
--     https://clerk.house.gov/evs/2025/roll023.xml
--     legis-num "S 5", vote-question "On Passage", vote-desc "Laken Riley Act",
--     Passed, 22-Jan-2025, 263-156-0, 14 not voting.
--   • Clerk roll-call record, House 119/1/6
--     https://clerk.house.gov/evs/2025/roll006.xml
--     legis-num "H R 29", "On Passage", Passed, 7-Jan-2025, 264-159-0, 11 not voting.
--     This one is CORRECT as stored and is left exactly as it is.
--   • GPO BILLSTATUS-119s5   https://www.govinfo.gov/content/pkg/BILLSTATUS-119s5/xml/BILLSTATUS-119s5.xml
--     sponsor Sen. Britt, Katie Boyd [R-AL] (B001319); introduced 2025-01-06;
--     recorded votes Senate 1-7 and House 23; laws: Public Law 119-1;
--     latestAction 2025-01-29 "Became Public Law No: 119-1."
--   • GPO BILLSTATUS-119hr29  https://www.govinfo.gov/content/pkg/BILLSTATUS-119hr29/xml/BILLSTATUS-119hr29.xml
--     sponsor Rep. Collins, Mike [R-GA-10] (C001129); introduced 2025-01-03;
--     recorded votes: House roll 6 ONLY; laws: (none);
--     latestAction 2025-02-10 "Read the second time. Placed on Senate Legislative
--     Calendar under General Orders. Calendar No. 10."
--
-- Congress.gov and GovTrack both refuse this environment (HTTP 403), so every fact
-- above comes from the chamber that recorded it or from GPO's published bill status.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- SCOPE
-- ─────────────────────────────────────────────────────────────────────────────
-- Identity only. It creates the S. 5 measure, moves the two roll calls that are
-- already recorded under S. 5 by their own chambers onto it, carries the curated
-- issue mappings that remain true of S. 5, gives S. 5 the timeline that belongs to
-- it, and corrects the three false enactment claims on H.R. 29.
--
-- It does NOT touch a single vr_member_votes row: all 83 Senate votes stay on roll 7
-- and all 4 House votes stay on roll 23, and only the measure identity above them
-- changes. It does not touch House roll 6 or H.R. 29's own House-passage record.
-- It creates no member, no position, no impact, and deletes nothing.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- ISSUE MAPPINGS — carried only where the curated rationale is still true of S. 5
-- ─────────────────────────────────────────────────────────────────────────────
-- H.R. 29 carries four curated mappings. Each was checked against S. 5 as the Senate
-- passed it on roll 7 (identical to the enacted text — the House passed it without
-- further amendment), per the CRS summary published with Public Law 119-1:
--
--   deportations         w100 primary yea_supports — CARRIED VERBATIM.
--     "Mandates detention and removal proceedings for covered unauthorized
--     immigrants." True of S. 5: DHS "must detain" covered individuals.
--
--   border_security      w70 yea_supports — CARRIED VERBATIM.
--     "Tightens immigration enforcement." True of S. 5.
--
--   states_federal_power w40 yea_supports — CARRIED VERBATIM.
--     "Gives state attorneys general standing to sue the federal government …"
--     True of S. 5, and confirmed by the Senate's own record: the Coons amendment
--     to STRIKE that section (S.Amdt. 23, roll 119/1/4) was REJECTED 46-49, so the
--     provision survived into the bill this roll call passed.
--
--   tough_on_crime       w55 yea_supports — CARRIED, WITH THE OFFENCE LIST RESTATED
--     FROM THE SOURCE. The H.R. 29 rationale enumerates "theft, burglary,
--     shoplifting, or assaulting a law-enforcement officer". Every offence it names
--     is in S. 5, so the mapping holds — but the list is not S. 5's list. The Senate
--     added assault of a law-enforcement officer (Cornyn, S.Amdt. 14, roll 119/1/3,
--     agreed 70-25) and crimes resulting in death or serious bodily injury (Ernst,
--     S.Amdt. 8, roll 119/1/6, agreed 75-24). The PL 119-1 summary states the full
--     list, and that is what the S. 5 row says. Restating an enumeration from the
--     enacted text is not invention; shipping a card that describes S. 5 using a
--     different bill's offence list would be the error.
--
--     (Note for a future curation pass, NOT fixed here: that same H.R. 29 rationale
--     names assault of a law-enforcement officer, which the House-passed text of
--     H.R. 29 did not contain — the introduced-in-Senate CRS summary of the same
--     text lists only "burglary, theft, larceny, or shoplifting". So H.R. 29's own
--     tough_on_crime rationale appears to have been written about the enacted Act.
--     Correcting a curated rationale on H.R. 29 belongs in db/vr-issue-seed.json,
--     not in an identity repair, and H.R. 29 keeps its mapping untouched here.)
--
-- The two mappings on the 'Senate Amendments to H.R. 29' row are NOT carried. One of
-- them ("Concurring adopts the broadened detention/removal triggers.") describes an
-- act of concurrence that never happened, and S. 5 already receives a better-worded
-- mapping for both keys from H.R. 29's curation.
--
-- db/vr-issue-seed.json gains the same four rows for S. 5 in the same commit, so a
-- later `POST /seed-issues` re-asserts them instead of reverting.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- ADDITIVE + IDEMPOTENT
-- ─────────────────────────────────────────────────────────────────────────────
-- The S. 5 row is guarded by an existence check on its natural identity
-- (vr_measures has no unique constraint, so ON CONFLICT is unavailable); the
-- re-points are IS DISTINCT FROM; the issue rows use the vr_measure_issues_unique
-- index; the timeline rows are guarded per (stage, date); every correction to
-- H.R. 29 is guarded on the false value it is replacing. Re-running changes nothing.
-- It rolls forward from the applied migrations and edits none of them.
--
-- FRESH PROVISION: on a database where none of these rows exist, the S. 5 identity
-- row is still created (sourced, and inert without roll calls) and every re-point
-- and correction is a no-op. Once S. 5 exists under its own number, a later ingest
-- converges on it — upsertMeasure() keys numbered measures on
-- (measure_type, congress, chamber, number) — instead of landing on H.R. 29 again.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  m_hr29   integer;
  m_s5     integer;
  m_samdt  integer;
  rc_s7    integer;
  rc_h23   integer;
  prev     integer;
BEGIN

  SELECT id INTO m_hr29
    FROM vr_measures
   WHERE congress = 119 AND chamber = 'house' AND number = 'H.R. 29'
   LIMIT 1;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- A. Ensure the S. 5 measure row
  -- ═══════════════════════════════════════════════════════════════════════════
  -- Numbered 'S. 5' exactly as canonicalMeasureNumber() in netlify/lib/vr-normalize.ts
  -- renders it, so the curated seed and any future ingest both find this row rather
  -- than creating a second one. sponsor_id stays NULL: it is a roster slug, and
  -- Sen. Britt is not in db/vr-member-map.json, so there is nothing to point at.
  -- H.R. 29's row has a NULL sponsor for the same reason.
  SELECT id INTO m_s5
    FROM vr_measures
   WHERE congress = 119 AND chamber = 'senate' AND number = 'S. 5'
   LIMIT 1;

  IF m_s5 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('bill', 119, 'senate', 'S. 5', 'Laken Riley Act', 'Laken Riley Act',
       'A bill to require the Secretary of Homeland Security to take into custody '
       || 'aliens who have been charged in the United States with theft, and for other '
       || 'purposes. Enacted as Public Law 119-1 on 2025-01-29. As enacted it requires '
       || 'DHS to detain certain non-U.S. nationals who have been arrested for '
       || 'burglary, theft, larceny, shoplifting, assault of a law enforcement officer, '
       || 'or any crime that results in death or serious bodily injury to another '
       || 'person, and authorizes state governments to sue the federal government for '
       || 'injunctive relief over certain immigration-enforcement decisions or '
       || 'failures. (Summary as published with Public Law 119-1.) The House companion, '
       || 'H.R. 29, passed the House on 2025-01-07 but was never taken up by the '
       || 'Senate; S. 5 is the vehicle that became law.',
       NULL, TIMESTAMPTZ '2025-01-06T00:00:00Z', NULL, 'enacted',
       'https://www.congress.gov/bill/119th-congress/senate-bill/5',
       'Congress.gov',
       '{"congressGovId":"s5-119","publicLaw":"119-1"}'::jsonb)
    RETURNING id INTO m_s5;
    RAISE NOTICE 'created vr_measures S. 5 as id %', m_s5;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- B. Re-point Senate roll 119/1/7 at S. 5
  -- ═══════════════════════════════════════════════════════════════════════════
  -- Addressed by the natural key (chamber, congress, session, roll_number) — the
  -- unique index vr_rollcalls_unique — so it holds regardless of surrogate ids.
  -- The stored question, "On Passage of the Bill, as Amended", is an accurate
  -- rendering of the Senate's "On Passage of the Bill (S. 5, As Amended)" and reads
  -- correctly once the measure beside it is S. 5, so it is left alone: this migration
  -- corrects statements that are false, not ones that are merely abbreviated.
  SELECT id, measure_id INTO rc_s7, prev
    FROM vr_rollcalls
   WHERE chamber = 'senate' AND congress = 119 AND session = 1 AND roll_number = 7
   LIMIT 1;

  IF rc_s7 IS NOT NULL AND m_s5 IS NOT NULL THEN
    UPDATE vr_rollcalls
       SET measure_id = m_s5, updated_at = now()
     WHERE id = rc_s7 AND measure_id IS DISTINCT FROM m_s5;
    IF prev IS DISTINCT FROM m_s5 THEN
      RAISE NOTICE 'roll 119/1/7 (senate): measure_id % -> % (S. 5)', prev, m_s5;
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- C. Re-point House roll 119/1/23 at S. 5, and correct its question
  -- ═══════════════════════════════════════════════════════════════════════════
  -- The Clerk records this as legis-num "S 5", vote-question "On Passage". The stored
  -- question ("On Motion to Concur in the Senate Amendments") and action_type
  -- ('amendment') describe a parliamentary step that did not occur, so unlike roll 7
  -- they cannot be left: a card printing that question beside a Clerk page reading
  -- "On Passage" would contradict its own citation. 'passage' is exactly what
  -- mapActionType() in netlify/lib/vr-normalize.ts returns for "On Passage", so the
  -- row now says what a fresh ingest of the same record would write.
  --
  -- The totals already stored (263-156, 14 not voting) match the Clerk's record
  -- exactly, which is what makes the re-point safe: this is the same vote, correctly
  -- counted, wrongly labelled.
  SELECT id, measure_id INTO rc_h23, prev
    FROM vr_rollcalls
   WHERE chamber = 'house' AND congress = 119 AND session = 1 AND roll_number = 23
   LIMIT 1;

  IF rc_h23 IS NOT NULL AND m_s5 IS NOT NULL THEN
    UPDATE vr_rollcalls
       SET measure_id = m_s5, updated_at = now()
     WHERE id = rc_h23 AND measure_id IS DISTINCT FROM m_s5;
    UPDATE vr_rollcalls
       SET question = 'On Passage', action_type = 'passage', updated_at = now()
     WHERE id = rc_h23
       AND question = 'On Motion to Concur in the Senate Amendments';
    IF prev IS DISTINCT FROM m_s5 THEN
      RAISE NOTICE 'roll 119/1/23 (house): measure_id % -> % (S. 5), question -> On Passage',
        prev, m_s5;
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- D. Carry the curated issue mappings that are still true of S. 5
  -- ═══════════════════════════════════════════════════════════════════════════
  -- See the ISSUE MAPPINGS section of the header for the per-mapping reasoning.
  -- ON CONFLICT on (measure_id, issue_key) — the columns behind the unique INDEX
  -- vr_measure_issues_unique, addressed by inference rather than by name because
  -- Drizzle declares it as an index and not as a named constraint — so a re-run, or a
  -- prior `POST /seed-issues` that already applied db/vr-issue-seed.json's new S. 5
  -- entry, leaves the existing rows exactly as they are.
  IF m_s5 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_s5, 'deportations', 100, true, 'yea_supports',
       'Mandates detention and removal proceedings for covered unauthorized immigrants.',
       'https://www.congress.gov/bill/119th-congress/senate-bill/5'),
      (m_s5, 'border_security', 70, false, 'yea_supports',
       'Tightens immigration enforcement.',
       'https://www.congress.gov/bill/119th-congress/senate-bill/5'),
      (m_s5, 'tough_on_crime', 55, false, 'yea_supports',
       'Triggered by arrest for burglary, theft, larceny, shoplifting, assault of a '
       || 'law enforcement officer, or any crime resulting in death or serious bodily injury.',
       'https://www.congress.gov/bill/119th-congress/senate-bill/5'),
      (m_s5, 'states_federal_power', 40, false, 'yea_supports',
       'Gives state attorneys general standing to sue the federal government over certain '
       || 'immigration-detention and enforcement decisions; a yea expands state authority '
       || 'to contest federal enforcement choices in court.',
       'https://www.congress.gov/bill/119th-congress/senate-bill/5')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- E. Move the three misfiled timeline rows onto S. 5, and complete its timeline
  -- ═══════════════════════════════════════════════════════════════════════════
  -- vr_measure_actions is read by getMeasure() in netlify/functions/voting-record.mts
  -- and rendered by bill-detail.js, so "Signed into law as Public Law 119-1." under
  -- H.R. 29 is a false statement a reader can see. The three rows describe real
  -- events; they are simply filed under the wrong bill, so they move rather than
  -- disappear — and their text and sources are corrected to the chamber records
  -- above at the same time. Nothing is deleted.
  --
  -- sort_order is set to the chronology, not to ACTION_STAGE_ORDER. That table puts
  -- passed_house (30) before passed_senate (40), which is right for a House bill and
  -- backwards for S. 5: the Senate passed it on 2025-01-20 and the House on
  -- 2025-01-22. getMeasure() orders the timeline by sort_order alone, so the numbers
  -- here are what a reader sees.
  IF m_s5 IS NOT NULL AND m_hr29 IS NOT NULL THEN
    UPDATE vr_measure_actions
       SET measure_id = m_s5,
           text = 'Senate passed the bill as amended, 64-35 (roll call 7).',
           source_url = 'https://www.senate.gov/legislative/LIS/roll_call_votes/vote1191/vote_119_1_00007.htm',
           source_label = 'U.S. Senate',
           sort_order = 20
     WHERE measure_id = m_hr29 AND stage = 'passed_senate'
       AND action_date = TIMESTAMPTZ '2025-01-20T00:00:00Z';

    UPDATE vr_measure_actions
       SET measure_id = m_s5,
           stage = 'passed_house',
           text = 'House passed the bill, 263-156 (roll call 23).',
           source_url = 'https://clerk.house.gov/Votes/202523',
           source_label = 'U.S. House Clerk',
           sort_order = 30
     WHERE measure_id = m_hr29 AND stage = 'resolving_differences'
       AND action_date = TIMESTAMPTZ '2025-01-22T00:00:00Z';

    UPDATE vr_measure_actions
       SET measure_id = m_s5,
           source_url = 'https://www.congress.gov/bill/119th-congress/senate-bill/5',
           sort_order = 70
     WHERE measure_id = m_hr29 AND stage = 'enacted'
       AND action_date = TIMESTAMPTZ '2025-01-29T00:00:00Z';
  END IF;

  -- S. 5's own opening milestones. Guarded per (stage, date) the same way
  -- upsertMeasureActions() in netlify/lib/vr-ingest.ts guards its inserts.
  IF m_s5 IS NOT NULL THEN
    INSERT INTO vr_measure_actions (measure_id, stage, chamber, action_date, text, source_url, source_label, sort_order)
    SELECT m_s5, 'introduced', 'senate', TIMESTAMPTZ '2025-01-06T00:00:00Z',
           'Introduced in the Senate. Read the first time. Placed on Senate Legislative Calendar under Read the First Time.',
           'https://www.congress.gov/bill/119th-congress/senate-bill/5', 'Congress.gov', 10
     WHERE NOT EXISTS (SELECT 1 FROM vr_measure_actions
                        WHERE measure_id = m_s5 AND stage = 'introduced'
                          AND action_date = TIMESTAMPTZ '2025-01-06T00:00:00Z');

    INSERT INTO vr_measure_actions (measure_id, stage, chamber, action_date, text, source_url, source_label, sort_order)
    SELECT m_s5, 'to_president', NULL, TIMESTAMPTZ '2025-01-23T00:00:00Z',
           'Presented to the President.',
           'https://www.congress.gov/bill/119th-congress/senate-bill/5', 'Congress.gov', 60
     WHERE NOT EXISTS (SELECT 1 FROM vr_measure_actions
                        WHERE measure_id = m_s5 AND stage = 'to_president'
                          AND action_date = TIMESTAMPTZ '2025-01-23T00:00:00Z');
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- F. Correct H.R. 29's own record to what actually happened to it
  -- ═══════════════════════════════════════════════════════════════════════════
  -- Guarded on the false values, so this fires once and never touches a row some
  -- later, better-sourced pass has already corrected.
  IF m_hr29 IS NOT NULL THEN
    UPDATE vr_measures
       SET status = 'passed_house',
           external_ids = (external_ids - 'publicLaw'),
           updated_at = now()
     WHERE id = m_hr29
       AND status = 'enacted'
       AND external_ids ->> 'publicLaw' = '119-1';

    -- Its real terminal action. 'other' is the canonical bucket in
    -- ACTION_STAGE_ORDER for a milestone that is not one of the passage stages;
    -- being placed on the Senate calendar is not committee referral and not passage.
    INSERT INTO vr_measure_actions (measure_id, stage, chamber, action_date, text, source_url, source_label, sort_order)
    SELECT m_hr29, 'other', 'senate', TIMESTAMPTZ '2025-02-10T00:00:00Z',
           'Received in the Senate and read twice; placed on the Senate Legislative Calendar '
           || 'under General Orders, Calendar No. 10. The Senate took no further action on '
           || 'H.R. 29; the Laken Riley Act became law as S. 5.',
           'https://www.congress.gov/bill/119th-congress/house-bill/29/all-actions', 'Congress.gov', 90
     WHERE NOT EXISTS (SELECT 1 FROM vr_measure_actions
                        WHERE measure_id = m_hr29 AND stage = 'other'
                          AND action_date = TIMESTAMPTZ '2025-02-10T00:00:00Z');
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- G. Correct the 'Senate Amendments to H.R. 29' row
  -- ═══════════════════════════════════════════════════════════════════════════
  -- Once roll 23 has moved to S. 5 this row holds no roll call and no member vote,
  -- but it is still listed by GET /measures (which lists every measure with a
  -- source_url) and is still searchable by name, so leaving it would leave a
  -- browsable entry asserting that the Senate amended H.R. 29 and the House concurred.
  -- It is not deleted. It is corrected to the object it was standing in for: the
  -- Senate's amendment to S. 5, which the Senate did adopt and which is in the
  -- enacted text. Its summary states plainly that it carries no roll call of its own,
  -- so nobody reads its emptiness as missing data.
  --
  -- Its two issue mappings are left in place and are inert (no roll call, no member
  -- vote hangs off this row), except that the one describing an act of concurrence
  -- is restated, because a false sentence is worth correcting even where it does not
  -- currently render.
  SELECT id INTO m_samdt
    FROM vr_measures
   WHERE congress = 119 AND number = 'Senate Amendments to H.R. 29'
   LIMIT 1;

  IF m_samdt IS NOT NULL AND m_s5 IS NOT NULL THEN
    UPDATE vr_measures
       SET number = 'Senate Amendment to S. 5',
           title = 'Senate amendment to S. 5, the Laken Riley Act',
           short_title = 'Senate amendment to the Laken Riley Act',
           parent_id = m_s5,
           summary = 'The amendment the Senate adopted before passing S. 5 on 2025-01-20 '
             || '(roll call 119/1/7, 64-35), which broadened the offences requiring '
             || 'mandatory detention. It is part of the text enacted as Public Law 119-1. '
             || 'This row carries no roll call of its own: the Senate''s recorded votes on '
             || 'the component amendments are rolls 119/1/3 (Cornyn, agreed 70-25), '
             || '119/1/4 (Coons, rejected 46-49) and 119/1/6 (Ernst, agreed 75-24), and '
             || 'the House vote formerly filed here is roll 119/1/23, On Passage of S. 5. '
             || 'It previously carried the number "Senate Amendments to H.R. 29" and held '
             || 'roll 119/1/23; the Senate never amended H.R. 29 and the House never voted '
             || 'to concur in any such amendment.',
           source_url = 'https://www.congress.gov/bill/119th-congress/senate-bill/5/all-actions',
           -- The row carried congressGovId 'hr29-119', which was the other bill's
           -- identifier and is the same mistaken identity this migration exists to
           -- undo. The key is dropped rather than repointed: 's5-119' belongs to the
           -- bill, not to this amendment, and no amendment-level identifier could be
           -- sourced from here (congress.gov refuses this environment, and the Senate
           -- and GPO records reached below do not carry one). An absent key is
           -- checkable; a plausible wrong one is not.
           external_ids = (COALESCE(external_ids, '{}'::jsonb) - 'congressGovId'),
           updated_at = now()
     WHERE id = m_samdt
       AND number = 'Senate Amendments to H.R. 29';

    UPDATE vr_measure_issues
       SET rationale = 'The adopted Senate amendment broadened the detention/removal triggers.'
     WHERE measure_id = m_samdt
       AND issue_key = 'deportations'
       AND rationale = 'Concurring adopts the broadened detention/removal triggers.';
  END IF;

END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Verification — reports state, never raises. A branch database missing these rows
-- must still migrate cleanly, so every check is a NOTICE.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  ident   text;
  votes   integer;
  n       integer;
  st      text;
  pl      text;
BEGIN
  FOR ident, votes IN
    SELECT coalesce(m.number, '(numberless)') || '  [' || r.chamber || ' roll ' || r.roll_number || ' — '
             || coalesce(r.question, '(no question)') || ' / ' || r.action_type || ']',
           (SELECT count(*) FROM vr_member_votes v WHERE v.rollcall_id = r.id)
      FROM vr_rollcalls r
      JOIN vr_measures m ON m.id = r.measure_id
     WHERE r.congress = 119 AND r.session = 1
       AND ((r.chamber = 'senate' AND r.roll_number = 7)
         OR (r.chamber = 'house'  AND r.roll_number IN (6, 23)))
     ORDER BY r.chamber, r.roll_number
  LOOP
    RAISE NOTICE 'rollcall now displays under: %  (% member votes)', ident, votes;
  END LOOP;
  -- Targets: senate 7 -> S. 5 (83), house 6 -> H.R. 29 (22, unchanged), house 23 -> S. 5 (4).

  SELECT count(*) INTO n FROM vr_measures WHERE congress = 119 AND chamber = 'senate' AND number = 'S. 5';
  RAISE NOTICE 'S. 5 measure rows: % (target 1)', n;

  SELECT count(*) INTO n
    FROM vr_measure_issues mi JOIN vr_measures m ON m.id = mi.measure_id
   WHERE m.congress = 119 AND m.chamber = 'senate' AND m.number = 'S. 5';
  RAISE NOTICE 'S. 5 issue mappings: % (target 4 — deportations, border_security, tough_on_crime, states_federal_power)', n;

  SELECT count(*) INTO n
    FROM vr_measure_actions a JOIN vr_measures m ON m.id = a.measure_id
   WHERE m.congress = 119 AND m.chamber = 'senate' AND m.number = 'S. 5';
  RAISE NOTICE 'S. 5 timeline rows: % (target 5 — introduced, passed_senate, passed_house, to_president, enacted)', n;

  SELECT status, external_ids ->> 'publicLaw' INTO st, pl
    FROM vr_measures WHERE congress = 119 AND chamber = 'house' AND number = 'H.R. 29';
  RAISE NOTICE 'H.R. 29: status % (target passed_house), publicLaw %  (target NULL)',
    coalesce(st, '(absent)'), coalesce(pl, 'NULL');

  SELECT count(*) INTO n
    FROM vr_rollcalls r JOIN vr_measures m ON m.id = r.measure_id
   WHERE m.congress = 119 AND m.chamber = 'house' AND m.number = 'H.R. 29';
  RAISE NOTICE 'H.R. 29 roll calls: % (target 1 — House roll 6, its genuine passage vote)', n;

  SELECT count(*) INTO n
    FROM vr_measure_actions a JOIN vr_measures m ON m.id = a.measure_id
   WHERE m.congress = 119 AND m.chamber = 'house' AND m.number = 'H.R. 29'
     AND a.text ILIKE '%Public Law 119-1%' AND a.stage = 'enacted';
  RAISE NOTICE 'H.R. 29 timeline rows still claiming enactment: % (target 0)', n;

  SELECT count(*) INTO n FROM vr_measures WHERE number = 'Senate Amendments to H.R. 29';
  RAISE NOTICE 'rows still numbered "Senate Amendments to H.R. 29": % (target 0)', n;
END $$;
