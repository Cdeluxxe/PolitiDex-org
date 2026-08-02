-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — backfill the five missing roll-call numbers (119th, 1st session)
-- ─────────────────────────────────────────────────────────────────────────────
-- Nine rows in vr_rollcalls carry `roll_number IS NULL`. Four are nomination votes
-- that no share card can ever use (guard 1 in receipt-cards.js), and they are left
-- alone. The other five are ordinary policy votes holding 202 recorded member votes
-- between them, and the missing number is the ONLY reason 22 otherwise-eligible
-- share cards are refused.
--
-- WHY A NULL ROLL NUMBER BLOCKS A CARD. receipt-cards.js `canonicalCitation` builds
-- the public roll-call page a share card prints — clerk.house.gov/Votes/<year><roll>
-- or senate.gov/.../vote_<congress>_<session>_<roll>.htm — from the one tuple that
-- identifies a roll call unambiguously: (chamber, congress, session, roll number).
-- With the number missing there is nothing to build from, so guard 12 refuses the
-- card rather than printing the stored source_url, which for these five rows is a
-- congress.gov bill page, an all-actions page, or a GovTrack bill page — none of
-- which shows the vote. congress and session are already correct on all five rows
-- (119 / 1); only roll_number is absent.
--
-- SOURCE. Every number below comes from the official chamber record, not from a
-- third party and not from inference:
--
--   House    https://clerk.house.gov/evs/2025/ROLL_000.asp   (rolls 1-99)
--            https://clerk.house.gov/evs/2025/ROLL_100.asp   (rolls 100-199)
--            https://clerk.house.gov/evs/2025/ROLL_200.asp   (rolls 200-299)
--   Senate   https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_119_1.htm
--            and the individual vote_119_1_00NNN.htm pages
--
-- Each candidate roll call was matched on THREE values we already hold before it was
-- accepted — the measure number, the vote date, and the result — and the derived
-- citation URL was then fetched and confirmed to name that roll call:
--
--   id  measure       chamber  date        official question              result    roll
--   32  H.R. 1526     house    2025-04-09  On Passage                     Passed      98
--   38  H.R. 3633     house    2025-07-17  On Passage                     Passed     199
--   39  H.R. 3838     house    2025-09-10  On Passage                     Passed     262
--   24  S.J.Res. 37   senate   2025-04-02  On the Joint Resolution        Passed     160
--   25  S.J.Res. 59   senate   2025-06-27  On the Motion to Discharge     Rejected   328
--
-- S.J.RES. 59 — A QUESTION CORRECTION, NOT JUST A NUMBER. The ledger records this
-- row as "On Passage of the Joint Resolution". The Senate never took a passage vote
-- on S.J.Res. 59. The only recorded Senate vote on it is roll 328 — a motion to
-- DISCHARGE the resolution from the Committee on Foreign Relations, rejected 47-53
-- on 27 June 2025, which is the date and result the row already carries. So the
-- number and the question have to move together: backfilling 328 while leaving the
-- question as "On Passage" would produce a card whose printed question contradicts
-- the very page it cites, which is worse than the card not existing.
--
-- The corrected question is the Senate's own string. `action_type` follows it to
-- `motion`, which is not a judgement call: it is exactly what mapActionType() in
-- netlify/lib/vr-normalize.ts returns for that question, so the row now says what a
-- fresh ingest of the same roll call would write. The consequence is deliberate and
-- correct — `motion` is in PROCEDURAL_TYPES, so guard 6 keeps the S.J.Res. 59 cards
-- refused ("procedural vote — the question does not read plainly off-app"). They
-- move from blocked-because-unciteable to blocked-because-procedural. That is the
-- honest outcome: a discharge motion is not the chamber voting the war-powers
-- question, and a share card must not imply that it was.
--
-- H.R. 3838's stored question ("On Passage (House version)") is left as-is: the
-- parenthetical is an editorial disambiguation, not a claim about the question, and
-- it maps to `passage` under mapActionType() exactly as the Clerk's "On Passage"
-- does. The other three questions already match the official record verbatim.
--
-- SAFETY. Each statement is keyed on measure number + chamber + vote date and is
-- guarded by `roll_number IS NULL`, so it writes at most the one intended row and
-- re-running it is a no-op. Nothing is deleted, no row is created, and no measure
-- identity or issue mapping is touched. Every value written appears in the table
-- above and was read off the chamber's own record.
--
-- NOT FIXED HERE — Senate roll 119/1/7. The link check (scripts/vr-check-citations.mjs)
-- found that this row, attributed to H.R. 29, is in fact the Senate's passage vote on
-- S. 5: same policy, different bill number, 83 member votes affected. That is a
-- measure-identity repair needing a curated S. 5 measure and its own issue mappings,
-- not a roll-number backfill, so it is deliberately out of scope. Until it is fixed,
-- receipt-cards.js guard 14 refuses every card built on that citation.
-- ─────────────────────────────────────────────────────────────────────────────

-- H.R. 1526 — No Rogue Rulings Act of 2025 · House roll 98 · 9 Apr 2025 · Passed
UPDATE vr_rollcalls r
   SET roll_number = 98
  FROM vr_measures m
 WHERE m.id = r.measure_id
   AND m.number = 'H.R. 1526'
   AND r.chamber = 'house'
   AND r.congress = 119
   AND r.session = 1
   AND r.vote_date::date = DATE '2025-04-09'
   AND r.roll_number IS NULL;

-- H.R. 3633 — Digital Asset Market Clarity Act · House roll 199 · 17 Jul 2025 · Passed
UPDATE vr_rollcalls r
   SET roll_number = 199
  FROM vr_measures m
 WHERE m.id = r.measure_id
   AND m.number = 'H.R. 3633'
   AND r.chamber = 'house'
   AND r.congress = 119
   AND r.session = 1
   AND r.vote_date::date = DATE '2025-07-17'
   AND r.roll_number IS NULL;

-- H.R. 3838 — NDAA FY2026 · House roll 262 · 10 Sep 2025 · Passed
UPDATE vr_rollcalls r
   SET roll_number = 262
  FROM vr_measures m
 WHERE m.id = r.measure_id
   AND m.number = 'H.R. 3838'
   AND r.chamber = 'house'
   AND r.congress = 119
   AND r.session = 1
   AND r.vote_date::date = DATE '2025-09-10'
   AND r.roll_number IS NULL;

-- S.J.Res. 37 — terminating the Canada tariff emergency · Senate roll 160 · 2 Apr 2025 · Passed
UPDATE vr_rollcalls r
   SET roll_number = 160
  FROM vr_measures m
 WHERE m.id = r.measure_id
   AND m.number = 'S.J.Res. 37'
   AND r.chamber = 'senate'
   AND r.congress = 119
   AND r.session = 1
   AND r.vote_date::date = DATE '2025-04-02'
   AND r.roll_number IS NULL;

-- S.J.Res. 59 — war powers, Iran · Senate roll 328 · 27 Jun 2025 · Motion to Discharge Rejected.
-- Number and question move together; see the header note.
UPDATE vr_rollcalls r
   SET roll_number = 328,
       question    = 'On the Motion to Discharge (Motion to Discharge S.J. Res. 59 from the Committee on Foreign Relations)',
       action_type = 'motion'
  FROM vr_measures m
 WHERE m.id = r.measure_id
   AND m.number = 'S.J.Res. 59'
   AND r.chamber = 'senate'
   AND r.congress = 119
   AND r.session = 1
   AND r.vote_date::date = DATE '2025-06-27'
   AND r.roll_number IS NULL;
