#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — June 2026 multi-layer deep dive on sitting Utah legislators
//
// A roster review found that all 75 CURRENT sitting Utah State Representatives
// and Senators were missing the Accountability / Spotlight integrity layer in
// the live Firestore `politicians` collection (zero impact-tagged drivers),
// even though their Promise and Issue-position layers were otherwise developed.
// This pass does a genuine, sourced deep dive on a focused batch of ten current
// officeholders and builds out THREE layers at once for each:
//
//   • Spotlight / Accountability — 1–4 sourced integrity highlights per figure
//     (impact: positive = words match actions, negative = inconsistency /
//     controversy / reversal), plus a one-line `spotlightTheme`. The frontend
//     merges document `spotlight` onto the curated window.ACCT_SPOTLIGHT layer
//     and recomputes the Accountability score from these drivers.
//   • Issue positions — additional `stances` (topic → text) grounded in a real
//     bill or documented public position, skipping any topic already present.
//   • Promise Tracker — genuinely new sponsored-bill / public-commitment
//     promises with clear verdicts, skipping any title already present. Promise
//     counts (kept / pending / broken, top-level and on `accountability`) are
//     recomputed from the merged array so the Promise % stays data-driven.
//
// Honesty rules (matching the rest of the site):
//   • Nothing is invented. Every spotlight item and bill-backed position carries
//     a real {label,url} `source`; verdicts reflect documented outcomes.
//   • Substantive duplicates of existing promises were intentionally dropped so
//     counts are not inflated (e.g. Cullimore's privacy law and Sandall's
//     saved-water reforms already ship as promises and are NOT re-added).
//   • Genuinely thin newcomers (Jake Sawyer, Lisa Shepherd) carry fewer items
//     and a theme that says the record is still short, rather than padded filler.
//   • Idempotent & non-destructive: each run re-fetches the live doc, only adds
//     stances/promises that aren't already there, and only writes the integrity
//     theme when an editor hasn't set one. Spotlight drivers are prepended ahead
//     of any pre-existing untagged entries.
//
//   node scripts/deep-dive-utah-legislators-jun2026.mjs            # dry run (default)
//   node scripts/deep-dive-utah-legislators-jun2026.mjs --apply    # write to Firestore
// ---------------------------------------------------------------------------

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const STAMP = '2026-06-20T00:00:00.000Z';

// ── Curated, sourced deep-dive data (keyed by Firestore doc id) ──────────────
const DATA = {
  jstevenson: {
    theme: 'A powerful, effective budget and alcohol-policy veteran whose growing portfolio of development-board seats has begun to collide with his own business interests and his temper.',
    spotlight: [
      { impact: 'negative', category: 'redflags', date: '2026', tags: ['Public Behavior', 'Notable Actions'],
        headline: "Slapped a reporter's phone amid data-center backlash",
        facts: "After Stevenson, a member of the Military Installation Development Authority (MIDA) board, helped approve a massive Box Elder County AI data center, his family business faced boycott calls and his crew confronted an ABC4 reporter in the nursery parking lot. Wearing a Utah Senate jacket, Stevenson told the reporter to leave and swiped his hand, knocking the reporter's phone to the concrete. Police were called and a report was filed; Stevenson later relayed an apology through an officer.",
        why: 'A senior lawmaker physically interfering with a journalist documenting public-interest reporting is a direct test of temperament and respect for press freedom.',
        source: { label: 'The Hill', url: 'https://thehill.com/homenews/state-watch/5869857-utah-senator-data-center-altercation/' } },
      { impact: 'negative', category: 'transparency', date: '2024', tags: ['Consistency', 'Notable Actions'],
        headline: 'Flagged for an undisclosed business on conflict-of-interest forms',
        facts: "A February 2024 Utah Investigative Journalism Project review of legislators' financial disclosures found 30 active businesses unreported by 13 lawmakers. Stevenson was listed among those with one undisclosed business, and he did not respond to the outlet's request for comment.",
        why: 'Accurate conflict-of-interest disclosure is the baseline transparency obligation for a lawmaker who chairs the state budget committee and sits on multiple development boards.',
        source: { label: 'Utah Investigative Journalism Project', url: 'https://www.utahinvestigative.org/how-utah-lawmakers-disclose-or-dont-disclose-conflicts-of-interest/' } },
      { impact: 'positive', category: 'promise', date: '2017', tags: ['Rhetoric vs Reality', 'Positive Leadership'],
        headline: "Delivered the landmark deal to dismantle the 'Zion Curtain'",
        facts: "As Senate sponsor of HB442, Stevenson negotiated among restaurant groups, distributors, retailers and the LDS Church to pass a sweeping 2017 alcohol overhaul. The law let restaurants remove the 7-foot 'Zion Curtain' barrier, consolidated dining and social-club designations into a single bar license, and funded underage-drinking prevention.",
        why: "He converted his stated 'modernize alcohol law' priority into an actual, hard-negotiated reform that passed, matching words to outcomes.",
        source: { label: 'Deseret News', url: 'https://www.deseret.com/2017/3/8/20607871/utah-lawmakers-pass-sweeping-alcohol-policy-reform' } },
    ],
    stances: {
      'Beer Alcohol-Content Limits': "Pushed to raise the cap on grocery- and convenience-store beer from 3.2% to 4.8% alcohol by weight, arguing responsible drinkers at 3.2 will be responsible at 4.8 (SB132, 2019).",
      'Military-Tied Development & Data Centers': 'As a MIDA board member, supported approving a large-scale Box Elder County data center, reflecting his consistent posture favoring military-linked economic-development authorities.',
    },
    promises: [
      { title: "End the 'Zion Curtain' and create a single bar license", verdict: 'kept',
        detail: 'Sponsored the 2017 alcohol reform (HB442) that replaced the 7-foot dispensing barrier with optional alternatives and consolidated dining and social-club licenses into one bar license; signed into law.',
        sources: [{ label: 'Deseret News', url: 'https://www.deseret.com/2017/3/8/20607871/utah-lawmakers-pass-sweeping-alcohol-policy-reform' }] },
      { title: 'Raise grocery and convenience beer to 4.8%', verdict: 'kept',
        detail: 'Sponsored 2019 legislation (SB132) raising the alcohol-by-weight cap on retail beer from 3.2% to 4.8%, shifting much of the product from state liquor stores to grocery and convenience stores; enacted.',
        sources: [{ label: 'Deseret News', url: 'https://www.deseret.com/2019/2/25/20666754/state-senate-signals-intent-to-allow-heavy-beer-sales-in-utah-convenience-grocery-stores/' }] },
    ],
  },

  kcullimore: {
    theme: "A polished, productive tech-policy legislator whose 'light touch' framing and his family firm's dominance over Utah evictions raise persistent questions about whose interests his lawmaking serves.",
    spotlight: [
      { impact: 'negative', category: 'redflags', date: '2020–2023', tags: ['Notable Actions'],
        headline: "Family firm became Utah's top eviction filer while he legislated landlord-tenant law",
        facts: "Reporting found the Law Offices of Kirk A. Cullimore filed close to half of Utah's eviction cases and kept a tenant-screening database renters said functioned as a blacklist. Cullimore was an attorney at the firm and government-affairs chair of the Utah Apartment Association while voting on housing law as a senator. In December 2023 he left the firm, saying it was impossible to balance his legislative duties with handling eviction cases.",
        why: "A lawmaker writing the rules for an industry his own family firm dominated is a textbook conflict-of-interest concern that he ultimately acknowledged by stepping away.",
        source: { label: 'Salt Lake Tribune', url: 'https://www.sltrib.com/news/2023/12/09/sen-kirk-cullimore-long-criticized/' } },
      { impact: 'negative', category: 'transparency', date: '2025', tags: ['Rhetoric vs Reality'],
        headline: 'As Majority Leader, asked the Senate to pass an unpublished version of the anti-union bill on his word',
        facts: "During the January 2025 debate on HB267, which banned public-sector collective bargaining, Cullimore told colleagues a substitute was coming days later and that some unions were 'neutral.' The Senate voted to advance the bill before the substitute text was public, with several Republicans saying they opposed the existing version but voted yes on his word. The law was so unpopular that unions gathered roughly 320,000 referendum signatures and the Legislature repealed it in a December 2025 special session.",
        why: "Advancing major legislation on a leader's verbal assurance before the text exists sidesteps the transparency lawmakers and the public rely on.",
        source: { label: 'KUER', url: 'https://www.kuer.org/politics-government/2025-01-30/utah-senate-public-union-collective-bargaining-ban-bill' } },
      { impact: 'positive', category: 'voting', date: '2024–2025', tags: ['Consistency', 'Positive Leadership'],
        headline: 'Authored and then refined the nation’s first state generative-AI consumer law',
        facts: "Cullimore sponsored SB149 (2024), the first U.S. state law specifically regulating generative AI, creating disclosure duties and an Office of AI Policy. In 2025 he followed with SB226, narrowing up-front disclosure to high-risk uses like financial, legal, medical and mental-health advice, and SB332 extending the AI Policy Office. He framed the work as iterative regulation that adjusts as the technology matures.",
        why: 'Building, testing and then refining a novel regulatory framework over multiple sessions reflects substantive, consistent policy follow-through.',
        source: { label: 'Utah News Dispatch', url: 'https://utahnewsdispatch.com/2025/03/26/utah-artificial-intelligence-laws-passed-2025-legislature/' } },
      { impact: 'negative', category: 'voting', date: '2025', tags: ['Notable Actions'],
        headline: 'Senate sponsor of Utah’s first-in-the-nation statewide fluoride ban over dental-health objections',
        facts: "As Majority Leader, Cullimore was the Senate floor sponsor of HB81, making Utah the first state to bar cities from adding fluoride to public water and stripping local communities of that choice. He framed it as cost savings and personal choice, while the American Dental Association and public-health groups warned it would harm public health. Gov. Cox signed it and it took effect May 7, 2025.",
        why: 'Championing a measure that overrides local control and runs against the weight of dental and public-health evidence is a consequential, contested choice voters should weigh.',
        source: { label: 'Utah News Dispatch', url: 'https://utahnewsdispatch.com/2025/02/21/utah-legislature-approves-ban-on-cities-adding-fluoride-public-water/' } },
    ],
    stances: {
      'Public-Sector Unions': 'Backed banning collective bargaining for public employees including police, firefighters and teachers, shepherding HB267 through the Senate as Majority Leader before it was repealed under referendum pressure (2025).',
      'Water Fluoridation & Local Control': "Opposes adding fluoride to public drinking water, sponsoring the Senate side of the first statewide ban that removes cities' ability to fluoridate, framed as personal choice and cost reduction (HB81, 2025).",
      'Legislative Power Over Ballot Initiatives': 'Supported letting the Legislature amend or repeal voter-approved ballot initiatives, helping advance a 2024 constitutional amendment to that effect after voters passed an anti-gerrymandering measure.',
    },
    promises: [
      { title: 'Give minors and parents legal recourse against social-media harm', verdict: 'kept',
        detail: "Senate sponsor of HB464 (2024), which created a private right of action letting Utah children and parents sue over harm from excessive use of algorithmically curated social media; portions of Utah's social-media regime continue to face First Amendment court challenges.",
        sources: [{ label: 'Deseret News', url: 'https://www.deseret.com/utah/2024/03/04/utah-social-media-laws/' }] },
    ],
  },

  ssandall: {
    theme: 'A pragmatic farmer-legislator who reshaped Utah water law to save the Great Salt Lake, while drawing fire as the redistricting co-chair whose congressional map a judge struck down as an illegal partisan gerrymander.',
    spotlight: [
      { impact: 'positive', category: 'voting', date: '2023–2024', tags: ['Notable Actions', 'Consistency'],
        headline: "Authored the 'saved water' overhaul letting farmers conserve and profit without losing rights",
        facts: "Sandall's SB277 (2023) directed the state engineer to quantify the water farmers save by cutting consumption, and his follow-up SB18 (2024) let agricultural users lease or sell the value of that saved water without forfeiting their underlying rights. The package added $200 million to Utah's Agricultural Water Optimization program and raised the state cost-share for efficient irrigation; the Utah Farm Bureau called it a game changer, with conserved water able to flow toward the Great Salt Lake.",
        why: 'It turned a politically hard, technical water-law problem into a concrete conservation mechanism that he delivered across two sessions.',
        source: { label: 'KSL', url: 'https://www.ksl.com/article/50594957/a-fundamental-shift-in-utah-water-law-for-the-great-salt-salt-lake' } },
      { impact: 'positive', category: 'voting', date: '2024–2026', tags: ['Notable Actions'],
        headline: 'Carried Senate bills that pried loose hundreds of thousands of acre-feet for the lake',
        facts: "Sandall sponsored SB18 (2024) giving the state added powers to shepherd water downstream to the Great Salt Lake, and co-carried HB453 restructuring the mineral-extraction severance tax to incentivize lower water use. That framework helped enable a 2024 agreement under which Compass Minerals permanently donated more than 200,000 acre-feet of water a year to the lake. He later backed HB446 (2026) empowering the Great Salt Lake Commissioner to acquire and lease water rights more quickly.",
        why: 'It shows sustained, multi-year legislative follow-through on the Great Salt Lake beyond a single headline bill.',
        source: { label: 'Utah News Dispatch', url: 'https://utahnewsdispatch.com/2024/03/01/compass-minerals-and-lawmakers-find-consensus-great-salt-lake/' } },
      { impact: 'negative', category: 'redflags', date: '2025', tags: ['Notable Actions', 'Rhetoric vs Reality'],
        headline: "Redistricting map he co-chaired was struck down as an 'extreme' partisan gerrymander",
        facts: "As co-chair of the 2025 Legislative Redistricting Committee, Sandall steered the congressional map the Legislature passed under court order. In November 2025 a state judge rejected that map as an extreme partisan gerrymander that violated Proposition 4 and was built using prohibited partisan data, and adopted a plaintiffs' map containing a Democratic-leaning seat instead.",
        why: "The committee he led produced a map a court found unlawful, undercutting the 'fair and balanced' process he publicly claimed.",
        source: { label: 'Salt Lake Tribune', url: 'https://www.sltrib.com/news/politics/2025/11/11/gerrymander-utah-judge-rejects-gop/' } },
      { impact: 'negative', category: 'rhetoric', date: '2025', tags: ['Public Statements', 'Public Behavior'],
        headline: "Opened the public redistricting hearing by declaring the Legislature was acting 'under protest'",
        facts: "At the redistricting committee's first public meeting in September 2025, Sandall told attendees the Legislature was drawing maps in compliance with the court's orders and 'under protest.' Members of the public objected that opening a public-input process by signaling reluctance set a dismissive tone toward the voters who passed Proposition 4.",
        why: 'Framing a court-ordered, voter-mandated process as something done grudgingly drew criticism that public input was treated as a formality.',
        source: { label: 'Utah News Dispatch', url: 'https://utahnewsdispatch.com/2025/09/22/utah-lawmakers-consider-new-congressional-maps-under-protest/' } },
    ],
    stances: {
      'State Budget & Appropriations': 'As Senate vice chair of the Executive Appropriations Committee, holds a central role in setting Utah’s full state budget, a post he frames around fiscal responsibility and curbing wasteful spending.',
      'Mineral Extraction at the Great Salt Lake': 'Supports using severance-tax structure to pressure mineral companies extracting from the lake to cut water use, co-carrying HB453, which raised the tax while offering a lower rate to companies that voluntarily reduce consumption.',
    },
    promises: [],
  },

  james_dunnigan: {
    theme: 'A two-decade insurance-industry legislator whose deep commerce expertise repeatedly places him at the intersection of subject-matter authority and potential self-interest, with a mixed record on government transparency.',
    spotlight: [
      { impact: 'negative', category: 'redflags', date: '2017', tags: ['Rhetoric vs Reality', 'Notable Actions'],
        headline: 'Insurance-agency owner sponsored four insurance bills in a single session',
        facts: "A 2017 Salt Lake Tribune analysis found that roughly a quarter of all bills that session touched their sponsors' day jobs, and singled out Dunnigan, owner of an insurance agency, who sponsored four bills dealing with the insurance industry. One, HB395, was described as pitting health insurers against doctors; a physician testified it gave insurers what they wanted. Dunnigan has owned an insurance business since 1976 and files required conflict-of-interest disclosures.",
        why: 'His career legislating the very industry he profits from is a textbook expertise-versus-conflict tension worth tracking.',
        source: { label: 'Salt Lake Tribune', url: 'https://archive.sltrib.com/article.php?id=4991476&itype=CMSID' } },
      { impact: 'negative', category: 'transparency', date: '2022', tags: ['Notable Actions', 'Public Statements'],
        headline: "Sponsored House rule restricting journalists' access to the floor",
        facts: "Dunnigan sponsored HR2, which passed the Utah House 65-9 in March 2022, requiring credentialed journalists to get permission from the speaker before accessing the House floor to interview lawmakers. He defended it as not designed to be restrictive, but a Republican colleague warned the optics were terrible and the Democratic leader said it moved away from transparency.",
        why: 'Carrying a measure that narrows press access to elected officials cuts against open-government norms regardless of the stated intent.',
        source: { label: 'Deseret News', url: 'https://www.deseret.com/utah/2022/3/1/22956941/trasparency-utah-legislature-house-rule-limiting-media-access-floor-politics-journalism' } },
      { impact: 'positive', category: 'voting', date: '2014–2016', tags: ['Positive Leadership', 'Notable Actions'],
        headline: 'Chaired the Health Reform Task Force shaping Utah’s Medicaid debate',
        facts: "As chair of the Legislature's Health Reform Task Force, Dunnigan led the panel that in December 2014 declined to advance Gov. Herbert's 'Healthy Utah' Medicaid expansion and instead advanced narrower alternatives, citing cost and sustainability. In March 2015 a House committee approved his more limited plan over the governor's broader proposal, though no expansion ultimately passed during his tenure as a leader on the issue.",
        why: "He was the central legislative gatekeeper on one of Utah's biggest health-coverage decisions of the decade.",
        source: { label: 'Bloomberg Law', url: 'https://news.bloomberglaw.com/health-law-and-business/utahs-health-reform-task-force-rejects-governors-medicaid-plan' } },
    ],
    stances: {
      'Medicaid / Health Coverage': "Favored a narrower, lower-cost state Medicaid alternative over full federal expansion, prioritizing fiscal sustainability; as Health Reform Task Force chair he steered Utah away from Gov. Herbert's 'Healthy Utah' plan toward a smaller coverage program.",
      'Pharmacy Benefit & Drug Pricing': 'Engaged on health-insurance and pharmacy-benefit regulation within his commerce portfolio, as Utah adopted drug-rebate pass-through rules aimed at directing PBM savings to consumers.',
    },
    promises: [],
  },

  ashlee_matthews: {
    theme: 'A working-mother legislator who turns lived experience into modest but concrete policy wins for families and public workers.',
    spotlight: [
      { impact: 'positive', category: 'promise', date: '2023', tags: ['Notable Actions', 'Positive Leadership'],
        headline: 'Got a maternal-coverage bill signed into law for public employees',
        facts: "Matthews was chief sponsor of HB415, 'Maternal Coverage Amendments,' requiring the state Public Employees' Benefit and Insurance Program to cover doula services, licensed direct-entry midwives and licensed birth centers for pregnant state workers. It passed the House 67-0 and the Senate 25-1 and was signed by Gov. Cox in March 2023, carrying a negative fiscal note because birth-center care is cheaper.",
        why: 'As a minority-party member she moved a substantive, near-unanimous health benefit into law, a rare concrete win.',
        source: { label: 'Utah Legislature', url: 'https://le.utah.gov/~2023/bills/static/HB0415.html' } },
      { impact: 'positive', category: 'rhetoric', date: '2025–2026', tags: ['Public Statements', 'Public Behavior'],
        headline: "Brought her infant to the Capitol, then backed expanding 'Infant at Work'",
        facts: "After her babysitter fell ill, Matthews began bringing her infant son to the House floor daily during the 2025 session, and he stayed due to popular demand. She said having him nearby improved her focus, while cautioning the arrangement isn't right for every family. In 2026 she publicly supported SB258 to make Utah's Infant at Work pilot permanent and open it to more executive-branch agencies.",
        why: 'It ties her family-policy advocacy directly to her own lived experience as a working parent and public employee.',
        source: { label: 'Deseret News', url: 'https://www.deseret.com/utah/2026/02/09/babies-will-be-happier-expanding-utahs-infant-at-work-program/' } },
    ],
    stances: {
      'Maternal & Reproductive Health Coverage': 'Supports expanding insurance coverage for pregnancy and childbirth, including doulas, direct-entry midwives and licensed birth centers, framing it as both a health and cost-saving measure for working families (HB415, 2023).',
      'Second-Chance / Ex-Offender Employment': 'Advocates for public entities to hire qualified people with criminal records, arguing employment is vital to reintegration after incarceration (HCR022, 2022).',
    },
    promises: [
      { title: 'Cover maternal care for state employees (doulas, midwives, birth centers)', verdict: 'kept',
        detail: "As chief sponsor of HB415 (2023), required the Public Employees' Benefit and Insurance Program to cover doula services, direct-entry midwives and birth centers for pregnant state workers; passed nearly unanimously and signed into law, effective for plan years beginning July 1, 2023.",
        sources: [{ label: 'Utah Legislature', url: 'https://le.utah.gov/~2023/bills/static/HB0415.html' }] },
    ],
  },

  jdailey: {
    theme: 'A public-health PhD and House Democratic Whip who pairs persistent, expertise-driven health and disability legislation with sharp critiques of the GOP supermajority’s priorities.',
    spotlight: [
      { impact: 'positive', category: 'voting', date: '2025', tags: ['Notable Actions'],
        headline: 'Expanded Medicaid eligibility for Utahns with disabilities via HB310',
        facts: "Dailey-Provost was primary sponsor of HB310, Disability Coverage Amendments, designed to make Medicaid available to more disabled Utahns while requiring cost-sharing and limiting payments to supports unavailable on the private market. The Disability Law Center submitted public comment in support, and the bill passed both chambers and was signed by the governor.",
        why: 'A signed, expert-backed law materially broadens health coverage for a vulnerable population.',
        source: { label: 'Disability Law Center', url: 'https://disabilitylawcenter.org/general/2025-public-comment-hb-310/' } },
      { impact: 'negative', category: 'rhetoric', date: '2024–2025', tags: ['Rhetoric vs Reality'],
        headline: 'Years of pushing disability-waitlist funding yield only a fraction of the need',
        facts: "Dailey-Provost championed HB393 (2024), a perpetual trust fund to clear the disability-services (DSPD) waitlist, but the bill stalled. After she again requested funding in a 2025 appropriations hearing, the Legislature appropriated $6 million ongoing against an estimated $74 million needed for a waitlist of more than 5,000 people. She argued the funding is not enough.",
        why: 'It illustrates the persistent gap between her advocacy and what the supermajority Legislature actually delivers.',
        source: { label: 'USU IDRPP', url: 'https://idrpp.usu.edu/blog/2024/legislative-round-up-2024' } },
      { impact: 'negative', category: 'rhetoric', date: '2025', tags: ['Public Statements', 'Rhetoric vs Reality'],
        headline: "Accused GOP supermajority of preserving 'liberty' only for the like-minded",
        facts: "Closing the 2025 session as House Minority Whip, Dailey-Provost challenged Republican claims of protecting freedom, saying the Legislature paved the way for some people to have a lot of individual liberties 'but maybe not everybody,' and that those liberties seemed targeted to people who think, look and vote like much of the Legislature.",
        why: 'It captures her leadership-level framing of the majority party as selectively protective of rights.',
        source: { label: 'Daily Herald', url: 'https://www.heraldextra.com/news/2025/mar/10/curtain-falls-on-utah-legislative-session/' } },
      { impact: 'negative', category: 'rhetoric', date: '2025', tags: ['Public Statements'],
        headline: "Warned the state's planned homeless campus reflects 'underinvestment'",
        facts: "Reacting in September 2025 to plans for a new homeless campus with civil-commitment beds, Dailey-Provost questioned the 'inefficiencies' framing, suggesting the real issue was underinvestment in existing infrastructure, and said she was concerned about siting the campus far from existing services.",
        why: 'It shows her applying a public-health lens to homelessness policy and pushing back on the state’s approach.',
        source: { label: 'Utah News Dispatch', url: 'https://utahnewsdispatch.com/2025/09/18/utah-new-homeless-campus-civil-commitment-beds/' } },
    ],
    stances: {
      'Hemp & Cannabinoid Regulation': 'Sponsored Utah’s most sweeping overhaul of hemp-cannabinoid rules, banning intoxicating semi-synthetic products like delta-8 and THC-O while tightening processor licensing and adding medical-cannabis pharmacy capacity (HB54, 2025).',
      'Breast Cancer Screening Access': 'Pushed to remove patient cost-sharing for diagnostic follow-up breast exams beyond the covered initial mammogram, aiming to eliminate financial delays in screening; the bill was held in committee over fiscal-note concerns (HB314, 2025).',
    },
    promises: [
      { title: 'Expand Medicaid eligibility for Utahns with disabilities', verdict: 'kept',
        detail: 'Sponsored HB310 (2025) to extend Medicaid to more disabled Utahns with cost-sharing and limits ensuring it only covers supports unavailable on the private market; signed into law.',
        sources: [{ label: 'Disability Law Center', url: 'https://disabilitylawcenter.org/general/2025-public-comment-hb-310/' }] },
      { title: 'Create a perpetual trust fund to clear the disability-services waitlist', verdict: 'broken',
        detail: 'Sponsored HB393 (2024) to establish a Services for People with Disabilities Perpetual Trust Fund for stable, ongoing waitlist funding instead of year-to-year appropriations; the bill did not advance.',
        sources: [{ label: 'USU IDRPP', url: 'https://idrpp.usu.edu/blog/2024/legislative-round-up-2024' }] },
      { title: 'Curb intoxicating hemp-derived cannabinoids', verdict: 'kept',
        detail: 'Sponsored HB54 (2025) banning conversion-based intoxicants such as delta-8 and THC-O, capping total THC plus analogs, and tightening retailer and processor rules; signed into law.',
        sources: [{ label: 'Utah Legislature', url: 'https://le.utah.gov/~2025/bills/static/HB0054.html' }] },
    ],
  },

  mike_kohler: {
    theme: 'A generational farmer and 16-year county commissioner who built a brand around local control and water expertise, then twice owned up to votes that overrode the very local authority he champions.',
    spotlight: [
      { impact: 'positive', category: 'transparency', date: '2023', tags: ['Public Statements', 'Rhetoric vs Reality'],
        headline: "Admitted he voted 'yes in error' on SB84 forcing the Dakota Pacific development on Summit County",
        facts: "After the 2023 Legislature passed SB84, which contained a last-minute mandate letting the Dakota Pacific project proceed at Kimball Junction without county approval, Kohler and a fellow Summit County representative told KPCW they had voted yes in error because they did not know the mandate was in the bill. Summit County later sued and a court ruled SB84 did not apply to the property.",
        why: 'A rare, on-the-record admission of a floor-vote mistake on a bill that overrode the local control he campaigns on, showing accountability but also the cost of fast-moving, late-amended legislation.',
        source: { label: 'KPCW', url: 'https://www.kpcw.org/summit-county/2023-02-16/legislature-oks-sb84-potentially-forcing-dakota-pacific-development-at-kimball-junction' } },
      { impact: 'positive', category: 'voting', date: '2026', tags: ['Consistency', 'Notable Actions'],
        headline: "Filed HB592 to abolish new 'preliminary municipalities' after regretting his earlier vote",
        facts: "In the 2026 session Kohler sponsored HB592, which would have barred new applications to incorporate a developer-driven 'preliminary municipality' and required initial landowners to compensate counties for infrastructure damage. Observers noted he had buyer's remorse for voting for the original 2024 preliminary-municipality law and was trying to undo it; the bill died in the House in March 2026.",
        why: 'Shows Kohler consistently trying to claw back local-government authority he believes the Legislature handed to developers, even reversing his own prior vote.',
        source: { label: 'Utah Legislature', url: 'https://le.utah.gov/~2026/bills/static/HB0592.html' } },
    ],
    stances: {
      'Local Control & Land Use': "Argues the state government continues to give itself too much control over decisions counties and municipalities should make, citing state-forced development like Dakota Pacific in Summit County as the harm (HB592, 2026).",
      'Developer-Driven Incorporation': "Opposes the 'preliminary municipality' route that lets developers stand up new towns with limited county say, and sponsored legislation to end new ones and require developers to compensate counties for infrastructure damage.",
    },
    promises: [
      { title: "Roll back developer-driven 'preliminary municipality' incorporations", verdict: 'broken',
        detail: 'After regretting his vote for the 2024 law creating preliminary municipalities, sponsored HB592 (2026) to bar new such incorporations and add county protections; the bill died in the House without passing.',
        sources: [{ label: 'Utah Legislature', url: 'https://le.utah.gov/~2026/bills/static/HB0592.html' }] },
    ],
  },

  doug_owens: {
    theme: 'A low-drama minority Democrat who leverages bipartisan caucus leadership and cross-aisle dealmaking to pass tangible conservation, child-safety and criminal-justice reforms in a Republican supermajority.',
    spotlight: [
      { impact: 'positive', category: 'rhetoric', date: '2022–2025', tags: ['Positive Leadership', 'Notable Actions'],
        headline: 'Co-chairs the bipartisan Great Salt Lake and Clean Air caucuses',
        facts: "Owens co-chairs the Great Salt Lake Legislative Caucus alongside a Republican colleague, plus the bipartisan Clean Air and Hunting & Fishing caucuses. He persuaded GOP leadership to fly the entire Legislature over the shrinking lake by National Guard helicopter, an awareness effort the governor praised. As a minority-party member he frames the lake as nonpartisan.",
        why: 'Shows a Democrat in a supermajority Republican body building genuine cross-party coalitions rather than partisan posturing.',
        source: { label: 'Great Salt Lake Collaborative', url: 'https://greatsaltlakenews.org/latest-news/fox-13/small-caucus-of-utah-lawmakers-will-push-great-salt-lake-bills' } },
      { impact: 'positive', category: 'voting', date: '2025', tags: ['Notable Actions', 'Positive Leadership'],
        headline: 'Authored a landmark child-influencer protection law (HB322)',
        facts: "Owens sponsored HB322, 'Child Actor Regulations,' making Utah one of a handful of states to protect kids featured in monetized social-media content; it requires parents earning above a threshold to set aside earnings in trust and gives children a right to deletion at 18. He developed it with major platforms and it passed the Senate unanimously on the session's final day and was signed by Gov. Cox.",
        why: 'A first-in-class consumer-protection win passed unanimously, demonstrating effective cross-aisle legislating.',
        source: { label: 'Deseret News', url: 'https://www.deseret.com/utah/2025/03/07/child-influencer-protections/' } },
      { impact: 'positive', category: 'voting', date: '2022', tags: ['Notable Actions', 'Consistency'],
        headline: 'Passed a dust-mitigation law protecting communities from toxic lakebed metals (HB317)',
        facts: "Owens sponsored HB317 (2022), clarifying that the ban on driving motor vehicles on exposed lakebeds includes off-highway vehicles, to prevent disturbance of the salt crust that traps toxic heavy metals like arsenic. In 2025 he kept pushing the issue, securing ongoing funding for Great Salt Lake dust air-quality monitors.",
        why: 'Demonstrates sustained, consensus-built work on a public-health threat affecting communities around the lake.',
        source: { label: 'Deseret News', url: 'https://www.deseret.com/utah/2022/4/24/23037331/new-law-prohibits-motor-vehicles-on-dry-lake-beds-streams-great-salt-lake-toxic-dust/' } },
      { impact: 'positive', category: 'rhetoric', date: '2025', tags: ['Public Statements', 'Rhetoric vs Reality'],
        headline: "Calls out lack of 'political will' on Great Salt Lake water acquisition",
        facts: "In 2025 Owens warned that incremental fixes will fall short and the state must dedicate real water to the lake. He criticized that the Legislature appropriated far less for water acquisition than the governor requested, and that the agriculture-optimization program spent heavily on irrigation upgrades without requiring conserved water reach the lake, while insisting on partnering with farmers rather than blaming them.",
        why: 'Candid, specific critique of his own Legislature’s underfunding shows willingness to name shortfalls rather than spin progress.',
        source: { label: 'Grow The Flow Utah', url: 'https://growtheflowutah.org/2025/06/06/utah-has-the-tools-now-it-needs-the-political-will-a-conversation-with-rep-doug-owens/' } },
    ],
    stances: {
      'Criminal-Justice Alternatives': "Supports expanding alternatives to incarceration, backing sheriff's work programs that let eligible inmates do supervised public-works projects instead of jail time, with good-behavior credit and eligibility guardrails (HB136, 2025).",
      'Child Online Safety & Influencer Protections': 'Champions protections for children featured in monetized online content, requiring earnings be set aside in trust and granting a right to deletion of content at adulthood (HB322, 2025).',
    },
    promises: [
      { title: 'Expand alternative-incarceration / sheriff’s work programs', verdict: 'pending',
        detail: "Pledged to give county sheriffs clear authority to run supervised public-works programs as an alternative to jail, with defined eligibility and good-behavior credit. HB136 passed the House 64-0 in 2025 but did not clear the Senate; he reintroduced it as HB226 in 2026.",
        sources: [{ label: 'Utah Legislature', url: 'https://le.utah.gov/Session/2026/bills/introduced/HB0226.pdf' }] },
      { title: 'Protect child influencers’ earnings and reputation', verdict: 'kept',
        detail: 'Promised legislation so children in monetized family content are protected and compensated fairly, requiring profiting parents to set aside earnings in trust and letting young creators remove content as adults; delivered via HB322 (2025), signed into law.',
        sources: [{ label: 'Deseret News', url: 'https://www.deseret.com/utah/2025/03/07/child-influencer-protections/' }] },
    ],
  },

  jake_sawyer: {
    theme: "As a freshman first seated in January 2025, Sawyer's public record is short and contains no notable conduct or integrity events; the clearest signal so far is a modest, consumer-focused legislative footprint.",
    spotlight: [
      { impact: 'positive', category: 'voting', date: '2026', tags: ['Notable Actions'],
        headline: 'HB493 adds menstrual-product ingredient labeling and consumer weights-and-measures penalties',
        facts: "Sawyer was chief sponsor of HB493, 'Consumer Products Amendments' (2026). Beyond shelf-price accuracy, the bill requires manufacturers of menstrual products sold in Utah to list intentionally added ingredients on packaging, authorizes the Division of Consumer Protection to enforce labeling, and sets a civil-penalty schedule for weights-and-measures violations. It passed both chambers and was sent to the governor in March 2026.",
        why: 'It is one of only two bills this freshman has chief-sponsored, and the ingredient-transparency provision is a concrete, verifiable indicator of where he is putting legislative effort.',
        source: { label: 'LegiScan — UT HB493 (2026)', url: 'https://legiscan.com/UT/text/HB0493/id/3348186' } },
    ],
    stances: {
      'Consumer Protection': 'Backs stronger consumer-transparency rules, sponsoring legislation to guarantee shelf prices match register prices, require menstrual-product ingredient labeling, and authorize state enforcement of weights-and-measures and labeling standards (HB493, 2026).',
    },
    promises: [],
  },

  lisa_shepherd: {
    theme: 'In her first full term, Shepherd has translated her campaign focus on open records into concrete legislation, most notably a 2026 GRAMA bill making government spending records public that was signed into law.',
    spotlight: [
      { impact: 'positive', category: 'transparency', date: '2026', tags: ['Notable Actions', 'Positive Leadership'],
        headline: 'Her bill making government receipt and expenditure records public is signed into law',
        facts: "Shepherd was chief sponsor of HB325, 'Government Records Classification Amendments' (2026). The bill classifies as public any record documenting a governmental entity's receipt or expenditure of funds, including financial accounts, budgets, vouchers, grants, ledgers and compensation paid to vendors and contractors, while keeping a few narrow categories private. It passed both chambers and was signed by Gov. Cox in March 2026.",
        why: 'A substantive, enacted transparency win that directly advances her stated open-records agenda by expanding public access rather than restricting it.',
        source: { label: 'Utah Legislature / BillTrack50', url: 'https://www.billtrack50.com/billdetail/1946290' } },
      { impact: 'negative', category: 'rhetoric', date: '2026', tags: ['Public Statements', 'Rhetoric vs Reality'],
        headline: "Cites 'inherent distrust of elections' while pushing to strip the lieutenant governor of election oversight",
        facts: "Presenting a constitutional amendment and bill to create a separately elected secretary of state, Shepherd told a House committee, 'We have a bit of an inherent distrust of elections, no matter if the actors are good — and they are,' framing it as a structural fix and saying she didn't want the lieutenant governor tainted by the controversy around elections. The measure cleared committee but stalled in the Senate, where leadership questioned what problem it solved.",
        why: 'Her own words acknowledge that election officials have acted in good faith, so institutionalizing distrust as a rationale for restructuring is a tension critics flag even as she insists the change is purely structural.',
        source: { label: 'Salt Lake Tribune', url: 'https://www.sltrib.com/news/politics/2026/02/26/utah-lawmaker-wants-end-lieutenant/' } },
    ],
    stances: {
      'Open Records / GRAMA Reform': 'Has used her seat to push concrete GRAMA changes expanding public access, including a signed 2026 law making government financial receipts and expenditures public records (HB325, 2026).',
    },
    promises: [],
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
  console.log(`PolitiDex — Utah legislator multi-layer deep dive  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
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
