#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — Davis County deep dive, BATCH 2 (June 2026)
//
// Batch 1 deepened the sitting Davis County state legislators (Millner, Jerry
// Stevenson, Cutler, Weiler, Ward, Hall, Peterson, Ballard, etc.) — every one of
// them now carries an impact-tagged Accountability / Spotlight integrity layer.
// A roster audit of the live Firestore `politicians` collection found the next
// honest gap is the Davis COUNTY-LEVEL and MUNICIPAL tier: the people who decide
// the county budget, property-tax rate, and local growth that Davis voters feel
// most directly — and who still had ZERO impact-tagged Spotlight drivers:
//
//   • jpetro          — Joy Petro, Mayor of Layton (sitting)
//   • john_crofts     — John Crofts, Davis County Commissioner (sitting, elected 2024)
//   • scott_parke     — Scott Parke, Davis County Controller (appointed July 2025)
//   • jon_atkin       — Jon Atkin, 2026 Republican nominee for Davis County Sheriff
//   • kendalyn_harris — Kendalyn Harris, 2026 nominee, Commission Seat A (ex-Bountiful mayor)
//   • susan_lee       — Susan Lee, 2026 nominee, Commission Seat B (ex-Kaysville council)
//
// For each, this pass builds TWO layers from genuine sourced research:
//
//   • Spotlight / Accountability — 3–5 sourced integrity receipts per figure
//     (impact: positive = words match actions / principled stand; negative =
//     inconsistency, controversy, contested action; neutral = factual context such
//     as a primary win or endorsement that documents standing without driving the
//     score), plus a one-line spotlight theme. The frontend merges document
//     `spotlight` onto the curated layer and recomputes the Accountability read.
//   • Issue positions — additional `stances` (topic → text) grounded in a real
//     vote, budget action, or documented public position, skipping any topic
//     already present.
//
// Honesty rules (matching the rest of the site, esp. CONTENT_STYLE.md):
//   • Nothing is invented. Every receipt carries a real {label,url} `source` that
//     was fetched and verified during research; preference for primary/local
//     sources (county & city records, Utah PMN minutes, Standard-Examiner, KSL,
//     KUER, Deseret News).
//   • Balanced where the record supports it: Crofts shows both his lone vote
//     against the county tax hike AND the workplace-conduct investigation; Harris
//     shows her Bountiful fiscal record AND her unquantified county cost critiques.
//   • Sitting officials with a real governing record get impact-tagged drivers;
//     first-time NOMINEES, who have no record in the office they seek, carry their
//     electoral standing as NEUTRAL context (not score-inflating positives), with
//     impact-tagged items reserved for genuine prior-office records (Harris's
//     Bountiful budgets, Lee's Kaysville oversight) or documented positions.
//   • Idempotent & non-destructive: re-fetches the live doc, only adds stances that
//     aren't already there, only writes the theme when an editor hasn't set one,
//     and never clobbers a profile that already carries impact-tagged Spotlight
//     drivers.
//
//   node scripts/deep-dive-davis-county-batch2-jun2026.mjs            # dry run (default)
//   node scripts/deep-dive-davis-county-batch2-jun2026.mjs --apply    # write to Firestore
// ---------------------------------------------------------------------------

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const STAMP = '2026-06-30T00:00:00.000Z';

// ── Curated, sourced deep-dive data (keyed by Firestore doc id) ──────────────
const DATA = {
  jpetro: {
    theme: "A second-term Layton mayor whose steady, low-drama governance shows in the receipts — adopting the FY2025-26 budget at the no-increase certified rate, advancing a new 911 emergency operations center, and taking a regional transportation leadership seat — though most city land-use votes rest with the council, not the mayor.",
    spotlight: [
      { impact: 'positive', category: 'voting', date: '2025', tags: ['Notable Actions', 'Consistency'],
        headline: 'Adopted the FY2025-26 Layton budget at the no-increase certified tax rate',
        facts: "On June 19, 2025 the Layton City Council adopted the FY2025-26 budget and property-tax rate (Ordinance 25-13) set equivalent to the Certified Tax Rate provided by the Davis County Auditor and the Utah State Tax Commission — meaning no city property-tax increase — alongside a sewer-fee update and an FY2024-25 budget amendment, on a roughly $46 million general fund.",
        why: 'Holding the city portion of property taxes flat at the certified rate is a concrete, checkable fiscal action, especially as Davis County separately pursued a large increase.',
        source: { label: 'Layton City (official)', url: 'https://www.facebook.com/LaytonCity/posts/layton-city-council-meeting-action-for-thursday-june-19-2025item-number-5asubjec/1052042897116440/' } },
      { impact: 'positive', category: 'promise', date: '2025–2026', tags: ['Notable Actions', 'Positive Leadership'],
        headline: 'Advanced a new 25,200 sq ft Layton 911 emergency operations center',
        facts: "Layton is building a two-story, 25,200-square-foot Emergency Operations Center housing a 911 dispatch/communications center, training space, and evidence storage, in partnership with Davis County and local agencies, with a listed completion date of May 2026. Petro's public-safety record cites the new 911 call center among her priorities.",
        why: 'A multi-year capital project with a defined scope and 2026 completion date is a measurable public-safety deliverable distinct from staffing pledges.',
        source: { label: 'Galloway (project architect)', url: 'https://gallowayus.com/project/layton-city-emergency-operations-center/' } },
      { impact: 'positive', category: 'voting', date: '2024–2025', tags: ['Notable Actions', 'Public Behavior'],
        headline: 'Holds a regional transportation leadership seat as WFRC committee Vice Chair',
        facts: "Petro is Vice Chair of the Wasatch Front Regional Council (WFRC) Active Transportation Committee and has actively participated in regional roads/transit decisions — including seconding approval of new projects in the 2025-2030 Transportation Improvement Program, which passed unanimously. She also chairs the Davis County Board of Health and the North Davis Sewer District.",
        why: 'A formal regional transportation seat gives Layton residents a documented voice on UTA, trail, and roads funding — an actual role rather than a campaign claim.',
        source: { label: 'Wasatch Front Regional Council', url: 'https://wfrc.utah.gov/committees/active-transportation-committee/' } },
    ],
    stances: {
      'Property Taxes & Fiscal Policy': 'Under Petro, Layton adopted its FY2025-26 budget at the certified tax rate set by the Davis County Auditor and Utah State Tax Commission (Ordinance 25-13, June 19, 2025) — no city property-tax increase — even as Davis County pursued a separate hike.',
      'Transportation & Regional Transit': 'As Vice Chair of WFRC’s Active Transportation Committee, Petro takes part in regional roads, transit, and trail-funding decisions, including seconding approval of new projects in the 2025-2030 Transportation Improvement Program.',
    },
  },

  john_crofts: {
    theme: "A first-term Davis County commissioner who built a free plain-language transparency platform and cast the lone vote against the county's 2025 property-tax hike, but whose combative first year triggered a five-month workplace-conduct investigation that found 'significant' liability concerns.",
    spotlight: [
      { impact: 'positive', category: 'voting', date: '2025', tags: ['Notable Actions', 'Consistency'],
        headline: "Cast the lone vote against Davis County's first property-tax hike since 2017",
        facts: "On Dec. 2, 2025 the Davis County Commission approved a 14.9% property-tax increase on a 2-1 vote, with Chair Lorene Kamalu and Commissioner Bob Stevenson in favor and Crofts dissenting. Crofts opposed any increase, saying he didn't believe it was in residents' best interest for commissioners to be 'tone deaf to their wishes.' The hike — the county's first since 2017 — raises about $6 million, roughly $4 a month for an average home; a larger ~30% option had been floated in October.",
        why: 'His no vote made him the only commissioner to side with the nearly 300 residents who turned out in opposition, consistent with his fiscal-responsibility platform.',
        source: { label: 'KSL', url: 'https://www.ksl.com/article/51413684/davis-county-commission-oks-149-property-tax-increase' } },
      { impact: 'negative', category: 'redflags', date: '2026', tags: ['Public Behavior', 'Rhetoric vs Reality'],
        headline: 'A five-month investigation found "significant" liability concerns over his conduct',
        facts: "An independent investigation by attorney Kristin A. VanOrman of Strong & Hanni, begun in November 2025 and running roughly five months, examined allegations of a hostile work environment, political favoritism, and defamation, drawing on 26 current and former employees. VanOrman wrote she had 'significant concerns regarding the potential liability' for the county and Crofts personally and called his denials of defamatory statements 'disingenuous,' but found no malice and recommended workplace-conduct training. Since Crofts took office in January 2025, his executive assistant, office manager, and animal-care director had all departed.",
        why: 'The findings raise documented governance and personnel-management concerns about a first-term official, even as the investigator found no criminal conduct or malice.',
        source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/2026/may/24/investigation-conducted-into-behavior-of-davis-county-commissioner-john-crofts/' } },
      { impact: 'negative', category: 'rhetoric', date: '2026', tags: ['Public Statements', 'Rhetoric vs Reality'],
        headline: 'Called the conduct probe "frivolous" and said it "exonerated" him',
        facts: "Responding to the May 2026 report, Crofts called the investigation 'frivolous and costly' and 'an increasingly political and deeply flawed process' built on anonymous complaints and hearsay, and questioned how confidential personnel records reached the media. He said he was not elected to 'protect bureaucracy or preserve the status quo.' His characterization that the probe exonerated him is in tension with the investigator's stated 'significant concerns regarding the potential liability.'",
        why: 'His public framing of the findings contrasts sharply with the investigator’s written conclusions — a rhetoric-vs-reality gap voters can weigh.',
        source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/2026/may/24/investigation-conducted-into-behavior-of-davis-county-commissioner-john-crofts/' } },
      { impact: 'positive', category: 'transparency', date: '2025', tags: ['Positive Leadership', 'Transparency'],
        headline: 'Delivered on his evening-meeting and town-hall transparency promises',
        facts: "Per the county's March 2025 'DC Connector' newsletter, Crofts held a public town hall on March 5, 2025 at 6:00 p.m. at the Farmington Library, and the commission launched a three-month pilot moving its second-Tuesday meetings to 6:00 p.m. (April 8, May 13, and June 10, 2025) — tracking his 2024 campaign pledges to move 10 a.m. meetings to evenings and hold town halls.",
        why: 'Concrete follow-through on his campaign transparency and public-access promises within his first months in office.',
        source: { label: 'Davis County (DC Connector, March 2025)', url: 'https://www.daviscountyutah.gov/sitefinity/websitetemplates/resource/email/2025-March.html' } },
    ],
    stances: {
      'Property Taxes & County Budget': "Opposes raising county property taxes: Crofts was the lone vote against the Dec. 2, 2025 14.9% increase (the county's first since 2017, ~$6M in new revenue), saying commissioners should not be 'tone deaf' to residents' wishes; Kamalu's motion passed 2-1.",
      'Growth & High-Density Housing': "In his 2024 KUER voter-guide responses, Crofts listed preserving community values among his top priorities and said he opposes high-density housing while favoring easier construction of accessory 'mother-in-law' apartments and creating affordable housing.",
    },
  },

  scott_parke: {
    theme: "A CPA appointed Davis County Controller in July 2025 who built a record of blunt fiscal candor — diagnosing a roughly $12M structural General Fund deficit, laying out three explicit tax-and-cut options for the public, and pressing commissioners to structurally balance the budget rather than lean on one-time fixes.",
    spotlight: [
      { impact: 'positive', category: 'transparency', date: '2025', tags: ['Notable Actions', 'Transparency'],
        headline: 'Laid out a $12M structural deficit and three explicit tax-or-cut paths at public hearing',
        facts: "At the Dec. 2, 2025 commission budget hearing, Parke told residents the General Fund 'currently has a $12 million structural deficit,' explaining that 'for every $50,000.00 of revenue we collect, we are spending nearly $60,000.00.' He presented three options: no tax increase with deep cuts, a 14.9% hike paired with ~$6 million in cuts, or a nearly 30% hike to avoid service disruptions, and warned that drawing on reserves 'to keep the lights on' was 'simply unsustainable in the long run.' He added, 'We just can't grow our way out of this.'",
        why: 'He turned an opaque budget gap into a clearly framed public choice rather than burying the tradeoffs.',
        source: { label: 'Davis County Commission Minutes, Dec. 2, 2025 (Utah PMN)', url: 'https://www.utah.gov/pmn/files/1372987.pdf' } },
      { impact: 'positive', category: 'rhetoric', date: '2025', tags: ['Public Statements', 'Rhetoric vs Reality'],
        headline: 'Backed an unpopular tax ask with concrete cost data — 32% inflation, rising sheriff wages',
        facts: "Explaining the proposed increase to KSL in October 2025, Parke said 'if we don't get some new revenue, we're not going to be able to provide the existing level of service.' He cited roughly 32% in price increases since the last hike took effect in 2017 and Davis County Sheriff's Office wages rising from just under $30 million in 2020 to nearly $37 million, while conceding 'nobody likes a tax increase. I mean, I personally don't like increases.'",
        why: 'He grounded a politically unpopular ask in specific, checkable cost figures rather than vague appeals.',
        source: { label: 'KSL', url: 'https://www.ksl.com/article/51393391/davis-county-leaders-propose-tax-hike-of-up-to-30-to-generate-up-to-1268m-in-new-revenue' } },
      { impact: 'positive', category: 'transparency', date: '2026', tags: ['Public Statements', 'Transparency'],
        headline: "Publicly demystified Utah's revenue-neutral property tax for residents",
        facts: "In a June 20, 2026 Standard-Examiner explainer, Parke described Utah's 'backward' tax math — 'we take the amount of money we want to get, we divide it by the value of all the properties, and that comes up with the tax rate' — and stressed that revenue, not the rate, is what matters and that rising home values don't raise county collections because 'if the value goes up, you have to lower your tax rate to offset for that.'",
        why: 'As a CPA in office he used his platform to educate taxpayers on a widely misunderstood system rather than exploit the confusion.',
        source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/local/2026/jun/20/property-taxes-explained-understanding-rates-and-revenues/' } },
      { impact: 'positive', category: 'voting', date: '2025', tags: ['Notable Actions', 'Public Statements'],
        headline: 'Flagged reserves running dry by 2028 and quantified the cost of the no-tax option',
        facts: "In November 2025 budget talks, Parke said the county's path 'is just simply unsustainable' and that reserve/rainy-day funds could be depleted by 2028. He detailed that a no-tax-increase option would require cutting roughly $12.7 million and eliminating 55 jobs (including 40 public-safety/criminal-justice positions), while the 14.9% option would generate about $6.3 million and still require $2 million–$4.2 million in cuts and 14 position eliminations.",
        why: 'He attached hard numbers and a timeline to the consequences of inaction, giving commissioners and the public a concrete stake.',
        source: { label: 'KSL', url: 'https://www.ksl.com/article/51401645/davis-county-leaders-still-debating-proposed-30-property-tax-hike-as-2026-budget-talks-continue' } },
    ],
    stances: {
      'County Budget & Appropriations': "Defines a responsible budget as 'structurally balanced' — recurring revenues equal to or greater than recurring expenses — and rejects covering ongoing operating costs by drawing down reserves, warning that doing so to 'keep the lights on' is 'simply unsustainable in the long run.'",
    },
  },

  jon_atkin: {
    theme: "A 20-year Davis County sheriff's deputy and Air National Guard intelligence officer who won the June 2026 open-seat GOP primary 51.05%–48.95%, running as the only actively-serving law-enforcement officer in the race with broad endorsements from Utah Republican officials — but with no elected record yet to judge.",
    spotlight: [
      { impact: 'positive', category: 'rhetoric', date: '2026', tags: ['Public Statements', 'Consistency'],
        headline: "Ran as the race's only active law officer and an internal-affairs reformer",
        facts: "In a June 6, 2026 Standard-Examiner profile, Atkin argued he is the only actively-serving law-enforcement officer in the race and best positioned to innovate, using the analogy: 'Who do you trust to be more innovative — the John Deere CEO or the fourth-generation farmer?' He tied his accountability and transparency pitch to three and a half years in internal affairs and criticized current leadership on retention, recalling an executive comment that 'some people we chase, some people we let go.'",
        why: 'His core campaign identity rests on being an inside-the-department practitioner and IA reformer rather than an administrator, a consistency claim grounded in his documented 20-year record.',
        source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/2026/jun/06/jon-atkin-focusing-on-current-future-challenges-in-bid-for-davis-county-sheriff/' } },
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions'],
        headline: 'Won the close open-seat GOP sheriff primary; opponent conceded',
        facts: "Atkin won the June 23, 2026 Republican primary for Davis County Sheriff, leading Aaron Perry 51.05% (21,546 votes) to 48.95% (20,662) — a margin of 884 — in the open race to succeed retiring Sheriff Kelly Sparks. He trailed after the first tally Tuesday night but won the ballots counted afterward 56.90%–43.10%; Perry, a 16-year Sheriff's Office employee, conceded on June 25 and offered 'my full support to our next Sheriff.'",
        why: 'A first-time candidate’s narrow primary win in a heavily Republican county is the central fact of his path toward the office, shown here as context rather than a record to judge.',
        source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/local/2026/jun/25/aaron-perry-acknowledges-jon-atkin-as-winner-in-davis-county-sheriff-race/' } },
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Statements'],
        headline: 'Endorsed by Utah House Speaker Mike Schultz',
        facts: "Utah House Speaker Mike Schultz publicly endorsed Atkin on June 4, 2026, posting, 'Davis County, I invite you to vote Jon Atkin for Sheriff. I fully endorse him in this important role.' Schultz said he came to know Atkin through Utah's veteran community and praised his commitment to service and constitutional principles; Atkin's campaign also lists endorsements from several Davis County mayors, former Sheriff Bud Cox, and state legislators.",
        why: 'An endorsement from the most powerful figure in the Utah House documents significant establishment Republican backing for a first-time candidate.',
        source: { label: 'Mike Schultz (official)', url: 'https://www.facebook.com/mikeschultzutah/posts/davis-county-i-invite-you-to-vote-jon-atkin-for-sheriff-i-fully-endorse-him-in-t/4523620067915258/' } },
    ],
    stances: {
      'Immigration & Cooperation with ICE': "Asked about cooperation with Immigration and Customs Enforcement, Atkin said he favors the Jail Enforcement Model — handing off custody when someone in the country illegally commits an arrestable offense and is charged — over the Task Force and Warrant Service Officer models, citing staffing limits and a preference to focus on arresting criminals rather than seeking people out solely for immigration status.",
    },
  },

  kendalyn_harris: {
    theme: "A two-term Bountiful mayor and eight-year councilmember who managed the city's lean, pay-as-you-go budget for over a decade and won the June 2026 GOP primary for open Commission Seat A with 42.84% — running on fiscal discipline, though her county cost critiques so far arrive as questions rather than detailed plans.",
    spotlight: [
      { impact: 'positive', category: 'voting', date: '2022', tags: ['Notable Actions', 'Consistency'],
        headline: "As mayor, her FY23 Bountiful budget held the general property tax flat",
        facts: "Bountiful's FY2022-2023 Operating & Capital Budget, adopted via Ordinance #2022-06 on June 21, 2022 with Harris as mayor, 'contains no increase in general property tax' and describes a 'pay-as-you-go' financial philosophy. A separate debt-service levy that began in 2022 repays an $8,000,000 general obligation bond voters approved in 2020.",
        why: 'It documents the concrete fiscal-discipline record Harris cites as her central qualification for the county commission.',
        source: { label: 'City of Bountiful FY2022-2023 Budget (official)', url: 'https://www.bountifulutah.gov/file/7d91d96d-8aea-427e-8df2-30d03fa18a2e' } },
      { impact: 'positive', category: 'transparency', date: '2017–2022', tags: ['Positive Leadership', 'Transparency'],
        headline: 'Bountiful earned the GFOA budget award six straight years through her tenure',
        facts: "The Government Finance Officers Association awarded Bountiful its Distinguished Budget Presentation Award for six consecutive fiscal years (FY2016-17 through FY2021-22), spanning Harris's council and mayoral service. The award requires a budget that functions as a policy document, operations guide, financial plan, and communications device.",
        why: 'Independent recognition supports the transparent, well-run-budget framing at the center of her candidacy.',
        source: { label: 'City of Bountiful FY2022-2023 Budget (official)', url: 'https://www.bountifulutah.gov/file/7d91d96d-8aea-427e-8df2-30d03fa18a2e' } },
      { impact: 'positive', category: 'rhetoric', date: '2026', tags: ['Public Statements', 'Consistency'],
        headline: "Faulted the county's 14.9% tax hike and how it was communicated",
        facts: "In a May 28, 2026 Standard-Examiner profile, Harris said of the Davis County Commission's roughly 14.9% property-tax increase, 'A lot of people were upset about that, understandably,' faulting both the increase and how it was communicated. She said she prefers 'smaller, incremental increases' over surprise hikes, and described her budgeting rule as 'If everything is important, then nothing is.'",
        why: 'It stakes out a specific, on-the-record county fiscal position distinct from the sitting commission she seeks to join.',
        source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/2026/may/28/south-davis-kendalyn-harris-wants-to-bring-collaboration-to-county-commission/' } },
      { impact: 'negative', category: 'rhetoric', date: '2026', tags: ['Rhetoric vs Reality'],
        headline: 'Questioned $20M animal-control and jail-overtime costs without a specific plan',
        facts: "In the same May 28, 2026 profile, Harris questioned whether a county animal-control facility needs to cost as much as $20 million while acknowledging an upgrade is needed, and flagged the county jail's roughly $1 million in annual overtime as 'a critical piece' she would address with HR and the sheriff's office — but offered no specific alternative dollar figure or plan in the article.",
        why: 'Her cost critiques are framed as questions rather than detailed proposals, leaving the promised savings unquantified.',
        source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/2026/may/28/south-davis-kendalyn-harris-wants-to-bring-collaboration-to-county-commission/' } },
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions'],
        headline: 'Won the three-way GOP primary for open Commission Seat A',
        facts: "In the June 23, 2026 Republican primary for Davis County Commission Seat A — the seat being vacated by Commissioner Bob Stevenson — Harris led with 42.84% (18,494 votes) ahead of Scott Fletcher's 31.06% (13,410) and John Adams's 26.10% (11,267).",
        why: 'A clear plurality win in a crowded field documents broad south-Davis Republican support heading into the general election.',
        source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/2026/jun/24/election-results-susan-lee-takes-lead-in-davis-county-commission-race-jon-atkin-grows-lead-in-sheriff-race/' } },
    ],
    stances: {
      'Municipal Power & Enterprise Funds': "Oversaw Bountiful's city-owned electric utility (Bountiful City Light & Power), a substantial municipal operation — the FY2022-23 budget projected $28.1 million in electricity sales against $30.6 million in Light & Power expenditures — and as mayor signed Ordinance 2023-01 adopting BCLP's electric rate schedules and service policies.",
      'Fiscal Framework & Pay-As-You-Go': "Applied a structured fiscal framework as mayor: Bountiful's formal Council Policy Priorities placed 'Financial Balance & Accountability' — explicitly pay-as-you-go, transparency, and balanced revenue sources — alongside economic development aimed at lowering residents' tax burden and broadening the tax base.",
    },
  },

  susan_lee: {
    theme: "A former Kaysville City Council member and accountant who organized a municipal power-utility oversight commission, entered the 2026 race over a Davis County tax increase, and — after a sub-2-point primary that flipped mid-count — overtook two-term incumbent Lorene Kamalu to become Seat B's effective Republican nominee.",
    spotlight: [
      { impact: 'positive', category: 'voting', date: '2018–2021', tags: ['Positive Leadership', 'Notable Actions'],
        headline: 'Pushed to create the Kaysville power-utility oversight commission',
        facts: "Lee says that on the Kaysville City Council she pressed to form a Power Commission to oversee the city's municipal electric utility, which she says held under $1 million in reserves against a needed $5 million, and that the commission replaced the power superintendent and sold west-side city land to rebuild reserves to $5 million. City records confirm she attended the Oct. 1, 2020 Kaysville City Council meeting, which featured a 'Power Commission Special Presentation' with an ECI Engineering reliability and long-range-plan report on Kaysville Power.",
        why: 'It substantiates her core claim of hands-on utility budget oversight, though the specific reserve and personnel figures are her own account rather than independently documented.',
        source: { label: 'Kaysville City Council Minutes, Oct. 1, 2020 (Utah PMN)', url: 'https://www.utah.gov/pmn/files/655667.pdf' } },
      { impact: 'positive', category: 'rhetoric', date: '2026', tags: ['Public Statements', 'Consistency'],
        headline: 'Frames county finances as a structural mismatch, not a one-time gap',
        facts: "In a 2026 PoliticIt podcast interview, Lee argued county spending has grown more than 50% faster than county growth since 2017, and that Davis County used one-time federal COVID relief funds to create permanent staffing and ongoing programs, leaving a gap when that money expired. She also criticized commissioners for voting to raise their own pay within a week of approving the property-tax increase.",
        why: 'It shows her tax opposition rests on a specific structural-budget argument rather than blanket anti-tax rhetoric.',
        source: { label: 'PoliticIt', url: 'https://politicit.com/susan-lee-for-davis-county-commissioner-exclusive-interview-with-utah-sen-john-johnson/' } },
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions'],
        headline: 'Flipped a sub-2-point primary mid-count to lead a two-term incumbent',
        facts: "On primary night June 23, 2026, incumbent Lorene Kamalu led Lee 50.06% to 49.94% — just 42 votes. After about 5,829 more ballots were tallied by June 24, Lee took a 665-vote lead, 50.77% (21,807) to 49.23% (21,142), and by June 26 led by 782 votes. With no non-Republican filed, the primary winner takes the seat; Lee noted a recount remained possible.",
        why: 'Overtaking an eight-year incumbent in a mid-count reversal is the consequential, still-unfolding fact of her path to the seat, shown here as context pending certification.',
        source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/2026/jun/24/election-results-susan-lee-takes-lead-in-davis-county-commission-race-jon-atkin-grows-lead-in-sheriff-race/' } },
      { impact: 'negative', category: 'redflags', date: '2026', tags: ['Rhetoric vs Reality'],
        headline: 'Critics question whether ideology will override county needs',
        facts: "A Network of Utah Moderates profile (June 6, 2026), which endorsed Kamalu, cautioned that Lee's 'ideology rather than looking at county needs may negatively impact Davis County.' It notes Lee served as president of the Davis County GOP's Lincoln Club and organized a Lincoln Day dinner that named her son, state Rep. Trevor Lee, 'Legislator of the Year.'",
        why: 'A contested, opinion-based critique from a publication that endorsed her opponent, included for balance, flagging partisan-ideology and family-network concerns voters may weigh.',
        source: { label: 'Network of Utah Moderates', url: 'https://networkofutahmoderates.com/p/davis-county-commission-lorene-kamalu' } },
    ],
    stances: {
      'Budget Reform Tools': "Backs concrete budget-reform mechanisms for the county: zero-based budgeting, sunset clauses on programs funded by one-time money, a freeze on non-essential hiring, benchmarking county compensation against neighboring counties, line-item budget transparency, and a citizen fiscal-oversight council.",
      'Senior Property-Tax Relief': "Beyond general fixed-income concern, Lee specifically supports property-tax freezes, circuit-breaker credits, and targeted exemptions for qualifying seniors as tools to shield older residents from rising county taxes.",
      'Government Debt & Bonding': "Cites her opposition to a $35 million municipal-fiber bond — which she says voters rejected before private companies built the service at no taxpayer cost — as why the county should avoid debt-funded ventures that compete with private business.",
    },
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
  console.log(`PolitiDex — Davis County deep dive (batch 2: county & municipal tier)  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
  let touched = 0, missing = 0, skippedDrivers = 0;
  let totSpot = 0, totStance = 0;

  for (const [id, plan] of Object.entries(DATA)) {
    let doc;
    try { doc = await getDoc(id); } catch (e) { console.log(`  ✗ ${id}: ${e.message}`); missing++; continue; }
    if (!doc) { console.log(`  – ${id}: not in Firestore — skipped`); missing++; continue; }

    const fields = { updatedAt: STAMP };

    // 1) Spotlight receipts (only if none yet) + theme
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

    totSpot += addedSpot; totStance += addedStance;
    console.log(`  ${APPLY ? '✎' : '→'} ${id} (${doc.name}): +${addedSpot} spotlight receipt(s), +${addedStance} issue position(s)`);

    // Only write if something actually changed beyond the timestamp
    if (Object.keys(fields).length > 1) {
      if (APPLY) await patch(id, fields);
      touched++;
    }
  }

  console.log(`\n${APPLY ? 'Applied' : 'Would apply'} to ${touched} profile(s): ${totSpot} spotlight receipt(s), ${totStance} issue position(s).`);
  console.log(`(${skippedDrivers} already had spotlight drivers; ${missing} not found.)`);
  if (!APPLY) console.log('\nRe-run with --apply to write to Firestore.');
})();
