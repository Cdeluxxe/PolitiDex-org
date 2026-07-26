-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — backfill the 16 null `vote-question` roll calls (119th, House)
-- ─────────────────────────────────────────────────────────────────────────────
-- Sixteen rows in vr_rollcalls carried `question IS NULL`. Between them they hold
-- 681 recorded member votes across 117 members. Every other column on those rows
-- was populated — chamber, congress, session, roll_number, vote_date, result,
-- totals, source_url, source_label — which is the signature of one ingestion path
-- dropping a single field rather than scattered loss. The Clerk confirms it: all
-- sixteen filled values below come from the seven question strings ALREADY present
-- elsewhere in vr_rollcalls. No new question vocabulary is introduced by this
-- migration, so nothing downstream has to learn a new form.
--
-- WHY IT MATTERS BEYOND DISPLAY. `question` is not decorative. It is the input to
-- yeaBlocksMeasure() (netlify/lib/vr-pack.ts, netlify/functions/voting-record.mts),
-- which sets `advanceInverted` — the flag stance-helpers.js `_voteEffectiveSupport`
-- uses to flip a yea that BLOCKS a measure. A null question cannot match
-- "recommit" / "to commit" / "to table", so an inverted roll call silently reads
-- the ordinary way. Roll 119/1/101 is exactly that case (see below).
--
-- SOURCE. Every value comes from the official U.S. House Clerk electronic-voting
-- record for that roll call, the <vote-question> element of
--   https://clerk.house.gov/evs/<year>/roll<NNN>.xml
-- Nothing is paraphrased: the string written is the Clerk's string, verbatim,
-- including "as Amended" where the Clerk carries it. Before any row was written,
-- its Clerk record was checked against three values we already hold — the bill
-- number, the vote result, and the vote date. All sixteen matched on all three.
--
-- ACTION_TYPE. Corrected on exactly three rows, and only because the real question
-- requires it. The new value is not a judgement call: it is what mapActionType()
-- in netlify/lib/vr-normalize.ts returns for the Clerk question string, so the
-- rows now agree with what a fresh ingest of the same roll call would write. The
-- other thirteen questions map to `passage` under that same function and are left
-- alone. In particular "On Motion to Suspend the Rules and Pass" IS a passage vote
-- (a yea passes the bill) and "On Agreeing to the Resolution" is a resolution's
-- passage vote — both stay `passage` per mapActionType()'s explicit comments.
--
-- ROLL 119/1/101 — the backwards verdict this fixes. H.R. 22 (SAVE Act) carries
-- four issue mappings (voter_id, election_integrity, gov_regulation yea_supports;
-- voting_access yea_opposes) and roll 101 holds 38 recorded votes. The question is
-- "On Motion to Recommit", where a yea sends the bill back to committee. Today the
-- row says `passage` with no question, so those 38 votes read at FULL weight in
-- the ordinary direction — and the same members' true passage vote is roll 119/1/102
-- ("On Passage", 76 votes). The 32 members who voted NAY on 101 and YEA on 102 were
-- consistently supporting the bill; the database presented them as contradicting
-- themselves. After this migration the row is `motion` (procedural, 0.25 weight)
-- and yeaBlocksMeasure() returns true, so the direction is flipped as well as
-- down-weighted. Down-weighting alone would not have fixed it: 0.25 x backwards is
-- still backwards.
--
-- ROLL 119/1/247 — question filled, measure identity deliberately NOT touched.
-- The Clerk record for roll 247 is H.R. 3838 (FY2026 NDAA), "On Agreeing to the
-- Amendment", <amendment-author>Mace of South Carolina Part A Amendment No. 15</…>.
-- GPO BILLSTATUS-119hr3838 identifies that as H.Amdt. 87 (Rep. Mace), "An amendment
-- numbered 15 printed in Part A of House Report 119-255", agreed to 227-201 at
-- 16:57:50 on 2025-09-10 — matching our stored totals {yea:227,nay:201} and
-- vote_date 2025-09-10T20:57Z exactly. But the row's measure_id points at
-- vr_measures id 55, whose number is NULL and whose title is "Election of the
-- Speaker" (the pseudo-measure created for roll 119/1/2), and whose source_url has
-- been overwritten with https://www.congress.gov/amendment/119/house-amendment/87.
-- So measure 55 is a CONFLATED row: identity fields from the Speaker election,
-- source URL from roll 247's amendment, two unrelated roll calls sharing it.
-- Repairing that means inserting a new vr_measures row for H.Amdt. 87 and
-- re-pointing roll 247 — a measure-identity change, not a question backfill — and
-- it must also restore measure 55's own source_url, a row this pass was not asked
-- to touch. Both are left for a follow-up. Measure 55 carries no vr_measure_issues
-- rows, so no ranking direction depends on the mistake in the meantime, and
-- labelling the question honestly does not make it worse.
--
-- OUT OF SCOPE, RECORDED FOR A FOLLOW-UP. All sixteen rows say
-- required_majority = 'simple', but the Clerk <vote-type> is "2/3 YEA-AND-NAY" on
-- the seven suspension votes (2/72, 1/103, 1/107, 1/115, 1/119, 1/315, 1/316).
-- That field is pass-through display only — normalize defaults it to "simple" when
-- the source omits it and no verdict logic reads it — so it is a display-accuracy
-- defect, not a direction defect, and it is left for a separate pass.
-- Also noted, not changed: vr_measures 68 and 69 are duplicate H.Res. 377 rows,
-- which is why rolls 117 and 118 hang off different measure_ids.
--
-- WHY A RE-INGEST COULD NEVER HAVE HEALED THIS. Congress.gov's house-vote LIST
-- endpoint does not carry `voteQuestion` at all — only the per-roll `/members`
-- sub-resource does (see the comment at netlify/lib/vr-ingest.ts:207). When that
-- sub-fetch returns without the metadata, normalizeVote() writes
-- `question: v.voteQuestion || v.question || null` → NULL, and mapActionType("")
-- falls through its final `return "passage"` → every one of the sixteen landed as
-- `passage` with no question. That is the single ingestion path, and it explains why
-- the defect is uniform rather than scattered. Re-running the ingest does not repair
-- it: the roll-call upsert's onConflictDoUpdate sets only { result, totals,
-- measureId, updatedAt } — never question or actionType. Nor could a later seed
-- migration repair it: 20260725040000_vr_seed_waiver_cra_rollcalls.sql inserts
-- roll 119/1/114 with the correct 'On Passage' text, but ON CONFLICT
-- (chamber,congress,session,roll_number) DO NOTHING left the already-present NULL
-- row untouched and then attached its 116 member votes to it. An explicit UPDATE is
-- the only thing that closes this, which is what this migration is.
--
-- BEHAVIOUR ON A DATABASE PROVISIONED FROM SCRATCH. Fifteen of the sixteen roll
-- calls have no migration twin — they exist only because an ad-hoc live ingest
-- created them, the same situation db/vr-house-seed-119-s2-earlier.json was written
-- to fix for a different set. On a fresh branch database those fifteen UPDATEs match
-- nothing and are harmless no-ops; roll 119/1/114 is inserted correctly by
-- 20260725040000 and this UPDATE then agrees with it. Giving the fifteen a seed +
-- generated-migration twin so they survive a fresh provision is a separate,
-- larger piece of work and is NOT attempted here.
--
-- ADDITIVE AND IDEMPOTENT. `question` is written through
-- COALESCE(NULLIF(question,''), …) so a non-empty value is never overwritten, and
-- `action_type` is corrected only while it still holds the stale 'passage'. Rows
-- are keyed on the natural key (chamber, congress, session, roll_number), which is
-- UNIQUE (vr_rollcalls_unique), so this applies correctly on any database
-- regardless of surrogate id ordering. Re-running changes nothing. No rows are
-- inserted or deleted; no vr_measure_issues row is added, removed or altered.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 119th / 2nd session ──────────────────────────────────────────────────────

-- Roll 119/2/72 — S. 2503 (ROTOR Act) — Failed 264-133 — 2026-02-24
-- https://clerk.house.gov/evs/2026/roll072.xml   (local vr_rollcalls id 51)
-- Clerk vote-type "2/3 YEA-AND-NAY": it failed on 2/3 despite a 264-133 majority.
UPDATE vr_rollcalls SET
  question   = COALESCE(NULLIF(question, ''), 'On Motion to Suspend the Rules and Pass'),
  updated_at = now()
WHERE chamber = 'house' AND congress = 119 AND session = 2 AND roll_number = 72;

-- ── 119th / 1st session ──────────────────────────────────────────────────────

-- Roll 119/1/101 — H.R. 22 (SAVE Act) — Failed 211-215 — 2025-04-10
-- https://clerk.house.gov/evs/2025/roll101.xml   (local vr_rollcalls id 132)
-- action_type passage → motion. A yea RECOMMITS the bill, so this roll call is
-- inverted; see the header note. This is the one row in the sixteen where the
-- missing question was producing a backwards verdict on a mapped measure.
UPDATE vr_rollcalls SET
  question    = COALESCE(NULLIF(question, ''), 'On Motion to Recommit'),
  action_type = CASE WHEN action_type = 'passage' THEN 'motion' ELSE action_type END,
  updated_at  = now()
WHERE chamber = 'house' AND congress = 119 AND session = 1 AND roll_number = 101;

-- Roll 119/1/103 — H.R. 973 (Setting Consumer Standards for Lithium-Ion Batteries
-- Act) — Passed 365-42 — 2025-04-28
-- https://clerk.house.gov/evs/2025/roll103.xml   (local vr_rollcalls id 166)
UPDATE vr_rollcalls SET
  question   = COALESCE(NULLIF(question, ''), 'On Motion to Suspend the Rules and Pass'),
  updated_at = now()
WHERE chamber = 'house' AND congress = 119 AND session = 1 AND roll_number = 103;

-- Roll 119/1/107 — H.R. 1402 (TICKET Act) — Passed 409-15 — 2025-04-29
-- https://clerk.house.gov/evs/2025/roll107.xml   (local vr_rollcalls id 170)
UPDATE vr_rollcalls SET
  question   = COALESCE(NULLIF(question, ''), 'On Motion to Suspend the Rules and Pass'),
  updated_at = now()
WHERE chamber = 'house' AND congress = 119 AND session = 1 AND roll_number = 107;

-- Roll 119/1/114 — H.J.Res. 88 (CRA disapproval, EPA Advanced Clean Cars II
-- waiver) — Passed 246-164 — 2025-05-01
-- https://clerk.house.gov/evs/2025/roll114.xml   (local vr_rollcalls id 138)
-- True passage; the largest single block of affected votes (116) and the measure
-- carries five issue mappings, all of which were already read in the right
-- direction. Nothing about the mapping changes.
UPDATE vr_rollcalls SET
  question   = COALESCE(NULLIF(question, ''), 'On Passage'),
  updated_at = now()
WHERE chamber = 'house' AND congress = 119 AND session = 1 AND roll_number = 114;

-- Roll 119/1/115 — H.R. 530 (ACES Act) — Passed 376-5 — 2025-05-05
-- https://clerk.house.gov/evs/2025/roll115.xml   (local vr_rollcalls id 141)
UPDATE vr_rollcalls SET
  question   = COALESCE(NULLIF(question, ''), 'On Motion to Suspend the Rules and Pass, as Amended'),
  updated_at = now()
WHERE chamber = 'house' AND congress = 119 AND session = 1 AND roll_number = 115;

-- Roll 119/1/117 — H.Res. 377 (rule) — Passed 206-200 — 2025-05-06
-- https://clerk.house.gov/evs/2025/roll117.xml   (local vr_rollcalls id 144)
-- action_type passage → procedural. Ordering the previous question is floor
-- process, not adoption of the rule; the adoption vote is roll 118 below. A yea
-- still ADVANCES the measure, so this is not an inversion — it is a weight and
-- honesty correction. The measure carries no issue mappings (rule resolutions are
-- deliberately left unmapped), so no verdict direction is affected.
UPDATE vr_rollcalls SET
  question    = COALESCE(NULLIF(question, ''), 'On Ordering the Previous Question'),
  action_type = CASE WHEN action_type = 'passage' THEN 'procedural' ELSE action_type END,
  updated_at  = now()
WHERE chamber = 'house' AND congress = 119 AND session = 1 AND roll_number = 117;

-- Roll 119/1/118 — H.Res. 377 (rule) — Passed 213-209 — 2025-05-06
-- https://clerk.house.gov/evs/2025/roll118.xml   (local vr_rollcalls id 146)
-- Stays `passage`: adopting a resolution IS its passage vote, which is what
-- mapActionType() returns for this string and how every other
-- "On Agreeing to the Resolution" row in vr_rollcalls is already labelled.
UPDATE vr_rollcalls SET
  question   = COALESCE(NULLIF(question, ''), 'On Agreeing to the Resolution'),
  updated_at = now()
WHERE chamber = 'house' AND congress = 119 AND session = 1 AND roll_number = 118;

-- Roll 119/1/119 — H.R. 1503 (Stop Forced Organ Harvesting Act) — Passed 406-1
-- — 2025-05-07
-- https://clerk.house.gov/evs/2025/roll119.xml   (local vr_rollcalls id 148)
UPDATE vr_rollcalls SET
  question   = COALESCE(NULLIF(question, ''), 'On Motion to Suspend the Rules and Pass'),
  updated_at = now()
WHERE chamber = 'house' AND congress = 119 AND session = 1 AND roll_number = 119;

-- Roll 119/1/247 — H.R. 3838 (FY2026 NDAA), H.Amdt. 87 (Mace) — Agreed to 227-201
-- — 2025-09-10
-- https://clerk.house.gov/evs/2025/roll247.xml   (local vr_rollcalls id 156)
-- action_type passage → amendment. This was never a passage vote on anything.
-- Measure identity left alone on purpose — see the header note on roll 247.
UPDATE vr_rollcalls SET
  question    = COALESCE(NULLIF(question, ''), 'On Agreeing to the Amendment'),
  action_type = CASE WHEN action_type = 'passage' THEN 'amendment' ELSE action_type END,
  updated_at  = now()
WHERE chamber = 'house' AND congress = 119 AND session = 1 AND roll_number = 247;

-- Roll 119/1/309 — H.Res. 916 (rule) — Passed 210-209 — 2025-12-02
-- https://clerk.house.gov/evs/2025/roll309.xml   (local vr_rollcalls id 172)
-- Stays `passage`, same reasoning as roll 118. Unmapped rule resolution.
UPDATE vr_rollcalls SET
  question   = COALESCE(NULLIF(question, ''), 'On Agreeing to the Resolution'),
  updated_at = now()
WHERE chamber = 'house' AND congress = 119 AND session = 1 AND roll_number = 309;

-- Roll 119/1/310 — H.R. 2965 (Small Business Regulatory Reduction Act) — Passed
-- 223-190 — 2025-12-03
-- https://clerk.house.gov/evs/2025/roll310.xml   (local vr_rollcalls id 150)
-- True passage; measure carries gov_regulation + econ_smallbiz (yea_supports),
-- already read in the right direction. Mapping unchanged.
UPDATE vr_rollcalls SET
  question   = COALESCE(NULLIF(question, ''), 'On Passage'),
  updated_at = now()
WHERE chamber = 'house' AND congress = 119 AND session = 1 AND roll_number = 310;

-- Roll 119/1/311 — H.R. 4305 (DUMP Red Tape Act) — Passed 269-146 — 2025-12-03
-- https://clerk.house.gov/evs/2025/roll311.xml   (local vr_rollcalls id 174)
-- True passage; measure carries econ_smallbiz + gov_regulation (yea_supports),
-- already read in the right direction. Mapping unchanged.
UPDATE vr_rollcalls SET
  question   = COALESCE(NULLIF(question, ''), 'On Passage'),
  updated_at = now()
WHERE chamber = 'house' AND congress = 119 AND session = 1 AND roll_number = 311;

-- Roll 119/1/313 — H.R. 1069 (PROTECT Our Kids Act) — Passed 247-164 — 2025-12-04
-- https://clerk.house.gov/evs/2025/roll313.xml   (local vr_rollcalls id 154)
UPDATE vr_rollcalls SET
  question   = COALESCE(NULLIF(question, ''), 'On Passage'),
  updated_at = now()
WHERE chamber = 'house' AND congress = 119 AND session = 1 AND roll_number = 313;

-- Roll 119/1/315 — S. 356 (Secure Rural Schools Reauthorization Act) — Passed
-- 399-5 — 2025-12-09
-- https://clerk.house.gov/evs/2025/roll315.xml   (local vr_rollcalls id 168)
UPDATE vr_rollcalls SET
  question   = COALESCE(NULLIF(question, ''), 'On Motion to Suspend the Rules and Pass'),
  updated_at = now()
WHERE chamber = 'house' AND congress = 119 AND session = 1 AND roll_number = 315;

-- Roll 119/1/316 — H.R. 1676 (Make SWAPs Efficient Act) — Passed 400-0
-- — 2025-12-09 (stored 2025-12-10T00:04Z = 7:04 PM ET on the 9th)
-- https://clerk.house.gov/evs/2025/roll316.xml   (local vr_rollcalls id 160)
UPDATE vr_rollcalls SET
  question   = COALESCE(NULLIF(question, ''), 'On Motion to Suspend the Rules and Pass, as Amended'),
  updated_at = now()
WHERE chamber = 'house' AND congress = 119 AND session = 1 AND roll_number = 316;

-- ── Post-check ───────────────────────────────────────────────────────────────
-- NOTICE, never EXCEPTION: a branch database that was provisioned without some of
-- these roll calls must still finish migrating. A non-zero remaining count means
-- an UPDATE above matched nothing, which is worth seeing in the deploy log.
DO $$
DECLARE
  remaining integer;
  inverted  integer;
BEGIN
  SELECT count(*) INTO remaining
    FROM vr_rollcalls
   WHERE (question IS NULL OR question = '');

  SELECT count(*) INTO inverted
    FROM vr_rollcalls
   WHERE chamber = 'house' AND congress = 119 AND session = 1 AND roll_number = 101
     AND question = 'On Motion to Recommit'
     AND action_type = 'motion';

  RAISE NOTICE 'vr_rollcalls: % row(s) still have an empty question (target 0)', remaining;
  RAISE NOTICE 'vr_rollcalls: roll 119/1/101 recommit correction applied on % row(s) (target 1)', inverted;
END $$;
