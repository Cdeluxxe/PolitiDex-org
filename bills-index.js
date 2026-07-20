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
window.PDX_BILLS_INDEX = [
  {
    number: 'H.R. 1', title: 'One Big Beautiful Bill Act', shortTitle: 'One Big Beautiful Bill Act',
    measureType: 'bill', chamber: 'house', congress: 119, status: 'enacted',
    primaryIssue: 'lower_taxes',
    issueKeys: ['lower_taxes', 'national_debt', 'cut_spending', 'healthcare', 'border_security',
      'climate_action', 'tax_middle_class', 'deportations', 'lands_energy', 'strong_defense',
      'energy_production', 'family_support', 'edu_college_cost', 'school_choice'],
    isOmnibus: true,
    source: { url: 'https://www.congress.gov/bill/119th-congress/house-bill/1', label: 'Congress.gov' }
  },
  {
    number: 'H.R. 29', title: 'Laken Riley Act', shortTitle: 'Laken Riley Act',
    measureType: 'bill', chamber: 'house', congress: 119, status: 'enacted',
    primaryIssue: 'deportations', issueKeys: ['deportations', 'border_security'], isOmnibus: true,
    source: { url: 'https://www.congress.gov/bill/119th-congress/house-bill/29', label: 'Congress.gov' }
  },
  {
    number: 'H.R. 26', title: 'Protecting American Energy Production Act', shortTitle: 'Protecting American Energy Production Act',
    measureType: 'bill', chamber: 'house', congress: 119, status: 'passed_house',
    primaryIssue: 'enviro_energy', issueKeys: ['enviro_energy', 'energy_production'], isOmnibus: true,
    source: { url: 'https://www.congress.gov/bill/119th-congress/house-bill/26', label: 'Congress.gov' }
  },
  {
    number: 'H.R. 1968', title: 'Full-Year Continuing Appropriations and Extensions Act, 2025', shortTitle: 'Full-Year Continuing Appropriations, 2025',
    measureType: 'bill', chamber: 'house', congress: 119, status: 'enacted',
    primaryIssue: 'gov_services',
    issueKeys: ['gov_services', 'strong_defense', 'cut_spending', 'national_debt'], isOmnibus: true,
    source: { url: 'https://www.congress.gov/bill/119th-congress/house-bill/1968', label: 'Congress.gov' }
  },
  {
    number: 'H.R. 22', title: 'Safeguard American Voter Eligibility (SAVE) Act', shortTitle: 'SAVE Act',
    measureType: 'bill', chamber: 'house', congress: 119, status: 'passed_house',
    primaryIssue: 'election_integrity',
    issueKeys: ['election_integrity', 'voter_id', 'voting_access'], isOmnibus: true,
    source: { url: 'https://www.congress.gov/bill/119th-congress/house-bill/22', label: 'Congress.gov' }
  },
  {
    number: 'H.Con.Res. 14', title: 'Establishing the congressional budget for fiscal year 2025', shortTitle: 'FY2025 Budget Resolution (reconciliation)',
    measureType: 'resolution', chamber: 'house', congress: 119, status: 'passed_senate',
    primaryIssue: 'national_debt',
    issueKeys: ['national_debt', 'cut_spending', 'lower_taxes'], isOmnibus: true,
    source: { url: 'https://www.congress.gov/bill/119th-congress/house-concurrent-resolution/14', label: 'Congress.gov' }
  },
  {
    number: 'H.J.Res. 25', title: 'Congressional disapproval of the IRS digital-asset broker reporting rule', shortTitle: 'CRA — repeal IRS DeFi broker rule',
    measureType: 'resolution', chamber: 'house', congress: 119, status: 'enacted',
    primaryIssue: 'gov_regulation',
    issueKeys: ['gov_regulation', 'tech_innovation'], isOmnibus: true,
    source: { url: 'https://www.congress.gov/bill/119th-congress/house-joint-resolution/25', label: 'Congress.gov' }
  }
];
