/* ═══════════════════════════════════════════════════════════════════════════
   test-who-represents-me.mjs — the representative-lookup front door
   ────────────────────────────────────────────────────────────────────────────
   "Who represents me" is the single most useful question this site can answer
   for someone who has never been here, and for a long time the answer lived
   underneath a flow named after something else. The lookup was real, it worked,
   and it was reachable — but only by a visitor who already believed PolitiDex
   could answer the question, and who therefore went to a section called "build
   your voting team" to find out. A first-time visitor had no reason to.

   This file pins the entry-point pass that fixed it. Four things have to stay
   true, and each of them is a way the fix could quietly rot:

     · THE FRONT DOOR EXISTS, ABOVE THE FOLD, IN THE HTML. The cold state is
       static markup — headline, supporting line, the three-step story and the
       primary CTA. An entry point that is painted by a deferred module is
       exactly the kind of thing that stops being an entry point the first time
       the module fails to load. Section 1 reads it out of index.html.

     · IT IS REACHABLE FROM THE CHROME, ON BOTH FORM FACTORS. A homepage band
       only helps someone who is on the homepage and scrolling. Section 2 pins
       the desktop pill and the mobile menu entry, and that both route through
       the one shared action rather than each inventing their own.

     · THERE IS ONE RESOLVER, NOT TWO. The Voter Hub's "who represents you now"
       strip and this new band answer the same question on the same page. A
       homepage that named a different member than the Hub would be worse than
       no homepage entry at all, so both read window.pdxRepsForMe(). Section 4
       drives that resolver; section 5 drives the band against it.

     · TEAM BUILDER IS STILL THERE, AND STILL DEEPER. The brief was to reorder
       the story, not to replace the destination. Section 3 checks the builder
       survived intact and gained a step-① way back, and section 6 checks the
       band never claims a score, a verdict or a party frame — everything it
       says about a record is said on the profile it opens, under that surface's
       existing lane rules.

   Sections:
     1. The front door is in the HTML, above Door 1, cold-state and all
     2. Chrome: the desktop pill, the mobile entry, one shared action
     3. Team Builder survived, and gained a step-① door back
     4. Driven: one resolver, and it never drops a level it could not resolve
     5. Driven: the band paints cold, warm, honestly partial, and non-Utah
     6. No scores, no verdicts, no party framing, and real thumb targets
     7. Statewide coverage, measured against the real shipped roster
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
  console.error(`\n✗ who-represents-me: STALE HARNESS — ${msg}\n`);
  process.exit(2);
};

const HTML = read('index.html');
const WRM = read('who-represents-me.js');
const VHL = read('voter-hub-location.js');

// The copy the brief specified, quoted once so every entry point below is
// checked against the same string rather than against its own paraphrase.
const CTA = '📍 See who represents me';
const LEAD = 'Find the officials with power over you';
// The nav entries carry a DIFFERENT line from the band. The band is already
// headed "SEE WHO REPRESENTS ME", so its lead only has to finish the sentence;
// a nav pill has three words of label and has to sell the whole spine — your
// seats, and the field running for each one — because it is the first click of
// the election path and not only a lookup. Both are checked, neither is assumed
// to be the other.
const NAV_LEAD = 'who holds power over you';

// ═════════════════════════════════════════════════════════════════════════════
// 1 · The front door is in the HTML, above Door 1, cold-state and all
// ═════════════════════════════════════════════════════════════════════════════
const secAt = HTML.indexOf('<section id="who-represents-me"');
must(secAt !== -1, 'index.html no longer contains the #who-represents-me section — everything below is vacuous');
const secEnd = HTML.indexOf('</section>', secAt);
const SEC = HTML.slice(secAt, secEnd);

// Placement is the whole point: a band a visitor has to hunt for is the buried
// path this pass exists to replace. It sits under the hero and above Door 1.
const heroAt = HTML.indexOf('id="hero"');
const doorAt = HTML.indexOf('id="pdx-door-truth"');
must(heroAt !== -1 && doorAt !== -1, 'index.html no longer has both #hero and #pdx-door-truth to position against');
ok(secAt > heroAt,
  'front door: the lookup band is above the hero, which is not a placement anyone designed — it\n' +
  '    belongs in the first content slot beneath it');
ok(secAt < doorAt,
  'front door: the lookup band has fallen below Door 1 — a first-time visitor now meets the record\n' +
  '    argument before being told this site can name their own representatives, which is the exact\n' +
  '    ordering the pass was meant to fix');

// Cold state is static. If the headline or the CTA ever moves into the module,
// a visitor whose deferred script 404s sees an empty band where the entry was.
has(SEC, 'SEE WHO <span class="wrm-accent">REPRESENTS ME</span>',
  'front door: the headline is not in the markup — the band no longer states the service at first paint');
has(SEC, LEAD,
  'front door: the supporting line no longer says what the lookup is for; "see who represents me"\n' +
  '    alone does not tell a cold visitor these are the people with power over them');
has(SEC, 'then see their records',
  'front door: the supporting line dropped the handoff to records, so the band promises a list and\n' +
  '    not accountability — the bridge to Door 1 is the reason this sits where it sits');
has(SEC, '>' + CTA + '<',
  `front door: the primary CTA is no longer the agreed copy "${CTA}"`);
has(SEC, 'Free public service',
  'front door: the band no longer says this is a public service, which is the line that stops it\n' +
  '    reading as a ballot toy');
has(SEC, 'No account needed',
  'front door: the band no longer says the lookup is free of a signup, which is the first thing a\n' +
  '    wary visitor assumes it is not');

// The reordered story, stated rather than inferred.
has(SEC, 'Find who represents you', 'front door: step ① is gone from the three-step story');
has(SEC, 'Inspect their records', 'front door: step ② is gone — records are what step ① is FOR');
has(SEC, 'Build your team', 'front door: step ③ is gone, so the band no longer bridges into Team Builder at all');
ok(SEC.indexOf('Find who represents you') < SEC.indexOf('Inspect their records')
  && SEC.indexOf('Inspect their records') < SEC.indexOf('Build your team'),
  'front door: the three steps are out of order — find → inspect → build IS the reorder this pass\n' +
  '    delivered, and any other sequence puts the buried path back');
ok(/Build your team<\/strong><em>Optional/.test(SEC),
  'front door: step ③ no longer marks team building optional, so the band reads as a funnel into a\n' +
  '    slate builder rather than a lookup service that happens to offer one');

// Coverage honesty in the cold state: name the levels, name which ones resolve
// from a state alone, and name what is not one. The band answers nationally for
// statewide seats and in Utah only for district seats, and a cold visitor is told
// which is which BEFORE they type an address — otherwise "see who represents me"
// promises a full ballot everywhere.
has(SEC, 'U.S. Senate and Governor',
  'front door: the scope note no longer names the statewide seats, which are the ones the band can\n' +
  '    resolve for every state — a visitor outside Utah has no idea it will answer for them at all');
has(SEC, 'U.S. House, State Senate and State House',
  'front door: the scope note no longer names which district seats are resolved, so "see who\n' +
  '    represents me" implies every level of government');
has(SEC, 'district lines',
  'front door: the scope note no longer says the district seats need district lines, so a blank row\n' +
  '    outside Utah reads as missing data rather than an unmapped boundary');
has(SEC, 'we say so where we don',
  'front door: the scope note dropped its admission about local offices — a lookup that silently\n' +
  '    omits a mayor is a completeness claim it cannot back');

// The module that paints the warm state is actually wired up.
has(HTML, '<script src="/who-represents-me.js"',
  'front door: who-represents-me.js is not loaded by index.html, so the band never leaves cold state');
ok(HTML.indexOf('<script src="/who-represents-me.js"') > secAt,
  'front door: the module is loaded before the section it paints into');
has(SEC, 'id="wrm-reps"', 'front door: the host the module paints the resolved reps into is gone');
has(SEC, 'aria-labelledby="wrm-title"', 'front door: the band is an unlabelled region to a screen reader');

// ═════════════════════════════════════════════════════════════════════════════
// 2 · Chrome: the desktop pill, the mobile entry, one shared action
// ═════════════════════════════════════════════════════════════════════════════
// Both form factors were named in the brief. A homepage band alone leaves the
// lookup unreachable from every other page position a visitor might be at.
const navEntries = HTML.match(/<a href="#who-represents-me"[^>]*>[^<]*<\/a>/g) || [];
eq(navEntries.length, 2,
  'chrome: there are not exactly two nav entries for the lookup — the requirement is one in the\n' +
  '    desktop bar and one in the mobile menu');
for (const [i, entry] of navEntries.entries()) {
  const where = i === 0 ? 'desktop pill' : 'mobile menu entry';
  has(entry, 'Who Represents Me', `chrome: the ${where} no longer says what it does`);
  has(entry, 'window.pdxFindMyReps()',
    `chrome: the ${where} does not call the shared action, so it can drift from the homepage CTA\n` +
    '    and land the visitor somewhere the other entry points do not');
  has(entry, 'event.preventDefault()',
    `chrome: the ${where} lets the anchor jump fire alongside the handler, which fights the\n` +
    '    handler\'s own smooth scroll');
  has(entry, NAV_LEAD,
    `chrome: the ${where} has no title explaining the lookup — the label alone is a section name,\n` +
    '    not an offer');
}
// The mobile one has to shut the menu behind it, or the visitor scrolls to a
// band they cannot see under a full-screen overlay.
has(navEntries[1], "getElementById('mobileMenu').classList.add('hidden')",
  'chrome: the mobile entry does not close the menu, so the lookup happens behind the overlay');

// The desktop bar has a documented width limit. Adding a pill without removing
// one is how that bar silently starts wrapping at 1280px.
const navBlock = HTML.slice(HTML.indexOf('THREE PILLS'), HTML.indexOf('THREE PILLS') + 6000);
must(HTML.indexOf('THREE PILLS') !== -1,
  'index.html no longer documents the nav pill structure — the ordering claim below is unanchored');
// Phase 3 nested #voter-hub into the Explore panel on the other side of the bar,
// so it is no longer the thing the lookup pill has to come before. The claim being
// tested is unchanged — the lookup is the FIRST item in the left group — so it is
// now read against the two doors that follow it, which are the only items left.
ok(navBlock.indexOf('#who-represents-me') < navBlock.indexOf('#say-vs-do'),
  'chrome: the lookup pill is no longer first in the desktop bar — the front step comes before Door 1,\n' +
  '    and the bar\'s own comment says so');
ok(navBlock.indexOf('#say-vs-do') < navBlock.indexOf('#my-politicians'),
  'chrome: Door 1 no longer precedes Door 2 in the left group');

// ═════════════════════════════════════════════════════════════════════════════
// 3 · Team Builder survived, and gained a step-① door back
// ═════════════════════════════════════════════════════════════════════════════
// The brief was explicit: do not replace Team Builder. It stays the deeper step.
has(HTML, 'id="my-politicians"',
  'team builder: the builder section is gone — this pass was a reorder, not a removal');
has(HTML, 'id="myteam-selected-panel"', 'team builder: the selected-team panel is gone');
ok((HTML.match(/⭐ My Voting Team/g) || []).length >= 2,
  'team builder: the builder lost its nav entries, so the deeper step became the buried one');
ok(HTML.indexOf('id="myteam-findreps"') < HTML.indexOf('id="myteam-selected-panel"'),
  'team builder: the "start one step earlier" strip is not the first thing in the builder\'s entry\n' +
  '    zone, so a visitor who lands there still meets slot-filling first');

const stripAt = HTML.indexOf('id="myteam-findreps"');
must(stripAt !== -1, 'index.html no longer has the #myteam-findreps strip — this section is vacuous');
const STRIP = HTML.slice(stripAt, HTML.indexOf('</div>', HTML.indexOf('myteam-findreps-btn')));
has(STRIP, 'Start one step earlier',
  'team builder: the strip no longer names the earlier step, so it reads as decoration');
has(STRIP, '>' + CTA + '<',
  `team builder: the strip's button is no longer the agreed copy "${CTA}"`);
has(STRIP, 'window.pdxFindMyReps()',
  'team builder: the strip does not route through the shared action');
has(STRIP, 'if you want one',
  'team builder: the strip no longer marks the team optional, which is the framing the reorder rests on');
// It has to retire itself, or a returning voter is told to do something they did.
has(HTML, 'window._myteamFindRepsSync = sync;',
  'team builder: the strip does not export its sync, so nothing can retire it on a location change');
has(VHL, 'window._myteamFindRepsSync()',
  'team builder: the location sync no longer retires the strip, so it survives past the step it\n' +
  '    describes and tells a located voter to find reps they already have');

// The journey breadcrumb should now open on the find step, not on districts.
has(HTML, '① Who Represents You',
  'team builder: the journey breadcrumb no longer opens on the find step');

// The start-here banner leads with the lookup too.
const shAt = HTML.indexOf('class="sh-cta-primary btn-tap"');
must(shAt !== -1, 'index.html no longer has the start-here primary CTA');
has(HTML.slice(shAt - 2500, shAt + 300), '>' + CTA + '<',
  `start-here: the banner's primary CTA is no longer "${CTA}" — it was the one place already asking\n` +
  '    for a location and it should ask for it in the visitor\'s words');
has(HTML.slice(shAt - 2500, shAt), 'SEE WHO <span class="sh-accent">REPRESENTS YOU</span>',
  'start-here: the banner headline went back to leading with team building');

// ═════════════════════════════════════════════════════════════════════════════
// 4 · Driven: one resolver, and it never drops a level it could not resolve
// ═════════════════════════════════════════════════════════════════════════════
// voter-hub-location.js is one long IIFE that boots against the live page, so
// the resolver is sliced out and driven directly. The slice starts at the
// statewide-seat helper rather than at pdxRepsForMe itself, because the two U.S.
// Senate rows and the Governor row resolve through it — slicing below it would
// leave every statewide assertion below silently blank and vacuously "honest".
const swFrom = VHL.indexOf('var _pdxStatewideCache = {};');
const resFrom = VHL.indexOf('window.pdxRepsForMe = function ()');
const resTo = VHL.indexOf('window._vhSyncDistrictStrip = function()', resFrom);
must(swFrom !== -1 && swFrom < resFrom,
  'voter-hub-location.js no longer defines the _pdxStatewideCache/_pdxStatewideSeats block above\n' +
  '  pdxRepsForMe — the statewide seats (U.S. Senate, Governor) have no resolver');
must(resFrom !== -1 && resTo > resFrom,
  'voter-hub-location.js no longer defines window.pdxRepsForMe above _vhSyncDistrictStrip — the\n' +
  '  shared-resolver contract this whole pass rests on is gone');
const RESOLVER = VHL.slice(swFrom, resTo);

// The strip must CONSUME the resolver rather than keep a private copy. Two
// surfaces deriving districts separately is the failure mode worth a test. Only
// the "who represents you now" rows are in scope here — the district-cards panel
// further down the same function is a different render with its own history.
const stripRowsEnd = VHL.indexOf('var btnLink =', resTo);
must(stripRowsEnd > resTo,
  'voter-hub-location.js no longer has the btnLink marker that ends the "who represents you now"\n' +
  '  rows block — the slice below would swallow the district-cards panel and test the wrong code');
const STRIPFN = VHL.slice(resTo, stripRowsEnd);
has(STRIPFN, 'window.pdxRepsForMe()',
  'resolver: the Voter Hub strip stopped reading the shared resolver, so the homepage band and the\n' +
  '    Hub can now name different people for the same address');
lacks(STRIPFN, '_pdxHouseRedistrict',
  'resolver: the strip re-derives redistricting itself again — that lives in the resolver so both\n' +
  '    surfaces tell the same story about a redrawn seat');
has(WRM, 'window.pdxRepsForMe',
  'resolver: the homepage band stopped reading the shared resolver');

// The synthetic roster the driven resolver resolves statewide seats against. Two
// Senate seats and a Governor for Utah, plus the traps a lazy office-string match
// would fall into: a state senator, a lieutenant governor and a governor
// CANDIDATE, none of whom hold the seats being resolved.
const ROSTER_UT = {
  'ut-sen-a': { name: 'Sen Ay', office: 'U.S. Senator', state: 'Utah', party: 'R' },
  'ut-sen-b': { name: 'Sen Bee', office: 'U.S. Senate Majority Whip', state: 'Utah', party: 'R' },
  'ut-gov': { name: 'Gov Gee', office: 'Governor', state: 'Utah', party: 'R' },
  'ut-ltgov': { name: 'Lt Gov', office: 'Lieutenant Governor', state: 'Utah', party: 'R' },
  'ut-govcand': { name: 'Gov Hopeful', office: 'Governor Candidate', state: 'Utah', party: 'D' },
  'ut-statesen': { name: 'State Sen', office: 'Utah State Senator', state: 'UT District 6', party: 'R' },
  'p-house': { name: 'Blake Moore', party: 'R', office: 'U.S. Representative', state: 'Utah · UT-1' },
  'p-sen': { name: 'Todd Weiler', party: 'R', office: 'Utah State Senator', state: 'UT District 23' },
  'p-rep': { name: 'Ray Ward', party: 'R', office: 'Utah State Representative', state: 'UT District 17' },
  'p-old': { name: 'Old Member', party: 'R', office: 'U.S. Representative', state: 'Utah · UT-2' },
};

const mkResolverCtx = (over) => {
  const ctx = {
    console, Math, JSON, String, Array, Object, Number, Boolean, RegExp,
    _hasUserLocation: true,
    _currentVoterLocation: { state: 'Utah', city: 'Bountiful', county: 'Davis', district: '1' },
    CMP_DATA: ROSTER_UT,
    _pdxVoterBallot: () => ({
      districts: { house: '1', senate: '23', lower: '17' },
      byOffice: {
        representative: { incumbentPid: 'p-house' },
        state_senator: { incumbentPid: 'p-sen' },
        state_rep: { incumbentPid: 'p-rep' },
      },
    }),
    keyRacesRelevantData: () => ({ matched: true, label: 'Bountiful, Davis County', byRace: {} }),
    _pdxHouseRedistrict: () => ({ changed: false }),
    ...over,
  };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(RESOLVER, ctx, { filename: 'voter-hub-location.js[pdxRepsForMe]' });
  return ctx;
};

// The level model, stated once. Six seats in two classes: three that resolve from
// the STATE alone (both U.S. Senate seats and the Governor) and three that need
// district lines. Every assertion about ordering, counting and blanking below is
// measured against this list.
const KEYS = 'ussenate1,ussenate2,house,governor,statesenate,statehouse';
const byKey = (reps, k) => reps.levels.filter((l) => l.key === k)[0];

const full = mkResolverCtx().pdxRepsForMe();
eq(full.located, true, 'resolver: a located visitor is reported as unlocated');
eq(full.levels.length, 6,
  'resolver: the level list is not the six seats the band now resolves — two U.S. Senate, U.S. House,\n' +
  '    Governor, State Senate, State House');
eq(full.levels.map((l) => l.key).join(','), KEYS,
  'resolver: the levels are not in the order both surfaces render — federal statewide, federal\n' +
  '    district, then the state seats');
eq(byKey(full, 'house').distLabel, 'U.S. House · District 1',
  'resolver: the district label a visitor reads changed shape');
eq(full.levels.filter((l) => l.resolved).length, 6,
  'resolver: a fully-resolved Utah address did not resolve all six seats — Utah is the one state\n' +
  '    with curated districts AND a full statewide roster, so it is the case that must be complete');
eq(full.area, 'Bountiful, Davis County', 'resolver: the area label a visitor recognises is gone');
eq(full.districtsResolvable, true,
  'resolver: a Utah visitor is reported as having no resolvable districts, which would blank the\n' +
  '    three seats PolitiDex actually maps');

// Statewide rows carry no district and say which state they cover — that label is
// also the only thing telling the two Senate rows apart from each other.
for (const k of ['ussenate1', 'ussenate2', 'governor']) {
  const lv = byKey(full, k);
  eq(lv.statewide, true, `resolver: ${k} is not flagged statewide, so a renderer cannot tell it needs no district`);
  eq(lv.district, null, `resolver: ${k} carries a district number — a statewide seat has no district`);
  ok(lv.distLabel.indexOf('District') === -1,
    `resolver: ${k} prints the word "District" in its heading, which invites a reader to take the\n` +
    '    state name for a district number');
}
eq(byKey(full, 'ussenate1').distLabel, 'U.S. Senate · Utah',
  'resolver: the U.S. Senate row no longer names the state it covers, so the two Senate rows are\n' +
  '    indistinguishable from each other');
eq(byKey(full, 'governor').distLabel, 'Governor · Utah',
  'resolver: the Governor row no longer names the state it covers');
eq(byKey(full, 'governor').pid, 'ut-gov',
  'resolver: Governor resolved to something other than the office holder — "Lieutenant Governor" and\n' +
  '    "Governor Candidate" are in this roster precisely so a loose match shows up here');
eq([byKey(full, 'ussenate1').pid, byKey(full, 'ussenate2').pid].sort().join(','), 'ut-sen-a,ut-sen-b',
  'resolver: the two U.S. Senate rows did not resolve to the state\'s two senators. A sitting senator\n' +
  '    frequently carries a leadership title instead of "U.S. Senator" ("U.S. Senate Majority Whip"\n' +
  '    here), and matching only the plain title drops one of the two');
eq(byKey(full, 'house').statewide, false,
  'resolver: the U.S. House is flagged statewide — it is the federal seat that needs a district');

// The honesty case. A level with no officeholder must survive as an explicit
// unresolved entry, because a list of two reads as complete.
const partial = mkResolverCtx({
  _pdxVoterBallot: () => ({
    districts: { house: '1' },
    byOffice: { representative: { incumbentPid: 'p-house' } },
  }),
  keyRacesRelevantData: () => ({ matched: false }),
}).pdxRepsForMe();
eq(partial.levels.length, 6,
  'resolver: an unresolved seat was DROPPED from the list — the remaining rows then read as the\n' +
  '    complete answer, which is precisely the fake completeness claim the brief forbids');
eq(partial.levels.filter((l) => l.resolved).length, 4,
  'resolver: the two state legislative seats with no officeholder still report themselves resolved\n' +
  '    (or the statewide seats stopped resolving when the curated ballot went thin)');
eq(byKey(partial, 'statesenate').pid, null, 'resolver: an unresolved level carries a stale pid');

// No location, and the national pseudo-location, both have to be legible to the
// band as "do not paint an answer".
const cold = mkResolverCtx({ _hasUserLocation: false }).pdxRepsForMe();
eq(cold.located, false, 'resolver: a visitor with no location is reported as located');
const nat = mkResolverCtx({ _currentVoterLocation: { state: 'National' } }).pdxRepsForMe();
eq(nat.national, true,
  'resolver: the national pseudo-location is not flagged, so the band would claim a nationwide\n' +
  '    visitor has three specific seats');
eq(nat.levels.filter((l) => l.resolved).length, 0,
  'resolver: the national pseudo-location resolved seats for somebody — "National" is not a state\n' +
  '    and has neither senators nor a governor of its own');

// Redistricting travels with the resolver, so both surfaces say the same thing.
const redrawn = mkResolverCtx({
  _pdxHouseRedistrict: () => ({ changed: true, currentPid: 'p-old', currentDistrict: '2' }),
}).pdxRepsForMe();
eq(redrawn.redrawn, true, 'resolver: a redrawn House seat is no longer flagged to its callers');
eq(byKey(redrawn, 'house').pid, 'p-old',
  'resolver: a redrawn seat names the future member as the current one — who represents you NOW is\n' +
  '    the question the band asked');
eq(byKey(redrawn, 'house').distLabel, 'U.S. House · District 2',
  'resolver: the redrawn row pairs the current member with a district number that is not theirs —\n' +
  '    the label and the name it opens have to describe the same seat');

// ═════════════════════════════════════════════════════════════════════════════
// 5 · Driven: the band paints cold, warm, and honestly partial
// ═════════════════════════════════════════════════════════════════════════════
const mkEl = (id) => {
  const attrs = {};
  return {
    id, innerHTML: '', _attrs: attrs,
    setAttribute: (k, v) => { attrs[k] = String(v); },
    removeAttribute: (k) => { delete attrs[k]; },
    getAttribute: (k) => (k in attrs ? attrs[k] : null),
    scrollIntoView() { this._scrolled = true; },
  };
};

const runBand = (over) => {
  const sec = mkEl('who-represents-me');
  const host = mkEl('wrm-reps');
  const timers = [];
  const ctx = {
    console, Math, JSON, String, Array, Object, Number, Boolean, RegExp,
    setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
    document: {
      readyState: 'complete',
      getElementById: (i) => (i === 'who-represents-me' ? sec : (i === 'wrm-reps' ? host : null)),
      addEventListener: () => {},
    },
    _hasUserLocation: true,
    _pdxPersonById: (pid) => ({
      'p-us1': { name: 'John Curtis', party: 'R', office: 'U.S. Senator' },
      'p-us2': { name: 'Mike Lee', party: 'R', office: 'U.S. Senator' },
      'p-house': { name: 'Blake Moore', party: 'R', office: 'U.S. Representative' },
      'p-gov': { name: 'Spencer Cox', party: 'R', office: 'Governor' },
      'p-sen': { name: 'Todd Weiler', party: 'R', office: 'State Senator' },
      'p-rep': { name: 'Ray Ward', party: 'R', office: 'State Representative' },
    }[pid] || null),
    _getPhotoUrl: () => '/img/x.jpg',
    // Local coverage is an ANSWER from compare-hub's window.pdxLocalSeatsForMe(),
    // not an inference from the state. The default here is a curated area WITH
    // local seats; the cases below override it to the two other states.
    pdxLocalSeatsForMe: () => ({
      resolved: true, ok: true, area: 'Bountiful, Davis County', county: 'Davis County',
      pids: ['loc-a', 'loc-b', 'loc-c'],
    }),
    ...over,
  };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(WRM, ctx, { filename: 'who-represents-me.js' });
  return { ctx, sec, host, timers };
};

// Cold: no resolver at all. The band must fall back to the static markup rather
// than paint half an answer.
const noRes = runBand({ pdxRepsForMe: undefined });
eq(noRes.host.innerHTML, '',
  'band: with no resolver present the band still painted something into the reps host — there is no\n' +
  '    valid partial state where a visitor sees rep rows and no way to have got them');
eq(noRes.sec.getAttribute('data-located'), null,
  'band: the band marked itself located without a resolver, which hides the static cold state and\n' +
  '    leaves an empty box where the entry point was');

// Cold: resolver present, no location. Same requirement.
const unloc = runBand({ pdxRepsForMe: () => ({ located: false, levels: [] }) });
eq(unloc.host.innerHTML, '', 'band: an unlocated visitor got rep rows');
eq(unloc.sec.getAttribute('data-located'), null,
  'band: an unlocated visitor lost the cold state, so there is no CTA to set a location with');

// Warm, in Utah: all six seats resolved — two statewide from the state alone,
// three district seats from mapped boundaries, and the Governor.
const SW = (key, label, color, pid) => ({
  key, label, tierLabel: label, color, statewide: true, district: null,
  distLabel: label + ' · Utah', pid, resolved: !!pid,
});
const LEVELS6 = [
  SW('ussenate1', 'U.S. Senate', '#f0abfc', 'p-us1'),
  SW('ussenate2', 'U.S. Senate', '#f0abfc', 'p-us2'),
  { key: 'house', label: 'U.S. House', tierLabel: 'U.S. House of Representatives', color: '#60a5fa', statewide: false, district: '1', distLabel: 'U.S. House · District 1', pid: 'p-house', resolved: true },
  SW('governor', 'Governor', '#fbbf24', 'p-gov'),
  { key: 'statesenate', label: 'State Senate', tierLabel: 'State Senate', color: '#a78bfa', statewide: false, district: '23', distLabel: 'State Senate · District 23', pid: 'p-sen', resolved: true },
  { key: 'statehouse', label: 'State House', tierLabel: 'State House', color: '#2dd4bf', statewide: false, district: '17', distLabel: 'State House · District 17', pid: 'p-rep', resolved: true },
];
const warm = runBand({
  pdxRepsForMe: () => ({ located: true, national: false, state: 'Utah', area: 'Bountiful, Davis County', redrawn: false, districtsResolvable: true, levels: LEVELS6 }),
});
const OUT = warm.host.innerHTML;
must(OUT.length > 0, 'the band painted nothing for a fully-resolved visitor — section 5 is vacuous');
eq(warm.sec.getAttribute('data-located'), '1',
  'band: the band did not mark itself located, so the cold CTA sits on top of the answer');
for (const n of ['John Curtis', 'Mike Lee', 'Blake Moore', 'Spencer Cox', 'Todd Weiler', 'Ray Ward']) {
  has(OUT, n, `band: ${n} is missing from the answer — the band resolved a seat and did not name it`);
}
has(OUT, 'U.S. House · District 1',
  'band: a row no longer states which district it is, so "your representative" is unverifiable');
// Every "U.S. House · District 1" style label the band paints, in order.
const rowLabels = (html) =>
  (html.match(/class="wrm-rowlevel"[^>]*>([^<]*)</g) || []).map((s) => s.slice(s.indexOf('>') + 1, -1));

has(OUT, 'U.S. Senate · Utah',
  'band: a statewide row no longer says which state it is for — a Senate seat is answered from the\n' +
  '    state alone, and saying so is what distinguishes it from a district row that needs boundaries');
const utLabels = rowLabels(OUT);
eq(utLabels.length, 6, 'band: the six rows did not each paint a seat label — the label assertions below are vacuous');
ok(!utLabels.some((l) => /U\.S\. Senate|Governor/.test(l) && /District/.test(l)),
  'band: a statewide row printed a district number — U.S. Senate and Governor are elected statewide\n' +
  '    and have no district, so any number there is invented: ' + JSON.stringify(utLabels));
eq((OUT.match(/See their record ›/g) || []).length, 6,
  'band: not every named official offers the record jump — the bridge from "my reps" to "their\n' +
  '    records" is the point of the band, and a name with no way through is a dead end');
eq((OUT.match(/window\.showProfile\(/g) || []).length, 12,
  'band: the six rows do not each carry BOTH a click and a keydown route into the profile, so\n' +
  '    the record jump is either a label rather than a control, or a control only a mouse can use');
has(OUT, 'Bountiful, Davis County',
  'band: the answer no longer says which area it is for, so a visitor cannot tell it used their address');
has(OUT, '6 of 6 seats resolved',
  'band: the coverage count is gone — it is what makes a partial answer legible as partial');
lacks(OUT, 'wrm-scopenote',
  'band: a visitor whose district seats DID resolve is still told the district seats cannot be\n' +
  '    resolved for them — the two-speed caveat only applies where it is true');

// The next actions, in the order the band promised: records first, team optional.
has(OUT, 'Compare them on an issue', 'band: the post-lookup step into issues is gone');
has(OUT, 'Build my voting team', 'band: the post-lookup bridge into Team Builder is gone');
has(OUT, '(optional)',
  'band: team building is no longer marked optional after the lookup, so the band funnels rather\n' +
  '    than offers');
ok(OUT.indexOf('Compare them on an issue') < OUT.indexOf('Build my voting team'),
  'band: team building now precedes the record/issue step in the next actions — the whole reorder is\n' +
  '    that accountability comes before list-building');
has(OUT, 'My local officials',
  'band: the band no longer points at local offices at all, which turns its own scope note into a\n' +
  '    dead end rather than a handoff');
has(OUT, '(3)',
  'band: the local handoff no longer states how many local seats it will open. The count is what\n' +
  '    makes the promise checkable BEFORE the tap rather than after it');
lacks(OUT, 'wrm-localgap',
  'band: a visitor who HAS local seats is told local offices are not mapped for their area — the\n' +
  '    coverage note and the coverage button are mutually exclusive by definition');
has(OUT, 'Change my location',
  'band: there is no way to correct a wrong address from the answer');
has(OUT, "my-politicians",
  'band: the Team Builder bridge does not target the builder section');

// Honestly partial: one unresolved seat must be STATED.
const partialBand = runBand({
  pdxRepsForMe: () => ({
    located: true, national: false, state: 'Utah', area: 'Bountiful', redrawn: false, districtsResolvable: true,
    levels: LEVELS6.map((l) => (l.key === 'statesenate' ? { ...l, pid: null, resolved: false } : l)),
  }),
});
const POUT = partialBand.host.innerHTML;
has(POUT, 'Not resolved for your area yet',
  'band: an unresolved seat is rendered as nothing at all — the visitor then reads five rows as the\n' +
  '    complete answer, which is a completeness claim the data does not support');
has(POUT, 'State Senate',
  'band: the unresolved row does not even name which seat is missing, so the gap is invisible');
has(POUT, '5 of 6 seats resolved',
  'band: the count does not report the gap, so a partial answer prints as a whole one');
eq((POUT.match(/See their record ›/g) || []).length, 5,
  'band: the unresolved seat offers a record jump to a person who was never resolved');

// ── Outside Utah: statewide seats answered, district seats blank, and said so.
// This is the whole point of the change. A visitor in Columbus is inside the
// product's national coverage for Senate and Governor and outside its district
// coverage entirely, and the band has to render both halves of that truth
// without ever printing a Utah district number under an Ohio city.
const OHIO_LEVELS = [
  { ...SW('ussenate1', 'U.S. Senate', '#f0abfc', 'p-us1'), distLabel: 'U.S. Senate · Ohio' },
  { ...SW('ussenate2', 'U.S. Senate', '#f0abfc', null), distLabel: 'U.S. Senate · Ohio' },
  { key: 'house', label: 'U.S. House', tierLabel: 'U.S. House of Representatives', color: '#60a5fa', statewide: false, district: null, distLabel: 'U.S. House', pid: null, resolved: false },
  { ...SW('governor', 'Governor', '#fbbf24', 'p-gov'), distLabel: 'Governor · Ohio' },
  { key: 'statesenate', label: 'State Senate', tierLabel: 'State Senate', color: '#a78bfa', statewide: false, district: null, distLabel: 'State Senate', pid: null, resolved: false },
  { key: 'statehouse', label: 'State House', tierLabel: 'State House', color: '#2dd4bf', statewide: false, district: null, distLabel: 'State House', pid: null, resolved: false },
];
const oh = runBand({
  pdxRepsForMe: () => ({ located: true, national: false, state: 'Ohio', area: 'Columbus, Franklin County', redrawn: false, districtsResolvable: false, levels: OHIO_LEVELS }),
  // What the real resolver returns for Columbus: located, and no local roster.
  // Verified against compare-hub's own rendered local group.
  pdxLocalSeatsForMe: () => ({ resolved: true, ok: false, area: 'Columbus, Franklin County', county: 'Franklin County', pids: [] }),
});
const OHOUT = oh.host.innerHTML;
must(OHOUT.length > 0, 'the band painted nothing outside Utah — the non-Utah assertions below are vacuous');
const ohLabels = rowLabels(OHOUT);
eq(ohLabels.length, 6, 'band: the Ohio visitor did not get six seat rows — the label assertions below are vacuous');
ok(!ohLabels.some((l) => /District|Utah/.test(l)),
  'band: a visitor outside the district-mapped states was shown a district number or a Utah label.\n' +
  '    Every district label the app holds is Utah geometry, so a number here is another state\'s seat\n' +
  '    printed under this visitor\'s city — the single worst thing this surface can do: ' +
  JSON.stringify(ohLabels));
lacks(OHOUT, '· District',
  'band: a district number reached a non-Utah answer somewhere outside the seat labels');
for (const n of ['Blake Moore', 'Todd Weiler', 'Ray Ward']) {
  lacks(OHOUT, n, `band: ${n} — a Utah district officeholder — was named for an Ohio visitor`);
}
has(OHOUT, 'Spencer Cox',
  'band: the Governor row did not resolve outside Utah, but a governor needs only a state — dropping\n' +
  '    it wastes coverage the roster already has');
has(OHOUT, '2 of 6 seats resolved',
  'band: the count outside Utah does not report over the real level set, so the answer either\n' +
  '    overclaims or hides which seats are blank');
has(OHOUT, 'wrm-scopenote',
  'band: outside the district-mapped states the band leaves three rows blank and says nothing about\n' +
  '    why — an unexplained blank reads as a broken lookup rather than an honest limit');
has(OHOUT, 'someone else',
  'band: the scope note does not say the blanks are deliberate — "we would rather show you nothing\n' +
  '    than someone else\'s district" is the sentence that turns a gap into a promise');
lacks(OHOUT, 'My local officials',
  'band: the band offers a local-officials jump outside its curated coverage, which sends a visitor\n' +
  '    to a page that has nothing for them');
has(OHOUT, 'Local offices aren',
  'band: outside curated local coverage the band drops the handoff and says NOTHING, so a missing\n' +
  '    button reads as "this site has no local layer" rather than "we have not mapped your county".\n' +
  '    The gap has to be stated where the offer would have been');
has(OHOUT, 'Columbus, Franklin County',
  'band: the local-coverage note does not name the area it is missing, which makes it a generic\n' +
  '    apology rather than a checkable statement about this visitor');
has(OHOUT, 'don&rsquo;t represent you',
  'band: the local-coverage note no longer says WHY the gap is left as a gap. "We would rather say so\n' +
  '    than hand you people who do not represent you" is the whole reason this pass exists — the old\n' +
  '    behaviour scrolled the visitor onto the President and Cabinet groups instead');
has(OHOUT, 'No record on file yet',
  'band: the second Ohio Senate seat has no person on file and rendered as nothing — a missing\n' +
  '    statewide seat must read as blank-on-purpose, not be silently dropped from the list');

// Redistricting has to be said, not silently resolved to one of the two answers.
const redrawnBand = runBand({
  pdxRepsForMe: () => ({ located: true, national: false, state: 'Utah', area: 'Bountiful', redrawn: true, districtsResolvable: true, levels: LEVELS6 }),
});
has(redrawnBand.host.innerHTML, 'redrawn',
  'band: a redrawn district is not mentioned, so the visitor is shown a current member with no hint\n' +
  '    that the seat they vote in has changed');

// The shared action: land on the band, and only open the picker when there is
// nothing to show yet.
const act = runBand({ pdxRepsForMe: () => ({ located: false, levels: [] }), _hasUserLocation: false, openLocationModal: function () { act.ctx._opened = true; } });
must(typeof act.ctx.pdxFindMyReps === 'function', 'window.pdxFindMyReps was not exported — the entry points call nothing');
act.ctx.pdxFindMyReps();
eq(act.sec._scrolled, true,
  'action: the shared action does not bring the band into view, so a nav tap lands the visitor\n' +
  '    nowhere in particular');
const opener = act.timers.filter((t) => t.ms === 260)[0];
must(!!opener, 'the shared action no longer defers the picker open — the assertion below is vacuous');
opener.fn();
eq(act.ctx._opened, true,
  'action: with no location set the picker never opens, so the CTA scrolls to a band that cannot\n' +
  '    answer the question it just asked');

const actWarm = runBand({
  pdxRepsForMe: () => ({ located: true, national: false, state: 'Utah', area: 'Bountiful', redrawn: false, districtsResolvable: true, levels: LEVELS6 }),
  openLocationModal: function () { actWarm.ctx._opened = true; },
});
actWarm.ctx.pdxFindMyReps();
ok(!actWarm.timers.some((t) => t.ms === 260),
  'action: a visitor who already has a location is shown the location picker again on every tap of\n' +
  '    the nav pill, instead of just being taken to their answer');

// ═════════════════════════════════════════════════════════════════════════════
// 6 · No scores, no verdicts, no party framing, and real thumb targets
// ═════════════════════════════════════════════════════════════════════════════
// This surface makes no claim about anybody's record. Everything it says about
// one is said on the profile it opens, under that surface's existing formal vs
// public lane rules — so there is nothing here to get wrong, and nothing here
// that needs a lane.
const textOf = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
// OHOUT is in the sweep because the non-Utah answer carries copy the Utah answer
// never paints — the scope note explaining the blanks. New copy is exactly where
// a stray "aligned" or "party line" would enter.
const BAND_TEXT = textOf(SEC.slice(SEC.indexOf('</style>'))) + ' ' + textOf(OUT) + ' ' + textOf(POUT) +
  ' ' + textOf(OHOUT);
for (const word of ['% match', 'Direction Match', 'aligned', 'loyalty', 'votes with', 'grade', 'score']) {
  lacks(BAND_TEXT.toLowerCase(), word.toLowerCase(),
    `lane: the lookup band says "${word}" — it is a name-and-district surface that makes no claim\n` +
    '    about a record, and any figure printed here would be one made outside the lane rules the\n' +
    '    profile it links to enforces');
}
// The party letter is an identifier printed beside a name, the way a ballot
// prints it. What must not appear is a frame built ON it.
for (const frame of ['Republicans', 'Democrats', 'party line', 'his party', 'their party', 'party-line']) {
  lacks(BAND_TEXT, frame,
    `lane: the band frames its answer in terms of "${frame}" — the reps a visitor gets are the reps\n` +
    '    they get, and nothing on this surface groups them by party');
}
lacks(WRM, '_recordDirectionIndex',
  'lane: the band reads the record-direction index — it is a lookup surface and must not compute a\n' +
  '    characterisation of anyone');
lacks(WRM, 'consistency',
  'lane: the band reached into the consistency engine, which is a claim it has no business making');

// Mobile was named explicitly in the brief. Every tappable is a real target and
// the CTA row stacks rather than truncating.
const styleAt = SEC.indexOf('<style id="wrm-styles">');
const CSS = SEC.slice(styleAt, SEC.indexOf('</style>', styleAt));
ok(/\.wrm-cta\{[^}]*min-height:\s*4[89]px/.test(CSS.replace(/\s*\n\s*/g, '')),
  'mobile: the primary CTA is under the 48px touch floor — it is the single most important target\n' +
  '    on the page for a first-time visitor');
ok(/\.wrm-cta2\{[^}]*min-height:\s*4[4-9]px/.test(CSS.replace(/\s*\n\s*/g, '')),
  'mobile: the map CTA is under the 44px touch floor');
ok(/\.wrm-next-btn\{[^}]*min-height:\s*4[4-9]px/.test(CSS.replace(/\s*\n\s*/g, '')),
  'mobile: the post-lookup actions are under the 44px touch floor');
has(CSS, '@media (max-width:600px)',
  'mobile: the band has no phone rules, so the two CTAs sit side by side on a 360px screen');
has(CSS, '.wrm-ctarow{flex-direction:column;}',
  'mobile: the CTA row does not stack on a phone');
has(CSS, 'prefers-reduced-motion',
  'mobile: the band animates unconditionally, unlike the rest of the page chrome');
has(CSS, '.wrm[data-located] .wrm-cold{display:none;}',
  'band: the cold state is not hidden once an answer is painted, so a located visitor reads "set\n' +
  '    your location once" above their own representatives');

// Rows are keyboard-operable, since the whole row is the control.
has(WRM, 'tabindex="0"', 'a11y: the rep rows cannot be reached by keyboard');
has(WRM, 'onkeydown=', 'a11y: the rep rows cannot be activated by keyboard');
has(WRM, "role=\"button\"", 'a11y: the rep rows are divs with a click handler and no role');

// ═════════════════════════════════════════════════════════════════════════════
// 7 · Statewide seats, measured against the REAL roster
// ═════════════════════════════════════════════════════════════════════════════
// Sections 4 and 5 drive the resolver against a synthetic roster, which proves the
// logic and proves nothing about coverage. The claim this pass makes to a visitor
// in Columbus is a claim about the SHIPPED data: that their two Senate seats and
// their Governor can be answered from their state alone. So the real cmp-data.js
// roster is loaded and every state is asked.
//
// The classifier is the fragile part, and it is fragile in one direction. Sitting
// senators are routinely filed under a leadership or committee title rather than
// "U.S. Senator" — the Majority Leader, the President pro tempore, the Assistant
// Democratic Leader — so a matcher that looks for the plain office silently drops
// one of a state's two seats and the band renders a blank next to a person the
// roster has had all along. That is a coverage regression no assertion about
// synthetic data can catch, which is why the counts below are measured here.
const STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
  'Wisconsin', 'Wyoming',
];

const realCtx = (() => {
  const ctx = { console, Math, JSON, String, Array, Object, Number, Boolean, RegExp };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(read('cmp-data.js'), ctx, { filename: 'cmp-data.js' });
  vm.runInContext(RESOLVER, ctx, { filename: 'voter-hub-location.js[statewide]' });
  return ctx;
})();
must(realCtx.CMP_DATA && Object.keys(realCtx.CMP_DATA).length > 400,
  'the real roster did not load — every coverage number in section 7 would be measured against nothing');
must(typeof realCtx._pdxStatewideSeats === 'function',
  'window._pdxStatewideSeats is not exported — section 7 is vacuous');

const SW_BY_STATE = {};
STATES.forEach((s) => { SW_BY_STATE[s] = realCtx._pdxStatewideSeats(s); });

// Governors: one state, one governor, no exceptions. This is the seat with the
// least room for ambiguity, so a miss here means the matcher broke, not the data.
const govMissing = STATES.filter((s) => !SW_BY_STATE[s].governor);
eq(govMissing.length, 0,
  'coverage: a state resolved no Governor from the shipped roster. Every state has exactly one and\n' +
  '    the roster holds all fifty, so a blank Governor row is the matcher failing, not a gap: ' +
  JSON.stringify(govMissing));

// Senators: at least one everywhere, and both in the overwhelming majority. The
// floor is deliberately below the measured 48 so a single roster edit does not
// fail the suite, and deliberately well above the 42 a title-blind matcher yields.
const senZero = STATES.filter((s) => SW_BY_STATE[s].senators.length === 0);
eq(senZero.length, 0,
  'coverage: a state resolved no U.S. Senator at all. Statewide seats are the entire national promise\n' +
  '    of this band — a state with neither senator has nothing resolved and reads as uncovered: ' +
  JSON.stringify(senZero));
const senBoth = STATES.filter((s) => SW_BY_STATE[s].senators.length === 2).length;
ok(senBoth >= 45,
  'coverage: only ' + senBoth + ' of 50 states resolve BOTH Senate seats, down from 48. The usual cause\n' +
  '    is a matcher that wants the literal office "U.S. Senator" and so drops every senator filed under\n' +
  '    a leadership or committee title — the second seat then renders blank beside a record we hold');

// The exact regression above, named. Each of these is a sitting senator whose
// office string is a title, not the seat.
for (const [pid, state] of [['thune', 'South Dakota'], ['grassley', 'Iowa'], ['lujan', 'New Mexico'], ['wyden', 'Oregon'], ['heinrich', 'New Mexico']]) {
  must(!!realCtx.CMP_DATA[pid], `the roster no longer holds ${pid} — this leadership-title assertion is vacuous`);
  ok(SW_BY_STATE[state].senators.indexOf(pid) !== -1,
    `coverage: ${realCtx.CMP_DATA[pid].name} did not resolve as a ${state} Senate seat. Their office reads\n` +
    `    "${realCtx.CMP_DATA[pid].office}" — a leadership title, not the seat — and matching the seat name\n` +
    '    alone is exactly how a sitting senator becomes a blank row');
}

// No seat is claimed twice. A pid resolving as two states' senator would mean a
// visitor in one state is shown a person who represents another — the leak, in a
// different door.
const claims = {};
STATES.forEach((s) => {
  SW_BY_STATE[s].senators.concat(SW_BY_STATE[s].governor || []).forEach((pid) => {
    (claims[pid] = claims[pid] || []).push(s);
  });
});
const doubled = Object.keys(claims).filter((p) => claims[p].length > 1);
eq(doubled.length, 0,
  'coverage: a person resolved as the statewide officeholder of more than one state, which means one\n' +
  '    of those visitors is being shown somebody else\'s senator: ' +
  JSON.stringify(doubled.map((p) => p + '→' + claims[p].join('/'))));

// Nobody resolved as a U.S. Senate seat may be a STATE legislator. This is the
// reject-first half of the classifier: "Senate" appears in both offices, and only
// the rejections keep a state senator out of a federal row.
const senOffices = [];
STATES.forEach((s) => SW_BY_STATE[s].senators.forEach((pid) => {
  senOffices.push([pid, String((realCtx.CMP_DATA[pid] || {}).office || '')]);
}));
must(senOffices.length > 90, 'fewer than 90 senators resolved — the office-shape assertion below is vacuous');
const badSen = senOffices.filter(([, o]) => /\bstate\s+senat/i.test(o) || /\bformer\b/i.test(o));
eq(badSen.length, 0,
  'coverage: a state legislator or a former member resolved into a U.S. Senate row. Both office\n' +
  '    strings contain the word "Senate", so the federal match only holds because it rules the state\n' +
  '    seats out first: ' + JSON.stringify(badSen));

// Partial senate coverage is a real state of the shipped data, not a hypothetical.
// It must resolve what it has and blank the rest — never pad to two.
const onlyOne = STATES.filter((s) => SW_BY_STATE[s].senators.length === 1);
must(onlyOne.length > 0,
  'no state has partial Senate coverage any more — the partial-coverage assertions below are vacuous\n' +
  '    (this is good news; delete them rather than let them pass on nothing)');
for (const s of onlyOne) {
  eq(SW_BY_STATE[s].ambiguous, false,
    `coverage: ${s} holds one senator and the resolver called that ambiguous, which throws away the\n` +
    '    seat it does have — ambiguity is having too MANY claimants, not too few');
  ok(!!SW_BY_STATE[s].governor,
    `coverage: ${s} lost its Governor along with its second senator — the seats resolve independently`);
}

// Over-claiming is the other failure. Three senators on file for one state means
// the roster disagrees with itself, and there is no honest way to pick two.
const overClaimed = STATES.filter((s) => SW_BY_STATE[s].senators.length > 2);
eq(overClaimed.length, 0,
  'coverage: a state resolved more than two U.S. Senate seats, which is not a thing that exists — the\n' +
  '    matcher is catching somebody it should not: ' + JSON.stringify(overClaimed));
const ambiguousStates = STATES.filter((s) => SW_BY_STATE[s].ambiguous);
eq(ambiguousStates.length, 0,
  'coverage: a state came back ambiguous, so its statewide rows render blank for every visitor there.\n' +
  '    That is the right behaviour for contradictory data and the wrong state for shipped data to be\n' +
  '    in: ' + JSON.stringify(ambiguousStates));

// A state name is the ONLY key. Anything that is not one resolves to nothing,
// which is what keeps a stray district label or a pseudo-location from matching.
for (const k of ['', 'National', 'District 2', 'UT-1', 'Franklin County', 'Davis']) {
  const r = realCtx._pdxStatewideSeats(k);
  ok(r.senators.length === 0 && !r.governor,
    `resolver: _pdxStatewideSeats(${JSON.stringify(k)}) resolved a seat. Only a plain state name is a\n` +
    '    valid key — matching anything looser is how a district label becomes a statewide answer');
}
// The normalisation that makes the above safe cuts the other way too: the roster's
// own state fields are dirty ("Utah · UT-1", "UT District 6"), so the leading state
// name is all that is ever compared. A key that reduces to a state still matches.
eq(JSON.stringify(realCtx._pdxStatewideSeats('Ohio · OH-3')), JSON.stringify(SW_BY_STATE.Ohio),
  'resolver: a state field with a district suffix no longer reduces to its state, which would drop\n' +
  '    every officeholder the roster files as "Utah · UT-1" out of their own statewide lookup');


// ═══════════════════════════════════════════════════════════════════════════
// 8 · LOCAL COVERAGE HAS THREE STATES, AND NONE OF THEM ROUTES ANYWHERE ELSE
// ═══════════════════════════════════════════════════════════════════════════
// The bug this section exists to keep fixed: the local handoff used to be gated
// on reps.districtsResolvable, which is a STATE-wide flag. Local rosters are
// curated county by county, so the button appeared in areas that had none, and
// window.jumpToRelevantAccordion('local') then found no local group to open and
// scrolled to #relevant-section — whose first two groups are President and
// Cabinet, added before any state check. A visitor asking for their mayor landed
// on a slate of national figures, every one of them real and none of them theirs.
//
// The gate is now an answer, not an inference, and it has three outcomes. Each
// one must produce exactly one of: a counted button, a stated gap, or silence.
// What none of them may produce is a button that cannot be honoured.
const localCase = (cov) => runBand({
  pdxRepsForMe: () => ({
    located: true, national: false, state: 'Utah', area: 'Bountiful, Davis County',
    redrawn: false, districtsResolvable: true, levels: LEVELS6,
  }),
  pdxLocalSeatsForMe: cov === undefined ? undefined : () => cov,
}).host.innerHTML;

// resolved + seats → a button that states its own count.
const covYes = localCase({ resolved: true, ok: true, area: 'Bountiful, Davis County', county: 'Davis County', pids: ['a', 'b'] });
has(covYes, 'My local officials',
  'coverage: a visitor WITH local seats is not offered them, so real coverage goes unused');
has(covYes, '(2)',
  'coverage: the handoff does not state how many seats it opens — an uncounted promise is the shape\n' +
  '    the old districtsResolvable gate had, and it is what broke');
lacks(covYes, 'wrm-localgap',
  'coverage: a visitor with local seats is ALSO told local offices are not mapped for their area');

// resolved + none → the gap is stated, and there is no route out of it.
const covNo = localCase({ resolved: true, ok: false, area: 'Ogden, Weber County', county: 'Weber County', pids: [] });
lacks(covNo, 'My local officials',
  'coverage: the handoff is still offered in an area with zero local seats. This is the exact\n' +
  '    condition that dumped visitors onto the President/Cabinet groups');
lacks(covNo, "jumpToRelevantAccordion('local')",
  'coverage: an area with no local seats still wires the local jump somewhere in its markup. The\n' +
  '    guard inside jumpToRelevantAccordion is a backstop, not a licence to keep firing it');
has(covNo, 'Ogden, Weber County',
  'coverage: the gap note does not name the area it is missing');
has(covNo, 'Local offices aren',
  'coverage: an area with no local seats says nothing at all about it — silence here reads as "no\n' +
  '    local layer exists" rather than "your county is not mapped yet"');

// unresolved (no location, or compare-hub not loaded) → claim nothing either way.
// Silence is correct here and ONLY here: we do not know, so we neither offer nor
// deny. Printing the gap note would assert a gap we have not established.
for (const [label, cov] of [
  ['no location', { resolved: false, ok: false, area: '', county: '', pids: [] }],
  ['resolver absent', undefined],
]) {
  const OUTU = localCase(cov);
  lacks(OUTU, 'My local officials',
    `coverage (${label}): the handoff is offered without an answer behind it. An absent resolver must\n` +
    '    never read as permission — that is precisely how a button outruns its coverage');
  lacks(OUTU, 'wrm-localgap',
    `coverage (${label}): the band asserts local offices are unmapped for this area without having\n` +
    '    resolved whether they are. Not knowing and knowing-there-is-nothing are different claims');
  has(OUTU, 'Compare them on an issue',
    `coverage (${label}): the rest of the next-step row vanished along with the local handoff — one\n` +
    '    unresolved question must not take the working steps down with it');
}


if (failures.length) {
  console.error(`\n✗ who represents me: ${failures.length} failure(s)`);
  failures.forEach((f) => console.error('  · ' + f));
  process.exit(1);
}
console.log(`✓ who represents me: all ${passed} assertions passed — 3 entry points, 1 resolver, 6 seats in two classes, gaps stated not dropped, local coverage answered not inferred`);
