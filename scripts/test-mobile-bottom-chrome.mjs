/* ═══════════════════════════════════════════════════════════════════════════
   test-mobile-bottom-chrome.mjs — the bottom strip of a phone screen
   ────────────────────────────────────────────────────────────────────────────
   Every "Add to My Team" control on a phone is pinned to the bottom edge of
   something: the profile modal's deck, the medium modal's bottom sheet, a
   floating dock that follows the reader down the page. The bottom edge of a
   phone screen is also where the browser's own toolbar lives and where iOS
   reserves the home-indicator gesture strip, and both of those move. So "where
   is the bottom" is not a constant, and every bug this file pins is the same
   bug: some box answered that question with the LARGE viewport.

   THE LARGE VIEWPORT IS NOT THE SCREEN. A `position: fixed; inset: 0` element
   is laid out against the fixed-position viewport, which on iOS Safari is the
   height the page would have with the toolbar hidden — the same height `100vh`
   reports. While the toolbar is showing, the bottom of that box is behind it.
   app.css already sizes #modal-panel in `dvh` for this reason. It did not size
   the BOX the panel sits in, and the box is what decides where the panel lands:

     · #modal-overlay centres a 100dvh panel inside a 100lvh box, so the deck
       hangs (lvh − dvh) / 2 below the visible bottom.
     · .pdx-med-overlay does the same and then, below 480px, switches to
       `align-items: flex-end` — which pins the sheet's ⭐ Add to My Team footer
       to a bottom edge that is entirely behind the toolbar.
     · .pdx-record-overlay (All Stances) is its own scroller, so the end of a
       deep formal record is the end of a scroll range that runs past the
       screen and under the home indicator.

   THE SAFE AREA IS ONE GAP, NOT TWO. The floating page chrome reserved nothing
   for the home indicator, so on a notched iPhone it rendered inside the strip
   iOS reserves for the system swipe. Each gap becomes `max(gap, env(inset))`
   rather than `calc(gap + env(inset))` — the control's own air and the
   indicator clearance are the same gap. That is the rule app.css states on
   #modal-footer, and test-modal-bottom-chrome.mjs pins it there; this file
   pins the same doctrine on the surfaces app.css does not own.

   There is no browser in this suite, so nothing here is rendered. Sections 1-9
   are CSS-cascade facts read off the stylesheet. Section 10 is a geometry model
   — the same arithmetic the cascade will do, run over a table of real phones,
   so a regression shows up as a number of pixels off the bottom of a named
   device rather than as a missing declaration.

   Sections:
     1.  Every phone overlay that pins a team CTA is sized in dvh
     2.  The overlay's breakpoint covers the panel's, with no band left over
     3.  The gutter is zero wherever the panel is declared full-bleed
     4.  The bottom sheet's max-heights are dvh, and the narrow one still wins
     5.  Every floating control reserves the safe area, and pays for it once
     6.  All Stances reserves the indicator at the end of its scroll range
     7.  This block adds no second inset site to the #modal-* stack
     8.  The team call-to-action keeps every bit of its prominence
     9.  Desktop is untouched by construction
     10. The geometry, on real phones
   ═══════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg}\n    expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
// A probe whose target was renamed makes every assertion built on it vacuously
// true. That is a broken harness, not a passing contract — exit loudly.
const must = (cond, msg) => {
  if (cond) { passed++; return; }
  console.error(`\n✗ mobile-bottom-chrome: STALE HARNESS — ${msg}\n`);
  process.exit(2);
};
const section = (t) => console.log('   ── ' + t);

const HTML = read('index.html');
const APPCSS = read('app.css');

// ── The block under test ────────────────────────────────────────────────────
const BLOCK_ID = 'pdx-mobile-bottom-chrome';
const bStart = HTML.indexOf(`<style id="${BLOCK_ID}">`);
must(bStart !== -1, `index.html no longer has <style id="${BLOCK_ID}">`);
const bEnd = HTML.indexOf('</style>', bStart);
must(bEnd !== -1, 'the bottom-chrome style block is not closed');
const RAW = HTML.slice(HTML.indexOf('>', bStart) + 1, bEnd);
const CSS = RAW.replace(/\/\*[\s\S]*?\*\//g, '');
must(CSS.trim().length > 200, 'the bottom-chrome block is empty once comments are stripped');

// The block must be the LAST stylesheet mention of the selectors it re-declares,
// or file order does not hand it the cascade.
must(HTML.indexOf('<style', bEnd) === -1 && HTML.indexOf('rel="stylesheet"', bEnd) === -1,
  'another stylesheet is declared after the bottom-chrome block, so it may no longer win on order');

/* A crude media-block splitter. The block is hand-written and one level deep by
   construction (section 9 proves it), so a real parser would be a larger surface
   than the check. Returns [{ query, maxWidth, body }]. */
function mediaBlocks(css) {
  const out = [];
  const re = /@media([^{]+)\{/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    let depth = 1;
    let i = re.lastIndex;
    while (i < css.length && depth > 0) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}') depth--;
      i++;
    }
    const query = m[1].trim().replace(/\s+/g, ' ');
    const mw = /max-width\s*:\s*(\d+)px/.exec(query);
    out.push({ query, maxWidth: mw ? Number(mw[1]) : null, body: css.slice(re.lastIndex, i - 1) });
    re.lastIndex = i;
  }
  return out;
}

/* Every rule in the block, flattened, each carrying the media query it lives in.
   Selector lists are split so `.a, .b { … }` is two rules. */
function rules(css) {
  const out = [];
  for (const mb of mediaBlocks(css)) {
    const re = /([^{}]+)\{([^{}]*)\}/g;
    let m;
    while ((m = re.exec(mb.body)) !== null) {
      const decls = m[2].trim();
      for (const sel of m[1].split(',')) {
        const s = sel.trim().replace(/\s+/g, ' ');
        if (s) out.push({ sel: s, decls, maxWidth: mb.maxWidth, query: mb.query });
      }
    }
  }
  return out;
}

const RULES = rules(CSS);
must(RULES.length >= 8, `only ${RULES.length} rules parsed out of the bottom-chrome block`);
const forSel = (sel) => RULES.filter((r) => r.sel === sel);
// Every declaration for a selector, in file order, as ["prop","value"] pairs.
const declsFor = (sel) => forSel(sel).flatMap((r) =>
  r.decls.split(';').map((d) => d.trim()).filter(Boolean).map((d) => {
    const i = d.indexOf(':');
    return [d.slice(0, i).trim(), d.slice(i + 1).trim()];
  }));

console.log('\n▶ mobile bottom chrome — the team CTA stops fighting the viewport\n');

// ═════════════════════════════════════════════════════════════════════════════
// 1. Every phone overlay that pins a team CTA is sized in dvh
// ═════════════════════════════════════════════════════════════════════════════
section('1 · the box is the visible screen, not the large viewport');

/* Both of these are `position: fixed; inset: 0` in their own stylesheet, which
   is the shape that resolves to the large viewport. Giving the box an explicit
   height is what fixes it: an over-constrained absolutely-positioned box drops
   `bottom`, so `height` decides where the bottom edge is. The vh declaration
   has to come FIRST — it is the fallback for an engine that cannot parse dvh,
   and a fallback declared afterwards would simply win. */
for (const sel of ['#modal-overlay', '.pdx-med-overlay']) {
  const ds = declsFor(sel).filter(([p]) => p === 'height');
  ok(ds.length === 2, `${sel} should declare height twice — the vh fallback and the dvh answer (got ${ds.length})`);
  ok(ds.length === 2 && /100vh/.test(ds[0][1]),
    `${sel}'s first height is not the 100vh fallback — an engine without dvh support gets no full-screen overlay`);
  ok(ds.length === 2 && /100dvh/.test(ds[1][1]),
    `${sel} no longer sizes to the dynamic viewport, so a toolbar-height slice of the team CTA goes off-screen`);
  ok(forSel(sel).every((r) => r.maxWidth !== null && r.maxWidth <= 768),
    `${sel} is sized outside a phone-width media query — that would resize the desktop overlay too`);
}

// The record overlay is the same box, and it is its own scroller.
ok(declsFor('.pdx-record-overlay').filter(([p]) => p === 'height').length === 2,
  '.pdx-record-overlay (All Stances) no longer sizes to the dynamic viewport, so the end of a deep\n' +
  '    formal record is the end of a scroll range that runs under the browser toolbar');

// ═════════════════════════════════════════════════════════════════════════════
// 2. The overlay's breakpoint covers the panel's, with no band left over
// ═════════════════════════════════════════════════════════════════════════════
section('2 · no width where the panel is dvh but its box is not');

/* app.css sizes #modal-panel in dvh below some breakpoint. If this block fixed
   the box at a NARROWER breakpoint, there would be a band of widths where the
   panel is the small viewport and the box is still the large one — which is
   precisely the misalignment being fixed, just relocated. */
const APPNAKED = APPCSS.replace(/\/\*[\s\S]*?\*\//g, '');
const panelDvhAt = APPNAKED.search(/#modal-panel[^{}]*\{[^}]*100dvh/);
must(panelDvhAt !== -1, 'app.css no longer sizes #modal-panel in dvh (test-modal-bottom-chrome owns that rule)');
const panelMedia = /max-width\s*:\s*(\d+)px/.exec(
  APPNAKED.slice(APPNAKED.lastIndexOf('@media', panelDvhAt), panelDvhAt));
must(panelMedia, 'could not read the breakpoint app.css sizes #modal-panel at');
const overlayMax = Math.max(...forSel('#modal-overlay').map((r) => r.maxWidth));
ok(overlayMax >= Number(panelMedia[1]),
  `#modal-overlay is fixed only to ${overlayMax}px while #modal-panel is dvh to ${panelMedia[1]}px — between\n` +
  '    those widths the panel is the small viewport inside a large-viewport box, which is the bug');

// ═════════════════════════════════════════════════════════════════════════════
// 3. The gutter is zero wherever the panel is declared full-bleed
// ═════════════════════════════════════════════════════════════════════════════
section('3 · a full-bleed panel gets no gutter drawn around it');

/* At phone widths app.css already declares the panel edge-to-edge — no max-width,
   no radius, no margin. Tailwind's `sm:p-4` on the overlay still drew a 1rem
   frame from 640px up, which both contradicted that and pushed 2rem of a 100dvh
   panel past the bottom of the screen. An id outranks a utility class, so this
   needs no !important — and asserting that keeps someone from adding one. */
const pad = declsFor('#modal-overlay').filter(([p]) => p === 'padding');
eq(pad.length, 1, '#modal-overlay should zero its gutter exactly once');
ok(pad.length === 1 && /^0$/.test(pad[0][1]), `#modal-overlay's gutter is not zero (got ${pad[0] && pad[0][1]})`);
ok(!/!important/.test(CSS),
  'something in this block reaches for !important — every selector here already outranks what it\n' +
  '    overrides on specificity or file order, and an !important here is a future override nobody can win');
ok(/max-width\s*:\s*100%\s*!important/.test(APPNAKED.slice(panelDvhAt - 700, panelDvhAt + 200)),
  'app.css no longer declares #modal-panel full-bleed at this breakpoint, so zeroing the overlay gutter\n' +
  '    would now be a design change rather than the completion of one');

// ═════════════════════════════════════════════════════════════════════════════
// 4. The bottom sheet's max-heights are dvh, and the narrow one still wins
// ═════════════════════════════════════════════════════════════════════════════
section('4 · the bottom sheet measures itself against the screen');

const sheet = forSel('.pdx-med-panel');
ok(sheet.length === 2, `.pdx-med-panel should be re-measured at two breakpoints, got ${sheet.length}`);
for (const r of sheet) {
  const hs = r.decls.split(';').map((d) => d.trim()).filter((d) => /^max-height/.test(d));
  ok(hs.length === 2 && /vh/.test(hs[0]) && /dvh/.test(hs[1]),
    `.pdx-med-panel at ${r.query} needs a vh fallback then a dvh answer (got ${JSON.stringify(hs)})`);
}
// 92dvh is the bottom-sheet variant and must still override the 88dvh card.
const wide = sheet.find((r) => r.maxWidth === 640);
const narrow = sheet.find((r) => r.maxWidth === 480);
must(wide && narrow, '.pdx-med-panel breakpoints moved — expected one at 640px and one at 480px');
ok(CSS.indexOf(wide.decls) < CSS.indexOf(narrow.decls),
  'the 480px bottom-sheet height is declared before the 640px card height, so the card height wins on\n' +
  '    file order and the sheet loses the extra 4% it is meant to have');

// ═════════════════════════════════════════════════════════════════════════════
// 5. Every floating control reserves the safe area, and pays for it once
// ═════════════════════════════════════════════════════════════════════════════
section('5 · nothing floats inside the home-indicator gesture strip');

const FLOATS = ['.align-fab', '#compare-float-btn', '.pdx-roster-status', '.team-dock', '.pdx-fr'];
for (const sel of FLOATS) {
  const bs = declsFor(sel).filter(([p]) => p === 'bottom');
  eq(bs.length, 1, `${sel} should re-declare its bottom offset exactly once`);
  const v = bs.length === 1 ? bs[0][1] : '';
  ok(/^max\(/.test(v),
    `${sel}'s bottom offset is not a max() — a fixed control needs air under it AND a notched device\n` +
    `    needs the indicator clear, and those are the same gap (got ${JSON.stringify(v)})`);
  ok(/env\(safe-area-inset-bottom,\s*0px\)/.test(v),
    `${sel} does not reserve the bottom safe-area inset, or omits the 0px fallback that keeps a\n` +
    `    desktop and a flat-bottomed Android exactly where they are (got ${JSON.stringify(v)})`);
  ok(!/calc\([^)]*env\(safe-area-inset-bottom/.test(v),
    `${sel} ADDS the inset to its own gap instead of taking the larger of the two — that is the\n` +
    '    stacked-reservation shape app.css spent two passes removing from the profile deck');
  ok(forSel(sel).every((r) => r.maxWidth !== null && r.maxWidth <= 640),
    `${sel}'s reservation is not phone-scoped, so it would move the desktop control too`);
}

// ═════════════════════════════════════════════════════════════════════════════
// 6. All Stances reserves the indicator at the end of its scroll range
// ═════════════════════════════════════════════════════════════════════════════
section('6 · the last row of a deep formal record is reachable');

const recPad = declsFor('.pdx-record-overlay').filter(([p]) => p === 'padding-bottom');
eq(recPad.length, 1, '.pdx-record-overlay should reserve its bottom inset exactly once');
ok(recPad.length === 1 && /env\(safe-area-inset-bottom,\s*0px\)/.test(recPad[0][1]),
  '.pdx-record-overlay no longer reserves the home indicator at the end of its scroll range — the last\n' +
  '    issue rows on a Mike Lee-class record are the ones that end up under it');
ok(recPad.length === 1 && /calc\(/.test(recPad[0][1]),
  "the record overlay's reservation should ADD the inset to the padding it already had — unlike a\n" +
  '    floating control, a scroll end and a gesture strip really are two different gaps');
ok(/overscroll-behavior\s*:\s*contain/.test(forSel('.pdx-record-overlay').map((r) => r.decls).join(';')),
  'the record overlay no longer contains its overscroll, so reaching the end of the list drags the\n' +
  '    page underneath it instead of stopping');

// ═════════════════════════════════════════════════════════════════════════════
// 7. This block adds no second inset site to the #modal-* stack
// ═════════════════════════════════════════════════════════════════════════════
section('7 · the profile deck still reserves the inset exactly once');

/* test-modal-bottom-chrome.mjs pins "exactly one env(safe-area-inset-bottom) on
   the #modal-* stack", but it reads app.css only. A reservation added here would
   be invisible to it and would stack on the deck's — the original bug. */
const modalSelsHere = RULES.map((r) => r.sel).filter((s) => /^#modal-/.test(s));
ok(modalSelsHere.every((s) => s === '#modal-overlay'),
  'this block styles a #modal-* element other than the overlay — the deck, the body, the content and\n' +
  '    the action strip are owned by app.css (found: ' + [...new Set(modalSelsHere)].join(' | ') + ')');
ok(!/#modal-[^{]*\{[^}]*safe-area-inset-bottom/.test(CSS),
  'this block reserves the safe-area inset on a #modal-* selector — the deck already reserves it, and\n' +
  '    a second site is exactly the stacked dead space app.css removed');

// ═════════════════════════════════════════════════════════════════════════════
// 8. The team call-to-action keeps every bit of its prominence
// ═════════════════════════════════════════════════════════════════════════════
section('8 · adding someone to the team is no less of a primary action');

/* The brief's third requirement is that this fix must not be a hiding place.
   The cheapest way to make a bar stop covering content is to make it smaller,
   dimmer or conditional, and none of those are allowed here. This block is
   position and box-size only, so the check is that it names no CTA and declares
   no property that could shrink, dim, hide or restack one. */
for (const sel of ['#modal-addteam-btn', '.pdx-med-act-team', '.myteam-add-btn', '#modal-footer']) {
  ok(CSS.indexOf(sel) === -1,
    `this block re-styles ${sel} — the team call-to-action's size and treatment are owned elsewhere and\n` +
    '    must not be quietly traded away to buy back screen space');
}
for (const prop of ['display', 'visibility', 'pointer-events', 'opacity', 'z-index', 'transform', 'font-size']) {
  ok(!new RegExp('(^|[;{\\s])' + prop + '\\s*:').test(CSS),
    `this block declares ${prop} — hiding, dimming, shrinking or restacking a control is not the same\n` +
    '    thing as stopping it from covering content, and only the second one was asked for');
}
// The controls themselves are untouched in markup, so add/remove still works.
must(HTML.indexOf('id="modal-addteam-btn"') !== -1 && HTML.indexOf('id="pdx-med-team-btn"') !== -1,
  'a team button lost its id — the add/remove handlers are wired to those ids');
ok(/onclick="pdxModalToggleTeam\(this\)"/.test(HTML) && /onclick="window\._mediumToggleTeam\(this\)"/.test(HTML),
  'a team toggle lost its handler — adding to and removing from the Voting Team must keep working');

// ═════════════════════════════════════════════════════════════════════════════
// 9. Desktop is untouched by construction
// ═════════════════════════════════════════════════════════════════════════════
section('9 · every declaration is phone-scoped');

// Anything outside a media block is a declaration that reaches a desktop.
const outsideMedia = CSS.replace(/@media[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '').trim();
eq(outsideMedia.replace(/\s+/g, ''), '',
  'the bottom-chrome block declares something outside a media query, so it reaches desktop too\n' +
  '    (leftover: ' + JSON.stringify(outsideMedia.slice(0, 160)) + ')');
ok(mediaBlocks(CSS).every((mb) => mb.maxWidth !== null && mb.maxWidth <= 768),
  'a media block here is not a phone-width max-width query (found: ' +
  mediaBlocks(CSS).map((mb) => mb.query).join(' | ') + ')');

// ═════════════════════════════════════════════════════════════════════════════
// 10. The geometry, on real phones
// ═════════════════════════════════════════════════════════════════════════════
section('10 · where the team CTA actually lands, device by device');

/* lvh is the large viewport (toolbar hidden — what 100vh and a fixed inset:0 box
   report on iOS Safari), dvh is what the reader can see with the toolbar up, and
   inset is env(safe-area-inset-bottom). Android's toolbar delta is smaller and
   its gesture bar reports no inset, which is exactly why this class of bug shows
   up as "works on my Pixel". */
const DEVICES = [
  { name: 'iPhone SE (375×667)',        w: 375, lvh: 667,  dvh: 553, inset: 0 },
  { name: 'iPhone 14 (390×844)',        w: 390, lvh: 844,  dvh: 745, inset: 34 },
  { name: 'iPhone 15 Pro Max (430)',    w: 430, lvh: 932,  dvh: 833, inset: 34 },
  { name: 'Pixel 7 (412×915)',          w: 412, lvh: 915,  dvh: 859, inset: 0 },
  { name: 'Galaxy S23 (360×780)',       w: 360, lvh: 780,  dvh: 724, inset: 0 },
  { name: 'Galaxy Z Fold inner (673)',  w: 673, lvh: 841,  dvh: 785, inset: 0 },
  { name: 'iPad mini portrait (744)',   w: 744, lvh: 1133, dvh: 1133, inset: 20 },
];
const REM = 16;

/* THE PROFILE DECK. The panel is 100dvh at these widths either way; what changes
   is the box it is aligned in. Before: a 100lvh box with `items-center`, so the
   panel's bottom lands at (lvh + dvh) / 2 — note the overlay's own gutter cancels
   out of that, which is why the 640-768px band was broken too. After: the box is
   the panel's own height, so the bottom is the bottom. */
const deckBottomBefore = (d) => (d.lvh + d.dvh) / 2;
const deckBottomAfter = (d) => d.dvh;

/* THE MEDIUM SHEET below 480px: `align-items: flex-end` against the box, so the
   footer sits on the box's bottom edge, wherever that is. */
const sheetBottomBefore = (d) => d.lvh;
const sheetBottomAfter = (d) => d.dvh;

let anyHidden = 0;
for (const d of DEVICES) {
  const cut = Math.round(deckBottomBefore(d) - d.dvh);
  if (cut > 0) anyHidden++;
  ok(Math.round(deckBottomAfter(d)) <= d.dvh,
    `${d.name}: the profile deck still ends ${Math.round(deckBottomAfter(d) - d.dvh)}px below the visible screen`);
  if (d.w <= 480) {
    ok(Math.round(sheetBottomAfter(d)) <= d.dvh,
      `${d.name}: the ⭐ Add to My Team sheet footer still ends ${Math.round(sheetBottomAfter(d) - d.dvh)}px below the screen`);
  }
  // The floating chrome clears the gesture strip on every device.
  for (const [label, gapRem] of [['team dock', 0.7], ['alignment launcher', 0.85], ['compare pill', 1]]) {
    const after = Math.max(gapRem * REM, d.inset);
    ok(after >= d.inset,
      `${d.name}: the ${label} sits ${d.inset - after}px inside the home-indicator gesture strip`);
  }
  const worst = Math.max(0, cut);
  console.log(`      ${d.name.padEnd(28)} deck was ${String(worst).padStart(3)}px off-screen → 0px` +
    (d.inset ? `, floats clear a ${d.inset}px indicator` : ''));
}
ok(anyHidden >= 4,
  'the model no longer reproduces the defect on any device, which means the model stopped modelling it —\n' +
  '    if lvh and dvh are equal everywhere in this table there is nothing here to prove');

// ═════════════════════════════════════════════════════════════════════════════
// Report
// ═════════════════════════════════════════════════════════════════════════════
if (failures.length) {
  console.error(`\n✗ mobile bottom chrome: ${failures.length} failure(s)`);
  failures.forEach((f) => console.error('  · ' + f));
  process.exit(1);
}
console.log(`\n✓ mobile bottom chrome: all ${passed} assertions passed — the team CTA is on the screen, above the strip`);
