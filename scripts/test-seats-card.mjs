/* ═══════════════════════════════════════════════════════════════════════════
   test-seats-card.mjs — the one card a reader can actually send someone
   ────────────────────────────────────────────────────────────────────────────
   Who-Represents-Me answers the most useful question on the site and then, for
   its whole life, produced nothing that survived leaving the page. Every control
   in the band is a destination — a row that opens a profile, a scroll to the
   compare, a link to /me — and a reader who had just learned the six people with
   power over them and wanted to tell somebody had exactly one move: screenshot
   it. A screenshot carries no address back, and no way for the person receiving
   it to ask the same question about themselves.

   So the band mints ONE card: the reader's place, the seats this record actually
   resolved, the sitting names on hand, and two addresses. It is a text block, a
   copy control and a native-share handoff, and that is the whole of it.

   FIVE WAYS THIS GOES WRONG, AND A SECTION EACH
   ─────────────────────────────────────────────

     1. THE CARD AND THE BAND NAME DIFFERENT PEOPLE. This is the failure the
        whole band was reorganised around once already: two surfaces answering
        "who represents me" from two reads is two answers, and the one that
        leaves the app is the one nobody can correct. §2 drives the band and the
        card off one resolver walk and requires every seat line to be the SAME
        string the row above it printed — not a matching format, the same bytes.

     2. THE CARD INVENTS A LEGISLATURE. A Missouri reader has two senators and a
        governor on this site and no state legislative seats at all, because we
        draw Utah's lines and nobody else's. A card that padded to six, or that
        printed a blank "State House ·" line a recipient reads as a formatting
        bug, would be manufacturing coverage in the one artifact that travels
        without us. §3 requires the out-of-state card to carry three seats, no
        State House line at all, and the gap stated in a SENTENCE.

     3. EQUITY VOCABULARY REACHES THE THING PEOPLE FORWARD. Nothing in this app
        is a unit, a share, a stock or an earning, and a card is the highest-risk
        place for that copy to appear because it is read by people who have never
        been here. §5 sweeps the card text and the panel markup.

     4. THE ADDRESS IS WRONG FOR THE ONLY CONTEXT THE CARD EXISTS IN. Every other
        share builder in the app anchors on location.origin, which is right for a
        link that opens a record on the host the reader is standing on. This one
        is pasted into a message with no referrer and no session: it has to be
        apex, https and www-less, or a card minted on a preview deploy sends its
        recipient somewhere they cannot reach. §6 pins the literals.

     5. IT QUIETLY BECOMES A PRODUCT. The brief was one control and one object:
        not a composer, not a fifth District Voice board, not a new location key,
        not a click counter. §7 pins minting as the event; §8 pins the three
        surfaces this pass was told to leave alone — Detect, the map badge, and
        the district boards — as untouched by this file, and the board table as
        still four rows.

   Sections:
     1. The control: one, on the band, and not the lead
     2. Utah: the card is the band's own seats, byte for byte
     3. Missouri: three seats, no invented legislature, gaps in words
     4. No card for a reader who must not get one
     5. No equity vocabulary, no score, no verdict
     6. The addresses: apex, https, /find always, /voice while located
     7. Minting is the event — once per card, not once per click
     8. Not a composer, not a fifth board: Detect, badge and boards untouched
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
  console.error(`\n✗ seats-card: STALE HARNESS — ${msg}\n`);
  process.exit(2);
};
const section = (t) => console.log(`\n   ── ${t}`);

const WRM = read('who-represents-me.js');
const HTML = read('index.html');

// The one label the brief named. Quoted once so every assertion below measures
// the same string rather than its own paraphrase of it.
const LABEL = 'Share my seats';

// ═════════════════════════════════════════════════════════════════════════════
// THE FIXTURE
// ─────────────────────────────────────────────────────────────────────────────
// A clone of test-who-represents-me's runBand, grown three capabilities this
// pass needs and that one deliberately does not have: document.createElement +
// head (the panel's stylesheet is injected by the module rather than added to
// index.html — see the note over the injector for why), document.dispatchEvent
// (minting is an event), and a navigator whose share and clipboard can each be
// present or absent. Everything else is the same shape, because a second fake
// DOM that behaved differently would be measuring a different band.
// ═════════════════════════════════════════════════════════════════════════════
const mkEl = (id) => {
  const attrs = {};
  return {
    id, innerHTML: '', textContent: '', _attrs: attrs, _scrolled: false,
    setAttribute: (k, v) => { attrs[k] = String(v); },
    removeAttribute: (k) => { delete attrs[k]; },
    getAttribute: (k) => (k in attrs ? attrs[k] : null),
    scrollIntoView() { this._scrolled = true; },
    select() {},
    appendChild() {},
    removeChild() {},
    style: { cssText: '' },
  };
};

// The card panel is painted INTO #wrm-reps as a string, so the fixture has to be
// able to answer getElementById for ids that only exist inside that string. It
// does it the honest way — parse the painted HTML for the id — rather than by
// keeping a registry the module could not have populated.
const runBand = (over) => {
  const o = over || {};
  const rest = { ...o };
  const share = rest.share === undefined ? true : !!rest.share; delete rest.share;
  const clip = rest.clip === undefined ? true : !!rest.clip; delete rest.clip;
  delete rest.picker;

  const sec = mkEl('who-represents-me');
  const host = mkEl('wrm-reps');
  const styles = [];
  const events = [];
  const copied = [];
  const shared = [];
  const live = {};   // id → element the module asked for and we minted on demand

  const ctx = {
    console, Math, JSON, String, Array, Object, Number, Boolean, RegExp, Promise,
    setTimeout: (fn) => { void fn; return 1; },
    CustomEvent: function (type, init) { this.type = type; this.detail = (init || {}).detail; },
    document: {
      readyState: 'complete',
      head: { appendChild: (el) => { styles.push(el); } },
      documentElement: { appendChild: (el) => { styles.push(el); } },
      body: { appendChild: () => {}, removeChild: () => {} },
      createElement: (tag) => {
        const el = mkEl('');
        el.tagName = String(tag).toUpperCase();
        if (String(tag).toLowerCase() === 'textarea') {
          Object.defineProperty(el, 'value', {
            set(v) { copied.push(String(v)); }, get() { return copied[copied.length - 1] || ''; },
          });
        }
        return el;
      },
      execCommand: () => clip === 'legacy',
      getElementById: (i) => {
        if (i === 'who-represents-me') return sec;
        if (i === 'wrm-reps') return host;
        if (i === 'pdx-wrm-card-css') return styles.length ? styles[0] : null;
        // Anything else: hand back a stub only if the band has actually painted
        // an element with that id. Otherwise null, which is what the real DOM
        // would say and what the module's guards are written against.
        if (host.innerHTML.indexOf('id="' + i + '"') === -1) return null;
        return (live[i] = live[i] || mkEl(i));
      },
      addEventListener: () => {},
      dispatchEvent: (ev) => { events.push(ev); return true; },
    },
    navigator: {
      clipboard: clip === true
        ? { writeText: (s) => { copied.push(String(s)); return Promise.resolve(); } }
        : undefined,
      share: share ? (p) => { shared.push(p); return Promise.resolve(); } : undefined,
    },
    _hasUserLocation: true,
    _pdxPersonById: (pid) => ({
      'p-us1': { name: 'John Curtis', party: 'R', office: 'U.S. Senator' },
      'p-us2': { name: 'Mike Lee', party: 'R', office: 'U.S. Senator' },
      'p-house': { name: 'Blake Moore', party: 'R', office: 'U.S. Representative' },
      'p-gov': { name: 'Spencer Cox', party: 'R', office: 'Governor' },
      'p-sen': { name: 'Todd Weiler', party: 'R', office: 'State Senator' },
      'p-rep': { name: 'Ray Ward', party: 'R', office: 'State Representative' },
      'mo-us1': { name: 'Josh Hawley', party: 'R', office: 'U.S. Senator' },
      'mo-us2': { name: 'Eric Schmitt', party: 'R', office: 'U.S. Senator' },
      'mo-gov': { name: 'Mike Kehoe', party: 'R', office: 'Governor' },
    }[pid] || null),
    _getPhotoUrl: () => '/img/x.jpg',
    pdxLocalSeatsForMe: () => ({
      resolved: true, ok: true, area: 'Bountiful, Davis County', county: 'Davis County',
      pids: ['loc-a', 'loc-b', 'loc-c'],
    }),
    // The app's one owner of navigator.share, as share-links.js publishes it.
    PDXShareLinks: {
      native: (p) => {
        if (!p.url && !(p.files && p.files.length)) return Promise.resolve({ ok: false, outcome: 'invalid' });
        if (!ctx.navigator.share) return Promise.resolve({ ok: false, outcome: 'unsupported' });
        shared.push(p);
        return Promise.resolve({ ok: true, outcome: 'shared' });
      },
    },
    ...rest,
  };
  ctx.location = { href: 'https://politidex.fyi/', pathname: '/', search: '', hash: '', assign: () => {} };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(WRM, ctx, { filename: 'who-represents-me.js' });
  return { ctx, sec, host, styles, events, copied, shared, live };
};

// ── The six Utah seats, in the shape the resolver emits them ────────────────
const SW = (key, label, color, pid, st) => ({
  key, seat: key === 'governor' ? 'governor' : 'senate', label, tierLabel: label, color,
  statewide: true, mapped: true, district: null,
  distLabel: label + ' · ' + st, pid, resolved: !!pid,
});
const D = (key, label, color, district, pid, mapped) => ({
  key, seat: key, label, tierLabel: label, color, statewide: false, mapped: !!mapped,
  district: district || null,
  distLabel: district ? (label + ' · District ' + district) : label,
  pid: pid || null, resolved: !!pid,
});

const UTAH_LEVELS = [
  SW('ussenate1', 'U.S. Senate', '#f0abfc', 'p-us1', 'Utah'),
  SW('ussenate2', 'U.S. Senate', '#f0abfc', 'p-us2', 'Utah'),
  D('house', 'U.S. House', '#60a5fa', '1', 'p-house', true),
  SW('governor', 'Governor', '#fbbf24', 'p-gov', 'Utah'),
  D('statesenate', 'State Senate', '#a78bfa', '23', 'p-sen', true),
  D('statehouse', 'State House', '#2dd4bf', '17', 'p-rep', true),
];
const utahReps = () => ({
  located: true, national: false, state: 'Utah', area: 'Bountiful, Davis County',
  redrawn: false, districtsResolvable: true, congressMapped: true, levels: UTAH_LEVELS,
});

// ── Missouri: two senators, a governor, and NO legislature on this site ─────
const MO_LEVELS = [
  SW('ussenate1', 'U.S. Senate', '#f0abfc', 'mo-us1', 'Missouri'),
  SW('ussenate2', 'U.S. Senate', '#f0abfc', 'mo-us2', 'Missouri'),
  D('house', 'U.S. House', '#60a5fa', null, null, true),
  SW('governor', 'Governor', '#fbbf24', 'mo-gov', 'Missouri'),
  D('statesenate', 'State Senate', '#a78bfa', null, null, false),
  D('statehouse', 'State House', '#2dd4bf', null, null, false),
];
const moReps = () => ({
  located: true, national: false, state: 'Missouri', area: 'Kansas City',
  redrawn: false, districtsResolvable: false, congressMapped: true, levels: MO_LEVELS,
});

const utah = runBand({ pdxRepsForMe: utahReps });
const mo = runBand({ pdxRepsForMe: moReps });

must(utah.host.innerHTML.length > 0,
  'the band painted nothing for a fully-resolved Utah reader — every assertion in this file is vacuous');
must(typeof utah.ctx.PDXWhoRepresentsMe === 'object' && typeof utah.ctx.PDXWhoRepresentsMe.card === 'function',
  'PDXWhoRepresentsMe.card is not exported, so the card cannot be read without driving a clipboard');
must(typeof utah.ctx.pdxSeatsCardOpen === 'function',
  'window.pdxSeatsCardOpen is gone — the control the band paints leads nowhere');

// ═════════════════════════════════════════════════════════════════════════════
// 1 · THE CONTROL: ONE, ON THE BAND, AND NOT THE LEAD
// ═════════════════════════════════════════════════════════════════════════════
section('1 · one control on the WRM band, and it is not the lead');

const utahOut = utah.host.innerHTML;
has(utahOut, LABEL,
  `the band's resolved action row does not offer "${LABEL}". The brief was one control on this band,\n` +
  '    and the band is the only place a reader has already been shown the seats the card names');
eq((utahOut.match(new RegExp(LABEL, 'g')) || []).length, 1,
  'the band paints more than one "Share my seats" control. One object, one control — a second\n' +
  '    entry point is a second answer to "where do I get my card"');
// It sits in the existing action row rather than in a row of its own.
has(utahOut, 'wrm-nextrow',
  'the action row is gone from the band, so the control has no row to be in');
ok(utahOut.indexOf(LABEL) > utahOut.indexOf('wrm-nextrow'),
  'the share control is painted before the action row it is supposed to be inside');
// The row is allowed exactly one lead, and the workspace owns it.
eq((utahOut.match(/wrm-next-btn--lead/g) || []).length, 1,
  'the resolved action row now has more than one lead-weight control. The card is a sibling of\n' +
  '    "Your file" and "My local officials", not a rival to "Work my ballot"');
const ctrlTag = (html) => {
  const i = html.indexOf(LABEL);
  return i === -1 ? '' : html.slice(html.lastIndexOf('<button', i), i);
};
{
  const tag = ctrlTag(utahOut);
  must(tag.length > 0, 'the share control is not a <button> — the weight assertions read nothing');
  lacks(tag, 'wrm-next-btn--lead',
    'the share control claimed lead weight. Without the workspace loaded the band\'s lead is\n' +
    '    "Compare them on an issue", which is the promise the band\'s own supporting line makes');
  has(tag, 'window.pdxSeatsCardOpen()',
    'the control does not route through the one opener, so it has its own idea of what a card is');
}
// WITH ballot-workspace.js loaded — which is the shipped homepage — the row has a
// real lead and every other control is demoted. The card is one of the demoted
// ones: a reader who came to look up their seats is not required to send them.
{
  const b = runBand({ pdxRepsForMe: utahReps, pdxBallotWorkspaceOpen: () => {} });
  const tag = ctrlTag(b.host.innerHTML);
  must(tag.length > 0, 'the share control vanished once the workspace was present');
  has(tag, 'wrm-next-btn--sub',
    'with a lead action present the share control is not demoted to sub weight, so it reads as the\n' +
    '    next step of the loop rather than as one of the things you can also do');
  eq((b.host.innerHTML.match(/wrm-next-btn--lead/g) || []).length, 1,
    'the workspace lead is no longer the only lead in the row');
}
// And the panel is not painted until it is asked for.
lacks(utahOut, 'wrm-cardtext',
  'the card panel is painted on the first sight of the band. Minting is the event — a card that\n' +
  '    exists before anyone asked for one makes the event meaningless');
eq(utah.ctx.PDXWhoRepresentsMe._cardOpen(), false,
  'the panel reports itself open before any reader opened it');

// Opening it paints the panel, in the band, under the action row.
ok(utah.ctx.pdxSeatsCardOpen() === true, 'pdxSeatsCardOpen() refused a reader who has a card');
const openOut = utah.host.innerHTML;
has(openOut, 'id="wrm-card"', 'opening the card painted no panel');
has(openOut, 'id="wrm-cardtext"', 'the panel carries no card text — there is nothing to send');
ok(openOut.indexOf('wrm-card') > openOut.indexOf('wrm-rows'),
  'the panel is painted above the seats it quotes');
// …and closing it takes the panel away and leaves the band intact.
utah.ctx.pdxSeatsCardClose();
lacks(utah.host.innerHTML, 'id="wrm-card"', 'closing the card left the panel painted');
has(utah.host.innerHTML, LABEL, 'closing the card took the control with it');
utah.ctx.pdxSeatsCardOpen();

// The panel's stylesheet ships with the panel rather than in index.html, because
// index.html's <style> sits above every byte-range copy pin in the repo.
must(utah.styles.length === 1,
  'the module injected ' + utah.styles.length + ' stylesheets rather than exactly one');
eq(utah.styles[0].id, 'pdx-wrm-card-css', 'the injected stylesheet has no stable id, so it can be injected twice');
for (const cls of ['.wrm-card{', '.wrm-cardtext{', '.wrm-cardbtn{', '.wrm-cardnote{']) {
  has(utah.styles[0].textContent, cls, `the panel's stylesheet has no rule for ${cls} — the markup styles nothing`);
}
ok(/\.wrm-cardbtn\{[^}]*min-height:\s*4[4-9]px/.test(utah.styles[0].textContent.replace(/\s*\n\s*/g, '')),
  'the card actions are under a 44px thumb target, which is the one accessibility floor this band\n' +
  '    already holds itself to for .wrm-next-btn');
lacks(HTML, '.wrm-cardtext{',
  'the panel\'s styles were added to index.html. Its <style> block sits at line ~5900, above every\n' +
  '    COPIED VERBATIM byte range in evidence/stances/me/spotlight/person.html — adding lines there\n' +
  '    moves all of them and renumbers four test files for a stylesheet one module reads');

// ═════════════════════════════════════════════════════════════════════════════
// 2 · UTAH: THE CARD IS THE BAND'S OWN SEATS, BYTE FOR BYTE
// ═════════════════════════════════════════════════════════════════════════════
section('2 · the card text matches the band\'s seats');

const utahCard = utah.ctx.PDXWhoRepresentsMe.card();
must(!!utahCard && typeof utahCard.text === 'string' && utahCard.text.length > 0,
  'a fully-resolved Utah reader got no card object at all');

eq(utahCard.seats.length, 6,
  'the Utah card does not carry the six seats the band resolved');
// THE POINT OF THE SECTION. Every seat line is the SAME string the row printed,
// not a matching format — .wrm-rowlevel is what the reader saw, and the card is
// what they send. Two formats agreeing today is two formats that can disagree.
const rowLabels = (html) =>
  (html.match(/class="wrm-rowlevel"[^>]*>([^<]*)</g) || []).map((s) => s.slice(s.indexOf('>') + 1, -1));
const painted = rowLabels(openOut);
must(painted.length === 6, 'the band did not paint six seat labels — the match below compares against nothing');
for (const seat of utahCard.seats) {
  ok(painted.indexOf(seat.label) !== -1,
    `card: the seat line "${seat.label}" is not one the band printed. The card and the rows read one\n` +
    '    resolver walk — a line only the card knows is a second answer, in the one artifact that\n' +
    `    travels without us: ${JSON.stringify(painted)}`);
}
for (const label of painted) {
  ok(utahCard.text.indexOf(label) !== -1,
    `card: the band printed "${label}" and the card does not carry it. A Utah reader with six\n` +
    '    resolved seats must get six seat lines — dropping one silently understates our own answer');
}
// And the names, which are the reason anybody forwards this.
for (const n of ['John Curtis', 'Mike Lee', 'Blake Moore', 'Spencer Cox', 'Todd Weiler', 'Ray Ward']) {
  has(utahCard.text, n, `card: ${n} is on the band and not on the card`);
  has(openOut, n, `band: ${n} left the rows — the card's match is being measured against a broken band`);
}
// Six seats, six lines, and the district numbers survive.
for (const line of ['U.S. House · District 1 — Blake Moore',
                    'State Senate · District 23 — Todd Weiler',
                    'State House · District 17 — Ray Ward',
                    'U.S. Senate · Utah — John Curtis',
                    'Governor · Utah — Spencer Cox']) {
  has(utahCard.text, line,
    `card: the line "${line}" is not in the card text. A seat without its district or its member is\n` +
    '    not a seat a recipient can check');
}
has(utahCard.text, 'Bountiful, Davis County',
  'card: the card does not say where it is for, so a forwarded card is unattributable to a place');
has(utahCard.text, 'My seats',
  'card: the card has no heading naming what it is');
// THE STATE IS NAMED, and it is named in the heading rather than left to be
// inferred from a statewide seat line. The area a record resolves to is a city
// or a city-and-county and neither form is guaranteed to carry the state; on a
// card, "State Senate · District 23" is an ambiguous line in forty-nine other
// places and the recipient has no page around it to disambiguate from.
has(utahCard.text.split('\n')[0], 'Utah',
  'card: the heading does not name the state. It was the first thing the brief asked the card to\n' +
  '    carry, and the area alone ("Bountiful, Davis County") does not say it: ' +
  JSON.stringify(utahCard.text.split('\n')[0]));
// …and not twice, for a reader whose area IS the state.
{
  const c = runBand({ pdxRepsForMe: () => ({ ...utahReps(), area: 'Utah' }) }).ctx.PDXWhoRepresentsMe.card();
  must(!!c, 'the state-only-area fixture produced no card');
  eq(c.text.split('\n')[0], 'My seats \u00b7 Utah',
    'card: a reader whose saved area is the state got the state twice in the heading');
}
// A fully-resolved reader is owed no apology, and a card that manufactured one
// would be describing a gap they do not have.
eq(utahCard.notes.length, 0,
  'card: a Utah reader with all six seats resolved was handed a sentence about missing seats: ' +
  JSON.stringify(utahCard.notes));
eq(utahCard.unnamed, 0, 'card: a seat we named in the band came back unnamed on the card');
// The panel prints the card and nothing else — no second copy of the rows.
{
  const panel = openOut.slice(openOut.indexOf('id="wrm-card"'));
  lacks(panel, 'wrm-rowlevel', 'the panel re-paints the seat rows rather than quoting the card');
  lacks(panel, 'showProfile', 'the panel carries profile jumps — it is an artifact, not a second band');
}

// A seat that resolved to a pid the roster cannot yet NAME is a loading problem,
// never a coverage claim — the band's own rule for its rows. The line stays, the
// name is omitted, and the omission is stated in words.
{
  const lv = UTAH_LEVELS.map((l) => (l.key === 'governor' ? { ...l, pid: 'not-in-roster' } : l));
  const b = runBand({ pdxRepsForMe: () => ({ ...utahReps(), levels: lv }) });
  const c = b.ctx.PDXWhoRepresentsMe.card();
  must(!!c, 'the unnamed-seat fixture produced no card');
  eq(c.seats.length, 6, 'card: a resolved seat whose member has no display record was dropped. The seat\n' +
    '    resolved; it is the roster that has not arrived, and dropping it understates coverage');
  eq(c.unnamed, 1, 'card: the unnamed seat was not counted as unnamed');
  has(c.text, 'Governor · Utah',
    'card: the seat line went with the missing name — the seat is still resolved');
  lacks(c.text, 'Governor · Utah —',
    'card: a seat with no name on hand printed a dangling em dash, which reads as a truncated card');
  eq(c.notes.length, 1, 'card: the unnamed seat was omitted from the names with nothing said about it');
  has(c.notes[0], 'could not name',
    'card: the unnamed-member sentence does not say what happened: ' + JSON.stringify(c.notes));
}

// ═════════════════════════════════════════════════════════════════════════════
// 3 · MISSOURI: THREE SEATS, NO INVENTED LEGISLATURE, GAPS IN WORDS
// ═════════════════════════════════════════════════════════════════════════════
section('3 · the out-of-state card has no State House line');

const moCard = mo.ctx.PDXWhoRepresentsMe.card();
must(!!moCard && moCard.text.length > 0, 'a located Missouri reader got no card — sections 3 and 5 are vacuous');

eq(moCard.seats.length, 3,
  'card: the Missouri card does not carry exactly the three seats this site can answer from a state\n' +
  '    name — two Senate seats and the Governor: ' + JSON.stringify(moCard.seats.map((s) => s.label)));
for (const n of ['Josh Hawley', 'Eric Schmitt', 'Mike Kehoe']) {
  has(moCard.text, n, `card: ${n} resolved from Missouri alone and is not on the card`);
}
has(moCard.text.split('\n')[0], 'Missouri',
  'card: the out-of-state heading does not name the state, so the three seats on it are attributable\n' +
  '    to nowhere — the area a Missouri record resolves to is a city, and a city is not a state');
// THE ASSERTION THIS SECTION EXISTS FOR.
lacks(moCard.text, 'State House',
  'card: an out-of-state card carries a State House line. We draw Utah\'s legislative lines and\n' +
  '    nobody else\'s, so there is no Missouri State House seat to print — and a card is the one\n' +
  '    artifact that travels with no way for us to correct it');
lacks(moCard.text, 'State Senate',
  'card: an out-of-state card carries a State Senate line, for the same reason');
lacks(moCard.text, 'District',
  'card: the Missouri card printed a district. Nothing in that record resolved one, so any number\n' +
  '    or label there is invented');
for (const label of moCard.seats.map((s) => s.label)) {
  has(label, 'Missouri',
    `card: the statewide seat "${label}" does not name the state it is elected by, which is the only\n` +
    '    thing distinguishing the two Senate lines from each other');
}
// The blanks are words, not blank lines and not zeroes.
ok(moCard.notes.length >= 2,
  'card: the Missouri card states fewer than two gaps. The U.S. House seat is unpinned and the\n' +
  '    legislative seats are unmapped — two different admissions, and only one is something the\n' +
  '    reader can fix: ' + JSON.stringify(moCard.notes));
ok(moCard.notes.some((n) => /legislative lines in Utah only/.test(n)),
  'card: the card does not say WHY the legislative seats are absent. "Nothing here" reads as "this\n' +
  '    site knows nothing about Missouri"; the truth is narrower and much better: ' +
  JSON.stringify(moCard.notes));
ok(moCard.notes.some((n) => /U\.S\. House/.test(n) && /not pinned/.test(n)),
  'card: the unpinned U.S. House seat is not distinguished from an unmapped one. Congressional\n' +
  '    lines are national — that blank is one tap from filled: ' + JSON.stringify(moCard.notes));
for (const n of moCard.notes) {
  ok(!/\byet\b/i.test(n),
    'card: a gap sentence says "yet", which promises a schedule nobody has: ' + JSON.stringify(n));
  ok(!/\b0\b/.test(n), 'card: a gap is stated as a number rather than in words: ' + JSON.stringify(n));
}
// No blank lines masquerading as seats, and no line that is only punctuation.
{
  const lines = moCard.text.split('\n');
  ok(!lines.some((l) => /^\s*[·—\-|]+\s*$/.test(l)),
    'card: a line of bare punctuation survived into the card, which a recipient reads as a bug');
  ok(!/\n\n\n/.test(moCard.text), 'card: a double blank line survived — the omitted seats left holes');
  eq(moCard.text, moCard.text.trim(), 'card: the card text carries leading or trailing whitespace');
}
// And a Utah reader who has pinned nothing legislative gets the OTHER sentence.
{
  const lv = UTAH_LEVELS.map((l) => (
    (l.key === 'statesenate' || l.key === 'statehouse') ? { ...l, district: null, pid: null, resolved: false, distLabel: l.label } : l));
  const c = runBand({ pdxRepsForMe: () => ({ ...utahReps(), levels: lv }) }).ctx.PDXWhoRepresentsMe.card();
  must(!!c, 'the unpinned-Utah fixture produced no card');
  eq(c.seats.length, 4, 'card: an unpinned Utah reader was given legislative seats they have not placed');
  lacks(c.text, 'State House', 'card: an unresolved State House seat was printed anyway');
  ok(c.notes.some((n) => /not pinned in this record/.test(n)),
    'card: a Utah reader whose legislative lines WE DRAW was told we do not draw them, which is a\n' +
    '    false statement about our own coverage: ' + JSON.stringify(c.notes));
  ok(!c.notes.some((n) => /legislative lines in Utah only/.test(n)),
    'card: a Utah reader was told Utah is not mapped: ' + JSON.stringify(c.notes));
}
// A statewide seat with no file on hand is the third kind, and it says so.
{
  const lv = MO_LEVELS.map((l) => (l.key === 'governor' ? { ...l, pid: null, resolved: false } : l));
  const c = runBand({ pdxRepsForMe: () => ({ ...moReps(), levels: lv }) }).ctx.PDXWhoRepresentsMe.card();
  must(!!c, 'the missing-governor fixture produced no card');
  eq(c.seats.length, 2, 'card: a statewide seat with no holder on file was printed as a seat');
  ok(c.notes.some((n) => /statewide seat/.test(n) && /no file on hand/.test(n)),
    'card: a statewide blank was folded in with the district blanks. Every state has a governor —\n' +
    '    that blank is our coverage, not their geometry: ' + JSON.stringify(c.notes));
}

// ═════════════════════════════════════════════════════════════════════════════
// 4 · NO CARD FOR A READER WHO MUST NOT GET ONE
// ═════════════════════════════════════════════════════════════════════════════
section('4 · no saved location, no card, and no control either');

for (const [what, reps] of [
  ['no resolver at all', undefined],
  ['no saved location', () => ({ located: false, national: false, state: '', levels: [] })],
  ['the National standing', () => ({ located: true, national: true, state: 'National', levels: UTAH_LEVELS })],
  ['a record that resolved no seat', () => ({
    ...utahReps(),
    levels: UTAH_LEVELS.map((l) => ({ ...l, pid: null, resolved: false })),
  })],
]) {
  const b = runBand({ pdxRepsForMe: reps });
  eq(b.ctx.PDXWhoRepresentsMe.card(), null,
    `card: a reader with ${what} was handed a card. "My seats" over nothing is not a modest card,\n` +
    '    it is a claim the app failed to make good on');
  lacks(b.host.innerHTML, LABEL,
    `card: the control is offered to a reader with ${what}, so the tap can only disappoint`);
  eq(b.ctx.pdxSeatsCardOpen(), false,
    `card: pdxSeatsCardOpen() minted a panel for a reader with ${what}`);
  eq(b.events.length, 0, `card: a mint event fired for a reader with ${what}`);
}
// A reader whose record resolved SOME seats gets a card for those, and only those.
{
  const lv = UTAH_LEVELS.map((l) => (l.statewide ? l : { ...l, pid: null, resolved: false }));
  const c = runBand({ pdxRepsForMe: () => ({ ...utahReps(), levels: lv }) }).ctx.PDXWhoRepresentsMe.card();
  must(!!c, 'a reader with only statewide seats resolved got no card');
  eq(c.seats.length, 3, 'card: a partly-resolved record did not produce a card of exactly what resolved');
}

// ═════════════════════════════════════════════════════════════════════════════
// 5 · NO EQUITY VOCABULARY, NO SCORE, NO VERDICT
// ═════════════════════════════════════════════════════════════════════════════
section('5 · no unit / share / stock language anywhere in the artifact');

// THE SWEEP IS OVER THE CARD TEXT — the string that leaves the app — and it is
// STRICTER than the board sweep in test-district-boards: bare "share" is banned
// too, because nothing inside a card a reader forwards needs the word at all.
// The control's LABEL is "Share my seats" and is checked separately and exactly
// in §1, which is why the two are swept apart rather than together.
const BANNED = /\b(shares?|shareholders?|stocks?|units?|dues|equity|equities|dividends?|investors?|investments?|valuations?|earn(?:s|ed|ing|ings)?|payouts?|vesting|vested|pro rata|cap table|accredited)\b/gi;
for (const [what, text] of [['the Utah card', utahCard.text], ['the Missouri card', moCard.text]]) {
  const hits = [...text.matchAll(BANNED)].map((m) => m[0]);
  eq(hits.length, 0, `${what} carries equity vocabulary — found ${JSON.stringify(hits)}`);
}
{
  // And over the panel markup a reader sees, minus the one control label.
  const panel = openOut.slice(openOut.indexOf('id="wrm-card"'));
  const hits = [...panel.replace(/&[a-z#0-9]+;/gi, ' ').matchAll(BANNED)].map((m) => m[0]);
  eq(hits.length, 0, `the card panel carries equity vocabulary — found ${JSON.stringify(hits)}`);
}
// The band's own control says "Share my seats" and nothing else says "share".
eq((utahOut.match(/\bshares?\b/gi) || []).length, 1,
  'the band uses the word "share" somewhere other than the one control label: ' +
  JSON.stringify(utahOut.match(/\bshares?\b/gi)));
eq((utahOut.match(/\bshares?\b/gi) || [])[0], 'Share',
  'the only "share" on the band is not the control\'s capital-S label, so something else adopted the word');

// No score, no verdict, no percentage, no party frame — the band's standing
// promise, and the card is the band.
for (const [what, text] of [['the Utah card', utahCard.text], ['the Missouri card', moCard.text]]) {
  ok(!/\d\s*%/.test(text), `${what} prints a percentage`);
  ok(!/\b(score|scored|grade|graded|rating|rated|ranks?|ranked|match(?:es|ed)?\s+you)\b/i.test(text),
    `${what} characterises a record. Every claim about a record is made on the profile the row opens`);
  ok(!/\((?:R|D|I|L|G|F)\)/.test(text),
    `${what} prints a party letter. The rows do, beside a name, the way a ballot does — but a card\n` +
    '    forwarded out of context is a different surface and the letter is doing different work in it');
  ok(!/\b(unit price|per unit|invest|buy in)\b/i.test(text), `${what} reads as an offer`);
}
// The card is the reader's own record read back, and it says so.
has(openOut, 'nothing about how you would vote',
  'the panel does not tell the reader what the card does NOT contain. A reader deciding whether to\n' +
  '    send their seats to a group chat is owed that before they tap, not after');
lacks(utahCard.text, 'my-stances',
  'the card carries a link to the reader\'s positions. The card is six seats; the file is private');
ok(!/\bstance|position/i.test(utahCard.text),
  'the card mentions the reader\'s positions, which are not in it');

// ═════════════════════════════════════════════════════════════════════════════
// 6 · THE ADDRESSES
// ═════════════════════════════════════════════════════════════════════════════
section('6 · apex, https, no www — /find always, /voice while located');

eq(utahCard.url, 'https://politidex.fyi/find',
  'card: the finder address is not the apex https literal. Every other share builder anchors on\n' +
  '    location.origin, which is right for a link that opens a record on the host the reader is on.\n' +
  '    This one is pasted into a message with no referrer — a card minted on a preview deploy or on\n' +
  '    localhost that carried that host sends its recipient somewhere they cannot reach');
eq(utahCard.voiceUrl, 'https://politidex.fyi/voice',
  'card: the district-room address is not the apex https literal');
has(utahCard.text, 'https://politidex.fyi/find', 'card: the finder link is not in the text that gets sent');
has(utahCard.text, 'https://politidex.fyi/voice', 'card: a located reader\'s district room is not linked');
has(moCard.text, 'https://politidex.fyi/find', 'card: the Missouri card carries no way to look up your own seats');
for (const [what, text] of [['the Utah card', utahCard.text], ['the Missouri card', moCard.text]]) {
  ok(!/www\./.test(text), `${what} carries a www host`);
  ok(!/http:\/\//.test(text), `${what} carries a plain-http link`);
  ok(!/localhost|127\.0\.0\.1|\.netlify\.app|deploy-preview/.test(text),
    `${what} carries a non-public host — it would be pasted somewhere it cannot be opened`);
  // Every http(s) URL in the card is on the apex.
  for (const u of text.match(/https?:\/\/[^\s]+/g) || []) {
    ok(u.indexOf('https://politidex.fyi/') === 0, `${what} links off the apex: ${u}`);
  }
}
// The literals are in the module once each, not re-typed per call site.
eq((WRM.match(/https:\/\/politidex\.fyi/g) || []).length, 1,
  'the apex origin is written more than once in who-represents-me.js. A second copy is a second\n' +
  '    host the day one of them is edited');
// /find is one of the two addresses the brief allowed. The other is the band's
// own anchor, and it is still what the homepage uses for the band.
has(HTML, 'who-represents-me',
  'index.html no longer carries the band\'s anchor, which is the other address the card was allowed');
// The /voice line is conditional on a location in the source, not assumed.
has(WRM, 'if (reps.located) L.push(',
  'the district-room line is unconditional. It is true today that every reader with a card has a\n' +
  '    location — the rule should still be written down where the line is built');

// ═════════════════════════════════════════════════════════════════════════════
// 7 · MINTING IS THE EVENT
// ═════════════════════════════════════════════════════════════════════════════
section('7 · generating the card is the event, not the clicks after it');

{
  const b = runBand({ pdxRepsForMe: utahReps });
  eq(b.events.length, 0, 'mint: an event fired before any card was generated');
  b.ctx.pdxSeatsCardOpen();
  eq(b.events.length, 1, 'mint: generating a card fired ' + b.events.length + ' events rather than one');
  eq(b.events[0].type, 'pdx:seats:card',
    'mint: the event is not named pdx:seats:card, so no listener can find it');
  const d = b.events[0].detail || {};
  eq(d.seats, 6, 'mint: the event does not carry how many seats the card named');
  eq(d.state, 'Utah', 'mint: the event does not carry the state');
  eq(d.named, 6, 'mint: the event does not carry how many of the seats were named');
  // NO PID, NO NAME. A listener that wants to know who is in somebody's card can
  // read the card; an event bus does not need it.
  const flat = JSON.stringify(d);
  for (const leak of ['p-us1', 'p-gov', 'John Curtis', 'Spencer Cox', 'Bountiful']) {
    lacks(flat, leak, `mint: the event detail leaks "${leak}". Counts and a state, nothing else`);
  }

  // Clicks after the mint are NOT events. This is the whole distinction the brief
  // drew: the card being generated is the thing worth counting.
  await b.ctx.pdxSeatsCardCopy();
  await b.ctx.pdxSeatsCardCopyLink();
  await b.ctx.pdxSeatsCardSend();
  b.ctx.pdxSeatsCardClose();
  b.ctx.pdxSeatsCardOpen();
  eq(b.events.length, 1,
    'mint: copying, sending, closing and re-opening the SAME card fired ' + b.events.length +
    ' events. The card is the event — a click counter dressed as one measures enthusiasm for\n' +
    '    buttons rather than how many cards exist');

  // A DIFFERENT card is a different event, because it is a different object.
  const lv = UTAH_LEVELS.map((l) => (l.key === 'statehouse' ? { ...l, district: '18', distLabel: 'State House · District 18', pid: 'p-rep' } : l));
  b.ctx.pdxRepsForMe = () => ({ ...utahReps(), levels: lv });
  b.ctx.PDXWhoRepresentsMe.sync();
  eq(b.events.length, 2,
    'mint: the reader moved district and the new card did not mint. A card is deduped on its own\n' +
    '    text, not on the session');
}

// The copy path takes the CARD, the link path takes the LINK, and both go
// through the clipboard the rest of the app uses.
{
  const b = runBand({ pdxRepsForMe: utahReps });
  b.ctx.pdxSeatsCardOpen();
  const card = b.ctx.PDXWhoRepresentsMe.card();
  await b.ctx.pdxSeatsCardCopy();
  eq(b.copied[b.copied.length - 1], card.text,
    'copy: "Copy the card" put something other than the card text on the clipboard');
  await b.ctx.pdxSeatsCardCopyLink();
  eq(b.copied[b.copied.length - 1], 'https://politidex.fyi/find',
    'copy: "Copy the link" put something other than the apex finder link on the clipboard');
}
// Native share goes through PDXShareLinks.native — the app's one owner of
// navigator.share, which resolves rather than rejects and so lets a refused
// sheet fall back to the clipboard honestly.
has(WRM, 'PDXShareLinks',
  'the card calls navigator.share directly rather than through the module that owns it. Six\n' +
  '    surfaces did that once and all six swallowed NotAllowedError as a cancellation');
lacks(WRM, 'navigator.share(',
  'who-represents-me.js invokes navigator.share itself — that is PDXShareLinks.native\'s job');
{
  const b = runBand({ pdxRepsForMe: utahReps, share: true });
  b.ctx.pdxSeatsCardOpen();
  has(b.host.innerHTML, 'pdxSeatsCardSend()',
    'a browser WITH navigator.share was offered no native send control');
  b.ctx.pdxSeatsCardSend();
  eq(b.shared.length, 1, 'send: the native share handoff did not happen');
  eq(b.shared[0].url, 'https://politidex.fyi/find', 'send: the share payload carries no apex url');
  eq(b.shared[0].text, b.ctx.PDXWhoRepresentsMe.card().text, 'send: the share payload is not the card');
  has(b.shared[0].title, 'PolitiDex', 'send: the share payload has no title for a receiving app to file it under');
}
{
  // No navigator.share: the control is absent rather than present-and-dead, and
  // "send" falls back to the clipboard.
  const b = runBand({ pdxRepsForMe: utahReps, share: false });
  b.ctx.pdxSeatsCardOpen();
  lacks(b.host.innerHTML, 'pdxSeatsCardSend()',
    'a browser with no navigator.share was painted a native send control that cannot open anything');
  has(b.host.innerHTML, 'pdxSeatsCardCopy()',
    'a browser with no native share was left with no way to get the card off the page');
  await b.ctx.pdxSeatsCardSend();
  eq(b.copied[b.copied.length - 1], b.ctx.PDXWhoRepresentsMe.card().text,
    'send: with no share sheet the send control did not fall back to the clipboard');
}
{
  // No clipboard API either: the legacy textarea path, and then words.
  const b = runBand({ pdxRepsForMe: utahReps, share: false, clip: 'legacy' });
  b.ctx.pdxSeatsCardOpen();
  await b.ctx.pdxSeatsCardCopy();
  eq(b.copied[b.copied.length - 1], b.ctx.PDXWhoRepresentsMe.card().text,
    'copy: a browser without navigator.clipboard lost the card entirely rather than falling back');
}

// ═════════════════════════════════════════════════════════════════════════════
// 8 · NOT A COMPOSER, NOT A FIFTH BOARD
// ═════════════════════════════════════════════════════════════════════════════
section('8 · Detect, the map badge and the district boards are untouched');

// NO NEW LOCATION KEY, AND NO WRITE AT ALL. Asking who represents you is a read;
// minting a card off that read must stay one.
for (const w of ['localStorage', 'sessionStorage', 'indexedDB', 'document.cookie']) {
  lacks(WRM, w,
    `who-represents-me.js now touches ${w}. The card reads the resolver and stores nothing — a new\n` +
    '    key here is a migration nobody asked for and a second idea of where the reader lives');
}
lacks(WRM, 'fetch(', 'the card makes a network request. It is a read of state already in the page');

// DETECT is voter-hub-location.js's, and the locbar's. This file must not learn
// a second opinion about how a location gets set.
must(read('voter-hub-location.js').indexOf('window.triggerManualLocationDetection') !== -1,
  'triggerManualLocationDetection has moved out of voter-hub-location.js — the Detect assertions below\n' +
  '    are measuring a name nobody owns');
has(HTML, 'detect-loc-btn',
  'the Detect control has left index.html, so this pass cannot claim to have left it alone');
for (const w of ['triggerManualLocationDetection', 'detect-loc-btn', 'geolocation', '_pdxFallbackToMap']) {
  lacks(WRM, w, `who-represents-me.js now reaches into Detect (${w}). One owner, and it is not this file`);
}

// THE MAP BADGE is index.html's static silhouette data plus voter-hub-location's
// painter. The card does not draw, read or move it.
has(HTML, 'vh-loc-mapbadge', 'the locbar map badge has left index.html');
has(HTML, 'pdxPaintStateShape', 'index.html no longer publishes the badge painter');
for (const w of ['vh-loc-mapbadge', 'pdxPaintStateShape', 'data-pdxhome']) {
  lacks(WRM, w, `who-represents-me.js now touches the map badge (${w})`);
}

// THE DISTRICT BOARDS are still named rows and still have no splat. A seats
// card is not a board, and it must not have quietly become a route. The count
// is five because HD-15 opened; what this block guards is that the table grew
// by a DECIDED row and never by a pattern, and that this pass's card is not
// one of them.
{
  const DV = read('district-voice.js');
  const DB = read('district-board.js');
  const TOML = read('netlify.toml');
  const tbl = DV.slice(DV.indexOf('var BOARD_ROUTES = {'), DV.indexOf('};', DV.indexOf('var BOARD_ROUTES = {')));
  const routes = [...tbl.matchAll(/'\/district\/([a-z0-9-]+)'/g)].map((m) => m[1]);
  must(routes.length > 0, 'BOARD_ROUTES no longer lists board paths the way this assertion reads them');
  eq(routes.length, 5,
    'the board table is no longer five rows. This pass adds a card, not a board: ' + JSON.stringify(routes));
  for (const a of ['ut-sd-3', 'ut-hd-16', 'ut-sd-7', 'ut-cd-2', 'ut-hd-15']) {
    ok(routes.indexOf(a) !== -1, `the board ${a} has left BOARD_ROUTES`);
  }
  ok(!/from\s*=\s*"\/district\/[^"]*\*/.test(TOML),
    'a /district/* splat appeared in netlify.toml — the allow-list is the product');
  for (const w of ['district-board', 'BOARD_ROUTES', '/district/', 'PDXDistrictBoard']) {
    lacks(WRM, w, `who-represents-me.js now reaches into the district boards (${w})`);
  }
  must(DB.indexOf('PDXDistrictBoard') !== -1, 'district-board.js no longer publishes PDXDistrictBoard');
}

// NOT A COMPOSER. No draft, no send-to-an-official, no processor, no identity
// vendor — all of which are still out, and a share control is exactly where one
// of them would arrive first.
// The sweep is over DESTINATIONS and VENDORS rather than over prose: "composer"
// is a word this file uses to say what the card is not, and a source sweep that
// banned it would be policing the documentation instead of the behaviour.
for (const w of ['stripe', 'veriff', 'persona', 'plaid', 'onfido', 'jumio',
                 'mailto:', 'sms:', 'wa.me', 'twitter.com', 'x.com/intent',
                 'facebook.com', 'linkedin.com', 'reddit.com', 'telegram']) {
  ok(WRM.toLowerCase().indexOf(w) === -1,
    `who-represents-me.js now carries "${w}". The card is one text block and a native share sheet —\n` +
    '    a per-network button list is a composer, and the OS already owns that choice');
}
// And the panel is a card, not a form.
{
  const panel = openOut.slice(openOut.indexOf('id="wrm-card"'));
  for (const t of ['<input', '<textarea', '<form', '<select']) {
    lacks(panel, t, `the card panel carries a ${t} — it is an artifact to send, not something to fill in`);
  }
}
// NO CACHE_VERSION MOVE, AND THE REASON IS CHECKABLE RATHER THAN ASSERTED.
// who-represents-me.js is a RUNTIME entry — it is not in SHELL_ASSETS — and the
// runtime bucket has been deliberately unversioned since v181's prune threw away
// every warm device's packs. So a changed runtime asset is refreshed by the
// stale-while-revalidate write in handleStatic and a bump would swap the
// precached shell and nothing else. This pass changed no precached file, so it
// owes no bump; the day someone moves this module ONTO the shell list without
// moving the version, this is the assertion that says so.
{
  const SW_JS = read('sw.js');
  const i = SW_JS.indexOf('const SHELL_ASSETS = [');
  must(i > 0, 'sw.js no longer declares SHELL_ASSETS, so the precache reasoning below reads nothing');
  const shell = SW_JS.slice(i, SW_JS.indexOf('\n];', i));
  lacks(shell, "'/who-represents-me.js'",
    'who-represents-me.js joined SHELL_ASSETS. It is now a precached shell asset, which means this\n' +
    '    pass changed a precached file and CACHE_VERSION has to move with it — see the v-log above the\n' +
    '    constant for the form that entry takes');
  has(SW_JS, "const RUNTIME_CACHE = 'politidex-runtime'",
    'the runtime bucket carries a version again, which would make a changed runtime asset depend on a\n' +
    '    CACHE_VERSION bump — the card would then need one and does not have one');
  const m = /const CACHE_VERSION = 'v(\d+)'/.exec(SW_JS);
  must(!!m, 'sw.js no longer declares CACHE_VERSION in the shape this assertion reads');
  ok(Number(m[1]) >= 243, 'sw.js went BACKWARDS to v' + m[1]);
}

if (failures.length) {
  console.error(`\n✗ seats card: ${failures.length} failure(s)`);
  failures.forEach((f) => console.error('  · ' + f));
  process.exit(1);
}
console.log(`✓ seats card: all ${passed} assertions passed — one control, one card, six seats in Utah and three in Missouri, gaps in words, apex links, minting is the event`);
