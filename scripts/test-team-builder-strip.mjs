/* ═══════════════════════════════════════════════════════════════════════════
   test-team-builder-strip.mjs — the office-category strip on a phone
   ────────────────────────────────────────────────────────────────────────────
   The team builder is a "cockpit": a level nav (Federal · Statewide · State
   Legislative · Local) beside a stage that shows only the selected level's
   seats. On a desktop the nav is a vertical sidebar and every group is visible
   at once. At ≤880px it folds into one horizontal row — and there it had a
   quiet, expensive bug.

   Every chip inherited `width: 100%` from the base rule. In a horizontal
   scroller that is not "as wide as it needs to be", it is "as wide as the whole
   visible track" — so a phone showed exactly ONE office group, with the next
   one starting past the right edge and only a few pixels of it clipped into
   view by the strip's own padding. Nothing else on screen said the row
   continued: the "swipe through all your seats" hint belongs to the SEAT strip
   inside a level, not to the level row itself, and it is hidden by the cockpit
   renderer anyway. A first-time voter in Davis County could fill their Federal
   seats and leave believing that was the whole ballot.

   This file pins the fix, which is three affordances and one measurement:

     · the chips are sized to a FRACTION of the visible track (~1.6), so one
       whole group and most of the next are always on screen at rest;
     · a chevron flanks each side of the track, at a real thumb target, and each
       one goes dead only at the end of the travel it offers;
     · a cue names the number of office groups, and a dot per group states the
       position — both wired to the same selection the chips drive.

   All of it is gated on `.is-scroll`, which the renderer sets from the strip's
   MEASURED scrollWidth. That gate is what keeps the desktop sidebar untouched:
   a vertical column never overflows horizontally, so the class is never set and
   none of the new chrome exists there.

   The nav's behaviour is real code, not markup, so the two functions that own
   it are sliced out of compare-hub.js and driven against a fake strip with
   fake scroll metrics. If those slices stop matching, the harness exits loudly
   rather than passing vacuously.

   Sections:
     1. The strip renders its three affordances
     2. …and stands down when there is only one office group
     3. The chips are sized to show ~1.5–2 groups, from the track
     4. Touch targets, and the desktop sidebar that must not move
     5. Driven: the chevrons page, and die only at the ends
     6. Driven: selection agrees across chips, panels and dots
     7. Nothing about ballot building changed
   ═══════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg}\n    expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) => ok(hay.indexOf(needle) !== -1, msg);
const lacks = (hay, needle, msg) => ok(hay.indexOf(needle) === -1, msg);
// A probe whose target was renamed makes every assertion built on it vacuously
// true. That is a broken harness, not a passing contract — exit loudly.
const must = (cond, msg) => {
  if (cond) { passed++; return; }
  console.error(`\n✗ team-builder-strip: STALE HARNESS — ${msg}\n`);
  process.exit(2);
};

const HUB = read('compare-hub.js');
const CSS = read('app.css');
const HTML = read('index.html');

// ═════════════════════════════════════════════════════════════════════════════
// The slices
// ═════════════════════════════════════════════════════════════════════════════
// compare-hub.js is one 11k-line IIFE that boots itself against the live page,
// so it cannot be imported. The nav is self-contained enough to lift out: the
// scroll machinery (everything from _myteamNavEl down to _myteamSelectLevel)
// and the shell renderer.
const navFrom = HUB.indexOf('function _myteamNavEl()');
const navTo = HUB.indexOf('// Build the whole cockpit', navFrom);
must(navFrom !== -1 && navTo > navFrom,
  'compare-hub.js no longer defines the _myteamNavEl…_myteamSelectLevel block — sections 5 and 6\n' +
  '  are testing nothing');
const shellFrom = HUB.indexOf('function _myteamNavShellHtml(');
const shellTo = HUB.indexOf('function _renderTeamDistrictCoverage', shellFrom);
must(shellFrom !== -1 && shellTo > shellFrom,
  'compare-hub.js no longer defines _myteamNavShellHtml — sections 1 to 3 are testing nothing');
const SRC = HUB.slice(navFrom, navTo) + '\n' + HUB.slice(shellFrom, shellTo);

// ── A strip, with metrics ───────────────────────────────────────────────────
// Enough DOM to answer the three questions the nav code asks: what class is on
// this element, how wide is the track, and where is that chip.
const mkEl = (cls) => {
  const set = new Set(String(cls || '').split(/\s+/).filter(Boolean));
  const el = {
    _attrs: {}, _kids: [], parentNode: null, disabled: false, hidden: false,
    scrollLeft: 0, scrollWidth: 0, clientWidth: 0, offsetLeft: 0, offsetWidth: 0,
    classList: {
      add: (c) => set.add(c), remove: (c) => set.delete(c),
      contains: (c) => set.has(c),
      toggle: (c, on) => { if (on === undefined) { set.has(c) ? set.delete(c) : set.add(c); } else if (on) set.add(c); else set.delete(c); },
    },
    setAttribute(k, v) { el._attrs[k] = String(v); },
    getAttribute: (k) => (k in el._attrs ? el._attrs[k] : null),
    scrollTo(o) { el.scrollLeft = (o && typeof o.left === 'number') ? o.left : el.scrollLeft; el._behavior = o && o.behavior; },
    querySelector: () => null, querySelectorAll: () => [],
    closest: () => null,
  };
  el._has = (c) => set.has(c);
  return el;
};

const LEVELS = [
  { lv: { id: 'federal', label: 'Federal Races', accent: '#60a5fa' } },
  { lv: { id: 'statewide', label: 'Statewide Races', accent: '#34d399' } },
  { lv: { id: 'districts', label: 'State Legislative', accent: '#fbbf24' } },
  { lv: { id: 'local', label: 'Local / Municipal', accent: '#c084fc' } },
];

// A phone-sized strip: a 300px window onto a 1000px row of four 240px chips.
const CHIP_W = 240, CHIP_GAP = 8, TRACK = 300;
const wrap = mkEl('myteam-cockpit-navwrap');
const row = mkEl('myteam-cockpit-navrow');
const nav = mkEl('myteam-cockpit-nav');
nav.clientWidth = TRACK;
nav.scrollWidth = LEVELS.length * (CHIP_W + CHIP_GAP);
nav.closest = (sel) => (sel === '.myteam-cockpit-navwrap' ? wrap : null);
nav.parentNode = row; row.parentNode = wrap;

const chips = LEVELS.map((x, i) => {
  const el = mkEl('myteam-cockpit-navitem' + (i === 0 ? ' is-active' : ''));
  el.setAttribute('data-level', x.lv.id);
  el.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
  el.offsetLeft = i * (CHIP_W + CHIP_GAP);
  el.offsetWidth = CHIP_W;
  return el;
});
const dots = LEVELS.map((x, i) => {
  const el = mkEl('myteam-cockpit-navdot' + (i === 0 ? ' is-on' : ''));
  el.setAttribute('data-level', x.lv.id);
  el.setAttribute('aria-current', i === 0 ? 'true' : 'false');
  return el;
});
const panels = LEVELS.map((x, i) => {
  const el = mkEl('myteam-cockpit-panel' + (i === 0 ? ' is-active' : ''));
  el.setAttribute('data-level', x.lv.id);
  el.hidden = i !== 0;
  return el;
});
const arrows = [-1, 1].map((d) => {
  const el = mkEl('myteam-cockpit-navarrow');
  el.setAttribute('data-dir', String(d));
  return el;
});
nav.querySelector = (sel) => {
  const m = /data-level="([^"]+)"/.exec(sel || '');
  return (m && chips.filter((c) => c.getAttribute('data-level') === m[1])[0]) || null;
};
const grid = mkEl('myteam-slots-grid');
grid.querySelectorAll = (sel) => {
  if (sel === '.myteam-cockpit-navitem') return chips;
  if (sel === '.myteam-cockpit-navdot') return dots;
  if (sel === '.myteam-cockpit-panel') return panels;
  return [];
};
const gridListeners = [];
grid.addEventListener = (t, fn, capture) => gridListeners.push({ t, fn, capture });

const winListeners = [];
const ctx = {
  console, Math, JSON, String, Array, Object, Number, Boolean, RegExp, setTimeout,
  matchMedia: () => ({ matches: false }),
  requestAnimationFrame: (f) => { f(); return 1; },
  addEventListener: (t, fn) => winListeners.push(t),
  document: {
    getElementById: (id) => (id === 'myteam-cockpit-nav' ? nav : (id === 'myteam-slots-grid' ? grid : null)),
    querySelectorAll: (sel) => (sel === '.myteam-cockpit-navarrow' ? arrows : []),
  },
};
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(SRC, ctx, { filename: 'compare-hub.js[nav]' });
const W = ctx.window;
must(typeof W._myteamNavShellHtml === 'function' || typeof ctx._myteamNavShellHtml === 'function',
  '_myteamNavShellHtml did not survive the slice');
const shell = ctx._myteamNavShellHtml;

// ═════════════════════════════════════════════════════════════════════════════
// 1 · The strip renders its three affordances
// ═════════════════════════════════════════════════════════════════════════════
const CHIPS_HTML = '<button class="myteam-cockpit-navitem" data-level="federal">x</button>';
const OUT = shell(CHIPS_HTML, LEVELS, 'federal');

has(OUT, 'class="myteam-cockpit-navwrap"',
  'strip: the nav has no wrapper, so there is nowhere to hang the arrows, the cue or the pager');
has(OUT, 'id="myteam-cockpit-nav"',
  'strip: the track has no id — the chevrons address it by id, and without one they scroll nothing');
has(OUT, 'role="tablist"',
  'strip: the level row stopped being a tablist, which is how a screen reader is told these four\n' +
  '    chips are one choice');
has(OUT, CHIPS_HTML,
  'strip: the wrapper dropped the chips it was given — the office groups themselves are gone');

// Two chevrons, one per side, each declaring which way it goes.
eq((OUT.match(/class="myteam-cockpit-navarrow"/g) || []).length, 2,
  'strip: there are not exactly two chevrons — the requirement is one on each side of the track');
has(OUT, 'data-dir="-1"', 'strip: no backward chevron');
has(OUT, 'data-dir="1"', 'strip: no forward chevron');
ok(OUT.indexOf('data-dir="-1"') < OUT.indexOf('id="myteam-cockpit-nav"'),
  'strip: the backward chevron is not before the track in the DOM, so it does not read as the\n' +
  '    left-hand control it is drawn as');
ok(OUT.indexOf('data-dir="1"') > OUT.indexOf('id="myteam-cockpit-nav"'),
  'strip: the forward chevron is not after the track in the DOM');
eq((OUT.match(/aria-controls="myteam-cockpit-nav"/g) || []).length, 2,
  'strip: a chevron does not say what it controls');
ok(/data-dir="-1"[^>]*aria-label="[^"]{8,}"/.test(OUT) && /data-dir="1"[^>]*aria-label="[^"]{8,}"/.test(OUT),
  'strip: a chevron is an unlabelled glyph — "‹" alone is nothing to a screen reader');
ok(/onclick="window\._myteamNavPage\(-1\)"/.test(OUT) && /onclick="window\._myteamNavPage\(1\)"/.test(OUT),
  'strip: a chevron is not wired to the pager, so it is a button that does nothing');

// The cue, which is the part that actually states the missing fact.
has(OUT, 'class="myteam-cockpit-navcue"', 'strip: the swipe cue is gone');
has(OUT, '4 office groups',
  'strip: the cue does not state how many office groups there are — the whole failure being fixed\n' +
  '    is a voter not knowing the other groups exist, and the count is what says so');
has(OUT, 'Swipe',
  'strip: the cue no longer names the gesture, so a reader who does not try the arrows is not told\n' +
  '    the row can be swiped');
// The stage a few lines below carries "0 of 6 filled". The cue must not be
// mistakable for it.
lacks(OUT.replace(/<[^>]+>/g, ' '), 'filled',
  'strip: the cue borrows the word the seat counter uses, so "4 office groups" can be misread as a\n' +
  '    ballot-completion figure');
lacks(OUT.replace(/<[^>]+>/g, ' '), 'seats',
  'strip: the cue says "seats" — it is counting OFFICE GROUPS, and the level a voter is looking at\n' +
  '    already has its own seat count');

// The pager: one dot per group, exactly one lit, each one a real control.
eq((OUT.match(/class="myteam-cockpit-navdot[ "]/g) || []).length, 4,
  'strip: the pager does not have one dot per office group');
eq((OUT.match(/class="myteam-cockpit-navdot is-on"/g) || []).length, 1,
  'strip: the pager lights no dot, or more than one — position is exactly what it exists to show');
ok(/data-level="federal"[^>]*aria-current="true"/.test(OUT),
  'strip: the lit dot is not the open office group, so the pager and the strip disagree');
eq((OUT.match(/aria-current="false"/g) || []).length, 3,
  'strip: the unlit dots do not report themselves as not-current');
for (const x of LEVELS) {
  has(OUT, 'aria-label="' + x.lv.label + ' — office group',
    `strip: the "${x.lv.label}" dot is a bare circle to a screen reader — it must name its group`);
}
has(OUT, 'office group 3 of 4',
  'strip: a dot does not state its position out of the total');
eq((OUT.match(/onclick="window\._myteamSelectLevel\('/g) || []).length, 4,
  'strip: the dots are decorative — each one should also be a way into its group');

// ═════════════════════════════════════════════════════════════════════════════
// 2 · …and stands down when there is only one office group
// ═════════════════════════════════════════════════════════════════════════════
// A ballot with one level has nothing to page through. Chevrons and a "1 office
// groups" cue over a single chip would be chrome describing a movement the strip
// cannot make.
const ONE = shell(CHIPS_HTML, [LEVELS[0]], 'federal');
has(ONE, 'id="myteam-cockpit-nav"', 'strip: the single-level case lost the track itself');
lacks(ONE, 'myteam-cockpit-navarrow',
  'strip: a one-group ballot still gets chevrons, which point at nothing');
lacks(ONE, 'myteam-cockpit-navcue',
  'strip: a one-group ballot is told to swipe through a row with one chip in it');
lacks(ONE, 'myteam-cockpit-navdot',
  'strip: a one-group ballot gets a one-dot pager, which states no position');

// ═════════════════════════════════════════════════════════════════════════════
// 3 · The chips are sized to show ~1.5–2 groups, from the track
// ═════════════════════════════════════════════════════════════════════════════
// This is the measurement the whole pass turns on. The base rule gives each chip
// `width: 100%`; in a horizontal scroller that means one chip per screen, which
// is exactly the clipped-sliver the voter met. The override has to be a fraction
// of the TRACK, so it stays correct at any phone width and whatever the chevrons
// take off the sides.
const NAV_CSS = CSS.slice(CSS.indexOf('.myteam-cockpit-navwrap'));
const fracRe = /\.myteam-cockpit-navitem\s*\{[^}]*width:\s*calc\(\(100% - [\d.]+rem\) \/ ([\d.]+)\)/;
const frac = fracRe.exec(NAV_CSS);
must(!!frac, 'app.css no longer sizes .myteam-cockpit-navitem as a fraction of the track');
const divisor = parseFloat(frac[1]);
ok(divisor >= 1.5 && divisor <= 2,
  `strip: chips are sized to show ${divisor} at a time — the requirement is about 1.5 to 2, so the\n` +
  '    next office group is visibly available rather than a clipped edge');
ok(/\.myteam-cockpit-navitem\s*\{[^}]*max-width:\s*\d+px/.test(NAV_CSS),
  'strip: the chip fraction has no cap, so on a wide tablet 1.6 chips means two enormous slabs');

// The fraction alone is not what the voter sees. Chrome eats the track before a
// single chip is drawn: the page container's px-4, the card's p-6, two 44px
// chevrons, the row gaps and the nav's own padding. On a 360px phone that is
// more than half the viewport. Work the real numbers at the widths phones
// actually report, so a future tweak to any one of those cannot quietly push the
// strip back to one-and-a-sliver while the fraction above still reads 1.6.
const REM = 16;
const px = (re, label) => {
  const m = re.exec(NAV_CSS);
  must(!!m, `app.css no longer declares ${label} — the at-rest geometry below cannot be checked`);
  return m[1].endsWith('rem') ? parseFloat(m[1]) * REM : parseFloat(m[1]);
};
const chipMin = px(/\.myteam-cockpit-navitem\s*\{[^}]*min-width:\s*([\d.]+px)/, 'the chip floor');
const chipMax = px(/\.myteam-cockpit-navitem\s*\{[^}]*max-width:\s*([\d.]+px)/, 'the chip cap');
const navPad = px(/\.myteam-cockpit-nav\s*\{[^}]*padding:\s*([\d.]+rem)/, "the track's padding");
const navGap = px(/\.myteam-cockpit-nav\s*\{[^}]*gap:\s*([\d.]+rem)/, 'the gap between chips');
const rowGap = px(/is-scroll \.myteam-cockpit-navrow\s*\{[^}]*gap:\s*([\d.]+rem)/, 'the gap beside the chevrons');
const arrowW = px(/\.myteam-cockpit-navarrow\s*\{[^}]*min-width:\s*([\d.]+px)/, 'the chevron width');
const bleedM = /is-scroll \.myteam-cockpit-navrow\s*\{[^}]*margin-left:\s*-([\d.]+)rem/.exec(NAV_CSS);
const bleed = bleedM ? parseFloat(bleedM[1]) * REM : 0;

// px-4 on the hub container (16 a side) + p-6 on the builder card (24 a side).
const PAGE_CHROME = 2 * 16 + 2 * 24;
const chipsAtRest = (vw) => {
  const row = (vw - PAGE_CHROME) + 2 * bleed;
  const content = row - 2 * arrowW - 2 * rowGap - 2 * navPad;
  const chip = Math.min(chipMax, Math.max(chipMin, (content - navGap) / divisor));
  return (content + navGap) / (chip + navGap);
};
for (const vw of [360, 390, 412, 430]) {
  const n = chipsAtRest(vw);
  ok(n >= 1.5 && n <= 2,
    `strip: at ${vw}px the strip comes to rest showing ${n.toFixed(2)} office groups — the requirement\n` +
    '    is about 1.5 to 2, so the next group is half-visible rather than clipped to an edge');
}
// Without the bleed the card's own padding puts the narrowest common phone back
// under the floor, so this is load-bearing rather than decoration.
ok(bleed > 0,
  'strip: the track no longer runs out into the card padding, which costs a 360px phone about a\n' +
  '    third of the strip and drops it back under 1.5 groups at rest');
// The old ≤480px rule pinned chips at 150px wide. Left in place it would win over
// the fraction on exactly the screens this pass is for.
ok(!/@media \(max-width: 480px\)\s*\{[^}]*\.myteam-cockpit-navitem\s*\{[^}]*min-width:\s*150px/.test(CSS),
  'strip: the old 150px chip floor is still in the ≤480px block — min-width beats width, so on a\n' +
  '    phone the fraction above is dead and the strip shows one chip again');
ok(/\.myteam-cockpit-nav\s*\{[^}]*overscroll-behavior-x:\s*contain/.test(NAV_CSS),
  'strip: a swipe that runs off the end of the row hands the gesture to the browser, which\n' +
  '    back-navigates out of the builder mid-build');
ok(/\.myteam-cockpit-navlabel\s*\{[^}]*font-size/.test(NAV_CSS.slice(NAV_CSS.indexOf('max-width: 640px'))),
  'strip: the chip contents were not tightened for the narrower chip, so "State Legislative" has\n' +
  '    to fit its desktop size into a phone-width tile');
ok(!/\.myteam-cockpit-navlabel\s*\{[^}]*white-space:\s*nowrap/.test(CSS),
  'strip: the chip label is pinned to one line, so a long office name is clipped rather than\n' +
  '    wrapped — a truncated "State Legisl…" is a label the voter has to guess at');

// ═════════════════════════════════════════════════════════════════════════════
// 4 · Touch targets, and the desktop sidebar that must not move
// ═════════════════════════════════════════════════════════════════════════════
// The first `.myteam-cockpit-navarrow { }` in the file is the display:none
// default it shares with the cue and the pager; the sizing rule is the one that
// declares a box.
const rulesFor = (sel) => (NAV_CSS.match(new RegExp('\\' + sel + '\\s*\\{[^}]*\\}', 'g')) || []);
const arrowRule = rulesFor('.myteam-cockpit-navarrow').filter((r) => /min-width/.test(r))[0];
must(!!arrowRule, 'app.css no longer gives .myteam-cockpit-navarrow a box');
ok(/min-width:\s*44px/.test(arrowRule) && /min-height:\s*44px/.test(arrowRule),
  'strip: a chevron is under the 44px touch floor the rest of this builder holds to');
const dotRule = rulesFor('.myteam-cockpit-navdot').filter((r) => /width/.test(r))[0];
must(!!dotRule, 'app.css no longer gives .myteam-cockpit-navdot a box');
ok(/width:\s*44px/.test(dotRule) && /height:\s*44px/.test(dotRule),
  'strip: the pager dots are 8px targets — the dot is the mark, the button around it has to be a\n' +
  '    thumb target');

// The affordances are off by default and only revealed by the measured class, so
// the desktop sidebar — where the nav is a vertical column that never overflows
// sideways — is untouched.
ok(/\.myteam-cockpit-navcue,\s*\.myteam-cockpit-navdots,\s*\.myteam-cockpit-navarrow\s*\{\s*display:\s*none/.test(NAV_CSS),
  'strip: the new chrome is not off by default, so it appears on the desktop sidebar where there\n' +
  '    is no horizontal scrolling for it to describe');
ok(/\.myteam-cockpit-navwrap\.is-scroll\s+\.myteam-cockpit-navarrow/.test(NAV_CSS),
  'strip: the chevrons are not gated on the measured .is-scroll class, so they can show over a\n' +
  '    strip that has nowhere to scroll');
// The sticky sidebar was on the nav; the nav is now wrapped, and a sticky element
// whose container is exactly its own height cannot travel.
ok(/\.myteam-cockpit-navwrap\s*\{[^}]*position:\s*sticky/.test(NAV_CSS),
  'strip: the wrapper is not sticky — wrapping the nav moved the grid item, and the desktop\n' +
  '    sidebar stops following the reader down the stage');
ok(!/\.myteam-cockpit-nav\s*\{[^}]*position:\s*sticky/.test(NAV_CSS),
  'strip: the nav still declares itself sticky inside a wrapper of its own height, which is a\n' +
  '    no-op that will read as the sidebar being broken');
ok(/\.myteam-cockpit-navwrap\s*\{\s*position:\s*static/.test(NAV_CSS.slice(NAV_CSS.indexOf('max-width: 880px'))),
  'strip: the wrapper stays sticky at phone widths, where the nav is a horizontal row above the\n' +
  '    stage and pinning it eats the screen');
has(HTML, '.myteam-cockpit-navarrow:focus-visible',
  'strip: the chevrons have no visible focus ring on the dark builder chrome');
has(HTML, '.myteam-cockpit-navdot:focus-visible',
  'strip: the pager dots have no visible focus ring');
has(HTML, '.myteam-cockpit-nav,\n    .myteam-slots-grid.is-grouped { scroll-behavior: auto !important; }',
  'strip: the category row is not covered by the reduced-motion fallback the other team strips have');
has(SRC, "prefers-reduced-motion",
  'strip: the chevrons animate the scroll unconditionally — a CSS scroll-behavior rule cannot\n' +
  '    override a scrollTo that asks for smooth explicitly, so the JS has to check');

// ═════════════════════════════════════════════════════════════════════════════
// 5 · Driven: the chevrons page, and die only at the ends
// ═════════════════════════════════════════════════════════════════════════════
const back = arrows[0], fwd = arrows[1];
nav.scrollLeft = 0;
W._myteamNavBoot();
ok(wrap._has('is-scroll'),
  'strip: a track wider than its window did not report itself as scrollable, so none of the\n' +
  '    affordances appear on the phone that needs them');
eq(back.disabled, true,
  'strip: at the left end the backward chevron is live, and pressing it does nothing visible');
eq(fwd.disabled, false,
  'strip: at the left end the forward chevron is dead, which is the one press that should work');

const before = nav.scrollLeft;
W._myteamNavPage(1);
ok(nav.scrollLeft > before,
  'strip: the forward chevron did not move the track at all — the arrows are inert');
ok(nav.scrollLeft <= nav.scrollWidth - nav.clientWidth,
  'strip: one press scrolled past the end of the track');
ok(nav.scrollLeft < nav.scrollWidth - nav.clientWidth,
  'strip: one press jumps the whole row, so a voter loses their place instead of stepping through');
eq(back.disabled, false,
  'strip: after paging forward the backward chevron is still dead, so there is no way back');

// All the way to the right.
for (let i = 0; i < 12; i++) W._myteamNavPage(1);
eq(Math.min(nav.scrollLeft, nav.scrollWidth - nav.clientWidth), nav.scrollWidth - nav.clientWidth,
  'strip: repeated presses never reach the last office group');
eq(fwd.disabled, true,
  'strip: at the right end the forward chevron still claims there is more to see');
eq(back.disabled, false,
  'strip: at the right end there is no way back to the first office group');

// And back.
for (let i = 0; i < 12; i++) W._myteamNavPage(-1);
ok(nav.scrollLeft <= 2, 'strip: paging backward does not return to the first office group');
eq(back.disabled, true, 'strip: the backward chevron stays live at the left end');

// A strip that fits needs no chrome at all — this is also the desktop case.
nav.scrollWidth = TRACK;
nav.scrollLeft = 0;
W._myteamNavBoot();
ok(!wrap._has('is-scroll'),
  'strip: a row that already fits still shows chevrons, a swipe cue and a pager — chrome promising\n' +
  '    a movement the strip cannot make');
ok(back.disabled && fwd.disabled,
  'strip: with nothing to scroll the chevrons are still live');
nav.scrollWidth = LEVELS.length * (CHIP_W + CHIP_GAP);
W._myteamNavBoot();

// ═════════════════════════════════════════════════════════════════════════════
// 6 · Driven: selection agrees across chips, panels and dots
// ═════════════════════════════════════════════════════════════════════════════
// Three surfaces now name the open office group. Two of them are new, and three
// surfaces that agree in the markup and drift on the first tap would be worse
// than the one surface this replaced.
nav.scrollLeft = 0;
W._myteamSelectLevel('local');
eq(ctx.window._myteamActiveLevel, 'local', 'strip: picking a group did not record it, so a repaint loses the voter\'s place');
eq(chips.filter((c) => c._has('is-active')).length, 1, 'strip: more than one chip claims to be open');
ok(chips[3]._has('is-active') && chips[3].getAttribute('aria-selected') === 'true',
  'strip: the picked chip is not the open one');
eq(panels.filter((p) => !p.hidden).length, 1, 'strip: the stage shows more than one office group at once');
ok(!panels[3].hidden && panels[0].hidden,
  'strip: picking Local did not put the Local seats on the stage — the add-to-team flow now opens\n' +
  '    the wrong group');
eq(dots.filter((d) => d._has('is-on')).length, 1, 'strip: the pager lights more than one dot after a pick');
ok(dots[3]._has('is-on') && dots[3].getAttribute('aria-current') === 'true',
  'strip: the pager and the chips disagree about which office group is open');
ok(nav.scrollLeft > 0,
  'strip: picking the last group left the strip parked on the first — the voter is looking at Local\n' +
  '    seats while the row still shows Federal highlighted off-screen');
ok(nav.scrollLeft <= chips[3].offsetLeft,
  'strip: revealing the picked chip scrolled past it');

// A dot is a second door into the same room; going back through it must move the
// strip back too.
W._myteamSelectLevel('federal');
ok(chips[0]._has('is-active') && dots[0]._has('is-on') && !panels[0].hidden,
  'strip: the pager cannot select — tapping a dot leaves the chips and the stage where they were');
ok(nav.scrollLeft <= 2,
  'strip: selecting the first office group did not bring its chip back into view');

// ═════════════════════════════════════════════════════════════════════════════
// 7 · Nothing about ballot building changed
// ═════════════════════════════════════════════════════════════════════════════
// Presentation only. The strip renderer is handed the chips already built and
// never computes a count, a pick or a seat; the counts stay where they were.
// Read the code, not the prose about it.
const SHELL_CODE = HUB.slice(shellFrom, shellTo).replace(/^\s*\/\/.*$/gm, '');
lacks(SHELL_CODE, 'filled',
  'strip: the shell renderer derives a seat count of its own — the badges are built by the level\n' +
  '    loop above it and there must be exactly one place that counts');
lacks(SHELL_CODE, '_getTeamBallotSelections',
  'strip: the shell renderer reads the voter\'s picks, which is not its job');
has(HUB, "badge = filled + '/' + x.items.length",
  'strip: the per-level "0/1" seat badge changed — the counts were meant to be untouched');
has(HUB, "'</span>' + c.filled + ' of ' + c.total + ' filled</span>'".slice(9),
  'strip: the panel head\'s "0 of 6 filled" count changed');
// One pick per office is enforced by the pick path, not the nav; the nav must not
// have grown a way to open two groups at once.
ok(/p\.hidden = !on;/.test(SRC),
  'strip: the level switcher stopped hiding the groups it is not showing');

// ═════════════════════════════════════════════════════════════════════════════
// Report
// ═════════════════════════════════════════════════════════════════════════════
if (failures.length) {
  console.error(`\n✗ team builder strip: ${failures.length} failure(s)`);
  failures.forEach((f) => console.error('  · ' + f));
  process.exit(1);
}
console.log(`✓ team builder strip: all ${passed} assertions passed — ~${divisor} groups at rest, arrows live at both ends`);
