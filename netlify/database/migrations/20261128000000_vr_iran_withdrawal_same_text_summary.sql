-- ────────────────────────────────────────────────────────────────────────────
-- The Iran withdrawal resolution, eleven votes: a plain-language summary on
-- each bill page
-- ────────────────────────────────────────────────────────────────────────────
-- WHAT IT WRITES. vr_measures.summary — the description column the bill panel
-- already renders — on the eleven Senate joint resolutions that carry the same
-- Iran withdrawal text (db/vr-text-families.json): S.J.Res. 104, 118, 116, 123,
-- 114, 184, 163, 185, 172, 180 and 181 (119th). Each page said "No
-- plain-language summary on file yet" because 20261023000000_vr_federal_wave_f7
-- wrote the description beside each insert as a comment and left the column
-- NULL.
--
-- THE TEXT IS THE ARCHIVE'S. Sentence one is F7's own stored description of
-- each resolution, word for word. Sentence two is the saving clause as the
-- topic rows' stored rationale reads it ("its saving clause preserves only
-- defence against an attack already under way or imminent"). Nothing is read
-- from Congress.gov and nothing is composed.
--
-- WHAT IT DOES NOT TOUCH. Only a NULL or empty summary is filled, so a summary
-- a later pass writes is never overwritten, and a re-run is a no-op. No title,
-- status, mapping, rationale, weight, roll call or vote moves. A missing
-- measure RAISEs, because all eleven were filed by F7 and must not be
-- re-invented. Pinned by scripts/test-war-powers-same-text.mjs.

DO $$
DECLARE
  s constant text := 'Directs the President to remove United States Armed Forces from hostilities within or against Iran unless a declaration of war or a specific authorization for the use of military force has been enacted. Its saving clause preserves only defense against an attack already under way or imminent.';
  r record;
  m_id integer;
BEGIN
  FOR r IN SELECT * FROM (VALUES
      ('S.J.Res. 104'), ('S.J.Res. 118'), ('S.J.Res. 116'), ('S.J.Res. 123'), ('S.J.Res. 114'), ('S.J.Res. 184'),
      ('S.J.Res. 163'), ('S.J.Res. 185'), ('S.J.Res. 172'), ('S.J.Res. 180'), ('S.J.Res. 181')
    ) AS t(num)
  LOOP
    SELECT id INTO m_id FROM vr_measures
     WHERE measure_type = 'resolution' AND congress = 119 AND chamber = 'senate' AND number = r.num
     LIMIT 1;
    IF m_id IS NULL THEN
      RAISE EXCEPTION 'Iran same-text summary: % (119, senate) is not in vr_measures. This pass writes a summary and creates no measure.', r.num;
    END IF;
    UPDATE vr_measures
       SET summary = s, updated_at = now()
     WHERE id = m_id
       AND (summary IS NULL OR btrim(summary) = '');
  END LOOP;
END $$;
