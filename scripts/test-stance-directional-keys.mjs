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

if (failures) { console.error(`${failures} failing`); process.exit(1); }
console.log('directional keys: all checks pass');
