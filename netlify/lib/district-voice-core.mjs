// ─────────────────────────────────────────────────────────────────────────────
// district-voice-core.mjs — District Voice's whole gate, as pure functions
// ─────────────────────────────────────────────────────────────────────────────
// WHAT DISTRICT VOICE IS. A belonging layer, Utah-first: one PLACE per seat where
// a verified neighbour can (1) see who sits in that seat, (2) answer ONE live
// poll on an issue that seat actually touches, and (3) post ONE short take keyed
// to an existing ISSUE_MAP key. That is the whole product, and every limit in
// this file falls out of it.
//
// WHAT IT IS NOT, AND THESE ARE LOAD-BEARING:
//   · NOT A SCORE. Nothing here computes, stores or returns a number that stands
//     for a person or a place. There is no composite, no average, no index and no
//     "district mood" — the poll publishes one integer per option and stops.
//   · NOT A THIRD MATCH. No percent sign appears in any value this module
//     computes or any string it returns.
//     Direction Match, Word vs Action and Finance Public Integrity are untouched
//     by everything in this file; Voice reads none of them and writes none of
//     them.
//   · NOT A COMMENT SECTION ON A PROFILE. No pid is read, stored or returned by
//     any function below. A take belongs to a SEAT, and a seat is a place.
//   · NOT A STATEWIDE BOARD. Every read and every write below is scoped to one
//     seat key. There is no function here that takes two seats or none.
//
// READ IS FREE, VOICE IS GATED. The public record stays ungated: a signed-out
// visitor with no account, no location and no residency reads the seat, the poll's
// counts and every take. Only the two WRITES are gated, and they are gated on the
// same claim, by the same function, so "who may answer" and "who may post" cannot
// drift apart.
//
// ── THE SEAT KEY, AND WHY THERE IS ONLY ONE DISTRICT MAP ────────────────────
// The canonical spelling is the one dd_districts already seeds and the district
// file already ships: 'ut-statehouse-68'. `ut-hd-68` is accepted as an ALIAS and
// normalized to it by normalizeSeatKey() — one place, one row, one address, two
// spellings of the same string. No second district map is introduced here: this
// module invents no district, holds no boundary, and its county table below is
// read out of the curated area table Door 2 already resolves a reader's own seat
// from.
//
// ── VERIFICATION IN SLICE 1, STATED HONESTLY ────────────────────────────────
// The only location signal this app holds is window._currentVoterLocation — a
// county and a district the reader chose themselves. That is NOT an identity
// check and this module never calls it one. What it is is a datum that can be
// CHECKED FOR CONSISTENCY, and that is exactly what seatFromLocation() does: the
// county must be one the curated map holds, and the house district must be one
// that county actually contains. So a reader cannot reach HD-68 by pairing Salt
// Lake County with 68 (that county does not contain it), and a reader in Duchesne
// County resolves to HD-67 and is refused HD-68 by name.
//
// FAIL CLOSED IS THE DEFAULT, NOT A BRANCH. residencyClaim() returns verified
// only after affirmatively resolving a seat, and decideTake()/decideAnswer() have
// no path that falls through to allowed. No location at all is `no_location`:
// read-only, with a sentence that says why.
//
// THE VENDOR SEAM IS UNUSED. Stripe Identity / Veriff land at verifyVendor()
// below and at window.PDXVoice.verify() on the client. Neither is called by
// anything in this repo today: there is no document upload, no third-party round
// trip and NO CHARGE. verifyVendor() throws rather than returning a soft false,
// so wiring a vendor in is a deliberate act and never an accident that quietly
// verifies somebody.
//
// AN AUTHOR HASH, NOT A UID. authorHash() is sha256(uid + ':' + seatKey),
// truncated. Stable for one person in one seat — which is all "one answer per
// person" and "act on a report" need — and different for that person in the next
// seat, so two seats' rows cannot be joined into a profile. The verified uid is
// never stored in a voice_* table.

import crypto from "node:crypto";

// ── THE ADDRESS ─────────────────────────────────────────────────────────────
// The canonical seat key, spelled exactly as dd_districts.district_id spells it
// and exactly as district-room-core.mjs spells DISTRICT_KEY_RE. Voice does not
// widen it.
export const SEAT_KEY_RE = /^[a-z]{2}-(?:house|statesenate|statehouse)-[1-9][0-9]*$/;

// The alias shapes, and they are ALIASES rather than a second vocabulary: each
// one names a chamber the canonical key already has a word for. `ut-hd-68` is
// 'ut-statehouse-68' written short, which is the spelling the brief uses.
export const SEAT_ALIAS_RE = /^([a-z]{2})-(hd|sd|cd)-([1-9][0-9]*)$/;
export const SEAT_ALIAS_CHAMBERS = { hd: "statehouse", sd: "statesenate", cd: "house" };

// Every spelling in, ONE spelling out, or '' for anything that is not a seat.
// Every function in this module and every caller of it starts here, so an alias
// can never reach a query, a row or a response — the database only ever sees the
// canonical key.
export function normalizeSeatKey(raw) {
  const s = String(raw == null ? "" : raw).trim().toLowerCase();
  if (!s) return "";
  if (SEAT_KEY_RE.test(s)) return s;
  const m = SEAT_ALIAS_RE.exec(s);
  if (!m) return "";
  const chamber = SEAT_ALIAS_CHAMBERS[m[2]];
  if (!chamber) return "";
  const out = `${m[1]}-${chamber}-${m[3]}`;
  return SEAT_KEY_RE.test(out) ? out : "";
}

// Was this spelling the alias rather than the canonical one? The client uses this
// to normalize the address bar, so a reader who arrived on /d/ut-hd-68 ends up
// looking at the canonical URL and a shared link is always the canonical one.
export function isSeatAlias(raw) {
  const s = String(raw == null ? "" : raw).trim().toLowerCase();
  return !!s && !SEAT_KEY_RE.test(s) && !!normalizeSeatKey(s);
}

export const SEAT_PREFIX = "/d/";
// One segment. Two segments is the District Room's address and this pattern
// refuses it, exactly as district-file.js refuses it.
export const SEAT_PATH_RE = /^\/d\/([^/]+)\/?$/;

export function seatPath(seatKey) {
  const k = normalizeSeatKey(seatKey);
  return k ? SEAT_PREFIX + k : "";
}

export function seatFromPath(pathname) {
  const m = SEAT_PATH_RE.exec(String(pathname == null ? "" : pathname));
  return m ? normalizeSeatKey(m[1]) : "";
}

// ── ONE DISTRICT SHIPS ──────────────────────────────────────────────────────
// The whole allow-list. HD-68 (Scott Chew's Uintah Basin seat) is the flagship,
// and adding a seat is adding a line here. Every other Utah seat — mapped,
// seeded, perfectly real — has no Voice yet, which is true and is a better answer
// than a poll nobody wrote and a feed nobody posted in.
export const VOICE_SEATS = { "ut-statehouse-68": 1 };

export function voiceShipped(seatKey) {
  const k = normalizeSeatKey(seatKey);
  return !!k && Object.prototype.hasOwnProperty.call(VOICE_SEATS, k);
}

// ── THE SHAPES ──────────────────────────────────────────────────────────────
export const TAKE_MAX = 280;
// Newest first, and twenty. Not a page 2, not a "load more": a seat's Voice is
// the current conversation, and a feed that grows without bound is an archive
// pretending to be one.
export const TAKES_CAP = 20;
// Two to four. One option is not a question and five is a survey.
export const POLL_OPTIONS_MIN = 2;
export const POLL_OPTIONS_MAX = 4;

export const ISSUE_KEY_RE = /^[a-z0-9_]+$/;
export const OPTION_KEY_RE = /^[a-z0-9_]+$/;

// A take's body. Collapses whitespace so a wall of newlines cannot buy somebody
// twenty lines of the feed, then applies the ceiling. Returns '' for anything
// that is not a sentence, which the gate refuses.
export function normalizeTakeBody(v) {
  const s = String(v == null ? "" : v).replace(/\s+/g, " ").trim();
  return s.length > TAKE_MAX ? "" : s;
}

// Was it refused for being too long specifically? The gate says which, because
// "write something first" and "that is over the limit" are different facts and a
// reader who wrote 400 characters deserves the second one.
export function takeBodyTooLong(v) {
  return String(v == null ? "" : v).replace(/\s+/g, " ").trim().length > TAKE_MAX;
}

// ── THE CURATED COUNTY MAP, BORROWED AND NOT INVENTED ───────────────────────
// county → the state house districts that county actually contains. Every pair
// below is read out of KEY_RACES_LOCATIONS in ballot-breakdown.js — the same
// curated area table the ballot already resolves a reader's own seat from — and
// nothing here is a new boundary, a new district or a new map. The 26 districts
// named across these counties are exactly the 26 statehouse rows dd_districts
// seeds, so this table cannot place somebody in a seat the app does not map.
//
// A county spans several districts (Salt Lake County holds five), so the value is
// a LIST and membership is the test. That is what makes the check meaningful in
// both directions: a county that does not contain 68 cannot reach HD-68, and a
// county that does still only reaches the district it named.
export const COUNTY_STATEHOUSE = {
  "salt lake": [22, 30, 36, 42, 45],
  davis: [14, 15],
  weber: [9, 10],
  utah: [52, 57, 62, 63],
  tooele: [28],
  "box elder": [6],
  cache: [3],
  rich: [4],
  morgan: [4],
  summit: [4],
  daggett: [68],
  duchesne: [67],
  uintah: [68],
  carbon: [67],
  emery: [67],
  grand: [69],
  "san juan": [69],
  wasatch: [59],
  juab: [66],
  sanpete: [66],
  millard: [29],
  sevier: [70],
  piute: [70],
  wayne: [69],
  beaver: [70],
  iron: [71],
  garfield: [69],
  washington: [75],
  kane: [69],
};

// "Uintah County" / "uintah" / " UINTAH  County " are one county. Lowercased,
// the word "county" removed, whitespace collapsed — the same normalization
// compare-hub.js's _pdxNormalizeVoterCounty() produces, reduced to its key form.
export function normalizeCounty(v) {
  return String(v == null ? "" : v)
    .toLowerCase()
    .replace(/\bcounty\b/g, " ")
    .replace(/[^a-z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Utah only in this pass, for the reason DISTRICT_MAPS.md gives:
// pdxRepsForMe().districtsResolvable is true in Utah and nowhere else, and
// verifying somebody for a district the app cannot resolve is a confident wrong
// district. Accepts either the postal code or the state name the saved location
// actually stores ('Utah').
export const VOICE_STATES = ["UT"];

export function stateAllowed(state) {
  const s = String(state == null ? "" : state).trim().toLowerCase();
  if (!s) return false;
  if (s === "utah") return true;
  return VOICE_STATES.indexOf(s.toUpperCase()) >= 0;
}

// ── THE LOCATION CHECK ──────────────────────────────────────────────────────
// A saved ballot location in, a canonical seat key out, or '' — and '' is the
// answer for every one of these, all of which are the same to the gate:
//
//   · no location at all
//   · a location outside Utah
//   · a county the curated map does not hold
//   · a house district that county does not contain (the inconsistent claim)
//
// This is a CONSISTENCY CHECK on the reader's own datum and not an identity
// check. It is re-run on every write rather than trusted once, which is why a
// stored residency row cannot outlive the location that produced it.
export function seatFromLocation(loc) {
  const l = loc || {};
  if (!stateAllowed(l.state)) return "";
  const county = normalizeCounty(l.county);
  if (!county) return "";
  const districts = COUNTY_STATEHOUSE[county];
  if (!districts) return "";
  // A district is a positive whole number. The digits are pulled out of whatever
  // spelling the saved location happens to carry — "68", 68, "District 68", "68th"
  // are all the same seat — but a MINUS SIGN is not noise around a number, it is
  // a different number, and stripping it would read -68 as the seat 68.
  const raw = String(l.houseDistrict == null ? "" : l.houseDistrict).trim();
  if (raw.indexOf("-") >= 0) return "";
  const n = parseInt(raw.replace(/[^0-9]/g, ""), 10);
  if (!Number.isFinite(n) || n <= 0) return "";
  if (districts.indexOf(n) < 0) return "";
  return `ut-statehouse-${n}`;
}

// ── RESIDENCY ───────────────────────────────────────────────────────────────
export const RESIDENCY_STATUSES = ["pending", "verified", "revoked"];
// Slice 1 writes 'location_match'. 'vendor' is the reserved value for the ID
// check that is not wired; nothing writes it today.
export const RESIDENCY_METHODS = ["location_match", "vendor"];

export const RESIDENCY_VERIFIER = null; // no vendor is wired in this pass

// THE SEAM, AND IT IS UNUSED. Referenced by nothing in this repo. It throws
// rather than returning a soft false so that wiring Stripe Identity or Veriff in
// is a deliberate act and never an accident that quietly verifies somebody.
export function verifyVendor() {
  throw new Error("district-voice: no identity vendor is wired in this pass");
}

// sha256(uid + ':' + seatKey), truncated to 32 hex characters. Seat-scoped on
// purpose: it is stable for one person in one seat and different for that person
// in the next one, so two seats' rows cannot be joined into a profile. A Firebase
// uid is 28 random characters, so this is not a guessable digest of a small
// space. Returns '' without a uid AND a seat, so a hash can never be computed
// from half an identity.
export function authorHash(uid, seatKey) {
  const u = String(uid == null ? "" : uid).trim();
  const k = normalizeSeatKey(seatKey);
  if (!u || !k) return "";
  return crypto.createHash("sha256").update(`${u}:${k}`).digest("hex").slice(0, 32);
}

// The claim, from the caller, their stored row for THIS seat, and the seat their
// SAVED LOCATION resolves to right now.
//
//   user             the server-verified identity, or null
//   row              voice_residency for (author, this seat), or null
//   locationSeatKey  seatFromLocation(theClaimedLocation) — '' when it did not
//                    resolve, which is not the same as "no location was sent"
//   seatKey          the seat being written to
//
// Returns { verified, seatKey, reason, method }. `seatKey` is the seat the CLAIM
// is good for and never the one that was asked for, so decideTake() compares the
// two and a claim can only ever open the place it was established for.
//
// THE ORDER IS THE PRODUCT RULE. A vendor row is honoured on its own because an
// identity check is about the person and not about what they last typed into the
// ballot. A location match is honoured only while the location still matches —
// both a row and a live match are required — so changing the saved location
// closes the composer on the next request instead of at the next review.
export function residencyClaim(user, row, locationSeatKey, seatKey) {
  const seat = normalizeSeatKey(seatKey);
  const none = { verified: false, seatKey: null, reason: "signed_out", method: null };
  if (!seat) return { ...none, reason: "no_seat" };
  if (!user || !user.uid || user.isAnonymous) return none;

  const r = row || null;
  const status = r && typeof r.status === "string" ? r.status : "";
  const method = r && typeof r.method === "string" ? r.method : "";

  // A revoked row is its own answer and outranks a location that would otherwise
  // match: a reviewer's decision is not overturned by retyping a county.
  if (status === "revoked") {
    return { verified: false, seatKey: null, reason: "revoked", method: method || null };
  }

  // The identity check, when one has ever landed. Not location-dependent.
  if (status === "verified" && method === "vendor") {
    return { verified: true, seatKey: seat, reason: "verified", method: "vendor" };
  }

  const resolved = normalizeSeatKey(locationSeatKey);

  // No usable location at all → read-only, and the copy says why. This is the
  // "fail closed" case the brief names, and it is deliberately NOT dressed up as
  // a refusal: nothing has been established, so nothing is being denied.
  if (!resolved) {
    return { verified: false, seatKey: null, reason: "no_location", method: null };
  }

  // A location that resolves SOMEWHERE ELSE. Its own reason, because "verify to
  // post" would be the wrong sentence for somebody whose location is fine and
  // simply is not here.
  if (resolved !== seat) {
    return { verified: false, seatKey: resolved, reason: "wrong_district", method: null };
  }

  return { verified: true, seatKey: seat, reason: "verified", method: "location_match" };
}

// ── COPY, WITH ONE OWNER ────────────────────────────────────────────────────
// The composer's closed note and the write path's refusal are the same string,
// so a reader is never told one thing by the page and another by the server.
//
// THE BANNED REGISTER, AND NO STRING BELOW IS IN IT: no team loyalty, no mandate
// percentage, no approval rating, and nothing that says the district believes
// anything. Nothing below speaks for the district — a count is a count of the
// people who answered, and the copy says so.
export const COPY = {
  kick: "District Voice",
  // REQUIRED ON THE FILE, verbatim.
  frame: "Verified neighbors. Not a poll of the internet. Not how the member voted.",
  pollHd: "One live question",
  pollCounts: "Answers so far",
  takesHd: "Neighbor takes",
  takesNote: "Newest first. One short take, keyed to an issue this seat touches.",
  weekHd: "This week",
  // THE STRIP HAS THREE STATES AND THREE SENTENCES, and it used to have one.
  // "The read has not landed", "the read landed and the record is empty" and "the
  // read did not land at all" are three different facts about the record, and
  // printing weekNone for all three told a reader that a formal act had been
  // looked for and not found in the two cases where nothing had been looked at
  // yet. Worse, the old wording — "in the current record" — read as a fetch still
  // coming, so the honest empty was indistinguishable from a spinner in prose.
  //
  // {issue} is filled with the issue's printed label by whoever renders the
  // sentence, so the empty names the question it is empty about. The strip and
  // the poll are the same issue key; when they ever are not, the renderer labels
  // that in the sentence rather than letting the strip quietly answer a different
  // question than the one above it. No count and no percentage in any of the
  // three — a formal act is a thing that happened, not a score.
  weekBusy: "Checking this seat’s formal record on {issue}…",
  weekNone: "The record holds no formal act on {issue} for this seat.",
  weekUnread: "We could not read this seat’s formal record just now.",

  // Honest empty. A sentence, never a placeholder row and never a fake feed.
  emptyTakes: "No takes yet. Nobody has posted in this seat.",
  emptyNeighbors: "No verified neighbors in this seat yet.",
  emptyAnswers: "No answers yet.",

  // The gate, one sentence per reason.
  closedSignedOut: "Sign in and set your ballot location to post here. Reading stays open.",
  closedNoLocation:
    "We do not have a saved ballot location for you, so this seat is read-only. " +
    "Set your location in your ballot and come back.",
  closedWrongDistrict:
    "Your saved location places you in a different seat, so you cannot post in this one. " +
    "Reading stays open.",
  closedRevoked: "Your residency for this seat was revoked. Reading stays open.",
  closedNotShipped: "District Voice is not open in this seat yet.",

  // Refusals.
  noSeat: "We do not map that seat, so there is no district file for it.",
  noIssue: "We do not have an issue by that name.",
  noPoll: "This seat has no live question right now.",
  noOption: "Pick one of the options.",
  emptyBody: "Write something first.",
  tooLong: `A take is ${TAKE_MAX} characters or fewer.`,
};

// The sentence for a claim that cannot write. One owner, so the composer's note
// and the refusal cannot drift.
export function residencyNote(residency) {
  const reason = (residency && residency.reason) || "signed_out";
  if (reason === "no_location") return COPY.closedNoLocation;
  if (reason === "wrong_district") return COPY.closedWrongDistrict;
  if (reason === "revoked") return COPY.closedRevoked;
  if (reason === "no_seat") return COPY.noSeat;
  return COPY.closedSignedOut;
}

// Whether the two composers may be RENDERED — the read-side twin of the gates
// below, taking the same claim so the UI and the write paths cannot disagree
// about who is allowed to type or press.
export function composerState(residency, seatKey) {
  const seat = normalizeSeatKey(seatKey);
  if (residency && residency.verified === true && normalizeSeatKey(residency.seatKey) === seat) {
    return { canPost: true, note: "", reason: "verified" };
  }
  const reason = (residency && residency.reason) || "signed_out";
  return { canPost: false, reason, note: residencyNote(residency) };
}

// ── THE GATE: A TAKE ────────────────────────────────────────────────────────
// One pure function over RESOLVED inputs — the seat row the database actually
// returned (or null), the issue key the vocabulary actually holds (or null), the
// caller's claim, and the body. So "no seat" here means "no such place", not
// "the caller forgot a parameter".
//
// FAIL CLOSED MEANS THE DEFAULT IS NO. There is no branch that falls through to
// allowed; the function returns an allow only after all five conditions are
// affirmatively true.
//
//   1. no seat        → 404  (unmapped, malformed, or Voice not open there)
//   2. no issue       → 404  (not in the shipped ISSUE_MAP vocabulary)
//   3. not verified   → 401/403 (signed out, no location, revoked)
//   4. wrong seat     → 403  (their location places them somewhere else)
//   5. body           → 400  (empty, or over 280)
export function decideTake(input) {
  const inp = input || {};
  const seat = inp.seat || null;
  const seatKey = seat && typeof seat.seatKey === "string" ? normalizeSeatKey(seat.seatKey) : "";
  const issueKey = typeof inp.issueKey === "string" ? inp.issueKey : "";
  const residency = inp.residency || null;

  if (!seatKey || !voiceShipped(seatKey)) {
    return { ok: false, status: 404, code: "no_seat", message: COPY.noSeat };
  }

  // THE ISSUE KEY MUST EXIST IN ISSUE_MAP. `issueOk` is the caller's resolved
  // answer from the shipped vocabulary table — a well-shaped key that names no
  // row is still refused here, before the foreign key has to.
  if (!issueKey || !ISSUE_KEY_RE.test(issueKey) || inp.issueOk !== true) {
    return { ok: false, status: 404, code: "no_issue", message: COPY.noIssue };
  }

  if (!residency || residency.verified !== true) {
    const signedOut = !residency || residency.reason === "signed_out";
    return {
      ok: false,
      status: signedOut ? 401 : 403,
      code: signedOut ? "signed_out" : "not_verified",
      reason: (residency && residency.reason) || "signed_out",
      message: residencyNote(residency),
    };
  }

  if (normalizeSeatKey(residency.seatKey) !== seatKey) {
    return {
      ok: false,
      status: 403,
      code: "wrong_district",
      reason: "wrong_district",
      message: COPY.closedWrongDistrict,
    };
  }

  if (takeBodyTooLong(inp.body)) {
    return { ok: false, status: 400, code: "too_long", message: COPY.tooLong };
  }
  const body = normalizeTakeBody(inp.body);
  if (!body) {
    return { ok: false, status: 400, code: "empty_body", message: COPY.emptyBody };
  }

  return { ok: true, seatKey, issueKey, body };
}

// ── THE GATE: A POLL ANSWER ─────────────────────────────────────────────────
// The same claim, the same order, and the same default of no. Answering is gated
// on exactly what posting is gated on, so an answer from somebody who does not
// live here is impossible for the same reason a take from them is.
//
// A COMMENT IS NOT A VOTE. This function takes no body, normalizeTakeBody is not
// called in it, and no answer is ever inferred from a take's text.
export function decideAnswer(input) {
  const inp = input || {};
  const seat = inp.seat || null;
  const seatKey = seat && typeof seat.seatKey === "string" ? normalizeSeatKey(seat.seatKey) : "";
  const poll = inp.poll || null;
  const residency = inp.residency || null;
  const optionKey = String(inp.optionKey == null ? "" : inp.optionKey).trim().toLowerCase();

  if (!seatKey || !voiceShipped(seatKey)) {
    return { ok: false, status: 404, code: "no_seat", message: COPY.noSeat };
  }

  // One ACTIVE poll, and it has to belong to this seat. A poll id from another
  // seat is not a poll here.
  if (!poll || poll.active !== true || normalizeSeatKey(poll.seatKey) !== seatKey) {
    return { ok: false, status: 404, code: "no_poll", message: COPY.noPoll };
  }

  if (!residency || residency.verified !== true) {
    const signedOut = !residency || residency.reason === "signed_out";
    return {
      ok: false,
      status: signedOut ? 401 : 403,
      code: signedOut ? "signed_out" : "not_verified",
      reason: (residency && residency.reason) || "signed_out",
      message: residencyNote(residency),
    };
  }

  if (normalizeSeatKey(residency.seatKey) !== seatKey) {
    return {
      ok: false,
      status: 403,
      code: "wrong_district",
      reason: "wrong_district",
      message: COPY.closedWrongDistrict,
    };
  }

  // The option has to be one of THIS poll's options. The composite foreign key in
  // the schema refuses anything else too; this is the refusal that gets to say a
  // sentence about it.
  const options = Array.isArray(poll.options) ? poll.options : [];
  const found = options.some((o) => o && String(o.optionKey) === optionKey);
  if (!optionKey || !OPTION_KEY_RE.test(optionKey) || !found) {
    return { ok: false, status: 400, code: "no_option", message: COPY.noOption };
  }

  return { ok: true, seatKey, pollId: poll.id, optionKey };
}

// ── THE RESULTS: COUNTS, AND ONLY COUNTS ────────────────────────────────────
// One integer per option, in the poll's own order, plus the number of people who
// answered. NO PERCENTAGE — no percent sign is ever computed or returned —
// no proportion, no bar length, no fill, no leader and no winner. A proportion
// drawn as a length reads as a grade, and this is not a grade.
//
// And no composite: `answered` is the number of PEOPLE, not a score for the
// place. There is nothing here that could be called a district mood, because
// nothing here combines the options into one number.
export function pollCounts(options, rows) {
  const opts = Array.isArray(options) ? options : [];
  const tally = Object.create(null);
  for (const r of Array.isArray(rows) ? rows : []) {
    const k = r && String(r.optionKey == null ? "" : r.optionKey);
    if (!k) continue;
    const n = Number(r.count);
    tally[k] = (tally[k] || 0) + (Number.isFinite(n) ? n : 0);
  }
  const counts = opts.map((o) => ({
    optionKey: String((o && o.optionKey) || ""),
    label: String((o && o.label) || ""),
    count: tally[String((o && o.optionKey) || "")] || 0,
  }));
  const answered = counts.reduce((a, c) => a + c.count, 0);
  return { counts, answered };
}

// The sentence under the options. Integers and labels, joined — never "leading",
// never "the district believes", and never a proportion. Says who is being
// counted, because a count with no subject is the thing that turns into an
// approval rating.
export function pollCountLine(result) {
  const r = result || {};
  const counts = Array.isArray(r.counts) ? r.counts : [];
  if (!counts.length || !r.answered) return COPY.emptyAnswers;
  return counts.map((c) => `${c.count} ${c.label.toLowerCase()}`).join(" · ");
}

// How many verified neighbors this seat has. One integer, printed as a sentence
// when it is zero. Not a participation rate, not a share of the district, and
// never divided by anything — there is no denominator in this module.
export function neighborLine(n) {
  const v = Number(n);
  const count = Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
  if (!count) return COPY.emptyNeighbors;
  return count === 1 ? "1 verified neighbor in this seat." : `${count} verified neighbors in this seat.`;
}
