#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — June 2026 multi-layer deep dive on sitting Utah legislators (batch 3)
//
// A roster audit of the live Firestore `politicians` collection (June 2026)
// found that of the 101 CURRENT sitting Utah State Representatives and Senators,
// 68 still had no Accountability / Spotlight integrity layer (zero impact-tagged
// drivers), even though most already carried developed Promise and Issue-position
// layers. Batches 1 and 2 (deep-dive-utah-legislators-jun2026.mjs and
// deep-dive-utah-legislators-batch2-jun2026.mjs) built out twenty of those
// officeholders. This batch continues the work on twelve more — a mix of high-
// profile members of both parties (Senate tax/energy/health leaders, House
// leadership, and notable freshmen) — building THREE layers at once for each,
// from genuine sourced research into the 2024–2026 general sessions:
//
//   • Spotlight / Accountability — 2–4 sourced integrity highlights per figure
//     (impact: positive = words match actions / constructive leadership,
//     negative = inconsistency / controversy / contested action / reversal /
//     vetoed-or-failed signature effort), plus a one-line spotlight theme. The
//     frontend merges document `spotlight` onto the curated window.ACCT_SPOTLIGHT
//     layer and recomputes the Accountability score from the merged drivers, so
//     the score stays data-driven rather than hand-set.
//   • Issue positions — additional `stances` (topic → text) grounded in a real
//     bill or documented public position, skipping any topic already present.
//   • Promise Tracker — genuinely new sponsored-bill / public-commitment promises
//     with clear verdicts, skipping any title already present. Promise counts
//     (kept / pending / broken, top-level and on `accountability`) are recomputed
//     from the merged array so the Promise % stays data-driven.
//
// Honesty rules (matching the rest of the site):
//   • Nothing is invented. Every spotlight item and bill-backed position carries
//     a real {label,url} `source`; verdicts reflect documented outcomes
//     (signed = kept, failed/vetoed/died = broken, introduced/in-progress =
//     pending). Bill numbers, vote tallies, and signing/veto dates were verified
//     against official le.utah.gov bill pages/enrolled copies and corroborated by
//     named Utah reporting (KUER, Utah News Dispatch, Deseret News, Salt Lake
//     Tribune, KSL, USHE, Ballotpedia, ACLU of Utah, the Governor's Office).
//   • The picture is kept balanced: where a contested negative action and a
//     constructive positive action both exist, both are shown. Members of both
//     parties carry at least one critical item where the record supports one.
//   • Substantive duplicates of items already on each profile were dropped so
//     counts are not inflated (each new stance/promise is checked against the
//     existing layer before inclusion).
//   • Idempotent & non-destructive: each run re-fetches the live doc, only adds
//     stances/promises that aren't already there, only writes the integrity theme
//     when an editor hasn't set one, and never clobbers a profile that already
//     carries impact-tagged Spotlight drivers.
//
//   node scripts/deep-dive-utah-legislators-batch3-jun2026.mjs            # dry run (default)
//   node scripts/deep-dive-utah-legislators-batch3-jun2026.mjs --apply    # write to Firestore
// ---------------------------------------------------------------------------

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const STAMP = '2026-06-20T00:00:00.000Z';

// ── Curated, sourced deep-dive data (keyed by Firestore doc id) ──────────────
const DATA = {
  // ── Sen. Jennifer Plumb (D, Senate 9) ─────────────────────────────────────
  jennifer_plumb: {
    theme: "A pediatric ER physician whose legislative record consistently tracks her public-health mission: in 2025 she passed harm-reduction and rural-health measures and broadened workplace anti-harassment law, showing words backed by enacted bills rather than rhetoric.",
    spotlight: [
      { impact: 'positive', category: 'voting', date: '2025', tags: ['Notable Actions', 'Consistency'],
        headline: "Plumb's Workplace Protection Amendments (SB86) signed into law",
        facts: "As chief sponsor of SB86, Workplace Protection Amendments, Plumb expanded the definition of sexual harassment to include harassment based on sex, sexual orientation, and gender identity and made employment confidentiality clauses covering sexual harassment or assault void and unenforceable. Gov. Cox signed it on March 26, 2025.",
        why: 'A minority-party senator delivering a substantive enacted protection shows her advocacy translates into law, not just floor speeches.',
        source: { label: 'Utah Legislature', url: 'https://le.utah.gov/Session/2025/bills/enrolled/SB0086.pdf' } },
      { impact: 'positive', category: 'promise', date: '2025', tags: ['Positive Leadership'],
        headline: 'Rural health-care funding bill (SB256) enrolled and enacted',
        facts: "Plumb was chief sponsor of SB256, General Government and Appropriations Amendments, which redirected money toward improving health-care delivery in rural Utah counties and municipalities and required the state to update its essential health benefits plan. The bill passed both chambers and took effect May 7, 2025.",
        why: 'It demonstrates a Salt Lake City Democrat working appropriations to benefit rural Utah, broadening her health-equity record beyond her home district.',
        source: { label: 'Utah Legislature', url: 'https://le.utah.gov/Session/2025/bills/enrolled/SB0256.pdf' } },
    ],
    stances: {
      'Workplace Harassment Protections': 'Sponsored and passed SB86 (2025) expanding Utah’s sexual-harassment definition to cover sexual orientation and gender identity and voiding NDAs that conceal workplace sexual harassment or assault.',
      'Rural Healthcare Funding': 'Through SB256 (2025) she directed state appropriations toward improving health-care delivery in rural Utah counties, framing rural access as a state responsibility.',
      'Expired Naloxone Immunity': 'In her 2026 SB87, Naloxone Amendments, she sought to extend Good Samaritan liability immunity to the good-faith administration and dispensing of expired opioid-antagonist (naloxone) doses.',
    },
    promises: [
      { title: 'Pass workplace protections against sexual harassment and coercive NDAs', verdict: 'kept',
        detail: 'SB86 (2025), her Workplace Protection Amendments, was signed by Gov. Cox on March 26, 2025, expanding harassment definitions and barring enforcement of confidentiality clauses covering sexual harassment or assault.',
        sources: [{ label: 'Utah Legislature', url: 'https://le.utah.gov/Session/2025/bills/enrolled/SB0086.pdf' }] },
      { title: 'Extend liability protection to administering expired naloxone', verdict: 'pending',
        detail: "Her 2026 SB87, Naloxone Amendments, would extend immunity from civil and criminal liability to the good-faith administration and dispensing of expired opioid antagonists; it was introduced in the 2026 session.",
        sources: [{ label: 'Utah Legislature', url: 'https://le.utah.gov/Session/2026/bills/introduced/SB0087S01.pdf' }] },
    ],
  },

  // ── Sen. Dan McCay (R, Senate 18) ─────────────────────────────────────────
  dmccay: {
    theme: "A conservative tax-committee chair willing to break with his own side — he opposed the governor's Social Security tax cut as 'morally wrong' — while also carrying culture-war legislation like the 2025 flag ban that became law over the governor's objections.",
    spotlight: [
      { impact: 'negative', category: 'leadership', date: '2025', tags: ['Controversy', 'Rhetoric vs Reality'],
        headline: "McCay carried the flag-display ban (HB77) through the Senate",
        facts: "McCay was the Senate sponsor of HB77, Flag Display Amendments, which bars most non-approved flags from schools and government buildings. The Senate passed it 21-8 and the House 53-20; Gov. Cox let it become law without his signature, calling it one of the most divisive bills of the session.",
        why: 'A bill the governor refused to sign and that critics call an overreach into local speech shows McCay championing contested culture-war policy, a key accountability data point.',
        source: { label: 'Utah News Dispatch', url: 'https://utahnewsdispatch.com/2025/03/28/utah-gov-spencer-cox-allows-flag-ban-to-become-law/' } },
      { impact: 'positive', category: 'voting', date: '2025', tags: ['Consistency', 'Notable Actions'],
        headline: 'McCay broke with the governor and his caucus to oppose the Social Security tax cut',
        facts: "As Senate Revenue and Taxation chair, McCay voted against Sen. Wayne Harper's SB71 to cut the state Social Security tax, telling colleagues 'I believe that this bill is morally wrong, and we are hurting our children,' arguing it would consolidate wealth among those over 65 at the expense of younger Utahns.",
        why: "Opposing his own governor's signature proposal on stated principle shows a willingness to take politically costly positions consistent with his fiscal philosophy.",
        source: { label: 'Deseret News', url: 'https://www.deseret.com/politics/2025/03/03/utah-legislature-ignores-governor-cox-recommendation-to-end-state-tax-on-social-security/' } },
    ],
    stances: {
      'Government Flag Neutrality': 'As Senate sponsor of HB77 (2025) McCay backed banning non-approved flags from classrooms and government buildings, framing it as neutralizing government property from political speech.',
      'Social Security Tax Policy': "He opposed SB71's Social Security tax cut as 'morally wrong,' arguing broad senior tax relief consolidates wealth among older Utahns at younger generations' expense — prioritizing across-the-board income-rate cuts instead.",
      'Continued Income Tax Reduction': "In 2026 he introduced SB60 to lower Utah's individual and corporate income tax rate further from 4.5% to 4.45%, continuing his multi-year push to ratchet down the rate.",
    },
    promises: [
      { title: 'Enact a flag-neutrality law for schools and government buildings', verdict: 'kept',
        detail: "After a failed 2024 attempt, McCay carried HB77 through the Senate in 2025 (21-8); it became law without the governor's signature and took effect May 7, 2025.",
        sources: [{ label: 'Utah News Dispatch', url: 'https://utahnewsdispatch.com/2025/03/28/utah-gov-spencer-cox-allows-flag-ban-to-become-law/' }] },
      { title: "Cut Utah's income tax rate again to 4.45%", verdict: 'pending',
        detail: 'McCay introduced SB60 in the 2026 session to lower the individual and corporate income tax rate from 4.5% to 4.45%, effective for tax years beginning in 2026.',
        sources: [{ label: 'Salt Lake Tribune', url: 'https://www.sltrib.com/news/politics/2026/01/20/new-tax-cut-utah-lawmakers-propose/' }] },
    ],
  },

  // ── Sen. Nate Blouin (D, Senate 13) ───────────────────────────────────────
  nate_blouin: {
    theme: "A clean-energy advocate whose marquee grid bill cleared the Senate unanimously but repeatedly stalls in the House, and who in 2025 positioned himself less as an outright nuclear opponent than as a critic of a process he said 'steamrolls' local input.",
    spotlight: [
      { impact: 'negative', category: 'voting', date: '2024', tags: ['Rhetoric vs Reality'],
        headline: "Blouin's signature grid bill (SB191) passed the Senate but died in the House",
        facts: "Blouin's SB191, Grid Enhancing Technologies, requiring large utilities to analyze cost-effective grid-optimization technologies, won unanimous Senate support in 2024 but the House ran out of time and never took it up before the session adjourned March 1, so it failed to become law.",
        why: "His top clean-energy priority remaining unenacted despite his advocacy shows the gap between a minority member's agenda-setting and actual legislative outcomes.",
        source: { label: 'KUER', url: 'https://www.kuer.org/politics-government/2024-03-01/passes-fails-a-recap-of-what-happened-during-utahs-2024-legislative-session' } },
      { impact: 'positive', category: 'statement', date: '2025', tags: ['Notable Actions'],
        headline: 'Blouin pressed for local control in the nuclear-energy fight (HB249)',
        facts: "During debate on HB249, Nuclear Power Amendments, Blouin objected that the bill would steamroll political opposition and divert local tax increments, saying 'I don't think this is an anti-nuclear conversation… it's an anti-process conversation.' The final bill was amended so the new Energy Council 'shall' negotiate with counties and municipalities.",
        why: "He distinguished principled procedural objections from blanket opposition, and the bill's amendment toward mandated local collaboration reflects his influence on the outcome.",
        source: { label: 'Utah News Dispatch', url: 'https://utahnewsdispatch.com/2025/03/06/nuclear-energy-bill-cities-and-counties-fight-for-a-say/' } },
    ],
    stances: {
      'Grid-Enhancing Technology Mandates': 'Through SB191 (2024) Blouin sought to require large utilities to evaluate cost-effective grid-enhancing technologies — dynamic line ratings, power-flow controls, storage — before building new transmission; it passed the Senate unanimously but died in the House.',
      'Nuclear Development Local Control': "On HB249 (2025) he argued the state should not steamroll cities and counties on nuclear-energy zones, pushing for mandatory local collaboration and warning about local tax revenue being diverted to new state entities.",
      'Utility Resource Procurement': 'In September 2025 he formally urged the Utah Public Service Commission to open an investigatory docket and direct PacifiCorp toward an expedited hybrid (renewable-plus-storage) resource procurement process.',
    },
    promises: [
      { title: 'Enact grid-enhancing technology requirements for Utah utilities', verdict: 'broken',
        detail: "Blouin's SB191 (2024) passed the Senate unanimously but died when the House failed to take it up before adjournment, so the grid-enhancing technology mandate did not become law.",
        sources: [{ label: 'KUER', url: 'https://www.kuer.org/politics-government/2024-03-01/passes-fails-a-recap-of-what-happened-during-utahs-2024-legislative-session' }] },
    ],
  },

  // ── Rep. Ray Ward (R, House 19) ───────────────────────────────────────────
  rward: {
    theme: "A family physician whose record is unusually consistent with his moderate, evidence-driven brand: Ward quietly passes pragmatic health, housing, and consumer-energy bills with broad bipartisan votes, more often building consensus than picking fights.",
    spotlight: [
      { impact: 'positive', category: 'voting', date: '2025', tags: ['Notable Actions', 'Bipartisan'],
        headline: "Made Utah the first state to legalize plug-in 'balcony' solar with HB340",
        facts: "Ward's HB340, Solar Power Amendments, created a new legal category for portable solar devices up to 1,200 watts that plug into a standard outlet without utility interconnection fees. It passed the House 72-0 and Senate 27-0 and was signed March 25, 2025; within a year roughly 30 other states drafted copycat bills.",
        why: 'Shows a Republican delivering a low-cost clean-energy win on a unanimous, bipartisan basis rather than along party lines.',
        source: { label: 'pv magazine USA', url: 'https://pv-magazine-usa.com/2025/03/05/balcony-solar-gains-unanimous-bipartisan-support-in-utah/' } },
      { impact: 'positive', category: 'promise', date: '2025', tags: ['Consistency', 'Follow-Through'],
        headline: 'Delivered adoptee birth-record access with HB129, then returned in 2026 to fix it',
        facts: "Ward's HB129, Adoption Records Access Amendments, lets adults adopted as minors obtain their original birth records at 18 without a court hearing, while letting birth parents petition to keep files sealed; it cleared the Senate unanimously and the House with one dissent and was signed in 2025. When courts read it as applying only to future adoptions, Ward passed follow-up legislation in 2026 making records available regardless of the date of the adoption.",
        why: 'Demonstrates accountability through follow-through: he returned to repair his own law when implementation fell short of his stated intent.',
        source: { label: 'KSL.com', url: 'https://www.ksl.com/article/51259011/utah-legislature-passes-bill-to-allow-more-access-to-adoption-records' } },
      { impact: 'positive', category: 'leadership', date: '2025', tags: ['Family Policy'],
        headline: 'HB463 added child-care costs and arrears protections to child support orders',
        facts: "Ward's HB463, Child Support Modifications, signed in 2025, creates a rebuttable presumption that termination-of-parental-rights orders state and allow collection of support arrears and, beginning July 2026, that child-support orders include a recurring ongoing child-care expense, directing the Office of Recovery Services to design the calculation method.",
        why: 'Reflects his consistent pattern of using technical, family-focused policy fixes that affect vulnerable households.',
        source: { label: 'Utah Legislature', url: 'https://le.utah.gov/~2025/bills/static/HB0463.html' } },
    ],
    stances: {
      'Residential Solar & Consumer Energy': 'Ward favors lowering barriers to small-scale residential solar, sponsoring HB340 (2025) to legalize plug-in solar devices up to 1,200 watts without utility fees while building in anti-islanding safety standards.',
      'Adoptee & Birth-Record Rights': "He backs adult adoptees' right to access their own birth and adoption records by default, sponsoring HB129 (2025) to remove the prior requirement of a court hearing while preserving a birth-parent sealing option.",
      'Child Support & Family Law': 'Ward supports strengthening child-support enforcement and recognizing child-care costs, sponsoring HB463 (2025) to add arrears-collection presumptions and a recurring child-care expense to support orders.',
    },
    promises: [
      { title: "Legalize affordable plug-in 'balcony' solar for renters and homeowners", verdict: 'kept',
        detail: 'HB340 Solar Power Amendments created a portable-solar category (up to 1,200W, no interconnection fee) and was signed by Gov. Cox on March 25, 2025, after passing 72-0 in the House and 27-0 in the Senate.',
        sources: [{ label: 'Utah Legislature', url: 'https://le.utah.gov/~2025/bills/static/HB0340.html' }, { label: 'pv magazine USA', url: 'https://pv-magazine-usa.com/2025/03/05/balcony-solar-gains-unanimous-bipartisan-support-in-utah/' }] },
      { title: 'Give adult adoptees access to their own birth records without a court hearing', verdict: 'kept',
        detail: 'HB129 Adoption Records Access Amendments was signed in 2025, letting adoptees 18+ obtain their original records by default while allowing birth parents to petition for sealing.',
        sources: [{ label: 'Utah Legislature', url: 'https://le.utah.gov/~2025/bills/static/HB0129.html' }, { label: 'KSL.com', url: 'https://www.ksl.com/article/51259011/utah-legislature-passes-bill-to-allow-more-access-to-adoption-records' }] },
    ],
  },

  // ── Rep. Jordan Teuscher (R, House 44) ────────────────────────────────────
  jteuscher: {
    theme: "A leadership attorney who frames his work as protecting taxpayers and families, but whose biggest 2025 win — banning public-sector collective bargaining — triggered a record-shattering referendum that suspended his own law and exposed a sharp gap between his 'empowering workers' rhetoric and how workers reacted.",
    spotlight: [
      { impact: 'negative', category: 'leadership', date: '2025', tags: ['Rhetoric vs Reality', 'Controversy'],
        headline: 'His union-bargaining ban (HB267) was suspended after a record referendum drive',
        facts: "Teuscher carried HB267, signed Feb. 14, 2025, prohibiting collective bargaining for public-sector unions. The Protect Utah Workers coalition gathered roughly 320,000 referendum signatures — more than double the threshold and a state record — forcing Gov. Cox to pause the law and place it before voters in November 2026.",
        why: "A flagship 'pro-worker, pro-taxpayer' bill provoking the largest referendum backlash in Utah history is a direct test of words versus public reaction.",
        source: { label: 'KSL.com', url: 'https://www.ksl.com/article/51296213/protect-utah-workers-referendum-announces-320k-signatures-collected-by-deadline' } },
      { impact: 'negative', category: 'statement', date: '2025', tags: ['Rhetoric vs Reality'],
        headline: "After the backlash, accused unions of 'stabbing lawmakers in the back'",
        facts: "Following the referendum, Teuscher wrote that unions 'were willing to stab lawmakers in the back' and 'aren't interested in protecting taxpayers or empowering workers.' The legislature's own fiscal note found HB267's enactment likely wouldn't produce taxpayer savings.",
        why: 'His combative framing, paired with a fiscal note undercutting the taxpayer-savings rationale, invites scrutiny of his stated justification.',
        source: { label: 'Ballotpedia News', url: 'https://news.ballotpedia.org/2025/04/16/protect-utah-workers-submits-signatures-to-the-secretary-of-state-for-veto-referendum/' } },
      { impact: 'positive', category: 'voting', date: '2025', tags: ['Notable Actions', 'Bipartisan'],
        headline: 'HB142 extended in-state tuition to military members, veterans, and families',
        facts: "Teuscher's HB142, Service Member and Veteran Amendments, signed in 2025, removed the residency requirement for in-state tuition at Utah public colleges for active military, veterans, and their families; the University of Utah implemented the change effective Summer 2025.",
        why: 'A concrete, broadly popular benefit delivered to a defined constituency that contrasts with his more divisive measures.',
        source: { label: 'Utah System of Higher Education', url: 'https://ushe.edu/2025-legislative-update-week-4/' } },
    ],
    stances: {
      'Veterans & Military Tuition': 'Teuscher supports waiving residency requirements so active-duty members, veterans, and their families pay in-state tuition at Utah colleges, sponsoring HB142 (2025) to that effect.',
      'Occupational Licensing (Property Managers)': 'He backs new licensing standards for the real-estate sector, sponsoring HB337 (2025) requiring individuals to hold a property-manager license and giving the Real Estate Commission rulemaking authority over them.',
      'County Government Structure': 'Teuscher favors restructuring county governance, sponsoring HB356 (2025) to require council members in certain council-manager counties to be elected from voter districts and to revise commission composition rules.',
    },
    promises: [
      { title: 'Extend in-state college tuition to military members and veterans', verdict: 'kept',
        detail: 'HB142 Service Member and Veteran Amendments was signed in 2025 and removed the residency requirement for in-state tuition for active military, veterans, and their families.',
        sources: [{ label: 'Utah Legislature', url: 'https://le.utah.gov/~2025/bills/static/HB0142.html' }, { label: 'Utah System of Higher Education', url: 'https://ushe.edu/2025-legislative-update-week-4/' }] },
      { title: 'Require licensing for property managers in Utah', verdict: 'kept',
        detail: 'HB337 Property Manager Requirements was signed in 2025, requiring a property-manager license to engage in property management and granting the Real Estate Commission rulemaking authority over the profession.',
        sources: [{ label: 'Utah Legislature', url: 'https://le.utah.gov/~2025/bills/static/HB0337.html' }] },
    ],
  },

  // ── Rep. Candice Pierucci (R, House 49) ───────────────────────────────────
  cpierucci: {
    theme: "A rising conservative who pairs family- and security-themed messaging with hardline action: her 2025 immigration bill advanced a deportation-coordination pipeline that drew ACLU and bipartisan warnings about legal residents, even as she had to strip provisions and narrow it to pass.",
    spotlight: [
      { impact: 'negative', category: 'leadership', date: '2025', tags: ['Controversy', 'Rhetoric vs Reality'],
        headline: 'HB226 reversed a sentencing rule to ease deportations; critics said it swept in legal residents',
        facts: "Pierucci's HB226, Criminal Amendments, raised the maximum sentence for certain class A misdemeanors back to 365 days — the ICE deportation threshold — and required sheriffs and Corrections to coordinate with federal immigration authorities before releasing certain inmates. It stalled in committee, was revived only after she removed provisions (including penalties on nonprofits transporting immigrants) and narrowed it to violent crimes; the ACLU of Utah said it subjects immigrants and refugees — including green card holders and longtime lawful residents — to deportation proceedings for minor offenses.",
        why: "A signature 'public safety' bill that had to be substantially watered down and drew warnings it would harm lawful residents tests the gap between stated aims and effects.",
        source: { label: 'Deseret News', url: 'https://www.deseret.com/opinion/2025/02/28/hb226-targets-legal-immigrants-utah-forsakes-humanity/' } },
      { impact: 'positive', category: 'voting', date: '2025', tags: ['Notable Actions', 'National Security'],
        headline: 'HB430 criminalized straw land purchases by hostile foreign entities near military sites',
        facts: "Pierucci's HB430, Security and Land Restriction Amendments, signed in 2025, creates a third-degree felony for buying land on behalf of a restricted foreign entity (China, Russia, Iran, North Korea) or failing to disclose such ties to a county recorder, and establishes 'food delivery dead zones' on military land. It builds on her earlier laws barring those countries from buying Utah land.",
        why: 'A concrete national-security measure consistent with her stated focus, showing follow-through across multiple sessions.',
        source: { label: 'Utah Legislature', url: 'https://le.utah.gov/~2025/bills/static/HB0430.html' } },
    ],
    stances: {
      'Immigration Enforcement': 'Pierucci supports aligning Utah with federal deportation efforts, sponsoring HB226 (2025) to restore the 365-day misdemeanor sentence ceiling and require sheriffs and Corrections to coordinate with immigration authorities before releasing unlawfully-present individuals.',
      'Foreign Land & Military Security': 'She favors restricting hostile foreign entities from acquiring Utah land, sponsoring HB430 (2025) creating a felony for undisclosed purchases on behalf of China, Russia, Iran, or North Korea and protections around military installations.',
      'Pretrial Detention of Noncitizens': 'Through HB226 (2025), she backs treating immigrants lacking permanent status as flight risks in pretrial-release decisions, effectively keeping more accused noncitizens detained before trial.',
    },
    promises: [
      { title: 'Block hostile foreign entities from secretly buying land near Utah military bases', verdict: 'kept',
        detail: "HB430 Security and Land Restriction Amendments was signed in 2025, making it a third-degree felony to buy land for, or hide ties to, a restricted foreign entity and creating military 'food delivery dead zones.'",
        sources: [{ label: 'Utah Legislature', url: 'https://le.utah.gov/~2025/bills/static/HB0430.html' }] },
      { title: 'Strengthen coordination with ICE to deport noncitizens who commit crimes', verdict: 'kept',
        detail: 'HB226 Criminal Amendments was signed in 2025 (effective May 7), restoring the 365-day misdemeanor threshold and mandating sheriff/Corrections coordination with federal immigration authorities — though it was narrowed to violent offenses to pass.',
        sources: [{ label: 'Utah Legislature', url: 'https://le.utah.gov/~2025/bills/static/HB0226.html' }, { label: 'Deseret News', url: 'https://www.deseret.com/opinion/2025/02/28/hb226-targets-legal-immigrants-utah-forsakes-humanity/' }] },
    ],
  },

  // ── Rep. Trevor Lee (R, House 16) ─────────────────────────────────────────
  tlee: {
    theme: "A combative hard-right culture warrior who delivered Utah's first-in-the-nation school flag ban into law, but whose record is shadowed by inflammatory floor remarks, repeatedly rejected health bills, and a 2026 admission that he 'behaved dishonestly' in a past job.",
    spotlight: [
      { impact: 'positive', category: 'voting', date: '2025', tags: ['Notable Actions', 'Enacted Legislation'],
        headline: "Lee's signature flag-display ban (HB77) became law, a national first",
        facts: "Lee's HB77 passed the House 49-20 and the Senate 21-8, with the House concurring 53-20; it became law without Gov. Cox's signature and took effect May 7, 2025, making Utah the first state to restrict flags in schools and government buildings.",
        why: 'Whatever one thinks of the policy, it is a concrete, fully-enacted legislative accomplishment with a documented vote record.',
        source: { label: 'Utah News Dispatch', url: 'https://utahnewsdispatch.com/2025/03/06/utah-bans-pride-flags-schools-public-buildings/' } },
      { impact: 'negative', category: 'statement', date: '2025', tags: ['Controversy', 'Rhetoric vs Reality'],
        headline: "Lee told committee Nazi and Confederate flags could be displayed under HB77's educational exception",
        facts: "During a House Education Committee hearing on HB77, Lee said a Nazi flag or Confederate flag could be displayed for approved curriculum; he later disputed the Salt Lake Tribune's reporting of his own quoted words, accusing the paper of spreading lies.",
        why: 'His attempt to discredit accurate reporting of his on-the-record statements speaks directly to candor and accountability.',
        source: { label: 'Utah News Dispatch', url: 'https://utahnewsdispatch.com/2025/03/01/critics-decry-government-overreach-bill-to-ban-pride-flags-from-schools-advances/' } },
      { impact: 'negative', category: 'ethics', date: '2026', tags: ['Controversy', 'Ethics'],
        headline: 'Lee admitted past check fraud; faced an abuse-of-power accusation',
        facts: "In April 2026, two businessmen accused Lee of altering checks (about $3,100) in a former job and of using his legislative office to seek contracts; Lee admitted he behaved dishonestly and made restitution on the check matter, while denying the abuse claims. A related Enevive federal lawsuit filed November 2025 was later dismissed by mutual agreement.",
        why: "A sitting lawmaker's own admission of past dishonesty, plus a House Speaker review, is core accountability information for voters.",
        source: { label: 'Deseret News', url: 'https://www.deseret.com/politics/2026/04/15/2-businessmen-accuse-rep-trevor-lee-of-abuse-of-power-altering-checks-in-past-job/' } },
    ],
    stances: {
      'Immigration & Public Benefits': "Lee sponsored HB88 (2026) to bar undocumented immigrants from a wide range of state benefits — WIC, senior meal delivery, housing aid, homeless services and vaccination programs — saying he wants Utah to help crack down and pressure people to self-deport.",
      'Ivermectin & Medical Freedom': 'Lee sponsored HB96 (2025) to let pharmacists dispense ivermectin over-the-counter without a prescription, framing it as medical choice; the House Health and Human Services Committee rejected it 5-7.',
    },
    promises: [
      { title: 'Strip publicly funded benefits from undocumented immigrants', verdict: 'broken',
        detail: 'Lee’s HB88 cleared committee 7-3 but stalled on the House floor in the 2026 session; he salvaged some provisions by moving them into an unrelated bill, HB386, rather than passing HB88 itself.',
        sources: [{ label: 'Utah News Dispatch', url: 'https://utahnewsdispatch.com/2026/01/15/utah-lawmaker-wants-to-cut-off-resources-for-undocumented-immigrants-to-self-deport/' }, { label: 'ACLU of Utah', url: 'https://www.acluutah.org/legislation/hb88-public-assistance-amendments/' }] },
    ],
  },

  // ── Rep. Ken Ivory (R, House 39) ──────────────────────────────────────────
  kivory: {
    theme: "A relentless ideological entrepreneur of federalism, sound money and 'sensitive materials' laws who notches headline-grabbing bills, but whose signature 2025 gold-payment measure was vetoed and whose book-restriction laws have drawn a First Amendment lawsuit testing whether his crusades survive contact with the courts.",
    spotlight: [
      { impact: 'negative', category: 'voting', date: '2025', tags: ['Setback', 'Rhetoric vs Reality'],
        headline: "Ivory's first-in-nation gold/silver vendor-payment bill (HB306) was vetoed",
        facts: "HB306 passed the House 71-0 and Senate 22-4, but Gov. Cox vetoed it on March 27, 2025, calling it operationally impracticable; despite Ivory's push for an override, legislative leaders declined a veto-override session on May 1, 2025, so it never became law.",
        why: "A flagship priority that cleared both chambers yet died at the governor's desk shows the gap between Ivory's legislative wins and durable policy.",
        source: { label: 'KUER', url: 'https://www.kuer.org/politics-government/2025-03-31/here-are-the-6-vetoes-gov-cox-issued-for-the-2025-session' } },
      { impact: 'negative', category: 'leadership', date: '2026', tags: ['Controversy', 'Legal Challenge'],
        headline: "Ivory's sensitive-materials law (HB29) hit with an ACLU First Amendment lawsuit",
        facts: "On Jan. 6, 2026, the ACLU of Utah, authors and two anonymous students sued in U.S. District Court for the District of Utah over Ivory's HB29, which allows statewide book bans; 22 titles had been removed. Ivory, the chief sponsor, told the ACLU to take a deep breath, calling the law common sense.",
        why: 'His leading law now faces a constitutional test, a key accountability marker for whether his approach holds up legally.',
        source: { label: 'Deseret News', url: 'https://www.deseret.com/utah/2026/01/06/aclu-utah-files-complaint-over-hb29-school-library-books/' } },
      { impact: 'positive', category: 'leadership', date: '2025', tags: ['Notable Actions', 'Sound Money'],
        headline: 'Ivory advanced Utah’s sound-money agenda with unanimous House passage of HB306',
        facts: "Building on his 2024 precious-metals investment work (HB348), Ivory's HB306 won unanimous 71-0 House support and 22-4 Senate passage, positioning Utah as a national sound-money leader even though the governor ultimately vetoed it.",
        why: "The lopsided legislative votes credit Ivory's effectiveness at building consensus inside the building, separate from the eventual veto.",
        source: { label: 'Tenth Amendment Center', url: 'https://blog.tenthamendmentcenter.com/2025/02/utah-house-passes-bill-to-create-gold-and-silver-backed-payment-system-for-state-vendors/' } },
    ],
    stances: {
      'School Library Book Restrictions': "Ivory is the architect of Utah's 'sensitive materials' law (HB29, 2024), which lets a book be banned statewide if deemed inappropriate by three districts (or two districts plus five charters); he defends it as protecting children from explicit content, not censorship.",
      'Sexual Content in Higher Education': "Ivory sponsored HB556 (2024) to define and restrict 'pornography courses' at Utah colleges, responding to a controversial Westminster College film course; the bill defined the targeted courses but did not become law.",
    },
    promises: [
      { title: 'Enact a state gold- and silver-backed vendor payment system', verdict: 'broken',
        detail: "Ivory's HB306 passed both chambers in 2025 but was vetoed by Gov. Cox on March 27, 2025; lawmakers declined to hold an override session, so the precious-metals payment system was never created.",
        sources: [{ label: 'Utah News Dispatch', url: 'https://utahnewsdispatch.com/2025/03/28/cox-vetoes-four-more-bills-rejecting-tax-policy-and-gold-legislation/' }, { label: 'KPCW', url: 'https://www.kpcw.org/state-regional/2025-05-02/no-veto-override-session-this-year-utah-legislative-leaders-say' }] },
      { title: "Restrict 'pornography courses' at Utah colleges", verdict: 'broken',
        detail: "Ivory's HB556 (2024), Sexually Oriented Business Regulations for Higher Education, defined and restricted such courses but was listed by the Utah System of Higher Education in its final 2024 update as not passed.",
        sources: [{ label: 'USHE Final 2024 Update', url: 'https://ushe.edu/final-2024-legislative-update-week-7/' }] },
    ],
  },

  // ── Rep. Casey Snider (R, House 5, Majority Leader) ───────────────────────
  csnider: {
    theme: "A farmer and volunteer firefighter who rose to House Majority Leader in June 2025 and pairs broadly popular, unanimously passed natural-resource laws with a hardball willingness to leverage his power — even threatening unrelated projects — to force action on the Great Salt Lake.",
    spotlight: [
      { impact: 'positive', category: 'voting', date: '2025', tags: ['Notable Actions', 'Consistency'],
        headline: "Snider's firefighter cancer bill (HB65) passed unanimously and was signed into law",
        facts: "HB65 expanded firefighters' presumptive occupational cancers from 4 to 15 and funded no-cost screenings (about $3.7M over three years); the Senate passed it 25-0 with unanimous House concurrence, and Gov. Cox signed it March 5, 2025. Snider, a volunteer firefighter, called it the nation's most robust firefighter cancer program.",
        why: "A unanimous, signed law tied to Snider's own lived experience demonstrates effective, consensus-driven legislating.",
        source: { label: "Governor's Office", url: 'https://governor.utah.gov/press/governor-and-lawmakers-expand-cancer-screening-for-firefighters/' } },
      { impact: 'positive', category: 'leadership', date: '2025', tags: ['Leadership'],
        headline: 'Snider elected House Majority Leader in June 2025',
        facts: "Utah House Republicans elected Snider, R-Paradise, Majority Leader on June 3, 2025, succeeding Jefferson Moss; one of the youngest to hold the post, he said he would help colleagues advance conservative water, energy, land-use and housing policy.",
        why: "Ascending to the chamber's No. 2 post sharply raises his influence and the accountability stakes for how he wields it.",
        source: { label: 'Salt Lake Tribune', url: 'https://www.sltrib.com/news/politics/2025/06/03/republicans-utah-house-elected-new/' } },
      { impact: 'negative', category: 'statement', date: '2026', tags: ['Controversy', 'Hardball Tactics'],
        headline: "Snider threatened to block a homeless campus over Great Salt Lake 'broken promises'",
        facts: "In February 2026, Majority Leader Snider publicly threatened to hold up a homeless services campus, citing what he called broken promises on Great Salt Lake action — using leverage over an unrelated project to pressure colleagues on his priority.",
        why: 'Using leadership power to condition unrelated projects raises questions about the line between principled advocacy and coercive tactics.',
        source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/2026/feb/10/blaming-broken-promises-for-great-salt-lake-lawmaker-threatens-to-block-homeless-campus/' } },
    ],
    stances: {
      'Water Rights Doctrine Reform': "Snider's HB453 (2024) ended the special exemption that let Great Salt Lake water be treated as 'wasted' and freely appropriated, bringing the lake under the state's standard 'first in time, first in right' priority system so extractors face cuts in dry years; it passed the House unanimously.",
      'Mineral Extraction Severance Tax': 'Through HB453, Snider tripled the severance tax on Great Salt Lake mineral extraction from 2.6% to 7.8% (with reductions tied to voluntary water-saving agreements), drawing opposition from the Utah Taxpayers Association and some Republicans who said it taxed the wrong activity.',
    },
    promises: [
      { title: "Strengthen the state engineer's authority to protect watersheds", verdict: 'kept',
        detail: 'Snider sponsored HB311 (2025), Watershed Amendments, broadening the state engineer’s power to prevent waste, pollution, or contamination of water as part of his natural-resources agenda.',
        sources: [{ label: 'S.J. Quinney College of Law (Utah)', url: 'https://www.law.utah.edu/news-articles/great-salt-lake-legislative-update-march-5-2025/' }] },
    ],
  },

  // ── Rep. Doug Fiefia (R, House 48) ────────────────────────────────────────
  doug_fiefia: {
    theme: "A former Google salesman turned freshman Republican who built a national reputation regulating Big Tech, Fiefia delivers when bipartisan consensus exists (his 2026 data-portability law was signed) but watched his boldest child-safety AI bills stall in 2026 — one circled to death in his own House, another killed in the Senate.",
    spotlight: [
      { impact: 'positive', category: 'promise', date: '2026', tags: ['Notable Actions', 'Follow-Through'],
        headline: 'Followed up his 2025 data law with HB408 to refine data portability, signed into law',
        facts: "HB408, Data Sharing Amendments, lets users transfer selected portions of their social media data in real time and adds consent protections. It passed the House 66-1 and the Senate 23-2, the House concurred 70-1, and Gov. Cox signed it March 23, 2026.",
        why: 'Shows Fiefia did the unglamorous follow-through work to make his signature 2025 Digital Choice Act workable before its July 2026 effective date.',
        source: { label: 'Utah Legislature', url: 'https://le.utah.gov/~2026/bills/static/HB0408.html' } },
      { impact: 'negative', category: 'promise', date: '2026', tags: ['Promise Stalled', 'High-Profile Failure'],
        headline: 'Flagship AI child-safety transparency bill HB286 died without a floor vote',
        facts: "HB286, AI Transparency Act, would have required frontier AI developers to publish child-protection and safety plans and shield whistleblowers. It cleared House committee 8-0 but was circled on the House floor and never received a floor vote, dying when the session ended amid documented White House opposition.",
        why: 'A marquee child-safety promise collapsed without a floor vote — a real gap between Fiefia’s AI-safety rhetoric and the 2026 outcome, even if external pressure drove it.',
        source: { label: 'Utah Legislature', url: 'https://le.utah.gov/~2026/bills/static/HB0286.html' } },
      { impact: 'negative', category: 'voting', date: '2026', tags: ['Rhetoric vs Reality'],
        headline: 'Companion Chatbot Safety Act passed the House 68-1 but failed in the Senate',
        facts: "HB438 required companion-chatbot operators to disclose non-human status, add suicide/self-harm safeguards, and protect minor users. It passed the House 68-1 on Feb. 20, 2026, but after multiple late substitutes the final version failed on the Senate floor 12-15-2 on March 5, 2026.",
        why: "Despite Fiefia's strong public framing of chatbot child-safety, the bill could not survive the Senate, leaving the protections unenacted.",
        source: { label: 'Utah Legislature', url: 'https://le.utah.gov/~2026/bills/static/HB0438.html' } },
    ],
    stances: {
      'Frontier AI Transparency & Whistleblower Protection': 'Fiefia argues the largest AI developers should be legally required to publish public safety and child-protection plans and that employees who report safety risks deserve anti-retaliation protections, the core of his HB286 (2026).',
      'Companion Chatbot Regulation': 'Through HB438 (2026) he pushed to force AI companion chatbots to disclose they are not human, build in suicide/self-harm response protocols, and add special safeguards and three-hour reminders for minor users.',
      'Proactive (Not Reactive) Tech Regulation': 'A self-described pro-free-market Republican, Fiefia contends government must regulate AI early rather than repeat its slow response to social media, and opposes a federal moratorium that would block states from regulating AI.',
    },
    promises: [
      { title: 'Refine the Digital Choice Act with real-time, selective data portability', verdict: 'kept',
        detail: 'HB408 (2026) allows users to transfer selected portions of their social media data in real time with consent safeguards; it passed the House 66-1 and Senate 23-2 and was signed by Gov. Cox on March 23, 2026.',
        sources: [{ label: 'Utah Legislature', url: 'https://le.utah.gov/~2026/bills/static/HB0408.html' }] },
      { title: 'Require frontier AI companies to publish child-safety plans and protect whistleblowers', verdict: 'broken',
        detail: 'HB286 (2026) passed House committee 8-0 but was circled on the House floor, never got a floor vote, and died at session’s end amid White House opposition.',
        sources: [{ label: 'Utah Legislature', url: 'https://le.utah.gov/~2026/bills/static/HB0286.html' }, { label: 'Utah Policy', url: 'https://utahpolicy.com/news-release/76551-rep-doug-fiefia-introduces-legislation-to-protect-children-and-public-from-artificial-intelligence' }] },
      { title: 'Enact companion-chatbot safety rules to protect minors', verdict: 'broken',
        detail: 'HB438 (2026) passed the House 68-1 but its final substitute failed on the Senate floor 12-15-2 on March 5, 2026, so the chatbot safeguards were not enacted.',
        sources: [{ label: 'Utah Legislature', url: 'https://le.utah.gov/~2026/bills/static/HB0438.html' }] },
    ],
  },

  // ── Rep. Jake Fitisemanu (D, House 30) ────────────────────────────────────
  jake_fitisemanu: {
    theme: "A public-health professional and the first Samoan elected to Utah's Legislature, Fitisemanu lands occasional wins in the GOP supermajority (his Medicare bill was signed) but most of his 2025–2026 agenda — imitation-firearm safety, traditional healing, car-seat rules — passed the House only to die in the Senate, a structural reality for a freshman Democrat.",
    spotlight: [
      { impact: 'positive', category: 'leadership', date: '2026', tags: ['Cultural Representation', 'Notable Actions'],
        headline: 'Won bipartisan House passage for Traditional Healing Amendments before it stalled',
        facts: "HB277 (2026) clarified that traditional healing providers offering traditional healing services do not need a professional license. It passed the House 51-18 and cleared Senate committee 4-1, but the Senate struck its enacting clause on March 6, 2026, killing it.",
        why: 'Reflects Fitisemanu translating his Pacific Islander community advocacy into legislation that won majority House support even though it ultimately died.',
        source: { label: 'Utah Legislature', url: 'https://le.utah.gov/~2026/bills/static/HB0277.html' } },
      { impact: 'negative', category: 'promise', date: '2026', tags: ['Persistence', 'Repeated Failure'],
        headline: 'Re-ran his imitation-firearm safety bill in 2026 after it died in 2025 — and it died again',
        facts: "Fitisemanu's HB187 (2025), creating an infraction for minors who repeatedly carry realistic imitation firearms after a warning, passed the House 57-11 but died in the Senate. He reintroduced it as HB83 (2026), which was held in House committee (9-0 to hold) and never advanced.",
        why: 'Shows persistence on a public-safety issue tied to his West Valley community, but also a pattern of bills that cannot clear the finish line.',
        source: { label: 'Utah Legislature', url: 'https://le.utah.gov/~2025/bills/static/HB0187.html' } },
      { impact: 'negative', category: 'voting', date: '2026', tags: ['Limited Effectiveness'],
        headline: 'Child car-seat safety bill HB574 passed neither chamber',
        facts: "HB574 (2026) would have set child-restraint requirements by a child's age and size and required children under 13 to ride in the rear seat when possible. The bill stalled in the House and was filed without passage at session's end.",
        why: 'Another public-health priority that failed to advance, underscoring how little of his agenda becomes law in the supermajority.',
        source: { label: 'Utah Legislature', url: 'https://le.utah.gov/~2026/bills/static/HB0574.html' } },
    ],
    stances: {
      'Imitation Firearm Safety for Minors': 'Fitisemanu backs a graduated, warning-first infraction for minors who repeatedly carry realistic look-alike or altered toy firearms in public, a response to officer-safety concerns raised by West Valley police (HB187/2025, HB83/2026).',
      'Traditional & Cultural Healing Access': 'Through HB277 (2026) he sought to clarify that traditional healing providers are not required to hold a professional license, protecting culturally based healing practices.',
      'Child Passenger Safety': "His HB574 (2026) would tie child car-seat and booster requirements to a child's age and size and keep children under 13 in the back seat when possible.",
    },
    promises: [
      { title: 'Pass imitation-firearm safety protections for minors', verdict: 'broken',
        detail: 'HB187 (2025) passed the House 57-11 but died in the Senate; the 2026 re-run, HB83, was held in House committee and never advanced.',
        sources: [{ label: 'Utah Legislature', url: 'https://le.utah.gov/~2025/bills/static/HB0187.html' }, { label: 'Utah Legislature', url: 'https://le.utah.gov/~2026/bills/static/HB0083.html' }] },
      { title: 'Protect unlicensed traditional healing practices', verdict: 'broken',
        detail: 'HB277 (2026) passed the House 51-18 and Senate committee 4-1, but the Senate struck the enacting clause on March 6, 2026, so it did not become law.',
        sources: [{ label: 'Utah Legislature', url: 'https://le.utah.gov/~2026/bills/static/HB0277.html' }] },
    ],
  },

  // ── Rep. Stephanie Gricius (R, House 50) ──────────────────────────────────
  stephanie_gricius: {
    theme: "A prolific, often-controversial conservative who sponsored or co-sponsored roughly 29 bills in 2025, Gricius pairs reliable legislative output (occupational-licensing reform and a moderate-income-housing bill both signed) with a notable 2026 stumble: her patient-disclosure bill HB164 passed unanimously through both chambers only to be vetoed by Gov. Cox.",
    spotlight: [
      { impact: 'positive', category: 'leadership', date: '2025', tags: ['Notable Actions', 'Consistency'],
        headline: 'Signed occupational-licensing reform opening more pathways to professional licensure',
        facts: "HB160 (2025) amended licensing processes for architects, environmental health scientists, land surveyors, accountants, and geologists and required multiple pathways to architect licensure. It passed the House 73-0 and Senate 21-0 and was signed March 25, 2025.",
        why: 'Demonstrates Gricius delivering on her small-business/deregulation brand with broadly supported, enacted policy.',
        source: { label: 'Utah Legislature', url: 'https://le.utah.gov/~2025/bills/static/HB0160.html' } },
      { impact: 'negative', category: 'promise', date: '2026', tags: ['Veto', 'Setback'],
        headline: 'Patient-rights disclosure bill HB164 passed unanimously but was vetoed by Gov. Cox',
        facts: "HB164 (2026) would have required health care providers to tell patients how to file a complaint with the Division of Professional Licensing and limited nondisclosure clauses blocking such complaints. It passed the House 72-0 and Senate 24-0, but Gov. Cox vetoed it on March 26, 2026 — one of only two vetoes that session.",
        why: 'A rare gubernatorial veto of a near-unanimous bill marks a high-profile failure for a flagship Gricius patient-protection effort.',
        source: { label: 'Utah Legislature', url: 'https://le.utah.gov/~2026/bills/static/HB0164.html' } },
      { impact: 'positive', category: 'promise', date: '2026', tags: ['Notable Actions'],
        headline: 'Moderate-income housing infrastructure bill HB436 signed into law',
        facts: "HB436 (2026) modified moderate-income housing reporting and prioritized infrastructure consideration for cities that grow housing supply. It passed the House 65-0, the House concurred with Senate changes 64-0, and Gov. Cox signed it March 23, 2026.",
        why: 'Shows Gricius engaging constructively on housing affordability with a bill that actually became law.',
        source: { label: 'Utah Legislature', url: 'https://le.utah.gov/~2026/bills/static/HB0436.html' } },
    ],
    stances: {
      'Occupational Licensing Reform': 'Gricius favors loosening rigid licensure rules and maintaining multiple pathways into regulated professions, as enacted in HB160 (2025) covering architects, surveyors, accountants and others.',
      'Patient Reporting & Provider Accountability': 'Through HB164 (2026) she sought to require providers to inform patients how to report misconduct to the Division of Professional Licensing and to curb nondisclosure clauses that silence such complaints — though the bill was vetoed.',
      'Moderate-Income Housing Policy': 'Her HB436 (2026) reworked moderate-income housing reporting requirements and gave infrastructure priority to municipalities that measurably increase housing supply.',
    },
    promises: [
      { title: 'Streamline professional licensing and preserve multiple licensure pathways', verdict: 'kept',
        detail: 'HB160 (2025) passed the House 73-0 and Senate 21-0 and was signed March 25, 2025, amending licensing procedures across several professions.',
        sources: [{ label: 'Utah Legislature', url: 'https://le.utah.gov/~2025/bills/static/HB0160.html' }] },
      { title: 'Require providers to disclose how patients can report misconduct to DOPL', verdict: 'broken',
        detail: 'HB164 (2026) passed the House 72-0 and Senate 24-0 but was vetoed by Gov. Cox on March 26, 2026, so it did not become law.',
        sources: [{ label: 'Utah Legislature', url: 'https://le.utah.gov/~2026/bills/static/HB0164.html' }] },
      { title: 'Reform moderate-income housing reporting and infrastructure priority', verdict: 'kept',
        detail: 'HB436 (2026) passed the House 65-0, was concurred 64-0, and signed by Gov. Cox on March 23, 2026.',
        sources: [{ label: 'Utah Legislature', url: 'https://le.utah.gov/~2026/bills/static/HB0436.html' }] },
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
  console.log(`PolitiDex — Utah legislator multi-layer deep dive (batch 3)  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
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
      console.log(`  • ${id} (${doc.name}): already has Spotlight drivers — leaving spotlight untouched`);
      skippedDrivers++;
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
