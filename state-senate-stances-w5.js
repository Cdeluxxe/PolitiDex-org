/* PolitiDex stance data — STATE SENATE wave 5 (Massachusetts, Wisconsin, Minnesota, Colorado).
   ---------------------------------------------------------------------------------
   Additive module, same contract as waves 1–4. Augments the shared
   window.ISSUE_STANCE_DATA object so every consumer (My Stances "Your Stance vs
   Their Record", the Say-vs-Do engine, the Alignment Tool, Stance-at-a-Glance)
   lights these senators up automatically.

   CONTROVERSY-FIRST: each entry leads with the defining or most divisive item on
   the official's public record, then the substantive positions anchoring their
   tenure. Neutrally worded; every stance carries a real {label,url} source;
   issueKey values are canonical (ISSUE_MAP in alignment-tool.js).

   Scope note: Karen Spilka, Erin Murphy and James Coleman already ship curated
   stances (ext), so they are NOT redefined here (this module only ADDS, never
   overwrites) — they are enriched with sourced bios in cmp-data-detail.js instead.
   This wave contributes 9 new sourced profiles.

   Loaded with `defer` after the core/ext chunks; pure data (no functions). */
(function () {
  'use strict';
  var S = window.ISSUE_STANCE_DATA || (window.ISSUE_STANCE_DATA = {});
  var X = {

  /* ── MASSACHUSETTS ───────────────────────────────────────────────────── */
  "cynthia_creem": [
    { topic:"Senate Majority Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Majority Leader of the Massachusetts Senate since 2018 and a member since 1999, representing a Norfolk/Middlesex district in the Boston suburbs.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Cynthia_Stone_Creem" } },
    { topic:"Climate Legislation", icon:"🌱", pos:"support", issueKey:"climate_action", issueStance:"support",
      text:"A lead architect of Massachusetts's major climate laws, chairing the Senate's climate work and pushing emissions and clean-energy targets.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Cynthia_Stone_Creem" } },
    { topic:"Civil Rights", icon:"🏳️‍🌈", pos:"support", issueKey:"lgbtq_rights", issueStance:"support",
      text:"A longtime sponsor of LGBTQ civil-rights and reproductive-rights protections in state law.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Cynthia_Stone_Creem" } }
  ],
  "bruce_tarr": [
    { topic:"Longest-Serving GOP Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Minority (Republican) Leader of the Massachusetts Senate since 2011 — the small GOP caucus's leader in a Democratic supermajority — representing a North Shore/Cape Ann district.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Bruce_Tarr" } },
    { topic:"Taxes & Fiscal Restraint", icon:"💰", pos:"support", issueKey:"lower_taxes", issueStance:"support",
      text:"Presses for tax relief and spending restraint as the leading fiscal-conservative voice in the chamber.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Bruce_Tarr" } },
    { topic:"Commercial Fishing", icon:"🎣", pos:"support", issueKey:"econ_smallbiz", issueStance:"support",
      text:"Champions the Gloucester-area commercial fishing industry and small coastal businesses against regulatory pressure.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Bruce_Tarr" } }
  ],

  /* ── WISCONSIN ───────────────────────────────────────────────────────── */
  "mary_felzkowski": [
    { topic:"Senate President", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"President of the Wisconsin Senate since 2025, a northern Wisconsin Republican and insurance-agency owner.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Mary_Felzkowski" } },
    { topic:"Tax Cuts", icon:"💰", pos:"support", issueKey:"lower_taxes", issueStance:"support",
      text:"A longtime advocate of cutting and flattening Wisconsin's income tax.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Mary_Felzkowski" } },
    { topic:"Medical Marijuana", icon:"🌿", pos:"support", issueKey:"cannabis_reform", issueStance:"support",
      text:"One of the few Republican lawmakers to lead on legalizing medical marijuana in Wisconsin.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Mary_Felzkowski" } }
  ],
  "devin_lemahieu": [
    { topic:"Retiring Amid a GOP Revolt", icon:"🗳", pos:"mixed", issueKey:"gov_services", issueStance:"mixed",
      text:"Majority Leader since 2021, he is retiring in 2026 amid criticism from fellow Republicans for allowing votes on sports-betting and college-athlete-pay bills — as the redrawn Senate is called the 'most flippable chamber in the country.'",
      source:{ label:"PBS Wisconsin", url:"https://pbswisconsin.org/news-item/republican-wisconsin-senate-majority-leader-devin-lemahieu-to-retire-from-office/" } },
    { topic:"Flat Income Tax", icon:"💰", pos:"support", issueKey:"lower_taxes", issueStance:"support",
      text:"Made moving Wisconsin toward a flat income tax and returning the state surplus to taxpayers his signature fiscal goal.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Devin_LeMahieu" } },
    { topic:"Budget Surplus", icon:"🧾", pos:"support", issueKey:"gov_balance", issueStance:"support",
      text:"Pushed to use the state's large surplus for tax cuts rather than new program spending.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Devin_LeMahieu" } }
  ],
  "dianne_hesselbein": [
    { topic:"Senate Democratic Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Minority (Democratic) Leader of the Wisconsin Senate since 2023, leading a caucus that — under new court-ordered maps — is two seats from a majority in 2026; she represents a Dane County/Middleton district.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Dianne_Hesselbein" } },
    { topic:"Public Schools", icon:"🎓", pos:"support", issueKey:"public_schools", issueStance:"support",
      text:"A former school-board member who prioritizes public-school funding over private-voucher expansion.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Dianne_Hesselbein" } },
    { topic:"Abortion Rights", icon:"⚖️", pos:"support", issueKey:"pro_choice", issueStance:"support",
      text:"Backs restoring and protecting abortion access in Wisconsin.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Dianne_Hesselbein" } }
  ],

  /* ── MINNESOTA ───────────────────────────────────────────────────────── */
  "bobby_joe_champion": [
    { topic:"First Black Senate President", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"President of the Minnesota Senate since 2023 — the first Black person to hold the post — representing north Minneapolis (District 59); an attorney seeking reelection in 2026.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Bobby_Joe_Champion" } },
    { topic:"Economic Opportunity", icon:"🏢", pos:"support", issueKey:"econ_smallbiz", issueStance:"support",
      text:"Chairs the Jobs and Economic Development Committee and championed the PROMISE Act funding grants for businesses and entrepreneurs in disadvantaged communities.",
      source:{ label:"Minnesota Spokesman-Recorder", url:"https://spokesman-recorder.com/2025/11/12/senator-bobby-joe-champion-announces-hell-seek-re-election-in-2026/" } },
    { topic:"Family & Equity", icon:"⚖️", pos:"support", issueKey:"justice_reform", issueStance:"support",
      text:"Sponsored the Minnesota African American Family Preservation Act to reform how the child-protection system treats Black families.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Bobby_Joe_Champion" } }
  ],
  "mark_johnson_mn": [
    { topic:"Senate Republican Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Minority (Republican) Leader of the Minnesota Senate, leading the GOP caucus in a chamber Democrats hold by a single seat; he represents a northwestern Minnesota district near the Canadian border.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Mark_Johnson_(Minnesota)" } },
    { topic:"Taxes & Spending", icon:"💰", pos:"support", issueKey:"lower_taxes", issueStance:"support",
      text:"Criticizes the DFL's spending of the state surplus and presses for tax relief and fiscal restraint.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Mark_Johnson_(Minnesota)" } },
    { topic:"Agriculture & Rural Minnesota", icon:"🌾", pos:"support", issueKey:"rural_ag", issueStance:"support",
      text:"Focuses on farming, rural roads and the economy of northwestern Minnesota.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Mark_Johnson_(Minnesota)" } }
  ],

  /* ── COLORADO ────────────────────────────────────────────────────────── */
  "robert_rodriguez_co": [
    { topic:"Senate Majority Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Majority Leader of the Colorado Senate, a Denver Democrat who rose through the chamber's leadership ranks.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Robert_Rodriguez_(politician)" } },
    { topic:"Data Privacy", icon:"🔐", pos:"support", issueKey:"privacy_rights", issueStance:"support",
      text:"Lead sponsor of the Colorado Privacy Act, one of the first comprehensive state consumer-data-privacy laws in the country.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Robert_Rodriguez_(Colorado)" } },
    { topic:"Workers & Labor", icon:"🔧", pos:"support", issueKey:"econ_workers", issueStance:"support",
      text:"Backs labor protections, worker rights and consumer-focused economic measures.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Robert_Rodriguez_(politician)" } }
  ],
  "cleave_simpson": [
    { topic:"Senate Republican Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Minority (Republican) Leader of the Colorado Senate since 2025, a fourth-generation farmer and rancher from the San Luis Valley (District 6).",
      source:{ label:"Colorado Newsline", url:"https://coloradonewsline.com/briefs/james-coleman-a-denver-democrat-will-be-next-colorado-senate-president/" } },
    { topic:"Water & Drought", icon:"💧", pos:"support", issueKey:"water", issueStance:"support",
      text:"Runs the Rio Grande Water Conservation District and is the chamber's leading voice on water scarcity and the San Luis Valley's shrinking aquifer.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Cleave_Simpson" } },
    { topic:"Agriculture & Rural Colorado", icon:"🌾", pos:"support", issueKey:"rural_ag", issueStance:"support",
      text:"Advocates for farming, ranching and the economy of rural southern Colorado.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Cleave_Simpson" } }
  ]

  };
  Object.keys(X).forEach(function (k) { S[k] = X[k]; });
})();
