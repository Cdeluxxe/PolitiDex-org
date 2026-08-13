-- ─────────────────────────────────────────────────────────────────────────────
-- ✒️ Executive Enactment Record — wave 9: the standing refresh, and `overridden`
-- ─────────────────────────────────────────────────────────────────────────────
-- Rolls forward from 20260807000000_seed_exec_actions_wave1.sql,
-- 20260808000000_seed_exec_actions_wave2.sql,
-- 20260824000000_seed_exec_actions_wave3.sql,
-- 20260826000000_seed_exec_actions_wave4.sql,
-- 20260828000000_seed_exec_actions_wave5.sql,
-- 20260829000000_seed_exec_actions_wave6.sql,
-- 20260830000000_seed_exec_actions_wave7.sql and
-- 20260831000000_seed_exec_actions_wave8.sql. Changes NO schema and edits no
-- applied migration: it inserts into vr_measures, vr_measure_issues, vr_positions
-- and vr_exec_action_status only, every insert is guarded, and re-applying is a
-- no-op. There is no UPDATE in this file and there is nothing in it that could
-- rewrite a row an earlier wave wrote — see THE APPEND-ONLY RULE below, which is
-- doing more work in this wave than in any before it.
--
-- Curated source of truth: db/exec-action-seed.json. scripts/test-exec-seed.mjs
-- reads waves 1 through 9 together and asserts that every citation, date and issue
-- key in that file appears in one of them.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHY THIS WAVE EXISTS
-- ─────────────────────────────────────────────────────────────────────────────
-- Every wave before this one added ACTIONS. Wave 3 added coverage, wave 6 added
-- balance, wave 7 added a term, wave 8 added recency. None of them asked the
-- question this one asks, which is not "what else did he do" but "is what we
-- already published still true".
--
-- It is a different kind of question because a standing row decays in a way an
-- action row does not. An action happened on a date and stays happened. A standing
-- is a claim about the present tense — this order IS in force, this challenge IS
-- unresolved — and the world keeps moving after the row is written. Fifty-seven
-- actions carry a hundred and thirty-odd standing rows between them, every one of
-- them written in the present tense, and the ones written earliest have had the
-- longest to go stale. Nothing in the app can detect that. A stale standing renders
-- exactly like a fresh one.
--
-- So this wave re-read the dockets behind the rows most likely to have moved and
-- appended what it found. Four actions moved. One of them moved in a way that had
-- no name in the vocabulary, which is the other half of this wave.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT IS IN IT
-- ─────────────────────────────────────────────────────────────────────────────
--  A. Executive Order 14248 — final judgment appended (D.D.C., 2026-03-31)
--  B. Executive Order 14156 — re-verified, token unchanged (W.D. Wash., 2026-06-04)
--  C. Executive Order 14399 — a challenge found, and the ruling on it read
--                             (D.D.C., 2026-05-28)
--  D. Executive Order 14173 — four rows of court history backfilled behind an
--                             unchanged current standing (2025-02-21 → 2026-06-30)
--  E. H.R. 6395 (116th Congress) — THE NEW ACTION, and the only one: the FY2021
--                             defense authorization, vetoed 2020-12-23 and enacted
--                             over the veto on 2021-01-01, carrying the new
--                             `overridden` standing.
--
-- A through D create nothing. They resolve measures and positions earlier waves
-- wrote and append to their logs; if the measure is missing — a database where the
-- earlier wave has not run — the block is skipped rather than inventing a measure.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- THE NEW TOKEN — `overridden`, and why nothing else could carry it
-- ─────────────────────────────────────────────────────────────────────────────
-- Wave 7's header recorded this gap in full and could not close it, because closing
-- it was read-path and UI work and that wave was scoped to data. It is closed now.
-- The token is
--
--   overridden
--     The veto did not hold. Congress passed the measure over it under Article I,
--     section 7, and the measure became law. The actor was Congress, not a court.
--
-- It is `contested`, so the standing clause survives into every rendering of the
-- summary, and it is ranked with the total defeats in the issue-level standing
-- order. Every other token in the vocabulary states something false about this
-- outcome, and each is false in its own way rather than merely imprecise:
--   in_force               asserts the veto held. The measure became law.
--   blocked / struck_down  name a court as the actor. The actor was Congress.
--   rescinded              names the President reversing himself. He did not.
--   superseded             is a later presidential action, and is contested:false —
--                          filing the most contested outcome available to an
--                          executive action as an uncontested one is the worst of
--                          the available errors.
-- The actor is part of the claim, not context around it, which is why the rendered
-- label reads "overridden by Congress" rather than a bare "overridden": a reader
-- who sees only the second one has to guess which branch ended the action, and the
-- whole reason the token exists is that the two answers are different claims.
--
-- NO SCHEMA CHANGE. vr_exec_action_status.status is plain text with no CHECK
-- constraint, and 20260806000000's comment says why: "so the vocabulary can be
-- widened by a data change rather than a schema migration". This is the second time
-- that decision has paid for itself; challenged_unverified in wave 2 was the first.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHY EXACTLY ONE OVERRIDE, AND HOW THAT WAS ESTABLISHED
-- ─────────────────────────────────────────────────────────────────────────────
-- Not a sample and not an assumption. The Senate publishes a roll-call menu per
-- session, and every menu covering this presidency was fetched and read for
-- override questions:
--   116th Congress, 1st session   5 override attempts, every one sustained
--                                 (S.J. Res. 54, 38, 37, 36 and 7)
--   116th Congress, 2nd session   2 — H.R. 6395, OVERRIDDEN; S.J. Res. 68 sustained
--   117th Congress, both sessions none
--   119th Congress, both sessions none
-- One successful override exists in either term. This wave seeds it and stops. A
-- second `overridden` row would have to be invented to exist, which is the reason
-- the brief's "prefer one correct new disposition over several soft approximations"
-- costs nothing here: there is nothing else to file.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- THE VETO ROW IS STILL A VETO — the laundering this wave had to avoid
-- ─────────────────────────────────────────────────────────────────────────────
-- H.R. 6395 goes in as a vetoed_law, which consistency.js#_EXEC_BLOCKS marks as a
-- blocking class. The support_meaning below is yea_supports because the MEASURE
-- advances america_first; the engine inverts a blocking action, so the veto itself
-- reads the other way. That inversion is wave 7's convention and this row does not
-- vary it.
--
-- What the new standing must not do is quietly become a verdict. `overridden` says
-- what happened to the ACTION — the veto did not hold — and says nothing about
-- whether the Act was good policy, whether the veto was right, or whether the
-- President won or lost. Axis A already reports the direction of the act, in this
-- case as an action against america_first. Axis B reports only what became of it.
-- Collapsing the two would be the executive-lane version of scoring a member on
-- whether their side prevailed, which the 🏛️ lane has never done.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- ONE ISSUE MAPPING, AND THE TENSION IN IT IS ON THE ROW
-- ─────────────────────────────────────────────────────────────────────────────
-- The veto message's own words are "My Administration recognizes the importance of
-- the Act to our national security". Its objections are to the absence of a repeal
-- of section 230 of the Communications Decency Act, to a provision renaming
-- military installations, to limits on military construction funds, to a 5G
-- provision, and to restrictions on withdrawing troops — none of them a rejection
-- of the authorization levels. The row still reads as an action against
-- america_first, because this lane reports what an action did to a measure and not
-- the reasons given for it, and the veto message is linked on the row for a reader
-- who wants the reasons. The seed's _issuesNote states this in the data rather than
-- only here.
--
-- america_first_fp was considered and NOT mapped. The argument is real — the Act's
-- restrictions on troop drawdowns cut against an end-the-open-ended-commitments
-- position, so the veto would read as advancing it — but this pass did not read
-- those sections of a 4,517-page Act, and the veto message's characterisation of
-- them is not a reading of them. Fail closed. The mapping would also have had the
-- convenient effect of making the row read both ways, which is a reason to be more
-- suspicious of it rather than less.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- CITATIONS — congress.gov 403s, and what was read instead
-- ─────────────────────────────────────────────────────────────────────────────
-- congress.gov is the source of record for a vetoed_law per
-- db/exec-action-types.json#actionClasses.vetoed_law, and it is cited as this
-- measure's source_url for that reason. It returns HTTP 403 to this environment, so
-- every fact asserted here was read from a document that does answer:
--   the veto            GovInfo DCPD-202000903, the Daily Compilation entry for the
--                       December 23, 2020 message returning the bill without approval
--   the House           the Clerk of the House's electronic record for Roll No. 253
--                       of 2020 — question "On Passage, Objections of the President
--                       to the Contrary Notwithstanding", result Passed, 322 to 87
--   the Senate          the Senate's own record of vote 292 of the 116th Congress,
--                       2nd session — "Veto Overridden (81-13)"
--   the enactment       GPO's published enrolled text of Public Law 116-283
-- The enrolled text is the strongest of the four and is what the current standing
-- cites: it prints both reconsideration resolutions verbatim at 134 Stat. 4868 and
-- its LEGISLATIVE HISTORY block names all three dates, so one document establishes
-- both facts that standing rests on — that the Senate acted, and that the measure
-- became law.
--
-- db/exec-action-types.json#sourceRule.primaryHosts gains ONE host in this wave,
-- clerk.house.gov, for the House row. congress.gov summarises that action in a line
-- of a bill history; the Clerk publishes the record of the question itself. See
-- _chamberHostsWhy in that file for why the Senate's equivalent is not added.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- THE APPEND-ONLY RULE, WHICH IS THE WHOLE SAFETY MODEL OF THIS WAVE
-- ─────────────────────────────────────────────────────────────────────────────
-- Four already-published standings are being corrected here and not one of them is
-- edited. exec-record.js#standingOf resolves the latest citable row by
-- effective_at, so appending a newer row IS the correction, and the superseded row
-- stays legible underneath it. That matters most where the correction is
-- embarrassing: EO 14248's January 2026 row told readers that claims touching
-- Sections 2(b) and 3(a) were still open, and by March they were not. Deleting that
-- sentence would leave no trace that the app ever said it. Appending the judgment
-- leaves the record of both what we said and when we stopped saying it.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT WAS REVIEWED AND LEFT ALONE — the fail-closed half of the pass
-- ─────────────────────────────────────────────────────────────────────────────
-- EO 14360 stays in_force. EO 14389 of 2026-02-20 was read in full because it was
-- the likeliest supersession in the file: it ends the ad valorem duties imposed
-- under EO 14193, 14194, 14195, 14245, 14257, 14323, 14329, 14380 and 14382 as
-- amended, and it does NOT name EO 14360. Its section 2(c) expressly leaves the de
-- minimis order and the import-surcharge proclamation unaffected and section 2(d)
-- leaves the section 232 and section 301 duties unaffected. The register records no
-- supersession of EO 14360, so none is filed.
--
-- THE BROAD CHALLENGE SWEEP FOUND NOTHING FILEABLE, and that is worth stating
-- because the raw counts look like it should have. A full-text search of the
-- federal dockets returns 132 cases mentioning EO 14159, 114 mentioning EO 14173,
-- 50 mentioning EO 14165, 32 mentioning EO 14222 and 16 mentioning EO 14360. Almost
-- every one is an individual immigration case or a grant-termination case in which
-- the order is recited as background rather than challenged. challenged_unverified
-- requires a primary court document showing a live challenge TO THE ACTION and no
-- primary ruling resolving it; a mention is neither. Filing thirty rows off a search
-- count would be the status-layer version of volume for volume's sake, and it would
-- read on the profile as thirty contested orders. Nothing was filed from the sweep.
-- EO 14402, EO 14406, EO 14394, EO 14418 and EO 14419 return no docket mentions at
-- all.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- SHARED-ROW HAZARD
-- ─────────────────────────────────────────────────────────────────────────────
-- vr_measure_issues is keyed on the MEASURE, so an issue row on a bill that
-- members of Congress also acted on re-scores every one of them in the 🏛️ lane.
-- H.R. 6395 is such a bill. The single row this wave writes maps it to
-- america_first with support_meaning yea_supports — the Act authorizes the
-- appropriations, the military construction and the personnel strengths, which is
-- what that issue is about, and that reading is correct for any member the row
-- reaches. It is the same discipline wave 7 applied to H.R. 748: the mapping has to
-- be defensible as a statement about the MEASURE on its own, because it will be
-- read as one. Nothing here maps the veto, the override or the President's reasons
-- onto the measure; those live in vr_positions and vr_exec_action_status, which are
-- per-politician and reach nobody else.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  m_14248    integer;
  m_14156    integer;
  m_14399    integer;
  m_14173    integer;
  m_6395     integer;
  pos        integer;
  u          text;
BEGIN

  -- ═══════════════════════════════════════════════════════════════════════════
  -- A. Executive Order 14248 — Preserving and Protecting the Integrity of
  --    American Elections
  --
  --    WAVE 9 — THE ROW THAT CLOSES A STALE CLAUSE. The standing on file was
  --    partly_blocked as of 2026-01-30, and that row ends "left claims touching
  --    Sections 2(b) and 3(a) for further proceedings". Those proceedings ended.
  --    The parties told the court they no longer wished to litigate the remaining
  --    issues and judgment was entered under Rule 58(d) on 2026-03-31.
  --
  --    THE TOKEN DOES NOT MOVE. That is the finding, not a failure to look: parts
  --    of this order are permanently enjoined and parts are operative, which is
  --    what partly blocked means. What changed is that the disposition is final
  --    rather than interim.
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT id INTO m_14248
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14248'
   LIMIT 1;

  IF m_14248 IS NULL THEN
    RAISE NOTICE 'Executive Order 14248 not present — an earlier wave has not run; skipping its refresh';
  ELSE
    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_14248 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'partly_blocked', TIMESTAMPTZ '2026-03-31T00:00:00Z',
             'U.S. District Court for the District of Columbia (Judge Colleen Kollar-Kotelly)',
             'D.D.C. — LULAC v. Executive Office of the President, Nos. 25-0946 / '
             || '25-0952 / 25-0955 (CKK), Final Judgment of Mar. 31, 2026 (ECF 256)',
             'https://storage.courtlistener.com/recap/gov.uscourts.dcd.279032/gov.uscourts.dcd.279032.256.0.pdf',
             'THE CURRENT STANDING, and the row that closes the January 30, 2026 '
             || 'row''s "left for further proceedings" clause — which is why it was '
             || 'written: that clause had gone stale and a reader was being told the '
             || 'case was still open on those sections when it is not. The parties '
             || 'told the court they no longer wished to litigate the remaining '
             || 'issues, and judgment was entered under Rule 58(d). Its own terms: '
             || 'Sections 2(d) and 3(d) are DECLARED to violate the separation of '
             || 'powers and the named agencies are PERMANENTLY ENJOINED from taking '
             || 'any action to implement or give effect to either; the earlier '
             || 'permanent injunction against Section 2(a) is restated and is already '
             || 'on appeal; in implementing Sections 2(b) and 3(a) the named agencies '
             || 'are DECLARED bound by the Privacy Act, including its requirement of '
             || 'at least thirty days'' notice and opportunity for comment for a new '
             || 'or intended routine use; and judgment is entered FOR the defendants '
             || 'on everything else, with the challenges to Sections 4(a), 7(a) and '
             || '7(b) and the Administrative Procedure Act claims dismissed without '
             || 'prejudice. THE TOKEN DOES NOT MOVE, and that is the finding rather '
             || 'than a failure to look: parts of this order are permanently enjoined '
             || 'and parts are operative, which is what "partly blocked" means. What '
             || 'changed is that the disposition is final rather than interim. The '
             || 'court retains jurisdiction to enforce the judgment, and notices of '
             || 'appeal were entered the same day and again on May 28, 2026; an '
             || 'appellate ruling would arrive as a further row rather than as an edit '
             || 'to this one.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'partly_blocked'
                            AND effective_at = TIMESTAMPTZ '2026-03-31T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- B. Executive Order 14156 — Declaring a National Energy Emergency
  --
  --    WAVE 9 — RE-VERIFICATION, AND THE DATE IS THE CLAIM. The token does not
  --    move; what moves is the day on which it was last checked. For a coverage
  --    token that IS the substantive content: challenged_unverified asserts the
  --    state of OUR FILE, so a file checked in January cannot speak for July. The
  --    dispositive motion is fully briefed and undecided, and every signed order
  --    on the docket through ECF 123 of 2026-07-30 is procedural.
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT id INTO m_14156
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14156'
   LIMIT 1;

  IF m_14156 IS NULL THEN
    RAISE NOTICE 'Executive Order 14156 not present — wave 2 has not run; skipping its refresh';
  ELSE
    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_14156 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'challenged_unverified', TIMESTAMPTZ '2026-06-04T00:00:00Z',
             'Challenge pending — U.S. District Court for the Western District of Washington (State of Washington v. Trump, No. 2:25-cv-00869-JNW)',
             'W.D. Wash. — State of Washington v. Trump, No. 2:25-cv-00869-JNW, '
             || 'Defendants'' Reply in Support of Their Motion to Dismiss (ECF 101, '
             || 'filed June 4, 2026)',
             'https://storage.courtlistener.com/recap/gov.uscourts.wawd.348016/gov.uscourts.wawd.348016.101.0.pdf',
             'THE CURRENT STANDING. The token does not move; what moves is the date '
             || 'on which it was last checked, and for a coverage token that date IS '
             || 'the substantive claim — the row asserts the state of our file, so a '
             || 'file checked in January cannot speak for July. Re-read in this pass: '
             || 'the case is live and the dispositive motion is fully briefed and '
             || 'undecided. The document cited here is the defendants'' reply in '
             || 'support of their own motion to dismiss under Rules 12(b)(1) and '
             || '12(b)(6), noted for June 4, 2026, arguing that the plaintiff States '
             || 'lack standing, that their claims could only be ripe in a challenge to '
             || 'a particular project, and that no final agency action exists. Every '
             || 'signed order on the docket through ECF 123 of July 30, 2026 is '
             || 'procedural — leave to appear, amicus leave, deadline stipulations, '
             || 'and a stay during a lapse of appropriations. So the position is '
             || 'unchanged and stated the same way: no court has stopped this order '
             || 'and no court has upheld it. The absence of a ruling is what this pass '
             || 'searched for and did not find, which is not a guarantee that none '
             || 'exists.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'challenged_unverified'
                            AND effective_at = TIMESTAMPTZ '2026-06-04T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- C. Executive Order 14399 — Protecting the Integrity of Federal Elections
  --
  --    WAVE 9 — A CHALLENGE FOUND, AND THE RULING ON IT READ. Wave 8 filed this
  --    order with one row, from the register, and said no litigation was on file.
  --    Litigation is on file: LULAC v. Executive Office of the President, No.
  --    1:26-cv-01132 (D.D.C.), filed 2026-04-02, names this order and asks that
  --    Sections 2(a), 3(b)(iii) and 3(b)(iv) be enjoined; it was consolidated on
  --    2026-04-14 into DSCC v. Trump, No. 1:26-cv-01114 (CJN), with NAACP v.
  --    Trump, No. 1:26-cv-01151.
  --
  --    THE TOKEN STAYS in_force AND THE BASIS CHANGES, which is the honest
  --    combination and not the flattering one. challenged_unverified is for the
  --    absence of a RULING, never for the absence of a reading — EO 14151's March
  --    2025 stay row states that rule and is the counter-example wave 2 filed for
  --    exactly this situation. A primary ruling exists here and this pass read all
  --    twenty-six pages of it, so the row reports what that ruling did: it denied
  --    the preliminary injunctions on ripeness and standing, leaving the order
  --    operating and resolving nothing about its lawfulness. Both halves are in
  --    the note, in that order.
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT id INTO m_14399
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14399'
   LIMIT 1;

  IF m_14399 IS NULL THEN
    RAISE NOTICE 'Executive Order 14399 not present — wave 8 has not run; skipping its refresh';
  ELSE
    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_14399 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2026-05-28T00:00:00Z',
             'U.S. District Court for the District of Columbia (Judge Carl J. Nichols)',
             'D.D.C. — Democratic Senatorial Campaign Committee v. Trump, No. '
             || '1:26-cv-01114 (CJN) (consolidated), Memorandum Opinion of May 28, '
             || '2026 (ECF 143)',
             'https://storage.courtlistener.com/recap/gov.uscourts.dcd.291053/gov.uscourts.dcd.291053.143.0_1.pdf',
             'THE CURRENT STANDING, and a row that exists because the register alone '
             || 'can no longer describe this order. It is under challenge: LULAC v. '
             || 'Executive Office of the President, No. 1:26-cv-01132, was filed in '
             || 'the District of Columbia on April 2, 2026 naming this order by title '
             || 'and asking that Sections 2(a), 3(b)(iii) and 3(b)(iv) be enjoined, '
             || 'and on April 14, 2026 it was consolidated with NAACP v. Trump, No. '
             || '1:26-cv-01151, into the lead case above. On May 28, 2026 the court '
             || 'DENIED the motions for a preliminary injunction. Read what that '
             || 'denial is and is not. The claims against Section 3 were held unripe '
             || 'because the Postal Service has issued neither a proposed nor a final '
             || 'rule; the claims against Section 2(a) failed for want of a showing of '
             || 'likely standing and imminent irreparable harm because no State '
             || 'Citizenship List has been created or transmitted and no State has '
             || 'acted on one; and the opinion states that plaintiffs may renew their '
             || 'motions if and when those actions occur. NO COURT HAS UPHELD THIS '
             || 'ORDER. Nothing enjoins it — that is what this row says and the whole '
             || 'of what it says. Notices of appeal were entered June 1, 2026 and the '
             || 'appeal was transmitted to the Court of Appeals on June 2, 2026.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2026-05-28T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- D. Executive Order 14173 — Ending Illegal Discrimination and Restoring
  --    Merit-Based Opportunity
  --
  --    WAVE 9 — COMPLETENESS, NOT A STATUS CHANGE. Until this block the standing
  --    log for this order held one row, from the register, and that row is
  --    carefully worded: it says the order stands unrevoked BY LATER PRESIDENTIAL
  --    ACTION and that it says nothing about any challenge. Both true, and both
  --    incomplete in a way no reader could detect — because this file had ALREADY
  --    READ the D. Md. preliminary injunction that enjoined two of THIS order's
  --    provisions, and had recorded it only in EO 14151's log, where it appears as
  --    an aside about "two provisions of a different order". The app knew this
  --    order had been partly blocked for three weeks in 2025 and did not say so on
  --    the order's own card.
  --
  --    The current standing is unchanged and stays in_force — the injunction was
  --    stayed, then vacated, and the case is closed — which is exactly why these
  --    four rows are a completeness fix and not a status change. Same four
  --    documents wave 2 read for EO 14151, read again for what they say about this
  --    order.
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT id INTO m_14173
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14173'
   LIMIT 1;

  IF m_14173 IS NULL THEN
    RAISE NOTICE 'Executive Order 14173 not present — an earlier wave has not run; skipping its backfill';
  ELSE
    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_14173 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      -- D.1 — the injunction, which named this order's own provisions.
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'partly_blocked', TIMESTAMPTZ '2025-02-21T00:00:00Z',
             'U.S. District Court for the District of Maryland (Judge Adam B. Abelson)',
             'D. Md. — National Association of Diversity Officers in Higher Education '
             || 'v. Trump, No. 1:25-cv-00333-ABA, Preliminary Injunction of Feb. 21, '
             || '2025 (ECF 45)',
             'https://storage.courtlistener.com/recap/gov.uscourts.mdd.575287/gov.uscourts.mdd.575287.45.0_5.pdf',
             'BACKFILL — the first standing this order held, appended behind the '
             || 'current one. "The Motion is GRANTED IN PART and DENIED IN PART." Two '
             || 'provisions of this order were reached: Section 3(b)(iv), which the '
             || 'court calls the Certification Provision and which requires every '
             || 'contract and grant award to carry a term certifying that the '
             || 'counterparty operates no programs promoting DEI that violate Federal '
             || 'anti-discrimination law, and Section 4(b)(iii), the Enforcement '
             || 'Threat Provision, which directs a strategic enforcement plan under '
             || 'which each agency identifies up to nine potential civil compliance '
             || 'investigations. The Enjoined Parties — "Defendants other than the '
             || 'President" and those in active concert with them — were ordered not '
             || 'to require any certification under the first or bring any enforcement '
             || 'action under the second. Partly blocked and not blocked: two '
             || 'provisions were enjoined and the rest of the order was not, and the '
             || 'President himself was not enjoined. Read from the injunction order '
             || 'itself (ECF 45), not from the accompanying memorandum opinion. The '
             || 'same order also enjoined a provision of EO 14151, which is that '
             || 'order''s row and not this one''s.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'partly_blocked'
                            AND effective_at = TIMESTAMPTZ '2025-02-21T00:00:00Z');

      -- D.2 — the stay. A STAY IS NOT A MERITS RULING; the row claims only that the
      -- order was operative again.
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2025-03-14T00:00:00Z',
             'U.S. Court of Appeals for the Fourth Circuit',
             'Fourth Circuit — National Association of Diversity Officers in Higher '
             || 'Education v. Trump, No. 25-1189, Order of Mar. 14, 2025 granting a '
             || 'stay pending appeal (D. Md. ECF 73)',
             'https://storage.courtlistener.com/recap/gov.uscourts.mdd.575287/gov.uscourts.mdd.575287.73.0_2.pdf',
             'BACKFILL — "we grant the government''s motion for a stay of the '
             || 'preliminary injunction". The injunction stopped operating as to this '
             || 'order''s two provisions along with everything else it covered, so the '
             || 'order was operative again. A STAY IS NOT A MERITS RULING and this row '
             || 'claims nothing beyond the operation of the order: the same order set '
             || 'an expedited briefing schedule and the appeal stayed pending until '
             || 'February 6, 2026.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2025-03-14T00:00:00Z');

      -- D.3 — the appeal reaching judgment. Vacated is not upheld.
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2026-02-06T00:00:00Z',
             'U.S. Court of Appeals for the Fourth Circuit',
             'Fourth Circuit — National Association of Diversity Officers in Higher '
             || 'Education v. Trump, No. 25-1189 (published opinion, Feb. 6, 2026)',
             'https://storage.courtlistener.com/pdf/2026/02/06/natl._assoc._of_diversity_officers_in_higher_edu._v._donald_trump.pdf',
             'BACKFILL — the appeal reached judgment: "we vacate the district court''s '
             || 'order granting plaintiffs'' motion for a preliminary injunction, and '
             || 'remand for further proceedings. VACATED AND REMANDED". The injunction '
             || 'that had reached this order''s Certification and Enforcement Threat '
             || 'Provisions no longer exists, so no injunction against this order is '
             || 'in effect. Vacated on appeal is not upheld on the merits, and this '
             || 'row does not say it was.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2026-02-06T00:00:00Z');

      -- D.4 — the case closing. WITHOUT PREJUDICE, and by the plaintiffs' own choice.
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2026-06-30T00:00:00Z',
             'U.S. District Court for the District of Maryland (Judge Adam B. Abelson)',
             'D. Md. — National Association of Diversity Officers in Higher Education '
             || 'v. Trump, No. 1:25-cv-00333-ABA, Order of June 30, 2026 dismissing '
             || 'the case (ECF 107)',
             'https://storage.courtlistener.com/recap/gov.uscourts.mdd.575287/gov.uscourts.mdd.575287.107.0.pdf',
             'THE CURRENT STANDING. On remand the plaintiffs filed a notice of '
             || 'voluntary dismissal without prejudice and the court accepted it: "it '
             || 'is hereby ORDERED that the notice is ACCEPTED. The Clerk is directed '
             || 'to CLOSE this case." The case is closed and no injunction against '
             || 'this order is in effect. WITHOUT PREJUDICE and by the plaintiffs'' '
             || 'own choice — no court held this order lawful, and this row does not '
             || 'say one did.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2026-06-30T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- E. H.R. 6395 (116th Congress) — William M. (Mac) Thornberry National Defense
  --    Authorization Act for Fiscal Year 2021
  --
  --    THE ONLY NEW ACTION IN THIS WAVE, and the row the `overridden` token
  --    exists for. Wave 7 put three vetoes on file and every one of them held —
  --    each carries a single in_force standing recording an override attempt that
  --    fell short. That is a true record of those three documents and a false
  --    picture of the veto power on this profile, because the one veto of this
  --    presidency that Congress DID override was left out, for the reason wave 7
  --    stated in its own header: the vocabulary had no way to say it.
  --
  --    measure status is 'enacted' and not 'vetoed'. The three wave-7 resolutions
  --    are 'vetoed' because they never became law. This one did.
  --
  --    THE DIRECTION DESCRIBES THE MEASURE, NOT THE ACTION TAKEN AGAINST IT.
  --    support_meaning below is yea_supports because the Act advances
  --    america_first. The engine inverts a blocking action, so the veto itself
  --    reads the other way. See the direction convention in wave 7's header before
  --    changing this.
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.congress.gov/bill/116th-congress/house-bill/6395';

  SELECT id INTO m_6395
    FROM vr_measures
   WHERE measure_type = 'bill' AND chamber = 'house' AND congress = 116
     AND number = 'H.R. 6395'
   LIMIT 1;

  IF m_6395 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('bill', 116, 'house', 'H.R. 6395',
       'William M. (Mac) Thornberry National Defense Authorization Act for Fiscal Year 2021',
       'NDAA for Fiscal Year 2021',
       'An Act to authorize appropriations for fiscal year 2021 for military '
       || 'activities of the Department of Defense, for military construction, and '
       || 'for defense activities of the Department of Energy, to prescribe military '
       || 'personnel strengths for such fiscal year, and for other purposes. '
       || 'Returned to the House without approval on 2020-12-23. The House '
       || 'reconsidered it on 2020-12-28 and the Senate on 2021-01-01, each agreeing '
       || 'to pass the bill by the two-thirds Article I, section 7 requires, and it '
       || 'became Public Law 116-283 on 2021-01-01 at 134 Stat. 3388. It is the only '
       || 'measure of this presidency enacted over a veto.',
       NULL, TIMESTAMPTZ '2020-03-26T00:00:00Z', NULL, 'enacted',
       u, 'Congress.gov',
       '{"billType":"hr","billNumber":"6395","congress":"116","publicLaw":"116-283"}'::jsonb)
    RETURNING id INTO m_6395;
    RAISE NOTICE 'created vr_measures H.R. 6395 as id %', m_6395;
  END IF;

  IF m_6395 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_6395, 'america_first', 90, true, 'yea_supports',
       'The direction recorded here describes the MEASURE, not the action taken '
       || 'against it. H.R. 6395 is the annual defense authorization: its long title '
       || 'is "An Act to authorize appropriations for fiscal year 2021 for military '
       || 'activities of the Department of Defense, for military construction, and '
       || 'for defense activities of the Department of Energy, to prescribe military '
       || 'personnel strengths for such fiscal year, and for other purposes". '
       || 'Funding and manning the armed forces at the level the Department asked '
       || 'for is what the stated position''s commitment to the military is about, '
       || 'so the measure advances this issue. The record engine inverts a blocking '
       || 'action, so the veto itself reads the other way — it returned that '
       || 'authorization to the House without approval.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_6395, 'trump', 'vetoed', false, TIMESTAMPTZ '2020-12-23T00:00:00Z', u,
       'Returned H.R. 6395 to the House with objections on 2020-12-23, in the '
       || 'message published as DCPD-202000903: "I am returning, without my '
       || 'approval, H.R. 6395". Shared authorship in the sense that Congress wrote '
       || 'and passed the bill; the decision to block it was the President''s alone.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_6395 AND politician_id = 'trump' AND action_type = 'vetoed'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      -- E.1 — the first of the two chambers, filed as its own row so the override
      -- is not presented as a single event.
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'overridden', TIMESTAMPTZ '2020-12-28T00:00:00Z',
             'The House of Representatives, on the question of passage, the objections of the President to the contrary notwithstanding',
             'Clerk of the House — electronic record for Roll No. 253 of 2020, 116th Congress, 2nd session',
             'https://clerk.house.gov/evs/2020/roll253.xml',
             'THE FIRST OF THE TWO CHAMBERS, filed as its own row so the override is '
             || 'not presented as a single event. The Clerk''s record for December '
             || '28, 2020 gives the question as "On Passage, Objections of the '
             || 'President to the Contrary Notwithstanding", the measure as H R 6395 '
             || 'and the result as "Passed", with 322 in favour and 87 against — past '
             || 'the two-thirds threshold Article I, section 7 sets. On its own this '
             || 'makes no law: a measure returned without approval needs both '
             || 'chambers, and the row after it is where the second one acts. This '
             || 'states what the House did with the returned bill and says nothing '
             || 'about any challenge to the veto or to the measure.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'overridden'
                            AND effective_at = TIMESTAMPTZ '2020-12-28T00:00:00Z');

      -- E.2 — THE CURRENT STANDING. One document is cited rather than two because
      -- the enrolled text establishes both facts the standing rests on: that the
      -- Senate acted, and that the measure became law.
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'overridden', TIMESTAMPTZ '2021-01-01T00:00:00Z',
             'The Senate, completing reconsideration under Article I, section 7, and the measure''s approval as Public Law 116-283',
             'GovInfo — Public Law 116-283, enrolled text as published by GPO, 134 Stat. 3388 (reconsideration resolutions at 134 Stat. 4868)',
             'https://www.govinfo.gov/content/pkg/PLAW-116publ283/html/PLAW-116publ283.htm',
             'THE CURRENT STANDING, AND THE WHOLE POINT OF THE TOKEN: THE VETO DID '
             || 'NOT HOLD. The bill was returned to the House without approval on '
             || 'December 23, 2020; the House reconsidered it on December 28 and the '
             || 'Senate on January 1, and the enrolled text prints both resolutions — '
             || '"Resolved, That the said bill do pass, two-thirds of the House of '
             || 'Representatives agreeing to pass the same" and "Resolved, That the '
             || 'said bill do pass, two-thirds of the Senators present having agreed '
             || 'to pass the same". Its LEGISLATIVE HISTORY block names the December '
             || '23 veto message, the December 28 House reconsideration and the '
             || 'January 1 Senate reconsideration. The measure became Public Law '
             || '116-283, approved January 1, 2021, at 134 Stat. 3388. One document '
             || 'is cited here rather than two because this one establishes both '
             || 'facts the standing rests on — that the Senate acted and that the '
             || 'measure became law; the Senate''s own record of the question is '
             || 'named in _verificationPass.wave9. READ THIS EXACTLY AS NARROWLY AS '
             || 'IT IS WRITTEN. It states what Congress did with the returned bill '
             || 'and what became of the measure. It is not a court holding anything '
             || 'unlawful, it is not a judgment about the Act or about the reasons '
             || 'the veto gave, and it is not a win or a loss on the subject of the '
             || 'Act — Axis A already reports the direction of the act, and this axis '
             || 'reports only what became of it. It says nothing about any challenge '
             || 'to the measure.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'overridden'
                            AND effective_at = TIMESTAMPTZ '2021-01-01T00:00:00Z');
    END IF;
  END IF;

END $$;
