#!/usr/bin/env node
// test-raw-ingest-high-profile.mjs — explicit high-profile source list
// (db/high-profile-sources.json → netlify/lib/raw-ingest-high-profile.mjs),
// pulled on every raw-ingest run after the crawler's own sources.
// Asserts: the config loads (Booker, Schumer, Trump + others, valid shape);
// high-profile URLs are fetched on a run; they are stored as ordinary raw
// records; a failed URL does not stop the rest of the run; candidates are
// log-only (no Locker writes); the scheduled entry point turns the pass on.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hp = await import(pathToFileURL(path.join(root, 'netlify/lib/raw-ingest-high-profile.mjs')).href);
const core = await import(pathToFileURL(path.join(root, 'netlify/lib/raw-ingest-core.mjs')).href);
const fn = await import(pathToFileURL(path.join(root, 'netlify/functions/raw-ingest-cron.mts')).href);
const CONFIG = JSON.parse(readFileSync(path.join(root, 'db/high-profile-sources.json'), 'utf8'));
const SHARE = JSON.parse(readFileSync(path.join(root, 'db/share-index.json'), 'utf8'));
const gtPath = path.join(root, 'db/stance-ground-truth-talarico-cost-of-living.json');
const gtHash = () => createHash('sha256').update(readFileSync(gtPath)).digest('hex');

let failures = 0;
const t = async (name, fn) => {
  try { await fn(); console.log('  ✓', name); }
  catch (e) { failures++; console.error('  ✗', name, '\n    ', e.message); }
};
const quiet = async (f) => {
  const orig = console.log; const lines = [];
  console.log = (...a) => lines.push(a.join(' '));
  try { return { value: await f(), lines }; } finally { console.log = orig; }
};
const fakeStore = () => {
  const data = new Map();
  return { data, async setJSON(k, v) { data.set(k, JSON.parse(JSON.stringify(v))); }, async get(k) { return data.get(k) ?? null; }, async list() { return { blobs: [...data.keys()].map((key) => ({ key })) }; } };
};
const PAGE = '<html><head><title>Priorities</title></head><body><h1>Lowering costs</h1><p>I will fight to lower the cost of living for working families and cut prescription drug prices.</p>' + '<p>Filler text about the office and constituent services. </p>'.repeat(10) + '</body></html>';
const page = (url) => ({ ok: true, status: 200, url, headers: new Map([['content-type', 'text/html']]), text: async () => PAGE });
const NOW = () => new Date('2026-11-28T12:00:00.000Z');
const SRC = (pid, url, extra = {}) => ({ politician_id: pid, topic: 'cost_living', source_type: 'official Senate issues page', source_id: hp.highProfileSourceId(url), url, high_profile: true, ...extra });

console.log('high-profile sources — config');
await t('config loads with at least Booker, Schumer, Trump and 5–10 others', () => {
  const { sources, rejected, politicians } = hp.loadHighProfileSources();
  assert.equal(rejected.length, 0, `rejected: ${JSON.stringify(rejected)}`);
  for (const pid of ['booker', 'schumer', 'trump']) assert.ok(politicians.includes(pid), `${pid} missing`);
  const others = politicians.filter((p) => !['booker', 'schumer', 'trump'].includes(p));
  assert.ok(others.length >= 5 && others.length <= 10, `others: ${others.length}`);
  assert.equal(sources.length, CONFIG.sources.length);
});
await t('every entry has politician id, source type, http(s) URL; ids are site ids', () => {
  for (const e of CONFIG.sources) {
    assert.ok(e.politician_id && SHARE.people[e.politician_id], `unknown politician id ${e.politician_id}`);
    assert.ok(typeof e.source_type === 'string' && e.source_type.length, `source_type for ${e.url}`);
    assert.match(e.url, /^https:\/\//);
    if (e.note !== undefined) assert.equal(typeof e.note, 'string');
  }
});
await t('loaded sources are crawler-shaped, flagged high_profile, unique source ids', () => {
  const { sources } = hp.loadHighProfileSources();
  const ids = new Set();
  for (const s of sources) {
    assert.ok(s.high_profile && s.topic && s.source_id.startsWith('hp-'));
    const k = `${s.politician_id}/${s.topic}/${s.source_id}`;
    assert.ok(!ids.has(k), `duplicate raw key prefix ${k}`); ids.add(k);
  }
});
await t('bad and duplicate entries are rejected, the rest load', () => {
  const r = hp.loadHighProfileSources({ sources: [
    { politician_id: 'booker', source_type: 'x', url: 'https://a.example/one' },
    { politician_id: 'booker', source_type: 'x', url: 'https://a.example/one/' },
    { politician_id: '', source_type: 'x', url: 'https://a.example/two' },
    { politician_id: 'trump', source_type: 'x', url: 'ftp://a.example/three' },
    { politician_id: 'trump', url: 'https://a.example/four' },
  ] });
  assert.equal(r.sources.length, 1);
  assert.deepEqual(r.rejected.map((x) => x.reason), ['duplicate url', 'missing politician_id', 'url is not http(s)', 'missing source_type']);
});

console.log('high-profile sources — pull');
await t('every high-profile URL is fetched and stored as a raw record (same shape as crawler records)', async () => {
  const store = fakeStore(); const fetched = []; const logs = [];
  const sources = [SRC('booker', 'https://www.booker.senate.gov/about/issues'), SRC('trump', 'https://www.whitehouse.gov/priorities/')];
  const { value: r } = await quiet(() => hp.runHighProfile({ fetch: async (u) => { fetched.push(u); return page(u); }, store, now: NOW, log: (l) => logs.push(l), sources }));
  assert.deepEqual(fetched.sort(), sources.map((s) => s.url).sort());
  assert.equal(r.ok, 2); assert.equal(r.failed, 0);
  assert.equal(store.data.size, 2);
  // Same record shape as a crawler pull of the same source.
  const ref = fakeStore();
  await quiet(() => core.pullOne(sources[0], { fetch: async (u) => page(u), store: ref, now: NOW }));
  const [refKey, refRec] = [...ref.data.entries()][0];
  const rec = store.data.get(refKey);
  assert.ok(rec, `expected key ${refKey}`);
  assert.deepEqual(Object.keys(rec).sort(), Object.keys(refRec).sort());
  assert.equal(rec.body, PAGE); assert.equal(rec.politician_id, 'booker'); assert.equal(rec.source_type, sources[0].source_type);
  assert.match(refKey, /^booker\/cost_living\/hp-booker-senate-gov-about-issues\/2026-11-28T12-00-00-000Z\.json$/);
  assert.ok(logs.some((l) => /^high-profile: OK booker /.test(l)));
  assert.ok(logs.some((l) => /^high-profile: 2 source\(s\) for 2 politician\(s\) — 2 stored, 0 failed/.test(l)));
});
await t('a failed URL is logged and does not stop the others', async () => {
  const store = fakeStore(); const logs = [];
  const sources = [SRC('booker', 'https://bad.example/down'), SRC('schumer', 'https://www.schumer.senate.gov/about/legislation'), SRC('trump', 'https://throws.example/x')];
  const f = async (u) => {
    if (u.includes('bad.example')) return { ok: false, status: 503, url: u, headers: new Map(), text: async () => 'down' };
    if (u.includes('throws.example')) throw new TypeError('fetch failed');
    return page(u);
  };
  const { value: r } = await quiet(() => hp.runHighProfile({ fetch: f, store, now: NOW, log: (l) => logs.push(l), sources }));
  assert.equal(r.ok, 1); assert.equal(r.failed, 2);
  assert.equal(store.data.size, 1);
  assert.ok([...store.data.keys()][0].startsWith('schumer/'));
  assert.ok(logs.some((l) => /^high-profile: FAIL booker .*HTTP 503/.test(l)));
  assert.ok(logs.some((l) => /^high-profile: FAIL trump /.test(l)));
  assert.ok(logs.some((l) => /2 failed \(booker, trump\)/.test(l)));
});
await t('a hanging URL times out without holding up the rest', async () => {
  const store = fakeStore();
  const sources = [SRC('booker', 'https://hang.example/x'), SRC('schumer', 'https://ok.example/y')];
  const f = (u, init) => u.includes('hang') ? new Promise((_, rej) => init.signal.addEventListener('abort', () => rej(init.signal.reason))) : Promise.resolve(page(u));
  const t0 = Date.now();
  // AbortSignal.timeout timers are unref'd; keep the loop alive like a real socket would.
  const keep = setTimeout(() => {}, 5000);
  const { value: r } = await quiet(() => hp.runHighProfile({ fetch: f, store, now: NOW, log: () => {}, sources, timeoutMs: 50 }));
  clearTimeout(keep);
  assert.ok(Date.now() - t0 < 2000);
  assert.equal(r.ok, 1); assert.equal(r.failed, 1);
});
await t('candidates are scored and logged only — nothing else is written', async () => {
  const store = fakeStore(); const logs = [];
  const { value: r } = await quiet(() => hp.runHighProfile({ fetch: async (u) => page(u), store, now: NOW, log: (l) => logs.push(l), sources: [SRC('booker', 'https://x.example/p')] }));
  assert.ok(r.candidates >= 1, 'expected at least one scored candidate');
  assert.ok(logs.some((l) => /^high-profile: CANDIDATE booker\|/.test(l) && /log-only/.test(l)));
  assert.equal(store.data.size, 1, 'only the raw record is written');
  const rec = [...store.data.values()][0];
  for (const k of ['position', 'confidence', 'stance']) assert.ok(!(k in rec), `raw record carries ${k}`);
});
await t('URL the crawler already pulled this run is not fetched twice', async () => {
  const fetched = [];
  const { value: r } = await quiet(() => hp.runHighProfile({ fetch: async (u) => { fetched.push(u); return page(u); }, store: fakeStore(), now: NOW, log: () => {}, sources: [SRC('booker', 'https://x.example/a'), SRC('booker', 'https://x.example/b')], alreadyPulled: ['https://x.example/a/'] }));
  assert.deepEqual(fetched, ['https://x.example/b']);
  assert.equal(r.skipped, 1); assert.equal(r.ok, 1);
});

console.log('high-profile sources — cron run');
await t('cron run pulls the crawler sources AND every high-profile URL, high-profile after the crawler', async () => {
  const gt0 = gtHash();
  const store = fakeStore(); const lockerStore = fakeStore(); const order = []; const logs = [];
  const hpSources = [SRC('booker', 'https://hp.example/booker'), SRC('trump', 'https://hp.example/trump'), SRC('schumer', 'https://hp-down.example/schumer')];
  const f = async (u) => { order.push(u); if (u.includes('hp-down')) throw new TypeError('fetch failed'); return page(u); };
  const { value: res } = await quiet(() => fn.run({ fetch: f, store, lockerStore, now: NOW, log: (l) => logs.push(l), highProfile: { sources: hpSources } }));
  const report = await res.json();
  const crawlerUrls = core.SOURCES.map((s) => s.url);
  for (const u of crawlerUrls) assert.ok(order.includes(u), `crawler source not pulled: ${u}`);
  const firstHp = order.findIndex((u) => u.includes('hp'));
  assert.ok(order.slice(0, firstHp).length === crawlerUrls.length, 'high-profile pulled after the crawler sources');
  assert.equal(report.results.length, crawlerUrls.length, 'high-profile results stay out of the crawler results');
  assert.equal(report.high_profile.configured, 3);
  assert.equal(report.high_profile.ok, 2); assert.equal(report.high_profile.failed, 1);
  assert.ok([...store.data.keys()].some((k) => k.startsWith('booker/cost_living/hp-hp-example-booker/')));
  assert.ok([...store.data.keys()].some((k) => k.startsWith('trump/cost_living/hp-hp-example-trump/')));
  // The failure did not stop the run: crawler records are all stored too.
  assert.ok(store.data.size >= crawlerUrls.length + 2);
  // No Locker items from high-profile pages.
  for (const k of lockerStore.data.keys()) assert.ok(!/booker|trump|schumer/.test(k), `Locker write for a high-profile page: ${k}`);
  assert.ok(logs.some((l) => /^high-profile: 3 source\(s\)/.test(l)));
  assert.equal(gtHash(), gt0, 'ground-truth file changed');
});
await t('cron run without highProfile pulls only the crawler sources (opt-in for direct callers)', async () => {
  const order = [];
  await quiet(() => fn.run({ fetch: async (u) => { order.push(u); return page(u); }, store: fakeStore(), now: NOW, log: () => {} }));
  assert.equal(order.length, core.SOURCES.length);
});
await t('cron run with the committed config pulls every configured URL', async () => {
  const order = [];
  const { value: res } = await quiet(() => fn.run({ fetch: async (u) => { order.push(u); return page(u); }, store: fakeStore(), now: NOW, log: () => {}, highProfile: true }));
  const report = await res.json();
  for (const e of CONFIG.sources) assert.ok(order.includes(e.url), `not fetched: ${e.url}`);
  assert.equal(report.high_profile.configured, CONFIG.sources.length);
});
await t('scheduled entry point turns the high-profile pass on', async () => {
  let seen = null;
  await quiet(() => fn.scheduled({ run: async (d) => { seen = d; return new Response('{}'); }, store: fakeStore(), lockerStore: fakeStore(), rotationStore: fakeStore(), suggestionsStore: fakeStore(), triggerTranscriber: async () => {}, statedDb: null, wordGaps: null }));
  assert.equal(seen?.highProfile, true);
});

if (failures) { console.error(`\n${failures} test(s) failed`); process.exit(1); }
console.log('\nall high-profile source tests passed');
