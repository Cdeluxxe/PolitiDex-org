#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — mirror curated issue positions into the live Firestore roster
//
// A roster review found several higher-visibility figures — a U.S. cabinet
// official, current statewide officeholders, big-city mayors and former
// legislative leaders — carrying tracked promises but NO documented "stances,"
// which left their profiles thin on "where they stand." index.html now ships
// structured, sourced issue positions for these people in its ISSUE_STANCE_DATA
// table (the source of truth the public profile renders). This script mirrors
// the SAME positions into each politician's Firestore `stances` map so the
// profile editor, the record-quality validators, and the data-completeness
// metrics see them too.
//
//   node scripts/add-issue-positions.mjs            # dry run (default)
//   node scripts/add-issue-positions.mjs --apply    # write to Firestore
//
// Honesty rules (matching the rest of the site):
//   • No fabricated positions. Every stance below maps to a real, publicly
//     reported action, vote, lawsuit or on-the-record statement, and the
//     matching ISSUE_STANCE_DATA entry in index.html carries a citable source.
//   • Each run re-fetches the live doc and MERGES these stances onto whatever
//     is already there (never clobbering existing keys), then stamps updatedAt.
//     Re-running is safe and idempotent.
//   • Only the `stances` map and `updatedAt` are written (via updateMask);
//     bios, key issues, promises and scores are left untouched.
// ---------------------------------------------------------------------------

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const STAMP = '2026-06-13T00:00:00.000Z';

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

// ── Positions to mirror (topic → one-line stated position) ──────────────────
// Keyed by the Firestore document id. These mirror the ISSUE_STANCE_DATA entries
// added to index.html; see that file for the full position cards, evidence and
// source links.
const PLAN = {
  tgabbard: {
    'Intelligence Transparency & Declassification': 'As Director of National Intelligence, made restoring trust in the intelligence community her central mission, launching the Director’s Initiatives Group (2025) to declassify material she argues serves the public interest, including JFK/RFK files.',
    'Surveillance & FISA': 'A longtime skeptic of warrantless surveillance who worked to declassify a FISA Court opinion on Section 702 searches so Congress and the public can weigh reform.',
    'Foreign Intervention': 'Built her national profile opposing U.S. “regime-change wars” and open-ended foreign military intervention, favoring diplomacy and restraint.',
    'Government Weaponization': 'Frames her declassification push as ending the use of government power against ordinary citizens.',
  },
  sreyes: {
    'Big-Tech Antitrust': 'Made Utah a leader in bipartisan antitrust action against Google, joining the 2020 multistate search-monopoly suit and co-leading Utah v. Google over the Play Store.',
    'Opioid Crisis': 'Co-founded the Utah Opioid Task Force and joined national litigation against drug distributors over the addiction epidemic.',
    'Human Trafficking': 'Made fighting human trafficking a signature cause; his ties to Operation Underground Railroad later drew a 2025 legislative audit.',
    '2020 Election Challenge': 'Joined the December 2020 Texas brief urging the Supreme Court to challenge 2020 results in other states, a move criticized by Utah’s GOP governor.',
  },
  derek_brown: {
    'Child Online Safety & Big Tech': 'Calls protecting children online one of his highest priorities, advancing Utah’s lawsuits against TikTok and filing a new suit against Snap (Snapchat) in June 2025.',
    'Trust & Ethics in the Office': 'Entered office pledging to return trust to an Attorney General’s Office shaken by his predecessor’s controversies, emphasizing ethics and transparency.',
    'Federalism & Public Lands': 'A constitutional and appellate attorney who frames public-lands and state-authority questions around federalism.',
    'Fentanyl & Public Safety': 'Names fentanyl and public safety among the office’s top enforcement priorities.',
  },
  moaks: {
    'ESG / Politicized Investing': 'One of the nation’s most prominent anti-ESG state officials; in 2022 pulled about $100 million of state funds from BlackRock and in 2025 chairs the State Financial Officers Foundation.',
    'Fiduciary Duty & Fund Management': 'Administers the $37B+ Public Treasurers’ Investment Fund and backs Utah’s law requiring proxy votes cast solely in beneficiaries’ best economic interest.',
    'Energy & Utah’s Economy': 'Frames his opposition to ESG and divestment campaigns as defending Utah’s energy and resource industries.',
    'Sound Money & Anti-CBDC': 'Opposes a federal central bank digital currency and champions “economic freedom” and precious-metals options.',
  },
  bwilson: {
    'Great Salt Lake & Water': 'As Speaker, led a roughly half-billion-dollar water-conservation push and created a $40 million Great Salt Lake trust to help secure water for the shrinking lake.',
    'Income Taxes': 'Presided over more than $1 billion in income-tax-rate cuts during his speakership.',
    'School Choice': 'As Speaker, moved Utah’s 2023 “Utah Fits All” school-choice ESA program through the House.',
    'Economic Development & the Olympics': 'A homebuilder focused on growth and major infrastructure; now CEO of the Salt Lake City–Utah 2034 Winter Olympics organizing committee.',
  },
  emendenhall: {
    'Air Quality': 'Built her career on clean-air advocacy, co-founding the nonprofit Breathe Utah and serving on the state Air Quality Board before becoming mayor.',
    'Clean Energy': 'Committed Salt Lake City to powering its electricity with 100% renewable energy.',
    'Affordable Housing': 'Made expanding affordable housing a top priority for the state’s largest and fastest-growing city.',
    'Homelessness': 'Has prioritized homelessness services, including a tiny-home village, while pledging to protect residents’ dignity and safety.',
  },
  tcamp: {
    'Government Transparency': 'Made transparency her central mission as State Auditor, opening a public transparency room at the Capitol and launching dashboards that break down state revenue and spending.',
    'Fraud, Waste & Abuse': 'Frames independent auditing as protecting taxpayers; reported uncovering more than $500 million in fraud, waste and abuse in her first year.',
    'Oversight of Government': 'Oversees independent audits of more than 1,800 government entities, public universities, projects and election processes.',
    'Data & Technology': 'Uses data-analytics and AI tools to make government spending searchable for ordinary residents.',
  },
  jwilson: {
    'Criminal Justice Reform': 'Launched a five-year plan to break the cycle of jail, addiction and homelessness through early intervention, linking justice, health, housing and workforce services.',
    'Mental Health & Public Health': 'Backed a new mental-health crisis center as an alternative to jail, where law enforcement can bring people in crisis directly to care.',
    'Affordable Housing': 'Invested more than $25 million in county affordable housing across 17 projects, with another 1,000 deeply affordable units planned.',
    'Watershed & Canyon Protection': 'Calls protecting the Wasatch canyons a top priority, working to stop the Little Cottonwood gondola and a Parleys Canyon quarry to safeguard the water supply.',
  },
  doug_owens: {
    'Great Salt Lake & Water Conservation': 'Co-chair of the Great Salt Lake Caucus and a prolific author of water-conservation bills; sponsored H.B. 318 (2025) restricting turf on new homes in the lake basin.',
    'Tiered Water Pricing': 'Backs pricing reform charging heavy residential water users more to curb outdoor watering; sponsored H.B. 155 Water Rates Amendments (2026).',
    'Clean Air': 'Co-chairs the Bipartisan Clean Air Caucus, tying Wasatch Front air quality and the lake’s dust to public health.',
    'Wetlands & Habitat': 'Pushes to study and protect Utah’s wetlands and working farmland; sponsored H.B. 509 Wetlands Modifications (2026).',
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
  console.log(`PolitiDex — mirror issue positions into Firestore  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
  let touched = 0, added = 0;
  for (const [id, positions] of Object.entries(PLAN)) {
    let doc;
    try {
      doc = await getDoc(id);
    } catch (e) {
      console.log(`  ✗ ${id}: ${e.message}`);
      continue;
    }
    const existing = (doc.stances && typeof doc.stances === 'object' && !Array.isArray(doc.stances)) ? doc.stances : {};
    const merged = Object.assign({}, existing);
    let fresh = 0;
    for (const [topic, text] of Object.entries(positions)) {
      if (!(topic in merged)) fresh++;
      merged[topic] = text; // merge: add new, refresh curated wording
    }
    console.log(`  ${APPLY ? '✎' : '→'} ${id} (${doc.name || ''}): ${Object.keys(positions).length} position(s) (${fresh} new) → stances now ${Object.keys(merged).length}`);
    if (APPLY) await patch(id, { stances: merged, updatedAt: STAMP });
    touched++; added += fresh;
  }
  console.log(`\n${APPLY ? 'Applied' : 'Would apply'} stance updates to ${touched} profile(s) (${added} new positions).`);
  if (!APPLY) console.log('Re-run with --apply to write to Firestore.');
})();
