-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — Phase 4 backfill (wave 8): action timelines, provisions, and two
-- new landmark measures (data-only, additive, idempotent)
-- ─────────────────────────────────────────────────────────────────────────────
-- Scales the Legislation library without touching any applied migration or curated
-- row. Three additive parts, each guarded so re-applying is a clean no-op:
--
--   A) Legislative-action timelines (vr_measure_actions) for the high-impact 119th
--      Congress measures that were seeded WITHOUT one (H.R. 1 and H.R. 29 already had
--      timelines from the Phase 3 migration; this fills in the rest). Each measure
--      gets a milestone timeline derived from its own recorded status + originating
--      chamber, so the bill-detail "How it moved" panel renders a real, sourced path
--      instead of a synthesized one. Guarded per measure by NOT EXISTS on its actions,
--      so a measure that already has a timeline is skipped.
--
--   B) Named provisions (vr_measure_provisions) for the full-year continuing
--      resolution (H.R. 1968) — a true bundle — so its detail panel shows what it
--      packaged and which way a Yea cuts on each part. Guarded by NOT EXISTS.
--
--   C) Two new landmark measures that round out the 2025 record:
--        • H.Con.Res. 14 — the FY2025 budget resolution that set the reconciliation
--          instructions the 2025 tax-and-spending package (H.R. 1) ran through.
--        • H.J.Res. 25 — the Congressional Review Act resolution that repealed the
--          IRS "DeFi broker" digital-asset reporting rule (enacted, Pub. L. 119-5).
--      Each is inserted only when a measure with that (type, congress, number) does
--      not already exist, then given curated high-confidence issue tags + a timeline.
--
-- Sources are canonical Congress.gov pages (the bill's /all-actions view is always a
-- citable, stable URL). Every issue key is from db/issue-keys.json; support_meaning
-- and rationale follow the existing curated pattern. Rolls forward from the applied
-- voting-record migrations; never edits one.

-- ── Part A — action timelines for existing measures lacking one ───────────────
DO $$
DECLARE
  r     RECORD;
  mid   integer;
  intro timestamptz;
  page  text;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('H.R. 4',    'house',  'enacted',      'house-bill', '4'),
      ('H.R. 21',   'house',  'passed_house', 'house-bill', '21'),
      ('H.R. 22',   'house',  'passed_house', 'house-bill', '22'),
      ('H.R. 26',   'house',  'passed_house', 'house-bill', '26'),
      ('H.R. 27',   'house',  'passed_house', 'house-bill', '27'),
      ('H.R. 28',   'house',  'passed_house', 'house-bill', '28'),
      ('H.R. 2483', 'house',  'passed_house', 'house-bill', '2483'),
      ('H.R. 6703', 'house',  'passed_house', 'house-bill', '6703'),
      ('H.R. 1968', 'house',  'enacted',      'house-bill', '1968'),
      ('S. 146',    'senate', 'enacted',      'senate-bill', '146'),
      ('S. 1582',   'senate', 'enacted',      'senate-bill', '1582')
    ) AS t(num, origin, status, slug, n)
  LOOP
    SELECT id, introduced_at INTO mid, intro
      FROM vr_measures WHERE number = r.num AND congress = 119 LIMIT 1;
    CONTINUE WHEN mid IS NULL;                                  -- not seeded — skip
    CONTINUE WHEN EXISTS (SELECT 1 FROM vr_measure_actions WHERE measure_id = mid);

    page := 'https://www.congress.gov/bill/119th-congress/' || r.slug || '/' || r.n || '/all-actions';

    INSERT INTO vr_measure_actions (measure_id, stage, chamber, action_date, text, source_url, source_label, sort_order)
      VALUES (mid, 'introduced', r.origin, intro,
              'Introduced in the ' || initcap(r.origin) || '.', page, 'Congress.gov', 10);

    IF r.origin = 'house' THEN
      INSERT INTO vr_measure_actions (measure_id, stage, chamber, action_date, text, source_url, source_label, sort_order)
        VALUES (mid, 'passed_house', 'house', NULL, 'Passed the House on a recorded vote.', page, 'Congress.gov', 30);
      IF r.status = 'enacted' THEN
        INSERT INTO vr_measure_actions (measure_id, stage, chamber, action_date, text, source_url, source_label, sort_order)
          VALUES (mid, 'passed_senate', 'senate', NULL, 'Passed the Senate.', page, 'Congress.gov', 40),
                 (mid, 'enacted', NULL, NULL, 'Signed into law.', page, 'Congress.gov', 70);
      END IF;
    ELSE
      INSERT INTO vr_measure_actions (measure_id, stage, chamber, action_date, text, source_url, source_label, sort_order)
        VALUES (mid, 'passed_senate', 'senate', NULL, 'Passed the Senate.', page, 'Congress.gov', 40);
      IF r.status = 'enacted' THEN
        INSERT INTO vr_measure_actions (measure_id, stage, chamber, action_date, text, source_url, source_label, sort_order)
          VALUES (mid, 'passed_house', 'house', NULL, 'Passed the House.', page, 'Congress.gov', 30),
                 (mid, 'enacted', NULL, NULL, 'Signed into law.', page, 'Congress.gov', 70);
      END IF;
    END IF;
  END LOOP;
END $$;

-- ── Part B — named provisions for the full-year CR (H.R. 1968) ─────────────────
DO $$
DECLARE
  m_cr integer;
  CR text := 'https://www.congress.gov/bill/119th-congress/house-bill/1968';
BEGIN
  SELECT id INTO m_cr FROM vr_measures WHERE number = 'H.R. 1968' AND congress = 119 LIMIT 1;
  IF m_cr IS NOT NULL AND NOT EXISTS (SELECT 1 FROM vr_measure_provisions WHERE measure_id = m_cr) THEN
    INSERT INTO vr_measure_provisions (measure_id, label, description, issue_key, support_meaning, source_url, sort_order) VALUES
      (m_cr, 'Full-year government funding', 'Funds the federal government through the end of fiscal year 2025, averting a shutdown by replacing the prior stopgap with a full-year continuing resolution.', 'gov_services', 'yea_supports', CR, 10),
      (m_cr, 'Defense funding increase',     'Increases defense appropriations relative to the prior year while holding most non-defense accounts flat or lower.', 'strong_defense', 'yea_supports', CR, 20),
      (m_cr, 'Non-defense spending restraint', 'Holds down or trims non-defense discretionary spending compared with the previous full-year levels.', 'cut_spending', 'yea_supports', CR, 30);
  END IF;
END $$;

-- ── Part C — two new landmark measures ────────────────────────────────────────
DO $$
DECLARE
  m_hcr14 integer;
  m_hjr25 integer;
  HCR14 text := 'https://www.congress.gov/bill/119th-congress/house-concurrent-resolution/14';
  HCR14A text := 'https://www.congress.gov/bill/119th-congress/house-concurrent-resolution/14/all-actions';
  HJR25 text := 'https://www.congress.gov/bill/119th-congress/house-joint-resolution/25';
  HJR25A text := 'https://www.congress.gov/bill/119th-congress/house-joint-resolution/25/all-actions';
BEGIN
  -- (1) H.Con.Res. 14 — FY2025 budget resolution (reconciliation blueprint) ─────
  SELECT id INTO m_hcr14 FROM vr_measures WHERE number = 'H.Con.Res. 14' AND congress = 119 LIMIT 1;
  IF m_hcr14 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary, status, introduced_at, source_url, source_label, external_ids)
    VALUES
      ('resolution', 119, 'house', 'H.Con.Res. 14',
       'Establishing the congressional budget for the United States Government for fiscal year 2025 and setting forth budgetary levels for fiscal years 2026 through 2034',
       'FY2025 Budget Resolution (reconciliation)',
       'The concurrent budget resolution adopted by both chambers that set the reconciliation instructions the 2025 tax-and-spending package (H.R. 1) was assembled under. A concurrent resolution is not signed into law; it governs the budget process.',
       'passed_senate', '2025-02-07T00:00:00Z', HCR14, 'Congress.gov', '{}')
    RETURNING id INTO m_hcr14;

    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
      (m_hcr14, 'national_debt', 100, true,  'yea_supports', 'Sets the fiscal blueprint and reconciliation instructions that framed the year''s tax-and-spending changes.'),
      (m_hcr14, 'cut_spending',   70, false, 'yea_supports', 'Directs committees to find net spending reductions through reconciliation.'),
      (m_hcr14, 'lower_taxes',    60, false, 'yea_supports', 'Reserves reconciliation room to extend and expand the 2017 tax cuts.');

    INSERT INTO vr_measure_actions (measure_id, stage, chamber, action_date, text, source_url, source_label, sort_order) VALUES
      (m_hcr14, 'introduced', 'house', '2025-02-07T00:00:00Z', 'Introduced in the House as the FY2025 budget resolution.', HCR14, 'Congress.gov', 10),
      (m_hcr14, 'passed_house', 'house', NULL, 'House adopted the budget resolution.', HCR14A, 'Congress.gov', 30),
      (m_hcr14, 'passed_senate', 'senate', NULL, 'Senate adopted an amended version.', HCR14A, 'Congress.gov', 40),
      (m_hcr14, 'resolving_differences', 'house', NULL, 'House agreed to the Senate amendment, clearing the reconciliation instructions.', HCR14A, 'Congress.gov', 50);
  END IF;

  -- (2) H.J.Res. 25 — CRA repeal of the IRS "DeFi broker" reporting rule ─────────
  SELECT id INTO m_hjr25 FROM vr_measures WHERE number = 'H.J.Res. 25' AND congress = 119 LIMIT 1;
  IF m_hjr25 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary, status, introduced_at, source_url, source_label, external_ids)
    VALUES
      ('resolution', 119, 'house', 'H.J.Res. 25',
       'Providing for congressional disapproval under chapter 8 of title 5, United States Code, of the rule submitted by the Internal Revenue Service relating to gross proceeds reporting by brokers that regularly provide services effectuating digital asset sales',
       'CRA — repeal IRS DeFi broker rule',
       'A Congressional Review Act resolution nullifying the IRS reporting rule that would have applied broker tax-reporting requirements to decentralized-finance platforms. Enacted as Public Law 119-5.',
       'enacted', '2025-02-07T00:00:00Z', HJR25, 'Congress.gov', '{"publicLaw":"119-5"}')
    RETURNING id INTO m_hjr25;

    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
      (m_hjr25, 'gov_regulation',  100, true,  'yea_supports', 'Repeals a federal reporting rule; a yea rolls back the IRS mandate on decentralized-finance brokers.'),
      (m_hjr25, 'tech_innovation',  60, false, 'yea_supports', 'Supporters framed the rule as unworkable for decentralized software and a drag on U.S. crypto development.');

    INSERT INTO vr_measure_actions (measure_id, stage, chamber, action_date, text, source_url, source_label, sort_order) VALUES
      (m_hjr25, 'introduced', 'house', '2025-02-07T00:00:00Z', 'Introduced in the House under the Congressional Review Act.', HJR25, 'Congress.gov', 10),
      (m_hjr25, 'passed_house', 'house', NULL, 'House passed the disapproval resolution.', HJR25A, 'Congress.gov', 30),
      (m_hjr25, 'passed_senate', 'senate', NULL, 'Senate passed the disapproval resolution.', HJR25A, 'Congress.gov', 40),
      (m_hjr25, 'enacted', NULL, '2025-04-10T00:00:00Z', 'Signed into law as Public Law 119-5, nullifying the rule.', HJR25, 'Congress.gov', 70);
  END IF;
END $$;
