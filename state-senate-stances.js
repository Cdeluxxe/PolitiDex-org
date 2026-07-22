/* PolitiDex stance data — STATE SENATE wave 1 (California, Texas, New York, Florida).
   ---------------------------------------------------------------------------------
   Additive module. Augments the SAME window.ISSUE_STANCE_DATA object that
   politician-stances-core.js / -ext.js populate, so every existing consumer
   (My Stances "Your Stance vs Their Record", the Say-vs-Do engine, the Alignment
   Tool, Stance-at-a-Glance) lights these officials up with no other change.

   Each entry is CONTROVERSY-FIRST: the first stance is the defining or most
   divisive item on the official's public record, followed by the substantive
   positions that anchor their tenure. Every stance is neutrally worded and
   carries a real {label,url} source. issueKey values are drawn from the
   canonical ISSUE_MAP (alignment-tool.js) so they line up one-to-one with a
   visitor's saved stances.

   Scope note: Bryan Hughes, Mike McGuire, Ben Albritton and Andrea
   Stewart-Cousins already ship curated stances in politician-stances-ext.js, so
   they are intentionally NOT redefined here (this module only ADDS, never
   overwrites). This wave contributes 10 new sourced state-senator profiles.

   Loaded with `defer` after the core/ext chunks; pure data (no functions). */
(function () {
  'use strict';
  var S = window.ISSUE_STANCE_DATA || (window.ISSUE_STANCE_DATA = {});
  var X = {

  /* ── CALIFORNIA ──────────────────────────────────────────────────────── */
  "limon_ca": [
    { topic:"Next Senate Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Chosen by the Senate Democratic Caucus as the next President pro Tempore of the California State Senate, with the leadership transition set for 2026.",
      source:{ label:"California State Senate", url:"https://sd02.senate.ca.gov/news/senate-leader-mcguire-announces-agreement-reached-pro-tem-designee-transition-occur-2026" } },
    { topic:"Consumer Financial Protection", icon:"💵", pos:"support", issueKey:"econ_corp_account", issueStance:"support",
      text:"Built her record chairing the Senate Banking and Financial Institutions Committee, focused on oversight of lenders and debt collectors and on consumer financial protection.",
      source:{ label:"California State Senate", url:"https://www.senate.ca.gov/" } },
    { topic:"Housing Supply", icon:"🏠", pos:"support", issueKey:"housing_build", issueStance:"support",
      text:"Backs state action to expand housing supply and affordability along the Santa Barbara–Ventura coast she represents.",
      source:{ label:"California State Senate", url:"https://www.senate.ca.gov/" } }
  ],
  "wiener_ca": [
    { topic:"Landmark AI-Safety Bill (SB 1047)", icon:"🤖", pos:"support", issueKey:"tech_innovation", issueStance:"mixed",
      text:"Authored SB 1047, a first-of-its-kind bill requiring safety testing of the most powerful AI models; it passed the Legislature in 2024 but was vetoed by Gov. Gavin Newsom, drawing national debate over how to regulate AI.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Scott_Wiener" } },
    { topic:"Pro-Housing (YIMBY)", icon:"🏗", pos:"support", issueKey:"housing_build", issueStance:"support",
      text:"A leading pro-housing voice who has authored major laws to override local limits on homebuilding and speed approvals to address California's housing shortage.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Scott_Wiener" } },
    { topic:"Public Transit Funding", icon:"🚆", pos:"support", issueKey:"transit", issueStance:"support",
      text:"Champions state funding to prevent service cuts to Bay Area transit systems such as BART and Muni.",
      source:{ label:"Senator Scott Wiener", url:"https://sd11.senate.ca.gov/" } },
    { topic:"LGBTQ Rights", icon:"🏳️‍🌈", pos:"support", issueKey:"lgbtq_rights", issueStance:"support",
      text:"An openly gay legislator who has authored bills on LGBTQ civil rights and health.",
      source:{ label:"Senator Scott Wiener", url:"https://sd11.senate.ca.gov/" } }
  ],
  "bjones_ca": [
    { topic:"Senate Republican Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Leads the California Senate's Republican minority as Senate Republican Leader, representing an East San Diego County district.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Brian_Jones_(California)" } },
    { topic:"Cost of Living & Taxes", icon:"💰", pos:"support", issueKey:"lower_taxes", issueStance:"support",
      text:"Centers affordability, gas prices and opposition to tax increases as the state's cost of living rises.",
      source:{ label:"California State Senate", url:"https://www.senate.ca.gov/" } },
    { topic:"Public Safety", icon:"🚔", pos:"support", issueKey:"tough_on_crime", issueStance:"support",
      text:"Backs tougher penalties for theft and fentanyl offenses and rollbacks of earlier sentencing-reduction measures.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Brian_Jones_(California)" } }
  ],

  /* ── TEXAS ───────────────────────────────────────────────────────────── */
  "bettencourt_tx": [
    { topic:"Property-Tax Cuts", icon:"🏠", pos:"support", issueKey:"property_tax", issueStance:"support",
      text:"The Senate's lead voice on property-tax relief, authoring multibillion-dollar homestead-exemption increases and tax-cut packages.",
      source:{ label:"Texas Senate", url:"https://senate.texas.gov/press.php?id=7-20260323a" } },
    { topic:"Higher Education Chair", icon:"🎓", pos:"support", issueKey:"school_choice", issueStance:"support",
      text:"Named Chair of the Senate Higher Education Committee for 2026; a backer of school-choice education savings accounts.",
      source:{ label:"Lt. Gov. Dan Patrick", url:"https://www.ltgov.texas.gov/2026/03/23/lt-gov-dan-patrick-announces-new-chairs-of-standing-committees-fills-vacancies-and-creates-interim-select-committees/" } },
    { topic:"Taxpayer Watchdog Brand", icon:"🧹", pos:"support", issueKey:"gov_waste", issueStance:"support",
      text:"A former Harris County Tax Assessor-Collector who campaigns as a taxpayer watchdog focused on cutting government cost.",
      source:{ label:"Texas Senate", url:"https://senate.texas.gov/members.php" } }
  ],
  "paxton_tx": [
    { topic:"Conflict-of-Interest Scrutiny (SB 860)", icon:"🔍", pos:"mixed", issueKey:"econ_corp_account", issueStance:"mixed",
      text:"Introduced Senate Bill 860 (2019) that would have let the state securities regulator — overseen by her husband, then-Attorney General Ken Paxton — grant exemptions from securities rules; critics called it a conflict of interest.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Angela_Paxton" } },
    { topic:"Economic Development Chair", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Named Chair of the Senate Committee on Economic Development for 2026 by Lt. Gov. Dan Patrick.",
      source:{ label:"Lt. Gov. Dan Patrick", url:"https://www.ltgov.texas.gov/2026/03/23/lt-gov-dan-patrick-announces-new-chairs-of-standing-committees-fills-vacancies-and-creates-interim-select-committees/" } },
    { topic:"Education", icon:"🎓", pos:"support", issueKey:"school_choice", issueStance:"support",
      text:"A former public-school counselor who backs school-choice and parental-rights measures in education.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Angela_Paxton" } }
  ],
  "gutierrez_tx": [
    { topic:"Uvalde & Gun Safety", icon:"🕯", pos:"support", issueKey:"gun_safety", issueStance:"support",
      text:"Represents Uvalde and became a leading gun-safety advocate after the 2022 Robb Elementary shooting, pressing to raise the purchase age for semi-automatic rifles; he ran for U.S. Senate in 2024.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Roland_Gutierrez" } },
    { topic:"Accountability for the Shooting Response", icon:"⚖️", pos:"support", issueKey:"justice_reform", issueStance:"support",
      text:"Pushed for transparency and accountability over the delayed law-enforcement response to the Uvalde shooting.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Roland_Gutierrez" } },
    { topic:"Medicaid & Health Access", icon:"🏥", pos:"support", issueKey:"healthcare", issueStance:"support",
      text:"Supports expanding Medicaid and health-care access in Texas.",
      source:{ label:"Texas Senate", url:"https://senate.texas.gov/members.php" } }
  ],

  /* ── NEW YORK ────────────────────────────────────────────────────────── */
  "gianaris_ny": [
    { topic:"Blocked Amazon's HQ2", icon:"📦", pos:"support", issueKey:"econ_corp_account", issueStance:"support",
      text:"As Deputy Majority Leader, led the 2019 opposition that drove Amazon to cancel its planned HQ2 campus in Long Island City, Queens, over the incentives package.",
      source:{ label:"City & State New York", url:"https://www.cityandstateny.com/politics/2026/02/gianaris-will-not-run-reelection/411298/" } },
    { topic:"Bail Reform", icon:"⚖️", pos:"support", issueKey:"justice_reform", issueStance:"support",
      text:"A principal architect of New York's 2019 bail-reform law that ended cash bail for many offenses.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Michael_Gianaris" } },
    { topic:"Retiring After 25+ Years", icon:"🗓", pos:"mixed", issueKey:"gov_services", issueStance:"mixed",
      text:"Announced he will not seek reelection and will retire at the end of 2026 after more than 25 years representing western Queens.",
      source:{ label:"City & State New York", url:"https://www.cityandstateny.com/politics/2026/02/gianaris-will-not-run-reelection/411298/" } }
  ],
  "ortt_ny": [
    { topic:"Senate Minority Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Leads the New York Senate's Republican conference as Minority Leader since 2020, representing the Niagara/western New York region.",
      source:{ label:"NY State Senate", url:"https://www.nysenate.gov/senate-leadership" } },
    { topic:"Affordability & Taxes", icon:"💰", pos:"support", issueKey:"lower_taxes", issueStance:"support",
      text:"Centers affordability, high taxes and out-migration from New York, opposing tax increases.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Rob_Ortt" } },
    { topic:"Rollback of Bail Reform", icon:"🚔", pos:"support", issueKey:"tough_on_crime", issueStance:"support",
      text:"A leading critic of the 2019 bail-reform law who has pushed to restore judicial discretion and toughen public-safety rules.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Rob_Ortt" } }
  ],

  /* ── FLORIDA ─────────────────────────────────────────────────────────── */
  "pizzo_fl": [
    { topic:"Left the Democratic Party", icon:"🔀", pos:"mixed", issueKey:"gov_services", issueStance:"mixed",
      text:"As Senate Democratic Leader, abruptly left the Democratic Party on the Senate floor in 2025, calling the state party 'dead' and registering with no party affiliation; he is running for Governor in 2026 as an independent.",
      source:{ label:"WUSF", url:"https://www.wusf.org/politics-issues/2025-05-12/florida-senator-jason-pizzo-says-he-plans-to-run-for-governor-in-2026" } },
    { topic:"Independent Governor Bid", icon:"🗳", pos:"support", issueKey:"democracy_balance", issueStance:"mixed",
      text:"Framing his no-party-affiliation run as freeing him from party labels, he entered a crowded 2026 governor's field against both major parties.",
      source:{ label:"Florida Phoenix", url:"https://floridaphoenix.com/2025/01/24/2026-gubernatorial-race-jason-pizzo-says-he-wouldnt-run-as-an-independent/" } },
    { topic:"Former Prosecutor on Public Safety", icon:"⚖️", pos:"mixed", issueKey:"gun_balance", issueStance:"mixed",
      text:"A former prosecutor who has emphasized public safety and taken a middle position on gun policy.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Jason_Pizzo" } }
  ],
  "passidomo_fl": [
    { topic:"Live Local Act (Housing)", icon:"🏗", pos:"support", issueKey:"housing_build", issueStance:"support",
      text:"As Senate President (2022–2024), championed the 2023 'Live Local Act,' Florida's largest-ever investment in workforce and affordable housing, with incentives to build homes near jobs.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Kathleen_Passidomo" } },
    { topic:"Former Senate President", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"A Naples Republican who served as Senate President before Ben Albritton and remains a senior voice in the chamber.",
      source:{ label:"The Florida Senate", url:"https://www.flsenate.gov/" } },
    { topic:"Cost of Living & Insurance", icon:"💰", pos:"support", issueKey:"cost_living", issueStance:"support",
      text:"Prioritized property-insurance market stability and affordability as costs rose across Florida.",
      source:{ label:"The Florida Senate", url:"https://www.flsenate.gov/" } }
  ]

  };
  Object.keys(X).forEach(function (k) { S[k] = X[k]; });
})();
