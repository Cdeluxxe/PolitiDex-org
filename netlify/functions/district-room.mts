// ─────────────────────────────────────────────────────────────────────────────
// District Room — API (phase 1, the reader-facing room)
// ─────────────────────────────────────────────────────────────────────────────
// One room per (district, issue). Verified-residency neighbours in ONE district
// talking about ONE issue — not a comment thread on a politician, not a site-wide
// board, and not attached to a person file. Nothing in this file takes, stores or
// returns a pid.
//
// It is the FOURTH community table family and shares no row with the other three:
//
//   · vr_*          the formal record            (roll calls, citations)
//   · cee_*         the evidence exchange        (triaged, can graduate)
//   · pdx_forum_*   the open board               (any topic, ranked by votes)
//   · dd_*          THIS — one district, one issue, no ranking at all
//
// Routes (all under /api/district-room):
//   GET  /                        read a room: district, issue, posts, canPost
//   POST /                        post into a room (fails closed — see below)
//   POST /flag                    report a post (a stub that records intent)
//
// ── WHAT IS NOT HERE, BY CONSTRUCTION ───────────────────────────────────────
// No score, no vote, no reaction, no reply tally, no ranking parameter and no
// sort option. Posts come back NEWEST FIRST and that is the only order the room
// has — there is no query string that reorders it, because a room with an order
// knob is a leaderboard with a conversation's manners. No party letter, no
// caucus, no "team" language and no politician score is read or returned. No
// count from this file reaches a person file, Direction Match, Word vs Action,
// the finance lane, Mandate scoring, the Eye, the Utah ingest or the offline
// pack. And no LLM writes here: every row is a person's own sentence, so there is
// no generated-body path and no summariser.
//
// ── FAIL CLOSED, AND WHERE THAT LIVES ───────────────────────────────────────
// The gate is netlify/lib/district-room-core.mjs — a pure function over resolved
// inputs, imported unchanged by scripts/test-district-room.mjs. This file's job
// is to RESOLVE those inputs honestly and then do what the gate says:
//
//   no district  → 404. Resolved against dd_districts, so an unmapped or
//                  malformed district key is no room rather than an empty one.
//   no issue     → 404. Resolved against dd_issue_keys, the shipped ISSUE_MAP
//                  vocabulary.
//   not verified → 401/403 and the composer's closed note. In this pass that is
//                  every caller: residency has no verifier yet (see the core).
//   wrong district → 403. Verified in UT-1 is not a neighbour in UT-2.
//   empty body   → 400.
//
// A thread row is created ONLY on a write that has already passed the gate.
// Reading a room that nobody has posted in creates nothing: an empty room is an
// empty read, not a row.
//
// ── WHAT A POST DISCLOSES ───────────────────────────────────────────────────
// Body, timestamp, and the verification badge. No handle, no display name and no
// uid ever leaves this Function — `dd_posts.user_id` is written so a report has
// something to act on later and is never selected into a response. A room shows
// neighbours, not accounts.

import type { Config } from "@netlify/functions";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { ddDistricts, ddIssueKeys, ddPosts, ddThreads } from "../../db/schema.js";
import { verifyUser } from "../../db/firebase-auth.js";
import {
  COPY,
  DISTRICT_KEY_RE,
  ISSUE_KEY_RE,
  composerState,
  decideWrite,
  residencyClaim,
} from "../lib/district-room-core.mjs";

// ── Helpers ──────────────────────────────────────────────────────────────
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}
const ok = (data: unknown) => json(data, 200);
const created = (data: unknown) => json(data, 201);

// The room's identity, taken from the query string on a read and from the body
// on a write, and shape-checked before either touches the database. A malformed
// key is refused here rather than sent to Postgres as a lookup that cannot hit.
function pair(districtRaw: unknown, issueRaw: unknown) {
  const districtKey = String(districtRaw == null ? "" : districtRaw).trim();
  const issueKey = String(issueRaw == null ? "" : issueRaw).trim();
  return {
    districtKey: DISTRICT_KEY_RE.test(districtKey) ? districtKey : "",
    issueKey: ISSUE_KEY_RE.test(issueKey) ? issueKey : "",
  };
}

// The district as the DATABASE has it, or null. This is the authority: a
// well-shaped key that names no row in dd_districts is not a district, because
// dd_districts is seeded only from the areas the ballot already resolves a
// reader's own seat from (see the phase 0 migration). Returning the row rather
// than a boolean is what lets the room print the district's real label instead
// of a label this file made up out of the key.
async function resolveDistrict(districtKey: string) {
  if (!districtKey) return null;
  const [row] = await db
    .select({
      districtKey: ddDistricts.districtId,
      state: ddDistricts.state,
      seatKey: ddDistricts.seatKey,
      districtNumber: ddDistricts.districtNumber,
      label: ddDistricts.label,
    })
    .from(ddDistricts)
    .where(eq(ddDistricts.districtId, districtKey));
  return row || null;
}

// The issue key as the vocabulary has it, or ''. dd_issue_keys mirrors ISSUE_MAP,
// so an issue the app does not ship an issue file for has no room either.
async function resolveIssue(issueKey: string) {
  if (!issueKey) return "";
  const [row] = await db
    .select({ issueKey: ddIssueKeys.issueKey })
    .from(ddIssueKeys)
    .where(eq(ddIssueKeys.issueKey, issueKey));
  return row?.issueKey || "";
}

// The room's thread row, if a neighbour has ever posted in it. NOT created here:
// see the header. Returns null for a room nobody has opened yet, which is the
// empty state and not an error.
async function findThread(districtKey: string, issueKey: string) {
  const [row] = await db
    .select({ id: ddThreads.id })
    .from(ddThreads)
    .where(and(eq(ddThreads.districtId, districtKey), eq(ddThreads.issueKey, issueKey)));
  return row || null;
}

// ── GET / — read a room ──────────────────────────────────────────────────
// Open to everybody. Reading is not gated on residency, sign-in or anything
// else: the whole point of the surface is that an unverified visitor can read the
// room and be told plainly why they cannot post in it.
async function readRoom(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const { districtKey, issueKey } = pair(
    url.searchParams.get("district"),
    url.searchParams.get("issue")
  );

  const district = await resolveDistrict(districtKey);
  if (!district) {
    return json(
      { error: "We don't map that district, so there is no room for it.", code: "no_district" },
      404
    );
  }
  const issue = await resolveIssue(issueKey);
  if (!issue) {
    return json({ error: "We don't have an issue by that name.", code: "no_issue" }, 404);
  }

  // The reader's own standing, computed from the same residency claim the write
  // path uses. `canPost` is false for everybody in this pass and the note says
  // why — the client renders the note rather than writing its own.
  const viewer = await verifyUser(req);
  const residency = residencyClaim(viewer);
  const composer = composerState(residency, district.districtKey);

  const thread = await findThread(district.districtKey, issue);
  // NEWEST FIRST, and there is no other order. No score column exists to sort
  // by, and no query parameter changes this.
  const posts = thread
    ? await db
        .select({
          id: ddPosts.id,
          body: ddPosts.body,
          sourceUrl: ddPosts.sourceUrl,
          verifiedResident: ddPosts.verifiedResident,
          createdAt: ddPosts.createdAt,
        })
        .from(ddPosts)
        .where(eq(ddPosts.threadId, thread.id))
        .orderBy(desc(ddPosts.createdAt), desc(ddPosts.id))
    : [];

  return ok({
    district: {
      districtKey: district.districtKey,
      label: district.label,
      state: district.state,
      seatKey: district.seatKey,
      districtNumber: district.districtNumber,
    },
    issueKey: issue,
    strap: COPY.strap,
    empty: COPY.empty,
    badge: COPY.badge,
    canPost: composer.canPost,
    closedNote: composer.note,
    posts: posts.map((p) => ({
      id: p.id,
      body: p.body,
      sourceUrl: p.sourceUrl,
      verified: !!p.verifiedResident,
      createdAt: p.createdAt,
    })),
  });
}

// ── POST / — post into a room ────────────────────────────────────────────
// Every refusal comes from decideWrite(). This function resolves, asks, and then
// either writes exactly what the gate returned or returns exactly what the gate
// refused. There is no branch here that writes without an allow.
async function writePost(req: Request): Promise<Response> {
  let payload: any = {};
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }

  const { districtKey, issueKey } = pair(payload?.district, payload?.issue);
  const district = await resolveDistrict(districtKey);
  const issue = await resolveIssue(issueKey);

  const viewer = await verifyUser(req);
  const residency = residencyClaim(viewer);

  const verdict = decideWrite({
    district,
    issueKey: issue,
    residency,
    body: payload?.body,
    sourceUrl: payload?.sourceUrl,
  });
  if (!verdict.ok) {
    return json({ error: verdict.message, code: verdict.code }, verdict.status);
  }

  // Past the gate. The thread is created on FIRST post rather than on first
  // read, so an empty room is an empty read and never a row. The unique index on
  // (district_id, issue_key) is what makes this safe under a race: a concurrent
  // insert loses the conflict and we re-read the winner's row.
  let thread = await findThread(verdict.districtKey, verdict.issueKey);
  if (!thread) {
    const [row] = await db
      .insert(ddThreads)
      .values({ districtId: verdict.districtKey, issueKey: verdict.issueKey })
      .onConflictDoNothing()
      .returning({ id: ddThreads.id });
    thread = row || (await findThread(verdict.districtKey, verdict.issueKey));
  }
  if (!thread) {
    return json({ error: "Could not open that room.", code: "no_thread" }, 500);
  }

  // `userId` is written and never returned: a report needs something to act on,
  // a reader needs nothing. `verifiedResident` is true because the gate above
  // refuses every path that reaches here without a verified claim for THIS
  // district — the column records the fact that was checked, not a hope.
  const [post] = await db
    .insert(ddPosts)
    .values({
      threadId: thread.id,
      userId: viewer?.uid || null,
      verifiedResident: true,
      body: verdict.body,
      sourceUrl: verdict.sourceUrl,
    })
    .returning({
      id: ddPosts.id,
      body: ddPosts.body,
      sourceUrl: ddPosts.sourceUrl,
      verifiedResident: ddPosts.verifiedResident,
      createdAt: ddPosts.createdAt,
    });

  return created({
    post: {
      id: post.id,
      body: post.body,
      sourceUrl: post.sourceUrl,
      verified: !!post.verifiedResident,
      createdAt: post.createdAt,
    },
  });
}

// ── POST /flag — report a post ───────────────────────────────────────────
// A STUB THAT RECORDS INTENT, and it says so in its own response. Phase 0 ships
// no flag table and this pass does not add one: a moderation queue is a surface
// with a reviewer, a state machine and an appeal, and inventing the table before
// any of that exists would be a promise the app cannot keep. What it does do is
// refuse to accept a report about a post that does not exist, and write the
// intent to the Function log where the operator can see it.
//
// It deliberately does NOT decrement, hide, score or reorder anything. A report
// is not a downvote and there is nothing in this table for it to move.
async function flagPost(req: Request): Promise<Response> {
  let payload: any = {};
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }
  const postId = Number.parseInt(String(payload?.postId ?? ""), 10);
  if (!Number.isInteger(postId) || postId <= 0) {
    return json({ error: "Which post?", code: "no_post" }, 400);
  }
  const [row] = await db
    .select({ id: ddPosts.id, threadId: ddPosts.threadId })
    .from(ddPosts)
    .where(eq(ddPosts.id, postId));
  if (!row) return json({ error: "That post is not here.", code: "no_post" }, 404);

  const viewer = await verifyUser(req);
  const reason = String(payload?.reason || "unspecified").trim().slice(0, 80);
  // The record, such as it is. No pid, no body, no reporter identity beyond the
  // uid the operator would need to act.
  console.warn(
    "district-room flag (stub, no table in this pass):",
    JSON.stringify({ postId: row.id, threadId: row.threadId, reason, by: viewer?.uid || null })
  );
  return json({ recorded: true, stub: true, message: COPY.flagRecorded }, 202);
}

export default async (req: Request): Promise<Response> => {
  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/api\/district-room/, "") || "/";
    const method = req.method.toUpperCase();

    if (path === "/" || path === "") {
      if (method === "GET") return await readRoom(req);
      if (method === "POST") return await writePost(req);
      return json({ error: "Method not allowed" }, 405);
    }
    if (path === "/flag") {
      if (method === "POST") return await flagPost(req);
      return json({ error: "Method not allowed" }, 405);
    }
    return json({ error: "Not found." }, 404);
  } catch (e: any) {
    console.error("district-room api error:", e);
    return json({ error: "Server error", detail: e?.message || String(e) }, 500);
  }
};

export const config: Config = {
  path: ["/api/district-room", "/api/district-room/*"],
};
