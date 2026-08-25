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

function sandbox(opts) {
  opts = opts || {};
  const calls = { openModal: [], jump: [], replace: [], notice: [] };
  const doc = {
    readyState: "complete",
    addEventListener() {},
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
  const win = {
    document: doc,
    location: Object.assign({ origin: "https://politidex.fyi", pathname: "/", search: "", hash: "", href: "https://politidex.fyi/" }, opts.location || {}),
    history: {
      replaceState(a, b, url) { calls.replace.push(url); },
      pushState() {},
    },
    addEventListener() {},
    setTimeout(f) { calls.jump.push("deferred"); return 0; },
    URLSearchParams,
    encodeURIComponent,
    openModal(id) { calls.openModal.push(id); },
    CMP_DATA: { mike_lee: { name: "Mike Lee", office: "U.S. Senator", state: "Utah" } },
    PDXPublicationFloor: { clears: (pid) => pid === "mike_lee" },
  };
  win.window = win;
  win.globalThis = win;
  const ctx = vm.createContext(win);
  new vm.Script(PF_SRC, { filename: "person-file.js" }).runInContext(ctx);
  return { win, calls, P: win.PDXPerson };
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

console.log("");
if (failures.length) {
  console.error(`✗ person file: ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}
console.log(`✓ person file: one funnel, one /p/<pid> address, four emitters agreeing on it — ${passed} assertions passed\n`);
