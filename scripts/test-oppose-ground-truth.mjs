#!/usr/bin/env node
// test-oppose-ground-truth.mjs — six hand-labeled oppose records, scored with
// the current stance scorer.
//
// WHY. The scorer under-calls oppose. db/oppose-ground-truth-2026-11.json adds
// six clear oppose labels on different politicians and issue types: a tax
// increase (Jason Smith), a spending bill (DeLauro), a regulation rollback
// (Pallone), Medicaid work requirements (Wyden), birthright citizenship (Babin)
// and one EPA rule (Capito). Every excerpt is from the politician's own words.
//
//   · every record has the required fields, in the same shape as the Talarico
//     cost-of-living record, and every source has type, date, direct link,
//     a verbatim excerpt and a takes_clear_position flag;
//   · the scorer, run on those excerpts, calls oppose with a confidence within
//     tolerance of the label, except for the misses listed in KNOWN_MISSES
//     (none since the oppose rules pass), which are logged (with the scorer's
//     reason) for a later rules pass;
//     every record is recognized as its labeled issue, and Babin's read is as
//     it was before the vocabulary pass;
//     A new miss fails; so does a known miss that starts passing (take it off
//     the list). The scorer may never call support on an oppose label;
//   · the re-score report (scripts/rescore-oppose-ground-truth-2026-11.mjs) is
//     current;
//   · test coverage only: no live code reads the file, no pair repeats a
//     locked label, no record is quoted in a stance-rule file or stance test,
//     and no stance-ground-truth file (the Talarico record included) changes.
// Read-only: nothing is written to the stance store or the Evidence Locker.
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const imp = (p) => import(pathToFileURL(path.join(root, p)).href);
const RS = await imp('scripts/rescore-oppose-ground-truth-2026-11.mjs');
const S = await imp('netlify/lib/stance-score-core.mjs');
const G = await imp('netlify/lib/locked-ground-truth.mjs');
const SPLIT = await imp('scripts/gen-stance-heldout-split.mjs');

const FILE_NAME = 'oppose-ground-truth-2026-11.json';
const TALARICO = 'stance-ground-truth-talarico-cost-of-living.json';
const TALARICO_SHA = 'f2889f2a8e30dbae8f4bd099719ed2c53f290a9fb1a017ca0a3601b46da59586';
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
const gtFiles = readdirSync(path.join(root, 'db')).filter((n) => /^stance-ground-truth-.*\.json$/.test(n)).sort();
const before = Object.fromEntries(gtFiles.map((f) => [f, sha(path.join(root, 'db', f))]));
const file = JSON.parse(readFileSync(RS.GT_PATH, 'utf8'));
const recs = file.records;

// Misses under rules phase9-v3. When the set was added (2026-11-28) five
// records read "topic not found in source": the key's mention vocabulary did
// not see the politician's words. The oppose-gt-vocab pass (same day) added
// those words to the five keys' mention terms only, so every record became
// recognized as its labeled issue and Capito read oppose. Four then read
// "topic mention(s), none states a clear position (R3)": the key's side lists
// had no object for what they oppose. The oppose-gt-rules pass (same day)
// added those objects to the four keys' oppose side only: a rescissions bill
// (cut_spending), a corporate tax rate increase and the LINKED OPPOSE rule for
// "these tax increases … dead on arrival" (wealth_inequality_tax_fairness), the
// LINKED OPPOSE rule for "I oppose this legislation" beside a rollback of
// efficiency standards (gov_regulation), and paperwork framed as taking away
// health coverage (safety_net_work_requirements). All six now read oppose
// within tolerance, so the list is empty. Never add to it to pass.
export const KNOWN_MISSES = {};

const RECORD_FIELDS = ['stance_id', 'politician_id', 'topic', 'position', 'confidence', 'confidence_reason', 'sources', 'last_updated', 'status', 'locked', 'locked_on'];
const SOURCE_FIELDS = ['type', 'date', 'link', 'excerpt', 'weight', 'note', 'takes_clear_position'];
const ISO = /^\d{4}-\d{2}-\d{2}$/;

let failures = 0;
const t = async (name, fn) => {
  try { await fn(); console.log('  ✓', name); }
  catch (e) { failures++; console.error('  ✗', name, '\n    ', e.message); }
};

await t('4–6 oppose records, each on a different politician and issue key', () => {
  assert.ok(recs.length >= 4 && recs.length <= 6, `${recs.length} records`);
  assert.ok(recs.every((r) => r.position === 'oppose'));
  assert.equal(new Set(recs.map((r) => r.politician_id)).size, recs.length);
  assert.equal(new Set(recs.map((r) => r.topic)).size, recs.length);
  assert.equal(new Set(recs.map((r) => r.stance_id)).size, recs.length);
});
await t('every record has the required fields, in the Talarico record\'s shape', () => {
  const talarico = JSON.parse(readFileSync(path.join(root, 'db', TALARICO), 'utf8'));
  for (const f of RECORD_FIELDS) assert.ok(f in talarico, `the Talarico record has no ${f}; the shape changed`);
  for (const r of recs) {
    for (const f of RECORD_FIELDS) assert.ok(f in r, `${r.stance_id}: missing ${f}`);
    assert.equal(r.stance_id, `${r.politician_id}|${r.topic}|${r.stance_id.split('|')[2]}`);
    assert.match(r.stance_id.split('|')[2], /^gt-\d+$/);
    assert.ok(r.topic in S.TOPIC_RULES, `${r.stance_id}: ${r.topic} has no scoring rule`);
    assert.ok(typeof r.confidence === 'number' && r.confidence > 0 && r.confidence <= 0.9, `${r.stance_id}: confidence`);
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
      assert.ok(s.date === null || ISO.test(s.date), `${r.stance_id}: date ${s.date}`);
      assert.match(s.link, /^https:\/\/[^/]+\.(?:house|senate)\.gov\//, `${r.stance_id}: ${s.link} is not an official House / Senate page`);
      assert.ok(S.isPrimarySource(s.type, s.link), `${r.stance_id}: ${s.type} does not read as a primary source`);
      assert.ok(/^".+"$/s.test(s.excerpt), `${r.stance_id}: excerpt is not a quotation`);
      assert.match(s.note, /^Read directly on \d{4}-\d{2}-\d{2}\./);
    }
  }
});
await t('test coverage only: no pair repeats a locked label, and nothing live reads the file', () => {
  const clash = recs.filter((r) => G.LOCKED_GROUND_TRUTH_INDEX.has(G.pairKey(r.politician_id, r.topic))).map((r) => r.stance_id);
  assert.deepEqual(clash, []);
  const ids = new Set(G.LOCKED_GROUND_TRUTH.map((r) => r.stance_id));
  assert.deepEqual(recs.map((r) => r.stance_id).filter((id) => ids.has(id)), []);
  assert.ok(!(FILE_NAME in G.GROUND_TRUTH_FILES));
  for (const f of ['netlify/lib/locked-ground-truth.mjs', 'netlify/lib/stance-score-core.mjs', 'netlify/lib/raw-ingest-core.mjs', 'netlify/lib/evidence-locker-core.mjs', 'netlify/lib/stated-positions-core.mjs', 'netlify/functions/raw-ingest-cron.mts', 'netlify/functions/video-transcribe.mts', 'netlify/functions/locker-rescore-cron.mts', 'sw.js']) {
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
  assert.equal(readFileSync(RS.OUT, 'utf8'), JSON.stringify(report, null, 2) + '\n', 'run node scripts/rescore-oppose-ground-truth-2026-11.mjs');
});
await t('the scorer never calls support on a labeled oppose source', () => {
  assert.deepEqual(rows.filter((r) => r.scorer.position === 'support').map((r) => r.stance_id), []);
  for (const r of rows) assert.ok(r.per_source.every((s) => s.position !== 'support'), `${r.stance_id}: a source reads support`);
});
await t('outside the logged misses, the scorer calls oppose with confidence within tolerance of the label', () => {
  for (const r of rows.filter((x) => !(x.stance_id in KNOWN_MISSES))) {
    assert.equal(r.scorer.position, 'oppose', `${r.stance_id}: new oppose miss (${r.scorer.position}: ${r.scorer.reason})`);
    assert.ok(Math.abs(r.scorer.confidence - r.human.confidence) <= S.CONFIDENCE_TOLERANCE + 1e-9,
      `${r.stance_id}: confidence ${r.scorer.confidence} vs label ${r.human.confidence}`);
    assert.ok(r.scorer.confidence >= 0.5 && r.scorer.confidence <= 0.95, `${r.stance_id}: confidence ${r.scorer.confidence} out of range`);
  }
});
await t('every record is recognized as its labeled issue (no "topic not found in source")', () => {
  for (const r of rows) {
    assert.ok(!/topic not found/.test(r.scorer.reason), `${r.stance_id}: ${r.scorer.reason}`);
    assert.ok(r.scorer.confidence > 0, `${r.stance_id}: pooled read found no mention`);
  }
});
await t('the Babin record reads as it did before the vocabulary pass (oppose, 0.8)', () => {
  const r = rows.find((x) => x.stance_id === 'brian_babin|birthright_citizenship|gt-305');
  assert.equal(r.scorer.position, 'oppose');
  assert.equal(r.scorer.confidence, 0.8);
});
await t('the four records fixed by the oppose rules pass read oppose within tolerance', () => {
  for (const id of ['jason_smith|wealth_inequality_tax_fairness|gt-301', 'delauro|cut_spending|gt-302', 'pallone|gov_regulation|gt-303', 'wyden|safety_net_work_requirements|gt-304']) {
    const r = rows.find((x) => x.stance_id === id);
    assert.ok(r, `${id} is not in the file`);
    assert.equal(r.scorer.position, 'oppose', `${id}: ${r.scorer.reason}`);
    assert.ok(Math.abs(r.scorer.confidence - r.human.confidence) <= S.CONFIDENCE_TOLERANCE + 1e-9, `${id}: ${r.scorer.confidence} vs ${r.human.confidence}`);
  }
});
await t('every logged miss is still a miss, as recorded (shrink KNOWN_MISSES when one is fixed)', () => {
  for (const [id, pos] of Object.entries(KNOWN_MISSES)) {
    const r = rows.find((x) => x.stance_id === id);
    assert.ok(r, `${id} is not in the file`);
    assert.equal(r.scorer.position, pos, `${id} now reads ${r.scorer.position}: take it off KNOWN_MISSES`);
  }
  assert.deepEqual(report.oppose_misses.map((m) => m.stance_id).sort(), Object.keys(KNOWN_MISSES).sort());
});
await t('the Talarico cost-of-living record and every stance-ground-truth file are unchanged', () => {
  assert.equal(sha(path.join(root, 'db', TALARICO)), TALARICO_SHA);
  for (const f of gtFiles) assert.equal(sha(path.join(root, 'db', f)), before[f], f);
});

if (failures) { console.error(`${failures} failing`); process.exit(1); }
console.log('oppose ground-truth set: all checks pass');
