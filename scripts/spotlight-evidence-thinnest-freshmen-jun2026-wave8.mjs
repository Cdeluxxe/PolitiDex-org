#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — June 2026 evidence pass, WAVE 8
// AGGRESSIVE multi-source evidence for the THINNEST sitting Utah legislators —
// the 2025 freshman class and rural/single-county members who still carried
// zero or near-zero Spotlight records after waves 1–7.
//
// ── WHO IS TARGETED, AND WHY (the thinnest profiles) ────────────────────────
//   The authority for "currently sitting" is the Utah Legislature's own live
//   roster, le.utah.gov/data/legislators.json (104 members). From that roster
//   this wave isolates the newest members — the class that took office on
//   January 1, 2025 and served their FIRST general session — plus rural and
//   single-county members who remained thin. These are exactly the profiles the
//   evidence library most needs: most had only a single floor item (or none)
//   from earlier waves.
//
// ── HOW EVERY ITEM BELOW WAS VERIFIED END-TO-END (re-run live this pass) ─────
//   Each item is the member's OWN recorded floor presentation of a bill they
//   personally chief-sponsored and that became law. The verification pipeline
//   that produced this file:
//     1) Bill index : le.utah.gov/data/2025GS/billlist.json (959 bills) was
//        walked, and every bill JSON (le.utah.gov/data/2025GS/<BILL>.json) was
//        pulled. A bill is used ONLY when:
//          • its primeSponsor code is THIS member's roster id (e.g. AUXIET →
//            Tiara Auxier), confirming she is the chief sponsor, AND
//          • its actionHistoryList contains a "Governor Signed" (GSIGN) action,
//            so only ENACTED bills are framed as law.
//        Each `facts` paragraph is drawn verbatim from that bill's own
//        `highlightedProvisions`.
//     2) Floor video : the member's OWN segment is the floorDebateList marker
//        whose chamber matches the member and whose description ends in the
//        member's surname. That marker's archive page
//        (floorArchive.jsp?markerID=<id>) carries the seek offset for the
//        member's segment in its player-init call; that offset (seconds → mm:ss
//        / h:mm:ss) is the EXACT, verified seek point cited as `media.timestamp`.
//        The extractor was re-validated this pass against known values
//        (marker 129768 → 1764s → 29:24; marker 131177 → 1588s → 26:28).
//
// ── NO DUPLICATES ───────────────────────────────────────────────────────────
//   Every bill already used for these members in waves 1–4 was excluded by bill
//   number before authoring (e.g. Auxier's HB462/HB297, Koford's HB446/HB308,
//   Thompson's HB361/HB373, Shallenberger's HB98, Nguyen's HB391). Members whose
//   only signed-with-video bills were ALL already covered receive NO new item
//   here and are reported honestly in the pass notes rather than padded.
//
// ── MULTI-SOURCE / HONESTY NOTE ─────────────────────────────────────────────
//   Official floor video is the highest-priority source and is what cleared
//   verification this wave. The official social handles published in the roster
//   (X / Facebook / Instagram) were also swept for substantive, complete,
//   first-person posts via the Wayback CDX index + the X syndication endpoint;
//   posts that could not be verified to the legislator's own account with
//   complete (non-truncated) substantive text were NOT used. Per CONTENT_STYLE,
//   genuinely thin records are reported honestly, not forced.
//
// CONTENT_STYLE.md: every item is about the INDIVIDUAL's own bill and recorded
// action — never their party. "Signed into law" is a plain fact from the bill's
// own action history; no vote tally is labeled partisan. Each item carries an
// ISSUE_MAP `issueKey` (validated against the live vocabulary in index.html)
// chosen to match the bill's subject, so the Spotlight item lands on the same
// issue as the member's stance and promises and joins the connected evidence map.
//
// Idempotent: each member's live `spotlight` array is re-fetched and an item is
// appended ONLY if no existing item shares its headline. Writes patch only the
// `spotlight` and `updatedAt` fields (quota-friendly), with backoff on 429.
//
//   node scripts/spotlight-evidence-thinnest-freshmen-jun2026-wave8.mjs          # dry run
//   node scripts/spotlight-evidence-thinnest-freshmen-jun2026-wave8.mjs --apply  # write
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
  // 'HB74' -> 'HB0074'  (canonical le.utah.gov static page)
  const m = String(num).match(/^([A-Z]+)(\d+)$/);
  const padded = m ? m[1] + m[2].padStart(4, '0') : num;
  return `https://le.utah.gov/~2025/bills/static/${padded}.html`;
};

// Floor-video Spotlight item (member's own presentation of a signed bill).
// `ts` is the verified seek offset for the member's own marker segment.
function vidItem({ issueKey, headline, facts, why, billNum, ts, day, chamber, marker, tags }) {
  const item = {
    date: '2025', impact: 'positive', category: 'voting', issueKey,
    sourceType: 'official_floor_video',
    tags: tags || ['Notable Actions', 'Public Statements'],
    headline, facts, why,
    source: { label: `${billNum} (2025) — official bill record`, url: billUrl(billNum) },
    media: {
      type: 'video', url: floor(marker),
      label: `Official Utah ${chamber} floor video — Day ${day}, 2025 General Session`,
    },
  };
  if (ts) item.media.timestamp = ts;
  return item;
}

// ── The plan: Firestore id → [spotlight items] ──────────────────────────────
// Every bill below is a 2025 GS bill chief-sponsored by THIS member, signed into
// law, and NOT already used in a prior wave. Facts are drawn from the bill's own
// highlightedProvisions; timestamps are the verified per-marker seek offsets.
const PLAN = {

  // ===== Tiara Auxier — House District 4 (Morgan/Rich/Summit, rural) =========
  tiara_auxier: [
    vidItem({ issueKey: 'justice_balance', billNum: 'HB74', ts: '41:41', day: 9, chamber: 'House', marker: 128841,
      headline: 'Presented her Foreign Judgment interest-rate bill on the House floor (video at 41:41)',
      facts: "Auxier chief-sponsored HB74 (2025), Foreign Judgment Amendments, which provides that the postjudgment interest rate for foreign judgments filed in Utah is set at the rate established under Utah law. The official Utah House floor video opens to her presentation on Day 9 of the 2025 session at 41:41; the bill was signed into law.",
      why: "Aligning how out-of-state judgments accrue interest once they are domesticated in Utah is a recorded, enacted action in this first-session member's own words — a concrete civil-courts fix on a previously near-empty record." }),
    vidItem({ issueKey: 'property_tax', billNum: 'HB110', ts: '1:39:58', day: 35, chamber: 'House', marker: 130579, tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried her Combined Basic Tax Rate Reduction on the House floor (video at 1:39:58)',
      facts: "Auxier chief-sponsored HB110 (2025), Combined Basic Tax Rate Reduction, which repeals the WPU value rate from the combination of property-tax rates that fund public education, provides that the repeal does not affect ongoing appropriations to the Teacher and Student Success Program, and coordinates with S.B. 37. The official Utah House floor video opens to her presentation on Day 35 of the 2025 session at 1:39:58; the bill was signed into law.",
      why: "Lowering the property-tax rate that funds education while protecting teacher-pay appropriations is a recorded, enacted action in her own words — a second, distinct issue now anchoring a freshman profile." }),
  ],

  // ===== Jill Koford — House District 10 (Weber) =============================
  jill_koford: [
    vidItem({ issueKey: 'public_schools', billNum: 'HB333', ts: '33:11', day: 24, chamber: 'House', marker: 129693,
      headline: 'Presented her Medications in Schools bill allowing epinephrine nasal spray (video at 33:11)',
      facts: "Koford chief-sponsored HB333 (2025), Medications in Schools Amendments, which allows a student to possess or self-administer epinephrine nasal spray at school in certain circumstances and amends the related defined terms. The official Utah House floor video opens to her presentation on Day 24 of the 2025 session at 33:11; the bill was signed into law.",
      why: "Letting students carry and use a life-saving allergy treatment at school is a recorded, enacted action in this freshman member's own words on a concrete student-safety issue." }),
    vidItem({ issueKey: 'property_tax', billNum: 'HB428', ts: '1:14:12', day: 36, chamber: 'House', marker: 130758, tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried her Property Tax Changes bill on the House floor (video at 1:14:12)',
      facts: "Koford chief-sponsored HB428 (2025), Property Tax Changes, which requires the minimum basic tax rate imposed by school districts to be certified by consensus between the State Tax Commission, the Governor's Office of Planning and Budget, and the Office of the Legislative Fiscal Analyst, and allows money in the Public Education Economic Stabilization Restricted Account to fund certain shortfalls in the basic school program. The official Utah House floor video opens to her presentation on Day 36 of the 2025 session at 1:14:12; the bill was signed into law.",
      why: "Setting a consensus process for the school property-tax rate and creating a backstop for education-funding shortfalls is a recorded, enacted action in her own words — a second issue on a thin profile." }),
  ],

  // ===== Nicholeen P. Peck — House District 28 (Tooele) =====================
  nicholeen_p_peck: [
    vidItem({ issueKey: 'pro_life', billNum: 'HB233', ts: '42:57', day: 31, chamber: 'House', marker: 130311,
      headline: 'Presented her School Curriculum bill on the House floor (video at 42:57)',
      facts: "Peck chief-sponsored HB233 (2025), School Curriculum Amendments, which prohibits a local education agency from allowing entities that perform elective abortions to provide health-related instruction or materials in public schools. The official Utah House floor video opens to her presentation on Day 31 of the 2025 session at 42:57; the bill was signed into law.",
      why: "Restricting which outside entities may deliver health instruction in public schools is a recorded, enacted action in her own words that complements her earlier homeschool bill on this thin profile." }),
  ],

  // ===== Jake Fitisemanu — House District 30 (Salt Lake) ====================
  // A public-health professional; this lands on his signature healthcare issue.
  jake_fitisemanu: [
    vidItem({ issueKey: 'healthcare', billNum: 'HB258', ts: '55:20', day: 21, chamber: 'House', marker: 129495,
      headline: 'Presented his Medicare Supplement Insurance bill on the House floor (video at 55:20)',
      facts: "Fitisemanu chief-sponsored HB258 (2025), Medicare Supplement Insurance Amendments, which allows enrollees of Medicare supplement plans to select comparable or lower-tier plans and bars an issuer from denying coverage based on medical underwriting when an enrollee selects a comparable or lower-tier plan. The official Utah House floor video opens to his presentation on Day 21 of the 2025 session at 55:20; the bill was signed into law.",
      why: "Letting seniors move to a comparable or cheaper Medicare supplement plan without being underwritten out of coverage is a recorded, enacted action in his own words on the health-policy issue his profile leads with." }),
  ],

  // ===== Verona Mauga — House District 31 (Salt Lake) — three issues =========
  verona_mauga: [
    vidItem({ issueKey: 'veterans', billNum: 'HB248', day: 24, chamber: 'House', marker: 129726,
      headline: 'Presented her Veteran Protections bill on the House floor',
      facts: "Mauga chief-sponsored HB248 (2025), Veteran Protections Amendments, which makes the Division of Consumer Protection responsible for enforcing civil penalties against individuals who unlawfully provide veterans with assistance in obtaining VA benefits and clarifies what conduct is not permitted in providing that assistance. The official Utah House floor video opens to her presentation on Day 24 of the 2025 session (marker 129726); the bill was signed into law.",
      why: "Shielding veterans from unlawful, predatory 'benefits assistance' is a recorded, enacted action in this freshman member's own words — the first of three distinct issues on her new record." }),
    vidItem({ issueKey: 'transit', billNum: 'HB290', ts: '1:24:17', day: 22, chamber: 'House', marker: 129598, tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried her Bicycle Lane Safety bill on the House floor (video at 1:24:17)',
      facts: "Mauga chief-sponsored HB290 (2025), Bicycle Lane Safety Amendments, which clarifies when motor vehicles may be in a bicycle lane and restricts obstructing a bicycle lane. The official Utah House floor video opens to her presentation on Day 22 of the 2025 session at 1:24:17; the bill was signed into law.",
      why: "Tightening when vehicles may enter or block a bike lane is a recorded, enacted action in her own words on street and active-transportation safety — a second issue on her record." }),
    vidItem({ issueKey: 'back_police', billNum: 'HB358', ts: '1:06:47', day: 28, chamber: 'House', marker: 129865, tags: ['Notable Actions', 'Consistency'],
      headline: 'Presented her Criminal Sexual Conduct bill creating new offenses (video at 1:06:47)',
      facts: "Mauga chief-sponsored HB358 (2025), Criminal Sexual Conduct Amendments, which creates the offenses of custodial solicitation of sexually explicit conduct from a person in custody and unlawful sexual activity with a child or minor using virtual reality, and provides criminal penalties. The official Utah House floor video opens to her presentation on Day 28 of the 2025 session at 1:06:47; the bill was signed into law.",
      why: "Writing new criminal offenses to close gaps around custodial solicitation and virtual-reality exploitation of minors is a recorded, enacted action in her own words — a third distinct issue on a once-thin profile." }),
  ],

  // ===== Rosalba Dominguez — House District 35 (Salt Lake) ===================
  rosalba_dominguez: [
    vidItem({ issueKey: 'family_support', billNum: 'HB547', ts: '1:40:15', day: 41, chamber: 'House', marker: 131211,
      headline: 'Presented her Diaper Program bill on the House floor (video at 1:40:15)',
      facts: "Dominguez chief-sponsored HB547 (2025), Diaper Program Amendments, which requires the Department of Health and Human Services to award grants to nonprofits that provide free diapering supplies, creates the Diapering Supplies Fund, and lets individual taxpayers contribute to that fund on their tax returns. The official Utah House floor video opens to her presentation on Day 41 of the 2025 session at 1:40:15; the bill was signed into law.",
      why: "Standing up a state grant program and dedicated fund for free diapers for low-income families is a recorded, enacted action in this freshman member's own words — the first substantive item on her record." }),
  ],

  // ===== Clinton Okerlund — House District 42 (Salt Lake) ===================
  clinton_okerlund: [
    vidItem({ issueKey: 'property_tax', billNum: 'HB272', ts: '1:23:44', day: 22, chamber: 'House', marker: 129597,
      headline: 'Presented his Vehicle Assessment bill on the House floor (video at 1:23:44)',
      facts: "Okerlund chief-sponsored HB272 (2025), Vehicle Assessment Amendments, which modifies the weight at which a motor vehicle qualifies for the statewide uniform fee in lieu of property tax and modifies weight limits for vehicle registrations. The official Utah House floor video opens to his presentation on Day 22 of the 2025 session at 1:23:44; the bill was signed into law.",
      why: "Adjusting which vehicles pay the flat uniform fee instead of property tax is a recorded, enacted action in this freshman member's own words on tax administration — the first item on his record." }),
    vidItem({ issueKey: 'lands_balance', billNum: 'HB490', ts: '1:30:47', day: 37, chamber: 'House', marker: 130887, tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried his State Parks Modifications bill on the House floor (video at 1:30:47)',
      facts: "Okerlund chief-sponsored HB490 (2025), State Parks Modifications, which directs the Division of State Parks to operate as far as possible from the fees and charges it collects, requires the director to implement a comprehensive long-term plan for state-park use, grants the division rulemaking authority to administer the parks system, and renames the State Parks Restricted Account. The official Utah House floor video opens to his presentation on Day 37 of the 2025 session at 1:30:47; the bill was signed into law.",
      why: "Putting Utah's state parks on a more self-funding footing and requiring a long-term use plan is a recorded, enacted action in his own words — a second issue on a new profile." }),
  ],

  // ===== Tracy Miller — House District 45 (Salt Lake) — education record =====
  tracy_miller: [
    vidItem({ issueKey: 'public_schools', billNum: 'HB76', ts: '25:11', day: 25, chamber: 'House', marker: 129765,
      headline: 'Presented her Public Education Revisions bill on the House floor (video at 25:11)',
      facts: "Miller chief-sponsored HB76 (2025), Public Education Revisions, which lets a local education agency with a carry-forward balance increase what it provides teachers under the teacher-salary-supplement programs, adds the Utah Schools for the Deaf and the Blind as an eligible LEA, raises the share of early-literacy software funding usable for administration and an independent evaluator, and adjusts kindergarten-enrollment and early-learning-plan rules. The official Utah House floor video opens to her presentation on Day 25 of the 2025 session at 25:11; the bill was signed into law.",
      why: "Expanding teacher-pay supplements and smoothing kindergarten and early-literacy rules is a recorded, enacted action in her own words on the public-education issue her profile centers on." }),
    vidItem({ issueKey: 'edu_balance', billNum: 'HB184', ts: '34:32', day: 21, chamber: 'House', marker: 129483, tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried her School Trust Land Amendments on the House floor (video at 34:32)',
      facts: "Miller chief-sponsored HB184 (2025), School Trust Land Amendments, which clarifies School LAND Trust action plans and their implementation, adds Open and Public Meetings Act training, expands who must be trained on the program, refines the school-compliance review process, and adds responsibilities for the state superintendent. The official Utah House floor video opens to her presentation on Day 21 of the 2025 session at 34:32; the bill was signed into law.",
      why: "Tightening governance, training, and compliance for the trust-land money that flows to local schools is a recorded, enacted action in her own words on education accountability — a second education issue on her record." }),
    vidItem({ issueKey: 'school_choice', billNum: 'HB268', ts: '52:09', day: 37, chamber: 'House', marker: 130867, tags: ['Notable Actions', 'Consistency'],
      headline: 'Presented her Nonresident Online School bill on the House floor (video at 52:09)',
      facts: "Miller chief-sponsored HB268 (2025), Nonresident Online School Amendments, which modifies the payments a resident school district makes to a nonresident district when a student enrolls online across district lines. The official Utah House floor video opens to her presentation on Day 37 of the 2025 session at 52:09; the bill was signed into law.",
      why: "Setting how money follows a student who enrolls in an online school outside their home district is a recorded, enacted action in her own words on cross-district school options — a third issue on her record." }),
  ],

  // ===== Calvin Roberts — House District 46 (Salt Lake) =====================
  calvin_roberts: [
    vidItem({ issueKey: 'gun_rights', billNum: 'HB94', ts: '44:30', day: 18, chamber: 'House', marker: 129364,
      headline: 'Presented his Dangerous Weapons exemptions bill on the House floor (video at 44:30)',
      facts: "Roberts chief-sponsored HB94 (2025), Exemptions from Dangerous Weapons Provisions, which exempts certain individuals performing official duties and farm custom-slaughter licensees acting under statute from specified dangerous-weapons provisions. The official Utah House floor video opens to his presentation on Day 18 of the 2025 session at 44:30; the bill was signed into law.",
      why: "Carving narrow, defined exemptions to the dangerous-weapons statute for official duties and licensed farm slaughter is a recorded, enacted action in this freshman member's own words — the first item on his record." }),
    vidItem({ issueKey: 'transit', billNum: 'HB471', ts: '15:39', day: 31, chamber: 'House', marker: 130368, tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried his Transportation Procurement bill on the House floor (video at 15:39)',
      facts: "Roberts chief-sponsored HB471 (2025), Transportation Procurement Amendments, which authorizes the Department of Transportation to use cooperative purchasing agreements for the procurement of transit vehicles. The official Utah House floor video opens to his presentation on Day 31 of the 2025 session at 15:39; the bill was signed into law.",
      why: "Letting the state buy transit vehicles through cooperative purchasing is a recorded, enacted action in his own words on transportation cost and delivery — a second issue on a new profile." }),
  ],

  // ===== Doug Fiefia — House District 48 (Salt Lake) — tech + family ========
  doug_fiefia: [
    vidItem({ issueKey: 'family_support', billNum: 'HB302', ts: '1:16:37', day: 25, chamber: 'House', marker: 129800,
      headline: 'Presented his Minors in State Custody benefits bill on the House floor (video at 1:16:37)',
      facts: "Fiefia chief-sponsored HB302 (2025), Minors in State Custody Amendments, which requires the Department of Health and Human Services to seek a Medicaid waiver so that minors in its custody who receive federal benefits keep Medicaid eligibility, to evaluate and apply for federal benefits on their behalf, to account and report on those benefits, and to offer financial-literacy training to a minor who received benefits in custody. The official Utah House floor video opens to his presentation on Day 25 of the 2025 session at 1:16:37; the bill was signed into law.",
      why: "Protecting the federal benefits and Medicaid eligibility of foster youth — and teaching them to manage that money — is a recorded, enacted action in this freshman member's own words." }),
    vidItem({ issueKey: 'privacy_rights', billNum: 'HB418', ts: '1:22:32', day: 31, chamber: 'House', marker: 130270, tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried his social-media Data Sharing bill on the House floor (video at 1:22:32)',
      facts: "Fiefia chief-sponsored HB418 (2025), Data Sharing Amendments, which sets legislative findings on social-media data control and competition, amends consumer data rights for social-media data, requires social-media companies to implement data-interoperability interfaces, sets requirements for data sharing between services, and grants the Division of Consumer Protection rulemaking and enforcement authority with civil penalties. The official Utah House floor video opens to his presentation on Day 31 of the 2025 session at 1:22:32; the bill was signed into law.",
      why: "Giving users more control and portability over their social-media data is a recorded, enacted action in his own words on technology and consumer privacy — a second issue on his record." }),
  ],

  // ===== Kristen Chevrier — House District 54 (Utah County) =================
  kristen_chevrier: [
    vidItem({ issueKey: 'public_schools', billNum: 'HB402', ts: '1:39:05', day: 37, chamber: 'House', marker: 130946,
      headline: 'Presented her Food Additives in Schools bill on the House floor (video at 1:39:05)',
      facts: "Chevrier chief-sponsored HB402 (2025), Foods Additives in Schools, which prohibits consumable items containing certain food additives from being provided in a public school under specified circumstances, and provides exceptions. The official Utah House floor video opens to her presentation on Day 37 of the 2025 session at 1:39:05; the bill was signed into law.",
      why: "Keeping defined food additives out of what schools serve students is a recorded, enacted action in this freshman member's own words on school nutrition." }),
    vidItem({ issueKey: 'family_support', billNum: 'HB403', ts: '38:03', day: 37, chamber: 'House', marker: 130858, tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried her SNAP Funds bill on the House floor (video at 38:03)',
      facts: "Chevrier chief-sponsored HB403 (2025), SNAP Funds Amendments, which requires the Department of Workforce Services to seek a federal waiver regarding the use of SNAP benefits for certain foods, to submit that waiver before July 1, 2025 and implement it on approval, and to reapply if it is denied. The official Utah House floor video opens to her presentation on Day 37 of the 2025 session at 38:03; the bill was signed into law.",
      why: "Directing the state to pursue a federal waiver on what SNAP food assistance can buy is a recorded, enacted action in her own words — a second issue on a new profile." }),
  ],

  // ===== David Shallenberger — House District 58 (Utah County) ==============
  david_shallenberger: [
    vidItem({ issueKey: 'back_police', billNum: 'HB150', ts: '12:36', day: 14, chamber: 'House', marker: 129013,
      headline: 'Presented his Emergency Communications bill on the House floor (video at 12:36)',
      facts: "Shallenberger chief-sponsored HB150 (2025), Emergency Communications Modifications, which bars nonvoting board members from closed board meetings, changes the comprehensive strategic-plan review cycle from annual to every three years, requires periodic review of the statewide CAD-to-CAD protocol, and removes the rule that every public-safety answering point in a county must qualify before any one can receive funds. The official Utah House floor video opens to his presentation on Day 14 of the 2025 session at 12:36; the bill was signed into law.",
      why: "Modernizing how Utah's 911 dispatch system is governed and funded is a recorded, enacted action in this freshman member's own words on public-safety infrastructure." }),
    vidItem({ issueKey: 'rural_ag', billNum: 'HB243', ts: '16:12', day: 30, chamber: 'House', marker: 130157, tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried his Agricultural Water Optimization bill on the House floor (video at 16:12)',
      facts: "Shallenberger chief-sponsored HB243 (2025), Agricultural Water Optimization Amendments, which lets the Agricultural Water Optimization Committee use certain money to fund research and modifies eligibility requirements for agricultural water-optimization grants. The official Utah House floor video opens to his presentation on Day 30 of the 2025 session at 16:12; the bill was signed into law.",
      why: "Funding research and refocusing grants that help farms use water more efficiently is a recorded, enacted action in his own words on agriculture and water — a second issue on his record." }),
    vidItem({ issueKey: 'housing_support', billNum: 'HB480', ts: '17:49', day: 35, chamber: 'House', marker: 130598, tags: ['Notable Actions', 'Consistency'],
      headline: 'Presented his Landlord Communication bill on the House floor (video at 17:49)',
      facts: "Shallenberger chief-sponsored HB480 (2025), Landlord Communication Amendments, which lets an owner return a deposit, prepaid rent, and an itemized-deductions notice electronically, amends the form a renter uses to request that return, conditions certain lease-amount awards on a failure to pay, and provides exceptions to the time limit for a renter to vacate after an order of restitution. The official Utah House floor video opens to his presentation on Day 35 of the 2025 session at 17:49; the bill was signed into law.",
      why: "Setting clearer, modern rules for deposit returns and landlord-tenant communication is a recorded, enacted action in his own words on housing — a third issue on his record." }),
  ],

  // ===== Troy Shelley — House District 66 (Juab/Sanpete, rural) =============
  troy_shelley: [
    vidItem({ issueKey: 'lands_local', billNum: 'HB103', ts: '1:22:25', day: 34, chamber: 'House', marker: 130425,
      headline: 'Presented his State Land Access Road bill on the House floor (video at 1:22:25)',
      facts: "Shelley chief-sponsored HB103 (2025), State Land Access Road Amendments, which directs the Public Lands Policy Coordinating Office and the School and Institutional Trust Lands Administration to identify and record certain roads on state and trust lands, provides that the Division of Wildlife Resources may not permanently close such a road without the consent of the county's legislative body, and addresses abandonment of class D roads and R.S. 2477 rights-of-way. The official Utah House floor video opens to his presentation on Day 34 of the 2025 session at 1:22:25; the bill was signed into law.",
      why: "Protecting county access roads across state and trust lands — and requiring county consent before closures — is a recorded, enacted action in this rural member's own words on public-lands access." }),
    vidItem({ issueKey: 'lands_energy', billNum: 'HB411', ts: '22:16', day: 38, chamber: 'House', marker: 131057, tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried his Public Asset Ownership bill on the House floor (video at 22:16)',
      facts: "Shelley chief-sponsored HB411 (2025), Public Asset Ownership Amendments, which requires a state entity selling or exchanging an environmental commodity to report a digital identification number to the Office of Energy Development, declares that an environmental commodity created with state funds is state property in proportion to the funds contributed, and sets duties for the state treasurer in managing those commodities. The official Utah House floor video opens to his presentation on Day 38 of the 2025 session at 22:16; the bill was signed into law.",
      why: "Defining public ownership and tracking of state-created environmental commodities is a recorded, enacted action in his own words on energy and resource policy — a second issue on his record." }),
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
console.log(`legislators touched   : ${totalLeg}`);
console.log(`new spotlight items   : ${totalNew}`);
console.log(`  official floor video : ${totalNew}`);
console.log('issue tally :', Object.entries(issueTally).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}=${n}`).join(', '));
console.log(APPLY ? '\nAPPLIED to Firestore.' : '\nDRY RUN — re-run with --apply to write.');
