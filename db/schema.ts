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
