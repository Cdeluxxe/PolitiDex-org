/* PolitiDex stance data — STATE SENATE wave 7 (Nevada, New Hampshire, Kentucky, Louisiana).
   ---------------------------------------------------------------------------------
   Additive module, same contract as waves 1–6. Augments the shared
   window.ISSUE_STANCE_DATA object so every consumer (My Stances "Your Stance vs
   Their Record", the Say-vs-Do engine, the Alignment Tool, Stance-at-a-Glance)
   lights these senators up automatically.

   CONTROVERSY-FIRST: each entry leads with the defining or most divisive item on
   the official's public record, then the substantive positions anchoring their
   tenure. Neutrally worded; every stance carries a real {label,url} source;
   issueKey values are canonical (ISSUE_MAP in alignment-tool.js).

   Scope note: Nicole Cannizzaro, Sharon Carson and Robert Stivers already ship
   curated stances (ext), so they are NOT redefined here (this module only ADDS,
   never overwrites) — they are enriched with sourced bios in cmp-data-detail.js
   instead. This wave contributes 9 new sourced profiles.

   Loaded with `defer` after the core/ext chunks; pure data (no functions). */
(function () {
  'use strict';
  var S = window.ISSUE_STANCE_DATA || (window.ISSUE_STANCE_DATA = {});
  var X = {

  /* ── NEVADA ──────────────────────────────────────────────────────────── */
  "robin_titus": [
    { topic:"Senate Republican Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Minority (Republican) Leader of the Nevada Senate since 2024 and a practicing physician from rural Lyon County (District 17); she previously led the Assembly GOP caucus.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Robin_L._Titus" } },
    { topic:"Rural Health Care", icon:"🏥", pos:"support", issueKey:"healthcare", issueStance:"support",
      text:"Brings a family-physician's perspective to rural health-care access and workforce issues.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Robin_Titus" } },
    { topic:"Taxes & Affordability", icon:"💰", pos:"support", issueKey:"lower_taxes", issueStance:"support",
      text:"Opposes tax increases and presses affordability and mining/rural economic priorities.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Robin_Titus" } }
  ],
  "marilyn_dondero_loop": [
    { topic:"Senate President pro Tempore", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"President pro Tempore of the Nevada Senate since 2025, a Las Vegas Democrat (District 8) and retired public-school teacher.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Marilyn_Dondero_Loop" } },
    { topic:"Public Education", icon:"🎓", pos:"support", issueKey:"public_schools", issueStance:"support",
      text:"A career educator who has centered public-school funding and teacher support.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Marilyn_Dondero_Loop" } },
    { topic:"Health & Families", icon:"🏥", pos:"support", issueKey:"healthcare", issueStance:"support",
      text:"Backs health-care access and family-support measures in the Democratic majority's agenda.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Marilyn_Dondero_Loop" } }
  ],

  /* ── NEW HAMPSHIRE ───────────────────────────────────────────────────── */
  "regina_birdsell": [
    { topic:"Senate Majority Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Majority Leader of the New Hampshire Senate since 2024, promoted from majority whip when Sharon Carson became president; she represents a Rockingham County district (District 19, Hampstead).",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/New_Hampshire_Senate" } },
    { topic:"No Income Tax", icon:"💰", pos:"support", issueKey:"lower_taxes", issueStance:"support",
      text:"Defends New Hampshire's low-tax, no-income-tax model and fiscal restraint.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Regina_Birdsell" } },
    { topic:"Election Administration", icon:"🗳", pos:"support", issueKey:"election_integrity", issueStance:"support",
      text:"Has worked on New Hampshire election-law and voter-registration measures.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Regina_Birdsell" } }
  ],
  "rebecca_perkins_kwoka": [
    { topic:"LGBTQ Democratic Leader", icon:"🏳️‍🌈", pos:"support", issueKey:"lgbtq_rights", issueStance:"support",
      text:"Minority (Democratic) Leader of the New Hampshire Senate since 2024 and one of its most prominent LGBTQ members, representing the Portsmouth area (District 21).",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Rebecca_Perkins_Kwoka" } },
    { topic:"Senate Democratic Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Chosen unanimously by the Senate Democratic caucus to lead the minority after the 2024 elections.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Rebecca_Perkins_Kwoka" } },
    { topic:"Housing", icon:"🏗", pos:"support", issueKey:"housing", issueStance:"support",
      text:"Focuses on housing affordability and supply in the seacoast region and statewide.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Rebecca_Perkins_Kwoka" } }
  ],

  /* ── KENTUCKY ────────────────────────────────────────────────────────── */
  "max_wise": [
    { topic:"Senate Majority Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Majority Floor Leader of the Kentucky Senate since 2025, succeeding the retired Damon Thayer; an Air Force veteran from Campbellsville (District 16) who was the 2023 Republican nominee for lieutenant governor.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Max_Wise" } },
    { topic:"Education & School Safety", icon:"🎓", pos:"support", issueKey:"school_choice", issueStance:"support",
      text:"A former teacher who chaired the Senate Education Committee and authored the state's School Safety and Resiliency Act.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Max_Wise" } },
    { topic:"Veterans & Military", icon:"🎖", pos:"support", issueKey:"veterans", issueStance:"support",
      text:"An Air Force veteran and former CIA analyst who focuses on veterans' and military-family issues.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Max_Wise" } }
  ],
  "gerald_neal": [
    { topic:"Dean of the Senate & Civil Rights", icon:"⚖️", pos:"support", issueKey:"justice_reform", issueStance:"support",
      text:"Minority (Democratic) Leader and the longest-serving Black member in Kentucky Senate history, a Louisville attorney (District 33) who has led on civil rights and sponsored the state's formal apology for slavery.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Gerald_Neal" } },
    { topic:"Senate Democratic Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Leads the small Democratic caucus in a Republican supermajority chamber, a role he was re-elected to for the 2025-26 sessions.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Gerald_Neal" } },
    { topic:"Voting Access", icon:"📩", pos:"support", issueKey:"voting_access", issueStance:"support",
      text:"Advocates for voting access and police-accountability reforms in the wake of the Breonna Taylor case in his Louisville district.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Gerald_Neal" } }
  ],

  /* ── LOUISIANA ───────────────────────────────────────────────────────── */
  "cameron_henry": [
    { topic:"Senate President", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"President of the Louisiana Senate since 2024 and a close ally of Gov. Jeff Landry, a Metairie Republican (District 9); the Senate president is fifth in Louisiana's line of gubernatorial succession.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Cameron_Henry" } },
    { topic:"Budget & Tax Overhaul", icon:"🧾", pos:"support", issueKey:"gov_balance", issueStance:"support",
      text:"A former House Appropriations chair who helped steer Landry's 2024-25 tax overhaul and state budget through the Senate.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Cameron_Henry" } },
    { topic:"Taxes", icon:"💰", pos:"support", issueKey:"lower_taxes", issueStance:"support",
      text:"Backed flattening the state income tax and cutting corporate taxes as part of the 2024 special-session overhaul.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Cameron_Henry" } }
  ],
  "jeremy_stine": [
    { topic:"Senate Majority Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Majority Leader of the Louisiana Senate since 2024, a Lake Charles Republican first elected in 2023.",
      source:{ label:"Louisiana State Senate", url:"https://senate.la.gov/smembers" } },
    { topic:"Insurance Crisis", icon:"🌀", pos:"support", issueKey:"cost_living", issueStance:"support",
      text:"Represents hurricane-battered southwest Louisiana and works on the state's property-insurance affordability crisis.",
      source:{ label:"Livingston Parish News", url:"https://www.livingstonparishnews.com/stories/louisiana-legislature-opens-2026-session-with-insurance-education-ai-and-carbon-capture-battles,208542" } },
    { topic:"Energy", icon:"⛽", pos:"support", issueKey:"energy_production", issueStance:"support",
      text:"Backs the Gulf Coast oil, gas and LNG-export economy centered on the Lake Charles region.",
      source:{ label:"Louisiana State Senate", url:"https://senate.la.gov/smembers" } }
  ],
  "royce_duplessis": [
    { topic:"Taking On the Insurers", icon:"🌀", pos:"support", issueKey:"econ_corp_account", issueStance:"support",
      text:"Filed 2026 legislation to bar insurers from using credit scores or ZIP codes to set premiums, challenging the industry amid Louisiana's property-insurance crisis.",
      source:{ label:"Livingston Parish News", url:"https://www.livingstonparishnews.com/stories/louisiana-legislature-opens-2026-session-with-insurance-education-ai-and-carbon-capture-battles,208542" } },
    { topic:"Criminal-Justice Reform", icon:"⚖️", pos:"support", issueKey:"justice_reform", issueStance:"support",
      text:"A New Orleans Democrat (District 5) and attorney who champions criminal-justice and sentencing reform against the state's tough-on-crime turn.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Royce_Duplessis" } },
    { topic:"Minority Voice", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"A leading Democratic voice in a Republican supermajority Senate, representing central New Orleans since a 2022 special election.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Royce_Duplessis" } }
  ]

  };
  Object.keys(X).forEach(function (k) { S[k] = X[k]; });
})();
