#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — June 2026 office-tenure backfill (batch 2)
//
// Extends scripts/add-office-tenure-jun2026.mjs (which seeded Utah's federal
// delegation + a handful of state-legislature incumbents) to a much wider set
// of HIGH-VISIBILITY officeholders so cards, profile modals, and Key Races can
// show HOW LONG someone has held power — not just an "In Office" badge.
//
//   termStart — when the official began serving in their CURRENT office.
//   termEnd   — present only for FORMER officeholders; renders "Served A – B".
//
// Both accept a plain year ("2009"), a month-year ("2021-01"), or an ISO date.
// Every date below was verified against public records (Ballotpedia, Wikipedia,
// official .gov / legislature directories, and news archives) — see the project
// summary for per-person citations. NO dates are invented; anything that could
// not be confirmed was left out entirely.
//
//   node scripts/add-office-tenure-batch2-jun2026.mjs            # dry run
//   node scripts/add-office-tenure-batch2-jun2026.mjs --apply    # write
//
// Each run re-fetches the live doc and writes ONLY termStart/termEnd (+ a
// matching updatedAt) via an updateMask, so it is safe and idempotent to re-run.
// ---------------------------------------------------------------------------

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const STAMP = '2026-06-16T00:00:00.000Z';

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

// ── Verified office tenure ──────────────────────────────────────────────────
// current officeholders → termStart only.  former → termStart + termEnd.
const PLAN = {
  // ── Federal: executive (current administration, sworn 2025) ───────────────
  trump:    { termStart: '2025-01', note: 'President (47th), inaugurated Jan 20, 2025' },
  hegseth:  { termStart: '2025-01', note: 'Secretary of Defense, sworn in Jan 25, 2025' },
  tgabbard: { termStart: '2025-02', note: 'Director of National Intelligence, sworn in Feb 12, 2025' },
  rfkjr:    { termStart: '2025-02', note: 'Secretary of Health & Human Services, sworn in Feb 13, 2025' },
  // ── Federal: former executive ─────────────────────────────────────────────
  biden:    { termStart: '2021-01', termEnd: '2025-01', note: 'President (46th), Jan 20, 2021 – Jan 20, 2025' },
  obama:    { termStart: '2009-01', termEnd: '2017-01', note: 'President (44th), Jan 20, 2009 – Jan 20, 2017' },
  gwbush:   { termStart: '2001-01', termEnd: '2009-01', note: 'President (43rd), Jan 20, 2001 – Jan 20, 2009' },
  nhaley:   { termStart: '2017-01', termEnd: '2018-12', note: 'U.S. Ambassador to the UN, Jan 2017 – end of Dec 2018' },
  // ── Federal: U.S. Senate / House (current) ────────────────────────────────
  sanders:  { termStart: '2007-01', note: 'U.S. Senator (VT), entered Senate Jan 3, 2007' },
  massie:   { termStart: '2012-11', note: 'U.S. Rep KY-04, took office Nov 13, 2012 (special election)' },
  boebert:  { termStart: '2021-01', note: 'U.S. Rep CO, took office Jan 3, 2021 (CO-03; now CO-04)' },
  rfine:    { termStart: '2025-04', note: 'U.S. Rep FL-06, took office Apr 2, 2025 (special election)' },
  // ── Federal: U.S. House (former) ──────────────────────────────────────────
  cstewart: { termStart: '2013-01', termEnd: '2023-09', note: 'U.S. Rep UT-02, Jan 3, 2013 – resigned Sept 15, 2023' },
  gaetz:    { termStart: '2017-01', termEnd: '2024-11', note: 'U.S. Rep FL-01, Jan 3, 2017 – resigned Nov 2024' },
  mtg:      { termStart: '2021-01', termEnd: '2026-01', note: 'U.S. Rep GA-14, Jan 3, 2021 – resigned eff. Jan 5, 2026' },
  // ── Utah statewide (current) ──────────────────────────────────────────────
  derek_brown: { termStart: '2025-01', note: 'Utah Attorney General, sworn in Jan 6, 2025' },
  moaks:       { termStart: '2021-07', note: 'Utah State Treasurer, took office July 2021' },
  tcamp:       { termStart: '2025-01', note: 'Utah State Auditor, sworn in Jan 6, 2025' },
  dhenderson:  { termStart: '2021-01', note: 'Utah Lieutenant Governor, took office Jan 4, 2021' },
  jpike:       { termStart: '2021-02', note: 'Utah Insurance Commissioner, confirmed Feb 2021' },
  // ── Utah statewide (former) ───────────────────────────────────────────────
  sreyes:     { termStart: '2013-12', termEnd: '2025-01', note: 'Utah Attorney General, Dec 30, 2013 – Jan 2025' },
  jdougall:   { termStart: '2013-01', termEnd: '2025-01', note: 'Utah State Auditor, Jan 7, 2013 – Jan 6, 2025' },
  ddamschen:  { termStart: '2015-12', termEnd: '2021-04', note: 'Utah State Treasurer, Dec 2015 – resigned Apr 2021' },
  // ── Utah mayors (current) ─────────────────────────────────────────────────
  emendenhall: { termStart: '2020-01', note: 'Mayor of Salt Lake City, sworn in Jan 6, 2020' },
  jwilson:     { termStart: '2019-01', note: 'Salt Lake County Mayor, took office Jan 2019' },
  dramsey:     { termStart: '2018-01', note: 'Mayor of South Jordan, took office Jan 2018' },
  rwood:       { termStart: '2014-01', note: 'Mayor of Draper, took office Jan 2014' },
  dwatts:      { termStart: '2022-01', note: 'Mayor of Sandy, sworn in Jan 2022' },
  jpetro:      { termStart: '2020-01', note: 'Mayor of Layton, term began Jan 2020' },
  // ── Utah State Senate (current) ───────────────────────────────────────────
  evickers:      { termStart: '2013-01', note: 'Utah State Senate since Jan 2013 (prior House 2009-13)' },
  lescamilla:    { termStart: '2009-01', note: 'Utah State Senate since Jan 2009' },
  ssandall:      { termStart: '2019-01', note: 'Utah State Senate since Jan 2019 (prior House 2015-18)' },
  kcullimore:    { termStart: '2019-01', note: 'Utah State Senate since Jan 2019' },
  dmccay:        { termStart: '2019-01', note: 'Utah State Senate since Jan 2019 (prior House 2012-18)' },
  mmckell:       { termStart: '2021-01', note: 'Utah State Senate since Jan 2021 (prior House 2013-21)' },
  dhinkins:      { termStart: '2009-01', note: 'Utah State Senate since Jan 2009' },
  wharper:       { termStart: '2013-01', note: 'Utah State Senate since Jan 2013 (prior House 1997-2012)' },
  kriebe:        { termStart: '2019-01', note: 'Utah State Senate since Jan 2019' },
  tweiler:       { termStart: '2012-01', note: 'Utah State Senate since Jan 2012' },
  dipson:        { termStart: '2016-09', note: 'Utah State Senate since Sept 2016 (prior House 2009-16)' },
  cmusselman:    { termStart: '2025-01', note: 'Utah State Senate since Jan 2025 (prior House 2019-24)' },
  cwilson:       { termStart: '2021-01', note: 'Utah State Senate since Jan 2021' },
  rwinterton:    { termStart: '2019-01', note: 'Utah State Senate since Jan 2019' },
  spitcher:      { termStart: '2023-01', note: 'Utah State Senate since Jan 2023 (prior House 2019-22)' },
  dowens_st:     { termStart: '2021-01', note: 'Utah State Senate since Jan 2021 (prior House 2015-20)' },
  lfillmore:     { termStart: '2016-01', note: 'Utah State Senate since Jan 2016' },
  brady_brammer: { termStart: '2025-01', note: 'Utah State Senate since Jan 2025 (prior House 2019-24)' },
  kstratton:     { termStart: '2025-01', note: 'Utah State Senate since Jan 2025 (prior House 2012-24)' },
  // ── Utah State Senate / House (former) ────────────────────────────────────
  cbramble: { termStart: '2001-01', termEnd: '2024-12', note: 'Utah State Senate, Jan 2001 – Dec 2024 (retired)' },
  bwilson:  { termStart: '2011-01', termEnd: '2023-11', note: 'Utah House, Jan 2011 – resigned Nov 2023 (former Speaker)' },
  // ── Utah House (current) ──────────────────────────────────────────────────
  mschultz: { termStart: '2015-01', note: 'Utah House since Jan 2015 (Speaker since Nov 2023)' },
  aromero:  { termStart: '2013-01', note: 'Utah House since Jan 2013 (House Minority Leader)' },
  rward:    { termStart: '2015-01', note: 'Utah House since Jan 2015' },
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

console.log(`PolitiDex — office-tenure backfill (batch 2)  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
let touched = 0, skipped = 0;
for (const [id, spec] of Object.entries(PLAN)) {
  let doc;
  try {
    doc = await getDoc(id);
  } catch (e) {
    console.log(`  ✗ ${id}: ${e.message}`);
    skipped++;
    continue;
  }
  const fields = { termStart: spec.termStart, updatedAt: STAMP };
  if (spec.termEnd) fields.termEnd = spec.termEnd;
  const span = spec.termEnd ? `${spec.termStart} – ${spec.termEnd}` : `since ${spec.termStart}`;
  console.log(`  ${APPLY ? '✎' : '→'} ${id} (${doc.name || ''}): ${span}  — ${spec.note}`);
  if (APPLY) await patch(id, fields);
  touched++;
}
console.log(`\n${APPLY ? 'Applied' : 'Would apply'} tenure to ${touched} profile(s)${skipped ? `, ${skipped} skipped` : ''}.`);
if (!APPLY) console.log('Re-run with --apply to write to Firestore.');
