#!/usr/bin/env node
// test-raw-ingest.mjs — Phase 3 ingestion pipeline (raw store only).
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

await t('function and core exist; function is scheduled and uses the core', () => {
  assert.ok(existsSync(fnPath), 'missing ' + fnPath);
  assert.ok(existsSync(corePath), 'missing ' + corePath);
  const src = readFileSync(fnPath, 'utf8');
  assert.match(src, /schedule:\s*"[^"]+"/);
  assert.match(src, /raw-ingest-core\.mjs/);
  assert.match(src, /export default/);
});

const fn = await import(pathToFileURL(fnPath).href);
const core = await import(pathToFileURL(corePath).href);

await t('targets one politician + one topic: Talarico campaign cost-of-living page', () => {
  assert.equal(core.SOURCES.length, 1);
  const [s] = core.SOURCES;
  assert.equal(s.politician_id, 'james_talarico');
  assert.equal(s.topic, 'cost_living');
  assert.equal(s.url, 'https://jamestalarico.com/issue/taxes-cost-of-living/');
  assert.ok(s.source_type);
});

await t('invoking the function writes a raw record with url, timestamp, source type, body', async () => {
  const store = fakeStore();
  const { value: res, lines } = await quiet(() => fn.run({ fetch: fakeFetch(200, HTML), store, now: NOW }));
  assert.equal(res.status, 200);
  const report = await res.json();
  assert.equal(report.ok, true);
  assert.equal(store.data.size, 1);
  const [[key, rec]] = [...store.data];
  assert.match(key, /^james_talarico\/cost_living\/2026-11-07T08-00-00-000Z\.json$/);
  assert.equal(rec.url, 'https://jamestalarico.com/issue/taxes-cost-of-living/');
  assert.equal(rec.fetched_at, '2026-11-07T08:00:00.000Z');
  assert.equal(rec.source_type, 'campaign issue page');
  assert.equal(rec.body, HTML, 'body stored verbatim, unparsed');
  assert.ok(lines.some((l) => l.startsWith('raw-ingest: OK ')), 'success line logged');
});

await t('no scoring or stance fields are written', async () => {
  const store = fakeStore();
  await quiet(() => fn.run({ fetch: fakeFetch(200, HTML), store, now: NOW }));
  for (const rec of store.data.values()) {
    for (const k of FORBIDDEN) assert.ok(!(k in rec), 'forbidden field written: ' + k);
  }
  const coreSrc = readFileSync(corePath, 'utf8');
  assert.ok(!/stance-ground-truth/.test(coreSrc.replace(/^\s*\/\/.*$/gm, '')), 'core must not touch the ground-truth file');
});

await t('failed pull logs FAIL, returns non-200, and writes nothing', async () => {
  for (const f of [fakeFetch(503, 'down'), async () => { throw new Error('network'); }]) {
    const store = fakeStore();
    const { value: res, lines } = await quiet(() => fn.run({ fetch: f, store, now: NOW }));
    assert.notEqual(res.status, 200);
    assert.equal(store.data.size, 0);
    assert.ok(lines.some((l) => l.startsWith('raw-ingest: FAIL ')), 'failure line logged');
  }
});

await t('ground-truth file is unchanged', () => {
  const h = createHash('sha256').update(readFileSync(gtPath)).digest('hex');
  assert.equal(h, GT_SHA256);
});

if (failures) { console.error(`${failures} failing`); process.exit(1); }
console.log('raw ingest: all checks pass');
