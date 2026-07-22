/* PolitiDex stance data — STATE SENATE wave 6 (Tennessee, Indiana, Missouri, Maryland).
   ---------------------------------------------------------------------------------
   Additive module, same contract as waves 1–5. Augments the shared
   window.ISSUE_STANCE_DATA object so every consumer (My Stances "Your Stance vs
   Their Record", the Say-vs-Do engine, the Alignment Tool, Stance-at-a-Glance)
   lights these senators up automatically.

   CONTROVERSY-FIRST: each entry leads with the defining or most divisive item on
   the official's public record, then the substantive positions anchoring their
   tenure. Neutrally worded; every stance carries a real {label,url} source;
   issueKey values are canonical (ISSUE_MAP in alignment-tool.js).

   Scope note: Bill Ferguson already ships curated stances (ext), so he is NOT
   redefined here (this module only ADDS, never overwrites) — he is enriched with a
   sourced bio in cmp-data-detail.js instead. This wave contributes 11 new profiles.

   Loaded with `defer` after the core/ext chunks; pure data (no functions). */
(function () {
  'use strict';
  var S = window.ISSUE_STANCE_DATA || (window.ISSUE_STANCE_DATA = {});
  var X = {

  /* ── TENNESSEE ───────────────────────────────────────────────────────── */
  "randy_mcnally": [
    { topic:"Retiring After 40 Years", icon:"🗳", pos:"mixed", issueKey:"gov_services", issueStance:"mixed",
      text:"Lieutenant Governor and Speaker of the Tennessee Senate since 2017, he announced in February 2026 that he would retire, citing health — ending a legislative career of nearly five decades. In 2023 he drew scrutiny for liking and commenting on a young man's suggestive social-media posts.",
      source:{ label:"Nashville Banner", url:"https://nashvillebanner.com/2026/02/26/randy-mcnally-retires-senate/" } },
    { topic:"Fiscal Conservatism", icon:"🧾", pos:"support", issueKey:"gov_balance", issueStance:"support",
      text:"A pharmacist and longtime budget hawk who built his reputation on state fiscal discipline and balanced budgets.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Randy_McNally" } },
    { topic:"Abortion", icon:"⚖️", pos:"support", issueKey:"pro_life", issueStance:"support",
      text:"Presided over the Republican supermajority that enacted Tennessee's near-total abortion ban.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Randy_McNally" } }
  ],
  "jack_johnson_tn": [
    { topic:"Senate Majority Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Majority Leader of the Tennessee Senate since 2019, carrying the governor's priority legislation from a Franklin-area district; a possible contender for the chamber's top job in 2027.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Jack_Johnson_(Tennessee_politician)" } },
    { topic:"Taxes", icon:"💰", pos:"support", issueKey:"lower_taxes", issueStance:"support",
      text:"Champions Tennessee's low-tax model and the elimination of remaining state taxes.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Jack_Johnson_(Tennessee)" } },
    { topic:"School Choice", icon:"🎓", pos:"support", issueKey:"school_choice", issueStance:"support",
      text:"Sponsored the statewide expansion of school-voucher education-savings accounts, a signature 2025 priority.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Jack_Johnson_(Tennessee)" } }
  ],
  "raumesh_akbari": [
    { topic:"Senate Democratic Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Minority (Democratic) Leader of the Tennessee Senate since 2023, a Memphis attorney (District 29) and one of the party's rising national voices.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Raumesh_Akbari" } },
    { topic:"Health Care Access", icon:"🏥", pos:"support", issueKey:"healthcare", issueStance:"support",
      text:"Presses for Medicaid expansion and maternal-health investment that Tennessee's supermajority has declined.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Raumesh_Akbari" } },
    { topic:"Criminal-Justice Reform", icon:"⚖️", pos:"support", issueKey:"justice_reform", issueStance:"support",
      text:"Focuses on economic opportunity, expungement and criminal-justice reform for her Memphis constituents.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Raumesh_Akbari" } }
  ],

  /* ── INDIANA ─────────────────────────────────────────────────────────── */
  "rodric_bray": [
    { topic:"Defied Trump on Redistricting", icon:"🗺", pos:"mixed", issueKey:"election_integrity", issueStance:"mixed",
      text:"As President Pro Tempore, he was among the Senate Republicans who blocked a Trump-demanded mid-decade congressional redistricting; Trump publicly threatened him ('we're after you, Bray') and Gov. Mike Braun called for his replacement.",
      source:{ label:"Indiana Capital Chronicle", url:"https://indianacapitalchronicle.com/2026/06/04/indiana-senates-no-2-republican-steps-down-from-post-after-split-from-bray/" } },
    { topic:"Senate President Pro Tempore", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"The Indiana Senate's top leader since 2018, an attorney from Martinsville who sets the chamber's agenda in a Republican supermajority.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Rodric_Bray" } },
    { topic:"Fiscal Restraint", icon:"🧾", pos:"support", issueKey:"gov_balance", issueStance:"support",
      text:"Emphasizes balanced budgets and cautious spending as the hallmark of Indiana's Republican leadership.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Rodric_Bray" } }
  ],
  "chris_garten": [
    { topic:"Quit Leadership Over Redistricting", icon:"⚔️", pos:"mixed", issueKey:"gov_services", issueStance:"mixed",
      text:"Resigned as Senate Majority Floor Leader in June 2026 after splitting with Pro Tem Bray, saying he could no longer align with leadership's direction; he had backed the Trump-demanded redistricting push that Bray opposed.",
      source:{ label:"WFYI", url:"https://www.wfyi.org/statewide/2026-06-04/in-shakeup-of-senate-republican-leadership-sen-chris-garten-steps-down" } },
    { topic:"Trump-Aligned Redistricting", icon:"🗺", pos:"support", issueKey:"election_integrity", issueStance:"support",
      text:"A favorite of the party's Trump wing who publicly backed mid-decade redistricting to add Republican U.S. House seats.",
      source:{ label:"Indiana Capital Chronicle", url:"https://indianacapitalchronicle.com/2026/06/04/indiana-senates-no-2-republican-steps-down-from-post-after-split-from-bray/" } },
    { topic:"Veterans & Military", icon:"🎖", pos:"support", issueKey:"veterans", issueStance:"support",
      text:"A Marine Corps veteran from southern Indiana who focuses on veterans' issues and military affairs.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Chris_Garten" } }
  ],
  "shelli_yoder": [
    { topic:"Rose to Leader After Scandal", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Became Senate Minority Leader in 2025 after Greg Taylor stepped down amid sexual-harassment allegations; a Bloomington Democrat and former county-council president.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Shelli_Yoder" } },
    { topic:"Abortion Rights", icon:"⚖️", pos:"support", issueKey:"pro_choice", issueStance:"support",
      text:"A leading Democratic opponent of Indiana's near-total abortion ban.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Shelli_Yoder" } },
    { topic:"Public Schools", icon:"🎓", pos:"support", issueKey:"public_schools", issueStance:"support",
      text:"Advocates for public-school funding over the expansion of private-school vouchers.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Shelli_Yoder" } }
  ],

  /* ── MISSOURI ────────────────────────────────────────────────────────── */
  "cindy_olaughlin": [
    { topic:"First Woman to Lead the Senate", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"President Pro Tem of the Missouri Senate since 2025 — the first woman ever to hold the chamber's top job — steering a Republican supermajority through repeated Freedom Caucus infighting.",
      source:{ label:"FOX2now", url:"https://fox2now.com/news/missouri/cindy-olaughlin-makes-history-as-first-woman-to-lead-missouri-senate/" } },
    { topic:"School Choice", icon:"🎓", pos:"support", issueKey:"school_choice", issueStance:"support",
      text:"A former school-board member and business owner who has led on expanding charter schools and education-savings accounts.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Cindy_O%27Laughlin" } },
    { topic:"Taxes", icon:"💰", pos:"support", issueKey:"lower_taxes", issueStance:"support",
      text:"Backs cuts to Missouri's income tax and elimination of the state's capital-gains tax.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Cindy_O%27Laughlin" } }
  ],
  "tony_luetkemeyer": [
    { topic:"Senate Majority Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Majority Floor Leader of the Missouri Senate since 2025, a Parkville attorney (District 34) seen as a bridge to the Freedom Caucus after years of GOP infighting.",
      source:{ label:"Missouri Independent", url:"https://missouriindependent.com/briefs/in-aftermath-of-missouri-election-both-parties-pick-legislative-leaders/" } },
    { topic:"Public Safety", icon:"🚔", pos:"support", issueKey:"tough_on_crime", issueStance:"support",
      text:"A former prosecutor who has sponsored tougher criminal-penalty and public-safety measures.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Tony_Luetkemeyer" } },
    { topic:"Taxes", icon:"💰", pos:"support", issueKey:"lower_taxes", issueStance:"support",
      text:"Supports income-tax reductions and the Republican fiscal agenda.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Tony_Luetkemeyer" } }
  ],
  "doug_beck": [
    { topic:"Senate Democratic Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Minority (Democratic) Leader of the Missouri Senate since 2024, a union sheet-metal worker and business representative from Affton (District 1).",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Doug_Beck" } },
    { topic:"Labor & Workers", icon:"🔧", pos:"support", issueKey:"econ_workers", issueStance:"support",
      text:"A leading labor voice who champions prevailing wage, union rights and worker protections.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Doug_Beck" } },
    { topic:"Health Care", icon:"🏥", pos:"support", issueKey:"healthcare", issueStance:"support",
      text:"Backs defending Medicaid expansion and health-care access approved by Missouri voters.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Doug_Beck" } }
  ],

  /* ── MARYLAND ────────────────────────────────────────────────────────── */
  "nancy_king": [
    { topic:"Senate Majority Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Majority Leader of the Maryland Senate since 2020, a Montgomery County Democrat and longtime budget and education leader.",
      source:{ label:"Maryland Senate", url:"https://mgaleg.maryland.gov/mgawebsite/Members/Index/senate/district" } },
    { topic:"Public Schools", icon:"🎓", pos:"support", issueKey:"public_schools", issueStance:"support",
      text:"A former school-board member who has centered public-education funding, including the Blueprint for Maryland's Future.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Nancy_J._King" } },
    { topic:"Health Care", icon:"🏥", pos:"support", issueKey:"healthcare", issueStance:"support",
      text:"Supports expanding health-care access and services for families and seniors.",
      source:{ label:"Maryland Senate", url:"https://mgaleg.maryland.gov/mgawebsite/Members/Index/senate/district" } }
  ],
  "steve_hershey": [
    { topic:"Senate Republican Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Minority (Republican) Leader of the Maryland Senate since 2023, representing the Eastern Shore (District 36) in a Democratic supermajority chamber.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Steve_Hershey" } },
    { topic:"Taxes & Affordability", icon:"💰", pos:"support", issueKey:"lower_taxes", issueStance:"support",
      text:"Opposes the majority's tax increases, pressing affordability and spending restraint.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Stephen_Hershey" } },
    { topic:"Rural Eastern Shore", icon:"🌾", pos:"support", issueKey:"rural_ag", issueStance:"support",
      text:"Advocates for agriculture, watermen and the rural economy of Maryland's Eastern Shore.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Steve_Hershey" } }
  ]

  };
  Object.keys(X).forEach(function (k) { S[k] = X[k]; });
})();
