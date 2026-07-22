/* PolitiDex stance data — STATE SENATE wave 11 (Nebraska, Montana, Idaho,
   South Dakota).
   ---------------------------------------------------------------------------------
   Additive module, same contract as waves 1–10. Augments the shared
   window.ISSUE_STANCE_DATA object so every consumer (My Stances "Your Stance vs
   Their Record", the Say-vs-Do engine, the Alignment Tool, Stance-at-a-Glance,
   and the Government Contracting "by state" ties) lights these senators up
   automatically.

   CONTROVERSY-FIRST: each entry leads with the defining or most divisive item on
   the official's public record, then the substantive positions anchoring their
   tenure. Neutrally worded; every stance carries a real {label,url} source;
   issueKey values are canonical (ISSUE_MAP in alignment-tool.js).

   Note on Nebraska: it is the nation's only unicameral, officially NONPARTISAN
   legislature — members run without party labels and there is no floor "majority
   leader," so the Speaker (elected by the members) is the key floor officer.
   Party registrations are given where widely reported, for context only. This wave
   contributes 13 new sourced profiles and only ADDS keys — it never overwrites one.

   Loaded with `defer` after the core/ext chunks; pure data (no functions). */
(function () {
  'use strict';
  var S = window.ISSUE_STANCE_DATA || (window.ISSUE_STANCE_DATA = {});
  var X = {

  /* ── NEBRASKA (unicameral, nonpartisan) ──────────────────────────────── */
  "john_arch": [
    { topic:"Capped Debate on Winner-Take-All", icon:"🗳", pos:"mixed", issueKey:"election_integrity", issueStance:"mixed",
      text:"As Speaker he limited debate on the contentious 2025 bill (LB3) to end Nebraska's split electoral votes to four hours — a procedure he reserves for divisive measures — saying most members had already decided; the bill then died on a filibuster, 31-18.",
      source:{ label:"Nebraska Examiner", url:"https://nebraskaexaminer.com/2025/04/07/nebraska-legislature-to-debate-winner-take-all-bill-tuesday-but-unlikely-to-have-enough-votes/" } },
    { topic:"Speaker of the Legislature", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"A La Vista Republican (District 14) and former health-system executive, unanimously re-elected Speaker for 2025; the Speaker sets the agenda in the officially nonpartisan, single-house Legislature.",
      source:{ label:"Nebraska Public Media", url:"https://nebraskapublicmedia.org/en/news/news-articles/nebraska-state-senators-elect-speaker-and-committee-chairs-on-first-day-of-2025-session/" } },
    { topic:"Governing a Filibuster-Heavy Chamber", icon:"⏳", pos:"mixed", issueKey:"gov_balance", issueStance:"mixed",
      text:"Presides over a body where stall tactics dominate — 347 motions were filed in 2025 alone — forcing him to triage which bills reach a vote under the three-round debate rules.",
      source:{ label:"North Platte Post", url:"https://northplattepost.com/posts/a8b82cf0-f12b-47ca-851a-fe9388aecaa1" } }
  ],
  "machaela_cavanaugh": [
    { topic:"'Burn the Session to the Ground'", icon:"🔥", pos:"support", issueKey:"lgbtq_rights", issueStance:"support",
      text:"In 2023 she vowed to filibuster every bill — even ones she backed — to protest LB574's ban on gender-affirming care for minors, grinding the single-house Legislature to its longest standstill in state history.",
      source:{ label:"Washington Post", url:"https://www.washingtonpost.com/politics/2023/03/20/filibuster-nebraska-legislature-transgender-bill/" } },
    { topic:"Reproductive Rights", icon:"✊", pos:"support", issueKey:"pro_choice", issueStance:"support",
      text:"Her protest intensified after the trans-care ban was merged with a 12-week abortion ban; she opposed the combined measure, which passed in May 2023.",
      source:{ label:"OPB", url:"https://www.opb.org/article/2023/04/07/nebraska-legislature-hasnt-passed-any-bills-amid-filibusters-over-trans-rights/" } },
    { topic:"The Chamber's Most Prolific Obstructor", icon:"📜", pos:"mixed", issueKey:"gov_balance", issueStance:"mixed",
      text:"An Omaha Democrat (District 6) who again filed the most motions of any senator in 2025, wielding the unicameral's rules as the minority's main leverage.",
      source:{ label:"Nebraska Public Media (1011)", url:"https://www.1011now.com/2025/06/23/by-numbers-nebraskas-2025-legislative-session/" } }
  ],
  "merv_riepe": [
    { topic:"The Vote That Killed a 6-Week Abortion Ban", icon:"⚖️", pos:"mixed", issueKey:"pro_choice", issueStance:"mixed",
      text:"A Republican co-sponsor who, in 2023, refused to vote — 'present, not voting' — leaving a six-week 'heartbeat' abortion ban one vote short; Nebraska Right to Life then rescinded its endorsement of him.",
      source:{ label:"Nebraska Examiner", url:"https://nebraskaexaminer.com/2023/04/27/nebraska-abortion-ban-tied-to-cardiac-activity-falls-one-vote-short-20-week-limit-remains-intact/" } },
    { topic:"Pushed a 12-Week Compromise", icon:"🏥", pos:"mixed", issueKey:"healthcare", issueStance:"mixed",
      text:"A Ralston Republican (District 12) and former hospital administrator who proposed a less-strict 12-week limit instead of six weeks, warning six weeks may not give women time to know they are pregnant.",
      source:{ label:"Nebraska Examiner", url:"https://nebraskaexaminer.com/2023/03/15/nebraska-state-senator-proposes-12-week-abortion-ban-instead-of-cardiac-activity-ban/" } },
    { topic:"A Reliable Swing Vote", icon:"↔️", pos:"mixed", issueKey:"election_integrity", issueStance:"mixed",
      text:"One of two Republicans who broke ranks in 2025 to help sustain the filibuster of the winner-take-all electoral bill.",
      source:{ label:"WOWT", url:"https://www.wowt.com/2025/04/08/nebraska-winner-take-all-bill-fails-after-first-round-debate/" } }
  ],
  "loren_lippincott": [
    { topic:"Sponsor of the Winner-Take-All Push", icon:"🗳", pos:"support", issueKey:"election_integrity", issueStance:"support",
      text:"Introduced LB3 at Gov. Jim Pillen's request to scrap Nebraska's district-by-district electoral split and its Omaha 'blue dot'; he also floated lowering the filibuster threshold to ease its path. It failed after first-round debate.",
      source:{ label:"Nebraska Public Media", url:"https://nebraskapublicmedia.org/en/news/news-articles/senator-introduces-winner-take-all-legislation-in-nebraska-unicameral/" } },
    { topic:"'The Voice of Rural America'", icon:"🌾", pos:"support", issueKey:"rural_ag", issueStance:"support",
      text:"A Central City Republican (District 34) who argues winner-take-all, like the Electoral College and the U.S. Senate, keeps rural voters from being 'overshadowed by large population centers.'",
      source:{ label:"Unicameral Update", url:"https://update.legislature.ne.gov/?p=37216" } },
    { topic:"Fighter Pilot Turned Senator", icon:"✈️", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"A former Air Force F-16 pilot and retired Delta Air Lines international captain who still works his family farm north of Central City.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Loren_Lippincott" } }
  ],

  /* ── MONTANA ─────────────────────────────────────────────────────────── */
  "matt_regier": [
    { topic:"Lost His Caucus on Day One", icon:"🧨", pos:"mixed", issueKey:"gov_balance", issueStance:"mixed",
      text:"Senate President whose control collapsed on the session's first day in 2025 when nine moderate Republicans joined 18 Democrats to form a working majority that reassigned committees and ran the chamber around him.",
      source:{ label:"Montana Free Press", url:"https://montanafreepress.org/2025/02/17/chaos-reigns-montana-divided-republican-senate/" } },
    { topic:"The 'Parking Lot' Committee", icon:"🅿️", pos:"oppose", issueKey:"gov_balance", issueStance:"oppose",
      text:"A Kalispell Republican who, with allies, created a never-before-used Executive Branch Review Committee that moderates decried as a 'parking lot' to sideline them from the budget — the move that triggered the revolt.",
      source:{ label:"Bozeman Daily Chronicle", url:"https://www.bozemandailychronicle.com/news/how-a-bipartisan-coalition-dominated-the-montana-senate-and-fractured-the-republican-party/article_dbbca475-843f-5ad9-b111-0edc62df0989.html" } },
    { topic:"Triggered the Ellsworth Probe", icon:"📞", pos:"support", issueKey:"gov_transparency", issueStance:"support",
      text:"He placed the anonymous ethics-hotline tip that launched the investigation into former Senate President Jason Ellsworth's contract, later saying expulsion should have followed.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Matt_Regier" } }
  ],
  "pat_flowers": [
    { topic:"Architect of the Bipartisan Majority", icon:"🤝", pos:"support", issueKey:"gov_balance", issueStance:"support",
      text:"Minority Leader who turned an 18-member Democratic caucus plus nine dissident Republicans into a 'working majority' that ran the 2025 Senate — 'we decided on Day 1 to change the rules,' he said.",
      source:{ label:"Montana Free Press", url:"https://montanafreepress.org/2025/02/13/the-power-of-flowers/" } },
    { topic:"Forced a Criminal Referral", icon:"⚖️", pos:"support", issueKey:"gov_transparency", issueStance:"support",
      text:"A Belgrade Democrat (District 31) and retired Fish, Wildlife & Parks supervisor who mustered the votes to send a potential criminal case against Sen. Jason Ellsworth to the state DOJ, bringing some Republicans to 'angry tears.'",
      source:{ label:"Daily Montanan", url:"https://dailymontanan.com/2025/03/19/flowers-emerges-as-a-leader-by-finding-common-ground/" } },
    { topic:"Medicaid & Property-Tax Wins", icon:"🏥", pos:"support", issueKey:"healthcare", issueStance:"support",
      text:"Credited the cross-aisle coalition with renewing Montana's Medicaid expansion and passing middle-class property-tax relief — what allies called the most successful session for Democrats in a decade.",
      source:{ label:"Bozeman Daily Chronicle", url:"https://www.bozemandailychronicle.com/opinions/guest_columnists/sen-pat-flowers-3-others-montana-democrats-bipartisan-work-brought-real-wins-for-montana-communities/article_9f6e7c08-bb75-444a-a05c-84db6f5d1292.html" } }
  ],
  "jason_ellsworth": [
    { topic:"Censured and Banned From the Floor for Life", icon:"🚫", pos:"oppose", issueKey:"gov_transparency", issueStance:"oppose",
      text:"Former Senate President censured 44-6 in 2025 and barred from the Senate floor for life over a $170,100 state contract steered to a longtime business associate whose relationship he did not disclose.",
      source:{ label:"Daily Montanan", url:"https://dailymontanan.com/2025/04/01/montana-senate-votes-to-punish-ellsworth-revokes-lifetime-floor-privileges/" } },
    { topic:"Split the Contract to Dodge Bidding", icon:"✂️", pos:"oppose", issueKey:"gov_waste", issueStance:"oppose",
      text:"A Hamilton Republican (District 43) whom a legislative audit found tried to split the work into two contracts to slip under the $100,000 threshold that would have required competitive bidding.",
      source:{ label:"Montana Free Press", url:"https://montanafreepress.org/2025/03/20/ellsworth-ethics-case-ready-for-montana-senate/" } },
    { topic:"Criminal Charge and a $5M Counterclaim", icon:"🧾", pos:"mixed", issueKey:"justice_reform", issueStance:"mixed",
      text:"Later charged with official misconduct over the contract; he denied wrongdoing, and his attorney filed a $5 million defamation claim against the state.",
      source:{ label:"Bozeman Daily Chronicle", url:"https://www.bozemandailychronicle.com/news/state-doj-charges-sen-ellsworth-with-criminal-misconduct-seeks-suspension-from-office/article_41e87976-36e8-54b1-ace3-4c6d1f85f394.html" } }
  ],

  /* ── IDAHO ───────────────────────────────────────────────────────────── */
  "kelly_anthon": [
    { topic:"Rose as the Old Guard Was Purged", icon:"🔁", pos:"support", issueKey:"gov_balance", issueStance:"support",
      text:"Took the Senate's top post for 2025 after longtime President Pro Tem Chuck Winder was ousted by a hardline challenger in the GOP primary — part of a conservative turnover in Idaho's leadership.",
      source:{ label:"Idaho Capital Sun", url:"https://idahocapitalsun.com/2024/12/05/state-sen-kelly-anthon-named-to-top-idaho-senate-leadership-post/" } },
    { topic:"Senate President pro Tempore", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"A Burley Republican (District 27), former municipal attorney and seventh-generation Idaho farmer in the Senate since 2015; the pro tem is second in line to the governor.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Kelly_Anthon" } },
    { topic:"Climbed the Leadership Ladder", icon:"🪜", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Advanced from majority caucus chair to majority leader to pro tem, a steady rise through the Republican supermajority's ranks.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Kelly_Anthon" } }
  ],
  "lori_den_hartog": [
    { topic:"Drove Idaho's School-Choice Tax Credit", icon:"🎓", pos:"support", issueKey:"school_choice", issueStance:"support",
      text:"Majority Leader and the Senate's leading champion of a private-school tax credit, the voucher-style school-choice program that stalled for years before Idaho enacted it.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Lori_Den_Hartog" } },
    { topic:"Senate Majority Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"A Meridian Republican (District 22) elevated to majority leader in December 2024, succeeding Anthon; a former land-use and transportation planner who stresses parental rights.",
      source:{ label:"Idaho Press", url:"https://www.idahopress.com/news/local/anthon-den-hartog-assume-senate-top-leadership-positions/article_2bacc868-b343-11ef-9176-0b0883a29be3.html" } },
    { topic:"Fiscal Conservatism", icon:"💰", pos:"support", issueKey:"lower_taxes", issueStance:"support",
      text:"Lists fiscal conservatism and education-funding reform among her core priorities within the GOP leadership team.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Lori_Den_Hartog" } }
  ],
  "melissa_wintrow": [
    { topic:"Leading a Six-Member Minority", icon:"🔵", pos:"mixed", issueKey:"gov_balance", issueStance:"mixed",
      text:"Minority Leader since 2022 of a Democratic caucus holding just 6 of 35 seats; a former educator the Boise press once dubbed the Legislature's 'Ironwoman.'",
      source:{ label:"Idaho Capital Sun", url:"https://idahocapitalsun.com/2022/11/30/idaho-democrats-elect-wintrow-to-top-senate-minority-leadership-post/" } },
    { topic:"Health & Judiciary Focus", icon:"🏥", pos:"support", issueKey:"healthcare", issueStance:"support",
      text:"A Boise Democrat (District 19) who sits on the Health & Welfare and Judiciary & Rules committees, pressing health-access and civil-liberties concerns in a supermajority chamber.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Melissa_Wintrow" } },
    { topic:"From Classroom to Capitol", icon:"🍎", pos:"support", issueKey:"public_schools", issueStance:"support",
      text:"A former university educator who served three House terms before the Senate and advocates public-education investment.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Melissa_Wintrow" } }
  ],

  /* ── SOUTH DAKOTA ────────────────────────────────────────────────────── */
  "jim_mehlhaff": [
    { topic:"Fought the Carbon-Pipeline Eminent-Domain Ban", icon:"🛢", pos:"oppose", issueKey:"property_rights", issueStance:"oppose",
      text:"Majority Leader and the most vocal opponent of the 2025 ban on eminent domain for carbon pipelines; he told a packed hearing he'd 'get run over' and warned the ban says 'South Dakota is not open for business.' It passed and was signed anyway.",
      source:{ label:"South Dakota Searchlight", url:"https://southdakotasearchlight.com/2025/03/03/carbon-pipeline-eminent-domain-ban-advances-sd-legislature-compromise-bill-gutted/" } },
    { topic:"His 'Compromise' Bill Was Gutted", icon:"⚖️", pos:"support", issueKey:"energy_production", issueStance:"support",
      text:"A Pierre Republican (District 24) whose SB198, pitched as a mediation compromise for pipeline eminent-domain disputes, was unanimously killed and rewritten into the very ban he opposed.",
      source:{ label:"SDPB", url:"https://www.sdpb.org/politics/2025-03-06/rhoden-signs-bill-blocking-eminent-domain-use-for-carbon-pipelines" } },
    { topic:"Senate Majority Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Took the floor-leader post in January 2025, succeeding Casey Crabtree, in a Senate where Republicans hold 32 of 35 seats.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Jim_Mehlhaff" } }
  ],
  "chris_karr": [
    { topic:"Part of a Hard-Right Leadership Takeover", icon:"🧭", pos:"support", issueKey:"gov_balance", issueStance:"support",
      text:"President pro Tempore elected amid a 2025 shift in which staunch conservatives seized key posts, pushing to cap property taxes, curb the carbon pipeline, and restrict minors' access to online pornography.",
      source:{ label:"South Dakota Searchlight", url:"https://southdakotasearchlight.com/briefs/staunchly-conservatives-take-leadership-positions-in-gop-led-state-legislature/" } },
    { topic:"A Budget Hawk", icon:"💰", pos:"support", issueKey:"lower_taxes", issueStance:"support",
      text:"A Sioux Falls Republican (District 11) with an MBA who moved from the House to the Senate and centers state budget discipline and federal-funding scrutiny.",
      source:{ label:"KELOLAND", url:"https://www.keloland.com/news/local-news/legislative-leaders-look-ahead-to-state-of-the-state/amp/" } },
    { topic:"Senate President pro Tempore", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Assumed the pro tem role in January 2025, succeeding Lee Schoenbeck, in his first Senate term.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Chris_Karr" } }
  ],
  "liz_larson": [
    { topic:"Leading a Three-Member Caucus", icon:"🔵", pos:"mixed", issueKey:"gov_balance", issueStance:"mixed",
      text:"Minority Leader of a Democratic caucus reduced to just 3 of 35 seats — near-total Republican control — who frames her agenda around South Dakota's 'affordability crisis.'",
      source:{ label:"KELOLAND", url:"https://www.keloland.com/news/local-news/legislative-leaders-look-ahead-to-state-of-the-state/amp/" } },
    { topic:"Cost of Living", icon:"🧾", pos:"support", issueKey:"cost_living", issueStance:"support",
      text:"A Sioux Falls Democrat (District 10) who centers housing, child care and everyday costs for working families as the minority's core message.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Liz_Larson_(South_Dakota)" } },
    { topic:"Senate Democratic Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Became Minority Leader in January 2025, succeeding Reynold Nesiba; holds degrees in international development and studies.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Liz_Larson" } }
  ]

  };
  Object.keys(X).forEach(function (k) { S[k] = X[k]; });
})();
