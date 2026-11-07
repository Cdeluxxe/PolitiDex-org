#!/usr/bin/env node
// test-stance-score.mjs — Phase 4 scoring rules against the ground truth.
// Feeds the scoring module a raw ingest record shaped like the Talarico
// "Taxes & Cost of Living" campaign page and checks the candidate against the
// ground-truth record: position must match; confidence must be within 0.1 (the
// exact delta is always printed). Also pins each rule (R1–R5), and asserts the
// ground-truth file, the raw record, and the raw-store code are unchanged.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const gtPath = path.join(root, 'db/stance-ground-truth-talarico-cost-of-living.json');
const corePath = path.join(root, 'netlify/lib/stance-score-core.mjs');
const rawCorePath = path.join(root, 'netlify/lib/raw-ingest-core.mjs');
const GT_SHA256 = '5b2874ce0159dfde0777c43b6f90b15bf051a3b119373c6aa42640b8d0b861cb';
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
const rawCoreBefore = sha(rawCorePath);

const S = await import(pathToFileURL(corePath).href);
const gt = JSON.parse(readFileSync(gtPath, 'utf8'));

let failures = 0;
const t = async (name, fn) => {
  try { await fn(); console.log('  ✓', name); }
  catch (e) { failures++; console.error('  ✗', name, '\n    ', e.message); }
};
const deepFreeze = (o) => { Object.values(o).forEach((v) => v && typeof v === 'object' && deepFreeze(v)); return Object.freeze(o); };

// Shaped like the real page: header, intro, bio, embedded posts (including an
// opponent-attributed line that must NOT count), a mention-only line, and the
// "My Priorities" list. Wording mirrors the live page.
const PAGE = `<!doctype html><html><head><title>James Talarico on Taxes &amp; Cost of Living | U.S. Senate</title>
<script>var x = "lower prices on everything";</script><style>.a{}</style></head><body>
<header><nav><a href="/issues/">Issues</a></nav></header>
<h1>Taxes &amp; Cost of Living</h1>
<p>Why is everything so expensive in Texas? James Talarico worked with Republicans to deliver the largest property tax cut in Texas history. In the Senate, he&#8217;ll cut taxes for working people, cap credit card interest rates, and lower the cost of rent, groceries, utilities, and gas by making billionaires and giant corporations pay their fair share.</p>
<p>I know what it&rsquo;s like to be crushed by student debt and medical debt.</p>
<p>As a legislator, I have fought for working Texans &mdash; passing major legislation to lower the cost of prescription drugs, housing, and childcare.</p>
<blockquote class="twitter-tweet"><p>DC politicians like John Cornyn promised to lower costs, fight for families, and drain the swamp. Now they&rsquo;re trying to gut healthcare for millions to cut taxes for their donors.</p>&mdash; James Talarico (@jamestalarico)</blockquote>
<blockquote class="twitter-tweet"><p>Do you struggle to afford the high price of everything? So do I.</p></blockquote>
<h2>My Priorities in the U.S. Senate</h2>
<ul>
<li>Pass a cost-of-living tax cut for the middle class: Expand the Child Tax Credit and Earned Income Tax Credit.</li>
<li>Lower housing costs: Stop corporate landlords from engaging in market manipulation to artificially hike rents.</li>
<li>Lower grocery costs: Increase oversight into mergers and acquisitions that artificially jack up prices.</li>
<li>Cap sky-high credit card interest rates: Rein in the predatory credit card companies.</li>
</ul></body></html>`;

const RAW = deepFreeze({
  url: 'https://jamestalarico.com/issue/taxes-cost-of-living/',
  final_url: 'https://jamestalarico.com/issue/taxes-cost-of-living/',
  fetched_at: '2026-11-07T08:00:00.000Z',
  source_type: 'campaign issue page',
  politician_id: 'james_talarico',
  topic: 'cost_living',
  http_status: 200,
  content_type: 'text/html; charset=UTF-8',
  body_chars: PAGE.length,
  body: PAGE,
});
const RAW_SNAPSHOT = JSON.stringify(RAW);
const raw = (over) => ({ ...RAW, ...over });

const lines = [];
const { candidate, comparison } = S.scoreAgainstGroundTruth(RAW, gt, { log: (l) => lines.push(l) });
console.log('    ' + comparison.note);

await t('candidate position matches the ground-truth position', () => {
  assert.equal(candidate.position, gt.position);
  assert.equal(comparison.positionMatch, true);
});
await t(`confidence within ${S.CONFIDENCE_TOLERANCE} of ground truth (Δ=${comparison.delta})`, () => {
  assert.ok(comparison.confidenceWithin, `delta ${comparison.delta} — rules need a tweak in WEIGHTS`);
  assert.ok(Math.abs(candidate.confidence - gt.confidence) <= 0.1 + 1e-9);
});
await t('logs the candidate and a one-line match note with the exact delta', () => {
  assert.ok(lines.some((l) => l.startsWith('stance-score: candidate {')));
  const note = lines.find((l) => /position (MATCH|MISMATCH)/.test(l));
  assert.ok(note && !note.includes('\n'));
  assert.match(note, /Δ=[+-]\d\.\d\d (within|OUTSIDE) 0\.1/);
});
await t('candidate has position + confidence + source list pointing at the raw pull', () => {
  assert.ok(['support', 'oppose', 'mixed', 'no clear position'].includes(candidate.position));
  assert.ok(candidate.confidence >= 0 && candidate.confidence <= 1);
  assert.ok(candidate.confidence_reason && !candidate.confidence_reason.includes('\n'));
  assert.equal(candidate.sources.length, 1);
  const [src] = candidate.sources;
  assert.equal(src.link, RAW.url);
  assert.equal(src.type, 'campaign issue page');
  assert.ok(src.excerpt && src.takes_clear_position === true);
});
await t('R1: campaign page clear statements are medium weight; R4: ≥3 consistent raise confidence', () => {
  const st = candidate.sources[0].statements;
  const clear = st.filter((s) => s.kind === 'clear');
  assert.ok(clear.length >= 3, `only ${clear.length} clear statements`);
  assert.ok(clear.every((s) => s.weight === S.WEIGHTS.medium && s.side === 'support'));
  assert.equal(candidate.confidence, S.WEIGHTS.baseConfidence.medium + S.WEIGHTS.corroborationBonus);
});
await t('R3: mentions without a clear position (and opponent-attributed lines) are recorded at zero weight', () => {
  const st = candidate.sources[0].statements;
  const cornyn = st.find((s) => s.text.includes('Cornyn'));
  assert.ok(cornyn, 'Cornyn line recorded');
  assert.equal(cornyn.kind, 'mention'); assert.equal(cornyn.weight, 0);
  const afford = st.find((s) => s.text.includes('afford the high price'));
  assert.equal(afford.kind, 'mention'); assert.equal(afford.weight, 0);
  assert.ok(!st.some((s) => s.text.includes('var x')), 'script content ignored');
  const only = S.scoreRawRecord(raw({ body: '<p>Do you struggle to afford the high price of everything? So do I.</p>' }));
  assert.equal(only.position, 'no clear position');
  assert.equal(only.sources[0].takes_clear_position, false);
});
await t('R2: a direct quote in a speech or press release is high weight', () => {
  const c = S.scoreRawRecord(raw({ source_type: 'press release', body: '<p>“We will cut taxes for working families.”</p>' }));
  assert.equal(c.position, 'support');
  assert.equal(c.sources[0].statements[0].weight, S.WEIGHTS.high);
  assert.equal(c.confidence, S.WEIGHTS.baseConfidence.high);
  assert.equal(S.tierFor('speech (victory speech)'), 'high');
});
await t('R5: a single outlier does not flip the position; explicit reversal language does', () => {
  const outlier = PAGE.replace('</ul>', '<li>We oppose any tax cuts this year.</li></ul>');
  const c = S.scoreRawRecord(raw({ body: outlier }));
  assert.equal(c.position, 'support');
  assert.ok(c.confidence < candidate.confidence, 'outlier lowers confidence');
  const rev = PAGE.replace('</ul>', '<li>I have changed my mind: I now oppose tax cuts for the middle class.</li></ul>');
  assert.equal(S.scoreRawRecord(raw({ body: rev })).position, 'oppose');
});
await t('rejects a ground truth for a different politician/topic', () => {
  assert.throws(() => S.compareToGroundTruth(candidate, { ...gt, topic: 'healthcare' }));
});
await t('file entry point reads the ground truth read-only and agrees', async () => {
  const r = await S.scoreWithGroundTruthFile(RAW, gtPath, { log: () => {} });
  assert.equal(r.comparison.positionMatch, true);
});
await t('ground-truth file is unchanged', () => assert.equal(sha(gtPath), GT_SHA256));
await t('raw record and raw store are unchanged; scorer has no store access', () => {
  assert.equal(JSON.stringify(RAW), RAW_SNAPSHOT);
  assert.equal(sha(rawCorePath), rawCoreBefore);
  const src = readFileSync(corePath, 'utf8').replace(/^\s*\/\/.*$/gm, '');
  assert.ok(!/@netlify\/blobs|getStore|setJSON|writeFile/.test(src), 'scorer must not write anywhere');
});

if (failures) { console.error(`${failures} failing`); process.exit(1); }
console.log('stance score: all checks pass');
