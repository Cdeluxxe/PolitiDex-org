#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — U.S. House expansion, bottom-up by delegation size (June 2026)
//
// SECOND pass of the smallest-delegation strategy. The first pass added the
// single-seat states whose primaries had concluded (North Dakota, South Dakota).
// This pass moves up one rung to the TWO-seat states whose primaries are over and
// where BOTH November 2026 general-election nominees are decided in each district:
//
//   • Montana   (primary June 2, 2026)  — MT-01 and MT-02
//   • Idaho     (primary May 19, 2026)  — ID-01 and ID-02
//   • Maine     (primary June 9, 2026)  — ME-01 and ME-02 (ranked-choice)
//
// All three states held their primaries on or before June 9, so as of June 24,
// 2026 every general-election matchup below is confirmed. The remaining two-seat
// states are deliberately deferred until their primaries close (e.g. New
// Hampshire and Rhode Island vote in September; West Virginia in May had already
// voted but is a single-seat-plus state — out of this pass's two-seat scope).
//
// THE SIX CONFIRMED MATCHUPS (12 nominees):
//   MT-01  OPEN (Ryan Zinke retiring): Aaron Flint (R) vs Sam Forstag (D)
//   MT-02  Troy Downing (R, incumbent) vs Brian Miller (D)
//   ID-01  Russ Fulcher (R, incumbent) vs Kaylee Peterson (D)
//   ID-02  Mike Simpson (R, incumbent) vs Ellie Gilbreath (D)
//   ME-01  Chellie Pingree (D, incumbent) vs Ron Russell (R)
//   ME-02  OPEN (Jared Golden retiring): Matt Dunlap (D) vs Paul LePage (R)
//
// Every record is authored to the same bar as the Utah roster and the first two
// federal waves:
//   • a real, sourced biography (no placeholders);
//   • keyIssues + structured issue stances, each keyed to an exact ISSUE_MAP
//     issueKey (validated below against the live 86-key vocabulary in index.html)
//     so the profile lights up Stance at a Glance, the Evidence Locker issue
//     labels, the People's Mandate bridge, and the Alignment Tool;
//   • the candidate-status system: every nominee here advanced to the general,
//     so each carries candidacyStatus 'active'.
//
// CLASSIFICATION (mirrors index.html `_pdxOfficeStatus` / `_pdx2026Candidate`):
//   • A sitting member seeking RE-ELECTION to the same seat is an officeholder
//     (status 'office', green "In Office" badge) and carries nextElection
//     '2026-11-03' so the profile reads as on the 2026 ballot.
//       → Downing (MT-02), Fulcher (ID-01), Simpson (ID-02), Pingree (ME-01)
//   • Anyone running for an office they do NOT currently hold is a 2026 nominee
//     (status 'candidate', rank 'nominee', office text contains "Nominee").
//       → Flint, Forstag, Miller, Peterson, Gilbreath, Russell, Dunlap, LePage
//
// Promises: forward-looking pledges are 'pending'. A promise is 'kept' ONLY when
// it maps to an unambiguous, documented, completed action (a signed/enacted law,
// a recorded vote, a finished executive achievement) with a citation — never a
// campaign aspiration. Following the conservative standard set by the first House
// wave, every promise here is recorded pending: each one names a specific future
// legislative OUTCOME that has not yet been achieved. Scores reflect record DEPTH
// for the office being sought, not approval.
//
// CONTENT_STYLE.md: every line describes what THIS individual did, said, or
// pledges — never their party. Vote tallies/outcomes are stated as plain facts;
// a candidate's own break from, or alignment with, a position is theirs alone.
//
//   node scripts/add-house-2seat-states-jun2026.mjs            # dry run + issueKey validation
//   node scripts/add-house-2seat-states-jun2026.mjs --emit     # write index.html ISSUE_STANCE_DATA block to /tmp
//   node scripts/add-house-2seat-states-jun2026.mjs --apply    # create docs in Firestore
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
const STAMP = '2026-06-24T00:00:00.000Z';

// Convenience source builders.
const wiki = (slug, label) => ({ label: label || 'Wikipedia', url: `https://en.wikipedia.org/wiki/${slug}` });
const bp   = (slug, label) => ({ label: label || 'Ballotpedia', url: `https://ballotpedia.org/${slug}` });
const cong = () => ({ label: 'Congress.gov', url: 'https://www.congress.gov' });

// ── The roster ──────────────────────────────────────────────────────────────
// status: 'office' (sitting, re-election) | 'candidate' (nominee for a new seat)
// positions[] become both the ISSUE_STANCE_DATA cards AND the Firestore `stances`
// mirror; promises[] drive kept/broken/pending + the Promise Score.
const PEOPLE = [

  // ══════════════════ MONTANA — 1st District (OPEN: Zinke retiring) ══════════════════

  // ---- Aaron Flint (R) vs Sam Forstag (D) ----
  {
    id: 'aaron_flint', name: 'Aaron Flint', party: 'Republican', state: 'Montana',
    district: 'Montana — 1st District', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 52,
    office: 'U.S. House — 2026 Republican Nominee (Montana 1st District)',
    bio: "Aaron Flint is the Republican nominee for Montana's 1st Congressional District, the open western seat " +
      "that Rep. Ryan Zinke is leaving. A fifth-generation Montanan who grew up in Glasgow and the Flathead, Flint " +
      "served more than 20 years in the Army National Guard and Army Reserve, led combat patrols in Iraq and " +
      "Afghanistan, earned two Bronze Star Medals, and retired as a lieutenant colonel. For roughly 17 years he " +
      "hosted the statewide radio program 'Montana Talks.' He entered the race the day Zinke announced his " +
      "retirement in March 2026 and won the June 2 Republican primary with about 52%, defeating Secretary of " +
      "State Christi Jacobsen and former state lawmaker Al Olszewski. He campaigns on keeping public lands " +
      "accessible, reviving the timber industry, lowering housing costs, and protecting rural health care.",
    keyIssues: ['Public lands access', 'Timber & logging jobs', 'Housing affordability', 'Rural health care', 'National defense'],
    accountability: { overallScore: 52, summary:
      "A retired Army lieutenant colonel and longtime radio host making his first run for office. He has no " +
      "legislative voting record, so his positions are campaign pledges and are marked pending; the score " +
      "reflects that thinner record for the office sought, not the strength of his candidacy." },
    promises: [
      { title: 'Keep public lands in public hands and accessible', verdict: 'pending', issueKey: 'lands_keep_public',
        detail: 'Pledges to keep public lands public and accessible and to give Montanans "a seat at the table" on land decisions.', sources: ['https://projects.montanafreepress.org/election-guide-2026/candidates/aaron-flint/'] },
      { title: 'Revive western Montana timber and logging jobs', verdict: 'pending', issueKey: 'gov_regulation',
        detail: 'Says he would cut "unnecessary red tape," increase responsible timber harvests, and push back on policies he argues are killing good-paying jobs.', sources: ['https://projects.montanafreepress.org/election-guide-2026/candidates/aaron-flint/'] },
      { title: 'Lower housing costs and protect rural health care', verdict: 'pending', issueKey: 'housing_build',
        detail: 'Would bar Wall Street investment firms from buying Montana family homes, cut building regulations, and protect rural-health funding.', sources: ['https://projects.montanafreepress.org/election-guide-2026/candidates/aaron-flint/'] },
    ],
    positions: [
      { topic: 'Public Lands Access', icon: '🏔', pos: 'support', issueKey: 'lands_keep_public', issueStance: 'support',
        text: 'Pledges to keep public lands in public hands and accessible, with Montanans at the table on land decisions.', source: { label: 'Montana Free Press', url: 'https://projects.montanafreepress.org/election-guide-2026/candidates/aaron-flint/' } },
      { topic: 'Timber & Logging Jobs', icon: '🪵', pos: 'support', issueKey: 'gov_regulation', issueStance: 'support',
        text: 'Wants to cut "unnecessary red tape" and increase responsible timber harvests to revive logging jobs in northwest Montana.', source: { label: 'Montana Free Press', url: 'https://projects.montanafreepress.org/election-guide-2026/candidates/aaron-flint/' } },
      { topic: 'Housing Affordability', icon: '🏠', pos: 'support', issueKey: 'housing_build', issueStance: 'support',
        text: 'Would stop Wall Street investment firms from buying Montana family homes and cut building regulations to lower costs.', source: { label: 'Montana Free Press', url: 'https://projects.montanafreepress.org/election-guide-2026/candidates/aaron-flint/' } },
      { topic: 'Rural Health Care', icon: '🚑', pos: 'support', issueKey: 'health_rural', issueStance: 'support',
        text: 'Centers rural-hospital funding and opposes steering health dollars to large insurers and hospital networks over rural America.', source: { label: 'Montana Free Press', url: 'https://projects.montanafreepress.org/election-guide-2026/candidates/aaron-flint/' } },
      { topic: 'National Defense', icon: '🎖', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: 'Opposes "forever wars" but says he would not back anything that ties the hands of the U.S. military.',
        evidence: 'Served more than 20 years in the Army National Guard and Reserve, led combat patrols in Iraq and Afghanistan, earned two Bronze Star Medals, and retired as a lieutenant colonel.', source: bp('Aaron_Flint_(Montana)') },
    ],
  },

  {
    id: 'sam_forstag', name: 'Sam Forstag', party: 'Democratic', state: 'Montana',
    district: 'Montana — 1st District', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 50,
    office: 'U.S. House — 2026 Democratic Nominee (Montana 1st District)',
    bio: "Sam Forstag is the Democratic nominee for Montana's 1st Congressional District, the open western seat " +
      "Rep. Ryan Zinke is leaving. He put himself through the University of Montana — where he was elected " +
      "student body president — then spent eight years as a wildland firefighter, four of them as a smokejumper, " +
      "and served as a vice president of NFFE-IAM Local 60, representing about 800 U.S. Forest Service workers. " +
      "He has said federal cuts to the Forest Service prompted his run. He won the June 2 Democratic primary with " +
      "about 37%, narrowly defeating former gubernatorial candidate Ryan Busse. He campaigns on sustainably " +
      "managing public lands and forests, expanding affordable health care, building more housing, and growing " +
      "union jobs in the trades.",
    keyIssues: ['Public lands & forests', 'Health care access', 'Housing', 'Trades & union jobs', 'Cost of living'],
    accountability: { overallScore: 50, summary:
      "A former smokejumper and Forest Service union leader making his first run for office. He has no " +
      "legislative voting record, so his positions are campaign pledges and are marked pending; the score " +
      "reflects that thinner record for the office sought, not the strength of his candidacy." },
    promises: [
      { title: 'Protect and sustainably manage public lands and forests', verdict: 'pending', issueKey: 'lands_balance',
        detail: 'A former smokejumper who pledges to protect and sustainably manage forests and public lands while responsibly harvesting timber to improve forest health.', sources: ['https://projects.montanafreepress.org/election-guide-2026/candidates/sam-forstag/'] },
      { title: 'Expand affordable health care for Montanans', verdict: 'pending', issueKey: 'healthcare',
        detail: 'Backs a Medicare buy-in option and expanded ACA subsidies, higher reimbursement for rural providers, and letting Medicare negotiate all prescription-drug prices.', sources: ['https://projects.montanafreepress.org/election-guide-2026/candidates/sam-forstag/'] },
      { title: 'Build more housing and grow union trades jobs', verdict: 'pending', issueKey: 'housing_first_time',
        detail: 'Would restore the first-time-homebuyer tax credit, bar hedge funds from buying homes, and increase good union jobs in construction and the trades.', sources: ['https://projects.montanafreepress.org/election-guide-2026/candidates/sam-forstag/'] },
    ],
    positions: [
      { topic: 'Public Lands & Forests', icon: '🌲', pos: 'support', issueKey: 'lands_balance', issueStance: 'support',
        text: 'Pledges to protect and sustainably manage forests and public lands while responsibly harvesting timber to improve forest health.',
        evidence: 'Spent eight years as a wildland firefighter, four as a smokejumper, and was a vice president of a Forest Service workers union (NFFE-IAM Local 60).', source: wiki('Sam_Forstag') },
      { topic: 'Health Care Access', icon: '🏥', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Supports a Medicare buy-in and expanded ACA subsidies, with higher reimbursement rates for rural providers.', source: { label: 'Montana Free Press', url: 'https://projects.montanafreepress.org/election-guide-2026/candidates/sam-forstag/' } },
      { topic: 'Housing', icon: '🏠', pos: 'support', issueKey: 'housing_first_time', issueStance: 'support',
        text: 'Would restore the first-time-homebuyer tax credit, ban hedge funds and private equity from buying residential property, and incentivize zoning reform.', source: { label: 'Montana Free Press', url: 'https://projects.montanafreepress.org/election-guide-2026/candidates/sam-forstag/' } },
      { topic: 'Trades & Union Jobs', icon: '🔧', pos: 'support', issueKey: 'econ_workers', issueStance: 'support',
        text: 'Pledges to dramatically increase the number of good union jobs in construction and the trades.', source: { label: 'Montana Free Press', url: 'https://projects.montanafreepress.org/election-guide-2026/candidates/sam-forstag/' } },
      { topic: 'Prescription Drug Prices', icon: '💊', pos: 'support', issueKey: 'health_drug_prices', issueStance: 'support',
        text: 'Would let Medicare negotiate prices for all prescription drugs.', source: { label: 'Montana Free Press', url: 'https://projects.montanafreepress.org/election-guide-2026/candidates/sam-forstag/' } },
    ],
  },

  // ══════════════════ MONTANA — 2nd District (incumbent re-election) ══════════════════

  // ---- Troy Downing (R, incumbent) vs Brian Miller (D) ----
  {
    id: 'troy_downing', name: 'Troy Downing', party: 'Republican', state: 'Montana',
    district: 'Montana — 2nd District', status: 'office', candidacyStatus: 'active',
    nextElection: '2026-11-03', icon: '🏛', score: 58,
    office: '🏛 U.S. Representative — Montana (2nd District)',
    bio: "Troy Downing is the U.S. Representative for Montana's 2nd Congressional District, the eastern seat, " +
      "sworn in in January 2025. Before Congress he served as Montana State Auditor from 2021 to 2025, " +
      "regulating insurance and securities and sitting on the Board of Land Commissioners. An Air Force and Air " +
      "National Guard veteran who served two tours in Afghanistan with a combat search-and-rescue squadron, he " +
      "earlier taught at NYU's Courant Institute and co-founded a technology startup. He won the open MT-02 House " +
      "seat in 2024 with about 66% and was unopposed in the June 2, 2026 Republican primary. He faces Democrat " +
      "Brian Miller in November. In office he has emphasized energy, water infrastructure, public-lands access, " +
      "and tax relief.",
    keyIssues: ['Tax relief', 'Public lands access', 'Coal & energy', 'Water infrastructure', 'Medicare & seniors'],
    accountability: { overallScore: 58, summary:
      "A first-term congressman and former Montana State Auditor with a regulatory background and an early House " +
      "voting record on energy, water, and public lands. The score reflects that record and early tenure; his " +
      "forward-looking 2026 pledges are marked pending until acted on." },
    promises: [
      { title: 'Keep public-land sales out of federal budget law', verdict: 'pending', issueKey: 'lands_keep_public',
        detail: 'Publicly opposed a provision to sell roughly 500,000 acres of BLM land and says the final 2025 budget law dropped that public-land sale after his pushback.', sources: ['https://montanafreepress.org/2025/05/20/zinke-downing-line-up-behind-trump-budget-bill/'] },
      { title: 'Secure rural water infrastructure for eastern Montana', verdict: 'pending', issueKey: 'water',
        detail: 'Sponsored House-passed legislation (H.R. 7250) extending the Fort Peck Reservation Rural Water System and the Dry-Redwater Regional Water authorization.', sources: ['https://www.govtrack.us/congress/members/troy_downing/457000'] },
      { title: 'Deliver tax relief for Montana families', verdict: 'pending', issueKey: 'lower_taxes',
        detail: 'Voted for the 2025 tax-and-spending law, which he says prevents a tax increase and lowers taxes for Montana families.', sources: ['https://downing.house.gov/media/press-releases/downing-republicans-one-big-beautiful-bill-win-america-and-win-montana'] },
    ],
    positions: [
      { topic: 'Tax Relief', icon: '💵', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Voted for the 2025 tax-and-spending law, calling it tax relief that prevents an increase on Montana families.', source: { label: 'House.gov', url: 'https://downing.house.gov/media/press-releases/downing-republicans-one-big-beautiful-bill-win-america-and-win-montana' } },
      { topic: 'Public Lands Access', icon: '🏔', pos: 'support', issueKey: 'lands_keep_public', issueStance: 'support',
        text: 'Opposed a provision to sell about 500,000 acres of BLM land and says the final budget law dropped the sale after his pushback.', source: { label: 'Montana Free Press', url: 'https://montanafreepress.org/2025/05/20/zinke-downing-line-up-behind-trump-budget-bill/' } },
      { topic: 'Coal & Energy', icon: '⛏', pos: 'support', issueKey: 'enviro_energy', issueStance: 'support',
        text: 'Sponsored legislation (H.R. 931) to keep the Bull Mountains coal mine operating, later folded into the 2025 budget law.', source: cong() },
      { topic: 'Water Infrastructure', icon: '💧', pos: 'support', issueKey: 'water', issueStance: 'support',
        text: 'Sponsored House-passed bills extending the Fort Peck Reservation and Dry-Redwater rural water systems.',
        evidence: 'H.R. 7250 (Fort Peck Reservation Rural Water System) passed the House.', source: { label: 'GovTrack', url: 'https://www.govtrack.us/congress/members/troy_downing/457000' } },
      { topic: 'Medicare & Seniors', icon: '🧓', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Co-authored an op-ed on protecting Montana seniors enrolled in Medicare Advantage.', source: wiki('Troy_Downing') },
    ],
  },

  {
    id: 'brian_miller_mt', name: 'Brian Miller', party: 'Democratic', state: 'Montana',
    district: 'Montana — 2nd District', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 50,
    office: 'U.S. House — 2026 Democratic Nominee (Montana 2nd District)',
    bio: "Brian Miller is the Democratic nominee for Montana's 2nd Congressional District, a Helena civil-trial " +
      "attorney running in his first political campaign. He has lived in Montana about 25 years and spent the " +
      "past decade litigating at the Helena firm Morrison, Sherwood, Wilson and Deola, with roughly 15 years of " +
      "courtroom experience. He won the June 2 Democratic primary with about 58%, defeating farrier Sam Lux and " +
      "state Sen. Jonathan Windy Boy. He faces first-term Republican Rep. Troy Downing in November and campaigns " +
      "on lowering health-care costs, restraining federal deficits, supporting Montana agriculture, and " +
      "reasserting Congress's role in checking executive power and tariffs.",
    keyIssues: ['Health care costs', 'Federal deficit', 'Agriculture', 'Tariffs & trade', 'Checks on executive power'],
    accountability: { overallScore: 50, summary:
      "A civil-trial attorney making his first run for office. He has no legislative voting record, so his " +
      "positions are campaign pledges and are marked pending; the score reflects that thinner record for the " +
      "office sought, not the strength of his candidacy." },
    promises: [
      { title: 'Lower health-care costs through structural reform', verdict: 'pending', issueKey: 'healthcare',
        detail: 'Criticizes the ACA for not controlling costs and points to multi-payer systems abroad as possible models for lowering costs.', sources: ['https://nbcmontana.com/news/local/miller-lays-out-healthcare-deficit-and-agriculture-plans-in-interview-on-us-house-race'] },
      { title: 'Restrain federal deficit spending', verdict: 'pending', issueKey: 'national_debt',
        detail: 'Would cap annual deficit spending at no more than 3% and budget in two-year cycles like the Montana Legislature.', sources: ['https://nbcmontana.com/news/local/miller-lays-out-healthcare-deficit-and-agriculture-plans-in-interview-on-us-house-race'] },
      { title: 'Strengthen Montana agriculture', verdict: 'pending', issueKey: 'rural_ag',
        detail: 'Calls for mandatory country-of-origin labeling, a right to repair farm equipment, and more domestic meatpacking and flour-milling capacity.', sources: ['https://nbcmontana.com/news/local/miller-lays-out-healthcare-deficit-and-agriculture-plans-in-interview-on-us-house-race'] },
    ],
    positions: [
      { topic: 'Health Care Costs', icon: '🏥', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Argues the ACA has not controlled costs and points to multi-payer systems abroad as models worth trying.', source: { label: 'NBC Montana', url: 'https://nbcmontana.com/news/local/miller-lays-out-healthcare-deficit-and-agriculture-plans-in-interview-on-us-house-race' } },
      { topic: 'Federal Deficit', icon: '📉', pos: 'support', issueKey: 'national_debt', issueStance: 'support',
        text: 'Would restrain annual deficit spending to no more than 3% and budget in two-year cycles.', source: { label: 'NBC Montana', url: 'https://nbcmontana.com/news/local/miller-lays-out-healthcare-deficit-and-agriculture-plans-in-interview-on-us-house-race' } },
      { topic: 'Agriculture', icon: '🌾', pos: 'support', issueKey: 'rural_ag', issueStance: 'support',
        text: 'Calls for mandatory country-of-origin labeling, a right to repair, and more domestic meatpacking and flour mills.', source: { label: 'NBC Montana', url: 'https://nbcmontana.com/news/local/miller-lays-out-healthcare-deficit-and-agriculture-plans-in-interview-on-us-house-race' } },
      { topic: 'Tariffs & Trade', icon: '🏭', pos: 'oppose', issueKey: 'econ_trade', issueStance: 'oppose',
        text: 'Says the recent tariffs should be repealed, arguing the approach is not working for Montanans.', source: { label: 'NBC Montana', url: 'https://nbcmontana.com/news/local/miller-lays-out-healthcare-deficit-and-agriculture-plans-in-interview-on-us-house-race' } },
      { topic: 'Checks on Executive Power', icon: '⚖️', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support',
        text: 'Argues Congress should do more to check executive power and reassert its own authority.', source: { label: 'Daily Montanan', url: 'https://dailymontanan.com/2026/06/02/in-eastern-montana-brian-miller-wins-democratic-primary-for-u-s-house/' } },
    ],
  },

  // ══════════════════ IDAHO — 1st District (incumbent re-election) ══════════════════

  // ---- Russ Fulcher (R, incumbent) vs Kaylee Peterson (D) ----
  {
    id: 'russ_fulcher', name: 'Russ Fulcher', party: 'Republican', state: 'Idaho',
    district: 'Idaho — 1st District', status: 'office', candidacyStatus: 'active',
    nextElection: '2026-11-03', icon: '🏛', score: 62,
    office: '🏛 U.S. Representative — Idaho (1st District)',
    bio: "Russ Fulcher is the U.S. Representative for Idaho's 1st Congressional District, covering northern and " +
      "western Idaho, in office since January 2019. Born in Boise and raised on a dairy farm in Meridian, he " +
      "worked in commercial real estate and in Idaho's technology sector, including business development at " +
      "Micron Technology, and served in the Idaho State Senate from 2005 to 2014, rising to majority caucus " +
      "leader. He sits on the Energy and Commerce Committee — where he is a subcommittee vice chairman — and on " +
      "the Natural Resources Committee's Energy and Mineral Resources Subcommittee. He won the May 19, 2026 " +
      "Republican primary with about 78% and faces Democrat Kaylee Peterson in November. He names energy " +
      "independence, local control of public lands, and election security as his top priorities.",
    keyIssues: ['Energy independence', 'Public lands & local control', 'Election security', 'Technology & commerce'],
    accountability: { overallScore: 62, summary:
      "A four-term congressman and former state senator with a record on the Energy and Commerce and Natural " +
      "Resources committees. The score reflects that legislative depth; his forward-looking 2026 priorities are " +
      "marked pending until acted on." },
    promises: [
      { title: 'Advance American energy independence', verdict: 'pending', issueKey: 'enviro_energy',
        detail: 'Names energy independence a top priority and sits on the Energy and Commerce and Energy and Mineral Resources panels that shape it.', sources: ['https://idahocapitalsun.com/voter-guides/2026-primary-election/'] },
      { title: 'Expand local control of public lands', verdict: 'pending', issueKey: 'lands_local',
        detail: 'Advocates greater local control over the management of Idaho public lands as a stated top priority.', sources: ['https://idahocapitalsun.com/voter-guides/2026-primary-election/'] },
      { title: 'Strengthen election security', verdict: 'pending', issueKey: 'election_integrity',
        detail: 'Lists election-security policy among his top three priorities for 2026.', sources: ['https://idahocapitalsun.com/voter-guides/2026-primary-election/'] },
    ],
    positions: [
      { topic: 'Energy Independence', icon: '⚡', pos: 'support', issueKey: 'enviro_energy', issueStance: 'support',
        text: 'Names energy independence a top priority and serves on panels that govern domestic energy and mineral development.',
        evidence: 'Sits on the Energy and Commerce Committee (subcommittee vice chairman) and the Natural Resources Energy and Mineral Resources Subcommittee.', source: { label: 'House.gov', url: 'https://fulcher.house.gov/committee-and-caucus-memberships' } },
      { topic: 'Public Lands & Local Control', icon: '🏔', pos: 'support', issueKey: 'lands_local', issueStance: 'support',
        text: 'Advocates greater local control over the management of Idaho public lands.', source: { label: 'Idaho Capital Sun', url: 'https://idahocapitalsun.com/voter-guides/2026-primary-election/' } },
      { topic: 'Election Security', icon: '🗳', pos: 'support', issueKey: 'election_integrity', issueStance: 'support',
        text: 'Lists election-security policy among his top priorities for 2026.', source: { label: 'Idaho Capital Sun', url: 'https://idahocapitalsun.com/voter-guides/2026-primary-election/' } },
      { topic: 'Technology & Commerce', icon: '📡', pos: 'support', issueKey: 'tech_innovation', issueStance: 'support',
        text: 'Sits on Energy and Commerce subcommittees overseeing communications, technology, and trade.', source: cong() },
    ],
  },

  {
    id: 'kaylee_peterson', name: 'Kaylee Peterson', party: 'Democratic', state: 'Idaho',
    district: 'Idaho — 1st District', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 48,
    office: 'U.S. House — 2026 Democratic Nominee (Idaho 1st District)',
    bio: "Kaylee Peterson is the Democratic nominee for Idaho's 1st Congressional District, making her third " +
      "consecutive run for the seat after 2022 and 2024. She lives in Eagle on land her family homesteaded six " +
      "generations ago, earned an associate degree from the College of Western Idaho, where she was chief of " +
      "staff of the student association, and served as president of the Idaho Young Democrats. She won the May " +
      "19, 2026 Democratic primary with about 87%. She runs a grassroots, retail-politics campaign — at one " +
      "point staging public forums with a cardboard cutout of the incumbent to highlight his absence — and " +
      "centers housing affordability, protecting public lands, government accountability, and veterans.",
    keyIssues: ['Housing affordability', 'Public lands', 'Government accountability', 'Campaign finance', 'Veterans'],
    accountability: { overallScore: 48, summary:
      "A third-time candidate and former Idaho Young Democrats president with no prior elected office. Her " +
      "positions are campaign pledges and are marked pending; the score reflects that thinner record for the " +
      "office sought, not the strength of her candidacy." },
    promises: [
      { title: 'Bar investment firms from buying single-family homes', verdict: 'pending', issueKey: 'housing_build',
        detail: 'Would ban investment firms and hedge funds from buying single-family homes and investigate artificial inflation of Idaho rents and home prices.', sources: ['https://www.kayleeforcongress.com/'] },
      { title: 'Protect Idaho public lands from sale or privatization', verdict: 'pending', issueKey: 'lands_keep_public',
        detail: 'Pledges to fight any attempt to sell off, privatize, or mismanage public lands.', sources: ['https://www.kayleeforcongress.com/'] },
      { title: 'Ban congressional stock trading and curb dark money', verdict: 'pending', issueKey: 'stock_trading_ban',
        detail: 'Supports banning members of Congress from trading individual stocks and limiting dark-money and super-PAC influence.', sources: ['https://www.kayleeforcongress.com/'] },
    ],
    positions: [
      { topic: 'Housing Affordability', icon: '🏠', pos: 'support', issueKey: 'housing_build', issueStance: 'support',
        text: 'Would ban investment firms and hedge funds from buying single-family homes and probe artificial inflation of Idaho housing prices.', source: { label: 'Campaign', url: 'https://www.kayleeforcongress.com/' } },
      { topic: 'Public Lands', icon: '🏔', pos: 'support', issueKey: 'lands_keep_public', issueStance: 'support',
        text: 'Pledges to fight any attempt to sell off, privatize, or mismanage public lands.', source: { label: 'Campaign', url: 'https://www.kayleeforcongress.com/' } },
      { topic: 'Ban Congressional Stock Trading', icon: '🚫', pos: 'support', issueKey: 'stock_trading_ban', issueStance: 'support',
        text: 'Supports barring members of Congress from trading individual stocks.', source: { label: 'Campaign', url: 'https://www.kayleeforcongress.com/' } },
      { topic: 'Campaign Finance', icon: '⚖️', pos: 'support', issueKey: 'campaign_finance', issueStance: 'support',
        text: 'Supports limiting dark-money and super-PAC influence, contrasting corporate-PAC funding with grassroots donors.', source: bp('Kaylee_Peterson') },
      { topic: 'Veterans', icon: '🎖', pos: 'support', issueKey: 'veterans', issueStance: 'support',
        text: 'Supports full implementation of the PACT Act covering toxic burn-pit exposure.', source: { label: 'Campaign', url: 'https://www.kayleeforcongress.com/' } },
    ],
  },

  // ══════════════════ IDAHO — 2nd District (incumbent re-election) ══════════════════

  // ---- Mike Simpson (R, incumbent) vs Ellie Gilbreath (D) ----
  {
    id: 'mike_simpson', name: 'Mike Simpson', party: 'Republican', state: 'Idaho',
    district: 'Idaho — 2nd District', status: 'office', candidacyStatus: 'active',
    nextElection: '2026-11-03', icon: '🏛', score: 66,
    office: '🏛 U.S. Representative — Idaho (2nd District)',
    bio: "Mike Simpson is the U.S. Representative for Idaho's 2nd Congressional District, covering eastern Idaho " +
      "and part of Boise, in office since 1999 and seeking what would be his 15th term. A former dentist from " +
      "Blackfoot, he served in the Idaho House of Representatives — including as Speaker — before his election to " +
      "Congress. He is a senior member of the House Appropriations Committee, where he chairs the Subcommittee on " +
      "Interior, Environment, and Related Agencies and sits on the Energy and Water Development Subcommittee that " +
      "oversees Idaho National Laboratory. He won the May 19, 2026 Republican primary with about 63% and faces " +
      "Democrat Ellie Gilbreath in November. He is known nationally for nuclear-energy advocacy and a high-" +
      "profile proposal on lower Snake River dams and salmon recovery.",
    keyIssues: ['Nuclear energy & INL', 'Salmon & Snake River', 'Interior appropriations', 'Water & energy infrastructure'],
    accountability: { overallScore: 66, summary:
      "A long-serving appropriator who chairs the Interior, Environment Subcommittee, with a deep record on " +
      "nuclear energy, public-lands funding, and salmon recovery. The score reflects that legislative depth; his " +
      "forward-looking pledges are marked pending until acted on." },
    promises: [
      { title: 'Sustain nuclear energy and Idaho National Laboratory', verdict: 'pending', issueKey: 'enviro_energy',
        detail: 'A longtime nuclear-energy advocate who sits on the Energy and Water Development Subcommittee overseeing Idaho National Laboratory.', sources: ['https://en.wikipedia.org/wiki/Mike_Simpson'] },
      { title: 'Advance a durable Snake River salmon-recovery solution', verdict: 'pending', issueKey: 'enviro_balance',
        detail: 'Authored a high-profile framework addressing the lower Snake River dams and salmon recovery; the proposal has not been enacted.', sources: ['https://ballotpedia.org/Michael_Simpson_(Idaho)'] },
      { title: 'Fund Interior and environment priorities for Idaho', verdict: 'pending', issueKey: 'lands_balance',
        detail: 'As Interior subcommittee chairman, introduced the Interior, Environment, and Related Agencies Appropriations Act for fiscal 2027 (H.R. 9171).', sources: ['https://www.congress.gov/member/michael-simpson/S001148'] },
    ],
    positions: [
      { topic: 'Nuclear Energy & Idaho National Laboratory', icon: '⚛️', pos: 'support', issueKey: 'enviro_energy', issueStance: 'support',
        text: 'A longtime nuclear-energy advocate who oversees Idaho National Laboratory through the Energy and Water Development Subcommittee.', source: wiki('Mike_Simpson') },
      { topic: 'Salmon & Lower Snake River', icon: '🐟', pos: 'support', issueKey: 'enviro_balance', issueStance: 'support',
        text: 'Authored a high-profile framework seeking to reconcile the lower Snake River dams with salmon recovery.', source: bp('Michael_Simpson_(Idaho)') },
      { topic: 'Interior & Environment Appropriations', icon: '🏛', pos: 'support', issueKey: 'lands_balance', issueStance: 'support',
        text: 'As subcommittee chairman, introduced the fiscal-2027 Interior, Environment, and Related Agencies Appropriations Act (H.R. 9171).', source: { label: 'Congress.gov', url: 'https://www.congress.gov/member/michael-simpson/S001148' } },
      { topic: 'Water & Energy Infrastructure', icon: '💧', pos: 'support', issueKey: 'water', issueStance: 'support',
        text: 'Sits on the Energy and Water Development Subcommittee funding federal water and energy projects.', source: { label: 'House.gov', url: 'https://simpson.house.gov/biography/committeeassignments.htm' } },
    ],
  },

  {
    id: 'ellie_gilbreath', name: 'Ellie Gilbreath', party: 'Democratic', state: 'Idaho',
    district: 'Idaho — 2nd District', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 48,
    office: 'U.S. House — 2026 Democratic Nominee (Idaho 2nd District)',
    bio: "Ellie Gilbreath is the Democratic nominee for Idaho's 2nd Congressional District, a Ketchum resident of " +
      "23 years and a trained attorney whose career centers on mediation and conflict resolution. A first-time " +
      "candidate, she describes herself as a political centrist who says her views overlap with conservatives, " +
      "independents, and libertarians. She won the May 19, 2026 Democratic primary with about 73%. Her campaign " +
      "slogan, 'Idaho is not for sale,' frames her opposition to outside financial interests buying up Idaho land " +
      "and resources, and she centers public-lands protection, government accountability, and lowering everyday " +
      "costs.",
    keyIssues: ['Public lands', 'Government accountability', 'Checks & balances', 'Cost of living'],
    accountability: { overallScore: 48, summary:
      "A first-time candidate and mediator with no prior elected office. Her positions are campaign pledges and " +
      "are marked pending; the score reflects that thinner record for the office sought, not the strength of her " +
      "candidacy." },
    promises: [
      { title: 'Keep Idaho public lands out of private hands', verdict: 'pending', issueKey: 'lands_keep_public',
        detail: 'Opposes the sale or transfer of public lands to private entities under her "Idaho is not for sale" theme.', sources: ['https://www.eastidahonews.com/2026/05/idaho-is-not-for-sale-why-democrat-ellie-gilbreath-thinks-its-time-for-change-in-the-states-2nd-congressional-district/'] },
      { title: 'End congressional stock trading', verdict: 'pending', issueKey: 'stock_trading_ban',
        detail: 'Supports stronger checks and balances and ending stock trading by members of Congress.', sources: ['https://www.eastidahonews.com/2026/05/idaho-is-not-for-sale-why-democrat-ellie-gilbreath-thinks-its-time-for-change-in-the-states-2nd-congressional-district/'] },
      { title: 'Lower costs for Idaho families and small businesses', verdict: 'pending', issueKey: 'cost_living',
        detail: 'Advocates lower costs through fair taxation and pushing back on price gouging.', sources: ['https://idahocapitalsun.com/voter-guides/contests/idaho-democratic-us-house-district-2-primary-race/'] },
    ],
    positions: [
      { topic: 'Public Lands', icon: '🏔', pos: 'support', issueKey: 'lands_keep_public', issueStance: 'support',
        text: 'Opposes selling or transferring public lands to private entities — the heart of her "Idaho is not for sale" campaign.', source: { label: 'East Idaho News', url: 'https://www.eastidahonews.com/2026/05/idaho-is-not-for-sale-why-democrat-ellie-gilbreath-thinks-its-time-for-change-in-the-states-2nd-congressional-district/' } },
      { topic: 'Government Accountability', icon: '🚫', pos: 'support', issueKey: 'stock_trading_ban', issueStance: 'support',
        text: 'Supports ending stock trading by members of Congress.', source: { label: 'East Idaho News', url: 'https://www.eastidahonews.com/2026/05/idaho-is-not-for-sale-why-democrat-ellie-gilbreath-thinks-its-time-for-change-in-the-states-2nd-congressional-district/' } },
      { topic: 'Checks & Balances', icon: '⚖️', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support',
        text: 'Calls for stronger checks and balances, transparency, and equal application of the law.', source: { label: 'East Idaho News', url: 'https://www.eastidahonews.com/2026/05/idaho-is-not-for-sale-why-democrat-ellie-gilbreath-thinks-its-time-for-change-in-the-states-2nd-congressional-district/' } },
      { topic: 'Cost of Living', icon: '🛒', pos: 'support', issueKey: 'cost_living', issueStance: 'support',
        text: 'Advocates lower costs for families and small businesses through fair taxation and fighting price gouging.', source: { label: 'Idaho Capital Sun', url: 'https://idahocapitalsun.com/voter-guides/contests/idaho-democratic-us-house-district-2-primary-race/' } },
    ],
  },

  // ══════════════════ MAINE — 1st District (incumbent re-election) ══════════════════

  // ---- Chellie Pingree (D, incumbent) vs Ron Russell (R) ----
  {
    id: 'chellie_pingree', name: 'Chellie Pingree', party: 'Democratic', state: 'Maine',
    district: 'Maine — 1st District', status: 'office', candidacyStatus: 'active',
    nextElection: '2026-11-03', icon: '🏛', score: 66,
    office: '🏛 U.S. Representative — Maine (1st District)',
    bio: "Chellie Pingree is the U.S. Representative for Maine's 1st Congressional District, the southern and " +
      "coastal seat, in office since 2009 and now in her ninth term. She moved to Maine as a teenager, lives on " +
      "North Haven island, earned a degree in human ecology from the College of the Atlantic, and built a " +
      "knitting business before serving in the Maine State Senate from 1992 to 2000, where she became majority " +
      "leader. She later led the government-reform group Common Cause. She sits on the House Appropriations " +
      "Committee, including its Agriculture and Interior-Environment subcommittees, and was unopposed in the June " +
      "9, 2026 Democratic primary. She faces Republican Ron Russell in November and centers food and farm " +
      "policy, climate, reproductive rights, and campaign-finance reform.",
    keyIssues: ['Agriculture & food policy', 'Climate', 'Reproductive rights', 'Drug prices', 'Campaign finance'],
    accountability: { overallScore: 66, summary:
      "A nine-term appropriator with a long record on food and farm policy, climate, and government reform. The " +
      "score reflects that legislative depth; her forward-looking pledges are marked pending until acted on." },
    promises: [
      { title: 'Strengthen food and farm policy', verdict: 'pending', issueKey: 'rural_ag',
        detail: 'A senior member of the Appropriations Agriculture subcommittee who has long authored food-system and farm legislation.', sources: ['https://en.wikipedia.org/wiki/Chellie_Pingree'] },
      { title: 'Treat climate change as a national priority', verdict: 'pending', issueKey: 'climate_action',
        detail: 'Supports the Green New Deal and urged a national climate-emergency declaration; opposed unrestricted offshore drilling.', sources: ['https://en.wikipedia.org/wiki/Chellie_Pingree'] },
      { title: 'Lower prescription-drug prices', verdict: 'pending', issueKey: 'health_drug_prices',
        detail: 'A member of the Medicare for All Caucus who, as a state senator, authored "Maine Rx," the first state law to regulate prescription-drug prices.', sources: ['https://en.wikipedia.org/wiki/Chellie_Pingree'] },
    ],
    positions: [
      { topic: 'Agriculture & Food Policy', icon: '🌾', pos: 'support', issueKey: 'rural_ag', issueStance: 'support',
        text: 'A senior Appropriations Agriculture member who has long authored food-system and nutrition legislation.', source: wiki('Chellie_Pingree') },
      { topic: 'Climate', icon: '🌎', pos: 'support', issueKey: 'climate_action', issueStance: 'support',
        text: 'Supports the Green New Deal, urged a national climate-emergency declaration, and opposed unrestricted offshore drilling.', source: wiki('Chellie_Pingree') },
      { topic: 'Reproductive Rights', icon: '🤍', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'A longtime supporter of abortion rights, endorsed by Planned Parenthood.', source: wiki('Chellie_Pingree') },
      { topic: 'Prescription Drug Prices', icon: '💊', pos: 'support', issueKey: 'health_drug_prices', issueStance: 'support',
        text: 'As a state senator authored "Maine Rx," the first state law to regulate prescription-drug prices; sits in the Medicare for All Caucus.', source: wiki('Chellie_Pingree') },
      { topic: 'Campaign Finance', icon: '⚖️', pos: 'support', issueKey: 'campaign_finance', issueStance: 'support',
        text: 'Helped draft the Fair Elections Now Act and backs public financing of elections, reflecting her tenure leading Common Cause.', source: wiki('Chellie_Pingree') },
    ],
  },

  {
    id: 'ron_russell_me', name: 'Ron Russell', party: 'Republican', state: 'Maine',
    district: 'Maine — 1st District', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 52,
    office: 'U.S. House — 2026 Republican Nominee (Maine 1st District)',
    bio: "Ron Russell is the Republican nominee for Maine's 1st Congressional District, in a rematch with " +
      "nine-term Rep. Chellie Pingree. He grew up on a potato farm near Fort Fairfield in Aroostook County, " +
      "graduated from West Point, and served roughly 30 years in the U.S. Army as an Airborne Ranger and Special " +
      "Forces Green Beret with combat tours in Panama, Somalia, and Afghanistan, then founded a defense-" +
      "contracting company doing operations and intelligence work. He was the Republican nominee against Pingree " +
      "in 2024 and won the June 9, 2026 Republican primary about 54%–46% over Joshua Pietrowicz. He campaigns on " +
      "curtailing federal spending, making the 2025 tax law permanent, energy policy, and a strong national " +
      "defense.",
    keyIssues: ['Government spending', 'Taxes', 'Energy', 'National defense', 'Abortion'],
    accountability: { overallScore: 52, summary:
      "A retired Special Forces officer and defense-contracting founder making his second run for the seat. He " +
      "has no legislative voting record, so his positions are campaign pledges and are marked pending; the score " +
      "reflects that thinner record for the office sought, not the strength of his candidacy." },
    promises: [
      { title: 'Curtail federal spending to fight inflation', verdict: 'pending', issueKey: 'national_debt',
        detail: 'Says the country must "curtail our spending" to bring down inflation, citing his defense-contracting experience with federal budgets.', sources: ['https://www.mainepublic.org/politics/2026-04-17/your-vote-2026-profile-ron-russell-republican-for-1st-district'] },
      { title: 'Make the 2025 tax law permanent', verdict: 'pending', issueKey: 'lower_taxes',
        detail: 'Would make the 2025 tax-law changes permanent, add inflation adjustments for lower and middle brackets, and reduce small-business regulation.', sources: ['https://www.mainepublic.org/politics/2026-04-17/your-vote-2026-profile-ron-russell-republican-for-1st-district'] },
      { title: 'Roll back renewable-energy subsidies and mandates', verdict: 'pending', issueKey: 'enviro_energy',
        detail: 'Would remove subsidies for renewable energy and opposes mandates for specific energy sources, while supporting cost-competitive renewables.', sources: ['https://www.mainepublic.org/politics/2026-04-17/your-vote-2026-profile-ron-russell-republican-for-1st-district'] },
    ],
    positions: [
      { topic: 'Government Spending', icon: '📉', pos: 'support', issueKey: 'national_debt', issueStance: 'support',
        text: 'Says the country must "curtail our spending" to bring down inflation.', source: { label: 'Maine Public', url: 'https://www.mainepublic.org/politics/2026-04-17/your-vote-2026-profile-ron-russell-republican-for-1st-district' } },
      { topic: 'Taxes', icon: '💵', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Would make the 2025 tax-law changes permanent and add inflation adjustments for lower and middle brackets.', source: { label: 'Maine Public', url: 'https://www.mainepublic.org/politics/2026-04-17/your-vote-2026-profile-ron-russell-republican-for-1st-district' } },
      { topic: 'Energy', icon: '⚡', pos: 'support', issueKey: 'enviro_energy', issueStance: 'support',
        text: 'Would remove subsidies for renewable energy and opposes mandates for specific energy sources, while backing cost-competitive renewables.', source: { label: 'Maine Public', url: 'https://www.mainepublic.org/politics/2026-04-17/your-vote-2026-profile-ron-russell-republican-for-1st-district' } },
      { topic: 'National Defense & Foreign Aid', icon: '🎖', pos: 'support', issueKey: 'foreign_balance', issueStance: 'support',
        text: 'Opposes "indefinite" aid to Ukraine but supports vetted, oversight-conditioned assistance.',
        evidence: 'A West Point graduate who served about 30 years in the Army as an Airborne Ranger and Special Forces Green Beret.', source: { label: 'Maine Public', url: 'https://www.mainepublic.org/politics/2026-04-17/your-vote-2026-profile-ron-russell-republican-for-1st-district' } },
      { topic: 'Abortion', icon: '⚖️', pos: 'support', issueKey: 'repro_balance', issueStance: 'support',
        text: 'Said the Dobbs decision "was the right decision" but that he would not endorse a national abortion ban.', source: { label: 'NewsCenter Maine', url: 'https://www.newscentermaine.com/article/news/politics/elections/ron-russell-maine-1st-congressional-district-seat-election-voting-cd1/' } },
    ],
  },

  // ══════════════════ MAINE — 2nd District (OPEN: Golden retiring) ══════════════════

  // ---- Matt Dunlap (D) vs Paul LePage (R) ----
  {
    id: 'matt_dunlap', name: 'Matt Dunlap', party: 'Democratic', state: 'Maine',
    district: 'Maine — 2nd District', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 58,
    office: 'U.S. House — 2026 Democratic Nominee (Maine 2nd District)',
    bio: "Matt Dunlap is the Democratic nominee for Maine's 2nd Congressional District, the open northern and " +
      "rural seat that Rep. Jared Golden is leaving. From Bar Harbor, with bachelor's and master's degrees from " +
      "the University of Maine, he served four terms in the Maine House of Representatives, then was Maine " +
      "Secretary of State across two non-consecutive stints (2005–2011 and 2013–2021) and is currently the " +
      "elected Maine State Auditor. He entered the race in October 2025, before Golden announced his retirement, " +
      "and won the June 9, 2026 Democratic primary in a ranked-choice runoff over state Sen. Joe Baldacci, about " +
      "52.5%–47.5%, despite the national party backing Baldacci. He faces former Gov. Paul LePage in November and " +
      "campaigns on Medicare for All, universal child care, living wages, and protecting voting access.",
    keyIssues: ['Health care', 'Child care', 'Living wages', 'Voting access', 'Government transparency'],
    accountability: { overallScore: 58, summary:
      "A former four-term legislator, longtime Secretary of State, and current State Auditor with a deep record " +
      "in election administration and government accountability, but no federal voting record. The score " +
      "reflects that public-service depth for the office sought; his campaign pledges are marked pending." },
    promises: [
      { title: 'Pursue Medicare for All', verdict: 'pending', issueKey: 'healthcare',
        detail: 'Campaigns on Medicare for All as part of a stated "people\'s agenda."', sources: ['https://en.wikipedia.org/wiki/Matthew_Dunlap'] },
      { title: 'Establish universal child care and living wages', verdict: 'pending', issueKey: 'child_care',
        detail: 'Platform includes universal child care and living wages for working families.', sources: ['https://en.wikipedia.org/wiki/Matthew_Dunlap'] },
      { title: 'Protect and expand voting access', verdict: 'pending', issueKey: 'voting_access',
        detail: 'As Secretary of State implemented the MOVE Act giving military and overseas voters secure ballot access; pledges to protect voting access in Congress.', sources: ['https://en.wikipedia.org/wiki/Matthew_Dunlap'] },
    ],
    positions: [
      { topic: 'Health Care', icon: '🏥', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Campaigns on Medicare for All as part of a stated "people\'s agenda."', source: wiki('Matthew_Dunlap') },
      { topic: 'Child Care', icon: '🧸', pos: 'support', issueKey: 'child_care', issueStance: 'support',
        text: 'Platform includes universal child care for working families.', source: wiki('Matthew_Dunlap') },
      { topic: 'Living Wages', icon: '💵', pos: 'support', issueKey: 'econ_workers', issueStance: 'support',
        text: 'Calls for living wages for working families.', source: wiki('Matthew_Dunlap') },
      { topic: 'Voting Access', icon: '🗳', pos: 'support', issueKey: 'voting_access', issueStance: 'support',
        text: 'As Secretary of State implemented the MOVE Act to give military and overseas voters secure ballot access.',
        evidence: 'Served as Maine Secretary of State (2005–2011, 2013–2021) and is currently the elected Maine State Auditor.', source: wiki('Matthew_Dunlap') },
      { topic: 'Government Transparency', icon: '🔎', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support',
        text: 'Served on the 2017–2018 federal election-integrity commission, where he was a noted internal critic pressing for transparency.', source: wiki('Matthew_Dunlap') },
    ],
  },

  {
    id: 'paul_lepage', name: 'Paul LePage', party: 'Republican', state: 'Maine',
    district: 'Maine — 2nd District', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 60,
    office: 'U.S. House — 2026 Republican Nominee (Maine 2nd District)',
    bio: "Paul LePage is the Republican nominee for Maine's 2nd Congressional District, the open northern and " +
      "rural seat Rep. Jared Golden is leaving. Born in Lewiston as the eldest of 18 children, he was homeless as " +
      "a child before earning a business degree from Husson University and an MBA from the University of Maine " +
      "and becoming general manager of the discount retailer Marden's. He served on the Waterville City Council " +
      "and as the city's mayor before two terms as Governor of Maine from 2011 to 2019; he lost a 2022 comeback " +
      "bid statewide but carried the 2nd District. He announced his House campaign in May 2025 and ran unopposed " +
      "in the June 9, 2026 Republican primary. He faces Democrat Matt Dunlap in November and runs on tax cuts, " +
      "welfare and immigration limits, and energy policy, drawing on his record as governor.",
    keyIssues: ['Taxes', 'Welfare & Medicaid', 'Immigration', 'Energy', 'Fiscal restraint'],
    accountability: { overallScore: 60, summary:
      "A two-term former governor with an extensive executive record on taxes, welfare, and energy, but no " +
      "federal legislative voting record. The score reflects that executive depth for the office sought; his " +
      "campaign pledges are forward-looking and marked pending." },
    promises: [
      { title: 'Cut income taxes', verdict: 'pending', issueKey: 'lower_taxes',
        detail: 'As governor advocated eliminating Maine\'s income tax and supported a flat tax with a broadened sales base.', sources: ['https://en.wikipedia.org/wiki/Paul_LePage'] },
      { title: 'Tighten welfare and Medicaid eligibility', verdict: 'pending', issueKey: 'gov_services',
        detail: 'As governor vetoed Medicaid expansion repeatedly and backed work requirements and benefit limits for welfare.', sources: ['https://en.wikipedia.org/wiki/Paul_LePage'] },
      { title: 'Restrict benefits for undocumented immigrants', verdict: 'pending', issueKey: 'border_security',
        detail: 'As governor opposed asylum offers and opposed General Assistance funds going to undocumented immigrants.', sources: ['https://en.wikipedia.org/wiki/Paul_LePage'] },
    ],
    positions: [
      { topic: 'Taxes', icon: '💵', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'As governor advocated eliminating Maine\'s income tax and supported a flat tax with a broadened sales base.', source: wiki('Paul_LePage') },
      { topic: 'Welfare & Medicaid', icon: '🏥', pos: 'oppose', issueKey: 'gov_services', issueStance: 'oppose',
        text: 'As governor vetoed Medicaid expansion repeatedly and backed work requirements and benefit limits for welfare.', source: wiki('Paul_LePage') },
      { topic: 'Immigration', icon: '🛂', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: 'As governor opposed asylum offers and opposed General Assistance funds going to undocumented immigrants.', source: wiki('Paul_LePage') },
      { topic: 'Energy', icon: '⚡', pos: 'support', issueKey: 'enviro_energy', issueStance: 'support',
        text: 'Criticized wind power as a "boutique energy source" and favored fossil fuels and hydropower.', source: wiki('Paul_LePage') },
      { topic: 'Fiscal Restraint', icon: '🧹', pos: 'support', issueKey: 'gov_waste', issueStance: 'support',
        text: 'Set a state record with 642 vetoes as governor, many aimed at limiting spending.',
        evidence: 'His 642 vetoes exceeded the combined total of Maine governors since 1917.', source: wiki('Paul_LePage') },
    ],
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
  if (p.district) fields.district = p.district;
  if (p.rank) fields.rank = p.rank;
  if (p.quote) fields.quote = p.quote;
  if (p.candidacyOutcome) fields.candidacyOutcome = p.candidacyOutcome;
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
  out.push('    // ── U.S. House expansion · two-seat states, both nominees set (June 2026) ─────');
  out.push('    // Bottom-up by delegation size, pass two: two-seat states whose primaries have');
  out.push('    // CONCLUDED — Montana (MT-01/02), Idaho (ID-01/02), and Maine (ME-01/02). Each card');
  out.push('    // is keyed to an ISSUE_MAP issue so the profile is comparable in the Alignment Tool');
  out.push("    // and joins Stance at a Glance, the Evidence Locker, and the People's Mandate bridge.");
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
  console.log(`PolitiDex — U.S. House two-seat-states expansion  [${APPLY ? 'APPLY' : EMIT ? 'EMIT' : 'DRY RUN'}]\n`);
  let totPos = 0, totProm = 0, withEvid = 0;
  for (const p of PEOPLE) { totPos += p.positions.length; totProm += p.promises.length; withEvid += p.positions.filter(c => c.evidence || c.source).length; }
  console.log(`${PEOPLE.length} politicians · ${totPos} issue positions (${withEvid} with evidence/source) · ${totProm} promises\n`);

  // Validate every issueKey against the live ISSUE_MAP vocabulary in index.html.
  try {
    const html = (await import('fs')).readFileSync('alignment-tool.js', 'utf8');
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
    const f = '/tmp/house-2seat-states-stance-block.txt';
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
