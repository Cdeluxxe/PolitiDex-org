/* PolitiDex stance data — STATE SENATE wave 15 (DEPTH phase, megastates II).
   ---------------------------------------------------------------------------------
   Second deepening pass on the four largest chambers — California, Texas, New York
   and Florida — adding more committee chairs and high-profile rank-and-file senators
   beyond the leaders and Wave 14 additions already profiled.

   Additive module, same contract as prior waves. Augments the shared
   window.ISSUE_STANCE_DATA object so every consumer (My Stances "Your Stance vs
   Their Record", the Say-vs-Do engine, the Alignment Tool, Stance-at-a-Glance, and
   the Government Contracting "by state" ties) lights these senators up automatically.

   Follows the megastates' `name_state` key convention and was checked against every
   existing key (base file + waves) to guarantee no duplication. Controversy-first;
   every stance carries a real {label,url} source; issueKey values are canonical.
   This wave adds 12 profiles and only ADDS keys — it never overwrites one.

   Loaded with `defer` after the core/ext chunks; pure data (no functions). */
(function () {
  'use strict';
  var S = window.ISSUE_STANCE_DATA || (window.ISSUE_STANCE_DATA = {});
  var X = {

  /* ── CALIFORNIA ──────────────────────────────────────────────────────── */
  "mcguire_ca": [
    { topic:"PG&E's Persistent Antagonist", icon:"🔥", pos:"support", issueKey:"econ_corp_account", issueStance:"support",
      text:"A North Coast Democrat who served as Senate President pro Tempore and has cast himself as PG&E's chief foil, blaming the utility for putting shareholder profits over safety amid years of catastrophic wildfires; he wrote the law shielding fire survivors from state tax on PG&E settlements.",
      source:{ label:"Senate District 2", url:"https://sd02.senate.ca.gov/news/state-senate-unveils-major-wildfire-package-golden-state-commitment-investing-more-fire-safe" } },
    { topic:"The 'Golden State Commitment' on Wildfire", icon:"🌲", pos:"support", issueKey:"climate_action", issueStance:"support",
      text:"After the January 2025 Los Angeles firestorm he led a sweeping wildfire package to speed recovery, stabilize the insurance market and phase out seasonal CalFire staffing through a 'Fight for Firefighters' plan.",
      source:{ label:"Senate District 2", url:"https://sd02.senate.ca.gov/news/senate-leader-mcguire-large-bipartisan-coalition-senators-champion-new-legislation-fight" } },
    { topic:"North Coast Leader Eyeing Congress", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"A Healdsburg Democrat (District 2) representing a vast rural stretch from Marin to the Oregon line; in 2026 he launched a bid for Congress.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Mike_McGuire" } }
  ],
  "stern_ca": [
    { topic:"Wrote the Nation's First Corporate Climate-Disclosure Laws", icon:"🌍", pos:"support", issueKey:"climate_action", issueStance:"support",
      text:"Authored SB 261 and co-authored SB 253, the first U.S. laws requiring large corporations to publicly disclose greenhouse-gas emissions and climate risk — landmark mandates industry groups fought hard.",
      source:{ label:"The Climate Center", url:"https://theclimatecenter.org/about/people/senator-henry-stern/" } },
    { topic:"Natural Resources & Water Chair", icon:"💧", pos:"support", issueKey:"water", issueStance:"support",
      text:"A Los Angeles/Ventura Democrat (District 27) who has chaired the Natural Resources & Water Committee since 2018 and, after losing his own home in the 2018 Woolsey Fire, authored a wildfire-resilience law.",
      source:{ label:"Senate District 27", url:"https://sd27.senate.ca.gov/biography" } },
    { topic:"Emissions Regulator", icon:"🏭", pos:"support", issueKey:"energy_production", issueStance:"support",
      text:"Serves as the Senate's ex officio member of the California Air Resources Board, a central perch in the state's climate and clean-energy rulemaking.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Henry_Stern" } }
  ],
  "niello_ca": [
    { topic:"'Our Budget Is a House of Cards'", icon:"🃏", pos:"support", issueKey:"gov_waste", issueStance:"support",
      text:"Senate Budget vice chair and the GOP's chief fiscal critic, who warns the majority 'continues to overspend while hoping for a growth in revenue' and calls the state budget structurally unsound amid multibillion-dollar deficits.",
      source:{ label:"Senate Republican Caucus", url:"https://sr06.senate.ca.gov/content/senate-republican-budget-vice-chair-roger-niello-californias-budget-must-be-about-spending" } },
    { topic:"Lower Taxes, Less Spending", icon:"💰", pos:"support", issueKey:"lower_taxes", issueStance:"support",
      text:"A Fair Oaks Republican (District 6), former Assembly member and auto-dealership owner who presses spending restraint and tax relief against the Democratic supermajority.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Roger_Niello" } },
    { topic:"Wildfire Prevention Funding", icon:"🌲", pos:"support", issueKey:"gov_balance", issueStance:"support",
      text:"Pushed to redirect budget dollars toward forest thinning and year-round firefighting — Republican priorities he argues the majority underfunds.",
      source:{ label:"Senate Republican Caucus", url:"https://sr06.senate.ca.gov/content/stop-waste-deliver-results-senate-republicans-outline-budget-priorities-ahead-state-state" } }
  ],

  /* ── TEXAS ───────────────────────────────────────────────────────────── */
  "kolkhorst_tx": [
    { topic:"Carried the 2017 'Bathroom Bill'", icon:"🚻", pos:"oppose", issueKey:"lgbtq_rights", issueStance:"oppose",
      text:"Sponsored SB 6, the 'Texas Privacy Act' requiring bathroom use in public facilities by birth-certificate sex; it cleared the Senate 21-10 over opposition from big business and the NFL and 13 hours of testimony before dying in the House.",
      source:{ label:"TIME", url:"https://time.com/4701658/texas-senate-bathroom-bill-sb6-transgender/" } },
    { topic:"Senate Health & Human Services Chair", icon:"🏥", pos:"support", issueKey:"healthcare", issueStance:"support",
      text:"A Brenham Republican (District 18) who chairs the Health & Human Services Committee, steering Medicaid, maternal-health and rural-hospital policy.",
      source:{ label:"Texas Senate", url:"https://senate.texas.gov/cmte.php?c=610" } },
    { topic:"Rural Texas", icon:"🌾", pos:"support", issueKey:"rural_ag", issueStance:"support",
      text:"Represents a sprawling rural district and has focused on rural health care, property rights and water infrastructure.",
      source:{ label:"Texas Senate", url:"https://www.senate.texas.gov/members/d18/press/en/p20170105a.pdf" } }
  ],
  "schwertner_tx": [
    { topic:"The Grid Chair Warning on Data Centers", icon:"⚡", pos:"mixed", issueKey:"energy_production", issueStance:"mixed",
      text:"As Business & Commerce chair he oversees the ERCOT power grid and authored post-2021-blackout reliability law (SB 7); he now warns that surging data-center demand is shifting costs onto ordinary ratepayers, and has clashed with regulators over a market redesign he says defied the Legislature.",
      source:{ label:"Community Impact", url:"https://communityimpact.com/austin/round-rock/texas-legislature/2026/04/01/ercot-developers-detail-plans-to-manage-data-center-growth-amid-legislative-scrutiny/" } },
    { topic:"Ratepayer Costs", icon:"🔌", pos:"support", issueKey:"cost_living", issueStance:"support",
      text:"A Georgetown Republican (District 5) who argues residential and small-business customers 'are feeling a significant burden' from electricity growth driven by large industrial users.",
      source:{ label:"Texas Oil & Gas Association", url:"https://www.txoga.org/podcast/ep29-senator-schwertner/" } },
    { topic:"A Physician in the Senate", icon:"🩺", pos:"support", issueKey:"healthcare", issueStance:"support",
      text:"An orthopedic surgeon by training who brings a clinical background to health-care and insurance policy in his committee's jurisdiction.",
      source:{ label:"Dr. Charles Schwertner", url:"https://www.drschwertner.com/" } }
  ],
  "rwest_tx": [
    { topic:"A Dallas Institution Since 1992", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"One of the Senate's most senior Democrats, representing Dallas County for more than three decades and among the longest-serving Black legislators in Texas.",
      source:{ label:"The Texas Tribune", url:"https://www.texastribune.org/directory/royce-west/" } },
    { topic:"Built a Public Law School", icon:"🎓", pos:"support", issueKey:"public_schools", issueStance:"support",
      text:"A Dallas Democrat (District 23) whose signature work created the University of North Texas at Dallas and its public law school, expanding college access in southern Dallas.",
      source:{ label:"Royce West", url:"https://roycewest.com/about/" } },
    { topic:"Former Prosecutor on Justice Reform", icon:"⚖️", pos:"support", issueKey:"justice_reform", issueStance:"support",
      text:"A former assistant district attorney and civil-rights attorney who has worked on policing and criminal-justice measures across his tenure.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Royce_West" } }
  ],

  /* ── NEW YORK ────────────────────────────────────────────────────────── */
  "myrie_ny": [
    { topic:"Author of New York's Voting Rights Act", icon:"🗳", pos:"support", issueKey:"voting_access", issueStance:"support",
      text:"As Elections chair he wrote the John R. Lewis New York Voting Rights Act — hailed as the strongest state voting-rights law in the country — and drove early voting and campaign-finance reforms into law.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Zellnor_Myrie" } },
    { topic:"Ran for NYC Mayor", icon:"🏙", pos:"mixed", issueKey:"gov_balance", issueStance:"mixed",
      text:"A Brooklyn Democrat (District 20), son of Costa Rican immigrants, who launched a 2025 bid for New York City mayor centered on housing production, placing sixth in a crowded Democratic primary.",
      source:{ label:"Amsterdam News", url:"https://amsterdamnews.com/news/2024/05/16/brooklyns-sen-zellnore-myrie-annouces-mayoral-bid-for-2025/" } },
    { topic:"Housing Abundance", icon:"🏗", pos:"support", issueKey:"housing", issueStance:"support",
      text:"Has made building far more housing his signature cause, proposing a large-scale construction agenda for New York City.",
      source:{ label:"Meet Zellnor", url:"https://www.zellnor.nyc/about" } }
  ],
  "liu_ny": [
    { topic:"Guardian of the Specialized-School Exam", icon:"🏫", pos:"support", issueKey:"public_schools", issueStance:"support",
      text:"As chair of the NYC Education Committee he is the gatekeeper on the SHSAT — the single-test admission to elite high schools — and has resisted scrapping it, navigating a fraught divide among Asian, Black and Hispanic families.",
      source:{ label:"City & State New York", url:"https://www.cityandstateny.com/articles/policy/education/john-liu-no-quick-fix-specialized-high-schools-entrance-exam.html" } },
    { topic:"Charter Schools", icon:"🎓", pos:"mixed", issueKey:"school_choice", issueStance:"mixed",
      text:"A Queens Democrat (District 11) and former NYC Comptroller who has laid out conditions before he would support lifting the state's charter-school cap.",
      source:{ label:"City & State New York", url:"https://www.cityandstateny.com//personality/2019/04/liu-on-what-needs-to-happen-before-lifting-the-charter-cap/177453/" } },
    { topic:"From Comptroller to Albany", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"The first Asian American elected to citywide office in New York City, now shaping city education policy from the state Senate.",
      source:{ label:"SHSAT Sunset", url:"https://shsatsunset.org/john-liu/" } }
  ],
  "brisport_ny": [
    { topic:"Part of Albany's Socialist Bloc", icon:"🌹", pos:"support", issueKey:"gov_balance", issueStance:"support",
      text:"A Democratic Socialist and former public-school teacher, the first openly gay person of color elected to the New York Legislature and one of the largest DSA cohort in Albany in a century.",
      source:{ label:"Jacobin", url:"https://jacobin.com/2021/01/state-senate-dsa-jabari-brisport" } },
    { topic:"Universal Child Care", icon:"🧸", pos:"support", issueKey:"econ_workers", issueStance:"support",
      text:"A Brooklyn Democrat (District 25) who chairs the Children and Families Committee and has made publicly funded universal child care his signature fight.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Jabari_Brisport" } },
    { topic:"Tax the Rich", icon:"💸", pos:"support", issueKey:"econ_corp_account", issueStance:"support",
      text:"Frames his agenda around redistribution, pushing higher taxes on the wealthy to fund social programs and build working-class power.",
      source:{ label:"Re-Elect Jabari Brisport", url:"https://jabariforstatesenate.com/" } }
  ],

  /* ── FLORIDA ─────────────────────────────────────────────────────────── */
  "garcia_fl": [
    { topic:"'Latinas for Trump' Founder Who Broke Ranks", icon:"🔀", pos:"support", issueKey:"immigration_reform", issueStance:"support",
      text:"A co-founder of Latinas for Trump who publicly rebuked the administration's deportation drive as 'unacceptable and inhumane' after courthouse arrests in South Florida — 'This is not what we voted for' — blaming adviser Stephen Miller.",
      source:{ label:"The Hill", url:"https://thehill.com/immigration/5339542-latinas-for-trump-co-founder-blasts-mass-deportations/" } },
    { topic:"A Republican at Odds With Her Party", icon:"🌎", pos:"mixed", issueKey:"gov_balance", issueStance:"mixed",
      text:"A Miami Republican (District 36) and daughter of Cuban refugees, formerly of the Department of Homeland Security's public-affairs office, whose immigration break put her at odds with hardliners in her own party.",
      source:{ label:"MSNBC", url:"https://www.ms.now/rachel-maddow-show/maddowblog/not-voted-latinas-trump-founder-rejects-deportation-agenda-rcna212061" } },
    { topic:"Miami's Cuban-American Politics", icon:"🇨🇺", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Represents a heavily Cuban-American Miami district and centers the immigrant experience of refugees fleeing communism.",
      source:{ label:"Yahoo News", url:"https://www.yahoo.com/news/latinas-trump-co-founder-blasts-234413681.html" } }
  ],
  "brodeur_fl": [
    { topic:"Shadowed by the 'Ghost Candidate' Scandal", icon:"👻", pos:"mixed", issueKey:"election_integrity", issueStance:"mixed",
      text:"Won his 2020 seat by about 7,600 votes in a race that featured a no-campaign 'ghost' independent candidate; an associate who worked under him at the county chamber pleaded guilty in the scheme, and sworn testimony alleged Brodeur knew of the plan — which he denies.",
      source:{ label:"ClickOrlando", url:"https://www.clickorlando.com/news/politics/2022/09/02/joel-greenberg-claims-florida-sen-jason-brodeur-knew-of-ghost-candidate-plot-records-show/" } },
    { topic:"Business & Chamber Ties", icon:"🏢", pos:"support", issueKey:"econ_smallbiz", issueStance:"support",
      text:"A Sanford Republican (District 10) who leads the Seminole County Chamber of Commerce and centers a pro-business, development-friendly agenda.",
      source:{ label:"Florida Politics", url:"https://floridapolitics.com/archives/569786-give-up-the-ghost-jason-brodeur-wins-second-term-in-florida-senate/" } },
    { topic:"Growth & Development", icon:"🏗", pos:"support", issueKey:"econ_growth", issueStance:"support",
      text:"Has backed growth-management and infrastructure measures for fast-expanding Central Florida suburbs.",
      source:{ label:"ClickOrlando", url:"https://www.clickorlando.com/topic/Jason_Brodeur/" } }
  ],
  "cgsmith_fl": [
    { topic:"Pulse Survivor Advocate for Gun Limits", icon:"🕯", pos:"support", issueKey:"gun_safety", issueStance:"support",
      text:"Represents the Orlando area scarred by the 2016 Pulse massacre and has filed an assault-weapons ban nearly every year — 'weapons of war… have no place on our streets' — while fighting bills to loosen gun rules; the bans have gone unheard in committee.",
      source:{ label:"Florida Politics", url:"https://floridapolitics.com/archives/311079-carlos-smith-tries-again-with-assault-weapon-sales-ban-bill/" } },
    { topic:"First LGBTQ+ Latino in the Legislature", icon:"🏳️‍🌈", pos:"support", issueKey:"lgbtq_rights", issueStance:"support",
      text:"An Orlando Democrat (District 17), the first openly LGBTQ+ Latino elected to the Florida Legislature, and a leading opponent of the DeSantis-era rollback of LGBTQ+ protections.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Carlos_Guillermo_Smith" } },
    { topic:"Progressive Standard-Bearer", icon:"✊", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"A former House member elected to the Senate in 2024 who is among the chamber's most vocal progressive voices on civil rights and gun policy.",
      source:{ label:"Equality Florida", url:"https://eqfl.org/carlos-guillermo-smith" } }
  ]

  };
  Object.keys(X).forEach(function (k) { S[k] = X[k]; });
})();
