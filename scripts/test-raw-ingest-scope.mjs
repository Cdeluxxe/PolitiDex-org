#!/usr/bin/env node
// test-raw-ingest-scope.mjs — the politician allow-list on the scheduled
// raw-ingest pipeline (netlify/lib/raw-ingest-scope.mjs).
//
// While INGEST_ALLOW_LIST holds "thomas_massie", every scheduled run plans,
// pulls, discovers, harvests and scores Thomas Massie only (roster id "massie").
// Everyone else is skipped and nothing of theirs is written. One flag lifts it.
//
//   node scripts/test-raw-ingest-scope.mjs
//
// No network, no database: every store and the fetcher are in-memory fakes.
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const imp = (p) => import(pathToFileURL(path.join(root, p)).href);
const cron = await imp('netlify/functions/raw-ingest-cron.mts');
const core = await imp('netlify/lib/raw-ingest-core.mjs');
const fresh = await imp('netlify/lib/raw-ingest-fresh.mjs');
const scope = await imp('netlify/lib/raw-ingest-scope.mjs');

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

// Every page answers with stable, scoreable text and links to both Massie's own
// site and another member's, so discovery and the frontier harvest have
// something outside the scope to be tempted by.
const BODY = '<html><body><h1>Issues</h1>'
  + '<p>I will always vote to cut wasteful federal spending and balance the budget.</p>'
  + '<p>We must protect privacy and end warrantless surveillance of Americans.</p>'
  + '<p>I will secure the border and finish the wall.</p>'.repeat(3)
  + '<a href="https://massie.house.gov/news/documentsingle.aspx?DocumentID=999001">Massie statement on spending</a>'
  + '<a href="https://www.cornyn.senate.gov/news/cornyn-statement-on-border-security/">Cornyn statement on the border</a>'
  + '</body></html>';
const fetched = [];
const fakeFetch = async (url) => {
  fetched.push(String(url));
  return { ok: true, status: 200, url: String(url), headers: new Map([['content-type', 'text/html']]), text: async () => BODY };
};

const CORNYN_FRONTIER = [{ politician_id: 'john_cornyn', topic: 'border_security', url: 'https://www.cornyn.senate.gov/news/frontier-page-1/', source_type: 'official Senate press release', found_at: '2026-11-19T00:00:00.000Z' }];
const MASSIE_FRONTIER = [{ politician_id: 'massie', topic: 'gov_waste', url: 'https://massie.house.gov/news/documentsingle.aspx?DocumentID=999002', source_type: 'official House press release', found_at: '2026-11-19T00:00:00.000Z' }];
const OLD_ROTATION = { cycle: 7, done: ['greg_abbott', 'john_cornyn'], pool_version: core.POOL_VERSION };

const rotationStore = memStore({
  [core.ROTATION_KEY]: OLD_ROTATION,
  [fresh.FRONTIER_KEY]: { items: { john_cornyn: CORNYN_FRONTIER, massie: MASSIE_FRONTIER } },
});
const lockerStore = memStore();
const rawStore = memStore();

const { value: res, lines } = await quiet(() => cron.scheduled({
  fetch: fakeFetch, store: rawStore, lockerStore, rotationStore, transcriptStore: memStore(),
  suggestionsStore: memStore(), statedDb: null, now: NOW, triggerTranscriber: async () => {},
  curatedStances: {},
}));
const report = await res.json();
const MASSIE_IDS = scope.scopeIds();
const isMassie = (pid) => MASSIE_IDS.has(String(pid || ''));

await t('the flag: INGEST_ALLOW_LIST is the single switch, naming thomas_massie, and resolves to the roster id "massie"', () => {
  assert.deepEqual(scope.INGEST_ALLOW_LIST, ['thomas_massie']);
  assert.ok(MASSIE_IDS.has('massie') && MASSIE_IDS.has('thomas_massie'));
  assert.ok(core.ROSTER.some((r) => r.politician_id === 'massie'), 'Massie is on the ingest roster');
  assert.equal(scope.scopeIds([]), null, 'an empty list turns the restriction off');
  assert.equal(scope.scopeIds(null), null, 'null turns the restriction off');
});

await t('a scheduled run plans and pulls Massie sources only', () => {
  assert.ok(report.plan, 'the run planned from the roster');
  assert.deepEqual(report.plan.politicians, ['massie'], 'Massie is the only politician planned');
  assert.equal(report.plan.roster_size, 1, 'the roster the run planned from holds Massie alone');
  assert.ok(report.included.sources.length > 0, 'Massie sources were included');
  for (const s of report.included.sources) assert.ok(isMassie(s.politician_id), `included source ${s.url} is Massie's (${s.politician_id})`);
  assert.deepEqual(report.included.politicians, ['massie']);
  assert.ok(report.results.length > 0, 'something was pulled');
});

await t('the run logs zero pulls for politicians outside the allow-list', () => {
  assert.equal(report.scope?.pulled_outside, 0);
  assert.deepEqual(report.scope?.allow_list, ['massie', 'thomas_massie']);
  const line = lines.find((l) => l.startsWith('raw-ingest: scope — allow-list on'));
  assert.ok(line, 'the scope line is in the run log');
  assert.match(line, / 0 pull\(s\) for politicians outside the allow-list/);
  assert.ok(lines.some((l) => /^raw-ingest: scope — planning 1 of \d+ roster politician\(s\)/.test(l)), 'the planning line names the skip');
  const cornynHost = fetched.filter((u) => /cornyn\.senate\.gov/.test(u));
  assert.deepEqual(cornynHost, [], 'no request ever went to another member\'s site');
});

await t('discovery adds new URLs only for Massie', () => {
  for (const d of report.discovered) assert.ok(isMassie(d.politician_id), `discovered ${d.url} belongs to ${d.politician_id}`);
  const fr = rotationStore.data.get(fresh.FRONTIER_KEY);
  assert.deepEqual(fr.items.john_cornyn, CORNYN_FRONTIER, 'another politician\'s frontier is left exactly as it was');
  for (const [pid, list] of Object.entries(fr.items)) {
    if (pid === 'john_cornyn') continue;
    assert.ok(isMassie(pid), `frontier gained entries only under Massie (found ${pid})`);
    for (const x of list) assert.ok(isMassie(x.politician_id));
  }
  for (const c of report.fresh?.outcomes || []) assert.ok(isMassie(c.politician_id));
});

await t('scoring (own topic and cross-topic) writes only Massie items', () => {
  assert.ok(Object.keys(report.topics.candidates).length > 0, 'pages were scored against the topic set');
  for (const w of report.locker_writes) assert.ok(isMassie(w.politician_id), `locker write ${w.key} is Massie's`);
  for (const k of lockerStore.data.keys()) assert.ok(!/cornyn|abbott|talarico/.test(k), `no Locker key for another politician (${k})`);
  for (const k of rawStore.data.keys()) assert.ok(!/cornyn|abbott|talarico/.test(k), `no raw record for another politician (${k})`);
});

await t('the whole-roster rotation position is left untouched for when the scope is lifted', () => {
  assert.deepEqual(rotationStore.data.get(core.ROTATION_KEY), OLD_ROTATION, 'the unscoped rotation doc is not overwritten');
  const k = scope.scopedRotationKey(core.ROTATION_KEY, MASSIE_IDS);
  assert.notEqual(k, core.ROTATION_KEY);
  assert.ok(rotationStore.data.get(k), 'the scoped run keeps its own rotation doc');
});

await t('lifting the flag restores the whole-roster run without other code changes', async () => {
  const rs = memStore({ [core.ROTATION_KEY]: { cycle: 0, done: [], pool_version: core.POOL_VERSION } });
  const { value: r2 } = await quiet(() => cron.scheduled({
    fetch: fakeFetch, store: memStore(), lockerStore: memStore(), rotationStore: rs, transcriptStore: memStore(),
    suggestionsStore: memStore(), statedDb: null, now: NOW, triggerTranscriber: async () => {}, curatedStances: {},
    scope: [],
  }));
  const rep = await r2.json();
  assert.ok(rep.plan.roster_size > 1, 'the whole roster is planned again');
  assert.ok(rep.plan.politicians.some((p) => !isMassie(p)), 'other politicians are planned again');
  assert.equal(rep.scope, undefined, 'no scope block when the restriction is off');
});

await t('run() without a scope is unchanged (the Phase 2–6 suites call it directly)', async () => {
  const src = core.SOURCES.slice(0, 2);
  const { value: r3 } = await quiet(() => cron.run({ fetch: fakeFetch, store: memStore(), now: NOW, sources: src, log: () => {} }));
  const rep = await r3.json();
  assert.equal(rep.results.length, 2);
  assert.deepEqual(rep.included.politicians, [...new Set(src.map((s) => s.politician_id))]);
});

console.log(failures ? `\n✗ raw-ingest scope: ${failures} failing, ${passed} passing` : `\n✓ raw-ingest scope: all ${passed} checks passed`);
process.exit(failures ? 1 : 0);
