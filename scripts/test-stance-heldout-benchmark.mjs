#!/usr/bin/env node
// test-stance-heldout-benchmark.mjs — the 77 expansion ground-truth records as a
// guarded benchmark for the stance scorer.
//
// WHY. The 52 Massie / Sanders / Talarico records are what the rules were tuned
// on, so 52/52 there says little about a politician nobody tuned for. The 77
// expansion records (one per politician, 24 issue keys) were never tuned on;
// this suite scores them every run and fails if accuracy slips.
//
// THE READ is exactly the expansion re-score report's
// (scripts/rescore-ground-truth-expansion-2026-11.mjs buildReport): the
// reviewer's verbatim excerpts, one pooled record-level read per record.
//
// GATES (whole set, 77 records):
//   · position matches          ≥ 42
//   · wrong-position calls      ≤ 6   (a support / oppose / mixed read that differs
//                                      from the label; "no clear position" is an
//                                      abstention, not a wrong call)
//   · oppose recall             ≥ 4 of 11 (oppose labels read as oppose)
// and on the HELD-OUT third alone, no worse than when the split was made.
// The abstain rate per issue key is printed every run.
//
// HELD OUT. db/stance-heldout-split-2026-11.json (scripts/gen-stance-heldout-split.mjs)
// holds back 24 records. They must not be used to write or adjust any rule,
// vocabulary entry or stance test: the suite fails if a held-out record's id or
// a verbatim excerpt fragment appears in scripts/test-stance-*.mjs or
// netlify/lib/stance-*.mjs. Tune on the tuning side; read the held-out numbers.
//
// Read-only: no ground-truth file, store or site file is touched (hash-checked).
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const imp = (p) => import(pathToFileURL(path.join(root, p)).href);
const { buildReport } = await imp('scripts/rescore-ground-truth-expansion-2026-11.mjs');
const SPLIT = await imp('scripts/gen-stance-heldout-split.mjs');

const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
const gtShaBefore = sha(SPLIT.GT_PATH);
const file = JSON.parse(readFileSync(SPLIT.GT_PATH, 'utf8'));
const split = JSON.parse(readFileSync(SPLIT.SPLIT_PATH, 'utf8'));

// The gates. Raise a floor when the scorer improves; never lower one to pass.
export const GATES = { records: 77, min_matches: 42, max_wrong: 6, oppose_labels: 11, min_oppose_recall: 4 };
// Held-out third, as measured when the split was made (phase9-v3, 2026-11-26).
// Its 0 wrong calls is by construction: the six known wrong reads are tuning
// targets and were kept out of it, so any wrong call here is a new one.
export const HOLDOUT_GATES = { records: 24, min_matches: 12, max_wrong: 0, oppose_labels: 3, min_oppose_recall: 0 };

let failures = 0;
const t = async (name, fn) => {
  try { await fn(); console.log('  ✓', name); }
  catch (e) { failures++; console.error('  ✗', name, '\n    ', e.message); }
};

const ABSTAIN = 'no clear position';
const report = buildReport(file);
const rows = report.records;
const outcome = (r) => (r.scorer_agrees ? 'match' : r.scorer.position === ABSTAIN ? 'abstain' : 'wrong');
export function metrics(list) {
  const oppose = list.filter((r) => r.human.position === 'oppose');
  return {
    records: list.length,
    matches: list.filter((r) => outcome(r) === 'match').length,
    abstains: list.filter((r) => outcome(r) === 'abstain').length,
    wrong: list.filter((r) => outcome(r) === 'wrong').length,
    oppose_labels: oppose.length,
    oppose_recall: oppose.filter((r) => r.scorer.position === 'oppose').length,
    confidence_outside: list.filter((r) => r.scorer_agrees && r.verdict.includes('outside')).length,
  };
}
const held = new Set(split.holdout);
const all = metrics(rows);
const ho = metrics(rows.filter((r) => held.has(r.stance_id)));
const tu = metrics(rows.filter((r) => !held.has(r.stance_id)));
const line = (name, m) => `${name}: ${m.matches}/${m.records} match · ${m.abstains} abstain · ${m.wrong} wrong · oppose recall ${m.oppose_recall}/${m.oppose_labels}` +
  (m.confidence_outside ? ` · ${m.confidence_outside} match(es) with confidence outside ±0.10` : '');
console.log(`    rules ${report.rules_version} · vocab ${report.vocab_version}`);
console.log('    ' + line('all 77', all));
console.log('    ' + line('tuning', tu));
console.log('    ' + line('held out', ho));

// Abstain rate per issue key.
const byTopic = {};
for (const r of rows) {
  const b = (byTopic[r.topic] ||= { n: 0, match: 0, abstain: 0, wrong: 0 });
  b.n++; b[outcome(r)]++;
}
console.log('    abstain rate per issue key (abstain / records · match · wrong):');
for (const k of Object.keys(byTopic).sort((a, b) => byTopic[b].abstain / byTopic[b].n - byTopic[a].abstain / byTopic[a].n || a.localeCompare(b))) {
  const b = byTopic[k];
  console.log(`      ${k.padEnd(22)} ${String(Math.round((100 * b.abstain) / b.n)).padStart(3)}%  (${b.abstain}/${b.n} · ${b.match} match · ${b.wrong} wrong)`);
}
const wrongRows = rows.filter((r) => outcome(r) === 'wrong');
console.log('    wrong-position calls: ' + (wrongRows.map((r) => `${r.stance_id} ${r.human.position}→${r.scorer.position}`).join(', ') || 'none'));

const gate = async (name, m, g) => {
  await t(`${name}: ${g.records} records scored`, () => assert.equal(m.records, g.records));
  await t(`${name}: position matches ≥ ${g.min_matches} (now ${m.matches})`, () => assert.ok(m.matches >= g.min_matches, `matches fell to ${m.matches}`));
  await t(`${name}: wrong-position calls ≤ ${g.max_wrong} (now ${m.wrong})`, () => assert.ok(m.wrong <= g.max_wrong, `wrong-position calls rose to ${m.wrong}`));
  await t(`${name}: oppose recall ≥ ${g.min_oppose_recall} of ${g.oppose_labels} (now ${m.oppose_recall})`, () => {
    assert.equal(m.oppose_labels, g.oppose_labels);
    assert.ok(m.oppose_recall >= g.min_oppose_recall, `oppose recall fell to ${m.oppose_recall}/${m.oppose_labels}`);
  });
};
await gate('benchmark (all 77)', all, GATES);
await gate('held-out third', ho, HOLDOUT_GATES);

await t('split: tuning and held-out sides partition the 77 records; about a third is held out', () => {
  const ids = rows.map((r) => r.stance_id);
  assert.deepEqual([...split.holdout, ...split.tuning].sort(), [...ids].sort());
  assert.equal(new Set([...split.holdout, ...split.tuning]).size, ids.length, 'a record is on both sides');
  const share = split.holdout.length / ids.length;
  assert.ok(share >= 0.28 && share <= 0.38, `held-out share ${share.toFixed(2)}`);
  for (const p of ['support', 'oppose', 'mixed']) assert.ok(rows.some((r) => held.has(r.stance_id) && r.human.position === p), `no held-out ${p} record`);
  for (const id of SPLIT.ERROR_TARGETS) assert.ok(!held.has(id), `${id} is an error-pattern target and cannot be held out`);
});
await t('split: no held-out record is quoted in a stance-rule file (unused for tuning)', () => {
  const texts = Object.fromEntries(SPLIT.tuningFiles().filter((f) => f !== 'scripts/test-stance-heldout-benchmark.mjs')
    .map((f) => [f, readFileSync(path.join(root, f), 'utf8')]));
  const leaks = file.records.filter((r) => held.has(r.stance_id)).map((r) => [r.stance_id, SPLIT.mentionsOf(r, texts)]).filter(([, f]) => f.length);
  assert.deepEqual(leaks, [], 'a held-out record was used in a rule or stance test — move it to tuning by re-running the split on purpose, and say so');
});
await t('split: the committed split is frozen at its version and counts', () => {
  assert.equal(split.split_version, SPLIT.SPLIT_VERSION);
  assert.deepEqual(split.counts, { records: 77, holdout: 24, tuning: 53, not_eligible_error_targets: 6, not_eligible_already_seen: 2 });
});
await t('the expansion ground-truth file was not modified', () => assert.equal(sha(SPLIT.GT_PATH), gtShaBefore));

if (failures) { console.error(`${failures} failing`); process.exit(1); }
console.log('stance held-out benchmark: all checks pass');
