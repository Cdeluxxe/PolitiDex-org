#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// MOBILE HERO BRAND LOCKUP — it appears BELOW the Eye, at the true top
// ─────────────────────────────────────────────────────────────────────────────
// Reported from real phones (Chrome and a fresh Firefox), at the highest
// reachable scroll position: the hero opened on its headlines. "WHAT THEY SAID.
// WHAT THEY DID." and "SEE THE RECORD." were there, and the brand stack above
// them — the PX/BETA badge with its LIVE pill, the POLITIDEX wordmark, the BOUND
// BY TRUTH eyebrow — did not cleanly appear below the All-Seeing Eye row.
//
// scripts/test-mobile-hero-clearance.mjs already checks the ARITHMETIC: it
// resolves the shipped custom-property chain and proves the sum clears the
// chrome at every breakpoint and chrome depth. It stayed green through this
// report, and it was right to — the sum was fine. Two things it does not ask:
//
//   1 · IS THE BRAND STACK EVEN RENDERED? A clearance is meaningless for an
//       element that is display:none. `@media (max-width: 639px) and
//       (max-height: 720px)` hid .hero-stack-top outright to buy fold space —
//       the PX badge and the LIVE pill, gone on an SE in portrait and on EVERY
//       phone in landscape. Half the lockup was not clipped or scrolled under.
//       It was not there.
//   2 · DOES THE SUM MATCH THE PIXELS? Every previous pass computed a clearance
//       from terms it believed and was then told by a phone that the lockup was
//       still under the bar. A sum can be wrong about a term nobody thought of.
//       So the publisher now closes the loop — it reads the real
//       getBoundingClientRect().top of the first visible brand element against
//       the real bottom of .pdx-eye-row and tops the padding up if the gap is
//       short — and this file runs that code against a fixture DOM and asserts
//       the geometry it produces.
//
// THE RULE THIS FILE ENFORCES, and the one the report asks for:
//
//     at scroll 0, the first visible hero brand element's rect.top must be more
//     than 16px below the bottom edge of .pdx-eye-row
//
// Section 5 fails if that gap is ≤ 16px, including in the deliberately-broken
// fixture at the end of it, which is there so a passing run cannot be a run
// where the assertion no longer has teeth.
//
//   node scripts/test-mobile-hero-brand.mjs
//
// No database, no network, no browser. Exit code is non-zero on the first failure.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
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
  if (cond) { passed++; return; }
  console.error("\n✖ mobile hero brand: HARNESS STALE — " + msg + "\n");
  process.exit(2);
};

const stripCss = (src) => src.replace(/\/\*[\s\S]*?\*\//g, " ");
const HTML = read("index.html");
const CSS = stripCss(
  [...HTML.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join("\n")
);
const SHEETS = [
  ["index.html", CSS],
  ["app.css", stripCss(read("app.css"))],
  ["app-2.css", stripCss(read("app-2.css"))],
  ["mobile-polish.css", stripCss(read("mobile-polish.css"))],
];

// ═══════════════════════════════════════════════════════════════════════════
// 0 · THE INVENTORY — what has to be above "WHAT THEY SAID"
// ═══════════════════════════════════════════════════════════════════════════
// Named rather than described, because "the brand stack" is exactly the phrase
// that let half of it disappear: the wordmark survived, so the page did not look
// brandless in review, and the badge and the pill were gone.
const heroStart = HTML.indexOf('<section id="hero"');
must(heroStart > 0, "the #hero section is no longer recognisable in index.html");
const h1Start = HTML.indexOf("<h1", heroStart);
must(h1Start > heroStart, "#hero no longer contains an <h1> — 'WHAT THEY SAID' is the reference point " +
     "this whole file measures against");
const ABOVE = HTML.slice(heroStart, h1Start);      // everything before the headline

const INVENTORY = [
  { id: "PX wordmark",        re: />\s*PX\s*</ },
  { id: "BETA tag",           re: />\s*BETA\s*</ },
  { id: "LIVE pill",          re: />\s*LIVE\s*</ },
  { id: "POLITIDEX wordmark", re: /POLITI<span[^>]*>DEX<\/span>/ },
  { id: "BOUND BY TRUTH eyebrow", re: /Bound by Truth/i },
];
for (const item of INVENTORY) {
  ok(item.re.test(ABOVE),
     "INVENTORY: the " + item.id + " is no longer in #hero above the <h1>. The four things a reader is " +
     "supposed to meet before the headline are the PX/BETA badge, its LIVE pill, the POLITIDEX wordmark " +
     "and the BOUND BY TRUTH eyebrow. If one is genuinely being retired, retire it here too — do not " +
     "let this file keep asserting a lockup the page no longer has.");
}
// The two flow children that carry them, in this order.
const iStack = ABOVE.indexOf("hero-stack-top");
const iBrand = ABOVE.indexOf("hero-brand");
ok(iStack > 0 && iBrand > iStack,
   "INVENTORY: #hero no longer holds .hero-stack-top followed by .hero-brand above the headline. Every " +
   "rule in the phone blocks, and the runtime audit's element search, is anchored to those two class " +
   "names.");

// ═══════════════════════════════════════════════════════════════════════════
// 1 · NOTHING IN THE LOCKUP IS display:none ON A PHONE
// ═══════════════════════════════════════════════════════════════════════════
// The whole failure, stated as a rule: on ≤639px no part of the brand stack may
// be hidden. Every shipped stylesheet is walked, not just the inline one — a
// deferred sheet that loads later wins the cascade, which is how the trims keyed
// on `.mb-8` went stale unnoticed in the other direction.

// A flat list of { sel, body, media[] } over a stylesheet. The declaration blocks
// in these files do not nest, so a brace scanner is enough and there is no
// dependency to add.
function eachRule(src, fn) {
  const stack = [];
  let i = 0, buf = "";
  while (i < src.length) {
    const c = src[i];
    if (c === "{") {
      const prelude = buf.trim(); buf = "";
      if (prelude.startsWith("@")) { stack.push(prelude); i++; continue; }
      let depth = 1, j = i + 1;
      while (j < src.length && depth) {
        if (src[j] === "{") depth++;
        else if (src[j] === "}") depth--;
        j++;
      }
      fn(prelude, src.slice(i + 1, j - 1), stack.slice());
      i = j; continue;
    }
    if (c === "}") { stack.pop(); buf = ""; i++; continue; }
    buf += c; i++;
  }
}

// Could this rule apply to a 639px-wide viewport? Height conditions are always
// reachable (any phone can be turned on its side), so only the width bounds and
// `print` can rule a block out.
function appliesOnPhone(media) {
  for (const at of media) {
    if (!/^@media/i.test(at)) continue;
    if (/\bprint\b/i.test(at) && !/\ball\b/i.test(at)) return false;
    for (const m of at.matchAll(/min-width\s*:\s*([\d.]+)px/g)) {
      if (parseFloat(m[1]) > 639) return false;
    }
    for (const m of at.matchAll(/max-width\s*:\s*([\d.]+)px/g)) {
      if (parseFloat(m[1]) < 639) return false;
    }
  }
  return true;
}

// Selectors that resolve to some part of the lockup. `.hero-stack-top`/`.hero-brand`
// and their descendants, plus the two Tailwind hooks the badge and pill are built
// from inside the hero (`#hero .animate-float` reaches the badge).
const LOCKUP_SEL = /(\.hero-stack-top|\.hero-brand)/;
{
  const hidden = [];
  for (const [file, src] of SHEETS) {
    eachRule(src, (sel, body, media) => {
      if (!LOCKUP_SEL.test(sel)) return;
      if (!appliesOnPhone(media)) return;
      if (!/(?:^|;)\s*display\s*:\s*none/.test(body)) return;
      // A rule that hides a DESCENDANT (a divider rule, the tagline's hairlines)
      // is a trim, not the lockup disappearing. Only the two stack elements
      // themselves, or a descendant that IS one of the named inventory items,
      // count here — and there is no selector for those, so: the elements.
      const target = sel.split(",").map((s) => s.trim())
        .filter((s) => /(\.hero-stack-top|\.hero-brand)\s*$/.test(s));
      if (!target.length) return;
      hidden.push(file + ": " + target.join(", ") + (media.length ? "  [" + media.join(" ") + "]" : ""));
    });
  }
  ok(hidden.length === 0,
     "HIDDEN ON A PHONE: " + JSON.stringify(hidden) + " sets display:none on part of the hero brand " +
     "lockup in a context that applies at ≤639px. That is the reported failure verbatim — the upper " +
     "brand stack does not appear below the Eye. A short screen is a reason to make the badge SMALLER " +
     "(the short-phone block scales the tile to 2.75rem), never a reason to remove it: the fold budget " +
     "buys about 44px and it costs the reader the entire brand.");
}
// …and the same for visibility/opacity, which hide just as completely while
// leaving a rect behind — the audit in section 5 would happily measure air to an
// invisible element.
{
  const ghosted = [];
  for (const [file, src] of SHEETS) {
    eachRule(src, (sel, body, media) => {
      if (!LOCKUP_SEL.test(sel) || !appliesOnPhone(media)) return;
      if (/(?:^|;)\s*visibility\s*:\s*hidden/.test(body)) ghosted.push(file + ": " + sel + " → visibility:hidden");
      const op = /(?:^|;)\s*opacity\s*:\s*([\d.]+)/.exec(body);
      // 0 is invisible; the animate-fadeUp keyframe's own 0% frame is not a rule.
      if (op && parseFloat(op[1]) === 0) ghosted.push(file + ": " + sel + " → opacity:0");
    });
  }
  ok(ghosted.length === 0,
     "HIDDEN ON A PHONE: " + JSON.stringify(ghosted) + ". An element with visibility:hidden or opacity:0 " +
     "still has a box, so the runtime clearance audit would measure a perfectly good gap to something " +
     "the reader cannot see.");
}

// ═══════════════════════════════════════════════════════════════════════════
// 2 · NO FLOAT AND NO TRANSFORM ON THE PHONE BRAND STACK
// ═══════════════════════════════════════════════════════════════════════════
// Both halves. The badge's float moves TOWARD the chrome (10px, app.css's
// heroFloat) and the lockup's fadeUp moves away from it (30px low, settling) —
// opposite directions, same problem for this pass: the audit in section 5 reads a
// rect, and a rect sampled mid-animation is not the resting position it is being
// compared against.
const phoneBlock = /@media\s*\(\s*max-width:\s*639px\s*\)\s*\{([\s\S]*?)\n    \}/.exec(CSS);
must(phoneBlock, "the phone hero media query is no longer recognisable in index.html");
const shortBlock =
  /@media\s*\(\s*max-width:\s*639px\s*\)\s*and\s*\(\s*max-height:\s*720px\s*\)\s*\{([\s\S]*?)\n    \}/.exec(CSS);
must(shortBlock, "the short-phone hero media query is no longer recognisable in index.html");

for (const half of [
  { sel: "\\.hero-stack-top\\.animate-float", what: "the PX/LIVE badge's float" },
  { sel: "\\.hero-brand\\.animate-fadeUp", what: "the POLITIDEX lockup's entrance" },
]) {
  const rule = new RegExp("#hero\\s*>\\s*" + half.sel + "\\s*\\{([^}]*)\\}").exec(phoneBlock[1]);
  ok(!!rule && /animation\s*:\s*none/.test(rule[1]) && /transform\s*:\s*none/.test(rule[1]),
     "PHONE MOTION: the phone block does not switch off " + half.what + " with both `animation: none` " +
     "and `transform: none` in one rule (got " + JSON.stringify(rule && rule[1]) + "). The animation is " +
     "what moves it; the transform is what an engine can leave behind when an animation is cancelled " +
     "mid-cycle. The runtime audit compares this element's rect against the Eye row's, so a residual " +
     "translate is a wrong answer to the one measurement allowed to move the page.");
}
// The paint the animations were hiding must still be paid for in the sum: the pill
// hangs above the badge box whether or not anything is animating.
ok(!/--pdx-hero-overhang\s*:\s*0px/.test(shortBlock[1]),
   "PHONE MOTION: the short-phone block zeroes --pdx-hero-overhang. That term is the LIVE pill's 8px of " +
   "paint above the badge box, and it is zero only while the badge is not rendered — which, after this " +
   "pass, it always is.");

// ═══════════════════════════════════════════════════════════════════════════
// 3 · THE PADDING IS THE MEASURED ROW PLUS AT LEAST 24px
// ═══════════════════════════════════════════════════════════════════════════
const PUB = (() => {
  const blocks = [...HTML.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter((m) => !/\bsrc=/.test(m[1]))
    .map((m) => m[2])
    .filter((src) => src.includes("--pdx-hero-top") && src.includes("pdx-topnav"));
  must(blocks.length === 1,
       "expected exactly one inline <script> in index.html to publish --pdx-hero-top; found " +
       blocks.length + ". Section 5 runs that block in a fixture DOM and cannot guess which one.");
  return blocks[0];
})();

const AIR_FORCED = 24;   // what the page must ADD
const GATE = 16;         // what the rendered geometry must BEAT

{
  const air = /var HERO_AIR = (\d+)/.exec(PUB);
  must(air, "the publisher no longer states HERO_AIR");
  ok(parseInt(air[1], 10) >= AIR_FORCED,
     "FORCED AIR: the publisher forces " + air[1] + "px of air after the measured row and the measured " +
     "overhang. The brief's floor for this pass is " + AIR_FORCED + "px — deliberately above the " + GATE +
     "px the geometry is asserted against, because forcing exactly the asserted threshold leaves nothing " +
     "for a fractional device pixel ratio to round away.");
  const gate = /var HERO_GATE = (\d+)/.exec(PUB);
  must(gate, "the publisher no longer states HERO_GATE — the asserted floor is not stated in the code " +
       "that is supposed to enforce it");
  ok(parseInt(gate[1], 10) >= GATE && parseInt(gate[1], 10) <= parseInt(air[1], 10),
     "FORCED AIR: HERO_GATE is " + gate[1] + "px against HERO_AIR " + air[1] + "px. The gate is the floor " +
     "the rendered gap must beat (" + GATE + "px) and it must never exceed the air the sum forces — the " +
     "audit would then chase a target the sum cannot reach and top the padding up on every pass until it " +
     "hit its cap.");
  const cssAir = /--pdx-hero-air\s*:\s*([\d.]+)px/.exec(CSS);
  must(cssAir, "--pdx-hero-air is no longer declared in index.html");
  ok(parseFloat(cssAir[1]) === parseInt(air[1], 10),
     "FORCED AIR: the stylesheet's --pdx-hero-air is " + cssAir[1] + "px and the publisher's HERO_AIR is " +
     air[1] + "px. They are one guarantee stated twice — the no-JS fallback and the measured value — so a " +
     "difference is a visible jump the moment the measurement lands.");

  // Measured from the row, not from the nav box and not from a literal.
  ok(/querySelector\(\s*['"]\.pdx-eye-row['"]\s*\)/.test(PUB) &&
     /eye\.getBoundingClientRect\(\)\.bottom/.test(PUB),
     "FORCED AIR: the publisher no longer derives the offset from .pdx-eye-row's measured bottom edge. " +
     "That row is the last PERMANENT row of the nav — the drawer is rendered after it — so its " +
     "viewport-relative bottom on a nav pinned at top:0 is the depth of the chrome, safe-area inset " +
     "included.");
  // The audit exists, is wired into the measurement, and is bounded.
  ok(/function auditHeroClearance/.test(PUB) && /scheduleAudit\(\)/.test(PUB),
     "FORCED AIR: the publisher no longer audits the clearance it published. The sum has been wrong " +
     "three times in ways no arithmetic test could see; reading the rendered rect back is what makes " +
     "the next wrong term self-correcting.");
  ok(/FORCE_CAP/.test(PUB) && /auditPasses/.test(PUB),
     "FORCED AIR: the audit no longer bounds itself. It writes a padding, re-reads layout and can write " +
     "again — without a pass counter and a total cap that is a loop on layout, and pushing the hero off " +
     "the bottom of the screen is a worse bug than the one it fixes.");
  // Exactly one padding-top declaration, reading the published value. (The
  // arithmetic file checks this too; it is restated because section 5's fixture is
  // only meaningful if the padding it publishes is the padding that renders.)
  const decls = [];
  for (const [file, src] of SHEETS) {
    for (const m of src.matchAll(/#hero\s*\{([^}]*)\}/g)) {
      const pt = /(?:^|;)\s*padding(?:-top)?\s*:\s*([^;]+)/.exec(m[1]);
      if (pt) decls.push(file + ": " + pt[1].trim());
    }
  }
  ok(decls.length === 1 && /^var\(\s*--pdx-hero-top\s*\)$/.test(decls[0].split(": ").slice(1).join(": ")),
     "FORCED AIR: #hero's top padding is " + JSON.stringify(decls) + ". It must be exactly one " +
     "declaration reading var(--pdx-hero-top), or the value this file's fixture computes is not the " +
     "value the phone renders.");
}

// ═══════════════════════════════════════════════════════════════════════════
// 4 · THE STABILITY GUARD CANNOT STRAND THE READER BELOW THE TRUE TOP
// ═══════════════════════════════════════════════════════════════════════════
// The clearance is defined at scroll 0. If a correction can leave the page resting
// anywhere below that, the reader never sees the position the whole sum was
// computed for — which is the "still too tight / wrong" half of the report.
const STAB = read("pdx-stability.js");
{
  ok(/function topReach\s*\(/.test(STAB) && /--pdx-chrome/.test(STAB),
     "REST POSITION: pdx-stability.js no longer derives a top-reach band from the measured --pdx-chrome. " +
     "TOP_BAND (8px) only covers 'already at the top'; the band in which a DOWNWARD correction is never " +
     "legitimate is the whole depth of the fixed chrome, because the only thing above the viewport in " +
     "there is the hero's own padding and padding does not hydrate.");
  ok(/delta\s*>\s*0\s*&&\s*[\w.()]+\s*<=\s*topReach\(\)/.test(STAB.replace(/\s+/g, " ")),
     "REST POSITION: nothing refuses a DOWNWARD correction inside the top-reach band. A positive delta " +
     "applied there is precisely what lands a reader who flung toward the hero a hundred-odd pixels " +
     "short of the top, with the lockup still behind the search row.");
  ok(/if\s*\(!\(y\s*>\s*0\)\)\s*y\s*=\s*0/.test(STAB),
     "REST POSITION: scrollToInstant no longer clamps its target to the document's top edge. iOS takes a " +
     "negative offset as a rubber band and settles back, which reads as a bounce at exactly the moment " +
     "the reader is trying to hold the true top.");
}

// ═══════════════════════════════════════════════════════════════════════════
// 5 · THE GEOMETRY, RUN — first brand top vs .pdx-eye-row bottom
// ═══════════════════════════════════════════════════════════════════════════
// The publisher block is executed against a fixture DOM whose layout is modelled
// the way a browser's is: the first visible brand element sits at the published
// padding, less `eat` px — `eat` standing in for whatever term the sum does not
// know about (a margin that collapsed, a wrapped row, a scaled font, the exact
// class of bug that made this the fourth pass over this hero). The assertion is
// the report's: rect.top of the first visible brand element must beat the Eye
// row's bottom by more than 16px.
const CSS_FALLBACK_TOP = 164;   // 7.125rem chrome + 8 + 10 + 8 + 24, before any measurement

function runPublisher(opts) {
  const o = opts || {};
  const EYE_BOTTOM = o.eyeBottom == null ? 160 : o.eyeBottom;
  const EAT = o.eat || 0;
  const raf = [];
  const style = (() => {
    const p = new Map();
    return {
      _p: p,
      setProperty: (k, v) => p.set(k, String(v)),
      getPropertyValue: (k) => (p.has(k) ? p.get(k) : ""),
      removeProperty: (k) => p.delete(k),
    };
  })();
  // The published padding, as a number, or the stylesheet's fallback before the
  // first write — exactly what the browser would be laying out with.
  const padTop = () => {
    const v = parseFloat(style.getPropertyValue("--pdx-hero-top"));
    return v > 0 ? v : CSS_FALLBACK_TOP;
  };

  function el(tag, extra) {
    const e = Object.assign({
      tagName: String(tag).toUpperCase(),
      _display: "block", _position: "static", _visibility: "visible",
      children: [], _kids: [],
      querySelectorAll(sel) { return sel === "*" ? e._kids : []; },
      querySelector() { return null; },
      addEventListener() {}, removeEventListener() {},
      contains() { return false; },
      getBoundingClientRect() { return { top: 0, bottom: 0, width: 0, height: 0 }; },
    }, extra || {});
    return e;
  }

  // The nav: fixed at top:0, so the row's bottom does not move with scroll.
  const eye = el("div", {
    getBoundingClientRect: () => ({ top: EYE_BOTTOM - 60, bottom: EYE_BOTTOM, width: 390, height: 60 }),
  });
  const nav = el("nav", {
    querySelector: (s) => (s === ".pdx-eye-row" ? eye : null),
    getBoundingClientRect: () => ({ top: 0, bottom: EYE_BOTTOM, width: 390, height: EYE_BOTTOM }),
  });

  // The hero's children. The decoration layer is absolute (skipped by
  // firstFlowChild), then the badge stack, the lockup, the headline. Rects are
  // derived from the CURRENT published padding on every read, which is what makes
  // the audit's second pass meaningful.
  const decor = el("div", { _position: "absolute" });
  const stack = el("div", { _display: o.hideStack ? "none" : "block" });
  const brand = el("div");
  const h1 = el("h1");
  const flow = [stack, brand, h1];
  const visible = () => flow.filter((e) => e._display !== "none");
  // Whatever is first and visible starts at the padding, less the unbudgeted term.
  // Viewport coordinates, so the reader's scroll offset comes off the top the way
  // a real rect's does — the Eye row's does NOT, because the nav is fixed. Reading
  // one of each and getting the comparison right is the whole trick of the audit.
  const topOf = (e) => {
    const list = visible();
    const i = list.indexOf(e);
    if (i < 0) return { top: -9999, bottom: -9999, width: 0, height: 0 };   // not rendered
    const top = padTop() - EAT + i * 60 - (o.scrollY || 0);
    return { top, bottom: top + 48, width: 300, height: 48 };
  };
  for (const e of flow) e.getBoundingClientRect = () => topOf(e);
  // The LIVE pill: 8px of paint above the badge box, which is what paintOverhang
  // is there to find.
  const pill = el("div", {
    getBoundingClientRect: () => {
      const r = topOf(stack);
      return { top: r.top - 8, bottom: r.top + 12, width: 44, height: 20 };
    },
  });
  stack._kids = [pill];

  const hero = el("section", {
    children: [decor, stack, brand, h1],
    querySelectorAll: (sel) => (/hero-stack-top/.test(sel) ? flow : []),
  });

  const attrs = new Map();
  const doc = {
    documentElement: {
      style,
      setAttribute: (k, v) => attrs.set(k, String(v)),
      getAttribute: (k) => (attrs.has(k) ? attrs.get(k) : null),
      removeAttribute: (k) => attrs.delete(k),
    },
    body: el("body"),
    activeElement: null,
    readyState: "complete",
    getElementById: (id) => (id === "pdx-topnav" ? nav : id === "hero" ? hero : null),
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener() {},
  };

  const ctx = {
    console,
    document: doc,
    getComputedStyle: (e) => ({ display: e._display, position: e._position, visibility: e._visibility }),
    matchMedia: () => ({ matches: o.phone !== false, addListener() {}, removeListener() {} }),
    requestAnimationFrame: (fn) => { raf.push(fn); return raf.length; },
    setTimeout: (fn) => { raf.push(fn); return 0; },
    addEventListener() {},
    scrollY: o.scrollY || 0,
    pageYOffset: o.scrollY || 0,
  };
  ctx.window = ctx;
  ctx.window.getComputedStyle = ctx.getComputedStyle;
  vm.createContext(ctx);
  vm.runInContext(PUB, ctx, { filename: "index.html#chrome-publisher" });

  // Drain the frame queue the way a browser would, bounded — an audit that has not
  // settled in a dozen frames is a loop on layout, and that is a failure too.
  let frames = 0;
  while (raf.length && frames < 24) {
    const batch = raf.splice(0, raf.length);
    for (const fn of batch) fn();
    frames++;
  }

  const first = visible()[0] || null;
  // The report is made at the highest reachable position, so the assertion is
  // stated there: the element's own document offset (rect.top + scrollY) against
  // the row bottom, which is scroll-invariant.
  const atTop = first ? first.getBoundingClientRect().top + (o.scrollY || 0) : null;
  return {
    frames,
    settled: raf.length === 0,
    chrome: style.getPropertyValue("--pdx-chrome"),
    heroTop: padTop(),
    rowBottom: EYE_BOTTOM,
    brandTop: atTop,
    gap: atTop === null ? null : Math.round(atTop - EYE_BOTTOM),
    reported: attrs.has("data-pdx-hero-gap") ? parseFloat(attrs.get("data-pdx-hero-gap")) : null,
    gateFlag: attrs.has("data-pdx-hero-gate"),
  };
}

// The rule, as a function, so the deliberately-broken case at the end can be
// checked with the same code the real cases are.
const clears = (r) => r.brandTop !== null && r.gap > GATE;

{
  const CASES = [
    { label: "a sum that is exactly right (nothing unbudgeted)", opts: {} },
    { label: "40px of the padding eaten by an unbudgeted term", opts: { eat: 40 } },
    { label: "120px eaten — a wrapped nav row plus a font scale", opts: { eat: 120 } },
    { label: "the reader is 600px down the page when it measures", opts: { eat: 40, scrollY: 600 } },
    { label: "tall notched chrome (172px) with 40px eaten", opts: { eyeBottom: 172, eat: 40 } },
    { label: "a regression re-hides the badge: the lockup is first", opts: { hideStack: true, eat: 40 } },
  ];
  for (const c of CASES) {
    const r = runPublisher(c.opts);
    ok(r.chrome === r.rowBottom + "px",
       "GEOMETRY (" + c.label + "): --pdx-chrome published as " + JSON.stringify(r.chrome) + " against an " +
       "Eye row whose measured bottom is " + r.rowBottom + "px.");
    ok(clears(r),
       "GEOMETRY (" + c.label + "): at scroll 0 the first visible hero brand element's rect.top is " +
       r.brandTop + "px and the bottom of .pdx-eye-row is " + r.rowBottom + "px — a gap of " + r.gap +
       "px, which does not beat the " + GATE + "px floor. " +
       (r.gap <= 0 ? "The lockup is UNDER the search row." : "The lockup is too tight against it.") +
       " The published padding was " + r.heroTop + "px. This is the assertion the report asks for: the " +
       "brand lockup appears fully below the Eye, or this fails.");
    ok(r.settled,
       "GEOMETRY (" + c.label + "): the clearance audit had not settled after " + r.frames + " frames. It " +
       "reads layout, writes a padding and re-reads — an unbounded version of that is a loop that pushes " +
       "the hero down the page frame after frame.");
    // The same number, readable off a real phone rather than inferred from a
    // screenshot: <html data-pdx-hero-gap="…">.
    ok(r.reported === r.gap && !r.gateFlag,
       "GEOMETRY (" + c.label + "): <html> reports data-pdx-hero-gap=" + JSON.stringify(r.reported) +
       " and data-pdx-hero-gate " + (r.gateFlag ? "FAIL" : "clear") + " while the fixture measures " +
       r.gap + "px. That attribute is the readout this pass exists to make checkable on a device, so it " +
       "has to be the gap the audit actually enforced.");
  }
}

// THE ASSERTION HAS TEETH. If the audit cannot fix the shortfall (600px eaten is
// far past its cap, which is deliberate — past that the stylesheet is wrong and a
// script must not paper over it), the gap stays short and `clears()` must say so.
// A green run where this case also "passed" would mean section 5 stopped checking
// anything at all.
{
  const broken = runPublisher({ eat: 600 });
  ok(!clears(broken),
     "TEETH: with 600px of the hero's padding eaten — far past what the audit is capped at topping up — " +
     "the first brand element lands at " + broken.brandTop + "px against a row bottom of " +
     broken.rowBottom + "px (gap " + broken.gap + "px) and clears() still reported PASS. The check in " +
     "this section is therefore not testing anything: fix the check, not the fixture.");
  ok(broken.settled,
     "TEETH: even in the uncorrectable case the audit stops trying. Its cap is what makes that true.");
  ok(broken.gateFlag && broken.reported === broken.gap,
     "TEETH: the uncorrectable case leaves <html> reporting data-pdx-hero-gap=" +
     JSON.stringify(broken.reported) + " with the gate flag " + (broken.gateFlag ? "set" : "CLEAR") +
     ". A shortfall the script cannot fix is exactly the case that has to be visible on the device, " +
     "rather than silently absorbed.");
}

// ═══════════════════════════════════════════════════════════════════════════
// 6 · THE FIX CAN REACH A PHONE
// ═══════════════════════════════════════════════════════════════════════════
// Navigations are stale-while-revalidate and there is no shift-reload on a
// handset: a phone with a warm shell cache is served the PREVIOUS index.html.
{
  const sw = read("sw.js");
  const ver = /const\s+CACHE_VERSION\s*=\s*'([^']+)'/.exec(sw);
  must(ver, "sw.js no longer declares CACHE_VERSION");
  ok(parseInt(ver[1].replace(/\D/g, ""), 10) >= 57,
     "shell delivery: sw.js CACHE_VERSION is " + ver[1] + ". v56 is the shell that shipped WITH the " +
     "badge hidden on short phones, so a phone holding that cache keeps being served it on a hard open " +
     "and this fix is invisible on exactly the gesture the report is made with. Bump the version whenever " +
     "the hero's chrome or brand stack changes.");
}

if (failures.length) {
  console.error("\n✖ mobile hero brand: " + failures.length + " failure(s)\n");
  failures.forEach((f) => console.error("  · " + f));
  console.error("");
  process.exit(1);
}
console.log("✓ mobile hero brand: all " + passed +
  " assertions passed — the PX/LIVE badge and the POLITIDEX / BOUND BY TRUTH lockup render at every " +
  "phone size, carry no float or transform there, and land more than " + GATE +
  "px below the measured bottom of .pdx-eye-row at scroll 0");
