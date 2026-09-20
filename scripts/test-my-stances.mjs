#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Tests for /my-stances — THE STANCE STUDIO, which teaches itself
// ─────────────────────────────────────────────────────────────────────────────
// WHAT WAS WRONG, in three defects a reader actually hit:
//
//   1. '#my-stances' WAS A SCROLL POSITION, NOT AN ADDRESS. The stance editor
//      lived in a <section id="my-stances"> on the homepage. Every "go set a
//      position" door in the product — eight modules' worth — ultimately meant
//      "scroll somewhere on /", and on a page that long it meant the wrong
//      band: /#my-stances landed readers in Relevant-to-me.
//   2. /ballot's "Set your positions" COULD NOT OPEN AN EDITOR AT ALL. It set a
//      hash on a document with no such section, which is a no-op. The one
//      control on the one screen that needs positions did nothing.
//   3. /me PAINTED GHOSTS. Three dashed chips in the row where every other chip
//      means "a side you hold", holding no side, directly above the sentence
//      "Nothing on file yet." The row and the sentence contradicted each other,
//      and the row is louder. They were not even controls.
//
// WHAT IT IS NOW. /my-stances is a document (my-stances.html, rewritten from
// /my-stances and /my-stances/ in netlify.toml) carrying stance-studio.js in
// two modes over ONE store:
//
//   MODE A · nothing on file → a self-tutorial, one beat at a time. Twelve
//     starter chips off real ISSUE_MAP keys with locked scope sentences; a
//     typeahead over label AND locked sentence; then that one issue, its scope
//     sentence, and Support / Oppose / Not sure; then one line saying what the
//     answer did. Three saved positions changes a BUTTON LABEL, never a grade.
//   MODE B · anything on file → the library of positions actually held, search
//     always visible, the starter row folded away under "Add an issue".
//
// THE FAILURE MODES THIS EXISTS TO CATCH, every one of which ships quietly:
//
//   1. THE TUTORIAL GREETS A RETURNING READER. Someone holding forty positions
//      being asked "what do you care about first?" is the surface telling them
//      their file is empty. The mode question has exactly one input.
//   2. THE TUTORIAL NEVER PAYS OFF. A mode recomputed from count() on every
//      paint flips to the library the instant the FIRST position saves, so the
//      beat that says what the answer just did never paints. The mode is
//      sticky for the visit for this reason and this reason only.
//   3. THE STORE IS READ AS A MAP. PDXStances.all() returns an ARRAY.
//      Object.keys() over it yields "0","1","2" — no issue key — so the list
//      comes back empty, every reader looks new, and nothing throws.
//   4. "NOT SURE" WRITES SOMETHING. Undecided is the ABSENCE of a record. A
//      neutral, a 'mixed', or an "unset" marker would all be the studio
//      putting a position in someone's mouth — and `mixed` is a real mixed
//      position in this product, not "I don't know".
//   5. THE SEARCH CANNOT FIND WHAT THE PLACEHOLDER PROMISES. The field invites
//      "turf, data centers, fentanyl, vouchers". Copy that teaches a search
//      term the search cannot answer is worse than no copy.
//   6. A SCORE ARRIVES. A politician percentage, a party, a completion meter, a
//      "1 of 3" — on the one page in the product forbidden to show any of them.
//   7. A SECOND STORE. A third storage key, a studio-owned bucket, anything
//      that can disagree with pdx_my_stances_v1 about the same issue.
//   8. THE HOMEPAGE EDITOR COMES BACK. Two editors is two empty states, two
//      first-runs, and one of them wrong the day the other changes.
//   9. THE DOORS STOP POINTING HERE. /ballot, /me, the race sheet and the
//      dossier all name this document; a hash fallback in any of them is
//      defect 1 and 2 returning.
//  10. THE TWIN BOOT BREAKS. Direction Match is computed by consistency.js and
//      is NOT on this document — if /my-stances ever pulls in the record
//      engine, a 3.6 MB page is the cost of taking one side.
//
// Nine sections:
//   1. THE DOCUMENT — the address, the flag, the assets, no record engine.
//   2. MODE A — the tutorial, and only when the store is empty.
//   3. THE LESSON — the typeahead over labels and locked sentences.
//   4. THE ASK AND THE ANSWER — support writes, "Not sure" does not.
//   5. THREE SAVES — the label changes, the mode flips, no denominator.
//   6. MODE B — the library, real sides only, no ghosts.
//   7. THE DEEP LINKS — ?issue= and ?add=1, read once and cleared.
//   8. NO HOMEPAGE EDITOR, AND NO SECOND STORE.
//   9. WHO POINTS HERE — and the twin boot that must not have moved.
//
//   node scripts/test-my-stances.mjs
//
// No database, no network, no browser. Exit code is non-zero on any failure.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

const DOC = R("my-stances.html");
const STUDIO_JS = R("stance-studio.js");
const STUDIO_CSS = R("stance-studio.css");
const STANCES_JS = R("my-stances.js");
// THE ONE READER OF "SIDES THIS PERSON HOLDS", and it loads here because the
// document loads it — /my-stances ships it before both modules below. The
// studio has no private walk of the store any more: it asks PDXStanceSides, so
// a boot without this file measures a studio that correctly reports nothing.
const SIDES_JS = R("stance-sides.js");
const MAP_JS = R("issue-map.js");
const SCOPE_JS = R("issue-scope.js");
const IC_JS = R("issue-colors.js");
// THE SECOND STORE BEHIND THE ONE READER. stance-sides.js walks my-stances.js's
// device key AND your-file.js's per-account key, and /my-stances now ships both
// owners — see the tag in my-stances.html and section 10. A sandbox that booted
// only the first would be testing a document this repo does not serve, and it
// would go on passing the day the tag was deleted.
const YF_JS = R("your-file.js");
const INDEX_HTML = R("index.html");
const BALLOT_HTML = R("ballot.html");
const BW_JS = R("ballot-workspace.js");
const RS_JS = R("race-sheet.js");
const DESK_JS = R("me-desk.js");
const DOSSIER_JS = R("profile-dossier.js");
const TOML = R("netlify.toml");
const SW = R("sw.js");

const jsBare = (s) =>
  String(s).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^[ \t]*\/\/.*$/gm, " ");
// A DOCTRINAL COMMENT IS NOT A DEFECT. Every document in this repo explains its
// own invariants in <!-- --> above the markup that keeps them, which means the
// prose naming a banned shape contains the banned shape. The first draft of
// this suite failed on my-stances.html's own paragraph about why relative
// asset paths are forbidden — quoting src="stance-studio.js" as the example of
// what not to write — and on the homepage comment that records what
// <section id="my-stances"> used to be. Both were the file doing exactly the
// right thing. So markup probes read the comment-stripped body; the two
// checks that WANT to read a comment say so at the call site.
const htmlBare = (s) => String(s).replace(/<!--[\s\S]*?-->/g, " ");
const STUDIO_CODE = jsBare(STUDIO_JS);
const DESK_CODE = jsBare(DESK_JS);
const BW_CODE = jsBare(BW_JS);
const RS_CODE = jsBare(RS_JS);

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) >= 0, `${msg} — "${needle}" missing`);
const lacks = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) < 0, `${msg} — "${needle}" present and must not be`);
// A STALE HARNESS IS NOT A PASS. Every probe below reads a beat out of a
// painted host; if the paint stops happening this suite must die loudly rather
// than report zero failures over an empty string.
const must = (cond, msg) => {
  if (cond) { passed++; return; }
  console.error(`\n✗ my-stances: STALE HARNESS — ${msg}\n`);
  process.exit(2);
};
const section = (t) => console.log(`\n   ── ${t}`);

/* ── the studio, booted the way my-stances.html loads it ────────────────────
   THE REAL MODULES, NOT STUBS. issue-map.js owns the 121-key register,
   issue-scope.js owns the locked scope sentences, issue-colors.js owns the hex,
   and my-stances.js owns the store. All four run in one context in the
   document's own script order, so every answer read below is the shipped
   owner's answer. A stubbed PDXStances would let the studio pass here while
   disagreeing with the module that actually holds the reader's positions —
   which is failure mode 3, and it is the one that fails silently. */
function makeDoc() {
  const nodes = [];
  function node(tag) {
    const n = {
      tagName: String(tag || "div").toUpperCase(),
      id: "", className: "", textContent: "", value: "", hidden: false,
      _html: "",
      children: [], parentNode: null, attrs: {},
      style: { setProperty() {}, removeProperty() {} },
      setAttribute(k, v) { this.attrs[k] = String(v); if (k === "id") this.id = String(v); },
      getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
      removeAttribute(k) { delete this.attrs[k]; },
      addEventListener() {}, removeEventListener() {},
      appendChild(c) { c.parentNode = this; this.children.push(c); return c; },
      insertBefore(c) { c.parentNode = this; this.children.push(c); return c; },
      removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); return c; },
      querySelector() { return null; }, querySelectorAll() { return []; },
      closest() { return null; }, focus() {}, click() {}, remove() {},
      scrollIntoView() {}, insertAdjacentHTML() {},
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    };
    // INNERHTML HAS TO MAKE THE IDS FINDABLE. stance-studio.js prints a beat as
    // a STRING declaring <input id="mst-q"> and <div id="mst-hits">, then its
    // typing path looks #mst-hits up by id and repaints only that — which is
    // the whole reason a store event from another tab cannot eat a half-typed
    // word. A flat string property satisfies every markup probe here and
    // quietly makes that path untestable. So a write registers a stub node for
    // every id it declares: no parser, no tree, just the lookup the module
    // needs.
    Object.defineProperty(n, "innerHTML", {
      get() { return this._html; },
      set(v) {
        this._html = String(v == null ? "" : v);
        const re = /\sid="([^"]+)"/g;
        let m;
        while ((m = re.exec(this._html))) {
          if (!nodes.some((x) => x.id === m[1])) {
            const stub = node("div");
            stub.id = m[1];
            stub.parentNode = this;
          }
        }
      },
      enumerable: true, configurable: true,
    });
    nodes.push(n);
    return n;
  }
  const body = node("body");
  const doc = {
    readyState: "complete", cookie: "", body, activeElement: null,
    head: node("head"), documentElement: node("html"),
    createElement: (t) => node(t),
    getElementById: (id) => nodes.find((n) => n.id === id) || null,
    querySelector: () => null, querySelectorAll: () => [],
    addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
  };
  doc.__node = node;
  doc.__nodes = nodes;
  return doc;
}

const STORE_KEY = "pdx_my_stances_v1";
// your-file.js's own base key, spelled here because the fixture writes it the
// way that module writes it. A signed-in desk lives under KEY + '__u_' + uid;
// see boot()'s `desk` / `uid` options.
const DESK_KEY = "pdx_your_file_v1";

function boot(opts) {
  const o = opts || {};
  const win = {
    console, JSON, Math, Date, String, Number, Boolean, Array, Object, RegExp,
    Error, Promise, Set, Map, URLSearchParams,
    encodeURIComponent, decodeURIComponent, parseInt, parseFloat, isNaN,
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    requestAnimationFrame(f) { try { f(); } catch (e) {} return 0; },
  };
  win.window = win;
  win.self = win;
  win.document = makeDoc();
  // ONE FLAG, NO PATH SNIFFING. my-stances.html sets this before any module
  // runs, and PDXStances.open() reads it to decide "mount here" versus
  // "navigate". /my-stances, /my-stances/ and a preview server's
  // /my-stances.html are three spellings a path test gets differently.
  win.__PDX_STANCES_DOC = true;

  const sec = win.document.__node("section");
  sec.id = "my-stances";
  win.document.body.appendChild(sec);
  const mst = win.document.__node("div");
  mst.id = "mst";
  sec.appendChild(mst);

  const url = o.search || "";
  win.location = {
    href: "https://politidex.fyi/my-stances" + url,
    pathname: "/my-stances", search: url, hash: "",
    origin: "https://politidex.fyi",
    replace() {}, assign(u) { win.__nav = String(u); },
  };
  win.history = { pushState() {}, replaceState(a, b, u) { win.__url = String(u); } };

  // THE POSITIONS, WRITTEN THE WAY THE OWNER WRITES THEM. One opaque JSON blob
  // under my-stances.js's own key, in its own shape, so the read under test is
  // that module's real load() and normalise rather than a fixture handed
  // straight to the studio.
  const store = {};
  // THE ACCOUNT DESK, WRITTEN THE WAY ITS OWNER WRITES IT. `desk` seeds
  // your-file.js's answers map; `uid` puts them under the per-account namespace
  // and hands the module a PDXStore whose getAccount() names that uid, which is
  // the branch a signed-in reader actually takes (your-file.js's activeKey() →
  // nsFor(uid)). Without `uid` the base key is read, which is the guest branch.
  if (o.desk) {
    const answers = {};
    Object.keys(o.desk).forEach((k) => {
      answers[k] = { position: o.desk[k], updatedAt: 1700000000000 };
    });
    const blob = JSON.stringify({ version: 1, answers, updatedAt: 1700000000000 });
    store[o.uid ? `${DESK_KEY}__u_${o.uid}` : DESK_KEY] = blob;
  }
  if (o.held) {
    const items = {};
    Object.keys(o.held).forEach((k) => {
      items[k] = {
        issueKey: k, position: o.held[k], priority: "medium", note: "",
        createdAt: 1700000000000, updatedAt: 1700000000000,
      };
    });
    store[STORE_KEY] = JSON.stringify({ version: 1, items, updatedAt: 1700000000000 });
  }
  win.localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem(k, v) { store[k] = String(v); },
    removeItem(k) { delete store[k]; },
    key: (i) => Object.keys(store)[i] || null,
    get length() { return Object.keys(store).length; },
  };
  const sess = o.seat ? { pdx_bw_seat: String(o.seat) } : {};
  win.sessionStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(sess, k) ? sess[k] : null),
    setItem(k, v) { sess[k] = String(v); },
    removeItem(k) { delete sess[k]; },
  };
  win.addEventListener = () => {};
  win.removeEventListener = () => {};
  win.dispatchEvent = () => true;
  win.CustomEvent = function (t, d) { return { type: t, detail: (d && d.detail) || null }; };
  win.__store = store;

  // THE ACCOUNT CONTEXT, WHEN THE FIXTURE ASKS FOR ONE. This is the only thing
  // that makes your-file.js read its namespaced key rather than the base one,
  // and it is the same seam the real app uses: PDXStore.getAccount(). read()
  // falls through to localStorage so the blob above is the single source.
  if (o.uid) {
    win.PDXStore = {
      getAccount: () => String(o.uid),
      read: (k, dflt) => {
        try {
          const raw = win.localStorage.getItem(k);
          return raw == null ? dflt : JSON.parse(raw);
        } catch (e) { return dflt; }
      },
      write: (k, v) => { store[k] = JSON.stringify(v); },
      defineCollection() {}, registerSnapshot() {}, registerReconciler() {},
      markDirty() {},
    };
  }

  const ctx = vm.createContext(win);
  win.__err = null;
  try {
    vm.runInContext(MAP_JS, ctx, { filename: "issue-map.js" });
    vm.runInContext(SCOPE_JS, ctx, { filename: "issue-scope.js" });
    vm.runInContext(IC_JS, ctx, { filename: "issue-colors.js" });
    vm.runInContext(SIDES_JS, ctx, { filename: "stance-sides.js" });
    vm.runInContext(STANCES_JS, ctx, { filename: "my-stances.js" });
    // BEFORE THE STUDIO, EXACTLY AS THE DOCUMENT ORDERS THE TAGS. The studio's
    // mode is sticky and decided on its FIRST paint from the reader's count, so
    // a your-file.js that parsed after it would leave the coach open over a full
    // account desk — which is the bug, one tag later. Section 10 pins the order
    // in the served markup; this pins that the sandbox reproduces it.
    if (!o.noDesk) vm.runInContext(YF_JS, ctx, { filename: "your-file.js" });
    vm.runInContext(STUDIO_JS, ctx, { filename: "stance-studio.js" });
  } catch (e) { win.__err = e; }
  win.__host = () => win.document.getElementById("mst");
  win.__paint = () => {
    const S = win.PDXStanceStudio;
    if (S) { try { S.render(); } catch (e) { win.__err = e; } }
    const h = win.document.getElementById("mst");
    return h ? String(h.innerHTML) : "";
  };
  return win;
}

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the document: an address, a flag, and no record engine");
// ═════════════════════════════════════════════════════════════════════════════
// The whole point of the pass. If /my-stances is not a real route, everything
// below is a unit test of a page nobody can reach.
has(TOML, 'from = "/my-stances"', "netlify.toml does not route /my-stances");
has(TOML, 'from = "/my-stances/"', "netlify.toml does not route the trailing-slash spelling");
{
  // FIRST MATCH WINS in netlify.toml, and there is no catch-all, so the only way
  // /my-stances can be shadowed is by an EARLIER exact rule of the same path.
  const mine = TOML.indexOf('from = "/my-stances"');
  const me = TOML.indexOf('from = "/me"');
  ok(mine > 0 && me > 0, "one of the two document routes is missing entirely");
  const before = TOML.slice(0, mine);
  ok(!/from = "\/my-stances"/.test(before), "/my-stances is routed twice and the first one wins");
}
has(DOC, "__PDX_STANCES_DOC", "my-stances.html does not declare the document flag the store reads");
has(DOC, "/stance-studio.js", "the studio is not loaded on its own document");
has(DOC, "/stance-studio.css", "the studio's stylesheet is not on its own document");
has(DOC, "/my-stances.js", "the every-issue collection is not on its own document");
has(DOC, "/issue-scope.js", "the locked scope sentences are not on the page that teaches them");
has(DOC, 'id="mst"', "the studio has no host to paint into");
// ROOT-ABSOLUTE, ALWAYS. A trailing-slash route with a bare src= serves the
// HTML back as the script, which is silent and total.
{
  const bad = (htmlBare(DOC).match(/(?:src|href)="(?!https?:|\/|#|data:|mailto:)[^"]+"/g) || []);
  eq(bad.length, 0, `my-stances.html carries ${bad.length} relative asset path(s) — a trailing-slash route serves HTML as JS`);
}
// THE RECORD ENGINE IS NOT HERE, and that is 3.6 MB of not-here. The studio
// prints no match, so it needs none of it.
["consistency.js", "politician-stances-core.js", "politician-stances-ext.js",
 "cmp-data.js", "voter-hub-location.js"].forEach((f) => {
  lacks(DOC, "/" + f, `my-stances.html loads ${f} — the studio prints no match and must not pay for one`);
});
// The shell ships whole or not at all.
has(SW, "'/my-stances.html'", "sw.js does not precache the document");
// THE PROVENANCE PIN, AND THE COPY IT NAMES. The storage seam, the promise
// ledger and the firebase block are inlined on this document because PDXStore
// is a PARSE-TIME seam — every collection calls defineCollection() while it
// parses, so a <script src> arrives either as an extra request on the critical
// path or, with defer, after the collections that need it. The cost of inlining
// is a copy, and the only thing that makes a copy honest is a pin that fails
// when the origin moves. index.html is the origin, person.html copied it,
// me.html copied person.html, and this document copied me.html; a fix at the
// origin surfaces as one failure per link in that chain.
{
  const ME = R("me.html").split("\n");
  const m = DOC.match(/COPIED VERBATIM FROM me\.html LINES (\d+)[^0-9]{1,3}(\d+)/);
  ok(!!m, "my-stances.html does not declare where its 1,588-line storage seam came from");
  if (m) {
    const a = Number(m[1]), b = Number(m[2]);
    const run = ME.slice(a - 1, b).join("\n");
    ok(run.trim().length > 0, `me.html ${a}-${b} is an empty slice — the pin names nothing`);
    ok(DOC.indexOf(run) >= 0,
      `the declared run me.html ${a}-${b} is not byte-identical in my-stances.html — ` +
      "if the origin moved, re-derive the range by LOCATING the run, never by subtracting a diff");
    // AND THE PIN IS MAXIMAL: one line past the declared end must NOT match, or
    // the range is merely inside the copy rather than naming it.
    ok(DOC.indexOf(ME.slice(a - 1, b + 1).join("\n")) < 0,
      `me.html ${a}-${b + 1} also matches — the declared range understates the copy, so a change just past it goes unnoticed`);
    // The chain's own headers survive inside the run. Deleting them would make
    // this document look like an origin.
    has(DOC, "COPIED VERBATIM FROM person.html", "the copied run lost me.html's own provenance headers");
  }
}
has(SW, "'/stance-studio.js'", "sw.js does not precache the studio");
has(SW, "'/stance-studio.css'", "sw.js does not precache the studio's stylesheet");
lacks(SW, "'/door2-first-run.js'", "sw.js still precaches the coach this pass deleted");
lacks(SW, "'/door2-first-run.css'", "sw.js still precaches the deleted coach's stylesheet");
ok(!existsSync(join(ROOT, "door2-first-run.js")), "door2-first-run.js is still in the tree");
ok(!existsSync(join(ROOT, "door2-first-run.css")), "door2-first-run.css is still in the tree");

// ═════════════════════════════════════════════════════════════════════════════
section("2 · mode A: the tutorial, and ONLY when the store is empty");
// ═════════════════════════════════════════════════════════════════════════════
const empty = boot({});
must(!empty.__err, `the studio threw on an empty store: ${empty.__err ? empty.__err.stack : ""}`);
must(!!empty.PDXStanceStudio, "stance-studio.js did not publish window.PDXStanceStudio");
must(!!empty.PDXStances, "my-stances.js did not publish window.PDXStances — this harness is stale");
const S = empty.PDXStanceStudio;

eq(S.count(), 0, "the studio found positions in an empty store");
eq(S.mode(), "A", "a reader with nothing on file was not given the tutorial");
eq(S.beat(), "pick", "the tutorial did not open on the pick beat");
const a0 = empty.__paint();
must(a0.length > 100, "the pick beat painted nothing");
has(a0, 'data-beat="pick"', "the first beat is not the pick beat");
has(a0, "What do you care about first?", "the tutorial does not ask its own first question");
has(a0, "Skip for now", "there is no way out of the tutorial");

// THE TWELVE, AND BOTH POLES OF EVERY FIGHT IN IT. A starter row with gun
// rights and no gun safety is a push poll with chips.
const STARTERS = S.STARTERS.slice();
eq(STARTERS.length, 12, `the starter row offers ${STARTERS.length} chips — the brief named twelve`);
const MAP = empty.ISSUE_MAP || {};
STARTERS.forEach((k) => {
  ok(!!MAP[k], `starter "${k}" is not a real ISSUE_MAP key`);
  const sc = empty.PDXIssueScope && empty.PDXIssueScope.read(k);
  ok(!!(sc && sc.defined), `starter "${k}" has no locked scope sentence — the ask beat would open on a missing definition`);
});
[["gun_rights", "gun_safety"], ["energy_production", "climate_action"],
 ["public_schools", "school_choice"]].forEach((pair) => {
  eq(pair.filter((k) => STARTERS.includes(k)).length, 2,
    `only one pole of ${pair[0]}/${pair[1]} is in the starter row — that is a push poll with chips`);
});
// NOT A MORAL METER. No "1 of 3", no bar, no percentage, no party.
["%", "1 of 3", "of 3", "match", "Match", "Republican", "Democrat"].forEach((n) => {
  lacks(a0, n, `the tutorial's first beat prints "${n}"`);
});

// FAILURE MODE 1: the tutorial must never greet a reader who has answered.
const ret = boot({ held: { housing: "support" } });
must(!ret.__err, `the studio threw for a returning reader: ${ret.__err ? ret.__err.stack : ""}`);
eq(ret.PDXStanceStudio.count(), 1, "the studio could not read one saved position out of the real store");
eq(ret.PDXStanceStudio.mode(), "B", "a reader holding a position was shown the tutorial");
eq(ret.PDXStanceStudio.beat(), "library", "a reader holding a position did not get the library");
lacks(ret.__paint(), "What do you care about first?",
  "a returning reader is asked what they care about FIRST — their file is not empty");

// FAILURE MODE 3: the store is an ARRAY. Read as a map it yields "0","1","2".
{
  const rows = ret.PDXStances.all();
  ok(Array.isArray(rows), "PDXStances.all() is no longer an array — the studio's read shape is wrong");
  const viaKeys = Object.keys(rows);
  ok(!viaKeys.includes("housing"),
    "Object.keys(all()) now yields issue keys — this assertion existed because it yields indices");
  eq(S.sides().length, 0, "the studio invented a side from an empty store");
  eq(ret.PDXStanceStudio.sides().length, 1, "the studio dropped the one position in the store");
  eq(ret.PDXStanceStudio.sides()[0].key, "housing", "the studio read an index where an issue key belongs");
}
// THE FRONT DOOR MOVED, ONCE, ON PURPOSE. The studio used to call P.all()
// itself; it asks PDXStanceSides now, because three surfaces asking three
// different questions is what put "Nothing on file yet." on /me over a full
// file. So the call this assertion protects is asserted where it now lives —
// and the studio is held to having no private walk left behind it, which is the
// only way "one reader" survives the next edit.
has(SIDES_JS, "P.all()", "the one reader no longer calls the store's own front door");
lacks(SIDES_JS, "Object.keys(P.all", "the one reader reads the position array as a key/value map");
has(STUDIO_CODE, "PDXStanceSides", "the studio does not ask the one reader for the sides it paints");
lacks(STUDIO_CODE, "P.all()", "the studio grew a private walk of the store again — there is one reader");

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the lesson: the typeahead reaches the words in the placeholder");
// ═════════════════════════════════════════════════════════════════════════════
// THE COPY IS A PROMISE. The field says "Anything specific — turf, data
// centers, fentanyl, vouchers…" and each of those is a word no chip uses. If
// one of them returns nothing, the reader learns the search is broken and
// stops trusting the rest of the page.
has(a0, "turf", "the search placeholder no longer teaches a word the chips do not use");
has(S.PLACEHOLDER, "turf", "the placeholder lost its own example");
{
  const turf = S.search("turf");
  ok(turf.length > 0, 'typing "turf" returns nothing — the placeholder promises it');
  ok(turf.includes("water"),
    `"turf" does not reach water conservation (got ${JSON.stringify(turf)}) — the locked sentence is the lesson`);
  // AND IT REACHES IT THROUGH THE SENTENCE, not through a label. If "turf" ever
  // appears in the Water label this assertion stops proving anything, so the
  // label is checked too.
  ok(String(MAP.water.label).toLowerCase().indexOf("turf") < 0,
    'the water label now contains "turf" — the sentence-hit path is no longer being proved');
  const scope = empty.PDXIssueScope.read("water");
  has(String(scope.inn).toLowerCase(), "turf",
    "water conservation's locked sentence no longer contains the word the placeholder teaches");
}
["data center", "fentanyl", "vouchers"].forEach((q) => {
  ok(S.search(q).length > 0, `the placeholder promises "${q}" and the search returns nothing for it`);
});
// THE CAP IS A CAP. Five hits, because a hit list longer than a thumb is the
// 121-key dropdown again in a different shape.
eq(S.HITS, 5, "the hit cap moved off five");
["a", "e", "school", "tax", "water", "energy"].forEach((q) => {
  ok(S.search(q).length <= 5, `the query "${q}" returned more than five hits`);
});
// A QUERY SHORTER THAN TWO CHARACTERS IS TYPING, NOT A QUESTION.
eq(S.search("t").length, 0, "a one-character query searched the whole register");
eq(S.search("").length, 0, "an empty query returned hits");
// Label hits rank above sentence hits: a reader who types an issue's name means
// that issue.
{
  const hits = S.search("housing");
  ok(hits.length > 0, '"housing" returns nothing');
  eq(hits[0], "housing", "an exact label match is not the first hit");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the ask and the answer: Support writes, 'Not sure' does not");
// ═════════════════════════════════════════════════════════════════════════════
{
  const w = boot({});
  const T = w.PDXStanceStudio;
  T.pick("housing");
  eq(T.beat(), "ask", "picking an issue did not open the ask beat");
  const ask = w.__paint();
  has(ask, 'data-beat="ask"', "the ask beat did not paint");
  // THE SCOPE SENTENCE IS THE CONTENT OF THIS SCREEN. It is the locked one,
  // read off issue-scope.js, and it is never reworded here.
  const locked = w.PDXIssueScope.read("housing").inn;
  must(!!locked, "housing has no locked scope sentence — this harness is stale");
  has(ask, locked.slice(0, 40), "the ask beat does not print the issue's own locked scope sentence");
  has(ask, "Support", "the ask beat offers no Support");
  has(ask, "Oppose", "the ask beat offers no Oppose");
  has(ask, "Not sure", "the ask beat offers no way to decline");
  lacks(ask, "%", "the ask beat prints a percentage");
  lacks(ask, "Direction Match", "the ask beat prints Direction Match");

  // "NOT SURE" WRITES NOTHING. Not a neutral, not a 'mixed', not an "unset"
  // marker. `mixed` is a real mixed position in this product; conflating the
  // two would put a stance in someone's mouth.
  const before = JSON.stringify(w.__store);
  T.answer("housing", "unsure");
  eq(T.count(), 0, '"Not sure" wrote a position');
  eq(T.position("housing"), "", '"Not sure" left a side on file');
  eq(JSON.stringify(w.__store), before, '"Not sure" touched the store at all');
  // It still advances — the reader learned the move, and the beat says plainly
  // that nothing was saved.
  eq(T.beat(), "done", '"Not sure" did not advance to the beat that explains itself');
  const d0 = w.__paint();
  has(d0, "Nothing saved", 'the done beat does not say that "Not sure" saved nothing');
  lacks(d0, "Saved to your file", 'the done beat claims a save after "Not sure"');
  lacks(d0, "position on file", 'the done beat counts a position after "Not sure"');
}
{
  const w = boot({});
  const T = w.PDXStanceStudio;
  T.pick("housing");
  T.answer("housing", "support");
  eq(T.count(), 1, "Support did not write a position");
  eq(T.position("housing"), "support", "Support wrote the wrong side");
  // ONE STORE. The position is in my-stances.js's own key, in its own shape.
  ok(String(w.__store[STORE_KEY] || "").indexOf("housing") >= 0,
    "the saved position is not in pdx_my_stances_v1 — the studio opened a store of its own");
  const keys = Object.keys(w.__store);
  eq(keys.length, 1, `the studio wrote ${keys.length} storage keys: ${JSON.stringify(keys)} — the brief allows one`);

  // FAILURE MODE 2: the payoff beat. Saving the FIRST position must not flip the
  // surface into the library, or the tutorial's third beat never paints.
  eq(T.beat(), "done", "saving the first position skipped the beat that says what it did");
  const d = w.__paint();
  has(d, 'data-beat="done"', "the done beat did not paint");
  has(d, "Saved to your file", "the done beat does not say the position was saved");
  has(d, "formal record", "the done beat does not say what the position will be used for");
  has(d, "1 position on file", "the done beat does not count the one position");
  // NO POLITICIAN, NO PERCENTAGE, NO VERDICT on this page. Ever.
  ["%", "Direction Match", "Word vs Action", "Republican", "Democrat", "agrees with you"]
    .forEach((n) => lacks(d, n, `the done beat prints "${n}" — this page shows no verdict`));
  // Before three, the primary is "add another" and it stays in the tutorial.
  has(d, "Add another issue", "the done beat does not offer the next issue");
  lacks(d, "See all on file", "the done beat offers the library before the third position");
  // NOT A MORAL METER: no "1 of 3", no denominator of any kind.
  ["1 of 3", "2 of 3", "of 3 ", "33%"].forEach((n) =>
    lacks(d, n, `the done beat prints "${n}" — three is a button label, never a denominator`));
}
// AN UNRECOGNISED KEY OR SIDE IS REFUSED, not coerced into something storable.
{
  const w = boot({});
  const T = w.PDXStanceStudio;
  T.answer("not_a_real_issue_key", "support");
  eq(T.count(), 0, "the studio saved a position against a key the register does not hold");
  T.pick("housing");
  T.answer("housing", "sort of");
  eq(T.count(), 0, "the studio accepted a side that is not one of the three the store speaks");
}
// CLEARING IS A REMOVAL. Not a neutral marker, not an empty string.
{
  const w = boot({ held: { housing: "support" } });
  const T = w.PDXStanceStudio;
  eq(T.count(), 1, "the fixture position did not load");
  T.clear("housing");
  eq(T.count(), 0, "clearing left a record behind");
  eq(T.position("housing"), "", "clearing left a side on file");
  const raw = String(w.__store[STORE_KEY] || "");
  ok(raw.indexOf('"position":"neutral"') < 0 && raw.indexOf('"position":"unset"') < 0,
    "clearing wrote a neutral or unset marker — the honest shape of 'no position' is no record");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · three saves: a button label changes, and the mode flips");
// ═════════════════════════════════════════════════════════════════════════════
{
  const w = boot({});
  const T = w.PDXStanceStudio;
  eq(T.GOAL, 3, "the tutorial's goal moved off three");
  ["housing", "water", "healthcare"].forEach((k, i) => {
    T.pick(k);
    T.answer(k, i === 1 ? "oppose" : "support");
    // STICKY MODE, THE WHOLE WAY. Every one of the three saves must land on the
    // done beat, because the done beat is what teaches what a save does.
    eq(T.beat(), "done", `save ${i + 1} of 3 did not paint the beat that explains it`);
  });
  eq(T.count(), 3, "three saves did not produce three positions");
  eq(T.mode(), "A", "the mode stopped being sticky before the reader finished the tutorial");
  const third = w.__paint();
  has(third, "See all on file", "the third save does not offer the library");
  lacks(third, "Add another issue", "the third save still offers a fourth question as the primary");
  has(third, "3 positions on file", "the third save does not count three positions");
  // THE COUNT IS A LENGTH, WRITTEN AS A SENTENCE — the same words the
  // collection's own door count uses. One phrasing for one fact.
  eq(T.countLine(1), "1 position on file", "the count sentence does not agree with the brief's copy");
  eq(T.countLine(3), "3 positions on file", "the plural count sentence is wrong");
  has(STANCES_JS, "' position' : ' positions') + ' on file'",
    "the collection's door count and the studio's count no longer use the same words");
  // AND THEN IT FLIPS — on the gesture, not on the arithmetic.
  T.seeAll();
  eq(T.mode(), "B", '"See all on file" did not move the reader to the library');
  eq(T.beat(), "library", '"See all on file" did not paint the library');
}
// SKIP IS A VISIT, NOT A VOW. It writes nothing — it cannot, there is no flag
// to write to — and it lands on the library plus the search, which is the page
// minus the lesson.
{
  const w = boot({});
  const T = w.PDXStanceStudio;
  const before = JSON.stringify(w.__store);
  T.skip();
  eq(JSON.stringify(w.__store), before, "skipping the tutorial wrote something to storage");
  eq(T.beat(), "library", "skipping the tutorial did not land on the library");
  const sk = w.__paint();
  has(sk, "Nothing on file yet", "the skipped-to library does not say the file is empty");
  has(sk, 'id="mst-q"', "the skipped-to library has no search — that is the whole page gone");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · mode B: the library, real sides only, and NO GHOSTS");
// ═════════════════════════════════════════════════════════════════════════════
{
  const w = boot({ held: { housing: "support", water: "oppose", school_choice: "mixed" } });
  const T = w.PDXStanceStudio;
  eq(T.count(), 3, "the library did not read three saved positions");
  const lib = w.__paint();
  has(lib, 'data-beat="library"', "the library did not paint");
  has(lib, "3 positions on file", "the library does not count what is on file");
  has(lib, "Tap one to change it or clear it", "the library does not say the chips are controls");
  // EVERY CHIP CARRIES A SIDE, and the side is the one on file.
  const held = (lib.match(/class="mst-held"/g) || []).length;
  eq(held, 3, `the library painted ${held} chips for three positions`);
  has(lib, 'data-pos="support"', "the housing chip does not carry its side");
  has(lib, 'data-pos="oppose"', "the water chip does not carry its side");
  has(lib, 'data-pos="mixed"', "the mixed position lost its side");
  // MIXED IS A POSITION, NOT AN ABSENCE. It says so in words.
  has(lib, "Mixed — you hold both halves",
    "a mixed position reads as a shrug — mixed is a real position in this product");
  // NO GHOSTS. A chip in the held row means a side held; a dashed placeholder
  // in that row is the defect this pass removed from /me.
  // `class="mst-chips mst-chips--held"` also begins with `mst-chip`, so the
  // delimiter is part of the match: a starter chip is `mst-chip"` or
  // `mst-chip is-on"`, never the row that contains them.
  const startChips = (lib.match(/class="mst-chip[" ]/g) || []).length;
  eq(startChips, 0, "the library paints starter chips beside held ones with no gesture asking for them");
  lacks(lib, "mst-chips--start", "the starter row is open under the library before anyone asked");
  // Search is ALWAYS visible in mode B, with the same lingo placeholder.
  has(lib, 'id="mst-q"', "the library has no search field");
  has(lib, "turf", "the library's search lost the placeholder that teaches the lingo");
  // The starter row folds out on the gesture, and only then.
  has(lib, "Add an issue", "the library offers no way to add an issue");
  T.add();
  const open = w.__paint();
  has(open, "mst-chips--start", '"Add an issue" did not unfold the starter row');
  has(open, "Hide the starter list", "the unfolded starter row cannot be folded back");
  eq(T.mode(), "B", "unfolding the starter row dropped the reader back into the tutorial");
  // A HELD STARTER IS MARKED AS HELD, not offered as if it were new.
  has(open, "is-on", "a starter chip for an issue already on file is not marked as held");
  // No score anywhere in the library, either.
  ["%", "Direction Match", "Word vs Action", "Republican", "Democrat"].forEach((n) =>
    lacks(open, n, `the library prints "${n}"`));
}
// A library chip and a starter chip land on the SAME question, because there is
// one way to take a position in this module.
{
  const w = boot({ held: { housing: "support" } });
  const T = w.PDXStanceStudio;
  T.pick("housing");
  eq(T.beat(), "ask", "tapping a held chip did not open the ask beat");
  const ask = w.__paint();
  has(ask, "On file now", "re-opening a held issue does not say what is already on file");
  has(ask, "Clear this position", "a held issue offers no way to clear it");
  const fresh = boot({});
  fresh.PDXStanceStudio.pick("housing");
  lacks(fresh.__paint(), "Clear this position",
    "an issue with nothing on file offers to clear a position that does not exist");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the deep links: ?issue= and ?add=1, read once then cleared");
// ═════════════════════════════════════════════════════════════════════════════
{
  const w = boot({ search: "?issue=housing" });
  must(!w.__err, `?issue= threw: ${w.__err ? w.__err.stack : ""}`);
  eq(w.PDXStanceStudio.beat(), "ask", "?issue=<key> did not open the ask beat on that issue");
  has(w.__paint(), w.PDXIssueScope.read("housing").inn.slice(0, 30),
    "?issue=housing opened on something other than housing's locked sentence");
  // READ ONCE, THEN GONE FROM THE ADDRESS. A reader who answers the issue a
  // link named and then reloads must not be handed the same question again.
  ok(typeof w.__url === "string" && w.__url.indexOf("issue=") < 0,
    "?issue= was left in the address bar — a reload re-asks an answered question");
}
{
  const w = boot({ search: "?issue=not_a_real_key" });
  eq(w.PDXStanceStudio.beat(), "pick", "an unknown ?issue= key opened a beat on a question with no definition");
}
{
  // ?add=1 in mode B unfolds the starter row. In mode A the pick beat IS the
  // starter row, so the flag has nothing to do and must not break it.
  const w = boot({ held: { housing: "support" }, search: "?add=1" });
  eq(w.PDXStanceStudio.beat(), "library", "?add=1 left the library");
  has(w.__paint(), "mst-chips--start", "?add=1 did not unfold the starter row for a returning reader");
  const a = boot({ search: "?add=1" });
  eq(a.PDXStanceStudio.beat(), "pick", "?add=1 broke the tutorial's first beat");
}
// ?issue= also survives arriving with other query parameters.
{
  const w = boot({ search: "?issue=water&ref=dossier" });
  eq(w.PDXStanceStudio.beat(), "ask", "?issue= stopped working beside another parameter");
  ok(typeof w.__url === "string" && w.__url.indexOf("ref=dossier") >= 0,
    "clearing ?issue= threw away an unrelated query parameter");
}
// THE SEAT LINE NAMES A FACT, NOT A LABEL. Where /ballot has resolved a seat the
// done beat says so and links there; where it has not, there is no card at all
// and the save is never blocked on one.
{
  const noSeat = boot({});
  noSeat.PDXStanceStudio.pick("housing");
  noSeat.PDXStanceStudio.answer("housing", "support");
  const d1 = noSeat.__paint();
  has(d1, "Saved to your file", "a reader with no resolved seat could not save");
  lacks(d1, "seat open on your ballot", "a seat line appeared with no seat resolved");
  const withSeat = boot({ seat: "us_house_ut_01" });
  withSeat.PDXStanceStudio.pick("housing");
  withSeat.PDXStanceStudio.answer("housing", "support");
  const d2 = withSeat.__paint();
  has(d2, "seat open on your ballot", "a resolved seat produced no line at all");
  has(d2, 'href="/ballot"', "the seat line does not link to the desk that owns the comparison");
  // AND STILL NO VERDICT BETWEEN THEM. The record is /ballot's to read.
  ["%", "Direction Match", "agrees with you", "match"].forEach((n) =>
    lacks(d2, n, `the seat line prints "${n}" — this page never puts a verdict between the two`));
}
// THE STUDIO OWNS NO STORAGE KEY. Its state is memory plus the URL, which is
// why "no third storage key" is structurally true rather than merely observed.
lacks(STUDIO_CODE, "localStorage.setItem", "the studio writes directly to localStorage");
lacks(STUDIO_CODE, "sessionStorage.setItem", "the studio writes its own session state");
{
  const own = (STUDIO_CODE.match(/'pdx_[a-z0-9_]+'/g) || [])
    .filter((k) => k !== "'pdx_bw_seat'");
  eq(own.length, 0, `the studio names ${own.length} storage key(s) of its own: ${JSON.stringify(own)}`);
  has(STUDIO_CODE, "pdx_bw_seat", "the studio no longer reads the desk's open seat");
  ok(STUDIO_CODE.indexOf("SEAK_KEY") < 0 && /getItem\(SEAT_KEY\)/.test(STUDIO_CODE),
    "the desk's seat key is not read-only any more");
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · no homepage editor, and no second surface for the same job");
// ═════════════════════════════════════════════════════════════════════════════
// FAILURE MODE 8. The homepage carried the editor for years; the tell is the
// section id and the template that held it.
const INDEX_BARE = htmlBare(INDEX_HTML);
lacks(INDEX_BARE, '<section id="my-stances"', "the homepage still declares the stance section");
lacks(INDEX_BARE, 'id="ms-shell-tpl"', "the homepage still carries the editor template");
lacks(INDEX_BARE, 'id="ms-body"', "the homepage still carries the collection's mount");
lacks(INDEX_BARE, 'id="ms-door-more"', "the homepage still carries the collection's door");
// AND THE DELETION LEFT A NOTE. A reader who greps for the section a decade of
// links pointed at should find out where it went, not find nothing.
has(INDEX_HTML, "MY STANCES", "the homepage does not record where the stance section went");
// AND THE OLD BOOKMARK STILL WORKS, as a forward rather than a scroll.
has(INDEX_HTML, "'my-stances': '/my-stances'", "the homepage does not forward the old fragment");
has(INDEX_HTML, "'my-views': '/my-stances'", "the homepage does not forward the showcase fragment");
// /me READS POSITIONS AND DOES NOT SET THEM. No second editor, no ghost chips.
lacks(DESK_CODE, "me-pchip--start", "/me still paints the dashed ghost chips");
lacks(DESK_CODE, "function startChip", "/me still builds a chip that carries no side");
lacks(DESK_CODE, "me-yf-host", "/me still mounts a second positions editor under the snapshot");
lacks(DESK_CODE, "function mountPositions", "/me still has a mount path for a second editor");
has(DESK_CODE, 'href="/my-stances"', "/me's positions door does not point at the studio");
has(DESK_CODE, "Set all issues", "/me's positions door lost its label");
{
  const doors = (DESK_CODE.match(/data-me-setall/g) || []).length;
  eq(doors, 1, `/me carries ${doors} doors to the same editor`);
}
// THE HASH FALLBACKS ARE GONE from every module that had one.
["alignment-tool.js", "ballot-workspace.js", "race-sheet.js", "issue-compare.js",
 "stance-library.js", "my-profile.js", "compare-hub.js"].forEach((f) => {
  const code = jsBare(R(f));
  ok(!/location\.hash\s*=\s*['"]#my-stances['"]/.test(code),
    `${f} still sets the hash instead of navigating to /my-stances`);
});

// ═════════════════════════════════════════════════════════════════════════════
section("9 · who points here — and the twin boot that must not have moved");
// ═════════════════════════════════════════════════════════════════════════════
// /ballot: ONE LINE AND ONE LINK. No second wizard, and the link is an address.
has(BW_CODE, "/my-stances?add=1", "/ballot's unranked line does not link to the studio");
has(BW_CODE, "Rank this field with your positions", "/ballot's unranked line does not use the brief's copy");
lacks(BW_CODE, "Set your positions to rank this seat", "/ballot still carries the old copy");
const BALLOT_BARE = htmlBare(BALLOT_HTML);
lacks(BALLOT_BARE, "door2-first-run.js", "/ballot still loads the coach this pass deleted");
lacks(BALLOT_BARE, "door2-first-run.css", "/ballot still loads the deleted coach's stylesheet");
has(BALLOT_HTML, "/my-stances", "/ballot does not name the document positions are set on");
// /ballot READS POSITIONS AND DOES NOT TEACH THEM. The brief is explicit that
// it must not remount a second wizard, so the desk carries one line and one
// link — and the deleted coach's own <script> tag is gone rather than commented
// out, which is why the probe above runs on the stripped body.
must(BALLOT_BARE.indexOf("<script") >= 0,
  "ballot.html has no scripts outside its comments — the two probes above would pass on any file");
// The 12-chip tutorial must not be remounted on the desk under any name.
lacks(BW_CODE, "STARTERS", "/ballot's desk grew a starter chip list of its own");
// The race sheet's two doors.
has(RS_CODE, "/my-stances?add=1", "the race sheet does not link to the studio");
has(RS_CODE, "Set stances to rank this race", "the race sheet's seat strip lost its line");
lacks(RS_CODE, "_krAlignGuideToPicker", 'the race sheet still guesses at whichever picker is on the page');
// The dossier's per-issue door, which is the one that needs the deep link.
has(jsBare(DOSSIER_JS), "/my-stances?issue=", "the dossier does not link to the reader's own side on the issue");
has(DOSSIER_JS, "set your side on this issue", "the dossier's door lost its copy");
// DM TWIN-BOOT UNCHANGED. Direction Match is consistency.js's number, it is not
// on this document, and this pass must not have moved either half of it.
{
  // THE TWIN BOOT IS test-vr-pack-live-twin-boot.mjs: two engines booted from
  // the same shipped files over the same corpus, one with a maximally stale
  // pack pushed at it, every Direction Match read compared member for member.
  // It is the suite the brief means by "DM twin-boot unchanged", and nothing in
  // this pass is allowed to move it — which is why the studio below is checked
  // for reading the record engine at all.
  ok(existsSync(join(ROOT, "scripts", "test-vr-pack-live-twin-boot.mjs")),
    "the Direction Match twin-boot suite is gone — the number this page refuses to print is now unasserted");
  lacks(STUDIO_CODE, "PDXConsistency", "the studio reads the record engine");
  lacks(STUDIO_CODE, "directionMatch", "the studio computes a Direction Match");
  lacks(STUDIO_CODE, "Direction Match", "the studio names Direction Match on the one page forbidden to");
  lacks(STUDIO_CSS, "Direction Match", "the studio's stylesheet dresses a Direction Match");
  // The two surfaces that DO carry it still do, and off the same owner.
  has(BW_CODE, "Direction Match", "/ballot stopped naming Direction Match as the secondary read");
  has(RS_CODE, "Direction Match", "the race sheet stopped naming Direction Match");
}
// THE STYLESHEET IS SELF-SUFFICIENT AND HAS NO PER-ISSUE RULES. Colour arrives
// as inline custom properties off PDXIssueColors; a per-key rule here would
// drift from every bill letterhead the first time a hex changes.
{
  const keys = Object.keys(MAP);
  const hard = keys.filter((k) => STUDIO_CSS.indexOf("--pdx-ic-" + k) >= 0 || STUDIO_CSS.indexOf("." + k + "{") >= 0);
  eq(hard.length, 0, `stance-studio.css carries ${hard.length} per-issue rule(s) — the colour belongs to PDXIssueColors`);
  has(STUDIO_CSS, "--pdx-ic", "the studio's stylesheet does not read the issue colour custom property");
  has(STUDIO_CODE, "PDXIssueColors", "the studio paints its own palette");
}
// 44px TAP TARGETS on the controls a thumb has to hit.
["mst-chip", "mst-ans", "mst-held"].forEach((c) => {
  const i = STUDIO_CSS.indexOf("." + c);
  ok(i > 0, `stance-studio.css has no rule for .${c}`);
});
ok((STUDIO_CSS.match(/min-height:\s*(44px|2\.75rem)/g) || []).length >= 3,
  "fewer than three of the studio's controls declare a 44px minimum — these are all thumb targets");

// ═════════════════════════════════════════════════════════════════════════════
section("10 · TWO STORES, ONE READER: the account desk is not an empty file");
// ═════════════════════════════════════════════════════════════════════════════
// THE REPORT THIS SECTION IS FOR, in the words it arrived in. /me listed three
// sides — Water Conservation, Housing Affordability, Protect Public Lands. The
// studio said "1 position on file" after a save. The SD-3 board said "You have
// no positions on file." Same morning, same account.
//
// NOTHING WAS WRONG WITH THE READER. stance-sides.js was already the only
// answer to "which sides does this visitor hold", and it was already correct:
// it walks TWO stores through their owners' published reads —
//
//   pdx_my_stances_v1              my-stances.js   PDXStances.all()
//   pdx_your_file_v1__u_<uid>      your-file.js    PDXYourFile.answered()
//                                                  PDXYourFile.position(k)
//
// — and ONLY /me shipped both owners (me.html's two tags, my-stances.js then
// your-file.js). /my-stances shipped the first. So on this document the reader
// read an empty device key, reported zero, and the studio did what it is
// supposed to do with a zero: opened the first-run coach and, after one save,
// counted the one thing this device's store had.
//
// THE FIX IS A TAG AND A READ, NOT A STORE. No key was added, no
// pdx_my_stances_v2 exists, nothing was migrated and nothing copies one store's
// records into the other's. The two owners are read through their own published
// functions, which is what stance-sides.js already was.
{
  // THE EXACT KEYS, PINNED AS TEXT. If either owner renames its key, the
  // fixtures below would silently seed a key nobody reads and go on passing.
  has(jsBare(R("my-stances.js")), "'pdx_my_stances_v1'", "my-stances.js no longer owns pdx_my_stances_v1 — the fixture key is stale");
  has(jsBare(YF_JS), "'pdx_your_file_v1'", "your-file.js no longer owns pdx_your_file_v1 — the fixture key is stale");
  has(jsBare(YF_JS), "KEY + '__u_'", "your-file.js no longer namespaces its key per account — the signed-in fixture is testing the wrong branch");
  // AND THE READER STILL READS BOTH, through the owners rather than the keys.
  const SIDES_CODE = jsBare(SIDES_JS);
  has(SIDES_CODE, "window.PDXStances", "the one reader stopped asking the device store's owner");
  has(SIDES_CODE, "window.PDXYourFile", "the one reader stopped asking the account store's owner");
  lacks(SIDES_CODE, "pdx_your_file_v1", "the one reader reaches for the account store's KEY instead of its owner");
  lacks(SIDES_CODE, "localStorage", "the one reader touches storage — it is a read of two owners and owns nothing");
}
// ── THE DOCUMENT SHIPS BOTH OWNERS, IN THE ORDER THAT MATTERS ───────────────
{
  const bare = htmlBare(DOC);
  has(bare, '"/my-stances.js"', "/my-stances stopped shipping the device store's owner");
  has(bare, '"/your-file.js"', "/my-stances does not ship the ACCOUNT store's owner — the reader can only see half the visitor's file, and half a file reads as an empty one");
  has(bare, '"/stance-sides.js"', "/my-stances stopped shipping the one reader");
  // THE ORDER IS LOAD-BEARING. The studio's mode is sticky and decided on its
  // FIRST paint from the reader's count, so a your-file.js tag after the studio
  // would leave the coach open over a full account desk — the same bug, one
  // line later.
  // THE SCRIPT TAGS, not the preload hint — /stance-studio.js is also a
  // <link rel=preload> higher in the head, and comparing against that index
  // would make the order assertion pass on any arrangement of the tags.
  const yf = bare.indexOf('<script defer src="/your-file.js">');
  const st = bare.indexOf('<script defer src="/stance-studio.js">');
  const sd = bare.indexOf('<script defer src="/stance-sides.js">');
  ok(yf > 0 && st > 0 && sd > 0, "one of the three stance tags is missing from /my-stances");
  ok(yf < st, "your-file.js is loaded AFTER stance-studio.js — the studio's first paint decides the mode, so the coach would still open over a full desk");
  ok(sd < st, "stance-sides.js is loaded after the studio that asks it");
  // AND /me, THE DOCUMENT THAT WAS ALREADY RIGHT, STILL CARRIES BOTH.
  const meDoc = htmlBare(R("me.html"));
  has(meDoc, '"/my-stances.js"', "/me stopped shipping the device store's owner");
  has(meDoc, '"/your-file.js"', "/me stopped shipping the account store's owner — this is the document whose three sides proved the other two wrong");
}
// ── FIXTURE: NOTHING ANYWHERE. The coach opens, and that is correct. ─────────
{
  const w = boot({});
  const T = w.PDXStanceStudio;
  eq(T.count(), 0, "the reader found a side in an empty fixture");
  eq(T.mode(), "A", "a visitor with nothing on file did not get the first-run tutorial");
  const html = w.__paint();
  has(html, "What do you care about first?", "the empty first run stopped opening on the coach");
  has(html, 'data-beat="pick"', "the empty first run did not paint the starter beat");
}
// ── FIXTURE: THREE SIDES ON THE ACCOUNT DESK, DEVICE KEY EMPTY ──────────────
// THE REPORTED CASE, and the one branch /me takes: a signed-in uid, the answers
// under your-file.js's per-account namespace, and pdx_my_stances_v1 absent.
{
  const DESK = { water: "support", housing: "support", lands_preserve: "support" };
  const w = boot({ desk: DESK, uid: "uid-abc" });
  const T = w.PDXStanceStudio;
  const S = w.PDXStanceSides;
  must(S, "stance-sides.js did not publish its reader in the sandbox");
  // THE READER, FIRST. If this is not 3 nothing below means anything.
  eq(S.count(), 3, "the one reader returned the DEVICE key's count over a logged-in desk holding three — this is the defect, restated");
  eq(T.count(), 3, "the studio's count is not the reader's count");
  // …AND IT IS READING THE NAMESPACED KEY, not the base one. Pins the branch.
  ok(Object.keys(w.__store).some((k) => k === "pdx_your_file_v1__u_uid-abc"),
    "the fixture did not seed the per-account key your-file.js actually reads");
  ok(!Object.prototype.hasOwnProperty.call(w.__store, STORE_KEY),
    "the fixture wrote the device key too — this fixture must prove the desk alone answers");
  // NOT THE COACH. This is the line the brief draws: "never the 'What do you
  // care about first?' empty coach as if they were new".
  eq(T.mode(), "B", "a visitor with three positions on the account desk was put in the first-run tutorial");
  const html = w.__paint();
  has(html, 'data-beat="library"', "three sides on the desk did not paint the library");
  has(html, "3 positions on file", "the library header does not count the visitor's actual file");
  lacks(html, "What do you care about first?", "the coach opened over three saved positions");
  lacks(html, "Nothing on file yet", "the studio told a visitor holding three sides that their file is empty");
  // THE SIDES THEMSELVES, by label, so "3" is not a number that happens to match.
  ["Water Conservation", "Housing Affordability", "Protect Public Lands"].forEach((lbl) => {
    has(html, lbl, `the library does not print ${lbl} — the three sides /me listed`);
  });
}
// ── AFTER A SAVE, THE CONFIRMATION COUNTS THE FILE — NOT THIS SESSION ───────
// "the confirmation count is reader.count(), not 1 and not what this session
// appended." Three on the desk, one saved here, and the done beat says four.
{
  const w = boot({ desk: { water: "support", housing: "support", lands_preserve: "support" }, uid: "uid-abc" });
  const T = w.PDXStanceStudio;
  T.pick("healthcare");
  T.answer("healthcare", "oppose");
  eq(T.count(), 4, "the reader did not see the desk's three plus the one just saved");
  // The beat is the library here, because mode was B before the save — the
  // count sentence is the library heading, and it is still the reader's.
  const html = w.__paint();
  has(html, "4 positions on file", "the count after a save reports what this session appended instead of the whole file");
  lacks(html, "1 position on file", "the confirmation counted the one thing this session wrote");
}
// AND ON A GENUINE FIRST RUN THE DONE BEAT SAYS ONE, because one is true.
{
  const w = boot({});
  const T = w.PDXStanceStudio;
  T.pick("housing");
  T.answer("housing", "support");
  eq(T.beat(), "done", "a genuine first save did not land on the beat that explains it");
  const html = w.__paint();
  has(html, "1 position on file", "a genuine first save does not report one position");
}
// ── HALF A FILE IS NOT AN EMPTY FILE, AND THE READER SAYS SO ────────────────
// complete() is the wall that stops this omission from becoming a confident
// sentence on the NEXT surface: a document that ships one owner and not the
// other gets a reader that cannot tell "holds nothing" from "was not asked".
{
  const full = boot({});
  must(full.PDXStanceSides, "the reader did not publish in the sandbox");
  eq(full.PDXStanceSides.complete(), true, "a document carrying BOTH store owners reports an incomplete reader");
  const src = full.PDXStanceSides.sources();
  eq(src.stances, true, "the reader does not see the device store's owner on a document that ships it");
  eq(src.yourFile, true, "the reader does not see the account store's owner on a document that ships it");

  // The document as it WAS: my-stances.js, no your-file.js.
  const half = boot({ noDesk: true });
  eq(half.PDXStanceSides.complete(), false, "a document missing the account store's owner reports a complete reader — the false zero is back");
  eq(half.PDXStanceSides.count(), 0, "the half-read fixture is not empty, so it proves nothing");
  // AND THE STUDIO DOES NOT CLAIM THE FILE IS EMPTY on that count.
  const T = half.PDXStanceStudio;
  T.skip();
  const html = half.__paint();
  has(html, 'data-beat="library"', "skip did not reach the library");
  lacks(html, "Nothing on file yet", "the studio asserted an empty file from a reader that could only see half of one");
  has(html, "Search for an issue in your own words", "the half-read library dropped the search — the reader still needs a way in");
  // With BOTH owners and a genuinely empty file, the claim is allowed and made.
  const T2 = full.PDXStanceStudio;
  T2.skip();
  has(full.__paint(), "Nothing on file yet", "a checkable empty file no longer says so — silence is only for the unreadable case");
}
// ── /my-stances' OWN DOOR COUNT ASKS THE SAME READER ───────────────────────
// The door summary sits centimetres below the studio and printed the SAME
// sentence from my-stances.js's own collection length. Three on the desk and
// one here would have read "3 positions on file" and "1 position on file" on
// one page.
{
  const MSC = jsBare(R("my-stances.js"));
  const i = MSC.indexOf("function paintDoorCount");
  must(i > 0, "my-stances.js no longer has paintDoorCount — the door count assertion is vacuous");
  const body = MSC.slice(i, MSC.indexOf("\n  }", i) + 4);
  has(body, "PDXStanceSides", "the door count does not ask the shared reader");
  has(body, "countLine", "the door count spells the sentence itself instead of asking the reader that owns it");
  // The fallback is this file's own count, which is a true statement about this
  // collection — and it is only ever PRINTED, never used to claim a zero, since
  // the zero case hides the line entirely.
  has(body, "line.hidden = true", "the door count stopped hiding at zero — \"0 positions on file\" is a nag");
}
// ── NO NEW STORE, NO COPY, NO MIGRATION ─────────────────────────────────────
{
  const touched = ["my-stances.js", "stance-studio.js", "stance-sides.js", "district-board.js"];
  for (const f of touched) {
    const code = jsBare(R(f));
    lacks(code, "pdx_my_stances_v2", `${f} created a second stance key`);
    lacks(code, "pdx_your_file_v2", `${f} created a second account-desk key`);
  }
  // The studio still writes through ONE owner, and it is the one it always was.
  const SC = jsBare(STUDIO_JS);
  const wi = SC.indexOf("function write(");
  must(wi > 0, "stance-studio.js no longer has write() — the one-write-path assertion is vacuous");
  const wbody = SC.slice(wi, SC.indexOf("\n  }", wi) + 4);
  has(wbody, "PDXStances", "the studio's write path no longer goes through the store's owner");
  lacks(wbody, "PDXYourFile", "the studio writes into the account desk too — two write paths for one fact");
  lacks(wbody, "localStorage", "the studio writes storage directly instead of through the owner");
}

// ─────────────────────────────────────────────────────────────────────────────
console.log("");
if (failures.length) {
  console.error(`✗ my-stances: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error("   · " + f);
  process.exit(1);
}
console.log(`✓ my-stances: all ${passed} assertions passed — one document, two modes, one store, no verdict\n`);
