#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// MOBILE HERO CLEARANCE — nothing the hero paints may reach the Eye row
// ─────────────────────────────────────────────────────────────────────────────
// Reported on phones, at scroll 0, after a hard refresh: the fixed nav and its
// search row covered the top of the hero, and a large faint POLITIDEX mark sat
// behind the Eye field. Desktop was fine.
//
// scripts/test-top-chrome.mjs already proves the offset is measured, published
// once and charged once, and it checks the phone hero's air against the badge's
// float keyframe. All of that passed while the bug was live, because every one of
// those checks measures to the TOP EDGE OF A BOX and the hero does not paint to
// the top edge of a box:
//
//   · .hero-stack-top's first child carries the LIVE pill at `-top-2 -right-2`,
//     so the highest hero pixel is 0.5rem ABOVE the box the clearance was sized
//     against. 0.75rem of air minus an 8px overhang left 4px, and .animate-float
//     then lifted the whole stack 8px: the pill crossed 4px UNDER the search row
//     twice every three seconds.
//   · The hero's background layer is `absolute inset-0`, so it spans the padding
//     box. Two star accents were placed at top-24 (96px) and top-32 (128px)
//     against chrome that is 113px at rest and 137-172px on a notched phone, so
//     they painted behind the search field no matter how much the content cleared.
//   · The bar is bg-navy-900/80 under .nav-blur's blur(18px), so a pixel that does
//     end up under it renders as a large, faint, out-of-focus copy of itself —
//     the "ghosted POLITIDEX" in the report. The rule that makes the phone bar
//     opaque was in mobile-polish.css, which is deferred, so it did not apply to
//     the first paint that a hard refresh shows.
//
// So this file models the clearance the way the screen does: the air above the
// chrome must exceed the total distance the HIGHEST HERO PIXEL can travel toward
// it — negative offsets plus animation amplitude — with a few px still visible at
// the worst frame, at every breakpoint, and nothing decorative may be positioned
// inside the chrome's band at all.
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
const CSS = stripCss(HTML);
const TW = stripCss(read("css/tailwind.css"));

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
// most negative translateY it ever reaches, as a positive number of pixels.
function upwardTravel(name) {
  const open = new RegExp("@keyframes\\s+" + name + "\\s*\\{", "g");
  const m = open.exec(TW);
  if (!m) return null;
  let i = m.index + m[0].length, depth = 1;
  while (depth && i < TW.length) {
    if (TW[i] === "{") depth++;
    else if (TW[i] === "}") depth--;
    i++;
  }
  const body = TW.slice(m.index, i);
  let up = 0;
  for (const t of body.matchAll(/translateY\(\s*(-?[\d.]+)(px|rem)?\s*\)/g)) {
    const px = toPx(t[1] + (t[2] || "px"));
    if (px !== null && px < 0) up = Math.max(up, -px);
  }
  return up;
}

// ═══════════════════════════════════════════════════════════════════════════
// 1 · WHAT THE HERO ACTUALLY PAINTS AT ITS TOP EDGE
// ═══════════════════════════════════════════════════════════════════════════
// The stack's clearance has to cover its own children's negative offsets. This
// reads them off the markup so that adding another badge, or changing -top-2 to
// -top-3, moves the requirement instead of silently breaking it.
const heroStart = HTML.indexOf('<section id="hero"');
must(heroStart > 0, "the #hero section is no longer recognisable in index.html");

const stackStart = HTML.indexOf('hero-stack-top', heroStart);
must(stackStart > 0, "#hero no longer contains a .hero-stack-top child");
// The stack element and everything up to the brand lockup that follows it.
const brandStart = HTML.indexOf('hero-brand', stackStart);
must(brandStart > stackStart, "#hero no longer contains a .hero-brand child after .hero-stack-top");
const stackMarkup = HTML.slice(HTML.lastIndexOf("<div", stackStart), brandStart);

// Every negative top offset inside the stack, in px. The largest is how far above
// the stack's own box the first hero pixel sits.
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

// The stack floats; the lockup fades up from BELOW and so never travels chromewards.
const FLOAT = upwardTravel("float");
must(FLOAT !== null, "the float keyframe is no longer recognisable in css/tailwind.css");
const fadeUpDown = /@keyframes\s+fadeUp\s*\{\s*0%\s*\{[^}]*translateY\(\s*([\d.]+)px/.exec(TW);
ok(!!fadeUpDown && parseFloat(fadeUpDown[1]) > 0,
   "hero overhang: the lockup's entrance (fadeUp) still starts BELOW its resting position, which is why " +
   "the short-phone clearance is allowed to be tighter than the badge's");

// A few pixels of the highest hero pixel must still be visible at the worst frame.
// Not decoration: the search row closes with a 1px rule and the wordmark carries a
// drop shadow, so zero means "touching" and negative means "clipped".
const AIR = 4;

// ═══════════════════════════════════════════════════════════════════════════
// 2 · EVERY BREAKPOINT'S CLEARANCE COVERS THE TRAVEL
// ═══════════════════════════════════════════════════════════════════════════
// #hero's padding-top is stated three times — desktop, phone, short phone — and
// each has to be read with the rules that apply alongside it, because the
// short-phone block hides the floating badge and so is allowed to be tighter.
function airOf(block, label) {
  const m = /#hero\s*\{\s*padding-top\s*:\s*calc\(\s*var\(\s*--pdx-chrome\s*\)\s*\+\s*([\d.]+)rem\s*\)/.exec(block);
  must(m, label + ": #hero's clearance is no longer stated as calc(var(--pdx-chrome) + Nrem). It must " +
          "stay a single measured chrome value plus a literal of air, or this file cannot check it and " +
          "the offset has drifted back to being a guess.");
  return parseFloat(m[1]) * REM;
}

const phoneBlock = /@media\s*\(\s*max-width:\s*639px\s*\)\s*\{([\s\S]*?)\n    \}/.exec(CSS);
must(phoneBlock, "the phone hero media query is no longer recognisable in index.html");
const shortBlock = /@media\s*\(\s*max-width:\s*639px\s*\)\s*and\s*\(\s*max-height:\s*720px\s*\)\s*\{([\s\S]*?)\n    \}/.exec(CSS);
must(shortBlock, "the short-phone hero media query is no longer recognisable in index.html");

// The unscoped declaration: everything outside the two phone blocks.
const outside = CSS.replace(phoneBlock[0], " ").replace(shortBlock[0], " ");
const deskAir  = airOf(outside, "desktop");
const phoneAir = airOf(phoneBlock[1], "phone");
const shortAir = airOf(shortBlock[1], "short phone");

// Desktop and phone both render the floating badge with its overhanging pill.
const NEEDED = OVERHANG + FLOAT + AIR;
for (const [label, air] of [["phone", phoneAir], ["desktop", deskAir]]) {
  ok(air >= NEEDED,
     "MOBILE HERO CLEARANCE (" + label + "): the hero has " + air + "px of air above the measured chrome, " +
     "but the highest pixel it paints travels " + (OVERHANG + FLOAT) + "px toward the bar — " + OVERHANG +
     "px because the LIVE pill hangs above the badge tile it is positioned inside, and " + FLOAT +
     "px because .hero-stack-top carries .animate-float. That leaves " + (air - OVERHANG - FLOAT) +
     "px, so the badge crosses under the Eye row and the POLITIDEX lockup below it reads as clipped. " +
     "Needs at least " + NEEDED + "px (overhang + float + " + AIR + "px still visible).");
}

// The short-phone block hides the badge, so its floor is just visible air — but it
// is only allowed to be tighter BECAUSE the badge is hidden. Check that, not a
// remembered fact about it.
const badgeHidden = /#hero\s*>\s*\.hero-stack-top\s*\{\s*display\s*:\s*none/.test(shortBlock[1]);
ok(badgeHidden,
   "MOBILE HERO CLEARANCE (short phone): the short-phone block no longer hides .hero-stack-top, so the " +
   "floating badge and its overhanging LIVE pill are back on the screen with the tightest clearance in " +
   "the document. Either hide it again or raise this block's air to " + NEEDED + "px.");
ok(shortAir >= AIR,
   "MOBILE HERO CLEARANCE (short phone): " + shortAir + "px of air above the chrome. The badge is hidden " +
   "here so the overhang and the float do not apply, but the POLITIDEX lockup still carries a drop " +
   "shadow and the search row still closes with a 1px rule — under " + AIR + "px reads as touching it.");

// A clearance that grew without bound would answer the report with an empty band.
ok(deskAir <= NEEDED + 16,
   "no wasted space: the desktop hero now holds " + deskAir + "px of air above the chrome against " +
   NEEDED + "px of need. More than 16px of slack is a permanent empty band under the bar on every " +
   "screen, which is not what clearing the chrome costs.");
ok(phoneAir <= NEEDED + 16,
   "no wasted space: the phone hero now holds " + phoneAir + "px of air above the chrome against " +
   NEEDED + "px of need, on the screen with the tightest fold budget in the app.");

// ═══════════════════════════════════════════════════════════════════════════
// 3 · NOTHING DECORATIVE IS POSITIONED INSIDE THE CHROME'S BAND
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
// 4 · THE BAR CANNOT GHOST WHAT IS BEHIND IT, ON THE FIRST PAINT
// ═══════════════════════════════════════════════════════════════════════════
// "A large faint POLITIDEX mark" is not a watermark element — there is none in the
// document. It is the real lockup seen through bg-navy-900/80 + blur(18px). The
// phone bar is opaque, but the rule that says so has to apply to the paint a hard
// refresh actually shows, which a deferred stylesheet does not.
{
  const opaque = /@media\s*\(\s*max-width:\s*64\dpx\s*\)\s*\{\s*#pdx-topnav\.nav-blur\s*\{([^}]*)\}/.exec(CSS);
  ok(!!opaque && /backdrop-filter\s*:\s*none/.test(opaque[1]) &&
     /background-color\s*:\s*#[0-9a-f]{6}/i.test(opaque[1]),
     "ghosting: index.html's critical inline stylesheet no longer makes the phone nav opaque and " +
     "blur-free. Until it does, the whole first paint — which is all a hard refresh shows — runs with " +
     "bg-navy-900/80 under blur(18px), so any hero pixel beneath the bar renders as a large, faint, " +
     "out-of-focus copy of itself. mobile-polish.css says the same thing but is loaded " +
     "media=\"print\" onload=\"this.media='all'\", i.e. too late to cover that frame.");

  // The deferred sheet is still the belt to this braces; if it stopped saying it,
  // the desktop-width path would be the only one left.
  const mp = stripCss(read("mobile-polish.css"));
  ok(/nav\.nav-blur\s*\{[^}]*backdrop-filter\s*:\s*none/.test(mp),
     "ghosting: mobile-polish.css no longer drops the phone nav's blur — the inline rule above and this " +
     "one are meant to agree, so a change to one is a change to both");
}

// ═══════════════════════════════════════════════════════════════════════════
// 5 · THE FIX CAN REACH A PHONE
// ═══════════════════════════════════════════════════════════════════════════
// Navigations are stale-while-revalidate, and there is no shift-reload on a
// handset: a phone with a warm shell cache is served the PREVIOUS index.html on a
// hard refresh. Any change to the hero's clearance that does not rename the shell
// cache is invisible on exactly the gesture the report is made with.
{
  const sw = read("sw.js");
  const ver = /const\s+CACHE_VERSION\s*=\s*'([^']+)'/.exec(sw);
  must(ver, "sw.js no longer declares CACHE_VERSION");
  ok(/req\.mode\s*===\s*['"]navigate['"]/.test(sw) === false ||
     /handleNavigate/.test(sw),
     "shell delivery: sw.js still routes navigations through a named handler, so the strategy this " +
     "section reasons about is still the one shipping");
  ok(parseInt(ver[1].replace(/\D/g, ""), 10) >= 55,
     "shell delivery: sw.js CACHE_VERSION is " + ver[1] + ", which is the version that shipped WITH the " +
     "pre-fix hero. handleNavigate() returns the cached shell whenever one exists, so a phone that " +
     "already has this cache keeps being served the old index.html on a hard refresh and the clearance " +
     "fix never appears. Bump CACHE_VERSION whenever the hero's chrome clearance changes.");
}

if (failures.length) {
  console.error("\n✖ mobile hero clearance: " + failures.length + " failure(s)\n");
  failures.forEach((f) => console.error("  · " + f));
  console.error("");
  process.exit(1);
}
console.log("✓ mobile hero clearance: all " + passed +
  " assertions passed — the highest pixel the hero paints clears the Eye row at every breakpoint, " +
  "nothing decorative sits in the chrome's band, and the bar cannot ghost what is behind it");
