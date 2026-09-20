/* ═══════════════════════════════════════════════════════════════════════════
   test-stance-sides.mjs — one store, one studio face, issue colour on the catalog
   ────────────────────────────────────────────────────────────────────────────
   THE DEFECT THIS FILE EXISTS FOR, stated the way a reader met it. A visitor
   set three positions in the stance studio on /my-stances. The studio showed
   three. /ballot ranked against three. /me printed "Nothing on file yet." over
   the same three, under a heading that says "Your positions".

   Nothing threw. There were three private readers of "sides this person holds"
   and they did not agree:

     · stance-studio.js walked window.PDXStances and fell back to the alignment
       signature.
     · me-desk.js read window.PDXYourFile — a DIFFERENT store, pdx_your_file_v1
       — so a position typed into the studio was, to that document, a position
       nobody had ever set.
     · race-sheet.js walked window._alignIssues.

   And PDXStances.all() RETURNS AN ARRAY. Any reader that reaches for
   Object.keys() on it gets ["0","1","2"], tests those against ISSUE_MAP,
   finds none of them, and reports an empty list without raising anything. That
   is the shape of every bug on this path: a silent empty over a full file.

   stance-sides.js is the one reader. This suite holds it to being the ONLY one,
   and holds the three surfaces to asking it:

     1. Load + shape — the module, its exports, and the fact that it owns no
        store of its own.
     2. The three surfaces delegate; no private walk survives behind them.
     3. /me's empty sentence is FORBIDDEN when the studio store holds a side.
        The fixture is the exact reported case: positions in pdx_my_stances_v1,
        nothing at all in pdx_your_file_v1.
     4. Object.keys on the stance array is a FAILING mutation — asserted by
        running the mutant and watching the empty sentence come back, so
        section 3 is proven to have teeth rather than merely to pass.
     5. Mode B's first paint is the studio, and "Browse every issue" is a closed
        fold — not a warehouse, and not a trapdoor that deletes the studio.
     6. Issue colour on the catalog: a rendered chip's hex IS PDXIssueColors'
        hex, for housing, for gun_rights, and for the whole water family.
     7. Wiring — script tags on every shell that loads a reader, precache, and
        load order.
     8. The constraints the brief drew in ink: no new store key, no DM number,
        no party, no gold focus paint.
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
const has = (hay, needle, msg) => ok(String(hay).indexOf(needle) >= 0, `${msg} (missing: ${JSON.stringify(needle)})`);
const lacks = (hay, needle, msg) => ok(String(hay).indexOf(needle) < 0, `${msg} (found: ${JSON.stringify(needle)})`);
// A probe whose target was renamed makes every assertion built on it vacuously
// true. That is a broken harness, not a passing contract — exit loudly.
const must = (cond, msg) => {
  if (cond) { passed++; return; }
  console.error(`\n✗ stance-sides: STALE HARNESS — ${msg}\n`);
  process.exit(2);
};
const section = (t) => console.log(`\n  ── ${t}`);

const SIDES_JS = read('stance-sides.js');
const STUDIO_JS = read('stance-studio.js');
const DESK_JS = read('me-desk.js');
const RACE_JS = read('race-sheet.js');
const STANCES_JS = read('my-stances.js');
const YF_JS = read('your-file.js');
const MAP_JS = read('issue-map.js');
const IC_JS = read('issue-colors.js');
const SCOPE_JS = read('issue-scope.js');
const MS_DOC = read('my-stances.html');
const ME_DOC = read('me.html');
const SW = read('sw.js');

// Comments are where the argument lives, and the argument is allowed to name
// the thing it forbids. Every "is this string in the shipped copy" probe below
// runs over a stripped copy so a comment explaining why Object.keys is wrong
// cannot fail the check that Object.keys is absent.
const bareJs = (s) => String(s)
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^[ \t]*\/\/.*$/gm, '');
const bareHtml = (s) => String(s).replace(/<!--[\s\S]*?-->/g, '');
const bareCss = (s) => String(s).replace(/\/\*[\s\S]*?\*\//g, '');

const SIDES_BARE = bareJs(SIDES_JS);
const DESK_BARE = bareJs(DESK_JS);
const STUDIO_BARE = bareJs(STUDIO_JS);
const STANCES_BARE = bareJs(STANCES_JS);
const MS_DOC_BARE = bareHtml(MS_DOC);

// Carve one function's body out of a module, by name, up to the next top-level
// `function` at the same indentation. Used instead of a line range so a later
// edit above it cannot silently move the window onto different code.
function bodyOf(src, decl) {
  const i = String(src).indexOf(decl);
  if (i < 0) return '';
  const rest = String(src).slice(i + decl.length);
  const j = rest.search(/\n  function /);
  return decl + (j < 0 ? rest : rest.slice(0, j));
}

console.log('\n   test-stance-sides — one reader, or the empty sentence comes back\n');

/* ══════════════════════════════════════════════════════════════════════════
   A SHARED DOM STUB.
   Flat enough that every module under test parses and paints, with one
   deliberate exception: a write to innerHTML registers a lookup stub for every
   id the written markup declares. Both my-stances.js and me-desk.js print a
   surface as a STRING and then look ids up inside it; without the registry
   those paths are untestable and would pass vacuously.
   ══════════════════════════════════════════════════════════════════════════ */
function makeDoc() {
  const nodes = [];
  function node(tag) {
    const n = {
      tagName: String(tag || 'div').toUpperCase(),
      id: '', className: '', textContent: '', value: '', hidden: false, open: false,
      _html: '', children: [], parentNode: null, attrs: {},
      style: { setProperty() {}, removeProperty() {} },
      setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'id') this.id = String(v); },
      getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
      removeAttribute(k) { delete this.attrs[k]; },
      addEventListener(t, f) { (this.__ev || (this.__ev = {}))[t] = f; },
      removeEventListener() {},
      appendChild(c) { c.parentNode = this; this.children.push(c); return c; },
      insertBefore(c) { c.parentNode = this; this.children.push(c); return c; },
      removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); return c; },
      querySelector() { return null; }, querySelectorAll() { return []; },
      closest() { return null; }, focus() {}, click() {}, remove() {},
      scrollIntoView() {}, insertAdjacentHTML() {},
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    };
    Object.defineProperty(n, 'innerHTML', {
      get() { return this._html; },
      set(v) {
        this._html = String(v == null ? '' : v);
        const re = /\sid="([^"]+)"/g;
        let m;
        while ((m = re.exec(this._html))) {
          if (!nodes.some((x) => x.id === m[1])) {
            const stub = node('div');
            stub.id = m[1];
            stub.parentNode = this;
          }
        }
      },
      enumerable: true, configurable: true,
    });
    nodes.push(n);
    return n;
  }
  const body = node('body');
  const doc = {
    readyState: 'complete', cookie: '', body, activeElement: null,
    head: node('head'), documentElement: node('html'),
    createElement: (t) => node(t),
    getElementById: (id) => nodes.find((n) => n.id === id) || null,
    querySelector: () => null, querySelectorAll: () => [],
    addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
  };
  doc.__node = node;
  doc.__nodes = nodes;
  return doc;
}

function baseWin() {
  const win = {
    console, JSON, Math, Date, String, Number, Boolean, Array, Object, RegExp,
    Error, Promise, Set, Map, URLSearchParams,
    encodeURIComponent, decodeURIComponent, parseInt, parseFloat, isNaN,
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    requestAnimationFrame(f) { try { f(); } catch (e) {} return 0; },
  };
  win.window = win;
  win.self = win;
  win.document = makeDoc();
  win.addEventListener = () => {};
  win.removeEventListener = () => {};
  win.dispatchEvent = () => true;
  win.CustomEvent = function (t, d) { return { type: t, detail: (d && d.detail) || null }; };
  return win;
}

const STANCE_KEY = 'pdx_my_stances_v1';
const YF_KEY = 'pdx_your_file_v1';

// THE POSITIONS, WRITTEN THE WAY THE OWNER WRITES THEM. One opaque JSON blob
// under my-stances.js's own key in its own shape, so the read under test is
// that module's real load() and normalise rather than a fixture handed straight
// to the reader.
function stanceBlob(held, prio) {
  const items = {};
  Object.keys(held || {}).forEach((k) => {
    items[k] = {
      issueKey: k, position: held[k], priority: (prio && prio[k]) || 'medium', note: '',
      createdAt: 1700000000000, updatedAt: 1700000000000,
    };
  });
  return JSON.stringify({ version: 1, items, updatedAt: 1700000000000 });
}

function storageOn(win, seed) {
  const store = Object.assign({}, seed || {});
  win.localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem(k, v) { store[k] = String(v); },
    removeItem(k) { delete store[k]; },
    key: (i) => Object.keys(store)[i] || null,
    get length() { return Object.keys(store).length; },
  };
  win.sessionStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  win.__store = store;
  return store;
}

/* THE DESK, OVER THE STANCE STORE.
   `sidesSrc` is a parameter on purpose: section 4 boots this exact fixture with
   a mutated stance-sides.js and asserts the paint changes. `answers` seeds the
   OTHER store, and the reported defect is what happens when it is empty. */
function bootDesk(o) {
  o = o || {};
  const win = baseWin();
  win.__PDX_ME_DOC = true;
  const mount = win.document.__node('main');
  mount.id = 'me-desk';
  win.document.body.appendChild(mount);
  win.location = {
    href: 'https://politidex.fyi/me', pathname: '/me', search: '', hash: '',
    origin: 'https://politidex.fyi', replace() {}, assign() {},
  };
  win.history = { pushState() {}, replaceState() {} };
  const seed = {};
  if (o.held) seed[STANCE_KEY] = stanceBlob(o.held, o.prio);
  if (o.answers) {
    const answers = {};
    Object.keys(o.answers).forEach((k) => { answers[k] = { position: o.answers[k], updatedAt: 1700000000000 }; });
    seed[YF_KEY] = JSON.stringify({ version: 1, answers, updatedAt: 1700000000000 });
  }
  storageOn(win, seed);
  win.auth = {
    currentUser: o.uid ? { uid: o.uid, isAnonymous: false, email: 'voter@example.org', displayName: null } : null,
    onAuthStateChanged() {},
  };
  win.TEAM_POSITIONS = [];
  win._currentVoterLocation = null;
  win._hasUserLocation = false;
  win.pdxRepsForMe = () => ({ located: false, state: '', county: '', levels: [] });
  win.PROFILES = {};
  const ctx = vm.createContext(win);
  win.__err = null;
  try {
    vm.runInContext(MAP_JS, ctx, { filename: 'issue-map.js' });
    vm.runInContext(IC_JS, ctx, { filename: 'issue-colors.js' });
    vm.runInContext(o.sidesSrc || SIDES_JS, ctx, { filename: 'stance-sides.js' });
    vm.runInContext(STANCES_JS, ctx, { filename: 'my-stances.js' });
    vm.runInContext(YF_JS, ctx, { filename: 'your-file.js' });
    vm.runInContext(DESK_JS, ctx, { filename: 'me-desk.js' });
  } catch (e) { win.__err = e; }
  win.__mount = mount;
  return win;
}

/* THE STUDIO, ON ITS OWN DOCUMENT. */
function bootStudio(o) {
  o = o || {};
  const win = baseWin();
  win.__PDX_STANCES_DOC = true;
  const sec = win.document.__node('section');
  sec.id = 'my-stances';
  win.document.body.appendChild(sec);
  const mst = win.document.__node('div');
  mst.id = 'mst';
  sec.appendChild(mst);
  // THE FOLD, AS THE DOCUMENT SHIPS IT: a <details>, closed. Section 5 reads
  // `open` off this node after the paint, so it must start the way markup does.
  const door = win.document.__node('details');
  door.id = 'ms-door';
  door.open = false;
  sec.appendChild(door);
  const doorBody = win.document.__node('div');
  doorBody.id = 'ms-door-body';
  door.appendChild(doorBody);
  win.location = {
    href: 'https://politidex.fyi/my-stances', pathname: '/my-stances', search: '', hash: '',
    origin: 'https://politidex.fyi', replace() {}, assign(u) { win.__nav = String(u); },
  };
  win.history = { pushState() {}, replaceState(a, b, u) { win.__url = String(u); } };
  const seed = {};
  if (o.held) seed[STANCE_KEY] = stanceBlob(o.held, o.prio);
  storageOn(win, seed);
  const ctx = vm.createContext(win);
  win.__err = null;
  try {
    vm.runInContext(MAP_JS, ctx, { filename: 'issue-map.js' });
    vm.runInContext(SCOPE_JS, ctx, { filename: 'issue-scope.js' });
    vm.runInContext(IC_JS, ctx, { filename: 'issue-colors.js' });
    vm.runInContext(o.sidesSrc || SIDES_JS, ctx, { filename: 'stance-sides.js' });
    vm.runInContext(STANCES_JS, ctx, { filename: 'my-stances.js' });
    vm.runInContext(STUDIO_JS, ctx, { filename: 'stance-studio.js' });
  } catch (e) { win.__err = e; }
  win.__paint = () => {
    const S = win.PDXStanceStudio;
    if (S && typeof S.render === 'function') { try { S.render(); } catch (e) { win.__err = e; } }
    const h = win.document.getElementById('mst');
    return h ? String(h.innerHTML) : '';
  };
  return win;
}

function regionOf(win, id) {
  const html = String(win.__mount.innerHTML);
  const open = html.indexOf(`id="${id}"`);
  if (open < 0) return '';
  const start = html.lastIndexOf('<section', open);
  const end = html.indexOf('</section>', open);
  return start < 0 || end < 0 ? '' : html.slice(start, end + 10);
}

const EMPTY_SENTENCE = 'Nothing on file yet.';

// ═════════════════════════════════════════════════════════════════════════════
section('1 · the one reader: it exists, it publishes a list, it owns no store');
// ═════════════════════════════════════════════════════════════════════════════
{
  const win = bootStudio({ held: { housing: 'support' } });
  ok(!win.__err, `stance-sides.js does not load cleanly: ${win.__err && win.__err.message}`);
  const S = win.PDXStanceSides;
  must(!!S, 'window.PDXStanceSides is not published — this whole suite is stale');
  ['list', 'keys', 'count', 'position', 'has', 'label', 'countLine'].forEach((m) => {
    ok(typeof S[m] === 'function', `PDXStanceSides.${m}() is not a function`);
  });
  // IT IS A READER. A second writer of this data is the defect in another
  // costume: two setters means two normalisations and two ideas of "set".
  ['set', 'save', 'write', 'remove', 'adopt'].forEach((m) => {
    ok(typeof S[m] !== 'function', `PDXStanceSides publishes ${m}() — the one reader must not also be a writer`);
  });
  eq(S.count(), 1, 'the one reader does not see the single position in the store');
  eq(S.position('housing'), 'support', 'the one reader reports the wrong side for a held issue');
  ok(S.has('housing'), 'has() is false for an issue the store holds');
  ok(!S.has('gun_rights'), 'has() is true for an issue nobody set');
  eq(S.position('gun_rights'), '', 'position() invents a side for an issue nobody set');
  eq(S.countLine(1), '1 position on file', 'the count line does not agree with itself in the singular');
  eq(S.countLine(4), '4 positions on file', 'the count line does not agree with itself in the plural');
}
// NO NEW STORE KEY. Asserted structurally rather than by promise: the module
// names no key, registers no collection and touches no storage API at all.
lacks(SIDES_BARE, 'localStorage', 'stance-sides.js touches localStorage — the one reader owns no store');
lacks(SIDES_BARE, 'PDXStore', 'stance-sides.js touches PDXStore — the one reader owns no collection');
lacks(SIDES_BARE, 'pdx_', 'stance-sides.js names a storage key — the one reader owns no store');
lacks(SIDES_BARE, 'defineCollection', 'stance-sides.js registers a sync collection of its own');
// NO DM NUMBER, NO PARTY. This list is "sides this person holds" and nothing
// else: a score or a party letter riding along here would make every surface
// that paints a side also publish a verdict.
['directionMatch', 'dmScore', 'PDXConsistency', 'partyOf', 'is_republican', 'is_democrat']
  .forEach((t) => lacks(SIDES_BARE, t, `stance-sides.js reaches for ${t} — this list carries no score and no party`));
lacks(SIDES_BARE, 'fetch(', 'stance-sides.js makes a network call — the read is local-first and synchronous');

// ═════════════════════════════════════════════════════════════════════════════
section('2 · three surfaces, one reader, and no private walk left behind');
// ═════════════════════════════════════════════════════════════════════════════
// THE DESK IS THE ONE THAT WENT BLANK, so its reader is carved out and read.
// Inside positions() there must be exactly one source of truth: if this body
// can still reach PDXYourFile, PDXStances or _alignIssues directly, then the
// drift it caused can come back on a later edit and nothing here would notice.
{
  const body = bodyOf(DESK_BARE, 'function positions()');
  must(body.length > 40, 'me-desk.js no longer declares positions() — this section is stale');
  has(body, 'PDXStanceSides', "me-desk.js's positions() does not ask the one reader");
  lacks(body, 'PDXYourFile', "me-desk.js's positions() still reads the OTHER store directly — this is the reported defect");
  lacks(body, 'PDXStances', "me-desk.js's positions() walks the stance store privately again");
  lacks(body, '_alignIssues', "me-desk.js's positions() walks the alignment signature privately again");
  lacks(body, 'Object.keys', "me-desk.js's positions() calls Object.keys on the reader's output");
}
{
  const body = bodyOf(STUDIO_BARE, 'function sides()');
  must(body.length > 20, 'stance-studio.js no longer declares sides() — this section is stale');
  has(body, 'PDXStanceSides', "the studio's sides() does not ask the one reader");
  lacks(body, 'PDXStances', 'the studio kept its private walk behind the shared reader — two readers again');
  lacks(body, '_alignIssues', 'the studio kept its private signature fallback behind the shared reader');
}
{
  const body = bodyOf(bareJs(RACE_JS), 'function axis()');
  must(body.length > 40, 'race-sheet.js no longer declares axis() — this section is stale');
  has(body, 'PDXStanceSides', "the ballot's ranking axis does not ask the one reader");
}
// THE THREE AGREE ON ONE FIXTURE. Same store, three surfaces, one count — which
// is the sentence the brief opens with, asserted rather than asserted about.
{
  const held = { housing: 'support', gun_rights: 'oppose', water: 'support' };
  const desk = bootDesk({ uid: 'u_three', held });
  const studio = bootStudio({ held });
  ok(!desk.__err, `the desk does not boot over the stance store: ${desk.__err && desk.__err.message}`);
  ok(!studio.__err, `the studio does not boot over the stance store: ${studio.__err && studio.__err.message}`);
  eq(desk.PDXStanceSides.count(), 3, 'the desk and the store disagree about how many sides are on file');
  eq(studio.PDXStanceSides.count(), 3, 'the studio and the store disagree about how many sides are on file');
  eq(desk.PDXMeDesk.positions().length, 3, "the desk's own read does not see all three sides");
  // AND THE SIDES THEMSELVES, not just the count: an oppose that arrives as a
  // support is a worse failure than a missing row.
  eq(desk.PDXStanceSides.position('gun_rights'), 'oppose', 'an oppose reaches the desk as something else');
}

// ═════════════════════════════════════════════════════════════════════════════
section('3 · /me may not print the empty sentence over a file with sides in it');
// ═════════════════════════════════════════════════════════════════════════════
// THE REPORTED CASE, EXACTLY. Three positions in pdx_my_stances_v1 and NOTHING
// in pdx_your_file_v1 — the desk used to read only the second store, so this is
// the fixture under which it printed "Nothing on file yet." over a full file.
{
  const win = bootDesk({ uid: 'u_studio_only', held: { housing: 'support', gun_rights: 'oppose', water: 'support' } });
  ok(!win.__err, `the desk does not boot: ${win.__err && win.__err.message}`);
  eq(win.localStorage.getItem(YF_KEY), null, 'the fixture seeded the other store — the reported defect is not being reproduced');
  const region = regionOf(win, 'me-positions');
  must(region.length > 120, 'region b did not paint at all — the empty-sentence check would be vacuous');
  lacks(region, EMPTY_SENTENCE,
    'FORBIDDEN: /me printed the empty sentence while the studio store held three sides');
  // A ROW PER SIDE, so "not empty" cannot be satisfied by an empty region that
  // merely dropped the sentence.
  const chips = (region.match(/<li class="me-pchip/g) || []).length;
  eq(chips, 3, 'region b did not paint one chip per side on file');
}
// ONE SIDE IS ENOUGH. The brief says "≥1 support/oppose", so each of the two
// sided answers is checked on its own — a reader who set exactly one oppose is
// the smallest non-empty file there is.
['support', 'oppose'].forEach((pos) => {
  const win = bootDesk({ uid: 'u_one_' + pos, held: { housing: pos } });
  const region = regionOf(win, 'me-positions');
  must(region.length > 120, `region b did not paint for a single ${pos} — this check would be vacuous`);
  lacks(region, EMPTY_SENTENCE, `FORBIDDEN: /me printed the empty sentence over a single ${pos}`);
});
// THE SENTENCE IS STILL THERE FOR A GENUINELY EMPTY FILE. Deleting the honest
// empty would also satisfy every assertion above, and would be a worse product
// than the bug.
{
  const win = bootDesk({ uid: 'u_zero' });
  const region = regionOf(win, 'me-positions');
  must(region.length > 120, 'region b did not paint for an empty file');
  has(region, EMPTY_SENTENCE, 'the honest empty sentence is gone — an empty file must say so in words');
  eq((region.match(/<li class="me-pchip/g) || []).length, 0, 'an empty file painted position chips');
}
// THE SECOND STORE, ON THE DOCUMENT WHERE IT IS THE ONLY ONE THAT CAN ANSWER.
// your-file.js owns pdx_your_file_v1 and projects its sided answers into the
// alignment signature — but through alignment-tool.js's alignSetIntensity, and
// /me carries no engine, so on /me that projection is a no-op and the signature
// is empty. A reader whose whole file was typed into region b's editor must
// still see it, which is why the one reader asks that store directly.
{
  const win = bootDesk({ uid: 'u_yf_only', answers: { housing: 'support', gun_rights: 'oppose' } });
  ok(!win.__err, `the desk does not boot over the editor's own store: ${win.__err && win.__err.message}`);
  eq(win.localStorage.getItem(STANCE_KEY), null, 'the fixture seeded the stance store — this is the OTHER store\u2019s check');
  // The signature really is empty here, so this is not passing by accident.
  ok(typeof win.alignSetIntensity !== 'function', '/me grew an alignment engine — this check no longer isolates the second store');
  eq(win.PDXStanceSides.count(), 2, 'the one reader does not see answers written by the editor of record');
  const region = regionOf(win, 'me-positions');
  must(region.length > 120, 'region b did not paint for a Your File reader');
  lacks(region, EMPTY_SENTENCE, 'FORBIDDEN: /me printed the empty sentence over answers in pdx_your_file_v1');
  eq((region.match(/<li class="me-pchip/g) || []).length, 2, 'region b did not paint one chip per answer on file');
}
// "NOT SURE" IS AN ANSWER, AND THE ANSWER IS "NO SIDE". It must not become a
// position: your-file.js's own LEVEL table has no level for it.
{
  const win = bootDesk({ uid: 'u_unsure', answers: { housing: 'unsure' } });
  eq(win.PDXStanceSides.count(), 0, '"not sure" was counted as a side this person holds');
  has(regionOf(win, 'me-positions'), EMPTY_SENTENCE, 'a file of nothing but "not sure" claims to hold a position');
}
// ONE ISSUE, TWO STORES, ONE ROW. An issue answered in both places is one side,
// not two chips — and the studio's row wins, because it is the only one of the
// two that also carries the priority and the note for that issue.
{
  const win = bootDesk({ uid: 'u_both', held: { housing: 'oppose' }, answers: { housing: 'support' } });
  eq(win.PDXStanceSides.count(), 1, 'an issue set in both stores was listed twice');
  eq(win.PDXStanceSides.position('housing'), 'oppose', 'the stance studio did not win the issue it also holds a priority for');
  eq((regionOf(win, 'me-positions').match(/<li class="me-pchip/g) || []).length, 1, 'region b painted two chips for one issue');
}
// SIGNED IN, AND THE READ NEVER WAITS ON A SERVER. The path is local-first:
// PDXStances.load() answers out of the local snapshot synchronously and the
// account pull merges in afterwards, announcing pdx-stances-change, which the
// desk already repaints on. So a signed-in reader holding sides cannot meet the
// empty sentence — asserted by booting WITH a uid and reading the same region.
{
  const win = bootDesk({ uid: 'u_signed_in', held: { housing: 'support', gun_rights: 'oppose' } });
  const region = regionOf(win, 'me-positions');
  must(region.length > 120, 'region b did not paint for a signed-in reader');
  lacks(region, EMPTY_SENTENCE, 'FORBIDDEN: a signed-in reader with sides on file met the empty sentence');
  has(DESK_JS, 'pdx-stances-change', 'the desk does not repaint when the store changes — a late sync would leave a stale paint');
}

// ═════════════════════════════════════════════════════════════════════════════
section('4 · Object.keys on the stance array is a failing mutation');
// ═════════════════════════════════════════════════════════════════════════════
// PDXStances.all() is an ARRAY. A reader that walks it with Object.keys gets
// the strings "0", "1", "2", tests them against ISSUE_MAP, matches nothing and
// reports an empty list — without throwing. Section 3 is the assertion that
// catches that, and this section proves section 3 has teeth by building the
// mutant and watching the empty sentence come back.
lacks(SIDES_BARE, 'Object.keys', 'stance-sides.js calls Object.keys — the stance store is an array');
{
  const ANCHOR = `        for (var i = 0; i < rows.length; i++) {
          var r = rows[i];
          if (!r || !r.issueKey || seen[r.issueKey]) continue;`;
  must(SIDES_JS.split(ANCHOR).length === 2,
    'the indexed loop over the stance array is not where this mutation expects it — widen the anchor, do not drop the check');
  const MUTANT = SIDES_JS.replace(ANCHOR, `        var mk = Object.keys(rows);
        for (var i = 0; i < mk.length; i++) {
          var r = { issueKey: mk[i], position: 'support', priority: 'medium' };
          if (!r || !r.issueKey || seen[r.issueKey]) continue;`);
  must(MUTANT !== SIDES_JS, 'the mutation did not apply — this section is vacuous');

  const held = { housing: 'support', gun_rights: 'oppose', water: 'support' };
  // THE MUTANT IS SILENT, which is the point: it neither throws nor logs.
  const mStudio = bootStudio({ held, sidesSrc: MUTANT });
  ok(!mStudio.__err, 'the mutant threw — the real bug was silent, so the mutant must be silent too');
  eq(mStudio.PDXStanceSides.count(), 0, 'the Object.keys mutant still found the sides — the mutation is not faithful to the bug');

  // AND SECTION 3 FAILS UNDER IT. Same fixture, same region, and the empty
  // sentence is back — so the assertion above is load-bearing rather than
  // incidentally true.
  const mDesk = bootDesk({ uid: 'u_mutant', held, sidesSrc: MUTANT });
  const region = regionOf(mDesk, 'me-positions');
  must(region.length > 120, 'region b did not paint under the mutant — the proof would be vacuous');
  has(region, EMPTY_SENTENCE,
    'the Object.keys mutant did NOT bring back the empty sentence, so section 3 proves nothing — fix this harness before trusting it');

  // The shipped module over the identical fixture: three, not zero.
  eq(bootDesk({ uid: 'u_real', held }).PDXStanceSides.count(), 3,
    'the shipped reader does not see the three sides the mutant misses');
}
// THE SHAPE IS WRITTEN DOWN WHERE THE NEXT AUTHOR WILL BE STANDING. A comment
// is the only thing that stops this being rediscovered by a reader who assumes
// a store is a map, so the header is required to say so.
has(SIDES_JS, 'ARRAY', 'stance-sides.js does not say in words that the store is an array');
has(SIDES_JS, 'Object.keys', 'stance-sides.js does not warn the next author away from Object.keys');

// ═════════════════════════════════════════════════════════════════════════════
section('5 · Mode B stays; "Every issue" is a closed fold, not a warehouse');
// ═════════════════════════════════════════════════════════════════════════════
// THE MARKUP AS SHIPPED. A <details> with no `open`, which is what "not a
// visible warehouse on first paint" means in markup rather than in a promise.
{
  const m = /<details[^>]*id="ms-door"[^>]*>/.exec(MS_DOC_BARE) || /<details[^>]*class="ms-door"[^>]*>/.exec(MS_DOC_BARE);
  must(!!m, 'the door on /my-stances is not a <details> — the fold this section checks does not exist');
  ok(!/\sopen[\s=>]/.test(m[0]), `the fold ships OPEN: ${m[0]}`);
  has(MS_DOC_BARE, 'Browse every issue', 'the fold does not carry the summary the brief names');
  lacks(MS_DOC_BARE, 'id="ms-door-more"', 'the old trapdoor button is still on this document');
  lacks(MS_DOC_BARE, 'Every issue on file', 'the old gesture copy is still on this document');
}
// THE COLLECTION IS INERT UNTIL ASKED. #ms-body lives inside the template and
// nowhere else, so the 121 rows cost nothing until the fold opens.
{
  // Stripped, because the comment above the template quotes its own opening tag
  // to explain what mounts from it — and a count over the raw file reads that
  // sentence as a second template.
  const tplCount = (MS_DOC_BARE.match(/<template id="ms-shell-tpl">/g) || []).length;
  eq(tplCount, 1, 'my-stances.html does not carry exactly one shell template');
  const tplStart = MS_DOC_BARE.indexOf('<template id="ms-shell-tpl">');
  const tplEnd = MS_DOC_BARE.indexOf('</template>', tplStart);
  must(tplStart > 0 && tplEnd > tplStart, 'the shell template is unparseable here — this check is stale');
  const outside = MS_DOC_BARE.slice(0, tplStart) + MS_DOC_BARE.slice(tplEnd);
  lacks(outside, 'id="ms-body"', 'the collection mount is outside the template — it would paint on arrival');
}
// AND THE STUDIO IS NOT HIDDEN BY ANYTHING. The fold used to be a button that
// mounted the collection over Mode B and set #mst.hidden — a door out of a room
// that deleted the room.
{
  const mst = /<div id="mst"[^>]*>/.exec(MS_DOC_BARE);
  must(!!mst, '#mst is gone from my-stances.html — Mode B has no host');
  ok(!/\bhidden\b/.test(mst[0]), `the studio host ships hidden: ${mst[0]}`);
  const mount = bodyOf(STANCES_BARE, 'function mountShell()');
  must(mount.length > 60, 'my-stances.js no longer declares mountShell() — this check is stale');
  lacks(mount, "el('mst')", 'mountShell() still reaches for the studio host — opening the fold must not delete Mode B');
  has(mount, 'ms-door-body', 'mountShell() does not clone the collection into the fold');
}
// FIRST PAINT, RUN. The studio paints; the collection does not mount; the fold
// is still closed afterwards.
{
  const win = bootStudio({ held: { housing: 'support' } });
  const painted = win.__paint();
  ok(!win.__err, `the studio does not paint: ${win.__err && win.__err.message}`);
  must(painted.length > 200, 'Mode B painted nothing — every check below would be vacuous');
  eq(win.document.getElementById('ms-body'), null, 'the every-issue collection mounted on first paint — that is the warehouse');
  const door = win.document.getElementById('ms-door');
  must(!!door, 'the fold is not in the booted document — this check is stale');
  ok(!door.open, 'the fold opened itself on first paint');
  eq(String(win.document.getElementById('ms-door-body').innerHTML), '', 'the fold body was filled before anyone opened it');
  eq(win.document.getElementById('mst').hidden, false, 'something hid Mode B on first paint');
}
// NONE OF THE FOUR PHRASES IS ON THIS DOCUMENT, in the markup or in either
// module that paints into it. The old link dropped the reader into the
// alignment manifesto; the fold replaced the link, so the copy goes too.
['Alignment Tool', 'Your Match', 'Say-vs-Do', 'Direction Match'].forEach((t) => {
  lacks(MS_DOC_BARE, t, `"${t}" is still on my-stances.html`);
  lacks(STANCES_BARE, t, `"${t}" is still printed by my-stances.js`);
  lacks(STUDIO_BARE, t, `"${t}" is still printed by stance-studio.js`);
});
// THE PROMOTIONAL PANEL IS GONE, stylesheet and all — leaving the CSS behind
// leaves the next author a styled shape to fill.
lacks(STANCES_BARE, 'renderPowers', 'the promotional panel is still rendered on /my-stances');
// Stripped: the comment that replaced the block names the classes it deleted,
// which is the record of why they are gone and must not fail the check that
// they are gone.
lacks(bareCss(read('my-stances.css')), '.ms-powers', 'the promotional panel still has a stylesheet waiting for it');
// STARS STAY A ROW AFFORDANCE, NOT A SECOND PRODUCT: priority is set on the row
// it belongs to and the desk reads it without owning a surface for it.
has(STANCES_BARE, 'data-ms-prio', 'the priority control left the row it belongs to');

// ═════════════════════════════════════════════════════════════════════════════
section('6 · one chip hex IS PDXIssueColors: housing, gun_rights, the water family');
// ═════════════════════════════════════════════════════════════════════════════
// RENDERED, NOT SOURCE-CHECKED. A surface that hard-codes a hex "just for this
// one chip" reads identically in review and only shows up as two housing golds
// on one page, so the assertion compares the hex that reached the markup with
// the hex the module publishes.
{
  const WATER = ['water', 'water_storage', 'datacenter_water'];
  const KEYS = ['housing', 'gun_rights'].concat(WATER);
  const held = {};
  KEYS.forEach((k, i) => { held[k] = i % 2 ? 'oppose' : 'support'; });
  const win = bootStudio({ held });
  const painted = win.__paint();
  ok(!win.__err, `the studio does not paint the coloured chips: ${win.__err && win.__err.message}`);
  const C = win.PDXIssueColors;
  must(!!(C && typeof C.skin === 'function'), 'PDXIssueColors.skin() is gone — this section is stale');
  must(painted.indexOf('--pdx-ic:') > 0, 'no chip carried an issue colour at all — this section would be vacuous');

  // Every chip in the paint, by the key it declares, with the hex it declares.
  // The studio spells the key `data-k`; the collection spells it data-ms-goto /
  // data-ms-row / data-ms-filter. Both spellings are read so this survives a
  // paint that starts on either surface.
  const chipHex = {};
  const byAttr = /data-ic="on" style="--pdx-ic:(#[0-9A-Fa-f]{6})/;
  (painted.match(/<button[^>]*>/g) || []).forEach((tag) => {
    const k = (/\sdata-(?:k|ms-goto|ms-row|ms-filter)="([a-z0-9_]+)"/.exec(tag) || [, ''])[1];
    const hex = (byAttr.exec(tag) || [, ''])[1];
    if (k && hex) chipHex[k] = hex;
  });
  must(Object.keys(chipHex).length > 0, 'no chip declared both a key and a hex — the comparison would be vacuous');

  KEYS.forEach((k) => {
    const want = (/--pdx-ic:(#[0-9A-Fa-f]{6})/.exec(C.skin(k, win.coreIssueForKey).attr || '') || [, ''])[1];
    must(!!want, `PDXIssueColors resolves no colour for "${k}" — the fixture, not the surface, is wrong`);
    if (chipHex[k]) {
      eq(chipHex[k], want, `the chip for "${k}" painted a hex PDXIssueColors did not publish`);
    } else {
      // Not every one of the five is guaranteed a chip in one paint; at least
      // one of each family must be, and that is asserted below.
      passed++;
    }
  });
  ok(!!chipHex.housing, 'housing painted no coloured chip');
  ok(!!chipHex.gun_rights, 'gun_rights painted no coloured chip');
  ok(WATER.some((k) => !!chipHex[k]), 'no member of the water family painted a coloured chip');

  // THE WATER FAMILY IS ONE COLOUR, which is the whole promise of a bundle:
  // water, water storage and a data centre's water draw are the same issue to
  // a reader and must be the same colour to the eye.
  const waterHexes = WATER.map((k) => (/--pdx-ic:(#[0-9A-Fa-f]{6})/.exec(C.skin(k, win.coreIssueForKey).attr || '') || [, ''])[1]);
  must(waterHexes.every(Boolean), 'part of the water family resolves to no colour — this check is stale');
  eq(new Set(waterHexes).size, 1, `the water family paints ${new Set(waterHexes).size} different colours: ${waterHexes.join(', ')}`);
}
// ONE ROAD IN, AT EVERY CALL SITE. The rendered check above can only see the
// surface a given paint happens to be standing on; the catalog's rows, its
// bundle heads and its filter row mount from a template and are not in that
// paint. So each issue-named element is found by the class it opens with and
// held to two things: it asks skin(), and it writes no hex of its own.
//
// A LITERAL HEX IS NOT BANNED FROM THESE MODULES OUTRIGHT, and that is
// deliberate rather than lenient: my-stances.js also draws the shareable PNG on
// a canvas, where the navy gradient is the card's own furniture and there is no
// custom property to read. What must carry no hex is the markup of an element
// named after an issue.
{
  const WINDOW = 5;   // `var a = skin(k)` sits a few lines above its own tag
  const SITES = [
    // The filter row's token is the BUNDLE chip specifically. The row's first
    // chip is "All issues", which is the absence of a filter rather than an
    // issue, and takes no skin on purpose — asserted on its own below.
    ['my-stances.js', STANCES_BARE, ['class="ms-chip ', 'data-ms-filter="\' + esc(ci.key)', 'class="ms-group', 'class="ms-issue']],
    ['stance-studio.js', STUDIO_BARE, ['class="mst-chip', 'class="mst-hit"', 'class="mst-held"']],
  ];
  SITES.forEach(([name, src, tokens]) => {
    has(src, 'PDXIssueColors', `${name} does not ask PDXIssueColors for its chip colours`);
    const lines = src.split('\n');
    tokens.forEach((tok) => {
      const at = lines.findIndex((l) => l.indexOf(tok) >= 0);
      must(at >= 0, `${name} no longer opens an element with ${tok} — this check is stale`);
      const chunk = lines.slice(Math.max(0, at - WINDOW), at + 1).join('\n');
      has(chunk, 'skin(', `${name}: the element opening with ${tok} does not ask for an issue colour`);
      const hexes = (chunk.match(/#[0-9A-Fa-f]{3,6}\b/g) || []);
      eq(hexes.length, 0, `${name}: the element opening with ${tok} writes its own hex: ${hexes.join(', ')}`);
    });
  });
}
// AND THE ONE CHIP THAT MUST NOT BE SKINNED. "All issues" clears the filter; a
// colour on it would name an issue that does not exist.
{
  const line = STANCES_BARE.split('\n').find((l) => l.indexOf('data-ms-filter=""') >= 0) || '';
  must(line.length > 0, 'the filter row no longer offers an all-issues chip — this check is stale');
  lacks(line, 'skin(', '"All issues" wears an issue colour — it is the absence of a filter');
}
// BUNDLES GO THROUGH ROLLUP_PARENT — the same table the bill letterheads use,
// asserted by resolving every rollup the filter row can offer.
{
  const win = bootStudio({});
  const C = win.PDXIssueColors;
  must(!!(C && C.ROLLUP_PARENT), 'PDXIssueColors.ROLLUP_PARENT is gone — bundles have no declared parent');
  const rollups = Object.keys(C.ROLLUP_PARENT);
  must(rollups.length > 6, 'the rollup table is suspiciously small — this check is stale');
  rollups.forEach((k) => {
    ok(!!C.skin(k, win.coreIssueForKey).on, `bundle "${k}" resolves to no colour through ROLLUP_PARENT`);
  });
}
// GOLD IS NOT BANNED FROM THIS STYLESHEET, and the distinction is the whole
// point of the clause. Gold is the star, the flash that confirms a save, the
// nudge banner and the amber that means MIXED — none of which claim to be an
// issue. What the brief forbids is gold standing in for an ISSUE on the
// elements that are NAMED after one: the summary chip, the bundle filter, the
// bundle head and the catalog row. Those three states — "this is the active
// filter", "this issue is weighted high" — were painted in one gold that
// belonged to neither, on chips that now carry the issue's own colour.
//
// So the check is scoped to selectors that target one of those four elements
// directly. A child class like .ms-issue-pri is the STAR inside the row and is
// not matched, which is deliberate: a gold star is a gold star.
{
  const css = read('my-stances.css');
  const GOLD = /#f5a623|#fbbf24|#facc15|#eab308|#fde68a|250,\s*204,\s*21|251,\s*191,\s*36|245,\s*166,\s*35/i;
  const ISSUE_NAMED = /^\.(ms-chip|ms-fchip|ms-group|ms-issue)(?![-\w])/;
  const rules = bareCss(css).split('}')
    .map((chunk) => {
      const i = chunk.indexOf('{');
      return i < 0 ? null : { sel: chunk.slice(0, i).trim().replace(/\s+/g, ' '), body: chunk.slice(i + 1) };
    })
    .filter(Boolean);
  must(rules.length > 40, 'my-stances.css did not parse into rules here — this check is stale');
  const named = rules.filter((r) => ISSUE_NAMED.test(r.sel));
  must(named.length > 6, 'no rules target the issue-named chips any more — this check is stale');
  named.forEach((r) => {
    // is-mixed is the SIDE amber and ms-flash is the save confirmation that
    // pulses once and leaves; neither is a persistent claim about an issue.
    if (/is-mixed|ms-flash/.test(r.sel)) { passed++; return; }
    ok(!GOLD.test(r.body), `gold still paints an issue-named surface: ${r.sel}`);
  });
  // The three states that used to be gold are the three that must now read the
  // issue property, so this cannot be satisfied by painting them nothing.
  ok(named.some((r) => /is-priority/.test(r.sel)), 'the high-priority state lost its rule entirely');
  has(css, '.ms-fchip[data-ic="on"].is-on', 'the active filter chip does not wear the issue\u2019s own colour');
  has(css, '.ms-group[data-ic="on"]', 'the bundle head does not wear its bundle colour');
  has(css, 'var(--pdx-ic', 'my-stances.css never reads the issue colour property');
}

// ═════════════════════════════════════════════════════════════════════════════
section('7 · wiring: every document that reads a side loads the reader');
// ═════════════════════════════════════════════════════════════════════════════
// A MISSING SCRIPT TAG IS THE DEFECT WITH EXTRA STEPS: the surface asks
// PDXStanceSides, gets undefined, and paints an empty list without erroring.
[['my-stances.html', MS_DOC], ['me.html', ME_DOC], ['ballot.html', read('ballot.html')], ['index.html', read('index.html')]]
  .forEach(([name, doc]) => {
    has(doc, '/stance-sides.js', `${name} does not load the one reader`);
    // ROOT-ABSOLUTE, ALWAYS: on a trailing-slash route a bare src= serves the
    // HTML back as the script, which is silent and total.
    ok(!/src="stance-sides\.js"/.test(doc), `${name} loads the reader by a relative path`);
  });
// LOAD ORDER. The reader must parse before anything that calls it, and all of
// these are `defer`, so source order is execution order.
[['my-stances.html', MS_DOC, ['/my-stances.js', '/stance-studio.js']],
 ['me.html', ME_DOC, ['/my-stances.js', '/me-desk.js']]].forEach(([name, doc, afters]) => {
  const mine = doc.indexOf('<script defer src="/stance-sides.js">');
  must(mine > 0, `${name} does not load the reader with a defer script tag — this check is stale`);
  afters.forEach((a) => {
    const other = doc.indexOf('<script defer src="' + a + '">');
    must(other > 0, `${name} no longer loads ${a} the way this check expects`);
    ok(mine < other, `${name} loads ${a} before the reader it calls`);
  });
});
// OFFLINE. Losing this file in the cache is the one failure that brings the
// defect back whole: /me would have no reader at all and would print its empty
// sentence over a full file.
has(SW, "'/stance-sides.js'", 'the service worker does not precache the one reader');
{
  const v = /CACHE_VERSION\s*=\s*'([^']+)'/.exec(SW);
  must(!!v, 'sw.js no longer declares CACHE_VERSION the way this check expects');
  const n = parseInt(String(v[1]).replace(/[^0-9]/g, ''), 10);
  ok(n >= 219, `the cache version was not bumped for a new shell asset (found ${v[1]})`);
}

// ═════════════════════════════════════════════════════════════════════════════
section('8 · the constraints drawn in ink');
// ═════════════════════════════════════════════════════════════════════════════
// NO NEW STORE KEY, ANYWHERE ON THIS PASS. The two keys that exist are the two
// that existed before it.
{
  const keys = new Set();
  [SIDES_BARE, STANCES_BARE, STUDIO_BARE, DESK_BARE, bareJs(RACE_JS), bareJs(YF_JS)]
    .forEach((src) => (src.match(/'pdx_[a-z0-9_]+'/g) || []).forEach((k) => keys.add(k.replace(/'/g, ''))));
  const stances = [...keys].filter((k) => /stance|your_file/.test(k)).sort();
  eq(stances.join(','), 'pdx_my_stances_v1,pdx_your_file_v1',
    `the position stores are no longer exactly the two that existed: ${stances.join(',')}`);
}
// TWIN-BOOT DM UNCHANGED. This pass touched no scoring surface, so the reader
// must be absent from the engine and the engine absent from the reader.
lacks(SIDES_BARE, 'consistency', 'the one reader reaches into the record engine');
['consistency.js', 'politician-stances-core.js', 'cmp-data.js'].forEach((f) => {
  lacks(MS_DOC, 'src="/' + f + '"', `${f} is loaded on /my-stances — the studio prints no match and needs none of it`);
});

// ═════════════════════════════════════════════════════════════════════════════
if (failures.length) {
  console.error(`\n✗ stance-sides: ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error('  • ' + f));
  process.exit(1);
}
console.log(`\n✓ stance-sides: ${passed} assertions passed`);
