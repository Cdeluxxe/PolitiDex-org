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
//   4. RESIDENCY IS A FACT, AND ONLY A REVIEWER'S ROW OPENS A COMPOSER. Phase 2
//      replaces the stub with a read of dd_residency. Pending cannot write.
//      Revoked cannot write. A row verified for another district cannot write. A
//      location pin cannot write even if something marks it verified. An admin
//      grant is the only method that reaches verified in this pass, and the ID
//      vendor is a seam nothing calls.
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
  POLL_CHOICES,
  RESIDENCY_METHODS,
  RESIDENCY_METHODS_NEVER_VERIFY,
  RESIDENCY_METHODS_VERIFYING,
  RESIDENCY_STATES,
  RESIDENCY_STATUSES,
  RESIDENCY_VERIFIER,
  ROOM_PATH_RE,
  ROOM_PREFIX,
  composerState,
  decideVote,
  decideWrite,
  normalizeBody,
  normalizeChoice,
  normalizeSourceUrl,
  pollOptions,
  pollResultLine,
  pollState,
  pollTally,
  residencyClaim,
  residencyNote,
  residencyStateAllowed,
  roomFromPath,
  roomPath,
  verifyVendor,
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
// Phase 2's own migration — the residency table the gate now reads.
const MIGRATION_DIR = "netlify/database/migrations";
const RESIDENCY_MIGRATION_ID = "20261030000000_create_dd_residency";
const MIGRATION2 = R(`${MIGRATION_DIR}/${RESIDENCY_MIGRATION_ID}/migration.sql`);

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
  // Real-enough DELAYS too: a flush runs only the timers that are actually due,
  // so district-room.js's auth safety deadline is not fired by the same flush
  // that runs the arrival boot's setTimeout(…, 0). flushTimers(ms) opts in.
  const queue = [];
  win.setTimeout = (f, ms) => { queue.push({ f, ms: Number(ms) || 0 }); return queue.length; };
  win.clearTimeout = () => {};
  win.document = doc;
  win.location = { href: "https://www.politidex.fyi" + pathname, pathname, search: "", hash: "", origin: "https://www.politidex.fyi" };
  win.history = { pushState() {}, replaceState() {} };
  win.flushTimers = (maxDelay) => {
    const cap = maxDelay == null ? 0 : maxDelay;
    const due = [];
    for (let i = queue.length - 1; i >= 0; i--) {
      if (queue[i].ms <= cap) due.unshift(queue.splice(i, 1)[0]);
    }
    due.forEach((t) => { try { t.f(); } catch (e) {} });
  };
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

// `payload` is either the object every call answers with, or a function of
// (url, init) returning { status, data } so a test can answer one route
// differently from another. Every request the module makes is recorded on
// win.__calls, which is how "the standing read carried the reader's token" is
// observed rather than asserted about source text.
function boot(pathname, payload, extras) {
  const win = makeDom(pathname || "/");
  win.__calls = [];
  win.fetch = (url, init) => {
    win.__calls.push({ url: String(url), init: init || {} });
    const answered = typeof payload === "function" ? payload(String(url), init || {}) : null;
    const status = (answered && answered.status) || 200;
    const data = answered ? answered.data : (payload || roomPayload([]));
    return Promise.resolve({
      ok: status < 400,
      status,
      json: () => Promise.resolve(data),
    });
  };
  Object.assign(win, extras || {});
  vm.runInContext(ROOM_SRC, vm.createContext(win), { filename: "district-room.js" });
  return win;
}

// ═════════════════════════════════════════════════════════════════════════════
// A FAKE FIREBASE AUTH, and it is exactly the two members district-room.js
// reads: `currentUser` and `onAuthStateChanged`. `late: true` withholds the
// first callback so a test can fire it after the room has already opened —
// which is the production sequence a cold arrival at /d/* actually takes.
function fakeAuth(user, opts) {
  const o = opts || {};
  const cbs = [];
  const a = {
    currentUser: o.late ? null : (user || null),
    onAuthStateChanged(cb) {
      cbs.push(cb);
      if (!o.late) { try { cb(a.currentUser); } catch { /* the module guards */ } }
      return () => {};
    },
    fire(u) {
      a.currentUser = u || null;
      cbs.slice().forEach((cb) => { try { cb(a.currentUser); } catch { /* guarded */ } });
    },
  };
  return a;
}
// The account the nav chip paints: a uid and an email, and not the anonymous
// session. `tokens` records every mint so a forced refresh is visible.
function chipAccount(email) {
  const tokens = [];
  return {
    uid: "uid-chip-1",
    email: email || "clreber@gmail.com",
    isAnonymous: false,
    tokens,
    getIdToken(force) { tokens.push(!!force); return Promise.resolve(force ? "tok-fresh" : "tok-1"); },
  };
}
function anonAccount() {
  return {
    uid: "uid-anon-1",
    email: null,
    isAnonymous: true,
    getIdToken() { return Promise.resolve("tok-anon"); },
  };
}
const bearerOf = (call) => {
  const h = (call && call.init && call.init.headers) || {};
  return String(h.Authorization || h.authorization || "");
};

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
eq(signedOut.message, CORE_COPY.closedSignedOut,
  "a signed-out caller is told to sign in first, and that reading is open");
eq(signedOut.reason, "signed_out", "a signed-out caller's refusal carries the finer reason");

const anon = decideWrite({ district: UT2, issueKey: ISSUE, residency: residencyClaim({ uid: "a", isAnonymous: true }), body: BODY });
eq(anon.ok, false, "an anonymous session cannot write");
eq(anon.status, 401, "an anonymous session is refused 401");

const unverified = decideWrite({ district: UT2, issueKey: ISSUE, residency: residencyClaim({ uid: "u1" }), body: BODY });
eq(unverified.ok, false, "a signed-in but unverified caller cannot write");
eq(unverified.status, 403, "an unverified caller is refused 403");
eq(unverified.code, "not_verified", "an unverified caller is refused as not_verified");
eq(unverified.message, `${CORE_COPY.closed} ${CORE_COPY.closedNoResidency}`,
  "an unverified caller is told what would open the composer, and that nothing is established");
eq(unverified.reason, "no_residency", "an unverified caller's refusal names the missing row");

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
section("4 · residency is a fact, and only a reviewer's row opens a composer");

// THE ROW SHAPES the gate will be handed. `districtKey` on a claim is always the
// ROW's district — the room's key never leaks into it — so a claim can only open
// the room it was established for.
const HERE = "ut-house-2";
const ADMIN_VERIFIED = { districtKey: HERE, status: "verified", method: "admin_grant" };
const ADMIN_VERIFIED_THERE = { districtKey: "ut-house-1", status: "verified", method: "admin_grant" };
const SELF_PENDING = { districtKey: HERE, status: "pending", method: "self_attest" };
const ADMIN_REVOKED = { districtKey: HERE, status: "revoked", method: "admin_grant" };
// The row nothing writes today, spelled out anyway: a location pin marked
// verified. It must not publish, and that has to be a property of the gate
// rather than a promise about which routes exist.
const PIN_VERIFIED = { districtKey: HERE, status: "verified", method: "location_pin" };
const SELF_VERIFIED = { districtKey: HERE, status: "verified", method: "self_attest" };
const U = { uid: "u1", isAnonymous: false };
const write = (residency, district) =>
  decideWrite({ district: district || UT2, issueKey: ISSUE, residency, body: BODY });

// ── THE VOCABULARY, AND WHICH HALF OF IT CAN VERIFY ───────────────────────
eq(RESIDENCY_STATUSES.join(","), "pending,verified,revoked",
  "the three residency states are pending, verified and revoked");
eq(RESIDENCY_METHODS_VERIFYING.join(","), "admin_grant,vendor",
  "only an admin grant or a vendor check can carry a verified status");
eq(RESIDENCY_METHODS_NEVER_VERIFY.join(","), "self_attest,location_pin",
  "a self-attested request and a location pin can never verify");
for (const m of RESIDENCY_METHODS_NEVER_VERIFY) {
  ok(RESIDENCY_METHODS_VERIFYING.indexOf(m) < 0, `${m} is not a verifying method`);
}
for (const m of RESIDENCY_METHODS_VERIFYING.concat(RESIDENCY_METHODS_NEVER_VERIFY)) {
  ok(RESIDENCY_METHODS.indexOf(m) >= 0, `${m} is one of the recorded methods`);
}

// ── SIGNED OUT AND ANONYMOUS: NO ROW CAN HELP THEM ────────────────────────
// Residency is keyed on a verified uid, so a caller the server cannot name has
// nothing to be verified about — and handing the resolver a verified row anyway
// changes nothing.
for (const u of [null, undefined, { uid: "a", isAnonymous: true }]) {
  const c = residencyClaim(u, ADMIN_VERIFIED);
  eq(c.verified, false, `a caller of ${JSON.stringify(u)} is not verified even with a row`);
  eq(c.reason, "signed_out", "and the reason is that they are signed out");
  eq(c.districtKey, null, "a signed-out caller claims no district");
  eq(write(c).status, 401, "a signed-out caller is refused 401");
}

// ── SIGNED IN, NO ROW: NOTHING IS ESTABLISHED ─────────────────────────────
for (const r of [null, undefined, {}, { districtKey: HERE }, { status: "verified" },
  { districtKey: "", status: "verified", method: "admin_grant" },
  { districtKey: "ut-senate-2", status: "verified", method: "admin_grant" }]) {
  const c = residencyClaim(U, r);
  eq(c.verified, false, `a row of ${JSON.stringify(r)} establishes nothing`);
  eq(c.districtKey, null, "and it claims no district");
  eq(write(c).ok, false, "so the caller cannot write");
}
eq(residencyClaim(U, null).reason, "no_residency", "no row is reported as no residency");

// ── PENDING CANNOT WRITE ──────────────────────────────────────────────────
// The brief's first test, and the one the copy has to get right: a request in
// the queue is told it is pending, not told to go and verify.
const pending = residencyClaim(U, SELF_PENDING);
eq(pending.verified, false, "a pending row cannot verify");
eq(pending.status, "pending", "a pending row is reported as pending");
eq(pending.reason, "pending", "and the reason is pending rather than a generic refusal");
eq(pending.districtKey, null, "a pending row claims no district");
const pendingWrite = write(pending);
eq(pendingWrite.ok, false, "PENDING CANNOT WRITE");
eq(pendingWrite.status, 403, "a pending caller is refused 403");
eq(pendingWrite.code, "not_verified", "the Phase 1 gate code is unchanged");
eq(pendingWrite.reason, "pending", "and the refusal carries the finer reason");
eq(pendingWrite.message, CORE_COPY.pending, "a pending caller is told their request is pending");
has(CORE_COPY.pending, "pending", "the pending sentence says pending");
lacks(CORE_COPY.pending.toLowerCase(), "you are verified", "the pending sentence never says verified");
const pendingComposer = composerState(pending, HERE);
eq(pendingComposer.canPost, false, "a pending row does not open the composer");
eq(pendingComposer.note, CORE_COPY.pending, "and the closed note says pending");
lacks(pendingComposer.note, CORE_COPY.badge, "a pending reader is never shown the badge copy");

// ── REVOKED CANNOT WRITE ──────────────────────────────────────────────────
const revoked = residencyClaim(U, ADMIN_REVOKED);
eq(revoked.verified, false, "a revoked row cannot verify");
eq(revoked.reason, "revoked", "a revoked row is reported as revoked");
const revokedWrite = write(revoked);
eq(revokedWrite.ok, false, "REVOKED CANNOT WRITE");
eq(revokedWrite.status, 403, "a revoked caller is refused 403");
eq(revokedWrite.message, CORE_COPY.revoked, "a revoked caller is told their residency was revoked");
eq(composerState(revoked, HERE).canPost, false, "a revoked row does not open the composer");
has(CORE_COPY.revoked, "read here but not post", "a revoked reader is told they may still read");

// ── A LOCATION PIN ALONE CANNOT WRITE ─────────────────────────────────────
// window._currentVoterLocation is a zip or pin the reader typed, and the whole
// point of this table is that it is not evidence of residence. Even a row that
// somehow carries status 'verified' by that method cannot publish.
for (const [name, row] of [["a location pin", PIN_VERIFIED], ["a self-attestation", SELF_VERIFIED]]) {
  const c = residencyClaim(U, row);
  eq(c.verified, false, `${name} marked verified still cannot verify`);
  eq(c.districtKey, null, `${name} claims no district`);
  eq(write(c).ok, false, `${name.toUpperCase()} ALONE CANNOT WRITE`);
  eq(composerState(c, HERE).canPost, false, `${name} does not open the composer`);
}
// And the gate never reads a location at all.
for (const forbidden of ["_currentVoterLocation", "voterLocation", "zip", "latitude", "longitude"]) {
  lacks(strip(CORE_SRC), forbidden, `the gate does not read ${forbidden}`);
}

// ── VERIFIED FOR THE WRONG DISTRICT CANNOT WRITE ──────────────────────────
const there = residencyClaim(U, ADMIN_VERIFIED_THERE);
eq(there.verified, true, "a row verified in UT-1 is a verified row");
eq(there.districtKey, "ut-house-1", "and it claims UT-1, not the room it was asked about");
const thereWrite = write(there);
eq(thereWrite.ok, false, "VERIFIED FOR THE WRONG DISTRICT CANNOT WRITE");
eq(thereWrite.status, 403, "the wrong district is refused 403");
eq(thereWrite.code, "wrong_district", "the wrong district keeps its Phase 1 gate code");
eq(composerState(there, HERE).canPost, false, "a claim for another district opens no composer");
eq(composerState(there, HERE).note, CORE_COPY.wrongDistrict,
  "and the note says they are verified somewhere else");

// ── VERIFIED FOR THIS DISTRICT CAN WRITE ──────────────────────────────────
// The one path that publishes, and it is an admin grant.
const here = residencyClaim(U, ADMIN_VERIFIED);
eq(here.verified, true, "an admin-granted row for this district verifies");
eq(here.districtKey, HERE, "and the claim carries the row's district");
eq(here.method, "admin_grant", "and it remembers how that was established");
const hereWrite = write(here);
eq(hereWrite.ok, true, "VERIFIED FOR THIS DISTRICT CAN WRITE");
eq(hereWrite.districtKey, HERE, "the allow carries the room's district");
eq(composerState(here, HERE).canPost, true, "and the composer opens");
eq(composerState(here, HERE).note, "", "an open composer carries no closed note");
// The vendor method is honoured by the gate — that is the seam — and no row in
// this pass has it, because nothing writes one.
eq(residencyClaim(U, { districtKey: HERE, status: "verified", method: "vendor" }).verified, true,
  "the gate would honour a vendor check, which is what makes the seam real");

// ── ADMIN GRANT IS THE ONLY WAY STATUS BECOMES VERIFIED IN THIS PASS ──────
// Checked at the only two places that can write the column: the attest route
// hard-codes 'pending' and the grant route is behind the reviewer check.
const fnSrc = strip(FN_SRC);
has(fnSrc, 'status: "pending"', "the self-attest route writes pending and nothing else");
ok(/attestResidency[\s\S]*?status:\s*"pending"/.test(fnSrc),
  "the pending literal is inside the self-attest route");
// The request route INSERTS and loses a conflict; only the reviewer's route
// UPDATES an existing row. So a repeat request cannot change a decided row, and
// there is exactly one statement in the file capable of setting a status.
//
// Counted per STATEMENT and per TABLE rather than per file. Phase 3 added a
// second upsert — a poll vote, because that is how "one vote per person, and
// changing it replaces it" is spelled — so a file-wide count of the word would
// now say two and mean nothing about residency.
const insertStmts = fnSrc.split("insert(").slice(1).map((chunk) => {
  const stmt = chunk.split(";")[0];
  return { table: stmt.slice(0, stmt.indexOf(")")), upsert: stmt.indexOf("onConflictDoUpdate") >= 0 };
});
eq(insertStmts.filter((i) => i.table === "ddResidency" && i.upsert).length, 1,
  "exactly one statement can change an existing residency row");
ok(/grantResidency[\s\S]*?insert\(ddResidency\)[\s\S]*?onConflictDoUpdate/.test(fnSrc),
  "and it is inside the reviewer's route");
eq(insertStmts.filter((i) => i.upsert).map((i) => i.table).sort().join(","),
  "ddPollVotes,ddResidency",
  "the only two upserts in the file are the reviewer's decision and a poll vote");
ok(/attestResidency[\s\S]*?insert\(ddResidency\)[\s\S]*?onConflictDoNothing\(\)/.test(fnSrc),
  "a repeat self-attest loses the conflict rather than rewriting a decided row");
eq((fnSrc.match(/insert\(ddResidency\)/g) || []).length, 2,
  "there are exactly two writes to dd_residency: the request and the decision");
has(fnSrc, "viewer.isModerator", "the grant route is behind the reviewer check");
ok(/if \(!viewer\.isModerator\)[\s\S]*?403/.test(fnSrc),
  "a caller who is not a reviewer is refused 403");
ok(fnSrc.indexOf("viewer.isModerator") < fnSrc.indexOf("onConflictDoUpdate"),
  "the reviewer check comes before the upsert that sets verified");
// The status a reviewer may set is bounded, and 'pending' is not one of them —
// pending is what a request already is, not a decision.
has(fnSrc, 'decided !== "verified" && decided !== "revoked"',
  "a reviewer may only mark somebody verified or revoked");
// And no route takes a method off the request: both literals are in the source.
has(fnSrc, 'method: "self_attest"', "the request route records its own method");
has(fnSrc, 'method: "admin_grant"', "the grant route records its own method");
lacks(fnSrc, "method: payload", "no caller chooses the method their row is recorded with");
lacks(fnSrc, "payload?.method", "no caller chooses the method their row is recorded with");
lacks(fnSrc, "payload?.verified", "no caller asserts their own verification");

// ── THE VENDOR SEAM EXISTS AND IS UNUSED ──────────────────────────────────
eq(RESIDENCY_VERIFIER, null, "no residency vendor is wired in this pass");
eq(typeof verifyVendor, "function", "the vendor seam is a single function");
let threw = false;
try { verifyVendor(); } catch { threw = true; }
ok(threw, "the unwired vendor seam throws rather than quietly answering");
lacks(fnSrc, "verifyVendor", "the Function does not call the vendor seam");
lacks(strip(ROOM_SRC), "verifyVendor", "the client does not call the vendor seam");
for (const vendor of ["stripe", "veriff", "persona", "onfido", "idenfy", "plaid"]) {
  lacks(strip(CORE_SRC).toLowerCase(), vendor, `the gate calls no ${vendor}`);
  lacks(fnSrc.toLowerCase(), vendor, `the Function calls no ${vendor}`);
  lacks(strip(ROOM_SRC).toLowerCase(), vendor, `the client calls no ${vendor}`);
}

// ── UTAH ONLY IN THIS PASS, SAID AS A SENTENCE ────────────────────────────
eq(RESIDENCY_STATES.join(","), "UT", "Utah is the only state this pass verifies in");
for (const st of ["UT", "ut", " Ut "]) {
  eq(residencyStateAllowed(st), true, `${JSON.stringify(st)} is in scope`);
}
for (const st of ["ID", "NV", "WY", "AZ", "CO", "", null, undefined, "USA"]) {
  eq(residencyStateAllowed(st), false, `${JSON.stringify(st)} is out of scope`);
}
has(CORE_COPY.notInScope, "Utah", "the out-of-scope sentence names the state that is in scope");
has(CORE_COPY.notInScope, "cannot verify you", "and says plainly what it cannot do");
has(fnSrc, "residencyStateAllowed(district.state)",
  "both residency routes check the district's state against the one list");
has(fnSrc, "COPY.notInScope", "and refuse another state with that sentence");
// Every district key the gate could be handed is one dd_districts actually
// seeded, and every seeded row is Utah.
ok(/'ut-statehouse-68'/.test(MIGRATION), "dd_districts seeded ut-statehouse-68");
ok(!/\('(?!ut-)[a-z]{2}-/.test(MIGRATION), "dd_districts seeded no state but Utah");

// ── THE ROW THE GATE READS IS A REAL TABLE ────────────────────────────────
// Stamped AFTER the applied tail and after the migration that created the table
// it references — a mid-tree date would be rejected on deploy.
const applied = new Set([
  "20261028000000_vr_federal_wave_f11.sql",
  "20261029000000_create_dd_district_discussion_tables",
]);
for (const prior of applied) {
  ok(RESIDENCY_MIGRATION_ID > prior.replace(/\.sql$/, ""),
    `the residency migration sorts after ${prior}`);
}
ok(/^20261030000000_/.test(RESIDENCY_MIGRATION_ID),
  "the residency migration carries the hand-set version one past the tail");
for (const piece of [
  'CREATE TABLE IF NOT EXISTS "dd_residency"',
  '"user_id" text NOT NULL',
  '"district_key" text NOT NULL',
  `"status" text DEFAULT 'pending' NOT NULL`,
  '"method" text NOT NULL',
  '"created_at" timestamp with time zone',
  '"reviewed_at" timestamp with time zone',
  `CHECK ("status" in ('pending', 'verified', 'revoked'))`,
  'CREATE UNIQUE INDEX IF NOT EXISTS "dd_residency_user_district_unique"',
  'REFERENCES "dd_districts"("district_id")',
]) {
  has(MIGRATION2, piece, `the residency migration carries ${piece}`);
}
// It creates the table and alters nothing that already exists.
ok(!/ALTER TABLE "dd_(posts|threads|districts|issue_keys)"/.test(MIGRATION2),
  "the residency migration alters no phase 0 table");
ok(!/DROP |DELETE FROM |TRUNCATE /.test(MIGRATION2), "the residency migration destroys nothing");
// The schema says the same thing the migration does.
has(SCHEMA, 'export const ddResidency = pgTable(', "db/schema.ts carries the residency table");
for (const col of ['userId: text("user_id")', 'districtKey: text("district_key")',
  'status: text().notNull().default("pending")', "method: text().notNull()",
  'reviewedAt: timestamp("reviewed_at"', 'uniqueIndex("dd_residency_user_district_unique")']) {
  has(SCHEMA, col, `the residency table declares ${col}`);
}
// It is a fact about a district, not a profile.
const resStart = SCHEMA.indexOf("export const ddResidency");
const resCols = strip(SCHEMA.slice(resStart));
for (const nope of ["email", "name", "address", "zip", "postal", "latitude", "longitude",
  "document", "photo", "phone", "ssn", "dob"]) {
  ok(resCols.toLowerCase().indexOf(`"${nope}"`) < 0,
    `the residency table stores no ${nope}`);
}

// ── THE READ SIDE AND THE WRITE SIDE STILL CANNOT DISAGREE ────────────────
// Every row shape, through both halves. The composer is shown to exactly the
// callers the gate would accept, and to nobody else.
const ROWS = [null, {}, SELF_PENDING, ADMIN_REVOKED, PIN_VERIFIED, SELF_VERIFIED,
  ADMIN_VERIFIED, ADMIN_VERIFIED_THERE,
  { districtKey: HERE, status: "verified", method: "vendor" },
  { districtKey: HERE, status: "approved", method: "admin_grant" },
  { districtKey: HERE, status: "verified", method: "" },
  { districtKey: HERE, status: "verified" },
];
const USERS = [null, { uid: "a", isAnonymous: true }, U];
let opens = 0;
for (const u of USERS) for (const row of ROWS) for (const room of [HERE, "ut-house-1"]) {
  const c = residencyClaim(u, row);
  const canPost = composerState(c, room).canPost;
  const allowed = decideWrite({
    district: { districtKey: room }, issueKey: ISSUE, residency: c, body: BODY,
  }).ok === true;
  eq(canPost, allowed, "the composer is shown to exactly the callers the gate would accept");
  // A closed composer always carries a sentence, and never the badge.
  if (!canPost) {
    const note = composerState(c, room).note;
    ok(!!note, "a closed composer always carries a reason");
    lacks(note, CORE_COPY.badge, "a closed composer never wears the badge");
  }
  if (canPost) opens++;
}
// Only a verifying-method row, for the room it names, for a signed-in caller,
// opens anything: ut-house-2 by admin grant, ut-house-2 by vendor check, and
// ut-house-1 by admin grant in ITS own room. Three out of seventy-two.
eq(opens, 3, "exactly the verified-for-this-room rows open a composer, and no others");
// residencyNote() is the one owner of those sentences.
eq(residencyNote(residencyClaim(null, null)), CORE_COPY.closedSignedOut,
  "the signed-out sentence has one owner");
eq(residencyNote(pending), CORE_COPY.pending, "the pending sentence has one owner");
eq(residencyNote(revoked), CORE_COPY.revoked, "the revoked sentence has one owner");

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
// Every column a POST writes already existed at phase 0 — the only migration this
// pass adds is the residency table, which no post row touches.
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
has(body, CORE_COPY.closedNoResidency,
  "the closed note says nothing has been established, rather than dangling a verify that leads nowhere");
lacks(body, CORE_COPY.badge, "a reader who cannot post is shown no badge");
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

// ── THE TWO RESIDENCY CONTROLS, AS PAINTED ────────────────────────────────
// A reader the app can place in ut-house-2, so the self-attest control is
// offered for their OWN district and nothing else.
const MY_UT2 = {
  pdxRepsForMe: () => ({
    located: true, national: false, state: "Utah", districtsResolvable: true,
    levels: [{ key: "ushouse2", seat: "house", district: 2, distLabel: "Utah · U.S. House District 2" }],
  }),
};
function residencyPayload(res, extra) {
  const base = roomPayload([]);
  return Object.assign({}, base, extra || {}, {
    residency: Object.assign(
      {
        status: null, reason: "no_residency",
        canAttest: false, attest: CORE_COPY.attest, attestNote: CORE_COPY.attestNote,
        canGrant: false, grant: CORE_COPY.grant, outOfScopeNote: "",
      },
      res || {}
    ),
  });
}
async function paint(payload, extras) {
  const w = boot("/d/ut-house-2/lands_preserve", payload, extras);
  w.flushTimers();
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
  return w.document.getElementById("pdx-district-room-scroll").innerHTML;
}

// OFFERED, when the server says so AND the district is the reader's own.
const attestBody = await paint(residencyPayload({ canAttest: true }), MY_UT2);
has(attestBody, "data-pdxdr-attest", "a signed-in reader in their own district is offered the request");
has(attestBody, CORE_COPY.attest, "and the control says what they are claiming");
has(attestBody, CORE_COPY.attestNote, "and says plainly that saying it does not verify them");
lacks(attestBody, "pdxdr-composer", "the request is not a composer");
lacks(attestBody, "<textarea", "the request opens no field");
lacks(attestBody, CORE_COPY.badge, "the request does not print the badge");

// NOT OFFERED for a district the reader's own resolver does not place them in —
// nobody is invited to claim a district that is not theirs.
const notMine = await paint(residencyPayload({ canAttest: true }), {
  pdxRepsForMe: () => ({
    located: true, national: false, state: "Utah", districtsResolvable: true,
    levels: [{ key: "ushouse1", seat: "house", district: 1, distLabel: "Utah · U.S. House District 1" }],
  }),
});
lacks(notMine, "data-pdxdr-attest", "a district that is not the reader's own is not offered");
// NOT OFFERED at all when the server did not say so.
lacks(await paint(residencyPayload({ canAttest: false }), MY_UT2), "data-pdxdr-attest",
  "the client never offers the request on its own opinion");

// PENDING SAYS PENDING, and wears nothing.
const pendingPayload = residencyPayload(
  { status: "pending", reason: "pending", canAttest: false },
  { canPost: false, closedNote: CORE_COPY.pending }
);
const pendingBody = await paint(pendingPayload, MY_UT2);
has(pendingBody, CORE_COPY.pending, "a pending reader is told their request is pending");
lacks(pendingBody, CORE_COPY.badge, "a pending reader is shown no badge");
lacks(pendingBody, "pdxdr-composer", "a pending reader is shown no composer");
lacks(pendingBody, "data-pdxdr-attest", "a pending reader is not asked to request again");

// THE REVIEWER'S CONTROL, and it is not dressed as the request.
const grantBody = await paint(residencyPayload({ canGrant: true }), MY_UT2);
has(grantBody, "data-pdxdr-grant", "a reviewer is offered the grant");
has(grantBody, CORE_COPY.grant, "and it is labelled as a grant, not as a claim");
ok(CORE_COPY.grant !== CORE_COPY.attest, "the two paths are labelled differently");
lacks(await paint(residencyPayload({ canGrant: false }), MY_UT2), "data-pdxdr-grant",
  "a reader who is not a reviewer is offered no grant");

// OUT OF SCOPE IS A SENTENCE, not an absent control.
has(await paint(residencyPayload({ outOfScopeNote: CORE_COPY.notInScope }), MY_UT2),
  CORE_COPY.notInScope, "a district outside this pass's one state says so out loud");

// The client sends the request and the grant to their own routes and no others.
const roomSrc = strip(ROOM_SRC);
has(roomSrc, "'/residency/attest'", "the request goes to the attest route");
has(roomSrc, "'/residency/grant'", "the grant goes to the grant route");
ok(!/canPost\s*===\s*true[\s\S]{0,400}canAttest/.test(roomSrc),
  "no residency control is rendered inside an open composer");
lacks(roomSrc, "_currentVoterLocation", "the client never sends a self-typed location as residency");

// ═════════════════════════════════════════════════════════════════════════════
section("8 · the way in is the loud control, and the room has one poll");

// ── THE WAY IN IS THE PRIMARY CONTROL ─────────────────────────────────────
// Phase 2 shipped both residency controls side by side, and the reviewer's grant
// was the filled one. That put the loudest thing on the way into the room behind
// a permission almost nobody holds — a neighbour looking for "join the room"
// read a button they cannot press. The request is now the primary control, in
// the neighbour's own words, and the grant is a reviewer's tool in a footer
// under the conversation.
eq(CORE_COPY.attest, "Ask to be verified for this district",
  "the neighbour's control asks to be verified, in the brief's own words");
eq(CORE_COPY.grant, "Grant residency (reviewer)",
  "the reviewer's control says out loud who it is for");
has(CORE_COPY.grant.toLowerCase(), "reviewer", "the grant label names the reviewer");
lacks(CORE_COPY.attest.toLowerCase(), "grant", "the way in is not spelled as a grant");
// ASKING IS NOT BEING ANSWERED, and the copy for the request says so three times
// over: on the control, in the note under it, and in the reply after it is sent.
for (const [key, s] of [["attestNote", CORE_COPY.attestNote], ["attestSent", CORE_COPY.attestSent]]) {
  ok(/pending/i.test(s), `COPY.${key} says pending`);
  ok(/not verif|does not verif/i.test(s), `COPY.${key} says it is not a verification`);
}
lacks(CORE_COPY.attestSent.toLowerCase(), "verified you", "the reply to a request verifies nobody");

const askBody = await paint(residencyPayload({ canAttest: true }), MY_UT2);
has(askBody, "pdxdr-askbtn", "the request is painted as the room's primary control");
has(askBody, CORE_COPY.attest, "and it is labelled in the neighbour's own words");
lacks(askBody, "pdxdr-rev", "a neighbour who is not a reviewer gets no reviewer footer");
lacks(askBody, CORE_COPY.grant, "and never reads the grant label");
// The grant, when a reviewer is the one reading: below the posts, behind its own
// heading, and NOT where a neighbour looks for the way in.
const revBody = await paint(residencyPayload({ canGrant: true }), MY_UT2);
has(revBody, "pdxdr-rev", "a reviewer gets the reviewer footer");
has(revBody, CORE_COPY.reviewerTools, "and it is labelled as reviewer tools");
has(revBody, "data-pdxdr-grant", "and the grant lives inside it");
ok(revBody.indexOf("pdxdr-list") < revBody.indexOf("pdxdr-rev"),
  "the reviewer footer sits BELOW the conversation, not where the way in belongs");
// GRANT IS REVIEWER-ONLY, and it is gone entirely once the composer is open —
// nothing in a verified neighbour's room hints at a permission they do not have.
lacks(await paint(residencyPayload({ canGrant: false }), MY_UT2), CORE_COPY.grant,
  "a reader who is not a reviewer never reads the grant label");
lacks(await paint(residencyPayload({ canGrant: true }, { canPost: true }), MY_UT2),
  "data-pdxdr-grant", "a room with an open composer shows no grant");
// The two controls remain two different sentences on two different paths.
ok(CORE_COPY.grant !== CORE_COPY.attest, "the way in and the decision are labelled differently");
has(roomSrc, "'/residency/attest'", "the request still goes to the attest route");
has(roomSrc, "'/residency/grant'", "the grant still goes to the grant route");

// ── ONE POLL, THREE POLES, AND NOTHING ELSE ───────────────────────────────
// The question is FIXED COPY and the options are the same three poles as My
// Stances. Nobody composes a poll in this room, so there is no question field,
// no option field, and no fourth bucket for a custom answer to land in.
eq(CORE_COPY.pollQuestion, "On this issue in this district, where do you stand?",
  "the poll asks exactly what it was asked to ask");
eq(POLL_CHOICES.join(","), "support,oppose,mixed", "the three poles, and only three");
eq(POLL_CHOICES.length, 3, "there is no fourth option");
eq(pollOptions().map((o) => o.label).join(","), "Support,Oppose,Mixed",
  "the poles are labelled Support, Oppose and Mixed");
eq(pollOptions().map((o) => o.key).join(","), POLL_CHOICES.join(","),
  "the painted options are the gate's own list, so a caller cannot add one");
// NO PARTY LABELS. Not on an option, not in a note, not anywhere in the poll's
// copy — a room is neighbours on one issue, and a pole is not a side.
for (const k of Object.keys(CORE_COPY)) {
  if (k.indexOf("poll") !== 0) continue;
  for (const banned of ["party", "caucus", "score", "rank", "team", "grade",
    "democrat", "republican", "gop", "independent", "liberal", "conservative"]) {
    lacks(CORE_COPY[k].toLowerCase(), banned, `COPY.${k} does not spend the word "${banned}"`);
  }
  lacks(CORE_COPY[k], "%", `COPY.${k} prints no percentage`);
}

// ── NOT ONE OF THE THREE IS NOT AN ANSWER ─────────────────────────────────
for (const good of ["support", "oppose", "mixed", "Support", " MIXED ", "Oppose "]) {
  ok(POLL_CHOICES.indexOf(normalizeChoice(good)) >= 0, `${JSON.stringify(good)} is a pole`);
}
const NOT_POLES = ["", " ", null, undefined, 0, 1, true, {}, [], "yes", "no", "abstain",
  "neutral", "other", "undecided", "strongly support", "support oppose", "sup",
  "supports", "oppose!", "d", "r", "democrat", "republican", "1", "-1"];
for (const bad of NOT_POLES) {
  eq(normalizeChoice(bad), "", `${JSON.stringify(bad)} is not an answer`);
}

// ── THE VOTE GATE ANSWERS TO EXACTLY THE ROW THE COMPOSER ANSWERS TO ──────
// Every residency shape, every user shape, both rooms, every pole: a caller can
// answer the poll if and only if the same caller could post. So "pending cannot
// vote or post" and "verified in the wrong district cannot vote or post" are not
// two examples below — they are two of the seventy-two rows of this sweep.
let voteOpens = 0;
for (const u of USERS) for (const row of ROWS) for (const room of [HERE, "ut-house-1"]) {
  const c = residencyClaim(u, row);
  const canPost = composerState(c, room).canPost;
  const gate = pollState(c, room);
  eq(gate.canVote, canPost,
    "the poll's buttons are offered to exactly the callers the composer is offered to");
  if (!gate.canVote) {
    ok(!!gate.note, "a closed poll always carries a reason");
    ok(/counts/i.test(gate.note), "and every one of those reasons says the counts stay readable");
  }
  for (const choice of POLL_CHOICES) {
    const v = decideVote({ district: { districtKey: room }, issueKey: ISSUE, residency: c, choice });
    eq(v.ok, canPost, "the vote gate allows exactly the callers the write gate allows");
    if (v.ok) { voteOpens++; eq(v.choice, choice, "and it returns the pole it was handed"); }
    else {
      ok(v.status === 401 || v.status === 403, "and refuses everybody else 401 or 403");
      ok(!!v.message, "with a sentence");
      lacks(v.message, "%", "and no percentage in the refusal");
    }
  }
  // A pole is necessary as well as sufficient: being verified here is not enough.
  for (const bad of ["", null, "yes", "abstain", "other", "strongly support"]) {
    const v = decideVote({ district: { districtKey: room }, issueKey: ISSUE, residency: c, choice: bad });
    eq(v.ok, false, `${JSON.stringify(bad)} is refused however verified the caller is`);
    if (canPost) {
      eq(v.status, 400, "a verified neighbour who picked nothing is refused 400");
      eq(v.code, "no_choice", "and told to pick a pole");
      eq(v.message, CORE_COPY.pollPick, "in the gate's own sentence");
    }
  }
}
eq(voteOpens, 9, "exactly the three verified-for-this-room rows may answer, once per pole");

// PENDING, BY NAME. The row a phase-2 request creates reads the counts and adds
// to none of them.
const pendingVote = decideVote({
  district: UT2, issueKey: ISSUE, residency: residencyClaim(U, SELF_PENDING), choice: "support",
});
eq(pendingVote.ok, false, "a pending neighbour cannot vote");
eq(pendingVote.status, 403, "a pending neighbour is refused 403");
eq(pendingVote.code, "not_verified", "a pending neighbour is refused as not_verified");
eq(pendingVote.message, CORE_COPY.pollPending, "and told their request is still pending review");
eq(decideWrite({ district: UT2, issueKey: ISSUE, residency: residencyClaim(U, SELF_PENDING), body: BODY }).ok,
  false, "and the same neighbour cannot post");
// VERIFIED IN THE WRONG DISTRICT, BY NAME. The refusal that keeps the number
// honest: a count that included UT-1 would be a confident wrong number.
const thereVote = decideVote({
  district: UT2, issueKey: ISSUE, residency: residencyClaim(U, ADMIN_VERIFIED_THERE), choice: "oppose",
});
eq(thereVote.ok, false, "a neighbour verified in another district cannot vote");
eq(thereVote.status, 403, "the wrong district is refused 403");
eq(thereVote.code, "wrong_district", "the wrong district is refused as wrong_district");
eq(decideWrite({ district: UT2, issueKey: ISSUE, residency: residencyClaim(U, ADMIN_VERIFIED_THERE), body: BODY }).ok,
  false, "and the same neighbour cannot post here either");
// VERIFIED HERE, BY NAME.
const hereVote = decideVote({
  district: UT2, issueKey: ISSUE, residency: residencyClaim(U, ADMIN_VERIFIED), choice: "mixed",
});
eq(hereVote.ok, true, "a neighbour verified in THIS district may answer");
eq(hereVote.choice, "mixed", "with the pole they picked");
eq(hereVote.districtKey, HERE, "in this district");
eq(hereVote.issueKey, ISSUE, "on this issue");
eq(decideWrite({ district: UT2, issueKey: ISSUE, residency: residencyClaim(U, ADMIN_VERIFIED), body: BODY }).ok,
  true, "and the same neighbour may post");
// SIGNED OUT reads and does not answer.
const outVote = decideVote({ district: UT2, issueKey: ISSUE, residency: residencyClaim(null), choice: "support" });
eq(outVote.status, 401, "a signed-out reader is refused 401");
eq(outVote.message, CORE_COPY.pollClosedSignedOut, "and told to sign in, then ask");
// NO ROOM, NO VOTE — the same two 404s the write gate has.
eq(decideVote({ district: null, issueKey: ISSUE, residency: VERIFIED_HERE, choice: "support" }).status, 404,
  "no district, no vote");
eq(decideVote({ district: UT2, issueKey: "", residency: VERIFIED_HERE, choice: "support" }).status, 404,
  "no issue, no vote");

// ── THE RESULTS ARE COUNTS ────────────────────────────────────────────────
// Three integers folded from the grouped rows, printed as one sentence. Nothing
// here divides, so there is nothing to print as a percentage.
eq(JSON.stringify(pollTally([])), JSON.stringify({ support: 0, oppose: 0, mixed: 0, total: 0 }),
  "an unanswered poll tallies three zeroes");
const T = pollTally([{ choice: "support", n: 2 }, { choice: "oppose", n: 1 }, { choice: "mixed", n: 3 }]);
eq(T.total, 6, "the total is the sum of the three poles and nothing else");
eq(pollResultLine(T), "2 support · 1 oppose · 3 mixed", "the results are printed as counts");
eq(pollResultLine(pollTally([])), CORE_COPY.pollNoVotes, "an unanswered poll says so honestly");
eq(pollResultLine(null), CORE_COPY.pollNoVotes, "and so does a missing tally");
// A row for something that is not a pole is DROPPED, not given a fourth bucket
// that would then need a label.
const T2 = pollTally([{ choice: "support", n: 1 }, { choice: "abstain", n: 99 }, { choice: "", n: 5 }]);
eq(T2.total, 1, "a row that is not a pole is dropped rather than counted");
eq(pollResultLine(T2), "1 support · 0 oppose · 0 mixed", "and never printed");
// Junk rows cannot make a number up.
eq(pollTally([{ choice: "support", n: "3" }]).support, 3, "a numeric string counts as its number");
for (const junk of [{ choice: "support", n: -1 }, { choice: "support", n: 0 },
  { choice: "support", n: NaN }, { choice: "support" }, {}, null, "x"]) {
  eq(pollTally([junk]).total, 0, `${JSON.stringify(junk)} counts as nothing`);
}
eq(pollTally("nope").total, 0, "and rows that are not rows tally zero");
// NO PERCENTAGE, ANYWHERE, in either half of the poll.
for (const t of [pollTally([]), T, T2,
  pollTally([{ choice: "support", n: 1 }, { choice: "oppose", n: 2 }])]) {
  lacks(pollResultLine(t), "%", "no result line prints a percentage");
  lacks(pollResultLine(t), "/", "and none prints a ratio");
}
// The tally is integers and a sum. No mean, no share, no weight.
const coreSrc = strip(CORE_SRC);
const pollGate = coreSrc.slice(coreSrc.indexOf("export const POLL_CHOICES"));
for (const arith of ["/ t.total", "/ total", "* 100", "toFixed", "Math.round(", "percent", "share", "weight"]) {
  lacks(pollGate, arith, `the poll gate does no ${arith}`);
}

// ── ONE ROW PER PERSON PER ROOM, AND CHANGING IT REPLACES IT ──────────────
// The vote table is keyed on (district_key, issue_key, user_id) with a UNIQUE
// index, and the only write is an upsert onto that index. So a second answer
// from the same person REPLACES the first rather than adding one — "one vote per
// person" is a shape the table has, not a rule a route remembers.
eq((fnSrc.match(/insert\(ddPollVotes\)/g) || []).length, 1,
  "there is exactly one write to dd_poll_votes in the whole Function");
ok(/insert\(ddPollVotes\)[\s\S]{0,600}onConflictDoUpdate/.test(fnSrc),
  "and it is an upsert, so a changed answer overwrites");
ok(/target: \[ddPollVotes\.districtKey, ddPollVotes\.issueKey, ddPollVotes\.userId\]/.test(fnSrc),
  "the conflict target is the room and the person");
lacks(fnSrc, "delete(ddPollVotes)", "nothing deletes a vote");
ok(!/update\(ddPollVotes\)/.test(fnSrc), "and nothing edits one out of band");

// THE POLL IS THE ROOM. There is no dd_polls table and no poll id, so "exactly
// one poll per (district, issue)" is not enforced — it is inexpressible. A room
// cannot have a second poll for the same reason it cannot have a second address.
lacks(strip(SCHEMA), "dd_polls", "there is no dd_polls table to hold a second poll");
lacks(fnSrc, "pollId", "and nothing anywhere carries a poll id");
lacks(strip(CORE_SRC), "pollId", "not in the gate either");
lacks(strip(ROOM_SRC), "pollId", "and not in the client");

// ── A COMMENT IS NOT A VOTE ───────────────────────────────────────────────
// The vote route reads THREE fields off the body — the room's two halves and the
// pole — and the gate it calls takes no body at all. There is no path from a
// sentence to an answer, in either direction.
const voteSlice = fnSrc.slice(fnSrc.indexOf("async function votePoll"));
const voteBody = voteSlice.slice(0, voteSlice.indexOf("\n}\n") + 2);
const readFields = [...new Set((voteBody.match(/payload\?\.(\w+)/g) || []).map((m) => m.slice(9)))].sort();
eq(readFields.join(","), "choice,district,issue",
  "the vote route reads the room and the pole off the body, and nothing else");
lacks(voteBody, "ddPosts", "casting a vote reads and writes no post");
lacks(voteBody, "normalizeBody", "and never touches a neighbour's sentence");
ok(!/decideVote\(\{[\s\S]{0,240}body/.test(fnSrc), "the vote gate is handed no body");
ok(!/decideWrite\(\{[\s\S]{0,240}choice/.test(fnSrc), "and the write gate is handed no pole");
lacks(pollGate, "normalizeBody(", "the poll gate cannot read a body even if it wanted to");
// And the posts are untouched by the numbers: still newest first, still no sort.
has(fnSrc, "desc(ddPosts.createdAt)", "the posts are still ordered newest first");
ok(!/orderBy[\s\S]{0,120}ddPollVotes/.test(fnSrc), "and never by anything in the vote table");

// ── THE COUNTS COME FROM THE VOTE TABLE, GROUPED ──────────────────────────
const resultsSlice = fnSrc.slice(fnSrc.indexOf("async function resolvePollResults"));
const resultsBody = resultsSlice.slice(0, resultsSlice.indexOf("\n}\n") + 2);
has(resultsBody, "from(ddPollVotes)", "the counts are read from the vote table");
has(resultsBody, "groupBy(ddPollVotes.choice)", "grouped by the pole");
has(resultsBody, "pollTally(rows)", "and folded by the gate's own pure function");
lacks(resultsBody, "ddPosts", "no post is counted as an answer");
// The route exists, POST only.
has(fnSrc, '"/poll/vote"', "the Function serves the vote route");
ok(/path === "\/poll\/vote"\)[\s\S]{0,140}405/.test(fnSrc), "and refuses any method but POST");
has(strip(ROOM_SRC), "'/poll/vote'", "the client posts a vote to that route and no other");

// ── THE PAINTED POLL ──────────────────────────────────────────────────────
// Built from the gate's own functions, in the shape the Function returns, so
// what is painted below is what the server would actually send.
function pollPayload(res, extra) {
  const claim = res === undefined ? residencyClaim(U) : res;
  const gate = pollState(claim, HERE);
  const results = pollTally((extra && extra.rows) || []);
  const base = roomPayload([], gate.canVote);
  return Object.assign({}, base, (extra && extra.room) || {}, {
    poll: {
      question: CORE_COPY.pollQuestion,
      options: pollOptions(),
      results,
      resultLine: pollResultLine(results),
      countsNote: CORE_COPY.pollCountsNote,
      canVote: gate.canVote,
      note: gate.note,
      mine: (extra && extra.mine) || null,
      message: "",
    },
  });
}
const ROWS_3 = [{ choice: "support", n: 4 }, { choice: "oppose", n: 2 }, { choice: "mixed", n: 1 }];
// The client escapes every sentence it prints, so a copy string with an
// apostrophe in it ("a neighbor's post is not a vote") arrives escaped. Asserted
// against the escaped form rather than loosened to a substring.
const escd = (str) => String(str)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const slicePoll = (html) => {
  const i = html.indexOf('<section class="pdxdr-poll"');
  return i < 0 ? "" : html.slice(i, html.indexOf("</section>", i) + 10);
};

// VERIFIED IN THIS DISTRICT: three buttons and a composer.
const vPoll = await paint(pollPayload(residencyClaim(U, ADMIN_VERIFIED), { rows: ROWS_3 }), MY_UT2);
const vSlice = slicePoll(vPoll);
ok(!!vSlice, "the poll is painted");
has(vSlice, CORE_COPY.pollQuestion, "the poll asks the fixed question");
eq((vSlice.match(/data-pdxdr-vote="/g) || []).length, 3,
  "a verified neighbour is offered three poles and no more");
for (const k of POLL_CHOICES) has(vSlice, `data-pdxdr-vote="${k}"`, `the ${k} pole is pressable`);
for (const l of ["Support", "Oppose", "Mixed"]) has(vSlice, `>${l}<`, `the ${l} pole is labelled`);
has(vSlice, "4 support · 2 oppose · 1 mixed", "the results are printed as counts");
has(vPoll, "pdxdr-composer", "and the same neighbour gets the composer");
lacks(vSlice, "pdxdr-pollnote", "a neighbour who may answer is given no reason why they cannot");

// ONE ANSWER MARKED, AND IT IS THE READER'S OWN — not a leader, not a winner.
const mine = slicePoll(await paint(
  pollPayload(residencyClaim(U, ADMIN_VERIFIED), { rows: ROWS_3, mine: "oppose" }), MY_UT2));
eq((mine.match(/aria-pressed="true"/g) || []).length, 1, "exactly one pole is marked");
ok(/data-pdxdr-vote="oppose" aria-pressed="true"/.test(mine),
  "and it is the pole this reader picked, not the pole with the biggest number");
eq((mine.match(/is-mine/g) || []).length, 1, "one pole wears the reader's own state");

// PENDING: counts, no buttons, no composer.
const pPoll = await paint(pollPayload(residencyClaim(U, SELF_PENDING),
  { rows: ROWS_3, room: { canPost: false, closedNote: CORE_COPY.pending } }), MY_UT2);
const pSlice = slicePoll(pPoll);
lacks(pSlice, "data-pdxdr-vote", "a pending neighbour is offered no pole to press");
lacks(pSlice, "<button", "and no button at all");
has(pSlice, "4 support · 2 oppose · 1 mixed", "but reads the counts");
has(pSlice, CORE_COPY.pollPending, "and is told their request is pending review");
lacks(pPoll, "pdxdr-composer", "a pending neighbour is shown no composer");
lacks(pPoll, "<textarea", "and no field");

// VERIFIED IN ANOTHER DISTRICT: same answer.
const wPoll = await paint(pollPayload(residencyClaim(U, ADMIN_VERIFIED_THERE), { rows: ROWS_3 }), MY_UT2);
lacks(slicePoll(wPoll), "data-pdxdr-vote", "a neighbour verified elsewhere is offered no pole");
has(slicePoll(wPoll), escd(CORE_COPY.pollWrongDistrict), "and told why, here, in this room");
has(slicePoll(wPoll), "4 support · 2 oppose · 1 mixed", "and still reads the counts");
lacks(wPoll, "pdxdr-composer", "and gets no composer");

// SIGNED OUT: reading stays open, both halves of it.
const oPoll = await paint(pollPayload(residencyClaim(null), { rows: ROWS_3 }), MY_UT2);
lacks(slicePoll(oPoll), "data-pdxdr-vote", "a signed-out reader is offered no pole");
has(slicePoll(oPoll), CORE_COPY.pollClosedSignedOut, "and told to sign in, then ask");
has(slicePoll(oPoll), "4 support · 2 oppose · 1 mixed", "and still reads the counts");

// AN UNANSWERED POLL SAYS SO, rather than printing three zeroes as a verdict.
has(slicePoll(await paint(pollPayload(residencyClaim(null)), MY_UT2)), CORE_COPY.pollNoVotes,
  "an unanswered poll says there are no votes yet");

// ZERO PERCENT STRINGS, AND NOTHING SHAPED LIKE A BAR. No element in the poll
// has a length set from a result, because a proportion drawn as a length reads
// as a grade — and neighbours disagreeing about a road is not a grade.
for (const [name, html] of [["verified", vSlice], ["pending", pSlice],
  ["wrong district", slicePoll(wPoll)], ["signed out", slicePoll(oPoll)], ["marked", mine]]) {
  lacks(html, "%", `the ${name} poll prints no percentage`);
  lacks(html, "<progress", `the ${name} poll draws no meter`);
  lacks(html, "<meter", `the ${name} poll draws no meter element`);
  lacks(html, "style=", `the ${name} poll sets no inline length`);
  lacks(html, "aria-valuenow", `the ${name} poll reports no value on a scale`);
  lacks(html, "pdxdr-bar", `the ${name} poll draws no bar`);
  has(html, escd(CORE_COPY.pollCountsNote), `the ${name} poll says what the numbers are not`);
}
// The stylesheet has no fill either: nothing in the poll block is sized from a
// number, so there is nothing for a result to grow.
const pollCss = strip(ROOM_CSS).slice(strip(ROOM_CSS).indexOf(".pdxdr-poll"));
for (const grade of ["progress", "meter", "linear-gradient", "conic-gradient", "--fill"]) {
  lacks(pollCss, grade, `the poll's rules carry no ${grade}`);
}

// ── LAYOUT: HEADER, POLL, COMPOSER, POSTS, AND THE REVIEWER LAST ──────────
const ordered = await paint(pollPayload(residencyClaim(U, ADMIN_VERIFIED), { rows: ROWS_3 }), MY_UT2);
ok(ordered.indexOf("pdxdr-poll") < ordered.indexOf("pdxdr-composer"),
  "the poll sits above the composer");
ok(ordered.indexOf("pdxdr-composer") < ordered.indexOf("pdxdr-list"),
  "the composer sits above the posts");
const closedOrder = await paint(pollPayload(residencyClaim(U, SELF_PENDING),
  { room: { canPost: false, closedNote: CORE_COPY.pending } }), MY_UT2);
ok(closedOrder.indexOf("pdxdr-poll") < closedOrder.indexOf("pdxdr-closed"),
  "and above the closed note when the composer is shut");
ok(closedOrder.indexOf("pdxdr-closed") < closedOrder.indexOf("pdxdr-list"),
  "which sits where the composer would have been");
// The poll is not attached to a person, here or anywhere.
lacks(vSlice, "pdxdr-badge", "the poll wears no badge and names no author");
for (const leak of ["uid", "handle", "@", "u1", "avatar"]) {
  lacks(vSlice, leak, `the poll discloses no ${leak}`);
}
// A POST IS STILL NOT A VOTE, painted: no pole inside a post, no number on one.
const withPosts = await paint(
  Object.assign(pollPayload(residencyClaim(U, ADMIN_VERIFIED), { rows: ROWS_3 }), { posts: POSTS }),
  MY_UT2
);
const list = withPosts.slice(withPosts.indexOf('<div class="pdxdr-list">'));
lacks(list, "data-pdxdr-vote", "no post carries a pole");
lacks(list, "support ·", "and no post carries the counts");
ok(list.indexOf("Later post") < list.indexOf("Earlier post"),
  "the posts are still newest first, and the poll reordered nothing");

// ── THE VOTE TABLE IS A REAL TABLE, STAMPED AFTER THE APPLIED TAIL ────────
const POLL_MIGRATION_ID = "20261031000000_create_dd_poll_votes";
const MIGRATION3 = R(`${MIGRATION_DIR}/${POLL_MIGRATION_ID}/migration.sql`);
for (const prior of [...applied, RESIDENCY_MIGRATION_ID]) {
  ok(POLL_MIGRATION_ID > prior.replace(/\.sql$/, ""),
    `the poll migration sorts after ${prior}`);
}
ok(/^20261031000000_/.test(POLL_MIGRATION_ID),
  "the poll migration carries the hand-set version one past the tail");
for (const piece of [
  'CREATE TABLE IF NOT EXISTS "dd_poll_votes"',
  '"district_key" text NOT NULL',
  '"issue_key" text NOT NULL',
  '"user_id" text NOT NULL',
  '"choice" text NOT NULL',
  `CHECK ("choice" in ('support', 'oppose', 'mixed'))`,
  'CREATE UNIQUE INDEX IF NOT EXISTS "dd_poll_votes_room_user_unique" ON "dd_poll_votes" ("district_key","issue_key","user_id")',
  'REFERENCES "dd_districts"("district_id")',
  'REFERENCES "dd_issue_keys"("issue_key")',
]) {
  has(MIGRATION3, piece, `the poll migration carries ${piece}`);
}
ok(!/ALTER TABLE "dd_(posts|threads|districts|issue_keys|residency)"/.test(MIGRATION3),
  "the poll migration alters no existing table");
ok(!/DROP |DELETE FROM |TRUNCATE /.test(MIGRATION3), "the poll migration destroys nothing");
lacks(MIGRATION3.replace(/^\s*--.*$/gm, " "), "dd_polls",
  "and creates no table for a second poll");
// The schema says the same thing, and it is a vote rather than a profile.
has(SCHEMA, "export const ddPollVotes = pgTable(", "db/schema.ts carries the vote table");
for (const col of ['districtKey: text("district_key")', 'issueKey: text("issue_key")',
  'userId: text("user_id")', "choice: text().notNull()",
  'uniqueIndex("dd_poll_votes_room_user_unique")',
  `check("dd_poll_votes_choice_check", sql\`\${t.choice} in ('support', 'oppose', 'mixed')\`)`]) {
  has(SCHEMA, col, `the vote table declares ${col}`);
}
const voteStart = SCHEMA.indexOf("export const ddPollVotes");
const voteCols = strip(SCHEMA.slice(voteStart));
for (const nope of ["question", "options", "weight", "score", "rank", "body", "text_answer",
  "email", "name", "address", "party"]) {
  ok(voteCols.toLowerCase().indexOf(`"${nope}"`) < 0, `the vote table stores no ${nope}`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("9 · two mounts, and only two");

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
section("10 · the shell ships the room, and the service worker knows it did");

has(INDEX, 'href="/district-room.css"', "index.html loads the room's stylesheet");
has(INDEX, 'src="/district-room.js"', "index.html loads the room");
ok(/media="print" onload="this\.media='all'"[^>]*\/>\s*\n\s*<noscript><link rel="stylesheet" href="\/district-room\.css" \/><\/noscript>/.test(INDEX)
  || (INDEX.indexOf('href="/district-room.css" media="print"') >= 0 && INDEX.indexOf('<noscript><link rel="stylesheet" href="/district-room.css" /></noscript>') >= 0),
  "the stylesheet is non-blocking with a noscript fallback");
has(INDEX, 'defer src="/district-room.js"', "the room is deferred");
has(SW, "'/district-room.js',", "the service worker precaches the room");
has(SW, "'/district-room.css',", "the service worker precaches the room's stylesheet");
const ver = (SW.match(/const CACHE_VERSION = 'v(\d+)'/) || [])[1];
ok(ver && Number(ver) >= 155,
  `the shell cache was bumped for the changed precached files (v${ver})`);
has(SW, "v152 - THE DISTRICT ROOM EXISTS", "the phase 1 version-log entry survives");
has(SW, "v153 - RESIDENCY IS A FACT NOW", "the phase 2 version-log entry survives");
has(SW, "v154 - THE ROOM HAS ONE POLL", "the phase 3 version-log entry survives");
has(SW, "v155 - THE ROOM'S AUTH FOLLOWS THE NAV CHIP",
  "the bump carries its own version-log entry");

// ═════════════════════════════════════════════════════════════════════════════
section("11 · the room's auth follows the nav chip");

// THE BUG THIS SECTION EXISTS FOR. /d/ut-statehouse-68/lands_preserve painted
// "Sign in first, then ask to be verified for this district" while the account
// chip in the top-right already showed a signed-in member. The room sampled
// `auth.currentUser` at the instant of the standing read; on a cold arrival the
// Firebase SDK has not restored the session yet, so the read went out with no
// token, the server correctly answered "we cannot name you", and the room
// printed the signed-out sentence over a signed-in account and never asked
// again. Auth is now RESOLVED rather than sampled, and every call in the module
// goes through the one helper that resolves it.

// The standing read the Function actually returns, built out of the gate's own
// composerState/pollState so the sentences here are the shipped sentences.
function standingPayload(signedIn, extra) {
  const residency = residencyClaim(signedIn ? { uid: "uid-chip-1" } : null, null);
  const composer = composerState(residency, "ut-statehouse-68");
  const ps = pollState(residency, "ut-statehouse-68");
  return Object.assign(roomPayload([]), {
    district: {
      districtKey: "ut-statehouse-68", label: "Utah · State House District 68",
      state: "UT", seatKey: "statehouse", districtNumber: 68,
    },
    issueKey: "lands_preserve",
    signedIn,
    canPost: composer.canPost,
    closedNote: composer.note,
    poll: {
      question: CORE_COPY.pollQuestion,
      options: pollOptions(),
      canVote: ps.canVote,
      note: ps.note,
      resultLine: pollResultLine(pollTally([])),
      countsNote: CORE_COPY.pollCountsNote,
      mine: null,
    },
    residency: {
      status: residency.status,
      reason: residency.reason,
      canAttest: signedIn,
      attest: CORE_COPY.attest,
      attestNote: CORE_COPY.attestNote,
      canGrant: false,
      grant: CORE_COPY.grant,
      outOfScopeNote: "",
    },
  }, extra || {});
}

// The Function's own two answers agree with the gate about which sentence goes
// with which caller, so the payloads below are not a third opinion.
eq(standingPayload(false).closedNote, CORE_COPY.closedSignedOut,
  "a read with no verified caller carries the signed-out sentence");
eq(standingPayload(false).poll.note, CORE_COPY.pollClosedSignedOut,
  "and the poll block carries its own signed-out sentence");
has(FN_SRC, "signedIn,",
  "the standing read reports whether the server could name the caller at all");

async function settled(win, ticks) {
  win.flushTimers();
  for (let i = 0; i < (ticks || 4); i++) await new Promise((r) => setTimeout(r, 0));
  return win;
}
const scroll = (win) => win.document.getElementById("pdx-district-room-scroll").innerHTML;

// ── A SIGNED-IN UID OPENS THE ROOM, AND THE NOTE IS NOT THE SIGNED-OUT ONE ──
// The whole of the bug report, as a boot: an account the chip would paint, the
// address the report names, and the sentence that must not be on screen.
const ROOM_68 = "/d/ut-statehouse-68/lands_preserve";
const acct = chipAccount("clreber@gmail.com");
const WIN = await settled(boot(ROOM_68, (url) =>
  ({ status: 200, data: standingPayload(true) }), { auth: fakeAuth(acct) }));

eq(WIN.PDXDistrictRoom.isOpen(), true, `arriving on ${ROOM_68} opens the room`);
eq(WIN.PDXDistrictRoom.authResolved(), true, "auth resolved before the room was painted");
eq(WIN.PDXDistrictRoom.signedIn(), true,
  "a uid and an email make the room signed in, exactly as they make the chip appear");
const body68 = scroll(WIN);
lacks(body68, CORE_COPY.closedSignedOut,
  "THE BUG: a signed-in reader is never shown the signed-out sentence");
lacks(body68, CORE_COPY.pollClosedSignedOut,
  "and the poll block is never shown the signed-out sentence either");
has(body68, CORE_COPY.closedNoResidency,
  "they are shown the true reason instead — nothing has been established yet");
// And the standing read actually carried their token, which is the only way the
// server could have answered for them.
eq(bearerOf(WIN.__calls[0]), "Bearer tok-1",
  "the standing read carried the reader's ID token");
has(WIN.__calls[0].url, "district=ut-statehouse-68",
  "and it asked about the district in the address");

// The Ask control is the one thing a signed-in reader with no row can do, and it
// is on screen now that the room knows who they are. MY_UT68 places them in the
// district so the client's own "is it their own district" test passes.
const MY_UT68 = {
  pdxRepsForMe: () => ({
    located: true, national: false, state: "Utah", districtsResolvable: true,
    levels: [{ key: "uthouse68", seat: "statehouse", district: 68, distLabel: "Utah House District 68" }],
  }),
};
const askBody68 = scroll(await settled(boot(
  ROOM_68,
  () => ({ status: 200, data: standingPayload(true) }),
  Object.assign({ auth: fakeAuth(chipAccount()) }, MY_UT68)
)));
has(askBody68, "data-pdxdr-attest", "a signed-in reader in their own district is offered the Ask");
lacks(askBody68, CORE_COPY.closedSignedOut, "and still never the signed-out sentence");

// ── AN ANONYMOUS SESSION IS SIGNED OUT, HERE AND IN THE NAV ─────────────────
// The chip does not appear for the per-browser anonymous session and neither
// does the room's signed-in bit, so this reader DOES get the signed-out sentence
// — which is the true statement about them.
const WANON = await settled(boot(ROOM_68, () => ({ status: 200, data: standingPayload(false) }),
  { auth: fakeAuth(anonAccount()) }));
eq(WANON.PDXDistrictRoom.signedIn(), false, "an anonymous session is signed out in the room");
eq(bearerOf(WANON.__calls[0]), "", "and it sends no token, because the server rejects one");
has(scroll(WANON), CORE_COPY.closedSignedOut,
  "a reader nobody can name is told to sign in, and that sentence is still there for them");

// ── A COLD OPEN HOLDS ON "OPENING THE ROOM…" UNTIL AUTH RESOLVES ────────────
// The production sequence: the room opens off the address before Firebase has
// restored the session. Nothing is painted from a standing read taken in that
// window — the reader waits on the busy line instead of being told they are
// signed out.
const LATE = fakeAuth(chipAccount(), { late: true });
const WLATE = await settled(boot(ROOM_68, () => ({ status: 200, data: standingPayload(true) }),
  { auth: LATE }));
eq(WLATE.PDXDistrictRoom.isOpen(), true, "the room opens off the address alone");
eq(WLATE.PDXDistrictRoom.authResolved(), false, "auth has not resolved yet");
eq(WLATE.__calls.length, 0, "and no standing read has gone out");
const busyBody = scroll(WLATE);
has(busyBody, "pdxdr-busy", "the reader is held on the busy line");
has(busyBody, "Opening the room", "which says the room is opening");
lacks(busyBody, CORE_COPY.closedSignedOut,
  "and NOT on the signed-out sentence, which is not yet known to be true");
lacks(busyBody, "pdxdr-closed", "no closed note is painted before auth has answered");

// Firebase answers. Now the read goes out, with the token, and the room paints.
LATE.fire(chipAccount());
await settled(WLATE);
eq(WLATE.PDXDistrictRoom.authResolved(), true, "the token-ready callback resolves auth");
eq(WLATE.PDXDistrictRoom.signedIn(), true, "and the room is signed in from that moment");
ok(WLATE.__calls.length >= 1, "the standing read goes out once auth has resolved");
eq(bearerOf(WLATE.__calls[0]), "Bearer tok-1", "and it carries the token");
lacks(scroll(WLATE), CORE_COPY.closedSignedOut,
  "the painted room never shows the signed-out sentence to this reader");

// AND IT IS A HOLD, NOT A HANG. A subscription that never answers must not keep
// the room shut forever: on the safety deadline the room resolves with whatever
// the SDK has, which is the same thing the chip would be painted from, and the
// read goes out.
const NEVER = fakeAuth(null, { late: true });
const WNEVER = await settled(boot(ROOM_68, () => ({ status: 200, data: standingPayload(false) }),
  { auth: NEVER }));
eq(WNEVER.__calls.length, 0, "a silent auth holds the standing read");
has(scroll(WNEVER), "pdxdr-busy", "and holds the reader on the busy line");
WNEVER.flushTimers(60000);
await settled(WNEVER);
eq(WNEVER.PDXDistrictRoom.authResolved(), true, "the safety deadline resolves auth rather than hanging");
eq(WNEVER.PDXDistrictRoom.signedIn(), false, "with no account, because there is none");
has(scroll(WNEVER), CORE_COPY.closedSignedOut, "and the room paints the honest sentence");

// ── SIGNING IN UNDER AN OPEN ROOM RE-READS THE STANDING ─────────────────────
// Signed out on arrival, then signed in. The room does not keep the answer it
// got before the account existed.
const SWAP = fakeAuth(null);
const WSWAP = await settled(boot(ROOM_68, (url, init) =>
  ({ status: 200, data: standingPayload(!!bearerOf({ init })) }), { auth: SWAP }));
has(scroll(WSWAP), CORE_COPY.closedSignedOut, "a signed-out arrival is told to sign in");
const before = WSWAP.__calls.length;
SWAP.fire(chipAccount());
await settled(WSWAP);
ok(WSWAP.__calls.length > before, "signing in re-reads the room's standing");
eq(WSWAP.PDXDistrictRoom.signedIn(), true, "the room's signed-in bit followed the chip");
lacks(scroll(WSWAP), CORE_COPY.closedSignedOut,
  "and the signed-out sentence is gone, rather than left up under a signed-in chip");

// Signing back out is the same move in reverse: the standing is re-read and the
// signed-out sentence is the honest one again.
SWAP.fire(null);
await settled(WSWAP);
eq(WSWAP.PDXDistrictRoom.signedIn(), false, "signing out signs the room out");
has(scroll(WSWAP), CORE_COPY.closedSignedOut, "and the signed-out sentence returns");

// ── A CHIP/SERVER DISAGREEMENT IS NOT PAINTED AS "SIGN IN FIRST" ────────────
// Signed in by every test the chip uses, and the server still cannot name them.
// The room mints a fresh token and asks once more; when the second answer is the
// same it says so. It does NOT leave the signed-out copy up, because that
// sentence is a false statement about this reader.
const stubborn = chipAccount();
const WMIS = await settled(boot(ROOM_68, () => ({ status: 200, data: standingPayload(false) }),
  { auth: fakeAuth(stubborn) }));
eq(WMIS.PDXDistrictRoom.signedIn(), true, "the chip says signed in");
eq(WMIS.__calls.length, 2, "a signed-out answer for a signed-in chip is asked exactly once more");
eq(bearerOf(WMIS.__calls[1]), "Bearer tok-fresh", "and the retry carries a freshly minted token");
eq(stubborn.tokens.join(","), "false,true", "the second mint was a forced refresh");
const misBody = scroll(WMIS);
lacks(misBody, CORE_COPY.closedSignedOut,
  "THE BUG, THE OTHER WAY ROUND: a signed-in reader is not told to sign in");
lacks(misBody, CORE_COPY.pollClosedSignedOut, "nor in the poll block");
has(misBody, "we could not confirm it for this room",
  "they are told what is actually wrong");
has(CORE_COPY.authUnconfirmed, "we could not confirm it for this room",
  "and that sentence is the gate's, not a second one the client invented");
lacks(misBody, "data-pdxdr-attest",
  "and offered no request the server could not attribute anyway");
lacks(misBody, "data-pdxdr-vote", "and no poll answer it would refuse");
lacks(misBody, "pdxdr-composer", "a disagreement opens no composer");
lacks(misBody, CORE_COPY.badge, "and prints no badge");

// A 401 on a WRITE is the same rule: the room says what is wrong rather than
// echoing a sentence that tells a signed-in reader to sign in.
has(strip(ROOM_SRC), "refusal(res", "every refusal on this surface goes through one owner");
ok(/status\s*===\s*401\s*&&\s*signedIn\(\)/.test(strip(ROOM_SRC)),
  "a 401 handed to a signed-in reader is treated as a stale token, not as signed out");

// ── ONE HELPER, AND ALL FIVE CALLS GO THROUGH IT ────────────────────────────
// The standing read, the residency request, the reviewer's grant, the poll
// answer and the post. There is no second place a token is attached and no
// second notion of "signed in" on this surface.
const room11 = strip(ROOM_SRC);
eq((room11.match(/\bfetch\(/g) || []).length, 1,
  "there is exactly one fetch in the module, so one helper answers who is asking");
eq((room11.match(/headers\['Authorization'\]/g) || []).length, 1,
  "and exactly one place a token becomes a header");
ok(/function bearer\(/.test(room11) && /function who\(/.test(room11),
  "the helper resolves the identity and mints the token in one place");
ok(room11.indexOf("who().then") > 0, "the standing read waits on it");
for (const route of ["'/residency/attest'", "'/residency/grant'", "'/poll/vote'"]) {
  has(room11, route, `${route} is sent through the same api() helper`);
}
eq((room11.match(/getIdToken\(/g) || []).length, 1,
  "there is exactly one getIdToken call in the module");

// A LOCATION PIN IS STILL NOT AN IDENTITY. The helper reads Firebase and nothing
// else — the zip a reader types into Who Represents Me cannot contribute to it.
lacks(room11, "_currentVoterLocation",
  "the identity helper never reads a self-typed location");
for (const vendor of ["stripe", "veriff", "identity.stripe", "onfido", "persona"]) {
  lacks(room11.toLowerCase(), vendor, `the room calls no ID vendor (${vendor})`);
}

// ═════════════════════════════════════════════════════════════════════════════
// ── Result ───────────────────────────────────────────────────────────────────
console.log("");
if (failures.length) {
  failures.forEach((f) => console.error(`   ✗ ${f}`));
  console.error(`\n✗ district-room: ${failures.length} failed, ${passed} passed`);
  process.exit(1);
}
console.log(`✓ district-room: all ${passed} assertions passed`);
console.log("   one address · 5 refusals, exhaustively · pending/revoked/pin cannot publish · " +
  "admin grant is the only verify · Utah only · newest first, no rank · 2 mounts · " +
  "no pid, no party, no verdict hue");
