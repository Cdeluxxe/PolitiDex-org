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
  win.document.body.appendChild = function (c) { if (c && c.id) byId[c.id] = c; return c; };
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
  if (!opts.withoutAddress) vm.runInContext(ADDR, ctx, { filename: "pdx-issue-profile.js" });
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
  has(SW, "'/pdx-issue-family.js'", "the family table is not precached");
  has(SW, "'/door1-workspace.js'", "the desk is not precached");
  has(SW, "'/stance-tree.js'", "the topic tree is not precached");
  // (all-seeing-eye.js is a runtime entry rather than a precached one, which is
  // sw.js's own long-standing choice for it — so it is not asserted here.)
  ok(new RegExp("^// " + ver + " [-\\u2014]", "m").test(SW),
    `sw.js has no prose note for ${ver}`);
  const note = SW.slice(SW.search(new RegExp("^// " + ver + " [-\\u2014]", "m")));
  const noteEnd = note.indexOf("\nconst") > 0 ? note.slice(0, note.indexOf("\nconst")) : note;
  for (const f of ["pdx-issue-profile.js", "door1-workspace.js", "netlify.toml"]) {
    has(noteEnd, f, `the ${ver} note does not name ${f} as travelling with this pass`);
  }
  console.log(`      ${ver} · /i/* → index.html 200 · address module precached`);
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
  eq(globals.join(","), "PDXDoor1,PDXIssueFamily,PDXIssueProfile,PDXShareLinks,addEventListener,pdxDoor1Issue",
    "pdx-issue-profile.js touches a global beyond the desk, the family table, the notice and its own name");
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
  eq(withAddr.PDXIssueProfile.fromPath(), "", "the front page was read as an issue file");
  eq((withAddr.__replaced || []).length, 0, "the address module rewrote the front page's address");
  eq(withAddr.__canonical.attrs.href, ORIGIN + "/",
    "the address module repointed the front page's canonical");
  console.log(`      ${sample.length} formal rows byte-identical with and without the address`);
}

// ═════════════════════════════════════════════════════════════════════════════
if (failures.length) {
  console.error(`\n✗ issue file address: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error(`   · ${f}`);
  process.exit(1);
}
console.log(`\n✓ issue file address: all ${passed} assertions passed — ` +
  `1 address, 1 builder, 2 doors, 0 second ledgers\n`);
