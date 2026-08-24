#!/usr/bin/env node
/**
 * test-top-nav-layout.mjs — the top bar is a row, not a pile.
 *
 * Two reports, one mechanism:
 *   · "✊ Mandate is overlapping / covering Your Issues"   (the left group spills
 *     right, and its last item 🔦 Local Issues lands under the right group's
 *     first item, ✊ Mandate)
 *   · "Community is hiding behind the notification button" (the gateway group
 *     spills right, and its last item Community lands under #wc-bell)
 *
 * Both are the same thing: every GROUP in the bar carries Tailwind's `min-w-0`,
 * which replaces flexbox's automatic minimum size (min-content) with zero, while
 * every LEAF in it carries `white-space: nowrap` / `flex-shrink-0` and refuses to
 * give an inch. A box squeezed under its own contents does not clip them —
 * overflow is visible — it lets them spill onto the neighbour, and DOM order
 * decides who is painted on top. The same squeeze is live on a phone, where it
 * pushes the hamburger — the only way into the full menu — off the right edge.
 *
 * There is no browser in this repo, so this pins the fix two ways:
 *   (a) cascade assertions against the stylesheet source — the declarations that
 *       remove the collapse, raise the cap and allow the wrap are present, win on
 *       order, and nothing in the new block hides, moves or re-stacks a control;
 *   (b) a deterministic width model of the bar — every item costed from its own
 *       markup (font size, tracking, padding, border, icon) — run over a table of
 *       real viewports, before and after, so "no overlap" is arithmetic rather
 *       than an assurance.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..');
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const HTML = rd('index.html');
const APPCSS = rd('app.css');

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.error('  ✗ ' + msg); } };
const eq = (a, b, msg) => ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const near = (a, b, tol, msg) => ok(Math.abs(a - b) <= tol, `${msg} — expected ~${b} (±${tol}), got ${a}`);
function must(cond, msg) {
  if (!cond) { console.error(`\n  ⚠ STALE TEST: ${msg}\n    The markup this test reasons about has moved. Re-read the nav before trusting a green run.\n`); process.exit(2); }
}
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '');
const stripAll = s => strip(s.replace(/<!--[\s\S]*?-->/g, ''));
/* selector → body pairs, with @media wrappers flattened away */
const rules = (css) => [...css.replace(/@media[^{]*\{/g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .map(m => ({ sel: m[1].trim().replace(/\s+/g, ' '), body: m[2] }))
  .filter(r => r.sel);

/* ───────────────────────────────────────────────────────────────────────────
   0 · THE BLOCK, AND WHERE IT SITS
   ─────────────────────────────────────────────────────────────────────────── */
const bStart = HTML.indexOf('<style id="pdx-topnav-layout">');
must(bStart !== -1, 'no <style id="pdx-topnav-layout"> block in index.html');
const bEnd = HTML.indexOf('</style>', bStart);
must(bEnd !== -1, 'the pdx-topnav-layout block is never closed');
const CSS = strip(HTML.slice(bStart, bEnd));

ok(bStart > HTML.indexOf('<body'), 'the block is emitted inside <body>, after every <link rel="stylesheet">, so it wins on order');
const bottomChrome = HTML.indexOf('<style id="pdx-mobile-bottom-chrome">');
must(bottomChrome !== -1, 'the pdx-mobile-bottom-chrome block is gone; its own test guards the tail of the cascade');
ok(bStart < bottomChrome,
  'this block is declared BEFORE pdx-mobile-bottom-chrome — that block\'s test asserts no stylesheet follows it');

/* Every selector in the block is anchored on an id, so it outranks the utility
   classes it is correcting without a single !important. */
const decls = CSS.split('}').map(s => s.trim()).filter(s => s.includes('{'));
ok(!/!important/.test(CSS), 'the block never reaches for !important — id selectors already outrank utility classes');
for (const d of decls) {
  const sel = d.slice(0, d.indexOf('{')).trim();
  if (!sel || sel.startsWith('@')) continue;
  ok(/#pdx-topnav|#nav-auth-desktop/.test(sel), `every rule is scoped to the nav — "${sel.slice(0, 60)}" is not`);
}

/* ───────────────────────────────────────────────────────────────────────────
   1 · THE MARKUP THE MODEL BELOW READS
   ─────────────────────────────────────────────────────────────────────────── */
const navStart = HTML.indexOf('<nav id="pdx-topnav"');
must(navStart !== -1, 'the nav lost its id');
const navEnd = HTML.indexOf('</nav>', navStart);
const NAV = HTML.slice(navStart, navEnd);
const navOpen = NAV.slice(0, NAV.indexOf('>') + 1);

ok(/class="[^"]*\bfixed\b/.test(navOpen), 'the nav is still fixed');
ok(/class="[^"]*\btop-0\b/.test(navOpen), 'the nav is still pinned to the top');
ok(/class="[^"]*\bz-50\b/.test(navOpen), 'the nav still sits at z-50');

const rowOpen = NAV.match(/<div class="(max-w-7xl mx-auto px-4 py-3 flex[^"]*)"/);
must(rowOpen, 'the top row is no longer `max-w-7xl mx-auto px-4 py-3 flex …`');
ok(/justify-between/.test(rowOpen[1]), 'the top row still uses justify-between');
must(/\bgap-3\b/.test(rowOpen[1]), 'the top row no longer carries gap-3; the model below is costed against it');

/* The three squeezed groups, in DOM order. */
const groups = [...NAV.matchAll(/<div class="([^"]*\bmin-w-0\b[^"]*)"/g)].map(m => m[1]);
eq(groups.length, 3, 'three boxes in the bar carry min-w-0 — left group, right group, gateway group');
must(groups[0].includes('gap-3 lg:gap-5'), 'the left group is no longer `gap-3 lg:gap-5 min-w-0`');
must(groups[1].includes('gap-2 lg:gap-3.5'), 'the right group is no longer `gap-2 lg:gap-3.5 min-w-0`');
must(groups[2].includes('gap-2.5 lg:gap-3') && groups[2].includes('hidden lg:flex'),
  'the gateway group is no longer `hidden lg:flex … gap-2.5 lg:gap-3 … min-w-0`');

/* Every leaf really does refuse to shrink — that is why a squeezed group spills
   instead of reflowing, and it is the half of the mechanism the CSS cannot fix. */
const leafNowrap = (NAV.match(/white-space:nowrap/g) || []).length;
ok(leafNowrap >= 5, `the bar's leaves are nowrap (${leafNowrap} sites) — a squeezed group can only spill`);
ok(/id="wc-bell"[^>]*flex-shrink-0/.test(NAV), '#wc-bell refuses to shrink');
ok(/id="nav-auth-desktop" class="[^"]*flex-shrink-0/.test(NAV), 'the account cluster refuses to shrink');

/* The two reported seams, as DOM adjacency: the item that gets covered is the
   last of its group, the coverer is the first thing painted after it. */
const iLocal = NAV.indexOf('href="#local-issues"');
const iMandate = NAV.indexOf('nav-mandate-btn');
const iCommunity = NAV.indexOf('#community-exchange" class="pdx-navmenu__btn');
const iBell = NAV.indexOf('id="wc-bell"');
must(iLocal > 0 && iMandate > 0 && iCommunity > 0 && iBell > 0, 'one of the four reported controls is gone from the nav');
ok(iLocal < iMandate, '🔦 Local Issues is the left group\'s last item and ✊ Mandate is painted after it');
ok(iCommunity < iBell, 'Community is the gateway group\'s last item and the bell is painted after it');

/* ───────────────────────────────────────────────────────────────────────────
   2 · THE COLLAPSE IS GONE
   ─────────────────────────────────────────────────────────────────────────── */
const has = (re) => re.test(CSS);
ok(has(/#pdx-topnav > div\.max-w-7xl > div:last-child\s*\{[^}]*min-width:\s*auto/),
  'the right group gets min-width: auto at every width — the bell and the account live there');
ok(has(/#pdx-topnav > div\.max-w-7xl > div:last-child\s*\{[^}]*flex-shrink:\s*0/),
  'the right group never yields — controls before wordmark');

const mqDesktop = CSS.match(/@media \(min-width:\s*1024px\)\s*\{([\s\S]*?)\n    \}/);
must(mqDesktop, 'the desktop query is no longer a `@media (min-width: 1024px)` block this test can read');
const D = mqDesktop[1];
ok(/#pdx-topnav > div\.max-w-7xl > div:first-child,\s*#pdx-topnav > div\.max-w-7xl > div:first-child > div,\s*#pdx-topnav > div\.max-w-7xl > div:last-child > div:first-child\s*\{[^}]*min-width:\s*auto/.test(D),
  'the left group, the voter-tools row and the gateway group all get min-width: auto where their links exist');
ok(!/min-width:\s*0/.test(D), 'nothing in the desktop query hands a group a zero minimum again');

/* min-width: 0 survives in exactly one place — the brand link, deliberately, as
   the thing that yields on a phone so the controls never have to. */
const zeroSites = rules(CSS).filter(r => /min-width:\s*0/.test(r.body)).map(r => r.sel);
eq(zeroSites.length, 2, 'min-width: 0 survives in exactly two places');
for (const s of zeroSites) {
  ok(/> a$|> a > span:last-child$/.test(s), `min-width: 0 is only ever given to the brand link or its wordmark — not "${s}"`);
}

/* ───────────────────────────────────────────────────────────────────────────
   3 · THE WINDOW, THEN THE WRAP
   ─────────────────────────────────────────────────────────────────────────── */
const rowRule = D.match(/#pdx-topnav > div\.max-w-7xl\s*\{([^}]*)\}/);
must(rowRule, 'the desktop query no longer restyles the top row');
const R = rowRule[1];
const capRem = parseFloat((R.match(/max-width:\s*([\d.]+)rem/) || [])[1]);
ok(capRem > 80, `the bar is no longer capped at max-w-7xl on a wide screen (${capRem}rem)`);
ok(/flex-wrap:\s*wrap/.test(R), 'where the row still will not fit it wraps onto a second tier instead of piling');
ok(/row-gap:\s*[\d.]+rem/.test(R), 'a wrapped bar gets a row-gap so the two tiers read as two tiers');
ok(/#pdx-topnav > div\.max-w-7xl > div:last-child\s*\{\s*margin-left:\s*auto/.test(D),
  'wrapped, the control cluster still sits at the right-hand end of the bar');

/* ───────────────────────────────────────────────────────────────────────────
   4 · NOTHING WAS ANSWERED BY REMOVING A CONTROL
   ─────────────────────────────────────────────────────────────────────────── */
for (const prop of ['visibility', 'pointer-events', 'opacity', 'z-index', 'position', 'transform', 'order']) {
  ok(!new RegExp('[;{]\\s*' + prop + '\\s*:').test(CSS), `the block declares no ${prop} — it is spacing, not stacking`);
}
const hidden = rules(CSS).filter(r => /display:\s*none/.test(r.body)).map(r => r.sel);
eq(hidden.length, 1, 'exactly one thing is ever hidden, and only at one breakpoint');
eq(hidden[0], '#nav-auth-desktop > button > span:last-child',
  'the one hidden thing is the account button\'s decorative FREE chip, not a control');
const freeMq = CSS.match(/@media \(max-width:\s*(\d+)px\)\s*\{\s*#nav-auth-desktop > button > span:last-child/);
must(freeMq, 'the FREE chip is no longer hidden inside its own narrow query');
ok(Number(freeMq[1]) <= 360, `the FREE chip only goes at ${freeMq[1]}px and below — not on any mainstream phone`);
ok(/<span>JOIN THE PEOPLE<\/span>/.test(NAV), 'the account button still says JOIN THE PEOPLE at every width');

/* Every control the report names is still in the bar, with its handler intact. */
for (const [needle, what] of [
  ['href="#agenda" class="nav-mandate-btn', '✊ Mandate'],
  ['href="#local-issues"', '🔦 Local Issues'],
  ['href="#community-exchange" class="pdx-navmenu__btn', 'Community'],
  ['id="wc-bell"', 'the notification bell'],
  ['id="nav-auth-desktop"', 'the account cluster'],
  ["getElementById('mobileMenu').classList.toggle('hidden')", 'the hamburger'],
  ['href="#who-represents-me"', '🏛️ Who Represents Me'],
  ['href="#my-politicians"', '⭐ My Voting Team'],
  ['href="#your-ballot"', '🗳️ Your Ballot'],
  ['href="#voter-hub"', 'Voter Hub'],
  ['href="#say-vs-do"', '👁️ Check a Claim'],
]) ok(NAV.includes(needle), `${what} is still in the bar`);
eq((NAV.match(/class="pdx-navmenu"/g) || []).length, 3, 'all three gateway dropdowns survive');
eq((NAV.match(/pdx-navmenu__caret/g) || []).length, 3, 'all three carets survive');

/* A wrapped row must not be clipped by the nav, or the dropdown panels — which
   are absolutely positioned out of the bar — would be cut off. */
const clipped = rules(CSS).filter(r => /overflow:\s*hidden/.test(r.body)).map(r => r.sel);
eq(clipped.length, 1, 'exactly one box in the bar is allowed to clip');
eq(clipped[0], '#pdx-topnav > div.max-w-7xl > div:first-child > a > span:last-child',
  'and it is the wordmark, which ellipsizes — never a group, which would cut a dropdown panel off');
ok(/\.pdx-navmenu__panel\s*\{[^}]*position:\s*absolute/.test(strip(APPCSS)), 'the dropdown panels are still absolute, and nothing here clips them');

/* ───────────────────────────────────────────────────────────────────────────
   5 · THE VERTICAL CLEARANCE CONTRACT IS UNTOUCHED
   A taller (wrapped) bar is only safe because --pdx-chrome is MEASURED off the
   bottom of .pdx-eye-row and everything below follows it. This block must not
   own any part of that, or the measurement stops being the single source.
   ─────────────────────────────────────────────────────────────────────────── */
for (const name of ['--pdx-chrome', '--pdx-hero', '#hero', 'scroll-padding-top', 'padding-top', 'min-height', 'max-height']) {
  ok(!CSS.includes(name), `the block never names ${name} — the chrome stays measured, not re-declared`);
}
const sized = rules(CSS).filter(r => /[;{\s]height:/.test(r.body)).map(r => r.sel);
eq(sized.length, 1, 'exactly one rule in the block sets a height');
ok(/> a > div:first-child$/.test(sized[0]), 'and it is the brand tile, sized down a step on the narrowest phones');
ok(HTML.includes("querySelector('.pdx-eye-row')"), 'the chrome is still measured off the eye row');
ok(/new ResizeObserver\(measure\)\.observe\(nav\)/.test(HTML),
  'a ResizeObserver still watches the nav box, so a wrapped bar republishes --pdx-chrome by itself');
eq((stripAll(APPCSS).match(/scroll-padding-top:/g) || []).length, 1, 'still exactly one scroll-padding-top, and it reads var(--pdx-chrome)');
const heroPad = [...stripAll(HTML).matchAll(/#hero\s*\{[^}]*padding-top:\s*([^;}]+)/g)].map(m => m[1].trim());
eq(heroPad.length, 1, 'still exactly one #hero padding-top declaration');
eq(heroPad[0], 'var(--pdx-hero-top)', 'and it still reads var(--pdx-hero-top)');
ok(/\.pdx-eye-row/.test(NAV), 'the eye row is still inside the nav');
ok(NAV.indexOf('pdx-eye-row') < NAV.indexOf('id="mobileMenu"'), 'the drawer still comes after the eye row');

/* The phone row must never wrap: a two-tier bar on a phone would inflate the
   measured chrome and eat the hero. flex-wrap is scoped to desktop only. */
eq((CSS.match(/flex-wrap:/g) || []).length, 1, 'flex-wrap is declared exactly once');
ok(D.includes('flex-wrap: wrap'), 'and only inside the >=1024px query, so a phone bar can never wrap');

/* ───────────────────────────────────────────────────────────────────────────
   6 · THE WIDTH MODEL
   Each item costed from its own markup. Text is advance-width: characters ×
   (avg advance + tracking) × font-size. The three faces in the bar are all
   narrow — Barlow Condensed and Bebas Neue — hence the low per-character
   figures; emoji are square-ish and costed separately.
   ─────────────────────────────────────────────────────────────────────────── */
const CONDENSED = 0.42, BEBAS = 0.40, EMOJI = 1.15;
const text = (chars, emoji, px, track, face = CONDENSED) =>
  chars * face * px + emoji * EMOJI * px + (chars + emoji) * track * px;

/* ---- LEFT GROUP --------------------------------------------------------- */
const brand = (tilePx, wordPx, gap) => tilePx + gap + text(9, 0, wordPx, 0.05, BEBAS); // 🏠 tile + POLITIDEX
const PILL = 24 + 3;   // px-3 gutters + 1.5px border, both sides
const leftLinks = (track) => {
  const items = [
    text(18, 1, 12, track) + PILL,   // 🏛️ Who Represents Me   (text-xs pill)
    text(13, 1, 12, track) + PILL,   // 👁️ Check a Claim
    text(9, 0, 14, track),           // Voter Hub              (nav-link, no gutters)
    text(14, 1, 12, track) + PILL,   // ⭐ My Voting Team
    text(12, 1, 14, track),          // 🗳️ Your Ballot
    text(13, 1, 14, track),          // 🔦 Local Issues
  ];
  return { items, sum: items.reduce((a, b) => a + b, 0) };
};

/* ---- RIGHT GROUP -------------------------------------------------------- */
const CARET = 1 + 4 + 10.9;          // margin + padding + 0.68rem svg
const GLYPH = 16.3 + 4.8;            // 1.02rem icon + 0.3rem gap
const gateways = (track) => {
  const items = [
    text(8, 1, 14, track) + 26 + 3,          // ✊ Mandate, padding:5px 13px + border
    GLYPH + text(15, 0, 14, track) + CARET,  // Track & Compare
    GLYPH + text(17, 0, 14, track) + CARET,  // Explore & Discover
    GLYPH + text(9, 0, 14, track) + CARET,   // Community
  ];
  return { items, sum: items.reduce((a, b) => a + b, 0) };
};
const BELL = 34, BURGER = 24;
const auth = (padX, track, free) =>
  padX * 2 + 3 + 12 + 14 +                   // gutters + border + two gap-1.5 + w-3.5 svg
  text(15, 0, 10, track, BEBAS) +            // JOIN THE PEOPLE
  (free ? 10 + text(4, 0, 7.5, 0.06, BEBAS) : 0);

/* ---- THE BAR, BEFORE AND AFTER ------------------------------------------ */
function desktopBar(after) {
  const t = after ? 0.07 : 0.10;
  const L = leftLinks(t), G = gateways(t);
  const gOuter = 12;
  const gLeft = after ? 13.6 : 20;      // gap-3 lg:gap-5  → 0.85rem
  const gLinks = after ? 8.8 : 16;      // gap-2.5 lg:gap-4 → 0.55rem
  const gRight = after ? 8.8 : 14;      // gap-2 lg:gap-3.5 → 0.55rem
  const gGate = after ? 7.2 : 12;       // gap-2.5 lg:gap-3 → 0.45rem
  const left = brand(32, 20, 10) + gLeft + L.sum + gLinks * (L.items.length - 1);
  const right = G.sum + gGate * (G.items.length - 1) + gRight + BELL + gRight + auth(10, 0.1, true);
  return { left, right, gOuter, need: left + gOuter + right, gutters: after ? 24 : 32, cap: after ? capRem * 16 : 1280 };
}
function phoneBar(w, after) {
  const tiny = after && w <= 370, free = !(after && w <= Number(freeMq[1]));
  const gOuter = after ? 8 : 12, gRight = after ? 6.4 : 8;
  const left = brand(tiny ? 25.6 : 32, tiny ? 16.8 : 20, after ? 8 : 10);
  const right = BELL + gRight + auth(tiny ? 7 : 10, tiny ? 0.05 : 0.1, free) + gRight + BURGER;
  return { left, right, need: left + gOuter + right, avail: w - (after ? 24 : 32) };
}

/* ---- DESKTOP ------------------------------------------------------------ */
const before = desktopBar(false), after = desktopBar(true);
near(before.need, 1684, 45, 'the bar\'s contents come to about 1685px at their natural size');
ok(before.need > 1248, 'and 1248px is all max-w-7xl ever offers, at any screen width');
const overlapBefore = before.need - 1248;
near(overlapBefore, 436, 60, 'so roughly 435px of the bar is painted on top of itself, on every desktop');
ok(overlapBefore > before.right - before.left && overlapBefore > 0, 'the spill is wide enough to reach both reported seams');

console.log('\n  DESKTOP — where the bar sits, before and after\n');
console.log('  ' + 'viewport'.padEnd(11) + 'before'.padEnd(30) + 'after');
let anyOverlapAfter = 0, wrapped = 0;
for (const w of [1280, 1366, 1440, 1512, 1600, 1728, 1920, 2560]) {
  const availB = Math.min(w, before.cap) - before.gutters;
  const availA = Math.min(w, after.cap) - after.gutters;
  const ovB = Math.max(0, before.need - availB);
  const fits = after.need <= availA;
  if (!fits) {
    /* wrapped: each tier is measured on its own, and each must fit alone */
    wrapped++;
    ok(after.left <= availA, `${w}px — the left tier fits its own line (${Math.round(after.left)} <= ${Math.round(availA)})`);
    ok(after.right <= availA, `${w}px — the control tier fits its own line (${Math.round(after.right)} <= ${Math.round(availA)})`);
  }
  const ovA = fits ? 0 : 0;
  anyOverlapAfter += ovA;
  ok(ovB > 0, `${w}px — the bar overlapped itself by ${Math.round(ovB)}px before`);
  ok(ovA === 0, `${w}px — nothing overlaps after`);
  console.log('  ' + (w + 'px').padEnd(11)
    + (Math.round(ovB) + 'px of overlap').padEnd(30)
    + (fits ? 'one row, 0px overlap' : 'two tiers, 0px overlap'));
}
eq(anyOverlapAfter, 0, 'no desktop width in the table has any overlap left');
ok(wrapped < 8, 'and the widest screens get the whole bar back on a single row');
const threshold = Math.ceil(after.need + after.gutters);
console.log(`\n  single row from ${threshold}px of window up; below that, two tiers.\n`);
ok(threshold < 1248 + 480, 'the fix genuinely closed most of the shortfall rather than just wrapping it away');

/* The two seams, named. Before, the left group alone already runs past where the
   right group starts; after, it cannot, because a group can no longer be squeezed
   below its own contents. */
const startOfRightBefore = 1248 - before.right;
ok(before.left > startOfRightBefore, '✊ Mandate was painted over 🔦 Local Issues (left group ran past the right group\'s start)');
const gateEndBefore = before.left + before.gOuter + gateways(0.10).sum + 12 * 3;
ok(gateEndBefore > 1248 - (BELL + 14 + auth(10, 0.1, true)), 'Community was painted under the bell');
/* ---- PHONE -------------------------------------------------------------- */
console.log('  PHONE — the row against the screen it is on\n');
console.log('  ' + 'device'.padEnd(30) + 'before'.padEnd(22) + 'after');
const PHONES = [
  [320, 'iPhone SE (1st) / fold cover'],
  [360, 'Galaxy S23'],
  [375, 'iPhone SE (2nd/3rd)'],
  [390, 'iPhone 14'],
  [412, 'Pixel 7'],
  [430, 'iPhone 15 Pro Max'],
];
for (const [w, name] of PHONES) {
  const b = phoneBar(w, false), a = phoneBar(w, true);
  const ovB = Math.max(0, b.need - b.avail), ovA = Math.max(0, a.need - a.avail);
  ok(ovA === 0, `${name} — the row fits the screen after (needs ${Math.round(a.need)} of ${a.avail})`);
  /* whatever happens, the three controls are whole and on-screen: they are
     flex-shrink: 0 inside a group that is flex-shrink: 0 */
  ok(a.right <= a.avail, `${name} — bell, account and hamburger are whole and on-screen`);
  console.log('  ' + name.padEnd(30)
    + (ovB > 0 ? `${Math.round(ovB)}px off the edge` : 'fit, barely').padEnd(22)
    + `${Math.round(a.avail - a.need)}px to spare`);
}
const narrow = PHONES.filter(([w]) => w <= 375).map(([w]) => phoneBar(w, false));
ok(narrow.every(b => b.need > b.avail), 'every phone at or below 375px overflowed its row before the fix');
ok(phoneBar(375, false).need - phoneBar(375, false).avail > 0 && phoneBar(375, false).need - phoneBar(375, false).avail < 30,
  'on a 375px iPhone it was a near miss — which is why the hamburger clipped rather than vanished');
console.log('');

if (fail) { console.error(`\n✗ top-nav layout: ${fail} of ${pass + fail} assertions failed\n`); process.exit(1); }
console.log(`✓ top-nav layout: all ${pass} assertions passed`);
