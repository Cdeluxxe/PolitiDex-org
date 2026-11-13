#!/usr/bin/env node
// test-dirkey-auto.mjs — the automatic candidate generator for the person-page
// directional-key section, its disclosure, the "Flag a problem" path and
// proposed keys.
//   · the generator adds people up to the soft cap (40), tags each person and
//     row internally { source: "auto" }, and leaves the rest queued;
//   · ground-truth people and non-first-party links never enter the queue;
//   · the person page shows the section and ONE disclosure, with no status word
//     beyond the per-row "Under review" / "Cross-checked" labels and no tag
//     visible; hand-checked rows win over automatic ones;
//   · a flag records person id, key, optional note and timestamp, and the
//     public row renders the same before and after;
//   · proposed keys are written but not used until approved and given a pattern;
//   · the committed automatic table and queue keep those rules.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import * as A from '../netlify/lib/dirkey-auto-core.mjs';
import * as FL from '../netlify/lib/dirkey-flag-core.mjs';
import * as K from '../netlify/lib/bill-key-patterns.mjs';
import { swCodeOnly } from './v103-chrome-seams.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let failures = 0;
const tests = [];
const t = (name, fn) => tests.push([name, fn]);
const main = JSON.parse(R('person-directional-keys.json'));
const auto = JSON.parse(R('person-directional-keys-auto.json'));
const queueFile = JSON.parse(R('db/dirkey-auto-queue.json'));
const proposalsFile = JSON.parse(R('db/dirkey-proposed-keys.json'));
const FOUR = ['support', 'oppose', 'mixed', 'no clear position'];
const STATUS = /\b(?:pending|review(?:ed|ing|s)?|status|unverified|draft|provisional|awaiting|auto(?:matic)? row|source:\s*auto)\b/i;
const BANNED = /\b(?:partner\w*|equity|membership|members only|utah[- ]first|coming (?:soon|later)|stay tuned|in the future|roadmap|beta)\b/i;

// ── Fakes ────────────────────────────────────────────────────────────────────
const PAGE = '<html><body><h1>Border</h1><p>I support finishing the border wall and I will vote to deport people here illegally.</p><p>We must secure the border now.</p></body></html>';
const NAV = '<html><body><nav><a>Border Security</a></nav><p>Welcome to my office.</p></body></html>';
const card = (pid, extra = {}) => ({ topic: 'Border', pos: 'support', issueKey: 'border_security', text: 'x', source: { label: 'Official House page', url: `https://${pid}.house.gov/issues/border` }, ...extra });
const people = (n, prefix = 'zz_p') => Object.fromEntries(Array.from({ length: n }, (_, i) => [`${prefix}${String(i).padStart(3, '0')}`, [card(`${prefix}${i}`)]]));
const okPage = async () => ({ ok: true, body: PAGE });
const NOW = () => new Date('2026-11-12T12:00:00.000Z');

// ── Generator ────────────────────────────────────────────────────────────────
t('the generator adds people up to the soft cap of 40, tags each internally, and leaves the rest queued', async () => {
  assert.equal(A.AUTO_SOFT_CAP, 40);
  const data = people(55);
  const q1 = A.buildQueue(data, { exclude: new Set() });
  assert.equal(q1.length, 55);
  const r1 = await A.runGenerator({ queue: q1, fetchPage: okPage, now: NOW });
  assert.equal(r1.summary.added, 40);
  assert.equal(Object.keys(r1.people).length, 40);
  assert.equal(r1.summary.remaining_in_queue, 15);
  for (const p of Object.values(r1.people)) {
    assert.equal(p.tag.source, 'auto');
    assert.ok(p.stances.length);
    for (const row of [...p.stances, ...p.mappings]) assert.deepEqual(row.tag, { source: 'auto' });
    for (const s of p.stances) { assert.ok(FOUR.includes(s.position)); assert.equal(typeof s.confidence, 'number'); assert.ok(s.quote); }
  }
  // The next run picks up where this one stopped; nobody is read twice.
  const q2 = A.buildQueue(data, { exclude: new Set(), state: r1.state });
  assert.equal(q2.length, 15);
  const r2 = await A.runGenerator({ queue: q2, fetchPage: okPage, state: r1.state, now: NOW });
  assert.equal(r2.summary.added, 15);
  assert.equal(new Set([...Object.keys(r1.people), ...Object.keys(r2.people)]).size, 55);
  assert.equal(A.buildQueue(data, { exclude: new Set(), state: r2.state }).length, 0);
  // Merging never rewrites a person already in the table.
  const t1 = A.mergeAutoTable({ people: {} }, r1);
  const again = A.mergeAutoTable(t1, { people: { [Object.keys(r1.people)[0]]: { tag: { source: 'auto' }, mappings: [], stances: [] } } });
  assert.deepEqual(again.people[Object.keys(r1.people)[0]], r1.people[Object.keys(r1.people)[0]]);
});
t('ground-truth people, non-first-party links and off-key cards never enter the queue', () => {
  const data = {
    massie: [card('massie')],
    zz_news: [card('zz_news', { source: { label: 'Ballotpedia', url: 'https://ballotpedia.org/Someone' } })],
    zz_offkey: [card('zz_offkey', { issueKey: 'property_tax' })],
    zz_ok: [card('zz_ok')],
  };
  const q = A.buildQueue(data, { exclude: new Set(['massie']) });
  assert.deepEqual(q.map((p) => p.politician_id), ['zz_ok']);
  // A parent issue key reads on its pattern-key children.
  assert.deepEqual(A.keysForIssue('israel_military_aid'), ['israel_offensive_arms']);
});
t('a page that does not speak to the key adds nobody; an unreadable page stays queued', async () => {
  const data = people(2, 'zz_q');
  const q = A.buildQueue(data, { exclude: new Set() });
  const r = await A.runGenerator({ queue: q, fetchPage: async (u) => (u.includes('zz_q0') ? { ok: true, body: NAV } : { ok: false, error: 'HTTP 500' }), now: NOW });
  assert.equal(r.summary.added, 0);
  assert.equal(r.state.processed.zz_q000.result, 'no_hit');
  assert.equal(r.state.processed.zz_q001, undefined, 'unreadable: not marked done');
  assert.deepEqual(A.buildQueue(data, { exclude: new Set(), state: r.state }).map((p) => p.politician_id), ['zz_q001']);
  // A person whose linked pages change is queued again.
  const changed = { ...data, zz_q000: [card('zz_q000', { source: { label: 'Official House page', url: 'https://other.house.gov/x' } })] };
  assert.ok(A.buildQueue(changed, { exclude: new Set(), state: r.state }).some((p) => p.politician_id === 'zz_q000'));
});

// ── Proposed keys ────────────────────────────────────────────────────────────
t('proposed keys are written for clusters of unmatched bills, but are not used until approved and given a pattern', async () => {
  const u = (id, title, pid) => ({ id, bill: id.split('|')[1], congress: Number(id.split('|')[0]), title, issue_keys: ['child_care'], span: 'expand child care funding', politician_id: pid, link: 'https://x.house.gov/a' });
  const one = A.proposeKeys([u('119|H.R. 10', 'Child Care Access Act', 'zz_a')], {}, { run: 'r1' });
  assert.deepEqual(one.proposals, {}, 'one bill is not a cluster');
  const doc = A.proposeKeys([u('119|H.R. 10', 'Child Care Access Act', 'zz_a'), u('119|H.R. 11', 'Child Care Workforce Act', 'zz_b')], {}, { run: 'r1' });
  const p = doc.proposals.proposed_child_care;
  assert.equal(p.approved, false);
  assert.ok(p.suggested_subject_words.includes('child') && p.suggested_subject_words.includes('care'));
  assert.ok(p.suggested_measure_words.includes('expand'));
  assert.deepEqual(p.example_bills.map((b) => b.bill), ['H.R. 10', 'H.R. 11']);
  // An omnibus filed under many issues is not a cluster member; a key that already has a pattern is not proposed.
  const omni = A.proposeKeys([{ ...u('119|H.R. 1', 'Omnibus', 'zz_a'), issue_keys: ['a', 'b', 'c', 'd'] }, { ...u('119|H.R. 2', 'Other', 'zz_a'), issue_keys: ['a', 'b', 'c', 'd'] }]);
  assert.deepEqual(omni.proposals, {});
  const mapped = A.proposeKeys([{ ...u('119|H.R. 3', 'A', 'zz_a'), issue_keys: ['healthcare'] }, { ...u('119|H.R. 4', 'B', 'zz_a'), issue_keys: ['healthcare'] }]);
  assert.deepEqual(mapped.proposals, {});
  // Approved on paper but with no pattern: still not a generator key, and a card on it is not queued.
  doc.proposals.proposed_child_care.approved = true;
  assert.ok(!A.generatorKeys().includes('child_care') && !A.generatorKeys().includes('proposed_child_care'));
  assert.deepEqual(A.generatorKeys(), K.MAPPED_KEYS);
  assert.deepEqual(A.buildQueue({ zz_cc: [card('zz_cc', { issueKey: 'child_care' })] }), []);
  // A re-run keeps the approved flag as it is.
  const re = A.proposeKeys([u('119|H.R. 12', 'Child Care Costs Act', 'zz_c'), u('119|H.R. 10', 'Child Care Access Act', 'zz_a')], doc, { run: 'r2' });
  assert.equal(re.proposals.proposed_child_care.approved, true);
  assert.equal(re.proposals.proposed_child_care.first_seen, 'r1');
  assert.equal(re.proposals.proposed_child_care.bills_seen, 3);
});
t('the committed proposals file holds proposals only, none on a key with a pattern', () => {
  assert.ok(proposalsFile.proposals && typeof proposalsFile.proposals === 'object');
  for (const [id, p] of Object.entries(proposalsFile.proposals)) {
    assert.ok(id.startsWith('proposed_'), id);
    assert.ok(!K.MAPPED_KEYS.includes(p.based_on_issue_key), id);
    assert.equal(typeof p.approved, 'boolean');
  }
  for (const p of Object.values(auto.people)) for (const x of [...p.mappings, ...p.stances]) assert.ok(!x.key.startsWith('proposed_'));
});

// ── Committed automatic table ───────────────────────────────────────────────
t('the committed automatic table: no hand-checked person, every person and row tagged, approved keys and four-value reads only, ≤ 40 per run', () => {
  const pids = Object.keys(auto.people);
  assert.ok(pids.length > 0);
  for (const pid of pids) assert.ok(!main.people[pid], `${pid} is hand-checked`);
  for (const [pid, p] of Object.entries(auto.people)) {
    assert.equal(p.tag.source, 'auto', pid);
    for (const row of [...p.mappings, ...p.stances]) { assert.deepEqual(row.tag, { source: 'auto' }, pid); assert.ok(K.MAPPED_KEYS.includes(row.key), row.key); }
    for (const s of p.stances) assert.ok(FOUR.includes(s.position), s.position);
  }
  const byRun = {};
  for (const p of Object.values(auto.people)) byRun[p.tag.run] = (byRun[p.tag.run] || 0) + 1;
  for (const n of Object.values(byRun)) assert.ok(n <= 40);
  for (const r of queueFile.runs) assert.ok(r.added <= 40 && r.added === r.added_people.length);
  for (const pid of pids) assert.equal(queueFile.processed[pid]?.result, 'added', pid);
  // The hand-checked table is still exactly what its generator writes.
  execFileSync(process.execPath, [path.join(root, 'scripts/gen-person-directional-keys.mjs'), '--check'], { stdio: 'pipe' });
});

// ── Person page ──────────────────────────────────────────────────────────────
function el(tag, cls) {
  const e = { tagName: tag, className: cls || '', id: '', hidden: false, innerHTML: '', children: [], attrs: {}, parentNode: null, isConnected: true, listeners: {},
    setAttribute(k, v) { this.attrs[k] = String(v); }, getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; },
    appendChild(c) { c.parentNode = this; this.children.push(c); return c; },
    insertBefore(c, ref) { c.parentNode = this; const i = this.children.indexOf(ref); this.children.splice(i < 0 ? this.children.length : i, 0, c); return c; },
    removeChild(c) { this.children = this.children.filter((x) => x !== c); c.parentNode = null; return c; },
    addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); },
    querySelector(sel) { return find(this, sel); } };
  return e;
}
function find(r, sel) {
  for (const c of r.children) {
    if ((sel.startsWith('#') && c.id === sel.slice(1)) || (sel.startsWith('.') && c.className.split(/\s+/).includes(sel.slice(1)))) return c;
    const d = find(c, sel); if (d) return d;
  }
  return null;
}
function boot(pid, { autoTable = auto, posts = [] } = {}) {
  const body = el('div'); body.id = 'modal-body';
  body.appendChild(el('div', 'pdxsp-stage pdxsp-stage-explore'));
  const head = el('head');
  const document = { readyState: 'complete', head, body, documentElement: head,
    getElementById: (id) => (id === 'modal-body' ? body : find(head, `#${id}`) || find(body, `#${id}`)),
    createElement: (tag) => el(tag), addEventListener() {} };
  const fetch = async (url, opts = {}) => {
    if (opts.method === 'POST') { posts.push({ url, body: JSON.parse(opts.body) }); return { ok: true, status: 202, json: async () => ({ ok: true }) }; }
    if (url === '/person-directional-keys.json') return { ok: true, json: async () => main };
    if (url === '/person-directional-keys-auto.json') return autoTable ? { ok: true, json: async () => autoTable } : { ok: false, status: 404 };
    return { ok: false, status: 404 };
  };
  const ctx = { window: { _pdxCurrentProfileId: pid }, document, fetch, console, setTimeout };
  ctx.window.window = ctx.window; ctx.window.document = document;
  vm.createContext(ctx);
  vm.runInContext(`var window = this.window; ${R('person-directional-keys.js')}`, ctx);
  return { api: ctx.window.PDXPersonDirectionalKeys, body, posts };
}
const tick = () => new Promise((r) => setTimeout(r, 0));
// The per-row review labels ("Under review" / "Cross-checked") are the only
// status text the section may carry; test-dirkey-review.mjs checks when they show.
const chrome = (h) => h.replace(/ <span class="pdx-dk-st" data-pdx-dirkeys-check="(?:open|done)">(?:Under review|Cross-checked)<\/span>/g, '').replace(/<blockquote[\s\S]*?<\/blockquote>/g, '').replace(/<div class="pdx-dk-t">[\s\S]*?<\/div>/g, '').replace(/<a [^>]*>[\s\S]*?<\/a>/g, '');
const DISC = 'These bill matches and position reads are generated automatically and may contain errors.';
const AUTO_PID = Object.keys(auto.people)[0];

t('an automatic person gets the section exactly as a hand-checked one, with one disclosure and the flag control; no status word or tag shows', async () => {
  const { body } = boot(AUTO_PID);
  await tick(); await tick(); await tick();
  const host = find(body, '#pdx-dirkeys');
  assert.ok(host && !host.hidden, AUTO_PID);
  const h = host.innerHTML;
  assert.ok(h.includes('Bills and stances on twenty-five directional issues'));
  assert.equal(h.split(DISC).length - 1, 1, 'one disclosure');
  assert.ok(h.indexOf(DISC) < h.indexOf('Flag a problem'), 'the flag control follows the disclosure');
  assert.equal(h.split('Flag a problem').length - 1, 1);
  assert.ok(h.includes('Stance scorer reads') || h.includes('Bills matched to an issue'));
  assert.ok(!/"auto"|data-tag|source: ?auto/.test(h), 'the internal tag is not rendered');
  assert.ok(!STATUS.test(chrome(h)), chrome(h).match(STATUS)?.[0]);
  assert.ok(!BANNED.test(h), h.match(BANNED)?.[0]);
});
t('every person in either table renders one disclosure; the page chrome has no status or banned word', async () => {
  const { api } = boot('massie');
  const merged = api.merge(main, auto);
  for (const pid of Object.keys(merged.people)) {
    const h = api.html(api.entryFor(merged, pid));
    assert.equal(h.split(DISC).length - 1, 1, pid);
    assert.ok(!STATUS.test(chrome(h)), `${pid}: ${chrome(h).match(STATUS)?.[0]}`);
    assert.ok(!BANNED.test(chrome(h)), `${pid}: ${chrome(h).match(BANNED)?.[0]}`);
  }
  const code = R('person-directional-keys.js').split('\n').filter((l) => !/^\s*(?:\/\/|\*|\/\*)/.test(l)).join('\n');
  assert.ok(!BANNED.test(code), code.match(BANNED)?.[0]);
  // Every string the module can put on the page: no status word in any of them.
  const strings = (code.match(/'(?:[^'\\\n]|\\.)*'/g) || []).map((x) => x.replace(/data-pdx-[\w-]+/g, ''));
  assert.ok(strings.length > 50);
  for (const x of strings) if (x !== "'Under review'") assert.ok(!/\b(?:pending|review\w*|status|unverified|draft)\b/i.test(x), x);
});
t('a hand-checked person is never read from the automatic table', async () => {
  const fake = { ...auto, people: { ...auto.people, massie: { tag: { source: 'auto' }, mappings: [], stances: [{ key: 'healthcare', position: 'oppose', confidence: 0.9, sources: [], tag: { source: 'auto' } }] } } };
  const { body, api } = boot('massie', { autoTable: fake });
  await tick(); await tick(); await tick();
  const h = find(body, '#pdx-dirkeys').innerHTML;
  assert.ok(h.includes('H.R. 8035') && !h.includes('Expand Healthcare Access</span> <span class="pdx-dk-pos"'));
  assert.deepEqual(api.merge(main, fake).people.massie, main.people.massie);
  // Without the automatic file the hand-checked section is unchanged.
  const r = boot('massie', { autoTable: null }); await tick(); await tick(); await tick();
  assert.ok(find(r.body, '#pdx-dirkeys').innerHTML.includes('H.R. 8035'));
});

// ── Flag a problem ───────────────────────────────────────────────────────────
const fakeStore = () => { const data = new Map(); return { data, async setJSON(k, v) { data.set(k, JSON.parse(JSON.stringify(v))); }, async get(k) { return data.get(k) ?? null; }, async list() { return { blobs: [...data.keys()].map((key) => ({ key })) }; } }; };
t('a flag records person id, key, optional note and timestamp — and nothing else', async () => {
  const store = fakeStore();
  const r = await FL.recordFlag({ kind: 'dirkey_flag', politician_id: AUTO_PID, key: 'border_security', note: '  Wrong bill.\u0007 ' }, { store, now: NOW, id: 'abcdef1234' });
  assert.equal(r.status, 202);
  assert.equal(store.data.size, 1);
  const [[k, v]] = [...store.data];
  assert.deepEqual(v, { politician_id: AUTO_PID, key: 'border_security', note: 'Wrong bill.', flagged_at: '2026-11-12T12:00:00.000Z' });
  assert.equal(k, `${AUTO_PID}/border_security/2026-11-12T12-00-00-000Z-abcdef12.json`);
  const noNote = await FL.recordFlag({ kind: 'dirkey_flag', politician_id: 'massie', key: 'ukraine_aid' }, { store, now: NOW });
  assert.equal(noNote.status, 202);
  const listed = await FL.listFlags(store);
  assert.equal(listed.length, 2);
  assert.deepEqual(Object.keys(listed.find((x) => x.politician_id === 'massie')).sort(), ['flagged_at', 'key', 'politician_id', 'store_key']);
  for (const bad of [{}, { kind: 'dirkey_flag', politician_id: 'Bad Id', key: 'ukraine_aid' }, { kind: 'dirkey_flag', politician_id: 'massie', key: 'proposed_child_care' }, { kind: 'other', politician_id: 'massie', key: 'ukraine_aid' }]) {
    assert.equal((await FL.recordFlag(bad, { store, now: NOW })).status, 400);
  }
  assert.equal(store.data.size, 2);
  assert.equal(FL.parseFlag({ kind: 'dirkey_flag', politician_id: 'massie', key: 'ukraine_aid', note: 'x'.repeat(5000) }).flag.note.length, FL.FLAG_NOTE_MAX);
});
t('the flag control sends those fields to the existing endpoint and leaves the public row as it was', async () => {
  const posts = [];
  const { body, api } = boot(AUTO_PID, { posts });
  await tick(); await tick(); await tick();
  const host = find(body, '#pdx-dirkeys');
  const before = host.innerHTML;
  const key = (auto.people[AUTO_PID].stances[0] || auto.people[AUTO_PID].mappings[0]).key;
  assert.ok(before.includes(`<option value="${key}">`));
  assert.ok(before.includes(`data-pid="${AUTO_PID}"`));
  const msg = { textContent: '' };
  const btn = { disabled: false };
  const form = { getAttribute: (a) => (a === 'data-pdx-dirkeys-flag-form' ? '' : a === 'data-pid' ? AUTO_PID : null),
    querySelector: (s) => (s === 'button' ? btn : msg), elements: { key: { value: key }, note: { value: 'Quote is from a menu.' } } };
  let prevented = false;
  assert.equal(host.listeners.submit.length, 1);
  host.listeners.submit[0]({ target: form, preventDefault() { prevented = true; } });
  await tick(); await tick(); await tick();
  assert.ok(prevented);
  assert.deepEqual(posts, [{ url: '/api/evidence-locker/items', body: { kind: 'dirkey_flag', politician_id: AUTO_PID, key, note: 'Quote is from a menu.' } }]);
  assert.equal(msg.textContent, 'Thanks. Your flag was sent.');
  assert.ok(!STATUS.test(msg.textContent) && !BANNED.test(msg.textContent));
  assert.equal(host.innerHTML, before, 'the row is unchanged');
  assert.ok(!host.hidden);
  assert.equal(api.html(api.entryFor(api.merge(main, auto), AUTO_PID)), before);
});
t('the flag goes to the existing items path (no new route); GET still serves the Locker untouched', async () => {
  const fn = await import(pathToFileURL(path.join(root, 'netlify/functions/evidence-locker-items.mts')).href);
  assert.equal(fn.config.path, '/api/evidence-locker/items');
  assert.deepEqual(fn.config.method, ['GET', 'POST']);
  const src = R('netlify/functions/evidence-locker-items.mts');
  assert.match(src, /recordFlag\(body, \{ store: getStore\(FLAG_STORE_NAME\) \}\)/);
  assert.ok(!/listFlags/.test(src), 'the public side never reads flags');
  assert.equal(FL.FLAG_STORE_NAME, 'dirkey-flags');
  const empty = await fn.listLockerEntries({ list: async () => ({ blobs: [] }), get: async () => null });
  assert.deepEqual(empty, { items: {}, count: 0, hidden: 0 });
});
t('no migration, no new function, and the worker precache list is untouched', () => {
  const git = (args) => { try { return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return null; } };
  const added = git(['status', '--porcelain', '--untracked-files=all', '--', 'netlify/functions', 'netlify/edge-functions', 'netlify/database', 'db/migrations']);
  // A later pass's declared migration (executive seed wave 14, the Trump–Massie
  // pass) is not this pass's; anything else new still fails.
  const LATER = ['netlify/database/migrations/20261205000000_seed_exec_actions_wave14.sql'];
  if (added != null) assert.deepEqual(added.split('\n').filter((l) => /^(?:\?\?|A)/.test(l) && !LATER.some((f) => l.endsWith(' ' + f))), [], 'no new function or migration file');
  const sw = R('sw.js');
  for (const f of ['person-directional-keys.js', 'person-directional-keys-auto.json', 'person-directional-keys.json']) assert.ok(!sw.includes(`'/${f}'`), `${f} is not precached`);
  const headSw = git(['show', 'HEAD:sw.js']);
  // Worker code and the precache list are this pass's to hold; a later pass's
  // version note and one-step bump (it re-ships a precached file) are not.
  if (headSw) assert.equal(swCodeOnly(sw), swCodeOnly(headSw), 'no worker code or precache entry changed');
});

for (const [name, fn] of tests) {
  try { await fn(); console.log('  ✓', name); } catch (e) { failures++; console.error('  ✗', name, '\n    ', e.message); }
}
if (failures) { console.error(`\n${failures} failing`); process.exit(1); }
console.log('\ndirkey auto generator: all checks pass');
