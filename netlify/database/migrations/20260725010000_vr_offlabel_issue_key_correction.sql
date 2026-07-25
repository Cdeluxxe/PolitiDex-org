-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — move institutional-power votes off two off-label issue keys
-- ─────────────────────────────────────────────────────────────────────────────
-- THE PROBLEM
-- Thirty rows in vr_measure_issues (plus four in vr_measure_provisions) were
-- filed under two keys whose user-facing labels have nothing to do with the
-- measure:
--
--   democracy_balance = "⚖️ Secure & Accessible Voting"  (voter ID, mail ballots)
--   gov_balance       = "⚖️ Balance the Budget"          (spending vs revenue)
--
-- What those rows actually contain is institutional-power content: cabinet
-- advice-and-consent votes, War Powers and tariff-authority resolutions, the
-- nationwide-injunction bill, the Clean Air Act waiver repeals, the National
-- Guard federalization suits, and the appropriations-impoundment suit. Because
-- every mapping row feeds the member's per-issue Official Record percentage,
-- a voter reading "Secure & Accessible Voting: 70%" was being shown a number
-- driven by Posse Comitatus and IEEPA litigation, and "Balance the Budget: 100%"
-- was being driven by whether a senator confirmed an FBI director.
--
-- THE FIX
-- Two new keys are added to the shared ISSUE_MAP vocabulary (alignment-tool.js,
-- regenerated into db/issue-keys.json by scripts/gen-issue-keys.mjs — both keys
-- MUST be in that allow-list or voting-record.mts silently drops every row that
-- references them at assembleRecordItems):
--
--   checks_balances      = "⚖️ Congressional Checks & Balances"
--                          Keep Congress and the courts as a real check on
--                          executive power, whoever is president.
--   states_federal_power = "🗺 State vs. Federal Power"
--                          Draw a clear line between what states decide and
--                          what Washington decides.
--
-- Neither key carries a partisan `lean`: both parties invoke institutional
-- limits when they are out of power, so coding either as D or R would itself be
-- false signal.
--
-- Eighteen rows are re-pointed onto those keys. WEIGHT AND is_primary ARE
-- PRESERVED EXACTLY on every re-pointed row, because weight decides which
-- record wins the ⚖ net-verdict label (stance-helpers.js) — changing one would
-- be a scoring change disguised as a relabel. Only issue_key, the rationale,
-- and (in exactly one documented case, below) support_meaning change.
--
-- Twelve rows are DELETED rather than re-pointed. Deleting is not a schema or
-- logic change and this migration is still additive in the only sense that
-- matters here — it rolls forward and never edits an applied migration — but
-- each deletion is justified individually:
--
--   * The EIGHT cabinet-confirmation rows. This repo's own curation rule
--     (see 20260725000000_vr_multi_issue_mappings_wave2.sql) is to SKIP "any
--     mapping whose direction could not be read from the text". The text of a
--     confirmation vote is "shall the Senate advise and consent to this
--     nomination" — it carries no direction on institutional power. Both a yea
--     and a nay ARE the Senate exercising advice and consent, so neither
--     advances nor cuts against "keep Congress as a real check", and
--     support_meaning has only two values (yea_supports / yea_opposes) with no
--     neutral state. Asserting either direction would manufacture signal on a
--     key that currently has no stance-holders and would therefore go unnoticed
--     until someone authored one. Nothing substantive is lost: all eight
--     nominations already carry department-specific mappings (Hegseth→defense,
--     Kennedy→healthcare, Vought→cut_spending, McMahon→school_choice,
--     Rubio→foreign_balance, Gabbard→america_first_fp, Patel and Bondi→
--     tough_on_crime + gov_transparency), and the roll call itself still appears
--     on each senator's Voting Record — it just stops moving an issue score it
--     had no business moving.
--   * H.R. 1968 gov_balance 60 ("a yea averts a government shutdown"). That is
--     a public-services claim, and the measure already carries gov_services 70
--     saying exactly that. Re-pointing it would collide with the existing row
--     under the (measure_id, issue_key) unique index, and would double-count.
--   * New York v. Trump democracy_balance 55 ("checks on unilateral executive
--     action under the APA") is the same proposition as that case's gov_balance
--     75 row, which survives on checks_balances. Redundant, lower weight.
--   * State of Washington v. Trump gov_balance 50 ("tests the scope of an
--     executive order against existing law") is the same proposition as that
--     case's democracy_balance 100 PRIMARY row, which survives on
--     checks_balances. Redundant, lower weight.
--   * H.R. 1526 democracy_balance 45 is redundant with that bill's surviving
--     row for the same reason — see the direction note immediately below.
--
-- THE ONE DIRECTION CHANGE, stated plainly so it is not a silent one
-- H.R. 1526 (No Rogue Rulings Act) was scored in BOTH directions at once: its
-- gov_balance 100 PRIMARY row said yea_supports ("reasserts limits on the
-- judiciary's power") while its democracy_balance 45 row said yea_opposes
-- ("narrowing nationwide injunctions weakens a check courts use"). The same
-- member's same vote was therefore counted as both consistent and contradicting
-- on two keys meant to express the same institutional idea. Only one can
-- survive on checks_balances. The surviving row keeps its weight (100) and its
-- PRIMARY flag but takes the yea_opposes direction, read off the bill's
-- operative text: it bars a district court from granting relief broader than
-- the parties, which removes the principal judicial remedy against unlawful
-- federal action. The old yea_supports reading was coherent only under the
-- mislabeled gov_balance framing, where "limits on the judiciary" sounded like
-- a check; on a key about checking the EXECUTIVE it is the opposite. The
-- rationale states the counterargument so the row stays readable to both sides.
-- This flips 34 members' consistency on that one row. It is called out here and
-- in the results report so it can be reversed on one line if judged wrong.
--
-- TWO ADJACENT DATA BUGS FIXED WHILE HERE
--   1. Seven measures end up with NO is_primary row. getIssueImpacts()
--      (voting-record.mts) routes whole-measure Distributional Impact rows by
--      `primaryByMeasure.get(measureId) === issueKey`, so a measure with no
--      primary attributes its impact rows to nothing at all and they vanish
--      from every issue view. H.R. 29 already had this bug (all four of its
--      rows were secondary); the six nominations whose only primary was the
--      deleted gov_balance row would have acquired it. Each is promoted to its
--      highest-weight remaining substantive mapping.
--   2. crypto_cbdc was present in ISSUE_MAP but missing from db/issue-keys.json
--      because the generator had not been re-run, so `?issue=crypto_cbdc` 400'd
--      while the quiz still offered it. Re-running gen-issue-keys.mjs for the
--      two new keys picked it up (105 → 108 keys). No SQL needed.
--
-- NOT changed: H.R. 1968 carries two cut_spending rows in SQL (100 primary from
-- wave6, 45 secondary from the H.R. 1 omnibus wave). Under ON CONFLICT DO
-- NOTHING the 45 never applied, so the applied DB state is already correct and
-- single-valued. Recorded here only so a future reader does not "fix" it twice.
--
-- Measures are resolved by natural key (number, and congress where the measure
-- has one — litigation and executive actions carry congress NULL). Every block
-- is guarded, every statement is idempotent (the re-point matches on the OLD
-- key, so a second run matches zero rows), and a collision guard means a
-- re-point that would violate the unique index is skipped rather than aborting
-- the migration.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  r        record;
  mid      integer;
  n_del    integer := 0;
  n_move   integer := 0;
  n_prim   integer := 0;
  n_prov   integer := 0;
  hit      integer;
BEGIN
  -- ═══ 1. Deletions ═══════════════════════════════════════════════════════
  -- Run before the re-points so nothing can collide on the way out.
  FOR r IN
    SELECT * FROM (VALUES
      -- Eight cabinet confirmations: no readable direction on institutional power.
      ('PN11-7',                                    119,          'gov_balance'),
      ('Kennedy — HHS',                             119,          'gov_balance'),
      ('Patel — FBI',                               119,          'gov_balance'),
      ('Bondi — AG',                                119,          'gov_balance'),
      ('Vought — OMB',                              119,          'gov_balance'),
      ('Gabbard — DNI',                             119,          'gov_balance'),
      ('McMahon — ED',                              119,          'gov_balance'),
      ('Rubio — State',                             119,          'gov_balance'),
      -- Redundant with a surviving row on the same measure.
      ('H.R. 1968',                                 119,          'gov_balance'),
      ('New York v. Trump (D.R.I. 1:25-cv-00039)',  NULL::integer, 'democracy_balance'),
      ('State of Washington v. Trump',              NULL::integer, 'gov_balance'),
      ('H.R. 1526',                                 119,          'democracy_balance')
    ) AS t(num, cg, del_key)
  LOOP
    SELECT id INTO mid FROM vr_measures
     WHERE number = r.num AND (r.cg IS NULL OR congress = r.cg) LIMIT 1;
    IF mid IS NOT NULL THEN
      DELETE FROM vr_measure_issues WHERE measure_id = mid AND issue_key = r.del_key;
      GET DIAGNOSTICS hit = ROW_COUNT;
      n_del := n_del + hit;
    END IF;
  END LOOP;

  -- ═══ 2. Promote a real primary where the only primary was just deleted ═══
  -- Highest-weight remaining substantive mapping, no ambiguity in any of these.
  FOR r IN
    SELECT * FROM (VALUES
      ('Patel — FBI',   119, 'tough_on_crime'),   -- FBI director; gov_transparency 50 is the runner-up
      ('Bondi — AG',    119, 'tough_on_crime'),   -- Attorney General; same shape
      ('Vought — OMB',  119, 'cut_spending'),     -- OMB director, weight 70
      ('Gabbard — DNI',119, 'america_first_fp'),  -- DNI, weight 60
      ('McMahon — ED',  119, 'school_choice'),    -- Education secretary, weight 60
      ('Rubio — State', 119, 'foreign_balance'),  -- Secretary of State, weight 60
      ('H.R. 29',       119, 'border_security')   -- pre-existing bug: never had a primary at all
    ) AS t(num, cg, prim_key)
  LOOP
    SELECT id INTO mid FROM vr_measures
     WHERE number = r.num AND (r.cg IS NULL OR congress = r.cg) LIMIT 1;
    IF mid IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM vr_measure_issues WHERE measure_id = mid AND is_primary) THEN
      UPDATE vr_measure_issues SET is_primary = true
       WHERE measure_id = mid AND issue_key = r.prim_key;
      IF FOUND THEN n_prim := n_prim + 1; END IF;
    END IF;
  END LOOP;

  -- ═══ 3. Re-point the eighteen surviving rows ════════════════════════════
  -- weight and is_primary are untouched by design; only the key, the rationale
  -- and (H.R. 1526 only) the direction move.
  FOR r IN
    SELECT * FROM (VALUES
      -- ── onto checks_balances (11) ──────────────────────────────────────
      ('H.R. 1526', 119, 'gov_balance', 'checks_balances', 'yea_opposes',
       'Bars a district court from granting injunctive relief broader than the parties before it, ending the nationwide injunction — the principal judicial remedy for halting federal action while it is challenged. Recorded as a yea cutting against judicial checks on the executive; supporters make the opposite case, that one district judge should not set national policy. Previously filed under "Balance the Budget", which the bill does not touch.'),
      ('H.R. 1919', 119, 'gov_balance', 'checks_balances', 'yea_supports',
       'Reserves to Congress the decision on whether the United States ever issues a central bank digital currency, barring the Federal Reserve from acting without explicit statutory authorization; a yea asserts legislative control over an executive-branch agency.'),
      ('S.J.Res. 37', 119, 'gov_balance', 'checks_balances', 'yea_supports',
       'A privileged joint resolution terminating the national emergency the tariffs were declared under; a yea reclaims for Congress the tariff power it had delegated to the executive.'),
      ('S.J.Res. 59', 119, 'democracy_balance', 'checks_balances', 'yea_supports',
       'A War Powers Resolution measure requiring congressional authorization for continued military action; a yea asserts Congress''s constitutional war-powers role against unilateral executive military action.'),
      ('State of Washington v. Trump', NULL::integer, 'democracy_balance', 'checks_balances', 'yea_supports',
       'The suit asks a federal court to hold that an executive order cannot override the Fourteenth Amendment and the citizenship statute; joining it asserts that the courts must enforce constitutional limits on executive action.'),
      ('New York v. Trump (D.R.I. 1:25-cv-00039)', NULL::integer, 'gov_balance', 'checks_balances', 'yea_supports',
       'The suit challenges a unilateral freeze of funds Congress had already appropriated — the power of the purse — and seeks relief under the Administrative Procedure Act; joining it asserts that the executive cannot impound appropriated money on its own.'),
      ('Newsom v. Trump (N.D. Cal. 3:25-cv-04870)', NULL::integer, 'democracy_balance', 'checks_balances', 'yea_supports',
       'Beyond the federalism question, the suit tests the statutory and constitutional limits on domestic use of federalized military force; joining it asks the courts to enforce those limits against the executive.'),
      ('Illinois v. Trump (N.D. Ill., 2025)', NULL::integer, 'democracy_balance', 'checks_balances', 'yea_supports',
       'Raises Posse Comitatus Act limits on using the military for domestic law enforcement; joining the suit asks the courts to enforce a statutory check on executive use of troops at home.'),
      ('Oregon v. Trump (D. Or., 2025)', NULL::integer, 'democracy_balance', 'checks_balances', 'yea_supports',
       'Tests the statutory limits on federalizing and deploying troops for domestic use; joining the suit asks the courts to enforce those limits on the executive.'),
      ('Oregon v. Trump (1:25-cv-00077)', NULL::integer, 'democracy_balance', 'checks_balances', 'yea_supports',
       'A separation-of-powers dispute over how far the International Emergency Economic Powers Act lets the executive set tariffs without Congress; joining the suit asks the courts to police that boundary.'),
      ('D.C. Guard deployment (2025)', NULL::integer, 'democracy_balance', 'checks_balances', 'yea_supports',
       'Raises the limits on domestic use of the National Guard and on federal authority over the District of Columbia; recorded as an assertion that those limits constrain the executive.'),
      -- ── onto states_federal_power (7) ──────────────────────────────────
      ('Newsom v. Trump (N.D. Cal. 3:25-cv-04870)', NULL::integer, 'gov_balance', 'states_federal_power', 'yea_supports',
       'A federalism dispute over whether the federal government may command a state''s National Guard without the governor''s consent; joining the suit asserts state authority over its own Guard. Previously filed under "Balance the Budget", which the case does not touch.'),
      ('Illinois v. Trump (N.D. Ill., 2025)', NULL::integer, 'gov_balance', 'states_federal_power', 'yea_supports',
       'A federalism dispute over federal deployment of National Guard troops into a state over the governor''s objection; joining the suit asserts state authority against federal direction.'),
      ('Oregon v. Trump (D. Or., 2025)', NULL::integer, 'gov_balance', 'states_federal_power', 'yea_supports',
       'A federalism dispute over federalizing and deploying National Guard troops into a state over the governor''s objection; joining the suit asserts state authority against federal direction.'),
      ('D.C. Guard deployment (2025)', NULL::integer, 'gov_balance', 'states_federal_power', 'yea_supports',
       'A federalism question: states sending their own Guard to the capital at federal request, amid federal control of District policing; recorded as the exercise of state discretion over state forces.'),
      ('H.R. 29', 119, 'gov_balance', 'states_federal_power', 'yea_supports',
       'Gives state attorneys general standing to sue the federal government over certain immigration-detention and enforcement decisions; a yea expands state authority to contest federal enforcement choices in court.'),
      ('H.J.Res. 88', 119, 'gov_balance', 'states_federal_power', 'yea_opposes',
       'Repeals the federal waiver that let California set stricter vehicle emission standards than the national floor; a yea narrows that state authority, so it is recorded as cutting against state power.'),
      ('H.J.Res. 89', 119, 'gov_balance', 'states_federal_power', 'yea_opposes',
       'Repeals the federal waiver that let California set stricter heavy-truck standards than the national floor; a yea narrows that state authority, so it is recorded as cutting against state power.')
    ) AS t(num, cg, old_key, new_key, meaning, why)
  LOOP
    SELECT id INTO mid FROM vr_measures
     WHERE number = r.num AND (r.cg IS NULL OR congress = r.cg) LIMIT 1;
    IF mid IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM vr_measure_issues WHERE measure_id = mid AND issue_key = r.new_key) THEN
      UPDATE vr_measure_issues
         SET issue_key = r.new_key, support_meaning = r.meaning, rationale = r.why
       WHERE measure_id = mid AND issue_key = r.old_key;
      IF FOUND THEN n_move := n_move + 1; END IF;
    END IF;
  END LOOP;

  -- ═══ 4. The four provision-level rows ═══════════════════════════════════
  -- vr_measure_provisions.issue_key is read at getIssueImpacts() ahead of the
  -- measure's primary, so an off-label provision key mis-routes that provision's
  -- Distributional Impact row on its own.
  FOR r IN
    SELECT * FROM (VALUES
      ('H.R. 29',   119, 'State standing to sue the federal government', 'states_federal_power', 'yea_supports'),
      ('S. 1582',   119, 'Dual federal–state oversight',                 'states_federal_power', 'yea_supports'),
      ('H.R. 1919', 119, 'Congressional authorization required',         'checks_balances',      'yea_supports'),
      -- Same direction correction as the measure-level H.R. 1526 row above.
      ('H.R. 1526', 119, 'Bar on universal (nationwide) injunctions',    'checks_balances',      'yea_opposes')
    ) AS t(num, cg, lab, new_key, meaning)
  LOOP
    SELECT id INTO mid FROM vr_measures
     WHERE number = r.num AND (r.cg IS NULL OR congress = r.cg) LIMIT 1;
    IF mid IS NOT NULL THEN
      UPDATE vr_measure_provisions
         SET issue_key = r.new_key, support_meaning = r.meaning
       WHERE measure_id = mid AND label = r.lab AND issue_key = 'gov_balance';
      IF FOUND THEN n_prov := n_prov + 1; END IF;
    END IF;
  END LOOP;

  RAISE NOTICE 'off-label correction: % deleted, % re-pointed, % primaries restored, % provisions re-keyed',
    n_del, n_move, n_prim, n_prov;
END $$;
