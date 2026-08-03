-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — map the substantive remainder of the unmapped measures
-- ─────────────────────────────────────────────────────────────────────────────
-- 42 measures carry roll-call votes and have no issue mapping (Gap 1 in
-- db/vr-coverage-report.md, 1,755 member-votes). This pass reviews all 42, maps
-- the six that survive the project's standing curation rules, and writes down why
-- each of the other 36 stays unmapped so a later wave inherits the reasoning
-- instead of re-litigating it. The committed report says 43 because it predates
-- 20260727000000, which re-pointed roll 247 from the Speaker row onto H.Amdt. 87.
--
-- Three primary sources decided this pass, all three fetched for it:
--
--   * GPO BILLSTATUS bulk data (www.govinfo.gov/bulkdata/BILLSTATUS/119/…) — the
--     Library of Congress feed Congress.gov renders, and the same source
--     db/vr-measure-identity.json already cites. Read for the CRS summary of
--     every named bill and resolution in Gap 1.
--   * The reported text of H.R. 8800, the FY2027 NDAA
--     (www.govinfo.gov/bulkdata/BILLS/119/2/hr/BILLS-119hr8800rh.xml), for the
--     sections its amendments strike.
--   * The Rules Committee reports that carry the full text of every amendment
--     made in order — H. Rept. 119-755 for H.R. 8800 and H. Rept. 119-255 for
--     H.R. 3838, both at govinfo.gov/content/pkg/CRPT-119hrpt{755,255}/html/.
--     This is the source that unblocked the pass. The Congress.gov vote feed
--     truncates an amendment's purpose line, so amendments reach us as "strike
--     section NNN, relating to …" or trailing off mid-clause; the Rules report
--     prints both a one-line summary and the operative text for each one. It
--     produced one mapping that was previously impossible (H.Amdt. 87, whose
--     purpose no source we held carried at all), confirmed three that were
--     provisional, and settled four AGAINST mapping on their merits rather than
--     on missing information.
--
-- The House Clerk's roll-call XML (clerk.house.gov/evs/2026/roll{255,275,276}.xml
-- and /2025/roll247.xml) ties each roll to its Part A amendment number, which is
-- how the report text is matched to the vote: roll 255 → Part A No. 1, roll 275 →
-- No. 44, roll 276 → No. 316, roll 247 → No. 15 of H.R. 3838's Part A. Note that
-- the Clerk names the member who offered the amendment on the floor while the
-- report names its author — Part A No. 1 is Rep. Roy's amendment, offered by
-- Rep. Boebert as designee — so neither name is used here without the other.
--
-- ── MAPPED (6 measures, 8 rows, 218 member-votes) ────────────────────────────
--   H.Con.Res. 113  roll 281  216-214  national_debt
--   H.R. 7757       roll 228  267-117  tech_balance
--   H.Amdt. 242     roll 255   65-361  gov_transparency
--   H.Amdt. 261     roll 275  232-199  privacy_rights
--   H.Amdt. 266     roll 276  175-254  gov_waste, cut_spending
--   H.Amdt. 87      roll 247  227-201  lgbtq_rights
--
-- Coverage delta, measured against the live tables both ways with
-- scripts/vr-coverage-report.mjs — once with these six removed from the curated
-- seed and once with them in, rather than estimated:
--
--   recorded yea/nay votes on a mapped measure   3,991 → 4,209   (+218)
--   rankable member-votes                        2,237 → 2,286   (+49)
--   rankable (member, issue) pairs                 664 →   666   (+2)
--   people with at least one rankable record        182 →   182   (+0)
--   Gap 1                        42 measures / 1,755 mv → 36 / 1,537
--
-- Per measure the rankable contribution is H.Con.Res. 113 +11, H.Amdt. 266
-- +32 (30 on cut_spending, 2 on gov_waste), H.Amdt. 242 +4, H.R. 7757 +1,
-- H.Amdt. 261 +1, H.Amdt. 87 +0.
--
-- Read those last three lines honestly. 49 newly-rankable member-votes open only
-- 2 new (member, issue) pairs, because 47 of the 49 land on a pair some other
-- measure already made rankable — this pass mostly deepens the evidence under
-- existing records rather than widening the ranking. And H.Amdt. 87 adds 0: not
-- one of the 38 members whose vote we hold on it has a stated lgbtq_rights
-- position, so its whole value today is Gap 2 pressure — a correctly mapped
-- measure waiting on a stance pass. It is mapped anyway, because the mapping is
-- true and the alternative is leaving a sourced fact out of the record to keep a
-- delta looking tidy.
--
-- The notice at the foot of this file prints the post-deploy figures against the
-- real tables.
--
-- ── DELIBERATELY LEFT UNMAPPED (36 measures, 1,537 member-votes) ─────────────
-- (a) RULES ARE NOT POLICY — 7 measures, 502 member-votes. H.Res. 377, 682, 916,
--     1075, 1398, 1423 and 1438 are "providing for consideration of…" resolutions:
--     party-line votes on floor procedure, taken before anyone has voted on the
--     policy inside the bills they queue. Mapping one reads whip discipline as
--     conviction and scores members on legislation they had not yet reached.
--     This is the largest single block in Gap 1 and it stays unmapped on purpose;
--     the whole point of the block is that its size is not a reason to touch it.
--     scripts/test-mapping-discipline.mjs now fails the build if any of them is
--     ever mapped, in a migration or in the curated seed.
--
--     Worth recording that the rule resolutions are not useless to us even so:
--     the Rules Committee reports they generate are exactly the documents that
--     made six of this pass's mappings possible. The rule is unmappable; its
--     paperwork is the best primary source we have for amendments.
--
--     The notice at the foot of this file counts 9 rule ROWS against these 7
--     measures: H.Res. 377 exists three times in vr_measures, and two of the
--     three carry no votes. That is a known duplicate, left alone here because
--     de-duplicating measure rows is identity work and not this pass's job —
--     but it is why every insert below loops over all matching rows.
--
-- (b) NEAR-UNANIMOUS — 19 measures, 670 member-votes. H.R. 530 (376-5), H.R. 915
--     (414-4), H.R. 1118 (421-1), H.R. 1402 (409-15), H.R. 1503 (406-1), H.R. 1676
--     (400-0), H.R. 2478 (414-2), H.R. 3106 (400-7), H.R. 3424 (397-1), H.R. 3425
--     (402-0), H.R. 4423 (385-0), H.R. 4541 (394-6), H.R. 5348 (386-0), H.R. 5362
--     (418-0), H.R. 7128 (373-15), H.R. 7401 (415-0), H.R. 8823 (396-0), H.R. 8897
--     (398-12) and S. 356 (399-5) all cleared the House with 96% or more of the
--     votes cast on one side, most of them on the suspension calendar.
--     db/vr-ingest-runbook.md: "skip unanimous / near-unanimous measures: they
--     differentiate nobody, so they add attribution without adding signal."
--
--     Several have a perfectly clean subject fit — H.R. 7401 and H.R. 915 to
--     econ_smallbiz, H.R. 7128 and H.R. 2478 to econ_corp_account, H.R. 4541 to
--     healthcare, H.R. 1118 and H.R. 3424 to gov_waste — so this is the rule doing
--     work, not a gap in the vocabulary. Mapping them would hand every member who
--     holds a matching stance a "consistent" receipt for a vote nobody opposed:
--     _issueRecordSummary in stance-helpers.js counts records unweighted, so 19
--     uncontested measures would move real verdicts even at a low weight. This is
--     the single biggest judgement call in the pass and the one most worth
--     revisiting deliberately rather than by accident.
--
-- (c) NO KEY IN THE 108-KEY VOCABULARY — 5 measures, 179 member-votes. Never
--     stretch a measure onto an issue the shipped vocabulary cannot express.
--       H.R. 36    MEGOBARI Act (349-42). Mandatory visa- and property-blocking
--                  sanctions on Georgian officials undermining Georgia's security.
--                  There is no sanctions, human_rights or foreign_aid key, and
--                  america_first_fp / foreign_balance are postures about wars and
--                  alliances. Contested enough to be worth mapping and still not
--                  mappable — an honest unknown, not an oversight. (Note for the
--                  next reader: 20260726120000 groups H.R. 36 with the 385-0 /
--                  386-0 / 397-1 suspension bills, but 20260724130000 records it
--                  at 349-42. It is unmapped on the no-key rule, not on
--                  near-unanimity.)
--       H.R. 1069  PROTECT Our Kids Act (247-164). Bars federal education funds to
--                  schools supported by the Chinese government, including
--                  Confucius Institutes. The subject is foreign-adversary
--                  influence in schools; no key covers it, and america_first is a
--                  foreign-policy posture about aid and entanglement, so a member
--                  who rejects that posture and still votes to bar PRC funding of
--                  grade schools is not contradicting themselves.
--       H.R. 139   Sunshine Protection Act (308-117). Permanent daylight saving
--                  time. Contested, clearly substantive, and nothing in the
--                  vocabulary corresponds to it.
--       H.R. 973   Lithium-Ion Batteries Act (365-42) and
--       S. 2503    ROTOR Act (264-133). Both direct an agency to issue or enforce
--                  a safety mandate — a CPSC rule for micromobility batteries and
--                  an ADS-B In equipment requirement for aircraft. Both were
--                  reconsidered here against gov_regulation and both are declined
--                  on a rule this pass is making explicit: gov_regulation is for
--                  measures whose PRIMARY OPERATIVE PURPOSE is the regulatory
--                  question itself — CRA disapprovals, regulatory budgets, red-tape
--                  hotlines, rulemaking-quality bills — not for every measure that
--                  happens to work through a rule. Without that line, "creates a
--                  federal mandate" would sweep in most of the statute book and
--                  turn a deregulation stance into a contradiction on any safety
--                  vote. Recorded in db/vr-ingest-runbook.md.
--       (H.R. 1503, Stop Forced Organ Harvesting Act, is also no-key — same
--        reasoning as H.R. 36 — and is counted under (b) at 406-1.)
--
-- (d) H.R. 8800 AMENDMENTS WITH THEIR FULL TEXT NOW IN HAND, STILL NOT MAPPABLE —
--     4 measures, 148 member-votes. Each of these was previously blocked on a
--     truncated purpose line. H. Rept. 119-755 supplies the complete text, and all
--     four are declined on their merits:
--       H.Amdt. 243  (61-360) Part A No. 2: strikes section 521 — which bars
--                    nationals of a "covered nation" (10 U.S.C. 4872) from the
--                    Service Academies — and replaces it with a prohibition on ALL
--                    foreign nationals attending them. The direction is not
--                    readable: a nay can mean "keep the targeted covered-nation
--                    ban", which is itself the sovereignty-minded position, so
--                    america_first_fp would score both sides of the same posture
--                    as opposites.
--       H.Amdt. 244  (65-359) Part A No. 3: strikes section 524, preserving the
--                    existing statutory cap on cadets and midshipmen who may take
--                    alternative service obligations to pursue professional
--                    athletic careers. No key, and no plausible candidate.
--       H.Amdt. 245  (265-161) Part A No. 4: strikes section 518, a pilot using
--                    automated voice-based risk assessment to target drug testing
--                    "in place of universal urinalysis". The section both applies
--                    automated voice analysis to servicemembers AND replaces
--                    testing everyone with testing some, so privacy_rights points
--                    in both directions at once: a yea rejects voice profiling and
--                    restores universal urinalysis. Genuinely contestable — left
--                    unmapped, and recorded here so the next pass does not have to
--                    re-read the section to reach the same answer.
--       H.Amdt. 259  (207-224) Part A No. 30: establishes a National Security
--                    Investor Personnel Clearance Pilot Program under which
--                    eligible investors may sponsor security clearances for
--                    "cleared investment professionals" supporting investment in
--                    small and medium businesses developing national-security
--                    technologies, and makes the program uncapped. Identified, but
--                    not mapped: the operative mechanism is a DoD clearance-
--                    sponsorship program, so tech_innovation or econ_smallbiz would
--                    be mapping the amendment's stated motivation rather than what
--                    it does — the same error the gov_regulation rule above exists
--                    to prevent. A nay here is as likely to be a counterintelligence
--                    objection as an anti-innovation one.
--
-- (e) S. 1071 (FY2026 NDAA, 38 votes). The only roll call we hold is roll 319, a
--     motion to commit, corrected to that in 20260726180000. The House passed the
--     bill 312-112 the next day, so most members who voted to commit also voted
--     for passage; reading the commit vote as a position on defence authorisation
--     would be wrong in either direction. Unchanged.
--
-- Changes no schema and adds no scoring logic. Every INSERT is guarded by
-- ON CONFLICT (measure_id, issue_key) DO NOTHING and every block loops over EVERY
-- row matching the measure's natural key (number + congress) rather than LIMIT 1,
-- because H.Res. 377 proved a number can exist twice and a mapping that lands on
-- only one of two rows is a silent half-miss. Re-running is a no-op. The same six
-- measures are mirrored into db/vr-issue-seed.json so applyCuratedIssueSeed()
-- re-attaches them after any future ingest.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  m record;
  n_rows int := 0;
BEGIN
  -- ── H.Con.Res. 113 — FY2027 congressional budget resolution (37 votes) ──────
  -- 216-214, the most closely divided measure in Gap 1. Wave 2 and the July
  -- coverage pass both declined it because a budget resolution's direction
  -- depends on the budgetary levels it sets and our record did not contain them.
  -- The CRS summary on the GPO BILLSTATUS record supplies exactly that and says
  -- it plainly: the resolution "provides reconciliation instructions for
  -- legislation that increases the deficit", instructing four House committees to
  -- report legislation increasing the deficit over FY2027-FY2036 by not more than
  -- specified amounts. That is the mirror image of H.Con.Res. 14, which is mapped
  -- national_debt/yea_supports off its deficit-REDUCING instructions, so the
  -- direction here is read the same way and comes out the other side.
  FOR m IN SELECT id FROM vr_measures WHERE number = 'H.Con.Res. 113' AND congress = 119 LOOP
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m.id, 'national_debt', 85, true, 'yea_opposes',
        'The FY2027 congressional budget resolution. Its published summary states that it provides reconciliation instructions for legislation that increases the deficit, directing the House Agriculture, Armed Services, Intelligence and Administration Committees to report legislation increasing the deficit over FY2027-FY2036 by not more than specified amounts; a yea adopts a fiscal blueprint whose reconciliation instructions authorise deficit increases.',
        'https://www.govinfo.gov/bulkdata/BILLSTATUS/119/hconres/BILLSTATUS-119hconres113.xml')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
    n_rows := n_rows + 1;
  END LOOP;

  -- ── H.R. 7757 — KIDS Act, online safeguards for minors (31 votes) ───────────
  -- 267-117 under suspension: a two-thirds bill that still drew 117 nays, so it
  -- separates members. Official title "Promoting a Safe Internet for Minors Act";
  -- the CRS summary sets out four operative requirements — age-identification
  -- technology on platforms where more than a third of the content is sexual
  -- material harmful to minors, default settings for minors that limit compulsive
  -- usage features and adult contact, parental controls over a minor's privacy
  -- and account settings, and AI chatbot disclosure to minors.
  -- tech_balance is not a stretch fit: its own keyword list is age verification,
  -- social media, AI, guardrails and safety. Deliberately NOT mapped to
  -- edu_parental (a schools-and-curriculum key, not a platform-controls one) or
  -- to free_speech / privacy_rights, where an age-verification mandate cuts in
  -- both directions and the verdict would be manufactured.
  FOR m IN SELECT id FROM vr_measures WHERE number = 'H.R. 7757' AND congress = 119 LOOP
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m.id, 'tech_balance', 100, true, 'yea_supports',
        'Requires online platforms to adopt age-identification technology where more than a third of the content is sexual material harmful to minors, to default minors'' social-media accounts to settings limiting compulsive-usage features and adult contact, to give parents account and privacy controls, and to make AI chatbots disclose their nature to minors; a yea imposes those guardrails.',
        'https://www.govinfo.gov/bulkdata/BILLSTATUS/119/hr/BILLSTATUS-119hr7757.xml')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
    n_rows := n_rows + 1;
  END LOOP;

  -- ── H.Amdt. 242 — Part A No. 1 to H.R. 8800, report deadline (37 votes) ─────
  -- The purpose line we hold — "strike section 1213, relating to the deadline for
  -- the Afghanistan War Commission's final report, and maintain the current
  -- statutory reporting deadline" — does not say which way section 1213 moves the
  -- deadline, and without that the direction is unreadable. The reported text
  -- settles it: section 1213 amends section 1094(e)(2)(A)(ii)(I) of the FY2022
  -- NDAA "by striking 3 years and inserting 4 years". Striking section 1213 keeps
  -- the three-year deadline, so a yea insists the commission's public report
  -- arrive on the schedule Congress originally set. H. Rept. 119-755 prints the
  -- amendment in full — "Strike section 1213 (and redesignate accordingly)" — and
  -- attributes it to Rep. Roy; the Clerk records Rep. Boebert offering it as
  -- designee.
  FOR m IN SELECT id FROM vr_measures WHERE number = 'H.Amdt. 242' AND congress = 119 LOOP
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m.id, 'gov_transparency', 65, true, 'yea_supports',
        'Strikes section 1213 of the FY2027 NDAA, which extends the Afghanistan War Commission final-report deadline in the FY2022 NDAA from three years to four; a yea keeps the original three-year deadline and the public report on the schedule Congress set. Weighted below a full mapping because it changes when a report is delivered, not what must be disclosed.',
        'https://www.govinfo.gov/bulkdata/BILLS/119/2/hr/BILLS-119hr8800rh.xml')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
    n_rows := n_rows + 1;
  END LOOP;

  -- ── H.Amdt. 261 — Part A No. 44 to H.R. 8800, speed cameras (38 votes) ──────
  -- 232-199, agreed to. H. Rept. 119-755 prints the operative text: a new
  -- 10 U.S.C. 2661(e) barring federal funds for purchasing, installing, operating,
  -- maintaining or contracting for an automated speed enforcement camera system on
  -- a military installation, and requiring any system already running to be
  -- decommissioned and removed within 180 days. Automated enforcement cameras are
  -- automated surveillance devices, which is privacy_rights' own vocabulary; a yea
  -- removes them. Weighted 55 because the amendment reaches military installations
  -- only and expressly preserves cameras used for security, access control, force
  -- protection and criminal investigation — a member's general surveillance
  -- posture is not fully on trial here, and the weight says so rather than the
  -- mapping pretending otherwise.
  FOR m IN SELECT id FROM vr_measures WHERE number = 'H.Amdt. 261' AND congress = 119 LOOP
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m.id, 'privacy_rights', 55, true, 'yea_supports',
        'Bars federal funds for purchasing, installing, operating, maintaining or contracting for an automated speed enforcement camera system on a military installation, and requires any system already in operation to be decommissioned and removed within 180 days; a yea takes down an automated camera-surveillance enforcement system. Weighted low on purpose: the prohibition reaches military installations only, and expressly preserves cameras used for security, access control, force protection and criminal investigation.',
        'https://www.govinfo.gov/content/pkg/CRPT-119hrpt755/html/CRPT-119hrpt755.htm')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
    n_rows := n_rows + 1;
  END LOOP;

  -- ── H.Amdt. 266 — Part A No. 316 to H.R. 8800, DoD civilians (37 votes) ─────
  -- 175-254. The purpose line we hold is truncated after "by…", and the Rules
  -- report supplies the missing figure: the Secretary of Defense must report
  -- within 180 days on options for reducing the Department's civilian workforce
  -- by 200,000, with an assessment of current non-uniformed personnel levels,
  -- recommendations for achieving the reduction while maintaining readiness, and
  -- an analysis of the anticipated cost savings. Both keys are weighted low and
  -- both rationales say why — this commissions a report, it does not reduce
  -- anything.
  FOR m IN SELECT id FROM vr_measures WHERE number = 'H.Amdt. 266' AND congress = 119 LOOP
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m.id, 'gov_waste', 50, true, 'yea_supports',
        'Requires the Secretary of Defense to report within 180 days on options for reducing the number of civilians employed by the Department by 200,000, including an assessment of current non-uniformed personnel levels and recommendations for achieving the reduction while maintaining mission readiness; a yea asks for a plan to shrink the civilian workforce. Weighted low on purpose: the amendment commissions a report, it does not reduce anything.',
        'https://www.govinfo.gov/content/pkg/CRPT-119hrpt755/html/CRPT-119hrpt755.htm'),
      (m.id, 'cut_spending', 40, false, 'yea_supports',
        'The report must include an analysis of the anticipated cost savings associated with the reductions, so the amendment puts a 200,000-position federal payroll reduction on the table as a savings measure; a yea backs studying it. Secondary and low-weight for the same reason as the primary — this is a reporting requirement, not a cut.',
        'https://www.govinfo.gov/content/pkg/CRPT-119hrpt755/html/CRPT-119hrpt755.htm')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
    n_rows := n_rows + 1;
  END LOOP;

  -- ── H.Amdt. 87 — Part A No. 15 to H.R. 3838 (38 votes) ──────────────────────
  -- 227-201 on 2025-09-10. Migration 20260727000000 created this measure row from
  -- the Clerk record and GPO BILLSTATUS and deliberately stopped there: "Neither
  -- source we hold carries this amendment's PURPOSE text… A guessed one-line
  -- description of what the amendment does would be exactly the kind of invention
  -- this repair must not add." It left the mapping judgement to a later pass with
  -- a real source. H. Rept. 119-255 — the Rules Committee report accompanying
  -- H.Res. 682, the rule that made this amendment in order — is that source: it
  -- prints Part A No. 15 in full, "SEC. 5__. PROHIBITION OF PARTICIPATION BY MEN
  -- IN WOMEN'S SPORTS AT THE SERVICE ACADEMIES", barring a Superintendent from
  -- allowing a male cadet or midshipman to participate in an athletic program
  -- designated exclusively for females, with male and female defined by
  -- reproductive biology.
  -- Direction and weight follow the two already-mapped siblings rather than being
  -- invented here: H.Amdt. 255 (Mace, TRICARE gender-related care) and H.Amdt. 85
  -- (Norman, EFMP gender transition procedures) are both lgbtq_rights / 100 /
  -- yea_opposes.
  FOR m IN SELECT id FROM vr_measures WHERE number = 'H.Amdt. 87' AND congress = 119 LOOP
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m.id, 'lgbtq_rights', 100, true, 'yea_opposes',
        'Bars the Superintendent of a Service Academy from allowing a cadet or midshipman who is male to participate in any athletic program or activity designated exclusively for females, with "male" and "female" defined by reproductive biology; a yea restricts transgender participation. Same instrument and same direction as H.Amdt. 255 (Mace, DoDEA schools) and H.Amdt. 85 (Norman, EFMP care), both already mapped at full weight.',
        'https://www.govinfo.gov/content/pkg/CRPT-119hrpt255/html/CRPT-119hrpt255.htm')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
    n_rows := n_rows + 1;
  END LOOP;

  RAISE NOTICE 'substantive remainder pass: matched % measure row(s) for mapping', n_rows;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Sanity notices. The unmapped count is expected to stay well above zero: the 36
-- measures listed at the top of this file are unmapped by decision, and a later
-- pass reading a zero here would be reading a bug, not a finished job.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  unmapped int;
  procedural int;
  procedural_numbers int;
  mapped_votes int;
BEGIN
  SELECT count(*) INTO unmapped
    FROM vr_measures m
   WHERE m.congress = 119
     AND EXISTS (SELECT 1 FROM vr_rollcalls r JOIN vr_member_votes v ON v.rollcall_id = r.id WHERE r.measure_id = m.id)
     AND NOT EXISTS (SELECT 1 FROM vr_measure_issues i WHERE i.measure_id = m.id);

  SELECT count(*), count(DISTINCT m.number) INTO procedural, procedural_numbers
    FROM vr_measures m
   WHERE m.congress = 119
     AND (m.title ILIKE '%providing for consideration of%' OR m.title ILIKE '%rule providing for consideration%')
     AND NOT EXISTS (SELECT 1 FROM vr_measure_issues i WHERE i.measure_id = m.id);

  SELECT count(*) INTO mapped_votes
    FROM vr_member_votes v
    JOIN vr_rollcalls r ON r.id = v.rollcall_id
    JOIN vr_measures m ON m.id = r.measure_id
   WHERE v.position IN ('yea', 'nay')
     AND EXISTS (SELECT 1 FROM vr_measure_issues i WHERE i.measure_id = m.id);

  RAISE NOTICE 'measures with votes and still no issue mapping: %', unmapped;
  RAISE NOTICE 'unmapped rule resolutions: % row(s) across % distinct number(s) — all deliberate', procedural, procedural_numbers;
  RAISE NOTICE 'recorded yea/nay votes now sitting on a mapped measure: %', mapped_votes;
END $$;
