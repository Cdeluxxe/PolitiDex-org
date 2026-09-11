#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-person-file-ttt.mjs — time-to-TRUE on a person file, measured
// ─────────────────────────────────────────────────────────────────────────────
// A cold open of /p/chew_h68 "sat on loading copy too long before the formal
// brief painted its counts". Every instrument for that complaint existed except
// the one that mattered: pdx-perf.js has documented
//
//   ['brief-loading', 'formal brief painted a loading state']
//   ['brief',         'formal brief swapped off loading']
//
// since the first perf pass, and NOTHING EVER TOOK THEM. Both printed an em dash
// on every waterfall, PDXPerf's own headline "time to brief off-loading" printed
// an em dash with them, and pdx-perf.js reads that absence as a FINDING — so the
// instrument was not silent about the brief, it was permanently wrong about it.
//
// The marks are now taken by the renderer that paints the brief — word-action.js
// lays them at heroInner, the letterhead's single choke point, on the frame that
// is about to be painted rather than on the branch that intended to. This
// harness is the measurement those marks
// make possible, and it holds the five things the fix is allowed to be:
//
//   1. FIVE STAGES, ONE CLOCK. For each pid it reports document start → person
//      file mount → voting-record request out → first page back → brief first
//      paint with real counts, off one monotonic clock, and prints them.
//   2. THE BRIEF DOES NOT WAIT ON THE MOUNT-TIME RECORD IT ALREADY HAS. When the
//      first page is in hand before the file mounts (which is what the head
//      prefetch is for), the brief's FIRST frame carries the census and NO
//      'brief-loading' mark is taken at all. A loading frame in that case is the
//      file lying about a record it is holding.
//   3. WHEN IT DOES WAIT, IT WAITS OUT LOUD AND REPAINTS AT ONCE. The wait frame
//      names the LANE still in flight ("still loading the roll-call record"),
//      never "still being built" and never the empty-file sentence, and the
//      repaint to counts follows 'vr-data' by a few milliseconds — the code path
//      between "page in hand" and "counts on screen" is not a second wait.
//   4. PAGE ONE IS ENOUGH. A page-1 payload that says hasMore: true paints the
//      full census immediately, and the figures equal that page's own inventory
//      exactly — nothing is extrapolated, nothing is held back for page 2, and
//      no second request is issued to get it.
//   5. THE PREFETCH IS CANONICAL, AND EARLY. The real head block from index.html
//      is executed for /p/chew_h68 AND the retired /p/scott_chew; both issue one
//      request, both at chew_h68, before any module (let alone the roster) runs.
//
// Deadlines: the brief's own wait ceiling stays under the roster's, so the brief
// can never be the reason a file is still loading when the roster has given up.
//
// The engine here is the SHIPPED files, executed in a node:vm context (the
// scripts/test-lyman-cold-boot.mjs idiom) — there is no browser in this
// environment, so stages that are pure document cost (HTML parse, 97 deferred
// modules) are NOT claimed as measured; what is measured is everything from the
// mount onward, which is the half this pass is allowed to touch.
//
//   node scripts/test-person-file-ttt.mjs
//   PDXTTT=1 node scripts/test-person-file-ttt.mjs   # print the waterfalls only

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).includes(n), `${m} — missing ${JSON.stringify(n)}`);
const hasnt = (h, n, m) => ok(!String(h).includes(n), `${m} — still contains ${JSON.stringify(n)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (c) return; console.error(`✗ person-file time-to-true: STALE HARNESS — ${m}`); process.exit(2); };

// The engine, in document order. Same list scripts/test-lyman-cold-boot.mjs
// boots: everything the formal brief reads and nothing that needs a DOM.
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "formal-index.js", "issue-colors.js", "consistency.js", "voting-record.js",
  "word-action.js", "stance-tree.js", "profile-spine.js", "profile-evidence.js"
];

// ── The clock ────────────────────────────────────────────────────────────────
// One origin for the whole run, so every number printed below is "ms since this
// document started" — which is what performance.now() is in the browser and
// therefore what PDXPerf.mark stores.
let T0 = 0;
const now = () => Date.now() - T0;

// ── The page ─────────────────────────────────────────────────────────────────
function boot(opts) {
  opts = opts || {};
  const win = makeSandbox();
  win.location.pathname = opts.path || "/";
  win.location.search = "";

  const bus = new Map();
  win.addEventListener = (t, h) => { if (!bus.has(t)) bus.set(t, []); bus.get(t).push(h); };
  win.removeEventListener = (t, h) => { const a = bus.get(t) || []; const i = a.indexOf(h); if (i >= 0) a.splice(i, 1); };
  win.dispatchEvent = (ev) => {
    for (const h of (bus.get(ev && ev.type) || []).slice()) { try { h(ev); } catch (e) {} }
    return true;
  };

  // The renderer finds its own mounted host by attribute; nothing else here
  // needs a DOM, and anything that asks for one gets a miss rather than a stub
  // that would let a render silently succeed against nothing.
  const hosts = new Map();
  win.__hosts = hosts;
  win.document.querySelector = (sel) => {
    const m = /^\[([a-z0-9-]+)="([^"]+)"\]$/i.exec(String(sel || ""));
    return m ? (hosts.get(m[1] + "=" + m[2]) || null) : null;
  };
  win.document.getElementById = () => null;

  win.setTimeout = (fn, ms) => setTimeout(fn, ms);
  win.clearTimeout = (t) => clearTimeout(t);
  win.setInterval = () => 0;
  win.clearInterval = () => {};
  win.requestIdleCallback = (fn) => setTimeout(fn, 0);
  win.history = { replaceState() {}, pushState() {} };
  win.URLSearchParams = URLSearchParams;
  win.AbortController = AbortController;
  win.performance = { now: () => now() };
  win.auth = { currentUser: null };

  // The head's clock, byte-for-byte in behaviour: first write wins, order kept.
  win.PDXPerf = {
    marks: {}, order: [],
    mark: function (n, at) {
      if (!n || this.marks[n] !== undefined) return this.marks[n];
      const t = (at === undefined) ? win.performance.now() : at;
      this.marks[n] = t; this.order.push(n); return t;
    },
    between: function (a, b) {
      const x = this.marks[a], y = this.marks[b];
      return (x === undefined || y === undefined) ? null : (y - x);
    }
  };

  const bag = {};
  const store = {
    length: 0, key: () => null,
    getItem: (k) => (Object.prototype.hasOwnProperty.call(bag, k) ? bag[k] : null),
    setItem: (k, v) => { bag[k] = String(v); },
    removeItem: (k) => { delete bag[k]; }
  };
  win.localStorage = store; win.sessionStorage = store;

  const reqs = [];
  win.__reqs = reqs;
  win.fetch = (url) => {
    reqs.push(String(url));
    const hit = (opts.payloads || []).find((p) => String(url).indexOf("/member/" + p.pid) !== -1);
    if (!hit) return new Promise(() => {});       // a request nobody stubbed hangs, it does not 404-and-pass
    return new Promise((res) => setTimeout(() => res({
      ok: true, status: 200, headers: { get: () => null },
      json: () => Promise.resolve(hit.body)
    }), hit.ms || 0));
  };

  const ctx = vm.createContext(win);
  win.PROFILES = {};
  win.__err = [];
  for (const f of FILES) {
    try { vm.runInContext(R(f), ctx, { filename: f }); }
    catch (e) { win.__err.push(`${f}: ${e.message}`); }
  }
  return win;
}

// ── A Chew-class page-1 payload ──────────────────────────────────────────────
// The documented member shape, at the size the endpoint actually serves:
// pageSize 100 (PAGE_SIZE_MAX), a deep Utah legislator's total behind it, and
// two issue rows per act — which is why the census reads more "votes and formal
// actions read" than there are items, and why page 1 is already an inventory.
const KEYS = ["housing", "education", "water", "taxes", "healthcare",
  "guns", "energy", "transportation", "agriculture", "elections"];
function payload(pid, n, total) {
  const items = [];
  for (let i = 0; i < n; i++) {
    items.push({
      kind: "vote", measureId: 1000 + i, measureType: "bill", number: "H.B. " + (100 + i),
      title: "Act " + i, chamber: "house", status: "enacted",
      date: new Date(Date.UTC(2025, 0, 1 + (i % 28))).toISOString(),
      action: "On passage", actionType: "passage", position: (i % 5) ? "yea" : "nay",
      result: "Passed", isParty: "with_party", supports: null, isProcedural: false,
      advanceInverted: false, isAmendment: false, parentMeasureId: null,
      rollcallId: 5000 + i, congress: null, session: "2025GS", rollNumber: i + 1,
      measureIdent: { session: "2025GS", readFrom: null, readFromUrl: null, officialTitle: null, billUrl: null },
      issues: [
        { issueKey: KEYS[i % KEYS.length], weight: 1, isPrimary: true, supportMeaning: "advances", rationale: "on the record" },
        { issueKey: KEYS[(i * 3 + 1) % KEYS.length], weight: 0.5, isPrimary: false, supportMeaning: "advances", rationale: "on the record" }
      ],
      source: { url: "https://le.utah.gov/x", label: "Utah Legislature" }
    });
  }
  return {
    politicianId: pid,
    filters: { issue: null, chamber: null, actionType: null, position: null, result: null, q: null, from: null, to: null, hideProcedural: false, sort: "date" },
    summary: { totalRecords: total, votes: items.length, positions: 0, withParty: items.length, againstParty: 0 },
    items, page: 1, pageSize: 100, total: total, totalPages: Math.ceil(total / 100), hasMore: total > n
  };
}

// What page 1 itself contains, counted outside the engine, so "the census equals
// page 1" is not the engine agreeing with itself.
function inventoryOf(body) {
  const keys = new Set();
  let rows = 0;
  body.items.forEach((it) => (it.issues || []).forEach((ix) => { keys.add(ix.issueKey); rows++; }));
  return { issues: keys.size, rows: rows };
}

// ── One cold open ────────────────────────────────────────────────────────────
// `warmFirst` is the head-prefetch case: the first page is already in the record
// cache when the file mounts. Otherwise the payload lands `netMs` after the
// request goes out, and the brief has to wait and then repaint.
function coldOpen(pid, opts) {
  opts = opts || {};
  const body = opts.body;
  T0 = Date.now();
  const win = boot({ path: "/p/" + pid, payloads: [{ pid: pid, ms: opts.netMs || 120, body: body }] });
  must(!win.__err.length, `engine did not boot: ${win.__err.join("; ")}`);
  const VR = win.PDXVotingRecord, WA = win.PDXWordAction;
  must(VR && typeof VR.fetchMember === "function", "PDXVotingRecord.fetchMember is gone");
  must(WA && typeof WA.heroMount === "function", "PDXWordAction.heroMount is gone");

  const p = (win.CMP_DATA && win.CMP_DATA[pid]) ? Object.assign({ id: pid }, win.CMP_DATA[pid]) : { id: pid };
  must(win.CMP_DATA && win.CMP_DATA[pid], `${pid} is no longer in cmp-data.js`);

  const t = { docStart: 0, mount: null, reqOut: null, firstPage: null };
  if (opts.warmFirst) { VR.noteMember(pid, body.items); t.firstPage = now(); }

  const html = WA.heroMount(pid, p, {});
  t.mount = now();
  const hostId = /data-pdxwa-hero="([^"]+)"/.exec(html);
  must(hostId, "the hero no longer stamps data-pdxwa-hero");
  const first = html.replace(/^\s*<div[^>]*>/, "").replace(/<\/div>\s*$/, "");
  let cur = first;
  const frames = [{ t: t.mount, html: first }];
  win.__hosts.set("data-pdxwa-hero=" + hostId[1], {
    classList: { toggle() {} }, setAttribute() {}, removeAttribute() {},
    get innerHTML() { return cur; },
    set innerHTML(v) { cur = String(v); frames.push({ t: now(), html: cur }); }
  });

  return new Promise((resolve) => {
    if (!opts.warmFirst) {
      t.reqOut = now();
      VR.fetchMember(pid, { pageSize: 100 }).then((d) => {
        t.firstPage = now();
        VR.noteMember(pid, d.items);
        win.dispatchEvent(new win.CustomEvent("pdx-voting-warm", { detail: { pid: pid } }));
      });
    }
    setTimeout(() => {
      const FPI = win.PDXConsistency && win.PDXConsistency.formalPatternIndex;
      resolve({
        pid, win, frames, t,
        marks: win.PDXPerf.marks,
        order: win.PDXPerf.order.slice(),
        reqs: win.__reqs.slice(),
        shape: FPI ? FPI.shape(pid) : null
      });
    }, (opts.netMs || 120) + 420);
  });
}

const laneOf = (h) => (/pdxwa-shape-depth/.test(h) ? "counts"
  : /still loading/i.test(h) ? "loading"
  : /did not load/i.test(h) ? "failed"
  : /pdxwa-brief-empty/.test(h) ? "absent" : "other");
const text = (h) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const ms = (v) => (v === null || v === undefined ? "—" : Math.round(v) + "ms");

// ═════════════════════════════════════════════════════════════════════════════
const WA_SRC = R("word-action.js");
const PERF_SRC = R("pdx-perf.js");
const PF_SRC = R("person-file.js");
const INDEX = R("index.html");

const CHEW = "chew_h68", SCHULTZ = "mschultz";
const chewBody = payload(CHEW, 100, 125);          // 100 of 125 on file — hasMore
const schultzBody = payload(SCHULTZ, 100, 109);    // 100 of 109 on file — hasMore
const chewFull = payload(CHEW, 125, 125);          // the whole record, hasMore false

const cold = {};
const warm = {};
for (const [pid, body] of [[CHEW, chewBody], [SCHULTZ, schultzBody]]) {
  cold[pid] = await coldOpen(pid, { body, netMs: 120 });
  warm[pid] = await coldOpen(pid, { body, netMs: 120, warmFirst: true });
}
const full = await coldOpen(CHEW, { body: chewFull, netMs: 120 });

// ── The five stages, printed ────────────────────────────────────────────────
function waterfall(label, r) {
  console.log(`\n   ${label}`);
  console.log(`     document start ................................ ${ms(r.t.docStart)}`);
  console.log(`     person file mount ............................. ${ms(r.t.mount)}`);
  console.log(`     voting-record request out ..................... ${ms(r.marks["vr-fetch-start"] !== undefined ? r.marks["vr-fetch-start"] : r.t.reqOut)}`);
  console.log(`     voting-record first page back ................. ${ms(r.marks["vr-data"] !== undefined ? r.marks["vr-data"] : r.t.firstPage)}`);
  console.log(`     formal brief first paint, real counts ......... ${ms(r.marks["brief"])}`);
  console.log(`     (brief painted a loading state at ............. ${ms(r.marks["brief-loading"])})`);
  const lanes = r.frames.map((f) => `${laneOf(f.html)}@${Math.round(f.t)}ms`).join(" → ");
  console.log(`     frames: ${lanes}`);
  if (r.shape) console.log(`     census: ${r.shape.issues} issues · ${r.shape.judged} read · ${r.shape.characterised} characterised`);
}
console.log("\n   ══ the five stages, on the harness clock ══");
waterfall(`/p/${CHEW} — first page lands after the mount`, cold[CHEW]);
waterfall(`/p/${CHEW} — first page in hand at the mount (head prefetch)`, warm[CHEW]);
waterfall(`/p/${SCHULTZ} — first page lands after the mount`, cold[SCHULTZ]);
waterfall(`/p/${SCHULTZ} — first page in hand at the mount (head prefetch)`, warm[SCHULTZ]);
if (process.env.PDXTTT === "1") process.exit(0);

// ── 1 · the fifth stage exists at all ───────────────────────────────────────
section("1 · the brief's own stages are taken, not just documented");
{
  has(PERF_SRC, "['brief-loading',", "pdx-perf.js still documents the loading stage");
  has(PERF_SRC, "['brief',", "pdx-perf.js still documents the off-loading stage");
  has(PERF_SRC, "time to brief off-loading", "the headline the brief is judged on still exists");
  has(WA_SRC, "function perfBrief(", "word-action.js takes the brief marks");
  [CHEW, SCHULTZ].forEach((pid) => {
    ok(cold[pid].marks["brief"] !== undefined,
      `/p/${pid}: 'brief' is marked on a cold open — without it the waterfall's last stage is an em dash forever`);
    ok(cold[pid].marks["brief-loading"] !== undefined,
      `/p/${pid}: 'brief-loading' is marked when the brief paints a wait`);
  });
}

// ── 2 · a record in hand at mount paints counts on frame ONE ────────────────
section("2 · no loading frame when the first page is already in hand");
{
  [CHEW, SCHULTZ].forEach((pid) => {
    const r = warm[pid];
    eq(laneOf(r.frames[0].html), "counts", `/p/${pid}: the FIRST frame carries the census, not a wait`);
    eq(r.marks["brief-loading"], undefined, `/p/${pid}: no loading state is marked at all`);
    ok(r.marks["brief"] !== undefined && r.marks["brief"] <= r.t.mount + 5,
      `/p/${pid}: 'brief' lands at the mount (${ms(r.marks["brief"])} vs mount ${ms(r.t.mount)})`);
    eq(r.reqs.length, 0, `/p/${pid}: a record already in hand costs no request`);
    ok(!/still loading/i.test(r.frames.map((f) => f.html).join("")),
      `/p/${pid}: the word "loading" never reaches the reader`);
  });
}

// ── 3 · when it waits, it names the lane and repaints at once ───────────────
section("3 · the wait names the roll-call lane, and ends a few ms after the page");
{
  [CHEW, SCHULTZ].forEach((pid) => {
    const r = cold[pid];
    const f0 = text(r.frames[0].html);
    eq(laneOf(r.frames[0].html), "loading", `/p/${pid}: the first frame is a declared wait`);
    ok(/still loading/i.test(f0) && /(roll-call|formal record)/i.test(f0),
      `/p/${pid}: the wait names what is in flight — got ${JSON.stringify(f0.slice(0, 120))}`);
    // The two sentences this pass exists to never see again.
    hasnt(f0, "still being built", `/p/${pid}: the wait does not blame a build`);
    hasnt(f0, "No formal pattern on file yet", `/p/${pid}: a record in flight is not reported as an empty file`);
    // …and the repaint.
    const last = r.frames[r.frames.length - 1];
    eq(laneOf(last.html), "counts", `/p/${pid}: the brief ends on real counts`);
    ok(r.frames.length >= 2, `/p/${pid}: the wait is replaced in place, not left up`);
    const gap = r.marks["brief"] - r.marks["vr-data"];
    ok(gap >= 0 && gap < 250,
      `/p/${pid}: counts paint ${Math.round(gap)}ms after the first page — the code path between them is not a second wait`);
    ok(r.marks["brief"] > r.marks["brief-loading"],
      `/p/${pid}: the loading mark comes first and first-write-wins keeps both`);
  });
}

// ── 4 · page one is the whole brief ─────────────────────────────────────────
section("4 · a hasMore page-1 payload paints the full census, from page 1 only");
{
  eq(chewBody.hasMore, true, "the chew fixture really is an incomplete record");
  const r = cold[CHEW];
  const inv = inventoryOf(chewBody);
  eq(r.shape.issues, inv.issues, "every issue page 1 touches is on the brief");
  eq(r.shape.judged, inv.rows, "the brief reads every issue row page 1 carries (a two-issue act counts twice)");
  ok(r.shape.judged > chewBody.items.length,
    `the census is issue rows, not items (${r.shape.judged} read from ${chewBody.items.length} acts)`);
  has(r.frames[r.frames.length - 1].html, "issues on the formal record", "the census line is the one that painted");
  eq(r.reqs.length, 1, "exactly one request — nothing goes looking for page 2");
  // And the complete record paints the same lane at the same moment, so the
  // brief is reading inventory, not waiting on a totals check.
  eq(laneOf(full.frames[full.frames.length - 1].html), "counts", "a complete record paints the same lane");
  eq(full.reqs.length, 1, "a complete record costs the same one request");
  const fullGap = full.marks["brief"] - full.marks["vr-data"];
  ok(Math.abs(fullGap - (r.marks["brief"] - r.marks["vr-data"])) < 200,
    "page-1-only and whole-record briefs paint at the same remove from their page");
  // No all-pages loop anywhere the brief can reach it.
  ["word-action.js", "consistency.js", "voting-record.js", "formal-index.js"].forEach((f) => {
    const src = R(f);
    hasnt(src, "while (hasMore", `${f} has no all-pages loop`);
    hasnt(src, "totalPages;", `${f} does not gate on a page count`);
  });
  // pageSize is untouched: shrinking it would change published figures.
  const API = R("netlify/functions/voting-record.mts");
  has(API, "PAGE_SIZE_MAX = 100", "the endpoint's page ceiling is unchanged");
  has(API, "PAGE_SIZE_DEFAULT = 50", "the endpoint's default page size is unchanged");
  has(INDEX, "var qs = '?pageSize=100';", "the head prefetch still asks for the 100-row page");
  has(API, "rationale", "issues[].rationale is still shipped");
}

// ── 5 · the prefetch is canonical and early ─────────────────────────────────
section("5 · one request, at the canonical pid, before any module");
{
  const MARKER = "PERSON-FILE COLD OPEN";
  must(INDEX.includes(MARKER), `index.html no longer contains the "${MARKER}" block`);
  const s = INDEX.indexOf("<script>", INDEX.indexOf(MARKER));
  const e = INDEX.indexOf("</script>", s);
  must(s !== -1 && e !== -1, "the inline cold-open script is unterminated");
  const BLOCK = INDEX.slice(s + 8, e);

  // The real block, run for both addresses the retired identity can be reached by.
  const runHead = (path) => {
    const seen = [];
    const w = {
      location: { pathname: path },
      performance: { now: () => 1 },
      sessionStorage: { getItem: () => null, setItem() {} },
      AbortController: AbortController,
      setTimeout: (fn) => setTimeout(fn, 0),
      clearTimeout: (t) => clearTimeout(t),
      Date: Date, JSON: JSON, Error: Error, Promise: Promise,
      encodeURIComponent: encodeURIComponent,
      fetch: (u) => { seen.push(String(u)); return new Promise(() => {}); }
    };
    w.window = w;
    vm.createContext(w);
    vm.runInContext(BLOCK, w, { filename: "index.html#cold-open" });
    return { w, seen };
  };
  const canon = "/api/voting-record/member/chew_h68?pageSize=100";
  const a = runHead("/p/chew_h68");
  const b = runHead("/p/scott_chew");
  eq(a.w.__pdxVRPrefetch.url, canon, "/p/chew_h68 prefetches its own record");
  eq(b.w.__pdxVRPrefetch.url, canon, "/p/scott_chew prefetches chew_h68 — the retired identity stays retired");
  eq(b.w.__pdxVRPrefetch.pid, "chew_h68", "the published box carries the canonical pid");
  // The request is in flight on a microtask, not behind anything.
  await new Promise((r) => setTimeout(r, 20));
  eq(a.seen.length, 1, "/p/chew_h68 issues exactly one request");
  eq(b.seen.length, 1, "/p/scott_chew issues exactly one request");
  eq(b.seen[0], canon, "…and it is the canonical URL");
  eq(a.w.PDXPerf.marks["head"], 1, "the clock opens in the head");
  ok(a.w.PDXPerf.marks["vr-prefetch-retry"] !== undefined || a.w.PDXPerf.marks["vr-prefetch-start"] !== undefined,
    "the head's own request takes a mark, so 'request out' is readable");

  // It cannot be waiting on the roster: the block reads nothing but the address,
  // and person-file warms before it waits.
  hasnt(BLOCK, "_pdxRosterState", "the head prefetch does not consult the roster");
  hasnt(BLOCK, "PROFILES", "the head prefetch does not consult the roster table");
  const ba = PF_SRC.match(/function bootAdopt\(\)[\s\S]*?\n  \}/);
  must(ba, "person-file's bootAdopt is gone");
  // The STATEMENTS, not the prose: bootAdopt's own comment says "attempt() below
  // is a WAIT" several lines above the warm call, so an indexOf on the bare
  // names would read the explanation and pass whatever the code did.
  const wi = ba[0].indexOf("warm(target)");
  const ai = ba[0].search(/\battempt\(pid,/);
  must(wi !== -1 && ai !== -1, "bootAdopt no longer warms a target and then attempts the roster");
  ok(wi < ai, "bootAdopt warms the record BEFORE it starts waiting on the roster");
  ok(ba[0].indexOf("dropStalePrefetch(target)") !== -1
    && ba[0].indexOf("dropStalePrefetch(target)") < wi,
    "a prefetch for the wrong member is abandoned before the right one is warmed");
}

// ── 6 · the brief's deadline is shorter than the roster's ───────────────────
section("6 · a bounded wait, and a failed load that says so");
{
  const bw = WA_SRC.match(/BRIEF_WAIT_MS\s*=\s*(\d+)/);
  const pg = WA_SRC.match(/PAYLOAD_GRACE_MS\s*=\s*(\d+)/);
  const ceil = PF_SRC.match(/CEILING\s*=\s*(\d+)/);
  must(bw && pg && ceil, "BRIEF_WAIT_MS / PAYLOAD_GRACE_MS / CEILING are gone");
  ok(+bw[1] < +ceil[1], `the brief gives up waiting (${bw[1]}ms) before the roster does (${ceil[1]}ms)`);
  ok(+pg[1] < +bw[1], `the payload grace (${pg[1]}ms) is shorter than the wait itself`);

  // A load that failed is not an empty file, and the brief marks it as SETTLED —
  // a reader who is told "reload to try again" is not being asked to wait.
  has(WA_SRC, "That is a loading failure, not an empty file", "a failed load says it is not an empty file");
  // The classifier is a LIST OF THE TWO WAIT SENTENCES and nothing else, so a
  // settled absence — reviewed empty file, mapped gap, or a load that failed and
  // says so — is `brief`, not `brief-loading`. A reader told "reload to try again"
  // is not being asked to wait, and the waterfall must not say they were.
  const wc = WA_SRC.match(/_WAIT_COPIES = \[[^\]]*\]/);
  must(wc, "the wait-copy list perfBrief classifies on is gone");
  has(wc[0], "WAIT_ONFILE_COPY", "the on-file wait sentence counts as 'brief-loading'");
  has(wc[0], "WAIT_BARE_COPY", "the bare wait sentence counts as 'brief-loading'");
  hasnt(wc[0], "FAILED_", "a failed load is a settled answer, not a loading state");
  // All four copies still exist as single unbroken literals — the classifier
  // matches on the sentence itself, so a line-wrapped literal would silently stop
  // recognising a wait and every waterfall would read `brief` at t=0.
  ["WAIT_ONFILE_COPY", "WAIT_BARE_COPY", "FAILED_ONFILE_COPY", "FAILED_BARE_COPY"].forEach((n) => {
    ok(new RegExp("var " + n + " = '[^']+';").test(WA_SRC),
      `${n} is no longer one unbroken literal — perfBrief classifies by matching the sentence`);
  });
  // And the two the classifier does NOT name are the failed-load pair.
  hasnt(wc[0], "FAILED_ONFILE_COPY", "the on-file failure is settled, not a wait");
  hasnt(wc[0], "FAILED_BARE_COPY", "the bare failure is settled, not a wait");
}

// ── 7 · nothing else moved ──────────────────────────────────────────────────
section("7 · no score / party / floor / mapping drift");
{
  // The two files in this pass's blast radius, checked for the things it was
  // told not to touch.
  const pb = WA_SRC.match(/function perfBrief\(html\) \{[\s\S]*?\n  \}/);
  must(pb, "perfBrief is gone, or no longer takes the frame it is about to mark");
  has(pb[0], "return html;", "perfBrief no longer returns the html it was handed");
  ["score", "percent", "%", "floor", "party", "isPrimary"].forEach((w) => {
    hasnt(pb[0], w, `the brief mark reads no ${w}`);
  });
  has(pb[0], "/^\\/p\\/[A-Za-z0-9_]+\\/?$/", "the brief marks are taken on /p/<pid> only");
  has(pb[0], "typeof P.mark !== 'function'", "a page with no clock is a no-op");
  // The census figures for both files are the page's own inventory, unchanged by
  // the marks: same numbers warm and cold.
  [CHEW, SCHULTZ].forEach((pid) => {
    eq(cold[pid].shape.issues, warm[pid].shape.issues, `/p/${pid}: issue count is the same warm and cold`);
    eq(cold[pid].shape.judged, warm[pid].shape.judged, `/p/${pid}: read count is the same warm and cold`);
    eq(cold[pid].shape.characterised, warm[pid].shape.characterised, `/p/${pid}: characterised count is the same warm and cold`);
  });
  // And the bundle this pass was told to leave alone is still exactly as loaded.
  has(INDEX, '<script defer src="/pdx-perf.js"></script>', "pdx-perf.js is still deferred");
  has(INDEX, 'src="/word-action.js"', "word-action.js is still a deferred module");
}

if (failures.length) {
  console.error(`\n✗ person-file time-to-true: ${failures.length} failed, ${passed} passed\n`);
  failures.forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}
console.log(`\n✓ person-file time-to-true: the brief's own stages are measured, and page 1 is the whole brief — ${passed} assertions passed\n`);
