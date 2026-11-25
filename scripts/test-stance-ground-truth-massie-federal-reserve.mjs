#!/usr/bin/env node
// test-stance-ground-truth-massie-federal-reserve.mjs — the hand-built
// ground-truth stance record for Thomas Massie × the Federal Reserve (Audit the
// Fed / End the Fed) exists in its own file, follows the locked ground-truth
// schema, sits on an existing issue key and roster id, rests only on Massie's
// own pages and posts (no votes, no secondary sources), and respects the
// confidence rules. Also pins the four earlier ground-truth files so this
// addition cannot touch them.
//   node scripts/test-stance-ground-truth-massie-federal-reserve.mjs
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE_NAME = 'stance-ground-truth-massie-federal-reserve.json';
const file = path.join(root, 'db', FILE_NAME);
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
const FIRST_PARTY_HOSTS = ['massie.house.gov', 'www.thomasmassie.com', 'thomasmassie.com', 'x.com', 'twitter.com'];
const OWN_X = /^https:\/\/(?:x|twitter)\.com\/RepThomasMassie\/status\/\d+$/;
const PINNED = {
  'stance-ground-truth-talarico-cost-of-living.json': 'f2889f2a8e30dbae8f4bd099719ed2c53f290a9fb1a017ca0a3601b46da59586',
  'stance-ground-truth-massie-federal-spending.json': '55cfee5649f6b8ffeeaf144f78c88451af700977cbb1b1fdc7dfc735d93c764d',
  'stance-ground-truth-massie-second-amendment.json': 'eb64045e7defb46345821864b524d93b7d8d868caa08de1e3e87376e95282a75',
  'stance-ground-truth-massie-abolish-education.json': 'e723504fddceb10719849c12096277cf9bfc6648949f6e1891f6fb5a4fe0fe79',
};

const vocab = await import(path.join(root, 'netlify/lib/stance-topic-vocab.mjs'));
const { RELATED_ISSUE_KEYS } = await import(path.join(root, 'netlify/lib/related-issue-keys.mjs'));

console.log('stance ground truth: Massie × the Federal Reserve');

t('file exists in db/', () => assert.ok(existsSync(file), 'missing ' + file));
const rec = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
const sources = Array.isArray(rec.sources) ? rec.sources : [];

t('every required field present', () => {
  for (const k of REQUIRED) assert.ok(k in rec, 'missing field ' + k);
});
t('topic is the existing audit_spending key, whose pole includes auditing the Federal Reserve', () => {
  assert.equal(rec.topic, 'audit_spending');
  const v = vocab.ISSUE_TOPIC_VOCAB.audit_spending;
  assert.ok(v, 'audit_spending must be an existing scored key');
  assert.ok(!v.noPole && !v.grouping, 'audit_spending must be directional');
  assert.match(v.pos, /Federal Reserve/);
  assert.ok(RELATED_ISSUE_KEYS.includes('audit_spending'), 'audit_spending must be in the related-issues map');
  assert.match(rec.stance_id, /^massie\|audit_spending\|gt-\d{3}$/);
  assert.match(rec.position_on, /Federal Reserve/);
});
t('politician_id is the roster id already used for Thomas Massie', () => {
  assert.equal(rec.politician_id, 'massie');
  const tal = JSON.parse(readFileSync(path.join(root, 'db/stance-ground-truth-talarico-cost-of-living.json'), 'utf8'));
  assert.ok((tal.additional_records || []).some((r) => r.politician_id === 'massie'));
});
t('stance_id does not collide with any other ground-truth record', () => {
  const ids = [];
  for (const f of readdirSync(path.join(root, 'db')).filter((n) => /^stance-ground-truth-.*\.json$/.test(n) && n !== FILE_NAME)) {
    const j = JSON.parse(readFileSync(path.join(root, 'db', f), 'utf8'));
    for (const r of [j, ...(j.additional_records || []), ...(j.records || [])]) if (r && r.stance_id) ids.push(r.stance_id);
  }
  assert.ok(!ids.includes(rec.stance_id), `stance_id ${rec.stance_id} already used`);
});
t('position is an allowed value and is support', () => {
  assert.ok(POSITIONS.includes(rec.position), rec.position);
  assert.equal(rec.position, 'support');
  assert.ok(typeof rec.position_on === 'string' && rec.position_on.trim());
});
t('confidence is 0.85 (never above) with a one-line reason', () => {
  assert.equal(typeof rec.confidence, 'number');
  assert.ok(rec.confidence >= 0 && rec.confidence <= 0.85, String(rec.confidence));
  assert.equal(rec.confidence, 0.85);
  assert.ok(typeof rec.confidence_reason === 'string' && rec.confidence_reason.trim());
  assert.ok(!rec.confidence_reason.includes('\n'), 'reason must be one line');
});
t('active, locked, ISO dates', () => {
  assert.equal(rec.status, 'active');
  assert.match(rec.last_updated, ISO);
  assert.equal(rec.locked, true);
  assert.match(rec.locked_on, ISO);
});
t('every source has type, date, direct link, verbatim excerpt, note, weight and clear-position flag', () => {
  assert.ok(sources.length > 0);
  for (const [i, s] of sources.entries()) {
    assert.ok(typeof s.type === 'string' && s.type.trim(), `source ${i}: type`);
    assert.ok('date' in s, `source ${i}: date key`);
    if (s.date === null) assert.match(s.note || '', /no date on page/i, `source ${i}: undated source must say "no date on page"`);
    else assert.match(s.date, ISO, `source ${i}: date format`);
    assert.ok(URL_RE.test(s.link || ''), `source ${i}: link`);
    assert.ok(typeof s.excerpt === 'string' && /"[^"]+"/.test(s.excerpt), `source ${i}: quoted excerpt`);
    assert.ok(typeof s.note === 'string' && s.note.trim(), `source ${i}: note`);
    assert.ok(WEIGHTS.includes(s.weight), `source ${i}: weight`);
    assert.equal(typeof s.takes_clear_position, 'boolean', `source ${i}: takes_clear_position`);
    assert.equal(typeof s.page_fully_readable, 'boolean', `source ${i}: page_fully_readable`);
  }
});
t('only Massie\'s own pages or posts; no secondary sources and no votes', () => {
  for (const s of sources) {
    const u = new URL(s.link);
    assert.ok(FIRST_PARTY_HOSTS.includes(u.hostname), `not first-party: ${s.link}`);
    if (u.hostname === 'x.com' || u.hostname === 'twitter.com') assert.match(s.link, OWN_X, `not his own X account: ${s.link}`);
    assert.ok(!/vote|roll.?call|clerk|journal/i.test(s.type), `vote-type source not allowed: ${s.type}`);
  }
});
t('the most recent Audit the Fed (H.R. 24) release is a clear-position source', () => {
  const pr = sources.filter((s) => /press release/i.test(s.type) && new URL(s.link).hostname === 'massie.house.gov' && s.takes_clear_position);
  const audit = pr.find((s) => /H\.R\. 24\b/.test(s.excerpt) && /Audit the Fed/.test(s.excerpt));
  assert.ok(audit, 'H.R. 24 release missing');
  assert.equal(audit.date, '2025-01-03');
});
t('House language supporting auditing or abolishing the Fed is a clear-position source', () => {
  const h = sources.filter((s) => new URL(s.link).hostname === 'massie.house.gov' && s.takes_clear_position);
  assert.ok(h.some((s) => /end the Federal Reserve|Abolition Act/.test(s.excerpt)), 'End the Fed language missing');
});
t('the House Federal Reserve issues section, which only says "contact my office", is recorded and does not count', () => {
  const p = sources.find((s) => /^https:\/\/massie\.house\.gov\/issues/i.test(s.link));
  assert.ok(p, 'House issues section missing');
  assert.equal(p.takes_clear_position, false);
  assert.equal(p.weight, 'mention');
});
t('a direct quote from his own X account states a clear position on the Fed', () => {
  const x = sources.filter((s) => OWN_X.test(s.link) && s.takes_clear_position);
  assert.ok(x.length >= 1, 'no clear-position X post');
  assert.ok(x.some((s) => /Federal Reserve|the Fed\b/.test(s.excerpt)));
});
t('the stated position rests on at least one source that takes a clear position', () => {
  if (rec.position === 'no clear position') return;
  assert.ok(sources.some((s) => s.takes_clear_position === true));
});
t('a mention-only source is never counted as a clear position', () => {
  for (const s of sources) if (s.weight === 'mention') assert.equal(s.takes_clear_position, false, s.link);
});
t('high confidence (>= 0.7) requires every clear-position source to have a link', () => {
  if (rec.confidence < 0.7) return;
  for (const s of sources.filter((s) => s.takes_clear_position)) assert.ok(URL_RE.test(s.link || ''), 'clear-position source without link');
});
for (const [f, hash] of Object.entries(PINNED)) {
  t(`${f} is byte-for-byte unchanged`, () => {
    assert.equal(createHash('sha256').update(readFileSync(path.join(root, 'db', f))).digest('hex'), hash);
  });
}
t('no live code reads the new benchmark file', () => {
  for (const f of ['netlify/lib/raw-ingest-core.mjs', 'netlify/functions/raw-ingest-cron.mts', 'netlify/lib/stance-score-core.mjs', 'sw.js']) {
    const p = path.join(root, f);
    if (!existsSync(p)) continue;
    assert.ok(!readFileSync(p, 'utf8').includes('stance-ground-truth-massie'), `${f} must not read the new ground-truth file`);
  }
});

if (failures) { console.error(`${failures} failing`); process.exit(1); }
console.log('stance ground truth (Massie Federal Reserve): all checks pass');
