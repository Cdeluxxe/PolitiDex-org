-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — Phase 13C: make the LIVE House data usable as say-vs-do signal
-- ─────────────────────────────────────────────────────────────────────────────
-- The Congress.gov House ingest is now landing real roll calls, but the rows it wrote
-- are not yet usable by the Say-vs-Do engine, the Stance Library rollups, the
-- comparison consistency dots or the Alignment Tool. Three reasons, all fixed here:
--
--   1. IDENTITY — two House amendment votes lost their identity and merged with the
--      Speaker election into a single numberless measure row. An issue mapping on that
--      row would have been attributed to all three unrelated votes.
--   2. SEMANTICS — every live roll call was written with `action_type = 'passage'` and
--      `question = NULL`, because the classifier was reading `voteType` (the ballot
--      mechanism, "Yea-and-Nay") instead of the vote QUESTION. So a Motion to Recommit
--      and an Ordering of the Previous Question both read as full-weight passage votes.
--      That inverts or over-weights verdicts (see H.R. 4758 roll 77 below).
--   3. NO ISSUE MAP — with no measure→issue rows, a vote produces no verdict at all.
--
-- The normalizer/ingest bugs behind (1) and (2) are fixed in code (netlify/lib/
-- vr-normalize.ts, netlify/lib/vr-ingest.ts). This migration repairs the rows those
-- bugs already wrote, so the fix applies retroactively instead of only to future pulls.
--
-- SOURCING — every title, question, amendment sponsor and mapping direction below was
-- read from Congress.gov on 2026-07-24:
--   • questions            /house-vote/119/{session}/{roll}/members  (voteQuestion)
--   • official titles      /bill/119/{type}/{number}                 (title)
--   • amendment purposes   /amendment/119/hamdt/{85,97}              (purpose, sponsor)
-- Nothing is inferred. No vote, position, total or source is invented.
--
-- ADDITIVE + IDEMPOTENT: every statement is guarded (existence checks, `NOT EXISTS`
-- collision guards, `question IS NULL` / provisional-title guards, `ON CONFLICT DO
-- NOTHING`). Re-running is a no-op. It rolls forward from the applied migrations and
-- edits none of them. Section C is the one place rows are removed — it merges a
-- pre-existing DUPLICATE of one real vote and is documented in full there; no member
-- vote record is lost (the surviving roll call ends with the UNION of both sets).

DO $$
DECLARE
  ndaa    integer;
  bucket  integer;
  amdt85  integer;
  amdt97  integer;
  rc245   integer;
  rc259   integer;
  legacy  integer;
  live_rc integer;
  canon   integer;
BEGIN

  -- ═══════════════════════════════════════════════════════════════════════════
  -- A. Split the numberless bucket into the two real amendments it swallowed
  -- ═══════════════════════════════════════════════════════════════════════════
  -- The House vote LIST endpoint returns no legislation type/number for an amendment
  -- vote — that metadata lives on the /members sub-resource, which the ingest was not
  -- reading. So rolls 119/1/245 and 119/1/259 arrived numberless and collapsed onto
  -- whichever numberless measure row existed first: the Speaker election. One row,
  -- three unrelated votes, 76 member votes.
  --
  -- Both amendments are to H.R. 3838 (FY2026 NDAA), which is already in the record —
  -- so they are created as CHILD measures of it (parent_id), which is what the UI
  -- uses to nest amendment votes under the measure they amend.

  SELECT id INTO ndaa
    FROM vr_measures
   WHERE measure_type = 'bill' AND congress = 119 AND chamber = 'house'
     AND number = 'H.R. 3838'
   LIMIT 1;

  SELECT id INTO amdt85
    FROM vr_measures
   WHERE measure_type = 'amendment' AND congress = 119 AND chamber = 'house'
     AND number = 'H.Amdt. 85'
   LIMIT 1;
  IF amdt85 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, summary, parent_id, status,
       source_url, source_label, external_ids)
    VALUES
      ('amendment', 119, 'house', 'H.Amdt. 85',
       'H.Amdt. 85 (Norman) to H.R. 3838 — bar gender transition procedures under the Exceptional Family Member Program',
       'Amendment numbered 13 printed in Part A of House Report 119-255. Congress.gov purpose: '
       || '"Amendment prohibits the provision of gender transition procedures, including surgery '
       || 'or medication, through the Exceptional Family Medical Program." Sponsor: Rep. Ralph '
       || 'Norman (R-SC-5). Agreed to in the House 221-210 (roll call 119/1/245, 2025-09-10).',
       ndaa, 'passed_house',
       'https://www.congress.gov/amendment/119th-congress/house-amendment/85', 'Congress.gov', '{}'::jsonb)
    RETURNING id INTO amdt85;
  END IF;

  SELECT id INTO amdt97
    FROM vr_measures
   WHERE measure_type = 'amendment' AND congress = 119 AND chamber = 'house'
     AND number = 'H.Amdt. 97'
   LIMIT 1;
  IF amdt97 IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, summary, parent_id, status,
       source_url, source_label, external_ids)
    VALUES
      ('amendment', 119, 'house', 'H.Amdt. 97',
       'H.Amdt. 97 (Biggs) to H.R. 3838 — bar Endangered Species Act critical-habitat designation on military lands',
       'Amendment numbered 29 printed in Part A of House Report 119-255. Congress.gov purpose: '
       || '"Amendment sought to prohibit the designation of military and certain National Guard '
       || 'lands as critical habitats under the Endangered Species Act when deemed necessary by '
       || 'the Department of Defense, and to exempt military personnel from Endangered Species '
       || 'Act prohibitions during national defense-related operations, including incidental harm '
       || 'to protected species." Sponsor: Rep. Andy Biggs (R-AZ-5). Failed in the House 200-228 '
       || '(roll call 119/1/259, 2025-09-10).',
       ndaa, 'failed',
       'https://www.congress.gov/amendment/119th-congress/house-amendment/97', 'Congress.gov', '{}'::jsonb)
    RETURNING id INTO amdt97;
  END IF;

  -- Capture the bucket via the vote that STAYS on it (the Speaker election), so this
  -- still resolves correctly on a re-run after the amendment votes have moved off.
  SELECT measure_id INTO bucket
    FROM vr_rollcalls
   WHERE chamber = 'house' AND congress = 119 AND session = 1 AND roll_number = 2
   LIMIT 1;

  SELECT id INTO rc245 FROM vr_rollcalls
   WHERE chamber = 'house' AND congress = 119 AND session = 1 AND roll_number = 245 LIMIT 1;
  IF rc245 IS NOT NULL THEN
    UPDATE vr_rollcalls SET measure_id = amdt85, updated_at = now() WHERE id = rc245;
  END IF;

  SELECT id INTO rc259 FROM vr_rollcalls
   WHERE chamber = 'house' AND congress = 119 AND session = 1 AND roll_number = 259 LIMIT 1;
  IF rc259 IS NOT NULL THEN
    UPDATE vr_rollcalls SET measure_id = amdt97, updated_at = now() WHERE id = rc259;
  END IF;

  -- Retitle the residual bucket to EXACTLY the vote question Congress.gov reports for
  -- roll 119/1/2 ("Election of the Speaker"). That is what the fixed normalizer now
  -- produces as this measure's title, and upsertMeasure keys numberless measures on
  -- (number IS NULL, title) — so the next ingest converges on this same row instead of
  -- creating another bucket. It keeps only roll 2, which has 0 attributed member votes
  -- and no issue mappings, so it is inert for every verdict.
  IF bucket IS NOT NULL THEN
    UPDATE vr_measures
       SET title = 'Election of the Speaker',
           summary = CASE WHEN coalesce(summary, '') = ''
                          THEN 'Election of the Speaker of the House, 119th Congress, 1st session '
                               || '(roll call 2, 2025-01-03). Not a policy vote — deliberately carries '
                               || 'no issue mapping.'
                          ELSE summary END,
           updated_at = now()
     WHERE id = bucket AND number IS NULL;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- B. Correct measure_type for the three House resolutions typed as bills
  -- ═══════════════════════════════════════════════════════════════════════════
  -- The classifier only recognised the literal strings bill/resolution/amendment, so
  -- Congress.gov's "HRES" fell through to the 'bill' default. Guarded with NOT EXISTS
  -- so it can never create a second row sharing a natural identity.
  UPDATE vr_measures m
     SET measure_type = 'resolution', updated_at = now()
   WHERE m.measure_type = 'bill' AND m.congress = 119 AND m.chamber = 'house'
     AND m.number IN ('H.Res. 1075', 'H.Res. 682', 'H.Res. 916')
     AND NOT EXISTS (
       SELECT 1 FROM vr_measures x
        WHERE x.measure_type = 'resolution' AND x.congress = 119
          AND x.chamber = 'house' AND x.number = m.number
     );

  -- ═══════════════════════════════════════════════════════════════════════════
  -- C. H.Con.Res. 14 — merge the pre-existing DUPLICATE of one real vote
  -- ═══════════════════════════════════════════════════════════════════════════
  -- WHY THIS IS NECESSARY, not cosmetic: the 216-214 House vote of 2025-04-10 on the
  -- FY2025 budget resolution is in the database TWICE.
  --   • The canonical, issue-mapped measure (resolution / H.Con.Res. 14, 5 curated
  --     issues) holds it as a roll call with roll_number = NULL and 39 member votes.
  --   • The live ingest wrote it again — precisely identified as roll 119/1/100, with
  --     38 member votes — under a SECOND, bill-typed H.Con.Res. 14 row, because
  --     "HCONRES" was mistyped as a bill (same bug as section B).
  -- Separate measures, so nothing double-counted until now. But the fixed classifier
  -- types HCONRES as a resolution, and the roll-call upsert sets measure_id on
  -- conflict — so the very NEXT ingest would move roll 100 onto the canonical measure,
  -- which would then hold the same real vote twice and count it twice in the weighted
  -- issue-record math, against all five of its curated issues. Fixing the type without
  -- fixing this would arm that. So the two are merged here, once.
  --
  -- The merge is a UNION, not a choice: the two sets overlap by only three members
  -- (massie, jayapal, tlaib — verified to hold IDENTICAL positions, all nay), so the
  -- surviving roll call ends with 74 attributed member votes where neither row had
  -- more than 39. No member's vote record is lost. Removed: three verified-duplicate
  -- member-vote rows, and the emptied legacy roll-call shell.

  SELECT id INTO live_rc
    FROM vr_rollcalls
   WHERE chamber = 'house' AND congress = 119 AND session = 1 AND roll_number = 100
   LIMIT 1;

  SELECT r.id INTO legacy
    FROM vr_rollcalls r
    JOIN vr_measures m ON m.id = r.measure_id
   WHERE m.measure_type = 'resolution' AND m.congress = 119 AND m.chamber = 'house'
     AND m.number = 'H.Con.Res. 14'
     AND r.roll_number IS NULL
     AND r.vote_date >= TIMESTAMPTZ '2025-04-10 00:00:00+00'
     AND r.vote_date <  TIMESTAMPTZ '2025-04-11 00:00:00+00'
   LIMIT 1;

  SELECT m.id INTO canon
    FROM vr_measures m
   WHERE m.measure_type = 'resolution' AND m.congress = 119 AND m.chamber = 'house'
     AND m.number = 'H.Con.Res. 14'
   LIMIT 1;

  IF legacy IS NOT NULL AND live_rc IS NOT NULL AND legacy <> live_rc AND canon IS NOT NULL THEN
    -- 1. Drop only the members already attributed on the surviving roll call (their
    --    positions were verified identical), so the move cannot violate the
    --    (rollcall_id, politician_id) unique index.
    DELETE FROM vr_member_votes d
     WHERE d.rollcall_id = legacy
       AND EXISTS (
         SELECT 1 FROM vr_member_votes k
          WHERE k.rollcall_id = live_rc AND k.politician_id = d.politician_id
       );

    -- 2. Move every remaining attribution onto the precisely-identified roll call.
    UPDATE vr_member_votes SET rollcall_id = live_rc WHERE rollcall_id = legacy;

    -- 3. Point the surviving roll call at the canonical, issue-mapped measure and
    --    retire the now-empty legacy shell.
    UPDATE vr_rollcalls
       SET measure_id = canon,
           updated_at = now()
     WHERE id = live_rc;

    DELETE FROM vr_rollcalls
     WHERE id = legacy
       AND NOT EXISTS (SELECT 1 FROM vr_member_votes v WHERE v.rollcall_id = legacy);
  END IF;

  -- The emptied bill-typed H.Con.Res. 14 row is deliberately LEFT IN PLACE: it still
  -- carries three date-stamped measure_actions the canonical row does not have, and
  -- with no roll calls and no issue mappings it contributes nothing to any verdict.
  -- The fixed classifier will never match it again (it now types HCONRES as a
  -- resolution), so it is inert. Consolidating or removing it is an editorial call
  -- for a human — flagged in .netlify/results.md rather than decided here.

END $$;

-- ═════════════════════════════════════════════════════════════════════════════
-- D. Real vote questions + correct action_type for the live roll calls
-- ═════════════════════════════════════════════════════════════════════════════
-- Read from /house-vote/119/{session}/{roll}/members on 2026-07-24. action_type is what
-- the FIXED classifier (mapActionType, netlify/lib/vr-normalize.ts) returns for each
-- question, so these rows now match what a re-ingest would write.
--
-- This is not cosmetic. PROCEDURAL_TYPES = ('procedural','motion') drives both the
-- `hideProcedural` filter and the 0.25 weight discount in _issueRecordSummary. The most
-- consequential row: H.R. 4758 roll 119/2/77 is a Motion to Recommit, stored as
-- 'passage'. A member's YEA on recommit is a vote to send the bill BACK — but stored as
-- passage it read as full-weight support for the bill, which would have inverted the
-- climate_action signal for every member who voted for recommittal.
--
-- Guarded on `question IS NULL` so it only ever fills in the live rows and can never
-- overwrite a curated or seeded question. Re-running is a no-op.
UPDATE vr_rollcalls r
   SET question = v.question, action_type = v.action_type, updated_at = now()
  FROM (VALUES
    (1,   2, 'Election of the Speaker',                            'procedural'),
    (1, 100, 'On Motion to Concur in the Senate Amendment',        'passage'),
    (1, 116, 'On Motion to Suspend the Rules and Pass',            'passage'),
    (1, 240, 'On Motion to Suspend the Rules and Pass',            'passage'),
    (1, 241, 'On Motion to Suspend the Rules and Pass, as Amended','passage'),
    (1, 242, 'On Ordering the Previous Question',                  'procedural'),
    (1, 243, 'On Agreeing to the Resolution',                      'passage'),
    (1, 245, 'On Agreeing to the Amendment',                       'amendment'),
    (1, 259, 'On Agreeing to the Amendment',                       'amendment'),
    (1, 306, 'On Motion to Suspend the Rules and Pass, as Amended','passage'),
    (1, 307, 'On Motion to Suspend the Rules and Pass, as Amended','passage'),
    (1, 308, 'On Ordering the Previous Question',                  'procedural'),
    (2,  71, 'On Motion to Suspend the Rules and Pass',            'passage'),
    (2,  73, 'On Ordering the Previous Question',                  'procedural'),
    (2,  74, 'On Agreeing to the Resolution',                      'passage'),
    (2,  77, 'On Motion to Recommit',                              'motion'),
    (2,  78, 'On Passage',                                         'passage')
  ) AS v(session, roll_number, question, action_type)
 WHERE r.chamber = 'house' AND r.congress = 119
   AND r.session = v.session AND r.roll_number = v.roll_number
   AND r.question IS NULL;

-- ═════════════════════════════════════════════════════════════════════════════
-- E. Official measure titles (the live rows were named after their roll call)
-- ═════════════════════════════════════════════════════════════════════════════
-- The vote endpoints carry NO measure title, so the ingest fell back to "Roll call 78".
-- Titles below are Congress.gov's official titles (/bill/119/{type}/{number}). The three
-- rule resolutions have 400+ character official titles that would break every list view,
-- so their `title` is a concise, factually equivalent label naming the bills each rule
-- governs, and the official title goes verbatim into `summary`.
--
-- Guarded to only replace a PROVISIONAL title ("Roll call N", or the bare citation) —
-- a real title, once set, is never overwritten. The matching code-side guard is
-- isProvisionalTitle() in netlify/lib/vr-ingest.ts, which stops a re-ingest from
-- putting the placeholder back.
UPDATE vr_measures m
   SET title = v.title,
       summary = CASE WHEN coalesce(m.summary, '') = '' THEN v.summary ELSE m.summary END,
       updated_at = now()
  FROM (VALUES
    ('H.R. 4758',
     'H.R. 4758 — Homeowner Energy Freedom Act',
     'Repeals the Public Law 117-169 (Inflation Reduction Act) home electrification and appliance rebate program, the state-level contractor training grants and the building energy code assistance program, and rescinds their unobligated balances. Passed the House 210-199 (roll call 119/2/78).'),
    ('H.R. 6329',
     'H.R. 6329 — Information Quality Assurance Act of 2025',
     'Requires agencies to publish the critical factual material they rely on in rulemaking. Passed the House 362-1 under suspension of the rules (roll call 119/2/71).'),
    ('H.R. 4423',
     'H.R. 4423 — No New Burma Funds Act',
     'Congress.gov official title: "No New Burma Funds Act". Passed the House 385-0 under suspension of the rules (roll call 119/1/307).'),
    ('H.R. 36',
     'H.R. 36 — MEGOBARI Act',
     'Congress.gov official title: "MEGOBARI Act". Passed the House 349-42 under suspension of the rules (roll call 119/1/116).'),
    ('H.R. 3425',
     'H.R. 3425 — Personnel Oversight and Shift Tracking Act of 2025',
     'Congress.gov official title: "Personnel Oversight and Shift Tracking Act of 2025". Passed the House 402-0 under suspension of the rules (roll call 119/1/241).'),
    ('H.R. 5348',
     'H.R. 5348 — Social Security Child Protection Act of 2025',
     'Congress.gov official title: "Social Security Child Protection Act of 2025". Passed the House 386-0 under suspension of the rules (roll call 119/1/306).'),
    ('H.R. 3424',
     'H.R. 3424 — SPACE Act of 2025',
     'Congress.gov official title: "SPACE Act of 2025". Passed the House 397-1 under suspension of the rules (roll call 119/1/240).'),
    ('H.Res. 1075',
     'H.Res. 1075 — Rule providing for consideration of H.R. 4626 and H.R. 4758',
     'Providing for consideration of the bill (H.R. 4626) to amend the Energy Policy and Conservation Act to prohibit the Secretary of Energy from prescribing any new or amended energy conservation standard for a product that is not technologically feasible and economically justified, and for other purposes, and providing for consideration of the bill (H.R. 4758) to repeal provisions of Public Law 117-169 relating to taxpayer subsidies for home electrification, and for other purposes.'),
    ('H.Res. 682',
     'H.Res. 682 — Rule providing for consideration of H.R. 3838 and H.R. 3486',
     'Providing for consideration of the bill (H.R. 3838) to authorize appropriations for fiscal year 2026 for military activities of the Department of Defense, for military construction, and for defense activities of the Department of Energy, to prescribe military personnel strengths for such fiscal year, and for other purposes, and providing for consideration of the bill (H.R. 3486) to amend the Immigration and Nationality Act to increase penalties for individuals who illegally enter and reenter the United States after being removed, and for other purposes.'),
    ('H.Res. 916',
     'H.Res. 916 — Rule providing for consideration of H.R. 4312, H.R. 1005, H.R. 1049, H.R. 1069, H.R. 2965 and H.R. 4305',
     'Providing for consideration of the bills H.R. 4312 (name, image and likeness rights of student athletes), H.R. 1005 and H.R. 1049 and H.R. 1069 (foreign influence and PRC funding in elementary and secondary schools), H.R. 2965 (small business regulatory budget) and H.R. 4305 (SBA Red Tape Hotline). Official title recorded at https://www.congress.gov/bill/119th-congress/house-resolution/916'),
    ('H.Con.Res. 14',
     'H.Con.Res. 14 — FY2025 congressional budget resolution',
     'Establishing the congressional budget for the United States Government for fiscal year 2025 and setting forth the appropriate budgetary levels for fiscal years 2026 through 2034.')
  ) AS v(number, title, summary)
 WHERE m.congress = 119 AND m.chamber = 'house' AND m.number = v.number
   AND (m.title LIKE 'Roll call %' OR m.title = m.number OR coalesce(m.title, '') = '');

-- ═════════════════════════════════════════════════════════════════════════════
-- F. Curated measure→issue mappings for the live House votes
-- ═════════════════════════════════════════════════════════════════════════════
-- The point of the whole wave: without these rows a real roll call produces no verdict.
-- Mirrors db/vr-issue-seed.json exactly, so the deploy-time path (this migration) and
-- the runtime path (POST /api/vr-ingest/seed-issues) agree.
--
-- CURATION RULE (db/vr-ingest-runbook.md): map only where a single clear policy nexus
-- exists AND the direction of a YEA is unambiguous. `support_meaning` is the editorial
-- field the verdict math inverts on, so a wrong value manufactures a false verdict —
-- worse than no mapping. Of the 12 unmapped live measures, only these four qualify.
-- Left deliberately unmapped, and why:
--   • H.Res. 1075 / 916 / 682 — rules "providing for consideration of". A yea is a
--     party-line process vote about floor procedure, not a position on the underlying
--     policy. Mapping them would read party discipline as conviction.
--   • H.R. 4423 (385-0), H.R. 3425 (402-0), H.R. 5348 (386-0), H.R. 3424 (397-1),
--     H.R. 36 (349-42) — unanimous or near-unanimous, so they differentiate nobody;
--     and for H.R. 36 / H.R. 4423 the foreign-policy direction is genuinely contestable
--     while the shipped vocabulary has no human_rights / foreign_aid / sanctions key.
--   • Election of the Speaker — not a policy vote at all.
INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)
SELECT m.id, v.issue_key, v.weight, v.is_primary, v.support_meaning, v.rationale, v.source_url
  FROM (VALUES
    -- H.R. 4758 — Homeowner Energy Freedom Act. Repeals the IRA's home-electrification
    -- and appliance rebates, the contractor training grants and the building energy code
    -- assistance program, and rescinds unobligated balances. A YEA repeals climate
    -- spending → yea_opposes climate_action. Contested 210-199, so it differentiates.
    ('bill', 'H.R. 4758', 'climate_action', 100, true,  'yea_opposes',
     'Repeals the Public Law 117-169 home electrification and appliance rebate program, the state contractor training grants and the building energy code assistance program. A yea removes federal climate/efficiency programs, so a yea OPPOSES climate action.',
     'https://www.congress.gov/bill/119th-congress/house-bill/4758'),
    -- Secondary, lower weight: the same bill also rescinds unobligated balances, which is
    -- a genuine but narrower spending-cut nexus. A YEA cuts spending → yea_supports.
    ('bill', 'H.R. 4758', 'cut_spending',    70, false, 'yea_supports',
     'The same bill rescinds the unobligated balances of the repealed programs, cutting appropriated federal spending. A yea CUTS spending. Weighted below the primary climate nexus because the fiscal effect is a consequence of the repeal, not the bill''s stated purpose.',
     'https://www.congress.gov/bill/119th-congress/house-bill/4758'),
    -- H.R. 6329 — Information Quality Assurance Act of 2025. Requires agencies to publish
    -- the critical factual material they rely on in rulemaking. A YEA increases disclosure.
    ('bill', 'H.R. 6329', 'gov_transparency', 100, true, 'yea_supports',
     'Requires federal agencies to publish the critical factual material they rely on when issuing rules. A yea INCREASES government disclosure, so a yea SUPPORTS government transparency.',
     'https://www.congress.gov/bill/119th-congress/house-bill/6329'),
    -- H.Amdt. 85 (Norman) to H.R. 3838. Bars gender transition procedures through the
    -- Exceptional Family Member Program. A YEA restricts access → yea_opposes.
    ('amendment', 'H.Amdt. 85', 'lgbtq_rights', 100, true, 'yea_opposes',
     'Congress.gov purpose: prohibits the provision of gender transition procedures, including surgery or medication, through the Exceptional Family Member Program. A yea restricts transgender care for military families, so a yea OPPOSES LGBTQ rights. Agreed to 221-210.',
     'https://www.congress.gov/amendment/119th-congress/house-amendment/85'),
    -- H.Amdt. 97 (Biggs) to H.R. 3838. Bars ESA critical-habitat designation on military
    -- and certain National Guard lands. A YEA removes habitat protection → yea_opposes.
    -- Weight 90, not 100: the amendment is scoped to defense lands, not public lands
    -- generally. Deliberately NOT also mapped to strong_defense — a member whose stated
    -- defense position is about spending, not readiness, would be mis-verdicted.
    ('amendment', 'H.Amdt. 97', 'lands_preserve', 90, true, 'yea_opposes',
     'Congress.gov purpose: prohibits designating military and certain National Guard lands as critical habitat under the Endangered Species Act, and exempts military personnel from ESA prohibitions during defense operations. A yea removes habitat protection from those lands, so a yea OPPOSES land preservation. Failed 200-228.',
     'https://www.congress.gov/amendment/119th-congress/house-amendment/97')
  ) AS v(measure_type, number, issue_key, weight, is_primary, support_meaning, rationale, source_url)
  JOIN vr_measures m
    ON m.measure_type = v.measure_type
   AND m.congress = 119
   AND m.chamber = 'house'
   AND m.number = v.number
ON CONFLICT (measure_id, issue_key) DO NOTHING;
