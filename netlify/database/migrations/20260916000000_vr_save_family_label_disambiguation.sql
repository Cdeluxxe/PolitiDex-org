-- ─────────────────────────────────────────────────────────────────────────────
-- SAVE-family label disambiguation — three instruments, one recurring short name
-- ─────────────────────────────────────────────────────────────────────────────
-- LABELS ONLY. No mapping is added, moved or removed; no weight, no direction, no
-- supportMeaning, no roll call, no member vote, no stance is touched. Nothing here
-- can move a Direction Match result, because nothing here is read by the score.
--
-- THE PROBLEM. Three separate measures on the election-security face carry short
-- titles a reader cannot tell apart, and two of them are one word off:
--
--   H.R. 8281 (118th)  title 'Safeguard American Voter Eligibility Act'
--                      short 'SAVE Act (118th)'
--   H.R. 22   (119th)  title 'Safeguard American Voter Eligibility (SAVE) Act'
--                      short 'SAVE Act'                     ← the ambiguous one
--   S. 1383   (119th)  title 'SAVE America Act'
--                      short 'SAVE America Act'
--
-- H.R. 22 is the 119th-Congress reintroduction of H.R. 8281 and S. 1383 carries a
-- different, broader substitute text. A member's dossier can list all three on the
-- same issue — Boebert, Emmer, Brecheen and Massie each have votes on more than one
-- of them — and where the list prints short titles (voting-record.mts prefers
-- short_title over title) two of the rows read "SAVE Act" and "SAVE Act (118th)".
-- The unmarked one is the LATER bill, so the natural reading is exactly backwards:
-- the row without a congress looks like the original and the row with one looks
-- like the variant.
--
-- THE FIX. Give H.R. 22 the congress marker its 118th sibling already has, so the
-- pair is symmetric wherever either is printed. The full `title` is left alone: it
-- is the bill's own name and it is correct.
--
--   H.R. 22 (119th)  short_title 'SAVE Act'  →  'SAVE Act (119th)'
--
-- WHAT IS NOT CHANGED, and why. S. 1383's stored title is 'SAVE America Act', which
-- is the substitute text the House actually passed on roll 69 — right, and left as
-- it is. The Clerk's page for that roll still shows the Senate vehicle's own title
-- ('Veterans Accessibility Advisory Committee Act'), and the same is true of
-- H.R. 5746 in the 117th ('NASA Enhanced Use Leasing Extension Act of 2021'). That
-- gap between the stored name and the clerk link is a real thing a reader will hit,
-- and it is answered on the face by a curated identity note in consistency.js
-- (_DOS_IDENT_NOTE) rather than by renaming a measure to match a vehicle it is not.
--
-- Idempotent: the UPDATE is guarded on the current value, so a re-run is a no-op.
DO $$
DECLARE
  n integer;
BEGIN
  UPDATE vr_measures
     SET short_title = 'SAVE Act (119th)', updated_at = now()
   WHERE congress = 119 AND number = 'H.R. 22'
     AND coalesce(short_title, '') IN ('', 'SAVE Act');

  -- Verification: no two election-family measures may share a short title.
  SELECT count(*) INTO n
    FROM (
      SELECT lower(coalesce(short_title, title)) AS lbl
        FROM vr_measures
       WHERE (congress, number) IN
             ((118, 'H.R. 8281'), (119, 'H.R. 22'), (119, 'S. 1383'))
    ) t
   GROUP BY lbl HAVING count(*) > 1
   LIMIT 1;
  IF n IS NOT NULL THEN
    RAISE EXCEPTION 'Verification: two SAVE-family measures still share a display label.';
  END IF;
END $$;
