// ─────────────────────────────────────────────────────────────────────────────
// Community Evidence Exchange — database schema (Drizzle ORM / Netlify Database)
// ─────────────────────────────────────────────────────────────────────────────
// This is a SEPARATE discussion layer. None of these tables feed the curated
// Evidence Locker automatically — they back the community submission space only.
// Every table is namespaced with the `cee_` prefix so it can never be confused
// with (or accidentally joined against) the main, Firebase-backed app data.
//
// Identity: rows store the author's Firebase Auth `uid` (verified server-side in
// the function), plus a denormalised display name for cheap rendering.

import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  boolean,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

// A community-submitted post. Marked "Community Submitted" everywhere it renders.
export const ceePosts = pgTable(
  "cee_posts",
  {
    id: serial().primaryKey(),
    authorUid: text("author_uid").notNull(),
    authorName: text("author_name").notNull().default("Community Member"),
    headline: text().notNull(),
    summary: text().notNull().default(""),
    // Optional but encouraged source link. REQUIRED (enforced in the function)
    // when `kind` is "evidence" — a contribution offered as evidence must cite one.
    sourceUrl: text("source_url"),
    // What the contribution IS, chosen by the submitter on the form:
    //   "lead"     — a tip / topic the community should look into (no strict source bar)
    //   "evidence" — a concrete receipt (vote, statement, record) offered for the Locker
    // Drives the source-link requirement and how the moderator reviews it.
    kind: text().notNull().default("lead"),
    // Submitter's self-declared source category, aligned to EVIDENCE_STRENGTH.md so
    // the moderator can grade it quickly. Informational only:
    //   official | interview | statement | social | other
    sourceType: text("source_type"),
    // One of the CORE_NATIONAL_ISSUES keys (reuses the existing category system).
    categoryKey: text("category_key"),
    // Zero or more ISSUE_MAP issue keys (reuses the existing issue tagging system).
    issueKeys: jsonb("issue_keys").$type<string[]>().default([]),
    // active = visible; removed = hidden by a moderator; imported = a moderator
    // has promoted it into the curated Evidence Locker (see cee_promoted).
    status: text().notNull().default("active"),
    // Set when at least one user has used "Suggest for Review".
    suggestedForReview: boolean("suggested_for_review").notNull().default(false),
    // ── AI triage (non-binding) ───────────────────────────────────────────
    // A neutral, advisory recommendation written automatically on submission (and
    // re-runnable by a moderator). It NEVER hides or promotes anything on its own —
    // a human moderator always decides. Stored so the queue shows it at a glance.
    aiRecommendation: text("ai_recommendation"), // keep | review | remove | null
    aiConfidence: integer("ai_confidence"), //     0..100
    aiSummary: text("ai_summary"),
    aiReasons: jsonb("ai_reasons").$type<string[]>().default([]),
    // If the triage judged this a likely duplicate, the id of the post it matches.
    aiDuplicateOf: integer("ai_duplicate_of"),
    aiReviewedAt: timestamp("ai_reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    statusIdx: index("cee_posts_status_idx").on(t.status),
    createdIdx: index("cee_posts_created_idx").on(t.createdAt),
  })
);

// Threaded comments. `parentId` is a nullable self-reference: a top-level comment
// has parentId = null; a reply points at the comment it answers.
export const ceeComments = pgTable(
  "cee_comments",
  {
    id: serial().primaryKey(),
    postId: integer("post_id")
      .notNull()
      .references(() => ceePosts.id, { onDelete: "cascade" }),
    parentId: integer("parent_id").references((): AnyPgColumn => ceeComments.id, {
      onDelete: "cascade",
    }),
    authorUid: text("author_uid").notNull(),
    authorName: text("author_name").notNull().default("Community Member"),
    body: text().notNull(),
    status: text().notNull().default("active"), // active | removed
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    postIdx: index("cee_comments_post_idx").on(t.postId),
  })
);

// Custom reactions. The five reaction kinds are validated in the function layer.
// A (post, user, reaction) row is unique so each reaction acts as a toggle: a user
// can apply each kind at most once and remove it again.
export const ceeReactions = pgTable(
  "cee_reactions",
  {
    id: serial().primaryKey(),
    postId: integer("post_id")
      .notNull()
      .references(() => ceePosts.id, { onDelete: "cascade" }),
    uid: text().notNull(),
    // strong_evidence | needs_context | important | disputed | off_topic
    reaction: text().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uniq: uniqueIndex("cee_reactions_unique").on(t.postId, t.uid, t.reaction),
    postIdx: index("cee_reactions_post_idx").on(t.postId),
  })
);

// Flags raised for moderator review (spam, misinformation, bad faith, etc.).
// One flag per user per post (re-flagging just updates the existing row).
export const ceeFlags = pgTable(
  "cee_flags",
  {
    id: serial().primaryKey(),
    postId: integer("post_id")
      .notNull()
      .references(() => ceePosts.id, { onDelete: "cascade" }),
    uid: text().notNull(),
    reason: text().notNull(), // spam | misinformation | bad_faith | off_topic | other
    note: text().default(""),
    status: text().notNull().default("open"), // open | resolved
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uniq: uniqueIndex("cee_flags_unique").on(t.postId, t.uid),
    postIdx: index("cee_flags_post_idx").on(t.postId),
  })
);

// "Suggest for Review" recommendations — community members nominating a high-quality
// post for consideration in the main Evidence Locker. One suggestion per user/post.
export const ceeSuggestions = pgTable(
  "cee_suggestions",
  {
    id: serial().primaryKey(),
    postId: integer("post_id")
      .notNull()
      .references(() => ceePosts.id, { onDelete: "cascade" }),
    uid: text().notNull(),
    note: text().default(""),
    status: text().notNull().default("open"), // open | imported | dismissed
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uniq: uniqueIndex("cee_suggestions_unique").on(t.postId, t.uid),
    postIdx: index("cee_suggestions_post_idx").on(t.postId),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// Graduated contributions — the curated bridge into the Evidence Locker
// ─────────────────────────────────────────────────────────────────────────────
// When a moderator verifies a community post against CONTENT_STYLE.md and
// EVIDENCE_STRENGTH.md and decides it belongs in the curated record, it is
// "promoted": a snapshot of the verified evidence is copied into THIS table, with
// the contributor credited by name. This keeps the two worlds cleanly separate —
// `cee_posts` stays the raw, community-owned discussion; `cee_promoted` is the
// curated, moderator-blessed layer that carries attribution. A community post is
// never silently absorbed: promotion is an explicit, recorded human action, and
// the snapshot here is what the "Graduated to the Evidence Locker" credit wall
// renders. One promotion per source post (the unique index), so re-promoting is
// idempotent and simply refreshes the snapshot.
export const ceePromoted = pgTable(
  "cee_promoted",
  {
    id: serial().primaryKey(),
    // The community post this was graduated from. Nullable + ON DELETE SET NULL so
    // the curated credit survives even if the original discussion post is removed.
    postId: integer("post_id").references(() => ceePosts.id, { onDelete: "set null" }),
    // A verbatim snapshot of the verified evidence at promotion time.
    headline: text().notNull(),
    summary: text().notNull().default(""),
    sourceUrl: text("source_url"),
    categoryKey: text("category_key"),
    issueKeys: jsonb("issue_keys").$type<string[]>().default([]),
    kind: text().notNull().default("evidence"), // lead | evidence
    // The moderator-assigned strength grade (EVIDENCE_STRENGTH.md vocabulary).
    strength: text().notNull().default("moderate"), // strong | moderate | limited
    // Attribution: who contributed it. Name is shown publicly on the credit wall;
    // the uid is kept for linking a member to their graduated contributions.
    contributorUid: text("contributor_uid"),
    contributorName: text("contributor_name").notNull().default("Community Member"),
    // Which moderator promoted it (their email), and their verification note.
    promotedBy: text("promoted_by"),
    note: text().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    postUniq: uniqueIndex("cee_promoted_post_unique").on(t.postId),
    createdIdx: index("cee_promoted_created_idx").on(t.createdAt),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// The People's Mandate — community reform proposals ("Forging Tomorrow")
// ─────────────────────────────────────────────────────────────────────────────
// The participation layer for the Mandate page: anyone can submit a bold reform
// idea, everyone can see what has been proposed, and users show support with a
// one-click vote. This is deliberately its OWN small pair of tables (prefixed
// `pdx_proposals`) so it stays independent of both the curated agenda cards and
// the Firebase-backed app data, and can later be lifted into the shared PDXStore
// sync system (like `saved` / `evidence`) without a schema rethink.
//
// Identity is intentionally lightweight for now: each browser mints a stable
// random "participant key" (stored in localStorage) that is sent as
// `submitterKey` / `voterKey`. That key is all the server needs to (a) credit a
// submitter and (b) enforce one-support-per-participant per proposal via a unique
// index. When real auth is wired in, the same columns simply carry the Firebase
// uid instead — no migration required.

// A single community-submitted reform proposal.
export const pdxProposals = pgTable(
  "pdx_proposals",
  {
    id: serial().primaryKey(),
    // Short headline for the reform, e.g. "Ranked-choice voting for all federal races".
    title: text().notNull(),
    // The pitch: what problem it solves and how.
    description: text().notNull(),
    // Optional free-form category/tag slug (e.g. "term-limits"). Nullable so the
    // form can stay approachable — a proposal without a category is still valid.
    category: text(),
    // Optional links tying the proposal to specific people/seats it targets, so a
    // reform can be surfaced on the exact profiles and races a user is tracking.
    // Both are lightweight JSON string arrays and default to empty so linking stays
    // entirely optional:
    //   linkedPoliticianIds — politician profile ids (the same ids openModal() uses),
    //     rendered as clickable chips on cards and used to power a profile's
    //     "Related Proposals" section.
    //   linkedRaceIds — free-form race/office identifiers (e.g. "ut-senate-d6"),
    //     reserved for surfacing proposals in the multi-level ballot later.
    linkedPoliticianIds: jsonb("linked_politician_ids").$type<string[]>().default([]),
    linkedRaceIds: jsonb("linked_race_ids").$type<string[]>().default([]),
    // Denormalised display name; defaults to "Anonymous" when none is given.
    submitterName: text("submitter_name").notNull().default("Anonymous"),
    // The submitter's stable participant key (client-minted today, Firebase uid
    // later). Not shown to other users — used only for attribution/rate hooks.
    submitterKey: text("submitter_key"),
    // Denormalised running tally of support votes, kept in step with the
    // pdx_proposal_votes rows so listing/sorting never needs an aggregate join.
    supportCount: integer("support_count").notNull().default(0),
    // active = visible; removed = hidden by a future moderator tool.
    status: text().notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    statusIdx: index("pdx_proposals_status_idx").on(t.status),
    supportIdx: index("pdx_proposals_support_idx").on(t.supportCount),
    createdIdx: index("pdx_proposals_created_idx").on(t.createdAt),
  })
);

// One support vote. The (proposal_id, voter_key) unique index is what prevents a
// participant from supporting the same proposal twice; a repeat tap toggles the
// support off by deleting the row (see netlify/functions/mandate-proposals.mts).
export const pdxProposalVotes = pgTable(
  "pdx_proposal_votes",
  {
    id: serial().primaryKey(),
    proposalId: integer("proposal_id")
      .notNull()
      .references(() => pdxProposals.id, { onDelete: "cascade" }),
    voterKey: text("voter_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uniq: uniqueIndex("pdx_proposal_votes_unique").on(t.proposalId, t.voterKey),
    proposalIdx: index("pdx_proposal_votes_proposal_idx").on(t.proposalId),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// Cross-device account sync — PDXStore collection snapshots
// ─────────────────────────────────────────────────────────────────────────────
// The first server-side piece of the sync system PDXStore prepares for on the
// client. PDXStore treats each syncable set of personal data as a "collection"
// (e.g. 'saved') and can push the collection's full, serializable "snapshot"
// upstream. This table is the upstream: exactly one row per (user_id,
// collection), holding the latest snapshot verbatim.
//
// The design is intentionally a full-snapshot replace (an upsert keyed by
// user_id + collection), which makes push idempotent — retrying a push is safe
// and simply re-writes the same row. `revision` echoes the client's per-collection
// revision counter (an ordering hint, not a lock), and `synced_at` is the
// server's authoritative "last stored" timestamp returned to the client so it can
// clear its dirty flag. See the REMOTE BACKEND CONTRACT doc block in index.html.
export const pdxSnapshots = pgTable(
  "pdx_snapshots",
  {
    id: serial().primaryKey(),
    // The authenticated user's identity: the Firebase uid taken from the verified
    // ID token on the server (the token's `sub` claim), NOT a value the client
    // chooses. The /api/pdx-sync Function ignores any userId in the request body
    // and trusts only the token, so one user can never read or write another
    // user's snapshot. (Anonymous Firebase sign-ins are rejected before they ever
    // reach a row here — see the Function's AUTHENTICATION note.)
    userId: text("user_id").notNull(),
    // The PDXStore collection name this snapshot belongs to (e.g. "saved").
    collection: text().notNull(),
    // The complete collection snapshot, stored verbatim as JSON.
    snapshot: jsonb().notNull(),
    // The client's revision counter at push time — a monotonic ordering hint.
    revision: integer().notNull().default(0),
    // Authoritative server timestamp of the last successful store, echoed back
    // to the client so it can record when it last agreed with the server.
    syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    // One row per user+collection — the target of the idempotent push upsert.
    uniq: uniqueIndex("pdx_snapshots_user_collection_unique").on(t.userId, t.collection),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// Community Item Threads — inline discussion & sentiment on any app item
// ─────────────────────────────────────────────────────────────────────────────
// This is the shared, server-backed home for the lightweight "vote + comment"
// row that already renders under individual items — issue stances, promises and
// Spotlight entries (and, using the same key, evidence entries and reforms). It
// replaces the earlier device-local (localStorage) trial so a thread is the SAME
// living conversation for every visitor, not a private note to self.
//
// Every row is addressed by the stable `target_id` the client already mints:
//   "<type>:<politicianId>:<slug>"  e.g. "issue:cory-booker:box-elder-data-center"
// The type prefix (issue | promise | spotlight | evidence | reform | …) is the
// bridge to the existing issueKey / category systems — nothing about the markup
// or the id scheme changes, only where the data lives.
//
// Like the `cee_` post tables, these are namespaced `cee_item_` and are entirely
// separate from the curated, Firebase-backed app data: a comment here NEVER flows
// into the Evidence Locker automatically. Identity is the author's verified
// Firebase Auth uid (checked server-side), with a denormalised display name.

// One like/dislike per user per item. The (target_id, uid) unique index makes the
// vote a toggle: re-tapping the same side clears it, tapping the other switches.
export const ceeItemVotes = pgTable(
  "cee_item_votes",
  {
    id: serial().primaryKey(),
    targetId: text("target_id").notNull(),
    uid: text().notNull(),
    vote: text().notNull(), // 'like' | 'dislike'
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uniq: uniqueIndex("cee_item_votes_unique").on(t.targetId, t.uid),
    targetIdx: index("cee_item_votes_target_idx").on(t.targetId),
  })
);

// A comment on an item. `parentId` is a nullable self-reference for one level of
// threaded replies (top-level comment → reply). `sourceUrl` carries the required
// citation when a comment is submitted as new evidence / a strong claim.
export const ceeItemComments = pgTable(
  "cee_item_comments",
  {
    id: serial().primaryKey(),
    targetId: text("target_id").notNull(),
    parentId: integer("parent_id").references((): AnyPgColumn => ceeItemComments.id, {
      onDelete: "cascade",
    }),
    authorUid: text("author_uid").notNull(),
    authorName: text("author_name").notNull().default("Community Member"),
    body: text().notNull(),
    // Optional citation; REQUIRED (enforced in the function) when the author marks
    // the comment as adding new evidence or making a strong factual claim.
    sourceUrl: text("source_url"),
    status: text().notNull().default("active"), // active | removed
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    targetIdx: index("cee_item_comments_target_idx").on(t.targetId),
    parentIdx: index("cee_item_comments_parent_idx").on(t.parentId),
  })
);

// Up/down votes on individual comments — the quality signal that surfaces the
// most useful, best-sourced contributions. One vote per user per comment.
export const ceeItemCommentVotes = pgTable(
  "cee_item_comment_votes",
  {
    id: serial().primaryKey(),
    commentId: integer("comment_id")
      .notNull()
      .references(() => ceeItemComments.id, { onDelete: "cascade" }),
    uid: text().notNull(),
    vote: text().notNull(), // 'up' | 'down'
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uniq: uniqueIndex("cee_item_comment_votes_unique").on(t.commentId, t.uid),
    commentIdx: index("cee_item_comment_votes_comment_idx").on(t.commentId),
  })
);

// Flags raised on a comment for moderator review (personal attack, misinformation,
// spam, off-topic…). One flag per user per comment; re-flagging updates the row.
export const ceeItemFlags = pgTable(
  "cee_item_flags",
  {
    id: serial().primaryKey(),
    commentId: integer("comment_id")
      .notNull()
      .references(() => ceeItemComments.id, { onDelete: "cascade" }),
    uid: text().notNull(),
    reason: text().notNull(), // personal_attack | misinformation | spam | off_topic | other
    note: text().default(""),
    status: text().notNull().default("open"), // open | resolved
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uniq: uniqueIndex("cee_item_flags_unique").on(t.commentId, t.uid),
    commentIdx: index("cee_item_flags_comment_idx").on(t.commentId),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// Open Discussion Board — the free-conversation track ("pdx_forum_")
// ─────────────────────────────────────────────────────────────────────────────
// The second track of PolitiDex's two-track community system. Where the Community
// Evidence Exchange (cee_*) is the VERIFIED pipeline — submissions are triaged,
// moderated, and can graduate into the curated Evidence Locker with attribution —
// this board is the OPEN track: anyone signed in can post freely on any topic,
// nothing is pre-approved, and posts are Reddit-style ranked by community votes.
//
// The separation is structural and deliberate. These tables share NOTHING with
// cee_* or with the curated app data, and there is NO promotion path out of the
// forum: an open-board thread can never flow into cee_posts, cee_promoted, or the
// Evidence Locker. The only moderation here is reactive removal of spam / abuse
// (the civility floor), never verification. A thread may *reference* an app item
// (a stance, reform, politician…) via a lightweight, optional deep-link, but that
// is a one-way pointer for context — it never embeds or alters the referenced item.
//
// Identity is the author's verified Firebase Auth uid (checked server-side in the
// /api/forum Function via the shared db/firebase-auth helper), with a denormalised
// display name for cheap rendering — the same model the cee_* tables use.

// A discussion thread. `score` and `replyCount` are denormalised tallies kept in
// step with the vote/reply rows so listing and ranking never need an aggregate join.
export const pdxForumThreads = pgTable(
  "pdx_forum_threads",
  {
    id: serial().primaryKey(),
    authorUid: text("author_uid").notNull(),
    authorName: text("author_name").notNull().default("Community Member"),
    title: text().notNull(),
    body: text().notNull().default(""),
    // Free-conversation topic bucket (general | stances | reforms | elections |
    // money | media | meta). Validated in the Function, not trusted from the client.
    topic: text().notNull().default("general"),
    // Optional, lightweight reference to something in the app — context only, never
    // an import. `linkType` is the kind of thing (politician | issue | reform |
    // promise | spotlight | evidence | other); `linkRef` is the id/slug/hash/URL the
    // app already uses; `linkLabel` is what to show. All nullable so linking stays
    // entirely optional and the board never depends on the curated data.
    linkType: text("link_type"),
    linkRef: text("link_ref"),
    linkLabel: text("link_label"),
    score: integer().notNull().default(0),
    replyCount: integer("reply_count").notNull().default(0),
    // active = visible; removed = hidden by a moderator (spam/abuse only).
    status: text().notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    statusIdx: index("pdx_forum_threads_status_idx").on(t.status),
    topicIdx: index("pdx_forum_threads_topic_idx").on(t.topic),
    scoreIdx: index("pdx_forum_threads_score_idx").on(t.score),
    createdIdx: index("pdx_forum_threads_created_idx").on(t.createdAt),
  })
);

// A reply. `parentId` is a nullable self-reference for one level of nested replies
// (top-level reply → reply-to-reply), assembled into a tree on the client.
export const pdxForumReplies = pgTable(
  "pdx_forum_replies",
  {
    id: serial().primaryKey(),
    threadId: integer("thread_id")
      .notNull()
      .references(() => pdxForumThreads.id, { onDelete: "cascade" }),
    parentId: integer("parent_id").references((): AnyPgColumn => pdxForumReplies.id, {
      onDelete: "cascade",
    }),
    authorUid: text("author_uid").notNull(),
    authorName: text("author_name").notNull().default("Community Member"),
    body: text().notNull(),
    score: integer().notNull().default(0),
    status: text().notNull().default("active"), // active | removed
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    threadIdx: index("pdx_forum_replies_thread_idx").on(t.threadId),
    parentIdx: index("pdx_forum_replies_parent_idx").on(t.parentId),
  })
);

// One up/down vote per user per target. A single table covers both threads and
// replies via (`targetType`, `targetId`); the unique index makes the vote a toggle:
// re-casting the same direction clears it, casting the other switches it.
export const pdxForumVotes = pgTable(
  "pdx_forum_votes",
  {
    id: serial().primaryKey(),
    targetType: text("target_type").notNull(), // 'thread' | 'reply'
    targetId: integer("target_id").notNull(),
    uid: text().notNull(),
    value: integer().notNull(), // 1 (up) | -1 (down)
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uniq: uniqueIndex("pdx_forum_votes_unique").on(t.targetType, t.targetId, t.uid),
    targetIdx: index("pdx_forum_votes_target_idx").on(t.targetType, t.targetId),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// Notifications & "What Changed" digest — per-user preferences ("pdx_notification_prefs")
// ─────────────────────────────────────────────────────────────────────────────
// One row per signed-in user holding their OPT-IN notification settings for the
// "What Changed" digest. The design is intentionally quiet and user-controlled:
// every channel defaults to a calm state (in-app on, email OFF) and the user
// picks the topics and the email cadence. Nothing is ever sent unless the user
// explicitly turns a channel on — this table is the authoritative record of that
// consent, read by both the interactive digest endpoint and the scheduled email
// job (netlify/functions/pdx-digest.mts and pdx-digest-cron.mts).
//
// Identity is the caller's verified Firebase Auth uid (checked server-side), the
// same scheme every other pdx_/cee_ table uses. `email` is a denormalised copy of
// the account email so the scheduled sender never has to reach back into Firebase.
//
// WHAT COUNTS AS "NEW": `lastSeenAt` is the watermark the in-app digest compares
// against (advanced when the user opens the digest), and `lastDigestAt` is the
// watermark the scheduled email job compares against (advanced when an email is
// sent). Keeping the two separate means opening the app never suppresses the next
// email, and vice-versa.
export const pdxNotificationPrefs = pgTable(
  "pdx_notification_prefs",
  {
    id: serial().primaryKey(),
    // The verified Firebase uid (token `sub`). One row per user — the upsert target.
    userId: text("user_id").notNull(),
    // Denormalised account email, stored so the scheduled sender has an address
    // without a Firebase lookup. Null until the user enables email digests.
    email: text("email"),
    // In-app "What Changed" digest + badge. On by default — it is passive (the
    // user only sees it when they visit) so it is never spammy.
    inApp: boolean("in_app").notNull().default(true),
    // Email digests. OFF by default — email is the intrusive channel, so it is
    // strictly opt-in and the user chooses the cadence below.
    emailEnabled: boolean("email_enabled").notNull().default(false),
    // Email cadence: "off" | "daily" | "weekly". Only consulted when emailEnabled.
    frequency: text("frequency").notNull().default("weekly"),
    // Topic toggles — the user tunes exactly what the digest may surface. Each maps
    // to one group the digest builder produces. All on by default; turning one off
    // removes that group from BOTH the in-app digest and the email.
    topicEvidence: boolean("topic_evidence").notNull().default(true), // new evidence on saved people/issues
    topicPromises: boolean("topic_promises").notNull().default(true), // promise status changes (client-detected)
    topicCommunity: boolean("topic_community").notNull().default(true), // discussion on watched issues/people
    topicTeam: boolean("topic_team").notNull().default(true), // changes to the saved team (client-detected)
    // Watermark the IN-APP digest compares against; advanced when the user opens it.
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    // Watermark the SCHEDULED EMAIL job compares against; advanced when a mail is sent.
    lastDigestAt: timestamp("last_digest_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    // One row per user — the target of the idempotent prefs upsert.
    userUniq: uniqueIndex("pdx_notification_prefs_user_unique").on(t.userId),
    // The scheduled sender scans by (emailEnabled, frequency); index the flag.
    emailIdx: index("pdx_notification_prefs_email_idx").on(t.emailEnabled),
  })
);

// Flags raised for moderator review (spam, hate/abuse, personal attack, off-topic…).
// Reactive civility floor only — one flag per user per target; re-flagging updates it.
export const pdxForumFlags = pgTable(
  "pdx_forum_flags",
  {
    id: serial().primaryKey(),
    targetType: text("target_type").notNull(), // 'thread' | 'reply'
    targetId: integer("target_id").notNull(),
    uid: text().notNull(),
    reason: text().notNull(), // spam | hate | personal_attack | off_topic | other
    note: text().default(""),
    status: text().notNull().default("open"), // open | resolved
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uniq: uniqueIndex("pdx_forum_flags_unique").on(t.targetType, t.targetId, t.uid),
    targetIdx: index("pdx_forum_flags_target_idx").on(t.targetType, t.targetId),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// Voting Record — the curated "what they actually do" layer ("vr_")
// ─────────────────────────────────────────────────────────────────────────────
// The factual counterpart to the curated stances (what a politician SAYS, shipped
// as the client-side ISSUE_STANCE_DATA globals). Where a full roll-call record is
// far too large and query-heavy to bake into a static JS bundle — a single member
// of Congress casts hundreds of votes per session — it lives here in Postgres and
// is served, filtered, and paginated by the read-only /api/voting-record Function.
//
// Everything keys back to the SAME issue vocabulary the rest of the app uses: the
// `issueKey` values from the client's ISSUE_MAP. That single join key is what lets
// the UI place a vote next to the matching stance and derive "stance vs. record"
// (see netlify/functions/voting-record.mts and the strategy doc). Issue keys are
// validated in the Function against a shipped allow-list (db/issue-keys.json) so a
// bad key can never enter the record.
//
// The tables are namespaced `vr_` so they sit cleanly beside the `pdx_`/`cee_`
// families and are never confused with the community (user-generated) layers. This
// is CURATED PUBLIC-RECORD data: rows are ingested/seeded from official sources and
// every returnable row carries a `source_url` (the verifiability rule — the Function
// refuses to emit a measure/rollcall/position without one). Reads are public (a
// roll call is public record); any future ingest/admin write path is separate and
// authenticated.
//
// Shape (five tables):
//   vr_measures        — one row per legislative object (bill, resolution,
//                        amendment, nomination, or a litigation case)
//   vr_measure_issues  — the many-to-many bridge to ISSUE_MAP issueKeys; the seat
//                        of multi-issue/omnibus handling and of `supportMeaning`
//                        (does a YEA advance or oppose the issue?)
//   vr_rollcalls       — one recorded vote *event* (a roll call) on a measure
//   vr_member_votes    — how one politician voted on one roll call (high-cardinality)
//   vr_positions       — non-roll-call actions that still count as "doing"
//                        (sponsorship, co-sponsorship, amicus/litigation, committee)

// One legislative object. Bills, resolutions, amendments and nominations are the
// usual cases; `measureType='litigation'` (with `chamber='court'`) lets a court
// case share the same issue-keyed timeline without pretending it is a roll call
// (its involvement is recorded via vr_positions instead of vr_member_votes).
export const vrMeasures = pgTable(
  "vr_measures",
  {
    id: serial().primaryKey(),
    // bill | resolution | amendment | nomination | litigation
    measureType: text("measure_type").notNull().default("bill"),
    // e.g. 119. Null for litigation (no Congress attached).
    congress: integer(),
    // house | senate | joint | court (litigation)
    chamber: text(),
    // Display identifier: "H.R. 9311", "S.Amdt. 2145", or a case docket number.
    number: text(),
    title: text().notNull(),
    shortTitle: text("short_title"),
    summary: text().default(""),
    // Self-reference: an amendment (or a child vote-series) points at its parent
    // bill so the UI can nest amendment votes under the measure they amend.
    parentId: integer("parent_id").references((): AnyPgColumn => vrMeasures.id, {
      onDelete: "set null",
    }),
    introducedAt: timestamp("introduced_at", { withTimezone: true }),
    // The sponsor's roster id (the same slug openModal()/stance data use), when known.
    sponsorId: text("sponsor_id"),
    // introduced | passed_house | passed_senate | enacted | failed | vetoed | pending
    status: text().notNull().default("introduced"),
    // VERIFIABILITY: the canonical Congress.gov (or court) URL for this measure.
    // Required — the Function never emits a measure without a source.
    sourceUrl: text("source_url").notNull(),
    sourceLabel: text("source_label").default("Congress.gov"),
    // Provenance / cross-references: { congressGovId, govtrackId, billSlug, docketNumber }.
    externalIds: jsonb("external_ids").$type<Record<string, string>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    typeIdx: index("vr_measures_type_idx").on(t.measureType),
    congressChamberIdx: index("vr_measures_congress_chamber_idx").on(t.congress, t.chamber),
    numberIdx: index("vr_measures_number_idx").on(t.number),
  })
);

// The many-to-many bridge from a measure to ISSUE_MAP issue keys — the heart of the
// integration. A multi-issue or omnibus bill has many rows here, each weighted, so a
// single vote can surface under every issue it touches without any one issue owning
// a loud, misleading verdict. `supportMeaning` is the critical field: it records
// whether a YEA vote ADVANCES or OPPOSES that issue, which is what makes the
// stance-vs-record verdict computable even when a "yea" means opposite things on two
// bundled provisions.
export const vrMeasureIssues = pgTable(
  "vr_measure_issues",
  {
    id: serial().primaryKey(),
    measureId: integer("measure_id")
      .notNull()
      .references(() => vrMeasures.id, { onDelete: "cascade" }),
    // MUST be a valid ISSUE_MAP key — validated in the Function against the shipped
    // allow-list (db/issue-keys.json) before any row is written or returned.
    issueKey: text("issue_key").notNull(),
    // 0..100 — how central this issue is to the measure (omnibus → many low weights).
    weight: integer().notNull().default(100),
    // Exactly one primary issue per measure is the surfacing default in the UI.
    isPrimary: boolean("is_primary").notNull().default(false),
    // yea_supports | yea_opposes — does a YEA advance or oppose THIS issue?
    supportMeaning: text("support_meaning").notNull().default("yea_supports"),
    // One-line audit trail: why this measure maps to this issue.
    rationale: text().default(""),
    // Optional evidence for the mapping itself.
    sourceUrl: text("source_url"),
  },
  (t) => ({
    uniq: uniqueIndex("vr_measure_issues_unique").on(t.measureId, t.issueKey),
    issueIdx: index("vr_measure_issues_issue_idx").on(t.issueKey),
    measureIdx: index("vr_measure_issues_measure_idx").on(t.measureId),
  })
);

// A single recorded vote *event* (a roll call). Amendments, cloture, motions and
// veto overrides are their own roll calls pointing at the same or a child measure;
// `actionType` distinguishes substantive from procedural so the UI can default to
// hiding procedural noise.
export const vrRollcalls = pgTable(
  "vr_rollcalls",
  {
    id: serial().primaryKey(),
    measureId: integer("measure_id")
      .notNull()
      .references(() => vrMeasures.id, { onDelete: "cascade" }),
    chamber: text().notNull(), // house | senate
    congress: integer(),
    session: integer(),
    rollNumber: integer("roll_number"), // official roll-call number
    voteDate: timestamp("vote_date", { withTimezone: true }).notNull(),
    // 'On Passage', 'On Amendment', 'On Motion to Recommit', 'On Cloture', …
    question: text(),
    // passage | amendment | cloture | motion | veto_override | nomination | procedural
    actionType: text("action_type").notNull().default("passage"),
    // passed | failed | agreed_to | rejected
    result: text(),
    // simple | two_thirds | three_fifths
    requiredMajority: text("required_majority").default("simple"),
    // { yea, nay, present, notVoting }
    totals: jsonb().$type<Record<string, number>>().default({}),
    // VERIFIABILITY: direct roll-call URL (clerk.house.gov / senate.gov / Congress.gov).
    sourceUrl: text("source_url").notNull(),
    sourceLabel: text("source_label").default("Congress.gov"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    measureIdx: index("vr_rollcalls_measure_idx").on(t.measureId),
    dateIdx: index("vr_rollcalls_date_idx").on(t.voteDate),
    // A roll call is uniquely identified by chamber+congress+session+number.
    uniq: uniqueIndex("vr_rollcalls_unique").on(
      t.chamber,
      t.congress,
      t.session,
      t.rollNumber
    ),
  })
);

// How one politician voted on one roll call — the high-cardinality table every
// filterable view keys off. `politicianId` is the roster slug (the same id
// openModal() uses and stance data keys), resolved through the SAME id→alias ladder
// the stance helpers use so votes line up with stances.
export const vrMemberVotes = pgTable(
  "vr_member_votes",
  {
    id: serial().primaryKey(),
    rollcallId: integer("rollcall_id")
      .notNull()
      .references(() => vrRollcalls.id, { onDelete: "cascade" }),
    politicianId: text("politician_id").notNull(),
    // yea | nay | present | not_voting
    position: text().notNull(),
    // with_party | against_party | null — crossover flag, computed at ingest time.
    isParty: text("is_party"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uniq: uniqueIndex("vr_member_votes_unique").on(t.rollcallId, t.politicianId),
    politicianIdx: index("vr_member_votes_politician_idx").on(t.politicianId),
  })
);

// Non-roll-call actions that still count as "doing": sponsorship, co-sponsorship,
// amicus/litigation involvement, committee votes, on-record statements. This is how
// courts (which have no roll call) and sponsorship enter the same issue-keyed
// timeline as floor votes.
export const vrPositions = pgTable(
  "vr_positions",
  {
    id: serial().primaryKey(),
    measureId: integer("measure_id")
      .notNull()
      .references(() => vrMeasures.id, { onDelete: "cascade" }),
    politicianId: text("politician_id").notNull(),
    // sponsor | cosponsor | amicus | plaintiff | committee_vote | statement
    actionType: text("action_type").notNull(),
    // Did the action advance the measure? (drives stance-vs-record like a vote does)
    supports: boolean(),
    actedAt: timestamp("acted_at", { withTimezone: true }),
    // VERIFIABILITY: linkable receipt (bill page, brief, committee record).
    sourceUrl: text("source_url").notNull(),
    note: text().default(""),
  },
  (t) => ({
    uniq: uniqueIndex("vr_positions_unique").on(t.measureId, t.politicianId, t.actionType),
    politicianIdx: index("vr_positions_politician_idx").on(t.politicianId),
    measureIdx: index("vr_positions_measure_idx").on(t.measureId),
  })
);

// The legislative action timeline for a measure — how it actually moved. One row per
// stage (introduced, referred/reported from committee, passed a chamber, sent to the
// President, enacted / vetoed / failed, …). This replaces the timeline the client
// used to synthesize from roll calls alone: every step is dated, attributed to a
// chamber where relevant, and carries its own citable source. Purely additive —
// nothing existing reads or writes this table.
export const vrMeasureActions = pgTable(
  "vr_measure_actions",
  {
    id: serial().primaryKey(),
    measureId: integer("measure_id")
      .notNull()
      .references(() => vrMeasures.id, { onDelete: "cascade" }),
    // introduced | referred_committee | reported_committee | passed_house |
    // passed_senate | resolving_differences | to_president | enacted | vetoed |
    // veto_overridden | failed | other
    stage: text().notNull(),
    chamber: text(), // house | senate | joint | null
    actionDate: timestamp("action_date", { withTimezone: true }),
    // Plain-language description of the step ("House passed, 218–214").
    text: text().notNull().default(""),
    // VERIFIABILITY: the canonical action/roll-call/bill-page URL. Required.
    sourceUrl: text("source_url").notNull(),
    sourceLabel: text("source_label").default("Congress.gov"),
    // Stable ordering when two actions share a date (or a date is unknown).
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    measureIdx: index("vr_measure_actions_measure_idx").on(t.measureId),
    dateIdx: index("vr_measure_actions_date_idx").on(t.actionDate),
  })
);

// Named sub-units of a true omnibus / megabill — one level finer than
// vr_measure_issues. Where measure↔issue tags are the taxonomy, a provision is the
// human-named piece ("Medicaid work requirements"), optionally mapped to an issue
// key + support_meaning so the panel can show exactly what got bundled and which way
// each part cuts. Optional and additive; only the handful of real megabills need it.
export const vrMeasureProvisions = pgTable(
  "vr_measure_provisions",
  {
    id: serial().primaryKey(),
    measureId: integer("measure_id")
      .notNull()
      .references(() => vrMeasures.id, { onDelete: "cascade" }),
    label: text().notNull(),
    description: text().default(""),
    // Optional ISSUE_MAP key (validated in the Function against db/issue-keys.json).
    issueKey: text("issue_key"),
    // yea_supports | yea_opposes — how a yea vote cuts on THIS provision.
    supportMeaning: text("support_meaning").default("yea_supports"),
    sourceUrl: text("source_url"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => ({
    measureIdx: index("vr_measure_provisions_measure_idx").on(t.measureId),
  })
);

// Distributional Impact Ledger ("Who It Affects") — the class/economic transparency
// layer. One row records ONE cohort's sourced, directional exposure to a measure (or,
// when set, a single named provision of it). It is the third sibling of the Evidence
// Locker's _strength() and the Follow-the-Money _financeSignal(): a transparent,
// reasons-listed, SOURCED structural read of WHO a policy's costs and benefits fall on
// — never a verdict on whether the policy is good or bad. Fully additive; nothing
// existing reads or writes this table.
//
// NEUTRALITY (enforced in the Function and DISTRIBUTIONAL_IMPACT.md):
//   • Every row carries a NOT NULL source_url from a named scorekeeper (CBO, JCT,
//     Treasury OTA, GAO/CRS, or a labelled independent model). The Function refuses
//     to emit any row without one, exactly like every other vr_* record.
//   • `direction` describes WHO is affected and which way — it is not a value
//     judgement. Both cost and benefit rows are expected for a real measure.
//   • Divergent estimates are stored as separate rows (different source_label), so
//     the panel can show disagreement rather than hide it.
export const vrDistributionalImpacts = pgTable(
  "vr_distributional_impacts",
  {
    id: serial().primaryKey(),
    measureId: integer("measure_id")
      .notNull()
      .references(() => vrMeasures.id, { onDelete: "cascade" }),
    // Optional: pin the impact to one named provision of a megabill. Null = whole measure.
    provisionId: integer("provision_id").references(() => vrMeasureProvisions.id, {
      onDelete: "set null",
    }),
    // Which population bears the cost / gets the benefit. One of the defined cohorts:
    // working_middle | small_biz_contractors | large_corporations |
    // high_income_wealth | government_insiders. Anchored to how official scorekeepers
    // slice the data (income quintiles, filer type, etc.) — never a rhetorical label.
    cohort: text().notNull(),
    // benefit | cost | mixed | neutral — direction of the effect for THIS cohort.
    direction: text().notNull().default("mixed"),
    // Optional quantified magnitude, e.g. +2.9 with unit 'pct_after_tax_income'.
    // Stored as numeric so the client can size a bar; null when only qualitative.
    magnitudeValue: numeric("magnitude_value"),
    magnitudeUnit: text("magnitude_unit"), // pct_after_tax_income | usd_10yr | ...
    // Human-readable magnitude when no clean number applies ("~11M fewer insured").
    magnitudeLabel: text("magnitude_label"),
    // What is being measured ("Change in after-tax income, 2027").
    metric: text().notNull().default(""),
    // VERIFIABILITY: the scorekeeper and a direct, citable link. Both required — the
    // Function never emits an impact row that lacks a source.
    sourceLabel: text("source_label").notNull(),
    sourceUrl: text("source_url").notNull(),
    // One-line methodology / caveat note shown under the figure.
    methodology: text().default(""),
    // How verifiable this figure is: strong (official CBO/JCT distributional table) |
    // moderate (single named independent model) | limited (directional inference).
    evidenceStrength: text("evidence_strength").notNull().default("moderate"),
    // As-of date of the underlying estimate, so freshness is always visible.
    asOf: timestamp("as_of", { withTimezone: true }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    measureIdx: index("vr_distributional_impacts_measure_idx").on(t.measureId),
    cohortIdx: index("vr_distributional_impacts_cohort_idx").on(t.cohort),
  })
);
