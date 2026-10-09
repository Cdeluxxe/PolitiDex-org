-- ────────────────────────────────────────────────────────────────────────────
-- Rider audit, wave 2 — the named pairs the first pass listed and did not file
-- ────────────────────────────────────────────────────────────────────────────
-- WHAT WAS WRONG. 20261111000000_vr_rider_audit_offaxis_rows.sql filed only
-- off-axis rows. Thirty more measure × leaf pairs had their topic named in the
-- act's own stored text and were left unfiled because the row would sit inside
-- the act's dominant category (db/vr-rider-audit.json → notFiled). A reader still
-- could not see those topics on the act. Off-axis was the wrong gate for a pair
-- the text names.
--
-- WHAT IT ADDS. 25 vr_measure_issues rows, every one is_primary = false. Weight is
--   the lowest weight the act's existing secondary rows use, or 40 where it has
--   none. Each row quotes the phrase in the act's own stored title / short title /
--   summary that names the leaf. Ledger: db/vr-rider-audit-onaxis.json; pinned by
--   scripts/test-vr-rider-audit-onaxis.mjs.
--
--   H.Amdt. 207 (119th)  climate_action → rural_ag  w40  DOMINANT MOVED climate_energy → climate_energy+economy_cost_of_living
--   H.R. 6329 (119th)  gov_transparency → gov_regulation  w40  DOMINANT MOVED checks_and_balances → checks_and_balances+spending_debt_waste
--   H.R. 5214 (119th)  tough_on_crime → justice_reform  w40  dominant unchanged
--   H.Amdt. 97 (119th)  lands_preserve → strong_defense  w40  DOMINANT MOVED climate_energy → climate_energy+foreign_policy_defense
--   H.J.Res. 25 (119th)  gov_regulation → crypto_cbdc  w60  DOMINANT MOVED economy_cost_of_living+spending_debt_waste → economy_cost_of_living
--   H.R. 3746 (118th)  permitting_reform → cut_spending  w50  DOMINANT MOVED climate_energy → spending_debt_waste
--   H.R. 3746 (118th)  permitting_reform → national_debt  w50  DOMINANT MOVED climate_energy → spending_debt_waste
--   H.R. 1319 (117th)  family_support → housing_support  w40  dominant unchanged
--   H.R. 1319 (117th)  family_support → tax_middle_class  w40  dominant unchanged
--   S. 2938 (117th)  gun_safety → healthcare  w45  DOMINANT MOVED guns → guns+healthcare
--   H.R. 3633 (119th)  tech_innovation → crypto_cbdc  w55  dominant unchanged
--   H.R. 7148 (119th)  strong_defense → healthcare  w35  DOMINANT MOVED foreign_policy_defense → foreign_policy_defense+healthcare
--   S.Amdt. 5813 (119th)  immigration_reform → border_security  w40  dominant unchanged
--   S.B. 224 (2024GS)  energy_production → enviro_energy  w40  dominant unchanged
--   H.R. 815 (118th)  foreign_balance → iran_policy  w45  dominant unchanged
--   H.R. 815 (118th)  foreign_balance → israel_support  w45  dominant unchanged
--   H.B. 562 (2025GS)  tough_on_crime → back_police  w40  dominant unchanged
--   S.B. 262 (2025GS)  housing → housing_support  w60  dominant unchanged
--   H.B. 273 (2024GS)  tough_on_crime → justice_reform  w40  dominant unchanged
--   H.B. 68 (2024GS)  tough_on_crime → justice_reform  w40  dominant unchanged
--   S.B. 194 (2024GS)  privacy_rights → tech_balance  w40  DOMINANT MOVED civil_rights_culture → civil_rights_culture+economy_cost_of_living
--   H.B. 364 (2023GS)  housing_support → housing  w40  dominant unchanged
--   S.B. 26 (2025GS)  dev_district_finance → housing  w40  dominant unchanged
--   S.B. 26 (2025GS)  dev_district_finance → transit  w40  dominant unchanged
--   S.B. 208 (2024GS)  housing → dev_district_finance  w25  dominant unchanged
--
-- DOMINANT CATEGORY. Rows that move an act's dominant category are filed anyway,
--   and no primary flag is touched to stop that. On H.R. 3746 (118th) the axis
--   moves from climate_energy to spending_debt_waste, and on H.J.Res. 25 (119th)
--   a tie resolves to economy_cost_of_living, so on those two acts the existing
--   primary row now reads off-axis. Its is_primary bit is unchanged.
--
-- NOT FILED. The four H.R. 9770 rows the first pass declined stay declined. Five
--   of the thirty are declined here, each with its reason in the ledger:
--   H.Con.Res. 113 → disaster_resilience, H.R. 3076 → social_security,
--   H.B. 243 → transit and H.B. 165 → back_police (passing mentions), and
--   H.B. 405 → healthcare (a bare label with no readable direction).
--
-- WHAT IT DOES NOT DO. No issue key is created. No existing row is updated or
-- deleted, the six rows of the first pass included. No roll call, measure or
-- member vote is written. No effect line is written.
--
-- Idempotent: a missing measure raises a NOTICE and is skipped; an existing
-- (measure_id, issue_key) pair is left alone.
--
-- pack-generation: derived — up to 25 vr_measure_issues rows below, each guarded
--   by NOT EXISTS so a re-run is a no-op. Every row that lands moves
--   mappingVersion() in netlify/lib/vr-pack.ts (row count and the md5 over the
--   ordered tuples), so every member pack built on the old mapping is retired by
--   its key; confirm with scripts/test-vr-pack-key-version.mjs after it lands.

DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'amendment' AND chamber = 'house' AND congress = 119 AND number = 'H.Amdt. 207'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'rider audit wave 2: vr_measures H.Amdt. 207 (119th) not on file; rural_ag skipped';
  ELSIF NOT EXISTS (SELECT 1 FROM vr_measure_issues WHERE measure_id = m_id AND issue_key = 'rural_ag') THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_id, 'rural_ag', 40, false, 'yea_supports',
       'Rider audit wave 2, October 2026: the act''s own stored text names this leaf — "emissions mandates on farm equipment that drives up expenses for farmers". Filed as a secondary row beside the act''s existing rows, never in place of its climate_action primary; the amendment removes emissions mandates on farm equipment that the text says drive up farmers'' expenses, so a yea lowers them.',
       'https://www.congress.gov/amendment/119th-congress/house-amendment/207');
  END IF;
END $$;

DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'bill' AND chamber = 'house' AND congress = 119 AND number = 'H.R. 6329'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'rider audit wave 2: vr_measures H.R. 6329 (119th) not on file; gov_regulation skipped';
  ELSIF NOT EXISTS (SELECT 1 FROM vr_measure_issues WHERE measure_id = m_id AND issue_key = 'gov_regulation') THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_id, 'gov_regulation', 40, false, 'yea_supports',
       'Rider audit wave 2, October 2026: the act''s own stored text names this leaf — "the critical factual material they rely on in rulemaking". Filed as a secondary row beside the act''s existing rows, never in place of its gov_transparency primary; the act puts a disclosure requirement on agency rulemaking, so a yea adds a check on how rules are made.',
       'https://www.congress.gov/bill/119th-congress/house-bill/6329');
  END IF;
END $$;

DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'bill' AND chamber = 'house' AND congress = 119 AND number = 'H.R. 5214'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'rider audit wave 2: vr_measures H.R. 5214 (119th) not on file; justice_reform skipped';
  ELSIF NOT EXISTS (SELECT 1 FROM vr_measure_issues WHERE measure_id = m_id AND issue_key = 'justice_reform') THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_id, 'justice_reform', 40, false, 'yea_opposes',
       'Rider audit wave 2, October 2026: the act''s own stored text names this leaf — "require mandatory cash bail for certain offenses". Filed as a secondary row beside the act''s existing rows, never in place of its tough_on_crime primary; the act mandates pretrial detention and cash bail, the opposite of the leaf''s reduce-incarceration side, so a yea opposes it.',
       'https://www.congress.gov/bill/119th-congress/house-bill/5214');
  END IF;
END $$;

DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'amendment' AND chamber = 'house' AND congress = 119 AND number = 'H.Amdt. 97'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'rider audit wave 2: vr_measures H.Amdt. 97 (119th) not on file; strong_defense skipped';
  ELSIF NOT EXISTS (SELECT 1 FROM vr_measure_issues WHERE measure_id = m_id AND issue_key = 'strong_defense') THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_id, 'strong_defense', 40, false, 'yea_supports',
       'Rider audit wave 2, October 2026: the act''s own stored text names this leaf — "during national defense-related operations". Filed as a secondary row beside the act''s existing rows, never in place of its lands_preserve primary; the amendment exempts military personnel from ESA prohibitions during national defense-related operations, so a yea widens military operating latitude.',
       'https://www.congress.gov/amendment/119th-congress/house-amendment/97');
  END IF;
END $$;

DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'resolution' AND chamber = 'house' AND congress = 119 AND number = 'H.J.Res. 25'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'rider audit wave 2: vr_measures H.J.Res. 25 (119th) not on file; crypto_cbdc skipped';
  ELSIF NOT EXISTS (SELECT 1 FROM vr_measure_issues WHERE measure_id = m_id AND issue_key = 'crypto_cbdc') THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_id, 'crypto_cbdc', 60, false, 'yea_supports',
       'Rider audit wave 2, October 2026: the act''s own stored text names this leaf — "digital asset sales". Filed as a secondary row beside the act''s existing rows, never in place of its gov_regulation primary; the resolution nullifies the IRS broker-reporting rule for digital asset sales; this key carries no pole, so no side is read on it.',
       'https://www.congress.gov/bill/119th-congress/house-joint-resolution/25');
  END IF;
END $$;

DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'bill' AND chamber = 'house' AND congress = 118 AND number = 'H.R. 3746'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'rider audit wave 2: vr_measures H.R. 3746 (118th) not on file; cut_spending skipped';
  ELSIF NOT EXISTS (SELECT 1 FROM vr_measure_issues WHERE measure_id = m_id AND issue_key = 'cut_spending') THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_id, 'cut_spending', 50, false, 'yea_supports',
       'Rider audit wave 2, October 2026: the act''s own stored text names this leaf — "sets discretionary spending caps for FY2024 and FY2025". Filed as a secondary row beside the act''s existing rows, never in place of its permitting_reform primary; Division A caps discretionary spending for two years, enforced by sequestration, so a yea caps it.',
       'https://www.congress.gov/bill/118th-congress/house-bill/3746');
  END IF;
END $$;

DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'bill' AND chamber = 'house' AND congress = 118 AND number = 'H.R. 3746'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'rider audit wave 2: vr_measures H.R. 3746 (118th) not on file; national_debt skipped';
  ELSIF NOT EXISTS (SELECT 1 FROM vr_measure_issues WHERE measure_id = m_id AND issue_key = 'national_debt') THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_id, 'national_debt', 50, false, 'yea_opposes',
       'Rider audit wave 2, October 2026: the act''s own stored text names this leaf — "suspends the debt limit through January 1, 2025". Filed as a secondary row beside the act''s existing rows, never in place of its permitting_reform primary; Division D suspends the debt limit, so a yea lifts the borrowing ceiling; the spending caps are read on the cut_spending row.',
       'https://www.congress.gov/bill/118th-congress/house-bill/3746');
  END IF;
END $$;

DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'bill' AND chamber = 'house' AND congress = 117 AND number = 'H.R. 1319'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'rider audit wave 2: vr_measures H.R. 1319 (117th) not on file; housing_support skipped';
  ELSIF NOT EXISTS (SELECT 1 FROM vr_measure_issues WHERE measure_id = m_id AND issue_key = 'housing_support') THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_id, 'housing_support', 40, false, 'yea_supports',
       'Rider audit wave 2, October 2026: the act''s own stored text names this leaf — "emergency rental and homeowner assistance". Filed as a secondary row beside the act''s existing rows, never in place of its family_support primary; the act funds emergency rental and homeowner assistance, so a yea funds it.',
       'https://www.congress.gov/bill/117th-congress/house-bill/1319');
  END IF;
END $$;

DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'bill' AND chamber = 'house' AND congress = 117 AND number = 'H.R. 1319'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'rider audit wave 2: vr_measures H.R. 1319 (117th) not on file; tax_middle_class skipped';
  ELSIF NOT EXISTS (SELECT 1 FROM vr_measure_issues WHERE measure_id = m_id AND issue_key = 'tax_middle_class') THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_id, 'tax_middle_class', 40, false, 'yea_supports',
       'Rider audit wave 2, October 2026: the act''s own stored text names this leaf — "an expanded child tax credit". Filed as a secondary row beside the act''s existing rows, never in place of its family_support primary; the act expands the child tax credit, so a yea enlarges it.',
       'https://www.congress.gov/bill/117th-congress/house-bill/1319');
  END IF;
END $$;

DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'bill' AND chamber = 'senate' AND congress = 117 AND number = 'S. 2938'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'rider audit wave 2: vr_measures S. 2938 (117th) not on file; healthcare skipped';
  ELSIF NOT EXISTS (SELECT 1 FROM vr_measure_issues WHERE measure_id = m_id AND issue_key = 'healthcare') THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_id, 'healthcare', 45, false, 'yea_supports',
       'Rider audit wave 2, October 2026: the act''s own stored text names this leaf — "guidance on Medicaid telehealth and school-based Medicaid services". Filed as a secondary row beside the act''s existing rows, never in place of its gun_safety primary; Title I directs guidance on Medicaid telehealth and school-based Medicaid services, so a yea widens those routes to care.',
       'https://www.congress.gov/bill/117th-congress/senate-bill/2938');
  END IF;
END $$;

DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'bill' AND chamber = 'house' AND congress = 119 AND number = 'H.R. 3633'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'rider audit wave 2: vr_measures H.R. 3633 (119th) not on file; crypto_cbdc skipped';
  ELSIF NOT EXISTS (SELECT 1 FROM vr_measure_issues WHERE measure_id = m_id AND issue_key = 'crypto_cbdc') THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_id, 'crypto_cbdc', 55, false, 'yea_supports',
       'Rider audit wave 2, October 2026: the act''s own stored text names this leaf — "a market-structure framework for digital assets". Filed as a secondary row beside the act''s existing rows, never in place of its tech_innovation primary; the act sets federal market-structure rules for digital assets; this key carries no pole, so no side is read on it.',
       'https://www.congress.gov/bill/119th-congress/house-bill/3633');
  END IF;
END $$;

DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'bill' AND chamber = 'house' AND congress = 119 AND number = 'H.R. 7148'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'rider audit wave 2: vr_measures H.R. 7148 (119th) not on file; healthcare skipped';
  ELSIF NOT EXISTS (SELECT 1 FROM vr_measure_issues WHERE measure_id = m_id AND issue_key = 'healthcare') THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_id, 'healthcare', 35, false, 'yea_supports',
       'Rider audit wave 2, October 2026: the act''s own stored text names this leaf — "Health Care Extenders". Filed as a secondary row beside the act''s existing rows, never in place of its strong_defense primary; Division J extends health care programs (Secs. 6001-6703), so a yea keeps them running.',
       'https://www.govinfo.gov/content/pkg/PLAW-119publ75/html/PLAW-119publ75.htm');
  END IF;
END $$;

DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'amendment' AND chamber = 'senate' AND congress = 119 AND number = 'S.Amdt. 5813'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'rider audit wave 2: vr_measures S.Amdt. 5813 (119th) not on file; border_security skipped';
  ELSIF NOT EXISTS (SELECT 1 FROM vr_measure_issues WHERE measure_id = m_id AND issue_key = 'border_security') THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_id, 'border_security', 40, false, 'yea_opposes',
       'Rider audit wave 2, October 2026: the act''s own stored text names this leaf — "a nay left the bill''s $69.545 billion entirely with border and immigration enforcement". Filed as a secondary row beside the act''s existing rows, never in place of its immigration_reform primary; a yea moves money from border and immigration enforcement to DACA renewal processing, so a yea opposes the leaf.',
       'https://www.senate.gov/legislative/LIS/roll_call_votes/vote1192/vote_119_2_00156.htm');
  END IF;
END $$;

DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'bill' AND chamber = 'utah senate' AND congress IS NULL AND number = 'S.B. 224'
     AND external_ids->>'utahSession' = '2024GS'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'rider audit wave 2: vr_measures S.B. 224 (2024GS) not on file; enviro_energy skipped';
  ELSIF NOT EXISTS (SELECT 1 FROM vr_measure_issues WHERE measure_id = m_id AND issue_key = 'enviro_energy') THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_id, 'enviro_energy', 40, false, 'yea_supports',
       'Rider audit wave 2, October 2026: the act''s own stored text names this leaf — "Energy Independence Amendments". Filed as a secondary row beside the act''s existing rows, never in place of its energy_production primary; the stored text names energy resource planning but not a direction, so this reads the way the act''s existing energy_production row reads.',
       'https://le.utah.gov/~2024/bills/static/SB0224.html');
  END IF;
END $$;

DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'bill' AND chamber = 'house' AND congress = 118 AND number = 'H.R. 815'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'rider audit wave 2: vr_measures H.R. 815 (118th) not on file; iran_policy skipped';
  ELSIF NOT EXISTS (SELECT 1 FROM vr_measure_issues WHERE measure_id = m_id AND issue_key = 'iran_policy') THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_id, 'iran_policy', 45, false, 'yea_supports',
       'Rider audit wave 2, October 2026: the act''s own stored text names this leaf — "Iran-related sanctions". Filed as a secondary row beside the act''s existing rows, never in place of its foreign_balance primary; Division D carries Iran-related sanctions; this key names a country and carries no pole, so no side is read on it.',
       'https://www.congress.gov/bill/118th-congress/house-bill/815');
  END IF;
END $$;

DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'bill' AND chamber = 'house' AND congress = 118 AND number = 'H.R. 815'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'rider audit wave 2: vr_measures H.R. 815 (118th) not on file; israel_support skipped';
  ELSIF NOT EXISTS (SELECT 1 FROM vr_measure_issues WHERE measure_id = m_id AND issue_key = 'israel_support') THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_id, 'israel_support', 45, false, 'yea_supports',
       'Rider audit wave 2, October 2026: the act''s own stored text names this leaf — "Israel Security Supplemental Appropriations Act, 2024". Filed as a secondary row beside the act''s existing rows, never in place of its foreign_balance primary; Division A is the Israel Security Supplemental Appropriations Act, 2024, so a yea funds it.',
       'https://www.congress.gov/bill/118th-congress/house-bill/815');
  END IF;
END $$;

DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'bill' AND chamber = 'utah house' AND congress IS NULL AND number = 'H.B. 562'
     AND external_ids->>'utahSession' = '2025GS'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'rider audit wave 2: vr_measures H.B. 562 (2025GS) not on file; back_police skipped';
  ELSIF NOT EXISTS (SELECT 1 FROM vr_measure_issues WHERE measure_id = m_id AND issue_key = 'back_police') THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_id, 'back_police', 40, false, 'yea_supports',
       'Rider audit wave 2, October 2026: the act''s own stored text names this leaf — "Law Enforcement and Criminal Justice Amendments". Filed as a secondary row beside the act''s existing rows, never in place of its tough_on_crime primary; the stored text names law enforcement but not a direction, so this reads the way the act''s existing tough_on_crime row reads.',
       'https://le.utah.gov/~2025/bills/static/HB0562.html');
  END IF;
END $$;

DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'bill' AND chamber = 'utah senate' AND congress IS NULL AND number = 'S.B. 262'
     AND external_ids->>'utahSession' = '2025GS'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'rider audit wave 2: vr_measures S.B. 262 (2025GS) not on file; housing_support skipped';
  ELSIF NOT EXISTS (SELECT 1 FROM vr_measure_issues WHERE measure_id = m_id AND issue_key = 'housing_support') THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_id, 'housing_support', 60, false, 'yea_supports',
       'Rider audit wave 2, October 2026: the act''s own stored text names this leaf — "amends provisions related to affordable housing". Filed as a secondary row beside the act''s existing rows, never in place of its housing primary; the stored text names affordable housing but not a direction, so this reads the way the act''s existing housing row reads.',
       'https://le.utah.gov/~2025/bills/static/SB0262.html');
  END IF;
END $$;

DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'bill' AND chamber = 'utah house' AND congress IS NULL AND number = 'H.B. 273'
     AND external_ids->>'utahSession' = '2024GS'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'rider audit wave 2: vr_measures H.B. 273 (2024GS) not on file; justice_reform skipped';
  ELSIF NOT EXISTS (SELECT 1 FROM vr_measure_issues WHERE measure_id = m_id AND issue_key = 'justice_reform') THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_id, 'justice_reform', 40, false, 'yea_opposes',
       'Rider audit wave 2, October 2026: the act''s own stored text names this leaf — "Sentencing Modifications for Certain DUI Offenses". Filed as a secondary row beside the act''s existing rows, never in place of its tough_on_crime primary; the stored text names sentencing for DUI offenses but not a direction; the act''s existing tough_on_crime row reads yea_supports, and this leaf is that one''s opposite side.',
       'https://le.utah.gov/~2024/bills/static/HB0273.html');
  END IF;
END $$;

DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'bill' AND chamber = 'utah house' AND congress IS NULL AND number = 'H.B. 68'
     AND external_ids->>'utahSession' = '2024GS'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'rider audit wave 2: vr_measures H.B. 68 (2024GS) not on file; justice_reform skipped';
  ELSIF NOT EXISTS (SELECT 1 FROM vr_measure_issues WHERE measure_id = m_id AND issue_key = 'justice_reform') THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_id, 'justice_reform', 40, false, 'yea_opposes',
       'Rider audit wave 2, October 2026: the act''s own stored text names this leaf — "Drug Sentencing Modifications". Filed as a secondary row beside the act''s existing rows, never in place of its tough_on_crime primary; the stored text names drug sentencing but not a direction; the act''s existing tough_on_crime row reads yea_supports, and this leaf is that one''s opposite side.',
       'https://le.utah.gov/~2024/bills/static/HB0068.html');
  END IF;
END $$;

DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'bill' AND chamber = 'utah senate' AND congress IS NULL AND number = 'S.B. 194'
     AND external_ids->>'utahSession' = '2024GS'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'rider audit wave 2: vr_measures S.B. 194 (2024GS) not on file; tech_balance skipped';
  ELSIF NOT EXISTS (SELECT 1 FROM vr_measure_issues WHERE measure_id = m_id AND issue_key = 'tech_balance') THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_id, 'tech_balance', 40, false, 'yea_supports',
       'Rider audit wave 2, October 2026: the act''s own stored text names this leaf — "Social Media Regulation". Filed as a secondary row beside the act''s existing rows, never in place of its privacy_rights primary; the bill regulates social media for minors; a *_balance key is never read for a side.',
       'https://le.utah.gov/~2024/bills/static/SB0194.html');
  END IF;
END $$;

DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'bill' AND chamber = 'utah house' AND congress IS NULL AND number = 'H.B. 364'
     AND external_ids->>'utahSession' = '2023GS'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'rider audit wave 2: vr_measures H.B. 364 (2023GS) not on file; housing skipped';
  ELSIF NOT EXISTS (SELECT 1 FROM vr_measure_issues WHERE measure_id = m_id AND issue_key = 'housing') THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_id, 'housing', 40, false, 'yea_supports',
       'Rider audit wave 2, October 2026: the act''s own stored text names this leaf — "Housing Affordability Amendments". Filed as a secondary row beside the act''s existing rows, never in place of its housing_support primary; the stored text names housing affordability but not a direction, so this reads the way the act''s existing housing_support row reads.',
       'https://le.utah.gov/~2023/bills/static/HB0364.html');
  END IF;
END $$;

DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'bill' AND chamber = 'utah senate' AND congress IS NULL AND number = 'S.B. 26'
     AND external_ids->>'utahSession' = '2025GS'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'rider audit wave 2: vr_measures S.B. 26 (2025GS) not on file; housing skipped';
  ELSIF NOT EXISTS (SELECT 1 FROM vr_measure_issues WHERE measure_id = m_id AND issue_key = 'housing') THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_id, 'housing', 40, false, 'yea_supports',
       'Rider audit wave 2, October 2026: the act''s own stored text names this leaf — "Housing and Transit Reinvestment Zone". Filed as a secondary row beside the act''s existing rows, never in place of its dev_district_finance primary; the bill amends the Housing and Transit Reinvestment Zone Act; the stored text names the subject but not a direction, so this reads the way the act''s existing dev_district_finance row reads.',
       'https://le.utah.gov/~2025/bills/static/SB0026.html');
  END IF;
END $$;

DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'bill' AND chamber = 'utah senate' AND congress IS NULL AND number = 'S.B. 26'
     AND external_ids->>'utahSession' = '2025GS'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'rider audit wave 2: vr_measures S.B. 26 (2025GS) not on file; transit skipped';
  ELSIF NOT EXISTS (SELECT 1 FROM vr_measure_issues WHERE measure_id = m_id AND issue_key = 'transit') THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_id, 'transit', 40, false, 'yea_supports',
       'Rider audit wave 2, October 2026: the act''s own stored text names this leaf — "Housing and Transit Reinvestment Zone". Filed as a secondary row beside the act''s existing rows, never in place of its dev_district_finance primary; the bill amends the Housing and Transit Reinvestment Zone Act; the stored text names the subject but not a direction, so this reads the way the act''s existing dev_district_finance row reads.',
       'https://le.utah.gov/~2025/bills/static/SB0026.html');
  END IF;
END $$;

DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'bill' AND chamber = 'utah senate' AND congress IS NULL AND number = 'S.B. 208'
     AND external_ids->>'utahSession' = '2024GS'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'rider audit wave 2: vr_measures S.B. 208 (2024GS) not on file; dev_district_finance skipped';
  ELSIF NOT EXISTS (SELECT 1 FROM vr_measure_issues WHERE measure_id = m_id AND issue_key = 'dev_district_finance') THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_id, 'dev_district_finance', 25, false, 'yea_supports',
       'Rider audit wave 2, October 2026: the act''s own stored text names this leaf — "housing and transit reinvestment zones". Filed as a secondary row beside the act''s existing rows, never in place of its housing primary; the bill amends the law on housing and transit reinvestment zones; the stored text names the subject but not a direction, so this reads the way the act''s existing housing row reads.',
       'https://le.utah.gov/~2024/bills/static/SB0208.html');
  END IF;
END $$;
