#!/usr/bin/env node
// test-stance-ground-truth-talarico.mjs — the first manual ground-truth stance
// record (James Talarico × cost of living) exists, has the locked schema, and
// every source carries a verifiable link or excerpt.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(root, 'db', 'stance-ground-truth-talarico-cost-of-living.json');
let failures = 0;
const t = (name, fn) => {
  try { fn(); console.log('  ✓', name); }
  catch (e) { failures++; console.error('  ✗', name, '\n    ', e.message); }
};

t('file exists', () => assert.ok(existsSync(file), 'missing ' + file));
const rec = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};

t('required schema fields present', () => {
  for (const k of ['stance_id', 'politician_id', 'topic', 'position', 'confidence',
    'confidence_reason', 'sources', 'last_updated', 'status']) {
    assert.ok(k in rec, 'missing field ' + k);
  }
});
t('identity is Talarico × cost_living', () => {
  assert.equal(rec.politician_id, 'james_talarico');
  assert.equal(rec.topic, 'cost_living');
  assert.ok(typeof rec.stance_id === 'string' && rec.stance_id.length > 0);
});
t('position is one of the allowed values', () => {
  assert.ok(['support', 'oppose', 'mixed', 'no clear position'].includes(rec.position), rec.position);
});
t('confidence is 0.0–1.0 with a one-line reason', () => {
  assert.equal(typeof rec.confidence, 'number');
  assert.ok(rec.confidence >= 0 && rec.confidence <= 1);
  assert.ok(typeof rec.confidence_reason === 'string' && rec.confidence_reason.trim());
  assert.ok(!rec.confidence_reason.includes('\n'), 'reason must be one line');
});
t('status is active; last_updated is an ISO date', () => {
  assert.equal(rec.status, 'active');
  assert.match(rec.last_updated, /^\d{4}-\d{2}-\d{2}$/);
});
t('sources is a non-empty array', () => {
  assert.ok(Array.isArray(rec.sources) && rec.sources.length > 0);
});
t('every source has type, date key, note, and a link or excerpt', () => {
  for (const [i, s] of (rec.sources || []).entries()) {
    assert.ok(typeof s.type === 'string' && s.type.trim(), `source ${i}: type`);
    assert.ok('date' in s, `source ${i}: date key`);
    if (s.date !== null) assert.match(s.date, /^\d{4}-\d{2}-\d{2}$/, `source ${i}: date format`);
    assert.ok(typeof s.note === 'string' && s.note.trim(), `source ${i}: note`);
    const hasLink = typeof s.link === 'string' && /^https?:\/\//.test(s.link);
    const hasExcerpt = typeof s.excerpt === 'string' && s.excerpt.trim().length > 0;
    assert.ok(hasLink || hasExcerpt, `source ${i}: needs a link or excerpt`);
  }
});
t('a non-"no clear position" stance rests on at least one source that takes a clear position', () => {
  if (rec.position === 'no clear position') return;
  assert.ok((rec.sources || []).some((s) => s.takes_clear_position === true));
});
t('high confidence (>= 0.7) requires every clear-position source to have a link', () => {
  if (rec.confidence < 0.7) return;
  for (const s of (rec.sources || []).filter((s) => s.takes_clear_position)) {
    assert.ok(/^https?:\/\//.test(s.link || ''), 'clear-position source without link');
  }
});

// Additional locked records (Massie, Sanders) share the same file and schema.
const POSITIONS = ['support', 'oppose', 'mixed', 'no clear position'];
const WEIGHTS = ['strong', 'weak', 'mention'];
const extra = Array.isArray(rec.additional_records) ? rec.additional_records : [];
t('additional records: five more locked records, ids unique', () => {
  assert.deepEqual(extra.map((r) => r.stance_id), [
    'massie|ukraine_aid|gt-002', 'sanders|healthcare|gt-003',
    'james_talarico|school_choice|gt-004', 'massie|iran_hostilities|gt-005', 'sanders|israel_military_aid|gt-006',
  ]);
  const ids = [rec.stance_id, ...extra.map((r) => r.stance_id)];
  assert.equal(new Set(ids).size, ids.length);
});
for (const r of extra) {
  t(`${r.stance_id}: locked schema, sources and confidence rules`, () => {
    for (const k of ['stance_id', 'politician_id', 'topic', 'position', 'confidence',
      'confidence_reason', 'sources', 'last_updated', 'status']) assert.ok(k in r, 'missing ' + k);
    assert.ok(POSITIONS.includes(r.position), r.position);
    assert.ok(r.confidence >= 0 && r.confidence <= 1);
    assert.ok(r.confidence_reason.trim() && !r.confidence_reason.includes('\n'));
    assert.equal(r.status, 'active');
    assert.match(r.last_updated, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(Array.isArray(r.sources) && r.sources.length > 0);
    for (const [i, s] of r.sources.entries()) {
      assert.ok(s.type && s.note && 'date' in s, `source ${i}`);
      if (s.date !== null) assert.match(s.date, /^\d{4}-\d{2}-\d{2}$/);
      assert.ok(/^https?:\/\//.test(s.link || ''), `source ${i}: link`);
      assert.ok(String(s.excerpt || '').trim(), `source ${i}: excerpt`);
      assert.ok(WEIGHTS.includes(s.weight), `source ${i}: weight`);
    }
    if (r.position !== 'no clear position') assert.ok(r.sources.some((s) => s.takes_clear_position === true));
  });
}
t('the records cover support, oppose and mixed', () => {
  const pos = new Set([rec.position, ...extra.map((r) => r.position)]);
  assert.ok(pos.has('support') && pos.has('oppose') && pos.has('mixed'));
});
t('every record is locked and each politician has two distinct topics', () => {
  const all = [rec, ...extra];
  for (const r of all) assert.equal(r.locked, true, r.stance_id);
  for (const pid of ['james_talarico', 'massie', 'sanders']) {
    const topics = all.filter((r) => r.politician_id === pid).map((r) => r.topic);
    assert.equal(new Set(topics).size, 2, pid);
  }
});


// Vocab v2: every record sits on a directional key that can take support /
// oppose / mixed, the three remapped records keep their old key on file, and
// the remap changed no human label (position, confidence, sources, notes).
const vocab = await import(path.join(root, 'netlify/lib/stance-topic-vocab.mjs'));
const CORE = ['cost_living', 'healthcare_costs'];
const isDirectional = (k) => CORE.includes(k) || k in vocab.DIRECTIONAL_ISSUE_KEYS ||
  (k in vocab.ISSUE_TOPIC_VOCAB && !vocab.ISSUE_TOPIC_VOCAB[k].noPole && !vocab.ISSUE_TOPIC_VOCAB[k].grouping);
t('vocab v2: all six records sit on directional keys', () => {
  for (const r of [rec, ...extra]) assert.ok(isDirectional(r.topic), `${r.stance_id} is on ${r.topic}`);
});
const REMAP = {
  'massie|ukraine_aid|gt-002': { from: 'ukraine_policy', to: 'ukraine_aid', position: 'oppose', confidence: 0.85, sources: 3 },
  'massie|iran_hostilities|gt-005': { from: 'war_powers', to: 'iran_hostilities', position: 'support', confidence: 0.85, sources: 2 },
  'sanders|israel_military_aid|gt-006': { from: 'israel_support', to: 'israel_military_aid', position: 'mixed', confidence: 0.75, sources: 4 },
};
t('vocab v2: remapped records keep their old key, parent link and human label', () => {
  for (const [id, m] of Object.entries(REMAP)) {
    const r = extra.find((x) => x.stance_id === id);
    assert.ok(r, id);
    assert.equal(r.topic, m.to);
    assert.equal(r.previous_topic, m.from);
    assert.equal(r.previous_stance_id, id.replace(`|${m.to}|`, `|${m.from}|`));
    assert.equal(r.position, m.position, `${id}: position`);
    assert.equal(r.confidence, m.confidence, `${id}: confidence`);
    assert.equal(r.sources.length, m.sources, `${id}: sources`);
    assert.equal(r.locked, true);
    // The new key sits under the old one (directly or through a directional parent).
    let k = m.to; const seen = [];
    while (k in vocab.DIRECTIONAL_ISSUE_KEYS) { seen.push(k); k = vocab.DIRECTIONAL_ISSUE_KEYS[k].parent; }
    const also = vocab.DIRECTIONAL_ISSUE_KEYS[m.to].also || [];
    assert.ok(k === m.from || also.includes(m.from), `${m.to} is not under ${m.from}`);
  }
});
t('vocab v2: the old broad keys stay in the vocabulary as grouping keys', () => {
  for (const k of ['ukraine_policy', 'war_powers', 'israel_support', 'iran_policy']) {
    assert.ok(k in vocab.ISSUE_TOPIC_VOCAB, k);
    assert.ok(vocab.GROUPING_ISSUE_KEYS.includes(k), k);
    assert.ok(vocab.directionalChildren(k).length > 0, k);
  }
  for (const [k, v] of Object.entries(vocab.DIRECTIONAL_ISSUE_KEYS)) {
    assert.ok(!(k in vocab.ISSUE_TOPIC_VOCAB), `${k} must not enter the scored vocabulary`);
    assert.ok(v.label && v.pos && v.against && v.parent, k);
    assert.ok(v.parent in vocab.ISSUE_TOPIC_VOCAB || v.parent in vocab.DIRECTIONAL_ISSUE_KEYS, k);
    assert.equal(vocab.ISSUE_TOPIC_LABELS[k], v.label);
  }
});

if (failures) { console.error(`${failures} failing`); process.exit(1); }
console.log('stance ground truth: all checks pass');
