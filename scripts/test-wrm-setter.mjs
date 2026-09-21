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

     · IT WEARS TWO FACES, AND ONE OWNER DECIDES WHICH. Both picker doors while
       there is nothing to change, one "Change location" once there is. The
       decision is voter-hub-location.js's, because "is there a stamped
       location" is that file's question; two owners would be two answers.
       DETECT IS IN NEITHER FACE AND THEREFORE IN BOTH: a saved location is
       exactly as re-detectable as a missing one, and it is often the coarser
       answer — a state with no county, a district pinned before the reader
       moved — so the one gesture that can correct it stays on the card.

     · AND THE BADGE BESIDE THE CITY IS THAT READER'S OWN STATE. It was a
       hardcoded Utah rectangle for every reader in the country, which is the
       same wrong claim this band's seat rows spent two passes learning not to
       make, made in a shape instead of a sentence.

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
     6. Driven: the badge draws the reader's own state
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

// ── AND DETECT IS OFFERED ON BOTH FACES ─────────────────────────────────────
// The pickers are for a reader who has nothing saved; Detect is for a reader
// whose saved answer is wrong or coarse, which is a state the card spends most
// of its life in. Hidden behind the empty face, the only way to correct a
// state-only record was a trip to /find and a search box. So this button
// carries NEITHER face class — the CSS only ever hides the two named ones — and
// the assertion is on the tag rather than on a rendered style because the faces
// are CSS and this harness has no engine to apply them.
const DETECT_TAG = (() => {
  const i = SEC.indexOf('id="detect-loc-btn"');
  must(i !== -1, 'the Detect button has lost its id, so nothing below is looking at it');
  const a = SEC.lastIndexOf('<button', i);
  return SEC.slice(a, SEC.indexOf('</button>', i));
})();
lacks(DETECT_TAG, 'wrm-locwhen-empty',
  'Detect is back on the empty face only. A reader who has saved a location — the coarse state-only ' +
  'answer they accepted to get going, or the district they pinned before they moved — can then only ' +
  'correct it through the map picker on /find');
lacks(DETECT_TAG, 'wrm-locwhen-set',
  'Detect is pinned to the located face, so a reader with nothing saved is not offered the one control ' +
  'that could fill the card in a single tap');
has(DETECT_TAG, 'triggerManualLocationDetection',
  'the Detect button in the card no longer calls the detection handler at all');

// ONE Detect in the document, which is the count the brief named. Three cards
// each offering to detect is how a reader ends up detecting twice and trusting
// neither answer. IT IS ALSO WHY THE BUTTON ABOVE IS ONE ELEMENT IN BOTH FACES
// RATHER THAN A COPY PER FACE: two Detects is two ids, and
// triggerManualLocationDetection finds exactly one of them to put its spinner
// in and restore afterwards.
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

// ── AND THE REAL RESOLVER UNDER IT, BECAUSE THE CARD NO LONGER HAS ITS OWN ──
// The YOUR DISTRICTS line used to resolve its own three numbers out of
// keyRacesRelevantData(), and only the U.S. House lookup had a fallback: a
// reader placed by the district map rather than by a curated area read
// "YOUR DISTRICTS: U.S. House District 1" over a location record that held all
// three. It reads window.pdxRepsForMe() now, which already owns that whole
// precedence chain.
//
// So this harness runs the RESOLVER in the same context as the banner instead of
// handing the banner a hand-written object called pdxRepsForMe. A stub would make
// every assertion below a statement about the stub: it would pass with the header
// reading one chamber and the fixture offering three. The slice starts at the
// statewide-seat cache because pdxRepsForMe reaches back into it and into
// _pdxStickLevels / _pdxResolved* — module locals that are not on window, so a
// narrower cut throws on the first call.
const RESOLVER = (() => {
  const a = VHL.indexOf('var _pdxStatewideCache = {};');
  const b = VHL.indexOf('window._vhSyncDistrictStrip = function()', a);
  must(a > 0 && b > a,
    'voter-hub-location.js no longer runs from _pdxStatewideCache down to _vhSyncDistrictStrip — the\n' +
    '  resolver slice the located card is measured against cannot be cut');
  return VHL.slice(a, b);
})();

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
  // The resolver first: the card reads window.pdxRepsForMe(), so without it the
  // YOUR DISTRICTS line falls through its typeof guard and paints nothing — which
  // is a harness that cannot tell a complete header from an empty one.
  vm.runInContext(RESOLVER, ctx, { filename: 'voter-hub-location.js[pdxRepsForMe]' });
  must(typeof ctx.pdxRepsForMe === 'function',
    'the resolver slice ran but did not publish window.pdxRepsForMe, so the located card has nothing to read');
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

// ══ THE MAP-PLACED READER, WHO THIS LINE WAS ACTUALLY WRONG FOR ══════════
// The fixture above matches a curated Key-Races area, which is the one case the
// old header got right. This is the other one, and it is the population /find
// exists for: keyRacesRelevantData() reports nothing matched, and the three
// district numbers are on the LOCATION RECORD, where the finder's
// applyToLocation() writes them — district, stateSenateDistrict,
// stateHouseDistrict.
//
// Before this pass the card read "YOUR DISTRICTS: U.S. House District 1" and
// stopped there, because the U.S. House lookup was the only one of the three with
// a fallback to the record; the two legislative lookups ended in `: null`. A
// reader who had just tapped three polygons and pressed confirm was told the map
// had placed one of them.
const mapped = runBanner({
  _hasUserLocation: true,
  _currentVoterLocation: { state: 'Utah', city: 'Layton', county: 'Davis', district: '1',
                           stateSenateDistrict: '18', stateHouseDistrict: '13', mapSelected: true },
  keyRacesRelevantData: () => ({ matched: false }),
});
const msub = mapped.els['vh-loc-subdesc'].innerHTML;
for (const [label, num] of [['U.S. House', '1'], ['State Senate', '18'], ['State House', '13']]) {
  has(msub, label,
    `the located card does not name the ${label} seat for a reader the DISTRICT MAP placed. The curated ` +
    'area did not match, so this number came off the location record — which is where confirm puts it');
  has(msub, 'District ' + num,
    `the located card does not print ${label} District ${num} for a map-placed reader`);
}
// Three chambers, three numbers, and nothing invented for a fourth.
eq((msub.match(/District /g) || []).length, 3,
  'the located card prints a number of districts other than the three the location record holds');
lacks(mapped.els['vh-loc-subdesc'].textContent, EMPTY_LINE,
  'a reader the map placed in all three chambers is still being asked to set a location');

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

// THE DISTRICTS STRIP HAD FOUR SETTER BUTTONS. IT NOW HAS NONE.
// This used to count how many of the strip's own "set my location" controls went
// through the shared hop rather than opening a picker of their own — the strip was
// the homepage's SECOND seat surface, and it carried a second set of CTAs with it.
// The strip is retired: its rows, its lede, its local-coverage footer and its
// buttons are gone, and the one roster's cold state is the only place that asks.
// So the number to hold is zero. A control that reappears here is a second setter
// whichever door it opens, two sections below the card that owns the answer.
const STRIP = (() => {
  const i = VHL.indexOf('window._vhSyncDistrictStrip = function');
  must(i > 0, '_vhSyncDistrictStrip is gone from voter-hub-location.js');
  const j = VHL.indexOf('\n  };', i);
  return j < 0 ? VHL.slice(i) : VHL.slice(i, j + 5);
})();
eq((STRIP.match(/<button/g) || []).length, 0,
  'the retired districts strip paints a location button again');
lacks(STRIP, 'openDistrictMapModal',
  'the retired districts strip opens the district map itself again rather than leaving that to the setter');
lacks(STRIP, '_pdxGoSetLocation',
  'the retired districts strip reaches for the shared hop again — which means it has copy to hang it on, ' +
  'and copy here is the second roster coming back');
// AND THE HOP IS STILL DECLARED, ABOVE IT, FOR THE DOORS THAT DO USE IT.
has(VHL, 'window._pdxGoSetLocation = function',
  'voter-hub-location.js no longer declares the shared hop, so every door on the page that routes through ' +
  'it silently stops landing the reader on the setter');
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
  // THE AWAY SIDE TRAVELS, so the context needs a location it can assign to.
  // The band no longer hands an off-document picker to openLocationModal() —
  // that opener composes the trip as finderHref(here()), which sends next=/
  // from the homepage and brings the reader back to the top of the hero rather
  // than to the band they pressed the button in. It walks to the finder itself
  // with no intent instead, and PDXReturn's no-intent fallback is the band's
  // own anchor. Recorded here rather than stubbed away, because "did it travel
  // exactly once, and where to" is the whole assertion on that side.
  const nav = [];
  ctx.location = {
    href: 'https://politidex.fyi/', pathname: '/', search: '', hash: '',
    assign: (u) => { nav.push(String(u)); },
  };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(WRM, ctx, { filename: 'who-represents-me.js' });
  return { ctx, els, timers, opened, nav, flush: () => timers.forEach((t) => t.fn()) };
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
eq(away.nav.length, 1,
  `an unlocated lookup on a document with no picker took ${away.nav.length} trips on the spot, not one`);
ok(/^\/find(?:[?#]|$)/.test(away.nav[0] || ''),
  `the lookup travels to ${away.nav[0] || 'nowhere'} instead of the district finder`);
ok((away.nav[0] || '').indexOf('next=') < 0,
  'the lookup sends a return intent, which outranks the band anchor PDXReturn falls back to and ' +
  'lands the confirm at the top of the homepage instead of on the seats it just filled');
eq(away.opened.length, 0,
  'the lookup also calls the shared modal opener, so a picker is flashed over a document the reader ' +
  'is already leaving');
away.flush();
eq(away.nav.length, 1,
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
eq(asMapAway.nav.length, 1,
  'pdxSetLocation defers a trip to another document behind a timer, so the tap appears to do nothing');
ok(/^\/find(?:[?#]|$)/.test(asMapAway.nav[0] || ''),
  `pdxSetLocation("map") travels to ${asMapAway.nav[0] || 'nowhere'} instead of the district finder`);
eq(asMapAway.opened.length, 0,
  'pdxSetLocation("map") opens a picker on this document as well as travelling to the one that hosts it');

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
eq(bare.nav.length, 1,
  'on a document with no setter in it, the door does nothing at all rather than falling back to the finder');
ok(/^\/find(?:[?#]|$)/.test(bare.nav[0] || ''),
  `the fallback door travels to ${bare.nav[0] || 'nowhere'} instead of the district finder`);

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

// ═════════════════════════════════════════════════════════════════════════════
section("6 · driven: the badge draws the reader's own state");
// ═════════════════════════════════════════════════════════════════════════════
// The card's map badge is a silhouette with a pin dropped on it, under the words
// YOUR VOTING LOCATION and over the reader's own city. It was Utah's silhouette
// for everybody: a rectangle with the Wyoming notch cut out of it, hardcoded in
// the markup, shown to the Colorado reader the finder can now place. A shape is
// a claim, and that one was false for fifty places out of fifty-one.
//
// This section drives the fix rather than reading it. The outline table and its
// painter are static data in index.html — the badge exists on one document and
// voter-hub-location.js is a sync script on all of them — so the assertions
// below lift that block out of the page, run it, and check the geometry it
// actually paints. What they pin is not "a table exists" but four behaviours:
// the reader's state is drawn, an unknown place draws NOTHING rather than a
// guess, no location restores the home silhouette, and the Utah county pin
// lands INSIDE the Utah outline — which is the one thing a separate fit for the
// shape and for the pin would quietly break.
const SHAPES = (() => {
  const a = HTML.indexOf('(function () {\n        var T = [');
  const b = HTML.indexOf('})();', a);
  must(a > 0 && b > a,
    'index.html no longer carries the state-outline table as its own block, so nothing below is\n' +
    '  measuring the shape the badge draws');
  return HTML.slice(a, b + 5);
})();

const HOME_D = (() => {
  const m = HTML.match(/data-pdxhome="([^"]+)"/);
  must(!!m, 'the badge path has lost data-pdxhome — the painter has no home silhouette to restore');
  return m[1];
})();

const runShapes = (state) => {
  const el = mkEl('vh-loc-mapshape');
  el.setAttribute('data-pdxhome', HOME_D);
  el.setAttribute('d', HOME_D);
  const ctx = {
    console, Math, JSON, String, Array, Object, Number,
    document: { getElementById: (id) => (id === 'vh-loc-mapshape' ? el : null) },
  };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(SHAPES, ctx, { filename: 'index.html[state-outlines]' });
  must(typeof ctx.pdxPaintStateShape === 'function',
    'index.html no longer publishes pdxPaintStateShape, so the badge has no painter');
  const painted = ctx.pdxPaintStateShape(state);
  return { ctx, el, painted, d: el.getAttribute('d'), key: el.getAttribute('data-pdxshape') };
};

// FIFTY STATES AND THE DISTRICT, keyed by the lowercase state name the location
// record already stores. Counted, because a table that lost a state would fail
// silently for exactly the readers it lost: their badge would draw nothing and
// every other assertion here would still pass.
const KEYS = (() => {
  const out = [];
  for (const row of SHAPES.match(/'[a-z .]+:M[^']+'/g) || []) out.push(row.slice(1, row.indexOf(':')));
  must(out.length > 0, 'the outline table has no rows in the shape this harness can read');
  return out;
})();
eq(KEYS.length, 51,
  `the outline table holds ${KEYS.length} places. Fifty states and the District of Columbia is 51, and a ` +
  'missing row is a reader whose badge draws an empty frame');
eq(new Set(KEYS).size, 51, 'a state is keyed twice in the outline table, so one of the two is unreachable');
for (const k of ['utah', 'colorado', 'district of columbia', 'alaska', 'hawaii', 'texas', 'new york']) {
  ok(KEYS.indexOf(k) !== -1, `the outline table has no row for ${k}`);
}

// THE READER'S OWN STATE, AND NOT THE HOME ONE. Colorado is the smoke case: it
// borders Utah, it is the neighbour a Utah-shaped badge is least obviously
// wrong for, and it is what the brief named.
const co = runShapes('Colorado');
eq(co.painted, true, 'painting Colorado reported failure, so the badge kept whatever was in the markup');
eq(co.key, 'colorado', 'the badge does not record which state it drew, so nothing can tell it is stale');
ok(co.d !== HOME_D,
  'a Colorado reader still gets the home silhouette. This is the whole defect: their own city under ' +
  'somebody else\'s state');
ok(/^M[-0-9. LZM]+Z$/.test(co.d), 'the Colorado outline is not a closed path');

// Case and stray whitespace are the record's, not the reader's — the state is
// stored as "Colorado" and the table is keyed lowercase, so the painter folds.
eq(runShapes(' colorado ').d, co.d,
  'the painter is case- and whitespace-sensitive, so a record that says "Colorado" and a table keyed ' +
  '"colorado" are two different states');

const ut = runShapes('Utah');
eq(ut.d, HOME_D,
  'Utah\'s row in the table and the silhouette that ships in the markup are not the same path. One fit, ' +
  'one source: two would put the county pin inside a shape it was not projected for');

// NO LOCATION IS NOT AN UNKNOWN STATE, and neither of them is a guess.
const none = runShapes('');
eq(none.painted, false, 'the painter claims it drew a state for a reader who has none');
eq(none.d, HOME_D,
  'clearing a location leaves the last reader\'s state on the badge, so the card shows a place nobody ' +
  'is standing in');
const guam = runShapes('Guam');
eq(guam.painted, false, 'the painter claims a shape for a place the table does not hold');
eq(guam.d, '',
  'a place we hold no outline for is drawn as SOME state anyway. An empty frame says "we know where you ' +
  'are and cannot draw it"; a guessed shape says something false');
eq(guam.key, '', 'the badge records a state it did not draw');

// EVERY OUTLINE INSIDE THE BADGE'S OWN viewBox. The paths are generated from
// Census geometry and fitted offline; a bad fit would not throw, it would draw a
// state that runs off the edge of the frame it is in.
const coords = (d) => d.replace(/[MLZ]/g, ' ').trim().split(/[\s]+/).map(Number);
let outOfBox = 0, nonFinite = 0;
for (const row of SHAPES.match(/'[a-z .]+:M[^']+'/g) || []) {
  const d = row.slice(row.indexOf(':') + 1, -1);
  const c = coords(d);
  for (let i = 0; i < c.length; i += 2) {
    if (!isFinite(c[i]) || !isFinite(c[i + 1])) { nonFinite++; continue; }
    if (c[i] < 0 || c[i] > 100 || c[i + 1] < 0 || c[i + 1] > 116) outOfBox++;
  }
}
eq(nonFinite, 0, 'an outline carries a coordinate that is not a number, so that state draws nothing');
eq(outOfBox, 0,
  `${outOfBox} outline points fall outside the badge's 100x116 viewBox, so at least one state is drawn ` +
  'clipped by its own frame');

// ── AND THE PIN LANDS INSIDE THE SHAPE ──────────────────────────────────────
// The county pin has always been projected by hand in _vhPositionLocPin: lat and
// lng into the same viewBox the outline is drawn in. While the outline was a
// rectangle, "inside" was easy. Now that it is Utah's real boundary, generated
// by a fitting rule, the pin's constants and that rule have to be the same fit —
// and the honest way to pin that is not to compare two sets of numbers but to
// drop the pin and ask the polygon.
const PIN = assignSrc(VHL, '_vhPositionLocPin');
must(PIN.length > 400, '_vhPositionLocPin is gone from voter-hub-location.js');
has(PIN, 'pdxPaintStateShape',
  'the pin positioner no longer paints the state outline, so the badge keeps the markup\'s silhouette ' +
  'for every reader — which is the defect this section exists for');

const runPin = (loc) => {
  const pin = mkEl('vh-loc-mappin');
  pin.style = {};
  const shape = mkEl('vh-loc-mapshape');
  shape.setAttribute('data-pdxhome', HOME_D);
  shape.setAttribute('d', HOME_D);
  const ctx = {
    console, Math, JSON, String, Array, Object, Number,
    _currentVoterLocation: loc, _hasUserLocation: true,
    document: {
      getElementById: (id) => (id === 'vh-loc-mappin' ? pin
        : id === 'vh-loc-mapshape' ? shape : null),
    },
  };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(SHAPES, ctx, { filename: 'index.html[state-outlines]' });
  vm.runInContext(PIN, ctx, { filename: 'voter-hub-location.js[_vhPositionLocPin]' });
  ctx._vhPositionLocPin(loc);
  const m = /translate\(([-0-9.]+),([-0-9.]+)\)/.exec(pin.getAttribute('transform') || '');
  must(!!m, 'the pin no longer carries a translate() transform, so nothing below can locate it');
  return { x: Number(m[1]), y: Number(m[2]), d: shape.getAttribute('d'), opacity: pin.style.opacity };
};

// Even-odd fill, the same rule the browser uses on these paths, over every ring.
const inside = (d, x, y) => {
  let hit = false;
  for (const ring of d.split('Z').filter(Boolean)) {
    const pts = ring.replace(/^M/, '').split('L').map((p) => p.trim().split(/\s+/).map(Number));
    for (let i = 0, n = pts.length; i < n; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % n];
      if (((y1 > y) !== (y2 > y)) && (x < (x2 - x1) * (y - y1) / (y2 - y1) + x1)) hit = !hit;
    }
  }
  return hit;
};

for (const [county, label] of [['Davis', 'Davis County'], ['Salt Lake', 'Salt Lake County'],
                               ['Washington', 'Washington County'], ['Uintah', 'Uintah County'],
                               ['Cache', 'Cache County']]) {
  const p = runPin({ state: 'Utah', county });
  ok(inside(p.d, p.x, p.y),
    `the pin for ${label} lands OUTSIDE the Utah outline it is dropped on (${p.x},${p.y}). The shape and ` +
    'the pin are projected by two different fits');
  eq(p.opacity, '1', `${label} resolves to a county centroid, so the pin is a precise claim and must not be dimmed`);
}

// And out of state: the shape is theirs, the pin is honestly imprecise. The saved
// record carries no coordinates outside the curated county table, so there is
// nothing to place precisely and the badge does not pretend otherwise.
const cop = runPin({ state: 'Colorado', city: 'Denver' });
ok(cop.d !== HOME_D, 'a Colorado reader\'s badge is still drawing Utah once the pin positioner has run');
eq(cop.d, co.d, 'the pin positioner and the painter disagree about what Colorado looks like');
ok(inside(cop.d, cop.x, cop.y),
  'the resting pin falls outside the state it is resting on, which reads as a place rather than as ' +
  '"we know the state and not the county"');
ok(cop.opacity !== '1',
  'the out-of-state pin is drawn at full strength, which presents the middle of the badge as this ' +
  'reader\'s actual position');

// ─────────────────────────────────────────────────────────────────────────────
console.log('');
if (failures.length) {
  console.error(`✗ wrm setter: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error('   · ' + f);
  process.exit(1);
}
console.log(`✓ wrm setter: all ${passed} assertions passed — one setter, above the seats, two faces and one ` +
  'owner for them; every other location control is a door to it\n');
