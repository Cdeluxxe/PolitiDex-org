#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Tests for the HOMEPAGE RECORD CARD (hero-showcase-data.js + hero-showcase.js)
// ─────────────────────────────────────────────────────────────────────────────
// This component is the first thing a visitor sees, and it publishes a summary
// judgement about a named, living person. It is also unusual in this codebase:
// the seed it ships carries NO findings at all — only identity and ranking —
// because the action half of every comparison is the roll-call record, which
// lives in the database behind /api/voting-record and does not exist at build
// time. The read is therefore taken live, in the browser, every time.
//
// That architecture makes four things worth gating, and they are the four ways
// this component could lie:
//
//   1. NO DRIFT — the shipped seed is byte-identical to what
//      scripts/gen-hero-showcase.mjs produces right now.
//   2. THE SEED CARRIES NO VERDICT — if a finding ever gets baked into the seed
//      it will be a build-time finding shown as a live one, and it will be stale
//      the day the record fills in. Gated structurally: no verdict-shaped keys,
//      no consistency vocabulary anywhere in the file.
//   3. PUBLISHABLE-ONLY, AND FAILS CLOSED — a profile whose live read is not
//      publishable is dropped from the rotation; if none survive, the slot hides
//      itself. A pending card shows identity and the app's own waiting copy and
//      NOTHING resembling a finding: no breakdown, no counts, no coverage figures.
//   4. ONE INTEGRITY LANGUAGE — exactly one ⚖️ Word vs Action read on the card.
//      No pledge tally, no kept/broken/pending pills, no percentage score.
//
// Plus the usual: no injection, reduced-motion is honoured, the share and
// open-profile paths reach the real functions, the critical-path payload stays
// small, the swap is announced, and index.html / sw.js are actually wired to it.
//
//   node scripts/test-hero-showcase.mjs
//
// No database, no network, no browser. Exit code is non-zero on the first failure.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import vm from "node:vm";

import {
  OUT_PATH, MAX_CANDIDATES, MIN_SCORABLE,
  loadEngine, buildFeatured, buildData,
} from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const failures = [];
let passed = 0;
const ok = (cond, msg) => { cond ? passed++ : failures.push(msg); };
const eq = (a, b, msg) => ok(Object.is(a, b), `${msg} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);

const RENDERER = readFileSync(join(ROOT, "hero-showcase.js"), "utf8");
// Source-level assertions read CODE, not the comments that explain it — the
// premature-rule-out note legitimately names PDXWordAction while describing why the
// renderer must not trust `warming` alone.
const RENDERER_CODE = RENDERER.replace(/^\s*\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
const shipped = readFileSync(join(ROOT, OUT_PATH), "utf8");
const INDEX = readFileSync(join(ROOT, "index.html"), "utf8");

// ═════════════════════════════════════════════════════════════════════════════
// A stub browser, with a clock the test drives
// ═════════════════════════════════════════════════════════════════════════════
// Everything time-dependent in this component (the grace period before a
// candidate can be ruled out, auto-advance, the backstops) has to be observable,
// so setTimeout/setInterval collect their callbacks and the test fires them.

const EPOCH = 1_760_000_000_000; // fixed, so the day-based start index is deterministic

function makeHost() {
  const host = {
    hidden: true, _html: "", attrs: {}, ops: [], listeners: {},
    addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); },
    setAttribute(k, v) { this.attrs[k] = v; this.ops.push("attr:" + k); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
    fire(type, ev) { (this.listeners[type] || []).forEach((fn) => fn(ev || {})); },
  };
  Object.defineProperty(host, "innerHTML", {
    get() { return this._html; },
    set(v) { this._html = v; this.ops.push("html"); },
    configurable: true, enumerable: true,
  });
  return host;
}

// A publishable live read, shaped exactly like PDXProfileCard.read()'s return.
function pubRead(over = {}) {
  return {
    pid: "jane", name: "Jane Doe", office: "U.S. Senate · Utah",
    party: { label: "R", color: "#f87171" },
    verdict: { key: "mixed", ico: "◑", label: "Mixed record", tone: "warn", color: "#93c5fd" },
    accent: "#93c5fd", publishable: true,
    // The engine's own name for the figure, carried through so the card labels the
    // percentage with the same words the profile does.
    metric: "Direction match",
    signal: "Their record cuts both ways on what they have said.",
    breakdown: { consistent: 5, mixed: 2, contradicts: 3 },
    coverage: {
      word: 12, tested: 10, scorable: 12, untested: 2,
      stances: 9, pledges: 2, branding: 1,
      votes: 14, votesTotal: 20, voteIssues: 4, warming: false,
    },
    highlights: [{ title: "Border security", word: "said x", action: "H.R. 2 · Voted Yea" }],
    lowlights: [{ title: "Farm subsidies", word: "said y", action: "H.R. 9 · Voted Nay" }],
    lowlightKind: "contradicts",
    gaps: [{ title: "Housing costs" }],
    ...over,
  };
}

// A read that is still fetching: below the floor, nothing tested, warming.
function warmingRead(over = {}) {
  return pubRead({
    publishable: false,
    verdict: { key: "pending", ico: "⏳", label: "Loading the record…", tone: "muted", color: "#9fb4d4" },
    accent: "#9fb4d4", signal: "",
    breakdown: { consistent: 0, mixed: 0, contradicts: 0 },
    coverage: { ...pubRead().coverage, tested: 0, warming: true },
    highlights: [], lowlights: [], gaps: [],
    ...over,
  });
}

// A read that settled below the floor and is not coming back.
function thinRead(over = {}) {
  return warmingRead({ coverage: { ...pubRead().coverage, tested: 1, warming: false }, ...over });
}

const VERDICTS = {
  pending: { key: "pending", ico: "⏳", label: "Loading the record…", tone: "muted", color: "#9fb4d4" },
  consistent: { key: "consistent", ico: "✓", label: "Backs it up", tone: "good", color: "#6ee7a0" },
};

function harness(opts = {}) {
  const seedVal = opts.seed;
  // pid → read object (or null). A function gets (pid, passNumber) so a test can
  // change the answer between passes, which is how warming→settled is simulated.
  const answer = opts.answer || (() => null);
  // read() may answer differently from brief() — that split is the whole point of
  // the fail-closed case, where a candidate qualifies and then its live read fails.
  const readAnswer = opts.readAnswer || answer;

  const host = makeHost();
  const calls = {
    warm: [], share: [], showProfile: [], ensure: [], whenReady: [], brief: [], read: [],
  };
  const timers = [];   // {fn, ms}
  const intervals = [];
  const docListeners = {};
  const winListeners = {};
  let clock = EPOCH;
  let pass = 0;
  // The derivation epoch. Every cache keyed on a live read is keyed on this too,
  // so bumping it is how the app says "the inputs changed; what you computed
  // earlier is no longer what the profile would publish".
  let derivEpoch = 1;

  const win = {
    console, Math, JSON, String, Number, Array, Object, Boolean, RegExp, Error,
    encodeURIComponent, parseInt, isNaN,
    Date: { now: () => clock },
    setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
    clearTimeout: () => {},
    setInterval: (fn, ms) => { intervals.push({ fn, ms }); return intervals.length; },
    clearInterval: (id) => { if (id) intervals[id - 1] = null; },
    requestAnimationFrame: (fn) => fn(),   // paint synchronously so it is observable
    matchMedia: (q) => ({
      matches: !!opts.reducedMotion && /reduced-motion/.test(q),
      addEventListener() {},
    }),
    location: { hash: "" },
    document: {
      readyState: "complete", hidden: false,
      getElementById: (id) => (id === "hero-showcase" ? host : null),
      addEventListener(type, fn) { (docListeners[type] = docListeners[type] || []).push(fn); },
    },
    addEventListener(type, fn) { (winListeners[type] = winListeners[type] || []).push(fn); },
    PDXConsistency: {
      VERDICTS,
      // The record lane's own "have we finished asking?". opts.settled defaults to
      // true so every pre-existing case keeps its original timing; a case that
      // passes false is simulating the window where a fetch is still outstanding.
      recordSettled: (pid) => (typeof opts.settled === "function"
        ? !!opts.settled(pid)
        : opts.settled !== false),
    },
    // The laziness guardrail: loaded() is fair game, ensure()/whenReady() are not.
    PDXLazyData: {
      loaded: () => !!opts.dataLoaded,
      ensure: (k) => { calls.ensure.push(k); },
      whenReady: (k) => { calls.whenReady.push(k); },
    },
    PDXDataEpoch: () => derivEpoch,
    PDXProfileCard: opts.noEngine ? undefined : {
      brief: (pid) => { calls.brief.push(pid); return answer(pid, pass); },
      read: (pid) => { calls.read.push(pid); return readAnswer(pid, pass); },
      warm: (pid) => { calls.warm.push(pid); },
      share: (pid, btn) => { calls.share.push([pid, btn]); },
    },
    _getPhotoUrl: opts.photos === false ? undefined : (pid) => `https://img.test/${pid}.jpg`,
    showProfile: (pid) => { calls.showProfile.push(pid); },
  };
  if (seedVal !== undefined) win.PDX_HERO_SHOWCASE = seedVal;
  win.window = win;

  vm.runInContext(RENDERER, vm.createContext(win), { filename: "hero-showcase.js" });

  const api = {
    host, calls, win, timers, intervals,
    get html() { return host.innerHTML; },
    advance(ms) { clock += ms; },
    nextPass() { pass++; },
    // A new bundle merged into the roster, a record cache cleared — anything that
    // changes what a live read would return.
    bumpEpoch() { derivEpoch++; },
    // Fire a warm event, as consistency.js / voting-record.js do. Both real
    // dispatchers name the member that settled in detail.pid; passing no pid
    // exercises the detail-less fallback, which nothing in the app emits.
    warmEvent(pid) {
      const ev = pid ? { detail: { pid } } : {};
      (winListeners["pdx-consistency-warm"] || []).forEach((fn) => fn(ev));
    },
    votingWarmEvent(pid) {
      const ev = pid ? { detail: { pid } } : {};
      (winListeners["pdx-voting-warm"] || []).forEach((fn) => fn(ev));
    },
    dataEvent() { (docListeners["pdx:data:acctSpotlight"] || []).forEach((fn) => fn({})); },
    // Run every pending timeout whose deadline has passed, once.
    runTimers(ms) {
      clock += ms;
      const due = timers.splice(0, timers.length).filter((t) => t.ms <= ms);
      due.forEach((t) => t.fn());
    },
    tickAuto() { intervals.filter(Boolean).forEach((i) => i.fn()); },
    click(sel) {
      host.fire("click", {
        target: { closest: (s) => (s === sel ? { getAttribute: (k) => (k === "data-pid" ? api.pidOf() : "0") } : null) },
        stopPropagation() {},
      });
    },
    pidOf() { const m = /data-pid="([^"]+)"/.exec(host.innerHTML); return m ? m[1] : ""; },
  };
  return api;
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. No drift
// ═════════════════════════════════════════════════════════════════════════════
{
  const engine = loadEngine(ROOT);
  const featured = buildFeatured(engine);
  const rebuilt = buildData(featured);
  ok(shipped === rebuilt,
    `drift: ${OUT_PATH} does not match the current generator output — run \`node scripts/gen-hero-showcase.mjs\``);
  ok(featured.length > 0, "drift: the generator found at least one eligible profile");
}

const seed = JSON.parse(shipped.match(/window\.PDX_HERO_SHOWCASE = ([\s\S]*?);\n/)[1]);
ok(Array.isArray(seed) && seed.length > 0, "seed: the shipped seed is a non-empty array");
ok(seed.length <= MAX_CANDIDATES, `seed: at most ${MAX_CANDIDATES} candidates ride the critical path`);

// ═════════════════════════════════════════════════════════════════════════════
// 2. The seed carries NO verdict
// ═════════════════════════════════════════════════════════════════════════════
// This is the load-bearing honesty gate for this component. The seed is an
// invitation list; the moment it carries a finding, the homepage is publishing a
// build-time judgement as a live one.
{
  const FORBIDDEN_KEYS = [
    "verdict", "publishable", "signal", "breakdown", "consistent", "contradicts",
    "mixed", "accent", "highlights", "lowlights", "gaps", "tested", "score", "pct",
  ];
  for (const c of seed) {
    for (const k of Object.keys(c)) {
      ok(!FORBIDDEN_KEYS.includes(k),
        `seed: ${c.pid} carries "${k}" — the seed must hold identity and ranking only, never a finding`);
    }
    // Coverage counts are allowed, but only as RANKING INPUT — never rendered, or
    // a build-time figure would sit on the card beside a live one.
    if (c._coverage) {
      ok(!new RegExp("_coverage").test(RENDERER),
        "seed: _coverage is ranking metadata and must never be read by the renderer");
    }
  }
  // No consistency vocabulary anywhere in the file, including comments-as-data.
  const body = shipped.replace(/^[\s\S]*?window\.PDX_HERO_SHOWCASE = /, "");
  for (const word of ["Backs it up", "Says one thing", "Mixed record", "Word vs Action", "kept", "broken"]) {
    ok(!body.includes(word), `seed: the payload contains verdict language ("${word}")`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. Every candidate is placeable, and the set is balanced
// ═════════════════════════════════════════════════════════════════════════════
for (const c of seed) {
  const who = c.pid || "(no pid)";
  ok(!!c.pid, "placeable: every entry has a pid to look up");
  ok(!!c.name, `placeable: ${who} has a name`);
  ok(!!c.office, `placeable: ${who} has an office line — a bare name under a verdict is unplaceable`);
  ok(!c._coverage || c._coverage.scorable >= MIN_SCORABLE,
    `coverage: ${who} clears the ${MIN_SCORABLE}-testable-statement bar for being featured`);
}
{
  eq(new Set(seed.map((c) => c.pid)).size, seed.length,
    "balance: nobody appears in the showcase twice");
  const parties = seed.map((c) => (c.party && c.party.label) || "?");
  ok(new Set(parties).size > 1, `balance: the showcase spans more than one party — got ${[...new Set(parties)]}`);
  const counts = {};
  for (const p of parties) counts[p] = (counts[p] || 0) + 1;
  ok(Math.max(...Object.values(counts)) <= Math.ceil(seed.length * 0.6),
    `balance: no party holds more than 60% of the showcase — got ${JSON.stringify(counts)}`);
  // The first few entries are what most visitors ever see, so the interleave has
  // to hold at the TOP of the list, not merely across the whole of it.
  ok(new Set(parties.slice(0, 4)).size > 1,
    `balance: the first four cards are not all one party — got ${parties.slice(0, 4)}`);
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. Phase 1 — identity paints with no engine at all
// ═════════════════════════════════════════════════════════════════════════════
{
  const h = harness({ seed, noEngine: true });
  ok(h.host.hidden === false, "phase 1: the slot reveals itself and paints identity immediately");
  ok(/pdx-hs-card/.test(h.html), "phase 1: a card is painted");
  ok(/pdx-hs-name/.test(h.html), "phase 1: the name is painted");
  ok(/pdx-hs-office/.test(h.html), "phase 1: the office line is painted");
  ok(/pdx-hs-face/.test(h.html), "phase 1: a portrait (or its monogram) is painted");
  eq(h.calls.brief.length, 0, "phase 1: no read is attempted before the engine exists");

  // The pending card must show the app's ONE waiting phrase and nothing that
  // could be mistaken for a finding.
  ok(h.html.includes("Loading the record…"),
    "phase 1: the waiting state uses PDXConsistency.VERDICTS.pending copy verbatim");
  ok(!/pdx-hs-bar-seg/.test(h.html), "phase 1: NO breakdown bar before anything has been tested");
  ok(!/pdx-hs-bd-chip/.test(h.html), "phase 1: NO count chips — a row of zeroes reads as a finding of nothing");
  ok(!/of \d+ testable/.test(h.html), "phase 1: NO coverage figures before the record has been read");
  ok(!/pdx-hs-proof-row/.test(h.html), "phase 1: NO proof rows before there is proof");
  // Identity is not a claim, so it is safe to paint — and it is what stops the
  // hero from shifting when the read lands.
  ok(!/pdx-hs-sig-read[^>]*style="color:/.test(h.html),
    "phase 1: the signal is left uncoloured until it is publishable");
}

// ═════════════════════════════════════════════════════════════════════════════
// 5. Phase 2 — the full card, once a publishable read exists
// ═════════════════════════════════════════════════════════════════════════════
{
  const h = harness({ seed, dataLoaded: true, answer: () => pubRead() });
  ok(h.calls.warm.length > 0, "phase 2: featured pids are warmed");
  ok(h.calls.warm.length <= 8, `phase 2: the warm set is capped — got ${h.calls.warm.length}`);
  ok(h.calls.warm.length < seed.length,
    "phase 2: not every seeded candidate is fetched; the seed is deeper than the rotation");

  const html = h.html;
  ok(/Mixed record/.test(html), "phase 2: the verdict label is printed verbatim from the engine");
  ok(/◑/.test(html), "phase 2: the verdict glyph is the engine's own");
  ok(/style="color:#93c5fd/.test(html), "phase 2: the read is tinted with the verdict's own accent once publishable");
  ok(/Their record cuts both ways/.test(html), "phase 2: the engine's signal sentence is printed");
  ok(/pdx-hs-bar-seg is-good[^>]*flex:5/.test(html), "phase 2: the bar is proportional to the real counts");
  ok(/<b>5<\/b> backed up/.test(html), "phase 2: backed-up count");
  ok(/<b>2<\/b> mixed/.test(html), "phase 2: mixed count");
  ok(/<b>3<\/b> contradicted/.test(html), "phase 2: contradicted count");
  ok(/9 stances/.test(html), "phase 2: coverage names the stance count");
  ok(/2 tracked pledges/.test(html), "phase 2: a pledge appears as one form of \"said\", inside coverage");
  ok(/14 mapped votes on record/.test(html), "phase 2: coverage names the mapped-vote count");
  ok(/10 of 12 testable/.test(html), "phase 2: coverage states how much of the record could be tested");
  ok(/Record backs them/.test(html) && /Border security/.test(html), "phase 2: a highlight is printed");
  ok(/Record contradicts them/.test(html) && /Farm subsidies/.test(html), "phase 2: a lowlight is printed");
  ok(/H\.R\. 2 · Voted Yea/.test(html), "phase 2: the highlight names the formal action that tested it");
  ok(/POLITIDEX/.test(html) && /Bound by Truth/.test(html) && /politidex\.fyi/.test(html),
    "phase 2: the branding lockup matches the shareable image");
}

// ═════════════════════════════════════════════════════════════════════════════
// 5b. No verdict before the record lane has answered
// ═════════════════════════════════════════════════════════════════════════════
// The flip-flop. A president is judgeable the moment the page parses — the
// executive record ships in the bundle — so brief() cleared the publishing floor
// on the very first pass and the card painted a score, a headline and a set of
// counts drawn from half the evidence. Seconds later the roll-call fetch landed
// and it painted different ones, in front of the reader. A skeleton for the
// length of one request is the honest version of that moment.
{
  let settledNow = false;
  const h = harness({
    seed, dataLoaded: true,
    settled: () => settledNow,
    answer: (pid) => pubRead({ pid, pct: 61, verdict: VERDICTS.consistent, accent: "#6ee7a0" }),
  });

  const cold = h.html;
  ok(/Loading the record…/.test(cold),
    "freeze: an unsettled record lane paints the shared waiting phrase");
  ok(!/Backs it up|Mixed record|Says one thing/.test(cold),
    "freeze: no verdict headline is painted before the record lane answers");
  ok(!/pdx-hs-sig-pct/.test(cold),
    "freeze: no percentage is painted before the record lane answers");
  ok(!/backed up/.test(cold),
    "freeze: no breakdown counts are painted before the record lane answers");

  // The lane answers. ONE repaint, into the final numbers.
  settledNow = true;
  h.warmEvent(h.calls.warm[0]);
  const warm = h.html;
  ok(/Backs it up/.test(warm), "freeze: the verdict appears once the lane has answered");
  ok(/61<span class="pdx-hs-sig-pct-u">%/.test(warm),
    "freeze: and the score it publishes is the settled one");

  // The figure is labelled with the engine's own name for it. A card that shows a
  // bare percentage, or names it something the profile does not, reads as a second
  // score — and a reader who compares the two has no way to know it is one figure.
  ok(/Direction match/.test(warm),
    "vocabulary: the percentage is labelled with the metric name the engine publishes");
  ok(!/word matched by action/i.test(RENDERER),
    "vocabulary: the card hard-codes its own name for the figure, so it can drift from the profile's");
  ok(!/\bPromise\b|promiseScore|kept_pct/.test(RENDERER),
    "vocabulary: retired promise-score language is back on the card");

  // Whatever it published, it published once — the label cannot change again on a
  // later arrival for the same member, because a settled card is never re-briefed.
  const before = h.calls.brief.length;
  h.warmEvent(h.calls.warm[0]);
  eq(h.calls.brief.length, before, "freeze: a published card is not re-judged by a later event");
  ok(/Backs it up/.test(h.html), "freeze: and its headline does not flip");
}

// The deadline. If the lane never answers — offline, a hung endpoint — the grace
// sweep publishes what is in hand rather than leaving the hero on a skeleton
// forever. Holding out for a fetch that is never coming is its own failure.
{
  const h = harness({
    seed, dataLoaded: true, settled: false,
    answer: (pid) => pubRead({ pid }),
  });
  ok(/Loading the record…/.test(h.html), "freeze: still waiting before the grace period");
  h.runTimers(4000);
  ok(/Mixed record/.test(h.html),
    "freeze: the grace-period sweep publishes when the lane never answers");
}


{
  const h = harness({
    seed, dataLoaded: true,
    answer: () => pubRead({ lowlights: [], gaps: [{ title: "Housing costs" }] }),
  });
  ok(/Still missing/.test(h.html) && /Housing costs/.test(h.html),
    "proof: with nothing contradicted, the card names what is missing rather than showing one side");
}

// A 'mixed' lowlight is labelled as one — not as a contradiction.
{
  const h = harness({
    seed, dataLoaded: true,
    answer: () => pubRead({ lowlightKind: "mixed" }),
  });
  ok(/Cuts both ways/.test(h.html), "proof: a mixed lowlight is labelled 'Cuts both ways', not 'contradicts'");
  ok(!/Record contradicts them/.test(h.html), "proof: a mixed lowlight is never upgraded to a contradiction");
}

// ═════════════════════════════════════════════════════════════════════════════
// 6. Phase 3 — publishable-only, and fails closed
// ═════════════════════════════════════════════════════════════════════════════

// A thin profile that settles below the floor is dropped from the rotation.
{
  const only = seed[0].pid;
  const h = harness({
    seed, dataLoaded: true,
    answer: (pid) => (pid === only ? pubRead({ name: "Kept Profile" }) : thinRead()),
  });
  h.runTimers(3000);        // past the grace period → rule-out is allowed
  ok(/Kept Profile/.test(h.html), "phase 3: the publishable profile survives");
  ok(!/of \d+ of/.test(h.html), "phase 3: no malformed coverage line");
  ok(!/pdx-hs-pos/.test(h.html) || /1 of 1/.test(h.html),
    "phase 3: the counter reflects only the profiles that survived, not the whole seed");
}

// Nobody publishable → the slot hides itself entirely.
{
  const h = harness({ seed, dataLoaded: true, answer: () => thinRead() });
  ok(h.host.hidden === false, "phase 3: the slot is visible while the read is still unknown");
  h.runTimers(3000);
  eq(h.host.hidden, true, "phase 3: the slot hides itself when no profile has a publishable read");
  eq(h.html, "", "phase 3: and paints nothing at all — an empty proof slot is honest");
}

// THE PREMATURE-RULE-OUT TRAP. PDXWordAction reports `no_action_yet` (not
// `warming`) until the fetch actually registers, and warm() is debounced 150ms.
// So on the first synchronous pass every candidate looks like an empty record. If
// rule-out were allowed there, the hero would hide itself one tick before the
// data arrived — on every single cold load.
{
  const h = harness({
    seed, dataLoaded: true,
    // pass 0: looks empty and NOT warming. pass 1: publishable.
    answer: (pid, pass) => (pass === 0
      ? thinRead()                       // the deceptive "no_action_yet" shape
      : pubRead({ name: "Arrived Late" })),
  });
  eq(h.host.hidden, false,
    "grace: the first pass never rules anyone out, so the hero is not hidden before the fetch registers");
  h.nextPass();
  h.warmEvent();
  ok(/Arrived Late/.test(h.html), "grace: the record landing upgrades the card in place");
  eq(h.host.hidden, false, "grace: and the slot stays visible throughout");
}

// A candidate still fetching is left alone even after the grace period.
{
  const h = harness({ seed, dataLoaded: true, answer: () => warmingRead() });
  h.runTimers(3000);
  eq(h.host.hidden, false,
    "grace: a candidate whose fetch is genuinely still in flight is not ruled out on a timer");
  ok(h.html.includes("Loading the record…"), "grace: it keeps showing the app's one waiting phrase");
}

// …but "still fetching" is not an unlimited exemption. `warming` is self-reported
// by the record lane, and a lane that has lost track of a request reports warming
// for the rest of the visit. That is the permanent spinner: the card is waiting
// correctly, on a promise nobody is going to keep. There is a last sweep that
// takes no for an answer.
{
  const h = harness({ seed, dataLoaded: true, answer: () => warmingRead() });
  h.runTimers(30000);
  eq(h.host.hidden, true,
    "spinner: a candidate that reports 'still fetching' forever is never ruled out, so the hero holds a\n" +
    "    skeleton for the whole visit — 'loading' has to expire eventually");
  eq(h.html, "", "spinner: and having nothing publishable, the slot paints nothing rather than a spinner");
}

// The mixed carousel. A candidate can be judged publishable and then have its live
// read come back empty — a bundle that has not merged, a cache dropped between the
// two calls. Painting the pending card for it puts a skeleton inside a rotation of
// finished cards, which reads as one member's record being unavailable when the
// truth is that the page could not complete a read.
{
  const h = harness({
    seed, dataLoaded: true,
    answer: () => pubRead(),        // qualifies
    readAnswer: () => null,         // …but the live read cannot complete
  });
  h.runTimers(3000);
  ok(!/Loading the record…/.test(h.html),
    "mixed: a publishable candidate whose live read fails is painted as a skeleton, so the carousel shows\n" +
    "    a permanent spinner among finished cards");
  eq(h.host.hidden, true, "mixed: with no completed read to show, the slot fails closed instead");
}

// Rotation waits for the set. Advancing through cards that have not resolved is
// how a reader ends up watching a slideshow of skeletons.
{
  const h = harness({ seed, dataLoaded: true, answer: () => warmingRead() });
  eq(h.intervals.filter(Boolean).length, 0,
    "rotation: auto-advance is armed over a set of unresolved cards");
}

// Epoch invalidation. The card read is memoised — it has to be, or every repaint
// re-derives the whole set. But the memo is only honest while its inputs are: when
// a lazy bundle merges or the record cache is cleared, a figure computed earlier is
// no longer the figure the profile would publish for the same member. That is the
// divergence a reader sees as the homepage and the profile disagreeing.
{
  const h = harness({ seed, dataLoaded: true, answer: () => pubRead() });
  ok(h.calls.read.length > 0, "epoch: the card is painted from a live read");

  // Walk to the next card and back, so both are in the memo.
  h.click(".pdx-hs-next");
  h.click(".pdx-hs-prev");
  const warmed = h.calls.read.length;

  h.click(".pdx-hs-next");
  h.click(".pdx-hs-prev");
  eq(h.calls.read.length, warmed,
    "epoch: returning to a card re-derives it from scratch on every repaint — the memo is doing nothing");

  h.bumpEpoch();
  h.click(".pdx-hs-next");
  h.click(".pdx-hs-prev");
  ok(h.calls.read.length > warmed,
    "epoch: the memo survived a change to the data it was computed from, so the card keeps publishing a\n" +
    "    figure the profile no longer agrees with");
}

// Malformed and missing seeds.
{
  for (const [label, s] of Object.entries({
    "seed absent entirely": undefined,
    "seed is empty": [],
    "seed is not an array": { nope: true },
    "seed is null": null,
    "entry has no pid": [{ name: "A", office: "O" }],
    "entry has no name": [{ pid: "a", office: "O" }],
    "entry has no office line": [{ pid: "a", name: "A" }],
  })) {
    const h = harness({ seed: s, dataLoaded: true, answer: () => pubRead() });
    ok(h.host.hidden === true && h.html === "",
      `fail-closed: renders nothing and stays hidden when ${label}`);
  }
  // One malformed entry alongside a good one is dropped, not rendered.
  const h = harness({
    seed: [{ pid: "bad", name: "Nameless" }, seed[0]],
    dataLoaded: true, answer: () => pubRead(),
  });
  ok(!/Nameless/.test(h.html), "fail-closed: a malformed entry is dropped from a mixed seed");
  eq(h.host.hidden, false, "fail-closed: the remaining valid entry still renders");
}

// ═════════════════════════════════════════════════════════════════════════════
// 7. One integrity language
// ═════════════════════════════════════════════════════════════════════════════
{
  const h = harness({ seed, dataLoaded: true, answer: () => pubRead() });
  const html = h.html;

  eq((html.match(/⚖️ Word vs Action/g) || []).length, 1,
    "one language: exactly one ⚖️ Word vs Action read on the card");
  eq((html.match(/pdx-hs-sig-read/g) || []).length, 1,
    "one language: exactly one signal slot");

  // No pledge tally, on the card or in the renderer's vocabulary.
  // Precise pledge-rail vocabulary, not bare English words — "broken" also means a
  // broken image, and a false positive here would train someone to loosen the gate.
  for (const word of ["Pledge record", "Pledge Record", "Promise Follow-Through", "Promises Kept",
                      "Kept", "Broken", "Pending", "pledge score", "Pledge Score", "kept/broken"]) {
    ok(!html.includes(word), `one language: the card must not say "${word}" — a pledge is one form of "said"`);
  }
  // No percentage score anywhere. (A bare % from encodeURIComponent is fine; a
  // number followed by % is a second score.)
  ok(!/\d\s*%/.test(html), "one language: no percentage score on the card");
  ok(!/Follow-?Through/i.test(RENDERER_CODE), "one language: the renderer has no follow-through vocabulary");
  ok(!/_pdxPromiseTally|pledgeTally/.test(RENDERER_CODE), "one language: the renderer reads no pledge tally");

  // The renderer must not compute a verdict of its own — every judgement word on
  // the card has to come through PDXProfileCard.
  for (const word of ["Backs it up", "Says one thing, does another", "Mixed record", "Limited record"]) {
    ok(!RENDERER_CODE.includes(word),
      `one language: the renderer hardcodes the verdict label "${word}" instead of using the engine's`);
  }
  // The renderer may read VERDICTS.pending — that is the deliberate single source
  // for the one waiting phrase. It must not reach any FINDING out of the engine.
  ok(!/PDXWordAction/.test(RENDERER_CODE),
    "one language: the renderer does not call the Word vs Action engine directly");
  ok(!/VERDICTS\.(consistent|contradicts|mixed|limited|flag)\b/.test(RENDERER_CODE),
    "one language: the renderer never picks a verdict itself — only PDXProfileCard does");
  ok(/VERDICTS\.pending/.test(RENDERER_CODE),
    "one language: the waiting phrase comes from VERDICTS.pending, not a fourth wording");
}

// ═════════════════════════════════════════════════════════════════════════════
// 8. No injection
// ═════════════════════════════════════════════════════════════════════════════
{
  const hostile = {
    pid: '"><img src=x onerror=alert(1)>',
    name: "<script>alert(1)</script>",
    office: "<b>Senate</b>",
    party: { label: '"><i>', color: "red;}body{display:none" },
  };
  // photos: false so the card's own legitimate <img> (and its onerror handler) is
  // absent — otherwise the assertions below cannot distinguish it from injection.
  const h = harness({
    seed: [hostile], dataLoaded: true, photos: false,
    answer: () => pubRead({
      name: "<script>x()</script>", office: "</p><svg onload=y>",
      signal: "A & B <em>z</em>",
      verdict: { key: "mixed", ico: "<svg onload=q>", label: "L</div><script>r()</script>", color: "#93c5fd" },
      party: { label: '"><i>', color: 'blue" onload="z' },
      highlights: [{ title: "<iframe>", action: "<img src=x>" }],
      lowlights: [{ title: "</b><script>s()</script>", action: "ok" }],
    }),
  });
  const html = h.html;
  // Every tag-opener from the hostile payload, and only those — <b> is markup the
  // renderer legitimately builds for proof titles, count chips and the lockup, so
  // asserting on it would fail honestly-correct output.
  for (const frag of ["<script", "<svg", "<iframe", "<img", "<em>", "<i>"]) {
    ok(!html.includes(frag), `injection: "${frag}" from hostile data never survives as markup`);
  }
  // The closers in the payload are the escape hatch a naive escaper misses: <div> and
  // </b> are legitimate renderer output, so the assertion has to be that the hostile
  // copy of them arrived escaped — not that the character sequence is absent.
  ok(html.includes("&lt;/p&gt;"), "injection: a closing tag smuggled in data arrives escaped");
  ok(html.includes("&lt;script&gt;"), "injection: hostile markup is escaped, not silently stripped");
  ok(html.includes("&lt;iframe&gt;"), "injection: escaping reaches highlight/lowlight text too");
  ok(html.includes("A &amp; B"), "injection: bare ampersands in engine prose are encoded");
  // An event-handler attribute needs a live quote to open. Every quote from data is
  // escaped to &quot;, so no on*="…" can form even though the text "onload=" survives.
  ok(!/on[a-z]+="/i.test(html), "injection: no event-handler attribute can be opened from data");
  // The party colour lands in a style attribute, which is the one place a broken
  // escape becomes a CSS injection.
  ok(!/style="--p:[^"]*[{}]/.test(html), "injection: a hostile party colour cannot break out of the style attribute");
}

// ═════════════════════════════════════════════════════════════════════════════
// 9. Rotation, and reduced motion
// ═════════════════════════════════════════════════════════════════════════════
{
  const h = harness({ seed, dataLoaded: true, answer: () => pubRead() });
  ok(/pdx-hs-prev/.test(h.html) && /pdx-hs-next/.test(h.html),
    "rotation: previous and next controls are present");
  ok(/pdx-hs-dot/.test(h.html), "rotation: dots offer a second way through the set");
  ok(/\d+ of \d+/.test(h.html), "rotation: the position counter frames the card as one item from a set");
  ok(/aria-label="Previous record card"/.test(h.html), "a11y: the arrows are labelled");
  ok(/role="tablist"/.test(h.html), "a11y: the dot rail is a tablist");
  ok(/aria-selected="true"/.test(h.html), "a11y: the current dot is marked selected");

  // Checked BEFORE the manual nav below, which cancels it on purpose.
  ok(h.intervals.filter(Boolean).length > 0,
    "rotation: auto-advance is armed when there is more than one card");
  eq(h.intervals.filter(Boolean)[0].ms, 9000, "rotation: auto-advance is a readable 9s, not a flicker");

  const before = h.html;
  h.click(".pdx-hs-next");
  ok(h.html !== before, "rotation: next advances to a different card");
}
{
  // Manual interaction must end auto-advance permanently — a carousel that
  // resumes under someone who just took hold of it is worse than a static one.
  const h = harness({ seed, dataLoaded: true, answer: () => pubRead() });
  h.click(".pdx-hs-next");
  const live = h.intervals.filter(Boolean).length;
  eq(live, 0, "rotation: a manual nav cancels auto-advance for the rest of the visit");
}
{
  const h = harness({ seed, dataLoaded: true, reducedMotion: true, answer: () => pubRead() });
  eq(h.intervals.filter(Boolean).length, 0,
    "motion: prefers-reduced-motion means the carousel never advances on its own");
  ok(/pdx-hs-next/.test(h.html),
    "motion: it is still fully browsable — the controls remain");
}
{
  // A single publishable card needs no chrome for a set of one.
  const h = harness({
    seed, dataLoaded: true,
    answer: (pid) => (pid === seed[0].pid ? pubRead() : thinRead()),
  });
  h.runTimers(3000);
  ok(!/pdx-hs-prev/.test(h.html), "rotation: no arrows when only one profile is publishable");
  ok(!/pdx-hs-dot/.test(h.html), "rotation: no dots for a set of one");
}
{
  // The reduced-motion media query is honoured in CSS too, not just in JS.
  ok(/@media \(prefers-reduced-motion: reduce\)[\s\S]{0,200}#hero-showcase/.test(INDEX),
    "motion: the critical CSS disables transitions under prefers-reduced-motion");
}

// ═════════════════════════════════════════════════════════════════════════════
// 10. Tap and share reach the real code paths
// ═════════════════════════════════════════════════════════════════════════════
{
  const h = harness({ seed, dataLoaded: true, answer: () => pubRead() });
  const pid = h.pidOf();
  ok(!!pid, "tap: the card carries the pid it opens");

  h.click(".pdx-hs-card");
  eq(h.calls.showProfile[0], pid, "tap: tapping the card opens that profile via showProfile()");

  h.click(".pdx-hs-share");
  eq(h.calls.share.length, 1, "share: the share button calls PDXProfileCard.share()");
  eq(h.calls.share[0][0], pid, "share: with the pid on the card");
  ok(!!h.calls.share[0][1], "share: and the button, so the renderer can show its own progress state");
  // Share must not fall through to opening the profile as well.
  eq(h.calls.showProfile.length, 1, "share: sharing does not also open the profile");

  ok(/aria-label="Open [^"]*full profile"/.test(h.html), "a11y: the card announces what tapping it does");
  ok(/role="button"[^>]*tabindex="0"|tabindex="0"[^>]*role="button"/.test(h.html),
    "a11y: the card is reachable and activatable by keyboard");
}

// ═════════════════════════════════════════════════════════════════════════════
// 11. Performance guardrails
// ═════════════════════════════════════════════════════════════════════════════
{
  // The 154 KB spotlight bundle must not be pulled forward by this component.
  const h = harness({ seed, answer: () => pubRead() });
  eq(h.calls.ensure.length, 0,
    "perf: the renderer never calls PDXLazyData.ensure() — that would pull the 154 KB bundle onto the critical path");
  eq(h.calls.whenReady.length, 0,
    "perf: nor whenReady(), which calls ensure() internally (pdx-lazy-data.js)");
  ok(!/PDXLazyData\.ensure|\bensure\(/.test(RENDERER_CODE),
    "perf: no ensure() call survives in the renderer source");

  // #hero-showcase must not be added to the lazy-data SECTIONS list: an observer
  // on an above-the-fold element fires instantly, which is an eager load with
  // extra steps.
  const LAZY = readFileSync(join(ROOT, "pdx-lazy-data.js"), "utf8");
  ok(!/hero-showcase/.test(LAZY),
    "perf: #hero-showcase is not registered as a lazy-data section trigger");

  // read() is the expensive call (a dots() pass per row) — only the painted card
  // may pay for it, while brief() decides eligibility for everyone.
  const h2 = harness({ seed, dataLoaded: true, answer: () => pubRead() });
  eq(h2.calls.read.length, 1, `perf: read() runs for the visible card only — got ${h2.calls.read.length}`);
  ok(h2.calls.brief.length > 1, "perf: brief() is the cheap read used for eligibility");
  ok(h2.calls.brief.length <= 8, "perf: eligibility is checked for the warm set only, never the roster");

  // Payload. Both files are parser-blocking in the head's critical path.
  const dataGz = gzipSync(Buffer.from(shipped)).length;
  const rendGz = gzipSync(Buffer.from(RENDERER)).length;
  // Honest budgets set just above the measured size, so any real growth trips them.
  // This pair is heavier than the receipt band it replaced (~5.7 KB); see the note
  // beside the script tags in index.html for why that is the accepted trade.
  //
  // The renderer budget was raised from 11 KB when the card was wired to the live
  // Direction Match: an epoch-keyed read cache, a final rule-out sweep, and a paint
  // that drops candidates whose read cannot complete. That is ~900 B gzipped, over
  // half of it the comments explaining why each of the three exists — the cost of a
  // card that cannot show a figure the profile disagrees with, or spin forever.
  //
  // BUDGET NOTE · raised again to 14 KB / 15.5 KB for the formal-first pass. Three
  // things landed: the lane's formal strip (formalHtml — heading, depth line and up
  // to two issue chips, all of it PDXProfileCard's `formal` payload printed, nothing
  // decided here), the record landing (openProfile → _pdxNavJump on the profile's
  // record section) and the issue-scoped door (openIssue → #record=<pid>~<issue>).
  // ~1.4 KB gzipped, most of it prose. The trade is the whole point of the card: a
  // reader who taps a Direction Match figure lands on the record that produced it,
  // and an executive card stops printing roll-call nouns for a lane that has no
  // roll calls. Nothing new is fetched, parsed or derived on the critical path —
  // the strip rides the read() the visible card was already paying for.
  //
  // BUDGET NOTE · raised to 15 KB / 16.5 KB when the card's name became a real
  // <a href="/p/<canonicalPid>">. The code for that is ten lines — an anchor
  // builder that delegates to PDXPersonLink and a browser-nav guard at the top of
  // the click handler — and the rest of the ~630 B is the prose saying why the
  // NAME is the link and not the card (the card holds buttons; a link may not),
  // and why a modified click is handed back to the browser. Nothing was added to
  // what the card computes or fetches. person-link.js itself is parser-blocking
  // too and carries its own budget, in test-person-links.mjs.
  //
  // BUDGET NOTE · raised to 15.5 KB / 17 KB when the record rows adopted the person
  // file's own face. Two functions landed and neither computes anything: icAttr()
  // asks PDXIssueColors.skin() for the issue's colour token — the same fragment the
  // profile brief and the topic tree carry for that key — and badgeHtml() prints the
  // 🏛 record badge out of fields PDXProfileCard composed from the engine's already
  // published tier. ~350 B gzipped of code and prose. Nothing new is fetched,
  // derived or judged on the critical path: both ride the `formal` payload the
  // visible card's read() was already paying for.
  ok(dataGz < 3 * 1024, `payload: seed is ${dataGz} B gzipped (budget 3 KB)`);
  ok(rendGz < 15.5 * 1024, `payload: renderer is ${rendGz} B gzipped (budget 15.5 KB)`);
  ok(dataGz + rendGz < 17 * 1024,
    `payload: ${dataGz + rendGz} B gzipped on the parser-blocking critical path (budget 17 KB)`);
  console.log(`  critical path: ${dataGz} B + ${rendGz} B = ${dataGz + rendGz} B gzipped`);
}

// ═════════════════════════════════════════════════════════════════════════════
// 11b. One arrival, one member's work  (the homepage lock-up)
// ═════════════════════════════════════════════════════════════════════════════
// Records land one request at a time, and every arrival used to run a full sweep:
// flush every cached read, then brief() all eight candidates — eight complete
// PDXWordAction reads — inside the fetch's own callback. Eight arrivals meant
// sixty-four briefs plus eight full re-reads of the painted card, landing in the
// same frames as eight ~125 KB JSON parses and the roster render. The main thread
// never got a gap wide enough to answer a tap, which is what Chrome reports as an
// unresponsive page. One arrival can only change one member's answer.
{
  const arrived = new Set();
  const h = harness({
    seed, dataLoaded: true,
    answer: (pid) => (arrived.has(pid) ? pubRead({ pid }) : warmingRead({ pid })),
  });
  const warmed = h.calls.warm.slice();
  ok(warmed.length > 1, "incremental: more than one member is warmed, so a sweep is measurably wasteful");

  // A named arrival costs ONE brief, not one per candidate.
  let b = h.calls.brief.length;
  arrived.add(warmed[0]);
  h.warmEvent(warmed[0]);
  eq(h.calls.brief.length - b, 1,
    `incremental: one member's record landing costs exactly one brief() — got ${h.calls.brief.length - b}`);
  ok(/Mixed record/.test(h.html), "incremental: and that member's card publishes as soon as its own record lands");

  // A member the hero never warmed — a profile modal elsewhere warms members too —
  // must not drag the whole showcase through a re-read.
  b = h.calls.brief.length;
  let r = h.calls.read.length;
  h.warmEvent("someone-else-entirely");
  eq(h.calls.brief.length, b, "incremental: a warm event for a member outside the warm set costs no brief");
  eq(h.calls.read.length, r, "incremental: and forces no repaint");

  // Already published. The floor it cleared cannot un-clear, so re-asking buys
  // nothing — but its CONTENT must still refresh, which means dropping its read.
  b = h.calls.brief.length;
  r = h.calls.read.length;
  h.warmEvent(warmed[0]);
  eq(h.calls.brief.length, b, "incremental: a settled card is not re-briefed on every later arrival");
  ok(h.calls.read.length > r, "incremental: but its cached read is dropped, so the card still picks up new findings");

  // pdx-voting-warm is the same shape from voting-record.js and takes the same path.
  arrived.add(warmed[1]);
  b = h.calls.brief.length;
  h.votingWarmEvent(warmed[1]);
  eq(h.calls.brief.length - b, 1, "incremental: pdx-voting-warm settles one member too");

  // An event with no pid is not a shape either dispatcher emits, but it must stay
  // correct: fall back to the full sweep rather than guessing.
  b = h.calls.brief.length;
  h.warmEvent();
  ok(h.calls.brief.length - b > 1, "incremental: a detail-less event still runs the full sweep");
}
{
  // The whole cold load, counted end to end: eight records arriving one at a time,
  // each publishable only once its own record has landed. The sweep-per-arrival
  // build spent 88 briefs and 10 full reads here.
  const arrived = new Set();
  const h = harness({
    seed, dataLoaded: true,
    answer: (pid) => (arrived.has(pid) ? pubRead({ pid }) : warmingRead({ pid })),
  });
  const warmed = h.calls.warm.slice();
  for (const pid of warmed) { arrived.add(pid); h.warmEvent(pid); }
  ok(h.calls.brief.length <= warmed.length * 2,
    `incremental: a full cold load stays near one brief per arrival — got ${h.calls.brief.length} for ${warmed.length} records`);
  ok(h.calls.read.length <= 5,
    `incremental: and repaints the visible card a handful of times, not once per arrival — got ${h.calls.read.length}`);
  ok(/Mixed record/.test(h.html), "incremental: the showcase is populated once the records are in");
}
{
  // A member whose record simply has not arrived must not be burned by ANOTHER
  // member's event. Ruling out stays the sweep's job, on the grace-period backstop.
  const arrived = new Set();
  const h = harness({
    seed, dataLoaded: true,
    answer: (pid) => (arrived.has(pid) ? pubRead({ pid }) : warmingRead({ pid })),
  });
  const warmed = h.calls.warm.slice();
  arrived.add(warmed[0]);
  h.warmEvent(warmed[0]);
  const laggard = warmed[warmed.length - 1];
  arrived.add(laggard);
  const b = h.calls.brief.length;
  h.warmEvent(laggard);
  eq(h.calls.brief.length - b, 1, "incremental: a late record is still asked, not written off");
  ok(new RegExp(laggard).test(h.html) || /Mixed record/.test(h.html),
    "incremental: and it joins the rotation rather than being ruled out by an earlier arrival");
}
{
  // The portrait is requested at the size it is displayed, through the same-origin
  // proxy — not as a full-resolution remote headshot.
  const h = harness({ seed, dataLoaded: true, answer: () => pubRead() });
  ok(/\/\.netlify\/images\?url=/.test(h.html), "perf: portraits go through the Netlify image CDN");
  // &amp; because the whole src is HTML-escaped on the way into the attribute.
  ok(/(?:&amp;|[?&])w=224/.test(h.html), "perf: at a bounded width, not the source resolution");
  eq((h.html.match(/<img/g) || []).length, 1,
    "perf: only the painted card has an <img>, so a rotation of six fetches one portrait");

  // No portrait is not a failure state.
  const noPhoto = harness({ seed, dataLoaded: true, photos: false, answer: () => pubRead() });
  ok(/pdx-hs-face-mono/.test(noPhoto.html), "perf: a missing portrait falls back to the monogram, as the shared image does");
  ok(!/<img/.test(noPhoto.html), "perf: and requests nothing");
}

// ═════════════════════════════════════════════════════════════════════════════
// 12. The swap is announced
// ═════════════════════════════════════════════════════════════════════════════
// Same contract as the receipt band: the live region lives on the host (the only
// node that survives a repaint) and is armed AFTER the first paint, so loading
// the page does not read the card aloud over whatever the visitor was hearing.
{
  const h = harness({ seed, noEngine: true });
  eq(h.host.getAttribute("aria-live"), null,
    "a11y: the first paint does not arm the live region, so page load is silent");
  h.click(".pdx-hs-next");
  eq(h.host.getAttribute("aria-live"), "polite",
    "a11y: the band becomes a polite live region once it has painted at least once");
  eq(h.host.ops.slice(0, 3).join(" → "), "html → html → attr:aria-live",
    "a11y: the region is armed after the paint it belongs to, never before");
  ok(/pdx-hs-pos/.test(h.html),
    "a11y: the position counter sits inside the announced region, so \"2 of 6\" is spoken with the card");
}

// ═════════════════════════════════════════════════════════════════════════════
// 13. index.html and sw.js are actually wired to this
// ═════════════════════════════════════════════════════════════════════════════
{
  const hero = INDEX.slice(INDEX.indexOf('<section id="hero"'), INDEX.indexOf("</section>", INDEX.indexOf('<section id="hero"')));
  ok(/<div id="hero-showcase"/.test(hero),
    "wiring: #hero-showcase is mounted inside the hero section");
  ok(!/id="hero-receipt"/.test(hero),
    "wiring: the single-receipt band no longer occupies the hero — it is demoted below the fold");
  ok(INDEX.indexOf('id="hero-receipt"') > INDEX.indexOf('id="hero-showcase"'),
    "wiring: the receipt band now sits after the record card in document order");
  ok(/id="hero-receipt"[\s\S]{0,600}id="say-vs-do"/.test(INDEX),
    "wiring: the demoted receipt introduces the Say-vs-Do band, where one receipt among many belongs");

  ok(/<script src="\/hero-showcase-data\.js"><\/script>/.test(INDEX),
    "wiring: the seed is parser-blocking, so identity is in the first frame");
  ok(/<script src="\/hero-showcase\.js"><\/script>/.test(INDEX),
    "wiring: the renderer is parser-blocking");
  ok(/rel="preload" as="script" href="\/hero-showcase-data\.js"/.test(INDEX),
    "wiring: the seed is preloaded from the head");
  ok(/rel="preload" as="script" href="\/hero-showcase\.js"/.test(INDEX),
    "wiring: the renderer is preloaded from the head");
  // hero-receipt.js is below the fold now, so it must NOT block the parser.
  ok(/hero-receipt-data\.js" defer/.test(INDEX) && /hero-receipt\.js" defer/.test(INDEX),
    "wiring: the demoted receipt scripts are deferred, off the critical path");
  ok(!/rel="preload"[^>]*hero-receipt/.test(INDEX),
    "wiring: the demoted receipt is no longer preloaded — it is not first-frame content");

  // The critical CSS for the card must be inline, or the one component meant to
  // make a first impression flashes unstyled.
  ok(/#hero-showcase \{/.test(INDEX), "wiring: the card's critical CSS is inline in the head");
  ok(/\.pdx-hs-sig-read \{/.test(INDEX), "wiring: including the signal slot");
  ok(/\.pdx-hs-bar \{/.test(INDEX), "wiring: including the breakdown bar");
  ok(/\.pdx-hs-fm-chip\[data-ic\] \{/.test(INDEX),
    "wiring: including the issue-colour treatment on the record rows");
  ok(/\.pdx-hs-fm-b \{/.test(INDEX), "wiring: including the record badge");

  // ── THE CROSS-CHECK IS NOT THE HERO ──────────────────────────────────────
  // The card leads with what the record points to; Word vs Action is the check ON
  // that finding and sits under it at footnote scale. It used to open the card at
  // 2rem, then sat at 1.1rem — larger than every issue row above it and larger
  // than the record block's own heading, which made the cross-check read as the
  // finding. The rule, enforced at every width the stylesheet declares: the
  // percentage is never set larger than the record block title.
  const sizesOf = (sel) => {
    const out = [];
    const re = new RegExp("\\" + "." + sel.slice(1).replace(/[-]/g, "\\-") +
      "\\s*\\{[^}]*?font-size:\\s*([0-9.]+)rem", "g");
    let m;
    while ((m = re.exec(INDEX))) out.push(parseFloat(m[1]));
    return out;
  };
  const titleSizes = sizesOf(".pdx-hs-fm-h");
  const pctSizes = sizesOf(".pdx-hs-sig-pct");
  ok(titleSizes.length > 0 && pctSizes.length > 0,
    "type: the record block title or the percentage declares no font size, so the comparison is vacuous");
  const titleMin = Math.min.apply(null, titleSizes);
  for (const n of pctSizes) {
    ok(n <= titleMin,
      `type: the Word vs Action figure is set at ${n}rem against a record block title of ${titleMin}rem — the cross-check is larger than the finding`);
  }

  const SW = readFileSync(join(ROOT, "sw.js"), "utf8");
  ok(/'\/hero-showcase-data\.js'/.test(SW) && /'\/hero-showcase\.js'/.test(SW),
    "wiring: both files are precached, so a repeat visit does not pay latency on the first paint");
}

// ═════════════════════════════════════════════════════════════════════════════
// Report
// ═════════════════════════════════════════════════════════════════════════════
if (failures.length) {
  console.error(`✖ ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error("  • " + f);
  process.exit(1);
}
console.log(`✓ ${passed} assertions passed — homepage record card: no drift, no seeded verdicts, publishable-only, one integrity language`);
