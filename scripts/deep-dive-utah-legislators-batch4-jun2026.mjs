#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — June 2026 multi-layer deep dive on the thinnest sitting Utah
// legislators (batch 4)
//
// A fresh roster audit of the live Firestore `politicians` collection ranked
// the 94 CURRENT sitting Utah State Representatives and Senators by combined
// content depth (promises + issue positions + impact-tagged Spotlight drivers).
// This batch builds out the eight weakest remaining profiles — including four
// long-tenured members who sit below the site's 6-promise floor or carry no
// accountability layer at all:
//
//   • Todd Weiler (Sen 8) — broadened beyond his child-safety/courts core with
//     indigent-defense and religion-in-schools law.
//   • Keven Stratton (Sen 24) — added religion, housing-finance and education-
//     oversight bills (two honest failures) beyond his public-lands lane.
//   • Angela Romero (Rep 25) — below the promise floor; added her multi-year
//     sexual-assault survivor and affirmative-consent record (wins and failures).
//   • Carol Spackman Moss (Rep 34) — no accountability layer; built a Spotlight
//     from her teacher-to-legislator education record.
//   • Scott Chew (Rep 68) — no accountability layer; built a Spotlight around a
//     rancher legislating on water/land, including a candid conflict note.
//   • Troy Shelley (Rep 66) — below the floor and no Spotlight; added his 2026
//     forestry/fire, carbon-credit and property-tax record.
//   • Kirk Cullimore (Sen 19) — below the floor; added fair-housing, self-storage,
//     trespass, ticket-resale (failed) and court-structure work.
//   • Scott Sandall (Sen 1) — below the floor; added energy, sovereignty and
//     rural-roads bills.
//
// Each item is authored to the CONTENT_STYLE.md standard: it describes what the
// INDIVIDUAL personally sponsored, said, or did — never what their party did —
// and states vote counts as plain facts rather than "party-line" labels.
//
// Honesty rules (matching the rest of the site):
//   • Nothing invented. Every spotlight item, bill-backed position and promise
//     carries a real {label,url} source; verdicts reflect documented outcomes
//     (signed = kept, failed/died/vetoed = broken, introduced/in-progress =
//     pending). Bill numbers, vote tallies and signing dates were verified by
//     research against le.utah.gov bill pages and corroborated by named Utah
//     reporting (KUER, Utah News Dispatch, Deseret News, Salt Lake Tribune, KSL,
//     Utah Farm Bureau, USHE, ProPublica, NEA, Sixth Amendment Center).
//   • Lower-confidence leads from research (e.g. an opened-but-unnumbered bill
//     file) were dropped rather than asserted.
//   • Idempotent & non-destructive: each run re-fetches the live doc, only adds
//     stances/promises not already present, only writes a theme when none is set,
//     and never clobbers a profile that already carries impact-tagged Spotlight
//     drivers. Promise counts (top-level and on `accountability`) are recomputed
//     from the merged array so Promise % stays data-driven.
//
//   node scripts/deep-dive-utah-legislators-batch4-jun2026.mjs            # dry run (default)
//   node scripts/deep-dive-utah-legislators-batch4-jun2026.mjs --apply    # write to Firestore
// ---------------------------------------------------------------------------

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const STAMP = '2026-06-20T00:00:00.000Z';

// ── Curated, sourced deep-dive data (keyed by Firestore doc id) ──────────────
const DATA = {
  // ── Sen. Todd Weiler (R, Senate 8) — has 1 Spotlight driver, so spotlight is
  //    left untouched; broaden promises and issue positions instead. ──────────
  tweiler: {
    stances: {
      'Indigent Criminal Defense': "Sponsored SB160 (2024), Indigent Defense Amendments, restructuring how Utah funds legal defense for people who cannot afford a lawyer by folding the Indigent Defense Funds Board into the Indigent Defense Commission and Office of Indigent Defense Services. It was signed March 13, 2024.",
      'Religion in Public Schools': "Sponsored SB268 (2026) directing the State Board of Education to require instruction examining the role of religion in U.S. history and religious liberty within constitutional-government courses; he said the law 'isn't about teaching religion or pushing it on anyone' but lets teachers add historical context without fear.",
      'Judicial Oversight & Transparency': "As Senate Judiciary chair, he opened legislation in 2026 to reform the Judicial Conduct Commission after a Utah Supreme Court resignation, proposing that commission members disclose personal relationships with judges and that the panel publish a recusal policy.",
    },
    promises: [
      { title: 'Restructure how Utah funds defense for people who cannot afford a lawyer', verdict: 'kept',
        detail: "Weiler's SB160 (2024), Indigent Defense Amendments, repealed the Indigent Defense Funds Board and consolidated its duties into the Indigent Defense Commission and Office of Indigent Defense Services. It passed the Senate 28-0 and the House 66-0 and was signed March 13, 2024.",
        sources: [{ label: 'Utah Legislature', url: 'https://le.utah.gov/~2024/bills/static/SB0160.html' }, { label: 'Sixth Amendment Center', url: 'https://sixthamendment.org/utah-reforms-indigent-defense-with-first-ever-state-dollars-for-trial-representation/' }] },
      { title: 'Require schools to teach the role of religion in U.S. history', verdict: 'kept',
        detail: "Weiler's SB268 (2026), Religious Curriculum in Schools, directs the State Board of Education to require instruction within constitutional-government courses examining the role of religion in U.S. history and the primacy of religious liberty, without authorizing devotional instruction. It was signed by Gov. Cox and takes effect for the 2026-2027 school year.",
        sources: [{ label: 'Utah Legislature', url: 'https://le.utah.gov/Session/2026/bills/static/SB0268.html' }, { label: 'Deseret News', url: 'https://www.deseret.com/utah/2026/03/01/utah-religion-education-bills/' }] },
    ],
  },

  // ── Sen. Keven Stratton (R, Senate 24) — 1 driver; broaden beyond public
  //    lands with religion, housing-finance and education-oversight work. ──────
  kstratton: {
    stances: {
      'Religious Accommodation': "Sponsored SB259 (2025), State Holy Days, designating days of significance across Christianity, Islam, Judaism and Hinduism and giving employees a personal-preference day to observe one — explicitly not new legal holidays. He called it a reflection of 'the great diversity of faith that we have in our state.' It was signed March 25, 2025.",
      'Affordable Housing Finance': "Sponsored SB277 (2026) to expand the Utah Homes Investment Program to cover multi-family and affordable-rental projects and city home-improvement loan programs; it passed the Senate but was rejected on the House floor 9-61.",
      'Education Oversight': "Sponsored SB307 (2025) to create a Legislative Education Evaluation Commission to study education policy and recommend legislation; it did not pass before the session ended.",
    },
    promises: [
      { title: 'Formally recognize the faith diversity of Utahns with State Holy Days', verdict: 'kept',
        detail: "Stratton's SB259 (2025) designates a slate of religious holy days spanning multiple faiths as days of significance — not legal holidays — and gives employees a personal-preference day to observe one. It passed the Senate 24-0 and was signed March 25, 2025.",
        sources: [{ label: 'Utah Legislature', url: 'https://le.utah.gov/~2025/bills/static/SB0259.html' }, { label: 'Deseret News', url: 'https://www.deseret.com/politics/2025/02/26/xgr-sb259-2025-would-recognize-state-holy-days/' }] },
      { title: 'Expand the Utah Homes Investment Program to affordable and multi-family housing', verdict: 'broken',
        detail: "Stratton's SB277 (2026) would have broadened the Utah Homes Investment Program to finance multi-family, affordable-rental and city home-improvement loan projects. It cleared the Senate but was decisively rejected on the House floor, 9-61, and died.",
        sources: [{ label: 'Utah Legislature', url: 'https://le.utah.gov/~2026/bills/static/SB0277.html' }, { label: 'LegiScan', url: 'https://legiscan.com/UT/bill/SB0277/2026' }] },
      { title: 'Create a legislative commission to evaluate Utah education policy', verdict: 'broken',
        detail: "Stratton's SB307 (2025) would have established a Legislative Education Evaluation Commission to study education issues and recommend legislation. It did not pass before the 2025 session adjourned.",
        sources: [{ label: 'Utah Legislature', url: 'https://le.utah.gov/~2025/bills/static/SB0307.html' }, { label: 'USHE', url: 'https://ushe.edu/2025-legislative-update-week-7/' }] },
    ],
  },

  // ── Rep. Angela Romero (D, House 25) — below the 6-promise floor; build out
  //    her multi-year sexual-assault and consent record. Has 2 drivers. ────────
  aromero: {
    stances: {
      'Sexual-Assault Survivor Protections': "Passed HB17 (2025) barring police, prosecutors and courts from requiring or requesting that a victim of a sexual offense take a polygraph, after an earlier version failed in 2024; she said 'we want people to know that we believe them.' Gov. Cox signed it in 2025.",
      'Affirmative Consent': "Has repeatedly sponsored legislation to clarify that silence or lack of resistance does not equal consent — including HB162 (2024) and HB377 (2025) — neither of which passed, a multi-year effort she continues to bring back.",
      'Sexual-Assault Investigation Standards': "Sponsored HB322 (2024) directing Utah's POST Council to establish a model sexual-assault investigation policy for law-enforcement agencies; it passed the House 75-0 and the Senate 25-0-4 and was signed March 13, 2024.",
    },
    promises: [
      { title: 'Ban requiring sexual-assault victims to take polygraph tests', verdict: 'kept',
        detail: "Romero's effort to bar polygraphs of sexual-assault victims first failed as HB327 (2024) when the Senate struck its enacting clause. She brought it back as HB17 (2025), which passed and was signed by Gov. Cox, effective May 6, 2025 — a multi-year persistence paying off.",
        sources: [{ label: 'Utah Legislature', url: 'https://le.utah.gov/~2025/bills/static/HB0017.html' }, { label: 'ProPublica', url: 'https://www.propublica.org/article/utah-polygraphs-sexual-assault-law' }] },
      { title: 'Set a statewide model policy for sexual-assault investigations', verdict: 'kept',
        detail: "Romero's HB322 (2024) directed Utah's Peace Officer Standards and Training Council to create a model sexual-assault investigation policy for law-enforcement agencies. It passed the House 75-0 and the Senate 25-0-4 and was signed March 13, 2024.",
        sources: [{ label: 'Utah Legislature', url: 'https://le.utah.gov/~2024/bills/static/HB0322.html' }, { label: 'KSL TV', url: 'https://ksltv.com/ksl-investigates/failure-to-protect/utah-will-soon-have-a-statewide-model-for-sexual-assault-investigations/749133/' }] },
      { title: 'Strengthen protections for victims of sexual offenses', verdict: 'kept',
        detail: "Romero's HB328 (2024), Victims of Sexual Offenses Amendments, revised protections and procedures for victims of sexual offenses. It passed both chambers and was signed March 13, 2024.",
        sources: [{ label: 'Utah Legislature', url: 'https://le.utah.gov/~2024/bills/static/HB0328.html' }] },
      { title: 'Define affirmative consent in Utah sexual-offense law', verdict: 'broken',
        detail: "Romero has sponsored affirmative-consent legislation across several sessions — HB162 (2024) and HB377 (2025) — to specify that silence, lack of protest or lack of resistance does not demonstrate consent. Both failed when their enacting clauses were stricken; she has signaled she will keep bringing it back.",
        sources: [{ label: 'Utah Legislature', url: 'https://le.utah.gov/~2024/bills/static/HB0162.html' }, { label: 'KSL', url: 'https://www.ksl.com/article/50858099/for-fourth-time-utah-lawmaker-asks-legislature-to-consider-bill-to-boost-low-prosecution-rate-of-sex-assaults' }] },
    ],
  },

  // ── Rep. Carol Spackman Moss (D, House 34) — no accountability layer; build a
  //    Spotlight + theme from her teacher-to-legislator education record. ──────
  carol_spackman_moss: {
    theme: "A retired 33-year public-school teacher whose legislative record tracks her classroom identity: she turned years of advocacy for International Baccalaureate programs into an enacted college-credit law, while candidly acknowledging the priorities — a sexual-violence-prevention curriculum, an educator-scholarship program — she has repeatedly tried and failed to pass.",
    spotlight: [
      { impact: 'positive', category: 'voting', date: '2023', tags: ['Notable Actions', 'Consistency'],
        headline: 'Moss turned decades of IB advocacy into an enacted college-credit law',
        facts: "Moss was chief sponsor of HB234 (2023), University Recognition for International Baccalaureate Achievement, requiring Utah's public colleges to award credit for qualifying IB exam scores. It passed the House 60-9 and the Senate 25-0 and was signed March 14, 2023 — consistent with her decades advocating IB programs as a longtime high-school teacher.",
        why: 'A bill that codifies a cause she championed for years shows her stated priorities translating into law, not just rhetoric.',
        source: { label: 'Utah Legislature', url: 'https://le.utah.gov/~2023/bills/static/HB0234.html' } },
      { impact: 'negative', category: 'promise', date: '2024', tags: ['Rhetoric vs Reality', 'Follow-Through'],
        headline: 'Her educator-scholarship and sexual-violence-prevention bills have repeatedly stalled',
        facts: "Moss's HB287 (2024), creating a state scholarship for educators pursuing advanced degrees, was held in committee and did not advance. She has separately said she has 'tried in vain' across multiple sessions to require schools to teach sexual-violence prevention — a priority that has not become law.",
        why: 'Tracking her unfinished efforts alongside her wins gives an honest picture of follow-through, which she openly acknowledges.',
        source: { label: 'Utah Legislature', url: 'https://le.utah.gov/~2024/bills/static/HB0287.html' } },
    ],
    stances: {
      'Higher Education Access': "Sponsored HB234 (2023) requiring Utah's public universities to grant college credit for qualifying International Baccalaureate exam scores; it passed the House 60-9 and the Senate 25-0 and was signed March 14, 2023.",
      'Educator Workforce': "Sponsored HB287 (2024) to create a state scholarship for teachers pursuing advanced degrees; it was held in committee and did not pass.",
    },
    promises: [
      { title: 'Give Utah students college credit for International Baccalaureate work', verdict: 'kept',
        detail: "Moss's HB234 (2023) requires Utah's public colleges to award academic credit for qualifying IB exam scores, smoothing the path from high-school IB programs into higher education. It passed both chambers and was signed March 14, 2023.",
        sources: [{ label: 'Utah Legislature', url: 'https://le.utah.gov/~2023/bills/static/HB0234.html' }] },
      { title: 'Create a state scholarship for teachers pursuing advanced degrees', verdict: 'broken',
        detail: "Moss's HB287 (2024), Advanced Degree Scholarship Program, would have funded educators seeking advanced degrees in education. It was held in the House Education Committee and did not advance before the session ended.",
        sources: [{ label: 'Utah Legislature', url: 'https://le.utah.gov/~2024/bills/static/HB0287.html' }] },
    ],
  },

  // ── Rep. Scott Chew (R, House 68) — no accountability layer; build a Spotlight
  //    around a rancher legislating on water/land, with a candid conflict note. ─
  scott_chew: {
    theme: "A working cattle rancher who legislates almost entirely in his own lane — water, livestock and natural resources — passing narrow, technical bills with near-unanimous votes; his main accountability watch-point is how often he writes law touching the ranching industry he personally operates in.",
    spotlight: [
      { impact: 'positive', category: 'voting', date: '2023', tags: ['Notable Actions', 'Consistency'],
        headline: 'Chew funded independent air-quality science on the energy economy he represents',
        facts: "Chew was chief sponsor of HB319 (2023), Uintah Basin Air Quality Research Project Amendments, which removed the project's sunset and funded Utah State University's Bingham Research Center to study the Basin's wintertime ozone tied to its oil-and-gas economy. It passed both chambers and was signed.",
        why: 'Funding scrutiny of an industry central to his district, rather than avoiding it, is a notable consistency point.',
        source: { label: 'Utah Legislature', url: 'https://le.utah.gov/~2023/bills/static/HB0319.html' } },
      { impact: 'neutral', category: 'transparency', date: '2025', tags: ['Conflict of Interest'],
        headline: 'A rancher carrying ranching-liability law — effective advocacy with a conflict to weigh',
        facts: "Chew floor-sponsored SB113 (2025), creating a rebuttable presumption of driver negligence when open-range livestock wander onto highways, improving ranchers' ability to recover damages. As an owner-operator of a livestock company, he advances policy that benefits an industry he works in.",
        why: 'Flagging where a legislator’s personal occupation overlaps with the bills he carries lets voters weigh the alignment themselves.',
        source: { label: 'Utah Farm Bureau', url: 'https://www.utahfarmbureau.org/Article/Five-Key-Bills-from-the-2025-Utah-Legislative-Session' } },
    ],
    stances: {
      'Colorado River Governance': "Sponsored HB473 (2026) moving the Colorado River Authority of Utah into the Department of Natural Resources and restructuring its membership; it passed the House 65-1 and the Senate 25-1 and was signed March 25, 2026.",
      'Wildlife Crossings & Road Safety': "Sponsored HB431 (2026) creating a Wildlife Crossing Account to fund projects improving wildlife and livestock road safety; it was signed March 18, 2026.",
      'Water Rights — Diligence Claims': "Sponsored HB251 (2026) creating a rebuttable presumption of the right to use certain homestead water and clarifying diligence-claim submissions; it was signed March 25, 2026.",
    },
    promises: [
      { title: 'Restructure how Utah governs its share of the Colorado River', verdict: 'kept',
        detail: "Chew's HB473 (2026), Colorado River Authority Amendments, moved the Colorado River Authority of Utah out of the Governor's Office into the Department of Natural Resources and revised its membership and powers. It passed the House 65-1 and the Senate 25-1 and was signed March 25, 2026.",
        sources: [{ label: 'Utah Legislature', url: 'https://le.utah.gov/~2026/bills/static/HB0473.html' }] },
      { title: 'Fund wildlife and livestock road-crossing safety projects', verdict: 'kept',
        detail: "Chew's HB431 (2026), Wildlife Crossing Amendments, created a Wildlife Crossing Account in the Transportation Investment Fund for projects improving wildlife and livestock road safety. It passed the House 61-5 and the Senate 25-1 and was signed March 18, 2026.",
        sources: [{ label: 'Utah Legislature', url: 'https://le.utah.gov/~2026/bills/static/HB0431.html' }] },
      { title: 'Clarify homestead water-rights diligence claims for rural landowners', verdict: 'kept',
        detail: "Chew's HB251 (2026), Diligence Claims Water Amendments, created a rebuttable presumption of the right to use certain water tied to a homestead parcel and set the process for diligence-claim submissions. It passed the House 68-0 and was signed March 25, 2026.",
        sources: [{ label: 'Utah Legislature', url: 'https://le.utah.gov/~2026/bills/static/HB0251.html' }] },
    ],
  },

  // ── Rep. Troy Shelley (R, House 66) — below the floor and no Spotlight; add his
  //    2026 forestry/fire, carbon-credit and property-tax record. ──────────────
  troy_shelley: {
    theme: "A freshman (since 2025) with a thin but coherent record: a property-rights and rural-lands specialist who reliably gets narrow, technical bills signed, while several of his more ambitious reforms have died on procedure rather than on the merits.",
    spotlight: [
      { impact: 'positive', category: 'voting', date: '2026', tags: ['Notable Actions'],
        headline: "Shelley's wildfire-enforcement law was his most consequential bill",
        facts: "Shelley was chief sponsor of HB496 (2026), Forestry and Fire Amendments, giving the Division of Forestry, Fire, and State Lands stronger authority to investigate wildland-fire violations and recover suppression costs. His most contested bill, it passed the House 55-15 and the Senate 27-1 and was signed March 25, 2026.",
        why: 'A substantive enacted law relevant to his rural district shows his early record extends beyond technical fixes.',
        source: { label: 'Utah Legislature', url: 'https://le.utah.gov/~2026/bills/static/HB0496.html' } },
      { impact: 'negative', category: 'promise', date: '2025', tags: ['Follow-Through'],
        headline: 'His unclaimed-property reform passed the House unopposed but died on the Senate calendar',
        facts: "Shelley's HB506 (2025), Unclaimed Property Amendments, would have helped return abandoned property to owners. It passed the House 64-0 and won a favorable Senate committee report, but was never brought to a Senate floor vote and died when the session ended.",
        why: 'A reform with no recorded opposition that still failed shows how much follow-through depends on floor time, not just merit.',
        source: { label: 'Utah Legislature', url: 'https://le.utah.gov/~2025/bills/static/HB0506.html' } },
    ],
    stances: {
      'Wildfire & Forestry Enforcement': "Sponsored HB496 (2026) strengthening the Division of Forestry, Fire, and State Lands' authority to investigate wildland-fire violations and recover suppression costs; it passed the House 55-15 and the Senate 27-1 and was signed March 25, 2026.",
      'Carbon Credit Oversight': "Sponsored HB185 (2026) creating a Carbon Credit Litigation Fund and reporting requirements for state entities that sell carbon credits; it passed the House 70-0 and the Senate 19-6 and was signed March 25, 2026.",
      'Property-Tax Administration': "Sponsored HB46 (2026) letting the Driver License Division share limited information with county assessors to verify residential property-tax-exemption eligibility; it passed the House 70-2 and was signed March 13, 2026.",
    },
    promises: [
      { title: 'Strengthen wildfire investigation and cost-recovery enforcement', verdict: 'kept',
        detail: "Shelley's HB496 (2026), Forestry and Fire Amendments, gave the Division of Forestry, Fire, and State Lands enhanced authority to investigate wildland-fire violations and let eligible entities recover fire-suppression costs. It passed the House 55-15 and the Senate 27-1 and was signed March 25, 2026.",
        sources: [{ label: 'Utah Legislature', url: 'https://le.utah.gov/~2026/bills/static/HB0496.html' }] },
      { title: 'Add oversight and reporting to state carbon-credit sales', verdict: 'kept',
        detail: "Shelley's HB185 (2026), Carbon Credit Amendments, created a Carbon Credit Litigation Fund and imposed reporting requirements on state entities that sell or exchange carbon credits. It passed the House 70-0 and the Senate 19-6 and was signed March 25, 2026.",
        sources: [{ label: 'Utah Legislature', url: 'https://le.utah.gov/~2026/bills/static/HB0185.html' }] },
      { title: 'Help counties verify residential property-tax-exemption eligibility', verdict: 'kept',
        detail: "Shelley's HB46 (2026), Taxpayer Information Sharing Amendments, authorized the Driver License Division to share limited information with county assessors to verify eligibility for the residential property-tax exemption. It passed the House 70-2 and was signed March 13, 2026.",
        sources: [{ label: 'Utah Legislature', url: 'https://le.utah.gov/~2026/bills/static/HB0046.html' }] },
    ],
  },

  // ── Sen. Kirk Cullimore (R, Senate 19) — below the floor; has 4 drivers, so
  //    spotlight is left untouched. Add housing/consumer/courts work. ──────────
  kcullimore: {
    stances: {
      'Fair Housing Enforcement': "Sponsored SB187 (2024), Utah Fair Housing Act Amendments, requiring a good-faith effort to resolve housing-discrimination complaints before the Labor Commission; it passed the Senate 22-0 and the House 67-0 and was signed March 13, 2024.",
      'Self-Storage Consumer Protection': "Sponsored SB265 (2024) strengthening the written notice a self-storage facility must give before disposing of a tenant's stored property; it was signed March 18, 2024.",
      'Court Structure & Efficiency': "Sponsored SJR3 (2025) dissolving the Salt Lake County Justice Court by 2027 at the county's request, citing a shrinking caseload; it passed both chambers.",
    },
    promises: [
      { title: 'Require resolution efforts before housing-discrimination cases escalate', verdict: 'kept',
        detail: "Cullimore's SB187 (2024), Utah Fair Housing Act Amendments, required a good-faith effort to resolve a matter before the Labor Commission and revised exemptions under the Act. It passed the Senate 22-0 and the House 67-0 and was signed March 13, 2024.",
        sources: [{ label: 'Utah Legislature', url: 'https://le.utah.gov/~2024/bills/static/SB0187.html' }] },
      { title: 'Strengthen notice protections for self-storage tenants', verdict: 'kept',
        detail: "Cullimore's SB265 (2024), Self-service Storage Amendments, added requirements for the notice a facility must give an occupant before disposing of stored property and set renewal standards. It was signed March 18, 2024.",
        sources: [{ label: 'Utah Legislature', url: 'https://le.utah.gov/~2024/bills/static/SB0265.html' }] },
      { title: 'Restrict the resale of event tickets', verdict: 'broken',
        detail: "Cullimore's SB324 (2025), Ticket Resale Amendments, sought to limit reselling event tickets in specified circumstances. It did not become law — the Senate struck the enacting clause and filed the bill on March 7, 2025.",
        sources: [{ label: 'Utah Legislature', url: 'https://le.utah.gov/~2025/bills/static/SB0324.html' }] },
    ],
  },

  // ── Sen. Scott Sandall (R, Senate 1) — below the floor; has 4 drivers, so
  //    spotlight is left untouched. Add energy, sovereignty and roads work. ─────
  ssandall: {
    stances: {
      'Energy & Ratepayer Protection': "Sponsored SB132 (2025), Electric Utility Amendments, creating a process for very large electricity users such as data centers to negotiate power service while protecting existing customers from absorbing the added cost; he said the goal was 'new generation sources without laying the cost back onto our traditional consumer.' Signed March 25, 2025.",
      'State Sovereignty & Federalism': "Sponsored SB57 (2024), the Utah Constitutional Sovereignty Act, creating a legislative process to prohibit state enforcement of a federal action the Legislature deems unconstitutional; it passed the Senate 22-7 and the House 58-15 and was signed January 31, 2024.",
      'Rural Roads Funding': "Sponsored SB75 (2023) redirecting sales-tax revenue from sand-and-gravel extraction sites to the counties and cities that host them, earmarked for local class B and C roads; it was signed March 23, 2023.",
    },
    promises: [
      { title: 'Let large power users contract for electricity without shifting costs to ratepayers', verdict: 'kept',
        detail: "Sandall's SB132 (2025), Electric Utility Amendments, created an alternative process for very large electricity users such as AI and data centers to negotiate power service, with transparency rules so existing retail customers don't absorb the added costs. It was signed March 25, 2025.",
        sources: [{ label: 'Utah Legislature', url: 'https://le.utah.gov/~2025/bills/static/SB0132.html' }, { label: 'Utah News Dispatch', url: 'https://utahnewsdispatch.com/2025/03/25/changes-to-rocky-mountain-power-contracts-with-ai-centers/' }] },
      { title: 'Create a state process to contest federal actions deemed unconstitutional', verdict: 'kept',
        detail: "Sandall's SB57 (2024), Utah Constitutional Sovereignty Act, established a process by which the Legislature can vote to prohibit state enforcement of a federal action it deems unconstitutional, subject to leadership or two-thirds checks. It passed the Senate 22-7 and the House 58-15 and was signed January 31, 2024.",
        sources: [{ label: 'Utah Legislature', url: 'https://le.utah.gov/~2024/bills/static/SB0057.html' }] },
      { title: 'Send sand-and-gravel tax revenue to host communities for local roads', verdict: 'kept',
        detail: "Sandall's SB75 (2023), Sand and Gravel Sales Tax Amendments, redistributed local sales-tax revenue from ready-mix concrete sales to the counties and cities hosting extraction sites, requiring the money be spent on class B and class C roads. It was signed March 23, 2023.",
        sources: [{ label: 'Utah Legislature', url: 'https://le.utah.gov/~2023/bills/static/SB0075.html' }] },
    ],
  },
};

// ── Firestore value encoder / decoder ───────────────────────────────────────
function enc(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
  if (typeof v === 'object') { const f = {}; for (const [k, val] of Object.entries(v)) f[k] = enc(val); return { mapValue: { fields: f } }; }
  throw new Error('cannot encode value: ' + String(v));
}
function dec(v) {
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return parseInt(v.integerValue, 10);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.nullValue !== undefined) return null;
  if (v.arrayValue !== undefined) return (v.arrayValue.values || []).map(dec);
  if (v.mapValue !== undefined) { const o = {}; for (const [k, val] of Object.entries(v.mapValue.fields || {})) o[k] = dec(val); return o; }
  return null;
}

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
  const qs = Object.keys(fields).map((m) => 'updateMask.fieldPaths=' + encodeURIComponent(m)).join('&');
  const body = { fields: {} };
  for (const [k, v] of Object.entries(fields)) body.fields[k] = enc(v);
  const r = await fetch(`${BASE}/${id}?${qs}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`patch ${id}: HTTP ${r.status} — ${(await r.text()).slice(0, 200)}`);
}

// Whether a doc already carries impact-tagged Spotlight drivers (never clobber).
function hasDrivers(doc) {
  const sl = Array.isArray(doc.spotlight) ? doc.spotlight : [];
  return sl.some((it) => it && (it.impact === 'positive' || it.impact === 'negative'));
}

// ── Main ────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`PolitiDex — Utah legislator multi-layer deep dive (batch 4)  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
  let touched = 0, missing = 0, skippedDrivers = 0;
  let totSpot = 0, totStance = 0, totPromise = 0;

  for (const [id, plan] of Object.entries(DATA)) {
    let doc;
    try { doc = await getDoc(id); } catch (e) { console.log(`  ✗ ${id}: ${e.message}`); missing++; continue; }
    if (!doc) { console.log(`  – ${id}: not in Firestore — skipped`); missing++; continue; }

    const fields = { updatedAt: STAMP };

    // 1) Spotlight drivers (only if none yet) + theme
    let addedSpot = 0;
    if (hasDrivers(doc)) {
      if (plan.spotlight && plan.spotlight.length) {
        console.log(`  • ${id} (${doc.name}): already has Spotlight drivers — leaving spotlight untouched`);
        skippedDrivers++;
      }
    } else if (plan.spotlight && plan.spotlight.length) {
      const existing = Array.isArray(doc.spotlight) ? doc.spotlight : [];
      fields.spotlight = plan.spotlight.concat(existing);
      addedSpot = plan.spotlight.length;
      if (plan.theme && !(typeof doc.spotlightTheme === 'string' && doc.spotlightTheme.trim())) {
        fields.spotlightTheme = plan.theme;
      }
    }

    // 2) Issue positions — merge new topics, never overwrite existing
    let addedStance = 0;
    const stances = (doc.stances && typeof doc.stances === 'object' && !Array.isArray(doc.stances)) ? { ...doc.stances } : {};
    for (const [topic, text] of Object.entries(plan.stances || {})) {
      if (!(topic in stances)) { stances[topic] = text; addedStance++; }
    }
    if (addedStance) fields.stances = stances;

    // 3) Promises — append titles not already present, then recompute counts
    let addedPromise = 0;
    const promises = Array.isArray(doc.promises) ? doc.promises.slice() : [];
    const have = new Set(promises.map((p) => (p && p.title ? p.title.trim().toLowerCase() : '')));
    for (const p of (plan.promises || [])) {
      if (!have.has(p.title.trim().toLowerCase())) { promises.push(p); have.add(p.title.trim().toLowerCase()); addedPromise++; }
    }
    if (addedPromise) {
      fields.promises = promises;
      const kept = promises.filter((p) => p.verdict === 'kept').length;
      const broken = promises.filter((p) => p.verdict === 'broken').length;
      const pending = promises.filter((p) => p.verdict === 'pending').length;
      fields.kept = kept; fields.broken = broken; fields.pending = pending;
      const acct = (doc.accountability && typeof doc.accountability === 'object') ? { ...doc.accountability } : {};
      acct.kept = kept; acct.broken = broken; acct.pending = pending;
      fields.accountability = acct;
    }

    totSpot += addedSpot; totStance += addedStance; totPromise += addedPromise;
    console.log(`  ${APPLY ? '✎' : '→'} ${id} (${doc.name}): +${addedSpot} spotlight, +${addedStance} issue position(s), +${addedPromise} promise(s)`);

    // Only write if something actually changed beyond the timestamp
    if (Object.keys(fields).length > 1) {
      if (APPLY) await patch(id, fields);
      touched++;
    }
  }

  console.log(`\n${APPLY ? 'Applied' : 'Would apply'} to ${touched} profile(s): ${totSpot} spotlight driver(s), ${totStance} issue position(s), ${totPromise} new promise(s).`);
  console.log(`(${skippedDrivers} already had spotlight drivers; ${missing} not found.)`);
  if (!APPLY) console.log('\nRe-run with --apply to write to Firestore.');
})();
