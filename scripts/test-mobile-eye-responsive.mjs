/* ═══════════════════════════════════════════════════════════════════════════
   test-mobile-eye-responsive.mjs — on a phone the search keeps up and scrolls
   ────────────────────────────────────────────────────────────────────────────
   WHAT WAS REPORTED

   On a phone the All-Seeing Eye froze while typing, the open panel locked up
   mid-scroll, and the whole flow felt heavy. Desktop was fine.

   WHAT THIS FILE PINS (touch screen = `(hover: none) and (pointer: coarse)`)

     1. A short one-line keystroke forces no layout. growField() neither reads
        computed style nor writes `height: auto` for "lee". A paste still
        measures and grows the field.
     2. Focus paints one frame after the caret, not in the focus task.
     3. A background repaint waits for the thumb. While the pane is touched or
        flung, a late source (saved collection, warming recheck) does not
        replace its contents. Once the gesture has been still, it paints once
        and the reader's scroll position is kept.
     4. The reader's own keystroke is never held back by a gesture.
     5. The keystroke paint measures no row (no forced layout after innerHTML).
     6. A tap on plain page background closes the panel when the finger
        lifts. A drag (a page scroll) does not close it.
     7. The pane stays scrollable and the page is never locked. The pane owns
        its scroll (overflow-y: auto, overscroll contained), its cap follows
        the visible viewport above the keyboard, and opening the eye writes
        no scroll lock.
     8. Desktop is unchanged: focus paints synchronously and growField()
        measures every time.
     9. The stylesheet facts: a 16px field on touch (no iOS focus zoom), no
        overlay blur on phones, and the shell moved a version.

   Real shipped modules in a node:vm sandbox with a mini-DOM, a driven clock
   and a driven animation frame.

     node scripts/test-mobile-eye-responsive.mjs
   ═══════════════════════════════════════════════════════════════════════════ */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { ENGINE_FILES, makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const EYE_SRC = R("all-seeing-eye.js");
const PAGE = R("index.html");
const MPCSS = R("mobile-polish.css");
const SW = R("sw.js");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const section = (t) => console.log(`   ── ${t}`);
const must = (cond, msg) => {
  if (cond) return;
  console.error(`\n✗ mobile eye responsive: STALE HARNESS — ${msg}\n`);
  process.exit(2);
};

// ── the mini-DOM ────────────────────────────────────────────────────────────
function stubNode() {
  const set = new Set();
  const n = {
    id: "", className: "", innerHTML: "", textContent: "", value: "", tagName: "DIV",
    dataset: {}, hidden: false, _attrs: {}, _li: {},
    classList: {
      add: (c) => set.add(c), remove: (c) => set.delete(c),
      toggle: (c, on) => (on === undefined ? (set.has(c) ? set.delete(c) : set.add(c)) : (on ? set.add(c) : set.delete(c))),
      contains: (c) => set.has(c),
    },
    setAttribute(k, v) { n._attrs[k] = String(v); },
    getAttribute(k) { return k in n._attrs ? n._attrs[k] : null; },
    removeAttribute(k) { delete n._attrs[k]; },
    focus() {}, blur() {}, scrollIntoView() {}, click() {},
    addEventListener(t, f) { (n._li[t] = n._li[t] || []).push(f); },
    removeEventListener() {}, remove() {},
    appendChild: (c) => c, insertBefore: (c) => c, insertAdjacentHTML() {},
    querySelector: () => null, querySelectorAll: () => [], closest: () => null,
    contains: () => true, matches: () => false,
    getBoundingClientRect: () => ({ top: 0, left: 0, width: 320, height: 44, bottom: 44, right: 320 }),
  };
  // Every style write is recorded, so "no layout was forced" is countable.
  n.styleWrites = [];
  n.style = new Proxy({ setProperty() {}, removeProperty() {} }, {
    set(t, k, v) { t[k] = v; n.styleWrites.push(k + "=" + v); return true; },
  });
  return n;
}

function makeClock(win) {
  let now = 0, seq = 0;
  const timers = new Map();
  const frames = [];
  win.setTimeout = (fn, ms) => { const id = ++seq; timers.set(id, { fn, at: now + (Number(ms) || 0) }); return id; };
  win.clearTimeout = (id) => { timers.delete(id); };
  win.setInterval = () => 0;
  win.clearInterval = () => {};
  win.requestAnimationFrame = (fn) => { frames.push(fn); return frames.length; };
  win.cancelAnimationFrame = () => {};
  win.performance = { now: () => now };
  win.Date = class extends Date { static now() { return now; } };
  return {
    tick(ms) {
      now += Number(ms) || 0;
      const due = [...timers.entries()].filter(([, t]) => t.at <= now).sort((a, b) => a[1].at - b[1].at);
      for (const [id, t] of due) { timers.delete(id); try { t.fn(); } catch { /* guarded */ } }
      return due.length;
    },
    frame() {
      const q = frames.splice(0, frames.length);
      for (const f of q) { try { f(); } catch { /* guarded */ } }
      return q.length;
    },
    armed() { return frames.length; },
  };
}

function boot({ touch }) {
  const win = makeSandbox();
  win.matchMedia = (q) => ({
    matches: !!touch && /hover:\s*none/.test(q) && /pointer:\s*coarse/.test(q),
    addEventListener() {}, addListener() {},
  });
  const panel = stubNode(), input = stubNode(), eye = stubNode(), clear = stubNode();
  input.tagName = "TEXTAREA";
  input.scrollHeight = 22;
  panel.scrollTop = 0;
  panel.paints = [];
  let html = "";
  Object.defineProperty(panel, "innerHTML", {
    get() { return html; },
    set(v) { html = String(v); panel.paints.push(html); panel.scrollTop = 0; },
  });
  Object.defineProperty(panel, "offsetHeight", { get() { return 400; } });
  panel.getBoundingClientRect = () => ({ top: 120, left: 0, width: 360, height: 400, bottom: 520, right: 360 });

  // Rows are counted when measured — a row rect read after a paint is a forced layout.
  let rowRects = 0;
  panel.querySelectorAll = (sel) => {
    if (String(sel).indexOf("pdx-eye-res") < 0) return [];
    return [...html.matchAll(/class="pdx-eye-res[^"]*"[^>]*data-i="(\d+)"/g)].map((m) => {
      const r = stubNode();
      r.setAttribute("data-i", m[1]);
      r.getBoundingClientRect = () => { rowRects++; return { top: 0, bottom: 44, height: 44 }; };
      return r;
    });
  };

  const outside = { id: "page-bg" };
  eye.contains = (t) => t !== outside;
  const ids = { "pdx-eye-panel": panel, "pdx-eye-input": input, "pdx-eye": eye, "pdx-eye-clear": clear };
  win.document.getElementById = (id) => ids[id] || null;
  const docLi = {};
  win.document.addEventListener = (t, f) => { (docLi[t] = docLi[t] || []).push(f); };
  win.document.activeElement = input;
  const winLi = {};
  win.addEventListener = (t, f) => { (winLi[t] = winLi[t] || []).push(f); };
  win.history = { replaceState() {}, pushState() {} };
  win.innerHeight = 800;
  const vvLi = {};
  win.visualViewport = { height: 800, offsetTop: 0, addEventListener: (t, f) => { (vvLi[t] = vvLi[t] || []).push(f); } };
  let computed = 0;
  win.getComputedStyle = () => { computed++; return { lineHeight: "22px", getPropertyValue() { return ""; } }; };
  const clock = makeClock(win);

  const ctx = vm.createContext(win);
  for (const f of [...ENGINE_FILES, "pdx-issue-family.js", "issue-colors.js", "profile-evidence.js", "person-link.js"]) {
    vm.runInContext(R(f), ctx, { filename: f });
  }
  win.PROFILES = win.CMP_DATA;
  win.PDXLazyData = { ensure: () => Promise.resolve(true), loaded: () => true, whenReady: (k, cb) => cb() };
  win.PDX_BILLS_INDEX = win.PDX_BILLS_INDEX || [];
  win._issueLabel = () => "";
  win.PDXSaved = { list: () => [], has: () => false };
  vm.runInContext(EYE_SRC, ctx, { filename: "all-seeing-eye.js" });
  must(win.PDXEye && typeof win.PDXEye.render === "function", "PDXEye.render is unavailable");

  const fire = (node, type, ev) => { (node._li[type] || []).forEach((f) => f(ev || {})); };
  return {
    win, panel, input, eye, clock, outside,
    fire, docFire: (type, ev) => (docLi[type] || []).forEach((f) => f(ev || {})),
    winEvent: (type) => (winLi[type] || []).forEach((f) => f({ type })),
    vvResize: () => (vvLi.resize || []).forEach((f) => f({})),
    computed: () => computed,
    rowRects: () => rowRects,
    resetRowRects: () => { rowRects = 0; },
    type(q) { input.value = q; fire(input, "input"); },
  };
}

// ═════════════════════════════════════════════════════════════════════════════
section("1 · a short keystroke forces no layout on a phone");
// ═════════════════════════════════════════════════════════════════════════════
{
  const B = boot({ touch: true });
  const c0 = B.computed(), w0 = B.input.styleWrites.length;
  for (const q of ["l", "le", "lee"]) B.type(q);
  ok(B.computed() === c0, `typing "lee" on a phone read computed style ${B.computed() - c0} time(s)`);
  ok(!B.input.styleWrites.slice(w0).some((w) => w === "height=auto"),
    "typing a short query on a phone wrote height:auto, which forces a synchronous layout per keystroke");
  // A paste still grows the field.
  B.input.scrollHeight = 66;
  B.type("Mike Lee voted against the infrastructure bill in 2021 and said so");
  ok(B.input.styleWrites.includes("height=66px"),
    "a long paste on a phone no longer grows the field (got " + B.input.styleWrites.slice(-3).join(", ") + ")");
  // And shrinking back to a short query takes the measured path once.
  B.input.scrollHeight = 22;
  B.type("lee");
  ok(B.input.styleWrites[B.input.styleWrites.length - 1] === "height=22px",
    "a grown field did not return to one line when the paste was replaced by a short query");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · focus paints one frame after the caret");
// ═════════════════════════════════════════════════════════════════════════════
{
  const B = boot({ touch: true });
  const p0 = B.panel.paints.length;
  B.fire(B.input, "focus");
  ok(B.panel.paints.length === p0, "focus on a phone painted the panel inside the focus task");
  ok(B.clock.armed() > 0, "focus on a phone armed no frame for the panel");
  B.clock.frame();
  ok(B.panel.paints.length === p0 + 1, `the focus frame painted ${B.panel.paints.length - p0} time(s), want 1`);
  ok(B.eye.classList.contains("is-open"), "the focus frame did not open the panel");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · a late source waits for the thumb, then keeps the reader's place");
// ═════════════════════════════════════════════════════════════════════════════
{
  const B = boot({ touch: true });
  B.type("lee"); B.clock.tick(200);
  must(B.eye.classList.contains("is-open") && B.panel.paints.length > 0, "the keystroke did not open the panel");
  B.clock.frame(); // drain the fit frame
  const p0 = B.panel.paints.length;
  B.fire(B.panel, "touchstart");
  B.panel.scrollTop = 180;
  B.fire(B.panel, "scroll");
  B.winEvent("pdx-saved-change");
  B.winEvent("pdx-issue-votes");
  B.clock.frame();
  B.clock.tick(1000);
  B.clock.frame();
  ok(B.panel.paints.length === p0, `a late source repainted the pane ${B.panel.paints.length - p0} time(s) under a held finger`);
  ok(B.panel.scrollTop === 180, "the pane's scroll moved while the reader's finger was on it");
  B.fire(B.panel, "touchend");
  B.clock.tick(200); B.clock.frame();
  ok(B.panel.paints.length === p0, "a late source repainted mid-fling (inside the gesture idle window)");
  B.clock.tick(400); B.clock.frame();
  ok(B.panel.paints.length === p0 + 1, `once the gesture was still the pane painted ${B.panel.paints.length - p0} time(s), want 1`);
  ok(B.panel.scrollTop === 180, `the held repaint lost the reader's place (scrollTop ${B.panel.scrollTop})`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the reader's own keystroke is never held");
// ═════════════════════════════════════════════════════════════════════════════
{
  const B = boot({ touch: true });
  B.type("le"); B.clock.tick(200);
  B.fire(B.panel, "touchstart");
  const p0 = B.panel.paints.length;
  B.type("lee"); B.clock.tick(200);
  ok(B.panel.paints.length === p0 + 1, "a keystroke paint waited behind a touch on the pane");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the keystroke paint measures no row on a phone");
// ═════════════════════════════════════════════════════════════════════════════
{
  const B = boot({ touch: true });
  B.type("lee"); B.clock.tick(200);
  B.resetRowRects();
  B.type("lees"); B.clock.tick(200);
  B.type("lee"); B.clock.tick(200);
  ok(B.rowRects() === 0, `keystroke paints measured ${B.rowRects()} row(s) — a forced layout per keystroke`);
  // A hardware keyboard's arrow still scrolls the highlight into view.
  B.fire(B.input, "keydown", { key: "ArrowDown", preventDefault() {} });
  ok(B.rowRects() > 0, "ArrowDown on a phone with a keyboard no longer checks the highlight is in view");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · a tap on the page closes the panel; a scroll does not");
// ═════════════════════════════════════════════════════════════════════════════
{
  const B = boot({ touch: true });
  B.type("lee"); B.clock.tick(200);
  must(B.eye.classList.contains("is-open"), "the panel did not open");
  B.docFire("pointerdown", { pointerType: "touch", target: B.outside, clientX: 50, clientY: 600 });
  B.docFire("pointerup", { pointerType: "touch", target: B.outside, clientX: 50, clientY: 340 });
  ok(B.eye.classList.contains("is-open"), "a page scroll (drag) outside the eye closed the panel");
  B.docFire("pointerdown", { pointerType: "touch", target: B.outside, clientX: 50, clientY: 600 });
  B.docFire("pointercancel", {});
  B.docFire("pointerup", { pointerType: "touch", target: B.outside, clientX: 50, clientY: 600 });
  ok(B.eye.classList.contains("is-open"), "a cancelled pointer (the browser took it for a scroll) closed the panel");
  B.docFire("pointerdown", { pointerType: "touch", target: B.outside, clientX: 50, clientY: 600 });
  B.docFire("pointerup", { pointerType: "touch", target: B.outside, clientX: 52, clientY: 603 });
  ok(!B.eye.classList.contains("is-open"), "a tap on plain page background did not close the panel");
  // A mouse goes through mousedown, unchanged.
  const D = boot({ touch: false });
  D.win.PDXEye.search("lee");
  D.docFire("pointerdown", { pointerType: "mouse", target: D.outside, clientX: 5, clientY: 5 });
  D.docFire("pointerup", { pointerType: "mouse", target: D.outside, clientX: 5, clientY: 5 });
  ok(D.eye.classList.contains("is-open"), "a mouse pointerup closed the panel — desktop dismissal is mousedown's job");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the pane scrolls on its own and the page is never locked");
// ═════════════════════════════════════════════════════════════════════════════
{
  const B = boot({ touch: true });
  B.type("lee"); B.clock.tick(200); B.clock.frame();
  ok(B.panel.style.maxHeight === "512px" || B.panel.style.maxHeight === "560px",
    `with no keyboard the pane's cap is the stylesheet's (got ${B.panel.style.maxHeight})`);
  // The keyboard comes up: 800 → 420 visible px. Panel top is at 120.
  B.win.visualViewport.height = 420;
  B.vvResize(); B.clock.frame();
  ok(B.panel.style.maxHeight === "292px",
    `with the keyboard up the pane runs behind it (maxHeight ${B.panel.style.maxHeight}, want 292px)`);
  B.vvResize(); B.vvResize();
  ok(B.clock.armed() <= 1, "three viewport resizes armed more than one measuring frame");
  B.clock.frame();
  B.fire(B.input, "keydown", { key: "Escape", preventDefault() {} });
  B.fire(B.input, "keydown", { key: "Escape", preventDefault() {} });
  ok(!B.eye.classList.contains("is-open") && B.panel.style.maxHeight === "",
    "closing the panel left the visual-viewport cap on it");

  const css = (PAGE.match(/\.pdx-eye-panel\{position:absolute;[^}]*\}/) || [""])[0];
  must(css, "the .pdx-eye-panel base rule is gone from index.html");
  ok(/overflow-y:auto/.test(css), "the eye pane no longer owns its own scroll");
  ok(/overscroll-behavior:contain/.test(css), "the eye pane's scroll chains into the page");
  ok(!/body\.style\.overflow|pdx-scroll-locked/.test(EYE_SRC.replace(/\/\/[^\n]*/g, "")),
    "opening the eye writes a page scroll lock");
  const touchOnly = EYE_SRC.match(/panel\.addEventListener\('(touchstart|touchend|touchcancel|scroll)'[^\n]*/g) || [];
  ok(touchOnly.length === 4 && touchOnly.every((l) => /gOpt\)/.test(l)),
    "the pane's gesture listeners are not all passive — a non-passive touch listener delays scrolling");
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · desktop is unchanged");
// ═════════════════════════════════════════════════════════════════════════════
{
  const D = boot({ touch: false });
  const p0 = D.panel.paints.length;
  D.fire(D.input, "focus");
  ok(D.panel.paints.length === p0 + 1, "desktop focus no longer paints in the focus task");
  const c0 = D.computed();
  D.type("lee");
  ok(D.computed() > c0, "desktop growField() stopped measuring");
  D.clock.tick(200); D.clock.frame();
  ok(!D.panel.styleWrites.some((w) => /^maxHeight=\d/.test(w)), "desktop pane gained a visual-viewport cap");
}

// ═════════════════════════════════════════════════════════════════════════════
section("9 · stylesheet and shell facts");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The touch rule lives in the eye's one-line coarse-pointer block, which sits
  // ABOVE the 0.9rem phone rule. It wins on specificity (.pdx-eye-box
  // .pdx-eye-input is 0,2,0 against 0,1,0), not on order.
  const line = PAGE.split("\n").find((l) => l.includes("@media (hover:none) and (pointer:coarse){ /* Touch: the 98%-opaque")) || "";
  must(line, "the eye's coarse-pointer block is gone from index.html");
  ok(line.includes(".pdx-eye-box .pdx-eye-input{font-size:16px;}"),
    "the eye's field is under 16px on touch screens — iOS zooms the page on focus");
  ok(!/\.pdx-eye-box \.pdx-eye-input\{font-size:0\.9rem/.test(PAGE) && PAGE.includes(".pdx-eye-input{font-size:0.9rem;}"),
    "the phone font rule gained the .pdx-eye-box specificity, so it would beat the 16px touch rule");
  const blur = (MPCSS.match(/7i ·[\s\S]*?@media \(max-width: 640px\) \{([\s\S]*?)\n\}/) || [])[1] || "";
  for (const id of ["#auth-overlay", "#comment-overlay", "#evidence-overlay", "#verify-overlay", "#pdx-welcome-overlay"]) {
    ok(blur.includes(id), `${id} still blurs the page on phones`);
  }
  ok(/backdrop-filter: none/.test(blur), "§7i sets no backdrop-filter: none");
  const ver = Number((/const CACHE_VERSION = 'v(\d+)';/.exec(SW) || [])[1]);
  ok(ver >= 544, `sw: CACHE_VERSION did not move for the changed precached shell (v${ver})`);
}

if (failures.length) {
  console.error(`\n✗ mobile eye responsive: ${failures.length} failure(s), ${passed} passed`);
  for (const f of failures) console.error("   · " + f);
  process.exit(1);
}
console.log(`\n✓ mobile eye responsive: ${passed} checks passed`);
