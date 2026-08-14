#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// 🚿 The warm queue — pacing, not stampeding
// ─────────────────────────────────────────────────────────────────────────────
// Every roster card that renders a pending consistency verdict calls
// PDXConsistency.warm() for its member, so ONE homepage render queues the whole
// roster — ~950 people. The queue used to flush all of them in a single pass.
//
// What that cost, measured in Chromium on a cold load of the real homepage:
//   • ~950 concurrent requests of ~125 KB each;
//   • the browser's per-host limit then served them strictly in ask-order, so the
//     handful of members the hero showcase needs sat behind hundreds of roster
//     fetches — which is why those cards stayed on "Loading the record…";
//   • every arrival dispatches a warm event, so ~950 responses, parses and
//     listener passes stacked into as few tasks as the network would allow.
//
// The contract this file holds the queue to:
//   1. Nothing is dropped. Every queued member is still fetched, noted and
//      announced — pacing is not sampling.
//   2. A bounded number are in flight at once.
//   3. One member's failure never stalls the rest. A card may fail closed; the
//      page may not.
//   4. One attempt per member, and the event names who settled, so a listener can
//      do one member's work instead of re-reading everything.
//   5. A request that never answers is answered FOR — on a deadline. This is the
//      one failure the queue cannot ride out otherwise: a stalled connection
//      neither resolves nor rejects, so its slot is never released and the members
//      behind it never warm, while the cards waiting on them spin forever. The
//      same deadline exists one layer down, on the request itself, because
//      fetchMember hands every later caller the same memoised promise.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = readFileSync(join(ROOT, "consistency.js"), "utf8");

let fails = 0, passes = 0;
function ok(c, msg) { if (c) passes++; else { fails++; console.log(`\n  ${fails}. ${msg}`); } }
function eq(a, b, msg) { ok(a === b, `${msg} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`); }

// A sandbox with just enough browser to load the engine and drive its queue.
function harness() {
  const timers = [];
  const events = [];
  const pending = [];          // one entry per outstanding fetch
  const noted = [];            // pids whose rows reached PDXVotingRecord.noteMember
  let inFlight = 0, peak = 0, started = 0;
  // A virtual clock, because the queue now has a DEADLINE as well as a debounce.
  // Firing every queued timeout regardless of its delay would fire that deadline
  // the instant a request started, which is the opposite of what it is for.
  let clock = 0;

  const win = {};
  const ctx = {
    console, JSON, Math, Date, String, Number, Array, Object, Boolean, RegExp, Error,
    isNaN, parseInt, parseFloat, encodeURIComponent, decodeURIComponent, Promise, Set, Map,
    window: win,
    setTimeout: (fn, ms) => { timers.push({ fn, at: clock + (ms || 0) }); return timers.length; },
    clearTimeout: () => {},
    setInterval: () => 0,
    clearInterval: () => {},
    document: {
      readyState: "complete",
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, set innerHTML(_v) {} }),
      head: { appendChild() {} },
      body: { appendChild() {} },
      addEventListener() {},
    },
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  win.window = win;
  win.document = ctx.document;
  win.setTimeout = ctx.setTimeout;
  win.addEventListener = () => {};
  win.removeEventListener = () => {};
  win.CustomEvent = function (type, init) { this.type = type; this.detail = init && init.detail; };
  ctx.CustomEvent = win.CustomEvent;
  win.dispatchEvent = (ev) => { events.push(ev); return true; };

  win.PDXVotingRecord = {
    fetchMember(pid) {
      started++;
      inFlight++;
      if (inFlight > peak) peak = inFlight;
      return new Promise((resolve, reject) => { pending.push({ pid, resolve, reject }); });
    },
    noteMember(pid) { noted.push(pid); },
    memberRecords: () => [],
  };

  vm.runInContext(SRC, ctx, { filename: "consistency.js" });

  return {
    win, events, pending, timers, noted,
    get inFlight() { return inFlight; },
    get peak() { return peak; },
    get started() { return started; },
    // Advance the clock and run whatever came due, repeatedly, then drain
    // microtasks. 200ms a round clears the 150ms flush debounce and the zero-delay
    // pump continuations without reaching the per-job deadline; pass a bigger step
    // to simulate a request that simply never comes back.
    async tick(rounds = 1, advance = 200) {
      for (let i = 0; i < rounds; i++) {
        clock += advance;
        const due = timers.filter((t) => t.at <= clock);
        due.forEach((t) => { timers.splice(timers.indexOf(t), 1); });
        due.forEach((t) => { try { t.fn(); } catch (e) {} });
        await Promise.resolve(); await Promise.resolve();
      }
    },
    // Settle the oldest outstanding request.
    async settle(how = "ok") {
      const job = pending.shift();
      if (!job) return null;
      inFlight--;
      if (how === "throw") job.reject(new Error("network"));
      else job.resolve(how === "empty" ? { items: [] } : { items: [{ id: 1 }] });
      await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
      return job.pid;
    },
  };
}

const PIDS = Array.from({ length: 60 }, (_, i) => "m" + i);

// ── 1. The queue is bounded, and it is not a sample ──────────────────────────
{
  const h = harness();
  PIDS.forEach((p) => h.win.PDXConsistency.warm(p));
  eq(h.started, 0, "warming fetches synchronously — a render would pay for the whole roster inline");

  await h.tick();
  ok(h.started > 0, "the debounced flush never started, so nothing warms at all");
  ok(h.started <= 8,
    `the flush opened ${h.started} of ${PIDS.length} requests at once — this is the stampede that starved the\n` +
    "    showcase's own fetches and stacked ~950 parses into a handful of tasks");
  const cap = h.peak;

  // Drain the whole queue one response at a time; the cap must hold throughout.
  let settled = 0;
  for (let i = 0; i < PIDS.length + 10 && (h.pending.length || settled < PIDS.length); i++) {
    if (!(await h.settle())) break;
    settled++;
    await h.tick(2);
  }
  eq(settled, PIDS.length, "some queued members were never fetched — pacing must not become sampling");
  eq(h.peak, cap, `concurrency grew while draining — peaked at ${h.peak}`);
  ok(h.peak <= 8, `peak concurrency was ${h.peak}; the queue is not bounded`);
  eq(h.events.length, PIDS.length, "every settled member must announce itself exactly once");
  ok(h.events.every((e) => e.type === "pdx-consistency-warm"),
    "the queue dispatched something other than pdx-consistency-warm");
  const named = new Set(h.events.map((e) => e.detail && e.detail.pid));
  eq(named.size, PIDS.length,
    "warm events do not name distinct members — a listener that cannot tell WHO settled has to re-read\n" +
    "    everything, which is the fan-out this pacing exists to avoid");
}

// ── 2. One member's failure never stalls the rest ─────────────────────────────
{
  const h = harness();
  PIDS.slice(0, 12).forEach((p) => h.win.PDXConsistency.warm(p));
  await h.tick();

  // Every outstanding request rejects. If the slot were only released on success,
  // the queue would deadlock here and the remaining members would never warm.
  while (h.pending.length) { await h.settle("throw"); await h.tick(2); }
  let guard = 0;
  while (h.started < 12 && guard++ < 40) { await h.tick(2); if (h.pending.length) await h.settle("throw"); }
  eq(h.started, 12,
    "a rejected fetch did not release its slot — one member's failed record froze the whole queue, and with\n" +
    "    it every card still waiting on one");

  // A response with no items is a real answer too: noted as settled, still announced.
  const h2 = harness();
  PIDS.slice(0, 6).forEach((p) => h2.win.PDXConsistency.warm(p));
  await h2.tick();
  while (h2.pending.length) { await h2.settle("empty"); await h2.tick(2); }
  let g2 = 0;
  while (h2.started < 6 && g2++ < 40) { await h2.tick(2); if (h2.pending.length) await h2.settle("empty"); }
  eq(h2.started, 6, "an empty record stalled the queue");
  eq(h2.events.length, 6, "an empty record is not announced, so a card waiting on it never stops saying 'loading'");
}

// ── 3. One attempt per member ────────────────────────────────────────────────
{
  const h = harness();
  for (let i = 0; i < 5; i++) PIDS.slice(0, 6).forEach((p) => h.win.PDXConsistency.warm(p));
  await h.tick();
  while (h.pending.length) { await h.settle(); await h.tick(2); }
  let g = 0;
  while (h.started < 6 && g++ < 40) { await h.tick(2); if (h.pending.length) await h.settle(); }
  eq(h.started, 6, "a member asked for five times was fetched more than once");
}

// ── 4. The source keeps its bound ────────────────────────────────────────────
{
  ok(/WARM_CONCURRENCY/.test(SRC), "the concurrency bound is gone from consistency.js");
  ok(!/_queue\.splice\(0,\s*_queue\.length\)/.test(SRC),
    "the flush drains the entire queue in one pass again — that is the stampede, restored");
}

// ── 5. A request that never answers is answered for ──────────────────────────
// The stalled-connection case. Nothing here ever resolves or rejects: without a
// deadline the four slots are held for the life of the page, the fifth member is
// never fetched, and every surface waiting on any of them shows a spinner that
// will not clear. This is the permanent "Loading the record…" on the homepage.
{
  const h = harness();
  ["a", "b", "c", "d", "e"].forEach((p) => h.win.PDXConsistency.warm(p));
  await h.tick();
  eq(h.started, 4, "the flush should open exactly the concurrency cap");
  eq(h.events.length, 0, "nothing has answered, so nothing may be announced yet");

  // Time passes. Still nothing answers.
  await h.tick(1, 10000);
  await h.tick(2);
  eq(h.started, 5,
    "a hung request never released its slot — the fifth member is still queued behind four requests that\n" +
    "    will never answer, and every card waiting on it waits for the rest of the visit");
  const timedOut = h.events.filter((e) => e.detail && e.detail.timedOut);
  ok(timedOut.length >= 4,
    `only ${timedOut.length} of the four hung members were announced — a lane nobody announces is a lane no\n` +
    "    card can fail closed on");
  ok(timedOut.every((e) => e.detail.failed === true),
    "a timed-out member must be announced as a failure: from the reader's side there is nothing to show");
  ok(timedOut.every((e) => e.type === "pdx-consistency-warm"),
    "the deadline announced itself on some other channel, which no listener is subscribed to");

  // And the request is not abandoned. If it does land later, the rows are still
  // noted — the deadline gives up on WAITING, not on the data.
  const late = await h.settle();
  ok(h.noted.indexOf(late) !== -1,
    "a response that lost the race to the deadline was thrown away — late data must still upgrade the page");
  ok(h.events.some((e) => e.detail && e.detail.pid === late && e.detail.late),
    "the late arrival is not announced, so the surfaces that failed closed never learn there is a record now");
}

// ── 6. The request itself has a deadline ─────────────────────────────────────
// The queue's deadline releases the SLOT. This one settles the PROMISE — and it
// has to exist separately, because fetchMember memoises the promise it returns:
// every later caller for that member is handed the same pending promise, so one
// stalled connection leaves every surface that ever asks about that member waiting
// for the rest of the visit. Nothing downstream can rescue that; a promise that
// neither resolves nor rejects is invisible to callers.
{
  const vrSrc = readFileSync(join(ROOT, "voting-record.js"), "utf8");
  const timers = [];
  let clock = 0;
  const started = [];
  let aborted = 0;

  const win = {};
  const ctx = {
    console, JSON, Math, Date, String, Number, Array, Object, Boolean, RegExp, Error,
    isNaN, parseInt, parseFloat, encodeURIComponent, decodeURIComponent, Promise, Set, Map,
    URLSearchParams,
    window: win,
    setTimeout: (fn, ms) => { timers.push({ fn, at: clock + (ms || 0) }); return timers.length; },
    clearTimeout: () => {},
    setInterval: () => 0,
    clearInterval: () => {},
    AbortController: function () {
      this.signal = { aborted: false };
      this.abort = () => { aborted++; this.signal.aborted = true; const j = started[started.length - 1]; if (j) j.reject(new Error("aborted")); };
    },
    document: {
      readyState: "complete",
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, set innerHTML(_v) {} }),
      head: { appendChild() {} },
      body: { appendChild() {} },
      addEventListener() {},
    },
    // A connection that opens and then says nothing at all.
    fetch: (url) => new Promise((resolve, reject) => { started.push({ url, resolve, reject }); }),
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  win.window = win;
  win.document = ctx.document;
  win.CustomEvent = function (type, init) { this.type = type; this.detail = init && init.detail; };
  ctx.CustomEvent = win.CustomEvent;
  win.dispatchEvent = () => true;
  win.addEventListener = () => {};
  win.fetch = ctx.fetch;
  win.ISSUE_MAP = {};

  vm.runInContext(vrSrc, ctx, { filename: "voting-record.js" });
  const VR = win.PDXVotingRecord;
  ok(!!VR && typeof VR.fetchMember === "function", "voting-record.js no longer exposes fetchMember");

  let landed = "pending";
  VR.fetchMember("hung_member", { pageSize: 100 }).then((v) => { landed = v; });
  eq(started.length, 1, "fetchMember did not issue a request");

  // Nothing answers, and the clock runs past the deadline.
  clock += 60000;
  timers.splice(0).forEach((t) => { if (t.at <= clock) { try { t.fn(); } catch (e) {} } });
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); await Promise.resolve();

  ok(aborted > 0, "a request that never answers is never aborted, so its promise stays pending forever and\n" +
    "    every caller memoised onto it waits with it");
  eq(landed, null,
    "the stalled request did not settle to a value — callers cannot tell 'no record' from 'still waiting',\n" +
    "    which is what leaves a card on its loading state permanently");

  // And it is not remembered as a failure: the next attempt gets a real request.
  VR.fetchMember("hung_member", { pageSize: 100 });
  eq(started.length, 2,
    "the timed-out request stayed in the cache, so nothing will ever ask for that member again this visit");
}

if (fails) { console.log(`\n✗ warm queue: ${fails} failure(s), ${passes} passed`); process.exit(1); }
console.log(`✓ warm queue: all ${passes} assertions passed — paced, complete, and never stalled by one failure`);
