#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — June 2026 VIDEO-EVIDENCE Spotlight pass (thin rural / single-
// county sitting Utah legislators)
//
// Goal: fill the thinnest remaining Spotlight profiles with items grounded in
// the politician's OWN recorded words — prioritizing the Utah Legislature's
// official floor and committee video archive, with a DIRECT, verified marker
// timestamp wherever one exists. This continues the connected-evidence work by
// tagging every new item with an ISSUE_MAP `issueKey`, so each Spotlight item
// lines up with the same issue as the member's documented Issue Position and
// Promises (the Snapshot↔Spotlight bridge `_issueEvidenceMap` already reads).
//
// HONESTY RULES (matching CONTENT_STYLE.md and the rest of the site):
//   • Every item is about the INDIVIDUAL's own record and words — never their
//     party. No party-grouping language; vote counts are stated as facts.
//   • No fabricated statements or timestamps. Each official-video timestamp
//     below was extracted from the floor archive's OWN marker `data-offset`
//     (seconds → mm:ss) and re-verified: the marker page returns HTTP 200 and
//     contains both the bill number and the sponsor's name. Where the archive
//     gives a recording but NO reliable per-item offset (committee video,
//     2021 floor video), the item links the video and does NOT claim a
//     timestamp — it says so. Audio/news items are labeled as such.
//   • A `media` object ({type, timestamp?, label}) is attached to recorded
//     items so a future "evidence view" can render stance + spoken words +
//     follow-through together. Current rendering ignores unknown fields, so
//     this is purely additive.
//   • Idempotent & non-destructive: each member's live `spotlight` array is
//     re-fetched and an item is appended ONLY if no existing item shares its
//     headline. Hand-authored entries are never clobbered.
//
// URL format note (verified Jun 20 2026): 2025/2021 floor markers resolve on
//   https://le.utah.gov/av/floorArchive.jsp?markerID=<ID>  (200)
// but 2026 markers 404 there and must use the canonical
//   https://www.utleg.gov/event-streaming/floor/marker/<ID>  (200).
// Both seek to the same official recording.
//
//   node scripts/spotlight-video-evidence-jun2026.mjs            # dry run
//   node scripts/spotlight-video-evidence-jun2026.mjs --apply    # write
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

// Official Utah Legislature floor video, addressed by marker, with the exact
// archive offset for the sponsor's segment.
const floor25 = (id) => `https://le.utah.gov/av/floorArchive.jsp?markerID=${id}`;   // 2025/2021
const floor26 = (id) => `https://www.utleg.gov/event-streaming/floor/marker/${id}`; // 2026
const cmte    = (id) => `https://le.utah.gov/av/committeeArchive.jsp?mtgID=${id}`;

// ── The plan: id → [spotlight items] ────────────────────────────────────────
// Each item carries an ISSUE_MAP `issueKey` so it joins the evidence map next
// to the member's own positions/promises on the same issue.
const PLAN = {

  // ===== Thomas Peterson — House District 1 (Box Elder & Cache, rural) =====
  thomas_peterson: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'infrastructure',
      tags: ['Notable Actions', 'Public Statements'],
      headline: "On the House floor, presented his own bill to modernize Utah's construction and electrical codes",
      facts: "A licensed electrician and former state building official, Peterson personally carried HB313 (2025), State Construction and Electrical Standards Amendments, updating Utah's adopted codes to current national standards. The Legislature's official floor video archive opens to his presentation on Day 25 (Feb. 14, 2025) at 24:42, and again on Day 45 (Mar. 7, 2025) at 33:33 when he asked the House to concur with Senate changes. The bill passed and was signed into law.",
      why: "Peterson's spoken floor record matches the trade-and-codes focus his profile is built on — a documented case of expertise translating into an enacted law he argued for in his own words.",
      source: { label: 'Utah Legislature floor video (HB313, Day 25)', url: floor25(129764) },
      media: { type: 'video', timestamp: '24:42', label: 'Official House floor video, Feb. 14, 2025' } },
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'housing_build',
      tags: ['Notable Actions', 'Consistency'],
      headline: 'Floor sponsor of new building-inspector licensing standards',
      facts: "Peterson presented HB58 (2025), Building Inspector Amendments, establishing minimum licensing standards for building inspectors. The official floor archive seeks to his presentation on Day 17 (Feb. 6, 2025) at 35:55. The measure passed and was signed into law.",
      why: "Setting a competency floor for the inspectors who sign off on Utah homes is a concrete, in-his-lane follow-through on his stated focus on building-inspector oversight — backing his Issue Position with a recorded floor argument.",
      source: { label: 'Utah Legislature floor video (HB58, Day 17)', url: floor25(129235) },
      media: { type: 'video', timestamp: '35:55', label: 'Official House floor video, Feb. 6, 2025' } },
    { date: '2026', impact: 'positive', category: 'rhetoric', issueKey: 'disaster_resilience',
      tags: ['Notable Actions'],
      headline: 'Carried a wildfire defensible-space bill barring HOAs from blocking brush removal',
      facts: "Peterson chief-sponsored HB215 (2026), Landscaping Restrictions Amendments, preventing cities, counties, and HOAs from prohibiting homeowners from removing vegetation to create defensible space against wildfire. It was heard in the House Political Subdivisions Committee in January 2026 and enacted.",
      why: "It extends his documented wildfire-and-disaster-readiness priority into homeowner property rights — letting residents harden their own lots against fire — and complements his water-and-resilience committee work.",
      source: { label: 'HB215 (2026), Utah Legislature', url: 'https://le.utah.gov/~2026/bills/static/HB0215.html' } },
  ],

  // ===== Tiara Auxier — House District 4 (Daggett/Duchesne/Morgan/Rich/Summit, rural) =====
  tiara_auxier: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'property_tax',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented her property-tax bill halting an automatic statewide increase',
      facts: "Appointed in January 2025, Auxier — a tax accountant — chief-sponsored HB110 (2025), Combined Basic Tax Rate Reduction, repealing the weighted-pupil-unit value-rate property tax and stopping an automatic increase tied to education funding. The Legislature's official floor video opens to her presentation on Day 35 (Feb. 25, 2025) at 1:39:58. The bill was enacted in her first session.",
      why: "Delivering her signature property-tax-relief promise — and arguing it herself on the floor weeks after being appointed — directly substantiates the fiscal-limits Issue Position at the center of her profile.",
      source: { label: 'Utah Legislature floor video (HB110, Day 35)', url: floor25(130579) },
      media: { type: 'video', timestamp: '1:39:58', label: 'Official House floor video, Feb. 25, 2025' } },
    { date: '2026', impact: 'neutral', category: 'rhetoric', issueKey: 'property_tax',
      tags: ['Public Statements'],
      headline: 'Discussed her property-tax and land-use work in a recorded radio interview',
      facts: "On KPCW's Local News Hour (Apr. 17, 2026), Auxier discussed HB110's effect on property taxes and her concerns about municipal land-use and developer-created towns in her rural district. The segment is audio; the station's page summarizes it without a full transcript.",
      why: "A recorded, in-her-own-voice account of why she pursued the tax change adds spoken context to the documented vote — useful for a stance-plus-spoken-words view, while honestly noting the quote is in the audio, not the page text.",
      source: { label: 'KPCW Local News Hour (audio)', url: 'https://www.kpcw.org/show/local-news-hour/2026-04-17/utah-house-rep-tiara-auxier-talks-taxes-bible-use-in-civics-classes' },
      media: { type: 'audio', label: 'KPCW radio interview, Apr. 17, 2026' } },
  ],

  // ===== Walt Brooks — House District 75 (St. George / Washington County) =====
  walt_brooks: [
    { date: '2021', impact: 'positive', category: 'voting', issueKey: 'gun_rights',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Sponsored and floor-argued Utah’s permitless concealed-carry law',
      facts: "Brooks chief-sponsored HB60 (2021), removing the permit requirement for concealed carry by adults 21 and older. The official House floor recording from Day 8 (Jan. 26, 2021) is archived and shows him presenting the bill, though the 2021 archive does not expose a per-item timestamp, so no exact marker is claimed. During that debate he argued the change was 'not just a left issue or a right issue' but 'good policy.' It passed and was signed into law.",
      why: "Permitless carry is the marquee item behind his stated Second Amendment Issue Position — and he authored and defended it himself, a clear stance-to-law follow-through.",
      source: { label: 'Utah Legislature floor video (HB60, Day 8, 2021)', url: floor25(113092) },
      media: { type: 'video', label: 'Official House floor video, Jan. 26, 2021 (no per-item timestamp in 2021 archive)' } },
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'social_security',
      tags: ['Notable Actions', 'Consistency'],
      headline: 'Sponsored Social Security tax relief raising the income phaseout for seniors',
      facts: "Brooks sponsored HB130 (2025), Social Security Tax Revisions, raising the income thresholds at which Utah's tax on Social Security benefits phases out. It was enacted, expanding relief for retirees on fixed incomes.",
      why: "It backs the senior-tax-relief promise documented in his profile with a concrete, enacted measure — follow-through, not just a campaign line.",
      source: { label: 'HB130 (2025), Utah Legislature', url: 'https://le.utah.gov/~2025/bills/static/HB0130.html' } },
  ],

  // ===== Tracy Miller — House District 45 (South Jordan/Sandy/Riverton) =====
  tracy_miller: [
    { date: '2026', impact: 'positive', category: 'voting', issueKey: 'family_support',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented her child-tax-credit expansion in both the House and Senate',
      facts: "Miller, a former Jordan School District board president, chief-sponsored HB290 (2026), Child Tax Credit Amendments, raising income-eligibility thresholds so thousands more working families qualify. She presented it on the House floor (Feb. 18, 2026; archive opens to her at 1:01:36) and again on the Senate floor (Feb. 26, 2026; archive at 0:40:59). The bill was enacted.",
      why: "Personally carrying the same bill through both chambers is documented follow-through on the child-and-family tax-relief Issue Position her profile centers on.",
      source: { label: 'Utah Legislature floor video (HB290, House, 2026)', url: floor26(134262) },
      media: { type: 'video', timestamp: '1:01:36', label: 'Official House floor video, Feb. 18, 2026' } },
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'child_care',
      tags: ['Notable Actions'],
      headline: 'Eased child-care licensing rules that capped provider capacity',
      facts: "Miller chief-sponsored HB410 (2025), Child Care Amendments, easing kitchen and food-preparation regulations that limited how many children licensed providers could serve. It was enacted, and she returned in 2026 with HB379 to extend the same relief.",
      why: "Two sessions of bills loosening the same operational bottleneck show a sustained, specific approach to her stated child-care-access priority — consistency a single vote wouldn't reveal.",
      source: { label: 'HB410 (2025), Utah Legislature', url: 'https://le.utah.gov/~2025/bills/static/HB0410.html' } },
  ],

  // ===== Verona Mauga — House District 31 (Taylorsville / West Valley City) =====
  verona_mauga: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'justice_balance',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Floor-sponsored a new criminal offense for VR-enabled sexual acts with minors',
      facts: "Mauga chief-sponsored HB358 (2025), Criminal Sexual Conduct Amendments, creating criminal offenses for adults who use virtual reality to engage in sexual acts with minors. The official House floor archive opens to her presentation on Feb. 18, 2025 at 1:06:47. It passed and was signed into law.",
      why: "Closing a technology gap in child-protection law, argued in her own words on the floor, gives her documented child-and-victim-protection Issue Position a concrete, recorded foundation.",
      source: { label: 'Utah Legislature floor video (HB358)', url: floor25(129865) },
      media: { type: 'video', timestamp: '1:06:47', label: 'Official House floor video, Feb. 18, 2025' } },
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'transit',
      tags: ['Notable Actions'],
      headline: 'Presented a statewide bike-lane safety law on the House floor',
      facts: "Mauga chief-sponsored HB290 (2025), Bicycle Lane Safety Amendments, creating a statewide prohibition on driving or parking in marked bike lanes (with turning exceptions). The official floor archive opens to her presentation on Feb. 11, 2025 at 1:24:17. The bill was enacted.",
      why: "Bicycle and road safety is a stated keynote of her profile; carrying and arguing the bill herself ties that priority to an enacted, recorded result.",
      source: { label: 'Utah Legislature floor video (HB290 bike lanes)', url: floor25(129598) },
      media: { type: 'video', timestamp: '1:24:17', label: 'Official House floor video, Feb. 11, 2025' } },
  ],

  // ===== Emily Buss — Senate District 11 (Forward Party, the only third-party member) =====
  emily_buss: [
    { date: '2026', impact: 'neutral', category: 'voting', issueKey: 'infrastructure',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'As the Senate’s only Forward Party member, presented her road-funding bill on the floor',
      facts: "Appointed in December 2025, Buss chief-sponsored SB247 (2026), Road Funding Amendments, adjusting the minimum average rack price used to calculate Utah's motor-fuel tax for road maintenance. The Legislature's official Senate floor video opens to her presentation on Mar. 3, 2026 at 1:18:33, with a second reading at 1:48:52.",
      why: "A first-session, third-party appointee carrying a technical road-funding bill herself shows early, recorded engagement on the transportation-and-infrastructure priority she ran on.",
      source: { label: 'Utah Legislature floor video (SB247)', url: floor26(135766) },
      media: { type: 'video', timestamp: '1:18:33', label: 'Official Senate floor video, Mar. 3, 2026' } },
    { date: '2026', impact: 'negative', category: 'promise', issueKey: 'public_schools',
      tags: ['Promise Stalled', 'Rhetoric vs Reality'],
      headline: 'Her school food-pantry bill died in Rules without a hearing',
      facts: "Buss sponsored SB320 (2026), School-based Food Pantry Amendments, to expand pantry programs in schools. It received a first reading but was returned to the Rules Committee and filed with its enacting clause struck — it never got a committee hearing or floor vote in the 2026 session.",
      why: "Honestly reflected: a priority tied to her education and food-security platform stalled in her first session, a real gap between intent and outcome for a newly appointed member without seniority.",
      source: { label: 'SB320 (2026), Utah Legislature', url: 'https://le.utah.gov/~2026/bills/static/SB0320.html' } },
  ],

  // ===== David Hinkins — Senate District 26 (eastern Utah, rural rancher) =====
  dhinkins: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'family_support',
      tags: ['Notable Actions', 'Public Statements'],
      headline: "Presented his bill extending Utah's Newborn Safe Haven window to 90 days",
      facts: "Hinkins chief-sponsored SB57 (2025), Newborn Relinquishment Amendments, extending the Safe Haven surrender window from 30 to 90 days. The official Senate floor archive opens to his presentation on Feb. 18, 2025 at 18:35, and again on Feb. 19, 2025 at 50:14. It was enacted.",
      why: "A rural senator best known for water and energy carrying a newborn-safety bill himself broadens the documented record of what he personally champions — a recorded action behind his stated newborn-and-child-safety priority.",
      source: { label: 'Utah Legislature floor video (SB57)', url: floor25(129904) },
      media: { type: 'video', timestamp: '18:35', label: 'Official Senate floor video, Feb. 18, 2025' } },
    { date: '2024', impact: 'neutral', category: 'rhetoric', issueKey: 'enviro_energy',
      tags: ['Public Statements', 'Consistency'],
      headline: 'In his own words: pressing for nuclear power so rural Utah keeps its lights on',
      facts: "In a January 2024 interview, Hinkins — a Ferron rancher — said, 'We just want to make sure we have power at any cost, and I'm afraid that we're going to start having rolling blackouts,' framing nuclear development as a jobs-and-reliability priority for his coal-region district as utilities move away from coal.",
      why: "His recorded statement matches the rural-energy Issue Position and the nuclear promise documented in his profile, showing rhetoric and stated agenda lining up over time.",
      source: { label: 'TownLift interview (text)', url: 'https://townlift.com/2024/01/state-senator-david-hinkins-seeks-one-more-term/' },
      media: { type: 'text', label: 'TownLift interview, Jan. 9, 2024' } },
  ],

  // ===== Colin W. Jack — House District 73 (St. George / Washington County) =====
  colin_w_jack: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'enviro_energy',
      tags: ['Notable Actions', 'Positive Leadership'],
      headline: 'Chaired the committee that advanced the state nuclear-power framework',
      facts: "Jack, an electrical engineer and former Dixie Power COO, chairs the House Public Utilities and Energy Committee. On Jan. 27, 2025 he presided over and signed the committee report advancing HB249 Nuclear Power Amendments (recommended 10-0-3). The full meeting is in the Legislature's official committee video archive; the page does not expose a per-item timestamp, so none is claimed.",
      why: "His committee gavel on the state's signature nuclear bill documents the energy-policy role his profile describes — institutional follow-through visible on the official record.",
      source: { label: 'Utah Legislature committee video (HB249 hearing)', url: cmte(19660) },
      media: { type: 'video', label: 'Official committee video, Jan. 27, 2025 (no per-item timestamp)' } },
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'enviro_energy',
      tags: ['Notable Actions'],
      headline: 'Presented his rooftop-solar consumer-protection bill on the floor',
      facts: "Jack chief-sponsored HB57 (2025), Residential Solar Panel Consumer Protection Amendments, adding disclosure, registration, and bonding requirements for solar installers. The official House floor video for Feb. 27, 2025 includes his presentation; no per-item timestamp is published, so none is claimed. The bill was enacted.",
      why: "Protecting homeowners from high-pressure solar sales, while separately backing utility-scale energy, fleshes out the 'consumer-protection' nuance in his energy Issue Position.",
      source: { label: 'Utah Legislature floor video (HB57)', url: floor25(130858) },
      media: { type: 'video', label: 'Official House floor video, Feb. 27, 2025 (no per-item timestamp)' } },
  ],

  // ===== Carl Albrecht — House District 70 (Sevier/Piute/Wayne/Beaver, rural) =====
  calbrecht: [
    { date: '2025', impact: 'positive', category: 'rhetoric', issueKey: 'enviro_energy',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'In committee, called his nuclear bill "a start" for rural Utah energy',
      facts: "Albrecht, who spent 40 years at Garkane Energy Cooperative, presented HB249 (2025), Nuclear Power Amendments, to the House Public Utilities and Energy Committee on Jan. 27, 2025, where it advanced unanimously. He told the committee, 'We've done the best to make a bill that is a starter for the nuclear industry in the state of Utah… It's not perfect, but it's a start.' The full hearing is in the official committee video archive (no per-item timestamp published).",
      why: "His recorded, measured framing — a 'starter,' 10–12 years out — substantiates the nuclear-and-energy Issue Position and promise in his profile while honestly conveying the long timeline.",
      source: { label: 'KUER (committee remarks, text)', url: 'https://www.kuer.org/politics-government/2025-01-27/bill-establishing-how-utah-goes-nuclear-gets-unanimous-committee-approval' },
      media: { type: 'video', label: 'Official committee video, Jan. 27, 2025; quote reported by KUER' } },
  ],

  // ===== Christine Watkins — House District 67 (Carbon/Emery/Duchesne, rural) =====
  christine_watkins: [
    { date: '2026', impact: 'neutral', category: 'rhetoric', issueKey: 'rural_ag',
      tags: ['Public Statements', 'Consistency'],
      headline: 'In a recorded interview, made her case to take her legislative experience to the county',
      facts: "Watkins, a career Price educator who chairs the House Child Welfare Subcommittee, announced she will finish her House term and run for an open Carbon County Commission seat. In a June 15, 2026 Castle Country Radio interview she said, 'I spent almost 14 years in the legislature… I know how to read the bills, what they're doing, who does what. And I thought, I can bring that to Carbon County.'",
      why: "Her own recorded words document the rural-representation throughline of her profile and the career transition that will shape what her remaining House votes are for.",
      source: { label: 'Castle Country Radio interview (audio)', url: 'https://www.castlecountryradio.com/2026/06/15/christine-watkins-makes-her-case-to-become-carbon-county-commissioner/' },
      media: { type: 'audio', label: 'Castle Country Radio, June 15, 2026' } },
  ],

  // ===== Joseph Elison — House District 72 (Washington County, Zion gateway) =====
  joseph_elison: [
    { date: '2026', impact: 'positive', category: 'rhetoric', issueKey: 'back_police',
      tags: ['Public Statements', 'Consistency'],
      headline: 'On the record defending Utah’s gambling ban: "very, very clear"',
      facts: "Elison sponsored a 2026 bill adding 'proposition betting' to Utah's statutory definition of gambling. In a Feb. 26, 2026 Utah Public Radio segment he said, 'Our state constitution is very, very clear, we do not allow betting or gambling in any shape or form in the state of Utah,' adding that the bill 'simply adds the definition of proposition betting to the definition of gambling… period.'",
      why: "A recorded statement directly matching the anti-gambling-enforcement priority listed in his profile — stated stance and spoken words lining up.",
      source: { label: 'Utah Public Radio (audio)', url: 'https://www.upr.org/politics/2026-02-26/utah-legislature-moves-to-crack-down-on-gambling' },
      media: { type: 'audio', label: 'Utah Public Radio, Feb. 26, 2026' } },
  ],

  // ===== Jason B. Kyle — House District 8 (Ogden Valley / northern Weber County) =====
  jason_b_kyle: [
    { date: '2025', impact: 'neutral', category: 'rhetoric', issueKey: 'election_integrity',
      tags: ['Public Statements'],
      headline: 'Explained his Electoral College resolution in a recorded radio interview',
      facts: "Kyle sponsored HJR5 (2025), a proposed constitutional amendment barring the Legislature from joining an interstate compact to award Utah's electoral votes to the national popular-vote winner. On KSL NewsRadio's Inside Sources (Feb. 3, 2025) he said the measure 'makes it so that the legislature can't… give away our electoral college votes,' recalling that on hearing the national-popular-vote pitch, 'we all kind of looked at them and said, this is a terrible idea.' The resolution passed the Legislature for the ballot.",
      why: "His own recorded explanation backs the election-integrity Issue Position in his profile and clarifies the intent behind a measure voters will ultimately decide.",
      source: { label: 'KSL NewsRadio Inside Sources (audio)', url: 'https://kslnewsradio.com/elections-politics-government/hbj5-utah-electoral-votes/2178049/' },
      media: { type: 'audio', label: 'KSL NewsRadio, Feb. 3, 2025' } },
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'health_mental',
      tags: ['Notable Actions'],
      headline: 'Presented his bill regulating sober-living recovery residences',
      facts: "Kyle chief-sponsored HB296 (2025), Recovery Residence Services Amendments, updating Utah's licensing framework for sober-living homes. He presented it on the House floor (Feb. 19, 2025); the official video is archived without a published per-item timestamp. It was signed into law Mar. 19, 2025.",
      why: "Bringing oversight to recovery housing is documented follow-through on the recovery-residence-regulation priority named in his profile.",
      source: { label: 'Utah Legislature floor video (HB296)', url: floor25(130045) },
      media: { type: 'video', label: 'Official House floor video, Feb. 19, 2025 (no per-item timestamp)' } },
  ],

  // ===== Stephen L. Whyte — House District 63 (Utah County) — bill-grounded, no video found =====
  stephen_l_whyte: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'housing_build',
      tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried a package of housing-attainability and land-use bills in one session',
      facts: "Whyte chief-sponsored a coordinated 2025 housing package: HB368 (Local Land Use Amendments) creating an expedited review process, HB360 (Housing Attainability Amendments) letting part of the $300M state housing fund support owner-occupied attainable homes, and HCR14 directing executive agencies to streamline housing policy. All advanced.",
      why: "Three complementary bills in a single session document a deliberate, sustained approach to the housing-supply Issue Position his profile centers on — more telling than any one vote.",
      source: { label: 'HB360 (2025), Utah Legislature', url: 'https://le.utah.gov/~2025/bills/static/HB0360.html' } },
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'justice_balance',
      tags: ['Notable Actions'],
      headline: 'Strengthened mandatory minimums for repeat child sexual-abuse offenders',
      facts: "Whyte chief-sponsored HB207 (2025), Sexual Offense Revisions, adding a five-year mandatory-minimum increase per felony conviction for repeat child sexual-abuse offenders. It was enacted.",
      why: "It backs the child-protection priority documented in his profile with a specific, enacted sentencing change — a concrete record behind the stated position.",
      source: { label: 'HB207 (2025), Utah Legislature', url: 'https://le.utah.gov/~2025/bills/static/HB0207.html' } },
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

let totalNew = 0, totalLeg = 0, withTs = 0;
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
    if (it.media && it.media.timestamp) withTs++;
    if (it.issueKey) issueTally[it.issueKey] = (issueTally[it.issueKey] || 0) + 1;
  });
  const merged = existing.concat(toAdd);
  console.log(`+ ${id} (${doc.name}): +${toAdd.length} item(s) [${existing.length} -> ${merged.length}]`);
  toAdd.forEach(it => console.log(`    • ${it.media && it.media.timestamp ? '⏱ ' + it.media.timestamp + '  ' : ''}${it.headline}  #${it.issueKey}`));
  if (APPLY) {
    await patchSpotlight(id, doc.__fields, merged);
    console.log('    ✓ written');
  }
}

console.log('\n──────── summary ────────');
console.log(`legislators touched : ${totalLeg}`);
console.log(`new spotlight items : ${totalNew}`);
console.log(`with direct video timestamp : ${withTs}`);
console.log('issue tally :', Object.entries(issueTally).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}=${n}`).join(', '));
console.log(APPLY ? '\nAPPLIED to Firestore.' : '\nDRY RUN — re-run with --apply to write.');
