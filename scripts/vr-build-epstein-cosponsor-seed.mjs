#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// vr-build-epstein-cosponsor-seed.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Builds db/vr-epstein-cosponsor-vote-seed.json: the Epstein Files Transparency Act
// (H.R. 4405, 119th → Public Law 119-38) sponsorship record, plus the member votes that
// the roster expansion this pass performed unlocked on two already-ingested roll calls.
//
//   node scripts/vr-build-epstein-cosponsor-seed.mjs
//
// WHY THIS EXISTS
// ---------------
// H.R. 4405 passed the House 427-1 under suspension of the rules. A 427-1 roll confirms a
// stated transparency position and separates almost nobody. What separates is who put
// their name on the bill in JULY 2025, four months before the floor caught up — and the
// previous pass could only record four of the twenty-five people who did, because
// db/vr-member-map.json resolved four of them. The other twenty-one were skipped rather
// than guessed, which is right, and left a gap this pass closes as far as the evidence
// allows and no further.
//
// THE RESOLUTION RULE, AND WHY MOST OF THEM STAY UNRESOLVED
// --------------------------------------------------------
// A cosponsor is resolvable only if their Bioguide ID reaches a roster slug the way every
// other attribution in this record does — through db/vr-member-map.json, which
// scripts/vr-gen-member-map.mjs derives from the Bioguide embedded in each curated
// portrait URL in BROWSE_PHOTOS (plus the four SEED_SLUGS entries) and scopes to
// db/vr-roster-admitted.json. So "resolve" here has a specific and checkable meaning:
// the app must already profile this person. It is NOT enough that Congress.gov names
// them, because a slug invented for a cosponsor would be a profile with one sponsorship
// row, no stated positions to test it against, and no portrait — and inventing one is
// precisely the guess the fail-closed rule forbids.
//
// Measured against that rule, three of the twenty-one were resolvable and eighteen were
// not. All three already had everything except an entry in db/vr-roster-admitted.json:
//
//   jim_mcgovern    M000312  Rep. James P. McGovern (D, MA-02)  — portrait already curated
//   seth_moulton    M001196  Rep. Seth Moulton (D, MA-06)       — portrait already curated
//   robert_garcia   G000598  Rep. Robert Garcia (D, CA-42)      — compare card and stance
//                                                                 block already published;
//                                                                 portrait added this pass
//
// Each carries four published stance cards and, before this pass, ZERO attributable votes
// — the largest possible gap between stated and testable positions. Robert Garcia is the
// Ranking Member of the Committee on Oversight and Government Reform, the committee whose
// jurisdiction the bill is about, and his published stances include "Oversight &
// Accountability" and "Immigration", which the two rolls below test directly.
//
// The eighteen who remain unresolved are listed in the seed with the reason, so the gap
// reads as a finding. None of them has a curated portrait in ANY URL form, and none
// appears in CMP_DATA, SPOTLIGHTS or the stance data under any slug — the app does not
// profile them, so there is nothing to attribute a cosponsorship to. That includes
// Speaker Emerita Nancy Pelosi, which is worth naming: she is the most prominent member
// this pass declines, and she is declined for exactly the same reason as the other
// seventeen rather than for a different one.
//
// THE TWO ROLLS
// -------------
// Admitting three House members to the roster does nothing on its own — the ingest
// attributes at pull time, so a roll already written carries the attribution the roster
// had when it was written. Following the pattern of
// 20260813000000_vr_israel_roster_expansion_votes.sql, this seed re-attributes the two
// rolls where these three members' votes matter most against the WIDENED roster:
//
//   house 119/1/289  H.R. 4405, On Motion to Suspend the Rules and Pass, 427-1
//                    — the floor vote matching the cosponsorship (gov_transparency)
//   house 119/2/214  S. 2, On Passage, 214-212
//                    — the Secure America Act, this pass's primary target
//
// The FULL attributed set is re-asserted for each roll rather than a hand-computed delta,
// because the migration's ON CONFLICT (rollcall_id, politician_id) DO NOTHING makes the
// already-written rows conflict away. That is correct on a database where the earlier
// migrations ran AND on a fresh branch where all of them run in sequence, without either
// file needing to know what the other managed to attribute.
//
// DELIBERATELY NOT DONE HERE
// --------------------------
// The three new members are House members with voting records reaching back to the 117th
// Congress in this record's window, so a full re-attribution sweep across every House
// roll already ingested would unlock more than the six votes below. That sweep is a
// separate pass: it touches rolls this one did not verify, and topping up a roll whose
// question, tally and source another builder established is exactly the kind of write
// that should be made by the builder that owns it.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const memberMap = JSON.parse(readFileSync(resolve(REPO, "db/vr-member-map.json"), "utf8"));
const MAP = memberMap.map || {};

const BILLSTATUS = "https://www.govinfo.gov/bulkdata/BILLSTATUS/119/hr/BILLSTATUS-119hr4405.xml";
const COSPONSOR_URL = "https://www.congress.gov/bill/119th-congress/house-bill/4405/cosponsors";

// ── The two rolls this seed re-attributes ───────────────────────────────────
// Each names the measure it belongs to and the migration that created it, so a reader can
// see that no roll call, measure or issue row is this seed's to write.
const ROLLS = [
  {
    chamber: "house", congress: 119, session: 1, roll: 289, actionType: "passage",
    measure: { measureType: "bill", congress: 119, chamber: "house", number: "H.R. 4405" },
    createdBy: "20260820000000_vr_landmark_enacted_law_rollcalls.sql",
    why: "The Epstein Files Transparency Act's own passage vote, and the gov_transparency roll "
      + "the cosponsorship below is the early version of. 427-1 under suspension, so it "
      + "confirms a position rather than distinguishing one — but a member who cosponsored in "
      + "July and voted in November has both halves of the record, and the previous pass could "
      + "attribute this roll to only part of the roster.",
  },
  {
    chamber: "house", congress: 119, session: 2, roll: 214, actionType: "passage",
    measure: { measureType: "bill", congress: 119, chamber: "senate", number: "S. 2" },
    createdBy: "20260821000000_vr_secure_america_act_rollcalls.sql",
    why: "The Secure America Act's House passage vote, 214-212 — the most separating "
      + "immigration roll in the record and this pass's primary target. Included because the "
      + "three members admitted here are House members who cast it, and leaving them off a "
      + "roll this same pass created would be a gap opened by the pass that closed it.",
  },
];

// ── XML helpers ─────────────────────────────────────────────────────────────
// Lifted unchanged from scripts/vr-build-secure-america-vote-seed.mjs, which lifted them
// from the landmark builder. Kept as a copy on purpose: a builder is the audit trail for
// the migration it feeds, and a later edit to a shared helper would silently change what
// a past seed claims to have parsed.
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

// The standing decisive set from scripts/test-vr-vote-seed.mjs, unmodified.
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
const houseYear = (congress, session) => 2 * congress + 1787 + (session - 1);
const houseCitation = (number) => number.replace(/\./g, " ").replace(/\s+/g, " ").trim().toUpperCase();

async function fetchHouse(sel) {
  const year = houseYear(sel.congress, sel.session);
  const url = `https://clerk.house.gov/evs/${year}/roll${String(sel.roll).padStart(3, "0")}.xml`;
  const xml = await get(url);
  const at = `house ${year}/${sel.roll} (${sel.measure.number})`;

  // Verified on <legis-num>, never on <vote-desc>: the Clerk's description can still name a
  // struck original title, and a description-driven check would reject the right roll.
  const legis = clean(tag(xml, "legis-num"));
  if (legis.toUpperCase() !== houseCitation(sel.measure.number)) {
    throw new Error(`${at}: legis-num "${legis}" is not ${sel.measure.number}`);
  }
  const question = clean(tag(xml, "vote-question"));
  if (!DECISIVE.test(question)) throw new Error(`${at}: question "${question}" is not an admitted decisive form`);

  const [dd, mon, yyyy] = clean(tag(xml, "action-date")).split("-");
  const mo = MON_SHORT[mon];
  const hhmm = attr((xml.match(/<action-time[^>]*>/) || [""])[0], "time-etz") || "12:00";
  const voteDate = `${yyyy}-${String(mo).padStart(2, "0")}-${dd.padStart(2, "0")}T${hhmm}:00${etOffset(+yyyy, mo, +dd)}`;

  // <totals-by-party> blocks each carry their OWN <yea-total>, so a first-match parse
  // returns one party's sub-total. The chamber tally lives only in <totals-by-vote>.
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
  // is_party is computed over the FULL recorded vote, before the roster filter, so a
  // partial roster can never invent a party crossover.
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
  const result = /^passed$/i.test(raw) ? "passed" : /agreed/i.test(raw) ? "agreed_to"
    : /rejected|defeated/i.test(raw) ? "rejected" : "failed";
  return {
    chamber: "house", congress: sel.congress, session: sel.session, rollNumber: sel.roll, voteDate,
    question, voteDesc: clean(tag(xml, "vote-desc")),
    actionType: sel.actionType, result,
    requiredMajority: /suspend the rules/i.test(question) ? "two_thirds" : "simple",
    admittedAs: "decisive", decisiveWhy: null,
    reattributedWhy: sel.why,
    rollCallCreatedBy: sel.createdBy,
    totals, partyTotals: partyTotals(all),
    sourceUrl: url, sourceLabel: "U.S. House Clerk",
    measure: sel.measure, chamberVoting: all.length, rosterSkipped: unmapped,
    memberVotes: mapped.sort((a, b) => (a.politicianId < b.politicianId ? -1 : 1)),
  };
}

// ── The sponsorship record, read from the bill's own BILLSTATUS feed ────────
// isOriginalCosponsor is the bill's own flag, so "original cosponsor" is a fact from the
// record and never an inference from a date matching the introduction date.
async function fetchSponsorship() {
  const xml = await get(BILLSTATUS);
  const gv = (frag, t) => {
    const m = frag.match(new RegExp(`<${t}>([\\s\\S]*?)</${t}>`));
    return m ? m[1].trim() : "";
  };
  const sponsorBlock = xml.match(/<sponsors>([\s\S]*?)<\/sponsors>/);
  if (!sponsorBlock) throw new Error("BILLSTATUS-119hr4405.xml carries no <sponsors> block");
  const sItem = (sponsorBlock[1].match(/<item>([\s\S]*?)<\/item>/) || [])[1] || "";
  const introduced = gv(xml, "introducedDate");
  const sponsor = {
    bioguideId: gv(sItem, "bioguideId"),
    fullName: gv(sItem, "fullName"),
    party: gv(sItem, "party"),
    state: gv(sItem, "state"),
    district: gv(sItem, "district"),
    action: "sponsor",
    date: introduced,
    isOriginalCosponsor: null,
  };
  const cosBlock = xml.match(/<cosponsors>([\s\S]*?)<\/cosponsors>/);
  const cosponsors = [...((cosBlock && cosBlock[1]) || "").matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => ({
    bioguideId: gv(m[1], "bioguideId"),
    fullName: gv(m[1], "fullName"),
    party: gv(m[1], "party"),
    state: gv(m[1], "state"),
    district: gv(m[1], "district"),
    action: "cosponsor",
    date: gv(m[1], "sponsorshipDate"),
    isOriginalCosponsor: gv(m[1], "isOriginalCosponsor") === "True",
  }));
  return { introduced, sponsor, cosponsors, policyArea: gv(xml, "name") };
}

// ── Run ─────────────────────────────────────────────────────────────────────
const sponsorship = await fetchSponsorship();
const everyone = [sponsorship.sponsor, ...sponsorship.cosponsors];
for (const p of everyone) {
  if (!p.bioguideId) throw new Error(`BILLSTATUS row "${p.fullName}" carries no bioguideId — refusing to guess`);
  p.politicianId = MAP[p.bioguideId] || null;
}
// BILLSTATUS reports district "0" for a Delegate or an at-large seat, so it is rendered
// "AL" rather than "-0", and fullName already carries its own bracketed seat, which is
// stripped so the two do not print twice side by side.
const seatOf = (p) => `${p.party}-${p.state}-${p.district === "0" || !p.district ? "AL" : p.district}`;
const nameOf = (p) => p.fullName.replace(/\s*\[[^\]]*\]\s*$/, "").trim();

const resolved = everyone.filter((p) => p.politicianId);
const unresolved = everyone.filter((p) => !p.politicianId).map((p) => ({
  bioguideId: p.bioguideId,
  fullName: nameOf(p),
  seat: seatOf(p),
  date: p.date,
  isOriginalCosponsor: p.isOriginalCosponsor,
  why: "Not in db/vr-member-map.json, and not resolvable: the Bioguide appears in no curated "
    + "portrait in BROWSE_PHOTOS under any URL form, and the slug appears in no compare card, "
    + "spotlight or stance block, so the app does not profile this member and there is no "
    + "roster slug to credit. Minting one would create a profile whose only content is a "
    + "sponsorship row with no stated position to test it against — the guess the fail-closed "
    + "rule exists to prevent. Left unattributed.",
}));

// The date is the only fact needed for the position row, but the note is what a reader
// sees, so it states what the record says and nothing more.
const positions = resolved.map((p) => {
  const seat = seatOf(p);
  const note = p.action === "sponsor"
    ? `Lead sponsor. Introduced H.R. 4405 on ${p.date}, four months before the House voted on it.`
    : p.isOriginalCosponsor
      ? `ORIGINAL cosponsor (isOriginalCosponsor=True in the bill's own record), joining on the day of introduction, ${p.date}.`
      : `Cosponsor, joined ${p.date}.`;
  return {
    politicianId: p.politicianId,
    bioguideId: p.bioguideId,
    fullName: nameOf(p),
    seat,
    actionType: p.action,
    supports: true,
    actedAt: p.date,
    isOriginalCosponsor: p.isOriginalCosponsor,
    sourceUrl: COSPONSOR_URL,
    note,
  };
});

const votes = [];
for (const sel of ROLLS) votes.push(await fetchHouse(sel));

// The three slugs this pass admitted. Named as data so the migration header can state
// which attributions are new without recomputing them from a diff.
const ADMITTED = [
  { slug: "jim_mcgovern", bioguideId: "M000312", name: "Rep. James P. McGovern", seat: "D-MA-2",
    how: "Portrait already curated in BROWSE_PHOTOS (congress-images/M000312.jpg); admitted to "
      + "db/vr-roster-admitted.json in wave epstein_cosponsors_aug2026." },
  { slug: "seth_moulton", bioguideId: "M001196", name: "Rep. Seth Moulton", seat: "D-MA-6",
    how: "Portrait already curated in BROWSE_PHOTOS (congress-images/M001196.jpg); admitted to "
      + "db/vr-roster-admitted.json in wave epstein_cosponsors_aug2026." },
  { slug: "robert_garcia", bioguideId: "G000598", name: "Rep. Robert Garcia", seat: "D-CA-42",
    how: "Compare card and four stance cards already published; the portrait was the only "
      + "missing link, so the congress-images portrait for G000598 (HTTP 200) was added to "
      + "BROWSE_PHOTOS and the slug admitted in wave epstein_cosponsors_aug2026. The generator's "
      + "own portrait identity cross-check confirms G000598 is the Robert Garcia the app "
      + "profiles before the map is written." },
];
for (const a of ADMITTED) {
  if (MAP[a.bioguideId] !== a.slug) {
    throw new Error(`${a.bioguideId} resolves to '${MAP[a.bioguideId]}' but this pass admitted '${a.slug}' — regenerate db/vr-member-map.json`);
  }
}
const newlyAttributed = votes.map((v) => ({
  roll: `${v.chamber} ${v.congress}/${v.session} roll ${v.rollNumber}`,
  members: v.memberVotes
    .filter((m) => ADMITTED.some((a) => a.slug === m.politicianId))
    .map((m) => `${m.politicianId} ${m.position}`),
}));

const seed = {
  _comment:
    "Epstein Files Transparency Act (H.R. 4405, 119th → P.L. 119-38) sponsorship record, plus "
    + "the member votes unlocked by admitting three of its cosponsors to the roster. Built by "
    + "scripts/vr-build-epstein-cosponsor-seed.mjs from the bill's own BILLSTATUS feed and the "
    + "House Clerk's roll-call XML. This seed writes NO measure, roll call or issue row: both "
    + "rolls were created by earlier migrations and are looked up, never re-described. "
    + "Attribution is fail-closed — a cosponsor whose Bioguide does not reach a roster slug "
    + "through db/vr-member-map.json is listed in unresolvedCosponsors with the reason and "
    + "credited to nobody.",
  builtBy: "scripts/vr-build-epstein-cosponsor-seed.mjs",
  issueKeys: ["gov_transparency", "deportations", "border_security", "immig_fentanyl", "tough_on_crime"],
  congresses: [119],
  rosterWave: "epstein_cosponsors_aug2026",
  rosterSize: Object.keys(MAP).length,
  admitted: ADMITTED,
  rollCallCount: votes.length,
  memberVoteCount: votes.reduce((n, v) => n + v.memberVotes.length, 0),
  newlyAttributed,
  sponsorshipSourceUrl: COSPONSOR_URL,
  billStatusUrl: BILLSTATUS,
  introducedDate: sponsorship.introduced,
  cosponsorTotals: {
    sponsor: 1,
    cosponsors: sponsorship.cosponsors.length,
    resolved: resolved.length,
    unresolved: unresolved.length,
    newlyResolvedThisPass: ADMITTED.length,
  },
  positions,
  unresolvedCosponsors: unresolved,
  scanCoverage:
    `Every name in the bill's own record was checked: 1 sponsor and ${sponsorship.cosponsors.length} `
    + `cosponsors read from <sponsors> and <cosponsors> in ${BILLSTATUS}, with sponsorshipDate and `
    + "isOriginalCosponsor taken from the feed rather than inferred. Each Bioguide was looked up in "
    + "db/vr-member-map.json; each miss was then checked twice more before being declined — against "
    + "every URL form in BROWSE_PHOTOS (the 450x550 congress-images form the map reads, and the "
    + "bioguide.congress.gov and Wikimedia forms it does not), and against the slugs published in "
    + "cmp-data.js, spotlights-data.js and the stance data. Three resolved on the second check and "
    + `were admitted; ${unresolved.length} failed all three and are declined by name with the reason. `
    + "Both roll calls were re-fetched from the Clerk and re-verified on <legis-num> plus "
    + "<vote-question> before any vote was attributed, and the chamber tally was read from "
    + "<totals-by-vote>, never from the first <yea-total> in the file.",
  declinedRollCalls: [],
  votes,
};

const OUT = resolve(REPO, "db/vr-epstein-cosponsor-vote-seed.json");
writeFileSync(OUT, JSON.stringify(seed, null, 1) + "\n");

console.log(`✓ wrote ${OUT}`);
console.log(`  ${seed.rollCallCount} roll calls · ${seed.memberVoteCount} attributed member votes`);
console.log(`  cosponsorship: ${resolved.length} of ${everyone.length} names resolved `
  + `(${ADMITTED.length} newly, this pass) · ${unresolved.length} declined by name`);
for (const v of votes) {
  console.log(`  ${v.chamber} ${v.congress}/${v.session} roll ${String(v.rollNumber).padStart(3)} `
    + `${String(v.measure.number).padEnd(11)} ${v.totals.yea}-${v.totals.nay}  `
    + `${String(v.memberVotes.length).padStart(3)} attributed / ${v.rosterSkipped} skipped  ${v.question}`);
}
for (const n of newlyAttributed) console.log(`  new on ${n.roll}: ${n.members.join(", ") || "(none)"}`);
for (const n of notes) console.log(`  ! ${n}`);
