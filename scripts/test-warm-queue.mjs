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
  let inFlight = 0, peak = 0, started = 0;

  const win = {};
  const ctx = {
    console, JSON, Math, Date, String, Number, Array, Object, Boolean, RegExp, Error,
    isNaN, parseInt, parseFloat, encodeURIComponent, decodeURIComponent, Promise, Set, Map,
    window: win,
    setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
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
    noteMember() {},
    memberRecords: () => [],
  };

  vm.runInContext(SRC, ctx, { filename: "consistency.js" });

  return {
    win, events, pending, timers,
    get inFlight() { return inFlight; },
    get peak() { return peak; },
    get started() { return started; },
    // Run every queued timeout that is due, repeatedly, then drain microtasks.
    async tick(rounds = 1) {
      for (let i = 0; i < rounds; i++) {
        const due = timers.splice(0);
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

if (fails) { console.log(`\n✗ warm queue: ${fails} failure(s), ${passes} passed`); process.exit(1); }
console.log(`✓ warm queue: all ${passes} assertions passed — paced, complete, and never stalled by one failure`);
