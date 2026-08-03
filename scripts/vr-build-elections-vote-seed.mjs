#!/usr/bin/env node
// ---------------------------------------------------------------------------
// vr-build-elections-vote-seed.mjs — roll calls for the two election facets
// ---------------------------------------------------------------------------
// `election_security` was added to ISSUE_MAP alongside the existing `voting_access`
// so that election administration could be scored as TWO facets rather than one
// left-right axis (see the keys' comments in alignment-tool.js). A facet with no
// votes behind it ranks nobody, so this script fetches the floor record.
//
//   node scripts/vr-build-elections-vote-seed.mjs   # writes db/vr-elections-vote-seed.json
//
// THE TWO FACETS, AND WHAT COUNTS AS EACH
// ---------------------------------------
//   election_security — eligibility verification (documentary proof of citizenship,
//     ID), voter-roll maintenance, ballot chain-of-custody and handling rules,
//     post-election audits, and enforcement against fraud or non-citizen voting.
//     yea_supports = the vote favours tighter safeguards.
//   voting_access — registration ease (automatic, same-day, online), early voting,
//     mail ballots and drop boxes, and reduced procedural barriers to casting.
//     yea_supports = the vote favours easier registration or casting.
//
// A measure may test one facet, both, or neither. Where it tests both, each facet gets
// its own direction — H.R. 8281 is election_security yea_supports AND voting_access
// yea_opposes, because a documentary requirement at the registration step is both a
// tighter check and a new barrier. Nothing here couples the two.
//
// WHERE A FACET IS DECLINED ON A MEASURE THAT PLAINLY TOUCHES IT
// -------------------------------------------------------------
// Three of the seven measures contain an election-security title AND cut against it
// inside the same bill. H.R. 1 and H.R. 5746 each mandate durable paper ballots,
// risk-limiting audits and ballot chain-of-custody rules — squarely pro-safeguard —
// while in the same text permitting a sworn statement in lieu of documentary ID and
// restricting voter-roll purges. A single yea on such a bill records no direction on
// the safeguard facet, because the member said yes to both halves at once. Those
// measures are therefore mapped to voting_access ONLY, and the declined facet is
// recorded with its reason in `declinedFacets` rather than left to look like an
// oversight. Forcing a direction there is exactly the "one blended verdict" failure
// the two-facet model exists to avoid.
//
// EVERY ROLL VERIFIED AGAINST THE CHAMBER'S OWN RECORD
// ---------------------------------------------------
// Candidate rolls were found by scanning the Clerk's own yearly roll-call indexes
// (clerk.house.gov/evs/<year>/ROLL_*.asp) for every 2021-2025 vote whose issue,
// question or title mentions voting, ballots, elections, registration or citizenship,
// then each is re-fetched from clerk.house.gov/evs and DROPPED, loudly, unless the
// fetched document's <legis-num> matches the measure the selection claims and its
// <vote-question> is one of the admitted decisive forms. One selection depends on that
// check: H.R. 5746's vote-desc still reads "NASA Enhanced Use Leasing Extension Act of
// 2021", the shell the Freedom to Vote: John R. Lewis Act was moved in, so the title is
// no guide and only the citation and question can confirm the roll.
//
// NO SENATE ROLL CALL QUALIFIES, AND THAT IS THE FINDING
// -----------------------------------------------------
// The Senate's only two election-administration votes in this window are cloture
// motions that failed: 117/1 roll 246 on the motion to proceed to S. 2093 (50-50) and
// 117/2 roll 9 on the motion to concur in H.R. 5746 (49-51). The runbook's standing
// rule excludes cloture — "cloture motions say nothing about whether a member supports
// what a bill does" — and it is not relaxed here for the convenience of having Senate
// coverage. The consequence is real and is reported rather than papered over: no
// senator is rankable on either facet from this pass.
//
// ATTRIBUTION IS FAIL-CLOSED
// -------------------------
// House XML carries a bioguide id per legislator, so attribution is a direct
// db/vr-member-map.json lookup; an unmapped member is skipped and counted, never
// guessed. `isParty` is computed from the FULL chamber list before the roster filter,
// so a 101-member subset can never invent a party crossover, and `totals` is always the
// full chamber tally.
// ---------------------------------------------------------------------------
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const memberMap = JSON.parse(readFileSync(resolve(REPO, "db/vr-member-map.json"), "utf8"));
const MAP = memberMap.map || {};

const CG = (c, kind, n) => `https://www.congress.gov/bill/${c}th-congress/${kind}/${n}`;
const BS = (c, t, n) => `https://www.govinfo.gov/bulkdata/BILLSTATUS/${c}/${t}/BILLSTATUS-${c}${t}${n}.xml`;

// ── The seven roll calls ────────────────────────────────────────────────────
// Priority order per the mission: enacted laws first, then contested passage votes,
// then major directional amendments. There are NO enacted federal election-
// administration laws in the 117th-119th window — see `enactedLawFinding` below — so
// the inventory opens at contested passage. No amendment roll survived the near-
// unanimity and mapping tests; the ones considered are in DECLINED.
const SELECTIONS = [
  {
    number: "H.R. 22", measureType: "bill", congress: 119, chamber: "house",
    session: 1, roll: 102, actionType: "passage",
    mustExist: "already live as the SAVE Act, created by the 119th-Congress measure ingest",
  },
  {
    number: "H.R. 8281", measureType: "bill", congress: 118, chamber: "house",
    session: 2, roll: 345, actionType: "passage",
    create: {
      title: "Safeguard American Voter Eligibility Act",
      shortTitle: "SAVE Act (118th)",
      summary:
        "Amends the National Voter Registration Act to require documentary proof of United States "
        + "citizenship before a state may register an applicant to vote in a federal election, "
        + "requires states to establish a program to identify and remove non-citizens from existing "
        + "registration lists using federal immigration and Social Security databases, and creates "
        + "criminal penalties for election officials who register an applicant without the "
        + "documentation. Passed the House 221-198 on 2024-07-10 with five Democrats voting yea; the "
        + "Senate did not take it up. Reintroduced in the 119th Congress as H.R. 22.",
      introducedAt: "2024-05-07", status: "passed_house",
      sourceUrl: CG(118, "house-bill", 8281), sourceLabel: "Congress.gov",
      externalIds: { congressGovId: "hr8281-118", billStatus: BS(118, "hr", 8281) },
    },
  },
  {
    number: "H.R. 884", measureType: "bill", congress: 119, chamber: "house",
    session: 1, roll: 163, actionType: "passage",
    create: {
      title: "To prohibit individuals who are not citizens of the United States from voting in elections in the District of Columbia",
      shortTitle: "D.C. Non-Citizen Voting Prohibition Act (119th)",
      summary:
        "Amends the District of Columbia Home Rule Act to bar any individual who is not a United "
        + "States citizen from voting in a District of Columbia election, repealing the effect of the "
        + "Local Resident Voting Rights Amendment Act of 2022 under which non-citizen District "
        + "residents could register and vote in local contests. Passed the House 266-148 on "
        + "2025-06-10 with 56 Democrats voting yea; the Senate did not take it up. Same text as "
        + "H.R. 192 in the 118th Congress.",
      introducedAt: "2025-01-31", status: "passed_house",
      sourceUrl: CG(119, "house-bill", 884), sourceLabel: "Congress.gov",
      externalIds: { congressGovId: "hr884-119", billStatus: BS(119, "hr", 884) },
    },
  },
  {
    number: "H.R. 192", measureType: "bill", congress: 118, chamber: "house",
    session: 2, roll: 232, actionType: "passage",
    create: {
      title: "To prohibit individuals who are not citizens of the United States from voting in elections in the District of Columbia",
      shortTitle: "D.C. Non-Citizen Voting Prohibition Act (118th)",
      summary:
        "Amends the District of Columbia Home Rule Act to bar any individual who is not a United "
        + "States citizen from voting in a District of Columbia election. Passed the House 262-143 on "
        + "2024-05-23 with 52 Democrats voting yea; the Senate did not take it up. Reintroduced in the "
        + "119th Congress as H.R. 884.",
      introducedAt: "2023-01-09", status: "passed_house",
      sourceUrl: CG(118, "house-bill", 192), sourceLabel: "Congress.gov",
      externalIds: { congressGovId: "hr192-118", billStatus: BS(118, "hr", 192) },
    },
  },
  {
    number: "H.R. 1", measureType: "bill", congress: 117, chamber: "house",
    session: 1, roll: 62, actionType: "passage",
    create: {
      title: "For the People Act of 2021",
      shortTitle: "For the People Act",
      summary:
        "Omnibus elections, ethics and campaign-finance bill. Title I requires every state to offer "
        + "automatic voter registration through motor-vehicle and other designated agencies, same-day "
        + "registration, and online registration, and restricts voter-roll purges; Title II requires "
        + "at least fifteen consecutive days of early voting and no-excuse absentee voting with "
        + "prepaid return postage, and restores voting rights to citizens released from "
        + "incarceration; Title III sets voting-system security standards including durable "
        + "paper ballots and risk-limiting audits. Later titles cover redistricting commissions, "
        + "small-donor public financing and ethics. Passed the House 220-210 on 2021-03-03; the "
        + "Senate's companion S. 2093 never cleared cloture.",
      introducedAt: "2021-01-04", status: "passed_house",
      sourceUrl: CG(117, "house-bill", 1), sourceLabel: "Congress.gov",
      externalIds: { congressGovId: "hr1-117", billStatus: BS(117, "hr", 1) },
    },
  },
  {
    number: "H.R. 4", measureType: "bill", congress: 117, chamber: "house",
    session: 1, roll: 260, actionType: "passage",
    create: {
      title: "John R. Lewis Voting Rights Advancement Act of 2021",
      shortTitle: "John R. Lewis Voting Rights Advancement Act",
      summary:
        "Restores the Voting Rights Act preclearance regime struck down in Shelby County v. Holder "
        + "with a new rolling twenty-five-year coverage formula, and adds a practice-based review "
        + "list subjecting specific changes — new documentary or photo-ID requirements, polling-place "
        + "closures and consolidations, redistricting in jurisdictions with recent minority "
        + "population growth, and voter-roll purges — to federal review before they take effect. "
        + "Also restores a private right of action and lowers the standard for preliminary relief. "
        + "Passed the House 219-212 on 2021-08-24; the Senate never voted on it as a standalone bill.",
      introducedAt: "2021-08-17", status: "passed_house",
      sourceUrl: CG(117, "house-bill", 4), sourceLabel: "Congress.gov",
      externalIds: { congressGovId: "hr4-117", billStatus: BS(117, "hr", 4) },
    },
  },
  {
    // The title check matters here more than anywhere else in this seed: the Clerk's
    // vote-desc reads "NASA Enhanced Use Leasing Extension Act of 2021", the shell bill
    // the Freedom to Vote: John R. Lewis Act was moved in. Only <legis-num> and the
    // question confirm the roll, which is why both are asserted.
    number: "H.R. 5746", measureType: "bill", congress: 117, chamber: "house",
    session: 2, roll: 9, actionType: "concurrence",
    create: {
      title: "Freedom to Vote: John R. Lewis Act",
      shortTitle: "Freedom to Vote: John R. Lewis Act",
      summary:
        "The negotiated merger of the Freedom to Vote Act and the John R. Lewis Voting Rights "
        + "Advancement Act, moved as a House amendment to the Senate amendment to H.R. 5746, a shell "
        + "bill introduced as the NASA Enhanced Use Leasing Extension Act of 2021 — the Clerk's vote "
        + "description still carries the NASA title. Requires automatic and same-day registration, a "
        + "minimum of two weeks of early voting including weekends, no-excuse mail voting with ballot "
        + "tracking and a minimum number of drop boxes per jurisdiction, and makes Election Day a "
        + "public holiday; also carries a paper-ballot and risk-limiting-audit title, ballot "
        + "chain-of-custody rules, protections for election officials and records, and the restored "
        + "preclearance regime. The House agreed to the motion to concur 220-203 on 2022-01-13; "
        + "Senate cloture failed 49-51 on 2022-01-19.",
      introducedAt: "2021-10-26", status: "passed_house",
      sourceUrl: CG(117, "house-bill", 5746), sourceLabel: "Congress.gov",
      externalIds: { congressGovId: "hr5746-117", billStatus: BS(117, "hr", 5746) },
    },
  },
];

// ── Facets deliberately NOT mapped on a measure that touches them ────────────
// Recorded so a one-facet mapping on a two-facet bill never reads as an oversight.
const DECLINED_FACETS = [
  {
    measure: "H.R. 1 (117th)", facet: "election_security",
    why:
      "Title III mandates durable paper ballots, risk-limiting audits and voting-system security "
      + "standards, which is the safeguard facet in the pro-safeguard direction. Title I permits a "
      + "sworn statement in lieu of documentary identification and sharply restricts voter-roll "
      + "purges and list maintenance, which is the same facet in the opposite direction. One yea "
      + "covers both, so the vote records no direction on election_security and none is assigned.",
  },
  {
    measure: "H.R. 5746 (117th)", facet: "election_security",
    why:
      "Same internal split as H.R. 1, which it incorporates: a paper-ballot and risk-limiting-audit "
      + "title plus ballot chain-of-custody rules on one side, and a permissive national "
      + "identification standard with a sworn-affidavit alternative plus purge restrictions on the "
      + "other. No single direction is readable from a yea.",
  },
  {
    measure: "H.R. 4 (117th)", facet: "election_security",
    why:
      "Not a split — an absence. The bill adds no verification requirement, no ballot-handling rule "
      + "and no audit provision of its own; its entire operative effect is federal review of state "
      + "changes. Mapping it to the safeguard facet would score members on a question the text does "
      + "not ask. (Its federal-review mechanism is a states_federal_power question, which is a "
      + "separate existing key and outside this pass's two facets.)",
  },
  {
    measure: "H.R. 192 (118th) and H.R. 884 (119th)", facet: null,
    why:
      "Both facets ARE mapped, but with a confound recorded: because the vehicle amends the "
      + "District of Columbia Home Rule Act, a nay can express opposition to Congress overriding a "
      + "local D.C. law rather than support for non-citizen voting. The mapping is made on the "
      + "operative election provision and the rationale says so; no member's reason is inferred "
      + "from the vote.",
  },
];

// ── Roll calls considered and declined, with the reason ──────────────────────
// A ledger, not a formality: a reader can see what was looked at and rejected, so a
// skip never reads as an oversight. Every tally below was read from the chamber's own
// document, not from a summary.
const DECLINED = [
  { number: "H.J.Res. 24", chamber: "house", congress: 118, session: 1, roll: 118, totals: "260-162", why: "disapproving the D.C. Council's Local Resident Voting Rights Amendment Act — the same substance as H.R. 192, voted in the same Congress, but through a disapproval resolution whose question mixes ballot eligibility with congressional override of a specific local enactment; ingesting both would double-weight one confounded question" },
  { number: "H.R. 8873", chamber: "house", congress: 117, session: 2, roll: 449, totals: "229-203", why: "Presidential Election Reform Act — its operative content is Title 3 certification process: the state legislature's role in appointing electors, the electoral-count objection threshold and expedited judicial review. Certification is who decides an outcome, not how ballots are verified or cast, and belongs to checks_balances; the election_security key's scope note excludes it explicitly" },
  { number: "H.R. 8314", chamber: "house", congress: 118, session: 2, roll: 418, totals: "218-181", why: "No Foreign Election Interference Act — bars tax-exempt organisations that accept foreign contributions from funding ballot-measure campaigns. That is campaign finance, not ballot administration, and belongs to campaign_finance. Failed under suspension besides" },
  { number: "H.R. 9494", chamber: "house", congress: 118, session: 2, roll: 431, totals: "202-220", why: "six-month continuing resolution with the SAVE Act attached. The operative content is appropriations and fourteen Republicans voted against it over spending levels, so a nay cannot be read as a position on the citizenship provision. H.R. 8281's own passage vote is the clean record of that position" },
  { number: "H.R. 8326", chamber: "house", congress: 117, session: 2, roll: 435, totals: "220-208", why: "Ensuring a Fair and Accurate Census Act — census administration, not election administration" },
  { number: "H.R. 1", chamber: "house", congress: 117, session: 1, roll: 61, totals: "210-219", why: "motion to recommit — a procedural disposition, not a vote on what the bill does; roll 62 is the passage vote" },
  { number: "H.R. 4", chamber: "house", congress: 117, session: 1, roll: 259, totals: "212-218", why: "motion to recommit; roll 260 is the passage vote" },
  { number: "H.R. 192", chamber: "house", congress: 118, session: 2, roll: 231, totals: "195-212", why: "motion to recommit; roll 232 is the passage vote" },
  { number: "H.R. 8281", chamber: "house", congress: 118, session: 2, roll: 344, totals: "184-197", why: "motion to recommit; roll 345 is the passage vote" },
  { number: "H.Res. 179", chamber: "house", congress: 117, session: 1, roll: 51, totals: "217-207", why: "rule providing for consideration of H.R. 1 — rules are not policy, and scripts/test-mapping-discipline.mjs refuses to let one be mapped at all" },
  { number: "H.Res. 601", chamber: "house", congress: 117, session: 1, roll: 258, totals: "219-212", why: "rule providing for consideration of H.R. 4 — same reason" },
  { number: "H.Res. 1341", chamber: "house", congress: 118, session: 2, roll: 339, totals: "212-203", why: "rule providing for consideration of H.R. 8281 — same reason" },
  { number: "S. 2093", chamber: "senate", congress: 117, session: 1, roll: 246, totals: "50-50", why: "cloture on the motion to proceed to the For the People Act. The runbook's standing rule excludes cloture: it records whether a member will let the Senate debate, not whether they support what the bill does. Not relaxed here even though it leaves the Senate with no roll call on either facet" },
  { number: "H.R. 5746", chamber: "senate", congress: 117, session: 2, roll: 9, totals: "49-51", why: "cloture on the motion to concur in the Freedom to Vote: John R. Lewis Act — excluded for the same reason as S. 2093's cloture" },
  { number: "S.Res. 492 (standing-order appeal)", chamber: "senate", congress: 117, session: 2, roll: 10, totals: "52-48", why: "on the decision of the chair, the talking-filibuster rule attempt — a question about Senate procedure itself, two layers above ballot administration" },
];

// ── What was scanned, so the window's emptiness is a finding and not an assumption ──
// Candidates were not recalled, they were read off the Clerk's own yearly grouped indexes
// (ROLL_000 = rolls 1-99, ROLL_100 = 100-199, and so on) for every year the window covers,
// and every hit on a vote/voter/election/ballot/citizenship/registration keyword was then
// opened and judged. The 119th's second session matters most here, because it is the part
// of the window a reader would assume nobody checked: it holds no election-administration
// measure at all. That is worth stating, not least because secondary write-ups of a
// February 2026 House vote on a successor "SAVE America Act" do circulate, and the Clerk's
// index for 2026 records no such roll call.
const SCAN_COVERAGE =
  "Clerk grouped indexes read in full for 2021, 2022, 2023, 2024, 2025 and 2026 — the whole "
  + "117th, 118th and 119th Congresses through House roll 283 of 2026 (July 23, 2026), the last "
  + "roll the Clerk had published when this seed was built. The 119th's second session (2026) "
  + "contains no election-administration measure of any kind: the only keyword hits are H.Res. 988, "
  + "a rule naming a retirement-savings bill, and H.R. 2071, the Save Our Shrimpers Act. No "
  + "successor to the SAVE Act reached a House vote in 2026, so nothing in that session is "
  + "admitted or declined here. Senate roll-call indexes for both sessions of all three Congresses "
  + "were read the same way and produced the two cloture motions named in declinedRollCalls.";

// ── The enacted-law tier, and why it is empty ───────────────────────────────
const ENACTED_LAW_FINDING =
  "The mission's first priority is enacted laws, and in the 117th-119th Congress there are none "
  + "for either facet. The only federal election statute enacted in the window is the Electoral "
  + "Count Reform Act of 2022 (Division P of the Consolidated Appropriations Act, 2023, P.L. "
  + "117-328), which reforms how electoral votes are counted and objected to — certification, not "
  + "ballot administration — and is out of scope by the election_security key's own scope note, "
  + "which assigns certification and Electoral Count Act questions to checks_balances. It was also "
  + "enacted inside a 1,653-page omnibus with no standalone roll call, so no member position on it "
  + "is separable from a vote on the whole appropriations act. Every measure in this seed passed one "
  + "chamber and died in the other. That is the shape of the record, not a gap in the search.";

// ── XML helpers ─────────────────────────────────────────────────────────────
// The tag pattern requires the name to be followed by '>' or whitespace, so a lookup for
// <vote-result> cannot be answered by a longer sibling tag.
const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`));
  return m ? m[1].trim() : null;
};
const attr = (frag, name) => {
  const m = frag.match(new RegExp(`${name}="([^"]*)"`));
  return m ? m[1] : null;
};
const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
const POS = { Yea: "yea", Aye: "yea", Nay: "nay", No: "nay", Present: "present", "Not Voting": "not_voting" };
const MON_SHORT = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };

function etOffset(y, mo, d) {
  const nth = (month, dow, n) => {
    let count = 0;
    for (let day = 1; day <= 31; day++) {
      const dt = new Date(Date.UTC(y, month - 1, day));
      if (dt.getUTCMonth() !== month - 1) break;
      if (dt.getUTCDay() === dow && ++count === n) return day;
    }
    return null;
  };
  const dstStart = { mo: 3, d: nth(3, 0, 2) };
  const dstEnd = { mo: 11, d: nth(11, 0, 1) };
  const onOrAfter = (a, b) => a.mo > b.mo || (a.mo === b.mo && a.d >= b.d);
  const before = (a, b) => a.mo < b.mo || (a.mo === b.mo && a.d < b.d);
  return onOrAfter({ mo, d }, dstStart) && before({ mo, d }, dstEnd) ? "-04:00" : "-05:00";
}

async function get(url) {
  const r = await fetch(url, { headers: { "user-agent": "politidex-vr-ingest/1.0" } });
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return await r.text();
}

// The standing decisive set. No exception form is admitted in this pass: every roll here
// is a passage vote or a motion to concur, so nothing needs a `decisiveWhy`.
const DECISIVE = /^(on passage|on the motion \(motion to concur|on motion to concur|on concurring|on the conference report|on motion to suspend the rules and (pass|agree|concur))/i;

function crossoverFlagger(all) {
  const byParty = {};
  for (const m of all) {
    if (!m.party || (m.position !== "yea" && m.position !== "nay")) continue;
    byParty[m.party] = byParty[m.party] || { yea: 0, nay: 0 };
    byParty[m.party][m.position]++;
  }
  const majority = {};
  for (const p of Object.keys(byParty)) majority[p] = byParty[p].yea >= byParty[p].nay ? "yea" : "nay";
  return (m) => {
    if (!m.party || (m.position !== "yea" && m.position !== "nay") || !majority[m.party]) return null;
    return m.position === majority[m.party] ? "with_party" : "against_party";
  };
}
function partyTotals(all) {
  const out = {};
  for (const m of all) {
    if (m.position !== "yea" && m.position !== "nay") continue;
    const p = m.party || "?";
    out[p] = out[p] || { yea: 0, nay: 0 };
    out[p][m.position]++;
  }
  return out;
}

const notes = [];
const votes = [];

const houseYear = (congress, session) => 2 * congress + 1787 + (session - 1);
// "H.R. 1319" → "H R 1319"; the Clerk's <legis-num> spelling replaces periods with
// spaces rather than dropping them.
const houseCitation = (number) => number.replace(/\./g, " ").replace(/\s+/g, " ").trim();

async function fetchHouse(sel, measure) {
  const year = houseYear(sel.congress, sel.session);
  const url = `https://clerk.house.gov/evs/${year}/roll${String(sel.roll).padStart(3, "0")}.xml`;
  const xml = await get(url);
  const at = `house ${year}/${sel.roll} (${sel.number})`;

  const legis = clean(tag(xml, "legis-num"));
  if (legis !== houseCitation(sel.number)) {
    notes.push(`DROPPED ${at}: legis-num "${legis}" is not ${sel.number}`);
    return null;
  }
  const question = clean(tag(xml, "vote-question"));
  if (!DECISIVE.test(question)) {
    notes.push(`DROPPED ${at}: question "${question}" is not an admitted decisive form`);
    return null;
  }

  const [dd, mon, yyyy] = clean(tag(xml, "action-date")).split("-");
  const mo = MON_SHORT[mon];
  const hhmm = attr((xml.match(/<action-time[^>]*>/) || [""])[0], "time-etz") || "12:00";
  const voteDate = `${yyyy}-${String(mo).padStart(2, "0")}-${dd.padStart(2, "0")}T${hhmm}:00${etOffset(+yyyy, mo, +dd)}`;

  const tv = tag(xml, "totals-by-vote") || "";
  const totals = {
    yea: +(tag(tv, "yea-total") || tag(tv, "aye-total") || 0),
    nay: +(tag(tv, "nay-total") || tag(tv, "no-total") || 0),
    present: +(tag(tv, "present-total") || 0),
    notVoting: +(tag(tv, "not-voting-total") || 0),
  };

  const all = [];
  for (const m of xml.matchAll(/<recorded-vote>([\s\S]*?)<\/recorded-vote>/g)) {
    const legFrag = (m[1].match(/<legislator[^>]*>/) || [""])[0];
    all.push({
      bioguideId: attr(legFrag, "name-id"),
      party: attr(legFrag, "party"),
      state: attr(legFrag, "state"),
      position: POS[clean(tag(m[1], "vote"))] || null,
    });
  }
  const flag = crossoverFlagger(all);
  const mapped = [];
  let unmapped = 0;
  for (const m of all) {
    const pid = m.bioguideId ? MAP[m.bioguideId] : null;
    if (!pid) { unmapped++; continue; }
    if (!m.position) { notes.push(`SKIPPED ${at} ${m.bioguideId}: unreadable position`); continue; }
    mapped.push({ bioguideId: m.bioguideId, politicianId: pid, party: m.party, position: m.position, isParty: flag(m) });
  }

  const raw = clean(tag(xml, "vote-result"));
  const result = /^passed$/i.test(raw) ? "passed" : /agreed/i.test(raw) ? "agreed_to" : /rejected/i.test(raw) ? "rejected" : "failed";
  return {
    chamber: "house", congress: sel.congress, session: sel.session, rollNumber: sel.roll, voteDate,
    question, voteDesc: clean(tag(xml, "vote-desc")),
    actionType: sel.actionType, result,
    requiredMajority: /suspend the rules/i.test(question) ? "two_thirds" : "simple",
    admittedAs: "decisive", decisiveWhy: null,
    totals, partyTotals: partyTotals(all),
    sourceUrl: url, sourceLabel: "U.S. House Clerk",
    measure, chamberVoting: all.length, rosterSkipped: unmapped,
    memberVotes: mapped.sort((a, b) => (a.politicianId < b.politicianId ? -1 : 1)),
  };
}

// ── Run ─────────────────────────────────────────────────────────────────────
for (const sel of SELECTIONS) {
  const measure = {
    measureType: sel.measureType, congress: sel.congress, chamber: sel.chamber, number: sel.number,
    parent: null,
    ...(sel.create ? { title: sel.create.title, create: sel.create } : {}),
    ...(sel.mustExist ? { mustExist: sel.mustExist } : {}),
  };
  const v = await fetchHouse(sel, measure);
  if (v) votes.push(v);
  else notes.push(`!! ${sel.number} contributed NO roll call — the selection did not verify`);
}

votes.sort((a, b) => (a.voteDate < b.voteDate ? -1 : a.voteDate > b.voteDate ? 1 : 0));

const seed = {
  _comment:
    "Roll calls for the two election-administration facets (issue keys election_security and "
    + "voting_access), 117th-119th Congress. Built by scripts/vr-build-elections-vote-seed.mjs from "
    + "clerk.house.gov/evs XML; candidates were found by scanning the Clerk's own yearly roll-call "
    + "indexes for every vote whose issue, question or title mentions voting, ballots, elections, "
    + "registration or citizenship, and each selection is re-verified against the chamber's document "
    + "(legis-num plus question) before inclusion. election_security covers eligibility "
    + "verification, roll maintenance, ballot chain of custody, audits and fraud enforcement; "
    + "voting_access covers registration ease, early voting, mail ballots, drop boxes and reduced "
    + "barriers to casting. A measure may test one facet, both with opposite directions, or neither. "
    + "Where a bill contains an election-security title that cuts both ways inside its own text, the "
    + "facet is declined rather than forced — see declinedFacets. No Senate roll call qualifies: the "
    + "chamber's only two election-administration votes in the window are failed cloture motions, "
    + "which the runbook excludes. memberVotes is already filtered to db/vr-member-map.json; "
    + "unmapped members are counted in rosterSkipped and never guessed. isParty is computed from the "
    + "full chamber tally, and totals is the full chamber tally, not the roster subset.",
  builtBy: "scripts/vr-build-elections-vote-seed.mjs",
  issueKeys: ["election_security", "voting_access"],
  congresses: [117, 118, 119],
  parents: [],
  rollCallCount: votes.length,
  memberVoteCount: votes.reduce((n, v) => n + v.memberVotes.length, 0),
  scanCoverage: SCAN_COVERAGE,
  enactedLawFinding: ENACTED_LAW_FINDING,
  declinedFacets: DECLINED_FACETS,
  declinedRollCalls: DECLINED,
  votes,
};
writeFileSync(resolve(REPO, "db/vr-elections-vote-seed.json"), JSON.stringify(seed, null, 1) + "\n");

for (const n of notes) console.log("NOTE:", n);
console.log(`\n${votes.length} roll calls, ${seed.memberVoteCount} attributed member votes\n`);
console.log("chamber  c/s  roll  measure        margin     req        attributed  skipped  question");
for (const v of votes) {
  console.log(
    `${v.chamber.padEnd(7)} ${v.congress}/${v.session} ${String(v.rollNumber).padStart(4)}  ` +
    `${v.measure.number.padEnd(14)} ${(v.totals.yea + "-" + v.totals.nay).padEnd(10)} ${v.requiredMajority.padEnd(10)} ` +
    `${String(v.memberVotes.length).padStart(10)} ${String(v.rosterSkipped).padStart(8)}  ${v.question.slice(0, 46)}`
  );
}
if (votes.length !== SELECTIONS.length) {
  console.error(`\n! ${SELECTIONS.length - votes.length} of ${SELECTIONS.length} selections failed verification — see the NOTEs above.`);
  process.exit(1);
}
