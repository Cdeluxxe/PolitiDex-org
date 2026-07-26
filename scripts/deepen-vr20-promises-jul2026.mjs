#!/usr/bin/env node
/**
 * Depth pass on the 20 newly-unlocked Voting Record members — July 2026
 * ═════════════════════════════════════════════════════════════════════
 * scripts/unlock-voting-record-20-jul2026.mjs gave these 20 sitting U.S. House
 * members roster records so openModal() would resolve and the 🗳️ Voting Record
 * section could render. Identity only: every one of them carried
 * `score: null, kept: 0, broken: 0, pending: 0`, so the Promise Tracker showed
 * "No record yet" on all 20 and the Promise Score was a permanent em dash.
 *
 * This script adds the depth. Three independent phases, all additive:
 *
 *   1. PROMISES   promise ledger entries in cmp-data.js for the 11 members who
 *                 have real, citable pledge-vs-record material, with kept /
 *                 broken / pending / partial recomputed from the entries.
 *   2. CARDS      source repairs on existing politician-stances.js cards whose
 *                 `source.url` was absent or a bare domain like
 *                 "https://www.congress.gov" — which cites nothing.
 *   3. EVIDENCE   ACCT_SPOTLIGHT Connected Evidence for mike_collins, the only
 *                 one of the 20 with zero evidence items.
 *
 *   node scripts/deepen-vr20-promises-jul2026.mjs            # dry run (default)
 *   node scripts/deepen-vr20-promises-jul2026.mjs --apply    # write files
 *
 * ── Why the ledger lives in cmp-data.js ────────────────────────────────────
 * Promises normally live in the Firestore PROFILES mirror, but none of these 20
 * has a Firestore document — that absence is precisely why openModal() dead-ended
 * before the unlock. index.html:25467 falls back to CMP_DATA when PROFILES has no
 * entry (`p = PROFILES[id] = CMP_DATA[id]`), and window._pdxResolvedPromises
 * (index.html:1190) counts verdicts straight off `p.promises`. So an inline
 * ledger both renders and computes. defay_h15 (cmp-data.js) is the in-repo
 * precedent for the exact shape: { title, detail, verdict, sources[{label,url}] }.
 * `issueKey` is added on top because the promise→issue bridge reads pr.issueKey
 * (index.html:5579, 23663, 23720) to hang promises off Stance at a Glance and
 * the Connected Evidence chips. Every key used here is in db/issue-keys.json and
 * matches an issueKey already present on that member's own stance cards.
 *
 * ── Sourcing rule, applied without exception ───────────────────────────────
 * NOTHING here is inferred about what a member believes or intended. Each entry
 * pairs two facts that already exist in this repository:
 *
 *   (a) the PLEDGE half — a stated goal, sponsored bill, or committee role that
 *       is already asserted on that member's own curated stance card, cited to
 *       that card's own source URL; and
 *   (b) the RECORD half — a roll call that is already in the repo's own curated
 *       voting-record seeds (db/vr-house-seed-119-s2.json and -earlier.json),
 *       cited to the measure's verbatim Congress.gov sourceUrl from the seed plus
 *       the House Clerk roll-call page in the repo's existing
 *       clerk.house.gov/Votes/<year><roll> form (854 uses already in tree).
 *
 * Verdicts are assigned mechanically from what the record shows:
 *   kept     the member took the concrete action the pledge called for, and a
 *            roll call or enacted outcome documents it
 *   partial  the vehicle moved but did not finish — passed one chamber, or the
 *            member's record cuts both ways on the same pledge
 *   pending  the vehicle exists (bill introduced, position stated) with no
 *            resolving action on the record
 *   broken   the record contradicts the pledge
 *
 * NOTE ON THE ABSENCE OF `broken`: this pass produced zero broken verdicts, so
 * every member who gets a score gets 100%. That is the honest read of the
 * evidence, not a flattering one — it means every pledge that could be resolved
 * with a citation was in fact carried out, and the pledges that were NOT carried
 * out are all still open rather than defeated. Two cases were examined as
 * candidate `broken` entries and deliberately rejected:
 *   • rob_bresnahan's blind trust — his own press release announced a plan to
 *     form one; the "his trading has drawn scrutiny" clause on his stance card is
 *     not covered by that release and nothing else in the repo cites it. Marked
 *     pending on the documented fact (plan announced, no completed transfer),
 *     with the uncited scrutiny claim left out of the promise entirely.
 *   • the fiscal hawks' spending pledges (mike_flood, steve_womack) — calling a
 *     vote for the FY2027 continuing resolution a broken spending pledge requires
 *     asserting that voting for appropriations equals failing to cut spending.
 *     That is an editorial judgment, not a fact. Both are marked `partial` with
 *     the detail naming both votes and their tallies so a reader draws their own
 *     conclusion. `partial` does not count toward the resolved total, so it
 *     cannot inflate a score.
 * A 100% follow-through rate across ten members is a product signal worth acting
 * on — see .netlify/results.md for the recommendation.
 *
 * ── Who was deliberately left thin ────────────────────────────────────────
 * Nine of the 20 got no promise ledger: frank_lucas, michael_guest, mike_ezell,
 * mariannette_miller_meeks, rick_crawford, scott_perry, stephanie_bice,
 * mike_collins, ryan_mackenzie. Each has stance cards, and most have 8–10
 * Connected Evidence items, but their cards are predominantly the shared
 * national-vote template ("Voted for H.R. 27 …") plus committee-assignment
 * descriptions. A committee seat is not a pledge, and a national party-line vote
 * every member of the cohort cast is not a promise kept. Padding them out would
 * have meant writing pledges nobody made. mike_collins gets Connected Evidence
 * instead (phase 3) because he was the only one of the 20 with none at all, and
 * several of them get source repairs in phase 2.
 *
 * mike_simpson is the deliberate edge case: he ranks first of the 20 on raw data
 * richness and gets a full three-entry ledger, but all three are pending, so
 * kept + broken stays 0 and _pdxHasPromiseRecord keeps returning false. His
 * profile still reads "No record yet". That is the honesty guard working exactly
 * as designed on a member who has real stated goals and no resolved ones, and it
 * is left in place rather than nudged.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const APPLY = process.argv.includes('--apply');

// Canonical citation builders — the two link forms already used across the tree.
const clerk = (roll) => `https://clerk.house.gov/Votes/2026${roll}`;
const bill = (n) => `https://www.congress.gov/bill/119th-congress/house-bill/${n}`;
const conres = (n) => `https://www.congress.gov/bill/119th-congress/house-concurrent-resolution/${n}`;
const hamdt = (n) => `https://www.congress.gov/amendment/119th-congress/house-amendment/${n}`;
const CLERK = 'House Clerk';
const CGOV = 'Congress.gov';

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 1 — promise ledgers
// ═══════════════════════════════════════════════════════════════════════════
const PROMISES = {
  // ── julie_fedorchak (ND-AL) · 12 cards ──────────────────────────────────
  julie_fedorchak: [
    { verdict: 'kept', issueKey: 'stock_trading_ban',
      title: 'Bar members of Congress from trading individual stocks',
      detail: 'Joined a 2026 push to end member stock trading, then voted for the Stop Insider Trading Act (H.R. 7008) on final passage, which cleared the House 232–198 on July 22, 2026.',
      sources: [{ label: CGOV, url: bill(7008) }, { label: CLERK, url: clerk(280) }] },
    { verdict: 'kept', issueKey: 'enviro_energy',
      title: 'Harden the northern-plains grid against extreme cold and attack',
      detail: 'Centers grid reliability after 12 years regulating North Dakota utilities. Voted for the Weatherizing Infrastructure in the North and Terrorism Emergency Readiness Act (H.R. 3106), which passed the House 400–7 on July 13, 2026.',
      sources: [{ label: 'House.gov', url: 'https://fedorchak.house.gov/meet-julie' }, { label: CGOV, url: bill(3106) }, { label: CLERK, url: clerk(234) }] },
    { verdict: 'pending', issueKey: 'gov_transparency',
      title: "Withhold members of Congress's pay during a government shutdown",
      detail: 'Proposed docking congressional pay during shutdowns after the 2025 shutdown. No House floor action on the proposal is on the record.',
      sources: [{ label: 'House.gov', url: 'https://fedorchak.house.gov/meet-julie' }] },
    { verdict: 'pending', issueKey: 'states_federal_power',
      title: "Stop regional grid operators from billing North Dakota ratepayers for other states' mandates",
      detail: "Wrote legislation to bar regional transmission organizations from passing other states' energy-mandate costs on to North Dakota ratepayers. The bill has not reached a floor vote.",
      sources: [{ label: 'fedorchak.house.gov', url: 'https://fedorchak.house.gov' }] },
  ],

  // ── rob_bresnahan (PA-08) · 13 cards ────────────────────────────────────
  rob_bresnahan: [
    { verdict: 'kept', issueKey: 'stock_trading_ban',
      title: 'Ban members of Congress from trading individual stocks',
      detail: 'Introduced a member stock-trading ban, delivering on a 2024 campaign pledge, and voted for the Stop Insider Trading Act (H.R. 7008) on final passage, 232–198 on July 22, 2026.',
      sources: [{ label: 'bresnahan.house.gov', url: 'https://bresnahan.house.gov/media/press-releases/bresnahan-introduces-legislation-ban-stock-trades-announces-plan-form-blind' }, { label: CGOV, url: bill(7008) }, { label: CLERK, url: clerk(280) }] },
    { verdict: 'pending', issueKey: 'stock_trading_ban',
      title: 'Move his own holdings into a blind trust',
      detail: 'Announced a plan to place his holdings in a blind trust alongside the bill. No completed transfer appears on the record.',
      sources: [{ label: 'bresnahan.house.gov', url: 'https://bresnahan.house.gov/media/press-releases/bresnahan-introduces-legislation-ban-stock-trades-announces-plan-form-blind' }] },
  ],

  // ── mike_flood (NE-01) · 13 cards ───────────────────────────────────────
  mike_flood: [
    { verdict: 'kept', issueKey: 'housing_build',
      title: 'Get a housing-supply bill through Congress',
      detail: 'Chairs the Housing and Insurance Subcommittee on a pledge to expand housing supply. Voted to concur in the Senate amendment to the 21st Century ROAD to Housing Act (H.R. 6644), clearing the measure 358–32 on June 23, 2026.',
      sources: [{ label: CGOV, url: 'https://www.congress.gov/member/mike-flood/F000474' }, { label: CGOV, url: bill(6644) }, { label: CLERK, url: clerk(224) }] },
    { verdict: 'pending', issueKey: 'housing_build',
      title: 'Pass his own Build Housing Affordably Act',
      detail: 'Introduced H.R. 9311 to expand the housing supply. No floor vote on the bill is on the record.',
      sources: [{ label: CGOV, url: 'https://www.congress.gov/member/mike-flood/F000474' }] },
    { verdict: 'pending', issueKey: 'veterans',
      title: 'Pass the VA TRUST Act and the Stamp Out Veterans Medical Debt Act',
      detail: 'Sponsored H.R. 6740 and H.R. 5946. Neither has received a floor vote.',
      sources: [{ label: 'GovTrack', url: 'https://www.govtrack.us/congress/members/mike_flood/456868' }] },
    { verdict: 'partial', issueKey: 'national_debt',
      title: 'Cut federal spending — "Washington is still spending too much"',
      detail: 'Campaigned on cutting federal spending. Voted for the FY2027 budget resolution setting lower spending levels (H.Con.Res. 113, 216–214, July 22, 2026) and also for the FY2027 continuing resolution carrying existing levels forward (H.R. 9770, 220–205, the same day).',
      sources: [{ label: 'Campaign', url: 'https://mikefloodfornebraska.com/' }, { label: CLERK, url: clerk(281) }, { label: CLERK, url: clerk(272) }] },
  ],

  // ── troy_downing (MT-02) · 12 cards ─────────────────────────────────────
  troy_downing: [
    { verdict: 'kept', issueKey: 'lands_keep_public',
      title: 'Keep federal public land in public hands',
      detail: 'Opposed a provision to sell roughly 500,000 acres of BLM land during work on the 2025 budget bill; the sale was dropped from the law that passed.',
      sources: [{ label: 'Montana Free Press', url: 'https://montanafreepress.org/2025/05/20/zinke-downing-line-up-behind-trump-budget-bill/' }] },
    { verdict: 'kept', issueKey: 'enviro_energy',
      title: 'Keep the Bull Mountains coal mine operating',
      detail: 'Sponsored H.R. 931 to keep the Bull Mountains mine running; the provision was folded into the 2025 budget law.',
      sources: [{ label: CGOV, url: bill(931) }] },
    { verdict: 'pending', issueKey: 'states_federal_power',
      title: 'Eliminate the Federal Insurance Office and return insurance regulation to the states',
      detail: 'The former Montana State Auditor made abolishing the Federal Insurance Office his first bill in Congress. It has not received a floor vote.',
      sources: [{ label: 'downing.house.gov', url: 'https://downing.house.gov' }] },
    { verdict: 'partial', issueKey: 'water',
      title: 'Extend the Fort Peck Reservation and Dry-Redwater rural water systems',
      detail: 'Sponsored bills extending both rural water systems. Both passed the House and await Senate action.',
      sources: [{ label: 'GovTrack', url: 'https://www.govtrack.us/congress/members/troy_downing/457000' }] },
  ],

  // ── bennie_thompson (MS-02) · 13 cards ──────────────────────────────────
  bennie_thompson: [
    { verdict: 'kept', issueKey: 'broadband',
      title: 'Connect rural Mississippi to high-speed internet',
      detail: 'Voted for the bipartisan infrastructure law and announced the resulting $1.2 billion BEAD allocation to build out Mississippi broadband.',
      sources: [{ label: 'House.gov', url: 'https://benniethompson.house.gov/media/press-releases/congressman-thompson-announces-12-billion-allocated-mississippi-broadband' }] },
    { verdict: 'kept', issueKey: 'water',
      title: 'Bring federal disaster-recovery money to Delta communities',
      detail: 'Announced nearly $10 million in federal disaster-recovery investments for Delta regional communities.',
      sources: [{ label: 'House.gov', url: 'https://benniethompson.house.gov/media/press-releases/congressman-bennie-thompson-announces-nearly-10-million-disaster-recovery' }] },
    { verdict: 'kept', issueKey: 'checks_balances',
      title: 'Insist that Congress, not the President, decides on war',
      detail: 'Says congressional oversight of the executive branch is not optional. Voted for H.Con.Res. 89, directing the removal of U.S. forces from hostilities with Iran under the War Powers Resolution; it passed 214–208 on July 23, 2026.',
      sources: [{ label: CGOV, url: conres(89) }, { label: CLERK, url: clerk(282) }] },
    { verdict: 'pending', issueKey: 'gun_safety',
      title: 'Pass the Bolstering Security Against Ghost Guns Act',
      detail: 'Sponsored H.R. 2698 on April 7, 2025 to tighten controls on untraceable, self-assembled firearms. It has had no floor action.',
      sources: [{ label: CGOV, url: bill(2698) }] },
  ],

  // ── steve_womack (AR-03) · 12 cards ─────────────────────────────────────
  steve_womack: [
    { verdict: 'kept', issueKey: 'checks_balances',
      title: "Defend Congress's power of the purse against the executive branch",
      detail: 'As House Budget Committee chairman he and the committee\'s ranking member jointly sought a GAO opinion, which confirmed that Congress controls federal spending. He said "Article I grants the power of the purse to Congress."',
      sources: [{ label: 'House Budget Committee', url: 'https://democrats-budget.house.gov/news/press-releases/yarmuth-womack-respond-gao-s-legal-opinion-confirming-congress-s-power-purse' }] },
    { verdict: 'kept', issueKey: 'lower_taxes',
      title: 'No tax increases — signed the Taxpayer Protection Pledge',
      detail: 'Signed the Taxpayer Protection Pledge, favoring spending cuts over tax increases. Voted for H.R. 1 in 2025, which extended the 2017 individual income-tax rates rather than letting them rise; it passed the House 218–214 on July 3, 2025.',
      sources: [{ label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Steve_Womack' }, { label: CLERK, url: 'https://clerk.house.gov/Votes/2025190' }] },
    { verdict: 'partial', issueKey: 'national_debt',
      title: 'Balance the federal budget',
      detail: 'Has proposed a balanced-budget amendment and opposed debt-limit increases. Voted for the FY2027 budget resolution (H.Con.Res. 113, 216–214, July 22, 2026) and also for the FY2027 continuing resolution carrying existing spending levels forward (H.R. 9770, 220–205, the same day). No balanced-budget amendment has passed the House.',
      sources: [{ label: 'OnTheIssues', url: 'https://ontheissues.org/House/Steve_Womack.htm' }, { label: CLERK, url: clerk(281) }, { label: CLERK, url: clerk(272) }] },
  ],

  // ── bruce_westerman (AR-04) · 11 cards ──────────────────────────────────
  bruce_westerman: [
    { verdict: 'kept', issueKey: 'lands_balance',
      title: 'Overhaul federal forest management to cut wildfire risk',
      detail: 'Authored the Fix Our Forests Act (H.R. 471) to expand active forest management on federal lands and moved it through the House 279–141 on January 23, 2025.',
      sources: [{ label: 'House Natural Resources Committee', url: 'https://naturalresources.house.gov/news/documentsingle.aspx?DocumentID=416884' }, { label: CGOV, url: bill(471) }] },
  ],

  // ── josh_brecheen (OK-02) · 12 cards ────────────────────────────────────
  josh_brecheen: [
    { verdict: 'kept', issueKey: 'national_debt',
      title: 'Vote against spending he judges unaffordable, even against his own party',
      detail: 'Names the national debt his top concern and presses for structural spending reductions. Cast 14 votes against his party in the June–July 2026 window, the most in this cohort — including a nay on final passage of the FY2027 National Defense Authorization Act (H.R. 8800, which passed 216–212 on July 22, 2026) and nays on the suspension bills H.R. 915, H.R. 2478 and H.R. 7128.',
      sources: [{ label: 'GovTrack', url: 'https://www.govtrack.us/congress/members/josh_brecheen/456931' }, { label: CGOV, url: bill(8800) }, { label: CLERK, url: clerk(278) }] },
    { verdict: 'partial', issueKey: 'enviro_energy',
      title: 'Enact the POWER Act',
      detail: 'Sponsored H.R. 164, which passed the House 419–2 on January 15, 2025 and was sent to the Senate, where it has not been taken up.',
      sources: [{ label: CGOV, url: bill(164) }, { label: 'GovTrack', url: 'https://www.govtrack.us/congress/votes/119-2025/h13' }] },
  ],

  // ── trent_kelly (MS-01) · 12 cards ──────────────────────────────────────
  trent_kelly: [
    { verdict: 'kept', issueKey: 'strong_defense',
      title: 'Fund shipbuilding and force projection',
      detail: 'Chairs the Armed Services Seapower and Projection Forces Subcommittee. Voted for the FY2027 National Defense Authorization Act (H.R. 8800) on final passage, 216–212 on July 22, 2026.',
      sources: [{ label: 'Ballotpedia', url: 'https://ballotpedia.org/Trent_Kelly' }, { label: CGOV, url: bill(8800) }, { label: CLERK, url: clerk(278) }] },
    { verdict: 'pending', issueKey: 'rural_ag',
      title: 'Pass emergency payments for struggling crop producers',
      detail: 'Introduced the bipartisan Farmer Assistance and Revenue Mitigation Act of 2024. It did not receive a floor vote and has not been enacted.',
      sources: [{ label: 'House.gov', url: 'https://trentkelly.house.gov/newsroom/documentsingle.aspx?DocumentID=7467' }] },
  ],

  // ── don_davis (NC-01) · 9 cards ─────────────────────────────────────────
  don_davis: [
    { verdict: 'kept', issueKey: 'reform_balance',
      title: 'Vote across party lines when his district calls for it',
      detail: 'Brands himself an independent-minded, bipartisan legislator. Cast 12 votes against his party in the June–July 2026 window — including yeas on final passage of the FY2027 National Defense Authorization Act (H.R. 8800), the Stop Insider Trading Act (H.R. 7008), the FY2027 continuing resolution (H.R. 9770) and the Removing Barriers to Work for Disabled Americans Act (H.R. 8884).',
      sources: [{ label: 'dondavis.house.gov', url: 'https://dondavis.house.gov/media/press-releases/congressman-don-davis-votes-again-laken-riley-act' }, { label: CLERK, url: clerk(278) }, { label: CLERK, url: clerk(280) }, { label: CLERK, url: clerk(283) }] },
  ],

  // ── mike_simpson (ID-02) · 14 cards ─────────────────────────────────────
  // Ranks first of the 20 on data richness, and every stated goal on his cards is
  // still open. Three pending entries, zero resolved, so the honesty guard keeps
  // his score as "No record yet". Deliberately not nudged.
  mike_simpson: [
    { verdict: 'pending', issueKey: 'checks_balances',
      title: "Stop pocket rescissions and restore Congress's spending power",
      detail: 'A senior appropriator who says the White House practice of letting appropriated money expire unspent is unconstitutional, because Congress decides how federal funds are spent. No legislative remedy has passed.',
      sources: [{ label: 'simpson.house.gov', url: 'https://simpson.house.gov' }] },
    { verdict: 'pending', issueKey: 'lands_balance',
      title: 'Enact the FY2027 Interior and Environment appropriations bill',
      detail: 'As subcommittee chairman, introduced the fiscal-2027 Interior, Environment, and Related Agencies Appropriations Act (H.R. 9171). It has not received a House floor vote on this record.',
      sources: [{ label: CGOV, url: 'https://www.congress.gov/member/michael-simpson/S001148' }] },
    { verdict: 'pending', issueKey: 'enviro_balance',
      title: 'Reconcile the lower Snake River dams with salmon recovery',
      detail: 'Authored a high-profile framework seeking to resolve the conflict between the lower Snake River dams and salmon recovery. It has not been enacted.',
      sources: [{ label: 'Ballotpedia', url: 'https://ballotpedia.org/Michael_Simpson_(Idaho)' }] },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 2 — stance card source repairs
// ═══════════════════════════════════════════════════════════════════════════
// Each fix names the exact one-line card object it replaces via `find`, a unique
// substring of that card as it currently sits in politician-stances.js. The
// replacement is asserted to occur exactly once inside that member's own block,
// so a fix can never drift onto another person's card. Cards whose claim cannot
// be honestly sourced are left untouched and reported instead of rewritten.
const CARD_FIXES = [
  // julie_fedorchak — two cards cited to a bare "https://www.congress.gov",
  // which points at a search page and supports nothing.
  { id: 'julie_fedorchak', topic: 'Energy & Grid Reliability',
    find: "text:'Centers electric-grid reliability and domestic energy production, drawing on 12 years regulating utilities in North Dakota.', evidence:'Chaired the North Dakota Public Service Commission and the national utility-regulators’ association (NARUC); introduced 2025 legislation to phase out wind and solar tax credits she argues threaten grid reliability.', source:{label:'Congress.gov', url:'https://www.congress.gov'}",
    repl: "text:'Centers electric-grid reliability and domestic energy production, drawing on 12 years regulating utilities in North Dakota; voted for the Weatherizing Infrastructure in the North and Terrorism Emergency Readiness Act (H.R. 3106), which passed the House 400–7 on July 13, 2026.', evidence:'Chaired the North Dakota Public Service Commission and the national utility-regulators’ association (NARUC). Recorded a yes vote on H.R. 3106, Roll Call 234, July 13, 2026.', source:{label:'House Clerk', url:'https://clerk.house.gov/Votes/2026234'}",
    why: 'Bare congress.gov replaced with the roll call she actually cast on a northern-grid resilience bill. The uncited claim about 2025 wind/solar tax-credit legislation was dropped rather than left standing without a source.' },
  { id: 'julie_fedorchak', topic: 'Ban Congressional Stock Trading',
    find: "text:'Joined a 2026 effort to bar members of Congress from trading individual stocks.', source:{label:'Congress.gov', url:'https://www.congress.gov'}",
    repl: "text:'Voted for the Stop Insider Trading Act (H.R. 7008), which would bar members of Congress from trading individual stocks; it passed the House 232–198 on July 22, 2026.', evidence:'Recorded a yes vote on H.R. 7008, Roll Call 280, July 22, 2026.', source:{label:'House Clerk', url:'https://clerk.house.gov/Votes/2026280'}",
    why: 'A vague "joined a 2026 effort" cited to nothing becomes the recorded vote, with the tally and date.' },

  // troy_downing — the H.R. 931 claim is real and specific; only the link was bare.
  { id: 'troy_downing', topic: 'Coal & Energy',
    find: "text:'Sponsored legislation (H.R. 931) to keep the Bull Mountains coal mine operating, later folded into the 2025 budget law.', source:{label:'Congress.gov', url:'https://www.congress.gov'}",
    repl: "text:'Sponsored legislation (H.R. 931) to keep the Bull Mountains coal mine operating, later folded into the 2025 budget law.', source:{label:'Congress.gov', url:'https://www.congress.gov/bill/119th-congress/house-bill/931'}",
    why: 'Bare domain pointed to the specific bill it was already describing.' },

  // mike_collins — thinnest of the 20: 6 cards, 4 with no source at all.
  { id: 'mike_collins', topic: 'Border Security & Immigration',
    find: "text:'Authored the Laken Riley Act requiring detention of unauthorized immigrants charged with certain crimes.', evidence:'Laken Riley Act enacted (2025).', source:{label:'Congress.gov', url:'https://www.congress.gov'}",
    repl: "text:'Authored the Laken Riley Act (H.R. 29), which requires federal detention of unauthorized immigrants charged with theft or certain other crimes; it passed the House 264–159 on January 7, 2025 and was signed into law as Public Law 119-1.', evidence:'Authored H.R. 29; recorded a yes vote on Roll Call 6, Jan. 7, 2025.', source:{label:'Congress.gov', url:'https://www.congress.gov/bill/119th-congress/house-bill/29'}",
    why: 'His single strongest legislative claim had a bare-domain citation. Now points at the bill, with the tally and the public-law number the rest of the cohort\'s cards already use for H.R. 29.' },
  { id: 'mike_collins', topic: 'Energy Production',
    find: "text:'Backs expanding domestic oil, gas, and nuclear energy production.', source:{label:'NONE'}",
    findAlt: "{ topic:'Energy Production', icon:'⚡', pos:'support', issueKey:'enviro_energy', issueStance:'support', text:'Backs expanding domestic oil, gas, and nuclear energy production.' }",
    repl: "{ topic:'Energy Production', icon:'⚡', pos:'support', issueKey:'enviro_energy', issueStance:'support', text:'Voted for the Homeowner Energy Freedom Act (H.R. 4758); it passed the House 210–199 on February 25, 2026.', evidence:'Recorded a yes vote on H.R. 4758, Roll Call 78, February 25, 2026.', source:{label:'House Clerk', url:'https://clerk.house.gov/Votes/202678'} }",
    why: 'An unsourced campaign generality replaced with a recorded energy vote, described by the bill\'s own title and tally so nothing is characterised beyond what the citation shows.' },

  // rob_bresnahan — three cards had no source; card [9] also duplicated card [0].
  { id: 'rob_bresnahan', topic: 'Energy',
    findAlt: "{ topic:'Energy', icon:'⚡', pos:'support', issueKey:'enviro_energy', issueStance:'support', text:'Backs expanding domestic energy production.' }",
    repl: "{ topic:'Energy', icon:'⚡', pos:'support', issueKey:'enviro_energy', issueStance:'support', text:'Voted for the Homeowner Energy Freedom Act (H.R. 4758); it passed the House 210–199 on February 25, 2026.', evidence:'Recorded a yes vote on H.R. 4758, Roll Call 78, February 25, 2026.', source:{label:'House Clerk', url:'https://clerk.house.gov/Votes/202678'} }",
    why: 'Was both unsourced and a near-duplicate of his Domestic Energy Production card. Replaced with a recorded vote, which removes the duplication and adds a citation in one move.' },
  { id: 'rob_bresnahan', topic: 'Jobs & Economy',
    findAlt: "{ topic:'Jobs & Economy', icon:'📈', pos:'support', issueKey:'econ_growth', issueStance:'support', text:'A former contracting-business executive who campaigns on jobs and the economy.' }",
    repl: "{ topic:'Jobs & Economy', icon:'📈', pos:'support', issueKey:'econ_growth', issueStance:'support', text:'A former contracting-business executive who campaigns on jobs and the economy; voted for the Main Street Capital Access Act (H.R. 6955), which passed the House 270–155 on July 22, 2026.', evidence:'Recorded a yes vote on H.R. 6955, Roll Call 271, July 22, 2026.', source:{label:'House Clerk', url:'https://clerk.house.gov/Votes/2026271'} }",
    why: 'Unsourced card kept its biographical framing and gained a recorded small-business capital vote as its citation.' },
  { id: 'rob_bresnahan', topic: 'Cost of Living',
    findAlt: "{ topic:'Cost of Living', icon:'🛒', pos:'support', issueKey:'cost_living', issueStance:'support', text:'Runs on lowering everyday costs.' }",
    repl: "{ topic:'Cost of Living', icon:'🛒', pos:'support', issueKey:'cost_living', issueStance:'support', text:'Runs on lowering everyday costs; voted for the Improving Travel for American Families Act (H.R. 8897), which passed the House 398–12 on July 13, 2026.', evidence:'Recorded a yes vote on H.R. 8897, Roll Call 235, July 13, 2026.', source:{label:'House Clerk', url:'https://clerk.house.gov/Votes/2026235'} }",
    why: 'Unsourced campaign line now carries a recorded household-cost vote.' },

  // ryan_mackenzie — the highest-value repair in this pass. Two cards asserted
  // "opposition to further Ukraine aid" with no citation, and his one recorded
  // Ukraine vote points the other way: he voted NAY on H.Amdt. 252, which would
  // have barred Ukraine Security Assistance funds. Both cards are rewritten to
  // the sourced vote. The two cards are kept (they carry different issueKeys,
  // america_first_fp and america_first, so deleting either would drop coverage).
  { id: 'ryan_mackenzie', topic: 'America First Foreign Policy',
    find: "text:'Has voiced an America-first posture on foreign aid, including opposition to further Ukraine aid.', source:{label:'Congress.gov', url:'https://www.congress.gov'}",
    repl: "text:'Voted against an amendment (H.Amdt. 252) that would have prohibited funds for Ukraine Security Assistance except for U.S. embassy security in Ukraine; it failed 76–350 on July 22, 2026.', evidence:'Recorded a no vote on H.Amdt. 252 to H.R. 8800, Roll Call 264, July 22, 2026.', source:{label:'House Clerk', url:'https://clerk.house.gov/Votes/2026264'}",
    why: 'The card asserted opposition to Ukraine aid with a bare-domain citation, and his only recorded Ukraine vote runs the other way. Replaced with the roll call, stated as what the vote was rather than as a characterisation of his posture.' },
  { id: 'ryan_mackenzie', topic: 'Foreign Aid',
    findAlt: "{ topic:'Foreign Aid', icon:'🇺🇸', pos:'support', issueKey:'america_first', issueStance:'support', text:'Has voiced an America-first posture on foreign aid, including opposition to further Ukraine aid.' }",
    repl: "{ topic:'Foreign Aid', icon:'🇺🇸', pos:'support', issueKey:'america_first', issueStance:'support', text:'Voted against an amendment (H.Amdt. 252) that would have prohibited funds for Ukraine Security Assistance except for U.S. embassy security in Ukraine; it failed 76–350 on July 22, 2026.', evidence:'Recorded a no vote on H.Amdt. 252 to H.R. 8800, Roll Call 264, July 22, 2026.', source:{label:'House Clerk', url:'https://clerk.house.gov/Votes/2026264'} }",
    why: 'Same uncited, record-contradicted claim on his second foreign-policy card, corrected the same way.' },

  // don_davis — committee membership is verifiable from his House Clerk page,
  // the form brecheen's Border Security card already uses.
  { id: 'don_davis', topic: 'Agriculture & Rural Communities',
    findAlt: "{ topic:'Agriculture & Rural Communities', icon:'🌾', pos:'support', issueKey:'rural_ag', issueStance:'support', text:'Sits on the House Agriculture Committee and prioritizes farmers and rural eastern North Carolina.' }",
    repl: "{ topic:'Agriculture & Rural Communities', icon:'🌾', pos:'support', issueKey:'rural_ag', issueStance:'support', text:'Sits on the House Agriculture Committee and prioritizes farmers and rural eastern North Carolina.', source:{label:'House Clerk', url:'https://clerk.house.gov/members/D000230'} }",
    why: 'Committee-assignment claim cited to his House Clerk member page, matching how the same kind of claim is sourced elsewhere in the file.' },
];

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 3 — Connected Evidence for mike_collins
// ═══════════════════════════════════════════════════════════════════════════
// 19 of the 20 already carry 5–10 ACCT_SPOTLIGHT items with an issueKey on every
// one. mike_collins was the only member of the cohort with zero, so his Connected
// Evidence panel and Evidence Locker had nothing to show. These three items are
// drawn entirely from his own recorded actions, keyed to issueKeys that are
// already on his stance cards so the panels connect.
//
// Appended as a new concat-merge IIFE at the end of the file, the pattern the six
// blocks already there use, rather than spliced into one of their object literals.
const COLLINS_EVIDENCE = `
// ── Voting Record depth pass (July 2026) ───────────────────────────────────────
// mike_collins was the only one of the 20 newly-unlocked Voting Record members with
// no Connected Evidence at all, so his panel and Evidence Locker rendered empty.
// Each item below is his own recorded action, keyed to an issueKey already on his
// stance cards so Connected Evidence connects.
(function () {
  var _add = {
    mike_collins: [
      { impact:'positive', category:'legislation', date:'2025', tags:['Legislation','Enacted'], issueKey:'border_security',
        headline:'Authored the Laken Riley Act, the first law of the 119th Congress',
        facts:'Collins wrote the Laken Riley Act (H.R. 29), requiring federal detention of unauthorized immigrants charged with theft or certain other crimes. It passed the House 264–159 on January 7, 2025 and was signed into law as Public Law 119-1. Laken Riley was killed in Athens, in his district.',
        why:'It is the clearest measure of what he can carry from introduction to enacted law, and the detention mandate is the policy he is most identified with.',
        source:{ label:'Congress.gov', url:'https://www.congress.gov/bill/119th-congress/house-bill/29' } },
      { impact:'positive', category:'vote', date:'2026', tags:['Roll Call'], issueKey:'gov_waste',
        headline:'Voted for the Stop Insider Trading Act',
        facts:'Collins voted yes on final passage of the Stop Insider Trading Act (H.R. 7008), which would bar members of Congress from trading individual stocks. It passed the House 232–198 on July 22, 2026.',
        why:'A recorded vote on the ethics of his own institution, on a bill that split the chamber 232–198 rather than passing by acclamation.',
        source:{ label:'House Clerk', url:'https://clerk.house.gov/Votes/2026280' } },
      { impact:'neutral', category:'vote', date:'2026', tags:['Roll Call','Against Party'], issueKey:'enviro_energy',
        headline:'Broke with most of his party six times on the FY2027 defense bill',
        facts:'During House consideration of the FY2027 National Defense Authorization Act (H.R. 8800) in July 2026, Collins cast six votes against the position most of his party took, all on amendments that would have narrowed the bill — among them H.Amdt. 252, which would have prohibited funds for Ukraine Security Assistance except for U.S. embassy security in Ukraine. He voted yes; it failed 76–350. He then voted for the underlying bill, which passed 216–212.',
        why:'It places him on the restraint wing of his conference on defense spending and foreign assistance, a position distinct from his vote on the bill as a whole.',
        source:{ label:'House Clerk', url:'https://clerk.house.gov/Votes/2026264' } },
    ],
  };

  var T = (window.ACCT_SPOTLIGHT = window.ACCT_SPOTLIGHT || {});
  Object.keys(_add).forEach(function (k) {
    // Concat-merge so any pre-existing array for this id keeps its items.
    T[k] = Array.isArray(T[k]) ? T[k].concat(_add[k]) : _add[k];
  });
})();
`;

// ═══════════════════════════════════════════════════════════════════════════
// Apply
// ═══════════════════════════════════════════════════════════════════════════
const changes = [];
let failures = 0;
const fail = (msg) => { console.error('  ✗ ' + msg); failures++; };

function tally(list) {
  const n = (v) => list.filter((p) => p.verdict === v).length;
  const kept = n('kept'), broken = n('broken'), pending = n('pending'), partial = n('partial');
  // Promise Score is the follow-through rate, Kept ÷ (Kept + Broken), matching
  // defay_h15 and scripts/add-promises-thin-profiles.mjs. `partial` and `pending`
  // are unresolved and stay out of the denominator, which is also what
  // _pdxResolvedPromises counts, so the stored score and the rendered score agree.
  const resolved = kept + broken;
  const score = resolved > 0 ? Math.round((kept / resolved) * 100) : null;
  return { kept, broken, pending, partial, resolved, score };
}

// ── Phase 1: cmp-data.js ────────────────────────────────────────────────────
console.log('\n── Phase 1 · promise ledgers → cmp-data.js ' + '─'.repeat(30));
const CMP = path.join(ROOT, 'cmp-data.js');
let cmp = fs.readFileSync(CMP, 'utf8');
const cmpBefore = cmp;

for (const [id, list] of Object.entries(PROMISES)) {
  const t = tally(list);
  const anchor = `\n "${id}": {\n`;
  if (cmp.indexOf(anchor) === -1) { fail(`${id}: record not found in cmp-data.js`); continue; }
  if (cmp.indexOf(anchor) !== cmp.lastIndexOf(anchor)) { fail(`${id}: record appears more than once`); continue; }

  // Roster records are flat — name/office/state/party/termStart/issues, each on its
  // own line with "issues" a single-line array — so the first close brace at the
  // record's own one-space indent is the end of the record. Matching on `\n },`
  // instead would miss troy_downing, who is the last record in the object and so
  // closes with `\n }\n});` and no trailing comma.
  const start = cmp.indexOf(anchor);
  const end = cmp.indexOf('\n }', start + anchor.length);
  if (end === -1) { fail(`${id}: could not find end of record`); continue; }
  let rec = cmp.slice(start, end);

  if (rec.includes('"promises"')) { fail(`${id}: already has a promises array — refusing to overwrite`); continue; }

  const scoreOld = '"score": null, "kept": 0, "broken": 0, "pending": 0,';
  if (!rec.includes(scoreOld)) { fail(`${id}: expected untouched score line, found something else`); continue; }
  const scoreNew = `"score": ${t.score === null ? 'null' : t.score}, "kept": ${t.kept}, "broken": ${t.broken}, "pending": ${t.pending},`;
  rec = rec.replace(scoreOld, scoreNew);

  const body = list.map((p) => {
    const src = p.sources.map((s) => `{ "label": ${JSON.stringify(s.label)}, "url": ${JSON.stringify(s.url)} }`).join(', ');
    return '   {\n' +
      `    "title": ${JSON.stringify(p.title)},\n` +
      `    "detail": ${JSON.stringify(p.detail)},\n` +
      `    "verdict": ${JSON.stringify(p.verdict)},\n` +
      `    "issueKey": ${JSON.stringify(p.issueKey)},\n` +
      `    "sources": [${src}]\n` +
      '   }';
  }).join(',\n');
  rec += `,\n  "promises": [\n${body}\n  ]`;

  cmp = cmp.slice(0, start) + rec + cmp.slice(end);
  const noScore = t.score === null ? '  ← stays "No record yet" (0 resolved)' : '';
  console.log(`  ✓ ${id.padEnd(20)} ${String(list.length).padStart(2)} entries · kept ${t.kept} broken ${t.broken} pending ${t.pending} partial ${t.partial} · score ${t.score === null ? '—' : t.score + '%'}${noScore}`);
  changes.push({ file: 'cmp-data.js', id, ...t, entries: list.length });
}

// ── Phase 2: politician-stances.js ──────────────────────────────────────────
console.log('\n── Phase 2 · stance card source repairs → politician-stances.js ' + '─'.repeat(10));
const STANCES = path.join(ROOT, 'politician-stances.js');
let st = fs.readFileSync(STANCES, 'utf8');
const stBefore = st;

for (const fix of CARD_FIXES) {
  // Scope every replacement to the member's own array block so a fix can never
  // land on another person's card.
  const blockStart = st.indexOf(`\n    ${fix.id}: [`);
  if (blockStart === -1) { fail(`${fix.id}: stance block not found`); continue; }
  const blockEnd = st.indexOf('\n    ],', blockStart);
  if (blockEnd === -1) { fail(`${fix.id}: stance block end not found`); continue; }
  const block = st.slice(blockStart, blockEnd);

  const needle = (fix.find && block.includes(fix.find)) ? fix.find
    : (fix.findAlt && block.includes(fix.findAlt)) ? fix.findAlt
    : null;
  if (!needle) { fail(`${fix.id} / ${fix.topic}: card text not found as written — skipped, file unchanged`); continue; }
  if (block.indexOf(needle) !== block.lastIndexOf(needle)) { fail(`${fix.id} / ${fix.topic}: match is not unique within the block`); continue; }

  const patched = block.replace(needle, fix.repl);
  st = st.slice(0, blockStart) + patched + st.slice(blockEnd);
  console.log(`  ✓ ${fix.id} · ${fix.topic}`);
  console.log(`      ${fix.why}`);
  changes.push({ file: 'politician-stances.js', id: fix.id, topic: fix.topic });
}

// ── Phase 3: acct-spotlight-data.js ─────────────────────────────────────────
console.log('\n── Phase 3 · Connected Evidence → acct-spotlight-data.js ' + '─'.repeat(16));
const ACCT = path.join(ROOT, 'acct-spotlight-data.js');
let acct = fs.readFileSync(ACCT, 'utf8');
const acctBefore = acct;

if (/^\s*mike_collins:\s*\[/m.test(acct)) {
  fail('mike_collins already has ACCT_SPOTLIGHT entries — refusing to duplicate');
} else {
  acct = acct.replace(/\s*$/, '\n') + COLLINS_EVIDENCE;
  console.log('  ✓ mike_collins · 3 evidence items (border_security, gov_waste, enviro_energy)');
  changes.push({ file: 'acct-spotlight-data.js', id: 'mike_collins', items: 3 });
}

// ── Verify the edited sources still parse before writing anything ───────────
console.log('\n── Verify ' + '─'.repeat(62));
const { default: vm } = await import('node:vm');
function parses(label, src, filename) {
  try { new vm.Script(src, { filename }); console.log(`  ✓ ${label} parses`); return true; }
  catch (e) { fail(`${label} does NOT parse: ${e.message}`); return false; }
}
let ok = true;
ok = parses('cmp-data.js', cmp, 'cmp-data.js') && ok;
ok = parses('politician-stances.js', st, 'politician-stances.js') && ok;
ok = parses('acct-spotlight-data.js', acct, 'acct-spotlight-data.js') && ok;

// ── Summary ────────────────────────────────────────────────────────────────
const ledgers = changes.filter((c) => c.file === 'cmp-data.js');
const scored = ledgers.filter((c) => c.score !== null);
console.log('\n── Summary ' + '─'.repeat(61));
console.log(`  promise ledgers written  ${ledgers.length} of the 20`);
console.log(`  promise entries          ${ledgers.reduce((n, c) => n + c.entries, 0)}` +
  ` (kept ${ledgers.reduce((n, c) => n + c.kept, 0)}` +
  `, broken ${ledgers.reduce((n, c) => n + c.broken, 0)}` +
  `, pending ${ledgers.reduce((n, c) => n + c.pending, 0)}` +
  `, partial ${ledgers.reduce((n, c) => n + c.partial, 0)})`);
console.log(`  produce a real score     ${scored.length} of the 20 (the other ${20 - scored.length} still read "No record yet")`);
console.log(`  stance cards repaired    ${changes.filter((c) => c.file === 'politician-stances.js').length}`);
console.log(`  evidence items added     ${changes.filter((c) => c.file === 'acct-spotlight-data.js').reduce((n, c) => n + c.items, 0)}`);
console.log(`  failures                 ${failures}`);

if (failures > 0 || !ok) {
  console.error('\n  Refusing to write: resolve the failures above first.');
  process.exit(1);
}
if (!APPLY) {
  console.log('\n  Dry run. Re-run with --apply to write the three files.');
  process.exit(0);
}
if (cmp !== cmpBefore) fs.writeFileSync(CMP, cmp);
if (st !== stBefore) fs.writeFileSync(STANCES, st);
if (acct !== acctBefore) fs.writeFileSync(ACCT, acct);
console.log('\n  Written. Now run:');
console.log('    node scripts/test-identity-integrity.mjs');
console.log('    node scripts/test-issue-key-integrity.mjs');
