#!/usr/bin/env node
/**
 * test-issue-visual-pass.mjs — /issue/<key> reads as a page, not a stack of navy
 * ─────────────────────────────────────────────────────────────────────────────
 * The page worked and closed. It did not READ. Every row was the same card at the
 * same weight, so the one fact that decides how a row should be read — is this act
 * the SUBJECT of the issue, or did the issue ride inside it — was set in 0.58rem
 * muted uppercase, smaller than the roll line beneath it. The roll line in turn sat
 * at body weight, indistinguishable from the scope sentence. And the member block
 * could say "Checking the formal record…" for as long as the overlay stayed open,
 * because the page rendered exactly twice — loading, then loaded — and the
 * formal-record lane lands after both.
 *
 * WHAT IS FENCED HERE
 *   1. The header, which was already right: the chip takes its colour from the
 *      issue's own entry, and the counts line prints counts and no percentage.
 *   2. The measure row's hierarchy, read off the sheet the module actually
 *      injects: number and title are the largest type in the row, the lane is a
 *      bordered pill rather than fine print, and the roll line is a step above the
 *      smallest thing in the row rather than level with it.
 *   3. Subject vs rider as a shape — the issue colour on the left edge of a
 *      subject row, a flat card for a rider — and riders still printed in full.
 *   4. The member block: the tree's own record vocabulary, a lane still in flight
 *      marked as a wait rather than a finding, and the warm repaint that clears it.
 *      No rank, no Direction Match, all four groups kept.
 *   5. The panel: a width cap, a height cap, and real padding — with the close
 *      control left exactly as it shipped.
 *   6. Mutation. Each fix is broken on a copy and the matching assertion has to
 *      fail.
 *
 * ACCEPTANCE: /issue/housing — H.R. 6644 reads as the subject of the page, the
 * Utah housing bills scan as a list, riders look like riders, close still works.
 *
 *   node scripts/test-issue-visual-pass.mjs
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

const IP_SRC = R("issue-page.js");
const TREE_SRC = R("stance-tree.js");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);
const has = (hay, needle, msg) => ok(String(hay).includes(needle), `${msg} — missing ${JSON.stringify(needle)}`);
const hasNot = (hay, needle, msg) => ok(!String(hay).includes(needle), `${msg} — found ${JSON.stringify(needle)}`);
const section = (t) => console.log(`\n  · ${t}`);

// ═══════════════ a DOM that can be repainted ════════════════════════════════
// The warm repaint reaches for the member block by selector and replaces it
// through outerHTML, so both of those are modelled for real: a harness whose
// querySelector answers null would pass this file without ever running the fix.
function makeDom() {
  const nodes = {};
  const listeners = { document: {}, window: {} };

  function el(tag) {
    const node = {
      tagName: String(tag || "div").toUpperCase(),
      attrs: {}, children: [], parent: null,
      hidden: false, textContent: "", style: {},
      _classes: new Set(),
      getAttribute(n) { return Object.prototype.hasOwnProperty.call(this.attrs, n) ? this.attrs[n] : null; },
      setAttribute(n, v) { this.attrs[n] = String(v); },
      removeAttribute(n) { delete this.attrs[n]; },
      hasAttribute(n) { return Object.prototype.hasOwnProperty.call(this.attrs, n); },
      appendChild(c) { if (c) { c.parent = this; this.children.push(c); } return c; },
      contains(n) { for (let p = n; p; p = p.parent) if (p === this) return true; return false; },
      matches(sel) { return matchOne(this, sel); },
      closest(sel) { for (let p = this; p; p = p.parent) if (p.matches && p.matches(sel)) return p; return null; },
      addEventListener() {}, removeEventListener() {},
      querySelector(sel) { return queryIn(this, sel); },
      querySelectorAll(sel) { return queryAllIn(this, sel); },
      scrollIntoView() {}, click() {}, blur() {},
      focus() { doc.activeElement = this; },
      classList: null,
    };
    node.classList = {
      add: (c) => { node._classes.add(c); },
      remove: (c) => { node._classes.delete(c); },
      contains: (c) => node._classes.has(c),
    };
    Object.defineProperty(node, "id", {
      get() { return node._id || ""; },
      set(v) { node._id = String(v); if (node._id) nodes[node._id] = node; },
    });
    let cn = "";
    Object.defineProperty(node, "className", {
      get() { return cn; },
      set(v) { cn = String(v); node._classes = new Set(cn.split(/\s+/).filter(Boolean)); },
    });
    Object.defineProperty(node, "innerHTML", {
      get() { return node._html || ""; },
      set(v) { node._html = String(v); node.children = []; parseInto(node, node._html); },
    });
    // outerHTML replaces this node in its parent with whatever the string parses
    // to. The member block is swapped this way, so the harness has to be able to
    // find the REPLACEMENT afterwards — that is the whole point of the assertion.
    Object.defineProperty(node, "outerHTML", {
      get() { return node._html || ""; },
      set(v) {
        const p = node.parent;
        if (!p) return;
        const box = el("div");
        box.innerHTML = String(v);
        const i = p.children.indexOf(node);
        const kids = box.children.slice();
        kids.forEach((k) => { k.parent = p; });
        if (i === -1) p.children = p.children.concat(kids);
        else p.children = p.children.slice(0, i).concat(kids, p.children.slice(i + 1));
        node.parent = null;
      },
    });
    return node;
  }

  function parseInto(root, html) {
    const stack = [root];
    const tagRe = /<(\/?)([\w-]+)((?:\s+[\w-]+(?:="[^"]*")?)*)\s*(\/?)>/g;
    const VOID = { br: 1, hr: 1, img: 1, input: 1, meta: 1, link: 1 };
    let m, last = 0;
    while ((m = tagRe.exec(html))) {
      const text = html.slice(last, m.index);
      if (text && stack.length) stack[stack.length - 1].textContent += text;
      last = tagRe.lastIndex;
      if (m[1] === "/") { if (stack.length > 1) stack.pop(); continue; }
      const child = el(m[2]);
      const attrRe = /([\w-]+)(?:="([^"]*)")?/g;
      let a;
      while ((a = attrRe.exec(m[3] || ""))) {
        if (a[1] === "class") child.className = a[2] || "";
        else if (a[1] === "id") child.id = a[2] || "";
        else child.attrs[a[1]] = a[2] === undefined ? "" : a[2];
      }
      child._html = "";
      stack[stack.length - 1].appendChild(child);
      if (!m[4] && !VOID[m[2].toLowerCase()]) stack.push(child);
    }
    const tail = html.slice(last);
    if (tail && stack.length) stack[stack.length - 1].textContent += tail;
  }

  // One simple-selector matcher: #id, .class, tag, [attr] and [attr="value"].
  function matchOne(node, sel) {
    return String(sel).trim().split(/(?=[.#[])/).every((part) => {
      if (!part) return true;
      if (part.charAt(0) === "#") return node.id === part.slice(1);
      if (part.charAt(0) === ".") return node._classes.has(part.slice(1));
      if (part.charAt(0) === "[") {
        const m = /^\[([\w-]+)(?:="([^"]*)")?\]$/.exec(part);
        if (!m) return false;
        if (m[2] === undefined) return node.hasAttribute(m[1]);
        return node.getAttribute(m[1]) === m[2];
      }
      return node.tagName === part.toUpperCase();
    });
  }
  function descend(roots, sel) {
    const out = [];
    roots.forEach((r) => (function walk(n) {
      (n.children || []).forEach((c) => { if (matchOne(c, sel)) out.push(c); walk(c); });
    })(r));
    return out;
  }
  function queryAllIn(root, sel) {
    let cur = [root];
    String(sel).trim().split(/\s+/).forEach((part) => { cur = descend(cur, part); });
    return cur;
  }
  function queryIn(root, sel) { const a = queryAllIn(root, sel); return a.length ? a[0] : null; }

  const doc = {
    readyState: "complete", title: "PolitiDex", activeElement: null,
    getElementById(id) { return nodes[id] || null; },
    createElement(t) { return el(t); },
    addEventListener(t, fn) { (listeners.document[t] || (listeners.document[t] = [])).push(fn); },
    removeEventListener() {},
    querySelector(sel) { return queryIn(doc.body, sel) || queryIn(doc.head, sel); },
    querySelectorAll(sel) { return queryAllIn(doc.body, sel); },
    head: el("head"), body: el("body"), documentElement: el("html"),
  };
  doc.body.id = "__body";
  doc.activeElement = doc.body;

  const win = {
    document: doc,
    addEventListener(t, fn) { (listeners.window[t] || (listeners.window[t] = [])).push(fn); },
    removeEventListener() {},
    setTimeout(fn) { try { fn(); } catch (_) {} return 0; }, clearTimeout() {},
    requestAnimationFrame() { return 0; },
    matchMedia() { return { matches: false, addEventListener() {}, addListener() {} }; },
    getComputedStyle() { return { getPropertyValue() { return ""; } }; },
    location: { href: "https://www.politidex.fyi/", pathname: "/", search: "", hash: "", origin: "https://www.politidex.fyi" },
    history: { pushState(s, t, u) { win.location.pathname = String(u); }, replaceState(s, t, u) { win.location.pathname = String(u); } },
    navigator: { userAgent: "node" },
    fetch() { return Promise.reject(new Error("test-issue-visual-pass: no network")); },
    console: { log() {}, warn() {}, error() {}, info() {} },
    CustomEvent: class { constructor(t, o) { this.type = t; Object.assign(this, o || {}); } },
    ISSUE_MAP: { housing: { label: "🏠 Housing Affordability" } },
    PDXIssueColors: { styleFor: (k) => (k === "housing" ? "--pdx-ic:#f59e0b" : "") },
  };
  win.window = win; win.self = win;
  win.__t = { nodes, listeners, el };
  return win;
}

// A node the repaint built has no source string behind it — it was parsed into a
// tree — so the tree is walked back into markup for the assertions. Attribute
// presence and text are what is claimed, and both survive the round trip.
function dump(n) {
  if (!n) return "";
  const tag = String(n.tagName || "div").toLowerCase();
  const attrs = (n.className ? ` class="${n.className}"` : "") +
    Object.keys(n.attrs).map((k) => ` ${k}="${n.attrs[k]}"`).join("");
  return `<${tag}${attrs}>` + (n.textContent || "") +
    (n.children || []).map(dump).join("") + `</${tag}>`;
}

function boot(src) {
  const win = makeDom();
  vm.runInContext(src || IP_SRC, vm.createContext(win), { filename: "issue-page.js" });
  if (!win.PDXIssuePage) throw new Error("PDXIssuePage did not publish");
  return win;
}
// The sheet the module actually injects, not the source array — the claims below
// are cascade claims and a joined-string transcription would be a second copy.
function sheetOf(win) {
  win.PDXIssuePage.open("housing");
  const st = win.document.head.children.filter((n) => n.id === "pdxip-css")[0];
  return st ? String(st.textContent) : "";
}
// The declared value of one property inside one rule of that sheet.
function ruleOf(css, selector) {
  const i = css.indexOf(selector + "{");
  if (i === -1) return null;
  const j = css.indexOf("}", i);
  return j === -1 ? null : css.slice(i + selector.length + 1, j);
}
function propOf(css, selector, prop) {
  const body = ruleOf(css, selector);
  if (body == null) return null;
  const m = new RegExp("(?:^|;)\\s*" + prop + "\\s*:\\s*([^;]+)").exec(body);
  return m ? m[1].trim() : null;
}
const rem = (v) => { const m = /^([\d.]+)rem$/.exec(String(v || "")); return m ? parseFloat(m[1]) : NaN; };

const ROWS = [
  { id: 1, number: "H.R. 6644", shortTitle: "Housing Affordability Act", chamber: "house",
    congress: "119", primaryIssueKeys: ["housing"], issueKeys: ["housing"], primaryIssue: "housing",
    lastRoll: { chamber: "house", voteDate: "2026-04-14", yea: 219, nay: 205, result: "Passed" },
    rollcallCount: 1 },
  { id: 2, number: "H.B. 462", shortTitle: "Omnibus Appropriations", chamber: "utah house",
    externalIds: { utahSession: "2026GS" }, primaryIssueKeys: ["taxes"], issueKeys: ["housing"],
    primaryIssue: "taxes", rollcallCount: 0 },
];

// ═══════════════ 1 · the header, already right ══════════════════════════════
section("1 · the header: the issue's own colour, and counts");
{
  const win = boot();
  const IP = win.PDXIssuePage;
  const head = IP.headHtml("housing", IP.counts([{}, {}], []));
  has(head, "--pdx-ic:#f59e0b", "the header chip does not carry the issue's own colour");
  const chip = head.indexOf('class="pdxip-chip"');
  const tint = head.indexOf("--pdx-ic:#f59e0b");
  ok(chip !== -1 && tint > chip, "the colour is not on the issue chip");
  ok(!/\d\s*%/.test(head), "a percentage was printed in the header");
  has(head, "2 measures on file", "the counts line does not count measures");
  hasNot(IP.countsLine(IP.counts([], [])), "%", "the counts line grew a ratio");
}

// ═══════════════ 2 · the measure row's hierarchy ════════════════════════════
section("2 · the measure row: one loud line, a badge, then the facts");
{
  const win = boot();
  const css = sheetOf(win);
  ok(css.length > 500, "no sheet was injected, so nothing below is a cascade claim");

  const num = rem(propOf(css, ".pdxip-num", "font-size"));
  const ttl = rem(propOf(css, ".pdxip-ttl", "font-size"));
  const lane = rem(propOf(css, ".pdxip-lane-t", "font-size"));
  const meta = rem(propOf(css, ".pdxip-meta", "font-size"));
  ok([num, ttl, lane, meta].every((n) => !Number.isNaN(n)),
    `a row font-size is unreadable — num ${num}, ttl ${ttl}, lane ${lane}, meta ${meta}`);
  // THE LOUD LINE. Both halves of it are larger than everything else in the row.
  ok(num > meta && num > lane, `the bill number is not the loud line — ${num} vs meta ${meta}`);
  ok(ttl > meta && ttl > lane, `the short title is not the loud line — ${ttl} vs meta ${meta}`);
  // …and the roll line is a step above the smallest thing in the row rather than
  // level with the scope prose, which is what it used to be.
  ok(meta > rem(propOf(css, ".pdxip-note", "font-size")),
    "the roll line is no heavier than the page's fine print");
  const mw = parseInt(propOf(css, ".pdxip-meta", "font-weight") || "400", 10);
  ok(mw >= 600, `the roll line is not weighted — font-weight ${mw}`);

  // A REAL BADGE. Border, radius and padding are what make it one; 0.58rem muted
  // uppercase text with none of the three is fine print.
  const laneBody = ruleOf(css, ".pdxip-lane-t") || "";
  has(laneBody, "border:", "the lane label has no border, so it is not a badge");
  has(laneBody, "border-radius:", "the lane label has no radius, so it is not a badge");
  has(laneBody, "padding:", "the lane label has no padding, so it is not a badge");
  ok(lane > 0.6, `the lane badge is still fine print at ${lane}rem`);

  // ORDER, IN THE MARKUP: number, title, lane, roll line.
  const IP = win.PDXIssuePage;
  const rows = IP.sortRows(IP.rowsFrom(ROWS, "housing"));
  eq(rows.length, 2, "the two fixture measures did not both make a row");
  const subj = IP.rowHtml(rows[0]);
  const iNum = subj.indexOf("pdxip-num");
  const iTtl = subj.indexOf("pdxip-ttl");
  const iLane = subj.indexOf("pdxip-lane-t");
  const iMeta = subj.indexOf("pdxip-meta");
  ok(iNum > -1 && iTtl > iNum && iLane > iTtl && iMeta > iLane,
    "the row order is not number → title → lane badge → roll line");
  has(subj, "H.R. 6644", "the subject row does not print its number");
  has(subj, "Housing Affordability Act", "the subject row does not print its short title");
  has(subj, "219–205", "the subject row does not print the Yea–Nay");

  // SUBJECT VS RIDER, AS A SHAPE.
  has(subj, 'data-pdxip-lane="subject"', "the subject row does not declare its lane");
  const rider = IP.rowHtml(rows[1]);
  has(rider, 'data-pdxip-lane="rode"', "the rider row does not declare its lane");
  const sRule = ruleOf(css, '.pdxip-row[data-pdxip-lane="subject"]>.pdxip-open') || "";
  has(sRule, "border-left:", "a subject row has no left edge of its own");
  has(sRule, "var(--pdx-ic", "the subject row's left edge is not the issue's colour");
  const rRule = ruleOf(css, '.pdxip-row[data-pdxip-lane="rode"]>.pdxip-open') || "";
  ok(rRule.length > 0, "the rider lane has no rule of its own, so it cannot stay flat");
  hasNot(rRule, "var(--pdx-ic", "the rider row borrowed the issue's colour");
  hasNot(rRule, "border-left:", "the rider row grew a left edge of its own");
  hasNot(rRule, "display:none", "a rider row was hidden");

  // The colour has to REACH the row, and it arrives by inheritance from the
  // section — a left edge keyed to a custom property nobody set is no edge.
  const list = IP.listHtml(rows, "housing");
  const iSect = list.indexOf('data-pdxip-list="1"');
  const iTint = list.indexOf("--pdx-ic:#f59e0b");
  ok(iSect > -1 && iTint > iSect && iTint < list.indexOf("<ol"),
    "the issue colour is not set on the section the rows inherit from");
  // RIDERS ARE NOT HIDDEN. Both measures, both labels, in the list.
  has(list, "H.B. 462", "the rider was dropped from the list");
  has(list, IP.RODE, "the rider's lane label was dropped");
  has(list, IP.SUBJECT, "the subject's lane label was dropped");
}

// ═══════════════ 3 · the member block ═══════════════════════════════════════
section("3 · the member block: the tree's words, and a wait that ends");
function roster(win, leaf) {
  win.CMP_DATA = { a_yes: { name: "Ada Yes" }, b_no: { name: "Bo No" } };
  win.PROFILES = {};
  win.ISSUE_STANCE_DATA = {
    a_yes: [{ topic: "Housing", issueKey: "housing", issueStance: "support" }],
    b_no: [{ topic: "Housing", issueKey: "housing", issueStance: "oppose" }],
  };
  win.PDXStanceTree = { leaf: leaf };
}
{
  const win = boot();
  const IP = win.PDXIssuePage;
  // THE TREE'S OWN VOCABULARY. The lead is the string stance-tree.js prints, and
  // the suffix is the phrase it prints beside it — `depth`, which this page used
  // to leave on the floor in favour of the tally behind it.
  has(TREE_SRC, "'<b>🏛 Record:</b> '", "stance-tree.js no longer leads its record slot this way");
  roster(win, () => ({ record: { state: "direction", label: "Advanced it 4 of the 5 times", depth: "5 votes", counts: "4 with, 1 against" } }));
  const rows = IP.peopleRows("housing");
  const ph = IP.peopleHtml(rows, "housing");
  has(ph, "<b>🏛 Record:</b> ", "the member row does not use the tree's record lead");
  has(ph, "Advanced it 4 of the 5 times", "the member row dropped the tree's label");
  has(ph, "5 votes", "the member row dropped the depth the tree prints beside that label");
  has(ph, "4 with, 1 against", "the member row dropped the tally behind it");
  ok(ph.indexOf("5 votes") < ph.indexOf("4 with, 1 against"),
    "depth and tally are not in the tree's order");
  hasNot(ph, "aria-busy", "a settled record line was marked as a wait");
  hasNot(ph, "is-warm", "a settled record line was styled as a wait");

  // NO RANK, NO DIRECTION MATCH.
  ok(!/\d\s*%/.test(ph), "a percentage reached the member block");
  hasNot(ph, "Direction Match", "Direction Match was printed on the member block");
  hasNot(ph, "Direction match", "Direction Match was printed on the member block");
  // All four groups are still the vocabulary, in the vocabulary's order.
  eq(IP.BUCKETS.map((b) => b.key).join(","), "supports,opposes,split,thin",
    "the member block's groups are no longer supports / opposes / split / thin");
}
{
  // A LANE STILL IN FLIGHT is a wait, not a finding.
  const win = boot();
  roster(win, () => ({ record: { state: "pending", label: "Checking the formal record…" } }));
  const ph = win.PDXIssuePage.peopleHtml(win.PDXIssuePage.peopleRows("housing"), "housing");
  has(ph, "Checking the formal record", "the pending lane says nothing at all");
  has(ph, 'aria-busy="true"', "a lane still loading is not announced as busy");
  has(ph, "is-warm", "a lane still loading is not set apart from a finished line");
  const css = sheetOf(win);
  ok((ruleOf(css, ".pdxip-p-pat.is-warm") || "").length > 0,
    "the waiting record line has no style of its own");
  // The backstop: a leaf that fills the label without filling the state is still
  // caught, because the label IS the sentence.
  const win2 = boot();
  roster(win2, () => ({ record: { label: "Checking the formal record…" } }));
  has(win2.PDXIssuePage.peopleHtml(win2.PDXIssuePage.peopleRows("housing"), "housing"),
    'aria-busy="true"', "a stateless pending leaf was printed as a finding");
}
{
  // …AND THE WAIT ENDS. The live overlay, driven: open, let the archive answer,
  // then fire the event the rest of the site repaints on.
  const win = boot();
  let warm = false;
  roster(win, () => ({
    record: warm
      ? { state: "direction", label: "Advanced it 4 of the 5 times", depth: "5 votes" }
      : { state: "pending", label: "Checking the formal record…" },
  }));
  // The paint index is the module's own offline read, so the live open below
  // renders a real measure list rather than the honest blank.
  win.PDX_BILLS_INDEX = ROWS;
  win.PDXIssuePage.open("housing");
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  const scroll = () => win.__t.nodes["pdx-ip-scroll"];
  has(dump(scroll()), "Checking the formal record",
    "the first paint of an unwarmed page does not say the lane is still loading");
  ok(!!scroll().querySelector('[data-pdxip-people="1"]'),
    "the member block is not in the rendered page, so it cannot be repainted");
  // The reader is standing on Ada Yes's row when the lane answers. The swap
  // destroys that element, so the row has to be handed back to them.
  const standing = scroll().querySelector('[data-pdxip-pid="a_yes"]');
  ok(!!standing, "the member rows did not render, so the focus claim below is untestable");
  if (standing) standing.focus();
  warm = true;
  (win.__t.listeners.window["pdx-consistency-warm"] || []).forEach((fn) => fn({ detail: { pid: "a_yes" } }));
  const focused = win.document.activeElement;
  ok(!!focused && focused.getAttribute("data-pdxip-pid") === "a_yes",
    "the repaint dropped the reader's focus out of the row they were on");
  ok(focused !== standing, "the member block was not actually replaced");
  const after = scroll().querySelector('[data-pdxip-people="1"]');
  ok(!!after, "the member block was lost in the repaint");
  const txt = dump(after);
  has(txt, "Advanced it 4 of the 5 times", "the warm lane never reached the member block");
  hasNot(txt, "Checking the formal record", "the caption outlived the lane it was waiting on");
  has(txt, "Ada Yes", "the repaint dropped the members");
  has(txt, "Bo No", "the repaint dropped a group");
  // The measure list is not refetched or rebuilt by a member-lane repaint.
  has(dump(scroll()), 'data-pdxip-list="1"', "the repaint took the measure list with it");
  has(dump(scroll()), "H.R. 6644", "the repaint took the measures with it");
  // And a warm event on a closed page is a no-op rather than a crash.
  win.PDXIssuePage.close();
  (win.__t.listeners.window["pdx-consistency-warm"] || []).forEach((fn) => fn({ detail: { pid: "a_yes" } }));
  ok(!win.PDXIssuePage.isOpen(), "a warm event reopened a closed page");
}

// ═══════════════ 4 · the panel ══════════════════════════════════════════════
section("4 · the panel: capped, padded, and the close control untouched");
{
  const css = sheetOf(boot());
  const panel = ruleOf(css, ".pdxip-panel") || "";
  has(panel, "width:min(", "the panel has no width cap");
  has(panel, "max-height:min(", "the panel has no height cap, so it can fill the viewport edge to edge");
  const pad = propOf(css, ".pdxip-scroll", "padding") || "";
  const first = rem(pad.split(/\s+/)[0]);
  ok(first >= 1.2, `the panel's content still starts at the border — padding ${pad}`);
  // THE CLOSE TARGET IS NOT A NEW CONTROL. Its rule is asserted verbatim: the
  // brief says the close already works and must not be restyled, so a change here
  // is a failure whether it looks better or not.
  has(css, ".pdxip-x{position:absolute;top:0.35rem;right:0.4rem;min-width:2.5rem;min-height:2.5rem;" +
    "background:none;border:0;color:#9fb4d4;font-size:1.35rem;line-height:1;cursor:pointer;z-index:2;}",
    "the close control was restyled");
  has(css, ".pdxip-overlay[hidden]{display:none;}", "the fix that makes close work was lost");
}

// ═══════════════ 5 · mutation ═══════════════════════════════════════════════
section("5 · each fix is load-bearing");
{
  const MUTANTS = [
    ["the subject row loses its issue-coloured left edge",
      (x) => x.replace("'.pdxip-row[data-pdxip-lane=\"subject\"]>.pdxip-open{',", "'.pdxip-x-dead{',"),
      (win) => {
        const css = sheetOf(win);
        return (ruleOf(css, '.pdxip-row[data-pdxip-lane="subject"]>.pdxip-open') || "").indexOf("var(--pdx-ic") === -1;
      }],
    ["the lane label goes back to fine print",
      (x) => x.replace("'font-weight:700;font-size:0.7rem;letter-spacing:0.08em;text-transform:uppercase;line-height:1.3;',",
                       "'font-weight:700;font-size:0.58rem;letter-spacing:0.08em;text-transform:uppercase;',"),
      (win) => rem(propOf(sheetOf(win), ".pdxip-lane-t", "font-size")) <= 0.6],
    ["the roll line goes back to body weight",
      (x) => x.replace("'.pdxip-meta{font-family:\\'Barlow Condensed\\',sans-serif;font-weight:600;font-size:0.84rem;',",
                       "'.pdxip-meta{font-size:0.74rem;',"),
      (win) => parseInt(propOf(sheetOf(win), ".pdxip-meta", "font-weight") || "400", 10) < 600],
    ["a loading lane is printed as a finding",
      (x) => x.replace("var pending = (rc.state === 'pending') || (String(rc.label) === LANE_WARM);",
                       "var pending = false;"),
      (win) => {
        roster(win, () => ({ record: { state: "pending", label: "Checking the formal record…" } }));
        return win.PDXIssuePage.peopleHtml(win.PDXIssuePage.peopleRows("housing"), "housing").indexOf("aria-busy") === -1;
      }],
    ["the issue colour never reaches the rows",
      (x) => x.replace("'<section class=\"pdxip-sect\" data-pdxip-list=\"1\"' + issueTint(key) + '>' +",
                       "'<section class=\"pdxip-sect\" data-pdxip-list=\"1\">' +"),
      (win) => {
        const IP = win.PDXIssuePage;
        return IP.listHtml(IP.sortRows(IP.rowsFrom(ROWS, "housing")), "housing").indexOf("--pdx-ic") === -1;
      }],
  ];
  for (const [name, mutate, broke] of MUTANTS) {
    const src = mutate(IP_SRC);
    if (src === IP_SRC) { failures.push(`mutation "${name}" did not change the source`); continue; }
    let caught = true;
    try { caught = broke(boot(src)); } catch (e) { caught = true; }
    ok(caught, `mutation survived: ${name}`);
  }
  // The warm repaint, removed: the caption becomes permanent again.
  {
    const src = IP_SRC.replace("window.addEventListener('pdx-consistency-warm', function () {",
                               "(function () {");
    let stuck = true;
    try {
      const win = boot(src);
      let warm = false;
      roster(win, () => ({
        record: warm ? { state: "direction", label: "Advanced it 4 of the 5 times" }
                     : { state: "pending", label: "Checking the formal record…" },
      }));
      win.PDX_BILLS_INDEX = ROWS;
      win.PDXIssuePage.open("housing");
      await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
      warm = true;
      (win.__t.listeners.window["pdx-consistency-warm"] || []).forEach((fn) => fn({ detail: {} }));
      stuck = win.__t.nodes["pdx-ip-scroll"].innerHTML.indexOf("Checking the formal record") > -1;
    } catch (e) { stuck = true; }
    ok(stuck, "mutation survived: the member block resolves without the warm repaint");
  }
}

if (failures.length) {
  console.error(`\n✗ issue visual pass — ${failures.length} failure(s):`);
  failures.forEach((f) => console.error("   · " + f));
  process.exit(1);
}
console.log(`\n✓ issue visual pass — ${passed} assertions passed`);
