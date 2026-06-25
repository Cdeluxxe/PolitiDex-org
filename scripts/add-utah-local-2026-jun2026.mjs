#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — Utah LOCAL races, first pass: county Sheriff + County Commission
// in the larger Wasatch Front counties (June 2026, after the June 23 primary)
//
// Scope discipline (mirrors the federal expansion strategy): only author a race
// where the November 2026 nominee is CONFIRMED or all-but-confirmed after the
// June 23, 2026 primary. Anything still genuinely too close to call is deferred
// until canvass, NOT authored to a low-quality stub.
//
// CONFIRMED / authored here (8 profiles across Weber, Salt Lake, Utah counties):
//   SHERIFF
//     • Weber County — Ryan Arbon (R, incumbent), unopposed → 3rd term.
//     • Salt Lake County — Rosie Rivera (D, incumbent) vs Shane Manwaring (R
//       nominee). The marquee competitive local race on the Wasatch Front.
//     • Utah County — Mike Smith (R, incumbent), no June primary opponent.
//   COUNTY COMMISSION
//     • Utah County Seat A — Michelle Kaufusi (R), won the GOP primary 55.7%.
//     • Utah County Seat B — David Spencer (R), won a 3-way GOP primary 42.1%.
//     • Weber County Seat B — Jon Beesley (R), beat the incumbent 54.8%; no
//       other party filed, so the primary effectively decided the seat.
//     • Weber County Seat A — Duane Kearsley (R), won a 4-way GOP primary 30.1%
//       for the open seat (Gage Froerer retiring); faces a Democrat and a
//       Forward Party candidate in November.
//
// DEFERRED on purpose (documented in the run summary, not authored yet):
//   • Davis County Sheriff — Jon Atkin led Aaron Perry by 237 votes (50.32% /
//     49.68%) with mail ballots still counting. Too close to call.
//   • Davis County Commission Seat B — incumbent Lorene Kamalu led Susan Lee by
//     42 votes (50.06% / 49.94%). Too close to call.
//   • Davis County Commission Seat A — Kendalyn Harris led a 3-way race but is
//     thinly documented; held for a Davis-focused pass.
//
// Every record is authored to the same bar as the state/federal roster:
//   • a real, sourced biography (no placeholders);
//   • keyIssues + structured issue stances, each keyed to an exact ISSUE_MAP
//     issueKey (validated below against the live 86-key vocabulary in
//     index.html) so the profile lights up Stance at a Glance, the Evidence
//     Locker issue labels, the People's Mandate bridge, and the Alignment Tool;
//   • the candidate-status system: every nominee here advanced to (or is the
//     incumbent on) the November ballot, so each carries candidacyStatus
//     'active'.
//
// CLASSIFICATION (mirrors index.html office/candidate handling):
//   • A sitting officeholder seeking re-election to the SAME seat is an
//     officeholder (no "Nominee" tag, no rank). → Arbon, Rivera, Smith
//   • Anyone running for an office they do NOT currently hold is a 2026 nominee
//     (rank 'nominee'; office text contains "Nominee"). → Manwaring, Kaufusi,
//     Spencer, Beesley, Kearsley
//
// Promises: forward-looking pledges are 'pending'. A promise is 'kept' ONLY when
// it maps to a documented, completed action with a citation (a deployed program,
// a passed resolution, a finished reform) — never a campaign aspiration. Scores
// reflect record DEPTH for the office being sought, not approval.
//
// CONTENT_STYLE.md: every line describes what THIS individual did, said, or
// pledges — never their party. Vote tallies/outcomes are stated as plain facts.
//
//   node scripts/add-utah-local-2026-jun2026.mjs            # dry run + issueKey validation
//   node scripts/add-utah-local-2026-jun2026.mjs --emit     # write index.html ISSUE_STANCE_DATA block to /tmp
//   node scripts/add-utah-local-2026-jun2026.mjs --apply    # create docs in Firestore
//
// Idempotent: a record that already exists is skipped (never clobbered) unless
// --force is passed.
// ---------------------------------------------------------------------------

import { writeFileSync } from 'fs';

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const EMIT  = process.argv.includes('--emit');
const FORCE = process.argv.includes('--force');
const STAMP = '2026-06-25T00:00:00.000Z';

// Convenience source builders.
const bp = (slug, label) => ({ label: label || 'Ballotpedia', url: `https://ballotpedia.org/${slug}` });

// ── The roster ──────────────────────────────────────────────────────────────
// status: 'office' (sitting, re-election) | 'candidate' (nominee for a new seat)
// positions[] become both the ISSUE_STANCE_DATA cards AND the Firestore `stances`
// mirror; promises[] drive kept/broken/pending + the Promise Score.
const PEOPLE = [

  // ══════════════════ WEBER COUNTY — Sheriff ══════════════════
  {
    id: 'ryan_arbon',
    name: 'Ryan Arbon',
    status: 'office',
    office: '🛡 Sheriff — Weber County, Utah',
    icon: '🛡',
    party: 'Republican',
    state: 'Utah',
    candidacyStatus: 'active',
    nextElection: '2026-11-03',
    score: 63,
    why: 'Sheriff of Utah’s fourth-largest county since 2018, running unopposed for a third term — the chief law-enforcement officer for roughly 270,000 residents.',
    bio: 'Ryan Arbon was elected Weber County Sheriff in November 2018 and is running unopposed for a third four-year term in 2026. Before leading the office he worked as a bailiff for the Weber County Sheriff’s Office, served as a state marshal in Missouri while earning a bachelor’s degree in criminal justice, spent 14 years with the Clearfield City Police Department in several supervisory roles, and was appointed chief of police of Perry City in 2016. He has also run businesses in property development, management, and construction. He says he runs because “law enforcement is what I love to do.”',
    keyIssues: ['Public Safety', 'County Jail & Corrections', 'Backing Deputies', 'Efficient Operations'],
    positions: [
      { topic: 'Backing Deputies & Public Safety', icon: '👮', pos: 'support', issueKey: 'back_police', issueStance: 'support', text: 'A career law-enforcement officer who centers protecting residents and supporting his deputies, saying “law enforcement is what I love to do. I enjoy protecting and ensuring citizens’ rights.”', evidence: 'Rose from Weber County bailiff to Clearfield City PD supervisor and Perry City police chief before being elected sheriff in 2018.', source: { label: 'Weber County Elections', url: 'https://www.weberelections.gov/listofcandidates' } },
      { topic: 'Running the County Jail', icon: '⚖️', pos: 'support', issueKey: 'justice_balance', issueStance: 'support', text: 'As sheriff, oversees the Weber County Jail and the county’s corrections and court-security operations.', source: { label: 'Weber County', url: 'https://www.webercountyutah.gov/County_Commission/' } },
      { topic: 'Business-Minded Operations', icon: '🧹', pos: 'support', issueKey: 'gov_waste', issueStance: 'support', text: 'Brings a private-sector background in property development, management, and construction to running a countywide budget and workforce.', source: { label: 'PoliticIt', url: 'https://politicit.com/weber-county-sheriff-ryan-arbon/' } },
      { topic: 'Experienced Public-Safety Leadership', icon: '🏛', pos: 'support', issueKey: 'gov_services', issueStance: 'support', text: 'Points to two decades of municipal and county policing — bailiff, 14 years at Clearfield PD, and Perry City police chief — as the experience to run a countywide office.', source: { label: 'PoliticIt', url: 'https://politicit.com/weber-county-sheriff-ryan-arbon/' } },
    ],
    promises: [
      { title: 'Keep protecting residents and supporting deputies as sheriff', detail: 'Re-elected on a public-safety platform centered on backing deputies and protecting citizens’ rights.', verdict: 'pending', issueKey: 'back_police', sources: ['https://www.weberelections.gov/listofcandidates'] },
      { title: 'Run the sheriff’s office with a frugal, business-minded approach', detail: 'Pledges to bring his private-sector management experience to the office’s budget and operations.', verdict: 'pending', issueKey: 'gov_waste', sources: ['https://politicit.com/weber-county-sheriff-ryan-arbon/'] },
    ],
    accountability: { overallScore: 63, summary: 'A two-term incumbent sheriff with a clear public-safety record but a lightly documented public issue platform; running unopposed for re-election.' },
  },

  // ══════════════════ SALT LAKE COUNTY — Sheriff (D incumbent) ══════════════════
  {
    id: 'rosie_rivera',
    name: 'Rosie Rivera',
    status: 'office',
    office: '🛡 Sheriff — Salt Lake County, Utah',
    icon: '🛡',
    party: 'Democrat',
    state: 'Utah',
    candidacyStatus: 'active',
    nextElection: '2026-11-03',
    score: 70,
    quote: 'I believe in transparency, accountability and public trust.',
    why: 'The first woman and first Latina elected sheriff in Utah, running the state’s largest jail and court-security operation; her treatment-first approach to corrections is on the ballot against a law-and-order challenger.',
    bio: 'Rosie Rivera was sworn in as Salt Lake County Sheriff on August 15, 2017, the first woman elected sheriff in Utah. She began her law-enforcement career in 1993 and rose through the ranks — officer, detective, sergeant, lieutenant, and deputy chief — before becoming sheriff, winning election in 2018 and re-election in 2022. She oversees roughly 1,100 employees and the largest jail and Court Security Bureau in the state. In 2024 her office separated from the Unified Police Department to refocus on the county jail and law enforcement. She is seeking re-election in 2026 against Republican nominee Shane Manwaring.',
    keyIssues: ['Public Safety & Violent Crime', 'Jail Operations', 'Treatment & Mental Health', 'Transparency'],
    positions: [
      { topic: 'Violent Crime, Gangs & Drugs', icon: '👮', pos: 'support', issueKey: 'back_police', issueStance: 'support', text: 'Says law enforcement must take a strong role against rising violent, gang, and drug crime, and backs the Metro Gang Unit’s work in the Salt Lake Valley.', source: { label: 'Salt Lake County', url: 'https://www.saltlakecounty.gov/sheriff/rosie-rivera/' } },
      { topic: 'Alternatives to Incarceration', icon: '🤝', pos: 'support', issueKey: 'justice_reform', issueStance: 'support', text: 'Addresses jail overcrowding by expanding alternatives to incarceration, pretrial release, and treatment, noting most people booked into jail return to the community.', source: { label: 'Salt Lake County', url: 'https://www.saltlakecounty.gov/sheriff/rosie-rivera/' } },
      { topic: 'Treatment in the Jail', icon: '🧠', pos: 'support', issueKey: 'health_mental', issueStance: 'support', text: 'Brought Medically Assisted Treatment (MAT) into the county jail and supports drug and mental-health treatment and prevention.', evidence: 'Serves on the Salt Lake County Opioid Task Force and the Metro Narcotics Task Force Advisory Board.', source: { label: 'Salt Lake County', url: 'https://www.saltlakecounty.gov/sheriff/rosie-rivera/' } },
      { topic: 'Transparency & Accountable Budgeting', icon: '🔍', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support', text: 'Centers transparency in law enforcement and what she calls a “transparent and fiscally responsible” approach to the office’s budget.', source: { label: 'Salt Lake County', url: 'https://www.saltlakecounty.gov/sheriff/rosie-rivera/' } },
      { topic: 'Running the State’s Largest Jail', icon: '⚖️', pos: 'support', issueKey: 'justice_balance', issueStance: 'support', text: 'Oversees the largest jail and Court Security Bureau in Utah and led the office’s 2024 separation from Unified Police to refocus on county corrections and law enforcement.', source: { label: 'KUTV', url: 'https://kutv.com/news/local/sheriff-rivera-wins-re-election-but-could-lose-power-over-unified-police' } },
      { topic: 'Domestic Violence & Vulnerable Victims', icon: '⚖️', pos: 'support', issueKey: 'rights_balance', issueStance: 'support', text: 'Advocates for domestic-violence and sexual-assault survivors and mentors gang-involved youth, and has worked to build a more diverse office.', evidence: 'Serves on the Family Justice Center Advisory Board.', source: { label: 'Salt Lake County', url: 'https://www.saltlakecounty.gov/sheriff/rosie-rivera/' } },
    ],
    promises: [
      { title: 'Bring Medically Assisted Treatment into the county jail', detail: 'Introduced MAT for inmates as part of a treatment-first approach to addiction in the jail.', verdict: 'kept', issueKey: 'health_mental', sources: ['https://www.saltlakecounty.gov/sheriff/rosie-rivera/'] },
      { title: 'Separate the Sheriff’s Office from Unified Police', detail: 'Completed the 2024 transition that re-established the county’s own law-enforcement operations alongside the jail.', verdict: 'kept', issueKey: 'justice_balance', sources: ['https://kutv.com/news/local/sheriff-rivera-wins-re-election-but-could-lose-power-over-unified-police'] },
      { title: 'Keep expanding alternatives to incarceration', detail: 'Pledges to keep growing pretrial release, treatment, and prevention programs to reduce jail overcrowding.', verdict: 'pending', issueKey: 'justice_reform', sources: ['https://www.saltlakecounty.gov/sheriff/rosie-rivera/'] },
    ],
    accountability: { overallScore: 70, summary: 'A multi-term incumbent sheriff with a deep, documented record on jail treatment programs, the Unified Police separation, and transparency; running for re-election.' },
  },

  // ══════════════════ SALT LAKE COUNTY — Sheriff (R nominee) ══════════════════
  {
    id: 'shane_manwaring',
    name: 'Shane Manwaring',
    status: 'candidate',
    rank: 'nominee',
    office: '🛡 Sheriff — Salt Lake County, Utah · 2026 Republican Nominee',
    icon: '🛡',
    party: 'Republican',
    state: 'Utah',
    candidacyStatus: 'active',
    nextElection: '2026-11-03',
    score: 55,
    why: 'A police lieutenant and National Guard colonel challenging a long-serving incumbent with a law-and-order, jail-focused platform — the Republican side of the Wasatch Front’s most competitive local race.',
    bio: 'Shane Manwaring is the Republican nominee for Salt Lake County Sheriff, winning the 2026 county GOP nominating convention 731–383 (66%) over Nicholas Roberts. He began his career in 2003 as a deputy with the Salt Lake County Sheriff’s Office; after the law-enforcement bureau became the Unified Police Department in 2010, he served as a fugitive detective on the U.S. Marshals violent-fugitive task force, a traffic officer, and a patrol supervisor, and was promoted to lieutenant in 2020, serving as an executive officer across the Taylorsville and Magna precincts, Technical Services, and Watch Command. He commissioned in the Utah Army National Guard in 1999 as an aviation officer, flew the AH-64 Apache, and rose to colonel; his decorations include the Legion of Merit and a Bronze Star. He challenges incumbent Rosie Rivera in November.',
    keyIssues: ['Law & Order', 'County Jail', 'Government Efficiency', 'Military Service'],
    positions: [
      { topic: 'Enforce the Law, Back Officers', icon: '👮', pos: 'support', issueKey: 'back_police', issueStance: 'support', text: 'Says the Sheriff’s Office exists to protect law-abiding citizens and hold offenders accountable, and pledges to “crack down on crime.”', source: { label: 'Campaign', url: 'https://www.shane4sheriff.com/meet-shane' } },
      { topic: 'Jail Operations & Capacity', icon: '⚖️', pos: 'support', issueKey: 'justice_balance', issueStance: 'support', text: 'Centers strengthening Salt Lake County Jail operations and expanding capacity so inmates are housed “safely, securely, and with dignity.”', source: { label: 'Campaign', url: 'https://www.shane4sheriff.com/meet-shane' } },
      { topic: 'Government Efficiency', icon: '🧹', pos: 'support', issueKey: 'gov_waste', issueStance: 'support', text: 'Runs on government efficiency and “servant leadership” in the sheriff’s office.', source: { label: 'Campaign', url: 'https://www.shane4sheriff.com/meet-shane' } },
      { topic: 'Military Service & Veterans', icon: '🎖', pos: 'support', issueKey: 'veterans', issueStance: 'support', text: 'A colonel in the Utah Army National Guard and decorated Apache pilot whose service shapes his leadership pitch.', evidence: 'Decorations include the Legion of Merit, a Bronze Star, and the Master Aviator badge.', source: { label: 'Campaign', url: 'https://www.shane4sheriff.com/meet-shane' } },
    ],
    promises: [
      { title: 'Crack down on crime as sheriff', detail: 'Campaigns on enforcing the law and holding offenders accountable to put public safety first.', verdict: 'pending', issueKey: 'back_police', sources: ['https://www.shane4sheriff.com/meet-shane'] },
      { title: 'Strengthen and expand the county jail', detail: 'Pledges to improve jail operations and add capacity so inmates are housed safely and securely.', verdict: 'pending', issueKey: 'justice_balance', sources: ['https://www.shane4sheriff.com/meet-shane'] },
      { title: 'Bring government efficiency to the office', detail: 'Promises a leaner, more efficient sheriff’s office built on servant leadership.', verdict: 'pending', issueKey: 'gov_waste', sources: ['https://www.shane4sheriff.com/meet-shane'] },
    ],
    accountability: { overallScore: 55, summary: 'A first-time countywide candidate with a long policing and military record but no elected record yet; every campaign pledge is forward-looking and pending.' },
  },

  // ══════════════════ UTAH COUNTY — Sheriff ══════════════════
  {
    id: 'mike_smith_sheriff',
    name: 'Mike Smith',
    status: 'office',
    office: '🛡 Sheriff — Utah County, Utah',
    icon: '🛡',
    party: 'Republican',
    state: 'Utah',
    candidacyStatus: 'active',
    nextElection: '2026-11-03',
    score: 72,
    why: 'A two-term sheriff who led the response to the high-profile September 2025 UVU shooting and runs on deputy wellness, transparency, and constitutional-rights advocacy; no primary opponent in 2026.',
    bio: 'Mike Smith was elected Utah County Sheriff in 2018 and is serving his second term, running for re-election in 2026 with no opponent in the June Republican primary. A Pleasant Grove native, he joined the Pleasant Grove Police Department in 1994, served 18 years on the Utah County Metro SWAT team, and was appointed Pleasant Grove chief of police in 2012 before his election. He graduated from the FBI National Academy in 2011 and is a past president of the Utah Sheriffs’ Association. In September 2025 he led the multi-agency response to the fatal shooting of commentator Charlie Kirk at Utah Valley University, with a suspect apprehended within days. He has been named the Utah Sheriffs’ Association “Sheriff of the Year” and “Lawman of the Year” multiple times.',
    keyIssues: ['Public Safety', 'Deputy Wellness', 'Second Amendment', 'Transparency', 'Rehabilitation'],
    positions: [
      { topic: 'Backing Deputies & Community Safety', icon: '👮', pos: 'support', issueKey: 'back_police', issueStance: 'support', text: 'A 31-year law-enforcement veteran who centers community safety and partnerships; led Utah County’s response to the September 2025 fatal shooting at UVU.', source: { label: 'Campaign', url: 'https://www.mikesmith.vote/' } },
      { topic: 'Deputy Wellness & Mental Health', icon: '🧠', pos: 'support', issueKey: 'health_mental', issueStance: 'support', text: 'Requires annual mental-health visits for staff and runs a “Healing Heroes” neurofeedback program and a 2025 suicide-prevention curriculum for deputies.', source: { label: 'Campaign', url: 'https://www.mikesmith.vote/' } },
      { topic: 'Second Amendment', icon: '🔫', pos: 'support', issueKey: 'gun_rights', issueStance: 'support', text: 'Helped draft a Utah County Second Amendment resolution and gathered the signatures of all 29 Utah sheriffs on a constitutional-rights pledge.', source: { label: 'Campaign', url: 'https://www.mikesmith.vote/' } },
      { topic: 'Transparency', icon: '🔍', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support', text: 'Deployed body cameras, opened the office to the County Auditor, and took part in A&E’s “60 Days In” (2023) to expose jail operations to outside scrutiny.', source: { label: 'Campaign', url: 'https://www.mikesmith.vote/' } },
      { topic: 'Rehabilitation in Corrections', icon: '🤝', pos: 'support', issueKey: 'justice_reform', issueStance: 'support', text: 'Runs jail rehabilitation programs including “A New Leash on Life,” where inmates train rescue dogs, and the RISE reentry program.', source: { label: 'Campaign', url: 'https://www.mikesmith.vote/' } },
    ],
    promises: [
      { title: 'Deploy body cameras and open the office to outside audit', detail: 'Put body cameras on deputies, opened books to the County Auditor, and invited A&E’s “60 Days In” into the jail.', verdict: 'kept', issueKey: 'gov_transparency', sources: ['https://www.mikesmith.vote/'] },
      { title: 'Advance Second Amendment protections in Utah County', detail: 'Helped pass a county Second Amendment resolution and organized all 29 Utah sheriffs behind a constitutional-rights pledge.', verdict: 'kept', issueKey: 'gun_rights', sources: ['https://www.mikesmith.vote/'] },
      { title: 'Expand deputy wellness and mental-health support', detail: 'Pledges to keep building out mandatory mental-health visits, neurofeedback, and suicide-prevention programs for staff.', verdict: 'pending', issueKey: 'health_mental', sources: ['https://www.mikesmith.vote/'] },
    ],
    accountability: { overallScore: 72, summary: 'A two-term sheriff with one of the deepest documented local records in this pass — transparency measures, constitutional-rights advocacy, and corrections-rehabilitation programs all tied to concrete actions.' },
  },

  // ══════════════════ UTAH COUNTY — Commission Seat A ══════════════════
  {
    id: 'michelle_kaufusi',
    name: 'Michelle Kaufusi',
    status: 'candidate',
    rank: 'nominee',
    office: '🏛 Utah County Commission, Seat A · 2026 Republican Nominee',
    icon: '🏛',
    party: 'Republican',
    state: 'Utah',
    candidacyStatus: 'active',
    nextElection: '2026-11-03',
    score: 64,
    why: 'Provo’s first female mayor, who ran the state’s third-largest city for two terms, now seeking to bring municipal-executive experience to a fast-growing county of nearly 800,000.',
    bio: 'Michelle Kaufusi is the Republican nominee for Utah County Commission Seat A, winning the June 2026 primary 55.7% over Brent Bowles. Born and raised in Provo, she earned a geography degree from BYU, served six years on the Provo School Board, and in 2017 was elected Provo’s first female mayor, serving two terms (2018–2026). During her tenure Provo was named the Milken Institute’s Best-Performing City three consecutive years (2021–2023). She was Jon Huntsman Jr.’s running mate in the 2020 gubernatorial primary. After a narrow loss in her 2025 re-election bid, she entered the race for the open Seat A, which opened when Commissioner Amelia Powers Gardner chose not to seek re-election.',
    keyIssues: ['Property Taxes', 'County Efficiency', 'Infrastructure & Planning', 'Growth'],
    positions: [
      { topic: 'Fiscal Discipline & Property Taxes', icon: '🏡', pos: 'support', issueKey: 'property_tax', issueStance: 'support', text: 'Points to eight consecutive balanced budgets as Provo mayor “without a single truth-in-taxation hearing” as her model for county finances.', detail: 'Opponents counter that Provo’s bonded debt roughly doubled — from about $112M to more than $200M — during her tenure.', source: { label: 'Daily Herald', url: 'https://www.heraldextra.com/news/2026/jan/02/provo-mayor-michelle-kaufusi-announces-run-for-county-commission/' } },
      { topic: 'Efficient County Government', icon: '🧹', pos: 'support', issueKey: 'gov_waste', issueStance: 'support', text: 'Stresses that “every single dollar counts” — noting even a county-wide mailer costs $15,000 — and is open to using AI tools to drive efficiency.', source: { label: 'Lehi Free Press', url: 'https://lehifreepress.com/2026/06/03/county-commission-candidates-clash-over-taxes-transportation/' } },
      { topic: 'Infrastructure & Regional Planning', icon: '🚧', pos: 'support', issueKey: 'infrastructure', issueStance: 'support', text: 'As Provo mayor led major projects including the Provo Airport expansion and the city’s water-reclamation facility, and stresses proactive regional planning.', evidence: 'Served as president of the Mountainland Association of Governments (the regional metropolitan planning organization).', source: { label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Michelle_Kaufusi' } },
      { topic: 'ICE & Immigration Enforcement', icon: '🛡', pos: 'mixed', issueKey: 'border_security', issueStance: 'mixed', text: 'Declined to sign a contract for ICE to operate in Provo after consulting Utah County Sheriff Mike Smith, saying “Utah County is where I need to stay focused,” and notes she is married to an immigrant.', source: { label: 'Lehi Free Press', url: 'https://lehifreepress.com/2026/06/03/county-commission-candidates-clash-over-taxes-transportation/' } },
      { topic: 'Experienced Executive Leadership', icon: '🏛', pos: 'support', issueKey: 'gov_services', issueStance: 'support', text: 'Brings 15 years of public service — six on the Provo School Board and two terms as mayor of Utah County’s largest city — to the regional level.', source: { label: 'KSL', url: 'https://www.ksl.com/article/51426955/provo-mayor-michelle-kaufusi-announces-run-for-utah-county-commission' } },
    ],
    promises: [
      { title: 'Hold the line on county property taxes', detail: 'Pledges to bring her balanced-budget approach from Provo to the county and resist tax increases.', verdict: 'pending', issueKey: 'property_tax', sources: ['https://www.heraldextra.com/news/2026/jan/02/provo-mayor-michelle-kaufusi-announces-run-for-county-commission/'] },
      { title: 'Drive county efficiency, including with AI tools', detail: 'Promises to scrutinize county spending and modernize operations to do more with less.', verdict: 'pending', issueKey: 'gov_waste', sources: ['https://lehifreepress.com/2026/06/03/county-commission-candidates-clash-over-taxes-transportation/'] },
    ],
    accountability: { overallScore: 64, summary: 'A seasoned municipal executive with a long, documented record as Provo mayor; her county-commission pledges are forward-looking and her fiscal record draws competing interpretations.' },
  },

  // ══════════════════ UTAH COUNTY — Commission Seat B ══════════════════
  {
    id: 'david_spencer_utco',
    name: 'David Spencer',
    status: 'candidate',
    rank: 'nominee',
    office: '🏛 Utah County Commission, Seat B · 2026 Republican Nominee',
    icon: '🏛',
    party: 'Republican',
    state: 'Utah',
    candidacyStatus: 'active',
    nextElection: '2026-11-03',
    score: 58,
    why: 'A former Orem councilman running on aggressive fiscal restraint — rolling back commissioner pay, slowing high-density growth, and auditing county departments for waste.',
    bio: 'David Spencer is the Republican nominee for Utah County Commission Seat B, winning a three-way June 2026 primary with 42.1% (ahead of Isaac Paxman and Carolina Herrin). He says he first entered politics about 12 years ago over an effort to save a local ballfield, and went on to serve on the Orem City Council, where he says the city secured $15 million in grants and removed more than 10,000 high-density apartment units from long-range plans without raising taxes. He works in the import/export sector in Salt Lake City. After losing his council seat in the 2025 municipal election, he entered the race for the open Seat B, vacated by retiring Commissioner Brandon Gordon.',
    keyIssues: ['Property Taxes', 'Commissioner Pay & Waste', 'Growth & Housing Density', 'Water & Roads', 'Transparency'],
    positions: [
      { topic: 'Taxes on the Ballot', icon: '🏡', pos: 'support', issueKey: 'property_tax', issueStance: 'support', text: 'Believes “tax increases must be put on the ballot for citizens to decide” and has publicly criticized the commission’s recent tax hikes.', source: { label: 'Lehi Free Press', url: 'https://lehifreepress.com/2026/03/19/utah-county-commission-seat-b/' } },
      { topic: 'Cut Commissioner Pay & Staff', icon: '🧹', pos: 'support', issueKey: 'gov_waste', issueStance: 'support', text: 'Criticizes a 31% commissioner salary increase and the growth of commission staff from 6 to more than 18, and pledges to roll back the raises and cut travel budgets.', source: { label: 'Campaign', url: 'https://www.davidspencerforutah.com/platform' } },
      { topic: 'Slow High-Density Growth', icon: '🏗', pos: 'oppose', issueKey: 'housing_build', issueStance: 'oppose', text: 'As an Orem councilman led the removal of more than 10,000 high-density apartment units from long-range plans, redirecting growth toward business and family uses.', source: { label: 'Campaign', url: 'https://www.davidspencerforutah.com/platform' } },
      { topic: 'Water & Road Capacity for Growth', icon: '🚰', pos: 'support', issueKey: 'water_storage', issueStance: 'support', text: 'Warns the county lacks the water and road infrastructure to sustain its pace of growth and supports slowing development until capacity catches up.', source: { label: 'Lehi Free Press', url: 'https://lehifreepress.com/2026/03/19/utah-county-commission-seat-b/' } },
      { topic: 'Transparency Portal & Audits', icon: '🔍', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support', text: 'Wants a county “transparency portal” like the one he championed in Orem and a strategy-and-innovation department to audit every department for waste.', source: { label: 'Campaign', url: 'https://www.davidspencerforutah.com/platform' } },
    ],
    promises: [
      { title: 'Put county tax increases on the ballot', detail: 'Pledges that any tax increase should go to voters rather than be set by the commission alone.', verdict: 'pending', issueKey: 'property_tax', sources: ['https://lehifreepress.com/2026/03/19/utah-county-commission-seat-b/'] },
      { title: 'Roll back the commissioner pay raise and cut travel budgets', detail: 'Promises to reverse the 31% salary increase and cut commissioner travel budgets from $20,000 to $10,000.', verdict: 'pending', issueKey: 'gov_waste', sources: ['https://www.davidspencerforutah.com/platform'] },
      { title: 'Create a strategy-and-innovation department to cut waste', detail: 'Pledges deep-dive reviews of every county department to identify inefficiencies and modernize operations.', verdict: 'pending', issueKey: 'gov_transparency', sources: ['https://www.davidspencerforutah.com/platform'] },
    ],
    accountability: { overallScore: 58, summary: 'A former city councilman with a documented local record on density and grants; his county agenda is detailed but entirely forward-looking and pending.' },
  },

  // ══════════════════ WEBER COUNTY — Commission Seat B ══════════════════
  {
    id: 'jon_beesley',
    name: 'Jon Beesley',
    status: 'candidate',
    rank: 'nominee',
    office: '🏛 Weber County Commission, Seat B · 2026 Republican Nominee',
    icon: '🏛',
    party: 'Republican',
    state: 'Utah',
    candidacyStatus: 'active',
    nextElection: '2026-11-03',
    score: 61,
    why: 'A two-term small-city mayor who unseated an incumbent commissioner in a primary that, with no other party filing, effectively decided the seat — running on fiscal frugality and a closer county-city relationship.',
    bio: 'Jon Beesley is the Republican nominee for Weber County Commission Seat B, defeating two-term incumbent Sharon Bolos 54.8%–45.2% in the June 2026 primary; because no other party filed for the seat, the primary effectively decided it. A lifelong Weber County resident, he served two terms as mayor of Plain City (2018–2025), first elected with more than 70% of the vote. He built his record on fiscal discipline — over eight years the city averaged a roughly $4.5 million annual budget and saved nearly $5 million — and brings private-sector experience alongside his public service. He follows a Plain City tradition of mayors moving up to the county commission.',
    keyIssues: ['Frugal Budgeting', 'Taxpayers First', 'County–City Relationship', 'Managing Growth', 'Public-Safety Morale'],
    positions: [
      { topic: 'Frugal Budgeting', icon: '🧹', pos: 'support', issueKey: 'gov_waste', issueStance: 'support', text: 'Says Plain City saved nearly $5 million over his eight years as mayor by checking spending with department heads, and campaigns against a “spend it or lose it” mentality at the county.', source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/2026/may/18/jon-beesley-sees-disconnect-between-weber-county-commission-and-its-cities-residents/' } },
      { topic: 'Taxpayers First', icon: '🏡', pos: 'support', issueKey: 'property_tax', issueStance: 'support', text: 'Centers fiscal discipline and a “taxpayers first” approach to county government.', source: { label: 'Campaign', url: 'https://www.jonforweber.com/about' } },
      { topic: 'County–City Communication', icon: '🏛', pos: 'support', issueKey: 'gov_services', issueStance: 'support', text: 'Argues the commission is disconnected from the county’s cities and residents and wants better communication and support for local partners so growth does not just dump new pressures on city services.', source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/2026/may/18/jon-beesley-sees-disconnect-between-weber-county-commission-and-its-cities-residents/' } },
      { topic: 'Managing Westside Growth', icon: '🏗', pos: 'mixed', issueKey: 'housing_build', issueStance: 'mixed', text: 'Raises concerns about large county-pushed developments — 13,000-home projects “that amount to cities” — when Plain City itself has under 3,000 homes.', source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/2026/may/18/jon-beesley-sees-disconnect-between-weber-county-commission-and-its-cities-residents/' } },
      { topic: 'Public-Safety Morale', icon: '👮', pos: 'support', issueKey: 'back_police', issueStance: 'support', text: 'Names protecting morale in public safety among his top county priorities.', source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/2026/may/18/jon-beesley-sees-disconnect-between-weber-county-commission-and-its-cities-residents/' } },
    ],
    promises: [
      { title: 'Bring frugal, taxpayer-first budgeting to the county', detail: 'Pledges to apply the spending discipline he used as Plain City mayor — where the city saved nearly $5 million — to the county budget.', verdict: 'pending', issueKey: 'gov_waste', sources: ['https://www.standard.net/news/2026/may/18/jon-beesley-sees-disconnect-between-weber-county-commission-and-its-cities-residents/'] },
      { title: 'Bridge the disconnect between the county and its cities', detail: 'Promises better communication and coordination between the commission and Weber County’s municipalities.', verdict: 'pending', issueKey: 'gov_services', sources: ['https://www.standard.net/news/2026/may/18/jon-beesley-sees-disconnect-between-weber-county-commission-and-its-cities-residents/'] },
    ],
    accountability: { overallScore: 61, summary: 'A two-term mayor with a concrete municipal fiscal record who unseated an incumbent; his county pledges are forward-looking and pending.' },
  },

  // ══════════════════ WEBER COUNTY — Commission Seat A ══════════════════
  {
    id: 'duane_kearsley',
    name: 'Duane Kearsley',
    status: 'candidate',
    rank: 'nominee',
    office: '🏛 Weber County Commission, Seat A · 2026 Republican Nominee',
    icon: '🏛',
    party: 'Republican',
    state: 'Utah',
    candidacyStatus: 'active',
    nextElection: '2026-11-03',
    score: 54,
    why: 'A first-time candidate and construction-business owner who emerged from a crowded four-way primary for an open seat, running on a no-tax-increase, anti-“career politician” message; faces a contested November general.',
    bio: 'Duane Kearsley is the Republican nominee for Weber County Commission Seat A, winning a four-way June 2026 primary with 30.1% to replace retiring Commissioner Gage Froerer. A Warren resident and first-time candidate, he has owned a construction company for 29 years and works as facility manager for the Weber County Fairgrounds (Golden Spike Event Center), where he says he completed a capital-improvement project for roughly $210,000–$215,000 against a lowest outside bid of $439,000 by using his construction expertise. He says a conversation with his daughter — and his experience coaching kids to “do hard things” — prompted his run. In November he faces Democrat Alvin Thurgood and Forward Party of Utah candidate Gary New.',
    keyIssues: ['No Tax Increases', 'Government Bloat & Salaries', 'Responsible Growth', 'Hands-On Management'],
    positions: [
      { topic: 'No Tax Increases', icon: '🏡', pos: 'support', issueKey: 'property_tax', issueStance: 'support', text: 'Makes taxes his top priority, arguing “there’s zero reason to raise your taxes” given government bloat, and pledges: “I ain’t raising taxes.”', source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/2026/jun/01/duane-kearsley-says-hed-like-to-instill-leadership-in-weber-county-commission-seat-a-race/' } },
      { topic: 'Cut Bloat & Commissioner Salaries', icon: '🧹', pos: 'support', issueKey: 'gov_waste', issueStance: 'support', text: 'Says commissioners “make way too much money,” frames the office as public service, and is “willing to take that lower cut because we don’t need career politicians.”', source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/2026/jun/01/duane-kearsley-says-hed-like-to-instill-leadership-in-weber-county-commission-seat-a-race/' } },
      { topic: 'Responsible Growth', icon: '🏗', pos: 'mixed', issueKey: 'housing_build', issueStance: 'mixed', text: 'Though he has “made a lot of money in development,” calls for more responsible planning — such as water vaults under roads — and following the county master plan.', source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/2026/jun/01/duane-kearsley-says-hed-like-to-instill-leadership-in-weber-county-commission-seat-a-race/' } },
      { topic: 'Hands-On County Management', icon: '🏛', pos: 'support', issueKey: 'gov_services', issueStance: 'support', text: 'Touts saving the county a capital project’s cost at the Fairgrounds and wants to “utilize [employees’] talents more effectively” with a “boots-on-the-ground” approach over a “suit-and-tie” one.', source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/2026/jun/01/duane-kearsley-says-hed-like-to-instill-leadership-in-weber-county-commission-seat-a-race/' } },
    ],
    promises: [
      { title: 'Hold county property taxes flat', detail: 'Pledges not to raise taxes, arguing efficiency can absorb costs instead.', verdict: 'pending', issueKey: 'property_tax', sources: ['https://www.standard.net/news/2026/jun/01/duane-kearsley-says-hed-like-to-instill-leadership-in-weber-county-commission-seat-a-race/'] },
      { title: 'Take a lower commissioner salary and cut bloat', detail: 'Says he would accept a lower salary and treat the office as public service rather than a career.', verdict: 'pending', issueKey: 'gov_waste', sources: ['https://www.standard.net/news/2026/jun/01/duane-kearsley-says-hed-like-to-instill-leadership-in-weber-county-commission-seat-a-race/'] },
    ],
    accountability: { overallScore: 54, summary: 'A first-time candidate with a clear fiscal message but no public record yet; every pledge is forward-looking and pending, and his general election is contested.' },
  },

];

// ── Firestore value encoder / helpers ────────────────────────────────────────
function enc(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
  if (typeof v === 'object') { const f = {}; for (const [k, val] of Object.entries(v)) f[k] = enc(val); return { mapValue: { fields: f } }; }
  throw new Error('cannot encode value: ' + String(v));
}

function tierForScore(s) { return s >= 70 ? 'silver' : 'gray'; }

// Build the full Firestore document body for one person.
function buildDoc(p) {
  const kept = p.promises.filter(x => x.verdict === 'kept').length;
  const broken = p.promises.filter(x => x.verdict === 'broken').length;
  const pending = p.promises.filter(x => x.verdict === 'pending').length;

  // stances map (topic → text) mirrors the ISSUE_STANCE_DATA cards.
  const stances = {};
  for (const c of p.positions) stances[c.topic] = c.text;

  const promises = p.promises.map(pr => ({
    title: pr.title,
    detail: pr.detail,
    verdict: pr.verdict,
    issueKey: pr.issueKey,
    sources: (pr.sources || []).map(u => ({ label: 'Source', url: u })),
  }));

  const fields = {
    name: p.name,
    office: p.office,
    party: p.party,
    state: p.state,
    icon: p.icon,
    bio: p.bio,
    keyIssues: p.keyIssues,
    promises,
    stances,
    accountability: { overallScore: p.accountability.overallScore, summary: p.accountability.summary, kept, broken, pending },
    kept, broken, pending,
    score: p.score,
    tier: tierForScore(p.score),
    profileStatus: 'full',
    candidacyStatus: p.candidacyStatus,
    nextElection: p.nextElection,
    updatedAt: STAMP,
  };
  if (p.why) fields.why = p.why;
  if (p.district) fields.district = p.district;
  if (p.rank) fields.rank = p.rank;
  if (p.quote) fields.quote = p.quote;
  return fields;
}

async function exists(id) {
  const r = await fetch(`${BASE}/${id}`);
  return r.ok;
}
async function createDoc(id, fields) {
  // PATCH with no updateMask creates the document with the provided fields.
  const body = { fields: {} };
  for (const [k, v] of Object.entries(fields)) body.fields[k] = enc(v);
  const r = await fetch(`${BASE}/${id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`create ${id}: HTTP ${r.status} — ${(await r.text()).slice(0, 200)}`);
}

// ── Emit the index.html ISSUE_STANCE_DATA block ──────────────────────────────
function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
function emitBlock() {
  const out = [];
  out.push('    // ── Utah LOCAL races · county Sheriff + County Commission (June 2026) ─────────');
  out.push('    // First local pass after the June 23 primary: confirmed November nominees in the');
  out.push('    // larger Wasatch Front counties (Weber, Salt Lake, Utah). Davis County races held');
  out.push('    // for canvass (Sheriff and Commission Seat B were within a few hundred votes). Each');
  out.push("    // card is keyed to an ISSUE_MAP issue so the profile joins Stance at a Glance, the");
  out.push("    // Evidence Locker, the People's Mandate bridge, and the Alignment Tool.");
  for (const p of PEOPLE) {
    out.push(`    ${p.id}: [ // ${p.name} — ${p.office}`);
    for (const c of p.positions) {
      const parts = [`topic:'${esc(c.topic)}'`, `icon:'${c.icon}'`, `pos:'${c.pos}'`, `issueKey:'${c.issueKey}'`, `issueStance:'${c.issueStance}'`, `text:'${esc(c.text)}'`];
      if (c.detail) parts.push(`detail:'${esc(c.detail)}'`);
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
  console.log(`PolitiDex — Utah local 2026 (Sheriff + County Commission)  [${APPLY ? 'APPLY' : EMIT ? 'EMIT' : 'DRY RUN'}]\n`);
  let totPos = 0, totProm = 0, withEvid = 0;
  for (const p of PEOPLE) { totPos += p.positions.length; totProm += p.promises.length; withEvid += p.positions.filter(c => c.evidence || c.source).length; }
  console.log(`${PEOPLE.length} politicians · ${totPos} issue positions (${withEvid} with evidence/source) · ${totProm} promises\n`);

  // Validate every issueKey against the live ISSUE_MAP vocabulary in index.html.
  try {
    const html = (await import('fs')).readFileSync('index.html', 'utf8');
    const mapSlice = html.slice(html.indexOf('var ISSUE_MAP = {'), html.indexOf('try { window.ISSUE_MAP'));
    const valid = new Set([...mapSlice.matchAll(/^\s{6}([a-z_]+):\s+\{ label:/gm)].map(m => m[1]));
    let bad = 0;
    for (const p of PEOPLE) {
      for (const c of p.positions) if (!valid.has(c.issueKey)) { console.log(`  ⚠ ${p.id}: unknown issueKey '${c.issueKey}'`); bad++; }
      for (const pr of p.promises) if (!valid.has(pr.issueKey)) { console.log(`  ⚠ ${p.id}: unknown promise issueKey '${pr.issueKey}'`); bad++; }
    }
    console.log(bad ? `\n  ✗ ${bad} invalid issueKey(s) — fix before applying.\n` : `  ✓ all issueKeys valid against ISSUE_MAP (${valid.size} keys)\n`);
    if (bad && APPLY) process.exit(1);
  } catch (e) { console.log(`  (issueKey validation skipped: ${e.message})`); }

  if (EMIT) {
    const f = '/tmp/utah-local-2026-stance-block.txt';
    writeFileSync(f, emitBlock());
    console.log(`Wrote ISSUE_STANCE_DATA block → ${f}\n`);
  }

  for (const p of PEOPLE) {
    const fields = buildDoc(p);
    const tag = `${p.id} (${p.name}) · ${p.party} · ${fields.kept}K/${fields.broken}B/${fields.pending}P · status=${p.candidacyStatus}`;
    if (APPLY) {
      if (!FORCE && await exists(p.id)) { console.log(`  · ${tag}: already exists — skipped`); continue; }
      await createDoc(p.id, fields);
      console.log(`  ✎ ${tag}`);
    } else {
      console.log(`  → ${tag}`);
    }
  }
  console.log(`\n${APPLY ? 'Created/updated' : 'Would create'} ${PEOPLE.length} records.`);
  if (!APPLY) console.log('Re-run with --emit to write the index.html block, --apply to write Firestore.');
})();
