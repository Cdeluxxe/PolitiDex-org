#!/usr/bin/env node
/**
 * test-door2-first-run.mjs — one stance, set on the desk, before anything is matched.
 *
 * THE DEFECT. The ballot workspace has been able to read a voter's own positions
 * against the formal record of whoever holds their seats since Door 2 shipped.
 * An ordinary voter never found that out, because the match has an input they had
 * not given — one position of their own — and the only place to give it was a
 * 121-key dropdown. So the most useful thing on /ballot was reachable only by
 * someone who already knew it was there.
 *
 * THE FIX UNDER TEST. A coach inside the desk's own mount, three beats, one at a
 * time, all of it over engines that already exist:
 *
 *   SCREEN A — twelve starter chips off real ISSUE_MAP keys, one tap, plus a
 *     typeahead over label AND scope sentence capped at five hits, plus a visible
 *     "Skip for now".
 *   SCREEN B — that ONE issue, its LOCKED scope sentence from issue-scope.js, and
 *     Support / Oppose / Not sure.
 *   SCREEN C — the holder of the open seat, their formal pattern ON THAT ISSUE
 *     from PDXConsistency.formalPatternIndex.rowFor, their stated word under it.
 *
 * WHAT THIS FILE HOLDS, and why each is a rule rather than a preference:
 *
 *   1. IT PAINTS ONLY WHEN THERE IS A VOTER TO ANSWER FOR. Unlocated and not
 *      skipped, the coach is one line under the existing location card and the
 *      location card is still first on the page. There is no seat to read an
 *      answer against yet, and a three-screen coach over an unplaceable reader
 *      would be asking for an input it cannot spend.
 *   2. ONE ISSUE ANSWERED IS ONE KEY IN THE EXISTING STORE. Not a new store, not
 *      a shadow copy: PDXStances where it is loaded, the alignment signature
 *      where it is not, which are the two ends of one lineage.
 *   3. THE THIRD ISSUE FLIPS THE PRIMARY. "Add another issue" becomes "See my
 *      ballot on these." — and three is where a button changes, never a grade.
 *   4. SKIP AND "NOT SURE" INVENT NOTHING. The store's vocabulary is support /
 *      oppose / mixed and `mixed` is a real mixed position, not "I do not know".
 *      An undecided reader must leave with zero keys written.
 *   5. THE ANONYMOUS PATH IS THE PATH. No auth, no account, no profile.
 *   6. NOTHING ELSE MOVED. Admin, /library, /money and the H.R.1 teaching card
 *      are not referenced by any file this feature touches.
 *   7. THE COPY WALLS. No "complete your profile", no party, no Direction Match
 *      number, no "we found your match %", no completion percentage anywhere.
 *
 * Source-level: no browser, no network. The module is also DRIVEN in a sandbox
 * over a minimal DOM, so the store write, the beat logic and the CTA flip are
 * executed rather than grepped.
 */
import fs from 'fs';
import path from 'path';
import vm from 'vm';

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..');
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const JS = rd('door2-first-run.js');
const CSS = rd('door2-first-run.css');
const HTML = rd('ballot.html');
const SW = rd('sw.js');
const BW = rd('ballot-workspace.js');
const IMAP = rd('issue-map.js');
const SCOPE_SRC = rd('issue-scope.js');

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
   CODE does is made against a comment-stripped copy. A grep a comment can
   satisfy tests the prose, not the product. */
const CODE = JS.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1 ');
/* And every claim about what a READER SEES is made against the string literals,
   because that is the only part of this module that reaches a person. */
const COPY = (CODE.match(/'(?:[^'\\]|\\.)*'/g) || []).join(' ') +
             (CODE.match(/"(?:[^"\\]|\\.)*"/g) || []).join(' ');

/* ═══════════════════════════════════════════════════════════════════════════
   0 · THE SANDBOX — a DOM small enough to read, big enough to drive
   ═══════════════════════════════════════════════════════════════════════════ */

const SEATS = [
  { key: 'senate', label: 'U.S. Senate' },
  { key: 'house', label: 'U.S. House' }
];

function makeDom() {
  const byId = new Map();
  function node(tag) {
    const n = {
      tagName: String(tag).toUpperCase(), id: '', className: '',
      children: [], parentNode: null, innerHTML: '', attrs: {},
      setAttribute(k, v) { this.attrs[k] = String(v); },
      getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
      removeAttribute(k) { delete this.attrs[k]; },
      scrollIntoView() { this.scrolled = true; },
      get nextSibling() {
        if (!this.parentNode) return null;
        const i = this.parentNode.children.indexOf(this);
        return (i >= 0 && i + 1 < this.parentNode.children.length) ? this.parentNode.children[i + 1] : null;
      },
      appendChild(c) { detach(c); c.parentNode = this; this.children.push(c); if (c.id) byId.set(c.id, c); return c; },
      insertBefore(c, ref) {
        detach(c); c.parentNode = this;
        const i = ref ? this.children.indexOf(ref) : -1;
        if (i < 0) this.children.push(c); else this.children.splice(i, 0, c);
        if (c.id) byId.set(c.id, c);
        return c;
      },
      removeChild(c) { detach(c); return c; }
    };
    return n;
  }
  function detach(c) {
    if (c.parentNode) {
      const i = c.parentNode.children.indexOf(c);
      if (i >= 0) c.parentNode.children.splice(i, 1);
      c.parentNode = null;
    }
  }
  const doc = {
    readyState: 'complete',
    createElement: tag => {
      const n = node(tag);
      /* id is assigned after creation in the module, same as in a browser; the
         registry has to see it then, so id is a property with a setter. */
      let _id = '';
      Object.defineProperty(n, 'id', {
        get: () => _id,
        set: v => { _id = String(v); byId.set(_id, n); }
      });
      return n;
    },
    getElementById: id => byId.get(id) || null,
    addEventListener() {}
  };
  const mount = node('section'); mount.id = 'ballot-workspace'; byId.set('ballot-workspace', mount);
  const body = node('div'); body.id = 'bw-body'; mount.appendChild(body);
  return { doc, mount, body, byId, node };
}

/* The upstream modules the coach reads, as the smallest honest stubs: a two-key
   vocabulary is not enough (the typeahead and the chip list both walk the real
   one), so ISSUE_MAP here is the STARTERS plus two extras the typeahead can
   find. Nothing here invents a shape the real module does not publish. */
const STUB_ISSUES = {
  housing: { label: '🏠 Housing Affordability', chip: 'Make housing more affordable by boosting supply', cat: 'housing' },
  prop_tax: { label: '🏦 Property Tax Relief', chip: 'Lower the property tax bill', cat: 'taxes' },
  cut_spending: { label: '✂️ Cut Federal Spending & Reduce Debt', chip: 'Spend less and borrow less', cat: 'fiscal' },
  border_security: { label: '🛡 Strong Border & Enforcement', chip: 'Secure the border', cat: 'immigration' },
  gun_rights: { label: '🔫 Protect Gun Rights', chip: 'Protect the right to carry', cat: 'guns' },
  gun_safety: { label: '🦺 Stronger Gun Safety Laws', chip: 'Tighten gun laws', cat: 'guns' },
  energy_production: { label: '🛢 Expand Domestic Energy Production', chip: 'Produce more energy at home', cat: 'energy' },
  climate_action: { label: '🌱 Climate Action & Clean Energy', chip: 'Cut emissions', cat: 'energy' },
  public_schools: { label: '🍎 Invest in Public Schools', chip: 'Fund public schools', cat: 'education' },
  school_choice: { label: '🎓 School Choice & Education Freedom', chip: 'Let families choose a school', cat: 'education' },
  healthcare: { label: '🏥 Expand Healthcare Access', chip: 'Cover more people', cat: 'health' },
  water: { label: '💧 Water Conservation', chip: 'Protect rivers and the Great Salt Lake', cat: 'environment' },
  transit: { label: '🚌 Public Transit & Rail', chip: 'Build buses and trains', cat: 'transport' },
  privacy_rights: { label: '🔒 Digital Privacy', chip: 'Limit surveillance of ordinary people', cat: 'civil' }
};

function drive(opts) {
  const o = opts || {};
  const dom = makeDom();
  const store = new Map();
  const alignIssues = new Set();
  const alignIntensity = {};
  const win = {
    ISSUE_MAP: o.noIssues ? undefined : STUB_ISSUES,
    coreIssueForKey: k => (k === 'housing' ? { key: 'housing' } : null),
    localStorage: {
      getItem: k => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => { store.set(k, String(v)); },
      removeItem: k => { store.delete(k); }
    },
    _alignIssues: alignIssues,
    _alignIntensity: alignIntensity,
    alignSetIntensity(key, level) {
      if (!STUB_ISSUES[key]) return;
      alignIssues.add(key);
      if (level === 'support') delete alignIntensity[key];
      else alignIntensity[key] = level;
    },
    PDXIssueScope: {
      /* `inn` in the real table is a long descriptive sentence, and the coach's
         typeahead searches it — so a stub that returned a bare marker would make
         the scope-sentence search untestable. This mirrors the real shape: a
         marker the locked-sentence assertions can find, plus real prose the
         search can match on. */
      read: k => (STUB_ISSUES[k]
        ? { key: k, label: STUB_ISSUES[k].label, chip: STUB_ISSUES[k].chip, defined: true,
            inn: 'LOCKED SCOPE for ' + k + ' \u2014 ' + STUB_ISSUES[k].chip, out: '', pole: '', poled: true }
        : null)
    },
    PDXIssueColors: { skin: () => ({ on: true, style: '--pdx-ic:#888', attr: ' data-ic="on" style="--pdx-ic:#888"' }) },
    PDXConsistency: {
      formalPatternIndex: {
        rowFor: (pid, key) => (o.thinRecord ? null : {
          pid, key, patLabel: 'Mostly advances', counts: '7 advanced · 0 against',
          said: true, stance: 'Supports'
        })
      }
    },
    pdxRepsForMe: () => ({
      located: !!o.located,
      levels: o.located ? [{ key: 'ussenate1', seat: 'senate', pid: 'p_one', statewide: true },
                          { key: 'house', seat: 'house', pid: 'p_two', statewide: false }] : []
    }),
    pdxSeatHolders: rk => {
      if (!o.located) return { ok: false, seat: rk, located: false, pids: [], levels: [], districtGap: false };
      const pids = rk === 'senate' ? ['p_one'] : rk === 'house' ? ['p_two'] : [];
      return { ok: pids.length > 0, seat: rk, located: true, pids, levels: [], districtGap: false };
    },
    CMP_DATA: { p_one: { name: 'Senator One' }, p_two: { name: 'Rep Two' } },
    PDXBallotWorkspace: {
      _open: () => (o.noSeats ? '' : 'senate'),
      _seats: () => (o.noSeats ? [] : SEATS),
      _workable: () => (o.noSeats ? [] : SEATS)
    },
    setTimeout() { return 0; },
    clearTimeout() {}
  };
  win.window = win;
  win.document = dom.doc;
  const ctx = vm.createContext(win);
  vm.runInContext(JS, ctx, { filename: 'door2-first-run.js' });
  return {
    win, dom,
    fr: win.PDXDoor2FirstRun,
    card: () => dom.byId.get('d2fr') || null,
    html: () => { const c = dom.byId.get('d2fr'); return c ? c.innerHTML : ''; },
    keys: () => Array.from(alignIssues),
    intensity: alignIntensity
  };
}

/* AND THE SAME MODULE OVER THE REAL TABLES. The stubs above let the beat logic
   and the store write be driven in isolation; they cannot tell us the typeahead
   actually reaches 121 real keys through 51 real scope sentences. So this boots
   issue-map.js and issue-scope.js — the shipped files, unmodified — into the
   same context first. Nothing else is stubbed differently. */
function driveReal() {
  const dom = makeDom();
  const store = new Map();
  const win = {
    localStorage: {
      getItem: k => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => { store.set(k, String(v)); },
      removeItem: k => { store.delete(k); }
    },
    _alignIssues: new Set(),
    _alignIntensity: {},
    alignSetIntensity() {},
    pdxRepsForMe: () => ({ located: true, levels: [] }),
    setTimeout() { return 0; },
    clearTimeout() {}
  };
  win.window = win;
  win.document = dom.doc;
  const ctx = vm.createContext(win);
  vm.runInContext(rd('issue-map.js'), ctx, { filename: 'issue-map.js' });
  vm.runInContext(rd('issue-scope.js'), ctx, { filename: 'issue-scope.js' });
  vm.runInContext(JS, ctx, { filename: 'door2-first-run.js' });
  return { win, dom, fr: win.PDXDoor2FirstRun };
}

/* One smoke boot before anything is asserted, so a syntax or wiring break reads
   as a stale test rather than forty confusing failures. */
{
  const d = drive({ located: true });
  must(d.fr && typeof d.fr.sync === 'function', 'door2-first-run.js no longer publishes PDXDoor2FirstRun.sync');
  must(typeof d.fr.answer === 'function' && typeof d.fr.pick === 'function',
    'the coach no longer publishes pick()/answer() — the two taps this file drives');
}

/* ═══════════════════════════════════════════════════════════════════════════
   1 · IT PAINTS ONLY WHEN LOCATION IS RESOLVED OR SKIPPED
   ═══════════════════════════════════════════════════════════════════════════ */
section('1 · no voter, no coach: the location card stays first');

{
  const d = drive({ located: false });
  eq(d.fr.screen(), 'gate', 'unlocated and not skipped, the coach is the one-line gate — not Screen A');
  const c = d.card();
  must(c, 'the coach painted no node at all on an unlocated reader');
  eq(c.getAttribute('data-size'), 'line', 'and it is the one-line size, not a card');
  ok(/d2fr-x/.test(d.html()), 'and even the one-line gate can be dismissed — a nudge you cannot turn off is not a nudge');
  ok(!/What do you care about first/.test(d.html()), 'the chips are not offered before there is a seat to spend them on');

  /* The existing location card is #bw-body's content, so "first" is a DOM fact:
     the coach has to be AFTER the body while the reader is unplaceable. */
  const kids = d.dom.mount.children.map(n => n.id);
  eq(kids.indexOf('bw-body') < kids.indexOf('d2fr'), true,
    `the location card is still first on the page (order: ${kids.join(', ')})`);

  /* Skipping the location is a real way through — and it must not invent one. */
  d.fr.skipLocation();
  eq(d.fr.screen(), 'A', 'skipping the location opens Screen A');
  eq(d.win._alignIssues.size, 0, 'and skipping the location writes no stance');
}
{
  const d = drive({ located: true });
  eq(d.fr.screen(), 'A', 'a located reader with no positions gets Screen A');
  const kids = d.dom.mount.children.map(n => n.id);
  eq(kids.indexOf('d2fr') < kids.indexOf('bw-body'), true,
    `once there is a voter, the coach leads and the desk follows (order: ${kids.join(', ')})`);
  ok(/What do you care about first/.test(d.html()), 'Screen A asks the one question it exists to ask');
  ok(/Skip for now/.test(d.html()), 'and "Skip for now" is visible on it');
}

/* The card is a SIBLING of #bw-body, never a child: the desk rewrites that
   node's innerHTML on every paint, and a coach parented into it would vanish on
   the reader's first pick. */
ok(/insertBefore\(\s*el\b/.test(CODE), 'the coach is inserted beside #bw-body, not into it');
ok(!/getElementById\(\s*BODY_ID\s*\)\s*\.innerHTML\s*=/.test(CODE) && !/body\.innerHTML\s*=/.test(CODE),
  'and it never writes #bw-body — the desk owns that node');

/* ═══════════════════════════════════════════════════════════════════════════
   2 · THE TWELVE ARE REAL KEYS WITH LOCKED SCOPE SENTENCES
   ═══════════════════════════════════════════════════════════════════════════ */
section('2 · Screen A is the real vocabulary, and Screen B is the locked definition');

{
  const starters = (CODE.match(/var STARTERS = \[([\s\S]*?)\]/) || [, ''])[1]
    .split(',').map(s => s.trim().replace(/^'|'$/g, '')).filter(Boolean);
  must(starters.length > 0, 'the STARTERS list is gone from door2-first-run.js');
  ok(starters.length >= 8 && starters.length <= 12,
    `the first screen offers 8–12 chips, not a 121-key dropdown (offers ${starters.length})`);

  /* Every chip is a key that exists in the shipped vocabulary. A chip naming a
     key ISSUE_MAP does not hold would be a dead tap. */
  const mapBody = IMAP.slice(IMAP.indexOf('var ISSUE_MAP = {'));
  const mapKeys = new Set([...mapBody.matchAll(/^\s{6}([a-z0-9_]+):\s*\{\s*label:/gm)].map(m => m[1]));
  must(mapKeys.size > 100, `could not read ISSUE_MAP's keys out of issue-map.js (found ${mapKeys.size})`);
  for (const k of starters) ok(mapKeys.has(k), `chip "${k}" is a real ISSUE_MAP key`);

  /* And every chip has a LOCKED scope sentence, so Screen B can never open on
     issue-scope.js's "no definition yet" placeholder — the one screen where a
     reader is being asked to commit is the one screen that must state exactly
     what they are committing to. */
  const scopeBody = SCOPE_SRC.slice(SCOPE_SRC.indexOf('var SCOPE = {'));
  const scopeKeys = new Set([...scopeBody.matchAll(/^\s{4}([a-z0-9_]+):\s*\{/gm)].map(m => m[1]));
  must(scopeKeys.size > 30, `could not read the SCOPE table out of issue-scope.js (found ${scopeKeys.size})`);
  for (const k of starters) ok(scopeKeys.has(k), `chip "${k}" has a locked scope sentence in issue-scope.js`);

  /* Both poles of an argument, where the vocabulary carries both. A starter set
     with gun_rights and no gun_safety is a push poll with chips. */
  for (const pair of [['gun_rights', 'gun_safety'], ['energy_production', 'climate_action'], ['public_schools', 'school_choice']]) {
    const has = pair.filter(k => starters.includes(k));
    ok(has.length !== 1, `"${pair.join('" / "')}" are offered together or not at all (offered: ${has.join(', ') || 'neither'})`);
  }

  /* The topics the brief named are each reachable in one tap. */
  for (const topic of [['housing'], ['prop_tax', 'property_tax'], ['border_security'], ['gun_rights', 'gun_safety'],
                       ['energy_production', 'climate_action'], ['public_schools', 'school_choice'],
                       ['healthcare'], ['cut_spending'], ['water']]) {
    ok(topic.some(k => starters.includes(k)), `${topic[0]} is one tap from the first screen`);
  }
}
{
  /* Screen B prints the locked sentence, and it comes from issue-scope.js — not
     from a paraphrase written in this module. */
  const d = drive({ located: true });
  d.fr.pick('housing');
  eq(d.fr.screen(), 'B', 'one tap on a chip opens Screen B for that issue');
  const h = d.html();
  ok(/LOCKED SCOPE for housing/.test(h), 'Screen B prints the scope sentence issue-scope.js locked');
  ok(/Support/.test(h) && /Oppose/.test(h) && /Not sure/.test(h), 'and offers exactly Support / Oppose / Not sure');
  ok(!/Property Tax|Healthcare|Water/i.test(h), 'and nothing about any other issue — one beat at a time');
  ok(/PDXIssueScope/.test(CODE) && /\.read\(/.test(CODE), 'the sentence is read from PDXIssueScope, never written here');
}
{
  /* Screen A takes one tap, and cannot take a set. A reader who has not done
     this once does not need to be asked to rank anything. */
  const d = drive({ located: true });
  ok(!/multiple|checkbox|multi-?select/i.test(CODE), 'Screen A has no multi-select machinery');
  d.fr.pick('housing');
  d.fr.pick('water');
  eq(d.fr._state().pending, 'water', 'a second tap replaces the first — the coach holds one issue, never a basket');
}

/* ═══════════════════════════════════════════════════════════════════════════
   3 · THE TYPEAHEAD — label AND scope sentence, five hits, hard cap
   ═══════════════════════════════════════════════════════════════════════════ */
section('3 · the typeahead reaches the other 109 keys without becoming a dropdown');

{
  const d = drive({ located: true });
  eq(d.fr.search('h').length, 0, 'a single character is not a search');
  ok(d.fr.search('transit').includes('transit'), 'a label match is found');
  ok(d.fr.search('Great Salt Lake').includes('water'),
    'the scope sentence is searched too, not only the label');
  ok(d.fr.search('surveillance').includes('privacy_rights'), 'and that reaches keys off the twelve');
  ok(d.fr.search('e').length <= 5, 'never more than five hits');
  ok(d.fr.search('the').length <= 5, 'not even for a query that matches most of the vocabulary');
  eq(d.fr.HITS, 5, 'and five is declared, not scattered');

  /* A hit is one tap to Screen B, same as a chip. */
  const hits = d.fr.search('transit');
  must(hits.length > 0, 'the typeahead found nothing for an exact label match');
  d.fr.pick(hits[0]);
  eq(d.fr.screen(), 'B', 'a typeahead hit opens Screen B like a chip does');

  /* Over the SHIPPED vocabulary and the SHIPPED scope table, which is the only
     version of this that matters to a reader. */
  const r = driveReal();
  must(r.win.ISSUE_MAP && Object.keys(r.win.ISSUE_MAP).length > 100,
    'issue-map.js no longer publishes ISSUE_MAP into a bare context');
  must(r.win.PDXIssueScope && typeof r.win.PDXIssueScope.read === 'function',
    'issue-scope.js no longer publishes PDXIssueScope.read into a bare context');
  ok(r.fr.search('housing').includes('housing'), 'the real vocabulary answers a real label search');
  ok(r.fr.search('immigration').length > 0, 'and a topic word the reader would actually type');
  /* "turf" is in water's locked scope sentence and in no label in the shipped
     table — so a hit on it can only have come from searching the sentence. */
  ok(r.fr.search('turf').includes('water'),
    '"turf" reaches Water Conservation, a key no label spells that way — the sentence is genuinely searched');
  ok(!/turf/i.test(String(r.win.ISSUE_MAP.water.label)), 'and water\'s own label does not contain it');
  ok(r.fr.search('the').length <= 5, 'the five-hit cap holds over 121 real keys');
  ok(r.fr.search('a').length === 0, 'and one character is still not a search');
  /* Every one of the twelve resolves a real locked sentence through the real
     table — the assertion the stub above cannot make. */
  for (const k of r.fr.STARTERS) {
    const sc = r.fr._scope(k);
    ok(!!sc && sc.length > 40, `"${k}" resolves a real locked scope sentence (${sc ? sc.length : 0} chars)`);
    const rec = r.win.PDXIssueScope.read(k);
    ok(!!(rec && rec.defined), `"${k}" is in the locked table, so Screen B never opens on the placeholder`);
  }

  /* And it refuses a key the vocabulary does not hold, from either entry. */
  const e = drive({ located: true });
  e.fr.pick('not_an_issue');
  eq(e.fr.screen(), 'A', 'an invented key opens nothing');
  eq(e.win._alignIssues.size, 0, 'and writes nothing');
}

/* ═══════════════════════════════════════════════════════════════════════════
   4 · ONE ISSUE ANSWERED IS ONE KEY IN THE EXISTING STORE
   ═══════════════════════════════════════════════════════════════════════════ */
section('4 · the answer lands in the store the rest of the app already reads');

{
  const d = drive({ located: true });
  d.fr.pick('housing');
  d.fr.answer('housing', 'support');
  eq(d.fr._count(), 1, 'one issue answered is one key');
  eq(d.keys().join(','), 'housing', 'and it is that issue, in the alignment signature my-stances.js adopts from');
  eq(d.fr._position('housing'), 'support', 'read back as the position the reader gave');

  d.fr.back();
  d.fr.pick('gun_safety');
  d.fr.answer('gun_safety', 'oppose');
  eq(d.fr._count(), 2, 'two answers are two keys');
  eq(d.intensity.gun_safety, 'oppose', 'and Oppose is stored as oppose, not as an absence');
  eq(d.fr._position('gun_safety'), 'oppose', 'read back as oppose');
}
{
  /* Where my-stances.js IS loaded, the write goes through it and lets it project
     down into the signature itself. Two ends of one lineage, never two stores. */
  const d = drive({ located: true });
  const seen = [];
  d.win.PDXStances = {
    all: () => ({}),
    get: () => null,
    set: (k, pos, pri) => { seen.push([k, pos, pri]); }
  };
  d.fr.pick('healthcare');
  d.fr.answer('healthcare', 'support');
  eq(seen.length, 1, 'PDXStances.set is the write when that module is present');
  eq(seen[0][0], 'healthcare', 'with the issue the reader picked');
  eq(seen[0][1], 'support', 'and the position they gave');
  eq(d.win._alignIssues.size, 0, 'and the coach does not double-write behind it — projection is its job');
  ok(/PDXStances/.test(CODE) && /alignSetIntensity/.test(CODE),
    'both ends of the lineage are named in the source, so neither document is a special case');
  ok(!/pdx_my_stances|politidex_align_issues/.test(CODE),
    'and neither store key is re-declared here — the coach never writes those buckets directly');
}
{
  /* The store write refuses anything outside the vocabulary and outside the
     store's own position words. */
  const d = drive({ located: true });
  eq(d.fr._set('not_an_issue', 'support'), false, 'an unknown key is refused at the write');
  eq(d.fr._set('housing', 'kind_of'), false, 'and so is a position the store does not speak');
  eq(d.fr._set('housing', 'mixed'), false, 'including `mixed` — a real mixed position is not something this coach can collect');
  eq(d.win._alignIssues.size, 0, 'nothing landed');
}

/* ═══════════════════════════════════════════════════════════════════════════
   5 · SKIP AND "NOT SURE" NEVER INVENT A STANCE
   ═══════════════════════════════════════════════════════════════════════════ */
section('5 · an undecided reader leaves with zero keys written');

{
  const d = drive({ located: true });
  d.fr.pick('housing');
  d.fr.answer('housing', 'unsure');
  eq(d.fr._count(), 0, '"Not sure" writes no key');
  eq(d.win._alignIssues.size, 0, 'not even a neutral one');
  eq(d.fr.screen(), 'C', 'and it still reaches the desk — the record on an issue you are undecided about is the point');
  ok(/did not take a side/i.test(d.html()), 'the card says so plainly rather than showing a position they did not give');
  ok(!/You support this|You oppose this/.test(d.html()), 'and never attributes one to them');
}
{
  const d = drive({ located: true });
  d.fr.pick('water');
  d.fr.skip();
  eq(d.fr._count(), 0, '"Skip for now" writes no key');
  eq(d.fr._state().pending, '', 'and drops the issue it was holding');
  eq(d.fr.screen(), 'hint', 'the coach shrinks to a line rather than nagging');
  eq(d.card().getAttribute('data-size'), 'line', 'painted at line size');
  /* And the line it shrinks to must not claim positions they did not set. */
  ok(/Set one issue/.test(d.html()), 'the line offers the thing they skipped rather than reporting it done');
  ok(!/Your issues are set/.test(d.html()), 'and never says their issues are set when none are');
}
{
  const d = drive({ located: true });
  d.fr.dismiss();
  eq(d.fr.screen(), 'off', 'dismiss means gone');
  eq(d.dom.mount.children.filter(n => n.id === 'd2fr').length, 0, 'and the node leaves the desk entirely');
  eq(d.fr._count(), 0, 'having invented nothing on the way out');
}

/* ═══════════════════════════════════════════════════════════════════════════
   6 · THE THIRD ISSUE FLIPS THE PRIMARY
   ═══════════════════════════════════════════════════════════════════════════ */
section('6 · three issues change a button, and never become a grade');

{
  const d = drive({ located: true });
  const add = (k, pos) => { d.fr.back(); d.fr.pick(k); d.fr.answer(k, pos); };

  add('housing', 'support');
  eq(d.fr.screen(), 'C', 'the first answer lands on the desk');
  ok(/Add another issue/.test(d.html()), 'and the primary asks for another');
  ok(!/See my ballot/.test(d.html()), 'not yet the ballot');

  add('water', 'support');
  eq(d.fr._count(), 2, 'two set');
  ok(/Add another issue/.test(d.html()), 'the primary still asks for another at two');

  add('healthcare', 'oppose');
  eq(d.fr._count(), 3, 'three set');
  ok(/See my ballot on these\./.test(d.html()), 'the THIRD issue flips the primary to "See my ballot on these."');
  ok(!/Add another issue/.test(d.html()), 'and the old primary is gone, not stacked beside it');

  /* After three, the coach gets out of the way. */
  d.fr.seeBallot();
  eq(d.fr.screen(), 'hint', 'tapping it shrinks the coach to a one-line hint');
  eq(d.card().getAttribute('data-size'), 'line', 'at line size');
  ok(d.html().length < 400, `and the hint really is one line (${d.html().length} chars)`);
  ok(/Add another issue/.test(d.html()), 'with one quiet way back for a reader who wants a fourth');
  ok(/Your issues are set/.test(d.html()), 'and it reports what is true — the desk is reading them');
  eq(d.dom.byId.get('bw-body').scrolled, true, 'and the desk is what it scrolls the reader to');

  eq(d.fr.GOAL, 3, 'three is declared once, as a goal and not as a denominator');
}
{
  /* A returning reader never re-takes the lesson. */
  const d = drive({ located: true });
  d.win._alignIssues.add('housing');
  eq(d.fr.screen(), 'C', 'a returning reader with one position skips A and B and lands on the desk');
  ['water', 'healthcare'].forEach(k => d.win._alignIssues.add(k));
  eq(d.fr.screen(), 'hint', 'and one with three already set gets the hint, not a lesson they finished');
  /* THE ONE CONTROL ON THAT LINE HAS TO WORK. A reader at three who taps "Add
     another issue" must reach the chips — not fall back through the count branch
     into the hint they just left. */
  d.fr.back();
  eq(d.fr.screen(), 'A', 'and "Add another issue" from the hint reaches the chips even at three');
  ok(/What do you care about first/.test(d.html()), 'painting Screen A, not the line again');
  d.fr.pick('gun_safety');
  d.fr.answer('gun_safety', 'support');
  eq(d.fr._count(), 4, 'a fourth issue is allowed — three was a suggestion, not a cap');
  eq(d.fr.screen(), 'C', 'and it lands on the desk like the first three did');
}

/* ═══════════════════════════════════════════════════════════════════════════
   7 · SCREEN C IS THE PROOF — one formal row, for one person, on that issue
   ═══════════════════════════════════════════════════════════════════════════ */
section('7 · the proof is the issue row on the person in their seat');

{
  const d = drive({ located: true });
  d.fr.pick('housing');
  d.fr.answer('housing', 'support');
  const h = d.html();
  ok(/Senator One/.test(h), 'the holder of the open seat is named');
  ok(/U\.S\. Senate/.test(h), 'under the seat they hold');
  ok(/Mostly advances/.test(h), 'with their FORMAL pattern on that issue');
  ok(/7 advanced · 0 against/.test(h), 'and the count it rests on');
  ok(/Stated: Supports/.test(h), 'their stated word under it');
  ok(h.indexOf('Mostly advances') < h.indexOf('Stated: Supports'),
    'the formal record is first and the stated word is under it — that is the order the brief names');
  ok(/formalPatternIndex/.test(CODE) && /rowFor/.test(CODE),
    'the row comes from PDXConsistency.formalPatternIndex.rowFor — one read, of one issue, for one person');
  ok(!/\.rows\(/.test(CODE), 'and not from the whole-person index — Screen C is about the issue they just answered');
}
{
  /* No record on that issue is a gap in the file, and says so. It is never an
     empty space the reader has to interpret, and never a zero. */
  const d = drive({ located: true, thinRecord: true });
  d.fr.pick('housing');
  d.fr.answer('housing', 'support');
  const h = d.html();
  ok(/Nothing on the formal record for this issue yet/.test(h), 'a thin record says so');
  ok(/gap in the file, not a finding/i.test(h), 'and names itself a gap rather than a verdict');
  ok(!/0%|Mostly advances/.test(h), 'with no invented pattern and no zero score');
}
{
  /* No ballot seat resolves → "who represents me", from the resolver's own
     list. Never a curated default area. */
  const d = drive({ located: true, noSeats: true });
  d.fr.pick('housing');
  d.fr.answer('housing', 'support');
  const h = d.html();
  ok(/Who represents you/.test(h), 'with no ballot seat to open, the card falls back to who represents this reader');
  ok(/Senator One/.test(h) || /Rep Two/.test(h), 'naming someone the resolver actually resolved');
  ok(/pdxRepsForMe/.test(CODE), 'through pdxRepsForMe — the one resolver');
  ok(!/utah|salt lake|UT-0|default (state|area)/i.test(COPY), 'and no curated fallback area is named in copy');
}
{
  /* The pick control stays the desk's. The coach paints no second one. */
  ok(!/ballotPickCard|pdxBallotWorkspacePick/.test(CODE),
    'the coach never calls the desk\'s pick — that control stays on the workspace, where it already is');
  ok(/_open/.test(CODE) && /PDXBallotWorkspace/.test(CODE),
    'it reads which seat the desk has open rather than choosing one of its own');
  ok(/_open: function \(\)/.test(BW), 'and ballot-workspace.js publishes that read');
  ok(/readOpen\(seats\(\)\)/.test(BW.slice(BW.indexOf('_open: function'))),
    'as its own existing precedence, so there is no second copy of "which seat is open"');
}

/* ═══════════════════════════════════════════════════════════════════════════
   8 · THE ANONYMOUS PATH IS THE PATH
   ═══════════════════════════════════════════════════════════════════════════ */
section('8 · no account, no auth, no profile');

{
  /* The drive above never installed a user, a session or PDXStore, and every
     screen worked. This states the rule the source has to keep. */
  for (const bad of [/firebase/i, /currentUser/, /signIn|sign ?up/i, /getAuth/, /PDXAuth/, /\bcreateAccount\b/]) {
    ok(!bad.test(CODE), `the coach has no auth dependency (${bad})`);
  }
  const d = drive({ located: true });
  ok(!d.win.PDXStore, 'the sandbox has no collection manager (as /ballot does not)');
  d.fr.pick('housing');
  d.fr.answer('housing', 'support');
  eq(d.fr._count(), 1, 'and an anonymous reader still gets their position stored');
  ok(/localStorage/.test(CODE), 'in localStorage, which is where an anonymous reader\'s own data lives');
  ok(/PDXStore/.test(CODE), 'with PDXStore used where a document declares it');

  /* Storage off is not a crash and not a false claim of progress. */
  const s = drive({ located: true });
  delete s.win.localStorage;
  s.fr.pick('housing');
  eq(typeof s.fr.screen(), 'string', 'a reader with storage switched off still gets a screen');
  eq(s.fr._state().pending, '', 'and nothing pretends a beat was remembered that was not');
}
{
  /* Every upstream module missing → the coach is quiet, and the desk below is
     untouched. It is a passenger on this surface, never a gate in front of it. */
  const d = drive({ located: true, noIssues: true });
  eq(d.fr.screen(), 'A', 'with no issue vocabulary the coach still resolves a screen');
  eq(d.fr.search('housing').length, 0, 'the typeahead finds nothing rather than throwing');
  d.fr.pick('housing');
  eq(d.fr._state().pending, '', 'and a chip that cannot be validated opens nothing');
  eq(d.dom.byId.get('bw-body').innerHTML, '', 'the desk\'s own node is untouched either way');
}

/* ═══════════════════════════════════════════════════════════════════════════
   9 · THE COPY WALLS
   ═══════════════════════════════════════════════════════════════════════════ */
section('9 · no profile to complete, no party, no score, no grade');

{
  for (const bad of [
    [/complete (your|my) profile/i, 'no "complete your profile"'],
    [/your profile/i, 'no profile at all — a voter\'s positions are not a form'],
    [/\bRepublican\b|\bDemocrat/i, 'no party'],
    [/\bGOP\b|\bR-|\bD-/, 'no party letters either'],
    [/Direction Match/i, 'no Direction Match on these screens'],
    [/Word vs\.? Action|say vs\.? do/i, 'no Word vs Action verdict on these screens'],
    [/match %|your match|we found your match/i, 'no "we found your match %" headline'],
    [/\d\s*%|percent complete|completion/i, 'no percentage and no completion meter'],
    [/\b\d+ of 3\b|\b\d+\/3\b/, 'and no "1 of 3" counter — three is a suggestion, not a grade'],
    [/\bscore\b/i, 'nothing here is a score'],
    [/quiz|survey|questionnaire/i, 'and it is not a quiz'],
    [/official ballot/i, 'it never claims to be an official ballot']
  ]) ok(!bad[0].test(COPY), `${bad[1]} (${bad[0]})`);

  /* Support and Oppose are the same weight in the stylesheet too. A green
     Support beside a red Oppose would tell the reader which answer we wanted,
     on the one screen where they are being asked what they think. */
  const forRule = (CSS.match(/\.d2fr-ans-for, \.d2fr-ans-against \{([^}]*)\}/) || [, ''])[1];
  must(forRule.trim().length > 0, 'the two answer hooks are no longer styled as one weight');
  ok(!/green|red|#[0-9a-f]*(?:22c55e|16a34a|ef4444|dc2626)/i.test(forRule),
    'neither answer carries a good/bad colour');
  eq((CSS.match(/\.d2fr-ans-for\b/g) || []).length, 1, 'Support is named in exactly one rule');
  eq((CSS.match(/\.d2fr-ans-against\b/g) || []).length, 1, 'Oppose is named in exactly one rule');
  ok(/\.d2fr-ans-for, \.d2fr-ans-against/.test(CSS), 'and it is the same rule — neither is styled apart from the other');

  /* Nothing computed, stated positively: the module reads a band and a label and
     prints them. It multiplies, divides and averages nothing. */
  ok(!/\bMath\.|\/ *\(|\* *100|toFixed/.test(CODE), 'the coach computes no number of its own');
  ok(!/alignScore|_alignScoreColor|directionMatch|myDirection/.test(CODE), 'and reads no score from anywhere else');

  /* It is a coach, not a manifesto. Screen A's own prose is two short lines. */
  const d = drive({ located: true });
  const prose = d.html().replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  ok(prose.length < 900, `Screen A is a coach and not a manifesto (${prose.length} chars of visible text)`);
}

/* ═══════════════════════════════════════════════════════════════════════════
   10 · MOUNTED INSIDE DOOR 2 — no new route, no new nav item
   ═══════════════════════════════════════════════════════════════════════════ */
section('10 · it lives inside the ballot workspace and nowhere else');

{
  must(/door2-first-run\.js/.test(HTML), 'ballot.html no longer loads the coach');
  ok(/<script defer src="\/door2-first-run\.js"><\/script>/.test(HTML),
    'the coach is deferred and root-absolute on ballot.html (a bare src would resolve under /ballot/)');
  ok(HTML.indexOf('/ballot-workspace.js') < HTML.indexOf('/door2-first-run.js'),
    'and loads after the desk it mounts inside');
  ok(/<link rel="stylesheet" href="\/door2-first-run\.css" media="print" onload="this\.media='all'" \/>/.test(HTML),
    'its stylesheet is non-blocking — the coach cannot paint before its deferred inputs land anyway');
  ok(/<noscript><link rel="stylesheet" href="\/door2-first-run\.css" \/><\/noscript>/.test(HTML),
    'with the noscript fallback that pattern requires');

  /* The blocking-CSS budget the shell test enforces is unchanged by this. */
  const noNoscript = HTML.replace(/<noscript>[\s\S]*?<\/noscript>/gi, ' ');
  const blocking = [...noNoscript.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/gi)]
    .filter(m => !/media="print"/.test(m[0]));
  ok(blocking.length <= 2, `still ${blocking.length} render-blocking stylesheets on /ballot, budget 2`);

  /* No second door. The coach paints into the desk's existing mount and adds no
     route, no nav entry and no hash of its own. */
  eq((CODE.match(/MOUNT_ID = '([^']+)'/) || [, ''])[1], 'ballot-workspace',
    'the coach mounts into the desk\'s own node');
  ok(!/location\.assign|location\.href *=|history\.(push|replace)State/.test(CODE),
    'it navigates nowhere — it is a card on a page, not a route');
  ok(!/nav|menu/i.test(COPY), 'and it adds no nav item');

  /* It is not on any other document. The coach reads the desk's open seat, and
     there is no desk anywhere else. */
  const others = ['index.html', 'person.html', 'issue.html', 'spotlight.html']
    .filter(f => { try { return /door2-first-run/.test(rd(f)); } catch (e) { return false; } });
  eq(others.length, 0, `the coach is on /ballot only (also found on: ${others.join(', ') || 'nowhere'})`);
}

/* ═══════════════════════════════════════════════════════════════════════════
   11 · NOTHING ELSE MOVED
   ═══════════════════════════════════════════════════════════════════════════ */
section('11 · admin, /library, /money and the H.R.1 card are untouched');

{
  for (const bad of [/admin/i, /\/library/, /\/money/, /H\.?R\.?1\b/i, /hr1/i, /finance|donor|contribution/i]) {
    ok(!bad.test(CODE), `the coach does not reach into ${bad}`);
    ok(!bad.test(CSS), `and its stylesheet does not style ${bad}`);
  }
  /* Finance is not scored here, and there is nothing in this feature that could
     start scoring it: the only ruler it reads is the formal pattern index. */
  ok(!/pdx-money|money-|campaign-finance/.test(CODE), 'no money module is loaded or read');

  /* Door 1 was not redesigned. The only file outside this feature that changed
     is ballot-workspace.js, and it gained exactly one pure read. */
  ok(!/door1|issue-page|issue-file/.test(CODE), 'Door 1 is not reached from here');
  const openAt = BW.indexOf('_open: function ()');
  must(openAt > 0, 'ballot-workspace.js no longer publishes _open');
  const opened = BW.slice(openAt, BW.indexOf('\n', BW.indexOf('},', openAt)));
  ok(/return readOpen\(seats\(\)\)/.test(opened) && /catch/.test(opened),
    'ballot-workspace.js\'s new export is one guarded read and nothing else');
  ok(!/_open[\s\S]{0,80}writeOpen/.test(opened), 'and it writes no session key — a read that moved the rail would be a bug');

  /* The service worker ships both files with the desk, and the shell cache is
     bumped so a warm device actually gets them. */
  const ver = (SW.match(/const CACHE_VERSION = 'v(\d+)'/) || [, '0'])[1];
  ok(Number(ver) >= 217, `sw.js CACHE_VERSION is bumped for this change (is v${ver})`);
  const shell = SW.slice(SW.indexOf('const SHELL_ASSETS = ['));
  ok(/'\/door2-first-run\.js'/.test(shell), 'the coach is on SHELL_ASSETS');
  ok(/'\/door2-first-run\.css'/.test(shell), 'and so is its stylesheet');
  ok(/'\/ballot-workspace\.js'/.test(shell) && /'\/ballot\.html'/.test(shell),
    'alongside the desk and the document it mounts in, which are still there');
  ok(/'\/library\.html'|'\/library'/.test(shell) || /library/.test(shell), 'and the library shell is still precached');
}

/* ═══════════════════════════════════════════════════════════════════════════
   12 · IT STAYS IN STEP, AND CANNOT STACK ITSELF
   ═══════════════════════════════════════════════════════════════════════════ */
section('12 · repaints follow the writers upstream, and boot twice is still once');

{
  ok(/wrap\('_updateTeamPositionsForLocation'/.test(CODE), 'a location change repaints the coach');
  ok(/wrap\('pdxBallotWorkspaceOpen'/.test(CODE), 'so does opening a different seat');
  ok(/wrap\('alignSetIntensity'/.test(CODE), 'and so does the reader\'s own positions changing anywhere');
  /* But a settle repaint must not clear a half-typed query, which is the one
     case where "repaint on every upstream change" is the wrong answer. */
  ok(/data-screen'\) === 'A'/.test(CODE) && /q\.value/.test(CODE),
    'a repaint while the reader is typing in the typeahead is skipped, not applied');
  ok(/w\[flag\] = true/.test(CODE), 'each wrapper is marked, so a double boot cannot stack two');
  ok(/pdxRosterReady/.test(CODE), 'and the resolver\'s own arrival is listened for rather than polled');

  /* Loading the module twice is a no-op. */
  const d = drive({ located: true });
  vm.runInContext(JS, vm.createContext(d.win), { filename: 'door2-first-run.js (again)' });
  eq(d.dom.mount.children.filter(n => n.id === 'd2fr').length, 1, 'a second load paints no second card');
  ok(/if \(window\.PDXDoor2FirstRun\) return;/.test(CODE), 'because the module guards its own name');
}

console.log('');
if (fail) {
  console.error(`✗ Door 2 first run: ${fail} of ${pass + fail} assertions failed\n`);
  process.exit(1);
}
console.log(`✓ Door 2 first run: all ${pass} assertions passed — location card still first, one tap to one ` +
            `locked issue, the answer in the existing store, the proof is that issue's formal row on the ` +
            `person in the seat, and skip invents nothing\n`);
