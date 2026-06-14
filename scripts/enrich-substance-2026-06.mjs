#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — substance & honesty pass (June 2026)
//
// Two honest, idempotent Firestore updates that pair with index.html changes:
//
//   1. hegseth (Pete Hegseth, U.S. Secretary of Defense) — a high-visibility
//      Cabinet profile that carried tracked promises but NO documented issue
//      "stances," leaving it thin on "where they stand." index.html now ships
//      sourced ISSUE_STANCE_DATA positions for him (Alignment-keyed). This
//      mirrors the SAME positions into his Firestore `stances` map so the
//      profile editor, record-quality validators and completeness metrics see
//      them too. Every position maps to a real, publicly reported action.
//
//   2. deidre_tyler (Deidre Tyler, 2026 Utah Senate District 12 challenger) —
//      her record was pinned to profileStatus:"full" despite having zero
//      key issues, promises or stances, which suppressed the honest
//      "Limited Record / Monitoring" treatment and made an empty profile read
//      as a finished one. This clears the override so she is classified
//      honestly (active challenger, record still being gathered).
//
//   node scripts/enrich-substance-2026-06.mjs            # dry run (default)
//   node scripts/enrich-substance-2026-06.mjs --apply    # write to Firestore
//
// Honesty rules (matching the rest of the site):
//   • No fabricated positions. Re-fetches each live doc and MERGES stances onto
//     whatever is already there (never clobbering existing keys), then stamps
//     updatedAt. Re-running is safe and idempotent.
// ---------------------------------------------------------------------------

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const STAMP = '2026-06-14T00:00:00.000Z';

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

// ── Positions to mirror (topic → one-line stated position) ──────────────────
// Mirrors the hegseth ISSUE_STANCE_DATA entries added to index.html; see that
// file for the full position cards, evidence and source links.
const STANCES = {
  hegseth: {
    'Military Lethality & Standards': 'Has made restoring a "warrior ethos," combat lethality, and merit-based standards the central mission of his tenure as Secretary of Defense, directing that combat-role fitness standards be made sex-neutral.',
    'DEI in the Military': 'Moved to eliminate diversity, equity, and inclusion programs, offices, and training across the armed forces, calling them a distraction from warfighting.',
    'COVID-Vaccine Discharges & Medical Freedom': 'Backs reinstating service members discharged for refusing the COVID-19 vaccine, with back pay, and opposes such mandates.',
    'Transgender Military Service': 'Implemented the administration\'s policy barring transgender individuals from military service, citing readiness and uniform standards.',
    'Pentagon Audit & Accountability': 'Has pledged to deliver the Pentagon\'s first-ever clean financial audit and tighten accountability over defense spending.',
    'Veterans': 'An Iraq combat veteran and former veterans-advocacy leader who centers servicemember and veteran welfare in his agenda.',
  },
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

// PATCH with named fields. `deletePaths` are added to the update mask but NOT
// the body, which deletes those fields (Firestore REST semantics) — used to
// clear the profileStatus override so the record returns to auto-classification.
async function patch(id, fields, deletePaths) {
  deletePaths = deletePaths || [];
  const mask = Object.keys(fields).concat(deletePaths);
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
  console.log(`PolitiDex — substance & honesty pass  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);

  // 1. Mirror curated issue positions.
  for (const [id, positions] of Object.entries(STANCES)) {
    let doc;
    try { doc = await getDoc(id); }
    catch (e) { console.log(`  ✗ ${id}: ${e.message}`); continue; }
    const existing = (doc.stances && typeof doc.stances === 'object' && !Array.isArray(doc.stances)) ? doc.stances : {};
    const merged = Object.assign({}, existing);
    let fresh = 0;
    for (const [topic, text] of Object.entries(positions)) {
      if (!(topic in merged)) fresh++;
      merged[topic] = text;
    }
    console.log(`  ${APPLY ? '✎' : '→'} ${id} (${doc.name || ''}): ${Object.keys(positions).length} position(s) (${fresh} new) → stances now ${Object.keys(merged).length}`);
    if (APPLY) await patch(id, { stances: merged, updatedAt: STAMP });
  }

  // 2. Fix the mislabeled profileStatus on an empty active challenger.
  const TYLER = 'deidre_tyler';
  try {
    const t = await getDoc(TYLER);
    const empty = !(t.keyIssues && t.keyIssues.length) && !(t.promises && t.promises.length) &&
      !(t.stances && Object.keys(t.stances || {}).length);
    if (t.profileStatus === 'full' && empty) {
      console.log(`  ${APPLY ? '✎' : '→'} ${TYLER} (${t.name || ''}): clear profileStatus:"full" override → auto-classify (Limited Record)`);
      if (APPLY) await patch(TYLER, { updatedAt: STAMP }, ['profileStatus']);
    } else {
      console.log(`  · ${TYLER}: no change (profileStatus=${t.profileStatus || 'auto'}, empty=${empty})`);
    }
  } catch (e) {
    console.log(`  ✗ ${TYLER}: ${e.message}`);
  }

  console.log(`\n${APPLY ? 'Applied.' : 'Dry run complete.'}`);
  if (!APPLY) console.log('Re-run with --apply to write to Firestore.');
})();
