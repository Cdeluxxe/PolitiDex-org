-- ─────────────────────────────────────────────────────────────────────────────
-- Formal densification, pass 3: the heavy vehicles left standing.
--
-- Runbook rule 22 (the product rule) governs this pass, unchanged:
--   If the measure's primary text contains a provision that clearly implicates
--   issue key K, map it. Yea advances the package as written; nay blocks it.
--   Weight for share of the bill; name the division, title or section in the
--   rationale. Direction is what the instrument DOES on K, not why a member
--   voted for it. "Omnibus", "vehicle" and "they may have cared about another
--   title" are not grounds for refusal. What still bars a key: the measure is
--   procedural only; there is no real provision for K; the key is already on
--   that measure; or the provision cuts two ways and no honest support_meaning
--   exists.
--
-- TARGETS. Chosen by member-vote volume among measures still single-key after
-- the NDAA, H.R. 1/H.R. 4, H.R. 1181, H.R. 8404, H.R. 36, H.R. 7148 and
-- H.R. 8595 passes. The three highest-volume single-key bills that are real
-- policy vehicles rather than amendments:
--
--   S. 2296  (119th, 100 attributed member-votes, senate 119/1 roll 570, 77-20)
--   H.R. 8034 (118th, 62, house 118/2 roll 152, 366-58)
--   H.R. 7217 (118th, 61, house 118/2 roll 38, 250-180, failed under suspension)
--
-- H.R. 4405 carries more attributed votes than any of them (120) and is also
-- single-key, and it is NOT a target: the roll is 427-1, which runbook rule 2
-- puts below the threshold at which a vote differentiates anybody, and the Act
-- is a pure disclosure statute with no second operative provision. Both facts
-- were already recorded on the measure when it was ingested.
--
-- MAPPED — 8 rows across 3 measures.
--
-- S. 2296, the Senate's own FY2026 National Defense Authorization Act. Not the
-- enacted FY2026 NDAA (that is S. 1071, P.L. 119-60) but a real bill with a
-- real 77-20 passage vote, which migration 20260820000000 left open for "a
-- later pass". Ten divisions; five earn a key:
--   · israel_support 40 — div. A, tit. XII, subtit. E secs. 1255-1256 and
--     tit. XV, subtit. C sec. 1534 (anti-tunnel and counter-UAS cooperation
--     extended and raised; Iron Dome and David's Sling co-production).
--   · housing_build 35 — div. I, the Road to Housing Act, tit. II and tit. III.
--     A whole housing act rides inside this defense authorization; the zoning,
--     review-streamlining and manufactured-housing sections are its core.
--   · immig_fentanyl 30 — div. G, tit. LXI, the BUST FENTANYL Act.
--   · back_police 20 — div. A, tit. X, subtit. H, the Law Enforcement and
--     Crime Victims Support Package.
--   · homeless 20 — div. I, secs. 5505, 5506, 5603 and 5703.
--
-- H.R. 8034 and H.R. 7217, the two standalone Israel supplementals of the
-- 118th Congress, both single-key on israel_support since ingestion:
--   · H.R. 8034 strong_defense 55 — tit. I appropriates $7.8bn to U.S.
--     accounts: stock replacement, Army ammunition, Defense Production Act
--     purchases, and $2.44bn at sec. 101 for U.S. operations, force protection
--     and deterrence in the CENTCOM region.
--   · H.R. 8034 america_first_fp 50, yea_opposes — tit. III appropriates
--     $9.2bn of humanitarian and refugee assistance that is not assistance to
--     Israel. The chip reads "cut, condition or wind down U.S. funding abroad",
--     so funding it is coded as opposing the chip. Israel's own FMF in the same
--     title stays out: the chip's scope note carves Israel aid to israel_support.
--   · H.R. 7217 strong_defense 50 — tit. I appropriates across U.S. military
--     personnel, O&M, procurement, RDT&E and revolving fund accounts.
--
-- These two siblings deliberately end up coded DIFFERENTLY, and the difference
-- is in the text: the February bill (H.R. 7217) carried no humanitarian money
-- at all — its only foreign-assistance account is Foreign Military Financing
-- for Israel — while the April bill (H.R. 8034) added $9.2bn of it. That is
-- the substantive change between the two attempts, and coding them alike would
-- erase it.
--
-- DECLINED, with the bucket and the reason. Most divisions map to nothing, and
-- saying so is part of the work:
--   · S. 2296 → guard_authority [no_provision]. Secs. 513-515 are National
--     Guard personnel, disaster-duty and funds-treatment authorities. The chip
--     is scoped to who COMMANDS the Guard — governor or President — and the
--     bill does not touch it. S. 1071 carries this key; S. 2296 does not earn it.
--   · S. 2296 → tariffs_china [no_provision]. Tit. XVII is the FIGHT CHINA Act
--     of 2025, but it imposes sanctions, prohibits and requires notification of
--     certain investments, and restricts securities. It levies no tariff and
--     changes no trade rule, which is what that chip is about. The taxonomy has
--     no key for economic-security sanctions or outbound investment screening;
--     that gap is NAMED here and not invented.
--   · S. 2296 → tech_innovation [two_flank]. Div. E, subtit. H, sec. 6083 bars
--     prioritising countries of concern over United States persons for exports
--     of advanced integrated circuits. A yea both tightens export control
--     (against "innovate with minimal red tape") and puts U.S. buyers first
--     (for the domestic industry the chip speaks for). No honest
--     support_meaning; documented, not forced.
--   · S. 2296 → tough_on_crime [size]. Div. E, subtit. G raises sentences for
--     six offences directed by or coordinated with foreign governments. Six
--     sections in a bill of this size, and the justice reading of the measure
--     is already carried by back_police.
--   · S. 2296 → veterans [out of scope]. Div. I, tit. VI (VA Home Loan
--     Awareness Act, VALID Act, Housing Unhoused Disabled Veterans Act) would
--     support it, but cross-NDAA veterans consistency is explicitly excluded
--     from this pass and is not opened here.
--   · H.R. 8034 → restraint [duplicate]. The only provision that would carry
--     it is the same sec. 101 CENTCOM money already read under strong_defense
--     on this measure, in the opposite framing.
--   · H.R. 8034 tit. II, $400,000,000 for the Nonprofit Security Grant Program
--     [no_provision]. Real money, real provision, no key: the taxonomy has
--     nothing for domestic protective-security or counterterrorism grants.
--     Second named vocabulary gap of this pass.
--   · H.R. 7217 → america_first_fp [no_provision]. See above — no non-Israel
--     assistance in the bill.
--   · H.R. 7217 → congress_oversight [no_provision]. Secs. 103, 104 and 202
--     are the recurring reporting requirements every supplemental carries, not
--     the subpoena-and-testimony question the chip is scoped to.
--   · H.R. 9770 → disaster_resilience [size]. The FY2027 CR already carries
--     gov_services and national_debt; secs. 121-122 (National Flood Insurance
--     Act extension, Disaster Relief Fund apportionment) are two apportionment
--     provisions in a stopgap and do not carry a third axis.
--
-- No stances are written by this pass. No weights, floors, guards or formula
-- change. No new issue keys.
--
-- SOURCES (text as the chamber voted it, read division by division):
--   S. 2296   https://www.govinfo.gov/content/pkg/BILLS-119s2296es/html/BILLS-119s2296es.htm
--   H.R. 8034 https://www.govinfo.gov/content/pkg/BILLS-118hr8034ih/html/BILLS-118hr8034ih.htm
--   H.R. 7217 https://www.govinfo.gov/content/pkg/BILLS-118hr7217ih/html/BILLS-118hr7217ih.htm
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  m record;
  n_rows integer := 0;
BEGIN
  -- ── S. 2296 (119th) — National Defense Authorization Act for Fiscal Year 2026, as passed by the Senate 77-20 (senate 119/1 roll 570). Ten divisions. ──
  FOR m IN SELECT id FROM vr_measures WHERE number = 'S. 2296' AND congress = 119 LOOP
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m.id, 'israel_support', 40, false, 'yea_supports',
        'Division A, title XII, subtitle E: sec. 1255 extends United States-Israel anti-tunnel cooperation through December 31, 2028 and raises its annual ceiling from $50,000,000 to $80,000,000, and sec. 1256 extends United States-Israel cooperation to counter unmanned aerial systems on the same terms, from $55,000,000 to $75,000,000. Division A, title XV, subtitle C, sec. 1534 makes up to $60,000,000 of Missile Defense Agency procurement available to the Government of Israel for Iron Dome co-production in the United States and up to $40,000,000 for the David''s Sling Weapon System. A yea enacts all three and keeps joint missile-defense and tunnel-detection work funded; a nay blocks the bill that carries them. Weighted 40 for share of the vehicle — two sections in one subtitle plus one missile-defense section inside a ten-division authorization, the same weight the FY2027 NDAA (H.R. 8800) carries for the same kind of provision.',
        'https://www.govinfo.gov/content/pkg/BILLS-119s2296es/html/BILLS-119s2296es.htm'),
      (m.id, 'housing_build', 35, false, 'yea_supports',
        'Division I is the Road to Housing Act, a full housing act carried inside the defense authorization. Title II (Building More in America) enacts the Housing Supply Frameworks Act at sec. 5203, whose findings state that state and local zoning and land-use regulation inhibits the creation of new housing and which funds model frameworks for reforming it; the Build Now Act at sec. 5206; Unlocking Housing Supply Through Streamlined and Modernized Reviews at sec. 5208; the Accelerating Home Building Act at sec. 5210, reaching accessory dwelling units, infill development, duplexes, triplexes, fourplexes, cottage courts, courtyard buildings, townhouses and multiplexes; Build More Housing Near Transit at sec. 5211; and the RESIDE Act at sec. 5212. Title III strikes the "on a permanent chassis" requirement from the federal manufactured-home definition at sec. 5301 and adds modular production at sec. 5302. A yea enacts the division; a nay blocks it. Weighted 35: one of ten divisions, and the largest one that is not defense.',
        'https://www.govinfo.gov/content/pkg/BILLS-119s2296es/html/BILLS-119s2296es.htm'),
      (m.id, 'immig_fentanyl', 30, false, 'yea_supports',
        'Division G, title LXI is the BUST FENTANYL Act. Sec. 6105 expands the Fentanyl Sanctions Act (21 U.S.C. 2312) to reach any foreign person the President determines has knowingly engaged in a significant activity or financial transaction that materially contributed to opioid trafficking, and anyone knowingly providing significant financial, material or technological support to such a person; sec. 6106 extends sanctions to agencies and instrumentalities of foreign states; secs. 6103 and 6104 direct study of, and prioritised identification of, traffickers in the People''s Republic of China; sec. 6107 requires annual reporting on methamphetamine smuggling from Mexico. A yea enacts the title. Weighted 30 for share of the bill: one title inside one division.',
        'https://www.govinfo.gov/content/pkg/BILLS-119s2296es/html/BILLS-119s2296es.htm'),
      (m.id, 'back_police', 20, false, 'yea_supports',
        'Division A, title X, subtitle H is the Law Enforcement and Crime Victims Support Package: sec. 1091 addresses first-responder secondary exposure to fentanyl, sec. 1092 reauthorises support and treatment for officers in crisis, sec. 1094 brings certain retired officers into the public safety officers'' death benefits program, sec. 1095 adds a COPS Strong Communities Program to sec. 1701 of the Omnibus Crime Control and Safe Streets Act of 1968 funding law enforcement training run by local agencies and by institutions of higher education, sec. 1096 provides for retired officers'' continuing service and sec. 1097 sets trauma kit standards. A yea funds and expands support for police. Weighted 20: one subtitle of one title.',
        'https://www.govinfo.gov/content/pkg/BILLS-119s2296es/html/BILLS-119s2296es.htm'),
      (m.id, 'homeless', 20, false, 'yea_supports',
        'Division I, title V: sec. 5505 (Reducing Homelessness Through Program Reform Act) raises the Emergency Solutions Grants administrative cost cap in sec. 418 of the McKinney-Vento Homeless Assistance Act from 7.5 percent to 10 percent and rewrites the Continuum of Care program, and sec. 5506 lets a recipient waive the sec. 415(b) spending cap for fiscal years 2026 through 2029 while requiring the Secretary to deny that waiver to any recipient that relocates people or their property without providing emergency shelter, rapid rehousing, transitional housing or other permanent housing. Title VI, sec. 5603 is the Housing Unhoused Disabled Veterans Act; title VII, sec. 5703 adds oversight of the United States Interagency Council on Homelessness. A yea enacts them. Weighted 20: a handful of sections inside one division.',
        'https://www.govinfo.gov/content/pkg/BILLS-119s2296es/html/BILLS-119s2296es.htm')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
    n_rows := n_rows + 5;
  END LOOP;

  -- ── H.R. 8034 (118th) — Israel Security Supplemental Appropriations Act, 2024, passed 366-58 (house 118/2 roll 152) and enacted as Division A of P.L. 118-50. Four titles. ──
  FOR m IN SELECT id FROM vr_measures WHERE number = 'H.R. 8034' AND congress = 118 LOOP
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m.id, 'strong_defense', 55, false, 'yea_supports',
        'Title I appropriates to United States accounts rather than to Israel: $4,400,000,000 to Operation and Maintenance, Defense-Wide, transferable to operation and maintenance, procurement and revolving fund accounts to replace defense articles drawn from the stocks of the Department of Defense and to reimburse Department of Defense services; $801,400,000 to Procurement of Ammunition, Army; $198,600,000 for Defense Production Act Purchases under sections 108 and 301 through 303 of the Defense Production Act of 1950; and, at sec. 101, $2,440,000,000 transferable to military personnel, operation and maintenance, procurement and research accounts only for United States operations, force protection, deterrence and the replacement of combat expenditures in the United States Central Command region. A yea funds U.S. forces in the region and refills U.S. stocks. Weighted 55: roughly $7.8 billion of the $26.4 billion Act, with the israel_support row already on this measure carrying the aid itself.',
        'https://www.govinfo.gov/content/pkg/BILLS-118hr8034ih/html/BILLS-118hr8034ih.htm'),
      (m.id, 'america_first_fp', 50, false, 'yea_opposes',
        'Title III appropriates foreign assistance that is not assistance to Israel: $5,655,000,000 to International Disaster Assistance and $3,495,000,000 to Migration and Refugee Assistance, both to address humanitarian needs, including emergency food and shelter, of vulnerable populations and communities; $75,000,000 to International Narcotics Control and Law Enforcement for the Middle East; and $10,000,000 to Peacekeeping Operations, including a United States contribution to the Multinational Force and Observers mission in the Sinai. Every dollar is designated by Congress as an emergency requirement under sec. 251(b)(2)(A)(i) of the Balanced Budget and Emergency Deficit Control Act of 1985 and is unoffset. The chip''s support direction is cutting, conditioning or winding down U.S. funding and commitments abroad, so a yea is coded as opposing it. The Foreign Military Financing for Israel in the same title is deliberately left out of this reading: the chip''s scope note carves Israel aid out to israel_support. Weighted 50: about $9.2 billion of the $26.4 billion Act.',
        'https://www.govinfo.gov/content/pkg/BILLS-118hr8034ih/html/BILLS-118hr8034ih.htm')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
    n_rows := n_rows + 2;
  END LOOP;

  -- ── H.R. 7217 (118th) — the February 2024 standalone Israel supplemental, failed under suspension 250-180 (house 118/2 roll 38). Three titles. ──
  FOR m IN SELECT id FROM vr_measures WHERE number = 'H.R. 7217' AND congress = 118 LOOP
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m.id, 'strong_defense', 50, false, 'yea_supports',
        'Title I appropriates across the United States military accounts: Military Personnel for the Army, Navy, Marine Corps and Air Force; Operation and Maintenance for each service and $5,035,750,000 Defense-Wide; Procurement, including service missile and ammunition accounts and $5,341,516,000 Defense-Wide; Research, Development, Test and Evaluation for all four services; and $549,800,000 in Revolving and Management Funds. The money replaces defense articles drawn from Department of Defense stocks and sustains United States force operations in the region. A yea funds those accounts. Weighted 50: the Department of Defense title is the bulk of the $17.6 billion bill, and the israel_support row already on this measure carries the aid.',
        'https://www.govinfo.gov/content/pkg/BILLS-118hr7217ih/html/BILLS-118hr7217ih.htm')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
    n_rows := n_rows + 1;
  END LOOP;

  RAISE NOTICE 'heavy-vehicle densification: % curated mapping row(s) asserted', n_rows;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Verification. Two things are checked and neither of them is a join against a
-- politicians table: there is none. vr_member_votes.politician_id is a text
-- slug with no foreign key, resolved in application code through
-- db/vr-member-map.json, and scripts/test-vr-vote-seed.mjs is the harness that
-- proves every slug resolves. What SQL can prove is that the rows this pass
-- asserted are present, and that no member vote hanging off the measures it
-- touched went in blank or with a position no reader can interpret.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  want record;
  n integer;
BEGIN
  FOR want IN
    SELECT * FROM (VALUES
      ('S. 2296', 119, 5),
      ('H.R. 8034', 118, 2),
      ('H.R. 7217', 118, 1)
    ) AS t(number, congress, expected)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM vr_measures WHERE number = want.number AND congress = want.congress) THEN
      RAISE NOTICE 'Verification: % (%th) is not in this database; its rows were skipped.', want.number, want.congress;
      CONTINUE;
    END IF;

    SELECT count(*) INTO n
      FROM vr_measures me
      JOIN vr_measure_issues mi ON mi.measure_id = me.id
     WHERE me.number = want.number
       AND me.congress = want.congress
       AND mi.issue_key IN ('israel_support', 'housing_build', 'immig_fentanyl', 'back_police',
                            'homeless', 'strong_defense', 'america_first_fp');
    IF n < want.expected THEN
      RAISE EXCEPTION 'Verification: % (%) carries % of the % axes this pass asserts.',
        want.number, want.congress, n, want.expected;
    END IF;

    SELECT count(*) INTO n
      FROM vr_measures me
      JOIN vr_rollcalls rc ON rc.measure_id = me.id
      JOIN vr_member_votes mv ON mv.rollcall_id = rc.id
     WHERE me.number = want.number
       AND me.congress = want.congress
       AND (mv.politician_id IS NULL
            OR btrim(mv.politician_id) = ''
            OR mv.position NOT IN ('yea', 'nay', 'present', 'not_voting'));
    IF n > 0 THEN
      RAISE EXCEPTION 'Verification: % (%) has % member vote(s) with a blank member or an unreadable position.',
        want.number, want.congress, n;
    END IF;
  END LOOP;

  -- The one row this pass codes against the grain must stay that way.
  SELECT count(*) INTO n
    FROM vr_measures me
    JOIN vr_measure_issues mi ON mi.measure_id = me.id
   WHERE me.number = 'H.R. 8034' AND me.congress = 118
     AND mi.issue_key = 'america_first_fp' AND mi.support_meaning = 'yea_opposes';
  IF n = 0 AND EXISTS (SELECT 1 FROM vr_measures WHERE number = 'H.R. 8034' AND congress = 118) THEN
    RAISE EXCEPTION 'Verification: the H.R. 8034 america_first_fp row is missing or not coded yea_opposes.';
  END IF;
END $$;
