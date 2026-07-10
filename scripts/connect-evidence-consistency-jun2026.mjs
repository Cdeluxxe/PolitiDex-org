#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — June 2026 consistency & connection pass (Firestore).
//
// Operates on the live `politicians` collection that index.html reads at
// runtime. Three jobs, all conservative — nothing is invented, only existing
// human-curated issueKeys are corrected or propagated:
//
//   1. MISMATCH FIXES — three new video Spotlight items whose issueKey did not
//      match the bill's actual subject are re-keyed so the item lands on the
//      issue the member already holds a curated stance for:
//        • carol_spackman_moss  HB295 healthcare    → health_mental
//            (an overdose Good Samaritan / naloxone bill — addiction response)
//        • carol_spackman_moss  HB286 housing_build → housing_support
//            (the Olene Walker AFFORDABLE-housing loan fund — assistance, not
//             supply deregulation)
//        • nate_blouin          SB244 lower_taxes   → gov_services
//            (a SEPARATE, HIGHER rate on income over $1M — a tax INCREASE on top
//             earners, the opposite of a tax cut)
//
//   2. PROMISE issueKey BACKFILL — a promise that cites the same bill number as
//      an already-keyed Spotlight item (or another keyed promise) on the SAME
//      profile inherits that curated issueKey. Exact-bill, same-member matching
//      only; promises that cite no bill, or whose bill has no keyed sibling, are
//      left untouched (reported, not guessed).
//
//   3. SPOTLIGHT issueKey BACKFILL — same exact-bill inheritance for Spotlight
//      items that are missing an issueKey.
//
// Every assigned key is validated against the live ISSUE_MAP catalog read out of
// index.html, so nothing can write a key the Alignment Tool / Stance-at-a-Glance
// surfaces don't understand. Idempotent: re-fetches each doc and only PATCHes a
// field that actually changed.
//
//   node scripts/connect-evidence-consistency-jun2026.mjs           # dry run
//   node scripts/connect-evidence-consistency-jun2026.mjs --apply   # write
// ---------------------------------------------------------------------------

import { readFileSync } from 'fs';

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const STAMP = '2026-06-22T00:00:00.000Z';

// ── valid issueKey set, read from the live ISSUE_MAP in index.html ──────────
function extractObj(html, name) {
  const m = html.indexOf('var ' + name + ' = {');
  if (m < 0) throw new Error('not found ' + name);
  let i = html.indexOf('{', m), depth = 0, inStr = null, esc = false, line = false, block = false;
  for (let j = i; j < html.length; j++) {
    const c = html[j], n = html[j + 1];
    if (line) { if (c === '\n') line = false; continue; }
    if (block) { if (c === '*' && n === '/') { block = false; j++; } continue; }
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === inStr) inStr = null; continue; }
    if (c === '/' && n === '/') { line = true; j++; continue; }
    if (c === '/' && n === '*') { block = true; j++; continue; }
    if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return html.slice(i, j + 1); }
  }
  throw new Error('unbalanced ' + name);
}
const ISSUE_MAP = eval('(' + extractObj(readFileSync('alignment-tool.js', 'utf8'), 'ISSUE_MAP') + ')');
const VALID = new Set(Object.keys(ISSUE_MAP));

// ── Firestore value encoder / decoder ──────────────────────────────────────
function enc(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
  if (typeof v === 'object') {
    const fields = {};
    for (const [k, val] of Object.entries(v)) fields[k] = enc(val);
    return { mapValue: { fields } };
  }
  throw new Error('cannot encode: ' + String(v));
}
function dec(v) {
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return parseInt(v.integerValue, 10);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.nullValue !== undefined) return null;
  if (v.timestampValue !== undefined) return v.timestampValue;
  if (v.arrayValue !== undefined) return (v.arrayValue.values || []).map(dec);
  if (v.mapValue !== undefined) {
    const o = {};
    for (const [k, val] of Object.entries(v.mapValue.fields || {})) o[k] = dec(val);
    return o;
  }
  return null;
}

// ── classification (mirrors validate-legislators.mjs / the site) ────────────
const office = (o) => String(o.office || '');
const isUtahLeg = (o) =>
  /utah/i.test(office(o)) && /(house|senate|representative|senator)/i.test(office(o)) &&
  !/(u\.s\.|congress|governor|attorney general|treasurer|auditor|county|mayor|city council)/i.test(office(o));
const isCurrent = (o) => isUtahLeg(o) && !/former|speaker emeritus/i.test(office(o)) && !/candidate/i.test(office(o));

// Collect every distinct bill number (H.B./S.B./H.R./S.R. + digits) in a text.
const billsOf = (t) => {
  const s = new Set();
  const re = /([HS])\.?\s?([BR])\.?\s?0*(\d{1,4})\b/gi;
  let m;
  while ((m = re.exec(String(t || '')))) s.add((m[1] + m[2] + m[3]).toUpperCase());
  return s;
};

// ── targeted Spotlight issueKey mismatch fixes ──────────────────────────────
// id → [{ bill, from, to, why }] — applied to the Spotlight item that cites
// `bill` and currently carries `from`.
const REKEY = {
  carol_spackman_moss: [
    { bill: 'HB295', from: 'healthcare',    to: 'health_mental',   why: 'overdose Good Samaritan / naloxone bill — addiction response' },
    { bill: 'HB286', from: 'housing_build', to: 'housing_support', why: 'Olene Walker affordable-housing loan fund — assistance' },
  ],
  nate_blouin: [
    { bill: 'SB244', from: 'lower_taxes',   to: 'gov_services',    why: 'higher rate on income over $1M — a tax increase on top earners' },
  ],
};

async function fetchAll() {
  const out = [];
  let token = null;
  do {
    const url = BASE + '?pageSize=300' + (token ? '&pageToken=' + encodeURIComponent(token) : '');
    const r = await fetch(url);
    if (!r.ok) throw new Error('Firestore HTTP ' + r.status);
    const b = await r.json();
    for (const d of b.documents || []) {
      const rec = { __fields: d.fields || {} };
      for (const [k, v] of Object.entries(d.fields || {})) rec[k] = dec(v);
      rec._id = d.name.split('/').pop();
      out.push(rec);
    }
    token = b.nextPageToken;
  } while (token);
  return out;
}

async function patch(id, fields, changed) {
  if (!APPLY) return;
  fields.updatedAt = enc(STAMP);
  const keys = changed.concat(['updatedAt']);
  const url = `${BASE}/${id}?` + keys.map((k) => 'updateMask.fieldPaths=' + encodeURIComponent(k)).join('&');
  const body = {};
  body.fields = {};
  for (const k of keys) body.fields[k] = fields[k];
  const r = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`PATCH ${id} -> ${r.status} ${await r.text()}`);
}

// ── main ────────────────────────────────────────────────────────────────────
const recs = (await fetchAll()).filter(isCurrent);
console.log(`Current sitting Utah legislators: ${recs.length}\n`);

let nRekey = 0, nPromise = 0, nSpot = 0, nDocs = 0;
const skipped = { promiseNoBill: 0, promiseNoSibling: 0, spotNoBill: 0, spotNoSibling: 0 };

for (const o of recs) {
  const id = o._id;
  let spotlight = Array.isArray(o.spotlight) ? o.spotlight.map((x) => ({ ...x })) : null;
  let promises = Array.isArray(o.promises) ? o.promises.map((x) => ({ ...x })) : null;
  const changed = new Set();
  const log = [];

  // 1) MISMATCH FIXES
  if (spotlight && REKEY[id]) {
    for (const fix of REKEY[id]) {
      for (const it of spotlight) {
        const bills = billsOf((it.headline || '') + ' ' + (it.facts || ''));
        if (bills.has(fix.bill) && it.issueKey === fix.from && VALID.has(fix.to)) {
          it.issueKey = fix.to;
          changed.add('spotlight');
          nRekey++;
          log.push(`    ↻ rekey ${fix.bill}: ${fix.from} → ${fix.to}  (${fix.why})`);
        }
      }
    }
  }

  // Build bill → issueKey index from the (possibly rekeyed) KEYED items.
  const billKey = {};
  const index = (it, textKeys) => {
    if (!it || !it.issueKey || !VALID.has(it.issueKey)) return;
    for (const b of billsOf(textKeys.map((k) => it[k] || '').join(' '))) if (!billKey[b]) billKey[b] = it.issueKey;
  };
  (spotlight || []).forEach((it) => index(it, ['headline', 'facts']));
  (promises || []).forEach((it) => index(it, ['title', 'detail']));

  // 2) PROMISE issueKey BACKFILL (exact-bill inheritance)
  if (promises) {
    for (const p of promises) {
      if (!p || p.issueKey) continue;
      const bills = [...billsOf((p.title || '') + ' ' + (p.detail || ''))];
      if (!bills.length) { skipped.promiseNoBill++; continue; }
      const hit = bills.find((b) => billKey[b]);
      if (!hit) { skipped.promiseNoSibling++; continue; }
      p.issueKey = billKey[hit];
      changed.add('promises');
      nPromise++;
      log.push(`    + promise [${billKey[hit]}] ${String(p.title).slice(0, 60)}  (via ${hit})`);
    }
  }

  // 3) SPOTLIGHT issueKey BACKFILL (exact-bill inheritance)
  if (spotlight) {
    for (const s of spotlight) {
      if (!s || s.issueKey) continue;
      const bills = [...billsOf((s.headline || '') + ' ' + (s.facts || ''))];
      if (!bills.length) { skipped.spotNoBill++; continue; }
      const hit = bills.find((b) => billKey[b]);
      if (!hit) { skipped.spotNoSibling++; continue; }
      s.issueKey = billKey[hit];
      changed.add('spotlight');
      nSpot++;
      log.push(`    + spotlight [${billKey[hit]}] ${String(s.headline).slice(0, 60)}  (via ${hit})`);
    }
  }

  if (changed.size) {
    nDocs++;
    console.log(`• ${id} (${o.name})`);
    log.forEach((l) => console.log(l));
    const fields = { ...o.__fields };
    if (changed.has('spotlight')) fields.spotlight = enc(spotlight);
    if (changed.has('promises')) fields.promises = enc(promises);
    await patch(id, fields, [...changed]);
    if (APPLY) console.log('    ✓ written');
  }
}

console.log('\n──────── summary ────────');
console.log(`spotlight mismatch fixes    : ${nRekey}`);
console.log(`promise issueKeys backfilled: ${nPromise}`);
console.log(`spotlight issueKeys backfill: ${nSpot}`);
console.log(`documents touched           : ${nDocs}`);
console.log(`skipped (honest, not guessed):`);
console.log(`  promises citing no bill            : ${skipped.promiseNoBill}`);
console.log(`  promises w/ bill but no keyed kin  : ${skipped.promiseNoSibling}`);
console.log(`  spotlight citing no bill           : ${skipped.spotNoBill}`);
console.log(`  spotlight w/ bill but no keyed kin : ${skipped.spotNoSibling}`);
console.log(APPLY ? '\nAPPLIED to Firestore.' : '\nDRY RUN — re-run with --apply to write.');
