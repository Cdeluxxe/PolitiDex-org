-- ─────────────────────────────────────────────────────────────────────────────
-- ✒️ Executive Enactment Record — a standing for documents published only in the
--    Daily Compilation of Presidential Documents
-- ─────────────────────────────────────────────────────────────────────────────
-- Rolls forward from 20261107000000_seed_exec_actions_wave13.sql. Changes NO
-- schema and edits no applied migration: it inserts into vr_exec_action_status
-- only, every insert is guarded by a NOT EXISTS, and re-applying is a no-op.
--
-- Curated source of truth: db/exec-action-seed.json. scripts/test-exec-seed.mjs
-- reads this file with the seed waves and asserts that every standing citation
-- and date in that file appears here.
--
-- WHY. Wave 13 filed NSPM-2 (DCPD-202500223) and the June 23, 2025 War Powers
-- letter (DCPD-202500715) with no standing row, because every standing basis on
-- file then read the Federal Register, a court, the enrolled text or the
-- chambers' record, and none of them reaches a document published only in GPO's
-- Daily Compilation. With no standing, both were listed on Trump's Iran drawer
-- and then left out of its act count as "not scorable", while their effect lines
-- described what each did.
--
-- WHAT THIS FILES. One `published_dcpd` row per document, citing the same DCPD
-- package the document already cites as its source of record, effective on the
-- date the compilation carries for it. The status column is plain text validated
-- in the Function against db/exec-summary-keys.json, where the token is added in
-- the same change, so no schema change is needed.
--
-- WHAT IT DOES NOT CLAIM. `published_dcpd` records that the document was
-- officially published. It is not `in_force` and not an executive-order
-- disposition, and it says nothing about any challenge. No issue key, pole,
-- mapping or position is added or changed; the letter's war_powers row stays as
-- wave 13 wrote it.
--
-- APPEND-ONLY. No UPDATE, no DELETE, no ALTER.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  m   integer;
  pos integer;
  u   text;
BEGIN
  -- ═══════════════════════════════════════════════════════════════════════════
  -- A. NSPM-2 — DCPD-202500223, February 4, 2025
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.govinfo.gov/content/pkg/DCPD-202500223/html/DCPD-202500223.htm';
  m := NULL; pos := NULL;

  SELECT id INTO m
    FROM vr_measures
   WHERE measure_type = 'memorandum' AND chamber = 'executive'
     AND number = 'NSPM-2'
   LIMIT 1;

  IF m IS NOT NULL THEN
    SELECT id INTO pos
      FROM vr_positions
     WHERE measure_id = m AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;
  END IF;

  IF pos IS NOT NULL THEN
    INSERT INTO vr_exec_action_status
      (position_id, status, effective_at, authority, source_label, source_url, note)
    SELECT pos, 'published_dcpd', TIMESTAMPTZ '2025-02-04T00:00:00Z',
           'Published by the Office of the Federal Register (GPO) in the Daily '
           || 'Compilation of Presidential Documents',
           'GovInfo — Daily Compilation of Presidential Documents, DCPD-202500223 '
           || '(National Security Presidential Memorandum/NSPM-2)',
           u,
           'Published in the Daily Compilation of Presidential Documents as '
           || 'DCPD-202500223, under the date February 4, 2025. The memorandum was not '
           || 'published in the Federal Register, so there is no register disposition '
           || 'record for it; this records that it was published and does not say it '
           || 'remains in force. This is not a statement about any challenge to it.'
     WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                        WHERE position_id = pos AND status = 'published_dcpd'
                          AND effective_at = TIMESTAMPTZ '2025-02-04T00:00:00Z');
  ELSE
    RAISE NOTICE 'NSPM-2 position not found; no DCPD standing written';
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- B. Letter to Congressional Leaders on United States Military Operations in
  --    Iran — DCPD-202500715, June 23, 2025
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.govinfo.gov/content/pkg/DCPD-202500715/html/DCPD-202500715.htm';
  m := NULL; pos := NULL;

  SELECT id INTO m
    FROM vr_measures
   WHERE measure_type = 'memorandum' AND chamber = 'executive'
     AND number = 'Presidential Letter, DCPD-202500715'
   LIMIT 1;

  IF m IS NOT NULL THEN
    SELECT id INTO pos
      FROM vr_positions
     WHERE measure_id = m AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;
  END IF;

  IF pos IS NOT NULL THEN
    INSERT INTO vr_exec_action_status
      (position_id, status, effective_at, authority, source_label, source_url, note)
    SELECT pos, 'published_dcpd', TIMESTAMPTZ '2025-06-23T00:00:00Z',
           'Published by the Office of the Federal Register (GPO) in the Daily '
           || 'Compilation of Presidential Documents',
           'GovInfo — Daily Compilation of Presidential Documents, DCPD-202500715 '
           || '(letter of June 23, 2025)',
           u,
           'Published in the Daily Compilation of Presidential Documents as '
           || 'DCPD-202500715, under the date June 23, 2025. A letter to congressional '
           || 'leaders is not published in the Federal Register, so there is no register '
           || 'disposition record for it; this records that it was published and does '
           || 'not say anything it reported remains in effect. This is not a statement '
           || 'about any challenge to it.'
     WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                        WHERE position_id = pos AND status = 'published_dcpd'
                          AND effective_at = TIMESTAMPTZ '2025-06-23T00:00:00Z');
  ELSE
    RAISE NOTICE 'DCPD-202500715 letter position not found; no DCPD standing written';
  END IF;
END $$;
