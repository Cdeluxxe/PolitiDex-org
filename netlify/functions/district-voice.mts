// ─────────────────────────────────────────────────────────────────────────────
// District Voice — API (slice 1: one seat, one poll, one short take)
// ─────────────────────────────────────────────────────────────────────────────
// The belonging layer for ONE Utah seat. A verified neighbour in that seat can
// answer one live question and post one short take keyed to an issue the seat
// actually touches. Everybody else — signed out, no location, another district —
// READS ALL OF IT.
//
// THE PUBLIC RECORD STAYS FREE AND UNGATED. VOICE IS RESIDENCY-GATED. That is the
// whole access rule and it is visible in the router below: GET calls verifyUser()
// only to personalize (to mark a reader's own take and their own answer), never to
// decide whether to answer, and there is no path where a missing token turns a
// read into a 401.
//
// ── WHAT THIS FILE IS FORBIDDEN TO TOUCH, AND HOW THAT IS ENFORCED ──────────
// Voice never writes formal acts, stances, Direction Match, finance, or
// baseline-from-record. The enforcement is not a comment: this file imports
// EXACTLY five tables — voice_polls, voice_poll_options, voice_poll_answers,
// voice_takes, voice_residency — plus two read-only lookups (dd_districts for
// "is this a real seat", dd_issue_keys for "is this a real issue"). It imports no
// vr_* table, no pol_* table, no finance table and no stance table, so there is
// no statement in this file that could write one. The record engines are
// byte-identical after this lands because nothing here can reach them.
//
// NO PID. This file does not take, store or return a politician id. The sitting
// member chip on the district file is resolved CLIENT-side from the curated
// incumbent table Door 2 already ships, so a take belongs to a seat and can never
// become a comment section on a person. Nothing here joins a take to a member.
//
// NO SCORE, NO PERCENTAGE, NO DISTRICT MOOD. The poll returns one integer per
// option and the number of people who answered. There is no proportion in this
// file, no composite, and no field that combines the options into a single number.
// No percent sign appears in any response this file builds.
//
// NO PARTY. No party column is read, no party field is returned, and no ordering
// anywhere is party-derived. Takes come back NEWEST FIRST and that is the only
// order — there is no sort parameter, because a feed with an order knob is a
// leaderboard with a conversation's manners. No upvote, no reaction, no reply
// parent: slice 2 owns threads and this file cannot express one.
//
// ── FAIL CLOSED, AND WHERE THE DECISION LIVES ───────────────────────────────
// The gate is netlify/lib/district-voice-core.mjs — pure functions over resolved
// inputs, imported unchanged by scripts/test-district-voice.mjs. This file's job
// is to RESOLVE those inputs honestly and then do what the gate says:
//
//   no seat      → 404. Resolved against dd_districts AND the VOICE_SEATS
//                  allow-list, so an unmapped key, a malformed key, and a real
//                  seat where Voice has not opened are all "no place" rather than
//                  an empty room.
//   no issue     → 404. Resolved against dd_issue_keys, the shipped ISSUE_MAP
//                  vocabulary. A take's issueKey MUST exist there.
//   not verified → 401 signed out / 403 no location or revoked.
//   wrong seat   → 403. Their saved location resolves somewhere else, and the
//                  message says that rather than "verify to post".
//   bad body     → 400. Empty, or over 280.
//
// RESIDENCY IS RE-CHECKED ON EVERY WRITE. resolveResidency() below recomputes the
// location match from the claim on THIS request and ANDs it with the stored row —
// so a voice_residency row on its own grants nothing, and a reader who changes
// their saved ballot location loses the composer on their very next request
// instead of at the next review. The stored row exists to be counted (the file
// prints "N verified neighbors" instead of a fake feed) and to carry a reviewer's
// revocation, which outranks a location that would otherwise match.
//
// NO IDENTITY VENDOR IS LIVE. Slice 1 verifies by consistency check on the
// reader's own saved ballot location — a county the curated map holds and a house
// district that county actually contains. Stripe Identity / Veriff land at
// verifyVendor() in the core and window.PDXVoice.verify() on the client; neither
// is called from this file. There is no upload, no third-party round trip and NO
// CHARGE anywhere in this pass.
//
// NO UID IS STORED. Every voice_* row carries authorHash(uid, seatKey) —
// sha256, truncated, seat-scoped — so rows are stable enough for "one answer per
// person" and for acting on a report, and unlinkable across seats. The verified
// uid never leaves this Function. The hash is never returned to any caller
// either: a take comes back with `mine: true|false` and no author identifier at
// all, so the wire cannot be used to group one person's takes.

import type { Config } from "@netlify/functions";
import { and, count, desc, eq, ne, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  ddDistricts,
  ddIssueKeys,
  voicePollAnswers,
  voicePollOptions,
  voicePolls,
  voiceResidency,
  voiceTakes,
} from "../../db/schema.js";
import { verifyUser, type AuthUser } from "../../db/firebase-auth.js";
import { checkLimits, clientIp, tooManyRequests } from "../lib/rate-limit.js";
import {
  COPY,
  TAKES_CAP,
  TAKE_MAX,
  authorHash,
  composerState,
  decideAnswer,
  decideTake,
  isSeatAlias,
  neighborLine,
  normalizeSeatKey,
  pollCountLine,
  pollCounts,
  residencyClaim,
  seatFromLocation,
  seatPath,
  voiceShipped,
} from "../lib/district-voice-core.mjs";

// ── Helpers ──────────────────────────────────────────────────────────────────
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// The seat, as the DATABASE has it, or null — and the alias is normalized before
// the query, so Postgres only ever sees the canonical key and there is exactly one
// row per place. `voiceShipped` is ANDed in because a seat that is mapped but has
// no Voice yet is honestly no place rather than an empty feed.
async function resolveSeat(raw: unknown) {
  const seatKey = normalizeSeatKey(raw);
  if (!seatKey || !voiceShipped(seatKey)) return null;
  const [row] = await db
    .select({
      seatKey: ddDistricts.districtId,
      state: ddDistricts.state,
      seatClass: ddDistricts.seatKey,
      districtNumber: ddDistricts.districtNumber,
      label: ddDistricts.label,
    })
    .from(ddDistricts)
    .where(eq(ddDistricts.districtId, seatKey));
  return row || null;
}

// The issue key as the shipped vocabulary has it, or ''. dd_issue_keys mirrors
// ISSUE_MAP, so a take cannot name a topic the app ships no issue file for.
async function resolveIssue(issueRaw: unknown) {
  const issueKey = String(issueRaw == null ? "" : issueRaw).trim().toLowerCase();
  if (!issueKey) return "";
  const [row] = await db
    .select({ issueKey: ddIssueKeys.issueKey })
    .from(ddIssueKeys)
    .where(eq(ddIssueKeys.issueKey, issueKey));
  return row?.issueKey || "";
}

// The reader's own saved ballot location, as they sent it. Read from the query
// string on a GET and the body on a POST — the same three fields either way, so
// the claim that renders the composer is the claim the write is judged on.
function locationClaim(src: any) {
  const s = src || {};
  return {
    state: s.state == null ? "" : String(s.state),
    county: s.county == null ? "" : String(s.county),
    houseDistrict: s.houseDistrict == null ? "" : String(s.houseDistrict),
  };
}

// THE CLAIM. Stored row AND live location, resolved together, for one seat.
// Returns what the gate consumes plus the author hash the write needs.
async function resolveResidency(viewer: AuthUser | null, seatKey: string, claim: any) {
  const hash = viewer && !viewer.isAnonymous ? authorHash(viewer.uid, seatKey) : "";
  let row: { status: string; method: string } | null = null;
  if (hash) {
    const [found] = await db
      .select({ status: voiceResidency.status, method: voiceResidency.method })
      .from(voiceResidency)
      .where(and(eq(voiceResidency.seatKey, seatKey), eq(voiceResidency.authorHash, hash)));
    row = found || null;
  }
  // Recomputed from THIS request every time. Never cached, never trusted from a
  // previous one.
  const locationSeatKey = seatFromLocation(locationClaim(claim));
  return { hash, residency: residencyClaim(viewer, row, locationSeatKey, seatKey) };
}

// A successful location match is RECORDED so the seat can print how many verified
// neighbours it has. Recording is not what grants the next write — the check above
// is — and a revoked row is never resurrected by it (`ne(status,'revoked')` on the
// update, plus the gate refuses revoked long before this runs).
async function noteResidency(seatKey: string, hash: string) {
  if (!seatKey || !hash) return;
  await db
    .insert(voiceResidency)
    .values({ seatKey, authorHash: hash, status: "verified", method: "location_match" })
    .onConflictDoNothing({ target: [voiceResidency.seatKey, voiceResidency.authorHash] });
  await db
    .update(voiceResidency)
    .set({ status: "verified", method: "location_match" })
    .where(
      and(
        eq(voiceResidency.seatKey, seatKey),
        eq(voiceResidency.authorHash, hash),
        ne(voiceResidency.status, "revoked")
      )
    );
}

// The seat's ONE live poll, its options in their own order, and one integer per
// option. Counts are grouped at read time — no stored total, so nothing can drift
// out of step with the rows. No proportion is computed here or anywhere.
async function resolvePoll(seatKey: string, hash: string) {
  const [poll] = await db
    .select({
      id: voicePolls.id,
      seatKey: voicePolls.seatKey,
      issueKey: voicePolls.issueKey,
      question: voicePolls.question,
      active: voicePolls.active,
    })
    .from(voicePolls)
    .where(and(eq(voicePolls.seatKey, seatKey), eq(voicePolls.active, true)));
  if (!poll) return null;

  const options = await db
    .select({ optionKey: voicePollOptions.optionKey, label: voicePollOptions.label })
    .from(voicePollOptions)
    .where(eq(voicePollOptions.pollId, poll.id))
    .orderBy(voicePollOptions.sortOrder, voicePollOptions.id);

  const rows = await db
    .select({ optionKey: voicePollAnswers.optionKey, count: count() })
    .from(voicePollAnswers)
    .where(eq(voicePollAnswers.pollId, poll.id))
    .groupBy(voicePollAnswers.optionKey);

  let mine = "";
  if (hash) {
    const [own] = await db
      .select({ optionKey: voicePollAnswers.optionKey })
      .from(voicePollAnswers)
      .where(and(eq(voicePollAnswers.pollId, poll.id), eq(voicePollAnswers.authorHash, hash)));
    mine = own?.optionKey || "";
  }

  const tally = pollCounts(options, rows);
  return { poll, options, tally, mine };
}

// The poll as it goes on the wire. `counts` and `answered` are integers and
// `countLine` is a sentence made of integers and labels — there is no percentage,
// no bar fill, no leader and no winner field for a client to draw as a grade.
function pollBlock(resolved: any) {
  if (!resolved) return null;
  const { poll, tally, mine } = resolved;
  return {
    id: poll.id,
    issueKey: poll.issueKey,
    question: poll.question,
    options: tally.counts,
    answered: tally.answered,
    countLine: pollCountLine(tally),
    myAnswer: mine || null,
    heading: COPY.pollHd,
    countsLabel: COPY.pollCounts,
  };
}

// Newest first, twenty, and no author identifier on the wire. `mine` is computed
// server-side by comparing hashes so a reader can see their own take without the
// response carrying anything that could group somebody else's.
async function resolveTakes(seatKey: string, hash: string) {
  const rows = await db
    .select({
      id: voiceTakes.id,
      issueKey: voiceTakes.issueKey,
      body: voiceTakes.body,
      createdAt: voiceTakes.createdAt,
      authorHash: voiceTakes.authorHash,
    })
    .from(voiceTakes)
    .where(eq(voiceTakes.seatKey, seatKey))
    .orderBy(desc(voiceTakes.createdAt), desc(voiceTakes.id))
    .limit(TAKES_CAP);
  return rows.map((r) => ({
    id: r.id,
    issueKey: r.issueKey,
    body: r.body,
    createdAt: r.createdAt,
    mine: !!hash && r.authorHash === hash,
  }));
}

async function countNeighbors(seatKey: string) {
  const [row] = await db
    .select({ n: count() })
    .from(voiceResidency)
    .where(and(eq(voiceResidency.seatKey, seatKey), eq(voiceResidency.status, "verified")));
  return Number(row?.n || 0);
}

// ── GET / — the seat file, open to everybody ─────────────────────────────────
// No token required and none demanded. A signed-out reader gets the seat, the
// question, the counts, every take, the neighbour count, and a plain sentence
// saying why they cannot post yet.
async function readSeat(req: Request, url: URL): Promise<Response> {
  const raw = url.searchParams.get("seat") || "";
  const seat = await resolveSeat(raw);
  if (!seat) {
    return json({ error: COPY.noSeat, code: "no_seat" }, 404);
  }

  const viewer = await verifyUser(req);
  const { hash, residency } = await resolveResidency(viewer, seat.seatKey, {
    state: url.searchParams.get("state"),
    county: url.searchParams.get("county"),
    houseDistrict: url.searchParams.get("houseDistrict"),
  });

  const [resolvedPoll, takes, neighbors] = await Promise.all([
    resolvePoll(seat.seatKey, hash),
    resolveTakes(seat.seatKey, hash),
    countNeighbors(seat.seatKey),
  ]);

  const composer = composerState(residency, seat.seatKey);

  return json({
    seat: {
      seatKey: seat.seatKey,
      // The canonical address, always — a reader who arrived on the alias is
      // handed the real URL to stand at rather than a second one to share.
      path: seatPath(seat.seatKey),
      alias: isSeatAlias(raw),
      state: seat.state,
      seatClass: seat.seatClass,
      districtNumber: seat.districtNumber,
      label: seat.label,
    },
    // The required frame line travels with the payload so the block cannot render
    // without it.
    copy: {
      kick: COPY.kick,
      frame: COPY.frame,
      takesHd: COPY.takesHd,
      takesNote: COPY.takesNote,
      weekHd: COPY.weekHd,
      weekNone: COPY.weekNone,
      emptyTakes: COPY.emptyTakes,
    },
    poll: pollBlock(resolvedPoll),
    takes,
    // Honest empty: a sentence, not a placeholder row and not a fake feed.
    takesEmpty: takes.length ? "" : COPY.emptyTakes,
    neighbors: { verified: neighbors, line: neighborLine(neighbors) },
    voice: { canPost: composer.canPost, reason: composer.reason, note: composer.note },
    limits: { takeMax: TAKE_MAX, takesCap: TAKES_CAP },
  });
}

// ── POST /take ───────────────────────────────────────────────────────────────
async function writeTake(req: Request): Promise<Response> {
  let payload: any;
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }

  const seat = await resolveSeat(payload?.seat);
  const issueKey = await resolveIssue(payload?.issueKey);
  const viewer = await verifyUser(req);
  const seatKey = seat?.seatKey || "";

  const { hash, residency } = seatKey
    ? await resolveResidency(viewer, seatKey, payload)
    : { hash: "", residency: null };

  // THE GATE. One pure call over resolved inputs; this file does not re-decide
  // any part of it.
  const verdict = decideTake({
    seat,
    issueKey,
    issueOk: !!issueKey,
    residency,
    body: payload?.body,
  });
  if (!verdict.ok) {
    return json({ error: verdict.message, code: verdict.code }, verdict.status);
  }
  if (!hash) {
    // Unreachable through the gate (verified implies a signed-in uid); refused
    // rather than defaulted, because a row with no author is not a take.
    return json({ error: COPY.closedSignedOut, code: "signed_out" }, 401);
  }

  await noteResidency(seatKey, hash);

  const [row] = await db
    .insert(voiceTakes)
    .values({
      seatKey: verdict.seatKey,
      issueKey: verdict.issueKey,
      body: verdict.body,
      authorHash: hash,
    })
    .returning({
      id: voiceTakes.id,
      issueKey: voiceTakes.issueKey,
      body: voiceTakes.body,
      createdAt: voiceTakes.createdAt,
    });

  return json({ take: { ...row, mine: true } }, 201);
}

// ── POST /poll — answer the seat's one live question ─────────────────────────
// Gated on exactly what posting is gated on, by the same claim, so an answer from
// somebody who does not live here is impossible for the same reason a take from
// them is. Takes no body: a comment is not a vote, and no answer is ever inferred
// from a take's text.
async function answerPoll(req: Request): Promise<Response> {
  let payload: any;
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }

  const seat = await resolveSeat(payload?.seat);
  const viewer = await verifyUser(req);
  const seatKey = seat?.seatKey || "";

  const { hash, residency } = seatKey
    ? await resolveResidency(viewer, seatKey, payload)
    : { hash: "", residency: null };

  const resolved = seatKey ? await resolvePoll(seatKey, hash) : null;
  const pollForGate = resolved
    ? {
        id: resolved.poll.id,
        seatKey: resolved.poll.seatKey,
        active: resolved.poll.active === true,
        options: resolved.options,
      }
    : null;

  const verdict = decideAnswer({
    seat,
    poll: pollForGate,
    residency,
    optionKey: payload?.optionKey,
  });
  if (!verdict.ok) {
    return json({ error: verdict.message, code: verdict.code }, verdict.status);
  }
  if (!hash) {
    return json({ error: COPY.closedSignedOut, code: "signed_out" }, 401);
  }

  await noteResidency(seatKey, hash);

  // One answer per person per poll: the upsert targets the unique index, so
  // changing an answer REPLACES it and a count can never double-count anybody.
  await db
    .insert(voicePollAnswers)
    .values({ pollId: verdict.pollId, optionKey: verdict.optionKey, authorHash: hash })
    .onConflictDoUpdate({
      target: [voicePollAnswers.pollId, voicePollAnswers.authorHash],
      set: { optionKey: verdict.optionKey, updatedAt: sql`now()` },
    });

  const after = await resolvePoll(seatKey, hash);
  return json({ poll: pollBlock(after) });
}

export default async (req: Request): Promise<Response> => {
  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/api\/district-voice/, "") || "/";
    const method = req.method.toUpperCase();

    // Writes are rate-limited per person and per address. READS ARE NOT: the seat
    // file is the public record's neighbourhood and throttling it would be
    // throttling the disclosure.
    if (method === "POST") {
      const viewer = await verifyUser(req);
      const decision = await checkLimits("district-voice", [
        { cls: "user", id: viewer?.uid || "", limit: { max: 40, windowSeconds: 3600 } },
        { cls: "ip", id: clientIp(req), limit: { max: 80, windowSeconds: 3600 } },
      ]);
      if (!decision.ok) return tooManyRequests(decision.retryAfter);
    }

    if (path === "/" || path === "") {
      if (method === "GET") return await readSeat(req, url);
      return json({ error: "Method not allowed" }, 405);
    }
    if (path === "/take") {
      if (method === "POST") return await writeTake(req);
      return json({ error: "Method not allowed" }, 405);
    }
    if (path === "/poll") {
      if (method === "POST") return await answerPoll(req);
      return json({ error: "Method not allowed" }, 405);
    }

    return json({ error: "Not found" }, 404);
  } catch (err) {
    console.error("district-voice error", err);
    return json({ error: "Something went wrong." }, 500);
  }
};

export const config: Config = {
  path: ["/api/district-voice", "/api/district-voice/*"],
};
