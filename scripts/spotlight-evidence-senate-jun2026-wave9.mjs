#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — June 2026 evidence pass, WAVE 9 (SENATE BALANCE)
// Verified official floor-video Spotlight evidence for sitting Utah State
// SENATORS who carried zero or very few connected Spotlight items after the
// House-heavy waves 1–8 — with emphasis on rural / single-county members and
// the chamber that was under-represented in the evidence library.
//
// ── WHY THE SENATE, AND WHO IS TARGETED ─────────────────────────────────────
//   Waves 1–8 built out the House (the 2025 freshman class and rural members).
//   An audit of the committed wave scripts shows almost no senator had ever
//   received an authored floor-video Spotlight item, so the library leaned
//   heavily toward the House. This wave rebalances it. The authority for
//   "currently sitting" is the Utah Legislature's own live roster,
//   le.utah.gov/data/legislators.json (29 senators). From that roster this wave
//   targets the rural / multi-rural-county senators (Winterton, Hinkins, Owens,
//   Vickers, Ipson, Wilson, Johnson, Sandall, Stratton, Grover, Musselman) and
//   newer / never-spotlighted members (Balderree, Cullimore, McKell) — exactly
//   the Senate profiles the evidence map most needs.
//
// ── HOW EVERY ITEM BELOW WAS VERIFIED END-TO-END (re-run live this pass) ─────
//   Each item is the senator's OWN recorded Senate-floor presentation of a bill
//   they personally chief-sponsored and that became law. The pipeline:
//     1) Bill index : le.utah.gov/data/2025GS/billlist.json was walked, and the
//        340 Senate-bill (SB) JSONs (le.utah.gov/data/2025GS/<BILL>.json) were
//        pulled. A bill is used ONLY when:
//          • its `primeSponsor` code is THIS senator's roster id (e.g. WINTER →
//            Ronald M. Winterton), confirming chief sponsorship, AND
//          • its `actionHistoryList` contains a "Governor Signed" (GSIGN)
//            action, so only ENACTED bills are framed as law.
//        Each `facts` paragraph is drawn from that bill's own
//        `highlightedProvisions`.
//     2) Floor video : the senator's OWN segment is the floorDebateList marker
//        whose `house` is "S" and whose description ends in the senator's
//        surname. Among that senator's Senate markers for the bill, the EARLIEST
//        substantive segment (≥90s long — the original 2nd/3rd-reading
//        presentation, not a one-line concurrence) is used. That marker's
//        archive page (floorArchive.jsp?markerID=<id>) carries the seek offset
//        for the segment in its player rows (offset=<sec> … data-markerid=<id>);
//        that offset (seconds → mm:ss / h:mm:ss) is the EXACT, verified seek
//        point cited as `media.timestamp`. The extractor was re-validated this
//        pass against known values (marker 129768 → 1764s → 29:24;
//        marker 131177 → 1588s → 26:28).
//
// ── NO DUPLICATES / HONESTY ─────────────────────────────────────────────────
//   Idempotent: each senator's live `spotlight` array is re-fetched and an item
//   is appended ONLY if no existing item shares its headline. Where an earlier,
//   non-floor-video script already left a generic card on one of these same
//   bills, the companion reconcile pass
//   (reconcile-senate-stubs-jun2026.mjs) keeps the single richest card per
//   bill. Senators with genuinely thin 2025 records are reported honestly and
//   not padded:
//     • Emily Buss (D11) was appointed December 17, 2025 — after the 2025
//       General Session — so she chief-sponsored no signed 2025 bill and gets
//       NO floor-video item this pass.
//     • J. Stuart Adams (D7) and Nate Blouin (D13) chief-sponsored no Senate
//       bill that was signed into law in 2025, so neither receives a
//       signed-bill floor-video item here.
//   These are recorded in the pass notes rather than forced.
//
// CONTENT_STYLE.md: every item is about the INDIVIDUAL senator's own bill and
// recorded action — never their party. "Signed into law" is a plain fact from
// the bill's own action history; no vote tally is labeled partisan. Each item
// carries an ISSUE_MAP `issueKey` (validated against the live 87-key vocabulary
// in index.html) chosen to match the bill's subject, so the Spotlight item lands
// on the same issue as the senator's stance and promises and joins the connected
// evidence map.
//
// Writes patch only the `spotlight` and `updatedAt` fields (quota-friendly),
// with backoff on 429.
//
//   node scripts/spotlight-evidence-senate-jun2026-wave9.mjs          # dry run
//   node scripts/spotlight-evidence-senate-jun2026-wave9.mjs --apply  # write
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
const billUrl = (num) => {
  // 'S.B. 139' / 'SB139' -> 'SB0139'  (canonical le.utah.gov static page)
  const compact = String(num).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const m = compact.match(/^([A-Z]+)(\d+)$/);
  const padded = m ? m[1] + m[2].padStart(4, '0') : compact;
  return `https://le.utah.gov/~2025/bills/static/${padded}.html`;
};

// Floor-video Spotlight item (senator's own presentation of a signed bill).
// `ts` is the verified seek offset for the senator's own marker segment.
function vidItem({ issueKey, headline, facts, why, billNum, ts, day, marker, tags }) {
  const item = {
    date: '2025', impact: 'positive', category: 'voting', issueKey,
    sourceType: 'official_floor_video',
    tags: tags || ['Notable Actions', 'Public Statements'],
    headline, facts, why,
    source: { label: `${billNum} (2025) — official bill record`, url: billUrl(billNum) },
    media: {
      type: 'video', url: floor(marker),
      label: `Official Utah Senate floor video — Day ${day}, 2025 General Session`,
    },
  };
  if (ts) item.media.timestamp = ts;
  return item;
}

// ── The plan: Firestore id → [spotlight items] ──────────────────────────────
// Every bill below is a 2025 GS Senate bill chief-sponsored by THIS senator,
// signed into law. Facts are drawn from the bill's own highlightedProvisions;
// timestamps are the verified per-marker seek offsets.
const PLAN = {

  // ===== Ronald M. Winterton — Senate District 20 (Daggett/Duchesne/Summit/
  //       Uintah/Wasatch — Uinta Basin, rural energy country) ================
  ronald_m_winterton: [
    vidItem({ issueKey: 'property_rights', billNum: 'S.B. 139', ts: '55:03', day: 15, marker: 129105,
      headline: 'Presented his Mineral Rights Amendments on the Senate floor (video at 55:03)',
      facts: "Winterton chief-sponsored S.B. 139 (2025), Mineral Rights Amendments, which requires that information about eminent domain and mineral rights be provided on the Office of the Property Rights Ombudsman's website. The official Utah Senate floor video opens to his presentation on Day 15 of the 2025 General Session at 55:03; the bill was signed into law.",
      why: "Putting plain eminent-domain and mineral-rights information in front of property owners through the state Property Rights Ombudsman is a recorded, enacted action in this rural-district senator's own words — the first connected floor-video item on his Spotlight record." }),
    vidItem({ issueKey: 'lands_energy', billNum: 'S.B. 207', ts: '1:41:21', day: 28, marker: 129937, tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried his Local Impact Mitigation tax on oil and gas production on the Senate floor (video at 1:41:21)',
      facts: "Winterton chief-sponsored S.B. 207 (2025), Local Impact Mitigation Amendments, which imposes a local impact mitigation tax on oil and gas produced in the state, provides certain exemptions, requires quarterly payment by producers, directs the State Tax Commission to distribute the revenue back to the counties from which it was collected, and limits the use of that revenue to transportation-related mitigation projects. The official Utah Senate floor video opens to his presentation on Day 28 of the 2025 session at 1:41:21; the bill was signed into law.",
      why: "Routing a share of oil-and-gas revenue back to the rural counties that absorb the road wear of production is a recorded, enacted action in his own words on energy and local infrastructure — a second issue anchoring his record." }),
  ],

  // ===== David P. Hinkins — Senate District 26 (Carbon/Emery/Garfield/Grand/
  //       Kane/San Juan/Utah/Wasatch/Wayne — large rural district) ===========
  david_p_hinkins: [
    vidItem({ issueKey: 'lands_balance', billNum: 'S.B. 5', ts: '25:06', day: 9, marker: 128838,
      headline: 'Presented the Natural Resources, Agriculture, and Environmental Quality base budget on the Senate floor (video at 25:06)',
      facts: "Hinkins chief-sponsored S.B. 5 (2025), Natural Resources, Agriculture, and Environmental Quality Base Budget, which provides appropriations for the use and support of the state's natural-resources, agriculture, and environmental-quality agencies, provides appropriations for other described purposes, and provides intent language. The official Utah Senate floor video opens to his presentation on Day 9 of the 2025 session at 25:06; the bill was signed into law.",
      why: "Carrying the base budget that funds Utah's lands, water, agriculture, and environmental agencies is a recorded, enacted action in this rural senator's own words on the natural-resource policy his district turns on." }),
    vidItem({ issueKey: 'family_support', billNum: 'S.B. 57', ts: '18:35', day: 28, marker: 129904, tags: ['Notable Actions', 'Consistency'],
      headline: 'Presented his Newborn Relinquishment Amendments on the Senate floor (video at 18:35)',
      facts: "Hinkins chief-sponsored S.B. 57 (2025), Newborn Relinquishment Amendments, which amends the definition of \"newborn child\" as that term is used in the provisions concerning the safe relinquishment of a newborn child. The official Utah Senate floor video opens to his presentation on Day 28 of the 2025 session at 18:35; the bill was signed into law.",
      why: "Adjusting Utah's safe-haven newborn-relinquishment law is a recorded, enacted action in his own words on child and family safety — a second, distinct issue on his record." }),
  ],

  // ===== Derrin R. Owens — Senate District 27 (Garfield/Juab/Kane/Millard/
  //       Piute/Sanpete/Sevier/Utah/Washington/Wayne — large rural) ==========
  derrin_r_owens: [
    vidItem({ issueKey: 'lands_energy', billNum: 'S.B. 61', ts: '38:50', day: 21, marker: 129459,
      headline: 'Presented his Energy Corridor Amendments on the Senate floor (video at 38:50)',
      facts: "Owens chief-sponsored S.B. 61 (2025), Energy Corridor Amendments, which requires a person filing an eminent-domain action for a high-voltage power line to conduct an infrastructure siting analysis and to coordinate with federal land-management agencies before pursuing condemnation of private lands, modifies the requirements for such eminent-domain complaints, and requires public utilities to report annually on eminent-domain actions and on efforts to use federal public lands. The official Utah Senate floor video opens to his presentation on Day 21 of the 2025 session at 38:50; the bill was signed into law.",
      why: "Making transmission-line builders study siting and look to federal land before condemning private property is a recorded, enacted action in this rural senator's own words on energy and property rights." }),
    vidItem({ issueKey: 'health_rural', billNum: 'S.B. 215', ts: '1:47:33', day: 28, marker: 129882, tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried his Emergency Medical Services Modifications on the Senate floor (video at 1:47:33)',
      facts: "Owens chief-sponsored S.B. 215 (2025), Emergency Medical Services Modifications, which requires municipalities and counties to ensure a minimum level of ground-ambulance interfacility transport service within their boundaries, requires them to review and evaluate their EMS provider every four years and to seek competitive sealed proposals from alternative qualified providers, and removes the Bureau of Emergency Medical Services from parts of that process. The official Utah Senate floor video opens to his presentation on Day 28 of the 2025 session at 1:47:33; the bill was signed into law.",
      why: "Guaranteeing a baseline of ambulance transport between facilities — a real gap in rural Utah — is a recorded, enacted action in his own words on rural healthcare access, a second issue on his record." }),
    vidItem({ issueKey: 'back_police', billNum: 'S.B. 255', ts: '1:19:03', day: 34, marker: 130483, tags: ['Notable Actions', 'Consistency'],
      headline: 'Presented his Line-of-Duty Death Benefit Amendments on the Senate floor (video at 1:19:03)',
      facts: "Owens chief-sponsored S.B. 255 (2025), Line-of-Duty Death Benefit Amendments, which adds dental and vision benefits to those available to the spouse and surviving children of a public-safety or fire-service employee who dies in the line of duty and removes the 12-month waiting period for accessing funds from the Local Public Safety and Firefighter Surviving Spouse Trust Fund. The official Utah Senate floor video opens to his presentation on Day 34 of the 2025 session at 1:19:03; the bill was signed into law.",
      why: "Widening and speeding the survivor benefits owed to the families of first responders killed on duty is a recorded, enacted action in his own words — a third distinct issue on his record." }),
  ],

  // ===== Evan J. Vickers — Senate District 28 (Beaver/Iron/Juab/Millard/
  //       Washington — rural; a practicing pharmacist) =======================
  evan_j_vickers: [
    vidItem({ issueKey: 'healthcare', billNum: 'S.B. 312', ts: '45:25', day: 35, marker: 130621,
      headline: 'Presented his Pharmacy Practice Amendments on the Senate floor (video at 45:25)',
      facts: "Vickers chief-sponsored S.B. 312 (2025), Pharmacy Practice Amendments, which recognizes a pharmacist as a health-care provider in limited circumstances, addresses a prescription for a device necessary to deliver a prescribed drug, amends the advance-notice requirement for an audit of pharmacy records, and modifies the definition of \"eligible pharmacy\" for the Charitable Prescription Drug Recycling Act. The official Utah Senate floor video opens to his presentation on Day 35 of the 2025 session at 45:25; the bill was signed into law.",
      why: "Expanding how pharmacists are recognized in care and how their records are audited is a recorded, enacted action in this pharmacist-senator's own words on the health-policy field he works in." }),
    vidItem({ issueKey: 'justice_balance', billNum: 'S.B. 68', ts: '42:17', day: 8, marker: 128808, tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried his Child Welfare Worker Protections on the Senate floor (video at 42:17)',
      facts: "Vickers chief-sponsored S.B. 68 (2025), Child Welfare Worker Protections, which separates the crime of assault or threat of violence against a child-welfare worker into two sections, amends the elements of assault against a child-welfare worker to include assaulting a worker's family member, and amends the offense of threatening a child-welfare worker to include threats against a family member. The official Utah Senate floor video opens to his presentation on Day 8 of the 2025 session at 42:17; the bill was signed into law.",
      why: "Defining tougher, clearer criminal protection for the workers who handle child-welfare cases is a recorded, enacted action in his own words on criminal justice — a second issue on his record." }),
  ],

  // ===== Don L. Ipson — Senate District 29 (Washington — southwest Utah) =====
  don_l_ipson: [
    vidItem({ issueKey: 'justice_balance', billNum: 'S.B. 24', ts: '6:49', day: 18, marker: 129352,
      headline: 'Presented his Child Abuse and Torture Amendments creating a child-torture offense on the Senate floor (video at 6:49)',
      facts: "Ipson chief-sponsored S.B. 24 (2025), Child Abuse and Torture Amendments, which creates a new criminal offense for child torture and provides penalties, adds child torture to the list of offenses for which imprisonment is mandatory, amends existing definitions relating to child abuse and aggravated criminal child abuse, and incorporates the new offense into related statutes. The official Utah Senate floor video opens to his presentation on Day 18 of the 2025 session at 6:49; the bill was signed into law.",
      why: "Writing a distinct child-torture crime with mandatory imprisonment into Utah law is a recorded, enacted action in this senator's own words on protecting children through the criminal code." }),
    vidItem({ issueKey: 'infrastructure', billNum: 'S.B. 251', ts: '25:49', day: 30, marker: 130099, tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried his Commercial Vehicle Registration Amendments on the Senate floor (video at 25:49)',
      facts: "Ipson chief-sponsored S.B. 251 (2025), Commercial Vehicle Registration Amendments, which allows for a conditional registration of a new commercial motor vehicle in certain circumstances. The official Utah Senate floor video opens to his presentation on Day 30 of the 2025 session at 25:49; the bill was signed into law.",
      why: "Smoothing how a new commercial truck can be registered and put to work is a recorded, enacted action in his own words on transportation and the freight economy — a second issue on his record." }),
  ],

  // ===== Chris H. Wilson — Senate District 2 (Cache/Rich — rural north) ======
  chris_h_wilson: [
    vidItem({ issueKey: 'property_tax', billNum: 'S.B. 202', ts: '1:33:09', day: 28, marker: 129931,
      headline: 'Presented his Property Tax Revisions on the Senate floor (video at 1:33:09)',
      facts: "Wilson chief-sponsored S.B. 202 (2025), Property Tax Revisions, which requires counties to provide the State Tax Commission a preliminary assessment book before delivery to the county auditor, requires the commission to take corrective action when a county officer fails to comply with assessment duties, describes the available forms of corrective action, and adjusts the costs counties pay for commission appraisal assistance. The official Utah Senate floor video opens to his presentation on Day 28 of the 2025 session at 1:33:09; the bill was signed into law.",
      why: "Tightening oversight of how counties assess property for tax is a recorded, enacted action in this rural senator's own words on property-tax fairness and administration." }),
    vidItem({ issueKey: 'edu_parental', billNum: 'S.B. 98', ts: '6:55', day: 18, marker: 129378, tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried his Parental Education on Student Use of Technology bill on the Senate floor (video at 6:55)',
      facts: "Wilson chief-sponsored S.B. 98 (2025), Parental Education on Student Use of Technology Amendments, which requires the State Board of Education to create a video presentation for parents on the potential safety and legal issues a student may encounter using technology and to make that presentation available to each school district to share with parents, and provides a sunset date. The official Utah Senate floor video opens to his presentation on Day 18 of the 2025 session at 6:55; the bill was signed into law.",
      why: "Equipping parents with a clear briefing on the risks of student technology use is a recorded, enacted action in his own words on parental engagement in schools — a second issue on his record." }),
  ],

  // ===== John D. Johnson — Senate District 3 (Morgan/Summit/Weber) ==========
  john_d_johnson: [
    vidItem({ issueKey: 'healthcare', billNum: 'S.B. 274', ts: '2:37:00', day: 31, marker: 130357,
      headline: 'Presented his Health Insurance Preauthorization Revisions on the Senate floor (video at 2:37:00)',
      facts: "Johnson chief-sponsored S.B. 274 (2025), Health Insurance Preauthorization Revisions, which requires health insurers to provide information related to preauthorization to the Department of Insurance, to patients, and to health-care providers, and creates a repeal date. The official Utah Senate floor video opens to his presentation on Day 31 of the 2025 session at 2:37:00; the bill was signed into law.",
      why: "Forcing daylight onto how insurers run prior authorization — a routine friction point between patients and care — is a recorded, enacted action in this senator's own words on healthcare." }),
    vidItem({ issueKey: 'public_schools', billNum: 'S.B. 39', ts: '12:31', day: 7, marker: 128747, tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried his Education Testing Amendments on the Senate floor (video at 12:31)',
      facts: "Johnson chief-sponsored S.B. 39 (2025), Education Testing Amendments, which increases the grade range for certain subjects of the state selected standards assessment and removes provisions requiring the use of a different assessment. The official Utah Senate floor video opens to his presentation on Day 7 of the 2025 session at 12:31; the bill was signed into law.",
      why: "Reworking which grades and tests Utah uses to measure students is a recorded, enacted action in his own words on public-school accountability — a second issue on his record." }),
  ],

  // ===== Scott D. Sandall — Senate District 1 (Box Elder/Cache/Tooele —
  //       rural; Senate Majority Whip) ======================================
  scott_d_sandall: [
    vidItem({ issueKey: 'water', billNum: 'S.B. 80', ts: '47:54', day: 15, marker: 129103,
      headline: 'Presented his Water Fee Amendments on the Senate floor (video at 47:54)',
      facts: "Sandall chief-sponsored S.B. 80 (2025), Water Fee Amendments, which requires the Department of Environmental Quality to establish a fee schedule, allows the Water Development Coordinating Council to establish a fee schedule beginning July 1, 2026 subject to legislative approval, exempts special districts from certain fee requirements, and outlines requirements related to the fee schedules. The official Utah Senate floor video opens to his presentation on Day 15 of the 2025 session at 47:54; the bill was signed into law.",
      why: "Setting how the state funds the regulation of Utah's water is a recorded, enacted action in this rural senator's own words on the resource his district depends on most." }),
    vidItem({ issueKey: 'enviro_energy', billNum: 'S.B. 132', ts: '1:35:45', day: 25, marker: 129810, tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried his Electric Utility Amendments for large-load customers on the Senate floor (video at 1:35:45)',
      facts: "Sandall chief-sponsored S.B. 132 (2025), Electric Utility Amendments, which establishes alternative processes for providing electric service to customers with large electrical loads, exempts that service from certain rate-regulation requirements while maintaining safety and reliability standards, creates procedures for evaluating and contracting large-scale service requests, and creates accounting and transparency requirements to protect retail customers. The official Utah Senate floor video opens to his presentation on Day 25 of the 2025 session at 1:35:45; the bill was signed into law.",
      why: "Building a framework for very large electricity users while shielding ordinary ratepayers is a recorded, enacted action in his own words on energy policy — a second issue on his record." }),
  ],

  // ===== Keven J. Stratton — Senate District 24 (Utah/Wasatch) ==============
  keven_j_stratton: [
    vidItem({ issueKey: 'lands_local', billNum: 'S.B. 158', ts: '57:57', day: 15, marker: 129107,
      headline: 'Presented his Sale or Lease of Federally Managed Public Land bill on the Senate floor (video at 57:57)',
      facts: "Stratton chief-sponsored S.B. 158 (2025), Sale or Lease of Federally Managed Public Land Amendments, which defines terms, provides for monitoring of land applications, requires a study of land-application information, and requires a report of the study's results. The official Utah Senate floor video opens to his presentation on Day 15 of the 2025 session at 57:57; the bill was signed into law.",
      why: "Tracking and studying how federally managed public land in Utah is sold or leased is a recorded, enacted action in this senator's own words on public-lands policy." }),
    vidItem({ issueKey: 'enviro_balance', billNum: 'S.B. 159', ts: '56:39', day: 21, marker: 129499, tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried his Environmental Quality Modifications on the Senate floor (video at 56:39)',
      facts: "Stratton chief-sponsored S.B. 159 (2025), Environmental Quality Modifications, which prohibits approval of an operation plan or permit for certain nonhazardous solid-waste landfill facilities unless specific conditions are met and addresses the treatment of certain existing nonhazardous solid-waste facilities. The official Utah Senate floor video opens to his presentation on Day 21 of the 2025 session at 56:39; the bill was signed into law.",
      why: "Setting conditions before new landfills can be permitted is a recorded, enacted action in his own words on environmental quality — a second issue on his record." }),
  ],

  // ===== Keith Grover — Senate District 23 (Utah County) ====================
  keith_grover: [
    vidItem({ issueKey: 'gun_balance', billNum: 'S.B. 14', ts: '18:25', day: 3, marker: 128616,
      headline: 'Presented his Private Sale of a Firearm Sunset Review bill on the Senate floor (video at 18:25)',
      facts: "Grover chief-sponsored S.B. 14 (2025), Private Sale of a Firearm Sunset Review Amendments, which removes the sunset-review provision for Section 76-10-526.1 — the statute on an information check before the private sale of a firearm — and makes technical and conforming changes. The official Utah Senate floor video opens to his presentation on Day 3 of the 2025 session at 18:25; the bill was signed into law.",
      why: "Removing the scheduled expiration of the private-firearm-sale information-check statute is a recorded, enacted action in this senator's own words on firearm-transfer law." }),
    vidItem({ issueKey: 'public_schools', billNum: 'S.B. 188', ts: '1:22:24', day: 22, marker: 129599, tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried his School District Modifications on the Senate floor (video at 1:22:24)',
      facts: "Grover chief-sponsored S.B. 188 (2025), School District Modifications, which enacts dates for redistricting local school-board districts after the creation of certain new school districts, adds duties for the Office of the Legislative Auditor General during the transition, extends transferred employees' salary-and-benefit rights by an additional year, and reduces the body of voters whose approval is required to create a new school district. The official Utah Senate floor video opens to his presentation on Day 22 of the 2025 session at 1:22:24; the bill was signed into law.",
      why: "Setting the rules for how communities split off and stand up new school districts is a recorded, enacted action in his own words on public-education governance — a second issue on his record." }),
  ],

  // ===== Calvin R. Musselman — Senate District 4 (Davis/Weber) =============
  calvin_r_musselman: [
    vidItem({ issueKey: 'justice_balance', billNum: 'S.B. 90', ts: '51:37', day: 31, marker: 130315,
      headline: 'Presented his Mandatory Jail Sentence Amendments on the Senate floor (video at 51:37)',
      facts: "Musselman chief-sponsored S.B. 90 (2025), Mandatory Jail Sentence Amendments, which requires a mandatory jail sentence for certain drug and theft crimes committed under certain conditions and with specified prior convictions, and provides that a person who receives such a mandatory jail sentence may not be turned over to the federal government for deportation until the entire mandatory sentence is served, with limited exceptions. The official Utah Senate floor video opens to his presentation on Day 31 of the 2025 session at 51:37; the bill was signed into law.",
      why: "Attaching mandatory jail time to repeat drug-and-theft offenses is a recorded, enacted action in this senator's own words on criminal justice." }),
    vidItem({ issueKey: 'election_integrity', billNum: 'S.B. 53', ts: '1:22:20', day: 1, marker: 128560, tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried his Election Code Amendments on the Senate floor (video at 1:22:20)',
      facts: "Musselman chief-sponsored S.B. 53 (2025), Election Code Amendments, which standardizes the language for a voter who, after signing a petition, seeks to remove their signature, shortens the time petition sponsors of a passed incorporation have to determine features of the new government, clarifies candidacy-filing deadlines for a newly incorporating municipality, and clarifies that the county clerk decides whether to remove a signature from an incorporation petition. The official Utah Senate floor video opens to his presentation on Day 1 of the 2025 session at 1:22:20; the bill was signed into law.",
      why: "Clarifying signature-withdrawal and incorporation-petition procedures is a recorded, enacted action in his own words on election administration — a second issue on his record." }),
  ],

  // ===== Heidi Balderree — Senate District 22 (Salt Lake/Utah; newer member,
  //       appointed October 2023) ===========================================
  heidi_balderree: [
    vidItem({ issueKey: 'property_tax', billNum: 'S.B. 95', ts: '44:15', day: 14, marker: 129028,
      headline: 'Presented her Truth in Taxation Amendments on the Senate floor (video at 44:15)',
      facts: "Balderree chief-sponsored S.B. 95 (2025), Truth in Taxation Amendments, which defines \"meeting\" to align with the Open and Public Meetings Act so that a public hearing on increasing the property-tax rate above the certified tax rate requires the presence of a quorum of the taxing entity, and makes technical changes. The official Utah Senate floor video opens to her presentation on Day 14 of the 2025 session at 44:15; the bill was signed into law.",
      why: "Requiring a real quorum at the Truth-in-Taxation hearing where a tax increase is decided is a recorded, enacted action in this newer senator's own words on property-tax accountability." }),
    vidItem({ issueKey: 'property_rights', billNum: 'S.B. 55', ts: '39:29', day: 3, marker: 128634, tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried her Unauthorized Use of Real Property bill on the Senate floor (video at 39:29)',
      facts: "Balderree chief-sponsored S.B. 55 (2025), Unauthorized Use of Real Property Amendments, which authorizes property owners or their agents to request law-enforcement assistance for the immediate removal of a trespasser under certain conditions, sets the requirements for the owner's complaint, provides procedures for law enforcement, and authorizes officers to arrest a trespasser for legal cause. The official Utah Senate floor video opens to her presentation on Day 3 of the 2025 session at 39:29; the bill was signed into law.",
      why: "Giving owners a faster, defined path to remove a trespasser is a recorded, enacted action in her own words on property rights — a second issue on her record." }),
  ],

  // ===== Kirk A. Cullimore — Senate District 19 (Salt Lake/Utah) ============
  kirk_a_cullimore: [
    vidItem({ issueKey: 'tech_balance', billNum: 'S.B. 226', ts: '2:03:33', day: 31, marker: 130340,
      headline: 'Presented his Artificial Intelligence Consumer Protection Amendments on the Senate floor (video at 2:03:33)',
      facts: "Cullimore chief-sponsored S.B. 226 (2025), Artificial Intelligence Consumer Protection Amendments, which requires certain disclosures when generative artificial intelligence is used in consumer transactions and regulated services, establishes liability for consumer-protection violations involving AI, provides a safe harbor for certain disclosures, grants the Division of Consumer Protection rulemaking and enforcement authority, and extends the repeal date of the Artificial Intelligence Policy Act. The official Utah Senate floor video opens to his presentation on Day 31 of the 2025 session at 2:03:33; the bill was signed into law.",
      why: "Requiring businesses to tell people when they are dealing with generative AI is a recorded, enacted action in this senator's own words on technology and consumer protection." }),
    vidItem({ issueKey: 'school_choice', billNum: 'S.B. 137', ts: '27:31', day: 28, marker: 129851, tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried his Course Choice Empowerment bill on the Senate floor (video at 27:31)',
      facts: "Cullimore chief-sponsored S.B. 137 (2025), Course Choice Empowerment, which establishes standards for educational software and hardware procurement, creates an online course-choice program specifically for private-school students administered by an independent program manager contracted by the State Board of Education, and allows eligible students to earn credits through online courses including blended-learning environments. The official Utah Senate floor video opens to his presentation on Day 28 of the 2025 session at 27:31; the bill was signed into law.",
      why: "Opening state-administered online courses to private-school students is a recorded, enacted action in his own words on school choice — a second issue on his record." }),
  ],

  // ===== Michael K. McKell — Senate District 25 (Utah County) ===============
  michael_k_mckell: [
    vidItem({ issueKey: 'public_schools', billNum: 'S.B. 223', ts: '1:05:07', day: 34, marker: 130476,
      headline: 'Presented his Public Education Bullying Amendments on the Senate floor (video at 1:05:07)',
      facts: "McKell chief-sponsored S.B. 223 (2025), Public Education Bullying Amendments, which amends the definition of \"bullying,\" defines the terms \"staff bullying\" and \"student bullying,\" and makes technical corrections. The official Utah Senate floor video opens to his presentation on Day 34 of the 2025 session at 1:05:07; the bill was signed into law.",
      why: "Sharpening how Utah law defines bullying — including staff-on-student and student conduct — is a recorded, enacted action in this senator's own words on student safety in public schools." }),
    vidItem({ issueKey: 'gov_transparency', billNum: 'S.B. 277', ts: '1:37:47', day: 36, marker: 130767, tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried his Government Records Management Amendments on the Senate floor (video at 1:37:47)',
      facts: "McKell chief-sponsored S.B. 277 (2025), Government Records Management Amendments, which creates an office within the division to handle government records management, has the governor appoint its director with the advice and consent of the Senate, describes the director's term, qualifications, and duties, requires a periodic performance evaluation of the director, and repeals the prior committee whose duties the director assumes. The official Utah Senate floor video opens to his presentation on Day 36 of the 2025 session at 1:37:47; the bill was signed into law.",
      why: "Restructuring who manages and answers for Utah's government records is a recorded, enacted action in his own words on government transparency — a second issue on his record." }),
  ],

};

// ── apply ───────────────────────────────────────────────────────────────────
function hk(s) { return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 70); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getDoc(id) {
  for (let a = 0; a < 8; a++) {
    const r = await fetch(`${BASE}/${id}`);
    if (r.ok) {
      const j = await r.json();
      const o = {};
      for (const [k, val] of Object.entries(j.fields || {})) o[k] = dec(val);
      return o;
    }
    if (r.status === 404) return null;
    if (r.status === 429) { await sleep(8000 * (a + 1)); continue; }
    return null;
  }
  return '__throttled__';
}

async function patchSpotlight(id, spotlight) {
  const fields = { spotlight: enc(spotlight), updatedAt: enc(STAMP) };
  const url = `${BASE}/${id}?updateMask.fieldPaths=spotlight&updateMask.fieldPaths=updatedAt`;
  for (let a = 0; a < 8; a++) {
    const r = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    });
    if (r.ok) return;
    if (r.status === 429) { await sleep(8000 * (a + 1)); continue; }
    throw new Error(`PATCH ${id} -> ${r.status} ${await r.text()}`);
  }
  throw new Error(`PATCH ${id} -> throttled after retries`);
}

let totalNew = 0, totalLeg = 0;
const issueTally = {};

for (const [id, items] of Object.entries(PLAN)) {
  const doc = await getDoc(id);
  if (doc === '__throttled__') { console.log(`!! THROTTLED reading ${id} — Firestore quota exhausted; re-run later`); continue; }
  if (!doc) { console.log(`!! MISSING doc: ${id} (no Firestore profile — skipped)`); continue; }
  const existing = Array.isArray(doc.spotlight) ? doc.spotlight : [];
  const seen = new Set(existing.map((s) => hk(s.headline || s.title)));
  const toAdd = items.filter((it) => !seen.has(hk(it.headline)));
  if (!toAdd.length) { console.log(`= ${id}: nothing new (${existing.length} existing)`); continue; }
  totalLeg++;
  toAdd.forEach((it) => {
    totalNew++;
    if (it.issueKey) issueTally[it.issueKey] = (issueTally[it.issueKey] || 0) + 1;
  });
  const merged = existing.concat(toAdd);
  console.log(`+ ${id} (${doc.name}): +${toAdd.length} [${existing.length} -> ${merged.length}]`);
  toAdd.forEach((it) => console.log(`    • [${it.sourceType}] ${it.headline}  #${it.issueKey}`));
  if (APPLY) {
    await patchSpotlight(id, merged);
    console.log('    ✓ written');
    await sleep(1500);
  }
}

console.log('\n──────── summary ────────');
console.log(`senators touched      : ${totalLeg}`);
console.log(`new spotlight items   : ${totalNew}`);
console.log(`  official floor video : ${totalNew}`);
console.log('issue tally :', Object.entries(issueTally).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}=${n}`).join(', '));
console.log(APPLY ? '\nAPPLIED to Firestore.' : '\nDRY RUN — re-run with --apply to write.');
