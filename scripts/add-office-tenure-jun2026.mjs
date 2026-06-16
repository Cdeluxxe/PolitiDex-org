#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — June 2026 office-tenure backfill
//
// Politician profiles showed an "In Office" / "Former Office" badge but never
// said HOW LONG someone has actually held the seat — important accountability
// context. This script adds structured office-tenure fields to the highest-
// visibility politicians (Utah's federal delegation, the Governor, the Senate
// President, and Key-Races state-legislature incumbents) so cards, profile
// modals, and Key Races can render "In office since 2021 (5 years)" and the
// like.
//
//   termStart — when the official began serving in their CURRENT office.
//               A plain year ("2009"), month-year ("2021-01"), or ISO date.
//   termEnd   — present only for FORMER officeholders ("Served 2015 – 2023").
//               Omitted here: every official below is a sitting officeholder.
//
// Every date is from public records and matches the static CMP_DATA source of
// truth shipped in index.html (the public profile reads the live Firestore doc
// merged over that static base, so the two stay in sync). NO dates are invented.
//
//   node scripts/add-office-tenure-jun2026.mjs            # dry run
//   node scripts/add-office-tenure-jun2026.mjs --apply    # write to Firestore
//
// Each run re-fetches the live doc and writes ONLY termStart (+ updatedAt) via
// an updateMask, so it is safe and idempotent to re-run.
// ---------------------------------------------------------------------------

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const STAMP = '2026-06-16T00:00:00.000Z';

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

// ── Verified office-tenure data (start of service in the CURRENT office) ────
// Sources: official .gov/legislative directories, Ballotpedia, Wikipedia,
// Salt Lake Tribune / Deseret News / KUER swearing-in coverage. See the project
// summary for citations. All are sitting officeholders → no termEnd.
const PLAN = {
  // ── Utah's federal delegation + Governor (statewide, highest visibility) ──
  cox:        { termStart: '2021-01', note: 'Governor of Utah, sworn in Jan 4, 2021' },
  lee:        { termStart: '2011-01', note: 'U.S. Senator, sworn in Jan 3, 2011' },
  curtis:     { termStart: '2025-01', note: 'U.S. Senator, sworn in Jan 3, 2025' },
  bmoore:     { termStart: '2021-01', note: 'U.S. Rep UT-01, sworn in Jan 3, 2021' },
  owens:      { termStart: '2021-01', note: 'U.S. Rep UT-04, sworn in Jan 3, 2021' },
  maloy:      { termStart: '2023-11', note: 'U.S. Rep UT-02, won/sworn Nov 2023 special election' },
  kennedy:    { termStart: '2025-01', note: 'U.S. Rep UT-03, sworn in Jan 3, 2025' },
  // ── Key-Races / district-browse state-legislature incumbents ──────────────
  sadams:     { termStart: '2009',    note: 'Utah State Senate since 2009 (Senate President since 2019)' },
  jstevenson: { termStart: '2010',    note: 'Utah State Senate since Jan 2010' },
  kgrover:    { termStart: '2018',    note: 'Utah State Senate since June 2018 (Utah House 2007-2018)' },
  amillner:   { termStart: '2015-01', note: 'Utah State Senate since Jan 2015' },
  tlee:       { termStart: '2023-01', note: 'Utah House since Jan 2023' },
};

// ── Firestore I/O ───────────────────────────────────────────────────────────
async function getDoc(id) {
  const r = await fetch(`${BASE}/${id}`);
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
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`patch ${id}: HTTP ${r.status} — ${(await r.text()).slice(0, 200)}`);
}

(async () => {
  console.log(`PolitiDex — office-tenure backfill  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
  let touched = 0, skipped = 0;
  for (const [id, spec] of Object.entries(PLAN)) {
    let doc;
    try {
      doc = await getDoc(id);
    } catch (e) {
      console.log(`  ✗ ${id}: ${e.message}`);
      skipped++;
      continue;
    }
    const had = doc.termStart ? ` (was ${doc.termStart})` : '';
    console.log(`  ${APPLY ? '✎' : '→'} ${id} (${doc.name || ''}): termStart=${spec.termStart}${had}  — ${spec.note}`);
    if (APPLY) await patch(id, { termStart: spec.termStart, updatedAt: STAMP });
    touched++;
  }
  console.log(`\n${APPLY ? 'Applied' : 'Would apply'} tenure to ${touched} profile(s)${skipped ? `, ${skipped} skipped` : ''}.`);
  if (!APPLY) console.log('Re-run with --apply to write to Firestore.');
})();
