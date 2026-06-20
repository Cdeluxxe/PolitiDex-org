#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — June 2026 sitting-legislator issue-position expansion · wave 6
//
// Deepens Issue Positions for 24 CURRENT sitting Utah State Representatives and
// Senators who were sitting at the 6–7 card floor, lifting each toward 9–12
// structured, alignment-comparable positions. Every position is hand-verified
// from the member's OWN record — sponsored/floor-sponsored bills on le.utah.gov,
// Ballotpedia, official legislative pages, or reputable Utah news (Deseret News,
// Salt Lake Tribune, KSL, Utah News Dispatch, Park Record, etc.). Bill-backed
// positions carry the bill as `evidence`; campaign/stated positions carry no
// evidence so the Snapshot tags them "💬 Stated". Each card is keyed to an exact
// ISSUE_MAP key (issueKey + issueStance) so it powers the Personalized Alignment
// Tool, and every new card uses an issueKey the member did NOT already have, so
// nothing overwrites existing coverage.
//
//   node scripts/expand-issue-positions-jun2026-wave6.mjs --emit    # write /tmp block
//   node scripts/expand-issue-positions-jun2026-wave6.mjs --insert  # splice into index.html
//   node scripts/expand-issue-positions-jun2026-wave6.mjs --apply   # mirror to Firestore
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync } from 'fs';

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const INDEX = new URL('../index.html', import.meta.url).pathname;
const EMIT = process.argv.includes('--emit');
const INSERT = process.argv.includes('--insert');
const APPLY = process.argv.includes('--apply');
const STAMP = '2026-06-20T00:00:00.000Z';

const le = n => ({ label: 'le.utah.gov', url: `https://le.utah.gov/~${n}` });

// id == Firestore doc id == ISSUE_STANCE_DATA key for every target in this wave.
const DATA = {
  // ── Senators ──────────────────────────────────────────────────────────────
  emily_buss: [ // Emily Buss — Utah State Senator, District 11 (United Utah / Forward)
    { topic:'School Mental Health Support', icon:'🧠', pos:'support', issueKey:'health_mental', issueStance:'support',
      text:'Sponsored a bill updating licensing and requirements for school social workers who provide counseling and mental-health support to students.',
      evidence:'Chief-sponsored SB 297 (2026).', source:{label:'Utah News Dispatch', url:'https://utahnewsdispatch.com/2026/01/20/meet-new-utah-lawmakers-2026-legislature/'} },
    { topic:'Roads & Transportation Funding', icon:'🚗', pos:'support', issueKey:'transit', issueStance:'support',
      text:'Made transportation a top priority and sponsored a road-funding bill adjusting the fuel-tax calculation to address strained infrastructure funding.',
      evidence:'Chief-sponsored SB 247 (2026).', source:{label:'Utah News Dispatch', url:'https://utahnewsdispatch.com/2026/01/20/meet-new-utah-lawmakers-2026-legislature/'} },
    { topic:'First-Time Homebuyers', icon:'🔑', pos:'support', issueKey:'housing_first_time', issueStance:'support',
      text:'Says she will advocate for policies protecting families and first-time buyers, including limiting large investors from buying up single-family homes.',
      source:{label:'Eagle Mountain City', url:'https://eaglemountain.gov/following-forward-party-vote-state-sen-buss-outlines-priorities/'} },
    { topic:'Local Control of Growth', icon:'🏘', pos:'support', issueKey:'lands_local', issueStance:'support',
      text:'Criticizes unfunded state housing mandates on cities and wants local control restored so cities can require timely infrastructure and set impact fees reflecting real costs.',
      source:{label:'Eagle Mountain City', url:'https://eaglemountain.gov/following-forward-party-vote-state-sen-buss-outlines-priorities/'} },
    { topic:'Water Conservation', icon:'💧', pos:'support', issueKey:'water', issueStance:'support',
      text:'Names water conservation part of her environmental and growth-management agenda for the fast-growing northern Utah County district.',
      source:{label:'Eagle Mountain City', url:'https://eaglemountain.gov/following-forward-party-vote-state-sen-buss-outlines-priorities/'} },
    { topic:'Open, Nonpartisan Elections', icon:'🗳', pos:'support', issueKey:'voting_access', issueStance:'support',
      text:'Won her seat through an open approval-voting election that let all registered voters participate regardless of party, a bridge-building reform she champions.',
      source:{label:'Salt Lake Tribune', url:'https://www.sltrib.com/news/politics/2025/12/12/utah-legislature-emily-buss-wins/'} },
  ],
  john_johnson: [ // John Johnson — Utah State Senator, District 3 (Cache)
    { topic:'Insurance Preauthorization Reform', icon:'🏥', pos:'support', issueKey:'health_balance', issueStance:'support',
      text:'Sponsored a bill tightening health-insurance preauthorization rules, restricting insurers\' use of AI in coverage denials and limiting certain retroactive denials.',
      evidence:'Chief-sponsored SB 319 (2026).', source:le('2026/bills/static/SB0319.html') },
    { topic:'Equal Treatment on Campus', icon:'⚖️', pos:'oppose', issueKey:'rights_balance', issueStance:'support',
      text:'As Senate Education chair, led the effort to end DEI offices and diversity statements at Utah universities in favor of institutional neutrality and equal treatment.',
      evidence:'Key driver of HB 261 (2024).', source:{label:'Deseret News', url:'https://www.deseret.com/2024/1/11/24031588/utah-republicans-bill-alternative-to-dei-initiatives-college-campuses/'} },
    { topic:'Civics & Founding-Principles Curriculum', icon:'🏛', pos:'support', issueKey:'edu_parental', issueStance:'support',
      text:'Sponsored a law creating a Center for Civic Excellence at Utah State University to rebuild general education around America\'s founding principles.',
      evidence:'Chief-sponsored SB 334 (2025).', source:{label:'NAS', url:'https://nas.org/blogs/press_release/utah-adopts-legislation-inspired-by-the-general-education-act'} },
    { topic:'Voter Roll Records', icon:'📋', pos:'support', issueKey:'election_integrity', issueStance:'support',
      text:'Sponsored a bill tightening when voters can withhold registration information, arguing Utah\'s prior privacy law conflicted with the federal National Voter Registration Act.',
      evidence:'Chief-sponsored SB 153 (2025).', source:{label:'KSL', url:'https://www.ksl.com/article/51483396/elections-officials-explain-why-utah-voter-information-is-becoming-public'} },
    { topic:'Higher-Education Board Accountability', icon:'🎓', pos:'support', issueKey:'reform_balance', issueStance:'support',
      text:'Floor-sponsored a bill requiring members of a degree-granting institution\'s board of trustees to be Utah residents, strengthening in-state accountability.',
      evidence:'Senate sponsor of HB 210 (2025).', source:{label:'USHE', url:'https://ushe.edu/2025-legislative-update-week-6/'} },
  ],
  heidi_balderree: [ // Heidi Balderree — Utah State Senator, District 22 (Lehi)
    { topic:'Crime Victim & Witness Privacy', icon:'🔒', pos:'support', issueKey:'privacy_rights', issueStance:'support',
      text:'Sponsored a bill giving crime victims and witnesses a right to privacy over their nonpublic electronic data and limiting how defendants can access it.',
      evidence:'Chief-sponsored SB 290 (2026).', source:le('2026/bills/static/SB0290.html') },
    { topic:'Veterans in the Workforce', icon:'🎖', pos:'support', issueKey:'econ_growth', issueStance:'support',
      text:'Sponsored a "military crosswalk" law letting veterans\' and service members\' military training substitute for redundant licensure to speed their entry into civilian jobs.',
      evidence:'Chief-sponsored SB 90 (2026).', source:{label:'Utah News Dispatch', url:'https://utahnewsdispatch.com/2025/10/21/utah-veterans-reintegrate-into-workforce-occupational-crosswalk/'} },
    { topic:'Citizen Referenda on Local Bonds', icon:'🗳', pos:'support', issueKey:'lands_local', issueStance:'support',
      text:'Passed a bill making a local government\'s use of excise-tax-backed revenue bonds subject to a citizen referendum, expanding voter checks on local spending.',
      evidence:'Chief-sponsored SB 100 (2024).', source:{label:'Lehi Free Press', url:'https://lehifreepress.com/2024/01/30/senator-balderree-off-to-a-productive-start/'} },
    { topic:'Military Family Tax Relief', icon:'🪖', pos:'support', issueKey:'tax_middle_class', issueStance:'support',
      text:'Sponsored a military tax credit providing targeted relief to service members and military families.',
      evidence:'Chief-sponsored SB 103 (2024).', source:{label:'Lehi Free Press', url:'https://lehifreepress.com/2024/01/30/senator-balderree-off-to-a-productive-start/'} },
    { topic:'Cutting Red Tape for Young Entrepreneurs', icon:'✂️', pos:'support', issueKey:'gov_regulation', issueStance:'support',
      text:'Sponsored a bill exempting occasionally operated businesses run by high-school-age youth from local license and permit requirements, to encourage young entrepreneurs.',
      evidence:'Chief-sponsored SB 47 (2024).', source:{label:'Lehi Free Press', url:'https://lehifreepress.com/2024/01/30/senator-balderree-off-to-a-productive-start/'} },
  ],
  cwilson: [ // Chris Wilson — Utah State Senator, District 25 (Logan/Cache)
    { topic:'Behavioral Health Crisis Care', icon:'🧠', pos:'support', issueKey:'healthcare', issueStance:'support',
      text:'Funded behavioral-health receiving centers — mental-health "Insta-Cares" — including one for Cache County, expanding crisis-care access.',
      evidence:'Sponsored HB 66 receiving-center funding.', source:{label:'HJ News', url:'https://www.hjnews.com/news/government/candidate-profile-chris-wilson-says-he-isn-t-done-yet/article_ff0d2e32-81d9-11ef-a66d-d70195b466a7.html'} },
    { topic:'Higher-Education Accountability', icon:'🎓', pos:'support', issueKey:'gov_transparency', issueStance:'support',
      text:'After an audit found financial irregularities at USU, introduced a bill strengthening trustees\' budget oversight and making them the institution\'s internal audit committee.',
      evidence:'Chief-sponsored SB 240 (2025).', source:{label:'Cache Valley Daily', url:'https://www.cachevalleydaily.com/news/state-sen-chris-wilson-proposes-across-the-board-reforms-of-utahs-higher-education/article_ffab90b5-7e09-4140-8823-68e1e8af429c.html'} },
    { topic:'Income Tax Rate Cut', icon:'💵', pos:'support', issueKey:'econ_growth', issueStance:'support',
      text:'Sponsored the flagship bill cutting Utah\'s income tax rate from 4.65% to 4.55%, framing it as keeping the state economically competitive.',
      evidence:'Chief-sponsored SB 69 (2024).', source:{label:'Utah News Dispatch', url:'https://utahnewsdispatch.com/2024/03/15/utah-governor-signs-income-tax-cut/'} },
    { topic:'Small Business & Economy', icon:'🏪', pos:'support', issueKey:'econ_smallbiz', issueStance:'support',
      text:'A third-generation small-business owner who says he backs policies helping businesses because a strong economy funds education and transportation.',
      source:{label:'HJ News', url:'https://www.hjnews.com/news/government/candidate-profile-chris-wilson-says-he-isn-t-done-yet/article_ff0d2e32-81d9-11ef-a66d-d70195b466a7.html'} },
    { topic:'Social Security Tax Relief', icon:'👵', pos:'support', issueKey:'social_security', issueStance:'support',
      text:'Has pursued cutting Utah\'s tax on Social Security income to ease the burden on retirees.',
      source:{label:'HJ News', url:'https://www.hjnews.com/news/government/candidate-profile-chris-wilson-says-he-isn-t-done-yet/article_ff0d2e32-81d9-11ef-a66d-d70195b466a7.html'} },
  ],
  rwinterton: [ // Ronald Winterton — Utah State Senator, District 26 (Uintah Basin)
    { topic:'State Sovereignty & Federalism', icon:'🏛', pos:'support', issueKey:'reform_balance', issueStance:'support',
      text:'A co-chair of Utah\'s Federalism Commission who sponsored a law expanding the commission\'s membership and functions to push back on federal overreach.',
      evidence:'Chief-sponsored HB 379 (2024).', source:le('2024/bills/static/HB0379.html') },
    { topic:'Water-Efficient Landscaping', icon:'💧', pos:'support', issueKey:'water', issueStance:'support',
      text:'Carried legislation limiting nonfunctional turf and overhead spray irrigation at new government facilities to conserve water in the Great Salt Lake Basin.',
      evidence:'Senate sponsor of HB 11 Water Efficient Landscaping.', source:{label:'Friends of Great Salt Lake', url:'https://fogsl.org/advocacy-issues/legislative-session'} },
    { topic:'Colorado River Water', icon:'🌊', pos:'support', issueKey:'water_storage', issueStance:'support',
      text:'Sponsored amendments to the Colorado River Authority of Utah to strengthen the state\'s management and defense of its Colorado River allocations.',
      evidence:'Chief-sponsored SB 160 (2022).', source:{label:'Better Utah', url:'https://progressreport.betterutah.org/legislators/sen-ronald-winterton/'} },
    { topic:'Rural Veterinarian Shortage', icon:'🐄', pos:'support', issueKey:'rural_ag', issueStance:'support',
      text:'Sponsored a veterinarian education loan-repayment program to address the shortage of large-animal and rural veterinarians serving Utah agriculture.',
      evidence:'Senate sponsor of HB 522 (2024).', source:{label:'Better Utah', url:'https://progressreport.betterutah.org/legislators/sen-ronald-winterton/'} },
    { topic:'Military Families & Tuition', icon:'🎖', pos:'support', issueKey:'veterans', issueStance:'support',
      text:'Sponsored a bill making children of military members eligible for in-state tuition after at least one year in a Utah high school.',
      evidence:'Chief-sponsored SB 115 (2024).', source:{label:'Better Utah', url:'https://progressreport.betterutah.org/legislators/sen-ronald-winterton/'} },
  ],
  dhinkins: [ // David Hinkins — Utah State Senator, District 27 (rural southeast)
    { topic:'Advanced Nuclear Manufacturing', icon:'⚛️', pos:'support', issueKey:'tech_innovation', issueStance:'support',
      text:'Floor-sponsored a resolution declaring Utah\'s support for the advanced nuclear manufacturing industry and its desire to host nuclear manufacturing in the state.',
      evidence:'Senate sponsor of HCR 1 (2026).', source:le('2026/bills/static/HCR001.html') },
    { topic:'Rural Water Supply', icon:'💧', pos:'support', issueKey:'water', issueStance:'support',
      text:'As natural-resources appropriations chair, has moved water-rights and agricultural water-optimization measures and previously created the Drinking Water Capacity Account.',
      source:{label:'Utah Senate', url:'https://senate.utah.gov/sen/HINKIDP/'} },
    { topic:'Protecting Coal Mining', icon:'⛏', pos:'support', issueKey:'gov_regulation', issueStance:'support',
      text:'Backed restoring a longstanding Utah law that shields coal mining from certain environmental lawsuits, to protect rural mining jobs from litigation.',
      evidence:'Backed HB 419 (2026).', source:{label:'Deseret News', url:'https://www.deseret.com/environment/2026/02/27/environmental-bills-2026-utah-legislative-session/'} },
    { topic:'State Budget Stewardship', icon:'💰', pos:'support', issueKey:'gov_balance', issueStance:'support',
      text:'As an appropriations leader, floor-sponsored major supplemental appropriations funding state-government operations across the budget cycle.',
      evidence:'Senate sponsor of HB 5 (2026).', source:le('2026/bills/static/HB0005.html') },
    { topic:'Downwinders & RECA', icon:'☢️', pos:'support', issueKey:'health_rural', issueStance:'support',
      text:'Joined a bipartisan group of Utah lawmakers urging Congress to revive the Radiation Exposure Compensation Act for rural downwinders harmed by nuclear testing.',
      source:{label:'Utah News Dispatch', url:'https://utahnewsdispatch.com/2025/04/03/utah-lawmakers-call-for-reca-expansion-for-downwinders/'} },
  ],
  // ── Representatives ─────────────────────────────────────────────────────────
  jake_sawyer: [ // Jake Sawyer — Utah State Representative, District 9 (Weber)
    { topic:'Consumer Price Transparency', icon:'🏷', pos:'support', issueKey:'gov_regulation', issueStance:'support',
      text:'Sponsored a law requiring the shelf price to match the register price, with civil penalties for weights-and-measures violations; it passed the House 65-1.',
      evidence:'Chief-sponsored HB 493 (2026).', source:{label:'Utah House', url:'https://house.utleg.gov/utahs-2026-legislative-session-lower-costs-stronger-families-and-long-term-investments/'} },
    { topic:'State Park Roads & Access', icon:'🏞', pos:'support', issueKey:'lands_balance', issueStance:'support',
      text:'Sponsored a law amending the management and treatment of roads within Utah state parks, signed into law.',
      evidence:'Chief-sponsored HB 345 (2025).', source:le('2025/bills/static/HB0345.html') },
    { topic:'Housing Affordability', icon:'🏠', pos:'support', issueKey:'housing_support', issueStance:'support',
      text:'A mortgage and real-estate professional who has publicly prioritized housing affordability for working families amid inflation.',
      source:{label:'Salt Lake Tribune', url:'https://www.sltrib.com/opinion/commentary/2024/09/26/jake-sawyer-utah-legislator-id/'} },
    { topic:'Education Funding & Local Control', icon:'🎓', pos:'support', issueKey:'edu_balance', issueStance:'support',
      text:'Names education funding and local control among his top legislative priorities.',
      source:{label:'Salt Lake Tribune', url:'https://www.sltrib.com/opinion/commentary/2024/09/26/jake-sawyer-utah-legislator-id/'} },
    { topic:'Working Families', icon:'👨‍👩‍👧', pos:'support', issueKey:'family_support', issueStance:'support',
      text:'Campaigned on supporting working families facing rising costs as a central reason for seeking office.',
      source:{label:'Salt Lake Tribune', url:'https://www.sltrib.com/opinion/commentary/2024/09/26/jake-sawyer-utah-legislator-id/'} },
  ],
  jon_hawkins: [ // Jon Hawkins — Utah State Representative, District 55 (Utah County)
    { topic:'2034 Winter Olympics', icon:'🏅', pos:'support', issueKey:'infrastructure', issueStance:'support',
      text:'Sponsored legislation updating the Olympic and Paralympic Winter Games Act to reflect Utah\'s award of the 2034 Games and the shift to an organizing committee.',
      evidence:'Chief-sponsored HB 321 (2025).', source:le('2025/bills/static/HB0321.html') },
    { topic:'Olympic Venue Liability', icon:'🎿', pos:'support', issueKey:'gov_balance', issueStance:'support',
      text:'Sponsored a bill extending the liability caps already in place at ski resorts to the three state-funded Olympic facilities, citing inherent winter-sport risk.',
      evidence:'Chief-sponsored HB 541 (2025).', source:{label:'Deseret News', url:'https://www.deseret.com/utah/2025/02/28/utah-legislation-limiting-liability-at-olympic-ski-jumps-bobsled-track-speedskating-oval-advances/'} },
    { topic:'Economic Development', icon:'💼', pos:'support', issueKey:'econ_smallbiz', issueStance:'support',
      text:'As House Economic Development chair, sponsored a bill restructuring the Governor\'s Office of Economic Opportunity.',
      evidence:'Chief-sponsored HB 542 (2025).', source:le('2025/bills/static/HB0542.html') },
    { topic:'Online Child Safety', icon:'📱', pos:'support', issueKey:'privacy_rights', issueStance:'support',
      text:'Co-chairs Utah\'s Digital Wellness, Citizenship, and Safe Technology Commission, focused on helping youth and parents use technology safely.',
      source:{label:'Ballotpedia', url:'https://ballotpedia.org/Jon_Hawkins'} },
    { topic:'State Office of Housing', icon:'🏘', pos:'support', issueKey:'housing_support', issueStance:'support',
      text:'His economic-development bill created an Office of Housing consolidating state housing programs and removed the sunset on the Utah Housing Corporation.',
      evidence:'HB 542, 7th sub (2025).', source:le('2025/bills/static/HB0542.html') },
  ],
  kay_christofferson: [ // Kay Christofferson — Utah State Representative, District 53 (Lehi)
    { topic:'Clean-Vehicle Program Repeal', icon:'🔌', pos:'oppose', issueKey:'gov_regulation', issueStance:'support',
      text:'Sponsored a transportation bill that repealed the state clean-vehicle program and ended the program letting electric vehicles use HOV lanes.',
      evidence:'Chief-sponsored HB 481 (2026).', source:{label:'Utah House', url:'https://house.utleg.gov/utahs-2026-transportation-laws-what-changed-and-why/'} },
    { topic:'EV Road-Funding Fairness', icon:'🚗', pos:'support', issueKey:'lands_energy', issueStance:'support',
      text:'Sponsored a bill raising registration fees on electric and hybrid vehicles so their owners "pay their fair share" for roads, since they largely avoid the gas tax.',
      evidence:'Chief-sponsored HB 209 (2021).', source:{label:'St. George News', url:'https://www.stgeorgeutah.com/news/local/utah-house-puts-brakes-on-bill-raising-registration-fees-for-electric-hybrid-vehicles/article_190ce2f8-b4ce-5d9b-9bbd-2dd6e948959e.html'} },
    { topic:'Corridor Preservation & Property', icon:'🛣', pos:'support', issueKey:'property_rights', issueStance:'support',
      text:'Sponsored legislation routing corridor-preservation funds to local governments and clarifying land-use rules near FrontRunner stations.',
      evidence:'Chief-sponsored HB 229 (2025).', source:{label:'le.utah.gov', url:'https://le.utah.gov/Session/2025/bills/enrolled/HB0229.pdf'} },
    { topic:'Transit Governance Reform', icon:'🏛', pos:'support', issueKey:'gov_balance', issueStance:'support',
      text:'Supported updating Utah Transit Authority governance, replacing the prior board with a seven-member commission to improve accountability.',
      evidence:'House sponsor of SB 242 (2026).', source:{label:'Utah House', url:'https://house.utleg.gov/utahs-2026-transportation-laws-what-changed-and-why/'} },
    { topic:'Road Usage Charge', icon:'🛻', pos:'mixed', issueKey:'lower_taxes', issueStance:'mixed',
      text:'Has championed a per-mile road usage charge as an alternative to the declining gas tax, arguing an alternative is needed to keep funding transportation.',
      source:{label:'Deseret News', url:'https://www.deseret.com/utah/2021/6/5/22443979/legislature-utahs-road-usage-charge-gives-a-roadmap-for-future-tax-on-green-drivers/'} },
  ],
  r_neil_walter: [ // R. Neil Walter — Utah State Representative, District 74 (Washington County)
    { topic:'HOA Homeowner Protections', icon:'🏡', pos:'support', issueKey:'housing_support', issueStance:'support',
      text:'Sponsored a law creating an Office of the Homeowners\' Association Ombudsman to resolve HOA disputes and educate residents on their rights.',
      evidence:'Chief-sponsored HB 217 (2025).', source:{label:'le.utah.gov', url:'https://le.utah.gov/Session/2025/bills/introduced/HB0217.pdf'} },
    { topic:'Food Labeling Transparency', icon:'🥩', pos:'support', issueKey:'rural_ag', issueStance:'support',
      text:'Sponsored a law requiring food to be labeled when it contains cultivated, plant-based, or insect-based meat substitutes, framing it as consumer transparency.',
      evidence:'Chief-sponsored HB 138 (2025).', source:{label:'KSL NewsRadio', url:'https://kslnewsradio.com/utah/meat-labels-bill/2184542/'} },
    { topic:'Short-Term Rentals & Local Control', icon:'🏘', pos:'support', issueKey:'lands_local', issueStance:'support',
      text:'Sponsored a law updating Utah\'s short-term rental rules to give cities and counties more control over how rentals like Airbnb and Vrbo operate.',
      evidence:'Chief-sponsored HB 256 (2025).', source:{label:'St. George News', url:'https://www.stgeorgeutah.com/news/utahs-2025-legislative-session-what-passed-what-failed-and-a-look-inside-the-states-30/article_449a6c04-fe2f-11ef-87b4-739306332dae.html'} },
    { topic:'HOA Disclosure Rules', icon:'📋', pos:'support', issueKey:'gov_regulation', issueStance:'support',
      text:'Sponsored a follow-up requiring the HOA Ombudsman to publish advisory opinions and restricting certain provisions in HOA declarations.',
      evidence:'Chief-sponsored HB 406 (2026).', source:{label:'le.utah.gov', url:'https://le.utah.gov/Session/2026/bills/introduced/HB0406S01.pdf'} },
    { topic:'Property Manager Licensing', icon:'🔑', pos:'support', issueKey:'econ_smallbiz', issueStance:'support',
      text:'Sponsored a bill amending property-manager licensing provisions for the real-estate industry.',
      evidence:'Chief-sponsored HB 1002 (2025 S1).', source:{label:'le.utah.gov', url:'https://le.utah.gov/Session/2025S1/bills/introduced/HB1002.pdf'} },
  ],
  doug_welton: [ // Doug Welton — Utah State Representative, District 65 (Payson)
    { topic:'Civics Education', icon:'🏛', pos:'support', issueKey:'public_schools', issueStance:'support',
      text:'Sponsored a law adding a course on American constitutional government and citizenship to high-school graduation requirements, citing a civics gap.',
      evidence:'Chief-sponsored HB 381 (2025).', source:{label:'Deseret News', url:'https://www.deseret.com/utah/2025/04/14/utah-governor-cox-signs-bevy-of-education-bills/'} },
    { topic:'Phone-Free Classrooms', icon:'📵', pos:'support', issueKey:'edu_parental', issueStance:'support',
      text:'House floor sponsor of the "bell-to-bell" law setting a default statewide policy that students keep phones away from first to last bell, with local implementation.',
      evidence:'House sponsor of SB 69 (2026).', source:{label:'Utah News Dispatch', url:'https://utahnewsdispatch.com/2026/02/27/utah-legislature-approves-bell-to-bell-school-cellphone-ban/'} },
    { topic:'Glass Recycling', icon:'♻️', pos:'support', issueKey:'enviro_energy', issueStance:'support',
      text:'Sponsored a glass-recycling law, signed in March 2025.',
      evidence:'Chief-sponsored HB 177 (2025).', source:le('2025/bills/static/HB0177.html') },
    { topic:'Education Innovation', icon:'🎓', pos:'support', issueKey:'school_choice', issueStance:'support',
      text:'A high-school teacher who has sponsored an Education Innovation Program bill aimed at flexibility in K-12 education.',
      evidence:'Sponsored HB 386 Education Innovation Program.', source:{label:'Ballotpedia', url:'https://ballotpedia.org/Doug_Welton'} },
  ],
  jason_b_kyle: [ // Jason B. Kyle — Utah State Representative, District 8 (Davis)
    { topic:'Recovery Residences', icon:'🏠', pos:'support', issueKey:'housing_support', issueStance:'support',
      text:'Sponsored a bill amending recovery-residence services regulation, which passed the Legislature.',
      evidence:'Chief-sponsored HB 296 (2025).', source:le('2025/bills/static/HB0296.html') },
    { topic:'Medical Freedom', icon:'💉', pos:'support', issueKey:'medical_freedom', issueStance:'support',
      text:'Opposes vaccine mandates, vaccine passports, and government shutdowns, and supports individual medical decision-making and private medical records.',
      source:{label:'Campaign site', url:'https://www.jasonbkyle.com/issues'} },
    { topic:'Fiscal Discipline', icon:'💵', pos:'support', issueKey:'gov_balance', issueStance:'support',
      text:'Wants Utah to avoid excessive debt and be prudent with taxpayer dollars, favoring limits on both taxation and the size of government.',
      source:{label:'Campaign site', url:'https://www.jasonbkyle.com/issues'} },
    { topic:'Energy Independence', icon:'⚡', pos:'support', issueKey:'enviro_energy', issueStance:'support',
      text:'Favors energy independence and an "all of the above" approach to Utah\'s energy needs alongside environmental stewardship.',
      source:{label:'Campaign site', url:'https://www.jasonbkyle.com/issues'} },
    { topic:'Public Lands & Federal Overreach', icon:'🏔', pos:'support', issueKey:'lands_local', issueStance:'support',
      text:'Argues federal overreach suppresses Utah\'s values and wants more local input over public lands and fewer strings on federal dollars.',
      source:{label:'Campaign site', url:'https://www.jasonbkyle.com/issues'} },
    { topic:'Right to Life', icon:'🕊', pos:'support', issueKey:'pro_life', issueStance:'support',
      text:'Pledges to defend the most vulnerable, viewing protection of defenseless life as a proper role of government.',
      source:{label:'Campaign site', url:'https://www.jasonbkyle.com/issues'} },
  ],
  mike_kohler: [ // Mike Kohler — Utah State Representative, District 54 (Wasatch/Summit)
    { topic:'Housing & Local Control', icon:'🏘', pos:'mixed', issueKey:'housing_build', issueStance:'mixed',
      text:'Favors keeping affordable-housing decisions in local hands rather than under state mandates, though he has voted for state housing measures.',
      source:{label:'Park Record', url:'https://www.parkrecord.com/2024/08/16/utah-district-59-rep-mike-kohler-hopes-to-help-keep-local-power-local/'} },
    { topic:'Agricultural Property Tax', icon:'💰', pos:'support', issueKey:'property_tax', issueStance:'support',
      text:'Sponsored a Property Tax Act revision and supports preferential greenbelt tax rates for land in agricultural production.',
      evidence:'Sponsored Property Tax Act / Pasture Land Qualification bills (2025).', source:{label:'le.utah.gov', url:'https://le.utah.gov/asp/billsintro/SubResults.asp?Listbox4=ALL&Sponsor=KohleM'} },
    { topic:'Ballot Signature Rules', icon:'🗳', pos:'support', issueKey:'election_integrity', issueStance:'support',
      text:'Sponsored a 2025 bill modifying ballot-initiative and referendum signature-collection rules.',
      evidence:'Sponsored Signature Collection Modifications (2025).', source:{label:'le.utah.gov', url:'https://le.utah.gov/asp/billsintro/SubResults.asp?Listbox4=ALL&Sponsor=KohleM'} },
    { topic:'Local Decision-Making', icon:'🏛', pos:'support', issueKey:'gov_balance', issueStance:'support',
      text:'A former Wasatch County commissioner who centers his work on preserving local community decision-making authority against state and quasi-governmental encroachment.',
      source:{label:'Park Record', url:'https://www.parkrecord.com/2024/08/16/utah-district-59-rep-mike-kohler-hopes-to-help-keep-local-power-local/'} },
    { topic:'Farm Vehicles on Roads', icon:'🚜', pos:'support', issueKey:'infrastructure', issueStance:'support',
      text:'Sponsored a 2025 bill addressing farm-vehicle regulations on Utah roads.',
      evidence:'Sponsored Farm Vehicle Amendments (2025).', source:{label:'le.utah.gov', url:'https://le.utah.gov/asp/billsintro/SubResults.asp?Listbox4=ALL&Sponsor=KohleM'} },
  ],
  mike_petersen: [ // Mike Petersen — Utah State Representative, District 2 (Cache)
    { topic:'Historical-Documents Curriculum', icon:'📚', pos:'support', issueKey:'edu_parental', issueStance:'support',
      text:'Sponsored a law adding the Ten Commandments and Magna Carta to documents that may be studied in public-school history and government classes.',
      evidence:'Chief-sponsored HB 269 (2024).', source:le('2024/bills/static/HB0269.html') },
    { topic:'Social Security Tax', icon:'👵', pos:'support', issueKey:'social_security', issueStance:'support',
      text:'Favors eliminating Utah\'s tax on Social Security benefits altogether.',
      source:{label:'HJ News', url:'https://www.hjnews.com/news/local/rep-michael-petersen-talks-upcoming-legislative-session/article_9e1893be-d378-11ef-a4f8-c7500dfdcb25.html'} },
    { topic:'Ranked-Choice Voting', icon:'🗳', pos:'oppose', issueKey:'voting_access', issueStance:'oppose',
      text:'Backed the 2024 effort to end ranked-choice voting in Utah municipal elections, saying the state had seen enough problems to shut the program down.',
      source:{label:'Deseret News', url:'https://www.deseret.com/2024/2/22/24080178/utah-house-passes-bill-end-ranked-choice-voting-for-cities/'} },
    { topic:'Voter Roll Maintenance', icon:'📋', pos:'support', issueKey:'democracy_balance', issueStance:'support',
      text:'Describes sponsoring election bills to keep county rolls clear of people who have moved or died and to ensure mismatched signatures are investigated in time.',
      source:{label:'HJ News', url:'https://www.hjnews.com/opinion/columns/candidate-forum-mike-petersen-points-to-his-conservative-voting-record/article_28d9a46a-b99a-5b3f-bdbd-a8be61ed7aba.html'} },
    { topic:'Housing & Water Priorities', icon:'🛒', pos:'support', issueKey:'cost_living', issueStance:'support',
      text:'Lists affordable housing and water among his priority issues for the legislative session.',
      source:{label:'HJ News', url:'https://www.hjnews.com/news/local/rep-michael-petersen-talks-upcoming-legislative-session/article_9e1893be-d378-11ef-a4f8-c7500dfdcb25.html'} },
  ],
  nelson_abbott: [ // Nelson Abbott — Utah State Representative, District 60 (Provo/Orem)
    { topic:'Civil Commitment Reform', icon:'🏥', pos:'support', issueKey:'healthcare', issueStance:'support',
      text:'Sponsored a law revising civil, criminal, and juvenile commitment procedures, including allowing telehealth examinations of proposed patients.',
      evidence:'Chief-sponsored HB 276 (2025).', source:{label:'le.utah.gov', url:'https://le.utah.gov/Session/2025/bills/enrolled/HB0276.pdf'} },
    { topic:'Disability & Supported Decisions', icon:'🤝', pos:'support', issueKey:'rights_balance', issueStance:'support',
      text:'Sponsored amendments to guardianship law and supported-decision-making agreements affecting people with disabilities.',
      evidence:'Sponsored HB 334 (2025).', source:{label:'le.utah.gov', url:'https://le.utah.gov/Session/2025/bills/amended/HB0334.Hamd.1.pdf'} },
    { topic:'Guardianship Bill of Rights', icon:'🛡', pos:'support', issueKey:'family_support', issueStance:'support',
      text:'Chief-sponsored a Guardianship Bill of Rights establishing the rights of individuals alleged to be incapacitated and those under guardianship.',
      evidence:'Chief-sponsored HB 320 (2022).', source:{label:'le.utah.gov', url:'https://le.utah.gov/~2022/bills/hbillint/HB0320S01.pdf'} },
    { topic:'Estate Planning Modernization', icon:'📜', pos:'support', issueKey:'property_rights', issueStance:'support',
      text:'An attorney who floor-sponsored an estate-planning law clarifying wills, trusts, powers of attorney, and the standard of proof for guardianship.',
      evidence:'House sponsor of SB 206 (2025).', source:{label:'le.utah.gov', url:'https://le.utah.gov/Session/2025/bills/introduced/SB0206S02.pdf'} },
  ],
  logan_monson: [ // Logan Monson — Utah State Representative, District 69 (rural southeast)
    { topic:'Public Lands Access', icon:'🏔', pos:'support', issueKey:'lands_balance', issueStance:'support',
      text:'Argues federal public-land restrictions add red tape and hurt the local economy, and pledges to fight for access and locally driven management.',
      source:{label:'San Juan Record', url:'https://sjrnews.com/san-juan-county/logan-monson-republican-candidate-utah-house-district-69'} },
    { topic:'Energy Reliability', icon:'⚡', pos:'support', issueKey:'enviro_energy', issueStance:'support',
      text:'Supports responsible development of traditional energy, nuclear innovation, and grid reliability to ensure dependable, affordable power.',
      source:{label:'Moab Times-Independent', url:'https://www.moabtimes.com/articles/house-district-69-primary-what-monson-and-gardner-say-about-affordability-public-lands-and-water/'} },
    { topic:'Cost of Living & Housing', icon:'🏠', pos:'support', issueKey:'cost_living', issueStance:'support',
      text:'Calls affordability his top issue — citing housing, food, fuel, and health-care costs — and favors reducing regulation to increase housing availability.',
      source:{label:'Moab Times-Independent', url:'https://www.moabtimes.com/articles/house-district-69-primary-what-monson-and-gardner-say-about-affordability-public-lands-and-water/'} },
    { topic:'Transparent Courts', icon:'📂', pos:'support', issueKey:'gov_transparency', issueStance:'support',
      text:'Sponsored a "Transparent Courts" bill requiring audio recordings of public court hearings and a free statewide website to access records.',
      evidence:'Sponsored HB 540 (2026).', source:{label:'Midway City', url:'https://www.midwaycityut.gov/wp-content/uploads/2026/04/Legislative-Session-Partial-Summary-2026.pdf'} },
    { topic:'Water Storage', icon:'💧', pos:'support', issueKey:'water_storage', issueStance:'support',
      text:'Supports water conservation, infrastructure, and storage with practical local solutions rather than one-size-fits-all mandates.',
      source:{label:'Moab Times-Independent', url:'https://www.moabtimes.com/articles/house-district-69-primary-what-monson-and-gardner-say-about-affordability-public-lands-and-water/'} },
  ],
  walt_brooks: [ // Walt Brooks — Utah State Representative, District 75 (St. George)
    { topic:'Genetic-Information Privacy', icon:'🧬', pos:'support', issueKey:'tech_balance', issueStance:'support',
      text:'Sponsored genetic-information legislation restricting genetic sequencers and barring storage of genetic data in foreign-adversary nations.',
      evidence:'Chief-sponsored HB 548 (2025).', source:{label:'le.utah.gov', url:'https://le.utah.gov/Session/2025/bills/introduced/HB0548S01.pdf'} },
    { topic:'Vaccine Passport Ban', icon:'💉', pos:'support', issueKey:'medical_freedom', issueStance:'support',
      text:'Ran legislation making it unlawful for places of public accommodation to discriminate against individuals based on immunity or vaccination status.',
      evidence:'Sponsored HB 60 Vaccine Passport Amendments (2022).', source:{label:'Ballotpedia', url:'https://ballotpedia.org/Walt_Brooks'} },
    { topic:'Social Security Tax Cut', icon:'💵', pos:'support', issueKey:'lower_taxes', issueStance:'support',
      text:'Has repeatedly cut Utah\'s tax on Social Security benefits, including a law expanding the income-based phaseout thresholds for the tax credit.',
      evidence:'Chief-sponsored HB 88 (2023); House sponsor SB 71 (2025).', source:{label:'le.utah.gov', url:'https://le.utah.gov/Session/2025/bills/introduced/SB0071.pdf'} },
    { topic:'Pro-Life Protections', icon:'🍼', pos:'support', issueKey:'pro_life', issueStance:'support',
      text:'States he has created legislation to protect the unborn across his terms in the House.',
      source:{label:'Ballotpedia', url:'https://ballotpedia.org/Walt_Brooks'} },
  ],
  matt_macpherson: [ // Matt MacPherson — Utah State Representative, District 26 (West Valley)
    { topic:'Safe Firearm Storage in Custody', icon:'🔒', pos:'support', issueKey:'gun_safety', issueStance:'support',
      text:'Sponsored a law on firearm retention requiring better protocols for safely storing weapons in custody to prevent unauthorized access.',
      evidence:'Chief-sponsored HB 195 (2025).', source:le('2025/bills/static/HB0195.html') },
    { topic:'Firearm Safety Incentives', icon:'🛡', pos:'support', issueKey:'gun_balance', issueStance:'support',
      text:'Sponsored a bill creating a tax incentive for purchasing firearm safety and storage devices like trigger locks and safes.',
      evidence:'Sponsored HB 143 (2025).', source:{label:'KSL NewsRadio', url:'https://kslnewsradio.com/inside-sources/firearm-safety-device/2173309/'} },
    { topic:'School Campus Safety', icon:'🏫', pos:'support', issueKey:'public_schools', issueStance:'support',
      text:'Sponsored a law increasing penalties for unlawfully entering school grounds to enhance campus safety.',
      evidence:'Sponsored HB 477 (2025).', source:{label:'Campaign recap', url:'https://www.electmattmacpherson.com/2025-general-session'} },
    { topic:'Open Records (GRAMA)', icon:'📂', pos:'support', issueKey:'gov_transparency', issueStance:'support',
      text:'Sponsored amendments to the Government Records Access and Management Act streamlining records access and clarifying disclosure exceptions.',
      evidence:'Sponsored HB 526 (2025).', source:{label:'Campaign recap', url:'https://www.electmattmacpherson.com/2025-general-session'} },
    { topic:'Criminal Justice Modifications', icon:'⚖️', pos:'support', issueKey:'justice_reform', issueStance:'support',
      text:'Sponsored criminal-justice modifications changing probation rules, expanding parole eligibility, and adjusting sentencing guidelines.',
      evidence:'Sponsored HB 539 (2025).', source:{label:'Campaign recap', url:'https://www.electmattmacpherson.com/2025-general-session'} },
  ],
  kristen_chevrier: [ // Kristen Chevrier — Utah State Representative, District 56 (Highland)
    { topic:'SNAP Nutrition Reform', icon:'🛒', pos:'support', issueKey:'gov_services', issueStance:'support',
      text:'Sponsored legislation barring SNAP benefits from buying candy and soft drinks, followed by a bill to also exclude ultra-processed foods.',
      evidence:'Sponsored HB 403 (2025) and HB 569 (2026).', source:{label:'KSL', url:'https://www.ksl.com/article/51449636/utah-bill-would-prevent-food-stamp-use-for-ultra-processed-food'} },
    { topic:'Vehicle Data Privacy', icon:'🔒', pos:'support', issueKey:'tech_balance', issueStance:'support',
      text:'Primary sponsor of motor-vehicle data-privacy legislation tightening how data collected by vehicles can be used; it passed the House 65-1.',
      evidence:'Primary sponsor of HB 357 (2026).', source:{label:'FastDemocracy', url:'https://fastdemocracy.com/bill-search/ut/2026/bills/UTB00014743/'} },
    { topic:'Property-Rights Land Use', icon:'🏡', pos:'support', issueKey:'lands_local', issueStance:'support',
      text:'Sponsored a bill requiring counties to accept plan-review applications for single-family homes on qualifying parcels, adding property-rights protection to county land-use purpose.',
      evidence:'Chief-sponsored HB 544 (2026).', source:{label:'le.utah.gov', url:'https://le.utah.gov/Session/2026/bills/introduced/HB0544.xml'} },
    { topic:'Informed Vaccine Consent', icon:'💉', pos:'support', issueKey:'health_balance', issueStance:'support',
      text:'Director of a health-freedom advocacy group who argues parents should receive complete information to make their own informed vaccination decisions.',
      source:{label:'BYU Daily Universe', url:'https://universe.byu.edu/2019/04/15/answers-to-questions-about-common-vaccine-concerns-1/'} },
    { topic:'Raw Milk Access', icon:'🥛', pos:'support', issueKey:'gov_regulation', issueStance:'support',
      text:'Has run food legislation including a measure to allow the sale of raw-milk products without a permit, reducing regulatory barriers to direct agricultural sales.',
      source:{label:'KSL', url:'https://www.ksl.com/article/51449636/utah-bill-would-prevent-food-stamp-use-for-ultra-processed-food'} },
  ],
  leah_hansen: [ // Leah Hansen — Utah State Representative, District 43 (Utah County)
    { topic:'Foreign Land Ownership', icon:'🌐', pos:'support', issueKey:'lands_local', issueStance:'support',
      text:'Cosponsored Security and Land Restriction Amendments tightening provisions on the sale of Utah land to restricted foreign entities.',
      evidence:'Cosponsor of HB 291 (2026).', source:{label:'le.utah.gov', url:'https://le.utah.gov/Session/2026/bills/enrolled/HB0291.pdf'} },
    { topic:'Childhood Independence', icon:'🧒', pos:'support', issueKey:'edu_parental', issueStance:'support',
      text:'Testified for legislation encouraging childhood independence and free play, reflecting a parental-rights, reduced-intervention view of raising children.',
      source:{label:'Ballotpedia', url:'https://ballotpedia.org/Leah_Hansen_(Utah)'} },
    { topic:'Limiting DEI Programs', icon:'🏛', pos:'support', issueKey:'gov_balance', issueStance:'support',
      text:'Publicly supported HB 261, the 2024 law restricting diversity, equity, and inclusion programs in Utah government and higher education.',
      source:{label:'Wikipedia', url:'https://en.wikipedia.org/wiki/Leah_Hansen'} },
    { topic:'Tax Relief for Families', icon:'📉', pos:'support', issueKey:'tax_middle_class', issueStance:'support',
      text:'A House majority member during the 2026 session that cut taxes for a sixth consecutive year, lowered the gas tax, and expanded the child tax credit.',
      source:{label:'Utah House', url:'https://house.utleg.gov/utahs-2026-legislative-session-lower-costs-stronger-families-and-long-term-investments/'} },
  ],
  john_arthur: [ // John Arthur — Utah State Representative, District 23 (Millcreek; Democrat)
    { topic:'Public-Employee Bargaining', icon:'✊', pos:'support', issueKey:'econ_workers', issueStance:'support',
      text:'A teacher who organized the referendum against Utah\'s ban on public-employee collective bargaining and cast his first legislative vote to repeal that law.',
      source:{label:'KSL', url:'https://www.ksl.com/article/51417476/how-utahs-newest-lawmaker-went-from-fighting-hb267-to-using-his-first-vote-to-repeal-it'} },
    { topic:'Nonpartisan School Boards', icon:'🗳', pos:'support', issueKey:'democracy_balance', issueStance:'support',
      text:'Sponsored a 2026 bill to make Utah State School Board elections nonpartisan, though it did not receive a hearing.',
      evidence:'Sponsored nonpartisan school-board elections bill (2026).', source:{label:'Fox 13', url:'https://www.fox13now.com/news/politics/2026-utah-legislature-on-education'} },
    { topic:'Great Salt Lake Stewardship', icon:'🌊', pos:'support', issueKey:'enviro_balance', issueStance:'support',
      text:'Lists addressing the Great Salt Lake crisis and promoting environmental stewardship among his core legislative priorities.',
      source:{label:'Utah House Democrats', url:'https://www.utahhousedemocrats.utleg.gov/john-arthur'} },
    { topic:'Transit & Livability', icon:'🚌', pos:'support', issueKey:'transit', issueStance:'support',
      text:'Campaigned on strengthening transit infrastructure to support livability and reduce costs for working families.',
      source:{label:'Campaign site', url:'https://www.votejohnarthur.com/about'} },
    { topic:'Early Childhood & Seniors', icon:'👶', pos:'support', issueKey:'family_support', issueStance:'support',
      text:'Lists improving access to early-childhood programs and senior services among his legislative priorities.',
      source:{label:'Utah House Democrats', url:'https://www.utahhousedemocrats.utleg.gov/john-arthur'} },
  ],
  tiara_auxier: [ // Tiara Auxier — Utah State Representative, District 68 (rural NE)
    { topic:'Record Expungement', icon:'⚖️', pos:'support', issueKey:'justice_balance', issueStance:'support',
      text:'Chief-sponsored Expungement Amendments refining automatic-expungement eligibility while excluding sex, kidnap, and child-abuse offenses; it passed the House 73-0.',
      evidence:'Chief-sponsored HB 297 (2025).', source:{label:'le.utah.gov', url:'https://le.utah.gov/Session/2025/bills/enrolled/HB0297.pdf'} },
    { topic:'Civics Education', icon:'📚', pos:'support', issueKey:'public_schools', issueStance:'support',
      text:'Sponsored a civics-education bill requiring instruction on American self-governance and historically influential texts while expanding parental control over material.',
      evidence:'Sponsored HB 312 (2026).', source:{label:'KPCW', url:'https://www.kpcw.org/show/local-news-hour/2026-04-17/utah-house-rep-tiara-auxier-talks-taxes-bible-use-in-civics-classes'} },
    { topic:'Caucus-Convention System', icon:'🗳', pos:'oppose', issueKey:'democracy_balance', issueStance:'oppose',
      text:'Has publicly committed to fully repealing SB54, seeking to eliminate the signature-gathering path and preserve the caucus-convention nominating system.',
      source:{label:'KPCW', url:'https://www.kpcw.org/state-regional/2025-01-17/utah-republicans-to-introduce-bills-restricting-ways-to-get-on-primary-ballot'} },
    { topic:'School Bond Voter Approval', icon:'🏫', pos:'support', issueKey:'gov_transparency', issueStance:'support',
      text:'Sponsored a bill requiring a school district to get voter approval of a general-obligation bond before issuing a lease-revenue bond for construction.',
      evidence:'Sponsored HB 332 (2026).', source:{label:'USBE', url:'https://schools.utah.gov/policy/_policy_/_utahlegislativesession_/_2026_/USBEBillTracker.pdf'} },
  ],
  verona_mauga: [ // Verona Mauga — Utah State Representative, District 24 (Salt Lake County; Democrat)
    { topic:'Bike-Lane Safety', icon:'🚲', pos:'support', issueKey:'infrastructure', issueStance:'support',
      text:'Chief-sponsored Bicycle Lane Safety Amendments prohibiting driving or parking in bike lanes statewide; it passed both chambers and was signed into law.',
      evidence:'Chief-sponsored HB 290 (2025).', source:{label:'Cycling West', url:'https://www.cyclingwest.com/advocacy/new-utah-bills-prohibit-drivers-from-blocking-bike-lanes-allow-e-bike-powered-food-carts/'} },
    { topic:'Child Protection (VR Offenses)', icon:'🛡', pos:'support', issueKey:'justice_balance', issueStance:'support',
      text:'Chief-sponsored a law creating the nation\'s first criminal offenses for unlawful sexual activity with a child using virtual reality.',
      evidence:'Chief-sponsored HB 358 (2025).', source:{label:'le.utah.gov', url:'https://le.utah.gov/Session/2025/bills/enrolled/HB0358.pdf'} },
    { topic:'Protecting Veterans', icon:'🎖', pos:'support', issueKey:'veterans', issueStance:'support',
      text:'Chief-sponsored Veteran Protections Amendments letting the state penalize those who unlawfully charge veterans for help obtaining VA benefits; it passed the House 72-0.',
      evidence:'Chief-sponsored HB 248 (2025).', source:{label:'le.utah.gov', url:'https://le.utah.gov/Session/2025/bills/enrolled/HB0248.pdf'} },
    { topic:'Open Carry Near Gatherings', icon:'🔫', pos:'support', issueKey:'gun_balance', issueStance:'support',
      text:'A gun owner who sponsored a bill prohibiting open carry within 500 feet of large public gatherings while preserving concealed carry; the bill did not pass.',
      evidence:'Chief-sponsored HB 166 (2026).', source:{label:'Herald Journal', url:'https://www.hjnews.com/news/local/utah-representative-proposes-limits-on-open-carry-at-large-public-gatherings/article_6d3b894e-25ae-489e-a6bf-eb634513c718.html'} },
    { topic:'Food-Service Small Business', icon:'🍞', pos:'support', issueKey:'econ_growth', issueStance:'support',
      text:'Sponsored a bill extending food-safety-manager certification renewal from three to five years and exempting nonprofit fundraising events from establishment requirements.',
      evidence:'Sponsored HB 172 (2026).', source:{label:'Utah Business', url:'https://www.utahbusiness.com/awards-and-rankings/2025/05/07/30-women-to-watch-utah-business-2025-verona-sagato-mauga/'} },
  ],
  stephen_l_whyte: [ // Stephen L. Whyte — Utah State Representative, District 62 (Utah County)
    { topic:'Public Education Base Budget', icon:'🏫', pos:'support', issueKey:'public_schools', issueStance:'support',
      text:'Chief-sponsored the 2026 public-education base budget, setting the weighted-pupil-unit value and appropriating funds for districts, charters, and state education agencies.',
      evidence:'Chief-sponsored HB 1 (2026).', source:{label:'le.utah.gov', url:'https://le.utah.gov/Session/2026/bills/introduced/HB0001.pdf'} },
    { topic:'Repeat Sex-Offense Penalties', icon:'🛡', pos:'support', issueKey:'justice_balance', issueStance:'support',
      text:'Sponsored Sexual Offense Revisions strengthening penalties for repeat child-sex-abuse offenders, noting Utah lagged neighboring states.',
      evidence:'Sponsored HB 207 (2025).', source:{label:'Deseret News', url:'https://www.deseret.com/utah/2025/02/03/child-sexual-abuse-bill-repeat-offenders/'} },
    { topic:'Land-Use Reform', icon:'🏗', pos:'support', issueKey:'lands_local', issueStance:'support',
      text:'Sponsored a sweeping land-use reform bill aimed at reducing bureaucracy, streamlining approvals, and clarifying law to let the market produce housing.',
      evidence:'Sponsored HB 368 (2025).', source:{label:'Salt Lake Tribune', url:'https://www.sltrib.com/news/politics/2025/03/22/utah-housing-heres-what-lawmakers/'} },
    { topic:'Postsecondary Consumer Oversight', icon:'🎓', pos:'support', issueKey:'gov_regulation', issueStance:'support',
      text:'House sponsor of Private Postsecondary Education Modifications, rewriting registration, certification, and consumer-protection oversight of proprietary schools.',
      evidence:'House sponsor (2023).', source:{label:'le.utah.gov', url:'https://le.utah.gov/~2023/bills/sbillint/SB0180S01.htm'} },
    { topic:'Housing Strategic Plan', icon:'🏘', pos:'support', issueKey:'cost_living', issueStance:'support',
      text:'Sponsored a resolution endorsing the Utah Housing Strategic Plan and committing lawmakers to track its implementation to expand supply.',
      evidence:'Sponsored HCR 6 (2026).', source:{label:'Utah Legislature', url:'https://le.utah.gov/billlist.jsp?session=2026GS'} },
  ],
};

// ── Helpers ─────────────────────────────────────────────────────────────────
function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
function cardLine(c) {
  const parts = [
    `topic:'${esc(c.topic)}'`, `icon:'${c.icon}'`, `pos:'${c.pos}'`,
    `issueKey:'${c.issueKey}'`, `issueStance:'${c.issueStance}'`, `text:'${esc(c.text)}'`,
  ];
  if (c.evidence) parts.push(`evidence:'${esc(c.evidence)}'`);
  if (c.source) parts.push(`source:{label:'${esc(c.source.label)}', url:'${esc(c.source.url)}'}`);
  return `      { ${parts.join(', ')} },`;
}

// Splice new cards into each id's existing ISSUE_STANCE_DATA array in index.html,
// inserting them just before that entry's closing `    ],` line.
function insertIntoIndex() {
  let html = readFileSync(INDEX, 'utf8');
  const lines = html.split('\n');
  let inserted = 0, profiles = 0, missing = [];
  for (const [id, cards] of Object.entries(DATA)) {
    const startIdx = lines.findIndex(l => l.startsWith(`    ${id}: [`));
    if (startIdx === -1) { missing.push(id); continue; }
    let closeIdx = -1;
    for (let i = startIdx + 1; i < lines.length; i++) {
      if (/^    \],?\s*$/.test(lines[i])) { closeIdx = i; break; }
      if (/^    [a-z0-9_]+:\s*\[/.test(lines[i])) break; // safety: next entry, shouldn't happen
    }
    if (closeIdx === -1) { missing.push(id + '(no-close)'); continue; }
    const block = cards.map(cardLine);
    lines.splice(closeIdx, 0, ...block);
    inserted += cards.length; profiles++;
  }
  if (missing.length) { console.error('✗ entries not found:', missing.join(', ')); process.exit(1); }
  writeFileSync(INDEX, lines.join('\n'));
  console.log(`✎ spliced ${inserted} cards into ${profiles} ISSUE_STANCE_DATA entries in index.html`);
}

// ── Firestore mirror (topic → text into the `stances` map) ───────────────────
function enc(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
  if (typeof v === 'object') { const f = {}; for (const [k, val] of Object.entries(v)) f[k] = enc(val); return { mapValue: { fields: f } }; }
  throw new Error('cannot encode');
}
function dec(v) {
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return parseInt(v.integerValue, 10);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.nullValue !== undefined) return null;
  if (v.arrayValue !== undefined) return (v.arrayValue.values || []).map(dec);
  if (v.mapValue !== undefined) { const o = {}; for (const [k, val] of Object.entries(v.mapValue.fields || {})) o[k] = dec(val); return o; }
  return null;
}
async function getOne(id) {
  const r = await fetch(`${BASE}/${id}`); if (!r.ok) return null;
  const d = await r.json(); if (!d.fields) return null;
  const o = {}; for (const [k, v] of Object.entries(d.fields)) o[k] = dec(v); return o;
}
async function patch(id, fields) {
  const qs = Object.keys(fields).map(m => 'updateMask.fieldPaths=' + encodeURIComponent(m)).join('&');
  const body = { fields: {} }; for (const [k, v] of Object.entries(fields)) body.fields[k] = enc(v);
  const r = await fetch(`${BASE}/${id}?${qs}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`patch ${id}: HTTP ${r.status} — ${(await r.text()).slice(0, 200)}`);
}
async function mirrorToFirestore() {
  let touched = 0, added = 0;
  for (const [id, cards] of Object.entries(DATA)) {
    const doc = await getOne(id);
    if (!doc) { console.log(`  ✗ ${id}: not found`); continue; }
    const existing = (doc.stances && typeof doc.stances === 'object' && !Array.isArray(doc.stances)) ? doc.stances : {};
    const merged = Object.assign({}, existing); let fresh = 0;
    for (const c of cards) { if (!(c.topic in merged)) fresh++; merged[c.topic] = c.text; }
    await patch(id, { stances: merged, updatedAt: STAMP });
    touched++; added += fresh;
    console.log(`  ✎ ${id} (${doc.name}): +${fresh} stances → ${Object.keys(merged).length} total`);
  }
  console.log(`\nMirrored to ${touched} Firestore profiles (${added} new stances).`);
}

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  let profiles = 0, positions = 0, bill = 0, src = 0;
  for (const cards of Object.values(DATA)) { profiles++; positions += cards.length; bill += cards.filter(c => c.evidence).length; src += cards.filter(c => c.source).length; }
  console.log(`Wave 6: ${profiles} sitting legislators, ${positions} new positions (${bill} bill-backed, ${src} with source links).`);

  if (EMIT) {
    const out = [];
    for (const [id, cards] of Object.entries(DATA)) { out.push(`    // ${id}`); cards.forEach(c => out.push(cardLine(c))); }
    writeFileSync('/tmp/stance-block-wave6.txt', out.join('\n'));
    console.log('Wrote /tmp/stance-block-wave6.txt');
  }
  if (INSERT) insertIntoIndex();
  if (APPLY) await mirrorToFirestore();
  if (!EMIT && !INSERT && !APPLY) console.log('(dry run — pass --insert to splice index.html, --apply to mirror Firestore)');
})();
