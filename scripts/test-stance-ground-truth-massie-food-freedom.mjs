#!/usr/bin/env node
// test-stance-ground-truth-massie-food-freedom.mjs — the hand-built
// ground-truth stance record for Thomas Massie × food freedom and raw milk
// exists in its own file, follows the locked ground-truth schema, rests only on
// Massie's own pages and posts (no votes, no secondary sources), and respects
// the confidence rules. Also pins every earlier ground-truth file so this
// addition cannot touch them.
//   node scripts/test-stance-ground-truth-massie-food-freedom.mjs
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE_NAME = 'stance-ground-truth-massie-food-freedom.json';
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
// Massie's own pages only: House office site, campaign site, his own X account.
const FIRST_PARTY_HOSTS = ['massie.house.gov', 'www.thomasmassie.com', 'thomasmassie.com', 'x.com', 'twitter.com'];
const OWN_X = /^https:\/\/(?:x|twitter)\.com\/RepThomasMassie\/status\/\d+$/;

const vocab = await import(path.join(root, 'netlify/lib/stance-topic-vocab.mjs'));
const { RELATED_ISSUE_KEYS } = await import(path.join(root, 'netlify/lib/related-issue-keys.mjs'));

console.log('stance ground truth: Massie × food freedom and raw milk');

t('file exists in db/', () => assert.ok(existsSync(file), 'missing ' + file));
const rec = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
const sources = Array.isArray(rec.sources) ? rec.sources : [];

t('every required field present', () => {
  for (const k of REQUIRED) assert.ok(k in rec, 'missing field ' + k);
});
t('identity is massie × rural_ag, an existing key in the register and related-issues map', () => {
  assert.equal(rec.politician_id, 'massie');
  assert.equal(rec.topic, 'rural_ag');
  assert.equal(vocab.ISSUE_TOPIC_LABELS.rural_ag, "Farmers & Rural Communities");
  assert.ok(RELATED_ISSUE_KEYS.includes('rural_ag'), 'rural_ag must be in the related-issues map');
  assert.match(readFileSync(path.join(root, 'issue-map.js'), 'utf8'), /rural_ag:\s*\{[^}]*Support family farms, ranchers and rural communities with fair prices and access/);
  assert.match(rec.stance_id, /^massie\|rural_ag\|gt-\d{3}$/);
});
t('politician_id is the roster id already used for Thomas Massie', () => {
  // The existing locked Massie records in the Talarico file use the same id.
  const tal = JSON.parse(readFileSync(path.join(root, 'db/stance-ground-truth-talarico-cost-of-living.json'), 'utf8'));
  assert.ok((tal.additional_records || []).some((r) => r.politician_id === rec.politician_id));
});
t('stance_id does not collide with any other ground-truth record', () => {
  const ids = [];
  for (const f of readdirSync(path.join(root, 'db')).filter((n) => /^stance-ground-truth-.*\.json$/.test(n) && n !== FILE_NAME)) {
    const j = JSON.parse(readFileSync(path.join(root, 'db', f), 'utf8'));
    for (const r of [j, ...(j.additional_records || []), ...(j.records || [])]) if (r && r.stance_id) ids.push(r.stance_id);
  }
  assert.ok(!ids.includes(rec.stance_id), `stance_id ${rec.stance_id} already used`);
});
t('position is an allowed value and reads support on the key\'s own pole', () => {
  assert.ok(POSITIONS.includes(rec.position), rec.position);
  // "support" means support for the key's own pole ("Support family farms, ranchers and rural communities with fair prices and access").
  assert.equal(rec.position, 'support');
  assert.ok(typeof rec.position_on === 'string' && /raw milk/i.test(rec.position_on));
});
t('confidence is a number no higher than 0.85 with a one-line reason', () => {
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
t('each source has a link or an excerpt', () => {
  for (const [i, s] of sources.entries()) {
    const hasLink = typeof s.link === 'string' && URL_RE.test(s.link);
    const hasExcerpt = typeof s.excerpt === 'string' && s.excerpt.trim().length > 0;
    assert.ok(hasLink || hasExcerpt, `source ${i}: needs a link or excerpt`);
  }
});
t('only Massie\'s own pages or posts; no secondary sources and no votes', () => {
  for (const s of sources) {
    const u = new URL(s.link);
    assert.ok(FIRST_PARTY_HOSTS.includes(u.hostname), `not first-party: ${s.link}`);
    if (u.hostname === 'x.com' || u.hostname === 'twitter.com') assert.match(s.link, OWN_X, `not his own X account: ${s.link}`);
    assert.ok(!/vote|roll.?call|clerk|journal/i.test(s.type), `vote-type source not allowed: ${s.type}`);
    assert.ok(!/clerk\.house\.gov|senate\.gov|congress\.gov|govtrack|votesmart|ballotpedia/i.test(s.link), `vote/secondary link: ${s.link}`);
  }
});
t('at least one massie.house.gov press release takes a clear position on raw milk or the Interstate Milk Freedom Act', () => {
  const pr = sources.filter((s) => /press release/i.test(s.type) && ((s) => new URL(s.link).hostname === 'massie.house.gov')(s) && s.takes_clear_position);
  assert.ok(pr.length >= 1, 'no clear-position press release');
  assert.ok(pr.some((s) => /Interstate Milk Freedom Act/.test(s.excerpt)), 'no release on the Interstate Milk Freedom Act');
  assert.ok(pr.some((s) => /raw milk/i.test(s.excerpt)), 'no release on raw milk');
});
t('House language (not a press release) supports raw milk or food freedom', () => {
  const h = sources.filter((s) => s.takes_clear_position && ((s) => new URL(s.link).hostname === 'massie.house.gov')(s) && !/press release/i.test(s.type));
  assert.ok(h.some((s) => /raw milk/i.test(s.excerpt)), 'raw milk House language missing');
});
t('a direct quote from his own X account on raw milk or food freedom', () => {
  const x = sources.filter((s) => OWN_X.test(s.link) && s.takes_clear_position);
  assert.ok(x.length >= 1, 'no clear-position X post');
  assert.ok(x.some((s) => /raw milk/i.test(s.excerpt) && /right to consume/i.test(s.excerpt)));
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
const EARLIER = {
  'stance-ground-truth-abbott-cost-of-living.json': 'e9a6e4be9effbe91c3bdfc97d3bb4e153e0f163186732f6fdb063f6949d836cf',
  'stance-ground-truth-expansion-2026-11.json': '4eeb1f60ecdd94e18a01d54430968ada32207b2a7b1b3809df607742cfb53a80',
  'stance-ground-truth-hinojosa-cost-of-living.json': '9397cfb8f705b6dd64ad5df0c91a95913cd07d4db0b373f29f0cab5213598053',
  'stance-ground-truth-massie-abortion.json': '45e5aa7749bd2700a965426569881ade0bf4ded40da6bc44397daa0875f2fc74',
  'stance-ground-truth-massie-abolish-education.json': 'e723504fddceb10719849c12096277cf9bfc6648949f6e1891f6fb5a4fe0fe79',
  'stance-ground-truth-massie-border.json': '45b8488ec7da62d70091a8c1bc889fd590cba5c70f0afb192911edc83b230e3b',
  'stance-ground-truth-massie-federal-reserve.json': 'a7c38d82ddf1a58834e89d4f834277a1f43631b04a1c07c278c158396610f818',
  'stance-ground-truth-massie-foreign-aid.json': 'a0dc7c317cfeca2dd6eeac317df5ecf1a18555b0abb6f34c073741a8d33f4c5f',
  'stance-ground-truth-massie-federal-spending.json': '55cfee5649f6b8ffeeaf144f78c88451af700977cbb1b1fdc7dfc735d93c764d',
  'stance-ground-truth-massie-medical-freedom.json': 'd735b222602b852cb9388ae6f6f02628fe69f1864243efa97a37e33b5a3c138b',
  'stance-ground-truth-massie-surveillance.json': '04f545a35f16495ea8ea2ad3ee8dde5cbfcf5b63445ef6adc60d33b71109f92d',
  'stance-ground-truth-massie-second-amendment.json': 'eb64045e7defb46345821864b524d93b7d8d868caa08de1e3e87376e95282a75',
  'stance-ground-truth-talarico-cost-of-living.json': 'f2889f2a8e30dbae8f4bd099719ed2c53f290a9fb1a017ca0a3601b46da59586',
};
for (const [f, want] of Object.entries(EARLIER)) {
  t(`earlier ground-truth file ${f} is byte-for-byte unchanged`, () => {
    const h = createHash('sha256').update(readFileSync(path.join(root, 'db', f))).digest('hex');
    assert.equal(h, want);
  });
}
t('every earlier ground-truth file is still present alongside this one', () => {
  // Later records may be added; earlier ones must not be removed or renamed.
  const all = readdirSync(path.join(root, 'db')).filter((n) => /^stance-ground-truth-.*\.json$/.test(n));
  for (const f of [...Object.keys(EARLIER), FILE_NAME]) assert.ok(all.includes(f), 'missing ' + f);
});
t('the service worker is untouched by this record', () => {
  const p = path.join(root, 'sw.js');
  if (existsSync(p)) assert.ok(!readFileSync(p, 'utf8').includes(FILE_NAME));
});
t('no live code reads the new benchmark file', () => {
  for (const f of ['netlify/lib/raw-ingest-core.mjs', 'netlify/functions/raw-ingest-cron.mts', 'netlify/lib/stance-score-core.mjs', 'sw.js']) {
    const p = path.join(root, f);
    if (!existsSync(p)) continue;
    assert.ok(!readFileSync(p, 'utf8').includes('stance-ground-truth-massie'), `${f} must not read the new ground-truth file`);
  }
});

if (failures) { console.error(`${failures} failing`); process.exit(1); }
console.log('stance ground truth (Massie food freedom): all checks pass');
