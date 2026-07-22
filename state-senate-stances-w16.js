/* PolitiDex stance data — STATE SENATE wave 16 (DEPTH phase: Illinois & Pennsylvania).
   ---------------------------------------------------------------------------------
   Deepening two more large, competitive chambers beyond leadership — Illinois and
   Pennsylvania — with committee chairs and high-profile rank-and-file senators
   who sit beyond the members already profiled (IL: Lightford, Curran, Peters;
   PA: Pittman, Mastriano, Sharif Street).

   Additive module, same contract as prior waves. Augments the shared
   window.ISSUE_STANCE_DATA object so every consumer (My Stances "Your Stance vs
   Their Record", the Say-vs-Do engine, the Alignment Tool, Stance-at-a-Glance, and
   the Government Contracting "by state" ties) lights these senators up automatically.

   Uses a `_state` suffix key convention and was checked against every existing key
   to guarantee no duplication. Controversy-first; every stance carries a real
   {label,url} source; issueKey values are canonical. This wave adds 12 profiles and
   only ADDS keys — it never overwrites one.

   Loaded with `defer` after the core/ext chunks; pure data (no functions). */
(function () {
  'use strict';
  var S = window.ISSUE_STANCE_DATA || (window.ISSUE_STANCE_DATA = {});
  var X = {

  /* ── ILLINOIS ────────────────────────────────────────────────────────── */
  "harmon_il": [
    { topic:"Beat a Record $9.8M Campaign-Finance Fine", icon:"💸", pos:"mixed", issueKey:"gov_transparency", issueStance:"mixed",
      text:"Senate President whose campaign fund was hit with a record ~$9.8M fine by elections-board staff for accepting roughly $4M over the limits — under a law he co-sponsored — via a 'self-funding' loophole; the board deadlocked 4-4 on party lines in 2025 and the penalty was dropped.",
      source:{ label:"Capitol News Illinois", url:"https://capitolnewsillinois.com/news/elections-board-deadlocks-on-10m-fine-for-senate-president-don-harmon/" } },
    { topic:"Senate President", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"An Oak Park Democrat who has led the Senate since 2020 and is the chief fundraiser for the Democratic supermajority, regularly transferring money to colleagues' campaigns.",
      source:{ label:"WTTW", url:"https://news.wttw.com/2025/11/18/illinois-senate-president-don-harmon-avoids-10m-fine-after-election-board-deadlocks" } },
    { topic:"Democratic Agenda Setter", icon:"🗳", pos:"support", issueKey:"gov_balance", issueStance:"support",
      text:"Controls which bills reach the floor in a chamber where Democrats hold a wide majority, making him a central force in Springfield.",
      source:{ label:"Chicago Sun-Times", url:"https://chicago.suntimes.com/springfield/2025/11/18/don-harmon-campaign-fine-illinois-state-election-board-deadlock" } }
  ],
  "sims_il": [
    { topic:"Quarterbacked the End of Cash Bail", icon:"⚖️", pos:"support", issueKey:"justice_reform", issueStance:"support",
      text:"Lead Senate sponsor of the SAFE-T Act, which in 2023 made Illinois the first state to fully eliminate cash bail; he defends its risk-based pretrial system against repeated attacks and proposed rollbacks.",
      source:{ label:"Illinois Senate Democrats", url:"https://www.illinoissenatedemocrats.com/caucus-news/42-senator-elgie-r-sims-jr-news/6488-sims-the-safe-t-act-is-based-on-risk-not-riches" } },
    { topic:"Senate Budget Chair", icon:"💵", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"A Chicago Democrat who leads Senate appropriations, steering the state budget for the majority caucus.",
      source:{ label:"WTTW", url:"https://news.wttw.com/2026/05/11/safe-t-act-once-again-under-microscope-following-killing-cpd-officer-state-lawmakers" } },
    { topic:"Defends Judicial Discretion", icon:"👨‍⚖️", pos:"support", issueKey:"gov_balance", issueStance:"support",
      text:"Argues that stripping judges of pretrial discretion — as some Republicans propose after high-profile crimes — undermines the reform's core goal.",
      source:{ label:"WTTW", url:"https://news.wttw.com/2026/05/11/safe-t-act-once-again-under-microscope-following-killing-cpd-officer-state-lawmakers" } }
  ],
  "martwick_il": [
    { topic:"Architect of Chicago's Elected School Board", icon:"🏫", pos:"support", issueKey:"public_schools", issueStance:"support",
      text:"A Chicago Teachers Union ally and chief sponsor of the 2021 law ending mayoral control of Chicago Public Schools and phasing in a fully elected school board by 2027.",
      source:{ label:"Chalkbeat", url:"https://www.chalkbeat.org/chicago/2026/02/24/chicago-public-schools-concerned-about-pension-bills/" } },
    { topic:"Senate Pensions Chair", icon:"💰", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"A Chicago Democrat who chairs the Pensions Committee and is pushing to untangle Chicago's and CPS's finances — including shifting teacher-pension costs to the state.",
      source:{ label:"Chalkbeat", url:"https://www.chalkbeat.org/chicago/2026/02/24/chicago-public-schools-concerned-about-pension-bills/" } },
    { topic:"Property Taxes", icon:"🏠", pos:"support", issueKey:"property_tax", issueStance:"support",
      text:"A former House member who has centered property-tax and local-government finance issues on the Northwest Side.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Robert_Martwick" } }
  ],
  "rezin_il": [
    { topic:"Champion of Lifting the Nuclear Ban", icon:"☢️", pos:"support", issueKey:"energy_production", issueStance:"support",
      text:"A leading nuclear advocate who led the 2023 bipartisan effort to lift Illinois' decades-old ban on small modular reactors and is pressing to repeal the full moratorium on new plants, earning national recognition from the nuclear industry.",
      source:{ label:"World Nuclear News", url:"https://world-nuclear-news.org/Articles/Illinois-to-lift-moratorium-on-nuclear-constructio" } },
    { topic:"Energy Reliability", icon:"⚡", pos:"support", issueKey:"gov_balance", issueStance:"support",
      text:"A Morris Republican (District 38) from a district with nuclear plants who frames reactors as essential to grid reliability and clean-energy goals.",
      source:{ label:"Sen. Sue Rezin", url:"https://senatorrezin.com/2025/06/03/meta-constellation-agreement-reinforces-need-to-lift-illinois-ban-on-new-nuclear-reactors/" } },
    { topic:"Republican Energy Voice", icon:"🏭", pos:"support", issueKey:"econ_growth", issueStance:"support",
      text:"Casts new nuclear as an economic-development and jobs driver amid rising data-center power demand.",
      source:{ label:"Nuclear Newswire (ANS)", url:"https://www.ans.org/news/2025-03-25/article-6892/state-legislation-illinois-bill-aims-to-lift-states-remaining-nuclear-moratorium/" } }
  ],
  "villivalam_il": [
    { topic:"First Asian American in the Legislature", icon:"🌏", pos:"support", issueKey:"immigration_reform", issueStance:"support",
      text:"A Chicago Democrat (District 8), the first Asian American and Indian American elected to the Illinois General Assembly, who centers immigrant-community and civil-rights issues.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Ram_Villivalam" } },
    { topic:"Transportation Chair Remaking Transit", icon:"🚆", pos:"support", issueKey:"transit", issueStance:"support",
      text:"Chairs the Transportation Committee and is leading the overhaul of Chicago-area transit governance through the Northern Illinois Transit Authority Act.",
      source:{ label:"State Senator Ram Villivalam", url:"http://www.senatorram.com/biography" } },
    { topic:"Gig-Worker Rights", icon:"🚗", pos:"support", issueKey:"econ_workers", issueStance:"support",
      text:"Backed legislation to let Illinois rideshare drivers unionize, siding with labor in the gig economy.",
      source:{ label:"Illinois Senate Democrats", url:"https://www.illinoissenatedemocrats.com/caucus-news/46-senator-ram-villivalam-news" } }
  ],
  "simmons_il": [
    { topic:"First Openly LGBTQ+ Illinois Senator", icon:"🏳️‍🌈", pos:"support", issueKey:"lgbtq_rights", issueStance:"support",
      text:"A Chicago Democrat, the first openly LGBTQ+ person and first Black senator from his North Side district, who has centered equity and anti-poverty policy.",
      source:{ label:"State Senator Mike Simmons", url:"https://pluralpolicy.com/app/person/1766" } },
    { topic:"Guaranteed Income", icon:"💵", pos:"support", issueKey:"econ_workers", issueStance:"support",
      text:"A proponent of guaranteed-income pilots and direct cash assistance as anti-poverty tools.",
      source:{ label:"Illinois Senate Democrats", url:"https://www.illinoissenatedemocrats.com/caucus-news/46-senator-ram-villivalam-news" } },
    { topic:"Environmental Justice", icon:"🌱", pos:"support", issueKey:"climate_action", issueStance:"support",
      text:"Focuses on environmental-justice and clean-air measures for dense urban communities.",
      source:{ label:"Plural", url:"https://pluralpolicy.com/app/person/1766" } }
  ],

  /* ── PENNSYLVANIA ────────────────────────────────────────────────────── */
  "kim_ward_pa": [
    { topic:"First Woman to Lead the PA Senate", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"President pro Tempore and the first woman in Pennsylvania history to serve as both Senate Majority Leader and President pro Tempore; she briefly served as acting lieutenant governor in early 2023 after John Fetterman's departure.",
      source:{ label:"Pittsburgh Post-Gazette", url:"https://post-gazette.com/news/election2022/2022/11/15/kim-ward-pennsylvania-senate-president-pro-tempore-first-woman-state-senator-elected-office/stories/202211150111" } },
    { topic:"Steering a Divided Government", icon:"⚖️", pos:"mixed", issueKey:"gov_balance", issueStance:"mixed",
      text:"A Westmoreland County Republican (District 39) who runs the GOP-controlled Senate opposite a Democratic governor and House, a recipe for repeated budget standoffs.",
      source:{ label:"The Philadelphia Inquirer", url:"https://www.inquirer.com/politics/pennsylvania/kim-ward-senate-president-pro-tempore-breast-cancer-first-woman-harrisburg-20221212.html" } },
    { topic:"Health & Personal Story", icon:"🎀", pos:"support", issueKey:"healthcare", issueStance:"support",
      text:"A former nurse and breast-cancer survivor who has spoken about her diagnosis while leading the chamber.",
      source:{ label:"Sen. Kim Ward", url:"https://senatorward.com/biography/" } }
  ],
  "costa_pa": [
    { topic:"Two Decades as Democratic Leader", icon:"🔵", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Senate Democratic Leader from Allegheny County who has led his caucus through years of Republican control, negotiating budgets and transit funding from the minority.",
      source:{ label:"PA Senate Democrats", url:"https://pasenate.com/senate-democratic-leader-jay-costa-appropriations-chair-vincent-hughes-applaud-governor-shapiros-2025-26-budget/" } },
    { topic:"Protecting Medicaid & Services", icon:"🏥", pos:"support", issueKey:"healthcare", issueStance:"support",
      text:"A Pittsburgh-area Democrat who has pressed to shield Medicaid funding from federal cuts and to sustain the safety net.",
      source:{ label:"PA Senate Democrats", url:"https://pasenate.com/senate-democratic-leader-jay-costa-democratic-appropriations-chair-vincent-hughes-add-to-chorus-of-pleas-to-protect-medicaid-funding/" } },
    { topic:"School Funding", icon:"🍎", pos:"support", issueKey:"public_schools", issueStance:"support",
      text:"Champions increased 'adequacy' funding for public schools to meet a court ruling that Pennsylvania's system is unconstitutional.",
      source:{ label:"State Senator Jay Costa", url:"https://senatorcosta.com/senate-democratic-leaders-celebrates-signing-of-2026-27-pennsylvania-budget-into-law/" } }
  ],
  "vhughes_pa": [
    { topic:"Democrats' Budget Point Man", icon:"💵", pos:"support", issueKey:"public_schools", issueStance:"support",
      text:"Democratic Appropriations chair who has made fixing Pennsylvania's court-declared-unconstitutional school-funding system his central cause, touting successive years of 'adequacy' funding for underfunded districts.",
      source:{ label:"PA Senate Democrats", url:"https://pasenate.com/senate-democratic-leaders-celebrates-signing-of-2026-27-pennsylvania-budget-into-law/" } },
    { topic:"Appropriations Chair", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"A Philadelphia Democrat and longtime budget negotiator who partners with Leader Costa on the caucus's fiscal strategy.",
      source:{ label:"PA Senate Democrats", url:"https://pasenate.com/senate-democratic-leader-jay-costa-democratic-appropriations-chair-vincent-hughes-urge-senate-republicans-to-return-to-negotiations-as-house-votes-down-unserious-budget-and-transit-bills/" } },
    { topic:"Health & Federal Funding", icon:"🏥", pos:"support", issueKey:"healthcare", issueStance:"support",
      text:"Backed the governor's suit to unfreeze $1.2B in federal money for housing, clean water and public health, and opposed federal Medicaid cuts.",
      source:{ label:"PA Senate Democrats", url:"https://pasenate.com/costa-hughes-applaud-governor-shapiros-lawsuit-to-unfreeze-1-2-billion-in-federal-funding-for-pas-families/" } }
  ],
  "yaw_pa": [
    { topic:"The Statehouse's Top Gas Advocate", icon:"🛢", pos:"support", issueKey:"energy_production", issueStance:"support",
      text:"Environmental Resources & Energy chair from the heart of the Marcellus Shale who helped write the 2012 gas impact-fee law and calls natural gas 'the only reasonable solution' to the state's energy needs; honored with a Shale Gas Advocate Award.",
      source:{ label:"City & State Pennsylvania", url:"https://www.cityandstatepa.com/personality/2024/02/q-state-sen-gene-yaw-chair-senate-environmental-resources-energy-committee/394410/" } },
    { topic:"Leading Opponent of RGGI", icon:"🏭", pos:"oppose", issueKey:"climate_action", issueStance:"oppose",
      text:"A Williamsport-area Republican (District 23) who has fought Pennsylvania's entry into the Regional Greenhouse Gas Initiative, sponsoring a bill to require legislative approval and dismissing multistate cap-and-trade as unworkable.",
      source:{ label:"Sen. Gene Yaw", url:"https://www.senatorgeneyaw.com/2023/11/29/sen-yaw-receives-msc-shale-gas-advocate-award/" } },
    { topic:"Rural Development", icon:"🌾", pos:"support", issueKey:"rural_ag", issueStance:"support",
      text:"Chairs the Center for Rural Pennsylvania and steers shale impact-fee revenue to county and local projects across the northern tier.",
      source:{ label:"Sen. Gene Yaw", url:"https://www.senatorgeneyaw.com/2021/06/14/sen-yaw-region-receives-more-than-27-8-million-in-marcellus-shale-impact-fees/" } }
  ],
  "muth_pa": [
    { topic:"Read a Constituent's Plea as the GOP Gaveled", icon:"📢", pos:"support", issueKey:"econ_workers", issueStance:"support",
      text:"During a 2019 budget debate she read a disabled constituent's letter defending the General Assistance safety-net program while the Republican majority leader loudly raised points of order; the Senate then voted 26-24 to end the program.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Katie_Muth" } },
    { topic:"Progressive Policy Chair", icon:"🌹", pos:"support", issueKey:"gov_balance", issueStance:"support",
      text:"A Montgomery/Chester/Berks Democrat (District 44) who chairs the Senate Democratic Policy Committee and is among the chamber's most outspoken progressives.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Katie_Muth" } },
    { topic:"Government Accountability", icon:"🔎", pos:"support", issueKey:"gov_transparency", issueStance:"support",
      text:"Has pressed for transparency in state government and pension oversight, at times clashing with her own party's establishment.",
      source:{ label:"Senator Katie Muth", url:"https://www.palegis.us/senate/members/bio/1802/senator-katie-muth" } }
  ],
  "dush_pa": [
    { topic:"Led the 2020 Election 'Investigation'", icon:"🗳", pos:"support", issueKey:"election_integrity", issueStance:"support",
      text:"Took over Pennsylvania's Arizona-style 2020 election review and subpoenaed the personal data — names, addresses, partial Social Security numbers — of every registered voter; the state Supreme Court ruled the subpoena unenforceable, and prior audits found no fraud.",
      source:{ label:"Spotlight PA", url:"https://www.spotlightpa.org/news/2021/09/pa-gop-subpoena-personal-voter-information-2020-election-audit/" } },
    { topic:"Rewriting Election Law", icon:"📜", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"A Jefferson County Republican (District 25) and former State Government Committee chair who has since sponsored bills to eliminate mail voting and mandate additional audits.",
      source:{ label:"Votebeat", url:"https://www.votebeat.org/pennsylvania/2023/3/9/23632350/dush-state-government-committee-election-legislation/" } },
    { topic:"Hardline Conservative", icon:"🇺🇸", pos:"support", issueKey:"gov_balance", issueStance:"support",
      text:"One of the chamber's most conservative members, who inherited the election-review effort after a falling-out with Doug Mastriano.",
      source:{ label:"Spotlight PA", url:"https://www.spotlightpa.org/news/2023/03/pa-cris-dush-election-legislation-fraud-audit-policy/" } }
  ]

  };
  Object.keys(X).forEach(function (k) { S[k] = X[k]; });
})();
