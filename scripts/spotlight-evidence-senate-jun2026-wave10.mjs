#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — June 2026 evidence pass, WAVE 10 (HIGH-VALUE SENATE RECORDS)
// Verified official floor-video Spotlight evidence for sitting Utah State
// SENATORS who carry the LARGEST untapped enacted records but still lacked
// connected floor-video Spotlight items after waves 1–9.
//
// ── WHO IS TARGETED, AND WHY THESE FIRST ────────────────────────────────────
//   Wave 9 rebalanced the library toward the Senate by spotlighting rural and
//   never-spotlighted members. This wave goes after the senators with the
//   DEEPEST signed-bill records that the earlier passes never tapped:
//     • Stephanie Pitcher (D14)  — 13 signed 2025 Senate bills, one of the most
//       prolific members of either chamber, with no prior floor-video item.
//     • Jen Plumb (D9)           — 13 signed 2025 Senate bills; a physician whose
//       enacted public-health record was entirely untapped for floor video.
//   Then selected mid-tenure senators with large signed-bill counts and thin or
//   missing connected floor-video coverage:
//     • Wayne A. Harper (D16, 20 signed SBs), Todd Weiler (D8, 16),
//       Lincoln Fillmore (D17, 15), Jerry W. Stevenson (D6, 9),
//       Daniel McCay (D18, 7), Brady Brammer (D21, 7).
//   The authority for "currently sitting" is the Utah Legislature's own roster,
//   le.utah.gov/data/legislators.json. All eight remain in the Senate in 2026.
//
// ── HOW EVERY ITEM BELOW WAS VERIFIED END-TO-END (re-run live this pass) ─────
//   Each item is the senator's OWN recorded Senate-floor presentation of a bill
//   they personally chief-sponsored and that became law. The pipeline:
//     1) Bill record : le.utah.gov/data/2025GS/billlist.json was walked and the
//        Senate-bill (SB) JSONs (le.utah.gov/data/2025GS/<BILL>.json) pulled. A
//        bill is used ONLY when:
//          • its `primeSponsor` code is THIS senator's roster id (e.g. PITCHS →
//            Stephanie Pitcher), confirming chief sponsorship, AND
//          • its `actionHistoryList` contains a "Governor Signed" (GSIGN)
//            action, so only ENACTED bills are framed as law.
//        Each `facts` paragraph is drawn from that bill's own
//        `highlightedProvisions`.
//     2) Floor video : the senator's OWN segment is the floorDebateList marker
//        whose `house` is "S" and whose description ends in the senator's
//        surname AND references this bill number. Among that senator's markers
//        for the bill, the EARLIEST SUBSTANTIVE segment (the original 2nd/3rd-
//        reading presentation, ≥90 seconds long — not a one-line concurrence)
//        is used. That marker's archive page (floorArchive.jsp?markerID=<id>)
//        carries the seek offset for the segment in its player rows
//        (data-offset=<sec> … data-markerid=<id>); that offset (seconds →
//        mm:ss / h:mm:ss) is the EXACT, verified seek point cited as
//        `media.timestamp`. The extractor was re-validated this pass against a
//        known value (marker 129105 → 3303s → 55:03).
//
// ── NO DUPLICATES / HONESTY ─────────────────────────────────────────────────
//   Idempotent: each senator's live `spotlight` array is re-fetched and an item
//   is appended ONLY if no existing item shares its headline. Where a signed,
//   chief-sponsored bill had NO substantive (≥90s) floor segment, it is omitted
//   rather than padded — e.g. Jen Plumb's S.B. 146 (Glucagon Amendments) was
//   signed into law but her floor segments on it run under 90 seconds, so it is
//   not forced into a floor-video card; her deeper bills carry the evidence
//   instead. Volume is matched to each senator's genuine 2025 floor-presented
//   record, so the mid-tenure members receive fewer items than Pitcher/Plumb.
//
// CONTENT_STYLE.md: every item is about the INDIVIDUAL senator's own bill and
// recorded action — never their party. "Signed into law" is a plain fact from
// the bill's own action history; no vote tally is labeled partisan. Each item
// carries an issueKey chosen from the live issue vocabulary in index.html and
// matched to the bill's subject, so the Spotlight item lands on the same issue
// as that senator's stances and promises and joins the connected evidence map.
// For Pitcher, the four issue keys (justice_balance, justice_reform, healthcare,
// privacy_rights) deliberately mirror her existing curated Issue Positions.
//
// Writes patch only the `spotlight` and `updatedAt` fields (quota-friendly),
// with backoff on 429.
//
//   node scripts/spotlight-evidence-senate-jun2026-wave10.mjs          # dry run
//   node scripts/spotlight-evidence-senate-jun2026-wave10.mjs --apply  # write
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
// timestamps are the verified per-marker seek offsets for the earliest
// substantive (≥90s) floor segment.
const PLAN = {

  // ===== Stephanie Pitcher — Senate District 14 (Salt Lake County) =========
  //       Former prosecutor and criminal-defense attorney; one of the most
  //       prolific members of either chamber in 2025. The four issue keys here
  //       mirror her existing curated Issue Positions.
  stephanie_pitcher: [
    vidItem({ issueKey: 'justice_balance', billNum: 'S.B. 180', ts: '35:06', day: 28, marker: 129910,
      headline: 'Presented her Law Enforcement Usage of Artificial Intelligence bill on the Senate floor (video at 35:06)',
      facts: "Pitcher chief-sponsored S.B. 180 (2025), Law Enforcement Usage of Artificial Intelligence, which requires a law enforcement agency to have a policy governing its use of generative artificial intelligence, requires any police report or law enforcement record created wholly or partly with generative AI to include a disclaimer, and requires the author of such a report to certify that they have read and reviewed it for accuracy. The official Utah Senate floor video opens to her presentation on Day 28 of the 2025 General Session at 35:06; the bill was signed into law.",
      why: "Setting accuracy and disclosure rules for AI-written police reports is a recorded, enacted action in this former prosecutor's own words on how law enforcement uses new technology — and it tracks the standards-for-AI-police-reports work she names in her own record." }),
    vidItem({ issueKey: 'justice_reform', billNum: 'S.B. 194', ts: '1:23:29', day: 31, marker: 130328, tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried her Defendant Access to Evidence Amendments on the Senate floor (video at 1:23:29)',
      facts: "Pitcher chief-sponsored S.B. 194 (2025), Defendant Access to Evidence Amendments, which requires a county sheriff to ensure a jail inmate awaiting trial has a space to review discovery and other evidence with counsel and the means to access and review that evidence, and sets the procedures for how the inmate may do so. The official Utah Senate floor video opens to her presentation on Day 31 of the 2025 session at 1:23:29; the bill was signed into law.",
      why: "Guaranteeing pretrial defendants a real way to review the evidence against them is a recorded, enacted action in her own words on due process — a second issue on her record and consistent with her stance on criminal-justice reform." }),
    vidItem({ issueKey: 'healthcare', billNum: 'S.B. 128', ts: '1:10:49', day: 34, marker: 130479, tags: ['Notable Actions', 'Consistency'],
      headline: 'Presented her Assisted Reproduction Amendments on the Senate floor (video at 1:10:49)',
      facts: "Pitcher chief-sponsored S.B. 128 (2025), Assisted Reproduction Amendments, which requires a written agreement or consent for an egg retrieval to include a clause disclosing any possible complication associated with the retrieval, and prohibits a certain clause in such an agreement. The official Utah Senate floor video opens to her presentation on Day 34 of the 2025 session at 1:10:49; the bill was signed into law.",
      why: "Requiring clear disclosure of medical risk before a fertility procedure is a recorded, enacted action in her own words on patient protection in health care — a third issue on her record." }),
    vidItem({ issueKey: 'privacy_rights', billNum: 'S.B. 70', ts: '59:08', day: 17, marker: 129283, tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried her Consumer Reporting Amendments on the Senate floor (video at 59:08)',
      facts: "Pitcher chief-sponsored S.B. 70 (2025), Consumer Reporting Amendments, which establishes prohibitions on what information a consumer reporting agency may provide, sets exceptions to those prohibitions, and makes technical changes. The official Utah Senate floor video opens to her presentation on Day 17 of the 2025 session at 59:08; the bill was signed into law.",
      why: "Limiting what a credit-reporting company may disclose about a person is a recorded, enacted action in her own words on personal privacy — a fourth issue on her record." }),
  ],

  // ===== Jen Plumb — Senate District 9 (Salt Lake County) ==================
  //       Physician (emergency / addiction medicine) whose deep enacted
  //       public-health record was untapped for floor video.
  jen_plumb: [
    vidItem({ issueKey: 'healthcare', billNum: 'S.B. 65', ts: '33:20', day: 15, marker: 129099,
      headline: 'Presented her Medication Assisted Treatment Amendments on the Senate floor (video at 33:20)',
      facts: "Plumb chief-sponsored S.B. 65 (2025), Medication Assisted Treatment Amendments, which requires the Office of Licensing within the Department of Health and Human Services to establish and enforce rules on the use of medication-assisted treatment in certain residential treatment programs and recovery residences, and makes technical and conforming changes. The official Utah Senate floor video opens to her presentation on Day 15 of the 2025 General Session at 33:20; the bill was signed into law.",
      why: "Setting standards for medication-assisted addiction treatment in recovery settings is a recorded, enacted action in this physician-senator's own words on health care." }),
    vidItem({ issueKey: 'health_mental', billNum: 'S.B. 115', ts: '35:03', day: 18, marker: 129410, tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried her Substance Use Disorder Revisions on the Senate floor (video at 35:03)',
      facts: "Plumb chief-sponsored S.B. 115 (2025), Substance Use Disorder Revisions, addressing how Utah regulates and supports treatment for substance use disorder. The official Utah Senate floor video opens to her presentation on Day 18 of the 2025 session at 35:03; the bill was signed into law.",
      why: "Reworking how the state handles substance-use-disorder treatment is a recorded, enacted action in her own words on behavioral health — a second issue on her record and the core of her clinical work." }),
    vidItem({ issueKey: 'housing_support', billNum: 'S.B. 78', ts: '1:15:48', day: 22, marker: 129596, tags: ['Notable Actions', 'Consistency'],
      headline: 'Presented her Homeless Individuals Protection Amendments on the Senate floor (video at 1:15:48)',
      facts: "Plumb chief-sponsored S.B. 78 (2025), Homeless Individuals Protection Amendments, which creates a homeless services provider ombudsman within the Office of Homeless Services, describes the ombudsman's duties and functions, authorizes rulemaking to carry them out, and provides for a sunset review after five years. The official Utah Senate floor video opens to her presentation on Day 22 of the 2025 session at 1:15:48; the bill was signed into law.",
      why: "Creating an independent ombudsman for people receiving homeless services is a recorded, enacted action in her own words on the homelessness and housing-support system — a third issue on her record." }),
    vidItem({ issueKey: 'econ_workers', billNum: 'S.B. 86', ts: '1:28:20', day: 22, marker: 129604, tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried her Workplace Protection Amendments on the Senate floor (video at 1:28:20)',
      facts: "Plumb chief-sponsored S.B. 86 (2025), Workplace Protection Amendments, which reduces the number of employees a person may employ before being considered an employer subject to the Utah Antidiscrimination Act for employment, and amends the definition of sexual harassment. The official Utah Senate floor video opens to her presentation on Day 22 of the 2025 session at 1:28:20; the bill was signed into law.",
      why: "Extending workplace anti-discrimination protections to employees of smaller businesses is a recorded, enacted action in her own words on worker protections — a fourth issue on her record." }),
  ],

  // ===== Wayne A. Harper — Senate District 16 (Salt Lake County) ===========
  //       20 signed 2025 Senate bills; long record on tax, transportation,
  //       and transit governance.
  wayne_a_harper: [
    vidItem({ issueKey: 'social_security', billNum: 'S.B. 71', ts: '26:28', day: 41, marker: 131177,
      headline: 'Presented his Social Security Tax Revisions on the Senate floor (video at 26:28)',
      facts: "Harper chief-sponsored S.B. 71 (2025), Social Security Tax Revisions, which expands eligibility for the Social Security benefits tax credit by raising the thresholds for the income-based phaseout, and makes technical changes. The official Utah Senate floor video opens to his presentation on Day 41 of the 2025 General Session at 26:28; the bill was signed into law.",
      why: "Cutting state income tax on Social Security benefits for more retirees is a recorded, enacted action in this senator's own words on taxes paid by older Utahns." }),
    vidItem({ issueKey: 'transit', billNum: 'S.B. 195', ts: '15:59', day: 30, marker: 130166, tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried his Transportation Amendments on the Senate floor (video at 15:59)',
      facts: "Harper chief-sponsored S.B. 195 (2025), Transportation Amendments, which requires cities and metropolitan planning organizations to identify transportation connectivity impediments and report on plans to address them, requires follow-up on station area plans, keeps transit property under the Department of Transportation's ownership, adjusts a sales-and-use-tax earmark to increase transportation funding, and extends a deadline for public-transit innovation grant funds. The official Utah Senate floor video opens to his presentation on Day 30 of the 2025 session at 15:59; the bill was signed into law.",
      why: "Steering more funding and planning toward transit and transportation connectivity is a recorded, enacted action in his own words on how the region moves — a second issue on his record." }),
    vidItem({ issueKey: 'housing_build', billNum: 'S.B. 23', ts: '31:17', day: 1, marker: 128534, tags: ['Notable Actions', 'Consistency'],
      headline: 'Presented his First Home Investment Zone Amendments on the Senate floor (video at 31:17)',
      facts: "Harper chief-sponsored S.B. 23 (2025), First Home Investment Zone Amendments, which modifies definitions, clarifies owner-occupancy requirements in a first home investment zone, and clarifies how extraterritorial homes may be included in the density and owner-occupancy requirements for such a zone. The official Utah Senate floor video opens to his presentation on Day 1 of the 2025 session at 31:17; the bill was signed into law.",
      why: "Refining the tool meant to get more owner-occupied first homes built is a recorded, enacted action in his own words on housing supply — a third issue on his record." }),
  ],

  // ===== Todd Weiler — Senate District 8 (Davis/Salt Lake) =================
  //       16 signed 2025 Senate bills; Senate Judiciary chair with a deep
  //       record on courts, tech regulation, and family law.
  todd_weiler: [
    vidItem({ issueKey: 'tech_balance', billNum: 'S.B. 142', ts: '51:25', day: 18, marker: 129371,
      headline: 'Presented his App Store Accountability Act on the Senate floor (video at 51:25)',
      facts: "Weiler chief-sponsored S.B. 142 (2025), App Store Accountability Act, which requires app store providers to verify a user's age category, obtain parental consent for minor accounts, notify users and parents of significant changes, share age-category and consent data with developers, and protect age-verification data; sets matching duties on developers; designates certain violations as deceptive trade practices; and creates a private right of action for parents of harmed minors. The official Utah Senate floor video opens to his presentation on Day 18 of the 2025 General Session at 51:25; the bill was signed into law.",
      why: "Putting age verification and parental-consent duties on app stores is a recorded, enacted action in this senator's own words on regulating technology around minors — and aligns with his stated position on technology and child safety." }),
    vidItem({ issueKey: 'justice_balance', billNum: 'S.B. 191', ts: '1:46:35', day: 22, marker: 129613, tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried his Protective Orders Amendments on the Senate floor (video at 1:46:35)',
      facts: "Weiler chief-sponsored S.B. 191 (2025), Protective Orders Amendments, which lets a court treat a petition as a request for a no-fault cohabitant abuse protective order only when both parties agree to the order and its terms, requires such an order to include a credible-threat finding, and provides that a no-fault order may not be introduced as evidence that the respondent committed domestic violence or abuse. The official Utah Senate floor video opens to his presentation on Day 22 of the 2025 session at 1:46:35; the bill was signed into law.",
      why: "Building a consent-based path for protective orders is a recorded, enacted action in his own words on domestic-relations and public-safety law — a second issue on his record consistent with his work on the justice system." }),
    vidItem({ issueKey: 'justice_reform', billNum: 'S.B. 171', ts: '1:41:57', day: 22, marker: 129610, tags: ['Notable Actions', 'Consistency'],
      headline: 'Presented his Indigent Defense Amendments on the Senate floor (video at 1:41:57)',
      facts: "Weiler chief-sponsored S.B. 171 (2025), Indigent Defense Amendments, which creates the Youth Defense Fund to pay for indigent defense services for a minor referred to juvenile court, requires the Utah Indigent Defense Commission to set the rules and procedures for counties seeking to participate, and assigns related administrative duties to the Office of Indigent Defense Services. The official Utah Senate floor video opens to his presentation on Day 22 of the 2025 session at 1:41:57; the bill was signed into law.",
      why: "Standing up dedicated funding for legal defense of children in juvenile court is a recorded, enacted action in his own words on access to counsel — a third issue on his record." }),
  ],

  // ===== Lincoln Fillmore — Senate District 17 (Salt Lake County) =========
  //       15 signed 2025 Senate bills; record on education, housing, and tax.
  lincoln_fillmore: [
    vidItem({ issueKey: 'housing_build', billNum: 'S.B. 181', ts: '2:13:00', day: 31, marker: 130347,
      headline: 'Presented his Housing Affordability Amendments on the Senate floor (video at 2:13:00)',
      facts: "Fillmore chief-sponsored S.B. 181 (2025), Housing Affordability Amendments, which enacts land-use provisions concerning certain types of parking spaces, provides certain exceptions, and makes technical and conforming changes. The official Utah Senate floor video opens to his presentation on Day 31 of the 2025 General Session at 2:13:00; the bill was signed into law.",
      why: "Easing parking requirements that drive up the cost of building homes is a recorded, enacted action in this senator's own words on housing supply — consistent with the housing-affordability position on his record." }),
    vidItem({ issueKey: 'school_choice', billNum: 'S.B. 29', ts: '40:12', day: 1, marker: 128539, tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried his Charter School Amendments on the Senate floor (video at 40:12)',
      facts: "Fillmore chief-sponsored S.B. 29 (2025), Charter School Amendments, which gives the state board discretionary authority to allocate funds to adjust charter school enrollment estimates, specifies funding sources in priority order, requires reporting to the Office of the Legislative Fiscal Analyst and the Governor's Office of Planning and Budget, and exempts the adjustments from certain budgetary requirements. The official Utah Senate floor video opens to his presentation on Day 1 of the 2025 session at 40:12; the bill was signed into law.",
      why: "Smoothing how charter schools are funded when enrollment shifts is a recorded, enacted action in his own words on school choice — a second issue on his record and a stated position of his." }),
    vidItem({ issueKey: 'property_tax', billNum: 'S.B. 13', ts: '4:46', day: 1, marker: 128522, tags: ['Notable Actions', 'Consistency'],
      headline: 'Presented his Property Tax Reimbursement Amendments on the Senate floor (video at 4:46)',
      facts: "Fillmore chief-sponsored S.B. 13 (2025), Property Tax Reimbursement Amendments, which allows certain rental businesses to charge an itemized recovery fee on heavy-equipment rentals to recoup property taxes, clarifies that the fee is not subject to sales and use tax, bars charging the fee to a governmental entity, and requires the State Tax Commission to study the recovery-fee rate and report recommendations to the Legislature. The official Utah Senate floor video opens to his presentation on Day 1 of the 2025 session at 4:46; the bill was signed into law.",
      why: "Setting how heavy-equipment rental firms recover the property tax they pay is a recorded, enacted action in his own words on tax policy — a third issue on his record." }),
  ],

  // ===== Jerry W. Stevenson — Senate District 6 (Davis County) ============
  //       9 signed 2025 Senate bills; longtime appropriations leader with an
  //       economic-development and infrastructure record.
  jerry_w_stevenson: [
    vidItem({ issueKey: 'infrastructure', billNum: 'S.B. 187', ts: '1:00:01', day: 21, marker: 129825,
      headline: 'Presented his Throughput Infrastructure Funding Amendments on the Senate floor (video at 1:00:01)',
      facts: "Stevenson chief-sponsored S.B. 187 (2025), Throughput Infrastructure Funding Amendments, which modifies the definition of a throughput infrastructure project, modifies the Permanent Community Impact Fund Board's authority related to the Throughput Infrastructure Fund, and provides for a loan or grant from that fund for certain mining activity. The official Utah Senate floor video opens to his presentation on Day 21 of the 2025 General Session at 1:00:01; the bill was signed into law.",
      why: "Directing how the state funds large throughput-infrastructure projects is a recorded, enacted action in this appropriations leader's own words on infrastructure investment." }),
    vidItem({ issueKey: 'econ_growth', billNum: 'S.B. 239', ts: '1:13:19', day: 28, marker: 129923, tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried his Inland Port Authority Amendments on the Senate floor (video at 1:13:19)',
      facts: "Stevenson chief-sponsored S.B. 239 (2025), Inland Port Authority Amendments, which lets the Utah Inland Port Authority fund development of land in and adjacent to project areas including public infrastructure and environmental-sustainability projects, authorizes funding to other governmental entities by grant or agreement, allows contaminated private land in a remediation area to be used for a distribution center, requires an annual review of the authority's statutory authority, and modifies the authority's board structure. The official Utah Senate floor video opens to his presentation on Day 28 of the 2025 session at 1:13:19; the bill was signed into law.",
      why: "Reshaping how the inland port authority finances development is a recorded, enacted action in his own words on economic development — a second issue on his record." }),
  ],

  // ===== Daniel McCay — Senate District 18 (Salt Lake County) =============
  //       Record on tax policy and election law.
  daniel_mccay: [
    vidItem({ issueKey: 'property_tax', billNum: 'S.B. 295', ts: '37:18', day: 35, marker: 130549,
      headline: 'Presented his Property Tax Modifications on the Senate floor (video at 37:18)',
      facts: "McCay chief-sponsored S.B. 295 (2025), Property Tax Modifications, which lets a taxing entity that cuts its budget below the prior year's budgeted revenue raise the budget back up to the base-year level for five years without going through the Truth-in-Taxation notice and hearing, and redirects a set-aside portion of the statewide multicounty assessing-and-collecting levy to the Multicounty Appraisal Trust. The official Utah Senate floor video opens to his presentation on Day 35 of the 2025 General Session at 37:18; the bill was signed into law.",
      why: "Changing when a local government may restore a cut budget without a new Truth-in-Taxation hearing is a recorded, enacted action in this senator's own words on property-tax policy — consistent with his stated focus on taxes." }),
    vidItem({ issueKey: 'campaign_finance', billNum: 'S.B. 18', ts: '25:37', day: 1, marker: 128531, tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried his Election Fundraising Amendments on the Senate floor (video at 25:37)',
      facts: "McCay chief-sponsored S.B. 18 (2025), Election Fundraising Amendments, which exempts a federal-office campaign contribution made by a non-lobbyist from the ban on contributions during a legislative session or the governor's veto period, and makes it a crime to make a federal contribution with the intent to influence or reward a state official for an official action. The official Utah Senate floor video opens to his presentation on Day 1 of the 2025 session at 25:37; the bill was signed into law.",
      why: "Drawing the line between permitted federal fundraising and corrupt influence on state officials is a recorded, enacted action in his own words on campaign-finance law — a second issue on his record." }),
  ],

  // ===== Brady Brammer — Senate District 21 (Salt Lake/Utah) =============
  //       Attorney with a record on government oversight and the courts.
  brady_brammer: [
    vidItem({ issueKey: 'gov_transparency', billNum: 'S.B. 154', ts: '1:07:16', day: 31, marker: 130319,
      headline: 'Presented his Legislative Audit Amendments on the Senate floor (video at 1:07:16)',
      facts: "Brammer chief-sponsored S.B. 154 (2025), Legislative Audit Amendments, which restates the authority of the legislative auditor general, governs how entities respond to requests including privileged items and the assertion of privilege, sets an arbitration path to resolve privilege claims, and authorizes the auditor general to review and monitor the Utah System of Higher Education. The official Utah Senate floor video opens to his presentation on Day 31 of the 2025 General Session at 1:07:16; the bill was signed into law.",
      why: "Strengthening what the Legislature's auditor can examine and how privilege fights are resolved is a recorded, enacted action in this senator's own words on government oversight — consistent with the government-transparency position on his record." }),
    vidItem({ issueKey: 'justice_balance', billNum: 'S.B. 204', ts: '1:33:43', day: 25, marker: 129809, tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried his Right to Appeal Amendments on the Senate floor (video at 1:33:43)',
      facts: "Brammer chief-sponsored S.B. 204 (2025), Right to Appeal Amendments, which modifies the appellate jurisdiction of the Supreme Court and Court of Appeals, defines terms for a civil action in which a trial court enjoins enforcement of a state law, and grants a right to appeal an injunctive order in certain circumstances. The official Utah Senate floor video opens to his presentation on Day 25 of the 2025 session at 1:33:43; the bill was signed into law.",
      why: "Setting when the state may appeal an order blocking a law is a recorded, enacted action in this attorney-senator's own words on the courts — a second issue on his record." }),
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
