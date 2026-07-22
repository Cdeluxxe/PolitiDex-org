/* PolitiDex stance data — STATE SENATE wave 9 (Iowa, Oklahoma, Kansas, Arkansas).
   ---------------------------------------------------------------------------------
   Additive module, same contract as waves 1–8. Augments the shared
   window.ISSUE_STANCE_DATA object so every consumer (My Stances "Your Stance vs
   Their Record", the Say-vs-Do engine, the Alignment Tool, Stance-at-a-Glance,
   and the Government Contracting "by state" ties) lights these senators up
   automatically.

   CONTROVERSY-FIRST: each entry leads with the defining or most divisive item on
   the official's public record, then the substantive positions anchoring their
   tenure. Neutrally worded; every stance carries a real {label,url} source;
   issueKey values are canonical (ISSUE_MAP in alignment-tool.js).

   Scope note: Ty Masterson (Kansas Senate President) already ships curated
   stances (politician-stances.js / cmp-data.js), so he is NOT redefined here —
   this module only ADDS, never overwrites. This wave contributes 13 new sourced
   profiles.

   Loaded with `defer` after the core/ext chunks; pure data (no functions). */
(function () {
  'use strict';
  var S = window.ISSUE_STANCE_DATA || (window.ISSUE_STANCE_DATA = {});
  var X = {

  /* ── IOWA ────────────────────────────────────────────────────────────── */
  "amy_sinclair": [
    { topic:"Architect of Iowa's School Vouchers", icon:"🎓", pos:"support", issueKey:"school_choice", issueStance:"support",
      text:"Senate President since 2023 and a former Education Committee chair who was a lead driver of Gov. Kim Reynolds' universal Education Savings Account law, one of the most sweeping private-school voucher programs in the country.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Amy_Sinclair" } },
    { topic:"Senate President", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"An Allerton Republican (District 12) first elected in 2012; she briefly served as acting lieutenant governor in late 2024 after Adam Gregg's resignation.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Amy_Sinclair" } },
    { topic:"Taxes", icon:"💰", pos:"support", issueKey:"lower_taxes", issueStance:"support",
      text:"Backed the Republican majority's move to a flat state income tax and continued rate cuts.",
      source:{ label:"Iowa Legislature", url:"https://www.legis.iowa.gov/legislators/legislator?ga=90&personID=10729" } }
  ],
  "mike_klimesh": [
    { topic:"Rose to Leader Amid the Pipeline Fight", icon:"🚪", pos:"mixed", issueKey:"property_rights", issueStance:"mixed",
      text:"Elected Majority Leader in September 2025 after Jack Whitver stepped down following a brain-tumor diagnosis; he inherited a caucus split by the contentious debate over eminent domain for carbon-capture pipelines.",
      source:{ label:"Iowa Capital Dispatch", url:"https://iowacapitaldispatch.com/2025/09/24/sen-mike-klimesh-elected-iowa-senate-majority-leader/" } },
    { topic:"Taxes & Affordability", icon:"💰", pos:"support", issueKey:"lower_taxes", issueStance:"support",
      text:"A Spillville Republican (District 32) and former mayor whose agenda centers cutting taxes and making Iowa more affordable to live and work in.",
      source:{ label:"Iowa Public Radio", url:"https://www.iowapublicradio.org/political-news/2025-09-25/iowa-senate-republicans-elect-mike-klimesh-majority-leader" } },
    { topic:"Medicaid Work Requirements", icon:"🏥", pos:"support", issueKey:"healthcare_market", issueStance:"support",
      text:"Backed adding work requirements to Iowa's Medicaid program during the 2025 session.",
      source:{ label:"Iowa Senate Republicans", url:"https://iowasenaterepublicans.com/senators/mike-klimesh/" } }
  ],
  "janice_weiner": [
    { topic:"Leading the Fight on Abortion Access", icon:"✊", pos:"support", issueKey:"pro_choice", issueStance:"support",
      text:"Minority Leader since January 2025 who has led Democratic opposition to Iowa's abortion restrictions, framing reproductive access as health care and warning against 'total control over women's bodies.'",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Janice_Weiner" } },
    { topic:"Senate Democratic Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"An Iowa City Democrat (District 45) and 26-year Foreign Service veteran, the first Jewish person to lead an Iowa legislative caucus.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Janice_Weiner" } },
    { topic:"Medicaid & Rural Health", icon:"🚑", pos:"support", issueKey:"healthcare", issueStance:"support",
      text:"Warns that Medicaid rollbacks would hit rural Iowa hospitals and nursing homes hardest, and pushes to protect coverage.",
      source:{ label:"Iowa Capital Dispatch", url:"https://iowacapitaldispatch.com/tag/senate-minority-leader-janice-weiner/" } }
  ],
  "zach_wahls": [
    { topic:"Ethics Complaint in a U.S. Senate Bid", icon:"🧾", pos:"mixed", issueKey:"gov_transparency", issueStance:"mixed",
      text:"During his 2026 U.S. Senate campaign he faced a state ethics complaint over roughly $165,000 earned from an outside political firm; Wahls called it politically motivated and said Senate staff had cleared the arrangement in advance.",
      source:{ label:"CBS2 Iowa", url:"https://cbs2iowa.com/news/local/iowa-senate-ethics-complaint-filed-against-zach-wahls" } },
    { topic:"From Viral Testimony to a Senate Run", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"A Coralville Democrat (District 43) and former Senate Minority Leader, first nationally known for his 2011 testimony defending his two mothers; he is running in Iowa's 2026 U.S. Senate race.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Zach_Wahls" } },
    { topic:"LGBTQ+ Rights", icon:"🏳️‍🌈", pos:"support", issueKey:"lgbtq_rights", issueStance:"support",
      text:"A longtime advocate for LGBTQ+ families and equal-treatment protections in Iowa law.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Zach_Wahls" } }
  ],

  /* ── OKLAHOMA ────────────────────────────────────────────────────────── */
  "lonnie_paxton": [
    { topic:"Tort-Reform Budget Showdown", icon:"⚖️", pos:"support", issueKey:"econ_growth", issueStance:"support",
      text:"President pro Tempore since 2025 who made tort and workers'-compensation reform the centerpiece of the session — including the first increase to Oklahoma's governmental-liability caps in 30 years — saying it signals the state is 'open for business.'",
      source:{ label:"NonDoc", url:"https://nondoc.com/2025/05/21/top-priority-in-the-senate-tort-reform-workers-compensation-bills-tied-to-budget-deal/" } },
    { topic:"Senate President pro Tempore", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"A Tuttle Republican (District 23), former mayor and insurance-agency owner who won the top Senate post by a single caucus vote over David Bullard, succeeding Greg Treat.",
      source:{ label:"Oklahoma Senate", url:"https://oksenate.gov/press-releases/senate-republicans-unanimously-elect-lonnie-paxton-pro-tem-designate" } },
    { topic:"Education & Schools", icon:"🎓", pos:"support", issueKey:"school_choice", issueStance:"support",
      text:"Backs parental education choice and authored measures strengthening in-person learning standards.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Lonnie_Paxton" } }
  ],
  "julie_daniels": [
    { topic:"Author of a Near-Total Abortion Ban", icon:"🕊", pos:"support", issueKey:"pro_life", issueStance:"support",
      text:"Majority Floor Leader since 2025 who authored HB 4237, Oklahoma's law banning abortion from fertilization with narrow exceptions; ALEC named her a state legislator of the month in 2025.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Julie_Daniels" } },
    { topic:"Senate Majority Floor Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"A Bartlesville Republican (District 29), attorney and former mayor who leads the GOP supermajority's floor agenda.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Julie_Daniels" } },
    { topic:"Lawsuit & Regulatory Reform", icon:"📈", pos:"support", issueKey:"econ_growth", issueStance:"support",
      text:"Champions lawsuit and regulatory reform and free-market policy as caucus priorities.",
      source:{ label:"ALEC", url:"https://alec.org/person/senator-julie-daniels/" } }
  ],
  "julia_kirt": [
    { topic:"Taking On the Eviction Crisis", icon:"🏘", pos:"support", issueKey:"housing_support", issueStance:"support",
      text:"Minority Leader who has made Oklahoma's housing shortage her signature cause, filing 2025 bills to seal eviction records and fund workforce housing, noting the state ranks near the top of the nation for evictions.",
      source:{ label:"KSWO", url:"https://www.kswo.com/2025/01/25/senate-democratic-leader-julia-kirt-files-bills-for-fair-housing/" } },
    { topic:"Senate Democratic Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"An Oklahoma City Democrat (District 30) and former arts-nonprofit leader, the first mother to lead the Senate Democratic caucus, chosen in late 2024.",
      source:{ label:"News 9", url:"http://www.news9.com/story/676f42a452a3fda02f1b002f/get-to-know-new-senate-minority-leader-julia-kirt-her-priorities-for-2025" } },
    { topic:"Public Education", icon:"🍎", pos:"support", issueKey:"public_schools", issueStance:"support",
      text:"Presses full public-school funding as part of the Democratic caucus's economic agenda.",
      source:{ label:"Oklahoma Senate", url:"https://oksenate.gov/press-releases/senate-democrats-announce-2025-legislative-agenda" } }
  ],

  /* ── KANSAS ──────────────────────────────────────────────────────────── */
  "chase_blasi": [
    { topic:"Local Abortion-Control Bill", icon:"⚖️", pos:"support", issueKey:"pro_life", issueStance:"support",
      text:"Majority Leader since 2025 who, months after Kansas voters rejected a 2022 anti-abortion amendment, introduced a bill to let local governments regulate abortion more strictly than the state.",
      source:{ label:"Kansas Public Radio", url:"https://kansaspublicradio.org/statehouse-news/2023-01-20/kansas-lawmakers-cant-ban-abortions-so-some-want-to-give-that-power-to-local-governments" } },
    { topic:"Senate Majority Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"A Wichita Republican (District 26) and former legislative policy director, among the younger members to hold a top leadership post.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Chase_Blasi" } },
    { topic:"Taxes", icon:"💰", pos:"support", issueKey:"lower_taxes", issueStance:"support",
      text:"A fiscal conservative who backs income-tax cuts within the Republican supermajority's agenda.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Chase_Blasi" } }
  ],
  "dinah_sykes": [
    { topic:"Left the GOP, Now Leads the Democrats", icon:"🗳", pos:"mixed", issueKey:"gov_services", issueStance:"mixed",
      text:"One of four Republican women who left the party in December 2018; she became the first woman to lead the Kansas Senate Democratic caucus in 2021 and in early 2026 announced a run for insurance commissioner.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Dinah_Sykes" } },
    { topic:"Public Education Funding", icon:"🍎", pos:"support", issueKey:"public_schools", issueStance:"support",
      text:"A Lenexa Democrat (District 21) who champions fully funding public schools to maintain the state's education standards.",
      source:{ label:"Kansas Legislature", url:"https://www.kslegislature.gov/li/b2025_26/members/sen_sykes_dinah_1/" } },
    { topic:"Criminal-Justice Reform", icon:"⚖️", pos:"support", issueKey:"justice_reform", issueStance:"support",
      text:"Advocates sentencing and justice reform emphasizing rehabilitation, family preservation and lower costs.",
      source:{ label:"Kansas Legislature", url:"https://www.kslegislature.gov/li/b2025_26/members/sen_sykes_dinah_1/" } }
  ],

  /* ── ARKANSAS ────────────────────────────────────────────────────────── */
  "bart_hester": [
    { topic:"Pressured a University Over a Dean Hire", icon:"🏫", pos:"oppose", issueKey:"lgbtq_rights", issueStance:"oppose",
      text:"President pro Tempore who in 2025 led lawmakers threatening University of Arkansas funding over its pick for law-school dean, who had backed transgender athletes in a Supreme Court brief; the job offer was then rescinded.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Bart_Hester" } },
    { topic:"Senate President pro Tempore", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"A Cave Springs Republican (District 33) from fast-growing Benton County serving a second term as the chamber's top leader.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Bart_Hester" } },
    { topic:"Taxes & Smaller Government", icon:"💰", pos:"support", issueKey:"lower_taxes", issueStance:"support",
      text:"Pushes income-tax cuts, lighter business regulation and a smaller state government.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Bart_Hester" } }
  ],
  "blake_johnson": [
    { topic:"A Sitting Leader Ousted in a Primary", icon:"🗳", pos:"mixed", issueKey:"gov_services", issueStance:"mixed",
      text:"Majority Leader since 2023 who lost his 2026 Republican primary to a state representative — an unusual defeat for a sitting Senate leader.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Blake_Johnson_(Arkansas)" } },
    { topic:"Agriculture & Water", icon:"🌾", pos:"support", issueKey:"rural_ag", issueStance:"support",
      text:"A Corning farmer (District 21) from northeastern Arkansas who authored watershed-permitting and farm-tax measures for rural producers.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Blake_Johnson_(Arkansas)" } },
    { topic:"Property Rights", icon:"🏡", pos:"support", issueKey:"property_rights", issueStance:"support",
      text:"Focuses on private-property rights and rural economic support.",
      source:{ label:"Arkansas Senate", url:"https://senate.arkansas.gov/senators/509/" } }
  ],
  "greg_leding": [
    { topic:"Civil-Rights Push in a Red Chamber", icon:"🏳️‍🌈", pos:"support", issueKey:"lgbtq_rights", issueStance:"support",
      text:"Minority Leader and the chamber's leading voice for adding sexual orientation and gender identity to the Arkansas Civil Rights Act — a long-shot fight in a deeply Republican Senate.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Greg_Leding" } },
    { topic:"Senate Democratic Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"A Fayetteville Democrat (District 30) who also led House Democrats before joining the Senate in 2019.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Greg_Leding" } },
    { topic:"Workers & Wages", icon:"🛠", pos:"support", issueKey:"econ_workers", issueStance:"support",
      text:"Sponsored wage-theft protections and advocates paid family leave for Arkansas workers.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Greg_Leding" } }
  ],
  "fredrick_love": [
    { topic:"State Senator Running for Governor", icon:"🗳", pos:"support", issueKey:"public_schools", issueStance:"support",
      text:"A term-limited senator who won the 2026 Democratic nomination for governor, campaigning against the LEARNS Act school-voucher program and Gov. Sarah Huckabee Sanders' large Franklin County prison plan.",
      source:{ label:"Arkansas Advocate", url:"https://arkansasadvocate.com/2025/06/23/democratic-state-sen-fredrick-love-announces-bid-for-governor-pledges-economic-and-educational-reform/" } },
    { topic:"Opposing the New State Prison", icon:"⚖️", pos:"support", issueKey:"justice_reform", issueStance:"support",
      text:"A Little Rock Democrat (District 15) who opposes the proposed 3,000-bed state prison and favors investment over incarceration.",
      source:{ label:"Arkansas Times", url:"https://arktimes.com/arkansas-blog/2025/06/23/democrat-fred-love-jumps-into-the-2026-governors-race" } },
    { topic:"Minority Voice", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"A senior member of the small Democratic caucus who served as minority whip in a Republican supermajority chamber.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Fredrick_Love" } }
  ]

  };
  Object.keys(X).forEach(function (k) { S[k] = X[k]; });
})();
