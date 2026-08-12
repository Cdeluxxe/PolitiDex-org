-- ═══════════════════════════════════════════════════════════════════════════
-- Coverage Gaps + Suggest-a-Lead · Phase 1
-- Link a community post to the politician(s) and the specific coverage gap it
-- was suggested for, and record whether it arrived with a source.
--
-- Additive and forward-only. Nothing here changes an existing column, an
-- existing default or an existing index, so every current read path keeps
-- working untouched: a post submitted before this migration simply carries no
-- gap context. Idempotent throughout (IF NOT EXISTS), so a partial apply can be
-- re-run safely.
--
-- WHAT THIS DELIBERATELY DOES NOT DO. There is no gap table. Gaps are derived at
-- render time from the record we already hold (gaps.js reads PDXWordAction and
-- PDXCoverage), so a gap disappears the moment a curator fills it — there is no
-- second copy of "what is missing" to drift out of date, and no stored row that
-- can keep asking for something we already have.
--
-- `lead_state` tracks only whether a submission cited something. It is NOT a
-- verification status, and nothing on the accountability side reads it: a lead
-- never enters Word vs Action, the Official Record, promise scoring or a
-- strength badge. Promotion into the Evidence Locker remains the existing
-- moderator-only path through cee_promoted.
-- ═══════════════════════════════════════════════════════════════════════════

-- Which politician(s) the post is about. jsonb array of profile ids, validated
-- against the roster in the function layer before it is written.
ALTER TABLE cee_posts
  ADD COLUMN IF NOT EXISTS linked_politician_ids jsonb NOT NULL DEFAULT '[]'::jsonb;--> statement-breakpoint

-- The exact gap this was suggested for: the stable derived key, e.g.
-- 'gap:booker:no-action-yet-climate-action'. Free text because the key is
-- computed client- and server-side from a shared slug rule, not enumerated here.
ALTER TABLE cee_posts
  ADD COLUMN IF NOT EXISTS gap_key text;--> statement-breakpoint

-- The gap's taxonomy type ('no_record', 'thin_record', 'no_action_yet', …).
-- Constrained to an allow-list in the function layer so the vocabulary can grow
-- in a deploy rather than a migration.
ALTER TABLE cee_posts
  ADD COLUMN IF NOT EXISTS gap_type text;--> statement-breakpoint

-- 'needs_source' | 'has_source'. Derived from the submission itself.
ALTER TABLE cee_posts
  ADD COLUMN IF NOT EXISTS lead_state text DEFAULT 'needs_source';--> statement-breakpoint

-- Moderator-set pointer to the post this one duplicates. Cheap here, and it
-- keeps duplicate leads answerable without deleting a good-faith submission.
ALTER TABLE cee_posts
  ADD COLUMN IF NOT EXISTS dup_of integer;--> statement-breakpoint

-- The two filters the gap UI actually issues: "leads of this type" and
-- "leads still missing a source".
CREATE INDEX IF NOT EXISTS cee_posts_gap_type_idx ON cee_posts (gap_type);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS cee_posts_lead_state_idx ON cee_posts (lead_state);--> statement-breakpoint

-- ADD COLUMN … DEFAULT back-fills every existing row with 'needs_source', which
-- would be a lie for two groups of historical posts. Correct them once, scoped
-- to rows still sitting at that default so a re-run is a no-op:
--   · evidence posts have no lead state at all
--   · leads that already cited a source are 'has_source'
UPDATE cee_posts
   SET lead_state = NULL
 WHERE lead_state = 'needs_source'
   AND kind <> 'lead';--> statement-breakpoint

UPDATE cee_posts
   SET lead_state = 'has_source'
 WHERE lead_state = 'needs_source'
   AND kind = 'lead'
   AND source_url IS NOT NULL
   AND length(trim(source_url)) > 0;
