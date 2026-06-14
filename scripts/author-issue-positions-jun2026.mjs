#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — June 2026 thin-profile issue positions (hand-authored, wave 2)
//
// Structured issue positions for 27 thin / no-stance politicians, authored
// directly from each figure's OWN documented, sourced tracked promises and key
// issues already in their Firestore record. Nothing is invented: every position
// maps to material the site already records; bill-backed positions carry the
// bill as `evidence` and a source link as `source`. Each is keyed to an exact
// ISSUE_MAP issue (issueKey + issueStance) so the profile becomes comparable in
// the Personalized Alignment Tool. Six pure also-rans with no documented policy
// content (empty key issues, "ran and lost" only) are intentionally left thin so
// the honest "Limited Record" view still shows for them.
//
//   node scripts/author-issue-positions-jun2026.mjs --emit    # write index.html block
//   node scripts/author-issue-positions-jun2026.mjs --apply   # mirror to Firestore
// ---------------------------------------------------------------------------

import { writeFileSync } from 'fs';

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const EMIT  = process.argv.includes('--emit');
const STAMP = '2026-06-14T00:00:00.000Z';

const le = n => ({ label:'le.utah.gov', url:`https://le.utah.gov/~${n}` });
const DATA = {
  aaron_wiley: [ // Aaron Wiley — Democratic candidate, Utah House District 21
    { topic:'Housing & Cost of Living', icon:'🏗', pos:'support', issueKey:'housing_build', issueStance:'support',
      text:'Campaigns for attainable housing and stronger renter and buyer protections as the centerpiece of his cost-of-living agenda.' },
    { topic:'Great Salt Lake & Clean Air', icon:'💧', pos:'support', issueKey:'water', issueStance:'support',
      text:'Backs protecting the Great Salt Lake and stronger pollution rules to address the Wasatch Front\'s air quality.' },
    { topic:'Public Schools', icon:'🍎', pos:'support', issueKey:'public_schools', issueStance:'support',
      text:'Supports stronger public schools, student mental-health support, and workforce training.' },
    { topic:'Fair Representation', icon:'⚖️', pos:'support', issueKey:'democracy_balance', issueStance:'support',
      text:'Supports fair district maps and respecting voter-approved ballot initiatives.' },
  ],
  adam_sorenson: [ // Adam Sorenson — Republican candidate, Utah House District 17 (plaintiffs' attorney)
    { topic:'Civil-Justice Access', icon:'⚖️', pos:'support', issueKey:'justice_balance', issueStance:'support',
      text:'A plaintiffs\' attorney who campaigned on protecting ordinary people\'s access to the civil-justice system.' },
    { topic:'Insurance Accountability', icon:'🛡', pos:'support', issueKey:'econ_corp_account', issueStance:'support',
      text:'Ran on holding the insurance industry accountable and protecting injury victims and consumers.' },
  ],
  anthony_loubet: [ // Anthony Loubet — Utah State Representative, House District 27
    { topic:'Transparency & Open Records', icon:'🔍', pos:'support', issueKey:'gov_transparency', issueStance:'support',
      text:'Strengthened Utah\'s open-records law by adding a Government Records Ombudsman and a mediation option to the GRAMA appeals process.',
      evidence:'Sponsored HB 266 (2024).', source:{label:'Utah State Archives', url:'https://archives.utah.gov/2024/03/12/2024-legislative-updates-to-grama/'} },
    { topic:'Public Safety & Policing', icon:'👮', pos:'support', issueKey:'back_police', issueStance:'support',
      text:'Modernized police training flexibility through Peace Officer Standards and Training (POST) amendments.',
      evidence:'Sponsored HB 102 (2024).', source:le('2024/bills/static/HB0102.html') },
    { topic:'Child Safety', icon:'🍼', pos:'support', issueKey:'family_support', issueStance:'support',
      text:'Backed protecting clergy who voluntarily report child abuse, aimed at encouraging reporting that protects children.',
      evidence:'Sponsored HB 432 (2024).', source:{label:'KSL', url:'https://www.ksl.com/article/50871787/clergy-reporting-bill-clears-committee-with-unanimous-support-heads-to-utah-house'} },
  ],
  ashlee_matthews: [ // Ashlee Matthews — Utah State Representative, House District 37
    { topic:'Child Care Access', icon:'🧸', pos:'support', issueKey:'child_care', issueStance:'support',
      text:'Let state agencies convert unused building space into on-site day care for employees, expanding affordable child care for working parents.',
      evidence:'Sponsored HB 167 (2023).', source:{label:'KUTV', url:'https://kutv.com/news/eye-on-your-money/newly-passed-utah-law-gives-many-state-workers-access-to-at-work-childcare-rep-ashlee-matthews-udot-employee-state-owned-buildings-affordable'} },
    { topic:'Pollinator Habitat', icon:'🐝', pos:'support', issueKey:'lands_preserve', issueStance:'support',
      text:'Made Utah\'s Pollinator Habitat Program permanent and expanded its planting-cost grants, a program she first created in 2021.',
      evidence:'Sponsored HB 251 (2025).', source:{label:'Deseret News', url:'https://www.deseret.com/utah/2025/02/03/utah-environment-politics/'} },
    { topic:'Working Families & Workers', icon:'🛠', pos:'support', issueKey:'econ_workers', issueStance:'support',
      text:'Centers working-family economic support and the public-sector workforce in her legislative agenda.' },
  ],
  chris_mcconnehey: [ // Chris McConnehey — Republican candidate, Utah House District 38 (12-yr West Jordan Council)
    { topic:'Balanced Budgets', icon:'⚖️', pos:'support', issueKey:'gov_balance', issueStance:'support',
      text:'On the West Jordan City Council he challenged over-optimistic revenue projections, pushing for more conservative, balanced budgeting.',
      source:{label:'West Jordan Journal', url:'https://www.westjordanjournal.com/2017/07/28/150958/two-sides-to-every-budget-west-jordan-s-revenue-projections'} },
    { topic:'Limited Government & Local Control', icon:'🧹', pos:'support', issueKey:'gov_waste', issueStance:'support',
      text:'Pledges to weigh every government action against taxpayer cost and whether it belongs at a more local level.' },
    { topic:'Working Families', icon:'🛒', pos:'support', issueKey:'cost_living', issueStance:'support',
      text:'Centers working families and affordability, citing residents on fixed incomes.' },
  ],
  chris_sloan: [ // Chris Sloan — Republican candidate, Utah State Senate District 11 (Tooele)
    { topic:'Growth & Land Use', icon:'🏗', pos:'support', issueKey:'housing_build', issueStance:'support',
      text:'Drawing on long service on the Tooele City Planning Commission, he centers responsible local growth and land-use planning.' },
    { topic:'Small Business & Local Economy', icon:'🏪', pos:'support', issueKey:'econ_smallbiz', issueStance:'support',
      text:'A family real-estate broker who runs on supporting small business and the local Tooele County economy.' },
    { topic:'Redistricting & Representation', icon:'⚖️', pos:'support', issueKey:'democracy_balance', issueStance:'support',
      text:'Publicly urged lawmakers to keep all of Tooele County whole within a single Senate district during redistricting.' },
  ],
  clinton_okerlund: [ // Clint Okerlund — Utah State Representative, House District 42
    { topic:'State Parks & Recreation', icon:'🦌', pos:'support', issueKey:'enviro_balance', issueStance:'support',
      text:'Modernized state-parks funding toward self-sustaining revenue with long-term development plans for outdoor recreation.',
      evidence:'Sponsored HB 490 (2025).', source:le('2025/bills/static/HB0490.html') },
    { topic:'Fiscal Accountability', icon:'🧹', pos:'support', issueKey:'gov_waste', issueStance:'support',
      text:'A CFO by background who campaigned on quarterly town halls and rooting out waste and abuse of public funds.',
      source:{label:'electclint.com', url:'https://www.electclint.com/'} },
    { topic:'Little Cottonwood Transportation', icon:'🚆', pos:'support', issueKey:'transit', issueStance:'support',
      text:'Opposes the proposed Little Cottonwood Canyon gondola and backs alternative transportation solutions for the canyon.',
      source:{label:'Ballotpedia', url:'https://ballotpedia.org/Clint_Okerlund'} },
    { topic:'Clean Air & Emissions', icon:'🌱', pos:'support', issueKey:'climate_action', issueStance:'support',
      text:'Lists clean air and emissions policy among his core priorities for the Salt Lake Valley.' },
  ],
  ddamschen: [ // David Damschen — former Utah State Treasurer
    { topic:'Fiscal Stewardship', icon:'⚖️', pos:'support', issueKey:'gov_balance', issueStance:'support',
      text:'As State Treasurer he safeguarded and grew Utah\'s multibillion-dollar public investment funds, generating more than $2 billion in stable interest income.',
      source:{label:'treasurer.utah.gov', url:'https://treasurer.utah.gov/featured-news/utah-treasurer-david-damschen-resigns-from-office-to-succeed-utah-housing-corporation-president-and-ceo-grant-whitaker/'} },
    { topic:'Returning Unclaimed Property', icon:'🏛', pos:'support', issueKey:'gov_services', issueStance:'support',
      text:'Returned more than $200 million in unclaimed property to Utah families through the Treasurer\'s Unclaimed Property Division.',
      source:{label:'treasurer.utah.gov', url:'https://treasurer.utah.gov/featured-news/utah-treasurer-david-damschen-resigns-from-office-to-succeed-utah-housing-corporation-president-and-ceo-grant-whitaker/'} },
    { topic:'Financial Literacy', icon:'🍎', pos:'support', issueKey:'public_schools', issueStance:'support',
      text:'Championed improving financial education in public schools as president of the National Association of State Treasurers.',
      source:{label:'Deseret News', url:'https://www.deseret.com/utah/2020/9/15/21438646/utah-treasurer-david-damschen-outstanding-service-national-association-of-state-treasurers/'} },
  ],
  erik_r_craythorne: [ // Erik R. Craythorne — Republican nominee, Utah House District 13 (Mayor of West Point)
    { topic:'Responsible Growth', icon:'🏗', pos:'support', issueKey:'housing_build', issueStance:'support',
      text:'Campaigns on responsible growth and development, drawing on his experience as Mayor of West Point.',
      source:{label:'KSL', url:'https://www.ksl.com/article/51428770/heres-whos-running-for-the-utah-legislature-in-2026'} },
    { topic:'Infrastructure & Waste', icon:'🚧', pos:'support', issueKey:'infrastructure', issueStance:'support',
      text:'Centers infrastructure, water, and waste management, building on his seat on the Wasatch Integrated Waste Management board.' },
    { topic:'Fiscal Responsibility', icon:'🧹', pos:'support', issueKey:'gov_waste', issueStance:'support',
      text:'Runs on fiscally responsible local government drawn from his mayoral and regional-board experience.' },
    { topic:'Public Safety', icon:'👮', pos:'support', issueKey:'back_police', issueStance:'support',
      text:'Prioritizes public safety, drawing on his service on the North Davis Fire District board.' },
  ],
  eryn_russo: [ // Eryn Russo — Republican candidate, Utah House District 41 (physician)
    { topic:'Affordability & Government Waste', icon:'🧹', pos:'support', issueKey:'gov_waste', issueStance:'support',
      text:'Names affordability her top issue, pledging to lower costs by cutting waste and unnecessary regulation — to "cut budgets with a scalpel, not a machete."',
      source:{label:'Salt Lake Tribune', url:'https://www.sltrib.com/news/2026/06/05/republican-eryn-russo-talks/'} },
    { topic:'Water Conservation', icon:'💧', pos:'support', issueKey:'water', issueStance:'support',
      text:'Says Utah must take water seriously through conservation, better infrastructure and practical planning rather than heavy-handed mandates.',
      source:{label:'Salt Lake Tribune', url:'https://www.sltrib.com/news/2026/06/05/republican-eryn-russo-talks/'} },
    { topic:'Energy Reliability', icon:'⚡', pos:'support', issueKey:'enviro_energy', issueStance:'support',
      text:'Backs reliable, affordable energy and is "open to safe, responsible solutions" including nuclear to meet future demand.',
      source:{label:'Salt Lake Tribune', url:'https://www.sltrib.com/news/2026/06/05/republican-eryn-russo-talks/'} },
    { topic:'Redistricting & Transparency', icon:'⚖️', pos:'support', issueKey:'democracy_balance', issueStance:'support',
      text:'Says the Legislature should draw electoral maps but with transparency and accountability, respecting both the law and the will of the people.',
      source:{label:'Salt Lake Tribune', url:'https://www.sltrib.com/news/2026/06/05/republican-eryn-russo-talks/'} },
  ],
  fgibson: [ // Francis Gibson — former Utah House Majority Leader
    { topic:'Economic Development', icon:'📈', pos:'support', issueKey:'econ_growth', issueStance:'support',
      text:'Helped shepherd creation of the Utah Inland Port Authority through the Legislature as a state economic-development project.',
      source:{label:'Salt Lake Tribune', url:'https://www.sltrib.com/news/politics/2021/10/26/top-gop-house-leader/'} },
    { topic:'Data Privacy', icon:'🔒', pos:'support', issueKey:'privacy_rights', issueStance:'support',
      text:'Spearheaded a state chief privacy officer and a Personal Privacy Oversight Committee to govern how Utah handles personal data.',
      source:{label:'Salt Lake Tribune', url:'https://www.sltrib.com/news/politics/2021/10/26/top-gop-house-leader/'} },
    { topic:'Tax Reform', icon:'💰', pos:'support', issueKey:'lower_taxes', issueStance:'support',
      text:'Helped pass the 2019 tax-restructuring package as a leadership priority, though it was repealed in 2020 after a citizen referendum.' },
  ],
  grant_miller: [ // Grant Miller — Utah State Representative, House District 24
    { topic:'Criminal-Justice Reform', icon:'⚖️', pos:'support', issueKey:'justice_reform', issueStance:'support',
      text:'Lets courts reduce unpaid criminal fines for low-income defendants by amounts paid toward court-ordered treatment, easing undue burdens.',
      evidence:'Sponsored HB 383 (2025) & HB 94 (2026).', source:le('2025/bills/static/HB0383.html') },
    { topic:'Disability & Employment', icon:'🧠', pos:'support', issueKey:'health_mental', issueStance:'support',
      text:'Expanded community-rehabilitation programs that help adults with significant disabilities gain competitive, integrated employment.',
      evidence:'Sponsored HB 53 (2026).', source:le('2026/bills/static/HB0053.html') },
    { topic:'Homelessness & Civil Rights', icon:'🏘', pos:'support', issueKey:'housing_support', issueStance:'support',
      text:'Sought a Homeless Bill of Rights codifying freedom of movement, employment and voting protections; the bill did not pass in 2025.',
      evidence:'Sponsored HB 362 (2025).', source:le('2025/bills/static/HB0362.html') },
    { topic:'Marijuana Decriminalization', icon:'🌿', pos:'support', issueKey:'cannabis_reform', issueStance:'support',
      text:'Sought to reduce first-offense possession of small amounts of marijuana to a civil infraction with no jail time; the bill died in 2026.',
      evidence:'Sponsored HB 253 (2026).', source:le('2026/bills/static/HB0253.html') },
  ],
  janderegg: [ // Jake Anderegg — former Utah State Senator
    { topic:'Data Privacy & Technology', icon:'🔒', pos:'support', issueKey:'privacy_rights', issueStance:'support',
      text:'Chief sponsor of legislation modernizing how Utah colleges govern and protect student data, plus multiple data-privacy measures.',
      evidence:'Sponsored SB 226 (2022).' },
    { topic:'Higher Education Governance', icon:'🎓', pos:'support', issueKey:'edu_college_cost', issueStance:'support',
      text:'Worked on higher-education governance and data policy during his decade in the Legislature.' },
    { topic:'Economic Development', icon:'📈', pos:'support', issueKey:'econ_growth', issueStance:'support',
      text:'A technology and economic-development professional who prioritized economic development in his legislative work.' },
  ],
  jeffrey_anderson: [ // Jeffrey Anderson — Democratic nominee, Utah House District 13 (federal-service background)
    { topic:'Fiscal Accountability', icon:'🧹', pos:'support', issueKey:'gov_waste', issueStance:'support',
      text:'Campaigns on responsible, fiscally accountable government and practical, solutions-oriented governance.',
      source:{label:'jeffandersonforutahhouse.com', url:'https://jeffandersonforutahhouse.com/'} },
    { topic:'Families & Small Business', icon:'🏪', pos:'support', issueKey:'econ_smallbiz', issueStance:'support',
      text:'Centers support for families and small businesses as a core campaign commitment.' },
    { topic:'Veterans & Federal Service', icon:'🎖', pos:'support', issueKey:'veterans', issueStance:'support',
      text:'A U.S. Department of State veteran who pledges to represent veterans and federal-service constituents.' },
    { topic:'Community Development', icon:'📈', pos:'support', issueKey:'econ_growth', issueStance:'support',
      text:'Runs on strong, thoughtful community development for the Clinton–Clearfield–West Point area.' },
  ],
  jferry: [ // Joel Ferry — former Utah State Representative; executive director, Utah DNR
    { topic:'Great Salt Lake & Water', icon:'💧', pos:'support', issueKey:'water', issueStance:'support',
      text:'Authored landmark water-law change letting water-right holders lease water to benefit the Great Salt Lake without forfeiting the right.',
      evidence:'Sponsored HB 33 (2022).', source:le('2022/bills/static/HB0033.html') },
    { topic:'Watershed & Wetlands', icon:'🏞', pos:'support', issueKey:'lands_preserve', issueStance:'support',
      text:'Co-sponsored the $40-million Great Salt Lake Watershed Enhancement Trust funding water and wetland restoration projects.',
      evidence:'Sponsored HB 410 (2022).', source:le('2022/bills/static/HB0410.html') },
    { topic:'Agriculture & Ranching', icon:'🌾', pos:'support', issueKey:'rural_ag', issueStance:'support',
      text:'A fifth-generation farmer-rancher who centers agriculture, ranching and rural natural-resource stewardship.' },
    { topic:'Public Lands & Wildlife', icon:'🦌', pos:'support', issueKey:'enviro_balance', issueStance:'support',
      text:'Prioritizes public-lands and wildlife stewardship, now leading that work as executive director of the Utah Department of Natural Resources.',
      source:{label:'governor.utah.gov', url:'https://governor.utah.gov/governors-cabinet/joel-ferry/'} },
  ],
  jiro_johnson: [ // Jiro Johnson — Salt Lake County Council, District 1 (former public defender)
    { topic:'Housing & Homelessness', icon:'🏘', pos:'support', issueKey:'housing_support', issueStance:'support',
      text:'Names housing and lasting solutions to the district\'s unhoused crisis his first council priority.',
      source:{label:'Salt Lake Tribune', url:'https://www.sltrib.com/news/2025/06/12/democrats-pick-public-defender/'} },
    { topic:'Criminal-Justice Reform', icon:'⚖️', pos:'support', issueKey:'justice_reform', issueStance:'support',
      text:'A former public defender who backs criminal-justice reform and moving people from the justice system into treatment-based diversion.',
      source:{label:'Salt Lake Tribune', url:'https://www.sltrib.com/news/2025/06/12/democrats-pick-public-defender/'} },
  ],
  lisa_dean: [ // Lisa Dean — Jordan School Board member; Utah House District 39 candidate
    { topic:'Public Schools & Teachers', icon:'🍎', pos:'support', issueKey:'public_schools', issueStance:'support',
      text:'A sitting Jordan School Board member who centers public education and teacher support.',
      source:{label:'Ballotpedia', url:'https://ballotpedia.org/Lisa_Dean_(Utah)'} },
    { topic:'Local Governance & Parents', icon:'👪', pos:'support', issueKey:'edu_parental', issueStance:'support',
      text:'Prioritizes local school governance and parental involvement in education decisions.' },
  ],
  mckay_jensen: [ // McKay Jensen — Republican candidate, Utah House District 60 (longtime educator)
    { topic:'Public Education Funding', icon:'🍎', pos:'support', issueKey:'public_schools', issueStance:'support',
      text:'As a school-board leader he advocated an automatic inflation adjustment to Utah\'s per-student funding formula, enacted in 2020.',
      evidence:'Backed HB 357 (2020).', source:le('2020/bills/static/HB0357.html') },
    { topic:'Private-School Vouchers', icon:'🎓', pos:'oppose', issueKey:'school_choice', issueStance:'oppose',
      text:'Publicly pledged to oppose moving public-education dollars to private schooling.',
      source:{label:'Utah Parents for Teachers', url:'https://www.utahparentsforteachers.com/mckay-jensen/'} },
    { topic:'Fiscal Responsibility', icon:'🧹', pos:'support', issueKey:'gov_waste', issueStance:'support',
      text:'Runs on fiscal responsibility and transparent, accessible government.' },
    { topic:'Affordability', icon:'🛒', pos:'support', issueKey:'cost_living', issueStance:'support',
      text:'Centers affordability and cost of living alongside responsibly managed growth and local control.' },
  ],
  mhogan: [ // Michelle Kaufusi — Utah County Commission candidate; former Mayor of Provo
    { topic:'Fiscal Management', icon:'🧹', pos:'support', issueKey:'gov_waste', issueStance:'support',
      text:'As Provo mayor she earned national recognition for city management, including WalletHub\'s 2025 "best-run city" ranking.' },
    { topic:'Economic Development', icon:'📈', pos:'support', issueKey:'econ_growth', issueStance:'support',
      text:'Provo was named the Milken Institute\'s best-performing U.S. city three consecutive years (2021–2023) under her leadership.' },
    { topic:'Water & Utah Lake', icon:'💧', pos:'support', issueKey:'water', issueStance:'support',
      text:'Chaired the Utah Lake Authority and served as vice chair of the Utah Water Quality Board while mayor.' },
    { topic:'Public Safety', icon:'👮', pos:'support', issueKey:'back_police', issueStance:'support',
      text:'Lists public safety among her core priorities for the county commission.' },
  ],
  mjones: [ // Maile Wilson Edwards — former two-term Mayor of Cedar City
    { topic:'Economic Development & Tourism', icon:'📈', pos:'support', issueKey:'econ_growth', issueStance:'support',
      text:'As Cedar City mayor she championed tourism, the arts, and the city\'s Southern Utah University partnership as economic pillars.' },
    { topic:'Higher Education', icon:'🎓', pos:'support', issueKey:'edu_college_cost', issueStance:'support',
      text:'Centers Southern Utah University as an anchor of the regional economy and a higher-education priority.' },
    { topic:'City Infrastructure', icon:'🚧', pos:'support', issueKey:'infrastructure', issueStance:'support',
      text:'Prioritized city infrastructure across two terms leading Cedar City.' },
  ],
  natassja_grossman: [ // Natassja Grossman — Democratic candidate, Utah House District 56 (single mother)
    { topic:'Congressional Term Limits', icon:'⏳', pos:'support', issueKey:'term_limits', issueStance:'support',
      text:'Signed the U.S. Term Limits pledge, committing to support an Article V resolution applying congressional term limits.',
      source:{label:'U.S. Term Limits', url:'https://www.termlimits.com/natassja-grossman-pledges-to-support-congressional-term-limits/'} },
    { topic:'Safety-Net Programs', icon:'🍼', pos:'support', issueKey:'family_support', issueStance:'support',
      text:'Centers protecting and restoring public-assistance programs she says recent federal cuts took from working families.' },
    { topic:'Affordability for Working Families', icon:'🛒', pos:'support', issueKey:'cost_living', issueStance:'support',
      text:'Runs on economic opportunity and affordability for working families and low-income households.' },
  ],
  nik_anderson: [ // Nik Anderson — Republican primary candidate, Utah House District 48 (small-business owner)
    { topic:'No New Taxes', icon:'💰', pos:'support', issueKey:'lower_taxes', issueStance:'support',
      text:'Signed an anti-tax-increase pledge, committing not to vote for tax increases.',
      source:{label:'Americans for Prosperity', url:'https://americansforprosperity.org/press-release/afp-utah-endorses-nik-anderson-jr-bird-for-state-house/'} },
    { topic:'Cut Red Tape', icon:'✂️', pos:'support', issueKey:'gov_waste', issueStance:'support',
      text:'Campaigns on reducing regulation he says drives up costs for Utah families and small businesses.',
      source:{label:'Americans for Prosperity', url:'https://americansforprosperity.org/press-release/afp-utah-endorses-nik-anderson-jr-bird-for-state-house/'} },
    { topic:'Small Business', icon:'🏪', pos:'support', issueKey:'econ_smallbiz', issueStance:'support',
      text:'A small-business owner and entrepreneur who centers small-business advocacy.' },
    { topic:'Cost of Living', icon:'🛒', pos:'support', issueKey:'cost_living', issueStance:'support',
      text:'Lists cost-of-living and affordability among his core campaign themes.' },
  ],
  roxayn_elmer: [ // Roxayn Elmer — Republican candidate (withdrew), Utah House District 13 (wellness-store owner)
    { topic:'Natural & Holistic Health', icon:'🩺', pos:'support', issueKey:'medical_freedom', issueStance:'support',
      text:'A holistic-wellness store owner whose platform centered natural and holistic health, including CBD wellness.' },
    { topic:'Small Business', icon:'🏪', pos:'support', issueKey:'econ_smallbiz', issueStance:'support',
      text:'Ran on supporting small business and local entrepreneurship.' },
  ],
  rspendlove: [ // Robert Spendlove — former Utah State Representative (Revenue & Taxation chair)
    { topic:'Income-Tax Relief', icon:'💰', pos:'support', issueKey:'lower_taxes', issueStance:'support',
      text:'As Revenue and Taxation Committee chair he sponsored income-tax relief and provided the analysis behind Utah\'s consecutive rate cuts (4.95%→4.65%).',
      evidence:'Sponsored HB 444 (2022).', source:le('2022/bills/static/HB0444.html') },
    { topic:'State Budget & Appropriations', icon:'⚖️', pos:'support', issueKey:'gov_balance', issueStance:'support',
      text:'Sponsored appropriations and treasury-investment measures reflecting his role on Executive Appropriations and focus on fiscal stewardship.',
      evidence:'Sponsored HB 8 (2022) & HB 572 (2024).', source:le('2022/bills/static/HB0008.html') },
  ],
  ryan_jackson: [ // Ryan Jackson — Republican candidate, Utah House District 39
    { topic:'Public Safety', icon:'👮', pos:'support', issueKey:'back_police', issueStance:'support',
      text:'Listed public safety among his campaign priorities in his first bid for office.',
      source:{label:'Ballotpedia', url:'https://ballotpedia.org/Ryan_Jackson_(Utah_House_District_39_candidate)'} },
    { topic:'Border Security', icon:'🛡', pos:'support', issueKey:'border_security', issueStance:'support',
      text:'Named border security among his core campaign issues.' },
    { topic:'Education', icon:'🍎', pos:'support', issueKey:'public_schools', issueStance:'support',
      text:'Listed education among his stated campaign priorities.' },
  ],
  swaldrip: [ // Steve Waldrip — former Utah State Representative; Governor's senior housing advisor
    { topic:'Housing Affordability', icon:'🏗', pos:'support', issueKey:'housing_build', issueStance:'support',
      text:'The Legislature\'s go-to housing expert; chief sponsor of Utah\'s statewide housing-affordability strategy.',
      evidence:'Sponsored HB 462 (2022) & HB 36 (2022).', source:le('2022/bills/static/HB0462.html') },
    { topic:'Affordable-Housing Funding', icon:'🏘', pos:'support', issueKey:'housing_support', issueStance:'support',
      text:'House floor sponsor of funding for the Olene Walker Housing Loan Fund supporting affordable-housing programs.',
      evidence:'Sponsored SB 164 (2021).', source:le('2021/bills/static/SB0164.html') },
    { topic:'First-Time Homeownership', icon:'🔑', pos:'support', issueKey:'housing_first_time', issueStance:'support',
      text:'As the Governor\'s senior housing advisor he is leading the state\'s initiative to build 35,000 starter homes.',
      source:{label:'governor.utah.gov', url:'https://governor.utah.gov/governors-staff/steve-waldrip/'} },
  ],
  robert_wanlass: [ // Robert Wanlass — Republican primary candidate, Utah State Senate District 6
    { topic:'Second Amendment', icon:'🔫', pos:'support', issueKey:'gun_rights', issueStance:'support',
      text:'Centers Second Amendment and gun rights as a core plank of his "Families First, Freedom Always" platform.',
      source:{label:'wanlassforsenate.com', url:'https://www.wanlassforsenate.com/'} },
    { topic:'Free Speech', icon:'🗣', pos:'support', issueKey:'free_speech', issueStance:'support',
      text:'Runs on protecting free speech as a centerpiece of his campaign.' },
    { topic:'Parental Rights & School Choice', icon:'🎓', pos:'support', issueKey:'school_choice', issueStance:'support',
      text:'Backs parental rights and school choice in education.' },
    { topic:'Taxes & Accountability', icon:'🧹', pos:'support', issueKey:'gov_waste', issueStance:'support',
      text:'Pledges to hold the line on taxes and opposes unaccountable taxing bodies such as MIDA boards and public infrastructure districts.',
      source:{label:'Standard-Examiner', url:'https://www.standard.net/news/2026/may/25/outsider-robert-wanlass-representing-something-new-in-senate-bid/'} },
    { topic:'Family & Special-Needs Support', icon:'🍼', pos:'support', issueKey:'family_support', issueStance:'support',
      text:'Lists family and special-needs support among his platform priorities.' },
  ],
  dthatcher: [ // Daniel Thatcher — former Utah State Senator (Forward Party)
    { topic:'Youth Mental Health', icon:'🧠', pos:'support', issueKey:'health_mental', issueStance:'support',
      text:'Lead sponsor of the bill that created Utah\'s statewide youth crisis line — now the SafeUT app used in schools statewide.',
      evidence:'Sponsored SB 175 (2015).' },
    { topic:'Voting Access', icon:'📩', pos:'support', issueKey:'voting_access', issueStance:'support',
      text:'Publicly fought Utah\'s 2025 rollback of automatic vote-by-mail, opposing new curbs on mail voting.',
      evidence:'Opposed HB 300 (2025).' },
    { topic:'Civil Liberties', icon:'🔒', pos:'support', issueKey:'privacy_rights', issueStance:'support',
      text:'A longtime civil-liberties advocate during his years in the state Senate.' },
    { topic:'Putting Constituents First', icon:'🔍', pos:'support', issueKey:'gov_transparency', issueStance:'support',
      text:'Left the Republican Party for the Forward Party in 2025 and arranged an open process to choose his successor, framing it as putting constituents above party.' },
  ],
  mark_strong: [ // Mark Strong — Utah State Representative, House District 47
    { topic:'Public Safety', icon:'👮', pos:'support', issueKey:'back_police', issueStance:'support',
      text:'Authored "Ashley\'s Law," raising the minimum sentence for rape of an incapacitated adult from five-years-to-life to ten-years-to-life.',
      evidence:'Sponsored HB 127 (2025).', source:{label:'KSL TV', url:'https://ksltv.com/local-news/ashleys-law/756670/'} },
    { topic:'School Fees', icon:'🍎', pos:'support', issueKey:'public_schools', issueStance:'support',
      text:'Eliminated certain fees charged to Utah high-school students for required coursework and activities.',
      evidence:'Sponsored HB 344 (2025) & HB 415 (2024).', source:le('2025/bills/static/HB0344.html') },
    { topic:'Children & Families', icon:'🍼', pos:'support', issueKey:'family_support', issueStance:'support',
      text:'Sought to expand Utah\'s child tax credit to cover children from birth through age 5; the bill advanced from committee but did not pass in 2025.',
      evidence:'Sponsored HB 316 (2025).', source:{label:'KSL', url:'https://www.ksl.com/article/51240351/utah-lawmaker-proposes-expanding-the-states-child-tax-credit'} },
    { topic:'Consumer Protection', icon:'🏪', pos:'support', issueKey:'econ_smallbiz', issueStance:'support',
      text:'Required tow operators to forfeit fees when they fail to give proper notice, protecting vehicle owners from improper towing.',
      evidence:'Sponsored HB 268 (2026).', source:le('2026/bills/static/HB0268.html') },
    { topic:'Medical Freedom', icon:'🩺', pos:'support', issueKey:'medical_freedom', issueStance:'support',
      text:'Barred colleges from forcing vaccine-exempt students into remote-only learning.',
      evidence:'Sponsored HB 233 (2021).', source:le('2021/bills/static/HB0233.html') },
  ],
  slockhart: [ // David Young — former Mayor of Orem
    { topic:'Economic Development & UVU', icon:'📈', pos:'support', issueKey:'econ_growth', issueStance:'support',
      text:'As Mayor of Orem he centered economic development and the city\'s partnership with Utah Valley University.' },
    { topic:'Transportation', icon:'🚧', pos:'support', issueKey:'infrastructure', issueStance:'support',
      text:'Prioritized transportation and community services for a fast-growing Orem.' },
    { topic:'Housing', icon:'🏗', pos:'support', issueKey:'housing_build', issueStance:'support',
      text:'Listed housing among his priorities while leading the city.' },
  ],
};

const NAMES = {
  aaron_wiley:'Aaron Wiley', adam_sorenson:'Adam Sorenson', anthony_loubet:'Anthony Loubet',
  ashlee_matthews:'Ashlee Matthews', chris_mcconnehey:'Chris McConnehey', chris_sloan:'Chris Sloan',
  clinton_okerlund:'Clint Okerlund', ddamschen:'David Damschen', erik_r_craythorne:'Erik R. Craythorne',
  eryn_russo:'Eryn Russo', fgibson:'Francis Gibson', grant_miller:'Grant Miller', janderegg:'Jake Anderegg',
  jeffrey_anderson:'Jeffrey Anderson', jferry:'Joel Ferry', jiro_johnson:'Jiro Johnson', lisa_dean:'Lisa Dean',
  mckay_jensen:'McKay Jensen', mhogan:'Michelle Kaufusi', mjones:'Maile Wilson Edwards',
  natassja_grossman:'Natassja Grossman', nik_anderson:'Nik Anderson', roxayn_elmer:'Roxayn Elmer',
  rspendlove:'Robert Spendlove', ryan_jackson:'Ryan Jackson', swaldrip:'Steve Waldrip', robert_wanlass:'Robert Wanlass',
  dthatcher:'Daniel Thatcher', mark_strong:'Mark Strong', slockhart:'David Young',
};

// ── Firestore helpers ────────────────────────────────────────────────────────
function enc(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
  if (typeof v === 'object') { const f={}; for (const [k,val] of Object.entries(v)) f[k]=enc(val); return { mapValue:{fields:f} }; }
  throw new Error('cannot encode');
}
function dec(v) {
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return parseInt(v.integerValue, 10);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.nullValue !== undefined) return null;
  if (v.arrayValue !== undefined) return (v.arrayValue.values || []).map(dec);
  if (v.mapValue !== undefined) { const o={}; for (const [k,val] of Object.entries(v.mapValue.fields||{})) o[k]=dec(val); return o; }
  return null;
}
async function getOne(id) {
  const r = await fetch(`${BASE}/${id}`); if (!r.ok) return null;
  const d = await r.json(); if (!d.fields) return null;
  const o = {}; for (const [k,v] of Object.entries(d.fields)) o[k]=dec(v); return o;
}
async function patch(id, fields) {
  const qs = Object.keys(fields).map(m => 'updateMask.fieldPaths=' + encodeURIComponent(m)).join('&');
  const body = { fields: {} }; for (const [k,v] of Object.entries(fields)) body.fields[k]=enc(v);
  const r = await fetch(`${BASE}/${id}?${qs}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
  if (!r.ok) throw new Error(`patch ${id}: HTTP ${r.status} — ${(await r.text()).slice(0,200)}`);
}

// ── Emit index.html literal block ────────────────────────────────────────────
function esc(s){ return String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'"); }
function emitBlock() {
  const out = [];
  out.push('    // ── Roster-wide thin-profile expansion · wave 2 (June 2026) ──────────────────');
  out.push('    // Hand-authored from each figure\'s own documented, sourced tracked promises and');
  out.push('    // key issues (see their Firestore record). Bill-backed positions carry the bill as');
  out.push('    // `evidence` and most carry a `source` link; campaign positions carry no evidence so');
  out.push('    // the Snapshot tags them "💬 Stated". Each is keyed to an ISSUE_MAP issue so the');
  out.push('    // profile becomes comparable in the Personalized Alignment Tool.');
  for (const [id, cards] of Object.entries(DATA)) {
    out.push(`    ${id}: [ // ${NAMES[id]}`);
    for (const c of cards) {
      const parts = [`topic:'${esc(c.topic)}'`, `icon:'${c.icon}'`, `pos:'${c.pos}'`, `issueKey:'${c.issueKey}'`, `issueStance:'${c.issueStance}'`, `text:'${esc(c.text)}'`];
      if (c.evidence) parts.push(`evidence:'${esc(c.evidence)}'`);
      if (c.source) parts.push(`source:{label:'${esc(c.source.label)}', url:'${esc(c.source.url)}'}`);
      out.push(`      { ${parts.join(', ')} },`);
    }
    out.push('    ],');
  }
  return out.join('\n');
}

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  let profiles = 0, positions = 0, bill = 0, src = 0;
  for (const cards of Object.values(DATA)) { profiles++; positions += cards.length; bill += cards.filter(c=>c.evidence).length; src += cards.filter(c=>c.source).length; }
  console.log(`Authored ${profiles} profiles, ${positions} positions (${bill} bill-backed, ${src} with source links).`);

  if (EMIT) { writeFileSync('/tmp/stance-block-jun2026.txt', emitBlock()); console.log('Wrote /tmp/stance-block-jun2026.txt'); }

  if (APPLY) {
    let touched = 0, added = 0;
    for (const [id, cards] of Object.entries(DATA)) {
      const doc = await getOne(id);
      if (!doc) { console.log(`  ✗ ${id}: not found`); continue; }
      const existing = (doc.stances && typeof doc.stances === 'object' && !Array.isArray(doc.stances)) ? doc.stances : {};
      const merged = Object.assign({}, existing); let fresh = 0;
      for (const c of cards) { if (!(c.topic in merged)) fresh++; merged[c.topic] = c.text; }
      await patch(id, { stances: merged, updatedAt: STAMP });
      touched++; added += fresh;
      console.log(`  ✎ ${id} (${doc.name}): ${cards.length} positions (${fresh} new) → ${Object.keys(merged).length} stances`);
    }
    console.log(`\nApplied stance mirror to ${touched} profiles (${added} new positions).`);
  }
})();
