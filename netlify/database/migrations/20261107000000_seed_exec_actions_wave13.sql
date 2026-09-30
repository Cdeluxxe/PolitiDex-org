-- ─────────────────────────────────────────────────────────────────────────────
-- ✒️ Executive Enactment Record — wave 13: the second term's Iran instruments
-- ─────────────────────────────────────────────────────────────────────────────
-- Rolls forward from seed waves 1 through 12 and from
-- 20261105000000_vr_iran_policy_issue_key.sql, which opened the iran_policy key
-- and wrote it onto S.J. Res. 68. Changes NO schema and edits no applied
-- migration: it inserts into vr_measures, vr_measure_issues, vr_positions and
-- vr_exec_action_status only, every insert is guarded, and re-applying is a no-op.
--
-- Curated source of truth: db/exec-action-seed.json. scripts/test-exec-seed.mjs
-- reads waves 1 through 13 together and asserts that every citation, date and
-- issue key in that file appears in one of them.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHY THIS WAVE EXISTS
-- ─────────────────────────────────────────────────────────────────────────────
-- After the Iran pass the president's Iran drawer held one document, the 2020
-- veto of S.J. Res. 68, and nothing from the second term. This wave files the
-- second-term Iran instruments that have an official published text, on keys that
-- already exist. No key, pole, class or measure type is added.
--
-- Three documents, all term 47, none of which was on file before this wave:
--   NSPM-2 (2025-02-04)       The maximum-pressure memorandum. iran_policy only.
--                             Not published in the Federal Register; cited to
--                             GPO's Daily Compilation, DCPD-202500223.
--   Letter (2025-06-23)       The War Powers report of the June 21, 2025 strike
--                             on three Iranian nuclear facilities. war_powers
--                             primary (opposes), iran_policy secondary. Cited to
--                             the Daily Compilation, DCPD-202500715.
--   EO 14382 (2026-02-06)     Addressing Threats to the United States by the
--                             Government of Iran, 91 FR 6493. iran_policy only.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT WAS SEARCHED FOR AND NOT FOUND
-- ─────────────────────────────────────────────────────────────────────────────
-- The Federal Register, GovInfo's Daily Compilation of Presidential Documents,
-- WhiteHouse.gov and the American Presidency Project's War Powers Resolution
-- index were searched for a presidential War Powers letter on the hostilities
-- that began February 28, 2026, for one on strikes of June 26-28, 2026, and for
-- any presidential letter or register notice reporting a ceasefire, a termination
-- of hostilities or a stand-down in Iran. None was found — the Daily Compilation
-- carries 2026 statements on Iran, not letters to Congress — so none is filed,
-- and nothing is added on restraint. A later pass that finds one files it in a
-- NEW forward wave.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- IDENTITY
-- ─────────────────────────────────────────────────────────────────────────────
-- The memorandum carries its own number, NSPM-2, which is its document id. The
-- letter has no number of its own; as the Federal Register citation is for a
-- register memorandum, its Daily Compilation package number is its identity.
-- Both are measure_type 'memorandum', the lesser-instrument type the directive
-- class already carries. Neither is on WhiteHouse.gov here.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- SCORES
-- ─────────────────────────────────────────────────────────────────────────────
-- iran_policy is a country key with no pole: it records what was done, not a
-- side. war_powers carries no stated presidential position (see wave 12), so the
-- letter's row there has nothing to be scored against. The support_meaning
-- column is written as for any other row — yea_supports for advances,
-- yea_opposes for opposes — so the rows read the same as every earlier wave.
--
-- pack-generation: derived — up to 4 vr_measure_issues rows below, each guarded
--   by ON CONFLICT DO NOTHING so a re-run is a no-op. Every row that lands moves
--   mappingVersion() in netlify/lib/vr-pack.ts, so every member pack built on the
--   old mapping is retired by its key.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- APPEND-ONLY
-- ─────────────────────────────────────────────────────────────────────────────
-- No UPDATE, no DELETE, no ALTER. Every measure lookup is a guarded SELECT, every
-- issue and position insert carries ON CONFLICT DO NOTHING, and every standing row
-- is guarded by a NOT EXISTS.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  m_nspm2        integer;
  m_eo14382      integer;
  m_ltr0715      integer;
  pos            integer;
  u              text;
BEGIN
  -- ═══════════════════════════════════════════════════════════════════════════
  -- A. NSPM-2 — Imposing Maximum Pressure on the Government of the Islamic
  --    Republic of Iran
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.govinfo.gov/content/pkg/DCPD-202500223/html/DCPD-202500223.htm';

  SELECT id INTO m_nspm2
    FROM vr_measures
   WHERE measure_type = 'memorandum' AND chamber = 'executive'
     AND number = 'NSPM-2'
   LIMIT 1;

  IF m_nspm2 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('memorandum', NULL, 'executive', 'NSPM-2',
       'Imposing Maximum Pressure on the Government of the Islamic Republic of Iran, '
       || 'Denying Iran All Paths to a Nuclear Weapon, and Countering Iran’s Malign Influence',
       'Iran maximum-pressure memorandum',
       'National Security Presidential Memorandum signed 2025-02-04 and published in '
       || 'the Daily Compilation of Presidential Documents as DCPD-202500223; not '
       || 'published in the Federal Register. Section 2 directs the Secretary of the '
       || 'Treasury to impose sanctions and enforcement remedies on persons violating '
       || 'Iran-related sanctions, the Secretary of State to modify or rescind sanctions '
       || 'waivers and to drive Iran''s export of oil to zero, and the Permanent '
       || 'Representative to the United Nations to complete the snapback of '
       || 'international sanctions on Iran.',
       NULL, TIMESTAMPTZ '2025-02-04T00:00:00Z', NULL, 'enacted',
       u, 'GovInfo — Daily Compilation of Presidential Documents',
       '{"dcpdNumber":"DCPD-202500223"}'::jsonb)
    RETURNING id INTO m_nspm2;
    RAISE NOTICE 'created vr_measures NSPM-2 as id %', m_nspm2;
  END IF;

  IF m_nspm2 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_nspm2, 'iran_policy', 90, true, 'yea_supports',
       'Section 2 is headed Enacting Maximum Pressure on the Islamic Republic of '
       || 'Iran. It directs the Treasury to impose sanctions or enforcement remedies '
       || 'on persons violating Iran-related sanctions, the Secretary of State to '
       || 'modify or rescind sanctions waivers and to drive Iran''s export of oil to '
       || 'zero, and the Permanent Representative to the United Nations to complete '
       || 'the snapback of international sanctions on Iran. Iran is the memorandum''s '
       || 'own subject. The key names a country, so no side is read on it.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_nspm2, 'trump', 'issued', true, TIMESTAMPTZ '2025-02-04T00:00:00Z', u,
       'Signed NSPM-2 on 2025-02-04. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- B. Letter to Congressional Leaders on United States Military Operations in
  --    Iran — June 23, 2025
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.govinfo.gov/content/pkg/DCPD-202500715/html/DCPD-202500715.htm';

  SELECT id INTO m_ltr0715
    FROM vr_measures
   WHERE measure_type = 'memorandum' AND chamber = 'executive'
     AND number = 'Presidential Letter, DCPD-202500715'
   LIMIT 1;

  IF m_ltr0715 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('memorandum', NULL, 'executive', 'Presidential Letter, DCPD-202500715',
       'Letter to Congressional Leaders on United States Military Operations in Iran',
       'War Powers report on the June 21, 2025 strike on Iran',
       'Signed 2025-06-23 and sent to the Speaker of the House and the President of '
       || 'the Senate; published in the Daily Compilation of Presidential Documents as '
       || 'DCPD-202500715. Reports that on the night of June 21, 2025, at the '
       || 'President''s direction, United States forces struck three nuclear '
       || 'facilities in Iran, that no ground forces were used, and that the President '
       || 'acted on his constitutional authority as Commander in Chief and Chief '
       || 'Executive and to conduct foreign relations. Provided under the War Powers '
       || 'Resolution (Public Law 93-148).',
       NULL, TIMESTAMPTZ '2025-06-23T00:00:00Z', NULL, 'enacted',
       u, 'GovInfo — Daily Compilation of Presidential Documents',
       '{"dcpdNumber":"DCPD-202500715"}'::jsonb)
    RETURNING id INTO m_ltr0715;
    RAISE NOTICE 'created vr_measures Presidential Letter DCPD-202500715 as id %', m_ltr0715;
  END IF;

  IF m_ltr0715 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_ltr0715, 'war_powers', 85, true, 'yea_opposes',
       'The letter states that on the night of June 21, 2025, at the President''s '
       || 'direction, United States forces conducted a precision strike against three '
       || 'nuclear facilities in Iran, and that he acted pursuant to his constitutional '
       || 'authority as Commander in Chief and Chief Executive. It names no statute or '
       || 'authorization for the use of military force and reports the strike two days '
       || 'after it. Mapped opposes on the congressional war-power key because the '
       || 'letter reports hostilities begun on executive authority alone.', u),
      (m_ltr0715, 'iran_policy', 80, false, 'yea_supports',
       'Iran is the letter''s own subject: it reports a strike against three nuclear '
       || 'facilities in Iran used by the Government of the Islamic Republic of Iran '
       || 'for its nuclear weapons development program. Filed alongside the war-powers '
       || 'row, not in place of it. The key names a country, so no side is read on it.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_ltr0715, 'trump', 'issued', true, TIMESTAMPTZ '2025-06-23T00:00:00Z', u,
       'Signed the letter of 2025-06-23 to congressional leaders. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- C. Executive Order 14382 — Addressing Threats to the United States by the
  --    Government of Iran
  -- ═══════════════════════════════════════════════════════════════════════════
  u := 'https://www.federalregister.gov/documents/2026/02/11/2026-02813/addressing-threats-to-the-united-states-by-the-government-of-iran';

  SELECT id INTO m_eo14382
    FROM vr_measures
   WHERE measure_type = 'executive_order' AND chamber = 'executive'
     AND number = 'Executive Order 14382'
   LIMIT 1;

  IF m_eo14382 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary,
       parent_id, introduced_at, sponsor_id, status, source_url, source_label, external_ids)
    VALUES
      ('executive_order', NULL, 'executive', 'Executive Order 14382',
       'Addressing Threats to the United States by the Government of Iran',
       'Duties on countries trading with Iran',
       'Signed 2026-02-06 and published at 91 FR 6493 on 2026-02-11. Section 1 finds '
       || 'that the national emergency declared in Executive Order 12957 continues and '
       || 'determines that an additional ad valorem duty is necessary on imports from '
       || 'foreign countries that directly or indirectly acquire goods or services from '
       || 'Iran. Section 2 sets the procedure: the Secretary of Commerce identifies such '
       || 'a country and the Secretary of State decides whether and to what extent to '
       || 'impose the duty. Executive Order 14389 of 2026-02-20 ended the added duties '
       || 'imposed under this order and left the emergency and its other actions in effect.',
       NULL, TIMESTAMPTZ '2026-02-06T00:00:00Z', NULL, 'enacted',
       u, 'Federal Register',
       '{"executiveOrder":"14382","frCitation":"91 FR 6493","frDocumentNumber":"2026-02813"}'::jsonb)
    RETURNING id INTO m_eo14382;
    RAISE NOTICE 'created vr_measures Executive Order 14382 as id %', m_eo14382;
  END IF;

  IF m_eo14382 IS NOT NULL THEN
    INSERT INTO vr_measure_issues
      (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
    VALUES
      (m_eo14382, 'iran_policy', 85, true, 'yea_supports',
       'Section 1 finds that the national emergency declared in Executive Order 12957 '
       || 'continues and that the actions and policies of the Government of Iran '
       || 'continue to pose an unusual and extraordinary threat, and determines that '
       || 'an additional ad valorem duty is necessary on imports from foreign countries '
       || 'that acquire goods or services from Iran. Section 2 sets the procedure for '
       || 'finding such a country and deciding the duty. Iran is the order''s own '
       || 'subject. The key names a country, so no side is read on it.', u)
    ON CONFLICT (measure_id, issue_key) DO NOTHING;

    INSERT INTO vr_positions
      (measure_id, politician_id, action_type, supports, acted_at, source_url, note)
    VALUES
      (m_eo14382, 'trump', 'issued', true, TIMESTAMPTZ '2026-02-06T00:00:00Z', u,
       'Signed Executive Order 14382 on 2026-02-06. Sole authorship.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;

    SELECT id INTO pos
      FROM vr_positions
     WHERE measure_id = m_eo14382 AND politician_id = 'trump' AND action_type = 'issued'
     LIMIT 1;

    IF pos IS NOT NULL THEN
      INSERT INTO vr_exec_action_status
        (position_id, status, effective_at, authority, source_label, source_url, note)
      SELECT pos, 'in_force', TIMESTAMPTZ '2026-02-11T00:00:00Z',
             'Issued by the President and published in the Federal Register',
             'Federal Register — Executive Order 14382 document record, 91 FR 6493',
             u,
             'Signed February 6, 2026 and published February 11, 2026 at 91 FR 6493. '
             || 'The register cross-references EO 14389 of February 20, 2026, which ended '
             || 'the added duties imposed under this order and left the Iran emergency and '
             || 'the order''s other actions in effect; no later document revokes the order '
             || 'itself. This describes the register''s record of presidential action and '
             || 'is not a statement about any challenge to the order.'
       WHERE NOT EXISTS (SELECT 1 FROM vr_exec_action_status
                          WHERE position_id = pos AND status = 'in_force'
                            AND effective_at = TIMESTAMPTZ '2026-02-11T00:00:00Z');
    END IF;
  END IF;
END $$;
