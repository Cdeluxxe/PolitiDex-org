#!/usr/bin/env node
/**
 * test-door2-mobile-cards.mjs — door 2 on a phone: one owner, one figure, and a
 * rail that stays where the reader left it
 * ─────────────────────────────────────────────────────────────────────────────
 * FOUR THINGS A READER IN LAYTON MET ON ONE SCREEN, all four of them the same
 * mistake in four places — a surface answering a question it does not own.
 *
 *   1. WHO REPRESENTS ME SAID "3 of 6", with "No record on file yet — we'd
 *      rather leave this blank than name the wrong person" printed over Mike
 *      Lee, John Curtis and Spencer Cox, three people this app holds full files
 *      on. The band was right about the roster it could see and wrong about the
 *      world: the statewide rows resolve out of window.CMP_DATA, cmp-data.js is
 *      a deferred script, and the first paint of a cold phone happens before it
 *      lands. Three timeouts — 600 ms, 1800 ms, 4000 ms — were the only thing
 *      standing between that paint and the truth, and a timeout is a guess about
 *      somebody's network.
 *   2. THE WORKSPACE HEADER SAID "No current officeholder resolved" over a pane
 *      listing those same people, for the same reason and on its own clock.
 *   3. THE SEAT RAIL JUMPED BACK LEFT on every seat change, scrolling the seat
 *      the reader had just tapped off the side of the phone: sync() replaces the
 *      whole of #bw-body, and a replaced scroller starts at scrollLeft 0.
 *   4. THE HOMEPAGE CARD PAINTED TWO FIGURES for one person — 88% over 5 tested,
 *      then 72% over 15 — because the publication floor clears while the
 *      roll-call record is still landing, and the card was composing the pair
 *      itself out of a read taken at that moment.
 *
 * So: one owner announces the roster (pdxRosterReady), and the two seat surfaces
 * listen to it instead of to a stopwatch. The rail keeps its scroll across the
 * repaint and reveals the selected chip. The card prints PDXWordAction.figure()
 * — the object the letterhead chip and the ⚖️ section print — and withholds the
 * percentage until that object says the ledger under it stopped growing.
 *
 * WHAT THIS FILE PINS
 *
 *   1. ONE OWNER FOR "THE ROSTER LANDED". pdxRosterReady() lives in the
 *      resolver, fires once, fires immediately when the roster is already there,
 *      and drops the statewide memo before it calls anybody back. Both seat
 *      surfaces subscribe; neither re-implements it.
 *   2. THE COLD BOOT FINISHES 6 OF 6. A Layton reader whose band and workspace
 *      both painted before cmp-data.js: the band says 3 of 6 with three blanks,
 *      the roster arrives, and with NO timer run and NO sync() call from this
 *      test both surfaces name Lee, Curtis, Cox, Moore, Stevenson and Defay.
 *   3. THE RAIL STAYS PUT. Across a real House → Senate → Governor flip the
 *      selected chip is fully on screen every time, the rail is never reset to
 *      0, a chip already in view is not re-centred, and a desktop column — not
 *      a scroller at all — is left completely alone.
 *   4. ONE FIGURE ON THE HOME CARD. For a warm member the card's percentage, the
 *      denominator beside it and the coverage line's tested set are all the same
 *      figure() the person file's chip and ⚖️ section print, character for
 *      character — and figure() answers the same for a caller holding only a pid,
 *      which is all the card has.
 *   5. AND NEVER TWO. bennie_thompson is the shipped shape of the defect: cold,
 *      his read clears the floor at 100% over 3 of 13 while the record is still
 *      warming, and warm he settles to 73% over 9 of 13. The card publishes no
 *      percentage in the first state, publishes the settled one after the arrival
 *      event, and never prints the first number at all.
 *   6. THE FIXES ARE LOAD-BEARING. Five counterfactuals — the unsubscribed band,
 *      the unsubscribed workspace, the rail with no reveal, the card composing
 *      its own pair, and the card ignoring `ready` — each caught by the section
 *      that claims to catch it, plus HEAD's own renderer failing section 5.
 *   7. TWIN BOOT. The Direction Match ledger and the formal tiers byte-identical
 *      to HEAD across the offline corpus: this pass moved who prints a number
 *      and when, never the number.
 *
 *   node scripts/test-door2-mobile-cards.mjs
 *
 * Real shipped modules in a node:vm sandbox with a mini-DOM, a driven clock and a
 * real event bus. Every string asserted below is a string this harness painted.
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
  ok(Object.is(a, b), `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) >= 0, `${msg} — ${JSON.stringify(needle)} missing`);
const lacks = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) < 0, `${msg} — ${JSON.stringify(needle)} present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (cond, msg) => {
  if (cond) return;
  console.error(`\n✗ door 2 mobile cards: STALE HARNESS — ${msg}\n`);
  process.exit(2);
};
const strip = (a) => String(a).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");

const LAYTON = { state: "Utah", city: "Layton", county: "Davis County" };

const VHL_SRC = R("voter-hub-location.js");
const WRM_SRC = R("who-represents-me.js");
const WORK_SRC = R("ballot-workspace.js");
const CARD_SRC = R("hero-showcase.js");

// ── The seat lane's files, in index.html's order ──────────────────────────────
const SEAT_FILES = [
  "cmp-data.js",
  "politician-stances-core.js", "politician-stances-ext.js", "state-senate-stances.js",
  "stance-helpers.js", "alignment-tool.js", "acct-spotlight-data.js", "say-vs-do.js",
  "exec-action-data.js", "exec-record.js", "exec-record-ui.js",
  "consistency.js", "voting-record.js", "word-action.js", "profile-spine.js",
  "issue-colors.js", "my-stances.js",
  // 🔗 The one address per person. Loaded because "print names + photo +
  // /p/<pid>" is the claim under test: without it both surfaces fall back to
  // their pre-link onclick markup and the address assertions below would pass
  // for the wrong reason, or not at all.
  "person-link.js",
  "voter-hub-location.js", "compare-hub.js", "ballot-breakdown.js",
  "who-represents-me.js", "race-sheet.js", "ballot-workspace.js",
];

// ── A mini-DOM, plus the two things makeSandbox() deliberately does not give us ─
// Its timers are no-ops and its event registration is a no-op, which is right for
// a build-time engine boot and useless here: everything section 2 claims is about
// WHEN a repaint happens. So this harness supplies its own clock and its own bus,
// and nothing below fires except what the test fires.
function miniDom(win) {
  const byId = {};
  const el = (id) => {
    const node = {
      id: id || "", className: "", innerHTML: "", textContent: "",
      style: {}, dataset: {}, children: [], hidden: false, attrs: {},
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
      setAttribute(k, v) { this.attrs[k] = String(v); },
      getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
      removeAttribute(k) { delete this.attrs[k]; },
      addEventListener() {}, removeEventListener() {},
      appendChild(c) { this.children.push(c); if (c && c.id) byId[c.id] = c; return c; },
      removeChild() {}, insertAdjacentHTML() {}, remove() {}, focus() {}, click() {},
      scrollIntoView() {}, querySelector() { return null; }, querySelectorAll() { return []; },
    };
    if (id) byId[id] = node;
    return node;
  };
  win.document.createElement = () => el("");
  win.document.getElementById = (id) => byId[id] || null;
  win.document.body = el("body");
  win.document.body.appendChild = function (c) { if (c && c.id) byId[c.id] = c; return c; };
  ["who-represents-me", "wrm-reps", "vh-district-strip", "voter-hub",
   "ballot-workspace", "bw-body"].forEach(el);
  return byId;
}

// opts.roster === false starts the boot the way a cold phone starts: the resolver
// and the two seat surfaces run with NO cmp-data.js in the window at all, exactly
// as a sync script runs before a deferred one. arrive() then loads the roster.
function seatBoot(opts) {
  opts = opts || {};
  const win = makeSandbox();
  const store = {}, sess = {};
  win.localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; },
  };
  win.sessionStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(sess, k) ? sess[k] : null),
    setItem: (k, v) => { sess[k] = String(v); }, removeItem: (k) => { delete sess[k]; },
  };
  win.auth = { currentUser: null };
  win._cmpSelected = [];
  const byId = miniDom(win);

  const timers = [];
  win.setTimeout = (fn, ms) => { timers.push({ fn, ms: ms || 0, dead: false }); return timers.length; };
  win.clearTimeout = (id) => { if (id && timers[id - 1]) timers[id - 1].dead = true; };
  const docBus = {}, winBus = {};
  win.document.addEventListener = (t, fn) => { (docBus[t] = docBus[t] || []).push(fn); };
  win.addEventListener = (t, fn) => { (winBus[t] = winBus[t] || []).push(fn); };

  const sandbox = vm.createContext(win);
  const errors = [];
  const src = (f) => {
    let s = R(f);
    const muts = (opts.mutants && opts.mutants[f]) || null;
    if (muts) {
      for (const [from, to] of muts) {
        must(s.indexOf(from) >= 0, `mutation anchor moved in ${f}: ${from.slice(0, 70)}`);
        s = s.replace(from, to);
      }
    }
    return s;
  };
  const run = (f) => {
    try { vm.runInContext(src(f), sandbox, { filename: f }); }
    catch (e) { errors.push(`${f}: ${e.message}`); }
  };

  // compare-table.js owns this accessor and cannot boot headless, so the sandbox
  // supplies the three lines it exports. Without it every name below is vacuous.
  win._pdxPersonById = (pid) => {
    try { return (pid && win.CMP_DATA[pid]) ? win.CMP_DATA[pid] : null; }
    catch (e) { return null; }
  };

  const at = SEAT_FILES.indexOf("voter-hub-location.js");
  const roster = SEAT_FILES.slice(0, at);
  const surfaces = SEAT_FILES.slice(at + 1);
  // The reader's address is in the window before the band paints — a return
  // visitor's location is restored by the resolver's own load — so it is set
  // between the resolver and the surfaces that read it, not after all of them.
  const locate = () => {
    win._hasUserLocation = true;
    win._currentVoterLocation = opts.location || LAYTON;
  };
  if (opts.roster !== false) roster.forEach(run);
  run("voter-hub-location.js");
  locate();
  surfaces.forEach(run);
  win.PROFILES = win.CMP_DATA;

  win.__errors = errors;
  win.__byId = byId;
  // Load the deferred roster, and nothing else. No timer runs, no sync() call:
  // whatever repaints after this does so because something in the app noticed.
  win.__arrive = () => {
    roster.forEach(run);
    win.PROFILES = win.CMP_DATA;
    locate();
  };
  win.__docEvent = (t) => { (docBus[t] || []).forEach((fn) => { try { fn({}); } catch (e) {} }); };
  win.__winEvent = (t, detail) => {
    (winBus[t] || []).forEach((fn) => { try { fn(detail ? { detail } : {}); } catch (e) {} });
  };
  win.__runTimers = (ms) => {
    const due = timers.splice(0, timers.length).filter((t) => !t.dead && t.ms <= ms);
    due.forEach((t) => { try { t.fn(); } catch (e) {} });
    return due.length;
  };
  win.__pending = () => timers.filter((t) => !t.dead).length;
  return win;
}

const band = (w) => {
  const n = w.document.getElementById("wrm-reps");
  return n ? String(n.innerHTML) : "";
};
const pane = (w) => {
  const n = w.document.getElementById("bw-body");
  return n ? String(n.innerHTML) : "";
};
const openPane = (w, key) => { w.pdxBallotWorkspaceOpen(key); return pane(w); };

const NAMES = ["lee", "curtis", "cox", "bmoore", "jstevenson", "defay_h15"];

// ═════════════════════════════════════════════════════════════════════════════
section("1 · one owner announces that the roster landed");
// ═════════════════════════════════════════════════════════════════════════════
{
  has(VHL_SRC, "window.pdxRosterReady = function",
    "the resolver does not publish the roster announcement");
  has(WRM_SRC, "window.pdxRosterReady(sync)",
    "the band does not subscribe to the roster announcement");
  has(WORK_SRC, "window.pdxRosterReady(sync)",
    "the workspace does not subscribe to the roster announcement");
  // Nobody else grows a second answer to the same question. A surface that polls
  // CMP_DATA on its own clock is the bug this replaced, one file over.
  lacks(WRM_SRC, "_pdxRosterSize", "the band re-implements the roster check itself");
  lacks(WORK_SRC, "_pdxRosterSize", "the workspace re-implements the roster check itself");

  const w = seatBoot({});
  must(typeof w.pdxRosterReady === "function", `pdxRosterReady is not exposed — ${w.__errors.join(" | ")}`);
  must(Object.keys(w.CMP_DATA || {}).length > 50, "the warm boot has no roster");

  // Warm: the roster is already there, so the callback runs on the spot rather
  // than waiting for a moment that has already passed.
  let fired = 0;
  w.pdxRosterReady(() => { fired++; });
  eq(fired, 1, "a subscriber added after the roster landed is not called back");
  w.pdxRosterReady(() => { fired++; });
  eq(fired, 2, "a second late subscriber is queued instead of answered");

  // Cold: queued, then flushed once — and only once, no matter how many arrivals
  // the page reports.
  const c = seatBoot({ roster: false });
  must(typeof c.pdxRosterReady === "function", "the cold boot did not expose the announcement");
  must(!Object.keys(c.CMP_DATA || {}).length, "the cold boot already has a roster, so nothing here is cold");
  const calls = [];
  c.pdxRosterReady(() => calls.push("a"));
  c.pdxRosterReady(() => calls.push("b"));
  eq(calls.length, 0, "a subscriber was called back with an empty roster");
  c.__arrive();
  c.__docEvent("pdx:data:cmpDetail");
  eq(calls.join(","), "a,b", "the queued subscribers were not called once the roster landed");
  c.__docEvent("pdx:data:cmpDetail");
  c.__runTimers(20000);
  eq(calls.join(","), "a,b", "the announcement fired more than once");
  let after = 0;
  c.pdxRosterReady(() => { after++; });
  eq(after, 1, "a subscriber added after the announcement is not answered immediately");

  // AND THE MEMO GOES FIRST. The statewide answer is memoised; calling back
  // before dropping that memo would repaint every surface with the empty answer
  // it was about to replace.
  const owner = VHL_SRC.slice(VHL_SRC.indexOf("function _pdxRosterFlush"),
    VHL_SRC.indexOf("var _PDX_ROSTER_WAIT"));
  must(owner.length > 100, "the flush function could not be located in the resolver");
  ok(owner.indexOf("_pdxStatewideCache = {}") < owner.indexOf("cbs.forEach"),
    "the announcement calls its subscribers back before dropping the statewide memo");
  ok(owner.indexOf("if (!_pdxRosterSize()) return false") > 0,
    "the announcement fires without checking that the roster is actually there");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · a cold Layton boot still finishes six of six");
// ═════════════════════════════════════════════════════════════════════════════
{
  const w = seatBoot({ roster: false });
  must(typeof w.pdxRepsForMe === "function", `the resolver is not loaded — ${w.__errors.join(" | ")}`);
  must(w.PDXWhoRepresentsMe && typeof w.PDXWhoRepresentsMe.sync === "function",
    "the band is not loaded");
  must(typeof w.pdxBallotWorkspaceOpen === "function", "the workspace is not loaded");

  // THE FIRST PAINT, as the reader met it. This is the reported screen: three
  // seats resolved off the district map that ships inside the resolver, and the
  // three that resolve out of the roster blank, with the coverage sentence over
  // people we hold files on.
  const cold = strip(band(w));
  const coldCount = /(\d+) of (\d+) seats resolved/.exec(cold);
  must(coldCount, "the cold first paint states no seat count at all");
  ok(Number(coldCount[1]) < 6 && coldCount[2] === "6",
    `the cold paint already resolves all six seats, so the reported screen cannot happen — got ${coldCount[0]}`);
  console.log(`      cold first paint: ${coldCount[0]}`);
  has(cold, "rather leave this blank than name the wrong person",
    "the cold paint does not carry the blank sentence, so this case is not the reported one");
  ["Mike Lee", "John Curtis", "Spencer Cox"].forEach((n) => {
    lacks(cold, n, `${n} is named on a paint with no roster, so the premise is gone`);
  });

  const coldPane = strip(openPane(w, "senate"));
  has(coldPane, "No current officeholder resolved",
    "the cold workspace header does not report the gap it actually has");

  // THE ROSTER LANDS. No timer is run and neither surface's sync() is called from
  // here: the only thing that happens is the roster being parsed and the page
  // saying so, which is what a deferred bundle does.
  w.__arrive();
  w.__docEvent("pdx:data:cmpDetail");

  const warm = strip(band(w));
  has(warm, "6 of 6 seats resolved", "the band did not finish six of six once the roster landed");
  lacks(warm, "rather leave this blank than name the wrong person",
    "the blank-coverage sentence survives over seats that resolved");
  let shot = 0;
  NAMES.forEach((pid) => {
    const n = String(w.CMP_DATA[pid].name);
    has(warm, n, `the band does not name ${n}`);
    has(band(w), "/p/" + pid, `the band's row for ${n} is not a link to their record`);
    // The photo the APP resolves for them, not a stub: ballot-breakdown.js owns
    // _getPhotoUrl and every ballot surface reads it, so this is the same face
    // the workspace and the person file paint.
    const src = String(w._getPhotoUrl(pid) || "");
    if (src) {
      shot++;
      has(band(w), src.split("&")[0], `the band's row for ${n} carries no photo`);
    } else {
      // A statehouse member with no headshot on file gets the monogram, which is
      // the shipped fallback and not a blank.
      has(band(w), "wrm-avatar--empty", `the band's row for ${n} has no face at all`);
    }
  });
  ok(shot >= 4, `only ${shot} of the six named rows resolved a real photo`);
  lacks(warm, "Celeste Maloy", "the band names the UT-2 member as this reader's House member");

  // …and the workspace header, on the seat that was already open. Nothing here
  // re-opened it: the subscription repainted the pane the reader was looking at.
  const warmPane = pane(w);
  const st = strip(warmPane);
  has(st, "Holds this seat now", "the open Senate pane never learned who holds the seat");
  has(st, String(w.CMP_DATA.lee.name), "the Senate header does not name Lee");
  has(st, String(w.CMP_DATA.curtis.name), "the Senate header does not name Curtis");
  lacks(st, "No current officeholder resolved",
    "the Senate header still reports no officeholder over the holders it just named");
  ["governor", "house"].forEach((k) => {
    const h = strip(openPane(w, k));
    has(h, "Holds this seat now", `the ${k} header does not say who holds the seat`);
    lacks(h, "No current officeholder resolved",
      `the ${k} header reports no officeholder after the roster landed`);
  });
  has(strip(openPane(w, "governor")), String(w.CMP_DATA.cox.name),
    "the Governor header does not name Cox");
  has(strip(openPane(w, "house")), String(w.CMP_DATA.bmoore.name),
    "the House header does not name Blake Moore");
  lacks(strip(openPane(w, "house")), "Holds this seat now: " + String(w.CMP_DATA.maloy.name),
    "the House header names the UT-2 member as the holder");

  // The owner's own answer, for the record: six seats, every one with a pid.
  const gaps = (w.pdxRepsForMe().levels || []).filter((lv) => !lv.pid).map((lv) => lv.key);
  eq(gaps.join(","), "", "seats came back empty for the Layton fixture after the roster landed");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the seat rail keeps the selected chip on screen");
// ═════════════════════════════════════════════════════════════════════════════
// A RAIL WITH REAL GEOMETRY. On a phone .bw-seats is a horizontal scroller;
// at min-width 900px the same element is a static column and not a scroller at
// all. jsdom is not in this repo's toolchain, so the geometry is supplied here:
// six chips of a fixed width in a viewport narrower than their sum, measured the
// way the shipped code measures — getBoundingClientRect relative to the rail,
// with offsetLeft as the fallback. Every number below is one the reveal computed.
const CHIP_W = 120;
function makeRail(keys, opts) {
  const o = opts || {};
  const view = o.view || 320;
  const rail = {
    scrollLeft: o.at || 0,
    clientWidth: view,
    scrollWidth: o.column ? view : CHIP_W * keys.length,
    reads: 0,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: view, height: 44 }),
    querySelector(sel) {
      rail.reads++;
      const m = /data-sk="([^"]+)"/.exec(String(sel));
      if (!m) return null;
      const i = keys.indexOf(m[1]);
      if (i < 0) return null;
      const left = i * CHIP_W;
      return {
        offsetLeft: left, offsetWidth: CHIP_W,
        getBoundingClientRect: () => ({ left: left - rail.scrollLeft, top: 0, width: CHIP_W, height: 44 }),
      };
    },
  };
  return rail;
}
// #bw-body's innerHTML is REPLACED on every seat change, and a replaced scroller
// starts at scrollLeft 0 — that is the whole defect, so the harness models it:
// writing the host's HTML swaps in a brand-new rail sitting at 0, exactly as the
// browser does. The reader's position survives only if sync() carried it across.
function attachRail(w, keys, at) {
  const body = w.document.getElementById("bw-body");
  let rail = makeRail(keys, { at: at });
  let html = "";
  Object.defineProperty(body, "innerHTML", {
    get() { return html; },
    set(v) { html = v; rail = makeRail(keys, { at: 0 }); },
    configurable: true, enumerable: true,
  });
  body.querySelector = (sel) => (sel === ".bw-seats" ? rail : null);
  return { get rail() { return rail; } };
}
const visibleIn = (rail, keys, key) => {
  const i = keys.indexOf(key);
  const left = i * CHIP_W;
  return i >= 0 && left >= rail.scrollLeft - 0.5 &&
    (left + CHIP_W) <= (rail.scrollLeft + rail.clientWidth + 0.5);
};

{
  const w = seatBoot({});
  const BW = w.PDXBallotWorkspace;
  must(BW && typeof BW._railTarget === "function" && typeof BW._reveal === "function",
    "the workspace does not publish the reveal, so nothing here can be driven");

  // The chip order is read out of the markup the workspace just painted, so this
  // section cannot drift from the rail the reader actually taps.
  const railed = openPane(w, "house");
  const KEYS = (railed.match(/class="bw-seat[^"]*"[^>]*data-sk="([^"]+)"/g) || [])
    .map((m) => /data-sk="([^"]+)"/.exec(m)[1]);
  must(KEYS.length >= 5, `the rail painted ${KEYS.length} chips carrying data-sk; the reveal has nothing to find`);
  has(railed, 'data-sk="house"', "the rail's chips do not carry the seat key the reveal looks them up by");
  console.log(`      rail: ${KEYS.join(" · ")}`);

  const host = { querySelector: (sel) => (sel === ".bw-seats" ? rail : null) };
  let rail = makeRail(KEYS, {});

  // (a) A chip already fully in view is LEFT ALONE. Re-centring what the reader
  //     can already see is a jump they did not ask for.
  eq(BW._railTarget(rail, rail.querySelector('.bw-seat[data-sk="' + KEYS[0] + '"]')), -1,
    "a chip already on screen is re-centred anyway");

  // (b) A chip off the right edge is centred, clamped to the content.
  const far = KEYS[2];
  const want = BW._railTarget(rail, rail.querySelector('.bw-seat[data-sk="' + far + '"]'));
  eq(want, 240 - Math.round((320 - CHIP_W) / 2), "an off-screen chip is not centred in the rail");
  const last = KEYS[KEYS.length - 1];
  eq(BW._railTarget(rail, rail.querySelector('.bw-seat[data-sk="' + last + '"]')),
    rail.scrollWidth - rail.clientWidth,
    "revealing the last chip scrolls past the end of the rail");

  // (c) A chip off the LEFT edge clamps at 0 rather than going negative.
  rail = makeRail(KEYS, { at: rail.scrollWidth - rail.clientWidth });
  eq(BW._railTarget(rail, rail.querySelector('.bw-seat[data-sk="' + KEYS[0] + '"]')), 0,
    "revealing the first chip from the far end of the rail does not clamp at 0");

  // (d) THE DESKTOP COLUMN IS NOT A SCROLLER. Same element, same chips, laid out
  //     as a static column at min-width:900px — every reveal must decline.
  const col = makeRail(KEYS, { column: true });
  KEYS.forEach((k) => {
    eq(BW._railTarget(col, col.querySelector('.bw-seat[data-sk="' + k + '"]')), -1,
      `the desktop seat column is scrolled for chip ${k}`);
  });
  const colHost = { querySelector: (sel) => (sel === ".bw-seats" ? col : null) };
  BW._reveal(colHost, KEYS[4], 0);
  eq(col.scrollLeft, 0, "the desktop seat column had its scroll position written to");

  // (e) THE READER'S OWN POSITION SURVIVES THE REPAINT. sync() replaces the whole
  //     of #bw-body, and the reveal is handed the scrollLeft the rail had before
  //     that replacement. A chip already visible at that offset keeps it — this is
  //     the "jumps back left" defect, stated as a number.
  const keep = makeRail(KEYS, { at: 0 });
  const keepHost = { querySelector: (sel) => (sel === ".bw-seats" ? keep : null) };
  BW._reveal(keepHost, KEYS[1], 120);
  eq(keep.scrollLeft, 120, "the rail was reset to 0 instead of keeping where the reader had it");
  ok(visibleIn(keep, KEYS, KEYS[1]), "the selected chip is off screen after the reveal");

  // (f) A key the rail does not hold changes nothing but the restore.
  const odd = makeRail(KEYS, { at: 0 });
  const oddHost = { querySelector: (sel) => (sel === ".bw-seats" ? odd : null) };
  BW._reveal(oddHost, "not_a_seat", 200);
  eq(odd.scrollLeft, 200, "an unknown seat key moved the rail somewhere of its own");
  BW._reveal({ querySelector: () => null }, KEYS[0], 200);
  ok(true, "a host with no rail in it threw");
}

{
  // ── AND THROUGH THE REAL FLIP ──────────────────────────────────────────────
  // House → Senate → Governor, each through pdxBallotWorkspaceOpen() — the same
  // entry point the chip's own click uses — with the rail attached to the live
  // #bw-body. The reader has scrolled the rail right before the first tap, which
  // is the state the defect needed: the repaint used to drop them back at 0 with
  // the seat they just chose off the side of the phone.
  const w = seatBoot({});
  const BW = w.PDXBallotWorkspace;
  const first = openPane(w, "house");
  const KEYS = (first.match(/data-sk="([^"]+)"/g) || []).map((m) => /data-sk="([^"]+)"/.exec(m)[1]);
  must(KEYS.length >= 5, "the rail lost its seat keys on the real flip");
  const live = attachRail(w, KEYS, KEYS.length * CHIP_W - 320);

  const seen = [];
  ["house", "senate", "governor"].forEach((k) => {
    w.pdxBallotWorkspaceOpen(k);
    const rail = live.rail;
    seen.push(`${k}@${rail.scrollLeft}`);
    ok(visibleIn(rail, KEYS, k),
      `after selecting ${k} the selected chip is off screen (rail at ${rail.scrollLeft}, chip at ${KEYS.indexOf(k) * CHIP_W})`);
    // "Do not reset the rail to index 0": 0 is only ever the right answer when
    // the selected chip is genuinely at the left end of the rail.
    ok(rail.scrollLeft !== 0 || KEYS.indexOf(k) === 0,
      `selecting ${k} sent the rail back to the far left`);
    const on = /class="bw-seat is-open[^"]*" data-sk="([^"]+)"/.exec(pane(w));
    eq(on && on[1], k, `the chip wearing the selected state in the repainted rail is not ${k}`);
  });
  console.log(`      flip: ${seen.join(" → ")}`);

  // The source order, because the restore only works in one place: the scroll has
  // to be read BEFORE the innerHTML that destroys the old rail, and the reveal
  // has to run after the new one exists.
  const sync = WORK_SRC.slice(WORK_SRC.indexOf("function sync()"), WORK_SRC.indexOf("function paint("));
  must(sync.length > 200, "sync() could not be located in the workspace");
  const iWas = sync.indexOf("railScroll(host)");
  const iHtml = sync.indexOf("host.innerHTML =");
  const iRev = sync.indexOf("revealSeat(host");
  ok(iWas > 0 && iHtml > iWas, "sync() reads the rail's position after replacing the rail");
  ok(iRev > iHtml, "sync() reveals the selected chip before the chip exists");
  // And it moves ONE axis. scrollIntoView would take the page's vertical scroll
  // with it, which on a phone is a worse jump than the one being fixed.
  const reveal = WORK_SRC.slice(WORK_SRC.indexOf("function railOf(host)"),
    WORK_SRC.indexOf("// ── The seat head"));
  must(reveal.length > 400, "the reveal block could not be located in the workspace");
  lacks(reveal, "scrollIntoView", "the reveal scrolls the page as well as the rail");
  lacks(reveal, "scrollTop", "the reveal writes the vertical scroll");
}

// ═════════════════════════════════════════════════════════════════════════════
// THE HOMEPAGE CARD, AGAINST THE PERSON FILE
// ═════════════════════════════════════════════════════════════════════════════
// The engine, the profile composer and the two person-file faces on one side; the
// real hero-showcase.js, painting into a stub host, on the other. Nothing about
// the ⚖️ block is stubbed on either side — the whole claim is that the two are
// printing one object.
const CARD_FILES = [
  "cmp-data.js",
  "politician-stances-core.js", "politician-stances-ext.js", "state-senate-stances.js",
  "stance-helpers.js", "alignment-tool.js", "acct-spotlight-data.js", "say-vs-do.js",
  "exec-action-data.js", "exec-record.js", "exec-record-ui.js",
  "consistency.js", "voting-record.js", "word-action.js",
  "inventory.js", "issue-colors.js", "profile-card.js", "profile-spine.js",
];
const corpus = buildCorpus(ROOT);
must(corpus && corpus.byMember && corpus.byMember.size > 300,
  "the record corpus did not load enough members to warm anybody");

function cardEngine(warmPids) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win._pdxOfficeLine = () => "";
  win._getPhotoUrl = () => "";
  for (const f of CARD_FILES) vm.runInContext(R(f), ctx, { filename: f });
  win.PROFILES = win.CMP_DATA;
  if (warmPids) {
    for (const [pid, recs] of corpus.byMember) {
      if (warmPids !== true && warmPids.indexOf(pid) < 0) continue;
      try { win.PDXVotingRecord.noteMember(pid, recs); } catch { /* not a member surface */ }
    }
  }
  return win;
}

// The card, mounted the way index.html mounts it: one seeded candidate, a real
// PDXProfileCard and a real PDXWordAction, our clock and our event bus. Returns a
// live handle so a test can land a record and watch what the card does about it.
function mountCard(engine, pid, opts) {
  const o = opts || {};
  const p = engine.CMP_DATA[pid];
  must(p, `${pid} is not on the bundled roster`);
  const host = {
    hidden: true, innerHTML: "", attrs: {},
    setAttribute(k, v) { this.attrs[k] = String(v); }, removeAttribute(k) { delete this.attrs[k]; },
    addEventListener() {}, querySelector() { return null; },
  };
  const timers = [];
  const winBus = {};
  let epoch = 1;
  const win = {
    console, Math, JSON, String, Number, Array, Object, Boolean, RegExp, Error,
    encodeURIComponent, parseInt, isNaN,
    Date: { now: () => 1_760_000_000_000 },
    setTimeout: (fn) => { timers.push(fn); return timers.length; },
    clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    requestAnimationFrame: (fn) => fn(),
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    location: { hash: "" },
    document: {
      readyState: "complete", hidden: false,
      getElementById: (id) => (id === "hero-showcase" ? host : null),
      addEventListener() {},
    },
    addEventListener: (t, fn) => { (winBus[t] = winBus[t] || []).push(fn); },
    // The record lane says it has finished asking. That is the state the defect
    // lived in: nothing outstanding that this lane knows about, and the roll-call
    // ledger still growing underneath.
    PDXConsistency: { VERDICTS: engine.PDXConsistency.VERDICTS, recordSettled: () => true },
    PDXIssueColors: engine.PDXIssueColors,
    PDXProfileCard: engine.PDXProfileCard,
    PDXWordAction: engine.PDXWordAction,
    PDXLazyData: { loaded: () => true },
    PDXDataEpoch: () => epoch,
    _getPhotoUrl: () => "",
    showProfile() {},
    PDX_HERO_SHOWCASE: [{
      pid, name: String(p.name || pid), office: "Office line",
      party: { label: "R", color: "#f87171" },
    }],
  };
  win.window = win;
  const src = o.src || (o.head ? HEAD("hero-showcase.js") : CARD_SRC);
  must(src, "no HEAD copy of hero-showcase.js in this checkout");
  vm.runInContext(src, vm.createContext(win), { filename: "hero-showcase.js" });
  const drain = () => { timers.splice(0).forEach((fn) => { try { fn(); } catch (e) {} }); };
  drain();
  return {
    get html() { return host.innerHTML; },
    drain,
    bump() { epoch++; },
    arrive(name) {
      (winBus[name || "pdx-consistency-warm"] || []).forEach((fn) => {
        try { fn({ detail: { pid } }); } catch (e) {}
      });
      drain();
    },
    armed: () => Object.keys(winBus),
  };
}

// The percentages a reader can see on the card face, in order.
const pcts = (html) =>
  (String(html).match(/(\d+)<span class="pdx-hs-sig-pct-u">%<\/span>/g) || [])
    .map((m) => Number(/(\d+)</.exec(m)[1]));
const grab = (re, str) => (re.exec(String(str)) || [])[1] || "";

// ═════════════════════════════════════════════════════════════════════════════
section("4 · one figure on the home card, and it is the person file's");
// ═════════════════════════════════════════════════════════════════════════════
{
  const engine = cardEngine(true);
  const WA = engine.PDXWordAction;
  must(WA && typeof WA.figure === "function" && typeof WA.compactBadgeHtml === "function" &&
       typeof WA.sectionHtml === "function",
    "the engine does not publish the figure and the two person-file faces");

  for (const pid of ["lee", "curtis"]) {
    const p = engine.CMP_DATA[pid];
    const fig = WA.figure(pid, p);
    must(fig && fig.ready,
      `${pid} is not warm enough in the offline corpus to have a published figure, so this case is vacuous`);

    // THE SAME OBJECT FOR A CALLER WITH NOTHING BUT A PID, which is all the
    // homepage card has: it holds a seed row, never a person record. figure()
    // resolving the person itself is the reason the card and the letterhead
    // cannot answer differently.
    const bare = WA.figure(pid);
    eq(bare.stamp, fig.stamp, `${pid}: figure() answers a pid-only caller differently`);

    // The person file's two faces, painted.
    const chipDen = grab(/<span class="pdxwa-cbadge-den">([^<]*)</, WA.compactBadgeHtml(pid, p));
    const secSet = grab(/data-pdxwa-set="([^"]*)"/, WA.sectionHtml(pid, p));
    eq(chipDen, fig.fraction, `${pid}: the letterhead chip is not printing the figure's own sentence`);
    eq(secSet, fig.fraction, `${pid}: the ⚖️ section is not printing the figure's own sentence`);

    // And the card.
    const card = mountCard(engine, pid);
    const seen = pcts(card.html);
    eq(seen.length, 1, `${pid}: the card prints ${seen.length} percentages — got ${JSON.stringify(seen)}`);
    eq(seen[0], fig.pct, `${pid}: the card's percentage is not the figure's`);
    const den = grab(/<span class="pdx-hs-sig-pct-n" data-pdx-tested="\d+">([^<]*)</, card.html);
    eq(den, fig.fraction, `${pid}: the denominator beside the card's figure is not the figure's sentence`);
    has(card.html, fig.fraction, `${pid}: the card's coverage line does not carry the tested set`);
    // One sentence, twice: the badge and the coverage line. Not three spellings.
    const spellings = new Set((card.html.match(/\d+ of \d+ tested/g) || []));
    eq(spellings.size, 1,
      `${pid}: the card prints ${spellings.size} different tested sentences — ${[...spellings].join(" / ")}`);
    console.log(`      ${pid}: ${fig.pct}% · ${fig.fraction} — chip, section and card identical`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · and never two — the 88-then-72 flash");
// ═════════════════════════════════════════════════════════════════════════════
// bennie_thompson is this defect as the code actually produces it, with no
// fixture: cold, his stance-and-formal record clears the publishing floor at 100%
// over 3 of 13 while the roll-call ledger is still filling; warm, he settles to a
// different number over a bigger set. Every claim below is about what a reader
// sees between those two moments.
const FLASH = "bennie_thompson";
{
  const cold = cardEngine([]);
  const p = cold.CMP_DATA[FLASH];
  const early = cold.PDXWordAction.read(FLASH, p);
  const earlyFig = cold.PDXWordAction.figure(FLASH, p);
  must(early && early.publishable,
    `${FLASH}'s cold read does not clear the publishing floor, so the flash cannot happen here`);
  must(earlyFig && earlyFig.warming && typeof earlyFig.pct === "number",
    `${FLASH}'s cold figure is not "publishable but still warming", so this is not the reported state`);
  ok(!earlyFig.ready, "a figure that is still warming reports itself ready to publish");

  const card = mountCard(cold, FLASH);
  const before = pcts(card.html);
  eq(before.length, 0,
    `the card published ${JSON.stringify(before)} over a record that was still landing`);
  // …and it is not silent about the member: withholding the FIGURE is not
  // withholding the card. The inventory line still says what is on file.
  ok(/pdx-hs-cov|Loading the record|pdx-hs-proof/.test(card.html),
    "the card went blank instead of printing what it does know");
  lacks(card.html, "pdx-hs-sig-pct", "a score element was painted with nothing behind it");

  // THE RECORD LANDS. One arrival event, the one the person file listens to.
  for (const [pid, recs] of corpus.byMember) {
    if (pid !== FLASH) continue;
    cold.PDXVotingRecord.noteMember(pid, recs);
  }
  if (typeof cold.PDXDataChanged === "function") cold.PDXDataChanged();
  const settled = cold.PDXWordAction.figure(FLASH, p);
  must(settled.ready && settled.pct !== earlyFig.pct,
    `${FLASH} did not settle to a different figure, so "never two numbers" is untestable`);
  card.bump();
  card.arrive("pdx-consistency-warm");

  const after = pcts(card.html);
  eq(after.length, 1, `after the arrival the card prints ${JSON.stringify(after)}`);
  eq(after[0], settled.pct, "the card published something other than the settled figure");
  ok(after[0] !== earlyFig.pct,
    `the card is still showing the pre-arrival number (${earlyFig.pct}%)`);
  eq(grab(/<span class="pdx-hs-sig-pct-n" data-pdx-tested="\d+">([^<]*)</, card.html), settled.fraction,
    "the set beside the settled figure is not the settled set");
  console.log(`      ${FLASH}: cold ${earlyFig.pct}% · ${earlyFig.fraction} withheld → ` +
    `published ${settled.pct}% · ${settled.fraction}`);

  // THE ARM IS THE PERSON FILE'S OWN LIST, not a hand-typed copy of it. Every
  // event the engine publishes as a repaint trigger is one the card is listening
  // for, so a fifth arrival added to the engine reaches this card too.
  const arm = cold.PDXWordAction.repaintEvents();
  ok(arm && arm.length >= 4, `the engine publishes ${arm && arm.length} repaint events`);
  const armed = mountCard(cardEngine([]), FLASH).armed();
  arm.forEach((name) => {
    ok(armed.indexOf(name) >= 0, `the card is not armed on ${name}, which the engine publishes`);
  });
  // …and each of them, on its own, is enough to repaint a settled card.
  arm.forEach((name) => {
    const w = cardEngine([]);
    const c = mountCard(w, FLASH);
    eq(pcts(c.html).length, 0, `${name}: the warming card started with a percentage`);
    for (const [pid, recs] of corpus.byMember) {
      if (pid === FLASH) w.PDXVotingRecord.noteMember(pid, recs);
    }
    if (typeof w.PDXDataChanged === "function") w.PDXDataChanged();
    c.bump();
    c.arrive(name);
    eq(pcts(c.html).length, 1, `${name}: the arrival did not repaint the card`);
  });
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · the fixes are load-bearing");
// ═════════════════════════════════════════════════════════════════════════════
// One counterfactual per fix. Each one is the shipped file with the fix taken
// back out, run through the same harness, and each must fail the section that
// claims to catch it — otherwise that section is decoration.
const SUB = "if (typeof window.pdxRosterReady === 'function') window.pdxRosterReady(sync);";
const NO_SUB = "if (false) window.pdxRosterReady(sync);";

// (a) THE BAND BACK ON ITS STOPWATCH. Cold boot, roster lands, the page says so
//     — and with no subscription the band is still showing the cold answer,
//     which is the reported screen.
{
  const w = seatBoot({ roster: false, mutants: { "who-represents-me.js": [[SUB, NO_SUB]] } });
  const cold = strip(band(w));
  has(cold, "of 6 seats resolved", "the mutant band never painted at all");
  w.__arrive();
  w.__docEvent("pdx:data:cmpDetail");
  const after = strip(band(w));
  ok(after.indexOf("6 of 6 seats resolved") < 0,
    "counterfactual (a): an unsubscribed band reaches 6 of 6 anyway, so section 2 is not testing the subscription");
  lacks(after, String(w.CMP_DATA.lee.name),
    "counterfactual (a): the unsubscribed band names Lee anyway");
}

// (b) THE WORKSPACE BACK ON ITS OWN CLOCK.
{
  const w = seatBoot({ roster: false, mutants: { "ballot-workspace.js": [[SUB, NO_SUB]] } });
  const cold = strip(openPane(w, "senate"));
  has(cold, "No current officeholder resolved", "the mutant workspace never painted the cold header");
  w.__arrive();
  w.__docEvent("pdx:data:cmpDetail");
  has(strip(pane(w)), "No current officeholder resolved",
    "counterfactual (b): the unsubscribed workspace header repaints anyway, so section 2 is not testing the subscription");
}

// (c) THE RAIL WITH NO REVEAL, and (d) the rail with no restore. Both are the
//     defect: the reader taps a seat and the chip they tapped is off the side.
{
  const cases = [
    ["c", [["revealSeat(host, seat ? seat.key : '', railWas);", ";"]],
      "counterfactual (c): the rail keeps the selected chip on screen with the reveal removed"],
    ["d", [["var railWas = railScroll(host);", "var railWas = 0;"]],
      "counterfactual (d): the rail keeps the reader's position with the restore removed"],
  ];
  for (const [tag, muts, msg] of cases) {
    const w = seatBoot({ mutants: { "ballot-workspace.js": muts } });
    const first = openPane(w, "house");
    const KEYS = (first.match(/data-sk="([^"]+)"/g) || []).map((m) => /data-sk="([^"]+)"/.exec(m)[1]);
    const live = attachRail(w, KEYS, KEYS.length * CHIP_W - 320);
    let broke = false;
    ["house", "senate", "governor"].forEach((k) => {
      w.pdxBallotWorkspaceOpen(k);
      if (!visibleIn(live.rail, KEYS, k)) broke = true;
      if (tag === "d" && live.rail.scrollLeft === 0 && KEYS.indexOf(k) !== 0) broke = true;
    });
    ok(broke, msg);
  }
}

// (e) THE CARD BACK ON `shows` INSTEAD OF `ready` — the one-character version of
//     the defect: both halves of the pair are there, and the ledger under them is
//     still growing.
{
  const mut = CARD_SRC.replace("(fig && fig.ready && typeof fig.pct === 'number')",
                               "(fig && fig.shows && typeof fig.pct === 'number')");
  must(mut !== CARD_SRC, "the `ready` gate moved in hero-showcase.js");
  const w = cardEngine([]);
  const early = w.PDXWordAction.figure(FLASH, w.CMP_DATA[FLASH]);
  const c = mountCard(w, FLASH, { src: mut });
  eq(pcts(c.html).join(","), String(early.pct),
    "counterfactual (e): a card gated on `shows` withholds the warming figure anyway, so section 5 is not testing `ready`");
}

// (f) AND HEAD'S OWN RENDERER, which is where the reader met this. Skipped rather
//     than failed in a checkout with no git history.
{
  const src = HEAD("hero-showcase.js");
  if (!src) console.log("      no HEAD copy available — the shipped-defect check is skipped");
  else {
    const w = cardEngine([]);
    const early = w.PDXWordAction.figure(FLASH, w.CMP_DATA[FLASH]);
    const c = mountCard(w, FLASH, { src });
    const seen = pcts(c.html);
    ok(seen.length === 1 && seen[0] === early.pct,
      `counterfactual (f): HEAD's card does not print the warming figure (${early.pct}%) — got ${JSON.stringify(seen)}`);
    console.log(`      HEAD's card printed ${seen.join(",")}% over a record still landing; this one prints nothing`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · twin boot — the arithmetic never saw any of this");
// ═════════════════════════════════════════════════════════════════════════════
{
  const engine = (get) => {
    const w = makeSandbox();
    const ctx = vm.createContext(w);
    for (const f of [...ENGINE_FILES, "voting-record.js"]) {
      const src = get(f);
      if (src === null) continue;
      vm.runInContext(src, ctx, { filename: f });
    }
    w.PROFILES = w.CMP_DATA;
    for (const [pid, recs] of corpus.byMember) {
      try { w.PDXVotingRecord.noteMember(pid, recs); } catch { /* not a member surface */ }
    }
    return w;
  };
  const B = engine(R);
  must(B.PDXWordAction && typeof B.PDXWordAction.read === "function",
    "the working tree's engine did not boot in the twin");
  const A = engine(HEAD);
  if (!A.PDXWordAction || typeof A.PDXWordAction.read !== "function") {
    console.log("      no HEAD copy available in this checkout — twin boot skipped");
  } else {
    const drift = [];
    let swept = 0;
    for (const [pid] of corpus.byMember) {
      swept++;
      if (JSON.stringify(A.PDXWordAction.read(pid)) !== JSON.stringify(B.PDXWordAction.read(pid))) {
        drift.push(`${pid}/ledger`);
      }
      if (A.PDXConsistency && B.PDXConsistency) {
        if (JSON.stringify(A.PDXConsistency.scopedOverall(A.CMP_DATA[pid], pid)) !==
            JSON.stringify(B.PDXConsistency.scopedOverall(B.CMP_DATA[pid], pid))) drift.push(`${pid}/dm`);
        if (JSON.stringify(A.PDXConsistency.formalPatternIndex.shape(pid)) !==
            JSON.stringify(B.PDXConsistency.formalPatternIndex.shape(pid))) drift.push(`${pid}/formal`);
      }
    }
    ok(swept > 300, `the twin boot only swept ${swept} people`);
    eq(drift.slice(0, 6).join(" | "), "",
      `${drift.length} read(s) moved. Two surfaces started asking the owner for a number and one ` +
      "stopped publishing it early: the pair list, the Direction Match ledger and the formal tiers " +
      "must be byte-identical to HEAD's");
    console.log(`      ${swept} members swept; DM ledger and formal tiers identical to HEAD`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
if (failures.length) {
  console.error(`\n✖ ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error(`  • ${f}`));
  process.exit(1);
}
console.log(`\n✓ ${passed} assertions passed — one owner, one figure, the rail stays put\n`);
