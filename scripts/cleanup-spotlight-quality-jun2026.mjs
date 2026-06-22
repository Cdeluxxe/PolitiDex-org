#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — Spotlight quality cleanup & reconciliation for the CURRENT
// sitting Utah State Legislature (House + Senate), Jun 2026.
//
// Successor to the reconcile-*-stubs / reconcile-*-duplicates passes. Those
// earlier passes collapsed same-bill collisions detected purely by the official
// le.utah.gov bill-record URL. This pass closes the two gaps they deliberately
// left open, applying human-reviewed judgement rather than a blanket rule:
//
//   1. GENERIC / NON-EVIDENTIARY STUBS. A handful of cards describe a
//      legislator's identity, tenure, or committee role ("First Black woman
//      elected", "Served six years as Majority Leader", "Civil engineer who
//      chairs Transportation") with no specific bill, action, or recorded
//      statement attached. Per the cleanup brief, every Spotlight item must
//      connect to a specific bill/action the member took OR a direct recorded
//      statement (video/post). Pure biographical status facts fail that test —
//      they belong in a bio, not the evidence layer — so they are removed.
//      None of these is a member's only card; each leaves behind a stronger,
//      fully-connected item ("fewer but stronger" is acceptable).
//
//   2. SAME-BILL DUPLICATES the URL-only reconcile could not see, because only
//      ONE of the two cards carried the official bill-record URL (the other
//      referenced the bill only in prose / floor-archive link). Where the brief's
//      canonical example holds — the SAME bill carries both a floor-video and a
//      committee-video card, or a thin "signed into law" stub alongside the rich
//      video card — the strongest, most-informative version is kept and the
//      weaker duplicate removed. The kept card is chosen by the same richness
//      rule the prior passes used (timestamp > video > media > issueKey), with
//      ties broken toward the card linked to the official bill record so the
//      surviving item stays connected to the evidence map.
//
// Cards documenting genuinely DISTINCT facts about one bill (a committee quote
// vs. a floor presentation, a signing outcome vs. a presentation, a bill's death
// vs. an X-post defending it, opposite-impact framings) are LEFT ALONE — they
// are individually sourced record, not redundant copies, exactly as the prior
// reconcile notes warned.
//
// NOT IN SCOPE / deliberately untouched: the large family of templated
// "promise-style" cards (imperative headline + boilerplate "why"). Every one of
// those references a real enacted bill in its facts, and for many thin members
// they are the entire substantive record — removing or mass-rewriting them would
// either gut coverage or author new prose, both of which the brief forbids
// ("be honest with thin records… do not invent content… focus on quality and
// consistency rather than adding large volumes of new content"). They are
// reported as an observed pattern instead.
//
// SAFETY: removals are matched by (member name + exact headline), so an index
// drift cannot delete the wrong card; each target must match exactly one card or
// the run aborts. No member is ever reduced below one card. Writes patch only
// `spotlight` + `updatedAt`, with 429 backoff. Idempotent: a re-run is a no-op.
//
//   node scripts/cleanup-spotlight-quality-jun2026.mjs            # dry run
//   node scripts/cleanup-spotlight-quality-jun2026.mjs --apply    # write
// ---------------------------------------------------------------------------

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const STAMP = '2026-06-22T00:00:00.000Z';

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

function isCurrentUtahLeg(office) {
  const o = String(office || '').normalize('NFKD').replace(/[^\x00-\x7F]/g, '').trim();
  const ol = o.toLowerCase();
  if (!ol) return false;
  if (/former|candidate|nominee|withdrawn|2026|2024/.test(ol)) return false;
  if (/u\.s\.|president|governor|secretary|treasurer|auditor|attorney general|insurance commissioner|mayor|county|ambassador|intelligence|hhs|defense|speaker of the|director/.test(ol)) return false;
  return /utah state senator|utah state representative|utah house of representatives|utah state senate|utah senate president|^state representative|^state senator/.test(ol);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

// Each target: the member name + the EXACT headline of the card to remove, with
// a one-line reason. Grouped by cleanup category for the summary.
const REMOVALS = [
  // ── Generic / non-evidentiary stubs (identity, tenure, committee role) ──
  { name: 'Angela Romero',      headline: 'House Minority Leader and Shoshone-Bannock tribal member',                              cat: 'stub-bio',  reason: 'role + identity, no specific action or statement; keeps her rape-kit-backlog bill card' },
  { name: 'Evan Vickers',       headline: 'Served six years as Senate Majority Leader',                                            cat: 'stub-bio',  reason: 'tenure recap, no specific action or statement' },
  { name: 'Hoang Nguyen',       headline: "Utah's first Vietnamese-American and first refugee legislator",                         cat: 'stub-bio',  reason: 'biographical milestone, no action/statement; keeps her HB391 floor-video card' },
  { name: 'Kay Christofferson', headline: 'Civil engineer who chairs the House Transportation Committee',                          cat: 'stub-bio',  reason: 'profession + committee role, no specific action or statement' },
  { name: 'Luz Escamilla',      headline: 'First Latina and first immigrant elected to the Utah Legislature',                      cat: 'stub-bio',  reason: 'identity milestone, no action/statement; 6 stronger cards remain' },
  { name: 'Sandra Hollins',     headline: 'First Black woman elected to the Utah Legislature',                                     cat: 'stub-bio',  reason: 'identity milestone, no action/statement; keeps her slavery-exception amendment card' },
  { name: 'Wayne Harper',       headline: "Among the Legislature's most senior members, now Senate President Pro Tempore",         cat: 'stub-bio',  reason: 'tenure + role, no specific action or statement; 8 stronger cards remain' },

  // ── Same-bill duplicates: keep the strongest, drop the weaker ──
  { name: 'Val Peterson',       headline: "House budget chief overseeing Utah's state budget",                                    cat: 'dup-bill',  reason: 'role-stub; its HB260 content is fully covered by the official bill-record video card' },
  { name: 'Colin W. Jack',      headline: 'Protect rooftop-solar consumers',                                                      cat: 'dup-bill',  reason: 'generic stub on HB57; richer floor-video card on the same bill kept' },
  { name: 'Jason B. Kyle',      headline: 'Regulate recovery residence sober-living homes',                                       cat: 'dup-bill',  reason: 'generic stub on HB296; richer floor-video card on the same bill kept' },
  { name: 'David Hinkins',      headline: 'Presented his newborn-relinquishment safe-haven bill before a Senate committee (SB57)', cat: 'dup-bill', reason: 'SB57 committee video duplicates the richer floor-video card (timestamped) kept' },
  { name: 'Verona Mauga',       headline: 'Floor-sponsored a new criminal offense for VR-enabled sexual acts with minors',         cat: 'dup-bill', reason: 'HB358 floor card shares the exact timestamp of the kept bill-record video card' },
  { name: 'Verona Mauga',       headline: 'Presented a statewide bike-lane safety law on the House floor',                         cat: 'dup-bill', reason: 'HB290 floor card shares the exact timestamp of the kept bill-record video card' },
  { name: 'Tiara Auxier',       headline: 'Presented her property-tax bill halting an automatic statewide increase',               cat: 'dup-bill', reason: 'HB110 floor card shares the exact timestamp of the kept bill-record video card (radio interview kept)' },

  // ── Vague duplicate of a more specific card on the same record ──
  { name: 'Ariel Defay',        headline: 'Make education policy her primary legislative focus',                                  cat: 'dup-vague', reason: 'vague restatement of her BALANCE Act card (#0), which names the actual enacted bill' },
];

const legs = await loadLegislators();
const byName = new Map();
for (const r of legs) {
  if (!byName.has(r.name)) byName.set(r.name, []);
  byName.get(r.name).push(r);
}

let errors = 0;
const plan = new Map(); // id -> { rec, removeHeadlines:Set }
for (const t of REMOVALS) {
  const recs = byName.get(t.name) || [];
  if (recs.length === 0) { console.error(`✗ no current legislator named "${t.name}"`); errors++; continue; }
  if (recs.length > 1) { console.error(`✗ ambiguous name "${t.name}" (${recs.length} records)`); errors++; continue; }
  const rec = recs[0];
  const matches = rec.spotlight.filter((s) => (s.headline || '') === t.headline);
  if (matches.length !== 1) { console.error(`✗ "${t.name}" headline matched ${matches.length} cards: ${t.headline}`); errors++; continue; }
  if (!plan.has(rec.id)) plan.set(rec.id, { rec, set: new Set() });
  plan.get(rec.id).set.add(t.headline);
}
if (errors) { console.error(`\nAborting: ${errors} unmatched/invalid target(s).`); process.exit(1); }

const counts = { 'stub-bio': 0, 'dup-bill': 0, 'dup-vague': 0 };
for (const t of REMOVALS) counts[t.cat]++;

console.log(`Scanned ${legs.length} sitting Utah legislators with Spotlight cards.`);
console.log(`Planned removals: ${REMOVALS.length}  (bio/role stubs ${counts['stub-bio']}, same-bill dups ${counts['dup-bill']}, vague dups ${counts['dup-vague']})`);
console.log('────────────────────────────────────────');

let changed = 0, removed = 0;
for (const { rec, set } of plan.values()) {
  const kept = rec.spotlight.filter((s) => !set.has(s.headline || ''));
  if (kept.length === 0) { console.error(`✗ refusing to empty ${rec.name}`); process.exit(1); }
  changed++; removed += rec.spotlight.length - kept.length;
  console.log(`~ ${rec.name} [${String(rec.office).replace(/[^\x00-\x7F]/g, '').trim()}]: ${rec.spotlight.length} -> ${kept.length}`);
  for (const t of REMOVALS.filter((x) => x.name === rec.name && set.has(x.headline))) {
    console.log(`    − [${t.cat}] ${t.headline}\n        ${t.reason}`);
  }
  if (APPLY) { await patchSpotlight(rec.id, kept); console.log('    ✓ written'); await sleep(1500); }
}

console.log('\n──────── summary ────────');
console.log(`legislators changed   : ${changed}`);
console.log(`items removed         : ${removed}`);
console.log(`  bio/role/identity   : ${counts['stub-bio']}`);
console.log(`  same-bill duplicates: ${counts['dup-bill']}`);
console.log(`  vague duplicates    : ${counts['dup-vague']}`);
console.log(APPLY ? '\nAPPLIED to Firestore.' : '\nDRY RUN — re-run with --apply to write.');
