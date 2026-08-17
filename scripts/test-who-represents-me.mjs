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
     5. Driven: the band paints cold, warm, and honestly partial
     6. No scores, no verdicts, no party framing, and real thumb targets
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

// Coverage honesty in the cold state: name the levels, and name what is not one.
has(SEC, 'U.S. House, State Senate and State House',
  'front door: the scope note no longer names which seats are resolved, so "see who represents me"\n' +
  '    implies every level of government');
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
  has(entry, LEAD,
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
ok(navBlock.indexOf('#who-represents-me') < navBlock.indexOf('#voter-hub'),
  'chrome: the lookup pill is no longer first in the desktop bar — find comes before learn, and the\n' +
  '    bar\'s own comment says so');

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
// the resolver is sliced out and driven directly.
const resFrom = VHL.indexOf('window.pdxRepsForMe = function ()');
const resTo = VHL.indexOf('window._vhSyncDistrictStrip = function()', resFrom);
must(resFrom !== -1 && resTo > resFrom,
  'voter-hub-location.js no longer defines window.pdxRepsForMe above _vhSyncDistrictStrip — the\n' +
  '  shared-resolver contract this whole pass rests on is gone');
const RESOLVER = VHL.slice(resFrom, resTo);

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

const mkResolverCtx = (over) => {
  const ctx = {
    console, Math, JSON, String, Array, Object, Number, Boolean, RegExp,
    _hasUserLocation: true,
    _currentVoterLocation: { state: 'Utah', city: 'Bountiful', county: 'Davis', district: '1' },
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

const full = mkResolverCtx().pdxRepsForMe();
eq(full.located, true, 'resolver: a located visitor is reported as unlocated');
eq(full.levels.length, 3,
  'resolver: the level list is not the three seats the band\'s scope note promises');
eq(full.levels.map((l) => l.key).join(','), 'house,statesenate,statehouse',
  'resolver: the levels are not federal-then-state, which is the order both surfaces render');
eq(full.levels[0].distLabel, 'U.S. House · District 1',
  'resolver: the district label a visitor reads changed shape');
eq(full.levels.filter((l) => l.resolved).length, 3,
  'resolver: a fully-resolved address did not resolve all three seats');
eq(full.area, 'Bountiful, Davis County', 'resolver: the area label a visitor recognises is gone');

// The honesty case. A level with no officeholder must survive as an explicit
// unresolved entry, because a list of two reads as complete.
const partial = mkResolverCtx({
  _pdxVoterBallot: () => ({
    districts: { house: '1' },
    byOffice: { representative: { incumbentPid: 'p-house' } },
  }),
  keyRacesRelevantData: () => ({ matched: false }),
}).pdxRepsForMe();
eq(partial.levels.length, 3,
  'resolver: an unresolved seat was DROPPED from the list — the remaining rows then read as the\n' +
  '    complete answer, which is precisely the fake completeness claim the brief forbids');
eq(partial.levels.filter((l) => l.resolved).length, 1,
  'resolver: a seat with no officeholder still reports itself resolved');
eq(partial.levels[1].pid, null, 'resolver: an unresolved level carries a stale pid');

// No location, and the national pseudo-location, both have to be legible to the
// band as "do not paint an answer".
const cold = mkResolverCtx({ _hasUserLocation: false }).pdxRepsForMe();
eq(cold.located, false, 'resolver: a visitor with no location is reported as located');
const nat = mkResolverCtx({ _currentVoterLocation: { state: 'National' } }).pdxRepsForMe();
eq(nat.national, true,
  'resolver: the national pseudo-location is not flagged, so the band would claim a nationwide\n' +
  '    visitor has three specific seats');

// Redistricting travels with the resolver, so both surfaces say the same thing.
const redrawn = mkResolverCtx({
  _pdxHouseRedistrict: () => ({ changed: true, currentPid: 'p-old', currentDistrict: '2' }),
}).pdxRepsForMe();
eq(redrawn.redrawn, true, 'resolver: a redrawn House seat is no longer flagged to its callers');
eq(redrawn.levels[0].pid, 'p-old',
  'resolver: a redrawn seat names the future member as the current one — who represents you NOW is\n' +
  '    the question the band asked');

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
      'p-house': { name: 'Blake Moore', party: 'R', office: 'U.S. Representative' },
      'p-sen': { name: 'Todd Weiler', party: 'R', office: 'State Senator' },
      'p-rep': { name: 'Ray Ward', party: 'R', office: 'State Representative' },
    }[pid] || null),
    _getPhotoUrl: () => '/img/x.jpg',
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

// Warm: three resolved seats.
const LEVELS3 = [
  { key: 'house', label: 'U.S. House', tierLabel: 'U.S. House of Representatives', color: '#60a5fa', district: '1', distLabel: 'U.S. House · District 1', pid: 'p-house', resolved: true },
  { key: 'statesenate', label: 'State Senate', tierLabel: 'State Senate', color: '#a78bfa', district: '23', distLabel: 'State Senate · District 23', pid: 'p-sen', resolved: true },
  { key: 'statehouse', label: 'State House', tierLabel: 'State House', color: '#2dd4bf', district: '17', distLabel: 'State House · District 17', pid: 'p-rep', resolved: true },
];
const warm = runBand({
  pdxRepsForMe: () => ({ located: true, national: false, state: 'Utah', area: 'Bountiful, Davis County', redrawn: false, levels: LEVELS3 }),
});
const OUT = warm.host.innerHTML;
must(OUT.length > 0, 'the band painted nothing for a fully-resolved visitor — section 5 is vacuous');
eq(warm.sec.getAttribute('data-located'), '1',
  'band: the band did not mark itself located, so the cold CTA sits on top of the answer');
for (const n of ['Blake Moore', 'Todd Weiler', 'Ray Ward']) {
  has(OUT, n, `band: ${n} is missing from the answer — the band resolved a seat and did not name it`);
}
has(OUT, 'U.S. House · District 1',
  'band: a row no longer states which district it is, so "your representative" is unverifiable');
eq((OUT.match(/See their record ›/g) || []).length, 3,
  'band: not every named official offers the record jump — the bridge from "my reps" to "their\n' +
  '    records" is the point of the band, and a name with no way through is a dead end');
eq((OUT.match(/window\.showProfile\(/g) || []).length, 6,
  'band: the three rows do not each carry BOTH a click and a keydown route into the profile, so\n' +
  '    the record jump is either a label rather than a control, or a control only a mouse can use');
has(OUT, 'Bountiful, Davis County',
  'band: the answer no longer says which area it is for, so a visitor cannot tell it used their address');
has(OUT, '3 of 3 seats resolved',
  'band: the coverage count is gone — it is what makes a partial answer legible as partial');

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
has(OUT, 'Change my location',
  'band: there is no way to correct a wrong address from the answer');
has(OUT, "my-politicians",
  'band: the Team Builder bridge does not target the builder section');

// Honestly partial: one unresolved seat must be STATED.
const partialBand = runBand({
  pdxRepsForMe: () => ({
    located: true, national: false, state: 'Utah', area: 'Bountiful', redrawn: false,
    levels: [LEVELS3[0], { ...LEVELS3[1], pid: null, resolved: false }, LEVELS3[2]],
  }),
});
const POUT = partialBand.host.innerHTML;
has(POUT, 'Not resolved for your area yet',
  'band: an unresolved seat is rendered as nothing at all — the visitor then reads two rows as the\n' +
  '    complete answer, which is a completeness claim the data does not support');
has(POUT, 'State Senate',
  'band: the unresolved row does not even name which seat is missing, so the gap is invisible');
has(POUT, '2 of 3 seats resolved',
  'band: the count does not report the gap, so a partial answer prints as a whole one');
eq((POUT.match(/See their record ›/g) || []).length, 2,
  'band: the unresolved seat offers a record jump to a person who was never resolved');

// Redistricting has to be said, not silently resolved to one of the two answers.
const redrawnBand = runBand({
  pdxRepsForMe: () => ({ located: true, national: false, state: 'Utah', area: 'Bountiful', redrawn: true, levels: LEVELS3 }),
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
  pdxRepsForMe: () => ({ located: true, national: false, state: 'Utah', area: 'Bountiful', redrawn: false, levels: LEVELS3 }),
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
const BAND_TEXT = textOf(SEC.slice(SEC.indexOf('</style>'))) + ' ' + textOf(OUT) + ' ' + textOf(POUT);
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
// Report
// ═════════════════════════════════════════════════════════════════════════════
if (failures.length) {
  console.error(`\n✗ who represents me: ${failures.length} failure(s)`);
  failures.forEach((f) => console.error('  · ' + f));
  process.exit(1);
}
console.log(`✓ who represents me: all ${passed} assertions passed — 3 entry points, 1 resolver, gaps stated not dropped`);
