#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — strengthen the THINNEST sitting Utah legislator profiles
// (June 2026 quality-floor pass, wave 2)
//
// A fresh depth audit of the 84 sitting Utah State Representatives and Senators
// in the live `politicians` collection ranked every member by COMBINED quality
// evidence = (substantive promises) + (spotlight / accountability items). The
// thinnest cluster sat at a combined 6–9, e.g.:
//
//   clinton_okerlund 4+2=6 · rob_bishop 6+1=7 · sandra_hollins 6+1=7 ·
//   john_arthur 6+1=7 · hoang_nguyen 7+1=8 · rosalba_dominguez 6+2=8 ·
//   jake_sawyer 6+2=8 · leah_hansen 6+2=8 · emily_buss 6+2=8 · grant_miller 7+2=9
//
// The audit's key finding: these members' PROMISE ledgers are already well
// built (6–7 sourced bills/pledges each), but their SPOTLIGHT (Accountability-
// of-Truth) layer is nearly empty — exactly the gap the first wave found across
// the chamber. Several also carry promises and spotlight items with NO
// `issueKey`, so their kept/broken record never lights up the "Stance at a
// Glance" / Connected-Evidence dots on their own profile.
//
// This pass closes both gaps for the thinnest set, under a hard honesty rule:
//
//   • Every NEW spotlight item restates a fact ALREADY documented and sourced in
//     that same profile (an enacted bill in its `promises`, a credential in its
//     `bio`) — surfaced into the accountability/evidence layer. No new factual
//     claims are introduced. Each carries a real, load-tested `source` whose URL
//     was checked to resolve (HTTP 200); bill citations point at canonical
//     le.utah.gov static pages already used elsewhere in the same profile.
//   • Enacted bills are recorded with impact `positive`; documented efforts that
//     stalled are recorded honestly as impact `neutral` context (no score
//     impact), never dressed up as wins.
//   • Every spotlight item and every existing promise is tagged with an
//     `issueKey` drawn from the member's OWN documented ISSUE_STANCE_DATA
//     positions, so the evidence connects to a stance the profile already holds
//     — nothing invented, only linked.
//   • Genuinely thin records are NOT padded. Freshmen / appointees whose full
//     public record is already captured (jake_sawyer, emily_buss) and the member
//     who deliberately limits her own bill count (leah_hansen) get evidence-
//     CONNECTION only, no manufactured spotlight — honesty over forced content.
//
// Idempotent & non-destructive:
//   • A spotlight item is appended only if no existing item shares its headline.
//   • An existing promise/spotlight `issueKey` is set only when currently absent
//     (or, for a small set of mis-keyed okerlund items, corrected to a key that
//     matches one of his real positions).
//
//   node scripts/strengthen-thinnest-utah-profiles-jun2026-wave2.mjs           # dry run
//   node scripts/strengthen-thinnest-utah-profiles-jun2026-wave2.mjs --apply   # write
// ---------------------------------------------------------------------------

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const STAMP = '2026-06-22T00:00:00.000Z';

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
  if (v.timestampValue !== undefined) return v.timestampValue;
  if (v.arrayValue !== undefined) return (v.arrayValue.values || []).map(dec);
  if (v.mapValue !== undefined) {
    const o = {};
    for (const [k, val] of Object.entries(v.mapValue.fields || {})) o[k] = dec(val);
    return o;
  }
  return null;
}

// ── NEW SPOTLIGHT ITEMS (verifiable + sourced + issue-keyed) ────────────────
// Appended only if no existing item shares the headline. Each issueKey matches
// one of the member's own ISSUE_STANCE_DATA positions so it connects on profile.
const SPOTLIGHT_ADDS = {
  sandra_hollins: [
    { impact: 'positive', category: 'voting', date: '2020', issueKey: 'justice_reform', tags: ['Notable Actions', 'Consistency'],
      headline: "Sponsored Utah's ban on knee-on-neck police restraints",
      facts: "Hollins sponsored H.B. 5007 in the 2020 second special session, making it a third-degree felony for an officer to kneel on a person's neck; it was signed into law in June 2020.",
      why: 'An enacted law matching her stated criminal-justice priorities, carried in direct response to a national policing crisis.',
      source: { label: 'Utah Legislature — H.B. 5007 (2020 S5)', url: 'https://le.utah.gov/~2020S5/bills/static/HB5007.html' } },
    { impact: 'positive', category: 'voting', date: '2017', issueKey: 'justice_reform', tags: ['Notable Actions'],
      headline: 'Passed Utah\'s "Ban the Box" law for public-sector hiring',
      facts: 'Hollins sponsored H.B. 156 (2017), Utah\'s "ban the box" law, removing criminal-history questions from initial applications for state-government jobs; it was signed into law.',
      why: 'A concrete, enacted reentry reform consistent with her long-stated focus on second chances and fair employment.',
      source: { label: 'Utah Legislature — H.B. 156 (2017)', url: 'https://le.utah.gov/~2017/bills/static/hb0156.html' } },
    { impact: 'positive', category: 'voting', date: '2024', issueKey: 'healthcare', tags: ['Notable Actions', 'Consistency'],
      headline: 'A licensed clinical social worker, she enacted the Social Work Licensure Compact',
      facts: 'Hollins, an LCSW by profession, sponsored H.B. 44 (2024), signed March 13, 2024, making Utah the third state to join the interstate Social Work Licensure Compact so licensed social workers can practice across state lines.',
      why: 'Legislating in her own professional field — a competence-and-consistency signal tied to expanding mental-health and social-service capacity.',
      source: { label: 'Utah Legislature — H.B. 44 (2024)', url: 'https://le.utah.gov/~2024/bills/static/HB0044.html' } },
  ],
  hoang_nguyen: [
    { impact: 'positive', category: 'voting', date: '2026', issueKey: 'water', tags: ['Notable Actions'],
      headline: 'Let cities count the Great Salt Lake in their water-conservation plans',
      facts: 'Nguyen was chief sponsor of H.B. 296 (2026), Water Commitment Amendments, allowing municipalities to include the Great Salt Lake in their water-conservation planning; it was signed into law in the 2026 session.',
      why: 'An enacted measure matching her stated Great Salt Lake and water-conservation priority.',
      source: { label: 'Utah Legislature — H.B. 296 (2026)', url: 'https://le.utah.gov/~2026/bills/static/HB0296.html' } },
    { impact: 'positive', category: 'voting', date: '2026', issueKey: 'public_schools', tags: ['Notable Actions'],
      headline: 'Strengthened follow-up after failed student vision screenings',
      facts: 'Nguyen chief-sponsored H.B. 351 (2026), School Vision Screening Amendments, requiring schools to follow up with parents after a student fails an initial vision screening; it was signed into law, effective July 1, 2026.',
      why: 'A targeted, enacted student-health measure consistent with her public-education focus.',
      source: { label: 'Utah Legislature — H.B. 351 (2026)', url: 'https://le.utah.gov/~2026/bills/static/HB0351.html' } },
    { impact: 'positive', category: 'voting', date: '2026', issueKey: 'climate_action', tags: ['Notable Actions'],
      headline: 'Updated state safety rules for carbon-dioxide systems',
      facts: 'Nguyen chief-sponsored H.B. 240 (2026), Carbon Dioxide System Amendments, modernizing state rules governing CO2 systems; it was signed into law in the 2026 session.',
      why: 'An enacted technical-safety and environmental-quality measure in line with her stated priorities.',
      source: { label: 'Utah Legislature — H.B. 240 (2026)', url: 'https://le.utah.gov/~2026/bills/static/HB0240.html' } },
  ],
  grant_miller: [
    { impact: 'positive', category: 'voting', date: '2026', issueKey: 'justice_balance', tags: ['Notable Actions', 'Consistency'],
      headline: 'Extended his court-fine reform for low-income defendants',
      facts: 'Miller, a public defender, chief-sponsored H.B. 94 (2026), Criminal Accounts Receivable Amendments, building directly on his 2025 court-fine reform; it advanced through both chambers and was signed into law.',
      why: 'A second enacted bill on the same issue — a follow-through-and-consistency signal on his signature reform.',
      source: { label: 'Utah Legislature — H.B. 94 (2026)', url: 'https://le.utah.gov/~2026/bills/static/HB0094.html' } },
  ],
  john_arthur: [
    { impact: 'positive', category: 'transparency', date: '2021', issueKey: 'edu_balance', tags: ['Notable Actions', 'Representation'],
      headline: 'The 2021 Utah Teacher of the Year now legislates on education',
      facts: 'Before his December 2025 appointment to House District 41, Arthur — a sixth-grade teacher at Meadowlark Elementary — was named 2021 Utah Teacher of the Year and was a 2021 National Teacher of the Year finalist; he has since carried multiple public-education bills.',
      why: 'Firsthand classroom credentials standing behind his stated focus on teacher pay and fully staffing schools.',
      source: { label: 'Utah House Democrats — Rep. John Arthur', url: 'https://www.utahhousedemocrats.utleg.gov/john-arthur' } },
    { impact: 'neutral', category: 'promise', date: '2026', issueKey: 'housing_support', tags: ['Public Statements'],
      headline: 'Pushed to require 60-day notice before residential rent increases',
      facts: "In his first session, Arthur sponsored H.B. 478 (2026), Residential Rental Modifications, to require landlords to give tenants 60 days' notice before raising rent; the bill stalled, as similar proposals have in prior years.",
      why: 'A documented attempt to act on his stated renter-protection priority, recorded honestly as an effort that did not pass.',
      source: { label: 'KSL — rent-notice bill stalls a fourth year', url: 'https://www.ksl.com/article/51453663/should-tenants-get-more-notice-of-rent-increases-bill-stalls-for-4th-year-in-a-row' } },
  ],
  rosalba_dominguez: [
    { impact: 'neutral', category: 'promise', date: '2026', issueKey: 'climate_action', tags: ['Public Statements'],
      headline: "Sought disclosure of data centers' water and energy use",
      facts: 'Dominguez sponsored H.B. 585 (2026), Data Center Amendments, to require disclosure of large data centers\' water and energy impacts; the bill stalled in the House Rules Committee.',
      why: 'A documented effort tied to her stated focus on water conservation and accountability, recorded as an attempt that did not advance.',
      source: { label: 'Utah Legislature — H.B. 585 (2026)', url: 'https://le.utah.gov/~2026/bills/static/HB0585.html' } },
  ],
  rob_bishop: [
    { impact: 'positive', category: 'transparency', date: '2003–2021', issueKey: 'lands_local', tags: ['Notable Actions', 'Consistency'],
      headline: "Chaired the U.S. House Natural Resources Committee before returning to Utah's House",
      facts: 'Before his 2026 return to the Utah House, Bishop served nine terms in Congress (2003–2021) and chaired the U.S. House Natural Resources Committee (2015–2019); he earlier served as Utah House Speaker (1992–1994).',
      why: 'A long, documented record on public-lands and federalism that anchors the priorities he now brings to the state House.',
      source: { label: 'Ballotpedia — Rob Bishop', url: 'https://ballotpedia.org/Rob_Bishop' } },
  ],
  clinton_okerlund: [
    { impact: 'neutral', category: 'statement', date: '2025', issueKey: 'transit', tags: ['Public Statements'],
      headline: 'Publicly opposes the Little Cottonwood Canyon gondola',
      facts: 'Okerlund has publicly opposed the proposed Little Cottonwood Canyon gondola and backed alternative transportation solutions for the canyon, a stated priority for his Salt Lake County district.',
      why: 'A clear, on-record position on a contested local transportation question that directly affects his constituents.',
      source: { label: 'Ballotpedia — Clint Okerlund', url: 'https://ballotpedia.org/Clint_Okerlund' } },
  ],
};

// ── EXISTING-SPOTLIGHT issueKey CORRECTIONS ─────────────────────────────────
// A few okerlund spotlight items were keyed to issues he has no position on
// (property_tax / lands_balance), so they never connected. Re-key them to the
// position they actually evidence. Matched by a headline substring; only the
// issueKey is touched.
const SPOTLIGHT_REKEY = {
  clinton_okerlund: [
    { match: 'State Parks', issueKey: 'enviro_balance' },     // HB490 -> "State Parks & Recreation"
    { match: 'Vehicle Assessment', issueKey: 'gov_waste' },   // HB272 -> "Fiscal Accountability"
  ],
};

// ── PROMISE issueKey BACKFILL ───────────────────────────────────────────────
// id -> [issueKey | null] aligned to the member's promises IN DOCUMENT ORDER.
// null = leave unkeyed (purely electoral "won the race" promises, or a topic the
// member holds no documented position on). Each non-null key matches one of the
// member's own ISSUE_STANCE_DATA positions, so a kept promise backs that stance
// and a broken one cuts against it in the Connected-Evidence view.
const PROMISE_ISSUEKEYS = {
  clinton_okerlund: ['enviro_balance', 'gov_waste', 'gov_waste', 'transit'],
  rob_bishop:       ['democracy_balance', 'democracy_balance', 'water', 'edu_parental', 'term_limits', 'lands_local'],
  sandra_hollins:   ['justice_reform', 'rights_balance', 'justice_reform', 'rights_balance', 'healthcare', 'rights_balance'],
  john_arthur:      ['water', 'edu_balance', 'housing_support', 'edu_balance', 'edu_balance', 'cost_living'],
  hoang_nguyen:     [null, 'healthcare', 'water', 'public_schools', 'climate_action', 'healthcare', null],
  rosalba_dominguez:['family_support', null, 'gov_transparency', 'climate_action', 'housing_build', 'healthcare'],
  jake_sawyer:      [null, 'lands_balance', 'housing_support', 'public_schools', 'cost_living', 'gov_regulation'],
  leah_hansen:      ['property_tax', 'lands_local', null, 'religious_liberty', 'gov_transparency', 'gov_waste'],
  emily_buss:       ['lands_local', 'public_schools', 'housing_first_time', 'public_schools', 'transit', null],
  grant_miller:     [null, null, 'justice_balance', 'health_mental', 'justice_balance', 'housing_support', 'cannabis_reform'],
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
  console.log(`PolitiDex — strengthen THINNEST Utah profiles (wave 2)  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
  const ids = Array.from(new Set([
    ...Object.keys(SPOTLIGHT_ADDS), ...Object.keys(SPOTLIGHT_REKEY), ...Object.keys(PROMISE_ISSUEKEYS),
  ]));
  let newSpot = 0, rekeyed = 0, promiseKeys = 0, touched = 0, missing = 0, skipped = 0;

  for (const id of ids) {
    let doc;
    try { doc = await getDoc(id); } catch (e) { console.log(`  ✗ ${id}: ${e.message}`); skipped++; continue; }
    if (!doc) { console.log(`  – ${id}: not in Firestore — skipped`); missing++; continue; }

    const fields = {};
    let spotlight = Array.isArray(doc.spotlight) ? doc.spotlight.map((s) => ({ ...s })) : [];
    let spotlightDirty = false;

    // 1) Re-key any mis-keyed existing spotlight items.
    const rekeys = SPOTLIGHT_REKEY[id];
    if (rekeys) {
      for (const rk of rekeys) {
        const hit = spotlight.find((s) => String(s.headline || '').includes(rk.match));
        if (hit && hit.issueKey !== rk.issueKey) {
          hit.issueKey = rk.issueKey; spotlightDirty = true; rekeyed++;
          console.log(`  ${APPLY ? '✎' : '→'} ${id}: re-key spotlight "${rk.match}" -> ${rk.issueKey}`);
        }
      }
    }

    // 2) Append new spotlight items (dedupe by headline).
    const adds = SPOTLIGHT_ADDS[id];
    if (adds) {
      const have = new Set(spotlight.map((s) => String(s.headline || '').trim().toLowerCase()));
      const fresh = adds.filter((a) => !have.has(String(a.headline || '').trim().toLowerCase()));
      if (fresh.length) {
        spotlight = spotlight.concat(fresh);
        spotlightDirty = true; newSpot += fresh.length;
        console.log(`  ${APPLY ? '✎' : '→'} ${id} (${doc.name}): +${fresh.length} spotlight item(s)  [${spotlight.length} total]`);
      } else {
        console.log(`  = ${id} (${doc.name}): spotlight additions already present`);
      }
    }

    if (spotlightDirty) fields.spotlight = spotlight;

    // 3) Backfill issueKey on existing promises (set only when absent).
    const keys = PROMISE_ISSUEKEYS[id];
    if (keys && Array.isArray(doc.promises)) {
      const promises = doc.promises.map((p) => ({ ...p }));
      let dirty = false, added = 0;
      promises.forEach((p, i) => {
        const k = keys[i];
        if (k && !p.issueKey) { p.issueKey = k; dirty = true; added++; }
      });
      if (keys.length !== doc.promises.length) {
        console.log(`  ! ${id}: PROMISE_ISSUEKEYS length ${keys.length} != ${doc.promises.length} promises — applied by index`);
      }
      if (dirty) {
        fields.promises = promises; promiseKeys += added;
        console.log(`  ${APPLY ? '✎' : '→'} ${id} (${doc.name}): +${added} promise issueKey(s)`);
      }
    }

    if (Object.keys(fields).length) {
      fields.updatedAt = STAMP;
      if (APPLY) await patch(id, fields);
      touched++;
    }
  }

  console.log(`\n${APPLY ? 'Applied' : 'Would apply'}: ${newSpot} new spotlight item(s), ${rekeyed} spotlight re-key(s), ` +
    `${promiseKeys} promise issueKey(s) across ${touched} member(s).`);
  console.log(`(${missing} not in Firestore, ${skipped} error(s).)`);
  if (!APPLY) console.log('\nRe-run with --apply to write to Firestore.');
})();
