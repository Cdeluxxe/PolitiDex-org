-- ─────────────────────────────────────────────────────────────────────────────
-- ✒️ Executive Enactment Record — wave 7: the wave that makes the term filter
--    mean something
-- ─────────────────────────────────────────────────────────────────────────────
-- Rolls forward from 20260807000000_seed_exec_actions_wave1.sql,
-- 20260808000000_seed_exec_actions_wave2.sql,
-- 20260824000000_seed_exec_actions_wave3.sql,
-- 20260826000000_seed_exec_actions_wave4.sql,
-- 20260828000000_seed_exec_actions_wave5.sql and
-- 20260829000000_seed_exec_actions_wave6.sql. Changes NO schema and edits no
-- applied migration: it inserts into vr_measures, vr_measure_issues, vr_positions
-- and vr_exec_action_status only, every insert is guarded, and re-applying is a
-- no-op.
--
-- Curated source of truth: db/exec-action-seed.json. scripts/test-exec-seed.mjs
-- reads waves 1 through 7 together and asserts that every citation, date and issue
-- key in that file appears in one of them.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHY THIS WAVE EXISTS
-- ─────────────────────────────────────────────────────────────────────────────
-- Every one of the 40 actions the lane carried before this migration was signed or
-- issued in 2025 or 2026, and every one was tagged term 47. exec-record.js takes a
-- term argument and filters on it; with the data the file actually held,
-- actionsFor('trump', 'all_time') and actionsFor('trump', '47') returned the same
-- 40 rows. The filter was not broken. It had nothing to filter.
--
-- That is worse than a dead control, because of what else is on the profile. The
-- roster records eleven tracked promises and marks four of them broken — eliminate
-- the national debt, Mexico will pay for the wall, repeal and replace the coverage
-- law, bring prices down on day one. The evidence behind those four is first-term
-- outcome evidence. The formal-action record it was being read next to was
-- entirely second-term. The lane was inviting the reader to compare a first term's
-- results with a second term's effort and call the difference a finding.
--
-- So this wave puts eight real Term 45 documents on file. It does not try to
-- represent the first term — 229 executive orders were signed in it and 8 rows are
-- not a sample of that. It files the instruments that are decisive, that have an
-- unambiguous disposition, and that land on issues the lane already carries.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT IS IN IT
-- ─────────────────────────────────────────────────────────────────────────────
-- Three vetoes, four revoked orders, one signed law.
--
--   H.J. Res. 46   vetoed 2019-03-15, sustained 2019-03-26   border_security
--   S.J. Res. 7    vetoed 2019-04-16, sustained 2019-05-02   restraint, america_first_fp
--   S.J. Res. 68   vetoed 2020-05-06, sustained 2020-05-07   restraint, america_first_fp
--   EO 13765       revoked by EO 14009, 2021-01-28           healthcare
--   EO 13767       revoked by EO 14010, 2021-02-02           border_security
--   EO 13783       revoked by EO 13990, 2021-01-20           energy_production, climate_action
--   EO 13950       revoked by EO 13985, 2021-01-20           end_dei
--   PL 116-136     approved 2020-03-27                        cut_spending
--
-- ─────────────────────────────────────────────────────────────────────────────
-- THE FIRST VETOES IN THE LANE, AND THE DIRECTION CONVENTION THAT GOVERNS THEM
-- ─────────────────────────────────────────────────────────────────────────────
-- db/exec-action-types.json has carried a vetoed_law action class since the
-- vocabulary was written and no row had ever used it. Six waves of data went past
-- an unexercised pipeline. These are the first three rows to exercise it.
--
-- READ THIS BEFORE EDITING ANY VETO ROW. The support_meaning on a veto's
-- vr_measure_issues row describes what the VETOED MEASURE would have done to the
-- issue. It does not describe the veto. This is not a style choice:
-- consistency.js#_EXEC_BLOCKS marks vetoed_law as a blocking class and sets
-- advanceInverted on the item, and stance-helpers.js flips the direction on that
-- flag. The column being written is the same vr_measure_issues.support_meaning the
-- roll-call lane reads, and in that lane it has always described the measure.
-- Writing 'yea_supports' here to mean "the veto advanced the issue" would invert
-- every veto in the file, silently, in the direction that flatters.
--
-- Worked example, the one most likely to be "corrected" by a later editor:
-- S.J. Res. 7 would have directed the removal of United States Armed Forces from
-- unauthorized hostilities in Yemen. That ADVANCES restraint, so the row reads
-- yea_supports. The veto blocked it, so the engine inverts and the ACTION reads
-- against restraint. Both statements are in the data and they are not in conflict.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- THE OVERRIDE GAP — a structural finding this wave could not fix
-- ─────────────────────────────────────────────────────────────────────────────
-- Eight joint resolutions were vetoed in the 116th Congress. Seven vetoes were
-- sustained. One was overridden: H.R. 6395, the National Defense Authorization Act
-- for Fiscal Year 2021, vetoed 2020-12-23 and enacted over the veto on 2021-01-01.
-- That is the most consequential veto of the term and it is NOT in this file,
-- because Axis B has no token for it.
--
-- The Axis B vocabulary in db/exec-summary-keys.json offers in_force,
-- partly_blocked, blocked, struck_down, rescinded, challenged_unverified,
-- superseded and expired. Every one of them is wrong here:
--   blocked / struck_down  name a court as the actor. The actor was Congress.
--   superseded             is marked contested:false. Filing the single most
--                          contested outcome available to an executive action as an
--                          uncontested one is the worst of the available errors.
--   in_force               is false. The measure became law.
-- The honest token is 'overridden', contested:true, ranked with the court tokens in
-- the issue-level standing order. Adding it is not a data change: exec-record.js
-- hardcodes the standing order and the STANDING table, and exec-record-ui.js
-- hardcodes the chip and its CSS. That is read-path and UI work, which this pass
-- was scoped out of. Recorded here so the next pass does not rediscover it from
-- scratch — the same way wave 6 recorded the shared-issue-row constraint.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- THE SHARED-ROW HAZARD, CHECKED BEFORE ANY MAPPING WAS WRITTEN
-- ─────────────────────────────────────────────────────────────────────────────
-- Wave 6 documented the constraint: vr_measure_issues is keyed on
-- (measure_id, issue_key), both lanes read the same vr_measures row, so an issue
-- mapping written for the executive lane also lands on every member who has a
-- recorded position on that measure. It is why Public Law 119-98 is still not in
-- the file.
--
-- This wave writes four 116th Congress measure rows — three joint resolutions and
-- H.R. 748. Before any of them was written, vr_measures was checked for existing
-- 116th Congress rows and the seed corpus was checked for 116th Congress data.
-- There are none: the congressional lane in this repo covers the 117th, 118th and
-- 119th Congresses only. No member position exists on any of these four measures,
-- so no mapping here can re-score anyone through a shared row. If a later pass
-- backfills 116th Congress roll calls, THIS is the paragraph it needs to revisit
-- first, and the mapping to look at is Public Law 116-136 / cut_spending: a
-- roll-call pass would have to decide, on its own terms, whether it is willing to
-- read every recorded position on the CARES Act as a position on federal spending.
-- Wave 6's answer for a comparable law was no.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- THE FOUR REVOKED ORDERS, AND WHAT THEY DO AND DO NOT CHANGE
-- ─────────────────────────────────────────────────────────────────────────────
-- Three of the four sit on issues that were already fully aligned and they leave
-- that alignment exactly where it was. That is stated plainly rather than dressed
-- up: this is not a balance wave, wave 6 was. What these four change is the other
-- axis. Before this migration the lane had never filed a single 'rescinded'
-- standing — 50 standings, 48 of them uncontested, not one revocation. Now
-- border_security, end_dei, energy_production, climate_action and healthcare each
-- hold a document the Federal Register's own disposition record says no longer
-- stands, and each of those documents is from the earlier term. An issue whose
-- every document stands reads differently from an issue holding one that the next
-- administration struck out, and that difference cannot be produced by any amount
-- of second-term density.
--
-- Each 'rescinded' row quotes the register's disposition note verbatim rather than
-- paraphrasing it, and names the revoking order by number and date in its
-- authority field.
--
-- A GUARD HAD TO BE SPLIT FOR THIS. scripts/test-exec-seed.mjs required every
-- contested standing except challenged_unverified to rest on court_ruling and to
-- name a court in its authority. 'rescinded' is contested and is never a court's
-- doing — it is one President revoking another's order — so under that rule a real
-- revocation could only have been filed by naming a court that never ruled, which
-- is to say it could not be filed at all. The rule is now three-way: a court ACTED
-- needs the court's own ruling; a court has NOT acted needs the live filing; an
-- order was REVOKED needs the register's disposition entry, must name the revoking
-- instrument, must NOT name a court, and must quote the 'Revoked by:' line. That is
-- a tightening, not a loosening — the old rule had nothing to say about what a
-- revocation must cite.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT WAS REVIEWED AND LEFT OUT
-- ─────────────────────────────────────────────────────────────────────────────
--  · H.R. 6395 — the overridden veto. See THE OVERRIDE GAP above.
--  · S.J. Res. 54, the second border-emergency termination of 2019 (vetoed
--    2019-10-15, sustained 2019-10-17). Same fight as H.J. Res. 46, same issue,
--    same direction. A second same-direction row on an already-aligned issue is
--    weight for its own sake.
--  · S.J. Res. 36, 37 and 38 — three arms-sale disapproval resolutions vetoed on
--    one day, 2019-07-24, all sustained 2019-07-29. The issue they turn on is
--    congressional control of arms exports, which is checks_balances, and this
--    figure has no stated position on that key. Three near-identical rows for one
--    decision would also inflate the count without adding a fact.
--  · H.J. Res. 76, the borrower-defense disapproval (vetoed 2020-05-29, sustained
--    2020-06-26). Its only honest issue is edu_college_cost, which carries no
--    stated position, so the row would test nothing.
--  · EO 13957, Creating Schedule F in the Excepted Service — and this is the
--    rejection that cost the most. Its register disposition is the single best
--    term-contrast fact in the corpus: 'Revoked by: EO 14003, January 22, 2021' and
--    'Reinstated by: EO 14171, January 20, 2025'. A first-term order struck out by
--    the successor and restored on the first day of the current term is exactly
--    what a term filter is for. It is not here because db/issue-keys.json has no
--    key for civil-service or executive-branch personnel control. cut_spending is a
--    claim about money and this order changes an employment classification; mapping
--    it there would put a spending direction on a document whose text has none.
--    gov_waste carries no stated position for this figure. Fail closed. The fix is
--    an issue key, not a mapping, and it is the highest-value small change the next
--    pass could make.
--  · The rescission of DACA — signed by the Acting Secretary of Homeland Security,
--    not by the President. Wrong authorship for this lane.
--  · Proclamation 9645, the entry restrictions. immigration_reform's stated
--    position is about earned status for long-settled immigrants; entry
--    restrictions are a different question.
--  · A court standing for EO 13950. The order was preliminarily enjoined in the
--    Northern District of California in December 2020. This pass did not download
--    and read that opinion from a court host, and only a ruling read in full may
--    support a court token, so no court row is filed. The gap is stated in the
--    seed's own note rather than filled with a weaker claim.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- SOURCES READ IN THIS PASS
-- ─────────────────────────────────────────────────────────────────────────────
-- Vetoes: GPO's BILLSTATUS bulkdata for the 116th Congress (BILLSTATUS-116-hjres
-- and BILLSTATUS-116-sjres), downloaded and parsed. All eight vetoed joint
-- resolutions of that Congress were enumerated before three were chosen; the
-- official title, the date the resolution was returned with objections, the chamber
-- that attempted the override and the recorded result were read from each
-- resolution's legislative action history. congress.gov itself returns HTTP 403 to
-- this environment, as it has to every prior pass, and is cited because
-- db/exec-action-types.json names it as the source of record for this class.
--
-- Orders: the Federal Register API document record for each, one at a time, plus
-- the full text of each from the register's own raw-text URL. Title, signing date,
-- publication date, FR citation, FR document number and disposition notes were read
-- per document and are quoted below.
--
-- Law: GPO's PLAW-116publ136 package, downloaded and read. Section 5001 and section
-- 4003 were read in full; the appropriation quoted in the cut_spending rationale is
-- section 601(a)(1) of the Social Security Act as added by section 5001.
--
-- whitehouse.gov appears nowhere in this migration.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- ADDITIVE AND IDEMPOTENT
-- ─────────────────────────────────────────────────────────────────────────────
-- Measure rows are looked up before insert. Issue rows use vr_measure_issues_unique,
-- position rows use vr_positions_unique on (measure_id, politician_id, action_type),
-- and status rows are guarded per (position_id, status, effective_at). Nothing is
-- updated and nothing is deleted: there is no UPDATE, DELETE, DROP, ALTER or
-- TRUNCATE statement in this file.
--
-- Two vocabulary values are used here for the first time and both are additive to
-- free-text columns: vr_positions.action_type = 'vetoed', already declared in
-- db/exec-action-types.json#positionActionTypes and never yet written, and
-- vr_measures.status = 'vetoed', which is the accurate word for a joint resolution
-- that passed both chambers and did not become law. Neither column is constrained
-- and no consumer switches exhaustively on either.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  m_hjres46 integer;
  m_sjres7  integer;
  m_sjres68 integer;
  m_13765   integer;
  m_13767   integer;
  m_13783   integer;
  m_13950   integer;
  m_748     integer;
  pos       integer;
  u         text;
  us        text;
BEGIN

  -- ═══════════════════════════════════════════════════════════════════════════
  -- A. H.J. Res. 46 (116th Congress) — VETOED 2019-03-15, veto sustained
  --
  --    The first veto row in the lane. The resolution would have terminated the
  --    national emergency related to the U.S.-Mexico border declared on
  --    2019-02-15; the veto kept it in place.
  --
  --    support_meaning below is yea_opposes because the RESOLUTION cuts against
  --    border_security. The engine inverts it. See the direction convention in the
  --    header before changing this.
  -- ═══════════════════════════════════════════════════════════════════════════
  u  := 'https://www.congress.gov/bill/116th-congress/house-joint-resolution/46';
  us := 'https://www.congress.gov/bill/116th-congress/house-joint-resolution/46/all-actions';

  SELECT id INTO m_hjres46
    FROM vr_measures
   WHERE measure_type = 'resolution' AND chamber = 'house' AND congress = 116
     AND number = 'H.J. Res. 46'
   LIMIT 1;

  IF m_hjres46 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('resolution', 116, 'house', 'H.J. Res. 46',
       'Relating to a national emergency declared by the President on February 15, 2019',
       'Termination of the February 2019 border emergency',
       'Introduced 2019-02-22, passed the House 2019-02-26 and the Senate 2019-03-14. '
       || 'The published summary reads: this joint resolution terminates the national '
       || 'emergency related to the U.S.-Mexico border, declared by the President on '
       || 'February 15, 2019. Returned with the President''s objections 2019-03-15; the '
       || 'House failed of passage over the veto 2019-03-26, 248 to 181, short of the '
       || 'two-thirds Article I, section 7 requires. It did not become law.',
       NULL, TIMESTAMPTZ '2019-02-22T00:00:00Z', NULL, 'vetoed',
       u, 'Congress.gov',
       '{"billType":"hjres","billNumber":"46","congress":"116"}'::jsonb)
    RETURNING id INTO m_hjres46;
    RAISE NOTICE 'created vr_measures H.J. Res. 46 as id %', m_hjres46;
  END IF;

  IF m_hjres46 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_hjres46, 'border_security', 90, true, 'yea_opposes',
       'THE DIRECTION DESCRIBES THE RESOLUTION, NOT THE ACTION TAKEN AGAINST IT. '
       || 'H.J. Res. 46 would have terminated the national emergency related to the '
       || 'U.S.-Mexico border declared on February 15, 2019, which cuts against this '
       || 'issue. The record engine inverts a blocking action, so the veto itself '
       || 'reads the other way: it kept that emergency in place.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_hjres46, 'trump', 'vetoed', false, TIMESTAMPTZ '2019-03-15T00:00:00Z', u,
       'Returned H.J. Res. 46 to the House with objections on 2019-03-15. Shared '
       || 'authorship in the sense that Congress wrote and passed the resolution; the '
       || 'decision to block it was the President''s alone.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_hjres46 AND politician_id = 'trump' AND action_type = 'vetoed'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2019-03-26T00:00:00Z',
             'The House of Representatives, on the question of passage notwithstanding the objections of the President',
             'Congress.gov — H.J. Res. 46, 116th Congress, legislative action history',
             us,
             'The resolution was returned to the House with the President''s objections '
             || 'on March 15, 2019. On March 26, 2019 the House took up passage '
             || 'notwithstanding those objections and did not reach the two-thirds '
             || 'Article I, section 7 requires; the tally was 248 to 181. The resolution '
             || 'therefore never became law and the emergency it would have terminated '
             || 'stayed in place. This states what Congress did with the returned '
             || 'resolution and says nothing about any challenge to the veto or to '
             || 'anything the veto preserved.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2019-03-26T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- B. S.J. Res. 7 (116th Congress) — VETOED 2019-04-16, veto sustained
  --
  --    Yemen war powers. Two mappings: restraint, which is the issue this
  --    resolution IS, and america_first_fp, which is the issue that can be
  --    checked — the stated position on restraint is not directional, so that row
  --    lands in "action on file, no stated position" and takes the issue off "no
  --    record at all" without scoring it.
  -- ═══════════════════════════════════════════════════════════════════════════
  u  := 'https://www.congress.gov/bill/116th-congress/senate-joint-resolution/7';
  us := 'https://www.congress.gov/bill/116th-congress/senate-joint-resolution/7/all-actions';

  SELECT id INTO m_sjres7
    FROM vr_measures
   WHERE measure_type = 'resolution' AND chamber = 'senate' AND congress = 116
     AND number = 'S.J. Res. 7'
   LIMIT 1;

  IF m_sjres7 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('resolution', 116, 'senate', 'S.J. Res. 7',
       'A joint resolution to direct the removal of United States Armed Forces from hostilities in the Republic of Yemen that have not been authorized by Congress',
       'Yemen war powers resolution',
       'Passed both chambers and was returned with the President''s objections '
       || '2019-04-16. On 2019-05-02 the Senate failed of passage over the veto, 53 to '
       || '45, short of the two-thirds Article I, section 7 requires. It did not become '
       || 'law.',
       NULL, TIMESTAMPTZ '2019-01-30T00:00:00Z', NULL, 'vetoed',
       u, 'Congress.gov',
       '{"billType":"sjres","billNumber":"7","congress":"116"}'::jsonb)
    RETURNING id INTO m_sjres7;
    RAISE NOTICE 'created vr_measures S.J. Res. 7 as id %', m_sjres7;
  END IF;

  IF m_sjres7 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_sjres7, 'restraint', 90, true, 'yea_supports',
       'THE DIRECTION DESCRIBES THE RESOLUTION, NOT THE ACTION TAKEN AGAINST IT. '
       || 'S.J. Res. 7 would have directed the removal of United States Armed Forces '
       || 'from hostilities in the Republic of Yemen that Congress had not authorized, '
       || 'which advances this issue. The record engine inverts a blocking action, so '
       || 'the veto reads the other way.', u),
      (m_sjres7, 'america_first_fp', 75, false, 'yea_supports',
       'Same inversion applies: the direction is the resolution''s. Withdrawing forces '
       || 'from an unauthorized foreign conflict is the ending of an open-ended '
       || 'commitment abroad, which is what the stated position on this issue is '
       || 'about, so the resolution advances it and the veto is read against it.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_sjres7, 'trump', 'vetoed', false, TIMESTAMPTZ '2019-04-16T00:00:00Z', u,
       'Returned S.J. Res. 7 to the Senate with objections on 2019-04-16.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_sjres7 AND politician_id = 'trump' AND action_type = 'vetoed'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2019-05-02T00:00:00Z',
             'The Senate, on the question of passage notwithstanding the objections of the President',
             'Congress.gov — S.J. Res. 7, 116th Congress, legislative action history',
             us,
             'The resolution was returned to the Senate with the President''s objections '
             || 'on April 16, 2019. On May 2, 2019 the Senate failed of passage over the '
             || 'veto, 53 to 45, short of the two-thirds Article I, section 7 requires. '
             || 'The resolution never became law. This states what Congress did with the '
             || 'returned resolution and says nothing about any challenge to the veto.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2019-05-02T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- C. S.J. Res. 68 (116th Congress) — VETOED 2020-05-06, veto sustained
  --
  --    Iran war powers. Filed alongside S.J. Res. 7 rather than folded into it:
  --    thirteen months apart, different countries, separate returned-resolution
  --    histories. The three arms-sale resolutions of one day in July 2019 were
  --    treated the opposite way and left out.
  -- ═══════════════════════════════════════════════════════════════════════════
  u  := 'https://www.congress.gov/bill/116th-congress/senate-joint-resolution/68';
  us := 'https://www.congress.gov/bill/116th-congress/senate-joint-resolution/68/all-actions';

  SELECT id INTO m_sjres68
    FROM vr_measures
   WHERE measure_type = 'resolution' AND chamber = 'senate' AND congress = 116
     AND number = 'S.J. Res. 68'
   LIMIT 1;

  IF m_sjres68 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('resolution', 116, 'senate', 'S.J. Res. 68',
       'A joint resolution to direct the removal of United States Armed Forces from hostilities against the Islamic Republic of Iran that have not been authorized by Congress',
       'Iran war powers resolution',
       'Passed both chambers and was returned with the President''s objections '
       || '2020-05-06. On 2020-05-07 the Senate failed of passage over the veto, 49 to '
       || '44, short of the two-thirds Article I, section 7 requires. It did not become '
       || 'law.',
       NULL, TIMESTAMPTZ '2020-01-09T00:00:00Z', NULL, 'vetoed',
       u, 'Congress.gov',
       '{"billType":"sjres","billNumber":"68","congress":"116"}'::jsonb)
    RETURNING id INTO m_sjres68;
    RAISE NOTICE 'created vr_measures S.J. Res. 68 as id %', m_sjres68;
  END IF;

  IF m_sjres68 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_sjres68, 'restraint', 90, true, 'yea_supports',
       'THE DIRECTION DESCRIBES THE RESOLUTION, NOT THE ACTION TAKEN AGAINST IT. '
       || 'S.J. Res. 68 would have directed the removal of United States Armed Forces '
       || 'from hostilities against the Islamic Republic of Iran that Congress had not '
       || 'authorized, which advances this issue. The record engine inverts a blocking '
       || 'action, so the veto reads the other way.', u),
      (m_sjres68, 'america_first_fp', 75, false, 'yea_supports',
       'Same inversion applies: the direction is the resolution''s. This is the second '
       || 'document on this issue that would have closed off an unauthorized foreign '
       || 'engagement, thirteen months after the first, which is why it is filed rather '
       || 'than treated as the same decision restated.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_sjres68, 'trump', 'vetoed', false, TIMESTAMPTZ '2020-05-06T00:00:00Z', u,
       'Returned S.J. Res. 68 to the Senate with objections on 2020-05-06.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_sjres68 AND politician_id = 'trump' AND action_type = 'vetoed'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2020-05-07T00:00:00Z',
             'The Senate, on the question of passage notwithstanding the objections of the President',
             'Congress.gov — S.J. Res. 68, 116th Congress, legislative action history',
             us,
             'The resolution was returned to the Senate with the President''s objections '
             || 'on May 6, 2020. On May 7, 2020 the Senate failed of passage over the '
             || 'veto, 49 to 44, short of the two-thirds Article I, section 7 requires. '
             || 'The resolution never became law. This states what Congress did with the '
             || 'returned resolution and says nothing about any challenge to the veto.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2020-05-07T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- D. Executive Order 13765 — Minimizing the Economic Burden of the Patient
  --    Protection and Affordable Care Act Pending Repeal
  --
  --    The first-term document behind the promise the roster records as broken.
  --    It does not move the score — the stated position on healthcare is not
  --    directional — and it is not filed to. It is filed so the issue holds a
  --    first-term document, and that document is one the register says was revoked.
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.federalregister.gov/documents/2017/01/24/2017-01799/minimizing-the-economic-burden-of-the-patient-protection-and-affordable-care-act-pending-repeal';

  SELECT id INTO m_13765
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 13765'
   LIMIT 1;

  IF m_13765 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 13765',
       'Minimizing the Economic Burden of the Patient Protection and Affordable Care Act Pending Repeal',
       'Coverage-law burden minimization order',
       'Signed 2017-01-20 and published at 82 FR 8351 on 2017-01-24. Section 1 states '
       || 'the policy of seeking the prompt repeal of the Patient Protection and '
       || 'Affordable Care Act; section 2 directs the Secretary of Health and Human '
       || 'Services and every other agency with authority under the Act to waive, '
       || 'defer, grant exemptions from, or delay the implementation of any provision '
       || 'imposing a cost, fee, tax, penalty or regulatory burden. Revoked by '
       || 'Executive Order 14009 of January 28, 2021.',
       NULL, TIMESTAMPTZ '2017-01-20T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register',
       '{"executiveOrder":"13765","frCitation":"82 FR 8351","frDocumentNumber":"2017-01799"}'::jsonb)
    RETURNING id INTO m_13765;
    RAISE NOTICE 'created vr_measures Executive Order 13765 as id %', m_13765;
  END IF;

  IF m_13765 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_13765, 'healthcare', 90, true, 'yea_opposes',
       'Section 1 states the policy of seeking the prompt repeal of the Patient '
       || 'Protection and Affordable Care Act, and section 2 directs the Secretary of '
       || 'Health and Human Services and every other agency with authority under the '
       || 'Act to "waive, defer, grant exemptions from, or delay the implementation of" '
       || 'any provision imposing a cost, fee, tax, penalty or regulatory burden. '
       || 'Narrowing the reach of the coverage law is what this direction means on this '
       || 'issue.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_13765, 'trump', 'issued', true, TIMESTAMPTZ '2017-01-20T00:00:00Z', u,
       'Signed Executive Order 13765 on 2017-01-20, the day of the first inauguration. '
       || 'Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_13765 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2017-01-24T00:00:00Z',
             'Signed by the President and published in the Federal Register',
             'Federal Register — Executive Order 13765 document record',
             u,
             'Signed January 20, 2017 and published January 24, 2017 at 82 FR 8351. '
             || 'Unrevoked as of that date on the register''s own disposition record. '
             || 'This is a statement about the register''s record of presidential action '
             || 'and is not a statement about any challenge to the order.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2017-01-24T00:00:00Z');

      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'rescinded', TIMESTAMPTZ '2021-01-28T00:00:00Z',
             'Executive Order 14009 of January 28, 2021, signed by the succeeding President',
             'Federal Register — Executive Order 13765 document record, disposition notes',
             u,
             'The disposition note on the register''s own record for this document '
             || 'reads, in full: "Revoked by: EO 14009, January 28, 2021". The order no '
             || 'longer stands. Revocation by a later President is a presidential act, '
             || 'so this row is not a statement about any challenge to the order and no '
             || 'court is claimed to have reached it.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'rescinded'
                            AND effective_at = TIMESTAMPTZ '2021-01-28T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- E. Executive Order 13767 — Border Security and Immigration Enforcement
  --    Improvements
  --
  --    Same direction as everything else on border_security, and that is said
  --    plainly rather than dressed up. It is here for Axis B and for the term
  --    contrast: the first-term original of the second-term barrier order, and the
  --    register records it revoked.
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.federalregister.gov/documents/2017/01/30/2017-02095/border-security-and-immigration-enforcement-improvements';

  SELECT id INTO m_13767
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 13767'
   LIMIT 1;

  IF m_13767 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 13767',
       'Border Security and Immigration Enforcement Improvements',
       'Border wall and enforcement order',
       'Signed 2017-01-25 and published at 82 FR 8793 on 2017-01-30. Section 2(a) sets '
       || 'as the policy of the executive branch to secure the southern border through '
       || 'the immediate construction of a physical wall monitored and supported by '
       || 'adequate personnel; section 3(e) defines that wall as a contiguous, '
       || 'impassable physical barrier. Revoked by Executive Order 14010 of February 2, '
       || '2021.',
       NULL, TIMESTAMPTZ '2017-01-25T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register',
       '{"executiveOrder":"13767","frCitation":"82 FR 8793","frDocumentNumber":"2017-02095"}'::jsonb)
    RETURNING id INTO m_13767;
    RAISE NOTICE 'created vr_measures Executive Order 13767 as id %', m_13767;
  END IF;

  IF m_13767 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_13767, 'border_security', 95, true, 'yea_supports',
       'Section 2(a) sets as the policy of the executive branch to secure the southern '
       || 'border "through the immediate construction of a physical wall on the '
       || 'southern border, monitored and supported by adequate personnel", and '
       || 'section 3(e) defines that wall as a contiguous, impassable physical '
       || 'barrier.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_13767, 'trump', 'issued', true, TIMESTAMPTZ '2017-01-25T00:00:00Z', u,
       'Signed Executive Order 13767 on 2017-01-25. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_13767 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2017-01-30T00:00:00Z',
             'Signed by the President and published in the Federal Register',
             'Federal Register — Executive Order 13767 document record',
             u,
             'Signed January 25, 2017 and published January 30, 2017 at 82 FR 8793. '
             || 'Unrevoked as of that date on the register''s own disposition record. '
             || 'This is a statement about the register''s record of presidential action '
             || 'and is not a statement about any challenge to the order.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2017-01-30T00:00:00Z');

      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'rescinded', TIMESTAMPTZ '2021-02-02T00:00:00Z',
             'Executive Order 14010 of February 2, 2021, signed by the succeeding President',
             'Federal Register — Executive Order 13767 document record, disposition notes',
             u,
             'The disposition note on the register''s own record for this document '
             || 'reads, in full: "Revoked by: EO 14010, February 2, 2021". The order no '
             || 'longer stands. Revocation by a later President is a presidential act, '
             || 'so this row is not a statement about any challenge to the order and no '
             || 'court is claimed to have reached it.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'rescinded'
                            AND effective_at = TIMESTAMPTZ '2021-02-02T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- F. Executive Order 13783 — Promoting Energy Independence and Economic Growth
  --
  --    Energy and climate were the densest cluster in the file and the emptiest on
  --    term scope: nine documents between them before this wave, every one from
  --    the current term and every one standing. This is the first-term row.
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.federalregister.gov/documents/2017/03/31/2017-06576/promoting-energy-independence-and-economic-growth';

  SELECT id INTO m_13783
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 13783'
   LIMIT 1;

  IF m_13783 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 13783',
       'Promoting Energy Independence and Economic Growth',
       'Energy independence and Clean Power Plan review order',
       'Signed 2017-03-28 and published at 82 FR 16093 on 2017-03-31. Section 1(c) '
       || 'directs agencies to review regulations that potentially burden the '
       || 'development or use of domestically produced energy resources and to '
       || 'suspend, revise or rescind those that unduly burden it; section 4 directs '
       || 'the Administrator of the Environmental Protection Agency to review the '
       || 'Clean Power Plan and related rules and guidance on the same terms. Revokes '
       || 'Executive Order 13653 of November 1, 2013. Revoked by Executive Order 13990 '
       || 'of January 20, 2021.',
       NULL, TIMESTAMPTZ '2017-03-28T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register',
       '{"executiveOrder":"13783","frCitation":"82 FR 16093","frDocumentNumber":"2017-06576"}'::jsonb)
    RETURNING id INTO m_13783;
    RAISE NOTICE 'created vr_measures Executive Order 13783 as id %', m_13783;
  END IF;

  IF m_13783 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_13783, 'energy_production', 90, true, 'yea_supports',
       'Section 1(c) makes it the policy of the United States that agencies '
       || 'immediately review existing regulations that potentially burden the '
       || 'development or use of domestically produced energy resources and '
       || '"appropriately suspend, revise, or rescind those that unduly burden" that '
       || 'development.', u),
      (m_13783, 'climate_action', 85, false, 'yea_opposes',
       'Section 4 directs the Administrator of the Environmental Protection Agency to '
       || 'take all steps necessary to review the Clean Power Plan and its related '
       || 'rules and guidance for consistency with section 1, and as soon as '
       || 'practicable to suspend, revise or rescind them if appropriate.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_13783, 'trump', 'issued', true, TIMESTAMPTZ '2017-03-28T00:00:00Z', u,
       'Signed Executive Order 13783 on 2017-03-28. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_13783 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2017-03-31T00:00:00Z',
             'Signed by the President and published in the Federal Register',
             'Federal Register — Executive Order 13783 document record',
             u,
             'Signed March 28, 2017 and published March 31, 2017 at 82 FR 16093. '
             || 'Unrevoked as of that date on the register''s own disposition record. '
             || 'This is a statement about the register''s record of presidential action '
             || 'and is not a statement about any challenge to the order.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2017-03-31T00:00:00Z');

      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'rescinded', TIMESTAMPTZ '2021-01-20T00:00:00Z',
             'Executive Order 13990 of January 20, 2021, signed by the succeeding President',
             'Federal Register — Executive Order 13783 document record, disposition notes',
             u,
             'The disposition note on the register''s own record for this document '
             || 'ends: "Revoked by: EO 13990, January 20, 2021". The same note records '
             || 'that this order itself revoked Executive Order 13653 of November 1, '
             || '2013, which is the shape of the whole exchange and is why it is quoted '
             || 'rather than summarized. The order no longer stands. Revocation by a '
             || 'later President is a presidential act, so this row is not a statement '
             || 'about any challenge to the order and no court is claimed to have '
             || 'reached it.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'rescinded'
                            AND effective_at = TIMESTAMPTZ '2021-01-20T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- G. Executive Order 13950 — Combating Race and Sex Stereotyping
  --
  --    The third document on end_dei and the first from the first term. The
  --    contractor-clause mechanism the second-term order uses has an original, and
  --    the original was revoked.
  --
  --    NO COURT ROW IS FILED. The order was preliminarily enjoined in the Northern
  --    District of California in December 2020; this pass did not download and read
  --    that opinion from a court host, and a court token requires a ruling read in
  --    full. The gap is disclosed rather than filled.
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.federalregister.gov/documents/2020/09/28/2020-21534/combating-race-and-sex-stereotyping';

  SELECT id INTO m_13950
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 13950'
   LIMIT 1;

  IF m_13950 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 13950',
       'Combating Race and Sex Stereotyping',
       'Federal training and contractor stereotyping order',
       'Signed 2020-09-22 and published at 85 FR 60683 on 2020-09-28. Section 4 '
       || 'requires every Government contracting agency to include in each new '
       || 'contract a clause barring workplace training that inculcates race or sex '
       || 'stereotyping or scapegoating, and enumerates the concepts covered. Revoked '
       || 'by Executive Order 13985 of January 20, 2021.',
       NULL, TIMESTAMPTZ '2020-09-22T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register',
       '{"executiveOrder":"13950","frCitation":"85 FR 60683","frDocumentNumber":"2020-21534"}'::jsonb)
    RETURNING id INTO m_13950;
    RAISE NOTICE 'created vr_measures Executive Order 13950 as id %', m_13950;
  END IF;

  IF m_13950 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_13950, 'end_dei', 90, true, 'yea_supports',
       'Section 4 requires every Government contracting agency to write into each new '
       || 'contract a clause providing that "the contractor shall not use any workplace '
       || 'training that inculcates in its employees any form of race or sex '
       || 'stereotyping or any form of race or sex scapegoating", and then enumerates '
       || 'the concepts that clause covers.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_13950, 'trump', 'issued', true, TIMESTAMPTZ '2020-09-22T00:00:00Z', u,
       'Signed Executive Order 13950 on 2020-09-22. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_13950 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2020-09-28T00:00:00Z',
             'Signed by the President and published in the Federal Register',
             'Federal Register — Executive Order 13950 document record',
             u,
             'Signed September 22, 2020 and published September 28, 2020 at 85 FR '
             || '60683. Unrevoked as of that date on the register''s own disposition '
             || 'record. This is a statement about the register''s record of '
             || 'presidential action and is not a statement about any challenge to the '
             || 'order.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2020-09-28T00:00:00Z');

      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'rescinded', TIMESTAMPTZ '2021-01-20T00:00:00Z',
             'Executive Order 13985 of January 20, 2021, signed by the succeeding President',
             'Federal Register — Executive Order 13950 document record, disposition notes',
             u,
             'The disposition note on the register''s own record for this document '
             || 'reads: "See: EO 11246, September 24, 1965; EO 14185, January 27, 2025" '
             || 'and "Revoked by: EO 13985, January 20, 2021". The order no longer '
             || 'stands. Revocation by a later President is a presidential act, so this '
             || 'row is not a statement about any challenge to the order and no court is '
             || 'claimed to have reached it.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'rescinded'
                            AND effective_at = TIMESTAMPTZ '2021-01-20T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- H. Public Law 116-136 — Coronavirus Aid, Relief, and Economic Security Act
  --
  --    The decisive counter-directional first-term law, and the one row in this
  --    wave that changes a reading on Axis A. cut_spending held the reconciliation
  --    law, the Rescissions Act, the DOGE order and one continuing appropriations
  --    Act; it did not hold the largest appropriation this President signed.
  --
  --    THE ANCHOR IS AN APPROPRIATION, NOT A TOPLINE. Section 4003(a)'s authority
  --    for loans, loan guarantees and other investments not exceeding
  --    $500,000,000,000 was read and rejected as the anchor: a lending authority is
  --    not an outlay. Section 5001 adds section 601 to the Social Security Act,
  --    whose subsection (a)(1) appropriates money in the enrolled text's own words.
  -- ═══════════════════════════════════════════════════════════════════════════
  u  := 'https://www.congress.gov/bill/116th-congress/house-bill/748';
  us := 'https://www.govinfo.gov/content/pkg/PLAW-116publ136/html/PLAW-116publ136.htm';

  SELECT id INTO m_748
    FROM vr_measures
   WHERE measure_type = 'bill' AND chamber = 'house' AND congress = 116
     AND number = 'H.R. 748'
   LIMIT 1;

  IF m_748 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('bill', 116, 'house', 'H.R. 748',
       'Coronavirus Aid, Relief, and Economic Security Act',
       'CARES Act',
       'Approved 2020-03-27 as Public Law 116-136, at 134 Stat. 281. Section 5001 '
       || 'adds a title VI to the Social Security Act whose section 601(a)(1) '
       || 'appropriates $150,000,000,000 for fiscal year 2020 for payments to States, '
       || 'Tribal governments and units of local government; section 4003(a) '
       || 'separately authorizes loans, loan guarantees and other investments not '
       || 'exceeding $500,000,000,000 in the aggregate.',
       NULL, TIMESTAMPTZ '2019-01-24T00:00:00Z', NULL, 'enacted',
       u, 'Congress.gov',
       '{"billType":"hr","billNumber":"748","congress":"116","publicLaw":"116-136"}'::jsonb)
    RETURNING id INTO m_748;
    RAISE NOTICE 'created vr_measures H.R. 748 as id %', m_748;
  END IF;

  IF m_748 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_748, 'cut_spending', 95, true, 'yea_opposes',
       'Section 5001 adds a new title VI to the Social Security Act whose section '
       || '601(a)(1) provides that "Out of any money in the Treasury of the United '
       || 'States not otherwise appropriated, there are appropriated for making '
       || 'payments to States, Tribal governments, and units of local government under '
       || 'this section, $150,000,000,000 for fiscal year 2020." A direct '
       || 'appropriation of new federal money, quoted from the enrolled text rather '
       || 'than characterized from a topline.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_748, 'trump', 'signed', true, TIMESTAMPTZ '2020-03-27T00:00:00Z', u,
       'Signed H.R. 748 into law on 2020-03-27 as Public Law 116-136. Shared '
       || 'authorship: Congress wrote and passed it, the signature endorsed it, and '
       || 'provisions are not individually endorsed.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_748 AND politician_id = 'trump' AND action_type = 'signed'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2020-03-27T00:00:00Z',
             'Passed by Congress and signed by the President',
             'GovInfo — Public Law 116-136, enrolled text as published by GPO',
             us,
             'Enacted and published as Public Law 116-136, approved March 27, 2020, at '
             || '134 Stat. 281. Nothing on file repeals it. Individual time-limited '
             || 'authorities inside the Act ran on their own terms; this row is about '
             || 'the Act, not about any one of them, and the appropriation the mapping '
             || 'quotes was made on enactment. This states that the law exists and '
             || 'stands as published; it is not a statement about any challenge to it.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2020-03-27T00:00:00Z');
    END IF;
  END IF;

END $$;
