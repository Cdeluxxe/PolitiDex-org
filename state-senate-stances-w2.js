/* PolitiDex stance data — STATE SENATE wave 2 (Pennsylvania, Illinois, Ohio).
   ---------------------------------------------------------------------------------
   Additive module, same contract as state-senate-stances.js (wave 1). Augments the
   shared window.ISSUE_STANCE_DATA object so every consumer (My Stances "Your Stance
   vs Their Record", the Say-vs-Do engine, the Alignment Tool, Stance-at-a-Glance)
   lights these senators up automatically.

   CONTROVERSY-FIRST: each entry leads with the defining or most divisive item on the
   official's public record, then the substantive positions that anchor their tenure.
   Neutrally worded; every stance carries a real {label,url} source; issueKey values
   are canonical (ISSUE_MAP in alignment-tool.js) so they line up with saved stances.

   Scope note: Kim Ward, Jay Costa, Don Harmon and Rob McColley already ship curated
   stances in politician-stances-ext.js, so they are NOT redefined here (this module
   only ADDS, never overwrites) — they are enriched with sourced bios in
   cmp-data-detail.js instead. This wave contributes 8 new sourced profiles.

   Loaded with `defer` after the core/ext chunks; pure data (no functions). */
(function () {
  'use strict';
  var S = window.ISSUE_STANCE_DATA || (window.ISSUE_STANCE_DATA = {});
  var X = {

  /* ── PENNSYLVANIA ────────────────────────────────────────────────────── */
  "joe_pittman": [
    { topic:"Senate Majority Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Majority Leader of the Republican-controlled Pennsylvania Senate since 2022, he is a lead negotiator on the state budget with Democratic Gov. Josh Shapiro.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Joe_Pittman_(politician)" } },
    { topic:"Energy Production", icon:"⛽", pos:"support", issueKey:"energy_production", issueStance:"support",
      text:"Represents a natural-gas region of western Pennsylvania (Indiana County) and champions expanded energy production and pipeline infrastructure.",
      source:{ label:"PA Senate Republicans", url:"https://www.pasenategop.com/meet-our-members/" } },
    { topic:"State Budget Restraint", icon:"🧾", pos:"support", issueKey:"gov_balance", issueStance:"support",
      text:"Presses for spending restraint and against draining the state surplus in budget standoffs with the House and governor.",
      source:{ label:"PA Senate Republicans", url:"https://www.pasenategop.com/news/pa-senate-leaders-issue-statement-on-state-budget-progress-2/" } }
  ],
  "doug_mastriano": [
    { topic:"2020 Election Denial & Jan. 6", icon:"🗳", pos:"oppose", issueKey:"election_integrity", issueStance:"oppose",
      text:"A leading promoter of false claims that the 2020 election was stolen; he chartered buses to Washington for Jan. 6, 2021 and was outside the U.S. Capitol during the riot, and pushed to overturn Pennsylvania's results.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Doug_Mastriano" } },
    { topic:"2022 Governor Nominee", icon:"🏛", pos:"mixed", issueKey:"democracy_balance", issueStance:"mixed",
      text:"Won the 2022 Republican nomination for governor on a hard-right platform but lost to Democrat Josh Shapiro by roughly 15 points; he remains the state senator for District 33 (Franklin/Adams).",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Doug_Mastriano" } },
    { topic:"Abortion", icon:"⚖️", pos:"support", issueKey:"pro_life", issueStance:"support",
      text:"One of the legislature's most vocal abortion opponents, he has sponsored a near-total ban with no exceptions for rape or incest.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Doug_Mastriano" } }
  ],
  "sharif_street": [
    { topic:"State Senator & Party Chair", icon:"🔑", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Represents a Philadelphia district (District 3) while also serving as chair of the Pennsylvania Democratic Party; his father, John Street, was mayor of Philadelphia.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Sharif_Street" } },
    { topic:"Cannabis Legalization", icon:"🌿", pos:"support", issueKey:"cannabis_reform", issueStance:"support",
      text:"A lead sponsor of bipartisan bills to legalize adult-use cannabis in Pennsylvania and to expunge past low-level convictions.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Sharif_Street" } },
    { topic:"Criminal-Justice Reform", icon:"⚖️", pos:"support", issueKey:"justice_reform", issueStance:"support",
      text:"Focuses on probation and sentencing reform, reentry, and expungement as a senior Philadelphia Democrat.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Sharif_Street" } }
  ],

  /* ── ILLINOIS ────────────────────────────────────────────────────────── */
  "kimberly_lightford": [
    { topic:"Author of the SAFE-T Act", icon:"⚖️", pos:"support", issueKey:"justice_reform", issueStance:"support",
      text:"A lead sponsor of the 2021 SAFE-T Act, the law that made Illinois the first state to abolish cash bail — a change praised by reformers and attacked by opponents as soft on crime.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Kimberly_Lightford" } },
    { topic:"Senate Majority Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Majority Leader of the Illinois Senate since 2019 and a member since 1998, representing a west-suburban Chicago district (District 4).",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Kimberly_Lightford" } },
    { topic:"$15 Minimum Wage & Education", icon:"🔧", pos:"support", issueKey:"econ_workers", issueStance:"support",
      text:"Sponsored the law raising Illinois's minimum wage to $15 an hour and has led on school-funding and education-equity measures.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Kimberly_Lightford" } }
  ],
  "john_curran_il": [
    { topic:"Senate Republican Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Minority Leader of the Illinois Senate since 2023, leading the Republican caucus in a Democratic supermajority chamber; he represents a DuPage County district (District 41).",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/John_Curran_(Illinois_politician)" } },
    { topic:"Public Safety & the SAFE-T Act", icon:"🚔", pos:"support", issueKey:"tough_on_crime", issueStance:"support",
      text:"A former prosecutor and leading critic of the no-cash-bail SAFE-T Act, arguing it should be rolled back to protect public safety.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/John_Curran_(Illinois_politician)" } },
    { topic:"Ethics & Corruption", icon:"🔍", pos:"support", issueKey:"gov_transparency", issueStance:"support",
      text:"Pushes ethics and anti-corruption reforms in the wake of Illinois's public-corruption scandals.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/John_Curran_(Illinois)" } }
  ],
  "robert_peters_il": [
    { topic:"Running for Congress (IL-02)", icon:"🗳", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"A progressive Chicago Democrat (District 13) running for the U.S. House in Illinois's 2nd District in 2026, backed by labor groups including National Nurses United.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Robert_Peters_(Illinois)" } },
    { topic:"Criminal-Justice Reform", icon:"⚖️", pos:"support", issueKey:"justice_reform", issueStance:"support",
      text:"A movement organizer before office, he helped pass the SAFE-T Act and champions further criminal-justice and police-accountability changes.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Robert_Peters_(Illinois)" } },
    { topic:"Labor & Workers", icon:"🔧", pos:"support", issueKey:"econ_workers", issueStance:"support",
      text:"Runs on a pro-labor, working-class economic agenda and has drawn union endorsements.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Robert_Peters_(Illinois)" } }
  ],

  /* ── OHIO ────────────────────────────────────────────────────────────── */
  "theresa_gavarone": [
    { topic:"Senate Majority Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Majority Leader of the Republican supermajority Ohio Senate since 2025, representing a northwest Ohio district (District 2).",
      source:{ label:"Ohio Legislature", url:"https://www.legislature.ohio.gov/members/senate-leadership" } },
    { topic:"Voter ID & Election Law", icon:"🗳", pos:"support", issueKey:"election_integrity", issueStance:"support",
      text:"A lead sponsor of Ohio's stricter photo voter-ID law and other election-administration changes.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Theresa_Gavarone" } },
    { topic:"Taxes & Cost of Living", icon:"💰", pos:"support", issueKey:"lower_taxes", issueStance:"support",
      text:"Backs income-tax reduction and affordability measures as part of the Senate GOP agenda.",
      source:{ label:"Ohio Legislature", url:"https://www.legislature.ohio.gov/members/senate-leadership" } }
  ],
  "nickie_antonio": [
    { topic:"Ohio's First LGBTQ Legislator", icon:"🏳️‍🌈", pos:"support", issueKey:"lgbtq_rights", issueStance:"support",
      text:"The first openly LGBTQ person elected to the Ohio General Assembly and the first woman to lead the Senate Democratic caucus; she has opposed restrictions on LGBTQ rights.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Nickie_Antonio" } },
    { topic:"Senate Minority Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Minority Leader of the Ohio Senate since 2023, leading the Democratic caucus from a Cleveland-area district (District 23).",
      source:{ label:"Ohio Legislature", url:"https://www.legislature.ohio.gov/members/senate-leadership" } },
    { topic:"Health & Human Services", icon:"🏥", pos:"support", issueKey:"healthcare", issueStance:"support",
      text:"A former health-and-human-services professional who focuses on health access, mental health, and end-of-life care.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Nickie_Antonio" } }
  ]

  };
  Object.keys(X).forEach(function (k) { S[k] = X[k]; });
})();
