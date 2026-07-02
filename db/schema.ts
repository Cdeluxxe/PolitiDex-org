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
    // Optional but encouraged source link.
    sourceUrl: text("source_url"),
    // One of the CORE_NATIONAL_ISSUES keys (reuses the existing category system).
    categoryKey: text("category_key"),
    // Zero or more ISSUE_MAP issue keys (reuses the existing issue tagging system).
    issueKeys: jsonb("issue_keys").$type<string[]>().default([]),
    // active = visible; removed = hidden by a moderator; imported = a moderator
    // has manually pulled it into the Evidence Locker (Phase 3 bridge).
    status: text().notNull().default("active"),
    // Set when at least one user has used "Suggest for Review".
    suggestedForReview: boolean("suggested_for_review").notNull().default(false),
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
