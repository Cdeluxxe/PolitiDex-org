// ════════════════════════════════════════════════════════════════════════════
// Federal wave F7 — vote seed builder
// ════════════════════════════════════════════════════════════════════════════
//
// Reads nineteen roll-call documents — fourteen from senate.gov LIS, five from
// clerk.house.gov — and writes db/vr-federal-wave-f7-vote-seed.json.
//
// FIVE THINGS THIS FILE IS CAREFUL ABOUT.
//
// 1. TWO CHAMBERS, TWO ATTRIBUTION PATHS, ONE FAIL-CLOSED RULE. The clerk stamps
//    each House legislator with `name-id`, which is a bioguide, so the House path
//    is bioguide → db/vr-member-map.json and nothing else. Senate XML carries no
//    bioguide at all, so a senator resolves on (surname, state) — and the surname
//    is compared against the ROSTER'S WHOLE NAME, not its last word, because the
//    Senate writes <last_name>Van Hollen</last_name> and a last-word split loses
//    Chris Van Hollen on every roll he actually voted on. A member who matches two
//    distinct people, or none, is skipped and COUNTED. Neither path guesses.
//
// 2. THE TALLY IS THE CHAMBER'S, NEVER THE ATTRIBUTED SUBSET. Senate totals come
//    from <count><yeas>/<nays>, House totals from <totals-by-vote>. The roster
//    admits 221 slugs, so recomputing a tally from the attributed rows would
//    publish a 60-40 Senate vote that never happened. And the tally is NOT read
//    from the LIS <vote_tally> display string: that field renders "51-42", which
//    parsed as a number is 5142, which puts the losing side at zero and makes
//    every roll look unanimous. F6 was bitten by exactly that; the authority is
//    the structured <count> block.
//
// 3. EVERY ROLL DECLARES THE FORM THAT ADMITTED IT. Fourteen of the nineteen are
//    'On the Motion to Discharge', which is not a decisive form — it is the
//    narrowly admitted discharge exception, gated on the measure being a joint
//    resolution and owing a written decisiveWhy per roll. One is the amendment
//    exception, gated the same way on an H.Amdt. number. The other four are plain
//    'On Passage'. The gate below is the one scripts/test-vr-vote-seed.mjs
//    re-checks; it is copied, not re-derived.
//
// 4. THE ROLL→MEASURE PAIRING IS VERIFIED AGAINST THE DOCUMENT, NOT THE MENU. Each
//    Senate roll asserts <document_type>+<document_number> equals the expected
//    measure and dies otherwise. This is not paranoia: the govinfo BILLSTATUS
//    <latestAction> block repeats per related bill, and four of these fourteen
//    identical-text Iran resolutions cite each OTHER's roll number in the first
//    latestAction a naive read returns. The per-roll document is the only source
//    that cannot make that mistake.
//
// 5. THE POSITION VOCABULARY IS CLOSED. Yea/Aye → yea, Nay/No → nay, Present →
//    present, Not Voting/Absent → not_voting, and anything else is a hard failure,
//    because a position the chamber recorded and this script did not understand is
//    a bug in this script.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MEMBER_MAP = JSON.parse(readFileSync(join(ROOT, "db", "vr-member-map.json"), "utf8"));
const MAP = MEMBER_MAP.map || {};
const ROSTER = MEMBER_MAP.members || [];

// ── The nineteen admitted rolls ─────────────────────────────────────────────
// congress/session/roll/year and the measure number are the identity. Everything
// else — question, tally, timestamp, result, required majority — is read out of
// the document so it cannot drift from the source.
//
// decisiveWhy is mandatory on the fifteen non-passage rolls and is the sentence
// that has to survive a reader asking "why is a procedural motion an act?".
// Twelve of the fourteen discharge motions were REJECTED, and for those the motion
// is the whole life of the resolution. Two carried — 119/2/5 on S.J.Res. 98 and
// 119/2/129 on S.J.Res. 185 — and those two need their own sentence, because the
// blanket one would be false: a motion that carries does not end the measure, it
// sends it to the floor. Both were then killed by a roll the form gate does not
// admit (a point of order sustained, and a rejected motion to proceed), so in
// neither case does a vote on passage exist to prefer over the discharge motion.
// The Senate menus for 119/1 and 119/2 were scanned for every one of the fourteen
// numbers to establish that: twelve carry exactly one roll, two carry two, and none
// of the sixteen is a vote on passage.
const WHY_DISCHARGE =
  "A war-powers resolution under 50 U.S.C. 1544(c) reaches the floor only if the Foreign Relations Committee is discharged, so the discharge motion IS the vote on the resolution: a rejected motion ends the measure and no vote on passage ever occurs. This is the same admitted form F4 used for the arms-sale disapprovals."
const WHY_DISCHARGE_CARRIED = (followOn) =>
  "A war-powers resolution under 50 U.S.C. 1544(c) reaches the floor only if the Foreign Relations Committee is discharged, and this is that motion. Unlike the twelve rejected motions in this wave it CARRIED, so it did not by itself end the measure — and the sentence is written out rather than borrowed, because the borrowed one would be false here. No vote on passage followed: " +
  followOn +
  ". That roll is a form rule 8/12 does not admit, so the discharge motion remains the only recorded position on the merits of this text, and it is the roll admitted. The resolution did not pass the Senate.";
const WHY_AMENDMENT =
  "The amendment's own text is the whole question — it repeals two standing authorizations for the use of military force — and the amendment was disposed of by recorded vote on its own, not en bloc. The parent bill's passage roll is a separate act on a separate subject.";

const ROLLS = [
  // Senate: war-powers discharge motions, 119th Congress, in roll order.
  { ch: "senate", congress: 119, session: 1, roll: 555, number: "S.J.Res. 83",  type: "resolution", why: WHY_DISCHARGE },
  { ch: "senate", congress: 119, session: 1, roll: 608, number: "S.J.Res. 90",  type: "resolution", why: WHY_DISCHARGE },
  { ch: "senate", congress: 119, session: 2, roll:   5, number: "S.J.Res. 98",  type: "resolution",
    why: WHY_DISCHARGE_CARRIED("the resolution fell on 119/2/9 when a point of order against it was sustained, 50-50") },
  { ch: "senate", congress: 119, session: 2, roll:  46, number: "S.J.Res. 104", type: "resolution", why: WHY_DISCHARGE },
  { ch: "senate", congress: 119, session: 2, roll:  58, number: "S.J.Res. 118", type: "resolution", why: WHY_DISCHARGE },
  { ch: "senate", congress: 119, session: 2, roll:  69, number: "S.J.Res. 116", type: "resolution", why: WHY_DISCHARGE },
  { ch: "senate", congress: 119, session: 2, roll:  79, number: "S.J.Res. 123", type: "resolution", why: WHY_DISCHARGE },
  { ch: "senate", congress: 119, session: 2, roll:  88, number: "S.J.Res. 114", type: "resolution", why: WHY_DISCHARGE },
  { ch: "senate", congress: 119, session: 2, roll: 113, number: "S.J.Res. 184", type: "resolution", why: WHY_DISCHARGE },
  { ch: "senate", congress: 119, session: 2, roll: 118, number: "S.J.Res. 163", type: "resolution", why: WHY_DISCHARGE },
  { ch: "senate", congress: 119, session: 2, roll: 129, number: "S.J.Res. 185", type: "resolution",
    why: WHY_DISCHARGE_CARRIED("the Senate rejected the motion to proceed to it on 119/2/192, 47-50") },
  { ch: "senate", congress: 119, session: 2, roll: 174, number: "S.J.Res. 172", type: "resolution", why: WHY_DISCHARGE },
  { ch: "senate", congress: 119, session: 2, roll: 207, number: "S.J.Res. 180", type: "resolution", why: WHY_DISCHARGE },
  { ch: "senate", congress: 119, session: 2, roll: 216, number: "S.J.Res. 181", type: "resolution", why: WHY_DISCHARGE },
  // House: four District of Columbia bills, read on their subjects, not their venue.
  { ch: "house", congress: 119, session: 1, roll: 171, year: 2025, number: "H.R. 2056", type: "bill" },
  { ch: "house", congress: 119, session: 1, roll: 270, year: 2025, number: "H.R. 4922", type: "bill" },
  { ch: "house", congress: 119, session: 1, roll: 271, year: 2025, number: "H.R. 5140", type: "bill" },
  { ch: "house", congress: 119, session: 1, roll: 298, year: 2025, number: "H.R. 5214", type: "bill" },
  // House: the one unread amendment roll on this wave's own axis.
  { ch: "house", congress: 119, session: 1, roll: 244, year: 2025, number: "H.Amdt. 99", type: "amendment",
    parent: "H.R. 3838", why: WHY_AMENDMENT },
];

const POS = { Yea: "yea", Aye: "yea", Nay: "nay", No: "nay", Present: "present", "Not Voting": "not_voting", Absent: "not_voting" };

// ── The form gate, copied from scripts/test-vr-vote-seed.mjs ────────────────
const DECISIVE = /^(on passage|on the motion \(motion to concur|on motion to concur|on concurring|on the conference report|on motion to suspend the rules and (pass|agree|concur))/i;
const PASSAGE_FORMS = [{ name: "joint resolution", question: /^on the joint resolution\b/i, number: /^(h|s)\.j\.\s*res\./i }];
const EXCEPTIONS = [
  { name: "amendment", question: /^on (agreeing to )?the amendment\b/i, number: /^(h|s)\.\s*amdt\./i },
  { name: "discharge", question: /^on the motion to discharge/i, number: /^(h|s)\.j\.\s*res\./i },
];
function admits(question, r) {
  const q = String(question || "");
  if (DECISIVE.test(q)) return "decisive";
  for (const f of PASSAGE_FORMS) if (f.question.test(q) && f.number.test(r.number)) return `passage form: ${f.name}`;
  for (const e of EXCEPTIONS) if (e.question.test(q) && e.number.test(r.number) && r.why) return `exception: ${e.name}`;
  return null;
}

const CACHE = process.env.F7_XML_DIR || "/tmp/f7xml";
async function get(url) {
  const res = await fetch(url, { headers: { "user-agent": "politidex-vr-ingest/1.0" } });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return await res.text();
}
async function cached(file, url) {
  const local = join(CACHE, file);
  if (existsSync(local)) return readFileSync(local, "utf8");
  return await get(url);
}
const tag = (xml, t) => {
  const m = xml.match(new RegExp(`<${t}>([\\s\\S]*?)</${t}>`));
  return m ? m[1] : "";
};
const clean = (s) => String(s || "").replace(/\s+/g, " ").trim();

// ── Eastern offset, to the minute, on the document's own stamp (rule 37) ────
const MON = { January: 1, February: 2, March: 3, April: 4, May: 5, June: 6, July: 7, August: 8, September: 9, October: 10, November: 11, December: 12 };
function etOffset(y, mo, d) {
  const nth = (n, dow, m) => { const f = new Date(Date.UTC(y, m - 1, 1)).getUTCDay(); return 1 + ((dow - f + 7) % 7) + 7 * (n - 1); };
  const start = new Date(Date.UTC(y, 2, nth(2, 0, 3)));   // second Sunday in March
  const end = new Date(Date.UTC(y, 10, nth(1, 0, 11)));   // first Sunday in November
  const t = new Date(Date.UTC(y, mo - 1, d));
  return t >= start && t < end ? "-04:00" : "-05:00";
}

// ── Senate roster: whole-name surname compare, alumni de-duped by bioguide ──
const senateRoster = ROSTER.filter((r) => r.chamber === "senate" && r.name && r.state)
  .map((r) => ({ bioguide: r.bioguide, state: r.state, name: r.name }));
// The whole-name compare is right and it is not sufficient. The shipped version of
// this resolver lowercases, strips a trailing " Jr." and compares — and it loses two
// sitting senators on every Senate roll in this wave, for two different reasons:
//
//   Angus S. King, Jr.  the suffix is written with a comma, so stripping " jr."
//                       leaves "angus s. king," and endsWith(" king") is false.
//   Ben Ray Luján       the roster carries the accent, the Senate's <last_name> does
//                       not, so "luján".endsWith(" lujan") is false.
//
// Both are the Van Hollen failure wearing a different hat: a member who voted is
// silently credited with nothing. So both sides are folded to letters, digits and
// single spaces first — diacritics decomposed and dropped, dots and commas turned
// into separators, a trailing generational suffix removed — and only then compared.
// Widening a match is the operation that creates false positives, so the ambiguity
// counter below is what makes this safe: it counts DISTINCT PEOPLE, and this wave
// asserts that count is zero on all fourteen rolls.
const foldName = (s) => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/[.,]/g, " ").replace(/\s+(jr|sr|ii|iii|iv)\b/g, "")
  .replace(/\s+/g, " ").trim();
const surnameMatches = (rosterName, xmlLast) => {
  const a = foldName(rosterName), b = foldName(xmlLast);
  return a === b || a.endsWith(" " + b);
};
// A roster row who sat in the Senate in this window but whose entry lost its
// chamber/state on leaving Congress. Keyed by bioguide so a widened roster cannot
// turn one member into two and skip him as ambiguous — that regression is what
// this de-dupe exists to prevent.
const SENATE_ALUMNI = [{ bioguide: "R000595", state: "FL", name: "Marco Rubio" }];
const senateLookup = [];
for (const r of [...senateRoster, ...SENATE_ALUMNI]) if (!senateLookup.some((x) => x.bioguide === r.bioguide)) senateLookup.push(r);

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

async function senateRoll(r) {
  const base = `https://www.senate.gov/legislative/LIS/roll_call_votes/vote${r.congress}${r.session}/vote_${r.congress}_${r.session}_${String(r.roll).padStart(5, "0")}`;
  const xml = await cached(`sv_${r.congress}_${r.session}_${r.roll}.xml`, `${base}.xml`);
  const at = `senate ${r.congress}/${r.session}/${r.roll}`;

  const doc = tag(xml, "document");
  const dt = clean(tag(doc, "document_type"));
  const cited = clean(`${dt.endsWith(".") ? dt : dt + "."} ${clean(tag(doc, "document_number"))}`);
  if (cited !== r.number) throw new Error(`${at}: document is "${cited}", expected ${r.number}`);

  const question = clean(tag(xml, "vote_question_text"));
  const admittedAs = admits(question, r);
  if (!admittedAs) throw new Error(`${at}: question "${question}" is not an admitted form`);

  const dm = clean(tag(xml, "vote_date")).match(/^(\w+)\s+(\d+),\s+(\d{4}),\s+(\d+):(\d+)\s*(AM|PM)$/);
  if (!dm) throw new Error(`${at}: unparsed vote_date "${clean(tag(xml, "vote_date"))}"`);
  const mo = MON[dm[1]];
  const hh = (+dm[4] % 12) + (dm[6] === "PM" ? 12 : 0);
  const voteDate = `${dm[3]}-${String(mo).padStart(2, "0")}-${String(+dm[2]).padStart(2, "0")}`
    + `T${String(hh).padStart(2, "0")}:${dm[5]}:00${etOffset(+dm[3], mo, +dm[2])}`;

  const all = [];
  let ambiguous = 0;
  const ambiguousNames = [];
  for (const m of xml.matchAll(/<member>([\s\S]*?)<\/member>/g)) {
    const f = m[1];
    const last = clean(tag(f, "last_name"));
    const state = clean(tag(f, "state"));
    const cast = clean(tag(f, "vote_cast"));
    const position = POS[cast];
    if (!position) throw new Error(`${at}: unrecognised vote_cast "${cast}" for ${last} (${state})`);
    const people = [...new Set(senateLookup.filter((x) => surnameMatches(x.name, last) && x.state === state).map((x) => x.bioguide))];
    if (people.length > 1) { ambiguous++; ambiguousNames.push(`${last} (${state})`); }
    all.push({ bioguideId: people.length === 1 ? people[0] : null, last, party: clean(tag(f, "party")), state, position });
  }
  if (!all.length) throw new Error(`${at}: no <member> rows parsed`);

  const flag = crossoverFlagger(all);
  const memberVotes = [];
  let unresolved = 0;
  const unresolvedMembers = [];
  for (const m of all) {
    const pid = m.bioguideId ? MAP[m.bioguideId] : null;
    if (!pid) { unresolved++; unresolvedMembers.push(`${m.last} (${m.state})`); continue; }
    memberVotes.push({ politicianId: pid, bioguideId: m.bioguideId, position: m.position, isParty: flag(m) });
  }

  const cnt = tag(xml, "count");
  const totals = {
    yea: +clean(tag(cnt, "yeas")), nay: +clean(tag(cnt, "nays")),
    present: +(clean(tag(cnt, "present")) || 0), notVoting: +(clean(tag(cnt, "absent")) || 0),
  };
  if (!Number.isFinite(totals.yea) || !Number.isFinite(totals.nay)) throw new Error(`${at}: <count> has no readable yeas/nays`);
  const raw = clean(tag(xml, "vote_result"));
  const req = clean(tag(xml, "majority_requirement"));

  return {
    chamber: "senate", congress: r.congress, session: r.session, rollNumber: r.roll, voteDate,
    question, voteDesc: clean(tag(xml, "vote_title")),
    // 'motion', NOT 'discharge', AND THE REASON IS NOT COSMETIC. vr_rollcalls.action_type
    // is a closed vocabulary — passage, amendment, motion, procedural, nomination,
    // concurrence, cloture — and netlify/lib/vr-pack.ts reads exactly two of those,
    // ["procedural","motion"], as PROCEDURAL when it packs a member's record. A discharge
    // motion is a motion, so the reader's own pack will mark it procedural, and
    // stance-helpers.js multiplies a procedural act's curator weight by 0.25 before the
    // record index compares the two sides. Writing 'discharge' here would leave the
    // database saying 'motion' while every offline harness and every projected
    // measurement said something the pack has never heard of and therefore read as
    // substantive — a four-fold difference in weight between the numbers this wave
    // published and the numbers a reader will see. The form-gate record of WHAT was
    // admitted stays where it belongs, in admittedAs and decisiveWhy below.
    actionType: "motion",
    result: /rejected/i.test(raw) ? "rejected" : /agreed/i.test(raw) ? "agreed_to" : /passed/i.test(raw) ? "passed" : "failed",
    requiredMajority: req === "3/5" ? "three_fifths" : req === "2/3" ? "two_thirds" : "simple",
    admittedAs, decisiveWhy: r.why,
    totals, partyTotals: partyTotals(all),
    sourceUrl: `${base}.htm`, xmlUrl: `${base}.xml`, sourceLabel: "U.S. Senate",
    measure: { measureType: r.type, congress: r.congress, chamber: "senate", number: r.number, documentTitle: clean(tag(doc, "document_title")) },
    _resolvedBy: "surname+state against db/vr-member-map.json, whole-name compare",
    _ambiguousSkipped: ambiguous, _ambiguousNames: ambiguousNames,
    // A senator absent from the roster is not a mystery to be papered over: the
    // surname+state that failed to resolve is written down, so the next widening of
    // the roster can be checked against a list instead of a count.
    _unresolvedMembers: unresolvedMembers,
    memberVotes: memberVotes.sort((a, b) => a.politicianId.localeCompare(b.politicianId)),
    _chamberRecorded: all.length, _attributed: memberVotes.length, _unresolvedRecorded: unresolved,
  };
}

async function houseRoll(r) {
  const url = `https://clerk.house.gov/evs/${r.year}/roll${String(r.roll).padStart(3, "0")}.xml`;
  const xml = await cached(`h_${r.year}_${r.roll}.xml`, url);
  const at = `house ${r.congress}/${r.session}/${r.roll}`;

  const question = clean(tag(xml, "vote-question"));
  const admittedAs = admits(question, r);
  if (!admittedAs) throw new Error(`${at}: question "${question}" is not an admitted form`);
  // The clerk's legis-num is the parent bill on an amendment roll and the measure
  // itself on a passage roll, so it is checked against whichever this is.
  // The clerk writes "H R 2056" where the corpus writes "H.R. 2056", so both sides
  // are reduced to letters and digits before the comparison rather than either one
  // being trusted to match the other's punctuation.
  const legisNum = clean(tag(xml, "legis-num"));
  const flat = (s) => String(s).replace(/[^a-z0-9]/gi, "").toUpperCase();
  if (flat(legisNum) !== flat(r.parent || r.number)) throw new Error(`${at}: legis-num "${legisNum}" is not ${r.parent || r.number}`);

  const tb = tag(xml, "totals-by-vote");
  const totals = {
    yea: +clean(tag(tb, "yea-total")), nay: +clean(tag(tb, "nay-total")),
    present: +clean(tag(tb, "present-total")), notVoting: +clean(tag(tb, "not-voting-total")),
  };
  for (const [k, v] of Object.entries(totals)) if (!Number.isFinite(v)) throw new Error(`${at}: <totals-by-vote> has no readable ${k}`);

  const legs = [...xml.matchAll(/<recorded-vote>\s*<legislator ([^>]*)>[\s\S]*?<vote>([^<]*)<\/vote>/g)].map((m) => {
    const a = {}; for (const p of m[1].matchAll(/([\w-]+)="([^"]*)"/g)) a[p[1]] = p[2];
    return { bioguideId: a["name-id"], state: a.state, party: a.party, vote: clean(m[2]) };
  });
  if (!legs.length) throw new Error(`${at}: no <recorded-vote> rows parsed`);
  const all = legs.map((l) => {
    const position = POS[l.vote];
    if (!position) throw new Error(`${at}: unrecognised position "${l.vote}" for ${l.bioguideId}`);
    return { bioguideId: l.bioguideId, party: l.party, state: l.state, position };
  });

  const flag = crossoverFlagger(all);
  const memberVotes = [];
  const unresolvedBioguides = [];
  for (const m of all) {
    const pid = MAP[m.bioguideId];
    if (!pid) { unresolvedBioguides.push(m.bioguideId); continue; }
    memberVotes.push({ politicianId: pid, bioguideId: m.bioguideId, position: m.position, isParty: flag(m) });
  }

  const dm = clean(tag(xml, "action-date")).match(/^(\d{1,2})-(\w{3})-(\d{4})$/);
  if (!dm) throw new Error(`${at}: unparsed action-date "${clean(tag(xml, "action-date"))}"`);
  const mo = { JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12 }[dm[2].toUpperCase()];
  const tm = /<action-time[^>]*\btime-etz="(\d{1,2}):(\d{2})"/.exec(xml);
  if (!tm) throw new Error(`${at}: no readable time-etz on <action-time>`);
  const voteDate = `${dm[3]}-${String(mo).padStart(2, "0")}-${dm[1].padStart(2, "0")}`
    + `T${tm[1].padStart(2, "0")}:${tm[2]}:00${etOffset(+dm[3], mo, +dm[1])}`;

  return {
    chamber: "house", congress: r.congress, session: r.session, rollNumber: r.roll, voteDate,
    question, voteDesc: clean(tag(xml, "vote-desc")),
    actionType: r.type === "amendment" ? "amendment" : "passage",
    result: clean(tag(xml, "vote-result")),
    requiredMajority: clean(tag(xml, "vote-type")).toLowerCase().includes("2/3") ? "two_thirds" : "simple",
    admittedAs, decisiveWhy: r.why || null,
    totals, partyTotals: partyTotals(all),
    sourceUrl: `https://clerk.house.gov/Votes/${r.year}${String(r.roll).padStart(3, "0")}`,
    xmlUrl: url, sourceLabel: "Office of the Clerk, U.S. House of Representatives",
    measure: { measureType: r.type, congress: r.congress, chamber: "house", number: r.number, legisNum, parentNumber: r.parent || null },
    _resolvedBy: "the clerk's own name-id (bioguide) → db/vr-member-map.json",
    memberVotes: memberVotes.sort((a, b) => a.politicianId.localeCompare(b.politicianId)),
    _chamberRecorded: all.length, _attributed: memberVotes.length,
    _unresolvedRecorded: unresolvedBioguides.length, _unresolvedBioguides: unresolvedBioguides,
  };
}

const out = {
  _comment: "Generated by scripts/vr-gen-federal-wave-f7-vote-seed.mjs. Do not hand-edit; regenerate.",
  builtBy: "scripts/vr-gen-federal-wave-f7-vote-seed.mjs",
  pulledAt: new Date().toISOString().slice(0, 10),
  source: "senate.gov LIS roll-call XML (14) and clerk.house.gov EVS XML (5), read live and cached under $F7_XML_DIR",
  attribution: {
    house: "fail-closed: the clerk's own name-id (bioguide) → db/vr-member-map.json → roster slug, and no other path",
    senate: "fail-closed: (surname, state) against the roster's whole name, because Senate XML carries no bioguide. A surname matching two distinct roster people is skipped and counted as ambiguous, never split by guess.",
    tallyAuthority: "Senate <count><yeas>/<nays>; House <totals-by-vote>. Never the LIS <vote_tally> display string, which renders '51-42' and parses as 5142.",
    unresolvedArePart: "Members who do not resolve are skipped and counted per roll in _unresolvedRecorded and _ambiguousSkipped, so the ceiling is visible rather than implied.",
  },
  votes: [],
};

for (const r of ROLLS) out.votes.push(r.ch === "senate" ? await senateRoll(r) : await houseRoll(r));

for (const v of out.votes) {
  const pool = v.totals.yea + v.totals.nay;
  const losing = Math.min(v.totals.yea, v.totals.nay);
  v._poolYeaNay = pool;
  v._losingSide = losing;
  v._losingSharePct = +((losing / pool) * 100).toFixed(3);
  v._rule11Cleared = losing >= pool / 10;
  v.marginShare = +(losing / pool).toFixed(5);
  if (!v._rule11Cleared) throw new Error(`${v.measure.number} ${v.chamber} ${v.rollNumber}: rule 11 one-tenth bar not cleared (${losing}/${pool})`);
  if (v.admittedAs !== "decisive" && !v.decisiveWhy) throw new Error(`${v.measure.number}: admitted as ${v.admittedAs} with no decisiveWhy`);
}

out.rollCallCount = out.votes.length;
out.memberVoteCount = out.votes.reduce((a, v) => a + v.memberVotes.length, 0);
out.skippedVoteCount = out.votes.reduce((a, v) => a + v._unresolvedRecorded, 0);
out.newMeasures = [...new Set(out.votes.map((v) => v.measure.number))];
out._counts = {
  rolls: out.votes.length,
  senateRolls: out.votes.filter((v) => v.chamber === "senate").length,
  houseRolls: out.votes.filter((v) => v.chamber === "house").length,
  chamberRecordedRange: [Math.min(...out.votes.map((v) => v._chamberRecorded)), Math.max(...out.votes.map((v) => v._chamberRecorded))],
  attributedMemberVotes: out.memberVoteCount,
  attributionCeilingSenate: Math.max(...out.votes.filter((v) => v.chamber === "senate").map((v) => v._attributed)),
  attributionCeilingHouse: Math.max(...out.votes.filter((v) => v.chamber === "house").map((v) => v._attributed)),
  unresolvedRecordedTotal: out.skippedVoteCount,
  ambiguousSkippedTotal: out.votes.reduce((a, v) => a + (v._ambiguousSkipped || 0), 0),
  distinctSlugsTouched: new Set(out.votes.flatMap((v) => v.memberVotes.map((m) => m.politicianId))).size,
  losingShareRangePct: [Math.min(...out.votes.map((v) => v._losingSharePct)), Math.max(...out.votes.map((v) => v._losingSharePct))],
  admittedForms: out.votes.reduce((a, v) => { a[v.admittedAs] = (a[v.admittedAs] || 0) + 1; return a; }, {}),
};

writeFileSync(join(ROOT, "db", "vr-federal-wave-f7-vote-seed.json"), JSON.stringify(out, null, 1) + "\n");
console.log("wrote db/vr-federal-wave-f7-vote-seed.json");
console.log(JSON.stringify(out._counts, null, 1));
for (const v of out.votes)
  console.log(`  ${v.chamber} ${v.congress}/${v.session}/${String(v.rollNumber).padStart(3)} ${v.measure.number.padEnd(13)} ${String(v.totals.yea)}-${v.totals.nay}  ${String(v._losingSharePct).padStart(7)}%  att=${String(v._attributed).padStart(3)} unres=${String(v._unresolvedRecorded).padStart(3)} amb=${v._ambiguousSkipped ?? "-"}  ${v.admittedAs}`);
