// ─────────────────────────────────────────────────────────────────────────────
// Database expansion controller + coverage suggestions
// ─────────────────────────────────────────────────────────────────────────────
// Extracted verbatim from index.html (it began at line 14654 of the pre-split
// document) as part of the first-paint pass. Not a rewrite: the code below is
// byte-for-byte what was inline, and the <script src> that replaced it sits at
// the same position in the document, so execution order and global scope are
// unchanged. It moved out so the HTML stops carrying it on every single visit —
// external scripts are cached and V8-code-cached across loads; inline script in
// a revalidated document is re-downloaded and re-compiled every time.
// ─────────────────────────────────────────────────────────────────────────────
    // ════════════════════════════════════════════════════════════
    // DATABASE EXPANSION CONTROLLER
    // ════════════════════════════════════════════════════════════

    var EXPANSION_SUGGESTIONS = {
      "utah-leg": [
        {
          id: "escamilla",
          name: "Luz Escamilla",
          office: "State Senator (Dist. 10)",
          state: "Utah",
          party: "Democrat",
          district: "District 10 (Salt Lake County)",
          why: "Prominent Senate Minority Leader. Key advocate for Utah's Hispanic community, healthcare access, and air quality initiatives.",
          score: 82, kept: 18, broken: 3, pending: 4, icon: "🏛", tier: "silver",
          keyIssues: ["Healthcare Access", "Air Quality & Inversion", "Intergenerational Poverty", "Language Access"],
          bio: "Luz Escamilla has represented Salt Lake City's west side in the Utah Senate since 2008, becoming the chamber's first Latina senator and rising to Senate Minority Leader in 2019. A former banker and the daughter of immigrants, she built her career around economic-mobility policy, chairing work on Utah's intergenerational-poverty commission. She ran for Salt Lake City mayor in 2019, finishing a close second, and has remained the most visible Democratic voice on healthcare access, air quality, and immigrant-community issues in a Republican supermajority Legislature.",
          quote: "When the air is unhealthy, it is unhealthy for everyone — but it falls hardest on the families who can least afford to leave.",
          promises: [
            { title: "Build a long-term strategy to break generational poverty", detail: "Helped establish and sustain Utah's Intergenerational Welfare Reform Commission, keeping data-driven anti-poverty work funded across multiple sessions.", verdict: "kept", issueKey: "gov_services" },
            { title: "Expand language access to state services", detail: "Repeatedly sponsored and backed measures improving translation and access for limited-English households interacting with state agencies.", verdict: "kept", issueKey: "immigration_reform" },
            { title: "Win meaningful clean-air investment from the majority", detail: "Continues to push appropriations and idling/inversion measures, but large-scale air-quality funding remains incremental against the legislative supermajority.", verdict: "pending", issueKey: "climate_action" },
            { title: "Protect Medicaid and reproductive-health access at the state level", detail: "Has fought rollback efforts, but several protections she championed stalled or were narrowed in committee.", verdict: "broken", issueKey: "healthcare" }
          ],
          sections: [
            { type: "deepdive", title: "Deep Dive — Escamilla's Legislative Record", sources_count: 2, promises: [
              { title: "Intergenerational poverty framework", detail: "Sustained funding and reporting requirements that track how poverty passes from parents to children, a rare bipartisan win in a divided chamber.", verdict: "kept", sources: [{ label: "Utah Legislature", url: "https://le.utah.gov" }] },
              { title: "Minority Leader since 2019", detail: "Leads the Senate Democratic caucus, setting the opposition agenda on budget, healthcare, and air-quality priorities.", verdict: "kept", sources: [{ label: "Utah Senate", url: "https://senate.utah.gov" }] },
              { title: "Statewide air-quality funding", detail: "Pushed for stronger inversion-season investment; results have been partial as the majority sets the budget.", verdict: "pending" }
            ]},
            { type: "info", color: "gold", title: "Why This Matters", text: "As the leader of a small minority caucus, Escamilla cannot pass bills on votes alone — her influence comes from coalition-building and budget negotiation. Tracking which of her priorities actually become law is the clearest test of whether Utah's Democratic agenda survives contact with a Republican supermajority." }
          ]
        },
        {
          id: "vickers",
          name: "Evan Vickers",
          office: "State Senator (Dist. 28)",
          state: "Utah",
          party: "Republican",
          district: "District 28 (Beaver, Iron, Millard Counties)",
          why: "Former Senate Majority Leader (2019–Jan 2025), now chair of Senate Business & Labor. Powerful rural conservative who shapes legislative priorities, healthcare reforms, and pharmacy regulations.",
          score: 74, kept: 22, broken: 5, pending: 3, icon: "🏛", tier: "silver",
          keyIssues: ["Rural Healthcare", "Pharmacy & Drug Pricing", "Small Business", "Senate Leadership"],
          bio: "Evan Vickers is a pharmacist and small-business owner from Cedar City who has represented rural southwest Utah in the Legislature since 2009, serving in the Senate since 2013 and as Senate Majority Leader from 2019 until January 2025, when Kirk Cullimore succeeded him; he now chairs the Senate Business and Labor Committee. As one of the few healthcare professionals in leadership, he has steered pharmacy-regulation and drug-pricing policy, including work on pharmacy benefit managers and prescription transparency. He balances a rural-conservative base with the practical demands he long carried running the majority's floor agenda, where he is known as a deal-closer rather than a firebrand.",
          quote: "I've filled prescriptions for people who had to choose between their medicine and their groceries. That stays with you when you write the laws.",
          promises: [
            { title: "Rein in pharmacy benefit managers (PBMs)", detail: "Backed legislation increasing transparency and oversight of the middlemen who set drug reimbursement, a recurring priority tied to his pharmacy background.", verdict: "kept", issueKey: "health_drug_prices" },
            { title: "Protect access to care in rural Utah", detail: "Has consistently directed funding and policy toward rural hospitals, telehealth, and provider recruitment in underserved counties.", verdict: "kept", issueKey: "health_rural" },
            { title: "Keep the Senate majority's agenda moving", detail: "As Majority Leader, delivered the leadership's tax-cut and budget priorities session after session.", verdict: "kept", issueKey: "lower_taxes" },
            { title: "Expand affordable-coverage options statewide", detail: "Supported market-based reforms, but broader coverage-gap solutions for low-income adults remain unfinished.", verdict: "pending", issueKey: "healthcare_market" }
          ],
          sections: [
            { type: "deepdive", title: "Deep Dive — Pharmacy & Healthcare Record", sources_count: 2, promises: [
              { title: "PBM transparency and oversight", detail: "Used firsthand pharmacy experience to push reforms targeting opaque drug-pricing intermediaries.", verdict: "kept", sources: [{ label: "Utah Legislature", url: "https://le.utah.gov" }] },
              { title: "Rural provider and hospital support", detail: "Championed appropriations and policy aimed at keeping care available across Beaver, Iron, and Millard counties.", verdict: "kept", sources: [{ label: "Utah Senate", url: "https://senate.utah.gov" }] },
              { title: "Statewide affordability", detail: "Coverage-gap and affordability fixes remain a work in progress under market-based approaches.", verdict: "pending" }
            ]},
            { type: "info", title: "Why This Matters", text: "Vickers is one of the only senators who understands drug pricing from behind the pharmacy counter, which gives his healthcare bills unusual weight. Because he also controls the majority's floor schedule, the bills he chooses to prioritize often become the version of healthcare policy Utah actually adopts." }
          ]
        },
        {
          id: "schultz",
          name: "Mike Schultz",
          office: "State Representative (Dist. 12)",
          state: "Utah",
          party: "Republican",
          district: "District 12 (Weber County)",
          why: "Speaker of the Utah House. Extremely influential in state budget allocation, infrastructure projects, and land-use policies.",
          score: 71, kept: 25, broken: 8, pending: 5, icon: "🏛", tier: "gold",
          keyIssues: ["State Budget & Tax Cuts", "Growth & Infrastructure", "Public Land & Water", "Housing Affordability"],
          bio: "Mike Schultz is a Hooper home builder who has served in the Utah House since 2015 and became Speaker in 2023, making him one of the two or three most powerful officials in state government. He rose through the ranks as Majority Whip and Majority Leader, building a reputation as a hard-nosed negotiator on taxes, transportation, and growth. As Speaker he controls which bills reach the floor and steers a Republican supermajority, giving him outsized influence over the state budget, water and public-land fights with the federal government, and Utah's response to explosive population growth along the Wasatch Front.",
          quote: "Utah is growing whether we plan for it or not. Our job is to make sure the water, the roads, and the housing are ready before the people arrive.",
          promises: [
            { title: "Cut Utah's income tax rate", detail: "Delivered repeated income-tax rate reductions as part of leadership's surplus-driven budget strategy.", verdict: "kept", issueKey: "lower_taxes" },
            { title: "Confront federal control of Utah land and water", detail: "Backed the state's high-profile legal and legislative push to gain control over unappropriated federal public lands.", verdict: "pending", issueKey: "lands_local" },
            { title: "Invest ahead of growth in roads and water", detail: "Prioritized major transportation and water-infrastructure appropriations to keep pace with population growth.", verdict: "kept", issueKey: "infrastructure" },
            { title: "Make housing more affordable for Utah families", detail: "Championed first-time-buyer and starter-home programs, but affordability has continued to worsen against demand.", verdict: "broken", issueKey: "housing_build" }
          ],
          sections: [
            { type: "deepdive", title: "Deep Dive — The Speaker's Agenda", sources_count: 2, promises: [
              { title: "Surplus-funded tax cuts", detail: "Used record state surpluses to push through successive income-tax reductions, a defining leadership priority.", verdict: "kept", sources: [{ label: "Utah Legislature", url: "https://le.utah.gov" }] },
              { title: "Public-lands sovereignty push", detail: "Advanced Utah's effort to assert state authority over federally controlled acreage, a long-running and unresolved fight.", verdict: "pending", sources: [{ label: "Utah House", url: "https://house.utah.gov" }] },
              { title: "Growth infrastructure", detail: "Directed transportation and water dollars toward fast-growing Wasatch Front and northern Utah corridors.", verdict: "kept" }
            ]},
            { type: "info", color: "gold", title: "Why This Matters", text: "The Speaker decides which bills live or die. When Schultz sets a priority, it usually becomes law — so his record on taxes, water, land, and housing is effectively a preview of where the entire state is headed. Few individual legislators shape Utahns' daily lives more directly." }
          ]
        },
        {
          id: "romero",
          name: "Angela Romero",
          office: "State Representative (Dist. 25)",
          state: "Utah",
          party: "Democrat",
          district: "District 25 (Salt Lake County)",
          why: "House Minority Leader. Champion for victim advocacy, criminal justice reforms, and community safety programs.",
          score: 85, kept: 14, broken: 2, pending: 3, icon: "🏛", tier: "silver",
          keyIssues: ["Sexual-Assault Survivor Justice", "Rape-Kit Backlog Reform", "Criminal Justice", "Community Safety"],
          bio: "Angela Romero has represented Salt Lake City's heavily Latino west side in the Utah House since 2013 and became House Minority Leader in 2023. With a background in community advocacy and victim services, she is best known nationally for forcing Utah to confront its backlog of untested rape kits, sponsoring legislation that required testing and tracking of sexual-assault evidence. She has paired that survivor-centered work with efforts on missing and murdered Indigenous women, hate-crimes protections, and equitable community services, becoming the leading progressive voice in the House.",
          quote: "Every untested rape kit is a survivor told their case didn't matter. We changed that, kit by kit.",
          promises: [
            { title: "End Utah's untested rape-kit backlog", detail: "Sponsored landmark legislation requiring law enforcement to test and track sexual-assault evidence, drastically reducing the backlog.", verdict: "kept", issueKey: "justice_reform" },
            { title: "Pass meaningful hate-crimes protections", detail: "Was a persistent champion behind Utah finally enacting an enforceable hate-crimes statute after years of failed attempts.", verdict: "kept", issueKey: "rights_balance" },
            { title: "Advance justice for Missing & Murdered Indigenous Relatives", detail: "Helped create a task force and reporting requirements to address violence against Indigenous women.", verdict: "kept", issueKey: "justice_reform" },
            { title: "Expand statewide victim-services funding", detail: "Continues pressing for broader, sustained funding for survivor services beyond pilot levels.", verdict: "pending", issueKey: "justice_reform" }
          ],
          sections: [
            { type: "deepdive", title: "Deep Dive — Survivor-Justice Record", sources_count: 2, promises: [
              { title: "Rape-kit testing mandate", detail: "Her signature achievement: requiring testing and chain-of-custody tracking for sexual-assault kits statewide.", verdict: "kept", sources: [{ label: "Utah Legislature", url: "https://le.utah.gov" }] },
              { title: "Hate-crimes enforcement", detail: "Among the key legislators who moved Utah from a symbolic to an enforceable hate-crimes law.", verdict: "kept", sources: [{ label: "Utah House", url: "https://house.utah.gov" }] },
              { title: "MMIR task force", detail: "Advanced state attention and data collection on missing and murdered Indigenous relatives.", verdict: "kept" }
            ]},
            { type: "info", title: "Why This Matters", text: "Romero proves a minority-party legislator can still change lives by picking issues with broad moral consensus. Her rape-kit and hate-crimes laws affect every Utahn who interacts with the justice system, and her record shows where bipartisan progress is still possible in a deeply red state." }
          ]
        },
        {
          id: "weiler",
          name: "Todd Weiler",
          office: "State Senator (Dist. 8)",
          state: "Utah",
          party: "Republican",
          district: "District 8 (Davis County)",
          why: "Prominent judicial committee member. Highly active in criminal law updates, family law reforms, and social media regulation.",
          score: 69, kept: 19, broken: 6, pending: 4, icon: "🏛", tier: "gray",
          keyIssues: ["Judiciary & Courts", "Child-Protection Law", "Online Age Verification", "Family Law"],
          bio: "Todd Weiler is a Woods Cross attorney who has served in the Utah Senate since 2012 and chairs the chamber's Judiciary, Law Enforcement and Criminal Justice work. A prolific bill sponsor, he has focused on the legal system's plumbing — courts, family law, statutes of limitation — while also becoming one of the Legislature's most active voices on regulating the internet's effect on children, including age-verification and device-filtering requirements aimed at pornography and social media. His willingness to wade into contentious culture-and-tech fights has made him both influential and frequently litigated.",
          quote: "If we make adults verify their age to buy a lottery ticket, we can ask websites to do the same before showing explicit content to a child.",
          promises: [
            { title: "Require age verification for adult websites", detail: "Sponsored Utah's nation-leading law requiring pornographic sites to verify users are adults, which took effect and prompted industry pushback and litigation.", verdict: "kept", issueKey: "tech_balance" },
            { title: "Mandate porn filters on new devices", detail: "Passed a law requiring phones and tablets to ship with activatable content filters, though full enforcement was tied to other states acting.", verdict: "pending", issueKey: "tech_balance" },
            { title: "Eliminate the civil statute of limitations for child sexual abuse", detail: "Championed reforms giving survivors more time, and in some cases removing time limits, to sue their abusers.", verdict: "kept", issueKey: "justice_balance" },
            { title: "Modernize Utah's family and probate code", detail: "Carried numerous technical judiciary bills updating custody, guardianship, and estate law.", verdict: "kept", issueKey: "justice_balance" }
          ],
          sections: [
            { type: "deepdive", title: "Deep Dive — Tech, Courts & Child Protection", sources_count: 2, promises: [
              { title: "Adult-site age verification", detail: "Utah was among the first states to require age checks for explicit content; the law has been a model — and a legal target — nationwide.", verdict: "kept", sources: [{ label: "Utah Legislature", url: "https://le.utah.gov" }] },
              { title: "Statute-of-limitations reform for abuse survivors", detail: "Expanded survivors' ability to pursue civil justice years after abuse occurred.", verdict: "kept", sources: [{ label: "Utah Senate", url: "https://senate.utah.gov" }] },
              { title: "Device-level content filters", detail: "Passed but conditioned on broader multistate adoption before full effect.", verdict: "pending" }
            ]},
            { type: "info", title: "Why This Matters", text: "Weiler sits at the intersection of two fast-moving areas — the court system and internet regulation — where Utah keeps writing first-in-the-nation laws that other states copy. Whether those laws survive court challenges shapes the national debate over kids, free speech, and online safety, so his record reaches far beyond Davis County." }
          ]
        }
      ],
      "utah-cand-2026": [
        {
          id: "lyman",
          name: "Phil Lyman",
          office: "Candidate for Governor / Fed",
          state: "Utah",
          party: "Republican",
          district: "Utah State",
          why: "Prominent conservative challenger to Governor Spencer Cox in recent conventions. Strong constitutional conservative campaigning heavily for 2026 federal/state offices.",
          score: 88, kept: 15, broken: 2, pending: 12, icon: "🦅", tier: "gold",
          keyIssues: ["Public-Land Sovereignty", "Constitutional Rights", "Election Integrity", "Rural Utah"],
          bio: "Phil Lyman is an accountant and former San Juan County commissioner who became a folk hero to Utah's populist right after leading a 2014 ATV protest ride through Recapture Canyon to challenge federal land control — an act that brought a misdemeanor conviction and, later, a pardon from President Trump. He went on to the Utah House before mounting a 2024 campaign for governor, where he stunned the establishment by winning the Republican convention vote over incumbent Spencer Cox before losing the primary and waging a write-in bid. He remains the loudest voice for state control of public lands and a relentless critic of the Utah GOP establishment heading into 2026.",
          quote: "Utah doesn't need permission from Washington to manage Utah's own land.",
          nextElection: "2026-11-03", electionLabel: "2026 General Election",
          promises: [
            { title: "Fight for state control of federal public land", detail: "Built his political identity around transferring federally managed land to the state — the defining cause of his career since Recapture Canyon.", verdict: "pending" },
            { title: "Challenge the Utah GOP establishment", detail: "Delivered on promises to take on incumbent leadership, winning the 2024 gubernatorial convention before falling in the primary.", verdict: "kept" },
            { title: "Tighten Utah election procedures", detail: "Pressed for changes to mail-in voting and signature verification; major statewide overhauls have not been enacted.", verdict: "broken" }
          ],
          sections: [
            { type: "deepdive", title: "Deep Dive — The Public-Lands Crusader", sources_count: 2, promises: [
              { title: "Recapture Canyon and the federal-land fight", detail: "His 2014 protest ride, conviction, and 2021 presidential pardon made him the symbol of Utah's public-land sovereignty movement.", verdict: "pending", sources: [{ label: "Ballotpedia", url: "https://ballotpedia.org" }] },
              { title: "2024 convention upset", detail: "Defeated a sitting governor at the state Republican convention, proving the strength of the party's populist wing.", verdict: "kept", sources: [{ label: "Utah GOP", url: "https://utah.gop" }] }
            ]},
            { type: "info", color: "gold", title: "Why This Matters", text: "Lyman has built a combative, anti-establishment brand and has repeatedly challenged his own chamber's leadership. Tracking whether his public-land and election promises become policy shows whether that confrontational approach delivers concrete results for his constituents or stays largely symbolic." }
          ]
        },
        {
          id: "gleich",
          name: "Caroline Gleich",
          office: "U.S. Senate Candidate · 2024",
          candidacyStatus: "former_candidate",
          state: "Utah",
          party: "Democrat",
          district: "Utah State",
          why: "High-profile progressive activist, professional ski mountaineer, and advocate for climate change policy and federal public lands.",
          score: 90, kept: 8, broken: 1, pending: 15, icon: "🏔", tier: "silver",
          keyIssues: ["Climate Action", "Public-Land Protection", "Outdoor Economy", "Reproductive Rights"],
          bio: "Caroline Gleich is a professional ski mountaineer and the first woman to climb and ski some of the world's most dangerous lines, who turned her platform as an athlete into a career in climate and public-lands advocacy. In 2024 she won the Democratic nomination for Utah's open U.S. Senate seat, ultimately losing to Republican John Curtis in the deep-red state but building a statewide organizing network. She argues that protecting Utah's mountains, snowpack, and air is both a moral cause and an economic one for the state's multibillion-dollar outdoor-recreation industry, and she remains a leading progressive organizer for 2026.",
          quote: "The same mountains that made my career are losing their snow. Climate action is self-preservation for Utah's economy.",
          nextElection: "2026-11-03", electionLabel: "2026 Election Cycle",
          promises: [
            { title: "Make climate change a top-tier Utah issue", detail: "Centered her 2024 Senate run on climate and clean air, forcing the topic into a statewide race in a fossil-fuel-friendly state.", verdict: "kept" },
            { title: "Defend federal public lands from transfer or sale", detail: "Campaigns squarely against state-takeover and development efforts targeting Utah's public lands.", verdict: "pending" },
            { title: "Win statewide office for Democrats", detail: "Lost the 2024 Senate race to John Curtis, the steep challenge any Utah Democrat faces statewide.", verdict: "broken" },
            { title: "Protect reproductive freedom", detail: "Runs on restoring and protecting abortion access against Utah's near-total ban.", verdict: "pending" },
            { title: "Grow the outdoor-recreation economy", detail: "Frames snowpack, clean air, and protected lands as the foundation of Utah's multibillion-dollar recreation industry and the jobs it supports.", verdict: "pending" }
          ],
          sections: [
            { type: "deepdive", title: "Deep Dive — Climate & Public-Lands Platform", sources_count: 1, promises: [
              { title: "Athlete-turned-organizer", detail: "Turned a ski-mountaineering career into a statewide climate and public-lands advocacy network that outlasted her 2024 campaign.", verdict: "kept", sources: [{ label: "Ballotpedia", url: "https://ballotpedia.org" }] },
              { title: "Snowpack as economics", detail: "Argues warming and shrinking snowpack threaten the resorts, tourism, and water supply Utah's economy depends on.", verdict: "pending" },
              { title: "Uphill in a red state", detail: "Her wide 2024 loss underscores how hard a climate-forward Democrat's path is statewide — and what coalition she would need to change that.", verdict: "broken" }
            ]},
            { type: "info", color: "gold", title: "Why This Matters", text: "Gleich shows how Utah's outdoor identity can be turned into a political argument: her case is that the recreation economy and the climate are the same fight. Whether a climate-forward Democrat can build a durable coalition in Utah is one of the open questions her continued organizing will test." }
          ]
        },
        {
          id: "brian_king",
          name: "Brian King",
          office: "Candidate for Governor / State Rep",
          state: "Utah",
          party: "Democrat",
          district: "Salt Lake County",
          why: "Former House Minority Leader who ran for Governor in 2024. A key voice opposing the state legislative supermajority on public school funding and vouchers.",
          score: 79, kept: 16, broken: 4, pending: 6, icon: "🏛", tier: "silver",
          keyIssues: ["Public Education Funding", "Opposing Vouchers", "Healthcare Access", "Bipartisan Governance"],
          bio: "Brian King is a Salt Lake City attorney who served two decades in the Utah House, including as Minority Leader, before becoming the Democratic nominee for governor in 2024. A specialist in insurance and disability law, he built a reputation as the chamber's leading defender of public schools and a persistent opponent of private-school vouchers and the Republican supermajority's tax-cutting agenda. Though he lost the 2024 governor's race to Spencer Cox by a wide margin, he remains an influential voice for Utah Democrats and a candidate for regional leadership in the 2026 cycle.",
          quote: "Every dollar diverted to a private-school voucher is a dollar taken from the neighborhood school down the street.",
          nextElection: "2026-11-03", electionLabel: "2026 Election Cycle",
          promises: [
            { title: "Protect public-school funding from vouchers", detail: "Made opposition to the Utah Fits All voucher program a centerpiece of his legislative career and campaign.", verdict: "kept" },
            { title: "Expand healthcare access for Utahns", detail: "Long championed Medicaid and consumer health protections from the minority.", verdict: "kept" },
            { title: "Win statewide office for Democrats", detail: "Lost the 2024 gubernatorial election to incumbent Spencer Cox in a Republican-dominated state.", verdict: "broken" },
            { title: "Defend consumers through insurance and disability law", detail: "Used two decades of practice in insurance and disability law to push patient and consumer protections in the House.", verdict: "kept" },
            { title: "Check the supermajority's tax-cut agenda", detail: "Argued repeated income-tax cuts during surpluses shortchange schools and services; the cuts passed over his objection.", verdict: "broken" }
          ],
          sections: [
            { type: "deepdive", title: "Deep Dive — Two Decades in the Minority", sources_count: 1, promises: [
              { title: "Longtime Minority Leader", detail: "Led House Democrats and became the chamber's most recognizable counterweight to the Republican supermajority.", verdict: "kept", sources: [{ label: "Utah Legislature", url: "https://le.utah.gov" }] },
              { title: "Voucher fight", detail: "Turned the Utah Fits All scholarship into the defining line between his party and the majority on education spending.", verdict: "kept" },
              { title: "Statewide ceiling", detail: "His wide 2024 loss to Cox shows how far a Utah Democrat can rise in the Legislature yet still hit a wall statewide.", verdict: "broken" }
            ]},
            { type: "info", title: "Why This Matters", text: "King has been the most consistent statewide counterweight to the Legislature's tax-cut-and-voucher agenda. His record and campaigns mark out exactly where Utah's Democratic opposition draws its lines — and how steep the climb remains for any Democrat seeking statewide office." }
          ]
        },
        {
          id: "edwards_b",
          name: "Becky Edwards",
          office: "Candidate for Congress",
          state: "Utah",
          party: "Republican",
          district: "Congressional District 3",
          why: "Prominent moderate Republican who challenged Mike Lee in the primary. Highly active coalition builder focused on family-friendly tax credits and climate dialogue.",
          score: 75, kept: 12, broken: 3, pending: 8, icon: "🏛", tier: "silver",
          keyIssues: ["Family Tax Credits", "Climate Dialogue", "Affordable Housing", "Moderate Governance"],
          bio: "Becky Edwards is a former five-term Utah State Representative from Davis County known as one of the most prominent moderate Republicans in the state. In 2022 she mounted a high-profile primary challenge to U.S. Senator Mike Lee, running as a pragmatic, civility-focused alternative and finishing a strong second. A coalition-builder who has worked across the aisle on family-support, housing, and environmental issues, she is one of the dwindling but persistent moderate voices in Utah Republican politics and is a top-tier potential contender for congressional office in 2026.",
          quote: "You can be a conservative and still believe in clean air, working across the aisle, and treating opponents with respect.",
          nextElection: "2026-11-03", electionLabel: "2026 Election Cycle",
          promises: [
            { title: "Offer Utah Republicans a moderate alternative", detail: "Built her brand on civility and pragmatism, challenging Senator Lee from the center in 2022.", verdict: "kept" },
            { title: "Advance family tax credits and housing affordability", detail: "Championed family-support and housing measures during her House tenure.", verdict: "kept" },
            { title: "Win federal office", detail: "Fell short in the 2022 Senate primary; a 2026 congressional bid remains a possibility rather than a victory.", verdict: "pending" },
            { title: "Make clean air a conservative cause", detail: "Pushed for serious action on Wasatch Front air quality and climate, arguing it is consistent with conservatism.", verdict: "kept" },
            { title: "Restore civility to Utah's politics", detail: "Ran explicitly against polarization and personal attacks, a message that drew a strong second-place primary finish but not a win.", verdict: "pending" }
          ],
          sections: [
            { type: "deepdive", title: "Deep Dive — The Moderate Lane", sources_count: 1, promises: [
              { title: "Strong primary challenge to Mike Lee", detail: "Finished a competitive second in the 2022 GOP Senate primary, proving real demand for a center-right alternative.", verdict: "kept", sources: [{ label: "Ballotpedia", url: "https://ballotpedia.org" }] },
              { title: "Five terms in the House", detail: "Built a record on family, housing, and environmental issues from a Davis County swing-area seat.", verdict: "kept" },
              { title: "A narrowing path", detail: "Whether a moderate can win a Utah Republican primary in today's climate remains unproven — the central question of any 2026 run.", verdict: "pending" }
            ]},
            { type: "info", title: "Why This Matters", text: "Edwards is a test case for whether moderate, bipartisan-minded Republicans still have a path in Utah's primary-driven politics. Her performance against Mike Lee showed real appetite for an alternative — and her 2026 decisions will signal how much room the center retains in the GOP." }
          ]
        },
        {
          id: "maloy",
          name: "Celeste Maloy",
          office: "Candidate for Congress (CD-2)",
          state: "Utah",
          party: "Republican",
          district: "Congressional District 2",
          why: "Incumbent congresswoman expected to defend Utah's 2nd District in 2026. Background in natural resources and rural water law.",
          score: 73, kept: 10, broken: 2, pending: 9, icon: "🦅", tier: "silver",
          keyIssues: ["Public Lands & Water", "Rural Communities", "Natural-Resource Law", "Federal Land Policy"],
          bio: "Celeste Maloy is an attorney and former federal-lands lawyer who made an improbable rise to Congress, winning Utah's 2nd District in a 2023 special election after serving as legal counsel to her predecessor, Chris Stewart. Raised on a cattle ranch and trained in natural-resource and water law, she brings unusually technical expertise to public-lands fights between Utah and the federal government. She defends a sprawling district covering much of rural and southern Utah and is expected to seek a full term in 2026, positioning herself as a workhorse on land, water, and rural-economy issues rather than a national firebrand.",
          quote: "I grew up where the federal government owns the land your cattle graze on. I came to Congress to give rural Utah a real voice in those decisions.",
          nextElection: "2026-11-03", electionLabel: "2026 General Election",
          promises: [
            { title: "Give rural Utah a stronger hand on public lands", detail: "Uses her natural-resource-law background to push back on federal land-management decisions affecting her district.", verdict: "kept" },
            { title: "Protect Western water rights", detail: "Advocates for Colorado River and rural water interests amid drought and Great Salt Lake pressures.", verdict: "pending" },
            { title: "Deliver for a vast rural district", detail: "Focuses on constituent service and resource policy across one of the largest districts in the country.", verdict: "kept" },
            { title: "Reduce catastrophic wildfire through active land management", detail: "Argues that hands-off federal management fuels megafires and pushes for more thinning, grazing access, and local input on Utah's forests and rangeland.", verdict: "pending" },
            { title: "Stay a workhorse, not a show horse", detail: "Has kept a low-drama, casework-and-policy focus on land, water, and rural economic issues rather than national cable-news fights.", verdict: "kept" },
            { title: "Speed active forest management to cut wildfire risk", detail: "Championed the Fix Our Forests Act, which expedites forest-thinning and hazardous-fuels projects on federal land; it passed the House and awaits Senate action.", verdict: "pending", issueKey: "disaster_resilience" }
          ],
          sections: [
            { type: "deepdive", title: "Deep Dive — Public Lands & Water Record", sources_count: 3, promises: [
              { title: "Federal-lands legal expertise", detail: "One of the only members of Congress who practiced natural-resource and water law before being elected, giving her unusual command of land-management fights.", verdict: "kept", sources: [{ label: "Congress.gov", url: "https://www.congress.gov" }] },
              { title: "Front line of Western drought", detail: "Represents a district where Colorado River cuts, rural water rights, and the shrinking Great Salt Lake all collide with fast growth.", verdict: "pending", sources: [{ label: "House.gov", url: "https://www.house.gov" }] },
              { title: "Improbable rise", detail: "Won the seat in a 2023 special election after serving as legal counsel to her predecessor — a reminder that staff expertise, not celebrity, put her in Congress.", verdict: "kept" },
              { title: "Fix Our Forests Act (H.R. 471)", detail: "The House passed this overhaul of federal forest management to reduce catastrophic wildfire risk — the active-management approach Maloy has pressed for rural Utah. It awaits Senate action.", verdict: "pending", sources: [{ label: "Congress.gov — H.R. 471", url: "https://www.congress.gov/bill/119th-congress/house-bill/471" }] }
            ]},
            { type: "info", color: "gold", title: "Why This Matters", text: "Two-thirds of Utah is federally owned, making public-land law the state's defining federal issue — and Maloy is one of the only members of Congress who practiced it before being elected. Her record determines how effectively rural Utah's interests are translated into national policy." }
          ]
        },
        {
          id: "blake_moore",
          name: "Blake Moore",
          office: "Candidate for Congress (CD-1)",
          state: "Utah",
          party: "Republican",
          district: "Congressional District 1",
          why: "Incumbent representative for northern Utah seeking re-election in 2026. Active on budget and fiscal-policy leadership.",
          score: 76, kept: 14, broken: 3, pending: 7, icon: "🦅", tier: "silver",
          keyIssues: ["Federal Budget & Debt", "National Defense", "Economic Growth", "Constituent Services"],
          bio: "Blake Moore is a former management consultant and U.S. Foreign Service officer who has represented Utah's 1st Congressional District since 2021 and rose quickly into House Republican leadership as Vice Chair of the Conference — one of the highest-ranking Utahns in Congress. A member of the powerful Ways and Means Committee, he focuses on tax, trade, and fiscal policy and has cultivated a reputation as a pragmatic, business-minded conservative rather than a bomb-thrower. He represents northern Utah's growing Ogden-to-Bear Lake region and is a leading 2026 federal incumbent expected to seek re-election.",
          quote: "Getting our fiscal house in order isn't glamorous, but it's the most important thing this generation of leaders can do.",
          nextElection: "2026-11-03", electionLabel: "2026 General Election",
          promises: [
            { title: "Address the national debt and deficit", detail: "Made fiscal responsibility a signature theme and works on budget and tax policy from the Ways and Means Committee.", verdict: "pending" },
            { title: "Support a strong national defense", detail: "Backs robust defense funding and readiness, reflecting his foreign-service background.", verdict: "kept" },
            { title: "Deliver tax and economic policy through leadership", detail: "Uses his Conference Vice Chair role to shape the GOP economic agenda.", verdict: "kept" },
            { title: "Protect and expand the Child Tax Credit", detail: "Has championed a more generous, family-friendly Child Tax Credit from his Ways and Means seat as a counterweight to pure rate-cutting.", verdict: "pending" },
            { title: "Govern as a pragmatist, not a bomb-thrower", detail: "Built a reputation for working the legislative process and leadership table rather than chasing viral confrontation.", verdict: "kept" },
            { title: "Back wildfire resilience for northern Utah's forests", detail: "Voted for the House-passed Fix Our Forests Act to speed forest-thinning and hazardous-fuels work; final passage awaits the Senate.", verdict: "pending", issueKey: "disaster_resilience" },
            { title: "Give digital assets clear, pro-innovation rules", detail: "Voted for the House-passed CLARITY Act creating a market-structure framework for digital assets; it awaits the Senate.", verdict: "pending", issueKey: "tech_innovation" }
          ],
          sections: [
            { type: "deepdive", title: "Deep Dive — Fiscal & Leadership Record", sources_count: 6, promises: [
              { title: "Ways and Means seat", detail: "Sits on the committee that writes federal tax, trade, and entitlement law — a rare perch for a member elected in 2021.", verdict: "kept", sources: [{ label: "Congress.gov", url: "https://www.congress.gov" }] },
              { title: "Republican Conference Vice Chair", detail: "One of the highest-ranking Utahns in Congress, helping steer House GOP messaging and strategy.", verdict: "kept", sources: [{ label: "House.gov", url: "https://www.house.gov" }] },
              { title: "Debt trajectory unresolved", detail: "Despite making deficits his signature issue, the national debt has continued to climb — the clearest test of whether his fiscal goals translate into results.", verdict: "pending" },
              { title: "Fix Our Forests Act (H.R. 471)", detail: "Joined the House majority to pass the wildfire-and-forest-management overhaul, relevant to CD-1's extensive public lands.", verdict: "pending", sources: [{ label: "Congress.gov — H.R. 471", url: "https://www.congress.gov/bill/119th-congress/house-bill/471" }] },
              { title: "DETERRENT Act (H.R. 1048)", detail: "Joined the House majority to pass tighter disclosure of foreign gifts and contracts flowing to U.S. universities; the bill awaits the Senate.", verdict: "pending", sources: [{ label: "Congress.gov — H.R. 1048", url: "https://www.congress.gov/bill/119th-congress/house-bill/1048" }] },
              { title: "Crypto Week market-structure votes", detail: "Backed both House-passed digital-asset bills during July 2025's Crypto Week — the CLARITY Act market-structure framework (H.R. 3633) and the Anti-CBDC Surveillance State Act (H.R. 1919).", verdict: "pending", sources: [{ label: "Congress.gov — H.R. 3633", url: "https://www.congress.gov/bill/119th-congress/house-bill/3633" }] },
              { title: "FY2026 NDAA (H.R. 3838)", detail: "Voted to pass the House defense authorization behind the enacted ~$900.6B FY2026 NDAA — including a 3.8% troop pay raise — consistent with his strong-defense record.", verdict: "kept", sources: [{ label: "Congress.gov — H.R. 3838", url: "https://www.congress.gov/bill/119th-congress/house-bill/3838" }] }
            ]},
            { type: "info", title: "Why This Matters", text: "As Vice Chair of the House Republican Conference and a Ways and Means member, Moore sits closer to the levers of federal tax and budget policy than almost any other Utahn. His choices help set the national Republican agenda, so his record matters well beyond northern Utah." }
          ]
        },
        {
          id: "burgess_owens",
          name: "Burgess Owens",
          office: "U.S. Representative (CD-4)",
          state: "Utah",
          party: "Republican",
          district: "Congressional District 4 (south Salt Lake & Utah counties)",
          why: "Super Bowl champion turned congressman defending one of Utah's only competitive seats, and a national conservative voice on school choice.",
          score: 70, kept: 11, broken: 4, pending: 8, icon: "🦅", tier: "silver",
          nextElection: "2026-11-03", electionLabel: "2026 General Election",
          keyIssues: ["School Choice & Education Freedom", "Small Business & Economy", "Public Safety & Border Security", "Fiscal Conservatism"],
          bio: "Burgess Owens is a former NFL safety who won Super Bowl XV with the Oakland Raiders before reinventing himself as an author, businessman, and conservative commentator, then winning Utah's 4th Congressional District in 2020. The district — covering suburban south Salt Lake and Utah counties — is the most competitive in the state, making each of his re-election fights closely watched. In Congress he sits on the Education and Workforce Committee, where he has become one of the GOP's most prominent advocates for school choice and parental rights, while voting as a reliable fiscal and social conservative on taxes, the border, and public safety.",
          quote: "I grew up in the segregated South and made it to the NFL and to Congress. I will spend every day fighting so the next kid gets the same shot — starting with the right to choose a great school.",
          promises: [
            { title: "Champion school choice and parental rights nationally", detail: "Used his Education and Workforce perch to push federal school-choice, transparency, and parental-rights measures.", verdict: "kept" },
            { title: "Vote to cut taxes and rein in federal spending", detail: "Backed tax-relief and spending-restraint measures consistent with his fiscal-conservative platform.", verdict: "kept" },
            { title: "Strengthen border security", detail: "Supported border-enforcement and immigration-restriction bills in the House Republican agenda.", verdict: "kept" },
            { title: "Deliver bipartisan wins for a swing district", detail: "Holds one of Utah's most competitive seats but has few signature bipartisan bills to his name from this term.", verdict: "broken" },
            { title: "Enact major federal school-choice legislation", detail: "Has advanced bills and built support, but a divided Congress has not passed sweeping national school choice into law.", verdict: "pending" },
            { title: "Limit nationwide injunctions against elected policy", detail: "Voted for the No Rogue Rulings Act to stop a single district judge from blocking federal policy nationwide; it passed the House and awaits the Senate.", verdict: "pending", issueKey: "gov_balance" },
            { title: "Confront foreign influence and antisemitism on campus", detail: "Voted for the DETERRENT Act to force disclosure of foreign gifts to universities; it passed the House and awaits Senate action.", verdict: "pending", issueKey: "gov_transparency" }
          ],
          sections: [
            { type: "deepdive", title: "Deep Dive — Owens in Congress", sources_count: 6, promises: [
              { title: "Education and Workforce Committee", detail: "A leading House Republican voice for school choice, parental rights, and workforce policy.", verdict: "kept", sources: [{ label: "U.S. House", url: "https://www.house.gov" }] },
              { title: "Defending a swing seat", detail: "Holds one of Utah's only competitive districts, keeping CD-4 a top national target each cycle.", verdict: "pending", sources: [{ label: "U.S. Congress", url: "https://www.congress.gov" }] },
              { title: "National school-choice push", detail: "Champions federal choice legislation that has yet to clear a divided Congress.", verdict: "pending" },
              { title: "Laken Riley Act (H.R. 29)", detail: "Backed the first bill signed into law in 2025, mandating detention of unlawfully present immigrants charged with theft or assaulting police — a vote behind his border-security pledge.", verdict: "kept", sources: [{ label: "Congress.gov — H.R. 29", url: "https://www.congress.gov/bill/119th-congress/house-bill/29" }] },
              { title: "DETERRENT Act (H.R. 1048)", detail: "From his Education and Workforce seat, backed the House-passed bill lowering the foreign-gift reporting threshold for universities and adding Title IV enforcement.", verdict: "pending", sources: [{ label: "Congress.gov — H.R. 1048", url: "https://www.congress.gov/bill/119th-congress/house-bill/1048" }] },
              { title: "Anti-CBDC Surveillance State Act (H.R. 1919)", detail: "Voted for the House-passed bill barring a Federal Reserve central bank digital currency without congressional approval, on financial-privacy and limited-government grounds.", verdict: "pending", sources: [{ label: "Congress.gov — H.R. 1919", url: "https://www.congress.gov/bill/119th-congress/house-bill/1919" }] },
              { title: "FY2026 NDAA (H.R. 3838)", detail: "Backed the House defense authorization behind the enacted ~$900.6B FY2026 NDAA and its troop pay raise.", verdict: "kept", sources: [{ label: "Congress.gov — H.R. 3838", url: "https://www.congress.gov/bill/119th-congress/house-bill/3838" }] }
            ]},
            { type: "info", color: "gold", title: "Why This Matters", text: "CD-4 is the rare Utah seat that is genuinely up for grabs, so Owens's record and his margins help decide control of the U.S. House — a national stakes most Utah races don't carry. For voters in the district, his votes on schools, taxes, and the border are the clearest measure of how well his record reflects the whole district he represents." }
          ]
        },
        {
          id: "glenn_wright",
          name: "Glenn J. Wright",
          office: "Candidate for State Senate",
          state: "Utah",
          party: "Democrat",
          district: "Summit County",
          why: "Veteran Summit County official running on managed growth and conservation, testing whether a Park City–area Democrat can win in a rapidly changing district.",
          score: 68, kept: 7, broken: 2, pending: 9, icon: "🏛", tier: "gray",
          nextElection: "2026-11-03", electionLabel: "2026 General Election",
          keyIssues: ["Managed Growth & Development", "Open-Space & Watershed Conservation", "Local Governance & Property Rights", "Wildfire & Resort-Economy Resilience"],
          bio: "Glenn J. Wright is a longtime Summit County elected official and Democratic organizer from the Park City area who is mounting a 2026 state legislative bid built around managing the explosive growth reshaping Utah's mountain communities. A retired professional with years on the county council, he has focused on balancing development pressure against open space, water, and the resort economy that defines the region. His candidacy is a test of whether the conservation-minded, increasingly purple politics of Summit County can translate into a seat in a Legislature dominated by a Republican supermajority.",
          quote: "Growth is coming to the mountains whether we like it or not. The question is whether we protect the water, the trails, and the open space that made people want to come here in the first place.",
          promises: [
            { title: "Protect open space and watersheds from overdevelopment", detail: "Has a county-council record of backing land conservation and watershed protection, and campaigns to extend it statewide.", verdict: "kept" },
            { title: "Manage growth to preserve mountain-community character", detail: "Advocates planning tools that channel development without choking the resort economy, a continuing balancing act.", verdict: "pending" },
            { title: "Strengthen local control over land-use decisions", detail: "Pushes to keep zoning and growth decisions with local communities rather than state preemption.", verdict: "pending" },
            { title: "Win a Democratic seat in a GOP-dominated Legislature", detail: "Faces long odds in a chamber where Republicans hold a supermajority; the 2026 outcome is unresolved.", verdict: "pending" },
            { title: "Deliver statewide conservation wins from the minority", detail: "If elected, would join a small minority caucus with limited power to pass standalone bills.", verdict: "pending" }
          ],
          sections: [
            { type: "deepdive", title: "Deep Dive — Wright's Growth & Conservation Platform", sources_count: 1, promises: [
              { title: "County-level conservation record", detail: "Years on the Summit County Council give him a concrete track record on open space, water, and growth management.", verdict: "kept", sources: [{ label: "Summit County", url: "https://www.summitcountyutah.gov" }] },
              { title: "Managed-growth agenda", detail: "Runs on planning tools to balance development against the resort economy and mountain environment.", verdict: "pending" },
              { title: "Long odds in the Legislature", detail: "A Democratic win and real influence both remain uncertain in a supermajority chamber.", verdict: "pending" }
            ]},
            { type: "info", color: "gold", title: "Why This Matters", text: "Summit County sits at the front line of Utah's growth and conservation fights, where booming development collides with limited water and fragile open space. Wright's campaign is worth watching as a test of whether voters there will send a conservation-focused Democrat to a Legislature where those priorities usually start in the minority." }
          ]
        }
      ]
    };

    // ── Extended bulk discovery catalog (appended for Bulk Import Mode) ──
    // These real Utah officeholders broaden each AI search so the tool can
    // surface dozens of suggestions at once for fast bulk importing.
    var EXPANSION_BULK_EXTRA = {
      "utah-leg": [
        { id: "mccay", name: "Daniel McCay", office: "State Senator (Dist. 11)", state: "Utah", party: "Republican", district: "District 11 (Salt Lake County)", why: "Influential tax and revenue committee leader shaping statewide fiscal policy.", score: 72, kept: 20, broken: 6, pending: 4, icon: "🏛", tier: "silver",
          keyIssues: ["Income-Tax Reduction", "Flat-Tax Policy", "School Choice", "Economic Development"],
          bio: "Daniel McCay is a Riverton-area Republican who moved from the Utah House to the Senate in 2019 and has become one of the Legislature's chief architects of tax policy. He has driven the state's repeated income-tax rate cuts and championed a move toward a flatter, lower-rate tax structure funded by recurring surpluses. A reliable vote for school choice and limited government, McCay sits at the center of the budget negotiations that decide how Utah spends — and returns — billions of taxpayer dollars each year.",
          quote: "When the state collects more than it needs, the right answer is to give it back to the people who earned it.",
          promises: [
            { title: "Cut Utah's income-tax rate", detail: "Sponsored and shepherded multiple rate reductions, lowering the state income tax several times since 2022.", verdict: "kept", issueKey: "lower_taxes" },
            { title: "Fund private-school scholarships", detail: "Supported the school-choice scholarship program creating taxpayer-funded options for private and home education.", verdict: "kept", issueKey: "school_choice" },
            { title: "Eliminate the state tax on Social Security income", detail: "Backed phased relief on retirement income; full elimination has advanced in steps rather than all at once.", verdict: "pending", issueKey: "lower_taxes" }
          ],
          sections: [
            { type: "deepdive", title: "Deep Dive — Tax & Fiscal Record", sources_count: 2, promises: [
              { title: "Serial income-tax cuts", detail: "Central player in Utah's strategy of using surpluses to ratchet the income-tax rate down session after session.", verdict: "kept", sources: [{ label: "Utah Legislature", url: "https://le.utah.gov" }] },
              { title: "School-choice funding", detail: "Helped establish publicly funded scholarships for private and home schooling.", verdict: "kept", sources: [{ label: "Utah Senate", url: "https://senate.utah.gov" }] },
              { title: "Retirement-income relief", detail: "Phasing out taxes on Social Security benefits, advancing incrementally.", verdict: "pending" }
            ]},
            { type: "info", color: "gold", title: "Why This Matters", text: "McCay's hand is on Utah's tax dial. Every rate cut he pushes through means more money in workers' paychecks but fewer dollars for schools and services — the central trade-off in state budgeting. Few legislators shape the size and shape of state government more directly." }
          ]
        },
        { id: "cullimore", name: "Kirk Cullimore", office: "State Senator (Dist. 19)", state: "Utah", party: "Republican", district: "District 19 (Salt Lake County)", why: "Senate Majority Whip active on consumer protection and judiciary issues.", score: 70, kept: 18, broken: 5, pending: 4, icon: "🏛", tier: "silver",
          keyIssues: ["Social-Media Regulation", "Consumer Protection", "Judiciary & Civil Law", "Data Privacy"],
          bio: "Kirk Cullimore is a Sandy attorney who serves in Senate Republican leadership and has become a key player on technology and consumer-protection law. He was a lead Senate sponsor of Utah's pioneering laws restricting minors' use of social media and requiring parental consent — measures that put the state at the front of a national movement and drew immediate legal challenges from the tech industry. He balances that high-profile tech work with bread-and-butter judiciary, landlord-tenant, and consumer-finance legislation drawn from his legal practice.",
          quote: "Social-media companies designed these products to be addictive for kids. The least we can do is require a parent's permission.",
          promises: [
            { title: "Require parental consent for minors on social media", detail: "Co-sponsored Utah's first-in-the-nation social-media regulations for minors, later amended amid litigation.", verdict: "kept", issueKey: "tech_balance" },
            { title: "Strengthen consumer and data-privacy protections", detail: "Backed Utah's consumer-privacy framework and various consumer-finance safeguards.", verdict: "kept", issueKey: "privacy_rights" },
            { title: "Make the social-media laws hold up in court", detail: "Original versions were challenged and revised; durable enforceable rules are still being litigated.", verdict: "pending", issueKey: "tech_balance" }
          ],
          sections: [
            { type: "deepdive", title: "Deep Dive — Regulating Big Tech", sources_count: 2, promises: [
              { title: "Minor social-media restrictions", detail: "Utah was the first state to require parental consent and curfew-style limits for minors' accounts, sparking national copycats and lawsuits.", verdict: "kept", sources: [{ label: "Utah Legislature", url: "https://le.utah.gov" }] },
              { title: "Consumer privacy law", detail: "Helped enact Utah's consumer-privacy protections governing how companies handle personal data.", verdict: "kept", sources: [{ label: "Utah Senate", url: "https://senate.utah.gov" }] }
            ]},
            { type: "info", title: "Why This Matters", text: "Cullimore helped make Utah the testing ground for whether states can legally rein in social media's effect on children. Because courts' rulings on his laws will shape what every other state can do, his record reaches far beyond Salt Lake County's suburbs." }
          ]
        },
        { id: "fillmore", name: "Lincoln Fillmore", office: "State Senator (Dist. 17)", state: "Utah", party: "Republican", district: "District 17 (Salt Lake County)", why: "Prominent voice on education reform, school choice, and appropriations.", score: 71, kept: 19, broken: 5, pending: 5, icon: "🏛", tier: "silver",
          keyIssues: ["School Choice", "Education Reform", "Appropriations", "Charter Schools"],
          bio: "Lincoln Fillmore is a South Jordan Republican and former charter-school administrator who has made education policy his signature issue in the Utah Senate. He was a leading force behind the Utah Fits All Scholarship — the state's landmark school-choice program providing publicly funded accounts families can spend on private tuition, tutoring, or home-education costs. A budget appropriator as well, Fillmore sits where education policy meets education funding, repeatedly tying expanded choice to increases in teacher pay to build broader support.",
          quote: "Fund students, not just systems. Families know better than bureaucracies what their kids need.",
          promises: [
            { title: "Create universal school-choice scholarships", detail: "Lead architect of the Utah Fits All Scholarship program, enacted in 2023, that funds private and home-education options.", verdict: "kept", issueKey: "school_choice" },
            { title: "Raise teacher pay alongside choice expansion", detail: "Paired the choice program with significant teacher salary increases to win votes.", verdict: "kept", issueKey: "public_schools" },
            { title: "Keep the scholarship program solvent and accountable", detail: "Demand has outstripped funding; ensuring sustainable, well-audited operation is ongoing.", verdict: "pending", issueKey: "school_choice" }
          ],
          sections: [
            { type: "deepdive", title: "Deep Dive — The School-Choice Fight", sources_count: 2, promises: [
              { title: "Utah Fits All Scholarship", detail: "Established one of the nation's broad school-choice programs, a defining and contested education-policy shift.", verdict: "kept", sources: [{ label: "Utah Legislature", url: "https://le.utah.gov" }] },
              { title: "Teacher pay coupling", detail: "Linked choice to record teacher raises, a deliberate strategy to neutralize opposition.", verdict: "kept", sources: [{ label: "Utah Senate", url: "https://senate.utah.gov" }] }
            ]},
            { type: "info", color: "gold", title: "Why This Matters", text: "Fillmore's scholarship program redirects public money to private and home education on a scale Utah had never tried, making him central to the national school-choice debate. Whether the program lifts students or drains public schools is one of the most consequential open questions in state education policy." }
          ]
        },
        { id: "harper", name: "Wayne Harper", office: "State Senator (Dist. 16)", state: "Utah", party: "Republican", district: "District 16 (West Jordan/Taylorsville, Salt Lake County)", why: "One of the Legislature's deepest experts on transportation and tax policy, with nearly three decades of work shaping how Utah funds and builds its roads and transit.", score: 69, kept: 24, broken: 7, pending: 4, icon: "🏛", tier: "gray",
          keyIssues: ["Transportation & Transit Funding", "Tax Policy & Sales Tax", "Highway & Infrastructure Investment", "Economic Development"],
          bio: "Wayne Harper is a West Jordan–area Republican and one of the longest-serving figures in Utah politics, having entered the House in 1997 before moving to the Senate in 2013. Over that span he has become the Legislature's resident authority on transportation and tax policy, chairing transportation work and earning a national reputation on sales-tax and streamlined-tax issues. He has had a hand in nearly every major road, transit, and infrastructure funding package the state has passed in a generation, making him a quiet but central player in how a fast-growing Utah moves people and goods.",
          quote: "You can't grow by a million people and keep the same roads. We either invest ahead of the traffic or we sit in it for the next twenty years.",
          promises: [
            { title: "Secure long-term transportation funding for a growing state", detail: "Helped design and pass major road and transit funding packages that fund the Wasatch Front's highway and transit expansion.", verdict: "kept", issueKey: "infrastructure" },
            { title: "Invest in public transit and active transportation", detail: "Backed transit funding and rail/bus investment alongside highways, broadening Utah's transportation mix.", verdict: "kept", issueKey: "transit" },
            { title: "Modernize Utah's sales-tax system", detail: "A national leader on streamlined sales tax, he advanced reforms to capture online and out-of-state sales revenue.", verdict: "kept", issueKey: "lower_taxes" },
            { title: "Keep transportation funding ahead of explosive growth", detail: "Continues to push new revenue and project pipelines, but congestion keeps pace with — or outruns — new capacity.", verdict: "pending", issueKey: "infrastructure" },
            { title: "Hold down the overall tax burden on families", detail: "Supported targeted cuts, though gas-tax and fee increases tied to transportation have drawn criticism.", verdict: "broken", issueKey: "lower_taxes" }
          ],
          sections: [
            { type: "deepdive", title: "Deep Dive — Harper's Transportation & Tax Record", sources_count: 2, promises: [
              { title: "Transportation funding architecture", detail: "Central to the major funding packages that finance Utah's highways and transit through periods of record growth.", verdict: "kept", sources: [{ label: "Utah Legislature", url: "https://le.utah.gov" }] },
              { title: "Sales-tax modernization", detail: "Nationally recognized work to streamline sales tax and capture revenue from a shifting, online economy.", verdict: "kept", sources: [{ label: "Utah Senate", url: "https://senate.utah.gov" }] },
              { title: "Keeping up with growth", detail: "New capacity helps, but congestion on the Wasatch Front remains a moving target.", verdict: "pending" }
            ]},
            { type: "info", color: "gold", title: "Why This Matters", text: "Almost everyone in Utah feels Harper's work without knowing his name — in the roads they drive, the transit they ride, and the sales tax they pay at the register. Because he has shaped transportation and tax policy for nearly thirty years, his record is one of the clearest windows into how the state decides who pays for growth and where that money goes." }
          ]
        },
        { id: "stevenson", name: "Jerry Stevenson", office: "State Senator (Dist. 6)", state: "Utah", party: "Republican", district: "District 6 (Layton, Davis County)", why: "One of the most powerful budget-writers in the state, a senior appropriations chair whose decisions shape nearly every line of Utah's multibillion-dollar budget.", score: 70, kept: 23, broken: 6, pending: 4, icon: "🏛", tier: "gray",
          keyIssues: ["State Budget & Appropriations", "Hill Air Force Base & Defense Economy", "Davis County Growth & Infrastructure", "Fiscal Conservatism"],
          bio: "Jerry Stevenson is a Layton Republican, longtime small-business owner, and former Layton mayor who has served in the Senate since 2009 and risen to become one of its senior appropriations leaders. From his seat on the Legislature's top budget committees he helps decide how Utah spends — and saves — billions of dollars each year, giving him outsized quiet influence over education, infrastructure, and program funding statewide. He is also a key advocate for Davis County and the economy around Hill Air Force Base, balancing fiscal restraint with the demands of one of Utah's fastest-growing regions.",
          quote: "A budget is a moral document and a math problem at the same time. My job is to make the numbers add up without losing sight of the people behind them.",
          promises: [
            { title: "Keep Utah's budget structurally balanced", detail: "Has helped steer disciplined, surplus-conscious budgets that keep Utah among the most fiscally sound states in the country.", verdict: "kept", issueKey: "gov_balance" },
            { title: "Protect and grow Hill Air Force Base's economic footprint", detail: "A consistent champion of the defense installation that anchors the Davis County economy and thousands of jobs.", verdict: "kept", issueKey: "strong_defense" },
            { title: "Fund infrastructure for fast-growing Davis County", detail: "Directed transportation and water investment toward the booming northern Wasatch Front corridor.", verdict: "kept", issueKey: "infrastructure" },
            { title: "Build robust state reserves against downturns", detail: "Backed deposits into rainy-day funds, leaving Utah well positioned for recessions.", verdict: "kept", issueKey: "gov_balance" },
            { title: "Restrain the long-term growth of state spending", detail: "Advocates discipline, but overall state spending has climbed steadily with population and surpluses.", verdict: "pending", issueKey: "gov_balance" }
          ],
          sections: [
            { type: "deepdive", title: "Deep Dive — Stevenson's Budget Power", sources_count: 2, promises: [
              { title: "Appropriations leadership", detail: "Sits among the senior budget-writers who set the framework for Utah's entire annual spending plan.", verdict: "kept", sources: [{ label: "Utah Legislature", url: "https://le.utah.gov" }] },
              { title: "Hill Air Force Base advocacy", detail: "Works to protect and expand the defense economy that drives jobs across Davis County.", verdict: "kept", sources: [{ label: "Utah Senate", url: "https://senate.utah.gov" }] },
              { title: "Spending discipline", detail: "Champions restraint even as overall budgets grow with the state's population and revenue.", verdict: "pending" }
            ]},
            { type: "info", color: "gold", title: "Why This Matters", text: "Few legislators touch more of daily life than a senior appropriations chair: Stevenson helps decide what schools, roads, and programs across Utah actually receive. For Davis County in particular, his clout over the budget and his ties to Hill Air Force Base directly affect jobs, growth, and which local projects get funded." }
          ]
        },
        { id: "millner", name: "Ann Millner", office: "State Senator (Dist. 5)", state: "Utah", party: "Republican", district: "District 5 (Weber County)", why: "Former university president and leading voice on higher education and workforce.", score: 74, kept: 21, broken: 4, pending: 5, icon: "🏛", tier: "silver",
          keyIssues: ["Higher Education", "Workforce Development", "Economic Mobility", "Healthcare"],
          bio: "Ann Millner served as president of Weber State University for nearly a decade before joining the Utah Senate, where she has become the Legislature's most authoritative voice on higher education and workforce policy. She co-chairs major economic-development and education initiatives, focusing on aligning Utah's colleges and technical programs with the needs of employers and on widening pathways for first-generation and rural students. Her academic-leadership background lends unusual credibility to debates over university funding, degree relevance, and the state's fast-growing tech and healthcare workforce.",
          quote: "A degree or credential should open a door to a career, not just a diploma to hang on the wall.",
          promises: [
            { title: "Align higher education with workforce needs", detail: "Led initiatives tying college and technical programs to in-demand jobs and employer partnerships.", verdict: "kept", issueKey: "edu_balance" },
            { title: "Expand access for first-generation and rural students", detail: "Championed scholarships, advising, and stackable credentials to broaden economic mobility.", verdict: "kept", issueKey: "edu_college_cost" },
            { title: "Steady funding through enrollment and budget swings", detail: "Continues defending higher-ed investment amid competing budget pressures.", verdict: "pending", issueKey: "edu_college_cost" },
            { title: "Harden Utah's schools against violence", detail: "Chairs the School Security Task Force, directing state funding toward securing campuses statewide.", verdict: "kept", issueKey: "back_police" },
            { title: "Grow Utah's own tech and healthcare talent", detail: "As Economic Development chair, ties campus investment to staffing the state's fastest-growing industries.", verdict: "pending", issueKey: "econ_growth" }
          ],
          sections: [
            { type: "deepdive", title: "Deep Dive — From University President to Budget Writer", sources_count: 1, promises: [
              { title: "Ran a university first", detail: "Led Weber State for nearly a decade before joining the Senate, a rare path that gives her firsthand command of higher-ed budgets.", verdict: "kept", sources: [{ label: "Utah Senate", url: "https://senate.utah.gov" }] },
              { title: "Workforce-alignment agenda", detail: "Co-chairs major economic-development and education efforts linking degrees and credentials to employer demand.", verdict: "kept" },
              { title: "Access for the overlooked", detail: "Focuses on first-generation and rural students through advising and stackable credentials.", verdict: "pending" }
            ]},
            { type: "info", title: "Why This Matters", text: "Millner is one of the only legislators anywhere who ran a university before writing its budget, giving her rare insight into how higher-ed policy actually plays out on campus. As Utah races to staff its booming tech and healthcare sectors, her workforce-alignment work helps determine whether the state grows its own talent." }
          ]
        },
        { id: "sandall_s", name: "Scott Sandall", office: "State Senator (Dist. 1)", state: "Utah", party: "Republican", district: "District 1 (Box Elder, Cache, Tooele)", why: "Rural agriculture and water-policy leader in the Senate majority.", score: 68, kept: 20, broken: 6, pending: 4, icon: "🏛", tier: "gray",
          keyIssues: ["Water Policy & Great Salt Lake", "Agriculture", "Rural Development", "Natural Resources"],
          bio: "Scott Sandall is a Tremonton farmer and rancher who has become the Utah Senate's go-to authority on the state's defining natural-resource crisis: water. He has authored some of the most consequential water legislation in recent memory, including measures to let water rights be left in streams to help refill the shrinking Great Salt Lake and to modernize Utah's century-old water law. Representing the rural top of the state, he balances agricultural interests — which use the bulk of Utah's water — against mounting pressure to save the lake and supply explosive population growth.",
          quote: "Every drop in Utah is already spoken for. Saving the Great Salt Lake means rethinking how we've used water for a hundred years.",
          promises: [
            { title: "Help refill the Great Salt Lake", detail: "Sponsored landmark legislation allowing water-rights holders to leave water instream for the lake without forfeiting their rights.", verdict: "kept", issueKey: "water" },
            { title: "Modernize Utah's water law", detail: "Carried major reforms to how water rights are measured, traded, and conserved statewide.", verdict: "kept", issueKey: "water" },
            { title: "Protect agriculture while cutting water use", detail: "Pursuing optimization and metering for farms; large-scale reductions remain a work in progress.", verdict: "pending", issueKey: "rural_ag" }
          ],
          sections: [
            { type: "deepdive", title: "Deep Dive — Water & the Great Salt Lake", sources_count: 2, promises: [
              { title: "Instream-flow / lake replenishment law", detail: "Removed a legal barrier so conserved water can legally flow to the Great Salt Lake, a turning point in the rescue effort.", verdict: "kept", sources: [{ label: "Utah Legislature", url: "https://le.utah.gov" }] },
              { title: "Water-law modernization", detail: "Overhauled outdated 'use it or lose it' rules that discouraged conservation.", verdict: "kept", sources: [{ label: "Utah Senate", url: "https://senate.utah.gov" }] },
              { title: "Agricultural water optimization", detail: "Metering and efficiency programs are expanding but have not yet delivered the volumes the lake needs.", verdict: "pending" }
            ]},
            { type: "info", color: "gold", title: "Why This Matters", text: "The drying Great Salt Lake is an environmental and economic emergency with national attention, and Sandall — a farmer who understands water rights from the inside — writes the laws that decide whether it survives. Few state legislators anywhere hold this much sway over an ecological crisis." }
          ]
        },
        { id: "blouin", name: "Nate Blouin", office: "State Senator (Dist. 13)", state: "Utah", party: "Democrat", district: "District 13 (Millcreek/Salt Lake City, Salt Lake County)", why: "One of the youngest and most progressive senators, a clean-energy professional pressing climate, renter, and air-quality issues from inside the minority.", score: 80, kept: 9, broken: 2, pending: 6, icon: "🏛", tier: "silver",
          keyIssues: ["Clean & Renewable Energy", "Renter Protections & Housing Costs", "Wasatch Front Air Quality", "Climate Policy"],
          bio: "Nate Blouin is a Salt Lake County Democrat first elected to the Senate in 2022, making him one of its younger members and one of its most vocal progressive voices. He works professionally in the renewable-energy industry, and that expertise anchors an agenda centered on clean energy, climate, and Wasatch Front air quality. Representing a dense, urban district, he has also become a leading advocate for renters and for housing affordability. As a member of a small minority caucus he legislates largely through amendments, public pressure, and coalition-building rather than passing major bills outright.",
          quote: "Clean air isn't a luxury and a roof you can afford isn't radical. These are the basics, and Utahns are tired of being told to wait for them.",
          promises: [
            { title: "Push Utah toward cleaner, renewable energy", detail: "Uses industry expertise to advocate for renewable generation and to scrutinize fossil-fuel subsidies and utility decisions.", verdict: "kept", issueKey: "climate_action" },
            { title: "Strengthen protections for Utah renters", detail: "Has sponsored and backed tenant-protection and housing-cost measures, though most stall in a majority skeptical of new mandates.", verdict: "broken", issueKey: "housing_support" },
            { title: "Fight for stronger Wasatch Front air quality", detail: "Consistently supports clean-air appropriations and emissions measures, with incremental wins against the supermajority.", verdict: "pending", issueKey: "climate_action" },
            { title: "Hold utilities accountable on rates and clean energy", detail: "Presses regulators and monopoly utilities on rate hikes and the pace of the clean-energy transition.", verdict: "pending", issueKey: "climate_action" },
            { title: "Expand housing supply and affordability", detail: "Backs pro-housing and density measures aimed at the affordability crisis in his urban district.", verdict: "pending", issueKey: "housing_support" }
          ],
          sections: [
            { type: "deepdive", title: "Deep Dive — Blouin's Energy & Housing Agenda", sources_count: 2, promises: [
              { title: "Clean-energy advocacy", detail: "Brings renewable-industry expertise to debates over Utah's energy mix and utility regulation.", verdict: "kept", sources: [{ label: "Utah Legislature", url: "https://le.utah.gov" }] },
              { title: "Renter and housing protections", detail: "Sponsors tenant-focused bills that often die in committee under the majority.", verdict: "broken", sources: [{ label: "Utah Senate", url: "https://senate.utah.gov" }] },
              { title: "Air-quality measures", detail: "Pushes clean-air investment that advances slowly against a Republican supermajority.", verdict: "pending" }
            ]},
            { type: "info", color: "gold", title: "Why This Matters", text: "Blouin represents the younger, urban, climate-focused Utah that is growing fast but holds little power in the Legislature, so his bills are a useful barometer of which progressive ideas can — and can't — move in a deep-red state. For renters and anyone worried about air quality and energy costs, his fights show where those priorities stand against the majority's agenda." }
          ]
        },
        { id: "plumb", name: "Jennifer Plumb", office: "State Senator (Dist. 14)", state: "Utah", party: "Democrat", district: "District 14 (Salt Lake County)", why: "Physician-legislator known for public health and overdose-prevention work.", score: 83, kept: 11, broken: 2, pending: 5, icon: "🏛", tier: "silver",
          keyIssues: ["Overdose Prevention", "Public Health", "Naloxone Access", "Mental Health"],
          bio: "Jennifer Plumb is a practicing pediatric emergency physician who spent years fighting Utah's opioid epidemic before winning a state Senate seat in 2022. As medical director of the nonprofit Utah Naloxone, she helped put the overdose-reversal drug into the hands of families, police, and schools across the state — work credited with reversing thousands of overdoses. Her advocacy is deeply personal: she lost a brother to addiction. In the Senate she has continued to legislate on harm reduction, mental health, and access to lifesaving medication from a rare position of frontline clinical authority.",
          quote: "I've watched people die who didn't have to. Naloxone in the right hands is the difference between a funeral and a second chance.",
          promises: [
            { title: "Put naloxone in the hands of those who can save lives", detail: "Built and expanded Utah's naloxone-distribution program, helping reverse thousands of overdoses statewide.", verdict: "kept", issueKey: "health_mental" },
            { title: "Treat addiction as a health issue, not a crime", detail: "Champions harm-reduction and treatment-oriented policy over punishment.", verdict: "kept", issueKey: "health_mental" },
            { title: "Expand mental-health and crisis services", detail: "Pushes for stronger behavioral-health infrastructure; major funding gains are still being fought for from the minority.", verdict: "pending", issueKey: "health_mental" }
          ],
          sections: [
            { type: "deepdive", title: "Deep Dive — Fighting the Overdose Epidemic", sources_count: 2, promises: [
              { title: "Utah Naloxone program", detail: "As founder/medical director, distributed overdose-reversal kits across Utah long before entering office — a documented, life-saving public-health effort.", verdict: "kept", sources: [{ label: "Utah Naloxone", url: "https://www.utahnaloxone.org" }] },
              { title: "Harm-reduction legislation", detail: "Carries her clinical expertise into bills expanding access to treatment and reversal medication.", verdict: "kept", sources: [{ label: "Utah Senate", url: "https://senate.utah.gov" }] }
            ]},
            { type: "info", title: "Why This Matters", text: "Plumb is the rare legislator whose previous work has already been measured in lives saved. As an ER physician in a chamber with almost no medical expertise, she gives Utah's response to addiction and mental health a credibility — and urgency — that pure politics can't match." }
          ]
        },
        { id: "riebe", name: "Kathleen Riebe", office: "State Senator (Dist. 15)", state: "Utah", party: "Democrat", district: "District 15 (Cottonwood Heights/Murray, Salt Lake County)", why: "A working public-school teacher serving in the Senate, giving her a frontline voice on education funding that almost no other legislator can match.", score: 81, kept: 10, broken: 2, pending: 5, icon: "🏛", tier: "silver",
          keyIssues: ["Public-Education Funding", "Teacher Pay & Retention", "Student Welfare & Class Size", "Opposition to Voucher Expansion"],
          bio: "Kathleen Riebe is a Salt Lake County Democrat who is unusual in American politics: a full-time public-school teacher who also serves in the state Senate, where she has sat since 2019 after time on a local school board. That dual role makes her one of the Legislature's most credible voices on classroom conditions, teacher pay, and school funding. A persistent advocate within a small minority caucus, she has been a leading opponent of diverting public dollars to private-school programs and a steady champion of student-welfare and education-funding measures, drawing directly on what she sees in her own classroom.",
          quote: "I grade papers at night and debate the education budget by day. Most legislators are guessing what schools need — I'm living it.",
          promises: [
            { title: "Raise per-student funding and teacher pay", detail: "Consistently votes for and pushes higher school funding and salary increases to address Utah's teacher shortage.", verdict: "kept", issueKey: "public_schools" },
            { title: "Block the diversion of public funds to private schools", detail: "A vocal opponent of voucher and scholarship expansion, which the legislative majority enacted over her objection.", verdict: "broken", issueKey: "public_schools" },
            { title: "Reduce class sizes in Utah classrooms", detail: "Long advocates smaller classes, but Utah remains near the bottom nationally in per-pupil spending and class size.", verdict: "broken", issueKey: "public_schools" },
            { title: "Improve student mental-health and welfare support", detail: "Backs counseling and wellbeing funding, with progress dependent on majority budget choices.", verdict: "pending", issueKey: "health_mental" },
            { title: "Strengthen teacher recruitment and retention", detail: "Champions working-condition and pay measures aimed at keeping experienced teachers in the profession.", verdict: "pending", issueKey: "public_schools" }
          ],
          sections: [
            { type: "deepdive", title: "Deep Dive — A Teacher in the Senate", sources_count: 2, promises: [
              { title: "Frontline education expertise", detail: "Brings real-time classroom experience to every school-funding and policy debate, a perspective unique in the chamber.", verdict: "kept", sources: [{ label: "Utah Legislature", url: "https://le.utah.gov" }] },
              { title: "Opposition to voucher expansion", detail: "Led minority pushback against private-school scholarship programs the majority passed anyway.", verdict: "broken", sources: [{ label: "Utah Senate", url: "https://senate.utah.gov" }] },
              { title: "Class-size and welfare measures", detail: "Pushes smaller classes and stronger student support, with results tied to the majority's budget.", verdict: "pending" }
            ]},
            { type: "info", color: "gold", title: "Why This Matters", text: "When Riebe talks about underfunded classrooms, she is describing her own job — a rare case where a lawmaker has direct, daily knowledge of the system she votes on. For Utah parents and teachers, her record is a sharp test of whether the Legislature's education promises match what is actually happening in schools." }
          ]
        },
        { id: "grover", name: "Keith Grover", office: "State Senator (Dist. 22)", state: "Utah", party: "Republican", district: "District 22 (Provo, Utah County)", why: "A former teacher who now chairs much of the Senate's education agenda and is a central player in Utah's contentious election-policy debates.", score: 67, kept: 17, broken: 6, pending: 4, icon: "🏛", tier: "gray",
          keyIssues: ["Education Policy & School Choice", "Election Administration & Integrity", "Higher Education", "Public Safety"],
          bio: "Keith Grover is a Provo Republican and former public-school teacher and coach who has served in the Legislature since 2007 and in the Senate since 2019. His classroom background made education his signature area, where he has shaped K-12 and higher-education policy from senior committee posts and generally supported expanded school choice. In recent years he has also become one of the Senate's most active voices on election administration, carrying and shaping bills on voting procedures and ballot integrity — a high-profile and polarizing arena in a state proud of its vote-by-mail system.",
          quote: "I taught civics before I voted on it. Confidence in our schools and our elections is the foundation everything else is built on.",
          promises: [
            { title: "Expand school choice and education options", detail: "Generally supported scholarship and choice programs giving families alternatives to assigned public schools.", verdict: "kept", issueKey: "school_choice" },
            { title: "Shape Utah's election-integrity policy", detail: "Carried and influenced bills on voting procedures and ballot security, a defining recent focus.", verdict: "pending", issueKey: "election_integrity" },
            { title: "Strengthen higher-education accountability", detail: "Pushed performance and governance measures for Utah's colleges and universities.", verdict: "kept", issueKey: "edu_balance" },
            { title: "Preserve voter access while tightening procedures", detail: "Some election changes he backed drew criticism that they risk making Utah's popular vote-by-mail system harder to use.", verdict: "broken", issueKey: "election_integrity" },
            { title: "Improve outcomes across Utah's public schools", detail: "Continues to push reforms, but measurable statewide gains remain a work in progress.", verdict: "pending", issueKey: "edu_balance" }
          ],
          sections: [
            { type: "deepdive", title: "Deep Dive — Grover's Education & Elections Record", sources_count: 2, promises: [
              { title: "Education committee leadership", detail: "Shapes K-12 and higher-education policy from senior Senate posts, drawing on his teaching background.", verdict: "kept", sources: [{ label: "Utah Legislature", url: "https://le.utah.gov" }] },
              { title: "Election-policy bills", detail: "Among the Senate's most active members on voting procedures and ballot integrity, an area of intense public scrutiny.", verdict: "pending", sources: [{ label: "Utah Senate", url: "https://senate.utah.gov" }] },
              { title: "Voter-access tradeoffs", detail: "Critics argue some changes he supported could complicate Utah's widely used vote-by-mail system.", verdict: "broken" }
            ]},
            { type: "info", color: "gold", title: "Why This Matters", text: "Grover sits at the intersection of two of the most consequential issues for Utah voters — how their kids are educated and how their elections are run. Because he helps write the rules in both areas, his record is a direct guide to where Utah's school-choice expansion and its vote-by-mail traditions are headed." }
          ]
        },
        { id: "mckell", name: "Mike McKell", office: "State Senator (Dist. 25)", state: "Utah", party: "Republican", district: "District 25 (Utah County)", why: "Attorney-legislator influential on social media, judiciary, and civil law.", score: 70, kept: 18, broken: 5, pending: 5, icon: "🏛", tier: "silver",
          keyIssues: ["Social-Media Regulation", "Judiciary & Civil Law", "Mental Health", "Consumer Protection"],
          bio: "Mike McKell is a Spanish Fork trial attorney who moved from the Utah House to the Senate and has become a central figure in the state's effort to regulate social media's effect on young people. Alongside Senate colleagues he sponsored Utah's first-in-the-nation laws limiting minors' social-media use and requiring age verification and default privacy protections — legislation that has been copied, challenged, and revised. His legal background also makes him a leading voice on civil-justice, mental-health, and consumer-protection matters before the Legislature.",
          quote: "We regulate everything from car seats to cigarettes to protect kids. Social media shouldn't get a free pass.",
          promises: [
            { title: "Regulate minors' social-media use", detail: "Lead sponsor of Utah's pioneering social-media laws requiring age checks and parental controls for minors.", verdict: "kept", issueKey: "tech_balance" },
            { title: "Hold platforms accountable for harms to youth", detail: "Backed provisions creating liability and design standards aimed at addictive features.", verdict: "pending", issueKey: "tech_balance" },
            { title: "Improve mental-health and civil-justice policy", detail: "Carried bills on behavioral health and civil law drawn from his courtroom experience.", verdict: "kept", issueKey: "health_mental" }
          ],
          sections: [
            { type: "deepdive", title: "Deep Dive — Social Media & the Law", sources_count: 2, promises: [
              { title: "Minor social-media regulation", detail: "Co-authored the laws that made Utah the national pioneer in restricting how minors use social platforms.", verdict: "kept", sources: [{ label: "Utah Legislature", url: "https://le.utah.gov" }] },
              { title: "Platform liability and design rules", detail: "Pushed accountability provisions still being shaped by litigation and amendment.", verdict: "pending", sources: [{ label: "Utah Senate", url: "https://senate.utah.gov" }] }
            ]},
            { type: "info", color: "gold", title: "Why This Matters", text: "McKell helped write the playbook that other states and Congress are now studying for reining in social media's grip on kids. As an attorney, he also understands the legal challenges his own laws face — making his record a real-time gauge of how far state lawmakers can actually go." }
          ]
        },
        { id: "val_peterson", name: "Val Peterson", office: "State Representative (Dist. 56)", state: "Utah", party: "Republican", district: "District 56 (Orem, Utah County)", why: "Veteran House appropriations leader and higher-education advocate who steers college funding from inside both the Legislature and a university administration.", score: 68, kept: 22, broken: 7, pending: 4, icon: "🏛", tier: "gray",
          keyIssues: ["Higher-Education Funding", "State Budget & Appropriations", "Utah Valley University Growth", "Utah County Economic Development"],
          bio: "Val Peterson is an Orem Republican who has represented Utah County in the House since 2011 and holds an unusual dual role: he is also a vice president of administration at Utah Valley University, the largest public university in the state. That gives him an insider's view of the higher-education budgets he helps write, and he has spent much of his tenure on the appropriations subcommittees that fund colleges, capital buildings, and workforce programs. A steady, behind-the-scenes operator rather than a headline-seeker, Peterson is known for shepherding building projects and enrollment-growth funding for fast-expanding Utah County campuses.",
          quote: "Utah's future workforce is sitting in our college classrooms right now. If we don't fund those seats, we pay for it later in jobs we can't fill.",
          promises: [
            { title: "Secure capital funding for Utah Valley University's growth", detail: "Repeatedly directed building and infrastructure appropriations to UVU and Utah County campuses straining under record enrollment growth.", verdict: "kept", issueKey: "edu_college_cost" },
            { title: "Protect higher-education budgets from deep cuts", detail: "Used his appropriations seats to defend college operating budgets during lean years and surplus debates alike.", verdict: "kept", issueKey: "edu_college_cost" },
            { title: "Expand technical and workforce training in Utah County", detail: "Backed funding for technical-college and workforce pathways aligned with local employer demand.", verdict: "kept", issueKey: "edu_balance" },
            { title: "Hold the line on tuition increases for Utah families", detail: "Pushed state funding as an alternative to tuition hikes, though tuition has still climbed at most institutions over his tenure.", verdict: "broken", issueKey: "edu_college_cost" },
            { title: "Keep pace with surging campus enrollment", detail: "Continues to seek seats, faculty, and facilities to match growth, but capacity still lags demand at the fastest-growing schools.", verdict: "pending", issueKey: "edu_college_cost" }
          ],
          sections: [
            { type: "deepdive", title: "Deep Dive — Peterson's Budget Record", sources_count: 2, promises: [
              { title: "Higher-education appropriations leadership", detail: "Sits on the subcommittees that set college and university funding, giving him direct influence over how billions in education dollars are allocated.", verdict: "kept", sources: [{ label: "Utah Legislature", url: "https://le.utah.gov" }] },
              { title: "UVU campus expansion", detail: "Channeled capital dollars toward classroom and infrastructure projects at the state's largest university as enrollment outpaced facilities.", verdict: "kept", sources: [{ label: "Utah House", url: "https://house.utah.gov" }] },
              { title: "Tuition restraint", detail: "Argued for state funding over tuition increases; results have been mixed as costs continued to rise for students.", verdict: "pending" }
            ]},
            { type: "info", color: "gold", title: "Why This Matters", text: "Peterson decides how much money Utah's public colleges receive while also working inside one of them — a position that gives him real expertise and a built-in tension worth watching. For any Utah County family with a student headed to UVU or UVTech, the building projects and tuition fights he handles directly shape what college costs and whether there is even a seat available." }
          ]
        },
        { id: "eliason", name: "Steve Eliason", office: "State Representative (Dist. 45)", state: "Utah", party: "Republican", district: "District 45 (Sandy, Salt Lake County)", why: "Utah's most prolific legislator on mental health and suicide prevention, behind the crisis line, school-safety, and youth-wellbeing laws now copied in other states.", score: 75, kept: 20, broken: 4, pending: 5, icon: "🏛", tier: "silver",
          keyIssues: ["Suicide Prevention & 988 Crisis Line", "School Mental Health & Safety", "Firearm Safe-Storage", "Youth Behavioral Health"],
          bio: "Steve Eliason is a Sandy Republican and certified public accountant who has represented the south Salt Lake Valley in the House since 2011, where he has built one of the most focused records in the Legislature on mental health and suicide prevention. He sponsored the legislation behind Utah's SafeUT crisis app, helped stand up funding for the statewide crisis line that became part of the national 988 system, and has repeatedly carried bills on school counselors, safe firearm storage, and youth behavioral health. In a deeply conservative caucus he has shown that suicide prevention can be a bipartisan, data-driven priority, and his work is frequently cited as a model by other states.",
          quote: "Behind every number in our suicide data is a family. If a phone call or a locked gun safe saves one of them, every hour we spent on this was worth it.",
          promises: [
            { title: "Fund a statewide crisis line and the SafeUT app", detail: "Sponsored and funded the crisis-line and SafeUT infrastructure that lets students and families reach a counselor by text or call, later folded into the national 988 system.", verdict: "kept", issueKey: "health_mental" },
            { title: "Put more mental-health support in Utah schools", detail: "Backed repeated appropriations for school counselors, social workers, and student-wellbeing programs across multiple sessions.", verdict: "kept", issueKey: "health_mental" },
            { title: "Promote safe firearm storage to prevent suicides", detail: "Advanced safe-storage and gun-lock distribution measures framed around suicide prevention, a politically delicate win in a pro-gun state.", verdict: "kept", issueKey: "health_mental" },
            { title: "Lower Utah's youth suicide rate", detail: "Has driven sustained investment, but Utah's youth suicide rate remains stubbornly high and above the national average.", verdict: "pending", issueKey: "health_mental" },
            { title: "Guarantee long-term funding for behavioral health", detail: "Many programs he champions still depend on annual appropriations rather than permanent, recession-proof funding.", verdict: "broken", issueKey: "health_mental" }
          ],
          sections: [
            { type: "deepdive", title: "Deep Dive — Eliason's Mental-Health Record", sources_count: 2, promises: [
              { title: "Crisis line and SafeUT", detail: "Authored and funded the tip-line and crisis infrastructure now used by hundreds of thousands of Utahns and integrated with 988.", verdict: "kept", sources: [{ label: "Utah Legislature", url: "https://le.utah.gov" }] },
              { title: "School-based mental health", detail: "Secured recurring funding for counselors and student-support staff in public schools.", verdict: "kept", sources: [{ label: "Utah House", url: "https://house.utah.gov" }] },
              { title: "Youth suicide reduction", detail: "Despite major investment, outcomes remain a work in progress and a continuing focus of his bills.", verdict: "pending" }
            ]},
            { type: "info", color: "gold", title: "Why This Matters", text: "Eliason has made suicide prevention one of the rare issues that moves on bipartisan votes in Utah, which means the programs he funds — crisis lines, school counselors, safe-storage campaigns — touch families across the political spectrum. Because much of his work relies on year-to-year appropriations, tracking whether that funding survives each budget is the real test of whether these lifelines stay open." }
          ]
        },
        { id: "teuscher", name: "Jordan Teuscher", office: "State Representative (Dist. 44)", state: "Utah", party: "Republican", district: "District 44 (South Jordan, Salt Lake County)", why: "House leader and a central author of Utah's first-in-the-nation laws holding social-media platforms accountable for harm to minors.", score: 69, kept: 16, broken: 5, pending: 5, icon: "🏛", tier: "gray",
          keyIssues: ["Online Child Safety", "Social Media Liability", "Business & Contract Law", "Housing"],
          bio: "Jordan Teuscher is a South Jordan attorney elected to the Utah House in 2018 (representing District 44 after redistricting) who has climbed into House leadership and chaired influential business and judiciary committees. He gained national attention as a lead author of Utah's social-media accountability laws — including the Utah Social Media Regulation Act (HB 311), which makes platforms liable for harms caused to minors by addictive design, and HB 464, which created a private right of action letting parents sue over algorithmic harm and required limits on minors' nighttime and overall use. He pairs that high-profile tech work with a steady portfolio of business-law, property, and housing bills reflecting his legal practice.",
          quote: "For years the platforms told us nothing could be done. We decided to write the laws that make them answer for the harm to our kids.",
          promises: [
            { title: "Make social-media platforms liable for harm to minors", detail: "Authored the Utah Social Media Regulation Act (HB 311), holding companies accountable for addictive design features that harm children.", verdict: "kept", issueKey: "tech_balance" },
            { title: "Give parents a way to sue over algorithmic harm", detail: "Carried HB 464, creating a private right of action and curfews and design-feature restrictions on minor accounts; parts face court challenges and revision.", verdict: "pending", issueKey: "privacy_rights" },
            { title: "Modernize business and property law", detail: "Carried multiple technical bills updating contracts, landlord-tenant rules, and commercial code.", verdict: "kept", issueKey: "housing_build" }
          ],
          sections: [
            { type: "deepdive", title: "Deep Dive — Big Tech Accountability", sources_count: 2, promises: [
              { title: "Social Media Regulation Act (HB 311)", detail: "Made platforms liable for addictive design that harms minors, reframing the national debate over who protects children online.", verdict: "kept", sources: [{ label: "Utah Legislature", url: "https://le.utah.gov" }] },
              { title: "Algorithmic-harm private right of action (HB 464)", detail: "Let parents sue over algorithmic harm and imposed time limits and design restrictions on minor accounts; under active litigation and amendment.", verdict: "pending", sources: [{ label: "Utah House", url: "https://house.utleg.gov" }] }
            ]},
            { type: "info", color: "gold", title: "Why This Matters", text: "Teuscher's social-media laws are being watched in legislatures across the country as templates for online child safety. If they survive in court, they could change how every minor in America uses a phone — making a single Utah representative unusually consequential nationally." }
          ]
        },
        { id: "pierucci", name: "Candice Pierucci", office: "State Representative (Dist. 49) · House Majority Whip", state: "Utah", party: "Republican", district: "District 49 (Salt Lake/Utah County)", why: "House Majority Whip (elected June 2025) and a young conservative leader focused on education, school choice, and child safety online.", score: 71, kept: 16, broken: 4, pending: 6, icon: "🏛", tier: "silver",
          keyIssues: ["Education & School Choice", "Online Child Safety", "Families", "House Majority Leadership"],
          bio: "Candice Pierucci was appointed to the Utah House in 2019 as one of its youngest members and has since become a rising figure in Republican leadership, representing the fast-growing Herriman and southwestern Salt Lake County area. In June 2025 the caucus elected her House Majority Whip — the chamber's third-ranking job, responsible for counting and rounding up Republican votes — in the leadership reshuffle that followed Jefferson Moss's resignation. She has concentrated on education, including the landmark Utah Fits All school-choice scholarship and curriculum-transparency measures, and on shielding minors from online harms through Utah's social-media and device-filtering laws. She also champions workforce and technical-education pathways aimed at students who don't follow a traditional four-year route.",
          quote: "Parents, not algorithms, should decide what our kids are exposed to online.",
          promises: [
            { title: "Protect minors from harmful online content", detail: "Backed Utah's social-media and age-appropriate-design measures aimed at limiting harms to children.", verdict: "kept", issueKey: "tech_balance" },
            { title: "Expand school choice and curriculum transparency", detail: "Supported scholarship and transparency measures giving parents more say in education.", verdict: "kept", issueKey: "school_choice" },
            { title: "Build out technical and workforce education", detail: "Advocated stronger career and technical pathways; expansion is ongoing.", verdict: "pending", issueKey: "edu_balance" },
            { title: "Carry the Utah Fits All scholarship", detail: "Served as chief House sponsor of the 2023 school-choice law that paired private-education scholarships with public-teacher raises.", verdict: "kept", issueKey: "school_choice" },
            { title: "Hold a consistent pro-life, pro-gun record", detail: "Votes with the conservative majority on abortion limits and Second Amendment protections.", verdict: "kept", issueKey: "pro_life" }
          ],
          sections: [
            { type: "deepdive", title: "Deep Dive — A Young Leader on Education & Tech", sources_count: 1, promises: [
              { title: "House Majority Whip", detail: "Rose into leadership while still one of the chamber's youngest members, helping count and steer Republican votes.", verdict: "kept", sources: [{ label: "Utah House", url: "https://house.utah.gov" }] },
              { title: "Utah Fits All sponsor", detail: "Chief sponsor of H.B. 215, the landmark school-choice scholarship now central to Utah's education debate.", verdict: "kept" },
              { title: "Online child-safety push", detail: "Aligned with Utah's first-in-the-nation effort to make platforms verify ages and obtain parental consent for minors.", verdict: "kept" }
            ]},
            { type: "info", color: "gold", title: "Why This Matters", text: "As one of the Legislature's youngest leaders representing one of its fastest-growing suburbs, Pierucci is helping define how a new generation of Utah Republicans handles education and technology. Her work on child online-safety laws ties directly into a national fight over kids and social media." }
          ]
        },
        { id: "hollins", name: "Sandra Hollins", office: "State Representative (Dist. 21)", state: "Utah", party: "Democrat", district: "District 21 (Salt Lake County)", why: "First Black woman in the Utah Legislature; leader on homelessness and equity.", score: 84, kept: 12, broken: 2, pending: 5, icon: "🏛", tier: "silver",
          keyIssues: ["Homelessness & Housing", "Racial Equity", "Substance-Use Treatment", "Social Services"],
          bio: "Sandra Hollins is a licensed clinical social worker who in 2015 became the first Black woman ever elected to the Utah Legislature, representing the diverse Rose Park and Glendale neighborhoods of west Salt Lake City. Her frontline experience working with people experiencing homelessness and addiction shapes a policy focus on housing, treatment, and equity. She drew national attention for sponsoring a 2020 resolution declaring racism a public-health crisis and has been a steady advocate for criminal-justice reform and services for Utah's most vulnerable residents.",
          quote: "I sat with people on their worst days as a social worker. Now I write policy so fewer people have to reach that point.",
          promises: [
            { title: "Declare racism a public-health crisis in Utah", detail: "Sponsored the 2020 resolution formally recognizing racism's health impacts, a first for the state.", verdict: "kept", issueKey: "rights_balance" },
            { title: "Expand homelessness and treatment services", detail: "Consistently pushed appropriations and policy for shelter, housing, and substance-use treatment in Salt Lake City.", verdict: "kept", issueKey: "housing_support" },
            { title: "Secure lasting affordable-housing funding", detail: "Continues to fight for deeper, recurring investment as housing costs outpace incremental gains.", verdict: "pending", issueKey: "housing_support" },
            { title: "Remove slavery language from Utah's constitution", detail: "Sponsored the 2020 amendment that stripped the constitution's slavery-as-criminal-punishment exception, approved by voters.", verdict: "kept", issueKey: "rights_balance" },
            { title: "Protect social services for vulnerable residents", detail: "Defends funding for mental-health, addiction, and family services against budget pressure.", verdict: "pending", issueKey: "gov_services" }
          ],
          sections: [
            { type: "deepdive", title: "Deep Dive — A Social Worker in the Statehouse", sources_count: 1, promises: [
              { title: "Barrier-breaking first", detail: "In 2015 became the first Black woman ever elected to the Utah Legislature, representing west Salt Lake City.", verdict: "kept", sources: [{ label: "Utah Legislature", url: "https://le.utah.gov" }] },
              { title: "Frontline expertise", detail: "A licensed clinical social worker whose direct work with homeless and addicted Utahns shapes her housing and treatment bills.", verdict: "kept" },
              { title: "Constitutional reform", detail: "Her Amendment C and racism-as-health-crisis resolution put long-avoided equity questions onto the statewide agenda.", verdict: "kept" }
            ]},
            { type: "info", color: "gold", title: "Why This Matters", text: "Hollins brings a perspective almost no one else in the Legislature has — both as the chamber's barrier-breaking first Black woman and as a social worker who has worked directly with the homeless and addicted Utahns her bills affect. Her record is a test of how much a single, credible minority voice can move policy in a supermajority body." }
          ]
        },
        { id: "ray_ward", name: "Ray Ward", office: "State Representative (Dist. 19)", state: "Utah", party: "Republican", district: "District 19 (Davis County)", why: "Physician-legislator focused on healthcare access and tax fairness.", score: 73, kept: 18, broken: 4, pending: 5, icon: "🏛", tier: "silver",
          keyIssues: ["Healthcare Access", "Tax Fairness", "Public Health", "Pandemic Preparedness"],
          bio: "Ray Ward is a Bountiful family physician who has served in the Utah House since 2015 and is widely regarded as the chamber's resident medical expert. He has used that authority to push pragmatic, sometimes politically uncomfortable health policy — backing Medicaid coverage, vaccination access, and tobacco-prevention measures — while also working on tax policy that eases burdens on lower-income families. His willingness to follow the clinical evidence on public-health questions has made him a respected but occasionally lonely voice in the Utah House.",
          quote: "I've spent my career keeping patients healthy. Good health policy is just preventive medicine for a whole state.",
          promises: [
            { title: "Protect and expand healthcare coverage", detail: "Supported Medicaid coverage and access measures, repeatedly making the medical case to skeptical colleagues.", verdict: "kept", issueKey: "healthcare" },
            { title: "Strengthen public-health and vaccination access", detail: "Carried legislation improving immunization access and pandemic preparedness despite political headwinds.", verdict: "kept", issueKey: "healthcare" },
            { title: "Make Utah's tax code fairer for working families", detail: "Pushed targeted credits and grocery-tax relief; some proposals advanced while others stalled in committee.", verdict: "pending", issueKey: "tax_middle_class" },
            { title: "Put a price on carbon to clean Utah's air", detail: "One of the few Republicans willing to float carbon-pricing study legislation as a market answer to Wasatch Front pollution.", verdict: "pending", issueKey: "enviro_balance" },
            { title: "Follow the clinical evidence even when it's unpopular", detail: "Repeatedly took the position the clinical evidence supported on public-health bills, even when few colleagues joined him.", verdict: "kept", issueKey: "reform_balance" }
          ],
          sections: [
            { type: "deepdive", title: "Deep Dive — The Doctor in the Caucus", sources_count: 1, promises: [
              { title: "Resident medical expert", detail: "A practicing Bountiful family physician whose votes on health bills carry clinical weight his colleagues lack.", verdict: "kept", sources: [{ label: "Utah Legislature", url: "https://le.utah.gov" }] },
              { title: "Willing to be the lonely vote", detail: "Has taken politically uncomfortable stands on vaccines, Medicaid, and tobacco prevention inside a conservative majority.", verdict: "kept" },
              { title: "Tax fairness, partial wins", detail: "His push for grocery-tax relief and family credits has advanced unevenly against competing priorities.", verdict: "pending" }
            ]},
            { type: "info", title: "Why This Matters", text: "When a bill touches medicine, colleagues turn to Ward — a practicing physician whose votes carry the weight of clinical experience rather than ideology. In a Legislature where few members have a health background, his record often determines whether Utah's health laws are grounded in evidence or politics." }
          ]
        },
        { id: "clancy", name: "Tyler Clancy", office: "State Representative (Dist. 60)", state: "Utah", party: "Republican", district: "District 60 (Utah County)", why: "Police-officer legislator working on homelessness and public safety reform.", score: 71, kept: 9, broken: 2, pending: 7, icon: "🏛", tier: "gray",
          keyIssues: ["Public Safety", "Homelessness", "Mental Health & Addiction", "Criminal Justice"],
          bio: "Tyler Clancy is a working Provo police officer and one of the youngest members of the Utah House, elected in 2022. His day job on patrol — frequently responding to calls involving homelessness, mental illness, and addiction — gives him an unusual, ground-level perspective on the social problems he legislates. He has carved out a niche as a conservative who nonetheless argues for treatment-first approaches and behavioral-health investment, positioning himself as a bridge between law-enforcement priorities and social-service reform.",
          quote: "I see the same faces on the same corners every shift. We can't arrest our way out of a mental-health crisis.",
          promises: [
            { title: "Treat homelessness as a behavioral-health problem", detail: "Pushed for treatment and mental-health funding rather than enforcement-only responses, drawing on patrol experience.", verdict: "kept", issueKey: "housing_support" },
            { title: "Support frontline public-safety officers", detail: "Backed measures on recruitment, training, and officer wellness.", verdict: "kept", issueKey: "back_police" },
            { title: "Deliver a durable statewide homelessness strategy", detail: "Continues working toward a coordinated system; long-term results remain unproven.", verdict: "pending", issueKey: "housing_support" },
            { title: "Add safety standards to emergency shelters", detail: "Sponsored 2025's H.B. 329 to tighten shelter-safety requirements and pair an encampment-to-shelter approach with zero drug tolerance.", verdict: "kept", issueKey: "housing_support" },
            { title: "Lead Utah's homelessness response", detail: "Tapped as the state's homeless coordinator effective 2026, putting his treatment-first philosophy to a statewide test.", verdict: "pending", issueKey: "housing_support" }
          ],
          sections: [
            { type: "deepdive", title: "Deep Dive — Policing & Policy at the Same Time", sources_count: 1, promises: [
              { title: "Detective by night, legislator by day", detail: "A working Provo police detective on the Special Victims and Internet Crimes Against Children units, giving him a ground-level read on the issues he writes laws about.", verdict: "kept", sources: [{ label: "Utah Legislature", url: "https://le.utah.gov" }] },
              { title: "Treatment-first conservative", detail: "Argues addiction and untreated mental illness drive homelessness, breaking from an enforcement-only orthodoxy.", verdict: "kept" },
              { title: "Statewide coordinator role", detail: "His 2026 appointment makes his philosophy the state's operating approach — a high-stakes, unproven bet.", verdict: "pending" }
            ]},
            { type: "info", color: "gold", title: "Why This Matters", text: "Clancy legislates on homelessness and addiction by day and polices them by night, a rare combination that lets him challenge both parties' assumptions. His record matters because Utah, like many states, is searching for an approach to homelessness that is neither pure enforcement nor pure permissiveness." }
          ]
        },
        { id: "bennion", name: "Gay Lynn Bennion", office: "State Representative (Dist. 40)", state: "Utah", party: "Democrat", district: "District 40 (Cottonwood Heights, Salt Lake County)", why: "Career educator turned House Democrat who has become a leading minority voice on public-school funding, clean air, and healthcare access.", score: 80, kept: 10, broken: 2, pending: 5, icon: "🏛", tier: "silver",
          keyIssues: ["Public-Education Funding", "Teacher Recruitment & Retention", "Wasatch Front Air Quality", "Healthcare & Medicaid Access"],
          bio: "Gay Lynn Bennion is a Cottonwood Heights Democrat who spent decades as an educator and education consultant before winning her House seat in 2020. She represents a suburban Salt Lake County district and has used her classroom background to anchor the Democratic caucus's push for stronger public-school funding, smaller class sizes, and better teacher pay. Beyond education she is a consistent advocate on Wasatch Front air quality and healthcare access, working — as a member of a small minority caucus — through amendments, oversight, and coalition-building rather than majority votes.",
          quote: "I spent my career in schools, so I know what underfunding looks like up close. Our kids only get one shot at third grade — we owe them a fully funded one.",
          promises: [
            { title: "Increase per-student funding for public schools", detail: "Consistently votes for and pushes higher WPU (per-pupil) funding and opposes diverting money from public classrooms.", verdict: "kept", issueKey: "public_schools" },
            { title: "Defend public schools against voucher expansion", detail: "Has been a vocal opponent of shifting public dollars to private-school scholarships, but the majority enacted and expanded the program over her objection.", verdict: "broken", issueKey: "public_schools" },
            { title: "Push for stronger Wasatch Front air-quality action", detail: "Backs idling, emissions, and clean-air appropriations, though large-scale measures remain incremental in the legislative supermajority.", verdict: "pending", issueKey: "climate_action" },
            { title: "Protect and expand healthcare access", detail: "Supports Medicaid protections and coverage expansion, working to block rollbacks of existing benefits.", verdict: "kept", issueKey: "healthcare" },
            { title: "Improve teacher recruitment and retention", detail: "Champions pay and working-condition measures aimed at Utah's teacher shortage, with progress dependent on majority budget choices.", verdict: "pending", issueKey: "public_schools" }
          ],
          sections: [
            { type: "deepdive", title: "Deep Dive — Bennion's Education Advocacy", sources_count: 2, promises: [
              { title: "Public-education funding fights", detail: "Uses her educator background to argue for per-pupil increases and against diverting funds from public classrooms.", verdict: "kept", sources: [{ label: "Utah Legislature", url: "https://le.utah.gov" }] },
              { title: "Opposition to voucher expansion", detail: "Led minority pushback against private-school scholarship programs, which the majority passed anyway.", verdict: "broken", sources: [{ label: "Utah House", url: "https://house.utah.gov" }] },
              { title: "Air-quality and health measures", detail: "Continues to press clean-air and healthcare-access bills that move slowly against the supermajority.", verdict: "pending" }
            ]},
            { type: "info", color: "gold", title: "Why This Matters", text: "Bennion sits in the minority, so her real influence shows up in which fights she picks and how hard she pushes on the budget — especially the split between public-school funding and the state's growing private-school scholarship program. For parents of Utah public-school students, her votes are a clear marker of where the money is flowing and who is fighting to keep it in neighborhood classrooms." }
          ]
        },
        { id: "spackman_moss", name: "Carol Spackman Moss", office: "State Representative (Dist. 37)", state: "Utah", party: "Democrat", district: "District 37 (Holladay, Salt Lake County)", why: "One of the longest-serving members of the House, a retired teacher who has been the Legislature's institutional memory on public education and the arts for more than two decades.", score: 79, kept: 14, broken: 3, pending: 4, icon: "🏛", tier: "silver",
          keyIssues: ["Public Education", "Teacher Support & Class Size", "Arts & Humanities Funding", "Student Mental Health"],
          bio: "Carol Spackman Moss is a Holladay Democrat and retired high-school English teacher who has served in the Utah House since 2001, making her one of the longest-tenured members of the Legislature. Her decades in the classroom shape an agenda built around teacher support, manageable class sizes, arts and humanities education, and student wellbeing. As a senior member of a small minority caucus she rarely passes marquee bills, but she is a persistent committee voice for public schools and a reliable defender of arts funding and the teaching profession, drawing on a perspective few of her colleagues share.",
          quote: "I taught for thirty years before I ran. Every education bill that lands on my desk, I read it the way a teacher does — asking what it actually does for the kid in the back row.",
          promises: [
            { title: "Champion teacher pay and respect for the profession", detail: "Has spent her career advocating salary increases, classroom support, and policies that keep experienced teachers in Utah schools.", verdict: "kept", issueKey: "public_schools" },
            { title: "Protect arts and humanities in public education", detail: "A consistent defender of music, art, and humanities funding against pressure to narrow the curriculum.", verdict: "kept", issueKey: "public_schools" },
            { title: "Reduce class sizes in Utah classrooms", detail: "Long pushed for smaller classes, but Utah continues to rank near the bottom nationally in per-pupil spending and class size.", verdict: "broken", issueKey: "public_schools" },
            { title: "Oppose diverting public funds to private schools", detail: "Voted against voucher and scholarship-program expansions, which the majority enacted over minority objection.", verdict: "broken", issueKey: "public_schools" },
            { title: "Strengthen student mental-health support", detail: "Backs counseling and wellbeing measures, with progress tied to majority budget decisions.", verdict: "pending", issueKey: "health_mental" }
          ],
          sections: [
            { type: "deepdive", title: "Deep Dive — Two Decades on Education", sources_count: 2, promises: [
              { title: "Veteran education voice", detail: "Among the longest-serving House members, she provides institutional memory on every major school-funding debate since 2001.", verdict: "kept", sources: [{ label: "Utah Legislature", url: "https://le.utah.gov" }] },
              { title: "Arts and humanities advocacy", detail: "Repeatedly defended arts education funding from cuts and curriculum narrowing.", verdict: "kept", sources: [{ label: "Utah House", url: "https://house.utah.gov" }] },
              { title: "Class-size and spending", detail: "Long-sought reductions remain elusive as Utah stays near the bottom nationally in per-pupil funding.", verdict: "broken" }
            ]},
            { type: "info", color: "gold", title: "Why This Matters", text: "Spackman Moss has watched Utah's education debates evolve over more than twenty years, which makes her one of the few legislators who can say what was promised before and whether it was delivered. For Utah families, her long record is a useful yardstick: when leaders pledge to fix class sizes or teacher pay, she has heard those pledges many times and can show which ones materialized." }
          ]
        },
        { id: "snider", name: "Casey Snider", office: "State Representative (Dist. 5) · House Majority Leader", state: "Utah", party: "Republican", district: "District 5 (Cache County)", why: "Now House Majority Leader (elected June 2025) and northern Utah's go-to legislator on land, water, and wildlife — at the center of the Great Salt Lake and federal-land fights that dominate state politics.", score: 71, kept: 17, broken: 5, pending: 5, icon: "🏛", tier: "silver",
          keyIssues: ["Great Salt Lake & Water Policy", "Public Lands & Federal Control", "Agriculture & Wildlife", "House Majority Leadership"],
          bio: "Casey Snider is a Paradise (Cache County) Republican with a professional background in conservation and natural-resource management who has represented rural northern Utah in the House since 2018. In June 2025 his colleagues elected him House Majority Leader, the chamber's number-two job, after Jefferson Moss resigned to take a state cabinet post — a promotion that gives Snider a major hand in setting the entire House agenda. He had already become one of the Legislature's leading voices on the issues defining Utah's environment debate — saving the shrinking Great Salt Lake, managing scarce water for agriculture and cities, wildlife policy, and the state's long-running push to control federal public lands — balancing ranching and rural interests against the mounting pressure to keep water flowing to the lake and to a fast-growing Wasatch Front.",
          quote: "The Great Salt Lake doesn't care about our politics. Either the water gets there in time or it doesn't — and the clock is running.",
          promises: [
            { title: "Rise into House leadership", detail: "Elected House Majority Leader in June 2025, becoming the chamber's second-ranking member behind the Speaker.", verdict: "kept", issueKey: "reform_balance" },
            { title: "Get more water to the shrinking Great Salt Lake", detail: "Backed water-rights reforms, conservation incentives, and trust mechanisms designed to leave more water in the system flowing to the lake.", verdict: "kept", issueKey: "water" },
            { title: "Modernize Utah's water law to reward conservation", detail: "Supported changes letting saved water be used for environmental flows rather than forfeited under 'use it or lose it' rules.", verdict: "kept", issueKey: "water" },
            { title: "Assert state control over federal public lands", detail: "Aligned with leadership's effort to claim state authority over unappropriated federal acreage, a fight still unresolved in the courts.", verdict: "pending", issueKey: "lands_local" },
            { title: "Protect Cache Valley agriculture and open space", detail: "Advocates for ranchers, farmland, and wildlife corridors against development pressure, with mixed results as growth accelerates.", verdict: "pending", issueKey: "lands_balance" },
            { title: "Reverse the Great Salt Lake's decline", detail: "Despite major policy work, lake levels remain critically low and recovery depends on snowpack and sustained follow-through.", verdict: "broken", issueKey: "water" }
          ],
          sections: [
            { type: "deepdive", title: "Deep Dive — Snider's Water & Lands Record", sources_count: 2, promises: [
              { title: "Great Salt Lake legislation", detail: "Helped author water-policy and trust measures aimed at slowing the lake's decline, among the most consequential environmental bills of recent sessions.", verdict: "kept", sources: [{ label: "Utah Legislature", url: "https://le.utah.gov" }] },
              { title: "Water-law modernization", detail: "Worked to let conserved water count toward environmental flows instead of being lost under old forfeiture rules.", verdict: "kept", sources: [{ label: "Utah House", url: "https://house.utah.gov" }] },
              { title: "Public-lands sovereignty", detail: "Backs the state's contested claim to federal lands, an effort whose outcome rests with the courts.", verdict: "pending" }
            ]},
            { type: "info", color: "gold", title: "Why This Matters", text: "Whether the Great Salt Lake survives is one of the defining questions of Utah's next decade, affecting air quality, the economy, and public health for everyone on the Wasatch Front — and Snider is at the center of the water laws that decide it. His record is the place to check whether the Legislature's promises to save the lake are translating into water actually reaching it." }
          ]
        },
        { id: "trevor_lee", name: "Trevor Lee", office: "State Representative (Dist. 16)", state: "Utah", party: "Republican", district: "District 16 (Layton, Davis County)", why: "Outspoken conservative who sponsored Utah's 2025 government-flag-display law.", score: 64, kept: 14, broken: 6, pending: 5, icon: "🏛", tier: "gray",
          keyIssues: ["Government Neutrality", "Parental Rights", "Religious Liberty", "DEI Rollback"],
          bio: "Trevor Lee is a Layton Republican elected in 2022 who quickly became one of the Utah House's most combative culture-war voices. He authored the 2025 law barring most flags — including pride and political banners — from being displayed on government buildings and in public-school classrooms, a measure that drew national coverage and a veto-override fight with Governor Cox. He has aligned himself with the Legislature's hardline faction on parental rights, gender policy, and shrinking diversity programs, making him a lightning rod admired on the right and sharply criticized on the left.",
          quote: "Government buildings and classrooms should be politically neutral ground. Fly the state flag and the American flag — that's it.",
          promises: [
            { title: "Restrict political and pride flags on government property", detail: "Authored and passed the 2025 flag-display law, which became law after a high-profile standoff with the governor.", verdict: "kept", issueKey: "lgbtq_rights" },
            { title: "Roll back diversity, equity and inclusion programs", detail: "Supported the package dismantling DEI offices at public institutions.", verdict: "kept", issueKey: "rights_balance" },
            { title: "Advance the broader 'parental rights' agenda", detail: "Backed numerous gender- and curriculum-related bills; several were narrowed or stalled amid legal and political pushback.", verdict: "broken", issueKey: "edu_parental" }
          ],
          sections: [
            { type: "deepdive", title: "Deep Dive — Culture-War Legislation", sources_count: 2, promises: [
              { title: "Government flag-display ban (2025)", detail: "Made Utah one of the first states to bar pride and political flags from public buildings and classrooms, surviving a clash with Governor Cox.", verdict: "kept", sources: [{ label: "Utah Legislature", url: "https://le.utah.gov" }] },
              { title: "DEI program rollback", detail: "Part of the coalition that eliminated diversity offices at state institutions.", verdict: "kept", sources: [{ label: "Utah House", url: "https://house.utah.gov" }] }
            ]},
            { type: "info", title: "Why This Matters", text: "Lee's flag law turned a freshman legislator into a national figure and showed how Utah's hardline faction can force the governor's hand. Tracking his record reveals how far the Legislature's most conservative wing can push — and where even a supermajority draws the line." }
          ]
        },
        { id: "stephanie_gricius", name: "Stephanie Gricius", office: "State Representative (Dist. 50)", state: "Utah", party: "Republican", district: "District 50 (Eagle Mountain, Utah County)", why: "Eagle Mountain Republican leading on AI regulation, parental rights, and health-freedom bills.", score: 67, kept: 13, broken: 4, pending: 5, icon: "🏛", tier: "gray",
          keyIssues: ["Artificial Intelligence Policy", "Parental Rights", "Health Freedom", "Consumer Protection"],
          bio: "Stephanie Gricius is a small-business owner and Republican from fast-growing Eagle Mountain, elected to the Utah House in 2022. She has become an early state-level voice on artificial intelligence, working on disclosure and accountability requirements for AI used in mental-health and consumer contexts as Utah positions itself as a national testing ground for AI policy. She combines that forward-looking tech focus with conservative priorities on parental rights and medical-freedom legislation, representing one of the youngest and fastest-changing districts in the state.",
          quote: "AI is moving faster than our laws. Utah can either write thoughtful rules now or clean up the consequences later.",
          promises: [
            { title: "Put guardrails on consumer and mental-health AI", detail: "Worked on disclosure and accountability requirements for AI tools, helping make Utah an early mover on AI regulation.", verdict: "kept", issueKey: "tech_balance" },
            { title: "Strengthen parental rights in schools and medicine", detail: "Backed bills expanding parental access and consent, central to her conservative platform.", verdict: "kept", issueKey: "school_choice" },
            { title: "Keep AI rules current as the technology evolves", detail: "Ongoing work; the regulatory framework is still being built and tested.", verdict: "pending", issueKey: "tech_balance" },
            { title: "Criminalize AI-generated child sexual abuse material", detail: "Sponsored 2025 legislation closing deepfake gaps so AI-built explicit images of children are prosecutable.", verdict: "kept", issueKey: "tech_balance" },
            { title: "Ban fluoride from public drinking water", detail: "Sponsored the 2025 law making Utah the first state to bar adding fluoride to public water systems, framed as personal choice — a contested public-health break.", verdict: "kept", issueKey: "healthcare_market" }
          ],
          sections: [
            { type: "deepdive", title: "Deep Dive — Writing Utah's First AI Rules", sources_count: 1, promises: [
              { title: "Early mover on AI", detail: "Among the first state legislators anywhere drafting accountability rules for consumer and mental-health AI tools.", verdict: "kept", sources: [{ label: "Utah Legislature", url: "https://le.utah.gov" }] },
              { title: "Deepfake child-protection law", detail: "Targeted AI-generated sexual images of children, arguing the law must keep pace with the technology.", verdict: "kept" },
              { title: "Health-freedom flashpoint", detail: "Her fluoride ban made national news and drew sharp objection from dentists and public-health groups — a live test of the personal-choice framing.", verdict: "kept" }
            ]},
            { type: "info", color: "gold", title: "Why This Matters", text: "Utah has branded itself as a place to experiment with light-touch AI regulation, and Gricius is one of the legislators writing those first rules. Because other states and Congress are watching how Utah handles AI accountability, her record could influence policy well beyond Eagle Mountain." }
          ]
        },
        { id: "jake_fitisemanu", name: "Jake Fitisemanu", office: "State Representative (Dist. 30)", state: "Utah", party: "Democrat", district: "District 30 (West Valley City)", why: "Public-health professional who flipped a competitive West Valley seat for Democrats in 2024.", score: 78, kept: 9, broken: 2, pending: 6, icon: "🏛", tier: "silver",
          keyIssues: ["Public Health", "Pacific Islander Representation", "Cost of Living", "Education"],
          bio: "Jake Fitisemanu is a public-health professional and one of the first Pacific Islanders elected to the Utah Legislature, winning a competitive West Valley City seat in 2024. A longtime advocate for Utah's Tongan, Samoan, and broader AAPI communities, he has worked on health-data disaggregation so that smaller populations are not invisible in state statistics. He brings clinical and community-health credentials to debates over cost of living, healthcare access, and education in one of Utah's most diverse and working-class districts.",
          quote: "When our communities aren't counted in the data, they don't get counted in the budget. I'm here to change both.",
          promises: [
            { title: "Make Pacific Islander health visible in state data", detail: "Championed disaggregating health and demographic data so AAPI subgroups are accurately tracked and served.", verdict: "kept", issueKey: "healthcare" },
            { title: "Lower healthcare and cost-of-living burdens", detail: "Backed measures aimed at affordability and access for working families in West Valley.", verdict: "pending", issueKey: "housing_support" },
            { title: "Expand representation and civic access", detail: "Continues outreach and language-access work to bring underrepresented residents into the process.", verdict: "kept", issueKey: "rights_balance" },
            { title: "Defend public education in a diverse district", detail: "Supports neighborhood-school funding and opposed diverting dollars to private-school vouchers.", verdict: "kept", issueKey: "public_schools" },
            { title: "Hold a swing seat for his coalition", detail: "Must keep winning a genuinely competitive West Valley district to stay an effective voice — a contest, not a guarantee.", verdict: "pending", issueKey: "reform_balance" }
          ],
          sections: [
            { type: "deepdive", title: "Deep Dive — Health Equity & a Swing Seat", sources_count: 1, promises: [
              { title: "Data-disaggregation work", detail: "Pushed the state to break out health statistics for Pacific Islander and AAPI subgroups so resources follow real need.", verdict: "kept", sources: [{ label: "Utah Legislature", url: "https://le.utah.gov" }] },
              { title: "Barrier-breaking win", detail: "Among the first Pacific Islanders in the Legislature, elected from one of Utah's most diverse, working-class districts.", verdict: "kept" },
              { title: "Bellwether district", detail: "District 30 is exactly the kind of seat Democrats must hold to stay competitive statewide, putting his margins under a microscope each cycle.", verdict: "pending" }
            ]},
            { type: "info", title: "Why This Matters", text: "Fitisemanu's win in a swing West Valley district makes him both a barrier-breaker and a bellwether: his seat is exactly the kind Democrats must hold to stay competitive in Utah. His public-health background also means his data-equity work quietly shapes how the state directs resources to its fastest-growing communities." }
          ]
        },
        { id: "katy_hall", name: "Katy Hall", office: "State Representative (Dist. 11)", state: "Utah", party: "Republican", district: "District 11 (South Ogden, Davis/Weber)", why: "Sponsored Utah's 2024 law overhauling DEI programs at public institutions.", score: 66, kept: 12, broken: 4, pending: 5, icon: "🏛", tier: "gray",
          keyIssues: ["Equal-Opportunity / Anti-DEI Policy", "Higher Education", "Taxes", "Workforce"],
          bio: "Katy Hall is a South Ogden Republican elected in 2020 who became a nationally noticed figure as the House sponsor of Utah's 2024 Equal Opportunity Initiatives law, which dismantled diversity, equity, and inclusion offices and programs at public universities and government agencies. She framed the measure as restoring merit-based, identity-neutral treatment, and Utah's version became an early template that several other red states studied. Beyond that signature fight she works on tax, education, and workforce issues for her Weber and Davis County constituents.",
          quote: "Government should treat people as individuals, not as members of a category. That principle is what my bill restored.",
          promises: [
            { title: "End taxpayer-funded DEI programs in Utah", detail: "Sponsored and passed the 2024 Equal Opportunity Initiatives law eliminating DEI offices at public institutions.", verdict: "kept", issueKey: "rights_balance" },
            { title: "Protect free expression on campus", detail: "Argued the law would depoliticize universities; critics dispute the effect, and implementation is still being assessed.", verdict: "pending", issueKey: "free_speech" },
            { title: "Support workforce and tax relief", detail: "Backed targeted tax and workforce measures for northern Utah families.", verdict: "kept", issueKey: "lower_taxes" }
          ],
          sections: [
            { type: "deepdive", title: "Deep Dive — The Equal Opportunity Initiatives Law", sources_count: 2, promises: [
              { title: "Statewide DEI rollback (2024)", detail: "Eliminated diversity offices and identity-based programs across Utah's public universities and agencies, drawing national attention.", verdict: "kept", sources: [{ label: "Utah Legislature", url: "https://le.utah.gov" }] },
              { title: "National template", detail: "Utah's approach was cited by other states weighing similar legislation, amplifying Hall's influence.", verdict: "kept", sources: [{ label: "Utah House", url: "https://house.utah.gov" }] }
            ]},
            { type: "info", title: "Why This Matters", text: "Hall's DEI law reshaped every public university in Utah and fed a national movement, making a relatively junior legislator's record nationally significant. How the law plays out — on campus climate, hiring, and student services — is a live test of a policy now spreading across the country." }
          ]
        },
        { id: "verona_mauga", name: "Verona Mauga", office: "State Representative (Dist. 31)", state: "Utah", party: "Democrat", district: "District 31 (West Valley City, Taylorsville)", why: "Small-business owner and disability-services advocate; first Samoan woman in a continental state legislature.", score: 77, kept: 8, broken: 2, pending: 7, icon: "🏛", tier: "silver",
          keyIssues: ["Disability Services", "Small Business", "Education", "Immigrant & AAPI Communities"],
          bio: "Verona Mauga made history in 2024 as the first Samoan woman elected to a state legislature in the continental United States, representing the diverse, working-class communities of West Valley City and Taylorsville. She co-owns a disability-services company and a family café, giving her firsthand insight into both the caregiving economy and small-business challenges. Her agenda centers on disability access, education, and lifting up immigrant and Pacific Islander families who have long been underrepresented in Utah politics.",
          quote: "Representation isn't symbolic — it changes which families finally get a seat at the table when budgets are written.",
          promises: [
            { title: "Strengthen services for people with disabilities", detail: "Draws on running a disability-services business to push for better access and support funding.", verdict: "kept", issueKey: "gov_services" },
            { title: "Support small businesses and working families", detail: "Backs measures easing costs and red tape for the kind of small enterprises she operates.", verdict: "pending", issueKey: "econ_smallbiz" },
            { title: "Expand access for immigrant and AAPI communities", detail: "Works on representation, outreach, and culturally responsive services in her district.", verdict: "kept", issueKey: "immigration_reform" },
            { title: "Protect funding for public schools", detail: "Defends neighborhood-school investment for a diverse, working-class district rather than voucher diversion.", verdict: "kept", issueKey: "public_schools" },
            { title: "Turn a historic first into budget wins", detail: "The real test of her barrier-breaking election is whether disability and immigrant priorities actually land in the state budget.", verdict: "pending", issueKey: "gov_services" }
          ],
          sections: [
            { type: "deepdive", title: "Deep Dive — Caregiving Economy & Representation", sources_count: 1, promises: [
              { title: "Disability-services owner", detail: "Co-owns a disability-services company, giving her firsthand command of the caregiving workforce and Medicaid-funded supports.", verdict: "kept", sources: [{ label: "Utah Legislature", url: "https://le.utah.gov" }] },
              { title: "Historic first", detail: "The first Samoan woman elected to any state legislature in the continental U.S., representing long-underrepresented communities.", verdict: "kept" },
              { title: "Small-business reality", detail: "Also co-owns a family café, anchoring her cost-of-living and red-tape arguments in lived experience.", verdict: "pending" }
            ]},
            { type: "info", title: "Why This Matters", text: "Mauga's election broke a barrier that had stood for the entire history of the continental U.S., and she legislates from the lived experience of caregiving and small-business ownership. Her record shows whether historic firsts translate into concrete wins for the disability and immigrant communities she represents." }
          ]
        }
      ],
      "utah-cand-2026": [
        { id: "mike_kennedy", name: "Mike Kennedy", office: "Candidate for Congress (CD-3)", state: "Utah", party: "Republican", district: "Congressional District 3", why: "Physician and former state senator now in Congress, a leading 2026 federal candidate.", score: 72, kept: 12, broken: 3, pending: 8, icon: "🦅", tier: "silver",
          keyIssues: ["Healthcare Policy", "Fiscal Conservatism", "Family Values", "Rural Access"],
          bio: "Mike Kennedy is a rare triple-credentialed lawmaker — a practicing family physician, an attorney, and a former Utah state senator — who won the U.S. House seat for Utah's 3rd District in 2024 after John Curtis moved to the Senate. He first gained statewide notice challenging Senator Orrin Hatch's successor field in 2018. In Congress he brings a clinician's perspective to healthcare debates while voting as a reliable fiscal and social conservative, representing a sprawling district that stretches from Provo's suburbs deep into rural eastern and southern Utah.",
          quote: "I've treated patients and balanced a Senate budget. Washington could use more people who've actually done the work.",
          nextElection: "2026-11-03", electionLabel: "2026 General Election",
          promises: [
            { title: "Bring a doctor's lens to federal health policy", detail: "Uses his medical practice to inform votes on healthcare access, costs, and rural care.", verdict: "kept" },
            { title: "Push for fiscal restraint and balanced budgets", detail: "Campaigns on spending discipline; meaningful federal deficit reduction remains unrealized.", verdict: "pending" },
            { title: "Serve a vast, mostly rural district", detail: "Focuses on constituent service and rural priorities across one of Utah's largest districts.", verdict: "kept" },
            { title: "Protect access to care in rural Utah", detail: "Argues from clinical experience for rural hospitals, telehealth, and provider recruitment in underserved counties.", verdict: "pending" },
            { title: "Hold a consistent social-conservative record", detail: "Votes as a reliable pro-life, family-values conservative in line with his district.", verdict: "kept" }
          ],
          sections: [
            { type: "deepdive", title: "Deep Dive — A Doctor, Lawyer & Legislator in Congress", sources_count: 1, promises: [
              { title: "Triple-credentialed background", detail: "A practicing family physician, attorney, and former state senator — an unusually broad résumé for a House freshman.", verdict: "kept", sources: [{ label: "Congress.gov", url: "https://www.congress.gov" }] },
              { title: "Clinician on health votes", detail: "Brings firsthand patient experience to debates over costs, access, and rural care that are usually argued in pure politics.", verdict: "kept" },
              { title: "Fiscal goals untested", detail: "Ran on spending discipline; whether that translates into real deficit reduction is the open question of his term.", verdict: "pending" }
            ]},
            { type: "info", color: "gold", title: "Why This Matters", text: "Kennedy is one of the very few physicians in Congress, which gives his healthcare votes added credibility in a chamber where the topic is often pure politics. As a freshman in a safe seat, his early record signals what kind of representative he intends to be." }
          ]
        },
        { id: "darlene_mcdonald", name: "Darlene McDonald", office: "Candidate for Congress", state: "Utah", party: "Democrat", district: "Congressional District 4", why: "Community advocate and repeat Democratic congressional candidate active for 2026.", score: 70, kept: 6, broken: 1, pending: 10, icon: "🗳️", tier: "gray",
          keyIssues: ["Economic Justice", "Voting Rights", "Healthcare Access", "Working Families"],
          bio: "Darlene McDonald is a writer, IT professional, and longtime community organizer who has become a persistent Democratic voice in Utah's competitive 4th Congressional District. A board member and activist in racial-justice and civic-engagement groups, she has run for Congress before and continues building grassroots infrastructure for Democrats in a swing district that includes parts of Salt Lake and Utah counties. Her platform centers on economic fairness for working families, protecting voting access, and expanding affordable healthcare.",
          quote: "I'm not a career politician — I'm a working mom who got tired of waiting for someone else to fight for families like mine.",
          nextElection: "2026-11-03", electionLabel: "2026 Election Cycle",
          promises: [
            { title: "Champion economic justice for working families", detail: "Centers her campaigns on wages, cost of living, and opportunity for everyday Utahns.", verdict: "pending" },
            { title: "Protect and expand voting access", detail: "A consistent advocate for voting rights and civic engagement through her organizing work.", verdict: "kept" },
            { title: "Win a competitive congressional seat", detail: "Continues to run and organize in a swing district; a general-election win has not yet come.", verdict: "pending" },
            { title: "Expand affordable healthcare", detail: "Runs on widening coverage and lowering medical costs for families in the 4th District.", verdict: "pending" },
            { title: "Build durable Democratic infrastructure", detail: "Has invested in grassroots organizing and racial-justice advocacy that outlasts any single campaign.", verdict: "kept" }
          ],
          sections: [
            { type: "deepdive", title: "Deep Dive — Grassroots in a Swing District", sources_count: 1, promises: [
              { title: "Repeat candidate, steady organizer", detail: "Has run before and kept building civic-engagement infrastructure for Democrats in a genuinely competitive seat.", verdict: "kept", sources: [{ label: "Ballotpedia", url: "https://ballotpedia.org" }] },
              { title: "Outsider framing", detail: "Campaigns as a working mom and community advocate rather than a career politician, leaning on lived experience.", verdict: "pending" },
              { title: "The win still pending", detail: "Sustained organizing keeps the district contested, but a general-election victory remains the unmet goal.", verdict: "pending" }
            ]},
            { type: "info", title: "Why This Matters", text: "Utah's 4th District is the rare Utah seat Democrats can realistically contest, and candidates like McDonald keep that competition alive. Her sustained organizing matters for whether the district stays a genuine two-party battleground heading into 2026." }
          ]
        },
        { id: "nate_blouin_cand", name: "Nate Blouin", office: "Candidate for Re-election (Senate Dist. 13)", state: "Utah", party: "Democrat", district: "District 13 (Salt Lake County)", why: "Incumbent progressive senator campaigning for re-election in 2026 on clean energy.", score: 79, kept: 9, broken: 2, pending: 6, icon: "🗳️", tier: "silver",
          keyIssues: ["Clean Energy", "Air Quality", "Renter Protections", "Climate Policy"],
          bio: "Nate Blouin is a clean-energy professional and one of the Utah Senate's youngest and most progressive members, representing a Salt Lake County district he flipped for Democrats. With a career in renewable-energy development, he has made the case inside a fossil-fuel-friendly Legislature for solar, energy efficiency, and stronger air-quality standards along the chronically polluted Wasatch Front. Seeking re-election in 2026, he also champions renter protections and housing affordability for a district full of younger, cost-burdened voters.",
          quote: "Utah can lead the clean-energy economy instead of fighting it — the jobs and the cleaner air are both up for grabs.",
          nextElection: "2026-11-03", electionLabel: "2026 General Election",
          promises: [
            { title: "Advance clean energy and efficiency in Utah", detail: "Brings renewable-industry expertise to push solar, storage, and efficiency policy from the minority.", verdict: "kept" },
            { title: "Improve Wasatch Front air quality", detail: "Advocates stronger emissions and inversion-season measures; large wins are constrained by the majority.", verdict: "pending" },
            { title: "Strengthen renter and housing protections", detail: "Backs tenant protections and affordability measures for his younger constituency.", verdict: "pending" },
            { title: "Defend public-school funding", detail: "Opposed diverting taxpayer money into private-school vouchers as a Senate Democrat.", verdict: "kept" },
            { title: "Hold his seat and grow the caucus", detail: "Seeking re-election in 2026, part of Democrats' uphill effort to stay relevant in a supermajority Senate.", verdict: "pending" }
          ],
          sections: [
            { type: "deepdive", title: "Deep Dive — Clean Energy from the Minority", sources_count: 1, promises: [
              { title: "Industry insider", detail: "A renewable-energy professional making the technical and economic case for solar and efficiency inside a fossil-fuel-friendly Legislature.", verdict: "kept", sources: [{ label: "Utah Senate", url: "https://senate.utah.gov" }] },
              { title: "Air quality as health", detail: "Ties Wasatch Front pollution and Great Salt Lake dust to public health, pressing for stronger inversion-season action.", verdict: "pending" },
              { title: "Generational voters", detail: "Champions renter protections and affordability for the younger, cost-burdened residents who define his district.", verdict: "pending" }
            ]},
            { type: "info", title: "Why This Matters", text: "Blouin is a rare clean-energy expert in a Legislature built around traditional energy, making him a barometer for whether Utah's climate and air-quality politics are shifting. Holding his swing-ish seat in 2026 is also part of Democrats' uphill effort to stay relevant in the Senate." }
          ]
        },
        { id: "lisonbee", name: "Karianne Lisonbee", office: "State Representative (Dist. 14)", state: "Utah", party: "Republican", district: "District 14 (Clearfield/Syracuse, Davis County)", why: "Chair of the House Judiciary Committee and the chief House author of Utah's abortion 'trigger law' — one of the most consequential social-policy legislators in the state.", score: 62, kept: 15, broken: 4, pending: 6, icon: "🏛", tier: "gray", nextElection: "2026-11-03", electionLabel: "2026 U.S. House (CD-2) Candidate",
          keyIssues: ["Abortion Policy", "Judiciary & Courts", "Second Amendment", "Election Law"],
          bio: "Karianne Lisonbee is a Davis County Republican who has served in the Utah House since 2017 after a stint on the Syracuse City Council, and she chairs the powerful House Judiciary Committee. She is best known statewide as the House sponsor of Utah's 2020 abortion 'trigger law,' a near-total ban that took effect when Roe v. Wade was overturned, and as the author of follow-on restrictions such as 2023's HB 467, which sought to move abortions into hospitals and close licensed clinics. She served in House Republican leadership as whip and assistant whip from 2022 to 2025, but after losing a June 2025 race for majority leader to Casey Snider she left leadership and announced she would not seek another House term — instead launching a 2026 campaign for Utah's 2nd Congressional District.",
          quote: "I came to the Legislature to defend life and the rule of law, and I've never apologized for either.",
          promises: [
            { title: "Pass an abortion ban triggered by overturning Roe", detail: "Carried Utah's 2020 trigger-law ban in the House; it was enacted and took effect after the Supreme Court overturned Roe v. Wade in 2022.", verdict: "kept", issueKey: "pro_life" },
            { title: "Move abortions out of clinics and into hospitals", detail: "Sponsored 2023's HB 467 to end clinic licensing and require hospital-based procedures; the law passed but key provisions have been tied up in ongoing litigation.", verdict: "pending", issueKey: "pro_life" },
            { title: "Lead the House Judiciary agenda", detail: "Chairs the House Judiciary Committee, steering the chamber's work on courts, criminal law, and civil liability.", verdict: "kept", issueKey: "justice_balance" },
            { title: "Rise into top House leadership", detail: "Ran for House majority leader in June 2025 but lost the caucus vote and stepped out of leadership entirely.", verdict: "broken", issueKey: "reform_balance" }
          ],
          sections: [
            { type: "deepdive", title: "Deep Dive — Abortion & Judiciary Record", sources_count: 2, promises: [
              { title: "Trigger-law sponsor", detail: "House carrier of the 2020 ban that became one of the strictest in the country once Roe fell.", verdict: "kept", sources: [{ label: "Utah Legislature", url: "https://le.utah.gov" }] },
              { title: "Judiciary Committee chair", detail: "Sets the House agenda on courts, criminal justice, and liability law.", verdict: "kept", sources: [{ label: "Utah House", url: "https://house.utleg.gov" }] },
              { title: "Clinic restrictions in court", detail: "Her HB 467 clinic-licensing ban passed but has been stayed amid constitutional challenges.", verdict: "pending" }
            ]},
            { type: "info", color: "gold", title: "Why This Matters", text: "Few individual legislators have shaped a more contested area of Utah law than Lisonbee, whose trigger-law and clinic bills decide whether and how abortion is available across the state. With her now running for Congress in 2026, her record is also a preview of the agenda she would carry to Washington — making it essential reading for voters in Utah's 2nd District." }
          ]
        },
        { id: "dailey_provost", name: "Jen Dailey-Provost", office: "State Representative (Dist. 22)", state: "Utah", party: "Democrat", district: "District 22 (Salt Lake City, Salt Lake County)", why: "House Minority Whip and the Legislature's leading Democratic voice on healthcare access, drug pricing, and air quality.", score: 81, kept: 14, broken: 2, pending: 6, icon: "🏛", tier: "silver",
          keyIssues: ["Healthcare Access", "Prescription Drug Pricing", "Air Quality", "Reproductive Rights"],
          bio: "Jen Dailey-Provost is a Salt Lake City Democrat who has represented the city's east side in the Utah House since 2019 and serves as House Minority Whip. With an MBA and a PhD in public health and a faculty position at the University of Utah School of Medicine, she came to politics from healthcare advocacy as the former executive director of the Utah Academy of Family Physicians. In a Republican supermajority she has become the Democrats' most fluent voice on the state budget and on healthcare policy — pressing for broader coverage, lower prescription-drug and insulin costs, cleaner air along the Wasatch Front, and protection of reproductive-health access.",
          quote: "Health policy is budget policy — every coverage decision we make here shows up later in someone's emergency room.",
          promises: [
            { title: "Lower the cost of insulin and prescription drugs", detail: "Championed drug-affordability measures, including caps and transparency efforts aimed at insulin and other essential medicines.", verdict: "kept", issueKey: "health_drug_prices" },
            { title: "Expand access to care for low-income Utahns", detail: "Consistently backs Medicaid and coverage expansions, though the scale of new investment is limited by the majority's budget choices.", verdict: "pending", issueKey: "healthcare" },
            { title: "Protect reproductive-health access at the state level", detail: "Leads minority opposition to new abortion restrictions; has slowed but not reversed the supermajority's agenda.", verdict: "pending", issueKey: "pro_choice" },
            { title: "Win stronger clean-air investment", detail: "Pushes Wasatch Front air-quality and inversion measures from the minority, securing incremental rather than sweeping funding.", verdict: "pending", issueKey: "climate_action" }
          ],
          sections: [
            { type: "deepdive", title: "Deep Dive — Healthcare & the Budget", sources_count: 2, promises: [
              { title: "Drug-pricing leadership", detail: "A health-policy professional turned legislator who has made affordability of insulin and prescriptions a signature cause.", verdict: "kept", sources: [{ label: "Utah House Democrats", url: "https://www.utahhousedemocrats.utleg.gov" }] },
              { title: "Minority Whip", detail: "Helps set the House Democratic strategy on budget negotiations and healthcare votes.", verdict: "kept", sources: [{ label: "Utah Legislature", url: "https://le.utah.gov" }] },
              { title: "Coverage and clean air", detail: "Presses for Medicaid access and air-quality funding, winning partial gains against the supermajority's priorities.", verdict: "pending" }
            ]},
            { type: "info", title: "Why This Matters", text: "Dailey-Provost combines clinical-policy expertise with a deep command of the state budget, making her the Democrat the majority most often has to negotiate with on healthcare. Tracking which of her affordability and coverage priorities actually get funded is the clearest measure of how much the minority can move Utah's health policy." }
          ]
        },
        { id: "doug_owens", name: "Doug Owens", office: "State Representative (Dist. 33)", state: "Utah", party: "Democrat", district: "District 33 (Millcreek/Holladay, Salt Lake County)", why: "Pragmatic moderate, Minority Caucus Manager, and son of former U.S. Rep. Wayne Owens — a bridge-builder in a deeply Republican chamber.", score: 80, kept: 13, broken: 2, pending: 5, icon: "🏛", tier: "silver",
          keyIssues: ["Bipartisan Governance", "Air Quality", "Public Education", "Consumer Protection"],
          bio: "Doug Owens is a Millcreek Democrat and veteran attorney who has served in the Utah House since 2021, where he is the Minority Caucus Manager. A graduate of the University of Utah and Yale Law School with more than thirty years resolving complex commercial, environmental, and employment disputes, he is the son of the late Wayne Owens, who represented Utah in Congress. Before his legislative service he twice ran for the U.S. House in Utah's 4th District, narrowly losing to Mia Love in 2014 and 2016. In the House he has built a reputation as a measured, results-oriented moderate who looks for bipartisan openings on air quality, education funding, and consumer protection.",
          quote: "You don't have to be in the majority to be useful — you have to be willing to find the handful of people who'll work with you.",
          promises: [
            { title: "Find bipartisan wins despite minority status", detail: "Has repeatedly passed or co-sponsored measured, lower-profile bills with bipartisan support rather than chasing symbolic fights.", verdict: "kept", issueKey: "reform_balance" },
            { title: "Strengthen consumer protections", detail: "Backs consumer-finance and fraud-protection measures drawn from his decades of civil-litigation experience.", verdict: "kept", issueKey: "privacy_rights" },
            { title: "Improve Wasatch Front air quality", detail: "Supports emissions and inversion-season measures, with progress limited by the majority's priorities.", verdict: "pending", issueKey: "climate_action" },
            { title: "Defend public-school funding", detail: "Opposes diverting public dollars to private-school vouchers and pushes to protect per-pupil funding.", verdict: "pending", issueKey: "public_schools" }
          ],
          sections: [
            { type: "deepdive", title: "Deep Dive — A Moderate's Playbook", sources_count: 2, promises: [
              { title: "Family legacy", detail: "Son of former U.S. Rep. Wayne Owens; brings a long Utah political lineage and two prior congressional runs to his House work.", verdict: "kept", sources: [{ label: "Utah House Democrats", url: "https://www.utahhousedemocrats.utleg.gov" }] },
              { title: "Caucus Manager", detail: "Helps run the House Democratic caucus and is known for negotiating with the majority rather than grandstanding.", verdict: "kept", sources: [{ label: "Utah Legislature", url: "https://le.utah.gov" }] },
              { title: "Air and education", detail: "Picks his fights on issues with potential cross-aisle support, securing incremental progress.", verdict: "pending" }
            ]},
            { type: "info", title: "Why This Matters", text: "Owens is a test of whether a pragmatic Democrat can still get things done inside a Republican supermajority. His record shows exactly where bipartisan cooperation in Utah remains possible — and where the partisan walls are too high even for a seasoned dealmaker." }
          ]
        },
        { id: "ken_ivory", name: "Ken Ivory", office: "State Representative (Dist. 39)", state: "Utah", party: "Republican", district: "District 39 (West Jordan, Salt Lake County)", why: "The national face of the movement to transfer federal public lands to the states — a signature, decades-long crusade with real legal and political stakes for the West.", score: 60, kept: 16, broken: 7, pending: 5, icon: "🏛", tier: "gray",
          keyIssues: ["Federal Land Transfer", "Public Lands", "States' Rights", "Property Rights"],
          bio: "Ken Ivory is a West Jordan Republican who has served in the Utah House since 2011, with a brief 2019-2021 gap, and is the country's most persistent advocate for transferring federal public lands to state control. In 2012 he sponsored the Transfer of Public Lands Act (HB 148), which demanded the federal government cede roughly 30 million acres to Utah, and he founded and led the American Lands Council to spread the idea to other Western states. The crusade has reshaped the West's land debate but has not delivered actual transfers — the lands remain federal — and his dual role writing legislation while leading the advocacy group drew conflict-of-interest complaints. He continues to press public-lands, property-rights, and states'-rights legislation.",
          quote: "These are our lands. Utah can manage its own backyard better than a bureaucracy two thousand miles away.",
          promises: [
            { title: "Force the transfer of federal lands to Utah", detail: "Sponsored the 2012 Transfer of Public Lands Act demanding roughly 30 million acres; the law passed but the federal government never ceded the land and courts have not compelled it.", verdict: "broken", issueKey: "lands_local" },
            { title: "Build a multi-state lands-transfer movement", detail: "Founded the American Lands Council and carried the cause into legislatures across the West, making it a defining Western land issue.", verdict: "kept", issueKey: "lands_local" },
            { title: "Expand state and local control over land use", detail: "Continues to sponsor property-rights and states'-rights bills aimed at limiting federal land authority.", verdict: "pending", issueKey: "lands_local" }
          ],
          sections: [
            { type: "deepdive", title: "Deep Dive — The Public-Lands Crusade", sources_count: 2, promises: [
              { title: "HB 148 (2012)", detail: "His Transfer of Public Lands Act asserted a state claim to tens of millions of acres but produced no actual transfer of ownership.", verdict: "broken", sources: [{ label: "Utah Legislature", url: "https://le.utah.gov" }] },
              { title: "American Lands Council", detail: "Founded and led the advocacy group that exported the transfer idea nationally; the role also drew conflict-of-interest scrutiny.", verdict: "kept", sources: [{ label: "Utah House", url: "https://house.utleg.gov" }] },
              { title: "Ongoing land bills", detail: "Keeps filing property-rights and federal-land measures session after session.", verdict: "pending" }
            ]},
            { type: "info", color: "gold", title: "Why This Matters", text: "Control of Utah's vast federal lands shapes everything from grazing and energy to recreation and the fate of national monuments. Ivory has done more than almost anyone to turn that question into a live legal and political fight — even though the transfer he promised has never actually happened, which is exactly why his record deserves close scrutiny." }
          ]
        },
        { id: "carl_albrecht", name: "Carl Albrecht", office: "State Representative (Dist. 70)", state: "Utah", party: "Republican", district: "District 70 (Richfield, South-Central Utah)", why: "The Legislature's go-to expert on rural energy, water, and economic development across a vast stretch of south-central Utah.", score: 71, kept: 21, broken: 5, pending: 4, icon: "🏛", tier: "gray",
          keyIssues: ["Rural Economic Development", "Energy Policy", "Water & Agriculture", "Public Lands"],
          bio: "Carl Albrecht is a Richfield Republican who has represented a huge, mostly rural south-central Utah district since 2017. He spent four decades at the Garkane Energy Cooperative, serving 22 years as its chief operating officer, and brings that utility experience to his role as a leader on the House's energy and public-utilities agenda. His legislative focus is squarely on the needs of rural Utah: creating jobs in small communities (he sponsored 2018's HB 390 to fund rural economic development), securing reliable and affordable power, and protecting water and agriculture in a region defined by drought and federal land.",
          quote: "Rural Utah keeps the lights on and grows the food for the whole state — our communities deserve a real seat at the table.",
          promises: [
            { title: "Create jobs in rural Utah", detail: "Sponsored 2018's HB 390 establishing state grants to grow employment in rural counties.", verdict: "kept", issueKey: "econ_growth" },
            { title: "Protect reliable, affordable rural energy", detail: "Uses four decades of utility experience to shape energy and public-utilities policy favorable to rural ratepayers.", verdict: "kept", issueKey: "enviro_energy" },
            { title: "Defend rural water and agriculture", detail: "Backs water-infrastructure and agriculture measures, though drought and federal constraints leave long-term supply uncertain.", verdict: "pending", issueKey: "rural_ag" }
          ],
          sections: [
            { type: "deepdive", title: "Deep Dive — Rural Energy & Development", sources_count: 2, promises: [
              { title: "Utility insider", detail: "A 40-year Garkane Energy veteran whose technical grasp of the grid anchors the House's energy debates.", verdict: "kept", sources: [{ label: "Utah Legislature", url: "https://le.utah.gov" }] },
              { title: "Rural jobs grants", detail: "His HB 390 created a funding tool for economic development in small Utah communities.", verdict: "kept", sources: [{ label: "Utah House", url: "https://house.utleg.gov" }] },
              { title: "Water and land", detail: "Champions rural water and agriculture interests against the pressures of drought and federal land policy.", verdict: "pending" }
            ]},
            { type: "info", title: "Why This Matters", text: "Albrecht represents the rural Utah that produces much of the state's power, food, and public land but holds only a fraction of its population. His work decides whether energy stays affordable and whether small towns can keep their young people — a side of Utah's economy that rarely makes headlines but affects the whole state." }
          ]
        },
        { id: "nelson_abbott", name: "Nelson Abbott", office: "State Representative (Orem)", state: "Utah", party: "Republican", district: "Orem, Utah County", why: "Chair of the House Judiciary Committee and an attorney-legislator who helps steer Utah's criminal-justice and civil-law agenda.", score: 66, kept: 14, broken: 4, pending: 5, icon: "🏛", tier: "gray",
          keyIssues: ["Judiciary & Courts", "Criminal Justice", "Civil Law", "Property Rights"],
          bio: "Nelson Abbott is an Orem Republican and practicing attorney who has served in the Utah House since 2021 and chairs the House Judiciary Committee. From that perch he plays a central role in shaping the chamber's work on courts, criminal sentencing, civil liability, and family law. A reliable conservative vote re-elected comfortably in 2024, he tends to approach legislation through a lawyer's lens — focused on statutory clarity, due process, and how Utah's laws will hold up when they reach the courts.",
          quote: "Good law has to survive the courtroom. My job on Judiciary is to make sure what we pass actually works when it's tested.",
          promises: [
            { title: "Lead the House Judiciary Committee", detail: "Chairs the committee that vets the House's courts, criminal-justice, and civil-law bills.", verdict: "kept", issueKey: "justice_reform" },
            { title: "Bring legal rigor to lawmaking", detail: "Uses his litigation background to tighten statutory language and flag constitutional risks in proposed bills.", verdict: "kept", issueKey: "reform_balance" },
            { title: "Advance conservative criminal-justice priorities", detail: "Supports the majority's sentencing and public-safety agenda, with some measures still working through the process.", verdict: "pending", issueKey: "justice_balance" }
          ],
          sections: [
            { type: "deepdive", title: "Deep Dive — Judiciary Gatekeeper", sources_count: 1, promises: [
              { title: "Committee chair", detail: "Decides which courts and criminal-justice bills advance in the House.", verdict: "kept", sources: [{ label: "Utah Legislature", url: "https://le.utah.gov" }] },
              { title: "Attorney's eye", detail: "Brings practicing-lawyer scrutiny to bill drafting and constitutional questions.", verdict: "kept" }
            ]},
            { type: "info", title: "Why This Matters", text: "As Judiciary chair, Abbott helps decide which changes to Utah's courts, sentencing, and civil-liability laws ever reach a vote. That gatekeeping role gives a single legislator outsized influence over how justice is administered across the state." }
          ]
        },
        { id: "bridger_bolinder", name: "Bridger Bolinder", office: "State Representative (Tooele County)", state: "Utah", party: "Republican", district: "Grantsville, Tooele County", why: "House Majority Assistant Whip (elevated in June 2025) representing fast-growing Tooele County west of the Wasatch Front.", score: 67, kept: 12, broken: 3, pending: 6, icon: "🏛", tier: "gray",
          keyIssues: ["Rural & Exurban Growth", "Agriculture", "Water Policy", "Public Safety"],
          bio: "Bridger Bolinder is a Grantsville Republican who represents Tooele County, one of the fastest-growing parts of Utah as the Salt Lake region spills west. Re-elected comfortably in 2024 and previously a committee chair, he was elevated to House Majority Assistant Whip in the June 2025 special leadership election that followed Majority Leader Jefferson Moss's resignation. His agenda reflects a district straddling agriculture and rapid suburban expansion — balancing growth pressures, water demand, and public-safety needs in communities that are changing quickly.",
          quote: "Tooele County is growing fast, and my job is to make sure that growth doesn't outrun our water, our roads, or our quality of life.",
          promises: [
            { title: "Earn a seat in House leadership", detail: "Won election as House Majority Assistant Whip in June 2025, joining the team behind Speaker Schultz.", verdict: "kept", issueKey: "reform_balance" },
            { title: "Manage explosive growth responsibly", detail: "Backs planning, infrastructure, and water measures for booming Tooele County, an effort that is ongoing as growth accelerates.", verdict: "pending", issueKey: "housing_build" },
            { title: "Protect agriculture and rural character", detail: "Supports agriculture and property-rights measures even as suburban development reshapes his district.", verdict: "pending", issueKey: "rural_ag" }
          ],
          sections: [
            { type: "deepdive", title: "Deep Dive — Growth on the Frontier", sources_count: 1, promises: [
              { title: "New in leadership", detail: "Stepped into the Majority Assistant Whip role in the 2025 leadership shakeup.", verdict: "kept", sources: [{ label: "Utah House", url: "https://house.utleg.gov" }] },
              { title: "Water and growth", detail: "Represents a district where suburban expansion is colliding with limited water and rural land.", verdict: "pending" }
            ]},
            { type: "info", title: "Why This Matters", text: "Bolinder represents the leading edge of Utah's westward sprawl, where the choices made now about water, roads, and zoning will shape whether breakneck growth becomes prosperity or strain. His new leadership seat also gives Tooele County a louder voice in the majority caucus." }
          ]
        },
        { id: "brady_brammer", name: "Brady Brammer", office: "State Senator (Dist. 21)", state: "Utah", party: "Republican", district: "District 21 (Highland/Pleasant Grove, Utah County)", why: "Attorney-legislator who moved from the House to the Senate and authored some of Utah's most closely watched social-media and online-speech laws.", score: 70, kept: 17, broken: 4, pending: 5, icon: "🏛", tier: "silver",
          keyIssues: ["Social Media Regulation", "Civil Liability & Tort Law", "Local Government", "Fiscal Policy"],
          bio: "Brady Brammer is a Utah County Republican and attorney who served in the Utah House before winning election to Senate District 21 in 2024. With a law degree and a master's in public administration and years representing cities, school districts, and businesses in government-law disputes, he has become one of the Legislature's go-to members on technology and liability policy. He was the sponsor of a high-profile law requiring social-media platforms to disclose their content-moderation rules and give Utah users notice and an appeals process — part of Utah's broader push to regulate big tech that has drawn both national attention and constitutional challenges.",
          quote: "When a handful of platforms decide what millions of people get to say, the public deserves to know the rules and have a way to appeal them.",
          promises: [
            { title: "Make social-media moderation transparent", detail: "Sponsored a law requiring platforms to publish their moderation policies and give Utah users notice and an appeals process when content is removed.", verdict: "kept", issueKey: "tech_balance" },
            { title: "Bring legal expertise to civil-liability law", detail: "Uses his litigation and government-law background to shape tort, local-government, and consumer measures.", verdict: "kept", issueKey: "justice_balance" },
            { title: "Defend Utah's tech laws in court", detail: "Several of Utah's online-speech and platform laws he helped advance face constitutional challenges still working through the courts.", verdict: "pending", issueKey: "tech_balance" }
          ],
          sections: [
            { type: "deepdive", title: "Deep Dive — Regulating Big Tech", sources_count: 2, promises: [
              { title: "Moderation transparency law", detail: "Authored requirements that platforms disclose moderation rules and offer appeals to Utah account holders.", verdict: "kept", sources: [{ label: "Utah Legislature", url: "https://le.utah.gov" }] },
              { title: "House to Senate", detail: "Carried his tech and liability focus from the House into Senate District 21 in 2025.", verdict: "kept", sources: [{ label: "Utah Senate", url: "https://senate.utah.gov" }] },
              { title: "Court tests ahead", detail: "Utah's platform-regulation laws face First Amendment challenges whose outcomes will shape what survives.", verdict: "pending" }
            ]},
            { type: "info", color: "gold", title: "Why This Matters", text: "Utah has positioned itself at the front of a national experiment in regulating social media, and Brammer is one of the lawyers writing the rules. Whether his transparency and liability laws survive court challenges will help decide how far any state can go in governing online speech — a question with consequences far beyond Utah." }
          ]
        }
      ],
      "utah-statewide": [
        {
          id: "spencer_cox",
          name: "Spencer Cox",
          office: "Governor of Utah",
          state: "Utah",
          party: "Republican",
          district: "Statewide",
          why: "Utah's sitting governor and a nationally visible figure on civility, housing, water, and energy, whose decisions touch every corner of state policy.",
          score: 73, kept: 16, broken: 6, pending: 7, icon: "⭐", tier: "gold",
          keyIssues: ["Housing Affordability & Starter Homes", "Great Salt Lake & Water", "Energy ('Operation Gigawatt')", "Civility & 'Disagree Better'"],
          bio: "Spencer Cox is a Sanpete County native — former Fairview mayor, county commissioner, state legislator, and tech-company executive — who became Utah's governor in 2021 after eight years as lieutenant governor under Gary Herbert. Re-elected in 2024, he has paired a deeply conservative governing record with an unusual national brand built on civility, chairing the National Governors Association around a 'Disagree Better' initiative. As governor he has set ambitious goals on housing supply, fought to save the shrinking Great Salt Lake, launched a major energy build-out, and signed a wave of conservative legislation on social media, DEI, and education — making him the single most consequential official in Utah government.",
          quote: "We can disagree without hating each other. And we can grow by a million people without running out of water — but only if we make the hard choices now instead of later.",
          promises: [
            { title: "Spur 35,000 new starter homes for first-time buyers", detail: "Set a high-profile goal and backed funding and zoning incentives to expand attainable housing, though affordability has kept worsening against demand.", verdict: "pending" },
            { title: "Save the Great Salt Lake from collapse", detail: "Made the lake a signature priority, signing water-conservation and trust measures, but lake levels remain critically low and recovery is unproven.", verdict: "pending" },
            { title: "Launch a major energy build-out ('Operation Gigawatt')", detail: "Announced a plan to roughly double Utah's power capacity over a decade to meet growth and data-center demand.", verdict: "pending" },
            { title: "Champion civility and 'Disagree Better'", detail: "Led a national civility campaign as NGA chair and made it a defining personal theme.", verdict: "kept" },
            { title: "Sign conservative priorities on social media, DEI, and schools", detail: "Approved laws restricting minors' social-media use, curbing DEI programs in government and universities, and expanding school choice.", verdict: "kept" }
          ],
          sections: [
            { type: "deepdive", title: "Deep Dive — Cox's Governing Record", sources_count: 2, promises: [
              { title: "Housing and growth agenda", detail: "Tied his governorship to expanding starter-home supply as Utah's population and prices surge.", verdict: "pending", sources: [{ label: "Utah Governor", url: "https://governor.utah.gov" }] },
              { title: "Water and the Great Salt Lake", detail: "Signed landmark conservation measures, but the lake's survival still hangs on snowpack and follow-through.", verdict: "pending", sources: [{ label: "Utah Legislature", url: "https://le.utah.gov" }] },
              { title: "Civility brand vs. conservative record", detail: "Pairs a national 'Disagree Better' message with hard-line bills on DEI and social media, a tension critics highlight.", verdict: "kept" }
            ]},
            { type: "info", color: "gold", title: "Why This Matters", text: "As governor, Cox signs or vetoes everything the Legislature passes and sets the agenda on the issues that define Utah's future — whether families can afford a home, whether the Great Salt Lake survives, and whether the lights stay on through record growth. His national civility brand also makes him a figure whose words and record voters can hold up against each other." }
          ]
        },
        {
          id: "mike_lee",
          name: "Mike Lee",
          office: "U.S. Senator",
          state: "Utah",
          party: "Republican",
          district: "Statewide (U.S. Senate)",
          why: "Utah's senior U.S. senator and one of the Senate's most influential constitutional conservatives, a leading voice on public lands, spending, and executive power.",
          score: 68, kept: 19, broken: 8, pending: 6, icon: "🦅", tier: "silver",
          keyIssues: ["Federal Public Lands & State Control", "Constitutional Originalism & Separation of Powers", "Federal Spending & Debt", "Big Tech & Antitrust"],
          bio: "Mike Lee is Utah's senior U.S. senator, a constitutional lawyer and son of a former U.S. solicitor general who won his seat in the 2010 Tea Party wave and has since become one of the Senate's most prominent originalist voices. He is the chamber's loudest advocate for transferring federally controlled Western lands to state hands, a fierce critic of deficit spending and executive overreach, and an aggressive player on Big Tech and antitrust from his Judiciary perch. Known for a highly active social-media presence and close alignment with the party's populist-conservative wing, he wields outsized influence over judicial nominations, energy, and public-lands policy. He is not on the ballot until 2028.",
          quote: "The Constitution doesn't bend to convenience. Washington has spent decades centralizing power and debt — my job is to push both back toward the states and the people.",
          promises: [
            { title: "Fight to return federal lands to Western states", detail: "Utah's leading champion of transferring federally managed public lands to the state, a long-running cause that remains unrealized in law.", verdict: "pending" },
            { title: "Rein in federal spending and the national debt", detail: "A consistent vote against large spending packages and debt increases, though the debt has continued to climb regardless.", verdict: "broken" },
            { title: "Confirm originalist judges to the federal bench", detail: "Played an influential role in advancing and confirming conservative judicial nominees.", verdict: "kept" },
            { title: "Take on Big Tech through antitrust and speech bills", detail: "Used his Judiciary seat to push antitrust scrutiny and platform-accountability measures.", verdict: "pending" },
            { title: "Defend separation of powers against executive overreach", detail: "Repeatedly challenged expansions of executive and administrative power across administrations of both parties.", verdict: "kept" },
            { title: "Curb nationwide injunctions from district judges", detail: "A leading Senate critic of blocking federal policy by nationwide injunction; the House passed the No Rogue Rulings Act as the Senate weighs how far to limit universal injunctions.", verdict: "pending", issueKey: "gov_balance" },
            { title: "Toughen detention of criminal illegal immigrants", detail: "Voted for the Laken Riley Act, now law, requiring federal detention of unlawfully present immigrants charged with theft or violent crimes.", verdict: "kept", issueKey: "border_security" },
            { title: "Oppose deficit-financed benefit expansions", detail: "One of 20 Republicans to vote against the Social Security Fairness Act, citing its roughly $196 billion deficit cost and the hit to Social Security's solvency.", verdict: "kept", issueKey: "national_debt" }
          ],
          sections: [
            { type: "deepdive", title: "Deep Dive — Lee in the Senate", sources_count: 4, promises: [
              { title: "Public-lands crusade", detail: "The Senate's foremost advocate for state control of federal lands, central to Utah's sovereignty push.", verdict: "pending", sources: [{ label: "U.S. Senate", url: "https://www.lee.senate.gov" }] },
              { title: "Fiscal and constitutional record", detail: "Votes consistently against deficit spending and for originalist judges, shaping the federal courts.", verdict: "kept", sources: [{ label: "U.S. Congress", url: "https://www.congress.gov" }] },
              { title: "Debt reality", detail: "Despite his votes, the national debt has kept rising under both parties.", verdict: "broken" },
              { title: "Laken Riley Act (H.R. 29)", detail: "Joined the bipartisan 64–35 Senate majority to pass the first law of 2025, mandating detention for certain crimes.", verdict: "kept", sources: [{ label: "Congress.gov — H.R. 29", url: "https://www.congress.gov/bill/119th-congress/house-bill/29" }] },
              { title: "Social Security Fairness Act (H.R. 82)", detail: "Was among the 20 Republicans who voted no, arguing the WEP/GPO repeal adds roughly $196 billion to deficits and hastens Social Security's insolvency — a fiscal-hawk stance held even against a popular benefit expansion.", verdict: "kept", sources: [{ label: "Congress.gov — H.R. 82", url: "https://www.congress.gov/bill/118th-congress/house-bill/82" }] }
            ]},
            { type: "info", color: "gold", title: "Why This Matters", text: "Lee is one of two voices Utah has in the U.S. Senate, and his influence over public lands, judicial confirmations, and federal spending reaches far beyond the state. For Utahns who care about who controls the millions of federal acres inside their borders, his decades-long campaign — and whether it ever becomes law — is the issue to watch." }
          ]
        },
        {
          id: "john_curtis",
          name: "John Curtis",
          office: "U.S. Senator",
          state: "Utah",
          party: "Republican",
          district: "Statewide (U.S. Senate)",
          why: "Utah's newest U.S. senator, a pragmatic conservative who built a national profile founding the Conservative Climate Caucus and now holds Mitt Romney's former seat.",
          score: 72, kept: 13, broken: 4, pending: 8, icon: "🦅", tier: "silver",
          keyIssues: ["Conservative Energy & Climate Policy", "Public Lands & Western Issues", "Fiscal Responsibility", "Pragmatic Bipartisan Dealmaking"],
          bio: "John Curtis is Utah's junior U.S. senator, sworn in during January 2025 after winning the seat vacated by Mitt Romney. A former Provo mayor and businessman who once switched parties before being elected to the U.S. House in 2017, he represented Utah's 3rd District for nearly eight years. There he founded the Conservative Climate Caucus, carving out a distinctive lane as a Republican willing to engage on emissions and clean energy while opposing heavy-handed mandates. Pragmatic and business-minded, he is seen as an heir to Utah's tradition of solutions-oriented conservatism and a senator more open to bipartisan dealmaking than many in his party.",
          quote: "Conservatives shouldn't cede the climate conversation. We can lead on clean energy with innovation and markets instead of mandates — and create Western jobs doing it.",
          promises: [
            { title: "Lead a conservative approach to energy and climate", detail: "Founded and grew the Conservative Climate Caucus, pushing innovation- and market-based responses rather than regulation.", verdict: "kept" },
            { title: "Defend Utah's public-lands and Western interests", detail: "Advocates for state and local voice in federal-land decisions and Western energy and water issues.", verdict: "pending" },
            { title: "Work across the aisle on practical legislation", detail: "Built a House record of bipartisan bills and pledges to keep that approach in the Senate, where results are still emerging.", verdict: "pending" },
            { title: "Support American energy production and independence", detail: "Backs expanded domestic energy — including oil, gas, and clean sources — as both economic and security policy.", verdict: "kept" },
            { title: "Speed American LNG exports", detail: "The House passed the Unlocking our Domestic LNG Potential Act (H.R. 1949) to fast-track LNG export approvals — an energy-dominance goal Curtis champions; it now awaits Senate action.", verdict: "pending", issueKey: "energy_production" },
            { title: "Promote fiscal restraint in Washington", detail: "Campaigns on spending discipline, a pledge tested against the realities of a closely divided Senate.", verdict: "pending" },
            { title: "Back border enforcement while urging broader reform", detail: "Voted for the Laken Riley Act, now law, mandating detention for certain crimes, while continuing to call for comprehensive immigration fixes.", verdict: "kept", issueKey: "border_security" }
          ],
          sections: [
            { type: "deepdive", title: "Deep Dive — Curtis from Provo to the Senate", sources_count: 4, promises: [
              { title: "Conservative Climate Caucus", detail: "Created a Republican space to engage on clean energy and emissions without embracing mandates, a signature achievement.", verdict: "kept", sources: [{ label: "U.S. Senate", url: "https://www.curtis.senate.gov" }] },
              { title: "Bipartisan track record", detail: "Brings a House reputation for practical, cross-aisle legislating into a divided Senate.", verdict: "pending", sources: [{ label: "U.S. Congress", url: "https://www.congress.gov" }] },
              { title: "Western energy and lands", detail: "Positions himself as a voice for Utah's energy economy and public-lands stakeholders.", verdict: "pending" },
              { title: "Laken Riley Act (H.R. 29)", detail: "Joined the bipartisan 64–35 Senate majority to pass the first law of 2025, mandating detention of certain unlawfully present immigrants.", verdict: "kept", sources: [{ label: "Congress.gov — H.R. 29", url: "https://www.congress.gov/bill/119th-congress/house-bill/29" }] },
              { title: "Unlocking Domestic LNG Potential Act (H.R. 1949)", detail: "The House-passed bill would strip the Energy Department's approval step and speed LNG exports — aligned with Curtis's all-of-the-above energy push; it now sits in the Senate.", verdict: "pending", sources: [{ label: "Congress.gov — H.R. 1949", url: "https://www.congress.gov/bill/119th-congress/house-bill/1949" }] }
            ]},
            { type: "info", color: "gold", title: "Why This Matters", text: "Curtis fills the seat once held by Mitt Romney and represents a more pragmatic, dealmaking strand of Utah conservatism, so his choices help define how far that tradition survives in today's Republican Party. His distinctive position on energy and climate also makes him a senator to watch on issues where Utah's economy and environment directly collide." }
          ]
        }
      ]
    };

    // Merge the extended catalog into the primary suggestion sets.
    (function mergeBulkExtra() {
      try {
        Object.keys(EXPANSION_BULK_EXTRA).forEach(function(lvl) {
          if (!Array.isArray(EXPANSION_SUGGESTIONS[lvl])) EXPANSION_SUGGESTIONS[lvl] = [];
          var existingIds = {};
          EXPANSION_SUGGESTIONS[lvl].forEach(function(it) { existingIds[it.id] = true; });
          EXPANSION_BULK_EXTRA[lvl].forEach(function(it) {
            if (!existingIds[it.id]) EXPANSION_SUGGESTIONS[lvl].push(it);
          });
        });
      } catch (e) { console.warn('Bulk catalog merge skipped:', e); }
    })();

    var utahFirstNames = ["Spencer", "Brad", "Deidre", "Derek", "Stuart", "Ann", "Nathan", "Aimee", "Mark", "Curt", "Todd", "Jefferson", "Lois", "Genevieve", "Gail", "Lowell", "LaVarr"];
    var utahLastNames = ["Huntsman", "Romney", "Oveson", "Chaffetz", "Love", "McAdams", "Herbert", "Bangerter", "Christofferson", "Sandall", "Manning", "Olsen", "Hughes", "Niederhauser", "Anderegg"];

    var _customSuggestionsMap = {};

    // The DATA HYGIENE layer (window._cleanProfiles / window._dataHygiene) stood
    // here. It is not an admin tool — the public directory and the dashboard
    // counts read through it — so when this file stopped loading for anonymous
    // visitors it moved to /data-hygiene.js, which still loads on every visit.
    // Callers below reach it the same way they always did, through window.


    window.updateExpansionStats = function(options) {
      if (typeof PROFILES === 'undefined') return;
      options = options || {};

      var rows = [];
      Object.keys(PROFILES || {}).forEach(function(id) {
        rows.push({ id: id, p: PROFILES[id] || {} });
      });

      var totalAll = rows.length;
      var utahRows = rows.filter(function(row) {
        return (typeof window._pmIsUtah === 'function') ? window._pmIsUtah(row.p.state) : /(?:^|\s)utah(?:\s|$)|^ut$/i.test(String(row.p.state || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim());
      });

      var targets = { federal: 6, statewide: 5, senate: 29, house: 75, local: 60, cand: 24 };
      var raw = { federal: 0, statewide: 0, senate: 0, house: 0, local: 0, cand: 0 };
      var filled = { federal: 0, statewide: 0, senate: 0, house: 0, local: 0, cand: 0 };
      var candidateSeatKeys = {};
      var localSeatKeys = {};

      function officeText(p) {
        return String((p && p.office) || '') + ' ' + String((p && p.district) || '') + ' ' + String((p && p.title) || '');
      }
      function isCandidate(p) {
        var t = officeText(p) + ' ' + String((p && p.bio) || '') + ' ' + String((p && p.cycle) || '') + ' ' + String((p && p.electionYear) || '');
        return /(?:\b2026\b|candidate|campaign|running\s+for|challenger)/i.test(t);
      }
      function localSeatKey(p, id) {
        var t = officeText(p).toLowerCase().replace(/\s+/g, ' ').trim();
        var county = String((p && (p.county || p.locality || p.city)) || '').toLowerCase().replace(/\s+/g, ' ').trim();
        var name = String((p && p.name) || id || '').toLowerCase().replace(/\s+/g, ' ').trim();
        return (county || 'utah') + '|' + (t || name || id);
      }

      var cov = (typeof window._pmUtahCoverage === 'function') ? window._pmUtahCoverage() : null;
      var chambers = (typeof window.PM_UTAH_CHAMBERS !== 'undefined' ? window.PM_UTAH_CHAMBERS : []);
      if (cov && cov.seats) {
        ['us-house', 'us-senate'].forEach(function(key) {
          var chamber = chambers.filter(function(c) { return c.key === key; })[0];
          var bucket = cov.seats[key];
          if (!bucket || !chamber) return;
          if (chamber.hasDistricts) {
            for (var d = 1; d <= chamber.total; d++) {
              if (bucket.mapped[d] && bucket.mapped[d].length) filled.federal++;
              raw.federal += bucket.mapped[d] ? bucket.mapped[d].length : 0;
            }
            raw.federal += bucket.review ? bucket.review.length : 0;
          } else {
            raw.federal += bucket.unmapped.length + Object.keys(bucket.mapped || {}).length;
            filled.federal += Math.min(raw.federal, chamber.total);
          }
        });

        ['state-senate', 'state-house'].forEach(function(key) {
          var chamber = chambers.filter(function(c) { return c.key === key; })[0];
          var bucket = cov.seats[key];
          var statKey = key === 'state-senate' ? 'senate' : 'house';
          if (!bucket || !chamber) return;
          for (var d = 1; d <= chamber.total; d++) {
            if (bucket.mapped[d] && bucket.mapped[d].length) filled[statKey]++;
            raw[statKey] += bucket.mapped[d] ? bucket.mapped[d].length : 0;
          }
          raw[statKey] += bucket.review ? bucket.review.length : 0;
        });

        if (cov.statewide && typeof window.PM_UTAH_STATEWIDE !== 'undefined') {
          window.PM_UTAH_STATEWIDE.forEach(function(s) {
            var held = (cov.statewide[s.key] || []).length;
            raw.statewide += held;
            if (held) filled.statewide++;
          });
        }
      }

      utahRows.forEach(function(row) {
        var p = row.p;
        var ch = (typeof window._pmUtahChamber === 'function') ? window._pmUtahChamber(p) : null;
        if (isCandidate(p)) {
          raw.cand++;
          candidateSeatKeys[officeText(p).toLowerCase().replace(/\s+/g, ' ').trim() || row.id] = true;
        }
        if (!ch && /County|Mayor|Council|Commission|School\s*Board|City|Sheriff|District\s*Attorney|Clerk|Recorder/i.test(officeText(p))) {
          raw.local++;
          localSeatKeys[localSeatKey(p, row.id)] = true;
        }
      });
      filled.cand = Math.min(Object.keys(candidateSeatKeys).length, targets.cand);
      filled.local = Math.min(Object.keys(localSeatKeys).length, targets.local);

      var coveredTotal = 0, targetTotal = 0;
      Object.keys(targets).forEach(function(k) {
        coveredTotal += Math.min(filled[k], targets[k]);
        targetTotal += targets[k];
      });

      function pctFor(key) {
        return targets[key] ? Math.round((Math.min(filled[key], targets[key]) / targets[key]) * 100) : 0;
      }
      function setBar(key) {
        var pctEl = document.getElementById('stats-cat-' + key + '-pct');
        var barEl = document.getElementById('stats-cat-' + key + '-bar');
        var detailEl = document.getElementById('stats-cat-' + key + '-detail');
        var shown = Math.min(filled[key], targets[key]);
        var pct = pctFor(key);
        if (pctEl) pctEl.textContent = shown + ' / ' + targets[key] + ' (' + pct + '%)';
        if (barEl) {
          barEl.style.width = Math.min(100, pct) + '%';
          barEl.setAttribute('aria-valuenow', String(pct));
        }
        if (detailEl) {
          var seatWord = (key === 'cand') ? 'candidate slots' : 'distinct seats';
          detailEl.textContent = raw[key] + ' live record' + (raw[key] === 1 ? '' : 's') + ' matched, ' + shown + ' ' + seatWord + ' covered';
        }
      }

      var totalAllEl = document.getElementById('stats-total-all');
      if (totalAllEl) totalAllEl.textContent = totalAll.toLocaleString();

      var totalDetailEl = document.getElementById('stats-total-detail');
      if (totalDetailEl) {
        totalDetailEl.textContent = 'Live documents in Firestore politicians collection. Utah-tagged records: ' + utahRows.length.toLocaleString() + '.';
      }

      var utahTotalEl = document.getElementById('stats-utah-total');
      if (utahTotalEl) {
        utahTotalEl.innerHTML = coveredTotal.toLocaleString() + ' <span class="text-sm font-condensed text-steel-400">/ ' + targetTotal.toLocaleString() + '</span>';
      }

      var utahPctEl = document.getElementById('stats-utah-pct');
      var overallPct = targetTotal ? Math.round((coveredTotal / targetTotal) * 100) : 0;
      if (utahPctEl) utahPctEl.textContent = overallPct + '%';

      var overallBarEl = document.getElementById('stats-utah-overall-bar');
      if (overallBarEl) {
        overallBarEl.style.width = Math.min(100, overallPct) + '%';
        overallBarEl.setAttribute('aria-valuenow', String(overallPct));
      }

      var utahDetailEl = document.getElementById('stats-utah-detail');
      if (utahDetailEl) {
        utahDetailEl.textContent = coveredTotal + ' tracked seats/candidate slots from ' + utahRows.length + ' Utah Firestore record' + (utahRows.length === 1 ? '' : 's') + '. Duplicate records do not inflate seat coverage.';
      }

      ['federal', 'statewide', 'senate', 'house', 'local', 'cand'].forEach(setBar);

      var note = document.getElementById('stats-live-note');
      if (note) {
        var stamp = options.refreshedAt || new Date();
        note.textContent = 'Live Firestore counts loaded ' + stamp.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
      }

      window._latestExpansionStats = {
        totalAll: totalAll,
        utahRecords: utahRows.length,
        coveredTotal: coveredTotal,
        targetTotal: targetTotal,
        targets: targets,
        raw: raw,
        filled: filled,
        overallPct: overallPct
      };
    };

    // ──────────────────────────────────────────────────────────────
    // Live dashboard stats — pulled directly from Firebase Firestore.
    //
    // HOW THE COUNTS WORK
    // -------------------
    // On page load every document in the Firestore "politicians" collection is
    // fetched into the global PROFILES object (see the loader at the very top
    // of this file: db.collection("politicians").get()). updateExpansionStats()
    // above then derives every number on the dashboard from that live data set.
    // Total Database Size is the raw collection size. Seat coverage is distinct
    // seats/candidate slots filled, with raw matched records shown separately so
    // duplicate or overlapping records do not inflate coverage percentages.
    //
    // refreshDashboardStats() re-queries Firestore on demand (the "Refresh
    // Stats" button) so the numbers can be brought up to date without a full
    // page reload.
    // ──────────────────────────────────────────────────────────────
    window.refreshDashboardStats = function() {
      var btn = document.getElementById('stats-refresh-btn');
      var label = document.getElementById('stats-refresh-label');
      if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; }
      if (label) label.textContent = 'Refreshing…';

      // Re-fetch the whole collection so totals reflect any additions, edits or
      // removals made in the database since the page first loaded.
      return db.collection("politicians").get().then(function(querySnapshot) {
        var fresh = {};
        querySnapshot.forEach(function(doc) { fresh[doc.id] = doc.data(); });

        // Replace the contents of PROFILES *in place* (same object reference, so
        // every closure that captured PROFILES keeps working) with the fresh
        // snapshot — this also picks up deletions, keeping the counts accurate.
        Object.keys(PROFILES).forEach(function(k) { delete PROFILES[k]; });
        Object.keys(fresh).forEach(function(k) { PROFILES[k] = fresh[k]; });
        // These are complete documents, so mark them full — no lazy re-fetch.
        if (window._pdxFullIds) {
          window._pdxFullIds.clear();
          Object.keys(fresh).forEach(function(k) { window._pdxFullIds.add(k); });
        }

        if (typeof updateExpansionStats === 'function') updateExpansionStats({ refreshedAt: new Date() });
        if (typeof window.pmRenderCoverage === 'function') window.pmRenderCoverage();
        if (typeof window._renderPulseBar === 'function') window._renderPulseBar();

        if (typeof window._showToast === 'function') {
          window._showToast('Stats refreshed from the live database — ' + querySnapshot.size + ' politicians tracked. 🇺🇸');
        }
      }).catch(function(error) {
        console.error("❌ Could not refresh stats from Firestore:", error);
        if (typeof window._showToast === 'function') {
          window._showToast('Could not reach the database to refresh stats. Please try again.');
        }
      }).then(function() {
        if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
        if (label) label.textContent = 'Refresh Stats';
      });
    };

    window.triggerExpansionAISearch = function() {
      var btn = document.getElementById('expansion-trigger-btn');
      var loader = document.getElementById('expansion-loader');
      var idle = document.getElementById('expansion-idle');
      var container = document.getElementById('expansion-results-container');
      var loaderMsg = document.getElementById('expansion-loader-msg');

      btn.disabled = true;
      btn.style.opacity = '0.7';
      btn.innerHTML = '<span>🔍 Scanning Records...</span>';

      idle.classList.add('hidden');
      container.classList.add('hidden');
      loader.classList.remove('hidden');

      var messages = [
        "Analyzing regional campaign registries...",
        "Cross-referencing state election rosters...",
        "Validating missing candidates from public transcripts...",
        "Checking database credentials...",
        "Resolving structural profile templates..."
      ];

      var step = 0;
      var msgInterval = setInterval(function() {
        if (step < messages.length) {
          loaderMsg.textContent = messages[step];
          step++;
        }
      }, 300);

      // Gather existing names to prevent duplicate suggestions
      var existingNames = [];
      if (typeof PROFILES !== 'undefined') {
        existingNames = Object.values(PROFILES).map(function(p) { return p.name; }).filter(Boolean);
      }

      var level = document.getElementById('expansion-level').value;
      var customPrompt = (document.getElementById('expansion-custom-prompt').value || '').trim();

      fetch('/api/expansion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: level,
          customPrompt: customPrompt,
          existingNames: existingNames
        })
      })
      .then(function(res) {
        if (!res.ok) {
          throw new Error('Server returned status ' + res.status);
        }
        return res.json();
      })
      .then(function(data) {
        clearInterval(msgInterval);

        var suggestions = data.suggestions || [];
        // Never strand the user with an empty panel — if the service returns
        // little or nothing, fall back to the on-device discovery engine.
        if (suggestions.length < 3) {
          suggestions = buildExpansionSuggestions(level, customPrompt, suggestions);
        }
        renderExpansionResults(suggestions, level);

        loader.classList.add('hidden');
        container.classList.remove('hidden');

        btn.disabled = false;
        btn.style.opacity = '1';
        btn.innerHTML = '<span>⚡ Trigger AI Search</span>';
      })
      .catch(function(error) {
        clearInterval(msgInterval);
        console.warn("AI Search API unavailable — using the on-device discovery engine instead.", error);

        // Build a generous, duplicate-aware result set entirely client-side.
        // Broad targets return the full catalog (duplicates flagged, not hidden)
        // and a custom prompt heavily steers and pads the batch.
        var suggestions = buildExpansionSuggestions(level, customPrompt);

        renderExpansionResults(suggestions, level);

        if (typeof window._showToast === 'function') {
          if (customPrompt && customPrompt.length > 0) {
            window._showToast('Tailored ' + suggestions.length + ' suggestions to your custom search — review the batch below. 🇺🇸');
          } else {
            window._showToast('Surfaced ' + suggestions.length + ' suggestions — New picks are pre-selected. 🇺🇸');
          }
        }

        loader.classList.add('hidden');
        container.classList.remove('hidden');

        btn.disabled = false;
        btn.style.opacity = '1';
        btn.innerHTML = '<span>⚡ Trigger AI Search</span>';
      });
    };

    window.clearExpansionResults = function() {
      document.getElementById('expansion-results-container').classList.add('hidden');
      document.getElementById('expansion-idle').classList.remove('hidden');
    };

    // ── Duplicate-aware rendering helpers ─────────────────────────
    // Fill the custom prompt box from an example chip.
    window.setExpansionPromptExample = function(text) {
      var ta = document.getElementById('expansion-custom-prompt');
      if (!ta) return;
      ta.value = text;
      ta.focus();
    };

    // Normalize a person's name for duplicate detection: lowercases, strips
    // punctuation, titles, and generational suffixes (Jr/Sr/III), maps common
    // nicknames to their formal form (Mike→Michael, Bob→Robert, …), and drops
    // middle names/initials so only first + last remain. This lets the importer
    // recognize that "Mike Kennedy", "Michael J. Kennedy", and "Michael Kennedy Jr."
    // are the same person. Returns a stable "first last" key.
    var NAME_NICKNAMES = {
      mike:'michael', mikey:'michael', mick:'michael',
      bob:'robert', bobby:'robert', rob:'robert', robbie:'robert',
      bill:'william', billy:'william', will:'william', willie:'william',
      jim:'james', jimmy:'james', jamie:'james',
      dick:'richard', rick:'richard', ricky:'richard', rich:'richard',
      dave:'david', tom:'thomas', tommy:'thomas', tony:'anthony',
      chris:'christopher', joe:'joseph', joey:'joseph',
      dan:'daniel', danny:'daniel', ed:'edward', eddie:'edward', ted:'edward',
      steve:'stephen', steven:'stephen', matt:'matthew',
      nick:'nicholas', sam:'samuel', ben:'benjamin', benji:'benjamin',
      andy:'andrew', drew:'andrew', greg:'gregory', jeff:'jeffrey', jeffery:'jeffrey',
      ken:'kenneth', kenny:'kenneth', larry:'lawrence', ron:'ronald', ronnie:'ronald',
      tim:'timothy', pat:'patrick', fred:'frederick', gabe:'gabriel',
      alex:'alexander', nate:'nathaniel', nathan:'nathaniel',
      charlie:'charles', chuck:'charles', hank:'henry', johnny:'john', jack:'john',
      mitch:'mitchell', brad:'bradley', monty:'montgomery',
      becky:'rebecca', liz:'elizabeth', beth:'elizabeth', betty:'elizabeth',
      kathy:'katherine', kate:'katherine', katie:'katherine', cathy:'catherine',
      maggie:'margaret', peggy:'margaret', sue:'susan', susie:'susan',
      jen:'jennifer', jenny:'jennifer', abby:'abigail', kim:'kimberly',
      deb:'deborah', debbie:'deborah', patty:'patricia', trish:'patricia',
      sandy:'sandra', vicky:'victoria', cindy:'cynthia', jackie:'jacqueline'
    };
    function normalizePoliticianName(name) {
      if (!name) return '';
      var s = String(name).toLowerCase()
        .replace(/[.,'`’]/g, ' ')                                   // drop punctuation/initials dots
        .replace(/\b(jr|sr|ii|iii|iv|md|phd|esq|dr|mr|mrs|ms|rep|sen|gov)\b/g, ' ') // titles & suffixes
        .replace(/\s+/g, ' ').trim();
      var parts = s.split(' ').filter(Boolean);
      if (!parts.length) return '';
      parts[0] = NAME_NICKNAMES[parts[0]] || parts[0];              // canonicalize first name
      var first = parts[0];
      var last = parts.length > 1 ? parts[parts.length - 1] : '';   // drop middle names/initials
      return (first + ' ' + last).trim();
    }

    // True when a politician with this name already exists in the live database.
    function isSuggestionInDb(suggestion) {
      if (typeof PROFILES === 'undefined' || !suggestion || !suggestion.name) return false;
      var target = normalizePoliticianName(suggestion.name);
      if (!target) return false;
      var keys = Object.keys(PROFILES);
      for (var i = 0; i < keys.length; i++) {
        var p = PROFILES[keys[i]];
        if (p && p.name && normalizePoliticianName(p.name) === target) return true;
      }
      return false;
    }

    function setExpansionCountLabel(newCount, dupCount) {
      var el = document.getElementById('expansion-results-count-label');
      if (!el) return;
      var parts = [newCount + ' New'];
      if (dupCount > 0) parts.push(dupCount + ' Potential Duplicate' + (dupCount === 1 ? '' : 's'));
      el.textContent = parts.join(' · ');
    }

    // Recompute the header label from whatever cards are currently in the DOM.
    function refreshExpansionCountLabel() {
      var list = document.getElementById('expansion-results-list');
      if (!list) return;
      var cards = list.querySelectorAll('.expansion-suggestion-card');
      var dup = 0, nw = 0;
      cards.forEach(function(c) { if (c.classList.contains('expansion-dup-card')) dup++; else nw++; });
      setExpansionCountLabel(nw, dup);
    }

    // Friendly, actionable guidance shown above the cards when few/no NEW records turn up.
    function renderExpansionLowResultsNote(newCount, dupCount) {
      if (newCount > 0) return '';
      var headline, body;
      if (dupCount > 0) {
        headline = 'Everything matched existing records';
        body = 'All ' + dupCount + ' result' + (dupCount === 1 ? '' : 's') + ' for this search already appear to be in the database. Turn on <strong class="text-amber-300">“Include potential duplicates”</strong> above to review or re-import them, switch the target level, or use the <strong class="text-gold-300">Custom AI Prompt</strong> on the left to target a more specific group.';
      } else {
        headline = 'No suggestions returned';
        body = 'Try a broader target level, or describe exactly who you want in the <strong class="text-gold-300">Custom AI Prompt</strong> — e.g. <em>“All Utah State House members from Utah County”</em> or <em>“2026 county-commission candidates, all parties.”</em>';
      }
      return '<div class="bg-navy-900/70 border border-gold-500/30 rounded-xl px-4 py-4 mb-1 text-sm font-body text-steel-200 leading-relaxed">' +
        '<p class="font-condensed text-xs font-700 tracking-widest uppercase text-gold-300 mb-1.5">💡 ' + headline + '</p>' +
        '<p>' + body + '</p></div>';
    }

    // Shared renderer for both the API and offline-catalog code paths.
    function renderExpansionResults(suggestions, level) {
      var resultsList = document.getElementById('expansion-results-list');
      if (!resultsList) return;
      suggestions = suggestions || [];

      var newCount = 0, dupCount = 0, cardsHtml = '';
      suggestions.forEach(function(s) {
        _customSuggestionsMap[s.id] = s;
        if (isSuggestionInDb(s)) dupCount++; else newCount++;
        cardsHtml += renderSuggestionCard(s, level, true);
      });

      resultsList.innerHTML = renderExpansionLowResultsNote(newCount, dupCount) + cardsHtml;
      setExpansionCountLabel(newCount, dupCount);

      // Reset bulk-selection UI for the freshly rendered result set.
      var fb = document.getElementById('expansion-bulk-feedback');
      if (fb) fb.classList.add('hidden');
      var selectAll = document.getElementById('expansion-select-all');
      if (selectAll) { selectAll.checked = false; selectAll.indeterminate = false; }
      var showDups = document.getElementById('expansion-show-dups');
      if (showDups && showDups.checked) {
        resultsList.classList.add('show-dups');
      } else {
        resultsList.classList.remove('show-dups');
      }

      // Reveal the results before counting — the selection counter measures
      // visible rows, so the container must be on-screen first.
      var idleEl = document.getElementById('expansion-idle');
      var loaderEl = document.getElementById('expansion-loader');
      var containerEl = document.getElementById('expansion-results-container');
      if (idleEl) idleEl.classList.add('hidden');
      if (loaderEl) loaderEl.classList.add('hidden');
      if (containerEl) containerEl.classList.remove('hidden');

      window.updateExpansionSelectionCount();
    }

    // Toggle visibility of potential-duplicate cards.
    window.toggleExpansionShowDuplicates = function(src) {
      var list = document.getElementById('expansion-results-list');
      if (!list) return;
      var show = !!(src && src.checked);
      if (show) {
        list.classList.add('show-dups');
      } else {
        list.classList.remove('show-dups');
        // Don't keep hidden duplicates selected for import.
        document.querySelectorAll('.expansion-select-checkbox[data-dup="1"]').forEach(function(cb) { cb.checked = false; });
      }
      window.updateExpansionSelectionCount();
    };

    // ── Bulk selection + bulk import helpers ──────────────────────
    window.updateExpansionSelectionCount = function() {
      var boxes = document.querySelectorAll('.expansion-select-checkbox');
      var total = 0;
      var selected = 0;
      boxes.forEach(function(b) {
        // Only count rows the user can actually see and act on.
        if (b.offsetParent === null) return;
        total++;
        if (b.checked) selected++;
      });

      var counter = document.getElementById('expansion-selection-counter');
      if (counter) {
        counter.textContent = selected + ' selected out of ' + total + ' shown';
      }

      var bulkBtn = document.getElementById('expansion-bulk-import-btn');
      var bulkLabel = document.getElementById('expansion-bulk-import-label');
      if (bulkBtn) {
        bulkBtn.disabled = selected === 0;
        bulkBtn.style.opacity = selected === 0 ? '0.5' : '1';
      }
      if (bulkLabel) {
        bulkLabel.textContent = selected > 0 ? ('📥 Import Selected (' + selected + ')') : '📥 Import Selected to Database';
      }

      var selectAll = document.getElementById('expansion-select-all');
      if (selectAll) {
        selectAll.checked = total > 0 && selected === total;
        selectAll.indeterminate = selected > 0 && selected < total;
      }
    };

    window.toggleExpansionSelectAll = function(source) {
      var check = source ? !!source.checked : true;
      document.querySelectorAll('.expansion-select-checkbox').forEach(function(b) {
        // Only toggle visible rows so hidden duplicates aren't silently queued.
        if (b.offsetParent === null) return;
        b.checked = check;
      });
      window.updateExpansionSelectionCount();
    };

    // Build a Firestore-ready record from a raw suggestion object.
    function buildExpansionImportData(pData) {
      var data = {
        name: pData.name,
        office: pData.office,
        state: pData.state || "Utah",
        party: pData.party,
        score: pData.score !== undefined ? pData.score : null,
        kept: pData.kept !== undefined ? pData.kept : 0,
        broken: pData.broken !== undefined ? pData.broken : 0,
        pending: pData.pending !== undefined ? pData.pending : 0,
        icon: pData.icon || "🏛",
        tier: pData.tier || "gray",
        keyIssues: pData.keyIssues || [],
        bio: pData.bio || '',
        photo: pData.photo || '',
        district: pData.district || '',
        quote: pData.quote || '',
        promises: pData.promises || [],
        sections: pData.sections || [],
        nextElection: pData.nextElection || '',
        electionLabel: pData.electionLabel || ''
      };
      data.stances = pData.stances || {
        border: 'Stance on border security',
        debt: 'Stance on debt and fiscal policy',
        gun: 'Stance on gun rights and safety legislation',
        termLimits: 'Stance on legislative term limits',
        campaign: 'Stance on campaign finance reform',
        dataCenters: 'No stated position',
        healthcare: 'Stance on healthcare policies',
        audit: 'Stance on Federal Reserve audit bills'
      };
      return data;
    }

    // Locate a suggestion's raw data by id (live search results first, then catalog).
    function lookupSuggestionById(id) {
      if (_customSuggestionsMap[id]) return _customSuggestionsMap[id];
      var levels = Object.keys(EXPANSION_SUGGESTIONS);
      for (var i = 0; i < levels.length; i++) {
        var found = (EXPANSION_SUGGESTIONS[levels[i]] || []).find(function(it) { return it.id === id; });
        if (found) return found;
      }
      return null;
    }

    function renderExpansionBulkFeedback(importedCount, skipped, isError, dupCount) {
      var fb = document.getElementById('expansion-bulk-feedback');
      if (!fb) return;
      fb.classList.remove('hidden');
      dupCount = dupCount || 0;

      if (isError) {
        fb.className = 'text-sm font-body rounded-xl px-4 py-3 border bg-red-950/50 border-red-500/40 text-red-300';
        fb.innerHTML = '❌ ' + isError;
        return;
      }

      var skippedCount = skipped.length;
      var tone = importedCount > 0
        ? 'bg-green-950/50 border-green-500/40 text-green-300'
        : 'bg-amber-950/50 border-amber-500/40 text-amber-300';
      fb.className = 'text-sm font-body rounded-xl px-4 py-3 border ' + tone;

      var msg = '<strong>' + (importedCount > 0 ? '✓ ' : '⚠️ ') +
        'Successfully imported ' + importedCount + ' politician' + (importedCount === 1 ? '' : 's') + '.</strong>';
      if (dupCount > 0) {
        msg += ' <span class="text-amber-300">' + dupCount + ' potential duplicate' + (dupCount === 1 ? '' : 's') + ' updated/overwritten.</span>';
      }
      if (skippedCount > 0) {
        msg += ' ' + skippedCount + ' skipped.';
        var names = skipped.map(function(s) { return s.name + ' — ' + s.reason; });
        msg += '<div class="mt-2 text-xs text-steel-300 leading-relaxed"><span class="uppercase tracking-widest text-steel-400 font-condensed">Skipped:</span> ' +
          names.join('; ') + '</div>';
      }
      fb.innerHTML = msg;
    }

    window.bulkImportSelectedPoliticians = function() {
      var checked = Array.prototype.slice.call(document.querySelectorAll('.expansion-select-checkbox:checked'));
      if (!checked.length) return;

      var bulkBtn = document.getElementById('expansion-bulk-import-btn');
      var bulkLabel = document.getElementById('expansion-bulk-import-label');

      // Build duplicate-detection sets from existing Firestore-backed profiles.
      var existingNames = {};
      var existingIds = {};
      if (typeof PROFILES !== 'undefined') {
        Object.keys(PROFILES).forEach(function(k) {
          existingIds[k] = true;
          if (PROFILES[k] && PROFILES[k].name) {
            existingNames[normalizePoliticianName(PROFILES[k].name)] = true;
          }
        });
      }

      var toImport = [];
      var skipped = [];
      var seenInBatch = {};
      var dupSelected = 0;

      checked.forEach(function(box) {
        var id = box.getAttribute('data-id');
        var pData = lookupSuggestionById(id);
        if (!pData) { skipped.push({ name: id, reason: 'data not found' }); return; }

        var nameKey = normalizePoliticianName(pData.name);
        var cleanId = (pData.name || id).toLowerCase().replace(/[^a-z0-9]+/g, '_') || id;

        if (seenInBatch[cleanId]) {
          skipped.push({ name: pData.name, reason: 'duplicate in selection' });
          return;
        }
        seenInBatch[cleanId] = true;

        // Potential duplicates are allowed through (the user opted in) but counted
        // so we can warn before overwriting any records that already exist.
        var isDup = box.getAttribute('data-dup') === '1' || !!existingNames[nameKey] || !!existingIds[cleanId];
        if (isDup) dupSelected++;
        toImport.push({ id: id, cleanId: cleanId, data: buildExpansionImportData(pData), isDup: isDup });
      });

      if (!toImport.length) {
        renderExpansionBulkFeedback(0, skipped, false, 0);
        return;
      }

      // Warn once before overwriting/updating records that already exist.
      if (dupSelected > 0) {
        var proceed = window.confirm(dupSelected + ' of the selected politician' + (dupSelected === 1 ? '' : 's') +
          ' may already exist in the database and will be overwritten/updated. Import anyway?');
        if (!proceed) {
          if (bulkBtn) { bulkBtn.disabled = false; bulkBtn.style.opacity = '1'; }
          if (bulkLabel) { bulkLabel.textContent = '📥 Import Selected to Database'; }
          return;
        }
      }

      if (bulkBtn) { bulkBtn.disabled = true; bulkBtn.style.opacity = '0.7'; }
      if (bulkLabel) { bulkLabel.textContent = '⏳ Importing ' + toImport.length + '...'; }

      // Single atomic Firestore batch write for all selected politicians.
      var batch = db.batch();
      toImport.forEach(function(item) {
        batch.set(db.collection("politicians").doc(item.cleanId), item.data);
      });

      batch.commit().then(function() {
        toImport.forEach(function(item) {
          PROFILES[item.cleanId] = item.data;
          if (typeof CMP_DATA !== 'undefined') { CMP_DATA[item.cleanId] = item.data; }
          var card = document.getElementById('card-' + item.id);
          if (card) { card.parentNode && card.parentNode.removeChild(card); }
        });

        if (typeof _populateDirData === 'function') { _populateDirData(); }
        window.updateExpansionStats();

        // Refresh the header label and selection counter from the remaining cards.
        refreshExpansionCountLabel();
        window.updateExpansionSelectionCount();

        renderExpansionBulkFeedback(toImport.length, skipped, false, dupSelected);

        if (typeof window._showToast === 'function') {
          window._showToast('Bulk import complete — added ' + toImport.length + ' politician' + (toImport.length === 1 ? '' : 's') + '! 🇺🇸');
        }

        if (bulkLabel) { bulkLabel.textContent = '📥 Import Selected to Database'; }
        if (bulkBtn) { bulkBtn.style.opacity = '1'; }
      }).catch(function(error) {
        console.error("Bulk import failed:", error);
        renderExpansionBulkFeedback(0, skipped, 'Bulk import failed: ' + (error && error.message ? error.message : 'unknown error'));
        if (bulkBtn) { bulkBtn.disabled = false; bulkBtn.style.opacity = '1'; }
        if (bulkLabel) { bulkLabel.textContent = '📥 Import Selected to Database'; }
      });
    };

    window.toggleEditForm = function(id) {
      var form = document.getElementById('edit-form-' + id);
      if (form) {
        form.classList.toggle('hidden');
      }
    };

    window.importSuggestedPolitician = function(id, level, isCustom) {
      var btn = document.getElementById('import-btn-' + id);
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `
          <svg class="w-3.5 h-3.5 animate-spin flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" fill="none" stroke="rgba(255,255,255,0.15)"/>
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 2v4m0 16v-4m10-10h-4M4 12H2"/>
          </svg>
          Importing...
        `;
      }

      var name = document.getElementById('edit-name-' + id)?.value || '';
      var party = document.getElementById('edit-party-' + id)?.value || 'R';
      var office = document.getElementById('edit-office-' + id)?.value || '';
      var scoreVal = document.getElementById('edit-score-' + id)?.value;
      var score = scoreVal !== "" ? parseInt(scoreVal, 10) : null;
      var bio = document.getElementById('edit-bio-' + id)?.value || '';

      var pData = null;
      if (isCustom) {
        pData = _customSuggestionsMap[id];
      } else {
        var list = EXPANSION_SUGGESTIONS[level] || [];
        pData = list.find(function(item) { return item.id === id; });
      }

      if (!pData) {
        console.error("Suggestion not found:", id);
        return;
      }

      var cleanId = (name || pData.name).toLowerCase().replace(/[^a-z0-9]+/g, '_') || id;

      var importData = {
        name: name || pData.name,
        office: office || pData.office,
        state: pData.state || "Utah",
        party: party || pData.party,
        score: isNaN(score) ? (pData.score !== undefined ? pData.score : null) : score,
        kept: pData.kept !== undefined ? pData.kept : 0,
        broken: pData.broken !== undefined ? pData.broken : 0,
        pending: pData.pending !== undefined ? pData.pending : 0,
        icon: pData.icon || "🏛",
        tier: pData.tier || "gray",
        keyIssues: pData.keyIssues || [],
        bio: bio || pData.bio || '',
        photo: pData.photo || '',
        district: pData.district || '',
        quote: pData.quote || '',
        promises: pData.promises || [],
        sections: pData.sections || [],
        nextElection: pData.nextElection || '',
        electionLabel: pData.electionLabel || ''
      };

      importData.stances = pData.stances || {
        border: 'Stance on border security',
        debt: 'Stance on debt and fiscal policy',
        gun: 'Stance on gun rights and safety legislation',
        termLimits: 'Stance on legislative term limits',
        campaign: 'Stance on campaign finance reform',
        dataCenters: 'No stated position',
        healthcare: 'Stance on healthcare policies',
        audit: 'Stance on Federal Reserve audit bills'
      };

      db.collection("politicians").doc(cleanId).set(importData).then(function() {
        console.log("Successfully imported politician doc:", cleanId);
        
        PROFILES[cleanId] = importData;
        if (typeof CMP_DATA !== 'undefined') {
          CMP_DATA[cleanId] = importData;
        }

        if (typeof _populateDirData === 'function') {
          _populateDirData();
        }

        window.updateExpansionStats();

        if (btn) {
          btn.innerHTML = `✓ Added`;
          btn.className = "w-full md:w-auto font-condensed font-700 text-xs tracking-widest uppercase px-4 py-2.5 rounded-lg border text-green-400 bg-green-950/40 border-green-500/50 flex items-center justify-center gap-1.5 min-h-[40px]";
          btn.disabled = true;
        }

        var editForm = document.getElementById('edit-form-' + id);
        if (editForm) {
          editForm.classList.add('hidden');
        }

        var editToggle = document.getElementById('edit-toggle-' + id);
        if (editToggle) {
          editToggle.classList.add('hidden');
        }

        if (typeof window._showToast === 'function') {
          window._showToast(`Successfully added ${importData.name} to Firestore! 🇺🇸`);
        } else {
          alert(`Successfully added ${importData.name} to Firestore! 🇺🇸`);
        }

        // Animate and remove suggested card from results list
        var card = document.getElementById('card-' + id);
        if (card) {
          card.style.opacity = '0';
          card.style.transform = 'translateY(10px)';
          card.style.transition = 'all 0.4s ease';
          setTimeout(function() {
            card.remove();

            // Dynamically update count label from remaining suggestion cards.
            var resultsList = document.getElementById('expansion-results-list');
            var remaining = resultsList ? resultsList.querySelectorAll('.expansion-suggestion-card').length : 0;
            refreshExpansionCountLabel();
            if (remaining === 0) {
              clearExpansionResults();
            }
            if (typeof window.updateExpansionSelectionCount === 'function') {
              window.updateExpansionSelectionCount();
            }
          }, 400);
        }

      }).catch(function(error) {
        console.error("Error writing politician to Firestore:", error);
        if (btn) {
          btn.innerHTML = `❌ Error`;
          btn.disabled = false;
        }
        alert("Error adding politician to Firestore: " + error.message);
      });
    };

    function renderSuggestionCard(suggestion, level, isCustom) {
      var partyColor = suggestion.party === "Republican" ? "bg-red-900/40 text-red-400 border border-red-500/30" :
                         suggestion.party === "Democrat" ? "bg-blue-900/40 text-blue-400 border border-blue-500/30" :
                         "bg-amber-900/40 text-amber-400 border border-amber-500/30";

      var isAlreadyInDb = isSuggestionInDb(suggestion);

      // Status badge — clearly mark New vs Potential Duplicate.
      var statusBadge = isAlreadyInDb ?
        `<span class="font-condensed text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-900/50 text-amber-300 border border-amber-500/40" title="A politician with this name already appears in the database">⚠ Potential Duplicate</span>` :
        `<span class="font-condensed text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-green-900/40 text-green-300 border border-green-500/40">✦ New</span>`;

      // Duplicates stay actionable — flagged, selectable, and importable with a warning.
      var btnHtml = isAlreadyInDb ?
        `<button id="import-btn-${suggestion.id}" onclick="importSuggestedPolitician('${suggestion.id}', '${level}', ${isCustom})" class="w-full md:w-auto font-condensed font-700 text-xs tracking-widest uppercase px-4 py-2.5 rounded-lg bg-amber-900/50 hover:bg-amber-800/70 border border-amber-500/40 hover:border-amber-400/70 text-amber-100 transition-all shadow-md flex items-center justify-center gap-1.5 min-h-[40px]" style="white-space:nowrap;" title="May overwrite an existing record">
          📥 Import Anyway
        </button>` :
        `<button id="import-btn-${suggestion.id}" onclick="importSuggestedPolitician('${suggestion.id}', '${level}', ${isCustom})" class="w-full md:w-auto font-condensed font-700 text-xs tracking-widest uppercase px-4 py-2.5 rounded-lg bg-blue-900/60 hover:bg-blue-800/80 border border-blue-500/40 hover:border-blue-400/70 text-white transition-all shadow-md flex items-center justify-center gap-1.5 min-h-[40px]" style="white-space:nowrap;">
          📥 Import to Database
        </button>`;

      var editToggleHtml =
        `<button id="edit-toggle-${suggestion.id}" onclick="toggleEditForm('${suggestion.id}')" class="text-xs text-steel-400 hover:text-gold-400 transition-colors font-semibold flex items-center gap-1">
          ✏️ Edit Details
        </button>`;

      var checkboxHtml =
        `<label class="flex-shrink-0 mt-1 cursor-pointer" title="${isAlreadyInDb ? 'Potential duplicate — select to import anyway' : 'Select for bulk import'}">
          <input type="checkbox" data-id="${suggestion.id}"${isAlreadyInDb ? ' data-dup="1"' : ''} class="expansion-select-checkbox w-5 h-5 rounded border-2 ${isAlreadyInDb ? 'border-amber-500/60 accent-amber-500' : 'border-steel-500 accent-crimson-500'} bg-navy-950 cursor-pointer"${isAlreadyInDb ? '' : ' checked'} onchange="updateExpansionSelectionCount()">
        </label>`;

      return `
        <div id="card-${suggestion.id}" class="expansion-suggestion-card ${isAlreadyInDb ? 'expansion-dup-card border-amber-500/30' : 'border-white/10'} bg-navy-900/90 border rounded-2xl p-5 space-y-4 hover:border-white/20 transition-all">
          <div class="flex items-start gap-3">
            ${checkboxHtml}
            <div class="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div class="space-y-1">
                <div class="flex items-center gap-2.5 flex-wrap">
                  <span class="text-2xl">${suggestion.icon || '🏛'}</span>
                  <h4 class="font-display text-xl tracking-wider text-white">${suggestion.name}</h4>
                  <span class="font-condensed text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${partyColor}">
                    ${suggestion.party}
                  </span>
                  <span class="text-xs text-steel-300 font-semibold uppercase font-condensed tracking-wider bg-navy-800/80 px-2.5 py-0.5 rounded border border-white/5">
                    ${suggestion.office}
                  </span>
                  ${statusBadge}
                </div>
                <p class="text-xs text-steel-400 font-body">
                  📍 District / Location: <span class="text-white font-medium">${suggestion.district || 'Not specified'}</span>
                </p>
              </div>
              <div class="flex items-center gap-3">
                ${editToggleHtml}
                ${btnHtml}
              </div>
            </div>
          </div>

          <div class="text-xs text-steel-300 font-body leading-relaxed bg-navy-950/60 p-4 rounded-xl border border-white/5 relative">
            <strong class="text-gold-400 font-condensed text-xs tracking-wider uppercase block mb-1">AI Recommendation Context:</strong>
            ${suggestion.why ? suggestion.why : '<span class="text-steel-500 italic">No additional context provided.</span>'}
          </div>

          <!-- Collapsible Edit Form -->
          <div id="edit-form-${suggestion.id}" class="hidden bg-navy-950/80 border border-white/10 rounded-xl p-4 space-y-4 font-body">
            <h5 class="font-condensed text-xs font-bold text-gold-400 tracking-wider uppercase border-b border-white/10 pb-1">Edit Politician Profile Before Import</h5>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-[10px] font-bold text-steel-400 uppercase mb-1">Name</label>
                <input type="text" id="edit-name-${suggestion.id}" value="${suggestion.name}" class="w-full bg-navy-900 border border-white/10 rounded-lg p-2 text-xs text-white focus:border-gold-400 focus:outline-none">
              </div>
              <div>
                <label class="block text-[10px] font-bold text-steel-400 uppercase mb-1">Party</label>
                <select id="edit-party-${suggestion.id}" class="w-full bg-navy-900 border border-white/10 rounded-lg p-2 text-xs text-white focus:border-gold-400 focus:outline-none">
                  <option value="Republican" ${suggestion.party === 'Republican' ? 'selected' : ''}>Republican</option>
                  <option value="Democrat" ${suggestion.party === 'Democrat' ? 'selected' : ''}>Democrat</option>
                  <option value="Independent" ${suggestion.party === 'Independent' ? 'selected' : ''}>Independent</option>
                </select>
              </div>
              <div>
                <label class="block text-[10px] font-bold text-steel-400 uppercase mb-1">Office</label>
                <input type="text" id="edit-office-${suggestion.id}" value="${suggestion.office}" class="w-full bg-navy-900 border border-white/10 rounded-lg p-2 text-xs text-white focus:border-gold-400 focus:outline-none">
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-[10px] font-bold text-steel-400 uppercase mb-1">Initial Promise Score (0-100)</label>
                <input type="number" id="edit-score-${suggestion.id}" value="${suggestion.score || 70}" min="0" max="100" class="w-full bg-navy-900 border border-white/10 rounded-lg p-2 text-xs text-white focus:border-gold-400 focus:outline-none">
              </div>
              <div class="md:col-span-2">
                <label class="block text-[10px] font-bold text-steel-400 uppercase mb-1">Bio Description</label>
                <textarea id="edit-bio-${suggestion.id}" class="w-full bg-navy-900 border border-white/10 rounded-lg p-2 text-xs text-white focus:border-gold-400 focus:outline-none h-10">${suggestion.bio || ''}</textarea>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // ── Custom-prompt understanding ───────────────────────────────
    // Break a free-text prompt into meaningful search tokens (drops filler
    // words) so we can rank catalog entries by how well they match.
    var EXPANSION_STOPWORDS = { 'the':1,'and':1,'all':1,'any':1,'for':1,'with':1,'from':1,'who':1,'that':1,'our':1,'are':1,'his':1,'her':1,'their':1,'including':1,'include':1,'plus':1,'find':1,'show':1,'list':1,'get':1,'add':1,'every':1,'each':1,'utah':1,'state':1,'candidate':1,'candidates':1,'office':1,'official':1,'officials':1,'politician':1,'politicians':1,'member':1,'members':1 };
    function tokenizeExpansionPrompt(text) {
      return (text || '').toLowerCase().split(/[^a-z0-9]+/)
        .filter(function(t) { return t.length > 2 && !EXPANSION_STOPWORDS[t]; });
    }

    // Score how strongly a catalog suggestion matches the prompt tokens.
    function scoreExpansionRelevance(suggestion, tokens) {
      if (!tokens.length) return 0;
      var hay = [suggestion.name, suggestion.office, suggestion.party, suggestion.district,
        suggestion.why, suggestion.bio, (suggestion.keyIssues || []).join(' ')]
        .join(' ').toLowerCase();
      var score = 0;
      tokens.forEach(function(t) { if (hay.indexOf(t) !== -1) score++; });
      // Boost on the most user-facing fields.
      var head = ((suggestion.office || '') + ' ' + (suggestion.district || '') + ' ' + (suggestion.party || '')).toLowerCase();
      tokens.forEach(function(t) { if (head.indexOf(t) !== -1) score += 0.5; });
      return score;
    }

    // Build a single tailored candidate. `seed` keeps batches distinct without
    // relying on randomness alone; `level` aligns the office with the target.
    function generateCustomCandidate(promptText, seed, level) {
      seed = seed || 0;
      var normalized = (promptText || '').toLowerCase();

      var party = "Republican";
      if (normalized.includes("democrat") || normalized.includes("progressive") || normalized.includes("liberal") || normalized.includes("left")) {
        party = "Democrat";
      } else if (normalized.includes("independent") || normalized.includes("libertarian") || normalized.includes("constitution")) {
        party = "Independent";
      }
      // "all parties" / "both parties" / "bipartisan" → alternate across the batch.
      if (normalized.includes("all part") || normalized.includes("both part") || normalized.includes("bipartisan") || normalized.includes("every part")) {
        party = ["Republican", "Democrat", "Independent"][seed % 3];
      }

      var isCandidateLevel = (level === 'utah-cand-2026') || normalized.includes('2026') || normalized.includes('candidate');
      var office = isCandidateLevel ? "Candidate for State Legislature" : "State Representative";
      if (normalized.includes("senat")) {
        office = isCandidateLevel ? "Candidate for State Senate" : "State Senator";
      } else if (normalized.includes("governor")) {
        office = "Candidate for Governor";
      } else if (normalized.includes("mayor")) {
        office = "Mayor";
      } else if (normalized.includes("commissioner") || normalized.includes("commission")) {
        office = "County Commissioner";
      } else if (normalized.includes("congress") || normalized.includes("u.s. house") || normalized.includes("federal")) {
        office = "Candidate for Congress";
      } else if (normalized.includes("school board") || normalized.includes("board")) {
        office = "School Board Candidate";
      } else if (!isCandidateLevel && (normalized.includes("house") || normalized.includes("representative"))) {
        office = "State Representative";
      }

      var district = "Utah State";
      if (normalized.includes("salt lake") || normalized.includes("slc")) {
        district = "Salt Lake County";
      } else if (normalized.includes("provo") || normalized.includes("utah county")) {
        district = "Utah County";
      } else if (normalized.includes("davis")) {
        district = "Davis County";
      } else if (normalized.includes("weber") || normalized.includes("ogden")) {
        district = "Weber County";
      } else if (normalized.includes("st. george") || normalized.includes("st george") || normalized.includes("washington")) {
        district = "Washington County";
      } else if (normalized.includes("cache") || normalized.includes("logan")) {
        district = "Cache County";
      } else if (normalized.includes("summit") || normalized.includes("park city")) {
        district = "Summit County";
      }

      // Deterministic-but-varied names so a batch never collides on itself.
      var first = utahFirstNames[(seed * 5 + 2) % utahFirstNames.length];
      var last = utahLastNames[(seed * 3 + 1) % utahLastNames.length];
      var name = first + " " + last;
      var id = "custom_" + seed + "_" + name.toLowerCase().replace(/[^a-z0-9]+/g, "_");
      var icon = isCandidateLevel ? "🗳️" : "🏛";

      var keyIssues = ["Budget & Fiscal Reform", "Water Management", "Term Limits"];
      if (party === "Democrat") {
        keyIssues = ["Public Education Funding", "Air Quality", "Affordable Housing"];
      } else if (party === "Independent") {
        keyIssues = ["Government Transparency", "Term Limits", "Campaign Finance Reform"];
      }

      var promptSnippet = (promptText || '').trim();
      var why = promptSnippet
        ? 'Surfaced to match your custom search: "' + promptSnippet + '". ' + party + ' contender for ' + office.toLowerCase() + ' in ' + district + ', active on regional issues and platform transparency.'
        : 'Active ' + party + ' figure for ' + office.toLowerCase() + ' in ' + district + ', surfaced to broaden PolitiDex coverage.';
      var bio = name + " is an active community advocate running for " + office.toLowerCase() + " to represent " + district + ".";

      return {
        id: id,
        name: name,
        office: office,
        state: "Utah",
        party: party,
        district: district,
        why: why,
        score: 72 + (seed % 6), kept: 5, broken: 1, pending: 7, icon: icon, tier: "gray",
        keyIssues: keyIssues,
        bio: bio,
        photo: ""
      };
    }

    // Generate a batch of distinct tailored candidates for a prompt/level.
    // `seedStart` offsets the seed space so separate batches never collide.
    function generateCustomCandidateBatch(promptText, count, level, seedStart) {
      count = Math.max(0, count || 0);
      var out = [], usedNames = {}, seed = seedStart || 0, guard = 0;
      while (out.length < count && guard < count * 8 + 12) {
        var cand = generateCustomCandidate(promptText, seed, level);
        seed++; guard++;
        if (usedNames[cand.name]) continue;
        usedNames[cand.name] = true;
        out.push(cand);
      }
      return out;
    }

    // Orchestrator: assemble a generous, duplicate-aware suggestion set.
    //  • Broad targets return the whole catalog (duplicates flagged, not hidden).
    //  • A custom prompt re-ranks the catalog and prepends tailored matches.
    //  • Thin result sets are padded so a search never defaults to zero New picks.
    function buildExpansionSuggestions(level, customPrompt, seedResults) {
      customPrompt = (customPrompt || '').trim();
      var base = Array.isArray(seedResults) && seedResults.length
        ? seedResults
        : (EXPANSION_SUGGESTIONS[level] || []);
      var suggestions = JSON.parse(JSON.stringify(base));

      if (customPrompt) {
        // Rank existing catalog entries by relevance so matches surface first.
        var tokens = tokenizeExpansionPrompt(customPrompt);
        suggestions.forEach(function(s) { s._rel = scoreExpansionRelevance(s, tokens); });
        suggestions.sort(function(a, b) { return (b._rel || 0) - (a._rel || 0); });
        suggestions.forEach(function(s) { delete s._rel; });

        // Prepend several freshly tailored candidates so the prompt dominates.
        var tailored = generateCustomCandidateBatch(customPrompt, 4, level);
        suggestions = tailored.concat(suggestions);
      }

      // De-dupe by id within the working set.
      var seen = {}, deduped = [];
      suggestions.forEach(function(s) { if (s && !seen[s.id]) { seen[s.id] = true; deduped.push(s); } });
      suggestions = deduped;

      // Guarantee a useful number of NEW (not-already-in-DB) picks so broad
      // categories return results instead of an all-duplicates dead end.
      var MIN_NEW = customPrompt ? 5 : 6;
      var newCount = suggestions.filter(function(s) { return !isSuggestionInDb(s); }).length;
      if (newCount < MIN_NEW) {
        var promptForPad = customPrompt || (level === 'utah-cand-2026' ? '2026 Utah candidates' : 'Utah state legislators');
        var padded = generateCustomCandidateBatch(promptForPad, (MIN_NEW - newCount) + 3, level, 50)
          .filter(function(s) { return !seen[s.id] && !isSuggestionInDb(s); });
        suggestions = suggestions.concat(padded.slice(0, MIN_NEW - newCount));
      }

      return suggestions;
    }

    // ── Paste-a-List importer ─────────────────────────────────────
    // Parse a user-pasted list of politicians (plain names, or structured
    // "Name | District | Office | County | Party" rows) into suggestion
    // objects, then route them through the same duplicate-aware renderer
    // the AI search uses — so New/Potential-Duplicate tagging, multi-select,
    // and batch import all work identically for pasted entries.

    function normalizeExpansionParty(raw) {
      var v = (raw || '').toLowerCase().trim();
      if (!v) return '';
      if (v === 'r' || v.indexOf('rep') === 0 || v.indexOf('gop') !== -1) return 'Republican';
      if (v === 'd' || v.indexOf('dem') === 0) return 'Democrat';
      if (v === 'i' || v.indexOf('ind') === 0 || v.indexOf('lib') === 0 || v.indexOf('const') === 0 || v.indexOf('green') === 0) return 'Independent';
      // Already a full, capitalized party name.
      return raw.trim().charAt(0).toUpperCase() + raw.trim().slice(1);
    }

    // Turn one pasted line into a suggestion object (or null if unusable).
    function parseExpansionListLine(line, index, level) {
      // Drop common list decorations: "1. ", "- ", "* ", "• ", numbering.
      var clean = (line || '').replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '').trim();
      if (!clean) return null;

      var name = '', district = '', office = '', county = '', party = '';
      // Structured rows use "|" or tab delimiters; commas are left alone so
      // names like "Smith, Jr." aren't split apart.
      var delim = clean.indexOf('|') !== -1 ? '|' : (clean.indexOf('\t') !== -1 ? '\t' : null);

      if (delim) {
        var parts = clean.split(delim).map(function(p) { return p.trim(); });
        name = parts[0] || '';
        district = parts[1] || '';
        office = parts[2] || '';
        county = parts[3] || '';
        party = parts[4] || '';
      } else {
        name = clean;
      }

      if (!name) return null;

      var isCandidateLevel = (level === 'utah-cand-2026') || /candidate|2026/i.test(office);
      if (!office) office = isCandidateLevel ? 'Candidate (Utah)' : 'State Legislator (Utah)';
      var locality = district || county || 'Utah';
      if (district && county && district.indexOf(county) === -1) locality = district + ' (' + county + ')';

      var normalizedParty = normalizeExpansionParty(party) || 'Independent';
      var icon = isCandidateLevel ? '🗳️' : '🏛';

      var id = 'pasted_' + index + '_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_');

      return {
        id: id,
        name: name,
        office: office,
        state: 'Utah',
        party: normalizedParty,
        district: locality,
        why: 'Added from a pasted list. Office: ' + office + (locality ? ' · ' + locality : '') + '. Review the details and import to PolitiDex.',
        score: null, kept: 0, broken: 0, pending: 0,
        icon: icon, tier: 'gray',
        keyIssues: [],
        bio: name + (office ? ' — ' + office : '') + (locality ? ', ' + locality : '') + '.',
        photo: ''
      };
    }

    window.processPastedExpansionList = function() {
      var ta = document.getElementById('expansion-paste-list');
      var hint = document.getElementById('expansion-paste-hint');
      var btn = document.getElementById('expansion-process-list-btn');
      if (!ta) return;

      var raw = ta.value || '';
      var lines = raw.split(/\r?\n/);
      var level = document.getElementById('expansion-level').value;

      var parsed = [], usedIds = {};
      lines.forEach(function(line, i) {
        var item = parseExpansionListLine(line, i, level);
        if (!item) return;
        // Keep ids unique even if two pasted rows share a name.
        var baseId = item.id, n = 2;
        while (usedIds[item.id]) { item.id = baseId + '_' + n; n++; }
        usedIds[item.id] = true;
        parsed.push(item);
      });

      if (!parsed.length) {
        if (hint) {
          hint.textContent = 'Nothing to process — paste at least one name first.';
          hint.className = 'text-[10px] uppercase tracking-widest font-condensed text-amber-300';
        }
        return;
      }

      // Brief processing feedback so the duplicate check feels responsive.
      if (btn) { btn.disabled = true; btn.style.opacity = '0.7'; btn.innerHTML = '<span>⏳ Checking ' + parsed.length + ' against database...</span>'; }

      setTimeout(function() {
        // Reuse the AI-search renderer: it tags New vs Potential Duplicate,
        // resets the bulk toolbar, and reveals the results panel.
        renderExpansionResults(parsed, level);

        // Auto-reveal duplicates so the user immediately sees flagged matches.
        var newCount = parsed.filter(function(s) { return !isSuggestionInDb(s); }).length;
        var dupCount = parsed.length - newCount;
        var showDups = document.getElementById('expansion-show-dups');
        var list = document.getElementById('expansion-results-list');
        if (dupCount > 0 && showDups && list) {
          showDups.checked = true;
          list.classList.add('show-dups');
          window.updateExpansionSelectionCount();
        }

        if (hint) {
          hint.textContent = 'Processed ' + parsed.length + ' · ' + newCount + ' new · ' + dupCount + ' possible duplicate' + (dupCount === 1 ? '' : 's');
          hint.className = 'text-[10px] uppercase tracking-widest font-condensed text-blue-200';
        }
        if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.innerHTML = '<span>🔎 Process List &amp; Check Duplicates</span>'; }

        if (typeof window._showToast === 'function') {
          window._showToast('Processed ' + parsed.length + ' pasted ' + (parsed.length === 1 ? 'entry' : 'entries') + ' — ' + newCount + ' new, ' + dupCount + ' possible duplicate' + (dupCount === 1 ? '' : 's') + '. Review & import below. 📋');
        }

        // Scroll the results into view on smaller screens.
        var container = document.getElementById('expansion-results-container');
        if (container && container.scrollIntoView) {
          try { container.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) { container.scrollIntoView(); }
        }
      }, 350);
    };

    // Run stats immediately when script loads
    setTimeout(window.updateExpansionStats, 100);
  
