-- ─────────────────────────────────────────────────────────────────────────────
-- 20261119000000 — the three Utah 2026 General Session data-center bills that
-- were filed and never passed, as bill rows of their own
-- ─────────────────────────────────────────────────────────────────────────────
-- 20261118000000_vr_current_bills_full_lens read every 2026GS bill record on
-- le.utah.gov for data centers and large loads and found five. Two (H.B. 76,
-- H.B. 507) were signed and were filed then. The other three were noted in
-- db/vr-current-bills.json `notEnrolled` and left without a row:
--
--   · H.B. 585  Data Center Amendments                  Rep. Dominguez, Rosalba
--               House Comm - Recommends Returned to Rules (2026-03-02);
--               House/ strike enacting clause; House/ filed (2026-03-06)
--   · S.B. 282  Electrical Grid Amendments              Sen. Blouin, Nate
--               Senate Comm - Motion to Recommend Failed 2-3-3 (2026-02-18);
--               Senate/ strike enacting clause; Senate/ filed (2026-03-06)
--   · S.B. 318  Data Center Non Disclosure Amendments   Sen. Blouin, Nate
--               Senate/ strike enacting clause; Senate/ filed (2026-03-06)
--
-- Each is filed here the way every Utah bill row is: chamber, number, the
-- record's short title, its one-line general provisions as the summary, the
-- bill page as the source, and the session in external_ids. Status is
-- 'failed' — "House/ filed" and "Senate/ filed" are le.utah.gov's own last
-- action for a bill not passed (owner: "House file for bills not passed").
--
-- WHAT THIS DOES NOT ADD. No vr_measure_issues row (no new issue mapping, no
-- effect line), no roll call, no member vote, no vr_positions row. Nothing a
-- score, Direction Match or a member's voting record reads changes. The rows
-- exist so each bill has a /b/2026GS/<number> page that says who wrote it and
-- that it failed.
--
-- Idempotent: each insert is guarded by a lookup on the session-scoped
-- identity the vr_measures_utah_unique index enforces.
-- ─────────────────────────────────────────────────────────────────────────────

-- H.B. 585 · 2026GS · Data Center Amendments — failed, no mapping
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 585' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2026GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 585', 'Data Center Amendments',
      'Data Center Amendments', 'This bill requires large data centers to report energy use information.', 'failed',
      'https://le.utah.gov/~2026/bills/static/HB0585.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2026GS', 'utahBill', 'HB0585',
        'primeSponsor', 'Rep. Dominguez, Rosalba', 'lastAction', 'House/ filed', 'lastActionDate', '2026-03-06'))
    RETURNING id INTO m_id;
  END IF;
END $$;

-- S.B. 282 · 2026GS · Electrical Grid Amendments — failed, no mapping
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 282' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2026GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah senate', 'S.B. 282', 'Electrical Grid Amendments',
      'Electrical Grid Amendments', 'This bill amends provisions related to large-scale electric service requirements.', 'failed',
      'https://le.utah.gov/~2026/bills/static/SB0282.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2026GS', 'utahBill', 'SB0282',
        'primeSponsor', 'Sen. Blouin, Nate', 'lastAction', 'Senate/ filed', 'lastActionDate', '2026-03-06'))
    RETURNING id INTO m_id;
  END IF;
END $$;

-- S.B. 318 · 2026GS · Data Center Non Disclosure Amendments — failed, no mapping
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 318' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2026GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah senate', 'S.B. 318', 'Data Center Non Disclosure Amendments',
      'Data Center Non Disclosure Amendments', 'This bill prohibits certain non-disclosure agreements between prospective data centers and state and local governments.', 'failed',
      'https://le.utah.gov/~2026/bills/static/SB0318.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2026GS', 'utahBill', 'SB0318',
        'primeSponsor', 'Sen. Blouin, Nate', 'lastAction', 'Senate/ filed', 'lastActionDate', '2026-03-06'))
    RETURNING id INTO m_id;
  END IF;
END $$;
