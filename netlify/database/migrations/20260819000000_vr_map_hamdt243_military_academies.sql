-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — map H.Amdt. 243 (foreign nationals at the service academies)
-- ─────────────────────────────────────────────────────────────────────────────
-- H.Amdt. 243 to H.R. 8800 (FY2027 NDAA) was seeded as a measure by
-- 20260724140000_seed_house_119_s2_voting_record.sql and got its parent_id in
-- 20260805000000_vr_backfill_amendment_parent_ids.sql, but it never received an
-- issue mapping — so a contested recorded amendment vote (61-360, July 22, 2026)
-- was invisible to the Official Record engine for every member who cast it.
--
-- It is the last amendment in that NDAA series whose stored purpose line is
-- complete and self-contained rather than elided, which is the precondition the
-- mapping runbook sets before a direction may be read off an amendment at all:
--
--   "H.Amdt. 243 (Boebert) to H.R. 8800 — strike section 521 and replace it with
--    a prohibition on foreign nationals attending the United States Military
--    Academies"
--
-- Its siblings (H.Amdt. 244, 245, 247, 249, 250, 259) all end in an ellipsis in
-- our record, so their operative text is unknown to us and they stay unmapped.
-- Recording that here so a later wave does not re-litigate it as an oversight.
--
-- The mapping mirrors H.Amdt. 251 (Crane) in 20260725000000_vr_multi_issue_
-- mappings_wave2.sql, which is the structurally identical case — an amendment
-- that removes foreign military personnel from a U.S. defense program, mapped
-- america_first_fp (primary, yea_supports) plus foreign_balance (yea_opposes).
-- The third key on H.Amdt. 251, cut_spending, is deliberately NOT mirrored: that
-- amendment barred a named category of DoD expenditure, whereas this one changes
-- who may enrol, and the appropriation consequence is not in the text.
--
-- Changes NO schema and adds NO scoring logic. INSERTs into vr_measure_issues
-- ONLY, with ON CONFLICT (measure_id, issue_key) DO NOTHING, so it is additive
-- and idempotent. Rolls forward from the applied migrations; never edits one.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  -- vr_measures.id is a serial (integer) primary key, not a uuid — see
  -- 20260710184027_create_voting_record_tables. Declaring this as uuid made the
  -- SELECT ... INTO fail on assignment ("invalid input syntax for type uuid"),
  -- which aborted the whole migration run.
  m_ha243 integer;
BEGIN
  SELECT id INTO m_ha243 FROM vr_measures WHERE number = 'H.Amdt. 243' AND congress = 119 LIMIT 1;
  IF m_ha243 IS NOT NULL THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES
      (m_ha243, 'america_first_fp', 100, true, 'yea_supports',
        'Strikes section 521 and replaces it with a prohibition on foreign nationals attending the United States Military Academies, ending a U.S.-funded training relationship with the officer corps of partner nations; a yea restricts the academies to Americans.',
        'https://www.congress.gov/amendment/119th-congress/house-amendment/243'),
      (m_ha243, 'foreign_balance', 70, false, 'yea_opposes',
        'Cadet places for partner-nation officers are one of the working mechanisms of long-run allied military relationships; a yea removes them, cutting against leading through allied commitments. Same framing as the H.Amdt. 251 mapping already in the record.',
        'https://www.congress.gov/amendment/119th-congress/house-amendment/243')
    ON CONFLICT (measure_id, issue_key) DO NOTHING;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2 mappings across 1 measure. H.Amdt. 243 goes from unmapped to a two-issue
-- measure, so its Voting Record card renders the component breakdown and the
-- 421 members who voted on it gain an Official Record row on america_first_fp.
-- ─────────────────────────────────────────────────────────────────────────────
