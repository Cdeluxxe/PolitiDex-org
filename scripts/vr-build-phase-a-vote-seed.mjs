#!/usr/bin/env node
// ---------------------------------------------------------------------------
// vr-build-phase-a-vote-seed.mjs — roll calls for the Phase A 117th/118th landmarks
// ---------------------------------------------------------------------------
// Phase A (netlify/database/migrations/20260810000000_vr_phase_a_117_118_landmarks.sql)
// created 15 enacted landmarks from the 117th and 118th Congresses and gave them 51
// curated issue rows. Those rows contributed nothing to the ranking because the vote
// tables held no 117th/118th member votes for them: a mapping without a roll call is
// not scoreable. This script fetches the roll calls.
//
//   node scripts/vr-build-phase-a-vote-seed.mjs        # writes db/vr-phase-a-vote-seed.json
//
// HOW THE ROLL NUMBERS WERE CHOSEN — read, never guessed
// -----------------------------------------------------
// Every <recordedVote> block for all 15 measures was pulled from govinfo BILLSTATUS
// bulk data (the only primary source reachable from the build environment; congress.gov
// and api.congress.gov both answer 403). That yields the complete vote list per measure
// — cloture motions, budget-point-of-order waivers, dozens of vote-a-rama amendments,
// motions to table, and the decisive vote. This script names one decisive vote per
// chamber per measure and then RE-VERIFIES it against the chamber's own record:
// clerk.house.gov/evs XML for the House, senate.gov roll_call_votes XML for the Senate.
//
// Verification is fail-closed. If the fetched document's own bill citation does not
// match the measure the selection claims, or its question is not a decisive one, the
// roll is dropped with a loud note rather than ingested on trust. This matters: an
// earlier pass over these same measures recorded House roll 120/2024 for RISAA, and
// the Clerk's own record shows roll 120 is "Table Motion to Reconsider" — the passage
// vote is roll 119. Reading the source caught it; trusting the note would not have.
//
// WHAT "DECISIVE" MEANS HERE
// -------------------------
// The vote that actually disposed of the substance in that chamber: final passage, or
// the motion to concur / conference-report adoption when the chamber's last act on the
// bill was to accept the other chamber's text. Procedural votes are deliberately NOT
// ingested — a cloture motion or a Rule 28 waiver says nothing about whether a member
// supports what the bill does, and mapping one to an issue would put a false receipt
// on a profile. The vote-a-ramas alone would have added ~90 roll calls of pure noise.
//
// ATTRIBUTION
// -----------
// Member votes are filtered to db/vr-member-map.json. The House XML carries a bioguide
// id per legislator (name-id), so the House side is a direct lookup. The Senate XML
// carries no bioguide id, so senators are resolved by (last name, state) against the
// roster and a hit is only accepted when it is UNIQUE — an ambiguous or unrecognized
// member is skipped and counted, never guessed. is_party is computed from the FULL
// chamber tally before filtering, so a 63-member roster subset can never mislabel a
// party crossover.
// ---------------------------------------------------------------------------
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const memberMap = JSON.parse(readFileSync(resolve(REPO, "db/vr-member-map.json"), "utf8"));
const MAP = memberMap.map || {};
const ROSTER = memberMap.members || [];

// ── The Phase A measures, and the decisive roll in each chamber ──────────────
// number, measure chamber (origin), congress, then the House and Senate selections
// as [session, roll] or null where the chamber never voted the vehicle.
const SELECTIONS = [
  { number: "H.R. 1319", chamber: "house", congress: 117, house: [1, 72], senate: [1, 110] },
  { number: "H.R. 3684", chamber: "house", congress: 117, house: [1, 369], senate: [1, 314] },
  { number: "H.R. 4346", chamber: "house", congress: 117, house: [2, 404], senate: [2, 271] },
  { number: "H.R. 5376", chamber: "house", congress: 117, house: [2, 420], senate: [2, 325] },
  { number: "S. 2938", chamber: "senate", congress: 117, house: [2, 299], senate: [2, 242] },
  { number: "S. 3373", chamber: "senate", congress: 117, house: [2, 309], senate: [2, 280] },
  { number: "H.R. 8404", chamber: "house", congress: 117, house: [2, 513], senate: [2, 362] },
  { number: "H.R. 3076", chamber: "house", congress: 117, house: [2, 38], senate: [2, 71] },
  { number: "S. 1605", chamber: "senate", congress: 117, house: [1, 405], senate: [1, 499] },
  // H.R. 7776: the only House roll on this vehicle is 253/2022, the suspension vote on
  // the rivers-and-harbors bill that held the number BEFORE the NDAA text replaced it.
  // Ingesting it would attribute a defense-authorization position to a WRDA vote.
  { number: "H.R. 7776", chamber: "house", congress: 117, house: null, senate: [2, 396] },
  { number: "H.R. 3746", chamber: "house", congress: 118, house: [1, 243], senate: [1, 146] },
  { number: "H.R. 2670", chamber: "house", congress: 118, house: [1, 723], senate: [1, 343] },
  { number: "H.R. 5009", chamber: "house", congress: 118, house: [2, 500], senate: [2, 325] },
  { number: "H.R. 7888", chamber: "house", congress: 118, house: [2, 119], senate: [2, 150] },
  // H.R. 815: the House never voted the package. It passed four separate division bills
  // and H.Res. 1160 combined them into the Senate amendment. See DIVISIONS below.
  { number: "H.R. 815", chamber: "house", congress: 118, house: null, senate: [2, 154] },
];

// ── Division-level rolls, where the package was voted piecewise ──────────────
// H.R. 815's substance reached the floor as four standalone bills on 2024-04-20. Only
// one of them divided the House: H.R. 8035 (Ukraine) passed 311-112 with Republicans
// voting 101-112 AGAINST their own majority position. That is the vote that decided
// the foreign-policy substance, and it is ingested as a child measure of H.R. 815.
//
// The other three are recorded here and deliberately NOT ingested — they passed
// near-unanimously (H.R. 8034 Israel 366-58, H.R. 8036 Indo-Pacific 385-34, H.R. 8038
// Peace through Strength 360-58) and a near-unanimous vote carries no signal that
// distinguishes one member from another, which is the same rule that keeps
// near-unanimous measures unmapped elsewhere in this repo.
//
// One of those three has since been reversed, and the entry below records it rather than
// being quietly rewritten. H.R. 8034 IS ingested by db/vr-israel-vote-seed.json, because
// "no distinguishing signal" was a judgement about THIS pass's keys: the supplemental's
// foreign-policy signal was already carried by H.R. 8035's 311-112 Ukraine split, and
// 366-58 added nothing to it. Under israel_support the same 58 nays are the entire point —
// they are the members who declined to fund Israel's missile defence on a bill that asked
// nothing else of them. A margin is not near-unanimous in the abstract; it is
// near-unanimous relative to the question being scored.
const DIVISIONS = [
  {
    number: "H.R. 8035", chamber: "house", congress: 118, session: 2, roll: 151,
    parentNumber: "H.R. 815", parentChamber: "house", parentCongress: 118,
    title: "Ukraine Security Supplemental Appropriations Act, 2024",
    sourceUrl: "https://www.congress.gov/bill/118th-congress/house-bill/8035",
    status: "passed_house",
  },
];

const DECLINED = [
  { number: "H.R. 8034", session: 2, roll: 152, totals: "366-58", why: "near-unanimous for this pass's general foreign-policy keys, where H.R. 8035's 311-112 Ukraine split already carried the supplemental's signal; SUPERSEDED 2026-08 and now ingested by db/vr-israel-vote-seed.json, where the 58 nays are the discriminating signal under israel_support" },
  { number: "H.R. 8036", session: 2, roll: 146, totals: "385-34", why: "near-unanimous; no distinguishing signal" },
  { number: "H.R. 8038", session: 2, roll: 145, totals: "360-58", why: "near-unanimous; no distinguishing signal" },
  { number: "H.R. 7776", session: 2, roll: 253, totals: "384-37", why: "vote on the rivers-and-harbors text this vehicle carried before the NDAA replaced it" },
  { number: "H.R. 7888", session: 2, roll: 120, totals: "259-128", why: "motion to table reconsideration; roll 119 is the passage vote" },
  { number: "H.R. 7888", session: 2, roll: 114, totals: "212-212", why: "failed warrant-requirement amendment; a division vote worth its own mapping in a later pass, not an unmapped ingest here" },
];

// ── XML helpers ─────────────────────────────────────────────────────────────
const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? m[1].trim() : null;
};
const attr = (frag, name) => {
  const m = frag.match(new RegExp(`${name}="([^"]*)"`));
  return m ? m[1] : null;
};
const POS = { Yea: "yea", Aye: "yea", Nay: "nay", No: "nay", Present: "present", "Not Voting": "not_voting" };

// US Eastern offset: EDT from the 2nd Sunday of March to the 1st Sunday of November.
// Every roll here sits well inside a season, so the boundary only has to be correct.
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
const MON_SHORT = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
const MON_LONG = {
  January: 1, February: 2, March: 3, April: 4, May: 5, June: 6,
  July: 7, August: 8, September: 9, October: 10, November: 11, December: 12,
};

async function get(url) {
  const r = await fetch(url, { headers: { "user-agent": "politidex-vr-ingest/1.0" } });
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return await r.text();
}

// A question that disposed of the substance. Anything else is procedural and is not
// ingested — see the header.
const DECISIVE = /^(on passage|on the motion \(motion to concur|on motion to concur|on concurring|on the conference report|on motion to suspend the rules and (pass|agree|concur))/i;

// Party-crossover flag from the majority position within each party, computed over the
// FULL chamber list so a roster subset cannot mislabel it.
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

// ── House ───────────────────────────────────────────────────────────────────
// The Clerk publishes by calendar year, not session, so derive the year from the
// congress + session pair (1st session = odd year).
const houseYear = (congress, session) => 2 * congress + 1787 + (session - 1);

function houseCitation(number) {
  // "H.R. 1319" → "H R 1319"; "S. 2938" → "S 2938" — the Clerk's legis-num spelling.
  return number.replace(/\./g, " ").replace(/\s+/g, " ").trim();
}

async function fetchHouse(number, measure, congress, session, roll) {
  const year = houseYear(congress, session);
  const url = `https://clerk.house.gov/evs/${year}/roll${String(roll).padStart(3, "0")}.xml`;
  const xml = await get(url);
  const legis = (tag(xml, "legis-num") || "").replace(/\s+/g, " ").trim();
  if (legis !== houseCitation(number)) {
    notes.push(`DROPPED house ${year}/${roll}: legis-num "${legis}" is not ${number}`);
    return null;
  }
  const question = tag(xml, "vote-question") || "";
  if (!DECISIVE.test(question)) {
    notes.push(`DROPPED house ${year}/${roll} (${number}): question "${question}" is not a decisive question`);
    return null;
  }
  const [dd, mon, yyyy] = (tag(xml, "action-date") || "").split("-");
  const mo = MON_SHORT[mon];
  const timeTag = (xml.match(/<action-time[^>]*>/) || [""])[0];
  const hhmm = attr(timeTag, "time-etz") || "12:00";
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
      position: POS[(tag(m[1], "vote") || "").trim()] || null,
    });
  }
  const flag = crossoverFlagger(all);
  const mapped = [];
  let unmapped = 0;
  for (const m of all) {
    const pid = m.bioguideId ? MAP[m.bioguideId] : null;
    if (!pid) { unmapped++; continue; }
    if (!m.position) { notes.push(`SKIPPED house ${year}/${roll} ${m.bioguideId}: unreadable position`); continue; }
    mapped.push({ bioguideId: m.bioguideId, politicianId: pid, party: m.party, position: m.position, isParty: flag(m) });
  }

  const result = /^passed$/i.test(tag(xml, "vote-result") || "") ? "passed"
    : /agreed/i.test(tag(xml, "vote-result") || "") ? "agreed_to" : "failed";
  return {
    chamber: "house", congress, session, rollNumber: roll, voteDate,
    question, voteDesc: (tag(xml, "vote-desc") || "").replace(/\s+/g, " ").trim(),
    actionType: "passage", result,
    requiredMajority: /suspend the rules/i.test(question) ? "two_thirds" : "simple",
    totals, partyTotals: partyTotals(all),
    sourceUrl: url, sourceLabel: "U.S. House Clerk",
    measure, chamberVoting: all.length, rosterSkipped: unmapped,
    memberVotes: mapped.sort((a, b) => (a.politicianId < b.politicianId ? -1 : 1)),
  };
}

// ── Senate ──────────────────────────────────────────────────────────────────
// The Senate XML has no bioguide id, so resolve by (last name, state) and require a
// unique roster hit.
const senateRoster = ROSTER
  .filter((r) => r.chamber === "senate" && r.name && r.state)
  .map((r) => ({ bioguide: r.bioguide, state: r.state, last: r.name.split(/\s+/).filter((w) => !/^[A-Z]\.$/.test(w)).slice(-1)[0] }));
// Roster entries who sat in the Senate during the 117th/118th but whose row carries no
// chamber/state because they have since left Congress for the executive branch.
const SENATE_ALUMNI = [{ bioguide: "R000595", state: "FL", last: "Rubio" }];
const senateLookup = [...senateRoster, ...SENATE_ALUMNI];

async function fetchSenate(number, measure, congress, session, roll) {
  const base = `https://www.senate.gov/legislative/LIS/roll_call_votes/vote${congress}${session}/vote_${congress}_${session}_${String(roll).padStart(5, "0")}`;
  const xml = await get(`${base}.xml`);
  const doc = tag(xml, "document") || "";
  const dt = (tag(doc, "document_type") || "").trim();
  const dn = (tag(doc, "document_number") || "").trim();
  const cited = `${dt.endsWith(".") ? dt : dt + "."} ${dn}`.replace(/\s+/g, " ").trim();
  if (cited !== number) {
    notes.push(`DROPPED senate ${congress}/${session}/${roll}: document "${cited}" is not ${number}`);
    return null;
  }
  const question = tag(xml, "vote_question_text") || tag(xml, "question") || "";
  if (!DECISIVE.test(question)) {
    notes.push(`DROPPED senate ${congress}/${session}/${roll} (${number}): question "${question}" is not a decisive question`);
    return null;
  }
  const dm = (tag(xml, "vote_date") || "").match(/^(\w+)\s+(\d+),\s+(\d{4}),\s+(\d+):(\d+)\s*(AM|PM)$/);
  if (!dm) {
    notes.push(`DROPPED senate ${congress}/${session}/${roll}: unparsed vote_date "${tag(xml, "vote_date")}"`);
    return null;
  }
  const mo = MON_LONG[dm[1]];
  const hh = (+dm[4] % 12) + (dm[6] === "PM" ? 12 : 0);
  const voteDate = `${dm[3]}-${String(mo).padStart(2, "0")}-${String(+dm[2]).padStart(2, "0")}T${String(hh).padStart(2, "0")}:${dm[5]}:00${etOffset(+dm[3], mo, +dm[2])}`;

  const all = [];
  let ambiguous = 0;
  for (const m of xml.matchAll(/<member>([\s\S]*?)<\/member>/g)) {
    const f = m[1];
    const last = (tag(f, "last_name") || "").trim();
    const state = (tag(f, "state") || "").trim();
    const hits = senateLookup.filter((r) => r.last === last && r.state === state);
    if (hits.length > 1) {
      ambiguous++;
      notes.push(`AMBIGUOUS senate ${congress}/${session}/${roll}: ${last} (${state}) matches ${hits.length} roster rows — skipped`);
    }
    all.push({
      bioguideId: hits.length === 1 ? hits[0].bioguide : null,
      party: (tag(f, "party") || "").trim(),
      state,
      position: POS[(tag(f, "vote_cast") || "").trim()] || null,
    });
  }
  const flag = crossoverFlagger(all);
  const mapped = [];
  let unmapped = 0;
  for (const m of all) {
    const pid = m.bioguideId ? MAP[m.bioguideId] : null;
    if (!pid) { unmapped++; continue; }
    if (!m.position) { notes.push(`SKIPPED senate ${congress}/${session}/${roll} ${m.bioguideId}: unreadable position`); continue; }
    mapped.push({ bioguideId: m.bioguideId, politicianId: pid, party: m.party, position: m.position, isParty: flag(m) });
  }

  const cnt = tag(xml, "count") || "";
  const rr = tag(xml, "vote_result") || "";
  const req = (tag(xml, "majority_requirement") || "").trim();
  return {
    chamber: "senate", congress, session, rollNumber: roll, voteDate,
    question, voteDesc: (tag(xml, "vote_title") || "").replace(/\s+/g, " ").trim(),
    actionType: "passage",
    result: /passed/i.test(rr) ? "passed" : /agreed/i.test(rr) ? "agreed_to" : "failed",
    requiredMajority: req === "3/5" ? "three_fifths" : req === "2/3" ? "two_thirds" : "simple",
    totals: {
      yea: +(tag(cnt, "yeas") || 0), nay: +(tag(cnt, "nays") || 0),
      present: +(tag(cnt, "present") || 0), notVoting: +(tag(cnt, "absent") || 0),
    },
    partyTotals: partyTotals(all),
    sourceUrl: `${base}.htm`, xmlUrl: `${base}.xml`, sourceLabel: "U.S. Senate",
    measure, chamberVoting: all.length, rosterSkipped: unmapped, rosterAmbiguous: ambiguous,
    memberVotes: mapped.sort((a, b) => (a.politicianId < b.politicianId ? -1 : 1)),
  };
}

// ── Run ─────────────────────────────────────────────────────────────────────
for (const sel of SELECTIONS) {
  const measure = { measureType: "bill", congress: sel.congress, chamber: sel.chamber, number: sel.number, phaseA: true };
  if (sel.house) {
    const v = await fetchHouse(sel.number, measure, sel.congress, sel.house[0], sel.house[1]);
    if (v) votes.push(v);
  }
  if (sel.senate) {
    const v = await fetchSenate(sel.number, measure, sel.congress, sel.senate[0], sel.senate[1]);
    if (v) votes.push(v);
  }
}
for (const d of DIVISIONS) {
  const measure = {
    measureType: "bill", congress: d.congress, chamber: d.chamber, number: d.number, title: d.title,
    sourceUrl: d.sourceUrl, sourceLabel: "Congress.gov", status: d.status,
    parentNumber: d.parentNumber, parentChamber: d.parentChamber, parentCongress: d.parentCongress,
    phaseA: false,
  };
  const v = await fetchHouse(d.number, measure, d.congress, d.session, d.roll);
  if (v) votes.push(v);
}

votes.sort((a, b) => (a.voteDate < b.voteDate ? -1 : a.voteDate > b.voteDate ? 1 : 0));

const seed = {
  _comment:
    "Roll calls for the Phase A 117th/118th enacted landmarks. Built by " +
    "scripts/vr-build-phase-a-vote-seed.mjs from clerk.house.gov/evs and senate.gov " +
    "roll_call_votes XML; roll numbers come from govinfo BILLSTATUS recordedVote blocks. " +
    "One decisive vote per chamber per measure — procedural rolls are excluded on purpose. " +
    "memberVotes is already filtered to db/vr-member-map.json; unmapped members are counted " +
    "in rosterSkipped and never guessed. isParty is computed from the full chamber tally.",
  builtBy: "scripts/vr-build-phase-a-vote-seed.mjs",
  phase: "A",
  congresses: [117, 118],
  rollCallCount: votes.length,
  memberVoteCount: votes.reduce((n, v) => n + v.memberVotes.length, 0),
  declinedRollCalls: DECLINED,
  votes,
};
writeFileSync(resolve(REPO, "db/vr-phase-a-vote-seed.json"), JSON.stringify(seed, null, 1) + "\n");

for (const n of notes) console.log("NOTE:", n);
console.log(`\n${votes.length} roll calls, ${seed.memberVoteCount} attributed member votes\n`);
console.log("chamber  c/s  roll  measure     margin    req      attributed  skipped  question");
for (const v of votes) {
  console.log(
    `${v.chamber.padEnd(7)} ${v.congress}/${v.session} ${String(v.rollNumber).padStart(4)}  ` +
    `${v.measure.number.padEnd(11)} ${(v.totals.yea + "-" + v.totals.nay).padEnd(9)} ${v.requiredMajority.padEnd(8)} ` +
    `${String(v.memberVotes.length).padStart(10)} ${String(v.rosterSkipped).padStart(8)}  ${v.question.slice(0, 46)}`
  );
}
