#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-person-file.mjs — one person, one file, one address
// ─────────────────────────────────────────────────────────────────────────────
// A reader met the same politician on five surfaces and could reasonably have
// believed they were five different products. Search opened a profile modal. The
// ballot's "open profile" opened a profile modal. The medium compare card had a
// "view full" that opened a profile modal. An Issue Spotlight name opened a
// profile modal. A shared link opened a profile modal. Five call paths, each one
// reaching openModal by its own route, each one free to drift — and one of them
// (hero-showcase) jumped to a different anchor, so the "same" file opened at a
// different place depending on which door you came through.
//
// The fix is a funnel and an address. PDXPerson.open() is the one way in;
// /p/<pid> is the one way to name it.
//
// What must stay true:
//
//   1. THE FUNNEL EXISTS AND IS THE ONE WAY IN. Every entry path tries
//      PDXPerson.open first, and each keeps its old behaviour as a fallback so a
//      load-order accident degrades instead of breaking.
//   2. NO LOOP. The funnel calls openModal, never showProfile — showProfile is
//      one of the things that calls the funnel.
//   3. ONE ADDRESS SHAPE. /p/<pid>. It is what PDXPerson mints, what
//      canonicalPath emits, what the share link hands out and what the sitemap
//      lists — one string, four places.
//   4. THE OLD FORM STILL ARRIVES. ?p= is de-canonicalised, not retired: every
//      link already in the wild still opens the person it named.
//   5. THE ADDRESS IS REVERSIBLE. Stamping is captured once per open, so closing
//      the file returns the reader to the surface they opened it from — not to
//      the front page, and not to a person they already closed.
//   6. THE CHROME CARRIES NO FINDING. The kicker names the surface and its
//      address. No score, no grade, no Direction Match — the formal record stays
//      the first thing in the file.
//   7. THE ROUTE IS SERVED. netlify.toml rewrites /p/* to the app, and the share
//      preview edge function runs in front of it.
//
//   node scripts/test-person-file.mjs

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const CODE = (f) => R(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).includes(n), `${m} — missing ${JSON.stringify(n)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (c) return; console.error(`✗ person file: STALE HARNESS — ${m}`); process.exit(2); };

const INDEX = R("index.html");
const PF_SRC = R("person-file.js");

// ─────────────────────────────────────────────────────────────────────────────
// 1 · The module, in a sandbox
// ─────────────────────────────────────────────────────────────────────────────
section("1 · the funnel registers and mints one address shape");

// A controllable clock. person-file.js's cold-arrival path is a RETRY LOOP now
// rather than a single 420ms bet, so a harness that stubs setTimeout into a
// no-op (which this one used to do) cannot see the behaviour that matters: it
// never runs the thing being tested. Timers are queued here and drained by
// tick(), so a test can say "600ms passed, the roster is still loading" and
// assert that nothing was claimed yet.
function makeClock() {
  let now = 0, seq = 0;
  const q = [];
  return {
    now: () => now,
    setTimeout(f, ms) {
      const id = ++seq;
      q.push({ id, at: now + (Number(ms) || 0), f });
      return id;
    },
    clearTimeout(id) {
      const i = q.findIndex((t) => t.id === id);
      if (i >= 0) q.splice(i, 1);
    },
    tick(ms) {
      const until = now + ms;
      for (let guard = 0; guard < 100000; guard++) {
        q.sort((a, b) => a.at - b.at || a.id - b.id);
        if (!q.length || q[0].at > until) break;
        const t = q.shift();
        now = t.at;
        try { t.f(); } catch (e) { /* the module swallows its own throws */ }
      }
      now = until;
    },
    pending: () => q.length,
  };
}

function sandbox(opts) {
  opts = opts || {};
  const calls = { openModal: [], jump: [], replace: [], notice: [] };
  const clock = makeClock();
  const doc = {
    readyState: opts.readyState || "complete",
    _listeners: {},
    addEventListener(type, fn) {
      (doc._listeners[type] = doc._listeners[type] || []).push(fn);
    },
    getElementById(id) {
      if (!doc._els[id]) {
        const attrs = {};
        doc._els[id] = {
          id, innerHTML: "", className: "", style: {}, attrs,
          addEventListener() {},
          setAttribute(k, v) { attrs[k] = String(v); },
          getAttribute(k) { return Object.prototype.hasOwnProperty.call(attrs, k) ? attrs[k] : null; },
          removeAttribute(k) { delete attrs[k]; },
          classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
          querySelector() { return null; },
        };
      }
      return doc._els[id];
    },
    querySelector() { return null; },
    _els: {},
  };
  // The bundled roster. Defaults to the one record the older sections use, so
  // every assertion written before the clock existed keeps its fixture.
  const roster = Object.prototype.hasOwnProperty.call(opts, "roster")
    ? opts.roster
    : { mike_lee: { name: "Mike Lee", office: "U.S. Senator", state: "Utah" } };
  const win = {
    document: doc,
    location: Object.assign({ origin: "https://politidex.fyi", pathname: "/", search: "", hash: "", href: "https://politidex.fyi/" }, opts.location || {}),
    history: {
      replaceState(a, b, url) { calls.replace.push(url); },
      pushState() {},
    },
    _listeners: {},
    addEventListener(type, fn) {
      (win._listeners[type] = win._listeners[type] || []).push(fn);
    },
    setTimeout: opts.clock === false
      ? function (f) { calls.jump.push("deferred"); return 0; }
      : function (f, ms) { calls.jump.push("deferred"); return clock.setTimeout(f, ms); },
    clearTimeout: clock.clearTimeout,
    URLSearchParams,
    encodeURIComponent,
    openModal(id) {
      calls.openModal.push(id);
      // The real openModal records which file is on screen; the arrival loop
      // reads it to stand down when something else got there first.
      win._pdxCurrentProfileId = id;
    },
    CMP_DATA: roster,
    PROFILES: opts.profiles || {},
    _pdxRosterState: Object.prototype.hasOwnProperty.call(opts, "rosterState") ? opts.rosterState : "done",
    PDXShareLinks: {
      notice(id, kicker, message) { calls.notice.push({ id, kicker, message }); return true; },
    },
    PDXPublicationFloor: { clears: (pid) => pid === "mike_lee" || pid === "lee" },
  };
  if (opts.profilePid) win.PDXProfilePid = opts.profilePid;
  win.window = win;
  win.globalThis = win;
  const ctx = vm.createContext(win);
  new vm.Script(PF_SRC, { filename: "person-file.js" }).runInContext(ctx);
  const fire = (target, type, ev) => {
    const list = (target === "window" ? win._listeners : doc._listeners)[type] || [];
    list.forEach((f) => { try { f(ev || {}); } catch (e) {} });
  };
  return { win, calls, clock, fire, doc, P: win.PDXPerson };
}

const { win, calls, P } = sandbox();
must(P && typeof P.open === "function", "PDXPerson did not register in a sandbox");

eq(P.PREFIX, "/p/", "the address prefix moved");
eq(P.path("mike_lee"), "/p/mike_lee", "PDXPerson.path does not mint the path form");
eq(P.url("mike_lee"), "https://politidex.fyi/p/mike_lee", "PDXPerson.url does not mint the absolute form");
ok(P.PATH_RE.test("/p/mike_lee"), "the path matcher does not recognise its own output");
ok(P.PATH_RE.test("/p/mike_lee/"), "the path matcher rejects a trailing slash");
ok(!P.PATH_RE.test("/p/"), "the path matcher accepts an empty pid");
ok(!P.PATH_RE.test("/p/mike-lee/extra"), "the path matcher accepts a deeper path");

// ─────────────────────────────────────────────────────────────────────────────
// 2 · Opening: one call in, one modal out, one address stamped
// ─────────────────────────────────────────────────────────────────────────────
section("2 · open() opens the modal and stamps the address");

ok(P.open("mike_lee") === true, "open() reported failure with openModal available");
eq(calls.openModal.length, 1, "open() did not call openModal exactly once");
eq(calls.openModal[0], "mike_lee", "open() opened somebody else");
ok(calls.replace.some((u) => String(u).startsWith("/p/mike_lee")),
   `open() did not stamp the person path (saw ${JSON.stringify(calls.replace)})`);

// No loop: the funnel must not call the function that calls the funnel.
ok(!/showProfile/.test(CODE("person-file.js").replace(/_pdxOpenFullProfileModal/g, "")),
   "person-file.js calls showProfile — showProfile calls the funnel, so that is a loop");

// A second open from inside a file still returns to where the FIRST one started.
const s2 = sandbox({ location: { pathname: "/issue/box-elder-stratos-data-center" } });
s2.P.open("mike_lee");
s2.P.open("mike_lee");
s2.P.restore();
ok(s2.calls.replace[s2.calls.replace.length - 1] === "/issue/box-elder-stratos-data-center",
   `closing a person file returns to the surface it was opened from (saw ${JSON.stringify(s2.calls.replace)})`);

// A cold deep link has no surface to return to, so it returns to the root rather
// than to whatever happened to be in the address bar.
const s3 = sandbox({ location: { pathname: "/p/mike_lee" } });
s3.P.restore();
ok(s3.calls.replace.length === 0 || s3.calls.replace[s3.calls.replace.length - 1] === "/",
   `a cold deep link restores to the root (saw ${JSON.stringify(s3.calls.replace)})`);

// ─────────────────────────────────────────────────────────────────────────────
// 3 · Every door goes through the funnel
// ─────────────────────────────────────────────────────────────────────────────
section("3 · search, ballot, compare, spotlight and share all open the same file");

// showProfile is the app's own front door and must delegate before falling back.
const FULL = CODE("profiles-full.js");
has(FULL, "PDXPerson.open", "showProfile no longer routes through the person-file funnel");
has(FULL, "PDXPerson.stamp", "openModal no longer stamps the address through PDXPerson");
has(FULL, "PDXPerson.restore", "closeModal no longer restores the address through PDXPerson");
ok(!/\?p=' \+ encodeURIComponent/.test(FULL) || /PDXPerson/.test(FULL),
   "profiles-full.js still owns its own address writer with no funnel in front of it");

for (const [file, why] of [
  ["hero-showcase.js", "the showcase's own openProfile"],
  ["compare-hub.js", "the medium card's view-full and window.openFullProfile"],
  ["issue-compare.js", "the issue compare adapter"],
]) {
  has(CODE(file), "PDXPerson.open", `${why} (${file}) does not route through the funnel`);
  // …and keeps a fallback, so a load-order accident degrades rather than breaks.
  has(CODE(file), "showProfile", `${file} dropped its fallback path — a funnel that has not loaded must not swallow the click`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4 · One address, four emitters
// ─────────────────────────────────────────────────────────────────────────────
section("4 · the same string in the share link, the canonical, the app and the sitemap");

const SHARE = CODE("share-links.js");
has(SHARE, "'/p/'", "PDXShareLinks.profile no longer emits the path form");
ok(!/'\/\?p=' \+ encodeURIComponent/.test(SHARE),
   "PDXShareLinks.profile still emits the query form as its own address");

const TARGET = R("netlify/lib/share-target.ts");
has(TARGET, "/^\\/p\\/([A-Za-z0-9_]+)\\/?$/", "share-target.ts does not parse the /p/ path");
has(TARGET, "return `/p/${e(t.id)}`", "canonicalPath does not emit the /p/ form for a profile");

// The old query form is de-canonicalised, not retired.
has(TARGET, '"p"', "share-target.ts dropped the ?p= parameter — links already in the wild would stop resolving");
has(CODE("profiles-full.js"), "_pdxOpenFromUrl", "the ?p= arrival handler is gone");

// ─────────────────────────────────────────────────────────────────────────────
// 5 · The chrome states the surface, and nothing else
// ─────────────────────────────────────────────────────────────────────────────
section("5 · the file kicker names the surface, not a finding");

has(INDEX, 'id="modal-file-kicker"', "the profile modal has no person-file kicker slot");
const KICK_FN = PF_SRC.slice(PF_SRC.indexOf("function kicker"), PF_SRC.indexOf("function kickerClick"));
must(KICK_FN.length > 200 && KICK_FN.length < 4000, `kicker() could not be sliced (${KICK_FN.length}) — this probe is stale`);
for (const banned of ["Direction Match", "Word vs Action", "Your Record Match", "%", "score", "grade"]) {
  ok(!KICK_FN.includes(banned),
     `the person-file kicker prints ${JSON.stringify(banned)} — chrome that carries a finding outranks the record below it`);
}
has(KICK_FN, "clears(pid)", "the kicker offers a citable address without asking whether the record clears the floor");
has(PF_SRC, "PDXPublicationFloor", "person-file.js does not read the shared publication floor at all");
// And it reads the floor rather than re-deriving one: no threshold of its own.
ok(!/MIN_CITED|>=\s*2/.test(CODE("person-file.js")),
   "person-file.js carries its own publication threshold — that is a second floor waiting to disagree with the sitemap");
has(R("person-file.css"), "#modal-file-kicker", "the kicker has no styles");
has(R("person-file.css"), ":empty", "the kicker does not collapse when it has nothing to say");

// ─────────────────────────────────────────────────────────────────────────────
// 6 · The route is actually served
// ─────────────────────────────────────────────────────────────────────────────
section("6 · /p/* reaches the app, behind the share preview");

const TOML = R("netlify.toml");
const pRewrite = /from\s*=\s*"\/p\/\*"[\s\S]{0,200}?status\s*=\s*200/.test(TOML);
ok(pRewrite, "netlify.toml has no 200-rewrite for /p/* — every person-file link would 404");
has(R("netlify/edge-functions/share-preview.ts"), '"/p/*"',
    "the share-preview edge function does not run on /p/* — a shared person link would have no card");

// And the app loads the funnel plus the floor it reads.
has(INDEX, 'src="person-file.js"', "index.html does not load person-file.js");
has(INDEX, 'src="publication-floor.js"', "index.html does not load publication-floor.js");
has(INDEX, "person-file.css", "index.html does not load person-file.css");

// ─────────────────────────────────────────────────────────────────────────────
// 7 · The cold arrival — the bug this section exists for
// ─────────────────────────────────────────────────────────────────────────────
// https://politidex.fyi/p/mike_lee served the app shell and never opened the
// file. Two causes, both in the arrival path and neither in the rewrite:
//
//   · adopt() gated on record(pid) — an EXACT roster hit — while every in-app
//     door resolves aliases through PDXProfilePid first. The roster files Mike
//     Lee under `lee`, so /p/mike_lee failed closed at that gate and never
//     reached the renderer that would have opened him.
//   · the open was a single setTimeout(…, 420) started inside a deferred script.
//     PROFILES arrives from Firestore behind an anonymous-sign-in wait that
//     firebase-boot.js allows five seconds for, so at 420ms a live-roster pid
//     resolves to nothing — and the one-shot never looked again.
//
// So this section drives the module on a real (fake) clock. Anything that stubs
// setTimeout into a no-op cannot fail these.
section("7 · a cold /p/<pid> arrival opens the person file");

const ROSTER = { lee: { name: "Mike Lee", office: "U.S. Senator", state: "Utah" } };
function cold(pathname, opts) {
  return sandbox(Object.assign({ location: { pathname }, roster: ROSTER }, opts || {}));
}

// The plain case: the canonical pid, a roster that has already landed.
{
  const c = cold("/p/lee");
  c.clock.tick(2000);
  eq(c.calls.openModal.length, 1, "a cold /p/<pid> arrival did not open the file exactly once");
  eq(c.calls.openModal[0], "lee", "the cold arrival opened somebody else");
  ok(c.calls.replace.some((u) => String(u).startsWith("/p/lee")),
     `the cold arrival did not re-stamp its own address (saw ${JSON.stringify(c.calls.replace)})`);
  has(c.doc.getElementById("modal-file-kicker").innerHTML, "Person file",
      "the cold arrival opened the file without setting the person-file kicker");
  has(c.doc.getElementById("modal-file-kicker").innerHTML, "politidex.fyi/p/lee",
      "a record that clears the floor arrived without its citable address in the kicker");
}

// The reported URL. `mike_lee` is the display-name spelling of a record the
// roster keeps under `lee` — the same relationship stance-helpers.js already
// spells out (`mike_lee:'lee'`).
for (const [path, why] of [
  ["/p/mike_lee", "the reported deep link"],
  ["/p/mike_lee/", "the same link with a trailing slash"],
  ["/p/Mike_Lee", "the same link after something upper-cased it"],
]) {
  const c = cold(path);
  c.clock.tick(2000);
  eq(c.calls.openModal[0], "lee", `${why} (${path}) did not open the record it names`);
  ok(c.calls.replace.some((u) => u === "/p/lee"),
     `${why} did not re-stamp to the canonical address (saw ${JSON.stringify(c.calls.replace)})`);
  eq(c.calls.notice.length, 0, `${why} claimed the record does not exist`);
}

// THE REGRESSION. The roster is still in flight at the moment the old code gave
// its answer; it lands afterwards. Nothing may be claimed in between, and the
// file must open once it does land.
{
  const c = cold("/p/lee", { roster: {}, rosterState: "loading" });
  c.clock.tick(600);          // comfortably past the old 420ms bet
  eq(c.calls.openModal.length, 0, "the arrival opened a file before its record existed");
  eq(c.calls.notice.length, 0,
     "the arrival called a real person unknown while the roster was still loading — the reported bug");
  // …and now the roster lands, exactly as firebase-boot.js lands it.
  Object.assign(c.win.PROFILES, { lee: { name: "Mike Lee" } });
  c.win._pdxRosterState = "done";
  c.clock.tick(2000);
  eq(c.calls.openModal.length, 1, "the arrival did not open the file once the roster arrived");
  eq(c.calls.openModal[0], "lee", "the arrival opened the wrong person after the roster arrived");
  eq(c.calls.notice.length, 0, "the arrival complained about a record it went on to open");
}

// An alias that only the live roster can resolve, arriving late.
{
  const c = cold("/p/mike_lee", { roster: {}, rosterState: "loading" });
  c.clock.tick(900);
  eq(c.calls.openModal.length, 0, "an alias opened before the roster that defines it arrived");
  Object.assign(c.win.PROFILES, { lee: { name: "Mike Lee" } });
  c.win._pdxRosterState = "done";
  c.clock.tick(2000);
  eq(c.calls.openModal[0], "lee", "a late-arriving roster did not resolve the alias");
}

// Unknown pid: fail CLOSED. No modal, no blank shell, and one honest notice
// naming the id the reader actually asked for.
{
  const c = cold("/p/nobody_here_at_all");
  c.clock.tick(4000);
  eq(c.calls.openModal.length, 0, "an unknown pid opened a modal anyway");
  eq(c.calls.notice.length, 1, "an unknown pid failed silently instead of saying so");
  has(c.calls.notice[0].message, "nobody_here_at_all",
      "the not-found notice does not name the id the reader asked for");
  eq(c.doc.getElementById("modal-content").innerHTML, "",
     "an unknown pid left content in the profile modal — a blank file pretending to be a record");
}

// An unknown pid must not be CALLED unknown while the roster is still loading —
// that is the same lie in the other direction.
{
  const c = cold("/p/nobody_here_at_all", { roster: {}, rosterState: "loading" });
  c.clock.tick(3000);
  eq(c.calls.notice.length, 0, "the arrival ruled on an id before the roster had loaded");
  c.clock.tick(30000);         // past the ceiling — an answer is owed eventually
  eq(c.calls.notice.length, 1, "a roster that never settles left the arrival silent forever");
  ok(c.clock.pending() === 0, "the arrival loop is still polling after it gave its answer");
}

// The ?p= form is untouched: this module stands down and _pdxOpenFromUrl (in
// profiles-full.js) still owns it, exactly as before.
{
  const c = sandbox({ location: { pathname: "/", search: "?p=lee" }, roster: ROSTER });
  eq(c.P.bootAdopt(), "", "bootAdopt claimed a ?p= link that belongs to _pdxOpenFromUrl");
  c.clock.tick(5000);
  eq(c.calls.openModal.length, 0, "person-file.js opened a ?p= link out from under _pdxOpenFromUrl");
  // …and the query form still resolves when something does ask this module.
  eq(c.P.adopt(), "lee", "PDXPerson.adopt no longer opens the ?p= form at all");
}

// Closing a cold-arrived file goes to the front door, not back to the address of
// the file that was just closed.
{
  const c = cold("/p/lee");
  c.clock.tick(2000);
  c.P.restore();
  eq(c.calls.replace[c.calls.replace.length - 1], "/",
     `closing a cold-arrived person file must return to the front door (saw ${JSON.stringify(c.calls.replace)})`);
}

// A reader who navigated away before the roster landed is not hijacked.
{
  const c = cold("/p/lee", { roster: {}, rosterState: "loading" });
  c.clock.tick(360);
  c.win.location.pathname = "/";
  Object.assign(c.win.PROFILES, { lee: { name: "Mike Lee" } });
  c.win._pdxRosterState = "done";
  c.clock.tick(4000);
  eq(c.calls.openModal.length, 0, "the arrival opened a file after the reader had already left the address");
}

// resolve() is honest about a name two records answer to.
{
  const c = sandbox({
    location: { pathname: "/" },
    roster: { a_one: { name: "Mike Lee" }, b_two: { name: "Mike Lee" } },
  });
  eq(c.P.resolve("mike_lee"), "",
     "an ambiguous display name resolved to one of the two records it could mean");
  eq(c.P.resolve("a_one"), "a_one", "an exact roster hit stopped resolving to itself");
}

// The app's own alias table is consulted before anything is derived.
{
  const c = sandbox({
    location: { pathname: "/" },
    roster: { ivory_h39: { name: "Ken Ivory" } },
    profilePid: (id) => (id === "kivory" ? "ivory_h39" : id),
  });
  eq(c.P.resolve("kivory"), "ivory_h39",
     "resolve() ignores PDXProfilePid — the alias tables the rest of the app opens people through");
}

// And against the REAL bundled roster, so the reported link cannot silently stop
// resolving if cmp-data.js is re-keyed.
{
  const real = sandbox({ location: { pathname: "/p/mike_lee" }, roster: {}, rosterState: "done", clock: true });
  const rosterCtx = vm.createContext({});
  rosterCtx.window = rosterCtx;
  new vm.Script(R("cmp-data.js"), { filename: "cmp-data.js" }).runInContext(rosterCtx);
  real.win.CMP_DATA = rosterCtx.CMP_DATA;
  must(real.win.CMP_DATA && Object.keys(real.win.CMP_DATA).length > 100,
       "cmp-data.js did not load into the sandbox — this probe is stale");
  eq(real.P.resolve("mike_lee"), "lee",
     "/p/mike_lee no longer resolves against the real roster (Mike Lee is filed under `lee`)");
  eq(real.P.resolve("donald_trump"), "trump",
     "a display-name address no longer resolves against the real roster");
  eq(real.P.resolve("trump"), "trump", "a canonical pid stopped resolving to itself");
  eq(real.P.resolve("definitely_not_a_politician"), "",
     "the real roster resolved an id it does not carry");
}

// The two shapes of the old bug must not be able to come back. Read against the
// comment-stripped source: the header explains both failures at length, and a
// probe that matches its own documentation catches nothing.
const PF_CODE = CODE("person-file.js");
ok(!/,\s*420\s*\)/.test(PF_CODE),
   "person-file.js is back to a fixed 420ms bet on when the roster exists");
has(PF_CODE, "_pdxRosterState",
    "the arrival no longer waits on the roster-load flag firebase-boot.js maintains");
ok(!/readyState\s*===\s*'loading'/.test(PF_CODE),
   "the arrival is gated on readyState === 'loading' again — that is false inside a deferred " +
   "script, so the branch is dead and the timer starts before the rest of the client exists");
has(PF_CODE, "PDXProfilePid",
    "the arrival path resolves ids without the alias table every other door in the app uses");
must(typeof sandbox({ location: { pathname: "/" } }).P.bootAdopt === "function",
     "PDXPerson.bootAdopt is not exported — this probe is stale");

console.log("");
if (failures.length) {
  console.error(`✗ person file: ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}
console.log(`✓ person file: one funnel, one /p/<pid> address, four emitters agreeing on it — ${passed} assertions passed\n`);
