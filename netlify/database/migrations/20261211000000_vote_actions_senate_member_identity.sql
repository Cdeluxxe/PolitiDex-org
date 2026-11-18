-- ─────────────────────────────────────────────────────────────────────────────
-- Action layer — identify the three senators whose raw vote rows never mapped
-- ─────────────────────────────────────────────────────────────────────────────
-- pdx_vote_actions rows from three senators were stored with no politician, and
-- under the publish gate (netlify/lib/vote-actions-publish.ts) an unidentified
-- member holds the roll call, so 203 of the 205 Senate roll calls on file could
-- not publish:
--
--   S293  Lindsey Graham (SC)   LIS id never resolved — he left the Senate on
--   S419  Markwayne Mullin (OK) 2026-07-11 / 2026-03-23 and dropped out of the
--                               legislators-current file the LIS index is read
--                               from, so the rows kept an LIS id, no bioguide id
--                               and no politician, and the roster catch-up (which
--                               keys on bioguide) never reached them.
--   G000608 Darline Graham (SC) bioguide resolved, but the member map had no
--                               entry for her; db/vr-member-map.json now maps
--                               her to darline_graham.
--
-- Each LIS → bioguide pair was checked against legislators-historical.json and
-- the member name the Senate's own roll-call XML prints on the rows; the roster
-- ids are the member map's (G000359 → graham, M001190 → mullin). The cron now
-- does the same on every run (LIS_SEED, the merged LIS index and the LIS
-- catch-up in vote-actions-core.ts); this applies it to the rows already stored.
--
-- Data only, and idempotent: only rows with no bioguide / no politician yet are
-- touched, nothing is overwritten, and no other table or member changes.
UPDATE "pdx_vote_actions"
   SET "bioguide_id" = 'G000359', "politician_id" = COALESCE("politician_id", 'graham'), "updated_at" = now()
 WHERE "member_id_scheme" = 'lis' AND "member_id" = 'S293' AND "bioguide_id" IS NULL;
UPDATE "pdx_vote_actions"
   SET "bioguide_id" = 'M001190', "politician_id" = COALESCE("politician_id", 'mullin'), "updated_at" = now()
 WHERE "member_id_scheme" = 'lis' AND "member_id" = 'S419' AND "bioguide_id" IS NULL;
UPDATE "pdx_vote_actions"
   SET "politician_id" = 'darline_graham', "updated_at" = now()
 WHERE "bioguide_id" = 'G000608' AND "politician_id" IS NULL;
