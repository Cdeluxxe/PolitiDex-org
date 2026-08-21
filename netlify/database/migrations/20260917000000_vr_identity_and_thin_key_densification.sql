-- ─────────────────────────────────────────────────────────────────────────────
-- Formal densification, 118th/119th: thin-key mappings behind the identity pass.
--
-- This migration is the mapping half of a pass whose first half was data, not
-- SQL: eighteen 118th/119th measures that were carrying roll-call votes with no
-- plain-language identity got as-passed / as-enrolled summaries written from
-- primary text in db/vr-measure-identity.json. That file is the input to
-- applyCuratedMeasureIdentity() in netlify/lib/vr-ingest.ts, which fills a
-- provisional title and an empty summary and carries no issue mappings at all.
-- So the mappings that the newly-read text actually justifies have to be written
-- here, and only those.
--
-- Nothing here changes the Direction Match formula, a floor, a guard, an
-- existing weight, an existing direction, or a rationale. No new issue keys. No
-- stances. No new roll calls and no new member votes: every roll already on file
-- for the eighteen measures was checked against its govinfo BILLSTATUS
-- recordedVote entry on chamber, congress, session, roll number and date, all
-- eighteen matched, and no ballot was invented to fill a gap.
--
-- SELECTION. Candidates were ranked from live data — attributed member-vote
-- volume on rolls already ingested, crossed with whether the key the text points
-- at is thin. 119th first, then remaining 118th depth. Six new rows survived the
-- read. They are few because the corpus is already dense: most of the
-- high-traffic measures reviewed turned out to be mapped correctly and
-- completely, which is a finding, not a shortfall.
--
-- MAPPED — six rows, all secondary, plus six repair re-assertions.
--
--   H.R. 8595 (119th) · election_security 100, voter_id 70, voting_access 60.
--     The measure on file as an appropriations bill is a two-division vehicle.
--     Division A is national security, State and related programs. Division B is
--     the Safeguard American Voter Eligibility Act, and it is only three
--     sections long: 101 short title, 102 documentary proof of citizenship as a
--     condition of registration, 103 photo identification as a condition of
--     casting. Runbook rule 22 governs: the section inside a vehicle is still
--     the section you voted for. The three keys the text reaches were unmapped
--     on this measure, and two of them — voter_id and election_integrity — had
--     exactly one instrument in the whole corpus.
--
--   H.J.Res. 44 (118th) · gov_regulation 60.
--     Rule 3 reserves gov_regulation for measures whose primary operative
--     purpose is regulation itself and names Congressional Review Act
--     disapprovals as the paradigm case. This resolution is one sentence of
--     operative text and that sentence is a CRA disapproval. It matches
--     H.J.Res. 88 and H.J.Res. 89, which carry a subject primary plus
--     gov_regulation 60 secondary with the identical shape.
--
--   H.R. 1968 (119th) · health_rural 45, immig_fentanyl 30.
--     The Full-Year Continuing Appropriations and Extensions Act, 2025 is not
--     only a continuing resolution: divisions B and C carry the health extenders
--     and the fentanyl scheduling extension that would otherwise have lapsed on
--     March 31, 2025. Both rows use the weight the same reading already earned
--     on another measure — health_rural 45 matches H.R. 7148's row, and
--     immig_fentanyl 30 matches S. 2296's.
--
-- REPAIR. Six rows in the July 2026 seeds sit inside an IF m_id IS NULL THEN
-- branch, so they were authored only for the case where the seed itself created
-- the measure row. If a backfill had already created S. 331 (119th) or H.R. 82
-- (118th), the branch never ran and the mappings never landed. They are
-- re-asserted here unconditionally with ON CONFLICT DO NOTHING, byte-identical
-- to their authored text and with no source_url, so that where they did land
-- nothing changes and where they did not they now exist. The one exception is
-- S. 331 health_mental, which takes the text the September 2026 framed-rationale
-- rewrite gave it rather than the original; re-emitting the pre-rewrite framing
-- would have been a regression if the row were missing. These are not new
-- authorship — runbook rule 21 leaves the live rationale to the first writer.
--
-- DECLINED, written down so the next pass does not re-litigate them.
--
--   power_of_purse on H.R. 4 (119th), the Rescissions Act of 2025. The
--     direction is not readable from the text. Enacting a presidential
--     rescission request is Congress exercising its power over appropriated
--     funds and, in the same act, relinquishing the money it had appropriated.
--     Rule 5 applies: the nay bloc has two flanks, members who wanted the
--     spending kept and members who wanted deeper cuts than the request. A
--     directional row would misattribute one of them. Procedure is not policy.
--
--   election_integrity on H.R. 8595. Real, but election_security and voter_id
--     already carry the same conviction on the same measure, which is the
--     express refuse condition in rule 22. Adding a third would triple-count one
--     division.
--
--   gov_transparency on S. 1582, the GENIUS Act. Section 19 adds payment
--     stablecoins to the 5 U.S.C. 13104(a)(3) financial-disclosure line. The
--     provision is real and the direction is clean, but it is one section of a
--     regulatory statute and lands below_floor, whose floor is 20.
--
--   crypto_cbdc on S. 1582 and family_support on H.R. 1 (119th). Both already
--     live — crypto_cbdc at weight 90 since the July 2026 orphan-key repair
--     re-pointed it, family_support at 45 since September 2026. Recorded because
--     both were on this pass's candidate list before the mapping index was read
--     correctly, and the next reader should not spend the same time.
--
--   veterans and foreign_balance on H.R. 8800 and S. 2296. Reserved to the
--     cross-NDAA pass. The runbook's follow-up item 0b makes those two keys
--     all-or-none across S. 1605, S. 1071, H.R. 8800, H.R. 2670 and H.R. 5009;
--     mapping two of the five here would leave the axis lopsided in exactly the
--     way that item exists to prevent.
--
--   A second key on H.R. 4405 (119th), the Epstein Files Transparency Act.
--     gov_transparency 100 primary is the whole instrument. There is nothing
--     else in the text.
--
--   checks_balances anywhere. Rule 28: the general key takes no roll-call
--     mappings.
--
--   The SAVE-family curated measures — H.R. 8281, H.R. 192, H.R. 884, S. 1383,
--     H.R. 22 — were excluded by the brief except to fix a wrong label or
--     mapping, and none was wrong.
--
-- SOURCES (all fetched and read; congress.gov and api.govinfo.gov are not
-- reachable from this environment, govinfo bulkdata and content are):
--   https://www.govinfo.gov/content/pkg/BILLS-119hr8595eh/html/BILLS-119hr8595eh.htm
--   https://www.govinfo.gov/content/pkg/BILLS-118hjres44eh/html/BILLS-118hjres44eh.htm
--   https://www.govinfo.gov/content/pkg/PLAW-119publ4/html/PLAW-119publ4.htm
-- ─────────────────────────────────────────────────────────────────────────────


DO $$
DECLARE
  m record;
  n_rows integer := 0;
BEGIN

  -- ── H.R. 8595 (119th) — national security / State appropriations carrying the
  --    Safeguard American Voter Eligibility Act as Division B. Engrossed text. ──
  FOR m IN SELECT id FROM vr_measures WHERE number = 'H.R. 8595' AND congress = 119 LOOP
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m.id, 'election_security', 100, false, 'yea_supports',
        'Division B is the Safeguard American Voter Eligibility Act, and its section 102 rewrites the National Voter Registration Act so that "[u]nder any method of voter registration in a State, the State shall not accept and process an application to register to vote in an election for Federal office unless the applicant presents documentary proof of United States citizenship". A new NVRA section 3(b) fixes the acceptable-document list in federal law — a REAL ID-compliant credential indicating citizenship, a United States passport, a military identification card with a record of service showing a United States place of birth, or a Federal, State or Tribal photo identification showing the same — and section 102 extends the requirement to the mail form, to the motor-vehicle channel and to voter registration agencies, which must record receipt of the proof for each applicant. A yea enacts that regime; a nay leaves registration on attestation of citizenship under penalty of perjury. The row is weighted 100 because within Division B this is the operative purpose, and it is secondary rather than primary because gov_services already holds the primary flag for the appropriations vehicle Division A funds, which is the same shape H.R. 22 carries on this key.',
        'https://www.govinfo.gov/content/pkg/BILLS-119hr8595eh/html/BILLS-119hr8595eh.htm'),
      (m.id, 'voter_id', 70, false, 'yea_supports',
        'Division B section 103 inserts a new section 303A into title III of the Help America Vote Act: "the appropriate State or local election official may not provide a ballot for an election for Federal office to an individual who desires to vote in person unless the individual presents to the official a valid physical photo identification", and may not accept a ballot cast other than in person without a copy of one. New section 303A(c) enumerates what counts — a State driver''s license or motor-vehicle identification card with a photo and an expiration date, a United States passport, a military identification, or a Tribal photo identification with an expiration date. Section 303A(d) requires every State to notify registrants of the requirement at the time they apply, and online registration systems to do so before the application is completed. This is the corpus''s second instrument on the key and the first to reach the casting step: H.R. 22''s requirement runs to registration, and this one runs to the ballot itself. Weighted 70 rather than at the citizenship requirement''s level because section 103 is one of Division B''s two operative sections and the narrower of them.',
        'https://www.govinfo.gov/content/pkg/BILLS-119hr8595eh/html/BILLS-119hr8595eh.htm'),
      (m.id, 'voting_access', 60, false, 'yea_opposes',
        'Both steps of casting a federal ballot are gated by Division B: section 102 conditions getting on the rolls on documentary proof of citizenship, and section 103 conditions receiving or having counted a ballot on photo identification. A yea adds two documentary conditions that do not exist in current federal law, which is what this key measures, so the row is coded yea_opposes. The provisions running the other way were read and are named rather than dropped. Section 102 requires the election official to send an applicant who has not met the requirement a notice with instructions for meeting it, requires each State in consultation with the Election Assistance Commission to make reasonable accommodations for an applicant with a disability using the mail form, and requires each State to establish a process under which an applicant who cannot produce a listed document may sign an attestation under penalty of perjury and submit other evidence for an official determination. Section 103 lets an in-person voter without identification cast a provisional ballot and cure it within 3 days, or file a State affidavit of religious objection to being photographed; lets a mail voter who cannot obtain a copy after reasonable efforts substitute the last four digits of a Social Security number plus an affidavit; exempts absent uniformed services voters and voters covered by the Voting Accessibility for the Elderly and Handicapped Act entirely; and directs States to provide free public access to a copier or scanner in courts, libraries and police stations. Those are cure paths and exemptions around a requirement, not the absence of one, which is why the row is directional. Weighted 60 rather than at the level S. 1383 carries because there the requirement is the whole bill and here it is one division of a vehicle whose other division is the appropriation.',
        'https://www.govinfo.gov/content/pkg/BILLS-119hr8595eh/html/BILLS-119hr8595eh.htm')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
    n_rows := n_rows + 3;
  END LOOP;

  -- ── H.J.Res. 44 (118th) — CRA disapproval of the ATF stabilizing-brace rule.
  --    Passed the House 219-210; failed in the Senate 49-50, so there is no
  --    enrolled text and the engrossed House text is the text that was voted. ──
  FOR m IN SELECT id FROM vr_measures WHERE number = 'H.J.Res. 44' AND congress = 118 LOOP
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m.id, 'gov_regulation', 60, false, 'yea_supports',
        'The resolution has one operative sentence and it is a Congressional Review Act disapproval: "That Congress disapproves the rule submitted by the Bureau of Alcohol, Tobacco, Firearms, and Explosives relating to Factoring Criteria for Firearms with Attached Stabilizing Braces (ATF final rule 2021R-08F), and such rule shall have no force or effect." Under chapter 8 of title 5 that also bars the agency from reissuing the rule in substantially the same form absent new legislation. A yea strikes an agency rule off the books; a nay leaves it in force. Weighted 60 and secondary because the subject the rule regulates is what the gun_rights primary already carries, matching H.J.Res. 88 and H.J.Res. 89, which pair a subject primary with gov_regulation 60 on the same reasoning.',
        'https://www.govinfo.gov/content/pkg/BILLS-118hjres44eh/html/BILLS-118hjres44eh.htm')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
    n_rows := n_rows + 1;
  END LOOP;

  -- ── H.R. 1968 (119th) — Full-Year Continuing Appropriations and Extensions
  --    Act, 2025, P.L. 119-4. Enrolled text as enacted. ──
  FOR m IN SELECT id FROM vr_measures WHERE number = 'H.R. 1968' AND congress = 119 LOOP
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m.id, 'health_rural', 45, false, 'yea_supports',
        'Division B carries the health authorities that were set to lapse on March 31, 2025, and they are disproportionately the rural and safety-net ones. Sec. 2101 extends funding for community health centers, the National Health Service Corps and teaching health centers that operate graduate medical education programs; Sec. 2201 continues the increased inpatient payment adjustment for low-volume hospitals; Sec. 2202 extends the Medicare-Dependent Hospital program; Sec. 2203 extends the ground and air ambulance add-on payments; Sec. 2206 extends the work geographic index floor that holds up physician payment in low-cost areas; Sec. 2207 extends the Medicare telehealth flexibilities, including the removal of the geographic originating-site restriction; and Sec. 2401 in Title IV delays the Medicaid disproportionate share hospital allotment reductions. A yea keeps those authorities running; a nay lets them expire. This is the same reading and the same weight the identical extenders earned on H.R. 7148.',
        'https://www.govinfo.gov/content/pkg/PLAW-119publ4/html/PLAW-119publ4.htm'),
      (m.id, 'immig_fentanyl', 30, false, 'yea_supports',
        'Division C Sec. 3105 extends the temporary class-wide scheduling order for fentanyl-related substances, amending section 2 of the Temporary Reauthorization and Study of the Emergency Scheduling of Fentanyl Analogues Act by striking "March 31, 2025" and inserting "September 30, 2025", effective as if included in that Act''s enactment. Without it the class-wide Schedule I placement would have lapsed on March 31, 2025; the permanent placement did not arrive until the HALT Fentanyl Act in July. A yea holds the schedule in place for another six months. Weighted 30, the same as the comparable provision on S. 2296, because it is one section of a government-funding vehicle rather than the instrument''s purpose.',
        'https://www.govinfo.gov/content/pkg/PLAW-119publ4/html/PLAW-119publ4.htm')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
    n_rows := n_rows + 2;
  END LOOP;

  RAISE NOTICE 'Identity densification: % new curated mapping row(s) asserted', n_rows;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- Conditional-branch repair. Byte-identical re-assertion of six rows authored
-- inside an IF m_id IS NULL THEN branch in July 2026. No source_url, matching
-- the original INSERT column list. ON CONFLICT DO NOTHING, so a row that landed
-- the first time is untouched.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  m record;
  n_rows integer := 0;
BEGIN

  -- ── S. 331 (119th) — HALT Fentanyl Act, P.L. 119-26. ──
  FOR m IN SELECT id FROM vr_measures WHERE number = 'S. 331' AND congress = 119 LOOP
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
      (m.id, 'immig_fentanyl', 100, true,  'yea_supports', 'Directly targets the fentanyl overdose crisis by making class-wide Schedule I placement of fentanyl-related substances permanent.'),
      (m.id, 'tough_on_crime',  75, false, 'yea_supports', 'Attaches mandatory-minimum penalties and quantity triggers to fentanyl-analogue offenses.'),
      (m.id, 'health_mental',   45, false, 'yea_opposes',  'Permanently places fentanyl-related substances as a class in Schedule I and applies to them the quantity thresholds and mandatory-minimum prison terms that attach to fentanyl analogues, while adding a registration pathway for Schedule I research. A yea sets the federal response to this class of substances in criminal-penalty terms.')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
    n_rows := n_rows + 3;
  END LOOP;

  -- ── H.R. 82 (118th) — Social Security Fairness Act of 2023, P.L. 118-273. ──
  FOR m IN SELECT id FROM vr_measures WHERE number = 'H.R. 82' AND congress = 118 LOOP
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
      (m.id, 'social_security', 100, true,  'yea_supports', 'Repeals WEP and GPO to raise Social Security benefits for public-sector retirees with non-covered pensions.'),
      (m.id, 'cost_living',      60, false, 'yea_supports', 'Increases monthly retirement income for affected teachers, firefighters, police, and other public workers.'),
      (m.id, 'national_debt',    55, false, 'yea_opposes',  'CBO scored the repeal at roughly $196 billion added to federal deficits over a decade — a Yea is tagged as cutting against debt reduction.')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
    n_rows := n_rows + 3;
  END LOOP;

  RAISE NOTICE 'Conditional-branch repair: % row(s) re-asserted', n_rows;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- Verification.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  want record;
  n integer;
BEGIN
  FOR want IN
    SELECT * FROM (VALUES
      ('H.R. 8595',   119, 'election_security', 'yea_supports'),
      ('H.R. 8595',   119, 'voter_id',          'yea_supports'),
      ('H.R. 8595',   119, 'voting_access',     'yea_opposes'),
      ('H.J.Res. 44', 118, 'gov_regulation',    'yea_supports'),
      ('H.R. 1968',   119, 'health_rural',      'yea_supports'),
      ('H.R. 1968',   119, 'immig_fentanyl',    'yea_supports'),
      ('S. 331',      119, 'immig_fentanyl',    'yea_supports'),
      ('S. 331',      119, 'tough_on_crime',    'yea_supports'),
      ('S. 331',      119, 'health_mental',     'yea_opposes'),
      ('H.R. 82',     118, 'social_security',   'yea_supports'),
      ('H.R. 82',     118, 'cost_living',       'yea_supports'),
      ('H.R. 82',     118, 'national_debt',     'yea_opposes')
    ) AS t(number, congress, issue_key, support_meaning)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM vr_measures WHERE number = want.number AND congress = want.congress) THEN
      RAISE NOTICE 'Verification: % (%th) is not in this database; its row was skipped.',
        want.number, want.congress;
      CONTINUE;
    END IF;

    SELECT count(*) INTO n FROM vr_measures me
      JOIN vr_measure_issues mi ON mi.measure_id = me.id
     WHERE me.number = want.number AND me.congress = want.congress
       AND mi.issue_key = want.issue_key;
    IF n = 0 THEN
      RAISE EXCEPTION 'Verification: % (%th) did not receive its % row.',
        want.number, want.congress, want.issue_key;
    END IF;

    -- Direction is the half of a mapping that can silently invert every
    -- member's score on the axis, so it is asserted, not assumed.
    SELECT count(*) INTO n FROM vr_measures me
      JOIN vr_measure_issues mi ON mi.measure_id = me.id
     WHERE me.number = want.number AND me.congress = want.congress
       AND mi.issue_key = want.issue_key
       AND mi.support_meaning = want.support_meaning;
    IF n = 0 THEN
      RAISE EXCEPTION 'Verification: % (%th) % is not coded %.',
        want.number, want.congress, want.issue_key, want.support_meaning;
    END IF;
  END LOOP;

  -- No measure may end this pass with two primaries.
  SELECT count(*) INTO n FROM (
    SELECT mi.measure_id FROM vr_measure_issues mi
      JOIN vr_measures me ON me.id = mi.measure_id
     WHERE me.number IN ('H.R. 8595', 'H.J.Res. 44', 'H.R. 1968', 'S. 331', 'H.R. 82')
       AND mi.is_primary
     GROUP BY mi.measure_id HAVING count(*) > 1
  ) d;
  IF n > 0 THEN
    RAISE EXCEPTION 'Verification: % measure(s) touched by this pass now carry more than one primary issue.', n;
  END IF;

  -- The declines, asserted where a later pass would most plausibly slip one in.
  SELECT count(*) INTO n FROM vr_measures me
    JOIN vr_measure_issues mi ON mi.measure_id = me.id
   WHERE me.number = 'H.R. 8595' AND me.congress = 119
     AND mi.issue_key IN ('election_integrity', 'checks_balances');
  IF n > 0 THEN
    RAISE EXCEPTION 'Verification: H.R. 8595 picked up election_integrity or checks_balances; both were declined on the record above.';
  END IF;

  SELECT count(*) INTO n FROM vr_measures me
    JOIN vr_measure_issues mi ON mi.measure_id = me.id
   WHERE me.number = 'H.R. 4' AND me.congress = 119
     AND mi.issue_key = 'power_of_purse';
  IF n > 0 THEN
    RAISE NOTICE 'Verification: H.R. 4 (119th) carries a power_of_purse row. This pass declined that mapping as directionally unreadable; if a later pass added it deliberately, update the DECLINED note at the top of this file.';
  END IF;

  -- Vote-row shape on the measures this pass touched. There is no politicians
  -- table to join against — vr_member_votes.politician_id is a text slug
  -- resolved in application code through db/vr-member-map.json, and
  -- scripts/test-vr-vote-seed.mjs is what proves every slug resolves.
  SELECT count(*) INTO n FROM vr_measures me
    JOIN vr_rollcalls rc ON rc.measure_id = me.id
    JOIN vr_member_votes mv ON mv.rollcall_id = rc.id
   WHERE me.number IN ('H.R. 8595', 'H.J.Res. 44', 'H.R. 1968', 'S. 331', 'H.R. 82')
     AND (mv.politician_id IS NULL
          OR btrim(mv.politician_id) = ''
          OR mv.position NOT IN ('yea', 'nay', 'present', 'not_voting'));
  IF n > 0 THEN
    RAISE EXCEPTION 'Verification: % member vote(s) on the measures this pass touched have a blank member or an unreadable position.', n;
  END IF;
END $$;
