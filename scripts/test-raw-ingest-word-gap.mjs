#!/usr/bin/env node
// test-raw-ingest-word-gap.mjs — the raw-ingest pull list prefers pages that can
// fill Word vs Action gaps (netlify/lib/raw-ingest-word-gap.mjs).
//
// A GAP is an issue with a formal record for the politician but no stated
// position. Pages whose expected (or harvested) topic is a gap issue are pulled
// first; pages only on issues that already have a stated position are pulled
// last. Only the order changes. The Massie allow-list still decides who runs.
//
//   node scripts/test-raw-ingest-word-gap.mjs
//
// No network, no database: every store, the fetcher and the gap data are fakes.
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const imp = (p) => import(pathToFileURL(path.join(root, p)).href);
const cron = await imp('netlify/functions/raw-ingest-cron.mts');
const core = await imp('netlify/lib/raw-ingest-core.mjs');
const fresh = await imp('netlify/lib/raw-ingest-fresh.mjs');
const wg = await imp('netlify/lib/raw-ingest-word-gap.mjs');

let failures = 0, passed = 0;
const t = async (name, fn) => {
  try { await fn(); passed++; console.log('  ✓', name); }
  catch (e) { failures++; console.error('  ✗', name, '\n    ', e.message); }
};
const quiet = async (fn) => {
  const orig = console.log; const lines = [];
  console.log = (...a) => lines.push(a.join(' '));
  try { return { value: await fn(), lines }; } finally { console.log = orig; }
};
const memStore = (seed = {}) => {
  const data = new Map(Object.entries(seed));
  return { data,
    async get(k) { return data.has(k) ? JSON.parse(JSON.stringify(data.get(k))) : null; },
    async set(k, v) { data.set(k, v); },
    async setJSON(k, v) { data.set(k, JSON.parse(JSON.stringify(v))); },
    async list() { return { blobs: [...data.keys()].map((key) => ({ key })) }; },
    async delete(k) { data.delete(k); } };
};
const NOW = () => new Date('2026-11-20T16:00:00.000Z');

// ── A synthetic politician: formal record on 4 issues, stated on 3 ──────────
const PID = 'test_pol';
const page = (topic, n, extra = {}) => ({ politician_id: PID, topic, url: `https://example.gov/${topic}/${n}`, source_type: 'official press release', ...extra });
const ROW = {
  politician_id: PID, tier: 2,
  sources: [
    page('cost_living', 1),       // stated → last
    page('border_security', 1),   // stated → last
    page('healthcare_costs', 1),  // neutral (no formal record, no stance)
    page('gun_rights', 1),        // GAP → first
    page('privacy_rights', 1),    // GAP → first
  ],
};
const DATA = {
  formal: { [PID]: ['gun_rights', 'privacy_rights', 'border_security', 'cost_living', 'war_powers'] },
  stated: { [PID]: ['cost_living', 'border_security', 'war_powers'] },
};
const GAPS = wg.buildWordGaps(DATA);

await t('a gap is an issue with a formal record and no stated position', () => {
  assert.deepEqual([...GAPS[PID].gap].sort(), ['gun_rights', 'privacy_rights']);
  assert.deepEqual([...GAPS[PID].stated].sort(), ['border_security', 'cost_living', 'war_powers']);
});

await t('pages rank gap (0) · neutral (1) · already-stated (2); paired issues count', () => {
  assert.equal(wg.wordGapRank(page('gun_rights', 9), GAPS), wg.GAP_RANK);
  assert.equal(wg.wordGapRank(page('healthcare_costs', 9), GAPS), wg.NEUTRAL_RANK);
  assert.equal(wg.wordGapRank(page('cost_living', 9), GAPS), wg.COVERED_RANK);
  assert.equal(wg.wordGapRank(page('cost_living', 9, { issue_pairs: ['war_powers'] }), GAPS), wg.COVERED_RANK, 'every topic stated → covered');
  assert.equal(wg.wordGapRank(page('cost_living', 9, { issue_pairs: ['privacy_rights'] }), GAPS), wg.GAP_RANK, 'a paired gap issue lifts the page');
  assert.equal(wg.wordGapRank({ ...page('gun_rights', 9), politician_id: 'someone_else' }, GAPS), wg.NEUTRAL_RANK, 'no data → neutral');
});

await t('planRun puts gap-issue pages ahead of already-stated pages for that politician', () => {
  const plan = core.planRun({}, { roster: [ROW], counts: {}, wordGaps: GAPS, perPolitician: 6, max: 36 });
  const topics = plan.sources.map((s) => s.topic);
  assert.deepEqual(topics, ['gun_rights', 'privacy_rights', 'healthcare_costs', 'cost_living', 'border_security']);
  const ranks = plan.sources.map((s) => wg.wordGapRank(s, GAPS));
  assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b), 'ranks never go down the list');
});

await t('already-stated pages are deprioritised, not dropped: a tight cap pulls gaps first, a roomy cap still pulls them', () => {
  const tight = core.planRun({}, { roster: [ROW], counts: {}, wordGaps: GAPS, perPolitician: 2, max: 36 });
  assert.deepEqual(tight.sources.map((s) => s.topic), ['gun_rights', 'privacy_rights']);
  const roomy = core.planRun({}, { roster: [ROW], counts: {}, wordGaps: GAPS, perPolitician: 6, max: 36 });
  assert.ok(roomy.sources.some((s) => s.topic === 'cost_living') && roomy.sources.some((s) => s.topic === 'border_security'));
});

await t('without gap data planRun is exactly as before', () => {
  const a = core.planRun({}, { roster: [ROW], counts: {}, perPolitician: 6, max: 36 });
  const b = core.planRun({}, { roster: [ROW], counts: {}, wordGaps: null, perPolitician: 6, max: 36 });
  assert.deepEqual(a.sources.map((s) => s.url), ROW.sources.map((s) => s.url));
  assert.deepEqual(a, b);
});

await t('the fresh frontier is taken in word-gap order by harvested topic', () => {
  const state = { frontier: { [PID]: [page('cost_living', 50), page('border_security', 51), page('gun_rights', 52)] }, seen: {} };
  const f = fresh.addFreshSources([], state, { politicians: [PID], max: 36, perPolitician: 6, per: 2, log: () => {}, wordGaps: GAPS });
  assert.deepEqual(f.added.map((s) => s.topic), ['gun_rights', 'cost_living']);
  const before = fresh.addFreshSources([], state, { politicians: [PID], max: 36, perPolitician: 6, per: 2, log: () => {} });
  assert.deepEqual(before.added.map((s) => s.topic), ['cost_living', 'border_security'], 'no gap data → frontier order unchanged');
});

await t('the final reorder keeps every politician in the slots they held', () => {
  const other = { politician_id: 'other', topic: 'cost_living', url: 'https://other.example/x' };
  const list = [page('cost_living', 1), other, page('gun_rights', 1), page('border_security', 1)];
  const out = wg.orderPullListByWordGap(list, GAPS);
  assert.deepEqual(out.map((s) => s.politician_id), list.map((s) => s.politician_id));
  assert.deepEqual(out.filter((s) => s.politician_id === PID).map((s) => s.topic), ['gun_rights', 'cost_living', 'border_security']);
});

// ── The scheduled run with the Massie allow-list on ─────────────────────────
const BODY = '<html><body><h1>Issues</h1>'
  + '<p>We must protect privacy and end warrantless surveillance of Americans.</p>'.repeat(3)
  + '<p>I will always vote to cut wasteful federal spending.</p></body></html>';
const fetched = [];
const fakeFetch = async (url) => {
  fetched.push(String(url));
  return { ok: true, status: 200, url: String(url), headers: new Map([['content-type', 'text/html']]), text: async () => BODY };
};
const MASSIE_FRONTIER = [
  { politician_id: 'massie', topic: 'cost_living', url: 'https://massie.house.gov/news/documentsingle.aspx?DocumentID=998001', source_type: 'official House press release', found_at: '2026-11-19T00:00:00.000Z' },
  { politician_id: 'massie', topic: 'gov_waste', url: 'https://massie.house.gov/news/documentsingle.aspx?DocumentID=998002', source_type: 'official House press release', found_at: '2026-11-19T00:00:00.000Z' },
];
const CORNYN_FRONTIER = [{ politician_id: 'john_cornyn', topic: 'border_security', url: 'https://www.cornyn.senate.gov/news/frontier-page-9/', source_type: 'official Senate press release', found_at: '2026-11-19T00:00:00.000Z' }];
// Massie: privacy_rights and gov_waste have a formal record but no stated
// position; cost_living, war_powers, states_federal_power and gov_regulation
// already have stances. Cornyn's data is supplied too, to prove it is ignored.
const MASSIE_DATA = {
  formal: { massie: ['privacy_rights', 'gov_waste', 'gov_regulation', 'cost_living'], john_cornyn: ['gun_rights'] },
  stated: { massie: ['cost_living', 'war_powers', 'states_federal_power', 'gov_regulation'], john_cornyn: [] },
};
const asked = [];
const loader = async (pids) => { asked.push([...pids]); return MASSIE_DATA; };
const rotationStore = memStore({
  [core.ROTATION_KEY]: { cycle: 0, done: [], pool_version: core.POOL_VERSION },
  [fresh.FRONTIER_KEY]: { items: { massie: MASSIE_FRONTIER, john_cornyn: CORNYN_FRONTIER } },
});
const { value: res, lines } = await quiet(() => cron.scheduled({
  fetch: fakeFetch, store: memStore(), lockerStore: memStore(), rotationStore, transcriptStore: memStore(),
  suggestionsStore: memStore(), statedDb: null, now: NOW, triggerTranscriber: async () => {},
  // The allow-list is off by default; this check exercises it on (dormant option).
  curatedStances: {}, wordGaps: loader, scope: ['thomas_massie'],
}));
const report = await res.json();

await t('Massie allow-list on: the gap loader is asked about Massie only, and only Massie is affected', () => {
  assert.deepEqual(asked, [['massie']]);
  assert.deepEqual(Object.keys(report.word_gap || {}), ['massie']);
  assert.deepEqual(report.word_gap.massie.gap, ['gov_waste', 'privacy_rights']);
  for (const s of report.included.sources) assert.equal(s.politician_id, 'massie');
  assert.equal(report.scope?.pulled_outside, 0);
  assert.ok(!fetched.some((u) => /cornyn/.test(u)), 'nothing of Cornyn\'s was fetched');
});

await t('Massie\'s pull list puts gap-issue pages ahead of already-stated pages', () => {
  const order = report.word_gap.massie.pull_order;
  const ranks = order.map((x) => x.rank);
  assert.ok(ranks.includes(wg.GAP_RANK) && ranks.includes(wg.COVERED_RANK), `both kinds present (${JSON.stringify(order)})`);
  assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b), `gap pages first, stated pages last (${JSON.stringify(order)})`);
  const firstCovered = report.included.sources.findIndex((s) => wg.wordGapRank(s, wg.buildWordGaps({ formal: { massie: MASSIE_DATA.formal.massie }, stated: { massie: MASSIE_DATA.stated.massie } })) === wg.COVERED_RANK);
  const lastGap = report.included.sources.map((s) => s.topic).lastIndexOf('privacy_rights');
  assert.ok(lastGap < firstCovered, 'the privacy page is pulled before any already-stated page');
  assert.ok(report.included.sources.some((s) => s.topic === 'gov_regulation'), 'already-stated pages are still pulled');
  assert.ok(lines.some((l) => l.startsWith('raw-ingest: word gap — massie: 2 gap issue(s)')), 'the run log names the gaps');
});

await t('a failing gap loader leaves the pull order unchanged and the run going', async () => {
  const { value: r2, lines: l2 } = await quiet(() => cron.scheduled({
    fetch: fakeFetch, store: memStore(), lockerStore: memStore(), rotationStore: memStore(), transcriptStore: memStore(),
    suggestionsStore: memStore(), statedDb: null, now: NOW, triggerTranscriber: async () => {}, curatedStances: {},
    wordGaps: async () => { throw new Error('db down'); },
  }));
  const rep = await r2.json();
  assert.equal(rep.word_gap, undefined);
  assert.ok(rep.results.length > 0);
  assert.ok(l2.some((l) => /word gap — unavailable, pull order unchanged \(db down\)/.test(l)));
});

await t('injected stores without gap data: no word-gap step (earlier suites unchanged)', async () => {
  const { value: r3 } = await quiet(() => cron.scheduled({
    fetch: fakeFetch, store: memStore(), lockerStore: memStore(), rotationStore: memStore(), transcriptStore: memStore(),
    suggestionsStore: memStore(), statedDb: null, now: NOW, triggerTranscriber: async () => {}, curatedStances: {},
  }));
  assert.equal((await r3.json()).word_gap, undefined);
});

console.log(failures ? `\n✗ raw-ingest word gap: ${failures} failing, ${passed} passing` : `\n✓ raw-ingest word gap: all ${passed} checks passed`);
process.exit(failures ? 1 : 0);
