/* PolitiDex stance data — STATE SENATE wave 4 (New Jersey, Virginia, Arizona, Washington).
   ---------------------------------------------------------------------------------
   Additive module, same contract as waves 1–3. Augments the shared
   window.ISSUE_STANCE_DATA object so every consumer (My Stances "Your Stance vs
   Their Record", the Say-vs-Do engine, the Alignment Tool, Stance-at-a-Glance)
   lights these senators up automatically.

   CONTROVERSY-FIRST: each entry leads with the defining or most divisive item on
   the official's public record, then the substantive positions anchoring their
   tenure. Neutrally worded; every stance carries a real {label,url} source;
   issueKey values are canonical (ISSUE_MAP in alignment-tool.js).

   Scope note: Nicholas Scutari and Warren Petersen already ship curated stances
   (ext), so they are NOT redefined here (this module only ADDS, never overwrites)
   — they are enriched with sourced bios in cmp-data-detail.js instead. This wave
   contributes 11 new sourced profiles.

   Loaded with `defer` after the core/ext chunks; pure data (no functions). */
(function () {
  'use strict';
  var S = window.ISSUE_STANCE_DATA || (window.ISSUE_STANCE_DATA = {});
  var X = {

  /* ── NEW JERSEY ──────────────────────────────────────────────────────── */
  "teresa_ruiz": [
    { topic:"Highest-Ranking Latina in NJ History", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Senate Majority Leader and the highest-ranking Latina in the history of the New Jersey Legislature, reelected to the post for the 2026-27 session.",
      source:{ label:"NJ Senate Democrats", url:"https://www.njsendems.org/m/newsflash/home/detail/1017" } },
    { topic:"Education Reform", icon:"🎓", pos:"support", issueKey:"public_schools", issueStance:"support",
      text:"A longtime education-committee leader who wrote New Jersey's expansion of state-funded preschool and overhauled the teacher-tenure system.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/M._Teresa_Ruiz" } },
    { topic:"Working Families", icon:"🔧", pos:"support", issueKey:"econ_workers", issueStance:"support",
      text:"Focuses on child care, literacy and workforce measures aimed at working- and middle-class families.",
      source:{ label:"NJ Senate Democrats", url:"https://www.njsendems.org/m/newsflash/home/detail/1017" } }
  ],
  "anthony_bucco": [
    { topic:"Senate Republican Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Minority (Republican) Leader of the New Jersey Senate since 2023, representing the 25th Legislative District; he succeeded to the seat once held by his late father.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Anthony_M._Bucco" } },
    { topic:"Affordability & Taxes", icon:"💰", pos:"support", issueKey:"lower_taxes", issueStance:"support",
      text:"Centers New Jersey's high property taxes and cost of living, pressing for tax relief and spending restraint.",
      source:{ label:"NJ Senate Republicans", url:"https://www.senatenj.com/m/newsflash/home/detail/1003" } },
    { topic:"Public Safety", icon:"🚔", pos:"support", issueKey:"tough_on_crime", issueStance:"support",
      text:"Backs law-enforcement funding and tougher penalties as a counter to the majority's criminal-justice approach.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Anthony_M._Bucco" } }
  ],

  /* ── VIRGINIA ────────────────────────────────────────────────────────── */
  "louise_lucas": [
    { topic:"FBI Search Warrant", icon:"🔍", pos:"mixed", issueKey:"gov_transparency", issueStance:"mixed",
      text:"In May 2026 the FBI executed a criminal search warrant tied to the office of Sen. Lucas, one of Virginia's most powerful lawmakers; the underlying matter was under investigation and she had not been charged.",
      source:{ label:"WDBJ7", url:"https://www.wdbj7.com/2026/05/06/fbi-executes-criminal-search-warrant-tied-va-sen-louise-lucas/" } },
    { topic:"First to Lead the Chamber", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"President pro Tempore since 2020 and chair of the powerful Finance and Appropriations Committee — the first woman and first African American to lead the Virginia Senate, with 34 years of service.",
      source:{ label:"Cardinal News", url:"https://cardinalnews.org/2026/05/07/6-things-to-know-about-the-fbi-raid-on-louise-lucass-office/" } },
    { topic:"Blocked the Arena Subsidy", icon:"🏟", pos:"support", issueKey:"gov_waste", issueStance:"support",
      text:"Used her Finance chairmanship to block Gov. Youngkin's proposed multibillion-dollar public subsidy for a Washington-teams sports arena in Northern Virginia.",
      source:{ label:"VPM", url:"https://www.vpm.org/generalassembly/2026-06-22/va-budget-lucas-scott-spanberger-sturtevant-data-center-taxes-retail-weed" } }
  ],
  "scott_surovell": [
    { topic:"Senate Majority Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Majority Leader of the Virginia Senate since 2024, a trial lawyer representing a Fairfax-area district (District 34).",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Scott_Surovell" } },
    { topic:"Criminal-Justice Reform", icon:"⚖️", pos:"support", issueKey:"justice_reform", issueStance:"support",
      text:"A leading voice in Virginia's abolition of the death penalty and in sentencing, parole and policing reforms.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Scott_Surovell" } },
    { topic:"Clean Energy", icon:"🌱", pos:"support", issueKey:"climate_action", issueStance:"support",
      text:"Champions clean-energy and environmental measures, including protections for the Chesapeake Bay watershed.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Scott_Surovell" } }
  ],
  "ryan_mcdougle": [
    { topic:"Senate Republican Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Minority (Republican) Leader of the Virginia Senate since 2024, a longtime lawmaker from the Hanover County area.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Ryan_McDougle" } },
    { topic:"Taxes & Spending", icon:"💰", pos:"support", issueKey:"lower_taxes", issueStance:"support",
      text:"Presses for tax cuts and spending restraint as leader of the Senate Republican caucus.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Ryan_McDougle" } },
    { topic:"Abortion", icon:"⚖️", pos:"support", issueKey:"pro_life", issueStance:"support",
      text:"Opposes expanding abortion access and has voted against efforts to enshrine it in Virginia's constitution.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Ryan_McDougle" } }
  ],

  /* ── ARIZONA ─────────────────────────────────────────────────────────── */
  "priya_sundareshan": [
    { topic:"Senate Democratic Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Minority (Democratic) Leader of the Arizona Senate since 2025, an environmental and natural-resources attorney from Tucson (District 18).",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Priya_Sundareshan" } },
    { topic:"Water & Drought", icon:"💧", pos:"support", issueKey:"water", issueStance:"support",
      text:"Centers Arizona's groundwater and Colorado River shortages, pushing stronger water-management rules amid drought.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Priya_Sundareshan" } },
    { topic:"Abortion Rights", icon:"⚖️", pos:"support", issueKey:"pro_choice", issueStance:"support",
      text:"Backed repeal of Arizona's Civil War-era abortion ban and supports protecting abortion access.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Priya_Sundareshan" } }
  ],
  "wendy_rogers": [
    { topic:"Censured by the Senate", icon:"⚠️", pos:"oppose", issueKey:"election_integrity", issueStance:"oppose",
      text:"A leading promoter of 2020 election-fraud claims and the Cyber Ninjas 'audit'; the Arizona Senate formally censured her in 2022 after a speech calling for political violence and over ties to white-nationalist figures.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Wendy_Rogers" } },
    { topic:"Border & Immigration", icon:"🛡", pos:"support", issueKey:"border_security", issueStance:"support",
      text:"Represents a northern Arizona district (District 7) and is among the chamber's most hardline voices on border security and immigration enforcement.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Wendy_Rogers" } },
    { topic:"Gun Rights", icon:"🔫", pos:"support", issueKey:"gun_rights", issueStance:"support",
      text:"A consistent opponent of gun-control measures and vocal Second Amendment supporter.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Wendy_Rogers" } }
  ],
  "jake_hoffman": [
    { topic:"Indicted 'Fake Elector'", icon:"⚖️", pos:"oppose", issueKey:"election_integrity", issueStance:"oppose",
      text:"Indicted in Arizona in 2024 as one of the Republicans who signed a false slate of 2020 presidential electors for Donald Trump; he has pleaded not guilty. He founded and chairs the Arizona Freedom Caucus.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Jake_Hoffman_(politician)" } },
    { topic:"Border & Immigration", icon:"🛡", pos:"support", issueKey:"border_security", issueStance:"support",
      text:"A hardline border-enforcement advocate representing a Gilbert-area district (District 15).",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Jake_Hoffman_(Arizona)" } },
    { topic:"Taxes & Spending", icon:"💰", pos:"support", issueKey:"lower_taxes", issueStance:"support",
      text:"Pushes tax cuts and limits on state spending as a leader of the chamber's conservative bloc.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Jake_Hoffman_(Arizona)" } }
  ],

  /* ── WASHINGTON ──────────────────────────────────────────────────────── */
  "jamie_pedersen": [
    { topic:"Senate Majority Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Majority Leader of the Washington State Senate since 2025, a Seattle attorney (District 43) and one of the state's most senior openly gay lawmakers.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Jamie_Pedersen" } },
    { topic:"Marriage Equality & LGBTQ Rights", icon:"🏳️‍🌈", pos:"support", issueKey:"lgbtq_rights", issueStance:"support",
      text:"A lead sponsor of Washington's marriage-equality law and other LGBTQ civil-rights measures.",
      source:{ label:"Sen. Jamie Pedersen", url:"https://senatedemocrats.wa.gov/pedersen/" } },
    { topic:"Housing Supply", icon:"🏗", pos:"support", issueKey:"housing_build", issueStance:"support",
      text:"Backs the majority's push to legalize denser 'missing middle' housing statewide to ease the cost of living.",
      source:{ label:"Sen. Jamie Pedersen", url:"https://senatedemocrats.wa.gov/pedersen/" } }
  ],
  "john_braun": [
    { topic:"GOP Leader Running for Congress", icon:"🗳", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Minority (Republican) Leader of the Washington Senate since 2021 and, as of August 2025, a candidate for the U.S. House in Washington's 3rd District in 2026; he represents a southwest Washington district (District 20).",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/John_Braun" } },
    { topic:"Taxes & Affordability", icon:"💰", pos:"support", issueKey:"lower_taxes", issueStance:"support",
      text:"A leading critic of new state taxes, pressing affordability and opposition to the majority's revenue increases.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/John_Braun_(Washington)" } },
    { topic:"Business & Jobs", icon:"🏭", pos:"support", issueKey:"econ_smallbiz", issueStance:"support",
      text:"A business owner who focuses on regulatory relief and job growth for employers.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/John_Braun_(Washington)" } }
  ],
  "manka_dhingra": [
    { topic:"Behavioral-Health Leader", icon:"🧠", pos:"support", issueKey:"health_mental", issueStance:"support",
      text:"A senior King County prosecutor and Deputy Majority Leader who has made mental-health and behavioral-health courts and crisis response her signature issue.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Manka_Dhingra" } },
    { topic:"Senate Leadership", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Deputy Majority Leader in the Washington Senate (District 45) and the first South Asian American elected to the chamber; she ran for state attorney general in 2024.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Manka_Dhingra" } },
    { topic:"Criminal-Justice Reform", icon:"⚖️", pos:"support", issueKey:"justice_reform", issueStance:"support",
      text:"Leads on justice-system changes emphasizing diversion, treatment and gun-safety measures.",
      source:{ label:"Sen. Manka Dhingra", url:"https://senatedemocrats.wa.gov/dhingra/" } }
  ]

  };
  Object.keys(X).forEach(function (k) { S[k] = X[k]; });
})();
