#!/usr/bin/env node
/**
 * test-first-run.mjs — a stranger finishes one real task, and "finished" means finished.
 *
 * THE DEFECT. The homepage answered "what is this?" with ten things. Above the
 * fold a first-time visitor met a headline, two paragraphs of explainer, a purple
 * alignment card with its own filled button, an eight-chip quick-jump bar, a
 * five-button door row, and a nav carrying three glowing pills and three
 * dropdowns. Every one of those is a real surface. Together they are a menu with
 * no ranking, and a stranger who cannot pick a first move makes none.
 *
 * THE FIX UNDER TEST. One ranked pair of cold-start paths, and one honest
 * definition of having finished:
 *
 *   PATH A (default) — who has power over me → open one formal record.
 *     pdxFindMyReps() → pdxRepsForMe() → PDXPerson.open(pid, { section:
 *     'pdxsec-standout' }). Every step already existed; first-run.js only calls
 *     them in order.
 *   PATH B — set location → work one seat in the ballot workspace.
 *     PDXDoor2.toWorkspace() / PDXBallotWorkspace.open(), then the visitor's pick.
 *
 * WHAT THIS FILE HOLDS, and why each one is a rule and not a preference:
 *
 *   1. The two CTAs exist, are ranked (one filled, one outlined), and point at
 *      the two paths — not at a methodology essay and not at a signup.
 *   2. Success is a SOURCED RECORD or a REAL PICK. The module must gate the
 *      record open on the publication floor and must not mark success from an
 *      account event. This is the assertion that matters most: "first run done"
 *      is a claim about the visitor having seen something true.
 *   3. It FAILS CLOSED. No path may name a politician outside the districts the
 *      resolver can actually draw, and when nothing clears the floor the module
 *      opens nothing and says so.
 *   4. It is deferral, not deletion — every surface the gate quiets is still in
 *      the document and comes back once first run is done.
 *   5. It adds no door, no route, no product, and reads no score.
 *
 * Source-level: no browser, no network. The module is also driven in a sandbox so
 * the floor gate and the fail-closed branch are executed, not just grepped.
 */
import fs from 'fs';
import path from 'path';
import vm from 'vm';

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..');
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const HTML = rd('index.html');
const FR = rd('first-run.js');
const SW = rd('sw.js');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('  ✗ ' + m); } };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const must = (c, m) => {
  if (c) return;
  console.error(`\n  ⚠ STALE TEST: ${m}\n    The source this file reasons about has moved. Re-read it before trusting a green run.\n`);
  process.exit(2);
};
const section = t => console.log(`\n  ── ${t}`);
/* Comments in this codebase carry the reasoning, so every claim about what the
   CODE does is made against a comment-stripped copy. A grep that a comment can
   satisfy tests the prose, not the product. */
const CODE = FR.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1 ');
const VISIBLE = HTML.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ');

/* ═══════════════════════════════════════════════════════════════════════════
   1 · THE TWO CTAs — ranked, and pointing at tasks
   ═══════════════════════════════════════════════════════════════════════════ */
section('1 · two ranked first-run CTAs, aimed at a task and not at a brochure');

const heroAt = HTML.indexOf('<section id="hero"');
must(heroAt > 0, 'the hero section is gone from index.html');
const HERO = HTML.slice(heroAt, HTML.indexOf('</section>', heroAt));

const ctas = [...HERO.matchAll(/<(button|a)\b[^>]*data-pdx-firstrun-cta="([AB])"[^>]*>/g)]
  .map(m => ({ tag: m[1], path: m[2], src: m[0] }));
eq(ctas.length, 2, `the hero declares exactly two first-run CTAs (found ${ctas.map(c => c.path).join(',')})`);
const A = ctas.find(c => c.path === 'A'), B = ctas.find(c => c.path === 'B');
must(A && B, 'one of the two first-run paths has no CTA in the hero');

/* Path A is the default, and the default is the one that is honest everywhere:
   pdxRepsForMe() resolves both U.S. Senate seats and the Governor from the state
   alone in all fifty states, while district seats only resolve where the lines are
   drawn. So A is first in the DOM and A carries the fill. */
ok(HERO.indexOf(A.src) < HERO.indexOf(B.src), 'Path A is painted first — it is the default');
ok(/from-gold-400|bg-gradient-to-r/.test(A.src), 'Path A carries the filled treatment');
ok(/box-shadow:0 0 34px/.test(A.src), 'and the resting glow that makes it the primary');
ok(!/bg-gradient-to-r|from-gold-400/.test(B.src), 'Path B is not a second filled primary');
ok(/border:1\.5px solid/.test(B.src), 'Path B is outlined — a real control at second rank');

/* Both point at the module, and both survive it being absent. This button is in
   the first frame and first-run.js is deferred, so a CTA that only works once a
   module lands is a dead control for the exact visitor it was built for. */
ok(/PDXFirstRun\.pathA/.test(A.src), 'Path A routes through PDXFirstRun.pathA');
ok(/PDXFirstRun\.pathB/.test(B.src), 'Path B routes through PDXFirstRun.pathB');
ok(/else if\s*\(window\.pdxFindMyReps\)/.test(A.src),
  'Path A degrades to the shared lookup action before the module loads — never a dead control');
ok(/href="#/.test(B.src) && B.tag === 'a',
  'Path B is an anchor, so it still navigates with scripting off');

/* The labels name a task, in the first person, with no product noun in them. */
const labelA = (A.src ? HERO.slice(HERO.indexOf(A.src), HERO.indexOf('</' + A.tag + '>', HERO.indexOf(A.src))) : '')
  .replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
ok(/who has power over me/i.test(labelA), `Path A's label states the task ("${labelA}")`);
for (const bad of [/sign ?up/i, /create an account/i, /learn (more|how)/i, /methodology/i, /take a tour/i, /explore/i]) {
  ok(!bad.test(labelA), `Path A's label is not an invitation to read or register (${bad})`);
}

/* SEARCH is the third leg of the model and must not be dressed as a third door. */
const searchCta = (VISIBLE.slice(VISIBLE.indexOf('<section id="hero"'))
  .match(/<button[^>]*pdxOpenEye[^>]*>[\s\S]*?<\/button>/) || [])[0] || '';
ok(!!searchCta, 'the hero offers the claim → receipt search as its own control');
ok(!/rounded-2xl|bg-gradient|box-shadow/.test(searchCta),
  'and it is text-weight — search routes into the doors, it is not a third one');

/* ═══════════════════════════════════════════════════════════════════════════
   2 · SUCCESS IS A SOURCED RECORD OR A REAL PICK — never an account
   ═══════════════════════════════════════════════════════════════════════════ */
section('2 · what counts as done: a sourced pattern, or one finished seat pick');

/* Exactly two spellings, and the module refuses anything else. */
const marks = [...CODE.matchAll(/mark\(\s*'([a-z]+)'/g)].map(m => m[1]);
ok(marks.length >= 2, `the module marks success from more than one place (${marks.length})`);
eq([...new Set(marks)].sort().join(','), 'record,seat',
  'and the only two things it will ever mark are a sourced record and a seat pick');
ok(/via !== 'record' && via !== 'seat'/.test(CODE) || /'record' \|\| via === 'seat'/.test(CODE),
  'mark() validates its argument, so a caller cannot invent a third kind of success');

/* The record path is GATED ON THE PUBLICATION FLOOR — the existing rule for
   "identity in the roster, plus enough sourced positions". Without this gate,
   "success" would mean a thin page opened, which is the dishonest version. */
ok(/PDXPerson\.publishable|PDXPublicationFloor/.test(CODE),
  'the record path consults the publication floor rather than opening whatever it finds');
const pick = CODE.slice(CODE.indexOf('function pickPid'), CODE.indexOf('function located'));
must(pick.length > 40, 'pickPid() is gone — the floor gate below has nothing to read');
ok(/clearsFloor\(/.test(pick), 'pickPid() only returns a pid that clears the floor');
ok(/return null/.test(pick), 'and returns nothing at all when none of them does');
ok(/return false;\s*$/m.test(CODE.slice(CODE.indexOf('function clearsFloor'), CODE.indexOf('function mark'))),
  'clearsFloor() treats "I could not tell" as "not publishable" — unknown fails closed');

/* And the account is not a path to it. Nothing in the module may read a signed-in
   flag, and nothing anywhere may mark first run from an auth event. */
for (const bad of [/isSignedIn/i, /currentUser/i, /loggedIn/i, /\bauth\b/i, /session(Token|User)/i]) {
  ok(!bad.test(CODE), `the module never reads an account signal (${bad}) — signing up is not success`);
}
const otherWriters = [...HTML.matchAll(/pdx_first_run/g)].length;
ok(otherWriters <= 2,
  `pdx_first_run is named in index.html at most where it is declared (${otherWriters} sites) — ` +
  'no other surface sets the flag');

/* The seat path observes a finished pick; it does not ask the visitor to confirm. */
ok(/ballotPickCard/.test(CODE), 'the seat path watches the workspace\'s own pick function');
ok(/__frPick/.test(CODE), 'with its own idempotency flag, so it cannot double-wrap');
ok(/_decided\(\)/.test(CODE), 'and confirms against the workspace\'s own decided count');

/* ═══════════════════════════════════════════════════════════════════════════
   3 · IT FAILS CLOSED
   ═══════════════════════════════════════════════════════════════════════════ */
section('3 · fail closed: no plausible strangers, and an honest "no"');

/* The module must not draw its own districts. It reads the one resolver, which
   already gates district seats on the only state whose lines are drawn. */
ok(/pdxRepsForMe\(\)/.test(CODE), 'the seats come from the single resolver');
eq((CODE.match(/districtsResolvable|statewideAmbiguous/g) || []).length, 0,
  'and the module does not second-guess the resolver\'s own gates');
for (const bad of [/\bUtah\b/, /\bUT\b/, /district\s*[:=]\s*\d/, /\bzip\b.*\bmap\b/i]) {
  ok(!bad.test(CODE), `the module hard-codes no geography of its own (${bad})`);
}
ok(/lv\.resolved/.test(CODE) || /\.resolved\b/.test(CODE),
  'only seats the resolver marked resolved are ever candidates');

/* When nothing clears the floor: open nothing, say one true sentence, mark nothing. */
const watch = CODE.slice(CODE.indexOf('function watchThenOpen'), CODE.indexOf('function pathA'));
must(watch.length > 100, 'the Path A watcher is gone — the fail-closed branch has nothing to read');
ok(/note\(/.test(watch), 'the fail-closed branch prints an honest note');
ok(!/mark\(/.test(watch), 'and marks no success — a page we would not publish is not a first success');
const noteText = (FR.match(/note\('([^']*(?:'[^']*)*?)'[\s\S]{0,200}?\);/) || [])[0] || '';
ok(/don’t have enough|not going to pretend|do not have enough/i.test(noteText),
  'and the sentence says what is missing rather than blaming the visitor');
for (const bad of [/error/i, /failed/i, /oops/i, /try again/i]) {
  ok(!bad.test(noteText), `the note is a status, not an error (${bad})`);
}

/* No claim of completeness gets smuggled in with it. */
for (const bad of [/every politician/i, /all \d+ (members|politicians)/i, /complete record/i,
                   /full record for (every|all)/i, /100% of/i]) {
  ok(!bad.test(FR), `first-run.js makes no completeness claim (${bad})`);
}

/* ═══════════════════════════════════════════════════════════════════════════
   4 · DEFERRAL, NOT DELETION
   ═══════════════════════════════════════════════════════════════════════════ */
section('4 · the second tier is deferred, and every bit of it comes back');

const gate = 'html[data-pdx-firstrun="pending"]';
ok(HTML.includes(gate), 'the pending gate is declared in index.html');
const gated = [...HTML.matchAll(/html\[data-pdx-firstrun="pending"\]\s*([^{]+)\{([^}]*)\}/g)]
  .map(m => ({ sel: m[1].trim(), body: m[2] }));
ok(gated.length >= 1, `at least one surface is deferred while pending (${gated.length})`);
for (const g of gated) {
  /* Everything the gate touches must still exist in the document — the gate is a
     rank change, and a rule pointing at nothing would be a deletion in disguise. */
  const id = (g.sel.match(/#([\w-]+)/) || [])[1];
  ok(!!id && HTML.includes(`id="${id}"`), `${g.sel} still exists in the document — deferred, not removed`);
  ok(!new RegExp(`html\\[data-pdx-firstrun="done"\\][^{]*#${id}\\b[^{]*\\{[^}]*display:\\s*none`).test(HTML),
    `${g.sel} is not still hidden once first run is done`);
}

/* The "how it works" copy is collapsed, not cut: both explainer paragraphs and
   the whole alignment card are inside the disclosure. */
/* Located inside the hero slice on purpose: the inline style block near the top
   of the document quotes the element name in a comment, and an indexOf on the
   whole file would land there and read the wrong region. */
const howRel = HERO.indexOf('<details id="hero-how"');
must(howRel > 0, 'the "how it works" disclosure is gone from the hero');
const howAt = heroAt + howRel;
const HOW = HERO.slice(howRel, HERO.indexOf('</details>', howRel));
eq((HOW.match(/class="hero-body/g) || []).length, 2,
  'both long explainer paragraphs are inside the disclosure — collapsed, not deleted');
ok(/True North|Find Your Matches/.test(HOW), 'and so is the values-match card');
ok(!/\bopen\b(?![-\w])/.test((HTML.match(/<details id="hero-how"[^>]*>/) || [''])[0]),
  'and it is closed by default, for a visitor who has not finished anything yet');
ok(/hero-stack-end/.test(HTML.slice(howAt - 400, howAt)),
  'the hero\'s bottom-slack hook sits on a real direct child of #hero around it');

/* The other direction: one surface is retired once first run is DONE. The
   new-voter welcome band exists to introduce the product, and a visitor who has
   opened a sourced record has been introduced. Asserted as its own case because
   it is the only rule that runs the other way, and because "hidden when done"
   would be a real bug if it were ever written as "hidden when pending". */
ok(/html\[data-pdx-firstrun="done"\]\s*#start-here\s*\{[^}]*display:\s*none/.test(HTML),
  'the new-voter welcome band is retired once first run is done');
ok(HTML.includes('id="start-here"'), 'and the band itself is still in the document');
ok(!/html\[data-pdx-firstrun="pending"\]\s*#start-here/.test(HTML),
  'and it is NOT hidden while pending — that is who it is for');

/* Both first-run entries share one runner. Two buttons carrying the same label
   and reaching different destinations is the defect this phase exists to fix, so
   the welcome band's primary CTA — labelled "See who represents me" — runs Path A
   rather than a lookalike flow of its own. */
ok(/window\.pdxStartHereGo = function/.test(HTML), 'the welcome band still has its primary runner');
const shGo = HTML.slice(HTML.indexOf('window.pdxStartHereGo = function'),
                        HTML.indexOf('window.pdxStartHereGo = function') + 900);
ok(/PDXFirstRun\.pathA/.test(shGo), 'and it routes through Path A — one label, one runner');
ok(/openLocationModal/.test(shGo),
  'with its previous behaviour kept verbatim as the pre-module fallback');

/* And the module opens it on success rather than leaving the copy buried. */
ok(/hero-how/.test(CODE) && /\.open = true/.test(CODE),
  'the disclosure opens once first run is done — available AFTER first success');
ok(/data-pdx-user-toggled/.test(CODE),
  'unless the visitor already made their own choice about it');

/* ═══════════════════════════════════════════════════════════════════════════
   5 · NO NEW DOOR, NO NEW PRODUCT, NO SCORE
   ═══════════════════════════════════════════════════════════════════════════ */
section('5 · this is hierarchy, not a new module');

for (const bad of [/document\.createElement\('(?:section|nav|dialog)'/, /innerHTML\s*=\s*['"`]\s*</,
                   /history\.pushState/, /location\.href\s*=/]) {
  ok(!bad.test(CODE), `the module builds no surface and owns no address (${bad})`);
}
eq((CODE.match(/createElement\(/g) || []).length, 1,
  'it creates exactly one element: the one sentence it prints when it has to say no');
for (const bad of [/directionMatch|direction_match/i, /\bparty\b/i, /republican|democrat/i,
                   /score\b/i, /grade\b/i, /rank\(/]) {
  ok(!bad.test(CODE), `it reads and publishes no judgement (${bad})`);
}
/* Third-door language, in the copy a reader actually sees. */
for (const bad of [/three doors/i, /third door/i, /the record door/i, /the ballot door/i]) {
  ok(!bad.test(VISIBLE), `no visible copy invents a third door (${bad})`);
}

/* Wiring: loaded, precached, and the shell renamed so a returning phone gets it. */
ok(/<script defer src="\/first-run\.js"><\/script>/.test(HTML), 'the module is loaded, deferred');
const iFR = HTML.indexOf('src="/first-run.js"');
for (const dep of ['person-file.js', 'publication-floor.js', 'ballot-workspace.js']) {
  ok(HTML.indexOf('src="/' + dep + '"') < iFR, `and after ${dep}, which it calls into`);
}
ok(/'\/first-run\.js'/.test(SW), 'the module is in the app-shell precache');
const cv = /const CACHE_VERSION = 'v(\d+)'/.exec(SW);
must(cv, 'sw.js no longer declares CACHE_VERSION');
ok(Number(cv[1]) >= 76,
  `sw: CACHE_VERSION is v${cv[1]} — index.html changed above the fold, and '/' is precached, so a ` +
  'returning phone keeps being served the unranked homepage until this is bumped past v75');

/* ═══════════════════════════════════════════════════════════════════════════
   6 · DRIVEN, NOT JUST READ
   ═══════════════════════════════════════════════════════════════════════════ */
section('6 · the floor gate and the fail-closed branch actually run');

/* A minimal DOM and a fake resolver: three resolved seats, and a floor that only
   clears the LAST of them. A module that ignored the floor would open the first. */
function drive({ clears, seats, located = true }) {
  const opened = [];
  const el = () => {
    const e = { children: [], style: {}, hidden: false, textContent: '', attrs: {},
      className: '', id: '', setAttribute(k, v) { this.attrs[k] = v; },
      getAttribute(k) { return this.attrs[k]; }, hasAttribute(k) { return k in this.attrs; },
      appendChild(c) { this.children.push(c); return c; }, addEventListener() {},
      scrollIntoView() {}, insertBefore(c) { this.children.push(c); return c; },
      get parentNode() { return null; } };
    return e;
  };
  const nodes = { 'who-represents-me': el() };
  const root = el();
  const ctx = {
    window: null, document: null, console: { log() {}, warn() {}, error() {} },
    setTimeout: (f) => { f(); return 0; }, clearTimeout() {}, Date: { now: () => 1 },
    CustomEvent: function (t, o) { this.type = t; this.detail = o && o.detail; },
    Number, String, JSON, Math, Object, Array, RegExp, Boolean,
  };
  const win = {
    _hasUserLocation: located,
    pdxFindMyReps() {},
    pdxRepsForMe: () => ({ levels: seats }),
    PDXPerson: { publishable: pid => clears.includes(pid),
                 open: (pid, o) => { opened.push([pid, o && o.section]); return true; } },
    localStorage: { _v: {}, getItem(k) { return this._v[k] || null; }, setItem(k, v) { this._v[k] = v; } },
    document: { documentElement: root, getElementById: id => nodes[id] || null,
                addEventListener() {}, createElement: () => el(), dispatchEvent() {} },
  };
  win.window = win;
  ctx.window = win; ctx.document = win.document; ctx.localStorage = win.localStorage;
  vm.createContext(ctx);
  vm.runInContext(FR, ctx);
  return { fr: win.PDXFirstRun, opened, nodes, root, win };
}
const SEATS = [
  { key: 'ussenate1', label: 'U.S. Senator', pid: 'thin_one', resolved: true },
  { key: 'ussenate2', label: 'U.S. Senator', pid: 'thin_two', resolved: true },
  { key: 'governor', label: 'Governor', pid: 'sourced_one', resolved: true },
];

{
  /* The floor clears only the third seat. The module must skip the first two. */
  const d = drive({ clears: ['sourced_one'], seats: SEATS });
  must(d.fr && typeof d.fr.pathA === 'function', 'PDXFirstRun.pathA is not exported');
  eq(d.fr.done(), false, 'a fresh visitor has not finished anything');
  d.fr.pathA();
  eq(d.opened.length, 1, 'Path A opened exactly one person file');
  eq(d.opened[0][0], 'sourced_one',
    'and it is the seat that CLEARS THE FLOOR, not the first one in the list');
  eq(d.opened[0][1], 'pdxsec-standout',
    'landing on the formal-record anchor — the record leads, not the match');
  eq(d.fr.done(), true, 'and that counts as a first success');
  eq(d.fr.state().via, 'record', 'recorded as a record success');
  eq(d.root.getAttribute('data-pdx-firstrun'), 'done', 'the gate flipped to done');
}
{
  /* Nothing clears the floor. Open nothing; mark nothing; say so. */
  const d = drive({ clears: [], seats: SEATS });
  d.fr.pathA();
  eq(d.opened.length, 0, 'when no seat clears the floor, Path A opens NO person file');
  eq(d.fr.done(), false, 'and does not claim a first success');
  eq(d.root.getAttribute('data-pdx-firstrun'), 'pending', 'the gate stays pending');
  const note = d.nodes['who-represents-me'].children.find(c => c.id === 'pdx-first-run-note');
  ok(!!note && /enough sourced record/i.test(note.textContent),
    'it says out loud that the record is not there yet');
}
{
  /* Unresolved seats are not candidates — this is the plausible-stranger guard. */
  const d = drive({ clears: ['sourced_one'], seats: SEATS.map(s => ({ ...s, resolved: false })) });
  d.fr.pathA();
  eq(d.opened.length, 0, 'a seat the resolver did not resolve is never opened, even if it would publish');
  eq(d.fr.done(), false, 'and never counts as success');
}
{
  /* No location at all: nothing opens, and nothing is said. Closing the picker is
     not a failure the product needs to comment on. */
  const d = drive({ clears: ['sourced_one'], seats: [], located: false });
  d.fr.pathA();
  eq(d.opened.length, 0, 'with no location set, Path A opens nothing');
  const note = d.nodes['who-represents-me'].children.find(c => c.id === 'pdx-first-run-note');
  ok(!note || !note.textContent, 'and prints nothing — an abandoned picker is not an error');
}
{
  /* Success is sticky and idempotent: a second, different path cannot rewrite the
     first one, and marking twice does not double-fire. */
  const d = drive({ clears: ['sourced_one'], seats: SEATS });
  d.fr.pathA();
  d.fr.mark('seat');
  eq(d.fr.state().via, 'record', 'the first success stands — a later path does not overwrite it');
  eq(d.fr.mark('nonsense'), false, 'and an invented kind of success is refused');
  d.fr.reset();
  eq(d.fr.done(), false, 'reset() puts a developer back on the first-run homepage');
}

console.log('');
if (fail) {
  console.error(`✗ first run: ${fail} of ${pass + fail} assertions failed\n`);
  process.exit(1);
}
console.log(`✓ first run: all ${pass} assertions passed — two ranked paths, success gated on the ` +
            `publication floor, fail-closed when the record is thin, second tier deferred not deleted\n`);
