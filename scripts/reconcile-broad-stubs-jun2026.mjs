#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — BROAD same-bill Spotlight stub reconcile, House + Senate (Jun 2026)
//
// Successor to reconcile-senate-stubs-jun2026.mjs (Senate-only) and
// reconcile-library-stubs-jun2026.mjs (library-wide, strict bill match). Many
// floor-video evidence waves (video-evidence wave1–3, x-and-video wave4–5,
// multisource wave7, thinnest-freshmen wave8, Senate wave9–12, committee-video,
// …) added verified official floor-video Spotlight items across the whole
// sitting Utah Legislature. For some bills the member ALSO still carries an
// earlier, non-floor-video card on the SAME bill — a generic / unconnected stub
// with no issueKey and/or no media. That leaves two cards for one bill.
//
// This pass enforces exactly ONE card per bill per member, keeping the single
// most rigorous, connected version, with the SAME richness scoring as the prior
// reconciles so behaviour is identical on the bills they already cover:
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
//   • If two genuine floor-video cards collide on a bill, the one carrying an
//     exact timestamp wins; on a true tie the FIRST (pre-existing) card is kept,
//     so nothing rich is ever dropped for a few characters of wording.
//
// WHAT IS BROADER HERE — a format-robust bill key. The earlier passes matched
// only `…/static/HB1234.html` with an UPPERCASE regex, so a weak stub that
// pointed at the same bill through a different official URL slipped past the
// collision check and survived next to the floor-video card. This extractor
// recognises the bill code in any le.utah.gov bill URL and normalises it, so
// those stragglers are caught too:
//
//   • case-insensitive   (…/static/sb0098.html  ->  SB98)
//   • enrolled / engrossed PDFs (…/enrolled/HB0249.pdf, …/hbillenr/HB0432.pdf)
//   • zero-padding folded (HB0249 and HB249 are the same bill)
//
// It only ever fires on real bill-record / bill-PDF URLs; floor- and committee-
// archive links (…/av/floorArchive.jsp?…) carry no bill path and return null, so
// genuinely different bills are never merged.
//
// SCOPE: current sitting Utah State Legislators only (House + Senate). Federal
// officeholders, former legislators, and 2026 candidates are excluded by the
// office filter, matching the task scope.
//
// SAFETY: only bill-GROUPS with 2+ cards on the same bill are ever touched. Bills
// with a single card are never modified, so coverage can only get cleaner, never
// thinner. The kept card always scores >= every card dropped from its bill, so a
// unique high-quality card is never deleted. Writes patch only `spotlight` +
// `updatedAt`, with 429 backoff. Idempotent: after reconciliation each bill has
// one card and a re-run is a no-op.
//
//   node scripts/reconcile-broad-stubs-jun2026.mjs            # dry run
//   node scripts/reconcile-broad-stubs-jun2026.mjs --apply    # write
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

// Current sitting Utah State Legislator (House or Senate)? Emoji icons are
// stripped first, then 2026 candidates / former members / federal & local
// officeholders are excluded, leaving only sitting state House & Senate members.
function isCurrentUtahLeg(office) {
  const o = String(office || '').normalize('NFKD').replace(/[^\x00-\x7F]/g, '').trim();
  const ol = o.toLowerCase();
  if (!ol) return false;
  if (/former|candidate|nominee|withdrawn|2026|2024/.test(ol)) return false;
  if (/u\.s\.|president|governor|secretary|treasurer|auditor|attorney general|insurance commissioner|mayor|county|ambassador|intelligence|hhs|defense|speaker of the|director/.test(ol)) return false;
  return /utah state senator|utah state representative|utah house of representatives|utah state senate|utah senate president|^state representative|^state senator/.test(ol);
}

// The bill a Spotlight card points at, from its source URL — format-robust and
// normalised so the same bill referenced through different official URLs (case,
// enrolled PDF, zero-padding) groups together. Returns null for non-bill links
// (floor/committee archive, news, social) so unrelated cards are never merged.
function billOf(s) {
  const u = (s && s.source && s.source.url) || '';
  if (!/le\.utah\.gov/i.test(u)) return null;
  const m = u.match(/\/([A-Za-z]{2,4}\d{3,4})\.(?:html|pdf)(?:[?#].*)?$/i);
  if (!m) return null;
  const code = m[1].toUpperCase();
  const mm = code.match(/^([A-Z]+)0*(\d+)$/); // fold zero-padding: HB0249 -> HB249
  return mm ? `${mm[1]}${mm[2]}` : code;
}
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

// Fetch the full politicians collection, decode, and keep sitting legislators.
async function loadLegislators() {
  const out = [];
  let token = null;
  do {
    const url = `${BASE}?pageSize=300${token ? `&pageToken=${encodeURIComponent(token)}` : ''}`;
    let r;
    for (let a = 0; a < 8; a++) {
      r = await fetch(url);
      if (r.ok) break;
      if (r.status === 429) { await sleep(8000 * (a + 1)); continue; }
      throw new Error(`LIST -> ${r.status} ${await r.text()}`);
    }
    const j = await r.json();
    for (const d of j.documents || []) {
      const o = { id: d.name.split('/').pop() };
      for (const [k, val] of Object.entries(d.fields || {})) o[k] = dec(val);
      out.push(o);
    }
    token = j.nextPageToken;
  } while (token);
  return out.filter((r) => isCurrentUtahLeg(r.office) && Array.isArray(r.spotlight) && r.spotlight.length);
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

const legs = await loadLegislators();
console.log(`Scanning ${legs.length} sitting Utah legislators with Spotlight cards (House + Senate).`);

let totalRemoved = 0, genericRemoved = 0, videoDupRemoved = 0, membersChanged = 0;
const byMember = [];
for (const r of legs) {
  const sp = r.spotlight;
  const { kept, removed } = reconcile(sp);
  if (!removed.length) continue;
  membersChanged++;
  totalRemoved += removed.length;
  removed.forEach((s) => { if (isFloorVideo(s)) videoDupRemoved++; else genericRemoved++; });
  byMember.push({ id: r.id, name: r.name, office: r.office, before: sp.length, after: kept.length, removed: removed.length });
  console.log(`~ ${r.id} (${r.name}) [${r.office}]: ${sp.length} -> ${kept.length}  (removed ${removed.length})`);
  removed.forEach((s) => console.log(`    − [${isFloorVideo(s) ? 'video-dup' : 'generic-stub'}] ${billOf(s)} #${s.issueKey || '∅'}  ${s.headline || s.title}`));
  if (APPLY) { await patchSpotlight(r.id, kept); console.log('    ✓ written'); await sleep(1500); }
}

byMember.sort((a, b) => b.removed - a.removed);
console.log('\n──────── biggest cleanups ────────');
byMember.slice(0, 10).forEach((m) => console.log(`  ${m.removed}  ${m.name} [${m.office}]  ${m.before} -> ${m.after}`));

console.log('\n──────── summary ────────');
console.log(`legislators scanned       : ${legs.length}`);
console.log(`legislators changed       : ${membersChanged}`);
console.log(`duplicate cards removed   : ${totalRemoved}`);
console.log(`  generic/unconnected stubs: ${genericRemoved}`);
console.log(`  redundant video dups     : ${videoDupRemoved}`);
console.log(APPLY ? '\nAPPLIED to Firestore.' : '\nDRY RUN — re-run with --apply to write.');
