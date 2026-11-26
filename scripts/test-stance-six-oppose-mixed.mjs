#!/usr/bin/env node
// test-stance-six-oppose-mixed.mjs — the 27 locked oppose / mixed ground-truth
// records for Boebert, Owens, Cole, Thompson, Lee and Trump, as a guarded set.
//
// WHY. Oppose and mixed are the scorer's weakest reads, and the 77 expansion
// records hold only 11 oppose and 3 mixed labels. This set (21 oppose, 6 mixed)
// was written for that gap, from the politicians' own pages. It is NOT a tuning
// set: no record here may be quoted in a stance-rule file or stance test.
//
//   · the file is locked, one label per politician + key, every person has an
//     oppose record, and no pair repeats one locked in another file;
//   · every source link is a page the politician controls (House / Senate
//     office or committee press office) or an official White House page;
//   · the re-score report (scripts/rescore-ground-truth-six-oppose-mixed-2026-11.mjs)
//     is current, and the scorer does no worse than when the set was locked;
//   · no ground-truth file changes (hash-checked) and nothing live reads the
//     file except the locked-label index.
// Read-only: nothing is written to the stance store or the Evidence Locker.
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const imp = (p) => import(pathToFileURL(path.join(root, p)).href);
const RS = await imp('scripts/rescore-ground-truth-six-oppose-mixed-2026-11.mjs');
const SPLIT = await imp('scripts/gen-stance-heldout-split.mjs');
const G = await imp('netlify/lib/locked-ground-truth.mjs');

const FILE_NAME = 'stance-ground-truth-six-oppose-mixed-2026-11.json';
const FILE_SHA = '99997fbe59a73f73505290de327b4e5aa37a59ce4f1b26fe5872b85a738d1638';
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
const gtFiles = readdirSync(path.join(root, 'db')).filter((n) => /^stance-ground-truth-.*\.json$/.test(n)).sort();
const before = Object.fromEntries(gtFiles.map((f) => [f, sha(path.join(root, 'db', f))]));
const file = JSON.parse(readFileSync(RS.GT_PATH, 'utf8'));
const recs = file.records;

// When the set was locked (rules phase9-v3, 2026-11-26): 4 match, 16 abstain,
// 7 wrong, oppose recall 3, mixed recall 1. Raised after the R21 oppose / mixed
// rules (same day; scripts/test-stance-oppose-mixed-rules.mjs): 13 match, 12
// abstain, 2 wrong, oppose recall 10, mixed recall 3. Raise a floor when the
// scorer improves; never lower one to pass.
export const GATES = { records: 27, min_matches: 13, max_wrong: 2, oppose_labels: 21, min_oppose_recall: 10, mixed_labels: 6, min_mixed_recall: 3 };
const PEOPLE = ['boebert', 'owens', 'tom_cole', 'bennie_thompson', 'lee', 'trump'];
const FIRST_PARTY = /^https:\/\/(?:boebert|owens|cole|benniethompson|democrats-homeland)\.house\.gov\/|^https:\/\/www\.lee\.senate\.gov\/|^https:\/\/(?:www\.whitehouse\.gov|trumpwhitehouse\.archives\.gov)\//;

let failures = 0;
const t = async (name, fn) => {
  try { await fn(); console.log('  ✓', name); }
  catch (e) { failures++; console.error('  ✗', name, '\n    ', e.message); }
};

await t('the file is byte-for-byte as locked', () => assert.equal(sha(RS.GT_PATH), FILE_SHA));
await t('27 locked, active records for the six politicians; each has an oppose record, and five have a mixed one', () => {
  assert.equal(recs.length, GATES.records);
  assert.ok(recs.every(G.isLocked));
  assert.deepEqual([...new Set(recs.map((r) => r.politician_id))].sort(), [...PEOPLE].sort());
  for (const p of PEOPLE) assert.ok(recs.some((r) => r.politician_id === p && r.position === 'oppose'), `${p}: no oppose record`);
  const mixed = new Set(recs.filter((r) => r.position === 'mixed').map((r) => r.politician_id));
  assert.deepEqual([...mixed].sort(), PEOPLE.filter((p) => p !== 'owens').sort(), 'Owens has no first-party mixed record; everyone else has one');
  assert.ok(recs.every((r) => r.position === 'oppose' || r.position === 'mixed'), 'this set holds oppose and mixed labels only');
});
await t('one label per pair, no pair repeats one locked elsewhere, and ids are unique across every ground-truth file', () => {
  const pairs = recs.map((r) => G.pairKey(r.politician_id, r.topic));
  assert.equal(new Set(pairs).size, pairs.length);
  const others = Object.entries(G.GROUND_TRUTH_FILES).filter(([f]) => f !== FILE_NAME).flatMap(([, j]) => G.recordsOf(j));
  const otherPairs = new Set(others.filter(G.isLocked).map((r) => G.pairKey(r.politician_id, r.topic)));
  assert.deepEqual(pairs.filter((p) => otherPairs.has(p)), []);
  const otherIds = new Set(others.map((r) => r.stance_id));
  assert.deepEqual(recs.map((r) => r.stance_id).filter((id) => otherIds.has(id)), []);
});
await t('every key is scored, and every source is a first-party page with a verbatim excerpt', async () => {
  const S = await imp('netlify/lib/stance-score-core.mjs');
  for (const r of recs) {
    assert.ok(r.topic in S.TOPIC_RULES, `${r.stance_id}: ${r.topic} has no scoring rule`);
    assert.ok(r.confidence > 0 && r.confidence <= 0.9 && r.confidence_reason, r.stance_id);
    for (const s of r.sources) {
      assert.match(s.link, FIRST_PARTY, `${r.stance_id}: ${s.link} is not a page the politician controls`);
      assert.ok(S.isPrimarySource(s.type, s.link), `${r.stance_id}: ${s.type} does not read as a primary source`);
      assert.ok(/^".+"$/s.test(s.excerpt), `${r.stance_id}: excerpt is not a quotation`);
    }
  }
});
await t('the locked-label index carries the set (reads that contradict it are refused at ingest)', () => {
  for (const r of recs) assert.equal(G.LOCKED_GROUND_TRUTH_INDEX.get(G.pairKey(r.politician_id, r.topic))?.stance_id, r.stance_id);
});

const report = RS.buildReport(file);
const rows = report.records;
const m = {
  matches: rows.filter((r) => RS.outcome(r) === 'match').length,
  abstains: rows.filter((r) => RS.outcome(r) === 'abstain').length,
  wrong: rows.filter((r) => RS.outcome(r) === 'wrong').length,
  oppose: rows.filter((r) => r.human.position === 'oppose'),
  mixed: rows.filter((r) => r.human.position === 'mixed'),
};
const recall = (list, p) => list.filter((r) => r.scorer.position === p).length;
console.log(`    rules ${report.rules_version} · ${m.matches}/${rows.length} match · ${m.abstains} abstain · ${m.wrong} wrong · oppose recall ${recall(m.oppose, 'oppose')}/${m.oppose.length} · mixed recall ${recall(m.mixed, 'mixed')}/${m.mixed.length}`);
console.log('    wrong-position calls: ' + (rows.filter((r) => RS.outcome(r) === 'wrong').map((r) => `${r.stance_id} ${r.human.position}→${r.scorer.position}`).join(', ') || 'none'));

await t('the re-score report on disk is current', () => {
  assert.equal(readFileSync(RS.OUT, 'utf8'), JSON.stringify(report, null, 2) + '\n', 'run node scripts/rescore-ground-truth-six-oppose-mixed-2026-11.mjs');
});
await t(`position matches ≥ ${GATES.min_matches} (now ${m.matches})`, () => assert.ok(m.matches >= GATES.min_matches));
await t(`wrong-position calls ≤ ${GATES.max_wrong} (now ${m.wrong})`, () => assert.ok(m.wrong <= GATES.max_wrong));
await t(`oppose recall ≥ ${GATES.min_oppose_recall} of ${GATES.oppose_labels}; mixed recall ≥ ${GATES.min_mixed_recall} of ${GATES.mixed_labels}`, () => {
  assert.equal(m.oppose.length, GATES.oppose_labels);
  assert.equal(m.mixed.length, GATES.mixed_labels);
  assert.ok(recall(m.oppose, 'oppose') >= GATES.min_oppose_recall);
  assert.ok(recall(m.mixed, 'mixed') >= GATES.min_mixed_recall);
});
await t('unused for tuning: no record is quoted in a stance-rule file or stance test', () => {
  const texts = Object.fromEntries(SPLIT.tuningFiles().filter((f) => f !== 'scripts/test-stance-six-oppose-mixed.mjs')
    .map((f) => [f, readFileSync(path.join(root, f), 'utf8')]));
  const leaks = recs.map((r) => [r.stance_id, SPLIT.mentionsOf(r, texts)]).filter(([, f]) => f.length);
  assert.deepEqual(leaks, []);
});
await t('nothing live reads the file except the locked-label index', () => {
  for (const f of ['netlify/lib/stance-score-core.mjs', 'netlify/lib/raw-ingest-core.mjs', 'netlify/lib/evidence-locker-core.mjs', 'netlify/lib/stated-positions-core.mjs', 'netlify/functions/raw-ingest-cron.mts', 'sw.js']) {
    let src = ''; try { src = readFileSync(path.join(root, f), 'utf8'); } catch { continue; }
    assert.ok(!src.includes(FILE_NAME), `${f} reads ${FILE_NAME}`);
  }
});
await t('no ground-truth file was modified', () => {
  for (const f of gtFiles) assert.equal(sha(path.join(root, 'db', f)), before[f], f);
});

if (failures) { console.error(`${failures} failing`); process.exit(1); }
console.log('stance six-politician oppose / mixed set: all checks pass');
