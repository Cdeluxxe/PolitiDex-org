#!/usr/bin/env node
// test-bill-finder.mjs — the shared bill finder (bill-finder-core.mjs) and the
// per-key mapping patterns (bill-key-patterns.mjs: israel_offensive_arms,
// ukraine_aid, iran_hostilities, tariffs_china, border_security, and v6:
// energy_production, school_choice, healthcare, cut_spending).
//   · bill numbers, URL identities, short titles and descriptive phrases read;
//   · statute references and look-alike programs do not read as bills;
//   · on the ground-truth excerpts the known Sanders and Massie bills are found,
//     the Israel offensive-arms and Ukraine aid references map to their own key
//     only, at the expected confidence;
//   · tariffs_china and border_security map only their own bills, never a bill
//     of the first three keys, and the first three keys' mappings are unchanged;
//   · the four v6 keys map only their own bills (one bill per sentence; a
//     statute cited in passing is not a measure), never a bill of the first
//     five keys, and the first five keys' mappings are unchanged;
//   · the eight v7 keys (climate_action, gun_safety, pro_choice, voting_access,
//     housing, econ_trade, econ_workers, justice_reform) map only their own
//     bills, never a bill of the first nine keys, nothing on the multi-bill test
//     releases, and the first nine keys' mappings are unchanged;
//   · only the seventeen keys are mapped; the ground-truth labels and scorer are untouched;
//   · every routine-sweep mapping matches the hand review (none false, none unreviewed);
//   · the committed report's ground-truth section is current.
// Offline: no network (the live sweep is in the report script, not here).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import * as F from '../netlify/lib/bill-finder-core.mjs';
import * as K from '../netlify/lib/bill-key-patterns.mjs';
import * as S from '../netlify/lib/stance-score-core.mjs';
import { groundTruthRows, loadCatalog, loadGroundTruth, sweepVerdict } from './bill-finder-ground-truth-2026-11.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const t = (name, fn) => { try { fn(); console.log('  ✓', name); } catch (e) { failures++; console.error('  ✗', name, '\n    ', e.message); } };
const catalog = loadCatalog();
const find = (text, extra = {}) => F.findBills({ text, ...extra }, { catalog });
const bills = (text, extra) => find(text, extra).candidates.map((c) => c.bill).filter(Boolean);
const gtFile = JSON.parse(fs.readFileSync(path.join(root, 'db/stance-ground-truth-talarico-cost-of-living.json'), 'utf8'));
const GT = groundTruthRows(loadGroundTruth(), catalog);
const GT_ORIGINAL = groundTruthRows(gtFile, catalog);
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

// ── The per-key patterns (five keys) ────────────────────────────────────────────
const map = (text, extra) => K.mapFound(find(text, extra));
const V6 = ['energy_production', 'school_choice', 'healthcare', 'cut_spending'];
const V7 = ['climate_action', 'gun_safety', 'pro_choice', 'voting_access', 'housing', 'econ_trade', 'econ_workers', 'justice_reform'];
// Third-pass records whose source names a bill the v7 keys map.
const V7_MAPPED = ['lujan|climate_action|gt-026', 'hickenlooper|climate_action|gt-027', 'robert_garcia|climate_action|gt-028', 'boebert|gun_safety|gt-029',
  'fitzpatrick|gun_safety|gt-031', 'dina_titus|pro_choice|gt-033', 'diana_degette|pro_choice|gt-034', 'mike_flood|pro_choice|gt-035', 'mike_simpson|pro_choice|gt-036',
  'emmer|voting_access|gt-037', 'stephanie_bice|voting_access|gt-038', 'tom_cole|voting_access|gt-039', 'adam_smith|voting_access|gt-040', 'haley_stevens|voting_access|gt-041',
  'aguilar|housing|gt-043', 'ayanna_pressley|housing|gt-044', 'jared_golden|econ_workers|gt-046', 'brendan_boyle|econ_workers|gt-047', 'casar|econ_workers|gt-048',
  'bobby_scott|justice_reform|gt-049', 'nadler|justice_reform|gt-050', 'walberg|econ_trade|gt-051', 'neal|econ_trade|gt-052', 'steven_horsford|econ_trade|gt-053'];
t('only the seventeen keys have a mapping pattern (the first five, the four v6 keys and the eight v7 keys)', () => {
  assert.deepEqual(K.MAPPED_KEYS, ['israel_offensive_arms', 'ukraine_aid', 'iran_hostilities', 'tariffs_china', 'border_security', ...V6, ...V7]);
  assert.deepEqual(K.FIRST_NINE_KEYS, K.MAPPED_KEYS.slice(0, 9));
  assert.equal(K.PATTERNS_VERSION, 'bill-key-patterns-v7');
  assert.equal(F.FINDER_VERSION, 'bill-finder-v3');
  assert.equal(K.mapCandidate({ mentions: [] }, 'deportations').mapped, false);
  assert.equal(K.mapCandidate({ mentions: [] }, 'israel_military_aid').mapped, false);
  assert.equal(K.mapCandidate({ mentions: [] }, 'israel_defensive_systems').mapped, false);
});
t('ukraine_aid: aid, funding and supplementals map; Ukraine without an aid word does not', () => {
  const keyed = (text, extra) => map(text, extra).mappings.map((m) => [m.key, m.confidence]);
  assert.deepEqual(keyed('I voted against H.R. 8035, more military aid to Ukraine.', { date: '2024-04-20' }), [['ukraine_aid', 'high']]);
  assert.deepEqual(keyed('H.R. 8035 · On Passage · Nay', { date: '2024-04-20' }), [['ukraine_aid', 'medium']]);
  assert.deepEqual(keyed('I opposed the Ukraine Security Supplemental Appropriations Act, 2024.'), [['ukraine_aid', 'medium']]);
  assert.deepEqual(keyed('I will vote for S. 4 to condemn Russia and honor the people of Ukraine.', { date: '2025-02-24' }), []);
  assert.deepEqual(keyed('I voted for S.J.Res. 33 to block the sale of bombs to Israel.', { date: '2025-04-03' }), [['israel_offensive_arms', 'high']]);
});
t('an uncatalogued short title in the same sentence as one bill number folds into that bill', () => {
  const c = find('H R 7691 · On Passage · Additional Ukraine Supplemental Appropriations Act, 2022 · Nay', { date: '2022-05-10' }).candidates;
  assert.equal(c.length, 1);
  assert.equal(c[0].id, '117|H.R. 7691');
  assert.deepEqual(c[0].mentions.map((m) => m.kind), ['number', 'short_title']);
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
  assert.deepEqual(map('I opposed H.R. 8035, the Ukraine supplemental.', { date: '2024-04-20' }).mappings.map((m) => m.key), ['ukraine_aid']);
  assert.equal(map('We will pass the Affordable Care Act fix in S. 12.', { date: '2025-04-20' }).mappings.length, 0);
});

// ── Document scope (one speech / release / bill is one scope) ───────────────
const doc = (body, extra = {}) => K.mapFound(F.findBills({ body, url: 'https://example.com/remarks', date: '2024-04-20', source_type: 'speech', ...extra }, { catalog }));
const keyed = (r) => r.mappings.map((m) => [m.bill, m.key, m.confidence]);
t('scope: in a speech the bill number and the subject words combine across paragraphs (same idea)', () => {
  const body = '<p>Today I voted against H.R. 8035.</p><p>It was a long debate on the floor.</p><p>Sending more military aid to Ukraine is wrong.</p>';
  assert.deepEqual(keyed(doc(body)), [['H.R. 8035', 'ukraine_aid', 'high']]);
  // On a campaign issue page (paragraph scope) the same text reads as before: the subject comes from the title.
  assert.deepEqual(keyed(doc(body, { source_type: 'campaign issue page' })), [['H.R. 8035', 'ukraine_aid', 'high']]);
  const far = '<p>Today I voted against H.R. 8035.</p><p>It was long.</p><p>It was late.</p><p>Sending more military aid to Ukraine is wrong.</p>';
  assert.deepEqual(keyed(doc(far)), [['H.R. 8035', 'ukraine_aid', 'high']]);
  assert.deepEqual(keyed(doc(far, { source_type: 'campaign issue page' })), [['H.R. 8035', 'ukraine_aid', 'medium']]);
});
t('scope: a clear change splits — a transition or a different bill keeps the next subject off the first bill', () => {
  const tr = '<p>Today I voted against H.R. 8035.</p><p>Now let me turn to Israel.</p><p>We must block offensive weapons sales to Israel.</p>';
  assert.deepEqual(keyed(doc(tr)), [['H.R. 8035', 'ukraine_aid', 'medium']]);
  const other = '<p>I voted for H.R. 8035 to send aid to Ukraine.</p><p>I also voted against H.R. 8034.</p><p>We must block offensive weapons sales to Israel.</p>';
  const r = doc(other);
  assert.deepEqual(r.mappings.filter((m) => m.bill === 'H.R. 8035').map((m) => m.key), ['ukraine_aid']);
  // Two subjects in one speech with no link back to the bill stay apart.
  const two = '<p>I voted against H.R. 8035, the Ukraine supplemental.</p><p>We must also block offensive weapons sales to Israel.</p>';
  assert.deepEqual(keyed(doc(two)), [['H.R. 8035', 'ukraine_aid', 'high']]);
});
t('scope: distinct provisions of one package map independently (Ukraine aid vs. Israel defensive vs. offensive)', () => {
  const pkg = (israel) => `<p>I voted for H.R. 815.</p><p>The package sends $61 billion in security assistance to Ukraine.</p><p>It also provides ${israel}</p>`;
  assert.deepEqual(keyed(doc(pkg('$4 billion for Iron Dome and David’s Sling missile defense in Israel.'))), [['H.R. 815', 'ukraine_aid', 'high']]);
  const both = doc(pkg('offensive munitions and 2,000-pound bombs for Israel.'));
  assert.deepEqual(keyed(both).map((x) => x.slice(0, 2)).sort(), [['H.R. 815', 'israel_offensive_arms'], ['H.R. 815', 'ukraine_aid']]);
  const ukr = both.mappings.find((m) => m.key === 'ukraine_aid'), isr = both.mappings.find((m) => m.key === 'israel_offensive_arms');
  assert.ok(!ukr.span.includes('Israel') && !isr.span.includes('Ukraine'), 'each key justifies from its own provision');
  // Offensive and defensive passages in one speech: only the offensive one feeds the offensive key.
  const mix = doc('<p>I voted for S.J.Res. 33 because these bombs for Israel kill civilians.</p><p>I will always fund Iron Dome for Israel.</p>', { date: '2025-04-03' });
  assert.equal(mix.mappings.length, 1);
  assert.ok(!mix.mappings[0].span.includes('Iron Dome'));
});
t('scope: a bill-text page is one scope — every provision belongs to the bill', () => {
  const body = '<p>Making emergency supplemental appropriations for the fiscal year ending September 30, 2024.</p><p>Mr. Cole introduced the following bill.</p><p>For assistance to Ukraine, $13,000,000,000.</p><p>For the Iron Dome defense system for Israel, $4,000,000,000.</p>';
  const r = K.mapFound(F.findBills({ body, url: 'https://www.govinfo.gov/content/pkg/BILLS-118hr815eah/html/BILLS-118hr815eah.htm', source_type: 'bill text' }, { catalog }));
  assert.deepEqual(keyed(r), [['H.R. 815', 'ukraine_aid', 'high']]);
  assert.ok(!r.mappings.some((m) => m.key === 'israel_offensive_arms'), 'the Iron Dome provision is defensive only');
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
t('Massie: H.R. 8035 and H.R. 7691 (Additional Ukraine Supplemental) map to ukraine_aid, high', () => {
  const m = GT.filter((r) => r.stance_id === 'massie|ukraine_aid|gt-002').flatMap((r) => r.mappings);
  assert.deepEqual(m.map((x) => [x.id, x.key, x.confidence]), [['118|H.R. 8035', 'ukraine_aid', 'high'], ['117|H.R. 7691', 'ukraine_aid', 'high']]);
  assert.ok(m[1].span.includes('Additional Ukraine Supplemental Appropriations Act, 2022'));
});
t('Massie: the Iran war powers resolution H.Con.Res. 38 maps to iran_hostilities only, high', () => {
  const iran = src('massie|iran_hostilities|gt-005', 'resolution text');
  assert.deepEqual(iran.mappings.map((m) => [m.id, m.key, m.confidence]), [['119|H.Con.Res. 38', 'iran_hostilities', 'high']]);
  assert.match(iran.mappings[0].span, /remove United States Armed Forces from unauthorized hostilities in the Islamic Republic of Iran/);
});
t('each subject maps only to its own key (Israel, Ukraine, Iran)', () => {
  const all = GT.flatMap((r) => r.mappings.map((m) => [r.stance_id, m.key]));
  for (const [id, key] of all) {
    if (id.startsWith('sanders|israel')) assert.equal(key, 'israel_offensive_arms', id);
    if (id.startsWith('massie|ukraine')) assert.equal(key, 'ukraine_aid', id);
    if (id.startsWith('massie|iran')) assert.equal(key, 'iran_hostilities', id);
  }
});
t('iran_hostilities: war powers, removal and authorization measures map; Iran without a hostilities word does not', () => {
  const keyed = (text, extra) => map(text, extra).mappings.map((m) => [m.key, m.confidence]);
  assert.deepEqual(keyed('I voted for S.J.Res. 59 to end unauthorized hostilities against Iran.', { date: '2025-06-27' }), [['iran_hostilities', 'high']]);
  assert.deepEqual(keyed('S.J.Res. 59 · On the Joint Resolution · Yea', { date: '2025-06-27' }), [['iran_hostilities', 'medium']]);
  assert.deepEqual(keyed('My war powers resolution would stop a war with Iran.', { date: '2025-06-17' }).map((x) => x[0]), ['iran_hostilities']);
  assert.deepEqual(keyed('I cosponsored H.R. 77 to tighten sanctions on Iran.', { date: '2025-06-17' }), []);
  // Israel and Ukraine bills stay off the Iran key, even when Iran is named nearby.
  assert.deepEqual(keyed('I voted for S.J.Res. 33 to block the sale of bombs to Israel.', { date: '2025-04-03' }), [['israel_offensive_arms', 'high']]);
  assert.deepEqual(keyed('I voted against H.R. 8035, more military aid to Ukraine.', { date: '2024-04-20' }), [['ukraine_aid', 'high']]);
  assert.deepEqual(keyed('H.R. 8034 replenishes Iron Dome interceptors that shield Israel from Iranian missiles.', { date: '2024-04-20' }), []);
});
t('no mapping on any off-key or bill-less ground-truth record', () => {
  const keyed = ['sanders|israel_military_aid|gt-006', 'massie|ukraine_aid|gt-002', 'massie|iran_hostilities|gt-005', 'owens|ukraine_aid|gt-007', 'michael_guest|border_security|gt-009',
    'french_hill|cut_spending|gt-012', 'frank_lucas|cut_spending|gt-014', 'mariannette_miller_meeks|cut_spending|gt-015', 'bennie_thompson|healthcare|gt-016',
    'cruz|school_choice|gt-017', 'aoc|healthcare|gt-018', 'jason_smith|cut_spending|gt-024', ...V7_MAPPED];
  assert.deepEqual(GT.filter((r) => !keyed.includes(r.stance_id)).flatMap((r) => r.mappings.map((m) => `${r.stance_id} ${m.bill ?? m.matched}`)), []);
});
t('every ground-truth mapping is on its record’s own key (or, for Sanders, the pattern child of it)', () => {
  for (const r of GT) for (const m of r.mappings) assert.equal(m.key, r.topic === 'israel_military_aid' ? 'israel_offensive_arms' : r.topic, `${r.stance_id} ${m.bill ?? m.matched} → ${m.key}`);
});

// ── tariffs_china and border_security (v5, document idea) ──────────────────
t('tariffs_china: tariff and trade-remedy measures on China map; China without a trade word does not', () => {
  const keyed = (text, extra) => map(text, extra).mappings.map((m) => [m.key, m.confidence]);
  assert.deepEqual(keyed('I voted for H.R. 9100 to raise tariffs on Chinese steel and aluminum.', { date: '2025-05-01' }), [['tariffs_china', 'high']]);
  assert.deepEqual(keyed('I cosponsored S. 410 to end permanent normal trade relations with the People’s Republic of China.', { date: '2025-05-01' }), [['tariffs_china', 'high']]);
  assert.deepEqual(keyed('I voted for H.R. 9100 to restrict Chinese access to American chips.', { date: '2025-05-01' }), []);
  assert.deepEqual(keyed('I voted for H.R. 9100. It sets new tariffs on imports.', { date: '2025-05-01' }).filter(([k]) => k === 'tariffs_china'), [], 'no China subject');
  // A China line inside a Ukraine aid statement stays with the Ukraine bill.
  assert.deepEqual(keyed('I voted yes on H.R. 7691 to deliver aid to Ukraine. Adversaries like China are watching our trade and our strength.', { date: '2022-05-10' }), [['ukraine_aid', 'high']]);
});
t('border_security: border enforcement measures map; "cross-border" and the border without an enforcement word do not', () => {
  const keyed = (text, extra) => map(text, extra).mappings.map((m) => [m.bill, m.key, m.confidence]);
  assert.deepEqual(keyed('I voted for H.R. 2 – Secure the Border Act of 2023.', { date: '2023-05-12' }), [['H.R. 2', 'border_security', 'high']]);
  // A short title with the subject words in the text: medium. A bare roll-call line for a bill not in the catalog: no subject, no map.
  assert.deepEqual(keyed('I voted for the Secure the Border Act of 2023 to build the wall.', { date: '2023-05-12' }), [[null, 'border_security', 'medium']]);
  assert.deepEqual(keyed('H.R. 2 · On Passage · Yea', { date: '2023-05-11' }), []);
  assert.deepEqual(keyed('My bill, H.R. 5100, would streamline cross-border energy projects and secure our grid.', { date: '2025-05-01' }), []);
  assert.deepEqual(keyed('I voted for H.R. 5100 to rename a post office near the border.', { date: '2025-05-01' }), []);
});
t('the new keys never map a bill of the first three keys, even with a border or China line nearby', () => {
  const keys = (text, extra) => map(text, extra).mappings.map((m) => m.key).sort();
  assert.deepEqual(keys('I voted against H.R. 8035. We should secure our own border before we send more aid to Ukraine.', { date: '2024-04-20' }), ['ukraine_aid']);
  assert.deepEqual(keys('I voted for S.J.Res. 33 to block the sale of bombs to Israel, made with parts and tariffs on China in mind.', { date: '2025-04-03' }), ['israel_offensive_arms']);
  assert.deepEqual(keys('I voted for H.Con.Res. 38 to end hostilities with Iran. Iran’s oil goes to China, and its proxies cross every border.', { date: '2025-06-17' }), ['iran_hostilities']);
  // Every candidate in the six locked records' sources: the new keys map none of them.
  for (const r of GT_ORIGINAL) for (const m of r.mappings) assert.ok(!['tariffs_china', 'border_security'].includes(m.key), `${r.stance_id} ${m.bill}`);
});
t('a release covering several bills maps each to its own key (Miller-Meeks, April 2024: border bills, Israel, Ukraine, Indo-Pacific)', () => {
  // Verbatim sentences from millermeeks.house.gov (statement on votes to secure the southern border, 2024-04-20).
  const body = ['<h1>Rep. Miller-Meeks Statement on Votes to Secure Southern Border, Support U.S. National Security</h1>',
    '<p>“I urge the Senate and President Biden to take immediate action to pass H.R. 2 and secure the southern border to stop the flow of illegal immigration, people on terrorist watch list, and fentanyl. Border security is national security.</p>',
    '<p>End the Border Catastrophe Act</p><p>Forces the Biden Administration to restart construction of the border wall.</p><p>Ends catch and release.</p>',
    '<p>Israel Security Supplemental Appropriations Act</p><p>$26.38 billion to support Israel in its effort to defend itself against Iran and its proxies, and to reimburse U.S. military operations in response to recent attacks.</p>',
    '<p>Ukraine Security Supplemental Appropriations Act</p><p>$60.84 billion to address the conflict in Ukraine and assist our regional partners as they counter Russia, $23.2 billion of which will be used for replenishment of U.S. weapons, stocks, and facilities.</p>',
    '<p>Indo-Pacific Security Supplemental Appropriations Act</p><p>$8.12 billion to continue efforts to counter communist China and ensure a strong deterrence in the region.</p>',
    '<p>Issues : Border Security</p>'].join('');
  const r = doc(body, { source_type: 'official press release' });
  const got = r.mappings.map((m) => [m.bill || m.matched, m.key]);
  assert.deepEqual(got.filter(([b]) => b === 'H.R. 2'), [['H.R. 2', 'border_security']]);
  assert.deepEqual(got.filter(([b]) => b === 'H.R. 8035'), [['H.R. 8035', 'ukraine_aid']], 'the Ukraine bill is not a border bill');
  assert.ok(got.some(([b, k]) => /End the Border Catastrophe Act/.test(b) && k === 'border_security'));
  const NEW = ['tariffs_china', 'border_security'];
  assert.ok(!got.some(([b, k]) => /Indo-Pacific/.test(b) && NEW.includes(k)), 'the Indo-Pacific bill is not a China-tariff or border bill (no tariff word; the tag line is not evidence)');
  assert.ok(!got.some(([b, k]) => /Israel Security/.test(b) && NEW.includes(k)), 'the Israel bill is not a border bill');
});
t('expansion records: Owens H.R. 7691 → ukraine_aid (high); Guest H.R. 2 → border_security (high), each on its own key only', () => {
  const o = GT.filter((r) => r.stance_id === 'owens|ukraine_aid|gt-007').flatMap((r) => r.mappings);
  assert.deepEqual(o.map((m) => [m.id, m.key, m.confidence]), [['117|H.R. 7691', 'ukraine_aid', 'high']]);
  const g = GT.filter((r) => r.stance_id === 'michael_guest|border_security|gt-009').flatMap((r) => r.mappings);
  assert.deepEqual(g.map((m) => [m.id, m.key, m.confidence]), [['118|H.R. 2', 'border_security', 'high']]);
});

// ── v6 keys: energy_production, school_choice, healthcare, cut_spending ──────
const keyedV6 = (text, extra) => map(text, extra).mappings.map((m) => [m.bill ?? m.matched, m.key, m.confidence]);
t('energy_production: oil, gas and leasing measures map; "energy" alone does not', () => {
  assert.deepEqual(keyedV6('I voted for H.R. 1335 to restart offshore oil and gas lease sales.', { date: '2025-05-01' }), [['H.R. 1335', 'energy_production', 'high']]);
  assert.deepEqual(keyedV6('I voted for H.R. 1335 to lower energy bills with rooftop solar.', { date: '2025-05-01' }).filter((x) => x[1] === 'energy_production'), []);
});
t('school_choice: vouchers, ESAs and tax-credit scholarships map; public schools alone do not', () => {
  assert.deepEqual(keyedV6('I voted for H.R. 817 to create tax-credit scholarships for families.', { date: '2025-05-01' }), [['H.R. 817', 'school_choice', 'high']]);
  assert.deepEqual(keyedV6('I voted for H.R. 817 to raise teacher pay in our public schools.', { date: '2025-05-01' }), []);
});
t('healthcare: coverage measures map; a drug-price or hospital name alone does not', () => {
  assert.deepEqual(keyedV6('I voted for H.R. 3000 to extend the ACA tax credits so families keep their coverage.', { date: '2025-05-01' }), [['H.R. 3000', 'healthcare', 'high']]);
  assert.deepEqual(keyedV6('I voted for H.R. 3000 to rename the veterans hospital.', { date: '2025-05-01' }), []);
});
t('cut_spending: budget, cap and debt-limit measures map; an aid supplemental and the CBO do not', () => {
  assert.deepEqual(keyedV6('I voted for H.R. 2811 to cap discretionary spending and cut the deficit.', { date: '2023-04-26' }), [['H.R. 2811', 'cut_spending', 'high']]);
  assert.deepEqual(keyedV6('I voted against H.R. 8035. It adds $60 billion in aid for Ukraine to our national debt.', { date: '2024-04-20' }), [['H.R. 8035', 'ukraine_aid', 'high']]);
  assert.deepEqual(keyedV6('The Congressional Budget Office scored H.R. 5100, which cuts rural broadband grants.', { date: '2025-05-01' }), []);
});
t('v6 keys yield to the v5 keys: a border bill’s wall money is not a spending-cut bill', () => {
  assert.deepEqual(keyedV6('I voted for H.R. 2 to secure the border with $46 billion for the wall, and to cut the deficit.', { date: '2023-05-11' }).map((x) => x[1]), ['border_security']);
});
t('one bill per sentence: a sentence naming two bills belongs to the first (Lucas, April 2023, verbatim)', () => {
  const body = ['<p>Washington, DC – Congressman Frank Lucas (OK-03) released the following statement after the U.S. House of Representatives passed H.R. 2811- the Limit, Save, Grow Act of 2023 , a bill to address the debt ceiling and reduce federal spending.</p>',
    '<p>The Limit, Save, Grow Act would return total discretionary spending to the Fiscal Year (FY) 2022 level in FY 2024 and cap annual growth at 1 percent for a decade thereafter; rescind unspent COVID relief funds; repeal most of the Inflation Reduction Act’s (IRA) energy and climate tax credit expansions.</p>'].join('');
  const r = doc(body, { source_type: 'official press release', date: '2023-04-26' });
  assert.deepEqual(keyed(r), [['H.R. 2811', 'cut_spending', 'high']], 'the IRA is named, but the spending cap is the Limit, Save, Grow Act’s');
  assert.ok(F.findBills({ body, date: '2023-04-26', source_type: 'official press release' }, { catalog }).candidates.find((c) => c.bill === 'H.R. 2811').mentions.length >= 2, 'the page-local title reads as H.R. 2811');
});
t('lead-in: an opening statement’s preface does not feed the first of several bills (Smith, March 2024, verbatim)', () => {
  const body = ['<p>“Today, taxpayers face high prices sparked by reckless government spending and $34 trillion of debt and counting.</p>',
    '<p>“Part of our commitment to helping America’s seniors and workers today is to protect and strengthen Medicare and Social Security.</p>',
    '<p>Some estimates show that the tax breaks in the Inflation Reduction Act now cost as much as three times the original projection.</p>',
    '<p>“And finally, last year, we secured the most meaningful pro-work reform to TANF in a generation in the Fiscal Responsibility Act.</p>',
    '<p>These reforms not only help lift more families out of poverty and grow our economy but were also a part of our reforms to rein in spending.</p>'].join('');
  const r = doc(body, { source_type: 'committee opening statement (official)', date: '2024-03-06' });
  assert.deepEqual(keyed(r), [['H.R. 3746', 'cut_spending', 'medium']]);
});
t('a statute cited in passing is not a measure (Waters, October 2018, verbatim)', () => {
  const body = '<p>Roosevelt in 1935, the Social Security Act has provided economic stability and retirement security to millions of hard working Americans.</p><p>Medicare and Medicaid save lives, help people live longer, and provide the peace of mind that comes with affordable health care that is there when you need it.</p><p>One would think by now that Republicans would have learned that the American people will not tolerate cuts to these essential programs.</p>';
  const r = doc(body, { source_type: 'official press release', date: '2018-10-19' });
  assert.deepEqual(r.mappings, []);
  assert.match(r.unmapped[0].reason, /cited in passing/);
});
t('the four v6 keys map nothing on the multi-bill test release (Miller-Meeks, April 2024) and nothing in the first five keys’ sources', () => {
  const body = ['<h1>Rep. Miller-Meeks Statement on Votes to Secure Southern Border, Support U.S. National Security</h1>',
    '<p>“I urge the Senate and President Biden to take immediate action to pass H.R. 2 and secure the southern border to stop the flow of illegal immigration, people on terrorist watch list, and fentanyl. Border security is national security.</p>',
    '<p>Israel Security Supplemental Appropriations Act</p><p>$26.38 billion to support Israel in its effort to defend itself against Iran and its proxies, and to reimburse U.S. military operations in response to recent attacks.</p>',
    '<p>Ukraine Security Supplemental Appropriations Act</p><p>$60.84 billion to address the conflict in Ukraine and assist our regional partners as they counter Russia, $23.2 billion of which will be used for replenishment of U.S. weapons, stocks, and facilities.</p>',
    '<p>Indo-Pacific Security Supplemental Appropriations Act</p><p>$8.12 billion to continue efforts to counter communist China and ensure a strong deterrence in the region.</p>'].join('');
  assert.deepEqual(doc(body, { source_type: 'official press release' }).mappings.filter((m) => V6.includes(m.key)), []);
  const FIRST5 = ['sanders|israel_military_aid|gt-006', 'massie|ukraine_aid|gt-002', 'massie|iran_hostilities|gt-005', 'owens|ukraine_aid|gt-007', 'michael_guest|border_security|gt-009'];
  for (const r of GT.filter((x) => FIRST5.includes(x.stance_id))) assert.ok(!r.mappings.some((m) => V6.includes(m.key)), r.stance_id);
});
t('v6 mappings of catalog bills sit on a key the catalog files the bill under', () => {
  for (const r of GT) for (const m of r.mappings) if (V6.includes(m.key) && m.id && catalog.byId.get(m.id)) assert.ok(catalog.byId.get(m.id).issue_keys.includes(m.key), `${m.id} → ${m.key}`);
});
t('expansion records (second pass): the bills found map to the record key at the expected confidence', () => {
  const got = (id) => GT.filter((r) => r.stance_id === id).flatMap((r) => r.mappings.map((m) => [m.bill ?? m.matched, m.key, m.confidence]));
  assert.deepEqual(got('french_hill|cut_spending|gt-012'), [['H.Con.Res. 71', 'cut_spending', 'high']]);
  assert.deepEqual(got('frank_lucas|cut_spending|gt-014'), [['H.R. 2811', 'cut_spending', 'high']]);
  assert.deepEqual(got('mariannette_miller_meeks|cut_spending|gt-015'), [['H.J.Res. 139', 'cut_spending', 'high']]);
  assert.deepEqual(got('bennie_thompson|healthcare|gt-016'), [['H.R. 1', 'healthcare', 'high'], ['Affordable Care Act', 'healthcare', 'medium']]);
  assert.deepEqual(got('cruz|school_choice|gt-017'), [['Educational Choice for Children Act', 'school_choice', 'medium'], ['Tax Cuts and Jobs Act', 'school_choice', 'medium']]);
  assert.deepEqual(got('jason_smith|cut_spending|gt-024'), [['H.R. 3746', 'cut_spending', 'medium']]);
});

// ── v7 keys: climate_action, gun_safety, pro_choice, voting_access, housing, econ_trade, econ_workers, justice_reform ──
const keyedV7 = (text, extra) => map(text, extra).mappings.map((m) => [m.bill ?? m.matched, m.key, m.confidence]);
t('v7 keys read like the v6 keys: full-document idea, one bill per sentence, and they yield to every earlier key', () => {
  for (const k of V7) {
    const P = K.BILL_KEY_PATTERNS[k];
    assert.ok(P.words && P.yieldsBill && !P.facet, k);
    for (const y of ['tariffs_china', 'border_security', ...V6, ...V7.slice(0, V7.indexOf(k))]) assert.ok(P.yields.includes(y), `${k} yields to ${y}`);
  }
  for (const k of K.FIRST_NINE_KEYS) assert.ok(!K.BILL_KEY_PATTERNS[k].yieldsBill, `${k} is not changed to yield`);
});
t('climate_action: emissions, clean-energy and solar measures map; "climate disasters" and oil leasing do not', () => {
  assert.deepEqual(keyedV7('I voted for H.R. 5100 to cut carbon emissions from power plants in half.', { date: '2025-05-01' }), [['H.R. 5100', 'climate_action', 'high']]);
  assert.deepEqual(keyedV7('I voted for H.R. 1335 to lower energy bills with rooftop solar.', { date: '2025-05-01' }), [['H.R. 1335', 'climate_action', 'high']]);
  assert.deepEqual(keyedV7('I voted for H.R. 5100 to fund farms hit by climate disasters.', { date: '2025-05-01' }), []);
  assert.deepEqual(keyedV7('I voted for H.R. 1335 to restart offshore oil and gas lease sales.', { date: '2025-05-01' }).map((x) => x[1]), ['energy_production']);
});
t('gun_safety: background checks, bans and red-flag orders map either way; a bill naming no gun word does not', () => {
  assert.deepEqual(keyedV7('I voted for H.R. 8 to require background checks on all gun sales.', { date: '2021-03-11' }), [['H.R. 8', 'gun_safety', 'high']]);
  assert.deepEqual(keyedV7('I voted against H.R. 1808, a ban on the guns law-abiding Americans own.', { date: '2022-07-29' }), [['H.R. 1808', 'gun_safety', 'high']]);
  assert.deepEqual(keyedV7('I voted for H.R. 5100 to rename the post office on Main Street.', { date: '2025-05-01' }), []);
});
t('pro_choice: abortion measures map either way; healthcare cedes them (the Women’s Health Protection Act is not a coverage bill)', () => {
  assert.deepEqual(keyedV7('I voted for H.R. 3755, which protects access to abortion care and the right to reproductive health care.', { date: '2021-09-24' }), [['H.R. 3755', 'pro_choice', 'high']]);
  assert.deepEqual(keyedV7('I voted for H.R. 21 to protect babies born alive after an attempted abortion.', { date: '2025-01-23' }), [['H.R. 21', 'pro_choice', 'high']]);
  assert.deepEqual(keyedV7('I voted for H.R. 3000 to extend the ACA tax credits so families keep their coverage.', { date: '2025-05-01' }), [['H.R. 3000', 'healthcare', 'high']], 'a coverage bill still reads on healthcare');
});
t('voting_access: registration, mail voting and voter ID measures map either way; an election in another sense does not', () => {
  assert.deepEqual(keyedV7('I voted for H.R. 1 to expand early voting and automatic voter registration.', { date: '2021-03-03' }), [['H.R. 1', 'voting_access', 'high']]);
  assert.deepEqual(keyedV7('I voted for H.R. 22 to require proof of citizenship for voter registration.', { date: '2025-04-10' }), [['H.R. 22', 'voting_access', 'high']]);
  assert.deepEqual(keyedV7('I support HB 300, which removes the second election workers need to form a union.', { date: '2025-05-01' }).filter((x) => x[1] === 'voting_access'), []);
});
t('housing: supply, zoning and rent measures map; homes in another sense do not', () => {
  assert.deepEqual(keyedV7('I voted for H.R. 6644 to build more affordable housing and reform exclusionary zoning.', { date: '2026-02-09' }), [['H.R. 6644', 'housing', 'high']]);
  assert.deepEqual(keyedV7('I voted for H.R. 5100 to help families weatherize and heat their homes.', { date: '2025-05-01' }), []);
});
t('econ_trade: trade deals and trade rules map; China tariffs stay with tariffs_china', () => {
  assert.deepEqual(keyedV7('I voted for H.R. 5430 to replace NAFTA with a trade deal that protects American workers.', { date: '2019-12-19' }), [['H.R. 5430', 'econ_trade', 'high']]);
  assert.deepEqual(keyedV7('I voted for H.R. 9100 to raise tariffs on Chinese steel and aluminum.', { date: '2025-05-01' }).map((x) => x[1]), ['tariffs_china']);
});
t('econ_workers: minimum-wage and union measures map; "workers" alone does not', () => {
  assert.deepEqual(keyedV7('I cosponsored H.R. 20 to protect the right to organize and bargain collectively.', { date: '2025-03-06' }), [['H.R. 20', 'econ_workers', 'high']]);
  assert.deepEqual(keyedV7('I voted for H.R. 5100 to give federal workers back pay after the shutdown.', { date: '2025-05-01' }), []);
});
t('justice_reform: sentencing and incarceration measures map; a mental-health bill naming the justice system does not', () => {
  assert.deepEqual(keyedV7('I voted for S. 756 to reduce mandatory minimum sentences and expand reentry programs.', { date: '2018-12-20' }), [['S. 756', 'justice_reform', 'high']]);
  assert.deepEqual(keyedV7('I voted for H.R. 5100 to improve our mental health system and ensure the mentally ill in our criminal justice system receive treatment.', { date: '2025-05-01' }), []);
});
t('a bill an earlier key maps stays there unless the catalog files it under the v7 key too', () => {
  // A trade deal's worker protections: the trade key maps it, the labor key (later) does not.
  assert.deepEqual(keyedV7('I spoke for H.R. 5430, legislation to implement the USMCA. I fought for worker protections in it.', { date: '2019-12-17' }).map((x) => x[1]), ['econ_trade']);
  // The Inflation Reduction Act: the catalog files it under climate_action, so it maps there as well as on healthcare.
  assert.ok(catalog.byId.get('117|H.R. 5376').issue_keys.includes('climate_action'));
  const ira = keyedV7('The Inflation Reduction Act invests in clean energy to cut carbon emissions. It also extends ACA tax credits so families keep their coverage.', { date: '2022-08-16' });
  assert.deepEqual(ira.map((x) => x[1]).sort(), ['climate_action', 'healthcare']);
  assert.ok(ira.some((x) => x[1] === 'climate_action'));
  // An earlier-key bill the catalog does not file under the v7 key: the v7 key yields.
  const r = K.mapCandidate({ ...find('I voted for H.R. 2 to secure the border. It also cuts carbon emissions from trucks idling at ports of entry.', { date: '2023-05-11' }).candidates[0] }, 'climate_action');
  assert.equal(r.mapped, false);
  assert.match(r.reason, /maps to border_security, an earlier key/);
});
t('on a state legislator’s page a federal-style number the catalog lacks is not mapped by a v7 key (Vermont "S.100")', () => {
  const page = { text: 'I support the 2023 HOME Act (S.100) that combats high housing costs by encouraging duplexes and relaxing zoning.', date: '2026-11-12' };
  assert.deepEqual(K.mapFound(F.findBills(page, { catalog })).mappings.map((m) => m.key), ['housing']);
  const st = K.mapFound(F.findBills(page, { catalog }), { level: 'state' });
  assert.ok(!st.mappings.some((m) => m.bill === 'S. 100'));
});
t('the v7 keys map nothing on the multi-bill test releases (Miller-Meeks, Lucas, Smith, Waters) or in the first nine keys’ ground-truth sources', () => {
  const mm = ['<h1>Rep. Miller-Meeks Statement on Votes to Secure Southern Border, Support U.S. National Security</h1>',
    '<p>“I urge the Senate and President Biden to take immediate action to pass H.R. 2 and secure the southern border to stop the flow of illegal immigration, people on terrorist watch list, and fentanyl. Border security is national security.</p>',
    '<p>End the Border Catastrophe Act</p><p>Forces the Biden Administration to restart construction of the border wall.</p><p>Ends catch and release.</p>',
    '<p>Israel Security Supplemental Appropriations Act</p><p>$26.38 billion to support Israel in its effort to defend itself against Iran and its proxies, and to reimburse U.S. military operations in response to recent attacks.</p>',
    '<p>Ukraine Security Supplemental Appropriations Act</p><p>$60.84 billion to address the conflict in Ukraine and assist our regional partners as they counter Russia, $23.2 billion of which will be used for replenishment of U.S. weapons, stocks, and facilities.</p>',
    '<p>Indo-Pacific Security Supplemental Appropriations Act</p><p>$8.12 billion to continue efforts to counter communist China and ensure a strong deterrence in the region.</p>',
    '<p>Issues : Border Security</p>'].join('');
  const lucas = ['<p>Washington, DC – Congressman Frank Lucas (OK-03) released the following statement after the U.S. House of Representatives passed H.R. 2811- the Limit, Save, Grow Act of 2023 , a bill to address the debt ceiling and reduce federal spending.</p>',
    '<p>The Limit, Save, Grow Act would return total discretionary spending to the Fiscal Year (FY) 2022 level in FY 2024 and cap annual growth at 1 percent for a decade thereafter; rescind unspent COVID relief funds; repeal most of the Inflation Reduction Act’s (IRA) energy and climate tax credit expansions.</p>'].join('');
  const smith = ['<p>“Today, taxpayers face high prices sparked by reckless government spending and $34 trillion of debt and counting.</p>',
    '<p>Some estimates show that the tax breaks in the Inflation Reduction Act now cost as much as three times the original projection.</p>',
    '<p>“And finally, last year, we secured the most meaningful pro-work reform to TANF in a generation in the Fiscal Responsibility Act.</p>'].join('');
  const waters = '<p>Roosevelt in 1935, the Social Security Act has provided economic stability and retirement security to millions of hard working Americans.</p><p>Medicare and Medicaid save lives, help people live longer, and provide the peace of mind that comes with affordable health care that is there when you need it.</p>';
  for (const [body, date] of [[mm, '2024-04-20'], [lucas, '2023-04-26'], [smith, '2024-03-06'], [waters, '2018-10-19']])
    assert.deepEqual(doc(body, { source_type: 'official press release', date }).mappings.filter((m) => V7.includes(m.key)).map((m) => `${m.bill ?? m.matched} → ${m.key}`), []);
  for (const r of GT.filter((x) => !x.stance_id.match(/gt-0(?:2[5-9]|[3-5]\d)$/))) assert.ok(!r.mappings.some((m) => V7.includes(m.key)), r.stance_id);
});
t('expansion records (third pass): the bills found map to the record key at the expected confidence, and nothing else maps', () => {
  const got = (id) => GT.filter((r) => r.stance_id === id).flatMap((r) => r.mappings.map((m) => [m.bill ?? m.matched, m.key, m.confidence]));
  const want = {
    'lujan|climate_action|gt-026': [['Community Solar Consumer Choice Act', 'climate_action', 'medium']],
    'hickenlooper|climate_action|gt-027': [['H.R. 5376', 'climate_action', 'medium']],
    'robert_garcia|climate_action|gt-028': [['Clean Shipping Act', 'climate_action', 'medium']],
    'boebert|gun_safety|gt-029': [['S. 2938', 'gun_safety', 'medium']],
    'fitzpatrick|gun_safety|gt-031': [['H.R. 4240', 'gun_safety', 'high'], ['H.R. 2598', 'gun_safety', 'high']],
    'dina_titus|pro_choice|gt-033': [['H.R. 3755', 'pro_choice', 'high']],
    'diana_degette|pro_choice|gt-034': [['Women\'s Health Protection Act', 'pro_choice', 'medium']],
    'mike_flood|pro_choice|gt-035': [['H.R. 21', 'pro_choice', 'high']],
    'mike_simpson|pro_choice|gt-036': [['H.R. 21', 'pro_choice', 'high'], ['H.R. 7', 'pro_choice', 'high']],
    'emmer|voting_access|gt-037': [['H.R. 1', 'voting_access', 'high']],
    'stephanie_bice|voting_access|gt-038': [['H.R. 5746', 'voting_access', 'high']],
    'tom_cole|voting_access|gt-039': [['H.R. 5746', 'voting_access', 'high']],
    'adam_smith|voting_access|gt-040': [['H.R. 1', 'voting_access', 'high']],
    'haley_stevens|voting_access|gt-041': [['H.R. 1', 'voting_access', 'high']],
    'aguilar|housing|gt-043': [['Affordable Housing Resident Services Act', 'housing', 'medium']],
    'ayanna_pressley|housing|gt-044': [['Innovation Fund Act', 'housing', 'medium']],
    'jared_golden|econ_workers|gt-046': [['H.R. 20', 'econ_workers', 'high']],
    'brendan_boyle|econ_workers|gt-047': [['Protecting the Right to Organize Act', 'econ_workers', 'medium']],
    'casar|econ_workers|gt-048': [['H.R. 20', 'econ_workers', 'high']],
    'bobby_scott|justice_reform|gt-049': [['First Step Act of 2018', 'justice_reform', 'medium'], ['Fair Sentencing Act of 2010', 'justice_reform', 'medium']],
    'nadler|justice_reform|gt-050': [['First Step Act', 'justice_reform', 'medium'], ['Fair Sentencing Act of 2010', 'justice_reform', 'medium']],
    'walberg|econ_trade|gt-051': [['H.R. 5430', 'econ_trade', 'high']],
    'neal|econ_trade|gt-052': [['H.R. 5430', 'econ_trade', 'high']],
    'steven_horsford|econ_trade|gt-053': [['H.R. 5430', 'econ_trade', 'high']],
  };
  assert.deepEqual(Object.keys(want), V7_MAPPED);
  for (const [id, rows] of Object.entries(want)) assert.deepEqual(got(id), rows, id);
  // The 1965 Voting Rights Act-style "cited in passing" rule still holds: Emmer's and Smith's H.R. 1 is the 117th Congress For the People Act.
  assert.equal(GT.find((r) => r.stance_id === 'adam_smith|voting_access|gt-040').mappings[0].id, '117|H.R. 1');
  // Records whose source names no bill the finder reads: no mapping, the scorer read still shows.
  for (const id of ['heinrich|climate_action|gt-025', 'scalise|gun_safety|gt-030', 'steve_womack|gun_safety|gt-032', 'marie_gluesenkamp_perez|voting_access|gt-042', 'delia_ramirez|housing|gt-045'])
    assert.deepEqual(got(id), [], id);
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
  if (report.routine_sweep) {
    assert.equal(report.summary.sweep_false_mappings, 0, 'a routine-sweep mapping that is unreviewed or reviewed false');
    const review = JSON.parse(fs.readFileSync(path.join(root, 'db/bill-finder-sweep-review-2026-11.json'), 'utf8'));
    for (const r of report.routine_sweep.rows.filter((x) => x.ok)) for (const m of r.mappings) assert.equal(sweepVerdict(review, r.url, m), 'correct', `${r.url} ${m.bill ?? m.matched} → ${m.key}`);
    assert.ok(review.reviewed.every((x) => x.verdict === 'correct'), 'no reviewed-false mapping remains');
  }
});

if (failures) { console.error(`\n${failures} failing`); process.exit(1); }
console.log('\nbill finder: all checks pass');
