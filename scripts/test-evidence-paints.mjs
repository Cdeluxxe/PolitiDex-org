#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-evidence-paints.mjs — /evidence paints its receipts, and the boot does
// not assume the homepage patched it
// ─────────────────────────────────────────────────────────────────────────────
// The eighth split moved the Evidence Locker workspace onto its own document.
// It shipped broken, and broken in the most expensive way a data room can be:
// the chrome arrived, the filters arrived, and the status line sat there reading
// "Loading evidence… 88/88" over six shimmer cards. Every receipt had been
// built and was sitting in memory. The page said they were still coming.
//
// Two independent faults, both the same mistake — code that grew up on `/`
// reaching for something only `/` defines:
//
//   1. firebase-boot.js read `_originalAddEventListener` BY NAME. That variable
//      belongs to the deferred-DOMContentLoaded block index.html, person.html,
//      issue.html and me.html each carry a copy of. evidence.html carries no
//      such block, and a bare read of an undeclared identifier is not undefined
//      — it is a ReferenceError. It threw at top level, ABOVE
//      auth.onAuthStateChanged, so /evidence never signed in anonymously and
//      never asked for the roster index.
//   2. stance-helpers.js's People's Mandate chip calls
//      `window._pdxMandateForIssue` unguarded, and only index.html defines it.
//      It threw from inside _cardHtml → _renderDiscovery → the locker's
//      finish(), which is to say AFTER the _build() try/catch and BEFORE the
//      line that hid the spinner.
//
// So this file pins the shape of the fix rather than the two symptoms, because
// the symptoms are cheap to re-introduce and there are six shells to
// re-introduce them on:
//
//   PHASE 0 — the boot reads no homepage-only name bare. Both identifiers are
//             resolved at CALL time behind a typeof, through two helpers, and
//             every former bare call site goes through them.
//   PHASE 1 — evidence.html BOOTS. Every script in the document runs, in
//             document order, in a sandbox with no homepage block in sight, and
//             nothing throws a ReferenceError. Anonymous sign-in is reached.
//   PHASE 2 — with the homepage block present the boot still uses the DEFERRED
//             path and still releases the queue. index.html is not collateral.
//   PHASE 3 — a stubbed 88-shard load PAINTS. Every shard resolves, the spinner
//             comes down, and the grid holds receipt cards and no skeletons.
//   PHASE 4 — the floor. When a render throws anyway, the finished load states
//             a count instead of sitting on shimmer — including "0 receipts on
//             file", which is a perfectly good thing to say.
//   PHASE 5 — no scoring explainer in the room. The strength dots stay as a
//             coverage label; nothing on the page offers to explain a grade.
//   PHASE 6 — the fence. No locker data, no score, no WVA, no /stances shelf.
//
//   node scripts/test-evidence-paints.mjs
//
// The shipped documents are read as text and RUN: every <script> in
// evidence.html, in order, against a DOM stub small enough to see exactly what
// the page touches, and a virtual clock so a 15 000 ms watchdog can never beat
// a promise that settles at 0 ms. That is the only way to prove "it boots" —
// the whole defect was one identifier in one branch of one file that no amount
// of grepping would have called wrong.

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const HAS = (f) => existsSync(join(ROOT, f));

const EV = R("evidence.html");
const BOOT = R("firebase-boot.js");
const EL = R("evidence-locker.js");
const IDX = R("index.html");
const SW = R("sw.js");

// Full-line `//` comments only. This file asks questions about which
// identifiers the CODE reads, and the answer must not be swayed by a comment
// that names one — the block above this one names both of them twice.
const codeOnly = (s) => String(s).split("\n")
  .filter((l) => !/^\s*\/\//.test(l)).join("\n");
const BOOT_CODE = codeOnly(BOOT);

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const must = (cond, msg) => {
  if (!cond) { console.error(`\n✗ evidence paints — PRECONDITION FAILED: ${msg}\n`); process.exit(1); }
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

  let href = "https://politidex.fyi" + (opts.pathname || "/evidence") + (opts.search || "");
  const location = {
    pathname: opts.pathname || "/evidence", search: opts.search || "", hash: opts.hash || "",
    origin: "https://politidex.fyi", host: "politidex.fyi",
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
section("PHASE 0 — the boot reads no homepage-only name bare");
// ═════════════════════════════════════════════════════════════════════════════
{
  ok(/function _pdxAtDomReady\(/.test(BOOT_CODE),
    "firebase-boot.js has no _pdxAtDomReady — nothing resolves the deferred listener at call time");
  ok(/function _pdxReleaseDeferred\(/.test(BOOT_CODE),
    "firebase-boot.js has no _pdxReleaseDeferred — nothing releases the queue safely");

  // Every read of either homepage name must sit behind a typeof on the SAME
  // line. A bare read is the whole defect, and it is one character of edit away.
  // A guard can sit on the line above the read — `(typeof X === 'function')` on
  // one line and `? X : fallback` on the next is the same expression — so each
  // occurrence is judged against the whole STATEMENT it lives in.
  const stmts = BOOT_CODE.split(/;\n/);
  for (const name of ["_originalAddEventListener", "_checkAndTrigger"]) {
    const hits = stmts.filter((st) => st.includes(name));
    ok(hits.length > 0, `firebase-boot.js no longer mentions ${name} at all — the deferred handoff was deleted, not guarded`);
    for (const st of hits) {
      ok(new RegExp("typeof\\s+" + name).test(st),
        `firebase-boot.js reads ${name} without a typeof guard: ${st.trim().replace(/\s+/g, " ").slice(0, 100)}`);
    }
  }
  // …and the fallbacks are real: something to call when the homepage block is
  // absent, and nothing to call when there is no queue.
  const ready = BOOT_CODE.slice(BOOT_CODE.indexOf("function _pdxAtDomReady("));
  ok(/document\.addEventListener/.test(ready.slice(0, 500)),
    "_pdxAtDomReady has no fallback to the document's own addEventListener — on an unpatched shell it would bind nothing");
  ok(/readyState/.test(ready.slice(0, 500)),
    "_pdxAtDomReady does not check readyState — a script that loads after the event would never run its callback");

  // No bare call sites left anywhere in the file.
  const bareCalls = BOOT_CODE.split("\n").filter((l) => /(?<!typeof\s)\b_checkAndTrigger\(\)/.test(l) && !/typeof/.test(l));
  eq(bareCalls.length, 0, "firebase-boot.js still calls _checkAndTrigger() directly");
  ok((BOOT_CODE.match(/_pdxReleaseDeferred\(\);/g) || []).length >= 4,
    "fewer than four release sites go through _pdxReleaseDeferred — one of the auth paths still releases the queue its own way");

  // The shells. Four carry the homepage block; the rest do not, and the boot is
  // on documents in both groups. This is the assertion that generalises: the
  // fallback has to hold for whichever shells load the boot NEXT, too.
  const SHELLS = ["index.html", "person.html", "issue.html", "me.html", "evidence.html", "stances.html", "ballot.html"];
  let loadsBoot = 0, unpatchedWithBoot = 0;
  for (const f of SHELLS) {
    must(HAS(f), `${f} is missing — the shell list this fence is built on moved`);
    const s = R(f);
    const hasBoot = /src="\/firebase-boot\.js"/.test(s);
    const hasPatch = /_originalAddEventListener\s*=\s*document\.addEventListener/.test(s);
    if (hasBoot) loadsBoot++;
    if (hasBoot && !hasPatch) unpatchedWithBoot++;
  }
  ok(loadsBoot >= 5, `only ${loadsBoot} shells load firebase-boot.js — the shell survey is out of date`);
  ok(unpatchedWithBoot >= 1,
    "every shell that loads firebase-boot.js also carries the homepage block, so this fence proves nothing — the point is the shells that do NOT");
  ok(/src="\/firebase-boot\.js"/.test(EV),
    "evidence.html no longer loads firebase-boot.js — the document it broke on");
  ok(!/_originalAddEventListener\s*=\s*document\.addEventListener/.test(EV),
    "evidence.html now carries a copy of the homepage block — the fix was to stop needing it, not to paste it");
}

// ═════════════════════════════════════════════════════════════════════════════
section("PHASE 1 — evidence.html boots, with no homepage block in sight");
// ═════════════════════════════════════════════════════════════════════════════
const cold = await bootEvidence();
{
  eq(cold.refErrors.length, 0,
    "evidence.html threw a ReferenceError while booting: " + cold.refErrors.map((e) => e.label + " :: " + e.message).join(" | "));
  const fatal = cold.errs.filter((e) => !/firebase-config/.test(e.label));
  eq(fatal.length, 0, "a script in evidence.html threw at load: " + fatal.map((e) => e.label + " :: " + e.name + ": " + e.message).join(" | "));
  ok(cold.ran.length > 20, `only ${cold.ran.length} script blocks ran — the document walk stopped early`);
  ok(cold.missing.every((f) => /firebase-config/.test(f)),
    "a local script evidence.html loads is not in the repo: " + cold.missing.join(", "));

  // The consequence of the ReferenceError, pinned directly: the boot ran PAST
  // the deferred-listener line and reached the auth it was standing in front of.
  ok(cold.rec.initialized, "firebase.initializeApp() was never reached on /evidence");
  ok(cold.rec.watched, "auth.onAuthStateChanged() was never reached — this is exactly what the bare read used to prevent");
  ok(cold.rec.signedInAnon, "/evidence never signed in anonymously, so it would never be allowed to read the roster");
  eq(cold.mounted, true, "the locker never mounted on /evidence");
}

// ═════════════════════════════════════════════════════════════════════════════
section("PHASE 2 — with the homepage block present, the deferred path still wins");
// ═════════════════════════════════════════════════════════════════════════════
{
  // index.html itself is untouched by this pass, and the block the boot used to
  // read by name is still there, in the same shape.
  ok(/var _originalAddEventListener = document\.addEventListener;/.test(IDX),
    "index.html no longer stashes the real addEventListener — the deferred boot it owns was changed");
  ok(/function _checkAndTrigger\(\)/.test(IDX), "index.html no longer defines _checkAndTrigger");
  ok(/document\.addEventListener = _originalAddEventListener;/.test(IDX),
    "index.html never restores the real addEventListener — the homepage block lost its own release");

  const warm = await bootEvidence({ homepagePatch: true });
  eq(warm.refErrors.length, 0, "a boot WITH the homepage block threw a ReferenceError: " + warm.refErrors.map((e) => e.message).join(" | "));
  ok(warm.rec.signedInAnon, "a boot with the homepage block never reached anonymous sign-in");
  // The boot bound through the patched path, not around it: the queue the block
  // owns saw listeners, and the release ran through _checkAndTrigger.
  ok((warm.win.__hp || {}).before > 0,
    "the homepage block's DOMContentLoaded queue was empty at DOM-ready — the boot bypassed the patch instead of using it");
  ok(warm.win._triggered > 0, "_checkAndTrigger was never called — _pdxReleaseDeferred does not release the homepage queue");
  eq(warm.mounted, true, "the locker did not mount when the homepage block was present");
}

// ═════════════════════════════════════════════════════════════════════════════
section("PHASE 3 — a stubbed 88-shard load paints receipts");
// ═════════════════════════════════════════════════════════════════════════════
{
  const shards = { calls: [], ids: new Set() };
  const run = await bootEvidence({
    afterLoad(win) {
      // Stand in for the per-member Firestore fetch: resolve every shard, and
      // count them. This is the load that reported 88/88 and painted nothing.
      win._pdxEnsureFullProfile = function (id) {
        shards.calls.push(id); shards.ids.add(id);
        return Promise.resolve(null);
      };
      win._pdxRosterState = "ready";
    },
  });
  ok(shards.calls.length > 0, "the locker never asked for a single profile shard — the load never started");
  ok(shards.ids.size >= 80, `the priority wave asked for only ${shards.ids.size} shards — the Utah roster this room loads is 88`);
  eq(shards.calls.length, shards.ids.size, "a profile shard was requested more than once");

  // Done means done.
  eq(run.statusDisplay, "none",
    `the status line is still showing after a finished load: ${JSON.stringify(run.statusHtml.slice(0, 120))}`);
  ok(!/Loading evidence/.test(run.statusHtml) || run.statusDisplay === "none",
    "the page still reads 'Loading evidence…' after every shard resolved");
  ok(run.cards > 0, `the grid holds ${run.cards} receipt cards after a finished 88-shard load`);
  eq(run.skels, 0, "the grid still holds skeleton placeholders after a finished load — this is the freeze");
  ok(/el-card/.test(run.results), "the grid's HTML contains no receipt class at all");
  ok(run.countHtml.length > 0, "the count line says nothing after a finished load");
  eq(run.refErrors.length, 0, "the 88-shard load threw a ReferenceError: " + run.refErrors.map((e) => e.message).join(" | "));
  eq(run.runtimeErrors.length, 0, "the 88-shard load threw at runtime: " + run.runtimeErrors.map((s) => String(s).split("\n")[0]).join(" | "));
  ok(!/load watchdog fired/.test(run.statusHtml), "the watchdog, not the shards, is what finished this load");

  // The second fault, at its source: the shared Mandate helper is a homepage
  // global, and evidence.html now answers for it the way person.html and
  // issue.html already do.
  ok(/window\._pdxMandateForIssue/.test(EV),
    "evidence.html does not define window._pdxMandateForIssue — stance-helpers.js calls it unguarded from inside a receipt card");
  ok(typeof run.win._pdxMandateForIssue === "function",
    "_pdxMandateForIssue is not a function on a booted /evidence");
}

// ═════════════════════════════════════════════════════════════════════════════
section("PHASE 4 — the floor: a finished load states a count, never shimmer");
// ═════════════════════════════════════════════════════════════════════════════
{
  ok(/function _statedFloor\(\)/.test(EL), "evidence-locker.js has no _statedFloor — nothing catches a grid that failed to draw");
  ok(/function _guarded\(/.test(EL), "evidence-locker.js has no _guarded — a throw in one surface still unwinds finish()");
  // Order is the whole point: the spinner must come down BEFORE the two widest
  // render calls, not after them.
  // Comments out: the block that explains this ordering NAMES both render calls
  // several lines above the line that hides the spinner, and would invert the
  // measurement it exists to document.
  const fin = EL.slice(EL.indexOf("function finish() {"));
  const end = fin.indexOf("\n      function pump()");
  const body = codeOnly(fin.slice(0, end > 0 ? end : 6000));
  const hide = body.indexOf("status.style.display = 'none'");
  const filters = body.indexOf("_populateFilters");
  const discovery = body.indexOf("_renderDiscovery");
  const floor = body.indexOf("_statedFloor()");
  ok(hide > 0 && filters > 0 && discovery > 0 && floor > 0, "finish() no longer has the steps this ordering is about");
  ok(hide < filters && hide < discovery, "finish() still hides the spinner after the filter and discovery renders — the freeze is back");
  ok(floor > discovery, "_statedFloor() does not run after the renders it is the floor under");
  ok(/_guarded\('the receipt grid', _render\)/.test(EL), "the receipt grid render is not wrapped");
  ok(/receipt' \+ \(n === 1 \? '' : 's'\) \+ ' on file'/.test(EL), "the floor does not state its count as 'N receipt(s) on file'");

  // And it holds in the sandbox. A throwing Mandate helper reproduces the
  // shipped defect exactly — it threw from inside _cardHtml — and the page must
  // still come out of it saying something true.
  const poisoned = await bootEvidence({
    afterLoad(win) {
      win._pdxEnsureFullProfile = () => Promise.resolve(null);
      win._pdxMandateForIssue = function () { throw new Error("harness: homepage global missing"); };
    },
  });
  eq(poisoned.statusDisplay, "none",
    "a render that threw left the spinner up — the page says receipts are still coming when they are not");
  eq(poisoned.skels, 0, "a render that threw left the skeleton cards in the grid");
  ok(/receipts? on file/.test(poisoned.results + poisoned.countHtml) || poisoned.cards > 0,
    "a render that threw left the grid saying nothing at all");
  ok(poisoned.mounted, "the locker unmounted itself when a render threw");

  // Zero is a fine number to print. Strip the evidence but keep the roster, and
  // poison the grid draw: the load finishes with nothing to show and says so,
  // rather than leaving six shimmer cards up forever.
  const nothing = await bootEvidence({
    afterLoad(win) {
      win._pdxEnsureFullProfile = () => Promise.resolve(null);
      win.SPOTLIGHT_DATA = {};
      const D = win.CMP_DATA || {};
      Object.keys(D).forEach((k) => {
        const rec = D[k];
        if (!rec || typeof rec !== "object") return;
        ["votes", "statements", "evidence", "spotlight", "bills", "sponsored", "positions", "quotes"].forEach((f) => { delete rec[f]; });
      });
      // The grid gets written exactly twice on the way to a finished load: the
      // skeletons _load() puts up, then whatever finish() draws over them. Fail
      // the SECOND write and nothing else, so what is under test is the floor
      // and not the poison — the third write, the floor's own, must land.
      const results = win.document.getElementById("el-results");
      let writes = 0, held = String(results.innerHTML || "");
      Object.defineProperty(results, "innerHTML", {
        configurable: true,
        get() { return held; },
        set(v) {
          writes++;
          if (writes === 2) throw new Error("harness: grid draw failed");
          held = String(v);
        },
      });
      // Every line the count has ever said, because the broadened wave lands
      // afterwards and re-renders honestly over the floor. What is being proven
      // is that the floor spoke, not that it had the last word.
      const count = win.document.getElementById("el-count");
      const said = (win.__said = []);
      let countHeld = String(count.innerHTML || "");
      Object.defineProperty(count, "innerHTML", {
        configurable: true,
        get() { return countHeld; },
        set(v) { said.push(String(v)); countHeld = String(v); },
      });
    },
  });
  ok((nothing.win.__said || []).some((v) => /<strong>0<\/strong> receipts on file/.test(v)),
    "a finished load with nothing on file never stated its zero — the floor said " +
    JSON.stringify((nothing.win.__said || []).map((v) => v.replace(/<[^>]+>/g, "")).join(" → ").slice(0, 160)));
  ok(!/el-skel/.test(nothing.results),
    "a load with nothing on file was left holding skeleton cards");
  eq(nothing.skels, 0, "a load with nothing on file sat on skeleton cards");
  eq(nothing.statusDisplay, "none", "a load with nothing on file left the spinner up");
}

// ═════════════════════════════════════════════════════════════════════════════
section("PHASE 5 — no scoring explainer in this room");
// ═════════════════════════════════════════════════════════════════════════════
{
  eq((EV.match(/badges are scored/g) || []).length, 0,
    "evidence.html still offers to explain how the strength badges are scored");
  ok(!/How the Strong \/ Moderate \/ Limited/.test(EV), "the strength-scoring explainer control is still on evidence.html");
  // The control opened a homepage modal. Nothing on /evidence may reach for it.
  const evCode = EV.replace(/<!--[\s\S]*?-->/g, " ");
  ok(!/m-strength/.test(evCode), "evidence.html still references the homepage #m-strength modal");
  ok(!/\b0[–-]100\b/.test(evCode) || !/strength/i.test(evCode.slice(Math.max(0, evCode.search(/\b0[–-]100\b/)) - 300, evCode.search(/\b0[–-]100\b/) + 300)),
    "evidence.html describes strength on a 0–100 scale");
  // The dots themselves stay — they are a coverage label and they are the only
  // thing this pass was allowed to keep.
  ok(/el-str/.test(EV) || /el-str/.test(EL), "the strength dots are gone from the locker entirely — they were meant to stay");
  ok(/strength/i.test(EL), "evidence-locker.js no longer computes a strength label at all");
}

// ═════════════════════════════════════════════════════════════════════════════
section("PHASE 6 — the fence, and the bump");
// ═════════════════════════════════════════════════════════════════════════════
{
  const ver = (SW.match(/const\s+CACHE_VERSION\s*=\s*'(v\d+)'/) || [])[1];
  must(!!ver, "sw.js has no CACHE_VERSION");
  ok(Number(ver.slice(1)) >= 200, `CACHE_VERSION is ${ver} — the three files this pass changed are precached and a warm device would keep the broken boot`);
  // THE ENTRY THIS FENCE READS IS v200's, NAMED, NOT WHATEVER IS LIVE.
  // An earlier draft sliced the log at the CURRENT CACHE_VERSION and asserted the
  // entry named the files THIS pass changed. That is true of exactly one entry —
  // the one written by this pass — so the assertion held until the next unrelated
  // bump and then failed with a message about somebody else's pass. The log is
  // append-only and its entries are immutable, so the pin is the version that
  // made the claim; the live version is still checked, as a floor, above.
  const at = SW.indexOf("// v200 - ");
  ok(at >= 0, "the v200 entry — the one that shipped this boot and render-ordering fix — is gone from the log");
  const next = SW.indexOf("\n// v201 - ", at);
  const entry = at >= 0 ? SW.slice(at, next > at ? next : at + 12000) : "";
  for (const f of ["firebase-boot.js", "evidence.html", "evidence-locker.js"]) {
    ok(entry.includes(f), `the v200 log entry no longer names ${f}, which that pass changed`);
  }
  ok(/\/firebase-boot\.js/.test(SW), "firebase-boot.js is no longer precached");

  // Nothing about the record moved. The locker's data, the scores, the
  // Word-vs-Action engine and the /stances shelves are all somebody else's
  // pass, and this one is a boot fix and a render ordering fix.
  ok(HAS("stances.html") && !/src="\/firebase-boot\.js"/.test(R("stances.html")),
    "stances.html started loading the boot in a pass that was not allowed to touch it");
  ok(!/_statedFloor/.test(R("stances.html")), "the locker's floor leaked onto /stances");
  const STANCE_ENGINES = ["stance-tree.js", "alignment-tool.js", "word-action.js"];
  for (const f of STANCE_ENGINES) {
    ok(HAS(f), `${f} is missing — a shared stance engine went with this pass`);
  }
  ok(/function _build\(\)/.test(EL), "evidence-locker.js lost _build() — the index this room renders");
  ok(cold.win.PDXEvidenceLocker && typeof cold.win.PDXEvidenceLocker.count === "function",
    "the locker's public count() is gone — four other surfaces read it");
}

// ── Result ───────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ evidence paints — ${failures.length} of ${passed + failures.length} assertions failed:\n`);
  failures.forEach((f) => console.error("  · " + f));
  process.exit(1);
}
console.log(`\n✓ evidence paints — ${passed} assertions passed\n`);
