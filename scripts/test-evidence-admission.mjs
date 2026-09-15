#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-evidence-admission.mjs — the Evidence Locker admits receipts, not
// horserace clips
// ─────────────────────────────────────────────────────────────────────────────
// What shipped on /evidence, and what this file exists to keep off it:
//
//   Ed Gallrein · "Gallrein Leads in KY-04 Polling Ahead of General Election"
//   · tagged 💰 Taxes & Economy / 🏭 Protect American Jobs · body is
//   RealClearPolling horserace copy · "No public source link recorded for this
//   item."
//
// Four separate claims, none of them a receipt. It is not a formal act. It does
// not quote him. Its subject is a race, and the issue on its chip was guessed
// from his file by a keyword scorer that found "trade" in a sentence about what
// voters care about. And the card said out loud that it had no source — which is
// a refusal, printed as if it were evidence.
//
// So the locker got ONE door, `_evAdmit` in evidence-locker.js, and everything
// that feeds the drawer goes through it: the grid, the featured and recent
// lanes, the filters, the counts, the detail modal, and — through the published
// `window.PDXEvidenceAdmit` — any ingest that wants to add a row. It admits only
// a record of what a person DID or SAID: one of the kinds it keeps, about an
// issue the item's own words name, pointing at a public http(s) source. It
// refuses the race, the money story, the recap that quotes nobody, the empty
// citation, and the tag the text cannot justify.
//
// A refusal is not a delete. Nothing is removed from anybody's data here: the
// Gallrein row is still in spotlight-cards-data.js exactly as curated, the gate
// keeps it off the face, and the reason lands on `window._pdxEvidenceRefused`
// so a later curator pass can drop it or recategorize it on purpose.
//
//   PHASE 0 — ONE door, published, and the grid goes through it.
//   PHASE 1 — the named card. Gallrein's polling clip is harvested, refused as
//             horserace, and appears nowhere on the page.
//   PHASE 2 — the refusals, on fixtures: polling with no source URL tagged
//             Taxes & Economy, polling with a source, a fundraising haul, a
//             news recap, an empty citation, an unjustifiable tag.
//   PHASE 3 — a floor-video receipt with a source URL still paints, and the
//             admitted library did not collapse.
//   PHASE 4 — "No public source link recorded" cannot appear on a visible card.
//   PHASE 5 — a refusal is not a delete: the row survives, with its reason.
//   PHASE 6 — the fence and the bump. No new score, no WVA, no party sort, no
//             /stances shelf touched, and the shell cache moved because
//             evidence-locker.js is precached.
//
//   node scripts/test-evidence-admission.mjs
//
// The document is READ AS TEXT AND RUN: every <script> in evidence.html, in
// order, in a node:vm against a DOM stub, with a virtual clock — the same
// harness test-evidence-paints.mjs boots the page with. A gate is a claim about
// what a real load renders, and the only way to check it is to render one.
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const HAS = (f) => existsSync(join(ROOT, f));

const EV = R("evidence.html");
const EL = R("evidence-locker.js");
const SW = R("sw.js");
const SD = R("spotlight-cards-data.js");

// Full-line `//` comments only. Several questions below are about what the CODE
// says, and the gate's own comments quote the refused Gallrein headline, the
// RealClearPolling citation and the "no public source link recorded" line it
// retired — a comment-blind read would find all three and answer wrong.
const codeOnly = (s) => String(s).split("\n")
  .filter((l) => !/^\s*\/\//.test(l)).join("\n");
const EL_CODE = codeOnly(EL);

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const must = (cond, msg) => {
  if (!cond) { console.error(`\n✗ evidence admission — PRECONDITION FAILED: ${msg}\n`); process.exit(1); }
  passed++;
};
const section = (n) => console.log("  " + n);

// ═════════════════════════════════════════════════════════════════════════════
// The sandbox: a DOM the size of evidence.html, and a clock that respects time
// ═════════════════════════════════════════════════════════════════════════════
// Only ids that really appear in evidence.html vivify. A stub that answers
// getElementById for anything at all cannot tell "the page wired its status
// line" from "the page wired a typo", and the freeze this file exists to
// prevent lived exactly in that gap.
function makeDom(opts = {}) {
  const IDS = new Set([...EV.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const nodes = new Map();
  const log = { navs: [], errors: [], dispatched: [], warns: [] };
  function mkEl(id, tag = "div") {
    return {
      id, tagName: String(tag).toUpperCase(), innerHTML: "", textContent: "", value: "",
      hidden: false, style: { display: "", setProperty() {} },
      dataset: {}, children: [], options: [], selectedIndex: -1, __attrs: {}, __l: {},
      classList: {
        _s: new Set(),
        add(...c) { c.forEach((x) => this._s.add(x)); },
        remove(...c) { c.forEach((x) => this._s.delete(x)); },
        toggle(c, on) { if (on === undefined) { this._s.has(c) ? this._s.delete(c) : this._s.add(c); } else if (on) this._s.add(c); else this._s.delete(c); },
        contains(c) { return this._s.has(c); },
      },
      getAttribute(k) { return k in this.__attrs ? this.__attrs[k] : null; },
      setAttribute(k, v) { this.__attrs[k] = String(v); },
      removeAttribute(k) { delete this.__attrs[k]; },
      hasAttribute(k) { return k in this.__attrs; },
      addEventListener(t, fn) { (this.__l[t] || (this.__l[t] = [])).push(fn); },
      removeEventListener() {},
      appendChild(n2) { this.children.push(n2); if (this.tagName === "SELECT") this.options.push(n2); return n2; },
      insertBefore(n2) { this.children.push(n2); return n2; },
      removeChild(n2) {
        const i = this.children.indexOf(n2); if (i >= 0) this.children.splice(i, 1);
        const j = this.options.indexOf(n2); if (j >= 0) this.options.splice(j, 1);
        return n2;
      },
      // <select>.remove(i) drops option i. A no-op here spins the filter
      // rebuild's `while (sel.options.length > 1) sel.remove(1)` forever, which
      // is its own kind of frozen page and cost an afternoon to find.
      remove(i) {
        if (typeof i !== "number") return;
        const n2 = this.options.splice(i, 1)[0];
        const j = this.children.indexOf(n2); if (j >= 0) this.children.splice(j, 1);
      },
      replaceChildren() { this.children = []; this.options = []; },
      querySelector() { return null; }, querySelectorAll() { return []; },
      closest() { return null; }, contains() { return false; },
      scrollIntoView() {}, focus() {}, blur() {}, click() {},
      getBoundingClientRect() { return { top: 0, left: 0, width: 0, height: 0, bottom: 0, right: 0 }; },
      insertAdjacentHTML() {},
    };
  }
  const document = {
    readyState: "loading", cookie: "", title: "", __l: {},
    getElementById(id) {
      if (!IDS.has(id)) return null;
      if (!nodes.has(id)) nodes.set(id, mkEl(id, /^el-f-(category|issue|pol|sort|bill)$/.test(id) ? "select" : "div"));
      return nodes.get(id);
    },
    querySelector(s) { const m = /^#([\w-]+)$/.exec(s || ""); return m ? document.getElementById(m[1]) : null; },
    querySelectorAll() { return []; },
    createElement(t) { return mkEl("", t); },
    createDocumentFragment() { return mkEl("", "fragment"); },
    createTextNode(t) { const n = mkEl("", "#text"); n.textContent = t; return n; },
    addEventListener(t, fn) { this.__l[t] = (this.__l[t] || []).concat(fn); },
    removeEventListener() {},
    dispatchEvent(e) {
      log.dispatched.push(e && e.type);
      ((this.__l || {})[e && e.type] || []).forEach((fn) => {
        try { fn(e); } catch (x) { log.errors.push("dispatch " + (e && e.type) + ": " + (x && x.stack || x)); }
      });
      return true;
    },
    head: mkEl("head", "head"), body: mkEl("body", "body"), documentElement: mkEl("html", "html"),
  };
  // The workspace template. On /evidence the real document parses this into an
  // inert fragment; here it only has to exist and clone.
  const template = mkEl("el-workspace-tpl", "template");
  template.content = { cloneNode: () => mkEl("", "fragment") };
  nodes.set("el-workspace-tpl", template);

  let href = "https://www.politidex.fyi" + (opts.pathname || "/evidence") + (opts.search || "");
  const location = {
    pathname: opts.pathname || "/evidence", search: opts.search || "", hash: opts.hash || "",
    origin: "https://www.politidex.fyi", host: "www.politidex.fyi",
    assign(t) { log.navs.push(t); }, replace(t) { log.navs.push(t); },
    get href() { return href; }, set href(v) { log.navs.push(v); href = v; },
  };
  let clock = 0, seq = 0;
  const timers = [];
  const win = {
    document, location, console,
    addEventListener(t, fn) { (this.__l || (this.__l = {}))[t] = ((this.__l || {})[t] || []).concat(fn); },
    removeEventListener() {},
    setTimeout(fn, ms) { const id = ++seq; timers.push({ id, fn, at: clock + (ms || 0) }); return id; },
    clearTimeout(id) { const i = timers.findIndex((t) => t.id === id); if (i >= 0) timers.splice(i, 1); },
    setInterval() { return 0; }, clearInterval() {},
    requestAnimationFrame(fn) { const id = ++seq; timers.push({ id, fn, at: clock }); return id; },
    cancelAnimationFrame() {},
    requestIdleCallback(fn) { const id = ++seq; timers.push({ id, fn, at: clock }); return id; },
    matchMedia() { return { matches: false, addEventListener() {}, addListener() {} }; },
    getComputedStyle() { return { getPropertyValue: () => "" }; },
    history: { replaceState() {}, pushState() {} },
    navigator: { userAgent: "node", clipboard: null },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    fetch() { return Promise.reject(new Error("harness: no network")); },
    CustomEvent: class { constructor(t, o) { this.type = t; Object.assign(this, o || {}); } },
    Event: class { constructor(t) { this.type = t; } },
    IntersectionObserver: class { observe() {} unobserve() {} disconnect() {} },
    Promise, Set, Map, WeakMap, JSON, Math, Date, Object, Array, String, Number, Boolean,
    RegExp, Error, TypeError, Intl, encodeURIComponent, decodeURIComponent, parseInt,
    parseFloat, isNaN, isFinite,
  };
  win.window = win; win.self = win; win.globalThis = win;
  // A virtual clock, not a trampoline. Run the timer due SOONEST and flush
  // microtasks between each, so the loader's 15 s watchdog fires only if the
  // shards really never arrive — an "execute every timeout immediately" drain
  // reports a watchdog trip on a page that works perfectly.
  win.__h = {
    log, nodes, IDS, mkEl, now: () => clock, pending: () => timers.length,
    async run(maxSteps = 6000) {
      let steps = 0;
      for (;;) {
        await Promise.resolve();
        await new Promise((r) => setImmediate(r));
        if (!timers.length) {
          await new Promise((r) => setImmediate(r));
          if (!timers.length) return { steps, clock, drained: true };
        }
        if (++steps > maxSteps) return { steps, clock, drained: false };
        timers.sort((a, b) => (a.at - b.at) || (a.id - b.id));
        const t = timers.shift();
        clock = Math.max(clock, t.at);
        try { t.fn(); } catch (e) { log.errors.push(e && e.stack || String(e)); }
      }
    },
  };
  return win;
}

// Run every <script> in evidence.html, in document order: inline blocks as
// written, root-absolute srcs from disk. Anything with a non-JS type (the
// ld+json blocks) and anything cross-origin is skipped, exactly as a browser
// would treat them for this purpose. /firebase-config.js is injected at the
// edge and is not in the repo — a missing local src is recorded, not fatal.
function runDocument(win, html) {
  const ctx = vm.createContext(win);
  const errs = [], ran = [], missing = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/g;
  let m, n = 0;
  while ((m = re.exec(html))) {
    const attrs = m[1], body = m[2];
    if (/\btype=/.test(attrs) && !/type="text\/javascript"/.test(attrs)) continue;
    const src = /src="([^"]+)"/.exec(attrs);
    n++;
    const label = src ? src[1] : "inline#" + n;
    try {
      if (src) {
        if (!src[1].startsWith("/")) continue;
        const rel = src[1].slice(1);
        if (!HAS(rel)) { missing.push(rel); continue; }
        vm.runInContext(R(rel), ctx, { filename: src[1] });
      } else {
        vm.runInContext(body, ctx, { filename: label });
      }
      ran.push(label);
    } catch (e) {
      errs.push({ label, name: (e && e.constructor && e.constructor.name) || "Error", message: String(e && e.message || e) });
    }
  }
  return { ctx, errs, ran, missing };
}

// The one firebase the boot is allowed to see: enough compat surface to take
// its happy path, and a recorder for what it asked of it.
function fakeFirebase(rec) {
  const stub = () => ({ get: () => Promise.reject(new Error("harness: no firestore")) });
  return {
    initializeApp() { rec.initialized = true; return {}; },
    firestore() { return { collection: stub, doc: stub }; },
    auth() {
      return {
        currentUser: null,
        // Every registration, not just the last: several scripts on this document
      // watch auth, and the boot's own handler — the one the ReferenceError used
      // to stand in front of — is not the one registered last.
      onAuthStateChanged(cb) { (rec.authCbs || (rec.authCbs = [])).push(cb); rec.watched = true; return () => {}; },
        signInAnonymously() { rec.signedInAnon = true; return Promise.resolve({ user: { uid: "anon", isAnonymous: true } }); },
        signOut() { return Promise.resolve(); },
      };
    },
  };
}

// One full boot of /evidence. `opts.homepagePatch` installs index.html's
// deferred-DOMContentLoaded machinery first, which is the difference between
// this shell and the four that carry it.
async function bootEvidence(opts = {}) {
  const win = makeDom({ pathname: opts.pathname || "/evidence", search: opts.search || "" });
  const rec = { deferred: [], released: 0, authCbs: [] };
  win.firebase = fakeFirebase(rec);
  if (opts.homepagePatch) {
    // index.html's block, in miniature and in the same shape: stash the real
    // addEventListener in a top-level `var` (a script-level var IS a global
    // property, which is why the boot could ever read it), queue DOMContentLoaded
    // until Firestore answers, and release through _checkAndTrigger.
    vm.runInContext(`
      var _originalAddEventListener = document.addEventListener;
      var _deferredDCL = [];
      document.addEventListener = function (type, listener, options) {
        if (type === 'DOMContentLoaded') { _deferredDCL.push(listener); return; }
        _originalAddEventListener.call(document, type, listener, options);
      };
      var _firestoreLoaded = false, _domContentLoaded = false, _triggered = 0;
      function _checkAndTrigger() {
        _triggered++;
        if (!(_firestoreLoaded && _domContentLoaded)) return;
        var q = _deferredDCL; _deferredDCL = [];
        q.forEach(function (fn) { fn({ type: 'DOMContentLoaded' }); });
      }
    `, vm.createContext(win), { filename: "index-homepage-block" });
  }
  const { ctx, errs, ran, missing } = runDocument(win, EV);
  if (opts.afterLoad) opts.afterLoad(win, ctx, rec);

  win.document.readyState = "interactive";
  if (opts.homepagePatch) { win.__hp = { before: (win._deferredDCL || []).length }; }
  for (const fn of (win.document.__l || {}).DOMContentLoaded || []) {
    try { fn({ type: "DOMContentLoaded" }); } catch (e) { win.__h.log.errors.push("DCL: " + (e && e.stack || e)); }
  }
  if (opts.homepagePatch) {
    // Firestore answers, the DOM is ready, the queue drains — the homepage order.
    win._domContentLoaded = true; win._firestoreLoaded = true;
    try { win._checkAndTrigger(); } catch (e) { win.__h.log.errors.push("release: " + (e && e.message || e)); }
  }
  for (const cb of rec.authCbs || []) {
    try { cb(null); } catch (e) { win.__h.log.errors.push("auth: " + (e && e.stack || e)); }
  }
  const drain = await win.__h.run();
  const g = (id) => win.document.getElementById(id);
  const results = String((g("el-results") || {}).innerHTML || "");
  return {
    win, ctx, errs, ran, missing, rec, drain, g,
    refErrors: errs.filter((e) => e.name === "ReferenceError")
      .concat(win.__h.log.errors.filter((s) => /ReferenceError/.test(String(s))).map((s) => ({ label: "runtime", name: "ReferenceError", message: String(s).split("\n")[0] }))),
    runtimeErrors: win.__h.log.errors,
    statusDisplay: (g("el-status") || {}).style ? g("el-status").style.display : null,
    statusHtml: String((g("el-status") || {}).innerHTML || ""),
    results,
    cards: (results.match(/class="el-card/g) || []).length,
    skels: (results.match(/el-skel/g) || []).length,
    countHtml: String((g("el-count") || {}).innerHTML || ""),
    mounted: !!(win.PDXEvidenceLocker && win.PDXEvidenceLocker.mounted()),
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// The fixtures: one Utah House seat, seven items, six of which are not receipts
// ═════════════════════════════════════════════════════════════════════════════
// Each is shaped exactly like a curated spotlight item — the shape `_build()`
// flattens — because the gate has to read the same fields an author writes. The
// first one is the brief's own equivalent of the Gallrein card: "polling" in the
// body, no source URL anywhere, and a 💰 Taxes & Economy issue tag.
const FIX_ID = "zz_admission_fixture";
const FIX_NAME = "Fixture Testwell";

const REFUSED_FIXTURES = [
  {
    code: "no_source",
    why: "polling in the body, no source URL anywhere, tagged Taxes & Economy",
    item: {
      date: "May 2026", issueKey: "econ_trade",
      headline: "Testwell Leads in District 99 Polling Ahead of the General Election",
      facts: "Recent polling shows Testwell leading the challenger by 12 points in a traditionally Republican district. Trade and manufacturing jobs are the top voter concerns.",
      why: "The seat is one of the few competitive Utah House districts this cycle.",
    },
  },
  {
    code: "horserace",
    why: "the same race story, this time with a working citation — the link does not make it a record",
    item: {
      date: "May 2026", issueKey: "econ_trade",
      headline: "Testwell Leads the Field in a New Manufacturing-Belt Survey",
      facts: 'A new survey of the district has Testwell ahead by nine points, with factory jobs and trade the top concern. <a href="https://www.realclearpolling.com/polls" target="_blank" rel="noopener">RealClearPolling</a>',
      why: "Polling is the cheapest thing to publish and the least like a record.",
    },
  },
  {
    code: "horserace",
    why: "a fundraising total as the body",
    item: {
      date: "Apr 2026", issueKey: "econ_smallbiz",
      headline: "Testwell Outraised Every Rival With $2.4M Cash on Hand",
      facts: "The campaign reported its largest quarterly haul to date and $2.4 million cash on hand, outraising every small-business-focused rival in the district.",
      source: { label: "Deseret News", url: "https://www.deseret.com/politics/2026/04/10/testwell-quarter/" },
    },
  },
  {
    code: "recap",
    why: "a news recap that neither quotes the person nor points at an official record",
    item: {
      date: "Mar 2026", issueKey: "housing_build",
      headline: "Housing Costs Keep Climbing Across House District 99",
      facts: "Rents rose nine percent across the district last year while new construction permits fell, according to a state housing report. Builders point to zoning rules as the main brake on new apartments.",
      source: { label: "Salt Lake Tribune", url: "https://www.sltrib.com/news/2026/03/12/district-99-housing/" },
    },
  },
  {
    code: "no_source",
    why: "the citation fields are present and empty",
    item: {
      date: "Jan 2026", issueKey: "prop_tax",
      headline: "Testwell Explained a Property Tax Vote at a District Town Hall",
      facts: "Testwell told the room he voted for the property tax relief bill because the levy had outrun what retirees on the bench could carry.",
      media: { url: "" }, source: { label: "Town hall", url: "" },
    },
  },
  {
    code: "tag",
    why: "an issue tag the item's own text cannot justify",
    item: {
      date: "Feb 2026", issueKey: "public_schools",
      headline: "Testwell Pressed the Water Conservancy Board on Great Salt Lake Inflows",
      facts: "“The lake level is the whole ballgame here,” Testwell said, pressing the board over how much water actually reaches the Great Salt Lake in a drought year.",
      source: { label: "KUER", url: "https://www.kuer.org/politics/2026-02-11/testwell-great-salt-lake" },
    },
  },
];

// The one that must paint: a formal floor-video record, on the official archive,
// about an issue its own sentences name.
const ADMITTED_FIXTURE = {
  date: "Feb 2026", issueKey: "water",
  headline: "Presented HB 9099 on the House Floor to Meter Secondary Water Use",
  facts: "Testwell presented HB 9099 (2026), Secondary Water Metering Amendments, on the House floor, arguing that metering secondary connections is the cheapest way to cut outdoor water use in a drought year. The official floor archive seeks to the presentation at 41:20.",
  why: "It is the measure behind his stated water-conservation position, argued on the record.",
  source: { label: "Utah Legislature floor video (HB9099, Day 24)", url: "https://le.utah.gov/av/floorArchive.jsp?markerID=999999" },
  media: { type: "video", timestamp: "41:20", label: "Official House floor video, Feb. 2026" },
};

// The shipped card, verbatim in shape, for a direct call on the door.
const GALLREIN_HEADLINE = "Gallrein Leads in KY-04 Polling Ahead of General Election";
const GALLREIN_ITEM = {
  date: "May 2026", name: "Ed Gallrein",
  headline: GALLREIN_HEADLINE,
  facts: 'Recent polling shows Gallrein leading the Democratic challenger by 12 points in the traditionally Republican KY-04 district. Agricultural policy and trade are top voter concerns. <a href="https://www.realclearpolling.com" target="_blank" rel="noopener">RealClearPolling</a>',
};

// One boot, with the fixtures in the roster and every shard resolved. Gallrein
// is filed in the bundled roster as "Republican Nominee", which is not a scope
// this room harvests; the live lite index files him as a 2026 candidate, which
// is why the card is on the live page. The flag below reproduces the live
// membership so the SHIPPED row is really put to the gate here.
async function bootAdmission() {
  return bootEvidence({
    afterLoad(win) {
      win._pdxEnsureFullProfile = () => Promise.resolve(null);
      win._pdxRosterState = "ready";
      const cmp = win.CMP_DATA || {};
      must(!!cmp.gallrein, "cmp-data.js no longer carries the gallrein record this fence is built on");
      cmp.gallrein.candidate = true;
      cmp[FIX_ID] = {
        name: FIX_NAME, office: "Utah State Representative", district: "House District 99",
        party: "R", state: "UT",
        spotlight: REFUSED_FIXTURES.map((f) => f.item).concat([ADMITTED_FIXTURE]),
      };
    },
  });
}

// Everything the page painted, not just the grid: the featured lane, the recent
// lane, the filter chips, the counts, the modal shell. A refused item must be
// absent from ALL of it, and a phrase that must never be visible has to be
// checked against every node, not the one container it used to appear in.
const paintedHtml = (win) => {
  let all = "";
  win.__h.nodes.forEach((n) => { all += String((n && n.innerHTML) || "") + "\n"; });
  return all;
};
const ledger = (win) => (win._pdxEvidenceRefused || []);
const refusalFor = (win, headline) => ledger(win).filter((r) => String(r.headline || "") === headline)[0] || null;

must(HAS("evidence-locker.js"), "evidence-locker.js is missing — the engine this gate lives in");
must(SD.includes(GALLREIN_HEADLINE),
  "spotlight-cards-data.js no longer carries the Gallrein polling card — the example this fence is written around is gone, so re-read the brief before trusting this file");

const run = await bootAdmission();

// ═════════════════════════════════════════════════════════════════════════════
section("PHASE 0 — one door, published, and the grid goes through it");
// ═════════════════════════════════════════════════════════════════════════════
{
  eq((EL_CODE.match(/function _evAdmit\(/g) || []).length, 1,
    "evidence-locker.js does not define _evAdmit exactly once — the admission rule is supposed to be ONE function");
  eq((EL_CODE.match(/_EV_HORSERACE_RE\s*=\s*new RegExp/g) || []).length, 1,
    "the horserace rule is written more than once — a second copy is a second policy");

  // The grid's only rejection point is the door. A filter that dropped a card
  // some other way would be a rule nobody could call from an ingest.
  ok(/var verdict = _evAdmit\(item\);/.test(EL_CODE),
    "_build() no longer puts each item to _evAdmit — the grid and the door have come apart");
  eq((EL_CODE.match(/refused\.push\(/g) || []).length, 1,
    "_build() refuses items in more than one place");

  // Published above _build, so an ingest can ask before it writes a row rather
  // than after the locker has already built one.
  const pub = EL_CODE.indexOf("window.PDXEvidenceAdmit");
  const build = EL_CODE.indexOf("function _build()");
  ok(pub > 0, "window.PDXEvidenceAdmit is not published — nothing but the locker itself can reach the rule");
  ok(pub < build, "the door is published after _build() — an ingest that loads earlier could not use it");

  const door = run.win.PDXEvidenceAdmit;
  ok(!!door, "a booted /evidence has no window.PDXEvidenceAdmit");
  eq(typeof (door || {}).check, "function", "PDXEvidenceAdmit.check is not a function");
  eq(typeof (door || {}).admits, "function", "PDXEvidenceAdmit.admits is not a function");
  eq(typeof (door || {}).sourceUrl, "function", "PDXEvidenceAdmit.sourceUrl is not a function");

  // Rule 1's own list, as kinds an ingest can name.
  const KINDS = ["floor_video", "committee_video", "statement", "bill", "letter",
                 "amicus", "sponsorship", "finance_filing"];
  for (const k of KINDS) ok(!!((door || {}).kinds || {})[k], `the admitted-kind list has no "${k}"`);
  // …and a quote with a citation, which is the one non-formal admission.
  for (const k of ["youtube", "x_post", "facebook", "audio"]) {
    ok(!!((door || {}).kinds || {})[k], `the admitted-kind list has no "${k}" — a quote with a working citation is admissible`);
  }

  // A verdict carries a reason. "Refused" with no reason is not something a
  // curator can act on, and the ledger is the only place the refusal survives.
  const v = door.check(GALLREIN_ITEM);
  eq(v.ok, false, "the door admitted the Gallrein polling card");
  ok(String(v.reason || "").length > 20, "a refusal came back without a reason a curator could read");
  eq(door.admits(GALLREIN_ITEM), false, "admits() disagrees with check() on the Gallrein card");
  eq(run.refErrors.length, 0, "the admission boot threw a ReferenceError: " + run.refErrors.map((e) => e.message).join(" | "));
  eq(run.runtimeErrors.length, 0, "the admission boot threw at runtime: " + run.runtimeErrors.map((s) => String(s).split("\n")[0]).join(" | "));
}

// ═════════════════════════════════════════════════════════════════════════════
section("PHASE 1 — the named card: Gallrein's polling clip is not a receipt");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The refusal is about the BODY, not a missing link: the gate resolved the
  // RealClearPolling citation out of the item's own markup and still said no.
  eq(run.win.PDXEvidenceAdmit.sourceUrl(GALLREIN_ITEM), "https://www.realclearpolling.com",
    "the door could not resolve the citation recorded inside the Gallrein card's body");
  eq(run.win.PDXEvidenceAdmit.check(GALLREIN_ITEM).code, "horserace",
    "the Gallrein card is refused for the wrong reason — its body is horserace copy");

  // And the SHIPPED row, harvested from spotlight-cards-data.js on a real boot.
  ok(run.cards > 0, `the grid painted ${run.cards} cards — an empty grid would pass every absence test below for the wrong reason`);
  const r = refusalFor(run.win, GALLREIN_HEADLINE);
  ok(!!r, "the shipped Gallrein row never reached the gate on a real boot — this fence is not testing what it claims to");
  eq((r || {}).code, "horserace", "the shipped Gallrein row was refused for the wrong reason");
  ok(!run.results.includes("KY-04 Polling"), "the Gallrein polling card is still in the rendered grid");
  ok(!run.results.includes(GALLREIN_HEADLINE), "the Gallrein polling headline is still in the rendered grid");
  ok(!paintedHtml(run.win).includes(GALLREIN_HEADLINE),
    "the Gallrein polling card is off the grid but still painted somewhere else on the page — a lane, a chip, or the modal shell");
  // The tag it used to wear is recorded, because that is the thing a curator has
  // to decide about, and it is recorded in the ledger rather than on a card.
  ok(/Taxes|Economy|Jobs|General/.test(String((r || {}).taggedCategory || "") + " " + String((r || {}).taggedIssue || "")),
    "the ledger did not keep the issue tag the refused card was wearing");
}

// ═════════════════════════════════════════════════════════════════════════════
section("PHASE 2 — the refusals, on fixtures the gate has never seen");
// ═════════════════════════════════════════════════════════════════════════════
{
  const painted = paintedHtml(run.win);
  for (const f of REFUSED_FIXTURES) {
    const h = f.item.headline;
    const r = refusalFor(run.win, h);
    ok(!!r, `the fixture "${f.why}" never reached the gate — the fixture roster seat did not load`);
    eq((r || {}).code, f.code, `the fixture "${f.why}" was refused as "${(r || {}).code}"`);
    ok(!run.results.includes(h), `a refused fixture is in the rendered grid: ${f.why}`);
    ok(!painted.includes(h), `a refused fixture is painted somewhere on the page: ${f.why}`);
    // The reason travels with it. This is the whole value of a refusal that is
    // not a delete: the next pass can read why and decide.
    ok(String((r || {}).reason || "").length > 20, `the refusal for "${f.why}" carries no reason`);
    ok(String((r || {}).name || "") === FIX_NAME, `the refusal for "${f.why}" does not say whose row it is`);
  }

  // The brief's own example, restated as a direct call: polling + no source URL
  // + a Taxes & Economy tag is refused, and adding the tag back does not save it.
  const door = run.win.PDXEvidenceAdmit;
  eq(door.check(REFUSED_FIXTURES[0].item).ok, false,
    "polling copy with no source URL was admitted");
  eq(door.check({ headline: "Testwell on the grocery tax", facts: "A profile of the lawmaker's tax views." }).code, "no_source",
    "an item with no citation at all was refused for some reason other than the missing source");
}

// ═════════════════════════════════════════════════════════════════════════════
section("PHASE 3 — a floor-video receipt with a source URL still paints");
// ═════════════════════════════════════════════════════════════════════════════
{
  const h = ADMITTED_FIXTURE.headline;
  const v = run.win.PDXEvidenceAdmit.check(ADMITTED_FIXTURE);
  eq(v.ok, true, `the door refused a floor-video record on the official archive: ${v.code} — ${v.reason}`);
  eq(v.kind, "floor_video", `an official floor-video record was read as "${v.kind}"`);
  eq(v.sourceUrl, ADMITTED_FIXTURE.source.url, "the admitted verdict does not carry the citation the card opens");
  ok(!refusalFor(run.win, h), "the floor-video fixture was refused on a real boot: " +
    JSON.stringify(refusalFor(run.win, h) || {}));
  ok(run.results.includes(h), "the floor-video receipt is not in the rendered grid — the gate is eating receipts");
  ok(run.results.includes(ADMITTED_FIXTURE.source.url),
    "the floor-video card painted without the source link the gate resolved for it");

  // Existing admitted receipts stay. A gate that quietly halved the library
  // would satisfy every absence test above and still be a bad change, so the
  // shipped drawer is measured: most of what was there is still there.
  const shown = Number((run.countHtml.match(/<strong>(\d+)<\/strong>/) || [])[1] || 0);
  const total = Number((run.countHtml.match(/of (\d+) evidence item/) || [])[1] || 0);
  ok(total >= 60, `the admitted library holds only ${total} receipts — the gate is refusing curated evidence, not horserace clips`);
  eq(shown, total, `the unfiltered grid shows ${shown} of ${total} — an unasked-for filter is running`);
  const refusedCount = ledger(run.win).length;
  ok(refusedCount <= 20, `${refusedCount} items were refused — too many for a drawer that was mostly curated by hand`);
  ok(refusedCount >= REFUSED_FIXTURES.length + 1,
    `only ${refusedCount} items were refused, fewer than the ${REFUSED_FIXTURES.length + 1} this file planted`);
  eq(run.skels, 0, "the grid still holds skeleton placeholders — the gate broke the load, not just the cards");
}

// ═════════════════════════════════════════════════════════════════════════════
section('PHASE 4 — "No public source link recorded" cannot appear on a card');
// ═════════════════════════════════════════════════════════════════════════════
{
  const painted = paintedHtml(run.win);
  ok(!/public source link recorded/i.test(painted),
    "the page still prints a 'no public source link recorded' line somewhere — that sentence is a refusal, not a receipt");
  ok(!/No public source link/i.test(run.results), "the grid still prints the missing-source line");

  // Every visible card carries a live citation, which is the positive form of
  // the same claim: there is no card left for that sentence to appear on.
  // <article class="el-card …> is the card root; el-card-top and el-card-hint
  // are parts of one, so the root is counted by the tag it opens with.
  const cards = (run.results.match(/<article class="el-card/g) || []).length;
  const srcs = (run.results.match(/class="el-btn el-btn-src/g) || []).length;
  ok(cards > 0, "no cards to check");
  eq(srcs, cards, `${cards} cards painted but only ${srcs} carry a source link — a visible card with no citation is exactly what the gate is for`);

  // In the source: the sentence survives in ONE place, the refusal reason, and
  // that string is only ever written to the ledger.
  const hits = EL_CODE.split("\n").filter((l) => /No public source link recorded/.test(l));
  eq(hits.length, 1, `the missing-source sentence appears on ${hits.length} lines of code — it should survive only as the refusal reason`);
  ok(/no\('no_source'/.test(hits[0] || ""), "the surviving missing-source sentence is not the refusal reason — it is still a rendered string");
  const card = EL_CODE.slice(EL_CODE.indexOf("function _cardHtml("), EL_CODE.indexOf("function _cardHtml(") + 9000);
  const modal = EL_CODE.slice(EL_CODE.indexOf("function _modalContentHtml("), EL_CODE.indexOf("function _openModal("));
  ok(!/public source link/i.test(card), "_cardHtml can still print the missing-source line");
  ok(!/public source link/i.test(modal), "_modalContentHtml can still print the missing-source line");
  // Both surfaces open whatever citation the gate resolved, not just the one
  // field that used to be read.
  ok(/var srcHref = it\.url \|\| it\.sourceUrl/.test(EL_CODE), "the card no longer opens the citation the gate resolved");
  ok(/var mSrcHref = it\.url \|\| it\.sourceUrl/.test(EL_CODE), "the modal no longer opens the citation the gate resolved");
}

// ═════════════════════════════════════════════════════════════════════════════
section("PHASE 5 — a refusal is not a delete");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The row is untouched where it lives. This pass was not allowed to drop it,
  // and a gate that "fixed" the page by editing the data would have taken the
  // decision away from the curator who has to make it.
  ok(SD.includes(GALLREIN_HEADLINE), "the Gallrein row was deleted from spotlight-cards-data.js");
  ok(SD.includes("realclearpolling.com"), "the Gallrein row's citation was edited out of the data");
  ok(/gallrein: \[/.test(SD), "the gallrein key was removed from the spotlight data");

  // Nothing in the engine deletes or rewrites a source row.
  ok(!/delete (SD|CMP_DATA|window\.SPOTLIGHT_DATA)\[/.test(EL_CODE), "evidence-locker.js deletes rows out of the source data");
  ok(!/(rec\.spotlight|sources)\.splice\(/.test(EL_CODE), "evidence-locker.js splices rows out of a member's spotlight array");

  // The ledger is where a refusal lives, and it is read by nobody's renderer.
  ok(Array.isArray(run.win._pdxEvidenceRefused), "window._pdxEvidenceRefused is not an array — the refusals went nowhere");
  eq((EL_CODE.match(/_pdxEvidenceRefused/g) || []).length, 1,
    "_pdxEvidenceRefused is referenced more than once in the engine — the ledger is being rendered somewhere");
  const r = refusalFor(run.win, GALLREIN_HEADLINE);
  for (const k of ["id", "name", "headline", "code", "reason"]) {
    ok(!!(r || {})[k], `the ledger entry for the Gallrein card has no ${k} — a curator could not act on it`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("PHASE 6 — the fence, and the bump");
// ═════════════════════════════════════════════════════════════════════════════
{
  const ver = (SW.match(/const\s+CACHE_VERSION\s*=\s*'(v\d+)'/) || [])[1];
  must(!!ver, "sw.js has no CACHE_VERSION");
  ok(Number(ver.slice(1)) >= 201,
    `CACHE_VERSION is ${ver} — evidence-locker.js is precached, so a warm device would keep serving the ungated locker`);
  ok(/'\/evidence-locker\.js'/.test(SW) || /"\/evidence-locker\.js"/.test(SW),
    "evidence-locker.js is no longer precached — then this bump was not needed and the reasoning above it is wrong");
  const entry = SW.slice(SW.indexOf("// " + ver + " -"), SW.indexOf("const CACHE_VERSION"));
  ok(entry.includes("evidence-locker.js"), `the ${ver} log entry does not name evidence-locker.js, the file this pass changed`);
  ok(/refus|admit/i.test(entry), `the ${ver} log entry does not say what the bump carries`);

  // No new score. The gate decides what is SHOWN; it does not grade anything,
  // and the Strong / Moderate / Limited coverage label is computed from the same
  // three fields it always was.
  const v = run.win.PDXEvidenceAdmit.check(ADMITTED_FIXTURE);
  ok(!("score" in v) && !("grade" in v) && !("strength" in v),
    "an admission verdict carries a score — the gate was supposed to decide admission, not rank receipts");
  const strength = EL_CODE.slice(EL_CODE.indexOf("function _strength("), EL_CODE.indexOf("function _strength(") + 3000);
  ok(!/admitKind|verdict|_evAdmit/.test(strength),
    "_strength() now reads the gate's verdict — the coverage label moved in a pass that was not allowed to move it");
  ok(!/sourceUrl/.test(strength), "_strength() now reads the resolved citation, so existing Strong/Moderate/Limited labels shifted");

  // No WVA, no party sort, no /stances shelf.
  const gate = EL_CODE.slice(EL_CODE.indexOf("var EV_ADMIT_KINDS"), EL_CODE.indexOf("function _build()"));
  ok(!/PDXWordAction|wordAction|WVA/i.test(gate), "the admission gate reaches into the Word-vs-Action engine");
  ok(!/party/i.test(gate), "the admission gate reads party — admission is about the record, not the label on it");
  ok(!/value="party"/.test(EV), "a party sort appeared in the locker's sort options");
  for (const f of ["stances.html", "stance-helpers.js", "word-action.js"]) {
    must(HAS(f), `${f} is missing — a file this fence measures against`);
    ok(!/PDXEvidenceAdmit|_evAdmit/.test(R(f)), `${f} now calls the admission gate — the /stances shelves were out of scope`);
  }
  ok(run.mounted, "the locker did not mount on a gated boot");
  ok(run.win.PDXEvidenceLocker && typeof run.win.PDXEvidenceLocker.count === "function",
    "the locker's public count() is gone — four other surfaces read it");
}

// ── Result ───────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ evidence admission — ${failures.length} of ${passed + failures.length} assertions failed:\n`);
  failures.forEach((f) => console.error("  · " + f));
  process.exit(1);
}
console.log(`\n✓ evidence admission — the drawer admits receipts, not horserace clips — ${passed} assertions passed\n`);
