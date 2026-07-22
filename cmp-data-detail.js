// PolitiDex data module (Run 3 perf): on-demand detail for the roster search index.
// Holds only the heavier bio + stances fields split out of cmp-data.js, keyed by the
// same politician ids. Injected on demand by pdx-lazy-data.js and merged field-by-
// field into the light records already present in window.CMP_DATA, so search text
// (bios, stance prose) and profile/comparison detail light up once loaded.
(function () {
  var D = window.CMP_DATA = window.CMP_DATA || {};
  var X = {
 "curtis": {
  "stances": {
   "border": "Supported border security measures; no wall funding vote",
   "debt": "Voted No on clean debt ceiling — requires offsets",
   "gun": "Voted against all gun control — 118th & 119th Congress",
   "termLimits": "Co-sponsored term limits legislation",
   "campaign": "No PAC pledge reform introduced yet",
   "dataCenters": "N/A",
   "healthcare": "Opposed ACA expansion; favored market-based reform",
   "audit": "Co-sponsored Audit the Fed"
  }
 },
 "massie": {
  "stances": {
   "border": "Supported border enforcement; skeptical of wall funding mechanism",
   "debt": "Voted No on all omnibus bills — cited debt concerns",
   "gun": "100% No on gun control — authored D.C. gun rollback",
   "termLimits": "Promised bill, not introduced in 118th Congress",
   "campaign": "Supports dark money disclosure legislation",
   "dataCenters": "N/A",
   "healthcare": "Opposed ACA; supports deregulation and competition",
   "audit": "Co-sponsored Audit the Fed every Congress since 2012"
  }
 },
 "lee": {
  "stances": {
   "border": "Favors federalism-based enforcement approach",
   "debt": "Promised never deficit spend — voted Yes FY2024 omnibus (+$1.7T) ❌",
   "gun": "Consistently opposed all gun control measures",
   "termLimits": "Co-sponsored amendment every Congress since 2011",
   "campaign": "Supports transparency reforms",
   "dataCenters": "N/A",
   "healthcare": "Voted for every ACA repeal measure",
   "audit": "Co-sponsored S.148 but never forced floor vote"
  }
 },
 "cox": {
  "stances": {
   "border": "State-level: supported federal border enforcement cooperation",
   "debt": "Used revenue bonds for data center incentives without voter approval ❌",
   "gun": "Signed constitutional carry expansion",
   "termLimits": "Has not taken formal position",
   "campaign": "No formal position on PAC reform",
   "dataCenters": "🔥 Approved 9 GW / 40,000-acre Box Elder campus (Phase 1 only 1.5 GW). Family ties to CentraCom fiber co.",
   "healthcare": "Expanded Medicaid dental/vision; pushed mental health parity",
   "audit": "N/A — state-level office"
  }
 },
 "trump": {
  "stances": {
   "border": "Pledged Mexico pays for wall — U.S. spent $15B (GAO-20-331) ❌",
   "debt": "Promised to eliminate $19T debt — grew by $7.9T in Term 1 ❌",
   "gun": "Supported bump stock ban; opposed most gun control",
   "termLimits": "Expressed support but no action",
   "campaign": "Signed no campaign finance reform",
   "dataCenters": "Announced $500B Stargate AI infrastructure project (2025)",
   "healthcare": "Failed ACA repeal (Senate 49-51, July 2017) ❌",
   "audit": "Has expressed support; no legislation signed"
  }
 },
 "bilzerian": {
  "stances": {
   "border": "Supports wall completion and tighter asylum rules",
   "debt": "Pledged to oppose all foreign aid until debt resolved",
   "gun": "Pledged 100% Second Amendment — no exceptions",
   "termLimits": "Pledged to co-sponsor term limits amendment",
   "campaign": "Pledged no PAC money — FEC monitoring active",
   "dataCenters": "No stated position",
   "healthcare": "No detailed healthcare position stated",
   "audit": "Pledged to support Audit the Fed"
  }
 },
 "gallrein": {
  "stances": {
   "border": "Strong: supports full border wall and end to catch-and-release",
   "debt": "Pledged to vote against all spending above 2019 baseline",
   "gun": "Pledged full 2A opposition to any gun control",
   "termLimits": "Pledged support for constitutional term limits amendment",
   "campaign": "Broke no-PAC pledge — received $1.17M from PACs (FEC 2026) ❌",
   "dataCenters": "No formal position",
   "healthcare": "Pledged detailed VA reform bill by Jan 2027 (not drafted) ❌",
   "audit": "Pledged to co-sponsor Audit the Fed on seating in 2027"
  }
 },
 "owens": {
  "stances": {
   "border": "Supports border enforcement; voted for wall funding",
   "debt": "Voted No on FY2023 + FY2024 omnibus bills",
   "gun": "100% No on gun control — GovTrack confirmed all 9 votes",
   "termLimits": "Expressed support; no bill introduced",
   "campaign": "No formal position",
   "dataCenters": "N/A",
   "healthcare": "Supports school choice; opposed federal mandates",
   "audit": "Has expressed support for Federal Reserve audit"
  }
 },
 "maloy": {
  "stances": {
   "border": "Supports enforcement; voted for border security funding",
   "debt": "Stated support for balanced budget amendment",
   "gun": "No on all 5 gun votes — 118th & 119th Congress",
   "termLimits": "Expressed support; no co-sponsorship yet",
   "campaign": "No formal position",
   "dataCenters": "N/A",
   "healthcare": "Supports market-based reform; opposes mandates",
   "audit": "Has expressed general support"
  }
 },
 "kennedy": {
  "bio": "Mike Kennedy is the Republican U.S. Representative for Utah’s 3rd Congressional District (Utah County), first elected in 2024. A physician and attorney, he previously served in the Utah Legislature before his Congressional bid.",
  "stances": {
   "border": "Supports enforcement; no specific border legislation proposed",
   "debt": "Pledged categorically to never vote for deficit spending",
   "gun": "Pledged 100% opposition to any gun regulation",
   "termLimits": "Long-standing advocate — signed UT Convention of States 2019",
   "campaign": "No formal position stated",
   "dataCenters": "N/A",
   "healthcare": "Pledged ACA repeal; introduced HB 70 (conscience rights in UT)",
   "audit": "Pledged support for Federal Reserve audit legislation"
  }
 },
 "tgabbard": {
  "stances": {
   "border": "Supports border enforcement; opposed open-border policies",
   "debt": "Voted against omnibus spending in House tenure",
   "gun": "Supported Second Amendment; mixed voting record in House",
   "termLimits": "Expressed general support; no legislation",
   "campaign": "Left Democratic Party Oct 2022 citing extremism",
   "dataCenters": "N/A",
   "healthcare": "Supported Medicare for All in House; shifted stance",
   "audit": "No formal position stated"
  }
 },
 "hegseth": {
  "stances": {
   "border": "Supports military deployment to border",
   "debt": "Pledged to reduce DoD waste and pass first full audit",
   "gun": "Strong Second Amendment supporter",
   "termLimits": "No formal position",
   "campaign": "N/A — Cabinet appointee",
   "dataCenters": "N/A",
   "healthcare": "Supports VA reform and military healthcare improvements",
   "audit": "Pledged DoD financial audit — Pentagon never passed one"
  }
 },
 "bmoore": {
  "stances": {
   "border": "Supports enforcement; voted for border security funding",
   "debt": "Voted against FY2023 omnibus; supports balanced budget",
   "gun": "Voted against all gun control measures",
   "termLimits": "Expressed support; no bill introduced",
   "campaign": "No formal position",
   "dataCenters": "N/A",
   "healthcare": "Supports market-based reform",
   "audit": "Has expressed general support"
  }
 },
 "jpetro": {
  "stances": {
   "border": "N/A — local office",
   "debt": "Held Layton's property-tax rate flat while funding roads, police, and fire",
   "gun": "N/A — local office",
   "termLimits": "N/A — local office",
   "campaign": "N/A — local office",
   "dataCenters": "N/A",
   "healthcare": "N/A — local office",
   "audit": "N/A — local office"
  }
 },
 "jstevenson": {
  "stances": {
   "border": "Supports state-level cooperation with federal enforcement",
   "debt": "FY2024 budget exceeded stated inflation cap",
   "gun": "Supports constitutional carry",
   "termLimits": "No formal position",
   "campaign": "No formal position",
   "dataCenters": "N/A",
   "healthcare": "Supports state-level healthcare reform",
   "audit": "N/A — state-level office"
  }
 },
 "tlee": {
  "stances": {
   "border": "Supports state cooperation with federal enforcement",
   "debt": "Voted Yes on HB 54 — income tax reduction to 4.55%",
   "gun": "Supports constitutional carry",
   "termLimits": "No formal position",
   "campaign": "No formal position",
   "dataCenters": "N/A",
   "healthcare": "Supports market-based reform",
   "audit": "N/A — state-level office"
  }
 },
 "kgrover": {
  "bio": "Keith Grover is the Republican state senator for Utah Senate District 23, covering the Provo area. He is up for re-election in 2026.",
  "stances": {
   "border": "PolitiDex is compiling this official’s voting record.",
   "debt": "PolitiDex is compiling this official’s voting record.",
   "gun": "PolitiDex is compiling this official’s voting record.",
   "termLimits": "PolitiDex is compiling this official’s voting record.",
   "campaign": "PolitiDex is compiling this official’s voting record.",
   "dataCenters": "N/A",
   "healthcare": "PolitiDex is compiling this official’s voting record.",
   "audit": "N/A — state-level office"
  }
 },
 "amillner": {
  "bio": "Ann Millner is the Republican state senator for Utah Senate District 5 (Weber County) and a former Weber State University president, focused on education and workforce policy.",
  "stances": {
   "border": "Supports state cooperation with federal enforcement",
   "debt": "Supports balanced state budgeting",
   "gun": "Supports constitutional carry",
   "termLimits": "No formal position",
   "campaign": "No formal position",
   "dataCenters": "N/A",
   "healthcare": "Leading voice on workforce and higher-education funding",
   "audit": "N/A — state-level office"
  }
 },
 "lisa_shepherd": {
  "bio": "Lisa Shepherd is the Republican state representative for Utah House District 61, covering the Provo area. She is eligible for re-election in 2026.",
  "stances": {
   "border": "PolitiDex is compiling this official’s voting record.",
   "debt": "PolitiDex is compiling this official’s voting record.",
   "gun": "PolitiDex is compiling this official’s voting record.",
   "termLimits": "PolitiDex is compiling this official’s voting record.",
   "campaign": "PolitiDex is compiling this official’s voting record.",
   "dataCenters": "N/A",
   "healthcare": "PolitiDex is compiling this official’s voting record.",
   "audit": "N/A — state-level office"
  }
 },
 "jake_sawyer": {
  "bio": "Jake Sawyer is the Republican state representative for Utah House District 9 in the Ogden / Weber County area. He is eligible for re-election in 2026.",
  "stances": {
   "border": "PolitiDex is compiling this official’s voting record.",
   "debt": "PolitiDex is compiling this official’s voting record.",
   "gun": "PolitiDex is compiling this official’s voting record.",
   "termLimits": "PolitiDex is compiling this official’s voting record.",
   "campaign": "PolitiDex is compiling this official’s voting record.",
   "dataCenters": "N/A",
   "healthcare": "PolitiDex is compiling this official’s voting record.",
   "audit": "N/A — state-level office"
  }
 },
 "lorene_kamalu": {
  "bio": "Lorene Kamalu is a two-term Davis County Commissioner (Seat B). A longtime education and parent-engagement advocate who built her public profile through statewide PTA leadership, she has represented fast-growing Davis County on regional growth, transportation, and public-health matters and helps set the county budget — including a roughly 14.9% property-tax increase that became the central issue of the 2026 race. She narrowly lost the June 2026 Republican primary to Susan Lee, 49.23% to 50.77%, and continues to serve out her term.",
  "stances": {
   "border": "N/A — county office",
   "debt": "Helped set the county budget that adopted a ~14.9% property-tax increase to fund rising service demands.",
   "gun": "N/A — county office",
   "termLimits": "N/A — county office",
   "campaign": "N/A — county office",
   "dataCenters": "N/A",
   "healthcare": "Supports county behavioral-health and human-services programs, including Davis Behavioral Health.",
   "audit": "N/A — county office"
  }
 },
 "john_crofts": {
  "bio": "John Crofts is a Davis County Commissioner, elected in 2024. He campaigned on open government — launching a free weekly plain-language summary of Commission business — and on scrutinizing county spending, serving on the county Budget Committee and as Audit Committee vice chair as the Commission weighs property-tax decisions against the cost of county services.",
  "stances": {
   "border": "N/A — county office",
   "debt": "Sits on the county Budget and Audit committees and pledges to weigh property-tax decisions against the real cost of county services.",
   "gun": "N/A — county office",
   "termLimits": "N/A — county office",
   "campaign": "N/A — county office",
   "dataCenters": "N/A",
   "healthcare": "Supports county human-services and public-health programs.",
   "audit": "Serves as vice chair of the county Audit Committee and champions plain-language transparency about county spending."
  }
 },
 "bob_stevenson": {
  "bio": "Bob Stevenson is a multi-term Davis County Commissioner and former Layton mayor. As one of three commissioners he helps set the county budget and tax rate, campaigning on holding the line against rising property taxes, and treats managing the roads, water, and regional transportation demands of one of Utah’s fastest-growing counties as a core commission responsibility.",
  "stances": {
   "border": "N/A — county office",
   "debt": "Campaigns on holding the line against rising property taxes and spending county dollars efficiently.",
   "gun": "N/A — county office",
   "termLimits": "Campaigned on observing self-imposed term limits.",
   "campaign": "N/A — county office",
   "dataCenters": "N/A",
   "healthcare": "Supports county human-services programs.",
   "audit": "N/A — county office"
  }
 },
 "kelly_sparks": {
  "bio": "Kelly V. Sparks is the elected Davis County Sheriff, responsible for countywide law enforcement and the county jail. A longtime member of the Sheriff’s Office, he was appointed to the post in 2023 and won a full term in the 2024 election.",
  "stances": {
   "border": "N/A — county office",
   "debt": "N/A — county office",
   "gun": "N/A — county office",
   "termLimits": "N/A — county office",
   "campaign": "N/A — county office",
   "dataCenters": "N/A",
   "healthcare": "N/A — county office",
   "audit": "N/A — county office"
  }
 },
 "susan_lee": {
  "bio": "Susan Lee is the 2026 Republican nominee for Davis County Commission, Seat B, and a former Kaysville City Council member. She entered the race over a proposed county property-tax increase, opposing the 14.9% increase the commission passed and arguing officials should cut waste and duplicated services before raising taxes on residents and fixed-income seniors. She won the June 2026 Republican primary against incumbent Lorene Kamalu, 50.77% to 49.23%.",
  "stances": {
   "border": "N/A — county office",
   "debt": "Opposed the 14.9% property-tax increase and proposes a “service-level solvency test” to find duplicated services and unneeded positions.",
   "gun": "N/A — county office",
   "termLimits": "N/A — county office",
   "campaign": "N/A — county office",
   "dataCenters": "N/A",
   "healthcare": "Says she wants to maintain quality county services while scrutinizing every department’s cost.",
   "audit": "Points to creating a power-oversight commission on the Kaysville council and would press for more openness in county business."
  }
 },
 "zach_bloxham": {
  "bio": "Zach Bloxham serves on the five-member Layton City Council, the body that sets city ordinances, land use and the municipal budget and oversees Layton services such as roads, police, fire and parks. Layton council members serve staggered four-year terms and its municipal offices are nonpartisan.",
  "stances": {
   "border": "N/A — city office",
   "debt": "Helps set Layton’s city budget and property-tax rate.",
   "gun": "N/A — city office",
   "termLimits": "N/A — city office",
   "campaign": "N/A — city office",
   "dataCenters": "N/A",
   "healthcare": "N/A — city office",
   "audit": "N/A — city office"
  }
 },
 "clint_morris": {
  "bio": "Clint Morris serves on the five-member Layton City Council, first elected in 2019. The council sets city ordinances, land use and the municipal budget and oversees Layton services such as roads, police, fire and parks. Layton municipal offices are nonpartisan.",
  "stances": {
   "border": "N/A — city office",
   "debt": "Helps set Layton’s city budget and property-tax rate.",
   "gun": "N/A — city office",
   "termLimits": "N/A — city office",
   "campaign": "N/A — city office",
   "dataCenters": "N/A",
   "healthcare": "N/A — city office",
   "audit": "N/A — city office"
  }
 },
 "tyson_roberts": {
  "bio": "Tyson Roberts serves on the five-member Layton City Council, which sets city ordinances, land use and the municipal budget and oversees Layton services such as roads, police, fire and parks. Layton council members serve staggered four-year terms and its municipal offices are nonpartisan.",
  "stances": {
   "border": "N/A — city office",
   "debt": "Helps set Layton’s city budget and property-tax rate.",
   "gun": "N/A — city office",
   "termLimits": "N/A — city office",
   "campaign": "N/A — city office",
   "dataCenters": "N/A",
   "healthcare": "N/A — city office",
   "audit": "N/A — city office"
  }
 },
 "brigit_gerrard": {
  "bio": "Brigit Gerrard is President of the Davis School District Board of Education, representing Precinct 4 — which covers Fruit Heights, Kaysville, Layton and South Weber. The seven-member board sets district policy and the school budget; her assignments include board leadership, finance and Davis Technical College. She was re-elected in 2024. School-board offices are nonpartisan.",
  "stances": {
   "border": "N/A — school board",
   "debt": "Helps set the Davis School District budget as board president and a finance-committee member.",
   "gun": "N/A — school board",
   "termLimits": "N/A — school board",
   "campaign": "N/A — school board",
   "dataCenters": "N/A",
   "healthcare": "N/A — school board",
   "audit": "Serves on district finance and audit-related assignments."
  }
 },
 "michelle_barber": {
  "bio": "Michelle Barber represents Precinct 5 on the Davis School District Board of Education — a precinct covering Clearfield, Hill Air Force Base, Kaysville, Layton and Sunset. The seven-member board sets district policy and the school budget; her assignments include finance and the Utah High School Activities Association board. She won election in 2024. School-board offices are nonpartisan.",
  "stances": {
   "border": "N/A — school board",
   "debt": "One of seven board members who set the Davis School District budget.",
   "gun": "N/A — school board",
   "termLimits": "N/A — school board",
   "campaign": "N/A — school board",
   "dataCenters": "N/A",
   "healthcare": "N/A — school board",
   "audit": "Serves on district finance-related assignments."
  }
 },
 "kristen_hogan": {
  "bio": "Kristen Hogan represents Precinct 6 on the Davis School District Board of Education — a precinct covering Clearfield, Layton and Syracuse. The seven-member board sets district policy, boundaries and the school budget for local public schools. She was first elected in 2022. School-board offices are nonpartisan.",
  "stances": {
   "border": "N/A — school board",
   "debt": "One of seven board members who set the Davis School District budget.",
   "gun": "N/A — school board",
   "termLimits": "N/A — school board",
   "campaign": "N/A — school board",
   "dataCenters": "N/A",
   "healthcare": "N/A — school board",
   "audit": "N/A — school board"
  }
 },
 "chad_jensen": {
  "bio": "D. Chad Jensen is the elected Cache County Sheriff, responsible for countywide law enforcement, the county jail and search-and-rescue. A career officer who has spent his entire law-enforcement career with the Cache County Sheriff’s Office, he was first elected Sheriff in 2015 and continues to lead the agency — recently pressing for mid-year deputy pay raises to stem staffing losses.",
  "stances": {
   "border": "N/A — county office",
   "debt": "Has pushed for deputy pay raises to keep the Sheriff’s Office staffed as the county debates its budget.",
   "gun": "N/A — county office",
   "termLimits": "N/A — county office",
   "campaign": "N/A — county office",
   "dataCenters": "N/A",
   "healthcare": "N/A — county office",
   "audit": "N/A — county office"
  }
 },
 "george_daines": {
  "bio": "N. George Daines is the elected Cache County Executive — the county’s chief executive officer, elected at large. A former Cache County Attorney (2002–2008) and longtime Cache Valley Bank executive, he won a September 2025 special election to succeed David Zook, campaigning to “protect taxpayers” and restore fiscal discipline. He inherited a roughly $7.6M shortfall and recommended about $2.8M in cuts before the County Council adopted an 18% property-tax increase for 2026.",
  "stances": {
   "border": "N/A — county office",
   "debt": "Campaigned to protect taxpayers and restore fiscal discipline; recommended ~$2.8M in cuts before the council adopted an 18% property-tax increase for 2026.",
   "gun": "N/A — county office",
   "termLimits": "N/A — county office",
   "campaign": "N/A — county office",
   "dataCenters": "N/A",
   "healthcare": "N/A — county office",
   "audit": "Names fiscal accountability, transparency and a return to county “core functions” as his focus."
  }
 },
 "mark_anderson_logan": {
  "bio": "Mark Anderson is the Mayor of Logan, the largest city in Cache Valley. A former city councilman, he was elected mayor in 2025 as growth and housing dominated the race and was sworn in in January 2026, succeeding Holly Daines. He backs a supply-first approach to housing — including walkable student housing near Utah State University — and has prioritized water infrastructure, a new water tank and the Canyon Road waterline, as the city plans for rapid growth. (Logan municipal offices are nonpartisan.)",
  "stances": {
   "border": "N/A — city office",
   "debt": "N/A — city office",
   "gun": "N/A — city office",
   "termLimits": "N/A — city office",
   "campaign": "N/A — city office",
   "dataCenters": "N/A",
   "healthcare": "N/A — city office",
   "audit": "Pledged a public-information group and monthly neighborhood meetings to keep residents informed."
  }
 },
 "sandi_goodlander": {
  "bio": "Sandi Goodlander chairs the seven-member Cache County Council, representing Logan Seat #3. The council sets the county budget and tax rate and oversees countywide services; in 2025 it unanimously adopted an 18% property-tax increase for 2026 to close a budget shortfall.",
  "stances": {
   "border": "N/A — county office",
   "debt": "One of seven council members who unanimously approved an 18% county property-tax increase for 2026 to close a budget shortfall.",
   "gun": "N/A — county office",
   "termLimits": "N/A — county office",
   "campaign": "N/A — county office",
   "dataCenters": "N/A",
   "healthcare": "N/A — county office",
   "audit": "N/A — county office"
  }
 },
 "kathryn_beus": {
  "bio": "Kathryn Beus is Vice Chair of the Cache County Council, representing the county’s Southeast District. She is one of the seven council members who set the county budget and tax rate and oversee countywide services.",
  "stances": {
   "border": "N/A — county office",
   "debt": "One of seven council members who unanimously approved an 18% county property-tax increase for 2026 to close a budget shortfall.",
   "gun": "N/A — county office",
   "termLimits": "N/A — county office",
   "campaign": "N/A — county office",
   "dataCenters": "N/A",
   "healthcare": "N/A — county office",
   "audit": "N/A — county office"
  }
 },
 "david_erickson_cache": {
  "bio": "David L. Erickson represents the North District on the Cache County Council, a seat he has held since 2015 and to which he was re-elected unopposed in 2024. A past council chair, he has urged spending restraint on things “outside of what we as a county should even be involved in” while defending difficult budget votes during the county’s property-tax fight.",
  "stances": {
   "border": "N/A — county office",
   "debt": "One of seven council members who unanimously approved an 18% county property-tax increase for 2026; has argued for restraint on spending outside the county’s core role.",
   "gun": "N/A — county office",
   "termLimits": "N/A — county office",
   "campaign": "N/A — county office",
   "dataCenters": "N/A",
   "healthcare": "N/A — county office",
   "audit": "N/A — county office"
  }
 },
 "keegan_garrity": {
  "bio": "Keegan Garrity represents Logan Seat #1 on the seven-member Cache County Council, which sets the county budget and tax rate and oversees countywide services such as roads, public safety and health.",
  "stances": {
   "border": "N/A — county office",
   "debt": "One of seven council members who unanimously approved an 18% county property-tax increase for 2026 to close a budget shortfall.",
   "gun": "N/A — county office",
   "termLimits": "N/A — county office",
   "campaign": "N/A — county office",
   "dataCenters": "N/A",
   "healthcare": "N/A — county office",
   "audit": "N/A — county office"
  }
 },
 "joann_bennett": {
  "bio": "JoAnn Bennett represents Logan Seat #2 on the seven-member Cache County Council, which sets the county budget and tax rate and oversees countywide services such as roads, public safety and health.",
  "stances": {
   "border": "N/A — county office",
   "debt": "One of seven council members who unanimously approved an 18% county property-tax increase for 2026 to close a budget shortfall.",
   "gun": "N/A — county office",
   "termLimits": "N/A — county office",
   "campaign": "N/A — county office",
   "dataCenters": "N/A",
   "healthcare": "N/A — county office",
   "audit": "N/A — county office"
  }
 },
 "mark_hurd": {
  "bio": "Mark Hurd represents the Northeast District on the seven-member Cache County Council, which sets the county budget and tax rate and oversees countywide services such as roads, public safety and health.",
  "stances": {
   "border": "N/A — county office",
   "debt": "One of seven council members who unanimously approved an 18% county property-tax increase for 2026 to close a budget shortfall.",
   "gun": "N/A — county office",
   "termLimits": "N/A — county office",
   "campaign": "N/A — county office",
   "dataCenters": "N/A",
   "healthcare": "N/A — county office",
   "audit": "N/A — county office"
  }
 },
 "nolan_gunnell": {
  "bio": "Nolan P. Gunnell represents the South District on the seven-member Cache County Council, which sets the county budget and tax rate and oversees countywide services such as roads, public safety and health.",
  "stances": {
   "border": "N/A — county office",
   "debt": "One of seven council members who unanimously approved an 18% county property-tax increase for 2026 to close a budget shortfall.",
   "gun": "N/A — county office",
   "termLimits": "N/A — county office",
   "campaign": "N/A — county office",
   "dataCenters": "N/A",
   "healthcare": "N/A — county office",
   "audit": "N/A — county office"
  }
 },
 "teri_rhodes": {
  "bio": "Teri Rhodes is president of the seven-member Cache County School Board, representing District 7 and serving on the board since 2013. She led the board as it carried out a voter-approved $139M 2023 construction bond and backed a 28.1% property-tax revenue increase in 2025 that the Utah State Tax Commission later denied on procedural grounds. Her seat is on the November 2026 ballot. School-board offices are nonpartisan.",
  "stances": {
   "border": "N/A — school board",
   "debt": "Backed the district’s 2025 property-tax revenue increase, tying it to shifting state funding; the state tax commission denied it on procedural grounds.",
   "gun": "N/A — school board",
   "termLimits": "N/A — school board",
   "campaign": "N/A — school board",
   "dataCenters": "N/A",
   "healthcare": "N/A — school board",
   "audit": "N/A — school board"
  }
 },
 "brian_chambers": {
  "bio": "Brian Chambers represents District 1 on the seven-member Cache County School Board, appointed in December 2023 and elected to a full term in 2024. He cast the sole dissenting vote against the district’s 28.1% property-tax revenue increase in August 2025. School-board offices are nonpartisan.",
  "stances": {
   "border": "N/A — school board",
   "debt": "Cast the lone “no” vote against the district’s 28.1% property-tax revenue increase in 2025.",
   "gun": "N/A — school board",
   "termLimits": "N/A — school board",
   "campaign": "N/A — school board",
   "dataCenters": "N/A",
   "healthcare": "N/A — school board",
   "audit": "N/A — school board"
  }
 },
 "roger_pulsipher": {
  "bio": "Roger Pulsipher represents District 2 on the seven-member Cache County School Board. One of six members who approved the district’s 28.1% property-tax revenue increase in 2025 (later denied by the state), he is on the November 2026 ballot against challenger Aaron Ritchey. School-board offices are nonpartisan.",
  "stances": {
   "border": "N/A — school board",
   "debt": "Voted for the district’s 2025 property-tax revenue increase, which the state tax commission later denied.",
   "gun": "N/A — school board",
   "termLimits": "N/A — school board",
   "campaign": "N/A — school board",
   "dataCenters": "N/A",
   "healthcare": "N/A — school board",
   "audit": "N/A — school board"
  }
 },
 "randall_bagley": {
  "bio": "Randall Bagley represents District 4 on the seven-member Cache County School Board. One of six members who approved the district’s 28.1% property-tax revenue increase in 2025 (later denied by the state), he is on the November 2026 ballot against challenger Deidra Hartwell. School-board offices are nonpartisan.",
  "stances": {
   "border": "N/A — school board",
   "debt": "Voted for the district’s 2025 property-tax revenue increase, which the state tax commission later denied.",
   "gun": "N/A — school board",
   "termLimits": "N/A — school board",
   "campaign": "N/A — school board",
   "dataCenters": "N/A",
   "healthcare": "N/A — school board",
   "audit": "N/A — school board"
  }
 },
 "d_jeffrey_nielsen": {
  "bio": "D. Jeffrey Nielsen represents District 3 on the seven-member Cache County School Board, which sets district budgets, boundaries and classroom policy for schools in the communities surrounding Logan. School-board offices are nonpartisan.",
  "stances": {
   "border": "N/A — school board",
   "debt": "One of seven members who set the Cache County School District budget.",
   "gun": "N/A — school board",
   "termLimits": "N/A — school board",
   "campaign": "N/A — school board",
   "dataCenters": "N/A",
   "healthcare": "N/A — school board",
   "audit": "N/A — school board"
  }
 },
 "allen_grunig": {
  "bio": "Allen Grunig represents District 5 on the seven-member Cache County School Board, elected in 2024. The board sets district budgets, boundaries and classroom policy for schools in the communities surrounding Logan. School-board offices are nonpartisan.",
  "stances": {
   "border": "N/A — school board",
   "debt": "One of seven members who set the Cache County School District budget.",
   "gun": "N/A — school board",
   "termLimits": "N/A — school board",
   "campaign": "N/A — school board",
   "dataCenters": "N/A",
   "healthcare": "N/A — school board",
   "audit": "N/A — school board"
  }
 },
 "kathy_christiansen": {
  "bio": "Kathy Christiansen is vice president of the seven-member Cache County School Board, representing District 6. The board sets district budgets, boundaries and classroom policy for schools in the communities surrounding Logan. School-board offices are nonpartisan.",
  "stances": {
   "border": "N/A — school board",
   "debt": "One of seven members who set the Cache County School District budget.",
   "gun": "N/A — school board",
   "termLimits": "N/A — school board",
   "campaign": "N/A — school board",
   "dataCenters": "N/A",
   "healthcare": "N/A — school board",
   "audit": "N/A — school board"
  }
 },
 "becky_quay": {
  "bio": "Becky Quay is president of the five-member Logan City School Board, elected in November 2024 by a 39-vote margin to represent District 4. In 2025 the board raised member compensation on a contested 3-1 vote. School-board offices are nonpartisan.",
  "stances": {
   "border": "N/A — school board",
   "debt": "Part of the board’s 2025 vote to raise member compensation and add optional district-paid health coverage.",
   "gun": "N/A — school board",
   "termLimits": "N/A — school board",
   "campaign": "N/A — school board",
   "dataCenters": "N/A",
   "healthcare": "N/A — school board",
   "audit": "N/A — school board"
  }
 },
 "cole_checketts": {
  "bio": "Cole Checketts represents District 5 on the five-member Logan City School Board and has been the board’s consistent lone dissenter — the sole “no” on the 2025 superintendent reappointment (4-1) and the 2025 board-pay increase (3-1). His seat is on the November 2026 ballot. School-board offices are nonpartisan.",
  "stances": {
   "border": "N/A — school board",
   "debt": "The board’s lone dissenter against the 2025 board-pay-and-benefits increase.",
   "gun": "N/A — school board",
   "termLimits": "N/A — school board",
   "campaign": "N/A — school board",
   "dataCenters": "N/A",
   "healthcare": "N/A — school board",
   "audit": "N/A — school board"
  }
 },
 "russell_fisher": {
  "bio": "Russell Fisher was appointed in October 2025 to fill the Logan City School Board’s District 3 seat after the board president resigned, serving through 2026. His seat is on the November 2026 ballot. School-board offices are nonpartisan.",
  "stances": {
   "border": "N/A — school board",
   "debt": "One of five members who set the Logan City School District budget.",
   "gun": "N/A — school board",
   "termLimits": "N/A — school board",
   "campaign": "N/A — school board",
   "dataCenters": "N/A",
   "healthcare": "N/A — school board",
   "audit": "N/A — school board"
  }
 },
 "katie_chapman": {
  "bio": "Katie Chapman represents District 1 on the five-member Logan City School Board, appointed in July 2024. The board sets budgets, boundaries and classroom policy for Logan’s public schools. School-board offices are nonpartisan.",
  "stances": {
   "border": "N/A — school board",
   "debt": "One of five members who set the Logan City School District budget.",
   "gun": "N/A — school board",
   "termLimits": "N/A — school board",
   "campaign": "N/A — school board",
   "dataCenters": "N/A",
   "healthcare": "N/A — school board",
   "audit": "N/A — school board"
  }
 },
 "frank_stewart": {
  "bio": "Frank Stewart is vice president of the five-member Logan City School Board, representing District 2. The board sets budgets, boundaries and classroom policy for Logan’s public schools. School-board offices are nonpartisan.",
  "stances": {
   "border": "N/A — school board",
   "debt": "One of five members who set the Logan City School District budget.",
   "gun": "N/A — school board",
   "termLimits": "N/A — school board",
   "campaign": "N/A — school board",
   "dataCenters": "N/A",
   "healthcare": "N/A — school board",
   "audit": "N/A — school board"
  }
 },
 "sadams": {
  "stances": {
   "border": "Supports state-level enforcement cooperation",
   "debt": "Exceeded budget growth cap in FY2024",
   "gun": "Supports constitutional carry expansion",
   "termLimits": "No formal position",
   "campaign": "No formal position",
   "dataCenters": "N/A",
   "healthcare": "Championed $13B school choice HB 1 passage",
   "audit": "N/A — state-level office"
  }
 },
 "boebert": {
  "stances": {
   "border": "Supports full border wall; voted for enforcement funding",
   "debt": "Voted No on omnibus spending; supports budget cuts",
   "gun": "100% No on gun control — every vote",
   "termLimits": "Expressed support; no legislation",
   "campaign": "No formal position",
   "dataCenters": "N/A",
   "healthcare": "Opposes ACA; supports deregulation",
   "audit": "Has expressed support for Audit the Fed"
  }
 },
 "mtg": {
  "stances": {
   "border": "Supports full border wall; opposes all immigration reform",
   "debt": "Voted No on omnibus; supported some spending increases",
   "gun": "100% No on gun control",
   "termLimits": "Expressed support; no legislation introduced",
   "campaign": "No formal position",
   "dataCenters": "N/A",
   "healthcare": "Opposes all mandates; anti-ACA",
   "audit": "Supports Audit the Fed"
  }
 },
 "gaetz": {
  "stances": {
   "border": "Supports full border enforcement; voted for wall funding",
   "debt": "Voted No on all Ukraine aid; opposed omnibus bills",
   "gun": "Strong Second Amendment supporter",
   "termLimits": "Expressed support; no legislation",
   "campaign": "No formal position",
   "dataCenters": "N/A",
   "healthcare": "Opposed ACA mandates",
   "audit": "Supported Audit the Fed legislation"
  }
 },
 "rfine": {
  "stances": {
   "border": "Supports full border enforcement",
   "debt": "Pledged fiscal conservatism at federal level",
   "gun": "Strong Second Amendment supporter",
   "termLimits": "No formal position stated",
   "campaign": "No formal position",
   "dataCenters": "N/A",
   "healthcare": "Ban employer vaccine mandates federally",
   "audit": "No formal position"
  }
 },
 "lyman": {
  "stances": {
   "border": "Supports state-level enforcement cooperation",
   "debt": "Pledged to reduce state budget 10% in first term",
   "gun": "Constitutional carry expansion pledge",
   "termLimits": "No formal position",
   "campaign": "No formal position",
   "dataCenters": "N/A",
   "healthcare": "No detailed healthcare position stated",
   "audit": "N/A — state-level candidate"
  }
 },
 "cstewart": {
  "stances": {
   "border": "Supported border enforcement funding",
   "debt": "Voted No on deficit spending",
   "gun": "Supported Second Amendment; voted against gun control",
   "termLimits": "No formal position",
   "campaign": "No formal position",
   "dataCenters": "N/A",
   "healthcare": "Supported market-based reform",
   "audit": "Has expressed general support"
  }
 },
 "emendenhall": {
  "stances": {
   "border": "N/A — local office",
   "debt": "Managed city budget with affordable housing focus",
   "gun": "N/A — local office",
   "termLimits": "N/A — local office",
   "campaign": "N/A — local office",
   "dataCenters": "N/A",
   "healthcare": "Signed Climate Positive 2040 commitment",
   "audit": "N/A — local office"
  }
 },
 "jwilson": {
  "stances": {
   "border": "N/A — local office",
   "debt": "$1.3B county budget management",
   "gun": "N/A — local office",
   "termLimits": "N/A — local office",
   "campaign": "N/A — local office",
   "dataCenters": "N/A",
   "healthcare": "Criminal justice reform — pretrial services program",
   "audit": "N/A — local office"
  }
 },
 "bwilson": {
  "stances": {
   "border": "Supports state cooperation with federal enforcement",
   "debt": "State spending increased beyond inflation targets while Speaker",
   "gun": "Supports constitutional carry",
   "termLimits": "No formal position",
   "campaign": "No formal position",
   "dataCenters": "N/A",
   "healthcare": "Passed HB 215 (ESA school choice) as Speaker",
   "audit": "N/A — state-level office"
  }
 },
 "mschultz": {
  "stances": {
   "border": "Supports state cooperation with federal enforcement",
   "debt": "Managed passage of $28B+ state budget on time",
   "gun": "Supports constitutional carry",
   "termLimits": "No formal position",
   "campaign": "No formal position",
   "dataCenters": "N/A",
   "healthcare": "Backed WPU education funding increase — 6.5% per pupil",
   "audit": "N/A — state-level office"
  }
 },
 "tweiler": {
  "stances": {
   "border": "N/A — focuses on tech policy",
   "debt": "Supports balanced budgets",
   "gun": "Supports constitutional carry",
   "termLimits": "No formal position",
   "campaign": "No formal position",
   "dataCenters": "N/A",
   "healthcare": "Authored first-in-nation internet age-verification law",
   "audit": "N/A — state-level office"
  }
 },
 "rward": {
  "stances": {
   "border": "N/A — focuses on healthcare policy",
   "debt": "Supports evidence-based budgeting",
   "gun": "Moderate; voted for constitutional carry",
   "termLimits": "No formal position",
   "campaign": "No formal position",
   "dataCenters": "N/A",
   "healthcare": "Championed Medicaid expansion, $50M mental health funding, hospital price transparency",
   "audit": "N/A — state-level office"
  }
 },
 "kcullimore": {
  "stances": {
   "border": "Supports state cooperation with federal enforcement",
   "debt": "Supports balanced budgets; voted for income tax reductions",
   "gun": "Supports constitutional carry",
   "termLimits": "No formal position",
   "campaign": "No formal position",
   "dataCenters": "N/A",
   "healthcare": "Authored Utah Consumer Privacy Act (UCPA)",
   "audit": "N/A — state-level office"
  }
 },
 "aromero": {
  "stances": {
   "border": "Supports immigrant rights and driving privilege card expansion",
   "debt": "Supports targeted spending on affordable housing",
   "gun": "Supports gun safety measures",
   "termLimits": "No formal position",
   "campaign": "No formal position",
   "dataCenters": "N/A",
   "healthcare": "Champions domestic violence reform and social services",
   "audit": "N/A — state-level office"
  }
 },
 "cbramble": {
  "stances": {
   "border": "Supports state cooperation with federal enforcement",
   "debt": "Led four consecutive income tax reductions 4.95%→4.55%",
   "gun": "Supports constitutional carry",
   "termLimits": "No formal position",
   "campaign": "No formal position",
   "dataCenters": "N/A",
   "healthcare": "Focus on higher education funding; $120M for Utah County institutions",
   "audit": "N/A — state-level office"
  }
 },
 "dipson": {
  "stances": {
   "border": "Supports state-level enforcement cooperation",
   "debt": "Supports balanced budgets",
   "gun": "Supports constitutional carry",
   "termLimits": "No formal position",
   "campaign": "No formal position",
   "dataCenters": "N/A",
   "healthcare": "Focus on rural healthcare access",
   "audit": "N/A — state-level office"
  }
 },
 "rshipp": {
  "stances": {
   "border": "Supports state cooperation with federal enforcement",
   "debt": "Supports fiscal conservatism",
   "gun": "Supports constitutional carry",
   "termLimits": "No formal position",
   "campaign": "No formal position",
   "dataCenters": "N/A",
   "healthcare": "Focus on education funding for growing districts",
   "audit": "N/A — state-level office"
  }
 },
 "ssandall": {
  "stances": {
   "border": "Supports state cooperation with federal enforcement",
   "debt": "Supports balanced budgets; focus on agricultural funding",
   "gun": "Supports constitutional carry",
   "termLimits": "No formal position",
   "campaign": "No formal position",
   "dataCenters": "N/A",
   "healthcare": "Focus on agricultural water rights and USU funding",
   "audit": "N/A — state-level office"
  }
 },
 "jdraxler": {
  "stances": {
   "border": "Supports state cooperation with federal enforcement",
   "debt": "Supports fiscal conservatism; education funding priority",
   "gun": "Supports constitutional carry",
   "termLimits": "No formal position",
   "campaign": "No formal position",
   "dataCenters": "N/A",
   "healthcare": "Focus on education funding and Cache Valley development",
   "audit": "N/A — state-level office"
  }
 },
 "evickers": {
  "stances": {
   "border": "Supports state cooperation with federal enforcement",
   "debt": "Supports balanced budgets; prioritizes rural investment",
   "gun": "Supports constitutional carry",
   "termLimits": "No formal position",
   "campaign": "No formal position",
   "dataCenters": "N/A",
   "healthcare": "Expanded telehealth and pharmacy prescribing for rural areas",
   "audit": "N/A — state-level office"
  }
 },
 "jwestwood": {
  "stances": {
   "border": "Supports state cooperation with federal enforcement",
   "debt": "Supports fiscal conservatism",
   "gun": "Supports constitutional carry",
   "termLimits": "No formal position",
   "campaign": "No formal position",
   "dataCenters": "N/A",
   "healthcare": "Focus on education and tourism for Iron County",
   "audit": "N/A — state-level office"
  }
 },
 "kwan_s12": {
  "bio": "Karen Kwan is a Democrat representing Utah Senate District 12, covering West Valley City and Murray. She served in the Utah House beginning in 2017 before moving to the State Senate in 2023, and focuses on education, mental health, and workforce issues for one of the state's most diverse, working-class areas.",
  "stances": {
   "border": "PolitiDex is compiling this official’s voting record.",
   "debt": "PolitiDex is compiling this official’s voting record.",
   "gun": "PolitiDex is compiling this official’s voting record.",
   "termLimits": "PolitiDex is compiling this official’s voting record.",
   "campaign": "PolitiDex is compiling this official’s voting record.",
   "dataCenters": "N/A",
   "healthcare": "PolitiDex is compiling this official’s voting record.",
   "audit": "N/A — state-level office"
  }
 },
 "blouin_s13": {
  "bio": "Nate Blouin is a Salt Lake County Democrat first elected to the Senate in 2022, making him one of its younger members and one of its most vocal progressive voices. He works professionally in the renewable-energy industry, and that expertise anchors an agenda centered on clean energy, climate, and Wasatch Front air quality. Representing a dense, urban district, he has also become a leading advocate for renters and for housing affordability. As a member of a small minority caucus he legislates largely through amendments, public pressure, and coalition-building rather than passing major bills outright.",
  "stances": {
   "border": "PolitiDex is compiling this official’s voting record.",
   "debt": "PolitiDex is compiling this official’s voting record.",
   "gun": "PolitiDex is compiling this official’s voting record.",
   "termLimits": "PolitiDex is compiling this official’s voting record.",
   "campaign": "PolitiDex is compiling this official’s voting record.",
   "dataCenters": "N/A",
   "healthcare": "PolitiDex is compiling this official’s voting record.",
   "audit": "N/A — state-level office"
  }
 },
 "mccay_s11": {
  "bio": "Daniel McCay is a Riverton-area Republican who moved from the Utah House to the Senate in 2019 and has become one of the Legislature's chief architects of tax policy. He has driven the state's repeated income-tax rate cuts and championed a move toward a flatter, lower-rate tax structure funded by recurring surpluses. A reliable vote for school choice and limited government, McCay sits at the center of the budget negotiations that decide how Utah spends — and returns — billions of taxpayer dollars each year.",
  "stances": {
   "border": "PolitiDex is compiling this official’s voting record.",
   "debt": "PolitiDex is compiling this official’s voting record.",
   "gun": "PolitiDex is compiling this official’s voting record.",
   "termLimits": "PolitiDex is compiling this official’s voting record.",
   "campaign": "PolitiDex is compiling this official’s voting record.",
   "dataCenters": "N/A",
   "healthcare": "PolitiDex is compiling this official’s voting record.",
   "audit": "N/A — state-level office"
  }
 },
 "harper_s16": {
  "bio": "Wayne Harper is a West Jordan–area Republican and one of the longest-serving figures in Utah politics, having entered the House in 1997 before moving to the Senate in 2013. Over that span he has become the Legislature's resident authority on transportation and tax policy, chairing transportation work and earning a national reputation on sales-tax and streamlined-tax issues. He has had a hand in nearly every major road, transit, and infrastructure funding package the state has passed in a generation, making him a quiet but central player in how a fast-growing Utah moves people and goods.",
  "stances": {
   "border": "PolitiDex is compiling this official’s voting record.",
   "debt": "PolitiDex is compiling this official’s voting record.",
   "gun": "PolitiDex is compiling this official’s voting record.",
   "termLimits": "PolitiDex is compiling this official’s voting record.",
   "campaign": "PolitiDex is compiling this official’s voting record.",
   "dataCenters": "N/A",
   "healthcare": "PolitiDex is compiling this official’s voting record.",
   "audit": "N/A — state-level office"
  }
 },
 "cullimore_s19": {
  "bio": "Kirk Cullimore is a Sandy attorney who serves in Senate Republican leadership and has become a key player on technology and consumer-protection law. He was a lead Senate sponsor of Utah's pioneering laws restricting minors' use of social media and requiring parental consent — measures that put the state at the front of a national movement and drew immediate legal challenges from the tech industry. He balances that high-profile tech work with bread-and-butter judiciary, landlord-tenant, and consumer-finance legislation drawn from his legal practice.",
  "stances": {
   "border": "PolitiDex is compiling this official’s voting record.",
   "debt": "PolitiDex is compiling this official’s voting record.",
   "gun": "PolitiDex is compiling this official’s voting record.",
   "termLimits": "PolitiDex is compiling this official’s voting record.",
   "campaign": "PolitiDex is compiling this official’s voting record.",
   "dataCenters": "N/A",
   "healthcare": "PolitiDex is compiling this official’s voting record.",
   "audit": "N/A — state-level office"
  }
 },
 "mckell_s25": {
  "bio": "Mike McKell is a Spanish Fork trial attorney who moved from the Utah House to the Senate and has become a central figure in the state's effort to regulate social media's effect on young people. Alongside Senate colleagues he sponsored Utah's first-in-the-nation laws limiting minors' social-media use and requiring age verification and default privacy protections — legislation that has been copied, challenged, and revised. His legal background also makes him a leading voice on civil-justice, mental-health, and consumer-protection matters before the Legislature.",
  "stances": {
   "border": "PolitiDex is compiling this official’s voting record.",
   "debt": "PolitiDex is compiling this official’s voting record.",
   "gun": "PolitiDex is compiling this official’s voting record.",
   "termLimits": "PolitiDex is compiling this official’s voting record.",
   "campaign": "PolitiDex is compiling this official’s voting record.",
   "dataCenters": "N/A",
   "healthcare": "PolitiDex is compiling this official’s voting record.",
   "audit": "N/A — state-level office"
  }
 },
 "brammer_s21": {
  "bio": "Brady Brammer is a Utah County Republican and attorney who served in the Utah House before winning election to Senate District 21 in 2024. With a law degree and a master's in public administration and years representing cities, school districts, and businesses in government-law disputes, he has become one of the Legislature's go-to members on technology and liability policy. He was the sponsor of a high-profile law requiring social-media platforms to disclose their content-moderation rules and give Utah users notice and an appeals process — part of Utah's broader push to regulate big tech that has drawn both national attention and constitutional challenges.",
  "stances": {
   "border": "PolitiDex is compiling this official’s voting record.",
   "debt": "PolitiDex is compiling this official’s voting record.",
   "gun": "PolitiDex is compiling this official’s voting record.",
   "termLimits": "PolitiDex is compiling this official’s voting record.",
   "campaign": "PolitiDex is compiling this official’s voting record.",
   "dataCenters": "N/A",
   "healthcare": "PolitiDex is compiling this official’s voting record.",
   "audit": "N/A — state-level office"
  }
 },
 "hollins_h24": {
  "bio": "Sandra Hollins is a licensed clinical social worker who in 2015 became the first Black woman ever elected to the Utah Legislature, representing the diverse Rose Park and Glendale neighborhoods of west Salt Lake City. Her frontline experience working with people experiencing homelessness and addiction shapes a policy focus on housing, treatment, and equity. She drew national attention for sponsoring a 2020 resolution declaring racism a public-health crisis and has been a steady advocate for criminal-justice reform and services for Utah's most vulnerable residents.",
  "stances": {
   "border": "PolitiDex is compiling this official’s voting record.",
   "debt": "PolitiDex is compiling this official’s voting record.",
   "gun": "PolitiDex is compiling this official’s voting record.",
   "termLimits": "PolitiDex is compiling this official’s voting record.",
   "campaign": "PolitiDex is compiling this official’s voting record.",
   "dataCenters": "N/A",
   "healthcare": "PolitiDex is compiling this official’s voting record.",
   "audit": "N/A — state-level office"
  }
 },
 "fitisemanu_h30": {
  "bio": "Jake Fitisemanu is a public-health professional and one of the first Pacific Islanders elected to the Utah Legislature, winning a competitive West Valley City seat in 2024. A longtime advocate for Utah's Tongan, Samoan, and broader AAPI communities, he has worked on health-data disaggregation so that smaller populations are not invisible in state statistics. He brings clinical and community-health credentials to debates over cost of living, healthcare access, and education in one of Utah's most diverse and working-class districts.",
  "stances": {
   "border": "PolitiDex is compiling this official’s voting record.",
   "debt": "PolitiDex is compiling this official’s voting record.",
   "gun": "PolitiDex is compiling this official’s voting record.",
   "termLimits": "PolitiDex is compiling this official’s voting record.",
   "campaign": "PolitiDex is compiling this official’s voting record.",
   "dataCenters": "N/A",
   "healthcare": "PolitiDex is compiling this official’s voting record.",
   "audit": "N/A — state-level office"
  }
 },
 "eliason_h45": {
  "bio": "Steve Eliason is a Sandy Republican and certified public accountant who has represented the south Salt Lake Valley in the House since 2011, where he has built one of the most focused records in the Legislature on mental health and suicide prevention. He sponsored the legislation behind Utah's SafeUT crisis app, helped stand up funding for the statewide crisis line that became part of the national 988 system, and has repeatedly carried bills on school counselors, safe firearm storage, and youth behavioral health. In a deeply conservative caucus he has shown that suicide prevention can be a bipartisan, data-driven priority, and his work is frequently cited as a model by other states.",
  "stances": {
   "border": "PolitiDex is compiling this official’s voting record.",
   "debt": "PolitiDex is compiling this official’s voting record.",
   "gun": "PolitiDex is compiling this official’s voting record.",
   "termLimits": "PolitiDex is compiling this official’s voting record.",
   "campaign": "PolitiDex is compiling this official’s voting record.",
   "dataCenters": "N/A",
   "healthcare": "PolitiDex is compiling this official’s voting record.",
   "audit": "N/A — state-level office"
  }
 },
 "ivory_h39": {
  "bio": "Ken Ivory is a West Jordan Republican who has served in the Utah House since 2011, with a brief 2019-2021 gap, and is the country's most persistent advocate for transferring federal public lands to state control. In 2012 he sponsored the Transfer of Public Lands Act (HB 148), which demanded the federal government cede roughly 30 million acres to Utah, and he founded and led the American Lands Council to spread the idea to other Western states. The crusade has reshaped the West's land debate but has not delivered actual transfers — the lands remain federal — and his dual role writing legislation while leading the advocacy group drew conflict-of-interest complaints. He continues to press public-lands, property-rights, and states'-rights legislation.",
  "stances": {
   "border": "PolitiDex is compiling this official’s voting record.",
   "debt": "PolitiDex is compiling this official’s voting record.",
   "gun": "PolitiDex is compiling this official’s voting record.",
   "termLimits": "PolitiDex is compiling this official’s voting record.",
   "campaign": "PolitiDex is compiling this official’s voting record.",
   "dataCenters": "N/A",
   "healthcare": "PolitiDex is compiling this official’s voting record.",
   "audit": "N/A — state-level office"
  }
 },
 "teuscher_h44": {
  "bio": "Jordan Teuscher is a South Jordan attorney elected to the Utah House in 2020 who has climbed into House leadership and chaired influential business and judiciary committees. He gained national attention as a lead author of Utah's social-media accountability laws — including the Utah Social Media Regulation Act (HB 311), which makes platforms liable for harms caused to minors by addictive design, and HB 464, which created a private right of action letting parents sue over algorithmic harm and required limits on minors' nighttime and overall use. He pairs that high-profile tech work with a steady portfolio of business-law, property, and housing bills reflecting his legal practice.",
  "stances": {
   "border": "PolitiDex is compiling this official’s voting record.",
   "debt": "PolitiDex is compiling this official’s voting record.",
   "gun": "PolitiDex is compiling this official’s voting record.",
   "termLimits": "PolitiDex is compiling this official’s voting record.",
   "campaign": "PolitiDex is compiling this official’s voting record.",
   "dataCenters": "N/A",
   "healthcare": "PolitiDex is compiling this official’s voting record.",
   "audit": "N/A — state-level office"
  }
 },
 "valpeterson_h56": {
  "bio": "Val Peterson is an Orem Republican who has represented Utah County in the House since 2011 and holds an unusual dual role: he is also a vice president of administration at Utah Valley University, the largest public university in the state. That gives him an insider's view of the higher-education budgets he helps write, and he has spent much of his tenure on the appropriations subcommittees that fund colleges, capital buildings, and workforce programs. A steady, behind-the-scenes operator rather than a headline-seeker, Peterson is known for shepherding building projects and enrollment-growth funding for fast-expanding Utah County campuses.",
  "stances": {
   "border": "PolitiDex is compiling this official’s voting record.",
   "debt": "PolitiDex is compiling this official’s voting record.",
   "gun": "PolitiDex is compiling this official’s voting record.",
   "termLimits": "PolitiDex is compiling this official’s voting record.",
   "campaign": "PolitiDex is compiling this official’s voting record.",
   "dataCenters": "N/A",
   "healthcare": "PolitiDex is compiling this official’s voting record.",
   "audit": "N/A — state-level office"
  }
 },
 "gricius_h50": {
  "bio": "Stephanie Gricius is a small-business owner and Republican from fast-growing Eagle Mountain, elected to the Utah House in 2022. She has become an early state-level voice on artificial intelligence, working on disclosure and accountability requirements for AI used in mental-health and consumer contexts as Utah positions itself as a national testing ground for AI policy. She combines that forward-looking tech focus with conservative priorities on parental rights and medical-freedom legislation, representing one of the youngest and fastest-changing districts in the state.",
  "stances": {
   "border": "PolitiDex is compiling this official’s voting record.",
   "debt": "PolitiDex is compiling this official’s voting record.",
   "gun": "PolitiDex is compiling this official’s voting record.",
   "termLimits": "PolitiDex is compiling this official’s voting record.",
   "campaign": "PolitiDex is compiling this official’s voting record.",
   "dataCenters": "N/A",
   "healthcare": "PolitiDex is compiling this official’s voting record.",
   "audit": "N/A — state-level office"
  }
 },
 "snider_h5": {
  "bio": "Casey Snider is a Paradise (Cache County) Republican with a professional background in conservation and natural-resource management who has represented rural northern Utah in the House since 2018. In June 2025 his colleagues elected him House Majority Leader, the chamber's number-two job, after Jefferson Moss resigned to take a state cabinet post — a promotion that gives Snider a major hand in setting the entire House agenda. He had already become one of the Legislature's leading voices on the issues defining Utah's environment debate — saving the shrinking Great Salt Lake, managing scarce water for agriculture and cities, wildlife policy, and the state's long-running push to control federal public lands — balancing ranching and rural interests against the mounting pressure to keep water flowing to the lake and to a fast-growing Wasatch Front.",
  "stances": {
   "border": "PolitiDex is compiling this official’s voting record.",
   "debt": "PolitiDex is compiling this official’s voting record.",
   "gun": "PolitiDex is compiling this official’s voting record.",
   "termLimits": "PolitiDex is compiling this official’s voting record.",
   "campaign": "PolitiDex is compiling this official’s voting record.",
   "dataCenters": "N/A",
   "healthcare": "PolitiDex is compiling this official’s voting record.",
   "audit": "N/A — state-level office"
  }
 },
 "bolinder_h68": {
  "bio": "Bridger Bolinder is a Grantsville Republican who represents Tooele County, one of the fastest-growing parts of Utah as the Salt Lake region spills west. Re-elected comfortably in 2024 and previously a committee chair, he was elevated to House Majority Assistant Whip in the June 2025 special leadership election that followed Majority Leader Jefferson Moss's resignation. His agenda reflects a district straddling agriculture and rapid suburban expansion — balancing growth pressures, water demand, and public-safety needs in communities that are changing quickly.",
  "stances": {
   "border": "PolitiDex is compiling this official’s voting record.",
   "debt": "PolitiDex is compiling this official’s voting record.",
   "gun": "PolitiDex is compiling this official’s voting record.",
   "termLimits": "PolitiDex is compiling this official’s voting record.",
   "campaign": "PolitiDex is compiling this official’s voting record.",
   "dataCenters": "N/A",
   "healthcare": "PolitiDex is compiling this official’s voting record.",
   "audit": "N/A — state-level office"
  }
 },
 "lisonbee_h14": {
  "bio": "Karianne Lisonbee is a Davis County Republican who has served in the Utah House since 2017 after a stint on the Syracuse City Council, and she chairs the powerful House Judiciary Committee. She is best known statewide as the House sponsor of Utah's 2020 abortion 'trigger law,' a near-total ban that took effect when Roe v. Wade was overturned, and as the author of follow-on restrictions such as 2023's HB 467, which sought to move abortions into hospitals and close licensed clinics. She served in House Republican leadership as whip and assistant whip from 2022 to 2025, but after losing a June 2025 race for majority leader to Casey Snider she left leadership and announced she would not seek another House term — instead launching a 2026 campaign for Utah's 2nd Congressional District.",
  "stances": {
   "border": "PolitiDex is compiling this official’s voting record.",
   "debt": "PolitiDex is compiling this official’s voting record.",
   "gun": "PolitiDex is compiling this official’s voting record.",
   "termLimits": "PolitiDex is compiling this official’s voting record.",
   "campaign": "PolitiDex is compiling this official’s voting record.",
   "dataCenters": "N/A",
   "healthcare": "PolitiDex is compiling this official’s voting record.",
   "audit": "N/A — state-level office"
  }
 },
 "hall_h11": {
  "bio": "Katy Hall is a South Ogden Republican elected in 2020 who became a nationally noticed figure as the House sponsor of Utah's 2024 Equal Opportunity Initiatives law, which dismantled diversity, equity, and inclusion offices and programs at public universities and government agencies. She framed the measure as restoring merit-based, identity-neutral treatment, and Utah's version became an early template that several other red states studied. Beyond that signature fight she works on tax, education, and workforce issues for her Weber and Davis County constituents.",
  "stances": {
   "border": "PolitiDex is compiling this official’s voting record.",
   "debt": "PolitiDex is compiling this official’s voting record.",
   "gun": "PolitiDex is compiling this official’s voting record.",
   "termLimits": "PolitiDex is compiling this official’s voting record.",
   "campaign": "PolitiDex is compiling this official’s voting record.",
   "dataCenters": "N/A",
   "healthcare": "PolitiDex is compiling this official’s voting record.",
   "audit": "N/A — state-level office"
  }
 },
 "defay_h15": {
  "bio": "Ariel Defay is a Layton Republican who has represented Utah House District 15 since November 2023, when she was selected to fill the seat left open by longtime Speaker Brad Wilson. She won a full term in 2024 with about 76% of the vote and serves on appropriations subcommittees covering education, transportation, and economic and community development. Defay holds a bachelor’s in political science from Utah State University and a Master of Public Administration from Ohio University, and worked on statewide campaigns before her own service. Early in her legislative career, her tracked record is still being built, but she has already moved a string of bills into law — floor-sponsoring 2025 legislation tightening Utah’s age rules around the marriage of minors, and chief-sponsoring 2026 measures on classroom technology, dyslexia screening, paid family leave, and child-protection.",
  "stances": {
   "border": "PolitiDex is compiling this official’s voting record.",
   "debt": "PolitiDex is compiling this official’s voting record.",
   "gun": "PolitiDex is compiling this official’s voting record.",
   "termLimits": "PolitiDex is compiling this official’s voting record.",
   "campaign": "PolitiDex is compiling this official’s voting record.",
   "dataCenters": "N/A",
   "healthcare": "PolitiDex is compiling this official’s voting record.",
   "audit": "N/A — state-level office"
  }
 },
 "koford_h10": {
  "bio": "Jill Koford is a South Ogden Republican who won Utah House District 10 in 2024, narrowly defeating Democratic incumbent Rosemary Lesser in what was the closest of the state’s 75 House races and returning the Weber County seat to Republican hands. A small-business owner, former educator, and instrument-rated private pilot, she took office in January 2025 and focuses on the bread-and-butter concerns of her east-Ogden district.",
  "stances": {
   "border": "PolitiDex is compiling this official’s voting record.",
   "debt": "PolitiDex is compiling this official’s voting record.",
   "gun": "PolitiDex is compiling this official’s voting record.",
   "termLimits": "PolitiDex is compiling this official’s voting record.",
   "campaign": "PolitiDex is compiling this official’s voting record.",
   "dataCenters": "N/A",
   "healthcare": "PolitiDex is compiling this official’s voting record.",
   "audit": "N/A — state-level office"
  }
 },
 "cory_maloy_h52": {
  "bio": "Cory Maloy is a Lehi Republican who has represented his fast-growing northern Utah County district since 2017. A communications and public-relations professional with a degree from Brigham Young University, he is known as a reliably conservative voice on public-safety and Second Amendment issues and is seeking re-election in 2026. (Not to be confused with U.S. Rep. Celeste Maloy, who represents Utah’s 2nd Congressional District.)",
  "stances": {
   "border": "PolitiDex is compiling this official’s voting record.",
   "debt": "PolitiDex is compiling this official’s voting record.",
   "gun": "PolitiDex is compiling this official’s voting record.",
   "termLimits": "PolitiDex is compiling this official’s voting record.",
   "campaign": "PolitiDex is compiling this official’s voting record.",
   "dataCenters": "N/A",
   "healthcare": "PolitiDex is compiling this official’s voting record.",
   "audit": "N/A — state-level office"
  }
 },
 "whyte_h63": {
  "bio": "Stephen L. Whyte is a south Utah County Republican who first entered the Utah House in late 2021 and has represented District 63 — anchored by Spanish Fork and Salem — since the 2023 redistricting cycle. He works on the agriculture, water, and growth issues that define his rapidly suburbanizing district at the south end of Utah Valley.",
  "stances": {
   "border": "PolitiDex is compiling this official’s voting record.",
   "debt": "PolitiDex is compiling this official’s voting record.",
   "gun": "PolitiDex is compiling this official’s voting record.",
   "termLimits": "PolitiDex is compiling this official’s voting record.",
   "campaign": "PolitiDex is compiling this official’s voting record.",
   "dataCenters": "N/A",
   "healthcare": "PolitiDex is compiling this official’s voting record.",
   "audit": "N/A — state-level office"
  }
 },
 "gwynn_h6": {
  "bio": "Matthew Gwynn is a Republican who has served in the Utah House since 2021 and represents District 6, which spans portions of Box Elder and Weber counties. A career law-enforcement officer, he brings a public-safety focus to his work at the Capitol while representing a largely rural and small-town northern Utah district.",
  "stances": {
   "border": "PolitiDex is compiling this official’s voting record.",
   "debt": "PolitiDex is compiling this official’s voting record.",
   "gun": "PolitiDex is compiling this official’s voting record.",
   "termLimits": "PolitiDex is compiling this official’s voting record.",
   "campaign": "PolitiDex is compiling this official’s voting record.",
   "dataCenters": "N/A",
   "healthcare": "PolitiDex is compiling this official’s voting record.",
   "audit": "N/A — state-level office"
  }
 },
 "auxier_h4": {
  "bio": "Tiara Auxier is a Morgan County Republican appointed in January 2025 to represent Utah House District 4, a large northern-Utah seat covering Morgan and Rich counties and most of Summit County. She filled the vacancy created when Rep. Kera Birkeland resigned shortly after winning re-election. Auxier has emphasized keeping land-use and zoning decisions in local hands and easing the property-tax pressure facing her growing rural and mountain communities.",
  "stances": {
   "border": "PolitiDex is compiling this official’s voting record.",
   "debt": "PolitiDex is compiling this official’s voting record.",
   "gun": "PolitiDex is compiling this official’s voting record.",
   "termLimits": "PolitiDex is compiling this official’s voting record.",
   "campaign": "PolitiDex is compiling this official’s voting record.",
   "dataCenters": "N/A",
   "healthcare": "PolitiDex is compiling this official’s voting record.",
   "audit": "N/A — state-level office"
  }
 },
 "kohler_h59": {
  "bio": "Mike Kohler is a Wasatch County Republican who has represented Utah House District 59 — covering Wasatch and Summit counties around Heber City — since 2021. A longtime farmer and former Wasatch County commissioner who managed the Midway Irrigation Company, he focuses on water, agriculture, and the growth pressures reshaping the Heber Valley. Kohler has announced he will not seek re-election in 2026.",
  "stances": {
   "border": "PolitiDex is compiling this official’s voting record.",
   "debt": "PolitiDex is compiling this official’s voting record.",
   "gun": "PolitiDex is compiling this official’s voting record.",
   "termLimits": "PolitiDex is compiling this official’s voting record.",
   "campaign": "PolitiDex is compiling this official’s voting record.",
   "dataCenters": "N/A",
   "healthcare": "PolitiDex is compiling this official’s voting record.",
   "audit": "N/A — state-level office"
  }
 },
 "shelley_h66": {
  "bio": "Troy Shelley is an Ephraim Republican who took office in January 2025 representing Utah House District 66, a central-Utah seat spanning Sanpete, Juab, and part of Utah County. The former chair of the Sanpete County Republican Party, he ran unopposed in 2024 to succeed retiring Rep. Steven Lund and works on the agricultural and rural-community issues central to his district.",
  "stances": {
   "border": "PolitiDex is compiling this official’s voting record.",
   "debt": "PolitiDex is compiling this official’s voting record.",
   "gun": "PolitiDex is compiling this official’s voting record.",
   "termLimits": "PolitiDex is compiling this official’s voting record.",
   "campaign": "PolitiDex is compiling this official’s voting record.",
   "dataCenters": "N/A",
   "healthcare": "PolitiDex is compiling this official’s voting record.",
   "audit": "N/A — state-level office"
  }
 },
 "chew_h68": {
  "bio": "Scott Chew is a Uintah Basin rancher who has served in the Utah House since 2015, representing the old District 55 through 2023 and District 68 — covering Uintah and Duchesne counties around Vernal — since the latest redistricting. A lifelong cattleman who operates the Chew Ranch family operation, he is a leading voice on agriculture, energy, and public-lands policy for rural eastern Utah.",
  "stances": {
   "border": "PolitiDex is compiling this official’s voting record.",
   "debt": "PolitiDex is compiling this official’s voting record.",
   "gun": "PolitiDex is compiling this official’s voting record.",
   "termLimits": "PolitiDex is compiling this official’s voting record.",
   "campaign": "PolitiDex is compiling this official’s voting record.",
   "dataCenters": "N/A",
   "healthcare": "PolitiDex is compiling this official’s voting record.",
   "audit": "N/A — state-level office"
  }
 },
 "biden": {
  "stances": {
   "border": "Sent immigration reform to Congress Day 1 — never voted on. Border encounters surged ❌",
   "debt": "Signed IRA and infrastructure — added ~$4T to national debt",
   "gun": "Signed Bipartisan Safer Communities Act — first major gun law in 30 years ✓",
   "termLimits": "No formal position",
   "campaign": "Pledged to reject Super PAC support — did not fully follow through",
   "dataCenters": "N/A",
   "healthcare": "Expanded ACA subsidies via IRA; attempted public option — not enacted",
   "audit": "N/A — executive office"
  }
 },
 "obama": {
  "stances": {
   "border": "DACA executive action (2012) — comprehensive reform never passed ❌",
   "debt": "Inherited $1.4T deficit; reduced to $585B by FY2016 but added $8.6T total debt",
   "gun": "Attempted gun control after Sandy Hook — failed in Senate ❌",
   "termLimits": "No formal position",
   "campaign": "Pledged to reduce Super PAC influence — limited action",
   "dataCenters": "N/A",
   "healthcare": "ACA signed 2010 — 20M+ covered; \"keep your doctor\" rated Lie of Year 2013 ❌",
   "audit": "N/A — executive office"
  }
 },
 "gwbush": {
  "stances": {
   "border": "Proposed comprehensive reform 2006–2007 — died in Senate ❌",
   "debt": "Turned $236B surplus into $1.2T deficit by 2009 ❌",
   "gun": "Allowed 1994 Assault Weapons Ban to expire in 2004",
   "termLimits": "No formal position",
   "campaign": "No significant campaign finance reform",
   "dataCenters": "N/A",
   "healthcare": "Created Medicare Part D (2003) — largest Medicare expansion since creation ✓",
   "audit": "N/A — executive office"
  }
 },
 "rfkjr": {
  "stances": {
   "border": "No formal position on border policy",
   "debt": "No formal fiscal position",
   "gun": "Shifted from supporting gun control to opposing it during 2024 campaign",
   "termLimits": "Supports term limits in principle",
   "campaign": "Ran as independent; endorsed Trump after suspending",
   "dataCenters": "N/A",
   "healthcare": "Pledged to overhaul FDA, remove fluoride, reform dietary guidelines — all pending",
   "audit": "N/A — executive office"
  }
 },
 "sanders": {
  "stances": {
   "border": "Supports path to citizenship; voted for 2013 bipartisan reform",
   "debt": "Supports deficit spending for social programs; opposed tax cuts for wealthy",
   "gun": "Mixed record — voted against Brady Bill 5x, later supported background checks",
   "termLimits": "No formal position — has served 30+ years in Congress",
   "campaign": "Never accepted corporate PAC money — small-dollar funded ✓",
   "dataCenters": "N/A",
   "healthcare": "Medicare for All champion — bill never reached floor vote ❌",
   "audit": "Co-sponsored Audit the Fed with Rand Paul"
  }
 },
 "nhaley": {
  "stances": {
   "border": "Supports border security; criticized Trump and Biden on enforcement",
   "debt": "Pledged fiscal discipline — SC debt increased under her tenure ❌",
   "gun": "Supports Second Amendment; signed SC concealed carry expansion",
   "termLimits": "Strong advocate — pledged mental competency tests for 75+",
   "campaign": "Called for generational change; eventually endorsed Trump",
   "dataCenters": "N/A",
   "healthcare": "Opposed ACA as Governor; supported market-based alternatives",
   "audit": "N/A — no current office"
  }
 },
 "dballard": {
  "stances": {
   "border": "Supports comprehensive immigration reform",
   "debt": "Pledged to reduce military waste",
   "gun": "Supports responsible ownership",
   "termLimits": "Supports term limits",
   "campaign": "Pledged small-dollar only",
   "dataCenters": "N/A",
   "healthcare": "Supports rural healthcare expansion",
   "audit": "Supports government transparency"
  }
 },
 "jjohnson": {
  "stances": {
   "border": "Supports path to citizenship with enforcement",
   "debt": "Supports responsible fiscal policy",
   "gun": "Supports universal background checks",
   "termLimits": "Supports term limits",
   "campaign": "Small-dollar funded",
   "dataCenters": "N/A",
   "healthcare": "Supports ACA expansion",
   "audit": "Supports fiscal transparency"
  }
 },
 "jknotts": {
  "stances": {
   "border": "Moderate position",
   "debt": "Supports balanced budgets",
   "gun": "Supports responsible ownership",
   "termLimits": "No formal position",
   "campaign": "No formal position",
   "dataCenters": "N/A",
   "healthcare": "Focus on environmental and tourism policy",
   "audit": "N/A"
  }
 },
 "fgibson": {
  "stances": {
   "border": "Supports state enforcement cooperation",
   "debt": "Supports income tax reduction",
   "gun": "Supports constitutional carry",
   "termLimits": "No formal position",
   "campaign": "No formal position",
   "dataCenters": "N/A",
   "healthcare": "Focus on education and economic development",
   "audit": "N/A"
  }
 },
 "jdougall": {
  "stances": {
   "border": "N/A — focuses on auditing",
   "debt": "Champions fiscal accountability",
   "gun": "N/A — focuses on auditing",
   "termLimits": "No formal position",
   "campaign": "No formal position",
   "dataCenters": "Flagged data center incentive accounting concerns",
   "healthcare": "N/A — focuses on auditing",
   "audit": "State auditor — champions government transparency"
  }
 },
 "limon_ca": { "bio": "Monique Limón is a Democratic California state senator representing the Santa Barbara–Ventura coast (District 19) and the Senate's incoming President pro Tempore for 2026. A former chair of the Banking and Financial Institutions Committee, she is known for work on consumer financial protection." },
 "mike_mcguire": { "bio": "Mike McGuire is a Democratic California state senator for the North Coast (District 2) who served as Senate President pro Tempore from 2024 to 2025. Termed out of the Senate, he is running for the U.S. House in California's 1st District." },
 "wiener_ca": { "bio": "Scott Wiener is a Democratic California state senator from San Francisco (District 11), known nationally for pro-housing 'YIMBY' laws, public-transit funding, and SB 1047 — a landmark AI-safety bill the Legislature passed in 2024 before Gov. Newsom vetoed it." },
 "bjones_ca": { "bio": "Brian Jones is a Republican California state senator from East San Diego County (District 40) and the Senate Republican Leader, focused on cost of living, taxes, and public safety." },
 "bryan_hughes": { "bio": "Bryan Hughes is a Republican Texas state senator from Northeast Texas (District 1) and chair of the Senate State Affairs Committee. He authored Senate Bill 8, the 2021 'Heartbeat Act,' and Senate Bill 1, the 2021 election law." },
 "bettencourt_tx": { "bio": "Paul Bettencourt is a Republican Texas state senator from Houston (District 7), a former Harris County Tax Assessor-Collector known as the Senate's lead voice on property-tax cuts, and the 2026 chair of the Higher Education Committee." },
 "paxton_tx": { "bio": "Angela Paxton is a Republican Texas state senator from Collin County (District 8) and the 2026 chair of the Economic Development Committee. A former school counselor, she filed for divorce from Texas Attorney General Ken Paxton in 2025." },
 "gutierrez_tx": { "bio": "Roland Gutiérrez is a Democratic Texas state senator from San Antonio (District 19) who represents Uvalde and became a prominent gun-safety advocate after the 2022 Robb Elementary shooting; he ran for U.S. Senate in 2024." },
 "stewart_cousins": { "bio": "Andrea Stewart-Cousins is a Democratic New York state senator from Yonkers (District 35) and, since 2019, Senate Majority Leader — the first woman to lead a legislative conference in New York State history." },
 "gianaris_ny": { "bio": "Michael Gianaris is a Democratic New York state senator from Queens (District 12) and Deputy Majority Leader who led the 2019 opposition to Amazon's HQ2 and helped write the state's bail-reform law. He plans to retire at the end of 2026." },
 "ortt_ny": { "bio": "Rob Ortt is a Republican New York state senator from western New York (District 62) and, since 2020, Senate Minority Leader, focused on affordability, taxes, and public safety." },
 "ben_albritton": { "bio": "Ben Albritton is a Republican Florida state senator from Wauchula (District 27) and, since November 2024, President of the Florida Senate. A citrus grower, he has centered agriculture and rural Florida." },
 "pizzo_fl": { "bio": "Jason Pizzo is a Florida state senator representing parts of Miami-Dade and Broward (District 37). The former Senate Democratic Leader, he left the Democratic Party in 2025 to register with no party affiliation and is running for Governor in 2026 as an independent." },
 "passidomo_fl": { "bio": "Kathleen Passidomo is a Republican Florida state senator from Naples (District 28) who served as Senate President from 2022 to 2024 and championed the 2023 'Live Local Act' on affordable and workforce housing." },
 "kim_ward": { "bio": "Kim Ward is a Republican Pennsylvania state senator from Westmoreland County (District 39) and, since 2022, President pro Tempore of the Senate — the first woman to hold the chamber's top post. She previously served as the first woman to lead a PA Senate caucus as Majority Leader." },
 "jay_costa": { "bio": "Jay Costa is a Democratic Pennsylvania state senator from Allegheny County (District 43) and, since 2011, the Senate Democratic (Minority) Leader — the longest-serving current floor leader in the chamber." },
 "don_harmon": { "bio": "Don Harmon is a Democratic Illinois state senator from Oak Park (District 39) and President of the Illinois Senate since 2020. In 2025 he faced a nearly $10 million campaign-finance penalty over $4 million his campaign accepted above the limits; the State Board of Elections deadlocked and the case was dropped." },
 "rob_mccolley": { "bio": "Rob McColley is a Republican Ohio state senator from Napoleon (District 1) and President of the Ohio Senate since January 2025. In 2026 he was tapped as Vivek Ramaswamy's running mate for lieutenant governor in the Ohio governor's race." },
 "joe_pittman": { "bio": "Joe Pittman is a Republican Pennsylvania state senator from Indiana County (District 41) and, since 2022, Senate Majority Leader — a lead budget negotiator with Democratic Gov. Josh Shapiro, focused on energy production and spending restraint." },
 "doug_mastriano": { "bio": "Doug Mastriano is a Republican Pennsylvania state senator for District 33 (Franklin/Adams). A leading promoter of false 2020 election-fraud claims who was outside the U.S. Capitol on Jan. 6, 2021, he was the 2022 GOP nominee for governor and lost to Josh Shapiro by about 15 points." },
 "sharif_street": { "bio": "Sharif Street is a Democratic Pennsylvania state senator from Philadelphia (District 3) who also chairs the Pennsylvania Democratic Party. The son of former Philadelphia Mayor John Street, he is a lead sponsor of adult-use cannabis legalization and criminal-justice reform." },
 "kimberly_lightford": { "bio": "Kimberly Lightford is a Democratic Illinois state senator from Chicago's west suburbs (District 4) and Senate Majority Leader since 2019. A lead sponsor of the SAFE-T Act ending cash bail and of the $15 minimum wage, she has served since 1998." },
 "john_curran_il": { "bio": "John Curran is a Republican Illinois state senator from DuPage County (District 41) and, since 2023, Senate Minority Leader. A former prosecutor, he is a leading critic of the no-cash-bail SAFE-T Act and an advocate for ethics reform." },
 "robert_peters_il": { "bio": "Robert Peters is a Democratic Illinois state senator from Chicago (District 13) and a progressive organizer who helped pass the SAFE-T Act. He is running for the U.S. House in Illinois's 2nd District in 2026 with labor backing." },
 "theresa_gavarone": { "bio": "Theresa Gavarone is a Republican Ohio state senator from northwest Ohio (District 2) and, since 2025, Senate Majority Leader. She sponsored Ohio's stricter photo voter-ID law and backs tax and affordability measures." },
 "nickie_antonio": { "bio": "Nickie Antonio is a Democratic Ohio state senator from the Cleveland area (District 23) and, since 2023, Senate Minority Leader. She was the first openly LGBTQ person elected to the Ohio General Assembly and the first woman to lead the Senate Democratic caucus." },
 "winnie_brinks": { "bio": "Winnie Brinks is a Democratic Michigan state senator from Grand Rapids (District 29) and, since 2023, Senate Majority Leader — the first woman ever to hold the post and the first Democrat to lead the chamber since 1984." },
 "phil_berger": { "bio": "Phil Berger is a Republican North Carolina state senator (District 26) who has served as President pro Tempore since 2011, making him one of the most powerful figures in state government. In March 2026 he narrowly conceded his primary to Rockingham County Sheriff Sam Page, unsettling the chamber's power structure." },
 "mallory_mcmorrow": { "bio": "Mallory McMorrow is a Democratic Michigan state senator from Oakland County (District 8) and Senate Majority Whip. She drew national attention for a viral 2022 floor speech rebutting attacks on her, and launched a high-profile 2026 U.S. Senate bid for Gary Peters's open seat before suspending it." },
 "larry_walker_ga": { "bio": "Larry Walker III is a Republican Georgia state senator from Perry (District 20) who became President pro Tempore in January 2026, succeeding John Kennedy. He comes from a political family — his father was a longtime Georgia House majority leader." },
 "jason_anavitarte": { "bio": "Jason Anavitarte is a Republican Georgia state senator from the Dallas/Paulding area (District 31) and, since June 2025, Senate Majority Leader. Of Puerto Rican descent, he is the lead sponsor of Georgia's law requiring parental consent for minors' social-media accounts." },
 "harold_jones_ga": { "bio": "Harold Jones II is a Democratic Georgia state senator from Augusta (District 22) and the Senate Democratic (Minority) Leader. A criminal-defense attorney, he focuses on criminal-justice reform and Medicaid expansion." },
 "michael_lee_nc": { "bio": "Michael Lee is a Republican North Carolina state senator from Wilmington (District 7) and Senate Majority Leader, an attorney who is one of the chamber's lead education and budget writers and an architect of the state's private-school voucher expansion." },
 "sydney_batch": { "bio": "Sydney Batch is a Democratic North Carolina state senator from Wake County (District 17) and, since 2025, Senate Democratic (Minority) Leader. An attorney, social worker, and breast-cancer survivor, she led opposition to the 2023 12-week abortion ban." },
 "ralph_hise": { "bio": "Ralph Hise is a Republican North Carolina state senator from Mitchell County (District 47) and Deputy President pro Tempore. A close Berger ally and lead architect of the state's redistricting maps, he has been named a possible successor as Senate leader." },
 "aric_nesbitt": { "bio": "Aric Nesbitt is a Republican Michigan state senator from southwest Michigan (District 20) and Senate Minority Leader, and a candidate for the Republican gubernatorial nomination in 2026. He opposed the state's 100% clean-energy mandate and pushes tax relief." },
 "jeremy_moss": { "bio": "Jeremy Moss is a Democratic Michigan state senator from Southfield (District 7) and Senate President pro Tempore — the first openly gay member of the Michigan Senate. He sponsored the 2023 expansion of the state civil-rights act and leads on government transparency." },
 "nicholas_scutari": { "bio": "Nicholas Scutari is a Democratic New Jersey state senator (District 22) who has served as Senate President since 2022 and was reelected to a third term for the 2026-27 session. A municipal prosecutor, he was the lead sponsor of New Jersey's marijuana-legalization law." },
 "warren_petersen": { "bio": "Warren Petersen is a Republican Arizona state senator from Gilbert (District 14) who has served as Senate President since 2023. He filed to run for Arizona attorney general in 2026." },
 "teresa_ruiz": { "bio": "Teresa Ruiz is a Democratic New Jersey state senator from Newark (District 29) and Senate Majority Leader — the highest-ranking Latina in the history of the New Jersey Legislature. She led the expansion of state-funded preschool and the overhaul of teacher tenure." },
 "anthony_bucco": { "bio": "Anthony M. Bucco is a Republican New Jersey state senator from Morris County (District 25) and, since 2023, Senate Minority Leader. He centers property taxes, affordability, and public safety, and holds the seat once held by his late father." },
 "louise_lucas": { "bio": "Louise Lucas is a Democratic Virginia state senator from Portsmouth (District 18), President pro Tempore since 2020, and chair of the powerful Finance and Appropriations Committee — the first woman and first African American to lead the chamber. In May 2026 the FBI executed a criminal search warrant tied to her office; she had not been charged." },
 "scott_surovell": { "bio": "Scott Surovell is a Democratic Virginia state senator from Fairfax County (District 34) and, since 2024, Senate Majority Leader. A trial lawyer, he was a leading voice in Virginia's abolition of the death penalty and in clean-energy policy." },
 "ryan_mcdougle": { "bio": "Ryan McDougle is a Republican Virginia state senator from the Hanover County area (District 26) and, since 2024, Senate Minority Leader, focused on tax and spending restraint and opposition to expanded abortion access." },
 "priya_sundareshan": { "bio": "Priya Sundareshan is a Democratic Arizona state senator from Tucson (District 18) and, since 2025, Senate Minority Leader. An environmental and natural-resources attorney, she centers Arizona's water and drought crises and abortion rights." },
 "wendy_rogers": { "bio": "Wendy Rogers is a Republican Arizona state senator from northern Arizona (District 7). A prominent promoter of 2020 election-fraud claims, she was formally censured by the Arizona Senate in 2022 after a speech calling for political violence and over ties to white-nationalist figures." },
 "jake_hoffman": { "bio": "Jake Hoffman is a Republican Arizona state senator from Gilbert (District 15) who founded and chairs the Arizona Freedom Caucus. He was indicted in Arizona in 2024 as one of the Republicans who signed a false slate of 2020 presidential electors and has pleaded not guilty." },
 "jamie_pedersen": { "bio": "Jamie Pedersen is a Democratic Washington state senator from Seattle (District 43) and, since 2025, Senate Majority Leader. An attorney and one of the state's most senior openly gay lawmakers, he was a lead sponsor of Washington's marriage-equality law." },
 "john_braun": { "bio": "John Braun is a Republican Washington state senator from southwest Washington (District 20) and Senate Minority Leader since 2021. A business owner, he announced in 2025 that he would run for the U.S. House in Washington's 3rd District in 2026." },
 "manka_dhingra": { "bio": "Manka Dhingra is a Democratic Washington state senator from Redmond (District 45) and Deputy Majority Leader — the first South Asian American elected to the chamber. A senior King County prosecutor, she is the Legislature's leading voice on behavioral health and ran for state attorney general in 2024." },
 "karen_spilka": { "bio": "Karen Spilka is a Democratic Massachusetts state senator (Middlesex & Norfolk) who has served as Senate President since 2018, leading the chamber's Democratic supermajority with a focus on health care, mental health, and education funding." },
 "erin_murphy": { "bio": "Erin Murphy is a DFL Minnesota state senator from St. Paul and Senate Majority Leader. A nurse by training, she leads a caucus that has held the chamber by a single seat, and she publicly called on Sen. Nicole Mitchell to resign after Mitchell's 2025 felony burglary conviction." },
 "james_coleman": { "bio": "James Coleman is a Democratic Colorado state senator from Denver (District 33) who became President of the Colorado Senate in 2025, succeeding Steve Fenberg. He has focused on youth, education, and economic opportunity." },
 "cynthia_creem": { "bio": "Cynthia Stone Creem is a Democratic Massachusetts state senator from Newton (Norfolk & Middlesex) and Senate Majority Leader since 2018. An attorney in the chamber since 1999, she is a lead architect of the state's major climate laws and a longtime civil-rights sponsor." },
 "bruce_tarr": { "bio": "Bruce Tarr is a Republican Massachusetts state senator from Gloucester (First Essex & Middlesex) and Senate Minority Leader since 2011 — the leader of the small GOP caucus in a Democratic supermajority — known for fiscal restraint and championing the commercial fishing industry." },
 "mary_felzkowski": { "bio": "Mary Felzkowski is a Republican Wisconsin state senator from northern Wisconsin (District 12) who became Senate President in 2025. An insurance-agency owner, she is a leading advocate for income-tax cuts and, unusually for a Republican, for legalizing medical marijuana." },
 "devin_lemahieu": { "bio": "Devin LeMahieu is a Republican Wisconsin state senator from the Sheboygan area (District 9) and Senate Majority Leader since 2021. He made moving Wisconsin to a flat income tax his signature goal and is retiring in 2026 amid intra-party criticism as the redrawn Senate becomes highly competitive." },
 "dianne_hesselbein": { "bio": "Dianne Hesselbein is a Democratic Wisconsin state senator from Middleton (District 27) and Senate Minority Leader since 2023. A former school-board member, she leads a caucus that, under new court-ordered maps, is two seats from a majority in 2026." },
 "bobby_joe_champion": { "bio": "Bobby Joe Champion is a DFL Minnesota state senator from north Minneapolis (District 59) and, since 2023, President of the Minnesota Senate — the first Black person to hold the post. An attorney, he chairs Jobs and Economic Development and sponsored the PROMISE Act and the Minnesota African American Family Preservation Act." },
 "mark_johnson_mn": { "bio": "Mark Johnson is a Republican Minnesota state senator from the state's northwestern corner (District 1) and Senate Minority Leader, leading the GOP caucus in a chamber Democrats hold by one seat, with a focus on tax relief and agriculture." },
 "robert_rodriguez_co": { "bio": "Robert Rodriguez is a Democratic Colorado state senator from Denver (District 32) and Senate Majority Leader. He was the lead sponsor of the Colorado Privacy Act, one of the first comprehensive state consumer-data-privacy laws, and focuses on labor and consumer protections." },
 "cleave_simpson": { "bio": "Cleave Simpson is a Republican Colorado state senator from the San Luis Valley (District 6) and, since 2025, Senate Minority Leader. A fourth-generation farmer who runs the Rio Grande Water Conservation District, he is the chamber's leading voice on water scarcity and rural Colorado." },
 "bill_ferguson": { "bio": "Bill Ferguson is a Democratic Maryland state senator from Baltimore and President of the Maryland Senate since 2020 — reelected to a seventh year in 2026. A former Teach for America teacher, he drew a 2026 primary challenge after blocking a Democratic push to redraw Maryland's congressional map, which he survived." },
 "randy_mcnally": { "bio": "Randy McNally is a Republican Tennessee state senator from Oak Ridge (District 5) who has served as Lieutenant Governor and Speaker of the Senate since 2017. A pharmacist and longtime fiscal hawk, he announced in February 2026 that he would retire, ending a nearly five-decade legislative career; in 2023 he drew scrutiny over social-media interactions with a young man." },
 "jack_johnson_tn": { "bio": "Jack Johnson is a Republican Tennessee state senator from Franklin (District 27) and Senate Majority Leader since 2019, carrying the governor's priority bills — including the 2025 statewide school-voucher expansion — and viewed as a contender for the chamber's top job." },
 "raumesh_akbari": { "bio": "Raumesh Akbari is a Democratic Tennessee state senator from Memphis (District 29) and, since 2023, Senate Minority Leader. An attorney and rising national Democratic voice, she pushes Medicaid expansion, maternal health, and criminal-justice reform." },
 "rodric_bray": { "bio": "Rodric Bray is a Republican Indiana state senator from Martinsville (District 37) and, since 2018, President Pro Tempore — the chamber's top leader. In 2025-26 he was among the Senate Republicans who blocked a Trump-demanded mid-decade redistricting, drawing a public threat from Trump and a call for his ouster from Gov. Mike Braun." },
 "chris_garten": { "bio": "Chris Garten is a Republican Indiana state senator from southern Indiana (District 45) and a Marine Corps veteran. He resigned as Senate Majority Floor Leader in June 2026 after splitting with Pro Tem Bray over the Trump-backed redistricting push, which Garten supported." },
 "shelli_yoder": { "bio": "Shelli Yoder is a Democratic Indiana state senator from Bloomington (District 40) who became Senate Minority Leader in 2025 after Greg Taylor stepped down amid sexual-harassment allegations. She opposes the state's near-total abortion ban and champions public schools." },
 "cindy_olaughlin": { "bio": "Cindy O'Laughlin is a Republican Missouri state senator from Shelbina (District 18) and, since 2025, President Pro Tem — the first woman to lead the Missouri Senate. A business owner and former school-board member, she has steered the GOP supermajority through repeated Freedom Caucus infighting and champions school choice and tax cuts." },
 "tony_luetkemeyer": { "bio": "Tony Luetkemeyer is a Republican Missouri state senator from Parkville (District 34) and Senate Majority Floor Leader since 2025. A former prosecutor, he is seen as a bridge to the Freedom Caucus and focuses on public safety and tax relief." },
 "doug_beck": { "bio": "Doug Beck is a Democratic Missouri state senator from Affton (District 1) and, since 2024, Senate Minority Leader. A union sheet-metal worker, he is the chamber's leading labor voice and a defender of Missouri's voter-approved Medicaid expansion." },
 "nancy_king": { "bio": "Nancy King is a Democratic Maryland state senator from Montgomery County (District 39) and Senate Majority Leader since 2020. A former school-board member, she is a senior budget and education leader focused on the Blueprint for Maryland's Future school-funding plan." },
 "steve_hershey": { "bio": "Steve Hershey is a Republican Maryland state senator from the Eastern Shore (District 36) and, since 2023, Senate Minority Leader. He opposes the Democratic majority's tax increases and advocates for agriculture and the rural Eastern Shore economy." },
 "nicole_cannizzaro": { "bio": "Nicole Cannizzaro is a Democratic Nevada state senator from Las Vegas (District 6) and, since 2019, Senate Majority Leader — the first woman to hold the post. A Clark County prosecutor, she announced in 2025 a run for Nevada attorney general in 2026." },
 "sharon_carson": { "bio": "Sharon Carson is a Republican New Hampshire state senator from Londonderry (District 14) who became Senate President in December 2024, succeeding the retiring Jeb Bradley after serving as Majority Leader. An Army veteran, she leads the chamber's Republican majority." },
 "robert_stivers": { "bio": "Robert Stivers is a Republican Kentucky state senator from Manchester (District 25) who has served as Senate President since 2013, leading one of the nation's largest Republican supermajorities in a state with a Democratic governor." },
 "robin_titus": { "bio": "Robin Titus is a Republican Nevada state senator from rural Lyon County (District 17) and, since 2024, Senate Minority Leader. A practicing family physician who previously led the Assembly GOP caucus, she focuses on rural health care and opposing tax increases." },
 "marilyn_dondero_loop": { "bio": "Marilyn Dondero Loop is a Democratic Nevada state senator from Las Vegas (District 8) and, since 2025, Senate President pro Tempore. A retired public-school teacher, she centers public-education funding and family support." },
 "regina_birdsell": { "bio": "Regina Birdsell is a Republican New Hampshire state senator from Hampstead (District 19) and Senate Majority Leader since 2024, promoted when Sharon Carson became president. She defends the state's no-income-tax model and works on election law." },
 "rebecca_perkins_kwoka": { "bio": "Rebecca Perkins Kwoka is a Democratic New Hampshire state senator from the Portsmouth area (District 21) and, since 2024, Senate Minority Leader — one of the chamber's most prominent LGBTQ members. She focuses on housing affordability." },
 "max_wise": { "bio": "Max Wise is a Republican Kentucky state senator from Campbellsville (District 16) and, since 2025, Senate Majority Floor Leader. An Air Force veteran and former CIA analyst, he chaired the Education Committee, authored the School Safety and Resiliency Act, and was the 2023 GOP nominee for lieutenant governor." },
 "gerald_neal": { "bio": "Gerald Neal is a Democratic Kentucky state senator from Louisville (District 33) and Senate Minority Leader — the longest-serving Black member in the chamber's history. An attorney, he has led on civil rights, sponsored Kentucky's formal apology for slavery, and pushes voting access and police accountability." },
 "cameron_henry": { "bio": "Cameron Henry is a Republican Louisiana state senator from Metairie (District 9) and President of the Louisiana Senate since 2024. A close ally of Gov. Jeff Landry and former House Appropriations chair, he steered Landry's 2024-25 tax overhaul and is fifth in the state's line of gubernatorial succession." },
 "jeremy_stine": { "bio": "Jeremy Stine is a Republican Louisiana state senator from Lake Charles (District 27) and Senate Majority Leader since 2024. He represents hurricane-battered southwest Louisiana and works on the state's property-insurance crisis and Gulf Coast energy economy." },
 "royce_duplessis": { "bio": "Royce Duplessis is a Democratic Louisiana state senator from New Orleans (District 5), an attorney and leading minority voice in a Republican supermajority. He filed 2026 legislation to bar insurers from using credit scores or ZIP codes to set premiums and champions criminal-justice reform." },
 "rob_wagner": { "bio": "Rob Wagner is a Democratic Oregon state senator from Lake Oswego (District 19) and President of the Oregon Senate since 2023. A former school-board member and education-nonprofit leader, he previously served as Majority Leader and centers public education and housing." },
 "kayse_jama": { "bio": "Kayse Jama is a Democratic Oregon state senator from east Portland (District 24) and Senate Majority Leader since November 2024 — a former Somali refugee and the first Muslim and first African-born member of the chamber. He champions affordable housing, tenant protections, and immigrant communities." },
 "bruce_starr": { "bio": "Bruce Starr is a Republican Oregon state senator from Yamhill County (District 12) and Senate Minority Leader since 2025. He won the seat of Brian Boquist, one of the senators barred from re-election under Measure 113 after the record six-week 2023 GOP walkout, and focuses on taxes and agriculture." },
 "thomas_alexander": { "bio": "Thomas Alexander is a Republican South Carolina state senator from Oconee County (District 1) and President of the Senate since 2021. A senior member, he is a lead voice on the state's energy future and the debate over the state-owned utility Santee Cooper." },
 "shane_massey": { "bio": "Shane Massey is a Republican South Carolina state senator from Edgefield (District 25) and Senate Majority Leader since 2016. An attorney, he has repeatedly driven near-total abortion bans that drew public rebukes from the bipartisan 'Sister Senators,' and leads on judicial selection and taxes." },
 "margie_bright_matthews": { "bio": "Margie Bright Matthews is a Democratic South Carolina state senator from the rural Lowcountry (District 45), an attorney and one of the bipartisan 'Sister Senators' who filibustered the state's near-total abortion ban and shared the 2024 JFK Profile in Courage Award. After the three Republican Sister Senators lost their 2024 primaries, she is one of only two women left in the chamber." },
 "garlan_gudger": { "bio": "Garlan Gudger is a Republican Alabama state senator from Cullman (District 4) who became President pro Tempore — the chamber's top leader — in 2025, winning the post over the sitting majority leader. A small-business owner, he centers economic development and tax relief." },
 "steve_livingston": { "bio": "Steve Livingston is a Republican Alabama state senator from Scottsboro (District 8) and Senate Majority Leader since 2023. He was a lead architect of Alabama's rural high-speed-internet expansion and backs the supermajority's tax-cut agenda." },
 "bobby_singleton": { "bio": "Bobby Singleton is a Democratic Alabama state senator from the majority-Black rural Black Belt (District 24) and, since 2019, Senate Minority Leader. He is a leading voice on civil rights, redistricting, and rural health care in a state central to Voting Rights Act litigation." },
 "martin_looney": { "bio": "Martin Looney is a Democratic Connecticut state senator from New Haven (District 11) and President pro Tempore since 2015 — the longest-tenured Senate leader in Connecticut history. In May 2026 he announced he would not seek an 18th term and endorsed Majority Leader Bob Duff to succeed him; he led the state's 2020 police-accountability law." },
 "bob_duff": { "bio": "Bob Duff is a Democratic Connecticut state senator from Norwalk (District 25) and Senate Majority Leader since 2015, endorsed by the retiring Martin Looney to become the chamber's next President pro Tempore. He leads on climate, clean energy, and gun safety." },
 "stephen_harding": { "bio": "Stephen Harding is a Republican Connecticut state senator from Brookfield (District 30) and, since 2024, Senate Minority Leader. An attorney, he centers Connecticut's high cost of living and taxes, opposing new tax increases." }
};
  Object.keys(X).forEach(function (k) {
    var src = X[k], dst = D[k] || (D[k] = {});
    for (var f in src) dst[f] = src[f];
  });
  window._pdxCmpDetailLoaded = true;
})();
