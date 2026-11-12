#!/usr/bin/env node
// test-dirkey-verify.mjs — the second-model check on the automatic
// directional-key rows (netlify/lib/dirkey-verify-core.mjs,
// scripts/verify-dirkey-auto.mjs).
//   · rows below 0.85, lone R8 stated positions, agency/committee homepages and
//     "no clear position" rows with a bill match all receive a second label;
//   · 0.85+ rows backed by three or more consistent statements skip it;
//   · a disagreement is tagged needs_review and leads the review queue; an
//     agreement is left as it was; the row's own read never changes;
//   · a bill match whose Congress does not match the year cited is tagged;
//   · the person-page section and its disclosure render the same with or
//     without the internal results, apart from the per-row "Under review"
//     label on a tagged row;
//   · a row marked reviewed is not re-tagged by a later pass;
//   · the generator runs the check before it writes.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import * as V from '../netlify/lib/dirkey-verify-core.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const main = JSON.parse(R('person-directional-keys.json'));
const auto = JSON.parse(R('person-directional-keys-auto.json'));
const tests = [];
const t = (name, fn) => tests.push([name, fn]);
const NOW = () => new Date('2026-11-12T12:00:00.000Z');

// ── Fixtures ─────────────────────────────────────────────────────────────────
const SRC = { type: 'Campaign site', link: 'https://example-candidate.com/issues/border' };
const row = (o = {}) => ({ key: 'border_security', position: 'support', confidence: 0.8, reason: '2 clear medium-weight statement(s) for support; 0 implication(s) for support at medium weight (R6)', record: 'first-party page linked on the site, read automatically', quote: 'We must finish the wall.', sources: [SRC], tag: { source: 'auto' }, ...o });
const STRONG = row({ key: 'healthcare', confidence: 0.85, reason: '4 clear medium-weight statement(s) for support; 0 implication(s) for support at medium weight (R6); ≥3 consistent raise confidence (R4)' });
const LOW = row({ key: 'climate_action', confidence: 0.7, reason: '1 implication(s) for support at medium weight (R6)' });
const R8 = row({ key: 'veterans', confidence: 0.85, reason: '1 clear medium-weight statement(s) for support; 0 implication(s) for support at medium weight (R6); explicit claim on a primary source reads as a stated position (R8)' });
const HOME = row({ key: 'econ_workers', confidence: 0.85, reason: '3 clear medium-weight statement(s) for support; (R4)', sources: [{ type: 'Agency', link: 'https://www.dol.gov/' }] });
const NCP = row({ key: 'voting_access', position: 'no clear position', confidence: 0, reason: 'topic not found in source', quote: undefined });
const BILL_BAD = { key: 'voting_access', bill: 'H.R. 1', congress: 119, confidence: 'high', basis: 'bill number + subject words in the text', justification: 'voting against H.R. 1, the For the People Act of 2021', source: SRC, tag: { source: 'auto' } };
const BILL_OK = { key: 'cut_spending', bill: 'H.R. 4', congress: 119, confidence: 'medium', basis: 'x', justification: 'the Rescissions Act of 2025', source: SRC, tag: { source: 'auto' } };
const BILL_NOYEAR = { key: 'voting_access', bill: 'H.R. 5746', congress: 119, confidence: 'high', basis: 'x', justification: 'opposing H.R. 5746. Since 2019 we have fought this.', source: SRC, tag: { source: 'auto' } };
const table = () => ({
  keys: main.keys,
  people: {
    zz_a: { tag: { source: 'auto', run: 'r' }, mappings: [structuredClone(BILL_BAD)], stances: [structuredClone(STRONG), structuredClone(LOW), structuredClone(NCP)] },
    zz_b: { tag: { source: 'auto', run: 'r' }, mappings: [structuredClone(BILL_OK), structuredClone(BILL_NOYEAR)], stances: [structuredClone(R8), structuredClone(HOME)] },
  },
});
// A fake second model: answers from a map keyed by issue, and counts its calls.
const asker = (answers) => { const calls = []; const fn = async (prompt) => { const key = Object.keys(answers).find((k) => prompt.includes(`Issue: ${main.keys[k]?.label || k}`)); calls.push(key); return JSON.stringify({ label: answers[key], reason: 'test' }); }; fn.calls = calls; return fn; };

// ── Selection ────────────────────────────────────────────────────────────────
t('rows below 0.85, lone R8 reads, agency/committee homepages and no-position rows with a bill each carry a risk reason', () => {
  assert.deepEqual(V.riskReasons(LOW), ['low_confidence']);
  assert.deepEqual(V.riskReasons(R8), ['single_stated']);
  assert.deepEqual(V.riskReasons(HOME), ['homepage']);
  assert.deepEqual(V.riskReasons(NCP, { mappings: [BILL_BAD] }), ['low_confidence', 'no_position_with_bill']);
  assert.ok(!V.riskReasons(NCP, { mappings: [] }).includes('no_position_with_bill'));
  for (const u of ['https://www.va.gov/', 'https://www.dol.gov/', 'https://www.agriculture.senate.gov/', 'https://oversight.house.gov/']) assert.ok(V.isAgencyOrCommitteeHomepage(u), u);
  for (const u of ['https://www.boozman.senate.gov/public/index.cfm/2026/2/x', 'https://ag.nv.gov/News/Press_Releases/', 'https://electawessman.com/', 'not a url']) assert.ok(!V.isAgencyOrCommitteeHomepage(u), u);
});
t('a 0.85+ row backed by three or more consistent statements may skip the check', () => {
  assert.deepEqual(V.riskReasons(STRONG), []);
  assert.ok(V.canSkip(STRONG));
  for (const r of [LOW, R8, HOME]) assert.ok(!V.canSkip(r));
});

// ── The pass ─────────────────────────────────────────────────────────────────
t('every risky row gets a second-pass result; the 0.85+ multi-statement row is never sent', async () => {
  const ask = asker({ climate_action: 'support', voting_access: 'no clear position', veterans: 'support', econ_workers: 'support' });
  const { table: out, summary } = await V.verifyTable(table(), { askModel: ask, model: 'm', now: NOW });
  assert.equal(ask.calls.length, 4);
  assert.ok(!ask.calls.includes('healthcare'));
  const all = Object.values(out.people).flatMap((p) => p.stances);
  for (const s of all) {
    if (s.key === 'healthcare') { assert.equal(s.verify, undefined); assert.equal(s.needs_review, undefined); continue; }
    assert.equal(s.verify.version, V.VERIFY_VERSION);
    assert.ok(V.LABELS.includes(s.verify.second_label));
    assert.equal(s.verify.scorer_label, s.position);
    assert.equal(s.verify.agree, true);
    assert.equal(s.needs_review, undefined);
    assert.ok(s.verify.risks.length);
  }
  assert.deepEqual({ rows: summary.rows, checked: summary.checked, skipped: summary.skipped, agreed: summary.agreed, disagreed: summary.disagreed }, { rows: 5, checked: 4, skipped: 1, agreed: 4, disagreed: 0 });
});
t('a disagreement is tagged needs_review, leads the review queue, and the row itself is unchanged and stays live', async () => {
  const before = table();
  const ask = asker({ climate_action: 'no clear position', voting_access: 'oppose', veterans: 'support', econ_workers: 'no clear position' });
  const { table: out, summary } = await V.verifyTable(before, { askModel: ask, now: NOW });
  const a = out.people.zz_a.stances, b = out.people.zz_b.stances;
  const low = a.find((s) => s.key === 'climate_action');
  assert.equal(low.needs_review, true);
  assert.deepEqual([low.verify.scorer_label, low.verify.second_label, low.verify.agree], ['support', 'no clear position', false]);
  assert.equal(a.find((s) => s.key === 'voting_access').needs_review, true);
  assert.equal(b.find((s) => s.key === 'econ_workers').needs_review, true);
  assert.equal(b.find((s) => s.key === 'veterans').needs_review, undefined);
  // The public read is untouched, and no row was dropped or added.
  for (const [pid, p] of Object.entries(before.people)) {
    assert.equal(out.people[pid].stances.length, p.stances.length);
    assert.equal(out.people[pid].mappings.length, p.mappings.length);
    p.stances.forEach((s, i) => { const o = out.people[pid].stances[i]; for (const f of ['key', 'position', 'confidence', 'quote', 'sources', 'reason', 'tag']) assert.deepEqual(o[f], s[f], `${pid} ${s.key} ${f}`); });
  }
  assert.equal(summary.disagreed, 3);
  const q = out.verify.review_queue;
  assert.deepEqual(q.filter((x) => x.row === 'stance').map((x) => `${x.politician_id}:${x.key}`), ['zz_a:climate_action', 'zz_a:voting_access', 'zz_b:econ_workers']);
  assert.equal(q[q.length - 1].row, 'bill_match', 'stance disagreements come first');
  assert.equal(out.verify.tagged_for_review, q.length);
});
t('a model that fails or answers off the four labels leaves the row unverified for the next run', async () => {
  for (const askModel of [async () => { throw new Error('down'); }, async () => 'I think they like it', async () => '{"label":"strongly support"}']) {
    const { table: out, summary } = await V.verifyTable(table(), { askModel, now: NOW });
    for (const s of Object.values(out.people).flatMap((p) => p.stances)) { assert.equal(s.verify, undefined); assert.equal(s.needs_review, undefined); }
    assert.equal(summary.errors, 4);
    assert.equal(summary.checked, 0);
  }
  assert.deepEqual(V.parseLabel('```json\n{"label":"Mixed","reason":"both"}\n```'), { label: 'mixed', reason: 'both' });
});
t('rows already checked are not sent again unless forced', async () => {
  const first = (await V.verifyTable(table(), { askModel: asker({ climate_action: 'support', voting_access: 'oppose', veterans: 'support', econ_workers: 'support' }), now: NOW })).table;
  const ask = asker({ climate_action: 'oppose' });
  const again = await V.verifyTable(first, { askModel: ask, now: NOW });
  assert.equal(ask.calls.length, 0);
  assert.equal(again.summary.already, 4);
  assert.deepEqual(again.table.people, first.people);
  const forced = await V.verifyTable(first, { askModel: asker({ climate_action: 'support', voting_access: 'no clear position', veterans: 'support', econ_workers: 'support' }), force: true, now: NOW });
  assert.equal(forced.summary.checked, 4);
  assert.equal(forced.table.people.zz_a.stances.find((s) => s.key === 'voting_access').needs_review, undefined, 'a forced re-check that now agrees clears the tag');
});
t('the prompt carries the quote, the page context, the key and the bill matches, framed as data', () => {
  const p = V.buildPrompt({ pid: 'zz_a', row: NCP, keyMeta: main.keys.voting_access, person: { mappings: [BILL_BAD] }, context: 'He voted no.' });
  assert.match(p, /<data>[\s\S]*<\/data>/);
  assert.ok(p.includes(main.keys.voting_access.pos) && p.includes('He voted no.') && p.includes('For the People Act of 2021') && p.includes(SRC.link));
  for (const l of V.LABELS) assert.ok(p.includes(l));
  assert.equal(V.contextAround(['Intro sentence here.', 'We must finish the wall now.', 'Then deport them.'], 'We must finish the wall…'), 'Intro sentence here. We must finish the wall now. Then deport them.');
});

// ── Congress / year ──────────────────────────────────────────────────────────
t('a bill match whose Congress does not match the year cited in the source is tagged for review', async () => {
  assert.equal(V.congressForYear(2021), 117);
  assert.equal(V.congressForYear(2025), 119);
  assert.equal(V.congressForYear(2026), 119);
  assert.deepEqual(V.congressCheck(BILL_BAD), { ok: false, recorded: 119, cited: [117] });
  assert.equal(V.congressCheck(BILL_OK).ok, true);
  assert.equal(V.congressCheck(BILL_NOYEAR).ok, null, 'a stray year is not a citation');
  assert.deepEqual(V.citedCongresses('H.R. 1 (2021)', 'H.R. 1'), [117]);
  assert.deepEqual(V.citedCongresses('in the 118th Congress'), [118]);
  const { table: out, summary } = await V.verifyTable(table(), { askModel: asker({ climate_action: 'support', voting_access: 'no clear position', veterans: 'support', econ_workers: 'support' }), now: NOW });
  const bad = out.people.zz_a.mappings[0];
  assert.equal(bad.needs_review, true);
  assert.deepEqual(bad.verify.congress_check, { recorded: 119, cited: [117], ok: false });
  for (const m of out.people.zz_b.mappings) { assert.equal(m.needs_review, undefined); assert.equal(m.verify, undefined); }
  assert.equal(summary.congress_mismatch, 1);
  assert.deepEqual(out.verify.review_queue, [{ politician_id: 'zz_a', row: 'bill_match', key: 'voting_access', bill: 'H.R. 1', recorded_congress: 119, cited_congress: [117] }]);
});

// ── Person page ──────────────────────────────────────────────────────────────
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
async function render(pid, autoTable) {
  const body = el('div'); body.id = 'modal-body';
  body.appendChild(el('div', 'pdxsp-stage pdxsp-stage-explore'));
  const head = el('head');
  const document = { readyState: 'complete', head, body, documentElement: head, getElementById: (id) => (id === 'modal-body' ? body : find(head, `#${id}`)), createElement: (tag) => el(tag), addEventListener() {} };
  const fetch = async (url) => (url === '/person-directional-keys.json' ? { ok: true, json: async () => main } : url === '/person-directional-keys-auto.json' ? { ok: true, json: async () => autoTable } : { ok: false });
  const ctx = { window: { _pdxCurrentProfileId: pid }, document, fetch, console, setTimeout };
  ctx.window.window = ctx.window; ctx.window.document = document;
  vm.createContext(ctx);
  vm.runInContext(`var window = this.window; ${R('person-directional-keys.js')}`, ctx);
  for (let i = 0; i < 4; i++) await new Promise((r) => setTimeout(r, 0));
  return { html: find(body, '#pdx-dirkeys')?.innerHTML || '', api: ctx.window.PDXPersonDirectionalKeys };
}
const strip = (tbl) => ({ ...Object.fromEntries(Object.entries(tbl).filter(([k]) => k !== 'verify')), people: Object.fromEntries(Object.entries(tbl.people).map(([pid, p]) => [pid, { ...p, stances: p.stances.map(({ verify, needs_review, ...s }) => s), mappings: p.mappings.map(({ verify, needs_review, ...m }) => m) }])) });
const DISC = 'These bill matches and position reads are generated automatically and may contain errors.';

const unlabel = (h) => h.replace(/ <span class="pdx-dk-st" data-pdx-dirkeys-check="open">Under review<\/span>/g, '');
t('the person-page section and its disclosure render identically with and without the internal results, apart from the per-row Under review label', async () => {
  // Tag every row in the committed table, the worst case for the page.
  const disagreeAll = async () => JSON.stringify({ label: 'mixed', reason: 'x' });
  const tagged = (await V.verifyTable(structuredClone(auto), { askModel: disagreeAll, force: true, now: NOW })).table;
  const plain = strip(tagged);
  for (const pid of Object.keys(auto.people)) {
    const a = await render(pid, plain), b = await render(pid, tagged);
    assert.equal(unlabel(b.html), a.html, pid);
    assert.ok(a.html, pid);
    assert.ok(!a.html.includes('pdx-dk-st'), `${pid}: untagged rows carry no label`);
    const tags = [...tagged.people[pid].stances, ...tagged.people[pid].mappings].filter((r) => r.needs_review).length;
    assert.equal(b.html.split('Under review').length - 1, tags, `${pid}: one label per tagged row`);
    assert.equal(b.html.split(DISC).length - 1, 1, `${pid}: one disclosure`);
    assert.ok(b.html.includes('Flag a problem'), pid);
    assert.ok(!/needs[_ ]review|second[_ ]label|verify|agree|reviewed_at/i.test(b.html), `${pid}: no internal field shows`);
  }
  const { api } = await render(Object.keys(auto.people)[0], tagged);
  assert.equal(api.DISCLOSURE, DISC);
  const code = R('person-directional-keys.js');
  assert.ok(!/\.verify\b|second_label|second_reason|reviewed\.note|reviewed_at/.test(code), 'the page module never reads the second-check results or the review note/date');
});

// ── Wiring and the committed table ───────────────────────────────────────────
t('the generator runs the second check on the merged table before it writes', () => {
  const src = R('scripts/gen-dirkey-auto.mjs');
  assert.match(src, /import \{ runVerify \} from "\.\/verify-dirkey-auto\.mjs"/);
  const call = src.indexOf('runVerify(nextTable)');
  assert.ok(call > 0 && call < src.indexOf('fs.writeFileSync(AUTO_TABLE'), 'the check runs before the table is written');
  assert.match(R('scripts/verify-dirkey-auto.mjs'), /new Anthropic\(\)/, 'the default AI Gateway client, no key handling');
});
t('the committed table: every risky row carries a second label, disagreements are tagged and queued, skipped rows carry none', () => {
  if (!auto.verify) return; // the check has not run on this table yet
  assert.equal(auto.verify.verify_version, V.VERIFY_VERSION);
  const queued = new Set(auto.verify.review_queue.map((x) => `${x.row}|${x.politician_id}|${x.key}|${x.bill || ''}`));
  let tagged = 0;
  for (const [pid, p] of Object.entries(auto.people)) {
    for (const s of p.stances) {
      const risks = V.riskReasons(s, p);
      if (!risks.length) { assert.equal(s.verify, undefined, `${pid} ${s.key} skipped`); continue; }
      if (!s.verify) { assert.ok(auto.verify.errors > 0, `${pid} ${s.key} has no second label`); continue; }
      assert.ok(V.LABELS.includes(s.verify.second_label));
      assert.equal(s.verify.agree, s.verify.second_label === s.position);
      assert.equal(!!s.needs_review || V.isReviewed(s), !s.verify.agree, `${pid} ${s.key}`);
      if (s.needs_review) { tagged++; assert.ok(queued.has(`stance|${pid}|${s.key}|`), `${pid} ${s.key} queued`); }
    }
    for (const m of p.mappings) {
      assert.equal(!!m.needs_review || V.isReviewed(m), V.congressCheck(m).ok === false, `${pid} ${m.bill || m.name}`);
      if (m.needs_review) { tagged++; assert.ok(queued.has(`bill_match|${pid}|${m.key}|${m.bill || m.name}`)); }
    }
  }
  assert.equal(auto.verify.review_queue.length, tagged);
});

let failures = 0;
for (const [name, fn] of tests) {
  try { await fn(); console.log('  ✓', name); } catch (e) { failures++; console.error('  ✗', name, '\n    ', e.message); }
}
if (failures) { console.error(`\n${failures} failing`); process.exit(1); }
console.log('\ndirkey second check: all checks pass');
