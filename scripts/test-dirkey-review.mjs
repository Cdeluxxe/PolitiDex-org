#!/usr/bin/env node
// test-dirkey-review.mjs — the per-row review labels on the automatic
// directional-key section, and the `reviewed` field that finishes a review
// (person-directional-keys.js, netlify/lib/dirkey-review-core.mjs,
// scripts/review-dirkey-auto.mjs).
//   · a row tagged needs_review shows "Under review"; a reviewed row with the tag
//     cleared shows "Cross-checked"; a row never tagged shows nothing;
//   · labels appear in the automatic section only, never on hand-checked rows;
//   · the disclosure sentence and the rest of the section are unchanged;
//   · marking a row reviewed clears "Under review"; the note and date never show;
//   · a later second-check pass leaves a reviewed row as it is.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import * as V from '../netlify/lib/dirkey-verify-core.mjs';
import * as RV from '../netlify/lib/dirkey-review-core.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const main = JSON.parse(R('person-directional-keys.json'));
const auto = JSON.parse(R('person-directional-keys-auto.json'));
const tests = [];
const t = (name, fn) => tests.push([name, fn]);
const DISC = 'These bill matches and position reads are generated automatically and may contain errors.';
const UNDER = '<span class="pdx-dk-st" data-pdx-dirkeys-check="open">Under review</span>';
const CROSS = '<span class="pdx-dk-st" data-pdx-dirkeys-check="done">Cross-checked</span>';
const count = (h, s) => h.split(s).length - 1;

// ── Fixtures ─────────────────────────────────────────────────────────────────
const SRC = { type: 'Campaign site', link: 'https://example-candidate.com/issues' };
const stance = (key, o = {}) => ({ key, position: 'support', confidence: 0.8, reason: '1 clear medium-weight statement(s) for support; (R8)', record: 'x', quote: `Quote on ${key}.`, sources: [SRC], tag: { source: 'auto' }, ...o });
const bill = (o = {}) => ({ key: 'voting_access', bill: 'H.R. 1', congress: 119, confidence: 'high', basis: 'x', justification: 'voting against H.R. 1, the For the People Act of 2021', source: SRC, tag: { source: 'auto' }, ...o });
const fixture = () => ({
  keys: main.keys,
  people: {
    zz_rev: {
      tag: { source: 'auto', run: 'r' },
      mappings: [bill({ needs_review: true })],
      stances: [
        stance('climate_action', { needs_review: true }),
        stance('housing', { reviewed: { reviewed: true, reviewed_at: '2026-11-10', note: 'SECRET-NOTE checked the page' } }),
        stance('veterans'),
        stance('healthcare', { reviewed: { reviewed: false, reviewed_at: '2026-11-10' } }),
      ],
    },
  },
});

// ── A minimal DOM ────────────────────────────────────────────────────────────
function el(tag, cls) {
  return { tagName: tag, className: cls || '', id: '', hidden: false, innerHTML: '', children: [], attrs: {}, parentNode: null, isConnected: true,
    setAttribute(k, v) { this.attrs[k] = String(v); }, getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; },
    appendChild(c) { c.parentNode = this; this.children.push(c); return c; },
    insertBefore(c) { c.parentNode = this; this.children.push(c); return c; },
    removeChild(c) { this.children = this.children.filter((x) => x !== c); return c; },
    addEventListener() {}, querySelector(sel) { return find(this, sel); } };
}
function find(r, sel) {
  for (const c of r.children) {
    if ((sel.startsWith('#') && c.id === sel.slice(1)) || (sel.startsWith('.') && c.className.split(/\s+/).includes(sel.slice(1)))) return c;
    const d = find(c, sel); if (d) return d;
  }
  return null;
}
async function render(pid, autoTable, mainTable = main) {
  const body = el('div'); body.id = 'modal-body';
  body.appendChild(el('div', 'pdxsp-stage pdxsp-stage-explore'));
  const head = el('head');
  const document = { readyState: 'complete', head, body, documentElement: head, getElementById: (id) => (id === 'modal-body' ? body : find(head, `#${id}`)), createElement: (tag) => el(tag), addEventListener() {} };
  const fetch = async (url) => (url === '/person-directional-keys.json' ? { ok: true, json: async () => mainTable } : url === '/person-directional-keys-auto.json' ? { ok: true, json: async () => autoTable } : { ok: false });
  const ctx = { window: { _pdxCurrentProfileId: pid }, document, fetch, console, setTimeout };
  ctx.window.window = ctx.window; ctx.window.document = document;
  vm.createContext(ctx);
  vm.runInContext(`var window = this.window; ${R('person-directional-keys.js')}`, ctx);
  for (let i = 0; i < 4; i++) await new Promise((r) => setTimeout(r, 0));
  return { html: find(body, '#pdx-dirkeys')?.innerHTML || '', api: ctx.window.PDXPersonDirectionalKeys };
}
const rowHtml = (h, attr) => { const i = h.indexOf(attr); assert.ok(i >= 0, attr); return h.slice(i, h.indexOf('</li>', i)); };

// ── Labels ───────────────────────────────────────────────────────────────────
t('Under review on a tagged row, Cross-checked on a reviewed row, nothing on a row never tagged', async () => {
  const { html } = await render('zz_rev', fixture());
  assert.ok(rowHtml(html, 'data-pdx-dirkeys-stance data-key="climate_action"').includes(UNDER));
  assert.ok(rowHtml(html, 'data-pdx-dirkeys-mapping data-key="voting_access"').includes(UNDER), 'bill-match rows too');
  const housing = rowHtml(html, 'data-pdx-dirkeys-stance data-key="housing"');
  assert.ok(housing.includes(CROSS) && !housing.includes('Under review'));
  for (const k of ['veterans', 'healthcare']) assert.ok(!rowHtml(html, `data-pdx-dirkeys-stance data-key="${k}"`).includes('pdx-dk-st'), `${k}: no label`);
  assert.equal(count(html, 'Under review'), 2);
  assert.equal(count(html, 'Cross-checked'), 1);
});
t('a row both tagged and reviewed (reopened) shows Under review only', async () => {
  const tbl = fixture();
  tbl.people.zz_rev.stances[1].needs_review = true;
  const housing = rowHtml((await render('zz_rev', tbl)).html, 'data-pdx-dirkeys-stance data-key="housing"');
  assert.ok(housing.includes(UNDER) && !housing.includes('Cross-checked'));
});
t('labels sit in the automatic section only: a hand-checked row with the same fields shows none', async () => {
  const pid = 'massie';
  const m = structuredClone(main);
  m.people[pid].stances = m.people[pid].stances.map((s, i) => ({ ...s, ...(i ? { reviewed: { reviewed: true, reviewed_at: '2026-11-10' } } : { needs_review: true }) }));
  const { html } = await render(pid, fixture(), m);
  assert.ok(html, pid);
  assert.ok(!/Under review|Cross-checked|pdx-dk-st/.test(html));
  for (const p of Object.keys(main.people).slice(0, 10)) assert.ok(!/Under review|Cross-checked/.test((await render(p, auto)).html), p);
});
t('the disclosure sentence is unchanged, appears once, and the section matches the unlabeled render', async () => {
  const tbl = fixture();
  const { html, api } = await render('zz_rev', tbl);
  assert.equal(api.DISCLOSURE, DISC);
  assert.equal(count(html, DISC), 1);
  assert.ok(html.includes(`<p class="pdx-dk-disclose" data-pdx-dirkeys-disclosure>${DISC}</p>`));
  const plain = structuredClone(tbl);
  for (const r of [...plain.people.zz_rev.stances, ...plain.people.zz_rev.mappings]) { delete r.needs_review; delete r.reviewed; }
  const base = (await render('zz_rev', plain)).html;
  assert.equal(html.replaceAll(` ${UNDER}`, '').replaceAll(` ${CROSS}`, ''), base);
});
t('the review note, date and object never reach the page', async () => {
  const { html } = await render('zz_rev', fixture());
  assert.ok(!/SECRET-NOTE|2026-11-10|reviewed_at|needs_review|"reviewed"/.test(html));
});
t('the committed table: every tagged row shows Under review, every reviewed row Cross-checked', async () => {
  for (const [pid, p] of Object.entries(auto.people)) {
    const rows = [...p.stances, ...p.mappings];
    const open = rows.filter((r) => r.needs_review === true).length;
    const done = rows.filter((r) => r.needs_review !== true && r.reviewed?.reviewed === true).length;
    const { html } = await render(pid, auto);
    assert.equal(count(html, 'Under review'), open, pid);
    assert.equal(count(html, 'Cross-checked'), done, pid);
  }
});

// ── Marking a row reviewed ───────────────────────────────────────────────────
t('setting reviewed: true clears needs_review and turns Under review into Cross-checked', async () => {
  const tbl = { ...fixture(), verify: { review_queue: [], tagged_for_review: 0 } };
  const res = RV.markReviewed(tbl, { pid: 'zz_rev', key: 'climate_action', note: 'Read the page;\nthe quote is on topic.', at: new Date('2026-11-12T15:00:00Z') });
  assert.ok(res.ok, res.error);
  const row = res.table.people.zz_rev.stances[0];
  assert.equal(row.needs_review, undefined);
  assert.deepEqual(row.reviewed, { reviewed: true, reviewed_at: '2026-11-12', note: 'Read the page; the quote is on topic.' });
  for (const k of ['position', 'confidence', 'quote', 'sources']) assert.deepEqual(row[k], tbl.people.zz_rev.stances[0][k], k);
  assert.ok(!res.table.verify.review_queue.some((q) => q.key === 'climate_action'), 'leaves the review queue');
  assert.equal(res.table.verify.tagged_for_review, res.table.verify.review_queue.length);
  const climate = rowHtml((await render('zz_rev', res.table)).html, 'data-pdx-dirkeys-stance data-key="climate_action"');
  assert.ok(!climate.includes('Under review') && climate.includes(CROSS));
  assert.ok(!(await render('zz_rev', res.table)).html.includes('quote is on topic'));
  // A bill match, named by its bill.
  const b = RV.markReviewed(res.table, { pid: 'zz_rev', row: 'bill_match', key: 'voting_access', bill: 'H.R. 1', at: '2026-11-12' });
  assert.ok(b.ok, b.error);
  assert.deepEqual(b.table.people.zz_rev.mappings[0].reviewed, { reviewed: true, reviewed_at: '2026-11-12' });
  assert.equal(count((await render('zz_rev', b.table)).html, 'Under review'), 0);
});
t('only a tagged (or already reviewed) row can be marked; reopen puts the tag back', () => {
  const tbl = fixture();
  assert.equal(RV.markReviewed(tbl, { pid: 'zz_rev', key: 'veterans' }).ok, false, 'a row never tagged stays unlabeled');
  assert.equal(RV.markReviewed(tbl, { pid: 'nobody', key: 'veterans' }).ok, false);
  assert.equal(RV.markReviewed(tbl, { pid: 'zz_rev', key: 'climate_action', at: 'not a date' }).ok, false);
  assert.ok(RV.markReviewed(tbl, { pid: 'zz_rev', key: 'housing', at: '2026-11-12' }).ok, 'a reviewed row can be re-marked');
  const re = RV.reopenReview(tbl, { pid: 'zz_rev', key: 'housing' });
  assert.ok(re.ok);
  assert.equal(re.table.people.zz_rev.stances[1].needs_review, true);
  assert.equal(re.table.people.zz_rev.stances[1].reviewed, undefined);
  assert.equal(RV.publicStatus(re.table.people.zz_rev.stances[1]), 'under_review');
  assert.equal(RV.markReviewed(tbl, { pid: 'zz_rev', key: 'climate_action', note: 'x'.repeat(500) }).table.people.zz_rev.stances[0].reviewed.note.length, RV.NOTE_MAX);
});
t('publicStatus in the core and rowStatus on the page follow the same rule', async () => {
  const { api } = await render('zz_rev', fixture());
  const map = { under_review: 'open', cross_checked: 'done', null: '' };
  for (const r of [...fixture().people.zz_rev.stances, ...fixture().people.zz_rev.mappings]) assert.equal(api.rowStatus(r), map[RV.publicStatus(r)]);
  assert.equal(api.STATUS.open, RV.STATUS_LABELS.under_review);
  assert.equal(api.STATUS.done, RV.STATUS_LABELS.cross_checked);
});
t('a later second-check pass leaves a reviewed row as it is', async () => {
  const marked = RV.markReviewed(RV.markReviewed(fixture(), { pid: 'zz_rev', key: 'climate_action', at: '2026-11-12' }).table, { pid: 'zz_rev', row: 'bill_match', key: 'voting_access', at: '2026-11-12' }).table;
  const disagree = async () => JSON.stringify({ label: 'oppose', reason: 'x' });
  for (const force of [false, true]) {
    const { table: out } = await V.verifyTable(structuredClone(marked), { askModel: disagree, force, now: () => new Date('2026-11-13T00:00:00Z') });
    assert.deepEqual(out.people.zz_rev.stances[0], marked.people.zz_rev.stances[0], `stance, force=${force}`);
    assert.deepEqual(out.people.zz_rev.mappings[0], marked.people.zz_rev.mappings[0], `bill match (Congress mismatch), force=${force}`);
    assert.equal(out.people.zz_rev.stances[3].needs_review, true, 'an unreviewed row is still checked');
  }
});
t('the review script marks a row on the committed table (dry run) and lists the queue', () => {
  const list = execFileSync(process.execPath, [path.join(root, 'scripts/review-dirkey-auto.mjs'), '--list'], { encoding: 'utf8' });
  const queue = V.reviewQueue(auto);
  assert.equal(list.trim().split('\n').filter(Boolean).length, queue.length);
  const first = queue.find((q) => q.row === 'stance');
  if (!first) return;
  const before = R('person-directional-keys-auto.json');
  const out = execFileSync(process.execPath, [path.join(root, 'scripts/review-dirkey-auto.mjs'), '--pid', first.politician_id, '--key', first.key, '--note', 'checked', '--dry-run'], { encoding: 'utf8' });
  assert.match(out, /marked reviewed \(dry run\)/);
  assert.equal(R('person-directional-keys-auto.json'), before, 'a dry run writes nothing');
});
t('no new precached file, no migration: the page module is fetched at runtime', () => {
  const sw = R('sw.js');
  for (const f of ['person-directional-keys.js', 'person-directional-keys-auto.json']) assert.ok(!sw.includes(`'/${f}'`), f);
});

let failures = 0;
for (const [name, fn] of tests) {
  try { await fn(); console.log('  ✓', name); } catch (e) { failures++; console.error('  ✗', name, '\n    ', e.message); }
}
if (failures) { console.error(`\n${failures} failing`); process.exit(1); }
console.log('\ndirkey review labels: all checks pass');
