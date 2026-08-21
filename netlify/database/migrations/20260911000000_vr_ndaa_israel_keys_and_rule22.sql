-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — the Israel provisions inside the three NDAAs, and the doctrine
-- that kept them off the ledger
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT CHANGED, AND WHY IT IS A DOCTRINE CHANGE AND NOT JUST FOUR ROWS
--
-- Runbook rule 22 shipped in 20260910000000 with a bullet called "the section
-- inside a vehicle", which refused H.R. 8800 → `israel_support` on the ground
-- that "three sections inside a defense authorization are not a referendum on
-- them, and a nay on the vehicle is not a nay on the sections." Applied
-- consistently, that bar removes every omnibus from every ledger except its
-- headline key — and it contradicts this repo's own founding position, written
-- in 20260720000000_hr1_omnibus_component_issues.sql: "Major omnibus bills
-- bundle many unrelated policies into a single vote, so one roll call should
-- light up under MANY issues at once."
--
-- The product rule that governs from here:
--
--   If the measure's primary text contains a provision that clearly implicates
--   issue key K, map it. A yea advances the package as written, including that
--   provision; a nay blocks it. Refuse only where the measure is procedural,
--   where the text contains no real provision for K, or where the same
--   conviction is already carried by another mapping ON THAT SAME MEASURE — a
--   rider that was separately voted is mapped on its own roll, not twice.
--   Weight the row for the share of the bill the provision represents and name
--   the sections in the rationale. Direction is what the instrument does on K,
--   not what motivated any bloc.
--
-- "Omnibus", "vehicle", and "members may have cared about a different title"
-- are no longer grounds for refusal. The two-flank refusal (rule 5) survives
-- untouched: where the nay bloc split two ways for opposite reasons, the key
-- still stays off. `db/vr-ingest-runbook.md` rule 22 is rewritten in this same
-- change so the doctrine and the data move together.
--
-- Three NDAAs were sitting on opposite sides of a line that should not have
-- existed. All three carry a dedicated Israel subtitle; none carried the key.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- MAPPED (4 rows, 3 measures) — all secondary, all `yea_supports`
-- ─────────────────────────────────────────────────────────────────────────────
--
-- 1. H.R. 8800 (119th), FY2027 NDAA → `israel_support` (40).
--    Title XII, Subtitle C is headed "Matters relating to Israel": Sec. 1221
--    extends the war reserve stockpile authority for Israel, Sec. 1222 extends
--    anti-tunnel/subterranean cooperation, Sec. 1223 extends counter-unmanned-
--    systems cooperation. Sec. 219 establishes a United States–Israel Defense
--    Technology Cooperation Initiative. A yea enacts all four; a nay blocks the
--    bill that carries them. Weighted 40 — a subtitle plus one section inside a
--    defense authorization is a secondary key, not the bill's purpose. This
--    reverses 20260910000000's refusal of exactly this row, on exactly the text
--    that migration quoted; only the rule changed.
--
--    The parent is NOT re-mapped to `gun_rights`, `lgbtq_rights` or
--    `school_choice`. Those riders were separately voted (H.Amdt. 254-256) and
--    are already seeded on their own rolls — mapping the parent too would count
--    one conviction twice. That is the duplicate rule, and it is the reason the
--    vehicle rule was never needed.
--
-- 2. S. 1071 (119th), FY2026 NDAA, P.L. 119-60 → `israel_support` (35).
--    Read from the enrolled text. Sec. 864 establishes a United States–Israel
--    Defense Industrial Base Working Group; Title XII Subtitle D is headed
--    "Matters Relating to Israel", with Sec. 1231 extending and modifying
--    US–Israel anti-tunnel cooperation, Sec. 1232 extending and modifying
--    US–Israel cooperation to counter unmanned systems in all warfighting
--    domains, and Sec. 1235 requiring a report on joint military exercises;
--    Sec. 1657 provides not more than $60,000,000 for Iron Dome components,
--    $40,000,000 for the David's Sling Weapon System and $100,000,000 for the
--    Arrow 3 Upper Tier Interceptor Program, each through co-production in the
--    United States; Sec. 1706 requires a continual assessment of the impact of
--    international state arms embargoes on Israel.
--
--    Weighted 35 rather than H.R. 8800's 40 for share of the vehicle: the
--    enacted text folds in fourteen separately titled Acts across eight
--    divisions, so the same subtitle is a smaller fraction of what a member
--    voted on. Retires the `israel_support` entry in
--    `db/vr-landmark-vote-seed.json`'s declinedFacets, which is moved to a new
--    `reversedFacets` list rather than deleted.
--
-- 3. S. 1605 (117th), FY2022 NDAA, P.L. 117-81 → `israel_support` (35).
--    20260910000000 left this measure single-key and said so plainly: "Left at
--    `strong_defense` alone until someone reads the enrolled text." The
--    enrolled text (3.1 MB, six divisions) was read in this pass, and it
--    carries the strongest Israel provision of the three. Sec. 1669 makes
--    available not more than $108,000,000 to the Government of Israel for Iron
--    Dome components through United States co-production (subject to the
--    March 5, 2014 DoD–Israeli MoD agreement as amended for Tamir
--    interceptors), not more than $30,000,000 for David's Sling co-production
--    on a one-for-one cash match, and not more than $62,000,000 for the Arrow 3
--    Upper Tier Interceptor Program — $200,000,000 in all. Sec. 1551
--    establishes a DHS United States–Israel cybersecurity grant program under
--    the 2008 homeland-security S&T agreement and authorizes "not less than
--    $6,000,000 for each of fiscal years 2022 through 2026". Sec. 1316
--    establishes the Cyprus, Greece, Israel and United States 3+1
--    Interparliamentary Group.
--
--    Weighted 35, matching S. 1071: both are enacted NDAAs whose text runs well
--    past defense authorization proper (S. 1605's Division E is the Department
--    of State Authorization Act of 2021 and Division F is non-DoD matters).
--    Neither roll is near-unanimous, so rule 2 does not bite: House roll
--    405/117 passed 363-70 (83.8%) and Senate roll 499/117 concurred 88-11
--    (88.9%).
--
-- 4. S. 1605 (117th) → `immig_fentanyl` (25).
--    Sec. 6610, the Blocking Deadly Fentanyl Imports Act, amends section 481(e)
--    of the Foreign Assistance Act of 1961 (22 U.S.C. 2291(e)) to add a majors-
--    list category for a country "that is a significant source of illicit
--    synthetic opioids significantly affecting the United States", and amends
--    22 U.S.C. 2291h(a) with a new paragraph (10) requiring the International
--    Narcotics Control Strategy Report to identify the most significant source
--    countries for illicit fentanyl and describe their cooperation. A yea
--    enacts that listing authority and that reporting duty. Weighted 25, the
--    floor of the curated record: one section working through a majors-list
--    criterion and a report, against S. 1071's four-section BUST Fentanyl Act
--    subtitle at 40.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- READ AND DECLINED ON S. 1605 (the enrolled text, not the summary)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- · `veterans`. Sec. 6601 extends national-cemetery interment eligibility to
--   those who served honorably with a special guerrilla unit or irregular
--   forces operating from a base in Laos between February 28, 1961 and May 7,
--   1975 and were citizens or lawful permanent residents residing in the United
--   States at death; Sec. 6602 adds Egypt and Syria to the deployment list for
--   the VA's open burn pit registry. Both are real, both point the same way,
--   and both are de minimis against a 3 MB act — the honest weight is below the
--   record's floor of 25. Not a vehicle refusal: a size refusal. Queued for the
--   cross-NDAA `veterans` pass that also has to resolve H.R. 2670.
--
-- · `end_dei`. Title LIV ("A Diverse Workforce: Recruitment, Retention, and
--   Promotion", Secs. 5401-5408) is the tempting one and it fails on the chip's
--   own terms. The operative text is recruitment outreach, anti-harassment
--   training and reporting; Sec. 5404 requires that advancement criteria
--   rewarding inclusion be applied "consistent with merit system principles",
--   and Sec. 5408 is a savings clause — nothing in the title compels any
--   employee to participate in data collection or divulge personal
--   information. The chip reads "End diversity, equity and inclusion mandates";
--   this title is not the mandate it describes, in either direction.
--
-- · `foreign_balance`. Sec. 1232 extends the Ukraine Security Assistance
--   Initiative and Title XIII Subtitle A carries NATO matters, so there is a
--   provision. It is declined for consistency, not for the vehicle: neither
--   H.R. 8800 nor S. 1071 carries the key, and lighting it on the oldest of the
--   three NDAAs alone would manufacture exactly the cross-measure inconsistency
--   this pass exists to remove. If it goes on one NDAA it goes on all three,
--   and that is a pass of its own.
--
-- · S. 1605's `strong_defense` weight of 100 is left alone. H.R. 8800 and
--   S. 1071 both sit at 80 for the same kind of bill, so 100 is out of line —
--   but it is a published row, runbook rule 21 requires a corrective UPDATE
--   with its own argument, and re-weighting it was not in this pass's scope.
--   Written down here so the next pass does not have to rediscover it.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- SOURCES, all fetched and read in this pass
-- ─────────────────────────────────────────────────────────────────────────────
--   S. 1605 enrolled  govinfo.gov/content/pkg/BILLS-117s1605enr/html/BILLS-117s1605enr.htm
--   S. 1071 enrolled  govinfo.gov/content/pkg/BILLS-119s1071enr/html/BILLS-119s1071enr.htm
--   H.R. 8800 as reported
--                     govinfo.gov/content/pkg/BILLS-119hr8800rh/xml/BILLS-119hr8800rh.xml
--                     (sections quoted from 20260910000000, which read the same file)
-- congress.gov still returns HTTP 403 to this environment, so every fact above
-- came from GPO.
--
-- `db/vr-issue-seed.json` carries the same four rows byte for byte, per runbook
-- rule 20. Nothing here touches a score formula, a floor, a weight guard, a
-- stance or a roll call.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  m record;
  n_rows integer := 0;
BEGIN

  -- ── H.R. 8800 (119th) — FY2027 National Defense Authorization Act ──────────
  FOR m IN SELECT id FROM vr_measures WHERE number = 'H.R. 8800' AND congress = 119 LOOP
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m.id, 'israel_support', 40, false, 'yea_supports',
        'Title XII, Subtitle C is headed "Matters relating to Israel": Sec. 1221 extends the war reserve stockpile authority for Israel, Sec. 1222 extends United States-Israel anti-tunnel and subterranean warfare cooperation, and Sec. 1223 extends cooperation on countering unmanned aerial systems. Sec. 219 establishes a United States-Israel Defense Technology Cooperation Initiative. A yea enacts all four and keeps U.S. security aid and joint weapons development flowing; a nay blocks the bill that carries them. Weighted 40 for share of the vehicle: this is a subtitle plus one section inside a defense authorization, not the bill''s purpose.',
        'https://www.govinfo.gov/content/pkg/BILLS-119hr8800rh/xml/BILLS-119hr8800rh.xml')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
    n_rows := n_rows + 1;
  END LOOP;

  -- ── S. 1071 (119th) — FY2026 NDAA, P.L. 119-60 ─────────────────────────────
  -- 'S. 1071' matches more than one row in vr_measures, so every row gets it.
  FOR m IN SELECT id FROM vr_measures WHERE number = 'S. 1071' AND congress = 119 LOOP
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m.id, 'israel_support', 35, false, 'yea_supports',
        'Six provisions of the enacted text back Israel militarily. Sec. 864 establishes a United States-Israel Defense Industrial Base Working Group. Title XII, Subtitle D is headed "Matters Relating to Israel": Sec. 1231 extends and modifies anti-tunnel cooperation, Sec. 1232 extends and modifies cooperation to counter unmanned systems in all warfighting domains, and Sec. 1235 requires a report on joint United States-Israel military exercises. Sec. 1657 makes available not more than $60,000,000 to the Government of Israel for Iron Dome components, $40,000,000 for the David''s Sling Weapon System and $100,000,000 for the Arrow 3 Upper Tier Interceptor Program, each through co-production in the United States. Sec. 1706 requires a continual assessment of the impact of international state arms embargoes on Israel. A yea enacts all of it. Weighted 35 rather than the FY2027 NDAA''s 40 because this text folds in fourteen separately titled Acts across eight divisions, so the same subtitle is a smaller share of what was voted on.',
        'https://www.govinfo.gov/content/pkg/BILLS-119s1071enr/html/BILLS-119s1071enr.htm')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
    n_rows := n_rows + 1;
  END LOOP;

  -- ── S. 1605 (117th) — FY2022 NDAA, P.L. 117-81 ─────────────────────────────
  FOR m IN SELECT id FROM vr_measures WHERE number = 'S. 1605' AND congress = 117 LOOP
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m.id, 'israel_support', 35, false, 'yea_supports',
        'Sec. 1669 makes available not more than $108,000,000 to the Government of Israel to procure Iron Dome components through co-production in the United States, not more than $30,000,000 for David''s Sling Weapon System co-production on a one-for-one cash match, and not more than $62,000,000 for the Arrow 3 Upper Tier Interceptor Program — $200,000,000 of missile-defense co-production in one section. Sec. 1551 establishes a Department of Homeland Security United States-Israel cybersecurity grant program and authorizes not less than $6,000,000 for each of fiscal years 2022 through 2026. Sec. 1316 establishes the Cyprus, Greece, Israel and United States 3+1 Interparliamentary Group. A yea funds and continues that backing. Weighted 35 for share of the vehicle: the enacted act also carries the Department of State Authorization Act of 2021 and a division of non-Defense matters.',
        'https://www.govinfo.gov/content/pkg/BILLS-117s1605enr/html/BILLS-117s1605enr.htm'),
      (m.id, 'immig_fentanyl', 25, false, 'yea_supports',
        'Sec. 6610, the Blocking Deadly Fentanyl Imports Act, amends section 481(e) of the Foreign Assistance Act of 1961 (22 U.S.C. 2291(e)) to add a majors-list category for a country that is a significant source of illicit synthetic opioids significantly affecting the United States, and amends 22 U.S.C. 2291h(a) with a new paragraph (10) requiring the International Narcotics Control Strategy Report to identify the most significant source countries for illicit fentanyl and describe how far each is cooperating. A yea enacts that listing authority and that reporting duty. Weighted 25, the floor of this record: one section working through a designation criterion and a report, against the four-section BUST Fentanyl Act subtitle that carries the same key on S. 1071 at 40.',
        'https://www.govinfo.gov/content/pkg/BILLS-117s1605enr/html/BILLS-117s1605enr.htm')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
    n_rows := n_rows + 2;
  END LOOP;

  RAISE NOTICE 'NDAA Israel pass: % curated mapping row(s) asserted', n_rows;
END $$;

-- ── Sanity counters ──────────────────────────────────────────────────────────
DO $$
DECLARE
  v_8800 integer;
  v_1071 integer;
  v_1605 integer;
  v_isr  integer;
BEGIN
  SELECT count(*) INTO v_8800
    FROM vr_measure_issues mi JOIN vr_measures vm ON vm.id = mi.measure_id
   WHERE vm.number = 'H.R. 8800' AND vm.congress = 119;
  SELECT count(*) INTO v_1071
    FROM vr_measure_issues mi JOIN vr_measures vm ON vm.id = mi.measure_id
   WHERE vm.number = 'S. 1071' AND vm.congress = 119;
  SELECT count(*) INTO v_1605
    FROM vr_measure_issues mi JOIN vr_measures vm ON vm.id = mi.measure_id
   WHERE vm.number = 'S. 1605' AND vm.congress = 117;
  SELECT count(DISTINCT mi.measure_id) INTO v_isr
    FROM vr_measure_issues mi WHERE mi.issue_key = 'israel_support';

  RAISE NOTICE 'issue rows now: H.R. 8800 = %, S. 1071 = % (across all matching rows), S. 1605 = %', v_8800, v_1071, v_1605;
  RAISE NOTICE 'israel_support now sits on % measure(s)', v_isr;
END $$;
