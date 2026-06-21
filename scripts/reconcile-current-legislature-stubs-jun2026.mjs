#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — library-wide same-bill Spotlight stub reconcile for the CURRENT
// sitting Utah State Legislature, House + Senate (Jun 2026).
//
// Successor to the earlier reconcile passes:
//   reconcile-senate-stubs-jun2026.mjs   (Senate only)
//   reconcile-library-stubs-jun2026.mjs  (library-wide, strict UPPERCASE match)
//   reconcile-broad-stubs-jun2026.mjs    (library-wide, format-robust bill key)
//   reconcile-wave8-duplicates-jun2026.mjs
//
// Across many floor- and committee-video evidence waves (video-evidence 1–3,
// x-and-video 4–5, multisource 7, thinnest-freshmen 8, Senate 9–12,
// committee-video 1–3, …) verified official video Spotlight items were added
// for sitting members. For some bills the member ALSO still carries an earlier,
// non-video card on the SAME bill — a generic / unconnected stub with no
// issueKey and no media — so one bill ends up with two cards: a thin "signed
// into law" boilerplate stub and the rich, connected video card that already
// captures that same outcome in its facts.
//
// This pass enforces exactly ONE card per bill per member, keeping the single
// most rigorous, connected version. Richness scoring is identical to the prior
// reconciles, so behaviour is unchanged on the bills they already cover:
//
//   richness = (media.timestamp ? 4 : 0)
//            + (media && media.type === 'video' ? 3 : 0)
//            + (media ? 1 : 0)
//            + (issueKey ? 2 : 0)
//
//   • A generic stub (no issueKey, no media) always loses to a verified
//     floor/committee-video card (official bill link + video + validated
//     issueKey + timestamp where available), so the surviving card stays
//     connected to the evidence map and backed by its video.
//   • If two genuine video cards collide on a bill, the one carrying an exact
//     timestamp wins; on a true tie the FIRST (pre-existing) card is kept, so
//     nothing rich is ever dropped for a few characters of wording.
//
// WHY ONLY THE OFFICIAL BILL-RECORD URL IS USED AS THE BILL KEY.
// The key is derived purely from le.utah.gov bill-record / bill-PDF URLs, with
// case folded and zero-padding normalised (sb0098.html -> SB98, HB0249.pdf and
// HB249 -> HB249). It deliberately does NOT group cards by a bill code that only
// appears in headline prose. Inspection showed those headline-only matches are
// usually DISTINCT facts about the same bill (e.g. "presented in committee" vs
// "signed into law" vs "vetoed" vs an X-post of advocacy), not redundant copies
// of one event — collapsing them would delete real, individually-sourced record.
// Matching on the official bill URL is the strong signal that two cards document
// the same legislative action, which is the only case this pass collapses.
//
// CONTENT_STYLE.md: this pass removes weaker duplicates only; it authors no new
// prose. Every surviving card was already written to the individual-record
// standard, so the library stays compliant.
//
// SCOPE: current sitting Utah State Legislators only (House + Senate). Federal
// officeholders, former legislators, and 2026 candidates are excluded by the
// office filter, matching the task scope.
//
// SAFETY: only bill GROUPS with 2+ cards on the same official bill are ever
// touched. Single-card bills are never modified, so coverage can only get
// cleaner, never thinner. The kept card always scores >= every card dropped from
// its bill, so a unique high-quality card is never deleted. Writes patch only
// `spotlight` + `updatedAt`, with 429 backoff. Idempotent: after a run each bill
// has one card and a re-run is a no-op.
//
//   node scripts/reconcile-current-legislature-stubs-jun2026.mjs            # dry run
//   node scripts/reconcile-current-legislature-stubs-jun2026.mjs --apply    # write
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

// The bill a Spotlight card points at, from its official source URL — format
// robust and normalised so the same bill referenced through different official
// URLs (case, enrolled PDF, zero-padding) groups together. Returns null for
// non-bill links (floor/committee archive, news, social) so unrelated cards are
// never merged.
function billOf(s) {
  const u = (s && s.source && s.source.url) || '';
  if (!/le\.utah\.gov/i.test(u)) return null;
  const m = u.match(/\/([A-Za-z]{2,4}\d{3,4})\.(?:html|pdf)(?:[?#].*)?$/i);
  if (!m) return null;
  const code = m[1].toUpperCase();
  const mm = code.match(/^([A-Z]+)0*(\d+)$/); // fold zero-padding: HB0249 -> HB249
  return mm ? `${mm[1]}${mm[2]}` : code;
}
const isVideo = (s) => !!(s && s.media && s.media.type === 'video');
function richness(s) {
  let r = 0;
  if (s.media && s.media.timestamp) r += 4;
  if (s.media && s.media.type === 'video') r += 3;
  if (s.media) r += 1;
  if (s.issueKey) r += 2;
  return r;
}

// Keep exactly one card per bill that has a collision (2+ cards on the same
// official bill). The richest connected card wins; on a tie keep the earliest
// (so a pre-existing rich card is never replaced by a duplicate). Single-card
// bills are untouched.
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
  removed.forEach((s) => { if (isVideo(s)) videoDupRemoved++; else genericRemoved++; });
  byMember.push({ id: r.id, name: r.name, office: r.office, before: sp.length, after: kept.length, removed: removed.length });
  console.log(`~ ${r.id} (${r.name}) [${r.office}]: ${sp.length} -> ${kept.length}  (removed ${removed.length})`);
  removed.forEach((s) => console.log(`    − [${isVideo(s) ? 'video-dup' : 'generic-stub'}] ${billOf(s)} #${s.issueKey || '∅'}  ${s.headline || s.title}`));
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
