// ─────────────────────────────────────────────────────────────────────────────
// District Room core — the gate, and nothing that needs a database
// ─────────────────────────────────────────────────────────────────────────────
// THE DISTRICT ROOM ships one reader-facing surface: verified-residency
// neighbours in ONE district, talking about ONE issue. The schema landed in phase
// 0 (db/schema.ts, the dd_* tables); phase 1 shipped the address, the copy and
// the gate with residency deliberately stubbed to "nobody"; PHASE 2 replaces that
// stub with a read of dd_residency, so a neighbour an admin has verified for this
// district can post and everybody else still reads.
//
// This file is the half of that with no Postgres in it — the ADDRESS SHAPE, the
// COPY, and above all THE WRITE GATE — split out for the same reason
// rate-limit-core.mjs was: everything a "fail closed" claim can get subtly wrong
// is a pure function over resolved inputs, and none of it needs a branch database
// to check. The residency ROW is read by the Function and passed in here exactly
// as the district row already is.
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
  // The closed composer for somebody who is not signed in at all. Residency is
  // recorded against a verified uid, so there is nothing to record for a reader
  // the server cannot name.
  closedSignedOut:
    "Sign in first, then ask to be verified for this district. Reading is open.",
  // Signed in, no residency row for this district. Says the one thing they can
  // do next, and says what it is worth.
  closedNoResidency:
    "We have not established that you live in this district. Reading is open.",
  // THE CHIP AND THE ROOM DISAGREED. Signed in by every test the nav account
  // chip uses, and the server still could not name them — a stale or unmintable
  // ID token. It is the one state the room must NOT describe with
  // `closedSignedOut`, because telling a signed-in reader to sign in sends them
  // to a modal that will close again on the account they already hold. Owned
  // here with the rest so the client has no sentence of its own.
  authUnconfirmed:
    "You're signed in, but we could not confirm it for this room. Reload the " +
    "page and it should open.",
  // PENDING IS NOT VERIFIED, and this sentence is the whole reason the two
  // statuses are told apart on the surface. A pending row can read and cannot
  // post, and it never wears the badge.
  pending:
    "Your residency request for this district is pending review. " +
    "Reading is open; posting opens only if a reviewer approves it.",
  // Verified somewhere that is not this room. Its own sentence, because "verify
  // to post" would be nonsense to somebody who already did.
  wrongDistrict:
    "You're verified in a different district, so you can read here but not post.",
  // Was verified, is not any more.
  revoked:
    "Your residency for this district was revoked, so you can read here but not post.",

  // ── The self-attest request — THE NEIGHBOUR'S PRIMARY CONTROL ───────────
  // Phase 2 labelled this "I live in this district" and phase 3 relabels it: a
  // neighbour looking for the way into the room is looking for the ASK, and the
  // ask is the only control on this surface that leads anywhere for them. It is
  // still a REQUEST and every sentence around it says pending rather than
  // verified — what changed is which control is obvious, not what it does.
  attest: "Ask to be verified for this district",
  attestNote:
    "This records a PENDING request a reviewer decides on. Asking does not verify " +
    "you and does not open the composer.",
  attestSent:
    "Recorded as pending. A reviewer decides; you are not verified yet.",

  // ── The admin grant — A REVIEWER'S TOOL, AND LABELLED AS ONE ────────────
  // The other honest path, and the only one that can reach 'verified' in this
  // pass. It is named for the standing it requires, so it can never be mistaken
  // for the neighbour's way in — and the client paints it in its own footer,
  // away from the slot a neighbour reads as "join the room".
  grant: "Grant residency (reviewer)",
  reviewerTools: "Reviewer tools",
  granted: "Verified for this district. The composer is open here.",
  grantDenied: "Only a site reviewer can grant residency.",

  // Utah only in this pass, said as a sentence rather than implied by an empty
  // dropdown. dd_districts holds ut- rows only, because pdxRepsForMe()
  // .districtsResolvable is true in Utah and nowhere else.
  notInScope:
    "Residency verification is Utah only in this pass, so we cannot verify you " +
    "for a district in another state yet.",

  // The badge on every post.  // The badge on every post. Lowercase because it sits inline beside a
  // timestamp; it is an attestation about the author's district and nothing else
  // — no handle, no name, no party, no score.
  badge: "verified in this district",
  // The flag control and what it honestly promises today.
  flag: "Report",
  flagRecorded: "Reported. This records your intent; review comes later.",

  // ── THE POLL ────────────────────────────────────────────────────────────
  // ONE poll per room, and its question is FIXED COPY rather than a column
  // somebody writes. Nobody composes a poll here: there is no question field, no
  // option field and no second poll, because a room where neighbours write the
  // question is a room where the question becomes the argument.
  pollQuestion: "On this issue in this district, where do you stand?",
  // Results are COUNTS. Not a percentage, not a bar, not a grade and not an
  // order of merit — three numbers beside three labels, and the reader does
  // whatever arithmetic they want with them.
  pollNoVotes: "No votes yet.",
  pollCountsNote:
    "Counts only, and a neighbor's post is not a vote — nobody's answer here is " +
    "read off what they wrote.",
  pollVoted: "Recorded. Changing your answer replaces it.",
  pollPick: "Pick support, oppose or mixed.",
  // Who cannot vote, and which of the four ways that is true is theirs. Reading
  // the numbers is open to all of them, and every sentence says so.
  pollClosed:
    "Verify you live in this district to answer. The counts are open to read.",
  pollClosedSignedOut:
    "Sign in, then ask to be verified for this district to answer. The counts " +
    "are open to read.",
  pollPending:
    "Your residency request for this district is pending review, so you can read " +
    "the counts but not answer yet.",
  pollWrongDistrict:
    "You're verified in a different district, so you can read the counts here " +
    "but not answer.",
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

// ── RESIDENCY IS A FACT, AND THE FACT IS A ROW ──────────────────────────────
// Phase 1 shipped this as a resolver that returned "unverified" for every caller
// on purpose. Phase 2 replaces it with the thing it was a placeholder for: a read
// of dd_residency, one row per (person, district), carrying a status and the
// method that status was reached by.
//
// STILL NO DATABASE IN THIS FILE. The row is READ by the Function and PASSED IN
// here, exactly as the district row and the issue key already are, so the gate
// stays a pure function over resolved inputs and the test exercises the shipped
// gate rather than a copy of it.
//
// WHAT IS NOT RESIDENCY. window._currentVoterLocation — the zip or pin a reader
// types into Who Represents Me — is how the app answers "which district am I in"
// without knowing who is asking. It is not read here and it never will be: a
// reader can retype it at will, so treating it as verification would make
// "verified in this district" a badge the app cannot honour. Nothing on the
// request can produce a verified claim; only a row can.
//
// STATUS ALONE IS NOT ENOUGH. A status is only as good as how it was reached, so
// the claim requires BOTH: status 'verified' AND a method that is allowed to
// verify. That is what makes "a location pin cannot post" a property of this
// function rather than a promise about the write paths — a location_pin row could
// not publish even if some later code path set its status to verified by mistake.
export const RESIDENCY_STATUSES = ["pending", "verified", "revoked"];
export const RESIDENCY_METHODS = ["admin_grant", "self_attest", "location_pin", "vendor"];
// The only methods whose 'verified' status the gate will honour. In this pass an
// admin grant is the one that exists; 'vendor' is listed because the seam below
// is where it would arrive, and it is written by nothing today.
export const RESIDENCY_METHODS_VERIFYING = ["admin_grant", "vendor"];
// A self-attested request and a location pin can never publish, whatever status
// somebody manages to put on the row.
export const RESIDENCY_METHODS_NEVER_VERIFY = ["self_attest", "location_pin"];

// Utah only in this pass. dd_districts holds ut- rows only for the reason
// DISTRICT_MAPS.md gives, and residency for a district the app cannot resolve
// would be a confident wrong district. Two-letter postal codes, uppercase.
export const RESIDENCY_STATES = ["UT"];
export function residencyStateAllowed(state) {
  return RESIDENCY_STATES.indexOf(String(state == null ? "" : state).trim().toUpperCase()) >= 0;
}

// ── THE VENDOR SEAM, AND IT IS UNUSED ──────────────────────────────────────
// The ID check is the NEXT pass, not this one: no Stripe Identity call, no Veriff
// call, no document upload and no third-party round trip is made anywhere in this
// repo today. This is the single place one would land, and it is referenced by
// nothing — it throws rather than returning a soft "false" so that wiring it in
// is a deliberate act and never an accident that quietly verifies somebody.
export const RESIDENCY_VERIFIER = null; // no vendor is wired in this pass

export function verifyVendor() {
  throw new Error("district-room: no residency vendor is wired in this pass");
}

// The claim, from the caller and their row for THIS district.
//
//   user  the server-verified identity, or null
//   row   dd_residency for (user, this district), or null — { districtKey,
//         status, method } is all of it that matters here
//
// Returns { verified, districtKey, reason, status, method }. `districtKey` is the
// ROW's district and never the room's, so a claim can only ever open the room it
// was established for — decideWrite() compares the two.
export function residencyClaim(user, row) {
  if (!user || user.isAnonymous) {
    return { verified: false, districtKey: null, reason: "signed_out", status: null, method: null };
  }
  const r = row || null;
  const status = r && typeof r.status === "string" ? r.status : "";
  const method = r && typeof r.method === "string" ? r.method : "";
  const districtKey = r && typeof r.districtKey === "string" ? r.districtKey : "";

  // Signed in, and no row for this district. Not a refusal to explain away: the
  // app simply has not established anything.
  if (!r || !status || !DISTRICT_KEY_RE.test(districtKey)) {
    return { verified: false, districtKey: null, reason: "no_residency", status: null, method: null };
  }

  if (status === "verified" && RESIDENCY_METHODS_VERIFYING.indexOf(method) >= 0) {
    return { verified: true, districtKey, reason: "verified", status, method };
  }

  // Everything else reads and cannot post. `pending` and `revoked` get their own
  // reason so the surface can say which one is true — a reader told "verify to
  // post" while their request sits in a queue has been told the wrong thing.
  const reason =
    status === "pending" ? "pending" : status === "revoked" ? "revoked" : "not_verified";
  return { verified: false, districtKey: null, reason, status, method: method || null };
}

// The sentence for a claim that cannot post. One owner, so the composer's note
// and the write path's refusal cannot drift apart.
export function residencyNote(residency) {
  const reason = (residency && residency.reason) || "signed_out";
  if (reason === "signed_out") return COPY.closedSignedOut;
  if (reason === "pending") return COPY.pending;
  if (reason === "revoked") return COPY.revoked;
  return `${COPY.closed} ${COPY.closedNoResidency}`;
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
//   3. not verified     → no write   (signed out, no row, pending, or revoked)
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

  // 3. Residency, read off the dd_residency row the Function resolved. Signed
  //    out, no row, pending and revoked are all the same answer to the room —
  //    no — and four different answers to the reader, so the Phase 1 code stays
  //    coarse (signed_out / not_verified) and `reason` plus the sentence carry
  //    which one it is. A pending request is told it is pending; being told
  //    "verify to post" while a request sits in the queue is the wrong thing.
  if (!residency || residency.verified !== true) {
    const signedOut = !residency || residency.reason === "signed_out";
    return {
      ok: false,
      status: signedOut ? 401 : 403,
      code: signedOut ? "signed_out" : "not_verified",
      // The Phase 1 code is unchanged — a client that keyed off it still works —
      // and `reason` carries the finer answer the surface needs to say "pending"
      // where pending is the truth.
      reason: (residency && residency.reason) || "signed_out",
      message: residencyNote(residency),
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
      message: COPY.wrongDistrict,
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
    return { canPost: true, note: "", reason: "verified" };
  }
  // Verified SOMEWHERE, but not here. Its own sentence, because "verify to post"
  // would be nonsense to somebody who already did.
  if (residency && residency.verified === true) {
    return {
      canPost: false,
      reason: "wrong_district",
      note: COPY.wrongDistrict,
    };
  }
  // Not verified anywhere the room cares about. The note says which of the ways
  // that is true is the reader's: signed out, nothing established, a request
  // still in the queue, or a revoked row.
  const reason = (residency && residency.reason) || "signed_out";
  return { canPost: false, reason, note: residencyNote(residency) };
}

// ── THE POLL: ONE PER ROOM, THREE POLES, COUNTS ONLY ────────────────────────
// A room now carries EXACTLY ONE structured question, and this is the whole of
// its vocabulary. Everything about it is fixed here rather than composed by a
// caller, because every degree of freedom a poll has is a way for a room to turn
// into a contest:
//
//   THE QUESTION IS FIXED COPY.  COPY.pollQuestion, one string, no column. There
//   is no question field on any request body and no table row that stores one, so
//   there is nothing to write a second question into.
//   THE OPTIONS ARE FIXED.       Support / Oppose / Mixed — the SAME three poles
//   My Stances already spends (my-stances.js POSITION_LABEL), so a neighbour
//   answering here is answering in the vocabulary they already know. No custom
//   option, no "other", no free text, and above all NO PARTY LABEL: a room is
//   neighbours on an issue, and the moment the poles become teams it is a
//   scoreboard for the two of them instead.
//   THERE IS ONE POLL.           A poll is not a row somebody creates; it IS the
//   room. (district, issue) names it, the question and the options are constants,
//   and the only row anybody writes is their own answer — so a second poll in a
//   room is not something the code refuses, it is something the schema cannot
//   express.
//
// WHAT THE RESULTS ARE. Three integers and the three labels beside them. NO
// PERCENTAGE — not in the copy, not in the payload, not in the markup — and no
// bar, meter or fill, because a proportion drawn as a length reads as a grade and
// this is not a grade. Nothing about the poll reorders, weights or scores the
// posts underneath it: the room stays newest-first and a post with a matching
// answer is not promoted by it.
//
// A COMMENT IS NOT A VOTE. No answer is ever inferred from post text. decideVote
// below takes no body and normalizeBody is not called anywhere in it; the only
// thing that produces an answer is a person pressing one of three buttons.
export const POLL_CHOICES = ["support", "oppose", "mixed"];
// The labels, spelled exactly as My Stances spells them.
export const POLL_LABELS = { support: "Support", oppose: "Oppose", mixed: "Mixed" };

// The three poles as the client paints them, built here so the labels have one
// owner and a caller cannot slip a fourth option into the list.
export function pollOptions() {
  return POLL_CHOICES.map((k) => ({ key: k, label: POLL_LABELS[k] }));
}

// One of the three, or ''. '' is refused by decideVote, so this is the whole of
// the "no custom options" rule — anything that is not a pole is not an answer.
export function normalizeChoice(v) {
  const s = typeof v === "string" ? v.trim().toLowerCase() : "";
  return POLL_CHOICES.indexOf(s) >= 0 ? s : "";
}

// The grouped rows the Function read, folded into three integers. Written as a
// pure function over rows so the test can hand it anything — including a row for
// a choice that is not a pole, which is dropped rather than added to a fourth
// bucket that would then need a label.
export function pollTally(rows) {
  const out = { support: 0, oppose: 0, mixed: 0, total: 0 };
  (Array.isArray(rows) ? rows : []).forEach((r) => {
    const k = normalizeChoice(r && r.choice);
    if (!k) return;
    const n = Number(r && r.n);
    if (!Number.isFinite(n) || n <= 0) return;
    out[k] += Math.floor(n);
  });
  out.total = out.support + out.oppose + out.mixed;
  return out;
}

// The one sentence the results are ever printed as: "N support · N oppose · N
// mixed", and the honest sentence when nobody has answered. There is no second
// formatter, no ratio and no percentage anywhere in this file — the test asserts
// the '%' character appears in neither the copy nor the painted block.
export function pollResultLine(tally) {
  const t = pollTally([
    { choice: "support", n: (tally && tally.support) || 0 },
    { choice: "oppose", n: (tally && tally.oppose) || 0 },
    { choice: "mixed", n: (tally && tally.mixed) || 0 },
  ]);
  if (!t.total) return COPY.pollNoVotes;
  return `${t.support} support · ${t.oppose} oppose · ${t.mixed} mixed`;
}

// The sentence for somebody who may read the counts and may not answer. Four
// ways that is true, four sentences, one owner — the same arrangement
// residencyNote() has for the composer.
export function pollNote(residency) {
  if (residency && residency.verified === true) return COPY.pollWrongDistrict;
  const reason = (residency && residency.reason) || "signed_out";
  if (reason === "signed_out") return COPY.pollClosedSignedOut;
  if (reason === "pending") return COPY.pollPending;
  return COPY.pollClosed;
}

// ── THE VOTE GATE ───────────────────────────────────────────────────────────
// The write gate's twin, and it fails closed the same way. Same three residency
// conditions as decideWrite() — status verified AND a verifying method AND the
// row's district equal to the room's — because an answer counted from somebody
// who does not live here is exactly the confident wrong number this surface must
// never print.
//
//   1. no district      → no vote
//   2. no issue         → no vote
//   3. not verified     → no vote   (signed out, no row, pending, or revoked)
//   4. wrong district   → no vote
//   5. not one of three → no vote
//
// It takes NO BODY. There is no path from a sentence to an answer.
export function decideVote(input) {
  const inp = input || {};
  const district = inp.district || null;
  const issueKey = typeof inp.issueKey === "string" ? inp.issueKey : "";
  const residency = inp.residency || null;
  const choice = normalizeChoice(inp.choice);

  const districtKey = district && typeof district.districtKey === "string"
    ? district.districtKey
    : "";

  if (!districtKey || !DISTRICT_KEY_RE.test(districtKey)) {
    return {
      ok: false,
      status: 404,
      code: "no_district",
      message: "We don't map that district, so there is no room for it.",
    };
  }
  if (!issueKey || !ISSUE_KEY_RE.test(issueKey)) {
    return {
      ok: false,
      status: 404,
      code: "no_issue",
      message: "We don't have an issue by that name.",
    };
  }
  // Residency, read off the same dd_residency row the composer is gated on. A
  // pending request reads the counts and does not add to them.
  if (!residency || residency.verified !== true) {
    const signedOut = !residency || residency.reason === "signed_out";
    return {
      ok: false,
      status: signedOut ? 401 : 403,
      code: signedOut ? "signed_out" : "not_verified",
      reason: (residency && residency.reason) || "signed_out",
      message: pollNote(residency),
    };
  }
  if (String(residency.districtKey || "") !== districtKey) {
    return {
      ok: false,
      status: 403,
      code: "wrong_district",
      message: COPY.pollWrongDistrict,
    };
  }
  if (!choice) {
    return { ok: false, status: 400, code: "no_choice", message: COPY.pollPick };
  }
  return { ok: true, districtKey, issueKey, choice };
}

// Whether the three buttons may be RENDERED at all — the read-side twin of the
// vote gate, so the poll a reader can press is exactly the poll the server would
// accept an answer from. A closed poll still prints the counts; it prints no
// buttons, for the same reason a closed composer prints no textarea.
export function pollState(residency, districtKey) {
  const d = String(districtKey || "");
  if (residency && residency.verified === true && String(residency.districtKey || "") === d) {
    return { canVote: true, note: "", reason: "verified" };
  }
  if (residency && residency.verified === true) {
    return { canVote: false, reason: "wrong_district", note: COPY.pollWrongDistrict };
  }
  const reason = (residency && residency.reason) || "signed_out";
  return { canVote: false, reason, note: pollNote(residency) };
}
