#!/usr/bin/env node
// test-stance-score.mjs — Phase 4 scoring rules against the ground truth (+ Phase 7 R6 implication layer).
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
const GT_SHA256 = 'f2889f2a8e30dbae8f4bd099719ed2c53f290a9fb1a017ca0a3601b46da59586';
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
// ── Phase 5: second topic (healthcare_costs) and a new politician ──
const HC_PAGE = `<html><head><title>Issues | Ken Paxton for U.S. Senate</title></head><body>
<h2>Take on Big Pharma</h2>
<p>In the Senate, he will fight to lower prescription drug costs and cap insulin co-pays for Texas families.</p>
<p>Families deserve to bring down out-of-pocket costs at the pharmacy counter.</p>
<p>We will reduce health insurance premiums by increasing competition.</p>
<p>America spends more on healthcare than any nation in the world.</p>
<p>Lower grocery costs: stop price gouging at the checkout.</p>
</body></html>`;
const HC_RAW = deepFreeze({ ...RAW, politician_id: 'ken_paxton', topic: 'healthcare_costs',
  url: 'https://www.kenpaxton.com/issues', final_url: 'https://www.kenpaxton.com/issues', source_type: 'campaign issues page', body: HC_PAGE });

await t('healthcare_costs: new politician page scores with the same R1–R5 and weights', () => {
  assert.ok(S.hasRulesFor('healthcare_costs'));
  const c = S.scoreRawRecord(HC_RAW);
  assert.equal(c.politician_id, 'ken_paxton');
  assert.equal(c.topic, 'healthcare_costs');
  assert.equal(c.position, 'support');
  assert.equal(c.confidence, S.WEIGHTS.baseConfidence.medium + S.WEIGHTS.corroborationBonus);
  const st = c.sources[0].statements;
  assert.equal(st.find((x) => x.text.startsWith('America spends')).kind, 'mention', 'mention only, zero weight');
  assert.ok(!st.some((x) => x.text.startsWith('Lower grocery costs')), 'off-topic cost line is not a healthcare statement');
});

await t('logCandidateStance logs a candidate + clear/no-clear note, never writes, never throws', () => {
  const logs = [];
  const c = S.logCandidateStance(HC_RAW, { log: (l) => logs.push(l) });
  assert.equal(c.position, 'support');
  const cand = logs.find((l) => l.startsWith('stance-score: candidate '));
  const j = JSON.parse(cand.slice('stance-score: candidate '.length));
  assert.equal(j.position, 'support'); assert.equal(j.confidence, 0.85); assert.equal(j.topic, 'healthcare_costs');
  assert.ok(logs.some((l) => l.startsWith('stance-score: ken_paxton|healthcare_costs → CLEAR POSITION (support, 0.85)')));
  const none = []; S.logCandidateStance({ ...HC_RAW, body: '<p>America spends more on healthcare than any nation.</p>' }, { log: (l) => none.push(l) });
  assert.ok(none.some((l) => /→ NO CLEAR POSITION — 0 clear statement/.test(l)));
  const skip = []; assert.equal(S.logCandidateStance({ ...HC_RAW, topic: 'not_a_register_key' }, { log: (l) => skip.push(l) }), null);
  assert.match(skip[0], /^stance-score: SKIP .* no scoring rules for topic not_a_register_key/);
  const err = []; assert.equal(S.logCandidateStance({ topic: 'cost_living' }, { log: (l) => err.push(l) }), null);
  assert.match(err[0], /^stance-score: ERROR /);
  assert.equal(JSON.stringify(RAW), RAW_SNAPSHOT);
});

await t('the Talarico ground-truth result is unaffected by the second topic', () => {
  const again = S.scoreAgainstGroundTruth(RAW, gt, { log: () => {} });
  assert.equal(again.candidate.position, gt.position);
  assert.equal(again.comparison.delta, 0);
});

// ── Phase 6: who is acting — no fixed opponent list, explicit third parties ──
const one = (pid, text, topic = 'cost_living') =>
  S.scoreRawRecord({ ...RAW, politician_id: pid, topic, body: `<p>${text}</p>` }).sources[0].statements[0];

await t("a sentence naming the page's own politician as actor is scored as their position", () => {
  for (const [pid, text, topic] of [
    ['john_cornyn', 'Senator John Cornyn passed a bill to lower prescription drug costs for seniors.', 'healthcare_costs'],
    ['john_cornyn', 'Cornyn, Blumenthal, Grassley, Durbin Bill to Lower Drug Costs Passes Senate Unanimously', 'healthcare_costs'],
    ['ken_paxton', 'Ken Paxton will fight to cut taxes for Texas families.'],
    ['greg_abbott', 'Governor Abbott will lower the cost of home insurance for every Texan.'],
    ['donald_trump', 'President Trump signed a law to lower prices at the pump.'],
    ['gina_hinojosa', 'Gina will lower your grocery bill.'],
  ]) {
    const st = one(pid, text, topic);
    assert.equal(st.kind, 'clear', `${pid}: ${text}`);
    assert.equal(st.side, 'support');
    assert.equal(st.weight, S.WEIGHTS.medium);
    assert.ok(!st.attributed_to);
  }
});

await t('a sentence that explicitly frames someone else as the opponent is not the speaker\'s position', () => {
  for (const text of [
    'Senator John Cornyn voted to cut taxes for his billionaire donors.',
    'My opponent wants to cut taxes for the richest 1%.',
    'DC politicians like John Cornyn promised to lower costs.',
    'Ken Paxton has pledged to cut taxes for his donors.',
    'Republicans refused to lower drug costs for seniors.',
  ]) {
    const st = one('james_talarico', text, /drug/.test(text) ? 'healthcare_costs' : 'cost_living');
    assert.equal(st.kind, 'mention', text);
    assert.equal(st.weight, 0);
    assert.equal(st.attributed_to, 'opponent', text);
  }
  // The same Cornyn sentence is HIS position on his own page — the list is gone, context decides.
  assert.equal(one('john_cornyn', 'Senator John Cornyn voted to cut taxes for working families.').kind, 'clear');
  const code = readFileSync(corePath, 'utf8').replace(/^\s*\/\/.*$/gm, '');
  assert.ok(!/Cornyn|Paxton|Trump|Republicans|Talarico/.test(code), 'no fixed list of politician or party names in the rules');
});

await t('a clear third-party attribution receives zero weight', () => {
  for (const text of [
    'Big retailers are tracking what you buy, then using that information to raise prices on working people.',
    'Corporations are jacking up prices to cut their own costs.',
    'They lobby for policies that cut their own taxes.',
    'Insurance companies keep cutting coverage to lower their own costs.',
  ]) {
    const st = one('gina_hinojosa', text);
    assert.equal(st.kind, 'mention', text);
    assert.equal(st.weight, 0, text);
    assert.equal(st.attributed_to, 'third', text);
  }
  // A group as the OBJECT does not take the sentence away from the speaker.
  const own = one('gina_hinojosa', 'We must end these corporate subsidies and use the savings to cut property taxes.');
  assert.equal(own.kind, 'clear');
  // Phase 5's false outlier on the Hinojosa page no longer lowers confidence.
  const page = S.scoreRawRecord({ ...RAW, politician_id: 'gina_hinojosa', body:
    '<p>We will cut property taxes.</p><p>Gina will lower your grocery bill.</p><p>Lower Your Electricity Bill.</p>'
    + '<p>Big retailers are tracking what you buy, then using that information to raise prices on working people.</p>' });
  assert.equal(page.position, 'support');
  assert.equal(page.confidence, 0.85);
});

await t('Talarico ground-truth match is unchanged: support 0.85, Δ 0.00', () => {
  const r = S.scoreAgainstGroundTruth(RAW, gt, { log: () => {} });
  assert.equal(r.candidate.position, 'support');
  assert.equal(r.candidate.confidence, 0.85);
  assert.equal(gt.position, 'support'); assert.equal(gt.confidence, 0.85);
  assert.equal(r.comparison.delta, 0);
});

// ── Phase 7: hard implication layer (R6) ──
const speech = (body, over = {}) => S.scoreRawRecord({ ...RAW, source_type: 'speech (town hall remarks)', body, ...over });

await t('R6: problem + remedy language with the politician as actor is a medium-weight directional signal', () => {
  for (const [text, topic] of [
    ['I am going to cap credit card rates for working families.', 'cost_living'],
    ['We have to freeze rent hikes and crack down on junk fees.', 'cost_living'],
    ['Make insulin affordable again for every family.', 'healthcare_costs'],
  ]) {
    const c = speech(`<p>${text}</p>`, { topic });
    const [st] = c.sources[0].statements;
    assert.equal(st.kind, 'implication', text);
    assert.equal(st.implication, 'remedy');
    assert.equal(st.side, 'support');
    assert.equal(st.weight, S.WEIGHTS.implication);
    assert.equal(S.WEIGHTS.implication, S.WEIGHTS.medium, 'implication is medium weight');
    assert.ok(st.weight < S.WEIGHTS.high, 'explicit statements in a speech stay heavier');
    assert.equal(c.position, 'support');
    assert.equal(c.confidence, S.WEIGHTS.baseConfidence.implication);
    assert.match(c.confidence_reason, /1 implication\(s\) for support/);
    assert.match(c.sources[0].note, /1 implication\(s\)/);
    assert.equal(c.sources[0].implication_count, 1);
  }
  const opp = speech('<p>We should repeal the price caps on credit cards.</p>');
  assert.equal(opp.sources[0].statements[0].side, 'oppose');
  assert.equal(opp.position, 'oppose');
  // Someone else's remedy is not the speaker's implication.
  const third = speech('<p>They want to cap credit card rates only for their friends.</p>').sources[0].statements[0];
  assert.equal(third.kind, 'mention'); assert.equal(third.weight, 0); assert.equal(third.attributed_to, 'third');
});

await t('R6: repeatedly highlighted outcomes count; a single one stays a mention', () => {
  const rep = speech('<p>Rent is too high in Austin.</p><p>Families can’t afford groceries anymore.</p>');
  assert.ok(rep.sources[0].statements.every((s) => s.kind === 'implication' && s.implication === 'outcome' && s.side === 'support'));
  assert.equal(rep.position, 'support');
  const once = speech('<p>Rent is too high in Austin.</p>');
  assert.equal(once.sources[0].statements[0].kind, 'mention');
  assert.equal(once.sources[0].statements[0].weight, 0);
  assert.equal(once.position, 'no clear position');
  // Rhetorical questions name a problem but not a wanted change.
  const q = speech('<p>Why is rent so expensive?</p><p>Can you afford groceries? Are prices too high?</p>');
  assert.ok(q.sources[0].statements.every((s) => s.kind === 'mention'));
});

await t('R6 + R4: three consistent implications raise confidence above a single explicit statement', () => {
  const single = speech('<p>We will cut taxes for working families.</p>');
  assert.equal(single.sources[0].statements[0].kind, 'clear');
  assert.equal(single.sources[0].statements[0].weight, S.WEIGHTS.high, 'explicit stays high weight');
  assert.equal(single.confidence, S.WEIGHTS.baseConfidence.high);
  const three = speech('<p>Cap credit card rates.</p><p>Freeze rent hikes for seniors.</p><p>Crack down on junk fees.</p>');
  const imps = three.sources[0].statements.filter((s) => s.kind === 'implication');
  assert.equal(imps.length, 3);
  assert.equal(three.position, 'support');
  assert.ok(three.confidence > single.confidence, `${three.confidence} should exceed ${single.confidence}`);
  assert.match(three.confidence_reason, /3 implication\(s\) for support.*\(R4\)/);
  // Implications and explicit statements corroborate each other.
  const both = speech('<p>We will cut taxes for working families.</p><p>Cap credit card rates.</p><p>Freeze rent hikes.</p>');
  assert.equal(both.confidence, Math.round((S.WEIGHTS.baseConfidence.high + S.WEIGHTS.corroborationBonus) * 100) / 100);
  assert.match(both.confidence_reason, /1 clear high-weight statement\(s\) for support; 2 implication\(s\)/);
  // An opposite implication is an outlier (R5): lowers confidence, no flip.
  const out = speech('<p>Cap credit card rates.</p><p>Freeze rent hikes.</p><p>Crack down on junk fees.</p><p>Repeal the rate caps.</p>');
  assert.equal(out.position, 'support');
  assert.ok(out.confidence < three.confidence);
});

await t('R3: a pure mention with no direction stays zero weight', () => {
  for (const text of ['Grocery prices came up a lot at the town hall.', 'We talked about housing and childcare tonight.']) {
    const c = speech(`<p>${text}</p>`);
    const [st] = c.sources[0].statements;
    assert.equal(st.kind, 'mention', text);
    assert.equal(st.weight, 0);
    assert.equal(c.position, 'no clear position');
    assert.equal(c.sources[0].implication_count, 0);
  }
});

await t('Phase 7: Talarico ground-truth match stays support 0.85 with no implications added', () => {
  const r = S.scoreAgainstGroundTruth(RAW, gt, { log: () => {} });
  assert.ok(!r.candidate.sources[0].statements.some((x) => x.implication === 'nearby'), 'R7 adds no pair on the Talarico page');
  assert.equal(r.candidate.position, 'support');
  assert.equal(r.candidate.confidence, 0.85);
  assert.equal(r.comparison.delta, 0);
  assert.equal(r.candidate.rules_version, 'phase8-v3');
  assert.match(r.candidate.confidence_reason, /implication\(s\)/);
});

// ── R7: a problem mention + a nearby remedy from the same speaker ──
await t('R7: a mention + a nearby remedy sentence is ONE medium-weight directional signal', () => {
  for (const body of [
    '<p>Families are struggling with grocery bills.</p><p>So we will fight to change that.</p>',
    '<p>Too many families are falling behind on rent.</p><p>I grew up in this district.</p><p>That’s why I am running.</p>',
    '<p>Seniors are squeezed by rising prices.</p><p>It’s time for real relief in Washington.</p>',
  ]) {
    const c = speech(body);
    const st = c.sources[0].statements;
    const imps = st.filter((x) => x.kind === 'implication');
    assert.equal(imps.length, 1, body);
    assert.equal(imps[0].implication, 'nearby');
    assert.equal(imps[0].side, 'support');
    assert.equal(imps[0].weight, S.WEIGHTS.implication, 'medium weight');
    assert.ok(imps[0].paired_with, 'the direction sentence is recorded on the pair');
    assert.equal(st.filter((x) => x.kind === 'mention').length, 0, 'the pair is one statement, not a mention + a signal');
    assert.equal(c.position, 'support');
    assert.equal(c.confidence, S.WEIGHTS.baseConfidence.implication);
    assert.equal(c.sources[0].implication_count, 1);
    assert.equal(S.directionalSignals(c), 1);
  }
  // Works on healthcare too (its outcome rule fixes the side).
  const hc = speech('<p>Families are struggling to pay for insulin.</p><p>We must act now.</p>', { topic: 'healthcare_costs' });
  assert.equal(hc.position, 'support');
  assert.equal(S.directionalSignals(hc), 1);
});

await t('R7: an isolated mention stays zero weight; no pair across too wide a gap, a question, a negation or another speaker', () => {
  for (const body of [
    '<p>Families are struggling with grocery bills.</p>',
    '<p>Families are struggling with grocery bills.</p><p>I grew up here.</p><p>My mom was a teacher.</p><p>So we will fight to change that.</p>',
    '<p>Families are struggling with grocery bills.</p><p>Will we fix it?</p>',
    '<p>Families are struggling with grocery bills.</p><p>We will not raise a dime for this.</p>',
    '<p>Families are struggling with grocery bills.</p><p>Senator Smith promised to fix it.</p>',
    '<p>Grocery prices came up a lot at the town hall.</p><p>We will fight to change that.</p>',
  ]) {
    const c = speech(body);
    assert.equal(S.directionalSignals(c), 0, body);
    for (const x of c.sources[0].statements) assert.equal(x.weight, 0, body);
    assert.equal(c.position, 'no clear position', body);
  }
  // A direction that already counts on its own is not folded in or double-counted.
  const own = speech('<p>Families are struggling with grocery bills.</p><p>We will cut taxes for working families.</p>');
  assert.equal(own.sources[0].statements.filter((x) => x.kind === 'clear').length, 1);
  assert.equal(own.sources[0].statements.filter((x) => x.kind === 'implication').length, 0);
  // Each direction sentence pairs with one mention only.
  const two = speech('<p>Families are struggling with rent.</p><p>Seniors are squeezed by prices.</p><p>We will fight to change that.</p>');
  assert.equal(two.sources[0].statements.filter((x) => x.implication === 'nearby').length, 1);
});

// ── All-topics pass: every register issue key is scored ────────────────────
const issueKeys = JSON.parse(readFileSync(path.join(root, 'db/issue-keys.json'), 'utf8')).keys;
const pageOn = (body, extra = {}) => deepFreeze({ ...RAW, body, ...extra });

await t('all topics: the scorer has rules for every issue key in the register, and only those', () => {
  for (const k of issueKeys) assert.ok(S.hasRulesFor(k), `no rules for ${k}`);
  assert.deepEqual([...S.SCORED_TOPICS].sort(), [...issueKeys].sort());
  assert.deepEqual(S.SCORED_TOPICS.slice(0, 2), ['cost_living', 'healthcare_costs'], 'core topics first');
});

await t('all topics: clear education language produces a directional candidate on public_schools', () => {
  const raw = pageOn('<h1>Education</h1><p>I will raise teacher pay across Texas.</p><p>We will fully fund our public schools.</p><p>I will invest in public education in every classroom.</p>',
    { topic: 'cost_living', politician_id: 'james_talarico' });
  const c = S.scoreRawRecord(raw, 'public_schools');
  assert.equal(c.topic, 'public_schools');
  assert.equal(c.position, 'support');
  assert.ok(c.confidence >= 0.8, `3 consistent statements corroborate (R4): ${c.confidence}`);
  assert.equal(c.vocab_version, S.VOCAB_VERSION);
  assert.equal(c.page_topic, 'cost_living', 'scored from a page filed under another topic');
  const all = S.scoreAllTopics(raw);
  assert.equal(all[0].topic, 'cost_living', "the page's own topic is always first");
  assert.ok(all.some((x) => x.topic === 'public_schools' && x.position === 'support'), 'scoreAllTopics finds it too');
});

await t('all topics: clear immigration language produces a directional candidate on border_security', () => {
  const raw = pageOn('<h1>Border</h1><p>I will secure the border and finish the wall.</p><p>We must end catch and release.</p><p>We will crack down on the cartels and human trafficking.</p>',
    { topic: 'healthcare_costs', politician_id: 'ken_paxton', source_type: 'campaign issues page' });
  const c = S.scoreAllTopics(raw).find((x) => x.topic === 'border_security');
  assert.ok(c, 'border_security candidate');
  assert.equal(c.position, 'support');
  assert.ok(c.sources[0].takes_clear_position);
  // Oppose side reads from the same rules: "abolish ICE" opposes deportations.
  const o = S.scoreRawRecord(pageOn('<p>We will abolish ICE.</p>', { politician_id: 'ken_paxton' }), 'deportations');
  assert.equal(o.position, 'oppose');
});

await t('all topics: one page can produce candidates on several issues, each under its own key', () => {
  const raw = pageOn('<p>I will raise teacher pay and fully fund our public schools.</p><p>I will secure the border.</p><p>We will bring down the national debt.</p>');
  const topics = S.scoreAllTopics(raw).map((c) => c.topic);
  for (const k of ['public_schools', 'border_security', 'national_debt']) assert.ok(topics.includes(k), `${k} in ${topics}`);
  for (const k of topics) assert.ok(issueKeys.includes(k), `${k} is a register key`);
});

await t('all topics: the same rules apply — third-party lines are zero weight; a bare mention of another issue is no candidate', () => {
  const third = S.scoreRawRecord(pageOn('<p>Republicans want to cut Social Security.</p><p>They voted to privatize Medicare.</p>'), 'social_security');
  assert.equal(third.position, 'no clear position');
  assert.ok(third.sources[0].statements.every((x) => x.weight === 0));
  const bare = S.scoreAllTopics(pageOn('<p>Our schools, the border and the national debt all matter.</p>'));
  assert.deepEqual(bare.map((c) => c.topic), ['cost_living'], 'mentions alone never produce a cross-topic candidate');
});

// ── R13: cross-topic anchor (Doggett social_security thrash) ──
// Sentences from the two live Doggett issue pages that were scored onto
// social_security from a cost_living and a healthcare_costs page.
const DOGGETT_ECON = '<h1>Growing Our Economy</h1><p>To pay for even more tax breaks for billionaires like Elon Musk, their bill includes devoting $20 billion to undermining public schools with a new federal voucher scheme, ripping food assistance away from hungry families, repealing renewable energy credits, and denying nearly 14 million Americans access to a family physician and medications while triggering a $500 billion automatic cut to Medicare.</p>';
const DOGGETT_HEALTH = '<h1>Health Care</h1><h2>Preserving and Strengthening Medicare</h2><p>As a recent recipient of two national legislative awards from AARP, which recognized my efforts to ensure seniors’ access to health care, I continue working to defend, strengthen, and improve Medicare, a pillar of retirement security.</p><p>My Medicare Identity Theft Prevention Act, which requires the removal of Social Security numbers from Medicare cards, was enacted into law.</p><p>I am also sponsoring multiple pieces of legislation that would allow Medicare to use its purchasing power to lower drug costs for seniors and taxpayers through negotiation.</p>';
const doggett = (body, topic, url) => pageOn(body, { politician_id: 'lloyd_doggett', topic, source_type: 'official House issue page', url, final_url: url });

await t('R13: a cost_living or healthcare page does not produce a social_security stance (Doggett)', () => {
  const econ = doggett(DOGGETT_ECON, 'cost_living', 'https://doggett.house.gov/issues/growing-our-economy-0');
  const health = doggett(DOGGETT_HEALTH, 'healthcare_costs', 'https://doggett.house.gov/issues/healthcare-0');
  // The raw per-topic read still finds Medicare language (scoring rules unchanged) …
  assert.ok(['support', 'oppose'].includes(S.scoreRawRecord(health, 'social_security').position), 'per-topic scoring is unchanged');
  // … but neither page yields a cross-topic social_security candidate.
  assert.ok(!S.scoreAllTopics(econ).some((c) => c.topic === 'social_security'), 'economy page: no social_security stance');
  assert.ok(!S.scoreAllTopics(health).some((c) => c.topic === 'social_security'), 'healthcare page: no social_security stance');
  // The page's own topic is read exactly as before.
  assert.deepEqual(S.scoreAllTopics(health)[0], S.scoreRawRecord(health, 'healthcare_costs'));
  assert.deepEqual(S.scoreAllTopics(econ)[0], S.scoreRawRecord(econ, 'cost_living'));
  // Repeated runs: the same answer every minute, so nothing to rewrite.
  for (let i = 0; i < 3; i++) for (const r of [econ, health]) assert.ok(!S.scoreAllTopics(r).some((c) => c.topic === 'social_security'));
});

await t('R13: a statement that itself addresses Social Security still yields the cross-topic stance', () => {
  const raw = doggett('<p>I will always protect Social Security from cuts and privatization.</p><p>We will lower drug costs for seniors.</p>', 'healthcare_costs', 'https://doggett.house.gov/issues/healthcare-0');
  const c = S.scoreAllTopics(raw).find((x) => x.topic === 'social_security');
  assert.ok(c, 'explicit Social Security claim → candidate');
  assert.equal(c.position, 'support');
  assert.equal(c.page_topic, 'healthcare_costs');
  // On a page filed under social_security, Medicare language scores as before.
  const own = S.scoreAllTopics(doggett(DOGGETT_HEALTH, 'social_security', 'https://doggett.house.gov/issues/seniors'))[0];
  assert.equal(own.topic, 'social_security');
  assert.equal(own.position, 'support');
});

await t('R13: anchor helpers — Social Security numbers are not the program; Medicare alone does not anchor social_security', () => {
  assert.equal(S.crossTopicAnchorIn('I will defend Social Security.', 'social_security'), true);
  assert.equal(S.crossTopicAnchorIn('I will never raise the retirement age.', 'social_security'), true);
  assert.equal(S.crossTopicAnchorIn('I will defend and strengthen Medicare.', 'social_security'), false);
  assert.equal(S.crossTopicAnchorIn('My bill removed Social Security numbers from Medicare cards.', 'social_security'), false);
  assert.equal(S.crossTopicAnchorIn('I will fully fund our public schools.', 'public_schools'), true);
  // Implication-only cross-topic reads are dropped; the page's own topic is never gated.
  const imp = { topic: 'immig_fentanyl', position: 'support', sources: [{ statements: [{ kind: 'implication', side: 'support', text: 'We will confront fentanyl trafficking.' }] }] };
  assert.equal(S.crossTopicAnchored(imp, 'cost_living'), false);
  assert.equal(S.crossTopicAnchored(imp, 'immig_fentanyl'), true);
});

await t('all topics: implication rules (R6) work on a vocabulary topic', () => {
  const imp = S.scoreRawRecord(pageOn('<p>We will confront fentanyl trafficking in every county.</p>'), 'immig_fentanyl');
  assert.equal(imp.position, 'support');
  assert.equal(imp.sources[0].implication_count, 1);
  assert.equal(imp.confidence, 0.7);
});

await t('all topics: no-pole country keys never read a direction', () => {
  const raw = pageOn('<p>I will sanction Iran and confront the regime in Tehran.</p><p>We must stand with Ukraine.</p>');
  for (const k of ['iran_policy', 'ukraine_policy', 'yemen_policy', 'venezuela_policy']) {
    assert.ok(S.NO_POLE_TOPICS.has(k));
    const c = S.scoreRawRecord(raw, k);
    assert.ok(!['support', 'oppose'].includes(c.position), `${k}: ${c.position}`);
  }
  assert.ok(!S.scoreAllTopics(raw).some((c) => S.NO_POLE_TOPICS.has(c.topic)));
});

await t('all topics: cost of living and health care keep their calibrated rules; Talarico stays support 0.85', () => {
  const r = S.scoreAgainstGroundTruth(RAW, gt, { log: () => {} });
  assert.equal(r.candidate.position, 'support');
  assert.equal(r.candidate.confidence, 0.85);
  assert.equal(r.comparison.delta, 0);
  assert.ok(!('vocab_version' in r.candidate), 'core topics are not vocabulary-scored');
  const own = S.scoreAllTopics(RAW)[0];
  assert.equal(own.topic, 'cost_living');
  assert.equal(own.confidence, 0.85);
  const logs = [];
  const cands = S.logCandidateStances(RAW, { log: (l) => logs.push(l) });
  assert.equal(cands[0].confidence, 0.85);
  assert.equal(logs.filter((l) => l.startsWith('stance-score: candidate ')).length, 1, 'own-topic log line unchanged');
  assert.ok(logs.some((l) => /^stance-score: james_talarico scored against \d+ topics — page topic cost_living/.test(l)));
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
