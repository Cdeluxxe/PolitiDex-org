/* PolitiDex stance data — STATE SENATE wave 13 (Utah, Maine, Hawaii, Rhode Island).
   ---------------------------------------------------------------------------------
   FINAL coverage wave. With these four chambers, the state-senate leadership push
   reaches all 50 states. Additive module, same contract as waves 1–12: it augments
   the shared window.ISSUE_STANCE_DATA object so every consumer (My Stances "Your
   Stance vs Their Record", the Say-vs-Do engine, the Alignment Tool,
   Stance-at-a-Glance, and the Government Contracting "by state" ties) lights these
   senators up automatically.

   CONTROVERSY-FIRST: each entry leads with the defining or most divisive item on
   the official's public record, then the substantive positions anchoring their
   tenure. Neutrally worded; every stance carries a real {label,url} source;
   issueKey values are canonical (ISSUE_MAP in alignment-tool.js).

   Note: Hawaii's and Rhode Island's Senates are among the most one-party chambers
   in the country, so their "minority leaders" head very small caucuses. This wave
   contributes 11 new sourced profiles and only ADDS keys — it never overwrites one.
   (Utah's floor leaders were already curated elsewhere; see the note below.)

   Loaded with `defer` after the core/ext chunks; pure data (no functions). */
(function () {
  'use strict';
  var S = window.ISSUE_STANCE_DATA || (window.ISSUE_STANCE_DATA = {});
  var X = {

  /* ── UTAH ────────────────────────────────────────────────────────────── */
  "stuart_adams": [
    { topic:"His Voucher Program Was Ruled Unconstitutional", icon:"🎓", pos:"support", issueKey:"school_choice", issueStance:"support",
      text:"Senate President and a driving force behind the $100M 'Utah Fits All' scholarship, which a district court struck down in 2025 as an unconstitutional diversion of education funds after the teachers' union sued; he called the ruling disappointing and vowed to appeal.",
      source:{ label:"Utah News Dispatch", url:"https://utahnewsdispatch.com/2025/04/18/utah-fits-all-voucher-program-is-unconstitutional-district-court-rules/" } },
    { topic:"Amendment D and Ballot Initiatives", icon:"🗳", pos:"mixed", issueKey:"gov_transparency", issueStance:"mixed",
      text:"Backed Amendment D, which would have affirmed the Legislature's power to amend or repeal citizen ballot initiatives; courts voided it after leaders acknowledged they failed to give the required public notice.",
      source:{ label:"Utah News Dispatch", url:"https://utahnewsdispatch.com/2024/10/09/judge-voids-amendment-a-education-earmark-votes-wont-count/" } },
    { topic:"Senate President", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"A Layton Republican (District 7) and homebuilder who has led the Senate since 2019, steering a 22-6 GOP supermajority (plus one independent).",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/2025_Utah_legislative_session" } }
  ],
  /* Utah's Senate Majority Leader (Kirk Cullimore) and Minority Leader (Luz
     Escamilla) already ship richer curated profiles in politician-stances-ext.js,
     so they are intentionally NOT redefined here — this module only ADDS. With
     President Adams above, Utah's leadership trio is fully covered across the set. */

  /* ── MAINE ───────────────────────────────────────────────────────────── */
  "mattie_daughtry": [
    { topic:"Architect of Paid Family & Medical Leave", icon:"👶", pos:"support", issueKey:"econ_workers", issueStance:"support",
      text:"Senate President and lead sponsor of Maine's paid family and medical leave law, one of her proudest achievements; she has publicly defended it against a wave of bills seeking to delay or dismantle the program as an added cost on workers.",
      source:{ label:"Maine Morning Star", url:"https://mainemorningstar.com/2024/11/08/maine-senate-democrats-select-daughtry-as-president-to-lead-majority-next-session/" } },
    { topic:"Youngest Woman Senate President", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"A Brunswick Democrat elected president at 37 — the youngest woman ever to hold the post and the first Brunswick senator to lead the chamber since 1831; in the Legislature since age 25.",
      source:{ label:"Portland Press Herald", url:"https://www.pressherald.com/2024/11/08/democrats-pick-brunswick-sen-daughtry-to-lead-maine-senate/" } },
    { topic:"Small-Business Owner", icon:"🍺", pos:"support", issueKey:"econ_smallbiz", issueStance:"support",
      text:"Co-owns and brews at Moderation Brewing Company in Brunswick, bringing a small-employer's lens to labor and economic debates.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Mattie_Daughtry" } }
  ],
  "teresa_pierce": [
    { topic:"Labor's Perfect-Score Majority Leader", icon:"🛠", pos:"support", issueKey:"econ_workers", issueStance:"support",
      text:"Majority Leader who earned a perfect score from the Maine AFL-CIO for her votes supporting working families, aligning the Senate's floor agenda with organized labor.",
      source:{ label:"Maine Senate Democrats", url:"https://www.mainesenate.org/sen-pierce-earns-perfect-score-from-maine-afl-cio-for-voting-record-supporting-working-families/" } },
    { topic:"Housing", icon:"🏠", pos:"support", issueKey:"housing", issueStance:"support",
      text:"A Falmouth Democrat (District 25) and former town councilor who chaired the Senate's housing select committee, making the state's housing shortage a priority.",
      source:{ label:"Maine Senate Democrats", url:"https://www.mainesenate.org/senator/senator/senator-teresa-pierce/" } },
    { topic:"Budget Experience", icon:"💵", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"A former House chair of Appropriations and Financial Affairs who brings deep budget experience to the majority's leadership team.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Teresa_Pierce" } }
  ],
  "trey_stewart": [
    { topic:"One of the Youngest Leaders in the Statehouse", icon:"⏳", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Senate Republican Leader first chosen at 28 — a law graduate and ambitious riser — who has repeatedly out-legislated peers even in the minority, and now leads a 14-member GOP caucus against the Democratic majority.",
      source:{ label:"Bangor Daily News", url:"https://www.bangordailynews.com/2022/11/10/politics/trey-stewart-maine-senate-minority-leader/" } },
    { topic:"Holding the Line on Taxes & Spending", icon:"💰", pos:"support", issueKey:"lower_taxes", issueStance:"support",
      text:"A Presque Isle Republican (District 2) from rural Aroostook County who has vowed to work with Democrats while resisting tax hikes and state-spending growth.",
      source:{ label:"Maine Senate Republicans", url:"https://mesenategop.com/your-senators/senator-trey-stewart/" } },
    { topic:"Navy Reserve Officer", icon:"⚓", pos:"support", issueKey:"veterans", issueStance:"support",
      text:"Serves as an intelligence officer in the U.S. Navy Reserve, a background he brings to security and veterans' issues.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Trey_Stewart" } }
  ],

  /* ── HAWAII ──────────────────────────────────────────────────────────── */
  "ronald_kouchi": [
    { topic:"A Decade Leading a One-Party Senate", icon:"🏝", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Senate President since 2015 who presides over one of the most lopsided chambers in the nation (22 Democrats to 3 Republicans), setting the agenda for a body with almost no partisan opposition.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Ronald_Kouchi" } },
    { topic:"Cost of Living & Recovery", icon:"💸", pos:"support", issueKey:"cost_living", issueStance:"support",
      text:"A Kauaʻi Democrat (District 8) who centers the islands' affordability crisis and disaster recovery among the Senate's priorities.",
      source:{ label:"Hawaiʻi Public Radio", url:"https://www.hawaiipublicradio.org/the-conversation/2026-01-27/senate-president-ron-kouchi-weighs-in-on-state-of-the-islands" } },
    { topic:"Longest-Serving Presiding Officer", icon:"🏛", pos:"support", issueKey:"gov_balance", issueStance:"support",
      text:"Among the longest-tenured Senate presidents in the country, a former Kauaʻi County Council chair who has held the gavel for more than a decade.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Ron_Kouchi" } }
  ],
  "brenton_awa": [
    { topic:"The Viral News Anchor Turned Firebrand", icon:"📺", pos:"mixed", issueKey:"gov_balance", issueStance:"mixed",
      text:"Minority Leader and former KITV anchor known for combative, widely shared floor speeches; he cast more than 1,000 'no' votes in his first two sessions and was the sole 'no' on 10% of all bills passed — unmatched in recent memory.",
      source:{ label:"Honolulu Civil Beat", url:"https://civilbeat.org/2025/01/the-sunshine-blog-what-has-gotten-into-sen-brenton-awa/" } },
    { topic:"Fined by the Ethics Commission", icon:"🧾", pos:"mixed", issueKey:"gov_transparency", issueStance:"mixed",
      text:"The state Ethics Commission fined him $999.99 for a social-media video made in his Capitol office that promoted a Senate candidate days before the 2024 election; he disputed the finding and called the case political.",
      source:{ label:"Honolulu Star-Advertiser", url:"https://www.staradvertiser.com/2025/12/05/hawaii-news/ethics-panel-fines-state-senator-brenton-awa/" } },
    { topic:"Cost of Living & Native Hawaiians", icon:"🌺", pos:"support", issueKey:"cost_living", issueStance:"support",
      text:"A Windward Oʻahu Republican (District 23) who flipped a Democratic seat in 2022 and centers Hawaiʻi's cost of living and the status of Native Hawaiians; in 2025 he launched a run for Congress.",
      source:{ label:"Hawaii News Now", url:"https://www.hawaiinewsnow.com/2025/10/27/republican-state-senator-confirms-decision-run-congress/" } }
  ],
  "dru_kanuha": [
    { topic:"Twelve Generations in Kona", icon:"🌋", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Majority Leader whose family traces its Kona lineage back twelve generations; first elected at 28 and named majority leader in 2021, he steers the floor agenda for the Democratic supermajority.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Dru_Kanuha" } },
    { topic:"Housing & Education", icon:"🏠", pos:"support", issueKey:"housing", issueStance:"support",
      text:"A Kona and Kaʻū Democrat (District 3) and former County Council chair who serves on Ways and Means, Housing and Education, focused on the island's housing squeeze.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Dru_Kanuha" } },
    { topic:"Public Schools", icon:"🍎", pos:"support", issueKey:"public_schools", issueStance:"support",
      text:"A product of Kona public schools who backs public-education investment as part of the majority's agenda.",
      source:{ label:"Digital Democracy (Civil Beat)", url:"https://civilbeat.digitaldemocracy.org/legislators/dru-kanuha-187592" } }
  ],

  /* ── RHODE ISLAND ────────────────────────────────────────────────────── */
  "valarie_lawson": [
    { topic:"Senate President and Teachers'-Union Boss", icon:"🍎", pos:"mixed", issueKey:"gov_transparency", issueStance:"mixed",
      text:"Elected Senate President days after Dominick Ruggerio's 2025 death while simultaneously serving as president of the ~12,000-member NEA Rhode Island; the Ethics Commission let her keep both roles but required her to recuse on matters benefiting the union.",
      source:{ label:"Ocean State Media", url:"https://www.oceanstatemedia.org/politics/lawson-wins-r-i-senate-presidency-while-retaining-prominent-union-role" } },
    { topic:"Moved an Assault-Weapons Ban", icon:"🔫", pos:"support", issueKey:"gun_safety", issueStance:"support",
      text:"A co-sponsor of a ban on assault-style weapons who, after insisting she cut no deal to kill it, used her new power to bring a revised version to a Senate floor vote in 2025.",
      source:{ label:"The Boston Globe", url:"https://www.bostonglobe.com/2025/06/18/metro/ri-assault-weapons-ban-senate-debate/" } },
    { topic:"Public Education", icon:"🏫", pos:"support", issueKey:"public_schools", issueStance:"support",
      text:"An East Providence Democrat and career educator seen as more progressive than her predecessor, who has not ruled out raising taxes on high earners.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Valarie_Lawson" } }
  ],
  "frank_ciccone": [
    { topic:"A Gun Dealer Voting on Gun Bans", icon:"🔫", pos:"oppose", issueKey:"gun_rights", issueStance:"support",
      text:"Majority Leader and a licensed firearms dealer of four decades who opposes the assault-weapons ban; the Ethics Commission ruled 8-1 he may still vote on gun legislation under a 'class exception,' over a dissent citing his outsized leadership clout.",
      source:{ label:"The Boston Globe", url:"https://www.bostonglobe.com/2025/05/20/metro/ri-assault-weapons-ban-frank-ciccone-ethics-commission/" } },
    { topic:"A Conservative Democrat", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"A Providence Democrat in the Senate since 2003, elevated to Majority Leader in 2025; his record leans conservative on guns, abortion and related issues, at odds with parts of his caucus.",
      source:{ label:"Rhode Island Current", url:"https://rhodeislandcurrent.com/2025/05/16/ciccone-has-been-a-licensed-firearms-dealer-for-decades-should-he-recuse-himself-from-gun-debate/" } },
    { topic:"Labor Ties", icon:"🛠", pos:"support", issueKey:"econ_workers", issueStance:"support",
      text:"A longtime figure with organized-labor ties who has centered union and worker issues across his two decades in the chamber.",
      source:{ label:"Rhode Island Current", url:"https://rhodeislandcurrent.com/2025/04/29/madame-president-r-i-senate-picks-lawson-to-lead-with-ciccone-as-her-no-2/" } }
  ],
  "jessica_de_la_cruz": [
    { topic:"The GOP Voice in a Democratic Fortress", icon:"🗳", pos:"support", issueKey:"school_choice", issueStance:"support",
      text:"Minority Leader who delivered the Republican response to the governor's State of the State, championing school choice and 'constitutional norms' while leading a caucus of just a handful of senators.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Jessica_de_la_Cruz" } },
    { topic:"Rebuilding Zambarano Hospital", icon:"🏥", pos:"support", issueKey:"healthcare", issueStance:"support",
      text:"A North Smithfield Republican (District 23), daughter of Portuguese immigrants, who secured more than $100 million to rebuild the Zambarano unit of Eleanor Slater Hospital in her district.",
      source:{ label:"RI Legislature", url:"https://www.rilegislature.gov/senators/de%20la%20Cruz/Pages/Biography.aspx" } },
    { topic:"Senate Republican Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Minority Leader since 2022 who in 2026 opted to seek re-election to her post rather than run for governor.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Jessica_de_la_Cruz" } }
  ],
  "ryan_pearson": [
    { topic:"The Leader Ruggerio Pushed Out", icon:"🔻", pos:"mixed", issueKey:"gov_balance", issueStance:"mixed",
      text:"A former Majority Leader dropped from leadership in 2024 amid a feud with the ailing Senate President; after Ruggerio's death he ran for president in a three-way contest and lost, finishing second with 8 votes to Lawson's 24.",
      source:{ label:"Rhode Island Current", url:"https://rhodeislandcurrent.com/2025/04/21/ruggerios-death-reignites-battle-for-top-r-i-senate-leadership-spot/" } },
    { topic:"Fiscal Policy", icon:"💵", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"A Cumberland Democrat who built his career on budget and finance leadership before the leadership shake-up sidelined him.",
      source:{ label:"The Boston Globe", url:"https://www.bostonglobe.com/2025/04/29/metro/ri-democrats-valarie-lawson-senate-president/" } },
    { topic:"A Voice for Reform", icon:"🔄", pos:"support", issueKey:"gov_transparency", issueStance:"support",
      text:"Publicly warned that Lawson would 'have a very hard time navigating' conflicts between leading the Senate and a major teachers' union.",
      source:{ label:"Rhode Island Current", url:"https://rhodeislandcurrent.com/2025/04/29/madame-president-r-i-senate-picks-lawson-to-lead-with-ciccone-as-her-no-2/" } }
  ]

  };
  Object.keys(X).forEach(function (k) { S[k] = X[k]; });
})();
