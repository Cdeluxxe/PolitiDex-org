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
  vm.runInContext(DESK, ctx, { filename: "door1-workspace.js" });
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

// ── THE PASS SHIPS BEHIND A BUMP ────────────────────────────────────────────
{
  const v = Number(String((SW.match(/const CACHE_VERSION = 'v(\d+)'/) || [])[1] || 0));
  must(v > 0, "CACHE_VERSION is not readable from sw.js any more");
  ok(v >= 123, `sw.js CACHE_VERSION is v${v} — the letterhead changed issue-file.js, issue-file.css ` +
    `and door1-workspace.js, all three precached, so a warm device would keep the old file`);
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
