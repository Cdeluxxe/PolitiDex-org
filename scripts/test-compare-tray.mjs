#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// ⚖️ COMPARISON BAR — compare-tray.js
// ─────────────────────────────────────────────────────────────────────────────
// Gates the sticky comparison set a reader builds from any card's ⚖️ Compare
// button:
//
//   1. The bar is hidden until the first add, then visible with a chip per
//      person, a count and a Jump button.
//   2. Close clears the set and hides the bar.
//   3. Jump with two people opens the EXISTING side-by-side (openCompare); with
//      three or four it opens the condensed summary — name, party/seat, match %,
//      top issue marks (✓ / ✗ / ~), one Word vs Action line and "View with…".
//   4. "View with…" narrows to a pair for the existing table and restores the
//      full set when the table closes.
//   5. The cap is four: a fifth add from a card is refused with "remove one
//      first" and nobody the reader chose is dropped.
//   6. The existing card toggles (chubToggle, bpAddCompare, pmAddCompare,
//      handleCompareCheck) add through the bar on a phone width and a desktop
//      width alike, and the card buttons that used to open the table at once
//      (issue compare row, receipt card, search) now add to the set instead.
//   7. Wiring: compare-table.js loads both files, the precache list is
//      unchanged and the service worker version moved.
//
//   node scripts/test-compare-tray.mjs
//
// No database, no network, no browser — a minimal fake DOM is enough because the
// module reads the page only through getElementById/createElement/listeners.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(join(ROOT, f), "utf8");
const TRAY = read("compare-tray.js");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);
const has = (hay, needle, msg) => ok(String(hay).includes(needle), `${msg} (${JSON.stringify(needle)} missing)`);
const lacks = (hay, needle, msg) => ok(!String(hay).includes(needle), `${msg} (${JSON.stringify(needle)} unexpectedly present)`);

// ── A minimal fake DOM ───────────────────────────────────────────────────────
function makeEnv(width) {
  const byId = new Map();
  function classList(el) {
    const s = new Set();
    return {
      add: (c) => { s.add(c); el._mut(); }, remove: (c) => { s.delete(c); el._mut(); },
      contains: (c) => s.has(c),
      toggle: (c, on) => { const v = on === undefined ? !s.has(c) : !!on; if (v) s.add(c); else s.delete(c); el._mut(); return v; },
    };
  }
  class El {
    constructor(tag) {
      this.tagName = tag; this._id = ""; this.className = ""; this.hidden = false;
      this._attrs = {}; this.children = []; this._listeners = {}; this.innerHTML = "";
      this.textContent = ""; this._observers = [];
      const self = this; let disp = "";
      this.style = {};
      Object.defineProperty(this.style, "display", { get: () => disp, set: (v) => { disp = v; self._mut(); }, enumerable: true });
      this.classList = classList(this);
      this.dataset = {};
    }
    _mut() { this._observers.forEach((o) => o._fire()); }
    get id() { return this._id; }
    set id(v) { this._id = v; byId.set(v, this); }
    setAttribute(k, v) { this._attrs[k] = String(v); }
    getAttribute(k) { return k in this._attrs ? this._attrs[k] : null; }
    appendChild(c) { this.children.push(c); c.parentNode = this; return c; }
    addEventListener(t, f) { (this._listeners[t] = this._listeners[t] || []).push(f); }
    dispatch(t, ev) { (this._listeners[t] || []).forEach((f) => f(ev)); }
    querySelector() { return null; }
    querySelectorAll() { return []; }
    getBoundingClientRect() { return { top: 0, bottom: width < 641 ? 52 : 64 }; }
    focus() {}
    closest() { return null; }
  }
  const body = new El("body");
  const docListeners = {};
  const document = {
    readyState: "complete",
    body,
    createElement: (t) => new El(t),
    getElementById: (id) => {
      if (byId.has(id)) return byId.get(id);
      // Children rendered via innerHTML: hand back a stable stub per id so the
      // module can write text into them as it would into the real nodes.
      if (/^pdx-cmp-tray-/.test(id) && byId.has("pdx-cmp-tray")) { const e = new El("span"); e.id = id; return e; }
      return null;
    },
    querySelectorAll: () => [],
    addEventListener: (t, f) => { (docListeners[t] = docListeners[t] || []).push(f); },
  };
  const nav = new El("nav"); nav.id = "pdx-topnav";
  const ov = new El("div"); ov.id = "compare-overlay"; ov.style.display = "none";

  class MO {
    constructor(cb) { this.cb = cb; }
    observe(el) { el._observers.push(this); }
    _fire() { this.cb([]); }
  }

  const sel = new Set();
  const calls = { openCompare: 0, chub: [], bp: [], pm: [], cb: [], clearAll: 0 };
  const win = {
    innerWidth: width,
    document,
    _cmpSelected: sel,
    MutationObserver: MO,
    requestAnimationFrame: (f) => f(),
    addEventListener: () => {},
    CMP_DATA: {
      a: { name: "Ada Alpha", party: "D", office: "U.S. Senator", state: "Utah" },
      b: { name: "Ben Beta", party: "R", office: "U.S. Representative", district: "UT-1" },
      c: { name: "Cy Gamma", party: "I", office: "Governor", state: "Ohio" },
      d: { name: "Di Delta", party: "R", office: "State Senator", district: "SD-4" },
      e: { name: "Ed Epsilon", party: "D", office: "Mayor", state: "Iowa" },
    },
    _alignIssues: new Set(["guns", "tax", "water"]),
    _calcAlignmentScore: (pid) => ({ a: 81, b: 34, c: 57.4, d: null }[pid] ?? null),
    _calcAlignmentBreakdown: () => ({ issues: [
      { key: "guns", label: "Guns", score: 80, hasEvidence: true, intensity: "support" },
      { key: "tax", label: "Taxes", score: 30, hasEvidence: true, intensity: "strongly_oppose" },
      { key: "water", label: "Water", score: 52, hasEvidence: true, intensity: "support" },
      { key: "none", label: "Unread", score: 90, hasEvidence: false },
    ] }),
    PDXWordAction: { read: (pid) => pid === "a"
      ? { publishable: true, verdict: { label: "Word and action line up" } }
      : { publishable: false, coverage: { word: 2 } } },
    openCompare: () => { calls.openCompare++; ov.style.display = "flex"; ov.classList.add("cmp-open"); },
    clearAllCompare: () => { calls.clearAll++; sel.clear(); },
  };
  // The existing card toggles, reduced to what they do to the selection.
  win.chubToggle = (pid) => { calls.chub.push(pid); if (sel.has(pid)) sel.delete(pid); else sel.add(pid); };
  win.bpAddCompare = (pid) => { calls.bp.push(pid); if (sel.has(pid)) sel.delete(pid); else sel.add(pid); };
  win.pmAddCompare = (pid) => { calls.pm.push(pid); if (sel.has(pid)) sel.delete(pid); else sel.add(pid); };
  win.handleCompareCheck = (cb) => { calls.cb.push(cb.dataset.pid); if (cb.checked) sel.add(cb.dataset.pid); else sel.delete(cb.dataset.pid); };
  win.window = win;
  win.setTimeout = (f) => 0; win.clearTimeout = () => {};
  const ctx = vm.createContext(win);
  vm.runInContext(TRAY, ctx, { filename: "compare-tray.js" });
  const closeOverlay = () => { ov.classList.remove("cmp-open"); ov.style.display = "none"; };
  return { win, sel, calls, byId, closeOverlay, body };
}

for (const width of [390, 1280]) {
  const W = width < 641 ? "phone" : "desktop";
  const { win, sel, calls, byId, closeOverlay, body } = makeEnv(width);
  const T = win.PDXCompareTray;
  ok(T && typeof T.add === "function", `${W}: PDXCompareTray is published`);
  const bar = byId.get("pdx-cmp-tray");
  const sum = byId.get("pdx-cmp-sum");
  const note = () => byId.get("pdx-cmp-tray-note").textContent;
  const chips = () => byId.get("pdx-cmp-tray-chips").innerHTML;

  // 1. Hidden until the first add.
  ok(bar && bar.hidden === true, `${W}: the bar is hidden before anyone is added`);
  win.chubToggle("a"); // a card's ⚖️ Compare button
  eq(bar.hidden, false, `${W}: the bar shows after the first add`);
  has(chips(), "Ada Alpha", `${W}: the chip names the person`);
  has(chips(), 'data-cmp-rm="a"', `${W}: the chip carries a remove control`);
  eq(byId.get("pdx-cmp-tray-count").textContent, "1 of 4", `${W}: the bar shows the count`);
  eq(note(), "Added — 1 of 4", `${W}: an add is confirmed`);
  eq(bar.style.top, (width < 641 ? 52 : 64) + "px", `${W}: the bar sits directly under the top nav`);
  ok(body.classList.contains("pdx-cmp-tray-on"), `${W}: the page knows the bar is showing`);
  eq(calls.openCompare, 0, `${W}: adding does not open the table`);

  // One person: Jump asks for a second rather than opening anything.
  T.jump();
  eq(calls.openCompare, 0, `${W}: Jump with one person opens nothing`);
  has(note(), "Add one more", `${W}: …and says why`);

  // Every existing card toggle adds through the bar.
  win.bpAddCompare("b", {});
  eq(note(), "Added — 2 of 4", `${W}: a card's bp Compare button confirms "2 of 4"`);
  eq(byId.get("pdx-cmp-tray-jump").textContent, "Jump to comparison", `${W}: Jump is ready at two`);

  // 3a. Two people → the existing side-by-side.
  T.jump();
  eq(calls.openCompare, 1, `${W}: Jump with two opens the existing side-by-side`);
  ok(sum.hidden, `${W}: …and not the summary`);
  closeOverlay();
  eq([...sel].join(","), "a,b", `${W}: closing the table keeps the set`);

  win.pmAddCompare("c", {});
  win.handleCompareCheck({ checked: true, dataset: { pid: "d" } });
  eq(sel.size, 4, `${W}: the power-map and checkbox toggles add too`);
  eq(note(), "Added — 4 of 4", `${W}: the fourth add is confirmed`);

  // 5. A fifth is refused, nobody is dropped.
  win.chubToggle("e");
  eq(sel.size, 4, `${W}: a fifth add is refused`);
  ok(!sel.has("e") && sel.has("a"), `${W}: …and the oldest is not silently dropped`);
  has(note(), "remove one first", `${W}: …with a "remove one first" message`);
  const cb = { checked: true, dataset: { pid: "e" } };
  win.handleCompareCheck(cb);
  eq(cb.checked, false, `${W}: a refused checkbox is unticked again`);
  ok(!calls.chub.includes("e"), `${W}: the refused toggle never ran`);

  // 3b. Four → the condensed summary.
  const before = calls.openCompare;
  T.jump();
  eq(calls.openCompare, before, `${W}: Jump with four does not open the big table`);
  eq(sum.hidden, false, `${W}: Jump with four opens the condensed summary`);
  const H = sum.innerHTML;
  ["Ada Alpha", "Ben Beta", "Cy Gamma", "Di Delta"].forEach((n) => has(H, n, `${W}: summary row for ${n}`));
  lacks(H, "Ed Epsilon", `${W}: the summary only shows people the reader added`);
  has(H, "D · U.S. Senator, Utah", `${W}: party and seat`);
  has(H, "81%", `${W}: match % from the existing match reader`);
  has(H, "57%", `${W}: match % is rounded, not re-derived`);
  has(H, "✓</b>Guns", `${W}: ✓ for an issue that lines up`);
  has(H, "✗</b>Taxes", `${W}: ✗ for an issue that differs`);
  has(H, "~</b>Water", `${W}: ~ for a mixed issue`);
  lacks(H, "Unread", `${W}: an issue without evidence is not marked`);
  ok(H.indexOf("Taxes") < H.indexOf("Guns"), `${W}: a strongly-weighted issue leads`);
  has(H, "Word and action line up", `${W}: one Word vs Action line, in its own words`);
  has(H, "Not enough record to check yet", `${W}: …and the coverage line below the floor`);
  eq((H.match(/data-cs-with="/g) || []).length, 4, `${W}: every row has a "View with…" action`);
  has(H, 'data-cs-pair="a|c"', `${W}: "View with…" offers the other people in the set`);
  lacks(H, 'data-cs-pair="a|e"', `${W}: …and nobody outside it`);

  // 4. View with… → the existing 2-person table, then the set comes back.
  T.viewWith("a", "c");
  eq([...sel].sort().join(","), "a,c", `${W}: View with narrows the table to the pair`);
  eq(calls.openCompare, before + 1, `${W}: …and opens the existing side-by-side`);
  ok(sum.hidden, `${W}: …closing the summary`);
  eq(T.members().length, 4, `${W}: the bar keeps the full set while the pair is open`);
  closeOverlay();
  eq([...sel].sort().join(","), "a,b,c,d", `${W}: closing the pair view restores the full set`);
  eq(sum.hidden, false, `${W}: …and returns to the summary`);

  // Chip remove via the bar's own click handler.
  bar.dispatch("click", { preventDefault() {}, target: { closest: (s) => s === "[data-cmp-rm]" ? { getAttribute: () => "d" } : null } });
  ok(!sel.has("d"), `${W}: a chip's ✕ removes that person`);
  eq(byId.get("pdx-cmp-tray-count").textContent, "3 of 4", `${W}: …and the count follows`);
  eq(sum.hidden, false, `${W}: the summary stays open at three`);
  lacks(sum.innerHTML, "Di Delta", `${W}: …without the removed person`);

  // 2. Close clears and hides.
  bar.dispatch("click", { preventDefault() {}, target: { closest: (s) => s === "#pdx-cmp-tray-close" ? {} : null } });
  eq(sel.size, 0, `${W}: close clears the set`);
  eq(bar.hidden, true, `${W}: close hides the bar`);
  ok(sum.hidden, `${W}: close also closes the summary`);
  ok(!body.classList.contains("pdx-cmp-tray-on"), `${W}: the page knows the bar is gone`);

  // PDXCompareTray.add — the path the formerly-immediate buttons now take.
  T.add("e");
  eq([...sel].join(","), "e", `${W}: PDXCompareTray.add adds one person`);
  eq(bar.hidden, false, `${W}: …and shows the bar`);
  T.add("e");
  eq(sel.size, 1, `${W}: adding someone twice does not toggle them off`);
}

// ── 6. The card buttons that used to open the table at once ──────────────────
const IC = read("issue-compare.js");
const icOne = IC.slice(IC.indexOf("compareOne: function"), IC.indexOf("compareField: function"));
ok(icOne.indexOf("PDXCompareTray.add") >= 0 && icOne.indexOf("PDXCompareTray.add") < icOne.indexOf("openCompare"),
  "issue-compare: the row's Compare adds to the set before any fallback open");
const JN = read("journey.js");
const jn = JN.slice(JN.indexOf("if (act === 'compare')"), JN.indexOf("if (act === 'compare')") + 900);
ok(jn.indexOf("CT.add(pid)") >= 0 && jn.indexOf("CT.add(pid)") < jn.indexOf("openCompare"),
  "journey: the receipt card's Compare adds to the set before any fallback open");
const AS = read("all-seeing-eye.js");
const as = AS.slice(AS.indexOf("if (id === 'compare')"), AS.indexOf("if (id === 'compare')") + 900);
ok(as.indexOf("PDXCompareTray.add(e.id)") >= 0 && as.indexOf("PDXCompareTray.add(e.id)") < as.indexOf("cmpAddRacePeers"),
  "search: Compare adds only that person, without pulling in race peers");

// The existing compare table is untouched by this module.
lacks(TRAY, "_buildCmpTable", "the bar never rebuilds the compare table itself");
lacks(TRAY, "cmpAddRacePeers", "the bar never adds people the reader did not pick");

// Phone: the chips scroll sideways so the bar stays one line.
const CSS = read("compare-tray.css");
has(CSS, "overflow-x: auto", "chips scroll horizontally");
has(CSS, "body.pdx-cmp-tray-on #compare-float-btn { display: none !important; }", "the bottom float yields to the bar");

// ── 7. Shell wiring ──────────────────────────────────────────────────────────
const CT = read("compare-table.js");
const loader = CT.slice(CT.indexOf("COMPARISON BAR LOADER"));
has(loader, "'/compare-tray.js'", "compare-table.js loads compare-tray.js with the table it feeds");
has(loader, "'/compare-tray.css'", "compare-table.js loads compare-tray.css");
has(TRAY, "document.addEventListener('DOMContentLoaded', boot)", "the guards re-install once the page has parsed");
has(TRAY, "window.addEventListener('load', installGuards)", "…and again at load, so script order does not matter");
const SW = read("sw.js");
const shell = SW.slice(SW.indexOf("const SHELL_ASSETS"), SW.indexOf("];", SW.indexOf("const SHELL_ASSETS")));
lacks(shell, "'/compare-tray.js'", "the precache list is unchanged (runtime entry, like compare-table.js)");
lacks(shell, "'/compare-tray.css'", "…and so is its stylesheet");
const ver = (SW.match(/const CACHE_VERSION = 'v(\d+)'/) || [])[1];
ok(Number(ver) >= 557, `the shell version moved for the changed precached shell (journey.js) (v${ver})`);

if (failures.length) {
  console.error(`✗ compare-tray: ${failures.length} failed, ${passed} passed`);
  failures.forEach((f) => console.error("  · " + f));
  process.exit(1);
}
console.log(`✓ compare-tray: ${passed} assertions passed`);
