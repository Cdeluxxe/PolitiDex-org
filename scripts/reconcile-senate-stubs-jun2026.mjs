#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — reconcile SENATE same-bill duplicate Spotlight cards (June 2026).
//
// Companion to spotlight-evidence-senate-jun2026-wave9.mjs. The Senate-balance
// wave added verified official floor-video Spotlight items for sitting Utah
// State Senators. Some of those senators already carried a Spotlight card on the
// SAME bill that was authored by an EARLIER, non-floor-video script (a generic /
// unconnected stub with no issueKey and/or no video). That leaves two cards for
// one bill.
//
// This pass enforces exactly ONE card per bill across every sitting senator,
// keeping the single most rigorous, connected version:
//
//   richness = (media.timestamp ? 4 : 0)
//            + (media && media.type === 'video' ? 3 : 0)
//            + (media ? 1 : 0)
//            + (issueKey ? 2 : 0)
//
//   • A generic stub (no issueKey, no video) always loses to a verified
//     floor-video card (bill record + official video + exact timestamp +
//     validated issueKey), so the bill ends up connected to the evidence map and
//     backed by its floor video.
//   • If two genuine floor-video cards collide on a bill, the score ties and the
//     tie-break keeps the FIRST (pre-existing) card, so nothing rich is ever
//     dropped for a few characters of wording.
//
// SAFETY: only bill-GROUPS with 2+ cards on the same bill are ever touched.
// Bills with a single card are never modified, so coverage can only get cleaner,
// never thinner. Writes patch only `spotlight` + `updatedAt`, with 429 backoff.
// Idempotent: after reconciliation each bill has one card and a re-run is a
// no-op.
//
//   node scripts/reconcile-senate-stubs-jun2026.mjs            # dry run
//   node scripts/reconcile-senate-stubs-jun2026.mjs --apply    # write
// ---------------------------------------------------------------------------

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const STAMP = '2026-06-21T00:00:00.000Z';

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
  if (v.timestampValue !== undefined) return v.timestampValue;
  if (v.arrayValue !== undefined) return (v.arrayValue.values || []).map(dec);
  if (v.mapValue !== undefined) {
    const o = {};
    for (const [k, val] of Object.entries(v.mapValue.fields || {})) o[k] = dec(val);
    return o;
  }
  return null;
}

// Every sitting Utah State Senator (le.utah.gov/data/legislators.json, house=S),
// mapped to its Firestore document id. Scoping the cleanup to the Senate keeps
// it bounded and quota-friendly while covering the chamber this pass focused on.
const IDS = [
  'scott_d_sandall', 'chris_h_wilson', 'john_d_johnson', 'calvin_r_musselman',
  'ann_millner', 'jerry_w_stevenson', 'j_stuart_adams', 'todd_weiler',
  'jen_plumb', 'luz_escamilla', 'emily_buss', 'karen_kwan', 'nate_blouin',
  'stephanie_pitcher', 'kathleen_a_riebe', 'wayne_a_harper', 'lincoln_fillmore',
  'daniel_mccay', 'kirk_a_cullimore', 'ronald_m_winterton', 'brady_brammer',
  'heidi_balderree', 'keith_grover', 'keven_j_stratton', 'michael_k_mckell',
  'david_p_hinkins', 'derrin_r_owens', 'evan_j_vickers', 'don_l_ipson',
];

// The bill a Spotlight card points at, from its source bill-record URL.
const billOf = (s) => {
  const u = (s && s.source && s.source.url) || '';
  const m = u.match(/static\/([A-Z]+\d+)\.html/);
  return m ? m[1] : null;
};
const isFloorVideo = (s) => !!(s && s.media && s.media.type === 'video');
function richness(s) {
  let r = 0;
  if (s.media && s.media.timestamp) r += 4;
  if (s.media && s.media.type === 'video') r += 3;
  if (s.media) r += 1;
  if (s.issueKey) r += 2;
  return r;
}

// Keep exactly one card per bill that has a collision (2+ cards on the same
// bill). The richest connected card wins; on a tie keep the earliest (so a
// pre-existing rich card is never replaced by a duplicate). Single-card bills
// are untouched.
function reconcile(spotlight) {
  const groups = new Map();
  spotlight.forEach((s, i) => {
    const b = billOf(s);
    if (!b) return;
    if (!groups.has(b)) groups.set(b, []);
    groups.get(b).push(i);
  });
  const removeIdx = new Set();
  for (const [, idxs] of groups) {
    if (idxs.length < 2) continue; // only collisions
    let keep = idxs[0];
    for (const i of idxs) {
      if (richness(spotlight[i]) > richness(spotlight[keep])) keep = i;
    }
    idxs.forEach((i) => { if (i !== keep) removeIdx.add(i); });
  }
  const kept = spotlight.filter((_, i) => !removeIdx.has(i));
  const removed = spotlight.filter((_, i) => removeIdx.has(i));
  return { kept, removed };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getDoc(id) {
  for (let a = 0; a < 8; a++) {
    const r = await fetch(`${BASE}/${id}`);
    if (r.ok) {
      const j = await r.json();
      const o = {};
      for (const [k, val] of Object.entries(j.fields || {})) o[k] = dec(val);
      return o;
    }
    if (r.status === 404) return null;
    if (r.status === 429) { await sleep(8000 * (a + 1)); continue; }
    return null;
  }
  return '__throttled__';
}
async function patchSpotlight(id, spotlight) {
  const fields = { spotlight: enc(spotlight), updatedAt: enc(STAMP) };
  const url = `${BASE}/${id}?updateMask.fieldPaths=spotlight&updateMask.fieldPaths=updatedAt`;
  for (let a = 0; a < 8; a++) {
    const r = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) });
    if (r.ok) return;
    if (r.status === 429) { await sleep(8000 * (a + 1)); continue; }
    throw new Error(`PATCH ${id} -> ${r.status} ${await r.text()}`);
  }
  throw new Error(`PATCH ${id} -> throttled after retries`);
}

let totalRemoved = 0, membersChanged = 0, throttled = 0;
for (const id of IDS) {
  const doc = await getDoc(id);
  if (doc === '__throttled__') { console.log(`!! THROTTLED ${id}`); throttled++; continue; }
  if (!doc) { console.log(`!! MISSING ${id}`); continue; }
  const sp = Array.isArray(doc.spotlight) ? doc.spotlight : [];
  const { kept, removed } = reconcile(sp);
  if (!removed.length) { console.log(`= ${id}: no same-bill collisions (${sp.length} items)`); continue; }
  membersChanged++;
  totalRemoved += removed.length;
  console.log(`~ ${id} (${doc.name}): ${sp.length} -> ${kept.length}  (removed ${removed.length})`);
  removed.forEach((s) => console.log(`    − [${isFloorVideo(s) ? 'video-dup' : 'generic-stub'}] ${billOf(s)} #${s.issueKey || '∅'}  ${s.headline || s.title}`));
  if (APPLY) { await patchSpotlight(id, kept); console.log('    ✓ written'); await sleep(1500); }
}
console.log('\n──────── summary ────────');
console.log(`senators changed        : ${membersChanged}`);
console.log(`duplicate cards removed : ${totalRemoved}`);
if (throttled) console.log(`throttled (re-run)      : ${throttled}`);
console.log(APPLY ? '\nAPPLIED to Firestore.' : '\nDRY RUN — re-run with --apply to write.');
