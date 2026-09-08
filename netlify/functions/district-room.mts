// ─────────────────────────────────────────────────────────────────────────────
// District Room — API (phase 3, the room a verified neighbour posts and answers in)
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
//   GET  /                        read a room: district, issue, poll, posts, canPost
//   POST /                        post into a room (fails closed — see below)
//   POST /poll/vote               answer the room's ONE poll (fails closed too)
//   POST /flag                    report a post (a stub that records intent)
//   GET  /residency               the caller's OWN residency rows, and nobody's else
//   POST /residency/attest        "I live in this district" — a REQUEST, stays pending
//   POST /residency/grant         a site reviewer verifies or revokes one person
//
// ── WHAT IS NOT HERE, BY CONSTRUCTION ───────────────────────────────────────
// No score, no reaction, no reply tally, no ranking parameter and no sort
// option. Posts come back NEWEST FIRST and that is the only order the room has —
// there is no query string that reorders it, because a room with an order knob is
// a leaderboard with a conversation's manners. No party letter, no caucus, no
// "team" language and no politician score is read or returned. No number from
// this file reaches a person file, Direction Match, Word vs Action, the finance
// lane, Mandate scoring, the Eye, the Utah ingest or the offline pack. And no LLM
// writes here: every row is a person's own sentence, so there is no
// generated-body path and no summariser.
//
// ── THE POLL, AND WHAT IT IS NOT ────────────────────────────────────────────
// Phase 3 adds ONE structured question per room. Its question is fixed copy, its
// options are the three fixed poles Support / Oppose / Mixed, and its results are
// three integers. It changes nothing about the posts: there is no join between
// dd_poll_votes and dd_posts, no post is promoted, ranked or reordered by an
// answer, and NO ANSWER IS EVER INFERRED FROM POST TEXT — decideVote() takes no
// body and the vote route reads nothing but `choice`. A comment is not a vote.
//
// The counts are readable by everybody, including a reader who cannot answer:
// being told the numbers and being told plainly why you are not in them is more
// honest than hiding them. Answering is gated on exactly what posting is gated
// on, so a vote from somebody who does not live here is impossible for the same
// reason a post from them is.
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
//   not verified → 401/403 and the composer's closed note. Resolved against
//                  dd_residency: signed out, no row, pending and revoked all
//                  read and none of them post (see the core).
//   wrong district → 403. Verified in UT-1 is not a neighbour in UT-2.
//   empty body   → 400.
//
// A thread row is created ONLY on a write that has already passed the gate.
// Reading a room that nobody has posted in creates nothing: an empty room is an
// empty read, not a row.
//
// ── THE TWO RESIDENCY PATHS, AND THEY ARE LABELLED DIFFERENTLY ──────────────
// Both write dd_residency and only one of them can reach 'verified'.
//
//   POST /residency/attest   A signed-in reader says "I live in this district".
//                            Written as status 'pending', method 'self_attest'.
//                            The composer stays closed, the copy says pending,
//                            and the badge is not printed. It is a request.
//   POST /residency/grant    A site reviewer marks one person verified (or
//                            revokes them) for ONE district. Status 'verified',
//                            method 'admin_grant', reviewed_at stamped. This is
//                            the ONLY path to 'verified' in this pass.
//
// UTAH ONLY. Both paths refuse a district outside RESIDENCY_STATES with a
// sentence that says so, on top of the dd_districts foreign key that already
// refuses a district the app does not map at all.
//
// NO VENDOR IS CALLED. There is no Stripe Identity call, no Veriff call, no
// document upload and no third-party round trip in this file. The seam is
// verifyVendor() in the core and this Function does not reference it.
//
// A SELF-TYPED LOCATION IS NOT RESIDENCY. window._currentVoterLocation never
// reaches this Function, and no field on any request body can produce a verified
// claim — only a row can, and only a reviewer writes one.
//
// ── WHAT A POST DISCLOSES ───────────────────────────────────────────────────
// Body, timestamp, and the verification badge. No handle, no display name and no
// uid ever leaves this Function — `dd_posts.user_id` is written so a report has
// something to act on later and is never selected into a response. A room shows
// neighbours, not accounts.

import type { Config } from "@netlify/functions";
import { and, count, desc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  ddDistricts,
  ddIssueKeys,
  ddPollVotes,
  ddPosts,
  ddResidency,
  ddThreads,
} from "../../db/schema.js";
import { verifyUser } from "../../db/firebase-auth.js";
import {
  COPY,
  DISTRICT_KEY_RE,
  ISSUE_KEY_RE,
  composerState,
  decideVote,
  decideWrite,
  pollOptions,
  pollResultLine,
  pollState,
  pollTally,
  RESIDENCY_STATES,
  residencyClaim,
  residencyStateAllowed,
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

// THE RESIDENCY FACT, for THIS caller and THIS district. One row or none, and
// the gate is handed the row rather than a verdict this file computed — the
// authority about what a row means is residencyClaim() in the core, which the
// test exercises directly.
//
// Keyed on the uid the server verified, never on anything in the request body: a
// caller cannot ask about somebody else's residency and cannot assert their own.
// The reader's self-typed location is not consulted, because it is not evidence
// of where they live.
async function resolveResidency(uid: string, districtKey: string) {
  if (!uid || !districtKey) return null;
  const [row] = await db
    .select({
      districtKey: ddResidency.districtKey,
      status: ddResidency.status,
      method: ddResidency.method,
      createdAt: ddResidency.createdAt,
      reviewedAt: ddResidency.reviewedAt,
    })
    .from(ddResidency)
    .where(and(eq(ddResidency.userId, uid), eq(ddResidency.districtKey, districtKey)));
  return row || null;
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

// ── THE POLL'S TWO READS ─────────────────────────────────────────────────
// THE COUNTS. Three integers for ONE room, grouped in Postgres rather than
// fetched and tallied here, so the response cannot grow with the room. There is
// no poll row to look up first: the poll IS the room, so (district, issue) is the
// whole of its identity and this query is the whole of its results.
//
// Everybody may read this, including a reader who cannot answer. The folding into
// three named integers belongs to pollTally() in the core, which the test
// exercises directly — including the row for a choice that is not a pole, which
// is dropped rather than given a fourth bucket.
async function resolvePollResults(districtKey: string, issueKey: string) {
  const rows = await db
    .select({ choice: ddPollVotes.choice, n: count() })
    .from(ddPollVotes)
    .where(and(eq(ddPollVotes.districtKey, districtKey), eq(ddPollVotes.issueKey, issueKey)))
    .groupBy(ddPollVotes.choice);
  return pollTally(rows);
}

// THE CALLER'S OWN ANSWER, so the room can show them which of the three they
// picked and they can change it. Keyed on the uid the server verified, so there
// is no identifier a caller could pass to read somebody else's answer — and
// nobody else's answer is ever in a response, only the three totals.
async function resolveMyVote(uid: string, districtKey: string, issueKey: string) {
  if (!uid || !districtKey || !issueKey) return null;
  const [row] = await db
    .select({ choice: ddPollVotes.choice })
    .from(ddPollVotes)
    .where(
      and(
        eq(ddPollVotes.userId, uid),
        eq(ddPollVotes.districtKey, districtKey),
        eq(ddPollVotes.issueKey, issueKey)
      )
    );
  return row?.choice || null;
}

// The poll block, assembled in one place so the read and the write return the
// same shape. The question and the three options come from the core's constants —
// there is no question column and no option column for either to come out of a
// row — and the results are counts. No percentage, no ratio and no total-as-a-
// denominator is computed anywhere in this file.
function pollBlock(
  results: { support: number; oppose: number; mixed: number; total: number },
  gate: { canVote: boolean; note: string },
  mine: string | null,
  message?: string
) {
  return {
    question: COPY.pollQuestion,
    options: pollOptions(),
    results,
    resultLine: pollResultLine(results),
    countsNote: COPY.pollCountsNote,
    canVote: gate.canVote,
    note: gate.note,
    mine: mine || null,
    message: message || "",
  };
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
  const signedIn = !!viewer && !viewer.isAnonymous;
  const row = signedIn ? await resolveResidency(viewer.uid, district.districtKey) : null;
  const residency = residencyClaim(viewer, row);
  const composer = composerState(residency, district.districtKey);
  const inScope = residencyStateAllowed(district.state);

  // The room's ONE poll. The counts are read for everybody; the caller's own
  // answer only exists for a caller the server could name. `canVote` comes from
  // the same residency claim the composer does, so the buttons a reader is shown
  // are exactly the buttons the vote route would accept an answer from.
  const results = await resolvePollResults(district.districtKey, issue);
  const mine = signedIn ? await resolveMyVote(viewer!.uid, district.districtKey, issue) : null;
  const poll = pollBlock(results, pollState(residency, district.districtKey), mine);

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
    // WHETHER THE SERVER COULD NAME THE CALLER AT ALL, and it is a boolean about
    // this request rather than anything about the person: no uid, no handle and
    // no address. The client's own account chip already knows whether somebody
    // is signed in, so returning the server's answer to the same question is
    // what lets the room notice the two disagreeing — a signed-in reader whose
    // token did not arrive must not be shown the signed-out sentence.
    signedIn,
    canPost: composer.canPost,
    closedNote: composer.note,
    // ONE poll per room, above the composer and above the posts. It does not
    // reorder them and it is not derived from them.
    poll,
    // The caller's OWN standing, and the two honest things they can do about it.
    // `status` is null until a row exists, and 'pending' is reported as pending —
    // nothing here ever describes a pending or location-derived row as verified,
    // and the badge copy is not sent with one.
    residency: {
      status: residency.status,
      reason: residency.reason,
      // The self-attest REQUEST. Offered to a signed-in reader with no row here
      // yet, in a state this pass verifies at all — and to nobody else. This
      // boolean is the WHOLE condition the client paints the ask on: it adds no
      // location test of its own, because a zip somebody typed is not residency
      // and a reader who cannot ask has no way into the room at all.
      canAttest: signedIn && inScope && !row,
      attest: COPY.attest,
      attestNote: COPY.attestNote,
      // The reviewer's grant. The one path to 'verified' in this pass.
      canGrant: !!(viewer && viewer.isModerator) && inScope,
      grant: COPY.grant,
      // Said out loud rather than implied by a control that is simply absent.
      outOfScopeNote: inScope ? "" : COPY.notInScope,
    },
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
  const row = viewer && !viewer.isAnonymous && district
    ? await resolveResidency(viewer.uid, district.districtKey)
    : null;
  const residency = residencyClaim(viewer, row);

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

// ── POST /poll/vote — answer the room's one poll ─────────────────────────
// Every refusal comes from decideVote(), the write gate's twin: same district,
// same issue, same residency claim, and the answer must be one of three. A
// pending request, a revoked row, a location pin and somebody verified in another
// district are all refused here for exactly the reasons they are refused a post.
//
// IT READS NOTHING BUT `choice`. There is no body field on this route, no text is
// parsed and nothing is inferred from what anybody wrote in the room — a comment
// is not a vote.
//
// ONE VOTE PER PERSON, AND CHANGING IT OVERWRITES. The single write is an upsert
// onto the unique index on (district_key, issue_key, user_id), so a second answer
// REPLACES the first in the database rather than in a code path that remembers
// to. There is no delete, no history and no way to be counted twice.
async function votePoll(req: Request): Promise<Response> {
  let payload: any = {};
  try { payload = await req.json(); } catch { payload = {}; }

  const { districtKey, issueKey } = pair(payload?.district, payload?.issue);
  const district = await resolveDistrict(districtKey);
  const issue = await resolveIssue(issueKey);

  const viewer = await verifyUser(req);
  const row = viewer && !viewer.isAnonymous && district
    ? await resolveResidency(viewer.uid, district.districtKey)
    : null;
  const residency = residencyClaim(viewer, row);

  const verdict = decideVote({
    district,
    issueKey: issue,
    residency,
    choice: payload?.choice,
  });
  if (!verdict.ok) {
    return json({ error: verdict.message, code: verdict.code }, verdict.status);
  }

  const now = new Date();
  await db
    .insert(ddPollVotes)
    .values({
      districtKey: verdict.districtKey,
      issueKey: verdict.issueKey,
      userId: viewer!.uid,
      choice: verdict.choice,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [ddPollVotes.districtKey, ddPollVotes.issueKey, ddPollVotes.userId],
      set: { choice: verdict.choice, updatedAt: now },
    });

  // The counts as they now stand, in the same shape the read returns, so the
  // client repaints one block instead of re-reading the whole room.
  const results = await resolvePollResults(verdict.districtKey, verdict.issueKey);
  return ok({
    poll: pollBlock(
      results,
      { canVote: true, note: "" },
      verdict.choice,
      COPY.pollVoted
    ),
  });
}

// ── RESIDENCY, THE TWO PATHS ─────────────────────────────────────────────
// Shared pre-flight for both. A residency row can only ever name a district the
// app maps (dd_districts, hence the FK) in a state this pass actually verifies
// (RESIDENCY_STATES, hence the sentence). Utah is the only one, and refusing
// another state with a sentence beats refusing it with an absent control.
async function residencyTarget(payload: any) {
  const districtKey = String(payload?.district == null ? "" : payload.district).trim();
  if (!DISTRICT_KEY_RE.test(districtKey)) {
    return {
      district: null,
      refusal: json(
        { error: "We don't map that district, so there is no room for it.", code: "no_district" },
        404
      ),
    };
  }
  const district = await resolveDistrict(districtKey);
  if (!district) {
    return {
      district: null,
      refusal: json(
        { error: "We don't map that district, so there is no room for it.", code: "no_district" },
        404
      ),
    };
  }
  if (!residencyStateAllowed(district.state)) {
    return {
      district: null,
      refusal: json({ error: COPY.notInScope, code: "out_of_scope" }, 403),
    };
  }
  return { district, refusal: null };
}

// ── POST /residency/attest — "I live in this district" ───────────────────
// A REQUEST, and it is labelled as one everywhere it appears. It writes status
// 'pending' with method 'self_attest' and it cannot write anything else: the
// status is a literal in this function, not a field off the body, so no caller
// can hand themselves 'verified'. The composer stays closed afterwards, because
// residencyClaim() honours a verified status only from a verifying method and
// 'self_attest' is not one.
//
// NO LOCATION IS CONSULTED, on either side. Phase 3's client also required the
// room's district to be one the reader's own resolver placed them in; that
// courtesy hid the ask from every signed-in neighbour whose resolver held no
// self-typed zip, which is most of them, and left them reading "we have not
// established that you live in this district" with no control beneath it. The
// safeguard was never that check: this route cannot produce a claim that
// publishes — the status is the literal 'pending' and the method the literal
// 'self_attest', which residencyClaim() refuses to honour as verified at any
// status — so it does not matter which district somebody asks about.
async function attestResidency(req: Request): Promise<Response> {
  let payload: any = {};
  try { payload = await req.json(); } catch { payload = {}; }

  const viewer = await verifyUser(req);
  if (!viewer || viewer.isAnonymous) {
    return json({ error: COPY.closedSignedOut, code: "signed_out" }, 401);
  }
  const { district, refusal } = await residencyTarget(payload);
  if (!district) return refusal || json({ error: "Which district?", code: "no_district" }, 404);

  const existing = await resolveResidency(viewer.uid, district.districtKey);
  // A row a reviewer has already decided is not re-opened by asking again. Both
  // answers are the truth about their standing rather than a new request.
  if (existing?.status === "verified") {
    return ok({ status: "verified", districtKey: district.districtKey, message: COPY.granted });
  }
  if (existing?.status === "revoked") {
    return json({ error: COPY.revoked, code: "revoked" }, 403);
  }

  await db
    .insert(ddResidency)
    .values({
      userId: viewer.uid,
      districtKey: district.districtKey,
      status: "pending",
      method: "self_attest",
    })
    .onConflictDoNothing();

  // 202: recorded, and decided by nobody yet. The sentence says pending in the
  // same breath as it says recorded, so "we got it" is never read as "you're in".
  return json(
    {
      status: "pending",
      districtKey: district.districtKey,
      message: COPY.attestSent,
      note: COPY.attestNote,
    },
    202
  );
}

// ── POST /residency/grant — a reviewer decides ───────────────────────────
// THE ONLY PATH TO 'verified' IN THIS PASS. A site reviewer (the same gate
// db/firebase-auth.ts already uses for the evidence exchange) marks ONE person
// verified for ONE district, or revokes them. `reviewedAt` is stamped because a
// human looked; that is the difference between this route and the one above.
//
// `userId` defaults to the reviewer's own uid, so verifying yourself for your own
// district is one call with no identifier to copy around.
async function grantResidency(req: Request): Promise<Response> {
  let payload: any = {};
  try { payload = await req.json(); } catch { payload = {}; }

  const viewer = await verifyUser(req);
  if (!viewer || viewer.isAnonymous) {
    return json({ error: COPY.closedSignedOut, code: "signed_out" }, 401);
  }
  if (!viewer.isModerator) {
    return json({ error: COPY.grantDenied, code: "not_reviewer" }, 403);
  }
  const { district, refusal } = await residencyTarget(payload);
  if (!district) return refusal || json({ error: "Which district?", code: "no_district" }, 404);

  // Two decisions and no third. Anything else is refused rather than coerced,
  // and 'pending' is not a decision a reviewer makes — it is what a request
  // already is.
  const decided = String(payload?.status == null ? "verified" : payload.status).trim();
  if (decided !== "verified" && decided !== "revoked") {
    return json({ error: "A reviewer marks somebody verified or revoked.", code: "bad_status" }, 400);
  }
  const subject = String(payload?.userId == null ? "" : payload.userId).trim() || viewer.uid;
  if (subject.length > 128) {
    return json({ error: "Which person?", code: "no_subject" }, 400);
  }

  const reviewedAt = new Date();
  const [row] = await db
    .insert(ddResidency)
    .values({
      userId: subject,
      districtKey: district.districtKey,
      status: decided,
      method: "admin_grant",
      reviewedAt,
    })
    .onConflictDoUpdate({
      target: [ddResidency.userId, ddResidency.districtKey],
      set: { status: decided, method: "admin_grant", reviewedAt },
    })
    .returning({
      districtKey: ddResidency.districtKey,
      status: ddResidency.status,
      method: ddResidency.method,
      reviewedAt: ddResidency.reviewedAt,
    });

  return ok({
    status: row?.status || decided,
    districtKey: district.districtKey,
    method: row?.method || "admin_grant",
    reviewedAt: row?.reviewedAt || reviewedAt,
    self: subject === viewer.uid,
    message: decided === "verified" ? COPY.granted : COPY.revoked,
  });
}

// ── GET /residency — the caller's own standing ───────────────────────────
// Their OWN rows and nobody else's: the where clause is the verified uid, so
// there is no identifier a caller could pass to read somebody else's. No uid, no
// name and no contact detail is in the response — a district, a status, a method
// and two timestamps.
async function readResidency(req: Request): Promise<Response> {
  const viewer = await verifyUser(req);
  if (!viewer || viewer.isAnonymous) {
    return ok({ signedIn: false, reviewer: false, states: RESIDENCY_STATES, rows: [] });
  }
  const rows = await db
    .select({
      districtKey: ddResidency.districtKey,
      status: ddResidency.status,
      method: ddResidency.method,
      createdAt: ddResidency.createdAt,
      reviewedAt: ddResidency.reviewedAt,
    })
    .from(ddResidency)
    .where(eq(ddResidency.userId, viewer.uid));
  return ok({
    signedIn: true,
    reviewer: !!viewer.isModerator,
    states: RESIDENCY_STATES,
    rows,
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
    if (path === "/poll/vote") {
      if (method === "POST") return await votePoll(req);
      return json({ error: "Method not allowed" }, 405);
    }
    if (path === "/flag") {
      if (method === "POST") return await flagPost(req);
      return json({ error: "Method not allowed" }, 405);
    }
    if (path === "/residency") {
      if (method === "GET") return await readResidency(req);
      return json({ error: "Method not allowed" }, 405);
    }
    if (path === "/residency/attest") {
      if (method === "POST") return await attestResidency(req);
      return json({ error: "Method not allowed" }, 405);
    }
    if (path === "/residency/grant") {
      if (method === "POST") return await grantResidency(req);
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
