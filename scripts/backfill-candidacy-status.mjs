#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — backfill candidacyStatus on concluded 2026 candidacies
//
// The Candidate Snapshot's "Limited Record" lede and the issue-stance empty
// state both tell an honest, intentional story when a candidacy has CONCLUDED
// (eliminated at convention, withdrew, or lost) — but only if the record
// carries a `candidacyStatus` flag. A handful of thin candidate profiles whose
// OWN bios state plainly that they were eliminated or withdrew were missing the
// flag, so the site still framed them as actively "running." This backfills the
// flag for those individually verified records so the messaging matches reality.
//
//   node scripts/backfill-candidacy-status.mjs            # dry run
//   node scripts/backfill-candidacy-status.mjs --apply    # write
//
// Each value below was confirmed against the politician's own bio text. Only the
// `candidacyStatus` field and `updatedAt` are written (via updateMask), and the
// script skips any record that already carries a status, so re-running is safe.
// ---------------------------------------------------------------------------

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const STAMP = '2026-06-15T00:00:00.000Z';

// id → status, each verified against the record's own bio.
const PLAN = {
  albert_mosley_ii: 'eliminated', // "eliminated at the Republican convention in April 2026"
  james_ord:        'withdrew',   // "withdrew on March 13, 2026, before the Democratic convention"
  nikaela_penrod:   'withdrew',   // "withdrew before the April 18, 2026 Republican convention"
  jeneanne_lock:    'eliminated', // "eliminated at the April 11, 2026 Salt Lake County Democratic convention"
  roxayn_elmer:     'withdrew',   // office: "Candidate (Withdrawn) for Utah House District 13"
};

function enc(v) {
  if (typeof v === 'string') return { stringValue: v };
  throw new Error('only string values are written by this script');
}
function decStr(f) { return f && f.stringValue !== undefined ? f.stringValue : undefined; }

async function getDoc(id) {
  const r = await fetch(`${BASE}/${id}`);
  if (!r.ok) throw new Error(`fetch ${id}: HTTP ${r.status}`);
  return (await r.json()).fields || {};
}
async function patch(id, fields) {
  const qs = Object.keys(fields).map((m) => 'updateMask.fieldPaths=' + encodeURIComponent(m)).join('&');
  const body = { fields: {} };
  for (const [k, v] of Object.entries(fields)) body.fields[k] = enc(v);
  const r = await fetch(`${BASE}/${id}?${qs}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`patch ${id}: HTTP ${r.status} — ${(await r.text()).slice(0, 200)}`);
}

(async () => {
  console.log(`PolitiDex — backfill candidacyStatus  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
  let written = 0;
  for (const [id, status] of Object.entries(PLAN)) {
    let f;
    try { f = await getDoc(id); } catch (e) { console.log(`  ✗ ${id}: ${e.message}`); continue; }
    const cur = decStr(f.candidacyStatus);
    if (cur) { console.log(`  • ${id}: already '${cur}' — skipped`); continue; }
    console.log(`  ${APPLY ? '✎' : '→'} ${id} (${decStr(f.name) || ''}): candidacyStatus = '${status}'`);
    if (APPLY) { await patch(id, { candidacyStatus: status, updatedAt: STAMP }); written++; }
  }
  console.log(`\n${APPLY ? 'Wrote' : 'Would write'} candidacyStatus on ${APPLY ? written : Object.keys(PLAN).length} record(s).`);
  if (!APPLY) console.log('Re-run with --apply to write to Firestore.');
})();
