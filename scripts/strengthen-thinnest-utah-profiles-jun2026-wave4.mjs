#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — strengthening the THINNEST sitting Utah legislator profiles
// (June 2026 quality-floor pass, WAVE 4)
//
// A fresh depth audit re-ranked all 91 CURRENT sitting Utah State
// Representatives and Senators by their combined evidence layers (Spotlight
// items + tracked Promises + curated Issue Positions). Two findings shaped this
// pass, and both were verified live against the Utah Legislature's own data:
//
//   1. VIDEO is NOT yet exhausted. Earlier video waves capped most members at
//      ~3 floor-video Spotlight items, but many thin members chief-sponsored
//      ADDITIONAL bills that were signed into law and that they presented
//      themselves on the floor — recorded, with a verifiable video offset — yet
//      were never captured. Those are added here (priority order: video first).
//
//   2. PROMISES are well built (6–9 sourced bills per thin member) but mostly
//      DISCONNECTED: 399 of 691 promises across 84 members carried NO `issueKey`,
//      so a kept / broken / pending verdict never lit up the member's own
//      "Stance at a Glance", Connected-Evidence view, or the Evidence Locker —
//      even though most of these members ALREADY hold a curated Issue Position on
//      exactly that issue. This pass keys each thin member's promises to the
//      issue the bill actually concerns, so the verdict connects to the stance.
//
// HONESTY / CONTENT_STYLE rules (carried from waves 1–3):
//   • VIDEO: every item is the INDIVIDUAL's own recorded floor presentation of a
//     bill they chief-sponsored (primeSponsor == their legislator code in
//     le.utah.gov/data/2025GS/<bill>.json) and that was signed into law
//     (lastAction == "Governor Signed"). The mm:ss is the live `offset=` of the
//     bill's own floor-video marker (floorArchive.jsp?markerID=<id>), re-verified
//     this pass against the known-good wave value (marker 131176 → 1588s → 26:28).
//     `facts` restates only the bill's verbatim highlightedProvisions; the signed
//     status is a plain fact from the bill's action history. No party framing.
//   • PROMISES: an `issueKey` is set ONLY where currently absent AND the bill the
//     promise concerns maps cleanly to a real ISSUE_MAP issue. Purely electoral
//     promises ("won the seat") and ambiguous topics are left unkeyed. No promise
//     text, verdict, or evidence is altered — only the connecting key is added.
//   • Genuinely thin records are NOT padded. Members who joined after their first
//     session (e.g. an appointee seated mid-2025, or a member seated after the
//     2026 session) have no floor record yet and are left honestly light. No X /
//     social items are fabricated: only 9 of 91 sitting members list a public X
//     handle at all, and none surfaced a verifiable substantive post this pass,
//     so none were invented to fill space.
//   • Idempotent & non-destructive: a video item is appended only if no existing
//     Spotlight item shares its headline; a promise key is written only when the
//     promise currently has none.
//
//   node scripts/strengthen-thinnest-utah-profiles-jun2026-wave4.mjs            # dry run
//   node scripts/strengthen-thinnest-utah-profiles-jun2026-wave4.mjs --apply    # write Firestore
// ---------------------------------------------------------------------------

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const STAMP = '2026-06-23T00:00:00.000Z';

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

// ── authoring helpers ───────────────────────────────────────────────────────
const floor25 = (id) => `https://le.utah.gov/av/floorArchive.jsp?markerID=${id}`;
const bill = (num) => `https://le.utah.gov/~2025/bills/static/${num}.html`;

// Floor-video Spotlight item: the member's own presentation of a signed bill.
function vid({ issueKey, billNum, title, ts, day, chamber, marker, headline, facts, why, impact = 'positive', tags }) {
  return {
    date: '2025', impact, category: 'voting', issueKey,
    sourceType: 'official_floor_video',
    tags: tags || ['Notable Actions', 'Public Statements'],
    headline, facts, why,
    source: { label: `${billNum} (2025) — official bill record`, url: bill(billNum) },
    media: {
      type: 'video', timestamp: ts, url: floor25(marker),
      label: `Official Utah ${chamber} floor video — Day ${day}, 2025 General Session`,
    },
  };
}

// ── NEW FLOOR-VIDEO SPOTLIGHT ITEMS ─────────────────────────────────────────
// Firestore id -> [items]. Each is a signed, chief-sponsored 2025 bill the
// member presented on the floor; mm:ss is the marker's verified offset.
const VIDEO = {
  val_peterson: [
    vid({ issueKey: 'edu_college_cost', billNum: 'HB0341', title: 'Higher Education Revisions', ts: '49:05', day: 25, chamber: 'House', marker: 129779,
      headline: 'Presented his higher-education statute revisions on the House floor (video at 49:05)',
      facts: "Peterson chief-sponsored HB341 (2025), Higher Education Revisions, which exempts private institutions of higher education from the provisions of Utah's higher-education code unless expressly stated otherwise and allows the University of Utah to teach certain out-of-state medical students. The official House floor video opens to his presentation on Day 25 of the 2025 session at 49:05; the bill was signed into law.",
      why: "Higher-education policy is the throughline of his record, and reworking how the state's universities and private institutions are governed is a recorded, enacted action in his own words." }),
  ],
  karen_m_peterson: [
    vid({ issueKey: 'edu_college_cost', billNum: 'HB0051', title: 'Higher Education Reporting Amendments', ts: '43:56', day: 3, chamber: 'House', marker: 128629,
      headline: 'Carried her higher-education reporting cleanup on the House floor (video at 43:56)',
      facts: "Peterson chief-sponsored HB51 (2025), Higher Education Reporting Amendments, eliminating several reporting requirements relating to higher education and making technical and conforming changes. The official House floor video opens to her presentation on Day 3 of the 2025 session at 43:56; the bill was signed into law.",
      why: "Streamlining the reporting load on Utah's universities is a recorded, enacted follow-through on the higher-education focus her profile already documents." }),
    vid({ issueKey: 'public_schools', billNum: 'HB0396', title: 'Small School District Scale of Operations Formula', ts: '2:25:38', day: 34, chamber: 'House', marker: 130503, tags: ['Notable Actions', 'Consistency'],
      headline: 'Presented her small-school-district funding formula on the House floor (video at 2:25:38)',
      facts: "Peterson chief-sponsored HB396 (2025), Small School District Scale of Operations Formula, amending the formula for necessarily existent small schools funding. The official House floor video opens to her presentation on Day 34 of the 2025 session at 2:25:38; the bill was signed into law.",
      why: "Adjusting how Utah funds small and rural school districts is a concrete, enacted school-funding action argued in her own words." }),
  ],
  ryan_d_wilcox: [
    vid({ issueKey: 'tech_balance', billNum: 'HB0013', title: 'Sexual Extortion Amendments', ts: '1:33:07', day: 1, chamber: 'House', marker: 128543,
      headline: 'Presented his sexual-extortion bill covering deepfakes on the House floor (video at 1:33:07)',
      facts: "Wilcox chief-sponsored HB13 (2025), Sexual Extortion Amendments, expanding the crime of sexual extortion to include threatening to distribute a counterfeit (AI-generated) intimate image. The official House floor video opens to his presentation on Day 1 of the 2025 session at 1:33:07; the bill was signed into law.",
      why: "Closing the loophole for AI-generated intimate images is a kept promise his profile already tracks — and he made the case for it himself on the record, adding spoken-word proof behind his child-online-safety position." }),
    vid({ issueKey: 'gov_waste', billNum: 'HB0474', title: 'Regulatory Oversight Amendments', ts: '23:20', day: 37, chamber: 'House', marker: 130847, tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried his regulatory-oversight bill on the House floor (video at 23:20)',
      facts: "Wilcox chief-sponsored HB474 (2025), Regulatory Oversight Amendments, directing the Office of Professional Licensure Review to gather and report feedback on existing occupational regulations and placing a cost limit on implementing an agency-generated rule. The official House floor video opens to his presentation on Day 37 of the 2025 session at 23:20; the bill was signed into law.",
      why: "Putting a cost check on new agency rules is a recorded, enacted follow-through on the limited-government commitment his profile documents." }),
  ],
  anthony_loubet: [
    vid({ issueKey: 'election_integrity', billNum: 'HB0481', title: 'Ballot Proposition Requirements', ts: '50:52', day: 36, chamber: 'House', marker: 130747,
      headline: 'Presented his ballot-proposition publication bill on the House floor (video at 50:52)',
      facts: "Loubet chief-sponsored HB481 (2025), Ballot Proposition Requirements, which — contingent on passage of a proposed constitutional amendment — amends the publication requirement for a future proposed constitutional amendment or other ballot question. The official House floor video opens to his presentation on Day 36 of the 2025 session at 50:52; the bill was signed into law.",
      why: "How ballot questions are published to voters is part of the election-administration record his profile names, and this is a recorded, enacted action in his own words." }),
  ],
  thomas_peterson: [
    vid({ issueKey: 'housing_build', billNum: 'HB0550', title: 'Building Permit Fee Prohibition Amendments', ts: '1:07:47', day: 41, chamber: 'House', marker: 131150,
      headline: 'Carried his building-permit-fee prohibition on the House floor (video at 1:07:47)',
      facts: "Peterson chief-sponsored HB550 (2025), Building Permit Fee Prohibition Amendments, preventing a municipality or county from imposing an inspection fee on a water conservancy district that hires a qualified inspector for new infrastructure. The official House floor video opens to his presentation on Day 41 of the 2025 session at 1:07:47; the bill was signed into law.",
      why: "Cutting duplicate inspection fees on new infrastructure ties directly to the building-and-inspection standards his profile already documents — argued in his own words and now law." }),
  ],
  calbrecht: [
    vid({ issueKey: 'water', billNum: 'HB0041', title: 'State Water Policy Amendments', ts: '46:40', day: 15, chamber: 'House', marker: 129071,
      headline: 'Presented his state water-policy bill on the House floor (video at 46:40)',
      facts: "Albrecht chief-sponsored HB41 (2025), State Water Policy Amendments, which addresses groundwater quality, references saved water, encourages watershed monitoring in consultation with watershed councils, promotes state water planning, and accounts for regionally appropriate water reuse. The official House floor video opens to his presentation on Day 15 of the 2025 session at 46:40; the bill was signed into law.",
      why: "Water planning and reuse is central to the rural-Utah record his profile documents, and updating statewide water policy is a recorded, enacted action in his own words." }),
    vid({ issueKey: 'disaster_resilience', billNum: 'HB0239', title: 'Disaster Funds Revisions', ts: '1:05:01', day: 22, chamber: 'House', marker: 129586, tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried his disaster-recovery funding revisions on the House floor (video at 1:05:01)',
      facts: "Albrecht chief-sponsored HB239 (2025), Disaster Funds Revisions, modifying the State Disaster Recovery Restricted Account — including the amounts the Division of Emergency Management may expend under specified conditions — and renaming the related restricted account. The official House floor video opens to his presentation on Day 22 of the 2025 session at 1:05:01; the bill was signed into law.",
      why: "Shoring up how the state funds disaster response and recovery is a concrete, enacted action that fits the practical-stewardship record his profile already shows." }),
  ],
  dowens_st: [
    vid({ issueKey: 'enviro_energy', billNum: 'SB0192', title: 'Commercial Wind and Solar Incentives Amendments', ts: '1:18:59', day: 21, chamber: 'Senate', marker: 129503,
      headline: 'Presented his wind-and-solar storage-incentive bill on the Senate floor (video at 1:18:59)',
      facts: "Owens chief-sponsored SB192 (2025), Commercial Wind and Solar Incentives Amendments, requiring commercial wind and solar energy systems of 660 or more kilowatts to include energy storage systems to qualify for tax credits. The official Senate floor video opens to his presentation on Day 21 of the 2025 session at 1:18:59; the bill was signed into law.",
      why: "Tying renewable tax credits to on-site storage is a recorded, enacted action on the energy-reliability record his profile names — argued in his own words." }),
    vid({ issueKey: 'justice_balance', billNum: 'SB0074', title: 'Corrections Modifications', ts: '14:36', day: 18, chamber: 'Senate', marker: 129355, tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried his corrections-modifications bill on the Senate floor (video at 14:36)',
      facts: "Owens chief-sponsored SB74 (2025), Corrections Modifications, amending which individuals in the custody of the Department of Corrections may petition to change a sex designation on a birth certificate and prohibiting a person in the department's custody from filing a district-court petition to legally change the individual's name. The official Senate floor video opens to his presentation on Day 18 of the 2025 session at 14:36; the bill was signed into law.",
      why: "Setting the rules for records changes by people in state custody is a recorded, enacted corrections-policy action in his own words." }),
  ],
  cwilson: [
    vid({ issueKey: 'edu_parental', billNum: 'SB0098', title: 'Parental Education on Student Use of Technology Amendments', ts: '12:52', day: 18, chamber: 'Senate', marker: 129378,
      headline: 'Presented his parent-technology-education bill on the Senate floor (video at 12:52)',
      facts: "Wilson chief-sponsored SB98 (2025), Parental Education on Student Use of Technology Amendments, requiring the State Board of Education to create a video presentation for parents on the safety and legal issues a student may encounter using technology and to make it available to school districts to share with parents. The official Senate floor video opens to his presentation on Day 18 of the 2025 session at 12:52; the bill was signed into law.",
      why: "Equipping parents to navigate students' technology use is a recorded, enacted action argued in his own words." }),
  ],
  walt_brooks: [
    vid({ issueKey: 'lands_balance', billNum: 'HB0115', title: 'State Park Funding Amendments', ts: '52:02', day: 18, chamber: 'House', marker: 129366,
      headline: 'Carried his state-park funding bill on the House floor (video at 52:02)',
      facts: "Brooks chief-sponsored HB115 (2025), State Park Funding Amendments, allowing interest earned on money in the State Park Fees Restricted Account to remain in the account. The official House floor video opens to his presentation on Day 18 of the 2025 session at 52:02; the bill was signed into law.",
      why: "Keeping state-park fee revenue working inside the park system is a small, concrete, enacted stewardship action presented in his own words." }),
  ],
  ariel_defay: [
    vid({ issueKey: 'rural_ag', billNum: 'HB0194', title: 'Beekeeping and Veterinary Amendments', ts: '29:00', day: 24, chamber: 'House', marker: 129687,
      headline: 'Presented her beekeeping-and-veterinary bill on the House floor (video at 29:00)',
      facts: "Defay chief-sponsored HB194 (2025), Beekeeping and Veterinary Amendments, providing for the veterinarian-client-patient relationship with regard to bees. The official House floor video opens to her presentation on Day 24 of the 2025 session at 29:00; the bill was signed into law.",
      why: "Bringing bees under veterinary-care rules is a concrete, enacted agriculture action she argued herself on the floor." }),
  ],
  rwinterton: [
    vid({ issueKey: 'gov_transparency', billNum: 'SB0338', title: 'Nonprofit Entities Amendments', ts: '26:28', day: 41, chamber: 'Senate', marker: 131176,
      headline: 'Carried his governmental-nonprofit transparency bill on the Senate floor (video at 26:28)',
      facts: "Winterton chief-sponsored SB338 (2025), Nonprofit Entities Amendments, refining the definition of a 'governmental nonprofit corporation' and requiring such corporations to post financial information on the Utah Public Finance Website. The official Senate floor video opens to his presentation on Day 41 of the 2025 session at 26:28; the bill was signed into law.",
      why: "Requiring governmental nonprofits to post their finances publicly is a recorded, enacted transparency action argued in his own words." }),
  ],
};

// ── PROMISE issueKey BACKFILL ───────────────────────────────────────────────
// docId -> [issueKey | null] aligned to the member's promises IN DOCUMENT ORDER.
// A key is written ONLY where the promise currently has none; null leaves the
// promise as-is (already keyed, purely electoral, or no clean issue match).
// Each non-null key matches a real ISSUE_MAP issue the bill actually concerns,
// and (where the member holds the matching position) connects the verdict to
// that stance.
const PROMISE_KEYS = {
  sadams:            ['school_choice', 'infrastructure', null, 'gov_balance', 'term_limits', 'water', 'water', 'lower_taxes', 'enviro_energy'],
  kay_christofferson:['infrastructure', 'transit', 'reform_balance', 'transit', 'back_police', null],
  anthony_loubet:    ['gov_transparency', 'back_police', 'family_support', null, 'gov_transparency', null, 'justice_balance'],
  jason_b_kyle:      ['gun_rights', 'property_tax', null, null, 'election_integrity', 'election_integrity', 'edu_college_cost'],
  karen_m_peterson:  [null, null, 'public_schools', 'econ_growth', 'infrastructure', 'edu_college_cost', 'infrastructure'],
  logan_monson:      [null, null, null, 'health_rural', 'health_rural', 'back_police', 'lands_balance'],
  matt_macpherson:   [null, null, null, 'health_balance', 'gun_balance', 'health_balance', 'justice_reform'],
  mike_petersen:     ['democracy_balance', 'democracy_balance', null, 'religious_liberty', 'edu_parental', 'property_rights', null],
  ryan_d_wilcox:     ['tech_balance', null, 'gov_waste', 'justice_balance', 'privacy_rights', 'gun_rights', 'privacy_rights'],
  thomas_peterson:   [null, null, null, 'veterans', null, 'disaster_resilience', 'water_storage'],
  dhinkins:          [null, null, 'econ_workers', 'family_support', null, 'enviro_energy'],
  kristen_chevrier:  [null, null, 'rural_ag', 'privacy_rights', null, 'family_support'],
};

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`PolitiDex — strengthen THINNEST Utah profiles (wave 4)  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);

  console.log('1) Floor-video Spotlight items (Firestore):');
  let vidAdded = 0, vidMembers = 0;
  for (const [id, items] of Object.entries(VIDEO)) {
    let doc;
    try { doc = await getDoc(id); } catch (e) { console.log(`  ✗ ${id}: ${e.message}`); continue; }
    if (!doc) { console.log(`  – ${id}: not in Firestore — skipped`); continue; }
    const spotlight = Array.isArray(doc.spotlight) ? doc.spotlight.map((s) => ({ ...s })) : [];
    const have = new Set(spotlight.map((s) => String(s.headline || '')));
    const fresh = items.filter((it) => !have.has(it.headline));
    if (!fresh.length) { console.log(`  = ${id} (${doc.name}): all ${items.length} video item(s) already present`); continue; }
    const next = spotlight.concat(fresh);
    if (APPLY) await patch(id, { spotlight: next, updatedAt: STAMP });
    vidAdded += fresh.length; vidMembers++;
    console.log(`  ${APPLY ? '✎' : '→'} ${id} (${doc.name}): +${fresh.length} video — ${fresh.map((f) => f.source.label.split(' ')[0]).join(', ')}`);
  }

  console.log('\n2) Promise issueKey backfill (Firestore):');
  let keysAdded = 0, keyMembers = 0;
  for (const [id, keys] of Object.entries(PROMISE_KEYS)) {
    let doc;
    try { doc = await getDoc(id); } catch (e) { console.log(`  ✗ ${id}: ${e.message}`); continue; }
    if (!doc || !Array.isArray(doc.promises)) { console.log(`  – ${id}: no promises — skipped`); continue; }
    const promises = doc.promises.map((p) => ({ ...p }));
    if (keys.length !== promises.length) {
      console.log(`  ! ${id}: PROMISE_KEYS length ${keys.length} != ${promises.length} promises — applied by index`);
    }
    let added = 0;
    promises.forEach((p, i) => {
      const k = keys[i];
      if (k && !p.issueKey) { p.issueKey = k; added++; }
    });
    if (!added) { console.log(`  = ${id} (${doc.name}): no new keys`); continue; }
    if (APPLY) await patch(id, { promises, updatedAt: STAMP });
    keysAdded += added; keyMembers++;
    console.log(`  ${APPLY ? '✎' : '→'} ${id} (${doc.name}): +${added} promise issueKey(s)`);
  }

  console.log(`\n${APPLY ? 'Applied' : 'Would apply'}: ${vidAdded} floor-video item(s) across ${vidMembers} member(s); ` +
    `${keysAdded} promise issueKey(s) across ${keyMembers} member(s).`);
  if (!APPLY) console.log('\nRe-run with --apply to write Firestore.');
})();
