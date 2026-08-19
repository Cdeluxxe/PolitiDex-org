#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// MOBILE HERO CLEARANCE — no hero text may intersect the Eye row's band
// ─────────────────────────────────────────────────────────────────────────────
// Reported on phones, at the highest reachable scroll position, after a hard
// open: the fixed nav and its All-Seeing Eye search row covered the top of the
// hero. The top of "WHAT THEY SAID. WHAT THEY DID." was cut off and the
// PX / POLITIDEX lockup was not cleanly visible above the headlines.
//
// WHY THE PREVIOUS VERSION OF THIS FILE PASSED WHILE THAT WAS LIVE. It asserted
//
//     air >= pill overhang (8px) + float amplitude + 4px still visible
//
// and it read the float amplitude out of the `float` keyframe in
// css/tailwind.css, which peaks at translateY(-8px). But app.css re-points the
// hero's copy of that class at a different animation:
//
//     #hero .animate-float { animation: heroFloat 4s ease-in-out infinite; }
//     @keyframes heroFloat { 0%,100% { translateY(0) } 50% { translateY(-10px) } }
//
// One id plus one class beats one class, so the hero badge has always floated
// 10px, not 8 — the air term was two pixels short of its own premise. And the
// overhanging thing is not a hard edge: the LIVE pill carries
// shadow-[0_0_14px_rgba(217,26,49,0.85)], a bloom that getBoundingClientRect()
// cannot see and that no pass budgeted for. 8 + 10 + 14 = 32px of travel against
// 20px of air, i.e. 12px under the search row at the top of every cycle.
//
// So this file no longer checks an air term against a remembered keyframe. It
// resolves the SHIPPED custom-property chain — the same one the browser
// resolves — into a linear form in the measured chrome, per breakpoint, and then
// asks the only question that matters:
//
//     is the highest pixel the hero paints still at least AIR px below the
//     bottom edge of the Eye row, for every plausible chrome depth?
//
// A hero that is pinned to a literal instead of the measurement fails here,
// because the linear form loses its chrome term. A float amplitude that drifts
// fails, because the travel is read from app.css. A clearance that stops
// covering the overhang fails, because the overhang is read from tailwind.css.
//
//   node scripts/test-mobile-hero-clearance.mjs
//
// No database, no network, no browser. Exit code is non-zero on the first failure.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

const failures = [];
let passed = 0;
const ok = (cond, msg) => { cond ? passed++ : failures.push(msg); };
// A harness that has drifted from the files it tests reports "all green" for the
// wrong reason. must() ends the run instead, with exit code 2.
const must = (cond, msg) => {
  if (cond) { passed++; return; }
  console.error("\n✖ mobile hero clearance: HARNESS STALE — " + msg + "\n");
  process.exit(2);
};

const stripCss = (src) => src.replace(/\/\*[\s\S]*?\*\//g, " ");

const HTML = read("index.html");
// Only what is actually inside a <style> element. Taking the whole document would
// also pick up the prose in the HTML comments — several of which quote old CSS
// declarations verbatim while explaining why they were wrong, which is exactly the
// text the checks below are looking for.
const CSS = stripCss(
  [...HTML.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join("\n")
);
const TW = stripCss(read("css/tailwind.css"));
const APP = stripCss(read("app.css"));

const REM = 16;
const toPx = (v) => {
  const m = /^\s*(-?[\d.]+)(px|rem|em)?\s*$/.exec(String(v));
  if (!m) return null;
  return m[2] === "rem" || m[2] === "em" ? parseFloat(m[1]) * REM : parseFloat(m[1]);
};

// A Tailwind offset utility's real value, read out of the built stylesheet rather
// than assumed — `-top-2` is only 8px because the spacing scale says so, and the
// whole point of this file is not to re-guess numbers.
function twOffset(cls) {
  const esc = cls.replace(/[-]/g, "\\-");
  const re = new RegExp("\\." + esc + "(?![\\w-])[^{]*\\{[^}]*?top\\s*:\\s*(-?[\\d.]+(?:px|rem)?)");
  const m = re.exec(TW);
  return m ? toPx(m[1]) : null;
}

// The amplitude of a keyframe animation's travel toward the top of the screen: the
// most negative translateY it ever reaches, as a positive number of pixels. Looked
// up in whichever stylesheet is passed, because the hero's float lives in app.css
// and the utility's default lives in tailwind.css.
function upwardTravel(src, name) {
  const open = new RegExp("@keyframes\\s+" + name + "\\s*\\{", "g");
  const m = open.exec(src);
  if (!m) return null;
  let i = m.index + m[0].length, depth = 1;
  while (depth && i < src.length) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") depth--;
    i++;
  }
  const body = src.slice(m.index, i);
  let up = 0;
  for (const t of body.matchAll(/translateY\(\s*(-?[\d.]+)(px|rem)?\s*\)/g)) {
    const px = toPx(t[1] + (t[2] || "px"));
    if (px !== null && px < 0) up = Math.max(up, -px);
  }
  return up;
}

// ═══════════════════════════════════════════════════════════════════════════
// 0 · THE SHIPPED CUSTOM-PROPERTY CHAIN, RESOLVED THE WAY A BROWSER DOES
// ═══════════════════════════════════════════════════════════════════════════
// Values are kept as a linear form { chrome, px }: `chrome` is the coefficient on
// the measured --pdx-chrome and `px` is the constant. That is what lets the band
// check below run over a whole range of chrome depths, and what makes a hero
// pinned to a literal detectable — its chrome coefficient is 0.
const ZERO = { chrome: 0, px: 0 };
const add = (a, b) => ({ chrome: a.chrome + b.chrome, px: a.px + b.px });
const neg = (a) => ({ chrome: -a.chrome, px: -a.px });

// Split on top-level + / - only (the shipped chain uses nothing else), respecting
// nesting so `calc(var(--a) + var(--b))` is one term until it is unwrapped.
function splitTerms(expr) {
  const out = [];
  let depth = 0, cur = "", sign = 1;
  for (let i = 0; i < expr.length; i++) {
    const c = expr[i];
    if (c === "(") depth++;
    if (c === ")") depth--;
    if (depth === 0 && (c === "+" || c === "-") && /[\s)]/.test(expr[i - 1] || " ")) {
      out.push({ sign, expr: cur });
      cur = ""; sign = c === "-" ? -1 : 1;
      continue;
    }
    cur += c;
  }
  out.push({ sign, expr: cur });
  return out.filter((t) => t.expr.trim());
}

function resolveValue(expr, vars, seen = new Set()) {
  const src = String(expr).trim();
  if (!src) return null;

  const calc = /^calc\(([\s\S]*)\)$/.exec(src);
  if (calc) return resolveValue(calc[1], vars, seen);

  const terms = splitTerms(src);
  if (terms.length > 1) {
    let acc = ZERO;
    for (const t of terms) {
      const v = resolveValue(t.expr, vars, seen);
      if (v === null) return null;
      acc = add(acc, t.sign < 0 ? neg(v) : v);
    }
    return acc;
  }

  const one = terms[0].expr.trim();

  // env(safe-area-inset-*) is a device value, not a layout constant. It is real
  // chrome and the nav is padded by it, so it is counted as part of the measured
  // chrome — this file's band sweep covers the range it can take.
  if (/^env\(/.test(one)) {
    const fb = /,\s*([^)]+)\)\s*$/.exec(one);
    return fb ? resolveValue(fb[1], vars, seen) : ZERO;
  }

  const v = /^var\(\s*(--[\w-]+)\s*(?:,([\s\S]*))?\)$/.exec(one);
  if (v) {
    const name = v[1];
    if (name === "--pdx-chrome") return { chrome: 1, px: 0 };
    if (seen.has(name)) return null;                       // cycle
    if (Object.prototype.hasOwnProperty.call(vars, name)) {
      return resolveValue(vars[name], vars, new Set([...seen, name]));
    }
    return v[2] != null ? resolveValue(v[2], vars, seen) : null;
  }

  const px = toPx(one);
  return px === null ? null : { chrome: 0, px };
}

// Every `--pdx-*` declared on :root inside a chunk of CSS, later wins.
function rootVars(chunk) {
  const out = {};
  for (const m of chunk.matchAll(/:root\s*\{([^}]*)\}/g)) {
    for (const d of m[1].split(";")) {
      const kv = /^\s*(--[\w-]+)\s*:\s*([\s\S]+)$/.exec(d);
      if (kv) out[kv[1]] = kv[2].trim();
    }
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════
// 1 · THE THREE BREAKPOINTS THE HERO IS STATED AT
// ═══════════════════════════════════════════════════════════════════════════
const heroStart = HTML.indexOf('<section id="hero"');
must(heroStart > 0, "the #hero section is no longer recognisable in index.html");

const phoneBlock = /@media\s*\(\s*max-width:\s*639px\s*\)\s*\{([\s\S]*?)\n    \}/.exec(CSS);
must(phoneBlock, "the phone hero media query is no longer recognisable in index.html");
const shortBlock = /@media\s*\(\s*max-width:\s*639px\s*\)\s*and\s*\(\s*max-height:\s*720px\s*\)\s*\{([\s\S]*?)\n    \}/.exec(CSS);
must(shortBlock, "the short-phone hero media query is no longer recognisable in index.html");

// The unscoped declarations: everything outside the two phone blocks.
const outside = CSS.replace(phoneBlock[0], " ").replace(shortBlock[0], " ");

const baseVars = rootVars(outside);
const phoneVars = { ...baseVars, ...rootVars(phoneBlock[1]) };
const shortVars = { ...phoneVars, ...rootVars(shortBlock[1]) };

// ═══════════════════════════════════════════════════════════════════════════
// 2 · #hero's TOP PADDING IS THE MEASUREMENT, NOT AN ADD-ON TO A GUESS
// ═══════════════════════════════════════════════════════════════════════════
// Exactly one declaration, and it consumes the published variable. A literal here
// — or a second declaration in a stylesheet that loads later — is how this drifted
// out of step every previous time.
{
  const decls = [];
  for (const [file, src] of [["index.html", CSS], ["app.css", APP],
                             ["app-2.css", stripCss(read("app-2.css"))],
                             ["mobile-polish.css", stripCss(read("mobile-polish.css"))]]) {
    for (const m of src.matchAll(/#hero\s*\{([^}]*)\}/g)) {
      const pt = /(?:^|;)\s*padding-top\s*:\s*([^;]+)/.exec(m[1]);
      if (pt) decls.push({ file, value: pt[1].trim() });
      const pad = /(?:^|;)\s*padding\s*:\s*([^;]+)/.exec(m[1]);
      if (pad) decls.push({ file, value: "shorthand padding: " + pad[1].trim() });
    }
  }
  must(decls.length > 0, "#hero no longer declares a top padding anywhere — the hero's clearance " +
       "of the fixed chrome has been deleted rather than changed");
  ok(decls.length === 1 && /^var\(\s*--pdx-hero-top\s*\)$/.test(decls[0].value),
     "HERO TOP PADDING: #hero's top padding is declared as " + JSON.stringify(decls) + ". It must be " +
     "exactly one declaration reading `var(--pdx-hero-top)` — the value the publisher under the nav " +
     "writes from the MEASURED bottom of the Eye row plus the measured hero overhang. A literal, a rem " +
     "add-on, or a second declaration in a later stylesheet is the drift that put the headline under the " +
     "search row.");
}

// ═══════════════════════════════════════════════════════════════════════════
// 3 · THE TRAVEL, READ FROM THE FILES THAT ACTUALLY DEFINE IT
// ═══════════════════════════════════════════════════════════════════════════
// How far above the hero's own box the hero paints, and how far that paint can
// then move toward the chrome. Every number here comes out of a shipped file.

// (a) The overhang. The badge tile carries the LIVE pill at `-top-2 -right-2`.
const stackStart = HTML.indexOf("hero-stack-top", heroStart);
must(stackStart > 0, "#hero no longer contains a .hero-stack-top child");
const brandStart = HTML.indexOf("hero-brand", stackStart);
must(brandStart > stackStart, "#hero no longer contains a .hero-brand child after .hero-stack-top");
const stackMarkup = HTML.slice(HTML.lastIndexOf("<div", stackStart), brandStart);

const overhangs = [...stackMarkup.matchAll(/class="([^"]*)"/g)]
  .flatMap((m) => m[1].split(/\s+/))
  .filter((c) => /^-top-/.test(c))
  .map((c) => ({ cls: c, px: twOffset(c) }));
must(overhangs.length > 0,
     "no negatively-offset child found inside .hero-stack-top — the LIVE pill used to be " +
     "`-top-2 -right-2` and this file exists because that overhang was not being counted. If the " +
     "pill is genuinely gone, delete this block; do not weaken it.");
must(overhangs.every((o) => o.px !== null),
     "a -top-* class inside .hero-stack-top has no value in css/tailwind.css: " +
     JSON.stringify(overhangs));
const OVERHANG = Math.max(...overhangs.map((o) => -o.px));
ok(OVERHANG > 0,
   "hero overhang: the badge stack's negative top offsets read as " + OVERHANG + "px, which cannot be " +
   "right — the LIVE pill hangs above the badge tile and that distance is part of the clearance");

// (b) The float. THE ONE THE HERO ACTUALLY RUNS, which is app.css's override and
// not the utility's default. This is the assertion the old harness did not make
// and the reason it stayed green through the live failure.
const TW_FLOAT = upwardTravel(TW, "float");
must(TW_FLOAT !== null, "the float keyframe is no longer recognisable in css/tailwind.css");
const heroFloatOverride =
  /#hero\s+\.animate-float\s*\{[^}]*animation\s*:\s*([\w-]+)/.exec(APP);
const HERO_FLOAT_NAME = heroFloatOverride ? heroFloatOverride[1] : "float";
const HERO_FLOAT = HERO_FLOAT_NAME === "float"
  ? TW_FLOAT
  : upwardTravel(APP, HERO_FLOAT_NAME);
must(HERO_FLOAT !== null,
     "#hero .animate-float in app.css runs `" + HERO_FLOAT_NAME + "`, and no @keyframes by that name " +
     "is readable in app.css — so the distance the hero badge travels toward the search row cannot be " +
     "checked at all");
ok(HERO_FLOAT >= TW_FLOAT,
   "hero float: app.css runs `" + HERO_FLOAT_NAME + "` (" + HERO_FLOAT + "px) on #hero .animate-float " +
   "while css/tailwind.css's `float` is " + TW_FLOAT + "px. Whichever is larger is the travel that has " +
   "to be cleared; this check exists only to make the discrepancy visible.");

// (c) What no rect reports. The pill's glow and the wordmark's drop shadow.
const glow = /shadow-\[0_0_(\d+)px_rgba\(217,26,49/.exec(stackMarkup);
const GLOW = glow ? parseInt(glow[1], 10) : 0;
ok(GLOW > 0,
   "hero bleed: the LIVE pill's `shadow-[0_0_Npx_rgba(217,26,49,…)]` glow is no longer readable in the " +
   "badge markup. It is the part of the hero that no getBoundingClientRect() reports, and budgeting " +
   "zero for it is how the ghosted mark under the bar survived three clearance passes.");

// ═══════════════════════════════════════════════════════════════════════════
// 4 · THE PHONE PAYS FOR NONE OF THE FLOAT — IT SWITCHES IT OFF
// ═══════════════════════════════════════════════════════════════════════════
// The requirement is either/or: disable the motion on a phone, or add its full
// travel to the clearance. Whichever the stylesheet chose, the sum below has to
// match it, so the two are checked together.
const phoneFloatOff =
  /#hero\s*>\s*\.hero-stack-top\.animate-float\s*\{[^}]*animation\s*:\s*none/.test(phoneBlock[1]);
const phoneFloatVar = resolveValue(phoneVars["--pdx-hero-float"] ?? "0px", phoneVars);
must(phoneFloatVar, "--pdx-hero-float does not resolve inside the phone block");
ok(phoneFloatOff === (phoneFloatVar.px === 0),
   "PHONE FLOAT: the phone block " + (phoneFloatOff ? "disables" : "keeps") + " the hero stack's float " +
   "animation but budgets " + phoneFloatVar.px + "px for it. Those have to agree: either " +
   "`#hero > .hero-stack-top.animate-float { animation: none }` and --pdx-hero-float: 0px, or the " +
   "animation stays and --pdx-hero-float carries its full " + HERO_FLOAT + "px of travel.");
ok(!phoneFloatOff || /transform\s*:\s*none/.test(
     /#hero\s*>\s*\.hero-stack-top\.animate-float\s*\{([^}]*)\}/.exec(phoneBlock[1])?.[1] || ""),
   "PHONE FLOAT: the phone block sets `animation: none` on the hero stack but leaves the transform " +
   "behind. An animation cancelled mid-cycle can leave a residual translate on some engines; state " +
   "`transform: none` alongside it so the resting position is the resting position.");

// The short-phone block hides the badge outright, which is the only reason its
// clearance is allowed to be the smallest in the document.
const badgeHidden = /#hero\s*>\s*\.hero-stack-top\s*\{\s*display\s*:\s*none/.test(shortBlock[1]);
const shortOverhang = resolveValue(shortVars["--pdx-hero-overhang"] ?? "0px", shortVars);
must(shortOverhang, "--pdx-hero-overhang does not resolve inside the short-phone block");
ok(badgeHidden === (shortOverhang.px === 0),
   "SHORT PHONE: the block " + (badgeHidden ? "hides" : "shows") + " .hero-stack-top but budgets " +
   shortOverhang.px + "px of overhang. The overhang is the LIVE pill's; it is zero only while the badge " +
   "that carries it is display:none.");

// ═══════════════════════════════════════════════════════════════════════════
// 5 · THE BAND CHECK — NO HERO TEXT MAY INTERSECT THE EYE ROW
// ═══════════════════════════════════════════════════════════════════════════
// This is the test the report asks for. The Eye row's band is [0, chrome] in
// viewport coordinates at scroll 0 (the nav is fixed at top:0 and --pdx-chrome is
// the measured bottom edge of its last permanent row). The highest pixel the hero
// paints is
//
//     heroTop(chrome) − overhang − float − bleed
//
// and it must sit at least AIR below the band for every chrome depth a real device
// can produce: two nav rows at any font scale, plus a safe-area inset of 0 on a
// flat screen through ~59px on a notched iPhone.
const CHROME_PROFILES = [
  { label: "flat screen, 16px root",            px: 113 },
  { label: "flat screen, 20px root",            px: 142 },
  { label: "Android cutout (24px inset)",       px: 137 },
  { label: "notched iPhone (47px inset)",       px: 160 },
  { label: "notched iPhone (59px inset)",       px: 172 },
  { label: "notched + 20px root font scaling",  px: 201 },
  { label: "wrapped nav row, worst case",       px: 260 },
];

const AIR_REQUIRED = 16;   // the report's floor: "measured bottom + at least 16px"

const BREAKPOINTS = [
  { label: "desktop / tablet (no media query)", vars: baseVars,  floatRuns: true },
  { label: "phone (≤639px)",                    vars: phoneVars, floatRuns: !phoneFloatOff },
  { label: "short phone (≤639px, ≤720px tall)", vars: shortVars, floatRuns: false },
];

for (const bp of BREAKPOINTS) {
  const top = resolveValue(bp.vars["--pdx-hero-top"], bp.vars);
  must(top, bp.label + ": --pdx-hero-top does not resolve. #hero's padding reads it, so an " +
       "unresolvable value collapses the entire clearance to zero and puts the whole hero under the bar.");

  // THE CLEARANCE HAS TO BE THE MEASUREMENT. A chrome coefficient of 1 means
  // "one whole measured chrome, then air"; 0 means somebody went back to a
  // literal, which is the failure mode this whole system exists to prevent.
  ok(top.chrome === 1,
     "CHROME-RELATIVE (" + bp.label + "): --pdx-hero-top resolves to " + top.chrome + " × the measured " +
     "chrome plus " + top.px + "px. It must be exactly 1 × --pdx-chrome plus the clearance — a " +
     "coefficient of 0 is a hardcoded guess that is wrong on every device whose nav is not the height " +
     "it was typed on, and a coefficient above 1 charges the chrome twice and leaves an empty band.");

  const overhangV = resolveValue(bp.vars["--pdx-hero-overhang"] ?? "0px", bp.vars);
  const floatV = resolveValue(bp.vars["--pdx-hero-float"] ?? "0px", bp.vars);
  const bleedV = resolveValue(bp.vars["--pdx-hero-bleed"] ?? "0px", bp.vars);
  must(overhangV && floatV && bleedV, bp.label + ": the clearance's terms do not resolve");

  // The stylesheet's own terms must not understate what the shipped files say the
  // hero does. This is the exact hole the previous pass fell through: it budgeted
  // tailwind.css's 8px float while app.css ran a 10px one.
  if (bp.vars === baseVars) {
    ok(floatV.px >= HERO_FLOAT,
       "TRAVEL BUDGET (" + bp.label + "): --pdx-hero-float is " + floatV.px + "px but #hero " +
       ".animate-float runs `" + HERO_FLOAT_NAME + "`, which peaks " + HERO_FLOAT + "px above its " +
       "resting position. Budgeting less than the animation travels is how 20px of air became 2px of " +
       "air without a single number in this file changing.");
  }
  if (bp.vars !== shortVars) {
    ok(overhangV.px >= OVERHANG,
       "TRAVEL BUDGET (" + bp.label + "): --pdx-hero-overhang is " + overhangV.px + "px against a LIVE " +
       "pill that hangs " + OVERHANG + "px above the badge tile it is positioned inside.");
  }
  ok(bleedV.px > 0,
     "TRAVEL BUDGET (" + bp.label + "): --pdx-hero-bleed is " + bleedV.px + "px. The pill's " + GLOW +
     "px glow and the wordmark's drop shadow are painted outside every box this file can measure; " +
     "budgeting nothing for them is what let the ghost under the bar survive.");

  // The travel the hero's highest pixel can make toward the chrome. `floatRuns`
  // is read from the stylesheet, not assumed, so switching the animation back on
  // without raising the budget fails here.
  const travel = overhangV.px + (bp.floatRuns ? Math.max(floatV.px, HERO_FLOAT) : 0) + bleedV.px;

  for (const dev of CHROME_PROFILES) {
    const bandBottom = dev.px;                                  // bottom of the Eye row
    const heroPaint = dev.px * top.chrome + top.px - travel;    // highest hero pixel
    const gap = heroPaint - bandBottom;
    ok(gap >= AIR_REQUIRED,
       "EYE ROW INTERSECTION (" + bp.label + " · " + dev.label + "): with the chrome measured at " +
       dev.px + "px, the hero's top padding lands its stack at " + (dev.px * top.chrome + top.px) +
       "px, and the highest pixel it paints is " + travel + "px above that — " + heroPaint + "px, i.e. " +
       gap + "px below the bottom of the Eye row. " +
       (gap < 0
         ? "That is INSIDE the search row's band: the lockup and the top of the headline are clipped."
         : "That is under the " + AIR_REQUIRED + "px this pass forces.") +
       " Raise --pdx-hero-air, cut the travel, or stop the animation on this breakpoint.");
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 6 · SCROLL 0 IS THE TRUE TOP
// ═══════════════════════════════════════════════════════════════════════════
// A clearance is only a clearance if the reader can actually reach the position it
// was computed for. Three ways that stops being true, all checked rather than
// assumed.
{
  // (a) No negative top margin on the hero, which would pull the cleared stack
  //     straight back under the bar.
  const negMargin = [];
  for (const [file, src] of [["index.html", CSS], ["app.css", APP],
                             ["app-2.css", stripCss(read("app-2.css"))],
                             ["mobile-polish.css", stripCss(read("mobile-polish.css"))]]) {
    for (const m of src.matchAll(/#hero\s*\{([^}]*)\}/g)) {
      const mt = /(?:^|;)\s*margin(?:-top)?\s*:\s*(-[\d.]+\w*)/.exec(m[1]);
      if (mt) negMargin.push(file + ": " + mt[1]);
    }
  }
  ok(negMargin.length === 0,
     "FALSE TOP: #hero carries a negative top margin (" + negMargin.join(", ") + "). Whatever the " +
     "padding clears, this pulls back — and it pulls the reader's own rest position with it.");

  // (b) No transform on the hero or on either of its ancestors. A transform on
  //     <html>, <body> or #hero moves what the reader sees without moving the
  //     scroll offset, so scroll 0 stops being the visual top of the document and
  //     the clearance is spent somewhere off screen.
  const transformed = [];
  for (const [file, src] of [["index.html", CSS], ["app.css", APP],
                             ["app-2.css", stripCss(read("app-2.css"))],
                             ["mobile-polish.css", stripCss(read("mobile-polish.css"))]]) {
    for (const m of src.matchAll(/(^|[\s,{}])(html|body|#hero)\s*\{([^}]*)\}/g)) {
      const t = /(?:^|;)\s*transform\s*:\s*([^;]+)/.exec(m[3]);
      if (t && !/^\s*none\s*$/.test(t[1])) transformed.push(file + ": " + m[2] + " → " + t[1].trim());
    }
  }
  ok(transformed.length === 0,
     "FALSE TOP: a transform is declared on " + transformed.join(", ") + ". A transformed <html>, " +
     "<body> or #hero shifts what is painted without shifting the scroll offset, so the highest " +
     "reachable scroll position is no longer the top of the hero and the measured clearance is spent " +
     "off screen.");

  // (c) The layout-stability anchor guard must stand down at the top of the page.
  //     Its whole failure mode was applying a downward correction near scroll 0,
  //     which pins the rest position below the true top — the reader flings up to
  //     the hero and lands short, with the headline still under the bar.
  const STAB = read("pdx-stability.js");
  const band = /var\s+TOP_BAND\s*=\s*(\d+)/.exec(STAB);
  must(band, "pdx-stability.js no longer declares TOP_BAND — the guard that keeps the layout-stability " +
       "corrections away from scroll 0 cannot be verified");
  ok(parseInt(band[1], 10) <= 16,
     "FALSE TOP: pdx-stability.js's TOP_BAND is " + band[1] + "px. It is the width of the 'the reader " +
     "is at the top, do not correct anything' band, and a wide one means real corrections are being " +
     "skipped; a narrow one is the point. Under ~16px.");
  const suppresses = (STAB.match(/<=\s*TOP_BAND/g) || []).length;
  ok(suppresses >= 2,
     "FALSE TOP: pdx-stability.js checks `<= TOP_BAND` " + suppresses + " time(s). It has to suppress " +
     "BOTH when the resize batch is inspected and again immediately before the correction is applied — " +
     "on a phone the page can travel a long way in between, and a correction that lands after the " +
     "reader has reached the top is exactly what pins the rest position below the hero.");
  ok(/if\s*\(\s*pageMoving\(\)\s*\)\s*return/.test(STAB),
     "FALSE TOP: pdx-stability.js no longer stands its correction down while the page is in motion. A " +
     "programmatic scroll applied mid-fling cancels the momentum and lands the reader at " +
     "current + delta, which is how a swipe toward the hero used to come to rest short of it.");
}

// ═══════════════════════════════════════════════════════════════════════════
// 7 · THE FIRST VISIBLE HERO TEXT CANNOT *LAND* UNDER THE EYE EITHER
// ═══════════════════════════════════════════════════════════════════════════
// html{scroll-padding-top} covers the scrollport, but the lockup and the headline
// are the two things the report names, and a scrollIntoView aimed at either of
// them is the reader asking to be shown the thing that was hidden. On a phone they
// state their own scroll-margin-top, off the same published value as the padding.
{
  const marg = /#hero\s*>\s*\.hero-stack-top\s*,\s*#hero\s*>\s*\.hero-brand\s*,\s*#hero\s+h1\s*\{\s*scroll-margin-top\s*:\s*var\(\s*--pdx-hero-top\s*\)/
    .test(phoneBlock[1].replace(/\s+/g, " ").replace(/ ?, ?/g, " , "));
  const anyMarg = /scroll-margin-top\s*:\s*var\(\s*--pdx-hero-top\s*\)/.test(phoneBlock[1]);
  ok(anyMarg,
     "PHONE LANDING: the phone block no longer gives the hero's first visible text a " +
     "`scroll-margin-top: var(--pdx-hero-top)`. Without it a scrollIntoView aimed at the PX/POLITIDEX " +
     "lockup or the headline comes to rest with only html{scroll-padding-top}'s half-rem of air, i.e. " +
     "under the Eye row — the same clip, arrived at from a jump instead of a hard open.");
  const targets = ["hero-stack-top", "hero-brand", "h1"];
  const covered = targets.filter((t) =>
    new RegExp("#hero\\s*>?\\s*\\.?" + t.replace(/[-]/g, "\\-") +
               "[\\s\\S]{0,200}?scroll-margin-top\\s*:\\s*var\\(\\s*--pdx-hero-top").test(phoneBlock[1]));
  ok(covered.length === targets.length || marg,
     "PHONE LANDING: only " + JSON.stringify(covered) + " of " + JSON.stringify(targets) + " carry the " +
     "forced landing clearance. All three are 'the first visible hero text' at some viewport height — " +
     "the badge on a tall phone, the lockup on a short one, the headline whenever both are trimmed.");

  // The scrollport's own padding still has to be chrome-derived, or every other
  // jump on the page lands under the bar.
  const sp = /html\s*\{[^}]*scroll-padding-top\s*:\s*([^;}]+)/.exec(APP);
  must(sp, "app.css no longer declares html{scroll-padding-top}");
  ok(/var\(\s*--pdx-chrome/.test(sp[1]),
     "PHONE LANDING: html{scroll-padding-top} is `" + sp[1].trim() + "`, which is not derived from the " +
     "measured chrome. Every hash jump and scrollIntoView on the site lands off this number.");
}

// ═══════════════════════════════════════════════════════════════════════════
// 8 · NOTHING DECORATIVE IS POSITIONED INSIDE THE CHROME'S BAND
// ═══════════════════════════════════════════════════════════════════════════
// The clearance is padding, and the hero's background layer is `absolute inset-0`,
// so it ignores the padding entirely. Anything in there with a static top smaller
// than the chrome paints behind the search field regardless of how well the
// content clears — which is the faint marks the report describes.
{
  const layerStart = HTML.indexOf('<div class="absolute inset-0 pointer-events-none select-none">', heroStart);
  must(layerStart > 0, "#hero's decorative background layer is no longer recognisable");
  const layer = HTML.slice(layerStart, HTML.indexOf("hero-stack-top", layerStart));

  // The chrome's own fail-closed depth, before any safe-area inset. Anything
  // placed above this line is under the bar on every device, notch or not.
  const declared = /:root\s*\{\s*--pdx-chrome\s*:\s*([\d.]+rem)\s*;?\s*\}/.exec(CSS);
  must(declared, "the --pdx-chrome fail-closed literal is no longer recognisable in index.html");
  const CHROME = toPx(declared[1]);

  const offenders = [];
  for (const m of layer.matchAll(/class="([^"]*\btop-[\w./[\]-]+[^"]*)"/g)) {
    for (const cls of m[1].split(/\s+/)) {
      if (!/^top-\d+$/.test(cls)) continue;              // fractions/arbitrary: not a chrome-band risk
      const px = twOffset(cls);
      if (px === null || px >= CHROME) continue;
      // Overridden to a chrome-derived value in the stylesheet? Then it is fine.
      const re = new RegExp("#hero\\s*>\\s*\\.absolute\\.inset-0\\s*>\\s*\\." + cls +
                            "(?![\\w-])\\s*\\{[^}]*top\\s*:\\s*calc\\(\\s*var\\(\\s*--pdx-chrome");
      if (re.test(CSS)) continue;
      offenders.push(cls + " (" + px + "px)");
    }
  }
  ok(offenders.length === 0,
     "hero decoration: " + JSON.stringify(offenders) + " sits inside the fixed chrome's band (" + CHROME +
     "px before any safe-area inset), inside #hero's `absolute inset-0` layer — which spans the padding " +
     "box, so the hero's top padding does not move it. It paints behind the search field on every device. " +
     "Pin it below the measured offset instead: top: calc(var(--pdx-chrome) + Nrem).");
}

// ═══════════════════════════════════════════════════════════════════════════
// 9 · THE MEASUREMENT ACTUALLY RUNS, AND ON THE FIRST OPEN
// ═══════════════════════════════════════════════════════════════════════════
// The publisher held its last value whenever focus was inside the nav. Safari
// restores focus into the Eye's textarea across a hard refresh and a back
// navigation, and that early return used to make the hold PERMANENT — the page
// spent the whole session on the stylesheet's fail-closed literal, which is one of
// the paths the clip survived on. A first measurement must always happen.
{
  const iife = /var nav = document\.getElementById\('pdx-topnav'\);[\s\S]*?\}\)\(\);/.exec(HTML);
  must(iife, "the chrome-measure IIFE under the nav is no longer recognisable in index.html");
  const src = iife[0];

  ok(/if\s*\(\s*last\s*>\s*0\s*&&\s*nav\.contains\(document\.activeElement\)\s*\)\s*return/.test(src),
     "MEASUREMENT: the publisher still bails out of measure() whenever focus is inside the nav, with no " +
     "exception for the first call. Safari restores focus into the Eye across a hard open, so that hold " +
     "never lifts and --pdx-chrome / --pdx-hero-top are never published at all. Guard it with " +
     "`last > 0 &&` so a first measurement always lands.");
  ok(/--pdx-hero-top/.test(src),
     "MEASUREMENT: the publisher no longer writes --pdx-hero-top. #hero's padding reads it, so without " +
     "the runtime value the hero falls back to the stylesheet literal on every device.");
  ok(/paintOverhang/.test(src) && /getBoundingClientRect/.test(src),
     "MEASUREMENT: the publisher no longer measures the hero's own paint overhang. The clearance was " +
     "wrong for three passes precisely because it was sized to a BOX while the hero paints above that " +
     "box; transcribing 8px instead of measuring it is how that comes back.");
  const air = /var HERO_AIR = (\d+)/.exec(src);
  must(air, "the publisher no longer states HERO_AIR");
  ok(parseInt(air[1], 10) >= AIR_REQUIRED,
     "MEASUREMENT: the publisher forces " + air[1] + "px of visible air; the report's floor is " +
     AIR_REQUIRED + "px.");
  const jsFloat = /var HERO_FLOAT = (\d+)/.exec(src);
  must(jsFloat, "the publisher no longer states HERO_FLOAT");
  ok(parseInt(jsFloat[1], 10) >= HERO_FLOAT,
     "MEASUREMENT: the publisher budgets " + jsFloat[1] + "px for the hero badge's float while app.css " +
     "runs `" + HERO_FLOAT_NAME + "`, which travels " + HERO_FLOAT + "px. These two numbers disagreeing " +
     "IS the bug this pass fixed — the stylesheet said 8 and the animation did 10.");
  ok(/DOMContentLoaded/.test(src),
     "MEASUREMENT: the publisher sits above #hero in the document, so its first call finds no hero to " +
     "measure. Without a DOMContentLoaded pass the forced clearance waits for 'load' — every image on " +
     "the page — before it lands.");
}

// ═══════════════════════════════════════════════════════════════════════════
// 10 · THE BAR CANNOT GHOST WHAT IS BEHIND IT, ON THE FIRST PAINT
// ═══════════════════════════════════════════════════════════════════════════
{
  const opaque = /@media\s*\(\s*max-width:\s*64\dpx\s*\)\s*\{\s*#pdx-topnav\.nav-blur\s*\{([^}]*)\}/.exec(CSS);
  ok(!!opaque && /backdrop-filter\s*:\s*none/.test(opaque[1]) &&
     /background-color\s*:\s*#[0-9a-f]{6}/i.test(opaque[1]),
     "ghosting: index.html's critical inline stylesheet no longer makes the phone nav opaque and " +
     "blur-free. Until it does, the whole first paint — which is all a hard refresh shows — runs with " +
     "bg-navy-900/80 under blur(18px), so any hero pixel beneath the bar renders as a large, faint, " +
     "out-of-focus copy of itself. mobile-polish.css says the same thing but is loaded " +
     "media=\"print\" onload=\"this.media='all'\", i.e. too late to cover that frame.");

  const mp = stripCss(read("mobile-polish.css"));
  ok(/nav\.nav-blur\s*\{[^}]*backdrop-filter\s*:\s*none/.test(mp),
     "ghosting: mobile-polish.css no longer drops the phone nav's blur — the inline rule above and this " +
     "one are meant to agree, so a change to one is a change to both");
}

// ═══════════════════════════════════════════════════════════════════════════
// 11 · THE FIX CAN REACH A PHONE
// ═══════════════════════════════════════════════════════════════════════════
// Navigations are stale-while-revalidate, and there is no shift-reload on a
// handset: a phone with a warm shell cache is served the PREVIOUS index.html on a
// hard refresh. Any change to the hero's clearance that does not rename the shell
// cache is invisible on exactly the gesture the report is made with.
{
  const sw = read("sw.js");
  const ver = /const\s+CACHE_VERSION\s*=\s*'([^']+)'/.exec(sw);
  must(ver, "sw.js no longer declares CACHE_VERSION");
  ok(/handleNavigate/.test(sw),
     "shell delivery: sw.js still routes navigations through a named handler, so the strategy this " +
     "section reasons about is still the one shipping");
  ok(parseInt(ver[1].replace(/\D/g, ""), 10) >= 56,
     "shell delivery: sw.js CACHE_VERSION is " + ver[1] + ", which is the version that shipped WITH the " +
     "pre-fix hero clearance. handleNavigate() returns the cached shell whenever one exists, so a phone " +
     "that already has this cache keeps being served the old index.html on a hard open and the forced " +
     "clearance never appears. Bump CACHE_VERSION whenever the hero's chrome clearance changes.");
}

if (failures.length) {
  console.error("\n✖ mobile hero clearance: " + failures.length + " failure(s)\n");
  failures.forEach((f) => console.error("  · " + f));
  console.error("");
  process.exit(1);
}
console.log("✓ mobile hero clearance: all " + passed +
  " assertions passed — the hero's top padding is the measured chrome plus a forced clearance, the " +
  "highest pixel it paints stays at least " + AIR_REQUIRED + "px clear of the Eye row at every " +
  "breakpoint and chrome depth, scroll 0 is the true top, and the shell cache is bumped");
