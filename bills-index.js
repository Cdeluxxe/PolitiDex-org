// PolitiDex — Bills/Legislation light index (Phase 1, Legislation browse).
// A tiny, inline, hand-verified subset of the measures already in the Voting Record
// database, used ONLY for instant first paint of the Digital Library's Legislation
// tab (mirroring the cmp-data.js light-index pattern). The moment the live
// GET /api/voting-record/measures response arrives, PDXBills swaps this out for the
// full, authoritative list — so this file is a paint hint, never the source of
// truth. Loaded on demand by pdx-lazy-data.js when the Legislation tab first opens.
//
// Each entry mirrors the compact card the /measures endpoint returns. `id` is
// intentionally omitted here (serial ids are DB-assigned and only known from the
// live response); cards from this inline set open via their canonical `source.url`.
// Fields and issue tags match the seed migrations exactly, so the chips are correct.
//
// `keywords` is an additive, search-only field (not rendered on the card). It feeds
// the All-Seeing-Eye haystack so a bill is reachable by the plain-language terms
// people actually type — topics, nicknames, key people, and provisions — beyond its
// formal title and issue tags. Nothing reads it except the search index build.
window.PDX_BILLS_INDEX = [
  {
    number: 'H.R. 1', title: 'One Big Beautiful Bill Act', shortTitle: 'One Big Beautiful Bill Act',
    measureType: 'bill', chamber: 'house', congress: 119, status: 'enacted',
    primaryIssue: 'lower_taxes',
    issueKeys: ['lower_taxes', 'national_debt', 'cut_spending', 'healthcare', 'border_security',
      'climate_action', 'tax_middle_class', 'deportations', 'lands_energy', 'strong_defense',
      'energy_production', 'family_support', 'edu_college_cost', 'school_choice'],
    isOmnibus: true,
    keywords: 'obbba one big beautiful bill reconciliation taxes tax cuts spending megabill omnibus budget medicaid border energy',
    source: { url: 'https://www.congress.gov/bill/119th-congress/house-bill/1', label: 'Congress.gov' }
  },
  {
    number: 'H.R. 29', title: 'Laken Riley Act', shortTitle: 'Laken Riley Act',
    measureType: 'bill', chamber: 'house', congress: 119, status: 'enacted',
    primaryIssue: 'deportations', issueKeys: ['deportations', 'border_security'], isOmnibus: true,
    keywords: 'laken riley immigration detention deportation border ICE crime immigrant',
    source: { url: 'https://www.congress.gov/bill/119th-congress/house-bill/29', label: 'Congress.gov' }
  },
  {
    number: 'H.R. 26', title: 'Protecting American Energy Production Act', shortTitle: 'Protecting American Energy Production Act',
    measureType: 'bill', chamber: 'house', congress: 119, status: 'passed_house',
    primaryIssue: 'enviro_energy', issueKeys: ['enviro_energy', 'energy_production'], isOmnibus: true,
    keywords: 'fracking hydraulic fracturing oil gas drilling energy production moratorium',
    source: { url: 'https://www.congress.gov/bill/119th-congress/house-bill/26', label: 'Congress.gov' }
  },
  {
    number: 'H.R. 1968', title: 'Full-Year Continuing Appropriations and Extensions Act, 2025', shortTitle: 'Full-Year Continuing Appropriations, 2025',
    measureType: 'bill', chamber: 'house', congress: 119, status: 'enacted',
    primaryIssue: 'gov_services',
    issueKeys: ['gov_services', 'strong_defense', 'cut_spending', 'national_debt'], isOmnibus: true,
    keywords: 'continuing resolution CR government shutdown funding appropriations spending FY2025 stopgap',
    source: { url: 'https://www.congress.gov/bill/119th-congress/house-bill/1968', label: 'Congress.gov' }
  },
  {
    number: 'H.R. 22', title: 'Safeguard American Voter Eligibility (SAVE) Act', shortTitle: 'SAVE Act',
    measureType: 'bill', chamber: 'house', congress: 119, status: 'passed_house',
    primaryIssue: 'election_integrity',
    issueKeys: ['election_integrity', 'voter_id', 'voting_access'], isOmnibus: true,
    keywords: 'save act voter registration proof of citizenship noncitizen voting elections voter id',
    source: { url: 'https://www.congress.gov/bill/119th-congress/house-bill/22', label: 'Congress.gov' }
  },
  {
    number: 'H.Con.Res. 14', title: 'Establishing the congressional budget for fiscal year 2025', shortTitle: 'FY2025 Budget Resolution (reconciliation)',
    measureType: 'resolution', chamber: 'house', congress: 119, status: 'passed_senate',
    primaryIssue: 'national_debt',
    issueKeys: ['national_debt', 'cut_spending', 'lower_taxes'], isOmnibus: true,
    keywords: 'budget resolution reconciliation fiscal year 2025 deficit debt spending instructions',
    source: { url: 'https://www.congress.gov/bill/119th-congress/house-concurrent-resolution/14', label: 'Congress.gov' }
  },
  {
    number: 'H.J.Res. 25', title: 'Congressional disapproval of the IRS digital-asset broker reporting rule', shortTitle: 'CRA — repeal IRS DeFi broker rule',
    measureType: 'resolution', chamber: 'house', congress: 119, status: 'enacted',
    primaryIssue: 'gov_regulation',
    issueKeys: ['gov_regulation', 'tech_innovation'], isOmnibus: true,
    keywords: 'crypto defi digital asset broker irs reporting cra congressional review act regulation blockchain',
    source: { url: 'https://www.congress.gov/bill/119th-congress/house-joint-resolution/25', label: 'Congress.gov' }
  },
  {
    number: 'S.J.Res. 37', title: 'Terminate the national emergency imposing tariffs on Canadian imports', shortTitle: 'Terminate the Canada tariff emergency',
    measureType: 'resolution', chamber: 'senate', congress: 119, status: 'passed_senate',
    primaryIssue: 'tariffs_authority',
    issueKeys: ['tariffs_authority', 'econ_trade', 'tariffs_prices'], isOmnibus: true,
    keywords: 'tariffs canada trade emergency ieepa import taxes prices trade war',
    source: { url: 'https://www.congress.gov/bill/119th-congress/senate-joint-resolution/37', label: 'Congress.gov' }
  },
  {
    number: 'S.J.Res. 59', title: 'Iran War Powers Resolution', shortTitle: 'Iran War Powers Resolution',
    measureType: 'resolution', chamber: 'senate', congress: 119, status: 'failed',
    primaryIssue: 'restraint',
    issueKeys: ['restraint', 'america_first_fp', 'strong_defense'], isOmnibus: true,
    keywords: 'iran war powers military force authorization foreign policy middle east strikes',
    source: { url: 'https://www.congress.gov/bill/119th-congress/senate-joint-resolution/59', label: 'Congress.gov' }
  },
  {
    number: 'S. 129', title: 'No Tax on Tips Act', shortTitle: 'No Tax on Tips Act',
    measureType: 'bill', chamber: 'senate', congress: 119, status: 'passed_senate',
    primaryIssue: 'tax_middle_class',
    issueKeys: ['tax_middle_class', 'cost_living', 'lower_taxes'], isOmnibus: true,
    keywords: 'no tax on tips tipped workers service workers taxes deduction wages cost of living',
    source: { url: 'https://www.congress.gov/bill/119th-congress/senate-bill/129', label: 'Congress.gov' }
  },
  {
    number: 'H.J.Res. 88', title: 'Congressional disapproval of the EPA waiver for California Advanced Clean Cars II (EV mandate)', shortTitle: 'CRA — repeal California EV mandate waiver',
    measureType: 'resolution', chamber: 'house', congress: 119, status: 'enacted',
    primaryIssue: 'climate_action',
    issueKeys: ['climate_action', 'energy_production', 'gov_regulation'], isOmnibus: true,
    keywords: 'ev mandate electric vehicles california clean cars epa waiver emissions cra congressional review',
    source: { url: 'https://www.congress.gov/bill/119th-congress/house-joint-resolution/88', label: 'Congress.gov' }
  },
  {
    number: 'H.J.Res. 89', title: 'Congressional disapproval of the EPA waiver for California Advanced Clean Trucks', shortTitle: 'CRA — repeal California clean-trucks waiver',
    measureType: 'resolution', chamber: 'house', congress: 119, status: 'enacted',
    primaryIssue: 'climate_action',
    issueKeys: ['climate_action', 'energy_production', 'gov_regulation'], isOmnibus: true,
    keywords: 'clean trucks california epa waiver diesel emissions trucking cra congressional review',
    source: { url: 'https://www.congress.gov/bill/119th-congress/house-joint-resolution/89', label: 'Congress.gov' }
  },
  {
    number: 'H.R. 7567', title: 'Farm, Food, and National Security Act (2026 Farm Bill, House)', shortTitle: '2026 Farm Bill (House)',
    measureType: 'bill', chamber: 'house', congress: 119, status: 'introduced',
    primaryIssue: 'rural_ag',
    issueKeys: ['rural_ag', 'family_support', 'enviro_balance', 'econ_corp_account', 'property_rights'], isOmnibus: true,
    keywords: 'farm bill 2026 farm food and national security act agriculture farmers crop insurance commodity ' +
      'reference prices snap nutrition food stamps conservation rural pesticide liability pesticide shield ' +
      'failure to warn state preemption local preemption sections 10205 10206 10207 pingree luna massie ' +
      'bipartisan amendment reauthorization',
    source: { url: 'https://www.congress.gov/bill/119th-congress/house-bill/7567', label: 'Congress.gov' }
  },
  {
    number: 'H.R. 471', title: 'Fix Our Forests Act', shortTitle: 'Fix Our Forests Act',
    measureType: 'bill', chamber: 'house', congress: 119, status: 'passed_house',
    primaryIssue: 'disaster_resilience',
    issueKeys: ['disaster_resilience', 'lands_balance', 'gov_regulation', 'enviro_balance'], isOmnibus: false,
    keywords: 'fix our forests act wildfire forest management fireshed hazardous fuels thinning nepa environmental review ' +
      'litigation public lands forest service westerman catastrophic wildfire prevention',
    source: { url: 'https://www.congress.gov/bill/119th-congress/house-bill/471', label: 'Congress.gov' }
  },
  {
    number: 'H.R. 1526', title: 'No Rogue Rulings Act of 2025', shortTitle: 'No Rogue Rulings Act (NORRA)',
    measureType: 'bill', chamber: 'house', congress: 119, status: 'passed_house',
    primaryIssue: 'gov_balance',
    issueKeys: ['gov_balance', 'reform_balance', 'democracy_balance'], isOmnibus: false,
    keywords: 'no rogue rulings act norra nationwide injunction universal injunction activist judges district court ' +
      'separation of powers three judge panel issa executive power courts',
    source: { url: 'https://www.congress.gov/bill/119th-congress/house-bill/1526', label: 'Congress.gov' }
  },
  {
    number: 'S. 331', title: 'Halt All Lethal Trafficking of Fentanyl Act', shortTitle: 'HALT Fentanyl Act',
    measureType: 'bill', chamber: 'senate', congress: 119, status: 'enacted',
    primaryIssue: 'immig_fentanyl',
    issueKeys: ['immig_fentanyl', 'tough_on_crime', 'health_mental'], isOmnibus: false,
    keywords: 'halt fentanyl act schedule I controlled substances fentanyl related substances analogues overdose ' +
      'mandatory minimum cassidy grassley heinrich public law 119-26 drug enforcement opioid',
    source: { url: 'https://www.congress.gov/bill/119th-congress/senate-bill/331', label: 'Congress.gov' }
  },
  {
    number: 'H.R. 82', title: 'Social Security Fairness Act of 2023', shortTitle: 'Social Security Fairness Act',
    measureType: 'bill', chamber: 'house', congress: 118, status: 'enacted',
    primaryIssue: 'social_security',
    issueKeys: ['social_security', 'cost_living', 'national_debt'], isOmnibus: false,
    keywords: 'social security fairness act wep gpo windfall elimination provision government pension offset ' +
      'teachers firefighters police public sector retirees benefits repeal collins graves spanberger enacted',
    source: { url: 'https://www.congress.gov/bill/118th-congress/house-bill/82', label: 'Congress.gov' }
  },
  {
    number: 'H.R. 1048', title: 'DETERRENT Act', shortTitle: 'DETERRENT Act',
    measureType: 'bill', chamber: 'house', congress: 119, status: 'passed_house',
    primaryIssue: 'gov_transparency',
    issueKeys: ['gov_transparency', 'america_first', 'edu_balance', 'free_speech'], isOmnibus: false,
    keywords: 'deterrent act foreign gifts universities higher education section 117 disclosure china iran ' +
      'north korea russia endowment title iv baumgartner campus foreign influence transparency',
    source: { url: 'https://www.congress.gov/bill/119th-congress/house-bill/1048', label: 'Congress.gov' }
  },
  {
    number: 'H.R. 1919', title: 'Anti-CBDC Surveillance State Act', shortTitle: 'Anti-CBDC Surveillance State Act',
    measureType: 'bill', chamber: 'house', congress: 119, status: 'passed_house',
    primaryIssue: 'privacy_rights',
    issueKeys: ['privacy_rights', 'gov_balance', 'tech_balance'], isOmnibus: false,
    keywords: 'anti cbdc surveillance state act central bank digital currency federal reserve digital dollar ' +
      'financial privacy emmer crypto week retail accounts',
    source: { url: 'https://www.congress.gov/bill/119th-congress/house-bill/1919', label: 'Congress.gov' }
  },
  {
    number: 'H.R. 3633', title: 'Digital Asset Market Clarity Act of 2025', shortTitle: 'CLARITY Act',
    measureType: 'bill', chamber: 'house', congress: 119, status: 'passed_house',
    primaryIssue: 'tech_innovation',
    issueKeys: ['tech_innovation', 'gov_regulation', 'econ_growth'], isOmnibus: false,
    keywords: 'clarity act digital asset market structure crypto cryptocurrency cftc sec regulation ' +
      'french hill thompson crypto week blockchain digital commodity',
    source: { url: 'https://www.congress.gov/bill/119th-congress/house-bill/3633', label: 'Congress.gov' }
  }
];
