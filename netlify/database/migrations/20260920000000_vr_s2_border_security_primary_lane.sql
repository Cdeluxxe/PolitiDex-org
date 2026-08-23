-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — S. 2 (119) is a PRIMARY border-security instrument, not an
-- incidental brush against one
-- ─────────────────────────────────────────────────────────────────────────────
-- THE PROBLEM
-- `is_primary` on vr_measure_issues is read by exactly one consumer, and it does
-- not mean what the seeds have been using it to mean.
--
-- The consumer is _recordDirectionIndex() in stance-helpers.js. Once a member has
-- four or more judged items on an issue it refuses to read a direction unless at
-- least one of those items was primary-mapped (`_RD_MIN_PRIMARY = 1`), and the
-- comment above the floor says exactly what the flag is there to catch:
--
--     "an incidental omnibus brush is not a lean, it is a coincidence"
--
-- So the engine reads is_primary as NOT-INCIDENTAL. The seeds have been writing it
-- as THE SINGLE LARGEST AXIS — one primary per measure, the rest ranked below it by
-- weight. Those are different propositions, and where they disagree the engine
-- discards real evidence.
--
-- S. 2 is where they disagree hardest. Its border_security rationale already says so
-- in its own words: "Weighted 90 rather than 100 only because deportations carries
-- the larger share and is the primary." That is a statement about which of two
-- enforcement axes is bigger. It is not, and was never meant to be, a statement that
-- $26.020 billion of Border Patrol hiring (Sec. 101, $9.550B), border inspection and
-- surveillance technology (Sec. 103, $3.450B) and CBP staffing (Sec. 201, $13.020B)
-- is an accident of an omnibus.
--
-- THE MEASURED EFFECT, BEFORE
-- Across the 209 members who hold any border_security item, 100 were refused a
-- direction with suppressed = 'no_primary' — including every House member who voted
-- the full seven-instrument border set. The refusal got WORSE with more evidence: a
-- senator with three of those votes was read (record_uniform_thin does not consult
-- the flag), while a representative with seven of them, all the same way, read as
-- "No clear pattern yet". Utah's UT-03 officeholder was in the second group.
--
-- THE FIX
-- One row. (S. 2, border_security).is_primary becomes true. Nothing else about the
-- mapping moves: weight stays 90 — deportations is still the larger axis and still
-- outranks it — support_meaning stays yea_supports, and the rationale keeps every
-- section citation it already had, with the ranking clause rewritten so it no longer
-- reads as a claim about incidentality.
--
-- WHAT WAS REFUSED, and why the same argument does not travel
--   S. 5 / H.R. 29 (Laken Riley Act) — border_security stays secondary. Their own
--     rationales already give the reason and it is a reason about the instrument,
--     not about ranking: the Act "removes the discretion to release a covered
--     non-citizen from custody once they have been charged, so the immigration laws
--     are enforced through mandatory custody rather than at the line itself." A
--     detention mandate that funds no agent and builds no barrier is exactly the
--     incidental relation the floor is for.
--   H.R. 3486 (119) — refused, and for the same reason the seed already states out
--     loud: "Coded secondary at 65 rather than primary because the bill adds no
--     barrier, no agent". It is a sentencing bill.
--   H.Con.Res. 14 (119) — refused. A budget resolution that reserves reconciliation
--     room is the definition of a brush.
--   H.R. 1 (119) — refused. Border funding is one title of an omnibus reconciliation
--     act whose controlling subject is tax.
--   cost_living — refused entirely, though it is blocked the same way for 36
--     members. Every roll-call instrument mapped to it (H.J.Res. 88/89, H.R. 82,
--     H.R. 1319, S.J.Res. 37) reaches cost of living as a downstream CONSEQUENCE of
--     a vehicle-emissions rule, a Social Security offset, a relief package or a
--     tariff emergency. None of them is a cost-of-living instrument, so there is
--     nothing here to correct and the silence is honest.
--   _RD_MIN_PRIMARY itself — not touched. The floor is right; the flag was wrong.
--
-- DRIFT, STATED UP FRONT
-- This changes formalPatternIndex reads. 98 of the 209 members with border_security
-- items move off "No clear pattern yet" onto a direction: 54 to a support tier and
-- 44 to an oppose tier. Both sides gain, in proportion to how the chamber actually
-- voted, which is the check that this is a coverage repair and not a thumb. No
-- member moves BETWEEN directions, and no member who already had a read loses one.
--
-- WHAT THIS DOES NOT TOUCH
-- No weight, no support_meaning, no issue_key, no vote, no roll call, no measure, no
-- other measure's is_primary. No floor, threshold or publish gate in shipped JS.
-- Additive and idempotent: a keyed UPDATE that can be re-run.
--
-- Mirrored into db/vr-issue-seed.json in the same change, because the shipped seed
-- is what a re-ingest and the offline harnesses read.

UPDATE vr_measure_issues
   SET is_primary = TRUE,
       rationale = 'Sec. 101 appropriates $9.550 billion to hire, pay, train and equip Border Patrol agents and Border Patrol support personnel; Sec. 103 appropriates $3.450 billion for nonintrusive inspection equipment at ports of entry and along the southwest, northern and maritime borders, Air and Marine platforms for rapid response, border surveillance technology upgrades, and the biometric entry and exit system under 8 U.S.C. 1365b; and Secs. 104 and 203 add $5.000 billion for the purposes of their respective titles. A yea funds border personnel and border technology at $26.020 billion counting Sec. 201''s CBP hiring. Primary: the border relation is the instrument''s own subject, not an omnibus by-product — it is one of the two things the Act is. Weighted 90 rather than 100 because deportations carries the larger share and outranks it; the weight is what ranks the two axes. This is far more border-specific than the Laken Riley Act''s border_security mapping (70), which rested on a detention mandate rather than on any border appropriation and stays secondary for that reason.'
 WHERE issue_key = 'border_security'
   AND measure_id IN (
     SELECT id FROM vr_measures
      WHERE number = 'S. 2' AND congress = 119 AND chamber = 'senate'
   );
