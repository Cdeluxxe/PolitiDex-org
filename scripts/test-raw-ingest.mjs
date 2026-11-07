#!/usr/bin/env node
// test-raw-ingest.mjs — raw ingestion pipeline (raw store only), load-test shape:
// many sources per invocation, every 4 hours.
// Asserts the scheduled function exists and can be invoked, that a pull writes
// a raw record with URL, timestamp and source type, that failures are logged
// and write nothing, that no scoring/stance fields are ever written, and that
// the ground-truth benchmark file is byte-for-byte unchanged.
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fnPath = path.join(root, 'netlify/functions/raw-ingest-cron.mts');
const corePath = path.join(root, 'netlify/lib/raw-ingest-core.mjs');
const gtPath = path.join(root, 'db/stance-ground-truth-talarico-cost-of-living.json');
const GT_SHA256 = '5b2874ce0159dfde0777c43b6f90b15bf051a3b119373c6aa42640b8d0b861cb';
const FORBIDDEN = ['position', 'confidence', 'confidence_reason', 'stance', 'stance_id',
  'score', 'contradiction', 'contradictions', 'takes_clear_position', 'status'];

let failures = 0;
const t = async (name, fn) => {
  try { await fn(); console.log('  ✓', name); }
  catch (e) { failures++; console.error('  ✗', name, '\n    ', e.message); }
};

const fakeStore = () => {
  const data = new Map();
  return { data, async setJSON(k, v) { data.set(k, JSON.parse(JSON.stringify(v))); } };
};
const fakeFetch = (status, body) => async (url) => ({
  ok: status >= 200 && status < 300, status, url,
  headers: new Map([['content-type', 'text/html; charset=UTF-8']]),
  text: async () => body,
});
const quiet = async (fn) => {
  const orig = console.log; const lines = [];
  console.log = (...a) => lines.push(a.join(' '));
  try { return { value: await fn(), lines }; } finally { console.log = orig; }
};
const NOW = () => new Date('2026-11-07T08:00:00.000Z');
const HTML = '<html><body><h1>Taxes &amp; Cost of Living</h1></body></html>';

await t('function and core exist; function is scheduled every 4 hours and uses the core', () => {
  assert.ok(existsSync(fnPath), 'missing ' + fnPath);
  assert.ok(existsSync(corePath), 'missing ' + corePath);
  const src = readFileSync(fnPath, 'utf8');
  assert.match(src, /schedule:\s*"0 \*\/4 \* \* \*"/, 'every 4 hours = 6 runs/day');
  assert.match(src, /raw-ingest-core\.mjs/);
  assert.match(src, /export default/);
});

const fn = await import(pathToFileURL(fnPath).href);
const core = await import(pathToFileURL(corePath).href);
const N = core.SOURCES.length;

await t('8–12 real sources: 3–4 politicians beyond Talarico, exactly 2 topics, ground-truth page first', () => {
  assert.ok(N >= 8 && N <= 12, `${N} sources`);
  const [first] = core.SOURCES;
  assert.equal(first.politician_id, 'james_talarico');
  assert.equal(first.topic, 'cost_living');
  assert.equal(first.url, 'https://jamestalarico.com/issue/taxes-cost-of-living/');
  const others = new Set(core.SOURCES.map((s) => s.politician_id).filter((p) => p !== 'james_talarico'));
  assert.ok(others.size >= 3 && others.size <= 4, `${others.size} other politicians`);
  const topics = new Set(core.SOURCES.map((s) => s.topic));
  assert.deepEqual([...topics].sort(), ['cost_living', 'healthcare_costs'], 'two topics');
  for (const topic of topics) {
    assert.ok(new Set(core.SOURCES.filter((s) => s.topic === topic).map((s) => s.politician_id)).size >= 2,
      `${topic} covers at least 2 politicians`);
  }
  for (const s of core.SOURCES) {
    assert.match(s.url, /^https:\/\/[^/]+\.[a-z]{2,}\//, 'real https URL: ' + s.url);
    assert.ok(s.politician_id && s.topic && s.source_type, 'source fields: ' + s.url);
  }
  assert.equal(new Set(core.SOURCES.map((s) => s.url)).size, N, 'no duplicate URLs');
  const keys = core.SOURCES.map((s) => core.rawKey(s, NOW().toISOString()));
  assert.equal(new Set(keys).size, N, 'every source gets its own record key');
  assert.ok(N * 6 >= 48 && N * 6 <= 72, `${N * 6} records/day`);
});

await t('one invocation processes every source and writes one raw record each (url, timestamp, source type, body)', async () => {
  const store = fakeStore();
  const { value: res, lines } = await quiet(() => fn.run({ fetch: fakeFetch(200, HTML), store, now: NOW }));
  assert.equal(res.status, 200);
  const report = await res.json();
  assert.equal(report.ok, true);
  assert.equal(report.results.length, N);
  assert.equal(store.data.size, N);
  for (const src of core.SOURCES) {
    const rec = store.data.get(core.rawKey(src, '2026-11-07T08:00:00.000Z'));
    assert.ok(rec, 'no record for ' + src.url);
    assert.equal(rec.url, src.url);
    assert.equal(rec.fetched_at, '2026-11-07T08:00:00.000Z');
    assert.equal(rec.source_type, src.source_type);
    assert.equal(rec.politician_id, src.politician_id);
    assert.equal(rec.body, HTML, 'body stored verbatim, unparsed');
  }
  // Original Talarico key layout is unchanged.
  assert.ok(store.data.has('james_talarico/cost_living/2026-11-07T08-00-00-000Z.json'));
  assert.equal(lines.filter((l) => l.startsWith('raw-ingest: OK ')).length, N, 'one OK line per source');
  assert.ok(lines.some((l) => l === `raw-ingest: run complete — ${N} ok, 0 failed`), 'summary line');
});

await t('no scoring or stance fields are written', async () => {
  const store = fakeStore();
  await quiet(() => fn.run({ fetch: fakeFetch(200, HTML), store, now: NOW }));
  assert.equal(store.data.size, N);
  for (const rec of store.data.values()) {
    for (const k of FORBIDDEN) assert.ok(!(k in rec), 'forbidden field written: ' + k);
  }
  const coreSrc = readFileSync(corePath, 'utf8').replace(/^\s*\/\/.*$/gm, '');
  assert.ok(!/stance-ground-truth/.test(coreSrc), 'core must not touch the ground-truth file');
  assert.ok(!/stance-score/.test(coreSrc), 'ingest core stays scorer-free (the cron wires the log-only hook)');
});

await t('a failed source writes nothing and does not block the others', async () => {
  const bad = new Set([core.SOURCES[1].url, core.SOURCES[N - 1].url]);
  const mixed = async (url, opts) => {
    if (url === core.SOURCES[1].url) throw new Error('network');
    if (url === core.SOURCES[N - 1].url) return fakeFetch(503, 'down')(url, opts);
    return fakeFetch(200, HTML)(url, opts);
  };
  const store = fakeStore();
  const { value: res, lines } = await quiet(() => fn.run({ fetch: mixed, store, now: NOW }));
  assert.equal(res.status, 207, 'partial run');
  const report = await res.json();
  assert.equal(report.results.filter((r) => !r.ok).length, 2);
  assert.equal(store.data.size, N - 2);
  for (const src of core.SOURCES) {
    const has = store.data.has(core.rawKey(src, '2026-11-07T08:00:00.000Z'));
    assert.equal(has, !bad.has(src.url), src.url);
  }
  assert.equal(lines.filter((l) => l.startsWith('raw-ingest: FAIL ')).length, 2);
  assert.equal(lines.filter((l) => l.startsWith('raw-ingest: OK ')).length, N - 2);
  assert.ok(lines.some((l) => l === `raw-ingest: run complete — ${N - 2} ok, 2 failed`));
});

await t('a hung source is cut off by a timeout signal rather than stalling the run', async () => {
  const seen = [];
  const store = fakeStore();
  await quiet(() => fn.run({ fetch: async (url, opts) => { seen.push(opts?.signal); return fakeFetch(200, HTML)(url); }, store, now: NOW }));
  assert.equal(seen.length, N);
  assert.ok(seen.every((sig) => sig instanceof AbortSignal), 'every fetch carries an AbortSignal');
  assert.ok(core.FETCH_TIMEOUT_MS > 0 && core.FETCH_TIMEOUT_MS <= 25_000);
});

await t('every source failing logs FAIL per source, returns 502, and writes nothing', async () => {
  for (const f of [fakeFetch(503, 'down'), async () => { throw new Error('network'); }]) {
    const store = fakeStore();
    const { value: res, lines } = await quiet(() => fn.run({ fetch: f, store, now: NOW }));
    assert.equal(res.status, 502);
    assert.equal(store.data.size, 0);
    assert.equal(lines.filter((l) => l.startsWith('raw-ingest: FAIL ')).length, N);
  }
});

// ── Phase 5: log-only candidate scoring on every stored record ──
const CORNYN_URL = 'https://www.cornyn.senate.gov/issues/health-care/';
const HC_HTML = '<html><body><h1>Health Care</h1><p>In the Senate, he will fight to lower prescription drug costs and cap insulin co-pays.</p>'
  + '<p>Our bill to bring down out-of-pocket costs for patients passed.</p><p>We will reduce insurance premiums for Texas families.</p></body></html>';
const byUrl = (map) => async (url, opts) => fakeFetch(200, map[url] ?? HTML)(url, opts);

await t('every stored record produces a logged candidate stance (both topics, new politician included)', async () => {
  const store = fakeStore(); const logs = [];
  const { lines } = await quiet(() => fn.run({ fetch: byUrl({ [CORNYN_URL]: HC_HTML }), store, now: NOW, log: (l) => logs.push(l) }));
  const cands = logs.filter((l) => l.startsWith('stance-score: candidate ')).map((l) => JSON.parse(l.slice('stance-score: candidate '.length)));
  assert.equal(cands.length, N, 'one candidate per stored record');
  for (const c of cands) {
    assert.ok(['support', 'oppose', 'mixed', 'no clear position'].includes(c.position));
    assert.equal(typeof c.confidence, 'number');
  }
  const cornyn = cands.find((c) => c.politician_id === 'john_cornyn');
  assert.ok(cornyn && cornyn.topic === 'healthcare_costs', 'new politician, second topic');
  assert.equal(cornyn.position, 'support');
  assert.equal(cornyn.confidence, 0.85);
  assert.ok(logs.some((l) => /^stance-score: john_cornyn\|healthcare_costs → CLEAR POSITION \(support, 0\.85\)/.test(l)));
  // Generic fixture → the rules find nothing clear, and say so in one line.
  assert.ok(logs.some((l) => /^stance-score: ken_paxton\|healthcare_costs → NO CLEAR POSITION/.test(l)));
  assert.equal(logs.filter((l) => / → (CLEAR POSITION|NO CLEAR POSITION)/.test(l)).length, N, 'one clear/no-clear note per record');
  // Log only: the store holds exactly the raw records, none carrying a candidate.
  assert.equal(store.data.size, N);
  for (const rec of store.data.values()) for (const k of FORBIDDEN) assert.ok(!(k in rec), k);
  assert.ok(lines.some((l) => l === `raw-ingest: run complete — ${N} ok, 0 failed`));
});

await t('a failed source gets no candidate; a failing scorer hook never blocks storage', async () => {
  const store = fakeStore(); const logs = [];
  const flaky = async (url, opts) => (url === CORNYN_URL ? fakeFetch(500, 'x')(url, opts) : fakeFetch(200, HTML)(url, opts));
  await quiet(() => fn.run({ fetch: flaky, store, now: NOW, log: (l) => logs.push(l) }));
  assert.equal(store.data.size, N - 1);
  assert.ok(!logs.some((l) => l.includes('john_cornyn')), 'no candidate for a failed pull');
  // Hook that throws: every record is still stored and the run completes.
  const store2 = fakeStore();
  const { lines } = await quiet(() => core.runRawIngest({ fetch: fakeFetch(200, HTML), store: store2, now: NOW, onRecord: () => { throw new Error('boom'); } }));
  assert.equal(store2.data.size, N);
  assert.equal(lines.filter((l) => l.startsWith('raw-ingest: hook error')).length, N);
  assert.ok(lines.some((l) => l === `raw-ingest: run complete — ${N} ok, 0 failed`));
});

await t('ground-truth file is unchanged', () => {
  const h = createHash('sha256').update(readFileSync(gtPath)).digest('hex');
  assert.equal(h, GT_SHA256);
});

if (failures) { console.error(`${failures} failing`); process.exit(1); }
console.log('raw ingest: all checks pass');
