#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — June 2026 COMMITTEE-VIDEO Spotlight pass (NEW evidence layer)
//
// Opens a second video-based evidence source alongside the existing floor-video
// waves (scripts/spotlight-video-evidence-jun2026*.mjs). Committee hearings are
// where a chief sponsor usually gives the fullest spoken explanation of a bill's
// purpose, need, and detail — so this pass mines the Utah Legislature's official
// committee record for sitting legislators, prioritizing the thinnest profiles.
//
// HOW EACH ITEM WAS BUILT AND VERIFIED (live, this pass):
//   • Bill record   : https://le.utah.gov/data/2025GS/<bill>.json — gives the
//     chief sponsor (`primeSponsor`/`primeSponsorName`), the short title, the
//     verbatim `highlightedProvisions` each `facts` paragraph is built from, the
//     final action (`lastAction` — only "Governor Signed" bills are used here),
//     and the `agendaList` (the official per-bill list of committee hearings,
//     each tagged with the meeting id `mtgID`, a timeline `markerID`, the agenda
//     item number, the committee name/date, and the official minutes URL).
//   • Committee video: https://le.utah.gov/av/committeeArchive.jsp?mtgID=<mtgID>
//     — the official archived recording of that committee meeting. The bill's
//     `markerID` is appended so the player seeks to that agenda item's segment.
//   • Committee minutes: the official minutes (`minutesURL`, on le.utah.gov's
//     /interim/ path) were fetched and read THIS pass to verify, for every item,
//     that the legislator PERSONALLY presented the bill (e.g. "Rep. Gwynn
//     presented the bill"). Items where the sponsor did not personally present,
//     or where the contribution was purely procedural, were dropped.
//
// HONESTY / CONTENT_STYLE rules (same as the floor-video waves):
//   • Every item is about the INDIVIDUAL's own bill, words, and recorded action —
//     never their party. No party-grouping language; signed status is stated as
//     a plain fact from the bill's own action history. Only enacted bills used.
//   • NO fabricated timestamps. Unlike floor markers, the committee archive does
//     not expose a per-bill mm:ss offset in machine-readable form, so no minute
//     mark is asserted. Instead the locator is the official meeting recording
//     (mtgID) seeked by the bill's markerID, plus the agenda item number, with
//     the official minutes linked as written corroboration. `media.timestamp`
//     is intentionally omitted — the renderer simply shows "Watch".
//   • `source` points at the official bill record; `media` points at the
//     committee recording and carries kind:'committee' + mtgID/markerID/agenda
//     item/minutesUrl so a future evidence view can sit committee video cleanly
//     beside floor video. Extra fields are ignored by the current renderer.
//   • Every item carries an ISSUE_MAP `issueKey` (validated against the live
//     ISSUE_MAP vocabulary in index.html), chosen to land the item on the same
//     issue as the member's own documented stance / promises — or, for thin
//     profiles, to open a well-supported new issue.
//   • Idempotent: each member's live `spotlight` array is re-fetched and an item
//     is appended ONLY if no existing item shares its headline.
//
//   node scripts/spotlight-committee-video-jun2026.mjs            # dry run
//   node scripts/spotlight-committee-video-jun2026.mjs --apply    # write
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
// Official bill record (sponsor, provisions, signed status).
const bill = (num) => `https://le.utah.gov/~2025/bills/static/${num}.html`;
// Official archived committee recording, seeked to the bill's agenda segment.
const comUrl = (mtgID, marker) => `https://le.utah.gov/av/committeeArchive.jsp?mtgID=${mtgID}&markerID=${marker}`;
const minUrl = (p) => `https://le.utah.gov${p}`;
// Committee-video media object. No mm:ss is asserted (committee archive exposes
// none in machine-readable form); the meeting recording + agenda item + linked
// minutes are the verifiable locator.
const cvid = (committee, dateLabel, mtgID, marker, item, min) => ({
  type: 'video', kind: 'committee',
  label: `Official Utah Legislature committee hearing video — ${committee}, ${dateLabel} (2025 General Session)`,
  url: comUrl(mtgID, marker),
  mtgID: String(mtgID), markerID: String(marker), agendaItem: String(item),
  minutesUrl: minUrl(min),
});

// ── The plan: Firestore id → [spotlight items] ──────────────────────────────
const PLAN = {

  // ===== Matthew Gwynn — House District 6 (Weber) — was 0 Spotlight items =====
  // Career law-enforcement officer; profile led with public-safety keyIssues but
  // carried no recorded statements. Three committee presentations build it out.
  matthew_gwynn: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'immig_fentanyl',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'In committee, presented his fentanyl-trafficking offense bill (HB87)',
      facts: "Gwynn chief-sponsored HB87 (2025), Drug Trafficking Amendments, creating a criminal offense of trafficking fentanyl or a fentanyl-related substance. He personally presented the bill to the House Law Enforcement and Criminal Justice Committee on Jan. 29, 2025; the official committee recording archives that presentation and the committee minutes record it. The bill was signed into law.",
      why: "Drug enforcement and the fentanyl crisis is a keyissue Gwynn's profile names; the committee record is the first spoken-word evidence on a profile that previously had no recorded statements.",
      source: { label: 'HB87 (2025) — official bill record', url: bill('HB0087') },
      media: cvid('House Law Enforcement and Criminal Justice Committee', 'Jan. 29, 2025', 19657, 265651, 5, '/interim/2025/html/00000991.htm') },
    { date: '2025', impact: 'neutral', category: 'voting', issueKey: 'back_police',
      tags: ['Notable Actions', 'Consistency'],
      headline: 'Presented his body-camera bill for narcotics units in committee (HB339)',
      facts: "Gwynn chief-sponsored HB339 (2025), Law Enforcement Investigation Modifications, exempting an officer who wears a body-worn camera while serving on a narcotics unit or task force from certain camera activation requirements. He presented the bill — with the Department of Public Safety's deputy commissioner assisting — to the House Law Enforcement and Criminal Justice Committee on Feb. 12, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "A balance between body-camera transparency and undercover-officer safety reflects Gwynn's own law-enforcement background and his public-safety keyissue, argued in his own words on the record.",
      source: { label: 'HB339 (2025) — official bill record', url: bill('HB0339') },
      media: cvid('House Law Enforcement and Criminal Justice Committee', 'Feb. 12, 2025', 19831, 270930, 5, '/interim/2025/html/00001642.htm') },
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'justice_balance',
      tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried his criminal-code recodification bill before a Senate committee (HB21)',
      facts: "Gwynn chief-sponsored HB21 (2025), Criminal Code Recodification and Cross References, reorganizing and standardizing offenses in Title 76 (Offenses Against Public Order, Decency, Health, Safety, Welfare, and Morals) to clarify existing law. He personally presented it to the Senate Judiciary, Law Enforcement, and Criminal Justice Committee on Jan. 28, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Criminal-code modernization is a keyissue Gwynn's profile names — this is recorded proof he did the unglamorous cleanup work himself, not just the headline bills.",
      source: { label: 'HB21 (2025) — official bill record', url: bill('HB0021') },
      media: cvid('Senate Judiciary, Law Enforcement, and Criminal Justice Committee', 'Jan. 28, 2025', 19656, 265088, 10, '/interim/2025/html/00000643.htm') },
  ],

  // ===== Tyler Clancy — House District 60 (Provo) — was 1 Spotlight item =====
  tclancy: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'justice_reform',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his offender re-entry / mental-health continuity bill in committee (HB167)',
      facts: "Clancy chief-sponsored HB167 (2025), Offender Reintegration Amendments, directing local mental health authorities to coordinate with the Department of Corrections so people on probation or parole keep continuity of mental health services. He presented the bill — with the Department of Corrections' executive director assisting — to the House Law Enforcement and Criminal Justice Committee on Jan. 24, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Addiction-and-reentry support is central to Clancy's homelessness-and-public-safety focus; the committee record shows him connecting corrections and mental-health systems in his own words.",
      source: { label: 'HB167 (2025) — official bill record', url: bill('HB0167') },
      media: cvid('House Law Enforcement and Criminal Justice Committee', 'Jan. 24, 2025', 19658, 264013, 4, '/interim/2025/html/00000722.htm') },
    { date: '2025', impact: 'neutral', category: 'voting', issueKey: 'enviro_balance',
      tags: ['Notable Actions'],
      headline: 'Carried an air-quality permitting reform bill before committee (HB85)',
      facts: "Clancy chief-sponsored HB85 (2025), Environmental Permitting Modifications, directing the Division of Air Quality to publish guidance and rules on federal plantwide applicability limitations and to review its permit-by-rule registration rules. He presented the bill to the House Natural Resources, Agriculture, and Environment Committee on Jan. 24, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Streamlining air-quality permitting while keeping the standards in place adds an environment-and-regulation dimension to a profile otherwise built around homelessness — a recorded, enacted action.",
      source: { label: 'HB85 (2025) — official bill record', url: bill('HB0085') },
      media: cvid('House Natural Resources, Agriculture, and Environment Committee', 'Jan. 24, 2025', 19683, 263921, 6, '/interim/2025/html/00000448.htm') },
  ],

  // ===== Grant Miller — House District 24 — was 2 Spotlight items =====
  grant_miller: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'justice_reform',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his court-fine reform bill in committee (HB383)',
      facts: "Miller chief-sponsored HB383 (2025), Court Fine Amendments, raising the rate at which compensatory service is credited toward criminal fines and letting a judge credit the cost of completed court-ordered treatment toward a fine. He personally presented the bill to the House Judiciary Committee on Feb. 12, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Court-fine and sentencing reform is the keyissue Miller's profile leads with; the committee record is spoken-word proof behind it.",
      source: { label: 'HB383 (2025) — official bill record', url: bill('HB0383') },
      media: cvid('House Judiciary Committee', 'Feb. 12, 2025', 19825, 270745, 3, '/interim/2025/html/00001566.htm') },
  ],

  // ===== Hoang Nguyen — House District 23 — was 2 Spotlight items =====
  hoang_nguyen: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'healthcare',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented her Emergency Medical Services bill in committee (HB391)',
      facts: "Nguyen chief-sponsored HB391 (2025), Emergency Medical Services Revisions, granting the Bureau of Emergency Medical Services certain enforcement authority and requiring an annual recommendation on the schedule of potential fines. She presented the bill — with the bureau's division director assisting — to the House Health and Human Services Committee on Feb. 13, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Strengthening emergency medical services adds a concrete healthcare action to Nguyen's record, argued in her own words in committee.",
      source: { label: 'HB391 (2025) — official bill record', url: bill('HB0391') },
      media: cvid('House Health and Human Services Committee', 'Feb. 13, 2025', 19761, 271407, 5, '/interim/2025/html/00001612.htm') },
  ],

  // ===== Kristen Chevrier — House District 54 — was 2 Spotlight items =====
  kristen_chevrier: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'public_schools',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented her bill restricting certain food additives in schools (HB402)',
      facts: "Chevrier chief-sponsored HB402 (2025), Foods Additives in Schools, prohibiting consumable items containing certain food additives from being provided in a public school under specified circumstances, with exceptions. She personally presented the bill to the House Education Committee on Feb. 25, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Food-and-nutrition policy in schools is a keyissue Chevrier's profile names; the committee record shows her making the case in her own words against speakers on both sides.",
      source: { label: 'HB402 (2025) — official bill record', url: bill('HB0402') },
      media: cvid('House Education Committee', 'Feb. 25, 2025', 19907, 274499, 1, '/interim/2025/html/00001811.htm') },
    { date: '2025', impact: 'neutral', category: 'voting', issueKey: 'family_support',
      tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried her SNAP nutrition-waiver bill before committee (HB403)',
      facts: "Chevrier chief-sponsored HB403 (2025), SNAP Funds Amendments, requiring the Department of Workforce Services to seek a federal waiver regarding the use of SNAP benefits for certain foods. She presented the bill to the House Economic Development and Workforce Services Committee on Feb. 21, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "SNAP benefit reform is a keyissue Chevrier's profile names — a recorded, enacted follow-through on the food-policy throughline of her record.",
      source: { label: 'HB403 (2025) — official bill record', url: bill('HB0403') },
      media: cvid('House Economic Development and Workforce Services Committee', 'Feb. 21, 2025', 19759, 273745, 1, '/interim/2025/html/00001724.htm') },
  ],

  // ===== Paul A. Cutler — House District 18 — was 2 Spotlight items =====
  paul_a_cutler: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'health_mental',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his bill scheduling tianeptine and phenibut in committee (HB173)',
      facts: "Cutler chief-sponsored HB173 (2025), Controlled Substances Act Amendments, adding tianeptine and phenibut to Schedule I of the controlled-substances list. He presented the bill — with a family physician assisting — to the House Health and Human Services Committee on Jan. 31, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Moving these emerging, unregulated substances under control opens a substance-and-addiction policy dimension on Cutler's record, argued in his own words.",
      source: { label: 'HB173 (2025) — official bill record', url: bill('HB0173') },
      media: cvid('House Health and Human Services Committee', 'Jan. 31, 2025', 19616, 266678, 1, '/interim/2025/html/00000964.htm') },
    { date: '2025', impact: 'neutral', category: 'voting', issueKey: 'healthcare',
      tags: ['Notable Actions'],
      headline: 'Carried his dry-needling licensing bill before committee (HB188)',
      facts: "Cutler chief-sponsored HB188 (2025), Dry Needling Amendments, moving the dry-needling registration requirement into licensing and clarifying that physical and occupational therapy include dry needling. He presented the bill — with a physical therapist and an occupational therapist assisting — to the House Business, Labor, and Commerce Committee on Feb. 10, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Clarifying who may practice a clinical technique, and under what license, is a recorded healthcare action that adds depth beyond Cutler's elections-focused keyIssues.",
      source: { label: 'HB188 (2025) — official bill record', url: bill('HB0188') },
      media: cvid('House Business, Labor, and Commerce Committee', 'Feb. 10, 2025', 19854, 270214, 4, '/interim/2025/html/00001562.htm') },
  ],

  // ===== Rosalba Dominguez — House District 25 — was 2 Spotlight items =====
  rosalba_dominguez: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'family_support',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented her diaper-assistance grant bill in committee (HB547)',
      facts: "Dominguez chief-sponsored HB547 (2025), Diaper Program Amendments, requiring the Department of Health and Human Services to award grants, within appropriations, to nonprofits that provide free diapering supplies. She distributed a handout and personally presented the bill to the House Health and Human Services Committee on Feb. 28, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "A targeted help-with-the-cost-of-raising-children measure is recorded, enacted proof of Dominguez's focus on working families — and her own spoken case for it.",
      source: { label: 'HB547 (2025) — official bill record', url: bill('HB0547') },
      media: cvid('House Health and Human Services Committee', 'Feb. 28, 2025', 19865, 276304, 4, '/interim/2025/html/00001924.htm') },
  ],

  // ===== Karen M. Peterson — House District 13 — was 3 Spotlight items =====
  karen_m_peterson: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'edu_college_cost',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented her Higher Education Strategic Reinvestment bill in committee (HB265)',
      facts: "Peterson chief-sponsored HB265 (2025), Higher Education Strategic Reinvestment, requiring reporting to and a study by the Higher Education Appropriations Subcommittee and providing for the disbursement and reallocation of reinvestment funds at degree-granting institutions. She presented the bill — with the Commissioner of Higher Education assisting — to the House Education Committee on Jan. 31, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Higher-education funding and reform is the keyissue Peterson's profile leads with; carrying a major reinvestment overhaul herself is recorded proof behind it.",
      source: { label: 'HB265 (2025) — official bill record', url: bill('HB0265') },
      media: cvid('House Education Committee', 'Jan. 31, 2025', 19609, 266840, 2, '/interim/2025/html/00001249.htm') },
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'public_schools',
      tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried her student-teacher stipend bill before committee (HB204)',
      facts: "Peterson chief-sponsored HB204 (2025), Stipends for Future Educators Grant Program Amendments, making a student teacher eligible for the stipend regardless of the institution where they are enrolled and adjusting how the funds interact with other state programs. She presented the bill to the House Education Committee on Jan. 31, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Strengthening the teacher pipeline is a keyissue Peterson's profile names — a recorded, enacted follow-through that complicates the simple story by widening, not narrowing, who qualifies.",
      source: { label: 'HB204 (2025) — official bill record', url: bill('HB0204') },
      media: cvid('House Education Committee', 'Jan. 31, 2025', 19609, 266820, 1, '/interim/2025/html/00001249.htm') },
  ],

  // ===== Logan Monson — House District 69 (rural) — was 3 Spotlight items =====
  logan_monson: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'rural_ag',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his grazing-permit oversight bill in committee (HB421)',
      facts: "Monson chief-sponsored HB421 (2025), Grazing Amendments, requiring the Division of Wildlife Resources to obtain approval from a local land-use authority and the agriculture and natural-resources departments before purchasing or acquiring a grazing permit. He presented the bill to the House Natural Resources, Agriculture, and Environment Committee on Feb. 12, 2025; the official committee recording archives it, with farm and county officials speaking in support. The bill was signed into law.",
      why: "Protecting ranchers' grazing access is at the heart of the rural district Monson represents; the committee record is his own spoken case, backed by the farm community.",
      source: { label: 'HB421 (2025) — official bill record', url: bill('HB0421') },
      media: cvid('House Natural Resources, Agriculture, and Environment Committee', 'Feb. 12, 2025', 19844, 270888, 6, '/interim/2025/html/00001569.htm') },
  ],

  // ===== Mark Strong — House District 47 — was 3 Spotlight items =====
  mark_strong: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'back_police',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his bill toughening sentences for crimes against incapacitated victims (HB127)',
      facts: "Strong chief-sponsored HB127 (2025), Sexual Crime Amendments, lengthening the sentence for rape, object rape, and forcible sodomy when committed against an incapacitated individual. He presented the bill — joined by the mother of a victim — to the House Law Enforcement and Criminal Justice Committee on Jan. 24, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Protecting vulnerable people through tougher penalties is the keyissue Strong's profile leads with; the committee record shows him making that case alongside an affected family.",
      source: { label: 'HB127 (2025) — official bill record', url: bill('HB0127') },
      media: cvid('House Law Enforcement and Criminal Justice Committee', 'Jan. 24, 2025', 19658, 264048, 5, '/interim/2025/html/00000722.htm') },
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'public_schools',
      tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried his school-fees relief bill before committee (HB344)',
      facts: "Strong chief-sponsored HB344 (2025), School Fees Amendments, requiring each local education agency, beginning in 2026-2027, to ensure a student has at least one option to complete all required courses and credits without paying a fee or seeking a waiver. He presented the bill to the House Education Committee on Feb. 5, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "School-fee reform is a keyissue Strong's profile names — a recorded, enacted action ensuring required coursework is not gated behind a family's ability to pay.",
      source: { label: 'HB344 (2025) — official bill record', url: bill('HB0344') },
      media: cvid('House Education Committee', 'Feb. 5, 2025', 19610, 268600, 2, '/interim/2025/html/00001481.htm') },
  ],

  // ===== Nelson Abbott — House District 57 — was 3 Spotlight items =====
  nelson_abbott: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'health_mental',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his civil-commitment and disability-definitions bill in committee (HB276)',
      facts: "Abbott chief-sponsored HB276 (2025), Commitment Revisions, updating the definitions of 'intellectual disability' and 'intermediate care facility' and amending the rights of individuals subject to commitment. He presented the bill to the House Judiciary Committee on Feb. 3, 2025, with state health officials speaking in favor; the official committee recording archives it. The bill was signed into law.",
      why: "Mental-health and civil-commitment reform is the keyissue Abbott's profile leads with; the committee record is his own spoken work on the statutory detail.",
      source: { label: 'HB276 (2025) — official bill record', url: bill('HB0276') },
      media: cvid('House Judiciary Committee', 'Feb. 3, 2025', 19605, 267541, 7, '/interim/2025/html/00001247.htm') },
    { date: '2025', impact: 'neutral', category: 'voting', issueKey: 'justice_balance',
      tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried his guardianship and supported-decision-making bill before committee (HB334)',
      facts: "Abbott chief-sponsored HB334 (2025), Guardianships and Supported Decision-Making Agreements Amendments, preserving the right to counsel for an allegedly incapacitated person and amending the rights of individuals under guardianship. He presented the bill — with the Disability Law Center — to the House Judiciary Committee on Feb. 12, 2025; the official committee recording archives the debate, including residents who spoke against it. The bill was signed into law.",
      why: "Guardianship and disability rights is a keyissue Abbott's profile names; the committee record shows him defending due-process protections through contested testimony.",
      source: { label: 'HB334 (2025) — official bill record', url: bill('HB0334') },
      media: cvid('House Judiciary Committee', 'Feb. 12, 2025', 19825, 270812, 7, '/interim/2025/html/00001566.htm') },
  ],

  // ===== Sahara Hayes — House District 32 — was 3 Spotlight items =====
  sahara_hayes: [
    { date: '2025', impact: 'neutral', category: 'voting', issueKey: 'edu_college_cost',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented her student-athlete name-image-likeness bill in committee (HB479)',
      facts: "Hayes chief-sponsored HB479 (2025), Student Athlete Revisions, allowing an institution of higher education to use certain funds to compensate a student athlete directly for the use of their name, image, or likeness, with specified conditions. She presented the bill to the House Education Committee on Feb. 19, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Student-athlete protections is a keyissue Hayes's profile names — a recorded, enacted action giving college athletes a direct path to compensation, in her own words.",
      source: { label: 'HB479 (2025) — official bill record', url: bill('HB0479') },
      media: cvid('House Education Committee', 'Feb. 19, 2025', 19821, 273309, 7, '/interim/2025/html/00001721.htm') },
  ],

  // ===== Karen Kwan — Senate District 12 — was 3 Spotlight items =====
  karen_kwan: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'back_police',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented her child-protection sexual-crimes bill before a Senate committee (SB144)',
      facts: "Kwan chief-sponsored SB144 (2025), Sexual Crimes Amendments, expanding the definition of child sexual abuse material and refining definitions used in sexual-exploitation offenses. She presented the bill — with an assistant attorney general assisting — to the Senate Judiciary, Law Enforcement, and Criminal Justice Committee on Feb. 21, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Child protection and public safety is a keyissue Kwan's profile names; the committee record is her own spoken work closing gaps in the exploitation statutes.",
      source: { label: 'SB144 (2025) — official bill record', url: bill('SB0144') },
      media: cvid('Senate Judiciary, Law Enforcement, and Criminal Justice Committee', 'Feb. 21, 2025', 19782, 273716, 1, '/interim/2025/html/00001743.htm') },
  ],

  // ===== Kathleen Riebe — Senate District 15 — was 3 Spotlight items =====
  kriebe: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'healthcare',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented her organ-donor registration bill before a Senate committee (SB229)',
      facts: "Riebe chief-sponsored SB229 (2025), Organ Donor Amendments, requiring information about the option to register as an organ donor — and instructions for accessing the donor registry — to be provided with individual income-tax booklets. She introduced the bill — with the State Tax Commissioner assisting — to the Senate Revenue and Taxation Committee on Feb. 12, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Organ donation and public health is a keyissue Riebe's profile names; the committee record shows her finding a low-cost way to lift donor registration herself.",
      source: { label: 'SB229 (2025) — official bill record', url: bill('SB0229') },
      media: cvid('Senate Revenue and Taxation Committee', 'Feb. 12, 2025', 19850, 270741, 4, '/interim/2025/html/00001599.htm') },
  ],

  // ===== Lisa Shepherd — House District 61 — was 3 Spotlight items =====
  lisa_shepherd: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'gov_transparency',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented her candidate conflict-of-interest disclosure bill in committee (HB504)',
      facts: "Shepherd chief-sponsored HB504 (2025), Financial and Conflict of Interest Disclosures by Candidates Amendments, requiring a candidate for county, municipal, or special-district office to file a conflict-of-interest disclosure when filing a declaration of candidacy. She distributed a handout and personally presented the bill to the House Government Operations Committee on Feb. 26, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Candidate financial disclosure and government transparency are keyIssues Shepherd's profile names; the committee record is her own spoken case for disclosure at the moment of candidacy.",
      source: { label: 'HB504 (2025) — official bill record', url: bill('HB0504') },
      media: cvid('House Government Operations Committee', 'Feb. 26, 2025', 19881, 275262, 6, '/interim/2025/html/00001831.htm') },
  ],

  // ===== Anthony Loubet — House District 27 — was 4 Spotlight items =====
  anthony_loubet: [
    { date: '2025', impact: 'neutral', category: 'voting', issueKey: 'econ_balance',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his workers’-compensation clarification bill in committee (HB111)',
      facts: "Loubet chief-sponsored HB111 (2025), Workers' Compensation Amendments, clarifying when an individual with a disability is the employer of a person providing home- and community-based services. He introduced the bill to the House Economic Development and Workforce Services Committee on Jan. 31, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Workers' compensation and cost of living is a keyissue Loubet's profile names — a recorded, enacted action settling who carries the employer's responsibility in home-care work.",
      source: { label: 'HB111 (2025) — official bill record', url: bill('HB0111') },
      media: cvid('House Economic Development and Workforce Services Committee', 'Jan. 31, 2025', 19673, 266651, 1, '/interim/2025/html/00001003.htm') },
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'justice_balance',
      tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried his Adult Protective Services bill before committee (HB534)',
      facts: "Loubet chief-sponsored HB534 (2025), Adult Protective Services Amendments, allowing Adult Protective Services to make a substantiated finding of abuse, neglect, or exploitation of a vulnerable adult when the alleged perpetrator refuses to provide certain documents. He presented the bill — with the APS director — to the House Judiciary Committee on Feb. 26, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Adult Protective Services is a keyissue Loubet's profile names; the committee record shows him closing an evidentiary loophole that had let abuse go unsubstantiated.",
      source: { label: 'HB534 (2025) — official bill record', url: bill('HB0534') },
      media: cvid('House Judiciary Committee', 'Feb. 26, 2025', 19917, 274920, 3, '/interim/2025/html/00001808.htm') },
  ],

  // ===== Kay Christofferson — House District 53 — was 3 Spotlight items =====
  kay_christofferson: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'transit',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his transit corridor-preservation bill in committee (HB229)',
      facts: "Christofferson chief-sponsored HB229 (2025), Transportation Funds Amendments, extending corridor-preservation provisions to include fixed-guideway public-transit facilities. He introduced the bill — assisted by a transportation staffer — to the House Transportation Committee on Jan. 29, 2025, with the Utah Transit Authority speaking in support; the official committee recording archives it. The bill was signed into law.",
      why: "Corridor preservation and transit governance are keyIssues Christofferson's profile leads with; the committee record shows him extending the state's land-banking tool to future transit lines himself.",
      source: { label: 'HB229 (2025) — official bill record', url: bill('HB0229') },
      media: cvid('House Transportation Committee', 'Jan. 29, 2025', 19644, 265658, 4, '/interim/2025/html/00000733.htm') },
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

let totalNew = 0, totalLeg = 0, withMin = 0, comItems = 0;
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
    if (it.media && it.media.kind === 'committee') comItems++;
    if (it.media && it.media.minutesUrl) withMin++;
    if (it.issueKey) issueTally[it.issueKey] = (issueTally[it.issueKey] || 0) + 1;
  });
  const merged = existing.concat(toAdd);
  console.log(`+ ${id} (${doc.name}): +${toAdd.length} item(s) [${existing.length} -> ${merged.length}]`);
  toAdd.forEach(it => console.log(`    • 🎬 ${it.media.label.split(' — ')[1]}  ${it.headline}  #${it.issueKey}`));
  if (APPLY) {
    await patchSpotlight(id, doc.__fields, merged);
    console.log('    ✓ written');
  }
}

console.log('\n──────── summary ────────');
console.log(`legislators touched          : ${totalLeg}`);
console.log(`new spotlight items          : ${totalNew}`);
console.log(`committee-video items        : ${comItems}`);
console.log(`with official minutes linked  : ${withMin}`);
console.log('issue tally :', Object.entries(issueTally).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}=${n}`).join(', '));
console.log(APPLY ? '\nAPPLIED to Firestore.' : '\nDRY RUN — re-run with --apply to write.');
