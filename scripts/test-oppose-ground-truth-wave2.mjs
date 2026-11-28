#!/usr/bin/env node
// test-oppose-ground-truth-wave2.mjs — the second batch of hand-labeled oppose
// records, scored with the current stance scorer.
//
// WHY. db/oppose-ground-truth-wave2-2026-11.json adds eight oppose labels on
// the four keys the first batch exercised, in language the rules were never
// tuned on: the 2025 rescissions package (Murray, Schumer), taxes on the
// wealthy and on corporations (Crapo, Arrington), the REINS Act (Lieu, Raskin)
// and SNAP / Medicaid work requirements (Angie Craig, Debbie Dingell).
//
//   · every record has the required fields, in the Talarico record's shape,
//     and every source has type, date, direct link, a verbatim excerpt and a
//     takes_clear_position flag; every record has a clear source;
//   · test coverage only: no live code reads the file, no pair repeats a
//     locked label or a first-batch record, no record is quoted in a
//     stance-rule file or stance test;
//   · the re-score report (scripts/rescore-oppose-ground-truth-wave2-2026-11.mjs)
//     is current; the scorer never calls support on these oppose labels;
//     outside KNOWN_MISSES it calls oppose within tolerance, and every logged
//     miss still misses for the logged reason (a new miss fails, and so does a
//     fixed one until it leaves the list);
//   · the first batch, the Talarico record and every stance-ground-truth file
//     are unchanged.
// Read-only: nothing is written to the stance store or the Evidence Locker.
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const imp = (p) => import(pathToFileURL(path.join(root, p)).href);
const RS = await imp('scripts/rescore-oppose-ground-truth-wave2-2026-11.mjs');
const S = await imp('netlify/lib/stance-score-core.mjs');
const G = await imp('netlify/lib/locked-ground-truth.mjs');
const SPLIT = await imp('scripts/gen-stance-heldout-split.mjs');

const FILE_NAME = 'oppose-ground-truth-wave2-2026-11.json';
const BATCH_ONE = 'oppose-ground-truth-2026-11.json';
const TALARICO = 'stance-ground-truth-talarico-cost-of-living.json';
const TALARICO_SHA = 'f2889f2a8e30dbae8f4bd099719ed2c53f290a9fb1a017ca0a3601b46da59586';
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
const gtFiles = readdirSync(path.join(root, 'db')).filter((n) => /^stance-ground-truth-.*\.json$/.test(n)).sort();
const before = Object.fromEntries(gtFiles.map((f) => [f, sha(path.join(root, 'db', f))]));
const file = JSON.parse(readFileSync(RS.GT_PATH, 'utf8'));
const recs = file.records;
const batchOne = JSON.parse(readFileSync(path.join(root, 'db', BATCH_ONE), 'utf8')).records;

// Misses under rules phase9-v3 when the batch was added (2026-11-28), logged
// for a later rules pass. Labels only: no rule was changed for these.
//   topic not found — the key's mention vocabulary misses the words:
//     Crapo / Arrington: "a new tax on wealth", "28 percent", "corporate taxes";
//     Angie Craig: "SNAP … required to work", "paperwork requirements" (SNAP);
//     Dingell: bare "work requirements" without "Medicaid" in the sentence.
//   recognized, no clear position (R3) — an oppose read on a pointer:
//     Schumer: "fiercely oppose this package" (no rescissions object);
//     Lieu: "strongly oppose … the REINS Act" (REINS is a support object only);
//     Raskin: condemnation without an oppose verb ("handcuff the agencies").
// Shrink this list when one is fixed; never add to it to pass.
export const KNOWN_MISSES = {
  'schumer|cut_spending|gt-308': 'topic mention(s), none states a clear position (R3)',
  'crapo|wealth_inequality_tax_fairness|gt-309': 'topic not found in source',
  'arrington|wealth_inequality_tax_fairness|gt-310': 'topic not found in source',
  'ted_lieu|gov_regulation|gt-311': 'topic mention(s), none states a clear position (R3)',
  'raskin|gov_regulation|gt-312': 'topic mention(s), none states a clear position (R3)',
  'angie_craig|safety_net_work_requirements|gt-313': 'topic not found in source',
  'debbie_dingell|safety_net_work_requirements|gt-314': 'topic not found in source',
};

const RECORD_FIELDS = ['stance_id', 'politician_id', 'topic', 'position', 'confidence', 'confidence_reason', 'sources', 'last_updated', 'status', 'locked', 'locked_on'];
const SOURCE_FIELDS = ['type', 'date', 'link', 'excerpt', 'weight', 'note', 'takes_clear_position'];
const ISO = /^\d{4}-\d{2}-\d{2}$/;

let failures = 0;
const t = async (name, fn) => {
  try { await fn(); console.log('  ✓', name); }
  catch (e) { failures++; console.error('  ✗', name, '\n    ', e.message); }
};

await t('6–10 oppose records on the four priority keys, one per politician', () => {
  assert.ok(recs.length >= 6 && recs.length <= 10, `${recs.length} records`);
  assert.ok(recs.every((r) => r.position === 'oppose'));
  assert.equal(new Set(recs.map((r) => r.politician_id)).size, recs.length);
  assert.equal(new Set(recs.map((r) => r.stance_id)).size, recs.length);
  const keys = new Set(['cut_spending', 'wealth_inequality_tax_fairness', 'gov_regulation', 'safety_net_work_requirements']);
  for (const k of keys) assert.ok(recs.some((r) => r.topic === k), `no record on ${k}`);
});
await t('every record has the required fields, in the Talarico record\'s shape', () => {
  const talarico = JSON.parse(readFileSync(path.join(root, 'db', TALARICO), 'utf8'));
  for (const f of RECORD_FIELDS) assert.ok(f in talarico, `the Talarico record has no ${f}; the shape changed`);
  for (const r of recs) {
    for (const f of RECORD_FIELDS) assert.ok(f in r, `${r.stance_id}: missing ${f}`);
    assert.equal(r.stance_id, `${r.politician_id}|${r.topic}|${r.stance_id.split('|')[2]}`);
    assert.match(r.stance_id.split('|')[2], /^gt-\d+$/);
    assert.ok(r.topic in S.TOPIC_RULES, `${r.stance_id}: ${r.topic} has no scoring rule`);
    assert.ok(typeof r.confidence === 'number' && r.confidence >= 0.7 && r.confidence <= 0.95, `${r.stance_id}: confidence ${r.confidence}`);
    assert.ok(r.confidence_reason.length > 40 && r.position_on, r.stance_id);
    assert.ok(G.isLocked(r), `${r.stance_id}: not locked / active`);
    assert.match(r.last_updated, ISO); assert.match(r.locked_on, ISO);
    assert.ok(Array.isArray(r.sources) && r.sources.length >= 1, `${r.stance_id}: no sources`);
  }
});
await t('every source has type, date, direct link, a verbatim excerpt and the clear-position flag; the politician\'s own words', () => {
  for (const r of recs) {
    assert.ok(r.sources.some((s) => s.takes_clear_position === true), `${r.stance_id}: no source takes a clear position`);
    for (const s of r.sources) {
      for (const f of SOURCE_FIELDS) assert.ok(f in s, `${r.stance_id}: source missing ${f}`);
      assert.equal(typeof s.takes_clear_position, 'boolean');
      assert.ok(ISO.test(s.date), `${r.stance_id}: date ${s.date}`);
      assert.match(s.link, /^https:\/\/[^/]+\.(?:house|senate)\.gov\//, `${r.stance_id}: ${s.link} is not an official House / Senate page`);
      assert.ok(S.isPrimarySource(s.type, s.link), `${r.stance_id}: ${s.type} does not read as a primary source`);
      assert.ok(/^".+"$/s.test(s.excerpt), `${r.stance_id}: excerpt is not a quotation`);
      assert.match(s.note, /^Read directly on \d{4}-\d{2}-\d{2}\./);
    }
  }
});
await t('test coverage only: no pair repeats a locked label or a first-batch record, and nothing live reads the file', () => {
  const clash = recs.filter((r) => G.LOCKED_GROUND_TRUTH_INDEX.has(G.pairKey(r.politician_id, r.topic))).map((r) => r.stance_id);
  assert.deepEqual(clash, []);
  const ids = new Set([...G.LOCKED_GROUND_TRUTH, ...batchOne].map((r) => r.stance_id));
  assert.deepEqual(recs.map((r) => r.stance_id).filter((id) => ids.has(id)), []);
  const pairs = new Set(batchOne.map((r) => `${r.politician_id}|${r.topic}`));
  assert.deepEqual(recs.filter((r) => pairs.has(`${r.politician_id}|${r.topic}`)).map((r) => r.stance_id), []);
  assert.ok(!(FILE_NAME in G.GROUND_TRUTH_FILES));
  for (const f of ['netlify/lib/locked-ground-truth.mjs', 'netlify/lib/stance-score-core.mjs', 'netlify/lib/stance-topic-vocab.mjs', 'netlify/lib/raw-ingest-core.mjs', 'netlify/lib/evidence-locker-core.mjs', 'netlify/lib/stated-positions-core.mjs', 'netlify/functions/raw-ingest-cron.mts', 'netlify/functions/video-transcribe.mts', 'netlify/functions/locker-rescore-cron.mts', 'sw.js']) {
    let src = ''; try { src = readFileSync(path.join(root, f), 'utf8'); } catch { continue; }
    assert.ok(!src.includes(FILE_NAME), `${f} reads ${FILE_NAME}`);
  }
});
await t('unused for tuning: no record is quoted in a stance-rule file or stance test', () => {
  const texts = Object.fromEntries(SPLIT.tuningFiles().map((f) => [f, readFileSync(path.join(root, f), 'utf8')]));
  assert.deepEqual(recs.map((r) => [r.stance_id, SPLIT.mentionsOf(r, texts)]).filter(([, f]) => f.length), []);
});

const report = RS.buildReport(file);
const rows = report.records;
console.log(`    rules ${report.rules_version} · scorer calls oppose on ${report.summary.scorer_calls_oppose}/${rows.length} · within ±${report.confidence_tolerance} on ${report.summary.within_confidence_tolerance}`);
for (const m of report.oppose_misses) console.log(`    stance-score: OPPOSE MISS ${m.stance_id} — ${m.miss} (scorer ${m.scorer_confidence} vs label ${m.human_confidence}): ${m.scorer_reason}`);

await t('the re-score report on disk is current', () => {
  assert.equal(readFileSync(RS.OUT, 'utf8'), JSON.stringify(report, null, 2) + '\n', 'run node scripts/rescore-oppose-ground-truth-wave2-2026-11.mjs');
});
await t('the scorer never calls support on a labeled oppose record or source', () => {
  assert.deepEqual(rows.filter((r) => r.scorer.position === 'support').map((r) => r.stance_id), []);
  for (const r of rows) assert.ok(r.per_source.every((s) => s.position !== 'support'), `${r.stance_id}: a source reads support`);
});
await t('outside the logged misses, the scorer calls oppose with confidence within tolerance of the label', () => {
  for (const r of rows.filter((x) => !(x.stance_id in KNOWN_MISSES))) {
    assert.equal(r.scorer.position, 'oppose', `${r.stance_id}: new oppose miss (${r.scorer.position}: ${r.scorer.reason})`);
    assert.ok(Math.abs(r.scorer.confidence - r.human.confidence) <= S.CONFIDENCE_TOLERANCE + 1e-9,
      `${r.stance_id}: confidence ${r.scorer.confidence} vs label ${r.human.confidence}`);
  }
});
await t('every logged miss is still a miss, for the logged reason (shrink KNOWN_MISSES when one is fixed)', () => {
  for (const [id, reason] of Object.entries(KNOWN_MISSES)) {
    const r = rows.find((x) => x.stance_id === id);
    assert.ok(r, `${id} is not in the file`);
    assert.equal(r.scorer.position, 'no clear position', `${id} now reads ${r.scorer.position}: take it off KNOWN_MISSES`);
    assert.ok(r.scorer.reason.endsWith(reason), `${id}: reason is now "${r.scorer.reason}"`);
  }
  assert.deepEqual(report.oppose_misses.map((m) => m.stance_id).sort(), Object.keys(KNOWN_MISSES).sort());
});
await t('the first oppose batch, the Talarico record and every stance-ground-truth file are unchanged', () => {
  assert.equal(batchOne.length, 6);
  assert.equal(sha(path.join(root, 'db', TALARICO)), TALARICO_SHA);
  for (const f of gtFiles) assert.equal(sha(path.join(root, 'db', f)), before[f], f);
});

if (failures) { console.error(`${failures} failing`); process.exit(1); }
console.log('oppose ground-truth batch 2: all checks pass');
