#!/usr/bin/env node
// test-stance-ground-truth-sanders-wealth-tax.mjs — the hand-built ground-truth
// stance record for Bernie Sanders × wealth inequality and tax fairness exists in its own file, follows
// the locked ground-truth schema, rests only on Sanders's own Senate pages
// (no votes, no secondary sources), and respects the confidence rules. Also
// pins every earlier ground-truth file so this addition cannot touch them.
//   node scripts/test-stance-ground-truth-sanders-wealth-tax.mjs
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE_NAME = 'stance-ground-truth-sanders-wealth-tax.json';
const KEY = 'wealth_inequality_tax_fairness';
const file = path.join(root, 'db', FILE_NAME);
let failures = 0;
const t = (name, fn) => {
  try { fn(); console.log('  ✓', name); }
  catch (e) { failures++; console.error('  ✗', name, '\n    ', e.message); }
};

const POSITIONS = ['support', 'oppose', 'mixed', 'no clear position'];
const WEIGHTS = ['strong', 'weak', 'mention'];
const REQUIRED = ['stance_id', 'politician_id', 'topic', 'position', 'position_on', 'confidence',
  'confidence_reason', 'sources', 'last_updated', 'status', 'locked', 'locked_on'];
const SOURCE_FIELDS = ['type', 'date', 'link', 'excerpt', 'note', 'weight', 'takes_clear_position'];
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const URL_RE = /^https?:\/\//;
// Sanders's own pages only: Senate office site, campaign site, his own X accounts.
const FIRST_PARTY_HOSTS = ['www.sanders.senate.gov', 'sanders.senate.gov', 'berniesanders.com', 'x.com', 'twitter.com'];
const OWN_X = /^https:\/\/(?:x|twitter)\.com\/(?:SenSanders|BernieSanders)\/status\/\d+$/;
const PRESS_RELEASE = /^https:\/\/www\.sanders\.senate\.gov\/press-releases\/[a-z0-9-]+\/$/;

const vocab = await import(path.join(root, 'netlify/lib/stance-topic-vocab.mjs'));
const { RELATED_ISSUE_KEYS } = await import(path.join(root, 'netlify/lib/related-issue-keys.mjs'));

console.log('stance ground truth: Sanders × wealth inequality and tax fairness');

t('file exists in db/', () => assert.ok(existsSync(file), 'missing ' + file));
const rec = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
const sources = Array.isArray(rec.sources) ? rec.sources : [];
const clear = sources.filter((s) => s.takes_clear_position === true);

t('every required field present', () => {
  for (const k of REQUIRED) assert.ok(k in rec, 'missing field ' + k);
});
t('identity is sanders × ' + KEY + ', an existing key in the register and related-issues map', () => {
  assert.equal(rec.politician_id, 'sanders');
  assert.equal(rec.topic, KEY);
  assert.equal(vocab.ISSUE_TOPIC_LABELS[KEY], "Wealth Inequality & Tax Fairness");
  assert.ok(RELATED_ISSUE_KEYS.includes(KEY), KEY + ' must be in the related-issues map');
  assert.ok(readFileSync(path.join(root, 'issue-map.js'), 'utf8').includes("Make the wealthiest households and largest corporations pay a fairer share of taxes"), 'issue-map chip text');
  assert.equal(rec.stance_id, 'sanders|wealth_inequality_tax_fairness|gt-105');
});
t('the key is a register key with its own pole, not a grouping, no-pole or directional-only key', () => {
  assert.ok(!(vocab.GROUPING_ISSUE_KEYS || []).includes(KEY), KEY + ' is a grouping key');
  assert.ok(!(KEY in (vocab.DIRECTIONAL_ISSUE_KEYS || {})), KEY + ' is a directional-only key');
  assert.ok(!(vocab.ISSUE_TOPIC_VOCAB[KEY] || {}).noPole, KEY + ' has no pole');
});
t('politician_id is the roster id already used for Bernie Sanders', () => {
  // The existing locked Sanders records in the Talarico file use the same id.
  const tal = JSON.parse(readFileSync(path.join(root, 'db/stance-ground-truth-talarico-cost-of-living.json'), 'utf8'));
  const prior = (tal.additional_records || []).filter((r) => r.politician_id === rec.politician_id);
  assert.ok(prior.length > 0, 'no earlier record uses ' + rec.politician_id);
  assert.ok(prior.every((r) => r.stance_id.startsWith('sanders|')));
  assert.ok(!prior.some((r) => r.topic === KEY), 'an earlier Sanders record already covers ' + KEY);
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
  assert.equal(rec.position, 'support');
  assert.ok(typeof rec.position_on === 'string' && rec.position_on.startsWith("the key's own pole"));
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
    for (const k of SOURCE_FIELDS) assert.ok(k in s, `source ${i}: missing ${k}`);
    assert.ok(typeof s.type === 'string' && s.type.trim(), `source ${i}: type`);
    assert.match(s.date || '', ISO, `source ${i}: date format`);
    assert.ok(URL_RE.test(s.link || ''), `source ${i}: link`);
    assert.ok(typeof s.excerpt === 'string' && /"[^"]+"/.test(s.excerpt), `source ${i}: quoted excerpt`);
    assert.ok(typeof s.note === 'string' && s.note.trim(), `source ${i}: note`);
    assert.ok(WEIGHTS.includes(s.weight), `source ${i}: weight`);
    assert.equal(typeof s.takes_clear_position, 'boolean', `source ${i}: takes_clear_position`);
  }
});
t('every link is direct: a single press release or post, not a listing or search page', () => {
  for (const s of sources) {
    const u = new URL(s.link);
    if (u.hostname.endsWith('sanders.senate.gov')) assert.match(s.link, PRESS_RELEASE, s.link);
  }
  assert.equal(new Set(sources.map((s) => s.link)).size, sources.length, 'a source is listed twice');
});
t('only Sanders\'s own pages or posts; no secondary sources and no votes', () => {
  for (const s of sources) {
    const u = new URL(s.link);
    assert.ok(FIRST_PARTY_HOSTS.includes(u.hostname), `not first-party: ${s.link}`);
    if (u.hostname === 'x.com' || u.hostname === 'twitter.com') assert.match(s.link, OWN_X, `not his own X account: ${s.link}`);
    assert.ok(/press release|social media post|campaign site|issue page/i.test(s.type), `not a first-party source type: ${s.type}`);
    assert.ok(!/vote|roll.?call|journal|cosponsor|news(?!letter)|interview|report|op-ed/i.test(s.type), `vote/secondary type not allowed: ${s.type}`);
    assert.ok(!/\/in-the-news\/|\/op-eds\/|senate\.gov\/legislative|congress\.gov|govinfo|govtrack|votesmart|ballotpedia|voterecord/i.test(s.link), `vote/secondary link: ${s.link}`);
  }
});
t('his own words take the position this record files', () => {
  assert.ok(clear.some((s) => /finally pay their fair share of taxes/.test(s.excerpt)), 'expected excerpt /finally pay their fair share of taxes/');
  assert.ok(clear.some((s) => /It is time to enact a wealth tax on billionaires/.test(s.excerpt)), 'expected excerpt /It is time to enact a wealth tax on billionaires/');
  assert.ok(clear.some((s) => /We must demand that they pay their fair share of taxes/.test(s.excerpt)), 'expected excerpt /We must demand that they pay their fair share of taxes/');
});
t('the stated position rests on at least one source that takes a clear position', () => {
  if (rec.position === 'no clear position') return;
  assert.ok(sources.some((s) => s.takes_clear_position === true && s.weight === 'strong'));
});
t('a mention-only source is never counted as a clear position', () => {
  for (const s of sources) if (s.weight === 'mention') assert.equal(s.takes_clear_position, false, s.link);
});
const EARLIER = {
  'stance-ground-truth-abbott-cost-of-living.json': 'e9a6e4be9effbe91c3bdfc97d3bb4e153e0f163186732f6fdb063f6949d836cf',
  'stance-ground-truth-expansion-2026-11.json': '4eeb1f60ecdd94e18a01d54430968ada32207b2a7b1b3809df607742cfb53a80',
  'stance-ground-truth-hinojosa-cost-of-living.json': '9397cfb8f705b6dd64ad5df0c91a95913cd07d4db0b373f29f0cab5213598053',
  'stance-ground-truth-massie-abolish-education.json': 'e723504fddceb10719849c12096277cf9bfc6648949f6e1891f6fb5a4fe0fe79',
  'stance-ground-truth-massie-abortion.json': '45e5aa7749bd2700a965426569881ade0bf4ded40da6bc44397daa0875f2fc74',
  'stance-ground-truth-massie-border.json': '45b8488ec7da62d70091a8c1bc889fd590cba5c70f0afb192911edc83b230e3b',
  'stance-ground-truth-massie-cbdc.json': 'c48cb054640eb225b5eb0cfe08f9d67bf73c74ba1c3c5c709e2251384300382d',
  'stance-ground-truth-massie-checks-on-executive.json': '8f22406d10b92a790c112bb521cbb57d3e9a6bb3d1cddc83d0c7601f8efe3b73',
  'stance-ground-truth-massie-disclosure.json': '27cb38ee6dc3bc4f8ce630fdb2929b23435488aa21d50c9deabbf730e056d733',
  'stance-ground-truth-massie-earmarks.json': 'f8337f5ae433cd0e3c68215fa4a11faeb2e69b8c919ab349ce0f4f8c5619edeb',
  'stance-ground-truth-massie-epstein-files.json': 'dd6bcc4fade9e459dae53ac3067598e272949cad94c94d1f66b3f9f0e179de8c',
  'stance-ground-truth-massie-federal-reserve.json': 'a7c38d82ddf1a58834e89d4f834277a1f43631b04a1c07c278c158396610f818',
  'stance-ground-truth-massie-federal-spending.json': '55cfee5649f6b8ffeeaf144f78c88451af700977cbb1b1fdc7dfc735d93c764d',
  'stance-ground-truth-massie-food-freedom.json': '88cb90b20013e62b4b4036ca618cafeb919dc1a1adc92f0b64fdd3fcd2434777',
  'stance-ground-truth-massie-foreign-aid.json': 'a0dc7c317cfeca2dd6eeac317df5ecf1a18555b0abb6f34c073741a8d33f4c5f',
  'stance-ground-truth-massie-free-speech.json': 'a4446c18a21d307ec0b1de2642970b697aad95207ac897c8686c0505212c2f68',
  'stance-ground-truth-massie-medical-freedom.json': 'd735b222602b852cb9388ae6f6f02628fe69f1864243efa97a37e33b5a3c138b',
  'stance-ground-truth-massie-school-choice.json': 'cc90cca945c3751e24857ea02a81010595bc52aeb5adb8c492fcd56fd5bbc876',
  'stance-ground-truth-massie-second-amendment.json': 'eb64045e7defb46345821864b524d93b7d8d868caa08de1e3e87376e95282a75',
  'stance-ground-truth-massie-surveillance.json': '04f545a35f16495ea8ea2ad3ee8dde5cbfcf5b63445ef6adc60d33b71109f92d',
  'stance-ground-truth-massie-tariff-authority.json': '5e0f515b5600720100d1831ccbec9f3c4de2b43a38570035227971ccf123e91b',
  'stance-ground-truth-talarico-cost-of-living.json': 'f2889f2a8e30dbae8f4bd099719ed2c53f290a9fb1a017ca0a3601b46da59586',
};
for (const [f, want] of Object.entries(EARLIER)) {
  t(`earlier ground-truth file ${f} is byte-for-byte unchanged`, () => {
    const h = createHash('sha256').update(readFileSync(path.join(root, 'db', f))).digest('hex');
    assert.equal(h, want);
  });
}
t('every earlier ground-truth file is still present alongside this one', () => {
  const all = readdirSync(path.join(root, 'db')).filter((n) => /^stance-ground-truth-.*\.json$/.test(n));
  for (const f of [...Object.keys(EARLIER), FILE_NAME]) assert.ok(all.includes(f), 'missing ' + f);
});
t('the service worker is untouched by this record', () => {
  const p = path.join(root, 'sw.js');
  if (existsSync(p)) assert.ok(!readFileSync(p, 'utf8').includes('stance-ground-truth-sanders'));
});
t('no live code reads the new benchmark file', () => {
  for (const f of ['netlify/lib/raw-ingest-core.mjs', 'netlify/functions/raw-ingest-cron.mts', 'netlify/lib/stance-score-core.mjs', 'sw.js']) {
    const p = path.join(root, f);
    if (!existsSync(p)) continue;
    assert.ok(!readFileSync(p, 'utf8').includes('stance-ground-truth-sanders'), `${f} must not read the new ground-truth file`);
  }
});

if (failures) { console.error(`${failures} failing`); process.exit(1); }
console.log('stance ground truth (Sanders wealth inequality and tax fairness): all checks pass');
