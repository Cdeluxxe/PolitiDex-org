#!/usr/bin/env node
/**
 * test-issue-desk-warm-copy.mjs — a page may not deny what is already on it
 * ─────────────────────────────────────────────────────────────────────────────
 * THE DEFECT THIS FILE OWNS, AND IT WAS LIVE. A reader who opened /i/rural_ag
 * got, in one frame:
 *
 *     Nothing readable yet · still reading 463 on Farmers & Rural Communities
 *     0 people have a readable formal row …
 *     PRIMARY   H.R. 7567 — Farm, Food, and National Security Act
 *
 * Both halves came out of the same builder. They disagreed because they are fed
 * by two different reads: the measure list comes off the static measure index
 * and is there at the first frame, while the census counts people whose formal
 * rows are still in flight and take hundreds of requests to settle. The busy
 * census had been written as though a zero it had not finished earning were a
 * finding about the issue — the empty-while-loading lie, printed three inches
 * above the card that disproves it.
 *
 * WHAT THIS FILE PINS
 *
 *   1. A MEASURE ON THE PAGE OUTRANKS AN ABSENCE. With ≥1 mapped measure in the
 *      ledger, no wording anywhere on the pane calls the key empty, unreadable
 *      or nothing — and the partial headline LEADS with the mapped-measure
 *      integer the cards below already print. With no measure either, the
 *      headline says it is reading and claims nothing.
 *   2. PENDING ROWS ARE A FACT ABOUT THE READ. "People rows still loading — N
 *      not fetched yet." in its own sentence, in its own paragraph, said to be a
 *      property of the request rather than a finding about the issue. The
 *      letterhead over it still publishes no integer while a read is out.
 *   3. A SETTLED KEY SAYS THE NARROW TRUE THING. Once the read is in, a key
 *      holding mapped measures and no readable act says exactly that instead of
 *      reprinting the menu's blank-CALENDAR sentence over a visible card — and a
 *      key with no mapped instrument at all still gets that sentence verbatim,
 *      because no floor moved in this pass.
 *   4. THE BANDS ARE THE PERSON FILE'S. Every band on a settled key is
 *      PDXConsistency.formalPatternIndex.band(rowFor(pid, key)) — asserted row by
 *      row — and the census block re-reads no record and prints no percentage.
 *   5. THE KEY'S BOUNDARY IS READ, NEVER GENERATED. rural_ag has argued scope and
 *      the pane shows it; cost_living has none and says so in the one sentence.
 *   6. ONE MEASURE STILL TEACHES THE MEASURE. Every one-item, one-document lane
 *      in the corpus renders the roll-up: the side in words, one clipped
 *      sentence of the curator's own rationale, the door on the outermost <li>.
 *   7. THE OUTLINE IS ONE ROW AT THE TOP, and the formal-record jump does not
 *      land on the pill hub.
 *   8. NOTHING INTERACTIVE IS NESTED in anything this pane paints.
 *   9. TWIN BOOT — formal tiers and Direction Match are byte-identical to HEAD's,
 *      because this pass changed copy and not one reading.
 *  10. THE FILES TRAVEL TOGETHER behind a CACHE_VERSION that moved with them.
 *  11. THE FIXES ARE LOAD-BEARING. Each one is put back as it shipped broken and
 *      the probe above it has to catch it.
 *
 *   node scripts/test-issue-desk-warm-copy.mjs
 *
 * Real shipped modules in a node:vm sandbox, the real roster, the real register,
 * the real measure index and the offline record corpus. The cold frame is the
 * real cold frame: fetchIssueRecords and fetchCompare are handed promises that
 * never resolve, which is what a browser on a slow network has for the first
 * seconds of the page, and every string asserted below is a string this harness
 * painted out of door1-workspace.js.
 */

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox, ENGINE_FILES } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const HEAD = (f) => {
  try {
    return execFileSync("git", ["show", `HEAD:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  } catch { return null; }
};

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) >= 0, `${msg} — ${JSON.stringify(needle)} missing`);
const no = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) < 0, `${msg} — ${JSON.stringify(needle)} present`);
const section = (t) => console.log(`\n   ── ${t}`);
// A probe that finds nothing fails loudly rather than turning this file into a
// very fast, very green no-op.
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ issue desk warm copy: STALE PROBE — ${msg}`);
  process.exit(2);
};

// The key the bug was reported on: one PRIMARY measure on the static index, and
// no readable formal row anywhere in the offline corpus — which makes it BOTH
// fixtures this file needs, the cold one and the settled-but-mapped one.
const KEY = "rural_ag";
// A key the record settles deep on: five bands, hundreds of rows.
const DEEP = "lands_preserve";
// A key with no mapped instrument at all — the floor's own sentence lives here,
// and the record settles on it holding nobody.
const BARE = "lands_keep_public";
// A key with no mapped instrument and rows still out: the cold frame that has no
// measure to lead with, so it must claim nothing at all.
const COLD_BARE = "lands_local";
const BLANK_SCOPE = "cost_living";
const BILL = "H.R. 7567";
const ORIGIN = "https://www.politidex.fyi";

const corpus = buildCorpus(ROOT);
must(corpus && corpus.byMember && corpus.byMember.size > 300,
  "the record corpus did not load enough members to sweep");

// ── The desk's load order, as index.html defers it ───────────────────────────
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

// ── A mini-DOM just real enough to paint the desk ────────────────────────────
function miniDom(win) {
  const byId = {};
  const mk = (id) => {
    const node = {
      id: id || "", className: "", innerHTML: "", textContent: "", value: "",
      style: {}, dataset: {}, children: [], hidden: false, attrs: {}, firstChild: null,
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
  win.document.querySelector = (sel) => (String(sel).indexOf("canonical") >= 0 ? canonical : null);
  ["pdx-eye-input", "pdx-eye-panel", "pdx-eye", "pdx-eye-clear",
   "pdx-door1-workspace", "pdx-d1-body"].forEach(mk);
  return byId;
}

// The roster's own chamber classifier. compare-hub.js is not in this load order
// (it wants the compare workspace's globals and aborts its IIFE partway through
// here), and the slice chips ask for this export, so it is stubbed exactly the
// way scripts/test-issue-file-address.mjs stubs it and for the same reason.
function browseTypeStub(win) {
  win._pdxBrowseType = function (pid) {
    const d = (win.CMP_DATA || {})[pid];
    const o = String((d && d.office) || "").toLowerCase();
    if (!o) return "other";
    if (o.indexOf("u.s. senat") >= 0) return "senator";
    if (o.indexOf("u.s. rep") >= 0 || o.indexOf("u.s. house") >= 0 || o.indexOf("congress") >= 0) return "representative";
    if (o.indexOf("state sen") >= 0 || o.indexOf("senate president") >= 0) return "state_senator";
    if (o.indexOf("state rep") >= 0 || o.indexOf("state house") >= 0 || o.indexOf("house speaker") >= 0) return "state_rep";
    return "other";
  };
}

// opts.cold — the two reads never come back, and nothing is seeded: the first
// seconds of a real page, held still so the frame can be read.
// opts.desk  — the load-bearing hook: this boot with one line of the shipped
//              builder put back the way it shipped broken.
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
  const p = opts.path || "/";
  win.location = { href: ORIGIN + p, pathname: p, search: "", hash: "", origin: ORIGIN };
  win.history = { replaceState(a, b, u) { win.location.pathname = String(u); }, pushState() {} };
  win.PDXShareLinks = { notice() { return true; } };
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
  if (!opts.cold) {
    // EVERY ROSTER ID GETS A READ, not just the ones the corpus holds rows for:
    // `cold` counts people whose record has not come back, and a member with no
    // formal act on file has a record that came back EMPTY. Warming only the
    // corpus would leave the ledger permanently busy and nothing below could
    // ever be asked what a settled pane says.
    const P = win.CMP_DATA || {};
    const ids = Array.isArray(P) ? P.map((x) => x && x.id) : Object.keys(P);
    must(ids.length > 100, "the roster did not load, so nothing can be warmed");
    for (const pid of ids) {
      if (!pid) continue;
      try { win.PDXVotingRecord.noteMember(pid, corpus.byMember.get(pid) || []); }
      catch { /* not a member surface */ }
    }
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
  } else {
    // The read that is still out. Not a rejection and not an empty answer — both
    // of those are settled states, and the frame under test is the unsettled one.
    win.PDXVotingRecord.fetchIssueRecords = function () { return new Promise(() => {}); };
    win.PDXVotingRecord.fetchCompare = function () { return new Promise(() => {}); };
  }
  win.pdxDoorWork = () => true;
  win.pdxDoor = () => true;
  browseTypeStub(win);
  vm.runInContext(opts.desk || DESK, ctx, { filename: "door1-workspace.js" });
  vm.runInContext(PANEL, ctx, { filename: "issue-file.js" });
  vm.runInContext(ADDR, ctx, { filename: "pdx-issue-profile.js" });
  win.__byId = byId;
  return win;
}

const tick = () => new Promise((r) => setTimeout(r, 0));
const paint = (w) => {
  w.PDXDoor1.sync();
  const h = w.document.getElementById("pdx-d1-body");
  return h ? String(h.innerHTML) : "";
};
// The sequence a reader causes by arriving at /i/<key>: adopt, let the queue
// drain, adopt again the way the panel's own repaint does.
async function arrive(w) {
  const key = w.PDXIssueProfile.adopt();
  await tick(); await tick();
  if (key) w.PDXIssueProfile.adopt();
  return { key, html: paint(w) };
}
// The whole pane a reader sees at /i/<key>: the letterhead, the crumb and the
// ledger. The claims below are about the PANE, because the lie was two blocks of
// one pane disagreeing.
const paneOf = (w, key) =>
  String(w.PDXIssueFile._head(key) || "") + String(w.PDXIssueFile._chrome(key) || "") +
  String(w.PDXDoor1.issueProfile(key) || "");
const visible = (h) => String(h).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const unesc = (t) => String(t).replace(/&amp;/g, "&").replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const ledeOf = (html) => visible((html.match(/<p class="d1-led-n[^"]*">([\s\S]*?)<\/p>/) || [])[1] || "");

const probe = boot({ path: `/i/${KEY}` });
must(probe.PDXDoor1 && typeof probe.PDXDoor1.sync === "function",
  `the desk did not export sync() — boot errors: ${probe.__loadErrors.join(" | ")}`);
must(typeof probe.PDXDoor1.issueProfile === "function", "PDXDoor1.issueProfile is gone");
must(typeof probe.PDXDoor1.issueCensus === "function", "PDXDoor1.issueCensus is gone");
must(probe.PDXIssueFile && typeof probe.PDXIssueFile._head === "function",
  "issue-file.js no longer exposes the letterhead this file reads");
must(probe.ISSUE_MAP && probe.ISSUE_MAP[KEY] && probe.ISSUE_MAP[DEEP] &&
  probe.ISSUE_MAP[BARE] && probe.ISSUE_MAP[COLD_BARE],
  "one of this file's four fixture keys left ISSUE_MAP");
const CS0 = probe.PDXConsistency;
must(CS0 && CS0.formalPatternIndex && typeof CS0.formalPatternIndex.rowFor === "function",
  "PDXConsistency.formalPatternIndex.rowFor is gone — the desk has no engine to borrow");
const FLOOR = (() => {
  const p = CS0.menu && CS0.menu.PHRASES && CS0.menu.PHRASES.no_vehicle;
  return (p && p.note) ? String(p.note) : "";
})();
must(FLOOR.length > 20, "the menu's no_vehicle note is gone — the floor sentence has no owner");

// Every word this pane is forbidden from using about a read that has not come
// back. Each of these was, or is one edit away from being, the reported lie.
const DENIALS = [
  "Nothing readable yet",
  "No readable formal",
  "nothing readable",
  "No record on this issue",
  "no formal record on this key",
];

// ═════════════════════════════════════════════════════════════════════════════
section("1 · a measure on the page outranks an absence");
// ═════════════════════════════════════════════════════════════════════════════
const COLD = await (async () => {
  const w = boot({ cold: true, path: `/i/${KEY}` });
  const r = await arrive(w);
  return { w, key: r.key, pane: paneOf(w, KEY), body: r.html };
})();
{
  const { w, pane, body } = COLD;
  const c = w.PDXDoor1.issueCensus(KEY);
  must(c && c.people === 0 && (c.cold || c.pending),
    `the cold fixture is not cold (people ${c && c.people}, cold ${c && c.cold}, pending ${c && c.pending})`);
  // issueCensus publishes the measure COUNT (the letterhead prints an integer);
  // the array itself is the ledger's, which is what the cards are built from.
  must(c.measures >= 1,
    `${KEY} no longer maps a measure on the measure index — the reported bug needs one on the page`);
  const m = c.measures;

  // THE CARD IS ON THE PAGE. Asserted first, because every claim under it is
  // "the words above this card must not deny it".
  has(body, BILL, `${BILL} is not on the cold frame — the fixture cannot contradict anything`);
  has(body, "PRIMARY", "the cold frame prints no PRIMARY lane");

  // …AND THE WORDS DO NOT DENY IT.
  for (const d of DENIALS) {
    no(pane, d, `the pane calls ${KEY} empty while ${m} mapped measure(s) are printed below the sentence`);
  }
  no(pane, FLOOR, "the blank-calendar sentence is printed over a mapped measure");
  no(body, "d1-empty", "the empty-file paragraph is painted while a read is still out");

  // THE HEADLINE LEADS WITH THE INTEGER THE CARDS BELOW ALREADY PRINT.
  has(body, `<b>${m}</b> measure`, "the partial headline does not lead with the mapped-measure count");
  ok(/^\d+ measure/.test(ledeOf(body)),
    `the partial headline leads with something other than the measure count: ${JSON.stringify(ledeOf(body))}`);
  has(body, "is-partial", "the partial census is not marked as partial for the stylesheet");
  // The grammar of a finished inventory, in either number, over a live read.
  for (const f of ["people have a readable formal row", "person has a readable formal row"]) {
    no(body, f, `the cold lede wears the grammar of a finished inventory ("${f}")`);
  }
  // And a zero it has not earned is not printed as a count at all.
  no(ledeOf(body), "0 ", "the cold lede prints a zero as though it were a count");

  // THE MEASURE LINE SAYS WHERE THE MEASURES CAME FROM. They are off the index,
  // not off anybody's row, which is the whole reason they can be trusted this
  // early — and the list may still grow.
  has(body, "off the measure index", "the busy measure line does not say the measures are off the index");
  no(body, "measures on file so far, off the rows back so far",
    "the busy measure line credits index-sourced measures to the people rows");

  // WITH NO MEASURE EITHER, THE PANE CLAIMS NOTHING. Not "empty" — "reading".
  const w2 = boot({ cold: true, path: `/i/${COLD_BARE}` });
  await arrive(w2);
  const c2 = w2.PDXDoor1.issueCensus(COLD_BARE);
  must(c2 && !c2.people && !c2.measures && (c2.cold || c2.pending),
    `${COLD_BARE} is not the measure-less cold fixture any more ` +
    `(people ${c2 && c2.people}, measures ${c2 && c2.measures}, cold ${c2 && c2.cold})`);
  const b2 = paint(w2);
  has(b2, "Still reading the record", "a cold key with no measure does not say it is still reading");
  no(paneOf(w2, COLD_BARE), FLOOR, "the floor sentence is printed while the read is still out");
  for (const d of DENIALS) no(paneOf(w2, COLD_BARE), d, "a cold key with no measure is called empty");

  console.log(`      cold /i/${KEY}: ${m} measure on file, ${c.cold} rows not fetched · lede "${ledeOf(body)}"`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · pending rows are a fact about the read");
// ═════════════════════════════════════════════════════════════════════════════
{
  const { w, pane, body } = COLD;
  const c = w.PDXDoor1.issueCensus(KEY);

  // The sentence, in the words it was asked for, with the integer in it.
  has(body, "People rows still loading — ", "the pane does not say the people rows are still loading");
  has(body, `People rows still loading — <b>${c.cold}</b> not fetched yet.`,
    "the pending sentence does not name how many rows have not been fetched");
  has(body, "not a finding about this issue",
    "the pending sentence does not say it is a fact about the read rather than about the issue");
  has(body, "d1-led-pend", "the pending sentence has no class of its own to be styled by");
  // Its own paragraph, so it cannot be read as a clause of the census.
  ok(/<p class="d1-led-pend">People rows still loading/.test(body),
    "the pending sentence is not its own paragraph");
  // …and the stylesheet ships the rule that paragraph asks for.
  has(R("door1-workspace.css"), ".d1-led-pend", "door1-workspace.css has no rule for the pending sentence");

  // The rows still out are described as UNFETCHED, never as readable-and-empty.
  no(body, "0 people", "the pane prints a people count of zero while the read is out");

  // THE LETTERHEAD KEEPS ITS OWN RULE. Integer-free while a read is out, which is
  // the claim scripts/test-issue-file-address.mjs owns; re-asserted here because
  // the two blocks disagreeing IS this defect, and they are only ever checked
  // together on one painted pane.
  const head = String(w.PDXIssueFile._head(KEY) || "");
  has(head, "Reading the record on this key", "the letterhead does not say it is reading");
  // Read off the VISIBLE text, the way scripts/test-issue-file-address.mjs reads
  // it: a digit inside a class name or an anchor id is not a published figure.
  const figures = head.replace(/<[^>]*>/g, " ").match(/\d+/g) || [];
  eq(figures.join(","), "",
    `the letterhead published figures (${figures.join(", ")}) while the record read was still out`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · a settled key says the narrow true thing, and the floor did not move");
// ═════════════════════════════════════════════════════════════════════════════
const WARM = boot({ path: `/i/${KEY}` });
{
  await arrive(WARM);
  await tick(); await tick(); await tick();
  const c = WARM.PDXDoor1.issueCensus(KEY);
  must(c && !c.cold && !c.pending,
    `${KEY} did not settle in this harness (cold ${c && c.cold}, pending ${c && c.pending})`);
  must(c.people === 0 && c.measures >= 1,
    `${KEY} is no longer the settled-but-mapped fixture (people ${c.people}, measures ${c.measures})`);
  const body = paint(WARM);
  const pane = paneOf(WARM, KEY);
  const m = c.measures;

  // The settled wording returns unhedged — the gate is the read, not the size of
  // the number — and it is now the narrow claim rather than the calendar's.
  has(body, `<b>0</b> people have a readable formal row`,
    "a settled empty key no longer prints its count straight");
  no(body, "is-partial", "the settled census is still marked partial");
  no(body, "People rows still loading", "the settled census still says rows are loading");
  has(body, `${m} measure`, "the settled empty lane does not name the measures on file");
  has(body, "the absence is of acts, not of the issue",
    "the settled empty lane does not say what the absence is of");
  no(pane, FLOOR, "the blank-calendar sentence is still printed over a mapped measure");
  has(body, BILL, `${BILL} left the settled frame`);

  // AND THE FLOOR DID NOT MOVE. A key with no mapped instrument at all still gets
  // the menu's own sentence, verbatim, from the menu.
  const wb = boot({ path: `/i/${BARE}` });
  await arrive(wb);
  await tick(); await tick(); await tick();
  const cb = wb.PDXDoor1.issueCensus(BARE);
  must(cb && !cb.cold && !cb.pending && !cb.people && !cb.measures,
    `${BARE} is not the settled measure-less fixture any more`);
  const bb = paint(wb);
  has(bb, FLOOR, "a key with no mapped instrument lost the floor's own sentence");
  has(bb, `<b>0</b> people have a readable formal row`, "the bare key stopped printing its count straight");
  console.log(`      settled /i/${KEY}: 0 readable, ${m} on file · /i/${BARE} keeps the floor sentence`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the bands are the person file's, row by row");
// ═════════════════════════════════════════════════════════════════════════════
{
  const w = boot({ path: `/i/${DEEP}` });
  await arrive(w);
  await tick(); await tick(); await tick();
  const c = w.PDXDoor1.issueCensus(DEEP);
  must(c && !c.cold && !c.pending && c.people > 100,
    `${DEEP} did not settle deep in this harness (people ${c && c.people}, cold ${c && c.cold})`);
  const led = w.PDXDoor1._ledger(null, DEEP);
  const F = w.PDXConsistency.formalPatternIndex;
  let checked = 0;
  const drift = [];
  for (const b of (led.bands || [])) {
    for (const r of b.rows) {
      checked++;
      let want = "";
      try { want = F.band(F.rowFor(r.pid, DEEP)) || ""; } catch { want = ""; }
      if (want !== r.band) drift.push(`${r.pid}: desk ${r.band} vs engine ${want}`);
    }
  }
  ok(checked > 100, `only ${checked} rows to check against the engine`);
  eq(drift.slice(0, 4).join(" | "), "",
    `${drift.length} of ${checked} band(s) are the desk's own reading rather than formalPatternIndex's`);
  // The five figures sum to the headline, because each is the length of a list
  // this pane prints.
  eq((led.bands || []).reduce((n, b) => n + b.rows.length, 0), led.people,
    "the band figures do not sum to the census headline");

  // …AND THE CENSUS BLOCK DOES NOT CHARACTERISE. The copy this pass rewrote lives
  // between ledgerBusy() and censusHtml(); it may read integers off the ledger and
  // nothing else. A record read, a re-characterisation or a percentage in here is
  // a second engine, however small.
  const from = DESK.indexOf("function ledgerBusy");
  const to = DESK.indexOf("function censusHtml");
  must(from > 0 && to > from, "the census copy block is no longer bracketed by ledgerBusy and censusHtml");
  const block = DESK.slice(from, to).replace(/^[ \t]*\/\/.*$/gm, "");
  for (const banned of ["PDXVotingRecord", "PDXConsistency", "fetchCompare", "rowFor(", "%", "toFixed", "Math."]) {
    no(block, banned, `the census copy reaches for "${banned}" to describe what it does not know yet`);
  }
  // No percentage and no party token in anything this desk WRITES, cold or warm.
  // The office line under a name is the roster's own title — "House Republican
  // Conference Chair" is a job, not a caucus read — so it is stripped before the
  // party sweep exactly as the desk's own header note describes: no party token
  // may be in the markup the desk composes, and the roster's titles are not that.
  const departy = (h) => String(h).replace(/<span class="d1-led-o">[\s\S]*?<\/span>/g, " ");
  for (const [label, html] of [["cold", COLD.body], ["settled", paint(w)]]) {
    no(html, "%", `a percentage reached the ${label} issue pane`);
    for (const t of ["Republican", "Democrat", "GOP", "party-line", "party line", "across the aisle"]) {
      no(departy(html), t, `a party token reached the ${label} issue pane`);
    }
  }
  // …and the desk's source carries no party vocabulary of its own to print.
  const deskCode = DESK.replace(/^[ \t]*\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
  for (const t of ["Republican", "Democrat", "GOP", "party-line"]) {
    no(deskCode, t, `door1-workspace.js writes the party token "${t}"`);
  }
  console.log(`      ${checked} rows on /i/${DEEP}; every band read off formalPatternIndex`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the key's boundary is read, never generated");
// ═════════════════════════════════════════════════════════════════════════════
{
  const S = probe.PDXIssueScope;
  must(S && typeof S.read === "function", "PDXIssueScope.read is gone");
  const sc = S.read(KEY);
  must(sc, `${KEY} is not readable by the scope table at all`);
  ok(sc.defined === true,
    `${KEY} lost the argued boundary the last pass transcribed into issue-scope.js`);
  ok(String(sc.inn || "").length > 40, `${KEY}'s "covers" prose is missing or a fragment`);
  ok(String(sc.out || "").length > 40, `${KEY}'s "does not cover" prose is missing or a fragment`);
  const pane = paneOf(WARM, KEY);
  has(pane, "pdxis-key", `the \u24D8 control is not on the ${KEY} pane`);

  // The blank key still says the one honest sentence and invents no pole.
  const bs = S.read(BLANK_SCOPE);
  must(bs, `${BLANK_SCOPE} left ISSUE_MAP`);
  eq(bs.defined, false, `${BLANK_SCOPE} grew a scope entry — no definition may be generated`);
  eq(bs.inn, "", `${BLANK_SCOPE} was given a "covers" line it has not argued`);
  eq(bs.out, "", `${BLANK_SCOPE} was given a "does not cover" line it has not argued`);
  eq(S.SCOPE[BLANK_SCOPE], undefined, `${BLANK_SCOPE} is in the scope table`);
  const NO_DEF = S.NO_DEF || "";
  eq(NO_DEF, "No definition on file yet.", "the blank-scope sentence changed wording");
  const bh = String(S.controlHtml(BLANK_SCOPE) || "") + String(S.cardHtml(BLANK_SCOPE) || "");
  has(bh, NO_DEF, `${BLANK_SCOPE} does not say it has no definition on file`);

  // Neither key's boundary is written by a machine: the table is prose in the
  // repo, argued key by argued key, and it does not cover the register.
  const total = Object.keys(probe.ISSUE_MAP).length;
  const scoped = Object.keys(probe.ISSUE_MAP).filter((k) => (S.read(k) || {}).defined);
  ok(scoped.length > 0 && scoped.length < total,
    `${scoped.length} of ${total} keys have scope — a table that covers the whole register was generated`);
  console.log(`      ${KEY}: ${String(sc.inn).length}B covers / ${String(sc.out).length}B does-not · ` +
    `${BLANK_SCOPE}: "${NO_DEF}" · ${scoped.length}/${total} keys argued`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · one measure still teaches the measure");
// ═════════════════════════════════════════════════════════════════════════════
{
  const CS = WARM.PDXConsistency;
  must(typeof CS.dossierDriversHtml === "function", "PDXConsistency.dossierDriversHtml is gone");
  const solos = [];
  for (const [pid, recs] of corpus.byMember) {
    const keys = new Set(recs.flatMap((x) => (x.issues || []).map((i) => i.issueKey)).filter(Boolean));
    for (const k of keys) {
      let d = null;
      try { d = CS.dossierDrivers(pid, k); } catch { d = null; }
      if (d && d.items === 1 && d.docs === 1) solos.push([pid, k]);
    }
  }
  ok(solos.length > 0, "no one-item lane in the whole corpus — the 1-item roll-up cannot be checked");
  const bad = [];
  const WORDS = ["advanced", "against", "took no side", "not scorable"];
  for (const [pid, k] of solos) {
    const h = CS.dossierDriversHtml(pid, k) || "";
    if (!h) { bad.push(`${pid}/${k}: no roll-up at one item`); continue; }
    if (h.indexOf("Which measure this came from") < 0) bad.push(`${pid}/${k}: plural or missing heading`);
    if (h.indexOf("Which measures this came from") >= 0) bad.push(`${pid}/${k}: one measure announced as measures`);
    if (!/<li class="pdxgap-drv-r[^"]*" data-pdxdrv-open=/.test(h)) bad.push(`${pid}/${k}: door is not on the outermost <li>`);
    if (h.indexOf(`data-pdxdrv-pid="${pid}"`) < 0) bad.push(`${pid}/${k}: door does not carry whose record it opens`);
    if (h.indexOf("<a ") >= 0 || h.indexOf("<button") >= 0) bad.push(`${pid}/${k}: nested interactive element in the row`);
    if (h.indexOf("1 advanced") >= 0) bad.push(`${pid}/${k}: the side is printed as a count of one`);
    if (!WORDS.some((wd) => h.indexOf(wd) >= 0)) bad.push(`${pid}/${k}: the side is not said in words`);
    const wsp = /<span class="pdxgap-drv-w">([\s\S]*?)<\/span>/.exec(h);
    // Measured on the DECODED sentence: the clip budget is 220 characters of the
    // curator's own text plus an ellipsis, and an escaped ampersand is one of
    // those characters however many bytes the markup spends on it.
    const shown = wsp ? unesc(visible(wsp[1])) : "";
    if (wsp && shown.length < 24) bad.push(`${pid}/${k}: rationale clipped to a fragment "${shown}"`);
    if (wsp && shown.length > 221) bad.push(`${pid}/${k}: rationale is a paragraph (${shown.length} chars)`);
    // Clipped, never rewritten: what prints is a prefix of what the curator wrote.
    let dm = null;
    try { dm = CS.dossierDrivers(pid, k); } catch { dm = null; }
    const g0 = ((dm && dm.rows) || [])[0] || null;
    if (wsp && g0 && g0.why && shown && String(g0.why).indexOf(shown.replace(/…$/, "")) !== 0) {
      bad.push(`${pid}/${k}: the printed sentence is not a prefix of the mapping rationale`);
    }
  }
  eq(bad.slice(0, 4).join(" | "), "",
    `${bad.length} of ${solos.length} one-item lane(s) failed the explainer contract`);
  console.log(`      ${solos.length} one-item lanes swept; every one renders the explainer`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the outline is one row at the top, and the jump is not the hub");
// ═════════════════════════════════════════════════════════════════════════════
{
  const OUT = R("person-outline.js");
  const w = makeSandbox();
  const ctx = vm.createContext(w);
  vm.runInContext(OUT, ctx, { filename: "person-outline.js" });
  const O = w.PDXPersonOutline;
  must(O && typeof O.items === "function" && typeof O.specs === "function",
    "PDXPersonOutline.items/specs are gone");
  // `present` is injected, which is how this module is testable without a
  // browser: a file where every stage mounted is the file a reader of a
  // well-populated profile gets.
  const rows = O.items("member", () => true);
  ok(rows.length >= 4, `the outline offers only ${rows.length} row(s) on a fully mounted file`);
  const tops = rows.filter((i) => /top of file/i.test(String(i.label || "")));
  eq(tops.length, 1, `the outline offers ${tops.length} "Top of file" rows`);
  eq(rows.filter((i) => /^letterhead$/i.test(String(i.label || ""))).length, 0,
    "the outline still offers a separate Letterhead row");
  // ONE ROW AT THE TOP. The brief is not a second row beside it; it hands its
  // element to that row's spy so the top stays lit while the brief is on screen.
  eq(rows.filter((i) => i.key === "brief").length, 0,
    "Formal record is a second row beside Top of file again");
  const top = tops[0];
  ok((top.spy || []).indexOf(".pdxsp-stage-brief") >= 0,
    "the brief stage is not watched under the top row — the merge dropped the spy");
  eq(top.focus, ".profile-name",
    "the top row hands a keyboard reader something other than the person's name");
  // …AND THE JUMP DOES NOT LAND ON THE PILL HUB. Neither as a destination nor as
  // what a keyboard reader is handed.
  const hubs = rows.filter((i) => /hub/.test(String(i.target || "")) || /hub/.test(String(i.focus || "")));
  eq(hubs.length, 0, `${hubs.length} outline row(s) land on the pill hub`);
  // The formal-record stage IS reachable — as the top of a file that has no
  // letterhead, which is the only case where it takes a line of its own.
  const briefOnly = O.items("member", (t) => t !== ".pdxsp-stage-identity");
  const bo = briefOnly.filter((i) => i.key === "brief");
  eq(bo.length, 1, "a file with no letterhead lost its Formal record row entirely");
  eq(bo[0] && bo[0].target, ".pdxsp-stage-brief", "the fallback row points somewhere else");
  // The spy releases the top row when the topic tree is on screen: the tree is
  // the explore row's own first destination, so it lights explore and not the top.
  const ex = rows.filter((i) => i.key === "explore")[0] || null;
  must(ex, "the outline no longer offers the topic tree as a row");
  eq(ex.label, "All issues by topic", "the explore row was renamed");
  eq(ex.target, "#pdxsec-stancetree", "the explore row does not take the topic tree section first");
  const plan = O.spyPlan(rows) || [];
  const treeWatch = plan.filter((x) => x.target === "#pdxsec-stancetree");
  eq(treeWatch.length, 1, "the topic tree is watched by more or fewer than one row");
  eq(treeWatch[0] && treeWatch[0].key, "explore",
    "the topic tree lights a row other than All issues by topic — the top row never releases");
  console.log(`      ${rows.length} outline rows: ${rows.map((i) => i.label).join(" · ")}`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · nothing interactive is nested in what this pane paints");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The rule, restated because it is the one that silently eats markup: an <a> or
  // a <button> inside another interactive element makes the parser close the outer
  // one at the nested tag, and every span after it leaves the row.
  const panes = [["cold", COLD.body], ["settled", paint(WARM)],
                 ["letterhead", String(WARM.PDXIssueFile._head(KEY) || "")]];
  for (const [label, html] of panes) {
    const buttons = html.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) || [];
    const nested = buttons.filter((b) => /<a\b|<button\b/.test(b.slice(b.indexOf(">") + 1)));
    eq(nested.length, 0, `${nested.length} button(s) on the ${label} pane contain a nested interactive element`);
    const anchors = html.match(/<a\b[^>]*>[\s\S]*?<\/a>/g) || [];
    const nestedA = anchors.filter((a) => /<a\b|<button\b/.test(a.slice(a.indexOf(">") + 1)));
    eq(nestedA.length, 0, `${nestedA.length} anchor(s) on the ${label} pane contain a nested interactive element`);
  }
  ok((paint(WARM).match(/<button\b/g) || []).length > 0, "the settled pane paints no control at all to check");
}

// ═════════════════════════════════════════════════════════════════════════════
section("9 · twin boot — formal tiers and Direction Match are byte-identical");
// ═════════════════════════════════════════════════════════════════════════════
{
  const engine = (get) => {
    const win = makeSandbox();
    const ctx = vm.createContext(win);
    win.PROFILES = win.CMP_DATA;
    for (const f of [...ENGINE_FILES, "voting-record.js"]) {
      const src = get(f);
      if (src === null) continue;
      vm.runInContext(src, ctx, { filename: f });
    }
    win.PROFILES = win.CMP_DATA;
    for (const [pid, recs] of corpus.byMember) {
      try { win.PDXVotingRecord.noteMember(pid, recs); } catch { /* not a member surface */ }
    }
    return win;
  };
  const A = engine(HEAD);
  const B = engine(R);
  must(A.PDXConsistency && typeof A.PDXConsistency.scopedOverall === "function", "HEAD's consistency.js did not boot");
  must(B.PDXWordAction && typeof B.PDXWordAction.read === "function", "the working tree's word-action.js did not boot");
  const scopes = Object.keys(B.PDXConsistency.SCOPES);
  must(scopes.length > 0, "PDXConsistency.SCOPES is empty");
  const drift = [];
  let swept = 0;
  for (const [pid] of corpus.byMember) {
    swept++;
    for (const sc of scopes) {
      if (JSON.stringify(A.PDXConsistency.scopedOverall(sc, pid)) !==
          JSON.stringify(B.PDXConsistency.scopedOverall(sc, pid))) drift.push(`${pid}/${sc}`);
    }
    if (JSON.stringify(A.PDXWordAction.read(pid)) !== JSON.stringify(B.PDXWordAction.read(pid))) drift.push(`${pid}/match`);
    if (JSON.stringify(A.PDXConsistency.formalPatternIndex.shape(pid)) !==
        JSON.stringify(B.PDXConsistency.formalPatternIndex.shape(pid))) drift.push(`${pid}/formal`);
  }
  ok(swept > 300, `the twin boot only swept ${swept} files`);
  eq(drift.slice(0, 8).join(" | "), "",
    `${drift.length} formal tier / Direction Match read(s) moved — this pass rewrote copy and must move none`);
  console.log(`      ${swept} files swept across ${scopes.length} scopes; no tier or match read moved`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("10 · the files travel together");
// ═════════════════════════════════════════════════════════════════════════════
{
  const SW = R("sw.js");
  const m = /const CACHE_VERSION = 'v(\d+)';/.exec(SW);
  must(m, "CACHE_VERSION is not in sw.js in the form this file reads");
  const prev = HEAD("sw.js");
  if (prev) {
    const pm = /const CACHE_VERSION = 'v(\d+)';/.exec(prev);
    if (pm) ok(Number(m[1]) > Number(pm[1]),
      `CACHE_VERSION did not move past HEAD's v${pm[1]} — warm devices would keep printing the denial`);
  }
  has(SW, `// v${m[1]} - `, `sw.js has no prose log entry for v${m[1]}`);
  // Both halves of this pass are shell assets, and the note names them, because a
  // warm device that took one and not the other is the failure this bump prevents.
  const note = SW.slice(SW.indexOf(`// v${m[1]} - `), SW.indexOf("const CACHE_VERSION"));
  for (const f of ["door1-workspace.js", "door1-workspace.css"]) {
    has(note, f, `the v${m[1]} note does not name ${f}`);
    ok(new RegExp(`['"]/?${f.replace(".", "\\.")}['"]`).test(SW) || SW.indexOf("/" + f) >= 0,
      `${f} is not in the precached shell`);
  }
  console.log(`      shell v${m[1]}; both files named in the note and precached`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("11 · the fixes are load-bearing");
// ═════════════════════════════════════════════════════════════════════════════
// Each probe puts one line back the way it shipped broken and asserts that the
// section above CATCHES it. Without these, every claim in this file is one
// deleted branch away from being vacuous.
{
  const brk = async (label, patch, check) => {
    const src = patch(DESK);
    must(src !== DESK, `the load-bearing probe for ${label} patched nothing — the code moved`);
    const w = boot({ cold: true, path: `/i/${KEY}`, desk: src });
    await arrive(w);
    const out = { body: paint(w), pane: paneOf(w, KEY) };
    ok(check(out), `breaking ${label} was not caught by the probes above`);
  };
  const warmBrk = async (label, patch, check) => {
    const src = patch(DESK);
    must(src !== DESK, `the load-bearing probe for ${label} patched nothing — the code moved`);
    const w = boot({ path: `/i/${KEY}`, desk: src });
    await arrive(w);
    await tick(); await tick(); await tick();
    ok(check({ body: paint(w), pane: paneOf(w, KEY) }),
      `breaking ${label} was not caught by the probes above`);
  };

  // (a) The headline stops preferring the mapped measure: back to a word for
  //     nothing over a printed card.
  await brk("the measure-first headline",
    (s) => s.replace(
      "    var n = led.people, m = (led.measures || []).length;\n    if (n) return '<b>' + n + '</b> readable so far';",
      "    var n = led.people, m = (led.measures || []).length;\n    if (n) return '<b>' + n + '</b> readable so far';\n    if (m) return 'Nothing readable yet';"),
    (o) => o.body.indexOf("Nothing readable yet") >= 0 && !/^\d+ measure/.test(ledeOf(o.body)));

  // (b) The pending sentence is dropped: the unfetched rows stop being described
  //     as a fact about the read at all.
  await brk("the pending-rows sentence",
    (s) => s.replace("      pendingRowsHtml(led) +\n", "      '' +\n"),
    (o) => o.body.indexOf("People rows still loading") < 0);

  // (c) The settled floor stops being measure-aware: the calendar sentence is
  //     printed over a visible PRIMARY card again.
  await warmBrk("the measure-aware settled floor",
    (s) => s.replace("      var mapped = (led.measures || []).length;", "      var mapped = 0;"),
    (o) => o.body.indexOf(FLOOR) >= 0 && o.body.indexOf(BILL) >= 0);

  // (d) The busy measure line stops naming the index as its source.
  await brk("the busy measure line's provenance",
    (s) => s.replace("off the measure index, not off anybody\\u2019s row. ", ""),
    (o) => o.body.indexOf("off the measure index") < 0);
  console.log("      4 restored defects, 4 caught");
}

// ─────────────────────────────────────────────────────────────────────────────
console.log("");
if (failures.length) {
  console.error(`✗ issue desk warm copy: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error(`  · ${f}`);
  process.exit(1);
}
console.log(`✓ issue desk warm copy: the desk never denies what the page is printing — ${passed} assertions passed\n`);
