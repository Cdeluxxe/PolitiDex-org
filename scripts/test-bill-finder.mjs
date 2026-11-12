#!/usr/bin/env node
// test-bill-finder.mjs — the shared bill finder (bill-finder-core.mjs) and the
// v1 per-key mapping pattern (bill-key-patterns.mjs, israel_offensive_arms).
//   · bill numbers, URL identities, short titles and descriptive phrases read;
//   · statute references and look-alike programs do not read as bills;
//   · on the ground-truth excerpts the known Sanders and Massie bills are found,
//     only the Israel offensive-arms references map, at the expected confidence;
//   · only one key is mapped; the ground-truth labels and scorer are untouched;
//   · the committed report's ground-truth section is current.
// Offline: no network (the live sweep is in the report script, not here).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import * as F from '../netlify/lib/bill-finder-core.mjs';
import * as K from '../netlify/lib/bill-key-patterns.mjs';
import * as S from '../netlify/lib/stance-score-core.mjs';
import { groundTruthRows, loadCatalog } from './bill-finder-ground-truth-2026-11.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const t = (name, fn) => { try { fn(); console.log('  ✓', name); } catch (e) { failures++; console.error('  ✗', name, '\n    ', e.message); } };
const catalog = loadCatalog();
const find = (text, extra = {}) => F.findBills({ text, ...extra }, { catalog });
const bills = (text, extra) => find(text, extra).candidates.map((c) => c.bill).filter(Boolean);
const gtFile = JSON.parse(fs.readFileSync(path.join(root, 'db/stance-ground-truth-talarico-cost-of-living.json'), 'utf8'));
const GT = groundTruthRows(gtFile, catalog);
const src = (id, type) => GT.find((r) => r.stance_id === id && r.source_type.startsWith(type));

t('bill numbers read in every common form', () => {
  assert.deepEqual(bills('I voted against H.R. 8035 and H R 7691.', { date: '2024-05-01' }), ['H.R. 8035', 'H.R. 7691']);
  assert.deepEqual(bills('He filed S.J.Res. 33, SJRES 26 and S. J. Res. 41 this spring.'), ['S.J.Res. 33', 'S.J.Res. 26', 'S.J.Res. 41']);
  assert.deepEqual(bills('H.Con.Res. 38, H.J.Res. 44, H.Res. 7, S.Res. 9, S.Con.Res. 2, H.Amdt. 478 and S. 1655 are all bills.'),
    ['H.Con.Res. 38', 'H.J.Res. 44', 'H.Res. 7', 'S.Res. 9', 'S.Con.Res. 2', 'H.Amdt. 478', 'S. 1655']);
  assert.deepEqual(find('The House passed SB 2 and HB 1304 last week.').candidates.map((c) => c.id), ['state|SB 2', 'state|HB 1304']);
});
t('look-alikes do not read as bill numbers', () => {
  assert.deepEqual(bills('Made in the U.S. 5 million jobs.'), []);
  assert.deepEqual(bills('It took years. 12 people came.'), []);
  assert.deepEqual(bills('Our HR team grew to 40 people.'), []);
});
t('the page URL names its bill and its Congress', () => {
  assert.deepEqual(F.billFromUrl('https://www.govinfo.gov/content/pkg/BILLS-118sjres111is/html/BILLS-118sjres111is.htm'), { congress: 118, bill: 'S.J.Res. 111' });
  assert.deepEqual(F.billFromUrl('https://www.congress.gov/bill/119th-congress/house-concurrent-resolution/38'), { congress: 119, bill: 'H.Con.Res. 38' });
  assert.equal(F.congressFromUrl('https://www.senate.gov/legislative/LIS/roll_call_votes/vote1182/vote_118_2_00292.xml'), 118);
  assert.equal(F.congressFromUrl('https://clerk.house.gov/evs/2022/roll145.xml'), 117);
  assert.equal(F.congressForDate('2025-01-02'), 118);
  assert.equal(F.congressForDate('2025-01-03'), 119);
});
t('short titles resolve through the catalog (and an unknown "… Act" is still returned)', () => {
  const c = find('Ukraine Security Supplemental Appropriations Act, 2024').candidates;
  assert.equal(c[0].id, '118|H.R. 8035');
  const u = find('We will pass the Medicare for All Act of 2022.').candidates;
  assert.equal(u[0].name, 'Medicare for All Act of 2022');
  assert.equal(u[0].id, null);
});
t('descriptive phrases read; the 1973 statute and look-alike programs do not', () => {
  const p = find('I will vote for the resolution to disapprove the arms sale to Israel.', { date: '2025-03-01', politician_id: 'sanders' }).candidates;
  assert.equal(p.length, 1);
  assert.equal(p[0].kind, 'phrase');
  assert.equal(p[0].family, 'disapproval');
  assert.ok(p[0].resolves_to.some((r) => r.id === '119|S.J.Res. 33'));
  assert.equal(find('My war powers resolution would end this.').candidates[0].family, 'war_powers');
  assert.deepEqual(find('The President must comply with section 5(c) of the War Powers Resolution.').candidates, []);
  assert.deepEqual(find('We protected the Supplemental Nutrition Assistance Program.').candidates, []);
  assert.equal(find('I voted against the Ukraine supplemental.').candidates[0].family, 'supplemental');
});

// ── The per-key pattern (one key) ───────────────────────────────────────────
const map = (text, extra) => K.mapFound(find(text, extra));
t('only israel_offensive_arms has a mapping pattern', () => {
  assert.deepEqual(K.MAPPED_KEYS, ['israel_offensive_arms']);
  assert.equal(K.mapCandidate({ mentions: [] }, 'ukraine_aid').mapped, false);
});
t('confidence: high for number + subject words; medium for number + title subject; low for a phrase', () => {
  assert.equal(map('I voted for S.J.Res. 33 to block the sale of bombs to Israel.', { date: '2025-04-03' }).mappings[0].confidence, 'high');
  assert.equal(map('S.J.Res. 33 · On the Motion to Discharge · Yea', { date: '2025-04-03' }).mappings[0].confidence, 'medium');
  const low = map('These resolutions block offensive weapons for Israel.', { date: '2025-03-01', politician_id: 'sanders' }).mappings[0];
  assert.equal(low.confidence, 'low');
  assert.ok(low.span.includes('offensive weapons'));
});
t('defensive-only and non-Israel bills do not map', () => {
  const d = map('I voted for H.R. 9 to fund Iron Dome interceptors for Israel and its missile defense sales.', { date: '2024-04-20' });
  assert.equal(d.mappings.length, 0);
  assert.match(d.unmapped[0].reason, /israel_defensive_systems/);
  assert.equal(map('I opposed H.R. 8035, the Ukraine supplemental.', { date: '2024-04-20' }).mappings.length, 0);
  assert.equal(map('We will pass the Affordable Care Act fix in S. 12.', { date: '2025-04-20' }).mappings.length, 0);
});

// ── Ground-truth sources ────────────────────────────────────────────────────
t('Sanders: S.J.Res. 111 is found and mapped (resolution text: high; roll call: medium)', () => {
  const text = src('sanders|israel_military_aid|gt-006', 'resolution text');
  assert.deepEqual(text.mappings.map((m) => [m.id, m.key, m.confidence]), [['118|S.J.Res. 111', 'israel_offensive_arms', 'high']]);
  const roll = src('sanders|israel_military_aid|gt-006', 'roll-call');
  assert.deepEqual(roll.mappings.map((m) => [m.id, m.confidence]), [['118|S.J.Res. 111', 'medium']]);
});
t('Sanders: the floor speech phrase resolves to the 2024-11-20 Israel resolutions (low)', () => {
  const m = src('sanders|israel_military_aid|gt-006', 'floor speech').mappings;
  assert.equal(m.length, 1);
  assert.equal(m[0].confidence, 'low');
  assert.deepEqual(m[0].resolves_to.map((r) => r.id), ['118|S.J.Res. 111', '118|S.J.Res. 113', '118|S.J.Res. 115']);
});
t('Sanders: the Feb 2025 release resolves to the spring 2025 resolutions; S.J.Res. 33 is the title best fit (low)', () => {
  const m = src('sanders|israel_military_aid|gt-006', 'official press release').mappings;
  assert.equal(m.length, 1);
  assert.equal(m[0].confidence, 'low');
  assert.ok(m[0].resolves_to.some((r) => r.id === '119|S.J.Res. 33'));
  assert.equal(m[0].best_fit, '119|S.J.Res. 33');
});
t('Massie: H.R. 8035, H.R. 7691 and the Iran war powers resolution H.Con.Res. 38 are found, none mapped', () => {
  const ids = GT.filter((r) => r.politician_id === 'massie').flatMap((r) => r.candidates.map((c) => c.id));
  for (const id of ['118|H.R. 8035', '117|H.R. 7691', '119|H.Con.Res. 38']) assert.ok(ids.includes(id), id);
  assert.equal(GT.filter((r) => r.politician_id === 'massie').flatMap((r) => r.mappings).length, 0);
  const iran = src('massie|iran_hostilities|gt-005', 'resolution text');
  assert.match(iran.unmapped[0].reason, /iran_hostilities/);
});
t('no mapping on any off-key ground-truth record (Talarico, Sanders health care)', () => {
  assert.equal(GT.filter((r) => r.stance_id !== 'sanders|israel_military_aid|gt-006').flatMap((r) => r.mappings).length, 0);
});

// ── Constraints ─────────────────────────────────────────────────────────────
t('ground-truth labels and scorer versions are unchanged', () => {
  const labels = Object.fromEntries([gtFile, ...gtFile.additional_records].map((r) => [r.stance_id, [r.position, r.confidence]]));
  assert.deepEqual(labels, {
    'james_talarico|cost_living|gt-001': ['support', labels['james_talarico|cost_living|gt-001'][1]],
    'massie|ukraine_aid|gt-002': ['oppose', 0.85], 'sanders|healthcare|gt-003': ['support', 0.9],
    'james_talarico|school_choice|gt-004': ['oppose', 0.9], 'massie|iran_hostilities|gt-005': ['support', 0.85],
    'sanders|israel_military_aid|gt-006': ['mixed', 0.75],
  });
  assert.equal(S.RULES_VERSION, 'phase8-v3');
  assert.equal(S.DIRECTIONAL_VOCAB_VERSION, 'issue-vocab-v2-directional');
});
t('the committed report ground-truth section is current', () => {
  const report = JSON.parse(fs.readFileSync(path.join(root, 'db/bill-finder-ground-truth-2026-11.json'), 'utf8'));
  assert.deepEqual(report.ground_truth, JSON.parse(JSON.stringify(GT)), 'run node scripts/bill-finder-ground-truth-2026-11.mjs');
  if (report.routine_sweep) assert.equal(report.summary.sweep_mappings, 0, 'false mapping on a routine sweep page');
});

if (failures) { console.error(`\n${failures} failing`); process.exit(1); }
console.log('\nbill finder: all checks pass');
