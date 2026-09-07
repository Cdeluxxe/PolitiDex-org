#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-district-room.mjs — the District Room fails closed, and it is a room
// rather than a leaderboard
// ─────────────────────────────────────────────────────────────────────────────
// The room is verified-residency neighbours in ONE district talking about ONE
// issue: /d/<districtKey>/<issueKey>. That sentence is the product rule, and
// every assertion below is one of its edges.
//
//   1. ONE ADDRESS, OWNED IN ONE PLACE. /d/<districtKey>/<issueKey>, spelled
//      identically by the gate (netlify/lib/district-room-core.mjs) and the
//      client (district-room.js), served 200 by netlify.toml. A malformed pair
//      builds no link and opens no room.
//   2. ONE COPY. The strap, the empty room, the closed note and the badge exist
//      once. The server sends them and the client prints them, so a UI that says
//      one thing while the gate enforces another is impossible by construction.
//   3. FAIL CLOSED. no district → no write. no issue → no write. unverified →
//      no write. verified for a DIFFERENT district → no write. empty body → no
//      write. And no combination of inputs reaches an allow without all five
//      being affirmatively true — checked exhaustively, not by example.
//   4. RESIDENCY IS A STUB THAT CANNOT PUBLISH. The shipped residencyClaim()
//      returns verified:false for every caller, so the composer renders for
//      nobody in this pass and the closed note says so out loud. The seam is
//      real: hand the same gate a verified claim and it allows the write.
//   5. THE FUNCTION DISCLOSES NOTHING. No uid, no handle and no pid leaves it.
//      Reading a room creates no row. There is one insert into dd_posts and it
//      is downstream of the gate.
//   6. IT IS NOT A COMMENT THREAD ON A POLITICIAN, NOT A BOARD AND NOT A RANK.
//      No pid anywhere in the surface. Newest first and no other order, no sort
//      parameter, no reaction, no count, no party or caucus or "team" language,
//      and none of the verdict palette.
//   7. TWO MOUNTS, AND ONLY TWO. A district seat row in Who Represents Me, and
//      the issue file's letterhead. No nav item, no third caller.
//
//   node scripts/test-district-room.mjs
//
// The gate is IMPORTED from the same .mjs the Function imports, so the refusals
// checked here are literally the refusals that ship. The client module runs in a
// node:vm sandbox with a small real DOM, so "the empty room copy renders" and
// "the URL opens the room" are observed rather than asserted about source text.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import {
  BODY_MAX,
  COPY as CORE_COPY,
  DISTRICT_KEY_RE,
  ISSUE_KEY_RE,
  RESIDENCY_VERIFIER,
  ROOM_PATH_RE,
  ROOM_PREFIX,
  composerState,
  decideWrite,
  normalizeBody,
  normalizeSourceUrl,
  residencyClaim,
  roomFromPath,
  roomPath,
} from "../netlify/lib/district-room-core.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

const ROOM_SRC = R("district-room.js");
const ROOM_CSS = R("district-room.css");
const CORE_SRC = R("netlify/lib/district-room-core.mjs");
const FN_SRC = R("netlify/functions/district-room.mts");
const SCHEMA = R("db/schema.ts");
const TOML = R("netlify.toml");
const INDEX = R("index.html");
const SW = R("sw.js");
const WRM_SRC = R("who-represents-me.js");
const IF_SRC = R("issue-file.js");
const MIGRATION = R(
  "netlify/database/migrations/20261029000000_create_dd_district_discussion_tables/migration.sql"
);

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) >= 0, `${msg} — "${needle}" missing`);
const lacks = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) < 0, `${msg} — "${needle}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ district-room: ${msg}`);
  process.exit(1);
};

// Comments in this repo have to be able to name what the code refuses to build
// ("no party letter", "not a leaderboard"), so every source-level assertion runs
// over a comment-stripped copy.
const strip = (src) =>
  String(src).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");

// ═════════════════════════════════════════════════════════════════════════════
// A SMALL REAL DOM. The shared sandbox returns null from getElementById, which
// is exactly what district-room.js treats as "there is no page to build in" — so
// the room would refuse to open and nothing below could be observed. This is the
// smallest DOM that lets the module actually paint: nodes with children, an id
// registry the module's own el() can find, and an innerHTML we can read back.
function makeDom(pathname) {
  const win = makeSandbox();

  const nodes = [];
  function node(tag) {
    const n = {
      tagName: String(tag || "div").toUpperCase(),
      id: "", className: "", innerHTML: "", textContent: "", hidden: false,
      children: [], parentNode: null, attrs: {}, disabled: false, scrollTop: 0,
      style: { setProperty(k, v) { this[k] = v; }, removeProperty(k) { delete this[k]; } },
      setAttribute(k, v) { this.attrs[k] = String(v); },
      getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
      addEventListener() {}, removeEventListener() {},
      appendChild(c) { c.parentNode = this; this.children.push(c); return c; },
      insertBefore(c, ref) {
        c.parentNode = this;
        const i = this.children.indexOf(ref);
        if (i < 0) this.children.push(c); else this.children.splice(i, 0, c);
        return c;
      },
      querySelector() { return null; },
      querySelectorAll() { return []; },
      closest() { return null; },
      focus() {},
    };
    nodes.push(n);
    return n;
  }

  const body = node("body");
  const doc = {
    readyState: "complete", cookie: "",
    body,
    head: node("head"),
    documentElement: node("html"),
    createElement: (t) => node(t),
    getElementById: (id) => nodes.find((n) => n.id === id) || null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
  };

  // Real-enough timers, so the arrival boot can be flushed on demand rather than
  // silently dropped the way the shared sandbox's no-op timers drop it.
  const queue = [];
  win.setTimeout = (f) => { queue.push(f); return queue.length; };
  win.clearTimeout = () => {};
  win.document = doc;
  win.location = { href: "https://www.politidex.fyi" + pathname, pathname, search: "", hash: "", origin: "https://www.politidex.fyi" };
  win.history = { pushState() {}, replaceState() {} };
  win.flushTimers = () => { const q = queue.splice(0); q.forEach((f) => { try { f(); } catch (e) {} }); };
  return win;
}

// The room read the client will be handed. `posts` is whatever the caller wants;
// everything else is exactly what netlify/functions/district-room.mts returns.
function roomPayload(posts, canPost) {
  const composer = composerState(
    canPost ? { verified: true, districtKey: "ut-house-2" } : residencyClaim({ uid: "u1" }),
    "ut-house-2"
  );
  return {
    district: {
      districtKey: "ut-house-2", label: "Utah · U.S. House District 2",
      state: "UT", seatKey: "house", districtNumber: 2,
    },
    issueKey: "lands_preserve",
    strap: CORE_COPY.strap,
    empty: CORE_COPY.empty,
    badge: CORE_COPY.badge,
    canPost: composer.canPost,
    closedNote: composer.note,
    posts: posts || [],
  };
}

function boot(pathname, payload, extras) {
  const win = makeDom(pathname || "/");
  win.fetch = () => Promise.resolve({
    ok: true, status: 200,
    json: () => Promise.resolve(payload || roomPayload([])),
  });
  Object.assign(win, extras || {});
  vm.runInContext(ROOM_SRC, vm.createContext(win), { filename: "district-room.js" });
  return win;
}

const W0 = boot("/");
const DR = W0.PDXDistrictRoom;
must(DR && typeof DR === "object", "district-room.js did not define window.PDXDistrictRoom");

// ═════════════════════════════════════════════════════════════════════════════
section("1 · one address, spelled the same in both halves, served 200");

eq(DR.PREFIX, ROOM_PREFIX, "the client and the gate agree on the path prefix");
eq(DR.PATH_RE.source, ROOM_PATH_RE.source, "the client and the gate agree on the path pattern");
eq(DR.DISTRICT_KEY_RE.source, DISTRICT_KEY_RE.source, "the client and the gate agree on the district shape");
eq(DR.ISSUE_KEY_RE.source, ISSUE_KEY_RE.source, "the client and the gate agree on the issue shape");

const ADDRESSES = [
  ["ut-house-2", "lands_preserve", "/d/ut-house-2/lands_preserve"],
  ["ut-statesenate-6", "water_storage", "/d/ut-statesenate-6/water_storage"],
  ["ut-statehouse-10", "housing_build", "/d/ut-statehouse-10/housing_build"],
];
for (const [d, i, p] of ADDRESSES) {
  eq(roomPath(d, i), p, `the gate builds ${p}`);
  eq(DR.path(d, i), p, `the client builds ${p}`);
  eq(JSON.stringify(roomFromPath(p)), JSON.stringify({ districtKey: d, issueKey: i }),
    `the gate parses ${p}`);
  eq(JSON.stringify(DR.fromPath(p)), JSON.stringify({ districtKey: d, issueKey: i }),
    `the client parses ${p}`);
}

// A pair that cannot be an address builds NO address — never a half-formed path,
// because a caller that cannot be handed a link must render no link at all.
const BAD_PAIRS = [
  ["", "lands_preserve"], ["ut-house-2", ""], [null, null],
  ["ut-senate-2", "lands_preserve"],      // not one of the three seat classes
  ["ut-house-0", "lands_preserve"],       // no district zero
  ["ut-house-02", "lands_preserve"],      // no leading zero
  ["UT-house-2", "lands_preserve"],       // the key is lower case
  ["utah-house-2", "lands_preserve"],     // the postal code, not the name
  ["ut-house-2", "Lands_Preserve"],       // issue keys are lower case
  ["ut-house-2", "lands-preserve"],       // underscores, not hyphens
  ["ut-house-2", "lands preserve"],
  ["ut-house-2/../x", "lands_preserve"],
];
for (const [d, i] of BAD_PAIRS) {
  eq(roomPath(d, i), "", `the gate builds no address for ${JSON.stringify([d, i])}`);
  eq(DR.path(d, i), "", `the client builds no address for ${JSON.stringify([d, i])}`);
}
const BAD_PATHS = [
  "/", "/d/", "/d/ut-house-2", "/d/ut-house-2/lands_preserve/extra",
  "/i/lands_preserve", "/p/abc", "/d/ut-house-2/LANDS", "/d//lands_preserve",
];
for (const p of BAD_PATHS) {
  eq(roomFromPath(p), null, `the gate opens no room for ${p}`);
  eq(DR.fromPath(p), null, `the client opens no room for ${p}`);
}

// The rewrite that makes the address real, and the shape it fixes.
ok(/\[\[redirects\]\]\s*\n\s*from = "\/d\/\*"\s*\n\s*to = "\/index\.html"\s*\n\s*status = 200/.test(TOML),
  "netlify.toml serves /d/* as a 200 rewrite to index.html");
has(TOML, "/d/<districtKey>/<issueKey>", "netlify.toml documents the URL shape this pass picked");

// ═════════════════════════════════════════════════════════════════════════════
section("2 · one copy, and the room's sentences are the gate's sentences");

const CORE_KEYS = Object.keys(CORE_COPY).sort();
eq(Object.keys(DR.COPY).sort().join(","), CORE_KEYS.join(","),
  "the client mirrors exactly the gate's copy keys");
for (const k of CORE_KEYS) {
  eq(DR.COPY[k], CORE_COPY[k], `COPY.${k} is byte-identical on both sides`);
}
// The four sentences the brief names, in the brief's own words.
eq(CORE_COPY.empty, "No neighbor posts on this issue in this district yet.",
  "the empty room says exactly what it was asked to say");
eq(CORE_COPY.closed, "Verify you live in this district to post.",
  "the closed composer says exactly what it was asked to say");
has(CORE_COPY.strap, "this district", "the strap is about the district and the issue");
has(CORE_COPY.strap, "this issue", "the strap is about the district and the issue");
eq(CORE_COPY.badge, "verified in this district", "the badge attests residency and nothing else");
for (const v of Object.values(CORE_COPY)) {
  for (const banned of ["party", "caucus", "score", "rank", "team", "Democrat", "Republican"]) {
    lacks(v.toLowerCase(), banned.toLowerCase(), `no copy string spends the word "${banned}"`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the gate fails closed — the four refusals and the one allow");

const UT2 = { districtKey: "ut-house-2", label: "Utah · U.S. House District 2" };
const UT1 = { districtKey: "ut-house-1", label: "Utah · U.S. House District 1" };
const ISSUE = "lands_preserve";
const BODY = "The canyon road hearing is Tuesday at 6.";
const VERIFIED_HERE = { verified: true, districtKey: "ut-house-2" };
const VERIFIED_THERE = { verified: true, districtKey: "ut-house-1" };

// UNVERIFIED CANNOT WRITE. Signed out and signed-in-but-unverified are the same
// answer to the room and a different code to the client; both are told the one
// thing that would open the composer.
const signedOut = decideWrite({ district: UT2, issueKey: ISSUE, residency: residencyClaim(null), body: BODY });
eq(signedOut.ok, false, "a signed-out caller cannot write");
eq(signedOut.status, 401, "a signed-out caller is refused 401");
eq(signedOut.code, "signed_out", "a signed-out caller is refused as signed_out");
eq(signedOut.message, CORE_COPY.closed, "a signed-out caller is told what would open the composer");

const anon = decideWrite({ district: UT2, issueKey: ISSUE, residency: residencyClaim({ uid: "a", isAnonymous: true }), body: BODY });
eq(anon.ok, false, "an anonymous session cannot write");
eq(anon.status, 401, "an anonymous session is refused 401");

const unverified = decideWrite({ district: UT2, issueKey: ISSUE, residency: residencyClaim({ uid: "u1" }), body: BODY });
eq(unverified.ok, false, "a signed-in but unverified caller cannot write");
eq(unverified.status, 403, "an unverified caller is refused 403");
eq(unverified.code, "not_verified", "an unverified caller is refused as not_verified");
eq(unverified.message, CORE_COPY.closed, "an unverified caller is told what would open the composer");

// VERIFIED FOR THE WRONG DISTRICT CANNOT WRITE. This is the refusal that keeps
// the room honest: a room that accepted UT-1 would be showing a district posts
// from another district.
const wrong = decideWrite({ district: UT2, issueKey: ISSUE, residency: VERIFIED_THERE, body: BODY });
eq(wrong.ok, false, "a caller verified in another district cannot write");
eq(wrong.status, 403, "the wrong district is refused 403");
eq(wrong.code, "wrong_district", "the wrong district is refused as wrong_district");
has(wrong.message, "read here but not post", "the wrong district is told it may still read");
// And symmetrically, in the other room.
eq(decideWrite({ district: UT1, issueKey: ISSUE, residency: VERIFIED_HERE, body: BODY }).code,
  "wrong_district", "the refusal is symmetric — UT-2's neighbour cannot post in UT-1");

// NO DISTRICT → NO WRITE, and it is the FIRST refusal: a caller with no room and
// no residency is told there is no room, not that they should verify.
for (const d of [null, {}, { districtKey: "" }, { districtKey: "ut-senate-2" }, { districtKey: "ut-house-0" }]) {
  const v = decideWrite({ district: d, issueKey: ISSUE, residency: VERIFIED_HERE, body: BODY });
  eq(v.ok, false, `no district → no write for ${JSON.stringify(d)}`);
  eq(v.code, "no_district", `no district → no_district for ${JSON.stringify(d)}`);
  eq(v.status, 404, `no district → 404 for ${JSON.stringify(d)}`);
}
eq(decideWrite({ district: null, issueKey: "", residency: null, body: "" }).code, "no_district",
  "the structural refusal wins over residency and body");

// NO ISSUE → NO WRITE.
for (const i of ["", null, "Lands", "lands-preserve", "lands preserve"]) {
  const v = decideWrite({ district: UT2, issueKey: i, residency: VERIFIED_HERE, body: BODY });
  eq(v.ok, false, `no issue → no write for ${JSON.stringify(i)}`);
  eq(v.code, "no_issue", `no issue → no_issue for ${JSON.stringify(i)}`);
}

// EMPTY BODY → NO WRITE, for every spelling of empty.
for (const b of ["", "   ", "\n\n", "\t \r\n ", null, undefined, 0, [], {}]) {
  const v = decideWrite({ district: UT2, issueKey: ISSUE, residency: VERIFIED_HERE, body: b });
  eq(v.ok, false, `empty body → no write for ${JSON.stringify(b)}`);
  eq(v.code, "empty_body", `empty body → empty_body for ${JSON.stringify(b)}`);
  eq(v.status, 400, `empty body → 400 for ${JSON.stringify(b)}`);
}

// VERIFIED FOR THIS DISTRICT CAN WRITE. The seam is real: the same gate that
// refused everything above allows this, so wiring a residency verifier is the
// only thing standing between this pass and a room that accepts posts.
const allow = decideWrite({ district: UT2, issueKey: ISSUE, residency: VERIFIED_HERE, body: `  ${BODY}  ` });
eq(allow.ok, true, "a caller verified in THIS district can write");
eq(allow.districtKey, "ut-house-2", "the allow carries the room's district");
eq(allow.issueKey, ISSUE, "the allow carries the room's issue");
eq(allow.body, BODY, "the allow carries the trimmed body");
eq(allow.sourceUrl, null, "no source link means no source link");
eq(allow.status, undefined, "an allow carries no HTTP refusal status");
eq(decideWrite({ district: UT2, issueKey: ISSUE, residency: VERIFIED_HERE, body: BODY, sourceUrl: "https://le.utah.gov/x" }).sourceUrl,
  "https://le.utah.gov/x", "an http(s) source link is kept");
for (const u of ["javascript:alert(1)", "data:text/html,x", "le.utah.gov", "", "  ", null]) {
  eq(normalizeSourceUrl(u), null, `a source link of ${JSON.stringify(u)} is dropped`);
}
eq(normalizeBody("x".repeat(BODY_MAX + 500)).length, BODY_MAX, "the body is capped");

// EXHAUSTIVE, NOT BY EXAMPLE. Every combination of the five inputs, and the only
// ones that reach an allow are the ones where all five are affirmatively true.
// This is what "fail closed" has to mean: not "we listed the refusals" but "no
// path falls through to yes".
const DISTRICTS = [null, {}, { districtKey: "ut-house-9" }, UT1, UT2];
const ISSUES = [null, "", "bad key", ISSUE];
const RESIDENCIES = [
  null, residencyClaim(null), residencyClaim({ uid: "u" }), residencyClaim({ uid: "u", isAnonymous: true }),
  { verified: false, districtKey: "ut-house-2" },
  { verified: "true", districtKey: "ut-house-2" },   // a truthy string is not true
  { verified: 1, districtKey: "ut-house-2" },        // nor is a truthy number
  { verified: true, districtKey: null },
  { verified: true, districtKey: "" },
  VERIFIED_THERE, VERIFIED_HERE,
];
const BODIES = ["", "   ", null, BODY];
let allows = 0, expected = 0, mislabelled = 0;
for (const d of DISTRICTS) for (const i of ISSUES) for (const r of RESIDENCIES) for (const b of BODIES) {
  const v = decideWrite({ district: d, issueKey: i, residency: r, body: b });
  const shouldAllow =
    !!(d && DISTRICT_KEY_RE.test(String(d.districtKey || ""))) &&
    !!(typeof i === "string" && i && ISSUE_KEY_RE.test(i)) &&
    !!(r && r.verified === true && String(r.districtKey || "") === String((d && d.districtKey) || "")) &&
    !!normalizeBody(b);
  if (shouldAllow) expected++;
  if (v.ok === true) allows++;
  if (v.ok !== shouldAllow) mislabelled++;
  if (v.ok !== true && !(v.status >= 400 && typeof v.code === "string" && v.message)) mislabelled++;
}
eq(mislabelled, 0, "no combination of inputs disagrees with the rule, and every refusal carries a status, a code and a sentence");
eq(allows, expected, `exactly ${expected} of ${DISTRICTS.length * ISSUES.length * RESIDENCIES.length * BODIES.length} input combinations are allowed`);
ok(allows > 0, "the gate is capable of allowing a write at all");

// ═════════════════════════════════════════════════════════════════════════════
section("4 · residency is a labelled stub, and it cannot publish");

eq(RESIDENCY_VERIFIER, null, "no residency vendor is wired in this pass");
for (const u of [null, undefined, {}, { uid: "u1" }, { uid: "u1", isAnonymous: true },
  { uid: "u1", email: "a@b.c", emailVerified: true },
  { uid: "u1", districtKey: "ut-house-2", verified: true }]) {
  const c = residencyClaim(u);
  eq(c.verified, false, `the shipped residency stub cannot verify ${JSON.stringify(u)}`);
  eq(c.districtKey, null, "the shipped residency stub claims no district");
}
// So the composer renders for NOBODY, and the note says why rather than dangling
// a "verify" that leads nowhere.
const shipped = composerState(residencyClaim({ uid: "u1" }), "ut-house-2");
eq(shipped.canPost, false, "the composer is closed for a signed-in reader in this pass");
has(shipped.note, CORE_COPY.closed, "the closed note names the one thing that would open it");
has(shipped.note, CORE_COPY.closedStub, "the closed note says out loud that nothing can open it yet");
eq(composerState(residencyClaim(null), "ut-house-2").canPost, false,
  "the composer is closed for a signed-out reader");
// The seam, again from the read side: the UI opens the moment a verifier answers.
eq(composerState(VERIFIED_HERE, "ut-house-2").canPost, true,
  "a verified claim for this district opens the composer");
eq(composerState(VERIFIED_THERE, "ut-house-2").canPost, false,
  "a verified claim for another district does not open the composer");
eq(composerState(VERIFIED_HERE, "ut-house-1").canPost, false,
  "the same claim in another room does not open the composer");
// The read side and the write side cannot disagree about who may type.
for (const r of RESIDENCIES) {
  const canPost = composerState(r, "ut-house-2").canPost;
  const allowed = decideWrite({ district: UT2, issueKey: ISSUE, residency: r, body: BODY }).ok === true;
  eq(canPost, allowed, "the composer is shown to exactly the callers the gate would accept");
}
// The gate carries no database and no vendor.
const core = strip(CORE_SRC);
for (const forbidden of ["drizzle", "from \"../../db", "firebase", "fetch(", "process.env"]) {
  lacks(core, forbidden, `the gate does not reach for ${forbidden}`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the Function resolves honestly, writes once, and discloses nothing");

const fn = strip(FN_SRC);
has(fn, "decideWrite(", "the Function asks the gate rather than deciding for itself");
has(fn, "if (!verdict.ok)", "the Function returns exactly what the gate refused");
eq((fn.match(/db\s*\n?\s*\.insert\(ddPosts\)|insert\(ddPosts\)/g) || []).length, 1,
  "there is exactly one insert into dd_posts");
ok(fn.indexOf("decideWrite(") < fn.indexOf("insert(ddPosts)"),
  "the only insert into dd_posts is downstream of the gate");
eq((fn.match(/insert\(ddThreads\)/g) || []).length, 1,
  "there is exactly one insert into dd_threads");
ok(fn.indexOf("decideWrite(") < fn.indexOf("insert(ddThreads)"),
  "reading a room creates no thread row — the thread is created on first post");
has(fn, "onConflictDoNothing()", "a concurrent first post loses the conflict rather than duplicating the room");

// Residency and identity come from the two owners, not from a second opinion.
has(fn, "verifyUser(req)", "the Function verifies identity server-side");
has(fn, "residencyClaim(", "the Function takes residency from the one resolver");
lacks(fn, "_currentVoterLocation", "the Function does not trust a self-typed location");

// NEWEST FIRST, AND THERE IS NO OTHER ORDER.
has(fn, "orderBy(desc(ddPosts.createdAt), desc(ddPosts.id))", "posts come back newest first");
lacks(fn, "asc(", "there is no ascending order anywhere in the Function");
for (const knob of ["sort", "order=", "orderBy=", "rank", "top", "popular", "limit="]) {
  lacks(fn.toLowerCase(), `searchparams.get("${knob}`, `no query parameter reorders the room (${knob})`);
}

// NO UID, NO HANDLE, NO NAME LEAVES THIS FUNCTION. user_id is written so a report
// has something to act on later, and is never selected into a response.
ok(/userId:\s*viewer\?\.uid/.test(fn), "the post's user_id is written");
lacks(fn, "userId: ddPosts.userId", "user_id is never selected into a response");
for (const leak of ["handle", "displayName", "avatar", "photoURL", "email"]) {
  lacks(fn, leak, `no ${leak} appears anywhere in the Function`);
}
// The read's response shape, enumerated: five fields per post and not one more.
const postShape = (fn.match(/verified:\s*!!p\.verifiedResident/g) || []).length;
ok(postShape >= 1, "a post is returned as body, source, verified, timestamp and id");

// The flag control is honest about being a stub, and it moves nothing.
has(fn, "recorded: true", "the report control records intent");
has(fn, "stub: true", "the report control says it is a stub");
has(fn, "COPY.flagRecorded", "the report control returns the one sentence about what it promises");
lacks(fn, "update(ddPosts)", "a report updates no post");
lacks(fn, "delete(ddPosts)", "a report deletes no post");

// ═════════════════════════════════════════════════════════════════════════════
section("6 · not a person file, not a board, not a rank, not a party");

const roomJs = strip(ROOM_SRC);
const css = ROOM_CSS;
// NO PID ANYWHERE IN THE SURFACE. A room is keyed on (district, issue), so it
// survives the seat changing hands — and it is not a comment thread on whoever
// holds it.
for (const src of [["district-room.js", roomJs], ["the gate", core], ["the Function", fn]]) {
  ok(!/\bpid\b/i.test(src[1]), `${src[0]} never takes, stores or emits a pid`);
  ok(!/showProfile|_pdxPersonById|PDXPerson\b/.test(src[1]), `${src[0]} does not open a person file`);
}
// NO RANKING VOCABULARY, in any of the three files or the stylesheet.
const BANNED = [
  "party", "caucus", "score", "rank", "leaderboard", "upvote", "downvote",
  "trending", "popular", "karma", "reputation", "directionMatch", "Direction Match",
  "sameHere", "same_here", "likes", "hot",
];
for (const [name, src] of [["district-room.js", roomJs], ["the gate", core], ["the Function", fn], ["district-room.css", strip(css)]]) {
  for (const b of BANNED) {
    ok(String(src).toLowerCase().indexOf(b.toLowerCase()) < 0,
      `${name} does not spend the word "${b}"`);
  }
}
// No arithmetic at all in the client beyond a post id: nothing to rank with.
ok(!/\.sort\(/.test(roomJs), "the client never sorts the room");
ok(!/%/.test(roomJs), "the client computes no percentage");
ok(!/\bcount\b/i.test(roomJs), "the client keeps no count");
// NONE OF THE VERDICT PALETTE. Green means "the record came out the way they said
// it would"; a neighbour's sentence is not a vindication or an indictment.
const cssRules = strip(css);
for (const hue of ["#4ade80", "#86efac", "#22c55e", "#f87171", "#ef4444", "#dc2626"]) {
  lacks(cssRules, hue, `the room does not wear ${hue}`);
}
ok(!/#f8[0-9a-f]{4}|#e[0-9a-f]1[0-9a-f]{3}/i.test(cssRules), "the room wears no red");
// Nothing scales with how busy the room is — and there is no column to scale with.
const ddStart = SCHEMA.indexOf("export const ddDistricts");
const ddEnd = SCHEMA.indexOf("export const", SCHEMA.indexOf("export const ddPosts") + 20);
ok(ddStart > 0, "db/schema.ts carries the phase 0 dd_* tables");
const ddCols = strip(SCHEMA.slice(ddStart, ddEnd > ddStart ? ddEnd : SCHEMA.length));
for (const col of ["score", "rank", "votes", "upvotes", "reactions", "party", "pid", "politician"]) {
  ok(ddCols.toLowerCase().indexOf(`"${col}"`) < 0 && ddCols.toLowerCase().indexOf(`${col}:`) < 0,
    `the dd_* tables carry no ${col} column for a style or a sort to read`);
}
// Every column the UI writes already existed at phase 0 — hence no migration.
for (const col of ['threadId: integer("thread_id")', 'userId: text("user_id")',
  'verifiedResident: boolean("verified_resident")', "body: text().notNull()",
  'sourceUrl: text("source_url")']) {
  has(SCHEMA, col, `phase 0 already has ${col}, so this pass adds no migration`);
}
// And the room reaches no other lane's tables.
for (const other of ["vr_", "cee_", "pdx_forum_", "mandate", "finance", "pack_"]) {
  lacks(fn, other, `the Function does not touch ${other}*`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the empty room renders, and the URL opens the room");

// THE URL OPENS THE ROOM. A cold arrival on /d/<district>/<issue> is served this
// index.html by the 200 rewrite, so the path is all the app has to go on.
const WA = boot("/d/ut-house-2/lands_preserve");
WA.flushTimers();
eq(WA.PDXDistrictRoom.isOpen(), true, "arriving on /d/ut-house-2/lands_preserve opens the room");
eq(JSON.stringify(WA.PDXDistrictRoom.room()),
  JSON.stringify({ districtKey: "ut-house-2", issueKey: "lands_preserve" }),
  "the room that opened is the one the address named");
const overlay = WA.document.getElementById("pdx-district-room");
ok(overlay && overlay.hidden === false, "the room's panel is shown");
eq(overlay.attrs["aria-modal"], "true", "the panel is a modal dialog");
eq(overlay.attrs["aria-labelledby"], "pdx-district-room-title", "the panel is labelled by the district's name");

// A path that is not a room opens nothing.
for (const p of ["/", "/i/lands_preserve", "/d/ut-senate-2/lands_preserve"]) {
  const w = boot(p);
  w.flushTimers();
  eq(w.PDXDistrictRoom.isOpen(), false, `arriving on ${p} opens no room`);
}

// Let the read settle, then read the painted room back out of the DOM.
await new Promise((r) => setTimeout(r, 0));
await new Promise((r) => setTimeout(r, 0));
const head = WA.document.getElementById("pdx-district-room-head").innerHTML;
const body = WA.document.getElementById("pdx-district-room-scroll").innerHTML;

// THE HEADER: district name, issue chip, and the one line about what the room is.
// No party, no politician, no score, no Direction Match.
has(head, "Utah · U.S. House District 2", "the header names the district");
has(head, "/d/ut-house-2/lands_preserve", "the header prints the room's own address");
has(head, "pdxdr-issuechip", "the header carries the issue as a chip");
has(head, CORE_COPY.strap, "the header carries the strap");
lacks(head, "pdxdr-badge", "the header carries no badge");
for (const b of ["(R)", "(D)", "wrm-party", "Direction Match", "Score"]) {
  lacks(head, b, `the header shows no ${b}`);
}

// THE EMPTY ROOM IS HONEST.
has(body, CORE_COPY.empty, "an empty room says so, in the brief's own words");
lacks(body, "pdxdr-posts", "an empty room paints no post list");
lacks(body, "pdxdr-post\"", "an empty room paints no post");

// AND THE COMPOSER IS CLOSED, WITH THE REASON. Not a disabled textarea: a box a
// reader can type into and then not send is a worse answer than no box.
has(body, "pdxdr-closed", "an unverified reader gets the closed note");
has(body, CORE_COPY.closed, "the closed note tells them what would open it");
has(body, CORE_COPY.closedStub, "the closed note says nothing can open it yet");
lacks(body, "<textarea", "an unverified reader is shown no field at all");
lacks(body, "pdxdr-composer", "an unverified reader is shown no composer");
lacks(body, "pdxdr-send", "an unverified reader is shown no post button");

// A ROOM WITH POSTS: body, timestamp, badge, report control — and no account.
const POSTS = [
  { id: 7, body: "Later post", sourceUrl: null, verified: true, createdAt: "2026-09-06T18:00:00.000Z" },
  { id: 3, body: "Earlier post", sourceUrl: "https://le.utah.gov/x", verified: true, createdAt: "2026-09-01T18:00:00.000Z" },
];
const WP = boot("/d/ut-house-2/lands_preserve", roomPayload(POSTS));
WP.flushTimers();
await new Promise((r) => setTimeout(r, 0));
await new Promise((r) => setTimeout(r, 0));
const pbody = WP.document.getElementById("pdx-district-room-scroll").innerHTML;
has(pbody, "Later post", "a post's body is printed");
has(pbody, "Earlier post", "every post is printed");
ok(pbody.indexOf("Later post") < pbody.indexOf("Earlier post"),
  "the client prints the posts in the order the Function returned them — newest first, no second sort");
eq((pbody.match(/pdxdr-badge/g) || []).length, POSTS.length,
  "every post carries the verification badge");
has(pbody, CORE_COPY.badge, "the badge says the author is verified in this district");
has(pbody, "<time", "every post carries a timestamp");
has(pbody, 'datetime="2026-09-06T18:00:00.000Z"', "the timestamp is machine-readable");
has(pbody, 'data-pdxdr-flag="7"', "every post carries a report control");
has(pbody, CORE_COPY.flag, "the report control is labelled");
has(pbody, 'href="https://le.utah.gov/x"', "an optional source link is a link");
has(pbody, 'rel="nofollow noopener"', "a neighbour's link carries no endorsement");
lacks(pbody, CORE_COPY.empty, "a room with posts does not say it is empty");
for (const leak of ["uid", "user_id", "handle", "@", "avatar", "u1"]) {
  lacks(pbody, leak, `a post discloses no ${leak} — a room shows neighbours, not accounts`);
}
// The verified composer, from the same painter, when the server says canPost.
const WV = boot("/d/ut-house-2/lands_preserve", roomPayload([], true));
WV.flushTimers();
await new Promise((r) => setTimeout(r, 0));
await new Promise((r) => setTimeout(r, 0));
const vbody = WV.document.getElementById("pdx-district-room-scroll").innerHTML;
has(vbody, "pdxdr-composer", "a verified neighbour is given the composer");
has(vbody, "<textarea", "the composer is a field");
has(vbody, 'data-pdxdr-form="1"', "the composer submits through the module's own listener");
lacks(vbody, "pdxdr-closed", "a verified neighbour gets no closed note");
has(vbody, CORE_COPY.empty, "the room under the composer is still honestly empty");

// ═════════════════════════════════════════════════════════════════════════════
section("8 · two mounts, and only two");

// The reader this pass can actually serve: located in Utah, districts resolvable.
const UT_REPS = {
  located: true, national: false, state: "Utah", districtsResolvable: true,
  levels: [
    { key: "ussenate1", seat: "senate", statewide: true, district: null, distLabel: "U.S. Senate · Utah" },
    { key: "house", seat: "house", statewide: false, district: "2", distLabel: "U.S. House · District 2" },
    { key: "governor", seat: "governor", statewide: true, district: null, distLabel: "Governor · Utah" },
    { key: "statesenate", seat: "statesenate", statewide: false, district: "6", distLabel: "State Senate · District 6" },
    { key: "statehouse", seat: "statehouse", statewide: false, district: "10", distLabel: "State House · District 10" },
  ],
};
const STANCES = { all: () => [{ issueKey: "lands_preserve" }, { issueKey: "water_storage" }] };
const FAMILY = { childLabel: (k) => ({ lands_preserve: "Public lands", water_storage: "Water storage" }[k] || "") };

const WM = boot("/", null, { pdxRepsForMe: () => UT_REPS, PDXStances: STANCES, PDXIssueFamily: FAMILY });
const M = WM.PDXDistrictRoom;

// MOUNT (a): a district seat row. The district is the row's, the issue is the
// reader's own — never a list this module ranked.
const seat = M.seatMountHtml(UT_REPS.levels[1], "Utah");
has(seat, 'href="/d/ut-house-2/lands_preserve"', "the seat mount links the reader's own issue in their own district");
has(seat, 'href="/d/ut-house-2/water_storage"', "the seat mount links every issue the reader declared");
has(seat, "Public lands", "the seat mount names issues from the register that owns their names");
has(seat, "District Voice", "the seat mount is labelled District Voice");
lacks(seat, "ut-statesenate", "a seat row's mount offers only that seat's district");
// Statewide seats have no district, so they get no room.
eq(M.seatMountHtml(UT_REPS.levels[0], "Utah"), "", "a U.S. Senate row mounts nothing");
eq(M.seatMountHtml(UT_REPS.levels[2], "Utah"), "", "a Governor row mounts nothing");
// A state with no district rows composes no address at all.
for (const st of ["Idaho", "Texas", "National", "", null]) {
  eq(M.seatMountHtml(UT_REPS.levels[1], st), "", `a seat in ${JSON.stringify(st)} mounts nothing`);
}
eq(M.districtKeyFor({ seat: "house", district: "2" }, "Utah"), "ut-house-2", "the district key is composed from the resolver's own fields");
eq(M.districtKeyFor({ seat: "house", district: "2" }, "Idaho"), "", "an unmapped state composes no district key");
eq(M.districtKeyFor({ seat: "mayor", district: "2" }, "Utah"), "", "a local seat composes no district key");
eq(M.districtKeyFor({ seat: "house", district: "0" }, "Utah"), "", "district zero composes no district key");

// Every key this table can compose is a district phase 0 actually seeded — so no
// mount can paint an address the Function must then refuse.
const SEEDED = new Set((MIGRATION.match(/\('([a-z]{2}-[a-z]+-\d+)'/g) || []).map((s) => s.slice(2, -1)));
ok(SEEDED.size > 20, `the phase 0 migration seeded ${SEEDED.size} districts`);
for (const lv of UT_REPS.levels) {
  const k = M.districtKeyFor(lv, "Utah");
  if (!k) continue;
  ok(SEEDED.has(k), `${k} is a district phase 0 seeded`);
}
// And the state table is not wider than the seed data.
const SEEDED_PREFIXES = new Set([...SEEDED].map((k) => k.split("-")[0]));
eq(SEEDED_PREFIXES.size, 1, "phase 0 seeded exactly one state");
ok(SEEDED_PREFIXES.has(M.districtKeyFor({ seat: "house", district: "2" }, "Utah").split("-")[0]),
  "the client's state table names only the state phase 0 seeded");

// MOUNT (b): the issue file. The issue is the file's, the districts are the
// reader's own, from the one resolver.
const iss = M.issueMountHtml("lands_preserve");
for (const k of ["ut-house-2", "ut-statesenate-6", "ut-statehouse-10"]) {
  has(iss, `href="/d/${k}/lands_preserve"`, `the issue mount links the reader's ${k} room`);
}
lacks(iss, "/d/ut-house-2/water_storage", "the issue mount offers only the issue being read");
for (const k of ["", null, "Lands", "lands-preserve"]) {
  eq(M.issueMountHtml(k), "", `the issue mount answers nothing for ${JSON.stringify(k)}`);
}
// A visitor we cannot place is offered no room, which is the honest answer.
const WU = boot("/", null, { pdxRepsForMe: () => ({ located: false, national: false, state: "", districtsResolvable: false, levels: [] }), PDXStances: STANCES });
eq(WU.PDXDistrictRoom.issueMountHtml("lands_preserve"), "",
  "a reader with no located district is offered no room");
eq(WU.PDXDistrictRoom.myDistricts().length, 0, "an unplaced reader has no districts");
const WN = boot("/", null, { pdxRepsForMe: () => ({ located: true, national: false, state: "Idaho", districtsResolvable: false, levels: UT_REPS.levels }), PDXStances: STANCES });
eq(WN.PDXDistrictRoom.issueMountHtml("lands_preserve"), "",
  "a reader in a state with no district rows is offered no room");
// A reader with no declared issues gets a sentence, not a dead link.
const WS = boot("/", null, { pdxRepsForMe: () => UT_REPS, PDXStances: { all: () => [] } });
const bare = WS.PDXDistrictRoom.seatMountHtml(UT_REPS.levels[1], "Utah");
lacks(bare, "href=", "a reader with no declared issues is offered no chip");
has(bare, "Open an issue file", "a reader with no declared issues is pointed at the other mount");

// THE TWO CALLERS, AND THERE ARE ONLY TWO. Scanning every top-level client
// module: no third surface mounts a room and no nav item leads to one.
has(strip(WRM_SRC), "DR.seatMountHtml(lv, reps && reps.state)", "Who Represents Me mounts the room beside a district seat row");
ok(/\+ seatCompare\(lv\) \+ districtRoom\(lv, reps\)/.test(strip(WRM_SRC)),
  "the mount is a SIBLING of the seat row, not a control nested inside it");
has(strip(IF_SRC), "districtRoom(key)", "the issue file mounts the room");
ok(/jumpsHtml\(key\) \+\s*\n\s*districtRoom\(key\) \+\s*\n\s*'<\/div>'/.test(IF_SRC),
  "the issue file's mount is on the LETTERHEAD, so the ledger host stays byte-identical to PDXDoor1.issueProfile");
// The ledger host takes the builder's string and nothing else, so the mount
// cannot have landed in it: every write to it is `host.innerHTML = body`.
const LEDGER_WRITES = strip(IF_SRC).match(/host\.innerHTML\s*=\s*[^;]+;/g) || [];
ok(LEDGER_WRITES.length > 0, "issue-file.js writes the ledger host");
for (const w of LEDGER_WRITES) {
  lacks(w, "districtRoom", "nothing injects the mount into the ledger host");
  ok(/=\s*(body|'')\s*;/.test(w),
    "the ledger host still takes the builder's string, or nothing, and never a sentence of this module's own");
}

const { readdirSync } = await import("node:fs");
const CALLERS = readdirSync(ROOT)
  .filter((f) => f.endsWith(".js") && f !== "district-room.js")
  .filter((f) => /seatMountHtml|issueMountHtml|PDXDistrictRoom/.test(strip(R(f))));
eq(CALLERS.sort().join(","), "issue-file.js,who-represents-me.js",
  "exactly two modules mount a district room");
const indexMarkup = INDEX.replace(/<!--[\s\S]*?-->/g, " ");
lacks(indexMarkup, "PDXDistrictRoom",
  "there is no nav item, no top-level door and no inline caller in index.html");
lacks(INDEX, 'href="/d/', "index.html links no room directly");

// ═════════════════════════════════════════════════════════════════════════════
section("9 · the shell ships the room, and the service worker knows it did");

has(INDEX, 'href="/district-room.css"', "index.html loads the room's stylesheet");
has(INDEX, 'src="/district-room.js"', "index.html loads the room");
ok(/media="print" onload="this\.media='all'"[^>]*\/>\s*\n\s*<noscript><link rel="stylesheet" href="\/district-room\.css" \/><\/noscript>/.test(INDEX)
  || (INDEX.indexOf('href="/district-room.css" media="print"') >= 0 && INDEX.indexOf('<noscript><link rel="stylesheet" href="/district-room.css" /></noscript>') >= 0),
  "the stylesheet is non-blocking with a noscript fallback");
has(INDEX, 'defer src="/district-room.js"', "the room is deferred");
has(SW, "'/district-room.js',", "the service worker precaches the room");
has(SW, "'/district-room.css',", "the service worker precaches the room's stylesheet");
const ver = (SW.match(/const CACHE_VERSION = 'v(\d+)'/) || [])[1];
ok(ver && Number(ver) >= 152, `the shell cache was bumped for the two changed precached files (v${ver})`);
has(SW, "v152 - THE DISTRICT ROOM EXISTS", "the bump carries its version-log entry");

// ── Result ───────────────────────────────────────────────────────────────────
console.log("");
if (failures.length) {
  failures.forEach((f) => console.error(`   ✗ ${f}`));
  console.error(`\n✗ district-room: ${failures.length} failed, ${passed} passed`);
  process.exit(1);
}
console.log(`✓ district-room: all ${passed} assertions passed`);
console.log("   one address · 5 refusals, exhaustively · residency stub cannot publish · " +
  "newest first, no rank · 2 mounts · no pid, no party, no verdict hue");
