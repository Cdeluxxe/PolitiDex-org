#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — June 2026 multi-layer deep dive on sitting Utah legislators (batch 2)
//
// A roster audit of the live Firestore `politicians` collection found that of
// the 59 CURRENT sitting Utah State Representatives and Senators, 47 still had
// no Accountability / Spotlight integrity layer (zero impact-tagged drivers),
// even though their Promise and Issue-position layers were already developed.
// The first June 2026 deep dive (deep-dive-utah-legislators-jun2026.mjs) built
// out ten of those officeholders. This batch continues the work on ten more,
// building THREE layers at once for each, from genuine sourced research:
//
//   • Spotlight / Accountability — 2–4 sourced integrity highlights per figure
//     (impact: positive = words match actions, negative = inconsistency /
//     controversy / contested action / reversal), plus a one-line spotlight
//     theme. The frontend merges document `spotlight` onto the curated
//     window.ACCT_SPOTLIGHT layer and recomputes the Accountability score.
//   • Issue positions — additional `stances` (topic → text) grounded in a real
//     bill or documented public position, skipping any topic already present.
//   • Promise Tracker — genuinely new sponsored-bill / public-commitment
//     promises with clear verdicts, skipping any title already present. Promise
//     counts (kept / pending / broken, top-level and on `accountability`) are
//     recomputed from the merged array so the Promise % stays data-driven.
//
// Honesty rules (matching the rest of the site):
//   • Nothing is invented. Every spotlight item and bill-backed position carries
//     a real {label,url} `source`; verdicts reflect documented outcomes
//     (signed = kept, failed/vetoed/died = broken, in-progress = pending).
//   • Substantive duplicates of items already on each profile were dropped so
//     counts are not inflated (each new stance/promise was checked against the
//     existing layer before inclusion).
//   • Where a contested negative action and a constructive positive action both
//     exist, both are shown so the picture is balanced rather than one-sided.
//   • Idempotent & non-destructive: each run re-fetches the live doc, only adds
//     stances/promises that aren't already there, only writes the integrity
//     theme when an editor hasn't set one, and never clobbers a profile that
//     already carries impact-tagged Spotlight drivers.
//
//   node scripts/deep-dive-utah-legislators-batch2-jun2026.mjs            # dry run (default)
//   node scripts/deep-dive-utah-legislators-batch2-jun2026.mjs --apply    # write to Firestore
// ---------------------------------------------------------------------------

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const STAMP = '2026-06-20T00:00:00.000Z';

// ── Curated, sourced deep-dive data (keyed by Firestore doc id) ──────────────
const DATA = {
  spitcher: {
    theme: "A criminal-defense attorney who became Utah's most effective minority-party legislator by trading partisan fights for pragmatic, bipartisan wins — though her boldest consumer- and environmental-protection bills still die when they brush against business interests.",
    spotlight: [
      { impact: 'positive', category: 'voting', date: '2025', tags: ['Notable Actions', 'Positive Leadership'],
        headline: 'Most successful Democrat in the Legislature, passing 14 bills in a GOP supermajority',
        facts: "In the 2025 general session Pitcher passed 14 bills — more than any other Democrat and more than all but a handful of Republicans in either chamber. She credits the record to her experience as both a prosecutor and a defense attorney and a willingness to work across the aisle, with measures spanning unlawful vehicle polluters, childcare for state employees, and a ban on shackling pregnant inmates.",
        why: 'Rare cross-aisle effectiveness for a minority-party member is a concrete measure of legislative competence, not just rhetoric.',
        source: { label: 'The 19th', url: 'https://19thnews.org/2025/04/stephanie-pitcher-utah-chess-champion-democrat/' } },
      { impact: 'positive', category: 'voting', date: '2026', tags: ['Notable Actions', 'Consistency'],
        headline: 'Closed a vehicle-emissions loophole with a near-unanimous bipartisan bill',
        facts: "Pitcher's SB208 (2026), Vehicle Emission Inspection Program Revisions, lets the Motor Vehicle Division revoke registrations from owners who use false or improper addresses to dodge emissions testing. The bill passed the Senate 25-0 and the House 66-0 before heading to the governor, with air-quality advocates backing it as closing a known testing-evasion loophole.",
        why: 'Her stated air-quality priorities translated into enacted, broadly supported policy.',
        source: { label: 'Utah Legislature', url: 'https://le.utah.gov/~2026/bills/static/SB0208.html' } },
      { impact: 'negative', category: 'promise', date: '2025–2026', tags: ['Rhetoric vs Reality'],
        headline: 'Two sessions running, her electric-landscaping mandate died at the finish line',
        facts: "Pitcher's bid to require state agencies to buy electric landscaping equipment for smaller urban-county properties failed both years: SB124 ran out of time on the final night of 2025, and its successor SB176 died by a single vote on the House floor in 2026.",
        why: 'A signature environmental promise remains unfulfilled despite repeated attempts, underscoring the limits of minority-party influence on contested policy.',
        source: { label: 'KUER', url: 'https://www.kuer.org/politics-government/2026-03-06/passes-fails-heres-what-happened-in-utahs-2026-legislative-session' } },
    ],
    stances: {
      'Air Quality & Emissions Enforcement': 'Backs tougher enforcement against drivers who evade vehicle emissions testing; her SB208 (2026) gave the state authority to revoke registrations obtained with false addresses to dodge inspections.',
      'Algorithmic Pricing & Consumer Protection': "Supports requiring businesses to disclose when prices are set by algorithms using a customer's personal data, though her SB177 (2026) Product Pricing Amendments failed to pass.",
      'Electric Equipment Procurement': 'Favors requiring state agencies to replace gas-powered landscaping equipment with electric models on smaller urban-county properties; her SB176 (2026) failed by one vote in the House.',
    },
    promises: [
      { title: 'Require disclosure when retailers use personal-data-driven algorithmic pricing', verdict: 'broken',
        detail: "SB177 (2026), Product Pricing Amendments, would have required suppliers to display a disclaimer when using algorithmic pricing based on a consumer's personal data; the bill failed and was filed among bills not passed in the 2026 session.",
        sources: [{ label: 'LegiScan', url: 'https://legiscan.com/UT/bill/SB0177/2026' }] },
      { title: 'Mandate electric landscaping equipment for state properties in urban counties', verdict: 'broken',
        detail: 'SB176 (2026), Landscaping Procurement Amendments, required electric-powered equipment for smaller state properties in first- and second-class counties; it died by a single vote on the House floor, mirroring the 2025 failure of its predecessor SB124.',
        sources: [{ label: 'KUER', url: 'https://www.kuer.org/politics-government/2026-03-06/passes-fails-heres-what-happened-in-utahs-2026-legislative-session' }] },
    ],
  },

  brady_brammer: {
    theme: "A Republican attorney who frames his fights with Utah's judiciary as principled separation-of-powers reform, even as critics note those reforms repeatedly track his own displeasure with court rulings — most pointedly the one blocking Utah's abortion ban.",
    spotlight: [
      { impact: 'negative', category: 'redflags', date: '2025', tags: ['Rhetoric vs Reality', 'Public Statements'],
        headline: 'Pushed court-rule changes tied to his frustration over the abortion-ban injunction',
        facts: "Brammer sponsored SB204 (2025), Right to Appeal Amendments, letting the state seek a 'suspensive appeal' to reinstate a law a court has enjoined unless challengers prove unconstitutionality by clear and convincing evidence. Reporting tied the effort to the ongoing case blocking Utah's near-total abortion ban, and noted he had previously pushed a retroactive court-rule change targeting a judge's abortion ruling. Critics called the package a 'power grab' against the courts; the bill was signed March 26, 2025.",
        why: 'When a lawmaker repeatedly rewrites court rules after losing in court, it raises questions about whether the reforms serve neutral principle or specific outcomes.',
        source: { label: 'Utah News Dispatch', url: 'https://utahnewsdispatch.com/2025/02/07/power-grab-courts-utah-bill-raise-bar-alleged-unconstitutional-laws/' } },
      { impact: 'negative', category: 'redflags', date: '2025', tags: ['Public Behavior', 'Rhetoric vs Reality'],
        headline: 'His judiciary overhaul drew protest from 900+ attorneys and a governor’s veto',
        facts: "Brammer's slate of 2025 judiciary bills, including SB203 (standing) and SB204 (appeals), was part of a broader push that more than 900 Utah attorneys signed a letter opposing. A companion measure, SB296, which would have subjected the chief justice to gubernatorial reappointment every four years, was vetoed by Gov. Cox, and legislative leaders ultimately struck a deal with the judiciary to drop several of the most contested bills.",
        why: 'Sustained, bipartisan legal-community pushback and a gubernatorial veto signal his reforms tested the boundaries of separation of powers.',
        source: { label: 'Utah News Dispatch', url: 'https://utahnewsdispatch.com/2025/02/07/power-grab-courts-utah-bill-raise-bar-alleged-unconstitutional-laws/' } },
      { impact: 'positive', category: 'voting', date: '2025', tags: ['Notable Actions'],
        headline: 'Delivered on his stated goal of speeding state appeals of injunctions',
        facts: "Brammer argued SB204 was about speeding up the court process so laws are not paused indefinitely without good reason. The enacted third substitute requires judges to resolve doubts in favor of constitutionality and state their reasoning, and lets the state take an enjoined law straight to the Utah Supreme Court; it passed both chambers and was signed into law.",
        why: 'Whatever the controversy, he openly stated his objective and enacted a concrete mechanism matching it — a case of words matching legislative action.',
        source: { label: 'Utah Legislature', url: 'https://le.utah.gov/~2025/bills/static/SB0204.html' } },
    ],
    stances: {
      'Judicial Standing & Appeals': 'Argues courts too readily enjoin enacted laws and should presume constitutionality; his SB203 (standing) and SB204 Right to Appeal Amendments (2025) raised the bar for pausing laws and let the state fast-track appeals, with SB204 signed into law.',
      'Higher Education & Religious Accommodation': "Backs requiring Utah's public universities to reasonably accommodate students' religious beliefs in admissions, attendance, and exam scheduling, via SB207 (2026), which he co-sponsored and which passed the Senate.",
      'Public Law School Expansion': 'Sponsored SJR8 (2026) directing Utah Valley University, with the Board of Higher Education, to study creating a public law school.',
    },
    promises: [
      { title: 'Give the state a suspensive appeal to reinstate laws blocked by court injunctions', verdict: 'kept',
        detail: 'SB204 (2025), Right to Appeal Amendments, lets state attorneys seek a suspensive appeal to the Utah Supreme Court to reinstate an enjoined law and raises the standard for keeping injunctions in place; it passed both chambers and was signed by Gov. Cox on March 26, 2025.',
        sources: [{ label: 'Utah Legislature', url: 'https://le.utah.gov/~2025/bills/static/SB0204.html' }] },
    ],
  },

  mmckell: {
    theme: 'A lawyer-legislator who builds detailed statutory frameworks on mental health, minors and the courts, McKell pairs genuine reform with proposals critics say tilt the rules toward the powerful.',
    spotlight: [
      { impact: 'positive', category: 'voting', date: '2025', tags: ['Notable Actions'],
        headline: "Expanded Utah's mental-health workforce with a signed behavioral-health law",
        facts: "McKell was primary Senate sponsor of SB48 (2025), Behavioral Health Amendments, which revised licensing for mental-health therapists, expanded their scopes of practice, and created the Mental Health Professionals Education and Enforcement Fund. Gov. Cox signed it on March 26, 2025, and it took effect May 7, 2025.",
        why: 'Addressing therapist shortages through licensing reform is a concrete, durable change to Utah’s behavioral-health system.',
        source: { label: 'Utah Legislature', url: 'https://le.utah.gov/~2025/bills/static/SB0048.html' } },
      { impact: 'negative', category: 'voting', date: '2025', tags: ['Consistency'],
        headline: 'Inmate-education funding bill he sponsored died without a floor vote',
        facts: "Despite repeated recognition as a champion of education for incarcerated students, McKell's SB258 (2025), Inmate Education Funding Amendments, never advanced; it would have created an Inmate Education Restricted Account funded by appropriations, donations and grants, but stalled and was filed among bills not passed when the Senate struck its enacting clause on March 7, 2025.",
        why: 'A stated priority failed to clear even his own chamber, leaving the funding mechanism he proposed unrealized.',
        source: { label: 'Utah Legislature', url: 'https://le.utah.gov/~2025/bills/static/SB0258.html' } },
      { impact: 'negative', category: 'redflags', date: '2025', tags: ['Rhetoric vs Reality'],
        headline: "Pushed to narrow Utah's free-speech protections against meritless lawsuits",
        facts: "McKell sponsored SB301 (2025), which would have rolled back Utah's 2023 anti-SLAPP law (the Uniform Public Expression Protection Act), narrowing it to defamation and slander claims and removing the ability to recover costs and attorney fees in some circumstances. The bill died on March 7, 2025, without passing.",
        why: 'Weakening anti-SLAPP safeguards would have made it easier to use litigation to silence speech, cutting against the public-accountability interest.',
        source: { label: 'Utah Legislature', url: 'https://le.utah.gov/~2025/bills/static/SB0301.html' } },
      { impact: 'negative', category: 'voting', date: '2026', tags: ['Notable Actions'],
        headline: "Carried the 'three-judge panel' law critics say lets the state pick its courtroom",
        facts: "In the 2026 session McKell was the Senate sponsor of the judiciary package routing constitutional challenges to a three-judge panel, which he defended as ending 'forum shopping.' The ACLU of Utah warned it lets the Attorney General, Legislature and Governor reassign cases against them while other parties cannot, and the Utah State Bar objected that a last-minute swap bypassed committee review and public comment.",
        why: 'Reshaping which judges hear suits against the state raises real concerns about even-handed access to the courts.',
        source: { label: 'Utah News Dispatch', url: 'https://utahnewsdispatch.com/2026/03/05/lawsuits-push-utah-lawmakers-to-consider-changes-to-new-constitutional-court/' } },
    ],
    stances: {
      'Behavioral & Mental Health': 'Backed expanding Utah’s mental-health workforce through SB48 (2025), which broadened therapist scopes of practice and created a dedicated education and enforcement fund for mental-health professionals.',
      'Courts & Judicial Structure': "Sponsored the 2026 Senate measure creating a three-judge panel for constitutional challenges, framing it as preventing 'forum shopping' over objections from the ACLU of Utah and the Utah State Bar.",
      'Civil Litigation & Free Speech': "Sought in 2025 (SB301) to narrow Utah's anti-SLAPP statute to defamation and slander and curtail fee recovery; the bill failed.",
    },
    promises: [
      { title: 'Stand up dedicated funding for educating incarcerated Utahns', verdict: 'broken',
        detail: "McKell's SB258 (2025) would have created an Inmate Education Restricted Account to fund educational services for inmates, consistent with his record as an advocate for postsecondary education in corrections; the bill stalled in committee and died when the Senate struck its enacting clause on March 7, 2025.",
        sources: [{ label: 'Utah Legislature', url: 'https://le.utah.gov/~2025/bills/static/SB0258.html' }] },
      { title: "Strengthen Utah's behavioral-health licensing and workforce", verdict: 'kept',
        detail: 'Through SB48 (2025), McKell expanded scopes of practice for mental-health therapists and created the Mental Health Professionals Education and Enforcement Fund; Gov. Cox signed the bill on March 26, 2025.',
        sources: [{ label: 'Utah Legislature', url: 'https://le.utah.gov/~2025/bills/static/SB0048.html' }] },
    ],
  },

  kriebe: {
    theme: "A teacher-turned-senator and one of the chamber's most forceful Democratic voices, Riebe consistently fights for public workers, students and patients — often winning the argument even when she loses the vote.",
    spotlight: [
      { impact: 'positive', category: 'rhetoric', date: '2025', tags: ['Public Statements'],
        headline: 'Led the Senate floor fight against banning public-employee collective bargaining',
        facts: "When HB267 stripped Utah public-sector unions of collective-bargaining rights, Riebe was among its most vocal opponents, telling colleagues that the people who protect, care for and run the state's cities were asking them not to pass it. She pressed the sponsor to name a single city, county or school district that supported the bill, and he could not; it passed the Senate 16-13 on February 6, 2025.",
        why: 'She turned a floor debate into a pointed accountability test, exposing the absence of local demand for a major rollback of worker rights.',
        source: { label: 'KUER', url: 'https://www.kuer.org/politics-government/2025-02-06/in-final-senate-vote-utah-lawmakers-ban-public-union-collective-bargaining' } },
      { impact: 'positive', category: 'voting', date: '2025', tags: ['Notable Actions'],
        headline: "Pushed to fund care for 'medically fragile' students in small districts",
        facts: "Riebe sponsored SB135 (2025), Educational Medical Services Amendments, to add definitions for medically fragile students so the state could help smaller districts fund their care. The bill did not pass the 2025 general session.",
        why: 'Even unsuccessful, the effort spotlighted a real funding gap for high-need students that larger districts can absorb but small ones cannot.',
        source: { label: 'Utah Legislature', url: 'https://le.utah.gov/~2025/bills/static/SB0135.html' } },
    ],
    stances: {
      'Workers & Labor Rights': 'A leading opponent of HB267 (2025), Riebe argued that stripping collective-bargaining rights from teachers, firefighters and police served no demonstrated local need and harmed the public workforce.',
      'Students with Medical Needs': "Sponsored SB135 (2025) to define and help fund services for 'medically fragile' students so small school districts could meet their needs; the bill did not pass.",
      'Campus Speech & Safety': 'Sponsored SB95 (2026), Public Speaking Amendments, requiring higher-education institutions to run content-neutral risk assessments and security measures for outside speakers; the bill did not pass.',
    },
    promises: [
      { title: 'Secure state funding for medically fragile students in small districts', verdict: 'broken',
        detail: "Riebe's SB135 (2025), Educational Medical Services Amendments, sought to add code definitions allowing the state to fund care for medically fragile students, aimed at districts too small to absorb the cost; the bill failed to pass the 2025 general session.",
        sources: [{ label: 'Utah Legislature', url: 'https://le.utah.gov/~2025/bills/static/SB0135.html' }] },
    ],
  },

  seliason: {
    theme: 'A prolific, detail-driven Republican who pairs his signature mental-health work with hard-edged public-safety and public-lands bills, generally backing his rhetoric with enacted law.',
    spotlight: [
      { impact: 'positive', category: 'voting', date: '2025', tags: ['Notable Actions'],
        headline: "Passed an extreme-DUI 'interdicted person' law restricting repeat offenders' alcohol access",
        facts: "Eliason was chief sponsor of HB437 (2025), Interdicted Person Amendments, which requires courts to designate anyone convicted of an extreme DUI as an 'interdicted person,' barring them from buying alcohol for a court-set period and marking their ID accordingly. The bill was signed by the governor on March 27, 2025, and took effect January 1, 2026.",
        why: 'It shows Eliason converting a high-profile public-safety concern into enacted, enforceable law.',
        source: { label: 'Utah Legislature', url: 'https://le.utah.gov/~2025/bills/static/HB0437.html' } },
      { impact: 'positive', category: 'voting', date: '2025', tags: ['Notable Actions'],
        headline: 'Won House passage of a resolution to have Utah help manage federal parks and lands',
        facts: "Eliason sponsored HCR12 (2025), a concurrent resolution seeking a 'co-management' arrangement with the federal government for Utah's five national parks and potential new state parks, citing a maintenance backlog exceeding $400 million. He stressed it was not a land takeover; the substituted resolution passed the full House on February 27, 2025, and cleared a Senate committee 4-0 on March 4, 2025.",
        why: 'It demonstrates initiative on public-lands stewardship while drawing scrutiny from conservation groups over feasibility and cost.',
        source: { label: 'Utah News Dispatch', url: 'https://utahnewsdispatch.com/2025/02/25/federal-layoffs-utah-lawmakers-explore-turning-public-land-into-state-park/' } },
    ],
    stances: {
      'DUI & Alcohol Enforcement': "Backs aggressive, automatic consequences for extreme DUI; his HB437 (2025, signed) strips judges of discretion and bars convicted extreme-DUI offenders from purchasing alcohol via an 'interdicted person' designation.",
      'Public Lands & National Parks': 'Favors Utah taking a larger management role over federal lands within the state, pushing HCR12 (2025) to negotiate co-management of national parks and creation of new state parks, while insisting ownership stays federal.',
    },
    promises: [
      { title: 'Let Utah co-manage national parks and create new state parks', verdict: 'pending',
        detail: 'Through HCR12 (2025), Eliason sought to open negotiations with federal land agencies to co-manage Utah’s national parks and stand up new state parks near sites like Little Sahara and Skyline Drive. The resolution passed the House on Feb. 27, 2025, and cleared a Senate committee, but a binding co-management agreement has not been finalized; he reintroduced the effort as HCR5 in 2026.',
        sources: [{ label: 'Salt Lake Tribune', url: 'https://www.sltrib.com/news/environment/2025/02/01/utah-wants-co-manage-national/' }, { label: 'KSL', url: 'https://www.ksl.com/article/51261343/could-beloved-federal-recreation-spots-become-utah-state-parks-' }] },
    ],
  },

  nelson_abbott: {
    theme: 'A lawyer-legislator who reliably turns his probate and local-government expertise into signed statutes, though one such bill drew pointed questions about its unspoken local political backstory.',
    spotlight: [
      { impact: 'negative', category: 'transparency', date: '2025', tags: ['Rhetoric vs Reality'],
        headline: "Passed a city-manager protection bill but 'stayed mum' on the local fight that inspired it",
        facts: "Abbott sponsored HB109 (2025), Municipal Election Amendments, which limits a city council's ability to make it harder to fire a city manager during the post-election interim period. The bill closely tracked a December 2023 Vineyard episode critics called a 'power grab,' but when a senator asked where it came from, Abbott would only say 'I think this is good policy.' HB109 was signed into law March 27, 2025.",
        why: 'Enacting a narrowly targeted local-government bill while declining to name its motivation raises transparency questions about legislative intent.',
        source: { label: 'Salt Lake Tribune', url: 'https://www.sltrib.com/news/2025/02/12/utah-bill-would-limit-city-council/' } },
      { impact: 'positive', category: 'voting', date: '2025', tags: ['Notable Actions'],
        headline: 'Carried a broad estate-planning overhaul tightening capacity and trust rules',
        facts: 'Abbott was the House sponsor of SB206 (2025), Estate Planning Amendments, which revises testamentary-capacity and will requirements, clarifies the clear-and-convincing standard of proof for guardianship, addresses capacity for powers of attorney and advance health-care directives, and recodifies and defines asset-protection trusts. The bill was signed by the governor on March 25, 2025.',
        why: 'It reflects Abbott applying his probate-law expertise to modernize Utah’s estate and capacity statutes.',
        source: { label: 'Utah Legislature', url: 'https://le.utah.gov/~2025/bills/static/SB0206.html' } },
    ],
    stances: {
      'Local Government Transitions': "Supports curbing 'lame-duck' city councils; his HB109 (2025, signed) blocks outgoing councils from amending ordinances to make a city manager harder to remove during the interim period between an election and the new council's swearing-in.",
      'Testamentary Capacity & Asset Protection Trusts': 'Backs clearer legal standards for capacity and trusts; as House sponsor of SB206 (2025, signed) he advanced revised testamentary-capacity rules, a clear-and-convincing proof standard for guardianship, and a recodified asset-protection-trust framework.',
    },
    promises: [
      { title: 'Limit outgoing city councils from entrenching their city managers', verdict: 'kept',
        detail: 'Abbott pledged to stop councils from using the post-election interim window to shield city managers from removal. HB109 (Municipal Election Amendments) modifies a municipal council’s power to dismiss a city manager and was signed into law on March 27, 2025, effective May 7, 2025.',
        sources: [{ label: 'Salt Lake Tribune', url: 'https://www.sltrib.com/news/2025/02/12/utah-bill-would-limit-city-council/' }, { label: 'Utah Legislature', url: 'https://le.utah.gov/~2025/bills/static/HB0109.html' }] },
      { title: 'Overhaul estate-planning, capacity, and asset-protection-trust law', verdict: 'kept',
        detail: 'As House sponsor of SB206 (Estate Planning Amendments), Abbott helped enact revisions to testamentary-capacity requirements, the proof standard for guardianship, capacity rules for powers of attorney and advance directives, and a recodified definition of asset-protection trusts; the governor signed the bill on March 25, 2025.',
        sources: [{ label: 'Utah Legislature', url: 'https://le.utah.gov/~2025/bills/static/SB0206.html' }] },
    ],
  },

  amillner: {
    theme: "A higher-education insider who leveraged deep institutional expertise to reshape Utah's colleges around workforce outcomes, championing reforms supporters call modernization and critics call legislative overreach into academic programs.",
    spotlight: [
      { impact: 'negative', category: 'voting', date: '2025', tags: ['Notable Actions', 'Rhetoric vs Reality'],
        headline: 'Co-sponsored HB265, forcing colleges to cut programs to reclaim $60M',
        facts: "Millner was Senate sponsor of HB265 (2025), Higher Education Strategic Reinvestment, signed March 29, 2025. The base budget stripped $60 million from Utah's eight degree-granting institutions, which could only reclaim the funds by identifying programs to reduce or eliminate based on enrollment, completion and wage metrics. Early institutional plans included cutting minors in ethnic studies and women's and gender studies; faculty groups and Senate Democrats warned of academic and workforce harm, while Millner argued only low-enrollment programs were targeted.",
        why: 'A consequential law that reallocated tens of millions and pressured colleges to eliminate programs, drawing significant bipartisan and faculty criticism.',
        source: { label: 'KSL', url: 'https://www.ksl.com/article/51268635/divisive-higher-ed-cuts-reallocation-bill-a-key-step-closer-to-gov-coxs-desk' } },
      { impact: 'positive', category: 'voting', date: '2025', tags: ['Positive Leadership', 'Notable Actions'],
        headline: 'Won bipartisan signing of the SB162 Talent Connect workforce portal',
        facts: "Millner sponsored SB162 (2025), Talent Connect, ceremonially signed by Gov. Cox on April 14, 2025 at Davis Technical College. The law creates the Utah High-Demand Talent Portal to match students and graduates with employers in high-growth, above-median-wage fields, plus a cooperative-education pilot starting in engineering and life sciences, reflecting her long-running Talent Ready Utah work.",
        why: 'A concrete, enacted measure connecting students to employment with broad support and a clear implementation timeline.',
        source: { label: 'Deseret News', url: 'https://www.deseret.com/utah/2025/04/14/utah-governor-cox-signs-bevy-of-education-bills/' } },
    ],
    stances: {
      'Academic Program Reinvestment': "Argues colleges should redirect dollars from low-enrollment programs into high-demand fields tied to wages and job placement, the core premise of her HB265 (2025) 'strategic reinvestment' framework requiring eight institutions to reallocate $60 million.",
      'Cooperative & Work-Based Learning': 'Backs paid, credit-bearing co-op and apprenticeship experiences for upper-year students, establishing a cooperative-education pilot through her SB162 (2025) initially focused on engineering and life sciences.',
    },
    promises: [
      { title: 'Reallocate $60 million in higher-ed budgets toward high-demand programs', verdict: 'kept',
        detail: "Millner's HB265 (2025), signed March 29, 2025, required Utah's eight degree-granting institutions to identify $60 million from administrative costs and low-enrollment programs and redeploy it into high-demand programs measured by enrollment, completion, job placement and wages, phased over three years.",
        sources: [{ label: 'KSL', url: 'https://www.ksl.com/article/51268635/divisive-higher-ed-cuts-reallocation-bill-a-key-step-closer-to-gov-coxs-desk' }, { label: 'Inside Higher Ed', url: 'https://www.insidehighered.com/news/faculty-issues/shared-governance/2025/05/28/new-utah-law-prompts-program-cuts-strategic' }] },
    ],
  },

  lfillmore: {
    theme: 'A tax-and-school-choice hardliner who pushes ambitious structural reforms to taxes, education funding and the initiative process, racking up signed wins but also high-profile setbacks when his boldest ideas outrun their support.',
    spotlight: [
      { impact: 'negative', category: 'voting', date: '2025', tags: ['Notable Actions', 'Rhetoric vs Reality'],
        headline: 'Sponsored SB37 to reroute school property taxes — vetoed by Cox',
        facts: "Fillmore sponsored SB37 (2025), which would have diverted roughly $842 million in local 'basic rate' school property taxes into the state general fund, with the State Board of Education then transferring an equal amount back to districts within 35 days. After veto requests from the State Auditor, the State Board of Education and school-board and superintendent associations, Gov. Cox vetoed it on March 24, 2025, citing public-trust, accounting, legal and constitutional concerns; it had passed short of veto-proof margins.",
        why: 'A signature Fillmore bill rejected by his own party’s governor over transparency and constitutionality, marking a notable accountability failure.',
        source: { label: 'Deseret News', url: 'https://www.deseret.com/utah/2025/03/25/utah-governor-cox-vetoes-property-tax-amendment-bill/' } },
      { impact: 'negative', category: 'voting', date: '2025', tags: ['Notable Actions', 'Consistency'],
        headline: 'Authored SB73 adding costly new hurdles to citizen ballot initiatives',
        facts: 'Fillmore sponsored SB73 (2025), signed by Cox on March 24, 2025. It requires initiative backers to detail funding and any new taxes in their applications (effective immediately) and, starting Jan. 1, 2027, to meet statewide newspaper publication requirements estimated to add roughly $1.4 million to initiative costs. It passed the Senate 21-7 on largely party lines amid legislative fallout from the 2024 redistricting ruling; critics call it an attempt to suppress citizen lawmaking.',
        why: 'A documented move to raise barriers on direct democracy, with significant cost and access implications for citizen initiatives.',
        source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/government/2025/mar/26/ballot-initiatives-in-utah-now-have-more-requirements-after-gov-cox-signs-bill/' } },
      { impact: 'positive', category: 'voting', date: '2025', tags: ['Notable Actions', 'Positive Leadership'],
        headline: 'Passed SB181 easing parking and garage rules for affordable homes',
        facts: "Fillmore sponsored SB181 (2025), Housing Affordability Amendments, part of Utah's 2025 housing package. It bars the state's largest jurisdictions from requiring garages on deed-restricted, owner-occupied affordable single-family homes (priced at or below 80% of county median) and limits mandated parking-space dimensions. The compromise followed months of negotiation after he stripped more controversial provisions; he called it a 'good incremental step.'",
        why: 'An enacted, broadly supported reform that lowers construction costs for entry-level homes.',
        source: { label: 'Salt Lake Tribune', url: 'https://www.sltrib.com/news/politics/2025/02/20/utah-housing-bill-would-ease/' } },
    ],
    stances: {
      'Housing Affordability': 'Favors loosening local land-use mandates to cut costs, sponsoring SB181 (2025) to exempt deed-restricted affordable homes from garage requirements and cap mandated parking dimensions, while lamenting that bolder supply reforms failed.',
      'Ballot Initiative Requirements': 'Argues voters deserve to know the fiscal impact of initiatives, sponsoring SB73 (2025) to mandate funding and tax disclosures in initiative applications and impose statewide newspaper-publication requirements.',
    },
    promises: [
      { title: 'Require fiscal-impact disclosure and publication for ballot initiatives', verdict: 'kept',
        detail: "Fillmore's SB73 (2025), signed March 24, 2025, requires initiative sponsors to disclose how a proposed law would be funded and whether it imposes a new tax (effective immediately), and starting Jan. 1, 2027 to meet statewide publication requirements estimated to add about $1.4 million in costs.",
        sources: [{ label: 'Standard-Examiner', url: 'https://www.standard.net/news/government/2025/mar/26/ballot-initiatives-in-utah-now-have-more-requirements-after-gov-cox-signs-bill/' }] },
      { title: 'Exempt affordable homes from city garage and parking mandates', verdict: 'kept',
        detail: "Fillmore's SB181 (2025), Housing Affordability Amendments, became law, barring Utah's largest cities and listed counties from requiring garages on deed-restricted, owner-occupied affordable homes priced at or below 80% of county median and limiting mandated parking-space sizes.",
        sources: [{ label: 'Salt Lake Tribune', url: 'https://www.sltrib.com/news/politics/2025/02/20/utah-housing-bill-would-ease/' }] },
      { title: 'Reroute local school basic-rate property taxes into the state general fund', verdict: 'broken',
        detail: "Fillmore's SB37 (2025) would have diverted about $842 million in local basic-rate school property taxes into the general fund with a mandated 35-day transfer back to districts, but Gov. Cox vetoed it on March 24, 2025 over trust, accounting, legal and constitutionality concerns, and no override occurred.",
        sources: [{ label: 'Deseret News', url: 'https://www.deseret.com/utah/2025/03/25/utah-governor-cox-vetoes-property-tax-amendment-bill/' }, { label: 'Salt Lake Tribune', url: 'https://www.sltrib.com/news/politics/2025/02/20/sb37-utah-bill-divert-school/' }] },
    ],
  },

  karen_kwan: {
    theme: 'A psychology professor and Senate Minority Whip who consistently turns her clinical-health expertise into quietly bipartisan, signed-into-law public-health legislation.',
    spotlight: [
      { impact: 'positive', category: 'voting', date: '2026', tags: ['Notable Actions'],
        headline: 'Sleep-disorder awareness bill signed into law',
        facts: 'Kwan was chief sponsor of SB314 (2026), Sleep Disorders Education Amendments, directing the Division of Population Health within the Department of Health and Human Services to develop educational materials and conduct public outreach on sleep health and disorders such as narcolepsy, idiopathic hypersomnia and sleep apnea. Gov. Cox signed it into law on March 19, 2026.',
        why: 'It shows Kwan using her clinical-psychology background to advance a low-cost, evidence-based public-health measure that became law.',
        source: { label: 'American Academy of Sleep Medicine', url: 'https://aasm.org/utah-sb-314-sleep-health-education/' } },
      { impact: 'positive', category: 'voting', date: '2026', tags: ['Notable Actions'],
        headline: 'Autism-coverage insurance reform signed into law',
        facts: 'Kwan was chief sponsor of SB175 (2026), Health Insurance Revisions, amending Utah Code 31A-22-642 on autism-spectrum-disorder coverage. The enrolled bill updates definitions and creates a new reporting requirement on autism-related metrics for health benefit plans, and was signed into law during the 2026 session.',
        why: 'It demonstrates follow-through on her mental-health and health-coverage priorities through a concrete, enacted statute.',
        source: { label: 'Utah Legislature', url: 'https://le.utah.gov/~2026/bills/static/SB0175.html' } },
    ],
    stances: {
      'Sleep & Public Health Education': 'Sponsored SB314 (2026), enacting a state mandate for public education and outreach on sleep disorders including narcolepsy, hypersomnia and sleep apnea, framing sleep health as a core public-health priority.',
      'Autism Insurance Coverage': "Through SB175 (2026), moved to modernize Utah's autism-spectrum-disorder insurance-coverage statute, updating definitions and adding reporting requirements on how health plans cover autism services.",
    },
    promises: [
      { title: 'Enact public education on sleep health and sleep disorders', verdict: 'kept',
        detail: "Kwan's SB314 (2026), tasking the Division of Population Health with sleep-disorder education and outreach, was signed into law by Gov. Cox on March 19, 2026.",
        sources: [{ label: 'American Academy of Sleep Medicine', url: 'https://aasm.org/utah-sb-314-sleep-health-education/' }] },
      { title: "Modernize Utah's autism insurance-coverage law", verdict: 'kept',
        detail: "Kwan's SB175 (2026), amending the autism-spectrum-disorder coverage statute (31A-22-642) and adding a reporting requirement, passed the Legislature and was signed by Gov. Cox in the 2026 session.",
        sources: [{ label: 'Utah Legislature', url: 'https://le.utah.gov/~2026/bills/static/SB0175.html' }] },
    ],
  },

  jburton: {
    theme: "A retired two-star general whose deep credibility on veterans and the National Guard contrasts with a high-profile turn as lead sponsor of Utah's contested rollback of automatic vote-by-mail and of partisan-balance rules on state oversight boards.",
    spotlight: [
      { impact: 'negative', category: 'voting', date: '2025', tags: ['Notable Actions', 'Rhetoric vs Reality'],
        headline: 'Sponsored the bill phasing out automatic vote-by-mail',
        facts: "Burton was chief sponsor of HB300 (2025), which ends Utah's automatic mail-ballot system: starting in 2029 voters must opt in periodically, and from 2026 must add the last four digits of an ID number to return envelopes. It passed the House 57-15-3, cleared the Senate, and Gov. Cox signed it on March 26, 2025. The ACLU of Utah and county clerks warned it erects barriers for low-income and disabled voters, while legislative audits of the 2024 election found no evidence of widespread fraud.",
        why: 'It is Burton’s most consequential and contested act, restructuring how most Utahns vote despite audits showing the fraud concerns driving it were unsubstantiated.',
        source: { label: 'KUER', url: 'https://www.kuer.org/politics-government/2025-03-06/utah-lawmakers-push-their-contested-vote-by-mail-changes-over-the-finish-line' } },
      { impact: 'negative', category: 'voting', date: '2025', tags: ['Notable Actions'],
        headline: 'Stripped partisan-balance rules from state boards',
        facts: 'Burton was chief sponsor of HB412 (2025), Boards and Commissions Revisions, which removed statutory limits barring more than a set number of same-party members on roughly 19 state boards and commissions, including judicial-performance and compensation panels. The substitute passed the House 54-16-5 and cleared the Senate, with the House concurring on March 7, 2025; the Utah State Bar and Alliance for a Better Utah opposed it, warning one party could dominate consequential oversight bodies.',
        why: 'Removing bipartisan-balance guardrails from oversight boards concentrates partisan control over bodies meant to be insulated from it.',
        source: { label: 'Salt Lake Tribune', url: 'https://www.sltrib.com/news/politics/2025/02/18/republicans-may-soon-solely-rule/' } },
    ],
    stances: {
      'Election Administration & Vote-by-Mail': 'Sponsored HB300 (2025) to end automatic mail balloting, require ID-number verification on return envelopes and force voters to opt in periodically, citing election-security concerns despite audits finding no widespread fraud.',
      'Partisan Balance on State Boards': "Through HB412 (2025), moved to delete same-party-membership caps on roughly 19 state boards and commissions, arguing the goal was recruiting 'the best minds' regardless of party affiliation.",
    },
    promises: [
      { title: "Overhaul Utah's vote-by-mail system", verdict: 'kept',
        detail: "Burton's HB300 (2025), phasing out automatic mail ballots and adding ID-number verification on return envelopes, passed both chambers and was signed by Gov. Cox on March 26, 2025.",
        sources: [{ label: 'KUER', url: 'https://www.kuer.org/politics-government/2025-03-06/utah-lawmakers-push-their-contested-vote-by-mail-changes-over-the-finish-line' }, { label: 'Utah Legislature', url: 'https://le.utah.gov/~2025/bills/static/HB0300.html' }] },
      { title: 'Remove partisan-balance requirements on state boards', verdict: 'kept',
        detail: "Burton's HB412 (2025), eliminating same-party-membership caps on roughly 19 boards and commissions, passed the House 54-16-5 and cleared the Senate with House concurrence on March 7, 2025.",
        sources: [{ label: 'Salt Lake Tribune', url: 'https://www.sltrib.com/news/politics/2025/02/18/republicans-may-soon-solely-rule/' }, { label: 'Utah Legislature', url: 'https://le.utah.gov/~2025/bills/static/HB0412.html' }] },
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
  console.log(`PolitiDex — Utah legislator multi-layer deep dive (batch 2)  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
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
