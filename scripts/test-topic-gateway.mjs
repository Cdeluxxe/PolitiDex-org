#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-topic-gateway.mjs — 🚪 the topic tree as a gateway, driven by taps
// ─────────────────────────────────────────────────────────────────────────────
// test-stance-tree.mjs asserts what the tree SAYS. This file asserts what it
// DOES, by dispatching real clicks at the module's own document-level handler
// and reading the DOM back afterwards. It exists because every failure this pass
// answers is an interaction failure that markup assertions cannot see:
//
//   · "TAPPING A TOPIC DOES NOTHING." Reported on a phone. The handler was firing
//     the whole time — the one-branch-at-a-time rule closes a taller branch ABOVE
//     the tapped one, the document shortens under the reader's thumb, and the
//     branch they opened travels off the top of the screen. A working control,
//     indistinguishable from a dead one. Section 3 rebuilds that exact geometry
//     and asserts the branch is on screen after the tap — and, in the same
//     breath, asserts that WITHOUT the correction it would not have been, so the
//     test cannot quietly stop testing anything.
//   · "THE LEAF IS THE DOOR." The funnel's third step is the EXISTING dossier,
//     reached through the existing public entry with the leaf's own id as the
//     return address. Section 4 proves the call, its arguments and the fact that
//     the origin it hands over resolves back to the very element that was tapped.
//   · "NO SILENT NO-OP." If the dossier cannot mount, the row says so where the
//     thumb already is, and recovers on the next working tap. Section 5.
//   · "IT IS STILL NOT A SCORE." Section 6 re-reads Direction Match, the verdict
//     tally, the pooled Word vs Action figure and the counts object AFTER every
//     tap in this file and compares them byte-for-byte with a sandbox that never
//     loaded the tree at all.
//
// Sections:
//   1. The funnel has three voices — broad face, precise leaf, dossier
//   2. A branch really opens, really closes, and one at a time on a phone
//   3. Opening a branch leaves it on the screen (the phone regression)
//   4. A leaf opens the existing dossier, with a return address
//   5. A door that cannot open says so, and recovers
//   6. Nothing above touched a number
//   7. The tap targets are real targets
//
//   node scripts/test-topic-gateway.mjs
//
// Real shipped modules in a node:vm sandbox, real profile data, and a small
// hand-written DOM — enough element, selector and geometry behaviour for the
// module's own code paths, and nothing more. There is no browser in this suite.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
// An element is a cycle, not a value: describe it, never stringify it.
const show = (v) => {
  if (v instanceof El) return `<${v.tagName.toLowerCase()}${v.id ? "#" + v.id : ""}${v.className ? "." + v.className.split(/\s+/).join(".") : ""}>`;
  try { return JSON.stringify(v); } catch (e) { return String(v); }
};
const eq = (a, b, msg) => ok(a === b, `${msg} (got ${show(a)}, want ${show(b)})`);
const has = (hay, needle, msg) =>
  ok(String(hay).includes(needle), `${msg} — ${JSON.stringify(needle)} missing`);
const lacks = (hay, needle, msg) =>
  ok(!String(hay).includes(needle), `${msg} — ${JSON.stringify(needle)} present`);
const section = (t) => console.log(`  · ${t}`);
// A probe that stops finding its target makes everything built on it vacuously
// true. That is a broken harness, not a green contract — exit loudly.
const must = (cond, msg) => {
  if (cond) { passed++; return; }
  console.error(`✗ topic gateway: STALE HARNESS — ${msg}`);
  process.exit(2);
};

// ═════════════════════════════════════════════════════════════════════════════
// A SMALL DOM
// ─────────────────────────────────────────────────────────────────────────────
// Only what stance-tree.js actually calls: attributes, class names, text, append
// and remove, closest / querySelector(All) over descendant-plus-attribute-plus-
// class selectors, and a measurable geometry for the handful of elements the
// reveal pass measures. Deliberately not a browser — a real DOM would be a much
// larger thing to trust than the module under test.
// ═════════════════════════════════════════════════════════════════════════════
const VOID = new Set(["br", "hr", "img", "input", "meta", "link", "source", "wbr"]);
let layout = () => {};

class Txt {
  constructor(data) { this.nodeType = 3; this.data = String(data); this.parentNode = null; }
  get textContent() { return this.data; }
}

class El {
  constructor(tag) {
    this.nodeType = 1;
    this.tagName = String(tag).toUpperCase();
    this.attrs = new Map();
    this.childNodes = [];
    this.parentNode = null;
    this.style = {};
  }
  getAttribute(n) { return this.attrs.has(n) ? this.attrs.get(n) : null; }
  setAttribute(n, v) { this.attrs.set(n, String(v)); }
  removeAttribute(n) { this.attrs.delete(n); }
  hasAttribute(n) { return this.attrs.has(n); }
  get id() { return this.getAttribute("id") || ""; }
  get className() { return this.getAttribute("class") || ""; }
  set className(v) { this.setAttribute("class", v); }
  get classes() { return this.className.split(/\s+/).filter(Boolean); }
  get children() { return this.childNodes.filter((n) => n.nodeType === 1); }
  get textContent() { return this.childNodes.map((n) => n.textContent).join(""); }
  set textContent(v) {
    this.childNodes.forEach((n) => { n.parentNode = null; });
    this.childNodes = [];
    this.appendChild(new Txt(v));
  }
  appendChild(n) { n.parentNode = this; this.childNodes.push(n); return n; }
  removeChild(n) {
    const i = this.childNodes.indexOf(n);
    if (i !== -1) this.childNodes.splice(i, 1);
    n.parentNode = null;
    return n;
  }
  matches(sel) { return matchSel(this, sel); }
  closest(sel) {
    let n = this;
    while (n && n.nodeType === 1) { if (matchSel(n, sel)) return n; n = n.parentNode; }
    return null;
  }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  querySelectorAll(sel) {
    const out = [];
    walk(this, (n) => { if (n !== this && matchSel(n, sel)) out.push(n); });
    return out;
  }
  focus() { this.ownerFocus = true; }
  // A filter chip replaces the whole tree block through outerHTML. Supporting it
  // is what lets section 8 assert that the block still works after a re-render.
  set outerHTML(v) {
    const parent = this.parentNode;
    if (!parent) return;
    const holder = new El("div");
    parse(v, holder);
    const kids = holder.childNodes.slice();
    kids.forEach((k) => { k.parentNode = parent; });
    const i = parent.childNodes.indexOf(this);
    parent.childNodes.splice(i, 1, ...kids);
    this.parentNode = null;
    this._replaced = true;
  }
  getBoundingClientRect() {
    if (this._rect) return this._rect();
    if (!this._measured) return undefined;
    layout();
    const top = this._top;
    return { top: top, bottom: top + this._h, height: this._h, left: 0, right: 320, width: 320 };
  }
}

function walk(node, fn) {
  fn(node);
  for (const c of node.childNodes) if (c.nodeType === 1) walk(c, fn);
}

const SEL_CACHE = new Map();
function parseSel(sel) {
  if (SEL_CACHE.has(sel)) return SEL_CACHE.get(sel);
  const parts = String(sel).trim().split(/\s+(?![^[]*\])/).map((part) => {
    const t = { tag: null, id: null, classes: [], attrs: [] };
    const re = /\[([\w-]+)(?:=("([^"]*)"|[^\]]*))?\]|([.#]?[\w-]+)/g;
    let m;
    while ((m = re.exec(part)) !== null) {
      if (m[1]) t.attrs.push({ name: m[1], val: m[2] === undefined ? null : (m[3] !== undefined ? m[3] : m[2]) });
      else if (m[4][0] === ".") t.classes.push(m[4].slice(1));
      else if (m[4][0] === "#") t.id = m[4].slice(1);
      else t.tag = m[4].toUpperCase();
    }
    return t;
  });
  SEL_CACHE.set(sel, parts);
  return parts;
}
function matchOne(el, t) {
  if (!el || el.nodeType !== 1) return false;
  if (t.tag && el.tagName !== t.tag) return false;
  if (t.id && el.id !== t.id) return false;
  for (const c of t.classes) if (el.classes.indexOf(c) === -1) return false;
  for (const a of t.attrs) {
    if (!el.hasAttribute(a.name)) return false;
    if (a.val !== null && el.getAttribute(a.name) !== a.val) return false;
  }
  return true;
}
function matchSel(el, sel) {
  const parts = parseSel(sel);
  if (!matchOne(el, parts[parts.length - 1])) return false;
  let n = el.parentNode;
  for (let i = parts.length - 2; i >= 0; i--) {
    while (n && n.nodeType === 1 && !matchOne(n, parts[i])) n = n.parentNode;
    if (!n || n.nodeType !== 1) return false;
    n = n.parentNode;
  }
  return true;
}

// A parser for the markup this module emits: quoted attributes, bare boolean
// attributes, text, and nothing exotic. It is not an HTML parser in general.
function parse(html, into) {
  const stack = [into];
  const re = /<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>|([^<]+)/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    if (m[5] !== undefined) {
      const txt = m[5];
      if (txt.trim()) stack[stack.length - 1].appendChild(new Txt(txt));
      continue;
    }
    const [, close, tag, attrText, selfClose] = m;
    if (close) {
      if (stack.length > 1) stack.pop();
      continue;
    }
    const el = new El(tag);
    const ar = /([\w:-]+)(?:="([^"]*)")?/g;
    let a;
    while ((a = ar.exec(attrText)) !== null) el.setAttribute(a[1], a[2] === undefined ? "" : a[2]);
    stack[stack.length - 1].appendChild(el);
    if (!selfClose && !VOID.has(tag.toLowerCase())) stack.push(el);
  }
  return into;
}

function makeDoc() {
  const body = new El("body");
  const doc = {
    nodeType: 9,
    readyState: "complete",
    body,
    documentElement: body,
    head: new El("head"),
    _click: [],
    createElement: (t) => new El(t),
    addEventListener(type, fn) { if (type === "click") doc._click.push(fn); },
    removeEventListener() {},
    dispatchEvent() { return true; },
    getElementById(id) {
      let hit = null;
      walk(body, (n) => { if (!hit && n.id === id) hit = n; });
      return hit;
    },
    querySelector: (s) => body.querySelector(s),
    querySelectorAll: (s) => body.querySelectorAll(s),
  };
  return doc;
}

// One tap. The module binds a single delegated listener, so a click on a span
// deep inside a control is exactly what a thumb produces.
function tap(doc, el) {
  const ev = {
    type: "click", target: el, defaultPrevented: false,
    preventDefault() { this.defaultPrevented = true; },
    stopPropagation() {}, stopImmediatePropagation() {},
  };
  for (const h of doc._click.slice()) h(ev);
  return ev;
}

// ═════════════════════════════════════════════════════════════════════════════
// THE SANDBOX
// ═════════════════════════════════════════════════════════════════════════════
const BASE = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "exec-record-ui.js", "issue-colors.js", "consistency.js", "voting-record.js",
  "word-action.js", "profile-spine.js",
];
const TREE = "stance-tree.js";
const SRC = new Map([...BASE, TREE].map((f) => [f, R(f)]));

// The document is swapped in BEFORE stance-tree.js runs, because the module
// binds its delegated listener at load: bound to the stub, every tap below would
// land nowhere and every assertion would pass on an empty document.
function boot({ tree = true, doc = null } = {}) {
  const win = makeSandbox();
  const sandbox = vm.createContext(win);
  for (const f of BASE) vm.runInContext(SRC.get(f), sandbox, { filename: f });
  if (doc) win.document = doc;
  if (tree) vm.runInContext(SRC.get(TREE), sandbox, { filename: TREE });
  win.PROFILES = win.CMP_DATA;
  return win;
}

// ── The fixture ──────────────────────────────────────────────────────────────
// khanna is the member; trump is the executive profile the report named. Votes
// are seeded the way a completed /api/voting-record fetch leaves the cache, so
// the record half of a leaf is warm rather than cold.
const PID = "khanna";
const EXEC = "trump";
const probe = boot({ doc: null });
must(!!probe.PDXStanceTree, "the module did not publish window.PDXStanceTree");

const stanceOf = {};
probe.PDXConsistency.issueRows(PID).forEach((r) => {
  if (r.stance && r.stance.key) stanceOf[r.key] = r.stance.key;
});
const SUPPORTED = Object.keys(stanceOf).filter((k) => stanceOf[k] === "support");
must(SUPPORTED.length >= 2, "the fixture no longer offers two supported issues");
const vote = (n, issueKey, position) => ({
  kind: "vote", rollcallId: 700 + n, measureId: 1100 + n, number: "H.R. " + (300 + n),
  date: "2025-0" + ((n % 9) + 1) + "-11", action: "On Passage", position,
  isProcedural: false, title: "Measure " + n,
  source: { url: "https://www.congress.gov/roll-call-vote/" + (700 + n), label: "Congress.gov" },
  issues: [{ issueKey, weight: 100, isPrimary: true, supportMeaning: "yea_supports" }],
});
const SEED = [];
for (let i = 0; i < 12; i++) SEED.push(vote(i, SUPPORTED[0], "yea"));
for (let i = 0; i < 12; i++) SEED.push(vote(20 + i, SUPPORTED[1], "nay"));
const seedInto = (win) =>
  win.PDXVotingRecord.noteMember(PID, SEED.map((v) => JSON.parse(JSON.stringify(v))));

// The live sandbox: real document, real handler, real taps.
const doc = makeDoc();
const A = boot({ doc });
seedInto(A);
// The control sandbox: the whole product, without this module, never tapped.
const B = boot({ tree: false });
seedInto(B);
ok(!B.PDXStanceTree, "the control sandbox really is the product without the tree");

const T = A.PDXStanceTree, CS = A.PDXConsistency;
A.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} });
let PHONE = false;
A.matchMedia = (q) => ({ matches: PHONE && q === T.PHONE, addEventListener() {}, addListener() {} });
A.getComputedStyle = (n) => ({
  overflowY: (n && n._overflow) || "", getPropertyValue: () => "",
});

// ── The page ─────────────────────────────────────────────────────────────────
// The profile modal, reduced to the two things the reveal pass measures: a
// scrolling box, and the sticky jump rail floating over the top of it.
// headOffset is the tally and the filter chips: the branches never start at the
// very top of the scrolling content, so a branch above the band can always be
// scrolled back to.
const GEO = { boxTop: 100, boxBottom: 700, navH: 40, faceH: 48, panelH: 900, headOffset: 300 };
const nav = new El("div");
nav.setAttribute("id", "pdx-profile-nav");
nav.offsetHeight = GEO.navH;
doc.body.appendChild(nav);

const BOX = new El("div");
BOX._overflow = "auto";
BOX.scrollTop = 0;
BOX.scrollHeight = 6000;
BOX.clientHeight = GEO.boxBottom - GEO.boxTop;
BOX._rect = () => ({ top: GEO.boxTop, bottom: GEO.boxBottom, height: BOX.clientHeight, left: 0, right: 320, width: 320 });
BOX.scrollTo = (o) => { BOX.scrollTop = Math.max(0, (o && o.top) || 0); };
doc.body.appendChild(BOX);

const HTML = T.html(PID, { uid: "gw" });
must(!!HTML, "the tree produced no markup for the fixture profile");
parse(HTML, BOX);

const TREE_EL = BOX.querySelector(".pdxtree");
must(!!TREE_EL, "the parsed markup has no .pdxtree root");
const BRANCHES = TREE_EL.querySelectorAll("[data-pdxtree-branch]");
must(BRANCHES.length >= 3, `the fixture rendered too few branches (${BRANCHES.length})`);

// Geometry: branches stack in document order, a face is a fixed height, an open
// panel is taller than the visible band. Rects are computed live from the CURRENT
// open state, which is what makes the collapse-above problem reproducible here.
const measured = [];
BRANCHES.forEach((b) => {
  const face = b.querySelector("[data-pdxtree-toggle]");
  const panel = b.querySelector(".pdxtree-panel");
  [b, face, panel].forEach((el) => { if (el) { el._measured = true; measured.push(el); } });
});
layout = () => {
  let y = GEO.headOffset;
  BRANCHES.forEach((b) => {
    const face = b.querySelector("[data-pdxtree-toggle]");
    const panel = b.querySelector(".pdxtree-panel");
    const open = b.getAttribute("data-pdxtree-open") === "1";
    const screenTop = GEO.boxTop + y - BOX.scrollTop;
    b._top = screenTop; b._h = GEO.faceH + (open ? GEO.panelH : 0);
    if (face) { face._top = screenTop; face._h = GEO.faceH; }
    if (panel) { panel._top = screenTop + GEO.faceH; panel._h = open ? GEO.panelH : 0; }
    y += b._h;
  });
};
const contentTop = (branch) => {
  let y = GEO.headOffset;
  for (const b of BRANCHES) {
    if (b === branch) return y;
    y += GEO.faceH + (b.getAttribute("data-pdxtree-open") === "1" ? GEO.panelH : 0);
  }
  return y;
};
const openKeys = () =>
  TREE_EL.querySelectorAll('[data-pdxtree-branch][data-pdxtree-open="1"]')
    .map((b) => b.getAttribute("data-pdxtree-branch"));
const faceOf = (b) => b.querySelector("[data-pdxtree-toggle]");
// Issue rows a reader can actually see: the ones inside a panel that is not
// hidden. Everything else is markup behind a shut door.
const onScreenLeaves = () =>
  [...TREE_EL.querySelectorAll("[data-pdxtree-branch]")]
    .filter((b) => !b.querySelector(".pdxtree-panel").hasAttribute("hidden"))
    .reduce((n, b) => n + b.querySelectorAll("[data-pdxtree-issue]").length, 0);
const bandTop = GEO.boxTop + GEO.navH;

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the funnel has three voices, and they do not blur");
// ═════════════════════════════════════════════════════════════════════════════
{
  // STEP ONE — the broad face. A topic name, a count of issues, and state words
  // that describe the rows underneath. Nothing about any single issue.
  const faces = BRANCHES.map((b) => faceOf(b)).filter(Boolean);
  eq(faces.length, BRANCHES.length, "every branch carries exactly one face control");
  const leafLabels = new Set(
    TREE_EL.querySelectorAll(".pdxtree-leaf").map((l) => (l.querySelector(".pdxtree-name") || {}).textContent),
  );
  faces.forEach((f) => {
    const txt = f.textContent;
    lacks(txt, "Said:", "a closed branch face prints no stated position");
    lacks(txt, "Record:", "…and no record line");
    eq(f.querySelectorAll(".pdxtree-pct").length, 0, "…and carries no percentage");
    eq(f.querySelectorAll(".pdxtree-cue").length, 0, "…and no per-issue alignment cue");
    eq(f.querySelectorAll(".pdxtree-pat").length, 0, "…and no Record slot of its own");
    ok(/^\d+ issues?$/.test((f.querySelector(".pdxtree-bn") || {}).textContent || ""),
      "…while still saying how many issues it holds, in figures");
    ok(f.querySelectorAll(".pdxtree-bsumbit").length > 0,
      "…and describing them in the bands' own words");
    let borrowed = "";
    leafLabels.forEach((lb) => { if (lb && lb.length > 8 && txt.indexOf(lb) !== -1) borrowed = lb; });
    eq(borrowed, "", "…and no sub-topic's own name on the closed face");
    has(f.getAttribute("aria-controls") || "", "-p-", "…and it names the panel it controls");
  });
  // STEP TWO — the precise leaf. Said, Record, and the depth the record is drawn
  // from, on the row itself, so a reader can pick WHICH ONE to open.
  const leaves = TREE_EL.querySelectorAll(".pdxtree-leaf");
  ok(leaves.length >= 5, `the fixture rendered leaves to choose between (${leaves.length})`);
  let withSaid = 0, withRecord = 0, withDepth = 0, withCue = 0, withPct = 0, only = 0;
  leaves.forEach((l) => {
    if (l.querySelector(".pdxtree-said")) withSaid++;
    if (l.querySelector(".pdxtree-pat")) withRecord++;
    if (l.querySelector(".pdxtree-depth")) withDepth++;
    if (l.querySelector(".pdxtree-cue")) withCue++;
    if (l.querySelector(".pdxtree-pct")) withPct++;
    if (l.getAttribute("data-pdxtree-only") === "1") only++;
  });
  eq(withSaid, leaves.length, "every leaf carries the Said slot");
  eq(withRecord, leaves.length, "…and the Record slot, which is never blank");
  ok(withDepth > 0, `…and prints the depth where there is a file (${withDepth})`);
  ok(withCue > 0, `…and the alignment cue where both halves exist (${withCue})`);
  ok(withPct > 0, `…and a percentage where Direction Match scored the issue (${withPct})`);
  eq(TREE_EL.querySelectorAll(".pdxtree-pct").length, withPct,
    "…and every percentage on this surface sits on a leaf, never anywhere else");
  // STEP THREE — the dossier, and only the dossier. One control per leaf, so
  // nothing on the row can steal the tap that opens the full report.
  leaves.forEach((l) => {
    eq(l.querySelectorAll("button").length, 1, "a leaf carries exactly one control");
    eq(l.querySelectorAll("a").length, 0, "…and no second door beside it");
  });
  // And no fourth surface anywhere in the module: no route, no history entry, no
  // second report page.
  const SRC_TREE = SRC.get(TREE);
  lacks(SRC_TREE, "pushState", "the module writes no history entry");
  lacks(SRC_TREE, "location.href =", "…and navigates nowhere");
  lacks(SRC_TREE, "location.assign", "…by any spelling");
  eq((SRC_TREE.match(/PDXConsistency\.openGap|CS\.openGap\(/g) || []).length, 2,
    "the dossier is reached through one guarded call to the shared entry, named once beside it");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · a branch really opens, really closes, one at a time on a phone");
// ═════════════════════════════════════════════════════════════════════════════
{
  // ── THE REGRESSION THIS SECTION EXISTS FOR ────────────────────────────────
  // The tree's ROOT records the active view in data-pdxtree-filter, and the
  // filter CHIPS carry the same attribute. An unqualified closest() walking up
  // from a branch face therefore finds the root, and the handler answered every
  // tap in the tree — expand, collapse, leaf — by re-rendering the view it was
  // already in. That is the "tapping a topic does nothing" report. The collision
  // is asserted here rather than assumed, so the fix cannot quietly become
  // unnecessary and stay in the file, or become necessary again unnoticed.
  const first = BRANCHES[0], last = BRANCHES[BRANCHES.length - 1];
  eq(faceOf(first).closest("[data-pdxtree-filter]"), TREE_EL,
    "the root does answer to the chip attribute — the collision is real");
  eq(faceOf(first).closest("button[data-pdxtree-filter]"), null,
    "…and no CHIP sits above a branch face, which is what the handler must ask");
  has(SRC.get(TREE), "closest('button[data-pdxtree-filter]')",
    "…so the chip handler qualifies its selector to the control, not the state");
  const kFirst = first.getAttribute("data-pdxtree-branch");
  const kLast = last.getAttribute("data-pdxtree-branch");
  // WALL 4, IN A REAL DOM. The tree mounts as the map: every core shut, not one
  // issue row on the screen, and every panel genuinely hidden rather than merely
  // collapsed. The reader's first move is choosing a topic.
  eq(openKeys().length, 0, "the tree mounts with every branch closed");
  eq(onScreenLeaves(), 0, "…so no issue row is on the screen before one is opened");
  eq([...BRANCHES].filter((b) => !b.querySelector(".pdxtree-panel").hasAttribute("hidden")).length,
     0, "…and no panel is left revealed");
  ok(BRANCHES.length <= (A.CORE_NATIONAL_ISSUES || []).length + 1,
    `…across at most 13 cores + Other (${BRANCHES.length} rows)`);
  ok(TREE_EL.querySelectorAll("[data-pdxtree-issue]").length > BRANCHES.length,
    "…while the issue rows themselves are all in the document, waiting behind a core");

  // ── DESKTOP: nothing is closed for you ────────────────────────────────────
  PHONE = false;
  BOX.scrollTop = 0;
  if (openKeys().indexOf(kFirst) === -1) tap(doc, faceOf(first));
  const beforeDesktop = openKeys().length;
  const ev = tap(doc, faceOf(last));
  eq(ev.defaultPrevented, true, "the toggle consumes the tap rather than letting it fall through");
  ok(openKeys().indexOf(kLast) !== -1, "tapping a closed branch opens it");
  eq(openKeys().length, beforeDesktop + 1, "…and on a wide viewport nothing else is closed");
  eq(faceOf(last).getAttribute("aria-expanded"), "true", "…with aria-expanded following the state");
  eq(last.querySelector(".pdxtree-panel").hasAttribute("hidden"), false,
    "…and the panel it controls really is revealed");

  // Tapping the open branch closes it, and closing is never exclusive.
  tap(doc, faceOf(last));
  ok(openKeys().indexOf(kLast) === -1, "tapping an open branch closes it");
  eq(faceOf(last).getAttribute("aria-expanded"), "false", "…and says so");
  eq(last.querySelector(".pdxtree-panel").hasAttribute("hidden"), true, "…and hides the panel again");

  // ── PHONE: exactly one open branch, always ────────────────────────────────
  PHONE = true;
  tap(doc, faceOf(first));
  if (openKeys().indexOf(kFirst) === -1) tap(doc, faceOf(first));
  eq(openKeys().join(","), kFirst, "on a phone the tapped branch is the only one open");
  eq(onScreenLeaves(), first.querySelectorAll("[data-pdxtree-issue]").length,
    "…and the only issue rows on the screen are the ones filed under it");
  tap(doc, faceOf(last));
  eq(openKeys().join(","), kLast, "…and opening another closes the first");
  eq(onScreenLeaves(), last.querySelectorAll("[data-pdxtree-issue]").length,
    "…taking its issue rows off the screen with it, so one topic is open at a time");
  eq(faceOf(first).getAttribute("aria-expanded"), "false", "…which the closed face announces");
  tap(doc, faceOf(last));
  eq(openKeys().length, 0, "…and a reader may collapse the tree entirely");

  // A tap on the caret, the title or the count is a tap on the topic row: the
  // face is one control, not three targets with dead space between them.
  ["pdxtree-caret", "pdxtree-btitle", "pdxtree-bn"].forEach((cls) => {
    const bit = faceOf(last).querySelector("." + cls);
    if (!bit) return;
    const was = openKeys().length;
    tap(doc, bit);
    ok(openKeys().length !== was, `a tap on .${cls} works the branch, not nothing`);
  });
  // Bounded: a toggle that stops toggling is a failure, never a spin.
  for (let g = 0; openKeys().length && g <= BRANCHES.length; g++) {
    tap(doc, faceOf(TREE_EL.querySelector('[data-pdxtree-branch][data-pdxtree-open="1"]')));
  }
  eq(openKeys().length, 0, "…leaving the tree closed for the next section");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · opening a branch leaves it on the screen (the phone regression)");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The rule, first, as a rule — five numbers in, one scroll delta out.
  const D = T.revealDelta;
  const band = { viewTop: 140, viewBottom: 700 };
  eq(D({ faceTop: 300, faceBottom: 348, panelBottom: 400, ...band }), 0,
    "a branch already inside the band is not moved at all");
  eq(D({ faceTop: 100, faceBottom: 148, panelBottom: 200, ...band }), -48,
    "a face under the sticky rail is brought down to the top of the band");
  eq(D({ faceTop: 600, faceBottom: 648, panelBottom: 900, ...band }), 208,
    "a panel running past the bottom is pulled up until it fits");
  eq(D({ faceTop: 400, faceBottom: 448, panelBottom: 5000, ...band }), 252,
    "…but never so far that the face itself leaves the top of the band");
  eq(D({ faceTop: 400, faceBottom: 448, panelBottom: 5000, viewTop: 140, viewBottom: 140 }), 0,
    "a band with no height is not something to scroll into");
  eq(D({}), 0, "and an unmeasurable branch moves nothing");
  eq(D(null), 0, "…including one with no measurements at all");
  eq(T.REVEAL.navId, "pdx-profile-nav", "the rail the band subtracts is the profile's own jump rail");

  // Now the reported failure, rebuilt. A phone, a tall branch open at the top,
  // and a reader tapping a branch near the bottom of the list.
  PHONE = true;
  const first = BRANCHES[0], last = BRANCHES[BRANCHES.length - 1];
  tap(doc, faceOf(first));
  eq(openKeys().join(","), first.getAttribute("data-pdxtree-branch"),
    "the tall branch above is the one that is open");
  const wasContentTop = contentTop(last);
  BOX.scrollTop = wasContentTop + GEO.boxTop - 400;   // the tapped face sits mid-screen
  layout();
  eq(faceOf(last).getBoundingClientRect().top, 400, "…and the branch a reader is about to tap is in front of them");

  const scrollBefore = BOX.scrollTop;
  tap(doc, faceOf(last));
  eq(openKeys().join(","), last.getAttribute("data-pdxtree-branch"), "the tap opened the tapped branch");

  // Where the face WOULD be if the toggle only wrote the open state: the branch
  // above collapsed by a full panel height, so it is far off the top of the
  // screen — the tap that "does nothing".
  const naive = GEO.boxTop + contentTop(last) - scrollBefore;
  ok(naive < bandTop - 100,
    `the collapse-above problem is still real in this fixture (naive top ${naive})`);
  const now = faceOf(last).getBoundingClientRect().top;
  ok(now >= bandTop, `the opened branch is not under the sticky rail (top ${now})`);
  ok(now < GEO.boxBottom, `…and not below the fold either (top ${now})`);
  eq(now, bandTop + T.REVEAL.pad,
    "…it sits at the top of the visible band, because its panel is taller than the band");
  const panel = last.querySelector(".pdxtree-panel");
  ok(panel.getBoundingClientRect().top < GEO.boxBottom,
    "…and the issue list it just revealed starts on screen");

  // The other direction: a branch ABOVE the band is scrolled back to, not left
  // behind. Opening it lengthens the document below the reader instead.
  BOX.scrollTop = 2000;
  layout();
  const above = BRANCHES[0];
  ok(faceOf(above).getBoundingClientRect().top < bandTop, "the branch starts out above the band");
  tap(doc, faceOf(above));
  const back = faceOf(above).getBoundingClientRect().top;
  ok(back >= bandTop && back < GEO.boxBottom, `…and the tap brings it into view (top ${back})`);

  // A tree with nothing measurable — a print stylesheet, this sandbox before the
  // geometry was attached — still toggles. The reveal is a scroll position, and
  // a scroll position is the only thing it may cost.
  const bare = makeDoc();
  const W = boot({ doc: bare });
  seedInto(W);
  parse(W.PDXStanceTree.html(PID, { uid: "bare" }), bare.body);
  const bb = bare.body.querySelectorAll("[data-pdxtree-branch]");
  must(bb.length >= 2, "the unmeasured fixture rendered no branches");
  const bkey = bb[bb.length - 1].getAttribute("data-pdxtree-branch");
  tap(bare, bb[bb.length - 1].querySelector("[data-pdxtree-toggle]"));
  eq(bb[bb.length - 1].getAttribute("data-pdxtree-open"), "1",
    "a branch with no measurable geometry opens anyway");
  eq(bb[bb.length - 1].querySelector("[data-pdxtree-toggle]").getAttribute("aria-expanded"), "true",
    `…and announces it (${bkey})`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · a leaf opens the existing dossier, with a return address");
// ═════════════════════════════════════════════════════════════════════════════
const calls = [];
{
  // The dossier itself is consistency.js's; here it is a spy, because what this
  // file asserts is the CALL — which entry, which arguments, which return path —
  // not the sheet that entry mounts.
  const realOpen = CS.openGap;
  ok(typeof realOpen === "function", "the shared dossier entry exists to be called");
  CS.openGap = function (pid, key, opts) { calls.push({ pid, key, opts }); return true; };

  PHONE = true;
  const branch = BRANCHES[BRANCHES.length - 1];
  if (branch.getAttribute("data-pdxtree-open") !== "1") tap(doc, faceOf(branch));
  const leaf = branch.querySelector(".pdxtree-leaf");
  must(!!leaf, "the open branch holds no leaf to tap");
  const door = leaf.querySelector("[data-pdxtree-dos]");
  must(!!door, "the leaf carries no door");

  const before = calls.length;
  const ev = tap(doc, door);
  eq(calls.length, before + 1, "tapping a leaf opens the dossier — exactly once");
  eq(ev.defaultPrevented, true, "…and the tap is consumed, never left to fall through");
  const c = calls[calls.length - 1];
  must(!!c, "a leaf tap reached the dossier entry not at all — the door is dead");
  eq(c.pid, PID, "…for this politician");
  eq(c.key, leaf.getAttribute("data-pdxtree-issue"), "…and this issue, the one the row names");
  eq(c.opts.arrival, false, "…opened by a reader's tap, not by an arrival deep-link");
  eq(c.opts.origin, door.id, "…carrying the leaf's own id as the return address");
  ok(!!door.id, "…which is a real id, not an empty string");
  eq(doc.getElementById(c.opts.origin), door,
    "…and that address resolves back to the exact control that was tapped");

  // The label, the dot, the slots: a thumb lands on a child of the button far
  // more often than on the button itself.
  [".pdxtree-name", ".pdxtree-said", ".pdxtree-go"].forEach((sel) => {
    const bit = door.querySelector(sel);
    if (!bit) return;
    const n = calls.length;
    tap(doc, bit);
    eq(calls.length, n + 1, `a tap on ${sel} opens the same dossier`);
    eq(calls[calls.length - 1].opts.origin, door.id, `…with the same return address`);
  });

  // Every leaf in the tree is a door to its own issue — no row is decorative.
  const leaves = TREE_EL.querySelectorAll(".pdxtree-leaf");
  let doors = 0;
  leaves.forEach((l) => {
    const d = l.querySelector("[data-pdxtree-dos]");
    if (!d) return;
    doors++;
    eq(d.getAttribute("data-pdxtree-dos"), l.getAttribute("data-pdxtree-issue"),
      `${l.getAttribute("data-pdxtree-issue")}: the door opens its own row's issue`);
    eq(d.getAttribute("data-pdxtree-origin"), d.id, "…and returns to itself");
  });
  eq(doors, leaves.length, "every leaf is a door");
  // Pattern-only rows are doors too — the report behind them is the reason the
  // row was disclosed rather than dropped.
  const onlyRow = leaves.filter((l) => l.getAttribute("data-pdxtree-only") === "1")[0];
  if (onlyRow) {
    const n = calls.length;
    tap(doc, onlyRow.querySelector("[data-pdxtree-dos]"));
    eq(calls.length, n + 1, "a pattern-only row opens the dossier as well");
  }

  // Nowhere else. Opening the dossier changes no address and mounts no route.
  eq(A.location.href, "https://www.politidex.fyi/", "opening a dossier navigates nowhere");
  eq(A.location.hash, "", "…and leaves no hash route behind");

  // The executive profile the report named behaves the same way.
  const eDoc = makeDoc();
  const E = boot({ doc: eDoc });
  const eHtml = E.PDXStanceTree.html(EXEC, { uid: "ex" });
  must(!!eHtml, `${EXEC}: the tree produced no markup`);
  parse(eHtml, eDoc.body);
  const eBranches = eDoc.body.querySelectorAll("[data-pdxtree-branch]");
  must(eBranches.length >= 2, `${EXEC}: too few branches to test expansion`);
  E.matchMedia = () => ({ matches: true, addEventListener() {}, addListener() {} });
  const eCalls = [];
  E.PDXConsistency.openGap = (pid, key, opts) => { eCalls.push({ pid, key, opts }); return true; };
  const eTarget = eBranches[eBranches.length - 1];
  if (eTarget.getAttribute("data-pdxtree-open") !== "1") {
    tap(eDoc, eTarget.querySelector("[data-pdxtree-toggle]"));
  }
  eq(eTarget.getAttribute("data-pdxtree-open"), "1", `${EXEC}: a topic expands on a phone`);
  const eLeaf = eTarget.querySelector(".pdxtree-leaf");
  must(!!eLeaf, `${EXEC}: the open branch listed no issues`);
  ok(eTarget.querySelectorAll(".pdxtree-leaf").length >= 1,
    `${EXEC}: …and the branch shows the issues filed under it`);
  tap(eDoc, eLeaf.querySelector("[data-pdxtree-dos]"));
  eq(eCalls.length, 1, `${EXEC}: tapping an issue opens the dossier`);
  eq(eCalls[0].pid, EXEC, `${EXEC}: …for the profile on screen`);
  eq(eCalls[0].opts.origin, eLeaf.querySelector("[data-pdxtree-dos]").id,
    `${EXEC}: …with a return address that lands back on the row`);

  CS.openGap = realOpen;
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · a door that cannot open says so, and recovers");
// ═════════════════════════════════════════════════════════════════════════════
{
  const realOpen = CS.openGap;
  const branch = BRANCHES[BRANCHES.length - 1];
  if (branch.getAttribute("data-pdxtree-open") !== "1") tap(doc, faceOf(branch));
  const leaf = branch.querySelector(".pdxtree-leaf");
  const door = leaf.querySelector("[data-pdxtree-dos]");

  // 1 · the dossier declines to mount
  CS.openGap = () => false;
  const ev = tap(doc, door);
  eq(ev.defaultPrevented, true, "a failing door still consumes the tap");
  eq(leaf.getAttribute("data-pdxtree-failed"), "1", "…and the row is marked as failed");
  const note = leaf.querySelector(".pdxtree-fail");
  must(!!note, "the failed row printed no notice");
  eq(note.textContent, T.DOOR_FAIL, "…it prints the module's own failure sentence");
  eq(note.getAttribute("role"), "status", "…in a live region, so it is announced");
  has(T.DOOR_FAIL, "Nothing on this row has changed",
    "…and that sentence does not imply the issue holds nothing");

  // Tapping again does not stack notices.
  tap(doc, door);
  eq(leaf.querySelectorAll(".pdxtree-fail").length, 1, "a second failed tap adds no second notice");

  // 2 · the module that owns the dossier never loaded at all
  delete CS.openGap;
  const other = branch.querySelectorAll(".pdxtree-leaf")[1] || leaf;
  const od = other.querySelector("[data-pdxtree-dos]");
  tap(doc, od);
  eq(other.getAttribute("data-pdxtree-failed"), "1",
    "a missing dossier module fails the same way — visibly");

  // 3 · the dossier throws
  CS.openGap = () => { throw new Error("boom"); };
  const ev3 = tap(doc, od);
  eq(ev3.defaultPrevented, true, "a throwing dossier does not escape the handler");
  eq(other.getAttribute("data-pdxtree-failed"), "1", "…and the row still says so");

  // 4 · recovery — the row works the moment the dossier can
  const back = [];
  CS.openGap = (pid, key, opts) => { back.push({ pid, key, opts }); return true; };
  tap(doc, door);
  eq(back.length, 1, "the row opens the dossier again as soon as it is available");
  eq(leaf.hasAttribute("data-pdxtree-failed"), false, "…the failed mark is cleared");
  eq(leaf.querySelectorAll(".pdxtree-fail").length, 0, "…and the notice is removed");
  eq(leaf.querySelectorAll(".pdxtree-leaf").length, 0, "…without disturbing the row itself");
  eq(leaf.getAttribute("data-pdxtree-issue"), door.getAttribute("data-pdxtree-dos"),
    "…which still names its own issue");

  tap(doc, od);
  eq(other.hasAttribute("data-pdxtree-failed"), false, "…and so does the other row");
  CS.openGap = realOpen;
  ok(typeof CS.openGap === "function", "the real dossier entry is restored for the score check");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · nothing above touched a number");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Every tap in this file has now been dispatched: branches opened and closed,
  // leaves tapped, doors failed and recovered. The scored side of the product is
  // re-read HERE, after all of it, against a sandbox that never loaded the tree.
  ok(calls.length > 0, `the interaction above really happened (${calls.length} dossier opens)`);
  const rowsA = CS.issueRows(PID), rowsB = B.PDXConsistency.issueRows(PID);
  eq(rowsA.length, rowsB.length, "both sandboxes still model the same rows");
  const bk = {};
  rowsB.forEach((r) => { bk[r.key] = r; });
  let scored = 0;
  rowsA.forEach((a) => {
    const b = bk[a.key];
    ok(!!b, `${a.key}: the row exists in both sandboxes`);
    if (!b) return;
    eq(a.verdict.token, b.verdict.token, `${a.key}: the verdict token survived the interaction`);
    eq(a.verdict.score, b.verdict.score, `${a.key}: …and the score`);
    eq(a.tier, b.tier, `${a.key}: …and the tier`);
    eq(JSON.stringify(a.stance), JSON.stringify(b.stance), `${a.key}: …and the stated position`);
    if (typeof a.verdict.score === "number") scored++;
  });
  ok(scored > 0, "the fixture actually scores something for this to protect");
  eq(JSON.stringify(CS.verdictTally(PID)), JSON.stringify(B.PDXConsistency.verdictTally(PID)),
    "the verdict tally is byte-identical after every tap");
  eq(JSON.stringify(CS.profileCounts(PID)), JSON.stringify(B.PDXConsistency.profileCounts(PID)),
    "the counts object — the tree's only count source — is byte-identical");
  eq(JSON.stringify(A.PDXWordAction.read(PID)), JSON.stringify(B.PDXWordAction.read(PID)),
    "the pooled Word vs Action read is byte-identical");
  eq(JSON.stringify(CS.issueRows(EXEC).map((r) => r.verdict)),
     JSON.stringify(B.PDXConsistency.issueRows(EXEC).map((r) => r.verdict)),
    `${EXEC}: the executive profile's verdicts are byte-identical too`);

  // The interaction layer added this pass touches a scroll position, an aria
  // attribute and a failure notice. Nothing in it reaches a scoring input.
  const SRC_TREE = SRC.get(TREE);
  // Comments stripped: this asks what the code READS, and the prose beside it is
  // free to say the word "score" as often as it needs to.
  const code = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const REVEAL_BLOCK = code(SRC_TREE.slice(
    SRC_TREE.indexOf("var REVEAL ="), SRC_TREE.indexOf("var _bound = false;")));
  must(REVEAL_BLOCK.length > 500, "the reveal/door block moved — this probe is stale");
  ["issueRows", "recordPattern", "profileCounts", "verdictTally", "PDXWordAction",
   "score", "pct", "floor", "MIN_"].forEach((id) =>
    lacks(REVEAL_BLOCK, id, `the reveal and door code reads no scoring surface (${id})`));
  const HANDLER = code(SRC_TREE.slice(SRC_TREE.indexOf("// The branch toggle."),
                                      SRC_TREE.indexOf("}, false);")));
  ["score", "pct", "verdict", "profileCounts"].forEach((id) =>
    lacks(HANDLER, id, `the toggle and door handler computes nothing scored (${id})`));
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the tap targets are real targets");
// ═════════════════════════════════════════════════════════════════════════════
{
  const CSS = R("stance-tree.css");
  // Every declaration block whose selector list mentions this class, comments
  // stripped. Crude on purpose — the question here is "which rules mention it",
  // not "what does it compute to".
  const NAKED = CSS.replace(/\/\*[\s\S]*?\*\//g, "");
  const block = (cls) => {
    const out = [];
    const re = /([^{}]*)\{([^{}]*)\}/g;
    let m;
    while ((m = re.exec(NAKED)) !== null) {
      const sels = m[1].split(",").map((x) => x.trim());
      if (sels.some((x) => new RegExp("\\" + cls + "(?![\\w-])").test(x))) out.push(m[2]);
    }
    return out.join("\n");
  };
  const face = block(".pdxtree-face"), bface = block(".pdxtree-bface");
  must(!!face && !!bface, "the leaf and branch face rules are no longer findable in the stylesheet");
  ok(/min-height:\s*44px/.test(bface), "a topic row is at least 44px tall — a thumb target, not a link");
  ok(/min-height:\s*44px/.test(face), "…and so is a leaf row");
  ok(/touch-action:\s*manipulation/.test(bface),
    "…the topic row opts out of double-tap zoom, so the expand does not wait 300ms for it");
  ok(/touch-action:\s*manipulation/.test(face), "…and so does the leaf");
  ok(/\.pdxtree-fail\s*\{/.test(CSS), "the failure notice has a visible skin of its own");
  ok(/data-pdxtree-failed="1"/.test(CSS), "…and the failed row is marked visually, not only in the DOM");
  // The phone rule keeps both floors at the breakpoint the module tests for.
  const phoneAt = CSS.indexOf("max-width: 639px");
  ok(phoneAt !== -1, "the stylesheet still keys off the module's own phone breakpoint");
  ok(CSS.slice(phoneAt).indexOf("min-height: 44px") !== -1,
    "…and the 44px floor survives into the phone media query");
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · the filter chips still re-render, and the tree still works after");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Qualifying the chip selector is the fix; this is the other half of it. A chip
  // must still replace the block, and the block it leaves behind must still
  // expand and still open a dossier — a re-rendered tree is the state a reader
  // spends most of their time in.
  const fDoc = makeDoc();
  const F = boot({ doc: fDoc });
  seedInto(F);
  F.matchMedia = () => ({ matches: true, addEventListener() {}, addListener() {} });
  const host = new El("div");
  fDoc.body.appendChild(host);
  parse(F.PDXStanceTree.html(PID, { uid: "fl" }), host);
  const root0 = host.querySelector(".pdxtree");
  must(!!root0, "the filter fixture rendered no tree");
  const chip = host.querySelectorAll("button[data-pdxtree-filter]")
    .filter((c) => c.getAttribute("data-pdxtree-filter") !== "all")[0];
  must(!!chip, "the tree rendered no narrowing chip to press");
  const key = chip.getAttribute("data-pdxtree-filter");

  const ev = tap(fDoc, chip);
  eq(ev.defaultPrevented, true, "a chip consumes its own tap");
  eq(root0._replaced, true, "…and re-renders the block in place");
  const root1 = host.querySelector(".pdxtree");
  must(!!root1 && root1 !== root0, "the re-render left no tree behind");
  eq(root1.getAttribute("data-pdxtree-filter"), key, "…in the view the chip names");
  ok(root1.querySelectorAll(".pdxtree-leaf").length > 0,
    `the ${key} view still lists rows to open`);

  // …and the re-rendered block is a working tree, not a picture of one.
  const bs = root1.querySelectorAll("[data-pdxtree-branch]");
  if (bs.length) {
    const b = bs[bs.length - 1];
    const was = b.getAttribute("data-pdxtree-open");
    tap(fDoc, b.querySelector("[data-pdxtree-toggle]"));
    ok(b.getAttribute("data-pdxtree-open") !== was,
      "a branch inside the re-rendered tree still expands");
  }
  const opens = [];
  F.PDXConsistency.openGap = (pid, k, opts) => { opens.push({ pid, k, opts }); return true; };
  const anyLeaf = root1.querySelector(".pdxtree-leaf [data-pdxtree-dos]");
  must(!!anyLeaf, "the re-rendered tree has no door to tap");
  tap(fDoc, anyLeaf);
  eq(opens.length, 1, "…and a leaf inside it still opens the dossier");
  eq(opens[0].opts.origin, anyLeaf.id, "…with its return address intact");

  // Back to the full set, through the chip that says so.
  const back = host.querySelectorAll('button[data-pdxtree-filter="all"]')[0];
  if (back) {
    tap(fDoc, back);
    eq(host.querySelector(".pdxtree").getAttribute("data-pdxtree-filter"), "all",
      "…and the way back to every issue still works");
  }
}

// ═════════════════════════════════════════════════════════════════════════════
if (failures.length) {
  console.error(`\n✗ topic gateway: ${failures.length} failure(s)`);
  failures.forEach((f) => console.error("  · " + f));
  process.exit(1);
}
console.log(`✓ topic gateway: all ${passed} assertions passed — expand, list, open the dossier, come back`);
