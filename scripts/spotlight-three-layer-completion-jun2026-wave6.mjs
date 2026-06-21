#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — June 2026 evidence pass, WAVE 6
// THREE-LAYER COMPLETION for the remaining zero-connection curated Utah State
// Legislators, plus rural/thin second-connections — all grounded in official
// floor video (with verified timestamps) or the official bill record.
//
// CONTEXT. A sitting legislator has a "full three-layer connection" on an issue
// when one ISSUE_MAP issueKey appears in ALL THREE layers the evidence view
// (window._issueEvidenceMap) reads: the documented Issue Position, a tracked
// Promise, and a Spotlight item. Going into this pass, of the 40 curated Utah
// State Legislators, 35 already had at least one full connection and 5 had none.
// All five were blocked ONLY on the Spotlight layer (their stance and a promise
// already shared an issueKey; no Spotlight item carried it).
//
// This pass closes that gap for THREE of the five with honest, verifiable items,
// and adds rural/thin second-connections for two more. The remaining two
// (Mike Schultz, Bridger Bolinder) are LEFT honestly unconnected — see note.
//
// VERIFICATION (re-run live this pass against le.utah.gov):
//   • Bill record  : https://le.utah.gov/data/<session>/<bill>.json — confirmed
//     the prime (or, for HB261, the Senate FLOOR) sponsor, the verbatim short
//     title, the highlightedProvisions each `facts` paragraph is drawn from, and
//     the final "Governor Signed" action. Only signed bills are framed as enacted.
//   • Floor video  : the presenting member's own floorDebateList marker (the
//     entry whose chamber matches the member and whose description ends in the
//     member's surname). Each timestamp below is that marker button's own
//     data-offset (seconds → mm:ss / h:mm:ss), read live from the marker's
//     floorArchive.jsp page this pass; the extractor was re-validated against the
//     known wave-5 value marker 130562 → 4201s → 1:10:01.
//
// HONESTY (CONTENT_STYLE.md): every item is about the INDIVIDUAL's own bill and
// recorded action — never their party. Signed status is a plain fact from the
// bill's own action history. No fabricated statements, bills, or timestamps.
//   • Mike Schultz (Speaker) is left unconnected on housing_build / lower_taxes /
//     lands_local: a full scan of his chief-sponsored House bills (2023–2026)
//     found none cleanly on those issues — his housing record is leadership, not
//     a chief-sponsored bill; HB301 (2023) was a road-funding tax SHIFT, not a
//     cut; and the federal-lands effort was a lawsuit, not a bill. Nothing forced.
//   • Bridger Bolinder is left unconnected on housing_build for the same reason a
//     prior pass found: no verifiable housing-development record.
//
// Forward-looking evidence-view fields (additive; ignored by the current render):
//   • `sourceType` : 'official_floor_video' | 'official_bill_record'
//   • `media`      : the recorded proof ({type:'video', url, timestamp, label}),
//                    kept separate from `source` (the visible bill citation).
//
// Idempotent: each member's live `spotlight` array is re-fetched and an item is
// appended ONLY if no existing item shares its headline.
//
//   node scripts/spotlight-three-layer-completion-jun2026-wave6.mjs            # dry run
//   node scripts/spotlight-three-layer-completion-jun2026-wave6.mjs --apply    # write
// ---------------------------------------------------------------------------

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const STAMP = '2026-06-21T00:00:00.000Z';

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

// ── authoring helpers ───────────────────────────────────────────────────────
const floor = (id) => `https://le.utah.gov/av/floorArchive.jsp?markerID=${id}`;
const billUrl = (yr, num) => `https://le.utah.gov/~${yr}/bills/static/${num}.html`;

// Floor-video Spotlight item (member's own presentation of a signed bill).
function vidItem({ issueKey, headline, facts, why, billNum, yr, ts, day, chamber, marker, impact = 'positive', tags }) {
  const padded = billNum.replace(/(\D+)(\d+)/, (_, a, b) => a + b.padStart(4, '0'));
  return {
    date: String(yr), impact, category: 'voting', issueKey,
    sourceType: 'official_floor_video',
    tags: tags || ['Notable Actions', 'Public Statements'],
    headline, facts, why,
    source: { label: `${billNum} (${yr}) — official bill record`, url: billUrl(yr, padded) },
    media: {
      type: 'video', timestamp: ts, url: floor(marker),
      label: `Official Utah ${chamber} floor video — Day ${day}, ${yr} General Session`,
    },
  };
}

// Bill-record Spotlight item (signed bill where reliable floor video isn't
// available — used here for a 2024 bill, whose archive predates embedded markers).
function billItem({ issueKey, headline, facts, why, billNum, yr, impact = 'positive', tags }) {
  const padded = billNum.replace(/(\D+)(\d+)/, (_, a, b) => a + b.padStart(4, '0'));
  return {
    date: String(yr), impact, category: 'voting', issueKey,
    sourceType: 'official_bill_record',
    tags: tags || ['Notable Actions'],
    headline, facts, why,
    source: { label: `${billNum} (${yr}) — official bill record`, url: billUrl(yr, padded) },
  };
}

// ── The plan: Firestore id → [spotlight items] ──────────────────────────────
const PLAN = {

  // ===== Jordan Teuscher — House District 44 (South Jordan) — was 0 full =====
  // stance "Property & Housing Law" + promise both on housing_build; this signed
  // bill's own affordable-housing component is the matching Spotlight.
  jteuscher: [
    vidItem({ issueKey: 'housing_build', billNum: 'HB502', yr: 2025, day: 35, chamber: 'House', ts: '1:10:01', marker: 130562, tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his bill creating an affordable-housing infrastructure grant program on the House floor (video at 1:10:01)',
      facts: "Teuscher chief-sponsored HB502 (2025), Transportation and Infrastructure Funding Amendments, which — alongside its transportation provisions — creates an affordable housing infrastructure grant program providing grants to local governments to build the infrastructure needed to facilitate affordable-housing projects in a county of the first class. The official House floor video opens to his presentation on Day 35 of the 2025 session at 1:10:01; the bill was signed into law on March 27, 2025.",
      why: "Property and housing law is a keyissue Teuscher's profile names, and standing up a state grant program to fund the infrastructure that makes affordable housing possible is a recorded, enacted action in his own words — the Spotlight that joins the housing stance and promise his profile already carries." }),
  ],

  // ===== Wayne Harper — Senate District 16 (Taylorsville/West Jordan) — was 0 =
  // stance "Transit Governance" + promise both on transit.
  wharper: [
    vidItem({ issueKey: 'transit', billNum: 'SB174', yr: 2025, day: 21, chamber: 'Senate', ts: '1:11:04', marker: 129501, tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his transit-district governance overhaul on the Senate floor (video at 1:11:04)',
      facts: "Harper chief-sponsored SB174 (2025), Transit and Transportation Governance Amendments, which reallocates the roles of the board of trustees, executive director, and local advisory board of a large public transit district, and places all of a large transit district's fixed-guideway capital development projects under Department of Transportation supervision regardless of whether the project uses state funding. The official Senate floor video opens to his presentation on Day 21 of the 2025 session at 1:11:04; the bill was signed into law on March 27, 2025.",
      why: "Transit governance is a keyissue Harper's profile leads with, and restructuring how Utah's largest transit district is run is a recorded, enacted action in his own words — the Spotlight that joins the transit stance and promise his profile already carries." }),
  ],

  // ===== Keith Grover — Senate District 23 (Provo) — was 0 full ==============
  // stance "Diversity Programs (DEI)" + promise both on edu_balance. He was the
  // Senate floor sponsor of HB261 (2024); the 2024 floor archive predates
  // embedded video markers, so this is cited to the official bill record.
  kgrover: [
    billItem({ issueKey: 'edu_balance', billNum: 'HB261', yr: 2024, tags: ['Notable Actions'],
      headline: 'Carried Utah’s "Equal Opportunity Initiatives" law (HB261) as its Senate floor sponsor',
      facts: "Grover was the Senate floor sponsor of HB261 (2024), Equal Opportunity Initiatives, which prohibits institutions of higher education, the public education system, and governmental employers from requiring diversity-related submissions or training that promotes differential treatment and from maintaining offices that engage in those practices, and directs the Board of Higher Education, the State Board of Education, and the state auditor to review and report compliance. The bill was signed into law in 2024.",
      why: "Replacing diversity-program offices with an 'equal opportunity' standard is a keyissue Grover's profile names, and shepherding that law through the Senate as its floor sponsor is a recorded, enacted action on his own record — the Spotlight that joins the position and promise his profile already carries." }),
  ],

  // ===== Carl Albrecht — House District 70 (rural central Utah) — 2nd conn ===
  // stance "Agriculture, Water & Rural Communities" + promise both on rural_ag.
  calbrecht: [
    vidItem({ issueKey: 'rural_ag', billNum: 'HB253', yr: 2025, day: 17, chamber: 'House', ts: '57:29', marker: 129273, tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his annual agriculture and food bill on the House floor (video at 57:29)',
      facts: "Albrecht chief-sponsored HB253 (2025), Agriculture and Food Amendments, a wide-ranging update to Utah agriculture law — renaming the Utah Fertilizer Act the Utah Plant Food Act, revising livestock-brand expiration and livestock-market reporting, amending the Domesticated Elk Act, and making the LeRay McAllister Working Farm and Ranch Fund money nonlapsing. The official House floor video opens to his presentation on Day 17 of the 2025 session at 57:29; the bill was signed into law on March 24, 2025.",
      why: "Agriculture and rural communities is a keyissue this central-Utah member's profile names, and carrying the year's omnibus agriculture-and-food update — including protecting working-farm conservation money — is a recorded, enacted action in his own words on a previously thin profile." }),
  ],

  // ===== Jerry Stevenson — Senate District 6 (Davis County) — 3rd connection =
  // stance "Growth & Land Use" / appropriations + promise both on infrastructure.
  jstevenson: [
    vidItem({ issueKey: 'infrastructure', billNum: 'SB239', yr: 2025, day: 28, chamber: 'Senate', ts: '1:13:19', marker: 129923, tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his Inland Port infrastructure-funding bill on the Senate floor (video at 1:13:19)',
      facts: "Stevenson chief-sponsored SB239 (2025), Inland Port Authority Amendments, authorizing the Utah Inland Port Authority to facilitate and fund the development of public infrastructure and improvements — including environmental-sustainability projects — in and adjacent to its project areas, and to fund other governmental entities by grant or agreement to carry out that work. The official Senate floor video opens to his presentation on Day 28 of the 2025 session at 1:13:19; the bill was signed into law on March 3, 2025.",
      why: "Aligning infrastructure with Utah's growth is a keyissue Stevenson's profile names, and giving the Inland Port Authority clearer authority to fund public infrastructure is a recorded, enacted action in his own words backing it." }),
  ],

};

// ── apply ───────────────────────────────────────────────────────────────────
function hk(s) { return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 70); }

async function getDoc(id) {
  const r = await fetch(`${BASE}/${id}`);
  if (!r.ok) return null;
  const j = await r.json();
  const o = {};
  for (const [k, val] of Object.entries(j.fields || {})) o[k] = dec(val);
  o.__fields = j.fields || {};
  return o;
}

async function patchSpotlight(id, fields, spotlight) {
  fields.spotlight = enc(spotlight);
  fields.updatedAt = enc(STAMP);
  const url = `${BASE}/${id}?` +
    Object.keys(fields).map(k => 'updateMask.fieldPaths=' + encodeURIComponent(k)).join('&');
  const r = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!r.ok) throw new Error(`PATCH ${id} -> ${r.status} ${await r.text()}`);
}

let totalNew = 0, totalLeg = 0, vid = 0, billRec = 0;
const issueTally = {};

for (const [id, items] of Object.entries(PLAN)) {
  const doc = await getDoc(id);
  if (!doc) { console.log(`!! MISSING doc: ${id}`); continue; }
  const existing = Array.isArray(doc.spotlight) ? doc.spotlight : [];
  const seen = new Set(existing.map(s => hk(s.headline || s.title)));
  const toAdd = items.filter(it => !seen.has(hk(it.headline)));
  if (!toAdd.length) { console.log(`= ${id}: nothing new (${existing.length} existing)`); continue; }
  totalLeg++;
  toAdd.forEach(it => {
    totalNew++;
    if (it.sourceType === 'official_floor_video') vid++; else billRec++;
    if (it.issueKey) issueTally[it.issueKey] = (issueTally[it.issueKey] || 0) + 1;
  });
  const merged = existing.concat(toAdd);
  console.log(`+ ${id} (${doc.name}): +${toAdd.length} [${existing.length} -> ${merged.length}]`);
  toAdd.forEach(it => console.log(`    • [${it.sourceType === 'official_floor_video' ? 'video ' + it.media.timestamp : 'bill record'}] ${it.headline}  #${it.issueKey}`));
  if (APPLY) {
    await patchSpotlight(id, doc.__fields, merged);
    console.log('    ✓ written');
  }
}

console.log('\n──────── summary ────────');
console.log(`legislators touched   : ${totalLeg}`);
console.log(`new spotlight items   : ${totalNew}`);
console.log(`  official floor video : ${vid}`);
console.log(`  official bill record : ${billRec}`);
console.log('issue tally :', Object.entries(issueTally).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}=${n}`).join(', '));
console.log(APPLY ? '\nAPPLIED to Firestore.' : '\nDRY RUN — re-run with --apply to write.');
