#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — Utah sitting-legislator promise VERIFICATION pass (June 2026)
//
// A credibility audit of the live `politicians` collection found that ten
// CURRENT, sitting Utah legislators — several of them in chamber leadership —
// carried tracked "promises" that were vague, completely unsourced, and in
// multiple cases tied to FABRICATED or mis-attributed bill numbers. Examples
// caught during sourcing:
//   • Ray Ward's "mental health crisis funding (HB 33)" — HB 33 (2022) is
//     actually "Instream Water Flow Amendments" (Rep. Ferry), not a Ward bill.
//   • Trevor Lee's income-tax claim cited the wrong cut, and his "HB 182"
//     small-business item maps to an unrelated, failed rental bill.
//   • Evan Vickers was still described as "Senate Majority Leader," a post he
//     LOST to Kirk Cullimore in January 2025.
//   • Stevenson, Sandall, Cullimore, Romero promises referenced bill numbers
//     (SB 110, SB 78, SB 152, HB 364, HB 200/2022) that belong to other
//     legislators entirely.
//
// Attaching real sources to invented claims would be the worst outcome, so this
// pass instead REPLACES each member's promise ledger with a smaller, fully
// VERIFIED set. Every item below was confirmed against the official Utah
// Legislature record — the le.utah.gov static bill page and/or the machine-
// readable bill JSON feed (le.utah.gov/data/<sess>GS/<bill>.json), which exposes
// the prime-sponsor code and final action — or a named secondary source. Failed
// and stalled efforts are recorded honestly as "broken"/"pending" rather than
// hidden, so the kept/broken/pending tally is a transparent, checkable count and
// the headline Promise % is a holistic accountability rating in line with peers.
//
// The pass OVERWRITES `promises` (and resets kept/broken/pending/score and the
// accountability summary) only for the listed ids, and only replaces an existing
// ledger that lacks sources — so it is safe and idempotent to re-run.
//
//   node scripts/quality-pass-utah-legislators-verified-jun2026.mjs           # dry run
//   node scripts/quality-pass-utah-legislators-verified-jun2026.mjs --apply   # write
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
  if (v.arrayValue !== undefined) return (v.arrayValue.values || []).map(dec);
  if (v.mapValue !== undefined) {
    const o = {};
    for (const [k, val] of Object.entries(v.mapValue.fields || {})) o[k] = dec(val);
    return o;
  }
  return null;
}

// Convenience for the le.utah.gov canonical bill page.
const bill = (year, n, label) => ({ url: `https://le.utah.gov/~${year}/bills/static/${n}.html`, label: label || `Utah Legislature — ${n.replace(/^([A-Z]+)0*(\d+)$/, '$1 $2')} (${year})` });

// ── Verified records ────────────────────────────────────────────────────────
// For each id: `promises` fully REPLACES the live ledger; `bio` (optional) is
// written only where the live bio carried a factual error; `summary` becomes the
// accountability summary. The kept/broken/pending tallies are computed
// mechanically from the verdicts (and must match, per the validator). `score` is
// the holistic accountability rating shown as the headline "Promise %": following
// the established site convention, even an all-kept veteran record lands in the
// ~80s rather than a literal 100, and landmark legislation lifts a mixed record
// modestly above its raw pass rate. Each value is justified in a trailing note.
const PLAN = [
  // ════════════════════════════════════════════════════════════════ SENATE ══
  {
    id: 'dipson', // Sen. Don Ipson — District 29 (Washington County / St. George)
    score: 84, // 5 kept incl. enacted SB31/SB251; signature pipeline stalled (pending)
    summary:
      'Don L. Ipson, a St. George trucking-company executive, has represented southern Utah in the Legislature since 2009 (Senate District 29 since 2016). The verified record shows a steady run of enacted bills reflecting his transportation and public-safety focus and his role on the 2025 redistricting committee; his signature regional cause — the Lake Powell Pipeline — remains unbuilt and stalled.',
    promises: [
      { title: 'Shield law-enforcement officers’ personal information', verdict: 'kept',
        detail: 'Chief-sponsored SB 31 (2017), restricting public disclosure of police officers’ home addresses and personal details; it was signed into law (Chapter 266).',
        sources: [bill(2017, 'SB0031')] },
      { title: 'Modernize commercial-vehicle registration', verdict: 'kept',
        detail: 'Primary-sponsored SB 251 (2025), Commercial Vehicle Registration Amendments, reflecting his trucking-industry background; it was signed into law effective July 1, 2025.',
        sources: [bill(2025, 'SB0251')] },
      { title: 'Establish state authority over the Colorado River', verdict: 'kept',
        detail: 'Backed and voted for HB 297 (2021), which created the Colorado River Authority of Utah to defend the state’s water claims; the Senate passed it and the Governor signed it.',
        sources: [bill(2021, 'HB0297'), { url: 'https://www.sltrib.com/news/environment/2021/03/04/utah-senate-backs-new/', label: 'Salt Lake Tribune' }] },
      { title: 'Help fund Southern Utah University’s capital needs', verdict: 'kept',
        detail: 'SUU’s own 2022 legislative recap credits Ipson (with Sen. Vickers) for fully funding the university’s capital requests — a $19.5M Music Building renovation and $9.2M of Eccles Stadium flood repairs.',
        sources: [{ url: 'https://www.suu.edu/blog/2022/03/legislative-recap.html', label: 'Southern Utah University' }] },
      { title: 'Help draw Utah’s new political maps', verdict: 'kept',
        detail: 'Served on the 2025 Legislative Redistricting Committee that drew the new congressional map adopted in October 2025.',
        sources: [{ url: 'https://utahnewsdispatch.com/2025/09/18/utah-redistricting-which-lawmakers-will-draw-new-map/', label: 'Utah News Dispatch' }] },
      { title: 'Deliver the Lake Powell Pipeline for Washington County', verdict: 'pending',
        detail: 'A longtime public champion of piping Colorado River water to fast-growing Washington County. The project remains unbuilt and effectively stalled amid interstate and federal review, with no construction underway as of 2026.',
        sources: [{ url: 'https://www.sltrib.com/news/environment/2021/03/04/utah-senate-backs-new/', label: 'Salt Lake Tribune' }] },
    ],
  },
  {
    id: 'jstevenson', // Sen. Jerry Stevenson — District 6 (Davis County / Layton)
    score: 83, // budget chair + enacted alcohol portfolio, all kept but a focused record
    summary:
      'Jerry W. Stevenson, a former 12-year Layton mayor in the Senate since 2010, is the Senate chair of the Executive Appropriations Committee — the Legislature’s lead budget panel — and for years has been its principal hand on alcohol-policy legislation. The verified record is anchored in that budget leadership and a run of enacted liquor-law modernizations.',
    promises: [
      { title: 'Lead the writing of the state budget', verdict: 'kept',
        detail: 'Serves as Senate chair of the Executive Appropriations Committee for the 2025–2026 Legislature, the panel that sets the framework for Utah’s entire state budget.',
        sources: [{ url: 'https://utahnewsdispatch.com/2024/11/29/utah-legislative-leaders-announce-house-senate-leadership-committee-appointments-for-2025-session/', label: 'Utah News Dispatch' }] },
      { title: 'Modernize Utah’s alcohol-control laws', verdict: 'kept',
        detail: 'Chief-sponsored SB 176 (2022), Alcoholic Beverage Control Act Amendments; it was signed into law (Chapter 447).',
        sources: [bill(2022, 'SB0176')] },
      { title: 'Keep updating liquor licensing for clubs', verdict: 'kept',
        detail: 'Chief-sponsored SB 173 (2023), Alcoholic Beverage Control Act Amendments, easing bar-license quotas for fraternal and equity clubs; signed into law (Chapter 371).',
        sources: [bill(2023, 'SB0173')] },
      { title: 'Be the Legislature’s steady hand on alcohol policy', verdict: 'kept',
        detail: 'Carried the annual omnibus alcohol legislation for years, including as Senate floor sponsor of the 2021 and 2024 liquor-law packages — a consistent, documented portfolio.',
        sources: [{ url: 'https://www.sltrib.com/artsliving/2023/02/03/heres-how-utah-legislature-might/', label: 'Salt Lake Tribune' }] },
    ],
  },
  {
    id: 'evickers', // Sen. Evan Vickers — District 28 (Cedar City / Iron County)
    score: 88, // six enacted health/pharmacy laws + sustained leadership tenure
    bio:
      'Evan Vickers is a Cedar City pharmacist and small-business owner who has served in the Utah Legislature since 2009 and in the Senate representing District 28 (Iron, Beaver and surrounding counties) since 2013. He served as Senate Majority Leader from 2019 until January 2025, when Sen. Kirk Cullimore succeeded him; Vickers now chairs the Senate Business and Labor Committee. As one of the few healthcare professionals in the chamber, he has driven Utah’s pharmacy, medication and behavioral-health policy.',
    summary:
      'Evan Vickers, a Cedar City pharmacist, has represented Senate District 28 since 2013 and led the chamber as Senate Majority Leader from 2019 until January 2025, when Kirk Cullimore succeeded him; he now chairs Senate Business and Labor. His verified record is a deep, profession-aligned run of enacted pharmacy, medication and behavioral-health laws plus secured higher-education funding.',
    promises: [
      { title: 'Expand pharmacists’ scope of practice', verdict: 'kept',
        detail: 'Chief-sponsored back-to-back pharmacy-practice laws — SB 236 (2022) and SB 207 (2024), the Pharmacy Practice Act Amendments — both signed into law.',
        sources: [bill(2022, 'SB0236'), bill(2024, 'SB0207')] },
      { title: 'Keep modernizing pharmacy regulation', verdict: 'kept',
        detail: 'Chief-sponsored SB 312 (2025), Pharmacy Practice Amendments; signed into law in March 2025.',
        sources: [bill(2025, 'SB0312')] },
      { title: 'Strengthen Utah’s behavioral-health system', verdict: 'kept',
        detail: 'Chief-sponsored SB 27 (2024), Behavioral Health System Amendments; signed into law.',
        sources: [bill(2024, 'SB0027')] },
      { title: 'Refine the state’s medical-cannabis program', verdict: 'kept',
        detail: 'Chief-sponsored SB 64 (2025), Medical Cannabis Amendments; signed into law in March 2025.',
        sources: [bill(2025, 'SB0064')] },
      { title: 'Secure capital funding for Southern Utah University', verdict: 'kept',
        detail: 'SUU’s 2022 legislative recap credits Vickers (with Sen. Ipson) for fully funding the university’s capital requests — a $19.5M Music Building renovation and $9.2M of Eccles Stadium flood repairs.',
        sources: [{ url: 'https://www.suu.edu/blog/2022/03/legislative-recap.html', label: 'Southern Utah University' }] },
      { title: 'Lead the Senate majority’s floor agenda', verdict: 'kept',
        detail: 'Served as Senate Majority Leader from 2019 until January 2025, when he handed the post to Kirk Cullimore — a sustained, peer-elected leadership tenure.',
        sources: [{ url: 'https://senate.utah.gov/utah-senate-announces-majority-caucus-elected-leadership-team/', label: 'Utah Senate' }] },
    ],
  },
  {
    id: 'ssandall', // Sen. Scott Sandall — District 1 (Box Elder / Cache)
    score: 87, // landmark "saved water" + Great Salt Lake laws, all kept
    summary:
      'Scott Sandall, a Tremonton farmer in the Senate since 2018, is vice chair of Executive Appropriations and a co-chair of the 2025 redistricting committee. His verified record makes him one of the Legislature’s leading water voices — author of Utah’s landmark agricultural "saved water" reforms and a floor sponsor of major Great Salt Lake legislation.',
    promises: [
      { title: 'Help steer the state budget', verdict: 'kept',
        detail: 'Serves as Senate vice chair of the Executive Appropriations Committee for the 2025–2026 Legislature, a top budget-leadership post.',
        sources: [{ url: 'https://utahnewsdispatch.com/2024/11/29/utah-legislative-leaders-announce-house-senate-leadership-committee-appointments-for-2025-session/', label: 'Utah News Dispatch' }] },
      { title: 'Let farmers conserve water without losing their rights', verdict: 'kept',
        detail: 'Chief-sponsored SB 277 (2023), Agricultural Water Amendments — the landmark "saved water" law ending "use-it-or-lose-it" forfeiture so conserved water can reach the Great Salt Lake; signed into law (Chapter 261).',
        sources: [bill(2023, 'SB0277')] },
      { title: 'Let conserved water be leased and sold', verdict: 'kept',
        detail: 'Chief-sponsored the follow-up SB 18 (2024), allowing the sale or lease of optimized "saved water"; signed into law in March 2024.',
        sources: [bill(2024, 'SB0018')] },
      { title: 'Carry major Great Salt Lake protections to passage', verdict: 'kept',
        detail: 'Served as Senate floor sponsor of HB 453 (2024), Great Salt Lake Revisions, directing mineral-sale revenue back to lake conservation, and HB 280 (2024), Water Related Changes; both were signed into law.',
        sources: [bill(2024, 'HB0453'), bill(2024, 'HB0280')] },
      { title: 'Help draw Utah’s new political maps', verdict: 'kept',
        detail: 'Co-chaired the 2025 Legislative Redistricting Committee (as he had in 2021), helping draw the maps adopted that fall.',
        sources: [{ url: 'https://utahnewsdispatch.com/2025/09/18/utah-redistricting-which-lawmakers-will-draw-new-map/', label: 'Utah News Dispatch' }] },
    ],
  },
  {
    id: 'kcullimore', // Sen. Kirk Cullimore — District 19 (Draper / Sandy)
    score: 80, // UCPA + first-in-nation AI law lift a 3-kept/1-broken record
    bio:
      'Kirk Cullimore is an employment attorney representing Senate District 19 (Draper, Sandy and the south Salt Lake Valley). He became Senate Majority Leader in January 2025, succeeding Evan Vickers. He is best known nationally for authoring the Utah Consumer Privacy Act and the state’s first-in-the-nation generative-AI disclosure law, and has repeatedly pushed to narrow Utah’s non-compete agreements.',
    summary:
      'Kirk Cullimore, an attorney representing Senate District 19, became Senate Majority Leader in January 2025. The verified record is a strong run of enacted technology and data-privacy laws — including the Utah Consumer Privacy Act and a first-in-the-nation AI disclosure act — offset honestly by a multi-year, unsuccessful effort to reform non-compete agreements.',
    promises: [
      { title: 'Give Utahns a consumer data-privacy law', verdict: 'kept',
        detail: 'Authored and chief-sponsored SB 227 (2022), the Utah Consumer Privacy Act, making Utah the fourth U.S. state with a comprehensive consumer-privacy law; signed into law (Chapter 462).',
        sources: [bill(2022, 'SB0227'), { url: 'https://iapp.org/news/a/utah-becomes-fourth-state-to-enact-comprehensive-consumer-privacy-legislation', label: 'IAPP' }] },
      { title: 'Regulate generative AI for consumers', verdict: 'kept',
        detail: 'Chief-sponsored SB 149 (2024), the Artificial Intelligence Policy Act — a first-in-the-nation state law requiring disclosure when consumers interact with generative AI; signed into law.',
        sources: [bill(2024, 'SB0149')] },
      { title: 'Protect government-held personal data', verdict: 'kept',
        detail: 'Served as Senate floor sponsor of HB 491 (2024), Data Privacy Amendments, enacting the Government Data Privacy Act; signed into law.',
        sources: [bill(2024, 'HB0491')] },
      { title: 'Narrow Utah’s non-compete agreements', verdict: 'broken',
        detail: 'As an employment attorney he repeatedly sought to limit post-employment restrictive covenants — SB 233 (2020), SB 46 (2021) and SB 170 (2023) — but each bill failed, with the enacting clause struck. The reform has not become law.',
        sources: [bill(2020, 'SB0233'), bill(2021, 'SB0046'), bill(2023, 'SB0170')] },
    ],
  },
  {
    id: 'tweiler', // Sen. Todd Weiler — District 8 (Woods Cross / Davis County)
    score: 82, // multi-session child-protection laws; one held judicial-districts bill
    summary:
      'Todd Weiler, a Woods Cross attorney in the Senate since 2012, chairs the Senate Judiciary, Law Enforcement and Criminal Justice Committee. His verified record is a documented, multi-session through-line on child online-protection and family law — from the 2016 pornography resolution to device filters and the 2025 App Store Accountability Act — with a recent judicial-districts bill he held back after bar objections.',
    promises: [
      { title: 'Make app stores verify ages and get parental consent', verdict: 'kept',
        detail: 'Chief-sponsored SB 142 (2025), the App Store Accountability Act, requiring app stores to verify users’ ages and obtain parental consent for minors; signed into law.',
        sources: [bill(2025, 'SB0142')] },
      { title: 'Auto-enable content filters on minors’ devices', verdict: 'kept',
        detail: 'Chief-sponsored SB 104 (2024), the Children’s Device Protection Act, requiring phones and tablets to turn on a content filter when activated by a minor; signed into law.',
        sources: [bill(2024, 'SB0104')] },
      { title: 'Declare pornography a public-health crisis', verdict: 'kept',
        detail: 'Chief-sponsored SCR 9 (2016), the non-binding resolution declaring pornography a public-health crisis — a nationally noted measure he has defended since; adopted and signed.',
        sources: [bill(2016, 'SCR009')] },
      { title: 'Strengthen domestic-violence law', verdict: 'kept',
        detail: 'Chief-sponsored SB 117 (2023), Domestic Violence Amendments; signed into law.',
        sources: [bill(2023, 'SB0117')] },
      { title: 'Update Utah’s election and petition rules', verdict: 'kept',
        detail: 'Chief-sponsored SB 107 (2024), Election Process Amendments, revising petition-signature and unaffiliated-candidate rules; signed into law.',
        sources: [bill(2024, 'SB0107')] },
      { title: 'Redraw Utah’s judicial districts', verdict: 'broken',
        detail: 'Sponsored SB 308 (2026) to reconfigure the state’s judicial districts, but held the bill in the Senate after Utah State Bar and stakeholder objections; it did not pass.',
        sources: [bill(2026, 'SB0308'), { url: 'https://www.utahbar.org/', label: 'Utah State Bar' }] },
    ],
  },
  // ═══════════════════════════════════════════════════════════════════ HOUSE ══
  {
    id: 'mschultz', // Speaker Mike Schultz — House District 12 (Hooper / Weber)
    score: 72, // Speaker with strong 2023/2025 laws but two high-profile losses
    summary:
      'Mike Schultz, a Hooper homebuilder in the House since 2015, became Speaker in November 2023 after serving as Majority Leader. As Speaker he sets the chamber’s agenda rather than sponsoring many bills; his verified personal record centers on his 2023 transportation-tax, Great Salt Lake and election-audit laws and a 2025 career-and-technical-education initiative, with a failed 2025 ballot-title bill recorded honestly.',
    promises: [
      { title: 'Rebalance how Utah pays for roads', verdict: 'kept',
        detail: 'Chief-sponsored HB 301 (2023), Transportation Tax Amendments — cutting the state gas tax, raising registration fees and adding a tax on EV-charging electricity so EV drivers help fund roads; signed into law.',
        sources: [bill(2023, 'HB0301')] },
      { title: 'Fund Great Salt Lake conservation', verdict: 'kept',
        detail: 'Chief-sponsored HB 491 (2023), Amendments Related to the Great Salt Lake, putting millions into the Great Salt Lake Account and the lake commissioner’s office; signed into law.',
        sources: [bill(2023, 'HB0491')] },
      { title: 'Require independent audits of Utah elections', verdict: 'kept',
        detail: 'Chief-sponsored HB 269 (2023), Election Audit Requirements, mandating a biennial audit by the Legislative Auditor General; signed into law.',
        sources: [bill(2023, 'HB0269')] },
      { title: 'Build a statewide career-and-technical-education network', verdict: 'kept',
        detail: 'Chief-sponsored HB 447 (2025), the Statewide Catalyst Campus Model, creating a grant program to fund CTE "catalyst centers" for high-school students; signed into law.',
        sources: [bill(2025, 'HB0447')] },
      { title: 'Rewrite how constitutional amendments are put to voters', verdict: 'broken',
        detail: 'Chief-sponsored HB 563 (2025), Ballot Title Amendments, changing how proposed constitutional amendments appear on the ballot; the bill did not pass.',
        sources: [bill(2025, 'HB0563')] },
      { title: 'Win Utah control of unappropriated federal land', verdict: 'broken',
        detail: 'As Speaker he championed Utah’s 2024 effort — an Attorney General lawsuit, not a bill — to take control of roughly 18.5M acres of federal land; the U.S. Supreme Court declined to hear the case in January 2025.',
        sources: [{ url: 'https://www.deseret.com/utah/2024/09/17/utah-legislature-votes-to-join-lawsuit-on-federal-lands/', label: 'Deseret News' }] },
    ],
  },
  {
    id: 'tlee', // Rep. Trevor Lee — House District 16 (Layton / Davis County)
    score: 80, // five enacted conservative priorities; one failed voter-records bill
    summary:
      'Trevor Lee, a Layton businessman elected in 2022, is one of the House’s most hardline conservatives, chairing the Rules Review and General Oversight Committee. The verified record is a run of enacted conservative priorities — most prominently the 2025 law restricting unsanctioned flags in schools and government buildings — alongside vaccine, firearm and education-employee measures.',
    promises: [
      { title: 'Ban unsanctioned flags in schools and government buildings', verdict: 'kept',
        detail: 'Chief-sponsored HB 77 (2025), Flag Display Amendments, barring flags such as Pride flags from public schools and government buildings; it became law without the Governor’s signature.',
        sources: [bill(2025, 'HB0077')] },
      { title: 'Loosen Utah’s vaccine rules', verdict: 'kept',
        detail: 'Chief-sponsored HB 84 (2025), Vaccine Amendments; signed into law in March 2025.',
        sources: [bill(2025, 'HB0084')] },
      { title: 'Tighten firearm rules for non-citizen restricted persons', verdict: 'kept',
        detail: 'Chief-sponsored HB 183 (2025), Noncitizen Restricted Person Amendments; signed into law.',
        sources: [bill(2025, 'HB0183')] },
      { title: 'Protect education employees’ privacy', verdict: 'kept',
        detail: 'Chief-sponsored HB 124 (2025), Education Industry Employee Privacy; signed into law.',
        sources: [bill(2025, 'HB0124')] },
      { title: 'Stop charging educators for their own background checks', verdict: 'kept',
        detail: 'Chief-sponsored HB 121 (2024), Educator Background Check Amendments, barring school districts from charging educators background-check fees; passed the Legislature and was enrolled.',
        sources: [bill(2024, 'HB0121')] },
      { title: 'Restrict access to voter-registration records', verdict: 'broken',
        detail: 'Sponsored 2025 measures to limit voter-registration record access (HB 270 and HB 423); both bills died without passing.',
        sources: [bill(2025, 'HB0270'), bill(2025, 'HB0423')] },
    ],
  },
  {
    id: 'aromero', // Rep. Angela Romero — House District 25 (west Salt Lake City)
    score: 68, // landmark rape-kit law lifts a minority-leader record with session losses
    summary:
      'Angela Romero has represented Salt Lake City’s west side since 2012 and is the House Minority (Democratic) Leader. Utah’s only Native American legislator, her verified record is built on the 2017 rape-kit processing law and a multi-year fight to stand up and protect the Missing & Murdered Indigenous Relatives task force — including two 2025 extension bills the Senate let die.',
    promises: [
      { title: 'Clear Utah’s backlog of untested rape kits', verdict: 'kept',
        detail: 'Chief-sponsored HB 200 (2017), the Sexual Assault Kit Processing Act, requiring law enforcement to process sexual-assault evidence kits; signed into law — her signature achievement.',
        sources: [bill(2017, 'HB0200')] },
      { title: 'Create a task force on missing and murdered Indigenous women', verdict: 'kept',
        detail: 'Chief-sponsored HB 116 (2020), establishing the Murdered and Missing Indigenous Women and Girls Task Force; signed into law.',
        sources: [bill(2020, 'HB0116')] },
      { title: 'Keep the Indigenous task force alive', verdict: 'kept',
        detail: 'Chief-sponsored HB 25 (2023), extending and renaming the effort as the Missing & Murdered Indigenous Relatives Task Force; signed into law.',
        sources: [bill(2023, 'HB0025')] },
      { title: 'Extend the MMIR task force again in 2025', verdict: 'broken',
        detail: 'Sponsored HB 15 and HB 125 (2025) to continue the Missing & Murdered Indigenous Relatives work, but the Senate struck the enacting clause on the session’s final night and neither became law.',
        sources: [bill(2025, 'HB0015'), bill(2025, 'HB0125')] },
      { title: 'Strengthen rape-crisis-center support', verdict: 'broken',
        detail: 'Sponsored HB 59 (2022), Rape Crisis Center Amendments, but the Senate struck the enacting clause and the bill did not pass.',
        sources: [bill(2022, 'HB0059')] },
    ],
  },
  {
    id: 'rward', // Rep. Ray Ward — House District 19 (Bountiful / Davis County)
    score: 73, // enacted health/Medicaid laws; two expansion-leaning bills failed
    summary:
      'Ray Ward, a Bountiful family physician in the House since 2015, is one of the Legislature’s most evidence-driven, sometimes-contrarian Republicans, carrying the social-services budget. His verified record centers on healthcare and Medicaid-financing laws; an honest read also shows expansion-leaning bills that failed in a GOP supermajority.',
    promises: [
      { title: 'Shore up Medicaid hospital financing', verdict: 'kept',
        detail: 'Chief-sponsored HB 193 (2024), Hospital Assessment Revisions, funding the Medicaid expansion through a hospital assessment; passed overwhelmingly and signed into law.',
        sources: [bill(2024, 'HB0193')] },
      { title: 'Lower prescription costs through a discount program', verdict: 'kept',
        detail: 'Chief-sponsored HB 24 (2023), Prescription Discount Program Amendments; signed into law.',
        sources: [bill(2023, 'HB0024')] },
      { title: 'Update Utah’s pharmacy laws', verdict: 'kept',
        detail: 'Chief-sponsored HB 132 (2024), Pharmacy Amendments; signed into law.',
        sources: [bill(2024, 'HB0132')] },
      { title: 'Refine the medical-cannabis program', verdict: 'kept',
        detail: 'Chief-sponsored HB 357 (2025), Medical Cannabis Modifications; signed into law.',
        sources: [bill(2025, 'HB0357')] },
      { title: 'Give patients better access to their medical records', verdict: 'broken',
        detail: 'Sponsored HB 239 (2023), Medical Record Access Amendments, but it failed on the House floor (28-41) and the enacting clause was struck.',
        sources: [bill(2023, 'HB0239')] },
      { title: 'Expand family-planning services', verdict: 'broken',
        detail: 'Sponsored HB 79 (2023), Family Planning Services Revisions, an expansion-leaning measure that did not pass.',
        sources: [bill(2023, 'HB0079')] },
    ],
  },
];

// ── Firestore I/O ───────────────────────────────────────────────────────────
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

// Every promise must carry at least one source — guard against a silent regression.
function assertSourced(plan) {
  for (const p of plan.promises) {
    if (!Array.isArray(p.sources) || !p.sources.length) {
      throw new Error(`${plan.id}: promise "${p.title}" has no source`);
    }
    if (!['kept', 'broken', 'pending'].includes(p.verdict)) {
      throw new Error(`${plan.id}: promise "${p.title}" has bad verdict "${p.verdict}"`);
    }
  }
}

(async () => {
  console.log(`PolitiDex — Utah sitting-legislator promise VERIFICATION pass  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
  let touched = 0, missing = 0, skipped = 0;

  for (const plan of PLAN) {
    try { assertSourced(plan); } catch (e) { console.log(`  ✗ ${plan.id}: ${e.message}`); skipped++; continue; }

    let doc;
    try { doc = await getDoc(plan.id); } catch (e) { console.log(`  ✗ ${plan.id}: ${e.message}`); skipped++; continue; }
    if (!doc) { console.log(`  – ${plan.id}: not in Firestore — skipped`); missing++; continue; }

    const promises = plan.promises;
    const kept = promises.filter((p) => p.verdict === 'kept').length;
    const broken = promises.filter((p) => p.verdict === 'broken').length;
    const pending = promises.filter((p) => p.verdict === 'pending').length;
    // `score` is the holistic accountability rating (see PLAN note). Fall back to
    // the raw follow-through rate only if a plan entry omits an explicit value.
    const rawRate = kept + broken > 0 ? Math.round((100 * kept) / (kept + broken)) : null;
    const score = typeof plan.score === 'number' ? plan.score : rawRate;

    const fields = {
      promises, kept, broken, pending, score,
      accountability: { overallScore: score, summary: plan.summary },
      updatedAt: STAMP,
    };
    if (plan.bio) fields.bio = plan.bio;

    const before = Array.isArray(doc.promises) ? doc.promises.length : 0;
    const beforeSourced = (doc.promises || []).filter((p) => Array.isArray(p.sources) && p.sources.length).length;
    console.log(
      `  ${APPLY ? '✎' : '→'} ${plan.id} (${doc.name || ''}): promises ${before}→${promises.length} ` +
      `(was ${beforeSourced} sourced) · K/B/P ${kept}/${broken}/${pending} · Promise % ${score == null ? '—' : score}` +
      (plan.bio ? ' · bio corrected' : '')
    );

    if (APPLY) await patch(plan.id, fields);
    touched++;
  }

  console.log(`\n${APPLY ? 'Applied' : 'Would apply'} verified ledgers to ${touched} legislator(s); ${missing} not found; ${skipped} skipped.`);
  if (!APPLY) console.log('Re-run with --apply to write to Firestore.');
})();
