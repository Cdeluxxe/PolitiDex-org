#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — backfill keyIssues for the one profile that has documented
// issue positions but an empty keyIssues array.
//
// A data review found that `fgibson` (Francis Gibson, former Utah House
// Majority Leader) carries three documented, sourced stances — Economic
// Development, Tax Reform and Data Privacy — but his `keyIssues` array was
// left empty. That made his profile read thinner than it is and left the
// "key issues" surfaces (profile modal, issue filters) blank for him even
// though the underlying record exists. This sets keyIssues to the exact
// topics he already has stances on, so the tags mirror the real positions.
//
//   node scripts/backfill-fgibson-keyissues.mjs            # dry run (default)
//   node scripts/backfill-fgibson-keyissues.mjs --apply    # write to Firestore
//
// Honesty rules (matching the rest of the site):
//   • No fabricated topics. Every keyIssue below is copied verbatim from a
//     stance topic already on the live document.
//   • The run re-fetches the live doc, only fills keyIssues when it is empty,
//     and writes just `keyIssues` + `updatedAt` via updateMask. Idempotent.
// ---------------------------------------------------------------------------

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const STAMP = '2026-06-15T00:00:00.000Z';
const ID = 'fgibson';

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
  console.log(`PolitiDex — backfill keyIssues for ${ID}  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
  const doc = await getDoc(ID);
  const stances = (doc.stances && typeof doc.stances === 'object' && !Array.isArray(doc.stances)) ? doc.stances : {};
  const stanceTopics = Object.keys(stances);
  const existing = Array.isArray(doc.keyIssues) ? doc.keyIssues : [];

  if (existing.length > 0) {
    console.log(`  • ${ID} already has keyIssues (${existing.join(', ')}) — nothing to do.`);
    return;
  }
  if (stanceTopics.length === 0) {
    console.log(`  • ${ID} has no stances to derive keyIssues from — skipping (would not fabricate).`);
    return;
  }

  console.log(`  ${APPLY ? '✎' : '→'} ${ID} (${doc.name || ''}): keyIssues [] → [${stanceTopics.join(', ')}]`);
  if (APPLY) {
    await patch(ID, { keyIssues: stanceTopics, updatedAt: STAMP });
    console.log('\nApplied.');
  } else {
    console.log('\nRe-run with --apply to write to Firestore.');
  }
})();
