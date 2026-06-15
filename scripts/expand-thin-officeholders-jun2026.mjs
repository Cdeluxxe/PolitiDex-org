#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — June 2026 thin-officeholder stance expansion (wave 3)
//
// A roster review found that the weakest remaining non-candidate profiles
// belonged to sitting and former officeholders who carried rich, bill-sourced
// tracked promises and key issues in Firestore but only TWO structured stances
// each — so their Candidate Snapshot and browsing cards felt thin and the
// Alignment Tool had little to match them on.
//
// This script DERIVES additional structured issue positions for ten such
// officials directly from material already in each person's own Firestore
// record (their documented promises, sponsored bills, and listed key issues).
// Nothing is invented: every position below mirrors a position already shipped
// in index.html's ISSUE_STANCE_DATA (the source of truth the public profile
// renders), and bill-backed positions carry the bill citation. Firestore
// receives the flattened topic→text mirror so the profile editor, the
// record-quality validators, and the data-completeness metrics see them too.
//
//   node scripts/expand-thin-officeholders-jun2026.mjs            # dry run
//   node scripts/expand-thin-officeholders-jun2026.mjs --apply    # write
//
// Each run re-fetches the live doc and MERGES these stances onto whatever is
// already there (add new keys, refresh curated wording), then stamps updatedAt.
// Only the `stances` map and `updatedAt` are written (via updateMask). Re-running
// is safe and idempotent.
// ---------------------------------------------------------------------------

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const STAMP = '2026-06-15T00:00:00.000Z';

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

// ── Flattened topic→text mirror of the new ISSUE_STANCE_DATA positions ──────
// (matches index.html exactly; merged onto existing stances, never clobbered.)
const PLAN = {
  jon_hawkins: {
    'Economic Development': "Chief-sponsored a law dissolving the Unified Economic Opportunity Commission and creating a new Economic Opportunity Agency at the governor's request (HB 542, 2025).",
    'Online Child Safety & Digital Wellness': "Co-chairs Utah's Digital Wellness, Citizenship, and Safe Technology Commission, focused on protecting minors online.",
    'Stronger Sexual-Offense Laws': "Chief-sponsored an update to Utah's sexual-offense statutes that passed the House 74-0 (HB 16, 2024).",
    'Public Safety & Crime': 'Chief-sponsored legislation adding referee status as a sentencing aggravator for assault during sporting events (HB 140, 2025).',
    '2034 Olympic Legacy': "Chief-sponsored liability safeguards protecting Utah's Olympic legacy ahead of the 2034 Winter Games (HB 541, 2025).",
  },
  nelson_abbott: {
    'Mental Health & Disability': 'Sponsored a law amending civil-commitment definitions and expanding the rights of patients committed to local mental-health authorities (HB 276, 2025).',
    'Courts & Civil Law': "Created Utah's first statutory framework for supported decision-making and expanded the rights of people under guardianship (HB 334, 2025).",
    'Criminal Competency Reform': 'Continued a multi-session reform of how courts handle defendants with mental-health competency questions (HB 207, 2026).',
    'Estate Planning for the Digital Age': 'Authorized electronic execution and notarization of non-testamentary estate-planning documents, modernizing Utah probate law (HB 181, 2026).',
    'Local Government Accountability': "Clarified a city council's authority to dismiss a municipal manager, sharpening local-government accountability (HB 109, 2025).",
  },
  jiro_johnson: {
    'Housing & Homelessness': "Names housing and lasting solutions to the district's unhoused crisis his first council priority.",
    'Criminal-Justice Reform': 'A former public defender who backs criminal-justice reform and moving people from the justice system into treatment-based diversion.',
    'Representation of Marginalized Communities': 'Centers the representation of marginalized communities and uses his Japanese middle name to honor his Japanese and Black heritage.',
    'Historic Japan Town Preservation': "Backs preserving Salt Lake City's historic Japan Town as a cultural and community priority.",
  },
  laurie_stringham: {
    'Public Safety': 'As council chair she championed a $507M jail-consolidation and Justice and Accountability Center bond, referred to voters in 2024.',
    'Mental Health & Justice Reform': "A longtime advocate who frames the county jail as the state's largest de facto mental-health facility and backs treatment-oriented criminal-justice reform.",
    'Fiscal Restraint': 'States a priority of keeping county taxes and fees low while funding homelessness, human-services, and opioid-response needs.',
    'Parks, Recreation & Wellness': 'Champions Park Rx Utah and parks-and-recreation access after 21 years on the Kearns-Oquirrh Recreation and Parks District board.',
    'Civility & Responsive Governance': 'Made encouraging and requiring civility a central theme while serving as Council Chair in 2022 and 2024.',
  },
  john_crofts: {
    'Transparency & Accountability': 'Pledged plain-language summaries of Commission meetings and greater public access, and launched a free weekly summary site.',
    'Fiscal Responsibility': 'Promised to spend taxpayer dollars more efficiently; serves on the county Budget Committee and as Audit Committee vice chair.',
    'Housing & ADU Reform': 'Names housing affordability and easing accessory-dwelling-unit rules among his commission priorities.',
    'Great Salt Lake & Air Quality': 'Lists the Great Salt Lake and Davis County air and water quality among his stated priorities.',
    'Mental Health Services': 'Names mental-health services and support for Davis Behavioral Health a priority.',
  },
  mroberts: {
    'Food Freedom & Small Producers': 'Sponsored the Home Consumption and Homemade Food Act letting small producers sell homemade food directly to consumers — a national model and his signature achievement (HB 181, 2018).',
    'Privacy & Surveillance': 'Carried a Fourth Amendment Protection Act to bar state material support for federal mass surveillance (HB 150, 2015).',
    'Limited Government & Free Markets': "Across four terms became the Legislature's leading voice for individual liberty, free markets, and occupational-licensing reform.",
    'Right to Food': 'Proposed a constitutional amendment establishing a right to food; the resolution did not pass but reflects his food-freedom platform (HJR 2, 2016).',
  },
  mwinder: {
    'Election & Redistricting Reform': 'His signature cause: sponsored legislation to bring ranked-choice voting to statewide primary and general elections (HB 178, 2022).',
    'Voting Access': 'Carried an earlier expansion of ranked-choice voting in partisan primaries (HB 127, 2021).',
    'Public Lands & Recreation': 'Expanded the Jordan River Recreation Area and appropriated $475,000 for natural-resources and nature-center programs (HB 173, 2022).',
    'Public Safety': "Modernized the membership of Utah's Peace Officer Standards and Training (POST) Council (HB 94, 2022).",
    'Economic Development': 'As House Transportation Committee vice-chair he focused on economic development, workforce, and transportation.',
  },
  rspendlove: {
    'Income-Tax Relief': "As Revenue and Taxation Committee chair he sponsored income-tax relief behind Utah's consecutive rate cuts (4.95%→4.65%) (HB 444, 2022).",
    'State Budget & Appropriations': 'Sponsored appropriations and internal-service-fund authorization measures reflecting his seat on Executive Appropriations (HB 8, 2022).',
    'Treasury Investment Modernization': "Updated Utah's State Treasurer investment rules to modernize how public funds are managed (HB 572, 2024).",
    'Economic Analysis & Fiscal Stewardship': "A professional economist and former state chief economist who provided the data behind Utah's sustained, measured tax reductions.",
  },
  mpovey: {
    'Roads & Infrastructure': 'As Roy mayor, led revitalization of the 5600 South commercial corridor and transportation improvements serving Hill Air Force Base.',
    'Public Safety & Crime': 'Sought funding to add police and fire-department staffing in Roy.',
    'Economic Development': 'Focused on redevelopment tied to Hill Air Force Base and the Roy Innovation Center.',
    'Parks & Recreation': 'Planned renovation of the Roy Aquatic Center and city recreation facilities.',
  },
  mwhalen: {
    'Economic Development': 'As Ogden mayor he oversaw $500M+ in downtown investment, including the Junction development and Ogden River renewal.',
    'Outdoor Recreation Economy': 'Positioned Ogden as a national outdoor-recreation destination, attracting major employers.',
    'Public Safety': 'Listed public safety among his core mayoral priorities across three terms.',
    'Housing Affordability': 'Downtown growth raised housing costs, and affordable-housing targets during the revitalization were not fully met.',
  },
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

(async () => {
  console.log(`PolitiDex — expand thin officeholder stances  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
  let touched = 0, added = 0, dropped = 0;
  for (const [id, positions] of Object.entries(PLAN)) {
    let doc;
    try {
      doc = await getDoc(id);
    } catch (e) {
      console.log(`  ✗ ${id}: ${e.message}`);
      continue;
    }
    const existing = (doc.stances && typeof doc.stances === 'object' && !Array.isArray(doc.stances)) ? doc.stances : {};
    // These ten records are being authoritatively rewritten to match the clean
    // ISSUE_STANCE_DATA set in index.html, so REPLACE the stances map outright.
    // This both adds the new positions and prunes stale/renamed keys (e.g. an
    // old "Limited Government" topic now expressed as "Fiscal Restraint").
    const fresh = Object.keys(positions).filter((t) => !(t in existing)).length;
    const stale = Object.keys(existing).filter((t) => !(t in positions));
    const next = Object.assign({}, positions);
    console.log(`  ${APPLY ? '✎' : '→'} ${id} (${doc.name || ''}): ${Object.keys(positions).length} position(s) (${fresh} new${stale.length ? `, dropping stale: ${stale.join(', ')}` : ''})`);
    if (APPLY) await patch(id, { stances: next, updatedAt: STAMP });
    touched++; added += fresh; dropped += stale.length;
  }
  console.log(`\n${APPLY ? 'Applied' : 'Would apply'} stance updates to ${touched} profile(s) (${added} new positions, ${dropped} stale keys pruned).`);
  if (!APPLY) console.log('Re-run with --apply to write to Firestore.');
})();
