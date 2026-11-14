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
const GT_SHA256 = 'f2889f2a8e30dbae8f4bd099719ed2c53f290a9fb1a017ca0a3601b46da59586';
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
const normUrl = (u) => String(u || "").trim().replace(/\/+$/, "").toLowerCase();
const NOW = () => new Date('2026-11-07T08:00:00.000Z');
const HTML = '<html><body><h1>Taxes &amp; Cost of Living</h1></body></html>';

await t('function and core exist; function is scheduled every minute and uses the core', () => {
  assert.ok(existsSync(fnPath), 'missing ' + fnPath);
  assert.ok(existsSync(corePath), 'missing ' + corePath);
  const src = readFileSync(fnPath, 'utf8');
  assert.match(src, /schedule:\s*"\* \* \* \* \*"/, 'every minute');
  assert.doesNotMatch(src, /schedule:\s*"0 \*\/4/, 'the old 4-hour schedule is gone');
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
  // Two fetch passes per run (stable-page check, then pull) stay inside the run budget, under the 30 s limit.
  assert.ok(core.RUN_BUDGET_MS <= 30_000 && core.RUN_BUDGET_MS >= 20_000, 'run budget ~25–30 s');
  assert.ok(core.DISCOVERY_TIMEOUT_MS + core.FETCH_TIMEOUT_MS < core.RUN_BUDGET_MS, 'worst-case fetch time leaves headroom');
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

// ── Phase 6: high-confidence candidates → Evidence Locker; simple discovery ──
const lockerPath = path.join(root, 'netlify/lib/evidence-locker-core.mjs');
const itemsFnPath = path.join(root, 'netlify/functions/evidence-locker-items.mts');
const locker = await import(pathToFileURL(lockerPath).href);
const gt = JSON.parse(readFileSync(gtPath, 'utf8'));
const lockerFakeStore = () => {
  const data = new Map();
  return {
    data,
    async list() { return { blobs: [...data.keys()].map((key) => ({ key })) }; },
    async get(k) { return data.has(k) ? JSON.parse(JSON.stringify(data.get(k))) : null; },
    async setJSON(k, v, opts = {}) {
      if (opts.onlyIfNew && data.has(k)) return { modified: false };
      data.set(k, JSON.parse(JSON.stringify(v))); return { modified: true };
    },
    async list() { return { blobs: [...data.keys()].map((key) => ({ key })) }; },
  };
};
const TALARICO_URL = core.SOURCES[0].url;
const TALARICO_HTML = '<html><body><h1>Taxes &amp; Cost of Living</h1>'
  + '<p>I will cut taxes for working families across Texas.</p>'
  + '<p>We will lower the cost of rent, groceries, utilities, and gas.</p>'
  + '<p>Cap credit card interest rates so families can keep more of their pay.</p></body></html>';
const REQUIRED = ['politician_id', 'topic', 'position', 'confidence', 'source_type', 'link', 'excerpt', 'date', 'attribution'];
const lockerItems = (st) => [...st.data.values()];
// Generic fixture pages for cost_living mention the topic, so they now land as
// mention items; the high-confidence assertions look at strong items only.
// The all-topics pass also lands items on other issues a page speaks to; those
// carry `page_topic`. The per-page assertions below look at the page's own topic.
const ownTopic = (i) => !i.page_topic;
const strongItems = (st) => lockerItems(st).filter((i) => ownTopic(i) && locker.storedStrength(i) === 'strong');

await t('a high-confidence candidate produces exactly one Evidence Locker item with every required field and a working link', async () => {
  const store = fakeStore(); const lockerStore = lockerFakeStore(); const logs = [];
  const { value: res } = await quiet(() => fn.run({ fetch: byUrl({ [CORNYN_URL]: HC_HTML }), store, lockerStore, now: NOW, log: (l) => logs.push(l) }));
  const report = await res.json();
  assert.equal(strongItems(lockerStore).length, 1, 'one strong Locker item (only Cornyn is clear + ≥0.8 on an official page)');
  const [item] = strongItems(lockerStore);
  assert.equal(item.strength, 'strong');
  for (const k of REQUIRED) assert.ok(item[k] !== undefined && item[k] !== null && item[k] !== '', 'missing ' + k);
  assert.equal(item.politician_id, 'john_cornyn');
  assert.equal(item.topic, 'healthcare_costs');
  assert.equal(item.position, 'support');
  assert.ok(item.confidence >= 0.8);
  assert.equal(item.source_type, 'official Senate issue page');
  assert.equal(item.date, '2026-11-07');
  assert.equal(item.attribution, 'Source: official Senate page');
  assert.ok(item.excerpt.length > 10 && item.excerpt.length <= 280);
  assert.ok(HC_HTML.includes(item.excerpt.replace(/…$/, '')), 'excerpt is verbatim page text');
  // Working link: a real https URL that answered 200 in this very run.
  const u = new URL(item.link);
  assert.equal(u.protocol, 'https:');
  assert.equal(item.link, CORNYN_URL);
  assert.equal(item.link_status, 200);
  assert.ok(report.results.find((r) => r.url === item.link)?.ok, 'link was pulled successfully this run');
  assert.equal(report.locker_writes.filter((w) => ownTopic(w) && w.strength === 'strong').length, 1);
  assert.equal(logs.filter((l) => l.startsWith('evidence-locker: WRITE ')).length, report.locker_writes.length, 'every write is logged');
  const crossCandidates = logs.filter((l) => l.startsWith('stance-score: cross-topic candidate ')).length;
  assert.equal(logs.filter((l) => /^evidence-locker: (WRITE|SKIP|EXISTS) /.test(l)).length, N + crossCandidates, 'every candidate (own topic + cross-topic) logs a write or a skip');
  assert.ok(logs.some((l) => /^evidence-locker: WRITE john_cornyn\|healthcare_costs → evidence-locker\//.test(l)));
  // The existing Locker components read it as a spotlight entry.
  const entry = locker.toSpotlightEntry(item);
  assert.equal(entry.issueKey, 'healthcare_costs');
  assert.equal(entry.source.url, item.link);
  assert.equal(entry.source.label, item.attribution);
  assert.ok(entry.headline && entry.facts.includes('“' + item.excerpt + '”'), 'quoted excerpt in facts');
  // Raw store is unchanged by the Locker step.
  assert.equal(store.data.size, N);
  for (const rec of store.data.values()) for (const k of FORBIDDEN) assert.ok(!(k in rec), k);
});

await t('Talarico cost of living writes only when it matches the ground-truth position', async () => {
  const lockerStore = lockerFakeStore(); const logs = [];
  await quiet(() => fn.run({ fetch: byUrl({ [TALARICO_URL]: TALARICO_HTML }), store: fakeStore(), lockerStore, now: NOW, log: (l) => logs.push(l) }));
  const items = lockerItems(lockerStore).filter((i) => i.politician_id === 'james_talarico' && ownTopic(i));
  assert.equal(items.length, 1);
  assert.equal(items[0].strength, 'strong');
  assert.equal(items[0].politician_id, 'james_talarico');
  assert.equal(items[0].position, gt.position);
  assert.equal(items[0].attribution, 'Source: campaign page');
  assert.ok(logs.some((l) => l.includes('matches ground-truth position')));
  const raw = { url: TALARICO_URL, fetched_at: NOW().toISOString(), source_type: 'campaign issue page', politician_id: 'james_talarico', topic: 'cost_living', http_status: 200 };
  const opposing = { politician_id: 'james_talarico', topic: 'cost_living', position: 'oppose', confidence: 0.9, sources: [{ excerpt: 'x'.repeat(20) }] };
  assert.equal(locker.lockerDecision(opposing, raw, gt).write, false, 'mismatch with ground truth never writes');
});

await t('a low-confidence or "no clear position" candidate produces no Locker item', async () => {
  const lockerStore = lockerFakeStore(); const logs = [];
  await quiet(() => fn.run({ fetch: fakeFetch(200, HTML), store: fakeStore(), lockerStore, now: NOW, log: (l) => logs.push(l) }));
  assert.equal(strongItems(lockerStore).length, 0, 'generic pages → no clear position → no strong item');
  assert.ok(lockerItems(lockerStore).every((i) => i.strength === 'mention'), 'only mention items from topic-mentioning pages');
  assert.ok(logs.some((l) => /^evidence-locker: SKIP ken_paxton\|healthcare_costs — position "no clear position" is not clear and no topic mentions/.test(l)));
  const raw = { url: CORNYN_URL, fetched_at: NOW().toISOString(), source_type: 'official Senate issue page', politician_id: 'john_cornyn', topic: 'healthcare_costs', http_status: 200 };
  const base = { politician_id: 'john_cornyn', topic: 'healthcare_costs', sources: [{ excerpt: 'We will reduce insurance premiums.' }] };
  // No topic statements recorded → below 0.8 writes nothing (no mention to fall back to).
  for (const c of [{ position: 'support', confidence: 0.2 }, { position: 'oppose', confidence: 0.29 },
    { position: 'no clear position', confidence: 0.3 }, { position: 'mixed', confidence: 0.9 }]) {
    const st = lockerFakeStore();
    const r = await locker.maybeWriteLockerItem({ ...base, ...c }, raw, { store: st, gt, log: () => {} });
    assert.equal(r.written, false, JSON.stringify(c));
    assert.equal(st.data.size, 0);
  }
  // ≥0.8 but not a campaign/official page (and not the ground-truth pair) → no item.
  const news = { ...raw, url: 'https://www.example-news.com/story', source_type: 'news report' };
  assert.equal(locker.lockerDecision({ ...base, position: 'support', confidence: 0.85 }, news, gt).write, false);
});

await t('existing Locker items are never overwritten', async () => {
  const lockerStore = lockerFakeStore();
  const run1 = () => quiet(() => fn.run({ fetch: byUrl({ [CORNYN_URL]: HC_HTML }), store: fakeStore(), lockerStore, now: NOW, log: () => {} }));
  await run1();
  const key = [...lockerStore.data.keys()].find((k) => k.startsWith('john_cornyn/'));
  lockerStore.data.set(key, { ...lockerStore.data.get(key), curator_note: 'keep me' });
  const logs = [];
  await quiet(() => fn.run({ fetch: byUrl({ [CORNYN_URL]: HC_HTML }), store: fakeStore(), lockerStore, now: () => new Date('2026-11-07T12:00:00.000Z'), log: (l) => logs.push(l) }));
  assert.equal(strongItems(lockerStore).length, 1);
  assert.equal(lockerStore.data.get(key).curator_note, 'keep me');
  assert.equal(lockerStore.data.get(key).date, '2026-11-07');
  assert.ok(logs.some((l) => l.startsWith('evidence-locker: EXISTS john_cornyn|healthcare_costs')));
  assert.equal(logs.filter((l) => l.startsWith('evidence-locker: WRITE')).length, 0);
  // A strong item is not replaced by a weaker read of the same page either.
  const raw = { url: CORNYN_URL, fetched_at: NOW().toISOString(), source_type: 'official Senate issue page', politician_id: 'john_cornyn', topic: 'healthcare_costs', http_status: 200 };
  const weak = { politician_id: 'john_cornyn', topic: 'healthcare_costs', position: 'support', confidence: 0.4, sources: [{ excerpt: 'We will reduce insurance premiums.', statements: [{}] }] };
  const r = await locker.maybeWriteLockerItem(weak, raw, { store: lockerStore, gt, log: () => {} });
  assert.equal(r.written, false);
  assert.equal(lockerStore.data.get(key).curator_note, 'keep me');
  assert.equal(lockerStore.data.get(key).confidence, 0.85);
});

// ── Weak and mention signals → Evidence Locker ──
const CORNYN_RAW = { url: CORNYN_URL, fetched_at: NOW().toISOString(), source_type: 'official Senate issue page', politician_id: 'john_cornyn', topic: 'healthcare_costs', http_status: 200 };
const IMPL_HTML = '<html><body><h1>Health Care</h1><p>Make insulin affordable again for every family.</p></body></html>';

await t('a 0.4 clear candidate produces one weak Locker item (fields as before, plus strength)', async () => {
  const st = lockerFakeStore(); const logs = [];
  const cand = { politician_id: 'john_cornyn', topic: 'healthcare_costs', position: 'support', confidence: 0.4, confidence_reason: 'r', rules_version: 'v',
    sources: [{ excerpt: 'We will reduce insurance premiums.', implication_count: 0, statements: [{ kind: 'clear' }] }] };
  const r = await locker.maybeWriteLockerItem(cand, CORNYN_RAW, { store: st, gt, log: (l) => logs.push(l) });
  assert.equal(r.written, true, r.reason);
  assert.equal(st.data.size, 1);
  const [item] = lockerItems(st);
  for (const k of REQUIRED) assert.ok(item[k] !== undefined && item[k] !== null && item[k] !== '', 'missing ' + k);
  assert.equal(item.strength, 'weak');
  assert.equal(item.confidence, 0.4);
  assert.ok(!('implication_count' in item), 'no implication count when none present');
  assert.ok(logs.some((l) => l.startsWith('evidence-locker: WRITE john_cornyn|healthcare_costs') && l.includes('"strength":"weak"')));
});

await t('an implication-driven 0.4 clear candidate produces one weak item carrying the implication count', async () => {
  const st = lockerFakeStore(); const logs = [];
  const cand = { politician_id: 'john_cornyn', topic: 'healthcare_costs', position: 'support', confidence: 0.4, confidence_reason: 'r', rules_version: 'v',
    sources: [{ excerpt: 'He wrote the law that capped insulin co-pays for seniors.', implication_count: 2, statements: [{ kind: 'implication' }, { kind: 'implication' }] }] };
  const r = await locker.maybeWriteLockerItem(cand, CORNYN_RAW, { store: st, gt, log: (l) => logs.push(l) });
  assert.equal(r.written, true, r.reason);
  assert.equal(st.data.size, 1);
  const [item] = lockerItems(st);
  assert.equal(item.strength, 'weak');
  assert.equal(item.implication_count, 2);
  const entry = locker.toSpotlightEntry(item);
  assert.equal(entry.pipeline.implication_count, 2);
  assert.equal(entry.pipeline.strength, 'weak');
  assert.ok(logs.some((l) => l.startsWith('evidence-locker: WRITE') && l.includes('"implication_count":2')));
  // End to end: a real implication-only page (scorer R6, below 0.8) lands as one weak item via the cron.
  const ls = lockerFakeStore(); const runLogs = [];
  await quiet(() => fn.run({ fetch: byUrl({ [CORNYN_URL]: IMPL_HTML }), store: fakeStore(), lockerStore: ls, now: NOW, log: (l) => runLogs.push(l) }));
  const cornyn = lockerItems(ls).filter((i) => i.politician_id === 'john_cornyn' && ownTopic(i));
  assert.equal(cornyn.length, 1);
  assert.equal(cornyn[0].strength, 'weak');
  assert.equal(cornyn[0].position, 'support');
  assert.ok(cornyn[0].confidence >= 0.3 && cornyn[0].confidence < 0.8, String(cornyn[0].confidence));
  assert.equal(cornyn[0].implication_count, 1);
});

await t('a "no clear position" candidate with mentions and an excerpt produces one mention item', async () => {
  const st = lockerFakeStore(); const logs = [];
  const cand = { politician_id: 'john_cornyn', topic: 'healthcare_costs', position: 'no clear position', confidence: 0.3, confidence_reason: 'r', rules_version: 'v',
    sources: [{ excerpt: 'Health care matters to Texas families.', implication_count: 0, statements: [{ kind: 'mention' }] }] };
  const r = await locker.maybeWriteLockerItem(cand, CORNYN_RAW, { store: st, gt, log: (l) => logs.push(l) });
  assert.equal(r.written, true, r.reason);
  assert.equal(st.data.size, 1);
  const [item] = lockerItems(st);
  assert.equal(item.strength, 'mention');
  assert.equal(item.position, 'no clear position');
  assert.equal(item.excerpt, 'Health care matters to Texas families.');
  assert.ok(logs.some((l) => l.startsWith('evidence-locker: WRITE') && l.includes('"strength":"mention"')));
  // End to end: the generic fixture mentions the cost of living → mention items from the cron.
  const ls = lockerFakeStore();
  const { value: res } = await quiet(() => fn.run({ fetch: fakeFetch(200, HTML), store: fakeStore(), lockerStore: ls, now: NOW, log: () => {} }));
  const report = await res.json();
  const costLiving = core.SOURCES.filter((s) => s.topic === 'cost_living' && locker.isCampaignOrOfficial(s.source_type, s.url)).length;
  assert.ok(costLiving > 0);
  assert.equal(lockerItems(ls).length, costLiving, 'one mention item per campaign/official cost-of-living page');
  assert.ok(report.locker_writes.every((w) => w.strength === 'mention'));
});

await t('a candidate below 0.3 with no mentions or no excerpt writes nothing, and the skip is logged with a reason', async () => {
  const cases = [
    [{ position: 'support', confidence: 0.2, sources: [{ excerpt: 'We will reduce insurance premiums.', statements: [] }] }, /no topic mentions/],
    [{ position: 'no clear position', confidence: 0, sources: [{ excerpt: null, statements: [] }] }, /no topic mentions/],
    [{ position: 'support', confidence: 0.1, sources: [{ excerpt: '', statements: [{ kind: 'mention' }] }] }, /no excerpt/],
    [{ position: 'no clear position', confidence: 0.3, sources: [{ excerpt: null, statements: [{ kind: 'mention' }] }] }, /no excerpt/],
  ];
  for (const [c, why] of cases) {
    const st = lockerFakeStore(); const logs = [];
    const r = await locker.maybeWriteLockerItem({ politician_id: 'john_cornyn', topic: 'healthcare_costs', ...c }, CORNYN_RAW, { store: st, gt, log: (l) => logs.push(l) });
    assert.equal(r.written, false, JSON.stringify(c));
    assert.equal(st.data.size, 0);
    assert.equal(logs.length, 1);
    assert.match(logs[0], /^evidence-locker: SKIP john_cornyn\|healthcare_costs — /);
    assert.match(logs[0], why);
  }
});

await t('a weak or mention item is upgraded by a stronger read of the same page, never downgraded', async () => {
  const st = lockerFakeStore();
  const mk = (position, confidence) => ({ politician_id: 'john_cornyn', topic: 'healthcare_costs', position, confidence,
    sources: [{ excerpt: 'We will reduce insurance premiums.', statements: [{ kind: 'mention' }] }] });
  assert.equal((await locker.maybeWriteLockerItem(mk('no clear position', 0.3), CORNYN_RAW, { store: st, gt, log: () => {} })).written, true);
  assert.equal((await locker.maybeWriteLockerItem(mk('no clear position', 0.3), CORNYN_RAW, { store: st, gt, log: () => {} })).written, false);
  assert.equal((await locker.maybeWriteLockerItem(mk('support', 0.5), CORNYN_RAW, { store: st, gt, log: () => {} })).written, true);
  assert.equal(lockerItems(st)[0].strength, 'weak');
  assert.equal((await locker.maybeWriteLockerItem(mk('no clear position', 0.3), CORNYN_RAW, { store: st, gt, log: () => {} })).written, false);
  assert.equal((await locker.maybeWriteLockerItem(mk('support', 0.85), CORNYN_RAW, { store: st, gt, log: () => {} })).written, true);
  assert.equal(st.data.size, 1);
  assert.equal(lockerItems(st)[0].strength, 'strong');
  assert.equal((await locker.maybeWriteLockerItem(mk('support', 0.9), CORNYN_RAW, { store: st, gt, log: () => {} })).written, false, 'strong never overwritten');
  assert.equal(lockerItems(st)[0].confidence, 0.85);
});

const LONG_HTML = '<html><body><h1>Issues</h1>' + '<p>Priorities for Texas families and their budgets.</p>'.repeat(8) + '</body></html>';
await t('discovery adds one new stable URL to the run without exceeding the source cap', async () => {
  const pattern = core.DISCOVERY_PATTERNS.find((p) => p.politician_id === 'john_cornyn');
  const store = fakeStore(); const logs = [];
  const { value: res } = await quiet(() => fn.run({ fetch: byUrl({ [pattern.url]: LONG_HTML }), store, now: NOW, log: (l) => logs.push(l), discover: { patterns: [pattern] } }));
  const report = await res.json();
  assert.equal(report.discovered.length, 1);
  assert.equal(report.discovered[0].url, pattern.url);
  assert.equal(report.results.length, N + 1);
  assert.ok(report.results.length < 12, 'under 12 sources');
  assert.equal(store.data.size, N + 1, 'the discovered page is pulled and stored as its own raw record');
  assert.ok(store.data.has(core.rawKey(pattern, NOW().toISOString())));
  assert.ok(!core.SOURCES.some((s) => s.url === pattern.url), 'it really was new');
  assert.equal(logs.filter((l) => l.startsWith('discovery: NEW ')).length, 1, 'every new URL is logged');
  assert.ok(logs.some((l) => l.includes(pattern.url) && l.startsWith('discovery: NEW john_cornyn|healthcare_costs')));
  // Base source keys are unchanged by discovery.
  for (const src of core.SOURCES) assert.ok(store.data.has(core.rawKey(src, NOW().toISOString())), src.url);
});

await t('discovery never exceeds the cap, skips unstable pages, and only checks politicians in the source list', async () => {
  const CAP = 11; // a cap smaller than SOURCES + patterns, so the CAP path is exercised
  const pols = new Set(core.SOURCES.map((s) => s.politician_id));
  assert.ok(core.DISCOVERY_PATTERNS.every((p) => pols.has(p.politician_id) && p.source_id && /^https:\/\//.test(p.url)));
  assert.equal(new Set(core.DISCOVERY_PATTERNS.map((p) => p.politician_id)).size, pols.size, 'one pattern per politician');
  // Every pattern stable → filled to the cap, the rest logged as CAP.
  const logs = [];
  const { value: d } = await quiet(() => core.discoverSources(core.SOURCES, { fetch: fakeFetch(200, LONG_HTML), log: (l) => logs.push(l), max: CAP }));
  assert.equal(d.sources.length, CAP);
  assert.equal(d.added.length, CAP - N);
  assert.equal(logs.filter((l) => l.startsWith('discovery: CAP ')).length, core.DISCOVERY_PATTERNS.length - d.added.length);
  // 404, tiny body, redirect to home page, or an already-listed URL → not added.
  const home = async (url) => ({ ok: true, status: 200, url: new URL(url).origin + '/', headers: new Map([['content-type', 'text/html']]), text: async () => LONG_HTML });
  for (const f of [fakeFetch(404, LONG_HTML), fakeFetch(200, '<p>tiny</p>'), home, async () => { throw new Error('network'); }]) {
    const r = await core.discoverSources(core.SOURCES, { fetch: f, log: () => {} });
    assert.equal(r.added.length, 0);
    assert.equal(r.sources.length, N);
  }
  const dup = await core.discoverSources(core.SOURCES, { fetch: fakeFetch(200, LONG_HTML), log: () => {}, patterns: [{ ...core.SOURCES[0], source_id: 'x' }] });
  assert.equal(dup.added.length, 0, 'a URL already in the pull list is not re-added');
});

await t('the scheduled entry point turns on discovery and Locker writes; the items endpoint serves Locker entries', async () => {
  const src = readFileSync(fnPath, 'utf8');
  assert.match(src, /lockerStore:\s*getStore\(LOCKER_STORE_NAME\)/);
  assert.match(src, /discover:\s*true/);
  assert.equal(locker.LOCKER_STORE_NAME, 'evidence-locker');
  const items = await import(pathToFileURL(itemsFnPath).href);
  const lockerStore = lockerFakeStore();
  await quiet(() => fn.run({ fetch: byUrl({ [CORNYN_URL]: HC_HTML }), store: fakeStore(), lockerStore, now: NOW, log: () => {} }));
  const body = await items.listLockerEntries(lockerStore);
  assert.equal(body.count, lockerStore.data.size);
  const own = body.items.john_cornyn.filter((e) => e.issueKey === 'healthcare_costs');
  assert.equal(own.length, 1);
  assert.equal(own[0].source.url, CORNYN_URL);
  for (const e of body.items.john_cornyn) assert.equal(e.source.url, CORNYN_URL, 'cross-topic entries cite the same page');
  assert.equal(items.config.path, '/api/evidence-locker/items');
});

await t('ground-truth file is unchanged', () => {
  const h = createHash('sha256').update(readFileSync(gtPath)).digest('hex');
  assert.equal(h, GT_SHA256);
});

// ── Coverage pass: roster rotation, official sources, manual review flags ──
const seatHolders = await import(pathToFileURL(path.join(root, 'netlify/lib/seat-holders.mjs')).href);
const STANCE_SRC = ['politician-stances.js', 'politician-stances-core.js', 'politician-stances-ext.js']
  .filter((f) => existsSync(path.join(root, f))).map((f) => readFileSync(path.join(root, f), 'utf8')).join('\n');
const hasBoard = (pid) => Object.values(seatHolders.SEAT_HOLDERS).some((h) => h && h.pid === pid);
const hasStances = (pid) => new RegExp(`^\\s*['"]?${pid}['"]?\\s*:\\s*\\[`, 'm').test(STANCE_SRC);
// Stated positions on file: issueKey entries in the politician's stance block(s).
const STANCE_BLOCKS = (() => {
  const re = /^\s*['"]?([a-z0-9_]+)['"]?\s*:\s*\[/gm; const starts = []; let m;
  while ((m = re.exec(STANCE_SRC))) starts.push([m[1], m.index]);
  const out = {};
  starts.forEach(([pid, at], i) => { const seg = STANCE_SRC.slice(at, starts[i + 1]?.[1] ?? STANCE_SRC.length); out[pid] = (out[pid] || 0) + (seg.match(/\bissueKey\s*:/g) || []).length; });
  return out;
})();
const stanceCount = (pid) => STANCE_BLOCKS[pid] || 0;
const { REQUESTED_POLITICIANS } = await import('../netlify/lib/raw-ingest-expansion.mjs');
const REQUESTED = new Set(REQUESTED_POLITICIANS.map((r) => r.politician_id));
const { RETIRED_SOURCES, retiredSourcesLine } = await import('../netlify/lib/raw-ingest-retired.mjs');
const RETIRED_URLS_BY_PID = new Map();
for (const r of RETIRED_SOURCES) (RETIRED_URLS_BY_PID.get(r.politician_id) || RETIRED_URLS_BY_PID.set(r.politician_id, new Set()).get(r.politician_id)).add(r.url);
const ACTIVE_ROSTER = core.ROSTER.filter((r) => r.sources.length || r.official);
const PREVIOUS = new Set(core.PREVIOUS_ROSTER);
const ORIGINAL = new Set(core.ORIGINAL_FIVE);
const SCORED = new Set((await import('../netlify/lib/stance-score-core.mjs')).SCORED_TOPICS);
const memStore = () => {
  const data = new Map();
  return { data, async get(k) { return data.has(k) ? JSON.parse(JSON.stringify(data.get(k))) : null; },
    async setJSON(k, v) { data.set(k, JSON.parse(JSON.stringify(v))); return { modified: true }; } };
};

await t('roster: priority flags are true to the data, and prioritised people come first in the rotation', () => {
  assert.ok(core.ROSTER.length > 5, 'more than the original five');
  for (const p of core.ORIGINAL_FIVE) assert.ok(core.ROSTER.some((r) => r.politician_id === p), `original ${p} stays in the roster`);
  assert.equal(new Set(core.ROSTER.map((r) => r.politician_id)).size, core.ROSTER.length, 'one roster row per politician');
  for (const r of core.ROSTER) {
    assert.equal(r.has_board, hasBoard(r.politician_id), `${r.politician_id}: has_board matches SEAT_HOLDERS`);
    assert.equal(r.has_stances, hasStances(r.politician_id), `${r.politician_id}: has_stances matches the stance data`);
    const want = r.has_board && stanceCount(r.politician_id) >= core.SEVERAL_STANCES ? 1 : (r.has_board || r.has_stances) ? 2 : 3;
    assert.equal(r.tier, want, `${r.politician_id}: tier ${r.tier} should be ${want} (${stanceCount(r.politician_id)} stated positions)`);
    if (r.tier === 3) assert.ok(PREVIOUS.has(r.politician_id) || REQUESTED.has(r.politician_id), `${r.politician_id}: a tier-3 row is only kept from the previous 13`);
    if (!PREVIOUS.has(r.politician_id) && !REQUESTED.has(r.politician_id)) assert.ok(r.has_board || r.has_stances, `${r.politician_id}: a new roster row has a board or stated positions`);
    for (const s of r.sources) {
      assert.equal(s.politician_id, r.politician_id);
      // New roster pages must be campaign/official; the original five keep their configured SOURCES rows.
      if (ORIGINAL.has(r.politician_id) && s.source_id !== "known-homepage" && !s.source_class) assert.ok(core.SOURCES.includes(s), `${s.url} is one of the configured SOURCES`);
      else assert.ok(locker.isCampaignOrOfficial(s.source_type, s.url), `${s.url} is a campaign/official page`);
      // Extra source types carry the issue key the site already cites the page
      // for; every other page stays on the two original topic keys.
      if (s.source_class) assert.ok(SCORED.has(s.topic), `${s.url}: ${s.topic} is a scored issue key`);
      else assert.ok(['cost_living', 'healthcare_costs'].includes(s.topic));
    }
    const o = r.official;
    if (!o && REQUESTED.has(r.politician_id)) {
      assert.ok(r.sources.length || r.note, "a missing source has an explicit note");
      continue;
    }
    assert.ok(o, `${r.politician_id} has an official pattern`);
    assert.equal(o.politician_id, r.politician_id);
    assert.ok(Object.keys(core.OFFICIAL_KINDS).includes(o.official_kind), `${o.url}: official_kind`);
    assert.ok(/\.gov$/.test(new URL(o.url).hostname), `${o.url} is on a .gov host`);
    assert.equal(core.sourceKind(o), 'official');
    assert.ok(o.source_id && !r.sources.some((s) => s.url === o.url), `${o.url} is not one of their configured pages`);
  }
  const kinds = new Set(core.ROSTER.filter((r) => r.official).map((r) => r.official.official_kind));
  for (const k of ['state_legislature', 'congress', 'executive']) assert.ok(kinds.has(k), `an official ${k} pattern exists`);
  const fsrc = readFileSync(fnPath, 'utf8');
  assert.match(fsrc, /rotate:\s*true/, 'the scheduled entry point rotates');
  assert.match(fsrc, /rotationStore:\s*getStore\(ROTATION_STORE_NAME\)/, 'the rotation state is persisted');
  assert.equal(core.MAX_SOURCES_PER_RUN, 36, 'per-run cap: 30–40 sources');
  const order = core.rotationOrder().map((r) => r.tier);
  assert.deepEqual(order, [...order].sort((a, b) => a - b), 'rotation order is by tier');
});

await t('roster expansion: beyond the previous 13, with priority order respected across a cycle', async () => {
  for (const p of core.PREVIOUS_ROSTER) assert.ok(core.ROSTER.some((r) => r.politician_id === p), `previous ${p} stays in the roster`);
  const extra = core.ROSTER.filter((r) => !PREVIOUS.has(r.politician_id));
  assert.ok(core.ROSTER.length > 13 && extra.length >= 5, `roster grew beyond the previous 13 (${core.ROSTER.length})`);
  assert.ok(extra.some((r) => r.tier === 1), 'new tier-1 politicians were added');
  // Successive runs through one cycle: concatenated plans follow the priority order exactly.
  const rot = memStore(); const visited = []; const lines = [];
  for (let i = 0; i < core.ROSTER.length; i++) {
    const { value: res, lines: l } = await quiet(() => fn.run({ fetch: fakeFetch(200, LONG_HTML), store: fakeStore(), now: NOW,
      rotate: { counts: {} }, rotationStore: rot, log: (x) => lines.push(x) }));
    const r = await res.json();
    lines.push(...l);
    if (r.plan.cycle !== 0) break;
    visited.push(...r.plan.politicians);
    assert.ok(r.results.length <= core.MAX_SOURCES_PER_RUN, `run ${i} within cap`);
  }
  assert.deepEqual(visited, core.priorityOrder(ACTIVE_ROSTER, {}).map((x) => x.r.politician_id), 'a cycle visits everyone once, in priority order');
  const tiers = visited.map((p) => core.ROSTER.find((r) => r.politician_id === p).tier);
  assert.deepEqual(tiers, [...tiers].sort((a, b) => a - b), 'tier 1 before tier 2 before tier 3');
  const first = core.planRun({}, { counts: {} });
  assert.ok(first.politicians.every((p) => core.ROSTER.find((r) => r.politician_id === p).tier === 1), 'the first run is all tier 1');
  // Run log: roster size, who was included, and the baseline line.
  assert.ok(lines.some((l) => l.startsWith(`raw-ingest: roster — ${core.ROSTER.length} politician(s)`)), 'roster size logged');
  assert.ok(lines.some((l) => l.startsWith('raw-ingest: run plan — cycle 0 · ')), 'run plan logged');
  assert.ok(lines.some((l) => l.startsWith('raw-ingest: baseline progress — 0 politician + issue pair(s)')), 'baseline progress logged');
});

await t('per-issue baseline: a filled politician + issue is not chased on later runs; mentions never count', async () => {
  const ls = lockerFakeStore();
  let n = 0;
  const put = (pid, topic, strength, extra = {}) => {
    const it = { politician_id: pid, topic, position: strength === 'mention' ? 'unclear' : 'support',
      confidence: strength === 'strong' ? 0.9 : strength === 'weak' ? 0.5 : 0.1, strength, link: `https://example.gov/${pid}/${n++}`, excerpt: 'x', ...extra };
    ls.data.set(locker.lockerKey(it), it);
  };
  const HEALTH = 'https://crockett.house.gov/issues/health';
  const plan = async (rot = null) => {
    const { value } = await quiet(() => fn.run({ fetch: fakeFetch(404, ''), store: fakeStore(), now: NOW, lockerStore: ls,
      rotate: rot ? true : { state: {} }, ...(rot ? { rotationStore: rot } : {}), log: () => {} }));
    return (await value.json()).plan;
  };
  // Mentions, hidden items and 2 weak do not fill crockett|healthcare_costs.
  for (let i = 0; i < 5; i++) put('crockett', 'healthcare_costs', 'mention');
  put('crockett', 'healthcare_costs', 'strong', { review: { status: 'hidden' } });
  put('crockett', 'healthcare_costs', 'weak'); put('crockett', 'healthcare_costs', 'weak');
  const c0 = await locker.lockerBaselineCounts(ls, { log: () => {} });
  assert.deepEqual(c0['crockett|healthcare_costs'], { strong: 0, weak: 2 });
  assert.ok(!core.isFilled(c0, 'crockett', 'healthcare_costs'), '2 weak is not the baseline');
  assert.ok(core.planRun({}, { counts: c0 }).sources.some((s) => s.url === HEALTH), 'still chased below the baseline');
  // A third weak item fills it: the health page is no longer pulled, the open issue still is.
  put('crockett', 'healthcare_costs', 'weak');
  const c1 = await locker.lockerBaselineCounts(ls, { log: () => {} });
  assert.ok(core.isFilled(c1, 'crockett', 'healthcare_costs'), '3 weak fills the issue');
  const p1 = core.planRun({}, { counts: c1 });
  assert.ok(p1.politicians.includes('crockett'), 'crockett still has an open issue');
  assert.ok(!p1.sources.some((s) => s.url === HEALTH), 'filled issue is not chased');
  assert.ok(p1.sources.some((s) => s.politician_id === 'crockett' && s.topic === 'cost_living'), 'open issue still pulled');
  assert.deepEqual(p1.skipped.filter((x) => x.politician_id === 'crockett').map((x) => x.topic), ['healthcare_costs']);
  // Mix of the same weight: 1 strong alone, or 1 weak + … does not; 1 strong does.
  assert.ok(core.isFilled({ 'a|t': { strong: 1, weak: 0 } }, 'a', 't'));
  assert.ok(!core.isFilled({ 'a|t': { strong: 0, weak: 2 } }, 'a', 't'));
  // Every issue of the top politician filled (1 strong on their only topic) → deprioritised.
  const top = core.priorityOrder(core.ROSTER, {})[0];
  const topics = [...new Set([...top.r.sources, top.r.official].map((s) => s.topic))];
  assert.ok((await plan()).politicians.includes(top.r.politician_id), `${top.r.politician_id} leads the first run when open`);
  for (const t of topics) put(top.r.politician_id, t, 'strong');
  const logs = []; const rot = memStore();
  const { value: res, lines: runLines } = await quiet(() => fn.run({ fetch: fakeFetch(404, ''), store: fakeStore(), now: NOW, rotate: true, rotationStore: rot, lockerStore: ls, log: (l) => logs.push(l) }));
  const r = await res.json();
  assert.ok(!r.plan.politicians.includes(top.r.politician_id), `${top.r.politician_id} with every issue filled drops out of the first run`);
  assert.ok(r.baseline.reached.some((x) => x.politician_id === 'crockett' && x.topic === 'healthcare_costs'));
  const line = logs.find((l) => l.startsWith('raw-ingest: baseline progress — '));
  assert.ok(line && line.includes('crockett|healthcare_costs (0s/3w)') && line.includes(`${top.r.politician_id}|${topics[0]} (1s/0w)`), `baseline line names the filled pairs: ${line}`);
  assert.ok([...logs, ...runLines].some((l) => l.startsWith('raw-ingest: run plan — ') && l.includes('not chased (filled): crockett|healthcare_costs')), 'skipped pair logged');
  // Later runs in the cycle: the deprioritised politician comes only after everyone with an open issue.
  const visited = [...r.plan.politicians];
  for (let i = 0; i < core.ROSTER.length; i++) {
    const x = await plan(rot);
    if (x.cycle !== 0) break;
    visited.push(...x.politicians);
  }
  assert.equal(visited[visited.length - 1], top.r.politician_id, 'checked last in the cycle');
  const counts = await locker.lockerBaselineCounts(ls, { log: () => {} });
  const c1p = core.planRun({ cycle: 1 }, { counts });
  assert.ok(!c1p.politicians.includes(top.r.politician_id) && !c1p.remaining_in_cycle.includes(top.r.politician_id), 'skips cycles that are not its turn');
  const others = core.ROSTER.map((x) => x.politician_id).filter((p) => p !== top.r.politician_id);
  assert.deepEqual(core.planRun({ cycle: 3, done: others }, { counts }).politicians, [top.r.politician_id], 'back in on its cycle');
  // A filled issue can still take anything new the run happens to find.
  const cornynSrc = core.SOURCES.find((s) => s.url === CORNYN_URL);
  const ls2 = lockerFakeStore();
  for (let i = 0; i < 3; i++) { const it = { politician_id: 'john_cornyn', topic: 'healthcare_costs', position: 'support', confidence: 0.5, strength: 'weak', link: `https://example.gov/c${i}`, excerpt: 'x' }; ls2.data.set(locker.lockerKey(it), it); }
  await quiet(() => fn.run({ fetch: byUrl({ [CORNYN_URL]: HC_HTML }), store: fakeStore(), lockerStore: ls2, now: NOW, sources: [cornynSrc], log: () => {} }));
  assert.ok(ls2.data.has(locker.lockerKey({ politician_id: 'john_cornyn', topic: 'healthcare_costs', link: CORNYN_URL })), 'new item on a filled issue is still stored');
});

await t('a rotated run includes politicians beyond the original five and at least one official source, within the cap', async () => {
  const store = fakeStore(); const logs = [];
  const { value: res, lines } = await quiet(() => fn.run({ fetch: fakeFetch(200, LONG_HTML), store, now: NOW,
    rotate: { state: {} }, log: (l) => logs.push(l) }));
  const report = await res.json();
  const pols = new Set(report.included.politicians);
  assert.ok([...pols].some((p) => !ORIGINAL.has(p)), `beyond the original five (got ${[...pols].join(', ')})`);
  assert.ok(report.discovered.length >= 1 && report.discovered.every((d) => d.kind === 'official'), 'official patterns joined the pull list');
  assert.ok((report.included.kinds.official || 0) >= 1, 'at least one official source pulled');
  assert.ok(report.results.length <= core.MAX_SOURCES_PER_RUN, `cap respected (${report.results.length})`);
  assert.equal(report.results.length, report.included.count);
  assert.equal(store.data.size, report.results.length, 'every included source pulled and stored');
  // Logged: who and which source types.
  const plan = lines.find((l) => l.startsWith('raw-ingest: run plan — '));
  const inc = lines.find((l) => l.startsWith('raw-ingest: run included '));
  assert.ok(plan && inc, 'run plan and run included lines are logged');
  for (const p of pols) assert.ok(inc.includes(p), `run log names ${p}`);
  assert.ok(/source kinds: \{.*"official":\d+/.test(inc) && /source types: \{/.test(inc), 'run log names the source kinds and types');
  assert.ok(logs.some((l) => l.startsWith('discovery: NEW ') && /newsroom|legislature|key-issue/.test(l)), 'each new official URL is logged');
});

await t('successive runs rotate through the whole roster, and every run respects the cap', async () => {
  const rot = memStore(); const seen = new Set(); const sets = [];
  rot.data.set(core.ROTATION_KEY, { cursor: 4 }); // an older cursor doc starts a fresh cycle
  for (let i = 0; i < core.ROSTER.length * 2; i++) {
    const { value: res } = await quiet(() => fn.run({ fetch: fakeFetch(200, LONG_HTML), store: fakeStore(), now: NOW,
      rotate: { counts: {} }, rotationStore: rot, log: () => {} }));
    const r = await res.json();
    assert.ok(r.results.length <= core.MAX_SOURCES_PER_RUN, `run ${i}: ${r.results.length} ≤ cap`);
    assert.ok(r.plan.planned_size <= core.MAX_SOURCES_PER_RUN, `run ${i}: planned ${r.plan.planned_size} ≤ cap`);
    r.plan.politicians.forEach((p) => seen.add(p));
    sets.push(r.plan.politicians.join(','));
    assert.deepEqual(rot.data.get(core.ROTATION_KEY).done, r.plan.state.done, 'state persisted');
  }
  assert.notEqual(sets[0], sets[1], 'consecutive runs check different people');
  assert.equal(seen.size, ACTIVE_ROSTER.length, 'every roster politician is reached');
  // Cap holds at every point in a cycle, including a cap smaller than one politician.
  const ids = core.priorityOrder(ACTIVE_ROSTER, {}).map((x) => x.r.politician_id);
  for (let c = 0; c < ids.length; c++) {
    for (const max of [core.MAX_SOURCES_PER_RUN, 4, 1]) {
      const p = core.planRun({ done: ids.slice(0, c) }, { max });
      assert.ok(p.size <= max && p.size >= 1, `planRun(done ${c}, max ${max}) → ${p.size}`);
      const d = await core.discoverSources(p.sources, { fetch: fakeFetch(200, LONG_HTML), log: () => {}, patterns: p.patterns, max, restrict: false });
      assert.ok(d.sources.length <= max, 'cap holds after discovery');
      assert.equal(new Set(d.sources.map((s) => s.url)).size, d.sources.length, 'no duplicate URLs in a run');
    }
  }
  // An unstable official page is skipped, not pulled.
  const p0 = core.planRun({});
  const { value: res } = await quiet(() => fn.run({ fetch: async (u, o) => (p0.patterns.some((x) => x.url === u) ? fakeFetch(404, LONG_HTML)(u, o) : fakeFetch(200, LONG_HTML)(u, o)),
    store: fakeStore(), now: NOW, rotate: { state: {} }, log: () => {} }));
  const r0 = await res.json();
  assert.equal(r0.discovered.length, 0);
  assert.equal(r0.results.length, p0.sources.length);
});

await t('review flags: the cron never overwrites a manually flagged item', async () => {
  const cornynSrc = core.SOURCES.find((s) => s.url === CORNYN_URL);
  const key = locker.lockerKey({ politician_id: 'john_cornyn', topic: 'healthcare_costs', link: CORNYN_URL });
  for (const status of ['reviewed', 'needs_edit', 'hidden']) {
    // A weak item already there would normally be upgraded by this strong read.
    const ls = lockerFakeStore();
    const prior = { politician_id: 'john_cornyn', topic: 'healthcare_costs', position: 'support', confidence: 0.4, strength: 'weak',
      link: CORNYN_URL, excerpt: 'editor-checked text', attribution: 'Source: official Senate page', date: '2026-11-01' };
    ls.data.set(key, prior);
    const logs = [];
    const { value: res } = await quiet(() => fn.run({ fetch: byUrl({ [CORNYN_URL]: HC_HTML }), store: fakeStore(), lockerStore: ls, now: NOW,
      sources: [cornynSrc], reviewFlags: { items: [{ key, status }] }, log: (l) => logs.push(l) }));
    const report = await res.json();
    assert.deepEqual(ls.data.get(key), prior, `${status}: item unchanged`);
    assert.equal(report.locker_writes.filter((w) => w.topic === 'healthcare_costs').length, 0);
    assert.ok(logs.some((l) => l.startsWith('evidence-locker: FLAGGED ') && l.includes(`"${status}"`)), `${status}: FLAGGED is logged`);
  }
  // Flag matched by politician + link, with nothing in the store yet: still never written.
  const ls2 = lockerFakeStore();
  await quiet(() => fn.run({ fetch: byUrl({ [CORNYN_URL]: HC_HTML }), store: fakeStore(), lockerStore: ls2, now: NOW,
    sources: [cornynSrc], reviewFlags: { items: [{ politician_id: 'john_cornyn', link: CORNYN_URL + '#x', status: 'hidden' }] }, log: () => {} }));
  assert.equal(ls2.data.size, 0, 'a hidden flag by link blocks the write');
  // A review field on the stored item itself also protects it.
  const ls3 = lockerFakeStore();
  const own = { politician_id: 'john_cornyn', topic: 'healthcare_costs', position: 'support', confidence: 0.4, strength: 'weak', link: CORNYN_URL, excerpt: 'x', review: { status: 'reviewed' } };
  ls3.data.set(key, own);
  await quiet(() => fn.run({ fetch: byUrl({ [CORNYN_URL]: HC_HTML }), store: fakeStore(), lockerStore: ls3, now: NOW, sources: [cornynSrc], log: () => {} }));
  assert.deepEqual(ls3.data.get(key), own);
  // Unflagged, the same weak item IS upgraded (the flag is what stopped it).
  const ls4 = lockerFakeStore();
  ls4.data.set(key, { ...own, review: undefined });
  await quiet(() => fn.run({ fetch: byUrl({ [CORNYN_URL]: HC_HTML }), store: fakeStore(), lockerStore: ls4, now: NOW, sources: [cornynSrc], log: () => {} }));
  assert.equal(ls4.data.get(key).strength, 'strong', 'control: an unflagged weak item is upgraded');
  // The shipped override file parses and only uses known statuses.
  const file = JSON.parse(readFileSync(path.join(root, 'db/evidence-locker-review.json'), 'utf8'));
  assert.ok(Array.isArray(file.items));
  for (const r of file.items) assert.ok(locker.REVIEW_STATUSES.includes(r.status), `bad status ${r.status}`);
});

await t('review flags: the items endpoint leaves hidden items out and marks reviewed ones', async () => {
  const items = await import(pathToFileURL(itemsFnPath).href);
  const ls = lockerFakeStore();
  const mk = (n, extra = {}) => ({ politician_id: 'crockett', topic: 'cost_living', position: 'support', confidence: 0.9, strength: 'strong',
    source_type: 'official House issue page', link: `https://crockett.house.gov/p${n}`, excerpt: `excerpt ${n}`,
    attribution: 'Source: official House page', date: '2026-11-07', ...extra });
  const [a, b, c] = [mk(1), mk(2), mk(3)];
  for (const it of [a, b, c]) ls.data.set(locker.lockerKey(it), it);
  const body = await items.listLockerEntries(ls, { items: [
    { key: locker.lockerKey(a), status: 'hidden' },
    { politician_id: 'crockett', link: b.link, status: 'reviewed', note: 'checked' },
  ] });
  assert.equal(body.count, 2);
  assert.equal(body.hidden, 1);
  const urls = body.items.crockett.map((e) => e.source.url);
  assert.ok(!urls.includes(a.link), 'hidden item is not served');
  const rev = body.items.crockett.find((e) => e.source.url === b.link);
  assert.equal(rev.review.status, 'reviewed');
  assert.equal(rev.pipeline.key, locker.lockerKey(b), 'served entries carry their store key');
  assert.ok(!body.items.crockett.find((e) => e.source.url === c.link).review, 'unflagged item carries no review');
});

await t('all topics: one page writes Locker items on more than one topic, each under its own issue key, and the run logs which topics produced items', async () => {
  const cornynSrc = core.SOURCES.find((s) => s.url === CORNYN_URL);
  const MULTI_HTML = '<html><body><h1>Issues</h1>'
    + '<p>In the Senate, he will fight to lower prescription drug costs and cap insulin co-pays.</p>'
    + '<p>We will reduce insurance premiums for Texas families.</p>'
    + '<p>I will secure the border and finish the wall.</p>'
    + '<p>We must end catch and release.</p>'
    + '<p>We will crack down on the cartels.</p>'
    + '<p>I will raise teacher pay and fully fund our public schools.</p></body></html>';
  const ls = lockerFakeStore(); const logs = [];
  const { value: res } = await quiet(() => fn.run({ fetch: byUrl({ [CORNYN_URL]: MULTI_HTML }), store: fakeStore(), lockerStore: ls, now: NOW,
    sources: [cornynSrc], log: (l) => logs.push(l) }));
  const report = await res.json();
  const items = lockerItems(ls);
  const topics = [...new Set(items.map((i) => i.topic))];
  assert.ok(topics.length > 1, `items on ${topics.length} topic(s): ${topics}`);
  for (const k of ['healthcare_costs', 'border_security', 'public_schools']) assert.ok(topics.includes(k), `item on ${k}`);
  const issueKeys = JSON.parse(readFileSync(path.join(root, 'db/issue-keys.json'), 'utf8')).keys;
  for (const i of items) {
    assert.ok(issueKeys.includes(i.topic), `${i.topic} is a register key`);
    assert.equal(i.link, CORNYN_URL, 'every item cites the one page');
    assert.ok(['strong', 'weak', 'mention'].includes(i.strength));
    assert.equal(locker.lockerKey(i).split('/')[1], i.topic, 'stored under its own issue key');
    assert.equal(locker.toSpotlightEntry(i).issueKey, i.topic, 'served under its own issue key, so it attaches to that leaf');
    if (i.topic !== 'healthcare_costs') assert.equal(i.page_topic, 'healthcare_costs');
  }
  // Same thresholds: border has 3 consistent statements → strong. Schools has 1
  // explicit claim on the official page: a normal stated position (R8), strong.
  assert.equal(items.find((i) => i.topic === 'border_security').strength, 'strong');
  assert.equal(items.find((i) => i.topic === 'public_schools').strength, 'strong');
  assert.equal(items.find((i) => i.topic === 'public_schools').confidence, 0.8);
  assert.equal(locker.toSpotlightEntry(items.find((i) => i.topic === 'border_security')).headline,
    'Cornyn supports “Strong Border & Enforcement” (official Senate issue page)');
  // The run logs which topics produced items, and the report carries the same.
  const line = logs.find((l) => l.startsWith('evidence-locker: topics with new items this run — '));
  assert.ok(line, 'topic log line');
  for (const k of ['healthcare_costs', 'border_security', 'public_schools']) assert.ok(line.includes(k), `${k} in topic log`);
  assert.ok(logs.some((l) => l.startsWith('stance-score: run topics — ')));
  assert.equal(report.topics.scored_against, issueKeys.length);
  for (const k of ['healthcare_costs', 'border_security', 'public_schools']) assert.ok(report.topics.items[k], `report.topics.items.${k}`);
  // Roster, cap and flags are untouched: one source pulled, one raw record.
  assert.equal(report.results.length, 1);
  // A review flag on one topic's item still blocks only that item.
  const key = locker.lockerKey({ politician_id: 'john_cornyn', topic: 'border_security', link: CORNYN_URL });
  const ls2 = lockerFakeStore(); const logs2 = [];
  await quiet(() => fn.run({ fetch: byUrl({ [CORNYN_URL]: MULTI_HTML }), store: fakeStore(), lockerStore: ls2, now: NOW,
    sources: [cornynSrc], reviewFlags: { items: [{ key, status: 'hidden' }] }, log: (l) => logs2.push(l) }));
  assert.ok(!ls2.data.has(key), 'flagged cross-topic item is not written');
  assert.ok(lockerItems(ls2).some((i) => i.topic === 'healthcare_costs'), 'the other topics still write');
  assert.ok(logs2.some((l) => l.startsWith('evidence-locker: FLAGGED john_cornyn|border_security')));
});

await t('every-minute caps: 8 politicians, 6 sources each, 30–40 per run — enforced by the planner and logged against the time budget', async () => {
  assert.equal(core.MAX_POLITICIANS_PER_RUN, 8);
  assert.equal(core.MAX_SOURCES_PER_POLITICIAN, 6);
  assert.ok(core.MAX_SOURCES_PER_RUN >= 30 && core.MAX_SOURCES_PER_RUN <= 40);
  // A synthetic roster with more pages than any cap allows.
  const page = (pid, i) => ({ politician_id: pid, topic: i % 2 ? 'healthcare_costs' : 'cost_living', source_type: 'official House issue page', url: `https://${pid}.example.gov/issues/${i}` });
  const mk = (pages) => Array.from({ length: 12 }, (_, k) => {
    const pid = `pol_${k}`;
    return { politician_id: pid, tier: 1, sources: Array.from({ length: pages }, (_, i) => page(pid, i)),
      official: { ...page(pid, 99), source_type: 'official House newsroom', official_kind: 'congress', source_id: 'official-newsroom' } };
  });
  // 4 sources each: the politician cap binds first (8 × 4 = 32 ≤ 36).
  const small = core.planRun({}, { roster: mk(3) });
  assert.equal(small.politicians.length, core.MAX_POLITICIANS_PER_RUN, 'politicians per run capped at 8');
  assert.equal(small.size, 32);
  // 10 sources each: trimmed to 6 per politician, and the run total holds at ≤ 36.
  const p = core.planRun({}, { roster: mk(9) });
  assert.ok(p.politicians.length <= core.MAX_POLITICIANS_PER_RUN);
  assert.ok(p.size <= core.MAX_SOURCES_PER_RUN && p.size >= 30, `total ${p.size} within 30–${core.MAX_SOURCES_PER_RUN}`);
  for (const pid of p.politicians) {
    const n = [...p.sources, ...p.patterns].filter((s) => s.politician_id === pid).length;
    assert.equal(n, core.MAX_SOURCES_PER_POLITICIAN, `${pid}: ${n} = ${core.MAX_SOURCES_PER_POLITICIAN}`);
    assert.ok(p.patterns.some((s) => s.politician_id === pid), `${pid} keeps its official slot`);
  }
  // Small rosters rows: whole politicians up to 8 per run, so one run reaches well past the old 3.
  const real = core.planRun({});
  assert.ok(real.politicians.length > 3 && real.politicians.length <= 8, `real roster run takes ${real.politicians.length} politician(s)`);
  // End to end: a run stores valid raw records (same locked shape, no stance fields) and logs its duration.
  const store = fakeStore(); const logs = [];
  const { value: res } = await quiet(() => fn.run({ fetch: fakeFetch(200, LONG_HTML), store, now: NOW, rotate: { state: {}, counts: {} }, log: (l) => logs.push(l) }));
  const r = await res.json();
  assert.ok(r.plan.politicians.length <= 8 && r.results.length <= core.MAX_SOURCES_PER_RUN);
  assert.ok(r.results.length > 11, `more sources than the old cap (${r.results.length})`);
  for (const rec of store.data.values()) {
    for (const k of ['url', 'final_url', 'fetched_at', 'source_type', 'politician_id', 'topic', 'http_status', 'body']) assert.ok(k in rec, `raw record has ${k}`);
    for (const k of FORBIDDEN) assert.ok(!(k in rec), `raw record carries no ${k}`);
  }
  assert.ok(Number.isFinite(r.duration_ms) && r.budget_ms === core.RUN_BUDGET_MS);
  assert.ok(logs.some((l) => l.startsWith('raw-ingest: run duration — ') || l.startsWith('raw-ingest: SLOW RUN — ')), 'duration logged against the budget');
});

await t('requested national expansion: all 212 unique names, known URLs or explicit skips, capped rotation', () => {
  const expectedNames = ["Donald Trump", "JD Vance", "Joe Biden", "Kamala Harris", "Hakeem Jeffries", "Chuck Schumer", "Mike Johnson", "Bernie Sanders", "Alexandria Ocasio-Cortez", "Nancy Pelosi", "Ted Cruz", "Elizabeth Warren", "Thomas Massie", "Ilhan Omar", "Gavin Newsom", "Greg Abbott", "Ron DeSantis", "Marco Rubio", "Pete Hegseth", "Zohran Mamdani", "John Thune", "Steve Scalise", "Jim Jordan", "Mitch McConnell", "Chris Van Hollen", "Mark Kelly", "Jon Ossoff", "Raphael Warnock", "Susan Collins", "John Cornyn", "Mike Lee", "Byron Donalds", "Nancy Mace", "James Talarico", "Abdul El-Sayed", "Ken Paxton", "Kristi Noem", "Lindsey Graham", "Tim Scott", "Rick Scott", "Marjorie Taylor Greene", "Lauren Boebert", "Ayanna Pressley", "Rashida Tlaib", "Katie Porter", "Ro Khanna", "Pramila Jayapal", "Amy Klobuchar", "Cory Booker", "Chris Murphy", "Sheldon Whitehouse", "Thom Tillis", "Josh Hawley", "Marsha Blackburn", "Tommy Tuberville", "Gretchen Whitmer", "Josh Shapiro", "Wes Moore", "Brian Kemp", "Glenn Youngkin", "Adam Schiff", "Eric Swalwell", "Maxine Waters", "Cori Bush", "Jamaal Bowman", "Stephen Miller", "Jared Kushner", "Elon Musk", "Pete Buttigieg", "Nikki Haley", "Vivek Ramaswamy", "Robert F. Kennedy Jr.", "Tulsi Gabbard", "Bill Cassidy", "John Kennedy", "Rand Paul", "Ron Johnson", "Ted Budd", "Joni Ernst", "Deb Fischer", "John Hoeven", "Kevin Cramer", "Shelley Moore Capito", "Cynthia Lummis", "Dan Sullivan", "Lisa Murkowski", "Mitt Romney", "Kyrsten Sinema", "Joe Manchin", "Jon Tester", "Sherrod Brown", "Bob Casey", "John Fetterman", "Bob Menendez", "Chris Coons", "Tom Carper", "Dick Durbin", "Tammy Duckworth", "Tammy Baldwin", "Tina Smith", "Gary Peters", "Debbie Stabenow", "Kirsten Gillibrand", "Chuck Grassley",
    // Next 200 high-visibility + 2026 winners: only the names not already in the roster.
    "Angela Alsobrooks", "Jon Husted", "Ron Wyden", "Roger Wicker", "Cindy Hyde-Smith", "Josh Gottheimer", "Summer Lee", "Maxwell Frost", "Matt Gaetz", "Elise Stefanik", "Tom Emmer", "Michael McCaul", "Katie Britt", "Pete Ricketts", "Elissa Slotkin", "Bernie Moreno", "Steve Daines", "John Barrasso", "Jim Justice", "Mark Warner", "Tim Kaine", "Richard Blumenthal", "Jeanne Shaheen", "Maggie Hassan", "Angus King", "Ed Markey", "Jack Reed", "Peter Welch", "Lisa Blunt Rochester", "Brian Schatz", "Mazie Hirono", "Catherine Cortez Masto", "Jacky Rosen", "Alex Padilla", "Patty Murray", "Maria Cantwell", "Jeff Merkley", "Todd Young", "Mike Braun", "Eric Schmitt", "John Boozman", "Tom Cotton", "Mike Rounds", "JB Pritzker", "Kathy Hochul", "Josh Stein", "Andy Beshear", "Roy Cooper", "Keisha Lance Bottoms", "Deb Haaland", "Jonathan Kreiss-Tomkins", "Amy Acton", "Rob Sand", "Katie Hobbs", "Andy Biggs", "Sarah Huckabee Sanders", "Jared Polis", "Tina Kotek", "Bob Ferguson", "Maura Healey", "Ned Lamont", "Dan McKee", "Janet Mills", "Phil Scott", "Josh Turek", "Adam Hamilton", "Troy Jackson", "Annie Andrews", "Scott Colom", "Mary Peltola", "Juliana Stratton", "Peggy Flanagan", "Chris Pappas", "Barry Moore", "Julia Letlow", "Andy Barr", "Ashley Moody", "Zach Dembo", "Sean McCann", "William Lawrence", "Christina Hines", "Richard Ojeda", "Mitchell Berman", "Rebecca Cooke", "Stefany Shaheen", "Cait Conley", "Zack Mullock", "Nancy Lacore", "JoAnna Mendoza", "Jessica Killin", "Sam Forstag", "Ben McAdams", "Bob Brooks", "Kristina Knickerbocker", "Melissa Bean", "Daniel Biss", "Jeremy Moss", "Darializa Avila Chevalier", "Aaron Ford", "Xavier Becerra", "Cindy Holscher", "Phil Weiser", "Jocelyn Benson", "Jim Pillen", "David Crowley", "Helena Foulkes", "Hannah Pingree", "Kelly Ayotte"];
  assert.deepEqual(REQUESTED_POLITICIANS.map((r) => r.name), expectedNames);
  assert.equal(REQUESTED.size, 212, 'duplicate names never create duplicate identities');
  for (const person of REQUESTED_POLITICIANS) {
    const row = core.ROSTER.find((r) => r.politician_id === person.politician_id);
    assert.ok(row, `${person.name} is configured`);
    if (person.page) {
      const prior = readFileSync(path.join(root, person.page.known_from), 'utf8');
      assert.ok(prior.includes(person.page.url), `${person.name}: URL already exists in the recorded source file`);
      assert.ok([...row.sources, row.official].some((source) => source?.url === person.page.url));
    } else {
      assert.ok(person.note && row.note, `${person.name}: a missing page has a note`);
      const retired = RETIRED_URLS_BY_PID.get(person.politician_id);
      // A retired page leaves whatever other (non-failing) sources the row has.
      if (retired) assert.ok(![...row.sources, row.official].some((s) => s && retired.has(s.url)), `${person.name}: retired page is gone`);
      else assert.equal(row.sources.length, 0);
    }
  }
  const noSourceIds = core.ROSTER.filter((r) => !r.sources.length && !r.official).map((r) => r.politician_id);
  let state = {}; const reached = new Set();
  for (let i = 0; i < core.ROSTER.length; i++) {
    const plan = core.planRun(state);
    if (plan.cycle > 0) break;
    assert.ok(plan.politicians.length <= 8 && plan.size <= 36);
    for (const id of plan.politicians) {
      assert.ok(!noSourceIds.includes(id), 'missing sources do not consume run slots');
      assert.ok([...plan.sources, ...plan.patterns].filter((s) => s.politician_id === id).length <= 6);
      reached.add(id);
    }
    state = plan.state;
  }
  for (const person of REQUESTED_POLITICIANS.filter((r) => r.page)) assert.ok(reached.has(person.politician_id), `${person.name} joins a planner cycle`);
});

// ── Extra source types: member press/issue pages, Congress.gov, state legislature,
//    governor/statewide, campaign Issues/Priorities sub-pages ──
const types = await import('../netlify/lib/raw-ingest-source-types.mjs');
const CLASSES = ['congress_member', 'congress_gov', 'state_legislature', 'statewide_official', 'campaign_issues'];
const LIVE_CLASSES = CLASSES.filter((c) => c !== 'congress_gov'); // congress_gov: all pages retired
const rowOf = (pid) => core.ROSTER.find((r) => r.politician_id === pid);
const pagesOf = (r) => [...r.sources, ...(r.official ? [r.official] : [])];
const RAW_FIELDS = ['url', 'final_url', 'fetched_at', 'source_type', 'politician_id', 'topic', 'source_id', 'http_status', 'content_type', 'body_chars', 'body'];

await t('extra source types: every configured URL is already cited on the site for that politician, on their own or an official host', () => {
  assert.deepEqual(Object.keys(types.SOURCE_CLASSES).sort(), [...CLASSES].sort());
  const cache = new Map();
  const read = (f) => (cache.has(f) ? cache.get(f) : (cache.set(f, readFileSync(path.join(root, f), 'utf8')), cache.get(f)));
  assert.equal(new Set(types.EXTRA_SOURCES.map((e) => `${e.politician_id} ${e.url}`)).size, types.EXTRA_SOURCES.length, 'no duplicate entries');
  for (const e of types.EXTRA_SOURCES) {
    assert.ok(CLASSES.includes(e.source_class), `${e.url}: known class`);
    assert.ok(read(e.known_from).includes(e.url), `${e.url}: cited verbatim in ${e.known_from} (not invented)`);
    assert.ok(SCORED.has(e.topic), `${e.url}: ${e.topic} is a scored issue key`);
    const row = rowOf(e.politician_id);
    assert.ok(row, `${e.politician_id} is in the roster`);
    const h = new URL(e.url).hostname.replace(/^www\./, '');
    assert.match(e.url, /^https:\/\//);
    if (e.source_class === 'congress_member') {
      assert.match(h, /\.(house|senate)\.gov$/, `${e.url}: a house.gov / senate.gov page`);
      // The member's own host: their non-classed pages, plus a retired own page (raw-ingest-retired.mjs).
      const own = new Set([...pagesOf(row).filter((s) => !s.source_class).map((s) => s.url), ...(RETIRED_URLS_BY_PID.get(row.politician_id) || [])].map((u) => new URL(u).hostname.replace(/^www\./, '')));
      assert.ok(own.has(h), `${e.url}: on the member's own host, not a colleague's or a committee's`);
      assert.match(e.source_type, /^official (House|Senate) /);
    }
    if (e.source_class === 'congress_gov') {
      assert.equal(h, 'congress.gov');
      assert.match(new URL(e.url).pathname, /^\/(member|bill)\//, `${e.url}: a member page or a measure page`);
    }
    if (e.source_class === 'state_legislature' || e.source_class === 'statewide_official') assert.match(h, /\.gov$/, `${e.url}: a .gov host`);
    if (e.source_class === 'campaign_issues') {
      assert.doesNotMatch(h, /\.gov$/);
      assert.match(e.url, /issue|priorit/i, `${e.url}: an Issues / Priorities page`);
      const own = new Set(pagesOf(row).filter((s) => !s.source_class).map((s) => new URL(s.url).hostname.replace(/^www\./, '')));
      assert.ok(own.has(h), `${e.url}: on the politician's own campaign site`);
    }
    assert.ok(locker.isCampaignOrOfficial(e.source_type, e.url), `${e.url}: counts as a campaign/official page`);
    // Merged into the roster exactly once, with a unique raw record key.
    const hits = pagesOf(row).filter((s) => s.url === e.url);
    assert.equal(hits.length, 1, `${e.url} appears once in ${row.politician_id}'s row`);
    assert.equal(hits[0].source_class, e.source_class);
  }
  for (const r of core.ROSTER) {
    const keys = pagesOf(r).map((s) => core.rawKey(s, NOW().toISOString()));
    assert.equal(new Set(keys).size, keys.length, `${r.politician_id}: every page writes its own raw record key`);
  }
});

await t('extra source types: one of each is configured for a test politician who already has an official page', () => {
  // congress_gov: every Congress.gov page was retired (HTTP 403), so none is configured.
  assert.equal(types.CONGRESS_GOV.length, 0);
  const TEST = { congress_member: 'aoc', state_legislature: 'dustin_burrows', statewide_official: 'cox', campaign_issues: 'james_talarico' };
  for (const [cls, pid] of Object.entries(TEST)) {
    const row = rowOf(pid);
    assert.ok(row?.official, `${pid} has an official page`);
    assert.equal(core.sourceKind(row.official), 'official');
    assert.ok(pagesOf(row).some((s) => s.source_class === cls), `${pid} carries a ${cls} source`);
  }
  // The new state legislator's member page is already cited on the site and is their official pattern.
  const burrows = rowOf('dustin_burrows');
  assert.equal(burrows.official.official_kind, 'state_legislature');
  assert.ok(readFileSync(path.join(root, 'politician-stances.js'), 'utf8').includes(burrows.official.url));
  for (const pid of ['carl_heastie', 'mike_kohler']) assert.equal(rowOf(pid).official?.source_class, 'state_legislature');
});

await t('extra source types: a planner dry-run over the real roster pulls every new type, under the existing caps', () => {
  const seen = new Set(); const extraUrls = new Set();
  let state = {}; let runs = 0;
  for (; runs < 400; runs++) {
    const plan = core.planRun(state);
    assert.ok(plan.politicians.length <= core.MAX_POLITICIANS_PER_RUN, 'politician cap');
    assert.ok(plan.size <= core.MAX_SOURCES_PER_RUN, `run cap (${plan.size})`);
    for (const pid of plan.politicians) assert.ok([...plan.sources, ...plan.patterns].filter((s) => s.politician_id === pid).length <= core.MAX_SOURCES_PER_POLITICIAN, `${pid}: per-politician cap`);
    const n = Object.values(plan.classes).reduce((a, b) => a + b, 0);
    assert.equal(n, plan.size, 'plan.classes counts every planned source');
    for (const s of [...plan.sources, ...plan.patterns]) if (s.source_class) { seen.add(s.source_class); extraUrls.add(`${s.politician_id} ${s.url}`); }
    state = plan.state;
    if (plan.cycle >= 6) break;
  }
  for (const c of LIVE_CLASSES) assert.ok(seen.has(c), `${c} is pulled by the rotation`);
  assert.ok(!seen.has('congress_gov'), 'retired Congress.gov pages are not planned');
  // Over a handful of cycles every extra page gets its turn (overflow rotates by cycle).
  for (const e of types.EXTRA_SOURCES) assert.ok(extraUrls.has(`${e.politician_id} ${e.url}`), `${e.url} is pulled within ${runs} runs`);
  // Overflow rotation keeps the original pages first and moves the extras' window by cycle.
  const page = (i, cls) => ({ politician_id: 'x', topic: 'cost_living', source_type: 'official House press release', url: `https://x.house.gov/p${i}`, ...(cls ? { source_class: cls } : {}) });
  const pages = [page(0), page(1, 'congress_gov'), page(2, 'congress_member'), page(3, 'congress_member'), page(4, 'congress_member')];
  const a = core.orderPagesForRun(pages, 3, 0).slice(0, 3).map((s) => s.url.slice(-2));
  const b = core.orderPagesForRun(pages, 3, 1).slice(0, 3).map((s) => s.url.slice(-2));
  assert.deepEqual(a, ['p0', 'p2', 'p3'], 'original page first, Congress.gov after the other extras');
  assert.deepEqual(b, ['p0', 'p4', 'p1'], 'next cycle: the window moves on');
  assert.deepEqual(core.orderPagesForRun(pages.slice(0, 2), 5, 3).map((s) => s.url.slice(-2)), ['p0', 'p1'], 'everything fits: no reordering beyond class order');
});

await t('extra source types: a rotated run stores them as plain raw records (locked shape) and logs their classes', async () => {
  const roster = ['aoc', 'dustin_burrows', 'cox', 'james_talarico'].map(rowOf);
  const store = fakeStore(); const logs = [];
  const { value: res, lines } = await quiet(() => fn.run({ fetch: fakeFetch(200, LONG_HTML), store, now: NOW, rotate: { roster, state: { cycle: 1, done: [] }, counts: {} }, log: (l) => logs.push(l) }));
  const r = await res.json();
  // Cycle 1: AOC's slots past her original pages reach her extra pages.
  assert.ok(r.results.length <= core.MAX_SOURCES_PER_RUN && r.plan.politicians.length <= core.MAX_POLITICIANS_PER_RUN);
  const cls = new Set(r.included.sources.map((s) => s.source_class).filter(Boolean));
  for (const c of LIVE_CLASSES) assert.ok(cls.has(c), `${c} included in the run`);
  assert.ok(lines.some((l) => l.startsWith('raw-ingest: run included ') && l.includes('source classes: ') && l.includes('congress_member')), 'run log lists the source classes');
  assert.equal(store.data.size, r.results.length);
  for (const rec of store.data.values()) {
    for (const k of Object.keys(rec)) assert.ok(RAW_FIELDS.includes(k), `raw record carries only the locked fields (found ${k})`);
    for (const k of FORBIDDEN) assert.ok(!(k in rec));
  }
  assert.ok(![...store.data.values()].some((rec) => /congress\.gov/.test(rec.url)), 'no retired Congress.gov page is pulled');
});

// ── Official social sources: YouTube (transcript first, description fallback) ──
const social = await import('../netlify/lib/raw-ingest-social.mjs');
const SOCIAL_ITEM_FIELDS = ['type', 'date', 'link', 'excerpt', 'weight', 'politician_id', 'topic', 'source_type', 'source_id', 'url', 'fetched_at'];
const FEED = (pid) => `<?xml version="1.0"?><feed>${[1, 2, 3, 4].map((i) => `<entry><yt:videoId>${pid.slice(0, 6).padEnd(6, 'x')}vid0${i}</yt:videoId><title>Video ${i} &amp; more</title><published>2026-11-0${i}T12:00:00+00:00</published><media:group><media:description>Description of video ${i}: lowering costs for Utah families.</media:description></media:group></entry>`).join('')}</feed>`;
const ytFetch = ({ captions = true } = {}) => async (url) => {
  const res = (status, body, ct = 'text/html') => ({ ok: status >= 200 && status < 300, status, url, headers: new Map([['content-type', ct]]), text: async () => body });
  if (url.includes('/feeds/videos.xml')) return res(200, FEED(new URL(url).searchParams.get('channel_id').toLowerCase()), 'application/atom+xml');
  if (url.includes('/watch?v=')) {
    const id = new URL(url).searchParams.get('v');
    // Videos 3 and 4 carry an auto-generated English track; 1 and 2 have none.
    if (!captions || !/[34]$/.test(id)) return res(200, '<html>no captions here</html>'.repeat(20));
    const tracks = JSON.stringify([{ baseUrl: `https://www.youtube.com/api/timedtext?v=${id}&lang=en`, name: { runs: [{ text: 'English (auto-generated)' }] }, languageCode: 'en', kind: 'asr' }]);
    return res(200, `<html><script>var x = {"captions":{"playerCaptionsTracklistRenderer":{"captionTracks":${tracks},"audioTracks":[]}}};</script></html>`);
  }
  if (url.includes('/api/timedtext')) return res(200, JSON.stringify({ events: [{ segs: [{ utf8: 'Transcript words ' }, { utf8: 'about water and schools.' }] }] }), 'application/json');
  return res(200, LONG_HTML);
};
const memGetStore = () => { const data = new Map(); return { data, async get(k) { return data.has(k) ? JSON.stringify(data.get(k)) : null; }, async setJSON(k, v) { data.set(k, JSON.parse(JSON.stringify(v))); } }; };

await t('social: official YouTube channels are configured only from videos the site already cites on the politician\'s own channel; no X / Facebook', () => {
  assert.deepEqual(Object.keys(social.SOCIAL_CLASSES), ['youtube']);
  // Both configured channels were retired (feeds kept failing); the class and puller stay.
  assert.equal(types.SOCIAL_SOURCES.length, 0);
  for (const sc of types.SOCIAL_SOURCES) {
    const cited = readFileSync(path.join(root, sc.known_from), 'utf8');
    const vid = new URL(sc.known_video).searchParams.get('v');
    assert.ok(cited.includes(vid), `${sc.known_video} is cited in ${sc.known_from}`);
    assert.ok(cited.includes(sc.known_label.replace(/'/g, "\\'")) || cited.includes(sc.known_label), `${sc.politician_id}: the site labels it "${sc.known_label}"`);
    assert.match(sc.known_label, /official/i, 'labelled official on the site');
    assert.match(sc.channel_id, /^UC[A-Za-z0-9_-]{22}$/);
    assert.equal(sc.url, social.youtubeFeedUrl(sc.channel_id));
    assert.ok(locker.isCampaignOrOfficial(sc.source_type, sc.url));
    assert.ok(SCORED.has(sc.topic));
    const row = rowOf(sc.politician_id);
    assert.ok(row?.official, `${sc.politician_id} has an official page`);
    assert.ok(readFileSync(path.join(root, 'politician-stances.js'), 'utf8').includes(row.official.url) || readFileSync(path.join(root, 'spotlight-cards-data.js'), 'utf8').includes(row.official.url), `${row.official.url} is already cited on the site`);
    assert.equal(row.sources.filter((s) => s.source_class === 'youtube').length, 1, 'one channel source in the row');
  }
  assert.ok(!types.SOCIAL_SOURCES.some((sc) => sc.politician_id === 'dhinkins'), 'the Utah Senate chamber channel is not treated as a member channel');
  for (const r of core.ROSTER) for (const s of pagesOf(r)) assert.doesNotMatch(new URL(s.url).hostname, /(^|\.)(x|twitter|facebook)\.com$/, `${s.url}: no X / Facebook source configured`);
  // Curtis keeps his official page; his retired channel feed is no longer in the row.
  const curtis = rowOf('curtis');
  assert.equal(core.sourceKind(curtis.official), 'official');
  assert.ok(!curtis.sources.some((s) => s.source_class === 'youtube'));
});

await t('social: the planner fills social slots only after official/campaign pages, under the existing caps', () => {
  const pg = (pid, i, extra = {}) => ({ politician_id: pid, topic: 'cost_living', source_type: 'official House issue page', url: `https://${pid}.example.gov/issues/${i}`, ...extra });
  const yt = (pid) => ({ politician_id: pid, topic: 'cost_living', source_type: 'official YouTube channel', source_class: 'youtube', source_id: 'youtube-channel', url: social.youtubeFeedUrl(`UC${pid.padEnd(22, 'x')}`) });
  const row = (pid, pages) => ({ politician_id: pid, tier: 1, sources: [yt(pid), ...Array.from({ length: pages }, (_, i) => pg(pid, i))],
    official: { ...pg(pid, 99), source_type: 'official House newsroom', official_kind: 'congress', source_id: 'official-newsroom' } });
  // Room left: the channel joins after the pages, even though it is listed first.
  const roomy = core.planRun({}, { roster: [row('a', 2), row('b', 2)] });
  for (const pid of ['a', 'b']) assert.ok(roomy.sources.some((s) => s.politician_id === pid && s.source_class === 'youtube'), `${pid}: channel fills a spare slot`);
  assert.ok(roomy.sources.findIndex((s) => s.source_class === 'youtube') >= 4, 'channels come after every official page');
  // A politician at the per-politician cap with official pages gets no social slot.
  const full = core.planRun({}, { roster: [row('a', 9)] });
  assert.equal([...full.sources, ...full.patterns].filter((s) => s.politician_id === 'a').length, core.MAX_SOURCES_PER_POLITICIAN);
  assert.ok(!full.sources.some((s) => s.source_class === 'youtube'), 'official pages win the slots');
  // Run cap tight: social never displaces a later politician's official pages.
  const tight = core.planRun({}, { roster: [row('a', 2), row('b', 2)], max: 6 });
  assert.equal(tight.size, 6);
  assert.ok(tight.politicians.includes('b') && [...tight.sources, ...tight.patterns].filter((s) => s.politician_id === 'b').length === 3, 'b keeps all three official pages');
  assert.ok(!tight.sources.some((s) => s.source_class === 'youtube'));
  // Real roster dry run: the YouTube class shows up within a few cycles and every run stays capped.
  let state = {}; const got = new Set();
  for (let i = 0; i < 400; i++) {
    const plan = core.planRun(state);
    assert.ok(plan.politicians.length <= core.MAX_POLITICIANS_PER_RUN && plan.size <= core.MAX_SOURCES_PER_RUN);
    for (const pid of plan.politicians) assert.ok([...plan.sources, ...plan.patterns].filter((s) => s.politician_id === pid).length <= core.MAX_SOURCES_PER_POLITICIAN);
    for (const s of plan.sources) if (s.source_class === 'youtube') got.add(s.politician_id);
    state = plan.state;
    if (plan.cycle >= 3) break;
  }
  for (const sc of types.SOCIAL_SOURCES) assert.ok(got.has(sc.politician_id), `${sc.politician_id}'s channel is planned`);
});

// Fixture channels (no channel is configured in the live roster any more).
const ytSource = (pid, channel_id) => ({ politician_id: pid, topic: 'cost_living', source_type: 'official YouTube channel',
  source_class: 'youtube', source_id: 'youtube-channel', url: social.youtubeFeedUrl(channel_id), channel_id });
const YT_FIXTURE = [ytSource('curtis', 'UCaaaaaaFixtureChannel01'), ytSource('hoang_nguyen', 'UCbbbbbbFixtureChannel02')];
const ytRow = (src) => ({ ...rowOf(src.politician_id), sources: [src] });

await t('social: a YouTube pull writes one locked-shape item per new video — transcript first, description fallback logged, no scoring', async () => {
  const roster = YT_FIXTURE.map(ytRow);
  const store = memGetStore(); const logs = []; const hooked = [];
  const { value: res, lines } = await quiet(() => fn.run({ fetch: ytFetch(), store, now: NOW, rotate: { roster, state: {}, counts: {} }, log: (l) => logs.push(l) }));
  const r = await res.json();
  const items = [...store.data.entries()].filter(([, v]) => v.type === 'video');
  assert.equal(items.length, 2 * social.YOUTUBE_MAX_VIDEOS, 'the 3 most recent videos per channel');
  for (const [k, v] of items) {
    assert.deepEqual(Object.keys(v).sort(), [...SOCIAL_ITEM_FIELDS].sort(), `${k}: locked item fields only`);
    for (const f of FORBIDDEN) assert.ok(!(f in v));
    assert.match(v.date, /^20\d\d-\d\d-\d\d$/);
    assert.match(v.link, /^https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{11}$/);
    assert.equal(v.weight, 'mention');
    assert.ok(v.excerpt.length > 0 && v.excerpt.length <= social.SOCIAL_EXCERPT_MAX);
    assert.ok(k.endsWith(`/${new URL(v.link).searchParams.get('v')}.json`), 'keyed by video id');
  }
  assert.ok(!items.some(([, v]) => /vid01/.test(v.link)), 'only the most recent videos (the oldest is left out)');
  const byTranscript = items.filter(([, v]) => v.excerpt.startsWith('Transcript words'));
  const byDescription = items.filter(([, v]) => v.excerpt.startsWith('Description of video'));
  assert.equal(byTranscript.length, 4, 'videos 3 and 4 use the transcript');
  assert.equal(byDescription.length, 2, 'video 2 falls back to the description');
  assert.equal(logs.filter((l) => l.startsWith('raw-ingest: TRANSCRIPT FALLBACK ')).length, 2, 'every fallback is logged');
  assert.ok(logs.some((l) => /^raw-ingest: youtube — 2 channel\(s\), 6 new video record\(s\) · transcript 4\/6, description fallback 2\/6/.test(l)), 'the run logs the transcript vs. fallback tally');
  assert.deepEqual({ t: r.youtube.transcript, f: r.youtube.description_fallback }, { t: 4, f: 2 });
  assert.ok(!lines.concat(logs).some((l) => /stance-score: .*vid0/.test(l)), 'no scoring on social items');
  // Next run: already-stored videos are skipped before any transcript fetch.
  const seenUrls = [];
  const countingFetch = async (u, o) => { seenUrls.push(u); return ytFetch()(u, o); };
  const { value: res2 } = await quiet(() => fn.run({ fetch: countingFetch, store, now: NOW, rotate: { roster, state: {}, counts: {} }, log: () => {} }));
  const r2 = await res2.json();
  assert.equal(r2.youtube.stored, 0);
  assert.equal(r2.youtube.already_stored, 6);
  assert.ok(!seenUrls.some((u) => u.includes('/watch?v=')), 'no transcript fetch for stored videos');
  // No captions anywhere → everything falls back, nothing fails.
  const st3 = memGetStore(); const l3 = [];
  await quiet(() => fn.run({ fetch: ytFetch({ captions: false }), store: st3, now: NOW, rotate: { roster, state: {}, counts: {} }, log: (l) => l3.push(l) }));
  assert.equal([...st3.data.values()].filter((v) => v.type === 'video' && v.excerpt.startsWith('Description')).length, 6);
  assert.equal(l3.filter((l) => l.startsWith('raw-ingest: TRANSCRIPT FALLBACK ')).length, 6);
  // A broken feed fails only that source.
  const bad = await quiet(() => social.pullYouTube(YT_FIXTURE[0], { fetch: fakeFetch(500, 'x'), store: memGetStore(), now: NOW, log: () => {} }));
  assert.equal(bad.value.ok, false);
});

await t('social: transcript helpers parse caption tracks and bodies', () => {
  const html = `x "captionTracks":[{"baseUrl":"https://y/t?a=1\\u0026lang=en","name":{"runs":[{"text":"English"}]},"languageCode":"en"},{"baseUrl":"https://y/t2","languageCode":"en","kind":"asr"}],"z":1`;
  const tracks = social.extractCaptionTracks(html);
  assert.equal(tracks.length, 2);
  assert.equal(social.pickCaptionTrack(tracks).kind, 'asr', 'auto-generated English preferred');
  assert.equal(social.captionText('<transcript><text start="0">Hello &amp;amp; welcome</text><text>to Utah</text></transcript>'), 'Hello &amp; welcome to Utah'.replace('&amp;', '&'));
  assert.equal(social.captionText(''), '');
  assert.equal(social.extractCaptionTracks('<html></html>'), null);
  assert.equal(social.parseYouTubeFeed(FEED('abcdef'))[0].published.slice(0, 10), '2026-11-04');
});

// ── Retired sources: kept failing (3+ pulls in a row), removed from the rotation ──
await t('retired sources: the planner no longer schedules any known-failing URL', () => {
  const MUST = ['curtis', 'hoang_nguyen', 'congress.gov/member/', 'congress.gov/bill/', 'defense.gov', 'state.gov', 'hhs.gov', 'democraticleader.house.gov',
    'pressley.house.gov/media/press-releases/', 'donalds.house.gov/media/press-releases', 'waters.house.gov/media/press-releases', 'ronjohnson.senate.gov/press-releases',
    'michigan.gov/whitmer/news', 'rickscott.senate.gov/newsroom/press-releases', 'lgraham.senate.gov', 'gillibrand.senate.gov/news/press/'];
  for (const m of MUST) assert.ok(RETIRED_SOURCES.some((r) => r.url.includes(m) || r.politician_id === m), `${m} is recorded as retired`);
  assert.equal(new Set(RETIRED_SOURCES.map((r) => r.url)).size, RETIRED_SOURCES.length);
  for (const r of RETIRED_SOURCES) assert.ok(r.streak >= 3 && r.last_error && r.from, `${r.url}: recorded with its streak, error and source list`);
  const retired = new Set(RETIRED_SOURCES.map((r) => normUrl(r.url)));
  // Not in any configured list the planner reads …
  for (const r of core.ROSTER) for (const s of pagesOf(r)) assert.ok(!retired.has(normUrl(s.url)), `${s.url} is not in ${r.politician_id}'s row`);
  for (const s of [...types.EXTRA_SOURCES, ...types.SOCIAL_SOURCES, ...core.SOURCES]) assert.ok(!retired.has(normUrl(s.url)), `${s.url} is not a known source`);
  for (const p of REQUESTED_POLITICIANS) if (p.page) assert.ok(!retired.has(normUrl(p.page.url)), `${p.page.url} is not a requested page`);
  // … and a dry run over several full cycles never plans one.
  let state = {}; let planned = 0;
  for (let i = 0; i < 600; i++) {
    const plan = core.planRun(state);
    for (const s of [...plan.sources, ...plan.patterns]) { planned++; assert.ok(!retired.has(normUrl(s.url)), `${s.url} planned in cycle ${plan.cycle}`); }
    state = plan.state;
    if (plan.cycle >= 6) break;
  }
  assert.ok(planned > 0);
  assert.match(retiredSourcesLine(), new RegExp(`^raw-ingest: retired sources — ${RETIRED_SOURCES.length} source\\(s\\) removed`));
});

await t('retired sources: the cron logs the removal once, then stays quiet', async () => {
  const { logRetiredOnce } = fn;
  const store = memGetStore(); const logs = [];
  assert.equal(await logRetiredOnce(store, (l) => logs.push(l), NOW), true);
  assert.equal(await logRetiredOnce(store, (l) => logs.push(l), NOW), false);
  assert.equal(logs.filter((l) => l.startsWith('raw-ingest: retired sources — ')).length, 1, 'logged exactly once');
  for (const r of RETIRED_SOURCES) assert.ok(logs[0].includes(r.url), `${r.url} named in the log line`);
  assert.equal(await logRetiredOnce(null, (l) => logs.push(l), NOW), false, 'no store: nothing logged');
});

await t('retired sources: the three known-bad pulls (2 YouTube feeds, Pressley press releases) are paused with a re-check note', () => {
  const BAD = ['https://www.youtube.com/feeds/videos.xml?channel_id=UCNilDuFLmC7FBsyJoDYUzPA', 'https://www.youtube.com/feeds/videos.xml?channel_id=UChAQ4MD-HigmGnImSoAKBVA', 'https://pressley.house.gov/media/press-releases/'];
  for (const u of BAD) {
    const r = RETIRED_SOURCES.find((x) => x.url === u);
    assert.ok(r && r.last_error && r.from, `${u} recorded as retired`);
    for (const s of [...types.EXTRA_SOURCES, ...types.SOCIAL_SOURCES, ...core.SOURCES]) assert.notEqual(normUrl(s.url), normUrl(u), `${u} still configured`);
  }
  const pressley = REQUESTED_POLITICIANS.find((p) => p.politician_id === 'ayanna_pressley');
  if (pressley) assert.ok(!pressley.page || normUrl(pressley.page.url) !== normUrl(BAD[2]));
  assert.ok(readFileSync(path.join(root, 'netlify/lib/raw-ingest-retired.mjs'), 'utf8').includes('To bring a source back'), 're-check note in the source config');
});

await t('locker W6: a cross-topic read never writes a stance that conflicts with one already held (Doggett social_security)', async () => {
  const store = lockerFakeStore(); const logs = []; const log = (l) => logs.push(l);
  const ECON = 'https://doggett.house.gov/issues/growing-our-economy-0', HEALTH = 'https://doggett.house.gov/issues/healthcare-0';
  const cand = (page_topic, url, position) => ({ politician_id: 'lloyd_doggett', topic: 'social_security', position, confidence: 0.85, confidence_reason: 'x', rules_version: 'phase8-v3', page_topic,
    sources: [{ link: url, type: 'official House issue page', excerpt: 'I continue working to defend Social Security.', statements: [{ kind: 'clear', side: position, text: 'x' }] }] });
  const rec = (topic, url) => ({ politician_id: 'lloyd_doggett', topic, url, final_url: url, source_type: 'official House issue page', fetched_at: '2026-11-14T00:00:00Z', http_status: 200 });
  const a = await locker.maybeWriteLockerItem(cand('cost_living', ECON, 'oppose'), rec('cost_living', ECON), { store, log });
  assert.equal(a.written, true);
  for (let i = 0; i < 3; i++) {
    const b = await locker.maybeWriteLockerItem(cand('healthcare_costs', HEALTH, 'support'), rec('healthcare_costs', HEALTH), { store, log });
    assert.equal(b.written, false, 'conflicting cross-topic read held');
    assert.equal(b.held, a.key);
  }
  assert.equal(store.data.size, 1, 'no second, conflicting record');
  assert.ok(logs.some((l) => l.startsWith('evidence-locker: HELD lloyd_doggett|social_security')));
  // An agreeing cross-topic read from another page still writes; an on-topic read writes as before.
  const agree = await locker.maybeWriteLockerItem(cand('healthcare_costs', HEALTH, 'oppose'), rec('healthcare_costs', HEALTH), { store, log });
  assert.equal(agree.written, true);
  const onTopic = { ...cand(undefined, 'https://doggett.house.gov/issues/seniors', 'support') }; delete onTopic.page_topic;
  const c = await locker.maybeWriteLockerItem(onTopic, rec('social_security', 'https://doggett.house.gov/issues/seniors'), { store, log });
  assert.equal(c.written, true, 'on-topic scoring is not gated');
  // A store that cannot be listed never blocks a write.
  assert.equal(await locker.heldConflict(cand('cost_living', ECON, 'support'), 'k', { store: { async list() { throw new Error('down'); } } }), null);
});

if (failures) { console.error(`${failures} failing`); process.exit(1); }
console.log('raw ingest: all checks pass');
