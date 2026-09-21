// ─────────────────────────────────────────────────────────────────────────────
// District board — COUNTS ONLY, and only for a board seat this pass has opened
// ─────────────────────────────────────────────────────────────────────────────
// ONE QUESTION, ANSWERED IN INTEGERS: how many people are in a district's room?
// The reader page at /district/ut-sd-3 prints three numbers and a per-issue
// tally, and this is where all four come from. There is no other source: the
// page is forbidden from composing a headcount out of anything it holds
// locally, because a headcount composed on the client is a headcount invented
// on the client.
//
// ── WHAT IT RETURNS, AND WHY EVERY FIELD IS A PAIR ──────────────────────────
// Every count comes back beside a `stores` flag saying whether a store for that
// fact EXISTS at all. The two answers are different and a reader deserves to be
// told which one they are looking at:
//
//   counts.verified = 0, stores.verified = true   → the store is open and holds
//                                                   nobody in this seat yet.
//   counts.stance   = 0, stores.stance   = false  → there is no district-scoped
//                                                   stance store to count. The
//                                                   page says so in the money
//                                                   lane's grammar of absence —
//                                                   "on hand", never "yet".
//
// A failed read is a THIRD answer and it is never dressed as a zero: the
// handler returns 503 with no `counts` object at all, and the page prints that
// it could not read the room rather than printing 0 verified residents.
//
// ── DISTINCT PEOPLE, PER STORE, AND THE ONE THING THAT IS NOT PROMISED ──────
// Each figure is a COUNT DISTINCT over that store's own person column, then
// summed across stores. The stores do not share an identity space — voice_*
// rows carry a seat-scoped sha256 authorHash and dd_* rows carry a Firebase
// uid — so one human active in both would be counted twice and there is no
// honest way from here to notice. Both are 0 in this seat today, which is why
// the sum is acceptable rather than merely convenient; if a board ever fills,
// this is the line that has to be revisited before the number is published as
// "people".
//
// ── NO NAME, NO ADDRESS, NO EMAIL, NO UID, NO PID ───────────────────────────
// Nothing but integers and issue keys crosses this wire. No row is selected,
// only aggregated: there is no statement in this file that can return an
// author_hash, a user_id, a body, a county or a date, so a client cannot
// reconstruct a person from what it is handed even by accident.
//
// ── WHAT THIS FILE CANNOT REACH ─────────────────────────────────────────────
// It imports EIGHT tables and every one of them is a district-participation
// table: voice_residency, voice_polls, voice_poll_answers, voice_takes,
// dd_residency, dd_threads, dd_posts, dd_poll_votes. It imports no vr_* table,
// no finance table, no stance table and no pol_* table, so the record engines,
// the money lane and the disclosure tables are unreachable from here rather
// than merely unused. It is GET-only and contains no insert, update or delete —
// the board this serves is read-only, and a read-only surface should be served
// by a Function that could not write if it were asked to.
//
// READS ARE NOT RATE-LIMITED, on the precedent /api/district-voice set: the
// public record's neighbourhood is public, and throttling a count is throttling
// the disclosure.

import type { Config } from "@netlify/functions";
import { and, countDistinct, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  ddPollVotes,
  ddPosts,
  ddResidency,
  ddThreads,
  voicePollAnswers,
  voicePolls,
  voiceResidency,
  voiceTakes,
} from "../../db/schema.js";

// ── THE SEAT ALLOW-LIST, AND IT IS NOT A WILDCARD ───────────────────────────
// FOUR ENTRIES, because four boards have opened. A seat key that is not on this
// list gets 404 rather than a row of zeroes: "nobody is here" and "there is no
// here" are different sentences, and answering the second with the first would
// let this endpoint publish an empty room for every district in the country.
//
// IT GREW BY ROWS AND NOT BY A PATTERN. There is no `^ut-statehouse-\d+$` here
// and there never should be: the regex form of this list would answer for all
// 75 Utah House districts, 71 of which have no document, no reader and no room.
// Every query below is keyed by the seat string alone, so the same three
// aggregates serve every row without a per-seat branch anywhere in this file —
// adding the fifth board is one row here and nothing else.
//
// THE ALIAS IS NORMALIZED BEFORE THE QUERY, so Postgres only ever sees the
// canonical key — ut-cd-2 and ut-house-2 are one place, exactly as
// district-voice-core.mjs already has it for /d/<seat-key>. The client copy of
// this list lives in district-board.js (derived there from its BOARDS table)
// and scripts/test-district-voice-sd3.mjs pins the two equal.
const BOARD_SEATS: Record<string, 1> = {
  "ut-statesenate-3": 1,
  "ut-statehouse-16": 1,
  "ut-statesenate-7": 1,
  "ut-house-2": 1,
};
const SEAT_KEY_RE = /^[a-z]{2}-(?:house|statesenate|statehouse)-[1-9][0-9]*$/;
const ALIAS_CHAMBERS: Record<string, string> = {
  hd: "statehouse",
  sd: "statesenate",
  cd: "house",
};

function normalizeSeatKey(raw: unknown): string {
  const s = String(raw == null ? "" : raw).trim().toLowerCase();
  if (!s) return "";
  if (SEAT_KEY_RE.test(s)) return s;
  const m = /^([a-z]{2})-(hd|sd|cd)-([1-9][0-9]*)$/.exec(s);
  if (!m) return "";
  const out = `${m[1]}-${ALIAS_CHAMBERS[m[2]]}-${m[3]}`;
  return SEAT_KEY_RE.test(out) ? out : "";
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
      // A count is public and cheap to be a minute stale. Short enough that a
      // board filling up is visible within a coffee break, long enough that a
      // shared link does not become a query per reader.
      "cache-control": "public, max-age=60",
    },
  });
}

// One integer, or 0. Every aggregate below goes through this so a store that is
// empty and a store whose aggregate came back null are the same answer.
function n(row: { v: unknown } | undefined): number {
  const v = Number(row?.v ?? 0);
  return Number.isFinite(v) && v > 0 ? v : 0;
}

// ── VERIFIED RESIDENTS ON FILE ──────────────────────────────────────────────
// Two stores hold a residency claim for a district and both are asked. Only
// rows a reviewer actually marked 'verified' are counted: a pending claim is
// somebody who asked, not somebody who is on file, and counting it would
// inflate the one number on this page that is supposed to mean something.
async function countVerified(seat: string): Promise<number> {
  const [voice] = await db
    .select({ v: countDistinct(voiceResidency.authorHash) })
    .from(voiceResidency)
    .where(and(eq(voiceResidency.seatKey, seat), eq(voiceResidency.status, "verified")));
  const [dd] = await db
    .select({ v: countDistinct(ddResidency.userId) })
    .from(ddResidency)
    .where(and(eq(ddResidency.districtKey, seat), eq(ddResidency.status, "verified")));
  return n(voice) + n(dd);
}

// ── PEOPLE WHO TOUCHED A POLL OR A COMMENT ──────────────────────────────────
// Four stores, all of them district- or seat-scoped, all of them asked for
// distinct authors rather than rows: a person who answered a poll twice is one
// person. Takes and posts are both "a comment" for the purposes of this count,
// because the reader-facing question is "has anyone said anything here", and
// the two stores are two slices of the same product.
async function countParticipants(seat: string): Promise<number> {
  const [answers] = await db
    .select({ v: countDistinct(voicePollAnswers.authorHash) })
    .from(voicePollAnswers)
    .innerJoin(voicePolls, eq(voicePollAnswers.pollId, voicePolls.id))
    .where(eq(voicePolls.seatKey, seat));
  const [takes] = await db
    .select({ v: countDistinct(voiceTakes.authorHash) })
    .from(voiceTakes)
    .where(eq(voiceTakes.seatKey, seat));
  const [votes] = await db
    .select({ v: countDistinct(ddPollVotes.userId) })
    .from(ddPollVotes)
    .where(eq(ddPollVotes.districtKey, seat));
  const [posts] = await db
    .select({ v: countDistinct(ddPosts.userId) })
    .from(ddPosts)
    .innerJoin(ddThreads, eq(ddPosts.threadId, ddThreads.id))
    .where(eq(ddThreads.districtId, seat));
  return n(answers) + n(takes) + n(votes) + n(posts);
}

// ── THE PER-ISSUE TALLY BAND 3 PRINTS ───────────────────────────────────────
// One row per issue key this district has any activity under, and NOTHING for
// an issue with none — the page prints 0 against its own list of measures, so a
// zero row here would be a second way to say the same thing. `polls` counts
// people who answered, `comments` counts people who wrote; neither is a
// proportion, a majority or a mood, and no field here combines them.
async function issueTally(seat: string) {
  const out = new Map<string, { issueKey: string; polls: number; comments: number }>();
  const row = (key: string) => {
    let r = out.get(key);
    if (!r) { r = { issueKey: key, polls: 0, comments: 0 }; out.set(key, r); }
    return r;
  };

  const pollAnswers = await db
    .select({ issueKey: voicePolls.issueKey, v: countDistinct(voicePollAnswers.authorHash) })
    .from(voicePollAnswers)
    .innerJoin(voicePolls, eq(voicePollAnswers.pollId, voicePolls.id))
    .where(eq(voicePolls.seatKey, seat))
    .groupBy(voicePolls.issueKey);
  for (const r of pollAnswers) row(String(r.issueKey)).polls += n(r);

  const ddVotes = await db
    .select({ issueKey: ddPollVotes.issueKey, v: countDistinct(ddPollVotes.userId) })
    .from(ddPollVotes)
    .where(eq(ddPollVotes.districtKey, seat))
    .groupBy(ddPollVotes.issueKey);
  for (const r of ddVotes) row(String(r.issueKey)).polls += n(r);

  const takes = await db
    .select({ issueKey: voiceTakes.issueKey, v: countDistinct(voiceTakes.authorHash) })
    .from(voiceTakes)
    .where(eq(voiceTakes.seatKey, seat))
    .groupBy(voiceTakes.issueKey);
  for (const r of takes) row(String(r.issueKey)).comments += n(r);

  const posts = await db
    .select({ issueKey: ddThreads.issueKey, v: countDistinct(ddPosts.userId) })
    .from(ddPosts)
    .innerJoin(ddThreads, eq(ddPosts.threadId, ddThreads.id))
    .where(eq(ddThreads.districtId, seat))
    .groupBy(ddThreads.issueKey);
  for (const r of posts) row(String(r.issueKey)).comments += n(r);

  return [...out.values()];
}

export default async (req: Request): Promise<Response> => {
  if (req.method.toUpperCase() !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  let seat = "";
  try {
    seat = normalizeSeatKey(new URL(req.url).searchParams.get("seat") || "");
  } catch (e) {
    seat = "";
  }
  if (!seat || !Object.prototype.hasOwnProperty.call(BOARD_SEATS, seat)) {
    return json({ error: "No board at that address.", code: "no_seat" }, 404);
  }

  try {
    const [verified, participants, rooms] = await Promise.all([
      countVerified(seat),
      countParticipants(seat),
      issueTally(seat),
    ]);
    return json({
      seat,
      counts: {
        verified,
        // NO STORE, AND THAT IS THE HONEST FIELD RATHER THAN A QUERY THAT
        // GUESSES. A saved position lives in pdx_my_stances_v1 on the reader's
        // own device; the only server copy is pdx_snapshots, which is one
        // private blob per account with no district on it. There is nothing to
        // count here without either inventing a district for a stranger or
        // reading other people's snapshots, and this pass will do neither. The
        // page pairs this 0 with `stores.stance: false` and says out loud that
        // no such record is on hand.
        stance: 0,
        participants,
      },
      stores: { verified: true, stance: false, participants: true },
      rooms,
    });
  } catch (err) {
    console.error("district-board error", err);
    // NOT A ZERO. See the header: a read that failed must not be printed as a
    // room with nobody in it.
    return json({ error: "Could not read the room right now.", code: "unread" }, 503);
  }
};

export const config: Config = {
  path: "/api/district-board",
};
