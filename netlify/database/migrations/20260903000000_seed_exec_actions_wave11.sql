-- ─────────────────────────────────────────────────────────────────────────────
-- ✒️ Executive Enactment Record — wave 11: depth on the thin confident rows
-- ─────────────────────────────────────────────────────────────────────────────
-- Rolls forward from 20260807000000_seed_exec_actions_wave1.sql,
-- 20260808000000_seed_exec_actions_wave2.sql,
-- 20260824000000_seed_exec_actions_wave3.sql,
-- 20260826000000_seed_exec_actions_wave4.sql,
-- 20260828000000_seed_exec_actions_wave5.sql,
-- 20260829000000_seed_exec_actions_wave6.sql,
-- 20260830000000_seed_exec_actions_wave7.sql,
-- 20260831000000_seed_exec_actions_wave8.sql,
-- 20260901000000_seed_exec_actions_wave9.sql and
-- 20260902000000_seed_exec_actions_wave10.sql. Changes NO schema and edits no
-- applied migration: it inserts into vr_measures, vr_measure_issues, vr_positions
-- and vr_exec_action_status only, every insert is guarded, and re-applying is a
-- no-op.
--
-- Curated source of truth: db/exec-action-seed.json. scripts/test-exec-seed.mjs
-- reads waves 1 through 11 together and asserts that every citation, date and
-- issue key in that file appears in one of them.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHY THIS WAVE EXISTS
-- ─────────────────────────────────────────────────────────────────────────────
-- A coverage audit found eight presidential issue rows asserting a FULL-CONFIDENCE
-- direction match on one or two formal instruments. One instrument is not a record;
-- it is an anecdote with a citation. The rule this wave was written against is
-- that a row asserting full confidence must rest on at least three instruments or
-- step its presentation down — and the way to satisfy it is to go and read the
-- other instruments, not to lower the bar.
--
-- Fifteen documents are added here and three second mappings are written onto
-- documents that were already on file. Every one was read from its own primary
-- text in this pass: the Federal Register API document record for each order and
-- the memorandum, GPO's published enrolled text for the public law.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT IS IN IT
-- ─────────────────────────────────────────────────────────────────────────────
-- Term 45 — seven documents, none of which was on file before this wave:
--   EO 13789 (2017-04-21)  tax regulations issued after 2016, reduced weight.
--   EO 13799 (2017-05-11)  the election-integrity commission. In force, then
--                          rescinded by EO 13820 of January 3, 2018.
--   EO 13813 (2017-10-12)  association and short-term health plans. In force,
--                          then rescinded by EO 14009 of January 28, 2021.
--   PL 115-97 (2017-12-22) the rate cuts. HELD CIRCULAR against the lower_taxes
--                          stance — see below.
--   EO 13877 (2019-06-24)  hospital price transparency. HELD CIRCULAR.
--   Memorandum, 85 FR 49587 (2020-08-08) the payroll-tax deferral.
--   EO 13951 (2020-09-24)  the America-First Healthcare Plan.
--
-- Term 47 — eight documents:
--   EO 14190 (2025-01-29)  K-12 funding and equity ideology — the schools half of
--                          end_dei, which the workforce orders do not reach.
--   EO 14193, EO 14194 (2025-02-01)  the northern- and southern-border duties.
--   EO 14228 (2025-03-03)  the increase in the China opioid rate.
--   EO 14245 (2025-03-24)  duties on purchasers of Venezuelan oil.
--   EO 14281 (2025-04-23)  disparate-impact liability.
--   EO 14358 (2025-11-04)  the China reciprocal rate suspended under a negotiated
--                          arrangement.
--   EO 14389 (2026-02-20)  the IEEPA duties ended.
--
-- Second mappings on documents already on file:
--   EO 14195  → tariffs_authority (opposes)
--   EO 14360  → cost_living (advances)
--   EO 14248  → states_federal_power (opposes)
--
-- ─────────────────────────────────────────────────────────────────────────────
-- COVERAGE OVER SELECTION — the two entries that cost this wave its verdicts
-- ─────────────────────────────────────────────────────────────────────────────
-- tariffs_china read one-directional before this wave and does not after it. The
-- documents that raise the China rate (EO 14195, EO 14228, EO 14257) and the two
-- that end or suspend it (EO 14358, EO 14389) were enumerated together, because a
-- rule that says "find the third instrument" and a rule that says "find the third
-- instrument that agrees" are not the same rule and only the first one is honest.
--
-- EO 14389 carries NO tariffs_authority mapping, and the omission is deliberate:
-- it ends the duties under the same IEEPA authority it never questions, keeps the
-- underlying emergencies alive and returns nothing to Congress. Reading it as
-- deference to Congress would have been the verdict-friendly answer to the one
-- issue where this record is most one-sided. The seed row records that reasoning
-- in _whyNoTariffsAuthorityMapping.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- TWO DOCUMENTS ARE FILED AND HELD CIRCULAR, ON PURPOSE
-- ─────────────────────────────────────────────────────────────────────────────
-- PL 115-97 and EO 13877 both carry circularWithStance on their mapped issue. The
-- stated position each would test is, in this profile, written from the document
-- itself — so scoring the document against it would be the record agreeing with
-- its own summary. consistency.js holds the pair rather than scoring it. They are
-- filed anyway because the formal record is a record: the documents exist, a
-- reader can see them, and the hold is disclosed rather than the row being empty.
-- Neither of them counts toward the three-instrument depth bar.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- ONE STANDING TOKEN IS USED IN A NEW WAY, AND IT IS WRITTEN DOWN
-- ─────────────────────────────────────────────────────────────────────────────
-- The payroll-tax memorandum is `expired` on a register_continuation basis. That
-- basis was created in wave 2 for the opposite case — a National Emergencies Act
-- declaration continued past its anniversary — and its own definition says the
-- question it answers is "has this lapsed" rather than "has this been revoked".
-- This is the same question with the other answer: section 2 of the memorandum
-- runs the deferral to a date it names, December 31, 2020, and the register
-- carries no continuation and no later instrument extending it.
--
-- The alternative was `in_force` on the strength of an absent revocation, which
-- asserts that a finished document is still running. The basis note in
-- db/exec-action-seed.json was extended in the same edit so the widening is in the
-- vocabulary rather than only in this comment.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- THE APPEND-ONLY RULE, unchanged
-- ─────────────────────────────────────────────────────────────────────────────
-- No UPDATE, no DELETE, no ALTER. EO 13799's and EO 13813's revocations are second
-- INSERTs after their in-force rows, not rewrites: a standing that was later undone
-- still happened, and the log is what makes that visible. standingOf() takes the
-- latest row by effective_at.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  m_eo13789      integer;
  m_eo13799      integer;
  m_eo13813      integer;
  m_pl115_97     integer;
  m_eo13877      integer;
  m_pm85fr49587  integer;
  m_eo13951      integer;
  m_eo14190      integer;
  m_eo14193      integer;
  m_eo14194      integer;
  m_eo14228      integer;
  m_eo14245      integer;
  m_eo14281      integer;
  m_eo14358      integer;
  m_eo14389      integer;
  m_eo14195      integer;
  m_eo14360      integer;
  m_eo14248      integer;
  pos            integer;
  u              text;
BEGIN

  -- =========================================================================
  -- Executive Order 13789 — Identifying and Reducing Tax Regulatory Burdens
  -- =========================================================================
  u := 'https://www.federalregister.gov/documents/2017/04/26/2017-08586/identifying-and-reducing-tax-regulatory-burdens';

  SELECT id INTO m_eo13789
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 13789'
   LIMIT 1;

  IF m_eo13789 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 13789',
       'Identifying and Reducing Tax Regulatory Burdens',
       'Review of tax regulations issued in 2016',
       'Signed 2017-04-21 and published at 82 FR 19317 on 2017-04-26. '
       || 'Section 2(a) directs the Secretary of the Treasury to review all '
       || 'significant tax regulations issued on or after January 1, 2016 '
       || 'and identify those that "impose an undue financial burden on '
       || 'United States taxpayers," "add undue complexity to the Federal '
       || 'tax laws," or "exceed the statutory authority of the Internal '
       || 'Revenue Service." Section 2(b) directs the Secretary to '
       || 'recommend specific mitigating actions and to "take appropriate '
       || 'steps to cause the effective date of such regulations to be '
       || 'delayed or suspended, to the extent permitted by law, and to '
       || 'modify or rescind such regulations as appropriate." Mapped at '
       || 'reduced weight because the chip is written about tax RATES and '
       || 'this order reaches only the regulations built on top of them; '
       || 'the `plain` line says so rather than borrowing the force of a '
       || 'rate cut.',
       NULL, TIMESTAMPTZ '2017-04-21T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register — Executive Order 13789, 82 FR 19317',
       '{"executiveOrder":"13789","frCitation":"82 FR 19317","frDocumentNumber":"2017-08586"}'::jsonb)
    RETURNING id INTO m_eo13789;
    RAISE NOTICE 'created vr_measures Executive Order 13789 as id %', m_eo13789;
  END IF;

  IF m_eo13789 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_eo13789, 'lower_taxes', 55, true, 'yea_supports',
       'Section 2(a) directs the Secretary of the Treasury to review all '
       || 'significant tax regulations issued on or after January 1, 2016 '
       || 'and identify those that "impose an undue financial burden on '
       || 'United States taxpayers," "add undue complexity to the Federal '
       || 'tax laws," or "exceed the statutory authority of the Internal '
       || 'Revenue Service." Section 2(b) directs the Secretary to '
       || 'recommend specific mitigating actions and to "take appropriate '
       || 'steps to cause the effective date of such regulations to be '
       || 'delayed or suspended, to the extent permitted by law, and to '
       || 'modify or rescind such regulations as appropriate." Mapped at '
       || 'reduced weight because the chip is written about tax RATES and '
       || 'this order reaches only the regulations built on top of them; '
       || 'the `plain` line says so rather than borrowing the force of a '
       || 'rate cut.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_eo13789, 'trump', 'issued', true, TIMESTAMPTZ '2017-04-21T00:00:00Z', u,
       'Signed Executive Order 13789 on 2017-04-21. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_eo13789 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2017-04-26T00:00:00Z',
             'Issued by the President and published in the Federal Register',
             'Federal Register — Executive Order 13789 document record, 82 FR '
             || '19317',
             u,
             'Signed April 21, 2017 and published April 26, 2017 at 82 FR '
             || '19317. The register’s disposition record for this document '
             || 'carries a single cross-reference, back to Executive Order 12866 '
             || 'of September 30, 1993, and no entry revoking or superseding it, '
             || 'so it stands as published. This is a statement about the '
             || 'register’s record of presidential action and is not a statement '
             || 'about any challenge to the order.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2017-04-26T00:00:00Z');

    END IF;
  END IF;

  -- =========================================================================
  -- Executive Order 13799 — Establishment of Presidential Advisory Commission on Election Integrity
  -- =========================================================================
  u := 'https://www.federalregister.gov/documents/2017/05/16/2017-10003/establishment-of-presidential-advisory-commission-on-election-integrity';

  SELECT id INTO m_eo13799
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 13799'
   LIMIT 1;

  IF m_eo13799 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 13799',
       'Establishment of Presidential Advisory Commission on Election '
       || 'Integrity',
       'Presidential Advisory Commission on Election Integrity',
       'Signed 2017-05-11 and published at 82 FR 22389 on 2017-05-16. '
       || 'Section 1 establishes the Presidential Advisory Commission on '
       || 'Election Integrity. Section 3 gives it the mission of studying '
       || '"the registration and voting processes used in Federal '
       || 'elections" and reporting on practices that enhance or undermine '
       || 'confidence in them and on "those vulnerabilities in voting '
       || 'systems and practices used for Federal elections that could lead '
       || 'to improper voter registrations and improper voting, including '
       || 'fraudulent voter registrations and fraudulent voting." Section 4 '
       || 'defines "improper voter registration" and "improper voting" in '
       || 'terms of legal eligibility. It is an advisory body, not a '
       || 'mandate, which is why this is mapped below the weight given to '
       || 'the orders that direct agencies to act.',
       NULL, TIMESTAMPTZ '2017-05-11T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register — Executive Order 13799, 82 FR 22389',
       '{"executiveOrder":"13799","frCitation":"82 FR 22389","frDocumentNumber":"2017-10003"}'::jsonb)
    RETURNING id INTO m_eo13799;
    RAISE NOTICE 'created vr_measures Executive Order 13799 as id %', m_eo13799;
  END IF;

  IF m_eo13799 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_eo13799, 'voter_id', 70, true, 'yea_supports',
       'Section 1 establishes the Presidential Advisory Commission on '
       || 'Election Integrity. Section 3 gives it the mission of studying '
       || '"the registration and voting processes used in Federal '
       || 'elections" and reporting on practices that enhance or undermine '
       || 'confidence in them and on "those vulnerabilities in voting '
       || 'systems and practices used for Federal elections that could lead '
       || 'to improper voter registrations and improper voting, including '
       || 'fraudulent voter registrations and fraudulent voting." Section 4 '
       || 'defines "improper voter registration" and "improper voting" in '
       || 'terms of legal eligibility. It is an advisory body, not a '
       || 'mandate, which is why this is mapped below the weight given to '
       || 'the orders that direct agencies to act.', u),
      (m_eo13799, 'election_integrity', 75, false, 'yea_supports',
       'Sections 1–3, above. Filed as a secondary mapping on the same '
       || 'document because the chip for this issue is about securing '
       || 'elections generally rather than about a voter-identification '
       || 'requirement specifically.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_eo13799, 'trump', 'issued', true, TIMESTAMPTZ '2017-05-11T00:00:00Z', u,
       'Signed Executive Order 13799 on 2017-05-11. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_eo13799 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2017-05-16T00:00:00Z',
             'Issued by the President and published in the Federal Register',
             'Federal Register — Executive Order 13799 document record, 82 FR '
             || '22389',
             u,
             'Signed May 11, 2017 and published May 16, 2017 at 82 FR 22389. '
             || 'The commission it created operated under this order for just '
             || 'under eight months. That period is a fact about the record and '
             || 'is reported separately from what ended it, which is the row '
             || 'below.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2017-05-16T00:00:00Z');

      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'rescinded', TIMESTAMPTZ '2018-01-03T00:00:00Z',
             'Executive Order 13820 of January 3, 2018, signed by the same '
             || 'President',
             'Federal Register — Executive Order 13820, Termination of '
             || 'Presidential Advisory Commission on Election Integrity, 83 FR '
             || '969',
             'https://www.federalregister.gov/documents/2018/01/08/2018-00240/termination-of-presidential-advisory-commission-on-election-integrity',
             'Section 1 of Executive Order 13820 reads, in full: "Executive '
             || 'Order 13799 of May 11, 2017 (Establishment of Presidential '
             || 'Advisory Commission on Election Integrity), is hereby revoked, '
             || 'and the Presidential Advisory Commission on Election Integrity '
             || 'is accordingly terminated." Read from Executive Order 13820 '
             || 'itself. Revocation is a presidential act, so this row is not a '
             || 'statement about any challenge to the order and no court is '
             || 'claimed to have reached it. The terminating order states no '
             || 'position of its own on voter identification or election '
             || 'security, which is why it is recorded here as standing and is '
             || 'not filed as an instrument with a direction of its own.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'rescinded'
                            AND effective_at = TIMESTAMPTZ '2018-01-03T00:00:00Z');

    END IF;
  END IF;

  -- =========================================================================
  -- Executive Order 13813 — Promoting Healthcare Choice and Competition Across the United States
  -- =========================================================================
  u := 'https://www.federalregister.gov/documents/2017/10/17/2017-22677/promoting-healthcare-choice-and-competition-across-the-united-states';

  SELECT id INTO m_eo13813
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 13813'
   LIMIT 1;

  IF m_eo13813 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 13813',
       'Promoting Healthcare Choice and Competition Across the United '
       || 'States',
       'Health coverage outside the ACA exchanges',
       'Signed 2017-10-12 and published at 82 FR 48385 on 2017-10-17. '
       || 'Section 1(a) states the policy of facilitating "a healthcare '
       || 'system that provides high-quality care at affordable prices" and '
       || 'finds that the average exchange premium in the 39 healthcare.gov '
       || 'States "is more than double the average overall individual '
       || 'market premium recorded in 2013." Section 1(b) names association '
       || 'health plans, short-term limited-duration insurance and health '
       || 'reimbursement arrangements as the three near-term priorities. '
       || 'Sections 2, 3 and 4 direct the Secretaries of Labor, the '
       || 'Treasury and Health and Human Services to consider rulemaking '
       || 'expanding each. Mapped to the price chip rather than to the '
       || 'coverage chip because the order’s own stated mechanism is cost.',
       NULL, TIMESTAMPTZ '2017-10-12T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register — Executive Order 13813, 82 FR 48385',
       '{"executiveOrder":"13813","frCitation":"82 FR 48385","frDocumentNumber":"2017-22677"}'::jsonb)
    RETURNING id INTO m_eo13813;
    RAISE NOTICE 'created vr_measures Executive Order 13813 as id %', m_eo13813;
  END IF;

  IF m_eo13813 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_eo13813, 'healthcare_costs', 70, true, 'yea_supports',
       'Section 1(a) states the policy of facilitating "a healthcare '
       || 'system that provides high-quality care at affordable prices" and '
       || 'finds that the average exchange premium in the 39 healthcare.gov '
       || 'States "is more than double the average overall individual '
       || 'market premium recorded in 2013." Section 1(b) names association '
       || 'health plans, short-term limited-duration insurance and health '
       || 'reimbursement arrangements as the three near-term priorities. '
       || 'Sections 2, 3 and 4 direct the Secretaries of Labor, the '
       || 'Treasury and Health and Human Services to consider rulemaking '
       || 'expanding each. Mapped to the price chip rather than to the '
       || 'coverage chip because the order’s own stated mechanism is cost.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_eo13813, 'trump', 'issued', true, TIMESTAMPTZ '2017-10-12T00:00:00Z', u,
       'Signed Executive Order 13813 on 2017-10-12. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_eo13813 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2017-10-17T00:00:00Z',
             'Issued by the President and published in the Federal Register',
             'Federal Register — Executive Order 13813 document record, 82 FR '
             || '48385',
             u,
             'Signed October 12, 2017 and published October 17, 2017 at 82 FR '
             || '48385. Unrevoked as of that date on the register’s own '
             || 'disposition record.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2017-10-17T00:00:00Z');

      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'rescinded', TIMESTAMPTZ '2021-01-28T00:00:00Z',
             'Executive Order 14009 of January 28, 2021, signed by the '
             || 'succeeding President',
             'Federal Register — Executive Order 13813 document record, '
             || 'disposition notes',
             u,
             'The disposition note on the register’s own record for this '
             || 'document reads, in full: "Revoked by: EO 14009, January 28, '
             || '2021." The order no longer stands. Revocation by a later '
             || 'President is a presidential act, so this row is not a statement '
             || 'about any challenge to the order and no court is claimed to have '
             || 'reached it.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'rescinded'
                            AND effective_at = TIMESTAMPTZ '2021-01-28T00:00:00Z');

    END IF;
  END IF;

  -- =========================================================================
  -- Public Law 115-97 — To provide for reconciliation pursuant to titles II and V of the concurrent resolution on the budget for fiscal year 201
  -- =========================================================================
  u := 'https://www.congress.gov/bill/115th-congress/house-bill/1';

  SELECT id INTO m_pl115_97
    FROM vr_measures
   WHERE congress = 115 AND number = 'H.R. 1'
   LIMIT 1;

  IF m_pl115_97 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('bill', 115, 'house', 'H.R. 1',
       'To provide for reconciliation pursuant to titles II and V of the '
       || 'concurrent resolution on the budget for fiscal year 2018',
       'Individual and corporate rate cuts',
       'Signed 2017-12-22. Section 11001 adds Internal Revenue Code '
       || 'section 1(j), setting reduced individual rate tables for taxable '
       || 'years beginning after December 31, 2017 and before January 1, '
       || '2026; title I also reduces the corporate rate to 21 percent. '
       || 'Verified against GPO’s published enrolled text, PLAW-115publ97, '
       || 'approved December 22, 2017.',
       NULL, TIMESTAMPTZ '2017-12-22T00:00:00Z', NULL, 'enacted',
       u, 'Congress.gov — H.R. 1, 115th Congress',
       '{"publicLaw":"115-97"}'::jsonb)
    RETURNING id INTO m_pl115_97;
    RAISE NOTICE 'created vr_measures Public Law 115-97 as id %', m_pl115_97;
  END IF;

  IF m_pl115_97 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_pl115_97, 'lower_taxes', 100, true, 'yea_supports',
       'Section 11001 adds Internal Revenue Code section 1(j), setting '
       || 'reduced individual rate tables for taxable years beginning after '
       || 'December 31, 2017 and before January 1, 2026; title I also '
       || 'reduces the corporate rate to 21 percent. Verified against GPO’s '
       || 'published enrolled text, PLAW-115publ97, approved December 22, '
       || '2017.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_pl115_97, 'trump', 'signed', true, TIMESTAMPTZ '2017-12-22T00:00:00Z', u,
       'Signed Public Law 115-97 into law on 2017-12-22. Presentment; the enacted text is the act.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_pl115_97 AND politician_id = 'trump' AND action_type = 'signed'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2017-12-22T00:00:00Z',
             'Passed by Congress and signed by the President',
             'GovInfo — Public Law 115-97, enrolled text as published by GPO',
             'https://www.govinfo.gov/content/pkg/PLAW-115publ97/html/PLAW-115publ97.htm',
             'Enacted and published as Public Law 115-97, approved December '
             || '22, 2017. Nothing on file repeals it. Read the limit precisely: '
             || 'several of its individual-side provisions were written to expire '
             || 'after 2025 and were later made permanent by Public Law 119-21, '
             || 'which is a separate row in this record. This states that the law '
             || 'exists and stands as published; it is not a statement about any '
             || 'challenge to it.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2017-12-22T00:00:00Z');

    END IF;
  END IF;

  -- =========================================================================
  -- Executive Order 13877 — Improving Price and Quality Transparency in American Healthcare To Put Patients First
  -- =========================================================================
  u := 'https://www.federalregister.gov/documents/2019/06/27/2019-13945/improving-price-and-quality-transparency-in-american-healthcare-to-put-patients-first';

  SELECT id INTO m_eo13877
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 13877'
   LIMIT 1;

  IF m_eo13877 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 13877',
       'Improving Price and Quality Transparency in American Healthcare '
       || 'To Put Patients First',
       'Health-care price and quality transparency',
       'Signed 2019-06-24 and published at 84 FR 30849 on 2019-06-27. '
       || 'Section 3 directs the Secretary of Health and Human Services to '
       || 'propose a rule requiring hospitals to publish "standard charge '
       || 'information, including charges and information based on '
       || 'negotiated rates and for common or shoppable items and services, '
       || 'in an easy-to-understand, consumer-friendly, and '
       || 'machine-readable format." Section 4 directs the Secretaries of '
       || 'Health and Human Services, the Treasury and Labor to propose a '
       || 'rule requiring providers and insurers to give patients expected '
       || 'out-of-pocket cost information before care.',
       NULL, TIMESTAMPTZ '2019-06-24T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register — Executive Order 13877, 84 FR 30849',
       '{"executiveOrder":"13877","frCitation":"84 FR 30849","frDocumentNumber":"2019-13945"}'::jsonb)
    RETURNING id INTO m_eo13877;
    RAISE NOTICE 'created vr_measures Executive Order 13877 as id %', m_eo13877;
  END IF;

  IF m_eo13877 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_eo13877, 'healthcare_costs', 80, true, 'yea_supports',
       'Section 3 directs the Secretary of Health and Human Services to '
       || 'propose a rule requiring hospitals to publish "standard charge '
       || 'information, including charges and information based on '
       || 'negotiated rates and for common or shoppable items and services, '
       || 'in an easy-to-understand, consumer-friendly, and '
       || 'machine-readable format." Section 4 directs the Secretaries of '
       || 'Health and Human Services, the Treasury and Labor to propose a '
       || 'rule requiring providers and insurers to give patients expected '
       || 'out-of-pocket cost information before care.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_eo13877, 'trump', 'issued', true, TIMESTAMPTZ '2019-06-24T00:00:00Z', u,
       'Signed Executive Order 13877 on 2019-06-24. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_eo13877 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2019-06-27T00:00:00Z',
             'Issued by the President and published in the Federal Register',
             'Federal Register — Executive Order 13877 document record, 84 FR '
             || '30849',
             u,
             'Signed June 24, 2019 and published June 27, 2019 at 84 FR 30849. '
             || 'The register’s disposition record for this document carries a '
             || 'single cross-reference, back to Executive Order 13813 of October '
             || '12, 2017, and no entry revoking or superseding it, so it stands '
             || 'as published. This is a statement about the register’s record of '
             || 'presidential action and is not a statement about any challenge '
             || 'to the order.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2019-06-27T00:00:00Z');

    END IF;
  END IF;

  -- =========================================================================
  -- Presidential Memorandum, 85 FR 49587 — Deferring Payroll Tax Obligations in Light of the Ongoing COVID-19 Disaster
  -- =========================================================================
  u := 'https://www.federalregister.gov/documents/2020/08/13/2020-17899/deferring-payroll-tax-obligations-in-light-of-the-ongoing-covid-19-disaster';

  SELECT id INTO m_pm85fr49587
    FROM vr_measures
   WHERE measure_type = 'memorandum' AND chamber = 'executive'
     AND number = 'Presidential Memorandum, 85 FR 49587'
   LIMIT 1;

  IF m_pm85fr49587 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('memorandum', NULL, 'executive', 'Presidential Memorandum, 85 FR 49587',
       'Deferring Payroll Tax Obligations in Light of the Ongoing '
       || 'COVID-19 Disaster',
       'Payroll tax deferral memorandum',
       'Signed 2020-08-08 and published at 85 FR 49587 on 2020-08-13. '
       || 'Section 2 directs the Secretary of the Treasury to use the '
       || 'authority of 26 U.S.C. 7508A to defer withholding, deposit and '
       || 'payment of the tax imposed by 26 U.S.C. 3101(a) on wages paid '
       || 'September 1 through December 31, 2020 for employees generally '
       || 'earning less than $4,000 per biweekly pay period; section 4 '
       || 'directs the Secretary to "explore avenues, including '
       || 'legislation, to eliminate the obligation to pay the taxes '
       || 'deferred." Mapped at reduced weight and described in `plain` as '
       || 'a deferral because that is what it is — the obligation was '
       || 'postponed by executive action, not cut, and only Congress could '
       || 'have eliminated it.',
       NULL, TIMESTAMPTZ '2020-08-08T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register — Presidential Memorandum of August 8, 2020, 85 FR 49587',
       '{"frCitation":"85 FR 49587","frDocumentNumber":"2020-17899"}'::jsonb)
    RETURNING id INTO m_pm85fr49587;
    RAISE NOTICE 'created vr_measures Presidential Memorandum, 85 FR 49587 as id %', m_pm85fr49587;
  END IF;

  IF m_pm85fr49587 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_pm85fr49587, 'lower_taxes', 50, true, 'yea_supports',
       'Section 2 directs the Secretary of the Treasury to use the '
       || 'authority of 26 U.S.C. 7508A to defer withholding, deposit and '
       || 'payment of the tax imposed by 26 U.S.C. 3101(a) on wages paid '
       || 'September 1 through December 31, 2020 for employees generally '
       || 'earning less than $4,000 per biweekly pay period; section 4 '
       || 'directs the Secretary to "explore avenues, including '
       || 'legislation, to eliminate the obligation to pay the taxes '
       || 'deferred." Mapped at reduced weight and described in `plain` as '
       || 'a deferral because that is what it is — the obligation was '
       || 'postponed by executive action, not cut, and only Congress could '
       || 'have eliminated it.', u),
      (m_pm85fr49587, 'tax_middle_class', 55, false, 'yea_supports',
       'Section 2 limits the deferral to employees "generally less than '
       || '$4,000 during a bi-weekly pay period, or the equivalent '
       || 'threshold amount with respect to other pay periods," which is '
       || 'the income bound that makes this a household-side mapping rather '
       || 'than a general rate mapping.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_pm85fr49587, 'trump', 'issued', true, TIMESTAMPTZ '2020-08-08T00:00:00Z', u,
       'Issued the memorandum on 2020-08-08. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_pm85fr49587 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'expired', TIMESTAMPTZ '2020-12-31T00:00:00Z',
             'By the terms of the memorandum itself, section 2',
             'Federal Register — Presidential Memorandum of August 8, 2020, 85 '
             || 'FR 49587, section 2',
             u,
             'Section 2 of the memorandum directs the Secretary of the '
             || 'Treasury to defer the withholding, deposit and payment of the '
             || 'tax imposed by 26 U.S.C. 3101(a) "on wages or compensation, as '
             || 'applicable, paid during the period of September 1, 2020, through '
             || 'December 31, 2020" — an end date the document sets for itself. '
             || 'The register carries no continuation and no later instrument '
             || 'extending that window, so the deferral authority ran out on the '
             || 'date named rather than being revoked. This row reads the '
             || 'memorandum''s own timetable and the absence of any register '
             || 'entry extending it; it says nothing about any challenge to the '
             || 'memorandum, and it is not a statement about whether the deferred '
             || 'tax was ever forgiven, which section 4 left to Congress and '
             || 'Congress did not do.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'expired'
                            AND effective_at = TIMESTAMPTZ '2020-12-31T00:00:00Z');

    END IF;
  END IF;

  -- =========================================================================
  -- Executive Order 13951 — An America-First Healthcare Plan
  -- =========================================================================
  u := 'https://www.federalregister.gov/documents/2020/10/01/2020-21914/an-america-first-healthcare-plan';

  SELECT id INTO m_eo13951
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 13951'
   LIMIT 1;

  IF m_eo13951 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 13951',
       'An America-First Healthcare Plan',
       'America-First Healthcare Plan',
       'Signed 2020-09-24 and published at 85 FR 62179 on 2020-10-01. '
       || 'Section 4 is titled "Lowering Healthcare Costs for Americans." '
       || 'Section 4(b)(i) directs the Secretary of Health and Human '
       || 'Services to "work with the Congress to reach a legislative '
       || 'solution by December 31, 2020" on surprise billing; 4(b)(ii) '
       || 'directs administrative action "in the event a legislative '
       || 'solution is not reached" to prevent a patient receiving a bill '
       || 'for unforeseeable out-of-pocket expenses; 4(b)(iii) directs the '
       || 'Medicare.gov Hospital Compare site to be updated within 180 days '
       || 'to show whether a hospital complies with the Hospital Price '
       || 'Transparency Final Rule, whether it issues itemized discharge '
       || 'receipts, and how often it sues patients, garnishes wages or '
       || 'places liens on homes. Section 4(a) directs expanded access to '
       || 'affordable medicines.',
       NULL, TIMESTAMPTZ '2020-09-24T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register — Executive Order 13951, 85 FR 62179',
       '{"executiveOrder":"13951","frCitation":"85 FR 62179","frDocumentNumber":"2020-21914"}'::jsonb)
    RETURNING id INTO m_eo13951;
    RAISE NOTICE 'created vr_measures Executive Order 13951 as id %', m_eo13951;
  END IF;

  IF m_eo13951 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_eo13951, 'healthcare_costs', 85, true, 'yea_supports',
       'Section 4 is titled "Lowering Healthcare Costs for Americans." '
       || 'Section 4(b)(i) directs the Secretary of Health and Human '
       || 'Services to "work with the Congress to reach a legislative '
       || 'solution by December 31, 2020" on surprise billing; 4(b)(ii) '
       || 'directs administrative action "in the event a legislative '
       || 'solution is not reached" to prevent a patient receiving a bill '
       || 'for unforeseeable out-of-pocket expenses; 4(b)(iii) directs the '
       || 'Medicare.gov Hospital Compare site to be updated within 180 days '
       || 'to show whether a hospital complies with the Hospital Price '
       || 'Transparency Final Rule, whether it issues itemized discharge '
       || 'receipts, and how often it sues patients, garnishes wages or '
       || 'places liens on homes. Section 4(a) directs expanded access to '
       || 'affordable medicines.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_eo13951, 'trump', 'issued', true, TIMESTAMPTZ '2020-09-24T00:00:00Z', u,
       'Signed Executive Order 13951 on 2020-09-24. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_eo13951 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2020-10-01T00:00:00Z',
             'Issued by the President and published in the Federal Register',
             'Federal Register — Executive Order 13951 document record, 85 FR '
             || '62179',
             u,
             'Signed September 24, 2020 and published October 1, 2020 at 85 FR '
             || '62179. The register’s disposition record for this document '
             || 'carries twelve cross-references to other health orders of the '
             || 'same term and no entry revoking or superseding it, so it stands '
             || 'as published on that record. This is a statement about the '
             || 'register’s record of presidential action and is not a statement '
             || 'about any challenge to the order.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2020-10-01T00:00:00Z');

    END IF;
  END IF;

  -- =========================================================================
  -- Executive Order 14190 — Ending Radical Indoctrination in K-12 Schooling
  -- =========================================================================
  u := 'https://www.federalregister.gov/documents/2025/02/03/2025-02232/ending-radical-indoctrination-in-k-12-schooling';

  SELECT id INTO m_eo14190
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14190'
   LIMIT 1;

  IF m_eo14190 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 14190',
       'Ending Radical Indoctrination in K-12 Schooling',
       'Federal funding and K-12 indoctrination',
       'Signed 2025-01-29 and published at 90 FR 8853 on 2025-02-03. '
       || 'Section 3(a)(i) directs the Secretaries of Education, Defense '
       || 'and Health and Human Services to deliver an "Ending '
       || 'Indoctrination Strategy" containing a plan for "eliminating '
       || 'Federal funding or support for illegal and discriminatory '
       || 'treatment and indoctrination in K-12 schools, including based on '
       || 'gender ideology and discriminatory equity ideology." Section '
       || '3(b) requires that strategy to inventory every federal funding '
       || 'stream that supports such instruction, in curriculum and in '
       || 'teacher training, and each agency’s process to prevent or '
       || 'rescind those funds. Section 1 grounds the order in Title VI, '
       || 'Title IX, FERPA and the PPRA. Mapped to end_dei because the chip '
       || 'covers government AND schools; this is the only instrument in '
       || 'this record on the schools side.',
       NULL, TIMESTAMPTZ '2025-01-29T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register — Executive Order 14190, 90 FR 8853',
       '{"executiveOrder":"14190","frCitation":"90 FR 8853","frDocumentNumber":"2025-02232"}'::jsonb)
    RETURNING id INTO m_eo14190;
    RAISE NOTICE 'created vr_measures Executive Order 14190 as id %', m_eo14190;
  END IF;

  IF m_eo14190 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_eo14190, 'end_dei', 70, true, 'yea_supports',
       'Section 3(a)(i) directs the Secretaries of Education, Defense '
       || 'and Health and Human Services to deliver an "Ending '
       || 'Indoctrination Strategy" containing a plan for "eliminating '
       || 'Federal funding or support for illegal and discriminatory '
       || 'treatment and indoctrination in K-12 schools, including based on '
       || 'gender ideology and discriminatory equity ideology." Section '
       || '3(b) requires that strategy to inventory every federal funding '
       || 'stream that supports such instruction, in curriculum and in '
       || 'teacher training, and each agency’s process to prevent or '
       || 'rescind those funds. Section 1 grounds the order in Title VI, '
       || 'Title IX, FERPA and the PPRA. Mapped to end_dei because the chip '
       || 'covers government AND schools; this is the only instrument in '
       || 'this record on the schools side.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_eo14190, 'trump', 'issued', true, TIMESTAMPTZ '2025-01-29T00:00:00Z', u,
       'Signed Executive Order 14190 on 2025-01-29. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_eo14190 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2025-02-03T00:00:00Z',
             'Issued by the President and published in the Federal Register',
             'Federal Register — Executive Order 14190 document record, 90 FR '
             || '8853',
             u,
             'Signed January 29, 2025 and published February 3, 2025 at 90 FR '
             || '8853. The register’s disposition record for this document '
             || 'carries three cross-references — to Executive Order 13958 of '
             || 'November 2, 2020, Executive Order 13985 of January 20, 2021 and '
             || 'Executive Order 14280 of April 23, 2025 — and no entry revoking '
             || 'or superseding it, so it stands as published. This is a '
             || 'statement about the register’s record of presidential action and '
             || 'is not a statement about any challenge to the order.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2025-02-03T00:00:00Z');

    END IF;
  END IF;

  -- =========================================================================
  -- Executive Order 14193 — Imposing Duties To Address the Flow of Illicit Drugs Across Our Northern Border
  -- =========================================================================
  u := 'https://www.federalregister.gov/documents/2025/02/07/2025-02406/imposing-duties-to-address-the-flow-of-illicit-drugs-across-our-northern-border';

  SELECT id INTO m_eo14193
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14193'
   LIMIT 1;

  IF m_eo14193 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 14193',
       'Imposing Duties To Address the Flow of Illicit Drugs Across Our '
       || 'Northern Border',
       'Duties on imports from Canada',
       'Signed 2025-02-01 and published at 90 FR 9113 on 2025-02-07. The '
       || 'order is issued "by the authority vested in me as President by '
       || 'the Constitution and the laws of the United States of America, '
       || 'including the International Emergency Economic Powers Act (50 '
       || 'U.S.C. 1701 et seq.), the National Emergencies Act (50 U.S.C. '
       || '1601 et seq.), section 604 of the Trade Act of 1974 (19 U.S.C. '
       || '2483), and section 301 of title 3, United States Code," and '
       || 'imposes additional ad valorem duties on articles that are '
       || 'products of Canada. Mapped opposes because the chip states the '
       || 'guardrail position — keeping Congress’s constitutional role over '
       || 'tariffs — and setting rates unilaterally under an emergency '
       || 'statute runs against it. The mapping is about WHO SET THE RATE, '
       || 'not about whether the rate was wise.',
       NULL, TIMESTAMPTZ '2025-02-01T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register — Executive Order 14193, 90 FR 9113',
       '{"executiveOrder":"14193","frCitation":"90 FR 9113","frDocumentNumber":"2025-02406"}'::jsonb)
    RETURNING id INTO m_eo14193;
    RAISE NOTICE 'created vr_measures Executive Order 14193 as id %', m_eo14193;
  END IF;

  IF m_eo14193 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_eo14193, 'tariffs_authority', 70, true, 'yea_opposes',
       'The order is issued "by the authority vested in me as President '
       || 'by the Constitution and the laws of the United States of '
       || 'America, including the International Emergency Economic Powers '
       || 'Act (50 U.S.C. 1701 et seq.), the National Emergencies Act (50 '
       || 'U.S.C. 1601 et seq.), section 604 of the Trade Act of 1974 (19 '
       || 'U.S.C. 2483), and section 301 of title 3, United States Code," '
       || 'and imposes additional ad valorem duties on articles that are '
       || 'products of Canada. Mapped opposes because the chip states the '
       || 'guardrail position — keeping Congress’s constitutional role over '
       || 'tariffs — and setting rates unilaterally under an emergency '
       || 'statute runs against it. The mapping is about WHO SET THE RATE, '
       || 'not about whether the rate was wise.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_eo14193, 'trump', 'issued', true, TIMESTAMPTZ '2025-02-01T00:00:00Z', u,
       'Signed Executive Order 14193 on 2025-02-01. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_eo14193 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2025-02-07T00:00:00Z',
             'Issued by the President and published in the Federal Register',
             'Federal Register — Executive Order 14193 document record, 90 FR '
             || '9113',
             u,
             'Signed February 1, 2025 and published February 7, 2025 at 90 FR '
             || '9113. The duties were collected under this order, as amended by '
             || 'Executive Order 14226 of March 2, 2025 and Executive Order 14289 '
             || 'of April 29, 2025, for just over twelve months. That period is a '
             || 'fact about the record and is reported separately from what ended '
             || 'it, which is the row below.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2025-02-07T00:00:00Z');

      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'superseded', TIMESTAMPTZ '2026-02-20T00:00:00Z',
             'President of the United States, by later executive order',
             'Federal Register — Executive Order 14389, Ending Certain Tariff '
             || 'Actions, 91 FR 9437',
             'https://www.federalregister.gov/documents/2026/02/25/2026-03832/ending-certain-tariff-actions',
             'Executive Order 14389, signed February 20, 2026 and published '
             || 'February 25, 2026, provides that the additional ad valorem '
             || 'duties imposed under the International Emergency Economic Powers '
             || 'Act by this order, as amended, "shall no longer be in effect '
             || 'and, as soon as practicable, shall no longer be collected." That '
             || 'order names this one expressly and states that the national '
             || 'emergency declared or described in it, and every other action '
             || 'taken under it, are unaffected — so this row records the end of '
             || 'the duties and not the end of the order. Read from Executive '
             || 'Order 14389 itself; this is not a statement about any challenge '
             || 'to it.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'superseded'
                            AND effective_at = TIMESTAMPTZ '2026-02-20T00:00:00Z');

    END IF;
  END IF;

  -- =========================================================================
  -- Executive Order 14194 — Imposing Duties To Address the Situation at Our Southern Border
  -- =========================================================================
  u := 'https://www.federalregister.gov/documents/2025/02/07/2025-02407/imposing-duties-to-address-the-situation-at-our-southern-border';

  SELECT id INTO m_eo14194
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14194'
   LIMIT 1;

  IF m_eo14194 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 14194',
       'Imposing Duties To Address the Situation at Our Southern Border',
       'Duties on imports from Mexico',
       'Signed 2025-02-01 and published at 90 FR 9117 on 2025-02-07. '
       || 'Same authority clause and same mechanism as Executive Order '
       || '14193, applied to articles that are products of Mexico: '
       || 'additional ad valorem duties imposed under the International '
       || 'Emergency Economic Powers Act and the National Emergencies Act '
       || 'by executive order. Filed as its own row rather than folded into '
       || 'the northern-border order because it is a separate instrument '
       || 'with its own citation and its own amendment history — Executive '
       || 'Order 14227 of March 2, 2025, Executive Order 14289 of April 29, '
       || '2025 and Proclamation 10962 of July 30, 2025.',
       NULL, TIMESTAMPTZ '2025-02-01T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register — Executive Order 14194, 90 FR 9117',
       '{"executiveOrder":"14194","frCitation":"90 FR 9117","frDocumentNumber":"2025-02407"}'::jsonb)
    RETURNING id INTO m_eo14194;
    RAISE NOTICE 'created vr_measures Executive Order 14194 as id %', m_eo14194;
  END IF;

  IF m_eo14194 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_eo14194, 'tariffs_authority', 70, true, 'yea_opposes',
       'Same authority clause and same mechanism as Executive Order '
       || '14193, applied to articles that are products of Mexico: '
       || 'additional ad valorem duties imposed under the International '
       || 'Emergency Economic Powers Act and the National Emergencies Act '
       || 'by executive order. Filed as its own row rather than folded into '
       || 'the northern-border order because it is a separate instrument '
       || 'with its own citation and its own amendment history — Executive '
       || 'Order 14227 of March 2, 2025, Executive Order 14289 of April 29, '
       || '2025 and Proclamation 10962 of July 30, 2025.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_eo14194, 'trump', 'issued', true, TIMESTAMPTZ '2025-02-01T00:00:00Z', u,
       'Signed Executive Order 14194 on 2025-02-01. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_eo14194 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2025-02-07T00:00:00Z',
             'Issued by the President and published in the Federal Register',
             'Federal Register — Executive Order 14194 document record, 90 FR '
             || '9117',
             u,
             'Signed February 1, 2025 and published February 7, 2025 at 90 FR '
             || '9117. The duties were collected under this order, as amended, '
             || 'for just over twelve months. That period is a fact about the '
             || 'record and is reported separately from what ended it, which is '
             || 'the row below.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2025-02-07T00:00:00Z');

      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'superseded', TIMESTAMPTZ '2026-02-20T00:00:00Z',
             'President of the United States, by later executive order',
             'Federal Register — Executive Order 14389, Ending Certain Tariff '
             || 'Actions, 91 FR 9437',
             'https://www.federalregister.gov/documents/2026/02/25/2026-03832/ending-certain-tariff-actions',
             'Executive Order 14389, signed February 20, 2026 and published '
             || 'February 25, 2026, provides that the additional ad valorem '
             || 'duties imposed under the International Emergency Economic Powers '
             || 'Act by this order, as amended, "shall no longer be in effect '
             || 'and, as soon as practicable, shall no longer be collected." That '
             || 'order names this one expressly and states that the national '
             || 'emergency declared or described in it, and every other action '
             || 'taken under it, are unaffected — so this row records the end of '
             || 'the duties and not the end of the order. Read from Executive '
             || 'Order 14389 itself; this is not a statement about any challenge '
             || 'to it.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'superseded'
                            AND effective_at = TIMESTAMPTZ '2026-02-20T00:00:00Z');

    END IF;
  END IF;

  -- =========================================================================
  -- Executive Order 14228 — Further Amendment to Duties Addressing the Synthetic Opioid Supply Chain in the People’s Republic of China
  -- =========================================================================
  u := 'https://www.federalregister.gov/documents/2025/03/07/2025-03775/further-amendment-to-duties-addressing-the-synthetic-opioid-supply-chain-in-the-peoples-republic-of';

  SELECT id INTO m_eo14228
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14228'
   LIMIT 1;

  IF m_eo14228 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 14228',
       'Further Amendment to Duties Addressing the Synthetic Opioid '
       || 'Supply Chain in the People’s Republic of China',
       'Raising the China synthetic-opioid duty rate',
       'Signed 2025-03-03 and published at 90 FR 11463 on 2025-03-07. '
       || 'Section 1 states the determination "that the PRC has not taken '
       || 'adequate steps to alleviate the illicit drug crisis through '
       || 'cooperative enforcement actions, and that the crisis described '
       || 'in Executive Order 14195 has not abated." Section 2 amends '
       || 'section 2(a) of Executive Order 14195 "by striking the words '
       || '``10 percent’’ and inserting in lieu thereof the words ``20 '
       || 'percent’’." Filed as its own row because it is a separate '
       || 'instrument with its own citation; the order it amends is already '
       || 'in this record and carries its own mapping.',
       NULL, TIMESTAMPTZ '2025-03-03T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register — Executive Order 14228, 90 FR 11463',
       '{"executiveOrder":"14228","frCitation":"90 FR 11463","frDocumentNumber":"2025-03775"}'::jsonb)
    RETURNING id INTO m_eo14228;
    RAISE NOTICE 'created vr_measures Executive Order 14228 as id %', m_eo14228;
  END IF;

  IF m_eo14228 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_eo14228, 'tariffs_china', 70, true, 'yea_supports',
       'Section 1 states the determination "that the PRC has not taken '
       || 'adequate steps to alleviate the illicit drug crisis through '
       || 'cooperative enforcement actions, and that the crisis described '
       || 'in Executive Order 14195 has not abated." Section 2 amends '
       || 'section 2(a) of Executive Order 14195 "by striking the words '
       || '``10 percent’’ and inserting in lieu thereof the words ``20 '
       || 'percent’’." Filed as its own row because it is a separate '
       || 'instrument with its own citation; the order it amends is already '
       || 'in this record and carries its own mapping.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_eo14228, 'trump', 'issued', true, TIMESTAMPTZ '2025-03-03T00:00:00Z', u,
       'Signed Executive Order 14228 on 2025-03-03. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_eo14228 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2025-03-07T00:00:00Z',
             'Issued by the President and published in the Federal Register',
             'Federal Register — Executive Order 14228 document record, 90 FR '
             || '11463',
             u,
             'Signed March 3, 2025 and published March 7, 2025 at 90 FR 11463. '
             || 'The register’s disposition record for this document carries '
             || 'cross-references to Executive Order 14200 of February 5, 2025 '
             || 'and Executive Order 14256 of April 2, 2025, and an "Amends" '
             || 'entry for Executive Order 14195 of February 1, 2025, and no '
             || 'entry revoking or superseding it, so it stands as published. '
             || 'Read the limit of that carefully: the duties this order raised '
             || 'were themselves ended on February 20, 2026 by Executive Order '
             || '14389, which names "Executive Order 14195, as amended" — that '
             || 'supersession is recorded on the Executive Order 14195 row, and '
             || 'this row does not assert a disposition the register does not '
             || 'show for it. This is not a statement about any challenge to the '
             || 'order.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2025-03-07T00:00:00Z');

    END IF;
  END IF;

  -- =========================================================================
  -- Executive Order 14245 — Imposing Tariffs on Countries Importing Venezuelan Oil
  -- =========================================================================
  u := 'https://www.federalregister.gov/documents/2025/03/27/2025-05440/imposing-tariffs-on-countries-importing-venezuelan-oil';

  SELECT id INTO m_eo14245
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14245'
   LIMIT 1;

  IF m_eo14245 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 14245',
       'Imposing Tariffs on Countries Importing Venezuelan Oil',
       'Tariffs on purchasers of Venezuelan oil',
       'Signed 2025-03-24 and published at 90 FR 13829 on 2025-03-27. '
       || 'Issued under the International Emergency Economic Powers Act and '
       || 'the National Emergencies Act, the order authorizes a 25 percent '
       || 'ad valorem duty on goods from any country determined to import '
       || 'Venezuelan oil, directly or indirectly, with the determination '
       || 'left to the Secretary of State in consultation with named '
       || 'officials. Mapped opposes on the same ground as the other two '
       || 'duty orders in this wave: the chip is about who sets tariffs, '
       || 'and this instrument places both the rate and the choice of '
       || 'target inside the executive branch.',
       NULL, TIMESTAMPTZ '2025-03-24T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register — Executive Order 14245, 90 FR 13829',
       '{"executiveOrder":"14245","frCitation":"90 FR 13829","frDocumentNumber":"2025-05440"}'::jsonb)
    RETURNING id INTO m_eo14245;
    RAISE NOTICE 'created vr_measures Executive Order 14245 as id %', m_eo14245;
  END IF;

  IF m_eo14245 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_eo14245, 'tariffs_authority', 70, true, 'yea_opposes',
       'Issued under the International Emergency Economic Powers Act and '
       || 'the National Emergencies Act, the order authorizes a 25 percent '
       || 'ad valorem duty on goods from any country determined to import '
       || 'Venezuelan oil, directly or indirectly, with the determination '
       || 'left to the Secretary of State in consultation with named '
       || 'officials. Mapped opposes on the same ground as the other two '
       || 'duty orders in this wave: the chip is about who sets tariffs, '
       || 'and this instrument places both the rate and the choice of '
       || 'target inside the executive branch.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_eo14245, 'trump', 'issued', true, TIMESTAMPTZ '2025-03-24T00:00:00Z', u,
       'Signed Executive Order 14245 on 2025-03-24. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_eo14245 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2025-03-27T00:00:00Z',
             'Issued by the President and published in the Federal Register',
             'Federal Register — Executive Order 14245 document record, 90 FR '
             || '13829',
             u,
             'Signed March 24, 2025 and published March 27, 2025 at 90 FR '
             || '13829. That the order stood is a fact about the record and is '
             || 'reported separately from what ended it, which is the row below.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2025-03-27T00:00:00Z');

      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'superseded', TIMESTAMPTZ '2026-02-20T00:00:00Z',
             'President of the United States, by later executive order',
             'Federal Register — Executive Order 14389, Ending Certain Tariff '
             || 'Actions, 91 FR 9437',
             'https://www.federalregister.gov/documents/2026/02/25/2026-03832/ending-certain-tariff-actions',
             'Executive Order 14389, signed February 20, 2026 and published '
             || 'February 25, 2026, provides that the additional ad valorem '
             || 'duties imposed under the International Emergency Economic Powers '
             || 'Act by this order, as amended, "shall no longer be in effect '
             || 'and, as soon as practicable, shall no longer be collected." That '
             || 'order names this one expressly and states that the national '
             || 'emergency declared or described in it, and every other action '
             || 'taken under it, are unaffected — so this row records the end of '
             || 'the duties and not the end of the order. Read from Executive '
             || 'Order 14389 itself; this is not a statement about any challenge '
             || 'to it.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'superseded'
                            AND effective_at = TIMESTAMPTZ '2026-02-20T00:00:00Z');

    END IF;
  END IF;

  -- =========================================================================
  -- Executive Order 14281 — Restoring Equality of Opportunity and Meritocracy
  -- =========================================================================
  u := 'https://www.federalregister.gov/documents/2025/04/28/2025-07378/restoring-equality-of-opportunity-and-meritocracy';

  SELECT id INTO m_eo14281
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14281'
   LIMIT 1;

  IF m_eo14281 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 14281',
       'Restoring Equality of Opportunity and Meritocracy',
       'Ending disparate-impact liability',
       'Signed 2025-04-23 and published at 90 FR 17537 on 2025-04-28. '
       || 'Section 1 states that the principle of equal treatment '
       || '"guarantees equality of opportunity, not equal outcomes" and '
       || '"encourages meritocracy and a colorblind society, not race- or '
       || 'sex-based favoritism," and identifies disparate-impact liability '
       || 'as the movement’s "key tool." Section 4 directs that "all '
       || 'agencies shall deprioritize enforcement of all statutes and '
       || 'regulations to the extent they include disparate-impact '
       || 'liability," naming 42 U.S.C. 2000e-2 and three Justice '
       || 'Department regulations. Section 5(a) directs the Attorney '
       || 'General, under the delegation in Executive Order 12250, to '
       || '"initiate appropriate action to repeal or amend the implementing '
       || 'regulations for Title VI of the Civil Rights Act of 1964 for all '
       || 'agencies to the extent they contemplate disparate-impact '
       || 'liability." Mapped to end_dei on the "in favor of merit" half of '
       || 'the chip.',
       NULL, TIMESTAMPTZ '2025-04-23T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register — Executive Order 14281, 90 FR 17537',
       '{"executiveOrder":"14281","frCitation":"90 FR 17537","frDocumentNumber":"2025-07378"}'::jsonb)
    RETURNING id INTO m_eo14281;
    RAISE NOTICE 'created vr_measures Executive Order 14281 as id %', m_eo14281;
  END IF;

  IF m_eo14281 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_eo14281, 'end_dei', 75, true, 'yea_supports',
       'Section 1 states that the principle of equal treatment '
       || '"guarantees equality of opportunity, not equal outcomes" and '
       || '"encourages meritocracy and a colorblind society, not race- or '
       || 'sex-based favoritism," and identifies disparate-impact liability '
       || 'as the movement’s "key tool." Section 4 directs that "all '
       || 'agencies shall deprioritize enforcement of all statutes and '
       || 'regulations to the extent they include disparate-impact '
       || 'liability," naming 42 U.S.C. 2000e-2 and three Justice '
       || 'Department regulations. Section 5(a) directs the Attorney '
       || 'General, under the delegation in Executive Order 12250, to '
       || '"initiate appropriate action to repeal or amend the implementing '
       || 'regulations for Title VI of the Civil Rights Act of 1964 for all '
       || 'agencies to the extent they contemplate disparate-impact '
       || 'liability." Mapped to end_dei on the "in favor of merit" half of '
       || 'the chip.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_eo14281, 'trump', 'issued', true, TIMESTAMPTZ '2025-04-23T00:00:00Z', u,
       'Signed Executive Order 14281 on 2025-04-23. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_eo14281 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2025-04-28T00:00:00Z',
             'Issued by the President and published in the Federal Register',
             'Federal Register — Executive Order 14281 document record, 90 FR '
             || '17537',
             u,
             'Signed April 23, 2025 and published April 28, 2025 at 90 FR '
             || '17537. The register’s disposition record for this document '
             || 'carries a single cross-reference, back to Executive Order 12250 '
             || 'of November 2, 1980, and no entry revoking or superseding it, so '
             || 'it stands as published. This is a statement about the register’s '
             || 'record of presidential action and is not a statement about any '
             || 'challenge to the order.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2025-04-28T00:00:00Z');

    END IF;
  END IF;

  -- =========================================================================
  -- Executive Order 14358 — Modifying Reciprocal Tariff Rates Consistent With the Economic and Trade Arrangement Between the United States and the P
  -- =========================================================================
  u := 'https://www.federalregister.gov/documents/2025/11/07/2025-19826/modifying-reciprocal-tariff-rates-consistent-with-the-economic-and-trade-arrangement-between-the';

  SELECT id INTO m_eo14358
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14358'
   LIMIT 1;

  IF m_eo14358 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 14358',
       'Modifying Reciprocal Tariff Rates Consistent With the Economic '
       || 'and Trade Arrangement Between the United States and the People’s '
       || 'Republic of China',
       'Suspending the higher China reciprocal rate',
       'Signed 2025-11-04 and published at 90 FR 50729 on 2025-11-07. '
       || 'Section 1 recounts that the heightened ad valorem duties on PRC '
       || 'goods imposed by Executive Order 14257 as amended were suspended '
       || 'in Executive Order 14298 of May 12, 2025 and Executive Order '
       || '14334 of August 11, 2025 following discussions with the PRC. '
       || 'Section 2 directs that "Heading 9903.01.63 and subdivision '
       || '(v)(xvii)(10) of U.S. note 2 to subchapter III of chapter 99 of '
       || 'the Harmonized Tariff Schedule of the United States shall '
       || 'continue to be suspended until 12:01 a.m. eastern standard time '
       || 'on November 10, 2026." Mapped opposes because the chip is about '
       || 'USING tariffs to counter China and this instrument holds them in '
       || 'abeyance; mapped at reduced weight and described in `plain` as a '
       || 'suspension because section 3(b) preserves the power to reimpose '
       || 'them if the PRC does not honour the arrangement.',
       NULL, TIMESTAMPTZ '2025-11-04T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register — Executive Order 14358, 90 FR 50729',
       '{"executiveOrder":"14358","frCitation":"90 FR 50729","frDocumentNumber":"2025-19826"}'::jsonb)
    RETURNING id INTO m_eo14358;
    RAISE NOTICE 'created vr_measures Executive Order 14358 as id %', m_eo14358;
  END IF;

  IF m_eo14358 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_eo14358, 'tariffs_china', 55, true, 'yea_opposes',
       'Section 1 recounts that the heightened ad valorem duties on PRC '
       || 'goods imposed by Executive Order 14257 as amended were suspended '
       || 'in Executive Order 14298 of May 12, 2025 and Executive Order '
       || '14334 of August 11, 2025 following discussions with the PRC. '
       || 'Section 2 directs that "Heading 9903.01.63 and subdivision '
       || '(v)(xvii)(10) of U.S. note 2 to subchapter III of chapter 99 of '
       || 'the Harmonized Tariff Schedule of the United States shall '
       || 'continue to be suspended until 12:01 a.m. eastern standard time '
       || 'on November 10, 2026." Mapped opposes because the chip is about '
       || 'USING tariffs to counter China and this instrument holds them in '
       || 'abeyance; mapped at reduced weight and described in `plain` as a '
       || 'suspension because section 3(b) preserves the power to reimpose '
       || 'them if the PRC does not honour the arrangement.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_eo14358, 'trump', 'issued', true, TIMESTAMPTZ '2025-11-04T00:00:00Z', u,
       'Signed Executive Order 14358 on 2025-11-04. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_eo14358 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2025-11-07T00:00:00Z',
             'Issued by the President and published in the Federal Register',
             'Federal Register — Executive Order 14358 document record, 90 FR '
             || '50729',
             u,
             'Signed November 4, 2025 and published November 7, 2025 at 90 FR '
             || '50729. The register’s disposition record for this document is '
             || 'empty — no revocation and no supersession — so it stands as '
             || 'published. Read the limit of that carefully: the reciprocal '
             || 'duties whose suspension this order extended were themselves '
             || 'ended on February 20, 2026 by Executive Order 14389. This row '
             || 'does not assert a standing beyond what the register shows, and '
             || 'it is not a statement about any challenge to the order.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2025-11-07T00:00:00Z');

    END IF;
  END IF;

  -- =========================================================================
  -- Executive Order 14389 — Ending Certain Tariff Actions
  -- =========================================================================
  u := 'https://www.federalregister.gov/documents/2026/02/25/2026-03832/ending-certain-tariff-actions';

  SELECT id INTO m_eo14389
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14389'
   LIMIT 1;

  IF m_eo14389 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 14389',
       'Ending Certain Tariff Actions',
       'Ending the IEEPA tariff actions',
       'Signed 2026-02-20 and published at 91 FR 9437 on 2026-02-25. '
       || 'Section 1 provides that the additional ad valorem duties imposed '
       || 'under IEEPA in Executive Order 14195 as amended — the '
       || 'synthetic-opioid duties on the PRC — along with those in '
       || 'Executive Orders 14193, 14194, 14245, 14257, 14323, 14329, 14380 '
       || 'and 14382, "shall no longer be in effect and, as soon as '
       || 'practicable, shall no longer be collected." Section 2(a) directs '
       || 'every agency head to "take all appropriate steps to end" those '
       || 'duties and to "immediately begin taking steps to effectuate this '
       || 'order."',
       NULL, TIMESTAMPTZ '2026-02-20T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register — Executive Order 14389, 91 FR 9437',
       '{"executiveOrder":"14389","frCitation":"91 FR 9437","frDocumentNumber":"2026-03832"}'::jsonb)
    RETURNING id INTO m_eo14389;
    RAISE NOTICE 'created vr_measures Executive Order 14389 as id %', m_eo14389;
  END IF;

  IF m_eo14389 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_eo14389, 'tariffs_china', 70, true, 'yea_opposes',
       'Section 1 provides that the additional ad valorem duties imposed '
       || 'under IEEPA in Executive Order 14195 as amended — the '
       || 'synthetic-opioid duties on the PRC — along with those in '
       || 'Executive Orders 14193, 14194, 14245, 14257, 14323, 14329, 14380 '
       || 'and 14382, "shall no longer be in effect and, as soon as '
       || 'practicable, shall no longer be collected." Section 2(a) directs '
       || 'every agency head to "take all appropriate steps to end" those '
       || 'duties and to "immediately begin taking steps to effectuate this '
       || 'order."', u),
      (m_eo14389, 'tariffs_growth', 70, false, 'yea_opposes',
       'Section 1, above, reaches nine orders including Executive Order '
       || '14257, the reciprocal-tariff order whose stated ground was that '
       || 'persistent goods trade deficits had hollowed out the domestic '
       || 'manufacturing base. Mapped opposes because the chip is about '
       || 'USING tariffs to reshore manufacturing and this instrument ends '
       || 'their collection.', u),
      (m_eo14389, 'tariffs_prices', 60, false, 'yea_supports',
       'Section 1 ends collection of the additional ad valorem duties; '
       || 'section 2(b) directs the Secretary of Commerce, the Secretary of '
       || 'Homeland Security and the United States Trade Representative to '
       || 'implement, and section 2(a) provides for refunds of duties '
       || 'collected to be processed under standard Customs procedures. '
       || 'Mapped advances because the chip asks that families be shielded '
       || 'from tariff-driven price increases.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_eo14389, 'trump', 'issued', true, TIMESTAMPTZ '2026-02-20T00:00:00Z', u,
       'Signed Executive Order 14389 on 2026-02-20. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos FROM vr_positions
     WHERE measure_id = m_eo14389 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2026-02-25T00:00:00Z',
             'Issued by the President and published in the Federal Register',
             'Federal Register — Executive Order 14389 document record, 91 FR '
             || '9437',
             u,
             'Signed February 20, 2026 and published February 25, 2026 at 91 '
             || 'FR 9437. The register’s disposition record for this document '
             || 'carries eleven cross-references to the orders it unwinds and to '
             || 'Proclamation 11012 and Executive Order 14388 of the same day, '
             || 'and no entry revoking or superseding it, so it stands as '
             || 'published. This is a statement about the register’s record of '
             || 'presidential action and is not a statement about any challenge '
             || 'to the order.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2026-02-25T00:00:00Z');

    END IF;
  END IF;
  -- =========================================================================
  -- Executive Order 14195 — SECOND MAPPING ONLY, on a measure waves 1-10 already wrote
  --
  -- No vr_measures row, no vr_positions row and no standing row is written
  -- here: the document is already on file and its standing is already logged.
  -- This is one vr_measure_issues row, guarded the same way, carrying the
  -- 'tariffs_authority' reading the earlier wave did not.
  -- =========================================================================
  u := 'https://www.federalregister.gov/documents/2025/02/07/2025-02408/imposing-duties-to-address-the-synthetic-opioid-supply-chain-in-the-peoples-republic-of-china';

  SELECT id INTO m_eo14195
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14195'
   LIMIT 1;

  IF m_eo14195 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_eo14195, 'tariffs_authority', 65, false, 'yea_opposes',
       'The order is issued under the International Emergency Economic '
       || 'Powers Act and the National Emergencies Act and imposes an '
       || 'additional ad valorem duty on articles that are products of the '
       || 'PRC, with section 3 reserving to the President the determination '
       || 'whether the PRC has taken adequate steps. Mapped opposes on the '
       || 'guardrail chip, on the same ground as Executive Orders 14193, '
       || '14194, 14245 and 14257: the mapping is about who set the rate, '
       || 'not about whether the rate was wise. Added in wave 11; this '
       || 'document was already in the record for its tariffs_china and '
       || 'immig_fentanyl mappings, and leaving the authority question off '
       || 'it while filing three sibling orders for exactly that question '
       || 'would have been selection.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
  END IF;

  -- =========================================================================
  -- Executive Order 14360 — SECOND MAPPING ONLY, on a measure waves 1-10 already wrote
  --
  -- No vr_measures row, no vr_positions row and no standing row is written
  -- here: the document is already on file and its standing is already logged.
  -- This is one vr_measure_issues row, guarded the same way, carrying the
  -- 'cost_living' reading the earlier wave did not.
  -- =========================================================================
  u := 'https://www.federalregister.gov/documents/2025/11/25/2025-21203/modifying-the-scope-of-the-reciprocal-tariffs-with-respect-to-certain-agricultural-products';

  SELECT id INTO m_eo14360
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14360'
   LIMIT 1;

  IF m_eo14360 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_eo14360, 'cost_living', 70, false, 'yea_supports',
       'Section 2 modifies the Harmonized Tariff Schedule as provided in '
       || 'Annex I, effective for goods entered for consumption on or after '
       || '12:01 a.m. eastern standard time on November 13, 2025, and '
       || 'provides for refunds of duties already collected. Section 1 '
       || 'states the decision followed monitoring of "current domestic '
       || 'demand for certain products, and current domestic capacity to '
       || 'produce certain products." Filed as a secondary mapping on a '
       || 'document already in this record for its tariffs_prices and '
       || 'tariffs_growth mappings: the household-grocery reading is a '
       || 'distinct issue from the general price reading, and this is the '
       || 'only instrument in the record that reaches food prices directly.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
  END IF;

  -- =========================================================================
  -- Executive Order 14248 — SECOND MAPPING ONLY, on a measure waves 1-10 already wrote
  --
  -- No vr_measures row, no vr_positions row and no standing row is written
  -- here: the document is already on file and its standing is already logged.
  -- This is one vr_measure_issues row, guarded the same way, carrying the
  -- 'states_federal_power' reading the earlier wave did not.
  -- =========================================================================
  u := 'https://www.federalregister.gov/documents/2025/03/28/2025-05523/preserving-and-protecting-the-integrity-of-american-elections';

  SELECT id INTO m_eo14248
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14248'
   LIMIT 1;

  IF m_eo14248 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_eo14248, 'states_federal_power', 55, false, 'yea_opposes',
       'The order directs the Election Assistance Commission to '
       || 'condition federal funds on state adoption of the national mail '
       || 'voter registration form as amended by the order, and directs the '
       || 'Attorney General to enforce against states that count absentee '
       || 'or mail ballots received after election day. Mapped opposes on '
       || 'the chip "keep decisions with the states unless there’s a clear '
       || 'national reason for Washington to override them," which the '
       || 'order overrides by directing state election administration from '
       || 'Washington. Note the standing rows already on this document: a '
       || 'federal court has permanently enjoined parts of it. This mapping '
       || 'records what the order directed, and the standing rows record '
       || 'what survived.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
  END IF;
END $$;
