#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — reconcile WAVE 8 same-bill duplicates.
//
// Wave 8 added verified floor-video Spotlight items for the thinnest sitting
// Utah legislators. A post-write audit found that, for 10 bills, the member
// already carried a Spotlight card on the SAME bill that was authored by an
// EARLIER, non-floor-video script (these were not in the floor-video waves the
// wave-8 exclusion list scanned, so they slipped through). That produced two
// cards for one bill on those members.
//
// This pass restores exactly ONE card per affected bill, keeping the single most
// rigorous version:
//   richness = (media.timestamp ? 4 : 0) + (media ? 2 : 0) + (issueKey ? 2 : 0)
//              + min(facts length, 400)/400
//   • For the 8 bills whose pre-existing card was a generic stub (no issueKey,
//     no video), the wave-8 item — verified bill record + official floor video +
//     exact timestamp + validated issueKey — wins and the stub is removed, so the
//     bill is now connected to the evidence map and backed by its floor video.
//   • For the 2 bills that ALREADY had a rich floor-video card (Mauga HB248,
//     Roberts HB471), the tie is broken in favour of the PRE-EXISTING card and
//     the wave-8 duplicate is removed — nothing is lost.
//
// Only bill-groups that contain a wave-8 headline are touched; pre-existing
// duplicate pairs the wave did not create are left exactly as they were. Writes
// patch only `spotlight` + `updatedAt`, with 429 backoff. Idempotent: re-running
// after reconciliation finds one card per bill and makes no change.
//
//   node scripts/reconcile-wave8-duplicates-jun2026.mjs            # dry run
//   node scripts/reconcile-wave8-duplicates-jun2026.mjs --apply    # write
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

const MY_HEADLINES = new Set([
  'Presented her Foreign Judgment interest-rate bill on the House floor (video at 41:41)',
  'Carried her Combined Basic Tax Rate Reduction on the House floor (video at 1:39:58)',
  'Presented her Medications in Schools bill allowing epinephrine nasal spray (video at 33:11)',
  'Carried her Property Tax Changes bill on the House floor (video at 1:14:12)',
  'Presented her School Curriculum bill on the House floor (video at 42:57)',
  'Presented his Medicare Supplement Insurance bill on the House floor (video at 55:20)',
  'Presented her Veteran Protections bill on the House floor',
  'Carried her Bicycle Lane Safety bill on the House floor (video at 1:24:17)',
  'Presented her Criminal Sexual Conduct bill creating new offenses (video at 1:06:47)',
  'Presented her Diaper Program bill on the House floor (video at 1:40:15)',
  'Presented his Vehicle Assessment bill on the House floor (video at 1:23:44)',
  'Carried his State Parks Modifications bill on the House floor (video at 1:30:47)',
  'Presented her Public Education Revisions bill on the House floor (video at 25:11)',
  'Carried her School Trust Land Amendments on the House floor (video at 34:32)',
  'Presented her Nonresident Online School bill on the House floor (video at 52:09)',
  'Presented his Dangerous Weapons exemptions bill on the House floor (video at 44:30)',
  'Carried his Transportation Procurement bill on the House floor (video at 15:39)',
  'Presented his Minors in State Custody benefits bill on the House floor (video at 1:16:37)',
  'Carried his social-media Data Sharing bill on the House floor (video at 1:22:32)',
  'Presented her Food Additives in Schools bill on the House floor (video at 1:39:05)',
  'Carried her SNAP Funds bill on the House floor (video at 38:03)',
  'Presented his Emergency Communications bill on the House floor (video at 12:36)',
  'Carried his Agricultural Water Optimization bill on the House floor (video at 16:12)',
  'Presented his Landlord Communication bill on the House floor (video at 17:49)',
  'Presented his State Land Access Road bill on the House floor (video at 1:22:25)',
  'Carried his Public Asset Ownership bill on the House floor (video at 22:16)',
]);

const IDS = [
  'tiara_auxier', 'jill_koford', 'nicholeen_p_peck', 'jake_fitisemanu', 'verona_mauga',
  'rosalba_dominguez', 'clinton_okerlund', 'tracy_miller', 'calvin_roberts', 'doug_fiefia',
  'kristen_chevrier', 'david_shallenberger', 'troy_shelley',
];

const billOf = (s) => {
  const u = (s && s.source && s.source.url) || '';
  const m = u.match(/static\/([A-Z]+\d+)\.html/);
  return m ? m[1] : null;
};
const isMine = (s) => MY_HEADLINES.has(s && s.headline);
// Integer evidence score — connectedness + proof only. Facts length is NOT part
// of the score, so two genuine floor-video cards tie and the tie-break (prefer
// the pre-existing card) decides — we never delete a pre-existing rich card just
// because our wording is a few characters longer.
function richness(s) {
  let r = 0;
  if (s.media && s.media.timestamp) r += 4;
  if (s.media) r += 2;
  if (s.issueKey) r += 2;
  return r;
}

// Keep exactly one item per affected bill (a bill that has a wave-8 item AND a
// collision). On an evidence-score tie, prefer the PRE-EXISTING card so our own
// duplicate is the one dropped; a generic stub (no media/issueKey) always loses
// to the verified wave-8 floor-video card.
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
    if (idxs.length < 2) continue;
    if (!idxs.some((i) => isMine(spotlight[i]))) continue; // only touch collisions we created
    let keep = idxs[0];
    for (const i of idxs) {
      const a = spotlight[i], b = spotlight[keep];
      const ra = richness(a), rb = richness(b);
      if (ra > rb) keep = i;
      else if (ra === rb && isMine(b) && !isMine(a)) keep = i; // prefer pre-existing on tie
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

let totalRemoved = 0, membersChanged = 0;
for (const id of IDS) {
  const doc = await getDoc(id);
  if (doc === '__throttled__') { console.log(`!! THROTTLED ${id}`); continue; }
  if (!doc) { console.log(`!! MISSING ${id}`); continue; }
  const sp = Array.isArray(doc.spotlight) ? doc.spotlight : [];
  const { kept, removed } = reconcile(sp);
  if (!removed.length) { console.log(`= ${id}: no collisions (${sp.length} items)`); continue; }
  membersChanged++;
  totalRemoved += removed.length;
  console.log(`~ ${id} (${doc.name}): ${sp.length} -> ${kept.length}  (removed ${removed.length})`);
  removed.forEach((s) => console.log(`    − [${isMine(s) ? 'wave8-dup' : 'pre-existing-stub'}] ${billOf(s)} #${s.issueKey || '∅'}  ${s.headline}`));
  if (APPLY) { await patchSpotlight(id, kept); console.log('    ✓ written'); await sleep(1500); }
}
console.log('\n──────── summary ────────');
console.log(`members changed   : ${membersChanged}`);
console.log(`duplicate cards removed : ${totalRemoved}`);
console.log(APPLY ? '\nAPPLIED to Firestore.' : '\nDRY RUN — re-run with --apply to write.');
