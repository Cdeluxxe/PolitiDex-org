-- ────────────────────────────────────────────────────────────────────────────
-- Epstein Files Transparency Act II — H.R. 9694 and S. 5005 (119th), secondary
-- rows on gov_transparency, beside H.R. 4405
-- ────────────────────────────────────────────────────────────────────────────
-- WHAT IT ADDS. Two vr_measures rows, two vr_measure_issues rows and nine
-- vr_positions rows:
--   · H.R. 9694 (119th), the Epstein Files Transparency Act II, introduced
--     2026-07-15 by Rep. Massie for himself, Rep. Khanna and Rep. Leger
--     Fernández and referred to the House Judiciary Committee.
--   · S. 5005 (119th), its Senate companion, introduced 2026-07-15 by Sen.
--     Merkley for himself and Sen. Luján and referred to the Senate Judiciary
--     Committee.
-- Each amends the Epstein Files Transparency Act (Public Law 119-38, H.R. 4405)
-- by adding a Sec. 4 that lets a State attorney general, district attorney or
-- other authorized State officer, and a victim, sue the Attorney General of the
-- United States over withheld or redacted Epstein records. Each is filed onto
-- gov_transparency at weight 55, is_primary = false — the same leaf as H.R.
-- 4405. No new issue key.
--
-- THE SPONSORS ARE THE RECORD'S. The sponsor and every co-sponsor the
-- Congress.gov API lists for each bill (read 2026-10-17), each one a roster
-- file: H.R. 9694 — Massie (sponsor); Khanna and Leger Fernández (original,
-- 2026-07-15); Ansari (2026-07-16); Mace (2026-09-01); Bell, Stansbury and Al
-- Green (2026-09-02). S. 5005 — Merkley (sponsor); Luján (original,
-- 2026-07-15). Nobody else is named, and nobody is added who is not.
--
-- WHAT IT DOES NOT DO. No roll call, member vote, pole or score input. H.R.
-- 4405's measure, its mapping, its roll call and its sponsorship rows are not
-- touched. The Epstein Wall Street Records Act is a different subject and is
-- not filed here. The corpus copy of the two rows is db/vr-issue-seed.json; the
-- effect lines are _DOS_EFFECT['H.R. 9694|119|gov_transparency'] and
-- ['S. 5005|119|gov_transparency'] in consistency.js. Pinned by
-- scripts/test-epstein-files-act-ii.mjs.
--
-- Idempotent: each block selects its measure first and creates it only when
-- missing, the mapping is guarded by NOT EXISTS, and the sponsorship rows by
-- ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING.
--
-- pack-generation: derived — up to 2 vr_measure_issues rows below, each guarded
--   by NOT EXISTS so a re-run is a no-op. Every row that lands moves
--   mappingVersion() in netlify/lib/vr-pack.ts, so every member pack built on the
--   old mapping is retired by its key.

-- H.R. 9694 · 119th · Epstein Files Transparency Act II — gov_transparency
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'bill' AND chamber = 'house' AND congress = 119 AND number = 'H.R. 9694'
   LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', 119, 'house', 'H.R. 9694', 'Epstein Files Transparency Act II',
      'Epstein Files Transparency Act II', 'Amends the Epstein Files Transparency Act (Public Law 119-38) to let a State attorney general, district attorney or other authorized State officer, and a victim, sue the Attorney General of the United States over the withholding, redaction, delay or failure to publish Epstein records; gives a victim the right to full, unredacted records about them, including FD-302 files; and lets a Member of Congress bring an action over records the Attorney General withholds from them. Introduced 2026-07-15 and referred to the House Judiciary Committee.', 'introduced',
      'https://www.congress.gov/bill/119th-congress/house-bill/9694', 'Congress.gov',
      jsonb_build_object('congressGovUrl', 'https://www.congress.gov/bill/119th-congress/house-bill/9694', 'billStatusUrl', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/119/hr/BILLSTATUS-119hr9694.xml', 'amends', 'H.R. 4405 (119th), Public Law 119-38', 'mappingReadFrom', 'introduced', 'mappingTextUrl', 'https://www.govinfo.gov/content/pkg/BILLS-119hr9694ih/html/BILLS-119hr9694ih.htm'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'gov_transparency') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'gov_transparency', 55, false,
      'yea_supports', 'The bill adds a Sec. 4 to the Epstein Files Transparency Act under which "the attorney general of a State, a district attorney, or other authorized State officer" and "a victim" may sue the Attorney General of the United States "alleging an unlawful withholding, redaction, delay, removal, concealment, failure to publish, failure to produce, or failure to justify a withholding or redaction" of the records the act requires released. Forcing out records the executive branch holds back is this key''s subject, so a yea supports it. Weighted 55, secondary: it enforces disclosure H.R. 4405 already ordered rather than ordering new disclosure.', 'https://www.govinfo.gov/content/pkg/BILLS-119hr9694ih/html/BILLS-119hr9694ih.htm');
  END IF;

  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    -- Rep. Massie, Thomas (R-KY-4)
    (m_id, 'massie', 'sponsor', true, TIMESTAMPTZ '2026-07-15T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/9694/cosponsors', 'Lead sponsor. Introduced H.R. 9694 on 2026-07-15.'),
    -- Rep. Khanna, Ro (D-CA-17)
    (m_id, 'khanna', 'cosponsor', true, TIMESTAMPTZ '2026-07-15T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/9694/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2026-07-15.'),
    -- Rep. Leger Fernandez, Teresa (D-NM-3)
    (m_id, 'teresa_leger_fernandez', 'cosponsor', true, TIMESTAMPTZ '2026-07-15T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/9694/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2026-07-15.'),
    -- Rep. Ansari, Yassamin (D-AZ-3)
    (m_id, 'yassamin_ansari', 'cosponsor', true, TIMESTAMPTZ '2026-07-16T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/9694/cosponsors', 'Cosponsor, joined 2026-07-16.'),
    -- Rep. Mace, Nancy (R-SC-1)
    (m_id, 'nancy_mace', 'cosponsor', true, TIMESTAMPTZ '2026-09-01T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/9694/cosponsors', 'Cosponsor, joined 2026-09-01.'),
    -- Rep. Bell, Wesley (D-MO-1)
    (m_id, 'wesley_bell', 'cosponsor', true, TIMESTAMPTZ '2026-09-02T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/9694/cosponsors', 'Cosponsor, joined 2026-09-02.'),
    -- Rep. Stansbury, Melanie A. (D-NM-1)
    (m_id, 'melanie_stansbury', 'cosponsor', true, TIMESTAMPTZ '2026-09-02T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/9694/cosponsors', 'Cosponsor, joined 2026-09-02.'),
    -- Rep. Green, Al (D-TX-9)
    (m_id, 'al_green', 'cosponsor', true, TIMESTAMPTZ '2026-09-02T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/house-bill/9694/cosponsors', 'Cosponsor, joined 2026-09-02.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- S. 5005 · 119th · Epstein Files Transparency Act II — gov_transparency
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE measure_type = 'bill' AND chamber = 'senate' AND congress = 119 AND number = 'S. 5005'
   LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', 119, 'senate', 'S. 5005', 'Epstein Files Transparency Act II',
      'Epstein Files Transparency Act II', 'Senate companion to H.R. 9694. Amends the Epstein Files Transparency Act (Public Law 119-38) to let a State attorney general, district attorney or other authorized State officer, and a victim, sue the Attorney General of the United States over the withholding, redaction, delay or failure to publish Epstein records; gives a victim access to unredacted records about them; and lets a Member of Congress bring an action over records withheld from them. Introduced 2026-07-15, read twice and referred to the Senate Judiciary Committee.', 'introduced',
      'https://www.congress.gov/bill/119th-congress/senate-bill/5005', 'Congress.gov',
      jsonb_build_object('congressGovUrl', 'https://www.congress.gov/bill/119th-congress/senate-bill/5005', 'billStatusUrl', 'https://www.govinfo.gov/bulkdata/BILLSTATUS/119/s/BILLSTATUS-119s5005.xml', 'amends', 'H.R. 4405 (119th), Public Law 119-38', 'companionOf', 'H.R. 9694 (119th)', 'mappingReadFrom', 'introduced', 'mappingTextUrl', 'https://www.govinfo.gov/content/pkg/BILLS-119s5005is/html/BILLS-119s5005is.htm'))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'gov_transparency') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'gov_transparency', 55, false,
      'yea_supports', 'The bill adds a Sec. 4 to the Epstein Files Transparency Act under which "the attorney general of a State, a district attorney, or any other authorized State officer" and "a victim" may bring an action "against the Attorney General of the United States" over the withholding or redaction of the records the act requires released. Forcing out records the executive branch holds back is this key''s subject, so a yea supports it. Weighted 55, secondary: it enforces disclosure H.R. 4405 already ordered rather than ordering new disclosure.', 'https://www.govinfo.gov/content/pkg/BILLS-119s5005is/html/BILLS-119s5005is.htm');
  END IF;

  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    -- Sen. Merkley, Jeff (D-OR)
    (m_id, 'merkley', 'sponsor', true, TIMESTAMPTZ '2026-07-15T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/senate-bill/5005/cosponsors', 'Lead sponsor. Introduced S. 5005 on 2026-07-15.'),
    -- Sen. Luján, Ben Ray (D-NM)
    (m_id, 'lujan', 'cosponsor', true, TIMESTAMPTZ '2026-07-15T00:00:00Z',
     'https://www.congress.gov/bill/119th-congress/senate-bill/5005/cosponsors', 'ORIGINAL cosponsor (isOriginalCosponsor=True in the bill''s own record), joining on the day of introduction, 2026-07-15.')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;
