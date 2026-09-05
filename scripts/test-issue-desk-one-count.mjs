#!/usr/bin/env node
/**
 * test-issue-desk-one-count.mjs — one fact, one integer; one measure, one count
 * ─────────────────────────────────────────────────────────────────────────────
 * THREE DEFECTS, ALL OF THEM A FIGURE PRINTED MORE TIMES THAN IT IS TRUE, OR
 * PRINTED TWO WAYS AT ONCE. All three were live.
 *
 *  1. THE PENDING COUNT, FOUR TIMES. A reader who opened a cold /i/rural_ag got
 *     the same outstanding-rows integer in four sentences of one frame:
 *
 *         1 measure on file maps here · still reading 463 on Farmers & Rural…
 *         People rows still loading — 463 not fetched yet. …
 *         Not the count for this key. It is what has come back so far, with 463
 *           more records still being read — …
 *         Reading the full record for 463 more people on this key…
 *
 *     One fact about one fetch. A reader who notices is reading a page anxious
 *     about its own request; a reader who does not read them as one number is
 *     hunting for the difference between four figures that are the same. And
 *     repetition is how a number becomes the SUBJECT of a page: 463 was the
 *     loudest thing on a file about farm policy, louder than the farm bill
 *     listed under it. The honesty was never the problem — the pane must say a
 *     read is out — so the three duplicates keep their sentences and lose the
 *     integer, each of them falling back to the countless branch it already
 *     shipped for the case where nobody is cold.
 *
 *  2. TWO ANSWERS TO "HOW MANY MEASURES". The pane's own badge and /i/<key>'s
 *     letterhead read the ledger's union of index-mapped and act-discovered
 *     measures. Every surface OUTSIDE the pane — in practice the Eye's key card
 *     — read a second function that saw the static index only. They disagreed
 *     out loud and by a lot: on the settled sweep below, 29 tracked keys get a
 *     different answer from the two readers — climate_action 3 against 10,
 *     border_security 2 against 6, broadband 0 against 2. A reader told "2
 *     measures on file map here" by the card, who then opens the file that card
 *     links to and is told "9 measures mapped", has no way to decide which
 *     number the app means, and both of them are the app talking.
 *
 *  3. A CLIPPED READ LOOKED FINISHED. A truncated roll-call batch is the one
 *     failure of that fetch that arrives looking like a success: nothing is
 *     pending, nobody is cold, so both surfaces switch to the settled grammar
 *     over a record the data layer cut off at a row cap. The ranking has always
 *     said so in its own sentence; the desk and the file had no way to.
 *
 * WHAT THIS FILE PINS
 *
 *   1. THE OUTSTANDING COUNT IS STATED ONCE. On the real cold frame the integer
 *      appears exactly once in the visible pane, in the sentence whose whole
 *      subject is the fetch — and each of the three former copies is checked
 *      absent in its own wording, so a revert of any one of them fails here.
 *   2. THE THREE SENTENCES SURVIVE COUNTLESS. Dropping a duplicate integer may
 *      not drop the disclosure: the lede still says a read is out, the partial
 *      note still says the figures are not the key's count, and the announced
 *      status line is still announced.
 *   3. ONE MEASURE COUNT. For every tracked key the ledger's badge, the census
 *      the letterhead prints from, and the export every other surface reads all
 *      return the same union — and it really is the union, not a re-aliased
 *      index: the keys that used to disagree are named and swept.
 *   4. A CLIPPED READ SAYS SO, ON BOTH SURFACES, IN ONE WORDING — the ranking's
 *      own, character for character, and the letterhead still publishes the
 *      figures it has rather than hiding them.
 *   5. v134 HOLDS. No pane says "nothing readable" over a printed PRIMARY card,
 *      and the letterhead publishes no integer while a read is out.
 *   6. THE FILES TRAVEL TOGETHER behind a CACHE_VERSION that moved and a note
 *      that names every one of them.
 *   7. THE FIXES ARE LOAD-BEARING. Each is put back the way it shipped and the
 *      probe above it has to catch it.
 *
 *   node scripts/test-issue-desk-one-count.mjs
 *
 * Real shipped modules in a node:vm sandbox, the real roster, the real register,
 * the real measure index and the offline record corpus. The cold frame is the
 * real cold frame: fetchIssueRecords and fetchCompare are handed promises that
 * never resolve, which is what a browser on a slow network has for the first
 * seconds of the page. Every string asserted below is a string this harness
 * painted out of the shipped builders.
 */

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
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
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ issue desk one count: STALE PROBE — ${msg}`);
  process.exit(2);
};

// The key the four-integer frame was reported on: one PRIMARY measure on the
// static index, no readable formal row anywhere in the offline corpus.
const KEY = "rural_ag";
const BILL = "H.R. 7567";
// The key the work order names for the measure split. In this corpus its two
// surfaces already agreed; the twenty keys that did NOT are swept in section 3
// by name, so the claim does not rest on one fixture.
const SPLIT = "cost_living";
// A key the record settles deep on, for the clipped-read frame: the letterhead
// has real integers to publish there, which is the case the caveat is for.
const DEEP = "climate_action";
const ORIGIN = "https://www.politidex.fyi";

const corpus = buildCorpus(ROOT);
must(corpus && corpus.byMember && corpus.byMember.size > 300,
  "the record corpus did not load enough members to sweep");

// ── The desk's load order, as index.html defers it ───────────────────────────
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "pdx-issue-family.js", "acct-spotlight-data.js", "say-vs-do.js",
  "exec-action-data.js", "exec-record.js", "exec-record-ui.js", "consistency.js",
  "voting-record.js", "inventory.js", "issue-scope.js", "word-action.js",
  "profile-spine.js", "issue-colors.js", "my-stances.js", "person-link.js",
  "bills-index.js", "bills.js", "bill-detail.js", "claim-check.js", "issue-view.js",
];
const SRC = FILES.map((f) => [f, R(f)]);
const DESK = R("door1-workspace.js");
const PANEL = R("issue-file.js");
const ADDR = R("pdx-issue-profile.js");

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

// compare-hub.js is not in this load order (it wants the compare workspace's
// globals and aborts its IIFE partway through here), and the slice chips ask for
// this export, so it is stubbed exactly the way the sibling desk suites stub it.
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

// opts.cold      — the two reads never come back and nothing is seeded: the
//                  first seconds of a real page, held still so it can be read.
// opts.truncated — the batch comes back CLEAN AND SHORT, which is the one
//                  failure of this fetch that looks like a success.
// opts.desk      — the load-bearing hook: this boot with one line of the shipped
//                  builder put back the way it shipped.
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
      return Promise.resolve({ byPid, truncated: !!opts.truncated });
    };
    win.PDXVotingRecord.fetchCompare = function () { return Promise.resolve({ byPid: {} }); };
  } else {
    win.PDXVotingRecord.fetchIssueRecords = function () { return new Promise(() => {}); };
    win.PDXVotingRecord.fetchCompare = function () { return new Promise(() => {}); };
  }
  win.pdxDoorWork = () => true;
  win.pdxDoor = () => true;
  browseTypeStub(win);
  vm.runInContext(opts.desk || DESK, ctx, { filename: "door1-workspace.js" });
  vm.runInContext(opts.panel || PANEL, ctx, { filename: "issue-file.js" });
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
// The sequence a reader causes by arriving at /i/<key>.
async function arrive(w) {
  const key = w.PDXIssueProfile.adopt();
  await tick(); await tick();
  if (key) w.PDXIssueProfile.adopt();
  return { key, html: paint(w) };
}
// The whole pane a reader sees at /i/<key>: letterhead, crumb and ledger. The
// claims below are about the PANE, because a duplicate integer is a property of
// the frame and not of any one builder.
const paneOf = (w, key) =>
  String(w.PDXIssueFile._head(key) || "") + String(w.PDXIssueFile._chrome(key) || "") +
  String(w.PDXDoor1.issueProfile(key) || "");
const visible = (h) => String(h).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const para = (html, cls) =>
  visible((String(html).match(new RegExp(`<p class="${cls}"[^>]*>([\\s\\S]*?)</p>`)) || [])[1] || "");
const countOf = (text, n) =>
  (String(text).match(new RegExp(`(?<![\\d,.])${n}(?![\\d,.])`, "g")) || []).length;

const probe = boot({ path: `/i/${KEY}` });
must(probe.PDXDoor1 && typeof probe.PDXDoor1.sync === "function",
  `the desk did not export sync() — boot errors: ${probe.__loadErrors.join(" | ")}`);
must(typeof probe.PDXDoor1.issueCensus === "function", "PDXDoor1.issueCensus is gone");
must(typeof probe.PDXDoor1.issueMeasures === "function",
  "PDXDoor1.issueMeasures is gone — the export every non-pane surface reads has no owner");
must(typeof probe.PDXDoor1._ledger === "function", "PDXDoor1._ledger is gone");
must(typeof probe.PDXDoor1.trackedKeys === "function", "PDXDoor1.trackedKeys is gone");
must(probe.PDXIssueFile && typeof probe.PDXIssueFile._head === "function",
  "issue-file.js no longer exposes the letterhead this file reads");
must(probe.PDXIssueView && typeof probe.PDXIssueView.truncNote === "function",
  "issue-view.js does not export truncNote() — the one wording has no owner");
must(typeof probe.PDXIssueView.votesTruncated === "function",
  "issue-view.js does not export votesTruncated() — the desk has no flag to read");
must(probe.ISSUE_MAP && probe.ISSUE_MAP[KEY] && probe.ISSUE_MAP[SPLIT] && probe.ISSUE_MAP[DEEP],
  "one of this file's three fixture keys left ISSUE_MAP");

// Every word this pane is forbidden from using about a read that has not come
// back — the v134 rule, re-checked here because this pass edited the sentences
// that carry it.
const DENIALS = [
  "Nothing readable yet", "No readable formal", "nothing readable",
  "No record on this issue", "no formal record on this key",
];

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the outstanding count is stated exactly once");
// ═════════════════════════════════════════════════════════════════════════════
const COLD = boot({ cold: true, path: `/i/${KEY}` });
{
  await arrive(COLD);
  const c = COLD.PDXDoor1.issueCensus(KEY);
  must(c && c.cold > 0,
    `the cold fixture left no rows outstanding, so there is no count to de-duplicate (cold ${c && c.cold})`);
  must(c.measures > 0,
    `${KEY} has no mapped measure in this corpus, so the frame under test is not the reported one`);
  // THE MAGNITUDE IS NOT THE CLAIM, AND IT IS NOT STABLE. The report was 463
  // outstanding rows; this offline corpus is smaller and the same frame comes out
  // in single figures. What matters is that the integer is printed once, which is
  // a property of the FRAME rather than of the number — and the counterfactuals
  // in section 7 put each of the three removed copies back and require the count
  // to rise, so this assertion cannot be satisfied by a small fixture.
  const pane = paneOf(COLD, KEY);
  const txt = visible(pane);
  const n = String(c.cold);

  // THE WHOLE CLAIM, IN ONE ASSERTION. Not "the lede dropped it" — the pane, as
  // a reader sees it, contains that integer once.
  eq(countOf(txt, n), 1,
    `the outstanding-rows count ${n} appears ${countOf(txt, n)} times in the visible pane. One fact\n` +
    "    about one fetch gets one integer: a reader who meets it four times is either reading a page\n" +
    "    anxious about its own request, or reading four figures and hunting for the difference");

  // AND IT IS IN THE RIGHT SENTENCE — the one whose entire subject is the fetch.
  const pend = para(pane, "d1-led-pend");
  has(pend, `${n} not fetched yet`,
    "the surviving integer is not in the people-rows sentence. Dropping the duplicates was a\n" +
    "    de-duplication and not a suppression: the figure has to live somewhere, and it belongs in\n" +
    "    the sentence that is about the request rather than about the issue");
  has(pend, "a fact about this read, not a finding about this issue",
    "the people-rows sentence stopped saying what kind of statement it is");

  // EACH FORMER COPY, ABSENT IN ITS OWN WORDING. Three separate probes, because
  // an occurrence count could be satisfied by a coincidence and a revert of any
  // one of these three has to fail here rather than somewhere downstream.
  no(pane, "still reading <b>",
    "the lede is carrying the outstanding count again");
  no(pane, `, with ${n} more`,
    "the partial note is carrying the outstanding count again");
  no(pane, `Reading the full record for ${n}`,
    "the announced status line is carrying the outstanding count again — and heard four times in\n" +
    "    one region a number is worse than seen four times");
  console.log(`      cold ${KEY}: ${c.cold} outstanding, printed once · lede "${para(pane, "d1-led-n is-partial").slice(0, 54)}"`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the three sentences survive, countless");
// ═════════════════════════════════════════════════════════════════════════════
{
  const pane = paneOf(COLD, KEY);
  has(pane, "still reading",
    "the lede stopped saying a read is out at all. The integer was the duplicate; the disclosure\n" +
    "    was the point");
  has(pane, "Not the count for this key",
    "the partial note is gone. It is the sentence that stops the figures under it reading as the\n" +
    "    key's own census");
  has(pane, "Reading the full record for",
    "the announced status line is gone. It is how a reader who is not watching the pane learns a\n" +
    "    read is still out");
  has(pane, 'role="status"',
    "the status line stopped being announced, so the disclosure is now sighted-only");
  has(pane, "is-partial",
    "the partial census is not marked as partial for the stylesheet");
  // AND THE PANE STILL LEADS WITH THE MEASURE IT HAS. v134's rule, which this
  // pass edited the very sentence of.
  has(para(pane, "d1-led-n is-partial"), "on file map",
    "the partial headline stopped leading with the mapped measure the cards below already print");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · one measure count, everywhere");
// ═════════════════════════════════════════════════════════════════════════════
const WARM = boot({ path: `/i/${DEEP}` });
{
  await arrive(WARM);
  await tick(); await tick(); await tick();
  const keys = WARM.PDXDoor1.trackedKeys() || [];
  must(keys.length > 50, `trackedKeys() returned ${keys.length} keys`);

  // (a) THE THREE READERS AGREE, ON EVERY TRACKED KEY. The ledger builds the
  //     badge, the census feeds the letterhead, the export feeds everything
  //     else. Three call sites, one number.
  const drift = [];
  let counted = 0;
  for (const k of keys) {
    const cen = WARM.PDXDoor1.issueCensus(k);
    if (!cen) continue;
    counted++;
    const led = WARM.PDXDoor1._ledger(null, k);
    const exp = WARM.PDXDoor1.issueMeasures(k).length;
    const ledN = led && led.measures ? led.measures.length : -1;
    if (cen.measures !== exp || ledN !== exp) {
      drift.push(`${k}: ledger ${ledN}, census ${cen.measures}, export ${exp}`);
    }
  }
  ok(counted > 50, `only ${counted} keys resolved a census, which is too few to call this swept`);
  eq(drift.slice(0, 6).join(" | "), "",
    `${drift.length} key(s) get two different measure counts from the app depending on which surface\n` +
    "    asks. A reader told one number by the Eye's card and another by the file that card opens has\n" +
    "    no way to decide which one the app means, and both of them are the app talking");

  // (b) AND IT REALLY IS THE UNION. Proved against the reader that shipped:
  //     the same export with its old index-only body, on the same boot data.
  const OLD_EXPORT = `    issueMeasures: function (key) {
      try { return ledgerMeasures([], key); } catch (e) { return []; }
    },`;
  const NEW_EXPORT = DESK.slice(
    DESK.indexOf("    issueMeasures: function (key) {"),
    DESK.indexOf("    _ledger: issueLedger,"));
  must(NEW_EXPORT.indexOf("issueLedger(null, key)") >= 0,
    "the issueMeasures export no longer goes through the ledger — this probe reads the wrong lines");
  const before = boot({ path: `/i/${DEEP}`, desk: DESK.replace(NEW_EXPORT, OLD_EXPORT + "\n") });
  await arrive(before);
  await tick(); await tick(); await tick();
  const gained = [];
  for (const k of keys) {
    const a = WARM.PDXDoor1.issueMeasures(k).length;
    const b = before.PDXDoor1.issueMeasures(k).length;
    if (a !== b) gained.push(`${k} ${b}→${a}`);
    ok(a >= b, `${k}: the union reader returned FEWER measures (${a}) than the index-only reader (${b})`);
  }
  ok(gained.length >= 10,
    `only ${gained.length} key(s) changed answer, so either the split has been fixed elsewhere and\n` +
    "    this probe is stale, or the export is still reading the static index");
  console.log(`      ${counted} keys swept, three readers agree · ${gained.length} keys gained the ` +
    `act-discovered measures: ${gained.slice(0, 3).join(", ")}…`);

  // (c) AND THE TWO SURFACES A READER SEES SIDE BY SIDE PRINT IT. The pane's
  //     badge and the letterhead's inventory line, parsed out of the paint.
  for (const k of [DEEP, SPLIT]) {
    const cen = WARM.PDXDoor1.issueCensus(k);
    must(cen && cen.measures > 0, `${k} has no mapped measure in this corpus, so it cannot be the fixture`);
    const pane = paneOf(WARM, k);
    const badge = para(pane, "d1-led-m");
    const inv = para(pane, "pdxif-inv");
    const bN = (badge.match(/\d+/) || [])[0];
    const iN = (inv.match(/(\d+) measures? mapped/) || [])[1];
    eq(bN, String(cen.measures), `${k}: the ledger badge and the census disagree — badge "${badge}"`);
    eq(iN, String(cen.measures),
      `${k}: the hero's inventory line and the ledger badge do not agree about how many measures are\n` +
      `    mapped — letterhead "${inv}", badge "${badge}"`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · a clipped read never looks complete");
// ═════════════════════════════════════════════════════════════════════════════
{
  const CLIP = boot({ path: `/i/${DEEP}`, truncated: true });
  await arrive(CLIP);
  await tick(); await tick(); await tick();
  const NOTE = CLIP.PDXIssueView.truncNote();
  must(NOTE && NOTE.length > 30, "issue-view's row-limit sentence is empty");
  ok(CLIP.PDXIssueView.votesTruncated() === true,
    "the truncated payload did not set the ranking's clipped flag, so this section has no subject");
  const cen = CLIP.PDXDoor1.issueCensus(DEEP);
  must(cen, `the census did not resolve for ${DEEP} on the clipped boot`);
  ok(cen.trunc === true, "the census does not carry the clipped flag, so the letterhead cannot know");
  eq(cen.pending, false, "the clipped fixture is still pending, so it is not the settled frame this is about");
  eq(cen.cold, 0, "the clipped fixture still has cold rows, so it is not the settled frame this is about");

  const pane = paneOf(CLIP, DEEP);
  // BOTH SURFACES, AND THE SAME SENTENCE ON EACH. Not two wordings for one cap:
  // two descriptions of one limit is how two surfaces start disagreeing about
  // how bad it is.
  eq(para(pane, "d1-led-trunc"), NOTE,
    "the desk pane does not print the ranking's own row-limit sentence over a clipped read");
  eq(para(pane, "pdxif-clip"), NOTE,
    "the file's letterhead does not print the ranking's own row-limit sentence over a clipped read");
  // AND THE FIGURES ARE STILL PUBLISHED. Suppressing them would be wrong twice:
  // they are true counts of real rows, and hiding them would leave the file with
  // nothing where the record is merely short.
  has(pane, 'class="pdxif-inv"',
    "the letterhead suppressed its inventory over a clipped read. Those integers are true counts of\n" +
    "    real rows — the fix is to qualify them, not to withhold them");
  has(pane, 'class="d1-led-m"', "the ledger badge went missing over a clipped read");

  // THE UNCLIPPED FRAME SAYS NOTHING EXTRA. A caveat that always prints is not a
  // caveat.
  const cleanPane = paneOf(WARM, DEEP);
  ok(WARM.PDXIssueView.votesTruncated() === false,
    "the untruncated boot thinks its read was clipped, so the flag is stuck on");
  no(cleanPane, "d1-led-trunc", "the desk pane prints the row-limit caveat over a read that was not clipped");
  no(cleanPane, "pdxif-clip", "the letterhead prints the row-limit caveat over a read that was not clipped");
  no(cleanPane, "row limit", "the pane mentions a row limit on a read that had none");
  console.log(`      clipped ${DEEP}: both surfaces print "${NOTE.slice(0, 48)}…"`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · v134 holds — no denial over a printed card");
// ═════════════════════════════════════════════════════════════════════════════
{
  const coldPane = paneOf(COLD, KEY);
  has(coldPane, BILL, `the cold pane stopped listing ${BILL}, so there is no card for a denial to sit over`);
  for (const d of DENIALS) {
    no(coldPane, d, `the cold pane says "${d}" three inches above a printed PRIMARY card`);
  }
  // The letterhead is still integer-free while a read is out, and this pass did
  // not loosen it — the clipped note is not an integer.
  const head = String(COLD.PDXIssueFile._head(KEY) || "");
  const figures = (head.replace(/<[^>]*>/g, " ").match(/\d+/g) || []);
  eq(figures.join(","), "", `the letterhead published figures (${figures.join(", ")}) while the read was out`);
  no(head, "pdxif-inv", "the letterhead printed an inventory line under a live read");
  const warmPane = paneOf(WARM, DEEP);
  for (const d of DENIALS) {
    no(warmPane, d, `the settled pane says "${d}" over a key holding ${WARM.PDXDoor1.issueCensus(DEEP).measures} measures`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · the files travel together");
// ═════════════════════════════════════════════════════════════════════════════
{
  const SW = R("sw.js");
  const m = /const CACHE_VERSION = 'v(\d+)';/.exec(SW);
  must(m, "CACHE_VERSION is not in sw.js in the form this file reads");
  const prev = HEAD("sw.js");
  if (prev) {
    const pm = /const CACHE_VERSION = 'v(\d+)';/.exec(prev);
    if (pm) ok(Number(m[1]) > Number(pm[1]),
      `CACHE_VERSION did not move past HEAD's v${pm[1]} — a warm device would keep serving the ` +
      "four-integer pane and the index-only measure count");
  }
  has(SW, `// v${m[1]} - `, `sw.js has no prose log entry for v${m[1]}`);
  const note = SW.slice(SW.indexOf(`// v${m[1]} - `), SW.indexOf("const CACHE_VERSION"));
  // EVERY FILE IN THE PASS, NAMED. A warm device that took one and not another
  // is the failure this bump exists to prevent, and the note is the only record
  // of which files that is.
  for (const f of ["word-action.js", "word-action.css", "door1-workspace.js",
                   "door1-workspace.css", "issue-file.js", "issue-file.css", "issue-view.js"]) {
    has(note, f, `the v${m[1]} note does not name ${f}`);
    ok(SW.indexOf("/" + f) >= 0, `${f} is not in the precached shell`);
  }
  console.log(`      shell v${m[1]}; all seven files named in the note and precached`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the fixes are load-bearing");
// ═════════════════════════════════════════════════════════════════════════════
// Each probe puts one line back the way it shipped and asserts that the section
// above CATCHES it. Without these, every claim in this file is one deleted
// branch away from being vacuous.
{
  const coldBrk = async (label, patch, check) => {
    const src = patch(DESK);
    must(src !== DESK, `the load-bearing probe for ${label} patched nothing — the code moved`);
    const w = boot({ cold: true, path: `/i/${KEY}`, desk: src });
    await arrive(w);
    const pane = paneOf(w, KEY);
    ok(check({ pane, txt: visible(pane), cold: w.PDXDoor1.issueCensus(KEY).cold }),
      `breaking ${label} was not caught by the probes above`);
  };

  // (a) The lede takes its integer back — the first of the four copies.
  await coldBrk("the countless lede",
    (s) => s.replace(
      "    return '<p class=\"d1-led-n is-partial\">' + censusLeadHtml(led) +\n        ' · still reading' +",
      "    return '<p class=\"d1-led-n is-partial\">' + censusLeadHtml(led) +\n" +
      "        (led.cold ? ' · still reading <b>' + led.cold + '</b>' : ' · still reading') +"),
    (o) => countOf(o.txt, String(o.cold)) !== 1 && o.pane.indexOf("still reading <b>") >= 0);

  // (b) The partial note takes its integer back — the third copy.
  await coldBrk("the countless partial note",
    (s) => s.replace(
      "      '<p class=\"d1-led-part\">Not the count for this key. It is what has come back so far' +\n        ' — every figure",
      "      '<p class=\"d1-led-part\">Not the count for this key. It is what has come back so far' +\n" +
      "        (led.cold ? ', with ' + led.cold + ' more records still being read' : '') +\n        ' — every figure"),
    (o) => countOf(o.txt, String(o.cold)) !== 1);

  // (c) The announced status line takes its integer back — the fourth copy, and
  //     the one a screen reader hears.
  await coldBrk("the countless status line",
    (s) => s.replace(
      "        ? '<p class=\"d1-claim-busy\" role=\"status\">Reading the full record for the ' +\n          'people on this key who are still out…</p>'",
      "        ? '<p class=\"d1-claim-busy\" role=\"status\">Reading the full record for ' + led.cold +\n          ' more people on this key…</p>'"),
    (o) => countOf(o.txt, String(o.cold)) !== 1);

  // (d) The status line loses its sentence rather than its integer — the wrong
  //     fix, and section 2 has to refuse it.
  await coldBrk("the surviving status sentence",
    (s) => s.replace(
      "      (led.cold\n        ? '<p class=\"d1-claim-busy\" role=\"status\">Reading the full record for the ' +\n          'people on this key who are still out…</p>'\n        : '') +",
      "      '' +"),
    (o) => o.pane.indexOf("Reading the full record for") < 0);

  // (e) The measure export goes back to the static index — two answers again.
  {
    const OLD_EXPORT = `    issueMeasures: function (key) {
      try { return ledgerMeasures([], key); } catch (e) { return []; }
    },`;
    const NEW_EXPORT = DESK.slice(
      DESK.indexOf("    issueMeasures: function (key) {"),
      DESK.indexOf("    _ledger: issueLedger,"));
    const w = boot({ path: `/i/${DEEP}`, desk: DESK.replace(NEW_EXPORT, OLD_EXPORT + "\n") });
    await arrive(w);
    await tick(); await tick(); await tick();
    const keys = w.PDXDoor1.trackedKeys() || [];
    const split = keys.filter((k) => {
      const c = w.PDXDoor1.issueCensus(k);
      return c && c.measures !== w.PDXDoor1.issueMeasures(k).length;
    });
    ok(split.length >= 10,
      `reverting the measure export to the static index left only ${split.length} key(s) disagreeing,\n` +
      "    so section 3's sweep would not have caught it");
  }

  // (f) The clipped-read caveat is dropped from the pane — a short read looks
  //     finished again.
  {
    const src = DESK.replace(
      "      (led.trunc ? '<p class=\"d1-led-trunc\">' + esc(truncNote()) + '</p>' : '') +", "      '' +");
    must(src !== DESK, "the load-bearing probe for the clipped caveat patched nothing");
    const w = boot({ path: `/i/${DEEP}`, truncated: true, desk: src });
    await arrive(w);
    await tick(); await tick(); await tick();
    ok(paneOf(w, DEEP).indexOf("d1-led-trunc") < 0 && w.PDXIssueView.votesTruncated() === true,
      "dropping the desk's clipped caveat was not caught by section 4");
  }

  // (g) And the letterhead's copy of it, which is the one that sits over the
  //     published integers.
  {
    const src = PANEL.replace(
      "        (clip ? '<p class=\"pdxif-clip\">' + esc(clip) + '</p>' : '') +", "        '' +");
    must(src !== PANEL, "the load-bearing probe for the letterhead's caveat patched nothing");
    const w = boot({ path: `/i/${DEEP}`, truncated: true, panel: src });
    await arrive(w);
    await tick(); await tick(); await tick();
    const pane = paneOf(w, DEEP);
    ok(pane.indexOf("pdxif-clip") < 0 && pane.indexOf('class="pdxif-inv"') >= 0,
      "dropping the letterhead's clipped caveat was not caught by section 4");
  }
}

// ═════════════════════════════════════════════════════════════════════════════
if (failures.length) {
  console.error(`\n✗ issue desk one count: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error(`   · ${f}`);
  process.exit(1);
}
console.log(`\n✓ issue desk one count: all ${passed} assertions passed — one fact one integer, ` +
  "one measure one count, and a short read that says so\n");
