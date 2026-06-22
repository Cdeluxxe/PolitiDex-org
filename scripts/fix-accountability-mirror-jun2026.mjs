#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — fix STALE accountability-score mirrors on sitting Utah legislators
// (June 2026 accountability-mirror cleanup)
//
// Each `politicians` document carries a denormalized `accountability` map that
// mirrors the promise ledger's resolved counts alongside the curated integrity
// score:  { kept, broken, pending, overallScore, summary }.  When later
// strengthening passes ADDED verifiable promises to a member's ledger, the
// member's top-level kept/broken/pending were recomputed, but this mirrored
// `accountability.{kept,broken,pending}` snapshot was NOT — so it now undercounts
// the real ledger and disagrees with what the profile renders live from the
// promises array.  A depth review flagged six current officeholders where the
// mirror had drifted:
//
//   christine_watkins · clinton_okerlund · cmusselman · jon_hawkins ·
//   r_neil_walter · rshipp
//
// This script re-derives kept/broken/pending DIRECTLY from each document's
// `promises` array (the source of truth) and writes them back into BOTH the
// top-level summary counts and the mirrored `accountability` map, so every copy
// agrees with reality.
//
//   node scripts/fix-accountability-mirror-jun2026.mjs            # dry run (default)
//   node scripts/fix-accountability-mirror-jun2026.mjs --apply    # write to Firestore
//
// Honesty / conservatism rules:
//   • NO promise verdict (kept/broken/pending) is ever changed — the script only
//     COUNTS the existing verdicts and corrects the mirrored totals.
//   • The published `score` (Promise %) and the curated `accountability.overallScore`
//     / `summary` are left untouched. Those are deliberately impact-weighted
//     editorial figures (the profile's own explainer notes the headline score can
//     sit above or below the raw Kept ÷ (Kept+Broken) ratio), not a raw mirror of
//     the ledger, so re-deriving them would overwrite a curated judgement.
//   • Idempotent & non-destructive: re-fetches each live doc, recomputes from the
//     promises array, and only writes the fields that are actually wrong.
// ---------------------------------------------------------------------------

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');

const TARGETS = [
  'christine_watkins',
  'clinton_okerlund',
  'cmusselman',
  'jon_hawkins',
  'r_neil_walter',
  'rshipp',
];

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
  throw new Error('cannot encode value: ' + String(v));
}
function dec(v) {
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return parseInt(v.integerValue, 10);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.nullValue !== undefined) return null;
  if (v.arrayValue !== undefined) return (v.arrayValue.values || []).map(dec);
  if (v.mapValue !== undefined) {
    const o = {};
    for (const [k, val] of Object.entries(v.mapValue.fields || {})) o[k] = dec(val);
    return o;
  }
  return null;
}
async function getDoc(id) {
  const r = await fetch(`${BASE}/${id}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`fetch ${id}: HTTP ${r.status}`);
  const j = await r.json();
  const o = {};
  for (const [k, v] of Object.entries(j.fields || {})) o[k] = dec(v);
  return o;
}
async function patch(id, fields) {
  const mask = Object.keys(fields);
  const qs = mask.map((m) => 'updateMask.fieldPaths=' + encodeURIComponent(m)).join('&');
  const body = { fields: {} };
  for (const [k, v] of Object.entries(fields)) body.fields[k] = enc(v);
  const r = await fetch(`${BASE}/${id}?${qs}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`patch ${id}: HTTP ${r.status} — ${(await r.text()).slice(0, 200)}`);
}

function tally(promises) {
  const t = { kept: 0, broken: 0, pending: 0 };
  for (const p of promises || []) {
    const v = (p && p.verdict) || 'pending';
    if (v === 'kept') t.kept++;
    else if (v === 'broken') t.broken++;
    else if (v === 'pending') t.pending++;
  }
  return t;
}

(async () => {
  console.log(`PolitiDex — accountability-mirror cleanup  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
  let fixed = 0;
  for (const id of TARGETS) {
    const doc = await getDoc(id);
    if (!doc) { console.log(`  ! ${id}: not found — skipped`); continue; }
    const t = tally(doc.promises);
    const fields = {};

    // Top-level summary counts (already correct on these docs, but kept idempotent).
    if (doc.kept !== t.kept) fields.kept = t.kept;
    if (doc.broken !== t.broken) fields.broken = t.broken;
    if (doc.pending !== t.pending) fields.pending = t.pending;

    // The mirrored accountability map — the part that had drifted. Re-derive its
    // resolved counts from the ledger while preserving the curated overallScore /
    // summary verbatim.
    const a = (doc.accountability && typeof doc.accountability === 'object') ? { ...doc.accountability } : null;
    if (a && (a.kept !== t.kept || a.broken !== t.broken || a.pending !== t.pending)) {
      a.kept = t.kept; a.broken = t.broken; a.pending = t.pending;
      fields.accountability = a;
    }

    if (!Object.keys(fields).length) { console.log(`  = ${id}: already in sync (${t.kept}/${t.broken}/${t.pending})`); continue; }

    const before = doc.accountability ? `${doc.accountability.kept}/${doc.accountability.broken}/${doc.accountability.pending}` : '—';
    console.log(`  ✔ ${id}: ledger ${t.kept}/${t.broken}/${t.pending}  ·  accountability mirror ${before} → ${t.kept}/${t.broken}/${t.pending}` +
      `${fields.kept !== undefined || fields.broken !== undefined || fields.pending !== undefined ? '  (+ top-level counts)' : ''}`);
    if (APPLY) await patch(id, fields);
    fixed++;
  }
  console.log(`\n${fixed} document(s) ${APPLY ? 'updated' : 'would be updated'}.`);
  if (!APPLY) console.log('Re-run with --apply to write Firestore.');
})();
