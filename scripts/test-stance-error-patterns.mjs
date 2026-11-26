#!/usr/bin/env node
// test-stance-error-patterns.mjs — the two error patterns found on the
// held-out expansion set (scripts/test-stance-heldout-benchmark.mjs), as tests.
//
//   PATTERN 1 — someone else's action read as the speaker's own position:
//     an opponent's or a third party's act ("Republicans eliminated the ACA tax
//     credits"), criticism of another person's plan, or the office's lead-in
//     ("Congressman X joined his colleagues…") is read as the speaker's stance.
//   PATTERN 2 — a mixed position flattened into one side: the speaker is for one
//     part and against another, and the read keeps only one side.
//
// Two layers:
//   A. The five real records (Clark, Steil, Fulcher, Crawford, Khanna). Each
//      wrong read is PINNED as a known gap at its exact current value: the test
//      fails when the read changes, so a fix (or a different wrong read) is
//      noticed and the pin is removed on purpose. For every one of them the
//      suite also checks the safety net: the wrong read contradicts a locked
//      label, so the Evidence Locker writer refuses it, the promotion step
//      drops it, and a card carrying it is not served. Each of those checks is
//      paired with the same call without the locked labels, so it is the
//      locked-label check — and nothing else — that stops the read.
//   B. Small synthetic pages for each pattern: controls the scorer must get
//      right today, and pinned gaps. The set of failing expectations must equal
//      the pinned gap list exactly, so a NEW instance of either pattern fails.
//
// Log-only: fake in-memory stores, nothing is written to the Evidence Locker,
// the stance table or any file. No ground-truth file is changed (hash-checked).
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const imp = (p) => import(pathToFileURL(path.join(root, p)).href);
const S = await imp('netlify/lib/stance-score-core.mjs');
const L = await imp('netlify/lib/evidence-locker-core.mjs');
const SP = await imp('netlify/lib/stated-positions-core.mjs');
const G = await imp('netlify/lib/locked-ground-truth.mjs');

const GT_PATH = path.join(root, 'db/stance-ground-truth-expansion-2026-11.json');
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
const gtShaBefore = sha(GT_PATH);
const records = JSON.parse(readFileSync(GT_PATH, 'utf8')).records;

let failures = 0;
const t = async (name, fn) => {
  try { await fn(); console.log('  ✓', name); }
  catch (e) { failures++; console.error('  ✗', name, '\n    ', e.message); }
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Same read as the benchmark: excerpt fragments split on " ... " become paragraphs.
const toBody = (excerpt) => String(excerpt).split(/\s*\.\.\.\s*/).map((f) => f.trim()).filter(Boolean)
  .map((f) => `<p>${esc(f.replace(/^["“]|["”]$/g, '').replace(/,$/, '.'))}</p>`).join('\n');
const P = (...sentences) => sentences.map((x) => `<p>${esc(x)}</p>`).join('\n');
const rawOf = (pid, topic, body, { link = 'https://example.house.gov/media/press-releases/x', type = 'official press release' } = {}) =>
  ({ url: link, final_url: link, fetched_at: '2026-11-12T00:00:00.000Z', source_type: type, politician_id: pid, topic, body });

// A store that records writes; the suite asserts it is never written to.
const fakeStore = () => {
  const writes = [];
  return {
    writes,
    async get() { return null; },
    async setJSON(key, v) { writes.push(key); return { modified: true }; },
    async list() { return { blobs: [] }; },
  };
};

// ── A. The five real held-out records ─────────────────────────────────────
// stance_id → { pattern, read: the scorer's current (wrong) read }.
const RECORD_GAPS = {
  'kclark|healthcare|gt-019': { pattern: 1, why: "an opponent's action (\"Republicans eliminated the ACA tax credits…\") read as her own oppose", read: { position: 'oppose', confidence: 0.8 } },
  'bryan_steil|edu_college_cost|gt-078': { pattern: 1, why: "criticism of the President's debt plan read as support for it", read: { position: 'support', confidence: 0.7 } },
  'russ_fulcher|lands_preserve|gt-083': { pattern: 1, why: "the office's lead-in (\"joined many of his Republican colleagues…\") read as support; his floor opposition is missed", read: { position: 'support', confidence: 0.8 } },
  'rick_crawford|ukraine_aid|gt-008': { pattern: 2, why: 'against the $60.8B package, for lethal military aid — flattened to support', read: { position: 'support', confidence: 0.8 } },
  'khanna|cut_spending|gt-021': { pattern: 2, why: 'cuts in some programs to fund investment in others — flattened to support', read: { position: 'support', confidence: 0.8 } },
};

for (const [id, gap] of Object.entries(RECORD_GAPS)) {
  const gt = records.find((r) => r.stance_id === id);
  await t(`${id}: is a locked expansion record with one source`, () => {
    assert.ok(gt, 'record missing from the expansion file');
    assert.equal(gt.locked, true);
    assert.equal(gt.sources.length, 1);
    assert.equal(G.LOCKED_GROUND_TRUTH_INDEX.get(`${gt.politician_id}|${gt.topic}`)?.stance_id, id, 'not in the locked index the ingest job uses');
  });
  if (!gt) continue;
  const src = gt.sources[0];
  const raw = rawOf(gt.politician_id, gt.topic, toBody(src.excerpt), { link: src.link, type: src.type });
  const c = S.scoreRawRecord(raw, gt.topic);

  await t(`pattern ${gap.pattern} known gap ${id}: still reads ${gap.read.position} ${gap.read.confidence} (human: ${gt.position}) — ${gap.why}`, () => {
    assert.notEqual(c.position, gt.position, 'now matches the human label — remove it from RECORD_GAPS');
    assert.deepEqual({ position: c.position, confidence: c.confidence }, gap.read, 'the wrong read changed — re-pin it on purpose');
  });

  await t(`${id}: the Locker writer refuses the contradicting read under the locked labels (and would write it without them)`, async () => {
    const d = L.lockerDecision(c, raw, G.LOCKED_GROUND_TRUTH_INDEX);
    assert.equal(d.write, false);
    assert.equal(d.contradicts, id, d.reason);
    assert.equal(L.lockerDecision(c, raw, null).write, true, 'without the locked labels the read is written — so the label is what stops it');
    const store = fakeStore();
    const w = await L.maybeWriteLockerItem(c, raw, { store, gt: G.LOCKED_GROUND_TRUTH_INDEX, log: () => {} });
    assert.equal(w.written, false);
    assert.deepEqual(store.writes, [], 'nothing reaches the store');
  });

  await t(`${id}: an item carrying the read is never promoted, and a card carrying it is never served`, () => {
    const item = L.buildLockerItem(c, raw);
    const entry = L.toSpotlightEntry(item, { key: `${gt.politician_id}/${gt.topic}/x.json` });
    assert.equal(entry.issueKey, gt.topic);
    assert.equal(entry.pipeline.position, c.position);
    assert.ok(gt.topic in SP.promoteEntries([entry]), 'control: the item qualifies on its own strength');
    assert.ok(!(gt.topic in SP.promoteEntries([entry], { pid: gt.politician_id })), 'promoted despite the locked label');
    const row = { politicianId: gt.politician_id, issueKey: gt.topic, stance: c.position, status: 'active', provenance: 'pipeline', sourceUrl: src.link, evidence: ['k'] };
    assert.equal(SP.cardsBody([row], {}, { groundTruth: null }).count, 1, 'control: served without the labels');
    assert.equal(SP.cardsBody([row]).count, 0, 'a contradicting card is served');
    if (gt.position !== 'mixed') assert.equal(SP.cardsBody([{ ...row, stance: gt.position }]).count, 1, 'a card that agrees is still served');
  });
}

// ── B. Synthetic pages, one behaviour each ─────────────────────────────────
// expect: a predicate on the read; gap: the current read when the expectation
// fails today (pinned). Controls carry no gap and must pass.
const not = (p) => (c) => c.position !== p;
const is = (p) => (c) => c.position === p;
const CLARK_OPP = "Republicans eliminated the ACA tax credits and slashed $1 trillion from Medicaid.";
const CLARK_OWN = 'I will fight to protect the Affordable Care Act and expand access to affordable health care for every family.';
const FULCHER_LEAD = 'This week Congressman Russ Fulcher joined many of his Republican colleagues to submit amendments to H.R. 803, the Protecting America’s Wilderness and Public Lands Act.';
const CASES = [
  // Pattern 1 — another actor's act, plan or the office's voice.
  { id: 'p1-opponent-act-alone', pattern: 1, pid: 'kclark', topic: 'healthcare', body: P(CLARK_OPP),
    expect: not('oppose'), want: 'not oppose: the sentence reports what Republicans did, not her position', gap: { position: 'oppose', confidence: 0.8 } },
  { id: 'p1-opponent-act-pronoun', pattern: 1, pid: 'kclark', topic: 'healthcare', body: P('They repealed the ACA tax credits and cut Medicaid for millions.'),
    expect: not('oppose'), want: 'not oppose (control: a "they" act is not read as hers today)' },
  { id: 'p1-own-support-control', pattern: 1, pid: 'kclark', topic: 'healthcare', body: P(CLARK_OWN),
    expect: is('support'), want: 'support (control: her own words)' },
  { id: 'p1-own-support-plus-opponent-act', pattern: 1, pid: 'kclark', topic: 'healthcare', body: P(CLARK_OWN, CLARK_OPP),
    expect: is('support'), want: "support: adding the opponent's act must not move her own read", gap: { position: 'mixed', confidence: 0.5 } },
  { id: 'p1-criticises-another-plan', pattern: 1, pid: 'bryan_steil', topic: 'edu_college_cost',
    body: P('His plan to shift the burden of college debt to all taxpayers accelerates inflation and does nothing to address the underlying issue of rising tuition costs.'),
    expect: not('support'), want: "not support: he criticises the President's plan", gap: { position: 'support', confidence: 0.7 } },
  { id: 'p1-office-lead-in-alone', pattern: 1, pid: 'russ_fulcher', topic: 'lands_preserve', body: P(FULCHER_LEAD),
    expect: not('support'), want: 'not support: submitting amendments with colleagues is not support for the bill', gap: { position: 'support', confidence: 0.8 } },
  { id: 'p1-office-lead-in-then-opposition', pattern: 1, pid: 'russ_fulcher', topic: 'lands_preserve',
    body: P(FULCHER_LEAD, 'Congressman Fulcher spoke on the House floor this evening in opposition of the overall bill.'),
    expect: not('support'), want: 'not support: he spoke in opposition to the bill', gap: { position: 'support', confidence: 0.8 } },
  // Pattern 2 — for one part, against another.
  { id: 'p2-voted-against-package-for-lethal-aid', pattern: 2, pid: 'rick_crawford', topic: 'ukraine_aid',
    body: P('I voted against the $60.8 billion aid bill to Ukraine.', 'We need to help Ukraine with lethal, military aid so that it can stop Russia in its tracks.'),
    expect: is('mixed'), want: 'mixed: against the package, for lethal aid', gap: { position: 'oppose', confidence: 0.8 } },
  { id: 'p2-explicit-oppose-and-support', pattern: 2, pid: 'rick_crawford', topic: 'ukraine_aid',
    body: P('I oppose sending billions more in economic aid to Ukraine.', 'I support sending lethal military aid to Ukraine.'),
    expect: is('mixed'), want: 'mixed (control: two explicit first-person sides)' },
  { id: 'p2-oppose-only-control', pattern: 2, pid: 'rick_crawford', topic: 'ukraine_aid', body: P('I oppose sending billions more in aid to Ukraine.'),
    expect: is('oppose'), want: 'oppose (control: one side only stays one side)' },
  { id: 'p2-cut-some-protect-others', pattern: 2, pid: 'khanna', topic: 'cut_spending',
    body: P('The plan will cut spending by modernizing the Pentagon and ending fossil fuel subsidies.', 'I oppose cuts to Medicaid, Social Security and other essential programs.'),
    expect: is('mixed'), want: 'mixed: cuts some programs, opposes cuts to others', gap: { position: 'support', confidence: 0.8 } },
];

const failing = [];
for (const k of CASES) {
  const c = S.scoreRawRecord(rawOf(k.pid, k.topic, k.body), k.topic);
  const ok = k.expect(c);
  if (!ok) failing.push(k.id);
  if (k.gap) {
    await t(`pattern ${k.pattern} known gap ${k.id}: reads ${k.gap.position} ${k.gap.confidence} (want ${k.want})`, () => {
      assert.equal(ok, false, 'now meets its expectation — remove the gap pin');
      assert.deepEqual({ position: c.position, confidence: c.confidence }, k.gap, 'the wrong read changed — re-pin it on purpose');
    });
  } else {
    await t(`pattern ${k.pattern} ${k.id}: ${k.want}`, () => assert.ok(ok, `read ${c.position} ${c.confidence}`));
  }
}

await t('the failing expectations are exactly the pinned gaps (a new instance of either pattern fails here)', () => {
  assert.deepEqual(failing.sort(), CASES.filter((k) => k.gap).map((k) => k.id).sort());
  const p = (n) => CASES.filter((k) => k.pattern === n);
  console.log(`    pattern 1: ${p(1).filter((k) => !k.gap).length} control(s) pass, ${p(1).filter((k) => k.gap).length} gap(s) pinned · ` +
    `pattern 2: ${p(2).filter((k) => !k.gap).length} control(s) pass, ${p(2).filter((k) => k.gap).length} gap(s) pinned · ` +
    `records: ${Object.keys(RECORD_GAPS).length} pinned, all refused by the locked-label check`);
});

await t('no ground-truth file was modified', () => assert.equal(sha(GT_PATH), gtShaBefore));

if (failures) { console.error(`${failures} failing`); process.exit(1); }
console.log('stance error patterns: all checks pass');
