-- ─────────────────────────────────────────────────────────────────────────────
-- ✒️ Executive Enactment Record — wave 10: the taxonomy unlock
-- ─────────────────────────────────────────────────────────────────────────────
-- Rolls forward from 20260807000000_seed_exec_actions_wave1.sql,
-- 20260808000000_seed_exec_actions_wave2.sql,
-- 20260824000000_seed_exec_actions_wave3.sql,
-- 20260826000000_seed_exec_actions_wave4.sql,
-- 20260828000000_seed_exec_actions_wave5.sql,
-- 20260829000000_seed_exec_actions_wave6.sql,
-- 20260830000000_seed_exec_actions_wave7.sql,
-- 20260831000000_seed_exec_actions_wave8.sql and
-- 20260901000000_seed_exec_actions_wave9.sql. Changes NO schema and edits no
-- applied migration: it inserts into vr_measures, vr_measure_issues, vr_positions
-- and vr_exec_action_status only, every insert is guarded, and re-applying is a
-- no-op.
--
-- Curated source of truth: db/exec-action-seed.json. scripts/test-exec-seed.mjs
-- reads waves 1 through 10 together and asserts that every citation, date and
-- issue key in that file appears in one of them.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHY THIS WAVE EXISTS
-- ─────────────────────────────────────────────────────────────────────────────
-- Wave 3 added coverage. Wave 6 added balance. Wave 7 added a term. Wave 8 added
-- recency. Wave 9 added a standing token. This one adds a WORD.
--
-- Wave 7 reviewed Executive Order 13957 — Schedule F — and refused to file it, and
-- wrote down why in its own header: there was no honest issue key for civil-service
-- or executive-branch personnel control, so the document had nowhere to land, and
-- the fix was an issue key rather than a mapping. That was the correct call and it
-- left a hole with a specific shape. The record could not test this posture even
-- though the formal actions plainly existed and were plainly sourceable, because
-- the vocabulary had no word for what they do.
--
-- The near-misses were wrong in specific ways, and it is worth writing them down
-- because the next person will be tempted by the same ones:
--   cut_spending      is a claim about money. A reclassification order contains no
--                     spending direction at all. EO 14410 in fact directs agencies
--                     to set money aside. Filing it as a spending action to get a
--                     score would be the exact stretch this pass was told to avoid.
--   gov_waste,        are wide enough to absorb anything, and a key that can absorb
--   reform_balance    a reclassification order can absorb every executive action
--                     ever signed. The moment they do, they stop meaning anything.
--   checks_balances   is closer, and section 1 of EO 14171 is written in Article II
--                     terms that would support it on their face. But that key on
--                     this profile is about war powers, the purse and oversight
--                     BETWEEN the branches. These orders are the executive branch
--                     acting on its own workforce. Same core issue, different
--                     question — which is why the new key is bundled INTO
--                     checks_and_balances rather than filed under checks_balances.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- THE KEY — civil_service_control, "Control of the Civil Service"
-- ─────────────────────────────────────────────────────────────────────────────
-- Defined in ISSUE_MAP in alignment-tool.js, regenerated into db/issue-keys.json
-- by scripts/gen-issue-keys.mjs (110 keys → 111). Scoped to ONE mechanism, written
-- out in the comment above the entry so it cannot drift into "federal workforce"
-- generally:
--   IN   an instrument that creates, restores, expands or restricts an at-will /
--        excepted / policy-influencing personnel CATEGORY, or that changes the
--        civil-service protections attached to one.
--   OUT  agency reorganisations with no classification core; headcount cuts and
--        reductions in force; hiring-process reform, including probationary
--        periods; federal-sector collective bargaining and union time; and
--        rhetoric with no formal mechanism behind it.
--
-- Bundled into the EXISTING checks_and_balances core issue — no fourteenth core
-- issue — so it inherits that issue's slate through issue-colors.js's leaf-key
-- resolution and no palette entry was added. It carries NO `lean`, on the
-- checks_balances precedent: _alignApplyLean multiplies a lean into every Alignment
-- score, so adding one would be a scoring change and this is a taxonomy pass.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT IS IN IT — five orders, two terms, one issue key each
-- ─────────────────────────────────────────────────────────────────────────────
--  A. Executive Order 13839 (2018-05-25) — removal and adverse-action procedure.
--                             In force 2018-06-01 → rescinded 2021-01-22.
--  B. Executive Order 13957 (2020-10-21) — Schedule F. THE DOCUMENT THIS PASS
--                             EXISTS FOR. Three standing rows: in force,
--                             rescinded, in force again on reinstatement.
--  C. Executive Order 14171 (2025-01-20) — the reinstatement, and the rename to
--                             Schedule Policy/Career. Challenged.
--  D. Executive Order 14317 (2025-07-17) — Schedule G.
--  E. Executive Order 14410 (2026-06-03) — the transfer of the Appendix positions
--                             into Schedule Policy/Career. Challenged.
--
-- Every one is an executive order, which is a sole-authorship class: the position
-- rows below name one politician and no roll-call member is touched by any of them.
-- Every one is mapped to civil_service_control and to nothing else — see the
-- _issuesNote on each row in the seed for the second mappings that were available
-- and declined.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- THE KEY SHIPS ACTION-ONLY, AND THAT IS STATED RATHER THAN HIDDEN
-- ─────────────────────────────────────────────────────────────────────────────
-- window.ISSUE_STANCE_DATA carries 26 stances for this figure and not one concerns
-- the civil service. So Axis A resolves all five of these actions to
-- `acted_no_stance` — coverage, which the integrity read does not move on. The key
-- lights up the formal record and does not light up the score, and that is the
-- honest outcome rather than a shortfall.
--
-- The two alternatives were both refused. Writing a stance FROM these orders and
-- then testing the orders against it is precisely the circularity _circularityRule
-- exists to stop. Re-keying an existing spending or government-reform stance onto
-- this key is the same stretch the key was created to avoid, wearing a different
-- hat. If an independent stance on the civil service is ever documented from a
-- source that is not one of these five orders, the key becomes testable with no
-- further work here.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- THE LITIGATION CHECK — done BEFORE the standings were written
-- ─────────────────────────────────────────────────────────────────────────────
-- Wave 9 recorded the cost of the opposite habit: EO 14399 had been filed in force
-- on the register alone, with a note saying no litigation was on file, and
-- litigation was on file. So this pass searched first and wrote second.
--
-- The published-opinion corpus returns nothing for "Executive Order 14171" or for
-- "Schedule Policy/Career" — no court has written on either. The docket corpus
-- returns National Treasury Employees Union v. Trump, No. 1:25-cv-00170-JMC
-- (D.D.C.), opened January 20, 2025 — the day EO 14171 was signed — not terminated,
-- newest entry August 6, 2026. Its operative pleading is an amended complaint filed
-- June 17, 2026, two weeks after EO 14410, downloaded and read in full: 33 pages,
-- defining "the Policy/Career Orders" as EO 14171 and EO 14410 together and asking
-- the court to hold both unlawful and ultra vires.
--
-- So those two carry `challenged_unverified` dated to that pleading. EO 13957 does
-- NOT: the same complaint recites it as history and asks for no relief against it,
-- and manufacturing a challenge to a document nobody has challenged would be the
-- mirror of the wave-9 error rather than a correction of it.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT WAS REVIEWED AND LEFT OUT
-- ─────────────────────────────────────────────────────────────────────────────
-- EO 13836, EO 13837, EO 14251  federal-sector bargaining and official time —
--                               labour relations under a different chapter of
--                               title 5, not classification.
-- EO 14170, EO 14356            hiring-process reform, no classification core.
-- EO 14210, EO 14217            reductions in force and bureaucracy reduction —
--                               headcount, not protections.
-- EO 14215                      presidential supervision of independent agencies
--                               and OIRA review — that is checks_balances.
-- EO 14284                      probationary periods. The closest call: it creates
--                               a Civil Service Rule XI under which an appointment
--                               is not final without affirmative certification. Out
--                               because it moves no position between services — it
--                               changes when an appointment completes, and EO 13839
--                               section 2(i) itself calls the probationary period
--                               "the final step in the hiring process of a new
--                               employee". 'probationary period' was removed from
--                               the key's keyword list in the same edit, so the
--                               keywords stop advertising a scope the key rejects.
-- EO 13843                      Schedule E for administrative law judges. It does
--                               except a category, so it is in scope — but its
--                               stated rationale is Appointments Clause compliance
--                               after Lucia v. SEC and it leaves 5 U.S.C. 7521
--                               removal protections untouched, so reading it as an
--                               expansion of political control requires an
--                               inference the text does not carry. Fail closed.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- THE APPEND-ONLY RULE, unchanged
-- ─────────────────────────────────────────────────────────────────────────────
-- No UPDATE, no DELETE, no ALTER. EO 13957's three standing rows are three INSERTs
-- in date order, not one row rewritten twice: a standing that was later undone
-- still happened, and the log is what makes that visible. standingOf() takes the
-- latest row by effective_at, so the reinstatement is what renders.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  m_13839    integer;
  m_13957    integer;
  m_14171    integer;
  m_14317    integer;
  m_14410    integer;
  pos        integer;
  u          text;
  c          text;
BEGIN

  -- The amended complaint behind both `challenged_unverified` rows below. One
  -- document, two orders: it names EO 14171 and EO 14410 together as "the
  -- Policy/Career Orders" and asks for relief against both.
  c := 'https://storage.courtlistener.com/recap/gov.uscourts.dcd.276604/gov.uscourts.dcd.276604.30.0.pdf';

  -- ═══════════════════════════════════════════════════════════════════════════
  -- A. Executive Order 13839 — Promoting Accountability and Streamlining Removal
  --    Procedures Consistent With Merit System Principles
  --
  --    THE OLDEST DOCUMENT UNDER THE NEW KEY, and the one that shows the key is
  --    not a synonym for Schedule F. It creates no schedule and moves no position
  --    between services. What it does is narrow the removal and adverse-action
  --    procedures attached to career executive-branch employees, which is the
  --    second limb of the key's scope note and the reason that limb is written
  --    the way it is.
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.federalregister.gov/documents/2018/06/01/2018-11939/promoting-accountability-and-streamlining-removal-procedures-consistent-with-merit-system-principles';

  SELECT id INTO m_13839
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 13839'
   LIMIT 1;

  IF m_13839 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 13839',
       'Promoting Accountability and Streamlining Removal Procedures Consistent With Merit System Principles',
       'Narrowing federal removal and adverse-action procedure',
       'Signed 2018-05-25 and published at 83 FR 25343 on 2018-06-01. Section 2 '
       || 'directs agencies to limit the opportunity period to demonstrate '
       || 'acceptable performance under 5 U.S.C. 4302(c)(6), states that '
       || 'supervisors need not use progressive discipline, and states that '
       || 'agencies should not require suspension before proposing removal. '
       || 'Section 4 makes those principles binding on agency agreements and '
       || 'holds the demonstration period to 30 days absent an agency '
       || 'determination that longer is necessary. Section 3 directs agency '
       || 'heads to endeavor to exclude removal disputes from grievance '
       || 'procedures negotiated under 5 U.S.C. 7121. Revoked by Executive '
       || 'Order 14003 of January 22, 2021.',
       NULL, TIMESTAMPTZ '2018-05-25T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register',
       '{"executiveOrder":"13839","frCitation":"83 FR 25343","frDocumentNumber":"2018-11939"}'::jsonb)
    RETURNING id INTO m_13839;
    RAISE NOTICE 'created vr_measures Executive Order 13839 as id %', m_13839;
  END IF;

  IF m_13839 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_13839, 'civil_service_control', 75, true, 'yea_supports',
       'Section 2 sets the principles: agencies should limit the opportunity '
       || 'period to demonstrate acceptable performance under 5 U.S.C. '
       || '4302(c)(6) to the time that provides sufficient opportunity, '
       || 'supervisors and deciding officials should not be required to use '
       || 'progressive discipline, and agencies should not require suspension '
       || 'of an employee before proposing to remove that employee. Section 4 '
       || 'then makes those principles binding: no agency shall make an '
       || 'agreement, including a collective bargaining agreement, that limits '
       || 'its discretion to employ chapter 75 procedures to address '
       || 'unacceptable performance, that requires chapter 43 procedures before '
       || 'removing an employee for unacceptable performance, or that limits '
       || 'its discretion to remove an employee from Federal service without '
       || 'first engaging in progressive discipline, and section 4(c) holds the '
       || 'demonstration period to 30 days except where the agency determines in '
       || 'its sole and exclusive discretion that longer is necessary. Section 3 '
       || 'directs agency heads to endeavor to exclude from grievance procedures '
       || 'negotiated under 5 U.S.C. 7121 any dispute concerning decisions to '
       || 'remove an employee from Federal service.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_13839, 'trump', 'issued', true, TIMESTAMPTZ '2018-05-25T00:00:00Z', u,
       'Signed Executive Order 13839 on 2018-05-25. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_13839 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2018-06-01T00:00:00Z',
             'Signed by the President and published in the Federal Register',
             'Federal Register — Executive Order 13839 document record',
             u,
             'Signed May 25, 2018 and published June 1, 2018 at 83 FR 25343. '
             || 'Unrevoked as of that date on the register''s own disposition '
             || 'record. This is a statement about the register''s record of '
             || 'presidential action and is not a statement about any challenge '
             || 'to the order.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2018-06-01T00:00:00Z');

      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'rescinded', TIMESTAMPTZ '2021-01-22T00:00:00Z',
             'Executive Order 14003 of January 22, 2021, signed by the succeeding President',
             'Federal Register — Executive Order 13839 document record, disposition notes',
             u,
             'The disposition note on the register''s own record for this '
             || 'document reads, in full: ''Revoked by: EO 14003 of January 22, '
             || '2021''. The order no longer stands, and the register records no '
             || 'later reinstatement of it — which is the whole difference '
             || 'between this document and Executive Order 13957, whose record '
             || 'carries one, and the reason the two first-term orders in this '
             || 'wave are filed with opposite current standings. Revocation by a '
             || 'later President is a presidential act, so this row is not a '
             || 'statement about any challenge to the order and no court is '
             || 'claimed to have reached it.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'rescinded'
                            AND effective_at = TIMESTAMPTZ '2021-01-22T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- B. Executive Order 13957 — Creating Schedule F in the Excepted Service
  --
  --    THE DOCUMENT THIS WHOLE PASS EXISTS FOR. Its register record is the
  --    sharpest term-contrast fact anywhere in the corpus: revoked by the
  --    succeeding President and reinstated on the first day of the next term.
  --    Three status rows, because no single row can carry that.
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.federalregister.gov/documents/2020/10/26/2020-23780/creating-schedule-f-in-the-excepted-service';

  SELECT id INTO m_13957
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 13957'
   LIMIT 1;

  IF m_13957 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 13957',
       'Creating Schedule F in the Excepted Service',
       'Schedule F for career policy-influencing positions',
       'Signed 2020-10-21 and published at 85 FR 67631 on 2020-10-26. Section 3 '
       || 'directs that appointments to positions of a confidential, '
       || 'policy-determining, policy-making or policy-advocating character not '
       || 'normally subject to change as a result of a Presidential transition '
       || 'shall be made under Schedule F of the excepted service. Section 4 '
       || 'amends 5 CFR 6.2 to add the schedule and 5 CFR 6.4 so that, except as '
       || 'required by statute, the Civil Service Rules and Regulations shall '
       || 'not apply to removals from positions listed in Schedules A, C, D, E '
       || 'or F. Revoked by Executive Order 14003 of January 22, 2021 and '
       || 'reinstated by Executive Order 14171 of January 20, 2025.',
       NULL, TIMESTAMPTZ '2020-10-21T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register',
       '{"executiveOrder":"13957","frCitation":"85 FR 67631","frDocumentNumber":"2020-23780"}'::jsonb)
    RETURNING id INTO m_13957;
    RAISE NOTICE 'created vr_measures Executive Order 13957 as id %', m_13957;
  END IF;

  IF m_13957 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_13957, 'civil_service_control', 95, true, 'yea_supports',
       'Section 3 directs that appointments to positions of a confidential, '
       || 'policy-determining, policy-making or policy-advocating character that '
       || 'are not normally subject to change as a result of a Presidential '
       || 'transition shall be made under Schedule F of the excepted service. '
       || 'Section 4(a)(i) amends 5 CFR 6.2 to add that schedule to the list of '
       || 'positions OPM excepts from the competitive service, and section '
       || '4(a)(ii) amends 5 CFR 6.4 to read that, except as required by '
       || 'statute, the Civil Service Rules and Regulations shall not apply to '
       || 'removals from positions listed in Schedules A, C, D, E, or F. '
       || 'Section 1 states the finding it rests on: that conditions of good '
       || 'administration make necessary an exception to the competitive hiring '
       || 'rules and examinations for career positions of that character, and '
       || 'similarly make necessary excepting such positions from the adverse '
       || 'action procedures set forth in chapter 75 of title 5.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_13957, 'trump', 'issued', true, TIMESTAMPTZ '2020-10-21T00:00:00Z', u,
       'Signed Executive Order 13957 on 2020-10-21. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_13957 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2020-10-26T00:00:00Z',
             'Signed by the President and published in the Federal Register',
             'Federal Register — Executive Order 13957 document record',
             u,
             'Signed October 21, 2020 and published October 26, 2020 at 85 FR '
             || '67631. Unrevoked as of that date on the register''s own '
             || 'disposition record. This is a statement about the register''s '
             || 'record of presidential action and is not a statement about any '
             || 'challenge to the order.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2020-10-26T00:00:00Z');

      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'rescinded', TIMESTAMPTZ '2021-01-22T00:00:00Z',
             'Executive Order 14003 of January 22, 2021, signed by the succeeding President',
             'Federal Register — Executive Order 13957 document record, disposition notes',
             u,
             'The first line of the disposition note on the register''s own '
             || 'record for this document reads: ''Revoked by: EO 14003, January '
             || '22, 2021''. Ninety-three days after it was published the order '
             || 'no longer stood, and for the four years that followed this was '
             || 'where its history ended. It is filed as its own row rather than '
             || 'folded into the row after it because a standing that was later '
             || 'undone still happened, and the append-only log is what makes '
             || 'that visible. Revocation by a later President is a presidential '
             || 'act, so this row is not a statement about any challenge to the '
             || 'order and no court is claimed to have reached it.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'rescinded'
                            AND effective_at = TIMESTAMPTZ '2021-01-22T00:00:00Z');

      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2025-01-20T00:00:00Z',
             'Executive Order 14171 of January 20, 2025, which reinstated it with full force and effect',
             'Federal Register — Executive Order 13957 document record, disposition notes',
             u,
             'THE CURRENT STANDING. The disposition note on the register''s own '
             || 'record for this document carries three lines: ''Revoked by: EO '
             || '14003, January 22, 2021'', ''Reinstated by: EO 14171, January '
             || '20, 2025'' and ''Amended by: EO 14171, January 21, 2025; EO '
             || '14410, June 3, 2026''. Section 2 of Executive Order 14171 reads '
             || 'that this order ''is hereby immediately reinstated with full '
             || 'force and effect, subject to the amendments described in '
             || 'section 3 of this order; provided that the date of this order '
             || 'shall be treated as the date of Executive Order 13957''. A '
             || 'first-term order struck out by the succeeding President and '
             || 'restored on the first day of the next term is the reason the '
             || 'term filter exists, and it is the reason this document was '
             || 'worth an issue key. READ THE LIMIT: reinstatement by a later '
             || 'President is a presidential act, so this row is not a statement '
             || 'about any challenge to the order and no court is claimed to '
             || 'have reached it. There is litigation over this policy and it is '
             || 'disclosed where it belongs — the union''s amended complaint '
             || 'names the 2025 order and the 2026 order as the instruments it '
             || 'asks the court to hold unlawful, and it recites this document '
             || 'as history, so the challenged standing sits on those two rows '
             || 'and not on this one.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2025-01-20T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- C. Executive Order 14171 — Restoring Accountability to Policy-Influencing
  --    Positions Within the Federal Workforce
  --
  --    The restoration wave 7 could name but not file. It is also the row that
  --    makes the key falsifiable rather than decorative: it is one of the two
  --    documents a court is currently being asked to strike, so the key ships
  --    with a contested standing on its heaviest action rather than a clean
  --    sweep of in-force rows.
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.federalregister.gov/documents/2025/01/31/2025-02095/restoring-accountability-to-policy-influencing-positions-within-the-federal-workforce';

  SELECT id INTO m_14171
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14171'
   LIMIT 1;

  IF m_14171 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 14171',
       'Restoring Accountability to Policy-Influencing Positions Within the Federal Workforce',
       'Reinstating Schedule F as Schedule Policy/Career',
       'Signed 2025-01-20 and published at 90 FR 8625 on 2025-01-31. Section 2 '
       || 'reinstates Executive Order 13957 with full force and effect. Section '
       || '3 renames the schedule Policy/Career, extends the finding of '
       || 'necessity to the competitive service as well as the adverse action '
       || 'procedures, and adds a section 6(b) providing that employees in such '
       || 'positions are required to faithfully implement administration '
       || 'policies and that failure to do so is grounds for dismissal. Section '
       || '4 directs OPM to rescind the changes made by the final rule of April '
       || '9, 2024, 89 Fed. Reg. 24982. Section 6 revokes Executive Order 14003.',
       NULL, TIMESTAMPTZ '2025-01-20T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register',
       '{"executiveOrder":"14171","frCitation":"90 FR 8625","frDocumentNumber":"2025-02095"}'::jsonb)
    RETURNING id INTO m_14171;
    RAISE NOTICE 'created vr_measures Executive Order 14171 as id %', m_14171;
  END IF;

  IF m_14171 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_14171, 'civil_service_control', 100, true, 'yea_supports',
       'Section 2 reinstates Executive Order 13957 immediately and with full '
       || 'force and effect, and provides that the date of this order shall be '
       || 'treated as the date of that one. Section 3 amends it: subsection (a) '
       || 'replaces the letter F throughout, where used to designate an excepted '
       || 'service schedule, with the words Policy/Career; subsection (b)(ii) '
       || 'inserts the words competitive service and the immediately before the '
       || 'words adverse action procedures, so the finding of necessity reaches '
       || 'both; subsection (c) narrows the schedule''s definition to career '
       || 'positions; and subsection (f)(ii) adds a new section 6(b) providing '
       || 'that employees in or applicants for Schedule Policy/Career positions '
       || 'are required to faithfully implement administration policies to the '
       || 'best of their ability and that failure to do so is grounds for '
       || 'dismissal. Section 4 directs the Director of the Office of Personnel '
       || 'Management to amend the Civil Service Regulations to rescind the '
       || 'changes made by the final rule of April 9, 2024, 89 Fed. Reg. 24982, '
       || 'that impede the purposes of Executive Order 13957, and holds 5 CFR '
       || 'part 302 subpart F and 5 CFR 210.102(b)(3) and (4) inoperative until '
       || 'that is done. Section 6 revokes Executive Order 14003, the order that '
       || 'had revoked Executive Order 13957.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_14171, 'trump', 'issued', true, TIMESTAMPTZ '2025-01-20T00:00:00Z', u,
       'Signed Executive Order 14171 on 2025-01-20. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_14171 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2025-01-31T00:00:00Z',
             'Signed by the President and published in the Federal Register',
             'Federal Register — Executive Order 14171 document record',
             u,
             'Signed January 20, 2025 and published January 31, 2025 at 90 FR '
             || '8625. The disposition note on the register''s own record for '
             || 'this document reads ''Reinstates: EO 13957, October 21, 2020'', '
             || '''Revokes: EO 14003, January 22, 2021'' and ''Amended by: EO '
             || '14410, June 3, 2026'' — it has not been revoked or superseded '
             || 'by any later presidential action. This is a statement about the '
             || 'register''s record of presidential action and is not a '
             || 'statement about any challenge to the order.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2025-01-31T00:00:00Z');

      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'challenged_unverified', TIMESTAMPTZ '2026-06-17T00:00:00Z',
             'Challenge pending — U.S. District Court for the District of Columbia '
             || '(National Treasury Employees Union v. Trump, No. 1:25-cv-00170-JMC)',
             'D.D.C. — National Treasury Employees Union v. Trump, No. '
             || '1:25-cv-00170-JMC, Amended Complaint for Declaratory and '
             || 'Injunctive Relief (ECF 30, filed June 17, 2026)',
             c,
             'THE CURRENT STANDING, and it is a statement about this file rather '
             || 'than about the order. The amended complaint was read in full in '
             || 'this pass. Its opening paragraph names this document and Counts '
             || '1 and 2 ask the court to hold the initial Policy/Career Order '
             || 'and the Implementing Policy/Career Order unlawful and ultra '
             || 'vires, on the grounds that they exceed the authority 5 U.S.C. '
             || '3302 gives the President and that they strip accrued and vested '
             || 'rights. The docket was opened on January 20, 2025, the day the '
             || 'order was signed; it is not terminated; its newest entry when '
             || 'read here was dated August 6, 2026; and it carries no ruling on '
             || 'this order. A search of published opinions for this order and '
             || 'for Schedule Policy/Career returned no ruling either. So no '
             || 'court has stopped this order and no court has upheld it, and '
             || '''in force'' would assert the second of those. Dated to the '
             || 'operative amended complaint, the document actually read, rather '
             || 'than to the docket''s opening date.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'challenged_unverified'
                            AND effective_at = TIMESTAMPTZ '2026-06-17T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- D. Executive Order 14317 — Creating Schedule G in the Excepted Service
  --
  --    The lightest row in the wave, filed because the key's scope note says
  --    "creates an at-will / excepted / policy-influencing personnel category"
  --    and this order plainly does. It is also the honest counterweight to the
  --    Schedule Policy/Career documents: the positions it reaches are noncareer
  --    ones that turn over at a transition in any event, so its weight sits well
  --    below theirs rather than at parity.
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.federalregister.gov/documents/2025/07/23/2025-13925/creating-schedule-g-in-the-excepted-service';

  SELECT id INTO m_14317
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14317'
   LIMIT 1;

  IF m_14317 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 14317',
       'Creating Schedule G in the Excepted Service',
       'Schedule G for noncareer policy-advocating positions',
       'Signed 2025-07-17 and published at 90 FR 34753 on 2025-07-23. Section 1 '
       || 'states that no excepted service schedule covers noncareer positions '
       || 'of a policy-making or policy-advocating character. Section 3 directs '
       || 'that appointments to such positions, where normally subject to change '
       || 'as a result of a Presidential transition, shall be made under '
       || 'Schedule G. Section 4 amends 5 CFR 6.2 to add the schedule and 5 CFR '
       || '6.4 so that the Civil Service Rules and Regulations shall not apply '
       || 'to removals from positions listed in it.',
       NULL, TIMESTAMPTZ '2025-07-17T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register',
       '{"executiveOrder":"14317","frCitation":"90 FR 34753","frDocumentNumber":"2025-13925"}'::jsonb)
    RETURNING id INTO m_14317;
    RAISE NOTICE 'created vr_measures Executive Order 14317 as id %', m_14317;
  END IF;

  IF m_14317 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_14317, 'civil_service_control', 70, true, 'yea_supports',
       'Section 1 states the gap: Schedule C covers noncareer excepted service '
       || 'positions of a confidential or policy-determining character and '
       || 'Schedule Policy/Career covers career positions of that character, but '
       || 'there is no excepted service schedule for noncareer positions of a '
       || 'policy-making or policy-advocating character. Section 3 directs that '
       || 'appointments to such positions, where they are normally subject to '
       || 'change as a result of a Presidential transition, shall be made under '
       || 'Schedule G. Section 4(a) amends 5 CFR 6.2 to add Schedule G to the '
       || 'schedules OPM excepts from the competitive service, and section 4(b) '
       || 'amends 5 CFR 6.4 so that the Civil Service Rules and Regulations '
       || 'shall not apply to removals from positions listed in Schedule G '
       || 'alongside Schedules A, C, D, E and Policy/Career. Section 5(b) '
       || 'directs the Secretary of Veterans Affairs, in making Schedule G '
       || 'appointments, to consider whether prospective appointees would be '
       || 'suitable exponents of the President''s policies while not taking '
       || 'political affiliation or political activity into account.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_14317, 'trump', 'issued', true, TIMESTAMPTZ '2025-07-17T00:00:00Z', u,
       'Signed Executive Order 14317 on 2025-07-17. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_14317 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2025-07-23T00:00:00Z',
             'Signed by the President and published in the Federal Register',
             'Federal Register — Executive Order 14317 document record',
             u,
             'Signed July 17, 2025 and published July 23, 2025 at 90 FR 34753. '
             || 'The register''s own record for this document carries no '
             || 'disposition note at all: no later presidential action has '
             || 'revoked, amended, reinstated or superseded it. This is a '
             || 'statement about the register''s record of presidential action '
             || 'and is not a statement about any challenge to the order.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2025-07-23T00:00:00Z');
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- E. Executive Order 14410 — Implementing Schedule Policy/Career in the
  --    Excepted Service
  --
  --    The newest document under this key and the one with actual effect on
  --    named positions: the orders before it built the category, and this one
  --    fills it. It also moves the lane's newest civil-service action to June
  --    2026, three months before this pass rather than six years before it.
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.federalregister.gov/documents/2026/06/10/2026-11594/implementing-schedule-policycareer-in-the-excepted-service';

  SELECT id INTO m_14410
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14410'
   LIMIT 1;

  IF m_14410 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 14410',
       'Implementing Schedule Policy/Career in the Excepted Service',
       'Placing the Appendix positions in Schedule Policy/Career',
       'Signed 2026-06-03 and published at 91 FR 34893 on 2026-06-10. Section 5 '
       || 'determines that the positions set forth in the Appendix have a '
       || 'confidential, policy-determining, policy-making or policy-advocating '
       || 'character, places them in Schedule Policy/Career, and gives each '
       || 'agency head seven days to notify the officers and employees '
       || 'encumbering them. Section 2 amends Civil Service Rules I, III, VI and '
       || 'XI to carry the transfer, including that appointees to Schedules C, '
       || 'E, Policy/Career and G are not subject to trial periods. Section 4 '
       || 'directs each agency with Schedule Policy/Career employees to set '
       || 'aside a separate bonus pool.',
       NULL, TIMESTAMPTZ '2026-06-03T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register',
       '{"executiveOrder":"14410","frCitation":"91 FR 34893","frDocumentNumber":"2026-11594"}'::jsonb)
    RETURNING id INTO m_14410;
    RAISE NOTICE 'created vr_measures Executive Order 14410 as id %', m_14410;
  END IF;

  IF m_14410 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_14410, 'civil_service_control', 95, true, 'yea_supports',
       'Section 5 is the operative part. Subsection (a) determines that the '
       || 'positions set forth in the Appendix have a confidential, '
       || 'policy-determining, policy-making or policy-advocating character and '
       || 'that it is necessary and warranted by conditions of good '
       || 'administration to except them from the competitive service; '
       || 'subsection (b) places those positions in Schedule Policy/Career; '
       || 'subsection (c) gives each agency head seven days to notify the '
       || 'officers and employees encumbering them and to conform agency records '
       || 'and practices. The Appendix runs from page 34895 to page 35124 of the '
       || 'published document. Section 2 amends the Civil Service Rules to carry '
       || 'the transfer: Rule I, so that an employee in the competitive service '
       || 'with competitive status when the position is first listed under '
       || 'Schedule Policy/Career is in the excepted service but retains that '
       || 'status; Rule XI, so that individuals appointed to positions in '
       || 'Schedule C, Schedule E, Schedule Policy/Career and Schedule G are not '
       || 'subject to trial periods; and 5 CFR 550.704(b), by adding a new '
       || 'subparagraph (6) reaching an employee who occupies a Schedule '
       || 'Policy/Career position where the agency identifies unacceptable '
       || 'performance or misconduct as the basis for separation in a written '
       || 'notice. Section 3(a) further amends Executive Order 13957 as amended '
       || 'by Executive Order 14171. Section 4 directs each agency with Schedule '
       || 'Policy/Career employees to set aside a separate bonus pool.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_14410, 'trump', 'issued', true, TIMESTAMPTZ '2026-06-03T00:00:00Z', u,
       'Signed Executive Order 14410 on 2026-06-03. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_14410 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2026-06-10T00:00:00Z',
             'Signed by the President and published in the Federal Register',
             'Federal Register — Executive Order 14410 document record',
             u,
             'Signed June 3, 2026 and published June 10, 2026 at 91 FR 34893. '
             || 'The disposition note on the register''s own record for this '
             || 'document reads ''Amends: EO 13562, December 27, 2010; EO 13957, '
             || 'October 21, 2020; EO 14171, January 20, 2025; EO 14217, '
             || 'February 19, 2025'' — it names what this order changed and '
             || 'records nothing done to it in return. This is a statement about '
             || 'the register''s record of presidential action and is not a '
             || 'statement about any challenge to the order.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2026-06-10T00:00:00Z');

      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'challenged_unverified', TIMESTAMPTZ '2026-06-17T00:00:00Z',
             'Challenge pending — U.S. District Court for the District of Columbia '
             || '(National Treasury Employees Union v. Trump, No. 1:25-cv-00170-JMC)',
             'D.D.C. — National Treasury Employees Union v. Trump, No. '
             || '1:25-cv-00170-JMC, Amended Complaint for Declaratory and '
             || 'Injunctive Relief (ECF 30, filed June 17, 2026)',
             c,
             'THE CURRENT STANDING, fourteen days after the order was signed. '
             || 'The amended complaint, read in full in this pass, was filed two '
             || 'weeks after this document issued and exists in its amended form '
             || 'because of it: its paragraph 3 recites that the June 3, 2026 '
             || 'order immediately placed thousands of positions into Schedule '
             || 'Policy/Career and directed agencies to notify affected '
             || 'employees within seven days. Counts 1 and 2 name the '
             || 'Implementing Policy/Career Order alongside the 2025 order and '
             || 'ask the court to hold both unlawful and ultra vires. The '
             || 'docket, No. 1:25-cv-00170-JMC in the District of Columbia, is '
             || 'not terminated and its newest entry when read here was dated '
             || 'August 6, 2026; it carries no ruling on this order, and a '
             || 'search of published opinions for Schedule Policy/Career '
             || 'returned no ruling either. So no court has stopped this order '
             || 'and no court has upheld it. Filing it as in force would have '
             || 'been the easier call and the wrong one: the challenge was '
             || 'already on file when this pass read the register.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'challenged_unverified'
                            AND effective_at = TIMESTAMPTZ '2026-06-17T00:00:00Z');
    END IF;
  END IF;

END $$;
