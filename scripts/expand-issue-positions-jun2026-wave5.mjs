#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — June 2026 Issue-Position depth pass (wave 5)
//
// A roster review found that of the 91 CURRENT sitting Utah legislators, only 9
// carried the target 6+ structured, ISSUE_MAP-keyed Issue Positions that power
// the Personalized Alignment Tool; 82 sat at 3–5 (and the Senate President had
// none). This pass DEEPENS those 82 profiles toward 6–8 comparable positions.
//
// Nothing here is invented. Every position below is drawn strictly from that
// legislator's OWN already-documented record in their live Firestore doc — the
// `stances` they have on file, their verdict-tagged `promises` (with the bill
// numbers those promises cite), and their stated `keyIssues`. Each new position
// is mapped to an EXACT ISSUE_MAP issueKey + issueStance so it becomes a
// comparable issue in the Alignment Tool and a chip on the profile. Where the
// underlying record names a concrete bill the position carries `evidence`;
// stated-only priorities carry none, so the Snapshot honestly tags them
// "💬 Stated". Positions never duplicate an issueKey already on the profile
// unless the topic is genuinely distinct.
//
// Keyed by the EXACT ISSUE_STANCE_DATA key each profile already lives under
// (`stanceKey`) so new objects append to the right array; `fsId` is the
// Firestore document id, used by --apply to mirror each topic→text into the
// `stances` map. One profile (sadams) has no array yet, so --patch CREATES it.
//
//   node scripts/expand-issue-positions-jun2026-wave5.mjs --patch   # edit index.html
//   node scripts/expand-issue-positions-jun2026-wave5.mjs --apply   # mirror to Firestore
//   node scripts/expand-issue-positions-jun2026-wave5.mjs           # dry-run summary
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync } from 'fs';

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const PATCH = process.argv.includes('--patch');
const APPLY = process.argv.includes('--apply');
const STAMP = '2026-06-20T00:00:00.000Z';
const HTML = 'index.html';

// stanceKey → { fsId, name, create?, adds:[positions] }
const DATA = {
  // ──────────────────────── 3-position cohort (+ Senate President) ─────────
  sadams: { fsId: 'sadams', name: 'Stuart Adams', create: true, adds: [
    { topic:'Income Taxes', icon:'💰', pos:'support', issueKey:'lower_taxes', issueStance:'support', text:'Made repeated income-tax relief a defining Senate priority; the Legislature cut Utah\'s flat income-tax rate for five consecutive years under his leadership.', evidence:'Five consecutive income-tax-rate cuts through 2024.' },
    { topic:'Water & Great Salt Lake', icon:'💧', pos:'support', issueKey:'water', issueStance:'support', text:'Made saving the Great Salt Lake and long-term water planning a signature cause, chief-sponsoring a generational water-infrastructure framework and pursuing an interstate water compact.', evidence:'Chief sponsor of SB 211 Generational Water Infrastructure (2024).' },
    { topic:'Nuclear Energy & Power', icon:'⚡', pos:'support', issueKey:'enviro_energy', issueStance:'support', text:'Leads Utah\'s push to become a national hub for advanced nuclear power, championing "Operation Gigawatt" to double or triple state energy production.' },
    { topic:'Transportation & Olympics', icon:'🚧', pos:'support', issueKey:'infrastructure', issueStance:'support', text:'Backs major transportation and transit investment ahead of the 2034 Winter Olympics and Point of the Mountain growth, including long-running I-15 corridor expansion.' },
    { topic:'School Choice', icon:'🎓', pos:'support', issueKey:'school_choice', issueStance:'support', text:'Backed creating Utah\'s Education Savings Account school-choice scholarship as Senate leader.' },
    { topic:'Housing Affordability', icon:'🏗', pos:'support', issueKey:'housing_build', issueStance:'support', text:'Names housing affordability a top concern and supports expanding supply to keep the "Utah Dream" within reach.' },
    { topic:'State Budget & Fiscal Restraint', icon:'⚖️', pos:'mixed', issueKey:'gov_balance', issueStance:'mixed', text:'Pledges conservative, surplus-driven budgeting, though state budget growth under his Senate presidency has repeatedly outpaced inflation and population.' },
  ]},
  anthony_loubet: { fsId: 'anthony_loubet', name: 'Anthony Loubet', adds: [
    { topic:'Workers\' Compensation & Costs', icon:'🛠', pos:'support', issueKey:'econ_workers', issueStance:'support', text:'Sponsored workers\'-compensation reform aimed at lowering costs for his working-class Salt Lake County district.', evidence:'Sponsored HB 111 Workers\' Compensation Amendments (2025), passed 73–0.' },
    { topic:'Courts & Civil Law', icon:'⚖️', pos:'support', issueKey:'justice_balance', issueStance:'support', text:'An attorney who carries civil- and commercial-law reform, cracking down on the unauthorized practice of law and expanding adult protective services.', evidence:'Sponsored HB 534 APS (2025) and HB 260 Unauthorized Practice of Law (2026).' },
    { topic:'Election Notice Modernization', icon:'🗳', pos:'support', issueKey:'election_integrity', issueStance:'support', text:'Proposed a constitutional amendment allowing online publication of ballot measures in place of costly newspaper notices.', evidence:'Sponsored HJR 010 (2025).' },
  ]},
  ashlee_matthews: { fsId: 'ashlee_matthews', name: 'Ashlee Matthews', adds: [
    { topic:'Maternal Health Coverage', icon:'🏥', pos:'support', issueKey:'healthcare', issueStance:'support', text:'Required state-employee insurance to cover doula, licensed-midwife, and birth-center services, framing it as a health and cost-saving measure for working families.', evidence:'Chief sponsor of HB 415 (2023).' },
    { topic:'Second-Chance Employment', icon:'🤝', pos:'support', issueKey:'justice_reform', issueStance:'support', text:'Advocates for public entities to hire qualified people with criminal records, arguing employment is vital to reintegration after incarceration.', evidence:'Sponsored HCR 022 (2022).' },
    { topic:'Public Schools & Student Transit', icon:'🍎', pos:'support', issueKey:'public_schools', issueStance:'support', text:'Modernized student-transportation eligibility so more students qualify for school-bus service.', evidence:'Sponsored HB 161 (2025).' },
  ]},
  hoang_nguyen: { fsId: 'hoang_nguyen', name: 'Hoang Nguyen', adds: [
    { topic:'Immigrant & Refugee Representation', icon:'🤝', pos:'support', issueKey:'immigration_reform', issueStance:'support', text:'Utah\'s first Vietnamese-American refugee legislator, focused on representation and services for immigrant and refugee communities.' },
    { topic:'Air Quality & Environment', icon:'🌱', pos:'support', issueKey:'climate_action', issueStance:'support', text:'Focuses on environmental quality and emissions reduction, modernizing state CO2 system-safety rules in 2026.', evidence:'Sponsored HB 240 (2026).' },
    { topic:'Emergency Medical Services', icon:'🚑', pos:'support', issueKey:'health_rural', issueStance:'support', text:'Passed legislation improving Utah\'s emergency medical services system.', evidence:'Primary sponsor of HB 391 (2025), passed the House 68–0.' },
  ]},
  jake_sawyer: { fsId: 'jake_sawyer', name: 'Jake Sawyer', adds: [
    { topic:'Consumer Protection', icon:'🏦', pos:'support', issueKey:'econ_corp_account', issueStance:'support', text:'Backs stronger consumer-transparency rules, requiring shelf prices to match register prices and authorizing state enforcement of weights-and-measures and labeling standards.', evidence:'Sponsored HB 493 Consumer Products Amendments (2026).' },
    { topic:'Cost of Living', icon:'🛒', pos:'support', issueKey:'cost_living', issueStance:'support', text:'Identifies economic relief for working families facing inflation as a top priority.' },
    { topic:'Limited Government', icon:'🧹', pos:'support', issueKey:'gov_waste', issueStance:'support', text:'Names limited government a core governing priority.' },
  ]},
  james_dunnigan: { fsId: 'james_dunnigan', name: 'James Dunnigan', adds: [
    { topic:'Prescription Drug Pricing', icon:'💉', pos:'support', issueKey:'health_drug_prices', issueStance:'support', text:'Works pharmacy-benefit regulation within his commerce portfolio as Utah adopted drug-rebate pass-through rules to direct PBM savings to consumers.' },
    { topic:'Medicaid & Health Coverage', icon:'💊', pos:'mixed', issueKey:'healthcare_market', issueStance:'support', text:'As Health Reform Task Force chair, favored a narrower, lower-cost state Medicaid alternative over full federal expansion, prioritizing fiscal sustainability.' },
    { topic:'Local Government Modernization', icon:'🏛', pos:'support', issueKey:'reform_balance', issueStance:'support', text:'Modernized local-government and county-governance rules through multiple signed bills.', evidence:'Sponsored HB 38 and HB 457 (2026).' },
  ]},
  jburton: { fsId: 'jburton', name: 'Jefferson Burton', adds: [
    { topic:'Election Security & Vote-by-Mail', icon:'🗳', pos:'support', issueKey:'election_integrity', issueStance:'support', text:'Sponsored an overhaul ending automatic mail balloting and requiring ID-number verification on return envelopes, citing election-security concerns.', evidence:'Sponsored HB 300 (2025).' },
    { topic:'Government Operations & Boards', icon:'⚙️', pos:'support', issueKey:'reform_balance', issueStance:'support', text:'Chaired House Government Operations and moved to delete same-party-membership caps on roughly 19 state boards, arguing for recruiting the best minds regardless of party.', evidence:'Sponsored HB 412 (2025).' },
    { topic:'Emergency & Disaster Readiness', icon:'🔥', pos:'support', issueKey:'disaster_resilience', issueStance:'support', text:'A retired major general who led Utah\'s Department of Health COVID-19 operations and focuses on emergency and disaster readiness.' },
  ]},
  john_arthur: { fsId: 'john_arthur', name: 'John Arthur', adds: [
    { topic:'Renter Protections', icon:'🏘', pos:'support', issueKey:'housing_support', issueStance:'support', text:'Sponsored legislation requiring landlords to give tenants 60 days\' notice before residential rent increases.', evidence:'Sponsored HB 478 (2026).' },
    { topic:'Teacher Pay & Support', icon:'🍎', pos:'support', issueKey:'edu_balance', issueStance:'support', text:'The 2021 Utah Teacher of the Year, he champions educator pay and staffing every school with a certified teacher-librarian.', evidence:'Sponsored HB 198 educator-salary and HB 364 teacher-librarian bills (2026).' },
    { topic:'Cost of Living', icon:'🛒', pos:'support', issueKey:'cost_living', issueStance:'support', text:'Stated platform commitment to reduce the cost of living for working families.' },
  ]},
  john_johnson: { fsId: 'john_johnson', name: 'John Johnson', adds: [
    { topic:'Intellectual Diversity & DEI', icon:'🗣', pos:'support', issueKey:'free_speech', issueStance:'support', text:'Sponsored legislation banning DEI-office funding in higher education and protecting guest lecturers and intellectual diversity on campuses.', evidence:'Sponsored SB 295 (2026); SB 283 (2023).' },
    { topic:'Civic Education', icon:'🎓', pos:'support', issueKey:'edu_balance', issueStance:'support', text:'Established a Center for Civic Excellence at Utah State University and backs stronger civic education.', evidence:'Primary sponsor of SB 334 (2025).' },
    { topic:'Standardized Testing & Rural Schools', icon:'🍎', pos:'support', issueKey:'public_schools', issueStance:'support', text:'Improved accountability in standardized testing and reformed the Statewide Online Education Program for rural and small schools.', evidence:'Sponsored SB 39 and SB 35 (2025).' },
  ]},
  karen_m_peterson: { fsId: 'karen_m_peterson', name: 'Karen M. Peterson', adds: [
    { topic:'Economic Development & Innovation', icon:'📈', pos:'support', issueKey:'econ_growth', issueStance:'support', text:'Transformed the Utah Innovation Lab into the Nucleus Institute to support innovation and economic development.', evidence:'Chief sponsor of HB 530 (2025).' },
    { topic:'Higher-Ed Workforce Alignment', icon:'🎓', pos:'support', issueKey:'edu_balance', issueStance:'support', text:'Overhauled higher-education funding to steer dollars toward high-demand programs tied to jobs.', evidence:'Chief sponsor of HB 265 Strategic Reinvestment (2025).' },
    { topic:'Local Government', icon:'🏛', pos:'support', issueKey:'reform_balance', issueStance:'support', text:'Drawing on her Clinton City Council service, worked to codify local transportation utility fees and study requirements.' },
  ]},
  kay_christofferson: { fsId: 'kay_christofferson', name: 'Kay Christofferson', adds: [
    { topic:'Growth & Mobility Planning', icon:'🏗', pos:'support', issueKey:'housing_build', issueStance:'support', text:'A civil engineer and House Transportation chair focused on corridor preservation and aligning Utah County\'s rapid growth with road and transit capacity.' },
    { topic:'Motor Vehicle Modernization', icon:'⚙️', pos:'support', issueKey:'reform_balance', issueStance:'support', text:'Modernized Utah\'s Motor Vehicle Division statutes across numerous code sections.', evidence:'Chief sponsor of HB 57 (2026).' },
    { topic:'Clean-Vehicle HOV Reform', icon:'⚡', pos:'support', issueKey:'enviro_energy', issueStance:'support', text:'Repealed the outdated clean-vehicle HOV-lane program tied to an obsolete federal standard as part of transit-governance reform.', evidence:'Chief sponsor of HB 481 (2026).' },
  ]},
  kristen_chevrier: { fsId: 'kristen_chevrier', name: 'Kristen Chevrier', adds: [
    { topic:'Medical Freedom & Informed Consent', icon:'🩺', pos:'support', issueKey:'medical_freedom', issueStance:'support', text:'Directs a Utah advocacy group on informed consent and medical freedom and sponsored a bill giving patients the right to supply their own blood for medical procedures.', evidence:'Sponsored HB 156 (2026).' },
    { topic:'Food & Nutrition Policy', icon:'🍎', pos:'support', issueKey:'family_support', issueStance:'support', text:'Passed laws restricting SNAP purchases of candy and soda and limiting synthetic dyes and additives in public-school meals.', evidence:'Sponsored HB 403 and HB 402 (2025).' },
    { topic:'Raw Milk & Food Freedom', icon:'🥛', pos:'support', issueKey:'rural_ag', issueStance:'support', text:'Expanded raw-milk access to all UDAF-inspected Utah grocery retailers, removing the farm-ownership requirement.', evidence:'Chief sponsor of HB 179 (2026).' },
  ]},
  leah_hansen: { fsId: 'leah_hansen', name: 'Leah Hansen', adds: [
    { topic:'Limited Government', icon:'🧹', pos:'support', issueKey:'gov_waste', issueStance:'support', text:'Campaigns on restrained government and deliberately limited her own legislative footprint as a check on government growth.' },
    { topic:'Foreign Land Ownership', icon:'🏡', pos:'support', issueKey:'property_rights', issueStance:'support', text:'Co-sponsored legislation restricting real-property purchases by foreign-adversary entities.', evidence:'Co-sponsored HB 291 (2026).' },
    { topic:'Property-Tax Transparency', icon:'🏡', pos:'support', issueKey:'property_tax', issueStance:'support', text:'Co-sponsored Truth-in-Taxation reform strengthening public notice before local property-tax increases.', evidence:'Co-sponsored HB 236 (2026).' },
  ]},
  lisa_shepherd: { fsId: 'lisa_shepherd', name: 'Lisa Shepherd', adds: [
    { topic:'Candidate Financial Disclosure', icon:'💸', pos:'support', issueKey:'campaign_finance', issueStance:'support', text:'Required conflict-of-interest and financial disclosures from local candidates.', evidence:'Sponsored HB 504 (2025).' },
    { topic:'State Sovereignty', icon:'🇺🇸', pos:'support', issueKey:'america_first', issueStance:'support', text:'Sponsored a State Sovereignty measure declaring the UN, WHO, and World Economic Forum have no legal authority over Utah.', evidence:'Sponsored HB 85 (2026).' },
    { topic:'Election Administration', icon:'🗳', pos:'support', issueKey:'reform_balance', issueStance:'support', text:'Sought to create an elected Secretary of State to oversee Utah elections, shifting oversight from the Lieutenant Governor.', evidence:'Sponsored HB 529 (2026).' },
  ]},
  logan_monson: { fsId: 'logan_monson', name: 'Logan Monson', adds: [
    { topic:'Rural Healthcare', icon:'🚑', pos:'support', issueKey:'health_rural', issueStance:'support', text:'A rural nurse administrator who expanded the rural-hospital physician loan-repayment program and reformed 340B drug-discount rules.', evidence:'Sponsored HB 356 (2026) and rural-hospital loan-repayment legislation.' },
    { topic:'Agriculture & Grazing', icon:'🌾', pos:'support', issueKey:'rural_ag', issueStance:'support', text:'A fifth-generation livestock producer who added local-government oversight before the state wildlife agency can acquire grazing permits.', evidence:'Sponsored HB 421 Grazing Amendments (2025).' },
    { topic:'First Responder Support', icon:'👮', pos:'support', issueKey:'back_police', issueStance:'support', text:'Repeatedly sponsored a volunteer first-responder tax credit to support rural emergency volunteers.', evidence:'Sponsored HB 275 (2025) / HB 159 (2026).' },
  ]},
  mike_kohler: { fsId: 'mike_kohler', name: 'Mike Kohler', adds: [
    { topic:'Local Land-Use Control', icon:'🏡', pos:'support', issueKey:'property_rights', issueStance:'support', text:'Opposes the developer-driven "preliminary municipality" route and state-forced development like Dakota Pacific, sponsoring legislation to end new ones and return land-use control to counties.', evidence:'Sponsored HB 592 (2026).' },
    { topic:'Self-Defense Reporting', icon:'⚖️', pos:'support', issueKey:'justice_balance', issueStance:'support', text:'Introduced a use-of-force reporting requirement for deadly force used in self-defense.', evidence:'Introduced HB 561 (2025).' },
    { topic:'Great Salt Lake Conservation', icon:'💧', pos:'support', issueKey:'enviro_balance', issueStance:'support', text:'Sought to boost municipal water conservation directed toward the shrinking Great Salt Lake.', evidence:'Sponsored HB 535 (2024).' },
  ]},
  r_neil_walter: { fsId: 'r_neil_walter', name: 'R. Neil Walter', adds: [
    { topic:'Consumer Labeling', icon:'🏦', pos:'support', issueKey:'econ_corp_account', issueStance:'support', text:'Required clear labeling of cell-cultured and plant-based alternative meat products.', evidence:'Prime sponsor of HB 138 (2025).' },
    { topic:'HOA & Homeowner Rights', icon:'🏡', pos:'support', issueKey:'property_rights', issueStance:'support', text:'Created a Homeowners\' Association Ombudsman office to strengthen homeowner rights and HOA governance.', evidence:'Prime sponsor of HB 217 (2025).' },
    { topic:'Whistleblower Protections', icon:'🔍', pos:'support', issueKey:'reform_balance', issueStance:'support', text:'Sponsored stronger retaliation protections for public employees who report wrongdoing.', evidence:'Sponsored HB 73 (2026).' },
  ]},
  rosalba_dominguez: { fsId: 'rosalba_dominguez', name: 'Rosalba Dominguez', adds: [
    { topic:'Renewable Energy & Water', icon:'🌱', pos:'support', issueKey:'climate_action', issueStance:'support', text:'Centers renewable energy and water conservation, sponsoring legislation to require disclosure of data-center water and energy use.', evidence:'Sponsored HB 585 (2026).' },
    { topic:'Families in Need', icon:'🍼', pos:'support', issueKey:'family_support', issueStance:'support', text:'Created a voluntary state Diapering Supplies Fund for families in need.', evidence:'Sponsored HB 547 (2025).' },
    { topic:'Women\'s Health', icon:'🏥', pos:'support', issueKey:'healthcare', issueStance:'support', text:'Sought to expand access to uterine-fibroid treatment as part of her women\'s-health focus.', evidence:'Sponsored HB 598 (2026).' },
  ]},
  rwinterton: { fsId: 'rwinterton', name: 'Ronald Winterton', adds: [
    { topic:'Rural Roads & Infrastructure', icon:'🚧', pos:'support', issueKey:'infrastructure', issueStance:'support', text:'Directed oil-and-gas tax revenue to impacted rural roads through a local impact-mitigation tax.', evidence:'Sponsored SB 207 (2025).' },
    { topic:'Natural Resources Management', icon:'🏔', pos:'support', issueKey:'lands_balance', issueStance:'support', text:'Modernized Utah\'s natural-resources operations and the Department of Natural Resources structure.', evidence:'Sponsored SB 149 (2025).' },
    { topic:'Mineral & Property Rights', icon:'🏡', pos:'support', issueKey:'property_rights', issueStance:'support', text:'Strengthened mineral-rights and eminent-domain protections for property owners.', evidence:'Sponsored SB 139 (2025).' },
  ]},
  sahara_hayes: { fsId: 'sahara_hayes', name: 'Sahara Hayes', adds: [
    { topic:'LGBTQ+ Rights', icon:'🏳️‍🌈', pos:'support', issueKey:'lgbtq_rights', issueStance:'support', text:'Lists protecting LGBTQ+ rights among her top legislative priorities.' },
    { topic:'Victim Privacy', icon:'⚖️', pos:'support', issueKey:'justice_balance', issueStance:'support', text:'Expanded privacy protections allowing crime victims to use their initials instead of full names in public court documents.', evidence:'Sponsored HB 450 (2025) and HB 102 (2026).' },
    { topic:'Student Athlete Protections', icon:'🎓', pos:'support', issueKey:'edu_college_cost', issueStance:'support', text:'Required universities to adopt policies against abusive coaching and expanded student-athlete NIL rights.', evidence:'Sponsored HB 479 (2025).' },
  ]},
  stewart_e_barlow: { fsId: 'stewart_e_barlow', name: 'Stewart E. Barlow', adds: [
    { topic:'Medical Workforce Pipeline', icon:'🚑', pos:'support', issueKey:'health_rural', issueStance:'support', text:'A practicing surgeon who widened the medical-workforce pipeline by expanding associate-physician licensing for new graduates to improve access to care.', evidence:'Sponsored HB 400 (2022) and HB 396 (2017).' },
    { topic:'Cultural & Antiquities Preservation', icon:'🏔', pos:'support', issueKey:'lands_preserve', issueStance:'support', text:'Directed a statewide campaign to protect Utah cultural and antiquities sites through education and training.', evidence:'Sponsored HB 388 (2025).' },
    { topic:'Health Policy Modernization', icon:'🏥', pos:'support', issueKey:'health_balance', issueStance:'support', text:'Serves on the House Health and Human Services Committee and modernized Utah\'s health statutes.', evidence:'Sponsored HB 282 HHS Modifications (2025).' },
  ]},

  // ──────────────────────── 4-position cohort ──────────────────────────────
  ann_millner: { fsId: 'amillner', name: 'Ann Millner', adds: [
    { topic:'Early Literacy', icon:'🍎', pos:'support', issueKey:'public_schools', issueStance:'support', text:'Required evidence-based early-literacy instruction and banned discredited reading practices to curb third-grade reading failure.', evidence:'Chief sponsor of SB 241 (2026).' },
    { topic:'Critical Minerals Policy', icon:'⛏', pos:'support', issueKey:'lands_energy', issueStance:'support', text:'Lists critical-minerals policy among her priorities as Economic Development chair, backing development of Utah\'s critical-mineral resources.' },
  ]},
  ariel_defay: { fsId: 'ariel_defay', name: 'Ariel Defay', adds: [
    { topic:'Motorcycle & Traffic Safety', icon:'🏍', pos:'support', issueKey:'infrastructure', issueStance:'support', text:'Improved motorcycle safety by increasing penalties for operating a motorcycle without an endorsement.', evidence:'Sponsored HB 234 (2025).' },
    { topic:'Human Trafficking Victims', icon:'🤝', pos:'support', issueKey:'back_police', issueStance:'support', text:'Lists human-trafficking victim protections among her legislative priorities alongside education and contracting accountability.' },
  ]},
  bridger_bolinder: { fsId: 'bridger_bolinder', name: 'Bridger Bolinder', adds: [
    { topic:'Critical Minerals & Brine', icon:'⛏', pos:'support', issueKey:'lands_energy', issueStance:'support', text:'Regulated Utah\'s brine-mining industry to unlock critical minerals responsibly under the Brine Conservation Act.', evidence:'Sponsored HB 478 (2025).' },
    { topic:'Rural Growth Management', icon:'🏗', pos:'support', issueKey:'housing_build', issueStance:'support', text:'Backs planning, infrastructure, and water measures to manage explosive growth in booming Tooele County responsibly.' },
  ]},
  david_shallenberger: { fsId: 'david_shallenberger', name: 'David Shallenberger', adds: [
    { topic:'Energy Efficiency', icon:'⚡', pos:'support', issueKey:'enviro_energy', issueStance:'support', text:'Required large public utilities to operate and annually report on energy-efficiency rebate programs.', evidence:'Sponsored HB 549 (2026).' },
    { topic:'Limited Taxation & Property', icon:'🏡', pos:'support', issueKey:'property_rights', issueStance:'support', text:'Lists limited taxation and property rights among his priorities and updated landowner-liability protections.', evidence:'Sponsored HB 98 Landowner Liability Amendments (2025).' },
  ]},
  don_ipson: { fsId: 'dipson', name: 'Don Ipson', adds: [
    { topic:'Colorado River & Water Supply', icon:'🚰', pos:'support', issueKey:'water_storage', issueStance:'support', text:'A longtime champion of securing Colorado River water for fast-growing Washington County, backing the Colorado River Authority of Utah and the Lake Powell Pipeline.', evidence:'Voted for HB 297 creating the Colorado River Authority (2021).' },
    { topic:'Law Enforcement Privacy', icon:'👮', pos:'support', issueKey:'back_police', issueStance:'support', text:'Shielded law-enforcement officers\' home addresses and personal information from public disclosure.', evidence:'Chief sponsor of SB 31 (2017).' },
  ]},
  doug_fiefia: { fsId: 'doug_fiefia', name: 'Doug Fiefia', adds: [
    { topic:'Frontier AI Transparency', icon:'🤖', pos:'support', issueKey:'tech_balance', issueStance:'support', text:'Argues the largest AI developers should be legally required to publish public safety and child-protection plans, with anti-retaliation protections for employees who report safety risks.', evidence:'Sponsored HB 286 (2026).' },
    { topic:'Inmate Healthcare Costs', icon:'💊', pos:'support', issueKey:'healthcare_market', issueStance:'support', text:'Set Medicare-based rates for inmate hospital care to control costs.', evidence:'Sponsored HB 321 (2026).' },
  ]},
  doug_owens: { fsId: 'doug_owens', name: 'Doug Owens', adds: [
    { topic:'Rooftop Solar Access', icon:'⚡', pos:'support', issueKey:'enviro_energy', issueStance:'support', text:'Protected homeowners\' right to install solar panels by raising the HOA vote threshold needed to prohibit installation.', evidence:'Sponsored HB 119 (2025).' },
    { topic:'Criminal-Justice Alternatives', icon:'🤝', pos:'support', issueKey:'justice_reform', issueStance:'support', text:'Backs sheriff\'s work programs letting eligible inmates do supervised public-works projects instead of jail time.', evidence:'Sponsored HB 136 (2025).' },
    { topic:'Child Influencer Protections', icon:'📱', pos:'support', issueKey:'privacy_rights', issueStance:'support', text:'Championed protections requiring earnings of children in monetized online content be set aside in trust, with a right to deletion at adulthood.', evidence:'Sponsored HB 322 (2025).' },
  ]},
  doug_welton: { fsId: 'doug_welton', name: 'Doug Welton', adds: [
    { topic:'Volunteer EMS Support', icon:'🚑', pos:'support', issueKey:'health_rural', issueStance:'support', text:'Expanded insurance-program protections for volunteer emergency medical service personnel.', evidence:'Sponsored HB 298 (2025).' },
    { topic:'Glass Recycling', icon:'🌱', pos:'support', issueKey:'enviro_balance', issueStance:'support', text:'Directed a state study to expand glass-recycling options.', evidence:'Sponsored HB 177 (2025).' },
  ]},
  emily_buss: { fsId: 'emily_buss', name: 'Emily Buss', adds: [
    { topic:'Government Transparency', icon:'🔍', pos:'support', issueKey:'gov_transparency', issueStance:'support', text:'Lists government transparency among her core priorities as an independent Forward Party legislator.' },
    { topic:'Bipartisan Governance', icon:'🤝', pos:'support', issueKey:'reform_balance', issueStance:'support', text:'Built her platform around bipartisan and third-party governance, charging impact fees that reflect the real cost of growth.' },
  ]},
  evan_vickers: { fsId: 'evickers', name: 'Evan Vickers', adds: [
    { topic:'Behavioral Health', icon:'🧠', pos:'support', issueKey:'health_mental', issueStance:'support', text:'Strengthened Utah\'s behavioral-health system and refined the state\'s medical-cannabis program as a pharmacist-legislator.', evidence:'Chief sponsor of SB 27 (2024) and SB 64 (2025).' },
    { topic:'Higher Education & SUU', icon:'🎓', pos:'support', issueKey:'edu_college_cost', issueStance:'support', text:'Secured capital funding for Southern Utah University and backs rural higher-education access.', evidence:'Credited in SUU\'s 2022 legislative recap for full capital funding.' },
  ]},
  grant_miller: { fsId: 'grant_miller', name: 'Grant Miller', adds: [
    { topic:'Court-Fine Reform', icon:'⚖️', pos:'support', issueKey:'justice_balance', issueStance:'support', text:'Lets courts reduce unpaid criminal fines for low-income defendants, easing undue financial burdens.', evidence:'Sponsored HB 383 (2025) and HB 94 (2026).' },
    { topic:'Indigent Defense Access', icon:'🤝', pos:'support', issueKey:'justice_reform', issueStance:'support', text:'Lists indigent defense and public-defender access among his core criminal-justice priorities.' },
  ]},
  jake_fitisemanu: { fsId: 'jake_fitisemanu', name: 'Jake Fitisemanu', adds: [
    { topic:'Medicare & Senior Benefits', icon:'👵', pos:'support', issueKey:'social_security', issueStance:'support', text:'Expanded access to Medicare-supplement insurance options for seniors.', evidence:'Sponsored HB 258 (2025), passed the House 73–0.' },
    { topic:'AAPI & Community Health Equity', icon:'🤝', pos:'support', issueKey:'healthcare', issueStance:'support', text:'A public-health professional and co-founder of the Utah Pacific Islander Health Coalition who works to improve community health equity.' },
  ]},
  jason_b_kyle: { fsId: 'jason_b_kyle', name: 'Jason B. Kyle', adds: [
    { topic:'Property & Farmland Taxes', icon:'🏡', pos:'support', issueKey:'property_tax', issueStance:'support', text:'Protected agricultural-land tax status for water-reducing landowners and simplified urban-farming property-tax renewals.', evidence:'Sponsored HB 520 (2024) and HB 208 (2025).' },
    { topic:'Election Integrity', icon:'🗳', pos:'support', issueKey:'election_integrity', issueStance:'support', text:'Backs election reform, including runoff elections and barring Utah from national popular-vote compacts.', evidence:'Sponsored HB 231 (2025) and HJR 5 (2025).' },
  ]},
  jill_koford: { fsId: 'jill_koford', name: 'Jill Koford', adds: [
    { topic:'Data-Center Water Transparency', icon:'💧', pos:'support', issueKey:'enviro_balance', issueStance:'support', text:'Required large data centers to disclose water use and coordinate with water suppliers.', evidence:'Sponsored HB 76 (2026).' },
    { topic:'Limited Government', icon:'🧹', pos:'support', issueKey:'gov_waste', issueStance:'support', text:'Lists small, limited government among her core governing priorities.' },
  ]},
  joseph_elison: { fsId: 'joseph_elison', name: 'Joseph Elison', adds: [
    { topic:'Anti-Gambling Enforcement', icon:'🎲', pos:'support', issueKey:'back_police', issueStance:'support', text:'Treated proposition betting as illegal gambling under Utah\'s constitutional ban.', evidence:'Sponsored HB 243 (2026).' },
    { topic:'State Fiscal Sovereignty', icon:'🇺🇸', pos:'support', issueKey:'america_first', issueStance:'support', text:'Established Utah\'s State Sovereignty Fund to build fiscal resilience and reduce federal dependency.', evidence:'Sponsored HB 464 (2025).' },
  ]},
  jerry_stevenson: { fsId: 'jstevenson', name: 'Jerry Stevenson', adds: [
    { topic:'Transportation & Roads', icon:'🚧', pos:'support', issueKey:'infrastructure', issueStance:'support', text:'A Davis County budget leader focused on transportation, roads, and UTA transit funding for his fast-growing region.' },
    { topic:'Alcohol-Law Modernization', icon:'🍺', pos:'support', issueKey:'reform_balance', issueStance:'support', text:'The Legislature\'s steady hand on alcohol policy, ending the "Zion Curtain" and raising the retail-beer alcohol cap.', evidence:'Sponsored the 2017 alcohol reform (HB 442) and 2019 SB 132.' },
  ]},
  katy_hall: { fsId: 'katy_hall', name: 'Katy Hall', adds: [
    { topic:'Healthcare Workforce & Safety', icon:'🏥', pos:'support', issueKey:'healthcare', issueStance:'support', text:'Set staffing and equipment standards for freestanding ERs and required hospital reporting of workplace-violence incidents.', evidence:'Sponsored HB 152 (2025) and HB 380 (2026).' },
    { topic:'Medical Malpractice Reform', icon:'⚖️', pos:'support', issueKey:'healthcare_market', issueStance:'support', text:'Reformed medical-malpractice liability, granting personal-asset immunity to insured physicians.', evidence:'Chief sponsor of HB 503 (2025).' },
    { topic:'Women\'s Health & Mammography', icon:'🎀', pos:'support', issueKey:'health_balance', issueStance:'support', text:'Updated mammography notification and quality-assurance standards.', evidence:'Chief sponsor of HB 146 (2025).' },
  ]},
  kirk_cullimore: { fsId: 'kcullimore', name: 'Kirk Cullimore', adds: [
    { topic:'Consumer Data Privacy', icon:'🔒', pos:'support', issueKey:'privacy_rights', issueStance:'support', text:'Authored the Utah Consumer Privacy Act and a first-in-the-nation AI-disclosure law, making Utah an early mover on data and AI rules.', evidence:'Chief sponsor of SB 227 (2022) and SB 149 (2024).' },
    { topic:'Public-Sector Bargaining', icon:'🛠', pos:'oppose', issueKey:'econ_workers', issueStance:'oppose', text:'Backed banning collective bargaining for public employees including police, firefighters, and teachers as Majority Leader.', evidence:'Shepherded HB 267 through the Senate (2025).' },
  ]},
  luz_escamilla: { fsId: 'lescamilla', name: 'Luz Escamilla', adds: [
    { topic:'Child Care Affordability', icon:'🧸', pos:'support', issueKey:'child_care', issueStance:'support', text:'Sought stronger child-care safety standards and startup grants to expand home-based child care.', evidence:'Sponsored SB 221 (2025) and SB 214 (2026).' },
    { topic:'Food Security & School Meals', icon:'🍎', pos:'support', issueKey:'family_support', issueStance:'support', text:'Sponsored universal free school meals for all K–12 students and dental care for uninsured children.', evidence:'Sponsored SB 173 (2025) and SB 285 (2026).' },
    { topic:'Anti-Poverty Work', icon:'🤝', pos:'support', issueKey:'gov_services', issueStance:'support', text:'A consistent champion of the state\'s data-driven, bipartisan Intergenerational Welfare Reform Commission.' },
  ]},
  lincoln_fillmore: { fsId: 'lfillmore', name: 'Lincoln Fillmore', adds: [
    { topic:'Housing Affordability', icon:'🏗', pos:'support', issueKey:'housing_build', issueStance:'support', text:'Favors loosening local land-use mandates to cut costs, exempting deed-restricted affordable homes from garage and parking requirements.', evidence:'Sponsored SB 181 (2025).' },
    { topic:'Ballot Initiative Reform', icon:'🗳', pos:'support', issueKey:'election_integrity', issueStance:'support', text:'Required fiscal-impact disclosure and publication for ballot initiatives and a supermajority vote for initiative tax increases.', evidence:'Sponsored SB 73 (2025) and SJR 2 (2025).' },
  ]},
  matt_macpherson: { fsId: 'matt_macpherson', name: 'Matt MacPherson', adds: [
    { topic:'Limited Government', icon:'🧹', pos:'support', issueKey:'gov_waste', issueStance:'support', text:'Lists limited government and fiscal restraint among his core priorities.' },
    { topic:'Public Health & Local Authority', icon:'🏥', pos:'support', issueKey:'health_balance', issueStance:'support', text:'Strengthened local health-department infectious-disease procedures.', evidence:'Sponsored HB 294 (2025).' },
  ]},
  mballard: { fsId: 'mballard', name: 'Melissa Ballard', adds: [
    { topic:'Clean-Vehicle Incentives', icon:'⚡', pos:'support', issueKey:'enviro_energy', issueStance:'support', text:'Created tax credits to incentivize clean hydrogen-fueled vehicles.', evidence:'Sponsored HB 223 (2021).' },
    { topic:'Government Efficiency', icon:'⚙️', pos:'support', issueKey:'reform_balance', issueStance:'support', text:'Let state agencies that demonstrate cost savings retain a share through government-efficiency incentives.', evidence:'Sponsored HB 317 (2025).' },
  ]},
  nicholeen_p_peck: { fsId: 'nicholeen_p_peck', name: 'Nicholeen P. Peck', adds: [
    { topic:'Limited Government', icon:'🧹', pos:'support', issueKey:'gov_waste', issueStance:'support', text:'Champions limited government and deliberately introduces few new laws, framing restraint as a check on government growth.' },
    { topic:'Family, Faith & State Sovereignty', icon:'⛪', pos:'support', issueKey:'religious_liberty', issueStance:'support', text:'Lists family, faith, and state sovereignty among her defining priorities.' },
    { topic:'Transgender Policy', icon:'🚻', pos:'oppose', issueKey:'lgbtq_rights', issueStance:'oppose', text:'Sought to bar public funding for gender-affirming care and protect employees who decline to use preferred pronouns.', evidence:'Sponsored HB 521 (2025) / HB 193 (2026) and HB 250 (2025) / HB 95 (2026).' },
  ]},
  rshipp: { fsId: 'rshipp', name: 'Rex Shipp', adds: [
    { topic:'Hunting & Wildlife', icon:'🦌', pos:'support', issueKey:'lands_balance', issueStance:'support', text:'Created a regulatory framework for hunting guides and outfitters.', evidence:'Sponsored HB 153 (2025).' },
    { topic:'Firearm Safety Education', icon:'🔫', pos:'support', issueKey:'gun_rights', issueStance:'support', text:'Mandated age-appropriate firearm-safety instruction in Utah public schools.', evidence:'Prime sponsor of HB 104 (2025).' },
  ]},
  stephanie_pitcher: { fsId: 'spitcher', name: 'Stephanie Pitcher', adds: [
    { topic:'AI in Law Enforcement', icon:'🤖', pos:'support', issueKey:'privacy_rights', issueStance:'support', text:'Required officers to disclose AI use in police reports and protected the privacy of autopsy images.', evidence:'Sponsored SB 180 (2025) and SB 82 (2025).' },
    { topic:'Juvenile Justice', icon:'🤝', pos:'support', issueKey:'justice_reform', issueStance:'support', text:'Expanded access to state-funded attorneys for juveniles and raised pay for compensatory community service.', evidence:'Sponsored SB 157 (2025) and SB 185 (2025).' },
    { topic:'Air Quality Enforcement', icon:'🌱', pos:'support', issueKey:'climate_action', issueStance:'support', text:'Backs tougher enforcement against drivers who evade vehicle emissions testing.', evidence:'Sponsored SB 208 (2026).' },
  ]},
  scott_sandall: { fsId: 'ssandall', name: 'Scott Sandall', adds: [
    { topic:'State Budget & Spending', icon:'⚖️', pos:'support', issueKey:'gov_balance', issueStance:'support', text:'As Senate vice chair of Executive Appropriations, holds a central role in setting Utah\'s budget, framed around fiscal responsibility and curbing wasteful spending.' },
    { topic:'Rural Broadband', icon:'📶', pos:'support', issueKey:'broadband', issueStance:'support', text:'Lists rural broadband among his priorities for northern Utah\'s farming and ranching communities.' },
  ]},
  stephen_l_whyte: { fsId: 'stephen_l_whyte', name: 'Stephen L. Whyte', adds: [
    { topic:'Municipal Land-Use Reform', icon:'🏗', pos:'support', issueKey:'property_rights', issueStance:'support', text:'Backs streamlining municipal land-use review and development agreements so housing projects move faster.', evidence:'Sponsored HB 368 Local Land Use Amendments (2025).' },
    { topic:'Private Postsecondary Oversight', icon:'🎓', pos:'support', issueKey:'edu_college_cost', issueStance:'support', text:'Modernized state oversight of private postsecondary institutions.', evidence:'Sponsored HB 97 (2025).' },
  ]},
  trevor_lee: { fsId: 'tlee', name: 'Trevor Lee', adds: [
    { topic:'Immigration & Public Benefits', icon:'🛡', pos:'support', issueKey:'border_security', issueStance:'support', text:'Sought to bar undocumented immigrants from a wide range of state benefits, aiming to pressure self-deportation.', evidence:'Sponsored HB 88 (2026).' },
    { topic:'Medical Freedom', icon:'🩺', pos:'support', issueKey:'medical_freedom', issueStance:'support', text:'Loosened Utah\'s vaccine rules and sought to let pharmacists dispense ivermectin over the counter, framing it as medical choice.', evidence:'Sponsored HB 84 (2025) and HB 96 (2025).' },
  ]},
  tracy_miller: { fsId: 'tracy_miller', name: 'Tracy Miller', adds: [
    { topic:'Child Tax Relief', icon:'🍼', pos:'support', issueKey:'family_support', issueStance:'support', text:'Expanded Utah\'s child tax credit by raising income-eligibility thresholds so thousands more working families qualify.', evidence:'Chief sponsor of HB 290 (2026).' },
    { topic:'Limited Government & Local Control', icon:'🧹', pos:'support', issueKey:'gov_waste', issueStance:'support', text:'Favors keeping government decisions close to the people and limiting spending.' },
  ]},
  walt_brooks: { fsId: 'walt_brooks', name: 'Walt Brooks', adds: [
    { topic:'Genetic Information Privacy', icon:'🔒', pos:'support', issueKey:'privacy_rights', issueStance:'support', text:'Lists genetic-information privacy among his priorities alongside HOA accountability and government transparency.' },
    { topic:'Limited Government', icon:'🧹', pos:'support', issueKey:'gov_waste', issueStance:'support', text:'Lists government transparency and limited government among his core governing priorities.' },
  ]},

  // ──────────────────────── 5-position cohort (one each) ───────────────────
  andrew_stoddard: { fsId: 'andrew_stoddard', name: 'Andrew Stoddard', adds: [
    { topic:'Firearm Safety', icon:'🦺', pos:'support', issueKey:'gun_safety', issueStance:'support', text:'Repeatedly sponsors secure-firearm-storage and machinegun-attachment bans, pledging to keep reintroducing safe-storage legislation.', evidence:'Sponsored HB 132 and HB 387 (2025).' },
    { topic:'Air Quality', icon:'🌱', pos:'support', issueKey:'climate_action', issueStance:'support', text:'Sponsored legislation requiring major halogen-emission sources along the Wasatch Front to adopt controls.', evidence:'Sponsored HB 420 (2025) and HB 220 (2023).' },
  ]},
  angela_romero: { fsId: 'aromero', name: 'Angela Romero', adds: [
    { topic:'Immigrant & Latino Communities', icon:'🤝', pos:'support', issueKey:'immigration_reform', issueStance:'support', text:'The leading progressive voice in the House, focused on equitable services for Salt Lake City\'s heavily Latino west side and immigrant families.' },
    { topic:'Labor Rights', icon:'🛠', pos:'support', issueKey:'econ_workers', issueStance:'support', text:'Lists labor rights among her core priorities as House Minority Leader.' },
  ]},
  brady_brammer: { fsId: 'brady_brammer', name: 'Brady Brammer', adds: [
    { topic:'Religious Accommodation', icon:'⛪', pos:'support', issueKey:'religious_liberty', issueStance:'support', text:'Backs requiring public universities to reasonably accommodate students\' religious beliefs in admissions, attendance, and exam scheduling.', evidence:'Co-sponsored SB 207 (2026).' },
    { topic:'Lobbying Transparency', icon:'🔍', pos:'support', issueKey:'gov_transparency', issueStance:'support', text:'Strengthened Utah\'s lobbying-disclosure requirements.', evidence:'Chief sponsor of SB 145 (2026).' },
  ]},
  calbrecht: { fsId: 'calbrecht', name: 'Carl Albrecht', adds: [
    { topic:'Nuclear & Energy Infrastructure', icon:'⚡', pos:'support', issueKey:'enviro_energy', issueStance:'support', text:'Laid the groundwork for Utah\'s nuclear-energy future, creating the Nuclear Energy Consortium and Utah Energy Council.', evidence:'Sponsored HB 249 (2025) and HB 124 (2024).' },
  ]},
  calvin_roberts: { fsId: 'calvin_roberts', name: 'Calvin Roberts', adds: [
    { topic:'Second Amendment Rights', icon:'🔫', pos:'support', issueKey:'gun_rights', issueStance:'support', text:'Clarified dangerous-weapons exemptions in state law in a bill that passed both chambers with no opposing votes.', evidence:'Sponsored HB 94 (2025).' },
    { topic:'Fuel-Tax Relief', icon:'💰', pos:'support', issueKey:'lower_taxes', issueStance:'support', text:'Cut Utah\'s motor-fuel tax rate while streamlining energy-infrastructure permitting.', evidence:'Sponsored HB 575 (2026).' },
  ]},
  carol_spackman_moss: { fsId: 'carol_spackman_moss', name: 'Carol Spackman Moss', adds: [
    { topic:'Affordable Housing', icon:'🏘', pos:'support', issueKey:'housing_support', issueStance:'support', text:'Sought to redirect a share of state liquor profits to the Olene Walker affordable-housing loan fund.', evidence:'Sponsored HB 286 (2025).' },
    { topic:'Native Heritage Protection', icon:'🪶', pos:'support', issueKey:'rights_balance', issueStance:'support', text:'Sponsored legislation to preserve and honor Native American remains and sites.', evidence:'Sponsored HB 11 (2025).' },
  ]},
  cmusselman: { fsId: 'cmusselman', name: 'Calvin Musselman', adds: [
    { topic:'Human Trafficking Laws', icon:'⚖️', pos:'support', issueKey:'justice_balance', issueStance:'support', text:'Strengthened Utah\'s human-trafficking, exploitation, and smuggling laws.', evidence:'Chief sponsor of SB 30 (2026).' },
  ]},
  candice_pierucci: { fsId: 'cpierucci', name: 'Candice Pierucci', adds: [
    { topic:'Immigration Enforcement', icon:'🛡', pos:'support', issueKey:'border_security', issueStance:'support', text:'Supports aligning Utah with federal deportation efforts, requiring sheriffs and Corrections to coordinate with immigration authorities before releasing unlawfully-present individuals.', evidence:'Sponsored HB 226 (2025).' },
    { topic:'Maternal & Infant Health', icon:'🍼', pos:'support', issueKey:'family_support', issueStance:'support', text:'Improved maternal and infant health outcomes and supported deaf, blind, and English-learner students.', evidence:'Sponsored HB 363, HB 537, and HB 42 (2025).' },
  ]},
  casey_snider: { fsId: 'csnider', name: 'Casey Snider', adds: [
    { topic:'Wildfire Resilience', icon:'🔥', pos:'support', issueKey:'disaster_resilience', issueStance:'support', text:'Consolidated Utah\'s wildfire-funding mechanism and required wildland-urban-interface risk mapping and county preparedness plans.', evidence:'Sponsored HB 307 and HB 48 (2025).' },
    { topic:'Firefighter Health', icon:'🚒', pos:'support', issueKey:'health_rural', issueStance:'support', text:'Expanded presumptive occupational-cancer protections for firefighters from four covered cancers to fifteen.', evidence:'Sponsored HB 65 (2025).' },
  ]},
  cwilson: { fsId: 'cwilson', name: 'Chris Wilson', adds: [
    { topic:'Behavioral Health Infrastructure', icon:'🧠', pos:'support', issueKey:'health_mental', issueStance:'support', text:'Funded a behavioral-health receiving center for Cache Valley.', evidence:'Sponsored HB 66 (2023).' },
  ]},
  dhinkins: { fsId: 'dhinkins', name: 'David Hinkins', adds: [
    { topic:'Newborn & Child Safety', icon:'🍼', pos:'support', issueKey:'family_support', issueStance:'support', text:'Expanded Utah\'s Newborn Safe Haven surrender window from 30 to 90 days.', evidence:'Sponsored SB 57 (2025).' },
  ]},
  heidi_balderree: { fsId: 'heidi_balderree', name: 'Heidi Balderree', adds: [
    { topic:'Charter & Public Education', icon:'🎓', pos:'support', issueKey:'school_choice', issueStance:'support', text:'Reformed charter-school funding and eligibility, establishing a study group and a revolving loan fund.', evidence:'Sponsored SB 186 and SB 131 (2026).' },
  ]},
  jason_thompson: { fsId: 'jason_thompson', name: 'Jason Thompson', adds: [
    { topic:'Overdose Prevention', icon:'🧠', pos:'support', issueKey:'health_mental', issueStance:'support', text:'Required overdose-recognition training in alcohol-education programs.', evidence:'Sponsored HB 361 (2025).' },
  ]},
  jennifer_dailey_provost: { fsId: 'jdailey', name: 'Jennifer Dailey-Provost', adds: [
    { topic:'End-of-Life Options', icon:'🕊', pos:'support', issueKey:'medical_freedom', issueStance:'support', text:'Sponsored an End of Life Options Act to let mentally competent, terminally ill adults obtain a life-ending prescription.', evidence:'Sponsored HB 74 (2022).' },
    { topic:'Disability Rights', icon:'♿', pos:'support', issueKey:'health_balance', issueStance:'support', text:'Expanded Medicaid eligibility for Utahns with disabilities and strengthened disability insurance coverage.', evidence:'Sponsored HB 310 (2025).' },
  ]},
  jon_hawkins: { fsId: 'jon_hawkins', name: 'Jon Hawkins', adds: [
    { topic:'Sports & Recreation', icon:'🏒', pos:'support', issueKey:'econ_growth', issueStance:'support', text:'Supported bringing an NHL franchise to Utah and protecting the state\'s Olympic legacy ahead of the 2034 Winter Games.', evidence:'Sponsored SJR 12 (2024) and HB 541 (2025).' },
  ]},
  karen_kwan: { fsId: 'karen_kwan', name: 'Karen Kwan', adds: [
    { topic:'Veterans & Military Families', icon:'🎖', pos:'support', issueKey:'veterans', issueStance:'support', text:'Sought discounted state-park access for all honorably discharged Utah veterans.', evidence:'Sponsored SB 114 (2025).' },
    { topic:'Child Protection', icon:'👮', pos:'support', issueKey:'back_police', issueStance:'support', text:'Broadened child-exploitation definitions and penalties.', evidence:'Sponsored SB 144 (2025).' },
  ]},
  kathleen_riebe: { fsId: 'kriebe', name: 'Kathleen Riebe', adds: [
    { topic:'Workers & Labor Rights', icon:'🛠', pos:'support', issueKey:'econ_workers', issueStance:'support', text:'A leading opponent of stripping collective-bargaining rights from teachers, firefighters, and police, arguing it harmed the public workforce.', evidence:'Opposed HB 267 (2025).' },
    { topic:'Student & Youth Health', icon:'🧠', pos:'support', issueKey:'health_mental', issueStance:'support', text:'Repeatedly sought to create an Office of Student Health Affairs and fund services for medically fragile students.', evidence:'Sponsored SB 141 (2025) and SB 135 (2025).' },
  ]},
  mark_strong: { fsId: 'mark_strong', name: 'Mark Strong', adds: [
    { topic:'County & Local Government', icon:'🏛', pos:'support', issueKey:'reform_balance', issueStance:'support', text:'Reformed county-government land-purchasing authority drawing on his local-governance focus.', evidence:'Sponsored HB 445 (2026).' },
  ]},
  mike_petersen: { fsId: 'mike_petersen', name: 'Mike Petersen', adds: [
    { topic:'Income Taxes', icon:'💰', pos:'support', issueKey:'lower_taxes', issueStance:'support', text:'Lists income-tax reduction among his core fiscal priorities as a limited-government conservative.' },
  ]},
  mike_mckell: { fsId: 'mmckell', name: 'Michael McKell', adds: [
    { topic:'Youth Mental Health', icon:'🧠', pos:'support', issueKey:'health_mental', issueStance:'support', text:'Expanded Utah\'s mental-health workforce by broadening therapist scopes of practice and creating a dedicated education and enforcement fund.', evidence:'Sponsored SB 48 (2025).' },
    { topic:'Government Transparency (GRAMA)', icon:'🔍', pos:'support', issueKey:'gov_transparency', issueStance:'support', text:'Overhauled Utah\'s public-records dispute process, replacing the State Records Committee with a new review structure.', evidence:'Sponsored SB 277 (2025).' },
  ]},
  nelson_abbott: { fsId: 'nelson_abbott', name: 'Nelson Abbott', adds: [
    { topic:'Guardianship & Disability Rights', icon:'♿', pos:'support', issueKey:'health_mental', issueStance:'support', text:'Created Utah\'s first statutory framework for supported decision-making and expanded the rights of people under guardianship.', evidence:'Sponsored HB 334 (2025).' },
  ]},
  nthurston: { fsId: 'nthurston', name: 'Norm Thurston', adds: [
    { topic:'Health Workforce Access', icon:'🚑', pos:'support', issueKey:'health_rural', issueStance:'support', text:'Let licensed paramedics and EMTs provide non-emergency medical services in clinics and community-paramedicine programs to improve rural access.', evidence:'Sponsored HB 14 (2025).' },
  ]},
  paul_a_cutler: { fsId: 'paul_a_cutler', name: 'Paul A. Cutler', adds: [
    { topic:'Artificial Intelligence Policy', icon:'🤖', pos:'support', issueKey:'tech_balance', issueStance:'support', text:'Advanced Utah\'s AI policy framework, broadening the state\'s AI regulatory sandbox.', evidence:'Chief sponsor of HB 320 (2026).' },
    { topic:'Clean Vehicles & Air Quality', icon:'🌱', pos:'support', issueKey:'climate_action', issueStance:'support', text:'Sought to reduce heavy-truck air pollution along the Wasatch Front by phasing out registration of older heavy-duty trucks.', evidence:'Sponsored HB 525 (2025).' },
  ]},
  rob_bishop: { fsId: 'rob_bishop', name: 'Rob Bishop', adds: [
    { topic:'Reduce Regulation on Teachers', icon:'🍎', pos:'support', issueKey:'edu_parental', issueStance:'support', text:'Names reducing regulations and central control over educators a priority on returning to the Utah House.' },
  ]},
  ray_ward: { fsId: 'rward', name: 'Ray Ward', adds: [
    { topic:'Residential Solar Access', icon:'⚡', pos:'support', issueKey:'enviro_energy', issueStance:'support', text:'Legalized affordable plug-in "balcony" solar devices up to 1,200 watts without utility fees, building in anti-islanding safety standards.', evidence:'Sponsored HB 340 (2025).' },
    { topic:'Adoptee Records Access', icon:'📄', pos:'support', issueKey:'rights_balance', issueStance:'support', text:'Gave adult adoptees the right to access their own birth and adoption records by default, removing the prior court-hearing requirement.', evidence:'Sponsored HB 129 (2025).' },
  ]},
  ryan_d_wilcox: { fsId: 'ryan_d_wilcox', name: 'Ryan D. Wilcox', adds: [
    { topic:'Digital Privacy & Fourth Amendment', icon:'🔒', pos:'support', issueKey:'privacy_rights', issueStance:'support', text:'Established an early warrant requirement for electronic device location data, a longstanding digital-privacy priority.', evidence:'Sponsored HB 128 (2014).' },
  ]},
  scott_chew: { fsId: 'scott_chew', name: 'Scott Chew', adds: [
    { topic:'Carbon Capture & CO2 Storage', icon:'⚡', pos:'support', issueKey:'lands_energy', issueStance:'support', text:'Enacted carbon-capture legislation establishing a CO2 Storage Fund and a fee-based regulatory framework.', evidence:'Sponsored HB 452 (2024).' },
  ]},
  steve_eliason: { fsId: 'seliason', name: 'Steve Eliason', adds: [
    { topic:'Homelessness Services', icon:'🏘', pos:'support', issueKey:'housing_support', issueStance:'support', text:'Reformed homeless-services oversight and camping rules to improve coordination of the state\'s response.', evidence:'Sponsored HB 505 (2025).' },
  ]},
  thomas_peterson: { fsId: 'thomas_peterson', name: 'Thomas Peterson', adds: [
    { topic:'Wildfire & Defensible Space', icon:'🔥', pos:'support', issueKey:'disaster_resilience', issueStance:'support', text:'Barred cities, counties, and HOAs from blocking defensible-space vegetation removal around homes.', evidence:'Chief sponsor of HB 215 (2026).' },
  ]},
  val_peterson: { fsId: 'val_peterson', name: 'Val Peterson', adds: [
    { topic:'State Budget & Fiscal Discipline', icon:'⚖️', pos:'support', issueKey:'gov_balance', issueStance:'support', text:'As House Executive Appropriations chair, leads the crafting of Utah\'s structurally balanced state budget with disciplined spending and reserves.' },
  ]},
  wayne_harper: { fsId: 'wharper', name: 'Wayne Harper', adds: [
    { topic:'Transit Governance', icon:'🚆', pos:'support', issueKey:'transit', issueStance:'support', text:'Restructured UTA and large transit-district governance and modernized Utah\'s transportation funding rules.', evidence:'Sponsored SB 174 and SB 195 (2025).' },
    { topic:'Senior Retirement Security', icon:'👵', pos:'support', issueKey:'social_security', issueStance:'support', text:'Reduced the Social Security income-tax burden on Utah seniors by raising phase-out thresholds.', evidence:'Sponsored SB 71 (2025).' },
  ]},
};

// Render one position object as an index.html line (6-space indent, matching file style).
function lineFor(c) {
  const esc = s => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const parts = [`topic:'${esc(c.topic)}'`, `icon:'${c.icon}'`, `pos:'${c.pos}'`,
    `issueKey:'${c.issueKey}'`, `issueStance:'${c.issueStance}'`, `text:'${esc(c.text)}'`];
  if (c.evidence) parts.push(`evidence:'${esc(c.evidence)}'`);
  if (c.source) parts.push(`source:{label:'${esc(c.source.label)}', url:'${esc(c.source.url)}'}`);
  return `      { ${parts.join(', ')} },`;
}

// ── Firestore helpers (REST) ─────────────────────────────────────────────────
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
async function patchDoc(id, fields) {
  const qs = Object.keys(fields).map(m => 'updateMask.fieldPaths=' + encodeURIComponent(m)).join('&');
  const body = { fields: {} }; for (const [k, v] of Object.entries(fields)) body.fields[k] = enc(v);
  const r = await fetch(`${BASE}/${id}?${qs}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`patch ${id}: HTTP ${r.status} — ${(await r.text()).slice(0, 200)}`);
}

// ── index.html in-place insertion ────────────────────────────────────────────
function patchHtml() {
  let html = readFileSync(HTML, 'utf8');
  let inserted = 0, touched = 0, created = 0;
  for (const [key, entry] of Object.entries(DATA)) {
    const block = entry.adds.map(lineFor).join('\n');
    const keyIdx = html.indexOf(`\n    ${key}: [`);
    if (keyIdx === -1) {
      if (entry.create) {
        // Insert a brand-new key just before the ISSUE_STANCE_DATA closing brace.
        const varIdx = html.indexOf('var ISSUE_STANCE_DATA = {');
        const closeIdx = html.indexOf('\n  };', varIdx);
        if (closeIdx === -1) { console.log(`  ✗ ${key}: ISSUE_STANCE_DATA close not found`); continue; }
        const newEntry = `\n    ${key}: [ // ${entry.name}\n${block}\n    ],`;
        html = html.slice(0, closeIdx) + newEntry + html.slice(closeIdx);
        created++; inserted += entry.adds.length;
        console.log(`  ✚ ${key}: created with ${entry.adds.length} positions`);
      } else {
        console.log(`  ✗ ${key}: array not found in ${HTML}`);
      }
      continue;
    }
    // Append before the array close line "    ]," following the key line.
    const closeRe = /\n    \],?(?=\n)/g;
    closeRe.lastIndex = keyIdx + 1;
    const m = closeRe.exec(html);
    if (!m) { console.log(`  ✗ ${key}: array close not found`); continue; }
    html = html.slice(0, m.index) + '\n' + block + html.slice(m.index);
    inserted += entry.adds.length; touched++;
    console.log(`  ✎ ${key}: +${entry.adds.length} positions`);
  }
  writeFileSync(HTML, html);
  console.log(`\nPatched ${HTML}: +${inserted} positions across ${touched + created} profiles (${created} newly created).`);
}

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  let profiles = 0, positions = 0;
  for (const e of Object.values(DATA)) { profiles++; positions += e.adds.length; }
  console.log(`Wave-5 issue-position depth pass: ${positions} positions across ${profiles} profiles.\n`);

  if (PATCH) patchHtml();

  if (APPLY) {
    let touched = 0, added = 0;
    for (const entry of Object.values(DATA)) {
      const doc = await getOne(entry.fsId);
      if (!doc) { console.log(`  ✗ ${entry.fsId}: not found`); continue; }
      const existing = (doc.stances && typeof doc.stances === 'object' && !Array.isArray(doc.stances)) ? doc.stances : {};
      const merged = Object.assign({}, existing); let fresh = 0;
      for (const c of entry.adds) { if (!(c.topic in merged)) fresh++; merged[c.topic] = c.text; }
      await patchDoc(entry.fsId, { stances: merged, updatedAt: STAMP });
      touched++; added += fresh;
      console.log(`  ✎ ${entry.fsId} (${entry.name}): +${fresh} new → ${Object.keys(merged).length} stances`);
    }
    console.log(`\nMirrored to Firestore: ${touched} profiles (${added} new stance entries).`);
  }

  if (!PATCH && !APPLY) console.log('No-op. Pass --patch (index.html) and/or --apply (Firestore).');
})();
