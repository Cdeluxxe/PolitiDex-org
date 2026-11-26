#!/usr/bin/env node
// test-locked-ground-truth.mjs — every locked ground-truth label reaches the
// ingest job's check, and a read that contradicts one goes nowhere.
//
//   · netlify/lib/locked-ground-truth.mjs imports EVERY db/stance-ground-truth-*.json
//     file, holds exactly what is on disk, and indexes all locked records
//     (the 52 Massie / Sanders / Talarico records, the 77 expansion records and
//     the Abbott and Hinojosa cost-of-living records — 131) with one label per
//     politician + issue key;
//   · the ingest cron, the video transcriber and the Locker re-score pass pass
//     that index to the Locker writer — no longer the single Talarico record;
//   · for EVERY locked record, a clear read on the other side is refused by the
//     Locker writer, dropped before promotion, not served as a card and not
//     served by the Locker endpoint; a read that agrees still goes through;
//   · mentions are not loosened: a mention on a locked pair follows the ordinary
//     campaign/official-page rule.
// Log-only: fake stores, nothing written anywhere. No ground-truth file changes.
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const imp = (p) => import(pathToFileURL(path.join(root, p)).href);
const G = await imp('netlify/lib/locked-ground-truth.mjs');
const L = await imp('netlify/lib/evidence-locker-core.mjs');
const SP = await imp('netlify/lib/stated-positions-core.mjs');
const EL = await imp('netlify/functions/evidence-locker-items.mts');

const GT_DIR = path.join(root, 'db');
const GT_RE = /^stance-ground-truth-.*\.json$/;
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
const files = readdirSync(GT_DIR).filter((n) => GT_RE.test(n)).sort();
const before = Object.fromEntries(files.map((f) => [f, sha(path.join(GT_DIR, f))]));

let failures = 0;
const t = async (name, fn) => {
  try { await fn(); console.log('  ✓', name); }
  catch (e) { failures++; console.error('  ✗', name, '\n    ', e.message); }
};

await t('every ground-truth file on disk is imported, with its content unchanged', () => {
  assert.deepEqual(Object.keys(G.GROUND_TRUTH_FILES).sort(), files, 'a ground-truth file is not imported by locked-ground-truth.mjs');
  for (const f of files) assert.deepEqual(G.GROUND_TRUTH_FILES[f], JSON.parse(readFileSync(path.join(GT_DIR, f), 'utf8')), f);
});

const original = G.LOCKED_GROUND_TRUTH.filter((r) => ['massie', 'sanders', 'james_talarico'].includes(r.politician_id));
const expansion = G.recordsOf(G.GROUND_TRUTH_FILES['stance-ground-truth-expansion-2026-11.json']);
await t('131 locked records: the original 52, the 77 expansion records, Abbott and Hinojosa — one label per pair', () => {
  assert.equal(original.length, 52);
  assert.equal(expansion.length, 77);
  assert.ok(expansion.every(G.isLocked));
  assert.equal(G.LOCKED_GROUND_TRUTH.length, 131);
  assert.equal(G.LOCKED_GROUND_TRUTH_INDEX.size, 131);
  assert.deepEqual(G.LOCKED_GROUND_TRUTH.filter((r) => ['greg_abbott', 'gina_hinojosa'].includes(r.politician_id)).map((r) => r.stance_id).length, 2);
});

await t('an unlocked record is not a label; two locked labels that disagree on one pair are refused', () => {
  assert.equal(G.isLocked({ locked: false, status: 'active' }), false);
  assert.equal(G.isLocked({ locked: true, status: 'retired' }), false);
  assert.throws(() => G.groundTruthIndex([{ politician_id: 'a', topic: 'x', position: 'support' }, { politician_id: 'a', topic: 'x', position: 'oppose' }]), /disagrees/);
});

await t('the ingest cron, video transcriber and Locker re-score pass use the full locked index', () => {
  for (const f of ['netlify/functions/raw-ingest-cron.mts', 'netlify/functions/video-transcribe.mts', 'netlify/functions/locker-rescore-cron.mts']) {
    const src = readFileSync(path.join(root, f), 'utf8');
    assert.match(src, /import \{ LOCKED_GROUND_TRUTH_INDEX as groundTruth \} from "\.\.\/lib\/locked-ground-truth\.mjs";/, f);
    assert.ok(!/stance-ground-truth-talarico-cost-of-living\.json" with/.test(src), `${f} still imports the single Talarico record`);
  }
});

// A candidate on a locked pair, from the politician's own .gov page.
const other = (p) => (p === 'support' ? 'oppose' : 'support');
const candidateFor = (r, position) => ({
  politician_id: r.politician_id, topic: r.topic, position, confidence: 0.85, confidence_reason: 'r', rules_version: 'phase9-v3',
  sources: [{ type: r.sources[0].type, link: r.sources[0].link, excerpt: 'I will keep fighting for this.',
    statements: [{ kind: 'clear', side: position, text: 'I will keep fighting for this.', weight: 'strong' }] }],
});
// The record's own first source is the page: it is the politician's own (the reviewer read it there).
const rawFor = (r) => ({ url: r.sources[0].link, final_url: r.sources[0].link, source_type: r.sources[0].type, politician_id: r.politician_id, topic: r.topic, fetched_at: '2026-11-26T00:00:00.000Z' });

await t('every locked record: a clear read on the other side is refused by the Locker writer — and only because of the label', async () => {
  let refused = 0, controls = 0;
  for (const r of G.LOCKED_GROUND_TRUTH) {
    const sides = r.position === 'mixed' ? ['support', 'oppose'] : [other(r.position)];
    for (const side of sides) {
      const c = candidateFor(r, side), raw = rawFor(r);
      const d = L.lockerDecision(c, raw, G.LOCKED_GROUND_TRUTH_INDEX);
      assert.equal(d.write, false, `${r.stance_id}: ${side} was written`);
      refused++;
      // Refused for another reason first (e.g. the page fails the own-page
      // check)? Then it is refused without the labels too.
      if (L.lockerDecision(c, raw, null).write) { controls++; assert.equal(d.contradicts, r.stance_id, d.reason); }
    }
  }
  console.log(`    ${refused} contradicting read(s) refused across 131 locked records; ${controls} of them would be written without the labels`);
  assert.ok(controls > 0.9 * refused, 'the fixture is refused for some other reason — the sweep proves nothing');
});

await t('every locked support/oppose record: a read that agrees is still written', () => {
  for (const r of G.LOCKED_GROUND_TRUTH.filter((x) => x.position !== 'mixed')) {
    const c = candidateFor(r, r.position), raw = rawFor(r);
    if (!L.lockerDecision(c, raw, null).write) continue; // the fixture is not this person's own page; covered by the control count above
    assert.equal(L.lockerDecision(c, raw, G.LOCKED_GROUND_TRUTH_INDEX).write, true, r.stance_id);
  }
});

await t('mentions are not loosened: a mention on a locked pair from a non-campaign page is still refused', () => {
  const r = G.LOCKED_GROUND_TRUTH_INDEX.get('greg_abbott|cost_living');
  const c = { ...candidateFor(r, 'no clear position'), confidence: 0.2, sources: [{ type: 'news article', link: 'https://news.example.com/a', excerpt: 'Prices are up.', statements: [{ kind: 'mention', text: 'Prices are up.' }] }] };
  const raw = { ...rawFor(r), url: 'https://news.example.com/a', final_url: 'https://news.example.com/a', source_type: 'news article' };
  assert.equal(L.lockerDecision(c, raw, G.LOCKED_GROUND_TRUTH_INDEX).write, L.lockerDecision(c, raw, null).write);
});

await t('a Locker item that contradicts a locked label is never promoted and never served as a card', () => {
  let n = 0;
  for (const r of G.LOCKED_GROUND_TRUTH) {
    const side = r.position === 'mixed' ? 'support' : other(r.position);
    const entry = { issueKey: r.topic, source: { url: `https://${r.politician_id}.house.gov/a` }, pipeline: { position: side, confidence: 0.9, excerpt: 'x' } };
    assert.ok(r.topic in SP.promoteEntries([entry]), 'control: promoted without a politician id');
    assert.ok(!(r.topic in SP.promoteEntries([entry], { pid: r.politician_id })), `${r.stance_id}: promoted`);
    const row = { politicianId: r.politician_id, issueKey: r.topic, stance: side, status: 'active', provenance: 'pipeline', sourceUrl: 'https://x.house.gov/a', evidence: ['k'] };
    assert.equal(SP.cardsBody([row]).count, 0, `${r.stance_id}: card served`);
    assert.equal(SP.cardsBody([{ ...row, stance: r.position }]).count, 1, `${r.stance_id}: an agreeing card is not served`);
    n++;
  }
  // Unrelated politicians are untouched.
  const free = { politicianId: 'someone_else', issueKey: 'healthcare', stance: 'oppose', status: 'active', provenance: 'pipeline', sourceUrl: 'https://x.house.gov/a', evidence: ['k'] };
  assert.equal(SP.cardsBody([free]).count, 1);
  console.log(`    ${n} locked pairs: contradicting entries dropped before promotion and contradicting cards not served`);
});

await t('the Locker endpoint does not serve a contradicting item (the profile promotes from these), and counts it', async () => {
  const link = 'https://kclark.house.gov/2025/11/a';
  const blobs = {
    'kclark/healthcare/a.json': { politician_id: 'kclark', topic: 'healthcare', position: 'oppose', confidence: 0.8, link, excerpt: 'Republicans eliminated the ACA tax credits.', attribution: 'Source: official House page', source_type: 'official statement', date: '2026-11-15' },
    'kclark/healthcare/b.json': { politician_id: 'kclark', topic: 'healthcare', position: 'support', confidence: 0.8, link: link.replace(/a$/, 'b'), excerpt: 'We will protect health care.', attribution: 'Source: official House page', source_type: 'official statement', date: '2026-11-16' },
  };
  const store = { list: async (o = {}) => ({ blobs: Object.keys(blobs).filter((k) => !o.prefix || k.startsWith(o.prefix)).map((key) => ({ key })) }), get: async (k) => blobs[k] || null };
  const served = await EL.listLockerEntries(store, { items: [] }, { pids: ['kclark'] });
  const unguarded = await EL.listLockerEntries(store, { items: [] }, { pids: ['kclark'], groundTruth: null });
  assert.equal(unguarded.count, 2, 'control: both served without the labels');
  assert.equal(served.count, 1);
  assert.equal(served.items.kclark[0].pipeline.position, 'support');
  assert.equal(served.contradicts_ground_truth, 1);
});

await t('no ground-truth file was modified', () => {
  for (const f of files) assert.equal(sha(path.join(GT_DIR, f)), before[f], f);
});

if (failures) { console.error(`${failures} failing`); process.exit(1); }
console.log('locked ground truth: all checks pass');
