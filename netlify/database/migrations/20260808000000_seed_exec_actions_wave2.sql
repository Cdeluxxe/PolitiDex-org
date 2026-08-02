-- ─────────────────────────────────────────────────────────────────────────────
-- ✒️ Executive Enactment Record — wave 2: EO 14156 and the EO 14151 backfill
-- ─────────────────────────────────────────────────────────────────────────────
-- Rolls forward from 20260807000000_seed_exec_actions_wave1.sql. Changes NO schema
-- and edits no applied migration: it inserts into vr_measures, vr_measure_issues,
-- vr_positions and vr_exec_action_status only, every insert is guarded, and
-- re-applying is a no-op.
--
-- Curated source of truth: db/exec-action-seed.json. scripts/test-exec-seed.mjs
-- reads wave 1 and wave 2 together and asserts that every citation, date and issue
-- key in that file appears in one of them, so the client data and the database rows
-- cannot drift apart without the suite failing.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT THIS PASS ADDS, AND WHY EACH PIECE IS SEPARATE FROM WAVE 1
-- ─────────────────────────────────────────────────────────────────────────────
-- A. Executive Order 14156 — Declaring a National Energy Emergency — as its OWN
--    measure, position and standing log. Wave 1's EO 14154 row carries a
--    _dedupeNote explaining that the app's curated spotlight data had folded these
--    two same-day energy orders into one card. This is the other half, unfolded.
--    The two are now demonstrably different documents: different FR citation,
--    different legal mechanism, and — the part a folded card could not have
--    represented — different standing. EO 14154 stands unchallenged in this file;
--    EO 14156 is in active litigation.
--
-- B. Three appended rows on EO 14151's existing standing log. Wave 1 recorded the
--    Fourth Circuit's February 6, 2026 vacatur as that order's only standing and
--    said, in its own comment, that the earlier history was real but unread. It has
--    now been read:
--      2025-02-21  D. Md. preliminary injunction (ECF 45)      → partly_blocked
--      2025-03-14  4th Cir. stay of that injunction (ECF 73)   → in_force
--      2026-06-30  D. Md. order dismissing the case (ECF 107)  → in_force
--    The February 6, 2026 row is NOT touched. There is no UPDATE in this file. An
--    append-only log exists so that history can be filled in behind the current
--    standing and so a later development can supersede an earlier note without
--    erasing it — both of which happen here.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- A NEW STANDING TOKEN, AND WHY IT NEEDS NO SCHEMA CHANGE
-- ─────────────────────────────────────────────────────────────────────────────
-- vr_exec_action_status.status is plain text with NO CHECK constraint, and
-- 20260806000000's comment says why: "so the vocabulary can be widened by a data
-- change rather than a schema migration". This is that data change. The token is
--
--   challenged_unverified
--     A challenge to the action is on file and live, and no primary ruling
--     resolving it has been read. NOT a claim that the action was blocked, and NOT
--     a claim that it survived.
--
-- It exists because the alternative was worse. Without it the only filing available
-- for a live unresolved challenge is 'in_force', and 'in_force' is a positive claim
-- — it says nothing has disturbed the action. A court that has not ruled has not
-- established that, so filing a challenged order as in force would assert something
-- no source supports. The token is `contested`, so the standing clause survives into
-- every rendering of the summary; a reader shown only in-force counts would be told
-- the record is settled when part of it is open.
--
-- USED ONCE, DELIBERATELY. EO 14151's March 2025 stay is the counter-example and is
-- filed as 'in_force': a primary ruling exists there and this pass read it, so the
-- honest report is what that ruling did. The token is for the absence of a ruling,
-- never for the absence of a reading.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- SOURCING — every fact below was fetched and read in this pass
-- ─────────────────────────────────────────────────────────────────────────────
-- Federal Register API document records:
--   EO 14156  Declaring a National Energy Emergency
--             signed 2025-01-20, published 2025-01-29, 90 FR 8433 (pp. 8433-8437),
--             doc 2025-02003. No "Revoked by" or "Superseded by" disposition note.
--   Notice    Continuation of the National Emergency With Respect to Energy
--             signed 2026-01-12, published 2026-01-14, 91 FR 1667, doc 2026-00732.
--
-- CITATION CORRECTION, recorded here because copying the register verbatim would
-- have propagated an error: EO 14156's own FR disposition note cites the
-- continuation as "Notice of January 12, 2026 (91 FR 1661)". 91 FR 1661 is a
-- different document — doc 2026-00698, a Foreign Assistance Act delegation. The
-- continuation is doc 2026-00732 at 91 FR 1667, verified against both document
-- records, and that is what the status row below cites.
--
-- Court documents, downloaded in full from storage.courtlistener.com and read:
--   W.D. Wash. 2:25-cv-00869-JNW  State of Washington v. Trump, First Amended and
--             Supplemental Complaint, ECF 55, filed 2026-01-30. Docket filed
--             2025-05-09, not terminated.
--   D. Md. 1:25-cv-00333-ABA      Nat'l Ass'n of Diversity Officers in Higher Educ.
--             v. Trump, ECF 45 (preliminary injunction, 2025-02-21) and ECF 107
--             (order dismissing the case, 2026-06-30).
--   4th Cir. No. 25-1189          Order granting a stay pending appeal, 2025-03-14,
--             on the D. Md. docket as ECF 73.
--
-- courtlistener.com's HTML site returns HTTP 403 to this environment and its
-- docket-entries API requires credentials, so dockets were read through the
-- unauthenticated search API and each document was then downloaded and read as
-- text. Rate limited to five requests a minute, which is why the docket sweeps
-- behind the negative findings below are narrow and named rather than exhaustive.
--
-- TWO CLAIMS REST ON AN ABSENCE, which is the weakest kind of finding, so they are
-- stated as what was searched: the W.D. Wash. docket was queried for injunction,
-- dismissal and order entries and returned only pro hac vice orders, and the FR
-- disposition record for EO 14156 contains no revocation. Neither guarantees that
-- nothing exists. That uncertainty is exactly what challenged_unverified reports.
--
-- whitehouse.gov appears nowhere in this migration, not even as a secondary link.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- ADDITIVE + IDEMPOTENT
-- ─────────────────────────────────────────────────────────────────────────────
-- The measure row is guarded by an existence check on its natural identity
-- (vr_measures has no unique constraint, so ON CONFLICT is unavailable there).
-- Issue rows use the vr_measure_issues_unique index, position rows use
-- vr_positions_unique on (measure_id, politician_id, action_type), and status rows
-- are guarded per (position_id, status, effective_at) — the natural key of an
-- append-only log entry. Nothing is updated and nothing is deleted: there is no
-- UPDATE, DELETE, DROP, ALTER or TRUNCATE statement in this file.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  m_14156 integer;
  m_14151 integer;
  pos     integer;
BEGIN

  -- ═══════════════════════════════════════════════════════════════════════════
  -- A. Executive Order 14156 — Declaring a National Energy Emergency
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT id INTO m_14156
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14156'
   LIMIT 1;

  IF m_14156 IS NULL THEN
    -- status 'enacted' for an order, as wave 1 established: the vr_measures status
    -- column describes whether the document took effect, not how it was made. The
    -- Standing axis in vr_exec_action_status is what reports what happened after.
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 14156',
       'Declaring a National Energy Emergency',
       'National Energy Emergency',
       'Signed 2025-01-20 and published at 90 FR 8433 on 2025-01-29. Declares a '
       || 'national emergency under the National Emergencies Act and directs agencies '
       || 'to use emergency authorities — including emergency Army Corps permitting '
       || 'and emergency Endangered Species Act consultation — to expedite domestic '
       || 'energy production, transportation, refining and generation. Section 8(a) '
       || 'defines the covered "energy" as crude oil, natural gas, lease condensates, '
       || 'natural gas liquids, refined petroleum products, uranium, coal, biofuels, '
       || 'geothermal heat, the kinetic movement of flowing water and critical '
       || 'minerals; wind and solar are not in the definition. Continued for one year '
       || 'on 2026-01-12 (91 FR 1667). Challenged by seventeen States in the Western '
       || 'District of Washington; no ruling on that challenge is on file.',
       NULL, TIMESTAMPTZ '2025-01-20T00:00:00Z', NULL, 'enacted',
       'https://www.federalregister.gov/documents/2025/01/29/2025-02003/declaring-a-national-energy-emergency',
       'Federal Register',
       '{"executiveOrder":"14156","frCitation":"90 FR 8433","frDocumentNumber":"2025-02003"}'::jsonb)
    RETURNING id INTO m_14156;
    RAISE NOTICE 'created vr_measures Executive Order 14156 as id %', m_14156;
  END IF;

  IF m_14156 IS NOT NULL THEN
    -- Three mappings, one of them 'yea_opposes'. The opposing mapping is read off
    -- the order's own Section 8(a) definition, not inferred from the subject: what
    -- the enumeration leaves out is operative, because the emergency procedures in
    -- Sections 3 through 6 reach only the listed resources.
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_14156, 'energy_production', 100, true, 'yea_supports',
       'Declares a national energy emergency and directs agencies to use emergency '
       || 'authorities to expedite domestic energy production, transportation, refining '
       || 'and generation.',
       'https://www.federalregister.gov/documents/2025/01/29/2025-02003/declaring-a-national-energy-emergency'),
      (m_14156, 'lands_energy', 60, false, 'yea_supports',
       'Sections 4 and 5 direct emergency Clean Water Act and Rivers and Harbors Act '
       || 'permitting by the Army Corps of Engineers and emergency Endangered Species '
       || 'Act consultation procedures for energy projects on federal land and water.',
       'https://www.federalregister.gov/documents/2025/01/29/2025-02003/declaring-a-national-energy-emergency'),
      (m_14156, 'climate_action', 55, false, 'yea_opposes',
       'Section 8(a) defines the "energy" the emergency covers as crude oil, natural '
       || 'gas, lease condensates, natural gas liquids, refined petroleum products, '
       || 'uranium, coal, biofuels, geothermal heat, the kinetic movement of flowing '
       || 'water and critical minerals — wind and solar are absent from the definition, '
       || 'so the emergency''s expedited procedures are unavailable to them.',
       'https://www.federalregister.gov/documents/2025/01/29/2025-02003/declaring-a-national-energy-emergency')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_14156, 'trump', 'issued', true, TIMESTAMPTZ '2025-01-20T00:00:00Z',
       'https://www.federalregister.gov/documents/2025/01/29/2025-02003/declaring-a-national-energy-emergency',
       'Signed Executive Order 14156 on 2025-01-20. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_14156 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      -- A.1 — publication. Says the order exists and stands unrevoked in the
      -- register, and nothing about any challenge to it.
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2025-01-20T00:00:00Z',
             'President of the United States',
             'Federal Register — Executive Order 14156 document record, 90 FR 8433',
             'https://www.federalregister.gov/documents/2025/01/29/2025-02003/declaring-a-national-energy-emergency',
             'Published at 90 FR 8433 and carrying no revocation in the Federal '
             || 'Register''s disposition record for this document. That is the whole of '
             || 'the claim: it describes the order''s status in the register, NOT the '
             || 'outcome of any challenge to it. The later rows in this log are what '
             || 'report the challenge.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2025-01-20T00:00:00Z');

      -- A.2 — continuation. Its own row because it answers a question the first row
      -- cannot: a National Emergencies Act declaration expires after a year unless
      -- continued, so without this the order's 2026 status would be an assumption.
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2026-01-12T00:00:00Z',
             'President of the United States',
             'Federal Register — Continuation of the National Emergency With Respect '
             || 'to Energy, 91 FR 1667 (doc 2026-00732), signed Jan. 12, 2026',
             'https://www.federalregister.gov/documents/2026/01/14/2026-00732/continuation-of-the-national-emergency-with-respect-to-energy',
             'A National Emergencies Act declaration expires after one year unless it '
             || 'is continued, so this row exists to answer a question the first row '
             || 'cannot: the order did not lapse on January 20, 2026. The notice states '
             || '"I am continuing for 1 year the national emergency declared in '
             || 'Executive Order 14156", under 50 U.S.C. 1622(d). CITATION CORRECTION: '
             || 'the Federal Register''s own disposition note for EO 14156 cites this as '
             || '"Notice of January 12, 2026 (91 FR 1661)", but 91 FR 1661 is a '
             || 'different document (doc 2026-00698, a Foreign Assistance Act '
             || 'delegation). The continuation is doc 2026-00732 at 91 FR 1667, which is '
             || 'what this row cites and what was read. A continuation says nothing '
             || 'about any challenge to the order.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2026-01-12T00:00:00Z');

      -- A.3 — THE CURRENT STANDING, and the one use of the new token. Dated to the
      -- operative amended complaint because that is the document that was read; the
      -- docket's own filing date is in the note. The challenge row is last on
      -- purpose: current standing is the latest row by effective_at, and a
      -- presidential continuation does not resolve a lawsuit, so had the order of
      -- these two been reversed the continuation row would still have carried
      -- challenged_unverified.
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'challenged_unverified', TIMESTAMPTZ '2026-01-30T00:00:00Z',
             'Challenge pending — U.S. District Court for the Western District of '
             || 'Washington (State of Washington v. Trump, No. 2:25-cv-00869-JNW)',
             'W.D. Wash. — State of Washington v. Trump, No. 2:25-cv-00869-JNW, First '
             || 'Amended and Supplemental Complaint (ECF 55, filed Jan. 30, 2026)',
             'https://storage.courtlistener.com/recap/gov.uscourts.wawd.348016/gov.uscourts.wawd.348016.55.0.pdf',
             'THE CURRENT STANDING, and it is a statement about this file rather than '
             || 'about the order. Seventeen States are suing over this order; its '
             || 'paragraph 1 reads "This case concerns an Executive Order issued on '
             || 'January 20, 2025, EO 14156, 90 Fed. Reg. 8433 (January 29, 2025)", and '
             || 'the prayer for relief asks the court to declare EO 14156 unlawful and '
             || 'to enjoin the agencies implementing it. The docket was filed May 9, '
             || '2025 and is not terminated; as read in this pass it carries no '
             || 'preliminary-injunction ruling and no ruling on the pending motion to '
             || 'dismiss. So no court has stopped this order and no court has upheld it '
             || '— "in force" would assert the second of those, which is why this row '
             || 'does not say it. Dated to the operative amended complaint, the document '
             || 'actually read, rather than to the docket''s filing date.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'challenged_unverified'
                            AND effective_at = TIMESTAMPTZ '2026-01-30T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- B. Executive Order 14151 — standing history, appended
  -- ═══════════════════════════════════════════════════════════════════════════
  -- The measure and position rows already exist from wave 1. This block resolves
  -- them and adds rows to the log; it creates nothing and changes nothing. If the
  -- measure is missing — a database where wave 1 has not run — the block is skipped
  -- rather than inventing a measure, so the two migrations can only ever apply in
  -- their intended order and never half-apply.
  SELECT id INTO m_14151
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14151'
   LIMIT 1;

  IF m_14151 IS NULL THEN
    RAISE NOTICE 'Executive Order 14151 not present — wave 1 has not run; skipping its backfill';
  ELSE
    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_14151 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      -- B.1 — the first standing this order held, appended BEHIND the current one.
      -- Partly blocked and not blocked: one provision of this order was enjoined in
      -- part and the rest was not, and the enjoined parties are the defendants other
      -- than the President.
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'partly_blocked', TIMESTAMPTZ '2025-02-21T00:00:00Z',
             'U.S. District Court for the District of Maryland (Judge Adam B. Abelson)',
             'D. Md. — National Association of Diversity Officers in Higher Education '
             || 'v. Trump, No. 1:25-cv-00333-ABA, Preliminary Injunction of Feb. 21, '
             || '2025 (ECF 45)',
             'https://storage.courtlistener.com/recap/gov.uscourts.mdd.575287/gov.uscourts.mdd.575287.45.0_5.pdf',
             'BACKFILL — the first standing this order held, appended behind the '
             || 'current one. "The Motion is GRANTED IN PART and DENIED IN PART": the '
             || 'court preliminarily enjoined this order''s Section 2(b)(i), the '
             || 'Termination Provision, in part — together with two provisions of a '
             || 'different order, EO 14173, which are not this row''s subject. Partly '
             || 'blocked and not blocked: one provision of this order was enjoined and '
             || 'the rest was not, and the Enjoined Parties are "Defendants other than '
             || 'the President" and those acting in concert with them, not the President '
             || 'himself. Read from the injunction order itself, not from the '
             || 'accompanying memorandum opinion (ECF 44).'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'partly_blocked'
                            AND effective_at = TIMESTAMPTZ '2025-02-21T00:00:00Z');

      -- B.2 — the stay. THE COUNTER-EXAMPLE to the new token: a primary ruling
      -- exists here and was read, so the row reports what that ruling did rather
      -- than reporting the challenge as unresolved.
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2025-03-14T00:00:00Z',
             'U.S. Court of Appeals for the Fourth Circuit',
             'Fourth Circuit — National Association of Diversity Officers in Higher '
             || 'Education v. Trump, No. 25-1189, Order of Mar. 14, 2025 granting a stay '
             || 'pending appeal (D. Md. ECF 73)',
             'https://storage.courtlistener.com/recap/gov.uscourts.mdd.575287/gov.uscourts.mdd.575287.73.0_2.pdf',
             'BACKFILL — "we grant the government''s motion for a stay of the '
             || 'preliminary injunction", entered at the direction of Chief Judge Diaz '
             || 'with the concurrence of Judges Harris and Rushing, applying the Nken v. '
             || 'Holder factors. The injunction stopped operating, so the order was '
             || 'operative again — which is why this row reads in force. A STAY IS NOT A '
             || 'MERITS RULING: the same order set an expedited briefing schedule and '
             || 'the appeal remained pending until the February 6, 2026 decision, which '
             || 'is the row that resolved it. This row is what "in force" is licensed to '
             || 'mean here and no more.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2025-03-14T00:00:00Z');

      -- B.3 — the current standing. Found while verifying the docket for the
      -- backfill above and appended in the same way, because the alternative was to
      -- leave a row whose closing sentence ("the case continues on remand") had
      -- stopped being true. Appending is how this log corrects itself; the earlier
      -- row stays exactly as wave 1 wrote it.
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2026-06-30T00:00:00Z',
             'U.S. District Court for the District of Maryland (Judge Adam B. Abelson)',
             'D. Md. — National Association of Diversity Officers in Higher Education '
             || 'v. Trump, No. 1:25-cv-00333-ABA, Order of June 30, 2026 dismissing the '
             || 'case (ECF 107)',
             'https://storage.courtlistener.com/recap/gov.uscourts.mdd.575287/gov.uscourts.mdd.575287.107.0.pdf',
             'THE CURRENT STANDING, found while verifying the docket for the backfill '
             || 'above and appended rather than folded into the earlier row. On remand '
             || 'the plaintiffs filed a notice of voluntary dismissal without prejudice '
             || 'and the court accepted it: "it is hereby ORDERED that the notice is '
             || 'ACCEPTED. The Clerk is directed to CLOSE this case." The case is closed '
             || 'and no injunction against this order is in effect. WITHOUT PREJUDICE '
             || 'and by the plaintiffs'' own choice — no court held this order lawful, '
             || 'and this row does not say one did. It supersedes the February 6, 2026 '
             || 'row''s closing sentence, which was true when written; the earlier row '
             || 'stays as filed because the log is append-only.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2026-06-30T00:00:00Z');
    ELSE
      RAISE NOTICE 'no vr_positions row for Executive Order 14151 — skipping its backfill';
    END IF;
  END IF;

END $$;
