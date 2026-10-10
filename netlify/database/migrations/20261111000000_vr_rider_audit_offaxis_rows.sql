-- ────────────────────────────────────────────────────────────────────────────
-- Rider audit — six off-axis rows the acts' own text names, never filed
-- ────────────────────────────────────────────────────────────────────────────
-- WHAT WAS WRONG. Primary used to be a gate: a bill whose subject was one topic
-- could touch a second and never be filed there, because the second was not the
-- primary. The also-on chips only show mappings that exist, so a missing mapping
-- is invisible. This pass walked every member-voted measure that already holds
-- at least one vr_measure_issues row (296 on the preview branch) and read ONLY
-- that measure's own stored title, short title and summary. No Congress.gov
-- scrape. Where that text names a leaf the archive already has a key for, and
-- the measure holds no row on that key, the pair is a candidate.
--
-- WHAT IT ADDS. Six vr_measure_issues rows on five acts, every one of them
--   is_primary = false, and OFF-AXIS: the leaf's topic category is outside the
--   act's dominant category before the row lands and after every row on that act
--   lands (measureAxis in netlify/lib/vr-axis.ts). Weight is the lowest weight
--   the act's existing secondary rows already use. The full candidate ledger —
--   filed, held and not filed, each with the phrase that names it — is
--   db/vr-rider-audit.json; scripts/test-vr-rider-audit.mjs holds this file to it.
--
--   H.R. 1968 (119th)  cut_spending → border_security  w30  "boosting defense and immigration enforcement"
--   H.R. 3746 (118th)  permitting_reform → homeless  w50  "exempting homeless individuals, veterans and former foster youth"
--   H.R. 3746 (118th)  permitting_reform → veterans  w50  "exempting homeless individuals, veterans and former foster youth"
--   H.R. 1319 (117th)  family_support → healthcare  w40  "expanded Affordable Care Act premium tax credits"
--   S. 2296 (119th)  strong_defense → end_dei  w20  "repeals statutory provisions on diversity, equity and inclusion within the Department"
--   S.Amdt. 1354 (118th)  gun_rights → veterans  w75  "the Secretary of Veterans Affairs to report certain information to the Department of Justice"
--
-- NOT FILED. H.R. 9770 (119th, the FY2027 continuing resolution) names four
--   leaves — FEMA's Disaster Relief Fund, SBA loan programs, the Indian Health
--   Service and USDA livestock price reporting — as anomalies given "funding
--   flexibility or additional amounts" at FY2026 levels. Identity-densification
--   wave 2 already declined its disaster_resilience row in writing (rule 25), and
--   the text does not say what a yea did to any of the four, so none is filed.
--   Thirty more named pairs would be on-axis and are listed, not filed. Nothing
--   is held for the cap: six rows qualify, under the 25 allowed.
--
-- WHAT IT DOES NOT DO. No issue key is created. No existing row is touched: no
-- weight, polarity or primary flag moves, and every act's existing primary row
-- stays its primary. No roll call, measure or member vote is written. No effect
-- line is written; those wait until the rows exist.
--
-- Idempotent: a missing measure raises a NOTICE and is skipped; an existing
-- (measure_id, issue_key) pair is left alone.
--
-- pack-generation: derived — up to 6 vr_measure_issues rows below, each guarded
--   by NOT EXISTS so a re-run is a no-op. Every row that lands moves
--   mappingVersion() in netlify/lib/vr-pack.ts (row count and the md5 over the
--   ordered tuples), so every member pack built on the old mapping is retired by
--   its key; confirm with scripts/test-vr-pack-key-version.mjs after it lands.

DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'bill' AND chamber = 'house' AND congress = 119 AND number = 'H.R. 1968'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'rider audit: vr_measures H.R. 1968 (119th) not on file; border_security skipped';
  ELSIF NOT EXISTS (SELECT 1 FROM vr_measure_issues WHERE measure_id = m_id AND issue_key = 'border_security') THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_id, 'border_security', 30, false, 'yea_supports',
       'Rider audit, October 2026: the act''s own stored text names this leaf — "boosting defense and immigration enforcement". Filed off-axis beside the act''s existing rows, never in place of its cut_spending primary; the summary says the act boosted immigration enforcement, so a yea funds more of it.',
       'https://www.congress.gov/bill/119th-congress/house-bill/1968');
  END IF;
END $$;

DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'bill' AND chamber = 'house' AND congress = 118 AND number = 'H.R. 3746'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'rider audit: vr_measures H.R. 3746 (118th) not on file; homeless skipped';
  ELSIF NOT EXISTS (SELECT 1 FROM vr_measure_issues WHERE measure_id = m_id AND issue_key = 'homeless') THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_id, 'homeless', 50, false, 'yea_supports',
       'Rider audit, October 2026: the act''s own stored text names this leaf — "exempting homeless individuals, veterans and former foster youth". Filed off-axis beside the act''s existing rows, never in place of its permitting_reform primary; the summary says the act exempts homeless individuals from the raised SNAP work-requirement age limit; this key carries no pole, so no side is read on it.',
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
    RAISE NOTICE 'rider audit: vr_measures H.R. 3746 (118th) not on file; veterans skipped';
  ELSIF NOT EXISTS (SELECT 1 FROM vr_measure_issues WHERE measure_id = m_id AND issue_key = 'veterans') THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_id, 'veterans', 50, false, 'yea_supports',
       'Rider audit, October 2026: the act''s own stored text names this leaf — "exempting homeless individuals, veterans and former foster youth". Filed off-axis beside the act''s existing rows, never in place of its permitting_reform primary; the summary says the act exempts veterans from the raised SNAP work-requirement age limit, so a yea enacts that exemption.',
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
    RAISE NOTICE 'rider audit: vr_measures H.R. 1319 (117th) not on file; healthcare skipped';
  ELSIF NOT EXISTS (SELECT 1 FROM vr_measure_issues WHERE measure_id = m_id AND issue_key = 'healthcare') THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_id, 'healthcare', 40, false, 'yea_supports',
       'Rider audit, October 2026: the act''s own stored text names this leaf — "expanded Affordable Care Act premium tax credits". Filed off-axis beside the act''s existing rows, never in place of its family_support primary; the summary says the act expanded ACA premium tax credits, so a yea widens subsidised coverage.',
       'https://www.congress.gov/bill/117th-congress/house-bill/1319');
  END IF;
END $$;

DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'bill' AND chamber = 'senate' AND congress = 119 AND number = 'S. 2296'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'rider audit: vr_measures S. 2296 (119th) not on file; end_dei skipped';
  ELSIF NOT EXISTS (SELECT 1 FROM vr_measure_issues WHERE measure_id = m_id AND issue_key = 'end_dei') THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_id, 'end_dei', 20, false, 'yea_supports',
       'Rider audit, October 2026: the act''s own stored text names this leaf — "repeals statutory provisions on diversity, equity and inclusion within the Department". Filed off-axis beside the act''s existing rows, never in place of its strong_defense primary; the summary says the bill repeals DEI provisions in the Department of Defense, so a yea ends them.',
       'https://www.congress.gov/bill/119th-congress/senate-bill/2296');
  END IF;
END $$;

DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'amendment' AND chamber = 'senate' AND congress = 118 AND number = 'S.Amdt. 1354'
   LIMIT 1;
  IF m_id IS NULL THEN
    RAISE NOTICE 'rider audit: vr_measures S.Amdt. 1354 (118th) not on file; veterans skipped';
  ELSIF NOT EXISTS (SELECT 1 FROM vr_measure_issues WHERE measure_id = m_id AND issue_key = 'veterans') THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_id, 'veterans', 75, false, 'yea_supports',
       'Rider audit, October 2026: the act''s own stored text names this leaf — "the Secretary of Veterans Affairs to report certain information to the Department of Justice". Filed off-axis beside the act''s existing rows, never in place of its gun_rights primary; the amendment bars VA from reporting a beneficiary''s fiduciary determination to NICS, read the same way H.R. 1041 (119th) already reads on this key.',
       'https://www.govinfo.gov/content/pkg/PLAW-118publ42/html/PLAW-118publ42.htm');
  END IF;
END $$;
