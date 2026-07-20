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
 "kennedy_rfk": {
  "name": "Robert F. Kennedy Jr.",
  "office": "U.S. Secretary of Health & Human Services",
  "state": "California",
  "party": "R",
  "score": 54,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "⚕️",
  "issues": [
   "Chronic Disease",
   "Food & Nutrition",
   "Drug Prices",
   "Vaccine Policy"
  ]
 },
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
  "state": "UT District 15 (Provo)",
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
  "state": "Utah · Davis County",
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
  "office": "Utah State Senator",
  "state": "Utah · Utah County",
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
  "state": "Utah · Weber County",
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
  "office": "UT State Senator",
  "state": "UT District 19",
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
  "state": "UT District 9 (Draper/Sandy)",
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
  "state": "UT District 26 (West SLC)",
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
  "office": "UT State Senator",
  "state": "UT District 16 (Provo)",
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
  "state": "UT District 75 (St. George)",
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
  "office": "UT State Representative",
  "state": "UT District 73 (Cedar City)",
  "party": "R",
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
  "state": "UT District 11 (Riverton / Herriman)",
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
 "cullimore_s19": {
  "name": "Kirk Cullimore",
  "office": "Utah State Senator",
  "state": "UT District 19 (Sandy / Cottonwood Heights)",
  "party": "R",
  "termStart": "2019-01",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 0,
  "icon": "🏛",
  "issues": [
   "Sandy",
   "Judiciary",
   "Consumer Protection",
   "Business"
  ]
 },
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
  "state": "UT District 24 (Salt Lake City)",
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
  "state": "UT District 45 (Sandy)",
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
  "office": "Utah State Representative",
  "state": "UT District 6 (Box Elder / Weber County)",
  "party": "R",
  "termStart": "2021-01",
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
  "party": "I→R",
  "termStart": "2025-02",
  "score": null,
  "kept": 0,
  "broken": 0,
  "pending": 12,
  "icon": "🦅",
  "issues": [
   "Vaccine Safety",
   "Food & Nutrition Reform",
   "Chronic Disease",
   "Make America Healthy Again"
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
 }
});
