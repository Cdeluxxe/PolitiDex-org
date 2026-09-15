/* ═══════════════════════════════════════════════════════════════════════════
   test-stance-shelves.mjs — the homepage stops rehearsing, the library opens
   as a desk
   ────────────────────────────────────────────────────────────────────────────
   Two surfaces trimmed in one pass, and both regressions are the quiet kind.

   THE HOMEPAGE. Four blocks on `/` were doing a job that already has an
   address. A "This Cycle in Utah" card carried ＋ Add to ballot, which is the
   ballot wall's verb on a page that is not the ballot. A second My Profile
   region painted "Loading your profile…" above the fold while /me — the real
   file — loaded the same store again. Issue Comparison and the Stance Library
   each opened with an eyebrow, a display title and a three-line lede selling a
   tool that is one tap away. None of that errors when it comes back; it just
   makes the homepage longer, and index.html sits under a byte pin with eight
   kilobytes of headroom, so "longer" is a countdown.

   THE LIBRARY. The browse view was every ISSUE_MAP key with a documented
   stance in one grid — a hundred-plus cards under three rails of filters. The
   fix is shelves: one chip row, a Hot shelf open, and one folded <details> per
   Core National Issue holding a heading, a count and four preview cards over
   "Show all N in this bundle". The flat list still exists behind "All issues".
   The two ways that silently rots are (a) the folds quietly stop folding and
   the wall is back, and (b) a shelf swallows a bundle, so keys that used to be
   browsable are only reachable by search.

   What is checked here, and NOT anywhere else:
     · #hot-topics carries no ＋ Add to ballot and no ballot-toggle call, while
       the View Candidates / Work My Ballot / Key Dates links still go where
       they went.
     · The homepage paints no second profile loader, and each retired block is
       one line pointing at the address that owns it.
     · index.html did not grow against HEAD. This pass was supposed to shrink.
     · Default paint is folded bundles with a preview each — strictly fewer
       cards than the vocabulary, not the full leaf list.
     · "All issues" still lists every key on record, and the shelves between
       them cover every one of those keys.
     · Every colour on the surface resolves through PDXIssueColors.styleFor —
       the same table the bills read. No second palette, no local hex.
     · Coverage, not a grade: no %, no match figure, no party or ideology sort.
     · CACHE_VERSION moved, so a warm device does not hold the old shell.

   Sections:
     1 · #hot-topics keeps its links and loses the ballot button
     2 · the homepage stops loading a second profile
     3 · the retired blocks are one line each, pointing at their address
     4 · index.html did not grow
     5 · the desk: one chip rail, folded bundles, a preview each
     6 · "All issues" still lists every key, and the shelves cover them
     7 · colour comes from the one table
     8 · coverage, never a grade
     9 · the shell ships
   ═══════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { ENGINE_FILES, makeSandbox } from './gen-hero-showcase.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg}\n    expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) => ok(String(hay).indexOf(needle) >= 0, `${msg} — "${needle}" missing`);
const lacks = (hay, needle, msg) => ok(String(hay).indexOf(needle) < 0, `${msg} — "${needle}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
// A probe whose target was renamed makes every assertion built on it vacuously
// true. That is a broken harness, not a passing contract — exit loudly.
const must = (cond, msg) => {
  if (cond) { passed++; return; }
  console.error(`\n✗ stance-shelves: STALE HARNESS — ${msg}\n`);
  process.exit(2);
};

const INDEX = read('index.html');
const LIB = read('stance-library.js');
const LIBCSS = read('stance-library.css');
const count = (hay, re) => (String(hay).match(re) || []).length;

// ═════════════════════════════════════════════════════════════════════════════
section('1 · #hot-topics keeps its links and loses the ballot button');
// ═════════════════════════════════════════════════════════════════════════════
// The section is sliced off the real file rather than searched for globally:
// "Add to ballot" is a legitimate string in the ballot wall, the compare hub and
// the profile modal, and a test that forbids it everywhere forbids the feature.
const HT_START = INDEX.indexOf('<section id="hot-topics"');
must(HT_START >= 0, '#hot-topics is gone from index.html — sections 1 has nothing to read');
const HT_END = INDEX.indexOf('\n  </section>', HT_START);
must(HT_END > HT_START, '#hot-topics has no closing tag at its own indentation — the slice is unbounded');
const HOT = INDEX.slice(HT_START, HT_END);
must(HOT.indexOf('This Cycle in Utah') >= 0, 'the "This Cycle in Utah" cards are not inside the #hot-topics slice');
must(HOT.length < 200 * 1024, `the #hot-topics slice ran to ${HOT.length} bytes — it swallowed the page`);

lacks(HOT, 'Add to ballot', '#hot-topics: the ballot verb belongs to /ballot, not to a topic card');
lacks(HOT, 'mypolToggleAnimated', '#hot-topics: no card may toggle a ballot pick from the homepage');
ok(!/Add\s+to\s+ballot/i.test(HOT), '#hot-topics: no spaced or cased variant of the ballot button survived');
ok(!/<button[^>]*class="ht-topic-btn/.test(HOT),
  '#hot-topics: every topic action is a link to an address now, not a button that mutates state');

// The three cards keep the destinations the brief said to keep.
const htActions = HOT.match(/<a class="ht-topic-btn[^"]*" href="([^"]+)"[^>]*>([^<]*)</g) || [];
must(htActions.length >= 4, `only ${htActions.length} topic links left in #hot-topics — the cards were gutted, not trimmed`);
has(HOT, 'href="#voter-hub">⚡ View Candidates', '#hot-topics: the data-center card still opens the field');
has(HOT, 'href="#voter-hub">🏔️ View Candidates', '#hot-topics: the public-lands card still opens the field');
has(HOT, 'href="/ballot">⭐ Work My Ballot', '#hot-topics: the 2026 card still hands off to /ballot');
has(HOT, 'href="#key-dates">📅 Key Dates', '#hot-topics: the 2026 card still links the calendar');
const htHrefs = [...HOT.matchAll(/class="ht-topic-btn[^"]*" href="([^"]+)"/g)].map((m) => m[1]);
ok(htHrefs.length > 0 && htHrefs.every((h) => h === '/ballot' || h.startsWith('#') || h.startsWith('/issue/')),
  `#hot-topics: a topic action points somewhere new (${htHrefs.join(', ')}) — these go to /ballot or an issue, nowhere invented`);

// ═════════════════════════════════════════════════════════════════════════════
section('2 · the homepage stops loading a second profile');
// ═════════════════════════════════════════════════════════════════════════════
// Asserted on the RAW file, not a comment-stripped view: a comment explaining
// what was removed must not quote the string it removed, or a warm reader's
// grep — and the next person auditing this — finds the loader still there.
lacks(INDEX, 'Loading your profile', 'index.html: the second profile loader is gone, comments included');
ok(!/Loading\s+your\s+profile/i.test(INDEX), 'index.html: no cased or spaced variant of the profile loader survived');
lacks(INDEX, 'id="my-profile"', 'index.html: the #my-profile region is gone — that file lives at /me');
lacks(INDEX, 'id="mp-body"', 'index.html: the profile mount point is gone with its region');
// The prose that replaced the band names the engine, which is the point of a
// comment; what must be gone is the tag that boots it.
lacks(INDEX, 'src="/my-profile.js"', 'index.html: the homepage no longer boots the profile engine');
lacks(INDEX, 'href="/my-profile.css"', 'index.html: the homepage no longer ships the profile stylesheet');
ok(!/<script[^>]*my-profile\.js/.test(INDEX), 'index.html: no script tag of any shape still loads the profile engine');
ok(!/<link[^>]*my-profile\.css/.test(INDEX), 'index.html: no link tag of any shape still loads the profile stylesheet');
lacks(INDEX, '#my-profile', 'index.html: no nav rail or drawer row still points at the retired region');
// The engine itself stays in the tree — five other suites read it off disk, and
// /me is its real home. Unlinked from `/` is the change; deleted is not.
ok(fs.existsSync(path.join(ROOT, 'my-profile.js')), 'my-profile.js still exists — it was unlinked from /, not deleted');
ok(fs.existsSync(path.join(ROOT, 'my-profile.css')), 'my-profile.css still exists — it was unlinked from /, not deleted');

// ═════════════════════════════════════════════════════════════════════════════
section('3 · the retired blocks are one line each, pointing at their address');
// ═════════════════════════════════════════════════════════════════════════════
const MS_START = INDEX.indexOf('<section id="my-stances"');
must(MS_START >= 0, '#my-stances is gone — the door to /me has nothing to check');
const MS = INDEX.slice(MS_START, INDEX.indexOf('<template', MS_START));
has(MS, 'href="/me"', '#my-stances: the door still names the address that owns the file');
has(MS, 'Your file', '#my-stances: the door reads as one line, not an eyebrow over a title');
lacks(MS, 'ms-eyebrow', '#my-stances: the marketing eyebrow is gone');
ok(count(MS, /<h2/g) === 1, '#my-stances: one heading in the door, not a stacked billboard');

const SL_START = INDEX.indexOf('<section id="stance-library"');
must(SL_START >= 0, '#stance-library is gone from the homepage — the module has no mount');
const SL = INDEX.slice(SL_START, INDEX.indexOf('</section>', SL_START));
has(SL, 'Browse issues', '#stance-library: the line says what the tool does');
// THE LINE IS A DOOR TO ANOTHER DOCUMENT NOW, NOT A MOUNT. When this section was
// trimmed to one line it still hosted the module: #sl-body was here and
// PDXStanceLibrary rendered into it. The seventh split moved the shelf to its own
// address, so the homepage ships neither the body host nor the engine — which is
// the whole saving — and the line is a real anchor instead of a call.
has(SL, 'href="/stances"', '#stance-library: the line is a real anchor to the room that owns the shelf');
lacks(SL, 'PDXStanceLibrary', '#stance-library: no engine call — the module is not on this document');
lacks(SL, 'id="sl-body"', '#stance-library: no body host either, or a cached engine would paint into it');
lacks(SL, 'sl-eyebrow', '#stance-library: the marketing eyebrow is gone');
lacks(SL, 'sl-lede', '#stance-library: the three-line lede is gone');
lacks(SL, 'Loading issue data', '#stance-library: the static loading line is gone — the module paints its own');
// Measured on the MARKUP, not on the self-contained stylesheet beside it:
// stance-library.css left with the grid it dressed, so the door's own five rules
// are inline here and they are cheaper than the 6 KB file they replaced.
const SL_MARKUP = SL.replace(/<style[\s\S]*?<\/style>/g, '');
ok(SL_MARKUP.length < 900,
  `#stance-library's markup on the homepage is ${SL_MARKUP.length} bytes — it is supposed to be one line`);
ok(count(SL, /<h2/g) === 1, '#stance-library: one heading in the door, not a stacked billboard');

const IC_START = INDEX.indexOf('<section id="issue-compare"');
must(IC_START >= 0, '#issue-compare is gone from the homepage — the module has no mount');
const ICS = INDEX.slice(IC_START, INDEX.indexOf('</section>', IC_START));
has(ICS, 'id="ic-body"', '#issue-compare: the module still has the body it renders into');
lacks(ICS, 'ic-eyebrow', '#issue-compare: the marketing eyebrow is gone');
lacks(ICS, 'ic-lede', '#issue-compare: the lede is gone');
lacks(ICS, 'ic-status', '#issue-compare: the static status line is gone');
ok(ICS.length < 400, `#issue-compare on the homepage is ${ICS.length} bytes — it is supposed to be a mount, not a pitch`);
// An empty band must not hold open three rems of nothing. The frame is gated on
// the body having content, and an engine without :has() gets the collapsed state
// — which is what the homepage wants anyway.
const ICCSS = read('issue-compare.css');
has(ICCSS, '#issue-compare:has(#ic-body:not(:empty))',
  'issue-compare.css: the band only takes padding once the module has rendered something');

// ═════════════════════════════════════════════════════════════════════════════
section('4 · index.html did not grow');
// ═════════════════════════════════════════════════════════════════════════════
// The pin in test-spotlight-shell allows 8 KB of drift for an ordinary copy
// change. This pass was a trim, so the bar here is stricter: not one byte up.
let headIdx = null;
try {
  headIdx = execFileSync('git', ['show', 'HEAD:index.html'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
} catch (e) { headIdx = null; }
if (headIdx) {
  const now = Buffer.byteLength(INDEX);
  const before = Buffer.byteLength(headIdx);
  ok(now <= before,
    `index.html grew: ${(before / 1024).toFixed(1)} → ${(now / 1024).toFixed(1)} KB. A trim pass must net-shrink the homepage.`);
  console.log(`      index.html: ${(before / 1024).toFixed(1)} → ${(now / 1024).toFixed(1)} KB ` +
    `(${now <= before ? '−' : '+'}${(Math.abs(before - now) / 1024).toFixed(1)} KB)`);
} else {
  console.log('      (vs HEAD skipped — git show unavailable)');
}

// ═════════════════════════════════════════════════════════════════════════════
// The desk, rendered
// ═════════════════════════════════════════════════════════════════════════════
// The module is booted headlessly and asked to paint its default view into a
// DOM stub, so the sections below read the markup a first-time reader gets
// rather than the source that is supposed to produce it.
function boot() {
  const win = makeSandbox();
  const nodes = {};
  for (const id of ['stance-library', 'sl-body', 'sl-results', 'sl-toolbar', 'sl-search']) {
    nodes[id] = { id, innerHTML: '', style: {}, addEventListener() {}, querySelectorAll: () => [], scrollIntoView() {} };
  }
  win.document.getElementById = (id) => nodes[id] || null;
  win.document.querySelector = () => null;
  win.document.querySelectorAll = () => [];
  const ctx = vm.createContext(win);
  for (const f of [...ENGINE_FILES, 'issue-map.js', 'issue-colors.js', 'stance-library.js']) {
    vm.runInContext(read(f), ctx, { filename: f });
  }
  return { win, nodes };
}

const { win, nodes } = boot();
must(win.PDXStanceLibrary && typeof win.PDXStanceLibrary.open === 'function',
  'PDXStanceLibrary.open() is unavailable after loading the module — nothing below is rendering anything');
must(typeof win.PDXStanceLibrary._view === 'function',
  'PDXStanceLibrary._view() is gone — the desk cannot be inspected without a browser');
must(win.PDXIssueColors && typeof win.PDXIssueColors.styleFor === 'function',
  'PDXIssueColors.styleFor is unavailable — the colour section would pass vacuously');

win.PDXStanceLibrary.open();
const TOOLBAR = nodes['sl-body'].innerHTML;
const PAINT = nodes['sl-results'].innerHTML;
must(PAINT.length > 2000, `the default view rendered ${PAINT.length} bytes — the module did not paint`);
const VIEW = win.PDXStanceLibrary._view();
must(VIEW && Array.isArray(VIEW.shelves) && Array.isArray(VIEW.all), '_view() returned no lists to compare');

// ═════════════════════════════════════════════════════════════════════════════
section('5 · the desk: one chip rail, folded bundles, a preview each');
// ═════════════════════════════════════════════════════════════════════════════
eq(VIEW.defaultKind, 'shelf', 'the library lands on the shelves, not on a filter');
eq(count(TOOLBAR, /class="sl-chips"/g), 1, 'one chip rail above the shelves, not three labelled groups');
lacks(TOOLBAR, 'sl-fgroup', 'the three-rail filter scaffolding is gone');
has(TOOLBAR, 'id="sl-search"', 'the search box stayed');
has(TOOLBAR, 'sl-chip--core', 'the rail carries the core bundles');
has(TOOLBAR, 'sl-chip--hot', 'the rail carries Hot');
has(TOOLBAR, 'All issues', 'the rail still offers the flat list as a choice');
const CORE = win.CORE_NATIONAL_ISSUES;
must(Array.isArray(CORE) && CORE.length > 10, 'CORE_NATIONAL_ISSUES did not load — the bundle rail cannot be checked');
const chipKeys = [...TOOLBAR.matchAll(/data-fkind="core" data-fkey="([^"]+)"/g)].map((m) => m[1]);
eq(chipKeys.length, CORE.length, 'every core bundle has a chip, and nothing extra does');
ok(CORE.every((c) => chipKeys.indexOf(c.key) >= 0), 'a core bundle is missing from the chip rail');

// Folded bundles present, and strictly fewer cards than the vocabulary.
const details = count(PAINT, /<details class="sl-shelf"/g);
const opened = count(PAINT, /<details class="sl-shelf"[^>]*\sopen/g);
ok(details >= CORE.length, `only ${details} shelves on first paint — expected at least one per core bundle (${CORE.length})`);
ok(details - opened > 0, 'every shelf painted open — the desk is the wall again with extra chrome');
eq(opened, 1, 'exactly one shelf starts open (Hot), so the reader sees the shape without scrolling the rest');
const cards = count(PAINT, /class="sl-card"/g);
ok(cards < VIEW.all.length,
  `first paint drew ${cards} cards against a ${VIEW.all.length}-key vocabulary — the default view is still the full leaf list`);
console.log(`      first paint: ${cards} cards in ${details} shelves (${opened} open) vs ${VIEW.all.length} keys on record`);
// Four preview cards per bundle, per the brief — read off the module, not guessed.
eq(VIEW.preview, 4, 'a shelf previews four cards');
ok(VIEW.shelves.every((s) => s.previewKeys.length <= VIEW.preview),
  'a shelf previewed more than four cards');
ok(VIEW.shelves.every((s) => s.previewKeys.length === Math.min(VIEW.preview, s.keys.length)),
  'a shelf previewed fewer cards than it has room for');
// And the way into the rest of a bundle is the button, not a new page.
const moreBtns = count(PAINT, /data-sl-more="/g);
ok(moreBtns > 0, 'no "Show all N in this bundle" control — a deep bundle dead-ends at four cards');
ok(/Show all \d+ in this bundle/.test(PAINT), 'the expand control does not name how many it reveals');
has(LIB, 'data-sl-more', 'stance-library.js: the expand control is wired');
eq(moreBtns, VIEW.shelves.filter((s) => s.keys.length > VIEW.preview).length,
  'every shelf with hidden issues offers to show them, and no shelf offers to show nothing');
// A search answers flat across everything, so a typed query is never trapped
// behind a fold.
has(LIB, "state.fkind === 'shelf' && !state.query", 'stance-library.js: a query falls through the shelves to the flat list');

// ═════════════════════════════════════════════════════════════════════════════
section('6 · "All issues" still lists every key, and the shelves cover them');
// ═════════════════════════════════════════════════════════════════════════════
const MAP = win.ISSUE_MAP;
must(MAP && Object.keys(MAP).length > 50, 'ISSUE_MAP did not load — the vocabulary check is vacuous');
const onRecord = VIEW.all;
ok(onRecord.length > 100, `only ${onRecord.length} issues on record — the all-issues path lost most of the vocabulary`);
ok(onRecord.every((k) => !!MAP[k]), 'the all-issues list contains a key that is not in ISSUE_MAP — an issue key was invented');
// Every key the flat list shows must be reachable by opening a bundle, or the
// shelves have quietly hidden part of the library behind the search box.
const shelved = new Set();
for (const s of VIEW.shelves) { if (s.kind !== 'hot') s.keys.forEach((k) => shelved.add(k)); }
const orphans = onRecord.filter((k) => !shelved.has(k));
eq(orphans.length, 0, `issues on record that no shelf holds: ${orphans.slice(0, 8).join(', ')}`);
// Rendered, not just reported: flipping to All issues draws one card per key.
const before = nodes['sl-results'].innerHTML;
has(TOOLBAR, 'data-fkind="all"', 'the All issues chip carries the hook its handler reads');
has(TOOLBAR, 'data-fkind="shelf"', 'the Shelves chip carries the hook that brings the desk back');
must(before === PAINT, 'the default paint was mutated before the all-issues check');
has(LIB, "state.fkind === 'all' || state.fkind === 'shelf'", 'stance-library.js: the shelf view filters nothing out');
ok(/function allIssueRows/.test(LIB) && /function visibleIssues/.test(LIB),
  'stance-library.js: the shelves and the flat list are built from one base list');

// ═════════════════════════════════════════════════════════════════════════════
section('7 · colour comes from the one table');
// ═════════════════════════════════════════════════════════════════════════════
const IC = win.PDXIssueColors;
const cardStyles = [...PAINT.matchAll(/class="sl-card" data-issue="([^"]+)" style="([^"]*)"/g)];
must(cardStyles.length > 10, `only ${cardStyles.length} coloured cards on first paint — the colour check is vacuous`);
const wrongCard = cardStyles.filter(([, key, style]) => style !== IC.styleFor(key));
eq(wrongCard.length, 0,
  `a card rail wrote its own colour instead of asking the table: ${wrongCard.slice(0, 3).map((m) => m[1]).join(', ')}`);
const shelfStyles = [...PAINT.matchAll(/<details class="sl-shelf" data-sl-shelf="([^"]+)"[^>]*style="([^"]*)"/g)];
must(shelfStyles.length > 5, `only ${shelfStyles.length} coloured shelves — the bundle colour check is vacuous`);
const wrongShelf = shelfStyles.filter(([, key, style]) => style !== IC.styleFor(key));
eq(wrongShelf.length, 0,
  `a bundle painted a colour the table does not publish: ${wrongShelf.slice(0, 3).map((m) => m[1]).join(', ')}`);
// Rollup leaves must resolve through the same road the bills take, not a local
// lookup that happens to agree today.
has(LIB, 'PDXIssueColors', 'stance-library.js: the module reads the published table');
has(LIB, 'styleFor', 'stance-library.js: it asks for the custom properties rather than composing hex');
ok(!/#[0-9a-fA-F]{6}/.test(PAINT.replace(/--pdx-ic[^;"]*/g, '')),
  'the rendered desk contains a literal hex that did not come from the colour table');
// The shelf chrome reads the properties instead of hard-coding a second palette.
has(LIBCSS, 'var(--pdx-ic', 'stance-library.css: the shelf takes its rail colour from the issue property');
has(LIBCSS, '.sl-shelf', 'stance-library.css: the shelves have styling of their own');
has(LIBCSS, '.sl-shelf-more', 'stance-library.css: the expand control is styled as a control');

// ═════════════════════════════════════════════════════════════════════════════
section('8 · coverage, never a grade');
// ═════════════════════════════════════════════════════════════════════════════
ok(/on record/.test(PAINT), 'the counts no longer read as coverage');
ok(!/%/.test(PAINT), 'a percentage appeared on the desk — every count here is coverage, not a score');
ok(!/\bmatch\b/i.test(PAINT), 'the desk shows a match figure');
// The note at the top of the desk says the counts are "not a grade", so the
// grading check reads the shelves and cards rather than the sentence about them.
const NOTED = PAINT.replace(/<div class="sl-shelf-note">[\s\S]*?<\/div>/, '');
must(NOTED.length < PAINT.length, 'the coverage note is missing from the desk — the reader is not told what the counts are');
ok(!/\bgrade\b|\bscore[ds]?\b|\brank(ed|ing)?\b/i.test(NOTED), 'the desk grades, scores or ranks something');
ok(!/\b(Republican|Democrat|Democratic|GOP|conservative|liberal|progressive)\b/i.test(PAINT),
  'the browse desk labels issues by party or ideology — it sorts by coverage only');
// The sort is coverage then title, in the source, with nothing else in the
// comparator.
const cmp = LIB.match(/function allIssueRows\(\)[\s\S]*?\n  \}/);
must(!!cmp, 'allIssueRows() could not be read — the sort cannot be checked');
has(cmp[0], 'agg.total', 'allIssueRows(): the sort key is how many people are on record');
has(cmp[0], 'localeCompare', 'allIssueRows(): ties break on the title');
ok(!/party|lean|ideolog|match|score/i.test(cmp[0]), 'allIssueRows(): something other than coverage entered the sort');
// Card taps go where they always went, and the grid holds issues only.
has(LIB, 'data-issue', 'stance-library.js: a card still identifies its issue for the existing detail view');
ok(!/district-voice|DistrictVoice/i.test(PAINT), 'District Voice mounted inside the issue grid');
ok(!/class="sl-pol-/.test(PAINT), 'a person file rendered inside the browse grid — those live in the detail view');

// ═════════════════════════════════════════════════════════════════════════════
section('9 · the shell ships');
// ═════════════════════════════════════════════════════════════════════════════
const SW = read('sw.js');
const nowV = Number((SW.match(/const CACHE_VERSION = 'v(\d+)'/) || [])[1] || 0);
must(nowV > 0, 'CACHE_VERSION could not be read from sw.js');
let headV = 0;
try {
  const headSw = execFileSync('git', ['show', 'HEAD:sw.js'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  headV = Number((headSw.match(/const CACHE_VERSION = 'v(\d+)'/) || [])[1] || 0);
} catch (e) { headV = 0; }
ok(nowV > headV,
  `CACHE_VERSION must move past HEAD's (${nowV} vs ${headV}) — a warm device would keep the old homepage and the old library`);
has(SW, '/stance-library.js', 'sw.js: the library module is still precached with the shell');
ok(fs.existsSync(path.join(ROOT, 'stance-library.css')), 'stance-library.css exists');
has(INDEX, 'stance-library.js', 'index.html: the homepage still loads the library module');

// ═════════════════════════════════════════════════════════════════════════════
if (failures.length) {
  console.error(`\n✗ stance-shelves: ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error('  • ' + f));
  process.exit(1);
}
console.log(`\n✓ stance-shelves: ${passed} assertions passed`);
