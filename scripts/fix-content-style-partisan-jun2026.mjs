#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — CONTENT_STYLE.md compliance fixes (June 2026)
//
// A site-wide audit for the trigger phrases listed in CONTENT_STYLE.md found
// three current sitting Utah legislators whose Spotlight items judged the person
// by their party rather than their own record:
//   • Lincoln Fillmore — a vote tally labeled "on largely party lines."
//   • Ray Ward — a win praised as "rather than along party lines," and framed
//     by party ("a Republican delivering…").
//   • Stephanie Pitcher — an achievement ranked "more than any other Democrat"
//     (the exact ❌ example in the standard) and framed via "minority-party."
//
// Each fix preserves every underlying fact (bill numbers, vote counts, outcomes)
// and only rewrites the partisan framing into an individual, neutral measure.
// Idempotent: re-fetches the live doc and only rewrites a string if the offending
// phrasing is still present.
//
//   node scripts/fix-content-style-partisan-jun2026.mjs            # dry run
//   node scripts/fix-content-style-partisan-jun2026.mjs --apply    # write
// ---------------------------------------------------------------------------

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const STAMP = '2026-06-20T00:00:00.000Z';

// For each id, a list of spotlight rewrites matched by a substring in `find`.
const FIXES = {
  lfillmore: [
    { field: 'facts',
      find: 'It passed the Senate 21-7 on largely party lines amid legislative fallout from the 2024 redistricting ruling; critics call it an attempt to suppress citizen lawmaking.',
      replace: 'It passed the Senate 21-7 amid legislative fallout from the 2024 redistricting ruling; critics call it an attempt to suppress citizen lawmaking.' },
  ],
  rward: [
    { field: 'why',
      find: 'Shows a Republican delivering a low-cost clean-energy win on a unanimous, bipartisan basis rather than along party lines.',
      replace: 'Shows him personally delivering a low-cost clean-energy win that drew unanimous support — 72-0 in the House and 27-0 in the Senate.' },
  ],
  spitcher: [
    { field: 'headline',
      find: 'Most successful Democrat in the Legislature, passing 14 bills in a GOP supermajority',
      replace: 'Passed 14 bills in the 2025 session — among the most of any legislator' },
    { field: 'facts',
      find: 'In the 2025 general session Pitcher passed 14 bills — more than any other Democrat and more than all but a handful of Republicans in either chamber.',
      replace: 'In the 2025 general session Pitcher passed 14 bills — among the most of any legislator in either chamber.' },
    { field: 'why',
      find: 'Rare cross-aisle effectiveness for a minority-party member is a concrete measure of legislative competence, not just rhetoric.',
      replace: 'Turning cross-aisle relationships into a high volume of enacted bills is a concrete measure of her own legislative competence, not just rhetoric.' },
    { field: 'why',
      find: 'A signature environmental promise remains unfulfilled despite repeated attempts, underscoring the limits of minority-party influence on contested policy.',
      replace: 'A signature environmental promise remains unfulfilled despite repeated attempts, underscoring how hard it is to move contested policy even with persistent effort.' },
  ],
};

function enc(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
  if (typeof v === 'object') { const f = {}; for (const [k, val] of Object.entries(v)) f[k] = enc(val); return { mapValue: { fields: f } }; }
  throw new Error('cannot encode value: ' + String(v));
}
function dec(v) {
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return parseInt(v.integerValue, 10);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.nullValue !== undefined) return null;
  if (v.arrayValue !== undefined) return (v.arrayValue.values || []).map(dec);
  if (v.mapValue !== undefined) { const o = {}; for (const [k, val] of Object.entries(v.mapValue.fields || {})) o[k] = dec(val); return o; }
  return null;
}
async function getDoc(id) {
  const r = await fetch(`${BASE}/${id}`);
  if (!r.ok) throw new Error(`fetch ${id}: HTTP ${r.status}`);
  const j = await r.json();
  const o = {};
  for (const [k, v] of Object.entries(j.fields || {})) o[k] = dec(v);
  return o;
}
async function patch(id, fields) {
  const qs = Object.keys(fields).map((m) => 'updateMask.fieldPaths=' + encodeURIComponent(m)).join('&');
  const body = { fields: {} };
  for (const [k, v] of Object.entries(fields)) body.fields[k] = enc(v);
  const r = await fetch(`${BASE}/${id}?${qs}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`patch ${id}: HTTP ${r.status} — ${(await r.text()).slice(0, 200)}`);
}

(async () => {
  console.log(`PolitiDex — CONTENT_STYLE partisan-framing fixes  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
  let totalEdits = 0;
  for (const [id, edits] of Object.entries(FIXES)) {
    const doc = await getDoc(id);
    const spotlight = Array.isArray(doc.spotlight) ? doc.spotlight.map((s) => ({ ...s })) : [];
    let changed = 0;
    for (const e of edits) {
      let applied = false;
      for (const s of spotlight) {
        if (typeof s[e.field] === 'string' && s[e.field].includes(e.find)) {
          s[e.field] = s[e.field].replace(e.find, e.replace);
          applied = true; changed++; break;
        }
      }
      if (!applied) console.log(`  · ${id}: phrasing for "${e.field}" already fixed or not found — skipped`);
    }
    if (changed) {
      console.log(`  ${APPLY ? '✎' : '→'} ${id} (${doc.name}): ${changed} spotlight field(s) rewritten`);
      if (APPLY) await patch(id, { spotlight, updatedAt: STAMP });
      totalEdits += changed;
    }
  }
  console.log(`\n${APPLY ? 'Applied' : 'Would apply'} ${totalEdits} field rewrite(s).`);
  if (!APPLY) console.log('Re-run with --apply to write to Firestore.');
})();
