-- ─────────────────────────────────────────────────────────────────────────────
-- 20261120000000 — five Utah bills stored as failed that the Governor signed
-- ─────────────────────────────────────────────────────────────────────────────
-- The 2023GS and 2024GS state-record migrations (20261003000000,
-- 20261002000000) stored these five rows with status 'failed'. Each one's own
-- le.utah.gov action history ends with "Governor Signed":
--
--   · 2023GS S.B. 16   Transgender Medical Treatments and Procedures Amendments
--                      Governor Signed 2023-01-28
--   · 2023GS S.B. 288  Utility Bill Assistance Program   Governor Signed 2023-03-09
--   · 2024GS H.B. 153  Governor Signed 2024-03-14
--   · 2024GS H.B. 182  Governor Signed 2024-03-12
--   · 2024GS H.B. 529  Governor Signed 2024-03-12
--
-- (db/bill-record.json holds each history; the bill page already prints
-- "Enacted — signed into law" from it. The roll-call panel prints the stored
-- status, which is what this corrects.)
--
-- STATUS ONLY. Each statement sets `status` and nothing else, on exactly one
-- row identified by chamber, number and session, and only where it still reads
-- 'failed' — so a re-run, or a row already corrected, is a no-op. No issue
-- mapping, weight, polarity, effect line, roll call, member vote or position is
-- written, and no score or Direction Match reads `status`.
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE vr_measures SET status = 'enacted'
 WHERE chamber = 'utah senate' AND number = 'S.B. 16'
   AND external_ids->>'utahSession' = '2023GS' AND status = 'failed';

UPDATE vr_measures SET status = 'enacted'
 WHERE chamber = 'utah senate' AND number = 'S.B. 288'
   AND external_ids->>'utahSession' = '2023GS' AND status = 'failed';

UPDATE vr_measures SET status = 'enacted'
 WHERE chamber = 'utah house' AND number = 'H.B. 153'
   AND external_ids->>'utahSession' = '2024GS' AND status = 'failed';

UPDATE vr_measures SET status = 'enacted'
 WHERE chamber = 'utah house' AND number = 'H.B. 182'
   AND external_ids->>'utahSession' = '2024GS' AND status = 'failed';

UPDATE vr_measures SET status = 'enacted'
 WHERE chamber = 'utah house' AND number = 'H.B. 529'
   AND external_ids->>'utahSession' = '2024GS' AND status = 'failed';
