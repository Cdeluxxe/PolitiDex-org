// PolitiDex data module (Run 3 perf): CMP_DATA is now the LIGHT roster search
// index — every field needed to list, sort, filter and search politicians. The two
// heavier detail fields (bio, stances) were split into cmp-data-detail.js, which
// loads on demand (pdx-lazy-data.js) and merges back into these same records. Full
// per-official records (promises, accountability, voting record, sections) continue
// to load on demand from Firestore via _pdxEnsureFullProfile (firebase-boot.js).
// Loaded with <script defer>, this merges into the window global the inline stub
// creates, before DOMContentLoaded.
Object.assign((window.CMP_DATA = window.CMP_DATA || {}),
{
// National — complete Chellie Pingree (July 2026)
 "chellie_pingree": {
  "name": "Chellie Pingree",
  "office": "U.S. Representative",
  "state": "Maine",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🌾",
  "issues": [
   "Agriculture",
   "Environment",
   "Appropriations",
   "Organic Farming"
  ]
 },
// National — Lieutenant Governors (Lt. Gov wave 1, July 2026)
 "garlin_gilchrist": {
  "name": "Garlin Gilchrist",
  "office": "Lieutenant Governor",
  "state": "Michigan",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Economic Mobility",
   "Infrastructure",
   "Housing",
   "Check on D.C."
  ]
 },
 "austin_davis": {
  "name": "Austin Davis",
  "office": "Lieutenant Governor",
  "state": "Pennsylvania",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Labor",
   "Gun Safety",
   "Transit",
   "Community Safety"
  ]
 },
 "eleni_kounalakis": {
  "name": "Eleni Kounalakis",
  "office": "Lieutenant Governor",
  "state": "California",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Climate",
   "Housing",
   "Higher Education",
   "Trade"
  ]
 },
 "peggy_flanagan": {
  "name": "Peggy Flanagan",
  "office": "Lieutenant Governor",
  "state": "Minnesota",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Children & Families",
   "Tribal Affairs",
   "Paid Leave",
   "Health Care"
  ]
 },
 "burt_jones": {
  "name": "Burt Jones",
  "office": "Lieutenant Governor",
  "state": "Georgia",
  "party": "R",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Tax Cuts",
   "Public Safety",
   "School Choice",
   "Elections"
  ]
 },
 "delbert_hosemann": {
  "name": "Delbert Hosemann",
  "office": "Lieutenant Governor",
  "state": "Mississippi",
  "party": "R",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Education Funding",
   "Fiscal Restraint",
   "Health Care",
   "Infrastructure"
  ]
 },
 "matt_pinnell": {
  "name": "Matt Pinnell",
  "office": "Lieutenant Governor",
  "state": "Oklahoma",
  "party": "R",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Tourism & Small Business",
   "School Choice",
   "Taxes",
   "Workforce"
  ]
 },
 "jim_tressel": {
  "name": "Jim Tressel",
  "office": "Lieutenant Governor",
  "state": "Ohio",
  "party": "R",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Workforce & Education",
   "Economic Development",
   "Public Service",
   "Higher Education"
  ]
 },
// National — state Secretaries of State (SoS wave 2, July 2026)
 "shirley_weber": {
  "name": "Shirley Weber",
  "office": "Secretary of State",
  "state": "California",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🗳",
  "issues": [
   "Voting Access",
   "Election Administration",
   "Transparency",
   "Democracy"
  ]
 },
 "jena_griswold": {
  "name": "Jena Griswold",
  "office": "Secretary of State",
  "state": "Colorado",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🗳",
  "issues": [
   "Voting Access",
   "Election Security",
   "Election Workers",
   "Democracy"
  ]
 },
 "steve_hobbs": {
  "name": "Steve Hobbs",
  "office": "Secretary of State",
  "state": "Washington",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🗳",
  "issues": [
   "Election Administration",
   "Election Security",
   "Voting Access",
   "Disinformation"
  ]
 },
 "maggie_toulouse_oliver": {
  "name": "Maggie Toulouse Oliver",
  "office": "Secretary of State",
  "state": "New Mexico",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🗳",
  "issues": [
   "Voting Access",
   "Transparency",
   "Election Security",
   "Democracy"
  ]
 },
 "jane_nelson_tx": {
  "name": "Jane Nelson",
  "office": "Secretary of State",
  "state": "Texas",
  "party": "R",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🗳",
  "issues": [
   "Election Administration",
   "Voter Rolls",
   "Election Integrity",
   "Business"
  ]
 },
 "diego_morales": {
  "name": "Diego Morales",
  "office": "Secretary of State",
  "state": "Indiana",
  "party": "R",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🗳",
  "issues": [
   "Voter Rolls",
   "Election Integrity",
   "Voter ID",
   "Business"
  ]
 },
 "michael_watson_ms": {
  "name": "Michael Watson",
  "office": "Secretary of State",
  "state": "Mississippi",
  "party": "R",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🗳",
  "issues": [
   "Voter Rolls",
   "Voter ID",
   "Election Integrity",
   "Access Debate"
  ]
 },
 "michael_adams_ky": {
  "name": "Michael Adams",
  "office": "Secretary of State",
  "state": "Kentucky",
  "party": "R",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🗳",
  "issues": [
   "Bipartisan Access",
   "Voter Rolls",
   "Election Integrity",
   "Voter ID"
  ]
 },
// National — state Attorneys General (AG wave 5, completes all 50, July 2026)
 "marty_jackley": {
  "name": "Marty Jackley",
  "office": "State Attorney General",
  "state": "South Dakota",
  "party": "R",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Federal Pushback",
   "Public Safety",
   "Consumer Protection",
   "Abortion"
  ]
 },
 "jay_jones": {
  "name": "Jay Jones",
  "office": "State Attorney General",
  "state": "Virginia",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Multistate Litigation",
   "Consumer Protection",
   "Abortion Rights",
   "Criminal Justice"
  ]
 },
// National — state Secretaries of State (SoS wave 1, July 2026)
 "jocelyn_benson": {
  "name": "Jocelyn Benson",
  "office": "Secretary of State",
  "state": "Michigan",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🗳",
  "issues": [
   "Voting Access",
   "Election Administration",
   "Transparency",
   "Democracy"
  ]
 },
 "adrian_fontes": {
  "name": "Adrian Fontes",
  "office": "Secretary of State",
  "state": "Arizona",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🗳",
  "issues": [
   "Election Administration",
   "Voting Access",
   "Election Security",
   "Democracy"
  ]
 },
 "cisco_aguilar": {
  "name": "Cisco Aguilar",
  "office": "Secretary of State",
  "state": "Nevada",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🗳",
  "issues": [
   "Voting Access",
   "Election Workers",
   "Election Security",
   "Democracy"
  ]
 },
 "steve_simon": {
  "name": "Steve Simon",
  "office": "Secretary of State",
  "state": "Minnesota",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🗳",
  "issues": [
   "Voting Access",
   "Election Administration",
   "Transparency",
   "Democracy"
  ]
 },
 "brad_raffensperger": {
  "name": "Brad Raffensperger",
  "office": "Secretary of State",
  "state": "Georgia",
  "party": "R",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🗳",
  "issues": [
   "2020 Certification",
   "Voter ID",
   "Election Integrity",
   "Voter Rolls"
  ]
 },
 "frank_larose": {
  "name": "Frank LaRose",
  "office": "Secretary of State",
  "state": "Ohio",
  "party": "R",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🗳",
  "issues": [
   "Voter ID",
   "Election Integrity",
   "Ballot Measures",
   "Voter Rolls"
  ]
 },
 "al_schmidt": {
  "name": "Al Schmidt",
  "office": "Secretary of State",
  "state": "Pennsylvania",
  "party": "R",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🗳",
  "issues": [
   "2020 Defense",
   "Election Integrity",
   "Voting Access",
   "Bipartisanship"
  ]
 },
 "wes_allen": {
  "name": "Wes Allen",
  "office": "Secretary of State",
  "state": "Alabama",
  "party": "R",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🗳",
  "issues": [
   "Voter Rolls",
   "Election Integrity",
   "Voter ID",
   "Access Debate"
  ]
 },
// National — state Attorneys General (AG wave 4, July 2026)
 "ken_paxton": {
  "name": "Ken Paxton",
  "office": "State Attorney General",
  "state": "Texas",
  "party": "R",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Federal Pushback",
   "Immigration",
   "Abortion",
   "Energy"
  ]
 },
 "matthew_platkin": {
  "name": "Matthew Platkin",
  "office": "State Attorney General",
  "state": "New Jersey",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Multistate Litigation",
   "Gun Safety",
   "Consumer Protection",
   "Civil Rights"
  ]
 },
 "treg_taylor": {
  "name": "Treg Taylor",
  "office": "State Attorney General",
  "state": "Alaska",
  "party": "R",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Federal Pushback",
   "Energy & Lands",
   "Public Safety",
   "Consumer Protection"
  ]
 },
 "derek_brown_ut": {
  "name": "Derek Brown",
  "office": "State Attorney General",
  "state": "Utah",
  "party": "R",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Federal Pushback",
   "Public Lands",
   "Public Safety",
   "Tech & Kids"
  ]
 },
 "catherine_hanaway": {
  "name": "Catherine Hanaway",
  "office": "State Attorney General",
  "state": "Missouri",
  "party": "R",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Federal Pushback",
   "Public Safety",
   "Abortion",
   "Consumer Protection"
  ]
 },
 "bridget_hill": {
  "name": "Bridget Hill",
  "office": "State Attorney General",
  "state": "Wyoming",
  "party": "R",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Energy & Lands",
   "Federal Pushback",
   "Public Safety",
   "Consumer Protection"
  ]
 },
// National — state Attorneys General (AG wave 3, July 2026)
 "russell_coleman": {
  "name": "Russell Coleman",
  "office": "State Attorney General",
  "state": "Kentucky",
  "party": "R",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Federal Pushback",
   "Public Safety",
   "Abortion",
   "Consumer Protection"
  ]
 },
 "mike_hilgers": {
  "name": "Mike Hilgers",
  "office": "State Attorney General",
  "state": "Nebraska",
  "party": "R",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Federal Pushback",
   "Abortion",
   "Energy & Ag",
   "Public Safety"
  ]
 },
 "john_formella": {
  "name": "John Formella",
  "office": "State Attorney General",
  "state": "New Hampshire",
  "party": "R",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Federal Pushback",
   "Public Safety",
   "Consumer Protection",
   "Elections"
  ]
 },
 "jb_mccuskey": {
  "name": "JB McCuskey",
  "office": "State Attorney General",
  "state": "West Virginia",
  "party": "R",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Energy",
   "Federal Pushback",
   "Public Safety",
   "Consumer Protection"
  ]
 },
 "peter_neronha": {
  "name": "Peter Neronha",
  "office": "State Attorney General",
  "state": "Rhode Island",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Multistate Litigation",
   "Health Care",
   "Gun Safety",
   "Environment"
  ]
 },
 "charity_clark": {
  "name": "Charity Clark",
  "office": "State Attorney General",
  "state": "Vermont",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Multistate Litigation",
   "Consumer Protection",
   "Gun Safety",
   "Abortion Rights"
  ]
 },
 "aaron_frey": {
  "name": "Aaron Frey",
  "office": "State Attorney General",
  "state": "Maine",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Multistate Litigation",
   "Consumer Protection",
   "Gun Safety",
   "Abortion Rights"
  ]
 },
 "anne_lopez": {
  "name": "Anne Lopez",
  "office": "State Attorney General",
  "state": "Hawaii",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Multistate Litigation",
   "Gun Safety",
   "Consumer Protection",
   "Environment"
  ]
 },
// National — state Attorneys General (AG wave 2, July 2026)
 "steve_marshall": {
  "name": "Steve Marshall",
  "office": "State Attorney General",
  "state": "Alabama",
  "party": "R",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Federal Pushback",
   "Abortion",
   "Public Safety",
   "Energy"
  ]
 },
 "gentner_drummond": {
  "name": "Gentner Drummond",
  "office": "State Attorney General",
  "state": "Oklahoma",
  "party": "R",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Federal Pushback",
   "Energy",
   "Criminal Justice",
   "Public Safety"
  ]
 },
 "drew_wrigley": {
  "name": "Drew Wrigley",
  "office": "State Attorney General",
  "state": "North Dakota",
  "party": "R",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Federal Pushback",
   "Energy",
   "Public Safety",
   "Abortion"
  ]
 },
 "lynn_fitch": {
  "name": "Lynn Fitch",
  "office": "State Attorney General",
  "state": "Mississippi",
  "party": "R",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Abortion",
   "Federal Pushback",
   "Consumer Protection",
   "Human Trafficking"
  ]
 },
 "anthony_brown": {
  "name": "Anthony Brown",
  "office": "State Attorney General",
  "state": "Maryland",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Multistate Litigation",
   "Civil Rights",
   "Gun Safety",
   "Consumer Protection"
  ]
 },
 "dan_rayfield": {
  "name": "Dan Rayfield",
  "office": "State Attorney General",
  "state": "Oregon",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Multistate Litigation",
   "Consumer Protection",
   "Abortion Rights",
   "Environment"
  ]
 },
 "raul_torrez": {
  "name": "Raúl Torrez",
  "office": "State Attorney General",
  "state": "New Mexico",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Multistate Litigation",
   "Public Safety",
   "Child Safety",
   "Abortion Rights"
  ]
 },
 "kathy_jennings": {
  "name": "Kathy Jennings",
  "office": "State Attorney General",
  "state": "Delaware",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Multistate Litigation",
   "Consumer Protection",
   "Gun Safety",
   "Criminal Justice"
  ]
 },
// National — state Attorneys General (AG wave 1, July 2026)
 "william_tong": {
  "name": "William Tong",
  "office": "State Attorney General",
  "state": "Connecticut",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Multistate Litigation",
   "Consumer Protection",
   "Gun Safety",
   "Abortion Rights"
  ]
 },
 "phil_weiser": {
  "name": "Phil Weiser",
  "office": "State Attorney General",
  "state": "Colorado",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Antitrust",
   "Multistate Litigation",
   "Opioids",
   "Gun Safety"
  ]
 },
 "nick_brown": {
  "name": "Nick Brown",
  "office": "State Attorney General",
  "state": "Washington",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Multistate Litigation",
   "Consumer Protection",
   "Immigration",
   "Abortion Rights"
  ]
 },
 "andrea_joy_campbell": {
  "name": "Andrea Joy Campbell",
  "office": "State Attorney General",
  "state": "Massachusetts",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Multistate Litigation",
   "Consumer Protection",
   "Housing",
   "Gun Safety"
  ]
 },
 "todd_rokita": {
  "name": "Todd Rokita",
  "office": "State Attorney General",
  "state": "Indiana",
  "party": "R",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Federal Pushback",
   "Abortion",
   "Big Tech",
   "Election Integrity"
  ]
 },
 "tim_griffin": {
  "name": "Tim Griffin",
  "office": "State Attorney General",
  "state": "Arkansas",
  "party": "R",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Federal Pushback",
   "Energy",
   "Public Safety",
   "Abortion"
  ]
 },
 "austin_knudsen": {
  "name": "Austin Knudsen",
  "office": "State Attorney General",
  "state": "Montana",
  "party": "R",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Federal Pushback",
   "Gun Rights",
   "Energy",
   "Abortion"
  ]
 },
 "alan_wilson": {
  "name": "Alan Wilson",
  "office": "State Attorney General",
  "state": "South Carolina",
  "party": "R",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Federal Pushback",
   "Abortion",
   "Public Safety",
   "Election Integrity"
  ]
 },
 "jimmie_hughes_stg": {
  "name": "Jimmie Hughes",
  "office": "Mayor, St. George",
  "state": "Utah",
  "party": "",
  "score": 60,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Growth & Land Use",
   "Property Taxes",
   "Water Security",
   "Local Accountability"
  ]
 },
 "roger_armstrong_summit": {
  "name": "Roger Armstrong",
  "office": "Summit County Council",
  "state": "Utah",
  "party": "D",
  "score": 63,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Growth & Land Use",
   "Local Control",
   "County Budget"
  ]
 },
 "canice_harte_summit": {
  "name": "Canice Harte",
  "office": "Summit County Council (Chair)",
  "state": "Utah",
  "party": "D",
  "score": 60,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Growth & Land Use",
   "Traffic & Infrastructure",
   "Local Control"
  ]
 },
 "heidi_hammond_grantsville": {
  "name": "Heidi Hammond",
  "office": "Mayor, Grantsville",
  "state": "Utah",
  "party": "",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Growth & Annexation",
   "Property Taxes",
   "Transparency"
  ]
 },
 "paul_cozzens_iron": {
  "name": "Paul Cozzens",
  "office": "Iron County Commission",
  "state": "Utah",
  "party": "R",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Water",
   "Growth",
   "Local Accountability"
  ]
 },
 "heidi_franco_heber": {
  "name": "Heidi Franco",
  "office": "Mayor, Heber City",
  "state": "Utah",
  "party": "",
  "score": 62,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Open Space & Growth",
   "Environment",
   "Transparency",
   "Property Taxes"
  ]
 },
 "rosie_rivera_slco": {
  "name": "Rosie Rivera",
  "office": "Salt Lake County Sheriff",
  "state": "Utah",
  "party": "D",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "👮",
  "issues": [
   "Jail & Public Safety",
   "County Budget",
   "Accountability"
  ]
 },
 "monica_zoltanski_sandy": {
  "name": "Monica Zoltanski",
  "office": "Mayor, Sandy",
  "state": "Utah",
  "party": "",
  "score": 60,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Property Taxes",
   "Growth",
   "Local Accountability"
  ]
 },
 "karen_lang_wvc": {
  "name": "Karen Lang",
  "office": "Mayor, West Valley City",
  "state": "Utah",
  "party": "",
  "score": 59,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Public Safety",
   "Immigration & Trust",
   "Accountability"
  ]
 },
 "lorin_palmer_herriman": {
  "name": "Lorin Palmer",
  "office": "Mayor, Herriman",
  "state": "Utah",
  "party": "",
  "score": 60,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Growth & Land Use",
   "Property Taxes",
   "Public Schools"
  ]
 },
 "mark_shepherd_clearfield": {
  "name": "Mark Shepherd",
  "office": "Mayor, Clearfield",
  "state": "Utah",
  "party": "",
  "score": 59,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Property Taxes",
   "Housing & Redevelopment",
   "Growth"
  ]
 },
 "aimee_winder_newton": {
  "name": "Aimee Winder Newton",
  "office": "Salt Lake County Council (Chair, District 3)",
  "state": "Utah",
  "party": "R",
  "score": 60,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Property Taxes",
   "Public Safety",
   "Local Accountability"
  ]
 },
 "carlos_moreno": {
  "name": "Carlos Moreno",
  "office": "Salt Lake County Council (District 2)",
  "state": "Utah",
  "party": "R",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Property Taxes",
   "Government Spending",
   "Local Accountability"
  ]
 },
 "laurie_stringham": {
  "name": "Laurie Stringham",
  "office": "Salt Lake County Council (At-Large A)",
  "state": "Utah",
  "party": "R",
  "score": 59,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Property Taxes",
   "Mental Health & Jail",
   "Public Safety"
  ]
 },
 "natalie_pinkney": {
  "name": "Natalie Pinkney",
  "office": "Salt Lake County Council (At-Large C)",
  "state": "Utah",
  "party": "D",
  "score": 60,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Homelessness & Housing",
   "Justice Reform",
   "Property Taxes"
  ]
 },
 "dramsey": {
  "name": "Dawn Ramsey",
  "office": "Mayor, South Jordan",
  "state": "Utah",
  "party": "",
  "score": 60,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Growth & Housing",
   "Seniors & Cost of Living",
   "Economic Development"
  ]
 },
 "tamara_tran_kaysville": {
  "name": "Tamara Tran",
  "office": "Mayor, Kaysville",
  "state": "Utah",
  "party": "",
  "score": 59,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Property Taxes",
   "Municipal Power",
   "Growth"
  ]
 },
 "tammy_pearson_beaver": {
  "name": "Tammy Pearson",
  "office": "Beaver County Commission",
  "state": "Utah",
  "party": "R",
  "score": 60,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Water",
   "Rural & Agriculture",
   "Accountability"
  ]
 },
 "greg_miles_duchesne": {
  "name": "Greg Miles",
  "office": "Duchesne County Commission",
  "state": "Utah",
  "party": "R",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Energy Production",
   "Rural & Agriculture",
   "Growth"
  ]
 },
 "jordan_leonard_emery": {
  "name": "Jordan Leonard",
  "office": "Emery County Commission",
  "state": "Utah",
  "party": "R",
  "score": 59,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Energy Production",
   "Rural & Agriculture",
   "County Budget"
  ]
 },
 "mary_mcgann_grand": {
  "name": "Mary McGann",
  "office": "Grand County Commission",
  "state": "Utah",
  "party": "D",
  "score": 61,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Housing & Growth",
   "County Budget",
   "Accountability"
  ]
 },
 "dean_draper_millard": {
  "name": "Dean Draper",
  "office": "Millard County Commission",
  "state": "Utah",
  "party": "R",
  "score": 59,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Energy Production",
   "Rural & Agriculture",
   "County Budget"
  ]
 },
 "lori_maughan_sanjuan": {
  "name": "Lori Maughan",
  "office": "San Juan County Commission (Chair)",
  "state": "Utah",
  "party": "R",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Energy & Extraction",
   "Public Lands",
   "Rural Economy"
  ]
 },
 "jamie_harvey_sanjuan": {
  "name": "Jamie Harvey",
  "office": "San Juan County Commission (Vice Chair)",
  "state": "Utah",
  "party": "R",
  "score": 56,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Public Safety",
   "Navajo Nation",
   "Public Lands"
  ]
 },
 "trevor_olsen_blanding": {
  "name": "Trevor Olsen",
  "office": "Mayor, Blanding",
  "state": "Utah",
  "party": "",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Local Government",
   "Community Service"
  ]
 },
 "kevin_dunn_monticello": {
  "name": "Kevin Dunn",
  "office": "Mayor, Monticello",
  "state": "Utah",
  "party": "",
  "score": 56,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Local Government",
   "Accountability"
  ]
 },
 "john_laursen_uintah": {
  "name": "John Laursen",
  "office": "Uintah County Commission (Chair)",
  "state": "Utah",
  "party": "R",
  "score": 59,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Energy Production",
   "Public Lands",
   "Public Safety"
  ]
 },
 "sonja_norton_uintah": {
  "name": "Sonja Norton",
  "office": "Uintah County Commission",
  "state": "Utah",
  "party": "R",
  "score": 59,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Energy Production",
   "Economic Development",
   "Local Government"
  ]
 },
 "willis_lefevre_uintah": {
  "name": "Willis LeFevre",
  "office": "Uintah County Commission",
  "state": "Utah",
  "party": "R",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Energy Production",
   "Rural & Agriculture"
  ]
 },
 "steve_labrum_uintah": {
  "name": "Steve Labrum",
  "office": "Uintah County Sheriff",
  "state": "Utah",
  "party": "R",
  "score": 60,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🛡",
  "issues": [
   "Public Safety",
   "Law Enforcement"
  ]
 },
 "terry_willis_price": {
  "name": "Terry Willis",
  "office": "Mayor, Price",
  "state": "Utah",
  "party": "",
  "score": 59,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Water & Drought",
   "Infrastructure",
   "County Budget"
  ]
 },
 "lenise_peterman_helper": {
  "name": "Lenise Peterman",
  "office": "Mayor, Helper",
  "state": "Utah",
  "party": "",
  "score": 60,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Economic Diversification",
   "Coal Transition",
   "Tourism"
  ]
 },
 "jeff_wood_carbon": {
  "name": "Jeff Wood",
  "office": "Carbon County Sheriff",
  "state": "Utah",
  "party": "R",
  "score": 60,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🛡",
  "issues": [
   "Public Safety",
   "Drug Policy"
  ]
 },
 "larry_jensen_carbon": {
  "name": "Larry Jensen",
  "office": "Carbon County Commission",
  "state": "Utah",
  "party": "R",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Coal Transition",
   "Tourism",
   "Economic Development"
  ]
 },
 "scott_bartholomew_sanpete": {
  "name": "Scott Bartholomew",
  "office": "Sanpete County Commission (Chair)",
  "state": "Utah",
  "party": "R",
  "score": 59,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Water & Drought",
   "Rural Growth",
   "Accountability"
  ]
 },
 "jim_cheney_sanpete": {
  "name": "Jim Cheney",
  "office": "Sanpete County Commission",
  "state": "Utah",
  "party": "R",
  "score": 56,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Rural Growth",
   "Mental Health",
   "Local Government"
  ]
 },
 "jared_buchanan_sanpete": {
  "name": "Jared Buchanan",
  "office": "Sanpete County Sheriff",
  "state": "Utah",
  "party": "R",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🛡",
  "issues": [
   "Public Safety",
   "County Budget"
  ]
 },
 "john_scott_ephraim": {
  "name": "John Scott",
  "office": "Former Mayor, Ephraim",
  "state": "Utah",
  "party": "",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Rural Growth",
   "Housing",
   "Water"
  ]
 },
 "greg_jensen_sevier": {
  "name": "Greg Jensen",
  "office": "Sevier County Commission",
  "state": "Utah",
  "party": "R",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Energy Production",
   "Public Lands",
   "Economic Development"
  ]
 },
 "nathan_curtis_sevier": {
  "name": "Nathan Curtis",
  "office": "Sevier County Sheriff",
  "state": "Utah",
  "party": "R",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🛡",
  "issues": [
   "Wildfire & Drought",
   "Public Safety"
  ]
 },
 "bryan_burrows_richfield": {
  "name": "Bryan Burrows",
  "office": "Mayor, Richfield",
  "state": "Utah",
  "party": "",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Local Government",
   "Accountability"
  ]
 },
 "justin_seely_nephi": {
  "name": "Justin Seely",
  "office": "Mayor, Nephi",
  "state": "Utah",
  "party": "",
  "score": 60,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Growth & Data Centers",
   "Water",
   "Energy"
  ]
 },
 "clint_painter_juab": {
  "name": "Clint Painter",
  "office": "Juab County Commission (Chair)",
  "state": "Utah",
  "party": "R",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Growth & Data Centers",
   "Economic Development",
   "Education"
  ]
 },
 "douglas_anderson_juab": {
  "name": "Douglas Anderson",
  "office": "Juab County Sheriff",
  "state": "Utah",
  "party": "R",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🛡",
  "issues": [
   "Public Safety",
   "County Budget"
  ]
 },
 "linda_hanks_juab": {
  "name": "Linda Hanks",
  "office": "Juab School District Board (President)",
  "state": "Utah",
  "party": "",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🎓",
  "issues": [
   "Public Schools",
   "Teacher Pay",
   "Education Funding"
  ]
 },
 "gwen_brown_kane": {
  "name": "Gwen Brown",
  "office": "Kane County Commission (Chair)",
  "state": "Utah",
  "party": "R",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Public Lands",
   "Energy & Coal",
   "Growth & Taxes"
  ]
 },
 "celeste_meyeres_kane": {
  "name": "Celeste Meyeres",
  "office": "Kane County Commission",
  "state": "Utah",
  "party": "R",
  "score": 59,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Grand Staircase",
   "Public Lands",
   "Rural Economy"
  ]
 },
 "tracy_glover_kane": {
  "name": "Tracy Glover",
  "office": "Kane County Sheriff",
  "state": "Utah",
  "party": "",
  "score": 60,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🛡",
  "issues": [
   "Public Lands & Roads",
   "Public Safety"
  ]
 },
 "colten_johnson_kanab": {
  "name": "T. Colten Johnson",
  "office": "Mayor, Kanab",
  "state": "Utah",
  "party": "",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Growth & Tourism",
   "Water",
   "Local Control"
  ]
 },
 "leland_pollock_garfield": {
  "name": "Leland Pollock",
  "office": "Garfield County Commission (Chair)",
  "state": "Utah",
  "party": "R",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Grand Staircase",
   "Public Lands",
   "Energy & Coal"
  ]
 },
 "david_tebbs_garfield": {
  "name": "David Tebbs",
  "office": "Garfield County Commission",
  "state": "Utah",
  "party": "",
  "score": 56,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Tourism & Tax",
   "Public Lands",
   "Local Control"
  ]
 },
 "eric_houston_garfield": {
  "name": "Eric Houston",
  "office": "Garfield County Sheriff",
  "state": "Utah",
  "party": "",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🛡",
  "issues": [
   "Public Safety"
  ]
 },
 "kim_soper_panguitch": {
  "name": "Kim Soper",
  "office": "Mayor, Panguitch",
  "state": "Utah",
  "party": "",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "County Budget",
   "Local Government"
  ]
 },
 "matt_wilson_morgan": {
  "name": "Matt Wilson",
  "office": "Morgan County Commission (Chair)",
  "state": "Utah",
  "party": "",
  "score": 56,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Growth & Development",
   "Property Taxes"
  ]
 },
 "blaine_fackrell_morgan": {
  "name": "Blaine Fackrell",
  "office": "Morgan County Commission",
  "state": "Utah",
  "party": "",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Wasatch Peaks Ranch",
   "Property Taxes",
   "Growth"
  ]
 },
 "corey_stark_morgan": {
  "name": "Corey Stark",
  "office": "Morgan County Sheriff",
  "state": "Utah",
  "party": "",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🛡",
  "issues": [
   "Public Safety",
   "County Budget"
  ]
 },
 "steve_gale_morgan": {
  "name": "Steve Gale",
  "office": "Mayor, Morgan City",
  "state": "Utah",
  "party": "",
  "score": 56,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Local Government"
  ]
 },
 "gaylene_adams_morgan": {
  "name": "Gaylene Adams",
  "office": "Morgan School District Board (President)",
  "state": "Utah",
  "party": "",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🎓",
  "issues": [
   "Public Schools"
  ]
 },
 "dale_stacey_rich": {
  "name": "Dale Stacey",
  "office": "Rich County Sheriff",
  "state": "Utah",
  "party": "",
  "score": 59,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🛡",
  "issues": [
   "Public Safety",
   "County Budget",
   "Rural Staffing"
  ]
 },
 "sim_weston_rich": {
  "name": "Sim Weston",
  "office": "Rich County Commission",
  "state": "Utah",
  "party": "R",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Bear Lake Growth",
   "Public Lands",
   "Planning"
  ]
 },
 "bill_cox_rich": {
  "name": "Bill Cox",
  "office": "Rich County Commission",
  "state": "Utah",
  "party": "R",
  "score": 56,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Roads & Infrastructure",
   "Public Health"
  ]
 },
 "pat_argyle_gardencity": {
  "name": "Pat Argyle",
  "office": "Mayor, Garden City",
  "state": "Utah",
  "party": "",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Bear Lake Growth",
   "Local Government"
  ]
 },
 "dennis_blackburn_wayne": {
  "name": "Dennis Blackburn",
  "office": "Wayne County Commission (Chair)",
  "state": "Utah",
  "party": "",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Rural & Agriculture",
   "Roads",
   "Capitol Reef"
  ]
 },
 "roger_brian_wayne": {
  "name": "Roger Brian",
  "office": "Wayne County Commission",
  "state": "Utah",
  "party": "R",
  "score": 56,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Tourism & Infrastructure",
   "Capitol Reef"
  ]
 },
 "micah_gulley_wayne": {
  "name": "Micah Gulley",
  "office": "Wayne County Sheriff",
  "state": "Utah",
  "party": "",
  "score": 59,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🛡",
  "issues": [
   "Public Safety"
  ]
 },
 "mickey_wright_torrey": {
  "name": "Mickey Wright",
  "office": "Mayor, Torrey",
  "state": "Utah",
  "party": "",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Dark Skies",
   "Tourism & Growth"
  ]
 },
 "marty_gleave_piute": {
  "name": "Marty Gleave",
  "office": "Piute County Sheriff",
  "state": "Utah",
  "party": "R",
  "score": 56,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🛡",
  "issues": [
   "Federal Lands & Grazing",
   "Public Safety"
  ]
 },
 "matt_tippets_daggett": {
  "name": "Matt Tippets",
  "office": "Daggett County Commission (Chair)",
  "state": "Utah",
  "party": "",
  "score": 59,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Flaming Gorge & Water",
   "Tourism",
   "County Budget"
  ]
 },
 "jack_lytle_daggett": {
  "name": "Jack Lytle",
  "office": "Daggett County Commission",
  "state": "Utah",
  "party": "",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Flaming Gorge & Water",
   "Tourism"
  ]
 },
 "erik_bailey_daggett": {
  "name": "Erik Bailey",
  "office": "Daggett County Sheriff",
  "state": "Utah",
  "party": "",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🛡",
  "issues": [
   "Public Safety",
   "Tourism Load"
  ]
 },
 "adam_snow_washco": {
  "name": "Adam Snow",
  "office": "Washington County Commission (Chair)",
  "state": "Utah",
  "party": "R",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Northern Corridor",
   "Federal Lands",
   "Economic Development"
  ]
 },
 "victor_iverson_washco": {
  "name": "Victor Iverson",
  "office": "Washington County Commission (Seat B)",
  "state": "Utah",
  "party": "R",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Northern Corridor",
   "Water",
   "Growth"
  ]
 },
 "gil_almquist_washco": {
  "name": "Gil Almquist",
  "office": "Washington County Commission",
  "state": "Utah",
  "party": "R",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Red Cliffs & Habitat",
   "Tourism",
   "Property Taxes"
  ]
 },
 "barry_golding_washco": {
  "name": "Barry Golding",
  "office": "Washington County Sheriff (interim)",
  "state": "Utah",
  "party": "R",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🛡",
  "issues": [
   "Public Safety",
   "Immigration & 287(g)",
   "Crimes Against Children"
  ]
 },
 "clark_fawcett_hurricane": {
  "name": "Clark Fawcett",
  "office": "Mayor, Hurricane",
  "state": "Utah",
  "party": "",
  "score": 59,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Transparency",
   "Growth",
   "Water"
  ]
 },
 "nanette_billings_hurricane": {
  "name": "Nanette Billings",
  "office": "Former Mayor, Hurricane",
  "state": "Utah",
  "party": "",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Local Government",
   "Accountability"
  ]
 },
 "kress_staheli_washcity": {
  "name": "Kress Staheli",
  "office": "Mayor, Washington City",
  "state": "Utah",
  "party": "",
  "score": 61,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Water Reuse",
   "Growth",
   "Property Taxes"
  ]
 },
 "kevin_smith_ivins": {
  "name": "Kevin Smith",
  "office": "Mayor, Ivins",
  "state": "Utah",
  "party": "",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Local Government",
   "Arts & Tourism"
  ]
 },
 "jarett_waite_santaclara": {
  "name": "Jarett Waite",
  "office": "Mayor, Santa Clara",
  "state": "Utah",
  "party": "",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Housing",
   "Growth",
   "Local Government"
  ]
 },
 "barbara_bruno_springdale": {
  "name": "Barbara Bruno",
  "office": "Mayor, Springdale",
  "state": "Utah",
  "party": "",
  "score": 59,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Zion & Tourism",
   "Workforce Housing",
   "Growth"
  ]
 },
 "jared_hamner_tooele": {
  "name": "Jared Hamner",
  "office": "Tooele County Council (Chair)",
  "state": "Utah",
  "party": "",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Growth",
   "Data Centers",
   "Transportation"
  ]
 },
 "scott_wardle_tooele": {
  "name": "Scott Wardle",
  "office": "Tooele County Council (Vice Chair)",
  "state": "Utah",
  "party": "",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Property Taxes",
   "Growth",
   "Local Government"
  ]
 },
 "kendall_thomas_tooele": {
  "name": "Kendall Thomas",
  "office": "Tooele County Council",
  "state": "Utah",
  "party": "",
  "score": 56,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Growth",
   "Transportation"
  ]
 },
 "tye_hoffmann_tooele": {
  "name": "Tye Hoffmann",
  "office": "Tooele County Council",
  "state": "Utah",
  "party": "",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Industrial Growth",
   "Data Centers"
  ]
 },
 "erik_stromberg_tooele": {
  "name": "Erik Stromberg",
  "office": "Tooele County Council",
  "state": "Utah",
  "party": "",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Growth",
   "County Budget"
  ]
 },
 "paul_wimmer_tooele": {
  "name": "Paul Wimmer",
  "office": "Tooele County Sheriff",
  "state": "Utah",
  "party": "R",
  "score": 56,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🛡",
  "issues": [
   "Public Safety",
   "Accountability"
  ]
 },
 "maresa_manzione_tooelecity": {
  "name": "Maresa Manzione",
  "office": "Mayor, Tooele City",
  "state": "Utah",
  "party": "",
  "score": 60,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Growth",
   "Property Taxes",
   "Water"
  ]
 },
 "erik_rowland_wasatch": {
  "name": "Erik Rowland",
  "office": "Wasatch County Council (Chair)",
  "state": "Utah",
  "party": "",
  "score": 60,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Resort Growth",
   "County Identity",
   "Local Control"
  ]
 },
 "mark_nelson_wasatch": {
  "name": "Mark Nelson",
  "office": "Wasatch County Council",
  "state": "Utah",
  "party": "",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Resort Growth",
   "County Budget",
   "Jordanelle Basin"
  ]
 },
 "luke_searle_wasatch": {
  "name": "Luke Searle",
  "office": "Wasatch County Council (Vice Chair)",
  "state": "Utah",
  "party": "",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Resort Growth",
   "Open Space",
   "Transparency"
  ]
 },
 "jared_rigby_wasatch": {
  "name": "Jared Rigby",
  "office": "Wasatch County Sheriff",
  "state": "Utah",
  "party": "R",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🛡",
  "issues": [
   "Public Safety",
   "Accountability"
  ]
 },
 "craig_simons_midway": {
  "name": "Craig Simons",
  "office": "Mayor, Midway",
  "state": "Utah",
  "party": "",
  "score": 59,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Growth",
   "Small-Town Character",
   "Local Government"
  ]
 },
 "sam_steed_piute": {
  "name": "Sam Steed",
  "office": "Piute County Commission",
  "state": "Utah",
  "party": "",
  "score": 56,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Rural & Agriculture",
   "County Budget",
   "Federal Lands"
  ]
 },
 "marsha_judkins_provo": {
  "name": "Marsha Judkins",
  "office": "Mayor, Provo",
  "state": "Utah",
  "party": "",
  "score": 60,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Growth & Housing",
   "Economic Development",
   "Property Taxes"
  ]
 },
 "dirk_burton_wjordan": {
  "name": "Dirk Burton",
  "office": "Mayor, West Jordan",
  "state": "Utah",
  "party": "",
  "score": 59,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Data Centers",
   "Property Taxes",
   "Growth"
  ]
 },
 "paul_binns_lehi": {
  "name": "Paul Binns",
  "office": "Mayor, Lehi",
  "state": "Utah",
  "party": "",
  "score": 59,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Growth & Zoning",
   "Traffic",
   "Public Safety"
  ]
 },
 "troy_walker_draper": {
  "name": "Troy Walker",
  "office": "Mayor, Draper",
  "state": "Utah",
  "party": "",
  "score": 60,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "The Point Redevelopment",
   "Growth",
   "Economic Development"
  ]
 },
 "tish_buroker_riverton": {
  "name": "Tish Buroker",
  "office": "Mayor, Riverton",
  "state": "Utah",
  "party": "",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Growth",
   "Local Government"
  ]
 },
 "brett_hales_murray": {
  "name": "Brett Hales",
  "office": "Mayor, Murray",
  "state": "Utah",
  "party": "",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Property Taxes",
   "Public Safety",
   "Housing"
  ]
 },
 "sarah_reale_usbe": {
  "name": "Sarah Reale",
  "office": "Utah State Board of Education (District 5)",
  "state": "Utah",
  "party": "",
  "score": 59,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🎓",
  "issues": [
   "DEI & Curriculum",
   "Public Schools",
   "Federal Funding"
  ]
 },
 "molly_hart_usbe": {
  "name": "Molly Hart",
  "office": "Utah State Superintendent of Public Instruction",
  "state": "Utah",
  "party": "",
  "score": 59,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🎓",
  "issues": [
   "Education Accountability",
   "School Choice",
   "Public Schools"
  ]
 },
 "bryce_dunford_jordan": {
  "name": "Bryce Dunford",
  "office": "Jordan School District Board (District 5)",
  "state": "Utah",
  "party": "",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🎓",
  "issues": [
   "Public Schools",
   "Parental Rights",
   "Cellphone Policy"
  ]
 },
 "vance": {
  "name": "J.D. Vance",
  "office": "Vice President",
  "state": "Ohio",
  "party": "R",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🇺🇸",
  "issues": [
   "Immigration",
   "Economy & Trade",
   "Foreign Policy",
   "Free Speech"
  ]
 },
 "thune": {
  "name": "John Thune",
  "office": "U.S. Senate Majority Leader",
  "state": "South Dakota",
  "party": "R",
  "score": 60,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Government Spending",
   "Economy",
   "Senate Institutions"
  ]
 },
 "mcconnell": {
  "name": "Mitch McConnell",
  "office": "U.S. Senator",
  "state": "Kentucky",
  "party": "R",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Ukraine & Defense",
   "Foreign Aid & Alliances",
   "Free Trade",
   "Government Spending"
  ]
 },
 "jeffries": {
  "name": "Hakeem Jeffries",
  "office": "U.S. House Minority Leader",
  "state": "New York",
  "party": "D",
  "score": 61,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Healthcare",
   "Government Spending",
   "Economy"
  ]
 },
 "schumer": {
  "name": "Chuck Schumer",
  "office": "U.S. Senate Minority Leader",
  "state": "New York",
  "party": "D",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Government Spending",
   "Economy",
   "Institutions"
  ]
 },
 "mike_johnson": {
  "name": "Mike Johnson",
  "office": "Speaker of the U.S. House",
  "state": "Louisiana",
  "party": "R",
  "score": 62,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Government Spending",
   "Economy",
   "Immigration",
   "Energy"
  ]
 },
 "rubio": {
  "name": "Marco Rubio",
  "office": "U.S. Secretary of State",
  "state": "Florida",
  "party": "R",
  "score": 60,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🇺🇸",
  "issues": [
   "Foreign Policy",
   "China & Trade",
   "Immigration",
   "National Security"
  ]
 },
 "bessent": {
  "name": "Scott Bessent",
  "office": "U.S. Secretary of the Treasury",
  "state": "South Carolina",
  "party": "R",
  "score": 59,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "💵",
  "issues": [
   "Economy",
   "Taxes",
   "Tariffs & Trade",
   "National Debt"
  ]
 },
 "cruz": {
  "name": "Ted Cruz",
  "office": "U.S. Senator",
  "state": "Texas",
  "party": "R",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Economy & Taxes",
   "Energy",
   "Border Security",
   "Technology"
  ]
 },
 "aoc": {
  "name": "Alexandria Ocasio-Cortez",
  "office": "U.S. Representative",
  "state": "New York",
  "party": "D",
  "score": 60,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Healthcare",
   "Climate & Energy",
   "Cost of Living",
   "Immigration"
  ]
 },
 "bondi": {
  "name": "Pam Bondi",
  "office": "U.S. Attorney General",
  "state": "Florida",
  "party": "R",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Crime & Public Safety",
   "Immigration",
   "Drug Cartels",
   "Justice Dept"
  ]
 },
 "noem": {
  "name": "Kristi Noem",
  "office": "Secretary of Homeland Security",
  "state": "South Dakota",
  "party": "R",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🛡",
  "issues": [
   "Border Security",
   "Immigration Enforcement",
   "Disaster Response",
   "National Security"
  ]
 },
 "lutnick": {
  "name": "Howard Lutnick",
  "office": "Secretary of Commerce",
  "state": "New York",
  "party": "R",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏭",
  "issues": [
   "Tariffs & Trade",
   "Economy",
   "Technology & Chips",
   "Manufacturing"
  ]
 },
 "scalise": {
  "name": "Steve Scalise",
  "office": "House Majority Leader",
  "state": "Louisiana",
  "party": "R",
  "score": 61,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Economy & Taxes",
   "Energy",
   "Government Spending",
   "Border Security"
  ]
 },
 "barrasso": {
  "name": "John Barrasso",
  "office": "U.S. Senate Majority Whip",
  "state": "Wyoming",
  "party": "R",
  "score": 60,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Energy",
   "Healthcare",
   "Government Spending",
   "Public Lands"
  ]
 },
 "emmer": {
  "name": "Tom Emmer",
  "office": "House Majority Whip",
  "state": "Minnesota",
  "party": "R",
  "score": 59,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Economy",
   "Digital Assets",
   "Government Spending",
   "Energy"
  ]
 },
 "durbin": {
  "name": "Dick Durbin",
  "office": "U.S. Senate Minority Whip",
  "state": "Illinois",
  "party": "D",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Immigration",
   "Judiciary",
   "Healthcare",
   "Gun Safety"
  ]
 },
 "kclark": {
  "name": "Katherine Clark",
  "office": "House Minority Whip",
  "state": "Massachusetts",
  "party": "D",
  "score": 59,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Child Care & Families",
   "Cost of Living",
   "Healthcare",
   "Reproductive Rights"
  ]
 },
 "jim_jordan": {
  "name": "Jim Jordan",
  "office": "House Judiciary Committee Chair",
  "state": "Ohio",
  "party": "R",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Judiciary & Oversight",
   "Immigration",
   "Free Speech",
   "Government Spending"
  ]
 },
 "jason_smith": {
  "name": "Jason Smith",
  "office": "House Ways & Means Chair",
  "state": "Missouri",
  "party": "R",
  "score": 59,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "💵",
  "issues": [
   "Taxes",
   "Trade & Tariffs",
   "Economy",
   "Healthcare"
  ]
 },
 "burgum": {
  "name": "Doug Burgum",
  "office": "U.S. Secretary of the Interior",
  "state": "North Dakota",
  "party": "R",
  "score": 60,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏔",
  "issues": [
   "Energy Production",
   "Public Lands",
   "Grid & AI Power",
   "Conservation"
  ]
 },
 "chris_wright": {
  "name": "Chris Wright",
  "office": "U.S. Secretary of Energy",
  "state": "Colorado",
  "party": "R",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚡",
  "issues": [
   "Energy Production",
   "LNG Exports",
   "Nuclear & Grid",
   "Climate & Costs"
  ]
 },
 "zeldin": {
  "name": "Lee Zeldin",
  "office": "EPA Administrator",
  "state": "New York",
  "party": "R",
  "score": 56,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏭",
  "issues": [
   "Deregulation",
   "Energy",
   "Climate Rules",
   "Clean Air & Water"
  ]
 },
 "vought": {
  "name": "Russ Vought",
  "office": "Director, OMB",
  "state": "Virginia",
  "party": "R",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🧾",
  "issues": [
   "Government Spending",
   "Federal Workforce",
   "National Debt",
   "Executive Power"
  ]
 },
 "rollins": {
  "name": "Brooke Rollins",
  "office": "U.S. Secretary of Agriculture",
  "state": "Texas",
  "party": "R",
  "score": 59,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🌾",
  "issues": [
   "Rural & Agriculture",
   "Tariffs & Trade",
   "Biofuels",
   "Nutrition & SNAP"
  ]
 },
 "grassley": {
  "name": "Chuck Grassley",
  "office": "Senate Judiciary Chair & President pro tempore",
  "state": "Iowa",
  "party": "R",
  "score": 61,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Judiciary & Oversight",
   "Drug Prices",
   "Biofuels",
   "Agriculture"
  ]
 },
 "rand_paul": {
  "name": "Rand Paul",
  "office": "Senate Homeland Security Chair",
  "state": "Kentucky",
  "party": "R",
  "score": 60,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Government Spending",
   "Tariffs & Trade",
   "Foreign Policy",
   "Civil Liberties"
  ]
 },
 "graham": {
  "name": "Lindsey Graham",
  "office": "Senate Budget Committee Chair",
  "state": "South Carolina",
  "party": "R",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🦅",
  "issues": [
   "Foreign Policy",
   "National Debt",
   "Border Security",
   "Judiciary"
  ]
 },
 "hawley": {
  "name": "Josh Hawley",
  "office": "U.S. Senator",
  "state": "Missouri",
  "party": "R",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Big Tech & Antitrust",
   "Workers & Wages",
   "Healthcare",
   "China & Trade"
  ]
 },
 "murkowski": {
  "name": "Lisa Murkowski",
  "office": "U.S. Senator",
  "state": "Alaska",
  "party": "R",
  "score": 60,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Energy",
   "Reproductive Rights",
   "Healthcare",
   "Bipartisanship"
  ]
 },
 "warren": {
  "name": "Elizabeth Warren",
  "office": "U.S. Senator",
  "state": "Massachusetts",
  "party": "D",
  "score": 61,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏦",
  "issues": [
   "Consumer Protection",
   "Economy & Taxes",
   "Drug Prices",
   "Housing"
  ]
 },
 "fetterman": {
  "name": "John Fetterman",
  "office": "U.S. Senator",
  "state": "Pennsylvania",
  "party": "D",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Foreign Policy",
   "Border Security",
   "Manufacturing",
   "Healthcare"
  ]
 },
 "booker": {
  "name": "Cory Booker",
  "office": "U.S. Senator",
  "state": "New Jersey",
  "party": "D",
  "score": 60,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Criminal Justice",
   "Anti-Poverty",
   "Healthcare",
   "Immigration"
  ]
 },
 "crockett": {
  "name": "Jasmine Crockett",
  "office": "U.S. Representative",
  "state": "Texas",
  "party": "D",
  "score": 59,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🔍",
  "issues": [
   "Oversight",
   "Voting Rights",
   "Healthcare",
   "Immigration"
  ]
 },
 "khanna": {
  "name": "Ro Khanna",
  "office": "U.S. Representative",
  "state": "California",
  "party": "D",
  "score": 60,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏭",
  "issues": [
   "Manufacturing",
   "Healthcare",
   "Foreign Policy",
   "Money in Politics"
  ]
 },
 "risch": {
  "name": "Jim Risch",
  "office": "Senate Foreign Relations Committee Chair",
  "state": "Idaho",
  "party": "R",
  "score": 60,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🌐",
  "issues": [
   "Foreign Policy",
   "Israel & Allies",
   "China & Taiwan",
   "Energy"
  ]
 },
 "crapo": {
  "name": "Mike Crapo",
  "office": "Senate Finance Committee Chair",
  "state": "Idaho",
  "party": "R",
  "score": 60,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "💵",
  "issues": [
   "Taxes",
   "Trade & Tariffs",
   "National Debt",
   "Drug Prices"
  ]
 },
 "cotton": {
  "name": "Tom Cotton",
  "office": "Senate Intelligence Committee Chair",
  "state": "Arkansas",
  "party": "R",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🛡",
  "issues": [
   "National Security",
   "China",
   "Israel & Defense",
   "Border Security"
  ]
 },
 "collins": {
  "name": "Susan Collins",
  "office": "Senate Appropriations Committee Chair",
  "state": "Maine",
  "party": "R",
  "score": 62,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Appropriations",
   "Foreign Aid",
   "Reproductive Rights",
   "Bipartisanship"
  ]
 },
 "comer": {
  "name": "James Comer",
  "office": "House Oversight Committee Chair",
  "state": "Kentucky",
  "party": "R",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🔍",
  "issues": [
   "Government Waste",
   "Oversight",
   "Federal Workforce",
   "Accountability"
  ]
 },
// Robert F. Kennedy Jr. was listed twice — a `kennedy_rfk` record sat here and a
// `rfkjr` record further down, one person under two ids, so he surfaced as two
// search results with different offices, states, parties and scores. The two were
// folded into `rfkjr` (below) and `kennedy_rfk` retired in db/vr-pid-aliases.json.
 "mccormick": {
  "name": "Dave McCormick",
  "office": "U.S. Senator",
  "state": "Pennsylvania",
  "party": "R",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚡",
  "issues": [
   "Energy",
   "China & Trade",
   "AI & Data Centers",
   "Manufacturing"
  ]
 },
 "klobuchar": {
  "name": "Amy Klobuchar",
  "office": "U.S. Senator",
  "state": "Minnesota",
  "party": "D",
  "score": 60,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Tech & Antitrust",
   "AI Guardrails",
   "Drug Prices",
   "Agriculture"
  ]
 },
 "slotkin": {
  "name": "Elissa Slotkin",
  "office": "U.S. Senator",
  "state": "Michigan",
  "party": "D",
  "score": 59,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🛡",
  "issues": [
   "National Security",
   "Border",
   "Manufacturing & Trade",
   "Israel"
  ]
 },
 "duffy": {
  "name": "Sean Duffy",
  "office": "U.S. Secretary of Transportation",
  "state": "Wisconsin",
  "party": "R",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🚦",
  "issues": [
   "Infrastructure",
   "Air Travel Safety",
   "EV & Fuel Rules",
   "Government Spending"
  ]
 },
 "wicker": {
  "name": "Roger Wicker",
  "office": "Senate Armed Services Committee Chair",
  "state": "Mississippi",
  "party": "R",
  "score": 60,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚓",
  "issues": [
   "National Defense",
   "Israel & Ukraine",
   "Shipbuilding",
   "China"
  ]
 },
 "tim_scott": {
  "name": "Tim Scott",
  "office": "Senate Banking Committee Chair",
  "state": "South Carolina",
  "party": "R",
  "score": 60,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏦",
  "issues": [
   "Digital Assets",
   "Housing",
   "Financial Regulation",
   "Taxes"
  ]
 },
 "brian_mast": {
  "name": "Brian Mast",
  "office": "House Foreign Affairs Committee Chair",
  "state": "Florida",
  "party": "R",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🎖",
  "issues": [
   "Israel & Foreign Aid",
   "National Security",
   "Veterans",
   "Border Security"
  ]
 },
 "chris_murphy": {
  "name": "Chris Murphy",
  "office": "U.S. Senator",
  "state": "Connecticut",
  "party": "D",
  "score": 60,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🕊",
  "issues": [
   "Foreign Policy",
   "Gun Safety",
   "Healthcare",
   "Anti-Corruption"
  ]
 },
 "mark_kelly": {
  "name": "Mark Kelly",
  "office": "U.S. Senator",
  "state": "Arizona",
  "party": "D",
  "score": 60,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🚀",
  "issues": [
   "Border Security",
   "Semiconductors",
   "National Defense",
   "Western Water"
  ]
 },
 "wyden": {
  "name": "Ron Wyden",
  "office": "Senate Finance Committee Ranking Member",
  "state": "Oregon",
  "party": "D",
  "score": 60,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🧾",
  "issues": [
   "Trade & Tariffs",
   "Drug Prices",
   "Digital Privacy",
   "AI & Tech"
  ]
 },
 "kennedy_john": {
  "name": "John Kennedy",
  "office": "U.S. Senator",
  "state": "Louisiana",
  "party": "R",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🧾",
  "issues": [
   "National Debt",
   "Energy & LNG",
   "Border Security",
   "Judiciary"
  ]
 },
 "french_hill": {
  "name": "French Hill",
  "office": "House Financial Services Committee Chair",
  "state": "Arkansas",
  "party": "R",
  "score": 59,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏦",
  "issues": [
   "Digital Assets",
   "Financial Regulation",
   "Economy",
   "Taxes"
  ]
 },
 "tom_cole": {
  "name": "Tom Cole",
  "office": "House Appropriations Committee Chair",
  "state": "Oklahoma",
  "party": "R",
  "score": 60,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🧾",
  "issues": [
   "Federal Appropriations",
   "National Defense",
   "Agriculture",
   "Tribal Affairs"
  ]
 },
 "arrington": {
  "name": "Jodey Arrington",
  "office": "House Budget Committee Chair",
  "state": "Texas",
  "party": "R",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🧾",
  "issues": [
   "Government Spending",
   "National Debt",
   "Taxes",
   "Entitlement Reform"
  ]
 },
 "guthrie": {
  "name": "Brett Guthrie",
  "office": "House Energy & Commerce Committee Chair",
  "state": "Kentucky",
  "party": "R",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚡",
  "issues": [
   "Energy & Grid",
   "Tech & AI",
   "Drug Prices",
   "Healthcare"
  ]
 },
 "capito": {
  "name": "Shelley Moore Capito",
  "office": "Senate Environment & Public Works Chair",
  "state": "West Virginia",
  "party": "R",
  "score": 60,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏗",
  "issues": [
   "Energy & Coal",
   "Infrastructure",
   "EPA & Deregulation",
   "Permitting"
  ]
 },
 "lankford": {
  "name": "James Lankford",
  "office": "U.S. Senator",
  "state": "Oklahoma",
  "party": "R",
  "score": 59,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🛂",
  "issues": [
   "Border Security",
   "Government Spending",
   "Energy",
   "Israel"
  ]
 },
 "ernst": {
  "name": "Joni Ernst",
  "office": "U.S. Senator",
  "state": "Iowa",
  "party": "R",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🐷",
  "issues": [
   "Government Waste",
   "Defense",
   "Agriculture",
   "Veterans"
  ]
 },
 "lummis": {
  "name": "Cynthia Lummis",
  "office": "U.S. Senator",
  "state": "Wyoming",
  "party": "R",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🪙",
  "issues": [
   "Digital Assets",
   "Energy",
   "Public Lands",
   "National Debt"
  ]
 },
 "gallego": {
  "name": "Ruben Gallego",
  "office": "U.S. Senator",
  "state": "Arizona",
  "party": "D",
  "score": 59,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🎖",
  "issues": [
   "Border Security",
   "Workers & Wages",
   "Veterans",
   "Housing"
  ]
 },
 "kaine": {
  "name": "Tim Kaine",
  "office": "U.S. Senator",
  "state": "Virginia",
  "party": "D",
  "score": 60,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🕊",
  "issues": [
   "War Powers",
   "Foreign Aid",
   "Healthcare",
   "Federal Workforce"
  ]
 },
 "schiff": {
  "name": "Adam Schiff",
  "office": "U.S. Senator",
  "state": "California",
  "party": "D",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🔎",
  "issues": [
   "AI & Tech",
   "Oversight",
   "Foreign Policy",
   "Housing"
  ]
 },
 "warner": {
  "name": "Mark Warner",
  "office": "Senate Intelligence Committee Vice Chair",
  "state": "Virginia",
  "party": "D",
  "score": 60,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🛰",
  "issues": [
   "AI & Tech",
   "Semiconductors",
   "Digital Assets",
   "National Security"
  ]
 },
 "delauro": {
  "name": "Rosa DeLauro",
  "office": "House Appropriations Ranking Member",
  "state": "Connecticut",
  "party": "D",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🧾",
  "issues": [
   "Appropriations",
   "Families & Child Tax Credit",
   "Drug Prices",
   "Trade"
  ]
 },
 "meeks": {
  "name": "Gregory Meeks",
  "office": "House Foreign Affairs Ranking Member",
  "state": "New York",
  "party": "D",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🌐",
  "issues": [
   "Foreign Policy",
   "Israel & Ukraine",
   "Diplomacy",
   "Trade"
  ]
 },
 "raskin": {
  "name": "Jamie Raskin",
  "office": "House Judiciary Ranking Member",
  "state": "Maryland",
  "party": "D",
  "score": 59,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Judiciary & Oversight",
   "Immigration",
   "AI & Tech",
   "Democracy"
  ]
 },
 "neal": {
  "name": "Richard Neal",
  "office": "House Ways & Means Ranking Member",
  "state": "Massachusetts",
  "party": "D",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "💵",
  "issues": [
   "Trade & Tariffs",
   "Taxes",
   "Social Security",
   "Healthcare"
  ]
 },
 "pallone": {
  "name": "Frank Pallone",
  "office": "House Energy & Commerce Ranking Member",
  "state": "New Jersey",
  "party": "D",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚡",
  "issues": [
   "Clean Energy",
   "AI & Privacy",
   "Drug Prices",
   "Healthcare"
  ]
 },
 "adam_smith": {
  "name": "Adam Smith",
  "office": "House Armed Services Ranking Member",
  "state": "Washington",
  "party": "D",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🛡",
  "issues": [
   "Defense",
   "Pentagon Reform",
   "Israel & Ukraine",
   "Defense Tech"
  ]
 },
 "hagerty": {
  "name": "Bill Hagerty",
  "office": "U.S. Senator",
  "state": "Tennessee",
  "party": "R",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🌐",
  "issues": [
   "Trade & Tariffs",
   "Foreign Policy",
   "Border Security",
   "Digital Assets"
  ]
 },
 "britt": {
  "name": "Katie Britt",
  "office": "U.S. Senator",
  "state": "Alabama",
  "party": "R",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Appropriations",
   "Border Security",
   "Energy",
   "Families"
  ]
 },
 "banks": {
  "name": "Jim Banks",
  "office": "U.S. Senator",
  "state": "Indiana",
  "party": "R",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🦅",
  "issues": [
   "China & Trade",
   "Defense",
   "Border Security",
   "Manufacturing"
  ]
 },
 "coons": {
  "name": "Chris Coons",
  "office": "U.S. Senator",
  "state": "Delaware",
  "party": "D",
  "score": 60,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🕊",
  "issues": [
   "Foreign Aid",
   "Israel & Ukraine",
   "Clean Energy",
   "Bipartisanship"
  ]
 },
 "reed": {
  "name": "Jack Reed",
  "office": "Senate Armed Services Ranking Member",
  "state": "Rhode Island",
  "party": "D",
  "score": 59,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🛡",
  "issues": [
   "Defense",
   "Israel & Ukraine",
   "Pentagon Oversight",
   "Veterans"
  ]
 },
 "shaheen": {
  "name": "Jeanne Shaheen",
  "office": "Senate Foreign Relations Ranking Member",
  "state": "New Hampshire",
  "party": "D",
  "score": 59,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🌐",
  "issues": [
   "Foreign Policy",
   "Israel & Ukraine",
   "Diplomacy",
   "Drug Prices"
  ]
 },
 "murray": {
  "name": "Patty Murray",
  "office": "Senate Appropriations Vice Chair",
  "state": "Washington",
  "party": "D",
  "score": 59,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🧾",
  "issues": [
   "Appropriations",
   "Child Care",
   "Healthcare",
   "Reproductive Rights"
  ]
 },
 "whitehouse": {
  "name": "Sheldon Whitehouse",
  "office": "Senate Environment & Public Works Ranking Member",
  "state": "Rhode Island",
  "party": "D",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🌊",
  "issues": [
   "Climate & Energy",
   "Campaign Finance",
   "Corporate Accountability",
   "Infrastructure"
  ]
 },
 "cantwell": {
  "name": "Maria Cantwell",
  "office": "Senate Commerce Committee Ranking Member",
  "state": "Washington",
  "party": "D",
  "score": 59,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "📡",
  "issues": [
   "AI & Tech",
   "Trade",
   "Semiconductors",
   "Aviation"
  ]
 },
 "peters": {
  "name": "Gary Peters",
  "office": "Senate Homeland Security Ranking Member",
  "state": "Michigan",
  "party": "D",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🛡",
  "issues": [
   "Border & Homeland Security",
   "AI in Government",
   "Manufacturing",
   "Cybersecurity"
  ]
 },
 "heinrich": {
  "name": "Martin Heinrich",
  "office": "Senate Energy & Natural Resources Ranking Member",
  "state": "New Mexico",
  "party": "D",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚡",
  "issues": [
   "Clean Energy",
   "Public Lands",
   "Grid",
   "Data Centers"
  ]
 },
 "moreno": {
  "name": "Bernie Moreno",
  "office": "U.S. Senator",
  "state": "Ohio",
  "party": "R",
  "score": 56,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🚗",
  "issues": [
   "Trade & Autos",
   "Border Security",
   "Digital Assets",
   "Energy"
  ]
 },
 "sheehy": {
  "name": "Tim Sheehy",
  "office": "U.S. Senator",
  "state": "Montana",
  "party": "R",
  "score": 56,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🎖",
  "issues": [
   "Defense",
   "Energy & Wildfire",
   "Border Security",
   "Spending"
  ]
 },
 "chip_roy": {
  "name": "Chip Roy",
  "office": "U.S. Representative",
  "state": "Texas",
  "party": "R",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🐍",
  "issues": [
   "Government Spending",
   "Border Security",
   "National Debt",
   "Deregulation"
  ]
 },
 "julie_fahey": {
  "name": "Julie Fahey",
  "office": "State House Speaker",
  "state": "Oregon",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Transportation",
   "Housing",
   "Medicaid",
   "Gun Safety"
  ]
 },
 "matt_ritter": {
  "name": "Matt Ritter",
  "office": "State House Speaker",
  "state": "Connecticut",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Housing",
   "Abortion Rights",
   "Fiscal Guardrails",
   "Gun Safety"
  ]
 },
 "ryan_fecteau": {
  "name": "Ryan Fecteau",
  "office": "State House Speaker",
  "state": "Maine",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Housing",
   "Abortion Rights",
   "Labor",
   "State Budget"
  ]
 },
 "james_coleman": {
  "name": "James Coleman",
  "office": "State Senate President",
  "state": "Colorado",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Education",
   "Housing",
   "Affordability",
   "Check on D.C."
  ]
 },
 "jon_patterson": {
  "name": "Jon Patterson",
  "office": "State House Speaker",
  "state": "Missouri",
  "party": "R",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Income-Tax Phase-Out",
   "Abortion",
   "Pragmatic Tone",
   "Public Safety"
  ]
 },
 "murrell_smith": {
  "name": "Murrell Smith",
  "office": "State House Speaker",
  "state": "South Carolina",
  "party": "R",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Tax Cuts",
   "Tort & Insurance",
   "Juvenile Crime",
   "Roads"
  ]
 },
 "ty_masterson": {
  "name": "Ty Masterson",
  "office": "State Senate President",
  "state": "Kansas",
  "party": "R",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Tax Relief",
   "Abortion",
   "Redistricting",
   "Overriding the Governor"
  ]
 },
 "phillip_devillier": {
  "name": "Phillip DeVillier",
  "office": "State House Speaker",
  "state": "Louisiana",
  "party": "R",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Flat Tax",
   "Tough on Crime",
   "Insurance",
   "Energy"
  ]
 },
 "nicholas_scutari": {
  "name": "Nicholas Scutari",
  "office": "State Senate President",
  "state": "New Jersey",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Legal Cannabis",
   "Gun Safety",
   "Affordability",
   "Working With the Governor"
  ]
 },
 "ron_mariano": {
  "name": "Ron Mariano",
  "office": "State House Speaker",
  "state": "Massachusetts",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Gun Safety",
   "Health-System Oversight",
   "Housing",
   "Economy"
  ]
 },
 "karen_spilka": {
  "name": "Karen Spilka",
  "office": "State Senate President",
  "state": "Massachusetts",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Mental Health",
   "Free Community College",
   "Reproductive Rights",
   "Migrant Shelter"
  ]
 },
 "bill_ferguson": {
  "name": "Bill Ferguson",
  "office": "State Senate President",
  "state": "Maryland",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Budget & Deficit",
   "Education Blueprint",
   "Tax the Wealthy",
   "Energy"
  ]
 },
 "cameron_sexton": {
  "name": "Cameron Sexton",
  "office": "State House Speaker",
  "state": "Tennessee",
  "party": "R",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Redistricting",
   "School Choice",
   "Immigration",
   "Public Safety"
  ]
 },
 "robert_stivers": {
  "name": "Robert Stivers",
  "office": "State Senate President",
  "state": "Kentucky",
  "party": "R",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Abortion",
   "Tax Cuts",
   "Overriding the Governor",
   "Kentucky GOP"
  ]
 },
 "pat_grassley": {
  "name": "Pat Grassley",
  "office": "State House Speaker",
  "state": "Iowa",
  "party": "R",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Property Taxes",
   "School Choice",
   "Biofuels",
   "Flat Tax"
  ]
 },
 "todd_huston": {
  "name": "Todd Huston",
  "office": "State House Speaker",
  "state": "Indiana",
  "party": "R",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Property Taxes",
   "Cost of Living",
   "School Choice",
   "Deregulation"
  ]
 },
 "don_scott": {
  "name": "Don Scott",
  "office": "State House Speaker",
  "state": "Virginia",
  "party": "D",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Affordability",
   "Abortion Rights",
   "Gun Safety",
   "Standing Up to D.C."
  ]
 },
 "erin_murphy": {
  "name": "Erin Murphy",
  "office": "State Senate Majority Leader",
  "state": "Minnesota",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Gun Violence Prevention",
   "Government Oversight",
   "Reproductive Rights",
   "Rural Hospitals"
  ]
 },
 "julie_mccluskie": {
  "name": "Julie McCluskie",
  "office": "State House Speaker",
  "state": "Colorado",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Public Schools",
   "Housing",
   "Health-Care Costs",
   "Climate"
  ]
 },
 "laurie_jinkins": {
  "name": "Laurie Jinkins",
  "office": "State House Speaker",
  "state": "Washington",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Housing",
   "Tax the Wealthy",
   "Climate",
   "Public Health"
  ]
 },
 "matt_huffman": {
  "name": "Matt Huffman",
  "office": "State House Speaker",
  "state": "Ohio",
  "party": "R",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Flat Tax",
   "Property Tax",
   "School Choice",
   "Redistricting"
  ]
 },
 "rob_mccolley": {
  "name": "Rob McColley",
  "office": "State Senate President",
  "state": "Ohio",
  "party": "R",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Flat-Tax Budget",
   "Property Tax",
   "Marijuana & Hemp",
   "Energy"
  ]
 },
 "lisa_demuth": {
  "name": "Lisa Demuth",
  "office": "State House Speaker",
  "state": "Minnesota",
  "party": "R",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Fraud Oversight",
   "Tax Restraint",
   "Parental Rights",
   "Divided Government"
  ]
 },
 "sharon_carson": {
  "name": "Sharon Carson",
  "office": "State Senate President",
  "state": "New Hampshire",
  "party": "R",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "No Income/Sales Tax",
   "School Choice",
   "Public Safety",
   "Parental Rights"
  ]
 },
 "gene_wu": {
  "name": "Gene Wu",
  "office": "State House Democratic Caucus Chair",
  "state": "Texas",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Redistricting",
   "Public Schools",
   "Gun Safety",
   "Immigration"
  ]
 },
 "jay_costa": {
  "name": "Jay Costa",
  "office": "State Senate Democratic Leader",
  "state": "Pennsylvania",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "State Budget",
   "Public Schools",
   "Gun Safety",
   "Minimum Wage"
  ]
 },
 "ranjeev_puri": {
  "name": "Ranjeev Puri",
  "office": "State House Democratic Leader",
  "state": "Michigan",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Gun Safety",
   "Labor",
   "Reproductive Rights",
   "Budget Oversight"
  ]
 },
 "greta_neubauer": {
  "name": "Greta Neubauer",
  "office": "State Assembly Minority Leader",
  "state": "Wisconsin",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Fair Maps",
   "Reproductive Rights",
   "Climate",
   "Public Schools"
  ]
 },
 "heath_flora": {
  "name": "Heath Flora",
  "office": "State Assembly Republican Leader",
  "state": "California",
  "party": "R",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Cost of Living",
   "Public Safety",
   "Water Storage",
   "Small Business"
  ]
 },
 "destin_hall": {
  "name": "Destin Hall",
  "office": "State House Speaker",
  "state": "North Carolina",
  "party": "R",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Helene Recovery",
   "Tax Cuts",
   "Redistricting",
   "School Choice"
  ]
 },
 "jon_burns": {
  "name": "Jon Burns",
  "office": "State House Speaker",
  "state": "Georgia",
  "party": "R",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Tort Reform",
   "Tax Cuts",
   "School Safety",
   "School Choice"
  ]
 },
 "bryan_hughes": {
  "name": "Bryan Hughes",
  "office": "State Senator",
  "state": "Texas",
  "party": "R",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Abortion",
   "Election Law",
   "Big Tech & Speech",
   "Parental Rights"
  ]
 },
 "joanna_mcclinton": {
  "name": "Joanna McClinton",
  "office": "State House Speaker",
  "state": "Pennsylvania",
  "party": "D",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Public Schools",
   "Abortion Rights",
   "Gun Safety",
   "Minimum Wage"
  ]
 },
 "winnie_brinks": {
  "name": "Winnie Brinks",
  "office": "State Senate Majority Leader",
  "state": "Michigan",
  "party": "D",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Abortion Rights",
   "Gun Safety",
   "Labor",
   "Clean Energy"
  ]
 },
 "don_harmon": {
  "name": "Don Harmon",
  "office": "State Senate President",
  "state": "Illinois",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Abortion Rights",
   "Gun Safety",
   "State Budget",
   "Workers"
  ]
 },
 "chris_welch": {
  "name": "Emanuel \"Chris\" Welch",
  "office": "State House Speaker",
  "state": "Illinois",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Ethics Reform",
   "Abortion Rights",
   "Labor",
   "Public Schools"
  ]
 },
 "nicole_cannizzaro": {
  "name": "Nicole Cannizzaro",
  "office": "State Senate Majority Leader",
  "state": "Nevada",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Abortion Rights",
   "Workers",
   "Public Education",
   "Gun Safety"
  ]
 },
 "kim_ward": {
  "name": "Kim Ward",
  "office": "State Senate President pro Tempore",
  "state": "Pennsylvania",
  "party": "R",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Natural Gas & Energy",
   "Fiscal Restraint",
   "Election Law",
   "School Choice"
  ]
 },
 "matt_hall": {
  "name": "Matt Hall",
  "office": "State House Speaker",
  "state": "Michigan",
  "party": "R",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Road Funding",
   "Tax Relief",
   "Spending Oversight",
   "Energy"
  ]
 },
 "phil_berger": {
  "name": "Phil Berger",
  "office": "State Senate President pro Tempore",
  "state": "North Carolina",
  "party": "R",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Flat Tax",
   "Abortion",
   "School Choice",
   "Redistricting"
  ]
 },
 "robin_vos": {
  "name": "Robin Vos",
  "office": "State Assembly Speaker",
  "state": "Wisconsin",
  "party": "R",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Tax Cuts",
   "Act 10 & Labor",
   "School Choice",
   "Elections"
  ]
 },
 "warren_petersen": {
  "name": "Warren Petersen",
  "office": "State Senate President",
  "state": "Arizona",
  "party": "R",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Border",
   "Flat Tax",
   "School Choice",
   "Election Integrity"
  ]
 },
 "dana_nessel": {
  "name": "Dana Nessel",
  "office": "Attorney General",
  "state": "Michigan",
  "party": "D",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Line 5 & Environment",
   "Abortion Rights",
   "LGBTQ Rights",
   "Consumer Protection"
  ]
 },
 "josh_kaul": {
  "name": "Josh Kaul",
  "office": "Attorney General",
  "state": "Wisconsin",
  "party": "D",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Abortion",
   "Election Administration",
   "Opioid Settlements",
   "Gun Safety"
  ]
 },
 "jeff_jackson": {
  "name": "Jeff Jackson",
  "office": "Attorney General",
  "state": "North Carolina",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Fentanyl & Scams",
   "Consumer Protection",
   "Abortion",
   "Defending State Interests"
  ]
 },
 "aaron_ford": {
  "name": "Aaron Ford",
  "office": "Attorney General",
  "state": "Nevada",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Abortion Rights",
   "Consumer & Big Tech",
   "Immigration",
   "Fentanyl"
  ]
 },
 "dave_sunday": {
  "name": "Dave Sunday",
  "office": "Attorney General",
  "state": "Pennsylvania",
  "party": "R",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Fentanyl & Public Safety",
   "Consumer Protection",
   "Working Across the Aisle",
   "Immigration"
  ]
 },
 "james_uthmeier": {
  "name": "James Uthmeier",
  "office": "Attorney General",
  "state": "Florida",
  "party": "R",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Immigration Enforcement",
   "Abortion",
   "Big Tech & Kids",
   "Public Safety"
  ]
 },
 "jonathan_skrmetti": {
  "name": "Jonathan Skrmetti",
  "office": "Attorney General",
  "state": "Tennessee",
  "party": "R",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Youth Gender Care",
   "Big Tech & Consumer",
   "Abortion",
   "Federal Overreach"
  ]
 },
 "kris_kobach": {
  "name": "Kris Kobach",
  "office": "Attorney General",
  "state": "Kansas",
  "party": "R",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Immigration Enforcement",
   "Abortion",
   "Federal Overreach",
   "Election Integrity"
  ]
 },
 "zohran_mamdani": {
  "name": "Zohran Mamdani",
  "office": "Mayor of New York City",
  "state": "New York",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🗽",
  "issues": [
   "Affordability",
   "Housing & Rent",
   "Immigration",
   "Public Safety"
  ]
 },
 "karen_bass": {
  "name": "Karen Bass",
  "office": "Mayor of Los Angeles",
  "state": "California",
  "party": "D",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🌴",
  "issues": [
   "Homelessness",
   "Immigration",
   "Wildfire Recovery",
   "Public Safety"
  ]
 },
 "brandon_johnson": {
  "name": "Brandon Johnson",
  "office": "Mayor of Chicago",
  "state": "Illinois",
  "party": "D",
  "score": 52,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🌆",
  "issues": [
   "Sanctuary City",
   "Policing Reform",
   "Public Schools",
   "Taxes"
  ]
 },
 "john_whitmire": {
  "name": "John Whitmire",
  "office": "Mayor of Houston",
  "state": "Texas",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🤠",
  "issues": [
   "Public Safety",
   "Budget",
   "City Services",
   "Immigration"
  ]
 },
 "daniel_lurie": {
  "name": "Daniel Lurie",
  "office": "Mayor of San Francisco",
  "state": "California",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🌉",
  "issues": [
   "Fentanyl Crisis",
   "Public Safety",
   "Downtown Recovery",
   "Housing"
  ]
 },
 "cherelle_parker": {
  "name": "Cherelle Parker",
  "office": "Mayor of Philadelphia",
  "state": "Pennsylvania",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🔔",
  "issues": [
   "Public Safety",
   "Addiction",
   "Housing",
   "Public Schools"
  ]
 },
 "mike_johnston": {
  "name": "Mike Johnston",
  "office": "Mayor of Denver",
  "state": "Colorado",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏔",
  "issues": [
   "Homelessness",
   "Migrant Influx",
   "Public Safety",
   "Budget"
  ]
 },
 "kate_gallego": {
  "name": "Kate Gallego",
  "office": "Mayor of Phoenix",
  "state": "Arizona",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🌵",
  "issues": [
   "Water & Heat",
   "Housing",
   "Immigration",
   "Economy"
  ]
 },
 "mattie_parker": {
  "name": "Mattie Parker",
  "office": "Mayor of Fort Worth",
  "state": "Texas",
  "party": "R",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⭐",
  "issues": [
   "Public Safety",
   "Low Taxes",
   "Education",
   "Growth"
  ]
 },
 "eric_johnson_dallas": {
  "name": "Eric Johnson",
  "office": "Mayor of Dallas",
  "state": "Texas",
  "party": "R",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🐴",
  "issues": [
   "Public Safety",
   "Tax Cuts",
   "Growth",
   "Leaner Government"
  ]
 },
 "dan_patrick": {
  "name": "Dan Patrick",
  "office": "Lieutenant Governor",
  "state": "Texas",
  "party": "R",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⭐",
  "issues": [
   "Border",
   "Abortion",
   "School Choice",
   "Property Tax"
  ]
 },
 "dustin_burrows": {
  "name": "Dustin Burrows",
  "office": "State House Speaker",
  "state": "Texas",
  "party": "R",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🤠",
  "issues": [
   "School Choice",
   "Property Tax",
   "Border",
   "Water"
  ]
 },
 "mike_mcguire": {
  "name": "Mike McGuire",
  "office": "State Senate President pro Tem",
  "state": "California",
  "party": "D",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🐻",
  "issues": [
   "Climate",
   "Abortion Rights",
   "Housing",
   "Gun Safety"
  ]
 },
 "robert_rivas": {
  "name": "Robert Rivas",
  "office": "State Assembly Speaker",
  "state": "California",
  "party": "D",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🌾",
  "issues": [
   "Housing",
   "Climate",
   "Abortion Rights",
   "Immigration"
  ]
 },
 "ben_albritton": {
  "name": "Ben Albritton",
  "office": "State Senate President",
  "state": "Florida",
  "party": "R",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🍊",
  "issues": [
   "Immigration",
   "Taxes",
   "Rural Investment",
   "School Choice"
  ]
 },
 "daniel_perez_fl": {
  "name": "Daniel Perez",
  "office": "State House Speaker",
  "state": "Florida",
  "party": "R",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🐊",
  "issues": [
   "Tax Cuts",
   "Government Oversight",
   "Immigration",
   "School Choice"
  ]
 },
 "stewart_cousins": {
  "name": "Andrea Stewart-Cousins",
  "office": "State Senate Majority Leader",
  "state": "New York",
  "party": "D",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🗽",
  "issues": [
   "Abortion Rights",
   "Gun Safety",
   "Housing",
   "Climate"
  ]
 },
 "carl_heastie": {
  "name": "Carl Heastie",
  "office": "State Assembly Speaker",
  "state": "New York",
  "party": "D",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏙",
  "issues": [
   "Taxes",
   "Criminal Justice",
   "Abortion Rights",
   "Housing"
  ]
 },
 "don_bacon": {
  "name": "Don Bacon",
  "office": "U.S. Representative",
  "state": "Nebraska",
  "party": "R",
  "score": 56,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🎖",
  "issues": [
   "Ukraine & Defense",
   "Bipartisan Deals",
   "Israel",
   "Border"
  ]
 },
 "tom_suozzi": {
  "name": "Tom Suozzi",
  "office": "U.S. Representative",
  "state": "New York",
  "party": "D",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Border",
   "Israel",
   "SALT & Taxes",
   "Abortion Rights"
  ]
 },
 "rob_bonta": {
  "name": "Rob Bonta",
  "office": "Attorney General",
  "state": "California",
  "party": "D",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Challenging Federal Actions",
   "Abortion Rights",
   "Climate",
   "Big Tech"
  ]
 },
 "letitia_james": {
  "name": "Letitia James",
  "office": "Attorney General",
  "state": "New York",
  "party": "D",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Corporate Accountability",
   "Abortion Rights",
   "Gun Industry",
   "Consumer Protection"
  ]
 },
 "keith_ellison": {
  "name": "Keith Ellison",
  "office": "Attorney General",
  "state": "Minnesota",
  "party": "D",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Police Accountability",
   "Drug Prices",
   "Abortion Rights",
   "Consumer Protection"
  ]
 },
 "kwame_raoul": {
  "name": "Kwame Raoul",
  "office": "Attorney General",
  "state": "Illinois",
  "party": "D",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Reproductive Rights",
   "Gun Safety",
   "Environment",
   "Immigration"
  ]
 },
 "kris_mayes": {
  "name": "Kris Mayes",
  "office": "Attorney General",
  "state": "Arizona",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Abortion Rights",
   "Election Integrity",
   "Water Security",
   "Immigration"
  ]
 },
 "raul_labrador": {
  "name": "Raúl Labrador",
  "office": "Attorney General",
  "state": "Idaho",
  "party": "R",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Abortion",
   "Immigration",
   "Federal Land Rules",
   "Youth Gender Care"
  ]
 },
 "liz_murrill": {
  "name": "Liz Murrill",
  "office": "Attorney General",
  "state": "Louisiana",
  "party": "R",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Abortion",
   "Religion in Schools",
   "Oil & Gas",
   "Immigration"
  ]
 },
 "chris_carr": {
  "name": "Chris Carr",
  "office": "Attorney General",
  "state": "Georgia",
  "party": "R",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Election Law",
   "Gang Prosecution",
   "Abortion",
   "Immigration"
  ]
 },
 "brenna_bird": {
  "name": "Brenna Bird",
  "office": "Attorney General",
  "state": "Iowa",
  "party": "R",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Immigration",
   "Abortion",
   "Biofuels & Federal Rules",
   "Crime"
  ]
 },
 "dave_yost": {
  "name": "Dave Yost",
  "office": "Attorney General",
  "state": "Ohio",
  "party": "R",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Opioid Settlements",
   "Abortion",
   "Federal Overreach",
   "Big Tech"
  ]
 },
 "dunleavy": {
  "name": "Mike Dunleavy",
  "office": "Governor",
  "state": "Alaska",
  "party": "R",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🐻",
  "issues": [
   "Energy & Oil",
   "Permanent Fund Dividend",
   "School Choice",
   "Public Safety"
  ]
 },
 "ned_lamont": {
  "name": "Ned Lamont",
  "office": "Governor",
  "state": "Connecticut",
  "party": "D",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⛵",
  "issues": [
   "Fiscal Guardrails",
   "Abortion Rights",
   "Gun Safety",
   "Middle-Class Taxes"
  ]
 },
 "matt_meyer": {
  "name": "Matt Meyer",
  "office": "Governor",
  "state": "Delaware",
  "party": "D",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🐔",
  "issues": [
   "Public Schools",
   "Abortion Rights",
   "Gun Safety",
   "Housing"
  ]
 },
 "brad_little": {
  "name": "Brad Little",
  "office": "Governor",
  "state": "Idaho",
  "party": "R",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🥔",
  "issues": [
   "School Choice",
   "Abortion",
   "Taxes",
   "Deregulation"
  ]
 },
 "laura_kelly": {
  "name": "Laura Kelly",
  "office": "Governor",
  "state": "Kansas",
  "party": "D",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🌻",
  "issues": [
   "Medicaid Expansion",
   "Abortion Rights",
   "Tax Relief",
   "Public Schools"
  ]
 },
 "tate_reeves": {
  "name": "Tate Reeves",
  "office": "Governor",
  "state": "Mississippi",
  "party": "R",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🌸",
  "issues": [
   "Abortion",
   "Income-Tax Repeal",
   "Medicaid",
   "School Choice"
  ]
 },
 "jim_pillen": {
  "name": "Jim Pillen",
  "office": "Governor",
  "state": "Nebraska",
  "party": "R",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🌽",
  "issues": [
   "Property Taxes",
   "Abortion",
   "Taxes",
   "School Choice"
  ]
 },
 "kelly_ayotte": {
  "name": "Kelly Ayotte",
  "office": "Governor",
  "state": "New Hampshire",
  "party": "R",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🍁",
  "issues": [
   "No Income/Sales Tax",
   "School Choice",
   "Public Safety",
   "Immigration"
  ]
 },
 "kelly_armstrong": {
  "name": "Kelly Armstrong",
  "office": "Governor",
  "state": "North Dakota",
  "party": "R",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🦬",
  "issues": [
   "Energy",
   "Property Taxes",
   "Taxes",
   "Carbon Capture"
  ]
 },
 "dan_mckee": {
  "name": "Dan McKee",
  "office": "Governor",
  "state": "Rhode Island",
  "party": "D",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🌊",
  "issues": [
   "Education",
   "Housing",
   "Abortion Rights",
   "Clean Energy"
  ]
 },
 "larry_rhoden": {
  "name": "Larry Rhoden",
  "office": "Governor",
  "state": "South Dakota",
  "party": "R",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🗻",
  "issues": [
   "Abortion",
   "Property Taxes",
   "Taxes",
   "Immigration"
  ]
 },
 "phil_scott": {
  "name": "Phil Scott",
  "office": "Governor",
  "state": "Vermont",
  "party": "R",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⛷",
  "issues": [
   "Abortion Rights",
   "Gun Safety",
   "Affordability",
   "Climate"
  ]
 },
 "mark_gordon": {
  "name": "Mark Gordon",
  "office": "Governor",
  "state": "Wyoming",
  "party": "R",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🤠",
  "issues": [
   "Coal & Energy",
   "Carbon Capture",
   "Abortion",
   "Public Lands"
  ]
 },
 "evers": {
  "name": "Tony Evers",
  "office": "Governor",
  "state": "Wisconsin",
  "party": "D",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🦡",
  "issues": [
   "Public Schools",
   "Abortion Rights",
   "Healthcare",
   "Gun Safety"
  ]
 },
 "josh_stein": {
  "name": "Josh Stein",
  "office": "Governor",
  "state": "North Carolina",
  "party": "D",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🌲",
  "issues": [
   "Abortion Rights",
   "Disaster Recovery",
   "Public Schools",
   "Healthcare"
  ]
 },
 "maura_healey": {
  "name": "Maura Healey",
  "office": "Governor",
  "state": "Massachusetts",
  "party": "D",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚓",
  "issues": [
   "Abortion Rights",
   "Housing",
   "Immigration & Shelter",
   "Climate"
  ]
 },
 "tina_kotek": {
  "name": "Tina Kotek",
  "office": "Governor",
  "state": "Oregon",
  "party": "D",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🦫",
  "issues": [
   "Housing & Homelessness",
   "Addiction & Drugs",
   "Abortion Rights",
   "LGBTQ+ Rights"
  ]
 },
 "mikie_sherrill": {
  "name": "Mikie Sherrill",
  "office": "Governor",
  "state": "New Jersey",
  "party": "D",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "✈️",
  "issues": [
   "Affordability",
   "Energy Costs",
   "Abortion Rights",
   "Gun Safety"
  ]
 },
 "joe_lombardo": {
  "name": "Joe Lombardo",
  "office": "Governor",
  "state": "Nevada",
  "party": "R",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🎰",
  "issues": [
   "School Choice",
   "Public Safety",
   "Border",
   "Taxes"
  ]
 },
 "bill_lee": {
  "name": "Bill Lee",
  "office": "Governor",
  "state": "Tennessee",
  "party": "R",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🎸",
  "issues": [
   "School Vouchers",
   "Abortion",
   "Immigration",
   "Energy"
  ]
 },
 "henry_mcmaster": {
  "name": "Henry McMaster",
  "office": "Governor",
  "state": "South Carolina",
  "party": "R",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🌴",
  "issues": [
   "Abortion",
   "School Choice",
   "Energy",
   "Taxes"
  ]
 },
 "mike_kehoe": {
  "name": "Mike Kehoe",
  "office": "Governor",
  "state": "Missouri",
  "party": "R",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🌉",
  "issues": [
   "Crime",
   "Abortion",
   "Taxes",
   "Immigration"
  ]
 },
 "kay_ivey": {
  "name": "Kay Ivey",
  "office": "Governor",
  "state": "Alabama",
  "party": "R",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🐘",
  "issues": [
   "Abortion",
   "IVF",
   "School Choice",
   "Taxes"
  ]
 },
 "kevin_stitt": {
  "name": "Kevin Stitt",
  "office": "Governor",
  "state": "Oklahoma",
  "party": "R",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🛢",
  "issues": [
   "Energy",
   "School Choice",
   "Taxes",
   "Border"
  ]
 },
 "kim_reynolds": {
  "name": "Kim Reynolds",
  "office": "Governor",
  "state": "Iowa",
  "party": "R",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🌽",
  "issues": [
   "School Choice",
   "Agriculture",
   "Abortion",
   "Taxes"
  ]
 },
 "patrick_morrisey": {
  "name": "Patrick Morrisey",
  "office": "Governor",
  "state": "West Virginia",
  "party": "R",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⛏",
  "issues": [
   "Energy & Coal",
   "Deregulation",
   "Border",
   "Spending"
  ]
 },
 "greg_gianforte": {
  "name": "Greg Gianforte",
  "office": "Governor",
  "state": "Montana",
  "party": "R",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏔",
  "issues": [
   "Taxes",
   "Energy",
   "Public Lands",
   "Border"
  ]
 },
 "mike_braun": {
  "name": "Mike Braun",
  "office": "Governor",
  "state": "Indiana",
  "party": "R",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏭",
  "issues": [
   "Taxes & Spending",
   "Economy",
   "Healthcare Prices",
   "Border"
  ]
 },
 "katie_hobbs": {
  "name": "Katie Hobbs",
  "office": "Governor",
  "state": "Arizona",
  "party": "D",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🌵",
  "issues": [
   "Border",
   "Abortion Rights",
   "Water",
   "Bipartisan Budgets"
  ]
 },
 "bob_ferguson": {
  "name": "Bob Ferguson",
  "office": "Governor",
  "state": "Washington",
  "party": "D",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🌲",
  "issues": [
   "Challenging Federal Actions",
   "Abortion Rights",
   "Gun Safety",
   "Climate"
  ]
 },
 "michelle_lujan_grisham": {
  "name": "Michelle Lujan Grisham",
  "office": "Governor",
  "state": "New Mexico",
  "party": "D",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏜",
  "issues": [
   "Abortion Rights",
   "Energy",
   "Border",
   "Gun Safety"
  ]
 },
 "janet_mills": {
  "name": "Janet Mills",
  "office": "Governor",
  "state": "Maine",
  "party": "D",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🦞",
  "issues": [
   "Abortion Rights",
   "Transgender Rights",
   "Energy",
   "Healthcare"
  ]
 },
 "josh_green": {
  "name": "Josh Green",
  "office": "Governor",
  "state": "Hawaii",
  "party": "D",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🌺",
  "issues": [
   "Healthcare",
   "Homelessness & Housing",
   "Climate",
   "Cost of Living"
  ]
 },
 "glenn_youngkin": {
  "name": "Glenn Youngkin",
  "office": "Governor",
  "state": "Virginia",
  "party": "R",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏔",
  "issues": [
   "Education",
   "Economy & Taxes",
   "Abortion",
   "Energy"
  ]
 },
 "brian_kemp": {
  "name": "Brian Kemp",
  "office": "Governor",
  "state": "Georgia",
  "party": "R",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🍑",
  "issues": [
   "Economy",
   "Border",
   "Abortion",
   "Election Law"
  ]
 },
 "sarah_huckabee_sanders": {
  "name": "Sarah Huckabee Sanders",
  "office": "Governor",
  "state": "Arkansas",
  "party": "R",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🎀",
  "issues": [
   "School Choice",
   "Taxes",
   "Border",
   "Abortion"
  ]
 },
 "jeff_landry": {
  "name": "Jeff Landry",
  "office": "Governor",
  "state": "Louisiana",
  "party": "R",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚜️",
  "issues": [
   "Crime",
   "Energy",
   "Border",
   "Education"
  ]
 },
 "mike_dewine": {
  "name": "Mike DeWine",
  "office": "Governor",
  "state": "Ohio",
  "party": "R",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🌰",
  "issues": [
   "Guns & Safety",
   "Fentanyl",
   "Manufacturing",
   "Education"
  ]
 },
 "tim_walz": {
  "name": "Tim Walz",
  "office": "Governor",
  "state": "Minnesota",
  "party": "D",
  "score": 56,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⭐",
  "issues": [
   "Education",
   "Healthcare",
   "Abortion Rights",
   "Gun Safety"
  ]
 },
 "wes_moore": {
  "name": "Wes Moore",
  "office": "Governor",
  "state": "Maryland",
  "party": "D",
  "score": 56,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🦀",
  "issues": [
   "Opportunity",
   "Veterans",
   "Education",
   "Public Safety"
  ]
 },
 "kathy_hochul": {
  "name": "Kathy Hochul",
  "office": "Governor",
  "state": "New York",
  "party": "D",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🗽",
  "issues": [
   "Abortion Rights",
   "Gun Safety",
   "Immigration",
   "Affordability"
  ]
 },
 "jared_polis": {
  "name": "Jared Polis",
  "office": "Governor",
  "state": "Colorado",
  "party": "D",
  "score": 56,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏔",
  "issues": [
   "Economy & Taxes",
   "Healthcare Costs",
   "Energy",
   "Immigration"
  ]
 },
 "andy_beshear": {
  "name": "Andy Beshear",
  "office": "Governor",
  "state": "Kentucky",
  "party": "D",
  "score": 56,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🔵",
  "issues": [
   "Economy & Jobs",
   "Healthcare",
   "Abortion Rights",
   "Bipartisan"
  ]
 },
 "jerome_powell": {
  "name": "Jerome Powell",
  "office": "Federal Reserve Chair",
  "state": "Federal",
  "party": "I",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏦",
  "issues": [
   "Inflation & Rates",
   "Full Employment",
   "Tariffs & Prices",
   "Digital Dollar"
  ]
 },
 "dan_bongino": {
  "name": "Dan Bongino",
  "office": "FBI Deputy Director",
  "state": "Federal",
  "party": "R",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🚔",
  "issues": [
   "Crime",
   "Back the Police",
   "Border & Fentanyl",
   "Transparency"
  ]
 },
 "kelly_loeffler": {
  "name": "Kelly Loeffler",
  "office": "SBA Administrator",
  "state": "Federal",
  "party": "R",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏢",
  "issues": [
   "Small Business",
   "Taxes",
   "Spending",
   "Energy"
  ]
 },
 "andrew_ferguson": {
  "name": "Andrew Ferguson",
  "office": "FTC Chair",
  "state": "Federal",
  "party": "R",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Big Tech & Antitrust",
   "Free Speech",
   "AI Competition",
   "Consumers"
  ]
 },
 "ron_desantis": {
  "name": "Ron DeSantis",
  "office": "Governor",
  "state": "Florida",
  "party": "R",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🌴",
  "issues": [
   "Immigration",
   "Education",
   "Abortion",
   "Spending"
  ]
 },
 "greg_abbott": {
  "name": "Greg Abbott",
  "office": "Governor",
  "state": "Texas",
  "party": "R",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🤠",
  "issues": [
   "Border",
   "Energy",
   "Abortion",
   "Business"
  ]
 },
 "gavin_newsom": {
  "name": "Gavin Newsom",
  "office": "Governor",
  "state": "California",
  "party": "D",
  "score": 56,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🐻",
  "issues": [
   "Climate & Energy",
   "Immigration",
   "Abortion Rights",
   "Clean Cars"
  ]
 },
 "gretchen_whitmer": {
  "name": "Gretchen Whitmer",
  "office": "Governor",
  "state": "Michigan",
  "party": "D",
  "score": 56,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🚗",
  "issues": [
   "Auto & Manufacturing",
   "Abortion Rights",
   "Infrastructure",
   "EV Transition"
  ]
 },
 "josh_shapiro": {
  "name": "Josh Shapiro",
  "office": "Governor",
  "state": "Pennsylvania",
  "party": "D",
  "score": 56,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🔔",
  "issues": [
   "Energy",
   "Bipartisan",
   "Education",
   "Abortion Rights"
  ]
 },
 "jb_pritzker": {
  "name": "JB Pritzker",
  "office": "Governor",
  "state": "Illinois",
  "party": "D",
  "score": 56,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Abortion Rights",
   "Immigration",
   "Taxes",
   "Infrastructure"
  ]
 },
 "ted_budd": {
  "name": "Ted Budd",
  "office": "U.S. Senator",
  "state": "North Carolina",
  "party": "R",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🔫",
  "issues": [
   "Gun Rights",
   "Energy",
   "Border",
   "Defense"
  ]
 },
 "kevin_hern": {
  "name": "Kevin Hern",
  "office": "U.S. Representative",
  "state": "Oklahoma",
  "party": "R",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🧾",
  "issues": [
   "Spending & Debt",
   "Taxes",
   "Energy",
   "Healthcare"
  ]
 },
 "nancy_mace": {
  "name": "Nancy Mace",
  "office": "U.S. Representative",
  "state": "South Carolina",
  "party": "R",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Women's Sports",
   "Oversight",
   "Border",
   "Defense"
  ]
 },
 "tommy_tuberville": {
  "name": "Tommy Tuberville",
  "office": "U.S. Senator",
  "state": "Alabama",
  "party": "R",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏈",
  "issues": [
   "Military",
   "Agriculture",
   "Border",
   "Abortion"
  ]
 },
 "ayanna_pressley": {
  "name": "Ayanna Pressley",
  "office": "U.S. Representative",
  "state": "Massachusetts",
  "party": "D",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "✊",
  "issues": [
   "Healthcare",
   "Justice Reform",
   "Student Debt",
   "Housing"
  ]
 },
 "delia_ramirez": {
  "name": "Delia Ramirez",
  "office": "U.S. Representative",
  "state": "Illinois",
  "party": "D",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏠",
  "issues": [
   "Immigration",
   "Healthcare",
   "Housing",
   "Workers"
  ]
 },
 "sarah_mcbride": {
  "name": "Sarah McBride",
  "office": "U.S. Representative",
  "state": "Delaware",
  "party": "D",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏳️‍⚧️",
  "issues": [
   "LGBTQ Rights",
   "Paid Leave",
   "Abortion Rights",
   "Workers"
  ]
 },
 "jake_auchincloss": {
  "name": "Jake Auchincloss",
  "office": "U.S. Representative",
  "state": "Massachusetts",
  "party": "D",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "💻",
  "issues": [
   "AI & Tech",
   "Israel",
   "Defense",
   "Housing"
  ]
 },
 "greg_landsman": {
  "name": "Greg Landsman",
  "office": "U.S. Representative",
  "state": "Ohio",
  "party": "D",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🤝",
  "issues": [
   "Israel",
   "Education",
   "Bipartisan",
   "Seniors"
  ]
 },
 "john_cornyn": {
  "name": "John Cornyn",
  "office": "U.S. Senator",
  "state": "Texas",
  "party": "R",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Defense",
   "Border",
   "Guns",
   "Taxes"
  ]
 },
 "tom_homan": {
  "name": "Tom Homan",
  "office": "White House Border Czar",
  "state": "Federal",
  "party": "R",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🛂",
  "issues": [
   "Border Security",
   "Deportations",
   "Fentanyl & Cartels",
   "Enforcement"
  ]
 },
 "peter_navarro": {
  "name": "Peter Navarro",
  "office": "Senior Counselor for Trade & Manufacturing",
  "state": "Federal",
  "party": "R",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏭",
  "issues": [
   "Tariffs",
   "Reshoring",
   "China Trade",
   "Trade Deficits"
  ]
 },
 "stephen_miran": {
  "name": "Stephen Miran",
  "office": "Chair, Council of Economic Advisers",
  "state": "Federal",
  "party": "R",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "📈",
  "issues": [
   "Tariffs & Trade",
   "The Dollar",
   "Deregulation",
   "Tax Cuts"
  ]
 },
 "keith_kellogg": {
  "name": "Keith Kellogg",
  "office": "Special Envoy for Ukraine & Russia",
  "state": "Federal",
  "party": "R",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🎖",
  "issues": [
   "Ukraine-Russia",
   "Defense",
   "Israel",
   "NATO"
  ]
 },
 "dan_crenshaw": {
  "name": "Dan Crenshaw",
  "office": "U.S. Representative",
  "state": "Texas",
  "party": "R",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🎖",
  "issues": [
   "Defense",
   "Energy",
   "Border",
   "Veterans"
  ]
 },
 "raja_krishnamoorthi": {
  "name": "Raja Krishnamoorthi",
  "office": "U.S. Representative",
  "state": "Illinois",
  "party": "D",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🇨🇳",
  "issues": [
   "China & CCP",
   "AI & Tech",
   "Immigration",
   "Workers"
  ]
 },
 "josh_gottheimer": {
  "name": "Josh Gottheimer",
  "office": "U.S. Representative",
  "state": "New Jersey",
  "party": "D",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🤝",
  "issues": [
   "Israel",
   "Bipartisan Fiscal",
   "SALT & Taxes",
   "National Security"
  ]
 },
 "seth_moulton": {
  "name": "Seth Moulton",
  "office": "U.S. Representative",
  "state": "Massachusetts",
  "party": "D",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🎖",
  "issues": [
   "Defense",
   "Veterans",
   "Ukraine",
   "AI & Tech"
  ]
 },
 "marie_gluesenkamp_perez": {
  "name": "Marie Gluesenkamp Perez",
  "office": "U.S. Representative",
  "state": "Washington",
  "party": "D",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🔧",
  "issues": [
   "Working Class",
   "Right to Repair",
   "Fiscal Moderate",
   "Border"
  ]
 },
 "jon_ossoff": {
  "name": "Jon Ossoff",
  "office": "U.S. Senator",
  "state": "Georgia",
  "party": "D",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "💻",
  "issues": [
   "Lowering Costs",
   "Drug Prices",
   "Anti-Corruption",
   "Voting Access"
  ]
 },
 "mehmet_oz": {
  "name": "Mehmet Oz",
  "office": "CMS Administrator",
  "state": "Federal",
  "party": "R",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "💊",
  "issues": [
   "Medicare & Medicaid",
   "Drug Prices",
   "Chronic Disease",
   "Medicaid Reform"
  ]
 },
 "marty_makary": {
  "name": "Marty Makary",
  "office": "FDA Commissioner",
  "state": "Federal",
  "party": "R",
  "score": 56,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🔬",
  "issues": [
   "Food Additives",
   "Drug Approval",
   "Nutrition",
   "Medical Freedom"
  ]
 },
 "jay_bhattacharya": {
  "name": "Jay Bhattacharya",
  "office": "NIH Director",
  "state": "Federal",
  "party": "R",
  "score": 56,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🧬",
  "issues": [
   "NIH Research",
   "Medical Freedom",
   "Chronic Disease",
   "Public Health"
  ]
 },
 "mike_rounds": {
  "name": "Mike Rounds",
  "office": "U.S. Senator",
  "state": "South Dakota",
  "party": "R",
  "score": 56,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🤖",
  "issues": [
   "AI & Tech",
   "Defense",
   "Agriculture",
   "Spending"
  ]
 },
 "kevin_cramer": {
  "name": "Kevin Cramer",
  "office": "U.S. Senator",
  "state": "North Dakota",
  "party": "R",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🛢",
  "issues": [
   "Energy",
   "Infrastructure",
   "Regulation",
   "Spending"
  ]
 },
 "jim_mcgovern": {
  "name": "Jim McGovern",
  "office": "U.S. Representative",
  "state": "Massachusetts",
  "party": "D",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🍎",
  "issues": [
   "Anti-Hunger",
   "Nutrition",
   "Democracy",
   "Human Rights"
  ]
 },
 "brendan_boyle": {
  "name": "Brendan Boyle",
  "office": "U.S. Representative",
  "state": "Pennsylvania",
  "party": "D",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🧾",
  "issues": [
   "Federal Budget",
   "Social Security",
   "Taxes",
   "Workers"
  ]
 },
 "rick_larsen": {
  "name": "Rick Larsen",
  "office": "U.S. Representative",
  "state": "Washington",
  "party": "D",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🚧",
  "issues": [
   "Transportation",
   "Transit & Rail",
   "Clean Energy",
   "China"
  ]
 },
 "jan_schakowsky": {
  "name": "Jan Schakowsky",
  "office": "U.S. Representative",
  "state": "Illinois",
  "party": "D",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "💊",
  "issues": [
   "Drug Prices",
   "Consumer Protection",
   "Healthcare",
   "Social Security"
  ]
 },
 "diana_degette": {
  "name": "Diana DeGette",
  "office": "U.S. Representative",
  "state": "Colorado",
  "party": "D",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚕️",
  "issues": [
   "Biomedical Research",
   "Abortion Rights",
   "Drug Prices",
   "Gun Safety"
  ]
 },
 "gillibrand": {
  "name": "Kirsten Gillibrand",
  "office": "U.S. Senator",
  "state": "New York",
  "party": "D",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "💧",
  "issues": [
   "PFAS & Military",
   "Defense",
   "9/11 Health",
   "Tech & AI"
  ]
 },
 "debbie_dingell": {
  "name": "Debbie Dingell",
  "office": "U.S. Representative",
  "state": "Michigan",
  "party": "D",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🚗",
  "issues": [
   "PFAS",
   "Autos & EVs",
   "Healthcare",
   "Manufacturing"
  ]
 },
 "maggie_hassan": {
  "name": "Maggie Hassan",
  "office": "U.S. Senator",
  "state": "New Hampshire",
  "party": "D",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "💧",
  "issues": [
   "PFAS & Water",
   "Fiscal Moderate",
   "Drug Prices",
   "Border"
  ]
 },
 "bennet": {
  "name": "Michael Bennet",
  "office": "U.S. Senator",
  "state": "Colorado",
  "party": "D",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏔",
  "issues": [
   "Education",
   "Immigration",
   "AI & Tech",
   "Agriculture"
  ]
 },
 "steny_hoyer": {
  "name": "Steny Hoyer",
  "office": "U.S. Representative",
  "state": "Maryland",
  "party": "D",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Appropriations",
   "Federal Workforce",
   "Israel Aid",
   "Democracy"
  ]
 },
 "deb_fischer": {
  "name": "Deb Fischer",
  "office": "U.S. Senator",
  "state": "Nebraska",
  "party": "R",
  "score": 56,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🌾",
  "issues": [
   "Defense",
   "Agriculture",
   "Transportation",
   "Spending"
  ]
 },
 "jim_justice": {
  "name": "Jim Justice",
  "office": "U.S. Senator",
  "state": "West Virginia",
  "party": "R",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⛏",
  "issues": [
   "Coal & Energy",
   "Border",
   "Spending",
   "Manufacturing"
  ]
 },
 "ashley_moody": {
  "name": "Ashley Moody",
  "office": "U.S. Senator",
  "state": "Florida",
  "party": "R",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Border & Law Enforcement",
   "Crime",
   "China",
   "Spending"
  ]
 },
 "ricketts": {
  "name": "Pete Ricketts",
  "office": "U.S. Senator",
  "state": "Nebraska",
  "party": "R",
  "score": 56,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🌐",
  "issues": [
   "Foreign Policy",
   "China",
   "Agriculture",
   "Spending"
  ]
 },
 "hoeven": {
  "name": "John Hoeven",
  "office": "U.S. Senator",
  "state": "North Dakota",
  "party": "R",
  "score": 56,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🛢",
  "issues": [
   "Energy",
   "Agriculture",
   "Indian Affairs",
   "Spending"
  ]
 },
 "andy_harris": {
  "name": "Andy Harris",
  "office": "House Freedom Caucus Chair",
  "state": "Maryland",
  "party": "R",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🚩",
  "issues": [
   "Spending",
   "Border",
   "FDA & Health",
   "Agriculture"
  ]
 },
 "mike_bost": {
  "name": "Mike Bost",
  "office": "House Veterans' Affairs Chair",
  "state": "Illinois",
  "party": "R",
  "score": 56,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🎖",
  "issues": [
   "Veterans",
   "Border",
   "Energy",
   "Manufacturing"
  ]
 },
 "brian_babin": {
  "name": "Brian Babin",
  "office": "House Science, Space & Technology Chair",
  "state": "Texas",
  "party": "R",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🚀",
  "issues": [
   "Space & NASA",
   "AI & Research",
   "Energy",
   "Border"
  ]
 },
 "roger_williams": {
  "name": "Roger Williams",
  "office": "House Small Business Chair",
  "state": "Texas",
  "party": "R",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏪",
  "issues": [
   "Small Business",
   "Taxes",
   "Deregulation",
   "Border"
  ]
 },
 "bryan_steil": {
  "name": "Bryan Steil",
  "office": "House Administration Chair",
  "state": "Wisconsin",
  "party": "R",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🗳",
  "issues": [
   "Elections",
   "Government Operations",
   "Border",
   "Economy"
  ]
 },
 "maxine_waters": {
  "name": "Maxine Waters",
  "office": "House Financial Services Ranking Member",
  "state": "California",
  "party": "D",
  "score": 56,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏦",
  "issues": [
   "Banking & Crypto",
   "Housing",
   "Consumer Protection",
   "Regulation"
  ]
 },
 "jim_himes": {
  "name": "Jim Himes",
  "office": "House Intelligence Ranking Member",
  "state": "Connecticut",
  "party": "D",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🕵",
  "issues": [
   "Intelligence",
   "National Security",
   "AI & Tech",
   "Economy"
  ]
 },
 "zoe_lofgren": {
  "name": "Zoe Lofgren",
  "office": "House Science Committee Ranking Member",
  "state": "California",
  "party": "D",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🔬",
  "issues": [
   "Science & AI",
   "Immigration",
   "Elections",
   "Digital Privacy"
  ]
 },
 "jared_huffman": {
  "name": "Jared Huffman",
  "office": "House Natural Resources Ranking Member",
  "state": "California",
  "party": "D",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🌲",
  "issues": [
   "Public Lands",
   "Clean Energy",
   "Oceans & Water",
   "Climate"
  ]
 },
 "yvette_clarke": {
  "name": "Yvette Clarke",
  "office": "Congressional Black Caucus Chair",
  "state": "New York",
  "party": "D",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "✊",
  "issues": [
   "Broadband & Tech",
   "AI Bias",
   "Healthcare",
   "Voting Rights"
  ]
 },
 "mcclain": {
  "name": "Lisa McClain",
  "office": "House Republican Conference Chair",
  "state": "Michigan",
  "party": "R",
  "score": 56,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🐘",
  "issues": [
   "Spending",
   "Border",
   "Energy",
   "Defense"
  ]
 },
 "hudson": {
  "name": "Richard Hudson",
  "office": "NRCC Chair",
  "state": "North Carolina",
  "party": "R",
  "score": 56,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🐘",
  "issues": [
   "Energy & Commerce",
   "Gun Rights",
   "Border",
   "Healthcare"
  ]
 },
 "mullin": {
  "name": "Markwayne Mullin",
  "office": "U.S. Senator",
  "state": "Oklahoma",
  "party": "R",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🔧",
  "issues": [
   "Energy",
   "Labor",
   "Border",
   "Defense"
  ]
 },
 "schmitt": {
  "name": "Eric Schmitt",
  "office": "U.S. Senator",
  "state": "Missouri",
  "party": "R",
  "score": 56,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "China & AI",
   "Big Tech",
   "Border",
   "Defense"
  ]
 },
 "luna": {
  "name": "Anna Paulina Luna",
  "office": "U.S. Representative",
  "state": "Florida",
  "party": "R",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🦅",
  "issues": [
   "Spending & Sound Money",
   "Digital Assets",
   "Border",
   "Second Amendment"
  ]
 },
 "neguse": {
  "name": "Joe Neguse",
  "office": "Assistant House Democratic Leader",
  "state": "Colorado",
  "party": "D",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏔",
  "issues": [
   "Climate & Wildfire",
   "Democracy",
   "Public Lands",
   "Small Business"
  ]
 },
 "takano": {
  "name": "Mark Takano",
  "office": "House Veterans' Affairs Ranking Member",
  "state": "California",
  "party": "D",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🎖",
  "issues": [
   "Veterans",
   "Labor & Workweek",
   "Education",
   "Healthcare"
  ]
 },
 "bobby_scott": {
  "name": "Bobby Scott",
  "office": "House Education & Workforce Ranking Member",
  "state": "Virginia",
  "party": "D",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🎓",
  "issues": [
   "Education",
   "Labor & Wages",
   "Child Care",
   "Healthcare"
  ]
 },
 "blunt_rochester": {
  "name": "Lisa Blunt Rochester",
  "office": "U.S. Senator",
  "state": "Delaware",
  "party": "D",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🌱",
  "issues": [
   "Clean Energy",
   "Healthcare",
   "Workers",
   "Federal Workforce"
  ]
 },
 "alsobrooks": {
  "name": "Angela Alsobrooks",
  "office": "U.S. Senator",
  "state": "Maryland",
  "party": "D",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "AI & Tech",
   "Housing",
   "Federal Workforce",
   "Healthcare"
  ]
 },
 "scott_turner": {
  "name": "Scott Turner",
  "office": "U.S. Secretary of Housing & Urban Development",
  "state": "Texas",
  "party": "R",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏠",
  "issues": [
   "Housing",
   "Homelessness",
   "Opportunity Zones",
   "Deregulation"
  ]
 },
 "pfluger": {
  "name": "August Pfluger",
  "office": "Republican Study Committee Chair",
  "state": "Texas",
  "party": "R",
  "score": 56,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🐘",
  "issues": [
   "Spending",
   "Energy",
   "Border",
   "National Security"
  ]
 },
 "dan_sullivan": {
  "name": "Dan Sullivan",
  "office": "U.S. Senator",
  "state": "Alaska",
  "party": "R",
  "score": 56,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🎖",
  "issues": [
   "Defense & Arctic",
   "Alaska Energy",
   "China",
   "Veterans"
  ]
 },
 "roger_marshall": {
  "name": "Roger Marshall",
  "office": "U.S. Senator",
  "state": "Kansas",
  "party": "R",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🩺",
  "issues": [
   "Healthcare",
   "Agriculture",
   "Border",
   "Spending"
  ]
 },
 "mike_lawler": {
  "name": "Mike Lawler",
  "office": "U.S. Representative",
  "state": "New York",
  "party": "R",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🤝",
  "issues": [
   "Bipartisanship",
   "Israel",
   "SALT",
   "Border"
  ]
 },
 "summer_lee": {
  "name": "Summer Lee",
  "office": "U.S. Representative",
  "state": "Pennsylvania",
  "party": "D",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🌿",
  "issues": [
   "Israel & Gaza",
   "Workers",
   "Environmental Justice",
   "Healthcare"
  ]
 },
 "hickenlooper": {
  "name": "John Hickenlooper",
  "office": "U.S. Senator",
  "state": "Colorado",
  "party": "D",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🍺",
  "issues": [
   "Energy",
   "AI & Innovation",
   "Small Business",
   "Immigration"
  ]
 },
 "welch": {
  "name": "Peter Welch",
  "office": "U.S. Senator",
  "state": "Vermont",
  "party": "D",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🧾",
  "issues": [
   "Drug Prices",
   "Consumer & Antitrust",
   "Agriculture",
   "Climate"
  ]
 },
 "tina_smith": {
  "name": "Tina Smith",
  "office": "U.S. Senator",
  "state": "Minnesota",
  "party": "D",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🌾",
  "issues": [
   "Health & Mental Health",
   "Housing",
   "Clean Energy",
   "Agriculture"
  ]
 },
 "maxwell_frost": {
  "name": "Maxwell Frost",
  "office": "U.S. Representative",
  "state": "Florida",
  "party": "D",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🎸",
  "issues": [
   "Gun Safety",
   "Climate",
   "Youth & Democracy",
   "Healthcare"
  ]
 },
 "daines": {
  "name": "Steve Daines",
  "office": "U.S. Senator",
  "state": "Montana",
  "party": "R",
  "score": 56,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏔",
  "issues": [
   "Energy & Mining",
   "Trade & China",
   "Spending",
   "Public Lands"
  ]
 },
 "walberg": {
  "name": "Tim Walberg",
  "office": "House Education & Workforce Chair",
  "state": "Michigan",
  "party": "R",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🎓",
  "issues": [
   "Education",
   "School Choice",
   "Higher-Ed Reform",
   "Labor"
  ]
 },
 "garbarino": {
  "name": "Andrew Garbarino",
  "office": "House Homeland Security Chair",
  "state": "New York",
  "party": "R",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🛡",
  "issues": [
   "Cybersecurity",
   "Border",
   "SALT",
   "Resilience"
  ]
 },
 "paul_atkins": {
  "name": "Paul Atkins",
  "office": "SEC Chair",
  "state": "Federal",
  "party": "R",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "📊",
  "issues": [
   "Digital Assets",
   "Capital Markets",
   "Deregulation",
   "ESG Rules"
  ]
 },
 "brendan_carr": {
  "name": "Brendan Carr",
  "office": "FCC Chair",
  "state": "Federal",
  "party": "R",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "📡",
  "issues": [
   "Broadband",
   "Big Tech & 230",
   "Spectrum & AI",
   "Deregulation"
  ]
 },
 "delbene": {
  "name": "Suzan DelBene",
  "office": "DCCC Chair",
  "state": "Washington",
  "party": "D",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "💻",
  "issues": [
   "Tech & AI",
   "Trade",
   "Data Privacy",
   "Healthcare"
  ]
 },
 "andy_kim": {
  "name": "Andy Kim",
  "office": "U.S. Senator",
  "state": "New Jersey",
  "party": "D",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🕊",
  "issues": [
   "Foreign Policy",
   "Government Reform",
   "Israel & Gaza",
   "Healthcare"
  ]
 },
 "hirono": {
  "name": "Mazie Hirono",
  "office": "U.S. Senator",
  "state": "Hawaii",
  "party": "D",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Judiciary & Courts",
   "Immigration",
   "Reproductive Rights",
   "Veterans"
  ]
 },
 "rosen": {
  "name": "Jacky Rosen",
  "office": "U.S. Senator",
  "state": "Nevada",
  "party": "D",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "💻",
  "issues": [
   "Tech & AI",
   "Israel",
   "Clean Energy",
   "Healthcare"
  ]
 },
 "dan_goldman": {
  "name": "Dan Goldman",
  "office": "U.S. Representative",
  "state": "New York",
  "party": "D",
  "score": 56,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🔎",
  "issues": [
   "Oversight & Rule of Law",
   "Gun Safety",
   "Israel",
   "Democracy"
  ]
 },
 "chavez_deremer": {
  "name": "Lori Chavez-DeRemer",
  "office": "U.S. Secretary of Labor",
  "state": "Oregon",
  "party": "R",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🧰",
  "issues": [
   "Workers & Unions",
   "Apprenticeships",
   "Trade & Jobs",
   "Workplace Rules"
  ]
 },
 "doug_collins": {
  "name": "Doug Collins",
  "office": "U.S. Secretary of Veterans Affairs",
  "state": "Georgia",
  "party": "R",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🎖",
  "issues": [
   "Veterans & VA Health",
   "VA Reform",
   "Community Care",
   "Mental Health"
  ]
 },
 "mike_waltz": {
  "name": "Mike Waltz",
  "office": "U.S. Ambassador to the United Nations",
  "state": "Florida",
  "party": "R",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🌐",
  "issues": [
   "Foreign Policy",
   "Israel",
   "Ukraine & Russia",
   "China"
  ]
 },
 "ron_johnson": {
  "name": "Ron Johnson",
  "office": "U.S. Senator",
  "state": "Wisconsin",
  "party": "R",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "📉",
  "issues": [
   "Spending & Debt",
   "Oversight",
   "Medical Freedom",
   "Border"
  ]
 },
 "todd_young": {
  "name": "Todd Young",
  "office": "U.S. Senator",
  "state": "Indiana",
  "party": "R",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "💡",
  "issues": [
   "AI & Innovation",
   "China",
   "Semiconductors",
   "Foreign Policy"
  ]
 },
 "blumenthal": {
  "name": "Richard Blumenthal",
  "office": "U.S. Senator",
  "state": "Connecticut",
  "party": "D",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "AI Regulation",
   "Kids Online Safety",
   "Consumer & Antitrust",
   "Gun Safety"
  ]
 },
 "merkley": {
  "name": "Jeff Merkley",
  "office": "U.S. Senator",
  "state": "Oregon",
  "party": "D",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🌎",
  "issues": [
   "Climate & Energy",
   "Campaign Finance",
   "Senate Reform",
   "Housing"
  ]
 },
 "tlaib": {
  "name": "Rashida Tlaib",
  "office": "U.S. Representative",
  "state": "Michigan",
  "party": "D",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🌿",
  "issues": [
   "Israel & Gaza",
   "Auto Workers",
   "Cost of Living",
   "Civil Liberties"
  ]
 },
 "nadler": {
  "name": "Jerry Nadler",
  "office": "U.S. Representative",
  "state": "New York",
  "party": "D",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Rule of Law",
   "Civil Liberties",
   "Oversight",
   "Gun Safety"
  ]
 },
 "jared_golden": {
  "name": "Jared Golden",
  "office": "U.S. Representative",
  "state": "Maine",
  "party": "D",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚓",
  "issues": [
   "Tariffs & Trade",
   "Manufacturing",
   "Fiscal Restraint",
   "Defense"
  ]
 },
 "witkoff": {
  "name": "Steve Witkoff",
  "office": "U.S. Special Envoy to the Middle East",
  "state": "New York",
  "party": "R",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🕊",
  "issues": [
   "Middle East Diplomacy",
   "Israel & Gaza",
   "Iran",
   "Ukraine Talks"
  ]
 },
 "hassett": {
  "name": "Kevin Hassett",
  "office": "Director, National Economic Council",
  "state": "Massachusetts",
  "party": "R",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "📈",
  "issues": [
   "Economy & Growth",
   "Tariffs",
   "Taxes",
   "The Fed"
  ]
 },
 "mcmahon": {
  "name": "Linda McMahon",
  "office": "U.S. Secretary of Education",
  "state": "Connecticut",
  "party": "R",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🎓",
  "issues": [
   "Dept. of Education",
   "School Choice",
   "Student Loans",
   "Parental Rights"
  ]
 },
 "tillis": {
  "name": "Thom Tillis",
  "office": "U.S. Senator",
  "state": "North Carolina",
  "party": "R",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Independent Streak",
   "Defense",
   "Immigration",
   "Spending"
  ]
 },
 "fitzpatrick": {
  "name": "Brian Fitzpatrick",
  "office": "U.S. Representative",
  "state": "Pennsylvania",
  "party": "R",
  "score": 59,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🤝",
  "issues": [
   "Bipartisanship",
   "Ukraine",
   "Border",
   "Energy"
  ]
 },
 "lujan": {
  "name": "Ben Ray Luján",
  "office": "Assistant Senate Democratic Leader",
  "state": "New Mexico",
  "party": "D",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "📶",
  "issues": [
   "Broadband",
   "Healthcare",
   "Clean Energy",
   "Border"
  ]
 },
 "torres": {
  "name": "Ritchie Torres",
  "office": "U.S. Representative",
  "state": "New York",
  "party": "D",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🗽",
  "issues": [
   "Israel Aid",
   "Housing",
   "Crypto",
   "Anti-Poverty"
  ]
 },
 "omar": {
  "name": "Ilhan Omar",
  "office": "U.S. Representative",
  "state": "Minnesota",
  "party": "D",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🌍",
  "issues": [
   "Israel & Gaza",
   "Immigration",
   "Workers",
   "Healthcare"
  ]
 },
 "markey": {
  "name": "Ed Markey",
  "office": "U.S. Senator",
  "state": "Massachusetts",
  "party": "D",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🌎",
  "issues": [
   "Climate",
   "Clean Energy",
   "Tech & AI",
   "Privacy"
  ]
 },
 "clyburn": {
  "name": "Jim Clyburn",
  "office": "U.S. Representative",
  "state": "South Carolina",
  "party": "D",
  "score": 59,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🗳",
  "issues": [
   "Voting Rights",
   "Rural Infrastructure",
   "Healthcare",
   "HBCUs"
  ]
 },
 "greer": {
  "name": "Jamieson Greer",
  "office": "U.S. Trade Representative",
  "state": "Federal",
  "party": "R",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "📦",
  "issues": [
   "Tariffs & Trade",
   "China",
   "Reshoring",
   "Trade Deals"
  ]
 },
 "stephen_miller": {
  "name": "Stephen Miller",
  "office": "White House Deputy Chief of Staff",
  "state": "California",
  "party": "R",
  "score": 53,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🛂",
  "issues": [
   "Immigration",
   "Border",
   "Deportations",
   "Executive Power"
  ]
 },
 "blackburn": {
  "name": "Marsha Blackburn",
  "office": "U.S. Senator",
  "state": "Tennessee",
  "party": "R",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🎸",
  "issues": [
   "Kids Online Safety & AI",
   "Border",
   "Spending",
   "Data Privacy"
  ]
 },
 "rick_scott": {
  "name": "Rick Scott",
  "office": "U.S. Senator",
  "state": "Florida",
  "party": "R",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "📉",
  "issues": [
   "Spending & Debt",
   "Healthcare",
   "Border",
   "China"
  ]
 },
 "foxx": {
  "name": "Virginia Foxx",
  "office": "House Rules Committee Chair",
  "state": "North Carolina",
  "party": "R",
  "score": 56,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "📜",
  "issues": [
   "Higher-Ed Reform",
   "Workforce",
   "Spending",
   "House Rules"
  ]
 },
 "casar": {
  "name": "Greg Casar",
  "office": "Congressional Progressive Caucus Chair",
  "state": "Texas",
  "party": "D",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "✊",
  "issues": [
   "Workers & Wages",
   "AI & Automation",
   "Immigration",
   "Healthcare"
  ]
 },
 "ted_lieu": {
  "name": "Ted Lieu",
  "office": "House Democratic Caucus Vice Chair",
  "state": "California",
  "party": "D",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "💻",
  "issues": [
   "AI & Tech",
   "Oversight",
   "Foreign Policy",
   "Data Privacy"
  ]
 },
 "angus_king": {
  "name": "Angus King",
  "office": "U.S. Senator (Independent)",
  "state": "Maine",
  "party": "I",
  "score": 60,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🧭",
  "issues": [
   "Energy & Grid",
   "Intelligence",
   "Israel & Ukraine",
   "Institutions"
  ]
 },
 "schatz": {
  "name": "Brian Schatz",
  "office": "U.S. Senator",
  "state": "Hawaii",
  "party": "D",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🌊",
  "issues": [
   "Climate & Energy",
   "Tech & AI",
   "Foreign Aid",
   "Housing"
  ]
 },
 "robert_garcia": {
  "name": "Robert Garcia",
  "office": "House Oversight Ranking Member",
  "state": "California",
  "party": "D",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🔎",
  "issues": [
   "Oversight",
   "Immigration",
   "Democracy",
   "LGBTQ Rights"
  ]
 },
 "aguilar": {
  "name": "Pete Aguilar",
  "office": "House Democratic Caucus Chair",
  "state": "California",
  "party": "D",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Appropriations",
   "Democracy",
   "Immigration",
   "Healthcare"
  ]
 },
 "jayapal": {
  "name": "Pramila Jayapal",
  "office": "U.S. Representative",
  "state": "Washington",
  "party": "D",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "✊",
  "issues": [
   "Healthcare",
   "Immigration",
   "Israel & Gaza",
   "Workers & AI"
  ]
 },
 "van_hollen": {
  "name": "Chris Van Hollen",
  "office": "U.S. Senator",
  "state": "Maryland",
  "party": "D",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🌐",
  "issues": [
   "Israel Aid & Conditions",
   "Foreign Aid",
   "Federal Workforce",
   "Spending"
  ]
 },
 "padilla": {
  "name": "Alex Padilla",
  "office": "U.S. Senator",
  "state": "California",
  "party": "D",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🌉",
  "issues": [
   "Immigration",
   "Border",
   "AI & Tech",
   "Clean Energy"
  ]
 },
 "warnock": {
  "name": "Raphael Warnock",
  "office": "U.S. Senator",
  "state": "Georgia",
  "party": "D",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⛪",
  "issues": [
   "Healthcare",
   "Voting Rights",
   "Drug Prices",
   "Israel Aid"
  ]
 },
 "duckworth": {
  "name": "Tammy Duckworth",
  "office": "U.S. Senator",
  "state": "Illinois",
  "party": "D",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🎖",
  "issues": [
   "Defense & Veterans",
   "Israel & Ukraine",
   "Aviation",
   "Manufacturing"
  ]
 },
 "patel": {
  "name": "Kash Patel",
  "office": "FBI Director",
  "state": "New York",
  "party": "R",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🔍",
  "issues": [
   "Law Enforcement",
   "FBI Reform",
   "Fentanyl & Cartels",
   "Transparency"
  ]
 },
 "ratcliffe": {
  "name": "John Ratcliffe",
  "office": "CIA Director",
  "state": "Texas",
  "party": "R",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🕵",
  "issues": [
   "Intelligence",
   "China",
   "Iran & Israel",
   "National Security"
  ]
 },
 "donalds": {
  "name": "Byron Donalds",
  "office": "U.S. Representative",
  "state": "Florida",
  "party": "R",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🐊",
  "issues": [
   "Spending & Debt",
   "Energy",
   "Border",
   "School Choice"
  ]
 },
 "stefanik": {
  "name": "Elise Stefanik",
  "office": "U.S. Representative",
  "state": "New York",
  "party": "R",
  "score": 55,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🍎",
  "issues": [
   "Israel",
   "Border",
   "Spending",
   "Agriculture"
  ]
 },
 "boozman": {
  "name": "John Boozman",
  "office": "Senate Agriculture Chair",
  "state": "Arkansas",
  "party": "R",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🌾",
  "issues": [
   "Farm Bill",
   "Agriculture & Trade",
   "SNAP",
   "Biofuels"
  ]
 },
 "cassidy": {
  "name": "Bill Cassidy",
  "office": "Senate HELP Committee Chair",
  "state": "Louisiana",
  "party": "R",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚕️",
  "issues": [
   "Social Security",
   "Healthcare",
   "Drug Prices",
   "Energy"
  ]
 },
 "sam_graves": {
  "name": "Sam Graves",
  "office": "House Transportation & Infrastructure Chair",
  "state": "Missouri",
  "party": "R",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🚧",
  "issues": [
   "Infrastructure",
   "Permitting",
   "Aviation",
   "Waterways"
  ]
 },
 "glenn_thompson": {
  "name": "Glenn Thompson",
  "office": "House Agriculture Committee Chair",
  "state": "Pennsylvania",
  "party": "R",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🌾",
  "issues": [
   "Farm Bill",
   "SNAP",
   "Rural Broadband",
   "Biofuels"
  ]
 },
 "jerry_moran": {
  "name": "Jerry Moran",
  "office": "Senate Veterans' Affairs Chair",
  "state": "Kansas",
  "party": "R",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🎖",
  "issues": [
   "Veterans",
   "Appropriations",
   "Rural Healthcare",
   "Agriculture"
  ]
 },
 "angie_craig": {
  "name": "Angie Craig",
  "office": "House Agriculture Ranking Member",
  "state": "Minnesota",
  "party": "D",
  "score": 57,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🌾",
  "issues": [
   "Farm Bill",
   "Biofuels",
   "Ag Trade",
   "SNAP"
  ]
 },
 "tammy_baldwin": {
  "name": "Tammy Baldwin",
  "office": "U.S. Senator",
  "state": "Wisconsin",
  "party": "D",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏭",
  "issues": [
   "Buy America",
   "Manufacturing",
   "Healthcare",
   "Drug Prices"
  ]
 },
 "cortez_masto": {
  "name": "Catherine Cortez Masto",
  "office": "U.S. Senator",
  "state": "Nevada",
  "party": "D",
  "score": 58,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚖️",
  "issues": [
   "Border",
   "Digital Assets",
   "Housing",
   "Clean Energy"
  ]
 },
 "curtis": {
  "name": "John Curtis",
  "office": "U.S. Senator",
  "state": "Utah",
  "party": "R",
  "termStart": "2025-01",
  "score": 78,
  "kept": 31,
  "broken": 6,
  "pending": 3,
  "icon": "🏛",
  "issues": [
   "Western Water Rights",
   "Fiscal Conservatism",
   "Technology Policy",
   "Rural Broadband"
  ]
 },
 "massie": {
  "name": "Thomas Massie",
  "office": "U.S. Representative",
  "state": "KY-04",
  "party": "R",
  "termStart": "2012-11",
  "score": 73,
  "kept": 27,
  "broken": 8,
  "pending": 2,
  "icon": "🏛",
  "issues": [
   "Constitutional Originalism",
   "Anti-Surveillance",
   "Second Amendment",
   "Audit the Fed"
  ]
 },
 "lee": {
  "name": "Mike Lee",
  "office": "U.S. Senator",
  "state": "Utah",
  "party": "R",
  "termStart": "2011-01",
  "score": 72,
  "kept": 36,
  "broken": 11,
  "pending": 3,
  "icon": "🏛",
  "issues": [
   "Constitutional Originalism",
   "Federalism",
   "Deficit Reduction",
   "Religious Liberty"
  ]
 },
 "cox": {
  "name": "Spencer Cox",
  "office": "Governor",
  "state": "Utah",
  "party": "R",
  "termStart": "2021-01",
  "score": 67,
  "kept": 22,
  "broken": 9,
  "pending": 7,
  "icon": "🦅",
  "issues": [
   "Rural Development",
   "Water Policy",
   "Mental Health",
   "Data Center Controversy"
  ]
 },
 "trump": {
  "name": "Donald Trump",
  "office": "45th & 47th President",
  "state": "U.S.",
  "party": "R",
  "termStart": "2025-01",
  "score": 23,
  "kept": 56,
  "broken": 120,
  "pending": 68,
  "icon": "🦅",
  "issues": [
   "Immigration & Border",
   "Trade Policy",
   "Tax Reform",
   "National Debt"
  ],
  // ITEMIZED PLEDGES. The kept/broken/pending counts above are an aggregate carried
  // over from the old promise tracker: 176 resolved, none of them named, sourced or
  // issue-linked. PDXWordAction's top tier scores explicit pledges at 3× — the
  // heaviest word in the whole read — and it could not see inside that number, so
  // the president's score rested entirely on the middle tier while the largest
  // documented broken pledges of his career sat in a total that nothing could test.
  //
  // These eleven are not the tracker's 176 boiled down. They are the pledges that
  // (a) were stated as an explicit, checkable commitment, (b) have a FORMAL outcome
  // — an enacted law, a signed order, or an official series — and (c) could be
  // sourced to a document this pass opened and read. Everything asserted below came
  // from GPO's enrolled texts, the Federal Register, Treasury's Debt to the Penny,
  // or the BLS consumer price index; nothing came from a summary of them.
  // word-action.js#pledgeRemainder reports the 165 resolved pledges these eleven do
  // not account for as a coverage gap, so itemizing a subset never reads as a
  // complete set.
  //
  // A pledge with verdict "partial" resolves to `pending` in testOf() and is NOT
  // scored — deliberately. Half-delivered is not kept and not broken, and the honest
  // place for it is the untested column with its reason on the row.
  "promises": [
   {
    "title": "Eliminate the national debt in eight years",
    "detail": "Total public debt outstanding stood at $19.95 trillion when he took office on January 20, 2017 and $27.75 trillion when the first term ended on January 19, 2021. It was $39.77 trillion on July 31, 2026. The only law he has signed that addresses the debt directly moved it the other way: section 72001 of Public Law 119-21 raised the statutory limit on the public debt by $5 trillion.",
    "verdict": "broken",
    "issueKey": "national_debt",
    "date": "2016-04-02",
    "sources": [
     { "label": "U.S. Treasury — Debt to the Penny", "url": "https://fiscaldata.treasury.gov/datasets/debt-to-the-penny/debt-to-the-penny" },
     { "label": "GPO — Public Law 119-21, sec. 72001", "url": "https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm" }
    ]
   },
   {
    "title": "Mexico will pay for the border wall",
    "detail": "Barrier construction was paid for by the United States. Section 230(a)(1) of the Consolidated Appropriations Act, 2019 set aside $1,375,000,000 of Customs and Border Protection construction money for primary pedestrian fencing in the Rio Grande Valley Sector, and further construction was funded by redirecting U.S. military construction accounts under the national emergency he declared himself in Proclamation 9844. No payment from Mexico appears in either instrument.",
    "verdict": "broken",
    "issueKey": "border_security",
    "date": "2015-06-16",
    "sources": [
     { "label": "GPO — Public Law 116-6, sec. 230", "url": "https://www.govinfo.gov/content/pkg/PLAW-116publ6/html/PLAW-116publ6.htm" },
     { "label": "Federal Register — Proclamation 9844, 84 FR 4949", "url": "https://www.federalregister.gov/documents/2019/02/20/2019-03011/declaring-a-national-emergency-concerning-the-southern-border-of-the-united-states" }
    ]
   },
   {
    "title": "Repeal and replace the Affordable Care Act",
    "detail": "No law repealing or replacing the Act has been signed in either term. Public Law 111-148 remains on the books as enacted, and the one health title of the second term — subtitle B of Public Law 119-21 — reduced Medicaid spending and added eligibility conditions rather than replacing the Act.",
    "verdict": "broken",
    "issueKey": "healthcare",
    "date": "2016-02-20",
    "sources": [
     { "label": "GPO — Public Law 111-148, as enacted", "url": "https://www.govinfo.gov/content/pkg/PLAW-111publ148/html/PLAW-111publ148.htm" },
     { "label": "GPO — Public Law 119-21, subtitle B", "url": "https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm" }
    ]
   },
   {
    "title": "Bring prices down starting on day one",
    "detail": "The consumer price index for all urban consumers stood at 317.671 in January 2025 and 333.952 in June 2026 — everyday prices rose about 5% over the period rather than coming down. The day-one instrument is on the record and cited below: the presidential memorandum of January 20, 2025, published at 90 FR 8245, directs every agency to pursue emergency price relief. The series it was meant to move is the test, and it moved the other way.",
    "verdict": "broken",
    "issueKey": "cost_living",
    "date": "2024-08-15",
    "sources": [
     { "label": "BLS — CPI, all urban consumers (CUUR0000SA0)", "url": "https://data.bls.gov/timeseries/CUUR0000SA0" },
     { "label": "Federal Register — Presidential Memorandum of January 20, 2025, 90 FR 8245", "url": "https://www.federalregister.gov/documents/2025/01/28/2025-01904/delivering-emergency-price-relief-for-american-families-and-defeating-the-cost-of-living-crisis" }
    ]
   },
   {
    "title": "Make the 2017 individual tax cuts permanent",
    "detail": "Signed into law on July 4, 2025. Chapter 1 of Public Law 119-21 is titled \"Providing Permanent Tax Relief for Middle-class Families and Workers\", and section 70101 makes the reduced individual rates permanent rather than letting them expire at the end of 2025.",
    "verdict": "kept",
    "issueKey": "lower_taxes",
    "date": "2024-09-05",
    "sources": [
     { "label": "GPO — Public Law 119-21, sec. 70101", "url": "https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm" }
    ]
   },
   {
    "title": "No tax on tips",
    "detail": "Signed into law on July 4, 2025. Section 70201 of Public Law 119-21 adds a new section 224 to the Internal Revenue Code allowing a deduction for qualified tips received during the taxable year. That section alone is what this row tests. The companion section 70202 does the same for overtime, which is context rather than evidence here — no separate overtime commitment is itemized because this pass found no sourced statement of one to test it against.",
    "verdict": "kept",
    "issueKey": "tax_middle_class",
    "date": "2024-06-09",
    "sources": [
     { "label": "GPO — Public Law 119-21, sec. 70201", "url": "https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm" }
    ]
   },
   {
    "title": "Create a federal school-choice scholarship",
    "detail": "Signed into law on July 4, 2025. Section 70411 of Public Law 119-21 creates a federal tax credit for individual contributions to scholarship granting organizations — the first nationwide school-choice mechanism in the tax code.",
    "verdict": "kept",
    "issueKey": "school_choice",
    "date": "2023-01-26",
    "sources": [
     { "label": "GPO — Public Law 119-21, sec. 70411", "url": "https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm" }
    ]
   },
   {
    "title": "Expand the child tax credit",
    "detail": "Signed into law on July 4, 2025. Section 70104 of Public Law 119-21 extends and enhances the increased child tax credit, which had been scheduled to fall back to its pre-2017 level at the end of 2025.",
    "verdict": "kept",
    "issueKey": "family_support",
    "date": "2024-08-18",
    "sources": [
     { "label": "GPO — Public Law 119-21, sec. 70104", "url": "https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm" }
    ]
   },
   {
    "title": "End federal DEI programs on day one",
    "detail": "Signed Executive Order 14151 on January 20, 2025 — the first day of the term — terminating federal diversity, equity and inclusion offices, positions and programs and directing agencies to close them out. Published at 90 FR 8339.",
    "verdict": "kept",
    "issueKey": "end_dei",
    "date": "2023-07-14",
    "sources": [
     { "label": "Federal Register — Executive Order 14151, 90 FR 8339", "url": "https://www.federalregister.gov/documents/2025/01/29/2025-01953/ending-radical-and-wasteful-government-dei-programs-and-preferencing" }
    ]
   },
   {
    "title": "Never allow a central bank digital currency, and sign a stablecoin framework",
    "detail": "Both halves are on the formal record. Executive Order 14178, signed January 23, 2025, prohibits agencies from establishing, issuing or promoting a U.S. central bank digital currency and revokes the prior order that had directed work on one. Public Law 119-27, signed July 18, 2025, establishes the federal regulatory framework for payment stablecoins. The two instruments stay on one row because the record files both under the same issue — splitting them would count that issue twice rather than test anything new.",
    "verdict": "kept",
    "issueKey": "crypto_cbdc",
    "date": "2024-07-27",
    "sources": [
     { "label": "Federal Register — Executive Order 14178, 90 FR 8647", "url": "https://www.federalregister.gov/documents/2025/01/31/2025-02123/strengthening-american-leadership-in-digital-financial-technology" },
     { "label": "GPO — Public Law 119-27 (GENIUS Act)", "url": "https://www.govinfo.gov/content/pkg/PLAW-119publ27/html/PLAW-119publ27.htm" }
    ]
   },
   {
    "title": "Require documentary proof of citizenship to register to vote",
    "detail": "Signed Executive Order 14248 on March 25, 2025, directing the Election Assistance Commission to require documentary proof of citizenship on the federal registration form. Parts of the order were enjoined before they took effect and the requirement is not in force nationwide, so the commitment is neither delivered nor abandoned.",
    "verdict": "partial",
    "issueKey": "voter_id",
    "date": "2024-03-13",
    "sources": [
     { "label": "Federal Register — Executive Order 14248, 90 FR 14005", "url": "https://www.federalregister.gov/documents/2025/03/28/2025-05523/preserving-and-protecting-the-integrity-of-american-elections" }
    ]
   }
  ]
 },
 "bilzerian": {
  "name": "Dan Bilzerian",
  "office": "Candidate",
  "state": "FL-06",
  "party": "Ind.",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 12,
  "icon": "🃏",
  "issues": [
   "Term Limits",
   "Anti-Establishment",
   "Fiscal Reform",
   "Second Amendment"
  ]
 },
 "gallrein": {
  "name": "Ed Gallrein",
  "office": "Republican Nominee",
  "state": "KY-04",
  "party": "R",
  "score": 58,
  "kept": 14,
  "broken": 8,
  "pending": 11,
  "icon": "🏛",
  "issues": [
   "Border Security",
   "America First",
   "Veterans Rights",
   "Fiscal Responsibility"
  ]
 },
 "owens": {
  "name": "Burgess Owens",
  "office": "U.S. Representative",
  "state": "District 4",
  "party": "R",
  "termStart": "2021-01",
  "score": 64,
  "kept": 18,
  "broken": 7,
  "pending": 8,
  "icon": "🏛",
  "issues": [
   "Education Freedom",
   "School Choice",
   "Second Amendment",
   "Anti-CRT"
  ]
 },
 "maloy": {
  "name": "Celeste Maloy",
  "office": "U.S. Representative",
  "state": "District 2",
  "party": "R",
  "termStart": "2023-11",
  "score": 61,
  "kept": 11,
  "broken": 5,
  "pending": 9,
  "icon": "🏛",
  "issues": [
   "Public Lands",
   "Western Water Rights",
   "Border Security",
   "Fiscal Conservatism"
  ]
 },
 "kennedy": {
  "unopposed": true,
  "name": "Mike Kennedy",
  "office": "U.S. Representative",
  "state": "Utah · District 3",
  "party": "R",
  "termStart": "2025-01",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 9,
  "icon": "🏛",
  "issues": [
   "Healthcare Reform",
   "Constitutional Conservatism",
   "Religious Liberty",
   "Fiscal Reform"
  ]
 },
 "tgabbard": {
  "name": "Tulsi Gabbard",
  "office": "Director of Nat. Intel.",
  "state": "National",
  "party": "R",
  "termStart": "2025-02",
  "score": 55,
  "kept": 18,
  "broken": 12,
  "pending": 4,
  "icon": "🦅",
  "issues": [
   "Anti-Interventionism",
   "Intelligence Reform",
   "Civil Liberties",
   "Veterans Affairs"
  ]
 },
 "hegseth": {
  "name": "Pete Hegseth",
  "office": "Secretary of Defense",
  "state": "National",
  "party": "R",
  "termStart": "2025-01",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 8,
  "icon": "🦅",
  "issues": [
   "Military Readiness",
   "DoD Reform",
   "Veterans Affairs",
   "Eliminate DEI"
  ]
 },
 "bmoore": {
  "name": "Blake Moore",
  "office": "U.S. Representative",
  "state": "Utah · UT-1",
  "party": "R",
  "termStart": "2021-01",
  "score": 66,
  "kept": 18,
  "broken": 8,
  "pending": 5,
  "icon": "🏛",
  "issues": [
   "Tax Policy",
   "Western Water",
   "Hill AFB",
   "Fiscal Conservatism"
  ]
 },
 "jpetro": {
  "name": "Joy Petro",
  "office": "Mayor, Layton City",
  "state": "Layton, Utah",
  "party": "R",
  "termStart": "2020-01",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 6,
  "icon": "🏙",
  "issues": [
   "Managing Growth",
   "Roads & Water Infrastructure",
   "Public Safety",
   "City Budget"
  ]
 },
 "jstevenson": {
  "name": "Jerry Stevenson",
  "office": "Utah State Senator",
  "state": "UT District 6",
  "party": "R",
  "termStart": "2010",
  "score": 62,
  "kept": 13,
  "broken": 7,
  "pending": 4,
  "icon": "🏛",
  "issues": [
   "Transportation",
   "Water Policy",
   "State Budget",
   "Davis County"
  ]
 },
 "tlee": {
  "name": "Trevor Lee",
  "office": "UT State Representative",
  "state": "UT District 16",
  "party": "R",
  "termStart": "2023-01",
  "score": 68,
  "kept": 15,
  "broken": 7,
  "pending": 5,
  "icon": "🏛",
  "issues": [
   "Parental Rights",
   "Government Neutrality",
   "Income Tax Cuts",
   "Limited Government"
  ]
 },
 "kgrover": {
  "name": "Keith Grover",
  "office": "Utah State Senator",
  "state": "UT District 23 (Provo)",
  "party": "R",
  "termStart": "2018",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Utah Senate District 23",
   "Provo",
   "Education",
   "State Budget"
  ]
 },
 "kstratton": {
  "name": "Keven Stratton",
  "office": "Utah State Senator",
  "state": "UT District 24 (Provo / Orem)",
  "party": "R",
  "termStart": "2025-01",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "\ud83c\udfdb",
  "issues": [
   "Utah Senate District 24",
   "Provo / Orem",
   "Public Lands & Federalism",
   "Water Conservation"
  ]
 },
 "amillner": {
  "name": "Ann Millner",
  "office": "Utah State Senator",
  "state": "UT District 5",
  "party": "R",
  "termStart": "2015-01",
  "score": 74,
  "kept": 21,
  "broken": 4,
  "pending": 5,
  "icon": "🏛",
  "issues": [
   "Higher Education",
   "Workforce Development",
   "Healthcare",
   "Ogden / Weber Co."
  ]
 },
 "lisa_shepherd": {
  "name": "Lisa Shepherd",
  "office": "Utah State Representative",
  "state": "UT District 61 (Provo)",
  "party": "R",
  "termStart": "2024",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Utah House District 61",
   "Provo",
   "Transparency & Accountability",
   "Election Integrity"
  ]
 },
 "jake_sawyer": {
  "name": "Jake Sawyer",
  "office": "Utah State Representative",
  "state": "UT District 9 (Ogden / Weber Co.)",
  "party": "R",
  "termStart": "2025",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Utah House District 9",
   "Ogden / Weber Co.",
   "Roads & Infrastructure",
   "Housing Affordability"
  ]
 },
 "lorene_kamalu": {
  "name": "Lorene Kamalu",
  "office": "Davis County Commissioner",
  "state": "Utah · Davis County (Seat B)",
  "party": "R",
  "termStart": "2019",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Davis County",
   "County Budget & Property Taxes",
   "Growth & Transportation",
   "Great Salt Lake & Water Quality"
  ]
 },
 "john_crofts": {
  "name": "John Crofts",
  "office": "Davis County Commissioner",
  "state": "Utah · Davis County",
  "party": "R",
  "termStart": "2025",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Davis County",
   "Transparency & Accountability",
   "County Budget & Property Taxes"
  ]
 },
 "bob_stevenson": {
  "name": "Bob Stevenson",
  "office": "Davis County Commissioner",
  "state": "Utah · Davis County",
  "party": "R",
  "termStart": "2015",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Davis County",
   "County Budget & Property Taxes",
   "Growth & Transportation"
  ]
 },
 "kelly_sparks": {
  "name": "Kelly V. Sparks",
  "office": "Davis County Sheriff",
  "state": "Utah · Davis County",
  "party": "R",
  "termStart": "2023",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🚔",
  "issues": [
   "Davis County",
   "Public Safety",
   "County Jail & Law Enforcement"
  ]
 },
 "susan_lee": {
  "name": "Susan Lee",
  "office": "Davis County Commission candidate",
  "state": "Utah · Davis County (Seat B)",
  "party": "R",
  "termStart": null,
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🗳️",
  "issues": [
   "Davis County",
   "County Budget & Property Taxes",
   "Cut Waste Before Raising Taxes"
  ]
 },
 "zach_bloxham": {
  "name": "Zach Bloxham",
  "office": "Layton City Council",
  "state": "Utah · Davis County",
  "party": "",
  "termStart": "2020",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏙",
  "issues": [
   "Layton",
   "City Budget & Property Taxes",
   "Roads & Growth",
   "Public Safety"
  ]
 },
 "clint_morris": {
  "name": "Clint Morris",
  "office": "Layton City Council",
  "state": "Utah · Davis County",
  "party": "",
  "termStart": "2020",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏙",
  "issues": [
   "Layton",
   "City Budget & Property Taxes",
   "Roads & Growth",
   "Public Safety"
  ]
 },
 "tyson_roberts": {
  "name": "Tyson Roberts",
  "office": "Layton City Council",
  "state": "Utah · Davis County",
  "party": "",
  "termStart": "2020",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏙",
  "issues": [
   "Layton",
   "City Budget & Property Taxes",
   "Roads & Growth",
   "Public Safety"
  ]
 },
 "brigit_gerrard": {
  "name": "Brigit Gerrard",
  "office": "Davis Board of Education · Precinct 4 (President)",
  "state": "Utah · Davis County",
  "party": "",
  "termStart": "2021",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏫",
  "issues": [
   "Davis School District",
   "Layton · Kaysville · Fruit Heights · South Weber",
   "School Budget & Finance",
   "Student Achievement"
  ]
 },
 "michelle_barber": {
  "name": "Michelle Barber",
  "office": "Davis Board of Education · Precinct 5",
  "state": "Utah · Davis County",
  "party": "",
  "termStart": "2021",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏫",
  "issues": [
   "Davis School District",
   "Clearfield · Layton · Kaysville · Sunset · HAFB",
   "School Budget & Finance",
   "Student Achievement"
  ]
 },
 "kristen_hogan": {
  "name": "Kristen Hogan",
  "office": "Davis Board of Education · Precinct 6",
  "state": "Utah · Davis County",
  "party": "",
  "termStart": "2023",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏫",
  "issues": [
   "Davis School District",
   "Clearfield · Layton · Syracuse",
   "School Budget & Finance",
   "Student Achievement"
  ]
 },
 "chad_jensen": {
  "name": "Chad Jensen",
  "office": "Cache County Sheriff",
  "state": "Utah · Cache County",
  "party": "R",
  "termStart": "2015",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🚔",
  "issues": [
   "Cache County",
   "Public Safety",
   "County Jail & Law Enforcement"
  ]
 },
 "george_daines": {
  "name": "N. George Daines",
  "office": "Cache County Executive",
  "state": "Utah · Cache County",
  "party": "R",
  "termStart": "2025",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Cache County",
   "County Budget & Property Taxes",
   "Fiscal Accountability"
  ]
 },
 "mark_anderson_logan": {
  "name": "Mark Anderson",
  "office": "Mayor of Logan",
  "state": "Utah · Cache County",
  "party": "",
  "termStart": "2026",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏙",
  "issues": [
   "Logan",
   "Housing & Growth",
   "Water & Infrastructure"
  ]
 },
 "sandi_goodlander": {
  "name": "Sandi Goodlander",
  "office": "Cache County Council · Chair (Logan Seat #3)",
  "state": "Utah · Cache County",
  "party": "R",
  "termStart": null,
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Cache County",
   "County Budget & Property Taxes",
   "Countywide Services"
  ]
 },
 "kathryn_beus": {
  "name": "Kathryn Beus",
  "office": "Cache County Council · Vice Chair (Southeast District)",
  "state": "Utah · Cache County",
  "party": "R",
  "termStart": null,
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Cache County",
   "County Budget & Property Taxes",
   "Countywide Services"
  ]
 },
 "david_erickson_cache": {
  "name": "David L. Erickson",
  "office": "Cache County Council · North District",
  "state": "Utah · Cache County",
  "party": "R",
  "termStart": "2015",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Cache County",
   "County Budget & Property Taxes",
   "Countywide Services"
  ]
 },
 "keegan_garrity": {
  "name": "Keegan Garrity",
  "office": "Cache County Council · Logan Seat #1",
  "state": "Utah · Cache County",
  "party": "R",
  "termStart": null,
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Cache County",
   "County Budget & Property Taxes",
   "Countywide Services"
  ]
 },
 "joann_bennett": {
  "name": "JoAnn Bennett",
  "office": "Cache County Council · Logan Seat #2",
  "state": "Utah · Cache County",
  "party": "R",
  "termStart": null,
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Cache County",
   "County Budget & Property Taxes",
   "Countywide Services"
  ]
 },
 "mark_hurd": {
  "name": "Mark Hurd",
  "office": "Cache County Council · Northeast District",
  "state": "Utah · Cache County",
  "party": "R",
  "termStart": null,
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Cache County",
   "County Budget & Property Taxes",
   "Countywide Services"
  ]
 },
 "nolan_gunnell": {
  "name": "Nolan P. Gunnell",
  "office": "Cache County Council · South District",
  "state": "Utah · Cache County",
  "party": "R",
  "termStart": null,
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Cache County",
   "County Budget & Property Taxes",
   "Countywide Services"
  ]
 },
 "teri_rhodes": {
  "name": "Teri Rhodes",
  "office": "Cache County School Board · President (District 7)",
  "state": "Utah · Cache County",
  "party": "",
  "termStart": "2013",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏫",
  "issues": [
   "Cache County School District",
   "School Budget & Property Taxes",
   "School Construction",
   "Student Achievement"
  ]
 },
 "brian_chambers": {
  "name": "Brian Chambers",
  "office": "Cache County School Board · District 1",
  "state": "Utah · Cache County",
  "party": "",
  "termStart": "2023",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏫",
  "issues": [
   "Cache County School District",
   "School Budget & Property Taxes",
   "Fiscal Accountability"
  ]
 },
 "roger_pulsipher": {
  "name": "Roger Pulsipher",
  "office": "Cache County School Board · District 2",
  "state": "Utah · Cache County",
  "party": "",
  "termStart": null,
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏫",
  "issues": [
   "Cache County School District",
   "School Budget & Property Taxes",
   "Student Achievement"
  ]
 },
 "randall_bagley": {
  "name": "Randall Bagley",
  "office": "Cache County School Board · District 4",
  "state": "Utah · Cache County",
  "party": "",
  "termStart": null,
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏫",
  "issues": [
   "Cache County School District",
   "School Budget & Property Taxes",
   "Student Achievement"
  ]
 },
 "d_jeffrey_nielsen": {
  "name": "D. Jeffrey Nielsen",
  "office": "Cache County School Board · District 3",
  "state": "Utah · Cache County",
  "party": "",
  "termStart": null,
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏫",
  "issues": [
   "Cache County School District",
   "Student Achievement",
   "Countywide Schools"
  ]
 },
 "allen_grunig": {
  "name": "Allen Grunig",
  "office": "Cache County School Board · District 5",
  "state": "Utah · Cache County",
  "party": "",
  "termStart": "2025",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏫",
  "issues": [
   "Cache County School District",
   "Student Achievement",
   "Countywide Schools"
  ]
 },
 "kathy_christiansen": {
  "name": "Kathy Christiansen",
  "office": "Cache County School Board · Vice President (District 6)",
  "state": "Utah · Cache County",
  "party": "",
  "termStart": null,
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏫",
  "issues": [
   "Cache County School District",
   "Student Achievement",
   "Countywide Schools"
  ]
 },
 "becky_quay": {
  "name": "Becky Quay",
  "office": "Logan City School Board · President (District 4)",
  "state": "Utah · Cache County",
  "party": "",
  "termStart": "2025",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏫",
  "issues": [
   "Logan City School District",
   "School Budget",
   "Board Governance",
   "Student Achievement"
  ]
 },
 "cole_checketts": {
  "name": "Cole Checketts",
  "office": "Logan City School Board · District 5",
  "state": "Utah · Cache County",
  "party": "",
  "termStart": null,
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏫",
  "issues": [
   "Logan City School District",
   "School Budget",
   "Board Governance",
   "Fiscal Accountability"
  ]
 },
 "russell_fisher": {
  "name": "Russell Fisher",
  "office": "Logan City School Board · District 3 (interim)",
  "state": "Utah · Cache County",
  "party": "",
  "termStart": "2025",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏫",
  "issues": [
   "Logan City School District",
   "School Budget",
   "Board Governance"
  ]
 },
 "katie_chapman": {
  "name": "Katie Chapman",
  "office": "Logan City School Board · District 1",
  "state": "Utah · Cache County",
  "party": "",
  "termStart": "2024",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏫",
  "issues": [
   "Logan City School District",
   "School Budget",
   "Student Achievement"
  ]
 },
 "frank_stewart": {
  "name": "Frank Stewart",
  "office": "Logan City School Board · Vice President (District 2)",
  "state": "Utah · Cache County",
  "party": "",
  "termStart": null,
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏫",
  "issues": [
   "Logan City School District",
   "School Budget",
   "Board Governance"
  ]
 },
 "sadams": {
  "name": "Stuart Adams",
  "office": "Utah Senate President",
  "state": "UT District 7 (Layton, Davis County)",
  "party": "R",
  "termStart": "2009",
  "score": 65,
  "kept": 20,
  "broken": 10,
  "pending": 5,
  "icon": "🏛",
  "issues": [
   "School Choice",
   "Transportation",
   "State Budget",
   "Legislative Leadership"
  ]
 },
 "boebert": {
  "name": "Lauren Boebert",
  "office": "U.S. Representative",
  "state": "Colorado",
  "party": "R",
  "termStart": "2021-01",
  "score": 54,
  "kept": 16,
  "broken": 12,
  "pending": 5,
  "icon": "🏛",
  "issues": [
   "Second Amendment",
   "Anti-Establishment",
   "Border Security",
   "Fiscal Conservatism"
  ]
 },
 "mtg": {
  "name": "Marjorie Taylor Greene",
  "office": "U.S. Representative",
  "state": "Georgia",
  "party": "R",
  "termStart": "2021-01",
  "termEnd": "2026-01",
  "unopposed": true,
  "score": 44,
  "kept": 11,
  "broken": 13,
  "pending": 4,
  "icon": "🏛",
  "issues": [
   "Anti-Establishment",
   "Border Security",
   "Government Accountability",
   "MAGA Agenda"
  ]
 },
 "gaetz": {
  "name": "Matt Gaetz",
  "office": "Former U.S. Rep",
  "state": "Florida",
  "party": "R",
  "termStart": "2017-01",
  "termEnd": "2024-11",
  "score": 51,
  "kept": 14,
  "broken": 11,
  "pending": 6,
  "icon": "🏛",
  "issues": [
   "Anti-Establishment",
   "Government Reform",
   "Foreign Policy",
   "Border Security"
  ]
 },
 "rfine": {
  "name": "Randy Fine",
  "office": "FL State Rep / Candidate",
  "state": "Florida",
  "party": "R",
  "termStart": "2025-04",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 7,
  "icon": "🏛",
  "issues": [
   "Pro-Israel",
   "School Choice",
   "Anti-Mandate",
   "Fiscal Reform"
  ]
 },
 "lyman": {
  "name": "Phil Lyman",
  "office": "Governor Candidate",
  "state": "Utah",
  "party": "R",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 5,
  "icon": "🦅",
  "issues": [
   "Federal Land Transfer",
   "Budget Reform",
   "Constitutional Carry",
   "Populist Conservatism"
  ]
 },
 "cstewart": {
  "name": "Chris Stewart",
  "office": "Former U.S. Rep",
  "state": "Utah",
  "party": "R",
  "termStart": "2013-01",
  "termEnd": "2023-09",
  "score": 68,
  "kept": 19,
  "broken": 8,
  "pending": 4,
  "icon": "🏛",
  "issues": [
   "Intelligence",
   "National Security",
   "Fiscal Conservatism",
   "Veterans Affairs"
  ]
 },
 "emendenhall": {
  "name": "Erin Mendenhall",
  "office": "Mayor, Salt Lake City",
  "state": "Salt Lake County",
  "party": "D",
  "termStart": "2020-01",
  "score": 59,
  "kept": 16,
  "broken": 10,
  "pending": 5,
  "icon": "🏙",
  "issues": [
   "Affordable Housing",
   "Climate Action",
   "Homelessness",
   "Air Quality"
  ]
 },
 "jwilson": {
  "name": "Jenny Wilson",
  "office": "Salt Lake County Mayor",
  "state": "Salt Lake County",
  "party": "D",
  "termStart": "2019-01",
  "score": 62,
  "kept": 15,
  "broken": 8,
  "pending": 4,
  "icon": "🏙",
  "issues": [
   "Homelessness",
   "Criminal Justice Reform",
   "Public Health",
   "Affordable Housing"
  ]
 },
 "bwilson": {
  "name": "Brad Wilson",
  "office": "Former Utah House Speaker",
  "state": "Utah · Davis County",
  "party": "R",
  "termStart": "2011-01",
  "termEnd": "2023-11",
  "score": 60,
  "kept": 15,
  "broken": 9,
  "pending": 4,
  "icon": "🏛",
  "issues": [
   "School Choice",
   "Economic Development",
   "State Budget",
   "Legislative Leadership"
  ]
 },
 "mschultz": {
  "name": "Mike Schultz",
  "office": "UT House Speaker",
  "state": "UT District 12 (Hooper, Weber County)",
  "party": "R",
  "termStart": "2015-01",
  "score": 63,
  "kept": 14,
  "broken": 6,
  "pending": 5,
  "icon": "🏛",
  "issues": [
   "Legislative Leadership",
   "State Budget",
   "Education Funding",
   "Water Policy"
  ]
 },
 "tweiler": {
  "name": "Todd Weiler",
  "office": "UT State Senator",
  "state": "UT District 8 (Woods Cross)",
  "party": "R",
  "termStart": "2012-01",
  "score": 65,
  "kept": 16,
  "broken": 7,
  "pending": 4,
  "icon": "🏛",
  "issues": [
   "Internet Safety",
   "Tech Regulation",
   "Social Media for Minors",
   "Criminal Justice"
  ]
 },
 "rward": {
  "name": "Ray Ward",
  "office": "Utah State Representative",
  "state": "UT District 19 (Bountiful, Davis County)",
  "party": "R",
  "termStart": "2015-01",
  "score": 70,
  "kept": 18,
  "broken": 5,
  "pending": 4,
  "icon": "🏛",
  "issues": [
   "Healthcare Policy",
   "Medicaid",
   "Mental Health",
   "Public Health"
  ]
 },
 "kcullimore": {
  "name": "Kirk Cullimore",
  "office": "UT State Senator",
  "state": "UT District 19 (Sandy / Draper / Cottonwood Heights)",
  "party": "R",
  "termStart": "2019-01",
  "score": 64,
  "kept": 14,
  "broken": 6,
  "pending": 5,
  "icon": "🏛",
  "issues": [
   "Data Privacy",
   "Business Law",
   "Tech Regulation",
   "Economic Development"
  ]
 },
 "aromero": {
  "name": "Angela Romero",
  "office": "UT State Representative",
  "state": "UT District 25 (West Salt Lake City, Salt Lake County)",
  "party": "D",
  "termStart": "2013-01",
  "score": 61,
  "kept": 15,
  "broken": 8,
  "pending": 4,
  "icon": "🏛",
  "issues": [
   "Affordable Housing",
   "Immigration",
   "Labor Rights",
   "Community Development"
  ]
 },
 "cbramble": {
  "name": "Curt Bramble",
  "office": "Former UT State Senator",
  "state": "UT District 24 (Provo / Orem)",
  "party": "R",
  "termStart": "2001-01",
  "termEnd": "2024-12",
  "score": 66,
  "kept": 21,
  "broken": 8,
  "pending": 4,
  "icon": "🏛",
  "issues": [
   "Tax Policy",
   "Higher Education",
   "Business Regulation",
   "Fiscal Conservatism"
  ]
 },
 "dipson": {
  "name": "Don Ipson",
  "office": "UT State Senator",
  "state": "UT District 29 (St. George)",
  "party": "R",
  "termStart": "2016-09",
  "score": 63,
  "kept": 17,
  "broken": 9,
  "pending": 4,
  "icon": "🏛",
  "issues": [
   "Public Lands",
   "Water Rights",
   "Rural Utah",
   "Growth Management"
  ]
 },
 "rshipp": {
  "name": "Rex Shipp",
  "office": "UT State Representative",
  "state": "UT District 71 (Cedar City, Iron County)",
  "party": "R",
  "score": 59,
  "kept": 5,
  "broken": 3,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Water Conservation",
   "Growth Management",
   "Public Lands",
   "Education"
  ]
 },
 "ssandall": {
  "name": "Scott Sandall",
  "office": "UT State Senator",
  "state": "UT District 1 (Box Elder/Cache)",
  "party": "R",
  "termStart": "2019-01",
  "score": 64,
  "kept": 16,
  "broken": 7,
  "pending": 4,
  "icon": "🏛",
  "issues": [
   "Agriculture Policy",
   "Water Rights",
   "USU Funding",
   "Rural Broadband"
  ]
 },
 "jdraxler": {
  "name": "Jack Draxler",
  "office": "UT State Representative",
  "state": "UT District 3 (Logan)",
  "party": "R",
  "score": 61,
  "kept": 12,
  "broken": 6,
  "pending": 5,
  "icon": "🏛",
  "issues": [
   "Education Funding",
   "USU & Higher Ed",
   "Cache Valley Economy",
   "Transportation"
  ]
 },
 "evickers": {
  "name": "Evan Vickers",
  "office": "UT State Senator",
  "state": "UT District 28 (Cedar City)",
  "party": "R",
  "termStart": "2013-01",
  "score": 66,
  "kept": 19,
  "broken": 7,
  "pending": 4,
  "icon": "🏛",
  "issues": [
   "Rural Healthcare",
   "SUU Funding",
   "Public Lands",
   "Tourism Economy"
  ]
 },
 "jwestwood": {
  "name": "John Westwood",
  "office": "Former UT State Representative",
  "state": "UT District 72 (Cedar City) · 2013–2019",
  "party": "R",
  "termEnd": "2018-12",
  "score": 60,
  "kept": 11,
  "broken": 6,
  "pending": 5,
  "icon": "🏛",
  "issues": [
   "Education Funding",
   "SUU & Higher Ed",
   "Rural Economy",
   "Public Lands"
  ]
 },
 "kwan_s12": {
  "name": "Karen Kwan",
  "office": "Utah State Senator",
  "state": "UT District 12 (West Valley / Murray)",
  "party": "D",
  "termStart": "2023-01",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "West Valley City",
   "Education",
   "Mental Health",
   "Workforce"
  ]
 },
 "blouin_s13": {
  "name": "Nate Blouin",
  "office": "Utah State Senator",
  "state": "UT District 13 (Millcreek / Salt Lake City)",
  "party": "D",
  "termStart": "2023-01",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Salt Lake City",
   "Clean Energy",
   "Air Quality",
   "Housing"
  ]
 },
 "mccay_s11": {
  "name": "Daniel McCay",
  "office": "Utah State Senator",
  "state": "UT District 18 (Riverton / Herriman)",
  "party": "R",
  "termStart": "2019-01",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Riverton & Herriman",
   "Tax Policy",
   "Transportation",
   "State Budget"
  ]
 },
 "harper_s16": {
  "name": "Wayne Harper",
  "office": "Utah State Senator",
  "state": "UT District 16 (West Jordan / Taylorsville)",
  "party": "R",
  "termStart": "2013-01",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "West Jordan",
   "Transportation",
   "Tax Policy",
   "Infrastructure"
  ]
 },
 // `cullimore_s19` used to hold a second Kirk Cullimore record here — the
 // district-ballot id for Utah Senate District 19. One person under two ids: he was
 // elected in 2018 to District 9 and redistricting renumbered the same Salt Lake
 // County seat to District 19 in 2023, so the two records disagreed on the district
 // only because one of them was stale. The two were folded into `kcullimore` (above,
 // district corrected to 19, bio folded into cmp-data-detail.js) and `cullimore_s19`
 // retired in db/vr-pid-aliases.json.
 "mckell_s25": {
  "name": "Mike McKell",
  "office": "Utah State Senator",
  "state": "UT District 25 (Utah County)",
  "party": "R",
  "termStart": "2021-01",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Utah County",
   "Judiciary",
   "Social Media & Kids",
   "Civil Law"
  ]
 },
 "brammer_s21": {
  "name": "Brady Brammer",
  "office": "Utah State Senator",
  "state": "UT District 21 (Highland / Pleasant Grove)",
  "party": "R",
  "termStart": "2025-01",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "North Utah County",
   "Online Safety",
   "Civil Law",
   "Business"
  ]
 },
 "hollins_h24": {
  "name": "Sandra Hollins",
  "office": "Utah State Representative",
  "state": "UT District 21 (Salt Lake City)",
  "party": "D",
  "termStart": "2015-01",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Salt Lake City",
   "Homelessness",
   "Equity",
   "Public Health"
  ]
 },
 "fitisemanu_h30": {
  "name": "Jake Fitisemanu",
  "office": "Utah State Representative",
  "state": "UT District 30 (West Valley City)",
  "party": "D",
  "termStart": "2025-01",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "West Valley City",
   "Public Health",
   "Community",
   "Housing"
  ]
 },
 "eliason_h45": {
  "name": "Steve Eliason",
  "office": "Utah State Representative",
  "state": "UT District 43 (Sandy, Salt Lake County)",
  "party": "R",
  "termStart": "2011-01",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Sandy",
   "Mental Health",
   "Suicide Prevention",
   "School Safety"
  ]
 },
 "ivory_h39": {
  "name": "Ken Ivory",
  "office": "Utah State Representative",
  "state": "UT District 39 (West Jordan)",
  "party": "R",
  "termStart": "2021-11",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "West Jordan",
   "Public Lands",
   "Property Rights",
   "Limited Government"
  ]
 },
 "teuscher_h44": {
  "name": "Jordan Teuscher",
  "office": "Utah State Representative",
  "state": "UT District 44 (South Jordan)",
  "party": "R",
  "termStart": "2021-01",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "South Jordan",
   "Online Child Safety",
   "Business Law",
   "Education"
  ]
 },
 "valpeterson_h56": {
  "name": "Val Peterson",
  "office": "Utah State Representative",
  "state": "UT District 56 (Orem)",
  "party": "R",
  "termStart": "2011-01",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Orem",
   "Higher Education",
   "Appropriations",
   "Economic Development"
  ]
 },
 "gricius_h50": {
  "name": "Stephanie Gricius",
  "office": "Utah State Representative",
  "state": "UT District 50 (Eagle Mountain)",
  "party": "R",
  "termStart": "2023-01",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Eagle Mountain",
   "AI Regulation",
   "Parental Rights",
   "Health Freedom"
  ]
 },
 "snider_h5": {
  "name": "Casey Snider",
  "office": "Utah State Representative · House Majority Leader",
  "state": "UT District 5 (Cache County)",
  "party": "R",
  "termStart": "2018-12",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Cache County",
   "Water & Land",
   "Great Salt Lake",
   "Agriculture"
  ]
 },
 "bolinder_h68": {
  "name": "Bridger Bolinder",
  "office": "Utah State Representative",
  "state": "UT District 29 (Tooele / Grantsville)",
  "party": "R",
  "termStart": "2023-01",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Tooele County",
   "Rural Growth",
   "Water",
   "Agriculture"
  ]
 },
 "lisonbee_h14": {
  "name": "Karianne Lisonbee",
  "office": "Utah State Representative",
  "state": "UT District 14 (Clearfield / Syracuse)",
  "party": "R",
  "termStart": "2017-01",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "West Davis County",
   "Elections",
   "Family Policy",
   "Public Safety"
  ]
 },
 "hall_h11": {
  "name": "Katy Hall",
  "office": "Utah State Representative",
  "state": "UT District 11 (South Ogden)",
  "party": "R",
  "termStart": "2021-01",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "South Ogden",
   "Higher Education",
   "Workforce",
   "Local Government"
  ]
 },
 "defay_h15": {
  "name": "Ariel Defay",
  "office": "Utah State Representative",
  "state": "UT District 15 (Layton, Davis County)",
  "party": "R",
  "termStart": "2023-11",
  "score": 83,
  "kept": 5,
  "broken": 1,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Davis County",
   "Education",
   "Transportation",
   "Economic Development"
  ],
  "promises": [
   {
    "title": "Tighten Utah’s marriage age-gap rules for minors (SB 76, 2025)",
    "detail": "As House floor sponsor, carried Sen. Jen Plumb’s bill narrowing the permissible age gap for a married 16- or 17-year-old from seven years to four and adding a 72-hour waiting period. It passed nearly unanimously and was signed into law — a Republican shepherding a Democrat’s child-protection bill across the finish line.",
    "verdict": "kept",
    "sources": [
     {
      "label": "Utah News Dispatch",
      "url": "https://utahnewsdispatch.com/briefs/utah-legislature-approves-bill-forbidding-minors-from-marrying-someone-four-years-older/"
     },
     {
      "label": "Utah Legislature",
      "url": "https://le.utah.gov/~2025/bills/static/SB0076.html"
     }
    ]
   },
   {
    "title": "Curb classroom screen time and set AI guardrails (HB 273, 2026 — the BALANCE Act)",
    "detail": "Chief-sponsored the first-in-the-nation BALANCE Act, which sets grade-level screen-time limits (most restrictive in K–3), directs every district to adopt an AI-use policy, and expands parental transparency. It cleared the House 68-1, passed the Senate, and was signed into law, taking effect July 1, 2026.",
    "verdict": "kept",
    "sources": [
     {
      "label": "Utah Legislature",
      "url": "https://le.utah.gov/~2026/bills/static/HB0273.html"
     },
     {
      "label": "Deseret News",
      "url": "https://www.deseret.com/politics/2026/01/06/utah-lawmakers-propose-bills-to-restrict-education-technology-in-public-classrooms-to-improve-learning-outcomes/"
     }
    ]
   },
   {
    "title": "Launch a statewide dyslexia screening pilot (HB 393, 2026)",
    "detail": "Chief-sponsored the Early Intervention for Dyslexia Amendments, creating a Dyslexia Screening Pilot Program and a University of Utah screener with a $3.5M appropriation for FY2027. It passed unanimously in the Senate with overwhelming House support and was signed into law on March 19, 2026.",
    "verdict": "kept",
    "sources": [
     {
      "label": "Utah Legislature",
      "url": "https://le.utah.gov/~2026/bills/static/HB0393.html"
     },
     {
      "label": "UEA Under the Dome",
      "url": "https://myuea.org/advocating-change/underthedome/under-dome-capitol-insights-uea"
     }
    ]
   },
   {
    "title": "Expand paid postpartum and family leave for state employees (HB 329, 2026)",
    "detail": "Chief-sponsored the State Employee Maternity and Leave Amendments, increasing paid postpartum recovery leave and adding paid adoption and foster-care leave for state employees, plus protections for pumping breast milk. It passed and was signed into law.",
    "verdict": "kept",
    "sources": [
     {
      "label": "Utah Legislature",
      "url": "https://le.utah.gov/~2026/bills/static/HB0329.html"
     },
     {
      "label": "Utah Business",
      "url": "https://www.utahbusiness.com/press-releases/2026/03/05/policy-project-house-bill-329-state-employee-maternity-leave-amendments/"
     }
    ]
   },
   {
    "title": "Close the AI loophole in child-protection law (HB 289, 2026)",
    "detail": "Chief-sponsored the Child Sexual Abuse Material Amendments, defining \"apparent child sexual abuse material\" so AI-generated explicit images of realistic minors are prosecutable and creating standalone offenses for it. The bill passed both chambers and was enacted.",
    "verdict": "kept",
    "sources": [
     {
      "label": "Utah Legislature",
      "url": "https://le.utah.gov/~2026/bills/static/HB0289.html"
     }
    ]
   },
   {
    "title": "Create a state AI-in-education task force (HB 168, 2025)",
    "detail": "Chief-sponsored legislation to stand up an Artificial Intelligence in Education Task Force with student-data and privacy protections. Despite unanimous, bipartisan support at every committee and floor vote, the bill ran out of time on the session’s final day and did not become law.",
    "verdict": "broken",
    "sources": [
     {
      "label": "Utah Legislature",
      "url": "https://le.utah.gov/~2025/bills/static/HB0168.html"
     },
     {
      "label": "Sutherland Institute",
      "url": "https://sutherlandinstitute.org/utahs-path-to-leadership-on-artificial-intelligence-in-education/"
     }
    ]
   }
  ]
 },
 "koford_h10": {
  "name": "Jill Koford",
  "office": "Utah State Representative",
  "state": "UT District 10 (South Ogden, Weber County)",
  "party": "R",
  "termStart": "2025-01",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Weber County",
   "Small Business",
   "Education",
   "Local Government"
  ]
 },
 "cory_maloy_h52": {
  "name": "Cory Maloy",
  "office": "Utah State Representative",
  "state": "UT District 52 (Lehi, Utah County)",
  "party": "R",
  "termStart": "2017-01",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Utah County",
   "Public Safety",
   "Limited Government",
   "Growth"
  ]
 },
 "whyte_h63": {
  "name": "Stephen L. Whyte",
  "office": "Utah State Representative",
  "state": "UT District 63 (Spanish Fork, Utah County)",
  "party": "R",
  "termStart": "2021-11",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Utah County",
   "Agriculture",
   "Water",
   "Rural Growth"
  ]
 },
 "gwynn_h6": {
  "name": "Matthew Gwynn",
  "office": "Former Utah State Representative",
  "state": "UT District 6 (Box Elder / Weber County) · resigned March 2026",
  "party": "R",
  "termStart": "2021-01",
  "termEnd": "2026-03",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Public Safety",
   "Box Elder County",
   "Weber County",
   "Rural Growth"
  ]
 },
 "auxier_h4": {
  "name": "Tiara Auxier",
  "office": "Utah State Representative",
  "state": "UT District 4 (Morgan / Summit / Rich County)",
  "party": "R",
  "termStart": "2025-01",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Local Control",
   "Property Taxes",
   "Land Use",
   "Rural Communities"
  ]
 },
 "kohler_h59": {
  "name": "Mike Kohler",
  "office": "Utah State Representative",
  "state": "UT District 59 (Heber City, Wasatch / Summit County)",
  "party": "R",
  "termStart": "2021-01",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Wasatch County",
   "Water",
   "Agriculture",
   "Growth"
  ]
 },
 "shelley_h66": {
  "name": "Troy Shelley",
  "office": "Utah State Representative",
  "state": "UT District 66 (Ephraim, Sanpete / Juab County)",
  "party": "R",
  "termStart": "2025-01",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Sanpete County",
   "Juab County",
   "Agriculture",
   "Rural Communities"
  ]
 },
 "chew_h68": {
  "name": "Scott Chew",
  "office": "Utah State Representative",
  "state": "UT District 68 (Vernal, Uintah / Duchesne County)",
  "party": "R",
  "termStart": "2015-01",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Uintah Basin",
   "Agriculture",
   "Energy",
   "Public Lands"
  ]
 },
 "biden": {
  "name": "Joe Biden",
  "office": "46th President",
  "state": "U.S.",
  "party": "D",
  "termStart": "2021-01",
  "termEnd": "2025-01",
  "score": 48,
  "kept": 74,
  "broken": 56,
  "pending": 29,
  "icon": "🦅",
  "issues": [
   "COVID-19 Recovery",
   "Infrastructure",
   "Climate & Clean Energy",
   "Student Loans"
  ]
 },
 "obama": {
  "name": "Barack Obama",
  "office": "44th President",
  "state": "U.S.",
  "party": "D",
  "termStart": "2009-01",
  "termEnd": "2017-01",
  "score": 53,
  "kept": 257,
  "broken": 129,
  "pending": 0,
  "icon": "🦅",
  "issues": [
   "Healthcare Reform (ACA)",
   "Economic Recovery",
   "Climate Policy",
   "Iran Nuclear Deal"
  ]
 },
 "gwbush": {
  "name": "George W. Bush",
  "office": "43rd President",
  "state": "U.S.",
  "party": "R",
  "termStart": "2001-01",
  "termEnd": "2009-01",
  "score": 40,
  "kept": 46,
  "broken": 58,
  "pending": 0,
  "icon": "🦅",
  "issues": [
   "War on Terror",
   "Tax Cuts",
   "Education Reform",
   "Medicare Part D"
  ]
 },
 "rfkjr": {
  "name": "Robert F. Kennedy Jr.",
  "office": "HHS Secretary",
  "state": "National",
  "party": "R",
  "termStart": "2025-02",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 12,
  "icon": "🦅",
  "issues": [
   "Vaccine Policy",
   "Food & Nutrition Reform",
   "Chronic Disease",
   "Drug Prices"
  ]
 },
 "sanders": {
  "name": "Bernie Sanders",
  "office": "U.S. Senator",
  "state": "Vermont",
  "party": "I (D caucus)",
  "termStart": "2007-01",
  "score": 62,
  "kept": 28,
  "broken": 14,
  "pending": 8,
  "icon": "🏛",
  "issues": [
   "Medicare for All",
   "Income Inequality",
   "Climate Action",
   "Minimum Wage"
  ]
 },
 "nhaley": {
  "name": "Nikki Haley",
  "office": "Former UN Ambassador",
  "state": "South Carolina",
  "party": "R",
  "termStart": "2017-01",
  "termEnd": "2018-12",
  "score": 55,
  "kept": 18,
  "broken": 12,
  "pending": 3,
  "icon": "🦅",
  "issues": [
   "Foreign Policy",
   "Fiscal Conservatism",
   "National Debt",
   "China Policy"
  ]
 },
 "dballard": {
  "name": "Derek Ballard",
  "office": "U.S. House Candidate",
  "state": "Utah · UT-1",
  "party": "D",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 5,
  "icon": "🏛",
  "issues": [
   "Veterans Affairs",
   "Rural Healthcare",
   "Fiscal Responsibility",
   "Campaign Finance"
  ]
 },
 "jjohnson": {
  "name": "Jen Johnson",
  "office": "U.S. House Candidate",
  "state": "Utah · UT-4",
  "party": "D",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 4,
  "icon": "🏛",
  "issues": [
   "Education",
   "Healthcare",
   "Environmental Protection",
   "Worker Rights"
  ]
 },
 "jknotts": {
  "name": "John Knotts",
  "office": "UT State Representative",
  "state": "UT District 65 (Park City)",
  "party": "D",
  "score": 57,
  "kept": 10,
  "broken": 5,
  "pending": 4,
  "icon": "🏛",
  "issues": [
   "Environment",
   "Affordable Housing",
   "Tourism Economy",
   "Water Conservation"
  ]
 },
 "fgibson": {
  "name": "Francis Gibson",
  "office": "UT State Representative",
  "state": "UT District 60 (Utah County)",
  "party": "R",
  "score": 64,
  "kept": 15,
  "broken": 6,
  "pending": 4,
  "icon": "🏛",
  "issues": [
   "School Choice",
   "Tax Reform",
   "Business Development",
   "Constitutional Rights"
  ]
 },
 "jdougall": {
  "name": "John Dougall",
  "office": "Former UT State Auditor",
  "state": "Utah",
  "party": "R",
  "termStart": "2013-01",
  "termEnd": "2025-01",
  "score": 66,
  "kept": 18,
  "broken": 5,
  "pending": 4,
  "icon": "🏛",
  "issues": [
   "Government Accountability",
   "Fiscal Transparency",
   "Audit Reform",
   "Taxpayer Protection"
  ]
 },
// ── STATE SENATE wave 1 — California, Texas, New York, Florida (July 2026).
//    (Hughes, McGuire, Albritton and Stewart-Cousins already exist in the roster
//     under bryan_hughes / mike_mcguire / ben_albritton / stewart_cousins and are
//     enriched via cmp-data-detail.js + their existing stance arrays instead.) ──
 "limon_ca": {
  "name": "Monique Limón", "office": "California State Senator", "state": "California",
  "district": "SD 19", "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate Leadership", "Consumer Finance", "Housing", "Santa Barbara"]
 },
 "wiener_ca": {
  "name": "Scott Wiener", "office": "California State Senator", "state": "California",
  "district": "SD 11", "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["AI Safety (SB 1047)", "Housing (YIMBY)", "Transit", "San Francisco"]
 },
 "bjones_ca": {
  "name": "Brian Jones", "office": "California State Senator", "state": "California",
  "district": "SD 40", "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate GOP Leader", "Cost of Living", "Public Safety", "San Diego"]
 },
 "bettencourt_tx": {
  "name": "Paul Bettencourt", "office": "Texas State Senator", "state": "Texas",
  "district": "SD 7", "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Property Taxes", "Higher Education", "Taxpayer Watchdog", "Houston"]
 },
 "paxton_tx": {
  "name": "Angela Paxton", "office": "Texas State Senator", "state": "Texas",
  "district": "SD 8", "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Economic Development", "Securities (SB 860)", "Education", "Collin County"]
 },
 "gutierrez_tx": {
  "name": "Roland Gutiérrez", "office": "Texas State Senator", "state": "Texas",
  "district": "SD 19", "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Gun Safety", "Uvalde", "Health Access", "San Antonio"]
 },
 "gianaris_ny": {
  "name": "Michael Gianaris", "office": "New York State Senator", "state": "New York",
  "district": "SD 12", "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Amazon HQ2 Fight", "Bail Reform", "Queens", "Retiring 2026"]
 },
 "ortt_ny": {
  "name": "Rob Ortt", "office": "New York State Senator", "state": "New York",
  "district": "SD 62", "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate GOP Leader", "Affordability", "Public Safety", "Western NY"]
 },
 "pizzo_fl": {
  "name": "Jason Pizzo", "office": "Florida State Senator", "state": "Florida",
  "district": "SD 37", "party": "I", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Left Democratic Party", "Independent Gov Run", "Public Safety", "Miami-Dade"]
 },
 "passidomo_fl": {
  "name": "Kathleen Passidomo", "office": "Florida State Senator", "state": "Florida",
  "district": "SD 28", "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Live Local Act", "Housing", "Insurance", "Naples"]
 },
// ── STATE SENATE wave 2 — Pennsylvania, Illinois, Ohio (July 2026).
//    (Kim Ward, Jay Costa, Don Harmon and Rob McColley already exist under
//     kim_ward / jay_costa / don_harmon / rob_mccolley and are enriched via
//     cmp-data-detail.js + their existing stance arrays instead.) ──
 "joe_pittman": {
  "name": "Joe Pittman", "office": "Pennsylvania State Senator", "state": "Pennsylvania",
  "district": "SD 41", "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate Majority Leader", "Energy", "State Budget", "Indiana County"]
 },
 "doug_mastriano": {
  "name": "Doug Mastriano", "office": "Pennsylvania State Senator", "state": "Pennsylvania",
  "district": "SD 33", "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["2020 Election Denial", "Jan. 6", "2022 Gov Nominee", "Franklin / Adams"]
 },
 "sharif_street": {
  "name": "Sharif Street", "office": "Pennsylvania State Senator", "state": "Pennsylvania",
  "district": "SD 3", "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["PA Dem Party Chair", "Cannabis Legalization", "Justice Reform", "Philadelphia"]
 },
 "kimberly_lightford": {
  "name": "Kimberly Lightford", "office": "Illinois State Senator", "state": "Illinois",
  "district": "SD 4", "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate Majority Leader", "SAFE-T Act", "$15 Minimum Wage", "West Suburbs"]
 },
 "john_curran_il": {
  "name": "John Curran", "office": "Illinois State Senator", "state": "Illinois",
  "district": "SD 41", "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate GOP Leader", "Public Safety", "Ethics Reform", "DuPage County"]
 },
 "robert_peters_il": {
  "name": "Robert Peters", "office": "Illinois State Senator", "state": "Illinois",
  "district": "SD 13", "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Running for Congress", "Justice Reform", "Labor", "Chicago"]
 },
 "theresa_gavarone": {
  "name": "Theresa Gavarone", "office": "Ohio State Senator", "state": "Ohio",
  "district": "SD 2", "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate Majority Leader", "Voter ID", "Taxes", "NW Ohio"]
 },
 "nickie_antonio": {
  "name": "Nickie Antonio", "office": "Ohio State Senator", "state": "Ohio",
  "district": "SD 23", "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate Minority Leader", "First LGBTQ Legislator", "Health", "Cleveland Area"]
 },
// ── STATE SENATE wave 3 — Georgia, North Carolina, Michigan (July 2026).
//    (Winnie Brinks, Phil Berger and Mallory McMorrow already have curated
//     stances; Brinks & Berger already have roster entries and are enriched via
//     cmp-data-detail.js, while McMorrow gains a roster entry + bio here and keeps
//     her existing stance array.) ──
 "larry_walker_ga": {
  "name": "Larry Walker III", "office": "Georgia State Senator", "state": "Georgia",
  "district": "SD 20", "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate President pro Tem", "School Choice", "Taxes", "Perry / Middle GA"]
 },
 "jason_anavitarte": {
  "name": "Jason Anavitarte", "office": "Georgia State Senator", "state": "Georgia",
  "district": "SD 31", "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate Majority Leader", "Kids' Online Safety", "Gun Rights", "Paulding County"]
 },
 "harold_jones_ga": {
  "name": "Harold Jones II", "office": "Georgia State Senator", "state": "Georgia",
  "district": "SD 22", "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate Democratic Leader", "Justice Reform", "Medicaid Expansion", "Augusta"]
 },
 "michael_lee_nc": {
  "name": "Michael Lee", "office": "North Carolina State Senator", "state": "North Carolina",
  "district": "SD 7", "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate Majority Leader", "School Vouchers", "Income-Tax Cuts", "Wilmington"]
 },
 "sydney_batch": {
  "name": "Sydney Batch", "office": "North Carolina State Senator", "state": "North Carolina",
  "district": "SD 17", "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate Democratic Leader", "Abortion Rights", "Health & Family", "Wake County"]
 },
 "ralph_hise": {
  "name": "Ralph Hise", "office": "North Carolina State Senator", "state": "North Carolina",
  "district": "SD 47", "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Redistricting Architect", "Deputy Pro Tem", "Taxes", "Western NC"]
 },
 "aric_nesbitt": {
  "name": "Aric Nesbitt", "office": "Michigan State Senator", "state": "Michigan",
  "district": "SD 20", "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate GOP Leader", "Running for Governor", "Taxes & Roads", "SW Michigan"]
 },
 "jeremy_moss": {
  "name": "Jeremy Moss", "office": "Michigan State Senator", "state": "Michigan",
  "district": "SD 7", "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate President pro Tem", "First Openly Gay MI Senator", "Transparency", "Southfield"]
 },
 "mallory_mcmorrow": {
  "name": "Mallory McMorrow", "office": "Michigan State Senator", "state": "Michigan",
  "district": "SD 8", "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Majority Whip", "2022 Viral Speech", "Ran for U.S. Senate", "Oakland County"]
 },
// ── STATE SENATE wave 4 — New Jersey, Virginia, Arizona, Washington (July 2026).
//    (Nicholas Scutari and Warren Petersen already exist with curated stances and
//     are enriched via cmp-data-detail.js instead of being duplicated here.) ──
 "teresa_ruiz": {
  "name": "Teresa Ruiz", "office": "New Jersey State Senator", "state": "New Jersey",
  "district": "LD 29", "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate Majority Leader", "Education Reform", "Working Families", "Newark"]
 },
 "anthony_bucco": {
  "name": "Anthony Bucco", "office": "New Jersey State Senator", "state": "New Jersey",
  "district": "LD 25", "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate GOP Leader", "Property Taxes", "Public Safety", "Morris County"]
 },
 "louise_lucas": {
  "name": "Louise Lucas", "office": "Virginia State Senator", "state": "Virginia",
  "district": "SD 18", "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["FBI Search Warrant", "President pro Tem", "Finance Chair", "Portsmouth"]
 },
 "scott_surovell": {
  "name": "Scott Surovell", "office": "Virginia State Senator", "state": "Virginia",
  "district": "SD 34", "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate Majority Leader", "Justice Reform", "Clean Energy", "Fairfax"]
 },
 "ryan_mcdougle": {
  "name": "Ryan McDougle", "office": "Virginia State Senator", "state": "Virginia",
  "district": "SD 26", "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate GOP Leader", "Taxes", "Abortion", "Hanover County"]
 },
 "priya_sundareshan": {
  "name": "Priya Sundareshan", "office": "Arizona State Senator", "state": "Arizona",
  "district": "LD 18", "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate Democratic Leader", "Water & Drought", "Abortion Rights", "Tucson"]
 },
 "wendy_rogers": {
  "name": "Wendy Rogers", "office": "Arizona State Senator", "state": "Arizona",
  "district": "LD 7", "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate Censure (2022)", "Election Denial", "Border", "Northern AZ"]
 },
 "jake_hoffman": {
  "name": "Jake Hoffman", "office": "Arizona State Senator", "state": "Arizona",
  "district": "LD 15", "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Indicted 'Fake Elector'", "Freedom Caucus Chair", "Border", "Gilbert"]
 },
 "jamie_pedersen": {
  "name": "Jamie Pedersen", "office": "Washington State Senator", "state": "Washington",
  "district": "LD 43", "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate Majority Leader", "Marriage Equality", "Housing Supply", "Seattle"]
 },
 "john_braun": {
  "name": "John Braun", "office": "Washington State Senator", "state": "Washington",
  "district": "LD 20", "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate GOP Leader", "Running for Congress", "Taxes", "SW Washington"]
 },
 "manka_dhingra": {
  "name": "Manka Dhingra", "office": "Washington State Senator", "state": "Washington",
  "district": "LD 45", "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Behavioral Health", "Deputy Majority Leader", "Justice Reform", "Redmond"]
 },
// ── STATE SENATE wave 5 — Massachusetts, Wisconsin, Minnesota, Colorado (July 2026).
//    (Karen Spilka, Erin Murphy and James Coleman already exist with curated
//     stances and are enriched via cmp-data-detail.js instead of being duplicated.) ──
 "cynthia_creem": {
  "name": "Cynthia Creem", "office": "Massachusetts State Senator", "state": "Massachusetts",
  "district": "Norfolk & Middlesex", "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate Majority Leader", "Climate Law", "Civil Rights", "Newton"]
 },
 "bruce_tarr": {
  "name": "Bruce Tarr", "office": "Massachusetts State Senator", "state": "Massachusetts",
  "district": "First Essex & Middlesex", "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate GOP Leader", "Taxes", "Commercial Fishing", "Gloucester"]
 },
 "mary_felzkowski": {
  "name": "Mary Felzkowski", "office": "Wisconsin State Senator", "state": "Wisconsin",
  "district": "SD 12", "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate President", "Tax Cuts", "Medical Marijuana", "Northern WI"]
 },
 "devin_lemahieu": {
  "name": "Devin LeMahieu", "office": "Wisconsin State Senator", "state": "Wisconsin",
  "district": "SD 9", "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate Majority Leader", "Retiring 2026", "Flat Tax", "Sheboygan"]
 },
 "dianne_hesselbein": {
  "name": "Dianne Hesselbein", "office": "Wisconsin State Senator", "state": "Wisconsin",
  "district": "SD 27", "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate Democratic Leader", "Public Schools", "Abortion Rights", "Dane County"]
 },
 "bobby_joe_champion": {
  "name": "Bobby Joe Champion", "office": "Minnesota State Senator", "state": "Minnesota",
  "district": "SD 59", "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["First Black Senate President", "Economic Opportunity", "Family & Equity", "North Minneapolis"]
 },
 "mark_johnson_mn": {
  "name": "Mark Johnson", "office": "Minnesota State Senator", "state": "Minnesota",
  "district": "SD 1", "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate GOP Leader", "Taxes", "Agriculture", "NW Minnesota"]
 },
 "robert_rodriguez_co": {
  "name": "Robert Rodriguez", "office": "Colorado State Senator", "state": "Colorado",
  "district": "SD 32", "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate Majority Leader", "Data Privacy", "Workers & Labor", "Denver"]
 },
 "cleave_simpson": {
  "name": "Cleave Simpson", "office": "Colorado State Senator", "state": "Colorado",
  "district": "SD 6", "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate GOP Leader", "Water & Drought", "Agriculture", "San Luis Valley"]
 },
// ── STATE SENATE wave 6 — Tennessee, Indiana, Missouri, Maryland (July 2026).
//    (Bill Ferguson already exists with curated stances and is enriched via
//     cmp-data-detail.js instead of being duplicated here.) ──
 "randy_mcnally": {
  "name": "Randy McNally", "office": "Tennessee State Senator", "state": "Tennessee",
  "district": "SD 5", "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Lt. Gov / Senate Speaker", "Retiring 2026", "Fiscal Hawk", "Oak Ridge"]
 },
 "jack_johnson_tn": {
  "name": "Jack Johnson", "office": "Tennessee State Senator", "state": "Tennessee",
  "district": "SD 27", "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate Majority Leader", "Taxes", "School Choice", "Franklin"]
 },
 "raumesh_akbari": {
  "name": "Raumesh Akbari", "office": "Tennessee State Senator", "state": "Tennessee",
  "district": "SD 29", "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate Democratic Leader", "Health Care", "Justice Reform", "Memphis"]
 },
 "rodric_bray": {
  "name": "Rodric Bray", "office": "Indiana State Senator", "state": "Indiana",
  "district": "SD 37", "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate President pro Tem", "Defied Trump on Maps", "Fiscal Restraint", "Martinsville"]
 },
 "chris_garten": {
  "name": "Chris Garten", "office": "Indiana State Senator", "state": "Indiana",
  "district": "SD 45", "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Quit Leadership 2026", "Trump-Aligned", "Veterans", "Southern Indiana"]
 },
 "shelli_yoder": {
  "name": "Shelli Yoder", "office": "Indiana State Senator", "state": "Indiana",
  "district": "SD 40", "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate Democratic Leader", "Abortion Rights", "Public Schools", "Bloomington"]
 },
 "cindy_olaughlin": {
  "name": "Cindy O'Laughlin", "office": "Missouri State Senator", "state": "Missouri",
  "district": "SD 18", "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["First Woman to Lead Senate", "School Choice", "Taxes", "Shelbina"]
 },
 "tony_luetkemeyer": {
  "name": "Tony Luetkemeyer", "office": "Missouri State Senator", "state": "Missouri",
  "district": "SD 34", "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate Majority Leader", "Public Safety", "Taxes", "Parkville"]
 },
 "doug_beck": {
  "name": "Doug Beck", "office": "Missouri State Senator", "state": "Missouri",
  "district": "SD 1", "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate Democratic Leader", "Labor & Workers", "Health Care", "Affton"]
 },
 "nancy_king": {
  "name": "Nancy King", "office": "Maryland State Senator", "state": "Maryland",
  "district": "SD 39", "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate Majority Leader", "Public Schools", "Health Care", "Montgomery County"]
 },
 "steve_hershey": {
  "name": "Steve Hershey", "office": "Maryland State Senator", "state": "Maryland",
  "district": "SD 36", "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate GOP Leader", "Taxes", "Eastern Shore", "Agriculture"]
 },
// ── STATE SENATE wave 7 — Nevada, New Hampshire, Kentucky, Louisiana (July 2026).
//    (Nicole Cannizzaro, Sharon Carson and Robert Stivers already exist with
//     curated stances and are enriched via cmp-data-detail.js instead of duplicated.) ──
 "robin_titus": {
  "name": "Robin Titus", "office": "Nevada State Senator", "state": "Nevada",
  "district": "SD 17", "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate GOP Leader", "Rural Health Care", "Taxes", "Lyon County"]
 },
 "marilyn_dondero_loop": {
  "name": "Marilyn Dondero Loop", "office": "Nevada State Senator", "state": "Nevada",
  "district": "SD 8", "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate President pro Tem", "Public Education", "Health & Families", "Las Vegas"]
 },
 "regina_birdsell": {
  "name": "Regina Birdsell", "office": "New Hampshire State Senator", "state": "New Hampshire",
  "district": "SD 19", "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate Majority Leader", "No Income Tax", "Election Law", "Hampstead"]
 },
 "rebecca_perkins_kwoka": {
  "name": "Rebecca Perkins Kwoka", "office": "New Hampshire State Senator", "state": "New Hampshire",
  "district": "SD 21", "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate Democratic Leader", "LGBTQ Leader", "Housing", "Portsmouth"]
 },
 "max_wise": {
  "name": "Max Wise", "office": "Kentucky State Senator", "state": "Kentucky",
  "district": "SD 16", "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate Majority Leader", "School Safety", "Veterans", "Campbellsville"]
 },
 "gerald_neal": {
  "name": "Gerald Neal", "office": "Kentucky State Senator", "state": "Kentucky",
  "district": "SD 33", "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate Democratic Leader", "Civil Rights", "Voting Access", "Louisville"]
 },
 "cameron_henry": {
  "name": "Cameron Henry", "office": "Louisiana State Senator", "state": "Louisiana",
  "district": "SD 9", "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate President", "Budget & Tax Overhaul", "Landry Ally", "Metairie"]
 },
 "jeremy_stine": {
  "name": "Jeremy Stine", "office": "Louisiana State Senator", "state": "Louisiana",
  "district": "SD 27", "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate Majority Leader", "Insurance Crisis", "Energy", "Lake Charles"]
 },
 "royce_duplessis": {
  "name": "Royce Duplessis", "office": "Louisiana State Senator", "state": "Louisiana",
  "district": "SD 5", "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Taking On Insurers", "Justice Reform", "Minority Voice", "New Orleans"]
 },
// ── STATE SENATE wave 8 — Oregon, South Carolina, Alabama, Connecticut (July 2026). ──
 "rob_wagner": {
  "name": "Rob Wagner", "office": "Oregon State Senator", "state": "Oregon",
  "district": "SD 19", "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate President", "Public Education", "Housing", "Lake Oswego"]
 },
 "kayse_jama": {
  "name": "Kayse Jama", "office": "Oregon State Senator", "state": "Oregon",
  "district": "SD 24", "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate Majority Leader", "First African-Born Senator", "Housing", "East Portland"]
 },
 "bruce_starr": {
  "name": "Bruce Starr", "office": "Oregon State Senator", "state": "Oregon",
  "district": "SD 12", "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate GOP Leader", "Measure 113 Fallout", "Taxes", "Yamhill County"]
 },
 "thomas_alexander": {
  "name": "Thomas Alexander", "office": "South Carolina State Senator", "state": "South Carolina",
  "district": "SD 1", "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate President", "Energy & Utilities", "Taxes", "Oconee County"]
 },
 "shane_massey": {
  "name": "Shane Massey", "office": "South Carolina State Senator", "state": "South Carolina",
  "district": "SD 25", "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate Majority Leader", "Abortion-Ban Push", "Taxes", "Edgefield"]
 },
 "margie_bright_matthews": {
  "name": "Margie Bright Matthews", "office": "South Carolina State Senator", "state": "South Carolina",
  "district": "SD 45", "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["'Sister Senator'", "Profile in Courage", "Rural Health", "Lowcountry"]
 },
 "garlan_gudger": {
  "name": "Garlan Gudger", "office": "Alabama State Senator", "state": "Alabama",
  "district": "SD 4", "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate President pro Tem", "Small Business", "Taxes", "Cullman"]
 },
 "steve_livingston": {
  "name": "Steve Livingston", "office": "Alabama State Senator", "state": "Alabama",
  "district": "SD 8", "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate Majority Leader", "Rural Broadband", "Taxes", "Scottsboro"]
 },
 "bobby_singleton": {
  "name": "Bobby Singleton", "office": "Alabama State Senator", "state": "Alabama",
  "district": "SD 24", "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate Democratic Leader", "Civil Rights", "Rural Health", "Black Belt"]
 },
 "martin_looney": {
  "name": "Martin Looney", "office": "Connecticut State Senator", "state": "Connecticut",
  "district": "SD 11", "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate President pro Tem", "Retiring 2026", "Police Accountability", "New Haven"]
 },
 "bob_duff": {
  "name": "Bob Duff", "office": "Connecticut State Senator", "state": "Connecticut",
  "district": "SD 25", "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate Majority Leader", "Climate & Energy", "Gun Safety", "Norwalk"]
 },
 "stephen_harding": {
  "name": "Stephen Harding", "office": "Connecticut State Senator", "state": "Connecticut",
  "district": "SD 30", "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Senate GOP Leader", "Taxes", "Cost of Living", "Brookfield"]
 },
// ── Sitting Utah State Senators — identity wiring only (July 2026) ────────────
// These seven seats were wired into KR_STATE_SENATE_INCUMBENTS (index.html) under
// invented `*_sN` ids that existed in NO other file: no roster record, no stance
// block, no Spotlight card. Meanwhile each of these senators ALREADY had a full
// curated stance block under a different id, so the Key Races wiring pointed at a
// pid that could never resolve a profile while the real person sat one table away.
// The fix keeps the id that carries the curated content and gives it the roster
// record it was missing — which is also why the ids below are NOT renamed to match
// their district: the stance key must equal the roster id or _resolveStanceList()
// needs yet another alias (see the mmckell note in stance-helpers.js).
//
// `score`/`kept`/`broken`/`pending` are deliberately null/0 — no promise ledger has
// been researched for these members, and inventing one would be worse than absent.
// `issues` are lifted verbatim from each member's own curated stance-card topics in
// politician-stances.js, not authored here.
 "cwilson": {
  "name": "Chris Wilson", "office": "UT State Senator", "state": "UT District 2 (Logan, Cache County)",
  "district": "SD 2", "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Property Taxes", "Higher Education", "Small Business & Economy", "Behavioral Health Crisis Care"]
 },
 "john_johnson": {
  "name": "John Johnson", "office": "UT State Senator", "state": "UT District 3 (North Ogden, Weber County)",
  "district": "SD 3", "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Intellectual Diversity & DEI", "Civics Education", "Healthcare Access", "Higher-Education Board Accountability"]
 },
 "jennifer_plumb": {
  "name": "Jennifer Plumb", "office": "UT State Senator", "state": "UT District 9 (Salt Lake City)",
  "district": "SD 9", "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Overdose Prevention", "Child & Maternal Health", "Gun Safety", "Healthcare Access"]
 },
 "lincoln_fillmore": {
  "name": "Lincoln Fillmore", "office": "UT State Senator", "state": "UT District 17 (South Jordan, Salt Lake County)",
  "district": "SD 17", "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["School Choice", "Income Taxes", "Housing Affordability", "Public Safety"]
 },
 "rwinterton": {
  "name": "Ronald Winterton", "office": "UT State Senator", "state": "UT District 20 (Roosevelt, Duchesne County)",
  "district": "SD 20", "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Energy & Resource Development", "Public Lands & Federalism", "Rural Roads & Infrastructure", "Colorado River Water"]
 },
 "dhinkins": {
  "name": "David Hinkins", "office": "UT State Senator", "state": "UT District 26 (Orangeville, Emery County)",
  "district": "SD 26", "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Agriculture & Rural Communities", "Protecting Coal Mining", "Rural Water Supply", "State Budget Stewardship"]
 },
 "dowens_st": {
  "name": "Derrin Owens", "office": "UT State Senator", "state": "UT District 27 (Fountain Green, Sanpete County)",
  "district": "SD 27", "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Water Rights", "Agriculture & Ranching", "Wildfire Resilience", "Rural Broadband & Infrastructure"]
 },
 // ── Sitting Utah State Representatives — identity wiring only (July 2026) ─────
 // The House half of the same clean-up as the senators above, and the same story in
 // a different chamber. Ten House districts were wired into KR_STATE_HOUSE_INCUMBENTS
 // (index.html) under ids that had NO roster record — six of them (`hooper_h22`,
 // `nelson_h28`, `matthews_h36`, `judkins_h42`, `albrecht_h67`, `phil_lyman_h69`)
 // existed in no other file at all, so `candidates: [incPid]` handed the UI a pid that
 // could never resolve a profile. In every case the representative who actually holds
 // the seat was ALREADY in the data set under a different id carrying a full curated
 // stance block, so the district was re-keyed to that id and the record it was missing
 // is added here.
 //
 // The ids are NOT renamed to match their district, for the same reason as the Senate
 // records: `_resolveStanceList()` looks up `ISSUE_STANCE_DATA[id]` first, so the
 // stance-card key must equal the roster id or the lookup needs yet another alias
 // (see the mmckell note in stance-helpers.js). The district lives in
 // `_UTAH_HOUSE_INFO`, which is the authority — never an id suffix.
 //
 // `score`/`kept`/`broken`/`pending` are deliberately null/0: no promise-tracking pass
 // has been run for these members and a fabricated score would be worse than none.
 // `issues` are lifted verbatim from each member's own curated stance-card topics in
 // politician-stances.js, not authored here.
 "jennifer_dailey_provost": {
  "name": "Jennifer Dailey-Provost", "office": "Utah State Representative",
  "state": "UT District 22 (Salt Lake City)",
  "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Medical Cannabis Access", "Healthcare Access", "LGBTQ+ Rights", "Air Quality & Environment"]
 },
 "grant_miller": {
  "name": "Grant Miller", "office": "Utah State Representative",
  "state": "UT District 24 (Salt Lake City)",
  "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Disability & Employment", "Homelessness & Civil Rights", "Marijuana Decriminalization", "Court-Fine Reform"]
 },
 "nicholeen_p_peck": {
  "name": "Nicholeen Peck", "office": "Utah State Representative",
  "state": "UT District 28 (Tooele, Tooele County)",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Parental Rights & Curriculum", "Homeschool Freedom", "Drugs in Schools", "Limited Government"]
 },
 "james_dunnigan": {
  "name": "James Dunnigan", "office": "Utah State Representative",
  "state": "UT District 36 (Taylorsville, Salt Lake County)",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Child Online Safety", "Housing Affordability", "Courts & Civil Law", "Prescription Drug Pricing"]
 },
 "clinton_okerlund": {
  "name": "Clinton Okerlund", "office": "Utah State Representative",
  "state": "UT District 42 (Sandy, Salt Lake County)",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["State Parks & Recreation", "Fiscal Accountability", "Little Cottonwood Transportation", "Clean Air & Emissions"]
 },
 "christine_watkins": {
  "name": "Christine Watkins", "office": "Utah State Representative",
  "state": "UT District 67 (Price, Carbon County)",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Public Safety & Crime", "Climate & Clean Energy", "Child Welfare & Families", "Grid & Transmission"]
 },
 "logan_monson": {
  "name": "Logan Monson", "office": "Utah State Representative",
  "state": "UT District 69 (Blanding, San Juan County)",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Roads & Infrastructure", "Rural Healthcare", "Agriculture & Grazing", "First Responder Support"]
 },
 "carl_albrecht": {
  "name": "Carl Albrecht", "office": "Utah State Representative",
  "state": "UT District 70 (Richfield, Sevier County)",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Reliable, Affordable Rural Energy", "Rural Jobs & Economic Development", "Agriculture, Water & Rural Communities"]
 },
 "colin_w_jack": {
  "name": "Colin W. Jack", "office": "Utah State Representative",
  "state": "UT District 73 (St. George, Washington County)",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Climate & Clean Energy", "Energy Independence", "Environmental Enforcement Reform", "Protect Productive Farmland"]
 },
 "walt_brooks": {
  "name": "Walt Brooks", "office": "Utah State Representative",
  "state": "UT District 75 (St. George, Washington County)",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Gun Rights", "Homeowner Rights", "Public Safety", "Limited Government"]
 },
 // Two more sitting representatives who were content-bearing but roster-less, which
 // is what had kept them out of BOTH Utah House tables: each had a curated stance
 // block and a Spotlight card under this id, but no record here, so 10e/10g had
 // nothing to check a district or an office against. Seats confirmed against the
 // public record before wiring — Nguyen succeeded Brian King in District 23 and was
 // seated Jan 2025; Matthews has held the Kearns seat since 2021, renumbered 38→37
 // by the 2023 redistricting. Same conventions as the block above: `score`/`kept`/
 // `broken`/`pending` stay null/0 because no promise-tracking pass has been run for
 // them, and `issues` are lifted verbatim from their own stance-card topics.
 "hoang_nguyen": {
  "name": "Hoang Nguyen", "office": "Utah State Representative",
  "state": "UT District 23 (Salt Lake City)",
  "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Great Salt Lake & Water", "School Safety & Student Health", "Immigrant & Refugee Representation", "Air Quality & Environment"]
 },
 "ashlee_matthews": {
  "name": "Ashlee Matthews", "office": "Utah State Representative",
  "state": "UT District 37 (Kearns, Salt Lake County)",
  "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "issues": ["Child Care Access", "Working Families & Workers", "Maternal Health Coverage", "Second-Chance Employment"]
 },
 // Rob Bishop, the third July 2026 addition and the only one that needed a decision
 // rather than a lookup. He was in the data set as a FORMER U.S. Representative with
 // curated stance cards and one Spotlight card, but with no roster record — so when
 // Matthew Gwynn resigned in March 2026 and Bishop won the April 25 GOP convention
 // special election for District 6 (sworn in May 6, 2026, filling the remainder of a
 // term that ends January 2027), there was no record to wire the seat to.
 //
 // The two honest representations were a separate state-House identity or this one
 // record with a current office. This is one record, because two ids for one living
 // person is exactly the split `calbrecht` had just been merged out of. What that
 // costs is that `office` can only name the office he holds NOW: assertion 10g fails
 // any /former/ in the office of a pid in _UTAH_HOUSE_INFO, and it should — that check
 // is what caught `gwynn_h6` outliving its member. So his federal service is carried
 // where a reader actually sees it and where it can be dated: the index.html profile
 // blurb and the spotlights-data.js card label both say "Former U.S. Rep. (2003–2021)"
 // in full. `termStart` is the May 2026 swearing-in for THIS seat, not his 1978 or
 // 2003 starts, and there is deliberately no `termEnd` — he is sitting.
 "rob_bishop": {
  "name": "Rob Bishop", "office": "Utah State Representative",
  "state": "UT District 6 (Box Elder / Weber County)",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2026-05",
  "issues": ["Election & Redistricting Reform", "Water Conservation", "Limited Government", "Term Limits", "Public Lands & Federalism"]
 },
 // The last three uncovered House seats whose sitting member was already content-bearing
 // here — each had a curated stance block and no roster record, which is the exact
 // condition that had kept them out of BOTH Utah House tables (10e/10g have no office or
 // district to check without a record). Seats confirmed against the public record, then
 // wired. Same minimal pattern as the records above: `score` null and kept/broken/pending
 // 0 because no promise-tracking pass has been run for them, `issues` lifted verbatim
 // from their own stance-card topics, and no `termEnd` — all three are sitting.
 "tracy_miller": {
  "name": "Tracy Miller", "office": "Utah State Representative",
  "state": "UT District 45 (South Jordan, Salt Lake County)",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2025-01",
  "issues": ["Affordable Child Care", "Child Tax Relief", "Public Schools", "Teacher Pay & Literacy", "Parental Engagement"]
 },
 // Seated May 5, 2026 by special election for the remainder of Jefferson Burton's term:
 // Burton resigned after moving out of District 64, and neither he nor his id ever held
 // this seat in the data set (there is no `jburton` roster record, and he appears in
 // neither Utah House table), so nothing stale had to be moved out of the way.
 "jackie_larson": {
  "name": "Jackie Larson", "office": "Utah State Representative",
  "state": "UT District 64 (Spanish Fork / Salem, Utah County)",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2026-05",
  "issues": ["Private Property Rights", "Water & Farmland", "Spending Transparency", "Parental Involvement"]
 },
 // Sworn in the same week as Bishop and Larson, succeeding Tyler Clancy, who resigned on
 // appointment as the state homelessness coordinator. The district is 60 (Provo), NOT the
 // 61 that the `utah_co` Key Races block runs — that is Lisa Shepherd's seat. Clancy has
 // no roster record either, so District 60 was simply uncovered rather than mis-held.
 "grant_pace": {
  "name": "Grant Pace", "office": "Utah State Representative",
  "state": "UT District 60 (Provo, Utah County)",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2026-05",
  "issues": ["Housing for Families", "Cut Government Waste", "Responsible Tax Cuts", "Water Conservation"]
 },
 // FIFTH July 2026 pass — the sweep. Eleven more House members who were
 // content-bearing here (a curated stance block, sometimes a Spotlight card) but
 // roster-less, so neither Utah House table could name them. Districts confirmed
 // against the public record first; each is post-2023 numbering.
 "verona_mauga": {
  "name": "Verona Mauga", "office": "Utah State Representative",
  "state": "UT District 31 (West Valley City / Taylorsville, Salt Lake County)",
  "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2025-01",
  "issues": ["Disability & Social Services", "Small Business", "Public Schools", "Bike-Lane Safety", "Protecting Veterans"]
 },
 "doug_owens": {
  "name": "Doug Owens", "office": "Utah State Representative",
  "state": "UT District 33 (Millcreek, Salt Lake County)",
  "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2021-01",
  "issues": ["Great Salt Lake & Water Conservation", "Clean Air", "Wetlands & Habitat", "Child Influencer Protections"]
 },
 // Announced in Dec 2025 that she will not seek re-election, but she is the
 // sitting member through the end of her term in January 2027 and therefore gets
 // NO `termEnd` — 10g rejects one on a pid the info map wires to a live seat, and
 // rightly: a retirement announcement is not a vacancy.
 "carol_spackman_moss": {
  "name": "Carol Spackman Moss", "office": "Utah State Representative",
  "state": "UT District 34 (Holladay, Salt Lake County)",
  "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2001-01",
  "issues": ["Public Schools", "Air Quality", "Gun Safety", "Opioid & Overdose Response", "Affordable Housing"]
 },
 "john_arthur": {
  "name": "John Arthur", "office": "Utah State Representative",
  "state": "UT District 41 (Cottonwood Heights, Salt Lake County)",
  "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2025-12",
  "issues": ["Great Salt Lake & Water", "Teacher Pay & Support", "Public-Employee Bargaining", "Renter Protections", "Transit & Livability"]
 },
 "calvin_roberts": {
  "name": "Calvin Roberts", "office": "Utah State Representative",
  "state": "UT District 46 (Draper / Bluffdale, Salt Lake County)",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2025-01",
  "issues": ["Roads & Infrastructure", "Economic Development", "Small Business", "Fuel-Tax Relief", "Transit Procurement"]
 },
 "candice_pierucci": {
  "name": "Candice Pierucci", "office": "Utah State Representative",
  "state": "UT District 49 (Herriman / Riverton, Salt Lake County)",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2019-11",
  "issues": ["School Choice", "Online Child Safety", "Taxes & Limited Government", "Maternal & Infant Health"]
 },
 "leah_hansen": {
  "name": "Leah Hansen", "office": "Utah State Representative",
  "state": "UT District 51 (Saratoga Springs / west Lehi, Utah County)",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2025-08",
  "issues": ["Limiting DEI Programs", "Religious Liberty", "Property-Tax Transparency", "Taxpayer Oversight", "Foreign Land Ownership"]
 },
 "kay_christofferson": {
  "name": "Kay Christofferson", "office": "Utah State Representative",
  "state": "UT District 53 (Lehi, Utah County)",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2013-01",
  "issues": ["Roads & Infrastructure", "Public Transit", "Growth & Mobility Planning", "Corridor Preservation & Property", "Road Usage Charge"]
 },
 "doug_welton": {
  "name": "Doug Welton", "office": "Utah State Representative",
  "state": "UT District 65 (Payson, Utah County)",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2021-01",
  "issues": ["Civics Education", "Phone-Free Classrooms", "Property Taxes", "Volunteer EMS Support", "Education Innovation"]
 },
 // The five Senate seats that had been left honestly empty because no roster
 // record existed to name them. Four were content-bearing under these ids
 // already; `cmusselman` had a Power-Map row and a browse entry. With these the
 // Senate reaches 29 of 29 and KR_STATE_SENATE_INCUMBENTS has no absent key left.
 "cmusselman": {
  "name": "Calvin Musselman", "office": "Utah State Senator",
  "state": "UT District 4 (West Haven, Weber County)",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2025-01",
  "issues": ["Child Online Safety", "Border Security", "Economic Development", "Human Trafficking Laws", "Penalties for Repeat Crime"]
 },
 // `party` is "F" — Forward Party. Not a typo and not a placeholder: index.html
 // renders 'F' / 'Forward' as "Forward Party", and she is the only SITTING member
 // of either chamber who is not R or D — her predecessor now has a record of his own
 // (`daniel_thatcher`, added by the August 2026 pass below) and carries the same 'F'.
 // Appointed Dec 12, 2025 and seated Dec 17 to fill the vacancy left when Daniel
 // Thatcher resigned; Thatcher holds nothing, which is what the "Former" in his
 // office and his `termEnd` say.
 "emily_buss": {
  "name": "Emily Buss", "office": "Utah State Senator",
  "state": "UT District 11 (Eagle Mountain / Tooele, Utah County)",
  "party": "F", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2025-12",
  "issues": ["Public Schools", "Government Transparency", "Roads & Transportation Funding", "Local Control of Growth", "Open, Nonpartisan Elections"]
 },
 // She served Utah House District 40 before winning this Senate seat in 2022, so
 // her Spotlight cards have to be read carefully: the one that still called her a
 // Representative was corrected to match its already-correct sibling rather than
 // being left to fail 6's chamber check the moment this record appeared.
 "stephanie_pitcher": {
  "name": "Stephanie Pitcher", "office": "Utah State Senator",
  "state": "UT District 14 (Salt Lake City / Millcreek, Salt Lake County)",
  "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2023-01",
  "issues": ["Criminal Justice Reform", "Bail & Pretrial Reform", "Mental Health & Courts", "AI in Law Enforcement", "Juvenile Justice"]
 },
 // Senate Minority Whip. Elected in 2018 to the pre-redistricting District 8; the
 // same territory is District 15 under post-2023 numbering, which is the number
 // this map keys on.
 "kathleen_riebe": {
  "name": "Kathleen Riebe", "office": "Utah State Senator",
  "state": "UT District 15 (Cottonwood Heights, Salt Lake County)",
  "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2019-01",
  "issues": ["Public Schools", "Healthcare Access", "Clean Air & Great Salt Lake", "Workers & Labor Rights", "Student & Youth Health"]
 },
 "heidi_balderree": {
  "name": "Heidi Balderree", "office": "Utah State Senator",
  "state": "UT District 22 (Saratoga Springs / Bluffdale, Utah County)",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2023-10",
  "issues": ["Veterans & Military", "Property Rights", "Property Taxes", "Charter & Public Education", "Citizen Referenda on Local Bonds"]
 },
 // SEVENTH July 2026 pass — the last five people who had curated content but no
 // roster record under EITHER of their two ids, so both ids dead-ended on
 // _pdxShowModalError. No alias was added for any of them: the ACCT_ALIAS entry
 // already pointed the sparse id at the id these records use, and PDXProfilePid()
 // accepts that hop the moment the target has a record. Same minimal pattern as
 // Miller / Pace / Larson — `score` null and kept/broken/pending 0 because no
 // promise-tracking pass has run, and `issues` lifted verbatim from each person's
 // own stance-card topics in block order (capped at five, matching the records
 // above). Districts and counties confirmed against the public record first.
 //
 // SITTING, fully wired into _UTAH_HOUSE_INFO + KR_STATE_HOUSE_INCUMBENTS[55].
 // In the House since Jan 2019: District 57 2019–2023, District 55 2023–present.
 // District 55 is a Utah County seat (Pleasant Grove / American Fork), which is why
 // this pass also corrects _UTAH_HOUSE_COUNTY[55] from 'Salt Lake County'.
 "jon_hawkins": {
  "name": "Jon Hawkins", "office": "Utah State Representative",
  "state": "UT District 55 (Pleasant Grove / American Fork, Utah County)",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2019-01",
  "issues": ["Economic Development", "Online Child Safety & Digital Wellness", "Stronger Sexual-Offense Laws", "Public Safety & Crime", "Sports & Recreation"]
 },
 // SITTING, and already present in BOTH Senate tables (_UTAH_SENATE_INFO d:10 and
 // KR_STATE_SENATE_INCUMBENTS[10]) — the roster record was the only missing layer,
 // so this adds no map entry. In the Senate since Jan 2009 (District 1 2009–2023,
 // District 10 2023–present) and Senate Minority Leader. She is the one person here
 // with no stance block, so `issues` is lifted verbatim from the `keyIssues` already
 // authored for her in EXPANSION_SUGGESTIONS; that entry's score 82 / 18-3-4 is an
 // unverified import figure and is deliberately NOT copied.
 "lescamilla": {
  "name": "Luz Escamilla", "office": "Utah State Senator",
  "state": "UT District 10 (Northwest Salt Lake City / West Valley City / Magna, Salt Lake County)",
  "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2009-01",
  "issues": ["Healthcare Access", "Air Quality & Inversion", "Intergenerational Poverty", "Language Access"]
 },
 // SITTING county officer — sheriff since Aug 2018 (appointed to a vacancy, then
 // elected), second term, 2026 Republican nominee for re-election, and president of
 // the Utah Sheriffs' Association. A county office, so no district wiring applies.
 // Icon matches the one his own curated stance block already uses.
 "mike_smith_sheriff": {
  "name": "Mike Smith", "office": "Utah County Sheriff",
  "state": "Utah · Utah County",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🛡",
  "termStart": "2018-08",
  "issues": ["Backing Deputies & Community Safety", "Deputy Wellness & Mental Health", "Second Amendment", "Transparency", "Rehabilitation in Corrections"]
 },
 // FORMER — held House District 60 (Provo) from Jan 2023 until he resigned in March
 // 2026 on appointment as Utah's state homeless coordinator (effective Mar 9 2026).
 // Grant Pace holds District 60, so Clancy gets a record and deliberately NO entry
 // in _UTAH_HOUSE_INFO or KR_STATE_HOUSE_INCUMBENTS. The `termEnd` and the "Former"
 // in `office` are both load-bearing: assertion 10g rejects either one from the
 // sitting House map, which is what keeps this from becoming another phil_lyman_h69.
 // The year range in `state` time-qualifies the district the same way Brammer's
 // House cards do, so no surface reads it as a live claim on seat 60.
 "tyler_clancy": {
  "name": "Tyler Clancy", "office": "Utah State Homeless Coordinator · Former UT State Representative",
  "state": "UT District 60 (Provo, Utah County) 2023–2026",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2023-01", "termEnd": "2026-03",
  "issues": ["Homelessness", "Public Safety", "Mental Health & Addiction Recovery", "Criminal Justice & Second Chances", "Taxes & Limited Government"]
 },
 // NO CURRENT OFFICE — mayor of Provo from Jan 2018 until Jan 2026, when she lost
 // the Nov 2025 election to Marsha Judkins (already here as `marsha_judkins_provo`,
 // which is why her old "Mayor of Provo" spotlight label is corrected in this pass:
 // two people cannot both hold it). She won the Jun 23 2026 Republican primary for
 // Utah County Commission Seat A; the general election is Nov 2026. Both facts are
 // time-qualified in `office`, so no surface claims she currently holds either post.
 "michelle_kaufusi": {
  "name": "Michelle Kaufusi", "office": "Former Mayor, Provo · 2026 Utah County Commission Nominee (Seat A)",
  "state": "Utah",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2018-01", "termEnd": "2026-01",
  "issues": ["Fiscal Discipline & Property Taxes", "Efficient County Government", "Infrastructure & Regional Planning", "ICE & Immigration Enforcement", "Experienced Executive Leadership"]
 },
 // ── EIGHTH PASS, August 2026 — the 27 Utah legislators whose 2025 recorded
 // votes the formal lane already held and had to throw away ────────────────
 // scripts/vr-utah-ingest.mjs read every contested floor vote of the 2025 General
 // Session off le.utah.gov. A roll-call cell prints "Schultz, M." and never a roster
 // id, so db/vr-utah-member-map.json carries a human identification for each printed
 // name, and a printed name with no entry there is counted, listed in the seed as
 // droppedNotOnRoster, and DISCARDED — never attributed to whoever holds that district
 // today. 26 of 75 representatives and 1 of 29 senators sat in that bucket for a
 // single reason: no record in this file. The votes existed and were parsed; the
 // person did not exist here to hang them on.
 //
 // TWENTY-FIVE OF THE TWENTY-SEVEN WERE ALREADY IN THE DATA SET. That is the finding
 // that shaped this pass. The first draft invented `thomas_peterson` as
 // `peterson_h1`, `nthurston` as `thurston_h62` and twenty-two more like them, and
 // assertion 10's profile-resolution guard caught fourteen of the twenty-four
 // immediately: each id it named already carried a curated stance block in
 // politician-stances.js, and several also carried Spotlight, consistency and
 // say-vs-do content. The other ten were slug-invisible to that guard
 // ("Norman K Thurston" does not slugify to `nthurston`) and would have shipped as
 // silent duplicates — two ids for one living person, which is exactly the split
 // `calbrecht` was merged out of. So every record below is keyed on the id the data
 // set was ALREADY using for that person, and `issues` is lifted verbatim from their
 // own stance-card topics in block order, capped at five, exactly as every identity
 // pass above did. Nothing here authors a stance.
 //
 // Identity is confirmed, not inferred, and the two riskiest cases are why: the
 // stance block labelled "Mike Petersen" and the one labelled "Jason Thompson" each
 // cite bills by number, and le.utah.gov's own bill JSON names their prime sponsor —
 // HB 95 (2025) is "Rep. Petersen, Michael J." and HB 190 (2026) is "Rep. Thompson,
 // Jason E.", the sitting members for districts 2 and 3. Eighteen of the twenty-three
 // sitting records were pinned that way (`mballard` by HB 248 (2024)'s sponsor code
 // BALLAMG, `cheryl_acton` by ACTONCK, `sahara_hayes` by HAYESS, and so on); the
 // remaining five carry a district or an occupation in their own block label and a
 // surname that is unique in the chamber. Names, parties, districts, counties and
 // service starts come from le.utah.gov/data/legislators.json, the chamber's own
 // roster. Where that source prints a name without a period ("Norman K Thurston") it
 // is carried that way rather than tidied, because the printed form is what a reader
 // comparing against the chamber will see.
 //
 // `score` is null and kept/broken/pending are 0 for the usual reason — no
 // promise-tracking pass has been run for any of them and a fabricated score is worse
 // than none. Two records carry `issues: []`, which is new in this file: Jefferson
 // Burton and Daniel Thatcher are the only two of the twenty-seven with no curated
 // stance block anywhere, and a topic list authored here would be indistinguishable
 // from a lifted one while being a guess about what a real legislator cares about.
 // Empty reads as empty, and every consumer of `issues` on this path guards for
 // length.
 //
 // NOTHING IS WIRED INTO _UTAH_HOUSE_INFO, KR_STATE_HOUSE_INCUMBENTS or
 // KEY_RACES_BY_LOCATION. A record here is enough to attach a vote cell and render a
 // profile; an entry in those tables asserts a live ballot seat and a verified county,
 // which is a larger claim and a different pass. Assertion 10e permits a roster id to
 // be absent from both tables, and that is exactly the state these are in — present,
 // honest, and not yet on a race card.
 //
 // Three of these names were REFUSED by the wave-1 member map rather than merely
 // unmapped: "Moss, J.", "Peterson, K." and "Peterson, T." each share a surname with
 // a different person already on the roster (Carol Spackman Moss at district 34, Val
 // Peterson at 56), and mapping on a shared surname is precisely how a vote gets
 // handed to a stranger. The refusals are cleared by adding the real people, not by
 // relaxing the rule: with Thomas W. Peterson at district 1 and Karen M. Peterson at
 // district 13 on the roster, the printed initial plus the district in the cell's own
 // leglookup link resolves all three uniquely.
 "thomas_peterson": {
  "name": "Thomas W. Peterson", "office": "Utah State Representative",
  "state": "UT District 1 (Box Elder / Cache County)",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2022-09",
  "issues": ["Wildfire Safety", "Building & Infrastructure", "Trades & Small Business", "Water Infrastructure", "Veterans"]
 },
 "mike_petersen": {
  "name": "Michael J. Petersen", "office": "Utah State Representative",
  "state": "UT District 2 (Cache County)",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2021-01",
  "issues": ["Election Integrity", "Transparency & Accountability", "Religious Liberty", "Property Rights", "Income Taxes"]
 },
 "jason_thompson": {
  "name": "Jason E. Thompson", "office": "Utah State Representative",
  "state": "UT District 3 (Cache County)",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2025-01",
  "issues": ["Child Care", "Opioids & Overdose", "Small Business & Licensing", "Higher Education", "Overdose Recognition"]
 },
 "ryan_d_wilcox": {
  "name": "Ryan D. Wilcox", "office": "Utah State Representative",
  "state": "UT District 7 (Weber County)",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2021-01",
  "issues": ["Child Online Safety", "School Safety & Student Health", "Limited Government", "Public Safety & Crime", "Gun Rights"]
 },
 "jason_b_kyle": {
  "name": "Jason B. Kyle", "office": "Utah State Representative",
  "state": "UT District 8 (Morgan / Weber County)",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2023-01",
  "issues": ["Gun Rights", "Addiction Recovery", "Higher Education", "Property & Farmland Taxes", "Election Integrity"]
 },
 "karen_m_peterson": {
  "name": "Karen M. Peterson", "office": "Utah State Representative",
  "state": "UT District 13 (Davis County)",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2022-01",
  "issues": ["Public Schools", "Roads & Infrastructure", "Economic Development & Innovation", "Higher-Ed Workforce Alignment", "Local Government"]
 },
 "stewart_e_barlow": {
  "name": "Stewart E. Barlow", "office": "Utah State Representative",
  "state": "UT District 17 (Davis County)",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2011-09",
  "issues": ["Healthcare Workforce", "Mental Health Access", "Public Health Authority", "Medical Workforce Pipeline", "Cultural & Antiquities Preservation"]
 },
 "paul_a_cutler": {
  "name": "Paul A. Cutler", "office": "Utah State Representative",
  "state": "UT District 18 (Davis County)",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2023-01",
  "issues": ["Roads & Infrastructure", "Transparency & Accountability", "Election Integrity", "Courts & Civil Law", "Artificial Intelligence Policy"]
 },
 "mballard": {
  "name": "Melissa G. Ballard", "office": "Utah State Representative",
  "state": "UT District 20 (Davis County)",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2019-01",
  "issues": ["Higher Education", "Criminal-Justice Reform", "Child Labor Protections", "Clean-Vehicle Incentives", "Government Efficiency"]
 },
 "matt_macpherson": {
  "name": "Matt MacPherson", "office": "Utah State Representative",
  "state": "UT District 26 (Salt Lake County)",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2023-10",
  "issues": ["Gun Rights", "Small Business & Licensing", "Student Data Security", "School Safety", "Limited Government"]
 },
 "anthony_loubet": {
  "name": "Anthony E. Loubet", "office": "Utah State Representative",
  "state": "UT District 27 (Salt Lake County)",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2023-01",
  "issues": ["Transparency & Open Records", "Public Safety & Policing", "Child Safety", "Workers' Compensation & Costs", "Courts & Civil Law"]
 },
 "sahara_hayes": {
  "name": "Sahara Hayes", "office": "Utah State Representative",
  "state": "UT District 32 (Salt Lake County)",
  "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2023-01",
  "issues": ["Gun Rights", "Transparency & Accountability", "LGBTQ+ Rights", "Victim Privacy", "Student Athlete Protections"]
 },
 "rosalba_dominguez": {
  "name": "Rosalba Dominguez", "office": "Utah State Representative",
  "state": "UT District 35 (Salt Lake County)",
  "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2025-01",
  "issues": ["Transparency & Accountability", "Housing Affordability", "Renewable Energy & Water", "Families in Need", "Women's Health"]
 },
 "cheryl_acton": {
  "name": "Cheryl K. Acton", "office": "Utah State Representative",
  "state": "UT District 38 (Salt Lake County)",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2017-09",
  "issues": ["Agriculture & Rural Communities", "Public Schools", "Transparency & Accountability", "Disability & Person-Centered Services", "Child Welfare & Kinship Placement"]
 },
 "andrew_stoddard": {
  "name": "Andrew Stoddard", "office": "Utah State Representative",
  "state": "UT District 40 (Salt Lake County)",
  "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2019-01",
  "issues": ["Criminal Justice & Public Safety", "Public Schools", "Workers & Cost of Living", "Housing Affordability", "Reproductive Rights"]
 },
 "mark_strong": {
  "name": "Mark A. Strong", "office": "Utah State Representative",
  "state": "UT District 47 (Salt Lake County)",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2019-01",
  "issues": ["Public Safety", "School Fees", "Children & Families", "Consumer Protection", "Medical Freedom"]
 },
 "doug_fiefia": {
  "name": "Doug Fiefia", "office": "Utah State Representative",
  "state": "UT District 48 (Salt Lake County)",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2025-01",
  "issues": ["Children in State Care", "Data Ownership & Privacy", "Faster Election Results", "Frontier AI Transparency", "Inmate Healthcare Costs"]
 },
 "kristen_chevrier": {
  "name": "Kristen Chevrier", "office": "Utah State Representative",
  "state": "UT District 54 (Utah County)",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2025-01",
  "issues": ["Public Schools", "Medical Freedom & Informed Consent", "Raw Milk & Food Freedom", "SNAP Nutrition Reform", "Vehicle Data Privacy"]
 },
 "nelson_abbott": {
  "name": "Nelson T. Abbott", "office": "Utah State Representative",
  "state": "UT District 57 (Utah County)",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2021-01",
  "issues": ["Criminal Competency Reform", "Estate Planning for the Digital Age", "Local Government Accountability", "Guardianship & Disability Rights", "Civil Commitment Reform"]
 },
 "david_shallenberger": {
  "name": "David Shallenberger", "office": "Utah State Representative",
  "state": "UT District 58 (Utah County)",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2025-01",
  "issues": ["Agriculture & Rural Communities", "Roads & Infrastructure", "Privacy & Surveillance", "Water Conservation", "Energy Efficiency"]
 },
 "nthurston": {
  "name": "Norman K Thurston", "office": "Utah State Representative",
  "state": "UT District 62 (Utah County)",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2015-01",
  "issues": ["Prescription Drug Costs", "Income Taxes", "Public Safety & Crime", "Election Integrity", "Health Workforce Access"]
 },
 "joseph_elison": {
  "name": "Joseph Elison", "office": "Utah State Representative",
  "state": "UT District 72 (Washington County)",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2023-01",
  "issues": ["Great Salt Lake & Water", "Online Education Accountability", "Retirement Readiness", "Anti-Gambling Enforcement", "State Fiscal Sovereignty"]
 },
 "r_neil_walter": {
  "name": "R. Neil Walter", "office": "Utah State Representative",
  "state": "UT District 74 (Washington County)",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2023-01",
  "issues": ["Public Schools", "Higher Education", "HOA & Homeowner Rights", "Whistleblower Protections", "Food Labeling Transparency"]
 },
 // FORMER MEMBERS — four of the 27, and the reason the roster needed them at all.
 // Each of their seats is already held by someone else here: john_arthur (41),
 // leah_hansen (51), jackie_larson (64) and emily_buss (Senate 11). Their 2025 votes
 // are theirs and must not land on a successor, which is what the "Former" office and
 // the `termEnd` buy — _homeIsOfficeholder() in ballot-breakdown.js requires
 // `termStart && !termEnd`, and the year range in `state` time-qualifies the district
 // the same way tyler_clancy's does, so no surface reads any of these as a live claim
 // on a seat.
 //
 // The district NUMBERS needed care, and are why the per-year roster
 // (le.utah.gov/asp/roster/roster.asp?year=YYYY) was read instead of the current one:
 // the 2023 renumbering moved every one of them. Bennion held District 46 in
 // 2021–2022 and 41 from 2023; Burton held 66 then 64; Moss held 2 from 2017 then 51;
 // Thatcher held Senate 12 from 2011 then 11. Each record below names the CURRENT
 // number with only the years that number applied to that person, and the earlier
 // number is recorded here in prose rather than in a field — one `state` string cannot
 // hold two seats without claiming both.
 //
 // `termStart` is a bare year for all four. voter-hub-location.js
 // _pdxParseTermDate() accepts "2021" as readily as "2021-01", and the per-year roster
 // establishes the first year of service but not the month, three of the four having
 // entered mid-cycle. `termEnd` is the month the seat changed hands, which is the date
 // this data set has actually verified: it is the `termStart` already carried by the
 // successor's own record above.
 //
 // Thatcher's `party` is "F" — Forward Party, the same value emily_buss carries and
 // the reason her comment above now says "sitting member" rather than "member": he
 // switched from Republican in 2023 and the chamber's own roster prints Forward for
 // him, so with this record there are two non-R/D entries and only one of them holds
 // a seat.
 "gay_lynn_bennion": {
  "name": "Gay Lynn Bennion", "office": "Former UT State Representative",
  "state": "UT District 41 (Cottonwood Heights, Salt Lake County) 2023–2025",
  "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2021", "termEnd": "2025-12",
  "issues": ["Public Education", "Healthcare Access", "Reproductive Rights", "Youth Mental Health", "Air Quality & Environment"]
 },
 "jefferson_moss": {
  "name": "Jefferson Moss", "office": "Former UT State Representative",
  "state": "UT District 51 (Saratoga Springs / west Lehi, Utah County) 2023–2025",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2017", "termEnd": "2025-08",
  "issues": ["Tech Economy & Jobs", "Workforce Education", "Broadband & Connectivity", "Government Efficiency", "Taxes & Growth"]
 },
 "jefferson_burton": {
  "name": "Jefferson S. Burton", "office": "Former UT State Representative",
  "state": "UT District 64 (Spanish Fork / Salem, Utah County) 2023–2026",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2021", "termEnd": "2026-05",
  "issues": []
 },
 "daniel_thatcher": {
  "name": "Daniel W. Thatcher", "office": "Former UT State Senator",
  "state": "UT District 11 (Eagle Mountain / Tooele, Utah County) 2023–2025",
  "party": "F", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2011", "termEnd": "2025-12",
  "issues": []
 },
// ── Voting Record unlock (July 2026) ──────────────────────────────────────
// The 20 db/vr-member-map.json slugs that had ingested roll-call data but no
// roster record, so openModal() dead-ended and the 🗳️ Voting Record section,
// the Votes nav pill, the per-issue consistency dots, the Stance Library
// "View votes" jump and the comparison-board indicators could never render.
// Identity wiring only: score is null because no promise ledger exists for any
// of them, and every `issues` string is lifted verbatim from that person's own
// existing stance cards. All 20 are sitting U.S. House members of the 119th
// Congress; see scripts/unlock-voting-record-20-jul2026.mjs for the per-member
// public-record confirmation and for why the full state name in `state` is
// load-bearing rather than cosmetic.
 // Sitting MS-02, in the House since Apr 13 1993; dean of the Mississippi delegation.
 "bennie_thompson": {
  "name": "Bennie Thompson", "office": "U.S. Representative",
  "state": "Mississippi · MS-02",
  "party": "D", "score": 100, "kept": 3, "broken": 0, "pending": 1, "icon": "🏛",
  "termStart": "1993-04",
  "issues": ["Criminal Justice", "Economy & Taxes", "Rural Broadband", "Infrastructure", "Disaster Recovery"],
  "promises": [
   {
    "title": "Connect rural Mississippi to high-speed internet",
    "detail": "Voted for the bipartisan infrastructure law and announced the resulting $1.2 billion BEAD allocation to build out Mississippi broadband.",
    "verdict": "kept",
    "issueKey": "broadband",
    "sources": [{ "label": "House.gov", "url": "https://benniethompson.house.gov/media/press-releases/congressman-thompson-announces-12-billion-allocated-mississippi-broadband" }]
   },
   {
    "title": "Bring federal disaster-recovery money to Delta communities",
    "detail": "Announced nearly $10 million in federal disaster-recovery investments for Delta regional communities.",
    "verdict": "kept",
    "issueKey": "water",
    "sources": [{ "label": "House.gov", "url": "https://benniethompson.house.gov/media/press-releases/congressman-bennie-thompson-announces-nearly-10-million-disaster-recovery" }]
   },
   {
    "title": "Insist that Congress, not the President, decides on war",
    "detail": "Says congressional oversight of the executive branch is not optional. Voted for H.Con.Res. 89, directing the removal of U.S. forces from hostilities with Iran under the War Powers Resolution; it passed 214–208 on July 23, 2026.",
    "verdict": "kept",
    "issueKey": "war_powers",
    "sources": [{ "label": "Congress.gov", "url": "https://www.congress.gov/bill/119th-congress/house-concurrent-resolution/89" }, { "label": "House Clerk", "url": "https://clerk.house.gov/Votes/2026282" }]
   },
   {
    "title": "Pass the Bolstering Security Against Ghost Guns Act",
    "detail": "Sponsored H.R. 2698 on April 7, 2025 to tighten controls on untraceable, self-assembled firearms. It has had no floor action.",
    "verdict": "pending",
    "issueKey": "gun_safety",
    "sources": [{ "label": "Congress.gov", "url": "https://www.congress.gov/bill/119th-congress/house-bill/2698" }]
   }
  ]
 },
 // Sitting AR-04 since Jan 2015; chairs House Natural Resources, which is the office string his one spotlight card uses.
 "bruce_westerman": {
  "name": "Bruce Westerman", "office": "U.S. Representative",
  "state": "Arkansas · AR-04",
  "party": "R", "score": 100, "kept": 1, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2015-01",
  "issues": ["Taxes & Cost of Living", "Forest Management", "Tax Relief", "Second Amendment"],
  "promises": [
   {
    "title": "Overhaul federal forest management to cut wildfire risk",
    "detail": "Authored the Fix Our Forests Act (H.R. 471) to expand active forest management on federal lands and moved it through the House 279–141 on January 23, 2025.",
    "verdict": "kept",
    "issueKey": "lands_balance",
    "sources": [{ "label": "House Natural Resources Committee", "url": "https://naturalresources.house.gov/news/documentsingle.aspx?DocumentID=416884" }, { "label": "Congress.gov", "url": "https://www.congress.gov/bill/119th-congress/house-bill/471" }]
   }
  ]
 },
 // Sitting NC-01 since Jan 3 2023; on the Nov 3 2026 ballot. NC redrew its map in the 2025–26 mid-decade cycle; NC-01 is the seat he holds now.
 "don_davis": {
  "name": "Don Davis", "office": "U.S. Representative",
  "state": "North Carolina · NC-01",
  "party": "D", "score": 100, "kept": 1, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2023-01",
  "issues": ["Climate & Energy", "Agriculture & Rural Communities", "Bipartisanship", "Social Security & Medicare"],
  "promises": [
   {
    "title": "Vote his district's interests case by case rather than a fixed line",
    "detail": "Brands himself an independent-minded, coalition-building legislator. In the June–July 2026 window he voted yes on final passage of the FY2027 National Defense Authorization Act (H.R. 8800), the Stop Insider Trading Act (H.R. 7008), the FY2027 continuing resolution (H.R. 9770) and the Removing Barriers to Work for Disabled Americans Act (H.R. 8884).",
    "verdict": "kept",
    "issueKey": "reform_balance",
    "sources": [{ "label": "dondavis.house.gov", "url": "https://dondavis.house.gov/media/press-releases/congressman-don-davis-votes-again-laken-riley-act" }, { "label": "House Clerk", "url": "https://clerk.house.gov/Votes/2026278" }, { "label": "House Clerk", "url": "https://clerk.house.gov/Votes/2026280" }, { "label": "House Clerk", "url": "https://clerk.house.gov/Votes/2026283" }]
   }
  ]
 },
 // Sitting OK-03 since a May 1994 special election; dean of the Oklahoma delegation.
 "frank_lucas": {
  "name": "Frank Lucas", "office": "U.S. Representative",
  "state": "Oklahoma · OK-03",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "1994-05",
  "issues": ["Agriculture", "Scientific Research", "Water & Conservation", "Financial Markets", "Taxes & Cost of Living"]
 },
 // Sitting OK-02 since Jan 2023, succeeding Markwayne Mullin. No spotlight card names him.
 "josh_brecheen": {
  "name": "Josh Brecheen", "office": "U.S. Representative",
  "state": "Oklahoma · OK-02",
  "party": "R", "score": 100, "kept": 1, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2023-01",
  "issues": ["Federal Spending", "National Debt", "Agriculture", "Energy Policy", "Judicial Impeachment"],
  "promises": [
   {
    "title": "Vote against spending he judges unaffordable, whoever proposes it",
    "detail": "Names the national debt his top concern and presses for structural spending reductions. In the June–July 2026 window he voted no on final passage of the FY2027 National Defense Authorization Act (H.R. 8800, which passed 216–212 on July 22, 2026) and nays on the suspension bills H.R. 915, H.R. 2478 and H.R. 7128.",
    "verdict": "kept",
    "issueKey": "national_debt",
    "sources": [{ "label": "GovTrack", "url": "https://www.govtrack.us/congress/members/josh_brecheen/456931" }, { "label": "Congress.gov", "url": "https://www.congress.gov/bill/119th-congress/house-bill/8800" }, { "label": "House Clerk", "url": "https://clerk.house.gov/Votes/2026278" }]
   },
   {
    "title": "Enact the POWER Act",
    "detail": "Sponsored H.R. 164, which passed the House 419–2 on January 15, 2025 and was sent to the Senate, where it has not been taken up.",
    "verdict": "partial",
    "issueKey": "enviro_energy",
    "sources": [{ "label": "Congress.gov", "url": "https://www.congress.gov/bill/119th-congress/house-bill/164" }, { "label": "GovTrack", "url": "https://www.govtrack.us/congress/votes/119-2025/h13" }]
   }
  ]
 },
 // Sitting ND at-large, sworn in Jan 6 2025. Most card-covered of the 20 (9 nested spotlight cards).
 "julie_fedorchak": {
  "name": "Julie Fedorchak", "office": "U.S. Representative",
  "state": "North Dakota · ND-AL",
  "party": "R", "score": 100, "kept": 2, "broken": 0, "pending": 2, "icon": "🏛",
  "termStart": "2025-01",
  "issues": ["Government Spending", "Energy & Grid Reliability", "Agriculture & Farm Country", "Ban Congressional Stock Trading", "Government Accountability"],
  "promises": [
   {
    "title": "Bar members of Congress from trading individual stocks",
    "detail": "Joined a 2026 push to end member stock trading, then voted for the Stop Insider Trading Act (H.R. 7008) on final passage, which cleared the House 232–198 on July 22, 2026.",
    "verdict": "kept",
    "issueKey": "stock_trading_ban",
    "sources": [{ "label": "Congress.gov", "url": "https://www.congress.gov/bill/119th-congress/house-bill/7008" }, { "label": "House Clerk", "url": "https://clerk.house.gov/Votes/2026280" }]
   },
   {
    "title": "Harden the northern-plains grid against extreme cold and attack",
    "detail": "Centers grid reliability after 12 years regulating North Dakota utilities. Voted for the Weatherizing Infrastructure in the North and Terrorism Emergency Readiness Act (H.R. 3106), which passed the House 400–7 on July 13, 2026.",
    "verdict": "kept",
    "issueKey": "enviro_energy",
    "sources": [{ "label": "House.gov", "url": "https://fedorchak.house.gov/meet-julie" }, { "label": "Congress.gov", "url": "https://www.congress.gov/bill/119th-congress/house-bill/3106" }, { "label": "House Clerk", "url": "https://clerk.house.gov/Votes/2026234" }]
   },
   {
    "title": "Withhold members of Congress's pay during a government shutdown",
    "detail": "Proposed docking congressional pay during shutdowns after the 2025 shutdown. No House floor action on the proposal is on the record.",
    "verdict": "pending",
    "issueKey": "gov_transparency",
    "sources": [{ "label": "House.gov", "url": "https://fedorchak.house.gov/meet-julie" }]
   },
   {
    "title": "Stop regional grid operators from billing North Dakota ratepayers for other states' mandates",
    "detail": "Wrote legislation to bar regional transmission organizations from passing other states' energy-mandate costs on to North Dakota ratepayers. The bill has not reached a floor vote.",
    "verdict": "pending",
    "issueKey": "states_federal_power",
    "sources": [{ "label": "fedorchak.house.gov", "url": "https://fedorchak.house.gov" }]
   }
  ]
 },
 // Sitting IA-01 since Jan 2021 (first won by six votes after a recount).
 "mariannette_miller_meeks": {
  "name": "Mariannette Miller-Meeks", "office": "U.S. Representative",
  "state": "Iowa · IA-01",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2021-01",
  "issues": ["Rural Health Care", "Energy & Biofuels", "Agriculture", "Fiscal Responsibility"]
 },
 // Sitting MS-03 since Jan 3 2019; House Ethics chair.
 "michael_guest": {
  "name": "Michael Guest", "office": "U.S. Representative",
  "state": "Mississippi · MS-03",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2019-01",
  "issues": ["Taxes & Cost of Living", "Border Strategy", "Government Ethics", "Law Enforcement"]
 },
 // Sitting GA-10 since Jan 3 2023. He won the 2026 Georgia GOP Senate runoff and is vacating the House seat at the end of this term, but he has NOT resigned — still the sitting member, so no "Former" and no termEnd.
 "mike_collins": {
  "name": "Mike Collins", "office": "U.S. Representative",
  "state": "Georgia · GA-10",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2023-01",
  "issues": ["Border Security & Immigration", "Fentanyl & Cartels", "Federal Spending", "Letting States Sue Washington"]
 },
 // Sitting MS-04 since Jan 3 2023; former Jackson County sheriff.
 "mike_ezell": {
  "name": "Mike Ezell", "office": "U.S. Representative",
  "state": "Mississippi · MS-04",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2023-01",
  "issues": ["Taxes & Cost of Living", "Law Enforcement", "Maritime Infrastructure", "Disaster Recovery"]
 },
 // Sitting NE-01 since a Jun 28 2022 special election, succeeding Jeff Fortenberry.
 "mike_flood": {
  "name": "Mike Flood", "office": "U.S. Representative",
  "state": "Nebraska · NE-01",
  "party": "R", "score": 100, "kept": 1, "broken": 0, "pending": 2, "icon": "🏛",
  "termStart": "2022-06",
  "issues": ["Housing Supply", "Federal Spending", "Biofuels & Agriculture", "Court Orders & the Rule of Law", "A State Path in Financial Rules"],
  "promises": [
   {
    "title": "Get a housing-supply bill through Congress",
    "detail": "Chairs the Housing and Insurance Subcommittee on a pledge to expand housing supply. Voted to concur in the Senate amendment to the 21st Century ROAD to Housing Act (H.R. 6644), clearing the measure 358–32 on June 23, 2026.",
    "verdict": "kept",
    "issueKey": "housing_build",
    "sources": [{ "label": "Congress.gov", "url": "https://www.congress.gov/member/mike-flood/F000474" }, { "label": "Congress.gov", "url": "https://www.congress.gov/bill/119th-congress/house-bill/6644" }, { "label": "House Clerk", "url": "https://clerk.house.gov/Votes/2026224" }]
   },
   {
    "title": "Pass his own Build Housing Affordably Act",
    "detail": "Introduced H.R. 9311 to expand the housing supply. No floor vote on the bill is on the record.",
    "verdict": "pending",
    "issueKey": "housing_build",
    "sources": [{ "label": "Congress.gov", "url": "https://www.congress.gov/member/mike-flood/F000474" }]
   },
   {
    "title": "Pass the VA TRUST Act and the Stamp Out Veterans Medical Debt Act",
    "detail": "Sponsored H.R. 6740 and H.R. 5946. Neither has received a floor vote.",
    "verdict": "pending",
    "issueKey": "veterans",
    "sources": [{ "label": "GovTrack", "url": "https://www.govtrack.us/congress/members/mike_flood/456868" }]
   },
   {
    "title": "Cut federal spending — \"Washington is still spending too much\"",
    "detail": "Campaigned on cutting federal spending. Voted for the FY2027 budget resolution setting lower spending levels (H.Con.Res. 113, 216–214, July 22, 2026) and also for the FY2027 continuing resolution carrying existing levels forward (H.R. 9770, 220–205, the same day).",
    "verdict": "partial",
    "issueKey": "national_debt",
    "sources": [{ "label": "Campaign", "url": "https://mikefloodfornebraska.com/" }, { "label": "House Clerk", "url": "https://clerk.house.gov/Votes/2026281" }, { "label": "House Clerk", "url": "https://clerk.house.gov/Votes/2026272" }]
   }
  ]
 },
 // Sitting ID-02 since Jan 1999; won the May 19 2026 primary with 63.3%.
 "mike_simpson": {
  "name": "Mike Simpson", "office": "U.S. Representative",
  "state": "Idaho · ID-02",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 3, "icon": "🏛",
  "termStart": "1999-01",
  "issues": ["Government Spending", "Taxes & Cost of Living", "Nuclear Energy & Idaho National Laboratory", "Salmon & Lower Snake River", "Interior & Environment Appropriations"],
  "promises": [
   {
    "title": "Stop pocket rescissions and restore Congress's spending power",
    "detail": "A senior appropriator who says the White House practice of letting appropriated money expire unspent is unconstitutional, because Congress decides how federal funds are spent. No legislative remedy has passed.",
    "verdict": "pending",
    "issueKey": "power_of_purse",
    "sources": [{ "label": "simpson.house.gov", "url": "https://simpson.house.gov" }]
   },
   {
    "title": "Enact the FY2027 Interior and Environment appropriations bill",
    "detail": "As subcommittee chairman, introduced the fiscal-2027 Interior, Environment, and Related Agencies Appropriations Act (H.R. 9171). It has not received a House floor vote on this record.",
    "verdict": "pending",
    "issueKey": "lands_balance",
    "sources": [{ "label": "Congress.gov", "url": "https://www.congress.gov/member/michael-simpson/S001148" }]
   },
   {
    "title": "Reconcile the lower Snake River dams with salmon recovery",
    "detail": "Authored a high-profile framework seeking to resolve the conflict between the lower Snake River dams and salmon recovery. It has not been enacted.",
    "verdict": "pending",
    "issueKey": "enviro_balance",
    "sources": [{ "label": "Ballotpedia", "url": "https://ballotpedia.org/Michael_Simpson_(Idaho)" }]
   }
  ]
 },
 // Sitting AR-01 since Jan 2011; chairs House Intelligence. vr-member-map records him formally as Eric A. "Rick" Crawford; the card and common usage are "Rick Crawford".
 "rick_crawford": {
  "name": "Rick Crawford", "office": "U.S. Representative",
  "state": "Arkansas · AR-01",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2011-01",
  "issues": ["Government Spending", "Tax Relief", "National Security", "Second Amendment", "Agriculture"]
 },
 // Sitting PA-08, sworn in Jan 6 2025. Formally Robert P. Bresnahan, Jr. — the formal form would break the harness surname check, see header.
 "rob_bresnahan": {
  "name": "Rob Bresnahan", "office": "U.S. Representative",
  "state": "Pennsylvania · PA-08",
  "party": "R", "score": 100, "kept": 1, "broken": 0, "pending": 1, "icon": "🏛",
  "termStart": "2025-01",
  "issues": ["Domestic Energy Production", "Tough on Crime", "Government Spending", "Jobs & Economy", "Infrastructure"],
  "promises": [
   {
    "title": "Ban members of Congress from trading individual stocks",
    "detail": "Introduced a member stock-trading ban, delivering on a 2024 campaign pledge, and voted for the Stop Insider Trading Act (H.R. 7008) on final passage, 232–198 on July 22, 2026.",
    "verdict": "kept",
    "issueKey": "stock_trading_ban",
    "sources": [{ "label": "bresnahan.house.gov", "url": "https://bresnahan.house.gov/media/press-releases/bresnahan-introduces-legislation-ban-stock-trades-announces-plan-form-blind" }, { "label": "Congress.gov", "url": "https://www.congress.gov/bill/119th-congress/house-bill/7008" }, { "label": "House Clerk", "url": "https://clerk.house.gov/Votes/2026280" }]
   },
   {
    "title": "Move his own holdings into a blind trust",
    "detail": "Announced a plan to place his holdings in a blind trust alongside the bill. No completed transfer appears on the record.",
    "verdict": "pending",
    "issueKey": "stock_trading_ban",
    "sources": [{ "label": "bresnahan.house.gov", "url": "https://bresnahan.house.gov/media/press-releases/bresnahan-introduces-legislation-ban-stock-trades-announces-plan-form-blind" }]
   }
  ]
 },
 // Sitting PA-07, sworn in Jan 6 2025. No spotlight card names him.
 "ryan_mackenzie": {
  "name": "Ryan Mackenzie", "office": "U.S. Representative",
  "state": "Pennsylvania · PA-07",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2025-01",
  "issues": ["Domestic Energy Production", "Tough on Crime", "America First Foreign Policy", "Jobs & Affordability", "Workforce & Education"]
 },
 // Sitting PA-10 since Jan 2013; won the May 19 2026 primary. No spotlight card names him.
 "scott_perry": {
  "name": "Scott Perry", "office": "U.S. Representative",
  "state": "Pennsylvania · PA-10",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2013-01",
  "issues": ["Taxes & Cost of Living", "Spending & the Debt", "National Defense"]
 },
 // Sitting OK-05 since Jan 2021. vr-member-map records her formally as Stephanie I. Bice.
 "stephanie_bice": {
  "name": "Stephanie Bice", "office": "U.S. Representative",
  "state": "Oklahoma · OK-05",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2021-01",
  "issues": ["Taxes & Cost of Living", "Veterans & Military Construction", "Infrastructure & Transportation", "Government Modernization", "National Defense"]
 },
 // Sitting AR-03 since Jan 2011. No spotlight card names him.
 "steve_womack": {
  "name": "Steve Womack", "office": "U.S. Representative",
  "state": "Arkansas · AR-03",
  "party": "R", "score": 100, "kept": 2, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2011-01",
  "issues": ["Mental Health & Addiction", "Taxes & Cost of Living", "Federal Budget", "Tax Relief", "Second Amendment"],
  "promises": [
   {
    "title": "Defend Congress's power of the purse against the executive branch",
    "detail": "As House Budget Committee chairman he and the committee's ranking member jointly sought a GAO opinion, which confirmed that Congress controls federal spending. He said \"Article I grants the power of the purse to Congress.\"",
    "verdict": "kept",
    "issueKey": "power_of_purse",
    "sources": [{ "label": "House Budget Committee", "url": "https://democrats-budget.house.gov/news/press-releases/yarmuth-womack-respond-gao-s-legal-opinion-confirming-congress-s-power-purse" }]
   },
   {
    "title": "No tax increases — signed the Taxpayer Protection Pledge",
    "detail": "Signed the Taxpayer Protection Pledge, favoring spending cuts over tax increases. Voted for H.R. 1 in 2025, which extended the 2017 individual income-tax rates rather than letting them rise; it passed the House 218–214 on July 3, 2025.",
    "verdict": "kept",
    "issueKey": "lower_taxes",
    "sources": [{ "label": "Wikipedia", "url": "https://en.wikipedia.org/wiki/Steve_Womack" }, { "label": "House Clerk", "url": "https://clerk.house.gov/Votes/2025190" }]
   },
   {
    "title": "Balance the federal budget",
    "detail": "Has proposed a balanced-budget amendment and opposed debt-limit increases. Voted for the FY2027 budget resolution (H.Con.Res. 113, 216–214, July 22, 2026) and also for the FY2027 continuing resolution carrying existing spending levels forward (H.R. 9770, 220–205, the same day). No balanced-budget amendment has passed the House.",
    "verdict": "partial",
    "issueKey": "national_debt",
    "sources": [{ "label": "OnTheIssues", "url": "https://ontheissues.org/House/Steve_Womack.htm" }, { "label": "House Clerk", "url": "https://clerk.house.gov/Votes/2026281" }, { "label": "House Clerk", "url": "https://clerk.house.gov/Votes/2026272" }]
   }
  ]
 },
 // Sitting MS-01 since a Jun 2 2015 special election.
 "trent_kelly": {
  "name": "Trent Kelly", "office": "U.S. Representative",
  "state": "Mississippi · MS-01",
  "party": "R", "score": 100, "kept": 1, "broken": 0, "pending": 1, "icon": "🏛",
  "termStart": "2015-06",
  "issues": ["National Defense", "Veterans & National Guard", "Agriculture", "Second Amendment", "Taxes & Cost of Living"],
  "promises": [
   {
    "title": "Fund shipbuilding and force projection",
    "detail": "Chairs the Armed Services Seapower and Projection Forces Subcommittee. Voted for the FY2027 National Defense Authorization Act (H.R. 8800) on final passage, 216–212 on July 22, 2026.",
    "verdict": "kept",
    "issueKey": "strong_defense",
    "sources": [{ "label": "Ballotpedia", "url": "https://ballotpedia.org/Trent_Kelly" }, { "label": "Congress.gov", "url": "https://www.congress.gov/bill/119th-congress/house-bill/8800" }, { "label": "House Clerk", "url": "https://clerk.house.gov/Votes/2026278" }]
   },
   {
    "title": "Pass emergency payments for struggling crop producers",
    "detail": "Introduced the bipartisan Farmer Assistance and Revenue Mitigation Act of 2024. It did not receive a floor vote and has not been enacted.",
    "verdict": "pending",
    "issueKey": "rural_ag",
    "sources": [{ "label": "House.gov", "url": "https://trentkelly.house.gov/newsroom/documentsingle.aspx?DocumentID=7467" }]
   }
  ]
 },
 // Sitting MT-02, sworn in Jan 6 2025, succeeding Matt Rosendale.
 "troy_downing": {
  "name": "Troy Downing", "office": "U.S. Representative",
  "state": "Montana · MT-02",
  "party": "R", "score": 100, "kept": 2, "broken": 0, "pending": 1, "icon": "🏛",
  "termStart": "2025-01",
  "issues": ["Taxes & Cost of Living", "Tax Relief", "Public Lands Access", "Coal & Energy", "Water Infrastructure"],
  "promises": [
   {
    "title": "Keep federal public land in public hands",
    "detail": "Opposed a provision to sell roughly 500,000 acres of BLM land during work on the 2025 budget bill; the sale was dropped from the law that passed.",
    "verdict": "kept",
    "issueKey": "lands_keep_public",
    "sources": [{ "label": "Montana Free Press", "url": "https://montanafreepress.org/2025/05/20/zinke-downing-line-up-behind-trump-budget-bill/" }]
   },
   {
    "title": "Keep the Bull Mountains coal mine operating",
    "detail": "Sponsored H.R. 931 to keep the Bull Mountains mine running; the provision was folded into the 2025 budget law.",
    "verdict": "kept",
    "issueKey": "enviro_energy",
    "sources": [{ "label": "Congress.gov", "url": "https://www.congress.gov/bill/119th-congress/house-bill/931" }]
   },
   {
    "title": "Eliminate the Federal Insurance Office and return insurance regulation to the states",
    "detail": "The former Montana State Auditor made abolishing the Federal Insurance Office his first bill in Congress. It has not received a floor vote.",
    "verdict": "pending",
    "issueKey": "states_federal_power",
    "sources": [{ "label": "downing.house.gov", "url": "https://downing.house.gov" }]
   },
   {
    "title": "Extend the Fort Peck Reservation and Dry-Redwater rural water systems",
    "detail": "Sponsored bills extending both rural water systems. Both passed the House and await Senate action.",
    "verdict": "partial",
    "issueKey": "water",
    "sources": [{ "label": "GovTrack", "url": "https://www.govtrack.us/congress/members/troy_downing/457000" }]
   }
  ]
 }
});
