#!/usr/bin/env node
// test-stance-ground-truth-tx-cost-of-living.mjs — the two hand-built Texas
// governor's-race ground-truth stance records (Greg Abbott and Gina Hinojosa ×
// cost of living) exist in their own files, follow the locked Talarico schema,
// rest on first-party sources only, and respect the confidence rules. Also pins
// the original Talarico ground-truth file so these additions cannot touch it.
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const t = (name, fn) => {
  try { fn(); console.log('  ✓', name); }
  catch (e) { failures++; console.error('  ✗', name, '\n    ', e.message); }
};

const POSITIONS = ['support', 'oppose', 'mixed', 'no clear position'];
const WEIGHTS = ['strong', 'weak', 'mention'];
const REQUIRED = ['stance_id', 'politician_id', 'topic', 'position', 'confidence',
  'confidence_reason', 'sources', 'last_updated', 'status'];
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const URL_RE = /^https?:\/\//;

// First-party hosts only: the politician's own campaign site or newsletter.
const RECORDS = [
  { file: 'stance-ground-truth-abbott-cost-of-living.json', politician_id: 'greg_abbott',
    hosts: ['www.gregabbott.com', 'gregabbott.com', 'govgregabbott.substack.com'],
    primary: 'https://www.gregabbott.com/policy/' },
  { file: 'stance-ground-truth-hinojosa-cost-of-living.json', politician_id: 'gina_hinojosa',
    hosts: ['ginafortexas.com', 'www.ginafortexas.com'],
    primary: 'https://ginafortexas.com/priority/an-affordable-texas-that-works-for-everyone/' },
];

const vocab = await import(path.join(root, 'netlify/lib/stance-topic-vocab.mjs'));
const { SOURCES } = await import(path.join(root, 'netlify/lib/raw-ingest-core.mjs'));
const talarico = JSON.parse(readFileSync(path.join(root, 'db/stance-ground-truth-talarico-cost-of-living.json'), 'utf8'));
const knownIds = new Set([talarico.stance_id, ...(talarico.additional_records || []).map((r) => r.stance_id)]);
const expansion = path.join(root, 'db/stance-ground-truth-expansion-2026-11.json');
if (existsSync(expansion)) {
  const ex = JSON.parse(readFileSync(expansion, 'utf8'));
  for (const r of (ex.records || [])) knownIds.add(r.stance_id);
}

for (const spec of RECORDS) {
  const file = path.join(root, 'db', spec.file);
  const tag = spec.politician_id;
  t(`${tag}: file exists in db/`, () => assert.ok(existsSync(file), 'missing ' + file));
  if (!existsSync(file)) continue;
  const rec = JSON.parse(readFileSync(file, 'utf8'));
  const sources = Array.isArray(rec.sources) ? rec.sources : [];

  t(`${tag}: every required field present`, () => {
    for (const k of REQUIRED) assert.ok(k in rec, 'missing field ' + k);
  });
  t(`${tag}: identity is ${tag} × cost_living on the existing key`, () => {
    assert.equal(rec.politician_id, spec.politician_id);
    assert.equal(rec.topic, 'cost_living');
    assert.equal(vocab.ISSUE_TOPIC_LABELS.cost_living, 'Tackle the Cost of Living', 'cost_living must be an existing issue key');
    assert.match(rec.stance_id, new RegExp(`^${tag}\\|cost_living\\|gt-\\d{3}$`));
    assert.ok(!knownIds.has(rec.stance_id), `stance_id ${rec.stance_id} collides with an existing record`);
  });
  t(`${tag}: position is support and an allowed value`, () => {
    assert.ok(POSITIONS.includes(rec.position), rec.position);
    assert.equal(rec.position, 'support');
  });
  t(`${tag}: confidence in the 0.80–0.90 band with a one-line reason`, () => {
    assert.equal(typeof rec.confidence, 'number');
    assert.ok(rec.confidence >= 0.8 && rec.confidence <= 0.9, String(rec.confidence));
    assert.ok(typeof rec.confidence_reason === 'string' && rec.confidence_reason.trim());
    assert.ok(!rec.confidence_reason.includes('\n'), 'reason must be one line');
  });
  t(`${tag}: active, locked, ISO dates`, () => {
    assert.equal(rec.status, 'active');
    assert.match(rec.last_updated, ISO);
    assert.equal(rec.locked, true);
    assert.match(rec.locked_on, ISO);
  });
  t(`${tag}: every source has type, date, direct link, verbatim excerpt, weight and clear-position flag`, () => {
    assert.ok(sources.length > 0);
    for (const [i, s] of sources.entries()) {
      assert.ok(typeof s.type === 'string' && s.type.trim(), `source ${i}: type`);
      assert.ok('date' in s, `source ${i}: date key`);
      if (s.date === null) assert.match(s.note || '', /no date on page/i, `source ${i}: undated source must say "no date on page"`);
      else assert.match(s.date, ISO, `source ${i}: date format`);
      assert.ok(URL_RE.test(s.link || ''), `source ${i}: link`);
      assert.ok(typeof s.excerpt === 'string' && /"[^"]+"/.test(s.excerpt), `source ${i}: quoted excerpt`);
      assert.ok(WEIGHTS.includes(s.weight), `source ${i}: weight`);
      assert.equal(typeof s.takes_clear_position, 'boolean', `source ${i}: takes_clear_position`);
      assert.equal(typeof s.page_fully_readable, 'boolean', `source ${i}: page_fully_readable`);
      assert.ok(typeof s.note === 'string' && s.note.trim(), `source ${i}: note`);
    }
  });
  t(`${tag}: only first-party sources (own campaign site or newsletter)`, () => {
    for (const s of sources) assert.ok(spec.hosts.includes(new URL(s.link).hostname), `not first-party: ${s.link}`);
  });
  t(`${tag}: the requested primary page is a clear-position source`, () => {
    const p = sources.find((s) => s.link === spec.primary);
    assert.ok(p, 'primary page missing');
    assert.equal(p.takes_clear_position, true);
  });
  t(`${tag}: at least one clear-position source`, () => {
    assert.ok(sources.some((s) => s.takes_clear_position === true));
  });
  t(`${tag}: a mention-only source is not counted as a clear position`, () => {
    for (const s of sources) if (s.weight === 'mention') assert.equal(s.takes_clear_position, false);
  });
  t(`${tag}: high confidence (>= 0.7) requires every clear-position source to have a link`, () => {
    if (rec.confidence < 0.7) return;
    for (const s of sources.filter((s) => s.takes_clear_position)) assert.ok(URL_RE.test(s.link || ''));
  });
  t(`${tag}: confidence stays below 0.95 if any page was only partly readable`, () => {
    if (sources.some((s) => s.page_fully_readable === false)) assert.ok(rec.confidence < 0.95);
  });
  t(`${tag}: the primary page is the same URL the raw-ingest pipeline uses`, () => {
    assert.ok(SOURCES.some((s) => s.politician_id === tag && s.topic === 'cost_living' && s.url === spec.primary));
  });
}

t('the two new records have distinct stance ids', () => {
  const ids = RECORDS.map((r) => JSON.parse(readFileSync(path.join(root, 'db', r.file), 'utf8')).stance_id);
  assert.equal(new Set(ids).size, ids.length);
});
t('the original Talarico ground-truth file is unchanged', () => {
  const h = createHash('sha256').update(readFileSync(path.join(root, 'db/stance-ground-truth-talarico-cost-of-living.json'))).digest('hex');
  assert.equal(h, 'f2889f2a8e30dbae8f4bd099719ed2c53f290a9fb1a017ca0a3601b46da59586');
});
t('no live code reads the new benchmark files', () => {
  for (const f of ['netlify/lib/raw-ingest-core.mjs', 'netlify/functions/raw-ingest-cron.mts']) {
    const src = readFileSync(path.join(root, f), 'utf8');
    assert.ok(!/stance-ground-truth-(abbott|hinojosa)/.test(src), `${f} must not read the new ground-truth files`);
  }
});

if (failures) { console.error(`${failures} failing`); process.exit(1); }
console.log('stance ground truth (TX cost of living): all checks pass');
