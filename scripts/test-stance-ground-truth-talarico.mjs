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

if (failures) { console.error(`${failures} failing`); process.exit(1); }
console.log('stance ground truth: all checks pass');
