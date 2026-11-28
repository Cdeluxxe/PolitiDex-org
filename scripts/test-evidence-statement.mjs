#!/usr/bin/env node
// test-evidence-statement.mjs — statement dates + own-words filter on the
// raw-ingest → scoring → Evidence Locker path (netlify/lib/evidence-statement.mjs,
// applied by maybeWriteLockerItem in evidence-locker-core.mjs).
// Asserts: a page with a clear published date gets that date; a page with no
// date falls back to the fetch time and the fallback is logged; video / speech
// records take their source-metadata date; paraphrase-only, someone-else's-quote
// and third-party rows are filtered, logged and never written; an own-words row
// with a date is written as before (plus the date); the scorer and the
// ground-truth file are untouched.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const imp = (p) => import(pathToFileURL(path.join(root, p)).href);
const es = await imp('netlify/lib/evidence-statement.mjs');
const locker = await imp('netlify/lib/evidence-locker-core.mjs');
const { scoreRecordCandidates } = await imp('netlify/lib/video-transcripts.mjs');
const fn = await imp('netlify/functions/raw-ingest-cron.mts');
const gtPath = path.join(root, 'db/stance-ground-truth-talarico-cost-of-living.json');
const gtHash = () => createHash('sha256').update(readFileSync(gtPath)).digest('hex');

let failures = 0;
const t = async (name, f) => {
  try { await f(); console.log('  ✓', name); }
  catch (e) { failures++; console.error('  ✗', name, '\n    ', e.message); }
};
const quiet = async (f) => {
  const orig = console.log; console.log = () => {};
  try { return await f(); } finally { console.log = orig; }
};
const lockerStore = () => {
  const data = new Map();
  return {
    data,
    async list() { return { blobs: [...data.keys()].map((key) => ({ key })) }; },
    async get(k) { return data.has(k) ? JSON.parse(JSON.stringify(data.get(k))) : null; },
    async setJSON(k, v, opts = {}) {
      if (opts.onlyIfNew && data.has(k)) return { modified: false };
      data.set(k, JSON.parse(JSON.stringify(v))); return { modified: true };
    },
  };
};

const FETCHED = '2026-11-28T12:00:00.000Z';
const URL_ = 'https://www.cornyn.senate.gov/news/drug-prices/';
const raw = (body, extra = {}) => Object.freeze({ url: URL_, final_url: URL_, fetched_at: FETCHED, source_type: 'official Senate press release', politician_id: 'john_cornyn', topic: 'healthcare_costs', http_status: 200, body, ...extra });
const OWN_BODY = '<h1>Cornyn on drug prices</h1><p>“I will keep fighting to lower prescription drug prices for Texas families,” said Senator Cornyn.</p><p>I introduced a bill to cap insulin costs and reduce health care costs for seniors.</p>';
const DATED_HTML = `<html><head><meta property="article:published_time" content="2026-10-14T09:00:00Z"></head><body>${OWN_BODY}</body></html>`;
const UNDATED_HTML = `<html><body>${OWN_BODY}</body></html>`;
const PARAPHRASE_HTML = '<html><body><h1>Cornyn backs plan</h1><p>The senator supports lowering prescription drug prices, according to his office.</p><p>Cornyn has pushed to cap insulin costs for seniors, the report said.</p></body></html>';
const clearOf = (rec) => scoreRecordCandidates(rec, { log: () => {} }).find((x) => x.candidate.position === 'support' || x.candidate.position === 'oppose');

console.log('statement dates');
await t('a page with a clear published date gets that date (not the fetch time)', () => {
  const d = es.statementDateFor(raw(DATED_HTML));
  assert.deepEqual([d.date, d.source], ['2026-10-14', 'page']);
});
await t('a living issue page with explicit published markup still gets the page date', () => {
  const d = es.statementDateFor(raw('<html><head><script type="application/ld+json">{"@type":"WebPage","datePublished":"2025-03-02T00:00:00Z","dateModified":"2026-11-01"}</script></head><body>x</body></html>', { source_type: 'official Senate issue page' }));
  assert.deepEqual([d.date, d.source, d.via], ['2025-03-02', 'page', 'datePublished']);
});
await t('a page with no date falls back to the fetch time, and the fallback is labelled', () => {
  const d = es.statementDateFor(raw(UNDATED_HTML, { source_type: 'official Senate issue page' }));
  assert.deepEqual([d.date, d.source], ['2026-11-28', 'fetch_time']);
  assert.match(es.statementDateLine('john_cornyn|healthcare_costs', d), /^evidence-date: FETCH FALLBACK john_cornyn\|healthcare_costs — .*2026-11-28/);
});
await t('a page date after the fetch date is ignored', () => {
  const d = es.statementDateFor(raw('<html><head><meta property="article:published_time" content="2027-05-01"></head><body>x</body></html>', { source_type: 'official Senate issue page' }));
  assert.equal(d.source, 'fetch_time');
});
await t('video and speech records take the date in their source metadata', () => {
  const v = es.statementDateFor(raw('transcript', { type: 'video', date: '2026-09-03', source_type: 'own YouTube channel video' }));
  assert.deepEqual([v.date, v.source, v.via], ['2026-09-03', 'source_metadata', 'video publish date']);
  const s = es.statementDateFor(raw('turns', { type: 'speech', speech_kind: 'floor', date: '2026-06-11', source_type: 'floor speech (Congressional Record)' }));
  assert.deepEqual([s.date, s.source], ['2026-06-11', 'source_metadata']);
});

console.log('own-words filter + Locker writes');
await t('an own-words row with a date is written as before, carrying the statement date', async () => {
  const st = lockerStore(); const logs = [];
  const rec = raw(DATED_HTML);
  const { candidate, raw: r } = clearOf(rec);
  const w = await locker.maybeWriteLockerItem(candidate, r, { store: st, log: (l) => logs.push(l) });
  assert.equal(w.written, true, w.reason);
  const item = [...st.data.values()][0];
  assert.equal(item.statement_date, '2026-10-14');
  assert.equal(item.statement_date_source, 'page');
  assert.equal(item.date, '2026-11-28', 'capture date unchanged');
  assert.equal(item.citation.statement_date, '2026-10-14');
  assert.ok(logs.some((l) => l.startsWith('evidence-locker: WRITE john_cornyn|healthcare_costs')));
  assert.ok(logs.some((l) => /^evidence-date: PAGE john_cornyn\|healthcare_costs — 2026-10-14/.test(l)));
  const entry = locker.toSpotlightEntry(item);
  assert.equal(entry.statementDate, 'Oct 14, 2026');
  assert.equal(entry.pipeline.statement_date, '2026-10-14');
});
await t('an own-words row with no page date is written with the fetch time, logged as a fallback', async () => {
  const st = lockerStore(); const logs = [];
  const { candidate, raw: r } = clearOf(raw(UNDATED_HTML, { source_type: 'official Senate issue page', url: 'https://www.cornyn.senate.gov/issues/health/', final_url: 'https://www.cornyn.senate.gov/issues/health/' }));
  const w = await locker.maybeWriteLockerItem(candidate, r, { store: st, log: (l) => logs.push(l) });
  assert.equal(w.written, true, w.reason);
  const item = [...st.data.values()][0];
  assert.deepEqual([item.statement_date, item.statement_date_source], ['2026-11-28', 'fetch_time']);
  assert.ok(logs.some((l) => l.startsWith('evidence-date: FETCH FALLBACK john_cornyn|healthcare_costs')));
  assert.ok(!('statementDate' in locker.toSpotlightEntry(item)), 'a fetch-time fallback is not shown as when it was said');
});
await t('a paraphrase-only row (scored by the unchanged scorer) is filtered, logged and not written', async () => {
  const st = lockerStore(); const logs = [];
  const x = clearOf(raw(PARAPHRASE_HTML));
  assert.ok(x, 'the scorer still reads a clear position (its rules are unchanged)');
  const w = await locker.maybeWriteLockerItem(x.candidate, x.raw, { store: st, log: (l) => logs.push(l) });
  assert.equal(w.written, false); assert.equal(w.filtered, 'paraphrase');
  assert.equal(st.data.size, 0);
  assert.ok(logs.some((l) => /^evidence-locker: FILTERED john_cornyn\|healthcare_costs — not the politician's own words \(paraphrase\)/.test(l)));
});
const synthetic = (statements, extra = {}) => ({ politician_id: 'john_cornyn', topic: 'healthcare_costs', position: 'support', confidence: 0.85, confidence_reason: 'r', rules_version: 'v', sources: [{ excerpt: statements[0].text, statements }], ...extra });
await t('a third-party description is filtered and not written', async () => {
  const st = lockerStore(); const logs = [];
  const c = synthetic([{ kind: 'clear', side: 'support', text: 'Cornyn wants to lower drug prices for seniors across Texas.', attributed_to: 'other', attributed_via: 'Governor Abbott' }]);
  const w = await locker.maybeWriteLockerItem(c, raw(UNDATED_HTML), { store: st, log: (l) => logs.push(l) });
  assert.equal(w.filtered, 'third_party'); assert.equal(st.data.size, 0);
  assert.ok(logs.some((l) => l.includes('FILTERED') && l.includes('third_party')));
});
await t('a third-person description on a page that is not theirs is filtered as third-party', () => {
  const c = synthetic([{ kind: 'clear', side: 'support', text: 'Cornyn supports lowering prescription drug prices for seniors.' }]);
  const r = es.ownWordsCheck(c, raw('x', { source_type: 'voter guide', url: 'https://guide.example/cornyn' }), { ownPage: false });
  assert.equal(r.code, 'third_party');
});
await t('a quote from someone else is filtered and not written', async () => {
  const st = lockerStore();
  const c = synthetic([{ kind: 'clear', side: 'support', text: '“We must lower drug prices for every family,” said Governor Smith.', quoted_speaker: 'other' }]);
  const w = await locker.maybeWriteLockerItem(c, raw(UNDATED_HTML), { store: st, log: () => {} });
  assert.equal(w.filtered, 'quoted_other'); assert.equal(st.data.size, 0);
});
await t('generic boilerplate or a headline alone is filtered as no clear own words', () => {
  assert.equal(es.ownWordsCheck(synthetic([{ kind: 'clear', side: 'support', text: 'Lower drug prices', headline: true }]), raw('x')).code, 'no_own_words');
  assert.equal(es.ownWordsCheck(synthetic([{ kind: 'clear', side: 'support', text: 'Sign up to lower drug prices' }]), raw('x')).code, 'no_own_words');
  assert.equal(es.ownWordsCheck(synthetic([{ kind: 'mention', side: null, text: 'Drug prices.' }]), raw('x')).code, 'no_own_words');
});
await t('mentions are not stances and pass through the filter unchanged', () => {
  assert.equal(es.ownWordsCheck(synthetic([{ kind: 'mention', side: null, text: 'x' }], { position: 'no clear position' }), raw('x')).ok, true);
});

console.log('cron run (raw ingest → scoring → evidence)');
await t('a run writes the own-words page with its date and filters the paraphrase page', async () => {
  const gt0 = gtHash();
  const ls = lockerStore(); const logs = [];
  const OWN = 'https://www.cornyn.senate.gov/news/own/'; const PARA = 'https://www.cornyn.senate.gov/news/para/';
  const sources = [
    { politician_id: 'john_cornyn', topic: 'healthcare_costs', source_type: 'official Senate press release', url: OWN },
    { politician_id: 'john_cornyn', topic: 'healthcare_costs', source_type: 'official Senate press release', source_id: 'para', url: PARA },
  ];
  const fetch = async (u) => ({ ok: true, status: 200, url: u, headers: new Map([['content-type', 'text/html']]), text: async () => (u === OWN ? DATED_HTML : PARAPHRASE_HTML) });
  const store = { async setJSON() {} };
  await quiet(() => fn.run({ fetch, store, lockerStore: ls, now: () => new Date(FETCHED), log: (l) => logs.push(l), sources }));
  const items = [...ls.data.values()];
  const own = items.filter((i) => i.link === OWN && i.topic === 'healthcare_costs');
  assert.equal(own.length, 1, 'own-words page written');
  assert.equal(own[0].statement_date, '2026-10-14');
  assert.ok(!items.some((i) => i.link === PARA && (i.position === 'support' || i.position === 'oppose')), 'paraphrase page wrote no stance item');
  assert.ok(logs.some((l) => /^evidence-locker: FILTERED john_cornyn\|healthcare_costs\|para — .*paraphrase/.test(l)));
  assert.equal(gtHash(), gt0, 'ground-truth file changed');
});
await t('high-profile pass reports the statement date and own-words result per candidate (still log-only)', async () => {
  const hp = await imp('netlify/lib/raw-ingest-high-profile.mjs');
  const logs = [];
  const r = await quiet(() => hp.runHighProfile({ fetch: async (u) => ({ ok: true, status: 200, url: u, headers: new Map(), text: async () => PARAPHRASE_HTML }), store: { async setJSON() {} }, now: () => new Date(FETCHED), log: (l) => logs.push(l), sources: [{ politician_id: 'john_cornyn', topic: 'healthcare_costs', source_type: 'official Senate press release', source_id: 'hp-x', url: 'https://www.cornyn.senate.gov/news/hp/', high_profile: true }] }));
  const clear = r.results[0].candidates.find((c) => c.position === 'support');
  assert.ok(clear && clear.own_words === false && clear.filtered === 'paraphrase');
  assert.equal(clear.statement_date_source, 'fetch_time');
  assert.ok(logs.some((l) => l.startsWith('high-profile: evidence-date: FETCH FALLBACK')));
});

if (failures) { console.error(`\n${failures} test(s) failed`); process.exit(1); }
console.log('\nall evidence statement tests passed');
