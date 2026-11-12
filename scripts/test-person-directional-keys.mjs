#!/usr/bin/env node
// test-person-directional-keys.mjs — the person-file section for directional-key
// bill matches and stance-scorer reads (person-directional-keys.js / .json).
//   · the table is current with the finder and scorer code, and names only the
//     nine keys with a pattern;
//   · Massie: H.R. 8035 / H.R. 7691 → ukraine_aid, H.Con.Res. 38 → iran_hostilities;
//     scorer reads ukraine_aid oppose and iran_hostilities support;
//   · Sanders: Israel bills → israel_offensive_arms only; scorer read on that key;
//   · the expansion people (Owens, Crawford, Guest, Tlaib, Cotton) are in the
//     table on their record's key, with the scorer's read (agree or not), and
//     so are the thirteen second-pass people (cut_spending, healthcare,
//     school_choice, energy_production);
//   · the section renders for people with rows and is absent for everyone else;
//   · wording is plain: no partnership, equity or "coming later" language;
//   · person-bills.js loads it; person.html and the precache list are unchanged,
//     and the worker moved one version for the changed precached file.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import * as S from '../netlify/lib/stance-score-core.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let failures = 0;
const t = (name, fn) => { try { fn(); console.log('  ✓', name); } catch (e) { failures++; console.error('  ✗', name, '\n    ', e.message); } };
const data = JSON.parse(R('person-directional-keys.json'));
const KEYS = ['israel_offensive_arms', 'ukraine_aid', 'iran_hostilities', 'tariffs_china', 'border_security', 'energy_production', 'school_choice', 'healthcare', 'cut_spending'];

// ── A minimal DOM, enough for mount / fill ──────────────────────────────────
function el(tag, cls) {
  const e = { tagName: tag, className: cls || '', id: '', hidden: false, innerHTML: '', children: [], attrs: {}, parentNode: null, isConnected: true,
    setAttribute(k, v) { this.attrs[k] = String(v); }, getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; },
    appendChild(c) { c.parentNode = this; this.children.push(c); return c; },
    insertBefore(c, ref) { c.parentNode = this; const i = this.children.indexOf(ref); this.children.splice(i < 0 ? this.children.length : i, 0, c); return c; },
    removeChild(c) { this.children = this.children.filter((x) => x !== c); c.parentNode = null; return c; },
    querySelector(sel) { return find(this, sel); } };
  return e;
}
function find(root, sel) {
  for (const c of root.children) {
    if ((sel.startsWith('#') && c.id === sel.slice(1)) || (sel.startsWith('.') && c.className.split(/\s+/).includes(sel.slice(1)))) return c;
    const d = find(c, sel); if (d) return d;
  }
  return null;
}
function boot(pid, stages = ['explore', 'record']) {
  const body = el('div'); body.id = 'modal-body';
  for (const s of stages) body.appendChild(el('div', `pdxsp-stage pdxsp-stage-${s}`));
  const head = el('head');
  const document = { readyState: 'complete', head, body, documentElement: head,
    getElementById: (id) => (id === 'modal-body' ? body : find(head, `#${id}`) || find(body, `#${id}`)),
    createElement: (tag) => el(tag), addEventListener() {} };
  const ctx = { window: { _pdxCurrentProfileId: pid }, document, fetch: async () => ({ ok: true, json: async () => data }), console };
  ctx.window.window = ctx.window; ctx.window.document = document;
  vm.createContext(ctx);
  vm.runInContext(`var window = this.window; ${R('person-directional-keys.js')}`, ctx);
  return { api: ctx.window.PDXPersonDirectionalKeys, body };
}
const tick = () => new Promise((r) => setTimeout(r, 0));

t('the table is current with the finder and scorer, and names only the nine keys with a pattern', () => {
  execFileSync(process.execPath, [path.join(root, 'scripts/gen-person-directional-keys.mjs'), '--check'], { stdio: 'pipe' });
  assert.deepEqual(Object.keys(data.keys), KEYS);
  for (const p of Object.values(data.people)) for (const x of [...p.mappings, ...p.stances]) assert.ok(KEYS.includes(x.key), x.key);
  assert.equal(data.rules_version, 'phase8-v3');
  assert.equal(data.vocab_version, 'issue-vocab-v2-directional');
});
t('Massie: Ukraine bills on ukraine_aid, H.Con.Res. 38 on iran_hostilities; scorer reads oppose / support', () => {
  const m = data.people.massie;
  assert.deepEqual(m.mappings.map((x) => [x.bill, x.key, x.confidence]), [['H.R. 8035', 'ukraine_aid', 'high'], ['H.R. 7691', 'ukraine_aid', 'high'], ['H.Con.Res. 38', 'iran_hostilities', 'high']]);
  assert.equal(m.mappings[2].source.type, 'resolution text (sponsor)');
  assert.match(m.mappings[2].justification, /remove United States Armed Forces from unauthorized hostilities in the Islamic Republic of Iran/);
  assert.deepEqual(m.stances.map((x) => [x.key, x.position]), [['ukraine_aid', 'oppose'], ['iran_hostilities', 'support']]);
});
t('Sanders: Israel bills on israel_offensive_arms only; the scorer read on that key (plus his healthcare record)', () => {
  const s = data.people.sanders;
  assert.ok(s.mappings.every((x) => x.key === 'israel_offensive_arms'));
  assert.deepEqual(s.mappings.map((x) => x.bill || x.one_of.map((b) => b.bill).join(',')), ['S.J.Res. 111', 'S.J.Res. 111,S.J.Res. 113,S.J.Res. 115', 'S.J.Res. 26,S.J.Res. 32,S.J.Res. 33,S.J.Res. 34']);
  assert.equal(s.mappings[0].also_found_in[0].type, 'roll-call vote (Senate)');
  assert.equal(s.mappings[2].best_fit, 'S.J.Res. 33');
  assert.ok(!s.mappings[2].justification.includes('news sanders files'), 'a URL headline is not quoted');
  assert.deepEqual(s.stances.map((x) => [x.key, x.position]), [['israel_offensive_arms', 'oppose'], ['healthcare', 'support']], 'the Israel read is unchanged; his locked healthcare record now reads on a mapped key');
});
const SECOND = ['french_hill', 'bruce_westerman', 'frank_lucas', 'mariannette_miller_meeks', 'bennie_thompson', 'cruz', 'aoc', 'kclark', 'murkowski', 'khanna', 'jayapal', 'maxine_waters', 'jason_smith'];
t('only people with rows are in the table: 21, of whom 20 hold an expansion or directional record (at least seventeen)', () => {
  assert.deepEqual(Object.keys(data.people), ['aoc', 'bennie_thompson', 'bruce_westerman', 'cotton', 'cruz', 'frank_lucas', 'french_hill', 'james_talarico', 'jason_smith',
    'jayapal', 'kclark', 'khanna', 'mariannette_miller_meeks', 'massie', 'maxine_waters', 'michael_guest', 'murkowski', 'owens', 'rick_crawford', 'sanders', 'tlaib']);
  assert.ok(Object.keys(data.people).length >= 17);
  // Talarico and Sanders join on their locked school_choice / healthcare records, now on mapped keys.
  assert.deepEqual(data.people.james_talarico.stances.map((x) => [x.key, x.position]), [['school_choice', 'oppose']]);
  assert.deepEqual(data.people.sanders.stances.map((x) => [x.key, x.position]), [['israel_offensive_arms', 'oppose'], ['healthcare', 'support']]);
});
t('second-pass people: each on their record key, bills where the source names one, the scorer read as it is', () => {
  const P = data.people;
  const rows = Object.fromEntries(SECOND.map((pid) => [pid, [P[pid].mappings.map((x) => `${x.bill || x.name}→${x.key}`), P[pid].stances.map((x) => `${x.key}:${x.position}`)]]));
  assert.deepEqual(rows, {
    french_hill: [['H.Con.Res. 71→cut_spending'], ['cut_spending:support']],
    bruce_westerman: [[], ['cut_spending:support']],
    frank_lucas: [['H.R. 2811→cut_spending'], ['cut_spending:support']],
    mariannette_miller_meeks: [['H.J.Res. 139→cut_spending'], ['cut_spending:support']],
    bennie_thompson: [['H.R. 1→healthcare', 'Affordable Care Act→healthcare'], ['healthcare:no clear position']],
    cruz: [['Educational Choice for Children Act→school_choice', 'Tax Cuts and Jobs Act→school_choice'], ['school_choice:no clear position']],
    aoc: [['Affordable Care Act→healthcare'], ['healthcare:no clear position']],
    kclark: [[], ['healthcare:mixed']],
    murkowski: [[], ['energy_production:no clear position']],
    khanna: [[], ['cut_spending:support']],
    jayapal: [[], ['healthcare:support']],
    maxine_waters: [[], ['healthcare:no clear position']],
    jason_smith: [['H.R. 3746→cut_spending'], ['cut_spending:support']],
  });
  for (const m of P.cruz.mappings) assert.ok(!m.bill && m.name, 'a bill named only by title keeps its title');
});
t('expansion people: each on their record key, with bill matches where the source names a bill and the scorer read as it is', () => {
  const P = data.people;
  assert.deepEqual(P.owens.mappings.map((x) => [x.bill, x.key, x.confidence]), [['H.R. 7691', 'ukraine_aid', 'high']]);
  assert.deepEqual(P.michael_guest.mappings.map((x) => [x.bill, x.key, x.confidence]), [['H.R. 2', 'border_security', 'high']]);
  for (const pid of ['rick_crawford', 'tlaib', 'cotton']) assert.deepEqual(P[pid].mappings, [], `${pid} names no bill`);
  assert.deepEqual(Object.fromEntries(['owens', 'rick_crawford', 'michael_guest', 'tlaib', 'cotton'].map((pid) => [pid, P[pid].stances.map((x) => [x.key, x.position])])), {
    owens: [['ukraine_aid', 'no clear position']], rick_crawford: [['ukraine_aid', 'support']], michael_guest: [['border_security', 'support']],
    tlaib: [['iran_hostilities', 'no clear position']], cotton: [['israel_offensive_arms', 'no clear position']],
  });
  // The reads match the expansion re-score report, which records the human label next to each.
  const rep = JSON.parse(R('db/rescore-ground-truth-expansion-2026-11.json'));
  for (const r of rep.records) {
    const st = P[r.politician_id].stances.find((x) => x.key === r.topic);
    assert.equal(st.position, r.scorer.position, r.stance_id);
    assert.equal(st.confidence, r.scorer.confidence, r.stance_id);
  }
  assert.deepEqual(rep.records.filter((r) => r.scorer_agrees).map((r) => r.stance_id), ['michael_guest|border_security|gt-009',
    'french_hill|cut_spending|gt-012', 'bruce_westerman|cut_spending|gt-013', 'frank_lucas|cut_spending|gt-014', 'mariannette_miller_meeks|cut_spending|gt-015',
    'jayapal|healthcare|gt-022', 'jason_smith|cut_spending|gt-024']);
  execFileSync(process.execPath, [path.join(root, 'scripts/rescore-ground-truth-expansion-2026-11.mjs'), '--check'], { stdio: 'pipe' });
});
t('the scorer reads in the table match a fresh scorer read; ground-truth labels are unchanged', () => {
  const gt = JSON.parse(R('db/stance-ground-truth-talarico-cost-of-living.json'));
  assert.deepEqual([gt, ...gt.additional_records].map((r) => [r.stance_id, r.position, r.confidence]), [
    ['james_talarico|cost_living|gt-001', gt.position, gt.confidence], ['massie|ukraine_aid|gt-002', 'oppose', 0.85], ['sanders|healthcare|gt-003', 'support', 0.9],
    ['james_talarico|school_choice|gt-004', 'oppose', 0.9], ['massie|iran_hostilities|gt-005', 'support', 0.85], ['sanders|israel_military_aid|gt-006', 'mixed', 0.75]]);
  assert.equal(gt.position, 'support');
  assert.equal(S.RULES_VERSION, 'phase8-v3');
  assert.equal(S.DIRECTIONAL_VOCAB_VERSION, 'issue-vocab-v2-directional');
});

const pending = [];
const at = (name, fn) => pending.push([name, fn]);
at('the section renders for Massie at the end of Explore by topic, with bills, keys, confidence, quotes and sources', async () => {
  const { body } = boot('massie');
  await tick(); await tick();
  const host = find(body, '#pdx-dirkeys');
  assert.ok(host && !host.hidden);
  assert.equal(host.parentNode.className.includes('pdxsp-stage-explore'), true);
  const h = host.innerHTML;
  for (const s of ['H.R. 8035', 'H.R. 7691', 'H.Con.Res. 38', 'Further U.S. Aid to Ukraine', 'Congress Must Authorize Hostilities with Iran',
    'High confidence', 'Roll-call vote (House Clerk), 2024-04-20', 'Resolution text (sponsor), 2025-06-17', 'Stance scorer reads', 'Opposes', 'Supports',
    'href="https://www.govinfo.gov/content/pkg/BILLS-119hconres38ih/html/BILLS-119hconres38ih.htm"', 'href="/b/118/H.R.%208035"']) assert.ok(h.includes(s), s);
  assert.ok(!h.includes('Offensive Arms Sales to Israel</span>'), 'no Israel row for Massie');
});
at('the section renders for Sanders with the Israel rows only', async () => {
  const { body } = boot('sanders');
  await tick(); await tick();
  const h = find(body, '#pdx-dirkeys').innerHTML;
  assert.ok(h.includes('Offensive Arms Sales to Israel') && h.includes('One of') && h.includes('S.J.Res. 33') && h.includes('Floor speech (prepared remarks, official release), 2024-11-20'));
  assert.ok(!h.includes('Further U.S. Aid to Ukraine</span>') && !h.includes('Hostilities with Iran</span>'));
});
at('the heading counts and names the nine keys from the table; Guest’s border row renders', async () => {
  const { body } = boot('michael_guest');
  await tick(); await tick();
  const h = find(body, '#pdx-dirkeys').innerHTML;
  assert.ok(h.includes('Bills and stances on nine directional issues'));
  assert.ok(h.includes('on nine issues only: Offensive Arms Sales to Israel, Further U.S. Aid to Ukraine, Congress Must Authorize Hostilities with Iran, Tariffs on China &amp; Unfair Trade, Strong Border &amp; Enforcement, Expand Domestic Energy Production, School Choice &amp; Education Freedom, Expand Healthcare Access, and Cut Federal Spending &amp; Reduce Debt.'));
  for (const s of ['H.R. 2', 'Strong Border &amp; Enforcement</span>', 'High confidence', 'Official press release (with floor speech transcript), 2023-05-12', 'Supports']) assert.ok(h.includes(s), s);
  const t2 = boot('cruz'); await tick(); await tick();
  const c = find(t2.body, '#pdx-dirkeys').innerHTML;
  assert.ok(c.includes('Educational Choice for Children Act</span> <span class="pdx-dk-note">(named by title; no bill number in the source)</span>'));
  assert.ok(!c.includes('One of </'), 'a title-only bill is not shown as an empty "One of"');
  for (const pid of ['owens', 'rick_crawford', 'tlaib', 'cotton', ...SECOND]) {
    const r = boot(pid); await tick(); await tick();
    const x = find(r.body, '#pdx-dirkeys');
    assert.ok(x && !x.hidden && x.innerHTML.includes('Stance scorer reads'), pid);
  }
});
at('people with no row get no section (hidden and empty)', async () => {
  for (const pid of ['tommy_butler', 'mike_lee', 'nobody_here']) {
    const { body, api } = boot(pid);
    await tick(); await tick();
    const host = find(body, '#pdx-dirkeys');
    assert.ok(!host || (host.hidden && host.innerHTML === ''), pid);
    assert.equal(api.entryFor(data, pid), null, pid);
  }
  const { api } = boot('massie');
  assert.equal(api.html(null), '');
});
at('falls back to Stances & connections, then ahead of the Official record', async () => {
  let r = boot('massie', ['signature', 'record']); await tick(); await tick();
  assert.ok(find(r.body, '#pdx-dirkeys').parentNode.className.includes('pdxsp-stage-signature'));
  r = boot('massie', ['record']); await tick(); await tick();
  const host = find(r.body, '#pdx-dirkeys');
  assert.equal(r.body.children.indexOf(host), r.body.children.indexOf(find(r.body, '.pdxsp-stage-record')) - 1);
});
at('wording is plain: no partnership, equity or "coming later" language', async () => {
  const banned = /\b(?:partner\w*|equity|coming (?:soon|later)|stay tuned|in the future|roadmap|beta)\b/i;
  const { api } = boot('massie');
  const rendered = Object.keys(data.people).map((pid) => api.html(api.entryFor(data, pid))).join('');
  assert.ok(!banned.test(rendered), rendered.match(banned)?.[0]);
  const visible = R('person-directional-keys.js').split('\n').filter((l) => !/^\s*(?:\/\/|\*|\/\*)/.test(l)).join('\n');
  assert.ok(!banned.test(visible));
});
at('person-bills.js loads the module once; person.html and the precache list are unchanged; the worker moved one version', async () => {
  const git = (f) => { try { return execFileSync('git', ['show', `HEAD:${f}`], { cwd: root, encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return null; } };
  // The loader, in a minimal DOM: one script tag for the module, not two.
  const appended = [];
  const head = { appendChild: (n) => { appended.push(n); return n; } };
  const document = { readyState: 'complete', head, body: null, documentElement: head, addEventListener() {}, getElementById: () => null,
    querySelector: (sel) => (sel === 'script[data-pdx-dirkeys-loader]' ? appended.find((n) => n.attrs && 'data-pdx-dirkeys-loader' in n.attrs) || null : null),
    createElement: (tag) => ({ tagName: tag, attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } }) };
  const ctx = { window: {}, document, fetch: async () => ({ ok: false }), console };
  ctx.window.window = ctx.window;
  vm.createContext(ctx);
  vm.runInContext(`var window = this.window; ${R('person-bills.js')}`, ctx);
  ctx.window.PDXPersonBills.scan();
  const scripts = appended.filter((n) => n.tagName === 'script');
  assert.equal(scripts.length, 1);
  assert.equal(scripts[0].src, '/person-directional-keys.js');
  const sw = R('sw.js');
  const precache = (src) => (/const SHELL_ASSETS = \[([\s\S]*?)\];/.exec(src) || [])[1]?.split('\n').filter((l) => /^\s*'/.test(l)).join('\n');
  assert.ok(!sw.includes("'/person-directional-keys.js'") && !sw.includes("'/person-directional-keys.json'"), 'the module and its table are fetched at runtime');
  const headSw = git('sw.js'), headPerson = git('person.html');
  if (headPerson) assert.equal(R('person.html'), headPerson, 'person.html is unchanged');
  if (headSw && headSw !== sw) {
    assert.equal(precache(sw), precache(headSw), 'the precache list is unchanged');
    assert.equal(Number(/const CACHE_VERSION = 'v(\d+)';/.exec(sw)[1]), Number(/const CACHE_VERSION = 'v(\d+)';/.exec(headSw)[1]) + 1);
  }
});

for (const [name, fn] of pending) {
  try { await fn(); console.log('  ✓', name); } catch (e) { failures++; console.error('  ✗', name, '\n    ', e.message); }
}
if (failures) { console.error(`\n${failures} failing`); process.exit(1); }
console.log('\nperson directional keys: all checks pass');
