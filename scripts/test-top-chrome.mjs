#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// TOP CHROME + REST STATE — the true top of the homepage is reachable and stable
// ─────────────────────────────────────────────────────────────────────────────
// Reported on phones: scrolling back up would not rest on the hero. The POLITIDEX
// wordmark clipped under the fixed nav, and a fling toward the top would stop
// short at a lower "false top" and stay there. Three separate causes, each with
// its own section below.
//
//   1. TWO VARIABLES FOR ONE OFFSET. index.html measures --pdx-chrome off the
//      rendered nav; pdx-stability.js used to measure a second number,
//      --pdx-nav-h, off `nav.getBoundingClientRect().height` — the WHOLE nav,
//      mobile drawer included — and threw away anything over 200px to survive
//      that. A notched phone at a stepped-up font size renders the two permanent
//      rows plus the safe-area inset at more than 200px, so on exactly the
//      devices that reported the clip the measurement was discarded and a 57px
//      literal stood in for it. mobile-polish.css loads after app.css, so the
//      html{scroll-padding-top} derived from that literal overrode the correct
//      one site-wide: 73px of clearance against 113–160px of real chrome.
//
//   2. THE OFFSET CHARGED TWICE. scroll-padding-top (on the scrollport) and
//      scroll-margin-top (on the target) ADD — the target's scroll-margin box is
//      aligned to the scrollport's padding edge, not substituted for it. About
//      forty elements restated a chrome-sized scroll-margin-top on top of the
//      document's, so every jump that did clear the nav overshot it by a whole
//      chrome. An element may state a scroll-margin-top now only for clearance
//      BEYOND the chrome — a sticky sub-rail inside its own section — and states
//      just that extra.
//
//   3. THE FALSE TOP. Safari ships no CSS scroll anchoring, so pdx-stability.js
//      reproduces it with a ResizeObserver on iOS only. It treated hash jumps,
//      anchor clicks and Page/Home/End as intent, but not the reader's own
//      finger. A section finishing hydration above the viewport mid-fling fired a
//      programmatic scrollBy, and on iOS that both cancels the momentum and lands
//      the page at current + delta. Let go expecting scroll 0, get a lower
//      resting position. Swipe again, hit another hydration, same result.
//
// Sections 1–3 are source-level: the defects were declarations and load order, and
// that is where they have to be proven gone. Section 4 boots pdx-stability.js in a
// sandbox and drives the guard through the gestures that used to break it.
// Section 5 pins what must NOT have moved — the fixed nav, the Eye, and anything
// with a score in it.
//
//   node scripts/test-top-chrome.mjs
//
// No database, no network, no browser. Exit code is non-zero on the first failure.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

const failures = [];
let passed = 0;
const ok = (cond, msg) => { cond ? passed++ : failures.push(msg); };
// A harness that has drifted from the files it tests reports "all green" for the
// wrong reason. must() ends the run instead, with exit code 2.
const must = (cond, msg) => {
  if (cond) return;
  console.error("\n✖ HARNESS STALE — " + msg + "\n");
  process.exit(2);
};

// CSS comments carry the whole account of this fix, including the literals that
// used to be wrong. Every rule-level assertion runs against stripped text so a
// comment can never pass or fail a test about a declaration.
const stripCss = (src) => src.replace(/\/\*[\s\S]*?\*\//g, " ");
const stripJs = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");

// Every stylesheet the app loads, plus the <style> blocks inside index.html.
const SHEETS = [
  "app.css", "app-2.css", "mobile-polish.css", "my-profile.css", "my-stances.css",
  "issue-compare.css", "stance-library.css", "your-ballot.css", "profile-spine.css",
  "word-action.css", "impact-ledger.css",
];
const HTML = read("index.html");
const STAB = read("pdx-stability.js");

must(/--pdx-chrome/.test(HTML), "index.html no longer mentions --pdx-chrome at all");
must(SHEETS.every((f) => read(f).length > 0), "one of the stylesheets under test is empty");

// A length in px, whatever unit it was written in. Used to tell "this rule is
// restating the nav's depth" from "this rule is clearing its own sticky sub-rail".
function toPx(v) {
  const m = String(v).trim().match(/^(-?[\d.]+)(px|rem|em)?$/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return m[2] === "rem" || m[2] === "em" ? n * 16 : n;
}

const run = async () => {

// ═══════════════════════════════════════════════════════════════════════════
// 1 · ONE VARIABLE, ONE DECLARATION SITE
// ═══════════════════════════════════════════════════════════════════════════
{
  // Every place in the app that can set the document's scroll padding.
  const sites = [];
  for (const f of SHEETS.concat(["index.html"])) {
    const src = f.endsWith(".html") ? stripCss(HTML) : stripCss(read(f));
    for (const m of src.matchAll(/scroll-padding-top\s*:\s*([^;}]+)/g)) {
      sites.push({ file: f, value: m[1].trim() });
    }
  }

  ok(sites.length === 1,
     "one offset: the document's top scroll padding is declared in exactly one place — " +
     "found " + sites.length + " (" + sites.map((s) => s.file + " → " + s.value).join(", ") + "). " +
     "Two declarations is how the phone override in mobile-polish.css, which loads last, " +
     "silently replaced the measured offset with 73px site-wide.");

  if (sites.length === 1) {
    ok(sites[0].file === "app.css",
       "one offset: the single scroll-padding-top lives in app.css, not in a file that loads after it");
    ok(/var\(\s*--pdx-chrome/.test(sites[0].value),
       "one offset: the document's scroll padding is derived from --pdx-chrome, not a hand-measured literal");
  }

  // The declaration has to be on the scrollport itself. Putting it on <body>
  // does nothing when <html> is the scroller, which is the mobile case.
  const app = stripCss(read("app.css"));
  ok(/html\s*\{[^}]*scroll-padding-top/.test(app),
     "one offset: the scroll padding is set on <html>, the element that actually scrolls on iOS");

  // Nothing may publish a second measured number for the same thing.
  const stab = stripJs(STAB);
  ok(!/setProperty\(\s*['"]--pdx-nav-h['"]/.test(stab),
     "one offset: pdx-stability.js no longer measures and publishes --pdx-nav-h beside --pdx-chrome");
  ok(/setProperty\(\s*['"]--pdx-chrome['"]/.test(stab),
     "one offset: pdx-stability.js publishes --pdx-chrome, the same variable index.html measures");

  // --pdx-nav-h may survive as a name, but only as an alias — never as its own value.
  const mp = stripCss(read("mobile-polish.css"));
  const navh = [...mp.matchAll(/--pdx-nav-h\s*:\s*([^;}]+)/g)].map((m) => m[1].trim());
  ok(navh.length > 0 && navh.every((v) => /var\(\s*--pdx-chrome/.test(v)),
     "one offset: --pdx-nav-h is a plain alias of --pdx-chrome, so a rule that still names it " +
     "gets the same number rather than a competing one — found " + JSON.stringify(navh));
  ok(!navh.some((v) => /^\s*\d/.test(v)),
     "one offset: --pdx-nav-h is never given a literal of its own");

  // The stylesheet fallback and the JS fallback must agree with index.html's
  // declared value, or first paint disagrees with the second frame.
  const rootChrome = stripCss(HTML).match(/:root\s*\{\s*--pdx-chrome\s*:\s*([^;}]+)/);
  must(rootChrome, "index.html no longer declares --pdx-chrome on :root");
  const declared = rootChrome[1].trim();
  const fallbacks = new Set();
  for (const f of SHEETS.concat(["index.html"])) {
    const src = f.endsWith(".html") ? stripCss(HTML) : stripCss(read(f));
    for (const m of src.matchAll(/var\(\s*--pdx-chrome\s*,\s*([^)]+)\)/g)) fallbacks.add(m[1].trim());
  }
  ok(fallbacks.size <= 1 && (fallbacks.size === 0 || fallbacks.has(declared)),
     "one offset: every pre-measurement fallback for --pdx-chrome is the same literal index.html " +
     "declares (" + declared + ") — found " + JSON.stringify([...fallbacks]));
}

// ═══════════════════════════════════════════════════════════════════════════
// 2 · THE CHROME IS CHARGED ONCE
// ═══════════════════════════════════════════════════════════════════════════
{
  // scroll-padding-top and scroll-margin-top add. Now that the document states
  // the chrome once, no element may state it again — and a chrome-sized value is
  // how you spot one that does. The surviving offsets are sub-rail clearances,
  // all well under the ~114px of real chrome.
  const CHROME_ISH = 80;   // px; anything at or above this is restating the nav
  const offenders = [];
  for (const f of SHEETS.concat(["index.html"])) {
    const src = f.endsWith(".html") ? stripCss(HTML) : stripCss(read(f));
    for (const m of src.matchAll(/scroll-margin-top\s*:\s*([^;}]+)/g)) {
      const raw = m[1].trim();
      if (/var\(\s*--pdx-chrome/.test(raw)) { offenders.push(f + " → " + raw + " (derives from the chrome)"); continue; }
      const px = toPx(raw);
      if (px != null && px >= CHROME_ISH) offenders.push(f + " → " + raw);
    }
  }
  ok(offenders.length === 0,
     "no double offset: no element restates the fixed chrome as its own scroll-margin-top — " +
     "scroll-margin-top ADDS to the document's scroll-padding-top, so each of these would land " +
     "its jump a full chrome past the heading: " + offenders.join(", "));

  // The blanket rule is the one that mattered most: it hit every section on the site.
  ok(!/(^|[},])\s*section\[id\]\s*\{[^}]*scroll-margin-top/.test(stripCss(read("mobile-polish.css"))),
     "no double offset: the blanket `section[id] { scroll-margin-top }` is gone — it charged the " +
     "chrome twice on every <section id> in the app, including the hero");

  // The homepage's own sections carried inline offsets; those are gone too.
  ok(!/<section[^>]*id="hero"[^>]*scroll-margin-top/.test(HTML),
     "no double offset: #hero carries no inline scroll-margin-top");
  const inlineChrome = [...HTML.matchAll(/style="[^"]*scroll-margin-top:\s*([^;"]+)/g)]
    .map((m) => m[1].trim())
    .filter((v) => { const px = toPx(v); return px != null && px >= CHROME_ISH; });
  ok(inlineChrome.length === 0,
     "no double offset: no inline style in index.html restates the chrome as a scroll margin — found " +
     JSON.stringify(inlineChrome));

  // Sticky rails pinned under the nav must follow the measurement, not guess at it.
  const rails = [];
  for (const f of SHEETS.concat(["index.html"])) {
    const src = f.endsWith(".html") ? stripCss(HTML) : stripCss(read(f));
    for (const m of src.matchAll(/\.(el-jump|mandate-jump|myteam-cockpit-navwrap)\b[^{}]*\{([^}]*)\}/g)) {
      const top = m[2].match(/(?:^|[;{\s])top\s*:\s*([^;}]+)/);
      if (top) rails.push({ file: f, sel: m[1], top: top[1].trim() });
    }
  }
  must(rails.length >= 3, "the sticky jump rails are no longer recognisable in the stylesheets");
  const guessing = rails.filter((r) => !/var\(\s*--pdx-chrome/.test(r.top));
  ok(guessing.length === 0,
     "sticky rails: every rail pinned under the fixed nav derives its offset from --pdx-chrome, so it " +
     "sits flush under the bar at every breakpoint instead of tucking beneath it on a notched phone — " +
     guessing.map((r) => r.file + " " + r.sel + " → top: " + r.top).join(", "));
}

// ═══════════════════════════════════════════════════════════════════════════
// 3 · THE HERO CLEARS THE CHROME AT SCROLL 0
// ═══════════════════════════════════════════════════════════════════════════
{
  const css = stripCss(HTML);

  // Every #hero padding-top, at every breakpoint, is chrome + air.
  const pads = [...css.matchAll(/#hero\s*\{[^}]*?padding-top\s*:\s*([^;}]+)/g)].map((m) => m[1].trim());
  must(pads.length >= 2, "index.html no longer states a padding-top for #hero");
  ok(pads.every((p) => /var\(\s*--pdx-chrome/.test(p)),
     "hero clearance: the hero's top padding derives from --pdx-chrome at every breakpoint, so the " +
     "POLITIDEX badge and wordmark sit below the bar rather than behind it — found " + JSON.stringify(pads));

  // pt-32 was a fourth, silent offset: a utility class that lost on specificity
  // and so said nothing about where the hero actually starts.
  const heroTag = HTML.match(/<section[^>]*id="hero"[^>]*>/);
  must(heroTag, "the #hero section tag is no longer recognisable in index.html");
  ok(!/\bpt-\d+\b/.test(heroTag[0]),
     "hero clearance: #hero carries no padding utility class competing with the measured offset — " +
     heroTag[0]);

  // The notch belongs to the nav. Offsetting the nav instead of padding it puts
  // its first row behind the status bar and pushes the whole stack onto the hero.
  ok(/#pdx-topnav\s*\{[^}]*padding-top\s*:\s*env\(\s*safe-area-inset-top/.test(css),
     "safe area: the nav absorbs the safe-area inset as padding, which keeps the blurred bar flush to " +
     "the physical top edge and makes the inset part of the height the measurement reports");
  ok(!/#pdx-topnav\s*\{[^}]*(?:^|[;{\s])top\s*:\s*env\(/.test(css),
     "safe area: the nav is not pushed down off the top edge by the inset");

  // Centring must never be able to eat the padding: a fixed height plus
  // justify-center distributes the shortfall to both ends and halves the top gap.
  ok(/#hero\s*\{[^}]*justify-content\s*:\s*flex-start/.test(css) &&
     /#hero\s*>\s*\.hero-stack-top\s*\{[^}]*margin-top\s*:\s*auto/.test(css),
     "hero clearance: the hero centres with auto margins rather than justify-center, so the stack can " +
     "never be pushed above its own top padding into the section's overflow:hidden");

  // At scroll 0 the reader has the SMALL viewport — the URL bar is showing. 100vh
  // is the large one, so the hero box is taller than the window at exactly the
  // moment it has to fit, and its lower half hangs below the visible edge.
  ok(/#hero\s*\{[^}]*min-height\s*:\s*100svh/.test(css),
     "rest state: on phones the hero is sized to the small viewport (100svh), so at scroll 0 the intro " +
     "is fully visible rather than half-hidden under a URL bar that has not retracted yet");

  // The inline measurer: what it measures and the band it accepts.
  const js = stripJs(HTML);
  ok(/querySelector\(\s*['"]\.pdx-eye-row['"]\s*\)/.test(js),
     "measurement: the chrome is measured off .pdx-eye-row, the last PERMANENT row — the mobile drawer " +
     "is a normal-flow child of the same <nav>, so measuring the nav box would follow the menu open");
  ok(/getBoundingClientRect\(\)\.bottom/.test(js),
     "measurement: it takes the row's viewport-relative bottom edge, which on a nav pinned at top:0 is " +
     "the depth of the fixed chrome, safe-area inset included");
  const band = js.match(/h\s*>\s*(\d+)\s*&&\s*h\s*<\s*(\d+)/);
  must(band, "the chrome measurement's sanity band is no longer recognisable in index.html");
  ok(Number(band[2]) >= 320,
     "measurement: the upper sanity bound is " + band[2] + "px, high enough for two rows plus a notch at " +
     "a stepped-up font size — the old 200px ceiling threw the measurement away on exactly the phones " +
     "that reported the clip");
  ok(!/\b(?:h|height)\s*[<>]\s*200\b/.test(js) && !/\b(?:h|height)\s*[<>]\s*200\b/.test(stripJs(STAB)),
     "measurement: the 200px ceiling that discarded tall notched chrome is gone from both measurers");
}

// ═══════════════════════════════════════════════════════════════════════════
// 4 · THE GUARD STANDS DOWN WHILE THE PAGE IS MOVING
// ═══════════════════════════════════════════════════════════════════════════
{
  // A DOM small enough to reason about, and honest about the two things this
  // section is really testing: where scroll corrections land, and what
  // --pdx-chrome ends up as.
  function mkStyle() {
    const props = new Map();
    // The seam walks the prototype chain for a real `overflow` accessor, so the
    // fixture has to have one for installSeam to take.
    class Decl {
      constructor() { this._of = ""; }
      setProperty(k, v) { props.set(k, String(v)); }
      getPropertyValue(k) { return props.has(k) ? props.get(k) : ""; }
      removeProperty(k) { props.delete(k); }
    }
    Object.defineProperty(Decl.prototype, "overflow", {
      configurable: true,
      get() { return this._of; },
      set(v) { this._of = String(v == null ? "" : v); },
    });
    const d = new Decl();
    d._props = props;
    return d;
  }

  function mkEl(tag, opts) {
    const o = opts || {};
    const el = {
      tagName: String(tag || "div").toUpperCase(),
      style: mkStyle(),
      offsetHeight: o.height || 0,
      _rect: o.rect || { top: 0, bottom: 0, height: o.height || 0 },
      classList: { _s: new Set(), add(...c) { c.forEach((x) => this._s.add(x)); },
                   remove(...c) { c.forEach((x) => this._s.delete(x)); },
                   contains(x) { return this._s.has(x); } },
      getBoundingClientRect() { return el._rect; },
      querySelector: (sel) => (o.find ? o.find(sel) : null),
      querySelectorAll: () => [],
      addEventListener() {}, removeEventListener() {},
      contains: () => false,
      hidden: false,
    };
    return el;
  }

  // over.nativeAnchoring: pretend to be Chrome (guard should not install at all).
  // over.chrome: a --pdx-chrome already published before boot.
  // over.eyeBottom: what .pdx-eye-row's bottom edge measures.
  function boot(over) {
    const o = over || {};
    const listeners = { window: {}, document: {} };
    const scrolls = [];
    let y = o.scrollY == null ? 900 : o.scrollY;
    let now = 1000000;
    let roCb = null;

    const eye = o.eyeBottom === null ? null
      : mkEl("div", { rect: { top: 0, bottom: o.eyeBottom == null ? 148 : o.eyeBottom, height: 60 } });
    const nav = mkEl("nav", { rect: { top: 0, bottom: 160, height: 160 }, find: (s) => (s === ".pdx-eye-row" ? eye : null) });
    const root = mkEl("html");
    const body = mkEl("body");
    if (o.chrome) root.style.setProperty("--pdx-chrome", o.chrome);

    const doc = {
      body, documentElement: root, activeElement: null, readyState: "complete",
      getElementById: (id) => (id === "pdx-topnav" ? nav : null),
      querySelector: (s) => (s === "nav.nav-blur" ? nav : null),
      querySelectorAll: () => [],
      addEventListener: (t, fn) => { (listeners.document[t] = listeners.document[t] || []).push(fn); },
      createElement: (t) => mkEl(t),
    };

    const ctx = {
      console,
      document: doc,
      Map, Set, Object, Math, String, Number, Array, JSON,
      Date: { now: () => now },
      requestAnimationFrame: (fn) => { fn(); return 1; },
      setInterval: () => 0, clearInterval: () => {}, setTimeout: () => 0,
      CSS: { supports: () => !!o.nativeAnchoring },
      ResizeObserver: function (cb) { roCb = cb; this.observe = () => {}; this.disconnect = () => {}; },
      MutationObserver: function () { this.observe = () => {}; },
      addEventListener: (t, fn) => { (listeners.window[t] = listeners.window[t] || []).push(fn); },
      scrollTo: (a) => {
        const to = typeof a === "object" ? a.top : arguments[1];
        scrolls.push(to);
        y = to;
      },
    };
    ctx.window = ctx;
    Object.defineProperty(ctx, "scrollY", { get: () => y });
    Object.defineProperty(ctx, "pageYOffset", { get: () => y });
    ctx.CSS.supports = () => !!o.nativeAnchoring;
    vm.createContext(ctx);
    vm.runInContext(STAB, ctx, { filename: "pdx-stability.js" });

    const fire = (target, type, ev) => (listeners[target][type] || []).forEach((fn) => fn(ev || {}));
    return {
      ctx, scrolls, root, roCb: () => roCb,
      get y() { return y; },
      setY(v) { y = v; },
      advance(ms) { now += ms; },
      fireWindow: (t, e) => fire("window", t, e),
      fireDoc: (t, e) => fire("document", t, e),
      // A section that finished hydrating entirely above the viewport.
      grow(px) {
        const sec = mkEl("section", { height: 200, rect: { top: -1200, bottom: -400, height: 200 } });
        roCb([{ target: sec }]);                       // first callback records the baseline
        sec.offsetHeight = 200 + px;
        roCb([{ target: sec }]);                       // second is the growth
      },
    };
  }

  // ── The measurer ──────────────────────────────────────────────────────────
  {
    const s = boot({ eyeBottom: 148 });
    ok(s.root.style.getPropertyValue("--pdx-chrome") === "148px",
       "fallback measurer: on a page with no inline measurer, pdx-stability.js publishes --pdx-chrome " +
       "from the eye row's bottom edge — got " + JSON.stringify(s.root.style.getPropertyValue("--pdx-chrome")));
  }
  {
    // index.html's measurer has the better view (it re-measures on focusout,
    // visualViewport resize and its own ResizeObserver). The fallback must never
    // overwrite it — that would be two numbers for one offset again.
    const s = boot({ chrome: "137px", eyeBottom: 148 });
    ok(s.root.style.getPropertyValue("--pdx-chrome") === "137px",
       "fallback measurer: it stands down when a real measurement is already published, rather than " +
       "fighting index.html's measurer for the same variable");
  }
  {
    const s = boot({ eyeBottom: 640 });
    ok(s.root.style.getPropertyValue("--pdx-chrome") === "",
       "fallback measurer: an implausible measurement is discarded rather than published");
    const tall = boot({ eyeBottom: 214 });
    ok(tall.root.style.getPropertyValue("--pdx-chrome") === "214px",
       "fallback measurer: 214px of chrome — two rows plus a notch at a stepped-up font size — is " +
       "accepted, not thrown away as the old 200px ceiling did on exactly those phones");
  }

  // ── The anchor guard ──────────────────────────────────────────────────────
  {
    const s = boot({ nativeAnchoring: true });
    ok(s.roCb() === null,
       "anchor guard: nothing is installed on an engine with native CSS scroll anchoring — the browser " +
       "already does this and we stay out of its way");
  }
  {
    // The behaviour the guard exists for, still intact: page still, reader well
    // down the document, a section grows entirely above them.
    const s = boot({ scrollY: 900 });
    must(s.roCb(), "the anchor guard's ResizeObserver is no longer installed on an engine without native anchoring");
    s.advance(2000);
    s.grow(180);
    ok(s.scrolls.length === 1 && s.scrolls[0] === 1080,
       "anchor guard: with the page still, late hydration above the viewport is compensated as before — " +
       "the reading position does not slide. Got " + JSON.stringify(s.scrolls));
  }
  {
    // A finger on the glass. This is the case that produced the false top: a
    // correction here cancels the fling AND relocates the page.
    const s = boot({ scrollY: 900 });
    s.advance(2000);
    s.fireDoc("touchstart");
    s.grow(180);
    ok(s.scrolls.length === 0,
       "rest state: nothing is corrected while a finger is on the glass — a programmatic scroll mid-drag " +
       "cancels the gesture and lands the reader where they did not ask to be");
  }
  {
    // Momentum after the finger lifts. touchend is NOT the end of the movement
    // on iOS, and this is the exact window the old code fired in.
    const s = boot({ scrollY: 900 });
    s.advance(2000);
    s.fireDoc("touchstart");
    s.fireDoc("touchend");
    s.advance(60);
    s.fireWindow("scroll");         // momentum tick
    s.advance(60);
    s.grow(180);
    ok(s.scrolls.length === 0,
       "rest state: nothing is corrected during momentum after the finger lifts — this is the fling " +
       "toward the hero that used to stop short at a false top");
  }
  {
    // …and once the page has genuinely come to rest, the guard resumes.
    const s = boot({ scrollY: 900 });
    s.advance(2000);
    s.fireDoc("touchstart");
    s.fireDoc("touchend");
    s.fireWindow("scroll");
    s.advance(4000);                // long since still
    s.grow(180);
    ok(s.scrolls.length === 1,
       "anchor guard: it resumes once the page is genuinely still, so standing down during gestures did " +
       "not simply disable it");
  }
  {
    // A wheel or trackpad is movement too.
    const s = boot({ scrollY: 900 });
    s.advance(2000);
    s.fireWindow("wheel");
    s.grow(180);
    ok(s.scrolls.length === 0,
       "rest state: a wheel or trackpad gesture stands the guard down the same way a finger does");
  }
  {
    // At the top there is nothing above the viewport left to preserve, so any
    // correction here is a shove away from the hero and nothing else.
    for (const y of [0, 3, 8]) {
      const s = boot({ scrollY: y });
      s.advance(2000);
      s.grow(180);
      ok(s.scrolls.length === 0,
         "rest state: at scroll " + y + " the guard makes no correction — this close to the top nothing " +
         "can have grown above the viewport, and the shove is what stopped the page resting at the " +
         "true top");
    }
  }
  {
    // The position is re-read after the entries are measured: measuring takes
    // layout, and on a phone the page can travel a long way in that time.
    const s = boot({ scrollY: 900 });
    s.advance(2000);
    const sec = { target: null };
    const roCb = s.roCb();
    const el = {
      offsetHeight: 200,
      getBoundingClientRect: () => ({ top: -1200, bottom: -400, height: el.offsetHeight }),
    };
    roCb([{ target: el }]);
    el.offsetHeight = 380;
    s.setY(2);                      // the reader reached the top while we measured
    roCb([{ target: el }]);
    ok(s.scrolls.length === 0,
       "rest state: the scroll position is read again after the entries are measured, so a reader who " +
       "reached the top mid-callback is not pushed back down");
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 5 · WHAT MUST NOT HAVE MOVED
// ═══════════════════════════════════════════════════════════════════════════
{
  // The fixed nav and the All-Seeing Eye staying pinned is the intended design.
  const navTag = HTML.match(/<nav[^>]*id="pdx-topnav"[^>]*>/);
  must(navTag, "the #pdx-topnav element is gone from index.html");
  ok(/\bfixed\b/.test(navTag[0]) && /\btop-0\b/.test(navTag[0]),
     "unchanged: the top nav is still fixed to the top of the viewport — " + navTag[0]);
  ok(/class="[^"]*\bpdx-eye-row\b/.test(HTML),
     "unchanged: the All-Seeing Eye row is still part of the permanent chrome");
  ok(/z-50/.test(navTag[0]),
     "unchanged: the nav still stacks above the page content");

  // The drawer is a normal-flow child of the same nav — untouched, and still the
  // reason the measurement reads the eye row rather than the nav box.
  const iNav = HTML.indexOf('<nav id="pdx-topnav"');
  const iEye = HTML.indexOf('class="pdx-eye-row"', iNav);
  const iDrawer = HTML.indexOf('id="mobileMenu"', iNav);
  const iNavEnd = HTML.indexOf("</nav>", iNav);
  must(iEye > 0 && iDrawer > 0 && iNavEnd > 0, "the nav's eye row / drawer / closing tag are no longer recognisable");
  ok(iEye < iDrawer && iDrawer < iNavEnd,
     "unchanged: the mobile drawer is still a normal-flow child of the nav, rendered AFTER the permanent " +
     "rows — which is why the chrome is measured off .pdx-eye-row and an open menu cannot inflate it");

  // Presentation only. The stability module has no business near a score, and the
  // stylesheets could not hold logic if they tried.
  const stab = stripJs(STAB);
  ok(!/score|verdict|weight|roster|door\s*[12]/i.test(stab),
     "presentation only: pdx-stability.js contains no scoring, roster or Door 1/Door 2 vocabulary");
  ok(!/fetch\(|firestore|collection\(/i.test(stab),
     "presentation only: pdx-stability.js reads no data");

  // The share pipeline's own guards are downstream of nothing here, but a chrome
  // pass that quietly reverted them would be a regression the user would feel.
  const links = read("share-links.js");
  ok(/MIN_ARTIFACT_BYTES/.test(links) && /AbortError/.test(links),
     "no regression: the share pipeline's empty-artifact floor and its cancel-vs-failure distinction " +
     "are still in place");

  // Desktop must not have regressed: the svh sizing and the trimmed hero stack
  // are phone-scoped, and the desktop clearance is still chrome + 1rem.
  const css = stripCss(HTML);
  const svhBlock = css.match(/@media\s*\(\s*max-width:\s*639px\s*\)\s*\{[\s\S]*?#hero\s*\{[^}]*min-height\s*:\s*100svh/);
  ok(!!svhBlock,
     "no desktop regression: the small-viewport hero sizing is inside the phone media query only");
  ok(/#hero\s*\{\s*padding-top\s*:\s*calc\(\s*var\(\s*--pdx-chrome\s*\)\s*\+\s*1rem\s*\)/.test(css),
     "no desktop regression: the desktop hero clearance is chrome + 1rem, which is what pt-32 resolved to");
}


// ═══════════════════════════════════════════════════════════════════════════
// 6 · THE FAIL-CLOSED VALUE IS BIG ENOUGH, AND STILL THE ONLY ONE
// ═══════════════════════════════════════════════════════════════════════════
// Sections 1-3 proved there is one offset and that it is charged once. They did
// NOT prove the number is large enough when the measurement is unavailable: the
// fallback assertion in section 1 only checks that every fallback AGREES with
// index.html's literal, so a set of fallbacks that agreed on a value too small to
// clear the nav passed cleanly. That is what was still shipping.
//
// The literal is the sum of the two permanent rows, and every term of that sum is
// rem-derived, so it tracks the reader's font scaling on its own:
//
//   row 1  py-3 (0.75rem x 2) around a 2rem brand mark ......... 3.5rem
//   row 2  0.5rem x 2 shell padding + a 2.5rem field .......... 3.5rem
//          + the 1px rule between the rows ..................... 1px
//   ---------------------------------------------------------------------
//                                                     7rem + 1px = 113px
//
// The one contributor that is NOT a multiple of the root font size is
// env(safe-area-inset-top): this document is viewport-fit=cover and #pdx-topnav is
// padded by the inset so the bar sits flush to the physical top edge, which makes
// 44-59px on a notched iPhone (24-48px on an Android cutout) part of the real
// chrome depth. A plain rem literal cannot say that, so the pre-measurement value
// under-cleared by up to 59px — more than the 26px line box the phone wordmark
// renders in — on exactly the devices that reported the clip.
//
// So this section pins two things a later chrome edit must not undo:
//   · the fail-closed value covers the rows AND states the inset, and
//   · stating the inset did not smuggle in a second competing offset.
{
  const css = stripCss(HTML);

  // ── The base literal covers the two rows ──────────────────────────────────
  const rootDecls = [...css.matchAll(/:root\s*\{\s*--pdx-chrome\s*:\s*([^;}]+)/g)].map((m) => m[1].trim());
  must(rootDecls.length >= 1, "index.html no longer declares --pdx-chrome on :root");

  const base = rootDecls.find((v) => /^[\d.]+rem$/.test(v));
  ok(!!base,
     "fail closed: --pdx-chrome still has a plain rem base declaration on :root, so an engine that " +
     "cannot parse the notch-aware form below has a valid length to fall back to rather than an " +
     "invalid calc() — found " + JSON.stringify(rootDecls));

  const ROWS_REM = 7;   // 3.5rem row 1 + 3.5rem row 2; the 1px rule is the rounding
  if (base) {
    const rem = parseFloat(base);
    ok(rem >= ROWS_REM,
       "fail closed: the --pdx-chrome base literal (" + base + " = " + (rem * 16) + "px at a 16px root) is " +
       "SMALLER than the two permanent nav rows it has to clear (" + ROWS_REM + "rem = " + (ROWS_REM * 16) +
       "px). This is the shape of every previous regression here — a flat 5rem, then 57px, then 3.25rem — " +
       "each of them right on the machine it was typed on. Raise it to the row arithmetic in the comment " +
       "above, do not shave it to close a gap.");
    // Headroom is fine; a fallback so large it reads as a deliberate empty band is
    // the other wall this pass had to respect.
    ok(rem <= ROWS_REM + 3,
       "no wasted space: the --pdx-chrome base literal (" + base + ") is more than 3rem taller than the " +
       "rows it clears, which on a phone with no notch is a permanent empty band above the wordmark. " +
       "The inset belongs in the env() term below, not in the literal.");
  }

  // ── ...and the fail-closed value states the inset ─────────────────────────
  const notchDecl = rootDecls.find((v) => /env\(\s*safe-area-inset-top/.test(v));
  ok(!!notchDecl,
     "fail closed: no --pdx-chrome declaration accounts for env(safe-area-inset-top). The nav is padded " +
     "by the inset under viewport-fit=cover, so on a notched phone the real chrome is the literal PLUS " +
     "44-59px. Without this term the fallback clips the POLITIDEX wordmark on every path where the " +
     "runtime measurement is unavailable or held — no ResizeObserver, JS blocked, the first paint, and " +
     "the focus-inside-the-nav hold after a hard refresh.");

  if (notchDecl && base) {
    ok(notchDecl.replace(/\s+/g, "").includes(base.replace(/\s+/g, "")),
       "fail closed: the notch-aware --pdx-chrome is built from the same base literal as the plain one (" +
       base + "), so the two forms cannot drift apart — found " + JSON.stringify(notchDecl));
    ok(/^calc\(/.test(notchDecl) && /\+/.test(notchDecl),
       "fail closed: the notch-aware --pdx-chrome ADDS the inset to the rows rather than replacing them — " +
       "found " + JSON.stringify(notchDecl));
    ok(/env\(\s*safe-area-inset-top\s*,\s*0(px)?\s*\)/.test(notchDecl),
       "fail closed: env(safe-area-inset-top) is given its own 0px fallback, so a supporting engine with " +
       "no inset resolves to the plain row arithmetic instead of dropping the declaration");
  }

  // The @supports guard is load-bearing, not decoration. A custom property accepts
  // any token sequence, so an engine that does not parse env() would accept the
  // declaration and then invalidate every calc() consuming it — three hero
  // paddings and the document's scroll padding would compute to 0 and the wordmark
  // would be fully behind the bar, which is worse than the bug being fixed.
  const guarded = /@supports\s*\([^)]*env\(\s*safe-area-inset-top[^)]*\)[^{]*\)\s*\{\s*:root\s*\{\s*--pdx-chrome\s*:\s*calc\([^}]*env\(\s*safe-area-inset-top/.test(css);
  ok(guarded,
     "fail closed: the env()-bearing --pdx-chrome is not inside an @supports test for env(safe-area-inset-top). " +
     "Custom properties parse permissively, so on an engine without env() the declaration would be accepted " +
     "and then poison every calc(var(--pdx-chrome) + …) into invalid-at-computed-value-time — padding-top 0, " +
     "wordmark entirely under the nav. An engine without env() has no notch, so the plain literal is correct " +
     "there and this block must simply not apply.");

  // ── No second competing offset came back in ───────────────────────────────
  // The chrome depth has one name. Anything else that gets given a chrome-sized
  // length of its own is the next --pdx-nav-h / 57px / pt-32 / 3.25rem, and it will
  // win somewhere the measured variable does not reach.
  const CHROME_PX = (v) => {
    const m = /^([\d.]+)(px|rem)$/.exec(v.trim());
    if (!m) return 0;
    return m[2] === "rem" ? parseFloat(m[1]) * 16 : parseFloat(m[1]);
  };
  const rogue = [];
  for (const f of SHEETS.concat(["index.html"])) {
    const src = f.endsWith(".html") ? css : stripCss(read(f));
    // A custom property other than --pdx-chrome handed a bare chrome-sized length.
    for (const m of src.matchAll(/(--pdx-[a-z0-9-]*(?:nav|chrome|bar|header|top)[a-z0-9-]*)\s*:\s*([^;}]+)/gi)) {
      const [, name, raw] = m;
      if (name === "--pdx-chrome") continue;
      if (/var\(\s*--pdx-chrome/.test(raw)) continue;          // an alias is fine
      const px = CHROME_PX(raw);
      if (px >= 40) rogue.push(f + " → " + name + ": " + raw.trim());
    }
  }
  ok(rogue.length === 0,
     "one offset: a custom property other than --pdx-chrome has been given a chrome-sized length of its " +
     "own — " + JSON.stringify(rogue) + ". This is exactly how --pdx-nav-h came to exist, and how a 57px " +
     "literal in the file that loads last replaced the measured offset site-wide. Alias --pdx-chrome " +
     "instead: var(--pdx-chrome).");

  // The drawer hangs off the bottom of the same chrome, so its cap derives from the
  // same variable. `100dvh - 3.25rem` was 52px against a 113px+ nav: the menu ran
  // off the bottom of the screen by the difference.
  const drawerCaps = [...css.matchAll(/#mobileMenu\s*\{[^}]*max-height\s*:\s*([^;}]+)/g)].map((m) => m[1].trim());
  ok(drawerCaps.length > 0 && drawerCaps.every((v) => /var\(\s*--pdx-chrome/.test(v)),
     "one offset: the mobile drawer's pre-JS max-height derives from --pdx-chrome rather than restating " +
     "the nav height as a literal — found " + JSON.stringify(drawerCaps));

  // Exactly one thing may publish the measured number, and both publishers must
  // write the same variable name (section 1 checks the names; this checks the count).
  const writers = [...stripJs(HTML).matchAll(/setProperty\(\s*['"](--pdx-[a-z0-9-]+)['"]/gi)]
    .map((m) => m[1])
    .concat([...stripJs(STAB).matchAll(/setProperty\(\s*['"](--pdx-[a-z0-9-]+)['"]/gi)].map((m) => m[1]));
  ok(writers.length > 0 && writers.every((w) => w === "--pdx-chrome"),
     "one offset: every runtime publisher writes --pdx-chrome and nothing else — found " +
     JSON.stringify([...new Set(writers)]));
}

// ═══════════════════════════════════════════════════════════════════════════
// 7 · THE WORDMARK IS AT THE TRUE TOP, AND THE AIR OUTLASTS THE FLOAT
// ═══════════════════════════════════════════════════════════════════════════
// "Scroll back to top lands on the wordmark" is only true if scroll 0 IS the
// wordmark's screen. Two ways that quietly stops being true: something in normal
// flow appears above #hero (the reader now rests on that instead, with the nav
// over it), or the clearance is smaller than the distance the top of the hero
// stack travels under its own animation.
{
  const html = HTML;
  const bodyStart = html.indexOf("<body");
  const heroStart = html.indexOf('<section id="hero"');
  must(bodyStart > 0 && heroStart > bodyStart, "index.html's <body> or #hero is no longer recognisable");

  // Everything between <body> and #hero, comments and whitespace removed.
  const before = html.slice(html.indexOf(">", bodyStart) + 1, heroStart)
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")            // no layout box
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")              // no layout box
    .replace(/<nav id="pdx-topnav"[\s\S]*?<\/nav>/i, " ")     // position: fixed, out of flow
    .replace(/\s+/g, "");
  ok(before === "",
     "true top: something now sits between <body> and #hero in normal flow — " +
     JSON.stringify(before.slice(0, 220)) + ". Scroll 0 is then that element's screen, not the " +
     "wordmark's, and the fixed nav covers it. The nav is the only thing allowed above the hero and " +
     "it is position:fixed precisely so the hero starts at document offset 0.");

  // The hero states no scroll-margin-top of its own: it is the scroll origin, and
  // section 2's rule (padding and margin ADD) applies to it like anything else.
  const heroTag = html.slice(heroStart, html.indexOf(">", heroStart) + 1);
  ok(!/scroll-m[targin-]*top/i.test(heroTag) && !/\bscroll-mt-/.test(heroTag),
     "true top: #hero carries no scroll-margin-top — it is the origin the reader flings back to, and a " +
     "margin here would push the landing past the top of the page");

  // The first child of the hero stack floats. Whatever air sits above it has to be
  // greater than the keyframe's amplitude or the badge rises under the blurred bar
  // on every cycle — visible clipping on a layout that is statically correct.
  const css = stripCss(HTML);
  const tw = stripCss(read("css/tailwind.css"));
  const floatKf = tw.match(/@keyframes\s+float\s*\{[\s\S]*?translateY\(\s*-?([\d.]+)px/);
  must(floatKf, "the float keyframe is no longer recognisable in css/tailwind.css");
  const amplitude = parseFloat(floatKf[1]);

  const phoneBlock = css.match(/@media\s*\(\s*max-width:\s*639px\s*\)\s*\{([\s\S]*?)\n    \}/);
  must(phoneBlock, "the phone hero media query is no longer recognisable in index.html");
  const phonePad = phoneBlock[1].match(/#hero\s*\{\s*padding-top\s*:\s*calc\(\s*var\(\s*--pdx-chrome\s*\)\s*\+\s*([\d.]+)rem\s*\)/);
  must(phonePad, "the phone #hero clearance is no longer stated as chrome + Nrem");
  const phoneAir = parseFloat(phonePad[1]) * 16;

  ok(phoneAir > amplitude,
     "float clearance: the phone hero's air above the chrome is " + phoneAir + "px and the logo badge's " +
     "float keyframe lifts it " + amplitude + "px, so at the top of every cycle the badge reaches the " +
     "bottom edge of the search row and grazes under the blurred bar. The air has to exceed the " +
     "amplitude, not equal it.");
  ok(phoneAir <= amplitude + 24,
     "no wasted space: the phone hero's air above the chrome is " + phoneAir + "px against a " + amplitude +
     "px float — more than 24px of slack is a permanent empty band on the screen with the tightest fold " +
     "budget in the app.");

  // The badge is hidden on short phones, and the lockup that inherits its auto
  // margin uses fadeUp — which starts 30px LOW and settles, so it can only ever be
  // further from the chrome than its resting position. That is why the short-phone
  // clearance is allowed to be tighter than the float amplitude.
  const shortBlock = css.match(/@media\s*\(\s*max-width:\s*639px\s*\)\s*and\s*\(\s*max-height:\s*720px\s*\)\s*\{([\s\S]*?)\n    \}/);
  must(shortBlock, "the short-phone hero media query is no longer recognisable in index.html");
  ok(/#hero\s*>\s*\.hero-stack-top\s*\{\s*display\s*:\s*none/.test(shortBlock[1]),
     "float clearance: the short-phone block still hides the floating badge, which is what lets its " +
     "clearance be tighter than the float amplitude");
  ok(/#hero\s*>\s*\.hero-brand\s*\{\s*margin-top\s*:\s*auto/.test(shortBlock[1]),
     "float clearance: with the badge hidden the POLITIDEX lockup inherits the auto top margin, so it " +
     "centres in the space below the padding instead of being pushed above it");
  const fadeKf = tw.match(/@keyframes\s+fadeUp\s*\{\s*0%\s*\{[^}]*translateY\(\s*([\d.]+)px/);
  ok(!!fadeKf && parseFloat(fadeKf[1]) > 0,
     "float clearance: the wordmark's own entrance animation still starts BELOW its resting position " +
     "(fadeUp translateY is positive), so it can never animate up into the chrome");
}

}; // run

await run();

if (failures.length) {
  console.error("\n✖ top chrome: " + failures.length + " failure(s)\n");
  failures.forEach((f) => console.error("  · " + f));
  console.error("");
  process.exit(1);
}
console.log("✓ top chrome: all " + passed +
  " assertions passed — one measured offset, charged once, and the true top of the homepage rests where the reader put it");
