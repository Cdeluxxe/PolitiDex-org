#!/usr/bin/env node
/**
 * test-issue-close-eye-wrap.mjs — the issue page closes; the Eye's bill row wraps
 * ─────────────────────────────────────────────────────────────────────────────
 * Two live faults, both of them the same shape: a rule that was written and then
 * never allowed to apply.
 *
 *   A · /issue/<key> COULD NOT BE CLOSED. close() ran in full — it set the
 *       overlay's `hidden` attribute, dropped the scroll lock and rewrote the
 *       address — and the reader still sat behind the backdrop. `hidden` is
 *       display:none in the UA sheet ONLY, and .pdxip-overlay's own
 *       `display:flex` beats a UA rule outright whatever the specificity, so
 *       nothing moved. The X did nothing, the dimmed page did nothing, and
 *       Escape — gated on `ov.hidden`, by then true — had switched itself off
 *       after the first attempt. Every other overlay in the app ships the
 *       `[hidden]` half of the pair (.pdx-act-overlay, .pdx-impact-overlay);
 *       this one did not.
 *
 *   B · THE EYE'S BILL ROW PAINTED OVER ITSELF. On H.R. 6644 the topic label
 *       ran straight across PASSED HOUSE. .pdx-eye-sub is an inline <span>, and
 *       overflow / text-overflow do not apply to inline boxes — so the nowrap sub
 *       line neither wrapped nor ellipsised, it simply drew on top of the badge
 *       pinned to its right. Clipping it would hide the collision, not resolve
 *       it, so the row wraps instead: title, number, then a wrapping strip of
 *       topic chips followed by the status badge.
 *
 * WHAT IS FENCED HERE
 *   1. The CSS pair. `hidden` actually hides, in the injected sheet.
 *   2. One close(). X, backdrop, Escape and the router's back path all reach the
 *      same function; after it the overlay is gone, the lock is off, the address
 *      is the one the reader opened from, and focus is not left in a hidden tree.
 *   3. Escape survives a second open — the old gate could not.
 *   4. All three doors (bill letterhead chip, person-brief chip, ⓘ "See all
 *      bills") go through PDXIssuePage.open, so they close identically.
 *   5. The bill row's real render, driven through PDXEye.render('6644'): order is
 *      title → number → topic chips → status badge, topics are separate elements
 *      from the badge, and the row wraps rather than clipping.
 *   6. Mutation. The three load-bearing fixes are each broken on a copy and the
 *      matching assertion has to fail.
 *
 * ACCEPTANCE: open /issue/housing — X closes, the dimmed page closes, Escape
 * closes. Type 6644 — every chip is readable.
 *
 *   node scripts/test-issue-close-eye-wrap.mjs
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

const IP_SRC = R("issue-page.js");
const EYE_SRC = R("all-seeing-eye.js");
const HTML = R("index.html");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);
const has = (hay, needle, msg) => ok(String(hay).includes(needle), `${msg} — missing ${JSON.stringify(needle)}`);
const hasNot = (hay, needle, msg) => ok(!String(hay).includes(needle), `${msg} — found ${JSON.stringify(needle)}`);
const section = (t) => console.log(`\n  · ${t}`);
const die = (m) => { console.error(`✗ issue close / eye wrap: ${m}`); process.exit(1); };

// ═══════════════ a DOM real enough to answer "did it close?" ════════════════
// Attributes, classes, parentage, contains() and closest() are all modelled,
// because every claim in part A is a claim about one of them. innerHTML registers
// the ids and attributes of the tags assigned through it, which is how the
// overlay's own backdrop and X become clickable targets in this harness.
function makeDom(opts) {
  opts = opts || {};
  const nodes = {};
  const listeners = { document: {}, window: {} };
  const history = [];

  function el(tag) {
    const node = {
      tagName: String(tag || "div").toUpperCase(),
      attrs: {}, children: [], parent: null,
      hidden: false, className: "", textContent: "", style: {}, value: "",
      focused: false,
      _classes: new Set(),
      getAttribute(n) { return Object.prototype.hasOwnProperty.call(this.attrs, n) ? this.attrs[n] : null; },
      setAttribute(n, v) { this.attrs[n] = String(v); },
      removeAttribute(n) { delete this.attrs[n]; },
      hasAttribute(n) { return Object.prototype.hasOwnProperty.call(this.attrs, n); },
      appendChild(c) { if (c) { c.parent = this; this.children.push(c); } return c; },
      contains(n) {
        for (let p = n; p; p = p.parent) if (p === this) return true;
        return false;
      },
      matches(sel) {
        const attr = /^\[([\w-]+)\]$/.exec(sel);
        if (attr) return this.hasAttribute(attr[1]);
        if (sel.charAt(0) === ".") return this._classes.has(sel.slice(1));
        return false;
      },
      closest(sel) {
        for (let p = this; p; p = p.parent) if (p.matches && p.matches(sel)) return p;
        return null;
      },
      addEventListener(t, fn) { (this.__l || (this.__l = {}))[t] = ((this.__l && this.__l[t]) || []).concat(fn); },
      removeEventListener() {},
      querySelector() { return null; }, querySelectorAll() { return []; },
      scrollIntoView() {}, click() {}, blur() { this.focused = false; },
      focus() { this.focused = true; doc.activeElement = this; },
      classList: null,
    };
    node.classList = {
      add: (c) => { node._classes.add(c); node.className = [...node._classes].join(" "); },
      remove: (c) => { node._classes.delete(c); node.className = [...node._classes].join(" "); },
      toggle: (c, on) => { if (on === undefined ? node._classes.has(c) : !on) node._classes.delete(c); else node._classes.add(c); },
      contains: (c) => node._classes.has(c),
    };
    Object.defineProperty(node, "id", {
      get() { return node._id || ""; },
      set(v) { node._id = String(v); if (node._id) nodes[node._id] = node; },
    });
    // Assigning className has to keep the class set in step — .pdxip-backdrop is
    // selected by class, and the module sets it through className, not classList.
    let cn = "";
    Object.defineProperty(node, "className", {
      get() { return cn; },
      set(v) { cn = String(v); node._classes = new Set(cn.split(/\s+/).filter(Boolean)); },
    });
    // innerHTML: register every opening tag as a child carrying its real
    // attributes, so a tap on the backdrop or the X in this harness is a tap on
    // the same element the browser would hand the handler.
    Object.defineProperty(node, "innerHTML", {
      get() { return node._html || ""; },
      set(v) {
        node._html = String(v);
        node.children = [];
        const stack = [node];
        const tagRe = /<(\/?)([\w-]+)((?:\s+[\w-]+(?:="[^"]*")?)*)\s*(\/?)>/g;
        let m;
        while ((m = tagRe.exec(node._html))) {
          if (m[1] === "/") { if (stack.length > 1) stack.pop(); continue; }
          const child = el(m[2]);
          const attrRe = /([\w-]+)(?:="([^"]*)")?/g;
          let a;
          while ((a = attrRe.exec(m[3] || ""))) {
            if (a[1] === "class") child.className = a[2] || "";
            else if (a[1] === "id") child.id = a[2] || "";
            else child.attrs[a[1]] = a[2] === undefined ? "" : a[2];
          }
          stack[stack.length - 1].appendChild(child);
          if (!m[4]) stack.push(child);
        }
      },
    });
    return node;
  }

  const doc = {
    readyState: "complete", cookie: "", title: "PolitiDex",
    activeElement: null,
    getElementById(id) { return nodes[id] || null; },
    querySelector() { return null; }, querySelectorAll() { return []; },
    createElement(t) { return el(t); },
    addEventListener(t, fn) { (listeners.document[t] || (listeners.document[t] = [])).push(fn); },
    removeEventListener() {},
    dispatchEvent(e) { (listeners.document[e && e.type] || []).forEach((f) => { try { f(e); } catch (_) {} }); return true; },
    head: el("head"), body: el("body"), documentElement: el("html"),
  };
  doc.body.id = "__body";
  doc.activeElement = doc.body;

  const win = {
    document: doc,
    addEventListener(t, fn) { (listeners.window[t] || (listeners.window[t] = [])).push(fn); },
    removeEventListener() {},
    setTimeout(fn) { try { fn(); } catch (_) {} return 0; }, clearTimeout() {},
    setInterval() { return 0; }, clearInterval() {},
    requestAnimationFrame() { return 0; }, cancelAnimationFrame() {},
    requestIdleCallback() { return 0; },
    matchMedia() { return { matches: false, addEventListener() {}, addListener() {} }; },
    getComputedStyle() { return { getPropertyValue() { return ""; } }; },
    location: {
      href: "https://politidex.fyi" + (opts.pathname || "/"),
      pathname: opts.pathname || "/", search: opts.search || "", hash: opts.hash || "",
      origin: "https://politidex.fyi",
    },
    history: {
      pushState(s, t, url) { history.push(["push", url]); win.location.pathname = String(url).split("?")[0].split("#")[0]; },
      replaceState(s, t, url) {
        history.push(["replace", url]);
        const u = String(url);
        win.location.pathname = u.split("?")[0].split("#")[0];
        win.location.search = u.indexOf("?") === -1 ? "" : "?" + u.split("?")[1].split("#")[0];
        win.location.hash = u.indexOf("#") === -1 ? "" : "#" + u.split("#")[1];
      },
    },
    navigator: { userAgent: "node" },
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    sessionStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    fetch() { return Promise.reject(new Error("test-issue-close-eye-wrap: no network")); },
    console: { log() {}, warn() {}, error() {}, info() {} },
    CustomEvent: class { constructor(t, o) { this.type = t; Object.assign(this, o || {}); } },
    IntersectionObserver: class { observe() {} unobserve() {} disconnect() {} },
    ISSUE_MAP: { housing: { label: "🏠 Housing Affordability" } },
  };
  win.window = win; win.self = win;
  win.__t = { nodes, listeners, history, el };
  return win;
}

function bootIssuePage(opts, src) {
  const win = makeDom(opts);
  const ctx = vm.createContext(win);
  vm.runInContext(src || IP_SRC, ctx, { filename: "issue-page.js" });
  if (!win.PDXIssuePage) throw new Error("PDXIssuePage did not publish");
  return win;
}
const fire = (win, where, type, ev) =>
  (win.__t.listeners[where][type] || []).forEach((fn) => fn(ev));
const overlayOf = (win) => win.__t.nodes["pdx-ip-overlay"] || null;
const findByClass = (root, cls) => {
  const out = [];
  (function walk(n) { if (!n) return; if (n._classes && n._classes.has(cls)) out.push(n); (n.children || []).forEach(walk); })(root);
  return out;
};

// ═══════════════ 1 · the CSS pair ═══════════════════════════════════════════
section("1 · `hidden` actually hides");
{
  has(IP_SRC, "'.pdxip-overlay[hidden]{display:none;}'",
    "the injected sheet must carry the [hidden] half of the pair");
  // The claim is a cascade claim, so it is checked as one: the display rule and
  // the rule that overrides it both have to be in the same sheet, in that order.
  const disp = IP_SRC.indexOf(".pdxip-overlay{position:fixed");
  const hide = IP_SRC.indexOf(".pdxip-overlay[hidden]{display:none;}");
  ok(disp !== -1 && hide !== -1 && hide > disp,
    "[hidden]{display:none} must come after the display:flex rule it has to beat");

  const win = bootIssuePage();
  win.PDXIssuePage.open("housing");
  const styles = win.document.head.children.filter((c) => c.tagName === "STYLE");
  eq(styles.length, 1, "exactly one stylesheet is injected");
  has(styles[0].textContent, ".pdxip-overlay[hidden]{display:none;}",
    "the rule reaches the live sheet, not just the source");

  // Every other overlay in the app already ships this pair — the fix is the house
  // pattern, not a new one.
  has(R("ballot-actions.css"), ".pdx-act-overlay[hidden]", "house pattern: ballot actions");
  has(R("impact-tracker.css"), ".pdx-impact-overlay[hidden]", "house pattern: impact tracker");
}

// ═══════════════ 2 · one close(), three controls ════════════════════════════
section("2 · X, backdrop and Escape all land on the same close");
{
  const openIt = (opts) => {
    const win = bootIssuePage(opts);
    const trigger = win.__t.el("button");
    trigger.id = "the-chip";
    trigger.focus();
    eq(win.PDXIssuePage.open("housing"), true, "the page opens on a real vocabulary key");
    return win;
  };

  // — the X —
  {
    const win = openIt();
    const ov = overlayOf(win);
    eq(ov.hidden, false, "open: the overlay is showing");
    eq(win.PDXIssuePage.isOpen(), true, "open: isOpen agrees");
    const x = findByClass(ov, "pdxip-x")[0];
    ok(!!x, "the overlay has an X");
    ok(x.hasAttribute("data-pdxip-close"), "the X carries the close hook");
    fire(win, "document", "__never");       // no-op, keeps the helper honest
    (ov.__l.click || []).forEach((fn) => fn({ target: x }));
    eq(ov.hidden, true, "X: the overlay is hidden");
    eq(win.PDXIssuePage.isOpen(), false, "X: isOpen agrees");
    eq(win.document.documentElement.classList.contains("pdxip-lock"), false,
      "X: the scroll lock is released, so the page underneath scrolls");
  }

  // — the backdrop (the dimmed page) —
  {
    const win = openIt();
    const ov = overlayOf(win);
    const bd = findByClass(ov, "pdxip-backdrop")[0];
    ok(!!bd, "the overlay has a backdrop");
    ok(bd.hasAttribute("data-pdxip-close"), "the backdrop carries the close hook");
    (ov.__l.click || []).forEach((fn) => fn({ target: bd }));
    eq(ov.hidden, true, "backdrop: the overlay is hidden");
    eq(win.PDXIssuePage.isOpen(), false, "backdrop: isOpen agrees");
  }

  // — a tap on something NESTED inside a close control still closes. closest()
  //   rather than hasAttribute() is what makes this true.
  {
    const win = openIt();
    const ov = overlayOf(win);
    const x = findByClass(ov, "pdxip-x")[0];
    const glyph = win.__t.el("span");
    x.appendChild(glyph);
    (ov.__l.click || []).forEach((fn) => fn({ target: glyph }));
    eq(ov.hidden, true, "a tap on a child of the X closes too");
  }

  // — and a tap INSIDE the panel is not a dismissal. closest() walks up, so this
  //   is the check that it does not walk into something it should not.
  {
    const win = openIt();
    const ov = overlayOf(win);
    const panel = findByClass(ov, "pdxip-panel")[0];
    ok(!!panel, "the overlay has a panel");
    (ov.__l.click || []).forEach((fn) => fn({ target: panel }));
    eq(ov.hidden, false, "a tap on the panel itself leaves the page open");
    const scroll = win.__t.nodes["pdx-ip-scroll"];
    ok(!!scroll, "the panel has the scroll region the body renders into");
    (ov.__l.click || []).forEach((fn) => fn({ target: scroll }));
    eq(ov.hidden, false, "a tap on the page body leaves the page open");
  }

  // — Escape —
  {
    const win = openIt();
    const ov = overlayOf(win);
    let prevented = false;
    fire(win, "document", "keydown", { key: "Escape", preventDefault() { prevented = true; } });
    eq(ov.hidden, true, "Escape: the overlay is hidden");
    eq(prevented, true, "Escape is claimed, so it does not also close something behind");
    // AND AGAIN. The old gate was `!ov.hidden`; once a failed close had set the
    // attribute, Escape silently stopped working for the rest of the session.
    eq(win.PDXIssuePage.open("housing"), true, "the page reopens");
    eq(overlayOf(win).hidden, false, "reopen: showing again");
    fire(win, "document", "keydown", { key: "Escape", preventDefault() {} });
    eq(overlayOf(win).hidden, true, "Escape still closes on the second open");
    // A key that is not Escape is not a close.
    eq(win.PDXIssuePage.open("housing"), true, "the page reopens once more");
    fire(win, "document", "keydown", { key: "a", preventDefault() {} });
    eq(overlayOf(win).hidden, false, "an ordinary keystroke is not a dismissal");
  }
}

// ═══════════════ 3 · what the reader gets back ══════════════════════════════
section("3 · address and focus after close");
{
  // Opened from a person page: the address underneath is /p/..., and closing has
  // to hand it back rather than claim the front page.
  {
    const win = bootIssuePage({ pathname: "/p/some-member" });
    win.PDXIssuePage.open("housing");
    eq(win.location.pathname, "/issue/housing", "opening pushes the issue address");
    win.PDXIssuePage.close();
    eq(win.location.pathname, "/p/some-member",
      "closing restores the address the reader opened FROM, not '/'");
    const kinds = win.__t.history.map((h) => h[0]);
    eq(kinds.join(","), "push,replace", "one push in, one replace out — no extra entries");
  }
  // Arrived cold on /issue/housing: there is no earlier address, and '/' — what is
  // actually rendered behind the overlay — is the honest fallback.
  {
    const win = bootIssuePage({ pathname: "/issue/housing" });
    win.PDXIssuePage.open("housing");
    win.PDXIssuePage.close();
    eq(win.location.pathname, "/", "a cold arrival closes to the page underneath");
  }
  // Reopened on a second key while the first is up: the restore target must not
  // become another /issue/ path.
  {
    const win = bootIssuePage({ pathname: "/b/119-2/H.R.%206644" });
    win.ISSUE_MAP.infra = { label: "🚧 Infrastructure" };
    win.PDXIssuePage.open("housing");
    win.PDXIssuePage.open("infra");
    win.PDXIssuePage.close();
    eq(win.location.pathname, "/b/119-2/H.R.%206644",
      "the restore target is the last non-issue address, never the previous issue page");
  }
  // The router's back path owns the address on a popstate, so close() must not
  // rewrite it.
  {
    const win = bootIssuePage({ pathname: "/p/some-member" });
    win.PDXIssuePage.open("housing");
    const before = win.__t.history.length;
    win.PDXIssuePage.close({ fromPop: true });
    eq(overlayOf(win).hidden, true, "the router's close still closes");
    eq(win.__t.history.length, before, "close({fromPop:true}) touches no history entry");
  }
  // Focus is not left inside a display:none subtree.
  {
    const win = bootIssuePage();
    const chip = win.__t.el("button");
    chip.id = "the-chip";
    chip.focus();
    win.PDXIssuePage.open("housing");
    const ov = overlayOf(win);
    const x = findByClass(ov, "pdxip-x")[0];
    x.focus();
    ok(ov.contains(win.document.activeElement), "precondition: focus is inside the overlay");
    win.PDXIssuePage.close();
    eq(win.document.activeElement, chip,
      "focus returns to the control the reader opened from, not into a hidden tree");
  }
  // ...but a reader who has already clicked into the page behind keeps their place.
  {
    const win = bootIssuePage();
    const chip = win.__t.el("button");
    chip.focus();
    win.PDXIssuePage.open("housing");
    const elsewhere = win.__t.el("a");
    elsewhere.focus();
    win.PDXIssuePage.close();
    eq(win.document.activeElement, elsewhere,
      "focus already outside the overlay is left where the reader put it");
  }
}

// ═══════════════ 4 · all three doors close the same way ═════════════════════
section("4 · the three doors");
{
  // Every entry point hands off to PDXIssuePage.open, which is what makes one
  // close() enough for all of them.
  const doors = [
    ["bill-detail.js", "the topic chip on a bill letterhead"],
    ["profile-spine.js", "the signature-issue chip in a person brief"],
    ["issue-scope.js", "the ⓘ card's “See all bills on this issue”"],
  ];
  for (const [f, what] of doors) {
    const src = R(f);
    ok(/PDXIssuePage[\s\S]{0,240}?\.open\(/.test(src), `${what} opens the issue page (${f})`);
  }
  has(R("issue-scope.js"), "See all bills on this issue", "the ⓘ door still says what it does");
  // The router's back path calls the same close, with the one flag that says the
  // address is already handled.
  has(HTML, "IP.close({ fromPop: true })", "the router closes through PDXIssuePage.close");
  // One close on the published surface — not a second, private dismissal.
  eq((IP_SRC.match(/^  function close\(/gm) || []).length, 1,
    "issue-page.js defines exactly one close()");
  has(IP_SRC, "close: close", "close() is the published one");
}

// ═══════════════ 5 · the Eye's bill row ═════════════════════════════════════
section("5 · the Eye bill row wraps");

// The label under test is the shipped one. If ISSUE_MAP stops saying it, this
// file should say so rather than pass against a copy of a fact that used to be.
const HOUSING_LABEL = "🏠 Housing Affordability";
if (!R("alignment-tool.js").includes(`housing:            { label: '${HOUSING_LABEL}'`)) {
  die(`ISSUE_MAP no longer labels housing '${HOUSING_LABEL}' — the collision this file ` +
      "reproduces is a collision between THAT string and the status badge");
}
// The measure is the reported one, and its issue mappings are read from the seed.
const SEED = JSON.parse(R("db/vr-issue-seed.json"));
const SEED_6644 = (SEED.measures || []).find((m) => m && m.number === "H.R. 6644");
if (!SEED_6644) die("db/vr-issue-seed.json no longer carries H.R. 6644");
const KEYS_6644 = (SEED_6644.issues || []).map((i) => i && i.issueKey).filter(Boolean);
if (!KEYS_6644.includes("housing")) die("H.R. 6644 no longer maps to `housing` in the seed");

function bootEye() {
  const win = makeDom();
  const el = win.__t.el;
  for (const id of ["pdx-eye-input", "pdx-eye-panel", "pdx-eye", "pdx-eye-clear"]) {
    const n = el(id === "pdx-eye-input" ? "textarea" : "div");
    n.id = id;
    win.document.body.appendChild(n);
  }
  win.__t.nodes["pdx-eye-input"].value = "";
  win._issueLabel = (k) => (win.ISSUE_MAP[k] && win.ISSUE_MAP[k].label) || "";
  // The reported row. Status is PASSED HOUSE because that is the row in the
  // report; the mappings are the seed's.
  win.__pdxEyeBillsLive = [{
    id: 88, number: "H.R. 6644", congress: 119, chamber: "house",
    status: "passed_house", measureType: "bill",
    title: "21st Century Revitalizing Opportunity and Access to Development of Housing Act",
    shortTitle: "21st Century ROAD to Housing Act",
    issueKeys: KEYS_6644, primaryIssue: "housing",
  }];
  for (const k of KEYS_6644) win.ISSUE_MAP[k] = win.ISSUE_MAP[k] || { label: "🏷️ " + k };
  const ctx = vm.createContext(win);
  vm.runInContext(EYE_SRC, ctx, { filename: "all-seeing-eye.js" });
  if (!win.PDXEye) throw new Error("PDXEye did not publish — the eye's boot guard bit");
  return win;
}

{
  const win = bootEye();
  win.PDXEye.render("6644");
  const html = win.__t.nodes["pdx-eye-panel"].innerHTML;
  has(html, 'data-kind="bill"', "typing 6644 finds the measure");
  has(html, "H.R. 6644", "the row prints the printed number");

  // From the opening <button>, not from the data-kind attribute — role="option"
  // is printed before it and would otherwise be sliced off.
  const row = html.slice(html.lastIndexOf("<button", html.indexOf('data-kind="bill"')));
  const at = (s) => row.indexOf(s);

  // ORDER: title, then number, then topic chips, then the status badge.
  ok(at("pdx-eye-name") !== -1, "the row has a title line");
  ok(at("pdx-eye-sub") !== -1, "the row has a number line");
  ok(at("pdx-eye-name") < at("pdx-eye-sub"), "title before number");
  ok(at("pdx-eye-topic") !== -1, "the row has topic chips");
  ok(at("pdx-eye-sub") < at("pdx-eye-topic"), "number before the topic chips");
  has(row, "Housing Affordability", "the topic is named");
  has(row, "Passed House", "the status badge is present");
  ok(at("pdx-eye-topic") < at("Passed House"),
    "topic chips come before the status badge — the required order");
  ok(at("pdx-eye-meta") !== -1 && at("pdx-eye-meta") < at("pdx-eye-topic"),
    "the chips and badges share one wrapping strip");

  // THE COLLISION IS GONE BY CONSTRUCTION: the topic label and the badge are no
  // longer a run of text and an element pinned beside it — they are siblings in
  // a wrapping strip. Nothing can paint over anything.
  const meta = row.slice(row.indexOf("pdx-eye-meta"));
  const topicEnd = meta.indexOf("Housing Affordability");
  const badgeStart = meta.indexOf("Passed House");
  ok(topicEnd !== -1 && badgeStart !== -1 && meta.slice(topicEnd, badgeStart).includes("</span>"),
    "the topic closes its own element before the badge opens — not one text run");
  hasNot(row.slice(0, at("pdx-eye-meta")), "Passed House",
    "the badge is not left outside the wrapping strip");

  // The row keeps its identity and its door.
  has(row, 'data-number="H.R. 6644"', "the row still carries the number the tap opens");
  has(row, 'role="option"', "the row is still an option in the listbox");

  // The sub line is the number and chamber only — the topics are chips now, so
  // they are not also appended to it.
  const subStart = at("pdx-eye-sub");
  const subChunk = row.slice(subStart, row.indexOf("</span>", subStart));
  hasNot(subChunk, "Housing Affordability", "the topic is not ALSO glued onto the sub line");
}

// ── the CSS half: it wraps, and it does not clip ────────────────────────────
{
  // The two rules the inline spans made inert.
  ok(/\.pdx-eye-name\{display:block;/.test(HTML),
    ".pdx-eye-name is blockified, so its own overflow rules can apply at all");
  ok(/\.pdx-eye-sub\{display:block;/.test(HTML),
    ".pdx-eye-sub is blockified, so its margin-top and ellipsis can apply at all");

  // The bill row wraps. Explicitly NOT overflow:hidden as the fix.
  const billRules = HTML.split("\n").filter((l) => l.includes("pdx-eye-item--bill"));
  ok(billRules.length >= 3, "the bill row has its own scoped rules");
  const billCss = billRules.join("\n");
  has(billCss, "white-space:normal", "the bill row's lines are allowed to wrap");
  has(billCss, "overflow:visible", "the bill row does not clip");
  hasNot(billCss, "overflow:hidden", "overflow:hidden is NOT the fix here");
  has(billCss, "align-items:flex-start", "a two-line row aligns to the top, not the middle");

  const metaRule = HTML.split("\n").find((l) => l.includes(".pdx-eye-meta{"));
  ok(!!metaRule, "the wrapping strip has a rule");
  has(metaRule, "flex-wrap:wrap", "the strip wraps onto a second line");
  has(metaRule, "display:flex", "the strip is a flex row");

  const topicRule = HTML.split("\n").find((l) => l.includes(".pdx-eye-topic{"));
  ok(!!topicRule, "the topic chip has a rule");
  has(topicRule, "min-width:0", "a chip can be narrower than its text rather than push the strip wider");
  // Nothing in this row is clipped — not the lines, and not the chips either.
  has(topicRule, "white-space:normal", "a long topic label wraps inside its pill");
  has(topicRule, "overflow-wrap:anywhere", "...and breaks rather than overflowing");
  hasNot(topicRule, "overflow:hidden", "the chip does not clip its own label");
  hasNot(topicRule, "text-overflow:ellipsis", "the chip does not ellipsise its own label");
  // The longest label the vocabulary can hand this chip, so the claim above is a
  // claim about real data rather than about a comfortable example.
  const LONGEST = [...R("alignment-tool.js").matchAll(/\{ label: '([^']+)'/g)]
    .map((m) => m[1]).sort((a, b) => b.length - a.length)[0] || "";
  ok(LONGEST.length > 0 && LONGEST.length <= 48,
    `the longest ISSUE_MAP label is ${LONGEST.length} chars (${JSON.stringify(LONGEST)}) — ` +
    "a wrapping pill holds it; if this grows past ~48 the chip needs a rethink, not a clip");

  // The badge used to hold a pinned max-width because it sat in the row's right
  // rail; inside the wrapping strip it does not need to be truncated.
  ok(HTML.includes(".pdx-eye-meta .pdx-eye-tag--src{max-width:none;}"),
    "the status badge is no longer truncated to fit a rail it has left");
}

// ═══════════════ 6 · mutation ═══════════════════════════════════════════════
section("6 · the fixes are load-bearing");
{
  // A · drop the [hidden] rule → the overlay stays in the render tree.
  {
    const broken = IP_SRC.replace("'.pdxip-overlay[hidden]{display:none;}',", "");
    const win = bootIssuePage({}, broken);
    win.PDXIssuePage.open("housing");
    const sheet = win.document.head.children.find((c) => c.tagName === "STYLE");
    ok(!sheet.textContent.includes(".pdxip-overlay[hidden]"),
      "mutation A: without the rule the sheet cannot hide the overlay — and the check catches it");
  }
  // B · put the dismissal hook back on hasAttribute() → a tap on anything nested
  //     inside the X stops closing.
  {
    const broken = IP_SRC.replace(
      "if (e.target.closest('[data-pdxip-close]')) { close(); return; }",
      "if (e.target.hasAttribute && e.target.hasAttribute('data-pdxip-close')) { close(); return; }");
    ok(broken !== IP_SRC, "mutation B applied");
    const win = bootIssuePage({}, broken);
    win.PDXIssuePage.open("housing");
    const ov = overlayOf(win);
    const x = findByClass(ov, "pdxip-x")[0];
    const glyph = win.__t.el("span");
    x.appendChild(glyph);
    (ov.__l.click || []).forEach((fn) => fn({ target: glyph }));
    eq(ov.hidden, false,
      "mutation B: hasAttribute() cannot see a tap on a child of the control — closest() can");
  }
  // C · restore the old unconditional rewrite to '/' → the reader is dumped on an
  //     address that does not describe what is on screen.
  {
    const broken = IP_SRC.replace(
      "history.replaceState({}, document.title, _prevUrl || '/');",
      "history.replaceState({}, document.title, '/');");
    ok(broken !== IP_SRC, "mutation C applied");
    const win = bootIssuePage({ pathname: "/p/some-member" }, broken);
    win.PDXIssuePage.open("housing");
    win.PDXIssuePage.close();
    eq(win.location.pathname, "/",
      "mutation C: without the restore the profile underneath is left at the front-page address");
  }
  // D · empty the wrapping strip → the topic chips vanish and the order the row
  //     promises cannot be checked at all.
  {
    const broken = EYE_SRC.replace(
      "var meta = billTopicChips(e) + badge + personalBadge(e);",
      "var meta = '';");
    ok(broken !== EYE_SRC, "mutation D applied");
    const win = makeDom();
    const el = win.__t.el;
    for (const id of ["pdx-eye-input", "pdx-eye-panel", "pdx-eye", "pdx-eye-clear"]) {
      const n = el("div"); n.id = id; win.document.body.appendChild(n);
    }
    win.__t.nodes["pdx-eye-input"].value = "";
    win._issueLabel = (k) => (win.ISSUE_MAP[k] && win.ISSUE_MAP[k].label) || "";
    win.__pdxEyeBillsLive = [{
      id: 88, number: "H.R. 6644", congress: 119, chamber: "house", status: "passed_house",
      title: "21st Century ROAD to Housing Act", issueKeys: ["housing"], primaryIssue: "housing",
    }];
    const ctx = vm.createContext(win);
    vm.runInContext(broken, ctx, { filename: "all-seeing-eye.js(broken)" });
    win.PDXEye.render("6644");
    const html = win.__t.nodes["pdx-eye-panel"].innerHTML;
    ok(!html.includes("pdx-eye-topic"),
      "mutation D: with the strip emptied there are no chips — the order check would fail");
  }
}

// ═══════════════ report ═════════════════════════════════════════════════════
if (failures.length) {
  console.error(`\n✗ issue close / eye wrap — ${failures.length} failed, ${passed} passed\n`);
  failures.forEach((f) => console.error("   · " + f));
  process.exit(1);
}
console.log(`\n✓ issue close / eye wrap — ${passed} assertions passed\n`);
