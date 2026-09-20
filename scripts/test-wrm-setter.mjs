/* ═══════════════════════════════════════════════════════════════════════════
   test-wrm-setter.mjs — one location setter, above the seats it fills
   ────────────────────────────────────────────────────────────────────────────
   "Who represents me" is a question with a prerequisite, and for a long time
   the homepage put the two on different screens. The band asked the question
   at the top of the page; the control that could answer it — Detect, Change on
   map — sat in the Voter Hub two sections down. A reader who scrolled to the
   band found a heading, a promise and six seats nobody had filled, with no
   visible way to fill them.

   And there was not one of those controls. There were three: the band's own
   cold CTAs, the Voter Hub's .pm-location-bar, and the card ballot-breakdown.js
   painted in the Relevant-to-Me empty state — each with its own Detect button,
   its own map button, and its own claim on being the thing the reader last
   touched. Three setters is not three chances to succeed. It is three places
   for the same answer to be entered and two of them to be stale.

   This file pins the pass that reduced them to one. Four properties:

     · THERE IS EXACTLY ONE SETTER, AND IT IS IN THE MARKUP. #wrm-locbar sits
       inside #who-represents-me, above #wrm-reps, in static HTML — so location
       precedes seats at first paint and not only once a deferred module runs.

     · IT WEARS TWO FACES, AND ONE OWNER DECIDES WHICH. Three doors while there
       is nothing to change, one "Change location" once there is. The decision
       is voter-hub-location.js's, because "is there a stamped location" is that
       file's question; two owners would be two answers.

     · EVERY OTHER LOCATION CONTROL IS A DOOR TO IT. The districts strip, the
       ballot band and the Relevant-to-Me empty state all route through
       window._pdxGoSetLocation rather than opening a picker of their own.

     · THE EMPTY STATE NAMES NOBODY. No state, no seat count, no incumbents —
       the honest empty copy, and a setter. The band's warm state is where names
       appear, and only after a location has been stamped.

   Sections:
     1. One setter, in the markup, above the seats
     2. Driven: the two faces, and the copy on each
     3. Every other location control is a door, not a second setter
     4. Driven: where each entry point lands
     5. The empty state names nobody
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
  console.error(`\n✗ wrm setter: STALE HARNESS — ${msg}\n`);
  process.exit(2);
};
const section = (t) => console.log('   ── ' + t);

const HTML = read('index.html');
const VHL = read('voter-hub-location.js');
const WRM = read('who-represents-me.js');
const BB = read('ballot-breakdown.js');

// Brace-balanced source of `window.NAME = function`, which is how this file's
// two subjects are declared.
const assignSrc = (src, name) => {
  const i = src.indexOf(`window.${name} = function`);
  if (i < 0) return '';
  let depth = 0, started = false;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') { depth++; started = true; }
    else if (src[j] === '}') { depth--; if (started && depth === 0) return src.slice(i, j + 1); }
  }
  return '';
};

// The copy the brief specified, quoted once so the markup and the module are
// checked against the same string rather than against each other's paraphrase.
const EMPTY_LINE = 'Set your location to see who holds your seats';

// ═════════════════════════════════════════════════════════════════════════════
section('1 · one setter, in the markup, above the seats');
// ═════════════════════════════════════════════════════════════════════════════
const iSec = HTML.indexOf('<section id="who-represents-me"');
must(iSec !== -1, 'index.html no longer contains the #who-represents-me section');
const SEC = HTML.slice(iSec, HTML.indexOf('</section>', iSec));

const iBar = HTML.indexOf('id="wrm-locbar"');
must(iBar !== -1, 'index.html no longer contains #wrm-locbar — every assertion below is vacuous');
eq(HTML.split('id="wrm-locbar"').length - 1, 1,
  'the homepage declares #wrm-locbar more than once. Two elements with one id is two setters wearing one ' +
  'name, and voter-hub-location.js will only ever find the first of them');
has(SEC, 'id="wrm-locbar"',
  'the setter has left the Who Represents Me band. It can live anywhere on the page and still work; it can ' +
  'only answer the band\'s own question from inside it');

const iReps = HTML.indexOf('id="wrm-reps"');
must(iReps !== -1, 'index.html no longer contains #wrm-reps, the band\'s seat host');
ok(iBar < iReps,
  'the seats now come before the setter inside the band. The order is the argument: a reader is asked where ' +
  'they vote, and then shown who holds those seats — not shown six blanks and left to find the control');

// STATIC, not painted. An entry point that appears only once a deferred module
// runs is an entry point that vanishes the first time the module 404s.
has(SEC, EMPTY_LINE,
  'the empty-state instruction is no longer in the markup, so a reader whose scripts have not arrived sees ' +
  'a card with no idea what it wants from them');
has(SEC, 'detect-loc-btn',
  'the Detect control is no longer static markup in the band');
for (const door of ['>🌐 Detect<', '>🗺️ Change on map<', '>📍 Set my location<', '>🗺️ Change location<']) {
  has(SEC, door, `the setter is missing the ${door.slice(1, -1)} control`);
}

// ONE Detect in the document, which is the count the brief named. Three cards
// each offering to detect is how a reader ends up detecting twice and trusting
// neither answer.
// Counted as CONTROLS, not as mentions of the function: the one Detect button
// guards its own handler, so its onclick names it twice on purpose.
const detects = (HTML.match(/onclick="window\.triggerManualLocationDetection/g) || []).length;
eq(detects, 1,
  `index.html wires ${detects} Detect buttons. One document, one Detect: a second one is a second card by ` +
  'another name');
eq((HTML.match(/🌐 Detect/g) || []).length, 1,
  'more than one control on the homepage offers to detect the reader\'s location, so a reader can detect ' +
  'twice and has no way to know which answer the page kept');
const locCards = (HTML.match(/class="pm-location-bar"/g) || []).length;
eq(locCards, 1,
  `index.html paints ${locCards} location cards. The pass exists to leave exactly one`);

// The two faces are CSS, so the correct one is up at first paint rather than
// after a module has had a chance to hide the wrong one.
has(HTML, '#wrm-locbar[data-pdxloc="set"] .wrm-locwhen-empty{display:none;}',
  'nothing hides the three empty-state doors once a location is stamped, so a located reader is offered ' +
  '"Set my location" beside their own city');
has(HTML, '#wrm-locbar:not([data-pdxloc="set"]) .wrm-locwhen-set{display:none;}',
  'nothing hides "Change location" while there is no location, which offers to change a thing that does ' +
  'not exist — and defaults to hiding the setter if the attribute is ever absent');
has(SEC, 'data-pdxloc="empty"',
  'the setter\'s static markup does not start on the empty face. Whatever the reader has stored, the ' +
  'honest first frame is the one that assumes nothing');

// ═════════════════════════════════════════════════════════════════════════════
section('2 · driven: the two faces, and the copy on each');
// ═════════════════════════════════════════════════════════════════════════════
const BANNER = assignSrc(VHL, '_vhSyncBanner');
must(BANNER.length > 400, '_vhSyncBanner is gone from voter-hub-location.js');

const mkEl = (id) => {
  const attrs = {};
  return {
    id, innerHTML: '', textContent: '', value: '', _attrs: attrs, style: {},
    setAttribute: (k, v) => { attrs[k] = String(v); },
    getAttribute: (k) => (k in attrs ? attrs[k] : null),
    removeAttribute: (k) => { delete attrs[k]; },
    querySelector: () => null,
    scrollIntoView() { this._scrolled = true; },
  };
};

const IDS = ['wrm-locbar', 'vh-loc-city', 'vh-loc-subdesc', 'pm-loc-title', 'pm-area-desc',
  'pm-location-label', 'vh-ballot-edu', 'pm-state-sel', 'pm-county-sel'];

// Davis / Layton, resolved exactly as the curated ballot resolves it: CD 2,
// SD 6, HD 15. The same three numbers /me reads back out of the record.
const DAVIS_KRD = {
  matched: true,
  label: 'Layton, Davis County',
  byRace: {
    house: { district: '2' },
    statesenate: { district: '6' },
    statehouse: { district: '15' },
  },
};

const runBanner = (over) => {
  const els = {};
  IDS.forEach((i) => { els[i] = mkEl(i); });
  const ctx = {
    console, Math, JSON, String, Array, Object, Number, Boolean, RegExp,
    document: { getElementById: (i) => els[i] || null, addEventListener: () => {} },
    _hasUserLocation: false,
    _currentVoterLocation: null,
    keyRacesRelevantData: () => null,
    ...over,
  };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(BANNER, ctx, { filename: 'voter-hub-location.js[_vhSyncBanner]' });
  ctx._vhSyncBanner();
  return { els, ctx };
};

const empty = runBanner({});
eq(empty.els['wrm-locbar'].getAttribute('data-pdxloc'), 'empty',
  'with no stamped location the setter is not put on its empty face, so a reader with nothing saved is ' +
  'shown "Change location" and no way to set one');
eq(empty.els['vh-loc-subdesc'].textContent, EMPTY_LINE,
  'the empty card does not say what setting a location buys the reader');
has(empty.els['vh-loc-city'].innerHTML, 'Area',
  'the empty card\'s title is not "Your Area" — it has to name a place it does not know');
const emptyAll = IDS.map((i) => empty.els[i].innerHTML + '|' + empty.els[i].textContent).join('|');
lacks(emptyAll, 'Utah',
  'a state name was painted into the card with nothing stamped. There is no location, so there is no state ' +
  'to print, and printing one is the default this project spent a pass removing');
lacks(emptyAll, 'District',
  'a district number was painted with nothing stamped — a seat the reader never claimed to vote in');

const set = runBanner({
  _hasUserLocation: true,
  _currentVoterLocation: { state: 'Utah', city: 'Layton', county: 'Davis', district: '2' },
  keyRacesRelevantData: () => DAVIS_KRD,
});
eq(set.els['wrm-locbar'].getAttribute('data-pdxloc'), 'set',
  'a stamped location does not flip the setter to its single "Change location" door, so the reader who has ' +
  'already told us where they vote is asked again by three buttons');
has(set.els['vh-loc-city'].innerHTML, 'Layton',
  'the located card does not name the place the reader chose');
has(set.els['vh-loc-city'].innerHTML, 'Davis County',
  'the located card drops the county that anchors the place, which is what makes a split county legible');
const sub = set.els['vh-loc-subdesc'].innerHTML;
for (const [label, num] of [['U.S. House', '2'], ['State Senate', '6'], ['State House', '15']]) {
  has(sub, label, `the located card no longer names the ${label} seat`);
  has(sub, 'District ' + num, `the located card no longer prints ${label} District ${num}`);
}
lacks(set.els['vh-loc-subdesc'].textContent, EMPTY_LINE,
  'the located card still shows the empty-state instruction alongside the districts it resolved');

// One owner. The band's own module must not also decide the face, because the
// question behind it — is a location stamped — is the store's to answer.
has(BANNER, "locBar.setAttribute('data-pdxloc'",
  'voter-hub-location.js no longer sets the setter\'s face, so whichever module gets there first decides it');
lacks(WRM, "setAttribute('data-pdxloc'",
  'who-represents-me.js also writes data-pdxloc. Two writers of one attribute is two answers to "is there ' +
  'a location", and the reader sees whichever ran last');

// ═════════════════════════════════════════════════════════════════════════════
section('3 · every other location control is a door, not a second setter');
// ═════════════════════════════════════════════════════════════════════════════
const HOP = assignSrc(VHL, '_pdxGoSetLocation');
must(HOP.length > 40, 'window._pdxGoSetLocation is gone from voter-hub-location.js');
has(HOP, 'window.pdxSetLocation',
  'the shared hop no longer prefers the band\'s own setter, so a control elsewhere opens a picker without ' +
  'ever landing the reader on the surface that owns the answer');
ok(/openLocationModal|toggleChangeLocation/.test(HOP),
  'the hop has no fallback for a document that does not carry the band, which turns a missing module into a ' +
  'dead button');

// The three surfaces that used to paint their own card.
const PROMPT = (() => {
  const i = BB.indexOf('window._relevantLocationPrompt = function');
  must(i > 0, '_relevantLocationPrompt is gone from ballot-breakdown.js');
  let depth = 0, started = false;
  for (let j = i; j < BB.length; j++) {
    if (BB[j] === '{') { depth++; started = true; }
    else if (BB[j] === '}') { depth--; if (started && depth === 0) return BB.slice(i, j + 1); }
  }
  return '';
})();
has(PROMPT, '_pdxGoSetLocation',
  'the Relevant-to-Me empty state opens its own picker again rather than sending the reader to the one setter');
lacks(PROMPT, 'triggerManualLocationDetection',
  'the Relevant-to-Me empty state carries its own Detect button again, which is the second card this pass ' +
  'removed wearing different copy');
// ONE control, counted as buttons. toggleChangeLocation is still named inside
// that control's onclick as the hop's fallback for a document the band is not
// on, which is a door of last resort and not a second button.
eq((PROMPT.match(/<button/g) || []).length, 1,
  'the Relevant-to-Me empty state offers more than one location control again — the two prominent actions, ' +
  'a page and a half below the card that owns them, are what made it a second setter');
ok(PROMPT.indexOf('toggleChangeLocation') === -1 ||
   PROMPT.indexOf('_pdxGoSetLocation') < PROMPT.indexOf('toggleChangeLocation'),
  'the empty state reaches for the map toggle before the shared hop, so it opens a picker without landing ' +
  'the reader on the setter that owns the answer');
lacks(PROMPT, '🗺️',
  'the Relevant-to-Me empty state has a map button of its own again');

const STRIP = (() => {
  const i = VHL.indexOf('window._vhSyncDistrictStrip = function');
  must(i > 0, '_vhSyncDistrictStrip is gone from voter-hub-location.js');
  return VHL.slice(i, VHL.indexOf('window._vhToggleRacePanel', i));
})();
const stripHops = (STRIP.match(/_pdxGoSetLocation/g) || []).length;
ok(stripHops >= 4,
  `the districts strip routes only ${stripHops} of its setter buttons through the shared hop. Each one that ` +
  'does not is a control that can open a picker while the reader is nowhere near the card that owns it');
const BAND = (() => {
  const i = HTML.indexOf('id="pdx-ballot-band"');
  return i > 0 ? HTML.slice(i, i + 4000) : '';
})();
has(BAND, '_pdxGoSetLocation',
  'the homepage ballot band\'s "Change location" no longer goes through the shared hop');

// ═════════════════════════════════════════════════════════════════════════════
section('4 · driven: where each entry point lands');
// ═════════════════════════════════════════════════════════════════════════════
// THE PICKER IS ITS OWN DOCUMENT NOW — /find — so "scroll to the setter, then
// open the picker on the next task" is a behaviour with a PRECONDITION rather
// than an unconditional sequence. The band tests the DOM for the picker's form:
// present, and the old two-step still runs, because the surface the reader is
// being scrolled to is really there; absent, and the opener is a NAVIGATION, so
// scrolling first would animate a page the reader is about to leave. Both sides
// are driven below, and `picker: true` is what puts the form on the document.
const runBand = (over) => {
  const o = over || {};
  const els = {
    'who-represents-me': mkEl('who-represents-me'),
    'wrm-reps': mkEl('wrm-reps'),
    'wrm-locbar': mkEl('wrm-locbar'),
  };
  if (o.picker) els['change-location-form'] = mkEl('change-location-form');
  const timers = [];
  const opened = [];
  const ctx = {
    console, Math, JSON, String, Array, Object, Number, Boolean, RegExp,
    setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
    document: {
      readyState: 'complete',
      getElementById: (i) => els[i] || null,
      addEventListener: () => {},
    },
    _hasUserLocation: false,
    openLocationModal: (o) => opened.push('modal:' + JSON.stringify(o || null)),
    toggleChangeLocation: () => opened.push('map'),
    pdxRepsForMe: undefined,
    ...over,
  };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(WRM, ctx, { filename: 'who-represents-me.js' });
  return { ctx, els, timers, opened, flush: () => timers.forEach((t) => t.fn()) };
};

must(typeof runBand({}).ctx.pdxSetLocation === 'function',
  'window.pdxSetLocation is gone from who-represents-me.js');

// Empty: the reader is sent to the setter, not to the section heading with the
// one control that can help below the fold.
const cold = runBand({ picker: true });
cold.ctx.pdxFindMyReps();
ok(cold.els['wrm-locbar']._scrolled,
  'with no location, the lookup action does not land on the setter. The reader pressed "see who represents ' +
  'me" and arrives at a heading, with the control that answers it off-screen');
ok(!cold.els['wrm-reps']._scrolled,
  'with no location the action scrolls to the empty seat list, which is six blanks and no way to fill them');
cold.flush();
ok(cold.opened.length === 1,
  `an unlocated lookup opened ${cold.opened.length} pickers. One setter means one picker, once`);

// AND WITH THE PICKER ON ANOTHER DOCUMENT, THE SCROLL IS THE BUG. The opener is
// a trip to /find, so a 260 ms pan down to a bar the reader will never see is an
// animation charged to the tap that was meant to answer them. No scroll, and the
// door opens on the same task rather than after a timer nobody is waiting out.
const away = runBand({});
away.ctx.pdxFindMyReps();
ok(!away.els['wrm-locbar']._scrolled,
  'with the picker on another document the lookup still scrolls to a setter that is not there');
ok(away.opened.length === 1,
  `an unlocated lookup on a document with no picker opened ${away.opened.length} doors on the spot, not one`);
away.flush();
ok(away.opened.length === 1,
  'the deferred opener fired as well, so the trip to the finder is queued twice');

// Stamped: the reader already answered. Asking again is the bug.
const warm = runBand({ _hasUserLocation: true, pdxRepsForMe: () => ({ located: true, levels: [] }) });
warm.ctx.pdxFindMyReps();
ok(warm.els['wrm-reps']._scrolled,
  'with a location saved, the lookup does not land on the seats — which is the thing the reader asked for');
warm.flush();
eq(warm.opened.length, 0,
  'a located reader pressing "who represents me" is shown the address picker again. They answered that; ' +
  'the question on screen is who holds the seats');

// And the door itself: scroll first, open second, in whichever mode was asked.
const asMap = runBand({ picker: true });
asMap.ctx.pdxSetLocation('map');
ok(asMap.els['wrm-locbar']._scrolled, 'pdxSetLocation does not scroll to the setter before opening a picker');
eq(asMap.opened.length, 0,
  'pdxSetLocation opens the picker on the same task as the scroll, so the modal covers a page the reader ' +
  'has not travelled yet and dismissing it leaves them where they started');
asMap.flush();
eq(asMap.opened[0], 'map', 'pdxSetLocation("map") does not open the district map');

// Same door, picker not on the document: one hop, no scroll, no timer.
const asMapAway = runBand({});
asMapAway.ctx.pdxSetLocation('map');
ok(!asMapAway.els['wrm-locbar']._scrolled,
  'pdxSetLocation scrolls to a setter this document does not have');
eq(asMapAway.opened.length, 1,
  'pdxSetLocation defers a trip to another document behind a timer, so the tap appears to do nothing');

const asForm = runBand({ picker: true });
asForm.ctx.pdxSetLocation('form');
asForm.flush();
has(asForm.opened[0] || '', 'forceForm',
  'pdxSetLocation("form") does not ask for the typed-address panel, so the "Set my location" door opens ' +
  'whatever the app defaults to');

// A document without the band still has to answer the button.
const bare = runBand({});
bare.ctx.document.getElementById = () => null;
bare.ctx.pdxSetLocation();
bare.flush();
ok(bare.opened.length === 1,
  'on a document with no setter in it, the door does nothing at all rather than falling back to the picker');

// ═════════════════════════════════════════════════════════════════════════════
section('5 · the empty state names nobody');
// ═════════════════════════════════════════════════════════════════════════════
// The band's static markup is what an empty store paints. It may promise a
// lookup; it may not perform one, and it may not name a slate.
for (const name of ['Maloy', 'Stevenson', 'Defay', 'Curtis', 'Mike Lee', 'Cox']) {
  lacks(SEC, name,
    `the band's static markup names ${name}. Whatever is hardcoded here is what a reader with an empty ` +
    'store sees attributed to seats they never told us they vote in');
}
lacks(SEC, 'set to Utah',
  'the band still tells a reader they are "set to Utah", which is a place nobody chose');
lacks(SEC, '3 of 6',
  'the band\'s static markup claims a resolved-seat count before any location exists');
const emptyBand = runBand({}).els['wrm-reps'].innerHTML;
eq(emptyBand, '',
  'the band painted seat rows with no location and no resolver. There is no honest partial state here: ' +
  'rows imply an address we were never given');

// ─────────────────────────────────────────────────────────────────────────────
console.log('');
if (failures.length) {
  console.error(`✗ wrm setter: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error('   · ' + f);
  process.exit(1);
}
console.log(`✓ wrm setter: all ${passed} assertions passed — one setter, above the seats, two faces and one ` +
  'owner for them; every other location control is a door to it\n');
