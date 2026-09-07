// ─────────────────────────────────────────────────────────────────────────────
// District Room core — the gate, and nothing that needs a database
// ─────────────────────────────────────────────────────────────────────────────
// PHASE 1 OF THE DISTRICT ROOM ships one reader-facing surface: verified-
// residency neighbours in ONE district, talking about ONE issue. The schema for
// it landed in phase 0 (db/schema.ts, the dd_* tables). This file is the half of
// phase 1 that has no Postgres in it — the ADDRESS SHAPE, the COPY, and above
// all THE WRITE GATE — split out for the same reason rate-limit-core.mjs was:
// everything a "fail closed" claim can get subtly wrong is a pure function over
// four inputs, and none of it needs a branch database to check.
//
// netlify/functions/district-room.mts imports these. scripts/test-district-
// room.mjs imports the same functions and exercises them directly, so the gate
// the suite verifies is literally the gate that ships.
//
// Plain .mjs rather than .ts so the test can import it with no build step —
// the same reason every client module in this repo is plain .js.
//
// ── THE ADDRESS, PICKED ONCE ────────────────────────────────────────────────
// A room's address is /d/<districtKey>/<issueKey>:
//
//   /d/ut-house-2/housing_build        U.S. House Utah 2 · Build more housing
//   /d/ut-statesenate-6/water_storage  Utah State Senate 6 · Water storage
//
// `districtKey` IS dd_districts.district_id — the composed key phase 0 already
// chose (`<state>-<seatKey>-<number>`, Door 2's seat language with the state and
// the number it was always missing around it). `issueKey` IS the ISSUE_MAP key,
// the same identifier /i/<key> already spends. Neither half is a new vocabulary
// and neither is free text: both are foreign keys in phase 0, so a room naming a
// district the app cannot resolve or an issue it does not ship is refused by the
// database and not merely hidden by a caller.
//
// That shape is the ONLY one this pass uses. netlify.toml serves it (a 200
// rewrite to index.html, exactly as /i/*, /p/* and /b/* are served), the client
// module district-room.js owns building and parsing it, and every mount links
// through that one owner rather than concatenating a path of its own.
//
// ── WHAT THIS FILE DOES NOT DO ──────────────────────────────────────────────
// No ranking, no score, no reaction, no reply tally, no party token, no caucus
// and no "team" language. Nothing here is read by the formal record (vr_*), the
// evidence exchange (cee_*), the open forum (pdx_forum_*), Direction Match, Word
// vs Action, the finance lane, Mandate scoring, the Eye, the Utah ingest or the
// offline pack, and no count from a room ever reaches a person file. A room is
// not a comment thread on a politician: nothing in this module takes, stores or
// emits a pid.

// ── SHAPES ──────────────────────────────────────────────────────────────────
// Both are pre-flight checks, not the authority. The authority is the phase 0
// foreign key: a well-shaped key that names no row is still refused. These exist
// so a malformed address is a cheap 404 instead of a round trip, and so the
// client and the Function agree on what is even worth asking about.
//
// The district shape mirrors the phase 0 CHECK constraints: two-letter state,
// one of the three geometric seat classes (statewide and local seats carry no
// district, so they have nothing to be a room about), and a positive number with
// no leading zero.
export const DISTRICT_KEY_RE = /^[a-z]{2}-(?:house|statesenate|statehouse)-[1-9][0-9]*$/;
// dd_issue_keys' own shape check, spelled the same way.
export const ISSUE_KEY_RE = /^[a-z0-9_]+$/;

// The room's address, built in one place. Returns '' rather than a half-formed
// path for anything that is not a valid pair — a caller that cannot be given an
// address must render no link at all.
export const ROOM_PREFIX = "/d/";
export const ROOM_PATH_RE = /^\/d\/([^/]+)\/([^/]+)\/?$/;

export function roomPath(districtKey, issueKey) {
  const d = String(districtKey == null ? "" : districtKey).trim();
  const i = String(issueKey == null ? "" : issueKey).trim();
  if (!DISTRICT_KEY_RE.test(d) || !ISSUE_KEY_RE.test(i)) return "";
  return `${ROOM_PREFIX}${d}/${i}`;
}

export function roomFromPath(pathname) {
  const m = String(pathname == null ? "" : pathname).match(ROOM_PATH_RE);
  if (!m) return null;
  let d = m[1];
  let i = m[2];
  try { d = decodeURIComponent(d); } catch { /* keep the raw segment */ }
  try { i = decodeURIComponent(i); } catch { /* keep the raw segment */ }
  if (!DISTRICT_KEY_RE.test(d) || !ISSUE_KEY_RE.test(i)) return null;
  return { districtKey: d, issueKey: i };
}

// ── COPY ────────────────────────────────────────────────────────────────────
// The room's sentences live here, not in the stylesheet's neighbourhood and not
// in two places. The Function returns them and the client prints them, so the
// note a reader sees for "you cannot post here" is the same string the server
// used to decide they could not — a UI that says one thing while the gate
// enforces another is the failure this arrangement exists to make impossible.
// The test pins every one of these against district-room.js.
export const COPY = {
  // The header's third line. No party, no score, no Direction Match, no
  // politician: what the room IS, in the room's own words.
  strap: "Neighbors in this district, this issue.",
  // The honest empty room. A room with nothing in it says so.
  empty: "No neighbor posts on this issue in this district yet.",
  // The closed composer. Short, and it names the one thing that would open it.
  closed: "Verify you live in this district to post.",
  // Why it is closed in this pass specifically. Said out loud rather than
  // implied, because "verify" reads like an invitation and there is nothing to
  // accept yet — see RESIDENCY IS A STUB below.
  closedStub:
    "Residency checks are not switched on yet, so nobody can post in this pass. " +
    "Reading is open.",
  // The badge on every post. Lowercase because it sits inline beside a
  // timestamp; it is an attestation about the author's district and nothing else
  // — no handle, no name, no party, no score.
  badge: "verified in this district",
  // The flag control and what it honestly promises today.
  flag: "Report",
  flagRecorded: "Reported. This records your intent; review comes later.",
};

// ── THE POST BODY ───────────────────────────────────────────────────────────
// One person's sentence. Trimmed, collapsed only on the whitespace a paste
// brings, and capped. `normalizeBody` returns '' for anything that is not real
// text, and '' is refused by the gate below — that is the whole of the "empty
// body → no write" rule, so there is no second opinion about what empty means.
export const BODY_MAX = 2000;

export function normalizeBody(v) {
  if (typeof v !== "string") return "";
  return v.replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n").trim().slice(0, BODY_MAX);
}

// An optional link a neighbour dropped in. It carries NO weight: it is not
// evidence, it is not graded against EVIDENCE_STRENGTH.md, it promotes nothing
// into the Evidence Locker and the formal record never reads it. Restricted to
// http(s) so the column cannot hold a javascript: or data: URL that a future
// renderer might trust.
export function normalizeSourceUrl(v) {
  if (typeof v !== "string") return null;
  const s = v.trim().slice(0, 500);
  if (!s) return null;
  if (!/^https?:\/\/[^\s]+$/i.test(s)) return null;
  return s;
}

// ── RESIDENCY IS A STUB IN THIS PASS, AND IT CANNOT PUBLISH ─────────────────
// The brief for phase 1 is explicit: do not invent an ID vendor here. So this is
// not a residency check wearing a TODO — it is a resolver that returns
// "unverified" for every caller, on purpose, and the room's composer is closed
// for everybody because of it.
//
// WHAT ALREADY EXISTS AND WHAT DOES NOT. Identity exists: db/firebase-auth.ts
// verifies a Firebase ID token server-side, and /api/community, /api/threads and
// /api/forum have authenticated callers with it for a while. RESIDENCY does not
// exist anywhere in this repo — the only location signal the app holds is
// window._currentVoterLocation, which a reader types or pins themselves. A
// self-declared address is not a verified one, and treating it as one would make
// "verified in this district" a badge the app cannot honour. So it is not read
// here, and no code path in this pass can produce verified:true.
//
// WHERE THE VERIFIER LANDS. Here, and only here. A real check returns
// { verified: true, districtKey: '<dd_districts.district_id>' } and NOTHING else
// in the room changes: decideWrite() already compares that key against the room
// the caller is posting into, the Function already refuses a mismatch, and the
// client already renders the closed note whenever canPost is false.
export const RESIDENCY_VERIFIER = null; // no vendor is wired in this pass

export function residencyClaim(user) {
  if (!user || user.isAnonymous) {
    return { verified: false, districtKey: null, reason: "signed_out" };
  }
  // Signed in, and that is all we know. A verifier would answer here.
  return { verified: false, districtKey: null, reason: "no_verifier" };
}

// ── THE GATE ────────────────────────────────────────────────────────────────
// One pure function, and every refusal the room has. It takes RESOLVED inputs —
// the district row the database actually returned (or null), the issue key the
// vocabulary actually holds (or null), the caller's residency claim, and the
// body — so "no district" here means "no such room", not "the caller forgot a
// query parameter".
//
// FAIL CLOSED MEANS THE DEFAULT IS NO. The checks are ordered so that the
// cheapest and most structural refusal wins, and there is no branch that falls
// through to allowed: the function returns an allow only after all five
// conditions are affirmatively true.
//
//   1. no district      → no write   (unmapped, malformed, or no such row)
//   2. no issue         → no write   (not in the shipped ISSUE_MAP vocabulary)
//   3. not verified     → no write   (signed out, anonymous, or no verifier)
//   4. wrong district   → no write   (verified somewhere else)
//   5. empty body       → no write
//
// `code` is for the client and the test; `message` is what a reader sees.
export function decideWrite(input) {
  const inp = input || {};
  const district = inp.district || null;
  const issueKey = typeof inp.issueKey === "string" ? inp.issueKey : "";
  const residency = inp.residency || null;
  const body = normalizeBody(inp.body);

  const districtKey = district && typeof district.districtKey === "string"
    ? district.districtKey
    : "";

  // 1. The room's district. A district the app does not map has no room, and a
  //    write with no district is the case the brief names first.
  if (!districtKey || !DISTRICT_KEY_RE.test(districtKey)) {
    return {
      ok: false,
      status: 404,
      code: "no_district",
      message: "We don't map that district, so there is no room for it.",
    };
  }

  // 2. The room's issue. Same rule, other vocabulary.
  if (!issueKey || !ISSUE_KEY_RE.test(issueKey)) {
    return {
      ok: false,
      status: 404,
      code: "no_issue",
      message: "We don't have an issue by that name.",
    };
  }

  // 3. Residency. Signed out and signed-in-but-unverified are the same answer to
  //    the room and a different answer to the reader, so the code splits and the
  //    sentence does not: both are told the one thing that would open the
  //    composer.
  if (!residency || residency.verified !== true) {
    const signedOut = !residency || residency.reason === "signed_out";
    return {
      ok: false,
      status: signedOut ? 401 : 403,
      code: signedOut ? "signed_out" : "not_verified",
      message: COPY.closed,
    };
  }

  // 4. Verified — somewhere. A neighbour verified in UT-1 is not a neighbour
  //    here, and a room that accepted them would be showing a district posts
  //    from another district, which is the one thing this surface must never do.
  if (String(residency.districtKey || "") !== districtKey) {
    return {
      ok: false,
      status: 403,
      code: "wrong_district",
      message: "You're verified in a different district, so you can read here but not post.",
    };
  }

  // 5. The sentence itself.
  if (!body) {
    return {
      ok: false,
      status: 400,
      code: "empty_body",
      message: "Write something first.",
    };
  }

  return { ok: true, districtKey, issueKey, body, sourceUrl: normalizeSourceUrl(inp.sourceUrl) };
}

// Whether the composer may be RENDERED at all — the read-side twin of the gate
// above, taking the same residency claim so the UI and the write path cannot
// disagree about who is allowed to type. It returns the note as well as the
// verdict, so a closed composer always carries the reason it is closed.
export function composerState(residency, districtKey) {
  const d = String(districtKey || "");
  if (residency && residency.verified === true && String(residency.districtKey || "") === d) {
    return { canPost: true, note: "" };
  }
  // Not verified for THIS district. In this pass that is everybody, so the note
  // says both things: what would open it, and that nothing can open it yet.
  const note = RESIDENCY_VERIFIER ? COPY.closed : `${COPY.closed} ${COPY.closedStub}`;
  return { canPost: false, note };
}
