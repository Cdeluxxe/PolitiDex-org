/* PolitiDex stance data — STATE SENATE wave 8 (Oregon, South Carolina, Alabama, Connecticut).
   ---------------------------------------------------------------------------------
   Additive module, same contract as waves 1–7. Augments the shared
   window.ISSUE_STANCE_DATA object so every consumer (My Stances "Your Stance vs
   Their Record", the Say-vs-Do engine, the Alignment Tool, Stance-at-a-Glance)
   lights these senators up automatically.

   CONTROVERSY-FIRST: each entry leads with the defining or most divisive item on
   the official's public record, then the substantive positions anchoring their
   tenure. Neutrally worded; every stance carries a real {label,url} source;
   issueKey values are canonical (ISSUE_MAP in alignment-tool.js).

   Scope note: none of these 12 senators previously existed in the roster or the
   stance data, so all are brand-new profiles (no enrichment needed this wave).

   Loaded with `defer` after the core/ext chunks; pure data (no functions). */
(function () {
  'use strict';
  var S = window.ISSUE_STANCE_DATA || (window.ISSUE_STANCE_DATA = {});
  var X = {

  /* ── OREGON ──────────────────────────────────────────────────────────── */
  "rob_wagner": [
    { topic:"Senate President", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"President of the Oregon Senate since 2023, a Lake Oswego Democrat (District 19) who previously served as Majority Leader.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Rob_Wagner_(politician)" } },
    { topic:"Public Education", icon:"🎓", pos:"support", issueKey:"public_schools", issueStance:"support",
      text:"A former school-board member and education-nonprofit leader who centers public-school funding.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Rob_Wagner" } },
    { topic:"Housing", icon:"🏗", pos:"support", issueKey:"housing", issueStance:"support",
      text:"Backs the majority's push to expand housing supply and address homelessness across Oregon.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Rob_Wagner" } }
  ],
  "kayse_jama": [
    { topic:"First African-Born OR Senator", icon:"🌍", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Majority Leader of the Oregon Senate since November 2024 — a former Somali refugee and the first Muslim and first African-born member of the chamber, representing east Portland (District 24).",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Kayse_Jama" } },
    { topic:"Housing & Homelessness", icon:"🏗", pos:"support", issueKey:"housing", issueStance:"support",
      text:"A former housing-committee chair who champions affordable housing, tenant protections and homelessness response.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Kayse_Jama" } },
    { topic:"Immigrant Communities", icon:"🛡", pos:"support", issueKey:"immigration_reform", issueStance:"support",
      text:"An immigrant-rights advocate who founded a civic-engagement organization for refugee and immigrant communities.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Kayse_Jama" } }
  ],
  "bruce_starr": [
    { topic:"Won a Measure 113 Seat", icon:"🚪", pos:"mixed", issueKey:"gov_services", issueStance:"mixed",
      text:"Elected Senate Minority Leader in 2025; he won the seat of Sen. Brian Boquist, one of the Republicans barred from re-election under Measure 113 after the record six-week 2023 Senate walkout — the longest in modern U.S. history.",
      source:{ label:"OPB", url:"https://www.opb.org/article/2024/04/04/oregon-senate-republicans-have-tapped-a-new-leader/" } },
    { topic:"Taxes & Affordability", icon:"💰", pos:"support", issueKey:"lower_taxes", issueStance:"support",
      text:"Presses tax relief and opposition to the majority's cost-of-living and business-tax measures.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Bruce_Starr" } },
    { topic:"Agriculture & Rural Oregon", icon:"🌾", pos:"support", issueKey:"rural_ag", issueStance:"support",
      text:"Represents the Yamhill County wine-and-farm country and advocates for agriculture and rural economies.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Bruce_Starr" } }
  ],

  /* ── SOUTH CAROLINA ──────────────────────────────────────────────────── */
  "thomas_alexander": [
    { topic:"Senate President", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"President of the South Carolina Senate since 2021, an Oconee County Republican and one of the chamber's most senior members.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/South_Carolina_Senate" } },
    { topic:"Energy & Utilities", icon:"⚡", pos:"support", issueKey:"energy_production", issueStance:"support",
      text:"A lead voice on the state's energy future and the debate over the state-owned utility Santee Cooper.",
      source:{ label:"Post and Courier", url:"https://www.postandcourier.com/politics/south-carolina-session-preview-2026-legislature/article_ee70b5d9-2a30-433e-af86-6af150634d4a.html" } },
    { topic:"Taxes", icon:"💰", pos:"support", issueKey:"lower_taxes", issueStance:"support",
      text:"Backs the Senate GOP push to cut and flatten South Carolina's income tax.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/South_Carolina_Senate" } }
  ],
  "shane_massey": [
    { topic:"Abortion-Ban Push vs. 'Sister Senators'", icon:"⚖️", pos:"support", issueKey:"pro_life", issueStance:"support",
      text:"Majority Leader since 2016 who has repeatedly driven near-total abortion bans, drawing public rebukes from the bipartisan 'Sister Senators'; one accused him of repeatedly 'taking us off a cliff on abortion.'",
      source:{ label:"PBS NewsHour", url:"https://www.pbs.org/newshour/politics/south-carolina-senate-again-rejects-near-total-abortion-ban" } },
    { topic:"Senate Majority Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"An Edgefield attorney who has led the Senate Republican caucus for nearly a decade and shaped judicial-selection and tort debates.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/A._Shane_Massey" } },
    { topic:"Taxes", icon:"💰", pos:"support", issueKey:"lower_taxes", issueStance:"support",
      text:"Backs income-tax cuts and the chamber's fiscal-conservative agenda.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/A._Shane_Massey" } }
  ],
  "margie_bright_matthews": [
    { topic:"'Sister Senator' & Profile in Courage", icon:"⚖️", pos:"support", issueKey:"pro_choice", issueStance:"support",
      text:"One of the bipartisan 'Sister Senators' who filibustered South Carolina's near-total abortion ban and shared the 2024 JFK Profile in Courage Award; after the three Republican Sister Senators lost 2024 primaries, she is one of only two women left in the chamber.",
      source:{ label:"NBC News", url:"https://www.nbcnews.com/politics/2024-election/three-gop-state-senators-filibustered-sc-abortion-ban-lost-primaries-rcna158965" } },
    { topic:"Lowcountry Democrat", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"A Walterboro attorney representing a rural Lowcountry district, and a senior voice in the small Senate Democratic caucus.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/South_Carolina_Senate" } },
    { topic:"Rural Health Care", icon:"🏥", pos:"support", issueKey:"healthcare", issueStance:"support",
      text:"Advocates for health-care access and hospital services in the rural, largely low-income communities she represents.",
      source:{ label:"NBC News", url:"https://www.nbcnews.com/politics/2024-election/south-carolinas-gop-sister-senators-warn-long-term-damage-abortion-fig-rcna159031" } }
  ],

  /* ── ALABAMA ─────────────────────────────────────────────────────────── */
  "garlan_gudger": [
    { topic:"Senate President pro Tempore", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"President pro Tempore of the Alabama Senate since 2025 — the chamber's top leader — a Cullman Republican and small-business owner who won the post over the sitting majority leader.",
      source:{ label:"Alabama Daily News", url:"https://aldailynews.com/senate-gop-caucus-selects-gudger-as-next-president-pro-tem/" } },
    { topic:"Small Business & Economy", icon:"🏢", pos:"support", issueKey:"econ_smallbiz", issueStance:"support",
      text:"A downtown-revitalization and small-business advocate who centers local economic development.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Garlan_Gudger" } },
    { topic:"Taxes", icon:"💰", pos:"support", issueKey:"lower_taxes", issueStance:"support",
      text:"Backs cutting the state grocery tax and other tax relief within the Republican supermajority's agenda.",
      source:{ label:"Yellowhammer News", url:"https://yellowhammernews.com/garlan-gudger-elected-by-alabama-senate-republican-caucus-to-succeed-greg-reed-as-president-pro-tempore/" } }
  ],
  "steve_livingston": [
    { topic:"Senate Majority Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Majority Leader of the Alabama Senate since 2023, a Scottsboro Republican from the state's northeastern corner.",
      source:{ label:"Alabama Senate Republicans", url:"https://alsenaterepublicans.org/about/" } },
    { topic:"Rural Broadband", icon:"📶", pos:"support", issueKey:"broadband", issueStance:"support",
      text:"A lead architect of Alabama's rural high-speed-internet expansion, one of his signature efforts.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Alabama_Senate" } },
    { topic:"Taxes", icon:"💰", pos:"support", issueKey:"lower_taxes", issueStance:"support",
      text:"Supports the Republican supermajority's tax-cut and fiscal agenda.",
      source:{ label:"Alabama Senate Republicans", url:"https://alsenaterepublicans.org/about/" } }
  ],
  "bobby_singleton": [
    { topic:"Senate Democratic Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Minority (Democratic) Leader of the Alabama Senate since 2019, representing the majority-Black rural Black Belt as the lead voice of the small Democratic caucus.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Bobby_Singleton" } },
    { topic:"Civil Rights & Voting", icon:"⚖️", pos:"support", issueKey:"justice_reform", issueStance:"support",
      text:"A leading voice on civil rights, redistricting and criminal-justice reform in a state central to Voting Rights Act litigation.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Bobby_Singleton" } },
    { topic:"Rural Health Care", icon:"🏥", pos:"support", issueKey:"healthcare", issueStance:"support",
      text:"Pushes Medicaid expansion and rural-hospital funding for the underserved Black Belt.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Bobby_Singleton" } }
  ],

  /* ── CONNECTICUT ─────────────────────────────────────────────────────── */
  "martin_looney": [
    { topic:"Longest-Serving Leader Retiring", icon:"🗳", pos:"mixed", issueKey:"gov_services", issueStance:"mixed",
      text:"President pro Tempore since 2015 and the longest-tenured Senate leader in Connecticut history; in May 2026 he announced he would not seek an 18th term and endorsed Majority Leader Bob Duff to succeed him.",
      source:{ label:"CT News Junkie", url:"https://ctnewsjunkie.com/2026/05/08/ct-senate-bids-farewell-to-its-longest-serving-leader-in-martin-looney/" } },
    { topic:"Police Accountability", icon:"⚖️", pos:"support", issueKey:"justice_reform", issueStance:"support",
      text:"A New Haven Democrat who led Connecticut's 2020 police-accountability law and other criminal-justice reforms.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Martin_Looney" } },
    { topic:"Health Care", icon:"🏥", pos:"support", issueKey:"healthcare", issueStance:"support",
      text:"A longtime advocate for expanding health coverage, including a state public-option effort.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Martin_Looney" } }
  ],
  "bob_duff": [
    { topic:"Next Senate Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Majority Leader of the Connecticut Senate since 2015, a Norwalk Democrat endorsed by the retiring Martin Looney to become the chamber's next President pro Tempore.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Bob_Duff_(Connecticut)" } },
    { topic:"Climate & Clean Energy", icon:"🌱", pos:"support", issueKey:"climate_action", issueStance:"support",
      text:"A leader on Connecticut's climate and clean-energy legislation and offshore-wind push.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Bob_Duff" } },
    { topic:"Gun Safety", icon:"🔫", pos:"support", issueKey:"gun_safety", issueStance:"support",
      text:"Backed Connecticut's post-Sandy Hook gun-safety laws and their continued strengthening.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Bob_Duff" } }
  ],
  "stephen_harding": [
    { topic:"Senate Republican Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Minority (Republican) Leader of the Connecticut Senate since 2024, a Brookfield attorney leading the GOP caucus in a Democratic-majority chamber.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Stephen_Harding_(politician)" } },
    { topic:"Taxes & Affordability", icon:"💰", pos:"support", issueKey:"lower_taxes", issueStance:"support",
      text:"Centers Connecticut's high cost of living and taxes, opposing new tax increases.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Stephen_Harding" } },
    { topic:"Cost of Living", icon:"🏠", pos:"support", issueKey:"cost_living", issueStance:"support",
      text:"Pushes affordability measures on energy and housing costs for Connecticut families.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Stephen_Harding" } }
  ]

  };
  Object.keys(X).forEach(function (k) { S[k] = X[k]; });
})();
