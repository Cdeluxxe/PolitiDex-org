#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — connect the FINAL thin sitting-legislator profiles' evidence by
// issueKey (June 2026 thin-profile pass)
//
// Three sitting Utah legislators remained notably thin after the most recent
// strengthening wave: Clint Okerlund, Rob Bishop and Rosalba Dominguez. A
// review found a few real "connection gaps" — documented, sourced legislative
// activity (a sponsored bill or resolution) that carried NO issueKey, so its
// kept/broken verdict and its Spotlight evidence never lit up the member's
// "Stance at a Glance" or Connected Evidence view.
//
// This pass closes ONLY those obvious, defensible gaps. It does NOT invent
// content: every key set here points at a bill/resolution the member personally
// sponsored (already recorded, with sources, in their ledger) whose subject is
// an exact ISSUE_MAP topic. The matching curated Issue Positions are added in
// index.html (ISSUE_STANCE_DATA) in the same change.
//
//   Okerlund   — no Firestore change; his Office-of-Homeless-Services promise
//                (HB 308, 2026) is already keyed `housing_support`, and the new
//                ISSUE_STANCE_DATA position connects to it.
//   Dominguez  — key her Technical Education resolution (HCR 13, 2026) promise
//                AND its floor-presentation Spotlight item to `edu_college_cost`
//                (ISSUE_MAP "Lower College & Trade Costs": trade school /
//                workforce-training topic).
//   Bishop     — key his federal-land / counter-overreach Spotlight item to
//                `lands_local`, matching his kept public-lands promise and his
//                existing Natural-Resources-chairmanship Spotlight item. His
//                state record is genuinely new (seated post-session, May 2026),
//                so no new positions are invented — the profile stays honestly
//                light.
//
//   node scripts/connect-thin-profiles-jun2026.mjs            # dry run (default)
//   node scripts/connect-thin-profiles-jun2026.mjs --apply    # write to Firestore
//
// Idempotent & non-destructive: matches each item by a title/headline substring,
// sets the issueKey only when it is currently absent, and never touches verdicts,
// text or sources.
// ---------------------------------------------------------------------------

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');

// docId -> { promises: [{ match, issueKey }], spotlight: [{ match, issueKey }] }
const PLAN = {
  rosalba_dominguez: {
    promises:  [{ match: 'technical education and workforce credentials', issueKey: 'edu_college_cost' }],
    spotlight: [{ match: 'technical education and workforce credentials', issueKey: 'edu_college_cost' }],
  },
  rob_bishop: {
    spotlight: [{ match: 'federal land and natural resources experience to counter federal overreach', issueKey: 'lands_local' }],
  },
};

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

function applyKeys(list, rules, textFn, label, log) {
  if (!Array.isArray(list) || !rules) return false;
  let dirty = false;
  for (const rule of rules) {
    const needle = rule.match.toLowerCase();
    const item = list.find((x) => x && String(textFn(x) || '').toLowerCase().includes(needle));
    if (!item) { log.push(`    ! no ${label} matching "${rule.match}"`); continue; }
    if (item.issueKey === rule.issueKey) { log.push(`    = ${label} already keyed ${rule.issueKey}`); continue; }
    log.push(`    ✔ ${label} "${String(textFn(item)).slice(0, 50)}…"  ${item.issueKey || 'NONE'} → ${rule.issueKey}`);
    item.issueKey = rule.issueKey;
    dirty = true;
  }
  return dirty;
}

(async () => {
  console.log(`PolitiDex — thin-profile evidence connection  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
  let touched = 0;
  for (const [id, plan] of Object.entries(PLAN)) {
    const doc = await getDoc(id);
    if (!doc) { console.log(`  ! ${id}: not found — skipped`); continue; }
    const log = [];
    const fields = {};
    const proms = Array.isArray(doc.promises) ? doc.promises.map((p) => ({ ...p })) : [];
    const spots = Array.isArray(doc.spotlight) ? doc.spotlight.map((s) => ({ ...s })) : [];
    if (applyKeys(proms, plan.promises, (p) => p.title, 'promise', log)) fields.promises = proms;
    if (applyKeys(spots, plan.spotlight, (s) => s.headline, 'spotlight', log)) fields.spotlight = spots;
    console.log(`  ${id}:`);
    log.forEach((l) => console.log(l));
    if (Object.keys(fields).length) {
      if (APPLY) await patch(id, fields);
      touched++;
    }
  }
  console.log(`\n${touched} document(s) ${APPLY ? 'updated' : 'would be updated'}.`);
  if (!APPLY) console.log('Re-run with --apply to write Firestore.');
})();
