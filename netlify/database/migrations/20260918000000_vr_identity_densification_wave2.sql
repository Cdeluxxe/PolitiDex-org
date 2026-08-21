-- ─────────────────────────────────────────────────────────────────────────────
-- Formal densification wave 2, 118th/119th: the next unpaid-value band.
--
-- Same doctrine as 20260917000000_vr_identity_and_thin_key_densification.sql,
-- applied to the band underneath it. Thirteen more 118th/119th measures that
-- were carrying real member-vote traffic on a title-only or single-key record
-- got as-passed / as-enrolled plain summaries written from primary text in
-- db/vr-measure-identity.json (52 measures to 65). That file feeds
-- applyCuratedMeasureIdentity() in netlify/lib/vr-ingest.ts, which replaces a
-- provisional title and fills an empty summary and carries no issue mappings at
-- all, so the mappings the newly-read text justifies are written here, and only
-- those.
--
-- Nothing here changes the Direction Match formula, a floor, a guard, an
-- existing weight, an existing direction, or an existing rationale. No new issue
-- keys. No stances. No new roll calls and no new member votes: all thirteen
-- rolls already on file were checked against their govinfo BILLSTATUS
-- recordedVote entry on chamber, congress, session, roll number and date, all
-- thirteen matched, and no ballot was invented to fill a gap.
--
-- SELECTION. Ranked from live data — attributed member-vote volume on rolls
-- already ingested (every measure below carries 108-116 attributed ballots),
-- crossed with thin or single-key mappings and with title-only identity. The
-- eighteen measures completed in the September 17 pass were excluded, as were
-- the SAVE-family curated pairs, pure procedural rules, and amendments with no
-- primary text package. Thirteen measures selected; eight new rows survived the
-- text read. Five of the thirteen are identity-only, which is the expected
-- shape: their existing mappings were checked against primary text and found
-- correct and complete, and a pass that adds a row per measure because a row per
-- measure was the target is a pass that invents convictions.
--
--   IDENTITY ONLY — H.Con.Res. 89 (119), H.Con.Res. 108 (119), H.R. 3486 (119),
--     H.R. 9770 (119), H.R. 8884 (119), H.R. 8034 (118), H.R. 7217 (118).
--
-- MAPPED — eight rows, all secondary, all with a section cite.
--
--   H.Con.Res. 113 (119th) · strong_defense 45.
--     A budget resolution sets levels rather than enacting programs, so the bar
--     for a second key is a level that is itself the argument. Sec. 102(1) sets
--     National Defense (050) new budget authority at $955,085,000,000 for FY2027
--     rising to $1,184,416,000,000 for FY2036, and Sec. 201(b)(2) instructs the
--     Committee on Armed Services to report changes increasing the deficit by
--     not more than $60,000,000,000 over FY2027-FY2036 — a reconciliation
--     instruction to spend, not to save, and the only such instruction aimed at
--     defense. Weighted 45 and secondary: national_debt 85 primary already holds
--     the instrument's purpose, and a resolution appropriates nothing.
--
--   H.R. 1041 (119th) · veterans 55.
--     The measure reads on this corpus as a firearms bill and its two live keys
--     are gun_rights and gun_safety, but every operative section amends title
--     38: Secs. 2, 3 and 4 insert new sections 5501B, 5501C and 5501D into
--     chapter 55, which is VA benefits administration, and the class affected is
--     beneficiaries for whom the Secretary has appointed a fiduciary. Weighted
--     55 and secondary because the change is to one administrative consequence
--     of a VA determination rather than to veterans' care or benefits.
--
--   H.R. 6644 (119th) · permitting_reform 60, crypto_cbdc 40.
--     Enacted as P.L. 119-101. permitting_reform follows the precedent set in
--     20260904000000 for H.R. 3746, H.R. 471 and H.R. 1949: a housing bill that
--     narrows NEPA review earns the permitting key on its own, not through
--     gov_regulation. Sec. 205 (BUILD Housing Act) and Sec. 213 (BUILD NOW Act)
--     are the operative sections, plus Sec. 103's rural infill exemption.
--     crypto_cbdc is a whole title of the enacted law that has nothing to do
--     with housing and would otherwise be invisible on this record.
--
--   H.R. 7757 (119th) · privacy_rights 65.
--     tech_balance 100 primary is correct and is the only key on the measure.
--     Title VI is a self-contained privacy statute — COPPA 2.0 in subtitle A and
--     data-broker registration in subtitle B — and the two chips are distinct by
--     design: tech_balance is the safety-rules-on-platforms axis, privacy_rights
--     is personal data and Big Tech accountability.
--
--   H.R. 9237 (119th) · health_mental 55, health_rural 35.
--     Read the ballot before reading these rows. The corpus's only roll on this
--     bill is House roll 249 of July 16, 2026 on the MOTION TO RECOMMIT, which
--     failed 210-211; a yea on it blocks the bill. yeaBlocksMeasure() in
--     netlify/lib/vr-pack.ts already inverts the roll through advanceInverted,
--     so both rows are coded in bill terms — yea_supports means supporting the
--     provision, and the engine flips it for this ballot. Coding them the other
--     way to "cancel out" the motion would invert every member twice.
--
--   H.R. 6126 (118th) · strong_defense 50.
--     Aligns the earliest of the three same-titled Israel supplementals with
--     H.R. 7217, which already carries strong_defense 50 on the same reading.
--     Same weight, because the Title I defense accounts are the same accounts.
--
-- DECLINED, written down so the next pass does not re-litigate them.
--
--   war_powers on H.Con.Res. 89 and H.Con.Res. 108. Already live at weight 75:
--     20260904000000_vr_split_umbrella_issue_keys.sql lines 164-202 re-keyed
--     both from checks_balances and deleted their america_first_fp duplicates.
--     Recorded because a static scan of INSERT statements does not follow an
--     UPDATE ... SET issue_key and both measures read as unmapped on this key
--     until the migrations were grepped directly. Rule 21 leaves the live
--     rationale to the first writer; struck, not re-litigated.
--
--   deportations on H.R. 3486. Rule 22: border_security 65 already carries this
--     conviction on this measure, and that chip's own text reads "Finish border
--     barriers and deport people here illegally". A second row triple-counts the
--     same vote on the same axis.
--
--   health_mental on H.R. 1041. Rule 25: Sec. 4's new section 5501D is a rule
--     about when a VA competency determination may be treated as an
--     adjudication as a mental defective for firearms-eligibility purposes. It
--     changes a reporting consequence, not mental health care or its funding.
--     There is no provision for the key.
--
--   america_first_fp on H.R. 7217 and H.R. 6126. Rule 23, read the nay bloc per
--     key. Neither nay bloc is an America-First bloc: on H.R. 7217 the 180 nays
--     are overwhelmingly Democrats objecting to a defense-only package with no
--     humanitarian title, and on H.R. 6126 the 196 nays are Democrats objecting
--     to the Sec. 306 IRS rescission offset. H.R. 8034's existing
--     america_first_fp 50 yea_opposes row stands, because that is the vehicle
--     whose nay bloc actually splits on the foreign-commitment axis.
--
--   cut_spending on H.R. 7217. Rule 25: H.R. 6126 earns its cut_spending 60 from
--     Sec. 306's $14,300,000,000 IRS rescission. H.R. 7217 carries no offset
--     provision at all. Same short title, different bill.
--
--   veterans and homeless on H.R. 6644. Title VI's Sec. 602 excludes title 38
--     chapter 11 and chapter 15 disability benefits from income for HUD-VASH
--     eligibility, which is a housing-eligibility conviction the housing 80 row
--     already holds — rule 22. Sec. 503's McKinney-Vento funding-cap waiver is a
--     single waiver authority and lands below_floor, whose floor is 20.
--
--   health_mental and immig_fentanyl on H.R. 7757. Title V Secs. 513-519 direct
--     studies and reports on minors' mental health, on chatbots, and on minors'
--     access to fentanyl through social media. Studies are real provisions but
--     they compel no conduct; both land below_floor.
--
--   disaster_resilience on H.R. 9770. Rule 25: the continuing resolution extends
--     the National Flood Insurance Program and funds the Disaster Relief Fund at
--     FY2026 levels. Continuing an authority at its existing level is the
--     definition of a CR and enacts no policy on the axis.
--
--   A second key on H.R. 8884. social_security 70 primary is the whole
--     instrument: one operative section reauthorizing SSA demonstration
--     authority under section 234 of the Social Security Act.
--
--   power_of_purse on H.Con.Res. 113. A budget resolution sets the levels
--     against which appropriations are enforced; it neither appropriates nor
--     compels the executive to spend, and it is never presented to the
--     President. The direction is not readable, which is the same ground on
--     which the September 17 pass declined power_of_purse on H.R. 4.
--
--   checks_balances anywhere. Rule 28: the general key takes no roll-call
--     mappings. This bites hardest on the two War Powers resolutions, which is
--     exactly why 20260904000000 moved them to war_powers instead.
--
--   veterans and foreign_balance on any cross-NDAA measure. Reserved to the
--     cross-NDAA pass. Runbook follow-up item 0b makes those two keys
--     all-or-none across S. 1605, S. 1071, H.R. 8800, H.R. 2670 and H.R. 5009.
--     H.R. 9237 is a veterans omnibus and not an NDAA, so its veterans 100
--     primary is untouched by that reservation and is untouched here.
--
-- SOURCES (all fetched and read; congress.gov and api.govinfo.gov are not
-- reachable from this environment, govinfo bulkdata and content are):
--   https://www.govinfo.gov/content/pkg/BILLS-119hconres113eh/html/BILLS-119hconres113eh.htm
--   https://www.govinfo.gov/content/pkg/BILLS-119hr1041eh/html/BILLS-119hr1041eh.htm
--   https://www.govinfo.gov/content/pkg/PLAW-119publ101/html/PLAW-119publ101.htm
--   https://www.govinfo.gov/content/pkg/BILLS-119hr7757eh/html/BILLS-119hr7757eh.htm
--   https://www.govinfo.gov/content/pkg/BILLS-119hr9237ih/html/BILLS-119hr9237ih.htm
--   https://www.govinfo.gov/content/pkg/BILLS-118hr6126ih/html/BILLS-118hr6126ih.htm
-- ─────────────────────────────────────────────────────────────────────────────


DO $$
DECLARE
  m record;
  n_rows integer := 0;
BEGIN

  -- ── H.Con.Res. 113 (119th) — FY2027 congressional budget resolution.
  --    Engrossed House text, agreed to 216-214 on July 22, 2026. ──
  FOR m IN SELECT id FROM vr_measures WHERE number = 'H.Con.Res. 113' AND congress = 119 LOOP
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m.id, 'strong_defense', 45, false, 'yea_supports',
        'Sec. 102(1) sets the recommended levels for budget function 050, National Defense, at $955,085,000,000 in new budget authority and $918,530,000,000 in outlays for fiscal year 2027, rising each year to $1,184,416,000,000 in new budget authority for fiscal year 2036 — a real-terms increase held across the full ten-year window while several domestic functions are set to decline. Sec. 201(b)(2) then instructs the Committee on Armed Services to submit changes in laws within its jurisdiction to increase the deficit by not more than $60,000,000,000 for the period of fiscal years 2027 through 2036, which is a reconciliation instruction to spend rather than to save and the only one of the four instructions aimed at defense. A yea adopts those levels as the ceiling every FY2027 defense appropriation is scored against; a nay leaves the prior year''s levels controlling. Weighted 45 and secondary because national_debt 85 already holds the instrument''s primary purpose and because a budget resolution appropriates nothing — it sets the number the appropriators must work inside, and the money still requires a separate bill.',
        'https://www.govinfo.gov/content/pkg/BILLS-119hconres113eh/html/BILLS-119hconres113eh.htm')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
    n_rows := n_rows + 1;
  END LOOP;

  -- ── H.R. 1041 (119th) — Veterans 2nd Amendment Protection Act. Engrossed
  --    House text, passed 216-201 on May 21, 2026. ──
  FOR m IN SELECT id FROM vr_measures WHERE number = 'H.R. 1041' AND congress = 119 LOOP
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m.id, 'veterans', 55, false, 'yea_supports',
        'Every operative section of this bill amends title 38 and the class it affects is veterans and VA beneficiaries. Sec. 2 inserts a new section 5501B into chapter 55 barring the Secretary of Veterans Affairs from transmitting a beneficiary''s personally identifiable information to the Department of Justice for the national instant criminal background check system "solely on the basis of a determination by the Secretary to pay benefits to a fiduciary for the use and benefit of the beneficiary under section 5502", absent a judicial finding that the beneficiary is a danger to themselves or others. Sec. 3 inserts section 5501C requiring the Secretary to notify the Attorney General within 30 days that the basis for every such transmittal made on or after November 30, 1993 no longer applies. Sec. 4 inserts section 5501D barring the Secretary from treating a beneficiary as adjudicated a mental defective solely because the Secretary found the person mentally incompetent under 38 C.F.R. 3.353 or in need of a fiduciary. A yea removes an administrative consequence that currently attaches to accepting VA help managing benefits — the argument for the bill is that the consequence deters veterans from seeking that help. Weighted 55 and secondary because gun_rights 100 holds the primary and because the change runs to one collateral effect of a VA determination rather than to veterans'' care, benefits or compensation.',
        'https://www.govinfo.gov/content/pkg/BILLS-119hr1041eh/html/BILLS-119hr1041eh.htm')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
    n_rows := n_rows + 1;
  END LOOP;

  -- ── H.R. 6644 (119th) — 21st Century ROAD to Housing Act, P.L. 119-101.
  --    Enrolled text as enacted July 11, 2026. ──
  FOR m IN SELECT id FROM vr_measures WHERE number = 'H.R. 6644' AND congress = 119 LOOP
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m.id, 'permitting_reform', 60, false, 'yea_supports',
        'Three sections of the enacted law narrow National Environmental Policy Act review as the mechanism for getting housing built. Sec. 205, the BUILD Housing Act, adds a new section 13 to the Department of Housing and Urban Development Act letting the Secretary designate assistance as funds for a special project for purposes of NEPA review, and extends to Indian Tribes the authority to assume environmental review responsibilities under 42 U.S.C. 3547. Sec. 213, the BUILD NOW Act, directs the Secretary to expand and reclassify housing-related activities under section 103 of NEPA (42 U.S.C. 4333) so that tenant-based rental assistance, supportive services and comparable activities are governed by regulations "equivalent or substantially similar to" the exempt activities set out in section 58.34 of title 24, Code of Federal Regulations. Sec. 103 exempts specified rural housing projects on infill sites from environmental review outright. This is the same reading the corpus already applies to H.R. 3746, H.R. 471 and H.R. 1949 — a bill that narrows the scope of NEPA administrative review earns the permitting key directly rather than through gov_regulation. Weighted 60 and secondary because housing_build 100 holds the primary: the permitting change is the means, and housing supply is the end.',
        'https://www.govinfo.gov/content/pkg/PLAW-119publ101/html/PLAW-119publ101.htm'),
      (m.id, 'crypto_cbdc', 40, false, 'yea_supports',
        'Sec. 1101 of the enacted law amends the Federal Reserve Act to insert a new section 16A (12 U.S.C. 423) providing that the Board of Governors and the Federal reserve banks "may not issue or create a central bank digital currency", whether directly or through an intermediary, and may not use one to implement monetary policy. The one exception is for a dollar-denominated digital currency that is "open, permissionless, and private, and fully preserves the privacy protections of United States coins and physical currency", and the whole section sunsets on December 31, 2030. This is the anti-CBDC prohibition that has moved as a standalone bill in both chambers, riding here on a housing vehicle; a yea enacts it. Weighted 40 and secondary because it is one section of a twelve-title housing act and nothing in the rest of the law touches the axis — but it is mapped rather than dropped, because leaving it out would make a member''s recorded position on a CBDC ban invisible on the only vehicle that enacted one.',
        'https://www.govinfo.gov/content/pkg/PLAW-119publ101/html/PLAW-119publ101.htm')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
    n_rows := n_rows + 2;
  END LOOP;

  -- ── H.R. 7757 (119th) — KIDS Act. Engrossed House text, passed 267-117 under
  --    suspension on June 29, 2026. ──
  FOR m IN SELECT id FROM vr_measures WHERE number = 'H.R. 7757' AND congress = 119 LOOP
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m.id, 'privacy_rights', 65, false, 'yea_supports',
        'Title VI is a self-contained personal-data statute inside the online-safety package. Subtitle A, Secs. 601 through 605, is the Children and Teens'' Online Privacy Protection Act — COPPA 2.0 — which rewrites the definitions in 15 U.S.C. 6501 to lower the definition of "child" to under 14 while extending the Act''s protections to teens, and governs the online collection, use, disclosure and deletion of children''s and teens'' personal information, including a deletion right exercisable by the user. Subtitle B, Secs. 611 through 613, imposes a federal registration requirement on data brokers and directs the Federal Trade Commission to maintain the registry. Title II subtitle B, Secs. 231 through 234, separately restricts market research conducted on minors. Sec. 701 vests enforcement in the Commission and in State attorneys general. A yea enacts a data-collection limit enforceable against the platforms and the brokers that buy from them. The key is distinct from the tech_balance 100 primary by design rather than by degree: tech_balance is the axis of safety rules imposed on platforms, and privacy_rights is the axis of who may hold personal data and be held to account for it. Weighted 65 because Title VI plus the Title II subtitle is a substantial minority of the bill''s operative text, not its purpose.',
        'https://www.govinfo.gov/content/pkg/BILLS-119hr7757eh/html/BILLS-119hr7757eh.htm')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
    n_rows := n_rows + 1;
  END LOOP;

  -- ── H.R. 9237 (119th) — Take Care of America's Veterans Act. Introduced House
  --    text; the corpus's only roll is the MOTION TO RECOMMIT of July 16, 2026,
  --    which failed 210-211, and yeaBlocksMeasure() inverts it. Both rows below
  --    are coded in bill terms. ──
  FOR m IN SELECT id FROM vr_measures WHERE number = 'H.R. 9237' AND congress = 119 LOOP
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m.id, 'health_mental', 55, false, 'yea_supports',
        'Six sections of the bill are mental health and substance-use provisions rather than benefits provisions. Sec. 306 modifies and reauthorizes the Staff Sergeant Parker Gordon Fox Suicide Prevention Grant Program established by the Commander John Scott Hannon Veterans Mental Health Care Improvement Act, which funds community organizations providing suicide-prevention services to veterans outside the VA system. Sec. 322 commissions an independent study of the difference in quality between mental health and addiction therapy furnished by the Department and that furnished by non-Department providers. Sec. 325 requires opioid rescue medications to be made available to any veteran at no charge in areas of disproportionately high overdose risk. Sec. 621 adds a new subchapter IX to chapter 17 of title 38, with a new section 1791 governing veteran participation in mental health treatment programs, and Sec. 622 requires a plan for residential rehabilitation treatment access for veterans with spinal cord injury. Direction note, because this measure''s only ballot inverts: the corpus holds one roll call on this bill and it is the motion to recommit, on which a yea sends the bill back and blocks it. This row is coded in bill terms — yea_supports means the provision — and netlify/lib/vr-pack.ts sets advanceInverted through yeaBlocksMeasure() for that question, so the engine performs the flip. Coding the row backwards to compensate would invert every member twice. Weighted 55 and secondary under veterans 100.',
        'https://www.govinfo.gov/content/pkg/BILLS-119hr9237ih/html/BILLS-119hr9237ih.htm'),
      (m.id, 'health_rural', 35, false, 'yea_supports',
        'Sec. 314 establishes a five-year pilot program under which the Department reimburses critical access hospitals and affiliated provider-based rural health clinics for outpatient care furnished to eligible veterans under the Veterans Community Care Program — the facility classes that carry veterans'' care where there is no VA medical center within driving distance. Sec. 110 directs a study of access to contract disability examinations in rural areas. A yea enacts the pilot. The same direction note applies as to the mental health row on this measure: the only ballot on file is the motion to recommit of July 16, 2026, the row is coded in bill terms, and yeaBlocksMeasure() supplies the inversion. Weighted 35 rather than at the extenders level the corpus gives H.R. 1968 and H.R. 7148, because this is a bounded pilot at one facility class rather than the continuation of the rural payment adjustments themselves.',
        'https://www.govinfo.gov/content/pkg/BILLS-119hr9237ih/html/BILLS-119hr9237ih.htm')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
    n_rows := n_rows + 2;
  END LOOP;

  -- ── H.R. 6126 (118th) — Israel Security Supplemental Appropriations Act, 2024
  --    (the November 2023 vehicle, the one with the IRS offset). Introduced
  --    House text, which is the text passed 226-196 on November 2, 2023. ──
  FOR m IN SELECT id FROM vr_measures WHERE number = 'H.R. 6126' AND congress = 118 LOOP
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m.id, 'strong_defense', 50, false, 'yea_supports',
        'Title I appropriates emergency supplemental amounts to the Department of Defense under Operation and Maintenance, Procurement, and Research, Development, Test and Evaluation, funding replenishment of United States stocks drawn down for transfer and the production lines that refill them. Title II appropriates $3,500,000,000 to the Foreign Military Financing Program, the account through which allied procurement of American defense articles is financed. A yea appropriates emergency defense money outside the regular bill; a nay withholds it. Weighted 50 and secondary, matching the row H.R. 7217 already carries on this key, because the two bills fund the same Title I accounts on the same reading and identical readings should not produce different weights on the same axis.',
        'https://www.govinfo.gov/content/pkg/BILLS-118hr6126ih/html/BILLS-118hr6126ih.htm')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
    n_rows := n_rows + 1;
  END LOOP;

  RAISE NOTICE 'Identity densification wave 2: % new curated mapping row(s) asserted', n_rows;
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
      ('H.Con.Res. 113', 119, 'strong_defense',    'yea_supports'),
      ('H.R. 1041',      119, 'veterans',          'yea_supports'),
      ('H.R. 6644',      119, 'permitting_reform', 'yea_supports'),
      ('H.R. 6644',      119, 'crypto_cbdc',       'yea_supports'),
      ('H.R. 7757',      119, 'privacy_rights',    'yea_supports'),
      ('H.R. 9237',      119, 'health_mental',     'yea_supports'),
      ('H.R. 9237',      119, 'health_rural',      'yea_supports'),
      ('H.R. 6126',      118, 'strong_defense',    'yea_supports')
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

  -- No measure touched by this pass may end it with two primaries.
  SELECT count(*) INTO n FROM (
    SELECT mi.measure_id FROM vr_measure_issues mi
      JOIN vr_measures me ON me.id = mi.measure_id
     WHERE mi.is_primary
       AND (   (me.congress = 119 AND me.number IN ('H.Con.Res. 113', 'H.R. 1041', 'H.R. 6644', 'H.R. 7757', 'H.R. 9237'))
            OR (me.congress = 118 AND me.number = 'H.R. 6126'))
     GROUP BY mi.measure_id HAVING count(*) > 1
  ) d;
  IF n > 0 THEN
    RAISE EXCEPTION 'Verification: % measure(s) touched by this pass now carry more than one primary issue.', n;
  END IF;

  -- The war_powers rows this pass declined to re-author must still be there.
  -- They were written by 20260904000000; if they have gone missing, the DECLINED
  -- note at the top of this file is wrong and the axis is unmapped.
  FOR want IN
    SELECT * FROM (VALUES ('H.Con.Res. 89', 119), ('H.Con.Res. 108', 119)) AS t(number, congress)
  LOOP
    IF EXISTS (SELECT 1 FROM vr_measures WHERE number = want.number AND congress = want.congress) THEN
      SELECT count(*) INTO n FROM vr_measures me
        JOIN vr_measure_issues mi ON mi.measure_id = me.id
       WHERE me.number = want.number AND me.congress = want.congress
         AND mi.issue_key = 'war_powers';
      IF n = 0 THEN
        RAISE NOTICE 'Verification: % (%th) has no war_powers row. This pass declined to re-author it because 20260904000000 already did; if that re-key was rolled back, the mapping needs a new writer.',
          want.number, want.congress;
      END IF;
    END IF;
  END LOOP;

  -- The declines, asserted where a later pass would most plausibly slip one in.
  SELECT count(*) INTO n FROM vr_measures me
    JOIN vr_measure_issues mi ON mi.measure_id = me.id
   WHERE me.number = 'H.R. 3486' AND me.congress = 119
     AND mi.issue_key = 'deportations';
  IF n > 0 THEN
    RAISE EXCEPTION 'Verification: H.R. 3486 picked up deportations; border_security already carries that conviction on this measure and the row was declined under rule 22.';
  END IF;

  SELECT count(*) INTO n FROM vr_measures me
    JOIN vr_measure_issues mi ON mi.measure_id = me.id
   WHERE me.number = 'H.R. 7217' AND me.congress = 118
     AND mi.issue_key = 'cut_spending';
  IF n > 0 THEN
    RAISE EXCEPTION 'Verification: H.R. 7217 picked up cut_spending. That key belongs to H.R. 6126, which carries the Sec. 306 IRS rescission; H.R. 7217 has no offset provision.';
  END IF;

  SELECT count(*) INTO n FROM vr_measures me
    JOIN vr_measure_issues mi ON mi.measure_id = me.id
   WHERE me.congress = 119
     AND me.number IN ('H.Con.Res. 89', 'H.Con.Res. 108', 'H.Con.Res. 113', 'H.R. 1041', 'H.R. 3486',
                       'H.R. 6644', 'H.R. 7757', 'H.R. 9237', 'H.R. 9770', 'H.R. 8884')
     AND mi.issue_key = 'checks_balances';
  IF n > 0 THEN
    RAISE EXCEPTION 'Verification: a measure touched by this pass carries checks_balances. Rule 28: the general key takes no roll-call mappings.';
  END IF;

  -- Vote-row shape on the measures this pass touched. There is no politicians
  -- table to join against — vr_member_votes.politician_id is a text slug
  -- resolved in application code through db/vr-member-map.json, and
  -- scripts/test-vr-vote-seed.mjs is what proves every slug resolves.
  SELECT count(*) INTO n FROM vr_measures me
    JOIN vr_rollcalls rc ON rc.measure_id = me.id
    JOIN vr_member_votes mv ON mv.rollcall_id = rc.id
   WHERE me.number IN ('H.Con.Res. 89', 'H.Con.Res. 108', 'H.Con.Res. 113', 'H.R. 1041', 'H.R. 3486',
                       'H.R. 6644', 'H.R. 7757', 'H.R. 9237', 'H.R. 9770', 'H.R. 8884',
                       'H.R. 8034', 'H.R. 7217', 'H.R. 6126')
     AND (mv.politician_id IS NULL
          OR btrim(mv.politician_id) = ''
          OR mv.position NOT IN ('yea', 'nay', 'present', 'not_voting'));
  IF n > 0 THEN
    RAISE EXCEPTION 'Verification: % member vote(s) on the measures this pass touched have a blank member or an unreadable position.', n;
  END IF;
END $$;
