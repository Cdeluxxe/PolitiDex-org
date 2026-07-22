/* PolitiDex stance data — STATE SENATE wave 10 (Mississippi, West Virginia,
   New Mexico, Delaware).
   ---------------------------------------------------------------------------------
   Additive module, same contract as waves 1–9. Augments the shared
   window.ISSUE_STANCE_DATA object so every consumer (My Stances "Your Stance vs
   Their Record", the Say-vs-Do engine, the Alignment Tool, Stance-at-a-Glance,
   and the Government Contracting "by state" ties) lights these senators up
   automatically.

   CONTROVERSY-FIRST: each entry leads with the defining or most divisive item on
   the official's public record, then the substantive positions anchoring their
   tenure. Neutrally worded; every stance carries a real {label,url} source;
   issueKey values are canonical (ISSUE_MAP in alignment-tool.js).

   Scope: presiding officers and floor leaders of four more chambers plus the
   states' most notable senators. Mississippi's and New Mexico's Senate presidents
   are the lieutenant governors (they preside ex officio); the pro tempore is the
   senior elected senator, so both are profiled. This wave contributes 13 new
   sourced profiles and only ADDS keys — it never overwrites an existing one.

   Loaded with `defer` after the core/ext chunks; pure data (no functions). */
(function () {
  'use strict';
  var S = window.ISSUE_STANCE_DATA || (window.ISSUE_STANCE_DATA = {});
  var X = {

  /* ── MISSISSIPPI ─────────────────────────────────────────────────────── */
  "delbert_hosemann": [
    { topic:"Broke With His Own Governor on Medicaid", icon:"🏥", pos:"support", issueKey:"healthcare", issueStance:"support",
      text:"As lieutenant governor and Senate President he led an unusual Republican push to expand Medicaid to the working poor — roughly 200,000+ Mississippians — setting up a public clash with GOP Gov. Tate Reeves, who calls expansion 'welfare' and vowed to veto it.",
      source:{ label:"Mississippi Today", url:"https://mississippitoday.org/2024/10/31/mississippi-hobnob-medicaid-expansion-tax-cuts-jason-white-delbert-hosemann-wicker-pinkins/" } },
    { topic:"Senate President (Lt. Governor)", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"A Republican elected lieutenant governor in 2019 and re-elected in 2023 after beating primary challenger Chris McDaniel; as Senate President he appoints committee chairs and sets the chamber's agenda.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Delbert_Hosemann" } },
    { topic:"A Methodical Approach to Tax Cuts", icon:"💰", pos:"mixed", issueKey:"lower_taxes", issueStance:"mixed",
      text:"Backs income-tax reduction but has urged a 'more methodical approach' than the governor's full-elimination push, warning the tax funds about a third of the general fund and core services.",
      source:{ label:"SuperTalk Mississippi", url:"https://www.supertalk.fm/reeves-celebrates-medicaid-expansion-dying-as-hosemann-questions-governors-numbers/" } }
  ],
  "dean_kirby": [
    { topic:"The Lieutenant Governor's Right Hand", icon:"🤝", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"President pro Tempore since 2020, re-elected unanimously in 2024; described by capitol reporters as a close ally of Lt. Gov. Hosemann, he chairs the Rules Committee and sits second in line of gubernatorial succession.",
      source:{ label:"Mississippi Today", url:"https://mississippitoday.org/2024/01/02/dean-kirby-elected-pro-tem/" } },
    { topic:"Retiring After Three Decades", icon:"🚪", pos:"mixed", issueKey:"gov_balance", issueStance:"mixed",
      text:"A Pearl Republican (District 30) in the Senate since 1992, he announced in 2026 he will not seek a 10th term, closing one of the longest tenures in the chamber as he turns 80.",
      source:{ label:"Magnolia Tribune", url:"https://magnoliatribune.com/2026/04/30/with-kirby-not-seeking-re-election-yancey-announces-run-for-senate-district-30/" } },
    { topic:"Health & Finance Veteran", icon:"🏥", pos:"support", issueKey:"healthcare", issueStance:"support",
      text:"A former insurance-agency owner who has chaired both the Finance and Public Health committees over his long tenure in the Rankin County seat.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Dean_Kirby" } }
  ],
  "derrick_simmons": [
    { topic:"Front Line on Voting Rights", icon:"🗳", pos:"support", issueKey:"voting_access", issueStance:"support",
      text:"Minority Leader who has been the chamber's leading voice against rollbacks of the Voting Rights Act, calling a 2026 Supreme Court decision 'not theoretical — it is immediate' for Mississippi's communities of color.",
      source:{ label:"Mississippi Today", url:"https://mississippitoday.org/2026/04/29/voting-rights-supreme-court-mississippi/" } },
    { topic:"Fighting to Restore Ballot Initiatives", icon:"✍️", pos:"support", issueKey:"gov_transparency", issueStance:"support",
      text:"Blasted the GOP majority when a bill to revive Mississippi's citizen ballot-initiative process died in the Senate without a vote, noting polls showed roughly 72% of voters wanted it back.",
      source:{ label:"Mississippi Today", url:"https://mississippitoday.org/2023/03/23/mississippi-ballot-initiative-dies-again-without-vote/" } },
    { topic:"Senate Democratic Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"A Greenville Democrat (District 12), trial lawyer and Minority Leader since 2017 who leads an 18-member caucus in a Republican supermajority chamber.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Derrick_Simmons" } }
  ],

  /* ── WEST VIRGINIA ───────────────────────────────────────────────────── */
  "randy_smith": [
    { topic:"A Coal Miner Running the Senate", icon:"⛏", pos:"support", issueKey:"energy_production", issueStance:"support",
      text:"A working Tucker County coal miner unanimously elected Senate President in January 2025; he leads a 32-2 Republican supermajority and champions the coal and natural-gas industries central to his district.",
      source:{ label:"WV Legislature", url:"https://www.wvlegislature.gov/senate1/President/biography.cfm" } },
    { topic:"Senate President (Lt. Governor)", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"A District 14 Republican who moved up from the House of Delegates, first elected to the Senate in 2016; as President he also serves as West Virginia's lieutenant governor.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Randy_Smith_(politician)" } },
    { topic:"Named a New Leadership Slate", icon:"🧭", pos:"support", issueKey:"gov_balance", issueStance:"support",
      text:"On taking the gavel he replaced nearly all of his predecessor's leadership and committee team, keeping only one holdover as he reshaped the chamber for the 87th Legislature.",
      source:{ label:"WBOY", url:"https://www.wboy.com/news/west-virginia/west-virginia-politics/sen-randy-smith-chosen-as-candidate-for-wv-senate-president/" } }
  ],
  "patrick_martin": [
    { topic:"Youngest Majority Leader in State History", icon:"⏳", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Tapped by President Randy Smith as Majority Leader in January 2025 at age 31, the youngest person ever to hold the post; Smith called him 'the hidden gem in our chamber.'",
      source:{ label:"WV Press Association", url:"https://wvpress.org/breaking-news/lewis-countys-sen-martin-named-west-virginia-senate-majority-leader/" } },
    { topic:"From the House to Floor Leader", icon:"🏛", pos:"support", issueKey:"gov_balance", issueStance:"support",
      text:"A Jane Lew Republican (District 12, covering Lewis, Harrison, Braxton, Clay and part of Gilmer) elected to the Senate in 2020 after service in the House of Delegates; a real-estate business owner.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Patrick_S._Martin" } },
    { topic:"Economic Development Focus", icon:"📈", pos:"support", issueKey:"econ_growth", issueStance:"support",
      text:"Previously vice chair of the Senate's Economic Development Committee, he frames his agenda around bringing 'fresh energy' and growth to the state.",
      source:{ label:"WBOY", url:"https://www.wboy.com/news/west-virginia/west-virginia-politics/lewis-county-senator-to-become-youngest-majority-leader-in-west-virginia-history/" } }
  ],
  "mike_woelfel": [
    { topic:"One of Only Two Senate Democrats", icon:"🔵", pos:"mixed", issueKey:"gov_balance", issueStance:"mixed",
      text:"Minority Leader in a chamber where Democrats hold just 2 of 34 seats; he says that unlike the tight-lipped supermajority he has 'never had that kind of restraint' and will 'let it rip' on the floor when he feels strongly.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Mike_Woelfel" } },
    { topic:"Retiring — and Pushing Term Limits", icon:"🚪", pos:"support", issueKey:"gov_balance", issueStance:"support",
      text:"A Huntington attorney (District 5) who announced he will retire after 2026; a longtime advocate of legislative term limits, he has repeatedly introduced term-limit bills that the majority has not advanced.",
      source:{ label:"WV Gazette-Mail", url:"https://www.wvgazettemail.com/news/legislative_session/wv-senate-minority-leader-mike-woelfel-of-cabell-county-won-t-seek-reelection/article_cf1f613f-58fe-430c-a369-dff1ca59be03.html" } },
    { topic:"Fixing a 'Broken' Foster System", icon:"👧", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Has made West Virginia's overloaded foster-care system — with roughly 6,000 children in state care — a signature cause, saying lawmakers 'let them down' and the system is broken.",
      source:{ label:"WV Legislature", url:"https://home.wvlegislature.gov/senator/michael-a-woelfel/" } }
  ],

  /* ── NEW MEXICO ──────────────────────────────────────────────────────── */
  "mimi_stewart": [
    { topic:"Ethics Complaint Over a Staff Blowup", icon:"🧾", pos:"mixed", issueKey:"gov_transparency", issueStance:"mixed",
      text:"President pro Tempore who in 2025 was the subject of a later-dismissed ethics complaint accusing her of yelling at a staffer; GOP Leader Bill Sharer called it 'verbal abuse,' while she disputed the account.",
      source:{ label:"Searchlight New Mexico", url:"https://searchlightnm.org/after-three-decades-in-the-roundhouse-senate-powerhouse-mimi-stewart-unwavering/" } },
    { topic:"Senate President pro Tempore", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"An Albuquerque Democrat and former public-school teacher, in the Legislature nearly three decades; she has led the Senate as pro tem since 2021, one of its most powerful members.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Mimi_Stewart" } },
    { topic:"Education & Gun Safety", icon:"🍎", pos:"support", issueKey:"public_schools", issueStance:"support",
      text:"A career educator who champions public-school investment and has backed the Democratic majority's gun-safety measures.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Mimi_Stewart" } }
  ],
  "peter_wirth": [
    { topic:"A Decade-Long War on Dark Money", icon:"💸", pos:"support", issueKey:"gov_transparency", issueStance:"support",
      text:"Majority Leader who has spent more than a decade pushing campaign-finance disclosure bills to unmask 'dark money,' calling one 2021 effort to close a donor-secrecy loophole 'a baby step.'",
      source:{ label:"New Mexico In Depth", url:"https://nmindepth.com/2021/sen-wirth-seeks-to-close-dark-money-loophole/" } },
    { topic:"Senate Majority Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"A Santa Fe Democrat, attorney and mediator in the Senate since 2009; he became Majority Leader in 2017 after the previous leader was ousted amid heavy super-PAC spending.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Peter_Wirth_(politician)" } },
    { topic:"Close Loopholes, Cut the Rate", icon:"💰", pos:"mixed", issueKey:"lower_taxes", issueStance:"mixed",
      text:"A tax attorney who has repeatedly proposed lowering the corporate tax rate while raising revenue by closing loopholes — pairing rate cuts with base-broadening.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Peter_Wirth" } }
  ],
  "william_sharer": [
    { topic:"The 3½-Hour Energy Filibuster", icon:"🛢", pos:"oppose", issueKey:"energy_production", issueStance:"support",
      text:"Minority Leader who in 2019 mounted a rambling three-and-a-half-hour filibuster against the Energy Transition Act — the coal-plant closure and renewables law — to defend fossil-fuel jobs; the bill still passed 32-9.",
      source:{ label:"Santa Fe New Mexican", url:"https://www.santafenewmexican.com/news/legislature/after-filibuster-senate-oks-power-plant-shutdown-bill/article_cd917a58-b3f0-5057-8e32-d3c0578efafe.html" } },
    { topic:"Senate Republican Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"A Farmington Republican (District 1) from the oil-, gas- and coal-heavy northwest corner, in the Senate since 2001 and chosen Minority Leader in 2025.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/William_Sharer" } },
    { topic:"Defender of Oil & Gas", icon:"⛽", pos:"support", issueKey:"energy_production", issueStance:"support",
      text:"Positions himself as the chamber's leading opponent of legislation he sees as threatening New Mexico's fossil-fuel industry and the jobs it supports.",
      source:{ label:"NM Legislature", url:"https://www.nmlegis.gov/members/Legislator?SponCode=SSHAR" } }
  ],

  /* ── DELAWARE ────────────────────────────────────────────────────────── */
  "david_sokola": [
    { topic:"The Father of Delaware's Charter Schools", icon:"🎓", pos:"support", issueKey:"school_choice", issueStance:"support",
      text:"President pro Tempore who sponsored the 1995 Charter School Act and later overhauled it; a longtime charter and standardized-testing champion, he has been, in critics' words, 'a lightning rod of controversy' as the Senate's education power broker.",
      source:{ label:"Bay to Bay News", url:"https://baytobaynews.com/stories/sokola-and-massett-court-could-unravel-charter-school-law,220403" } },
    { topic:"Retiring After 36 Years", icon:"🚪", pos:"mixed", issueKey:"gov_balance", issueStance:"mixed",
      text:"A Newark Democrat (District 8) first elected in 1990 and the General Assembly's longest-tenured member; he announced in January 2026 he will retire and not seek re-election.",
      source:{ label:"Spotlight Delaware", url:"https://spotlightdelaware.org/2026/01/15/delaware-senate-leader-sokola-announces-retirement/" } },
    { topic:"LGBTQ+ Rights", icon:"🏳️‍🌈", pos:"support", issueKey:"lgbtq_rights", issueStance:"support",
      text:"Beyond education he sponsored measures adding sexual orientation to Delaware's nondiscrimination law and recognizing civil unions, a precursor to same-sex marriage.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/David_Sokola" } }
  ],
  "bryan_townsend": [
    { topic:"Toppled a Sitting Senate President", icon:"🗳", pos:"support", issueKey:"gov_balance", issueStance:"support",
      text:"A political newcomer in 2012 when he unseated Senate President pro Tempore Anthony DeLuca in the Democratic primary, 57%-42% — a rare defeat of the chamber's top officer.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Bryan_Townsend" } },
    { topic:"Cash Bail & Preventive Detention", icon:"⚖️", pos:"mixed", issueKey:"justice_reform", issueStance:"mixed",
      text:"Majority Leader who has led criminal-justice bills from moving away from cash bail to a constitutional amendment (SB 11/12) letting courts deny bail for 38 violent offenses — reform and public-safety impulses in tension.",
      source:{ label:"Delaware Senate Democrats", url:"https://senatedems.delaware.gov/members/senate-district-11/" } },
    { topic:"Health Care Access", icon:"🏥", pos:"support", issueKey:"healthcare", issueStance:"support",
      text:"A Newark Democrat (District 11), Yale-trained attorney and Majority Leader since 2020 who centers primary-care access, reproductive rights and expanded coverage.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Bryan_Townsend_(American_politician)" } }
  ],
  "marie_pinkney": [
    { topic:"Beat a Leader Who Blocked Gun Bills", icon:"🗳", pos:"support", issueKey:"gun_safety", issueStance:"support",
      text:"A progressive social worker who in 2020 unseated Senate President pro Tempore David McBride in the primary, a race widely read as a rebuke of his bottling up of gun-control bills in his committee.",
      source:{ label:"The Seattle Times", url:"https://www.seattletimes.com/nation-world/nation/progressive-newcomer-defeats-delaware-state-senate-leader/" } },
    { topic:"Overhauling Probation", icon:"⚖️", pos:"support", issueKey:"justice_reform", issueStance:"support",
      text:"A New Castle County Democrat (District 13) whose signature Senate Bill 4 rewrites probation to cut excessive terms and conditions and make the system more rehabilitative than punitive.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Marie_Pinkney" } },
    { topic:"Corrections & Re-entry", icon:"🔓", pos:"support", issueKey:"justice_reform", issueStance:"support",
      text:"Convenes an annual 'State of the State of Corrections' summit bringing together DOC staff, advocates and formerly incarcerated people to press re-entry reform.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Marie_Pinkney" } }
  ],
  "gerald_hocker": [
    { topic:"A Beach-Town Grocer Leading the GOP", icon:"🛒", pos:"support", issueKey:"econ_smallbiz", issueStance:"support",
      text:"Minority Leader since 2019 and a Sussex County businessman who, with his wife, owns Hocker's Super Center and other stores near Bethany Beach; he casts himself as a small-business voice against regulation.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Gerald_Hocker" } },
    { topic:"Senate Republican Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"An Ocean View Republican (District 20) in the Senate since 2012 after a decade in the House; he leads the GOP minority against the Democratic majority.",
      source:{ label:"Delaware Senate Republicans", url:"https://senategop.delaware.gov/members/senate-district-20/" } },
    { topic:"Taxes & Business Costs", icon:"💰", pos:"support", issueKey:"lower_taxes", issueStance:"support",
      text:"Focuses on holding down taxes and business costs for coastal Sussex County employers and the tourism economy.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Gerald_Hocker" } }
  ]

  };
  Object.keys(X).forEach(function (k) { S[k] = X[k]; });
})();
