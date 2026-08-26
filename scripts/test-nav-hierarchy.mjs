#!/usr/bin/env node
/**
 * test-nav-hierarchy.mjs — the chrome tells a stranger there are TWO doors.
 *
 * test-top-nav-layout.mjs answers "where does each control sit". test-top-nav-weight
 * answers "how loudly does it speak". This file answers the question that comes
 * before either: HOW MANY THINGS IS THIS, and does the bar's answer match the
 * product's?
 *
 * THE MENTAL MODEL, stated once so the assertions have something to be measured
 * against. There are two doors and a router:
 *
 *   DOOR 1 — inspect a person, a claim, an issue, a record. Truth and receipts.
 *   DOOR 2 — build my ballot choices. The workspace.
 *   SEARCH — not a door. A router into a person, a claim → receipt, an issue, a
 *            bill, or my people.
 *
 * And one thing that is neither: 🏛️ WHO REPRESENTS ME is the FRONT STEP into
 * Door 2, and a path into person files. A step, not a door.
 *
 * WHAT WAS WRONG. The desktop bar's left group carried six items — three pills
 * and three ballot text links — where three of the six (Voter Hub, Your Ballot,
 * Local Issues) are VIEWS of the same ballot workspace that ⭐ My Voting Team
 * already opens. door2-spine.js says so in the product itself: it paints a
 * "this is a view of that workspace" header onto each of them. Four top-level
 * slots for one workspace is how a two-door product reads as a ten-module one.
 * The front step, meanwhile, was painted at full door weight — filled, glowing,
 * indistinguishable from the two doors beside it — so the bar's own answer to
 * "how many things is this" was, at a glance, six.
 *
 * WHAT THIS FILE HOLDS:
 *
 *   1. The primary list, desktop: exactly three items, in one order, and the
 *      first of them is a step rather than a door.
 *   2. The secondary list: the demoted views are nested, reachable, and quiet.
 *   3. The drawer mirrors the same hierarchy, with the same primary three.
 *   4. No third door in COPY — in the chrome, and on the homepage.
 *   5. The bar did not become a sitemap: no new top-level pills, no new gateways.
 *   6. Phase 0 labels stand, and the homepage claims no completeness.
 *
 * Source-level only: no browser, no network.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('  ✗ ' + m); } };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const must = (c, m) => {
  if (c) return;
  console.error(`\n  ⚠ STALE TEST: ${m}\n    The source this file reasons about has moved. Re-read it before trusting a green run.\n`);
  process.exit(2);
};
const section = t => console.log(`\n  ── ${t}`);

/* Two readings of the same document, used deliberately:
     VISIBLE — comments and <style> stripped. Every claim about what a READER is
       told runs on this, because the reasoning in this codebase lives in comments
       and a "no third door" grep that a comment can satisfy tests the prose.
     HTML — raw. Used only for structure and for the two landmark comments that
       are supposed to survive. */
const VISIBLE = HTML.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ');

const navAt = HTML.indexOf('<nav id="pdx-topnav"');
must(navAt > 0, 'the top nav lost its id');
const NAV = HTML.slice(navAt, HTML.indexOf('</nav>', navAt));
const eyeAt = NAV.indexOf('pdx-eye-row');
must(eyeAt > 0, 'the Eye row is gone; the toolbar slice has no end');
const ROW = NAV.slice(0, eyeAt);
const drawerAt = NAV.indexOf('id="mobileMenu"');
must(drawerAt > 0, 'the mobile drawer is gone from the nav');
const DRAWER = NAV.slice(drawerAt);

/* The left group is the primary list. It ends at ✊ Mandate, which is the first
   control painted in the right-hand half — the same seam test-top-nav-layout.mjs
   measures the overlap across. */
const seamAt = ROW.indexOf('<a href="#agenda"');
must(seamAt > 0, 'the ✊ Mandate button is gone; the left-group slice has no end');
const LEFT = ROW.slice(0, seamAt);
/* #hero is the 🏠 brand lockup — a home link and the document's own logo, not an
   entry in the primary list. Excluded by name so the list below is the three
   things a reader is being asked to choose between. */
const isNavItem = href => href !== '#hero';

/* ═══════════════════════════════════════════════════════════════════════════
   1 · THE PRIMARY LIST — three items, one order, one of them a step
   ═══════════════════════════════════════════════════════════════════════════ */
section('1 · desktop primary: front step, Door 1, Door 2 — and nothing else');

const leftHrefs = [...LEFT.matchAll(/<a href="(#[\w-]+)"/g)].map(m => m[1]).filter(isNavItem);
eq(leftHrefs.join(' → '), '#who-represents-me → #say-vs-do → #my-politicians',
  'the left group is exactly the front step, then Door 1, then Door 2, in that order');

/* The ORDER is the argument, not decoration. The front step comes first because a
   stranger's first question is "who are my people", and it feeds Door 2. Door 1
   precedes Door 2 because the record is what a ballot choice is made OF. */
ok(leftHrefs.indexOf('#who-represents-me') === 0, 'the front step is read first');
ok(leftHrefs.indexOf('#say-vs-do') < leftHrefs.indexOf('#my-politicians'),
  'and the record comes before the ballot built out of it');

/* Rank, expressed as paint. Two doors are filled; the step is outlined. Asserted
   from both directions so "quieter" can never silently become "gone". */
const step = (LEFT.match(/<a href="#who-represents-me"[\s\S]*?<\/a>/) || [])[0] || '';
must(step, 'the front step is gone from the primary list');
ok(!/linear-gradient|box-shadow/.test(step), 'the front step wears no door paint — no fill, no glow');
ok(/border:1\.5px solid/.test(step) && /px-3 py-1\.5/.test(step),
  'but keeps a visible outline and full pill geometry — a step you can still see and hit');
for (const door of ['#say-vs-do', '#my-politicians']) {
  const d = (LEFT.match(new RegExp('<a href="' + door + '"[\\s\\S]*?</a>')) || [])[0] || '';
  must(d, `${door} is gone from the primary list`);
  ok(/linear-gradient/.test(d), `${door} is filled — it is a door`);
  ok(/box-shadow:0 0 16px/.test(d), `and glows at rest`);
}

/* ═══════════════════════════════════════════════════════════════════════════
   2 · THE SECONDARY LIST — nested, reachable, quiet
   ═══════════════════════════════════════════════════════════════════════════ */
section('2 · the Door 2 views are nested under Explore, not loose in the bar');

const DEMOTED = ['#voter-hub', '#your-ballot', '#local-issues'];
for (const href of DEMOTED) {
  ok(!LEFT.includes('href="' + href + '"'), `${href} is no longer a top-level item in the bar`);
}
const HD = '<div class="pdx-navmenu__hd">Your Vote · Door 2</div>';
const hdAt = ROW.indexOf(HD);
ok(hdAt > 0, 'they got a "Your Vote · Door 2" heading in the Explore panel to live under');
must(hdAt > 0, 'the Door 2 group heading is missing — the nesting assertions below cannot run');
const GROUP = ROW.slice(hdAt, ROW.indexOf('pdx-navmenu__sep', hdAt));
for (const href of DEMOTED) {
  const row = (GROUP.match(new RegExp('<a href="' + href + '"[\\s\\S]*?</a>')) || [])[0] || '';
  ok(!!row, `${href} is still reachable, as a row in that group`);
  ok(/pdx-navmenu__item/.test(row), `${href} is a menu item at menu rank`);
  ok(!/box-shadow|linear-gradient/.test(row), `${href} carries no door paint at its new rank`);
}
/* The heading is FIRST in the panel: a visitor who came for their ballot should
   not have to read past the archive to find it. */
const exploreHd = ROW.indexOf('<div class="pdx-navmenu__hd">Explore &amp; Discover</div>');
ok(exploreHd > hdAt, 'and the Door 2 group is listed ahead of the discovery rows');

/* The demoted rows must not have quietly become a fourth pill somewhere else. */
const PILL = 'font-condensed font-700 text-xs tracking-widest uppercase px-3 py-1.5 rounded-lg';
eq((ROW.match(new RegExp(PILL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length, 3,
  'the row still carries exactly three pill-weight controls');

/* ═══════════════════════════════════════════════════════════════════════════
   3 · THE DRAWER MIRRORS THE SAME HIERARCHY
   ═══════════════════════════════════════════════════════════════════════════ */
section('3 · the mobile drawer tells the same story, in the same order');

const labels = [...DRAWER.matchAll(/<div class="mnav-group-label">([^<]+)<\/div>/g)].map(m => m[1].trim());
ok(labels.length >= 2, `the drawer is grouped (${labels.length} headings)`);
ok(/Two Doors/i.test(labels[0]),
  `the drawer's FIRST heading names the two doors (got "${labels[0]}") — a phone reader meets the ` +
  'same model as a desktop reader');

/* The primary group: the same three, in the same order, ahead of everything else. */
const g1From = DRAWER.indexOf(`<div class="mnav-group-label">${labels[0]}</div>`);
const g1To = DRAWER.indexOf('<div class="mnav-group-label">', g1From + 10);
const G1 = DRAWER.slice(g1From, g1To);
const g1Hrefs = [...G1.matchAll(/<a href="(#[\w-]+)"/g)].map(m => m[1]);
eq(g1Hrefs.join(' → '), '#who-represents-me → #say-vs-do → #my-politicians',
  'the drawer\'s primary group is the same three rows in the same order as the bar');
eq(labels.filter(l => /Two Doors/i.test(l)).length, 1, 'and there is only one primary group');

/* The demoted views are in the drawer too, and below the primary group — the
   drawer has the vertical room the bar does not, so nesting there means ordering,
   not hiding. */
for (const href of DEMOTED) {
  const at = DRAWER.indexOf('href="' + href + '"');
  ok(at > 0, `${href} is still in the drawer`);
  ok(at > g1To, `${href} is below the primary group, not inside it`);
}
/* The drawer is not the sitemap either: the primary group is small. */
ok(g1Hrefs.length === 3, `the primary group is three rows, not a menu (${g1Hrefs.length})`);

/* ═══════════════════════════════════════════════════════════════════════════
   4 · NO THIRD DOOR, IN ANY COPY A READER SEES
   ═══════════════════════════════════════════════════════════════════════════ */
section('4 · no third door — and the front step never claims to be one');

for (const bad of [/three doors/i, /third door/i, /\bdoor 3\b/i,
                   /the record door/i, /the ballot door/i, /the lookup door/i]) {
  ok(!bad.test(VISIBLE), `no visible copy invents a third door (${bad})`);
}
/* Search is a router, not a door. */
for (const bad of [/search door/i, /door.{0,12}search/i]) {
  ok(!bad.test(VISIBLE), `search is not framed as a door (${bad})`);
}
/* The front step's own title attribute describes a lookup, not a destination. */
const stepTitle = (step.match(/title="([^"]*)"/) || [])[1] || '';
ok(stepTitle.length > 10, 'the front step explains itself on hover');
ok(!/\bdoor\b/i.test(stepTitle), 'and does not call itself a door');

/* The landmark comments that carry the rule are still there — this is the record
   of WHY the bar is shaped this way, and it must not be lost to a reflow. */
ok(/TWO DOORS, ONE FRONT STEP/.test(HTML),
  'the row\'s anchor comment still states the rule it is built on');
ok(/THREE PILLS/.test(HTML),
  'and still records that three pills were never three doors — the count that used to mislead');

/* ═══════════════════════════════════════════════════════════════════════════
   5 · THE BAR IS NOT A SITEMAP
   ═══════════════════════════════════════════════════════════════════════════ */
section('5 · no new top-level pills, no new gateways, nothing grew');

eq((ROW.match(/class="pdx-navmenu"/g) || []).length, 3, 'still three gateway menus, not four');
eq((ROW.match(/class="nav-link clr-voter/g) || []).length, 0,
  'no loose ballot text links left in the row');
eq((ROW.match(/nav-mandate-btn/g) || []).length, 1, 'still one Mandate button — Mandate stays a side lane');
/* Total count of top-level interactive things in the row, as a ceiling. Six: three
   pills, three gateway triggers. Plus Mandate, the bell and the account cluster,
   which are chrome rather than product surfaces and are counted separately above. */
const gateways = [...ROW.matchAll(/<a[^>]*class="pdx-navmenu__btn/g)].length;
eq(gateways, 3, 'three gateway triggers');
eq(leftHrefs.length + gateways, 6,
  'six top-level product entries in the bar, down from nine — and none of them added');

/* Finance and Mandate are side lanes: neither may appear in the primary list. */
for (const bad of ['#follow-the-money', '#mandate', '#peoples-mandate']) {
  ok(!LEFT.includes('href="' + bad + '"'), `${bad} is not in the primary list — it is a side lane`);
}

/* ═══════════════════════════════════════════════════════════════════════════
   6 · PHASE 0 LABELS, AND NO COMPLETENESS CLAIM ON THE HOMEPAGE
   ═══════════════════════════════════════════════════════════════════════════ */
section('6 · the labels stand, and the homepage promises nothing it cannot show');

ok(/👁️ Find the Record<\/a>/.test(HTML), 'Door 1 is still labelled "Find the Record"');
eq((HTML.match(/👁️ Find the Record<\/a>/g) || []).length, 2,
  'in both the bar and the drawer, and nowhere else');
ok(!/Check a Claim<\/a>/.test(VISIBLE),
  'the retired "Check a Claim" label — which named a verdict the eye does not deliver — stays retired');
ok(/⭐ My Voting Team/.test(VISIBLE), 'Door 2 is still labelled "My Voting Team"');

/* The hero is the first thing a stranger reads, and it may not promise coverage
   the record does not have. These are the exact shapes the welcome copy was
   corrected for; the homepage must not reintroduce them. */
const heroAt = HTML.indexOf('<section id="hero"');
must(heroAt > 0, 'the hero section is gone');
const HERO_VISIBLE = VISIBLE.slice(VISIBLE.indexOf('<section id="hero"'),
  VISIBLE.indexOf('</section>', VISIBLE.indexOf('<section id="hero"')))
  .replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
for (const bad of [
  /every politician[^.]{0,60}\b(gets?|has|earns?|receives?)\b/i,
  /all \d{2,} (members|politicians|lawmakers)/i,
  /\bcomplete\b[^.]{0,20}\brecord\b/i,
  /every (vote|bill|record) (ever|we|is) (tracked|covered)/i,
  /100% of/i,
  /\bfully? (tracked|covered|documented)\b/i,
]) {
  ok(!bad.test(HERO_VISIBLE), `the hero claims no completeness (${bad})`);
}
/* And it names no metric ahead of the record. */
for (const bad of [/Accountability Score/i, /Integrity Score/i, /Truth Score/i]) {
  ok(!bad.test(HERO_VISIBLE), `the hero invents no second score (${bad})`);
}

console.log('');
if (fail) {
  console.error(`✗ nav hierarchy: ${fail} of ${pass + fail} assertions failed\n`);
  process.exit(1);
}
console.log(`✓ nav hierarchy: all ${pass} assertions passed — two doors plus a front step, the Door 2 ` +
            `views nested, the drawer mirrors the bar, no third door in any copy\n`);
