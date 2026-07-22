/* PolitiDex stance data — STATE SENATE wave 3 (Georgia, North Carolina, Michigan).
   ---------------------------------------------------------------------------------
   Additive module, same contract as waves 1–2. Augments the shared
   window.ISSUE_STANCE_DATA object so every consumer (My Stances "Your Stance vs
   Their Record", the Say-vs-Do engine, the Alignment Tool, Stance-at-a-Glance)
   lights these senators up automatically.

   CONTROVERSY-FIRST: each entry leads with the defining or most divisive item on
   the official's public record, then the substantive positions anchoring their
   tenure. Neutrally worded; every stance carries a real {label,url} source;
   issueKey values are canonical (ISSUE_MAP in alignment-tool.js).

   Scope note: Winnie Brinks, Phil Berger and Mallory McMorrow already ship curated
   stances (ext/core), so they are NOT redefined here (this module only ADDS, never
   overwrites) — they are enriched with sourced bios / a roster entry in
   cmp-data.js + cmp-data-detail.js instead. This wave contributes 8 new profiles.

   Loaded with `defer` after the core/ext chunks; pure data (no functions). */
(function () {
  'use strict';
  var S = window.ISSUE_STANCE_DATA || (window.ISSUE_STANCE_DATA = {});
  var X = {

  /* ── GEORGIA ─────────────────────────────────────────────────────────── */
  "larry_walker_ga": [
    { topic:"Senate President pro Tempore", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Became President pro Tempore of the Georgia Senate in January 2026, succeeding John Kennedy, who stepped down to run for lieutenant governor; Walker (District 20, Perry) comes from a political family whose father was a longtime state House majority leader.",
      source:{ label:"AllOnGeorgia", url:"https://allongeorgia.com/georgia-state-politics/sen-larry-walker-iii-named-republican-nominee-for-president-pro-tempore-ahead-of-2026-session/" } },
    { topic:"School Choice", icon:"🎓", pos:"support", issueKey:"school_choice", issueStance:"support",
      text:"Part of the Republican majority that enacted Georgia's private-school voucher program, expanding education-savings options.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Larry_Walker_III" } },
    { topic:"Taxes", icon:"💰", pos:"support", issueKey:"lower_taxes", issueStance:"support",
      text:"Backs the state income-tax rate cuts and taxpayer rebates advanced by the Senate GOP.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Larry_Walker_III" } }
  ],
  "jason_anavitarte": [
    { topic:"Senate Majority Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Elected Majority Leader of the Georgia Senate in June 2025, succeeding Steve Gooch; a Dallas-area Republican (District 31) of Puerto Rican descent.",
      source:{ label:"WABE", url:"https://www.wabe.org/georgia-republicans-choose-new-senate-leaders-to-replace-those-seeking-higher-office/" } },
    { topic:"Kids' Online Safety", icon:"📵", pos:"support", issueKey:"privacy_rights", issueStance:"support",
      text:"Lead sponsor of Georgia's law requiring parental consent for minors' social-media accounts and age verification, part of a national wave of child-online-safety measures.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Jason_Anavitarte" } },
    { topic:"Gun Rights", icon:"🔫", pos:"support", issueKey:"gun_rights", issueStance:"support",
      text:"A supporter of Georgia's permitless 'constitutional carry' and Second Amendment protections.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Jason_Anavitarte" } }
  ],
  "harold_jones_ga": [
    { topic:"Senate Democratic Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Minority (Democratic) Leader of the Georgia Senate, leading the Democratic caucus from an Augusta district (District 22).",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Harold_Jones_II" } },
    { topic:"Criminal-Justice Reform", icon:"⚖️", pos:"support", issueKey:"justice_reform", issueStance:"support",
      text:"A criminal-defense attorney who sponsors sentencing, bail and second-chance reforms.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Harold_Jones_II" } },
    { topic:"Medicaid Expansion", icon:"🏥", pos:"support", issueKey:"healthcare", issueStance:"support",
      text:"Backs full Medicaid expansion to cover more low-income Georgians — a long-standing Democratic priority the state has declined.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Harold_Jones_II" } }
  ],

  /* ── NORTH CAROLINA ──────────────────────────────────────────────────── */
  "michael_lee_nc": [
    { topic:"Senate Majority Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Majority Leader of the Republican-controlled North Carolina Senate, a Wilmington attorney (District 7) and one of the chamber's lead education and budget writers.",
      source:{ label:"NC General Assembly", url:"https://www.ncleg.gov/Members/Leadership/S" } },
    { topic:"School Vouchers", icon:"🎓", pos:"support", issueKey:"school_choice", issueStance:"support",
      text:"A principal architect of the expansion of North Carolina's Opportunity Scholarships private-school voucher program to all income levels.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Michael_V._Lee" } },
    { topic:"Income-Tax Phase-Down", icon:"💰", pos:"support", issueKey:"lower_taxes", issueStance:"support",
      text:"Supports the Senate plan to continue phasing down North Carolina's personal income-tax rate.",
      source:{ label:"NC General Assembly", url:"https://www.ncleg.gov/Members/Leadership/S" } }
  ],
  "sydney_batch": [
    { topic:"Senate Democratic Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Minority (Democratic) Leader of the North Carolina Senate since 2025, an attorney and social worker from Wake County (District 17); she is a breast-cancer survivor who centers health and family issues.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Sydney_Batch" } },
    { topic:"Abortion Rights", icon:"⚖️", pos:"support", issueKey:"pro_choice", issueStance:"support",
      text:"Led Democratic opposition to the 2023 law banning most abortions after 12 weeks, which passed over Gov. Cooper's veto.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Sydney_Batch" } },
    { topic:"Health & Family", icon:"🏥", pos:"support", issueKey:"healthcare", issueStance:"support",
      text:"Champions health-care access, child welfare and paid leave from her background as a family-law attorney and social worker.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Sydney_Batch" } }
  ],
  "ralph_hise": [
    { topic:"Redistricting Architect", icon:"🗺", pos:"mixed", issueKey:"election_integrity", issueStance:"mixed",
      text:"A lead architect of North Carolina's Republican redistricting plans, which have been repeatedly litigated over partisan- and racial-gerrymandering claims; he co-chairs the Senate's redistricting and elections work.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Ralph_Hise" } },
    { topic:"Berger Ally & Deputy Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Deputy President pro Tempore and a longtime ally of Phil Berger, named among possible successors as the chamber's top leader.",
      source:{ label:"NC General Assembly", url:"https://www.ncleg.gov/Members/Leadership/S" } },
    { topic:"Taxes & Budget", icon:"💰", pos:"support", issueKey:"lower_taxes", issueStance:"support",
      text:"A senior finance voice backing the Senate's income-tax reductions from his western North Carolina district (District 47).",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Ralph_Hise" } }
  ],

  /* ── MICHIGAN ────────────────────────────────────────────────────────── */
  "aric_nesbitt": [
    { topic:"Senate GOP Leader Running for Governor", icon:"🗳", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Minority Leader of the Michigan Senate and a candidate for the Republican gubernatorial nomination in 2026, representing a southwest Michigan district (District 20).",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Aric_Nesbitt" } },
    { topic:"Taxes & Roads", icon:"💰", pos:"support", issueKey:"lower_taxes", issueStance:"support",
      text:"Pushes income-tax relief and funding roads without tax increases, opposing the Democratic majority's spending priorities.",
      source:{ label:"MI Senate Republicans", url:"https://misenategop.com/senators/nesbitt/" } },
    { topic:"Energy Production", icon:"⛽", pos:"support", issueKey:"energy_production", issueStance:"support",
      text:"Opposed the 2023 law mandating 100% clean energy by 2040, arguing for an all-of-the-above approach including natural gas.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Aric_Nesbitt" } }
  ],
  "jeremy_moss": [
    { topic:"First Openly Gay MI Senator", icon:"🏳️‍🌈", pos:"support", issueKey:"lgbtq_rights", issueStance:"support",
      text:"The first openly gay member of the Michigan Senate; he sponsored the 2023 expansion of the Elliott-Larsen Civil Rights Act to protect sexual orientation and gender identity.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Jeremy_Moss" } },
    { topic:"Government Transparency", icon:"🔍", pos:"support", issueKey:"gov_transparency", issueStance:"support",
      text:"A leading advocate for opening the Legislature and governor's office to public-records law — Michigan is one of the few states that exempt them from FOIA.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Jeremy_Moss" } },
    { topic:"Voting Access", icon:"📩", pos:"support", issueKey:"voting_access", issueStance:"support",
      text:"As President pro Tempore and elections-committee leader, sponsored early-voting and elections-modernization measures.",
      source:{ label:"Michigan Senate Democrats", url:"https://senatedems.com/moss/" } }
  ]

  };
  Object.keys(X).forEach(function (k) { S[k] = X[k]; });
})();
