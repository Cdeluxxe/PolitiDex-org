#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — June 2026 VIDEO-EVIDENCE Spotlight pass, WAVE 2
// (thin + rural sitting Utah legislators)
//
// Continues scripts/spotlight-video-evidence-jun2026.mjs. Every item below is
// grounded in the legislator's OWN recorded floor presentation of a bill they
// chief-sponsored, pulled and re-verified from the Utah Legislature's own data:
//
//   • Bill record  : https://le.utah.gov/data/<session>/<bill>.json  — gives the
//     prime sponsor, short title, the verbatim "highlighted provisions" each
//     `facts` paragraph is built from, the Governor-signed action, AND the
//     `floorDebateList` (the official per-bill list of floor-video markers,
//     each tagged with the bill number + the sponsor's surname).
//   • Floor video  : the marker's own archive page, whose `data-offset` (seconds
//     → mm:ss) is the EXACT point the official recording seeks to for that
//     member's presentation. Each 2025 timestamp below was extracted from that
//     page and re-verified live (e.g. marker 129768 → 1764s → 29:24).
//
// HONESTY / CONTENT_STYLE rules (same as wave 1):
//   • Every item is about the INDIVIDUAL's own words, bill, and recorded vote —
//     never their party. No party-grouping language; the enacted/signed status
//     is stated as a plain fact from the bill's action history.
//   • No fabricated timestamps. 2025 floor markers expose a verified per-item
//     offset, so an mm:ss is given. The 2026 archive (utleg.gov) does NOT expose
//     a reliable per-item offset, so the two 2026 items (Shelley) link the
//     official marker and say plainly that no per-item timestamp is published.
//   • `source` points at the official bill record; `media` points at the floor
//     video marker — separating "the documented record" from "the spoken-words
//     proof" so a future evidence view can show stance + video + promise +
//     follow-through side by side. Unknown fields are ignored by current render.
//   • Every item carries an ISSUE_MAP `issueKey`, chosen to match the member's
//     own documented keyIssues / promises so the Spotlight item lands on the
//     same issue as their position and the promise it backs.
//   • Idempotent: each member's live `spotlight` array is re-fetched and an item
//     is appended ONLY if no existing item shares its headline.
//
//   node scripts/spotlight-video-evidence-jun2026-wave2.mjs            # dry run
//   node scripts/spotlight-video-evidence-jun2026-wave2.mjs --apply    # write
// ---------------------------------------------------------------------------

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const STAMP = '2026-06-20T00:00:00.000Z';

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

// Official Utah Legislature floor-video marker (seeks to the sponsor's segment).
const floor25 = (id) => `https://le.utah.gov/av/floorArchive.jsp?markerID=${id}`;
const floor26 = (id) => `https://www.utleg.gov/event-streaming/floor/marker/${id}`;
// Official bill record (sponsor, provisions, signed status).
const bill = (yr, num) => `https://le.utah.gov/~${yr}/bills/static/${num}.html`;

// Helper to keep each item terse to author.
const vid = (ts, day, chamber) => ({ type: 'video', timestamp: ts,
  label: `Official Utah ${chamber} floor video — Day ${day}, 2025 General Session` });

// ── The plan: id → [spotlight items] ────────────────────────────────────────
const PLAN = {

  // ===== Rex Shipp — House District 71 (Cedar City / Iron County, rural) =====
  rshipp: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'public_schools',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'On the House floor, presented his firearm-safety-in-schools bill (video at 29:24)',
      facts: "Shipp chief-sponsored HB104 (2025), Firearm Safety in Schools Amendments, requiring local education agencies to offer firearm-safety instruction to students, with guidelines for instructors and an opt-out provision for families. The Legislature's official floor video opens to his presentation on Day 25 of the 2025 session at 29:24; the bill passed and was signed into law.",
      why: "Firearm-safety education is the first item Shipp lists about himself, and here he argues it in his own words on the floor — recorded proof behind the kept promise his profile already tracks.",
      source: { label: 'HB104 (2025) — official bill record', url: bill('2025', 'HB0104') },
      media: { ...vid('29:24', 25, 'House'), url: floor25(129768) } },
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'rural_ag',
      tags: ['Notable Actions', 'Consistency'],
      headline: 'Floor-sponsored his urban-farming property-tax bill (video at 11:46)',
      facts: "Shipp chief-sponsored HB240 (2025), Urban Farming Assessment Amendments, letting land qualify for urban-farming property-tax assessment based on gross sales as well as production, with documentation filed to the county assessor. The official floor video opens to his presentation on Day 30 at 11:46; the bill was signed into law.",
      why: "It pairs his agriculture-and-water focus with concrete property-tax relief for small farm operations — a recorded floor argument backing the second keyissue his profile names.",
      source: { label: 'HB240 (2025) — official bill record', url: bill('2025', 'HB0240') },
      media: { ...vid('11:46', 30, 'House'), url: floor25(130154) } },
  ],

  // ===== Ronald Winterton — Senate District 20 (Uintah Basin, rural) =====
  rwinterton: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'lands_energy',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his mineral-rights transparency bill on the Senate floor (video at 55:03)',
      facts: "Winterton chief-sponsored SB139 (2025), Mineral Rights Amendments, requiring the Office of the Property Rights Ombudsman to publish clear information about eminent domain and mineral rights for landowners. The official Senate floor video opens to his presentation on Day 15 of the 2025 session at 55:03; the bill was signed into law.",
      why: "Strengthening mineral-rights and property protections is a documented promise and a core of his oil-gas-and-mining keyissue — and he made the case for it himself on the record.",
      source: { label: 'SB139 (2025) — official bill record', url: bill('2025', 'SB0139') },
      media: { ...vid('55:03', 15, 'Senate'), url: floor25(129105) } },
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'immigration_reform',
      tags: ['Notable Actions'],
      headline: 'Sponsored the bill creating a state Refugee Services Office (video at 36:43)',
      facts: "Winterton chief-sponsored SB31 (2025), Refugee Services Amendments, creating a Refugee Services Office within the Department of Workforce Services and defining its duties. The official Senate floor video opens to his presentation on Day 15 at 36:43; the bill was signed into law.",
      why: "A rural-energy senator carrying refugee-services policy broadens the documented record of what he personally champions — and delivers a kept promise his profile lists.",
      source: { label: 'SB31 (2025) — official bill record', url: bill('2025', 'SB0031') },
      media: { ...vid('36:43', 15, 'Senate'), url: floor25(129072) } },
  ],

  // ===== Scott Chew — House District 68 (Uintah / Duchesne, rural rancher) =====
  scott_chew: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'lands_local',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Carried his rural outdoor-recreation funding bill on the floor (video at 1:10:36)',
      facts: "Chew chief-sponsored HB439 (2025), Outdoor Recreation Revisions, letting the Division of Outdoor Recreation award upfront cash grants from the Off-highway Vehicle Account for projects in smaller (third- through sixth-class) counties. The official floor video opens to his presentation on Day 35 of the 2025 session at 1:10:36; the bill was signed into law.",
      why: "Steering recreation dollars toward rural counties matches the rural-land-use and local-control focus his profile centers on — argued in his own words and now law.",
      source: { label: 'HB439 (2025) — official bill record', url: bill('2025', 'HB0439') },
      media: { ...vid('1:10:36', 35, 'House'), url: floor25(130625) } },
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'lower_taxes',
      tags: ['Notable Actions', 'Consistency'],
      headline: 'Presented his lifetime trailer-registration bill (video at 1:18:45)',
      facts: "Chew chief-sponsored HB166 (2025), Trailer Registration and Uniform Fee Amendments, letting owners of certain trailers register for the life of the trailer with a one-time uniform fee in lieu of annual ad valorem tax. The official floor video opens to his presentation on Day 22 at 1:18:45; the bill was signed into law.",
      why: "A small, concrete cut in recurring costs for farmers and small operators — a kept promise his profile tracks, with the floor presentation as recorded proof.",
      source: { label: 'HB166 (2025) — official bill record', url: bill('2025', 'HB0166') },
      media: { ...vid('1:18:45', 22, 'House'), url: floor25(129595) } },
  ],

  // ===== Derrin Owens — Senate District 27 (Sanpete, rural) =====
  dowens_st: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'enviro_energy',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his energy-corridor eminent-domain bill on the Senate floor (video at 58:45)',
      facts: "Owens chief-sponsored SB61 (2025), Energy Corridor Amendments, requiring anyone filing eminent domain for a high-voltage power line to first complete an infrastructure-siting analysis and coordinate with federal land agencies before condemning private land. The official Senate floor video opens to his presentation on Day 18 of the 2025 session at 58:45; the bill was signed into law.",
      why: "Pushing transmission lines onto federal corridors before private land directly delivers the energy-and-property promise his profile documents, in his own recorded words.",
      source: { label: 'SB61 (2025) — official bill record', url: bill('2025', 'SB0061') },
      media: { ...vid('58:45', 18, 'Senate'), url: floor25(129374) } },
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'back_police',
      tags: ['Notable Actions', 'Consistency'],
      headline: 'Sponsored expanded line-of-duty death benefits for first-responder families (video at 1:19:03)',
      facts: "Owens chief-sponsored SB255 (2025), Line-of-Duty Death Benefit Amendments, adding dental and vision coverage for the spouse and children of a public-safety or fire employee killed in the line of duty and removing the 12-month waiting period to access trust-fund benefits. The official Senate floor video opens to his presentation on Day 34 at 1:19:03; the bill was signed into law.",
      why: "It substantiates the public-safety priority his profile names with tangible help for surviving families — a kept promise he argued himself on the floor.",
      source: { label: 'SB255 (2025) — official bill record', url: bill('2025', 'SB0255') },
      media: { ...vid('1:19:03', 34, 'Senate'), url: floor25(130483) } },
  ],

  // ===== Logan Monson — House District 69 (Beaver/Millard, rural) =====
  logan_monson: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'rural_ag',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his grazing-permit oversight bill on the House floor (video at 46:14)',
      facts: "Monson chief-sponsored HB421 (2025), Grazing Amendments, requiring the Division of Wildlife Resources to get approval from the local land-use authority, the Department of Natural Resources, and the Department of Agriculture and Food before buying or acquiring a grazing permit. The official floor video opens to his presentation on Day 30 of the 2025 session at 46:14; the bill was signed into law.",
      why: "Putting local government and agriculture ahead of a state wildlife agency on grazing permits is the agriculture-and-local-control priority his profile centers on — recorded and enacted.",
      source: { label: 'HB421 (2025) — official bill record', url: bill('2025', 'HB0421') },
      media: { ...vid('46:14', 30, 'House'), url: floor25(130176) } },
    { date: '2025', impact: 'neutral', category: 'voting', issueKey: 'gov_regulation',
      tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried a bill repealing outdated state-agency reporting mandates (video at 32:11)',
      facts: "Monson chief-sponsored HB482 (2025), Health and Human Services Reporting Requirements, repealing a set of obsolete reporting mandates on the Department of Health and Human Services. The official floor video opens to his presentation on Day 38 at 32:11; the bill was signed into law.",
      why: "Trimming stale reporting rules is small but matches the limited-government keyissue his profile lists — a recorded follow-through, not a slogan.",
      source: { label: 'HB482 (2025) — official bill record', url: bill('2025', 'HB0482') },
      media: { ...vid('32:11', 38, 'House'), url: floor25(130972) } },
  ],

  // ===== Mike Kohler — House District 59 (Wasatch / Summit, rural farmer) =====
  mike_kohler: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'rural_ag',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his animal-composting bill for farms and ranches (video at 1:15:10)',
      facts: "Kohler chief-sponsored HB342 (2025), Animal Composting Amendments, narrowing the definition of a commercial solid-waste facility so that certain farm and ranch animal-composting operations are not regulated as waste facilities. The official floor video opens to his presentation on Day 22 of the 2025 session at 1:15:10; the bill was signed into law.",
      why: "A working farmer fixing a rule that burdened on-farm composting is exactly the agriculture-and-farmland focus his profile names — a kept promise he made on the record.",
      source: { label: 'HB342 (2025) — official bill record', url: bill('2025', 'HB0342') },
      media: { ...vid('1:15:10', 22, 'House'), url: floor25(129594) } },
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'property_rights',
      tags: ['Notable Actions', 'Consistency'],
      headline: 'Floor-sponsored a high-tunnel farm-structure building-code exemption (video at 1:37:29)',
      facts: "Kohler chief-sponsored HB435 (2025), Building Code Amendments, exempting agricultural high-tunnel structures from county building regulation and expanding their permissible uses. The official floor video opens to his presentation on Day 35 at 1:37:29; the bill was signed into law.",
      why: "Freeing low-cost season-extension structures from building permits backs the agritourism-and-farmland promise his profile tracks — argued in his own words.",
      source: { label: 'HB435 (2025) — official bill record', url: bill('2025', 'HB0435') },
      media: { ...vid('1:37:29', 35, 'House'), url: floor25(130577) } },
  ],

  // ===== A. Cory Maloy — House District 52 (Lehi) =====
  cory_maloy: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'back_police',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his bill speeding location data to police in missing-person danger cases (video at 1:39:15)',
      facts: "Maloy chief-sponsored HB366 (2025), Access to Communication Device Location Information Amendments, requiring mobile carriers to provide device-location information as quickly as possible when a law-enforcement warrant flags a missing person in danger. The official floor video opens to his presentation on Day 30 of the 2025 session at 1:39:15; the bill was signed into law.",
      why: "It connects his public-safety record to a concrete, time-sensitive tool for finding people in danger — recorded proof behind the law-enforcement priority his profile lists.",
      source: { label: 'HB366 (2025) — official bill record', url: bill('2025', 'HB0366') },
      media: { ...vid('1:39:15', 30, 'House'), url: floor25(130199) } },
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'econ_smallbiz',
      tags: ['Notable Actions', 'Consistency'],
      headline: 'Floor-sponsored the Earned Wage Access Services Act (video at 1:02:44)',
      facts: "Maloy chief-sponsored HB279 (2025), the Earned Wage Access Services Act, creating a registration framework and consumer-protection rules for earned-wage-access apps, administered by the Division of Consumer Protection. The official floor video opens to his presentation on Day 34 at 1:02:44; the bill was signed into law.",
      why: "Writing first-of-its-kind rules for a new financial product matches his consumer-finance and small-business keyissues — a kept promise he carried himself on the floor.",
      source: { label: 'HB279 (2025) — official bill record', url: bill('2025', 'HB0279') },
      media: { ...vid('1:02:44', 34, 'House'), url: floor25(130470) } },
  ],

  // ===== Chris Wilson — Senate District 2 (Cache / Logan) =====
  cwilson: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'property_tax',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his property-tax accountability bill on the Senate floor (video at 1:33:09)',
      facts: "Wilson chief-sponsored SB202 (2025), Property Tax Revisions, requiring counties to submit a preliminary assessment book to the State Tax Commission and empowering the commission to take corrective action when a county officer fails to meet assessment duties. The official Senate floor video opens to his presentation on Day 28 of the 2025 session at 1:33:09; the bill was signed into law.",
      why: "Tightening oversight of how counties assess property directly serves the property-tax-transparency keyissue his profile names — argued in his own words.",
      source: { label: 'SB202 (2025) — official bill record', url: bill('2025', 'SB0202') },
      media: { ...vid('1:33:09', 28, 'Senate'), url: floor25(129931) } },
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'econ_growth',
      tags: ['Notable Actions', 'Consistency'],
      headline: 'Sponsored higher-education development areas to drive innovation (video at 1:33:35)',
      facts: "Wilson chief-sponsored SB129 (2025), Higher Education Development Areas, letting certain universities designate development areas on institution-owned property and capture the revenue into a dedicated fund, with conflict-of-interest limits on trustees. The official Senate floor video opens to his presentation on Day 31 at 1:33:35; the bill was signed into law.",
      why: "Turning campus land into an economic-development engine is a kept promise his profile tracks — and he made the case for it himself on the record.",
      source: { label: 'SB129 (2025) — official bill record', url: bill('2025', 'SB0129') },
      media: { ...vid('1:33:35', 31, 'Senate'), url: floor25(130276) } },
  ],

  // ===== Troy Shelley — House District 66 (Sanpete/Juab, rural) — 2026, no per-item timestamp =====
  troy_shelley: [
    { date: '2026', impact: 'positive', category: 'voting', issueKey: 'disaster_resilience',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Carried his wildfire-enforcement bill through the House (official video, no published timestamp)',
      facts: "Shelley chief-sponsored HB496 (2026), Forestry and Fire Amendments, giving the Division of Forestry, Fire, and State Lands enforcement and investigatory powers over wildland fires and heritage trees and clarifying use of cooperative forest-management funds. The Legislature's official floor video archive contains his presentations, but the 2026 archive does not publish a reliable per-item timestamp, so none is claimed. The bill was signed into law.",
      why: "Strengthening wildfire investigation and cost recovery is the most consequential thread of his profile — and the official recording documents him carrying it, even though the 2026 archive lacks a per-item marker offset.",
      source: { label: 'HB496 (2026) — official bill record', url: bill('2026', 'HB0496') },
      media: { type: 'video', label: 'Official Utah House floor video — 2026 General Session (no per-item timestamp published)', url: floor26(134913) } },
    { date: '2026', impact: 'positive', category: 'voting', issueKey: 'lands_local',
      tags: ['Notable Actions', 'Consistency'],
      headline: 'Sponsored a rural land-access-road protection bill (official video, no published timestamp)',
      facts: "Shelley chief-sponsored HB444 (2026), State Land Access Road Amendments, setting a public-meeting-and-notice process before a county and the state may abandon a class D road and protecting existing easements and utility and water access. The official floor video archive contains his presentations; the 2026 archive publishes no reliable per-item timestamp, so none is claimed. The bill was signed into law.",
      why: "Protecting rural public access to state lands matches the public-lands keyissue his profile names — documented on the official record, with the honest caveat that the 2026 video lacks a marker offset.",
      source: { label: 'HB444 (2026) — official bill record', url: bill('2026', 'HB0444') },
      media: { type: 'video', label: 'Official Utah House floor video — 2026 General Session (no per-item timestamp published)', url: floor26(134996) } },
  ],

  // ===== Stewart E. Barlow — House District 17 (Davis County, physician) =====
  stewart_e_barlow: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'health_mental',
      tags: ['Notable Actions', 'Public Statements'],
      headline: "Presented his bill studying children's mental-health wait times (video at 7:30)",
      facts: "Barlow chief-sponsored HB365 (2025), Mental Health Care Study Amendments, directing the Department of Health and Human Services to issue an RFP for a study of wait times and barriers for a child to see a therapist. The official floor video opens to his presentation on Day 35 of the 2025 session at 7:30; the bill was signed into law.",
      why: "A physician-legislator commissioning hard data on children's mental-health access is the mental-health priority his profile names — a kept promise made in his own words.",
      source: { label: 'HB365 (2025) — official bill record', url: bill('2025', 'HB0365') },
      media: { ...vid('7:30', 35, 'House'), url: floor25(130521) } },
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'lands_preserve',
      tags: ['Notable Actions', 'Consistency'],
      headline: 'Floor-sponsored his antiquities and cultural-site protection bill (video at 26:16)',
      facts: "Barlow chief-sponsored HB388 (2025), Antiquities Protection Amendments, directing the State Historic Preservation Office to run a public-awareness campaign and provide training on protecting cultural and archaeological sites. The official floor video opens to his presentation on Day 35 at 26:16; the bill was signed into law.",
      why: "Protecting Utah's cultural and antiquities sites is a kept promise his profile tracks — and he argued for it himself on the floor.",
      source: { label: 'HB388 (2025) — official bill record', url: bill('2025', 'HB0388') },
      media: { ...vid('26:16', 35, 'House'), url: floor25(130601) } },
  ],

  // ===== Kay Christofferson — House District 53 (Lehi, civil engineer) =====
  kay_christofferson: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'transit',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his corridor-preservation bill covering transit facilities (video at 30:00)',
      facts: "Christofferson, who chairs the House Transportation Committee, chief-sponsored HB229 (2025), Transportation Funds Amendments, extending corridor-preservation rules to cover fixed-guideway public-transit facilities so right-of-way can be protected before development. The official floor video opens to his presentation on Day 21 of the 2025 session at 30:00; the bill was signed into law.",
      why: "Preserving transit corridors ahead of growth is squarely the transportation-and-corridor focus his profile centers on — argued in his own words and now law.",
      source: { label: 'HB229 (2025) — official bill record', url: bill('2025', 'HB0229') },
      media: { ...vid('30:00', 21, 'House'), url: floor25(129442) } },
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'lower_taxes',
      tags: ['Notable Actions'],
      headline: 'Carried the 2025 income-tax-rate cut with an employer child-care credit (video at 1:26:40)',
      facts: "Christofferson chief-sponsored HB106 (2025), Income Tax Revisions, lowering the individual and corporate income-tax rates and adding nonrefundable credits for employer-provided child care plus an expanded young-child tax credit. The official floor video opens to his presentation on Day 36 at 1:26:40; the bill was signed into law.",
      why: "Carrying the session's income-tax-rate cut himself adds a fiscal dimension to a profile built around transportation — a recorded action on a bill that touched every Utah taxpayer.",
      source: { label: 'HB106 (2025) — official bill record', url: bill('2025', 'HB0106') },
      media: { ...vid('1:26:40', 36, 'House'), url: floor25(130700) } },
  ],

  // ===== Keven Stratton — Senate District 24 (Utah County, lands/water) =====
  kstratton: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'lands_local',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his federal-public-land application bill on the Senate floor (video at 57:57)',
      facts: "Stratton chief-sponsored SB158 (2025), Sale or Lease of Federally Managed Public Land Amendments, providing for monitoring of land applications under the federal Recreation and Public Purposes Act, a study of that application information, and a report of results. The official Senate floor video opens to his presentation on Day 15 of the 2025 session at 57:57; the bill was signed into law.",
      why: "Building a framework for state and local acquisition of federal land is a kept promise his profile tracks and the heart of his public-lands keyissue — argued in his own words.",
      source: { label: 'SB158 (2025) — official bill record', url: bill('2025', 'SB0158') },
      media: { ...vid('57:57', 15, 'Senate'), url: floor25(129107) } },
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'enviro_balance',
      tags: ['Notable Actions', 'Consistency'],
      headline: 'Floor-sponsored his solid-waste landfill standards bill (video at 56:39)',
      facts: "Stratton chief-sponsored SB159 (2025), Environmental Quality Modifications, barring approval of an operation plan or permit for certain nonhazardous solid-waste landfills unless specific conditions are met and addressing treatment of certain existing facilities. The official Senate floor video opens to his presentation on Day 21 at 56:39; the bill was signed into law.",
      why: "Setting conditions on landfill permitting rounds out the natural-resources-and-environment keyissue his profile names with a second recorded, enacted action.",
      source: { label: 'SB159 (2025) — official bill record', url: bill('2025', 'SB0159') },
      media: { ...vid('56:39', 21, 'Senate'), url: floor25(129499) } },
  ],

  // ===== Mike Schultz — House District 12 (Speaker; prior profile had no Spotlight) =====
  mschultz: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'econ_growth',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'As Speaker, personally carried his career-and-technical-education "catalyst" bill (video at 24:33)',
      facts: "Schultz chief-sponsored HB447 (2025), Statewide Catalyst Campus Model, creating a grant program for school districts to build or expand career-and-technical-education 'catalyst' centers aligned to labor-market needs, with multi-year grants and accountability and reporting requirements. The official floor video opens to his presentation on Day 29 of the 2025 session at 24:33; the bill was signed into law.",
      why: "It is the recorded substance behind his statewide-CTE-network promise — and a sitting Speaker presenting his own bill, rather than handing it off, is a concrete marker of where he puts his name.",
      source: { label: 'HB447 (2025) — official bill record', url: bill('2025', 'HB0447') },
      media: { ...vid('24:33', 29, 'House'), url: floor25(130029) } },
  ],

  // ===== Jefferson Burton — House District 64 (Payson, veterans/military) =====
  jburton: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'veterans',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his veterans-and-military-affairs bill on the House floor (video at 32:57)',
      facts: "Burton, a retired Utah National Guard major general, chief-sponsored HB122 (2025), Military Affairs Amendments, expanding resident-student tuition eligibility for veterans using their benefits and confirming the Department of Veterans and Military Affairs' duty to provide service benefits to service members, veterans, and their families. The official floor video opens to his presentation on Day 28 of the 2025 session at 32:57; the bill was signed into law.",
      why: "Serving as the Legislature's lead on veterans policy is the throughline of his profile, and this is recorded proof of a kept promise to strengthen that department.",
      source: { label: 'HB122 (2025) — official bill record', url: bill('2025', 'HB0122') },
      media: { ...vid('32:57', 28, 'House'), url: floor25(129906) } },
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'strong_defense',
      tags: ['Notable Actions', 'Consistency'],
      headline: 'Floor-sponsored his Utah National Guard modernization bill (video at 55:23)',
      facts: "Burton chief-sponsored HB376 (2025), National Guard Amendments, updating how the adjutant general is appointed, modernizing the State Armory Board, and authorizing National Guard student-loan repayment for active members. The official floor video opens to his presentation on Day 34 at 55:23; the bill was signed into law.",
      why: "Modernizing Guard law is a kept promise his profile tracks — and a retired Guard general arguing it himself ties his lived experience to the record.",
      source: { label: 'HB376 (2025) — official bill record', url: bill('2025', 'HB0376') },
      media: { ...vid('55:23', 34, 'House'), url: floor25(130414) } },
  ],

  // ===== Ryan D. Wilcox — House District 7 (Ogden) =====
  ryan_d_wilcox: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'public_schools',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his school-safety standards bill on the House floor (video at 37:26)',
      facts: "Wilcox chief-sponsored HB40 (2025), School Safety Amendments, revising screening and training requirements for school safety personnel, adjusting safety-assessment deadlines, and establishing a school-safety foundation. The official floor video opens to his presentation on Day 18 of the 2025 session at 37:26; the bill was signed into law.",
      why: "School safety is a keyissue his profile names and a kept promise — here argued in his own words on the floor, with the recording as direct evidence.",
      source: { label: 'HB40 (2025) — official bill record', url: bill('2025', 'HB0040') },
      media: { ...vid('37:26', 18, 'House'), url: floor25(129324) } },
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'back_police',
      tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried a law-enforcement salary bill creating specialized pay plans (video at 52:19)',
      facts: "Wilcox chief-sponsored HB501 (2025), Law Enforcement Salary Amendments, directing the state to create specialized pay plans for certain law-enforcement positions and to survey comparable state agencies when setting officer pay. The official floor video opens to his presentation on Day 41 at 52:19; the bill was signed into law.",
      why: "Backing law-enforcement pay is the criminal-justice keyissue his profile lists — a recorded, enacted follow-through rather than a talking point.",
      source: { label: 'HB501 (2025) — official bill record', url: bill('2025', 'HB0501') },
      media: { ...vid('52:19', 41, 'House'), url: floor25(131143) } },
  ],

  // ===== Jon Hawkins — House District 55 (Pleasant Grove; Olympics / econ dev) =====
  jon_hawkins: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'econ_growth',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his 2034 Winter Olympics governance bill on the House floor (video at 1:14:00)',
      facts: "Hawkins chief-sponsored HB321 (2025), Utah Olympics Amendments, updating the Olympic and Paralympic Winter Games Act to reflect the 2034 Games award to Utah and the shift from a bid committee to an organizing committee, with new requirements on the host committee. The official floor video opens to his presentation on Day 34 of the 2025 session at 1:14:00; the bill was signed into law.",
      why: "Olympic preparation is the headline keyissue of his profile, and this is recorded proof of him carrying the governance framework for the 2034 Games himself.",
      source: { label: 'HB321 (2025) — official bill record', url: bill('2025', 'HB0321') },
      media: { ...vid('1:14:00', 34, 'House'), url: floor25(130475) } },
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'econ_growth',
      tags: ['Notable Actions', 'Consistency'],
      headline: 'Floor-sponsored a restructuring of state economic-development agencies (video at 1:06:15)',
      facts: "Hawkins chief-sponsored HB542 (2025), Economic Development Amendments, reorganizing the Governor's Office of Economic Opportunity, repealing the Unified Economic Opportunity Commission, and renumbering the Utah Broadband Center and Access Act. The official floor video opens to his presentation on Day 45 at 1:06:15; the bill was signed into law.",
      why: "Restructuring how the state pursues economic development is a kept promise his profile tracks — a substantive, recorded action beyond the Olympic file.",
      source: { label: 'HB542 (2025) — official bill record', url: bill('2025', 'HB0542') },
      media: { ...vid('1:06:15', 45, 'House'), url: floor25(132164) } },
  ],

  // ===== Doug Welton — House District 65 (Payson; civics / agriculture) =====
  doug_welton: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'public_schools',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his expanded high-school civics-education bill (video at 1:02:23)',
      facts: "Welton chief-sponsored HB381 (2025), Civics Education Amendments, adding a social-studies graduation requirement and related instruction while providing alternatives for portions of certain graduation requirements. The official floor video opens to his presentation on Day 31 of the 2025 session at 1:02:23; the bill was signed into law.",
      why: "Expanded civics education is the keyissue his profile leads with and a kept promise — argued in his own words and now in graduation requirements.",
      source: { label: 'HB381 (2025) — official bill record', url: bill('2025', 'HB0381') },
      media: { ...vid('1:02:23', 31, 'House'), url: floor25(130318) } },
    { date: '2025', impact: 'neutral', category: 'voting', issueKey: 'rural_ag',
      tags: ['Notable Actions', 'Consistency'],
      headline: 'Floor-sponsored an agriculture-department accountability bill (video at 2:04:34)',
      facts: "Welton chief-sponsored HB346 (2025), Department of Agriculture and Food Amendments, requiring an annual accountant's review of a department account holding proceeds from marketing orders. The official floor video opens to his presentation on Day 31 at 2:04:34; the bill was signed into law.",
      why: "A small but concrete accountability measure for farm-marketing funds adds an agriculture dimension to his profile's local-government-operations focus — recorded and enacted.",
      source: { label: 'HB346 (2025) — official bill record', url: bill('2025', 'HB0346') },
      media: { ...vid('2:04:34', 31, 'House'), url: floor25(130341) } },
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

let totalNew = 0, totalLeg = 0, withTs = 0, vidItems = 0;
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
    if (it.media && it.media.type === 'video') vidItems++;
    if (it.media && it.media.timestamp) withTs++;
    if (it.issueKey) issueTally[it.issueKey] = (issueTally[it.issueKey] || 0) + 1;
  });
  const merged = existing.concat(toAdd);
  console.log(`+ ${id} (${doc.name}): +${toAdd.length} item(s) [${existing.length} -> ${merged.length}]`);
  toAdd.forEach(it => console.log(`    • ${it.media && it.media.timestamp ? '⏱ ' + it.media.timestamp + '  ' : '(no ts)  '}${it.headline}  #${it.issueKey}`));
  if (APPLY) {
    await patchSpotlight(id, doc.__fields, merged);
    console.log('    ✓ written');
  }
}

console.log('\n──────── summary ────────');
console.log(`legislators touched      : ${totalLeg}`);
console.log(`new spotlight items      : ${totalNew}`);
console.log(`items with video         : ${vidItems}`);
console.log(`with direct video timestamp : ${withTs}`);
console.log('issue tally :', Object.entries(issueTally).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}=${n}`).join(', '));
console.log(APPLY ? '\nAPPLIED to Firestore.' : '\nDRY RUN — re-run with --apply to write.');
