#!/usr/bin/env node
/**
 * test-eye-warming.mjs — a cold index is not an empty record
 * ─────────────────────────────────────────────────────────────────────────────
 * Typing 6644 into the All-Seeing Eye flashed
 *
 *     The eye finds nothing for “6644”.
 *
 * and then, a moment later, H.R. 6644 appeared. Both paints came out of the same
 * branch and only one of them was true.
 *
 * The false one was a report on an index that did not exist yet. all-seeing-eye.js
 * is a plain sync <script>, so it runs BEFORE the deferred roster and stance
 * bundles, before pdx-lazy-data.js injects the light bill index, and long before
 * the paged /measures fetch that is the only place H.R. 6644 lives at all — it is
 * not in bills-index.js, which is why 6644 was the query that showed the defect.
 * rank() over an empty haystack returns nothing, and the panel published that
 * nothing as a finding about the public record.
 *
 * "Nothing found" and "nothing loaded" are different answers, and on an archive
 * the difference is the whole of its credibility: one says the record does not
 * contain this, the other says the record has not arrived. So each lane the eye
 * searches carries three states and the panel may only ever print the third:
 *
 *   · WARMING          — "Searching the record…", and never "finds nothing".
 *   · READY, WITH HITS — the ordinary result list.
 *   · READY, WITH NONE — and only here, "The eye finds nothing".
 *
 * The sections below drive the SHIPPED module through a stub DOM, one lane at a
 * time, and assert on the HTML it actually assigns to the panel.
 *
 *   1. COLD: nothing loaded at all. Every query warms; none of them denies.
 *   2. THE 6644 WALK: cold → warming, bills land → exactly one bill row, and the
 *      four ways people write a bill number all reach it.
 *  2b. THE 8245 WALK: the same denial, one clock later. The emergency price relief
 *      memorandum lives only in the paged /measures list, and that walk outran the
 *      eight-second ceiling — so the panel printed "Formal 0" and "finds nothing"
 *      for a row that arrived a moment later. The measures slice is off the clock:
 *      cold until its own request ends, a loading line while it is cold, and never
 *      a zero in the Formal count.
 *  2c. A PAPERED-OVER FAILURE IS NOT A FETCHED SLICE: the client hands back the
 *      inline marquee index when a request fails, and that is not the record's
 *      answer to store or to report on.
 *   3. HALF WARM: a lane with hits reports hits, a lane still loading says so in
 *      its own slot, and the page never mixes a verdict with a spinner.
 *  3b. THE REGISTER IS ITS OWN LANE: the issue FILES come from ISSUE_MAP, which
 *      no other lane's readiness says anything about, so a cold register gets its
 *      own loading line in the group the answer will appear in.
 *   4. READY AND EMPTY: the one place "finds nothing" is allowed, and it is still
 *      there — this pass must not have made the eye unable to say no.
 *   5. THE CEILING: a lane whose source never arrives is not warming forever. A
 *      permanent "Searching the record…" is a worse lie than a momentary nothing.
 *  5b. AND ITS CLOCK STARTS WHEN A LANE COULD HAVE ARRIVED: everything the eye
 *      searches is deferred, so a ceiling measured from a mid-parse boot expired
 *      before any source had a turn — and denied a record that was still coming.
 *   6. THE GUARDS ARE LOAD-BEARING: mutations that put the old behaviour back.
 *   7. AND IT SHIPS: the eye is a runtime cache entry, so a warm device only gets
 *      any of this behind a CACHE_VERSION that moved.
 *
 *   node scripts/test-eye-warming.mjs
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const SRC = R("all-seeing-eye.js");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);
const has = (hay, needle, msg) => ok(String(hay).includes(needle), `${msg} — missing ${JSON.stringify(needle)}`);
const hasNot = (hay, needle, msg) => ok(!String(hay).includes(needle), `${msg} — found ${JSON.stringify(needle)}`);
const count = (hay, re) => (String(hay).match(re) || []).length;
// The figure printed on one lane's button — "0", "3", or the wait mark that
// stands in for a total the eye does not know yet.
const laneN = (html, id) => {
  const m = String(html).match(
    new RegExp(`data-eye-lane="${id}"[\\s\\S]*?<span class="pdx-eye-lane-n[^"]*"[^>]*>([^<]*)</span>`)
  );
  return m ? m[1] : null;
};
const section = (t) => console.log(`\n  · ${t}`);
const die = (msg) => { console.error(`\n✗ eye warming: STALE HARNESS — ${msg}\n`); process.exit(2); };

const WARM = "Searching the record…";
// The PANEL's own sentence, as distinct from the per-category loading row that
// carries the same three words in a lane's own slot. Both matter and they are
// checked separately, so losing either one is a failure rather than something the
// other covers up.
const WARM_PANEL = "<b>Searching the record…</b>";
const NOTHING = "The eye finds nothing";

// ── the fixture ──────────────────────────────────────────────────────────────
// H.R. 6644 is read out of the shipped seed, so this suite is testing the eye
// against the measure the defect was reported on rather than one written to pass.
const SEED = JSON.parse(R("db/vr-issue-seed.json"));
const SEEDED = (SEED.measures || []).find((m) => m.number === "H.R. 6644");
if (!SEEDED) die("H.R. 6644 is no longer in db/vr-issue-seed.json");
const INLINE = R("bills-index.js");
if (/6644/.test(INLINE)) {
  die("H.R. 6644 is now in the inline bills index, so it no longer demonstrates a cold bill lane");
}
const LIVE_BILL = {
  id: 88, number: "H.R. 6644", congress: 119, chamber: "house", measureType: "bill",
  status: "passed_house", title: "21st Century ROAD to Housing Act",
  shortTitle: "21st Century ROAD to Housing Act",
  primaryIssue: "housing_build", issueKeys: ["housing_build", "housing"],
};
const OTHER_BILL = {
  id: 91, number: "S. 12", congress: 119, chamber: "senate", measureType: "bill",
  status: "introduced", title: "A totally unrelated measure", primaryIssue: "healthcare", issueKeys: ["healthcare"],
};
// ── THE SECOND MEASURE THIS SUITE IS ABOUT: 8245 ────────────────────────────
// The emergency price relief memorandum. Like 6644 it lives ONLY in the paged
// /measures list — it is a database row seeded by a migration, it is not in the
// inline index, and "8245" reaches it through the digits of its number. Unlike
// 6644 the walk to it is long: the memo denial was not a cold-boot flash but a
// DEADLINE, expiring while the pages were still landing. Read out of the shipped
// record so this suite tests the eye against the row the defect was reported on.
const MEMO_SQL = R("netlify/database/migrations/20260826000000_seed_exec_actions_wave4.sql");
const MEMO_SEED = Object.values(JSON.parse(R("db/exec-action-seed.json")).actions || {})
  .flat()
  .find((a) => a && /90 FR 8245/.test(String(a.documentId || "")));
if (!MEMO_SEED) die("the 90 FR 8245 memorandum is no longer in db/exec-action-seed.json");
const MEMO_NUMBER = "Presidential Memorandum, 90 FR 8245";
const MEMO_SHORT = "Emergency price relief memorandum";
if (!MEMO_SQL.includes(`'${MEMO_NUMBER}'`)) die(`the migration no longer files a vr_measures row numbered ${MEMO_NUMBER}`);
if (!MEMO_SQL.includes(`'${MEMO_SHORT}'`)) die(`the memorandum's short title is no longer ${JSON.stringify(MEMO_SHORT)}`);
if (/8245/.test(INLINE)) die("8245 is now in the inline bills index, so it no longer needs the measures fetch");
const MEMO_BILL = {
  id: 4102, number: MEMO_NUMBER, congress: null, chamber: "executive", measureType: "memorandum",
  status: "enacted", title: MEMO_SEED.title, shortTitle: MEMO_SHORT,
  primaryIssue: "cost_living", issueKeys: ["cost_living"],
};
const ROSTER = {
  test_person: { name: "Ada Testerly", office: "U.S. Senator", state: "Utah", party: "R", issues: ["housing"] },
};
const STANCES = {
  test_person: [{ topic: "Closed-loop cooling", text: "Backed the data-centre water rule.", issueKey: "housing", pos: "supports" }],
};
const ISSUE_CATS = [{ key: "housing", label: "🏠 Housing", blurb: "Where they stand on housing.", keys: ["housing", "housing_build"] }];
// The issue REGISTER — the map every issue FILE row is built from, and its own
// lane. It arrives with the deferred alignment-tool.js, so at eye boot it is as
// absent as the roster is. The key is deliberately unrelated to every query in
// this suite: a register that answered "housing" or "6644" would change what the
// other lanes are being measured on.
const ISSUE_MAP_FIX = {
  water_reuse: { label: "💧 Water Reuse", chip: "Water reuse", keywords: ["greywater"] },
};

// ── a DOM small enough to read and real enough to drive the module ───────────
function stubNode(cls) {
  const set = new Set(String(cls || "").split(/\s+/).filter(Boolean));
  const n = {
    innerHTML: "", value: "", tagName: "DIV", style: {}, scrollHeight: 22,
    classList: {
      add: (c) => set.add(c), remove: (c) => set.delete(c),
      contains: (c) => set.has(c),
      toggle: (c, on) => { const want = on === undefined ? !set.has(c) : !!on; if (want) set.add(c); else set.delete(c); return want; },
    },
    _classes: set,
    addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
    setAttribute() {}, getAttribute() { return null; }, removeAttribute() {},
    focus() {}, blur() {}, scrollIntoView() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    closest() { return null; }, contains() { return false; }, matches() { return false; },
    appendChild(c) { return c; },
  };
  return n;
}

// Each boot gets its own sandbox, so a lane's readiness is a property of the boot
// rather than something a previous section left behind.
function boot(state, src) {
  const win = makeSandbox();
  const panel = stubNode(), input = stubNode(), eye = stubNode(), clear = stubNode();
  input.tagName = "TEXTAREA";
  const ids = { "pdx-eye-panel": panel, "pdx-eye-input": input, "pdx-eye": eye, "pdx-eye-clear": clear };
  win.document.getElementById = (id) => ids[id] || null;
  // The lanes, each switched independently.
  if (state.people) { win.CMP_DATA = ROSTER; win.PROFILES = ROSTER; }
  if (state.stances) win.ISSUE_STANCE_DATA = STANCES;
  if (state.issues) win.CORE_NATIONAL_ISSUES = ISSUE_CATS;
  if (state.register) win.ISSUE_MAP = ISSUE_MAP_FIX;
  // A DOCUMENT STILL BEING PARSED. Every source above is behind `defer` in the
  // shipped page and cannot execute until the parse ends, so a boot with
  // readyState "loading" is the state a reader who types into the eye during a
  // slow load is actually in. `settleParse()` is that parse finishing.
  if (state.parsing) win.document.readyState = "loading";
  if (state.spotlights) win.PDXSpotlight = { list: () => [] };
  // pdx-lazy-data.js's own witness for "the file has executed", which is the only
  // honest signal for a bundle that is legitimately empty.
  win.PDXLazyData = {
    ensure: () => Promise.resolve(true),
    loaded: (k) => !!(state.lazy || {})[k],
    whenReady: (k, cb) => { if ((state.lazy || {})[k]) cb(); },
  };
  // The bills lane, and the reason the lane exists. `pending` is the real cold
  // case: PDXBills is on the page, the paged /measures fetch has been kicked off,
  // and it has not come back. `live` lets that same fetch answer — the eye's own
  // code path installs the measures, so what section 2 searches is what a browser
  // would have searched.
  if (state.bills) {
    win.PDX_BILLS_INDEX = [];      // bills-index.js is a marquee subset; 6644 is not in it
    win.__billsCalls = 0;
    const answer = (d) => { win.__billsCalls++; return d; };
    win.PDXBills = {
      live: {
        list: () => Promise.resolve(answer({ items: [LIVE_BILL, OTHER_BILL], total: 2 })),
        ensureIndex: () => Promise.resolve(true),
      },
      // The measures list with the memo in it — the state the reader reaches a
      // moment after the denial they should never have been shown.
      memo: {
        list: () => Promise.resolve(answer({ items: [LIVE_BILL, OTHER_BILL, MEMO_BILL], total: 3 })),
        ensureIndex: () => Promise.resolve(true),
      },
      reject: {
        list: () => { answer(null); return Promise.reject(new Error("offline")); },
        ensureIndex: () => Promise.reject(new Error("offline")),
      },
      // PDXBills.list() swallows a failed request and returns the INLINE index
      // instead, flagged `_inline`. It is the client's fallback, not the record's
      // answer, and treating it as one is a silent permanent denial of every
      // measure that lives only in the database.
      fallback: {
        list: () => Promise.resolve(answer({ items: [OTHER_BILL], _inline: true })),
        ensureIndex: () => Promise.resolve(true),
      },
      pending: {
        list: () => { answer(null); return new Promise(() => {}); },   // never settles
        ensureIndex: () => new Promise(() => {}),
      },
    }[state.bills];
  }
  const ctx = vm.createContext(win);
  vm.runInContext(src || SRC, ctx, { filename: "all-seeing-eye.js" });
  if (!win.PDXEye || typeof win.PDXEye.render !== "function") die("PDXEye.render is unavailable after loading all-seeing-eye.js");
  return {
    win, panel, eye,
    // Render as the panel does when it is open, and hand back what it painted.
    search(q) { eye.classList.add("is-open"); win.PDXEye.rebuild(); win.PDXEye.render(q); return panel.innerHTML; },
    // Let the measures fetch land. The first render is what kicks it off (getIndex
    // calls ensureEyeBills), exactly as opening the panel does in a browser, so
    // this is the boot sequence and not a shortcut around it.
    async ready() {
      this.search("");
      for (let i = 0; i < 12; i++) await new Promise((r) => setImmediate(r));
      return this;
    },
    // The lane clock lives inside the sandbox, so the sandbox's Date is the one to
    // wind: patching the host's would prove nothing about the shipped ceiling.
    travel(ms) { vm.runInContext(`(function(){var _n=Date.now;Date.now=function(){return _n()+${ms};};})()`, ctx); },
    // The parse finishes: from here the deferred sources could have run, so the
    // ceiling's clock is allowed to mean something.
    settleParse() { win.document.readyState = "complete"; return this; },
  };
}

const ALL_READY = { people: 1, stances: 1, issues: 1, spotlights: 1, register: 1,
  // A loaded bundle may honestly be empty, so "the file executed" is the signal.
  lazy: { spotlights: true, bills: true }, bills: "live" };

console.log(`\n👁️  eye warming — ${SEEDED.number}, four lanes, three states each`);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · cold: every lane warming, and not one query denied");
// ═════════════════════════════════════════════════════════════════════════════
{
  const B = boot({ bills: "pending" });   // nothing loaded but the bill fetch, in flight
  for (const q of ["6644", "H.R. 6644", "mike lee", "housing", "zzzzzznotathing"]) {
    const html = B.search(q);
    has(html, WARM, `a cold index does not say it is searching for ${JSON.stringify(q)}`);
    has(html, WARM_PANEL, `the cold panel's own warming sentence is missing for ${JSON.stringify(q)}`);
    hasNot(html, NOTHING, `a cold index denies ${JSON.stringify(q)} instead of saying it is still loading`);
  }
  // Half a second later it is still loading and still says so. The reported flash
  // was one paint wide, so a guard that only holds for the first paint is not a
  // guard — it is a coincidence.
  B.travel(500);
  has(B.search("6644"), WARM, "a still-cold index gives up on warming half a second in");
  hasNot(B.search("6644"), NOTHING, "a still-cold index starts denying half a second in");

  // The notice says WHICH lanes, because "still loading" with no subject is a
  // spinner and a reader cannot tell from a spinner what waiting buys them.
  const html = B.search("6644");
  has(html, "the legislation index", "the warming notice does not name the bills lane");
  has(html, "the roster and its receipts", "the warming notice does not name the people lane");
  has(html, "the issue library", "the warming notice does not name the issues lane");
  has(html, "Results appear as they arrive", "the warming notice does not tell the reader what happens next");
  has(html, 'role="status"', "the warming notice is not announced to assistive tech");
  has(html, 'aria-live="polite"', "the warming notice is not announced to assistive tech");
  // It is the empty state's own type and position, because it is the same
  // sentence at an earlier moment and not an error.
  has(html, "pdx-eye-empty", "the warming notice is styled as something other than the panel's own empty state");
  has(html, "pdx-eye-warm", "the warming notice has no class of its own to style");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the 6644 walk: warming, then exactly one bill row");
// ═════════════════════════════════════════════════════════════════════════════
{
  // THE ACCEPTANCE, IN ORDER. Cold, then the measures list lands.
  const COLD = boot({ ...ALL_READY, bills: "pending" });
  const cold = COLD.search("6644");
  has(cold, WARM, "the bills lane is not warming while its fetch is in flight");
  hasNot(cold, NOTHING, "6644 is denied while the measures list is still paging — this is the defect");

  const HOT = await boot(ALL_READY).ready();
  const hot = HOT.search("6644");
  hasNot(hot, WARM, "the bills lane is still warming after the measures list arrived");
  hasNot(hot, NOTHING, "6644 finds nothing with H.R. 6644 in the index");
  has(hot, "Legislation &amp; Bills", "the bill result is not filed under the legislation category");
  has(hot, "21st Century ROAD to Housing Act", "H.R. 6644 is in the index but is not in the answer");
  eq(count(hot, /class="pdx-eye-cat-n">1</g), 1, "the legislation category does not report exactly one hit");
  hasNot(hot, "A totally unrelated measure", "a bill number query is dragging in unrelated measures");

  // FOUR WAYS PEOPLE WRITE A BILL NUMBER, ONE BILL. Nobody types "H.R. 6644" the
  // way the record stores it, and a search that only answers the canonical form is
  // a search that answers nobody.
  for (const q of ["6644", "HR 6644", "H.R. 6644", "hr6644"]) {
    const html = HOT.search(q);
    has(html, "21st Century ROAD to Housing Act", `${JSON.stringify(q)} does not reach H.R. 6644`);
    hasNot(html, NOTHING, `${JSON.stringify(q)} is denied with the bill in the index`);
    hasNot(html, "A totally unrelated measure", `${JSON.stringify(q)} matched a bill it has nothing to do with`);
    eq(count(html, /class="pdx-eye-cat-n">1</g), 1, `${JSON.stringify(q)} does not resolve to exactly one bill`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("2b · the 8245 walk: a cold measures slice is a loading line, not a zero");
// ═════════════════════════════════════════════════════════════════════════════
{
  // WHAT WAS WRONG, IN THE PREVIEW, AFTER THE CLOCK WAS MOVED TO THE PARSE. The
  // eye still painted "Formal 0" and "The eye finds nothing for 8245", and then
  // the same query painted the memorandum under Legislation & Bills. The memo is
  // a database row reachable only through the paged /measures walk, and that walk
  // is long — a hundred rows a request, on a cold function and a cold branch. The
  // eight-second ceiling expired while the pages were still landing, so the panel
  // reported an index it had not finished reading.
  //
  // The measures slice is off the clock now. It is warm when its request has ended
  // — with rows, with none, or in failure — and cold until then, whatever the
  // clock says. Two cold shapes, one query, and neither may deny it:
  //
  //   · ABSENT: bills.js has not executed, so there is no request to wait on and
  //     nothing to search.
  //   · EMPTY, UNFETCHED: the inline index is [] and the /measures walk is still
  //     in flight. A search over that is a search over nothing.
  for (const [label, state] of [
    ["absent", { people: 1, stances: 1, issues: 1, spotlights: 1, register: 1, lazy: { spotlights: true } }],
    ["empty and unfetched", { ...ALL_READY, bills: "pending" }],
  ]) {
    const B = boot(state);
    const html = B.search("8245");
    hasNot(html, NOTHING, `a ${label} measures slice denies 8245 — this is the defect`);
    has(html, WARM, `a ${label} measures slice does not say the measures are still loading`);
    // The loading line is in the group the answer will appear in, so the reader is
    // looking at the measures group while it fills rather than at a verdict.
    has(html, 'data-cat="warm" data-warm-lane="bills"',
      `a ${label} measures slice prints no loading line in the measures group`);
    has(html, "Legislation &amp; Bills", `a ${label} measures slice does not name the group 8245 will land in`);
    // AND THE COUNT IS NOT A ZERO. "Formal 0" is the denial sentence printed as a
    // number, and it was printed an inch above the sentence itself.
    hasNot(laneN(html, "formal"), "0", `the Formal count reads zero while the measures slice is ${label}`);
    has(html, 'class="pdx-eye-lane-n is-warm"', `the Formal count does not report the wait while the slice is ${label}`);
    // Half a second on, and a full minute on, it is the same answer: the walk is
    // still delivering, so the eye is still reading.
    B.travel(500);
    hasNot(B.search("8245"), NOTHING, `a ${label} measures slice denies 8245 half a second in`);
    B.travel(10000);
    hasNot(B.search("8245"), NOTHING, `a ${label} measures slice denies 8245 once the old parse ceiling would have expired`);
  }

  // THE MEMO LANDS. Same query, the real row inserted into the measures list the
  // eye's own fetch installs: one bill row, the memorandum's own short title, no
  // loading line anywhere, and a Formal count that is a figure again.
  const HOT = await boot({ ...ALL_READY, bills: "memo" }).ready();
  const hot = HOT.search("8245");
  hasNot(hot, NOTHING, "8245 finds nothing with the memorandum in the measures list");
  hasNot(hot, WARM, "the measures lane is still warming after the list arrived");
  hasNot(hot, "pdx-eye-warmrow", "a loading line survives into the answer");
  has(hot, "Legislation &amp; Bills", "the memorandum is not filed under the legislation group");
  has(hot, MEMO_SHORT, "8245 is in the measures list but the memorandum is not in the answer");
  eq(count(hot, /class="pdx-eye-cat-n">1</g), 1, "8245 does not resolve to exactly one measure");
  hasNot(hot, "A totally unrelated measure", "8245 dragged in a measure it has nothing to do with");
  eq(laneN(hot, "formal"), "1", "the Formal count does not report the one measure 8245 reaches");
  // And the canonical number reaches it too, not just the digits a reader types.
  has(HOT.search(MEMO_NUMBER), MEMO_SHORT, "the memorandum's own number does not reach it");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2c · a papered-over failure is not a fetched measures slice");
// ═════════════════════════════════════════════════════════════════════════════
{
  // PDXBills.list() catches a failed request and hands back the inline marquee
  // index, flagged `_inline`. The eye stored that as the live measures list and
  // then reported on it as though the record had answered — which is the 8245
  // denial with no second frame to correct it. A fallback is not a response: it
  // does not become the measures slice, and it does not settle the lane on the
  // first attempt.
  const B = await boot({ ...ALL_READY, bills: "fallback" }).ready();
  ok(!B.win.__pdxEyeBillsLive, "the client's inline fallback was stored as the live measures list");
  eq(B.win.__billsCalls, 2, "a papered-over failure was not asked again (or was asked without end)");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · half warm: hits are hits, and the loading lane says so in its slot");
// ═════════════════════════════════════════════════════════════════════════════
{
  // People and issues loaded, bills still paging. "housing" matches a person, a
  // receipt and an issue category — and the bill lane has an answer coming.
  const B = boot({ people: 1, stances: 1, issues: 1, spotlights: 1, register: 1,
    lazy: { spotlights: true }, bills: "pending" });
  const html = B.search("housing");
  has(html, "Ada Testerly", "the loaded people lane is not answering while another lane warms");
  has(html, WARM, "the still-loading bills lane does not say it is still loading");
  hasNot(html, NOTHING, "a half-warm index is printing a denial next to its own results");
  // The notice is in the LANE's slot, in the same shape as the results it will be
  // replaced by, so a reader can see the lane exists rather than concluding it is
  // empty.
  has(html, 'data-cat="warm" data-warm-lane="bills"', "the warming row is not filed under the lane that is loading");
  has(html, "Legislation &amp; Bills", "the warming row does not name the lane a reader is waiting on");
  eq(count(html, /class="pdx-eye-warmrow"/g), 1, "a lane that has already answered is being given a spinner too");
  // A lane with hits gets no spinner: the hits are the better report on it.
  hasNot(html, 'data-warm-lane="people"', "the people lane has answered and is still being reported as loading");
  hasNot(html, 'data-warm-lane="issues"', "the issues lane has answered and is still being reported as loading");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3b · a cold REGISTER is its own lane, and its own loading line");
// ═════════════════════════════════════════════════════════════════════════════
{
  // WHAT WAS WRONG. The formal lane's first group is the issue FILES, and every
  // one of them is built from ISSUE_MAP — which ships with the deferred
  // alignment-tool.js. Readiness was asked once for "issues" and answered out of
  // the core list (inline) and the spotlight bundle, neither of which says
  // anything about the register. So a formal query a file answers could be denied
  // while the register was still on the wire, which is the 6644 defect wearing a
  // different lane's clothes.
  const B = await boot({ people: 1, stances: 1, issues: 1, spotlights: 1,
    lazy: { spotlights: true, bills: true }, bills: "live" }).ready();  // no register
  const html = B.search("water reuse");
  has(html, WARM, "a cold register does not say the issue files are still loading");
  hasNot(html, NOTHING, "a query the register answers is denied while the register is still loading");
  has(html, 'data-cat="warm" data-warm-lane="files"',
    "the loading line is not filed under the register's own lane");
  has(html, "Issue files", "the register's loading line does not name the group the answer will appear in");
  has(html, "the issue register", "the warming sentence does not name the register as what is still loading");
  // And the lanes that DID answer are not reported as loading, register or no.
  hasNot(html, 'data-warm-lane="bills"', "the settled bills lane is being reported as loading");
  hasNot(html, 'data-warm-lane="people"', "the loaded people lane is being reported as loading");
  // And a second later, because a ceiling wound down to nothing reports every
  // clock lane as ready the instant it is asked.
  B.travel(1000);
  const later = B.search("water reuse");
  hasNot(later, NOTHING, "a cold register starts denying a second in");
  has(later, 'data-warm-lane="files"', "the register's loading line is dropped a second in");

  // The register lands: same query, same boot shape, and now the file answers.
  const R = await boot({ ...ALL_READY }).ready();
  const hot = R.search("water reuse");
  has(hot, "Water Reuse", "with the register loaded the issue file does not rank");
  hasNot(hot, WARM, "with every lane loaded the eye still claims to be searching");
  // A MEASURE'S OWN SLICE, TOO: the register is warm and the bill fetch is not,
  // so the measure lane — not the whole panel — is what says it is loading.
  const M = boot({ ...ALL_READY, bills: "pending" });
  const cold = M.search("6644");
  hasNot(cold, NOTHING, "a measure number is denied while the measures are still paging");
  has(cold, 'data-warm-lane="bills"', "the measures lane does not print its own loading line");
  hasNot(cold, 'data-warm-lane="files"', "the loaded register is being reported as loading");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · ready and empty — the eye can still say no");
// ═════════════════════════════════════════════════════════════════════════════
{
  // THE POINT OF THIS PASS WAS NOT TO MAKE THE EYE UNABLE TO REFUSE. Every lane
  // loaded, a query nothing in the record answers: this is the one state where
  // "finds nothing" is a finding, and it must still be printed.
  const B = await boot(ALL_READY).ready();
  const html = B.search("qwertyuiopnothinghere");
  has(html, NOTHING, "with every lane ready and nothing matched, the eye will not say so");
  hasNot(html, WARM, "a fully loaded index is claiming to still be searching");
  has(html, "Try a name, an office, a state, an issue, or a bill number",
    "the denial no longer tells the reader what would work");
  hasNot(html, "pdx-eye-warmrow", "a ready lane is being given a spinner");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the ceiling — nothing warms forever");
// ═════════════════════════════════════════════════════════════════════════════
{
  // A lane whose source never announces itself — an offline boot, a 404, a bundle
  // nobody requests — must not leave the panel saying "Searching the record…" for
  // the rest of the session. A permanent "searching" is a worse lie than a
  // momentary "nothing", because it never resolves and never admits it.
  has(SRC, "LANE_DEADLINE_MS", "the lanes have no ceiling, so a dead source warms forever");
  const dl = SRC.match(/var LANE_DEADLINE_MS = (\d+);/);
  ok(dl && Number(dl[1]) > 0 && Number(dl[1]) <= 15000,
    `the warming ceiling is missing or unreasonable: ${dl && dl[1]}`);
  has(SRC, "return r || (clockGoverned(lane) && pastDeadline());", "laneReady does not fall through to the ceiling");
  // AND THE CEILING DOES NOT SPEAK FOR THE MEASURES LANE. The roster, the register
  // and the issue library wait on passive globals that never announce their own
  // absence, so only a clock can end their wait. The measures lane is told how its
  // request ended, and a deadline that expired mid-walk is exactly what denied
  // 8245 — so its wait ends on the request's own outcome. See section 2b.
  has(SRC, "function clockGoverned(lane) { return lane !== 'bills'; }",
    "the measures lane is back on the parse clock, which is how 8245 was denied");
  const sw = SRC.match(/var MEASURES_STALL_MS = (\d+);/);
  ok(sw && Number(sw[1]) >= 20000, `the measures stall window is missing or too short to outlast a paged walk: ${sw && sw[1]}`);

  // Driven, not read: the same cold boot with the clock wound past the deadline
  // reports honestly on whatever it did manage to load.
  const B = boot({ bills: "pending" });
  has(B.search("6644"), WARM, "the cold boot is not warming to begin with");
  B.travel(60000);
  const late = B.search("6644");
  hasNot(late, WARM, "a lane whose source never arrived is still saying it is searching a minute later");
  has(late, NOTHING, "past the ceiling the eye neither warms nor answers");
  // The MEASURES lane's version of the same guarantee, and the reason it is not the
  // parse clock: a request that has gone quiet has stalled, and a stall is an
  // outcome. Under the window the walk is still alive and nothing is denied; past
  // it the eye answers with what it has. The window is stamped by the request and
  // re-stamped by every page that lands, so a long walk that is still delivering
  // never reaches it.
  const S = boot({ ...ALL_READY, bills: "pending" });
  S.search("8245");
  S.travel(20000);
  hasNot(S.search("8245"), NOTHING, "a measures walk still inside its stall window is being denied");
  S.travel(60000);
  hasNot(S.search("8245"), WARM, "a measures request that went quiet is still said to be loading a minute later");

  // A request that came back as a FAILURE has also settled: the eye knows as much
  // as it is ever going to know, and owes the reader a straight answer rather than
  // a spinner. Driven through the real rejection path.
  const FAILED = await boot({ ...ALL_READY, bills: "reject" }).ready();
  const failed = FAILED.search("qwertyuiopnothinghere");
  hasNot(failed, WARM, "a bills request that failed leaves the lane warming forever");
  has(failed, NOTHING, "after a failed bills request the eye will not answer at all");

  // And every terminal path of the bills fetch clears the lane, not just success.
  const FETCH = SRC.slice(SRC.indexOf("function ensureEyeBills"), SRC.indexOf("// ── fuzzy scoring"));
  ok(FETCH.length > 200, "ensureEyeBills could not be sliced out — this probe has gone stale");
  has(FETCH, "pull(1).then(settleOrRetry, billsDone).catch(billsDone);",
    "the bills lane clears on success only, so one failed request warms forever");
  has(FETCH, "catch (e) { billsDone(); }", "a throw inside the fetch setup leaves the bills lane warming forever");
  // And it ASKS for the file it searches, rather than waiting for another part of
  // the page to want bills-index.js first.
  has(FETCH, "PDXLazyData", "the eye still waits for someone else to request the bill index");
  has(FETCH, "whenReady('bills'", "the eye does not rebuild when the lazily-injected bill index lands");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5b · the ceiling's clock cannot start before a lane could arrive");
// ═════════════════════════════════════════════════════════════════════════════
{
  // WHAT WAS WRONG. The ceiling was measured from the moment this file executed —
  // and this file is a plain sync tag partway down a very large document, while
  // every source it waits on is deferred and cannot run until the parse ends. On
  // a slow load the parse alone outran eight seconds, so the ceiling expired
  // before any lane had been offered a turn and the panel printed "finds nothing"
  // for a record that had not arrived. The ceiling still exists; its clock starts
  // when a deferred script could have run.
  has(SRC, "readyState", "the ceiling does not consult document readiness, so a slow parse denies");
  const P = boot({ bills: "pending", parsing: 1 });
  has(P.search("6644"), WARM, "a boot mid-parse is not warming to begin with");
  P.travel(60000);
  const late = P.search("6644");
  has(late, WARM, "the ceiling expired while the document was still parsing");
  hasNot(late, NOTHING, "a query is denied while the page is still being parsed and no lane could have loaded");
  // And it is still a ceiling: once the parse is done, a source that never
  // arrives resolves to an honest answer rather than a permanent spinner.
  P.settleParse();
  P.travel(60000);
  const done = P.search("6644");
  hasNot(done, WARM, "past the parse and past the deadline the eye is still saying it is searching");
  has(done, NOTHING, "after the parse finished and the ceiling passed the eye will not answer");

  // AND THE GATE IS THE CLOCK'S OWN, not something the measures lane covers for it.
  // With the measures list already in hand, the roster, the register and the issue
  // library are the only lanes left waiting — and while the document is still
  // parsing not one of them has been offered a turn, deadline or no.
  const C = await boot({ bills: "live", parsing: 1 }).ready();
  C.travel(60000);
  const still = C.search("qwertyuiopnothinghere");
  has(still, WARM, "the clock lanes expired while the document was still parsing");
  hasNot(still, NOTHING, "a query is denied mid-parse on the strength of a deadline alone");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · the guards are load-bearing (mutations must break the claims)");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Each mutation is a plausible way to put the defect back. Every one must make
  // at least one assertion above fail; a mutation that passes means the assertion
  // it was aimed at is decoration.
  const MUTS = [
    // Anchored through the mandate lane's own branch, which now sits above this
    // one: the mandate list is inline and never warming, so its empty state is a
    // locked sentence rather than a readiness check, and the readiness check this
    // mutation removes is the one the OTHER two lanes still owe the reader.
    ["the empty branch stops checking readiness",
      "? mandateEmptyHtml()\n          : (warm.length\n            ? warmPanel(warm) + warmStrip(warm, {})\n            : '<div class=\"pdx-eye-empty\">The eye finds nothing",
      "? mandateEmptyHtml()\n          : (false\n            ? warmPanel(warm) + warmStrip(warm, {})\n            : '<div class=\"pdx-eye-empty\">The eye finds nothing"],
    ["the bills lane is declared ready before its fetch settles",
      "bills: function () { return measuresWarm(); }",
      "bills: function () { return true; }"],
    // THE 8245 MUTATION. The measures lane put back on the parse clock, which is
    // the shape the defect shipped in: the deadline expires while the pages are
    // still landing and the panel reports an index it has not finished reading.
    ["the measures lane is put back on the parse clock",
      "function clockGoverned(lane) { return lane !== 'bills'; }",
      "function clockGoverned(lane) { return true; }"],
    ["the measures stall window is stretched past any wait, so a dead request never settles",
      "var MEASURES_STALL_MS = 30000;",
      "var MEASURES_STALL_MS = 9000000;"],
    ["the client's inline fallback is accepted as the fetched measures list",
      "if (d._inline) { fellBack = true; return; }",
      "if (d._inline) { }"],
    ["a cold lane's count is printed as a zero",
      "return laneCountCold(mode, counts, warm) ? '…' : ((counts && counts[mode]) || 0);",
      "return ((counts && counts[mode]) || 0);"],
    ["the warming notice loses its words",
      "'<b>Searching the record…</b>'",
      "'<b>Loading</b>'"],
    ["the ceiling is removed so a dead source warms forever",
      "return r || (clockGoverned(lane) && pastDeadline());",
      "return r;"],
    ["the ceiling is made instant so nothing ever warms",
      "var LANE_DEADLINE_MS = 8000;",
      "var LANE_DEADLINE_MS = 0;"],
    ["the per-lane warming rows are dropped",
      "html += warmStrip(warm,",
      "html += '' && warmStrip(warm,"],
    ["the register lane is declared ready before ISSUE_MAP lands",
      "files: function () { return registerCount() > 0; }",
      "files: function () { return true; }"],
    ["the ceiling stops waiting for the document to be parseable",
      "if (!docReady()) return false;\n      return (Date.now() - bootAt) > LANE_DEADLINE_MS;",
      "return (Date.now() - bootAt) > LANE_DEADLINE_MS;"],
    ["a failed bills fetch no longer clears the lane",
      "pull(1).then(settleOrRetry, billsDone).catch(billsDone);",
      "pull(1).then(settleOrRetry, function () {}).catch(function () {});"],
  ];
  // One probe per claim this suite makes. A mutation has to survive every one of
  // them to count as surviving, which is what makes the claims load-bearing rather
  // than decorative.
  const probe = async (src) => {
    // a · COLD WARMS, AND NEVER DENIES — on the first paint and on the paints
    //     just after it, which is where the reported flash actually lived.
    const coldBoot = boot({ bills: "pending" }, src);
    const cold = coldBoot.search("6644");
    if (!cold.includes(WARM) || !cold.includes(WARM_PANEL) || cold.includes(NOTHING)) return true;
    coldBoot.travel(500);
    const stillCold = coldBoot.search("6644");
    if (!stillCold.includes(WARM) || stillCold.includes(NOTHING)) return true;
    // b · A LOADING LANE SAYS SO IN ITS OWN SLOT.
    const half = boot({ people: 1, stances: 1, issues: 1, spotlights: 1, register: 1,
      lazy: { spotlights: true }, bills: "pending" }, src).search("housing");
    if (!half.includes('data-warm-lane="bills"')) return true;
    // c · A FAILED REQUEST HAS SETTLED, SO THE EYE ANSWERS.
    const failed = (await boot({ ...ALL_READY, bills: "reject" }, src).ready())
      .search("qwertyuiopnothinghere");
    if (failed.includes(WARM) || !failed.includes(NOTHING)) return true;
    // d · A SOURCE THAT NEVER ARRIVES HITS THE CEILING. Asked of a CLOCK lane — the
    //     roster, the register, the issue library — because those are the ones the
    //     ceiling exists for: nothing ever announces that their bundle is not
    //     coming. The measures lane has its own terminal signal; see probe h.
    const dead = await boot({ bills: "live" }, src).ready();
    dead.travel(60000);
    if (dead.search("qwertyuiopnothinghere").includes(WARM)) return true;
    const deadFetch = boot({ ...ALL_READY, bills: "pending" }, src);
    deadFetch.search("6644");
    deadFetch.travel(60000);
    if (deadFetch.search("qwertyuiopnothinghere").includes(WARM)) return true;
    // e · AND A LOADED INDEX STILL ANSWERS 6644.
    const hot = (await boot(ALL_READY, src).ready()).search("6644");
    if (!hot.includes("21st Century ROAD to Housing Act") || hot.includes(WARM)) return true;
    // f · A COLD REGISTER IS A LOADING FILE LANE, NOT A DENIAL — on the first paint
    //     and a second later, which is where a ceiling wound down to nothing shows
    //     up: an instant deadline reports every clock lane as ready on arrival.
    const regBoot = await boot({ people: 1, stances: 1, issues: 1, spotlights: 1,
      lazy: { spotlights: true, bills: true }, bills: "live" }, src).ready();
    const noReg = regBoot.search("water reuse");
    if (noReg.includes(NOTHING) || !noReg.includes('data-warm-lane="files"')) return true;
    regBoot.travel(1000);
    const noRegLater = regBoot.search("water reuse");
    if (noRegLater.includes(NOTHING) || !noRegLater.includes('data-warm-lane="files"')) return true;
    // g · A DOCUMENT STILL PARSING HAS NOT HAD ITS CHANCE, DEADLINE OR NO. Asked
    //     with the measures list already in hand, so it is the CLOCK lanes' own
    //     parse gate being measured and not something the measures lane covers for.
    const parsing = boot({ bills: "pending", parsing: 1 }, src);
    parsing.search("6644");
    parsing.travel(60000);
    if (parsing.search("6644").includes(NOTHING)) return true;
    const parsedClock = await boot({ bills: "live", parsing: 1 }, src).ready();
    parsedClock.travel(60000);
    if (parsedClock.search("qwertyuiopnothinghere").includes(NOTHING)) return true;
    // h · THE 8245 WALK. The measures request is still going, the old eight-second
    //     ceiling has long since passed, and the memo is still coming: a loading
    //     line in the measures group, a Formal count that is not a zero, and not a
    //     word of denial.
    const walking = boot({ ...ALL_READY, bills: "pending" }, src);
    walking.search("8245");
    walking.travel(10000);
    const mid = walking.search("8245");
    if (mid.includes(NOTHING) || !mid.includes('data-warm-lane="bills"')) return true;
    if (String(laneN(mid, "formal")).includes("0")) return true;
    const memo = (await boot({ ...ALL_READY, bills: "memo" }, src).ready()).search("8245");
    if (!memo.includes(MEMO_SHORT) || memo.includes(WARM)) return true;
    // i · A PAPERED-OVER FAILURE IS NOT A FETCHED SLICE, and it is asked again once.
    const fb = await boot({ ...ALL_READY, bills: "fallback" }, src).ready();
    if (fb.win.__pdxEyeBillsLive || fb.win.__billsCalls !== 2) return true;
    return false;
  };
  ok(!(await probe(SRC)), "the probes reject the SHIPPED file — the harness itself is broken");
  for (const [name, from, to] of MUTS) {
    if (!SRC.includes(from)) { failures.push(`mutation "${name}" no longer applies — its anchor has moved`); continue; }
    let broke = false;
    try { broke = await probe(SRC.replace(from, to)); }
    catch (e) { broke = true; }   // a mutation that will not even boot is caught
    ok(broke, `mutation survived every probe: ${name}`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the fix ships to a warm device");
// ═════════════════════════════════════════════════════════════════════════════
{
  // all-seeing-eye.js is a RUNTIME cache entry, and the runtime cache name carries
  // CACHE_VERSION — so without a bump a returning reader keeps the copy of the eye
  // that denies 8245, and every claim above is true only of a first-time visit.
  const SW = R("sw.js");
  const v = Number(String((SW.match(/const CACHE_VERSION = 'v(\d+)'/) || [])[1] || 0));
  ok(v >= 120, `sw.js CACHE_VERSION is v${v || "?"} — the eye changed and a warm device would keep the old one`);
  has(SW, "const RUNTIME_CACHE = `politidex-runtime-${CACHE_VERSION}`",
    "the runtime cache name no longer carries CACHE_VERSION, so a bump does not drop the stale eye");
}

// ── report ───────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ eye warming: ${failures.length} failed, ${passed} passed`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`\n✓ eye warming: all ${passed} assertions passed`);
console.log(`  4 lanes · 2 measures (6644, 8245) · 1 ceiling · 1 stall window · 1 parse gate · mutations rejected`);
