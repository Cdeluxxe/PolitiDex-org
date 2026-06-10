#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — reclassify mislabeled 2026 candidates in the Utah roster
//
// A full-site audit (see scripts/validate-legislators.mjs) found that the
// thin profiles still labeled as *sitting* Utah House/Senate members are, with
// one exception, 2026 candidates or a former member that were entered with a
// "sitting officeholder" office string. This script corrects the
// classification straight in the live `politicians` Firestore collection that
// index.html reads at runtime.
//
//   node scripts/reclassify-2026-candidates.mjs            # dry run (default)
//   node scripts/reclassify-2026-candidates.mjs --apply    # write to Firestore
//
// It is conservative and idempotent:
//   • It only rewrites the `office` string (classification) and, for the two
//     records that carried a kept/broken count they could not have earned yet,
//     it converts those "kept" promise verdicts to "pending" and re-mirrors the
//     kept/broken/pending tallies. It invents no governing records.
//   • Re-running after a successful apply is a no-op.
//
// Every id and target office below was verified against the seat's established
// incumbent (in-dataset) and official 2026 filing / reporting. See
// .netlify/results.md for the per-person basis.
// ---------------------------------------------------------------------------

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');

// ── Reclassification table ─────────────────────────────────────────────────
// kind: 'candidate'  → relabel office as a 2026 candidate
//       'candidate+' → 2026 candidate AND clear an unearned kept/broken record
//       'former'     → relabel office as a former member (governing record kept)
const PLAN = [
  // — Senate 2026 candidates (each shares a seat with a recorded incumbent) —
  { id: 'deidre_tyler',      kind: 'candidate', office: 'Utah State Senate — 2026 Candidate (Senate District 12)' },
  { id: 'thaddeus_a_evans',  kind: 'candidate', office: 'Utah State Senate — 2026 Candidate (Senate District 9)' },
  { id: 'salvador_giove',    kind: 'candidate', office: 'Utah State Senate — 2026 Candidate (Senate District 19)' },
  { id: 'shana_anderson',    kind: 'candidate', office: 'Utah State Senate — 2026 Candidate (Senate District 19)' },
  { id: 'tami_tran',         kind: 'candidate', office: 'Utah State Senate — 2026 Candidate (Senate District 6)' },
  { id: 'taylor_j_paden',    kind: 'candidate', office: 'Utah State Senate — 2026 Candidate (Senate District 13)' },
  { id: 'silvia_catten',     kind: 'candidate', office: 'Utah State Senate — 2026 Candidate (Senate District 13)' },
  { id: 'tracie_halvorsen',  kind: 'candidate', office: 'Utah State Senate — 2026 Candidate (Senate District 18)' },
  { id: 'tucker_smith',      kind: 'candidate', office: 'Utah State Senate — 2026 Candidate (Senate District 23)' },

  // — House 2026 candidates (each shares a seat with a recorded incumbent) —
  { id: 'stephen_miller',    kind: 'candidate', office: 'Utah House of Representatives — 2026 Candidate (House District 41)' },
  { id: 'steve_aste',        kind: 'candidate', office: 'Utah House of Representatives — 2026 Candidate (House District 41)' },
  { id: 'eryn_russo',        kind: 'candidate', office: 'Utah House of Representatives — 2026 Candidate (House District 41)' },
  { id: 'tom_waqa',          kind: 'candidate', office: 'Utah House of Representatives — 2026 Candidate (House District 61)' },
  { id: 'stephen_otterstrom',kind: 'candidate', office: 'Utah House of Representatives — 2026 Candidate (House District 21)' },
  { id: 'sam_barlow',        kind: 'candidate', office: 'Utah House of Representatives — 2026 Candidate (House District 17)' },
  { id: 'scott_stephenson',  kind: 'candidate', office: 'Utah House of Representatives — 2026 Candidate (House District 44)' },

  // — House 2026 candidates carrying an unearned kept/broken record to clear —
  // Both were seated only days/weeks before this audit (their own accountability
  // summaries say "no legislative record yet" / "not yet had sufficient time to
  // build a track record"), so their "kept" promises are campaign-platform
  // positions, not fulfilled governing promises.
  { id: 'grant_pace',        kind: 'candidate+', office: 'Utah House of Representatives — 2026 Candidate (House District 60)' },
  { id: 'jackie_larson',     kind: 'candidate+', office: 'Utah House of Representatives — 2026 Candidate (House District 64)' },

  // — Former member (one full term 2023–2025; genuine record preserved) —
  { id: 'tim_jimenez',       kind: 'former',    office: 'Former Utah State Representative — House District 28 (2023–2025)' },
];

// troy_shelley (House District 66) is intentionally absent: he is a *genuine*
// sitting member (seated Jan 1 2025) who is simply thin (5 promises). He needs
// editorial expansion, not reclassification.

async function getDoc(id) {
  const r = await fetch(`${BASE}/${id}`);
  if (!r.ok) throw new Error(`fetch ${id}: HTTP ${r.status}`);
  return r.json();
}

const numVal = (f) => (f && 'integerValue' in f ? parseInt(f.integerValue, 10) : f && 'doubleValue' in f ? f.doubleValue : 0);

// Build the PATCH body + updateMask for one planned change. Returns null when
// the record is already in the desired state (idempotent no-op).
function buildPatch(doc, plan) {
  const fields = {};
  const mask = [];
  const cur = doc.fields || {};

  const curOffice = cur.office && cur.office.stringValue;
  if (curOffice !== plan.office) {
    fields.office = { stringValue: plan.office };
    mask.push('office');
  }

  if (plan.kind === 'candidate+') {
    const promisesField = cur.promises;
    const values = (promisesField && promisesField.arrayValue && promisesField.arrayValue.values) || [];
    let changed = false;
    let kept = 0, broken = 0, pending = 0;
    const newValues = values.map((v) => {
      const mf = (v.mapValue && v.mapValue.fields) || {};
      let verdict = mf.verdict && mf.verdict.stringValue;
      if (verdict === 'kept' || verdict === 'broken') {
        verdict = 'pending';
        changed = true;
        return { mapValue: { fields: { ...mf, verdict: { stringValue: 'pending' } } } };
      }
      return v;
    });
    newValues.forEach((v) => {
      const verdict = v.mapValue.fields.verdict && v.mapValue.fields.verdict.stringValue;
      if (verdict === 'kept') kept++; else if (verdict === 'broken') broken++; else pending++;
    });
    const curKept = numVal(cur.kept), curBroken = numVal(cur.broken), curPending = numVal(cur.pending);
    if (changed || curKept !== kept || curBroken !== broken || curPending !== pending) {
      fields.promises = { arrayValue: { values: newValues } };
      fields.kept = { integerValue: String(kept) };
      fields.broken = { integerValue: String(broken) };
      fields.pending = { integerValue: String(pending) };
      mask.push('promises', 'kept', 'broken', 'pending');
      // mirror the accountability map so the validator's mirror check holds
      const acct = cur.accountability && cur.accountability.mapValue && cur.accountability.mapValue.fields;
      if (acct && ('kept' in acct || 'broken' in acct || 'pending' in acct)) {
        fields.accountability = {
          mapValue: {
            fields: {
              kept: { integerValue: String(kept) },
              broken: { integerValue: String(broken) },
              pending: { integerValue: String(pending) },
            },
          },
        };
        mask.push('accountability.kept', 'accountability.broken', 'accountability.pending');
      }
    }
  }

  return mask.length ? { fields, mask } : null;
}

async function patch(id, body) {
  const qs = body.mask.map((m) => 'updateMask.fieldPaths=' + encodeURIComponent(m)).join('&');
  const r = await fetch(`${BASE}/${id}?${qs}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: body.fields }),
  });
  if (!r.ok) throw new Error(`patch ${id}: HTTP ${r.status} — ${(await r.text()).slice(0, 200)}`);
}

(async () => {
  console.log(`PolitiDex — reclassify 2026 candidates  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
  let changes = 0, noops = 0;
  for (const plan of PLAN) {
    let doc;
    try { doc = await getDoc(plan.id); }
    catch (e) { console.log(`  ✗ ${plan.id}: ${e.message}`); continue; }
    const body = buildPatch(doc, plan);
    if (!body) { console.log(`  · ${plan.id}: already correct`); noops++; continue; }
    const note = body.mask.includes('kept') ? ' + cleared unearned kept/broken → pending' : '';
    console.log(`  ${APPLY ? '✎' : '→'} ${plan.id}: office="${plan.office}"${note}`);
    if (APPLY) { await patch(plan.id, body); }
    changes++;
  }
  console.log(`\n${APPLY ? 'Applied' : 'Would apply'} ${changes} change(s); ${noops} already correct.`);
  if (!APPLY) console.log('Re-run with --apply to write to Firestore.');
})();
