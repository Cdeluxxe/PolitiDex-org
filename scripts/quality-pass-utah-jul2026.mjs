#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — June 2026 Utah officeholder tenure / depth pass (wave 3)
//
// A focused data-quality pass on CURRENT sitting Utah officeholders. A roster
// review found that office-tenure (`termStart`) — the field that drives the
// "In office since January 2019 (7 years)" pill on every card and profile, and
// the tenure meter that lets Key Races visibly tower a long-serving incumbent
// over a first-time challenger — was MISSING on 76 of the 102 sitting Utah
// legislators in the live `politicians` collection. Their profiles were
// otherwise rich (photo, bio, 5-6 key issues, documented stances, a score), so
// the single highest-value, lowest-risk improvement is to backfill tenure.
//
// Nothing here is invented. Every `termStart` below is the start of the
// member's CURRENT continuous period of service in their CURRENT chamber,
// verified against Ballotpedia "Assumed office" fields and the official
// le.utah.gov / senate.utah.gov rosters. Two sourcing rules were applied
// consistently:
//   • A 2021 district RENUMBERING (redistricting) is not a break in service —
//     the true continuous-service start is used, not the reset "Jan 1 2023"
//     date that Ballotpedia profile infoboxes show for renumbered seats.
//   • Members APPOINTED mid-term to fill a vacancy carry the month they
//     actually assumed office (e.g. 2023-10), not the following January.
//
// The pass writes ONLY `termStart` (+ `updatedAt`) and ONLY when the live doc
// has no tenure recorded, via an updateMask — so it is safe and idempotent to
// re-run, and it never overwrites a hand-curated value.
//
//   node scripts/quality-pass-utah-jul2026.mjs            # dry run (default)
//   node scripts/quality-pass-utah-jul2026.mjs --apply    # write to Firestore
// ---------------------------------------------------------------------------

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const STAMP = '2026-06-17T00:00:00.000Z';

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

// ── Verified tenure: current-chamber continuous service start (YYYY-MM) ─────
// Sources: Ballotpedia "Assumed office" + le.utah.gov / senate.utah.gov rosters.
// Trailing comments flag appointments and redistricting-renumber corrections.
const TENURE = {
  // Sitting Utah House members
  andrew_stoddard:    '2019-01', // first elected 2018 (HD44→40 renumber, not a break)
  anthony_loubet:     '2023-01', // first elected 2022
  ariel_defay:        '2023-11', // appointed Nov 2023 (succeeded Brad Wilson)
  ashlee_matthews:    '2021-01', // first elected 2020 (HD38→37 renumber)
  bridger_bolinder:   '2023-01', // first elected 2022
  calvin_roberts:     '2025-01', // first elected 2024
  christine_watkins:  '2017-01', // current stint from 2017 (prior 2009-2012 was a gap)
  clinton_okerlund:   '2025-01', // first elected 2024
  colin_w_jack:       '2022-07', // appointed/seated July 2022 (succeeded Travis Seegmiller)
  cory_maloy:         '2017-01', // first elected 2016 (HD6→52 renumber)
  jburton:            '2021-01', // first elected 2020 (Jefferson Burton)
  jdailey:            '2019-01', // first elected 2018 (Jennifer Dailey-Provost; HD24→22 renumber)
  mballard:           '2019-01', // first elected 2018 (Melissa Garff Ballard)
  jteuscher:          '2021-01', // first elected 2020 (Jordan Teuscher)
  kivory:             '2021-11', // reappointed Nov 2021 (Ken Ivory; prior 2011-2019 stint)
  klisonbee:          '2017-01', // first elected 2016 (Karianne Lisonbee)
  csnider:            '2018-12', // appointed Dec 2018 (Casey Snider, House Majority Leader)
  seliason:           '2011-01', // first elected 2010 (Steve Eliason)
  katy_hall:          '2021-01', // first elected 2020 (Katy Hall)
  sandra_hollins:     '2015-01', // first elected 2014 (Sandra Hollins)
  stephanie_gricius:  '2023-01', // first elected 2022 (Stephanie Gricius)
  val_peterson:       '2011-01', // first elected 2010 (Val Peterson)
  jake_fitisemanu:    '2025-01', // first elected 2024 (Jake Fitisemanu)
  calbrecht:          '2017-01', // first elected 2016 (Carl Albrecht)
  carol_spackman_moss:'2001-01', // first elected 2000 (Carol Spackman Moss; multiple renumbers)
  cheryl_acton:       '2017-09', // appointed Sept 2017 (succeeded Adam Gardiner)
  cpierucci:          '2019-11', // appointed Nov 2019 (Candice Pierucci; succeeded John Knotwell)
  david_shallenberger:'2025-01', // first elected 2024
  doug_fiefia:        '2025-01', // first elected 2024
  doug_owens:         '2021-01', // first elected 2020 (HD36→33 renumber)
  doug_welton:        '2021-01', // first elected 2020 (HD67→65 renumber)
  grant_miller:       '2025-01', // first elected 2024
  hoang_nguyen:       '2025-01', // first elected 2024
  jake_sawyer:        '2025-01', // first elected 2024
  james_dunnigan:     '2003-01', // first elected 2002 (HD39→36 renumber)
  jason_b_kyle:       '2023-01', // first elected 2022
  jason_thompson:     '2025-01', // first elected 2024
  jill_koford:        '2025-01', // first elected 2024
  john_arthur:        '2025-12', // appointed Dec 2025 (succeeded Gay Lynn Bennion)
  jon_hawkins:        '2019-01', // first elected 2018 (HD57→55 renumber)
  joseph_elison:      '2023-01', // first elected 2022
  karen_m_peterson:   '2022-01', // special election Jan 2022 (succeeded Paul Ray)
  kay_christofferson: '2013-01', // first elected 2012 (HD56→53 renumber)
  kristen_chevrier:   '2025-01', // special election effective Jan 2025 (succeeded Brady Brammer)
  leah_hansen:        '2025-08', // appointed Aug 2025 (succeeded Jefferson Moss)
  lisa_shepherd:      '2025-01', // first elected 2024
  logan_monson:       '2025-01', // first elected 2024 (succeeded Phil Lyman)
  mark_strong:        '2019-01', // first elected 2018 (HD41→47 renumber)
  matt_macpherson:    '2023-10', // appointed Oct 2023 (succeeded Quinn Kotter)
  mike_kohler:        '2021-01', // first elected 2020 (HD54→59 renumber)
  mike_petersen:      '2021-01', // first elected 2020 (HD3→2 renumber)
  nelson_abbott:      '2021-01', // first elected 2020 (HD57→57 renumber)
  nicholeen_p_peck:   '2025-01', // first elected 2024
  nthurston:          '2015-01', // first elected 2014 (Norm Thurston; HD64→62 renumber)
  paul_a_cutler:      '2023-01', // first elected 2022
  r_neil_walter:      '2023-01', // first elected 2022
  rob_bishop:         '2026-05', // special election, sworn in May 2026 (succeeded Matthew Gwynn)
  rosalba_dominguez:  '2025-01', // first elected 2024
  rshipp:             '2019-01', // first elected 2018 (Rex Shipp; HD72→71 renumber)
  ryan_d_wilcox:      '2021-01', // current stint from 2021 (prior 2009-2014 was a gap)
  sahara_hayes:       '2023-01', // first elected 2022
  scott_chew:         '2015-01', // first elected 2014 (HD55→68 renumber)
  stephen_l_whyte:    '2023-01', // first elected 2022
  stewart_e_barlow:   '2011-09', // appointed Sept 2011 (succeeded Julie Fisher)
  thomas_peterson:    '2022-09', // appointed Sept 2022 (succeeded Joel Ferry)
  tiara_auxier:       '2025-01', // appointed Jan 2025 (succeeded Kera Birkeland)
  tracy_miller:       '2025-01', // first elected 2024
  troy_shelley:       '2025-01', // first elected 2024
  verona_mauga:       '2025-01', // first elected 2024
  walt_brooks:        '2016-09', // appointed Sept 2016 (succeeded Don Ipson)
  // Sitting Utah Senate members
  emily_buss:         '2025-12', // appointed Dec 2025 (succeeded Daniel Thatcher)
  heidi_balderree:    '2023-10', // appointed Oct 2023 (succeeded Jake Anderegg)
  jennifer_plumb:     '2023-01', // first elected 2022
  john_johnson:       '2021-01', // first elected 2020 (SD19→3 renumber)
  karen_kwan:         '2023-01', // House 2017-2022, moved to Senate Jan 2023
  nate_blouin:        '2023-01', // first elected 2022
};

// ── Firestore I/O ───────────────────────────────────────────────────────────
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

(async () => {
  console.log(`PolitiDex — Utah tenure / depth pass (wave 3)  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
  let tenured = 0, already = 0, missing = 0, skipped = 0;

  for (const id of Object.keys(TENURE)) {
    let doc;
    try { doc = await getDoc(id); } catch (e) { console.log(`  ✗ ${id}: ${e.message}`); skipped++; continue; }
    if (!doc) { console.log(`  – ${id}: not in Firestore — skipped`); missing++; continue; }
    if (doc.termStart) { console.log(`  = ${id} (${doc.name || ''}): already has termStart "${doc.termStart}"`); already++; continue; }
    console.log(`  ${APPLY ? '✎' : '→'} ${id} (${doc.name || ''}): termStart -> ${TENURE[id]}`);
    if (APPLY) await patch(id, { termStart: TENURE[id], updatedAt: STAMP });
    tenured++;
  }

  console.log(`\n${APPLY ? 'Applied' : 'Would apply'}: ${tenured} tenure backfill(s); ${already} already set; ${missing} not in Firestore; ${skipped} error(s).`);
  if (!APPLY) console.log('Re-run with --apply to write to Firestore.');
})();
