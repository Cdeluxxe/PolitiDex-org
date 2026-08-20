#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// test-wa-fold.mjs — the ⚖️ Word vs Action fold, driven rather than read
// ───────────────────────────────────────────────────────────────────────────
// ⚖️ Word vs Action used to be the longest thing between a reader and 🌳 All
// Issues by Topic, and most of that length was not the score's argument. It was
// apparatus — the basis table, the feed list, the method prose — plus a tabbed
// issue index that browsed the same person × issue population the tree browses
// one section later. Two open full issue browsers, one above the other.
//
// The fold put the argument on top and everything else under two closed
// controls: "Issues in this score" (deferred — it is four fifths of the
// section's markup) and "How this score is built" (inline — gaps.js hydrates
// its lead rows and its feed rows are jump targets). What this file pins:
//
//   · THE ORDER SURVIVES applyLids. Figure, metric line, scope, tally, shape,
//     composition, notes — all still open, all still above the two lids, and
//     nothing carries dd-open. Pinned against the ASSEMBLED string, because
//     the sub-block order in source and the order after the spine has minted
//     buttons and stashed the deferred body are two different facts.
//   · THE INDEX IS OUT OF THE DEFAULT DOM, not merely styled shut, and the
//     spine can still hand it back.
//   · THE APPARATUS IS ONE LID, NOT THREE. applyLids fails OPEN on a nested
//     sentinel: one stray PDXSP marker inside the fold and the whole region
//     renders inline, which looks exactly like the change never shipping.
//   · THE GATED CONTROLS STILL WORK. Every count and bar segment above the
//     fold — and the letterhead tally outside the section entirely — selects a
//     bucket. Those taps now cross a closed lid, so the handler has to open it
//     BEFORE it selects, and an ungated chip inside the index must not.
//   · NO SCORING DRIFT. read() is pinned digit by digit on a seeded record.
//     The fold is presentation; if this moves, it was not.
//   · A THIN PROFILE GETS NO EMPTY CHROME. No index, no apparatus, no lids —
//     a closed control over nothing is worse than the gap it hides.
//
//   node scripts/test-wa-fold.mjs
// ═══════════════════════════════════════════════════════════════════════════
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m}\n    expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (s, sub, m) => ok(String(s).includes(sub), `${m}\n    missing ${JSON.stringify(sub)}`);
const hasnt = (s, sub, m) => ok(!String(s).includes(sub), `${m}\n    found ${JSON.stringify(sub)}`);
// A probe whose target was renamed makes every assertion built on it vacuously
// true. That is a broken harness, not a passing contract — exit loudly.
const must = (c, m) => {
  if (c) { passed++; return; }
  console.error(`\n  ✗ STALE HARNESS — ${m}\n`);
  process.exit(1);
};

// ── Fake DOM ────────────────────────────────────────────────────────────────
// Enough to hold ids, walk ancestors and record a delegated click handler. The
// switcher is delegated, so driving it is the only way to test the reveal as
// BEHAVIOUR rather than as source text.
const byId = new Map();
const docClick = [];
const mkEl = (tag) => {
  const cls = new Set();
  const el = {
    tagName: (tag || "div").toUpperCase(),
    style: {}, textContent: "", innerHTML: "", hidden: false, className: "", id: "",
    parentNode: null, children: [],
    classList: {
      add: (c) => cls.add(c), remove: (c) => cls.delete(c),
      toggle: (c, on) => { if (on === undefined) { if (cls.has(c)) cls.delete(c); else cls.add(c); } else if (on) cls.add(c); else cls.delete(c); },
      contains: (c) => cls.has(c),
    },
    _classes: cls, _attrs: {}, _sel: new Set(),
    setAttribute(k, v) { el._attrs[k] = String(v); }, getAttribute: (k) => (k in el._attrs ? el._attrs[k] : null),
    removeAttribute(k) { delete el._attrs[k]; },
    hasAttribute: (k) => k in el._attrs,
    focus() {}, click() {}, remove() {},
    _scrolled: 0,
    scrollIntoView() { el._scrolled++; ORDER.push("scrollIntoView"); },
    getBoundingClientRect: () => ({ top: 0, bottom: 0, height: 0 }),
    addEventListener() {}, removeEventListener() {},
    appendChild(c) { if (c) { c.parentNode = el; el.children.push(c); if (c.id) byId.set(c.id, c); } return c; },
    removeChild(c) { if (c) { c.parentNode = null; if (c.id && byId.get(c.id) === c) byId.delete(c.id); } return c; },
    // `closest` over a declared selector set: each element states which
    // selectors it answers to, which is all the handler asks of the tree.
    closest(sel) {
      let n = el;
      while (n) { if (n._sel.has(sel)) return n; n = n.parentNode; }
      return null;
    },
    matches: (sel) => el._sel.has(sel),
    querySelector: (sel) => el._kids[sel] || null,
    querySelectorAll: (sel) => el._kidsAll[sel] || [],
    _kids: {}, _kidsAll: {},
  };
  return el;
};
// One shared trace, so "did it open the lid BEFORE it selected" is a fact about
// a sequence rather than about two independent booleans.
const ORDER = [];

const ctx = {
  console, JSON, Math, Date, setTimeout: (f) => { try { f(); } catch (e) {} return 0; }, clearTimeout() {},
  setInterval: () => 0, clearInterval() {},
  Promise, String, Array, Object, RegExp, Number, Boolean, Error,
  parseInt, parseFloat, isNaN, isFinite, encodeURIComponent, decodeURIComponent,
  requestAnimationFrame: (f) => { try { f(); } catch (e) {} return 0; }, cancelAnimationFrame() {},
  requestIdleCallback: (f) => { try { f(); } catch (e) {} return 0; },
  fetch: () => new Promise(() => {}),
  location: { href: "/", search: "", hash: "", pathname: "/" }, history: { replaceState() {} },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
  getComputedStyle: () => ({ getPropertyValue: () => "" }),
  navigator: { userAgent: "node" },
  document: {
    readyState: "complete", head: mkEl(), body: mkEl(), documentElement: mkEl(),
    createElement: mkEl, createTextNode: () => mkEl("span"),
    getElementById: (id) => byId.get(id) || null,
    querySelector: () => null, querySelectorAll: () => [],
    addEventListener: (type, fn) => { if (type === "click") docClick.push(fn); },
    removeEventListener() {},
  },
  addEventListener() {}, removeEventListener() {}, dispatchEvent: () => true,
  CustomEvent: class { constructor(t, o) { this.type = t; Object.assign(this, o || {}); } },
  IntersectionObserver: class { observe() {} unobserve() {} disconnect() {} },
};
ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
ctx.window._pdxNavJump = () => {};
ctx.window._pdxRevealTarget = (elId) => { ORDER.push("revealTarget:" + elId); };

const CORE = { lower_taxes: "#7fd4c1", border_security: "#e2a06a" };
ctx.window.PDXIssueColors = {
  isCore: (k) => Object.prototype.hasOwnProperty.call(CORE, k),
  getIssueColor: (k) => ({ mapped: !!CORE[k], color: CORE[k] || "#9fb4d4" }),
  styleFor: (k) => (CORE[k] ? `--pdx-ic:${CORE[k]};` : ""),
};

// ── Roster ──────────────────────────────────────────────────────────────────
const PID = "rep_fold", THIN = "rep_thin";
ctx.ISSUE_MAP = {
  lower_taxes: { label: "Lower Taxes" },
  healthcare: { label: "Health Care" },
  border_security: { label: "Border Security" },
};
const stances = [
  { issueKey: "lower_taxes", issueStance: "support" },
  { issueKey: "healthcare", issueStance: "support" },
  { issueKey: "border_security", issueStance: "support" },
];
ctx.ISSUE_STANCE_DATA = { [PID]: stances, [THIN]: [] };
ctx.PROFILES = {
  [PID]: { name: "Marta Solano", office: "U.S. Representative", district: "ID-02", state: "Idaho", party: "R" },
  [THIN]: { name: "Nobody Yet", office: "U.S. Representative", district: "ID-01", state: "Idaho", party: "D" },
};
ctx.CMP_DATA = { [PID]: {}, [THIN]: {} };
ctx.window._getPhotoUrl = () => "";

const sandbox = vm.createContext(ctx);
for (const file of ["stance-helpers.js", "voting-record.js", "exec-record.js", "pdx-learn.js",
                    "consistency.js", "word-action.js", "profile-spine.js"]) {
  vm.runInContext(read(file), sandbox, { filename: file });
}
const C = ctx.window.PDXConsistency;
const WA = ctx.window.PDXWordAction;
const SP = ctx.window.PDXProfileSpine;
must(WA && typeof WA.headlineHtml === "function", "PDXWordAction.headlineHtml is gone");
must(SP && typeof SP.applyLids === "function", "PDXProfileSpine.applyLids is gone");

// A real congressional record on one issue, so read()'s numbers below are the
// engine's own arithmetic and not a stub's opinion.
const SRC = { url: "https://www.congress.gov/roll-call-vote/11", label: "Congress.gov" };
ctx.PDXVotingRecord._records[PID] = [
  { kind: "vote", rollcallId: 11, measureId: 101, number: "H.R. 1", date: "2025-07-03",
    action: "On Passage", position: "yea", isProcedural: false,
    title: "One Big Beautiful Bill Act", source: SRC,
    issues: [{ issueKey: "lower_taxes", weight: 100, isPrimary: true, supportMeaning: "yea_supports" }] },
  { kind: "vote", rollcallId: 9, measureId: 109, number: "H.R. 9", date: "2025-03-11",
    action: "On Passage", position: "nay", isProcedural: false,
    title: "Border Enforcement Act", source: SRC,
    issues: [{ issueKey: "border_security", weight: 90, isPrimary: true, supportMeaning: "yea_supports" }] },
  { kind: "vote", rollcallId: 7, measureId: 117, number: "H.R. 17", date: "2025-02-04",
    action: "On Passage", position: "yea", isProcedural: false,
    title: "Health Coverage Act", source: SRC,
    issues: [{ issueKey: "healthcare", weight: 95, isPrimary: true, supportMeaning: "yea_supports" }] },
  { kind: "vote", rollcallId: 5, measureId: 121, number: "H.R. 21", date: "2025-01-20",
    action: "On Passage", position: "yea", isProcedural: false,
    title: "Second Tax Act", source: SRC,
    issues: [{ issueKey: "lower_taxes", weight: 85, isPrimary: true, supportMeaning: "yea_supports" }] },
];
ctx.PDXVotingRecord._records[THIN] = [];

// The row model, stubbed, so all four buckets exist at once on one figure —
// which no single real seed produces and which is exactly the case the folded
// index is for. Everything the index reads off a row is present.
const stubRow = (key, label, token, over = {}) => ({
  pid: PID, key, label, tier: 1, category: "econ", categoryLabel: "Economy",
  stance: { key, label: "Said a thing", direction: "support", text: "said a thing", source: "" },
  lane: "record", tested: true, scored: true, testability: "high",
  actions: { count: 2, lane: "record", judged: 2 },
  verdict: { token, label: token, cls: "x", ico: "•", color: "#fff", score: null, basis: "action" },
  public: { token: "no_record", count: 0, judged: false },
  evidence: { count: 2, actions: 2, public: 0, total: 2, strength: "documented", sources: [] },
  setAside: null, weights: {}, ov: {},
  ...over,
});
const ROWS = [
  stubRow("lower_taxes", "Lower Taxes", "contradicts"),
  stubRow("healthcare", "Health Care", "mixed"),
  stubRow("border_security", "Border Security", "consistent"),
  stubRow("guns", "Gun Rights", "limited"),
];
const realRows = C.issueRows, realRank = C.rankIssueRows;
const withRows = (rows, pid, fn) => {
  C.issueRows = (p) => (p === pid ? rows : []);
  C.rankIssueRows = (rs) => rs;
  try { return fn(); } finally { C.issueRows = realRows; C.rankIssueRows = realRank; }
};

const HL = withRows(ROWS, PID, () => WA.headlineHtml(PID, ctx.PROFILES[PID]));
must(HL && HL.length > 500, "headlineHtml rendered nothing on the seeded profile");
const FOLDED = SP.applyLids(HL);
must(FOLDED && FOLDED.length > 200, "applyLids returned nothing");

// The index's own id namespace, read off the markup rather than recomputed: every
// control above the fold points at a bucket through it, and the spine has to be
// able to resolve it back to the stashed body.
const uid = (HL.match(/data-pdxwa-seg-uid="([^"]+)"/) || [])[1] || "";
must(uid.length > 0, "no control declares a data-pdxwa-seg-uid — the index namespace is gone");

const IDX_ID = "pdxsp-lid-wa-index";
const HOW_ID = "pdxsp-lid-wa-how";

// ═════════════════════════════════════════════════════════════════════════════
// 1. Two lids, and only two
// ═════════════════════════════════════════════════════════════════════════════
// applyLids fails OPEN on a nested sentinel — a stray PDXSP marker anywhere
// inside a region unfolds the whole region inline. So "the apparatus is behind
// one control" is not a statement about intent, it is a count.
eq((HL.match(/<!--PDXSP:lid /g) || []).length, 2,
  "fold: ⚖️ Word vs Action no longer declares exactly two lids — one nested sentinel and applyLids\n" +
  "    fails open, which renders the whole apparatus inline and looks identical to the fold never shipping");
eq((HL.match(/<!--PDXSP:\/lid-->/g) || []).length, 2, "fold: the two lids are not both closed off");
hasnt(HL, 'id="wa-basis"', "fold: the basis table still declares its own lid — that nests inside the apparatus fold");
hasnt(HL, 'id="wa-feeds"', "fold: the feed list still declares its own lid — that nests inside the apparatus fold");
hasnt(HL, '<details class="pdxwa-method"', "fold: the method prose is still its own <details> — a second disclosure inside the one lid");
eq((FOLDED.match(/pdxsp-lid-btn/g) || []).length, 2, "fold: the rendered section does not mint exactly two lid buttons");
eq((FOLDED.match(/dd-open/g) || []).length, 0, "fold: something in ⚖️ Word vs Action renders already open");
has(FOLDED, `id="${IDX_ID}"`, "fold: the issue index lid did not mint");
has(FOLDED, `id="${HOW_ID}"`, "fold: the apparatus lid did not mint");

// ═════════════════════════════════════════════════════════════════════════════
// 2. The argument stays open; everything else is below both lids
// ═════════════════════════════════════════════════════════════════════════════
// Read off the ASSEMBLED string, not the source: what a reader meets is what
// survived applyLids, in the order applyLids left it.
const at = (needle) => FOLDED.indexOf(needle);
const IDX_AT = at('id="' + IDX_ID + '"');
const HOW_AT = at('id="' + HOW_ID + '"');
must(IDX_AT > 0 && HOW_AT > 0, "neither lid id is in the rendered section — every ordering assertion below is vacuous");

// The score's own argument, in the order a reader meets it. Each of these is a
// FINDING: the figure, the sentence that says what it measures, the four
// integers it averages, the bar that shapes them, the per-issue composition and
// the note that reads the shape out loud.
const ARGUMENT = [
  ["pdxwa-num-v", "the Direction Match figure"],
  ["pdxwa-verdict", "the one-line verdict"],
  ["pdxwa-tally", "the formal tally"],
  ["pdxwa-means", "the short “what this measures” line"],
  ["pdxwa-comp-bar", "the shape graph"],
  ["pdxwa-shapenote", "the note that reads the shape"],
];
let prev = -1, prevName = "the start of the section";
for (const [cls, what] of ARGUMENT) {
  const p = at('class="' + cls);
  must(p !== -1, `${what} (.${cls}) is gone from the rendered section`);
  ok(p > prev, `order: ${what} is no longer after ${prevName} — the score's argument reads out of sequence`);
  ok(p < IDX_AT, `fold: ${what} was swept behind a lid — the argument for the headline figure stays open`);
  prev = p; prevName = what;
}
ok(IDX_AT < HOW_AT, "fold: the apparatus lid is above the issue index — the index is the score's own working\n" +
  "    and reads before the machinery that built it");

// Nothing between the shape and the tree except the two shut controls. This is
// the whole point of the pass: no open basis table, no open feed list, no method
// essay standing between the note that reads the shape and 🌳 All Issues by Topic.
for (const [cls, what] of [["pdxwa-basis", "the basis table"], ["pdxwa-rows", "the sharpest-first rows"],
                           ["pdxwa-feeds", "the feed list"], ["pdxwa-method", "the method prose"]]) {
  const p = at('class="' + cls);
  must(p !== -1, `${what} (.${cls}) no longer renders at all — it was meant to be folded, not deleted`);
  ok(p > HOW_AT, `fold: ${what} is still in the default path — it sits outside "How this score is built"`);
}
// …and the apparatus keeps its own internal order inside the one lid.
ok(at('class="pdxwa-basis') < at('class="pdxwa-feeds'),
  "apparatus: the basis table no longer leads the fold");
ok(at('class="pdxwa-feeds') < at('class="pdxwa-method'),
  "apparatus: the method prose no longer closes the fold");

// ═════════════════════════════════════════════════════════════════════════════
// 3. The index is stashed, not merely shut
// ═════════════════════════════════════════════════════════════════════════════
// Four fifths of this section's markup is the index. Styling it shut leaves all
// of it in the document; deferring it means the phone never parses it until a
// reader asks. The spine has to be able to hand it back, or the fold is a hole.
eq(at("data-pdxwa-oc-panel"), -1,
  "fold: the four bucket panels are still in the default DOM — the index is styled shut rather than deferred");
eq(at("pdxwa-oc-tab"), -1, "fold: the bucket switcher's chips are still in the default DOM");
has(FOLDED, `data-pdxsp-defer="${IDX_ID}"`, "fold: the index lid has no defer host, so nothing can mount it back");
ok(typeof SP.hasTarget === "function" && SP.hasTarget(uid),
  "fold: the spine cannot resolve the index's own id to the stashed body — every count above the fold\n" +
  "    points at a bucket the spine can no longer find");
ok(FOLDED.length < HL.length * 0.7,
  `fold: the rendered section is not materially shorter than the assembled one (${FOLDED.length} vs ${HL.length})`);
// The apparatus is deliberately NOT deferred: gaps.js hydrates its lead rows and
// resolves .pdxwa-method by query when the section renders, and its feed rows are
// jump targets. Deferring it would make those lookups miss on a cold page.
hasnt(FOLDED, `data-pdxsp-defer="${HOW_ID}"`,
  "fold: the apparatus was deferred — gaps.js resolves .pdxwa-method and the lead rows by query at render,\n" +
  "    and a stashed body answers none of those lookups");

// ═════════════════════════════════════════════════════════════════════════════
// 4. Both lids say what is behind them, and where the map is
// ═════════════════════════════════════════════════════════════════════════════
const labels = (FOLDED.match(/class="pdxsp-lid-label"[^>]*>([^<]*)/g) || [])
  .map((m) => m.slice(m.indexOf(">") + 1));
eq(labels.length, 2, "labels: the two lids do not both carry a label");
const idxLabel = labels[0] || "", howLabel = labels[1] || "";
has(idxLabel, "Issues in this score", "labels: the index lid does not name what it holds");
has(idxLabel, "All Issues by Topic",
  "labels: the closed index does not say the tree below is the full map — that sentence is the difference\n" +
  "    between a demoted index and a second, competing browse-all surface");
ok(/\d+ issues? by result/.test(idxLabel),
  `labels: the index lid does not carry its own count, so the shape is hidden behind the tap (${JSON.stringify(idxLabel)})`);
has(howLabel, "How this score is built", "labels: the apparatus lid is not named for what it holds");
ok(/basis/.test(howLabel) && /method/.test(howLabel) && /sources/.test(howLabel),
  `labels: the apparatus lid does not list the three things it folded (${JSON.stringify(howLabel)})`);
ok(/\d+ of \d+ tested/.test(howLabel),
  "labels: the apparatus lid no longer prints the coverage it summarises — the one number worth reading\n" +
  "    without opening it");

// ═════════════════════════════════════════════════════════════════════════════
// 5. A gated count opens the fold BEFORE it selects
// ═════════════════════════════════════════════════════════════════════════════
// The tally, the shape strip's counts and bar segments, and the letterhead copy
// all carry data-pdxwa-gate: they sit above the fold, so their target may be
// stashed. A panel that is not on the page cannot be selected, and a selection
// inside a shut box cannot be seen — so the handler has to reveal first.
must(docClick.length > 0,
  "the delegated click handler was never armed — the switcher cannot be driven and section 5 is vacuous");
// Several modules delegate off the document; the switcher is one of them. Fire
// them all, exactly as a real click would.
const onClick = (ev) => { for (const fn of docClick) { try { fn(ev); } catch (e) {} } };

// The lid, shut, findable by id — this is what revealIndex reaches for.
const lidEl = mkEl(); lidEl.id = IDX_ID; byId.set(IDX_ID, lidEl);
// The index itself, absent until the lid is opened. That absence is the test:
// if the handler selected before revealing, there is nothing to select in.
const section = mkEl(); section._sel.add("[data-pdxwa]");
const ocRoot = mkEl(); ocRoot.id = uid; ocRoot._sel.add(".pdxwa-oc"); section.appendChild(ocRoot);
const mkPane = (tok) => { const e = mkEl(); e.setAttribute("data-pdxwa-oc-panel", tok); return e; };
const mkTab = (tok) => {
  const e = mkEl("button");
  e.setAttribute("data-pdxwa-seg", tok); e.setAttribute("data-pdxwa-seg-uid", uid);
  e.setAttribute("role", "tab"); e._sel.add("[data-pdxwa-seg]"); ocRoot.appendChild(e); return e;
};
const PANES = ["contradicts", "mixed", "consistent", "limited"].map(mkPane);
const TABS = ["contradicts", "mixed", "consistent", "limited"].map(mkTab);
for (const host of [section, ocRoot]) {
  host._kidsAll["[data-pdxwa-oc-panel]"] = PANES;
  host._kidsAll['[data-pdxwa-seg-uid="' + uid + '"]'] = TABS;
}
section._kids[".pdxwa-oc"] = ocRoot;
// Stashed: until the lid opens, the index is not findable by id, exactly as a
// deferred body is not. A handler that selects before it reveals finds nothing.
byId.delete(uid);

// toggleDD is the spine's own opener: it materialises the stashed body, flips the
// class and corrects the scroll. Stubbed here to do exactly that much, and to
// record WHEN it happened.
let mounted = false;
ctx.window.toggleDD = (id) => {
  ORDER.push("toggleDD:" + id);
  if (id === IDX_ID) { lidEl.classList.add("dd-open"); mounted = true; byId.set(uid, ocRoot); }
};
ctx.window._pdxRestoreDD = () => {};

const tap = (el) => { ORDER.length = 0; onClick({ target: el, preventDefault() {} }); };
const isOn = (tok) => PANES.some((p) => p.getAttribute("data-pdxwa-oc-panel") === tok && p.classList.contains("is-on"));

// The letterhead tally: outside the section entirely, gated, resolved DOWN from
// the uid. The hardest of the three routes, so it is the one driven.
const gateBtn = mkEl("button");
gateBtn.setAttribute("data-pdxwa-seg", "mixed");
gateBtn.setAttribute("data-pdxwa-seg-uid", uid);
gateBtn.setAttribute("data-pdxwa-gate", "1");
gateBtn._sel.add("[data-pdxwa-seg]");
tap(gateBtn);
ok(mounted, "gate: a tap on the letterhead tally did not open the closed index — the count is a door into a\n" +
  "    bucket, and the fold must not have turned it into a dead control");
eq(ORDER[0], "toggleDD:" + IDX_ID,
  "gate: the handler did something before it opened the fold — selection into a stashed panel is a no-op,\n" +
  "    so the reveal has to come first");
ok(isOn("mixed"), "gate: the bucket the reader tapped is not selected after the fold opened");
ok(ORDER.indexOf("scrollIntoView") > 0,
  "gate: the index was opened but not brought into view — the reader is left where the tally was, a screen\n" +
  "    above the list they just asked for");
ok(TABS[1].getAttribute("aria-selected") === "true" && TABS[0].getAttribute("aria-selected") === "false",
  "gate: the chips inside the index did not follow the outside control");

// A chip INSIDE the index carries no gate, because it is only reachable once the
// fold is open. Toggling from there would shut it.
ORDER.length = 0;
onClick({ target: TABS[2], preventDefault() {} });
eq(ORDER.filter((x) => x.indexOf("toggleDD") === 0).length, 0,
  "gate: an ungated chip inside the index still toggles the lid — a tap on a bucket would close the box\n" +
  "    it lives in");
ok(isOn("consistent"), "gate: an ungated chip inside the index no longer selects its bucket");

// ═════════════════════════════════════════════════════════════════════════════
// 6. The warm repaint puts the bucket back AFTER the body is remounted
// ═════════════════════════════════════════════════════════════════════════════
// bind() swaps the section's innerHTML when the roll-call record lands, which
// re-stashes the deferred index. Restoring the reader's bucket before that swap
// has been un-done selects into markup that is about to be thrown away — the
// bucket silently resets under a reader who is looking at it.
const WASRC = read("word-action.js");
const bindSrc = WASRC.slice(WASRC.indexOf("function bind("));
must(bindSrc.indexOf("_pdxRestoreDD") !== -1, "bind() no longer restores drawer state — section 6 is vacuous");
must(bindSrc.indexOf("restoreSel") !== -1,
  "bind() no longer names its selection-restore step `restoreSel` — the ordering below cannot be read");
ok(bindSrc.indexOf("_pdxRestoreDD") < bindSrc.indexOf("restoreSel("),
  "warm repaint: the bucket is restored before the deferred index is remounted, so a reader's chosen\n" +
  "    bucket resets when the voting record warms");

// ═════════════════════════════════════════════════════════════════════════════
// 7. No scoring drift
// ═════════════════════════════════════════════════════════════════════════════
// The fold is presentation. read() is the scoring surface, and it is pinned here
// digit by digit on a seeded record: three testable issues, all backed up, 75%.
// If this section fails, the pass stopped being presentation.
const R = withRows(ROWS, PID, () => WA.read(PID, ctx.PROFILES[PID]));
must(R && typeof R === "object", "PDXWordAction.read returned nothing on the seeded profile");
eq(R.pct, 75, "scoring: the Direction Match figure moved");
eq(R.publishable, true, "scoring: the publishability floor moved");
eq(R.token, "consistent", "scoring: the headline verdict moved");
eq(R.coverage.tested, 3, "scoring: the tested count moved");
eq(R.coverage.scorable, 3, "scoring: the scorable denominator moved");
eq(R.coverage.untested, 0, "scoring: the untested count moved");
eq((R.tested || []).length, 3, "scoring: the tested set moved");
// The fold reads r.coverage for its label. Reading is fine; writing is not.
eq(withRows(ROWS, PID, () => WA.read(PID, ctx.PROFILES[PID])).pct, 75,
  "scoring: rendering the section changed what read() answers the second time");

// ═════════════════════════════════════════════════════════════════════════════
// 8. A thin profile gets no empty chrome
// ═════════════════════════════════════════════════════════════════════════════
// A closed control over nothing is worse than the gap it hides: it promises
// working the record cannot show. Both lids are gated on having content.
const THIN_HL = WA.headlineHtml(THIN, ctx.PROFILES[THIN]);
const THIN_FOLDED = SP.applyLids(String(THIN_HL || ""));
eq((String(THIN_HL || "").match(/<!--PDXSP:lid /g) || []).length, 0,
  "thin: a profile with nothing on file still declares a lid — an empty fold reads as withheld working");
hasnt(THIN_FOLDED, "pdxsp-lid-btn", "thin: a lid button minted over an empty record");
hasnt(THIN_FOLDED, "How this score is built", "thin: the apparatus lid offered on a record with no basis to show");
hasnt(THIN_FOLDED, "Issues in this score", "thin: the index lid offered on a record with no issues in it");

// ── Report ──────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n  ✗ ${failures.length} failed, ${passed} passed\n`);
  for (const f of failures) console.error(`    · ${f}`);
  console.error("");
  process.exit(1);
}
console.log(`  ✓ test-wa-fold.mjs — ${passed} assertions`);
