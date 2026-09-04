#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-issue-file-address.mjs — /i/<key> is the issue file, and it is one paint
// ─────────────────────────────────────────────────────────────────────────────
// The person file has had an address since Phase 1: /p/<pid>, a 200 rewrite of
// the single document, read out of location.pathname. The issue file had the
// opposite problem — the READING existed and the ADDRESS did not. Door 1's issue
// mode has painted a child ledger for a while (crumb, themed chips, census,
// bands, measures, the honesty lines) and seek, OPEN and a chip tap all mount
// it. But there was no /i/lands_preserve, so the Eye's own issue hit, a topic
// tree leaf and a share sheet could cite a person, a bill or a roll call and
// never cite THE ISSUE.
//
// The temptation in closing that gap is to build a second ledger behind the new
// URL — an issue "page" with its own census, its own bands, its own wording —
// and then to spend forever keeping two readings of the same record in
// agreement. This file exists to make that impossible to do quietly. What it
// pins:
//
//   1. ONE ADDRESS, SPELLED IN ONE PLACE. PDXIssueFamily.profileUrl is the owner
//      and it answers /i/<key>; the address module's fallback literal is the
//      same literal; no consumer spells the path itself.
//   2. ONE FUNCTION, TWO DOORS. PDXIssueProfile.html(key) is not a copy of the
//      desk's ledger, it IS PDXDoor1.issueProfile — and the desk's own painted
//      issue mode contains that function's output verbatim, so a fork would have
//      to fail here before it could ship.
//   3. THE ADDRESS PAINTS WHAT THE TAP PAINTS. Arriving at /i/lands_preserve and
//      tapping the lands_preserve chip on the desk produce the same census, the
//      same row count and the same four measures — asserted as byte equality of
//      the painted desk, which is the strongest form of "same numbers".
//   4. AN EMPTY KEY IS STILL A REAL KEY. /i/lands_keep_public says 0 people on
//      its own label and keeps the calendar sentence. It does not paint a cousin
//      and it does not go blank.
//   5. A MISS IS SAID OUT LOUD. /i/not_a_key resolves to nothing, opens no
//      cousin's ledger, and says so in the register's own words.
//   6. EXACT KEY IN, EXACT KEY OUT. An alias arrival re-stamps the bar with the
//      key and repoints rel=canonical at that one address.
//   7. NO HTML SERVED AS JAVASCRIPT. Every asset the document asks for is
//      root-absolute, so a visit to /i/lands_preserve cannot request
//      /i/door1-workspace.js and be handed the 200-rewritten index.
//   8. THE FILES TRAVEL TOGETHER, behind a CACHE_VERSION that moved with them,
//      and the rewrite that makes the address resolvable at all is in
//      netlify.toml.
//   9. NOTHING WAS CHARACTERISED HERE. The address module contains no count, no
//      order, no percentage and no party token: it reads a key and delegates.
//  10. THE LETTERHEAD IS THE SAME CENSUS, NOT A SECOND ONE. The inventory line
//      above the record is PDXDoor1.issueCensus — the desk publishing integers it
//      already computed — so every figure at the top of /i/<key> is the figure
//      the prose two inches below it prints. And it publishes NOTHING while the
//      ledger under it is still saying it is reading, which is asserted the only
//      way that claim can be asserted: on both blocks of one painted panel.
//  11. THE CRUMB GOES TO THE SHELF, NOT TO A FILE THAT DOES NOT EXIST. A core is
//      a family; /i/<core> refuses. The crumb opens the desk on that core through
//      the desk's own issue door and never links to the address.
//  12. A SLICE OF THE LIST IS A VIEW, NOT A SECOND READING. A settled key files
//      hundreds of people across five bands; the filter row above them narrows
//      the list by direction, vehicle, chamber and name — every axis a field
//      somebody else already published — by HIDING rows the builder printed. The
//      builder's string does not change when a chip is pressed, which is the
//      only way claim 2 survives a filter at all. No party chip, no sort.
//  13. HOW THE ISSUE MOVED, IN COUNTS. PRIMARY vs provision vs procedural,
//      primary-only vs package-only vs mixed, the acts by class, the locked menu
//      sentence where it applies — all of it one more field on the census the
//      desk already computed, behind the same busy gate as the inventory, and a
//      sponsorship is never called a vote.
//  14. A PARTIAL CENSUS DOES NOT WEAR A FINISHED HEADING. While any row is cold
//      or any batch is in flight, the people lede names the settled count and
//      says in the same sentence that it is not the count for the key, the split
//      is marked as being of the arrived rows, the bands nobody has come back for
//      are NAMED as still closed rather than dropped as zeroes, and the chip row
//      says its counts are of the rows on screen — so a missing chip is not read
//      as a finding that nobody advanced it. The gate is the read, not a rule
//      that five bands must always show: once cold and pending are 0 the settled
//      wording returns unhedged, including on a key that holds one band or none.
//
//   node scripts/test-issue-file-address.mjs
//
// Real shipped modules in a node:vm sandbox, the real roster, the real register
// and the real record corpus. Every claim about painted markup is about markup
// this harness painted.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

// Load order, as index.html defers them.
const FILES = [
  "cmp-data.js",
  "politician-stances-core.js",
  "politician-stances-ext.js",
  "state-senate-stances.js",
  "stance-helpers.js",
  "alignment-tool.js",
  "pdx-issue-family.js",
  "acct-spotlight-data.js",
  "say-vs-do.js",
  "exec-action-data.js",
  "exec-record.js",
  "exec-record-ui.js",
  "consistency.js",
  "voting-record.js",
  "inventory.js",
  "issue-scope.js",
  "word-action.js",
  "profile-spine.js",
  "issue-colors.js",
  "my-stances.js",
  "person-link.js",
  "bills-index.js",
  "bills.js",
  "bill-detail.js",
  "claim-check.js",
  "issue-view.js",
];
const SRC = FILES.map((f) => [f, R(f)]);
const DESK = R("door1-workspace.js");
const PANEL = R("issue-file.js");
const ADDR = R("pdx-issue-profile.js");
const FAMILY = R("pdx-issue-family.js");
const TREE = R("stance-tree.js");
const TREECSS = R("stance-tree.css");
const EYE = R("all-seeing-eye.js");
const HTML = R("index.html");
const SW = R("sw.js");
const TOML = R("netlify.toml");

const KEY = "lands_preserve";
const EMPTY = "lands_keep_public";
const MISS = "not_a_key";
const ORIGIN = "https://www.politidex.fyi";

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) >= 0, `${msg} — "${needle}" missing`);
const no = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) < 0, `${msg} — "${needle}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// A probe that finds nothing fails loudly rather than turning this file into a
// very fast, very green no-op.
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ issue file address: STALE PROBE — ${msg}`);
  process.exit(2);
};

const corpus = buildCorpus(ROOT);
must(corpus && corpus.byMember && corpus.byMember.size > 100,
  "the record corpus did not load enough members to sweep");

// ── A mini-DOM, plus the three things an ADDRESS needs that a ledger does not ─
// location.pathname, history.replaceState and the document's one canonical link.
// All three are recorded rather than stubbed silently, because "did the bar get
// the exact key" and "did the canonical follow it" are two of the claims below.
function miniDom(win) {
  const byId = {};
  const mk = (id) => {
    const node = {
      id: id || "", className: "", innerHTML: "", textContent: "", value: "",
      style: {}, dataset: {}, children: [], hidden: false, attrs: {},
      firstChild: null,
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
      setAttribute(k, v) { this.attrs[k] = String(v); },
      getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
      removeAttribute(k) { delete this.attrs[k]; },
      addEventListener() {}, removeEventListener() {},
      appendChild(c) { this.children.push(c); c.parentNode = this; if (c && c.id) byId[c.id] = c; return c; },
      insertBefore(c) { this.children.unshift(c); c.parentNode = this; if (c && c.id) byId[c.id] = c; return c; },
      removeChild() {}, insertAdjacentHTML() {}, remove() {}, focus() {}, click() {},
      scrollIntoView() {}, querySelector() { return null; }, querySelectorAll() { return []; },
    };
    if (id) byId[id] = node;
    return node;
  };
  win.document.createElement = () => mk("");
  win.document.getElementById = (id) => byId[id] || null;
  win.document.body = mk("body");
  const bodyAppend = win.document.body.appendChild.bind(win.document.body);
  win.document.body.appendChild = function (c) { if (c && c.id) byId[c.id] = c; return bodyAppend(c); };
  const canonical = mk("");
  canonical.attrs.href = ORIGIN + "/";
  win.__canonical = canonical;
  win.document.querySelector = (sel) =>
    (String(sel).indexOf("canonical") >= 0 ? canonical : null);
  ["pdx-eye-input", "pdx-eye-panel", "pdx-eye", "pdx-eye-clear",
   "pdx-door1-workspace", "pdx-d1-body"].forEach(mk);
  win.__mk = mk;
  return byId;
}

// The two shipped reads that go through /api/voting-record, stubbed from the one
// corpus so both doors below discover the same field.
function stubReads(win) {
  win.PDXVotingRecord.fetchIssueRecords = function (keys) {
    const ks = (keys || []).slice();
    const byPid = {};
    for (const [pid] of corpus.byMember) {
      let items = [];
      for (const k of ks) {
        let part = [];
        try { part = win._pdxRecordIssueItems(pid, k) || []; } catch { part = []; }
        items = items.concat(part);
      }
      if (items.length) byPid[pid] = items;
    }
    return Promise.resolve({ byPid, truncated: false });
  };
  win.PDXVotingRecord.fetchCompare = function () { return Promise.resolve({ byPid: {} }); };
}

// ── THE ROSTER'S OWN CHAMBER CLASSIFIER, STUBBED IN ─────────────────────────
// compare-hub.js publishes window._pdxBrowseType — the one function that turns a
// pid into a chamber bucket — and it is NOT in this harness's load order: that
// module wants the compare workspace's own globals, and adding it here aborts
// its IIFE partway through, which would take the export down with it and leave
// every row answering "no chamber" instead of failing loudly. The chamber chips
// on the slice read that export, so this boot stubs it exactly the way
// scripts/test-archive-browse.mjs stubs it for the same reason, and the source
// audit in section 13 asserts that compare-hub.js still publishes it and that
// the desk still ASKS for it rather than keeping a second office classifier.
// On the real page the order is not in doubt: index.html loads compare-hub.js as
// a plain sync script, before the deferred desk.
function browseTypeStub(win) {
  win._pdxBrowseType = function (pid) {
    const d = (win.CMP_DATA || {})[pid];
    const o = String((d && d.office) || "").toLowerCase();
    if (!o) return "other";
    if (o.indexOf("u.s. senat") >= 0) return "senator";
    if (o.indexOf("u.s. rep") >= 0 || o.indexOf("u.s. house") >= 0 ||
        o.indexOf("congress") >= 0) return "representative";
    if (o.indexOf("state sen") >= 0 || o.indexOf("senate president") >= 0) return "state_senator";
    if (o.indexOf("state rep") >= 0 || o.indexOf("state house") >= 0 ||
        o.indexOf("house speaker") >= 0) return "state_rep";
    return "other";
  };
}

function boot(opts) {
  opts = opts || {};
  const win = makeSandbox();
  const sess = {};
  win.sessionStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(sess, k) ? sess[k] : null),
    setItem: (k, v) => { sess[k] = String(v); },
    removeItem: (k) => { delete sess[k]; },
  };
  win.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  win.auth = { currentUser: null };
  // The arrival, as the browser presents it after the 200 rewrite: the bar says
  // /i/<something> and the document is index.html.
  const p = opts.path || "/";
  win.location = { href: ORIGIN + p, pathname: p, search: "", hash: "", origin: ORIGIN };
  win.__replaced = [];
  win.history = {
    replaceState(a, b, u) { win.__replaced.push(String(u)); win.location.pathname = String(u); },
    pushState() {},
  };
  // The honest-notice primitive, recorded. share-links.js is not in the load
  // order here; what matters is WHETHER the miss path asks for a notice and what
  // it says, not how the notice is painted.
  win.__notices = [];
  win.PDXShareLinks = {
    notice(id, kicker, message) { win.__notices.push({ id, kicker, message }); return true; },
  };
  win.__listeners = {};
  win.addEventListener = (t, f) => { (win.__listeners[t] = win.__listeners[t] || []).push(f); };
  const byId = miniDom(win);
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  win.__loadErrors = [];
  for (const [f, src] of SRC) {
    try { vm.runInContext(src, ctx, { filename: f }); }
    catch (e) { win.__loadErrors.push(`${f}: ${e.message}`); }
  }
  win.PROFILES = win.CMP_DATA;
  for (const [pid, recs] of corpus.byMember) {
    try { win.PDXVotingRecord.noteMember(pid, recs); } catch { /* not a member surface */ }
  }
  stubReads(win);
  win.__routed = [];
  win.pdxDoorWork = (id) => { win.__routed.push("work:" + id); return true; };
  win.pdxDoor = (mode) => { win.__routed.push("door:" + mode); return true; };
  if (!opts.withoutBrowseType) browseTypeStub(win);
  // opts.desk is the desk-side load-bearing hook, the twin of opts.panel below:
  // the same boot, with one line of the shipped builder taken out.
  vm.runInContext(opts.desk || DESK, ctx, { filename: "door1-workspace.js" });
  if (opts.withEye) {
    win._issueLabel = (k) => (win.ISSUE_MAP[k] && win.ISSUE_MAP[k].label) || "";
    vm.runInContext(EYE, ctx, { filename: "all-seeing-eye.js" });
  }
  // The panel and the address travel together (sw.js precaches them as one pair
  // and the note there says why), so the switch that drops one drops both — which
  // is what makes the twin boot in section 9 a claim about this whole pass.
  if (!opts.withoutAddress) {
    // opts.panel is the load-bearing probes' hook: the same boot, with one line
    // of the shipped panel taken out.
    vm.runInContext(opts.panel || PANEL, ctx, { filename: "issue-file.js" });
    vm.runInContext(ADDR, ctx, { filename: "pdx-issue-profile.js" });
  }
  win.__ctx = ctx;
  win.__byId = byId;
  return win;
}

const paint = (w) => {
  w.PDXDoor1.sync();
  const h = w.document.getElementById("pdx-d1-body");
  return h ? String(h.innerHTML) : "";
};
const tick = () => new Promise((r) => setTimeout(r, 0));

// The field an issue discovers is warmed asynchronously; opening and letting the
// microtask queue drain is exactly the sequence a reader causes.
async function tapKey(w, key) {
  w.pdxDoor1Open("issue");
  w.pdxDoor1Issue(key);
  await tick(); await tick();
  w.pdxDoor1Issue(key);
  return paint(w);
}
// The same sequence, caused by an address instead of a thumb.
async function arriveAt(w) {
  const first = w.PDXIssueProfile.adopt();
  await tick(); await tick();
  if (first) w.PDXIssueProfile.adopt();
  return { key: first, html: paint(w) };
}

const probe = boot({ withEye: true, path: `/i/${KEY}` });
must(probe.PDXDoor1 && typeof probe.PDXDoor1.sync === "function",
  `the desk did not export sync() — boot errors: ${probe.__loadErrors.join(" | ")}`);
must(probe.PDXIssueProfile && typeof probe.PDXIssueProfile.adopt === "function",
  "pdx-issue-profile.js did not publish PDXIssueProfile.adopt()");
must(typeof probe.PDXDoor1.issueProfile === "function",
  "PDXDoor1.issueProfile is not published — the extraction this pass is about is gone");
must(probe.PDXIssueFile && typeof probe.PDXIssueFile.open === "function",
  "issue-file.js did not publish PDXIssueFile.open() — the arrival has no stage");
must(probe.PDXIssueFamily && typeof probe.PDXIssueFamily.profileUrl === "function",
  "PDXIssueFamily.profileUrl is not published");
must(probe.ISSUE_MAP && probe.ISSUE_MAP[KEY], `${KEY} is no longer a shipped ISSUE_MAP key`);
must(probe.ISSUE_MAP[EMPTY], `${EMPTY} is no longer a shipped ISSUE_MAP key`);
must(!probe.PDXDoor1.issueKeyFor(MISS), `${MISS} now resolves — pick a phrase the register lacks`);
const MAP = probe.ISSUE_MAP;
const PARENT = (probe.CORE_NATIONAL_ISSUES || [])
  .filter((c) => c && (c.keys || []).indexOf(KEY) >= 0)[0] || null;
must(!!PARENT, `${KEY} has no parent bundle — see scripts/test-issue-family.mjs`);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · One address, spelled in one place");
{
  const F = probe.PDXIssueFamily;
  const P = probe.PDXIssueProfile;

  // The smoke's own assertion, and the reason the rest of this file can exist.
  eq(F.profileUrl(KEY), `/i/${KEY}`, "profileUrl does not answer the issue file's path");
  eq(F.profileUrl(""), "", "profileUrl invented an address for no key");
  eq(F.profileUrl(`  ${KEY}  `), `/i/${KEY}`, "profileUrl does not trim what it is handed");
  // Root-anchored and host-free: one public origin, named in one place.
  ok(F.profileUrl(KEY).charAt(0) === "/", "the issue file's path is not root-anchored");
  no(F.profileUrl(KEY), "http", "profileUrl writes a hostname into the path");

  // THE OWNER IS ASKED, NOT COPIED. The address module carries the same literal
  // as a fallback for a document served without the family table; asserted equal
  // here so the two cannot drift into two different addresses.
  eq(P.PREFIX, "/i/", "the address module's prefix is not /i/");
  eq(P.path(KEY), F.profileUrl(KEY), "the address module and the family table disagree on the path");
  eq(P.path(""), "", "the address module invented a path for no key");
  eq(P.url(KEY), `${ORIGIN}/i/${KEY}`, "url() is not origin + path");

  // …and nobody else spells it. A path literal in a consumer is a second owner.
  for (const [name, src] of [["door1-workspace.js", DESK], ["stance-tree.js", TREE],
                             ["all-seeing-eye.js", EYE]]) {
    const code = src.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, "");
    no(code, "'/i/'", `${name} spells the issue-file path itself instead of asking for it`);
    no(code, '"/i/"', `${name} spells the issue-file path itself instead of asking for it`);
  }

  // WHAT AN ADDRESS NAMES. One segment, trailing slash optional, and a label
  // spelling is allowed to arrive because the resolver's job is to judge it.
  eq(P.fromPath(`/i/${KEY}`), KEY, "the address module cannot read its own path");
  eq(P.fromPath(`/i/${KEY}/`), KEY, "a trailing slash is a different issue file");
  eq(P.fromPath("/i/Protect%20Public%20Lands"), "Protect Public Lands",
    "an encoded label arrival is not decoded");
  eq(P.fromPath(`/i/${KEY}/votes`), "", "a second path segment is claimed as an issue file");
  eq(P.fromPath("/p/lee"), "", "the person file's address is read as an issue file");
  eq(P.fromPath("/"), "", "the front page is read as an issue file");

  // ONE RESOLVER, AND IT IS THE DESK'S. Same answer as every other surface, for
  // a key, a spaced key and the label.
  for (const raw of [KEY, "lands preserve", "land preserve", MAP[KEY].label]) {
    eq(P.resolve(raw), probe.PDXDoor1.issueKeyFor(raw),
      `the address resolves "${raw}" differently from the desk`);
  }
  eq(P.resolve(MISS), "", `the address rounded ${MISS} to a key`);
  console.log(`      ${F.profileUrl(KEY)} · resolver shared · ${P.url(KEY)}`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · One function, two doors");

const TAP = await (async () => {
  const w = boot();
  const html = await tapKey(w, KEY);
  return { w, html };
})();

{
  const { w, html } = TAP;
  must(html.length > 500, "the desk painted nothing for a tapped key");

  // THE EXPORT IS THE FUNCTION, not a copy of it. Everything the address serves
  // for this key came out of door1-workspace.js.
  const viaDesk = w.PDXDoor1.issueProfile(KEY);
  must(viaDesk && viaDesk.length > 300, "PDXDoor1.issueProfile painted nothing for a live key");
  const viaAddr = w.PDXIssueProfile.html(KEY);
  eq(viaAddr, viaDesk, "PDXIssueProfile.html is not the desk's own builder");

  // NO VISUAL FORK. The desk's painted issue mode CONTAINS that output verbatim.
  // A second ledger behind the URL — different wording, different order, a
  // rounded count — could not satisfy this.
  has(html, viaDesk, "the desk's issue mode does not paint the issue file's own output");
  // WHAT THE DESK ADDS AROUND IT IS THE DESK'S OWN CHROME. Above the ledger:
  // the mode head, the bundle shelf and the key shelf. Below it: the "next in
  // Door 1" foot. None of that is a reading, and none of it says anything about
  // the record — which is why the issue file can be served without it.
  const at = html.indexOf(viaDesk);
  const tail = html.slice(at + viaDesk.length);
  has(tail, "d1-foot", "the desk's own foot is not what follows the issue file");
  for (const reading of ["d1-census", "d1-band", "d1-meas", "d1-scope"]) {
    no(tail, reading, `the desk paints a second ${reading} AFTER the issue file, so the two can drift`);
  }

  // The ledger inside it is this key's own record, by exact key.
  const led = w.PDXDoor1._ledger(null, KEY);
  must(led, `no ledger object for ${KEY}`);
  eq(led.key, KEY, "the ledger read a key other than the one asked for");
  has(viaDesk, `<b>${led.people}</b>`, "the census does not print the ledger's own row count");
  has(viaDesk, esc(MAP[KEY].label), "the issue file does not name the key it is about");

  // A BUNDLE IS NOT A KEY, and the builder says so by answering nothing rather
  // than merging a family's records into one reading.
  eq(w.PDXDoor1.issueProfile(PARENT.key), "",
    "issueProfile invented a single ledger for a whole bundle");
  eq(w.PDXIssueProfile.html(PARENT.key), "",
    "the address invented a single ledger for a whole bundle");
  eq(w.PDXIssueProfile.html(MISS), "", "issueProfile painted something for a key that does not exist");

  // mount() puts that string somewhere and decides nothing.
  const host = w.__mk("");
  eq(w.PDXIssueProfile.mount(host, KEY), true, "mount() refused a live key");
  eq(host.innerHTML, viaDesk, "mount() wrote something other than the builder's output");
  eq(w.PDXIssueProfile.mount(host, MISS), false, "mount() claimed to paint a key that does not exist");
  eq(host.innerHTML, viaDesk, "a failed mount overwrote what was already there");
  console.log(`      one builder · ${viaDesk.length}B of ledger, painted identically by both doors`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · The address paints what the tap paints");

const ARRIVED = await (async () => {
  const w = boot({ path: `/i/${KEY}` });
  const r = await arriveAt(w);
  return { w, ...r };
})();

{
  const { w, key, html } = ARRIVED;
  eq(key, KEY, "arriving at the issue file did not open that key");

  // THE SAME NUMBERS BY CONSTRUCTION. Byte equality of the painted desk is the
  // strongest available form of "Door 1 → Climate, Energy & Land → same key →
  // same numbers": row count, band split, measures, crumb, honesty lines.
  eq(html, TAP.html, "the address and the chip tap paint different desks for the same key");

  // …and the two things the smoke counts, named explicitly so a failure reads.
  const led = w.PDXDoor1._ledger(null, KEY);
  const tapLed = TAP.w.PDXDoor1._ledger(null, KEY);
  eq(led.people, tapLed.people, "the census row count differs between the two doors");
  must(led.people > 0, `${KEY} no longer has a readable formal row — pick another key`);
  eq((led.measures || []).length, (tapLed.measures || []).length,
    "the measures list differs between the two doors");
  eq((led.measures || []).length, 4,
    `${KEY} no longer maps to the four measures the smoke counts`);
  has(html, `<b>${led.people}</b>`, "the arrival's census does not print the row count");

  // THE PICK IS THE SAME PICK. It went through window.pdxDoor1Issue, so the desk
  // recorded the same commitment a chip tap records, and the reader was landed
  // on the desk rather than left at the top of the front page.
  eq(w.sessionStorage.getItem("pdx_d1_issue"), KEY,
    "the arrival did not commit the key through the desk's own entry point");
  eq(w.PDXDoor1._mode(), "issue",
    "the arrival left the desk in some other mode, so the reader landed on the wrong section");
  eq(TAP.w.PDXDoor1._mode(), "issue", "the chip tap no longer leaves the desk in issue mode");

  // THE BAR AND THE CANONICAL. An exact-key arrival needs no rewrite; the
  // canonical still has to stop claiming this ledger is the front page.
  eq(w.location.pathname, `/i/${KEY}`, "the exact-key arrival moved the address");
  eq(w.__canonical.attrs.href, `${ORIGIN}/i/${KEY}`,
    "rel=canonical still points at the front page from an issue file");
  has(w.document.title, MAP[KEY].label, "the tab does not name the issue");
  has(w.document.title, "PolitiDex", "the tab lost the brand");
  console.log(`      /i/${KEY} === chip tap · ${led.people} rows · ` +
    `${(led.measures || []).length} measures · ${html.length}B identical`);
}

// EXACT KEY IN, EXACT KEY OUT. A label arrival lands on the same ledger and then
// re-stamps the bar with the key, because two addresses for one record is what a
// canonical exists to collapse.
{
  const w = boot({ path: "/i/Protect%20Public%20Lands" });
  const r = await arriveAt(w);
  eq(r.key, KEY, "a label arrival did not resolve to the key");
  eq(w.location.pathname, `/i/${KEY}`, "a label arrival was not re-stamped with the exact key");
  ok((w.__replaced || []).indexOf(`/i/${KEY}`) >= 0,
    "the alias arrival never replaced the address in the bar");
  eq(w.__canonical.attrs.href, `${ORIGIN}/i/${KEY}`,
    "the alias arrival left two addresses for one record");
  eq(r.html, TAP.html, "the label arrival paints a different desk from the key arrival");
  console.log(`      /i/Protect%20Public%20Lands → /i/${KEY}, one canonical`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · An empty key is still a real key");
{
  const w = boot({ path: `/i/${EMPTY}` });
  const r = await arriveAt(w);
  eq(r.key, EMPTY, `arriving at /i/${EMPTY} did not open that key`);
  const led = w.PDXDoor1._ledger(null, EMPTY);
  must(led, `no ledger object for ${EMPTY}`);
  eq(led.people, 0, `${EMPTY} is no longer the empty case this section is about`);
  eq((led.measures || []).length, 0, `${EMPTY} now has mapped measures — pick another empty key`);

  has(r.html, `<b>0</b> people have a readable formal row on <b>${esc(MAP[EMPTY].label)}</b>.`,
    "the empty issue file does not say 0 people on this key's own label");
  has(r.html, "No measure on file is mapped to this key yet.",
    "the empty issue file dropped the no-measure sentence");
  // The blank-lane sentence is the floor's own words, inherited, not written here.
  const NOTE = (w.PDXConsistency.menu.PHRASES.no_vehicle || {}).note || "";
  must(NOTE, "the menu's no_vehicle phrase is gone, so there is nothing to inherit");
  has(r.html, esc(NOTE), "the empty issue file stopped carrying the menu/calendar sentence");
  // NO COUSIN. The sibling with a live record must not appear under this name.
  no(r.html, esc(MAP[KEY].label) + "</b>.",
    `${EMPTY} printed a census about ${KEY} instead of about itself`);
  eq(w.location.pathname, `/i/${EMPTY}`, "the empty key's address was rewritten");
  console.log(`      /i/${EMPTY}: 0 rows · 0 measures · census and calendar sentence intact`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · A miss is said out loud");
{
  const w = boot({ path: `/i/${MISS}` });
  const before = paint(w);
  const r = await arriveAt(w);
  eq(r.key, "", `/i/${MISS} resolved to a key`);

  // NOT A COUSIN. Nothing on the desk is a ledger for anything, and no key was
  // committed — a rounded address is worse than an honest miss because the
  // reader cannot tell they were moved.
  eq(w.sessionStorage.getItem("pdx_d1_issue") || "", "",
    `/i/${MISS} committed some other key`);
  for (const k of [KEY, EMPTY]) {
    no(r.html, `readable formal row on <b>${esc(MAP[k].label)}</b>`,
      `/i/${MISS} painted ${k}'s census`);
  }
  // SAID, IN THE REGISTER'S OWN WORDS. The desk's seek control already owns the
  // sentence for a phrase the register does not carry, so it says it.
  has(r.html, `The register carries no key for “${MISS}”`,
    "the unresolved address did not reach the desk's own miss sentence");
  has(r.html, "Nothing was approximated",
    "the unresolved address dropped the honesty clause");
  // …and again where the reader actually landed, because the desk is a long way
  // down a single-page document.
  const n = (w.__notices || []).filter((x) => x.id === "pdx-issue-unresolved")[0];
  must(n, "no notice was raised for an address that names no key");
  has(n.message, MISS, "the notice does not quote the phrase that failed");
  has(n.message, "not a key the", "the notice does not say the register lacks it");
  no(n.message, "did you mean", "the notice offers a guess");
  ok(before !== r.html, "the miss changed nothing at all on the page");
  console.log(`      /i/${MISS}: no key committed, no cousin painted, said twice`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · The doors point at the address");
{
  // THE EYE. Its issue hit is a real anchor on a real path now, so the answer
  // can be copied, opened in a tab and cited — while the in-place open is
  // unchanged for an ordinary tap.
  const w = boot({ withEye: true });
  const eyeCode = EYE.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, "");
  has(eyeCode, "PDXIssueProfile", "the Eye does not ask the address module for the path");
  has(eyeCode, "issueFileUrl(key)", "the Eye's issue hit does not carry the issue file's href");
  has(eyeCode, "ev.preventDefault()", "the Eye stopped consuming its own tap");
  has(eyeCode, "ev.metaKey", "the Eye consumes modified clicks, so the href cannot be used");
  has(R("index.html"), "text-decoration:none",
    "the Eye's primary control became a link with no underline suppressed");

  // THE TOPIC TREE. A second destination on the leaf, and it does not touch the
  // first: the dossier door is data-pdxtree-dos on the face, the anchor is that
  // button's sibling, and closest() therefore cannot walk from one to the other.
  const treeCode = TREE.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, "");
  has(treeCode, "issueFileHtml(lf)", "the leaf does not print an issue-file control");
  has(treeCode, "F.profileUrl(lf.key)", "the leaf does not ask the family table for the path");
  has(treeCode, "pdxtree-file", "the leaf's issue-file control has no class of its own");
  const dosAt = treeCode.indexOf("data-pdxtree-dos=");
  const linkAt = treeCode.indexOf("issueFileHtml(lf)");
  must(dosAt > 0 && linkAt > 0, "the leaf's two controls are not where this audit looks");
  ok(linkAt > dosAt, "the issue-file anchor is printed before the face that carries the dossier");
  const anchor = treeCode.slice(treeCode.indexOf("function issueFileHtml"));
  no(anchor.slice(0, anchor.indexOf("\n  }")), "data-pdxtree-dos",
    "the issue-file anchor carries the dossier door and would steal the row tap");
  no(anchor.slice(0, anchor.indexOf("\n  }")), "preventDefault",
    "the tree intercepts its own link instead of letting the browser navigate");
  // The stylesheet's prose used to say a leaf had one control. It does not now.
  no(TREECSS, "Nothing else on a leaf is tappable",
    "stance-tree.css still says a leaf has one control, and it has two");
  has(TREECSS, ".pdxtree-file", "stance-tree.css has no rule for the leaf's second control");
  // Quiet, and below the face: it cannot be mistaken for the primary tap.
  const ruleFor = (sel) => {
    const i = TREECSS.indexOf(sel + " {");
    return i < 0 ? "" : TREECSS.slice(i, TREECSS.indexOf("}", i));
  };
  has(ruleFor(".pdxtree-file"), "text-align: right", "the leaf's second control is not set aside");
  has(ruleFor(".pdxtree-file"), "text-decoration: none", "the leaf's second control paints as raw link text");
  ok(parseFloat((ruleFor(".pdxtree-file").match(/font-size:\s*([\d.]+)rem/) || [0, "9"])[1]) <
     parseFloat((ruleFor(".pdxtree-name").match(/font-size:\s*([\d.]+)rem/) || [0, "0"])[1]),
    "the leaf's second control is not smaller than the issue name it sits under");
  ok(!!w.PDXEye, "the Eye did not load");
  console.log("      eye → /i/<key> · leaf → /i/<key>, dossier tap untouched");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · No HTML served as JavaScript");
{
  // /i/lands_preserve is index.html under a two-segment path. A relative
  // src="door1-workspace.js" would resolve to /i/door1-workspace.js, which the
  // rewrite would answer with index.html — and the browser would try to execute
  // a document as a script. Every reference the document makes must be
  // root-absolute (or off-origin), which is the same fix /p/<pid> needed.
  // Only the document's OWN tags are swept. index.html also carries a great deal
  // of inline JavaScript that builds src=/href= attributes out of variables at
  // runtime; those strings are not references this document makes, and matching
  // them would make this probe assert something about template code.
  const refs = [...HTML.matchAll(/<(?:script|link|img)\b[^>]*?\s(?:src|href)="([^"'+]+)"/g)]
    .map((m) => m[1]).filter((u) => u.indexOf("${") < 0);
  must(refs.length > 20, "index.html suddenly asks for almost nothing — this probe is stale");
  const relative = refs.filter((u) => !/^(?:\/|https?:|data:)/.test(u));
  eq(relative.join(", "), "",
    `index.html asks for ${relative.length} asset(s) by relative path, so a visit to /i/<key> ` +
    `would request them under /i/ and be handed index.html`);
  // The one interpolated src the sweep skips is the avatar's, and it is skipped
  // rather than asserted around: that URL is produced by getPhotoUrl() at
  // runtime from an off-origin host, so there is no literal in this document to
  // check and nothing about it that /i/ changed. What matters for this pass is
  // that no SCRIPT or STYLESHEET is asked for by relative path, which is what
  // the sweep above pins — a document executed as JavaScript is the failure the
  // /p/ fix was about.
  // The address module is on the page, after the desk it delegates to.
  has(HTML, 'src="/pdx-issue-profile.js"', "index.html does not load the address module");
  const iDesk = HTML.indexOf('src="/door1-workspace.js"');
  const iAddr = HTML.indexOf('src="/pdx-issue-profile.js"');
  must(iDesk > 0 && iAddr > 0, "the two script tags are not both in index.html");
  ok(iAddr > iDesk, "the address module loads before the desk whose builder it borrows");
  // AND THE STAGE THE ARRIVAL MOUNTS ON. defer keeps execution in document
  // order, so the panel must be declared before the address module that calls
  // PDXIssueFile.open() on arrival — otherwise a cold /i/<key> would find no
  // stage on the very first paint and fall back to the desk it is fixing.
  has(HTML, 'src="/issue-file.js"', "index.html does not load the file panel the arrival mounts on");
  const iPanel = HTML.indexOf('src="/issue-file.js"');
  must(iPanel > 0, "the file panel has no script tag");
  ok(iPanel > iDesk, "the file panel loads before the desk whose one builder it mounts");
  ok(iAddr > iPanel, "the address module loads before the stage it opens");
  // …and its stylesheet, non-blocking like the person file's, because an
  // unstyled full-screen overlay is a worse arrival than a styled desk.
  has(HTML, 'href="/issue-file.css"', "index.html does not load the file panel's stylesheet");
  console.log(`      ${refs.length} asset refs in index.html, 0 relative`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · The files travel together");
{
  // THE REWRITE. Without it the address 404s and none of the above is reachable.
  const iBlock = TOML.indexOf('from = "/i/*"');
  must(iBlock > 0, "netlify.toml has no /i/* rewrite, so the issue file has no address");
  const block = TOML.slice(iBlock, iBlock + 200);
  has(block, 'to = "/index.html"', "/i/* does not rewrite to the single document");
  has(block, "status = 200", "/i/* is a redirect rather than a rewrite, so the bar would move");
  // The person file's rewrite is the pattern being followed; both must be there.
  has(TOML, 'from = "/p/*"', "the person file's rewrite is gone");

  // THE VERSION AND ITS NOTE. A precached module behind a stale version is a
  // reader holding half of this pass.
  const ver = (SW.match(/CACHE_VERSION\s*=\s*'(v\d+)'/) || [])[1] || "";
  must(ver, "sw.js no longer names a CACHE_VERSION");
  has(SW, "'/pdx-issue-profile.js'", "the address module is not precached");
  has(SW, "'/issue-file.js'", "the file panel is not precached");
  has(SW, "'/issue-file.css'", "the file panel's stylesheet is not precached");
  has(SW, "'/pdx-issue-family.js'", "the family table is not precached");
  has(SW, "'/door1-workspace.js'", "the desk is not precached");
  has(SW, "'/door1-workspace.css'", "the desk's stylesheet is not precached — the slice hides rows with it");
  has(SW, "'/stance-tree.js'", "the topic tree is not precached");
  // (all-seeing-eye.js is a runtime entry rather than a precached one, which is
  // sw.js's own long-standing choice for it — so it is not asserted here.)
  ok(new RegExp("^// " + ver + " [-\\u2014]", "m").test(SW),
    `sw.js has no prose note for ${ver}`);
  const note = SW.slice(SW.search(new RegExp("^// " + ver + " [-\\u2014]", "m")));
  const noteEnd = note.indexOf("\nconst") > 0 ? note.slice(0, note.indexOf("\nconst")) : note;
  for (const f of ["pdx-issue-profile.js", "door1-workspace.js", "netlify.toml",
                   "issue-file.js", "issue-file.css"]) {
    has(noteEnd, f, `the ${ver} note does not name ${f} as travelling with this pass`);
  }
  console.log(`      ${ver} · /i/* → index.html 200 · address, panel and stage precached`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("9 · Nothing was characterised here");
{
  // The address module reads a key and delegates. A count, an order, a
  // percentage or a party token in it would be a second characterisation of a
  // record that already has exactly one.
  const CODE = ADDR.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, "");
  for (const banned of ["PDXConsistency", "PDXVotingRecord", "PDXWordAction", "buildRanking",
                        "formalPatternIndex", "LEDGER_BANDS", "sort(", "%", "party", "score",
                        "Math.round(fp", "toFixed"]) {
    no(CODE, banned, `pdx-issue-profile.js reaches for ${banned} — it owns an address, not a reading`);
  }
  // The globals it may touch, and nothing else on the window.
  const globals = [...new Set([...CODE.matchAll(/window\.([A-Za-z_$][\w$]*)/g)].map((m) => m[1]))].sort();
  eq(globals.join(","),
    "PDXDoor1,PDXIssueFamily,PDXIssueFile,PDXIssueProfile,PDXShareLinks,addEventListener,pdxDoor1Issue",
    "pdx-issue-profile.js touches a global beyond the desk, the family table, the file panel, " +
    "the notice and its own name");
  // NO SECOND HOME. Closing is not this file's business.
  for (const banned of ["display = 'none'", "classList.add('pdx-modal", "location.href =",
                        "location.assign", "location.replace", "pushState"]) {
    no(CODE, banned, `pdx-issue-profile.js does ${banned} — it must not take the document over`);
  }
  // TWIN BOOT. The document without the address module reads every record
  // exactly the same way, because nothing in this pass touched a reading.
  const withAddr = boot({ path: "/" });
  const without = boot({ path: "/", withoutAddress: true });
  const sample = [...corpus.byMember.keys()].slice(0, 60);
  let drift = 0;
  for (const pid of sample) {
    const a = JSON.stringify(withAddr.PDXConsistency.formalPatternIndex.rowFor(pid, KEY) || null);
    const b = JSON.stringify(without.PDXConsistency.formalPatternIndex.rowFor(pid, KEY) || null);
    if (a !== b) drift++;
  }
  eq(drift, 0, `${drift} of ${sample.length} formal rows changed when the address module loaded`);
  // …and a document that never visits an issue file is not touched by it.
  eq(without.PDXIssueProfile, undefined, "the address module loaded when it was not asked for");
  // The stage is part of the same pair: a document that holds no /i/ address has
  // no reason to carry the panel that address opens, and a document that holds
  // the address must never be missing it.
  eq(without.PDXIssueFile, undefined, "the file panel loaded when no address could open it");
  eq(typeof withAddr.PDXIssueFile.open, "function", "the address shipped without its stage");
  eq(withAddr.PDXIssueProfile.fromPath(), "", "the front page was read as an issue file");
  eq((withAddr.__replaced || []).length, 0, "the address module rewrote the front page's address");
  eq(withAddr.__canonical.attrs.href, ORIGIN + "/",
    "the address module repointed the front page's canonical");
  console.log(`      ${sample.length} formal rows byte-identical with and without the address`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("10 · The arrival is a file, not the homepage desk");

// THE DEFECT THIS SECTION OWNS. v112 resolved /i/lands_preserve correctly and
// then handed the reader the homepage: the arrival went through
// window.pdxDoor1Issue, that function paints THE DESK, and the desk is a section
// a long way down the front page. So the first visible surface was the hero, the
// second was Door 1's four-way chooser, and the ledger the citation named was
// below the fold under both — with a "Next in Door 1" footer under IT. /p/<pid>
// hides that shell and opens a file. What follows is the assertion that /i/ now
// does the same job with the same one paint.
const FILED = await (async () => {
  const w = boot({ path: `/i/${KEY}` });
  // "Do not scroll #door1 into view as the primary UX" is a claim about a CALL,
  // so the call is watched rather than its absence assumed. toDesk() is the
  // desk's own landing helper and the only thing in the arrival path that ever
  // sent a reader down the page.
  w.__toDesk = 0;
  const realToDesk = w.PDXDoor1.toDesk;
  w.PDXDoor1.toDesk = function (m) { w.__toDesk++; return realToDesk.call(w.PDXDoor1, m); };
  const r = await arriveAt(w);
  return { w, ...r };
})();

{
  const { w, key, html } = FILED;
  const F = w.PDXIssueFile;
  eq(key, KEY, "arriving at the issue file did not open that key");

  // ── THE FILE IS THE SURFACE ───────────────────────────────────────────────
  const node = w.document.getElementById("pdx-issue-file");
  must(node, "no #pdx-issue-file node was built, so nothing covered the homepage");
  ok(F.isOpen(), "the arrival did not open the issue file panel");
  eq(F.key(), KEY, "the panel is open on some other key than the one arrived at");
  eq(node.hidden, false, "the panel was left hidden after an arrival");
  eq(node.getAttribute("role"), "dialog", "the file panel is not a dialog");
  eq(node.getAttribute("aria-modal"), "true",
    "the file panel is not aria-modal, so a screen reader still reads the homepage under it");
  eq(node.getAttribute("aria-hidden"), "false", "an open file panel is still aria-hidden");
  eq(node.getAttribute("aria-labelledby"), "pdx-issue-file-title",
    "the file panel is not labelled by its own title");
  // The homepage cannot be scrolled behind an open file — openModal's own lock.
  eq(w.document.body.style.overflow, "hidden",
    "the page under the file still scrolls, so the homepage is still in play");
  // …and the reader was NOT sent down the front page instead.
  eq(w.__toDesk, 0,
    "the arrival scrolled the Door 1 desk into view, which is landing on the homepage");

  // ── THE CENSUS A READER SEES IS INSIDE THE FILE, NOT ON THE FRONT PAGE ────
  const led = w.document.getElementById("pdx-issue-file-ledger");
  must(led, "the panel has no ledger host");
  ok(led !== w.document.getElementById("pdx-d1-body"),
    "the panel mounts into the desk's own node, so the file IS the homepage section");
  const censusLine = `readable formal row on <b>${esc(MAP[KEY].label)}</b>.`;
  has(led.innerHTML, censusLine, "the open file panel does not contain the census heading");

  // ── BYTE EQUALITY · THE PANEL BODY IS THE ONE BUILDER'S STRING ────────────
  // Not "contains the same numbers": IS the string. A single character of this
  // module's own inside the ledger host would be a second surface with an
  // opinion, and this is the assertion that makes that impossible to ship.
  eq(led.innerHTML, w.PDXIssueProfile.html(KEY),
    "the panel body is not byte-identical to PDXIssueProfile.html(key)");
  eq(led.innerHTML, w.PDXDoor1.issueProfile(KEY),
    "the panel body is not byte-identical to the desk's one builder");
  // …and that string is still what the desk paints, so the two doors are one
  // paint even though only one of them is now the arrival's destination.
  has(html, led.innerHTML,
    "the desk no longer contains the file's own body, so the two doors have forked");
  eq(html, TAP.html, "the arrival and the chip tap paint different desks for the same key");

  // ── THE SAME CENSUS CONTRACT AS THE DESK ──────────────────────────────────
  const ldg = w.PDXDoor1._ledger(null, KEY);
  eq((ldg.measures || []).length, 4, `${KEY} no longer maps to the four measures the smoke counts`);
  has(led.innerHTML, `<b>${ldg.people}</b>`, "the file does not print the census row count");
  has(led.innerHTML, "<b>4</b> measures on file map here.",
    "the file does not print the four measures the desk prints");

  // ── THE CHROME · PERSON-FILE ANALOG, AND NOT A SECOND READING ─────────────
  const chrome = w.document.getElementById("pdx-issue-file-chrome");
  must(chrome, "the panel has no chrome host");
  const ch = String(chrome.innerHTML);
  has(ch, "Issue file", "the file chrome does not name the surface");
  has(ch, `/i/${KEY}`, "the file chrome does not print the citable address");
  has(ch, esc(MAP[KEY].label), "the file chrome does not carry the child label as its title");
  has(ch, `id="pdx-issue-file-title"`, "the chrome's title is not the node the dialog is labelled by");
  // The crumb, core → child, from the family table and not from a second lookup.
  const crumb = w.PDXIssueFamily.crumb(KEY);
  must(crumb && crumb.coreLabel, `no crumb for ${KEY}`);
  has(ch, esc(crumb.coreLabel), "the file chrome does not name the core the key is filed under");
  has(ch, esc(crumb.childLabel), "the file chrome does not name the child");
  // Scope ⓘ, and ONLY where issue-scope.js already holds prose for the key.
  const scope = w.PDXIssueScope.controlHtml(KEY) || "";
  must(scope, `issue-scope.js holds no prose for ${KEY} — pick a key it does`);
  has(ch, scope, "the file chrome drops the scope ⓘ for a key that has prose");
  eq(w.PDXIssueFile._chrome("lands_no_prose_key_at_all").indexOf("pdxis-key") >= 0, false,
    "the chrome invented a scope control for a key issue-scope.js holds nothing for");
  // NO SECOND READING IN THE BAR. A figure in the chrome would outrank the census
  // two lines under it — the same wall person-file.js's kicker keeps.
  for (const banned of ["readable formal row", "advanced", "cut against", "%",
                        "measures on file map here", "Direction Match"]) {
    no(ch, banned, `the file chrome characterises the record ("${banned}") instead of naming it`);
  }
  console.log(`      /i/${KEY} → aria-modal file · ${led.innerHTML.length}B === html(key) · ` +
    `${ldg.people} rows · 4 measures · desk not scrolled to`);
}

// ── THE EMPTY KEY IS A FILE TOO ─────────────────────────────────────────────
// The requested contract, both keys: lands_preserve has four measures, and
// lands_keep_public has none — and the second is the one an arrival is most
// tempted to turn into "nothing here, have the homepage instead". It opens a
// file, that file says 0 out loud, and it carries the menu's own calendar
// sentence in the menu's own words. Same builder, same panel, same address.
{
  const w = boot({ path: `/i/${EMPTY}` });
  const r = await arriveAt(w);
  eq(r.key, EMPTY, `arriving at /i/${EMPTY} did not open that key`);
  ok(w.PDXIssueFile.isOpen(), `/i/${EMPTY} did not open a file for a key with an empty record`);
  const led = w.document.getElementById("pdx-issue-file-ledger");
  must(led, "the empty key's file has no ledger host");
  eq(led.innerHTML, w.PDXIssueProfile.html(EMPTY),
    "the empty key's panel body is not byte-identical to the one builder's string");
  const ldg = w.PDXDoor1._ledger(null, EMPTY);
  eq(ldg.people, 0, `${EMPTY} is no longer the empty case this branch is about`);
  eq((ldg.measures || []).length, 0, `${EMPTY} now has mapped measures — pick another empty key`);
  has(led.innerHTML, `<b>0</b> people have a readable formal row on <b>${esc(MAP[EMPTY].label)}</b>.`,
    "the empty key's file does not say 0 people on its own label");
  has(led.innerHTML, "No measure on file is mapped to this key yet.",
    "the empty key's file dropped the no-measure sentence");
  const NOTE = (w.PDXConsistency.menu.PHRASES.no_vehicle || {}).note || "";
  must(NOTE, "the menu's no_vehicle phrase is gone, so there is nothing to inherit");
  has(led.innerHTML, esc(NOTE), "the empty key's file stopped carrying the menu/calendar sentence");
  // NO COUSIN IN THE FILE EITHER, and no cousin in the bar above it.
  no(led.innerHTML, esc(MAP[KEY].label) + "</b>.",
    `${EMPTY}'s file printed a census about ${KEY}`);
  const ch = String(w.document.getElementById("pdx-issue-file-chrome").innerHTML);
  has(ch, esc(MAP[EMPTY].label), "the empty key's chrome does not name the key arrived at");
  no(ch, esc(MAP[KEY].label), "the empty key's chrome names a sibling with a record");
  console.log(`      /i/${EMPTY} → a file that says 0 · 0 measures · calendar sentence`);
}

// ── THE BATCHES STILL LAND IN THE FILE ──────────────────────────────────────
// The ledger's roll-call read arrives in batches and fires 'pdx-issue-votes' per
// batch. The desk re-syncs on it; so must the panel, through the same builder —
// otherwise the file sits on the first batch's census while the desk behind it
// counts the rest.
{
  const { w } = FILED;
  const led = w.document.getElementById("pdx-issue-file-ledger");
  const listeners = (w.__listeners["pdx-issue-votes"] || []);
  must(listeners.length >= 2,
    "nothing is listening for the vote batches — the desk and the panel should both be");
  led.innerHTML = "<p>stale</p>";
  for (const f of listeners) { try { f({ type: "pdx-issue-votes" }); } catch { /* desk sync */ } }
  eq(led.innerHTML, w.PDXIssueProfile.html(KEY),
    "a vote batch did not repaint the open file from the one builder");
  console.log("      pdx-issue-votes repaints the file from the same builder");
}

// ── THE FILE COVERS THE HOMEPAGE, AND A PERSON COVERS THE FILE ──────────────
// Two claims that a sandbox cannot see paint, so both are read where they are
// decided. The homepage's own top bar is `fixed … z-50`: a panel at 49 would let
// that bar float over a file reached by citation, which is the page showing
// through the thing meant to replace it. And #modal-overlay is z-50 too, so the
// winner between them is document order — a runtime-appended panel would land
// last and put an issue file ABOVE the person opened from one of its own rows.
{
  const CSS = R("issue-file.css");
  const panelCss = CSS.replace(/\/\*[\s\S]*?\*\//g, "");
  const stage = panelCss.slice(panelCss.indexOf("#pdx-issue-file {"));
  const z = (stage.match(/z-index:\s*(\d+)/) || [])[1] || "";
  eq(z, "50", "the file panel does not sit at the layer the homepage's fixed nav sits at");
  has(HTML, "fixed top-0 left-0 right-0 z-50",
    "the homepage's nav is no longer the fixed z-50 bar this layer was chosen against");
  has(panelCss, "#pdx-issue-file[hidden] { display: none !important; }",
    "a hidden panel is not hidden hard enough to lose to its own display rule");
  // …and the tie with the person modal is settled by where the node goes.
  const panelCode = PANEL.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, "");
  has(panelCode, "insertBefore(overlay, host)",
    "the panel is appended after the person overlay, so a person would open under the file");
  has(panelCode, "el('modal-overlay')", "the panel does not look for the overlay it must sit under");
  // The fallback still puts the stage on the page when that overlay is absent —
  // which is the case in this sandbox, and the panel opened anyway.
  ok(FILED.w.PDXIssueFile._node(), "with no person overlay on the page the panel did not mount at all");
  console.log("      z-50 over the fixed nav, before #modal-overlay so a person lands on top");
}

// ── A PERSON OPENED OUT OF THE FILE DOES NOT UNLOCK THE PAGE UNDER IT ───────
// closeModal() clears document.body.style.overflow unconditionally, because
// until this pass nothing could be underneath the person file. Opened from a
// ledger row inside an issue file, that close would hand the homepage its scroll
// back while the file is still over it. The panel watches the person overlay and
// re-takes the lock rather than asking closeModal to behave differently.
{
  const { w } = FILED;
  has(HTML, 'id="modal-overlay"', "the person modal's overlay is no longer in the document");
  eq(w.document.body.style.overflow, "hidden", "the open file does not hold the page lock");
  // What closeModal does to the page, done to the page.
  w.document.body.style.overflow = "";
  eq(w.PDXIssueFile._relock(), undefined, "the panel's lock helper is not callable");
  eq(w.document.body.style.overflow, "hidden",
    "the panel cannot re-take the lock a closing person modal drops");
  const panelCode = PANEL.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, "");
  has(panelCode, "modal-overlay",
    "issue-file.js does not watch the one overlay that drops the lock while a file is open");
  has(panelCode, "attributeFilter",
    "the watch is not scoped to the attributes that carry the signal");
  no(panelCode, "closeModal", "issue-file.js reaches into the person modal instead of watching it");
  no(panelCode, "PDXPerson", "issue-file.js opens or closes the person file instead of noticing it");
  console.log("      a person closed out of the file leaves the page under it locked");
}

// ── CLOSE RETURNS THE READER, AND THE BAR, TO / ─────────────────────────────
{
  const { w } = FILED;
  const node = w.document.getElementById("pdx-issue-file");
  const led = w.document.getElementById("pdx-issue-file-ledger");
  eq(w.PDXIssueFile.close(), true, "close() did not report closing the file");
  eq(w.PDXIssueFile.isOpen(), false, "the file is still open after close()");
  eq(node.hidden, true, "the panel was not hidden on close");
  eq(node.getAttribute("aria-hidden"), "true", "a closed file panel is not aria-hidden");
  eq(led.innerHTML, "", "the closed file kept a ledger behind a hidden overlay");
  eq(w.document.body.style.overflow, "", "the page under a closed file still cannot scroll");
  // THE BAR, THE SAME WAY /p/ CLEARS. A cold arrival has no earlier surface, so
  // the front door is the honest destination — not the issue we just closed.
  eq(w.location.pathname, "/", "closing the issue file left /i/<key> in the address bar");
  eq(w.__canonical.attrs.href, `${ORIGIN}/`,
    "closing the issue file left rel=canonical pointing at the closed ledger");
  eq(w.document.title, "PolitiDex | Bound by Truth",
    "closing the issue file left the tab on the issue");
  console.log("      close → / · canonical / · tab home · ledger dropped");
}

// ── A WARM CLOSE GOES BACK WHERE THE READER WAS ─────────────────────────────
// Not every arrival is cold: an in-app open from the front page has a surface to
// return to, and returning to "/" from a reader who was already at "/#door1"
// would throw away their place. Same capture, same restore, as /p/.
{
  const w = boot({ path: "/" });
  w.location.hash = "#door1";
  const opened = w.PDXIssueProfile.stamp(KEY) && w.PDXIssueFile.open(KEY);
  ok(opened, "the file panel would not open from the front page");
  // The hash rides along in both directions — this harness's replaceState
  // records the whole url it was handed, where a browser would split it — and
  // that is the behaviour being asserted: the reader's place is not thrown away.
  eq(w.location.pathname, `/i/${KEY}#door1`, "opening in place did not stamp the file's address");
  w.PDXIssueFile.close();
  eq(w.location.pathname, "/#door1",
    "closing did not return the reader to the surface they came from");
  console.log("      warm open → /i/<key> → close → the surface it opened from");
}

// ── THE DESK IS UNTOUCHED ON / ──────────────────────────────────────────────
// A chip tap on the front page is a VIEW of the file, and the desk is where
// views live. It must still open in place, and it must NOT open a file panel
// over the page a reader is already reading.
{
  const w = boot({ path: "/" });
  const html = await tapKey(w, KEY);
  has(html, `readable formal row on <b>${esc(MAP[KEY].label)}</b>.`,
    "a chip tap on / no longer paints the ledger in the desk");
  eq(w.PDXDoor1._mode(), "issue", "a chip tap on / no longer leaves the desk in issue mode");
  eq(w.PDXIssueFile.isOpen(), false, "a chip tap on / opened a file panel over the homepage");
  eq(w.document.getElementById("pdx-issue-file"), null,
    "a chip tap on / built the file panel, which the front page never asked for");
  eq(w.location.pathname, "/", "a chip tap on / moved the address");
  eq((w.__replaced || []).length, 0, "a chip tap on / rewrote the front page's address");
  console.log("      chip tap on / → the desk, in place, no panel, no address change");
}

// ── A MISS AND A BUNDLE OPEN NO FILE ────────────────────────────────────────
{
  // An unresolved address must not open an empty file, and must not open
  // somebody else's. Nothing is filed at all.
  const w = boot({ path: `/i/${MISS}` });
  const r = await arriveAt(w);
  eq(r.key, "", `/i/${MISS} resolved to a key`);
  eq(w.PDXIssueFile.isOpen(), false, `/i/${MISS} opened a file panel for a key that does not exist`);
  eq(w.document.getElementById("pdx-issue-file"), null,
    `/i/${MISS} built a file stage with nothing to put on it`);

  // A BUNDLE IS NOT A FILE. One of the thirteen cores is also a shipped key, and
  // it has no single ledger to open — the reader picks a member key on the desk's
  // sub-key shelf. The panel says so by refusing, and the arrival falls back to
  // the desk rather than showing an empty file.
  const cores = (w.CORE_NATIONAL_ISSUES || []).map((c) => c && c.key).filter(Boolean);
  const bundle = cores.filter((k) => !w.PDXDoor1.issueProfile(k))[0] || "";
  must(bundle, "no bundle key answers '' any more — this branch has nothing to check");
  const b = boot({ path: `/i/${bundle}` });
  b.__toDesk = 0;
  const realToDesk = b.PDXDoor1.toDesk;
  b.PDXDoor1.toDesk = function (m) { b.__toDesk++; return realToDesk.call(b.PDXDoor1, m); };
  const rb = await arriveAt(b);
  eq(rb.key, bundle, `/i/${bundle} did not open the bundle`);
  eq(b.PDXIssueFile.isOpen(), false, `/i/${bundle} opened a file for a bundle with no single ledger`);
  eq(b.PDXIssueFile.open(bundle), false, "the panel opened a file whose body would be empty");
  ok(b.__toDesk > 0, `/i/${bundle} did not fall back to the desk, so it landed nowhere`);
  console.log(`      /i/${MISS} → no file · /i/${bundle} → the desk's sub-key shelf`);
}

// ── THE PANEL CHARACTERISES NOTHING EITHER ──────────────────────────────────
{
  // Same audit as section 9 makes of the address module, made of the stage: it
  // holds a string it did not build and chrome that names things. There is no
  // arithmetic in it.
  const CODE = PANEL.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, "");
  for (const banned of ["PDXConsistency", "PDXVotingRecord", "PDXWordAction", "buildRanking",
                        "formalPatternIndex", "LEDGER_BANDS", "sort(", "%", "party", "score",
                        "toFixed", ".length >", "Math."]) {
    no(CODE, banned, `issue-file.js reaches for ${banned} — it owns a stage, not a reading`);
  }
  const globals = [...new Set([...CODE.matchAll(/window\.([A-Za-z_$][\w$]*)/g)].map((m) => m[1]))].sort();
  // TWO NAMES JOINED THIS LIST WITH THE LETTERHEAD, and both are doors rather
  // than readings: pdxDoor1Issue is the desk's ONE issue door — the same call the
  // shelf's own chips make, and the only honest destination for a family crumb,
  // because a core has no file — and _showToast is the site's notice primitive,
  // which is what the Share jump says "copied" with. Neither one can answer a
  // question about the record, which is what this allowlist is guarding.
  eq(globals.join(","),
    "MutationObserver,PDXDoor1,PDXIssueColors,PDXIssueFamily,PDXIssueFile,PDXIssueProfile," +
    "PDXIssueScope,_showToast,addEventListener,pdxDoor1Issue",
    "issue-file.js touches a global beyond the desk and its one issue door, the family table, " +
    "the palette, the address, the scope card, the notice primitive, the observer that watches " +
    "the person overlay, and its own name");
  // The letterhead's copy is prose about a key, never a verdict about a person.
  for (const banned of ["backs up their words", "Direction Match", "consistency",
                        "ranked", "Add to team"]) {
    no(CODE, banned, `issue-file.js's letterhead says "${banned}" — that is a different lane`);
  }
  // It never writes the address itself — one owner for /i/, and it is the module
  // that took it.
  for (const banned of ["location.href", "location.assign", "location.replace",
                        "replaceState", "pushState"]) {
    no(CODE, banned, `issue-file.js writes the address (${banned}) instead of asking the address module`);
  }
  has(CODE, "A.restore()", "issue-file.js does not hand the address back on close");
  // …and it builds no census markup of its own: no band, no row, no measure.
  for (const banned of ["d1-led-", "d1-scope", "d1-empty", "readable formal row"]) {
    no(CODE, banned, `issue-file.js writes ledger markup (${banned}) — there is one builder`);
  }
  console.log("      issue-file.js: 0 counts, 0 orders, 0 ledger markup, 0 address writes");
}

// ═════════════════════════════════════════════════════════════════════════════
section("11 · The file wears the family's colour");
// ── ONE PALETTE, ONE STRING, TWO SURFACES ───────────────────────────────────
// A reader taps a green chip on the desk and arrives at /i/lands_preserve. If
// the file's letterhead is the panel's grey, the tap and the destination look
// like two different subjects. The fix is not "make the bar green" — it is that
// the bar asks the SAME function the chip asked, so the two strings are one
// string and there is no second green to drift.
{
  const w = boot({ path: `/i/${KEY}` });
  await arriveAt(w);
  const C = w.PDXIssueColors;
  must(C && typeof C.styleFor === "function", "issue-colors.js is not loaded in this boot");
  const ch = String(w.document.getElementById("pdx-issue-file-chrome").innerHTML);
  const bar = (ch.match(/<div class="pdxif-bar"[^>]*>/) || [""])[0];
  must(bar, "the chrome has no .pdxif-bar identity block to theme");
  has(bar, 'data-ic=', "the identity bar carries no data-ic, so nothing in it can spend the family vars");
  const barStyle = (bar.match(/style="([^"]*)"/) || ["", ""])[1];

  // THE NAMED TEST: the bar's token IS PDXIssueColors.styleFor(key).
  eq(barStyle, C.styleFor(KEY), "the file's identity bar does not carry PDXIssueColors.styleFor(key)");
  // …and it is the same string a Door 1 child chip carries for the same key.
  // Two surfaces, one palette call, byte-for-byte — which is the whole claim.
  const shelf = await tapKey(boot({ path: "/" }), KEY);
  const chip = [...shelf.matchAll(/<button[^>]*class="d1-chip is-key[^>]*>/g)]
    .map((m) => m[0]).find((c) => c.indexOf(`pdxDoor1Issue('${KEY}')`) >= 0);
  must(chip, `the desk's sub-key shelf no longer paints a chip for ${KEY}`);
  eq(barStyle, (chip.match(/style="([^"]*)"/) || ["", ""])[1],
    "the file's bar and the desk's chip for the same key carry different colour tokens");
  // The hue is the FAMILY's, not the leaf's own: a child and its core read the
  // same, which is why the crumb above the title can be one colour story.
  eq(barStyle, C.styleFor(w.PDXIssueFamily.coreOf(KEY)),
    "the file's bar is not the core family's colour");
  // All four properties, because the stylesheet spends more than one of them.
  for (const v of ["--pdx-ic:", "--pdx-ic-soft:", "--pdx-ic-wash:", "--pdx-ic-ink:"]) {
    has(barStyle, v, `the bar's token is missing ${v}`);
  }
  // Title, crumb, rail — the three things the work order asked for, spent on the
  // vars and gated on the attribute.
  const CSS = R("issue-file.css");
  has(CSS, ".pdxif-bar[data-ic] .pdxif-title { color: var(--pdx-ic-ink); }",
    "the title does not take the family ink");
  has(CSS, ".pdxif-bar[data-ic] .pdxif-child { color: var(--pdx-ic-ink); }",
    "the crumb's child half does not take the family ink");
  has(CSS, ".pdxif-bar[data-ic] .pdxif-arrow { color: var(--pdx-ic); }",
    "the crumb's separator does not take the family colour");
  const rail = (CSS.match(/\.pdxif-bar\[data-ic\]::before\s*\{[^}]*\}/) || [""])[0];
  must(rail, "there is no rail rule on the identity bar");
  has(rail, "width: 4px;", "the rail is not the 4px the work order asked for");
  has(rail, "background: var(--pdx-ic);", "the rail is not painted from the palette var");

  // NO HEX AUTHORED IN EITHER FILE. Every #rrggbb the bar renders arrived through
  // --pdx-ic*, so a `#` in these two files is a palette colour re-typed by hand —
  // the one way the file and the chip could become two different greens.
  for (const f of ["issue-file.js", "issue-file.css"]) {
    const hexes = [...R(f).matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0]);
    eq(hexes.join(","), "", `${f} authors a colour by hand: ${hexes.join(", ")}`);
  }

  // THE FALLBACK IS THE ABSENCE OF THE ATTRIBUTE. A key that lands on no family
  // gets no token, no rail and no themed ink — the bar it always was, and never a
  // grey invented to mean "unthemed".
  eq(w.PDXIssueFile._skin(MISS).attr, "", "an unresolved key was given a colour anyway");
  no(w.PDXIssueFile._chrome(MISS), "data-ic", "the chrome themed a key with no family colour");
  no(w.PDXIssueFile._chrome(MISS), "--pdx-ic", "the chrome leaked palette vars onto an unresolved key");

  // ── THE ⓘ ON THIS KEY IS A REAL BOUNDARY, NOT THE BLANK SENTENCE ───────────
  const sc = w.PDXIssueScope;
  const rd = sc.read(KEY);
  must(rd, `issue-scope.js cannot read ${KEY} at all`);
  ok(rd.defined, `${KEY} still has no entry in issue-scope.js's table`);
  ok(rd.inn.length > 40 && rd.out.length > 40,
    `${KEY}'s scope names no in/out boundary worth reading`);
  const card = sc.cardHtml(KEY);
  no(card, sc.NO_DEF, `the scope popover on ${KEY} is still the blank sentence`);
  has(card, esc(rd.inn), "the popover does not print the boundary the table holds");
  has(ch, sc.controlHtml(KEY), "the file's bar dropped the ⓘ for a key that now has prose");
  console.log(`      /i/${KEY} bar === styleFor(${KEY}) === the desk's chip · ` +
    `4px rail, ink title, ink child · 0 hex in issue-file.* · ⓘ has a boundary`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("12 · The letterhead: what the key means, and how much is filed");
// ── ONE CENSUS, TWO READERS ─────────────────────────────────────────────────
// The file used to print the key's NAME and then the record. A reader who
// followed a citation to /i/climate_action was never told what the key MEANS,
// how much was filed under it, or how to get back to the shelf. The letterhead
// answers those three, and the trap it has to avoid is the same trap this whole
// harness exists for: counting anybody a second time. So the integers on the
// line come from PDXDoor1.issueCensus — the desk publishing the read it already
// ran — and this section asserts them against that census, against the prose in
// the body, and against the busy line that outranks both.
const LKEY = "climate_action";
const LCORE = "climate_energy";
must(MAP[LKEY], `${LKEY} is no longer a shipped ISSUE_MAP key`);
// A FAMILY, and deliberately one that is NOT in ISSUE_MAP: climate_energy is the
// shelf climate_action is filed on, it has no entry of its own in the register,
// and so /i/climate_energy is the purest form of an address with no file behind
// it. (Section 10 checks the other shape — a core that IS also a shipped key.)
must((probe.CORE_NATIONAL_ISSUES || []).some((c) => c && c.key === LCORE),
  `${LCORE} is no longer a Core National Issue — this section needs a family to point the crumb at`);
must(probe.PDXIssueFamily.coreOf(LKEY) === LCORE,
  `${LKEY} is no longer filed under ${LCORE} — the crumb this section reads points somewhere else`);
must(typeof probe.PDXDoor1.issueCensus === "function",
  "PDXDoor1.issueCensus is not published — the letterhead has no census to print and would have to count");
must(typeof probe.PDXIssueFile._head === "function",
  "issue-file.js does not publish _head() — the letterhead's copy is unreadable from here");

// THE FIELD ACTUALLY SETTLES. boot() notes every member the corpus holds, which
// leaves the handful with no record at all permanently COLD — and stubReads'
// fetchCompare answers an empty batch, so warmLedger never closes the gap. That
// is right for every section above (they are about markup, not warming), but a
// permanently cold ledger can never be asked what it prints when the reading is
// DONE, which is half of the busy gate's claim. So this notes what the shipped
// fetch notes for the rest of the roster: the member, with whatever the corpus
// holds for them, INCLUDING NOTHING — an empty record is a settled record, and
// that is exactly the distinction `cold` is counting.
function warmAll(w) {
  const P = w.CMP_DATA || [];
  const ids = Array.isArray(P) ? P.map((x) => x && x.id) : Object.keys(P);
  must(ids.length > 100, "the roster did not load, so nothing can be warmed");
  for (const pid of ids) {
    if (!pid) continue;
    try { w.PDXVotingRecord.noteMember(pid, corpus.byMember.get(pid) || []); } catch { /* not a member */ }
  }
  return w;
}
const headOf = (w) => {
  const h = w.document.getElementById("pdx-issue-file-head");
  return h ? String(h.innerHTML) : "";
};
const ledgerOf = (w) => {
  const h = w.document.getElementById("pdx-issue-file-ledger");
  return h ? String(h.innerHTML) : "";
};

{
  const w = warmAll(boot({ path: `/i/${LKEY}` }));
  const arrival = await arriveAt(w);
  eq(arrival.key, LKEY, `/i/${LKEY} did not resolve to its own key`);
  // Two more drains and the batch's own repaint, which is what a reader waiting
  // three hundred milliseconds gets.
  await tick(); await tick(); await tick();
  w.PDXIssueFile.repaint();
  const head = headOf(w);
  const body = ledgerOf(w);
  const c = w.PDXDoor1.issueCensus(LKEY);
  must(c, `the desk publishes no census for ${LKEY}`);
  // THE PANEL READS THE DESK'S CENSUS AND NOT ITS OWN. Asserted as the whole
  // shape rather than figure by figure: a panel that had started keeping its own
  // people count, its own band order or its own measure total would differ here
  // before it differed on the line.
  eq(JSON.stringify(w.PDXIssueFile._census(LKEY)), JSON.stringify(c),
    "the letterhead's census is not PDXDoor1.issueCensus — there are two counts on this page");
  must(!c.cold && !c.pending,
    `the record on ${LKEY} never settled in this harness (cold ${c.cold}) — the inventory below cannot be reached`);

  // ── THE DEFINITION, VERBATIM ──────────────────────────────────────────────
  const rd = w.PDXIssueScope.read(LKEY);
  must(rd && rd.defined, `issue-scope.js holds no scope for ${LKEY} — pick a key it defines`);
  has(head, esc(rd.chip), "the letterhead does not print the register's own chip for the key");
  has(head, esc(rd.inn), "the letterhead does not print the locked scope prose");
  no(head, w.PDXIssueScope.NO_DEF, "the letterhead printed the no-definition blank over a key that has one");
  no(head, "is-blank", "the scope paragraph was styled as a blank on a key with prose");
  // Verbatim means verbatim: not a lead, not a summary, not the first sentence.
  ok(esc(rd.inn).length > 200 && head.indexOf(esc(rd.inn)) >= 0,
    "the scope prose on the letterhead is not the whole of what the table holds");

  // ── THE INVENTORY IS THE CENSUS ───────────────────────────────────────────
  const inv = (head.match(/<p class="pdxif-inv">([\s\S]*?)<\/p>/) || ["", ""])[1];
  must(inv, "there is no inventory line on the letterhead at all");
  has(inv, `${c.people} people with a readable row`,
    "the inventory's headline figure is not the census's own people count");
  has(inv, `${c.measures} measures mapped`,
    "the inventory's measure count is not the census's own");
  // Every band the index published, in the index's own order, with the index's
  // own arithmetic — which is to say none: each figure is b.n as it arrived.
  const bands = (c.bands || []);
  must(bands.length === 5, `the formal index publishes ${bands.length} bands, not the five this line names`);
  let cursor = 0;
  for (const b of bands) {
    if (!b.n) {
      // A ZERO IS DROPPED, not printed as a 0. A row of noughts on a letterhead
      // reads as a verdict about the people rather than about the record.
      no(inv, ` 0 `, "the inventory printed a zero bucket instead of dropping it");
      continue;
    }
    const at = inv.indexOf(`${b.n} `, cursor);
    ok(at >= 0, `the inventory drops the ${b.id} band (${b.n}) the index published`);
    if (at >= 0) cursor = at + 1;
  }
  // …and the bands sum to the people count, which is the index's guarantee and
  // not this line's: asserted here so a band silently missing from the inventory
  // cannot pass as a smaller census.
  eq(bands.reduce((n, b) => n + b.n, 0), c.people,
    "the published bands do not account for every person the census counted");
  // THE NO-SIDE BAND IS NOT HIDDEN. People with a row and no readable direction
  // are the least flattering figure on the line, which is exactly why the work
  // order says to keep them.
  const noneBand = bands.find((b) => b.id === "none");
  must(noneBand && noneBand.n > 0,
    `${LKEY} has nobody in the no-side band any more — this claim has nothing to check`);
  has(inv, `${noneBand.n} no side`, "the no-side band was dropped from the inventory to make it prettier");

  // ── AND IT IS COUNTS ONLY ─────────────────────────────────────────────────
  no(head, "%", "there is a percentage on the letterhead");
  no(head, "backs up their words", "the letterhead reached for the say-vs-do lane");
  for (const w2 of ["Direction Match", "consistency", "ranked", "Republican", "Democrat",
                    "data-fparty", "Add to team"]) {
    no(head, w2, `the letterhead says "${w2}" — it is an inventory, not a verdict`);
  }
  // No party as an axis, spelled the way the family-door harness spells it: not
  // one pill, not one chip, not one letter used as a filter.
  eq((head.match(/pdxif-[a-z-]*part/g) || []).length, 0, "the letterhead grew a party control");

  // ── TWO JUMPS. NO THIRD. ──────────────────────────────────────────────────
  const jumps = [...head.matchAll(/<button[^>]*class="pdxif-jump"[^>]*>/g)].map((m) => m[0]);
  eq(jumps.length, 2, "the letterhead does not carry exactly the two jumps the work order names");
  has(jumps[0], `window.PDXIssueFile.deskJump('${LKEY}')`, "the first jump is not the desk, scoped to this key");
  has(jumps[1], `window.PDXIssueFile.share('${LKEY}')`, "the second jump is not the share");
  has(head, `copy /i/${LKEY}`, "the share jump does not say what it copies");

  // ── THE BODY IS STILL THE DESK'S, BYTE FOR BYTE ───────────────────────────
  // The letterhead is a SIBLING of the ledger host, never a wrapper and never a
  // rebuild. This is claim 2 of this file, re-asserted on the key this section
  // is about and against the desk painted to the same key in its own window.
  eq(body, w.PDXDoor1.issueProfile(LKEY),
    "the file's body is no longer the builder's string — the letterhead rebuilt the ledger");
  const desk = warmAll(boot({ path: "/" }));
  const deskHtml = await tapKey(desk, LKEY);
  await tick(); await tick(); await tick();
  const deskHtml2 = paint(desk);
  ok(deskHtml2.indexOf(desk.PDXDoor1.issueProfile(LKEY)) >= 0,
    "the desk scoped to this key does not contain the builder's string, so the two doors are not one builder");
  // The four things the work order names as already shipping, found in the body
  // and NOT in the letterhead — one builder, and it is the one below.
  for (const mark of ["d1-led-band", "Open the acts", "Measures on file", "Who voted on it"]) {
    has(body, mark, `the body lost "${mark}" — the leaf ledger is not the desk's any more`);
    no(head, mark, `the letterhead rebuilt "${mark}" instead of leaving it to the one builder`);
  }
  console.log(`      /i/${LKEY} · scope prose verbatim · ${inv.replace(/\s+/g, " ")}`);
}

// ── THE BUSY GATE, ON BOTH BLOCKS OF ONE PANEL ──────────────────────────────
// The rule is not "wait a bit". It is that no integer may be published while the
// ledger below is still saying it is reading — so the assertion is made on the
// two blocks together, in the same paint, twice: cold, then settled.
{
  const w = boot({ path: `/i/${LKEY}` });  // NOT settled: the field stays out
  await arriveAt(w);
  const head = headOf(w);
  const body = ledgerOf(w);
  const c = w.PDXDoor1.issueCensus(LKEY);
  must(c && c.cold, "the un-settled boot warmed anyway — this branch has no cold state to check");
  has(body, "Reading the full record for", "the ledger dropped its own honesty line, so there is nothing to gate on");
  has(head, "Reading the record on this key", "the letterhead published while the record was still being read");
  no(head, "pdxif-inv", "the letterhead printed an inventory line under a live read");
  // Not one integer, anywhere in the block — not the people count, not a band,
  // not the measure count, which is the figure most tempting to publish early
  // because it does not move.
  const figures = (head.replace(/<[^>]*>/g, " ").match(/\d+/g) || []);
  eq(figures.join(","), "", `the letterhead published figures (${figures.join(", ")}) while the read was out`);
  // …and it says what the rows underneath are, so the partial list is not read as
  // the official N.
  has(head, "on file so far", "the letterhead does not say the rows below it are partial");

  // THE SAME PANEL, AFTER. One repaint on the batch event and the line appears —
  // which is what makes the gate a gate rather than a permanent silence.
  warmAll(w);
  w.PDXDoor1.sync();
  await tick(); await tick(); await tick();
  w.PDXIssueFile.repaint();
  const head2 = headOf(w);
  const body2 = ledgerOf(w);
  no(body2, "Reading the full record for", "the record never settled, so the lift below cannot be checked");
  no(head2, "Reading the record on this key", "the letterhead is still saying it is reading after the record settled");
  has(head2, "people with a readable row", "the inventory never appeared once the read was done");
  console.log("      cold: 0 figures, 'on file so far' · settled: the inventory appears on the same paint");
}

// ── A KEY WITH NO SCOPE ON FILE SAYS SO, IN ISSUE-SCOPE'S OWN WORDS ─────────
{
  const bare = Object.keys(MAP).find((k) => {
    const r = probe.PDXIssueScope.read(k);
    return r && !r.defined && probe.PDXDoor1.issueProfile(k);
  }) || "";
  must(bare, "every shipped key now has scope prose — this branch has nothing to check");
  const h = probe.PDXIssueFile._head(bare);
  has(h, esc(probe.PDXIssueScope.NO_DEF), "a key with no scope on file got no sentence saying so");
  has(h, "is-blank", "the honest blank is not marked as one, so it can be read as a definition");
  eq(probe.PDXIssueScope.NO_DEF, "No definition on file yet.",
    "issue-scope.js's blank sentence changed and the letterhead's fallback literal did not follow");
  console.log(`      /i/${bare} · "${probe.PDXIssueScope.NO_DEF}"`);
}

// ── 0 MEASURES: THE LOCKED SENTENCE, PRINTED ONCE ───────────────────────────
{
  const w = warmAll(boot({ path: `/i/${EMPTY}` }));
  await arriveAt(w);
  await tick(); await tick();
  w.PDXIssueFile.repaint();
  const head = headOf(w);
  const body = ledgerOf(w);
  const c = w.PDXDoor1.issueCensus(EMPTY);
  must(c && !c.measures, `${EMPTY} now has measures mapped — pick a key with none`);
  no(head, "measure", `the letterhead printed a measures bucket for a key with ${c.measures}`);
  no(head, " 0 ", "the letterhead printed a zero on a key with nothing filed");
  // The menu sentence is the BODY's, and there is exactly one of it on the page.
  const locked = ["No clean vehicle", "No measure on file is mapped to this key yet"]
    .filter((t) => body.indexOf(t) >= 0);
  must(locked.length, `the body's locked empty sentence for ${EMPTY} was reworded`);
  for (const t of locked) {
    eq(body.split(t).length - 1, 1, `the body prints "${t}" more than once`);
    no(head, t, `the letterhead reprinted "${t}" — the body's copy is the one`);
  }
  console.log(`      /i/${EMPTY} · no zero buckets · the empty sentence printed once, in the body`);
}

// ── THE CRUMB IS A DOOR ONTO THE SHELF, AND THE CORE IS STILL NOT A FILE ────
{
  const w = warmAll(boot({ path: `/i/${LKEY}` }));
  await arriveAt(w);
  const ch = String(w.document.getElementById("pdx-issue-file-chrome").innerHTML);
  const crumb = (ch.match(/<p class="pdxif-crumb">[\s\S]*?<\/p>/) || [""])[0];
  must(crumb, "the chrome has no crumb any more");
  // The core half is a control onto the desk. NEVER an anchor at /i/<core>.
  has(crumb, `window.PDXIssueFile.familyJump('${LCORE}')`,
    "the crumb's family half does not open the desk on the core");
  no(crumb, `/i/${LCORE}`, "the crumb links to /i/<core> — an address that refuses to be a file");
  no(crumb, "<a ", "the crumb's family half is an anchor rather than a control");
  // The child half is this file, so it is text: nowhere to go.
  const child = (crumb.match(/<span class="pdxif-child">[\s\S]*?<\/span>/) || [""])[0];
  must(child, "the crumb lost its child half");
  no(child, "onclick", "the crumb's child half offers to navigate to the file it already is");

  // AND IT WORKS: the panel closes, the desk takes the core through its one issue
  // door, and the reader lands on the desk rather than on a file that refuses.
  const asked = [];
  const realDoor = w.pdxDoor1Issue;
  w.pdxDoor1Issue = (k) => { asked.push(k); return realDoor(k); };
  const modes = [];
  const realToDesk = w.PDXDoor1.toDesk;
  w.PDXDoor1.toDesk = function (m) { modes.push(m); return realToDesk.call(w.PDXDoor1, m); };
  eq(w.PDXIssueFile.familyJump(LCORE), false, "the crumb does not answer false, so the control does something else too");
  eq(w.PDXIssueFile.isOpen(), false, "the crumb left the file panel open over the desk it just opened");
  eq(asked.join(","), LCORE, "the crumb did not hand the core to the desk's issue door");
  has(modes.join(","), "issue", "the crumb did not land the reader on the issue desk");

  // …and the file the crumb points AT still refuses to exist, which is the whole
  // reason the crumb is a desk door and not a link.
  eq(w.PDXDoor1.issueProfile(LCORE), "", `${LCORE} grew a single ledger — a family is not a file`);
  eq(w.PDXIssueFile.open(LCORE), false, `the panel opened a family file for ${LCORE}`);
  const b = warmAll(boot({ path: `/i/${LCORE}` }));
  b.__toDesk = 0;
  const rt = b.PDXDoor1.toDesk;
  b.PDXDoor1.toDesk = function (m) { b.__toDesk++; return rt.call(b.PDXDoor1, m); };
  await arriveAt(b);
  eq(b.PDXIssueFile.isOpen(), false, `/i/${LCORE} mounted a file for a family`);
  eq(b.document.getElementById("pdx-issue-file-head"), null,
    `/i/${LCORE} built a letterhead for a family with no census`);
  ok(b.__toDesk > 0, `/i/${LCORE} did not fall back to the desk`);
  eq(b.PDXDoor1.issueCensus(LCORE), null,
    "the desk published a census for a family — a zeroed shape would let the letterhead print a census of nothing");
  eq(String(b.PDXIssueFile._head(LCORE)).indexOf("pdxif-inv"), -1,
    "the letterhead would print an inventory for a family if it were ever asked");
  console.log(`      crumb → the ${LCORE} desk · /i/${LCORE} is not a file, and has no letterhead`);
}

// ── THE SHARE JUMP COPIES THIS FILE'S ADDRESS, FROM THE MODULE THAT OWNS IT ─
{
  const w = boot({ path: `/i/${LKEY}` });
  await arriveAt(w);
  const copied = [];
  const said = [];
  w.navigator = { clipboard: { writeText: (u) => { copied.push(u); return Promise.resolve(); } } };
  w._showToast = (m) => { said.push(String(m)); };
  eq(w.PDXIssueFile.share(LKEY), false, "the share jump does not answer false");
  await tick(); await tick();
  eq(copied.join(","), w.PDXIssueProfile.url(LKEY), "the share jump copied something other than this file's address");
  eq(copied[0], `${ORIGIN}/i/${LKEY}`, "the copied link is not the public address of this file");
  ok(said.length === 1 && said[0].indexOf("copied") >= 0, "the reader was not told the link was copied");
  eq(w.PDXIssueFile.isOpen(), true, "the share jump closed the file it was sharing");

  // NO CLIPBOARD, NO SILENCE. The address is printed in the notice instead, so
  // the answer to the tap is never "nothing happened".
  const dry = boot({ path: `/i/${LKEY}` });
  await arriveAt(dry);
  const toldDry = [];
  dry.navigator = {};
  dry._showToast = (m) => { toldDry.push(String(m)); };
  eq(dry.PDXIssueFile.share(LKEY), false, "the clipboard-less share jump does not answer false");
  eq(toldDry.join(","), `${ORIGIN}/i/${LKEY}`, "a reader with no clipboard was told nothing");
  console.log(`      share → ${ORIGIN}/i/${LKEY} · no clipboard → the address in the notice`);
}

// ── THE DESK JUMP IS THE DESK'S ONE ISSUE DOOR, SCOPED TO THIS KEY ──────────
{
  const w = warmAll(boot({ path: `/i/${LKEY}` }));
  await arriveAt(w);
  const asked = [];
  const realDoor = w.pdxDoor1Issue;
  w.pdxDoor1Issue = (k) => { asked.push(k); return realDoor(k); };
  const modes = [];
  const realToDesk = w.PDXDoor1.toDesk;
  w.PDXDoor1.toDesk = function (m) { modes.push(m); return realToDesk.call(w.PDXDoor1, m); };
  eq(w.PDXIssueFile.deskJump(LKEY), false, "the desk jump does not answer false");
  eq(w.PDXIssueFile.isOpen(), false, "the desk jump left the panel over the desk");
  eq(asked.join(","), LKEY, "the desk jump did not scope the desk to this key");
  has(modes.join(","), "issue", "the desk jump did not land on the issue desk");
  // It does not write the address itself — close() hands /i/ back, exactly as the
  // X does, and the two are indistinguishable from outside.
  ok(w.__replaced.length > 0, "the desk jump left the bar on /i/<key> with no file under it");
  console.log(`      desk jump → pdxDoor1Issue('${LKEY}') → the issue desk · the address went back`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("13 · Opening a slice of the list");
// ── A VIEW OF ONE CENSUS, NOT A SECOND ONE ──────────────────────────────────
// A settled key can file hundreds of people across five direction bands. That is
// a phone book, and the honest fix — let a reader open one slice of it — is also
// the fix most likely to grow a second reading: a filtered BUILD, with its own
// people count, its own band arithmetic and its own idea of what a package is,
// drifting from the desk's build the first time either changed.
//
// So the slice is not a build at all. The builder emits the same string whether
// a chip is pressed or not (every chip paints unpressed), and a DOM pass on the
// tick after the mount hides rows, closes bands whose rows are all hidden, and
// restates each band's own count from a figure stashed on the element. What this
// section pins:
//
//   · the filter row sits ABOVE the bands and its integers are the census's own
//     — direction from PDXDoor1.issueCensus's bands, vehicle from the vehicle
//     read the census already prints as `pkg`, chamber from the roster's own
//     office classifier;
//   · a chip with nothing behind it is not painted at all, which is why a key
//     with no package-only people has no package-only chip to press;
//   · pressing a chip does not change one byte of the builder's output, and the
//     crumb, the letterhead, the desk jump and the share jump are untouched;
//   · the rows STAY IN THE DOM — hidden, so a find-in-page and a deep link still
//     land, and so "everything else is still on file" is literally true;
//   · no party chip, and no sort control of any kind.
{
  // The chips and the row hooks, read back out of the markup the builder painted.
  const chipsOf = (html) =>
    [...String(html).matchAll(/<button[^>]*class="d1-led-chip[^"]*"[^>]*>([\s\S]*?)<\/button>/g)]
      .map((m) => {
        const tag = m[0].slice(0, m[0].indexOf(">") + 1);
        const at = (k) => (tag.match(new RegExp(k + '="([^"]*)"')) || ["", ""])[1];
        return {
          tag,
          kind: at("data-pdx-sl"),
          val: at("data-pdx-sv"),
          pressed: at("aria-pressed"),
          n: Number((m[1].match(/<span class="d1-led-cn">(\d+)<\/span>/) || ["", "0"])[1]),
          label: m[1].replace(/<span class="d1-led-cn">[\s\S]*?<\/span>/, "").trim(),
        };
      });
  const rowsOf = (html) =>
    [...String(html).matchAll(/<li class="d1-led-p"[^>]*>/g)].map((m) => {
      const at = (k) => (m[0].match(new RegExp(k + '="([^"]*)"')) || ["", ""])[1];
      return { band: at("data-pdx-led-band"), veh: at("data-pdx-led-veh"),
               ch: at("data-pdx-led-ch"), nm: at("data-pdx-led-nm") };
    });
  // The filter row runs from its own opening tag to the first band the builder
  // printed, because ledgerHtml emits it immediately before them.
  const rowMarkupOf = (html) => {
    const a = html.indexOf('<div class="d1-led-slice"');
    const ends = ['<section class="d1-led-band', '<details class="d1-led-tail"']
      .map((t) => html.indexOf(t)).filter((i) => i > a);
    return a < 0 || !ends.length ? "" : html.slice(a, Math.min(...ends));
  };

  const w = warmAll(boot({ path: `/i/${LKEY}` }));
  await arriveAt(w);
  await tick(); await tick(); await tick();
  w.PDXIssueFile.repaint();
  const body = ledgerOf(w);
  const c = w.PDXDoor1.issueCensus(LKEY);
  must(c && !c.cold && !c.pending,
    `the record on ${LKEY} never settled in this harness — there is no list to slice`);
  must(c.people > 100, `${LKEY} files ${c.people} people — this section is about a list too long to read`);

  // ── ABOVE THE BANDS, SCOPED TO THIS KEY ───────────────────────────────────
  const atSlice = body.indexOf('<div class="d1-led-slice"');
  const atBand = body.indexOf('<section class="d1-led-band');
  ok(atSlice >= 0, "the ledger paints no filter row at all");
  ok(atBand >= 0, `${LKEY} paints no open band — this section has no list to narrow`);
  ok(atSlice >= 0 && atBand >= 0 && atSlice < atBand,
    "the filter row is painted below the bands it filters");
  has(body, `data-pdx-slice="${LKEY}"`,
    "the filter row is not stamped with the key it belongs to, so a slice could survive the wrong file");
  const rowMarkup = rowMarkupOf(body);
  must(rowMarkup, "the filter row could not be isolated from the markup around it");

  // ── DIRECTION: THE CENSUS'S BANDS, THE CENSUS'S ORDER, THE CENSUS'S COUNTS ─
  const chips = chipsOf(rowMarkup);
  const dir = chips.filter((x) => x.kind === "dir");
  const live = (c.bands || []).filter((b) => b.n > 0);
  eq(dir.map((x) => x.val).join(","), live.map((b) => b.id).join(","),
    "the direction chips are not the census's own bands, in the census's own order");
  for (const b of live) {
    const chip = dir.find((x) => x.val === b.id);
    if (!chip) continue;
    eq(chip.n, b.n, `the ${b.id} chip's count is not the ${b.n} the census published`);
  }
  // The five words the work order names. Short on purpose: the band's own label
  // is a sentence ("A direction, but too little to lean on") and a chip is not.
  eq(dir.map((x) => x.label).join(" · "),
    "Advanced · Cut against · Ran both ways · Too thin · No side",
    "the direction chips are not the five words the work order names");
  // A band the index published with nobody in it gets no chip — an unpressable
  // 0 on a filter row reads as a verdict about the people rather than the record.
  for (const b of (c.bands || [])) {
    if (b.n) continue;
    eq(dir.filter((x) => x.val === b.id).length, 0,
      `the ${b.id} chip was painted with 0 people behind it`);
  }

  // ── VEHICLE: THE SAME TWO INTEGERS THE ROW'S OWN DISCLOSURE READS ─────────
  const veh = chips.filter((x) => x.kind === "veh");
  const P = (c.proc || {}).people || null;
  must(P, "the census publishes no proc.people — the vehicle chips have nothing to agree with");
  // THE WALL THAT MATTERS: package-only is not a fourth test of what a package
  // is. It is `pkg` — the figure the census has printed since the ledger shipped
  // — reached by naming the shape of two integers `_recordVehicleStats` already
  // published, so the two cannot disagree by construction rather than by luck.
  eq(P.package, c.pkg,
    "the vehicle read's package-only count and the census's own pkg figure disagree — there are two package tests");
  must(P.package === 0,
    `${LKEY} now files ${P.package} package-only people — the omit-at-0 branch needs a key with none`);
  eq(veh.filter((x) => x.val === "package").length, 0,
    "the package-only chip was painted on a key with no package-only people");
  eq(veh.map((x) => `${x.val}:${x.n}`).join(","), `primary:${P.primary},mixed:${P.mixed}`,
    "the vehicle chips are not the census's own primary/mixed figures, in the row's order");
  eq(veh.map((x) => x.label).join(" · "), "Primary-only · Mixed",
    "the vehicle chips are not the words the work order names");

  // ── CHAMBER: THE ROSTER'S OWN CLASSIFIER, FOLDED TO THREE ────────────────
  const cham = chips.filter((x) => x.kind === "ch");
  ok(cham.length > 0, "no chamber chips were painted, so window._pdxBrowseType was never reached");
  ok(cham.every((x) => ["senate", "house", "state"].indexOf(x.val) >= 0),
    "a chamber chip was painted for a bucket that is not one of the three");
  eq(cham.map((x) => x.label).join(" · "),
    cham.map((x) => ({ senate: "U.S. Senate", house: "U.S. House", state: "State" })[x.val]).join(" · "),
    "a chamber chip is not labelled with the chamber it filters");
  ok(cham.every((x) => x.n > 0), "a chamber chip was painted with nobody behind it");
  // The three chambers do NOT have to account for everybody, and this asserts the
  // gap rather than papering over it: a ranking-committee title, a governor and
  // an attorney general hold no seat in a chamber, so they answer '' and join no
  // chamber slice. A fourth chip for them would file an executive under a
  // legislature; a chip that silently swept them into "State" would be worse.
  const chamTotal = cham.reduce((n, x) => n + x.n, 0);
  ok(chamTotal > 0 && chamTotal <= c.people,
    `the chamber chips claim ${chamTotal} of ${c.people} people — more than the census filed`);

  // ── THE NAME BOX, AND A CLEAR THAT IS NOT OFFERED BEFORE THERE IS ANYTHING ─
  has(rowMarkup, 'class="d1-led-nm"', "the filter row has no name box");
  has(rowMarkup, `oninput="return window.pdxDoor1Slice('q', this.value)"`,
    "the name box does not hand its own value to the one slice handler");
  has(rowMarkup, 'type="search"', "the name box is not a search input");
  const clr = (rowMarkup.match(/<button[^>]*class="d1-led-clear"[^>]*>/) || [""])[0];
  must(clr, "the filter row has no clear control");
  has(clr, "hidden", "the clear control is offered before anything has been sliced");
  has(rowMarkup, 'class="d1-led-sn" role="status"',
    "the filter row has no live region, so a slice narrows the list in silence");

  // ── NO PARTY. NO SORT. ────────────────────────────────────────────────────
  // Spelled the way the family-door harness spells it: not one pill, not one
  // chip, not one letter used as an axis — and not one control that would reorder
  // a band filed by formal pattern into a ranking by anything else.
  for (const t of ["party", "Party", "fparty", "Republican", "Democrat", "caucus",
                   "sort", "Sort", "order by", "WVA", "Direction Match", "Your Match",
                   "donation", "Donation", "likes", "Likes", "%", "score", "rank"]) {
    no(rowMarkup, t, `the filter row says "${t}" — it slices one census, it does not re-read or re-order it`);
  }
  eq((rowMarkup.match(/data-pdx-sl="([a-z]+)"/g) || [])
    .map((s) => s.slice(13, -1)).filter((v, i, a) => a.indexOf(v) === i).sort().join(","),
    "ch,dir,q,veh", "the filter row offers an axis that is not one of the four the work order names");
  console.log(`      /i/${LKEY} · ${dir.length} direction · ${veh.length} vehicle · ${cham.length} chamber · ` +
    `name box · 0 party · 0 sort`);
}

// ── THE STATE IS STATE, AND THE BUILDER NEVER HEARS ABOUT IT ────────────────
// The load-bearing claim of this whole file is that /i/<key> mounts the string
// the desk builds, byte for byte. A slice implemented as a filtered build would
// break that the moment a chip was pressed — the address would be showing a
// string the desk never painted — so the slice is held OUTSIDE the builder and
// asserted here as byte equality across every combination of the four axes.
{
  const w = warmAll(boot({ path: `/i/${LKEY}` }));
  await arriveAt(w);
  await tick(); await tick(); await tick();
  w.PDXIssueFile.repaint();
  const body0 = ledgerOf(w);
  const head0 = w.PDXIssueFile._head(LKEY);
  const chrome0 = w.PDXIssueFile._chrome(LKEY);
  const built0 = w.PDXDoor1.issueProfile(LKEY);
  eq(body0, built0, "the mounted body is not the builder's string before a chip is touched");
  must(typeof w.PDXDoor1._slice === "function" && typeof w.PDXDoor1._sliceApply === "function",
    "the desk does not publish _slice/_sliceApply — the slice cannot be driven from here");
  must(typeof w.pdxDoor1Slice === "function", "window.pdxDoor1Slice is not published");
  const st = () => JSON.stringify(w.PDXDoor1._slice());
  eq(st(), JSON.stringify({ key: LKEY, dir: "", veh: "", ch: "", q: "" }),
    "the file arrived pre-filtered by something");

  // ONE TAP ON, A SECOND TAP OFF. A filter row with no way back to the whole
  // list is a trap, and the toggle is the way back that costs no extra control.
  eq(w.pdxDoor1Slice("dir", "against"), false, "the chip handler does not answer false, so the tap does something else too");
  eq(w.PDXDoor1._slice().dir, "against", "the direction chip did not take");
  w.pdxDoor1Slice("dir", "against");
  eq(w.PDXDoor1._slice().dir, "", "a second tap on the same chip did not clear it");
  // ONE DIRECTION AT A TIME — the bands are a partition, so two of them is just
  // a shorter way of saying "no direction filter".
  w.pdxDoor1Slice("dir", "against");
  w.pdxDoor1Slice("dir", "advanced");
  eq(w.PDXDoor1._slice().dir, "advanced", "two direction chips were held down at once");
  // …and vehicle, chamber and name COMPOSE with it, trimmed and folded so a
  // reader who types a capital letter is not told there is nobody by that name.
  w.pdxDoor1Slice("veh", "mixed");
  w.pdxDoor1Slice("ch", "house");
  w.pdxDoor1Slice("q", "  CuRTiS  ");
  eq(st(), JSON.stringify({ key: LKEY, dir: "advanced", veh: "mixed", ch: "house", q: "curtis" }),
    "the four axes do not compose into one slice");
  // A KIND THAT IS NOT ONE OF THE FOUR IS REFUSED, not stored. This is the wall
  // against the chip the work order forbids arriving through the handler instead
  // of through the markup.
  const before = st();
  eq(w.pdxDoor1Slice("party", "R"), false, "an unknown filter kind did not answer false");
  eq(w.pdxDoor1Slice("sort", "wva"), false, "an unknown filter kind did not answer false");
  eq(st(), before, "the handler stored an axis it does not offer");
  w.pdxDoor1Slice("clear", "");
  eq(st(), JSON.stringify({ key: LKEY, dir: "", veh: "", ch: "", q: "" }),
    "clearing the slice did not clear all four axes");

  // THE BUILDER'S STRING IS THE SAME STRING, EVERY TIME, UNDER EVERY SLICE.
  const combos = [["dir", "against"], ["veh", "mixed"], ["ch", "senate"], ["q", "curtis"]];
  for (const [k, v] of combos) {
    w.pdxDoor1Slice(k, v);
    eq(w.PDXDoor1.issueProfile(LKEY), built0,
      `the builder's string changed when the ${k} filter was set — the slice reached the builder`);
  }
  eq(w.PDXDoor1.issueProfile(LKEY), built0,
    "the builder's string changed under all four filters at once");
  // …and so are the crumb, the letterhead and the two jumps. The slice is a view
  // of the list; it is not allowed to touch the address, the inventory or either
  // door out of the file.
  eq(w.PDXIssueFile._head(LKEY), head0, "the letterhead changed under a slice");
  eq(w.PDXIssueFile._chrome(LKEY), chrome0, "the crumb changed under a slice");
  has(head0, `window.PDXIssueFile.deskJump('${LKEY}')`, "the desk jump is not on the letterhead this section compared");
  has(head0, `window.PDXIssueFile.share('${LKEY}')`, "the share jump is not on the letterhead this section compared");
  // Every chip is painted UNPRESSED, which is what makes the string above
  // constant: the pressed state is put on by the DOM pass, off the same state the
  // rows are narrowed by, so the chips and the list cannot report two slices.
  eq((built0.match(/aria-pressed="true"/g) || []).length, 0,
    "the builder painted a pressed chip, so its output depends on the slice after all");

  w.pdxDoor1Slice("clear", "");
  console.log(`      the slice is state, not markup · ${combos.length + 1} combinations, ` +
    `${built0.length}B of builder output, unchanged`);
}

// ── A SLICE BELONGS TO ONE KEY, AND IS NOT REMEMBERED ───────────────────────
// Pressing "Cut against" on climate_action and then opening lands_preserve must
// not arrive pre-filtered by a chip the reader pressed on a different issue —
// and the reset is the BUILDER's own, so it happens whichever door mounted the
// next key. Nor is it remembered and restored on the way back: a reader who
// returns to a file they once sliced and finds two thirds of it missing has been
// shown a smaller record without being told.
{
  const w = warmAll(boot({ path: "/" }));
  await tapKey(w, LKEY); await tick(); await tick();
  await tapKey(w, KEY); await tick(); await tick();
  const st = () => JSON.stringify(w.PDXDoor1._slice());
  must(w.PDXDoor1.issueProfile(LKEY) && w.PDXDoor1.issueProfile(KEY),
    "one of the two keys did not build a ledger in this window");
  w.PDXDoor1.issueProfile(LKEY);
  w.pdxDoor1Slice("dir", "against");
  eq(w.PDXDoor1._slice().dir, "against", "the slice did not take on the first key");
  w.PDXDoor1.issueProfile(KEY);
  eq(st(), JSON.stringify({ key: KEY, dir: "", veh: "", ch: "", q: "" }),
    `the ${LKEY} slice survived into ${KEY}`);
  w.PDXDoor1.issueProfile(LKEY);
  eq(st(), JSON.stringify({ key: LKEY, dir: "", veh: "", ch: "", q: "" }),
    `the ${LKEY} slice was remembered and restored on the way back`);
  console.log(`      ${LKEY} → ${KEY} → ${LKEY} · the slice does not travel and is not remembered`);
}

// ── THE VEHICLE CHIPS, ON A KEY THAT HAS ALL THREE AND A KEY THAT HAS ONE ───
// climate_action files nobody as package-only, which is the omit-at-0 branch and
// only half the claim. These two keys are the other half: the chips are painted
// exactly where the census's own figures are non-zero, and the package-only chip
// is `pkg` wherever it appears.
{
  const w = warmAll(boot({ path: "/" }));
  for (const k of ["health_drug_prices", "health_rural"]) {
    await tapKey(w, k);
    await tick(); await tick(); await tick();
    const c = w.PDXDoor1.issueCensus(k);
    must(c && !c.cold && c.people, `${k} did not settle in this harness`);
    const P = (c.proc || {}).people || null;
    must(P, `${k} publishes no proc.people`);
    eq(P.package, c.pkg, `${k}: the vehicle read and the census's pkg figure disagree`);
    const html = w.PDXDoor1.issueProfile(k);
    const want = [["primary", "Primary-only"], ["package", "Package-only"], ["mixed", "Mixed"]]
      .filter(([v]) => P[v] > 0);
    const got = [...html.matchAll(/data-pdx-sl="veh" data-pdx-sv="([a-z]+)"[^>]*>([^<]*)<span class="d1-led-cn">(\d+)</g)]
      .map((m) => [m[1], m[2].trim(), Number(m[3])]);
    eq(got.map((g) => g[0]).join(","), want.map((x) => x[0]).join(","),
      `${k}: the vehicle chips painted are not exactly the non-zero ones`);
    for (const [v, lb] of want) {
      const g = got.find((x) => x[0] === v);
      if (!g) continue;
      eq(g[1], lb, `${k}: the ${v} chip is mislabelled`);
      eq(g[2], P[v], `${k}: the ${v} chip's count is not the census's own`);
    }
    console.log(`      /i/${k} · ${got.map((g) => `${g[1]} ${g[2]}`).join(" · ")}` +
      ` · pkg ${c.pkg}`);
  }
}

// ── THE PASS ITSELF: HIDE, CLOSE, RESTATE, RESTORE ──────────────────────────
// The builder's string is constant, so everything a reader actually sees when
// they press a chip is done by one function over the nodes already in the page.
// This drives that function over a tree built from the ROWS THE BUILDER PAINTED
// — real bands, real vehicle and chamber hooks, real names, in the real order —
// and asserts the four things the work order asks of it: the rows stay in the
// DOM, one band's fold does not open another's, a heading never claims rows the
// reader cannot see, and clearing restores the desk's own wording rather than a
// recomputed second version of it.
{
  const LEDGER_CAP = 24;   // the builder's own per-band preview, read back below
  // A node with just enough of the DOM to be walked by class: the pass uses
  // getElementsByClassName, an element-scoped querySelector, getAttribute and
  // setAttribute, hidden, textContent, value and classList, and nothing else.
  const nd = (cls, attrs, text) => {
    const n = {
      cls: String(cls || "").split(" ").filter(Boolean),
      attrs: Object.assign({}, attrs || {}),
      kids: [], hidden: false, textContent: text == null ? "" : String(text), value: "",
      parentNode: null,
      getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
      setAttribute(k, v) { this.attrs[k] = String(v); },
      add(...kids) { for (const k of kids) if (k) { k.parentNode = this; this.kids.push(k); } return this; },
      walk() { const out = []; const go = (x) => { for (const k of x.kids) { out.push(k); go(k); } }; go(this); return out; },
      is(sel) {
        return sel[0] === "." ? this.cls.indexOf(sel.slice(1)) >= 0
          : sel[0] === "[" ? Object.prototype.hasOwnProperty.call(this.attrs, sel.slice(1, -1))
          : false;
      },
      querySelectorAll(sel) { return this.walk().filter((x) => x.is(sel)); },
      querySelector(sel) { return this.querySelectorAll(sel)[0] || null; },
      getElementsByClassName(c) { return this.walk().filter((x) => x.is("." + c)); },
    };
    n.classList = {
      add(c) { if (n.cls.indexOf(c) < 0) n.cls.push(c); },
      remove(c) { const i = n.cls.indexOf(c); if (i >= 0) n.cls.splice(i, 1); },
      contains(c) { return n.cls.indexOf(c) >= 0; },
      toggle(c, on) { if (on) this.add(c); else this.remove(c); },
    };
    return n;
  };

  const w = warmAll(boot({ path: `/i/${LKEY}` }));
  await arriveAt(w);
  await tick(); await tick(); await tick();
  w.PDXIssueFile.repaint();
  const body = ledgerOf(w);
  const c = w.PDXDoor1.issueCensus(LKEY);
  must(c && !c.cold, `${LKEY} did not settle`);

  // The rows, and the fold they were painted inside, read back out of the markup.
  const rows = [...body.matchAll(/<li class="d1-led-p"[^>]*>/g)].map((m) => {
    const at = (k) => (m[0].match(new RegExp(k + '="([^"]*)"')) || ["", ""])[1];
    return { band: at("data-pdx-led-band"), veh: at("data-pdx-led-veh"),
             ch: at("data-pdx-led-ch"), nm: at("data-pdx-led-nm") };
  });
  eq(rows.length, c.people, "the painted rows are not the census's own people count");
  ok(rows.every((r) => r.band && r.nm), "a painted row is missing its band or its name hook");
  // Which bands the builder folded into the tail, taken from the markup rather
  // than assumed: the tail runs from its own tag to the measures section.
  const tailAt = body.indexOf('<details class="d1-led-tail"');
  const measAt = body.indexOf('<section class="d1-led-meas"');
  must(tailAt > 0 && measAt > tailAt, "the ledger has no folded tail before the measures section");
  const tailMarkup = body.slice(tailAt, measAt);
  const tailIds = (c.bands || []).map((b) => b.id)
    .filter((id) => tailMarkup.indexOf(`d1-led-band is-${id}`) >= 0);
  must(tailIds.length, "no band was found inside the folded tail");

  // The tree: the filter row, then one section per band in the census's order,
  // each with its heading count, its preview and its own fold over the rest.
  const root = nd("host");
  const box = nd("d1-led-slice", { "data-pdx-slice": LKEY });
  const chipNodes = [];
  for (const [kind, vals] of [["dir", (c.bands || []).filter((b) => b.n).map((b) => b.id)],
                              ["veh", ["primary", "mixed"]], ["ch", ["senate", "house", "state"]]]) {
    for (const v of vals) {
      const chip = nd("d1-led-chip", { "data-pdx-sl": kind, "data-pdx-sv": v, "aria-pressed": "false" });
      chipNodes.push(chip);
      box.add(chip);
    }
  }
  const nameBox = nd("d1-led-nm", { "data-pdx-sl": "q" });
  const clearBtn = nd("d1-led-clear");
  clearBtn.hidden = true;
  const sayNode = nd("d1-led-sn");
  box.add(nameBox, clearBtn, sayNode);
  root.add(box);
  const secs = {}, bns = {}, mores = {}, msums = {};
  const tail = nd("d1-led-tail");
  for (const b of (c.bands || [])) {
    if (!b.n) continue;
    const mine = rows.filter((r) => r.band === b.id);
    const sec = nd(`d1-led-band is-${b.id}`);
    const bn = nd("d1-led-bn", null, String(mine.length));
    sec.add(nd("d1-led-bh").add(nd("d1-led-bt", null, b.lb), bn));
    const li = (r) => nd("d1-led-p", { "data-pdx-led-band": r.band, "data-pdx-led-veh": r.veh,
                                       "data-pdx-led-ch": r.ch, "data-pdx-led-nm": r.nm });
    const list = nd("d1-led-people");
    mine.slice(0, LEDGER_CAP).forEach((r) => list.add(li(r)));
    sec.add(list);
    const rest = mine.slice(LEDGER_CAP);
    if (rest.length) {
      const msum = nd("d1-led-msum", null, `${rest.length} more in this band — same reading, same order`);
      const more = nd("d1-led-more").add(msum);
      const inner = nd("d1-led-people");
      rest.forEach((r) => inner.add(li(r)));
      more.add(inner);
      sec.add(more);
      mores[b.id] = more; msums[b.id] = msum;
    }
    secs[b.id] = sec; bns[b.id] = bn;
    if (tailIds.indexOf(b.id) >= 0) tail.add(sec); else root.add(sec);
  }
  root.add(tail);
  const allRows = root.querySelectorAll(".d1-led-p");
  eq(allRows.length, rows.length, "the tree this section drives does not hold every painted row");
  // The pass does not sweep the document: it names the two hosts the builder's
  // string is ever mounted in and starts inside whichever one this page has. So
  // the one thing stubbed is getElementById for the file panel's own ledger id,
  // which is the host /i/<key> mounts into — everything else still answers from
  // the real registry, including the desk's body, which this tree is not in.
  const realGet = w.document.getElementById;
  w.document.getElementById = (id) =>
    (id === "pdx-issue-file-ledger" ? root : realGet.call(w.document, id));
  ok(String(DESK).indexOf("'pdx-issue-file-ledger'") >= 0,
    "the desk no longer names the file panel's ledger as a mount for the slice pass");
  const shown = () => allRows.filter((r) => !r.hidden);
  const apply = () => { w.PDXDoor1._sliceApply(); };
  const nOf = (f) => rows.filter(f).length;

  // ── NO SLICE: NOTHING HIDDEN, NOTHING RESTATED, NOTHING SAID ──────────────
  w.pdxDoor1Slice("clear", "");
  apply();
  eq(shown().length, rows.length, "the pass hid rows with no slice active");
  eq(Object.keys(secs).filter((id) => secs[id].hidden).join(","), "",
    "the pass closed a band with no slice active");
  eq(sayNode.textContent, "", "the live region announced a slice that is not on");
  eq(clearBtn.hidden, true, "the clear control is offered with nothing to clear");
  eq(chipNodes.filter((x) => x.getAttribute("aria-pressed") === "true").length, 0,
    "a chip reads as pressed with no slice active");
  const bn0 = Object.keys(bns).map((id) => `${id}:${bns[id].textContent}`).join(",");
  eq(bn0, (c.bands || []).filter((b) => b.n).map((b) => `${b.id}:${b.n}`).join(","),
    "a band heading does not carry the census's own count before anything is sliced");

  // ── ONE DIRECTION: THE OTHERS COLLAPSE IN PLACE, THE ROWS STAY IN THE DOM ─
  w.pdxDoor1Slice("dir", "against");
  apply();
  eq(shown().length, nOf((r) => r.band === "against"),
    "a direction slice does not show exactly that band's rows");
  ok(shown().every((r) => r.getAttribute("data-pdx-led-band") === "against"),
    "a row from another band survived the direction slice");
  eq(root.querySelectorAll(".d1-led-p").length, rows.length,
    "rows LEFT THE DOM instead of being hidden — a find-in-page and a deep link would miss them");
  for (const id of Object.keys(secs)) {
    eq(secs[id].hidden, id !== "against",
      `the ${id} band ${id === "against" ? "closed under its own slice" : "stayed open with nothing in it"}`);
  }
  // The fold over the thin end closes too, because every band inside it did.
  eq(tail.hidden, true, "the folded tail stayed open with no live band inside it");
  // EXPANDING ONE BAND DOES NOT EXPAND THE OTHERS: each fold is decided by its
  // own live rows, and a fold with nothing live in it closes rather than
  // offering a reader a control onto an empty list.
  for (const id of Object.keys(mores)) {
    eq(mores[id].hidden, id !== "against",
      `the ${id} band's fold ${id === "against" ? "closed under its own slice" : "stayed open with nothing in it"}`);
  }
  eq(sayNode.textContent,
    `Cut against — ${nOf((r) => r.band === "against")} of ${rows.length} rows shown. Everything else is still on file.`,
    "the live region does not say what was sliced, how much is shown, and that the rest is still on file");
  eq(clearBtn.hidden, false, "the clear control is still hidden under a live slice");
  const on = chipNodes.filter((x) => x.getAttribute("aria-pressed") === "true");
  eq(on.length, 1, "the pressed chips do not match the one live axis");
  eq(on[0].getAttribute("data-pdx-sv"), "against", "the wrong chip reads as pressed");
  ok(on[0].classList.contains("is-on"), "the pressed chip did not take its own class");

  // ── COMPOSED: DIRECTION + VEHICLE + CHAMBER + NAME ────────────────────────
  w.pdxDoor1Slice("veh", "mixed");
  w.pdxDoor1Slice("ch", "house");
  apply();
  const want = (r) => r.band === "against" && r.veh === "mixed" && r.ch === "house";
  eq(shown().length, nOf(want), "the three axes do not narrow the list together");
  ok(nOf(want) < nOf((r) => r.band === "against"),
    "the composed slice is not narrower than the direction alone — this claim has nothing to check");
  // A heading never claims rows the reader cannot see.
  eq(bns.against.textContent, String(nOf(want)),
    "the band heading still claims the whole band under a composed slice");
  // …and so does its fold, which counts the rows still live INSIDE it rather
  // than the whole remainder the builder printed. Computed here from the row
  // list and the builder's own preview cap, so this is not the pass checking
  // its own arithmetic.
  const againstRows = rows.filter((r) => r.band === "against");
  const inFold = againstRows.slice(LEDGER_CAP).filter(want).length;
  ok(inFold > 0, "the composed slice left nothing in the fold — this claim has nothing to check");
  eq(msums.against.textContent, `${inFold} more in this band — same reading, same order`,
    "the band's fold still counts rows the slice hid");
  eq(againstRows.slice(0, LEDGER_CAP).filter(want).length + inFold, nOf(want),
    "the preview and the fold do not account for every row the slice left live");
  // …and the name filter is a substring of the painted name, nothing cleverer.
  const nm = shown()[0].getAttribute("data-pdx-led-nm").split(" ").pop();
  w.pdxDoor1Slice("q", nm.toUpperCase());
  apply();
  eq(shown().length, nOf((r) => want(r) && r.nm.indexOf(nm) >= 0),
    "the name filter is not a plain substring of the painted name");
  ok(shown().length > 0, `the name filter on "${nm}" emptied a slice it was taken from`);
  has(sayNode.textContent, `name contains “${nm}”`,
    "the live region does not name the string it filtered on");
  eq(nameBox.value, nm, "the name box was not synced to the live filter");

  // ── CLEARING RESTORES THE DESK'S OWN WORDING, NOT A RECOMPUTED ONE ────────
  w.pdxDoor1Slice("clear", "");
  apply();
  eq(shown().length, rows.length, "clearing the slice did not bring every row back");
  eq(Object.keys(bns).map((id) => `${id}:${bns[id].textContent}`).join(","), bn0,
    "clearing the slice did not restore the band headings the builder printed");
  eq(sayNode.textContent, "", "the live region still announces a slice that was cleared");
  eq(clearBtn.hidden, true, "the clear control is still offered after clearing");
  eq(chipNodes.filter((x) => x.getAttribute("aria-pressed") === "true").length, 0,
    "a chip still reads as pressed after clearing");
  eq(Object.keys(secs).filter((id) => secs[id].hidden).join(","), "",
    "a band stayed closed after clearing");
  eq(tail.hidden, false, "the folded tail stayed closed after clearing");
  console.log(`      ${rows.length} rows · one band → ${nOf((r) => r.band === "against")} · ` +
    `+ vehicle + chamber → ${nOf(want)} · rows never left the DOM · headings restored`);
}

// ── THE SOURCES ARE THE SHIPPED ONES, AND "OPEN THE ACTS" STILL OPENS ───────
// Every axis on the filter row is a field somebody else already published. This
// asserts that at the source, because a filter that quietly grew its own reader
// of the record would agree with the census today and drift tomorrow.
{
  const HUB = R("compare-hub.js");
  const CODE = DESK.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, "");
  // CHAMBER: the roster's own office classifier, exported for exactly this.
  has(HUB, "window._pdxBrowseType = _classifyBrowseType;",
    "compare-hub.js no longer publishes _pdxBrowseType — the chamber chips have no classifier to ask");
  has(CODE, "window._pdxBrowseType",
    "the desk no longer asks the roster's classifier which chamber a person sits in");
  has(HTML, "compare-hub.js",
    "index.html no longer loads compare-hub.js, so the chamber chips would find no classifier on the real page");
  // …and the fold is a fixed table of that classifier's OWN bucket names, with
  // no office text read anywhere in it. An office string lowercased and
  // substring-tested here would be the second copy of that doctrine — the exact
  // thing the export exists to prevent — so the block is isolated and swept.
  const cham = CODE.slice(CODE.indexOf("var _CHAMBER"), CODE.indexOf("function crossRead"));
  must(cham.length > 100, "the chamber read could not be isolated from the desk's source");
  for (const t of ["office", "toLowerCase", "indexOf(", "u.s.", "attorney general", "school board"]) {
    no(cham.toLowerCase(), t.toLowerCase(),
      `the chamber read looks at office text itself ("${t}") instead of folding _pdxBrowseType's buckets`);
  }
  // VEHICLE: the two integers _recordVehicleStats published, named — not a
  // fourth test of what a package is. The block reads standalone/provision and
  // nothing else on that object, and no threshold of its own.
  const vehSrc = CODE.slice(CODE.indexOf("function vehClassOf"), CODE.indexOf("var _CHAMBER"));
  must(vehSrc.length > 100, "the vehicle class could not be isolated from the desk's source");
  has(vehSrc, "v.standalone", "the vehicle class no longer reads the published standalone count");
  has(vehSrc, "v.provision", "the vehicle class no longer reads the published provision count");
  for (const t of ["_rdIsProvision", "isProvision", "stowaway", "threshold", "_RD_NARROW_AT",
                   "share", "issues", "total"]) {
    no(vehSrc, t, `the vehicle class re-derives what a package is ("${t}") instead of naming the shape of two published integers`);
  }
  // DIRECTION: the formal index's own band ids, and one census.
  has(CODE, "SLICE_DIR", "the direction chips no longer come from one table of the index's band ids");
  eq((CODE.match(/function issueCensus/g) || []).length, 1,
    "there is more than one census function in the desk");
  // NO SECOND SORT. The slice hides rows; it never reorders them, which is why
  // there is no comparator anywhere in it.
  const slice = CODE.slice(CODE.indexOf("function sliceCounts"), CODE.indexOf("function issueLedger"));
  must(slice.length > 500, "the slice block could not be isolated from the desk's source");
  for (const t of [".sort(", "reverse(", "localeCompare", "buildRanking", "PDXWordAction",
                   "directionMatch", "Math.round", "%"]) {
    no(slice, t, `the slice re-orders or re-reads the list ("${t}") instead of hiding rows`);
  }
  // AND IT NEVER SWEEPS THE DOCUMENT. The desk owns four surfaces and collapses
  // nothing else, so it is not allowed to reach the page by selector; the pass
  // names the two hosts the one builder's string is ever mounted in — the desk's
  // own body and this file panel's ledger — and walks inside whichever of them
  // this page has. The wall is scripts/test-door-one-collapse.mjs's and it holds
  // over the whole file; it is re-asserted here, on the slice's own region,
  // because the slice is the code that had a reason to want an exception to it.
  no(slice, "querySelectorAll", "the slice pass sweeps the document by selector");
  no(slice, "document.querySelector(", "the slice pass selects a surface the desk has not named");
  has(slice, "SLICE_HOSTS", "the slice pass no longer names the hosts it walks inside");
  has(slice, "[BODY_ID, 'pdx-issue-file-ledger']",
    "the slice pass no longer names the desk's own body and the file panel's ledger as its two mounts");
  has(CODE, "var BODY_ID = 'pdx-d1-body'",
    "the desk's body id is no longer the constant the slice pass walks inside");

  // AND THE ROW'S ONE DOOR IS UNTOUCHED: the four filter hooks were added to the
  // <li> the dossier gateway already lived on, so a sliced list still opens the
  // same dossier on the same key through the same shipped control.
  const w = warmAll(boot({ path: `/i/${LKEY}` }));
  await arriveAt(w);
  await tick(); await tick(); await tick();
  w.PDXIssueFile.repaint();
  const body = ledgerOf(w);
  const li = (body.match(/<li class="d1-led-p"[^>]*>[\s\S]*?<\/li>/) || [""])[0];
  must(li, "no row could be read back out of the painted ledger");
  for (const t in { "data-pdx-led-band": 1, "data-pdx-led-veh": 1, "data-pdx-led-ch": 1, "data-pdx-led-nm": 1 }) {
    has(li, t, `the row is missing the ${t} hook the filter row reads`);
  }
  has(li, "pdxst-open", "the row lost the shipped dossier gateway");
  has(li, `data-pdxst-dos="${LKEY}"`, "the row's dossier control is no longer scoped to this key");
  has(li, "Open the acts", "the row lost its own door onto the acts behind the reading");
  has(li, 'data-pdxst-focus="record"', "the dossier no longer lands on the record column");
  // The hooks are attributes on the row, not a class the stylesheet could hide:
  // the pass sets `hidden`, and only these four rules act on it.
  const CSS = R("door1-workspace.css");
  has(CSS, ".d1-led-p[hidden], .d1-led-band[hidden], .d1-led-tail[hidden], .d1-led-more[hidden] {",
    "the stylesheet has no rule that actually hides a sliced row");
  has(CSS, ".d1-led-chip", "the stylesheet has no chip rule, so the filter row would paint unstyled");
  console.log("      chamber ← _pdxBrowseType · vehicle ← standalone/provision · direction ← the index's bands · " +
    "1 census · 0 comparators · 2 named hosts, 0 document sweeps · Open the acts intact");
}

// ═════════════════════════════════════════════════════════════════════════════
section("14 · How this issue was tested");
// ── A PROCESS LINE, NOT A NEW SCORE ─────────────────────────────────────────
// The inventory says how MUCH is filed under a key. It does not say how the
// issue MOVED — whether the chamber ever voted on it as itself, whether it only
// ever rode inside something larger, whether the only thing on file was floor
// machinery. That gap is where a reader supplies their own answer, and the
// answers readers supply are the ones this project refuses to publish: somebody
// snuck it in, somebody obstructed it, somebody scheduled it to fail.
//
// So the block says what is on file and stops. Counts and named measures only,
// every figure lifted from PDXDoor1.issueCensus's own `proc` — one more field on
// the census the desk already computed, never a second read — and the same busy
// gate as the inventory above it, because a process line published while the
// roll-call read is still out is a claim about a record we have not finished
// looking at. What this section pins:
//
//   · the three measure figures PARTITION the measure total — each measure is in
//     exactly one of them — which is what lets each figure be a door to a band;
//   · a sponsorship is never called a vote;
//   · the locked menu sentence is quoted from PDXConsistency.menu, in the
//     menu's own order, and only where it applies;
//   · "See the measures" jumps to the measure list the ledger already prints
//     rather than duplicating one card of it;
//   · no percentage, no Direction Match, no inferred stance, and nothing the
//     menu's own wall scanner objects to.
{
  const w = warmAll(boot({ path: `/i/${LKEY}` }));
  await arriveAt(w);
  await tick(); await tick(); await tick();
  w.PDXIssueFile.repaint();
  const head = headOf(w);
  const body = ledgerOf(w);
  const c = w.PDXDoor1.issueCensus(LKEY);
  must(c && !c.cold && !c.pending, `${LKEY} never settled — the process block cannot be reached`);
  const pr = c.proc || null;
  must(pr, "the census publishes no `proc` — the letterhead has nothing to print and would have to count");
  must(typeof w.PDXIssueFile._proc === "function", "issue-file.js does not publish _proc()");
  const blk = (head.match(/<div class="pdxif-proc">[\s\S]*?<\/div>(?=<p class="pdxif-jumps">)/) || [""])[0];
  must(blk, "there is no process block on the letterhead at all");
  // UNDER THE INVENTORY, ABOVE THE JUMPS — the order the work order names.
  ok(head.indexOf('class="pdxif-inv"') < head.indexOf('class="pdxif-proc"'),
    "the process block was printed above the inventory it elaborates");
  ok(head.indexOf('class="pdxif-proc"') < head.indexOf('class="pdxif-jumps"'),
    "the process block was printed below the two jumps");
  has(blk, "How this issue was tested", "the process block has no heading saying what it is");

  // ── THE MEASURES LINE IS THE CENSUS'S OWN THREE FIGURES ───────────────────
  // The people, acts and stances rows are plain text; the measures row is three
  // figures that are also doors, so it is read with the tags stripped rather than
  // by refusing to match anything containing a tag.
  const rowOf = (lb) => {
    const m = blk.match(new RegExp(`<span class="pdxif-plb">${lb}</span><span class="pdxif-pv">([\\s\\S]*?)</span></p>`));
    return m ? m[1] : "";
  };
  const flat = (t) => String(t).replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  const M = pr.measures || {};
  const mRaw = rowOf("Measures");
  must(mRaw, "there is no measures row in the process block");
  const mLine = flat(mRaw);
  const BANDS = M.bands || [];
  must(BANDS.length > 1, `${LKEY} files measures in one band only — this section needs a key with more`);
  const wantM = BANDS.filter((b) => b.n).map((b) => `${b.n} ${b.lb}`).join(" · ");
  eq(mLine, wantM, "the measures line is not the census's own per-band figures");
  // THE THREE FIGURES PARTITION THE TOTAL. This is stronger than the split it
  // replaced: every measure the inventory counted is in exactly one band, which
  // is what lets each figure be a door — a figure that jumped to a band holding
  // a different number of cards would be a count of nothing a reader can check.
  eq(M.primary + M.provision + M.procedural, c.measures,
    "the three band figures do not account for every measure the census mapped to this key");
  eq(M.total, c.measures, "the process block counted a different number of measures than the inventory");
  eq(BANDS.reduce((n, b) => n + b.n, 0), M.total,
    "the published bands do not hold every measure the process block counted");
  ok(M.procedural <= M.total, "more measures were called procedural than exist");
  // AND THE SUM IS SAID OUT LOUD, because three figures printed over a fourth are
  // read as arithmetic somebody got wrong unless the note says which way it goes.
  has(blk, "they add up to the number of measures mapped here",
    "the note does not say the three measure figures sum to the total");
  has(blk, "each measure is in exactly one of them",
    "the note does not say the three bands are a partition, so a reader cannot check any of them");
  no(blk, "procedural counts the same measures again",
    "the note still describes the old overlapping figures, which now partition");

  // ── THE PEOPLE LINE, AND THE ZEROES DROPPED ───────────────────────────────
  const P = pr.people || {};
  const pLine = rowOf("People");
  const wantP = [["primary", "primary-only"], ["package", "package-only"], ["mixed", "mixed"]]
    .filter(([k]) => P[k] > 0).map(([k, lb]) => `${P[k]} ${lb}`).join(" · ");
  eq(pLine, wantP, "the people line is not the census's own vehicle figures with the zeroes dropped");
  must(P.package === 0, `${LKEY} now files package-only people — the omit-at-0 branch needs a key with none`);
  no(pLine, "package-only", "the people line printed a 0 bucket instead of dropping it");
  no(pLine, " 0 ", "the people line printed a zero");
  // AND THE TWO LINES ARE ALLOWED TO DISAGREE, because they answer different
  // questions — the label on the bill, and the shape of one person's own acts.
  // A reader not told that reads the disagreement as an error, so the note says it.
  has(blk, "The people line asks a different question",
    "the note does not distinguish the measure label from the shape of a person's own acts");

  // ── ACTS: NAMED IN stance-helpers' OWN WORDS, AND A SPONSOR IS NOT A VOTE ─
  const A = pr.acts || [];
  const aLine = rowOf("Acts");
  const CLS = w._PDX_ACT_CLASSES || null;
  must(CLS && CLS.floor && CLS.sponsor, "_PDX_ACT_CLASSES is not published — the acts line would have to invent nouns");
  eq(aLine, A.map((a) => a.lb).join(" · "), "the acts line is not the census's own pre-worded act counts");
  ok(A.length > 0, `${LKEY} has no acts on file — this claim has nothing to check`);
  ok(A.every((a) => ["floor", "committee_vote", "sponsor"].indexOf(a.k) >= 0),
    "the acts line counted an act class the work order does not name");
  for (const a of A) {
    const cls = CLS[a.k];
    eq(a.lb, `${a.n} ${a.n === 1 ? cls.one : cls.many}`,
      `the ${a.k} count is not worded from stance-helpers' own act class`);
  }
  // A SPONSORSHIP IS NEVER CALLED A VOTE. Asserted on the vocabulary rather than
  // on today's data: the noun for a lead sponsorship must not contain "vote",
  // and the acts line must never put the two words together.
  no(String(CLS.sponsor.one) + String(CLS.sponsor.many), "vote",
    "stance-helpers now calls a lead sponsorship a vote");
  no(aLine, "sponsor vote", "the acts line called a sponsorship a vote");
  no(aLine, "sponsorship vote", "the acts line called a sponsorship a vote");

  // ── THE OPTIONAL LAST LINE: COUNTS, NEVER A SHARE ─────────────────────────
  const S = pr.stances || {};
  const sLine = rowOf("Stances");
  ok(S.said > 0, `${LKEY} holds no sourced stances — this claim has nothing to check`);
  has(sLine, `${S.said} sourced stance`, "the stances line is not the census's own sourced-stance count");
  if (S.crossed) {
    has(sLine, `${S.crossed} whose formal row runs the other way`,
      "the stances line does not say how many formal rows run against the words");
  }
  no(sLine, "%", "the stances line printed a share");
  no(sLine, "of ", "the stances line printed a denominator, which is a percentage in words");

  // ── COUNTS ONLY, AND NOTHING THE MENU'S OWN WALL OBJECTS TO ───────────────
  no(blk, "%", "there is a percentage in the process block");
  for (const t of ["Direction Match", "consistency", "backs up their words", "ranked",
                   "Republican", "Democrat", "party", "snuck", "obstructed", "blocked",
                   "refused to schedule", "buried", "score", "Add to team"]) {
    no(blk, t, `the process block says "${t}" — it is a count of what is on file, not a verdict`);
  }
  // The menu module's own scanner, run over the block: it holds the phrasing wall
  // for this whole subject, so a sentence it objects to is one this block may not
  // print regardless of what the list above happens to name.
  const MENU = w.PDXConsistency && w.PDXConsistency.menu;
  must(MENU && typeof MENU.scan === "function", "PDXConsistency.menu.scan is not published");
  eq(JSON.stringify(MENU.scan(blk)), "[]",
    `the menu's own wall scanner objects to the process block: ${JSON.stringify(MENU.scan(blk))}`);
  // No inferred stance: the block never says what anybody's position IS.
  for (const t of ["supports", "opposes", "in favour", "in favor", "against it"]) {
    no(blk, t, `the process block reads a position ("${t}") off a count`);
  }

  // ── "SEE THE MEASURES" JUMPS TO THE ONE LIST, AND DOES NOT COPY IT ────────
  must(M.id, "the census publishes no anchor for the measure list");
  has(blk, `window.PDXIssueFile.seeMeasures('${M.id}')`,
    "the process block does not offer a jump to the measure list the ledger already prints");
  has(body, `id="${M.id}"`, "the ledger's measure list does not wear the anchor the census published");
  eq((body.match(new RegExp(`id="${M.id}"`, "g")) || []).length, 1,
    "the measure anchor appears more than once on the page");
  // …AND SO DOES EACH FIGURE, TO ITS OWN BAND. Same rule as the section anchor:
  // published by the desk, never spelled here, on the page exactly once, and the
  // count on the letterhead is the count on the heading it lands on.
  for (const b of BANDS) {
    must(b.at, `the census publishes no anchor for the ${b.id} band`);
    has(blk, `window.PDXIssueFile.seeMeasures('${b.at}')`,
      `the ${b.id} figure on the letterhead is not a door to the ${b.id} band`);
    has(blk, esc(`See the ${b.n} ${b.lb} measures on the list below`),
      `the ${b.id} figure does not say where it goes to somebody who cannot see it`);
    eq((body.match(new RegExp(`id="${b.at}"`, "g")) || []).length, 1,
      `the ${b.id} band's anchor is not on the ledger exactly once`);
    const sec = (body.match(new RegExp(`<section class="d1-led-mband is-${b.id}" id="${b.at}">[\\s\\S]*?<div class="d1-led-bh">[\\s\\S]*?<span class="d1-led-bn">(\\d+)</span>`)) || [])[1];
    eq(Number(sec), b.n, `the ${b.id} band's own heading counts a different number than the letterhead sent a reader to find`);
  }
  // …and the block does not reprint one measure card: no number, no title, no
  // PRIMARY pill. Naming a measure here would be a second measure list.
  for (const t of ["H.R. ", "H.J.Res", "S. ", "d1-led-b", "Who voted on it"]) {
    no(blk, t, `the process block reprints the measure list ("${t}") instead of jumping to it`);
  }
  // The jump is a control, and it lands: a missing anchor is a no-op, never a
  // thrown error over a reader's tap.
  const scrolled = [];
  const real = w.document.getElementById;
  w.document.getElementById = (id) => {
    if (id === M.id) return { scrollIntoView: (o) => scrolled.push(`${id}:${o && o.block}`) };
    return real.call(w.document, id);
  };
  eq(w.PDXIssueFile.seeMeasures(M.id), false, "the see-the-measures jump does not answer false");
  eq(scrolled.join(","), `${M.id}:start`, "the jump did not scroll the measure list into view");
  eq(w.PDXIssueFile.seeMeasures("d1-led-meas-not_a_key"), false,
    "the jump throws rather than answering false on an anchor that is not on the page");
  w.document.getElementById = real;
  console.log(`      /i/${LKEY} · ${mLine} · ${pLine} · ${aLine} · ${sLine}`);
}

// ── THE BUSY GATE, ON THE PROCESS BLOCK TOO ─────────────────────────────────
// Same rule as the inventory, asserted the same way: not one integer while the
// ledger below is still saying it is reading. A measure total is the figure most
// tempting to publish early because it does not move with the roll-call read —
// and publishing it early is exactly how a reader learns to trust a number that
// was not ready.
{
  const w = boot({ path: `/i/${LKEY}` });   // NOT settled: the field stays out
  await arriveAt(w);
  const head = headOf(w);
  has(ledgerOf(w), "Reading the full record for", "the ledger dropped its own honesty line");
  has(head, "Reading the record on this key", "the letterhead published while the read was out");
  no(head, "pdxif-proc", "the process block printed under a live read");
  no(head, "How this issue was tested", "the process heading printed under a live read");
  no(head, "PRIMARY", "the letterhead published a measure label while the read was out");
  const figures = (head.replace(/<[^>]*>/g, " ").match(/\d+/g) || []);
  eq(figures.join(","), "", `the letterhead published figures (${figures.join(", ")}) while the read was out`);
  // …and it appears on the same paint the inventory does, off one repaint.
  warmAll(w);
  w.PDXDoor1.sync();
  await tick(); await tick(); await tick();
  w.PDXIssueFile.repaint();
  const head2 = headOf(w);
  has(head2, "people with a readable row", "the inventory never appeared once the read was done");
  has(head2, "How this issue was tested", "the process block never appeared once the read was done");
  has(head2, "See the measures", "the jump to the measure list never appeared");
  console.log("      cold: 0 figures, no process block · settled: inventory and process line on one paint");
}

// ── THE LOCKED MENU SENTENCE, WHERE IT APPLIES AND ONLY THERE ───────────────
// One of PDXConsistency.menu's three phrases is true of a whole key today, and
// it is quoted rather than written: the module owns this vocabulary because it
// is the wording most likely to slide into blame. The other two stay wired and
// silent, for two different reasons, and both silences are asserted below —
// no_vehicle because nothing on this page holds a denominator of what a chamber
// declined to schedule, and procedural_gate because no key in the record we hold
// actually meets it.
//
//   THE PROCEDURAL GATE GOT STRICTER, AND WENT QUIET. It used to fire when every
// measure on a key carried A procedural act, and stock_trading_ban was the key
// that proved it: one measure, H.R. 7008, with 37 procedural acts on file — and
// 179 substantive ones. The letterhead told a reader "what came up here was
// floor machinery rather than a vote on the substance" about a bill the chamber
// had voted on the substance of, 179 times. The measure bands made that visible
// (a band that claimed H.R. 7008 would hold a card whose own voters had voted on
// the thing), and the tally the sentence reads now asks what it says: every act
// on file for the measure was machinery. Nothing meets that on today's record,
// so the sentence prints nowhere and the wall below asserts the silence rather
// than deleting the phrase.
{
  const w = warmAll(boot({ path: "/" }));
  const MENU = w.PDXConsistency.menu;
  const seen = {};
  // A key whose every mapped measure was a provision.
  for (const [k, want] of [["health_drug_prices", "provision_only"]]) {
    await tapKey(w, k);
    await tick(); await tick(); await tick();
    const c = w.PDXDoor1.issueCensus(k);
    must(c && !c.cold && c.people, `${k} did not settle in this harness`);
    const m = (c.proc || {}).menu || null;
    must(m, `${k} no longer triggers a menu sentence — this branch needs a key that does`);
    eq(m.key, want, `${k} triggers the wrong menu phrase`);
    seen[m.key] = 1;
    // VERBATIM FROM THE MODULE. Not paraphrased, not shortened, not re-toned.
    const say = MENU.say(m.key);
    must(say && say.lb, `PDXConsistency.menu.say('${m.key}') no longer answers`);
    eq(m.lb, say.lb, `${k}'s menu label is not the module's own`);
    eq(m.note, say.note, `${k}'s menu note is not the module's own`);
    ok((MENU.ORDER || []).indexOf(m.key) >= 0, `${k}'s menu phrase is not one the module orders`);
    // …and it prints on the letterhead, marked as the locked sentence it is.
    const blk = String(w.PDXIssueFile._proc(c));
    has(blk, "pdxif-pmenu", `${k}'s letterhead does not mark the menu sentence as one`);
    has(blk, esc(say.lb), `${k}'s letterhead does not print the module's own label`);
    has(blk, esc(say.note), `${k}'s letterhead does not print the module's own note`);
    eq(JSON.stringify(MENU.scan(blk)), "[]", `${k}'s process block trips the menu's own wall`);
    console.log(`      /i/${k} · "${say.lb}"`);
  }
  eq(Object.keys(seen).sort().join(","), "provision_only",
    "the one menu phrase a whole key triggers today was not reached");
  // ── AND THE PHRASE THAT WENT QUIET IS QUIET FOR A CHECKABLE REASON ────────
  // Not deleted, not paraphrased, not loosened back: still in the module, still
  // ordered, still reachable from the desk — and printed on no key, because the
  // key it used to print on holds substantive votes.
  const gate = MENU.say("procedural_gate");
  must(gate && gate.lb, "PDXConsistency.menu no longer holds the procedural-gate phrase");
  ok((MENU.ORDER || []).indexOf("procedural_gate") >= 0,
    "the procedural-gate phrase was dropped from the menu's order instead of going quiet");
  has(gate.note, "rather than a vote on the substance",
    "the procedural-gate phrase no longer claims what the tally below gates on");
  {
    const GK = "stock_trading_ban";
    await tapKey(w, GK);
    await tick(); await tick(); await tick();
    const gc = w.PDXDoor1.issueCensus(GK);
    must(gc && !gc.cold && gc.people, `${GK} did not settle in this harness`);
    eq(gc.proc.menu, null,
      `${GK} still prints the procedural-gate sentence over a measure the chamber voted the substance of`);
    no(String(w.PDXIssueFile._proc(gc)), "pdxif-pmenu",
      `${GK}'s letterhead prints a locked sentence its own record contradicts`);
    // THE RECORD THAT CONTRADICTED IT, COUNTED HERE RATHER THAN ASSERTED FROM
    // MEMORY: if the substantive acts ever leave this key, this claim goes stale
    // loudly instead of quietly blessing a sentence that became true again.
    const P = w.CMP_DATA || [];
    const ids = Array.isArray(P) ? P.map((x) => x && x.id) : Object.keys(P);
    let proc = 0, subst = 0;
    for (const pid of ids) {
      if (!pid) continue;
      let items = [];
      try { items = w._pdxRecordIssueItems(pid, GK) || []; } catch { items = []; }
      for (const it of items) { if (it.isProcedural) proc++; else subst++; }
    }
    ok(proc > 0, `${GK} holds no procedural acts — it is no longer the key that proved the loose gate wrong`);
    ok(subst > 0, `${GK} holds no substantive acts, so the procedural-gate sentence would be TRUE of it ` +
      `and the desk is now refusing to print a sentence that applies`);
    // …and the band the list files that measure into is a substantive one, which
    // is the same fact stated where a reader can see it.
    eq(gc.proc.measures.procedural, 0,
      `${GK} files a machinery-only band over a measure with ${subst} substantive acts on file`);
    console.log(`      /i/${GK} · ${proc} procedural + ${subst} substantive acts · no locked sentence`);
  }
  // Every key the desk files, swept for the same shape: the sentence prints only
  // where the whole key really was machinery, so it prints nowhere.
  {
    const ks = Object.keys(w.ISSUE_MAP);
    let gated = 0, wrong = [];
    for (const k of ks) {
      await tapKey(w, k);
      await tick(); await tick();
      const cc = w.PDXDoor1.issueCensus(k);
      if (!cc || cc.cold || !cc.people || !cc.proc) continue;
      if (!cc.proc.menu || cc.proc.menu.key !== "procedural_gate") continue;
      gated++;
      // If it ever fires again, it must fire on a key whose every mapped measure
      // banded as machinery-only. Anything else is the loose gate come back.
      if (cc.proc.measures.procedural !== cc.proc.measures.total) wrong.push(k);
    }
    eq(wrong.join(","), "",
      `the procedural-gate sentence printed on a key holding substantive measures: ${wrong.join(", ")}`);
    console.log(`      procedural_gate wired, ordered, quotable · fires on ${gated} keys today`);
  }
  // climate_action triggers none of the three — it holds PRIMARY measures and
  // substantive acts — and a block that printed one anyway would be saying
  // something untrue about a record that had its own vote.
  await tapKey(w, LKEY);
  await tick(); await tick(); await tick();
  const cc = w.PDXDoor1.issueCensus(LKEY);
  must(cc && cc.proc, `${LKEY} lost its census`);
  eq(cc.proc.menu, null, `${LKEY} triggers a menu sentence it has no grounds for`);
  no(String(w.PDXIssueFile._proc(cc)), "pdxif-pmenu",
    `${LKEY}'s process block printed a locked sentence that does not apply to it`);
  // The unwired third phrase stays unwired: no scheduling claim, from anywhere.
  const CODE = DESK.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, "");
  const menuSrc = CODE.slice(CODE.indexOf("function ledgerMenu"), CODE.indexOf("function ledgerProcess"));
  must(menuSrc.length > 200, "the process block's menu read could not be isolated from the desk's source");
  no(menuSrc, "no_vehicle",
    "the process block wired the no-vehicle phrase, which needs a denominator of what a chamber declined to schedule");
  // It ASKS the module for the words rather than holding a copy of them, and it
  // refuses a phrase the module does not order.
  has(menuSrc, "M.say(want)", "the process block writes the locked sentence instead of quoting it");
  has(menuSrc, "order.indexOf(want)", "the process block prints a phrase the menu module does not order");
  for (const t of ["'The only chances", "'What came up here", "floor machinery'"]) {
    no(menuSrc, t, `the process block holds its own copy of the locked wording (${t})`);
  }
  console.log(`      /i/${LKEY} · no locked sentence · no_vehicle unwired`);
}

// ── THE PROCESS FIGURES ARE THE CENSUS'S, ON EVERY KEY THE DESK FILES ───────
// Asserted as a shape rather than key by key: `proc` is one more field on the
// census the desk already computed, so a panel that had started deriving any of
// it would differ here before it differed on a line — and the package-only
// figure is `pkg`, everywhere, which is the wall against a second package test.
{
  const w = warmAll(boot({ path: "/" }));
  const keys = Object.keys(w.ISSUE_MAP);
  must(keys.length > 50, "the register did not load enough keys to sweep");
  let filed = 0, withMenu = 0, withActs = 0;
  for (const k of keys) {
    await tapKey(w, k);
    await tick(); await tick();
    const c = w.PDXDoor1.issueCensus(k);
    if (!c || c.cold || !c.people) continue;
    filed++;
    const p = c.proc;
    if (!p) { ok(false, `${k}: the census publishes people but no proc`); continue; }
    eq(p.people.package, c.pkg, `${k}: the package-only figure is not the census's own pkg`);
    eq(p.measures.total, c.measures, `${k}: the process block counts a different measure total`);
    eq(p.measures.primary + p.measures.provision + p.measures.procedural, c.measures,
      `${k}: the three band figures do not account for every mapped measure`);
    ok(p.measures.procedural <= p.measures.total, `${k}: more measures are procedural than exist`);
    // …and the bands the desk PUBLISHED are the same partition, with no empty
    // band offered as a door to nothing.
    eq((p.measures.bands || []).reduce((n, b) => n + b.n, 0), p.measures.total,
      `${k}: the published bands hold a different number of measures than the total`);
    ok((p.measures.bands || []).every((b) => b.n > 0 && b.id && b.lb && b.at),
      `${k}: a published measure band is empty or unaddressable`);
    ok(p.people.primary + p.people.package + p.people.mixed <= c.people,
      `${k}: the vehicle figures claim more people than the census filed`);
    ok(p.stances.said <= c.people, `${k}: more sourced stances than people on file`);
    ok(p.stances.crossed <= p.stances.said,
      `${k}: more formal rows run the other way than there are stances to run against`);
    if (p.menu) withMenu++;
    if (p.acts.length) withActs++;
    // The panel prints this census and never one of its own.
    eq(JSON.stringify(w.PDXIssueFile._census(k).proc), JSON.stringify(p),
      `${k}: the letterhead's proc is not the desk's`);
  }
  ok(filed > 40, `only ${filed} keys settled with people on file — the sweep is too thin to mean anything`);
  console.log(`      ${filed} keys swept · ${withActs} with acts · ${withMenu} with a locked sentence · ` +
    "package-only === pkg on every one");
}

// ── THE PROCESS BLOCK IS THE PANEL'S, AND IT STILL COUNTS NOTHING ───────────
// issue-file.js has been audited since it shipped for arithmetic, orders and
// ledger markup, because the one way this panel becomes a second reading is by
// starting to work out a figure for itself. The process block is the largest
// thing added to it since, so the audit is re-run over just that block.
{
  const CODE = PANEL.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, "");
  const at = CODE.indexOf("function procRow");
  const to = CODE.indexOf("function jumpsHtml");
  must(at > 0 && to > at, "the process block could not be isolated from issue-file.js");
  const blk = CODE.slice(at, to);
  // forEach over a list of PRE-WORDED strings is not arithmetic and is allowed;
  // anything that would produce a figure this panel did not receive is not.
  for (const t of ["Math.", "reduce(", ".sort(", "%", "toFixed", "+ 1", "- 1", ".length >",
                   "PDXConsistency", "PDXVotingRecord", "formalPatternIndex", "_recordVehicleStats",
                   "d1-led-", "party", "score"]) {
    no(blk, t, `the process block in issue-file.js does "${t}" — it prints the census, it does not compute one`);
  }
  // Every integer it prints arrives on the object it was handed.
  ok((blk.match(/\bo\.|\bm\.|\bc\.proc|\ba\.lb/g) || []).length > 8,
    "the process block does not read its figures off the census it was handed");
  // The anchor it jumps to is PUBLISHED, not spelled: this file may not name the
  // desk's markup, which is why the id travels on the census.
  has(CODE, "seeMeasures", "the panel lost the jump to the measure list");
  has(blk, "pr.measures && pr.measures.id",
    "the panel spells the measure anchor itself instead of reading the published one");
  no(blk, "d1-led-meas", "the panel spells the desk's own anchor id, which it may not name");
  const CSS = R("issue-file.css");
  has(CSS, ".pdxif-proc", "the stylesheet has no rule for the process block");
  has(CSS, ".pdxif-pmenu", "the stylesheet has no rule for the locked sentence");
  eq([...CSS.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0]).join(","), "",
    "issue-file.css authors a colour by hand");
  console.log("      issue-file.js process block: 0 arithmetic, 0 record reads, 0 ledger markup, 0 hex");
}

// ── THIS PASS'S FIXES ARE LOAD-BEARING TOO ──────────────────────────────────
// Five probes, each removing one of the five things this pass added, each
// expected to be CAUGHT by the claims in sections 13 and 14. A probe that
// returns false means the harness would not have noticed.
{
  const settle = async (w) => {
    await arriveAt(w);
    await tick(); await tick(); await tick();
    w.PDXIssueFile.repaint();
    return w;
  };
  const probes = [
    {
      name: "the slice reaches the builder and the two doors paint two strings",
      run: async () => {
        // The shape this pass exists to prevent: a FILTERED BUILD. Every chip is
        // painted unpressed for exactly this reason — the moment the builder
        // reads the slice, /i/<key> is mounting a string the desk never painted
        // and the byte equality this whole file rests on is gone.
        const src = DESK.replace(
          "    list.map(function (o) { return chipHtml(kind, o, false); }).join('') +",
          "    list.map(function (o) { return chipHtml(kind, o, _sl[kind] === o.v); }).join('') +");
        must(src !== DESK, "probe 1 matched nothing — chipGroup was reworded");
        const w = await settle(warmAll(boot({ path: `/i/${LKEY}`, desk: src })));
        const clean = w.PDXDoor1.issueProfile(LKEY);
        w.pdxDoor1Slice("dir", "against");
        return w.PDXDoor1.issueProfile(LKEY) !== clean;
      },
    },
    {
      name: "a band heading keeps claiming rows the slice hid",
      run: async () => {
        // The quiet version of lying with a count: "Cut against it · 55" over a
        // list of nine, because the slice narrowed the rows and left the heading
        // alone. The restated figure and the stash that restores it are the fix.
        const src = DESK.replace(
          "    if (bn) bn.textContent = on ? String(live) : n0;",
          "    if (bn) bn.textContent = n0;");
        must(src !== DESK, "probe 2 matched nothing — the band restate was reworded");
        const w = await settle(warmAll(boot({ path: `/i/${LKEY}`, desk: src })));
        // One band, one heading, driven through the pass over a two-row tree.
        const mk = (cls, attrs) => Object.assign(Object.create(null), {
          cls: cls.split(" "), attrs: attrs || {}, kids: [], hidden: false, textContent: "", value: "",
          getAttribute(k) { return this.attrs[k] === undefined ? null : this.attrs[k]; },
          setAttribute(k, v) { this.attrs[k] = String(v); },
          classList: { add() {}, remove() {}, contains() { return false; } },
          querySelector(sel) { return this.querySelectorAll(sel)[0] || null; },
          querySelectorAll(sel) { return this.getElementsByClassName(sel.slice(1)); },
          getElementsByClassName(want) {
            const out = [];
            const go = (n) => { for (const k of n.kids) { if (k.cls.indexOf(want) >= 0) out.push(k); go(k); } };
            go(this);
            return out;
          },
        });
        const root = mk("host");
        const box = mk("d1-led-slice", { "data-pdx-slice": LKEY });
        const sec = mk("d1-led-band");
        const head = mk("d1-led-bn");
        head.textContent = "2";
        const a = mk("d1-led-p", { "data-pdx-led-band": "against" });
        const b = mk("d1-led-p", { "data-pdx-led-band": "advanced" });
        sec.kids.push(head, a, b);
        root.kids.push(box, sec);
        box.parentNode = root;
        const realGet2 = w.document.getElementById;
        w.document.getElementById = (id) =>
          (id === "pdx-issue-file-ledger" ? root : realGet2.call(w.document, id));
        w.pdxDoor1Slice("clear", "");
        w.PDXDoor1._sliceApply();
        w.pdxDoor1Slice("dir", "against");
        w.PDXDoor1._sliceApply();
        // One row live, and the heading still says two.
        return !a.hidden && b.hidden && head.textContent === "2";
      },
    },
    {
      name: "package-only becomes a second test of what a package is",
      run: async () => {
        // The whole reason the vehicle class names the shape of two published
        // integers instead of re-reading the record: any second rule, however
        // reasonable, gives the chip a population the census's own pkg figure
        // does not have — and then two surfaces disagree about the same people.
        const src = DESK.replace(
          "    if (st > 0 && pr > 0) return 'mixed';\n    if (pr > 0) return 'package';",
          "    if (pr >= st) return 'package';\n    if (st > 0 && pr > 0) return 'mixed';");
        must(src !== DESK, "probe 3 matched nothing — vehClassOf was reworded");
        const w = await settle(warmAll(boot({ path: `/i/${LKEY}`, desk: src })));
        const c = w.PDXDoor1.issueCensus(LKEY);
        return !!(c && c.proc && c.proc.people.package !== c.pkg);
      },
    },
    {
      name: "a chip is painted with nobody behind it",
      run: async () => {
        // A row of unpressable noughts on a filter row reads as a verdict about
        // the people rather than about the record, which is the same reason the
        // inventory drops a zero bucket.
        const src = DESK.replace("        if (n) out.push({ v: o.v, lb: o.lb, n: n });",
                                 "        out.push({ v: o.v, lb: o.lb, n: n });");
        must(src !== DESK, "probe 4 matched nothing — the chip tally was reworded");
        const w = await settle(warmAll(boot({ path: `/i/${LKEY}`, desk: src })));
        const html = w.PDXDoor1.issueProfile(LKEY);
        const c = w.PDXDoor1.issueCensus(LKEY);
        return c.proc.people.package === 0 &&
               html.indexOf('data-pdx-sv="package"') >= 0;
      },
    },
    {
      name: "the process block publishes its integers while the read is still out",
      run: async () => {
        // Same gate as the inventory, and the same reason: a measure total is
        // the figure most tempting to publish early because it does not move
        // with the roll-call read, and publishing it early is how a reader
        // learns to trust a number that was not ready.
        const src = PANEL.replace("        (reading(c) ? '' : procHtml(c)) +", "        procHtml(c) +");
        must(src !== PANEL, "probe 5 matched nothing — the process block's gate was reworded");
        const w = boot({ path: `/i/${LKEY}`, panel: src });   // NOT settled
        await arriveAt(w);
        const head = headOf(w);
        return head.indexOf("Reading the record on this key") >= 0 &&
               head.indexOf("pdxif-proc") >= 0 &&
               /\d/.test(head.replace(/<[^>]*>/g, " "));
      },
    },
  ];
  for (const pr of probes) {
    const caught = await pr.run();
    ok(caught, `LOAD-BEARING PROBE NOT CAUGHT — ${pr.name}`);
    console.log(`      · ${pr.name} → ${caught ? "caught" : "NOT CAUGHT"}`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("15 · The measures, in bands, one row per instrument");
// ── A LIST NOBODY COULD SEE THE SHAPE OF ────────────────────────────────────
// Section 14 pins the FIGURES over the measure list. This one pins the list. The
// state it replaced was not wrong on any single card: /i/climate_action printed
// thirteen of them down one column, two of which were the same instrument twice
// over — once as the bills index knew it and once as the roll-call record did —
// with PRIMARY disapproval resolutions and floor amendments interleaved in no
// order a reader could name. A pane whose shape is unreadable is making a reader
// guess, and a guess about a record is the thing this project refuses to invite.
//
// So the list is filed into the bands its own cards were already labelled with,
// and what this section pins is that the filing claims nothing new:
//
//   · THE BANDS ARE A PARTITION of the measures the census mapped, in the desk's
//     own order, and every card is inside exactly one of them;
//   · A FOLD IS NOT A CUT. Each band shows its first few and puts the rest behind
//     its own <details> — in the DOM, in the string, one instrument per row —
//     and opening one band's remainder does not open another's;
//   · ONE ROW PER INSTRUMENT, because one row opens one measure. Two appearances
//     of one number are one card, and a card whose appearances disagreed about
//     the label says so on itself rather than becoming a twin;
//   · "WHO VOTED ON IT" SURVIVED THE FOLD, on every card including the folded
//     ones, because a measure a reader cannot open is a measure they must take
//     this pane's word about;
//   · THE PEOPLE SLICE DOES NOT REACH A MEASURE. A slice of the people is not a
//     slice of the bills, and the two lists share no class name that would let
//     one narrow the other;
//   · AND THE WALLS HELD: a provision's vote still counts and still says so, the
//     PRIMARY-vs-provision sentence is untouched, and no share of a package is
//     printed anywhere.
{
  const w = warmAll(boot({ path: `/i/${LKEY}` }));
  await arriveAt(w);
  await tick(); await tick(); await tick();
  w.PDXIssueFile.repaint();
  const body = ledgerOf(w);
  const c = w.PDXDoor1.issueCensus(LKEY);
  must(c && !c.cold && c.measures > 0, `${LKEY} files no measures — this section has nothing to band`);
  const M = c.proc.measures;
  // BOUNDED AT THE WALL. The formal lane's own WALL sentence is printed after the
  // measure section and is the one place on this pane allowed to say "Direction
  // Match", so a read of "the measure section" that ran to the end of the body
  // would be checking the walls below over the wrong markup.
  const cutAt = (h) => {
    const at = h.indexOf('<section class="d1-led-meas"');
    if (at < 0) return "";
    const end = h.indexOf('<p class="d1-led-wall">', at);
    return end < 0 ? h.slice(at) : h.slice(at, end);
  };
  const sect = cutAt(body);
  must(sect, "there is no measure section on the ledger at all");
  no(sect, "d1-led-wall", "the measure section read here still contains the formal lane's wall sentence");
  has(sect, "Measures on file", "the measure section lost the heading that says what it is");

  // ── THE BANDS, AND NOTHING OUTSIDE ONE ────────────────────────────────────
  const bandTags = sect.match(/<section class="d1-led-mband is-([a-z]+)" id="([^"]+)">/g) || [];
  const bandIds = bandTags.map((t) => (t.match(/is-([a-z]+)/) || [])[1]);
  eq(bandIds.join(","), (M.bands || []).map((b) => b.id).join(","),
    "the bands painted on the ledger are not the bands the census published, in that order");
  ok(bandIds.length > 1, `${LKEY} painted one band — this section needs a key whose measures split`);
  // THE PARTITION, COUNTED OFF THE MARKUP rather than off the model: every card
  // in the section is inside a band, and no card is in two.
  const cards = (sect.match(/<li class="d1-led-b">/g) || []).length;
  eq(cards, M.total, "the measure section paints a different number of cards than the census counted");
  const inBands = sect.slice(sect.indexOf(bandTags[0]));
  eq((inBands.match(/<li class="d1-led-b">/g) || []).length, cards,
    "a measure card was painted outside every band, so it is in the list and in no band");
  let tally = 0;
  for (const b of M.bands || []) {
    const at = sect.indexOf(`id="${b.at}"`);
    must(at > 0, `the ${b.id} band is not on the ledger`);
    const next = (M.bands || []).map((x) => sect.indexOf(`id="${x.at}"`)).filter((i) => i > at);
    const chunk = sect.slice(at, next.length ? Math.min(...next) : sect.length);
    const n = (chunk.match(/<li class="d1-led-b">/g) || []).length;
    eq(n, b.n, `the ${b.id} band paints ${n} cards under a heading that says ${b.n}`);
    tally += n;
    // ── THE CAP IS PER BAND, AND THE REST IS FOLDED, NOT DROPPED ───────────
    const cut = chunk.indexOf('<details class="d1-led-bmore">');
    const face = cut < 0 ? chunk : chunk.slice(0, cut);
    const shown = (face.match(/<li class="d1-led-b">/g) || []).length;
    ok(shown <= 4, `the ${b.id} band shows ${shown} cards on the face — the default is the first three or four`);
    eq(shown, Math.min(b.n, 4), `the ${b.id} band shows ${shown} of its ${b.n} cards on the face`);
    if (b.n > 4) {
      must(cut > 0, `the ${b.id} band holds ${b.n} cards and offers no fold for the ones it did not show`);
      const rest = b.n - shown;
      has(chunk, `>${rest} more measure${rest === 1 ? "" : "s"} — same label<`,
        `the ${b.id} band's fold does not say how many measures are behind it, or does not say they share its label`);
      // FOLDED IS NOT HIDDEN. Every one of them is in the string the desk built.
      eq((chunk.slice(cut).match(/<li class="d1-led-b">/g) || []).length, rest,
        `the ${b.id} band's fold does not contain every card it did not show`);
    } else {
      eq(cut, -1, `the ${b.id} band offers a fold over nothing`);
    }
    // ONE BAND'S FOLD IS ITS OWN. Not a shared <details name>, not nested inside
    // another band's, and none of them shipped open — so opening one leaves the
    // others exactly where the reader left them.
    ok((chunk.match(/<details/g) || []).length <= 1,
      `the ${b.id} band holds more than one fold, so one summary claims another's cards`);
    no(chunk, "<details name=", `the ${b.id} band's fold is grouped with another band's, so opening one shuts that one`);
    no(chunk, "<details class=\"d1-led-bmore\" open", `the ${b.id} band shipped its remainder already open`);
  }
  eq(tally, M.total, "the bands do not between them paint every measure the census counted");
  eq((sect.match(/<details/g) || []).length, (M.bands || []).filter((b) => b.n > 4).length,
    "the measure section paints a fold for a band that did not need one, or skipped one that did");

  // ── ONE ROW PER INSTRUMENT ────────────────────────────────────────────────
  // The face is deduped on the NUMBER, which is exactly what the card's own door
  // takes: pdxDoor1Bill(number). Two cards with one number were never two doors.
  const nums = (sect.match(/<span class="d1-led-bnum">([^<]*)</g) || [])
    .map((t) => t.replace(/^<span class="d1-led-bnum">/, "").replace(/<$/, ""));
  eq(nums.length, cards, "a measure card was painted without a number line");
  const dupes = nums.filter((n, i) => nums.indexOf(n) !== i);
  eq(dupes.join(","), "", `the same instrument is on the face twice: ${dupes.join(", ")}`);
  // …AND THE CLAIM IS NOT VACUOUS. The record really does hold this key's twins,
  // which is asserted by building the same key with the fold's one line removed:
  // if the sources ever stop disagreeing this goes stale loudly rather than
  // quietly passing over a list that had nothing to dedupe.
  {
    const flatSrc = DESK.replace("    return n ? 'f:' + n : id;", "    return id;");
    must(flatSrc !== DESK, "the face's fold key was reworded — this claim cannot be checked");
    const fw = warmAll(boot({ path: `/i/${LKEY}`, desk: flatSrc }));
    await arriveAt(fw);
    await tick(); await tick(); await tick();
    const flat = fw.PDXDoor1.issueProfile(LKEY);
    const fnums = (flat.match(/<span class="d1-led-bnum">([^<]*)</g) || [])
      .map((t) => t.replace(/^<span class="d1-led-bnum">/, "").replace(/<$/, ""));
    const twins = [...new Set(fnums.filter((n, i) => fnums.indexOf(n) !== i))].sort();
    ok(twins.length > 0, `${LKEY} has no instrument on file twice — the fold has nothing to fold`);
    ok(fnums.length > nums.length,
      `the fold removed no card at all: ${fnums.length} unfolded, ${nums.length} folded`);
    for (const t of twins) {
      eq(nums.filter((n) => n === t).length, 1,
        `${t} appears on this key twice in the record and is not one card on the face`);
    }
    console.log(`      /i/${LKEY} · ${fnums.length} appearances → ${nums.length} rows · ` +
      `folded: ${twins.join(", ")}`);
  }
  // H.R. 1 IS THE ONE THE WORK ORDER NAMED, and it is on two other keys twice.
  for (const k of ["cut_spending", "lands_energy"]) {
    await tapKey(w, k);
    await tick(); await tick(); await tick();
    const kh = w.PDXDoor1.issueProfile(k);
    const kn = (kh.match(/<span class="d1-led-bnum">([^<]*)</g) || [])
      .map((t) => t.replace(/^<span class="d1-led-bnum">/, "").replace(/<$/, ""));
    ok(kn.indexOf("H.R. 1") >= 0, `${k} no longer files H.R. 1 — the work order's own example is gone`);
    eq(kn.filter((n) => n === "H.R. 1").length, 1, `${k} still paints H.R. 1 as two rows`);
    const kd = kn.filter((n, i) => kn.indexOf(n) !== i);
    eq(kd.join(","), "", `${k} paints a twin row: ${kd.join(", ")}`);
  }

  // One card, read out of the painted string by the number on its own first line.
  const cardOf = (h, n) => {
    const at = h.indexOf(`<span class="d1-led-bnum">${n}<`);
    return at < 0 ? "" : h.slice(h.lastIndexOf('<li class="d1-led-b">', at), h.indexOf("</li>", at));
  };

  // ── A DISAGREEMENT IS DISCLOSED, NOT SWALLOWED ────────────────────────────
  // The one thing a fold could hide that a reader would want: two appearances of
  // one instrument that disagreed about the label. No key on today's record does
  // this, so the disagreement is INTRODUCED as data — one extra index entry for a
  // number the record already carries, mapped the other way — and the card must
  // absorb it without becoming a twin and must say on itself that it did.
  {
    const dw = warmAll(boot({ path: `/i/${LKEY}` }));
    const real = dw.PDXBills.listSync;
    must(typeof real === "function", "PDXBills.listSync is gone — the index-side union has no source to perturb");
    const base = real.call(dw.PDXBills);
    const items = (base.items || []).slice();
    // A number this key already files as PRIMARY, offered a second time as a
    // provision of the same key. Same instrument, one door, two labels — which is
    // the only disagreement a fold could swallow that a reader would want back.
    const provNum = "H.J.Res. 88";
    ok(items.some((b) => String(b && b.number) === provNum),
      `${provNum} is no longer in the bills index — this probe needs a number both sources know`);
    ok(cardOf(body, provNum).indexOf(">PRIMARY<") >= 0,
      `${provNum} is not PRIMARY on this key, so a provision copy of it disagrees with nothing`);
    dw.PDXBills.listSync = () => ({
      items: items.concat([{ measureId: "probe-mixed-label", number: provNum,
        title: "Congressional disapproval — index copy",
        primaryIssue: "energy_production", issueKeys: [LKEY] }]),
    });
    await arriveAt(dw);
    await tick(); await tick(); await tick();
    const dh = dw.PDXDoor1.issueProfile(LKEY);
    const dn = (dh.match(/<span class="d1-led-bnum">([^<]*)</g) || [])
      .map((t) => t.replace(/^<span class="d1-led-bnum">/, "").replace(/<$/, ""));
    eq(dn.filter((n) => n === provNum).length, 1,
      `${provNum} became two rows once its two appearances disagreed about the label`);
    eq((dh.match(/class="d1-led-balt"/g) || []).length, 1,
      "the card that folded a label disagreement does not disclose it, or discloses it more than once");
    has(dh, "Also on file as a provision mapping of this key",
      "the folded card does not name the other label its instrument arrived under");
    has(dh, "the same instrument, folded into this row",
      "the folded card does not say that the second appearance is the same instrument");
    // AND THE STRONGEST LABEL WINS THE FACE, so the disclosure is never the only
    // place a PRIMARY mapping is mentioned.
    has(cardOf(dh, provNum), ">PRIMARY<", "the folded card dropped the PRIMARY label one of its appearances carried");
    dw.PDXBills.listSync = real;
    console.log(`      a label disagreement on ${provNum} → 1 row, disclosed inside the card`);
  }

  // ── "WHO VOTED ON IT" SURVIVED THE FOLD ───────────────────────────────────
  await tapKey(w, LKEY);
  await tick(); await tick(); await tick();
  const body2 = w.PDXDoor1.issueProfile(LKEY);
  const sect2 = cutAt(body2);
  const doors = (sect2.match(/window\.pdxDoor1Bill\('|pdxDoor1Bill\('/g) || []).length;
  eq(doors, nums.filter(Boolean).length,
    "a measure card lost its way in — every card with a number opens the roll call on it");
  has(sect2, ">Who voted on it<", "the cards lost the control the work order says stays");
  // Including the folded ones: the fold is a <details>, so the door is in the
  // string whether or not it is on screen.
  for (const b of M.bands || []) {
    if (b.n <= 4) continue;
    const at = sect2.indexOf(`id="${b.at}"`);
    const chunk = sect2.slice(at);
    const cut = chunk.indexOf('<details class="d1-led-bmore">');
    const folded = chunk.slice(cut, chunk.indexOf("</details>", cut));
    eq((folded.match(/<li class="d1-led-b">/g) || []).length,
      (folded.match(/Who voted on it/g) || []).length,
      `a card behind the ${b.id} band's fold cannot be opened`);
  }

  // ── THE PEOPLE SLICE DOES NOT REACH A MEASURE ─────────────────────────────
  // Asserted twice, because the two ways this could break are different. First on
  // the CLASS NAMES: the slice narrows by walking .d1-led-p and restating
  // .d1-led-band, and a measure card that shared either name would be narrowed by
  // a chip about people.
  const SL = DESK.slice(DESK.indexOf("function sliceApply"), DESK.indexOf("function sliceSoon"));
  must(SL.length > 400, "the slice's DOM pass could not be isolated from the desk's source");
  for (const cls of ["d1-led-b'", "d1-led-b\"", "d1-led-mband", "d1-led-bills", "d1-led-bmore"]) {
    no(SL, cls, `the slice's DOM pass reaches for ${cls} — a chip about people would narrow the bills`);
  }
  // EVERY CLASS TOKEN, not the first on each element: a card that had the people
  // list's class ADDED to it would keep d1-led-b as its first and the narrower
  // read would sail past exactly the collision this claim is about.
  const clsTokens = (h) => [...new Set([...h.matchAll(/class="([^"]*)"/g)]
    .flatMap((m) => m[1].split(/\s+/)).filter(Boolean))];
  const measCls = clsTokens(sect);
  for (const cls of ["d1-led-p", "d1-led-band", "d1-led-tail", "d1-led-more"]) {
    ok(measCls.indexOf(cls) < 0, `a measure card wears ${cls}, which is a class the people slice walks`);
  }
  // Second on the PASS ITSELF, driven over a tree holding one person row and one
  // measure card, with every chip pressed in turn: the row hides, the card never
  // does, and the measure band's own heading is never restated.
  {
    const mk = (cls, attrs) => Object.assign(Object.create(null), {
      cls: String(cls).split(" "), attrs: attrs || {}, kids: [], hidden: false,
      textContent: "", value: "",
      getAttribute(k) { return this.attrs[k] === undefined ? null : this.attrs[k]; },
      setAttribute(k, v) { this.attrs[k] = String(v); },
      classList: { add() {}, remove() {}, contains() { return false; } },
      querySelector(sel) { return this.querySelectorAll(sel)[0] || null; },
      querySelectorAll(sel) { return this.getElementsByClassName(sel.slice(1)); },
      getElementsByClassName(want) {
        const out = [];
        const go = (n) => { for (const k of n.kids) { if (k.cls.indexOf(want) >= 0) out.push(k); go(k); } };
        go(this);
        return out;
      },
    });
    const root = mk("host");
    const box = mk("d1-led-slice", { "data-pdx-slice": LKEY });
    const pband = mk("d1-led-band");
    const phead = mk("d1-led-bn");
    phead.textContent = "1";
    const person = mk("d1-led-p", { "data-pdx-led-band": "advanced", "data-pdx-led-veh": "primary",
      "data-pdx-led-ch": "representative", "data-pdx-led-nm": "someone" });
    pband.kids.push(phead, person);
    const mband = mk("d1-led-mband");
    const mhead = mk("d1-led-bn");
    mhead.textContent = "7";
    const cardEl = mk("d1-led-b");
    mband.kids.push(mhead, cardEl);
    root.kids.push(box, pband, mband);
    box.parentNode = root;
    const realGet = w.document.getElementById;
    w.document.getElementById = (id) =>
      (id === "pdx-issue-file-ledger" ? root : realGet.call(w.document, id));
    for (const [kind, val] of [["dir", "against"], ["veh", "package"], ["ch", "senator"], ["q", "nobody"]]) {
      w.pdxDoor1Slice("clear", "");
      w.PDXDoor1._sliceApply();
      w.pdxDoor1Slice(kind, val);
      w.PDXDoor1._sliceApply();
      ok(person.hidden, `the ${kind} chip did not narrow the people list, so this claim proves nothing`);
      ok(!cardEl.hidden, `the ${kind} chip hid a measure card — a slice of the people is not a slice of the bills`);
      eq(mhead.textContent, "7", `the ${kind} chip restated a measure band's count`);
    }
    w.pdxDoor1Slice("clear", "");
    w.PDXDoor1._sliceApply();
    ok(!person.hidden && !cardEl.hidden, "clearing the slice did not restore the list");
    w.document.getElementById = realGet;
    console.log("      4 chips pressed · 0 measure cards hidden · 0 measure headings restated");
  }
  // …and the builder still emits one string whatever the slice says, which is the
  // claim the whole file rests on and the one a banded list could most easily
  // break by rendering the bands from slice state.
  {
    const clean = w.PDXDoor1.issueProfile(LKEY);
    w.pdxDoor1Slice("dir", "against");
    eq(w.PDXDoor1.issueProfile(LKEY), clean, "pressing a chip changed the string the builder paints");
    w.pdxDoor1Slice("clear", "");
  }

  // ── THE WALLS, OVER THE MEASURE SECTION ───────────────────────────────────
  // THE VOTE STILL COUNTS, and the sentence that says so is the one that shipped.
  has(sect, "PRIMARY means the measure was about this issue; a provision means it carried it inside " +
    "something larger. Either way the vote counts — the label is here so you can see which it was.",
    "the PRIMARY-vs-provision sentence was reworded by the banding");
  // …and each band says it again in its own terms, because a reader who folded
  // straight to the provision band never read the sentence above it.
  const notes = [...sect.matchAll(/<p class="d1-led-bnote">([\s\S]*?)<\/p>/g)].map((m) => m[1]);
  ok(notes.length >= 2 + bandIds.length, "a measure band was painted with no note saying what its label means");
  for (const id of bandIds) {
    const at = sect.indexOf(`is-${id}" id=`);
    const note = (sect.slice(at).match(/<p class="d1-led-bnote">([\s\S]*?)<\/p>/) || [])[1] || "";
    must(note, `the ${id} band has no note`);
    if (id !== "primary") {
      has(note, "vote still counts",
        `the ${id} band's note does not say the vote counts, which is the wall this label exists under`);
    }
  }
  // NO PACKAGE SHARE, ANYWHERE IN IT. Not a percentage, not a percentage in words.
  no(sect, "%", "the measure section prints a share");
  for (const t of ["out of", " of the package", "share of", "proportion"]) {
    no(sect, t, `the measure section prints a denominator ("${t}"), which is a percentage in words`);
  }
  for (const t of ["Direction Match", "consistency", "Republican", "Democrat", "party", "score",
                   "snuck", "obstructed", "buried", "refused to schedule", "grade"]) {
    no(sect, t, `the measure section says "${t}" — it is an inventory of what was on the table`);
  }
  const MENU = w.PDXConsistency.menu;
  eq(JSON.stringify(MENU.scan(sect)), "[]",
    `the menu's own wall scanner objects to the measure section: ${JSON.stringify(MENU.scan(sect))}`);
  // THE CAP IS THE DESK'S, AND IT IS PER BAND. A single cap over a banded list
  // would truncate one band and leave the others short, which is the shape the
  // work order's "expanding one band doesn't expand another" rules out.
  const CODE = DESK.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, "");
  has(CODE, "var MEAS_CAP = 4;", "the per-band cap is no longer a named constant on the desk");
  const mh = CODE.slice(CODE.indexOf("function measuresHtml"), CODE.indexOf("function ledgerWall"));
  must(mh.length > 400, "the measure list's markup could not be isolated from the desk's source");
  no(mh, "LIST_CAP", "the measure list is capped by the people cap, which would truncate a band");
  has(mh, "MEAS_CAP", "the measure list does not cap per band");
  console.log(`      /i/${LKEY} · ${bandIds.join(" · ")} · ${cards} cards, ` +
    `${(sect.match(/<details/g) || []).length} fold(s) · walls held`);
}

// ── AND THIS PASS'S OWN FIXES ARE LOAD-BEARING ──────────────────────────────
// Four probes, each removing one of the four things the banding added, each
// expected to be CAUGHT by the claims in section 15.
{
  const probes = [
    {
      name: "the face stops folding and the same instrument is two rows again",
      run: async () => {
        // The state the work order names: H.R. 1 twice, as two cards that open
        // the same bill. The fold keys the face on the number precisely because
        // the number is what the card's door takes.
        const src = DESK.replace("    return n ? 'f:' + n : id;", "    return id;");
        must(src !== DESK, "probe 1 matched nothing — the face's fold key was reworded");
        const w = warmAll(boot({ path: `/i/${LKEY}`, desk: src }));
        await arriveAt(w);
        await tick(); await tick(); await tick();
        const html = w.PDXDoor1.issueProfile(LKEY);
        const nums = (html.match(/<span class="d1-led-bnum">([^<]*)</g) || []);
        return nums.length > new Set(nums).size;
      },
    },
    {
      name: "the per-band cap is dropped and one band prints the whole column",
      run: async () => {
        // The original complaint, restated: a band that shows everything is the
        // long column with a heading on it.
        const src = DESK.replace("      var shown = b.rows.slice(0, MEAS_CAP);",
                                 "      var shown = b.rows.slice(0);");
        must(src !== DESK, "probe 2 matched nothing — the per-band cap was reworded");
        const w = warmAll(boot({ path: `/i/${LKEY}`, desk: src }));
        await arriveAt(w);
        await tick(); await tick(); await tick();
        const html = w.PDXDoor1.issueProfile(LKEY);
        const at = html.indexOf('class="d1-led-mband');
        const face = html.slice(at, html.indexOf("</section>", at));
        const cut = face.indexOf("<details");
        const shown = ((cut < 0 ? face : face.slice(0, cut)).match(/<li class="d1-led-b">/g) || []).length;
        return shown > 4;
      },
    },
    {
      name: "a measure card takes the people list's class and a chip hides a bill",
      run: async () => {
        // Why the bands have their own names at all. The slice narrows by walking
        // .d1-led-p; a measure card wearing that class is a bill filtered by a
        // chip about people, which is the one thing the work order rules out.
        const src = DESK.replace("      return '<li class=\"d1-led-b\">' +",
                                 "      return '<li class=\"d1-led-b d1-led-p\">' +");
        must(src !== DESK, "probe 3 matched nothing — the measure card's class was reworded");
        const w = warmAll(boot({ path: `/i/${LKEY}`, desk: src }));
        await arriveAt(w);
        await tick(); await tick(); await tick();
        const html = w.PDXDoor1.issueProfile(LKEY);
        const at = html.indexOf('<section class="d1-led-meas"');
        const sect = html.slice(at);
        const measCls = [...new Set([...sect.matchAll(/class="([^"]*)"/g)]
          .flatMap((m) => m[1].split(/\s+/)).filter(Boolean))];
        return measCls.indexOf("d1-led-p") >= 0;
      },
    },
    {
      name: "a band figure on the letterhead is published without an anchor to land on",
      run: async () => {
        // A figure that is a door and lands nowhere is worse than a figure that
        // is not a door: the reader taps it, nothing moves, and they conclude the
        // number was decoration.
        const src = DESK.replace("    return (a && id) ? a + '-' + id : '';", "    return '';");
        must(src !== DESK, "probe 4 matched nothing — the band anchor was reworded");
        const w = warmAll(boot({ path: `/i/${LKEY}`, desk: src }));
        await arriveAt(w);
        await tick(); await tick(); await tick();
        w.PDXIssueFile.repaint();
        const head = headOf(w);
        const c = w.PDXDoor1.issueCensus(LKEY);
        const bands = (c.proc.measures.bands || []);
        return bands.length > 0 && bands.every((b) => !b.at) &&
               head.indexOf("pdxif-pjump") < 0;
      },
    },
  ];
  for (const pr of probes) {
    const caught = await pr.run();
    ok(caught, `LOAD-BEARING PROBE NOT CAUGHT — ${pr.name}`);
    console.log(`      · ${pr.name} → ${caught ? "caught" : "NOT CAUGHT"}`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("16 · A partial census does not wear a finished heading");
// ═════════════════════════════════════════════════════════════════════════════
// THE DEFECT THIS SECTION OWNS. On a cold /i/climate_action the ledger opened
// with "3 people have a readable formal row on Climate action · 3 cut against ·
// Reading the full record for 560 more". Every figure was a true count of a
// printed row, and the page was still false: the only band on it was Cut
// against, the slice chips matched those same three rows, and a reader arriving
// there learned that this issue IS three senators who cut against it. That is
// the same lie as a thin file wearing a finished heading — the letterhead
// already refuses to tell it by publishing no integer under a live read, and
// this section is the people line under it keeping the same rule.
//
// THE FIXTURE. `boot()` seeds every member the corpus holds, so a settled key is
// the harness's easy state and the partial one has to be built. It is built the
// way the shipped code decides the question: `recordWarm(pid)` asks
// PDXVotingRecord.memberRecords, so narrowing that one read to three members
// leaves the discovered field exactly as wide as it was and the READABLE part of
// it three rows deep. Nothing about the ledger is stubbed, and no census figure
// below is written by this harness.
{
  const nd = (cls, attrs, text) => {
    const n = {
      cls: String(cls || "").split(" ").filter(Boolean),
      attrs: Object.assign({}, attrs || {}),
      kids: [], hidden: false, textContent: text == null ? "" : String(text), value: "",
      parentNode: null,
      getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
      setAttribute(k, v) { this.attrs[k] = String(v); },
      add(...kids) { for (const k of kids) if (k) { k.parentNode = this; this.kids.push(k); } return this; },
      walk() { const out = []; const go = (x) => { for (const k of x.kids) { out.push(k); go(k); } }; go(this); return out; },
      is(sel) { return sel[0] === "." ? this.cls.indexOf(sel.slice(1)) >= 0 : false; },
      querySelectorAll(sel) { return this.walk().filter((x) => x.is(sel)); },
      querySelector(sel) { return this.querySelectorAll(sel)[0] || null; },
      getElementsByClassName(c) { return this.walk().filter((x) => x.is("." + c)); },
    };
    n.classList = {
      add(c) { if (n.cls.indexOf(c) < 0) n.cls.push(c); },
      remove(c) { const i = n.cls.indexOf(c); if (i >= 0) n.cls.splice(i, 1); },
      contains(c) { return n.cls.indexOf(c) >= 0; },
    };
    return n;
  };
  // The bands this pane painted, with the figure each heading is carrying — read
  // off the string, because the claim is about the string a reader gets.
  const bandsIn = (html) =>
    [...html.matchAll(/<section class="d1-led-band is-([a-z]+)">[\s\S]*?<span class="d1-led-bn">(\d+)<\/span>/g)]
      .map((m) => `${m[1]}:${m[2]}`);
  const chipsIn = (html) => [...new Set([...html.matchAll(/data-pdx-sv="([a-z]+)"/g)].map((m) => m[1]))];
  const ledeOf = (html) => ((html.match(/<p class="d1-led-n[^"]*">([\s\S]*?)<\/p>/) || [])[1] || "")
    .replace(/<[^>]*>/g, "");
  // The grammar of a finished inventory, in both its numbers. Not one form of it
  // may appear over a read that is still out.
  const FINISHED = ["people have a readable formal row", "person has a readable formal row"];

  const w = warmAll(boot({ path: `/i/${LKEY}` }));
  await arriveAt(w);
  await tick(); await tick(); await tick();
  const settled = w.PDXDoor1.issueCensus(LKEY);
  must(settled && !settled.cold && !settled.pending && settled.people > 100,
    `${LKEY} did not settle in this harness — the partial state below has nothing to be partial of`);
  const led0 = w.PDXDoor1._ledger(null, LKEY);
  const against = (led0.bands || []).find((b) => b.id === "against");
  must(against && against.rows.length >= 3,
    `${LKEY} no longer files three people who cut against it — the work order's own fixture is gone`);
  const KEEP = against.rows.slice(0, 3).map((r) => r.pid);
  const realMR = w.PDXVotingRecord.memberRecords.bind(w.PDXVotingRecord);
  const narrow = (miss) => {
    w.PDXVotingRecord.memberRecords = (pid) => (KEEP.indexOf(pid) >= 0 ? realMR(pid) : miss);
  };

  // ── THE READ IS OUT · THREE ROWS BACK, ONE BAND, HUNDREDS STILL COMING ────
  narrow(null);
  w.PDXDoor1.sync();
  await tick();
  w.PDXIssueFile.repaint();
  const c = w.PDXDoor1.issueCensus(LKEY);
  const body = ledgerOf(w);
  const head = headOf(w);
  must(c && c.people === 3 && c.cold > 0,
    `the partial fixture did not narrow to three readable rows (people ${c && c.people}, cold ${c && c.cold})`);
  const live = (c.bands || []).filter((b) => b.n);
  eq(live.map((b) => b.id).join(","), "against",
    "the partial fixture is not the work order's one-band page any more");

  // THE LEDE. It may name what came back. It may not be the grammar of an
  // inventory, in either number, because that is the sentence a reader reads as
  // the whole key.
  for (const f of FINISHED) {
    no(body, f, `the lede reads as a finished inventory ("${f}") while ${c.cold} records are still being read`);
  }
  has(body, "readable so far", "the lede does not say the count is what has come back so far");
  has(body, `still reading <b>${c.cold}</b>`,
    "the lede does not name how much of the record is still out");
  has(body, `<b>${c.people}</b> readable so far`,
    "the lede does not name the settled count it is entitled to name");
  has(body, "Not the count for this key",
    "nothing on the pane says the headline is not the count for this key");
  has(body, "is-partial", "the partial census is not marked as partial for the stylesheet");
  ok(/readable so far[\s\S]{0,80}still reading/.test(ledeOf(body)),
    `the settled count and the outstanding read are not in one sentence: "${ledeOf(body)}"`);

  // THE SPLIT. One band's figure, said to be of the rows back so far — not of
  // the key, which is what "3 cut against" under a finished heading claimed.
  has(body, "of the rows back so far", "the band split is not marked as being of the arrived rows");
  eq(bandsIn(body).join(","), `against:3`,
    "the partial page paints a band the census does not have rows for");

  // THE BANDS NOBODY HAS COME BACK FOR ARE NAMED, NOT ZEROED. Four of the five
  // are empty here, and an empty band under a live read is a finding about
  // nothing. So each is named — in the index's own fixed order — as closed.
  const soon = (body.match(/<p class="d1-led-soon">([\s\S]*?)<\/p>/) || [])[1] || "";
  must(soon, "the bands-still-closed line is not on the partial page at all");
  const missing = (c.bands || []).filter((b) => !b.n);
  eq(missing.length, 4, "the partial fixture no longer has four bands waiting on the read");
  for (const b of missing) {
    has(soon, esc(b.lb), `the ${b.id} band is dropped silently rather than named as still closed`);
  }
  eq(missing.map((b) => soon.indexOf(esc(b.lb))).join(",") ===
     missing.map((b) => soon.indexOf(esc(b.lb))).sort((x, y) => x - y).join(","), true,
    "the closed bands are not named in the index's own fixed order");
  has(soon, "not zero", "the closed bands are not distinguished from bands that hold nobody");
  has(soon, "when the rest of the record lands",
    "nothing says the closed bands open when the read finishes");
  // …and naming them is NOT painting them: no row, no heading and no chip.
  no(body, 'class="d1-led-band is-advanced"',
    "a band with nobody in it was painted as a band to make the page look complete");
  no(body, '<span class="d1-led-bn">0</span>', "a band heading is carrying a zero");

  // THE CHIPS ARE OF THE ROWS ON SCREEN. A direction with nobody behind it still
  // gets no chip — a control that filters to an empty list is a lie of its own —
  // so the absence is EXPLAINED rather than papered over with a dead chip.
  const partChips = chipsIn(body);
  eq(partChips.indexOf("advanced"), -1,
    "a chip was painted for a direction no arrived row is in");
  has(body, "count the rows on screen", "the chip row does not say what its counts are of");
  has(body, `${c.people} of them`, "the chip row does not name the painted set it counts");
  has(body, "not a finding that nobody advanced it",
    "a missing direction chip is left to read as nobody having advanced this");
  has(body, 'data-pdx-slice-part="1"',
    "the paint does not tell the slice pass that the rows it counts are a partial set");

  // THE LETTERHEAD IS STILL WHAT IT WAS. Integer-free under a live read, and
  // this pass did not loosen it.
  const figures = (head.replace(/<[^>]*>/g, " ").match(/\d+/g) || []);
  eq(figures.join(","), "", `the letterhead published figures (${figures.join(", ")}) while the read was out`);
  no(head, "pdxif-inv", "the letterhead printed an inventory line under a live read");
  no(head, "pdxif-proc", "the process block printed under a live read");
  has(head, "on file so far", "the letterhead stopped saying the rows below it are partial");

  // AND NO WALL MOVED TO SAY ANY OF IT. No share, no party, no second reading.
  for (const banned of ["%", "Direction Match", "Republican", "Democrat", "party", "score",
                        "likely", "expected", "projected", "on track"]) {
    no(body.slice(0, body.indexOf('class="d1-led-slice"')), banned,
      `the partial census reaches for "${banned}" to describe what it does not know yet`);
  }
  console.log(`      partial · ${ledeOf(body).replace(/\s+/g, " ").slice(0, 72)} · ` +
    `${live.length} band painted, ${missing.length} named as closed, chips ${partChips.length}`);

  // ── THE GATE IS THE READ, NOT THE FETCH ──────────────────────────────────
  // `pending` is a batch on the wire; `cold` is a person whose record never came
  // back. Either one means the figures are partial, so the honesty may not be
  // wired to the in-flight flag alone — a fetch that answered without the record
  // it was asked for would otherwise publish a finished heading over three rows.
  ok(!c.pending || c.cold > 0, "the fixture cannot separate the two halves of the gate");
  const inflight = boot({ path: `/i/${LKEY}` });
  const iMR = inflight.PDXVotingRecord.memberRecords.bind(inflight.PDXVotingRecord);
  inflight.PDXVotingRecord.memberRecords = (pid) => (KEEP.indexOf(pid) >= 0 ? iMR(pid) : null);
  inflight.PDXVotingRecord.fetchCompare = () => new Promise(() => {});
  await arriveAt(inflight);
  await tick(); await tick();
  const ic = inflight.PDXDoor1.issueCensus(LKEY);
  const ibody = ledgerOf(inflight);
  must(ic && ic.pending === true, "the never-answering batch did not leave a read pending");
  for (const f of FINISHED) no(ibody, f, `a pending batch still paints "${f}"`);
  has(ibody, "readable so far", "a pending batch does not put the lede in its partial form");
  console.log(`      pending ${ic.pending} · cold ${ic.cold} · both halves of the gate hold the lede`);

  // ── THE CAPTION SAYS WHICH ROWS IT COUNTED ───────────────────────────────
  // The slice's status line is written by the DOM pass, a tick after the mount,
  // and it has no ledger to ask — so the paint flags the box and the caption
  // names its own denominator. "3 of 3 rows" is true either way; "on screen" is
  // what stops it being read as three of the people on this key.
  {
    const mk = (flag) => {
      const root = nd("host");
      const attrs = { "data-pdx-slice": LKEY };
      if (flag) attrs["data-pdx-slice-part"] = "1";
      const box = nd("d1-led-slice", attrs);
      const chip = nd("d1-led-chip", { "data-pdx-sl": "dir", "data-pdx-sv": "against", "aria-pressed": "false" });
      const say = nd("d1-led-sn");
      box.add(chip, nd("d1-led-clear"), say);
      root.add(box);
      const sec = nd("d1-led-band is-against");
      sec.add(nd("d1-led-bh").add(nd("d1-led-bt", null, "Cut against it"), nd("d1-led-bn", null, "3")));
      const list = nd("d1-led-people");
      for (let i = 0; i < 3; i++) {
        list.add(nd("d1-led-p", { "data-pdx-led-band": "against", "data-pdx-led-veh": "primary",
                                  "data-pdx-led-ch": "house", "data-pdx-led-nm": "x" }));
      }
      sec.add(list);
      root.add(sec);
      return { root, say };
    };
    const realGet = w.document.getElementById;
    const drive = (tree) => {
      w.document.getElementById = (id) =>
        (id === "pdx-issue-file-ledger" ? tree.root : realGet.call(w.document, id));
      // Chips toggle, so the axis is cleared before it is pressed — otherwise the
      // second tree in this pair would be measuring a slice being turned OFF.
      w.pdxDoor1Slice("clear", "");
      w.pdxDoor1Slice("dir", "against");
      w.PDXDoor1._sliceApply();
      w.document.getElementById = realGet;
      return tree.say.textContent;
    };
    const partSay = drive(mk(true));
    const doneSay = drive(mk(false));
    w.pdxDoor1Slice("clear", "");
    eq(partSay, "Cut against — 3 of 3 rows on screen. The rest of the record is still being " +
      "read; everything else is still on file.",
      "the caption over a partial list does not say its rows are the ones on screen");
    eq(doneSay, "Cut against — 3 of 3 rows shown. Everything else is still on file.",
      "the settled caption's shipped wording moved");
    console.log(`      caption · partial: "…3 of 3 rows on screen" · settled: "…3 of 3 rows shown"`);
  }

  // ── ONE SETTLE PAINT ─────────────────────────────────────────────────────
  // The heading and the bands are two reads of ONE ledger in ONE string, so
  // there is no order of arrival in which bands appear under a heading that
  // still says three. Asserted on both paints: the figure in the lede and the
  // figures on the band headings are the same census, before and after.
  const sumOf = (html) => bandsIn(html).reduce((n, s) => n + Number(s.split(":")[1]), 0);
  eq(sumOf(body), c.people,
    "the partial paint's band headings do not add up to the count in its own lede");

  w.PDXVotingRecord.memberRecords = realMR;
  w.PDXDoor1.sync();
  await tick();
  w.PDXIssueFile.repaint();
  const c2 = w.PDXDoor1.issueCensus(LKEY);
  const body2 = ledgerOf(w);
  const head2 = headOf(w);
  must(c2 && !c2.cold && !c2.pending && c2.people > 100,
    `the record never settled again (cold ${c2 && c2.cold}) — the settled half cannot be checked`);
  eq(sumOf(body2), c2.people,
    "the settled paint's band headings do not add up to the count in its own lede");

  // THE LEDE IS THE FULL READABLE COUNT, UNHEDGED.
  has(body2, `<b>${c2.people}</b> people have a readable formal row`,
    "the settled lede is not the full readable count");
  for (const gone of ["readable so far", "Not the count for this key", "d1-led-soon",
                      "of the rows back so far", "d1-led-slpart", "data-pdx-slice-part",
                      "is-partial", "count the rows on screen"]) {
    no(body2, gone, `the pane is still hedging ("${gone}") after the record settled`);
  }
  // THE BANDS MATCH THE CENSUS, and every band that has rows is on the page.
  eq(bandsIn(body2).join(","), (c2.bands || []).filter((b) => b.n).map((b) => `${b.id}:${b.n}`).join(","),
    "the settled page's bands are not the census's bands");
  // THE CHIPS GREW, and the direction the partial page could not offer is there.
  const chips2 = chipsIn(body2);
  ok(chips2.length > partChips.length,
    `the chip row did not grow on the settle (${partChips.length} → ${chips2.length})`);
  has(body2, 'data-pdx-sv="advanced"', "the advanced chip never appeared once rows landed in that band");
  // THE PROCESS BLOCK IS BACK, WITH ITS JUMPS.
  has(head2, "pdxif-inv", "the letterhead's inventory never returned after the settle");
  has(head2, "How this issue was tested", "the process block never returned after the settle");
  has(head2, "pdxif-pjump", "the process figures stopped being doors into the measure bands");
  has(head2, "PRIMARY", "the process line lost its PRIMARY figure");
  has(head2, "provision", "the process line lost its provision figure");
  console.log(`      settled · ${ledeOf(body2).replace(/\s+/g, " ").slice(0, 60)} · ` +
    `bands ${bandsIn(body2).join(" ")} · chips ${chips2.length} · process jumps present`);

  // ── EMPTY AFTER SETTLE IS STILL EMPTY ────────────────────────────────────
  // The gate is the read, not a rule that five bands must always show. A key
  // whose record really does land on one band keeps that heading, with no
  // hedge — and so does a key that lands on nobody at all. Both are findings,
  // and a finding is printed straight.
  narrow([]);
  w.PDXDoor1.sync();
  await tick();
  const oneBand = w.PDXDoor1.issueCensus(LKEY);
  const obBody = ledgerOf(w);
  must(oneBand && !oneBand.cold && !oneBand.pending,
    "the settled-but-narrow fixture is still reading — an empty record is a settled record");
  has(obBody, "people have a readable formal row",
    "a settled key with one band is hedged as if its read were still out");
  for (const gone of ["readable so far", "d1-led-soon", "not zero", "d1-led-slpart"]) {
    no(obBody, gone, `a settled key with few bands still hedges ("${gone}")`);
  }
  w.PDXVotingRecord.memberRecords = realMR;
  w.PDXDoor1.sync();
  await tick();

  const ew = warmAll(boot({ path: `/i/${EMPTY}` }));
  await arriveAt(ew);
  await tick(); await tick(); await tick();
  const ec = ew.PDXDoor1.issueCensus(EMPTY);
  must(ec && !ec.cold && !ec.pending && !ec.people,
    `${EMPTY} is not an empty settled key in this harness any more`);
  const eBody = ledgerOf(ew);
  has(eBody, `<b>0</b> people have a readable formal row on <b>${esc(MAP[EMPTY].label)}</b>.`,
    "an empty key that has finished reading no longer says so straight");
  for (const gone of ["readable so far", "Not the count for this key", "d1-led-soon"]) {
    no(eBody, gone, `the empty settled key hedges ("${gone}") instead of reporting a finding`);
  }
  console.log(`      empty after settle · "0 people have a readable formal row" · no hedge`);

  // ── TWIN BOOT · NOTHING HERE IS A READING ────────────────────────────────
  // This pass added copy and one predicate over figures the desk already had. So
  // Direction Match, its state, its verdict, its tier and the formal-pattern
  // index's own rows are byte-identical with the panel and the address loaded
  // and without them.
  const withPanel = boot({ path: "/" });
  const withoutPanel = boot({ path: "/", withoutAddress: true });
  const sample = [...corpus.byMember.keys()].slice(0, 40);
  let dmDrift = 0, tierDrift = 0;
  for (const pid of sample) {
    const rowsA = withPanel.PDXConsistency.issueRows(pid) || [];
    const rowsB = withoutPanel.PDXConsistency.issueRows(pid) || [];
    const shape = (W, rs) => rs.map((r) => {
      const res = W.PDXConsistency.rowResult(r) || {};
      return `${r.key}|${res.pct}|${res.state}|${r.verdict && r.verdict.token}|${r.tier}`;
    }).join(";");
    if (shape(withPanel, rowsA) !== shape(withoutPanel, rowsB)) dmDrift++;
    const fa = JSON.stringify(withPanel.PDXConsistency.formalPatternIndex.rowFor(pid, LKEY) || null);
    const fb = JSON.stringify(withoutPanel.PDXConsistency.formalPatternIndex.rowFor(pid, LKEY) || null);
    if (fa !== fb) tierDrift++;
  }
  eq(dmDrift, 0, `${dmDrift} of ${sample.length} Direction Match reads moved with this pane loaded`);
  eq(tierDrift, 0, `${tierDrift} of ${sample.length} formal rows moved with this pane loaded`);
  // …and the copy this pass added lives in the desk and nowhere near a reading:
  // the three new functions are pure reads of the ledger handed to them.
  const NEW = DESK.slice(DESK.indexOf("function ledgerBusy"), DESK.indexOf("function censusHtml"));
  must(NEW.length > 400, "the partial-census block could not be isolated in the desk's source");
  for (const banned of ["PDXVotingRecord", "PDXConsistency", "fetchCompare", "rowFor(",
                        "%", "toFixed", "Math."]) {
    no(NEW, banned, `the partial-census copy reaches for ${banned} — it is copy over figures, not a read`);
  }
  console.log(`      ${sample.length} members swept: no drift in Direction Match, state, verdict or tier`);
}

// ── THE FIXES ARE LOAD-BEARING ──────────────────────────────────────────────
// Four probes, each removing one line of what this pass added, each expected to
// be CAUGHT by the claims above. A probe that returns false means the harness
// would not have noticed the regression.
{
  const KEEPN = 3;
  const partialBoot = async (src) => {
    const w = warmAll(boot({ path: `/i/${LKEY}`, desk: src }));
    await arriveAt(w);
    await tick(); await tick(); await tick();
    const led = w.PDXDoor1._ledger(null, LKEY);
    const ag = (led.bands || []).find((b) => b.id === "against");
    must(ag && ag.rows.length >= KEEPN, "the probe's fixture lost its three cut-against rows");
    const keep = ag.rows.slice(0, KEEPN).map((r) => r.pid);
    const real = w.PDXVotingRecord.memberRecords.bind(w.PDXVotingRecord);
    w.PDXVotingRecord.memberRecords = (pid) => (keep.indexOf(pid) >= 0 ? real(pid) : null);
    w.PDXDoor1.sync();
    await tick();
    // The panel is the surface being read, so it is repainted too — otherwise
    // every probe below would be inspecting the settled paint that came before.
    w.PDXIssueFile.repaint();
    return { w, body: ledgerOf(w), c: w.PDXDoor1.issueCensus(LKEY) };
  };
  const probes = [
    {
      name: "the lede stops asking whether a read is out",
      run: async () => {
        // The defect itself, restored: one predicate returning false and the
        // partial count is back to wearing the grammar of an inventory.
        const src = DESK.replace(
          "  function ledgerBusy(led) { return !!(led && (led.cold || led.pending)); }",
          "  function ledgerBusy(led) { return !!(led && false); }");
        must(src !== DESK, "probe 1 matched nothing — the busy predicate was reworded");
        const { body, c } = await partialBoot(src);
        return c.cold > 0 && body.indexOf("people have a readable formal row") >= 0 &&
               body.indexOf("readable so far") < 0;
      },
    },
    {
      name: "the bands nobody came back for are dropped as zeroes",
      run: async () => {
        // A page showing Cut against and nothing else, with no word that four
        // more bands are still coming — which is the reading the work order
        // names: this issue is three senators who cut against it.
        const src = DESK.replace("  function bandsSoonHtml(led) {",
                                 "  function bandsSoonHtml(led) {\n    if (led) return '';");
        must(src !== DESK, "probe 2 matched nothing — the closed-bands line was reworded");
        const { body, c } = await partialBoot(src);
        const missing = (c.bands || []).filter((b) => !b.n);
        // Read over the census block only: a band label can appear further down
        // the page for a reason of its own, and the claim is about the heading.
        const census = body.slice(0, body.indexOf('class="d1-led-slice"'));
        return c.cold > 0 && missing.length > 0 &&
               census.indexOf("d1-led-soon") < 0 &&
               census.indexOf("not zero") < 0 &&
               missing.every((b) => census.indexOf(esc(b.lb)) < 0);
      },
    },
    {
      name: "the chip row lets a missing chip read as a finding",
      run: async () => {
        // The chips are built from the rows on screen and a direction with
        // nobody behind it gets none. Without the note, "no Advanced chip" is
        // read as "nobody advanced it" — a finding nobody made.
        const src = DESK.replace(
          "      (busy\n        ? '<p class=\"d1-led-slpart\">These chips count the rows on screen'",
          "      (false\n        ? '<p class=\"d1-led-slpart\">These chips count the rows on screen'");
        must(src !== DESK, "probe 3 matched nothing — the chip note was reworded");
        const { body, c } = await partialBoot(src);
        return c.cold > 0 && body.indexOf('data-pdx-sv="advanced"') < 0 &&
               body.indexOf("count the rows on screen") < 0;
      },
    },
    {
      name: "the caption counts the screen and calls it the key",
      run: async () => {
        // "3 of 3 rows shown" over a partial list, with nothing saying which
        // three — the figure a reader would take away as the size of the key.
        const src = DESK.replace("      var part = box.getAttribute('data-pdx-slice-part');",
                                 "      var part = null;");
        must(src !== DESK, "probe 4 matched nothing — the caption's flag was reworded");
        const w = warmAll(boot({ path: `/i/${LKEY}`, desk: src }));
        // The slice is dropped the moment the key changes, so the pane has to
        // have been painted for this key before a chip on it means anything.
        await arriveAt(w);
        await tick(); await tick();
        const root = { cls: ["host"], kids: [] };
        // Only the caption is being asked about here, so the tree is the
        // smallest one sliceBox can walk: a flagged box, one chip, three rows.
        const mk = (cls, attrs) => ({
          cls: cls.split(" "), attrs: attrs || {}, kids: [], hidden: false, textContent: "", value: "",
          parentNode: null,
          getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
          setAttribute(k, v) { this.attrs[k] = String(v); },
          add(...kk) { for (const x of kk) { x.parentNode = this; this.kids.push(x); } return this; },
          walk() { const out = []; const go = (x) => { for (const k of x.kids) { out.push(k); go(k); } }; go(this); return out; },
          is(sel) { return sel[0] === "." ? this.cls.indexOf(sel.slice(1)) >= 0 : false; },
          querySelectorAll(sel) { return this.walk().filter((x) => x.is(sel)); },
          querySelector(sel) { return this.querySelectorAll(sel)[0] || null; },
          getElementsByClassName(c) { return this.walk().filter((x) => x.is("." + c)); },
          classList: { add() {}, remove() {}, contains() { return false; } },
        });
        const host = mk("host");
        const box = mk("d1-led-slice", { "data-pdx-slice": LKEY, "data-pdx-slice-part": "1" });
        const say = mk("d1-led-sn");
        box.add(mk("d1-led-chip", { "data-pdx-sl": "dir", "data-pdx-sv": "against" }), say);
        host.add(box);
        const sec = mk("d1-led-band is-against");
        for (let i = 0; i < 3; i++) {
          sec.add(mk("d1-led-p", { "data-pdx-led-band": "against", "data-pdx-led-veh": "primary",
                                   "data-pdx-led-ch": "house", "data-pdx-led-nm": "x" }));
        }
        host.add(sec);
        const realGet = w.document.getElementById;
        w.document.getElementById = (id) =>
          (id === "pdx-issue-file-ledger" ? host : realGet.call(w.document, id));
        w.pdxDoor1Slice("dir", "against");
        w.PDXDoor1._sliceApply();
        w.document.getElementById = realGet;
        void root;
        return say.textContent.indexOf("on screen") < 0 && say.textContent.indexOf("3 of 3") >= 0;
      },
    },
  ];
  for (const pr of probes) {
    const caught = await pr.run();
    ok(caught, `LOAD-BEARING PROBE NOT CAUGHT — ${pr.name}`);
    console.log(`      · ${pr.name} → ${caught ? "caught" : "NOT CAUGHT"}`);
  }
}

// ── THE PASS SHIPS BEHIND A BUMP ────────────────────────────────────────────
{
  const v = Number(String((SW.match(/const CACHE_VERSION = 'v(\d+)'/) || [])[1] || 0));
  must(v > 0, "CACHE_VERSION is not readable from sw.js any more");
  ok(v >= 124, `sw.js CACHE_VERSION is v${v} — this pass changed issue-file.js, issue-file.css, ` +
    `door1-workspace.js AND door1-workspace.css, all four precached. The stylesheet is the loud one: ` +
    `without the bump a warm device paints the filter row, accepts a press, and then shows every row ` +
    `the slice just hid, because the old sheet has no [hidden] rule for a person row`);
  has(SW, "const SHELL_CACHE = `politidex-shell-${CACHE_VERSION}`",
    "the shell cache name no longer carries CACHE_VERSION, so a bump does not drop the stale panel");
  console.log(`      v${v} · panel, stylesheet and desk travel together`);
}

// ── THE FIXES ARE LOAD-BEARING ──────────────────────────────────────────────
// Four probes, each removing one of the four things this pass added, each
// expected to be CAUGHT by the claims above. A probe that returns false means
// the harness would not have noticed.
{
  const probes = [
    {
      name: "the letterhead counts for itself instead of asking the desk",
      run: () => {
        // The one shape this pass exists to prevent: a second census engine. If
        // the panel derived the people count from the census's bands rather than
        // printing the count the desk published, the two would agree today and
        // drift the first time a band changed. The probe substitutes a locally
        // summed figure and the source audit's ban on arithmetic must catch it.
        const src = PANEL.replace(
          "    if (c.people) {",
          "    var own = 0; (c.bands || []).forEach(function (b) { own += Math.max(0, b.n); });\n    if (own) {");
        must(src !== PANEL, "probe 1 matched nothing — the inventory line was reworded");
        const CODE = src.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, "");
        return CODE.indexOf("Math.") >= 0;
      },
    },
    {
      name: "the busy gate is removed and the inventory publishes early",
      run: async () => {
        const src = PANEL.replace(
          "  function reading(c) { return !!(c && (c.cold || c.pending));  }",
          "  function reading(c) { return !!(c && false && c.pending);  }");
        must(src !== PANEL, "probe 2 matched nothing — the busy gate was reworded");
        const w = boot({ path: `/i/${LKEY}`, panel: src });
        await arriveAt(w);
        const head = headOf(w);
        const body = ledgerOf(w);
        // The body is still reading and the head has published integers anyway.
        return body.indexOf("Reading the full record for") >= 0 &&
               head.indexOf("pdxif-inv") >= 0 &&
               /\d/.test(head.replace(/<[^>]*>/g, " "));
      },
    },
    {
      name: "the crumb goes back to being a link at /i/<core>",
      run: async () => {
        const src = PANEL.replace(
          "' onclick=\"return window.PDXIssueFile.familyJump(\\'' + jsq(c.core) + '\\')\"' +",
          "' href=\"/i/' + esc(c.core) + '\"' +");
        must(src !== PANEL, "probe 3 matched nothing — the crumb's family half was reworded");
        const w = boot({ path: `/i/${LKEY}`, panel: src });
        await arriveAt(w);
        const ch = String(w.document.getElementById("pdx-issue-file-chrome").innerHTML);
        return ch.indexOf(`/i/${LCORE}`) >= 0 ||
               ch.indexOf(`familyJump('${LCORE}')`) < 0;
      },
    },
    {
      name: "the no-side band is dropped to make the inventory prettier",
      run: async () => {
        const src = PANEL.replace(
          "      if (!b || !b.n) return;",
          "      if (!b || !b.n || b.id === 'none') return;");
        must(src !== PANEL, "probe 4 matched nothing — the band loop was reworded");
        const w = warmAll(boot({ path: `/i/${LKEY}`, panel: src }));
        await arriveAt(w);
        await tick(); await tick(); await tick();
        w.PDXIssueFile.repaint();
        const head = headOf(w);
        const c = w.PDXDoor1.issueCensus(LKEY);
        const nb = (c.bands || []).find((b) => b.id === "none");
        return !!(nb && nb.n) && head.indexOf(`${nb.n} no side`) < 0;
      },
    },
    {
      name: "the letterhead rebuilds the ledger instead of sitting above it",
      run: async () => {
        // The body's byte equality is the load-bearing claim of this whole file.
        // A letterhead that WRAPPED the host would break it, which is why the
        // head is a sibling appended before it.
        const src = PANEL.replace(
          "    try { host.innerHTML = body; } catch (e) { return false; }",
          "    try { host.innerHTML = headHtml(k) + body; } catch (e) { return false; }");
        must(src !== PANEL, "probe 5 matched nothing — the body's one assignment was reworded");
        const w = warmAll(boot({ path: `/i/${LKEY}`, panel: src }));
        await arriveAt(w);
        const afterArrival = ledgerOf(w) !== w.PDXDoor1.issueProfile(LKEY);
        // …and on a warm open too, which is the sequence the Eye's leaf row and
        // the desk's own "open issue file" control cause.
        w.PDXIssueFile.close();
        w.PDXIssueFile.open(LKEY);
        return afterArrival && ledgerOf(w) !== w.PDXDoor1.issueProfile(LKEY);
      },
    },
  ];
  for (const pr of probes) {
    const caught = await pr.run();
    ok(caught, `LOAD-BEARING PROBE NOT CAUGHT — ${pr.name}`);
    console.log(`      · ${pr.name} → ${caught ? "caught" : "NOT CAUGHT"}`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
if (failures.length) {
  console.error(`\n✗ issue file address: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error(`   · ${f}`);
  process.exit(1);
}
console.log(`\n✓ issue file address: all ${passed} assertions passed — ` +
  `1 address, 1 builder, 2 doors, 1 census, 0 second ledgers\n`);
