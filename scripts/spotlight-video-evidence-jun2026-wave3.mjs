#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — June 2026 VIDEO-EVIDENCE Spotlight pass, WAVE 3
// (thin + rural / single-county sitting Utah legislators)
//
// Continues scripts/spotlight-video-evidence-jun2026.mjs and -wave2.mjs. Every
// item below is grounded in the legislator's OWN recorded floor presentation of
// a bill they chief-sponsored, pulled and re-verified live from the Utah
// Legislature's own data during this pass:
//
//   • Bill record  : https://le.utah.gov/data/2025GS/<bill>.json — gives the
//     prime sponsor (`primeSponsor`/`primeSponsorName`), short title, the
//     verbatim "highlightedProvisions" each `facts` paragraph is built from, the
//     final action (`lastAction` — only "Governor Signed" bills are framed as
//     enacted here), AND the `floorDebateList` (the official per-bill list of
//     floor-video markers, each tagged with the bill number + sponsor surname).
//   • Floor video  : the marker's own archive page
//     (https://le.utah.gov/av/floorArchive.jsp?markerID=<id>), whose `offset=`
//     (seconds → mm:ss) is the EXACT point the official recording seeks to for
//     that member's segment. Every timestamp below was extracted from that page
//     and re-verified this pass (the extractor was validated against the known
//     wave-2 value: marker 129768 → 1764s → 29:24).
//
// HONESTY / CONTENT_STYLE rules (same as waves 1–2):
//   • Every item is about the INDIVIDUAL's own words, bill, and recorded action —
//     never their party. No party-grouping language; the signed status is stated
//     as a plain fact from the bill's own action history. Bills that did NOT
//     become law were excluded (only "Governor Signed" bills are used).
//   • No fabricated timestamps. Each 2025 floor marker exposes a verified offset,
//     so an mm:ss is given and the marker page is linked.
//   • `source` points at the official bill record; `media` points at the floor
//     video marker — separating "the documented record" from "the spoken-words
//     proof" so a future evidence view can show stance + video + promise +
//     follow-through side by side. Unknown fields are ignored by current render.
//   • Every item carries an ISSUE_MAP `issueKey` (validated against the live
//     ISSUE_MAP vocabulary in index.html), chosen to match the member's own
//     documented keyIssues / promises so the Spotlight item lands on the same
//     issue as their position and the promise it backs.
//   • Idempotent: each member's live `spotlight` array is re-fetched and an item
//     is appended ONLY if no existing item shares its headline.
//
//   node scripts/spotlight-video-evidence-jun2026-wave3.mjs            # dry run
//   node scripts/spotlight-video-evidence-jun2026-wave3.mjs --apply    # write
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

// Official Utah Legislature 2025 floor-video marker (seeks to the sponsor's segment).
const floor25 = (id) => `https://le.utah.gov/av/floorArchive.jsp?markerID=${id}`;
// Official bill record (sponsor, provisions, signed status).
const bill = (yr, num) => `https://le.utah.gov/~${yr}/bills/static/${num}.html`;
// Terse media authoring helper.
const vid = (ts, day, chamber) => ({ type: 'video', timestamp: ts,
  label: `Official Utah ${chamber} floor video — Day ${day}, 2025 General Session` });

// ── The plan: Firestore id → [spotlight items] ──────────────────────────────
const PLAN = {

  // ===== Jake Sawyer — House District 9 (Weber) — was thinnest (1 item) =====
  jake_sawyer: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'infrastructure',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his state-park highway-access bill on the House floor (video at 26:28)',
      facts: "Sawyer chief-sponsored HB345 (2025), State Park Road Amendments, adding statutory descriptions of the highways serving certain state parks so those access routes are formally recognized. The official floor video opens to his presentation on Day 17 of the 2025 session at 26:28; the bill was signed into law.",
      why: "Improving highway access to state parks is a promise his profile already records as kept, and the official recording shows him arguing it himself — adding spoken-word evidence to a profile that previously carried a single Spotlight item.",
      source: { label: 'HB345 (2025) — official bill record', url: bill('2025', 'HB0345') },
      media: { ...vid('26:28', 17, 'House'), url: floor25(129227) } },
  ],

  // ===== Val Peterson — House District 56 (Utah County) — was 1 item =====
  val_peterson: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'edu_college_cost',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his Talent Ready Utah workforce bill on the House floor (video at 51:29)',
      facts: "Peterson chief-sponsored HB131 (2025), Talent Ready Utah Program Amendments, clarifying the allowed membership of the program's advisory council and the types of talent-development initiatives it can pursue. The official floor video opens to his presentation on Day 10 of the 2025 session at 51:29; the bill was signed into law.",
      why: "Workforce-and-higher-education policy is the throughline of his profile, and this is recorded proof behind his kept promise to clarify the Talent Ready Utah advisory council's structure.",
      source: { label: 'HB131 (2025) — official bill record', url: bill('2025', 'HB0131') },
      media: { ...vid('51:29', 10, 'House'), url: floor25(128895) } },
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'edu_college_cost',
      tags: ['Notable Actions', 'Consistency'],
      headline: 'Floor-sponsored his First Credential Program for high-school students (video at 46:39)',
      facts: "Peterson chief-sponsored HB260 (2025), First Credential Program, repealing the PRIME program, establishing a first-credential program, and requiring a master plan for scaling credentialing programs statewide. The official floor video opens to his presentation on Day 17 at 46:39; the bill was signed into law.",
      why: "Creating the First Credential Program is a kept promise his profile tracks — argued in his own words and now law.",
      source: { label: 'HB260 (2025) — official bill record', url: bill('2025', 'HB0260') },
      media: { ...vid('46:39', 17, 'House'), url: floor25(129266) } },
  ],

  // ===== Jill Koford — House District 10 (Weber) — Great Salt Lake / water =====
  jill_koford: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'water',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'On the House floor, presented her Great Salt Lake amendments (video at 57:48)',
      facts: "Koford chief-sponsored HB446 (2025), Great Salt Lake Amendments, addressing severance-tax treatment of metalliferous compounds, a procurement exception, and feasibility-assessment requirements for activities on the Great Salt Lake. The official floor video opens to her presentation on Day 35 of the 2025 session at 57:48; the bill was signed into law.",
      why: "Great Salt Lake stewardship is the keyissue her profile leads with, and this adds recorded spoken-word evidence behind a promise her profile already tracks as kept.",
      source: { label: 'HB446 (2025) — official bill record', url: bill('2025', 'HB0446') },
      media: { ...vid('57:48', 35, 'House'), url: floor25(130554) } },
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'infrastructure',
      tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried her teen-driver learner-permit bill on the floor (video at 1:35:23)',
      facts: "Koford chief-sponsored HB308 (2025), Driving by Minors Amendments, allowing a learner-permit holder under 18 to drive with a qualifying adult other than a parent in certain circumstances. The official floor video opens to her presentation on Day 28 at 1:35:23; the bill was signed into law.",
      why: "A small, concrete change to teen-driver supervision matches the transportation-safety keyissue her profile names — a recorded, enacted follow-through.",
      source: { label: 'HB308 (2025) — official bill record', url: bill('2025', 'HB0308') },
      media: { ...vid('1:35:23', 28, 'House'), url: floor25(129875) } },
  ],

  // ===== Walt Brooks — House District 75 (Washington / St. George) =====
  walt_brooks: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'back_police',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his aggravated-disorderly-conduct bill on the House floor (video at 1:04:00)',
      facts: "Brooks chief-sponsored HB80 (2025), Disorderly Conduct Amendments, creating the criminal offense of aggravated disorderly conduct on a street or highway. The official floor video opens to his presentation on Day 15 of the 2025 session at 1:04:00; the bill was signed into law.",
      why: "Creating the aggravated-disorderly-conduct offense is a kept promise his profile tracks — and he made the case for it himself on the record.",
      source: { label: 'HB80 (2025) — official bill record', url: bill('2025', 'HB0080') },
      media: { ...vid('1:04:00', 15, 'House'), url: floor25(129106) } },
    { date: '2025', impact: 'neutral', category: 'voting', issueKey: 'property_rights',
      tags: ['Notable Actions', 'Consistency'],
      headline: 'Floor-sponsored his defense-of-property and citizen-detention bill (video at 28:09)',
      facts: "Brooks chief-sponsored HB92 (2025), Private Individual Force and Detention Amendments, revising when a private individual may use force in defense of personal property and may lawfully detain another person. The official floor video opens to his presentation on Day 28 at 28:09; the bill was signed into law.",
      why: "Adjusting the line on self-defense of property and lawful detention adds a recorded, enacted action to a profile built around individual rights and limited government.",
      source: { label: 'HB92 (2025) — official bill record', url: bill('2025', 'HB0092') },
      media: { ...vid('28:09', 28, 'House'), url: floor25(129850) } },
  ],

  // ===== Calvin Musselman — Senate District 4 (Davis / Weber) =====
  cmusselman: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'enviro_balance',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his construction stormwater-quality bill on the Senate floor (video at 1:58:39)',
      facts: "Musselman chief-sponsored SB220 (2025), Construction Modifications, setting standards for how the Division of Water Quality regulates and inspects stormwater-runoff controls at construction sites and the fines for violations. The official Senate floor video opens to his presentation on Day 31 of the 2025 session at 1:58:39; the bill was signed into law.",
      why: "Construction accountability is a keyissue his profile names, and writing clearer stormwater-control standards is a recorded, enacted action backing it.",
      source: { label: 'SB220 (2025) — official bill record', url: bill('2025', 'SB0220') },
      media: { ...vid('1:58:39', 31, 'Senate'), url: floor25(130339) } },
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'back_police',
      tags: ['Notable Actions', 'Consistency'],
      headline: 'Floor-sponsored mandatory jail terms for certain repeat drug and theft offenses (video at 51:37)',
      facts: "Musselman chief-sponsored SB90 (2025), Mandatory Jail Sentence Amendments, requiring a mandatory jail sentence for certain drug and theft crimes committed under specified conditions and with prior convictions. The official Senate floor video opens to his presentation on Day 31 at 51:37; the bill was signed into law.",
      why: "Tougher penalties for repeat offenders is a kept promise his profile tracks — argued in his own words and now law.",
      source: { label: 'SB90 (2025) — official bill record', url: bill('2025', 'SB0090') },
      media: { ...vid('51:37', 31, 'Senate'), url: floor25(130315) } },
  ],

  // ===== John Johnson — Senate District 3 (Morgan / Summit / Weber) =====
  john_johnson: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'edu_college_cost',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his Center for Civic Excellence bill on the Senate floor (video at 49:04)',
      facts: "Johnson chief-sponsored SB334 (2025), Center for Civic Excellence at Utah State University, establishing the center as a pilot program and defining its civic-education curriculum, responsibilities, authority, and administration. The official Senate floor video opens to his presentation on Day 41 of the 2025 session at 49:04; the bill was signed into law.",
      why: "Civic education is a keyissue his profile names, and standing up the USU center is recorded proof behind a promise his profile already tracks as kept.",
      source: { label: 'SB334 (2025) — official bill record', url: bill('2025', 'SB0334') },
      media: { ...vid('49:04', 41, 'Senate'), url: floor25(131129) } },
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'public_schools',
      tags: ['Notable Actions', 'Consistency'],
      headline: 'Floor-sponsored his education-testing standards bill (video at 12:31)',
      facts: "Johnson chief-sponsored SB39 (2025), Education Testing Amendments, increasing the grade range for certain subjects of the state's selected standards assessment and removing a provision requiring a different assessment. The official Senate floor video opens to his presentation on Day 7 at 12:31; the bill was signed into law.",
      why: "Education standards and testing is a keyissue his profile names, and this is a recorded, enacted follow-through on his promise to improve testing accountability.",
      source: { label: 'SB39 (2025) — official bill record', url: bill('2025', 'SB0039') },
      media: { ...vid('12:31', 7, 'Senate'), url: floor25(128747) } },
  ],

  // ===== Don Ipson — Senate District 29 (Washington, rural southwest) =====
  dipson: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'back_police',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his at-risk-person property-security bill on the Senate floor (video at 20:45)',
      facts: "Ipson chief-sponsored SB340 (2025), Protected Person Amendments, creating a process for an individual at risk of harm to apply to the commissioner of public safety to certify a security improvement on their property and requiring a land-use authority to approve a qualifying improvement. The official Senate floor video opens to his presentation on Day 41 of the 2025 session at 20:45; the bill was signed into law.",
      why: "A concrete public-safety tool for people facing a credible threat adds a recorded, enacted action to his profile in his own words.",
      source: { label: 'SB340 (2025) — official bill record', url: bill('2025', 'SB0340') },
      media: { ...vid('20:45', 41, 'Senate'), url: floor25(131173) } },
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'infrastructure',
      tags: ['Notable Actions', 'Consistency'],
      headline: 'Floor-sponsored his commercial-driver-license bill (video at 41:42)',
      facts: "Ipson chief-sponsored SB59 (2025), Commercial Driver License Revisions, amending grounds for disqualifying a commercial driver license and requiring the Driver License Division to use the federal Drug and Alcohol Clearinghouse. The official Senate floor video opens to his presentation on Day 7 at 41:42; the bill was signed into law.",
      why: "Transportation is a keyissue his profile names, and tightening commercial-driver standards is a recorded, enacted action backing it.",
      source: { label: 'SB59 (2025) — official bill record', url: bill('2025', 'SB0059') },
      media: { ...vid('41:42', 7, 'Senate'), url: floor25(128761) } },
  ],

  // ===== David Hinkins — Senate District 26 (deep rural central/east Utah) =====
  dhinkins: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'rural_ag',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented the Natural Resources, Agriculture & Environmental Quality base budget on the Senate floor (video at 40:55)',
      facts: "Hinkins chief-sponsored SB5 (2025), the Natural Resources, Agriculture, and Environmental Quality Base Budget, providing the appropriations and intent language that fund those agencies. The official Senate floor video opens to his presentation on Day 8 of the 2025 session at 40:55; the bill was signed into law.",
      why: "A rancher-legislator personally carrying the rural natural-resources budget is recorded proof behind a promise his profile already tracks as kept — and the heart of his natural-resources-appropriations keyissue.",
      source: { label: 'SB5 (2025) — official bill record', url: bill('2025', 'SB0005') },
      media: { ...vid('40:55', 8, 'Senate'), url: floor25(128913) } },
  ],

  // ===== Michael Petersen — House District 2 (Cache, rural) =====
  mike_petersen: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'gov_transparency',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'On the House floor, presented his political-disclosure search-transparency bill (video at 1:14:03)',
      facts: "Petersen chief-sponsored HB95 (2025), Financial Disclosure Revisions, requiring the lieutenant governor to let the public search across all political financial disclosures to identify contributions or expenditures made by a particular person. The official floor video opens to his presentation on Day 15 of the 2025 session at 1:14:03; the bill was signed into law.",
      why: "Financial transparency is a keyissue his profile names, and this adds recorded spoken-word evidence behind a promise his profile already tracks as kept.",
      source: { label: 'HB95 (2025) — official bill record', url: bill('2025', 'HB0095') },
      media: { ...vid('1:14:03', 15, 'House'), url: floor25(129113) } },
  ],

  // ===== Tiara Auxier — House District 4 (Morgan / Rich / Summit, rural) =====
  tiara_auxier: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'public_schools',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented her rural-school sports-facilities grant bill on the House floor (video at 47:35)',
      facts: "Auxier chief-sponsored HB462 (2025), Rural School Funding Amendments, creating the Rural School Sports Facilities Grant Program to fund construction or refurbishment of sports facilities at rural public schools, administered by the State Board of Education. The official floor video opens to her presentation on Day 38 of the 2025 session at 47:35; the bill was signed into law.",
      why: "A targeted investment in rural schools fits the rural district she represents and is a recorded, enacted action argued in her own words.",
      source: { label: 'HB462 (2025) — official bill record', url: bill('2025', 'HB0462') },
      media: { ...vid('47:35', 38, 'House'), url: floor25(130986) } },
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'justice_reform',
      tags: ['Notable Actions', 'Consistency'],
      headline: 'Floor-sponsored her criminal-record expungement bill (video at 25:59)',
      facts: "Auxier chief-sponsored HB297 (2025), Expungement Amendments, adjusting how the Department of Public Safety is notified of expungement orders and modifying the list of offenses ineligible for automatic expungement. The official floor video opens to her presentation on Day 18 at 25:59; the bill was signed into law.",
      why: "Expungement reform is a keyissue her profile names and a kept promise — recorded proof of a follow-through, not a slogan.",
      source: { label: 'HB297 (2025) — official bill record', url: bill('2025', 'HB0297') },
      media: { ...vid('25:59', 18, 'House'), url: floor25(129312) } },
  ],

  // ===== Bridger Bolinder — House District 29 (Juab / Millard / Tooele, rural) =====
  bridger_bolinder: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'lands_energy',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his Brine Conservation Act on the House floor (video at 1:14:42)',
      facts: "Bolinder chief-sponsored HB478 (2025), Brine Mining Amendments, enacting the Brine Conservation Act to define terms, set the act's scope, and give the Board of Oil, Gas, and Mining authority and rulemaking power over brine mining. The official floor video opens to his presentation on Day 35 of the 2025 session at 1:14:42; the bill was signed into law.",
      why: "Responsibly regulating brine and critical-mineral extraction is the keyissue his profile leads with and a kept promise — argued in his own words and now law.",
      source: { label: 'HB478 (2025) — official bill record', url: bill('2025', 'HB0478') },
      media: { ...vid('1:14:42', 35, 'House'), url: floor25(130626) } },
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'lands_local',
      tags: ['Notable Actions', 'Consistency'],
      headline: 'Floor-sponsored his transient-room-tax bill for rural recreation (video at 8:09)',
      facts: "Bolinder chief-sponsored HB456 (2025), Transient Room Tax Amendments, modifying the acceptable uses of transient room tax revenue and authorizing counties and municipalities to share that revenue by interlocal agreement. The official floor video opens to his presentation on Day 31 at 8:09; the bill was signed into law.",
      why: "Steering tourism-tax revenue toward rural recreation infrastructure is a kept promise his profile tracks — a recorded, enacted follow-through for his rural district.",
      source: { label: 'HB456 (2025) — official bill record', url: bill('2025', 'HB0456') },
      media: { ...vid('8:09', 31, 'House'), url: floor25(130364) } },
  ],

  // ===== Joseph Elison — House District 72 (Washington, rural southwest) =====
  joseph_elison: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'gov_balance',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his State Sovereignty Fund bill on the House floor (video at 1:18:36)',
      facts: "Elison chief-sponsored HB464 (2025), State Sovereignty Fund, establishing the fund and providing for its funding, investment, and distribution. The official floor video opens to his presentation on Day 36 of the 2025 session at 1:18:36; the bill was signed into law.",
      why: "State fiscal sovereignty and federal independence is the keyissue his profile leads with, and standing up the fund is recorded proof behind a promise his profile already tracks as kept.",
      source: { label: 'HB464 (2025) — official bill record', url: bill('2025', 'HB0464') },
      media: { ...vid('1:18:36', 36, 'House'), url: floor25(130761) } },
  ],

  // ===== R. Neil Walter — House District 74 (Washington, rural southwest) =====
  r_neil_walter: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'housing_support',
      tags: ['Notable Actions', 'Public Statements'],
      headline: "Presented his Homeowners' Association Ombudsman bill on the House floor (video at 1:29:00)",
      facts: "Walter chief-sponsored HB217 (2025), Homeowners' Association Amendments, establishing the Office of the Homeowners' Association Ombudsman and defining its duties, jurisdiction, and functions. The official floor video opens to his presentation on Day 34 of the 2025 session at 1:29:00; the bill was signed into law.",
      why: "HOA governance and homeowner rights is a keyissue his profile names, and creating the ombudsman office is recorded proof behind a promise his profile already tracks as kept.",
      source: { label: 'HB217 (2025) — official bill record', url: bill('2025', 'HB0217') },
      media: { ...vid('1:29:00', 34, 'House'), url: floor25(130429) } },
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'lands_local',
      tags: ['Notable Actions', 'Consistency'],
      headline: 'Floor-sponsored his trust-lands portfolio-valuation bill (video at 1:30:21)',
      facts: "Walter chief-sponsored HB483 (2025), School and Institutional Trust Lands Administration Modifications, requiring the administration's director to complete a valuation of its land portfolio every five years and to report annually to the Legislature. The official floor video opens to his presentation on Day 37 at 1:30:21; the bill was signed into law.",
      why: "Stronger stewardship and reporting on the state's trust-land portfolio adds a public-lands dimension to a profile built around land use and real estate — a recorded, enacted action.",
      source: { label: 'HB483 (2025) — official bill record', url: bill('2025', 'HB0483') },
      media: { ...vid('1:30:21', 37, 'House'), url: floor25(130882) } },
  ],

  // ===== Nicholeen Peck — House District 28 (Tooele, single-county) =====
  nicholeen_p_peck: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'edu_parental',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented her homeschool-affidavit relief bill on the House floor (video at 34:57)',
      facts: "Peck chief-sponsored HB209 (2025), Homeschool Amendments, clarifying when a letter of intent to homeschool is required and removing the affidavit and attestation requirements for parents who begin homeschooling at the start of an academic year. The official floor video opens to her presentation on Day 17 of the 2025 session at 34:57; the bill was signed into law.",
      why: "Homeschool freedom and parental rights is a keyissue her profile names, and easing the affidavit requirement is recorded proof behind a promise her profile already tracks as kept.",
      source: { label: 'HB209 (2025) — official bill record', url: bill('2025', 'HB0209') },
      media: { ...vid('34:57', 17, 'House'), url: floor25(129262) } },
  ],

  // ===== Jason Thompson — House District 3 (Cache, rural) =====
  jason_thompson: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'econ_smallbiz',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his service-marketplace daycare bill on the House floor (video at 1:18:58)',
      facts: "Thompson chief-sponsored HB373 (2025), Service Marketplace Platforms Amendments, letting a daycare provider affiliate with a service-marketplace platform and establishing a presumption that such a provider is an independent contractor. The official floor video opens to his presentation on Day 31 of the 2025 session at 1:18:58; the bill was signed into law.",
      why: "Consumer-and-small-business protection is a keyissue his profile names, and setting clear rules for marketplace contractors is recorded proof behind a promise his profile already tracks as kept.",
      source: { label: 'HB373 (2025) — official bill record', url: bill('2025', 'HB0373') },
      media: { ...vid('1:18:58', 31, 'House'), url: floor25(130268) } },
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'healthcare',
      tags: ['Notable Actions', 'Consistency'],
      headline: 'Floor-sponsored his drug-overdose recognition training bill (video at 1:04:17)',
      facts: "Thompson chief-sponsored HB361 (2025), Drug Overdose Training Amendments, requiring the Division of Integrated Healthcare to create overdose-recognition training materials and adding that training to alcohol education seminars. The official floor video opens to his presentation on Day 37 at 1:04:17; the bill was signed into law.",
      why: "Opioid-overdose prevention is a keyissue his profile names, and this adds recorded spoken-word evidence behind a promise his profile already tracks as kept.",
      source: { label: 'HB361 (2025) — official bill record', url: bill('2025', 'HB0361') },
      media: { ...vid('1:04:17', 37, 'House'), url: floor25(130940) } },
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
  toAdd.forEach(it => console.log(`    • ⏱ ${it.media.timestamp}  ${it.headline}  #${it.issueKey}`));
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
