/* PolitiDex stance data — STATE SENATE wave 14 (DEPTH phase, megastates I).
   ---------------------------------------------------------------------------------
   With all 50 states covered at the leadership level (base file + waves 2–13), this
   wave begins DEEPENING the largest chambers: notable committee chairs and
   high-profile rank-and-file senators in California, Texas, New York and Florida
   who sit beyond the top leadership already profiled.

   Additive module, same contract as prior waves. Augments the shared
   window.ISSUE_STANCE_DATA object so every consumer (My Stances "Your Stance vs
   Their Record", the Say-vs-Do engine, the Alignment Tool, Stance-at-a-Glance, and
   the Government Contracting "by state" ties) lights these senators up automatically.

   Key convention: the megastates in the base file use a `name_state` suffix
   (e.g., wiener_ca), so this wave follows the SAME convention and was checked to not
   collide with any existing key (limon_ca, wiener_ca, bjones_ca, bettencourt_tx,
   paxton_tx, gutierrez_tx, jane_nelson_tx, gianaris_ny, ortt_ny, pizzo_fl,
   passidomo_fl, daniel_perez_fl). Controversy-first; every stance carries a real
   {label,url} source; issueKey values are canonical. This wave adds 12 profiles and
   only ADDS keys — it never overwrites one.

   Loaded with `defer` after the core/ext chunks; pure data (no functions). */
(function () {
  'use strict';
  var S = window.ISSUE_STANCE_DATA || (window.ISSUE_STANCE_DATA = {});
  var X = {

  /* ── CALIFORNIA ──────────────────────────────────────────────────────── */
  "wahab_ca": [
    { topic:"Wrote the Vetoed Caste-Discrimination Ban", icon:"⚖️", pos:"support", issueKey:"justice_reform", issueStance:"support",
      text:"Authored SB 403, which would have made California the first state to explicitly ban caste discrimination; it cleared the Legislature but Gov. Newsom vetoed it as unnecessary, and Wahab reported receiving death threats over the fiercely contested bill.",
      source:{ label:"CalMatters", url:"https://calmatters.org/politics/2023/10/caste-discrimination-newsom/" } },
    { topic:"First Muslim & Afghan-American Senator", icon:"🌙", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"A Fremont Democrat (District 10), the first Muslim and first Afghan-American in the California Senate, who chairs the Public Safety Committee.",
      source:{ label:"Senate District 10", url:"https://sd10.senate.ca.gov/news/statement-senator-aisha-wahab-sb-403" } },
    { topic:"Tenant Protections", icon:"🏘", pos:"support", issueKey:"housing", issueStance:"support",
      text:"A former foster youth and Hayward councilmember who centers renter protections and housing affordability in the Bay Area.",
      source:{ label:"NBC News", url:"https://www.nbcnews.com/news/asian-america/south-asian-activists-call-calif-governors-vetoing-caste-bill-heartbre-rcna119487" } }
  ],
  "durazo_ca": [
    { topic:"Made California First to Cover All Immigrants", icon:"🏥", pos:"support", issueKey:"healthcare", issueStance:"support",
      text:"Her landmark 'Health4All' law made California the first state to open Medi-Cal to all income-eligible residents regardless of immigration status; when the state later froze enrollment and raised premiums, she was one of only two Democrats to vote against the cuts.",
      source:{ label:"Senate District 26", url:"https://sd26.senate.ca.gov/news/senator-maria-elena-durazos-landmark-health4all-bill-makes-california-first-state-nation" } },
    { topic:"Fighting to Restore the Cuts", icon:"↩️", pos:"support", issueKey:"immigration_reform", issueStance:"support",
      text:"A Los Angeles Democrat (District 26) who in 2026 introduced legislation to reverse the Medi-Cal rollbacks for undocumented adults amid the state's budget deficit.",
      source:{ label:"CalMatters", url:"https://calmatters.org/health/2026/03/durazo-reverse-medical-undocumented-immigrants/" } },
    { topic:"A Labor Leader in the Statehouse", icon:"🛠", pos:"support", issueKey:"econ_workers", issueStance:"support",
      text:"A former hotel-workers' union leader who brings an organized-labor lens to wage, worker-protection and immigrant-rights debates.",
      source:{ label:"The Hill", url:"https://thehill.com/changing-america/well-being/prevention-cures/3541196-california-will-offer-health-insurance-to-all-undocumented-immigrants/" } }
  ],
  "umberg_ca": [
    { topic:"Judiciary Chair Steering AI and Bar Oversight", icon:"⚖️", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Reappointed chair of the Senate Judiciary Committee for 2025-26, where he is building an AI legal framework, implementing Prop 36, and pressing accountability for the scandal-hit State Bar of California.",
      source:{ label:"Senate District 34", url:"https://sd34.senate.ca.gov/news/senator-tom-umberg-appointed-chair-california-state-senate-judiciary-committee-2025-2026" } },
    { topic:"Elections & Constitutional Amendments", icon:"🗳", pos:"support", issueKey:"voting_access", issueStance:"support",
      text:"A Santa Ana Democrat (District 34) and former chair of the Elections Committee who has authored measures on election administration and campaign integrity.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Tom_Umberg" } },
    { topic:"Prosecutor and Army Colonel", icon:"🎖", pos:"support", issueKey:"veterans", issueStance:"support",
      text:"A retired U.S. Army colonel and former federal prosecutor and deputy drug czar who brings that background to public-safety and veterans' policy.",
      source:{ label:"Senate District 34", url:"https://sd34.senate.ca.gov/biography" } }
  ],

  /* ── TEXAS ───────────────────────────────────────────────────────────── */
  "hughes_tx": [
    { topic:"Author of the Six-Week Abortion Ban", icon:"🕊", pos:"support", issueKey:"pro_life", issueStance:"support",
      text:"Wrote SB 8, the first six-week 'heartbeat' abortion ban to take effect in the U.S., whose novel citizen-enforcement design was built to evade court review; he has defended it through the legal challenges that followed.",
      source:{ label:"The Texas Tribune", url:"https://www.texastribune.org/2021/09/17/texas-abortion-ban-voting-bryan-hughes/" } },
    { topic:"Architect of Texas' Voting Law", icon:"🗳", pos:"support", issueKey:"election_integrity", issueStance:"support",
      text:"A Mineola Republican (District 1) who also carried the sweeping 2021 elections bill tightening voting rules — pairing the two most nationally watched Texas laws of that session under his name.",
      source:{ label:"CBS Texas", url:"https://www.cbsnews.com/texas/news/state-sen-bryan-hughes-texas-abortion-law-authored-legal-challenges/" } },
    { topic:"Big-Tech 'Censorship' Law", icon:"💻", pos:"support", issueKey:"privacy_rights", issueStance:"support",
      text:"Sponsored the law barring large social-media platforms from banning users over viewpoint, a first-of-its-kind measure that drew immediate constitutional challenges.",
      source:{ label:"The Texas Tribune", url:"https://www.texastribune.org/2021/09/17/texas-abortion-ban-voting-bryan-hughes/" } }
  ],
  "creighton_tx": [
    { topic:"Carried the $1B School-Voucher Law", icon:"🎓", pos:"support", issueKey:"school_choice", issueStance:"support",
      text:"Senate Education chair and sponsor of SB 2, the education-savings-account program giving families ~$10,000 for private school; his committee heard and passed it in a single day, and it became law in 2025 after years of failure.",
      source:{ label:"The Texas Tribune", url:"https://www.texastribune.org/2025/04/24/texas-legislature-passes-vouchers-abbott/" } },
    { topic:"Chair of a Powerful K-16 Committee", icon:"🏫", pos:"support", issueKey:"public_schools", issueStance:"support",
      text:"A Conroe Republican (District 4) who chairs a single committee spanning early childhood through higher education — together about 53% of the state budget — and was elected President Pro Tempore in 2025.",
      source:{ label:"Texas Senate", url:"https://www.senate.texas.gov/members/d04/press/en/p20250117a.pdf" } },
    { topic:"Public-Education Funding", icon:"💵", pos:"mixed", issueKey:"gov_services", issueStance:"mixed",
      text:"Argued the voucher program is funded 'from the surplus,' not public-school dollars, as critics warned it diverts resources from traditional districts.",
      source:{ label:"Houston Public Media", url:"https://www.houstonpublicmedia.org/articles/news/education-news/2025/01/29/512274/texas-school-voucher-proposal-quickly-clears-first-hurdle-of-the-legislative-session/" } }
  ],
  "zaffirini_tx": [
    { topic:"First Woman Dean of the Texas Senate", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"The first Mexican-American woman elected to the Texas Senate (1986) and, since 2023, its first woman Dean; she has cast more than 72,000 consecutive votes and passed nearly 1,400 bills.",
      source:{ label:"AOL / Austin American-Statesman", url:"https://www.aol.com/texas-senate-first-female-dean-170034874.html" } },
    { topic:"The Chamber's Top Bill-Passer", icon:"📜", pos:"support", issueKey:"gov_balance", issueStance:"support",
      text:"A Laredo Democrat (District 21) who has been the highest bill-passer across five straight Republican-dominated sessions, a study in cross-aisle effectiveness from the minority.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Judith_Zaffirini" } },
    { topic:"Higher Education", icon:"🎓", pos:"support", issueKey:"public_schools", issueStance:"support",
      text:"A former Higher Education Committee chair with a Ph.D. who has made college access and university funding a signature focus.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Judith_Zaffirini" } }
  ],

  /* ── NEW YORK ────────────────────────────────────────────────────────── */
  "stewartcousins_ny": [
    { topic:"Broke Albany's 'Three Men in a Room'", icon:"🚪", pos:"support", issueKey:"gov_balance", issueStance:"support",
      text:"Majority Leader and Temporary President who in 2019 became the first woman — and first Black woman — to lead a legislative chamber in New York history, ending the male-only 'three men in a room' budget tradition.",
      source:{ label:"NY Senate", url:"https://www.nysenate.gov/senators/andrea-stewart-cousins/about" } },
    { topic:"Led a Progressive Legislative Wave", icon:"🌊", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"A Yonkers Democrat (District 35) who, after Democrats took the Senate in 2018, steered landmark bills on tenant protections, bail, climate and voting into law.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Andrea_Stewart-Cousins" } },
    { topic:"Longest-Serving Democratic Leader", icon:"🏛", pos:"support", issueKey:"gov_balance", issueStance:"support",
      text:"The longest-serving Democratic majority leader in the chamber's history, a central player in every state budget negotiation with the governor and Assembly.",
      source:{ label:"Empire State Plaza", url:"https://empirestateplaza.ny.gov/breaking-barriers/andrea-stewart-cousins" } }
  ],
  "krueger_ny": [
    { topic:"Gatekeeper of the State Budget", icon:"💰", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Chair of the Senate Finance Committee, one of Albany's most powerful posts, giving her a central hand in the roughly $230B state budget; she returned to work after a mild stroke in 2026.",
      source:{ label:"NY Senate", url:"https://www.nysenate.gov/senators/liz-krueger/about" } },
    { topic:"Architect of Marijuana Legalization", icon:"🌿", pos:"support", issueKey:"cannabis_reform", issueStance:"support",
      text:"A Manhattan Democrat (District 28) and lead sponsor of the 2021 law legalizing adult-use cannabis and directing revenue to communities harmed by prohibition.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Liz_Krueger" } },
    { topic:"Taxing High Earners", icon:"🏦", pos:"support", issueKey:"econ_corp_account", issueStance:"support",
      text:"A former anti-poverty director who has pushed to raise taxes on top incomes and corporations to fund social programs.",
      source:{ label:"State Senator Liz Krueger", url:"https://www.lizkrueger.com/about/" } }
  ],
  "salazar_ny": [
    { topic:"First Democratic Socialist in a Century", icon:"🌹", pos:"support", issueKey:"gov_balance", issueStance:"support",
      text:"Unseated a 16-year incumbent in 2018 to become the first Democratic Socialist elected to New York's Legislature in nearly a century, after a closely scrutinized campaign over her biography.",
      source:{ label:"Wikipedia", url:"https://en.wikipedia.org/wiki/Julia_Salazar" } },
    { topic:"Tenant Power & Good Cause Eviction", icon:"🏘", pos:"support", issueKey:"housing", issueStance:"support",
      text:"A Brooklyn Democrat (District 18) who has been a leading voice for sweeping tenant protections, including 'good cause' eviction limits, in the nation's largest rental market.",
      source:{ label:"Salazar for Senate", url:"https://www.salazarforsenate.com/" } },
    { topic:"Criminal-Justice Reform", icon:"⚖️", pos:"support", issueKey:"justice_reform", issueStance:"support",
      text:"Chairs the Committee on Crime Victims, Crime & Correction, pressing decarceration and reentry policy from a leadership perch progressives fought to keep.",
      source:{ label:"NY Senate", url:"https://www.nysenate.gov/newsroom/press-releases/2023/robert-g-ortt/senate-republican-conference-calls-democratic-socialist" } }
  ],

  /* ── FLORIDA ─────────────────────────────────────────────────────────── */
  "albritton_fl": [
    { topic:"'Rural Renaissance' President", icon:"🚜", pos:"support", issueKey:"rural_ag", issueStance:"support",
      text:"Senate President whose signature agenda is a nearly $300M 'Rural Renaissance' to steer investment to sparsely populated counties; a citrus grower, he centers agriculture and rural health.",
      source:{ label:"WUSF", url:"https://www.wusf.org/politics-issues/2025-02-19/florida-senate-president-albritton-unveils-rural-renaissance-legislation" } },
    { topic:"Bitter Clash With the House", icon:"⚔️", pos:"mixed", issueKey:"gov_balance", issueStance:"mixed",
      text:"A Wauchula Republican (District 27) whose 2025 session ran six weeks into overtime as he and House Speaker Daniel Perez clashed over the budget and a tax-cut package.",
      source:{ label:"WUSF", url:"https://www.wusf.org/politics-issues/2026-01-17/florida-senate-president-ben-albritton-takeaways-from-2025-session" } },
    { topic:"Senate President", icon:"🏛", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"Elected president in November 2024, succeeding Kathleen Passidomo; he will leave the post after the 2026 elections.",
      source:{ label:"Ballotpedia", url:"https://ballotpedia.org/Ben_Albritton" } }
  ],
  "grall_fl": [
    { topic:"Sponsor of the Six-Week Abortion Ban", icon:"🕊", pos:"support", issueKey:"pro_life", issueStance:"support",
      text:"Carried the Senate's 2023 six-week abortion ban (SB 300), backed by Gov. DeSantis, with narrow rape and incest exceptions requiring documentation; it took effect in 2024 after the state Supreme Court upheld the earlier 15-week limit.",
      source:{ label:"Tampa Bay Times", url:"https://www.tampabay.com/news/florida-politics/2023/04/03/abortion-ban-pregnant-senate-debate-protest/" } },
    { topic:"Also Wrote the 15-Week Ban", icon:"⚖️", pos:"support", issueKey:"pro_life", issueStance:"support",
      text:"A Vero Beach Republican (District 29) and attorney who sponsored Florida's earlier 15-week restriction before the six-week law, making her the Senate's lead voice on abortion limits.",
      source:{ label:"PBS NewsHour", url:"https://www.pbs.org/newshour/politics/florida-senate-passes-6-week-abortion-ban-backed-by-desantis" } },
    { topic:"Parental Rights in Education", icon:"🍎", pos:"support", issueKey:"school_choice", issueStance:"support",
      text:"A consistent backer of the DeSantis-era parental-rights and school-choice agenda in the Legislature.",
      source:{ label:"Erin Grall", url:"https://www.eringrall.com/post/florida-senate-passes-six-week-abortion-ban" } }
  ],
  "sjones_fl": [
    { topic:"Florida's First Openly LGBTQ Senator", icon:"🏳️‍🌈", pos:"support", issueKey:"lgbtq_rights", issueStance:"support",
      text:"The first openly LGBTQ person elected to the Florida Senate, who delivered an emotional floor speech against the state's first-in-the-nation 'Don't Say Gay' law and became a leading opponent of the DeSantis-era crackdown on LGBTQ+ protections.",
      source:{ label:"LGBTQ+ Victory Fund", url:"https://victoryfund.org/shevrin-jones-becomes-floridas-first-out-state-senator/" } },
    { topic:"A Leading Democratic Voice", icon:"🎙", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"A West Park Democrat (District 34), former educator and pastor's son who served four House terms before the Senate and has urged his party toward a 'come-to-Jesus' reset.",
      source:{ label:"Florida Politics", url:"https://floridapolitics.com/archives/381823-jones-democrats-meeting/" } },
    { topic:"Running for Congress", icon:"🗳", pos:"support", issueKey:"gov_services", issueStance:"support",
      text:"In 2026 he launched a bid for Florida's 24th Congressional District, where he would become the state's first openly LGBTQ member of Congress.",
      source:{ label:"The Advocate", url:"https://www.advocate.com/politics/national/shevrin-jones-congress-florida" } }
  ]

  };
  Object.keys(X).forEach(function (k) { S[k] = X[k]; });
})();
