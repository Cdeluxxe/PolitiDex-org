-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — three primary-lane promotes, in the S. 2 pattern
-- ─────────────────────────────────────────────────────────────────────────────
-- THE PROBLEM, RESTATED
-- `is_primary` on vr_measure_issues has exactly one consumer: _recordDirectionIndex()
-- in stance-helpers.js. Once a member has four or more judged items on an issue
-- (_RD_MIN_JUDGED), it refuses to read a direction unless at least one of those items
-- was primary-mapped (_RD_MIN_PRIMARY = 1), and the comment above that floor says what
-- the flag is for:
--
--     "an incidental omnibus brush is not a lean, it is a coincidence"
--
-- So the engine reads is_primary as NOT-INCIDENTAL. The seeds wrote it as THE SINGLE
-- LARGEST AXIS. Where those disagree the engine discards real evidence, and more
-- same-way roll calls make the refusal worse rather than better. The September 2026
-- S. 2 migration corrected the first instance; the August 2026 primary-lane audit
-- measured the rest.
--
-- WHAT THE AUDIT MEASURED, BEFORE
-- 298 (member, issue) reads were refused with suppressed = 'no_primary' across twelve
-- issues. Three of them, and only three, had an honest member-lane instrument whose
-- own subject IS the issue:
--
--   econ_corp_account   86 members blocked · ZERO primary mappings in any lane
--   voting_access       20 members blocked · all 3 primaries are 117th-Congress votes
--   israel_support       6 members blocked · 15 primaries, none held by these six
--
-- THE FIX
-- Three rows. Nothing else about any mapping moves: weight, support_meaning, issue_key
-- and every section citation stay exactly as they were, and each rationale gains one
-- appended clause stating that the relation is the instrument's own subject and that
-- the weight is still what ranks the axes.
--
--   S.J.Res. 18 (119) econ_corp_account  w75 yea_opposes — a Congressional Review Act
--     resolution whose entire operative effect is to nullify the CFPB rule capping what
--     very large financial institutions may charge in overdraft fees. What the largest
--     banks may charge is the resolution's subject, not a by-product of it. Its existing
--     gov_regulation primary (w100) is untouched and still outranks it.
--   S. 1383 (119) voting_access  w80 yea_opposes — the SAVE America Act substitute the
--     House passed 218-213 on roll 69. Its operative provisions ARE the registration and
--     casting steps this facet measures. The shipped two-facet model states outright that
--     these instruments are election_security-supporting and voting_access-opposing at
--     the same time; the w80 ranking says which axis is larger, not that access is an
--     accident. Its election_security primary (w100) is untouched.
--   H.Amdt. 235 (119) israel_support  w95 yea_opposes — the Massie amendment prohibiting
--     funds appropriated by the Act from being used for Israel and cutting the Foreign
--     Military Financing account by $3.3 billion. The amendment's entire operative text
--     is Israel funding. An amendment is already accepted as a primary on this key
--     (H.Amdt. 478, Tenney), so the vehicle type raises no new question. Its
--     america_first_fp primary (w100) is untouched.
--
-- DRIFT, STATED UP FRONT
-- Measured by re-running the shipped _recordDirectionIndex() over every member with the
-- flags flipped (scripts/vr-audit-primary-lane-aug2026.mjs --simulate):
--
--   econ_corp_account  +86 members gain a direction — 41 advanced-side, 45 opposed-side
--   voting_access      +20 members gain a direction —  8 advanced-side, 12 opposed-side
--                      · 2 mixed records additionally disclose their counts
--   israel_support      +5 of 6 gain a direction —  4 advanced-side,  1 opposed-side
--
-- 0 members lose a read. 0 members change direction. No other issue's direction table
-- moves — the index is computed per issue key, and a sweep of all 93 keys confirmed it.
-- Both sides gain in proportion to how the chambers actually voted, which is the check
-- that this is coverage repair and not a thumb. Utah: Blake Moore (econ_corp_account),
-- Mike Kennedy (voting_access, israel_support).
--
-- The issue lists on all three measures keep their existing order under vr-pack.ts's
-- primary-first-then-weight sort, because in each case the newly-primary row already
-- sat directly below the primary it now joins. Nothing that reads issues[0] moves.
--
-- WHAT WAS REFUSED, and why the same argument does not travel
--   voter_id (H.R. 22) — refused, though promoting it would unblock 101 members, the
--     largest single unblock in the corpus. H.R. 22 requires documentary proof of
--     CITIZENSHIP to register; it is not a photo-ID bill. That subject is already carried
--     at full weight by election_security, the facet created for it, and that key is
--     healthy (4 legislative primaries, 0 blocked). The blocked voter_id rows rest on a
--     median of two distinct measures with half their judged items procedural.
--   voter_id (H.R. 8595) — refused. A seven-key appropriations act whose Division B §103
--     photo-ID condition is one provision of one division.
--   cost_living — refused again, on the same ground the S. 2 migration already gave:
--     every member-lane mapping (H.R. 1319, H.R. 82, S.J.Res. 37, H.J.Res. 88/89) reaches
--     cost of living as a downstream consequence of a relief package, a Social Security
--     offset, a tariff emergency or a vehicle-emissions rule.
--   energy_production (H.R. 26) — refused. Defensible on its own terms, but all 24 blocked
--     members are senators and H.R. 26 is a House bill with one House roll call: the
--     measured effect of promoting it is +0 members.
--   national_debt (H.R. 1 and the rest) — refused. Every non-primary mapping is, by its
--     own rationale, a CBO-score consequence of a spending or tax law rather than a debt
--     instrument. Promoting H.R. 1 would move 14 members, 13 to the same side, off a
--     14-key reconciliation act whose controlling subject is tax.
--   border_security leftovers (H.R. 3486, S. 5, H.R. 29, H.Con.Res. 14, H.R. 1) — refused,
--     by name and for instrument reasons, in the S. 2 migration. Nothing has changed.
--   absence-only cases — refused, because no flag can reach them: Roger Williams was
--     recorded not_voting on both gov_regulation primaries, Mike Lawler on H.R. 3486,
--     Nancy Mace on S. 2, and Anna Paulina Luna was not in Congress for H.R. 1319.
--   procedure, Speaker elections, and coverage-fattening vehicles — refused categorically.
--   the floors — not touched. _RD_MIN_JUDGED, _RD_MIN_PRIMARY, _RD_DOMINANCE,
--     _RD_THIN_MIN, _RD_SPLIT_MIN_JUDGED, _RD_SPLIT_MIN_SIDE and _RD_MEMBER_FLOOR all
--     stay exactly as shipped. Wrong flag, not wrong floor.
--
-- WHAT THIS DOES NOT TOUCH
-- No weight, no support_meaning, no issue_key, no vote, no roll call, no measure, no
-- other measure's is_primary, no new issue key, no new mapping. No floor, threshold or
-- publish gate in shipped JS. Three keyed UPDATEs, additive and idempotent: each is
-- scoped by (number, congress, chamber) and issue_key and sets the same values every
-- time, so re-running the migration is a no-op.
--
-- Mirrored into db/vr-issue-seed.json in the same change, because the shipped seed is
-- what a re-ingest and the offline harnesses read. scripts/test-primary-lane-promotes.mjs
-- asserts the two agree character for character.

UPDATE vr_measure_issues
   SET is_primary = TRUE,
       rationale = 'The nullified rule required very large financial institutions to cap overdraft charges at $5, justify a higher cap, or treat overdrafts as credit subject to Truth in Lending Act disclosure; a yea removes that constraint on what the largest banks may charge. Primary: what the largest banks may charge their customers is the resolution''s own subject — the rule it nullifies is that rule and no other — not a by-product of a broader vehicle. Weighted 75 rather than 100 because the Congressional Review Act framing carries the larger share and outranks it; the weight is what ranks the two axes.'
 WHERE issue_key = 'econ_corp_account'
   AND measure_id IN (
     SELECT id FROM vr_measures
      WHERE number = 'S.J.Res. 18' AND congress = 119 AND chamber = 'senate'
   );

UPDATE vr_measure_issues
   SET is_primary = TRUE,
       rationale = 'The substitute adds a barrier at both steps this facet measures. At registration, a mail-form applicant must present proof "in person to the office of the appropriate election official" by the registration deadline, which closes mail and online registration to anyone who cannot appear; at casting, photo identification becomes a precondition for receiving an in-person ballot, and an in-person voter without one may only cast a provisional ballot and must cure it within three days. The bill''s easing provisions were read and weighed rather than ignored: an alternative-evidence pathway on a perjury attestation, a required process for applicants whose documents carry a former name, free public access to a copier or scanner in government buildings, and exemptions for uniformed-services and certain elderly and disabled voters. Each of those accommodates the new requirement rather than widening access on its own, so the yea does not point both ways here and the facet is not declined the way it is on H.R. 1 and H.R. 5746. Weighted above H.R. 8281''s 70 because that bill reached only the registration step while this one also conditions casting. Primary: the substitute''s operative provisions ARE the registration and casting steps this facet measures, so the access relation is the instrument''s own subject rather than an incidental brush — the two-facet model records the same text as security-supporting and access-opposing at once. Weighted 80 rather than 100 because election_security carries the larger share and outranks it; the weight is what ranks the two axes.'
 WHERE issue_key = 'voting_access'
   AND measure_id IN (
     SELECT id FROM vr_measures
      WHERE number = 'S. 1383' AND congress = 119 AND chamber = 'senate'
   );

UPDATE vr_measure_issues
   SET is_primary = TRUE,
       rationale = 'Prohibits funds appropriated by the FY2026 National Security and State Department appropriations Act from being used for Israel and reduces the Foreign Military Financing Program account by $3.3 billion accordingly — a direct floor attempt to zero out U.S. security assistance to Israel. Failed 104-314 with 10 members voting present. A yea ends the assistance. Primary: the amendment''s entire operative text is Israel funding — prohibiting it and cutting the Foreign Military Financing account by the corresponding amount — so the relation is the instrument''s own subject, not an appropriations by-product. Weighted 95 rather than 100 because the standing-commitment axis carries the larger share and outranks it; the weight is what ranks the two axes.'
 WHERE issue_key = 'israel_support'
   AND measure_id IN (
     SELECT id FROM vr_measures
      WHERE number = 'H.Amdt. 235' AND congress = 119 AND chamber = 'house'
   );
