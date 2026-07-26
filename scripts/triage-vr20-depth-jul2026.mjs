#!/usr/bin/env node
/**
 * Triage the 20 newly-unlocked Voting Record members — Jul 2026
 * ─────────────────────────────────────────────────────────────
 * Read-only. Ranks the 20 by how much real content each already carries, so a
 * depth pass can start with the strongest and honestly leave the thin ones thin.
 *
 * Per member it reports:
 *   stances      curated ISSUE_STANCE_DATA cards (and how many lack issueKey /
 *                lack a source — the two "clear gap" categories)
 *   evidence     ACCT_SPOTLIGHT items keyed to the pid (Connected Evidence)
 *   cards        nested spotlight cards that name them
 *   votes        roll-call rows the voting-record migrations write for the slug
 *   promises     tracked promise ledger entries + resolved (kept+broken) count
 *
 *   node scripts/triage-vr20-depth-jul2026.mjs
 */
import fs from 'fs';
import path from 'path';
import vm from 'vm';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);

const IDS = [
  'bennie_thompson', 'bruce_westerman', 'don_davis', 'frank_lucas', 'josh_brecheen',
  'julie_fedorchak', 'mariannette_miller_meeks', 'michael_guest', 'mike_collins',
  'mike_ezell', 'mike_flood', 'mike_simpson', 'rick_crawford', 'rob_bresnahan',
  'ryan_mackenzie', 'scott_perry', 'stephanie_bice', 'steve_womack', 'trent_kelly',
  'troy_downing',
];

// ── Load every data shard index.html loads, in a sandbox ────────────────────
function loadWindow() {
  const ctx = { console };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
  ctx.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  ctx.navigator = { userAgent: 'node' };
  ctx.location = { href: '', search: '', hash: '' };
  ctx.document = { addEventListener() {}, querySelectorAll: () => [], readyState: 'complete' };
  const sandbox = vm.createContext(ctx);
  const indexSrc = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const re = /<script[^>]*\bsrc="([^"]+\.js)"/g;
  const files = [];
  let m;
  while ((m = re.exec(indexSrc))) {
    let f = m[1].replace(/^\//, '');
    if (files.includes(f)) continue;
    if (!/stances|cmp-data|spotlight/.test(f)) continue;
    if (f === 'my-stances.js' || f === 'spotlight-hub.js') continue;
    if (!fs.existsSync(path.join(ROOT, f))) continue;
    files.push(f);
  }
  for (const f of files) {
    try {
      vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f });
    } catch (e) {
      console.error('  ! skipped ' + f + ': ' + e.message);
    }
  }
  return { ctx, files };
}

const { ctx, files } = loadWindow();
const STANCES = ctx.ISSUE_STANCE_DATA || {};
const ROSTER = ctx.CMP_DATA || {};
const EVIDENCE = ctx.ACCT_SPOTLIGHT || {};
const SPOTLIGHTS = Object.assign({}, ctx.SPOTLIGHTS || {}, ctx.SPOTLIGHT_CARDS || {});

// ── Nested spotlight cards that name a pid ──────────────────────────────────
function cardMentions(id) {
  const src = JSON.stringify(SPOTLIGHTS);
  let n = 0;
  const needle = '"' + id + '"';
  let i = 0;
  while ((i = src.indexOf(needle, i)) !== -1) { n++; i += needle.length; }
  return n;
}

// ── Roll-call rows the migrations write for a slug ──────────────────────────
const MIGDIR = path.join(ROOT, 'netlify/database/migrations');
const MIGS = fs.readdirSync(MIGDIR).filter((f) => f.endsWith('.sql'))
  .map((f) => fs.readFileSync(path.join(MIGDIR, f), 'utf8'));
function voteRows(id) {
  let n = 0;
  for (const src of MIGS) {
    const re = new RegExp("'" + id + "'", 'g');
    n += (src.match(re) || []).length;
  }
  return n;
}

console.log('data shards loaded: ' + files.length);
console.log('');

const rows = IDS.map((id) => {
  const cards = STANCES[id] || [];
  const rec = ROSTER[id] || {};
  const promises = Array.isArray(rec.promises) ? rec.promises : [];
  const resolved = promises.filter((p) => p.verdict === 'kept' || p.verdict === 'broken').length;
  const noKey = cards.filter((c) => !c.issueKey).length;
  const noSrc = cards.filter((c) => !c.source || !c.source.url).length;
  const ev = (EVIDENCE[id] || []).length;
  const evNoKey = (EVIDENCE[id] || []).filter((e) => !e.issueKey).length;
  const votes = voteRows(id);
  const mentions = cardMentions(id);
  // richness: stance cards and evidence weigh most; votes are a floor everyone has
  const richness = cards.length * 3 + ev * 4 + mentions * 2 + Math.min(votes, 60) / 4;
  return { id, cards: cards.length, noKey, noSrc, ev, evNoKey, mentions, votes, promises: promises.length, resolved, richness };
});

rows.sort((a, b) => b.richness - a.richness);

const pad = (s, n) => String(s).padEnd(n);
const lpad = (s, n) => String(s).padStart(n);
console.log(pad('id', 26) + lpad('cards', 6) + lpad('noKey', 6) + lpad('noSrc', 6) +
            lpad('evid', 6) + lpad('evNoK', 6) + lpad('menti', 6) + lpad('votes', 6) +
            lpad('prom', 6) + lpad('rslvd', 6) + lpad('rich', 7));
console.log('-'.repeat(87));
for (const r of rows) {
  console.log(pad(r.id, 26) + lpad(r.cards, 6) + lpad(r.noKey, 6) + lpad(r.noSrc, 6) +
              lpad(r.ev, 6) + lpad(r.evNoKey, 6) + lpad(r.mentions, 6) + lpad(r.votes, 6) +
              lpad(r.promises, 6) + lpad(r.resolved, 6) + lpad(r.richness.toFixed(1), 7));
}
console.log('');
console.log('with a real Promise Score (resolved > 0): ' + rows.filter((r) => r.resolved > 0).length + ' / ' + rows.length);
console.log('missing issueKey on at least one card: ' + rows.filter((r) => r.noKey > 0).map((r) => r.id).join(', '));
console.log('unsourced stance card(s):              ' + rows.filter((r) => r.noSrc > 0).map((r) => r.id + '(' + r.noSrc + ')').join(', '));
console.log('zero connected evidence:               ' + rows.filter((r) => r.ev === 0).map((r) => r.id).join(', '));
