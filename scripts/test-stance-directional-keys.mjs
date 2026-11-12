#!/usr/bin/env node
// test-stance-directional-keys.mjs — scorer rules for the vocab v2 directional
// keys (ukraine_aid, iran_hostilities, israel_military_aid,
// israel_offensive_arms, israel_defensive_systems).
//   · every key reads support AND oppose from plain own-voice sentences;
//   · a carve-out, another subject, or a third party never sets a side;
//   · the keys are opt-in: SCORED_TOPICS (the 125-key register sweep), the
//     rules of every existing key, WEIGHTS and the version strings are
//     unchanged, so existing reads and site stances do not move;
//   · the ground-truth file is unchanged and the re-score report is current.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import * as S from '../netlify/lib/stance-score-core.mjs';
import * as V from '../netlify/lib/stance-topic-vocab.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const t = (name, fn) => {
  try { fn(); console.log('  ✓', name); }
  catch (e) { failures++; console.error('  ✗', name, '\n    ', e.message); }
};
const side = (k, text, pid = 'massie') => { const c = S.classify(text, k, pid); return c.kind === 'clear' ? c.side : c.kind; };

const KEYS = ['ukraine_aid', 'iran_hostilities', 'israel_military_aid', 'israel_offensive_arms', 'israel_defensive_systems'];
const CASES = {
  ukraine_aid: {
    support: ['I will vote for more military aid to Ukraine.', 'We must stand with Ukraine.', 'I support the Ukraine supplemental.'],
    oppose: ["Well, it's certainly the case that I don't want to send more aid to Ukraine.", 'Not one more dime for Ukraine.', 'I will vote against the Ukraine supplemental.'],
    none: ['We must stand with Israel.', 'Zelensky visited Washington on Tuesday.'],
  },
  iran_hostilities: {
    support: ['Congress has the sole power to declare war against Iran.', 'There can be no war with Iran without a vote of Congress.',
      'Directing the President pursuant to section 5(c) of the War Powers Resolution to remove United States Armed Forces from unauthorized hostilities in the Islamic Republic of Iran.'],
    oppose: ['I oppose the Iran war powers resolution.', 'The President does not need Congress to strike Iran.'],
    none: ['Congress must vote before any strikes on Yemen.', 'Iran is a sponsor of terrorism.'],
  },
  israel_military_aid: {
    support: ['I will keep providing security aid to Israel.', 'I support military aid to Israel.', 'I will fully fund Iron Dome.'],
    oppose: ['We must block the sale of $8.56 billion in offensive weaponry to Israel.', 'I support an arms embargo on Israel.',
      'Providing for congressional disapproval of the proposed foreign military sale to the Government of Israel of certain defense articles and services.'],
    none: ['They would not affect any of the systems Israel uses to defend itself from incoming attacks.'],
  },
  israel_offensive_arms: {
    support: ['I support offensive weapons sales to Israel.', 'We should keep approving the sale of precision-guided munitions to Israel.'],
    oppose: ['We must block the sale of $8.56 billion in offensive weaponry to Israel.', 'I will vote to halt offensive arms sales to Israel.'],
    none: ['I support military aid to Israel.', 'I will fully fund Iron Dome.'],
  },
  israel_defensive_systems: {
    support: ['I will fully fund Iron Dome.', "We must replenish Israel's missile defense systems."],
    oppose: ['I would cut funding for Iron Dome.', 'I voted against funding for Iron Dome.'],
    none: ['They would not affect any of the systems Israel uses to defend itself from incoming attacks.', 'We must block the sale of offensive weapons to Israel.'],
  },
};

t('each new key has rules with support, oppose and an Israel/Ukraine/Iran context check', () => {
  assert.deepEqual(S.DIRECTIONAL_TOPICS, KEYS);
  for (const k of KEYS) {
    assert.ok(S.hasRulesFor(k), k);
    const r = S.TOPIC_RULES[k];
    for (const f of ['mention', 'support', 'oppose', 'context']) assert.ok(r[f] instanceof RegExp, `${k}.${f}`);
    assert.notEqual(String(r.support), '/(?!)/i', `${k} support`);
    assert.notEqual(String(r.oppose), '/(?!)/i', `${k} oppose`);
    assert.equal(S.topicLabel(k), V.DIRECTIONAL_ISSUE_KEYS[k].label);
  }
});
for (const k of KEYS) {
  t(`${k}: support and oppose sentences read their side; others set none`, () => {
    for (const s of CASES[k].support) assert.equal(side(k, s), 'support', s);
    for (const s of CASES[k].oppose) assert.equal(side(k, s), 'oppose', s);
    for (const s of CASES[k].none) assert.ok(!['support', 'oppose'].includes(side(k, s)), s);
  });
}
t('third-party lines stay zero weight on the new keys', () => {
  const c = S.scoreRawRecord({ url: 'https://example.com', fetched_at: '2026-11-12', source_type: 'campaign issue page', politician_id: 'massie', topic: 'ukraine_aid',
    body: '<p>Democrats want to send more aid to Ukraine.</p><p>They voted for the Ukraine supplemental.</p>' }, 'ukraine_aid');
  assert.equal(c.position, 'no clear position');
});
t('mixed comes from the engine: one own line each way on a page reads mixed', () => {
  const c = S.scoreRawRecord({ url: 'https://example.com', fetched_at: '2026-11-12', source_type: 'statement', politician_id: 'sanders', topic: 'israel_military_aid',
    body: '<p>I will fully fund Iron Dome.</p><p>We must block the sale of offensive weaponry to Israel.</p>' }, 'israel_military_aid');
  assert.equal(c.position, 'mixed');
  assert.equal(c.vocab_version, S.DIRECTIONAL_VOCAB_VERSION);
});

// ── Subject spans (non-contiguous) ──────────────────────────────────────────
const page = (body, topic, extra = {}) => ({ url: 'https://example.com', fetched_at: '2026-11-12', source_type: 'speech', politician_id: 'massie', topic, body, ...extra });
const TWO_PLACES = `<p>Tonight I want to talk about Iran.</p>
<p>Congress must vote before any president sends troops into hostilities.</p>
<p>Now let me turn to health care in Kentucky.</p><p>Rural hospitals are closing across the state.</p>
<p>Back to the strikes on Iran last June.</p><p>Congress has to authorize the use of force before strikes like that.</p>`;
t('spans: a speech on the same issue in two separate places is ONE position built from both spans', () => {
  const c = S.scoreRawRecord(page(TWO_PLACES, 'iran_hostilities'), 'iran_hostilities');
  assert.equal(c.position, 'support');
  assert.deepEqual(c.subject, { id: 'iran_hostilities', spans: 2, spans_with_signal: 2, joined: true });
  const clear = c.sources[0].statements.filter((x) => x.kind === 'clear');
  assert.deepEqual(clear.map((x) => [x.subject_span, x.span_carried]), [[1, true], [2, true]]);
  // One candidate on the key when the page is swept with the key opted in.
  const all = S.scoreAllTopics(page(TWO_PLACES, 'cost_living'), { topics: KEYS });
  assert.equal(all.filter((x) => x.topic === 'iran_hostilities').length, 1);
});
t('spans: support in one span and oppose in a later span weigh together (mixed), not as two reads', () => {
  const body = `<p>I will fully fund Iron Dome.</p><p>Now let me turn to rural broadband.</p><p>Every county needs fast internet.</p>
<p>On Israel again.</p><p>We must block the sale of offensive weaponry to Israel.</p>`;
  const c = S.scoreRawRecord(page(body, 'israel_military_aid', { politician_id: 'sanders' }), 'israel_military_aid');
  assert.equal(c.position, 'mixed');
  assert.equal(c.subject.spans, 2);
  assert.equal(c.subject.spans_with_signal, 2);
});
t('spans (carry): a subject carries through long paragraphs and across one off-claim paragraph, then stops', () => {
  const near = S.scoreRawRecord(page('<p>Iran is on everyone’s mind.</p><p>Congress must vote before troops enter hostilities.</p>', 'iran_hostilities'), 'iran_hostilities');
  assert.equal(near.position, 'support');
  // A long paragraph: the follow-up five sentences later is still carried (no sentence-count limit).
  const filler = Array.from({ length: 5 }, (_, i) => `That was a long night for everyone, number ${i + 1}.`).join(' ');
  const longPara = S.scoreRawRecord(page(`<p>Iran is on everyone’s mind. ${filler} Congress must vote before troops enter hostilities.</p>`, 'iran_hostilities'), 'iran_hostilities');
  assert.equal(longPara.position, 'support');
  // PARAGRAPH scope (campaign issue pages): one paragraph with no subject or claim word still carries; two do not.
  const gap = (n) => Array.from({ length: n }, (_, i) => `<p>That was a long night for everyone, number ${i + 1}.</p>`).join('');
  const issuePage = (body) => page(body, 'iran_hostilities', { source_type: 'campaign issue page' });
  assert.equal(S.SPAN_GAP_PARAGRAPHS, 1);
  const one = S.scoreRawRecord(issuePage(`<p>Iran is on everyone’s mind.</p>${gap(1)}<p>It was late. Congress must vote before troops enter hostilities.</p>`), 'iran_hostilities');
  assert.equal(one.position, 'support');
  const far = S.scoreRawRecord(issuePage(`<p>Iran is on everyone’s mind.</p>${gap(2)}<p>Congress must vote before troops enter hostilities.</p>`), 'iran_hostilities');
  assert.equal(far.position, 'no clear position');
  // A carried claim word keeps the span alive across further paragraphs.
  const chain = S.scoreRawRecord(issuePage(`<p>Iran is on everyone’s mind.</p><p>The troops are tired.</p>${gap(1)}<p>Congress must vote before troops enter hostilities.</p>`), 'iran_hostilities');
  assert.equal(chain.position, 'support');
});
t('spans (document scope): in a speech or release a new paragraph does not close the subject; the gap limit is only a safety valve', () => {
  const gap = (n) => Array.from({ length: n }, (_, i) => `<p>That was a long night for everyone, number ${i + 1}.</p>`).join('');
  const line = '<p>Congress must vote before troops enter hostilities.</p>';
  assert.equal(S.SPAN_DOCUMENT_GAP_PARAGRAPHS, 3);
  for (const type of ['speech', 'floor speech', 'official press release', 'interview (verbatim Q&A in news report)', 'statement', 'resolution text (sponsor)']) {
    assert.equal(S.spanScopeFor(type), 'document', type);
    for (const n of [2, 3]) assert.equal(S.scoreRawRecord(page(`<p>Iran is on everyone’s mind.</p>${gap(n)}${line}`, 'iran_hostilities', { source_type: type }), 'iran_hostilities').position, 'support', `${type} gap ${n}`);
    assert.equal(S.scoreRawRecord(page(`<p>Iran is on everyone’s mind.</p>${gap(4)}${line}`, 'iran_hostilities', { source_type: type }), 'iran_hostilities').position, 'no clear position', `${type} valve`);
  }
  for (const type of ['campaign issue page', 'campaign policy page', 'roll-call vote (House Clerk)', 'official Senate issue page', 'campaign issues page']) assert.equal(S.spanScopeFor(type), 'paragraph', type);
  // The paragraph rule is still there for a diagnostic override.
  assert.equal(S.scoreRawRecord(page(`<p>Iran is on everyone’s mind.</p>${gap(2)}${line}`, 'iran_hostilities'), 'iran_hostilities', null, { spanScope: 'paragraph' }).position, 'no clear position');
});
t('spans (document scope): clear changes still close the subject — country, transition, issue, heading, a distinct new measure', () => {
  const line = '<p>Congress must vote before troops enter hostilities.</p>';
  for (const brk of ['<p>Turning to Yemen and the Houthis.</p>', '<p>Moving on to something else entirely tonight.</p>',
    '<p>Our public schools need more teachers.</p>', '<h2>Next section</h2>']) {
    assert.equal(S.scoreRawRecord(page(`<p>Iran is on everyone’s mind.</p><p>It was a long night.</p>${brk}${line}`, 'iran_hostilities'), 'iran_hostilities').position, 'no clear position', brk);
  }
  // A new bill number, once the span has named one, is a new measure: the next line is not carried onto Iran.
  const body = '<p>I wrote H.Con.Res. 38 about Iran.</p><p>It was a long night.</p><p>Separately, H.R. 4 is on the floor this week.</p>' + line;
  assert.equal(S.scoreRawRecord(page(body, 'iran_hostilities'), 'iran_hostilities').position, 'no clear position');
  const sp = S.subjectSpans(S.extractSentences(body), body, { scope: 'document' });
  assert.equal(sp[2].measure, true);
  assert.ok(sp[2].scope > sp[0].scope);
  // Re-naming the same bill keeps it open.
  const same = '<p>I wrote H.Con.Res. 38 about Iran.</p><p>It was a long night.</p><p>H.Con.Res. 38 is privileged.</p>' + line;
  assert.equal(S.scoreRawRecord(page(same, 'iran_hostilities'), 'iran_hostilities').position, 'support');
});
t('spans (document scope): two keyed subjects in one package open separate spans in the same scope', () => {
  const body = '<p>This package sends $61 billion in security assistance to Ukraine.</p><p>It also provides $4 billion for Iron Dome in Israel.</p><p>Those interceptors save lives.</p>';
  const sp = S.subjectSpans(S.extractSentences(body), body, { scope: 'document' });
  assert.deepEqual(sp.map((x) => [x.subject, x.span, x.scope]), [['ukraine_aid', 1, 1], ['israel_military_aid', 2, 1], ['israel_military_aid', 2, 1]]);
  assert.deepEqual(sp.map((x) => x.facet || null), [null, 'defensive', 'defensive']);
});
t('spans: a clear subject change ends the span — another country, a transition, another issue, a heading', () => {
  const line = '<p>Congress must vote before troops enter hostilities.</p>';
  for (const brk of ['<p>Turning to Yemen and the Houthis.</p>', '<p>Moving on to something else entirely tonight.</p>',
    '<p>Our public schools need more teachers.</p>', '<h2>Next section</h2>', '<p>Abortion rights are on the ballot.</p>']) {
    const c = S.scoreRawRecord(page(`<p>Iran is on everyone’s mind.</p>${brk}${line}`, 'iran_hostilities'), 'iran_hostilities');
    assert.equal(c.position, 'no clear position', brk);
  }
  // War powers, spending and the border are part of the same debate and do not break the span.
  const c = S.scoreRawRecord(page(`<p>Iran is on everyone’s mind.</p><p>We cannot keep adding to the national debt.</p>${line}`, 'iran_hostilities'), 'iran_hostilities');
  assert.equal(c.position, 'support');
});
t('spans (break list): broad terms no longer cut a span; a claim word keeps the debate open', () => {
  const line = '<p>Congress must vote before troops enter hostilities.</p>';
  for (const mid of ['<p>Their nuclear program worries everyone.</p>', '<p>Oil prices jumped overnight.</p>', '<p>Our officers briefed us this morning.</p>',
    '<p>Europe should pay its fair share.</p>', '<p>The news coverage was relentless.</p>', '<p>Civilians fled to the shelters.</p>',
    '<p>The strikes hit roads and bridges.</p>']) {
    const c = S.scoreRawRecord(page(`<p>Iran is on everyone’s mind.</p>${mid}${line}`, 'iran_hostilities'), 'iran_hostilities');
    assert.equal(c.position, 'support', mid);
  }
  for (const k of ['nuclear', 'oil', 'officers', 'fair share', 'coverage', 'shelters?', 'infrastructure', 'critical minerals']) assert.ok(S.BROAD_BREAK_TERMS.has(k), k);
  const kept = Object.values(S.issueBreakTerms()).flat();
  for (const k of ['abortion', 'public (?:schools?|education)', 'medicaid expansion', 'zoning', 'cannabis']) assert.ok(kept.includes(k), k);
});
t('spans (backward): the sentence just before a subject is named joins the span when it is the same claim', () => {
  // Massie: "The Constitution does not permit …" sits ahead of "… against Iran" and is pulled in.
  const body = '<p>The Constitution does not permit the executive branch to unilaterally commit an act of war against a sovereign nation that hasn’t attacked the United States.</p><p>Congress has the sole power to declare war against Iran.</p>';
  const sp = S.subjectSpans(S.extractSentences(body), body);
  assert.deepEqual(sp.map((x) => [x.subject, x.named, !!x.backward]), [['iran_hostilities', false, true], ['iran_hostilities', true, false]]);
  // An unfinished fragment joins too; an unrelated sentence, a heading or a subject change does not.
  const frag = '<p>And so, before any strike,</p><p>Congress must vote on Iran.</p>';
  assert.equal(S.subjectSpans(S.extractSentences(frag), frag)[0].backward, true);
  for (const before of ['<p>We had a lovely dinner downtown.</p>', '<h2>Congress and the war</h2>', '<p>Yemen’s war drags on with no end.</p>']) {
    const b2 = `${before}<p>Congress has the sole power to declare war against Iran.</p>`;
    assert.equal(S.subjectSpans(S.extractSentences(b2), b2)[0].subject, null, before);
  }
});
t('spans (two subjects): the open subject stays open after a sentence naming two, unless that sentence switches', () => {
  const line = '<p>Congress must vote before troops enter hostilities.</p>';
  const stay = S.scoreRawRecord(page(`<p>Iran is on everyone’s mind.</p><p>Iran funds attacks on Israel.</p>${line}`, 'iran_hostilities'), 'iran_hostilities');
  assert.equal(stay.position, 'support');
  const sw = `<p>Iran is on everyone’s mind.</p><p>Now let me turn to Israel, which Iran attacked.</p>${line}`;
  assert.equal(S.scoreRawRecord(page(sw, 'iran_hostilities'), 'iran_hostilities').position, 'no clear position');
  const sp = S.subjectSpans(S.extractSentences(sw), sw);
  assert.equal(sp[1].subject, 'israel_military_aid');
  // With no open subject, a two-subject sentence carries nothing.
  const none = S.scoreRawRecord(page(`<p>Iran funds attacks on Israel.</p>${line}`, 'iran_hostilities'), 'iran_hostilities');
  assert.equal(none.position, 'no clear position');
});
t('spans (Israel facets): offensive and defensive passages are claimed by their own key', () => {
  const body = `<p>We must block the sale of offensive weaponry to Israel.</p><p>Those bombs have killed thousands.</p>
<p>I will fully fund Iron Dome.</p><p>Those interceptors save lives every night.</p>`;
  const sp = S.subjectSpans(S.extractSentences(body), body);
  assert.deepEqual(sp.map((x) => x.facet), ['offensive', 'offensive', 'defensive', 'defensive']);
  const off = S.scoreRawRecord(page(body, 'israel_offensive_arms', { politician_id: 'sanders' }), 'israel_offensive_arms');
  const def = S.scoreRawRecord(page(body, 'israel_defensive_systems', { politician_id: 'sanders' }), 'israel_defensive_systems');
  const all = S.scoreRawRecord(page(body, 'israel_military_aid', { politician_id: 'sanders' }), 'israel_military_aid');
  assert.equal(off.position, 'oppose');
  assert.ok(off.sources[0].statements.every((x) => x.facet !== 'defensive'));
  assert.equal(def.position, 'support');
  assert.ok(def.sources[0].statements.every((x) => x.facet !== 'offensive'));
  assert.equal(all.position, 'mixed', 'the combined key reads both facets');
  // A sentence with both cues is read by both split keys.
  assert.equal(S.facetExcludes('israel_defensive_systems', 'both'), false);
  assert.equal(S.facetExcludes('israel_military_aid', 'offensive'), false);
});
t('R9 linked keys: an Iran war-powers line counts on both war_powers and iran_hostilities', () => {
  const raw = page('<p>Congress has the sole power to declare war against Iran.</p><p>We must pass the Iran war powers resolution.</p>', 'cost_living');
  const got = S.scoreAllTopics(raw, { topics: [...S.SCORED_TOPICS, ...KEYS] }).map((c) => c.topic);
  assert.ok(got.includes('war_powers') && got.includes('iran_hostilities'), got.join(','));
  assert.ok(S.linkedKeys('iran_hostilities', 'war_powers') && S.linkedKeys('israel_offensive_arms', 'israel_support'));
  assert.ok(!S.linkedKeys('israel_offensive_arms', 'israel_defensive_systems'), 'siblings are not linked');
  assert.ok(!S.linkedKeys('war_powers', 'checks_balances'), 'register-only pairs keep the old R9');
});
t('splitter: "U.S." and similar abbreviations do not end a sentence', () => {
  assert.deepEqual(S.extractSentences('<p>block the sale of $8.56 billion in offensive U.S. weaponry to Israel.</p>'), ['block the sale of $8.56 billion in offensive U.S. weaponry to Israel.']);
  assert.deepEqual(S.extractSentences('<p>The U.S. Senate voted today on the bill. Then we went home.</p>'), ['The U.S. Senate voted today on the bill.', 'Then we went home.']);
  assert.deepEqual(S.extractSentences('<p>It was all made in the U.S. We need more of that here.</p>'), ['It was all made in the U.S.', 'We need more of that here.']);
  assert.deepEqual(S.extractSentences('<p>We met on Jan. 6 at noon in the hall. It was cold out.</p>'), ['We met on Jan. 6 at noon in the hall.', 'It was cold out.']);
  assert.deepEqual(S.extractSentences('<p>Regulate A.I. & Data Centers now, she said.</p>'), ['Regulate A.I. & Data Centers now, she said.']);
});
t('spans: only directional keys read spans; register topics read exactly as before', () => {
  assert.equal(S.subjectOf('war_powers'), null);
  assert.equal(S.subjectOf('israel_offensive_arms'), 'israel_military_aid', 'the three Israel keys share one subject');
  const c = S.scoreRawRecord(page(TWO_PLACES, 'war_powers'), 'war_powers');
  assert.ok(!('subject' in c));
  assert.ok(c.sources[0].statements.every((x) => !('subject_span' in x)));
});

// ── Nothing existing moves ──────────────────────────────────────────────────
const fingerprint = (rules, keys) => createHash('sha256').update(JSON.stringify(keys.map((k) =>
  [k, Object.fromEntries(Object.entries(rules[k]).map(([f, r]) => [f, r ? String(r) : null]))]))).digest('hex');
t('the register sweep and every existing key\'s rules are unchanged', () => {
  const issueKeys = JSON.parse(readFileSync(path.join(root, 'db/issue-keys.json'), 'utf8')).keys;
  assert.deepEqual([...S.SCORED_TOPICS].sort(), [...issueKeys].sort());
  for (const k of KEYS) assert.ok(!S.SCORED_TOPICS.includes(k) && !(k in V.ISSUE_TOPIC_VOCAB), k);
  const existing = Object.keys(S.TOPIC_RULES).filter((k) => !KEYS.includes(k)).sort();
  assert.equal(existing.length, 125);
  // Fingerprint of the 125 existing keys' compiled rules at the start of this pass.
  assert.equal(fingerprint(S.TOPIC_RULES, existing), 'f3ca8a77ce70f58fbef03e2097d2ae260d423189bc20f78a9998c616e03e5bb1');
  assert.equal(S.RULES_VERSION, 'phase8-v3');
  assert.equal(S.VOCAB_VERSION, 'issue-vocab-v1');
  assert.equal(S.WEIGHTS.statedPositionConfidence, 0.8);
  // The register sweep never yields a directional-key candidate unless asked.
  const raw = { url: 'https://example.com', fetched_at: '2026-11-12', source_type: 'statement', politician_id: 'massie', topic: 'cost_living',
    body: "<p>I don't want to send more aid to Ukraine.</p><p>Congress has the sole power to declare war against Iran.</p>" };
  assert.ok(!S.scoreAllTopics(raw).some((c) => KEYS.includes(c.topic)));
  const opted = S.scoreAllTopics(raw, { topics: [...S.SCORED_TOPICS, ...KEYS] }).map((c) => c.topic);
  assert.ok(opted.includes('ukraine_aid') && opted.includes('iran_hostilities'), opted.join(','));
});
t('ground-truth file is unchanged by this pass', () => {
  const h = createHash('sha256').update(readFileSync(path.join(root, 'db/stance-ground-truth-talarico-cost-of-living.json'))).digest('hex');
  assert.equal(h, 'f2889f2a8e30dbae8f4bd099719ed2c53f290a9fb1a017ca0a3601b46da59586');
});
t('the re-score report is current and records the comparison for all three remapped records', () => {
  execFileSync(process.execPath, [path.join(root, 'scripts/rescore-ground-truth-directional-2026-11.mjs'), '--check'], { stdio: 'pipe' });
  const rep = JSON.parse(readFileSync(path.join(root, 'db/rescore-ground-truth-directional-2026-11.json'), 'utf8'));
  assert.deepEqual(rep.records.map((r) => [r.stance_id, r.human.position, r.scorer.position, r.verdict]), [
    ['massie|ukraine_aid|gt-002', 'oppose', 'oppose', 'agrees'],
    ['massie|iran_hostilities|gt-005', 'support', 'support', 'agrees'],
    ['sanders|israel_military_aid|gt-006', 'mixed', 'oppose', 'disagrees'],
  ]);
});

t('document scope: the six ground-truth records read the same as under paragraph scope, and the report is current', () => {
  execFileSync(process.execPath, [path.join(root, 'scripts/rescore-ground-truth-document-scope-2026-11.mjs'), '--check'], { stdio: 'pipe' });
  const rep = JSON.parse(readFileSync(path.join(root, 'db/rescore-ground-truth-document-scope-2026-11.json'), 'utf8'));
  assert.equal(rep.summary.records, 6);
  assert.equal(rep.summary.changed_records, 0);
  assert.equal(rep.summary.changed_source_reads, 0);
  assert.deepEqual(rep.records.map((r) => [r.stance_id, r.human.position]), [
    ['james_talarico|cost_living|gt-001', 'support'], ['massie|ukraine_aid|gt-002', 'oppose'], ['sanders|healthcare|gt-003', 'support'],
    ['james_talarico|school_choice|gt-004', 'oppose'], ['massie|iran_hostilities|gt-005', 'support'], ['sanders|israel_military_aid|gt-006', 'mixed'],
  ]);
});

if (failures) { console.error(`${failures} failing`); process.exit(1); }
console.log('directional keys: all checks pass');
