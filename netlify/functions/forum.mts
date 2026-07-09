// ─────────────────────────────────────────────────────────────────────────────
// Open Discussion Board — API (the OPEN track)
// ─────────────────────────────────────────────────────────────────────────────
// The free-conversation half of PolitiDex's two-track community system, kept
// deliberately apart from the verified Community Evidence Exchange (/api/community):
//
//   • VERIFIED track (/api/community, cee_*) — submissions are AI-triaged, human-
//     moderated, and can GRADUATE into the curated Evidence Locker with attribution.
//   • OPEN track (this file, pdx_forum_*) — anyone signed in posts freely on any
//     topic, nothing is pre-approved, ranking is by community up/down votes, and
//     moderation is REACTIVE only (removing spam / hate). There is NO promotion
//     path out of here: an open thread can never flow into the Locker.
//
// These two Functions share only the read-only Firebase token verifier
// (db/firebase-auth). They touch entirely separate tables. Nothing crosses over.
//
// Routes (all under /api/forum):
//   GET  /threads                list threads (sort=hot|new|top, filters topic/link)
//   POST /threads                create a thread
//   GET  /threads/:id            thread detail + nested replies
//   POST /threads/:id/replies    add a (optionally nested) reply
//   POST /threads/:id/vote       up/down vote a thread (toggle)
//   POST /threads/:id/flag       flag a thread for review
//   POST /threads/:id/moderate   (moderator) remove/restore/resolve
//   POST /replies/:id/vote       up/down vote a reply (toggle)
//   POST /replies/:id/flag       flag a reply for review
//   POST /replies/:id/moderate   (moderator) remove/restore/resolve
//   GET  /moderation             (moderator) flagged threads + replies

import type { Config } from "@netlify/functions";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  pdxForumThreads,
  pdxForumReplies,
  pdxForumVotes,
  pdxForumFlags,
} from "../../db/schema.js";
import { verifyUser, publicViewer, type AuthUser } from "../../db/firebase-auth.js";

// Friendly, fixed topic buckets. Validated rather than trusting the client.
const TOPICS = new Set([
  "general",
  "stances",
  "reforms",
  "elections",
  "money",
  "media",
  "meta",
]);
// Optional app-item reference kinds a thread may point at (context only).
const LINK_TYPES = new Set([
  "politician",
  "issue",
  "reform",
  "promise",
  "spotlight",
  "evidence",
  "other",
]);
// Reactive civility floor — the only reasons the open board is moderated for.
const FLAG_REASONS = new Set(["spam", "hate", "personal_attack", "off_topic", "other"]);

// ── Helpers ──────────────────────────────────────────────────────────────
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}
const ok = (data: unknown) => json(data, 200);
const created = (data: unknown) => json(data, 201);
const bad = (msg: string) => json({ error: msg }, 400);
const unauth = () => json({ error: "Sign in to do that." }, 401);
const forbidden = () => json({ error: "Not allowed." }, 403);
const notFound = () => json({ error: "Not found." }, 404);

function clampStr(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

// Hot ranking: community score, gently decayed by age, with a small nudge from
// reply activity and a +1 floor so brand-new (0-score) threads still surface.
// Kept in JS so the tuning stays visible and easy to reason about.
function hotScore(score: number, replyCount: number, createdAt: Date): number {
  const ageHours = Math.max(0, (Date.now() - createdAt.getTime()) / 3_600_000);
  return (score + replyCount * 0.5 + 1) / Math.pow(ageHours + 2, 1.15);
}

// Sum the up/down votes for a target and write the denormalised cache back onto
// the thread or reply row, returning the fresh total.
async function recomputeScore(
  targetType: "thread" | "reply",
  targetId: number
): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${pdxForumVotes.value}), 0)::int` })
    .from(pdxForumVotes)
    .where(
      and(
        eq(pdxForumVotes.targetType, targetType),
        eq(pdxForumVotes.targetId, targetId)
      )
    );
  const total = Number(row?.total || 0);
  if (targetType === "thread") {
    await db
      .update(pdxForumThreads)
      .set({ score: total, updatedAt: new Date() })
      .where(eq(pdxForumThreads.id, targetId));
  } else {
    await db.update(pdxForumReplies).set({ score: total }).where(eq(pdxForumReplies.id, targetId));
  }
  return total;
}

// Refresh a thread's denormalised active-reply count.
async function recomputeReplyCount(threadId: number): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(pdxForumReplies)
    .where(and(eq(pdxForumReplies.threadId, threadId), eq(pdxForumReplies.status, "active")));
  const n = Number(row?.n || 0);
  await db.update(pdxForumThreads).set({ replyCount: n }).where(eq(pdxForumThreads.id, threadId));
  return n;
}

// The viewer's own votes across a set of targets → { targetId: value }.
async function viewerVotesFor(
  targetType: "thread" | "reply",
  targetIds: number[],
  uid: string
): Promise<Record<number, number>> {
  const out: Record<number, number> = {};
  if (!targetIds.length || !uid) return out;
  const rows = await db
    .select({ targetId: pdxForumVotes.targetId, value: pdxForumVotes.value })
    .from(pdxForumVotes)
    .where(
      and(
        eq(pdxForumVotes.targetType, targetType),
        inArray(pdxForumVotes.targetId, targetIds),
        eq(pdxForumVotes.uid, uid)
      )
    );
  for (const r of rows) out[r.targetId] = r.value;
  return out;
}

// Build the optional, one-way app reference a thread may carry (context only).
function linkOf(t: typeof pdxForumThreads.$inferSelect) {
  if (!t.linkType && !t.linkRef && !t.linkLabel) return null;
  return { type: t.linkType, ref: t.linkRef, label: t.linkLabel };
}

function shapeThread(
  t: typeof pdxForumThreads.$inferSelect,
  viewerVote = 0
) {
  return {
    id: t.id,
    authorName: t.authorName,
    title: t.title,
    body: t.body,
    topic: t.topic,
    link: linkOf(t),
    score: t.score,
    replyCount: t.replyCount,
    status: t.status,
    createdAt: t.createdAt,
    viewerVote,
    hot: Math.round(hotScore(t.score, t.replyCount, t.createdAt) * 1000) / 1000,
  };
}

// ── Voting (shared by threads + replies) ───────────────────────────────────
async function castVote(
  targetType: "thread" | "reply",
  targetId: number,
  req: Request,
  viewer: AuthUser | null
): Promise<Response> {
  if (!viewer || viewer.isAnonymous) return unauth();
  const body = await req.json().catch(() => ({}));
  const value = Number(body.value);
  if (value !== 1 && value !== -1) return bad("Vote must be up (1) or down (-1).");

  // Confirm the target exists (and isn't a removed row).
  if (targetType === "thread") {
    const [t] = await db
      .select({ id: pdxForumThreads.id, status: pdxForumThreads.status })
      .from(pdxForumThreads)
      .where(eq(pdxForumThreads.id, targetId));
    if (!t || t.status === "removed") return notFound();
  } else {
    const [r] = await db
      .select({ id: pdxForumReplies.id, status: pdxForumReplies.status })
      .from(pdxForumReplies)
      .where(eq(pdxForumReplies.id, targetId));
    if (!r || r.status === "removed") return notFound();
  }

  const [existing] = await db
    .select({ id: pdxForumVotes.id, value: pdxForumVotes.value })
    .from(pdxForumVotes)
    .where(
      and(
        eq(pdxForumVotes.targetType, targetType),
        eq(pdxForumVotes.targetId, targetId),
        eq(pdxForumVotes.uid, viewer.uid)
      )
    );

  let viewerVote = value;
  if (existing) {
    if (existing.value === value) {
      // Re-casting the same direction clears the vote (toggle off).
      await db.delete(pdxForumVotes).where(eq(pdxForumVotes.id, existing.id));
      viewerVote = 0;
    } else {
      await db.update(pdxForumVotes).set({ value }).where(eq(pdxForumVotes.id, existing.id));
    }
  } else {
    await db
      .insert(pdxForumVotes)
      .values({ targetType, targetId, uid: viewer.uid, value })
      .onConflictDoNothing();
  }

  const score = await recomputeScore(targetType, targetId);
  return ok({ score, viewerVote });
}

// ── Flagging (shared) ──────────────────────────────────────────────────────
async function castFlag(
  targetType: "thread" | "reply",
  targetId: number,
  req: Request,
  viewer: AuthUser | null
): Promise<Response> {
  if (!viewer || viewer.isAnonymous) return unauth();
  const body = await req.json().catch(() => ({}));
  const reason = clampStr(body.reason, 40);
  if (!FLAG_REASONS.has(reason)) return bad("Pick a valid reason.");
  const note = clampStr(body.note, 1000);

  // Confirm the target exists before recording a flag against it.
  if (targetType === "thread") {
    const [t] = await db.select({ id: pdxForumThreads.id }).from(pdxForumThreads).where(eq(pdxForumThreads.id, targetId));
    if (!t) return notFound();
  } else {
    const [r] = await db.select({ id: pdxForumReplies.id }).from(pdxForumReplies).where(eq(pdxForumReplies.id, targetId));
    if (!r) return notFound();
  }

  await db
    .insert(pdxForumFlags)
    .values({ targetType, targetId, uid: viewer.uid, reason, note, status: "open" })
    .onConflictDoUpdate({
      target: [pdxForumFlags.targetType, pdxForumFlags.targetId, pdxForumFlags.uid],
      set: { reason, note, status: "open", createdAt: new Date() },
    });

  return ok({ flagged: true });
}

// ── Threads ────────────────────────────────────────────────────────────────
async function listThreads(req: Request, viewer: AuthUser | null): Promise<Response> {
  const url = new URL(req.url);
  const sort = url.searchParams.get("sort") || "hot";
  const topic = url.searchParams.get("topic");
  const linkRef = url.searchParams.get("link");

  const where = [eq(pdxForumThreads.status, "active")];
  if (topic && TOPICS.has(topic)) where.push(eq(pdxForumThreads.topic, topic));
  if (linkRef) where.push(eq(pdxForumThreads.linkRef, linkRef));

  const rows = await db
    .select()
    .from(pdxForumThreads)
    .where(and(...where))
    .orderBy(desc(pdxForumThreads.createdAt))
    .limit(200);

  const ids = rows.map((r) => r.id);
  const viewerVotes = await viewerVotesFor("thread", ids, viewer?.uid || "");
  let shaped = rows.map((t) => shapeThread(t, viewerVotes[t.id] || 0));

  if (sort === "new") {
    // already newest-first
  } else if (sort === "top") {
    shaped.sort((a, b) => b.score - a.score || b.replyCount - a.replyCount);
  } else {
    shaped.sort((a, b) => b.hot - a.hot); // hot (default)
  }

  return ok({ threads: shaped, viewer: publicViewer(viewer) });
}

async function createThread(req: Request, viewer: AuthUser | null): Promise<Response> {
  if (!viewer || viewer.isAnonymous) return unauth();
  const body = await req.json().catch(() => ({}));
  const title = clampStr(body.title, 200);
  if (!title) return bad("A title is required.");
  const text = clampStr(body.body, 8000);
  const topic = TOPICS.has(body.topic) ? body.topic : "general";

  // Optional app reference — context only, never an import.
  const linkType = LINK_TYPES.has(body.linkType) ? body.linkType : null;
  let linkRef = clampStr(body.linkRef, 300) || null;
  const linkLabel = clampStr(body.linkLabel, 200) || null;
  // A reference is only stored if it actually names something.
  const hasLink = !!(linkType && (linkRef || linkLabel));

  const [row] = await db
    .insert(pdxForumThreads)
    .values({
      authorUid: viewer.uid,
      authorName: viewer.name,
      title,
      body: text,
      topic,
      linkType: hasLink ? linkType : null,
      linkRef: hasLink ? linkRef : null,
      linkLabel: hasLink ? linkLabel : null,
    })
    .returning();

  return created(shapeThread(row, 0));
}

async function getThread(id: number, viewer: AuthUser | null): Promise<Response> {
  const [thread] = await db.select().from(pdxForumThreads).where(eq(pdxForumThreads.id, id));
  if (!thread) return notFound();
  // Removed threads are visible only to a moderator (so they can restore them).
  if (thread.status === "removed" && !viewer?.isModerator) return notFound();

  const replyRows = await db
    .select()
    .from(pdxForumReplies)
    .where(and(eq(pdxForumReplies.threadId, id), eq(pdxForumReplies.status, "active")))
    .orderBy(pdxForumReplies.createdAt);

  const replyIds = replyRows.map((r) => r.id);
  const [threadVote, replyVotes] = await Promise.all([
    viewerVotesFor("thread", [id], viewer?.uid || ""),
    viewerVotesFor("reply", replyIds, viewer?.uid || ""),
  ]);

  const replies = replyRows.map((r) => ({
    id: r.id,
    parentId: r.parentId,
    authorName: r.authorName,
    body: r.body,
    score: r.score,
    createdAt: r.createdAt,
    viewerVote: replyVotes[r.id] || 0,
  }));

  return ok({
    thread: shapeThread(thread, threadVote[id] || 0),
    replies,
    viewer: publicViewer(viewer),
  });
}

async function addReply(id: number, req: Request, viewer: AuthUser | null): Promise<Response> {
  if (!viewer || viewer.isAnonymous) return unauth();
  const [thread] = await db
    .select({ id: pdxForumThreads.id, status: pdxForumThreads.status })
    .from(pdxForumThreads)
    .where(eq(pdxForumThreads.id, id));
  if (!thread || thread.status === "removed") return notFound();

  const body = await req.json().catch(() => ({}));
  const text = clampStr(body.body, 8000);
  if (!text) return bad("Reply cannot be empty.");

  let parentId: number | null = null;
  if (body.parentId != null) {
    const pid = parseInt(body.parentId, 10);
    if (!isNaN(pid)) {
      // Ensure the parent reply belongs to this thread.
      const [parent] = await db
        .select({ id: pdxForumReplies.id })
        .from(pdxForumReplies)
        .where(and(eq(pdxForumReplies.id, pid), eq(pdxForumReplies.threadId, id)));
      if (parent) parentId = pid;
    }
  }

  const [row] = await db
    .insert(pdxForumReplies)
    .values({
      threadId: id,
      parentId,
      authorUid: viewer.uid,
      authorName: viewer.name,
      body: text,
    })
    .returning();

  await recomputeReplyCount(id);

  return created({
    id: row.id,
    parentId: row.parentId,
    authorName: row.authorName,
    body: row.body,
    score: row.score,
    createdAt: row.createdAt,
    viewerVote: 0,
  });
}

// ── Moderation (reactive: spam / hate only) ────────────────────────────────
async function moderationQueue(viewer: AuthUser | null): Promise<Response> {
  if (!viewer?.isModerator) return forbidden();

  const flagRows = await db
    .select()
    .from(pdxForumFlags)
    .where(eq(pdxForumFlags.status, "open"))
    .orderBy(desc(pdxForumFlags.createdAt));

  const threadIds = flagRows.filter((f) => f.targetType === "thread").map((f) => f.targetId);
  const replyIds = flagRows.filter((f) => f.targetType === "reply").map((f) => f.targetId);

  const threads = threadIds.length
    ? await db.select().from(pdxForumThreads).where(inArray(pdxForumThreads.id, threadIds))
    : [];
  const replies = replyIds.length
    ? await db.select().from(pdxForumReplies).where(inArray(pdxForumReplies.id, replyIds))
    : [];
  const threadById = new Map(threads.map((t) => [t.id, t]));
  const replyById = new Map(replies.map((r) => [r.id, r]));

  // Group flags by their target so the moderator sees each item once with its reasons.
  const grouped: Record<string, any> = {};
  for (const f of flagRows) {
    const key = `${f.targetType}:${f.targetId}`;
    if (!grouped[key]) {
      if (f.targetType === "thread") {
        const t = threadById.get(f.targetId);
        if (!t) continue;
        grouped[key] = {
          targetType: "thread",
          targetId: f.targetId,
          title: t.title,
          body: t.body,
          topic: t.topic,
          authorName: t.authorName,
          status: t.status,
          createdAt: t.createdAt,
          flags: [],
        };
      } else {
        const r = replyById.get(f.targetId);
        if (!r) continue;
        grouped[key] = {
          targetType: "reply",
          targetId: f.targetId,
          threadId: r.threadId,
          body: r.body,
          authorName: r.authorName,
          status: r.status,
          createdAt: r.createdAt,
          flags: [],
        };
      }
    }
    grouped[key].flags.push({ reason: f.reason, note: f.note, createdAt: f.createdAt });
  }

  return ok({ items: Object.values(grouped) });
}

async function moderateThread(id: number, req: Request, viewer: AuthUser | null): Promise<Response> {
  if (!viewer?.isModerator) return forbidden();
  const body = await req.json().catch(() => ({}));
  const action = clampStr(body.action, 40);
  const [t] = await db.select({ id: pdxForumThreads.id }).from(pdxForumThreads).where(eq(pdxForumThreads.id, id));
  if (!t) return notFound();

  switch (action) {
    case "remove":
      await db.update(pdxForumThreads).set({ status: "removed", updatedAt: new Date() }).where(eq(pdxForumThreads.id, id));
      break;
    case "restore":
      await db.update(pdxForumThreads).set({ status: "active", updatedAt: new Date() }).where(eq(pdxForumThreads.id, id));
      break;
    case "resolve_flags":
      await db
        .update(pdxForumFlags)
        .set({ status: "resolved" })
        .where(and(eq(pdxForumFlags.targetType, "thread"), eq(pdxForumFlags.targetId, id)));
      break;
    default:
      return bad("Unknown moderation action.");
  }
  return ok({ done: true, action });
}

async function moderateReply(id: number, req: Request, viewer: AuthUser | null): Promise<Response> {
  if (!viewer?.isModerator) return forbidden();
  const body = await req.json().catch(() => ({}));
  const action = clampStr(body.action, 40);
  const [r] = await db
    .select({ id: pdxForumReplies.id, threadId: pdxForumReplies.threadId })
    .from(pdxForumReplies)
    .where(eq(pdxForumReplies.id, id));
  if (!r) return notFound();

  switch (action) {
    case "remove":
      await db.update(pdxForumReplies).set({ status: "removed" }).where(eq(pdxForumReplies.id, id));
      await recomputeReplyCount(r.threadId);
      break;
    case "restore":
      await db.update(pdxForumReplies).set({ status: "active" }).where(eq(pdxForumReplies.id, id));
      await recomputeReplyCount(r.threadId);
      break;
    case "resolve_flags":
      await db
        .update(pdxForumFlags)
        .set({ status: "resolved" })
        .where(and(eq(pdxForumFlags.targetType, "reply"), eq(pdxForumFlags.targetId, id)));
      break;
    default:
      return bad("Unknown moderation action.");
  }
  return ok({ done: true, action });
}

// ── Router ─────────────────────────────────────────────────────────────
export default async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\/forum/, "").replace(/\/+$/, "");
  const method = req.method.toUpperCase();
  const viewer = await verifyUser(req);

  try {
    // /threads
    if (path === "/threads" || path === "") {
      if (method === "GET") return await listThreads(req, viewer);
      if (method === "POST") return await createThread(req, viewer);
      return json({ error: "Method not allowed" }, 405);
    }

    // /moderation
    if (path === "/moderation" && method === "GET") {
      return await moderationQueue(viewer);
    }

    // /threads/:id and sub-resources
    const tm = path.match(/^\/threads\/(\d+)(\/[a-z-]+)?$/);
    if (tm) {
      const id = parseInt(tm[1], 10);
      const sub = tm[2] || "";
      if (!sub && method === "GET") return await getThread(id, viewer);
      if (sub === "/replies" && method === "POST") return await addReply(id, req, viewer);
      if (sub === "/vote" && method === "POST") return await castVote("thread", id, req, viewer);
      if (sub === "/flag" && method === "POST") return await castFlag("thread", id, req, viewer);
      if (sub === "/moderate" && method === "POST") return await moderateThread(id, req, viewer);
      return json({ error: "Method not allowed" }, 405);
    }

    // /replies/:id sub-resources
    const rm = path.match(/^\/replies\/(\d+)(\/[a-z-]+)?$/);
    if (rm) {
      const id = parseInt(rm[1], 10);
      const sub = rm[2] || "";
      if (sub === "/vote" && method === "POST") return await castVote("reply", id, req, viewer);
      if (sub === "/flag" && method === "POST") return await castFlag("reply", id, req, viewer);
      if (sub === "/moderate" && method === "POST") return await moderateReply(id, req, viewer);
      return json({ error: "Method not allowed" }, 405);
    }

    return notFound();
  } catch (e: any) {
    console.error("forum api error:", e);
    return json({ error: "Server error", detail: e?.message || String(e) }, 500);
  }
};

export const config: Config = {
  path: ["/api/forum", "/api/forum/*"],
};
