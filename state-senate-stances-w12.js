/* PolitiDex stance data — STATE SENATE wave 12 (North Dakota, Wyoming, Alaska,
   Vermont).
   ---------------------------------------------------------------------------------
   Additive module, same contract as waves 1–11. Augments the shared
   window.ISSUE_STANCE_DATA object so every consumer (My Stances "Your Stance vs
   Their Record", the Say-vs-Do engine, the Alignment Tool, Stance-at-a-Glance,
   and the Government Contracting "by state" ties) lights these senators up
   automatically.

   CONTROVERSY-FIRST: each entry leads with the defining or most divisive item on
   the official's public record, then the substantive positions anchoring their
   tenure. Neutrally worded; every stance carries a real {label,url} source;
   issueKey values are canonical (ISSUE_MAP in alignment-tool.js).

   Structural notes: Alaska's Senate is run by a multipartisan coalition (Democrats
   plus several Republicans), so its "majority leader" leads that coalition, not a
   party. Vermont's presiding officer is the lieutenant governor; its working head
   is the President pro tempore. This wave contributes 13 new sourced profiles and
   only ADDS keys — it never overwrites an existing one.

   Loaded with `defer` after the core/ext chunks; pure data (no functions). */
(function () {
  'use strict';
  var S = window.ISSUE_STANCE_DATA || (window.ISSUE_STANCE_DATA = {});
  var X = {

  /* ── NORTH DAKOTA ────────────────────────────────────────────────────── */
  "david_hogue": [
    { topic:"'I Love Pipelines' — But Backed Landowners", icon:"🛢", pos:"mixed", issueKey:"property_rights", issueStance:"mixed",
      text:"Majority Leader who, amid the fight over Summit's carbon pipeline, voted against banning eminent domain for CO2 lines yet backed a bill letting landowners recover legal fees — 'I love pipelines, but that doesn't mean the landowner shouldn't be treated fairly.'",
      source:{ label:"North Dakota Monitor", url:"https://northdakotamonitor.com/2025/02/17/bill-supports-north-dakota-landowners-caught-in-costly-legal-battles/" } },
    { topic:"Senate Majority Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"A Minot Republican (District 38) and attorney in the Senate since 2009, re-elected majority leader unopposed for 2025; he leads a 42-5 Republican supermajority.",
      source:{ label:"Bismarck Tribune", url:"https://bismarcktribune.com/news/state-regional/government-politics/north-dakota-legislature-gop-republican-leaders-lefor-hogue-bosch/article_5ccd4fe2-a1cf-11ef-bea8-438eddbf8c8b.html" } },
    { topic:"Property-Tax Reform", icon:"💰", pos:"support", issueKey:"lower_taxes", issueStance:"support",
      text:"Has led the Senate's push for property-tax relief, a dominant theme in North Dakota after voters weighed a 2024 measure to abolish the tax.",
      source:{ label:"North Dakota Legislature", url:"https://ndlegis.gov/biography/david-hogue" } }
  ],
  "kathy_hogan": [
    { topic:"Leading a Five-Member Superminority", icon:"🔵", pos:"mixed", issueKey:"gov_balance", issueStance:"mixed",
      text:"Democratic-NPL Minority Leader in a chamber where her caucus holds just 5 of 47 seats; she announced in 2026 she will retire, ending a long tenure leading the state's shrinking Democratic bench.",
      source:{ label:"North Dakota Monitor", url:"https://northdakotamonitor.com/2026/01/15/north-dakota-democratic-legislative-leader-kathy-hogan-will-not-seek-reelection-in-2026/" } },
    { topic:"Human-Services Champion", icon:"🤝", pos:"support", issueKey:"healthcare", issueStance:"support",
      text:"A Fargo Democrat (District 21) with a social-services background who centers behavioral health, child welfare and safety-net programs.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Kathy_Hogan" } },
    { topic:"Senate Democratic Leader", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Minority Leader since 2023 after nearly a decade in the House; District 21 has elected only Democrats since 2007.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Kathy_Hogan" } }
  ],
  "brad_bekkedahl": [
    { topic:"Holds the Purse Strings for Oil Country", icon:"🛢", pos:"support", issueKey:"energy_production", issueStance:"support",
      text:"President pro Tempore and Appropriations chair from Williston, the heart of the Bakken oil patch; he steers 'hub city' funding tied to the energy boom's local impacts.",
      source:{ label:"North Dakota Legislature", url:"https://ndlegis.gov/biography/brad-bekkedahl" } },
    { topic:"Senate President pro Tempore", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"A Williston Republican (District 1), dentist and longtime city finance commissioner in the Senate since 2015; he took the pro tem post in January 2025.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Brad_Bekkedahl" } },
    { topic:"Infrastructure & Tax Relief", icon:"🛣", pos:"support", issueKey:"lower_taxes", issueStance:"support",
      text:"Points to debt relief, four-lane highway projects, school revenue and tax relief as the throughline of his tenure.",
      source:{ label:"KEYZ Radio", url:"https://keyzradio.com/brad-bekkedahl-re-election/" } }
  ],

  /* ── WYOMING ─────────────────────────────────────────────────────────── */
  "bo_biteman": [
    { topic:"A Senate That Won't Bend to the House", icon:"🤠", pos:"mixed", issueKey:"gov_balance", issueStance:"mixed",
      text:"Senate President elected with Freedom Caucus support who then repeatedly squared off with the Freedom-Caucus-controlled House, positioning the Senate as a brake on the hardliners' agenda.",
      source:{ label:"Cowboy State Daily", url:"https://cowboystatedaily.com/2024/11/23/bo-biteman-named-wyoming-senate-president-chip-neiman-is-new-house-speaker/" } },
    { topic:"Senate President", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"A Ranchester Republican who leads a 29-2 GOP supermajority; in 2026 he entered the crowded race for Wyoming's lone U.S. House seat.",
      source:{ label:"WyoFile", url:"https://wyofile.com/wyoming-senate-president-bo-biteman-joins-crowded-field-for-u-s-house/" } },
    { topic:"Fiscal Conservatism", icon:"💰", pos:"support", issueKey:"lower_taxes", issueStance:"support",
      text:"A staunch fiscal conservative aligned with the property-tax-cut and spending-restraint themes dominating the Legislature.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Bo_Biteman" } }
  ],
  "tara_nethercott": [
    { topic:"The Moderate the Freedom Caucus Targets", icon:"🎯", pos:"mixed", issueKey:"gov_balance", issueStance:"mixed",
      text:"Majority Floor Leader and a traditional conservative stripped of her Appropriations seat as hardliners consolidated power; in 2026 the Freedom Caucus attacked her over remarks defending the courts against 'lawfare.'",
      source:{ label:"Cowboy State Daily", url:"https://cowboystatedaily.com/2026/05/07/wyoming-freedom-caucus-criticizes-nethercott-for-calling-for-lawfare/" } },
    { topic:"First Woman Floor Leader in Decades", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"A Cheyenne Republican (District 4) and practicing attorney in the Senate since 2017, the first woman to hold the chamber's number-two post in decades; the role lets her decide which bills reach a vote.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Tara_Nethercott" } },
    { topic:"Rule of Law & the Courts", icon:"⚖️", pos:"support", issueKey:"gov_transparency", issueStance:"support",
      text:"Has cast herself as a defender of an independent judiciary and against 'unsavory' campaign tactics, drawing fire from her party's right flank.",
      source:{ label:"Wyoming Tribune Eagle", url:"https://www.wyomingnews.com/laramieboomerang/opinion/wyoming-freedom-caucus-and-opponents-won-t-be-singing-kumbaya/article_cbff30ac-b407-11ef-92c5-bfefe7218855.html" } }
  ],
  "mike_gierau": [
    { topic:"A Democrat From Wyoming's Only Blue County", icon:"🏔", pos:"mixed", issueKey:"gov_balance", issueStance:"mixed",
      text:"Minority Leader and one of just two Democrats in the 31-seat Senate, from Teton County — the only county in the state with a Democratic majority; 'as a super minority member, I don't have the luxury of not listening.'",
      source:{ label:"Cowboy State Daily", url:"https://cowboystatedaily.com/2025/02/18/mike-gierau-is-the-ultimate-wyoming-political-underdog-a-democrat-from-jackson/" } },
    { topic:"The Minority's Budget Guru", icon:"📊", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"A Jackson Democrat (District 17) on the Appropriations Committee since 2020 who calls the state budget — 'Senate File 1' — the work he is proudest of.",
      source:{ label:"Jackson Hole News&Guide", url:"https://www.jhnewsandguide.com/the_hole_scroll/mike-gierau-runs-for-third-term-in-senate-hopes-to-continue-on-as-budget-guru/article_cd89c27c-f7c9-4874-86ca-de080f1674f8.html" } },
    { topic:"Small-Business Owner", icon:"🏪", pos:"support", issueKey:"econ_smallbiz", issueStance:"support",
      text:"A longtime Jackson businessman who has owned the Jedediah Corporation since 1980 and brings that lens to economic debates.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Mike_Gierau" } }
  ],

  /* ── ALASKA (multipartisan coalition) ────────────────────────────────── */
  "gary_stevens": [
    { topic:"A Republican Leading a Bipartisan Coalition", icon:"🤝", pos:"support", issueKey:"gov_balance", issueStance:"support",
      text:"Senate President who, as a Republican, heads a multipartisan coalition of 9 Democrats and 5 Republicans — 'partisan politics is not necessary for success in Juneau' — leaving a six-member all-GOP minority outside.",
      source:{ label:"Must Read Alaska", url:"https://mustreadalaska.com/status-quo-alaska-senate-with-mostly-same-members-to-keep-bipartisan-coalition/" } },
    { topic:"Retiring After 22 Years", icon:"🎓", pos:"support", issueKey:"public_schools", issueStance:"support",
      text:"A Kodiak Republican, retired university history professor and former mayor who is retiring at term's end — 'I'm 83 now… I think that's just enough' — and who prioritized restoring public-school funding.",
      source:{ label:"Alaska Beacon", url:"https://alaskabeacon.com/2025/05/21/senate-president-gary-stevens-to-retire-house-rep-louise-stutes-announces-run-for-seat/" } },
    { topic:"Senate President", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Serving a fourth term as Senate President (a post he also held 2009–2013), among the longest-tenured members in the Legislature.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Gary_Stevens_(politician)" } }
  ],
  "cathy_giessel": [
    { topic:"Primaried Out, Then Back via Ranked Choice", icon:"🔄", pos:"mixed", issueKey:"gov_balance", issueStance:"mixed",
      text:"Majority Leader who was ousted in the 2020 GOP primary after leading a bipartisan coalition as Senate President, then won her seat back under Alaska's new open-primary and ranked-choice system — a marquee example of those reforms.",
      source:{ label:"The American Leader", url:"https://theamericanleader.org/leader/cathy-giessel-model-governing-election-reforms/" } },
    { topic:"Champion of Reviving Public Pensions", icon:"💼", pos:"support", issueKey:"econ_workers", issueStance:"support",
      text:"An Anchorage Republican who has led the drive to restore a defined-benefit pension for state workers — once folding a 52-page pension plan into an unrelated teacher-shortage bill — arguing it aids recruitment and retention.",
      source:{ label:"Must Read Alaska", url:"https://mustreadalaska.com/stuff-it-sen-giessel-shoves-52-page-pension-plan-into-governors-one-page-bill-addressing-teacher-shortage-senate-passes-it/" } },
    { topic:"A Nurse in the Statehouse", icon:"🏥", pos:"support", issueKey:"healthcare", issueStance:"support",
      text:"A registered nurse and advanced nurse practitioner who brings a clinical lens to health-care and Medicaid debates.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Cathy_Giessel" } }
  ],
  "bert_stedman": [
    { topic:"The Fiscal Hawk Who Fought the Pension", icon:"🦅", pos:"oppose", issueKey:"econ_workers", issueStance:"oppose",
      text:"Senate Finance co-chair who opposed restoring a defined-benefit pension — even as it passed the Senate 12-8 in 2026 — warning it risks repeating the early-2000s shortfall that saddled the state with billions in unfunded liability.",
      source:{ label:"Alaska Beacon", url:"https://alaskabeacon.com/2026/04/29/alaska-senate-votes-to-restore-public-pension-system-amid-debate-around-cost/" } },
    { topic:"Guardian of the Budget", icon:"📊", pos:"support", issueKey:"gov_waste", issueStance:"support",
      text:"A Sitka Republican and longtime Finance co-chair for Southeast Alaska who presses that new costs 'have to be borne' fairly and scrutinizes long-term fiscal risk.",
      source:{ label:"Anchorage Daily News", url:"https://www.adn.com/politics/alaska-legislature/2026/04/25/senate-budgeters-advance-overhauled-public-pension-bill-setting-up-floor-vote/" } },
    { topic:"Senate Finance Co-Chair", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Represents Ketchikan, Sitka, Petersburg and Wrangell; a fixture atop the Finance Committee across multiple legislatures.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Bert_Stedman" } }
  ],
  "loki_tobin": [
    { topic:"Led an 'Unprecedented' Veto Override", icon:"🍎", pos:"support", issueKey:"public_schools", issueStance:"support",
      text:"Senate Education chair who steered lawmakers to override Gov. Mike Dunleavy's 2025 vetoes of school funding — restoring more than $50 million — in what the Senate President called an unprecedented move after years of failed override attempts.",
      source:{ label:"Alaska Beacon", url:"https://alaskabeacon.com/2025/08/02/alaska-lawmakers-override-governors-veto-of-public-school-funding-restoring-services-and-teachers/" } },
    { topic:"Checking the Governor", icon:"⚖️", pos:"support", issueKey:"gov_balance", issueStance:"support",
      text:"An Anchorage Democrat who warned Dunleavy's budget veto of school funding would create 'immeasurable chaos,' then helped assemble the bipartisan supermajority to reverse it.",
      source:{ label:"Anchorage Daily News", url:"https://www.adn.com/politics/2025/05/19/gov-dunleavy-vetoes-bipartisan-education-funding-bill-as-lawmakers-say-override-possible/" } },
    { topic:"Indigenous Education", icon:"🪶", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Plans a constitutional amendment to guarantee that every Alaska child can learn about Indigenous peoples and cultures, citing the nation's largest Indigenous population.",
      source:{ label:"Alaska Public Media", url:"https://alaskapublic.org/news/politics/alaska-legislature/2025-12-15/after-veto-overrides-alaska-gov-dunleavy-drops-push-for-major-education-reform" } }
  ],

  /* ── VERMONT ─────────────────────────────────────────────────────────── */
  "phil_baruth": [
    { topic:"Vermont's Leading Gun-Restriction Voice", icon:"🔫", pos:"support", issueKey:"gun_safety", issueStance:"support",
      text:"President pro Tempore and the Statehouse's strongest advocate of firearm limits; he shepherded a 72-hour waiting period into law (which Gov. Scott let take effect without signing) and has pushed to bar semi-automatic weapons from many public places.",
      source:{ label:"Vermont Public", url:"https://www.vermontpublic.org/local-news/2023-06-02/vermont-gun-bill-including-72-hour-waiting-period-becomes-law-phil-scott" } },
    { topic:"Senate President pro Tempore", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"A Burlington Democrat/Progressive, novelist and UVM English professor who became pro tem in 2023; he named housing and education the Senate's top priorities and plans to retire in 2027.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Philip_Baruth" } },
    { topic:"Framed Around Suicide Prevention", icon:"🕊", pos:"support", issueKey:"health_mental", issueStance:"support",
      text:"Grounds his gun agenda in suicide prevention, noting roughly 60% of Vermont suicides involve a firearm, and has floated raising the purchase age for semi-automatic guns.",
      source:{ label:"VTDigger", url:"https://vtdigger.org/2019/08/16/dems-to-revive-waiting-period-legislation-in-2020-and-push-new-gun-control-measures/" } }
  ],
  "kesha_ram_hinsdale": [
    { topic:"First Woman of Color in the VT Senate", icon:"🌟", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Majority Leader who in 2020 became the first woman of color ever elected to the Vermont Senate; in 2024 she unseated the two-term incumbent majority leader in a secret-ballot caucus vote.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Kesha_Ram_Hinsdale" } },
    { topic:"Climate Action", icon:"🌍", pos:"support", issueKey:"climate_action", issueStance:"support",
      text:"A Chittenden Southeast Democrat who has made climate policy and support for working families central to her long legislative career, begun as the nation's youngest state legislator.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Kesha_Ram_Hinsdale" } },
    { topic:"Housing", icon:"🏠", pos:"support", issueKey:"housing", issueStance:"support",
      text:"Places housing affordability among the majority's top priorities amid Vermont's acute shortage.",
      source:{ label:"Vermont Legislature", url:"https://legislature.vermont.gov/people/single/2024/34727" } }
  ],
  "john_rodgers": [
    { topic:"A Democrat Who Switched and Won Statewide", icon:"🔀", pos:"mixed", issueKey:"gov_balance", issueStance:"mixed",
      text:"Lieutenant Governor and Senate President who spent 16 years in the Legislature as a Democrat before switching to the Republican Party in 2024 and defeating Progressive incumbent David Zuckerman, citing Vermont's cost of living.",
      source:{ label:"Vermont Public", url:"https://www.vermontpublic.org/local-news/2025-01-09/lawmakers-elect-republican-john-rodgers-as-lieutenant-governor" } },
    { topic:"A Gun-Rights Democrat-Turned-Republican", icon:"🔫", pos:"support", issueKey:"gun_rights", issueStance:"support",
      text:"A fervent gun-rights supporter who once launched a write-in campaign for governor to protest a 2018 gun-reform package — a rare stance on the left-leaning side of Vermont politics.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/John_S._Rodgers" } },
    { topic:"Cannabis Farmer and 'Working-Class Voice'", icon:"🌿", pos:"support", issueKey:"cannabis_reform", issueStance:"support",
      text:"A Glover farmer who grows cannabis and casts himself as a libertarian-leaning 'voice for the working class,' pledging to preside in a bipartisan way.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/John_Rodgers_(Vermont)" } }
  ]

  };
  Object.keys(X).forEach(function (k) { S[k] = X[k]; });
})();
