#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — mark June 23, 2026 Utah primary outcomes
//
// The site now reads a single structured `candidacyStatus` flag to tell voters,
// at a glance, whether a politician is STILL a live choice for the November 3,
// 2026 general election or has been knocked out of the race. This script
// records the verified results of the June 23, 2026 Utah primary:
//
//   • candidacyStatus = 'eliminated_primary' on the candidates who LOST their
//     primary and are not advancing to the general election. The UI turns this
//     into a clear "Lost Primary — not advancing to the general election" banner
//     on the profile, the medium-card modal and the Relevant-to-Me / Home Team
//     cards, plus a small "✖ Lost Primary" badge on browse cards. No profile is
//     hidden or removed — only labeled honestly.
//
//   • candidacyStatus = 'active' on the head-to-head primary WINNERS who advance,
//     so a voter comparing the two names in a race sees an explicit contrast
//     (Active Candidate vs. Lost Primary). 'active' is also the implicit default
//     for every other Utah record (the UI treats an absent flag as active), so
//     this only stamps the verified winners for crisp side-by-side clarity.
//
//   node scripts/mark-utah-primary-results-jun2026.mjs            # dry run
//   node scripts/mark-utah-primary-results-jun2026.mjs --apply    # write
//
// Honesty rules (matching the rest of the site):
//   • Every outcome below is taken from published, named election-night results
//     and concessions reported on June 23–24, 2026 (KSL, The Salt Lake Tribune,
//     Utah News Dispatch, Deseret News, KUER, Standard-Examiner). Nothing is
//     inferred from prose — this only structures a verified, sourced fact.
//   • `candidacyOutcome` is a short, sourced one-line summary surfaced under the
//     status banner, mirroring the field already present on convention-era
//     concluded-candidate docs.
//   • Idempotent: each run re-fetches the live doc and only writes when the
//     target value differs, and it never overwrites an existing CONCLUDED status
//     with 'active'. Safe to re-run.
// ---------------------------------------------------------------------------

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const STAMP = '2026-06-24T00:00:00.000Z';

// Any of these existing values means a candidacy already concluded — never
// downgrade one of them to 'active'.
const CONCLUDED = new Set(['eliminated', 'eliminated_primary', 'lost_primary', 'lost', 'withdrew', 'withdrawn', 'suspended', 'conceded', 'defeated']);

// ── verified, sourced June 23, 2026 primary outcomes ───────────────────────
// Lost their primary — not advancing to the November general election.
const LOST_PRIMARY = [
  { id: 'sadams',          outcome: 'Lost the June 23, 2026 Republican primary for his Utah Senate seat, conceding to challenger Stephanie Hollist (about 43% to 35%); the longtime Senate President will not appear on the November ballot.' },
  { id: 'dmccay',          outcome: 'Lost the June 23, 2026 Republican primary in Senate District 18 to Rep. Doug Fiefia, 31% to 69%, and conceded; does not advance to the general election.' },
  { id: 'tlee',            outcome: 'Lost the June 23, 2026 Republican primary in House District 16 to former Layton mayor Bob Stevenson, 34% to 66%, and conceded; not on the November ballot.' },
  { id: 'klisonbee',       outcome: 'Lost the June 23, 2026 Republican primary for Utah’s 2nd Congressional District to incumbent Rep. Blake Moore; having declined to seek re-election to her state House seat, she is not on the November ballot.' },
  { id: 'michael_farrell', outcome: 'Lost the June 23, 2026 Democratic primary for Utah’s 1st Congressional District to Ben McAdams; does not advance to the general election.' },
  { id: 'sam_barlow',      outcome: 'Lost the June 23, 2026 Republican primary in House District 17 to Lili Bitner, about 29% to 71%, and conceded; does not advance to the general election.' },
  { id: 'nik_anderson',    outcome: 'Lost the June 23, 2026 Republican primary in House District 48 to Jake Hunsaker, about 43% to 57%; does not advance to the general election.' },
];

// Won a contested primary — advancing to the November 3, 2026 general election.
const ADVANCED = [
  { id: 'lili_bitner',   outcome: 'Won the June 23, 2026 Republican primary in House District 17 over Sam Barlow (about 71% to 29%); advances to the November general election.' },
  { id: 'jake_hunsaker', outcome: 'Won the June 23, 2026 Republican primary in House District 48 over Nik Anderson (about 57% to 43%); advances to the November general election.' },
  { id: 'doug_fiefia',   outcome: 'Won the June 23, 2026 Republican primary in Senate District 18 over Sen. Dan McCay (69% to 31%); advances to the November general election.' },
  { id: 'bob_stevenson', outcome: 'Won the June 23, 2026 Republican primary in House District 16 over Rep. Trevor Lee (66% to 34%); advances to the November general election.' },
];

// ── Firestore value encoder / decoder ──────────────────────────────────────
function enc(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  throw new Error('only scalar values are written by this script');
}
function dec(v) {
  if (!v) return undefined;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return parseInt(v.integerValue, 10);
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.nullValue !== undefined) return null;
  return undefined;
}

async function getDoc(id) {
  const r = await fetch(`${BASE}/${id}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`fetch ${id}: HTTP ${r.status}`);
  return r.json();
}
async function patch(id, fields) {
  const qs = Object.keys(fields).map(f => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
  const body = { fields: {} };
  for (const [k, v] of Object.entries(fields)) body.fields[k] = enc(v);
  const r = await fetch(`${BASE}/${id}?${qs}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`patch ${id}: HTTP ${r.status} — ${(await r.text()).slice(0, 200)}`);
}

async function applyStatus(item, status) {
  const doc = await getDoc(item.id);
  if (!doc) { console.log(`  ? ${item.id} — doc not found, skipped`); return 'missing'; }
  const f = doc.fields || {};
  const name = dec(f.name) || '';
  const cur = String(dec(f.candidacyStatus) || '').toLowerCase();
  // Never overwrite an existing concluded status with 'active'.
  if (status === 'active' && CONCLUDED.has(cur)) {
    console.log(`  · ${item.id} (${name}) — already concluded "${cur}", left as-is`);
    return 'skipped';
  }
  if (cur === status) { console.log(`  · ${item.id} (${name}) — already "${status}", skipped`); return 'skipped'; }
  console.log(`  ${APPLY ? '✎' : '→'} ${item.id} (${name}) ${cur ? '"' + cur + '" → ' : ''}"${status}"`);
  if (APPLY) await patch(item.id, { candidacyStatus: status, candidacyOutcome: item.outcome, updatedAt: STAMP });
  return 'written';
}

async function main() {
  console.log(`PolitiDex — mark Utah June 23, 2026 primary outcomes  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
  const tally = { written: 0, skipped: 0, missing: 0 };
  const bump = (r) => { tally[r] = (tally[r] || 0) + 1; };

  console.log('Lost primary → candidacyStatus = "eliminated_primary":');
  for (const item of LOST_PRIMARY) bump(await applyStatus(item, 'eliminated_primary'));

  console.log('\nAdvanced (won primary) → candidacyStatus = "active":');
  for (const item of ADVANCED) bump(await applyStatus(item, 'active'));

  console.log(`\n${APPLY ? 'Wrote' : 'Would write'} ${tally.written} record(s); ${tally.skipped} unchanged; ${tally.missing} not found.`);
  if (!APPLY) console.log('Re-run with --apply to write to Firestore.');
}
main().catch(e => { console.error(e); process.exit(1); });
