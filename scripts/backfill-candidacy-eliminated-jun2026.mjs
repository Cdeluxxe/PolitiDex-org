#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — backfill `candidacyStatus` on 2026 candidates who concluded
//
// A site review found ~9 politician documents for 2026-cycle candidates whose
// bios clearly state they lost at convention or were eliminated, but which were
// missing the `candidacyStatus` field. Without that flag the UI still labels
// them with the on-the-ballot "🗳️ 2026 Candidate" badge and frames their empty
// promise record as "record starts in office" — implying they are still a live
// choice a voter could add to their team. They are not.
//
// Setting `candidacyStatus: 'eliminated'` switches the existing, already-built
// honest treatment on across every surface: the card badge reads "✖ Out of
// Race", the profile lede says they "ran but did not advance past the
// nominating stage, so there is no governing record to score", and the focus
// note reads "Limited public record" instead of "positions being added".
//
//   node scripts/backfill-candidacy-eliminated-jun2026.mjs            # dry run
//   node scripts/backfill-candidacy-eliminated-jun2026.mjs --apply    # write
//
// Honesty rules (matching the rest of the site):
//   • Every status below is supported by the verifiable convention/withdrawal
//     outcome already documented in that politician's own `bio`. Nothing is
//     invented — this only structures a fact the profile already states in prose.
//   • `candidacyOutcome` is a short, sourced one-line summary kept for provenance
//     (it mirrors the field already present on other concluded-candidate docs).
//   • Idempotent: each run re-fetches the live doc and only writes where
//     `candidacyStatus` is currently absent, so it never clobbers an existing
//     value and is safe to re-run.
// ---------------------------------------------------------------------------

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const STAMP = '2026-06-15T00:00:00.000Z';

// ── verified, bio-sourced outcomes ─────────────────────────────────────────
const ITEMS = [
  { id: 'adam_sorenson',     status: 'eliminated', outcome: 'Eliminated at the April 18, 2026 Davis County Republican convention for House District 17; afterward endorsed fellow Republican Sam Barlow.' },
  { id: 'chris_sloan',       status: 'eliminated', outcome: 'Eliminated at the 2026 Utah Republican convention for Senate District 11, where Brooks Benson won the nomination.' },
  { id: 'john_knotwell',     status: 'eliminated', outcome: 'Finished third and was eliminated at the April 25, 2026 Utah GOP nominating convention for the open Senate District 11 seat.' },
  { id: 'jonah_johnson',     status: 'eliminated', outcome: 'Eliminated at the April 18, 2026 Utah County Republican convention for House District 62, losing the endorsement vote to incumbent Rep. Norm Thurston 54–8.' },
  { id: 'matthew_durrant',   status: 'eliminated', outcome: 'Eliminated at the April 2026 Utah County Republican convention for House District 64.' },
  { id: 'richard_t_whitney', status: 'eliminated', outcome: 'Eliminated at the April 2026 Democratic convention for the open Senate District 13 seat; did not advance to the primary.' },
  { id: 'ryan_jackson',      status: 'eliminated', outcome: 'Eliminated at the April 2026 Republican convention for House District 39, where incumbent Rep. Ken Ivory advanced unopposed.' },
  { id: 'salvador_giove',    status: 'eliminated', outcome: 'Defeated by Shana Anderson at the April 2026 Democratic convention for Senate District 19; did not advance to the general election.' },
  { id: 'tracie_halvorsen',  status: 'eliminated', outcome: 'Eliminated in the first round of delegate voting at the April 2026 Republican convention for Senate District 18.' },
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
  if (!v) return undefined;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return parseInt(v.integerValue, 10);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.nullValue !== undefined) return null;
  return undefined;
}

async function getDoc(id) {
  const r = await fetch(`${BASE}/${id}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`fetch ${id}: HTTP ${r.status}`);
  return r.json();
}
async function patch(id, fields) {
  const mask = Object.keys(fields);
  const qs = mask.map(f => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
  const body = { fields: {} };
  for (const [k, v] of Object.entries(fields)) body.fields[k] = enc(v);
  const r = await fetch(`${BASE}/${id}?${qs}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`patch ${id}: HTTP ${r.status} — ${(await r.text()).slice(0, 200)}`);
}

async function main() {
  console.log(`PolitiDex — backfill candidacyStatus  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
  let added = 0, skipped = 0, missing = 0;
  for (const item of ITEMS) {
    const doc = await getDoc(item.id);
    if (!doc) { console.log(`  ? ${item.id} — doc not found`); missing++; continue; }
    const cur = dec((doc.fields || {}).candidacyStatus);
    const name = dec((doc.fields || {}).name) || '';
    if (cur) { console.log(`  · ${item.id} (${name}) — already "${cur}", skipped`); skipped++; continue; }
    console.log(`  ${APPLY ? '✎' : '→'} ${item.id} (${name}) ← ${item.status}`);
    if (APPLY) await patch(item.id, { candidacyStatus: item.status, candidacyOutcome: item.outcome, updatedAt: STAMP });
    added++;
  }
  console.log(`\n${APPLY ? 'Applied' : 'Would apply'} ${added} status(es); ${skipped} already set; ${missing} not found.`);
  if (!APPLY) console.log('Re-run with --apply to write to Firestore.');
}
main().catch(e => { console.error(e); process.exit(1); });
