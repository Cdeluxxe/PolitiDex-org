#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — June 2026 COMMITTEE-VIDEO Spotlight pass, WAVE 2
//
// Continues the committee-hearing video evidence layer opened by
// scripts/spotlight-committee-video-jun2026.mjs. Committee hearings are where a
// chief sponsor usually gives the fullest spoken explanation of a bill's
// purpose, need, and detail, so this wave mines the Utah Legislature's official
// 2025 committee record for MORE sitting legislators — prioritizing currently
// thin profiles and bills that open a new issue or upgrade a text-only mention
// into on-record video evidence.
//
// HOW EACH ITEM WAS BUILT AND VERIFIED (live, this pass):
//   • Bill record   : https://le.utah.gov/data/2025GS/<bill>.json — gives the
//     chief sponsor (`primeSponsorName`), the short title, the verbatim
//     `highlightedProvisions` each `facts` paragraph is built from, the final
//     action (`lastAction` — only "Governor Signed" bills are used here), and
//     the `agendaList` (the official per-bill list of committee hearings, each
//     tagged with the meeting id `mtgID`, a timeline `markerID`, the agenda item
//     number, the committee name/date, and the official minutes URL).
//   • Committee video: https://le.utah.gov/av/committeeArchive.jsp?mtgID=<mtgID>
//     — the official archived recording of that committee meeting. The bill's
//     `markerID` is appended so the player seeks to that agenda item's segment.
//   • Committee minutes: the official minutes (`minutesURL`) were fetched and
//     read THIS pass to verify, for EVERY item, that the legislator PERSONALLY
//     presented the bill (e.g. "Rep. Katy Hall presented the bill"). The hearing
//     used is always the one in the member's OWN chamber, where they speak in
//     their own words. Items where the minutes did not clearly record the
//     sponsor presenting (e.g. HB154 for Stoddard, which jumps straight to a
//     procedural motion) were dropped.
//
// SELECTION RULE (avoids redundancy with the floor-video waves):
//   • A bill already carried by a FLOOR-video Spotlight item is skipped — a
//     committee clip on the same bill would just echo the card. This wave adds
//     committee video only where it (a) opens a genuinely NEW bill/issue, or
//     (b) UPGRADES a text-only stub into recorded, on-the-record video evidence.
//
// HONESTY / CONTENT_STYLE rules (same as wave 1):
//   • Every item is about the INDIVIDUAL's own bill, words, and recorded action —
//     never their party. No party-grouping language; signed status is stated as
//     a plain fact from the bill's own action history. Only enacted bills used.
//   • NO fabricated timestamps. The committee archive exposes no per-bill mm:ss
//     offset in machine-readable form, so no minute mark is asserted; the meeting
//     recording (mtgID) seeked by the bill's markerID, plus the agenda item
//     number and the linked official minutes, are the verifiable locator.
//     `media.timestamp` is intentionally omitted — the renderer shows "Watch".
//   • `source` points at the official bill record; `media` carries kind:'committee'
//     + mtgID/markerID/agenda item/minutesUrl so the evidence view can sit
//     committee video cleanly beside floor video. Extra fields are ignored by the
//     current renderer.
//   • Every item carries a valid ISSUE_MAP `issueKey`, chosen to land on the
//     member's own documented focus — or, for thin profiles, to open a
//     well-supported new issue. The `why` notes how the committee statement
//     supports, complicates, or adds context to the member's record.
//   • Idempotent: each member's live `spotlight` array is re-fetched and an item
//     is appended ONLY if no existing item shares its headline.
//
//   node scripts/spotlight-committee-video-jun2026-wave2.mjs            # dry run
//   node scripts/spotlight-committee-video-jun2026-wave2.mjs --apply    # write
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
const bill = (num) => `https://le.utah.gov/~2025/bills/static/${num}.html`;
const comUrl = (mtgID, marker) => `https://le.utah.gov/av/committeeArchive.jsp?mtgID=${mtgID}&markerID=${marker}`;
const minUrl = (p) => `https://le.utah.gov${p}`;
const cvid = (committee, dateLabel, mtgID, marker, item, min) => ({
  type: 'video', kind: 'committee',
  label: `Official Utah Legislature committee hearing video — ${committee}, ${dateLabel} (2025 General Session)`,
  url: comUrl(mtgID, marker),
  mtgID: String(mtgID), markerID: String(marker), agendaItem: String(item),
  minutesUrl: minUrl(min),
});

// ── The plan: Firestore id → [spotlight items] ──────────────────────────────
const PLAN = {

  // ===== Andrew Stoddard — House District 44 — was 3 Spotlight items =====
  andrew_stoddard: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'enviro_balance',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his halogen-emissions control bill in committee (HB420)',
      facts: "Stoddard chief-sponsored HB420 (2025), Halogen Emissions Amendments, requiring the Division of Air Quality to complete a best-available-control-technology emissions reduction plan for major halogen sources and to report annually on halogen emissions. He introduced the bill — assisted by Piper Christian of Stewardship Utah — to the House Economic Development and Workforce Services Committee on Feb. 18, 2025, with an industry group speaking in opposition; the official committee recording archives it and the minutes record it. The bill was signed into law.",
      why: "Air quality is a concrete environmental action on Stoddard's record; the committee record shows him pressing a specific emissions-control mandate through contested testimony in his own words — the first on-record video evidence behind it.",
      source: { label: 'HB420 (2025) — official bill record', url: bill('HB0420') },
      media: cvid('House Economic Development and Workforce Services Committee', 'Feb. 18, 2025', 19757, 272343, 6, '/interim/2025/html/00001656.htm') },
  ],

  // ===== Doug Welton — House District 65 — was 4 Spotlight items =====
  doug_welton: [
    { date: '2025', impact: 'neutral', category: 'voting', issueKey: 'enviro_balance',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his glass-recycling study bill in committee (HB177)',
      facts: "Welton chief-sponsored HB177 (2025), Glass Recycling Amendments, requiring the Division of Waste Management and Radiation Control to study how to increase the amount of used glass that is recycled and to report findings and recommendations to an interim committee. He personally presented the bill to the House Natural Resources, Agriculture, and Environment Committee on Feb. 3, 2025; the official committee recording archives it and the minutes record it. The bill was signed into law.",
      why: "A recycling-and-waste measure adds a practical-stewardship dimension to Welton's record beyond his education and tax work — a recorded, enacted action argued in his own words.",
      source: { label: 'HB177 (2025) — official bill record', url: bill('HB0177') },
      media: cvid('House Natural Resources, Agriculture, and Environment Committee', 'Feb. 3, 2025', 19685, 267278, 1, '/interim/2025/html/00001244.htm') },
  ],

  // ===== Katy Hall — House District 11 — was 4 Spotlight items =====
  katy_hall: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'healthcare',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented her freestanding-ER standards bill in committee (HB152)',
      facts: "Hall chief-sponsored HB152 (2025), Health Care Facilities Amendments, establishing requirements for certain satellite emergency departments and limiting the number a single health care organization may operate. She personally presented the bill to the House Health and Human Services Committee on Jan. 28, 2025, with the Utah Nurses Association speaking in favor; the official committee recording archives it and the minutes record it. The bill was signed into law.",
      why: "Hall's profile already notes freestanding-ER standards as a text item; the committee record upgrades that to on-the-record video of her making the case herself for limits on satellite emergency departments.",
      source: { label: 'HB152 (2025) — official bill record', url: bill('HB0152') },
      media: cvid('House Health and Human Services Committee', 'Jan. 28, 2025', 19614, 264984, 1, '/interim/2025/html/00000570.htm') },
    { date: '2025', impact: 'neutral', category: 'voting', issueKey: 'public_schools',
      tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried her public-education compliance bill before committee (HB497)',
      facts: "Hall chief-sponsored HB497 (2025), Public Education Compliance, requiring the State Board of Education to use an existing compliance framework to address allegations of noncompliance, to handle complaints to the Professional Practices Advisory Commission in a timely way, and to publish certain board-meeting information online. She presented the bill — with the assistance of a resident — to the House Education Committee on Feb. 25, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Adding an accountability-and-transparency measure in public schools broadens Hall's record beyond healthcare — a recorded, enacted action in her own words.",
      source: { label: 'HB497 (2025) — official bill record', url: bill('HB0497') },
      media: cvid('House Education Committee', 'Feb. 25, 2025', 19907, 274757, 2, '/interim/2025/html/00001811.htm') },
  ],

  // ===== Matt MacPherson — House District 26 — was 4 Spotlight items =====
  matt_macpherson: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'gun_rights',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his firearm-retention bill in committee (HB195)',
      facts: "MacPherson chief-sponsored HB195 (2025), Firearm Retention Amendments, barring a plea in abeyance from requiring a defendant to forfeit firearms in certain circumstances and requiring firearms seized by law enforcement to be returned to an individual who may lawfully possess them. He personally presented the bill to the House Judiciary Committee on Feb. 3, 2025, with gun-policy groups speaking on both sides; the official committee recording archives it and the minutes record it. The bill was signed into law.",
      why: "Gun rights are a keyissue MacPherson's profile names; the committee record upgrades a text mention into on-record video of him defending lawful owners' retention of seized firearms through contested testimony.",
      source: { label: 'HB195 (2025) — official bill record', url: bill('HB0195') },
      media: cvid('House Judiciary Committee', 'Feb. 3, 2025', 19605, 267600, 3, '/interim/2025/html/00001247.htm') },
  ],

  // ===== Jason B. Kyle — House District 8 — was 4 Spotlight items =====
  jason_b_kyle: [
    { date: '2025', impact: 'neutral', category: 'voting', issueKey: 'rural_ag',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his urban-farming assessment bill in committee (HB208)',
      facts: "Kyle chief-sponsored HB208 (2025), Urban Farming Assessment Modifications, repealing the annual renewal-application requirement for land eligible under the Urban Farming Assessment Act and setting when a county assessor may request additional information. He presented the bill — alongside the Weber County assessor — to the House Revenue and Taxation Committee on Jan. 27, 2025, with the Utah Farm Bureau Federation speaking in favor; the official committee recording archives it. The bill was signed into law.",
      why: "Easing the paperwork that keeps small agricultural parcels in farm-rate assessment is a recorded, enacted action that opens a farming-and-rural dimension on Kyle's record, argued in his own words.",
      source: { label: 'HB208 (2025) — official bill record', url: bill('HB0208') },
      media: cvid('House Revenue and Taxation Committee', 'Jan. 27, 2025', 19667, 264411, 1, '/interim/2025/html/00000625.htm') },
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'gov_transparency',
      tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried his bill limiting taxpayer-funded official publicity before committee (HB551)',
      facts: "Kyle chief-sponsored HB551 (2025), Elected Official Publicity Amendments, prohibiting a public official from spending public funds on a billboard or mass communication that contains certain content within 60 days before a caucus, convention, or election in which the official is a candidate. He presented the bill to the House Business, Labor, and Commerce Committee on Feb. 28, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Stopping incumbents from using public money for self-promotion just before an election is a government-integrity action; the committee record is Kyle's own spoken case for the 60-day limit.",
      source: { label: 'HB551 (2025) — official bill record', url: bill('HB0551') },
      media: cvid('House Business, Labor, and Commerce Committee', 'Feb. 28, 2025', 19961, 276180, 2, '/interim/2025/html/00001895.htm') },
  ],

  // ===== Jon Hawkins — House District 55 — was 4 Spotlight items =====
  jon_hawkins: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'econ_growth',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his Olympic legacy-venue liability bill in committee (HB541)',
      facts: "Hawkins chief-sponsored HB541 (2025), Olympic Legacy Liability Amendments, establishing limitations on liability for the operator of a specified winter-sports area and requiring notice of those limitations to participants. He presented the bill — along with the CEO of the Utah Olympic Legacy Foundation — to the House Economic Development and Workforce Services Committee on Feb. 27, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "With Utah set to host the 2034 Winter Games, protecting the operation of its legacy training venues is a recorded, enacted action; the committee record shows Hawkins setting the terms himself, in his own words.",
      source: { label: 'HB541 (2025) — official bill record', url: bill('HB0541') },
      media: cvid('House Economic Development and Workforce Services Committee', 'Feb. 27, 2025', 19889, 275294, 1, '/interim/2025/html/00001824.htm') },
  ],

  // ===== Joseph Elison — House District 72 — was 4 Spotlight items =====
  joseph_elison: [
    { date: '2025', impact: 'neutral', category: 'voting', issueKey: 'public_schools',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his online-education accountability bill in committee (HB246)',
      facts: "Elison chief-sponsored HB246 (2025), Statewide Online Education Program Amendments, authorizing the State Board of Education to conduct sample audits of online courses, expanding performance reporting for online course providers, and requiring a provider report card. He personally presented the bill to the House Education Committee on Feb. 18, 2025, with school-board and superintendent groups speaking; the official committee recording archives it. The bill was signed into law.",
      why: "Tightening oversight of online-course quality and outcomes is a recorded, enacted public-schools action that adds a concrete accountability item to Elison's record, made in his own words.",
      source: { label: 'HB246 (2025) — official bill record', url: bill('HB0246') },
      media: cvid('House Education Committee', 'Feb. 18, 2025', 19820, 272347, 6, '/interim/2025/html/00001660.htm') },
  ],

  // ===== Bridger Bolinder — House District 67 — was 4 Spotlight items =====
  bridger_bolinder: [
    { date: '2025', impact: 'neutral', category: 'voting', issueKey: 'enviro_energy',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his radioactive-waste classification bill in committee (HB254)',
      facts: "Bolinder chief-sponsored HB254 (2025), Waste Classification Amendments, modifying the statutory definitions of high-level nuclear waste and low-level radioactive waste. He personally presented the bill — with the assistance of a representative from EnergySolutions — to the House Public Utilities and Energy Committee on Jan. 30, 2025, with an air-quality advocate speaking against it; the official committee recording archives it. The bill was signed into law.",
      why: "Waste classification governs what may be stored at Utah disposal sites in Bolinder's west-desert district; the committee record shows him handling that contested energy-and-environment detail himself, against opposing testimony.",
      source: { label: 'HB254 (2025) — official bill record', url: bill('HB0254') },
      media: cvid('House Public Utilities and Energy Committee', 'Jan. 30, 2025', 19661, 266216, 2, '/interim/2025/html/00001095.htm') },
  ],

  // ===== Ariel Defay — House District 19 — was 4 Spotlight items =====
  ariel_defay: [
    { date: '2025', impact: 'neutral', category: 'voting', issueKey: 'healthcare',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented her dental-practice and teledentistry bill in committee (HB372)',
      facts: "Defay chief-sponsored HB372 (2025), Dental Practice Amendments, revising supervision provisions for dental professionals, provisions for dental hygiene schools, the practice of dentistry and dental hygiene, and teledentistry. She personally presented the bill to the House Business, Labor, and Commerce Committee on Feb. 10, 2025, with the Utah Dental Hygienists' Association speaking; the official committee recording archives it. The bill was signed into law.",
      why: "Setting the rules for who may deliver dental care, and how teledentistry fits, is a recorded healthcare action that adds clinical-practice depth to Defay's record, argued in her own words.",
      source: { label: 'HB372 (2025) — official bill record', url: bill('HB0372') },
      media: cvid('House Business, Labor, and Commerce Committee', 'Feb. 10, 2025', 19854, 270311, 5, '/interim/2025/html/00001562.htm') },
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'justice_balance',
      tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried her enticing-a-minor sentencing bill before committee (HB197)',
      facts: "Defay chief-sponsored HB197 (2025), Criminal Conduct Amendments, amending the crime of enticing a minor and adding factors a sentencing court must consider in determining whether an individual under 21 used force or coercion when committing a registrable offense, for purposes of registry length. She presented the bill — with the assistance of the Attorney General's Office — to the House Law Enforcement and Criminal Justice Committee on Jan. 24, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Calibrating sex-offender registry consequences for young offenders is a recorded, enacted criminal-justice action; the committee record shows Defay working the statutory detail herself.",
      source: { label: 'HB197 (2025) — official bill record', url: bill('HB0197') },
      media: cvid('House Law Enforcement and Criminal Justice Committee', 'Jan. 24, 2025', 19658, 263982, 3, '/interim/2025/html/00000722.htm') },
  ],

  // ===== Jefferson Burton — House District 64 — was 4 Spotlight items =====
  jburton: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'justice_balance',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his corrections drug-enforcement unit bill in committee (HB323)',
      facts: "Burton chief-sponsored HB323 (2025), Correctional Drug Enforcement Amendments, requiring the Department of Corrections to create a drug abuse and trafficking unit to combat illegal drug use and trafficking by inmates and by offenders on probation and parole, and to coordinate with law enforcement. He personally presented the bill — with the assistance of the Department of Corrections' executive director — to the House Law Enforcement and Criminal Justice Committee on Feb. 6, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Targeting drug trafficking inside the corrections system is a recorded public-safety action; the committee record is Burton's own spoken case for a dedicated enforcement unit.",
      source: { label: 'HB323 (2025) — official bill record', url: bill('HB0323') },
      media: cvid('House Law Enforcement and Criminal Justice Committee', 'Feb. 6, 2025', 19665, 269344, 3, '/interim/2025/html/00001514.htm') },
    { date: '2025', impact: 'neutral', category: 'voting', issueKey: 'election_integrity',
      tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried his voter-registration verification bill before committee (HB300)',
      facts: "Burton chief-sponsored HB300 (2025), Amendments to Election Law, directing the lieutenant governor to develop procedures to evaluate voter-registration records for address anomalies, to investigate registrations when a mailed ballot is returned undeliverable, and to register with a systematic records-matching system. He distributed a handout and personally presented the bill to the House Government Operations Committee on Feb. 4, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Voter-roll maintenance procedures are a recorded, enacted election-administration action; the committee record shows Burton explaining the specific verification steps himself.",
      source: { label: 'HB300 (2025) — official bill record', url: bill('HB0300') },
      media: cvid('House Government Operations Committee', 'Feb. 4, 2025', 19602, 267986, 4, '/interim/2025/html/00001354.htm') },
  ],

  // ===== Trevor Lee — House District 16 — was 3 Spotlight items =====
  tlee: [
    { date: '2025', impact: 'neutral', category: 'voting', issueKey: 'medical_freedom',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his vaccine-in-food labeling bill in committee (HB84)',
      facts: "Lee chief-sponsored HB84 (2025), Vaccine Amendments, designating food intended for human consumption that intentionally contains a vaccine or vaccine material as a drug. He personally presented the bill to the House Health and Human Services Committee on Jan. 31, 2025, with public-health speakers weighing in; the official committee recording archives it. The bill was signed into law.",
      why: "Treating vaccine-containing food as a regulated drug is a medical-choice and food-labeling action; the committee record is Lee's own spoken explanation of the bill's reach, before opposing testimony.",
      source: { label: 'HB84 (2025) — official bill record', url: bill('HB0084') },
      media: cvid('House Health and Human Services Committee', 'Jan. 31, 2025', 19616, 266735, 3, '/interim/2025/html/00000964.htm') },
    { date: '2025', impact: 'neutral', category: 'voting', issueKey: 'privacy_rights',
      tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried his education-employee data-privacy bill before committee (HB124)',
      facts: "Lee chief-sponsored HB124 (2025), Education Industry Employee Privacy, restricting a local education agency from selling or transferring certain contact information without consent, limiting required use of certain technologies on personal devices, and creating a complaint process for employees. He presented the bill — with the assistance of a Utah State Board of Education staffer — to the House Education Committee on Jan. 23, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Protecting the personal data and devices of school employees is a recorded privacy action; the committee record shows Lee detailing the consent and complaint provisions himself.",
      source: { label: 'HB124 (2025) — official bill record', url: bill('HB0124') },
      media: cvid('House Education Committee', 'Jan. 23, 2025', 19607, 263588, 6, '/interim/2025/html/00000560.htm') },
  ],

  // ===== Rex Shipp — House District 71 — was 3 Spotlight items =====
  rshipp: [
    { date: '2025', impact: 'neutral', category: 'voting', issueKey: 'family_support',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his adoption-evaluation bill in committee (HB141)',
      facts: "Shipp chief-sponsored HB141 (2025), Adoption Modifications, creating exceptions to the requirement of a preplacement adoptive evaluation. He presented the bill — along with a representative of the Utah Adoption Law Center — to the House Judiciary Committee on Feb. 3, 2025, with a resident speaking in opposition; the official committee recording archives it. The bill was signed into law.",
      why: "Smoothing the path for certain adoptions is a recorded, enacted family action that opens a family-support dimension on Shipp's record, made in his own words against contested testimony.",
      source: { label: 'HB141 (2025) — official bill record', url: bill('HB0141') },
      media: cvid('House Judiciary Committee', 'Feb. 3, 2025', 19605, 267290, 2, '/interim/2025/html/00001247.htm') },
  ],

  // ===== Heidi Balderree — Senate District 22 — was 4 Spotlight items =====
  heidi_balderree: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'property_tax',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented her Truth in Taxation quorum bill before a Senate committee (SB95)',
      facts: "Balderree chief-sponsored SB95 (2025), Truth in Taxation Amendments, aligning the definition of \"meeting\" with the Open and Public Meetings Act to clarify that a public hearing on raising a property-tax rate above the certified rate requires a quorum of the taxing entity present. She introduced the bill — with the assistance of the Utah Taxpayers Association — to the Senate Government Operations and Political Subdivisions Committee on Jan. 24, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Requiring a quorum at the hearing where taxes are raised strengthens Utah's Truth-in-Taxation safeguards; the committee record is Balderree's own spoken case for the change.",
      source: { label: 'SB95 (2025) — official bill record', url: bill('SB0095') },
      media: cvid('Senate Government Operations and Political Subdivisions Committee', 'Jan. 24, 2025', 19638, 264053, 6, '/interim/2025/html/00000420.htm') },
  ],

  // ===== John D. Johnson — Senate District 19 — was 4 Spotlight items =====
  john_johnson: [
    { date: '2025', impact: 'neutral', category: 'voting', issueKey: 'public_schools',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his online-education funding bill before a Senate committee (SB35)',
      facts: "Johnson chief-sponsored SB35 (2025), Statewide Online Education Program Modifications, requiring the State Board of Education to establish funding priorities, creating an annual assessment of school needs, and providing for a report to the Education Interim Committee. He personally presented the bill to the Senate Education Committee on Feb. 28, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Setting funding priorities for the statewide online program is a recorded public-schools action; the committee record shows Johnson explaining the framework himself.",
      source: { label: 'SB35 (2025) — official bill record', url: bill('SB0035') },
      media: cvid('Senate Education Committee', 'Feb. 28, 2025', 19939, 275940, 1, '/interim/2025/html/00001848.htm') },
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'healthcare',
      tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried his insurance preauthorization transparency bill before committee (SB274)',
      facts: "Johnson chief-sponsored SB274 (2025), Health Insurance Preauthorization Revisions, requiring health insurers to provide preauthorization information to the Department of Insurance, patients, and health care providers. He presented the bill to the Senate Business and Labor Committee on Feb. 19, 2025, with hospital and provider representatives speaking; the official committee recording archives it. The bill was signed into law.",
      why: "Forcing insurers to disclose how preauthorization works is a patient-and-provider transparency action; the committee record is Johnson's own spoken case, adding a healthcare dimension to his record.",
      source: { label: 'SB274 (2025) — official bill record', url: bill('SB0274') },
      media: cvid('Senate Business and Labor Committee', 'Feb. 19, 2025', 19790, 272991, 1, '/interim/2025/html/00001694.htm') },
  ],

  // ===== Ronald Winterton — Senate District 26 — was 4 Spotlight items =====
  rwinterton: [
    { date: '2025', impact: 'neutral', category: 'voting', issueKey: 'lands_balance',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his hunting guide-and-outfitter registration bill before a Senate committee (SB149)',
      facts: "Winterton chief-sponsored SB149 (2025), creating the Guide, Outfitter, and Spotter Fund, establishing when use of a guide, outfitter, or spotter is unlawful, and requiring those operators to register with the Division of Wildlife Resources under division rules. He personally presented the bill to the Senate Transportation, Public Utilities, Energy, and Technology Committee on Jan. 28, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Regulating guides and outfitters on Utah's wildlands is squarely tied to the rural, recreation-heavy Uinta Basin district Winterton represents; the committee record shows him setting the registration framework himself.",
      source: { label: 'SB149 (2025) — official bill record', url: bill('SB0149') },
      media: cvid('Senate Transportation, Public Utilities, Energy, and Technology Committee', 'Jan. 28, 2025', 19653, 264952, 2, '/interim/2025/html/00000730.htm') },
  ],

  // ===== Ann Millner — Senate District 18 — was 3 Spotlight items =====
  amillner: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'edu_college_cost',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented her statewide talent-portal bill before a Senate committee (SB162)',
      facts: "Millner chief-sponsored SB162 (2025), creating a statewide talent portal for high-demand jobs that connects Utah employers with qualified candidates from higher-education institutions, defining high-demand jobs by growth, wages, and societal impact, and requiring integration with state labor-market data. She personally presented the bill to the Senate Education Committee on Feb. 4, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Linking higher-education graduates to in-demand careers is the workforce-and-college throughline of Millner's record; the committee record upgrades a text mention into on-record video of her own case for the portal.",
      source: { label: 'SB162 (2025) — official bill record', url: bill('SB0162') },
      media: cvid('Senate Education Committee', 'Feb. 4, 2025', 19619, 268049, 3, '/interim/2025/html/00001250.htm') },
  ],

  // ===== Doug Owens — House District 33 — was 4 Spotlight items =====
  doug_owens: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'enviro_energy',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his rooftop-solar rights bill in committee (HB119)',
      facts: "Owens chief-sponsored HB119 (2025), Solar Panel Restrictions in Homeowners Associations Amendments, stopping a homeowners association from prohibiting solar-panel installation while allowing an association to place reasonable restrictions on it. He introduced the bill to the House Political Subdivisions Committee on Feb. 4, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Protecting a homeowner's right to install rooftop solar is a recorded clean-energy and property action; the committee record shows Owens making the case for the balance himself.",
      source: { label: 'HB119 (2025) — official bill record', url: bill('HB0119') },
      media: cvid('House Political Subdivisions Committee', 'Feb. 4, 2025', 19630, 267924, 1, '/interim/2025/html/00001434.htm') },
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'family_support',
      tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried his child-performer trust-protection bill before committee (HB322)',
      facts: "Owens chief-sponsored HB322 (2025), Child Actor Regulations, requiring a parent or guardian to establish a trust for a minor involved in entertainment and setting the circumstances under which a child of a content creator is covered and who may serve as trustee. He presented the bill — with the assistance of a resident — to the House Business, Labor, and Commerce Committee on Feb. 18, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Safeguarding the earnings of children who appear in online content and entertainment is a recorded, enacted family-protection action; the committee record is Owens's own spoken case for the trust requirement.",
      source: { label: 'HB322 (2025) — official bill record', url: bill('HB0322') },
      media: cvid('House Business, Labor, and Commerce Committee', 'Feb. 18, 2025', 19856, 272211, 2, '/interim/2025/html/00001696.htm') },
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
