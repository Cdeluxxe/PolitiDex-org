#!/usr/bin/env node
// test-raw-ingest-suggestions.mjs — the raw-ingest suggestions log and its
// curator view (/admin/suggestions).
//   · A real run (the scheduled wrapper around the unchanged `run`) that finds a
//     new URL and a cross-topic support/oppose score writes both to the log.
//   · Repeats are not re-suggested; a source that keeps failing is; a scorer key
//     missing from the related-issues map is; each type is capped (oldest dropped), 400 overall.
//   · The API serves the entries newest first only to the curator's verified
//     Firebase token, and the page renders them when signed in as the curator.
//   · The generated related-issues key list matches related-issues.js.
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const imp = (p) => import(pathToFileURL(path.join(root, p)).href);
const sug = await imp('netlify/lib/raw-ingest-suggestions.mjs');
const cron = await imp('netlify/functions/raw-ingest-cron.mts');
const core = await imp('netlify/lib/raw-ingest-core.mjs');
const api = await imp('netlify/functions/raw-ingest-suggestions.mts');
const auth = await imp('netlify/lib/admin-auth.mjs');
const { RELATED_ISSUE_KEYS } = await imp('netlify/lib/related-issue-keys.mjs');
const { relatedIssueKeysFromSource } = await imp('scripts/gen-related-issue-keys.mjs');

let failures = 0, passed = 0;
const t = async (name, fn) => {
  try { await fn(); passed++; console.log('  ✓', name); }
  catch (e) { failures++; console.error('  ✗', name, '\n    ', e.message); }
};
const quiet = async (fn) => {
  const orig = console.log; const lines = [];
  console.log = (...a) => lines.push(a.join(' '));
  try { return { value: await fn(), lines }; } finally { console.log = orig; }
};
const memStore = () => {
  const data = new Map();
  return { data,
    async get(k) { return data.has(k) ? JSON.parse(JSON.stringify(data.get(k))) : null; },
    async setJSON(k, v) { data.set(k, JSON.parse(JSON.stringify(v))); } };
};
const page = (status, body) => async (url) => ({ ok: status >= 200 && status < 300, status, url, headers: new Map([['content-type', 'text/html']]), text: async () => body });
const NOW = () => new Date('2026-11-13T16:00:00.000Z');
const CORNYN_URL = 'https://www.cornyn.senate.gov/issues/health-care/';
const MULTI_HTML = '<html><body><h1>Issues</h1>'
  + '<p>In the Senate, he will fight to lower prescription drug costs and cap insulin co-pays.</p>'
  + '<p>We will reduce insurance premiums for Texas families.</p>'
  + '<p>I will secure the border and finish the wall.</p>'
  + '<p>We must end catch and release.</p>'
  + '<p>We will crack down on the cartels.</p>'
  + '<p>I will raise teacher pay and fully fund our public schools.</p></body></html>';

// One run: Cornyn's configured page (carries cross-topic positions) + discovery
// of his known key-issue page (answers as a stable page → "discovery: NEW").
const runOnce = (suggestionsStore, { fetch = page(200, MULTI_HTML), now = NOW } = {}) => quiet(() => cron.scheduled({
  fetch, store: memStore(), lockerStore: memStore(), rotationStore: memStore(), suggestionsStore, now,
  rotate: false, discover: true, sources: core.SOURCES.filter((s) => s.url === CORNYN_URL),
}));

await t('a run that finds a new URL and a cross-topic score writes both to the suggestions log', async () => {
  const st = memStore();
  const { value: res, lines } = await runOnce(st);
  assert.equal(res.status, 200, 'the run itself is untouched');
  assert.ok(lines.some((l) => l.startsWith('discovery: NEW ')), 'the run logged a discovery: NEW line');
  const doc = st.data.get(sug.SUGGESTIONS_KEY);
  assert.ok(doc, 'the suggestions document is written');
  const urls = doc.entries.filter((e) => e.type === 'url');
  const scores = doc.entries.filter((e) => e.type === 'score');
  assert.ok(urls.some((e) => e.details.url === 'https://www.cornyn.senate.gov/key-issues/health-care/' && e.details.politician_id === 'john_cornyn'), 'the discovered URL is logged');
  assert.ok(scores.length >= 1, 'a cross-topic score is logged');
  for (const e of [...urls, ...scores]) {
    assert.match(e.ts, /^\d{4}-\d\d-\d\dT/);
    assert.ok(sug.SUGGESTION_TYPES.includes(e.type));
  }
  for (const e of scores) {
    for (const k of ['politician_id', 'topic', 'position', 'confidence', 'url']) assert.ok(k in e.details, `score carries ${k}`);
    assert.ok(['support', 'oppose'].includes(e.details.position));
    assert.notEqual(e.details.topic, 'healthcare_costs', 'cross-topic only (not the page\'s own topic)');
    assert.ok([CORNYN_URL, 'https://www.cornyn.senate.gov/key-issues/health-care/'].includes(e.details.url), 'cites the page it was scored on');
  }
  assert.ok(scores.some((e) => e.details.topic === 'border_security' && e.details.position === 'support'));
  assert.ok(lines.some((l) => l.startsWith('raw-ingest-suggestions: ')), 'one summary line in the function log');
  // The same run again suggests nothing new.
  const before = st.data.get(sug.SUGGESTIONS_KEY).entries.length;
  await runOnce(st);
  assert.equal(st.data.get(sug.SUGGESTIONS_KEY).entries.length, before, 'repeats are not re-suggested every minute');
});

await t('the run is unchanged: same report with or without the suggestions log, and a broken log store never breaks it', async () => {
  const deps = { fetch: page(200, MULTI_HTML), store: memStore(), lockerStore: memStore(), now: NOW, discover: true, sources: core.SOURCES.filter((s) => s.url === CORNYN_URL) };
  const { value: a } = await quiet(() => cron.run({ ...deps, log: () => {} }));
  const broken = { async get() { throw new Error('boom'); }, async setJSON() { throw new Error('boom'); } };
  const { value: b, lines } = await quiet(() => cron.scheduled({ ...deps, store: memStore(), lockerStore: memStore(), rotationStore: memStore(), rotate: false, suggestionsStore: broken }));
  const ra = await a.json(), rb = await b.json();
  assert.equal(a.status, b.status);
  for (const k of ['ok', 'discovered', 'included', 'locker_writes', 'topics']) assert.deepEqual(rb[k], ra[k], `report.${k} unchanged`);
  assert.ok(lines.some((l) => l.startsWith('raw-ingest-suggestions: not written')));
});

await t('a source that keeps failing is logged once per streak; a success resets it', () => {
  let doc = null;
  const fail = { results: [{ ok: false, url: 'https://dead.example.gov/x', error: 'HTTP 404' }] };
  const okr = { results: [{ ok: true, url: 'https://dead.example.gov/x' }] };
  for (let i = 0; i < sug.FAIL_THRESHOLD - 1; i++) doc = sug.foldRun(doc, { report: fail }).doc;
  assert.equal(doc.entries.length, 0, 'not yet a pattern');
  let r = sug.foldRun(doc, { report: fail });
  assert.equal(r.added.length, 1);
  assert.deepEqual([r.added[0].type, r.added[0].details.consecutive_failures, r.added[0].details.last_error], ['fail', sug.FAIL_THRESHOLD, 'HTTP 404']);
  r = sug.foldRun(r.doc, { report: fail });
  assert.equal(r.added.length, 0, 'once per streak');
  doc = sug.foldRun(r.doc, { report: okr }).doc;
  assert.ok(!doc.fails['https://dead.example.gov/x'], 'a success resets the streak');
});

await t('a scorer key the related-issues map does not name is logged once; mapped keys are not', () => {
  const line = (topic, position = 'support') => `stance-score: cross-topic candidate ${JSON.stringify({ politician_id: 'p', topic, page_topic: 'cost_living', url: 'https://p.example.gov/', position, confidence: 0.6 })}`;
  const own = `stance-score: candidate ${JSON.stringify({ politician_id: 'p', topic: 'brand_new_key', position: 'no clear position' })}`;
  let r = sug.foldRun(null, { lines: [line('border_security', 'no clear position'), own] });
  assert.deepEqual(r.added.map((e) => [e.type, e.details.key]), [['key', 'brand_new_key']], 'only the unmapped key; a no-clear-position score is not a suggestion');
  r = sug.foldRun(r.doc, { lines: [own] });
  assert.equal(r.added.length, 0);
  // A score whose position flips is suggested again, with the previous position.
  r = sug.foldRun(r.doc, { lines: [line('border_security', 'support')] });
  r = sug.foldRun(r.doc, { lines: [line('border_security', 'oppose')] });
  assert.equal(r.added[0].details.previous_position, 'support');
});

const urlLine = (i) => `discovery: NEW p|cost_living https://p.example.gov/${i} (official page) — added to this run's pull list`;
const scoreLine = (pid, topic, position, url = `https://${pid}.example.gov/`) => `stance-score: cross-topic candidate ${JSON.stringify({ politician_id: pid, topic, page_topic: 'cost_living', url, position, confidence: 0.6 })}`;

await t('each type keeps at most its own cap (oldest of that type dropped); overall limit 400', () => {
  assert.deepEqual(sug.TYPE_CAPS, { url: 100, score: 200, key: 50, fail: 50 });
  assert.equal(sug.MAX_ENTRIES, 400);
  let doc = null;
  for (let i = 0; i < sug.TYPE_CAPS.url + 40; i++) {
    doc = sug.foldRun(doc, { lines: [urlLine(i)], now: new Date(Date.UTC(2026, 10, 1, 0, i)) }).doc;
  }
  assert.equal(doc.entries.length, sug.TYPE_CAPS.url, 'url entries stop at their cap');
  assert.equal(doc.entries[0].details.url, 'https://p.example.gov/40', 'the oldest urls were dropped');
  const recent = sug.recentEntries(doc, { limit: 3 });
  assert.deepEqual(recent.map((e) => e.details.url), [0, 1, 2].map((d) => sug.TYPE_CAPS.url + 39 - d).map((i) => `https://p.example.gov/${i}`), 'newest first');
  // A flood of one type never pushes out another.
  doc = sug.foldRun(doc, { lines: [scoreLine('keep', 'climate_action', 'support')], report: {} }).doc;
  for (let i = 0; i < 300; i++) doc = sug.foldRun(doc, { lines: [scoreLine(`p${i}`, 'border_security', 'oppose')] }).doc;
  for (let i = 0; i < 80; i++) doc = sug.foldRun(doc, { lines: [`stance-score: candidate ${JSON.stringify({ politician_id: 'x', topic: `new_key_${i}`, position: 'no clear position' })}`] }).doc;
  for (let i = 0; i < 80; i++) for (let j = 0; j < sug.FAIL_THRESHOLD; j++) doc = sug.foldRun(doc, { report: { results: [{ ok: false, url: `https://dead${i}.example.gov/`, error: 'HTTP 404' }] } }).doc;
  const n = (ty) => doc.entries.filter((e) => e.type === ty).length;
  for (const ty of sug.SUGGESTION_TYPES) assert.equal(n(ty), sug.TYPE_CAPS[ty], `${ty}: ${n(ty)} kept, cap ${sug.TYPE_CAPS[ty]}`);
  assert.equal(n('url'), sug.TYPE_CAPS.url, 'urls survive the score / key / fail floods');
  assert.ok(doc.entries.length <= sug.MAX_ENTRIES);
  assert.ok(!doc.entries.some((e) => e.details.politician_id === 'keep'), 'the oldest score went first');
  // The overall limit drops the oldest across types.
  const mk = (type, i) => ({ ts: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString(), type, details: { i } });
  const mixed = Array.from({ length: 12 }, (_, i) => mk(['url', 'score', 'key', 'fail'][i % 4], i));
  const pruned = sug.pruneEntries(mixed, { caps: { url: 2, score: 5, key: 5, fail: 5 }, max: 6 });
  assert.equal(pruned.length, 6);
  assert.deepEqual(pruned.map((e) => e.details.i), [6, 7, 8, 9, 10, 11], 'oldest dropped across all types');
  assert.ok(pruned.filter((e) => e.type === 'url').length <= 2);
});

await t('a score is logged once per politician + topic; again only when the position flips, with the previous position', () => {
  let r = sug.foldRun(null, { lines: [scoreLine('p', 'climate_action', 'support')] });
  assert.equal(r.added.length, 1);
  // Later runs: same pair + position, from the same page or another page — never again.
  for (let i = 0; i < 5; i++) {
    r = sug.foldRun(r.doc, { lines: [scoreLine('p', 'climate_action', 'support'), scoreLine('p', 'climate_action', 'support', `https://p.example.gov/other-${i}`)] });
    assert.equal(r.added.length, 0, `run ${i}: the same score does not reappear`);
  }
  // A cross-topic read from ANOTHER page never rewrites the held stance.
  r = sug.foldRun(r.doc, { lines: [scoreLine('p', 'climate_action', 'oppose', 'https://p.example.gov/new')] });
  assert.equal(r.added.length, 0, 'a conflicting cross-topic page does not rewrite the held stance');
  assert.equal(r.held.length, 1);
  assert.equal(r.doc.seen.score['p|climate_action'].position, 'support');
  // The same page re-read with a new position is a real flip.
  r = sug.foldRun(r.doc, { lines: [scoreLine('p', 'climate_action', 'oppose')] });
  assert.equal(r.added.length, 1, 'a flip on the same page is logged');
  assert.deepEqual([r.added[0].details.position, r.added[0].details.previous_position], ['oppose', 'support']);
  r = sug.foldRun(r.doc, { lines: [scoreLine('p', 'climate_action', 'oppose')] });
  assert.equal(r.added.length, 0, 'the flipped position is not repeated');
  assert.equal(r.doc.entries.filter((e) => e.type === 'score').length, 2);
  // A doc written by the older per-URL dedupe keeps its memory.
  const old = { entries: [], seen: { url: {}, key: {}, score: { 'q|tax_middle_class|https://q.example.gov/a': 'support', 'q|tax_middle_class|https://q.example.gov/b': 'oppose' } } };
  r = sug.foldRun(old, { lines: [scoreLine('q', 'tax_middle_class', 'oppose', 'https://q.example.gov/c')] });
  assert.equal(r.added.length, 0, 'an already-logged pair is not re-logged after the upgrade');
  assert.equal(r.doc.seen.score['q|tax_middle_class'].url, 'https://q.example.gov/c', 'the older stance adopts the agreeing source');
  r = sug.foldRun(r.doc, { lines: [scoreLine('q', 'tax_middle_class', 'support')] });
  assert.equal(r.added.length, 0, 'another cross-topic page does not flip it');
  r = sug.foldRun(r.doc, { lines: [scoreLine('q', 'tax_middle_class', 'support', 'https://q.example.gov/c')] });
  assert.equal(r.added[0].details.previous_position, 'oppose');
});

await t('cross-topic thrash: two issue pages scored onto one topic do not flip it back and forth (Doggett social_security)', () => {
  const ECON = 'https://doggett.house.gov/issues/growing-our-economy-0', HEALTH = 'https://doggett.house.gov/issues/healthcare-0';
  const cross = (page_topic, url, position) => `stance-score: cross-topic candidate ${JSON.stringify({ politician_id: 'lloyd_doggett', topic: 'social_security', page_topic, url, position, confidence: 0.8 })}`;
  let r = sug.foldRun(null, { lines: [cross('cost_living', ECON, 'oppose')] });
  assert.equal(r.added.length, 1);
  for (let i = 0; i < 10; i++) {
    r = sug.foldRun(r.doc, { lines: [cross('healthcare_costs', HEALTH, 'support')] });
    assert.equal(r.added.length, 0, `minute ${i}: the healthcare page does not rewrite it`);
    r = sug.foldRun(r.doc, { lines: [cross('cost_living', ECON, 'oppose')] });
    assert.equal(r.added.length, 0, `minute ${i}: nothing to re-log`);
  }
  assert.equal(r.doc.entries.filter((e) => e.type === 'score').length, 1, 'one record, no flip-flop');
  assert.equal(r.doc.seen.score['lloyd_doggett|social_security'].url, ECON);
  // An on-topic read (a page filed under the topic) outranks the cross-topic one, silently …
  const own = (url, position, confidence = 0.85) => `stance-score: candidate ${JSON.stringify({ politician_id: 'lloyd_doggett', topic: 'social_security', url, position, confidence })}`;
  r = sug.foldRun(r.doc, { lines: [own('https://doggett.house.gov/issues/social-security', 'support')] });
  assert.equal(r.added.length, 0);
  assert.deepEqual([r.doc.seen.score['lloyd_doggett|social_security'].position, r.doc.seen.score['lloyd_doggett|social_security'].on_topic], ['support', true]);
  // … and no cross-topic read rewrites it afterwards, not even the earlier page.
  r = sug.foldRun(r.doc, { lines: [cross('cost_living', ECON, 'oppose')] });
  assert.equal(r.added.length, 0);
  assert.equal(r.doc.seen.score['lloyd_doggett|social_security'].position, 'support');
  // A weaker on-topic page does not rewrite a stronger one.
  r = sug.foldRun(r.doc, { lines: [own('https://doggett.house.gov/other', 'oppose', 0.7)] });
  assert.equal(r.doc.seen.score['lloyd_doggett|social_security'].position, 'support');
  assert.equal(sug.shouldReplaceStance(null, { url: 'x' }), true);
});

await t('a url is logged once, never again', () => {
  let doc = sug.foldRun(null, { lines: [urlLine('once')] }).doc;
  for (let i = 0; i < sug.TYPE_CAPS.url + 10; i++) doc = sug.foldRun(doc, { lines: [urlLine(i)] }).doc;
  // Pruned from the visible log, but still remembered.
  assert.ok(!doc.entries.some((e) => e.details.url === 'https://p.example.gov/once'));
  const r = sug.foldRun(doc, { lines: [urlLine('once'), urlLine('ONCE'.toLowerCase())] });
  assert.equal(r.added.length, 0);
});

await t('the generated related-issues key list matches related-issues.js', () => {
  assert.deepEqual(RELATED_ISSUE_KEYS, relatedIssueKeysFromSource(readFileSync(path.join(root, 'related-issues.js'), 'utf8')), 'run node scripts/gen-related-issue-keys.mjs');
});

// ── The curator view ──
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const PEM = publicKey.export({ type: 'spki', format: 'pem' });
const KID = 'test-kid';
const authOpts = { getCerts: async () => ({ [KID]: PEM }) };
const token = (claims = {}) => {
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const body = `${enc({ alg: 'RS256', kid: KID, typ: 'JWT' })}.${enc({ aud: auth.FIREBASE_PROJECT_ID, iss: `https://securetoken.google.com/${auth.FIREBASE_PROJECT_ID}`, sub: 'uid1', exp: now + 600, email: 'Cdeluxxe@gmail.com', ...claims })}`;
  return `${body}.${crypto.sign('RSA-SHA256', Buffer.from(body), privateKey).toString('base64url')}`;
};
const call = (tok, qs = '') => api.handle(new Request(`https://politidex.fyi/api/admin/raw-ingest-suggestions${qs}`, { headers: tok ? { authorization: `Bearer ${tok}` } : {} }), { store: SHARED, auth: authOpts });
const SHARED = memStore();

await t('the API serves the entries newest first, only to the curator account', async () => {
  await runOnce(SHARED);
  assert.equal((await call(null)).status, 401, 'no token');
  assert.equal((await call('a.b.c')).status, 401, 'bad token');
  assert.equal((await call(token({ exp: 1 }))).status, 401, 'expired token');
  assert.equal((await call(token({ email: 'someone@example.com' }))).status, 403, 'another account');
  const forged = token().split('.'); forged[1] = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(forged[1], 'base64url')), email: 'cdeluxxe@gmail.com', sub: 'x' })).toString('base64url');
  assert.equal((await call(forged.join('.'))).status, 401, 'a tampered token fails the signature');
  const res = await call(token());
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  const body = await res.json();
  assert.ok(body.entries.length >= 2);
  const ts = body.entries.map((e) => e.ts);
  assert.deepEqual(ts, [...ts].sort().reverse(), 'newest first');
  assert.ok(body.entries.some((e) => e.type === 'url') && body.entries.some((e) => e.type === 'score'));
  const onlyScores = await (await call(token(), '?type=score')).json();
  assert.ok(onlyScores.entries.length && onlyScores.entries.every((e) => e.type === 'score'));
});

// A tiny DOM for the page script.
const makeDom = () => {
  const els = {};
  const el = (id) => (els[id] ||= { id, innerHTML: '', textContent: '', hidden: false, attrs: {}, listeners: {},
    setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k]; },
    addEventListener(t, f) { this.listeners[t] = f; },
    querySelectorAll() { return BUTTONS; } });
  const BUTTONS = ['', 'url', 'score', 'key', 'fail'].map((f) => { const b = el(`btn-${f || 'all'}`); b.attrs['data-filter'] = f; return b; });
  return { els, document: { readyState: 'complete', getElementById: el, addEventListener() {} } };
};
const runPage = async (user) => {
  const dom = makeDom(); let authCb = null; const fetched = [];
  const ctx = {
    document: dom.document,
    auth: { onAuthStateChanged: (cb) => { authCb = cb; } },
    fetch: async (url, opts) => { fetched.push({ url, opts }); const tok = (opts.headers.authorization || '').slice(7); return call(tok); },
    Promise, Date, Array, String, Number, JSON, isNaN, console,
  };
  ctx.window = ctx;
  vm.runInNewContext(readFileSync(path.join(root, 'admin-suggestions.js'), 'utf8'), ctx);
  authCb(user);
  for (let i = 0; i < 20; i++) await new Promise((r) => setImmediate(r));
  return { ...dom, fetched, ctx };
};

await t('the admin page shows the entries when signed in as the curator, newest first', async () => {
  const { els, fetched } = await runPage({ email: 'cdeluxxe@gmail.com', getIdToken: async () => token() });
  assert.equal(fetched[0].url, '/api/admin/raw-ingest-suggestions');
  assert.match(fetched[0].opts.headers.authorization, /^Bearer /, 'sends the Firebase ID token');
  const html = els['sg-list'].innerHTML;
  assert.ok(html.includes('data-type="url"') && html.includes('data-type="score"'), 'both entry types listed');
  assert.ok(html.includes('https://www.cornyn.senate.gov/key-issues/health-care/'), 'the discovered URL is shown');
  assert.ok(/john_cornyn<\/b> · border_security · <span class="sg-pos-support">support<\/span>/.test(html), 'the cross-topic score is shown');
  assert.equal((html.match(/<li /g) || []).length, SHARED.data.get(sug.SUGGESTIONS_KEY).entries.length);
  assert.equal(els['sg-filters'].hidden, false);
  assert.match(els['sg-meta'].textContent, /newest first/);
  // The filter narrows the list.
  els['btn-score'].listeners.click({ currentTarget: els['btn-score'] });
  assert.ok(!els['sg-list'].innerHTML.includes('data-type="url"'));
});

await t('the admin page shows nothing to a guest or another account', async () => {
  const guest = await runPage(null);
  assert.equal(guest.fetched.length, 0);
  assert.equal(guest.els['sg-list'].innerHTML, '');
  const other = await runPage({ email: 'x@example.com', getIdToken: async () => token({ email: 'x@example.com' }) });
  assert.equal(other.fetched.length, 0);
  assert.match(other.els['sg-note'].textContent, /curator account only/);
  // Even a page that skips the client check gets nothing from the server.
  assert.equal((await call(token({ email: 'x@example.com' }))).status, 403);
  // Entry text is escaped.
  const li = other.ctx.PDXAdminSuggestions.renderEntry({ ts: '2026-11-13T00:00:00Z', type: 'key', details: { key: '<img src=x onerror=alert(1)>', note: 'n' } });
  assert.ok(!li.includes('<img'), 'markup in an entry is escaped');
});

await t('page shell: noindex, literal /admin/suggestions route, not precached, not linked from reader pages', () => {
  const html = readFileSync(path.join(root, 'admin-suggestions.html'), 'utf8');
  const toml = readFileSync(path.join(root, 'netlify.toml'), 'utf8');
  assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1/);
  assert.match(html, /src="\/admin-suggestions\.js"/);
  assert.match(html, /src="\/firebase-boot\.js"/, 'the same Firebase login boot as /admin');
  assert.match(toml, /from = "\/admin\/suggestions"\s*\n\s*to = "\/admin-suggestions\.html"\s*\n\s*status = 200/);
  assert.match(toml, /for = "\/admin\/suggestions"\s*\n\s*\[headers\.values\]\s*\n\s*X-Robots-Tag = "noindex, nofollow"/);
  const sw = readFileSync(path.join(root, 'sw.js'), 'utf8');
  assert.ok(!sw.includes('admin-suggestions'), 'not in the service worker');
  assert.match(readFileSync(path.join(root, 'netlify/functions/raw-ingest-suggestions.mts'), 'utf8'), /path: "\/api\/admin\/raw-ingest-suggestions"/);
});

if (failures) { console.error(`${failures} failing`); process.exit(1); }
console.log(`✓ raw-ingest suggestions: ${passed} checks pass`);
