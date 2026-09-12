/* ═══════════════════════════════════════════════════════════════════════════
   test-account-chip-cost.mjs — the account chip opens in the frame it was clicked
   ────────────────────────────────────────────────────────────────────────────
   WHAT WAS REPORTED

   Signed in, on a desktop: click the top-right profile chip ("My Account") and
   Chrome's "Page Unresponsive" dialog appears with the account dropdown still
   open. Opening Your File or My Views from that same menu felt like the same
   family of freeze.

   WHAT THE DROPDOWN IS NOT. It is not a JS menu. updateNavAuth prints markup
   whose dropdown is shown by `group-hover` — pure CSS — so there is no open
   handler to make faster and no frame of ours to win back. Everything the
   reader was waiting on was bookkeeping that happened to land under the open
   menu, and four things were paying for it:

     1. THE ACCOUNT PULL WAS FIVE READS IN A CHAIN. users/{uid} → its votes →
        its comments → userTeams/{uid} → userTeams/{uid}/teams/{main}, each
        waiting on the previous round trip although only the last two are
        genuinely ordered, every landing repainting the world, and several of
        them asking the alignment engine for its sixteen-wide pass — so one
        sign-in rebuilt the homepage grids once per read.

     2. THE LOCATION RESTORE FANNED OUT NINE FUNCTIONS SYNCHRONOUSLY, five of
        which rebuild a whole grid (#relevant-browse-grid is a tree of every
        race the reader can vote in), on a pull that on a returning device
        usually restores the area already on screen.

     3. THE FIRST INTERACTION OF THE VISIT STILL PAID FOR TWO MEGABYTES IN ONE
        TASK. The previous pass moved the bulk data injection off the gesture
        into an idle callback, which kept the tapped control's frame — and then
        handed the browser all three bundles as a single unit a beat later. On a
        signed-in desktop that first interaction is very often the click that
        opens this dropdown. (The split itself is asserted in
        test-chrome-gesture-cost.mjs §1; what is asserted here is the fan-out
        that used to hang off the arrival.)

     4. THE ARRIVAL REBUILT TWO WHOLE SURFACES. pdx:data:cmpDetail called
        myteamBrowseFilter(), whose tail calls renderRelevantToMe() — the roster
        grid and the relevant-to-me tree, in the event's own task.

   AND updateNavAuth REPAINTED THE CHIP FOR SESSIONS THAT CHANGED NOTHING.
   Firebase re-announces the same session several times per visit; each one
   re-parsed and re-inserted two large templates, throwing away the very markup
   that holds the :hover the dropdown is drawn by.

   THE RULES THIS FILE HOLDS
     1. updateNavAuth paints the chip. No Firestore read, no grid, no fan-out.
     2. The pull runs its reads together and its repaints one idle slice later,
        under one paint hold, and only repaints the location surfaces when the
        restored area actually differs.
     3. Your File and My Views each take the engine's paint hold for the whole of
        their opening, and neither runs the homepage fan-out.
     4. A bundle arriving is not a reader narrowing a list: it repaints the
        roster, not the relevant tree, and not in the event's own task.
     5. The hamburger is a class toggle against a CSS cap — no measurement.

     node scripts/test-account-chip-cost.mjs
   ═══════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const must = (cond, msg) => {
  if (cond) { passed++; return; }
  console.error(`\n✗ account-chip-cost: STALE HARNESS — ${msg}\n`);
  process.exit(2);
};
const section = (t) => console.log('   ── ' + t);

const HUB = read('compare-hub.js');
const YF = read('your-file.js');
const MS = read('my-stances.js');
const HTML = read('index.html');

// Brace-balanced source of a named function declaration.
const fnSrc = (src, name) => {
  const i = src.indexOf(`function ${name}(`);
  if (i < 0) return '';
  let depth = 0, started = false;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') { depth++; started = true; }
    else if (src[j] === '}') { depth--; if (started && depth === 0) return src.slice(i, j + 1); }
  }
  return '';
};
// Source of an object-literal method, `name: function () { … }`.
const methodSrc = (src, name) => {
  const i = src.indexOf(`${name}: function`);
  if (i < 0) return '';
  let depth = 0, started = false;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') { depth++; started = true; }
    else if (src[j] === '}') { depth--; if (started && depth === 0) return src.slice(i, j + 1); }
  }
  return '';
};

// ═════════════════════════════════════════════════════════════════════════════
section('1 · updateNavAuth paints the chip, and that is the whole job');
// ═════════════════════════════════════════════════════════════════════════════
const NAV = fnSrc(HUB, 'updateNavAuth');
must(NAV, 'updateNavAuth is gone from compare-hub.js');

// The reported behaviour, stated as the rule: the function that runs when the
// account state resolves may replace the chip's label and photo and nothing
// else. renderRelevantToMe is the tree of every race the reader can vote in;
// a name arriving in the bar is not news about anybody's record.
ok(!/renderRelevantToMe/.test(NAV),
  'updateNavAuth names renderRelevantToMe. Painting the account chip may not rebuild #relevant-browse-grid — ' +
  'that is a whole-surface repaint hung off an auth event the reader cannot see');
ok(!/_alignRefreshAll|alignRefreshSoon/.test(NAV),
  'updateNavAuth asks the alignment engine for a refresh. That pass is sixteen calls wide and several of them ' +
  'rebuild a grid; the chip is not one of them');
ok(!/myteamBrowseFilter|updateRacesAndPositions|pmFilterLocation|_vhBallotRerender/.test(NAV),
  'updateNavAuth runs part of the homepage location fan-out');
ok(!/db\.collection|\.get\(\)|firestore/i.test(NAV),
  'updateNavAuth reads Firestore. The chip is drawn from the auth user object already in hand; the pull is a ' +
  'separate lane that owns its own repaints');
ok(!/localStorage\.setItem/.test(NAV),
  'updateNavAuth now writes storage — painting a chip is not a state change');

// The signature guard: the same session, announced twice, paints once.
ok(/data-pdx-nav-sig/.test(NAV) && /_navAuthSig/.test(NAV),
  'updateNavAuth has no signature guard, so every re-announcement of the same session re-parses and ' +
  're-inserts both chip templates — and throws away the markup holding the dropdown\'s :hover');
ok(/if \(sig === _navAuthSig[^)]*\) return;/.test(NAV),
  'the signature guard never returns early, so it costs a comparison and saves nothing');
ok(/user\.photoURL/.test(NAV) && /displayName/.test(NAV),
  'the chip no longer prints the member\'s photo and name — the guard was meant to skip redundant paints, ' +
  'not the paint itself');
ok(/nav-auth-desktop/.test(NAV) && /nav-auth-mobile/.test(NAV),
  'updateNavAuth no longer paints both the desktop chip and the mobile sheet slot');

// The dropdown is CSS. If that ever changes, this file's premise changes with it.
ok(/group-hover/.test(NAV),
  'the account dropdown is no longer shown by group-hover. It was pure CSS on purpose: a menu with no open ' +
  'handler cannot be slow to open, and any JS open path has to be measured again');

// ═════════════════════════════════════════════════════════════════════════════
section('2 · the account pull reads in parallel and repaints on idle, once');
// ═════════════════════════════════════════════════════════════════════════════
const SYNC = fnSrc(HUB, 'syncUserDataFromFirestore');
must(SYNC, 'syncUserDataFromFirestore is gone from compare-hub.js');

// All four reads issued before any of them is awaited: the marker is that the
// three independent ones are assigned, not nested inside the first's callback.
ok(/var userRead = /.test(SYNC) && /var votesRead = /.test(SYNC) &&
   /var commentsRead = /.test(SYNC) && /var teamsRead = /.test(SYNC),
  'the four account reads are no longer issued together. Chaining them serialises five round trips, each one a ' +
  'chance to land in the middle of the reader\'s next gesture');
const beforeFirstThen = SYNC.slice(0, SYNC.indexOf('.then('));
ok(/votesRead/.test(beforeFirstThen) && /commentsRead/.test(beforeFirstThen) && /teamsRead/.test(beforeFirstThen),
  'a read is issued only after another has resolved, so the pull is serial again');

// One hold for the whole pull, released exactly once when the last lane settles.
ok(/_syncHold\(true\)/.test(SYNC) && /_syncHold\(false\)/.test(SYNC),
  'the pull no longer takes the alignment engine\'s paint hold, so four landings repaint the homepage four times');
ok(/function laneOut/.test(SYNC) && /_released/.test(SYNC),
  'nothing counts the lanes, so the hold is released before the last read has landed (or more than once, which ' +
  'would release a hold belonging to an open panel)');
const holdFn = fnSrc(HUB, '_syncHold');
must(holdFn, '_syncHold is gone');
ok(/alignRefreshHold/.test(holdFn),
  '_syncHold no longer routes through alignRefreshHold — the counter has to live in the engine so the Your File ' +
  'and My Views holds can nest with this one');

// Every repaint one slice later than the read that asked for it.
const idleFn = fnSrc(HUB, '_syncIdle');
must(idleFn, '_syncIdle is gone');
ok(/requestIdleCallback/.test(idleFn) && /timeout:/.test(idleFn) && /setTimeout/.test(idleFn),
  '_syncIdle does not schedule with a timeout and a fallback, so a repaint can either land in the read\'s own ' +
  'task or be starved forever on a busy main thread');
ok((SYNC.match(/_syncIdle\(/g) || []).length >= 4,
  'the pull\'s repaints are not deferred: fewer than four of its landings hand their UI work to an idle slice');

// The location restore: light lines now, grids later, and only on a real change.
ok(/_prevLoc !== _nextLoc/.test(SYNC),
  'the location fan-out runs unconditionally again. On a returning device the pull restores the area already on ' +
  'screen, and rebuilding five grids to redraw the same thing is the freeze this pass is about');
const fanout = (SYNC.match(/_syncIdle\(function\(\) \{\s*_syncHold\(true\);[\s\S]*?\}\);/) || [''])[0];
must(fanout.length > 60, 'the deferred location fan-out probe matched nothing');
ok(/renderRelevantToMe/.test(fanout) && /myteamBrowseFilter/.test(fanout) && /updateRacesAndPositions/.test(fanout),
  'the heavy half of the location restore is no longer in the deferred, held block — a restored location still ' +
  'has to re-rank every one of those surfaces, just not inside the promise callback');
const syncHead = SYNC.slice(0, SYNC.indexOf('_prevLoc !== _nextLoc') + 1);
ok(!/^\s*(window\.)?renderRelevantToMe\(\);/m.test(syncHead),
  'the pull calls renderRelevantToMe straight from a read callback again');
ok(/updateRelevantLocationText/.test(SYNC) && /_vhSyncBanner/.test(SYNC),
  'the location text lines and banner are no longer updated, so a restored area is never named');

// The ordering that protects a saved team survives the parallelism.
ok(/userLane\.then\(function\(\) \{\s*return teamsRead/.test(SYNC),
  'the team lanes no longer run behind the user document. team_ballot restored by that read is the authoritative ' +
  'slate, and reading the team before it lands is how a back-fill overwrites a good saved team');
ok(/mainTeamId/.test(SYNC) && /_finalizeTeam/.test(SYNC),
  'the multi-team subcollection lane or its finalizer is gone from the pull');
ok(/_pdxUserSyncInFlight/.test(HUB),
  'nothing publishes whether the account pull is still in the air, so a surface cannot decline to rebuild ' +
  'itself mid-pull');

// ═════════════════════════════════════════════════════════════════════════════
section('3 · Your File and My Views hold the paint while they are open');
// ═════════════════════════════════════════════════════════════════════════════
const YF_OPEN = fnSrc(YF, 'open');
const YF_HIDE = fnSrc(YF, 'hide');
must(YF_OPEN && YF_HIDE, 'your-file.js open()/hide() are gone');

ok(/if \(!wasOpen\) holdAlign\(true\)/.test(YF_OPEN),
  'Your File no longer takes the paint hold exactly once per opening. Two holds with one release would park ' +
  'every repaint on the site for the rest of the session');
ok(/if \(_open\) holdAlign\(false\)/.test(YF_HIDE),
  'Your File no longer releases the hold when the panel hides');
ok(!/renderRelevantToMe|myteamBrowseFilter|updateRacesAndPositions/.test(YF_OPEN),
  'opening Your File runs the homepage fan-out. It owns one panel; the surfaces that fan-out repaints are all ' +
  'behind it');
const YF_HOLD = fnSrc(YF, 'holdAlign');
ok(/alignRefreshHold/.test(YF_HOLD), 'your-file.js holdAlign no longer routes through the engine\'s counter');

const MS_VIEWS = methodSrc(MS, 'openViews');
must(MS_VIEWS, 'PDXStances.openViews is gone from my-stances.js');
ok(/holdAlign\(true\)/.test(MS_VIEWS) && /holdAlign\(false\)/.test(MS_VIEWS),
  'My Views — the other door in the account menu — does not hold the paint while it mounts and scrolls to its ' +
  'section, so the sixteen-wide pass can run between the reader\'s taps behind it');
ok(/finally \{ holdAlign\(false\); \}/.test(MS_VIEWS),
  'the My Views hold is not released in a finally, so one throw inside the opening parks every repaint on the ' +
  'site for the rest of the session');
ok(!/renderRelevantToMe|myteamBrowseFilter|updateRacesAndPositions|pmFilterLocation/.test(MS_VIEWS),
  'opening My Views runs the homepage fan-out');
const MS_HOLD = fnSrc(MS, 'holdAlign');
must(MS_HOLD, 'my-stances.js has no holdAlign helper');
ok(/alignRefreshHold/.test(MS_HOLD), 'my-stances holdAlign no longer routes through the engine\'s counter');

const MS_OV = fnSrc(MS, 'showViewsOverlay');
must(MS_OV, 'showViewsOverlay is gone from my-stances.js');
ok(/holdAlign\(true\)/.test(MS_OV) && /holdAlign\(false\)/.test(MS_OV),
  'the My Views overlay does not hold the paint while it is up, although it covers every surface the refresh ' +
  'repaints');
ok(/_held/.test(MS_OV),
  'the overlay hold is not guarded against a double release — close() is reachable from the backdrop, the ✕ and ' +
  'Escape');

// Both doors are reached from the menu markup, and both are still there.
const MENU = (NAV.match(/desktop\.innerHTML = `[\s\S]*?`;/) || [''])[0];
must(MENU.length > 200, 'the desktop account-menu markup probe matched nothing');
ok(/data-pdxyf-open/.test(MENU), 'the account menu lost its Your File door');
ok(/PDXStances\.openViews/.test(MENU), 'the account menu lost its My Views door');
ok(/auth\.signOut/.test(MENU), 'the account menu lost Log Out');
ok(!/renderRelevantToMe|_alignRefreshAll|syncUserDataFromFirestore/.test(MENU),
  'a control in the account menu calls a whole-surface repaint or the account pull from its own onclick');

// ═════════════════════════════════════════════════════════════════════════════
section('4 · a bundle arriving repaints the roster, not the relevant tree');
// ═════════════════════════════════════════════════════════════════════════════
const ARRIVAL = (HUB.match(/document\.addEventListener\('pdx:data:cmpDetail', function \(\) \{[\s\S]*?\n    \}\);/) || [''])[0];
must(ARRIVAL.length > 80, 'the pdx:data:cmpDetail listener probe matched nothing');

ok(/requestIdleCallback|setTimeout/.test(ARRIVAL),
  'the cmp-detail arrival still rebuilds the roster in the event\'s own task. That event fires from the first ' +
  'interaction of the visit, which on a signed-in desktop is often the click that opened the account dropdown');
ok(/_chubRosterOnly\+\+/.test(ARRIVAL) && /_chubRosterOnly--/.test(ARRIVAL),
  'the arrival no longer marks itself as a roster-only repaint, so myteamBrowseFilter\'s tail rebuilds the ' +
  'relevant-to-me tree as well — two whole surfaces for one data landing');
ok(/_pdxUserSyncInFlight/.test(ARRIVAL),
  'the arrival repaints the relevant grid even while the account pull is still in the air; that pull repaints ' +
  'what it actually changed, once, on release');
ok(/_pdxRelevantWarmRepaint/.test(ARRIVAL) && !/window\.renderRelevantToMe\(\)/.test(ARRIVAL),
  'the arrival calls renderRelevantToMe directly instead of going through the rate-limited warm, which is the ' +
  'one path that skips a grid with no cards in it and collapses a batch into one rebuild');
ok(/_pdxClearHayCache/.test(ARRIVAL),
  'the arrival no longer drops the memoized search haystack, so bio and stance text stays unsearchable');

const WARMFN = fnSrc(HUB, '_relevantWarmRepaint');
must(WARMFN, '_relevantWarmRepaint is gone from compare-hub.js');
ok(/pdx-card/.test(WARMFN) && /_relWarmPend/.test(WARMFN),
  '_relevantWarmRepaint lost either its cold-grid guard or its one-rebuild-per-batch guard');
ok(/window\._pdxRelevantWarmRepaint = _relevantWarmRepaint/.test(HUB),
  '_relevantWarmRepaint is no longer exposed, so the arrival cannot reach the guarded path');

const BROWSE = HUB.slice(HUB.indexOf('window.myteamBrowseFilter = function()'));
const BROWSE_TAIL = BROWSE.slice(0, BROWSE.indexOf('pdx:data:cmpDetail'));
ok(/if \(!_chubRosterOnly && typeof window\.renderRelevantToMe/.test(BROWSE_TAIL),
  'myteamBrowseFilter rebuilds the relevant-to-me tree unconditionally again. A reader narrowing this list ' +
  'should re-rank that surface; a bundle landing under an open menu should not');
ok(/var _chubRosterOnly = 0;/.test(HUB),
  'the roster-only marker is gone or is no longer a counter — a boolean lets nested calls clear each other');

// ═════════════════════════════════════════════════════════════════════════════
section('5 · the hamburger is a class toggle against a CSS cap');
// ═════════════════════════════════════════════════════════════════════════════
const burger = (HTML.match(/<button class="lg:hidden text-steel-300[^>]*>/) || [''])[0];
must(burger, 'the hamburger button probe matched nothing');
ok(/classList\.toggle\('hidden'\)/.test(burger),
  'the hamburger no longer opens the drawer with a single class toggle');
ok(!/getBoundingClientRect|offsetHeight|innerHeight|requestAnimationFrame/.test(burger),
  'the hamburger measures something on toggle. The drawer\'s height is a CSS cap; measuring on open forces ' +
  'layout inside the tap');
ok(/#mobileMenu\{ max-height: calc\(100dvh - var\(--pdx-chrome\)\)/.test(HTML),
  'the drawer\'s max-height is no longer a CSS rule off the chrome variable, so its size has to be computed in JS');
ok(!/function fit\(/.test(HTML) || !/mobileMenu[\s\S]{0,200}getBoundingClientRect/.test(HTML),
  'something measures #mobileMenu with getBoundingClientRect on open');

// ═════════════════════════════════════════════════════════════════════════════
section('6 · nothing here gained a score, a party read or a second client');
// ═════════════════════════════════════════════════════════════════════════════
// Scoped to what this pass actually wrote: a file-wide grep would flag the
// existing lines that DISCLAIM a party read, which is the opposite of the thing
// being guarded against.
const touched = {
  'compare-hub.js · updateNavAuth': NAV,
  'compare-hub.js · the account pull': SYNC,
  'compare-hub.js · the cmp-detail arrival': ARRIVAL,
  'my-stances.js · openViews': MS_VIEWS,
};
for (const [name, src] of Object.entries(touched)) {
  must(src.length > 40, `the ${name} probe matched nothing, so its assertions are vacuous`);
  ok(!/blended|composite score|overall grade/i.test(src), `${name} grew a blended score`);
  ok(!/\bscore\b|\bgrade\b/i.test(src), `${name} grew a rated read`);
  ok(!/voting-record\/member|\/api\/votes/.test(src), `${name} grew a second formal-record client`);
  ok(!/PDXVoice|district-voice|directMessage|\bdm\b/i.test(src), `${name} reaches into Voice or DM`);
}
ok(!/fetch\(|XMLHttpRequest/.test(NAV + MS_VIEWS + ARRIVAL),
  'the chrome paths grew a network call — this pass moves work off the reader\'s frame, it does not add any');

// ═════════════════════════════════════════════════════════════════════════════
// Report
// ═════════════════════════════════════════════════════════════════════════════
if (failures.length) {
  console.error(`\n✗ account chip cost: ${failures.length} failure(s)`);
  failures.forEach((f) => console.error('  · ' + f));
  process.exit(1);
}
console.log(`\n✓ account chip cost: all ${passed} assertions passed — the chip paints only when the session ` +
  'changed, the account pull reads in parallel and repaints one slice later under one hold, both account-menu ' +
  'doors hold the paint while they are open, and a bundle landing rebuilds the roster instead of two surfaces');
