// ════════════════════════════════════════════════════════════════════════════
// Federal wave F6 — vote seed builder
// ════════════════════════════════════════════════════════════════════════════
//
// Reads the eleven clerk.house.gov roll-call XML documents this wave admits and
// writes db/vr-federal-wave-f6-vote-seed.json: the roll, its full-chamber tally,
// and one attributed member position per roster slug.
//
// THREE THINGS THIS FILE IS CAREFUL ABOUT.
//
// 1. TOTALS ARE THE FULL CHAMBER, NOT THE ROSTER SUBSET. yea/nay/present/notVoting
//    come from the clerk's own <totals-by-vote> block, which counts all 430-433
//    members who were recorded. The attributed rows below it are a much smaller
//    set — the roster admits 221 slugs and about 117 of them are serving House
//    members — and if the tally were recomputed from the attributed rows instead
//    the site would publish a 60-57 vote that never happened. The two numbers are
//    kept in separate fields on purpose and the migration asserts the tally
//    against the source, never against the row count.
//
// 2. ATTRIBUTION IS FAIL-CLOSED. bioguide (the clerk's own `name-id`) → roster
//    slug via db/vr-member-map.json, and nothing else. A recorded member who does
//    not resolve is skipped and COUNTED, never guessed at by surname: the clerk
//    disambiguates colliding surnames as "Smith (NE)" and a surname match would
//    have quietly attributed one member's vote to another. The unresolved count is
//    written into the seed so the ceiling is visible rather than implied.
//
// 3. THE POSITION VOCABULARY IS CLOSED. Yea/Aye → yea, Nay/No → nay, Present →
//    present, Not Voting → not_voting, and any other string is a hard failure
//    rather than a silent drop, because a vote the clerk recorded and this script
//    did not understand is a bug in this script.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MAP = JSON.parse(readFileSync(join(ROOT, "db", "vr-member-map.json"), "utf8")).map;

// The eleven admitted rolls. congress/session/roll/year are the identity; everything
// else on the roll is read out of the XML so it cannot drift from the source.
const ROLLS = [
  { congress: 119, session: 1, roll: 279, year: 2025, measure: "H.R. 1047" },
  { congress: 119, session: 1, roll: 277, year: 2025, measure: "H.R. 3062" },
  { congress: 119, session: 1, roll: 358, year: 2025, measure: "H.R. 1366" },
  { congress: 119, session: 1, roll: 356, year: 2025, measure: "H.R. 4776" },
  { congress: 119, session: 1, roll: 347, year: 2025, measure: "H.R. 3616" },
  { congress: 119, session: 1, roll: 342, year: 2025, measure: "H.R. 3632" },
  { congress: 119, session: 1, roll: 334, year: 2025, measure: "H.R. 3668" },
  { congress: 119, session: 1, roll: 330, year: 2025, measure: "H.R. 3898" },
  { congress: 119, session: 1, roll: 323, year: 2025, measure: "H.R. 3628" },
  { congress: 119, session: 2, roll:  55, year: 2026, measure: "H.R. 4090" },
  { congress: 119, session: 2, roll: 134, year: 2026, measure: "H.R. 4690" },
];

const POS = { "Yea": "yea", "Aye": "yea", "Nay": "nay", "No": "nay", "Present": "present", "Not Voting": "not_voting" };

const CACHE = process.env.F6_XML_DIR || "/tmp/f6xml";
async function xmlFor(r) {
  const local = join(CACHE, `h_${r.year}_${r.roll}.xml`);
  if (existsSync(local)) return readFileSync(local, "utf8");
  const url = `https://clerk.house.gov/evs/${r.year}/roll${String(r.roll).padStart(3, "0")}.xml`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return await res.text();
}

const one = (xml, tag) => {
  const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return m ? m[1].trim() : "";
};


// ── THE SHAPE IS THE FEDERAL VOTE-SEED SHAPE, NOT A SHAPE OF ITS OWN ────────
// scripts/test-vr-vote-seed.mjs routes a seed file by `Array.isArray(j.votes)`:
// a top-level `votes` array means "this is a federal seed, run the eleven
// congressional rules over it", and anything else is routed out as a state seed
// and merely required to be named by some harness. A wave that invented its own
// nesting would therefore be silently exempted from the attribution ceiling, the
// rule 8 question gate and the "every roll is actually written by a migration"
// check — the three properties most worth having. So the field names here are the
// ones that pass reads: votes[] / rollNumber / memberVotes[] / politicianId /
// bioguideId / isParty, with the wave's own measurements kept alongside under a
// leading underscore.
const ROLL_URL = (r) => `https://clerk.house.gov/evs/${r.year}/roll${String(r.roll).padStart(3, "0")}.xml`;

// The clerk stamps <action-time time-etz="14:03">: Eastern, so the offset is the
// one in force on that date, computed rather than assumed. Second Sunday in March
// to first Sunday in November is EDT (-04:00); the rest of the year is EST
// (-05:00). Two of this wave's eleven rolls are in winter, so hard-coding either
// value would put a vote an hour away from when it was cast.
const nthSunday = (year, month, n) => {
  const first = new Date(Date.UTC(year, month, 1));
  const day = 1 + ((7 - first.getUTCDay()) % 7) + (n - 1) * 7;
  return Date.UTC(year, month, day);
};
const easternOffset = (y, m, d) => {
  const t = Date.UTC(y, m - 1, d);
  return t >= nthSunday(y, 2, 2) && t < nthSunday(y, 10, 1) ? "-04:00" : "-05:00";
};
const MON = { JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12 };
// The clock is read out of the `time-etz` ATTRIBUTE, not the element body: the
// clerk writes <action-time time-etz="17:01">5:01 PM</action-time>, so the body is
// a 12-hour display string and only the attribute is a machine time. Both halves
// are required — an unreadable date or clock throws, because the alternative is a
// seed that quietly stamps every roll at noon and reads as if it knew.
const isoStamp = (xml) => {
  const dm = /<action-date>\s*(\d{1,2})-([A-Za-z]{3})-(\d{4})\s*<\/action-date>/.exec(xml);
  if (!dm) throw new Error("no readable <action-date> in the roll XML");
  const mm = MON[dm[2].toUpperCase()];
  if (!mm) throw new Error(`unreadable month in <action-date> '${dm[0]}'`);
  const [y, d] = [+dm[3], +dm[1]];
  const tm = /<action-time[^>]*\btime-etz="(\d{1,2}):(\d{2})"/.exec(xml);
  if (!tm) throw new Error("no readable time-etz on <action-time> in the roll XML");
  return `${y}-${String(mm).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    + `T${tm[1].padStart(2, "0")}:${tm[2]}:00${easternOffset(y, mm, d)}`;
};

const out = {
  _comment: "Generated by scripts/vr-gen-federal-wave-f6-vote-seed.mjs. Do not hand-edit; regenerate.",
  builtBy: "scripts/vr-gen-federal-wave-f6-vote-seed.mjs",
  pulledAt: new Date().toISOString().slice(0, 10),
  source: "clerk.house.gov Electronic Voting System XML — one document per roll call, read live and cached under $F6_XML_DIR",
  attribution: {
    method: "fail-closed: the clerk's own name-id (bioguide) → db/vr-member-map.json → roster slug, and no other path",
    neverBySurname: "The clerk disambiguates colliding surnames as 'Smith (NE)', 'Lee (NV)', 'Nunn (IA)'. Three of the eight slugs this wave adds to the roster are such collisions, so a surname match would have attributed one member's vote to another.",
    unresolvedArePart: "A recorded member who does not resolve is skipped and counted, never guessed. The per-roll _unresolvedRecorded and the wave's _counts.attributionCeiling make the ceiling visible instead of implied.",
  },
  votes: [],
};

for (const r of ROLLS) {
  const xml = await xmlFor(r);
  const totalsBlock = one(xml, "totals-by-vote");
  const totals = {
    yea: +one(totalsBlock, "yea-total"), nay: +one(totalsBlock, "nay-total"),
    present: +one(totalsBlock, "present-total"), notVoting: +one(totalsBlock, "not-voting-total"),
  };
  for (const [k, v] of Object.entries(totals))
    if (!Number.isFinite(v)) throw new Error(`roll ${r.roll}: <totals-by-vote> has no readable ${k}`);

  const legs = [...xml.matchAll(/<recorded-vote>\s*<legislator ([^>]*)>[\s\S]*?<vote>([^<]*)<\/vote>/g)].map((m) => {
    const a = {}; for (const p of m[1].matchAll(/([\w-]+)="([^"]*)"/g)) a[p[1]] = p[2];
    return { bioguide: a["name-id"], name: a["unaccented-name"], state: a.state, party: a.party, vote: m[2].trim() };
  });
  if (!legs.length) throw new Error(`roll ${r.roll}: no <recorded-vote> rows parsed`);

  // The party split is a measurement off the chamber source and it stays in the
  // roll's totals, where the existing model already carries it. It is not used to
  // derive a single word of the mapping rationales, and no reader copy in this
  // wave names a party — see the wave's own test for that assertion.
  const partyTotals = {};
  for (const l of legs) {
    const p = (l.party || "?").toUpperCase(), v = POS[l.vote];
    if (v !== "yea" && v !== "nay") continue;
    partyTotals[p] = partyTotals[p] || { yea: 0, nay: 0 };
    partyTotals[p][v]++;
  }
  const partyMajority = {};
  for (const [p, s] of Object.entries(partyTotals)) partyMajority[p] = s.yea === s.nay ? null : (s.yea > s.nay ? "yea" : "nay");

  const memberVotes = [], unresolved = [];
  for (const l of legs) {
    const position = POS[l.vote];
    if (!position) throw new Error(`roll ${r.roll}: unrecognised position '${l.vote}' for ${l.bioguide}`);
    const politicianId = MAP[l.bioguide];
    if (!politicianId) { unresolved.push(l.bioguide); continue; }
    const maj = partyMajority[(l.party || "?").toUpperCase()] || null;
    const isParty = (position === "yea" || position === "nay") && maj
      ? (position === maj ? "with_party" : "against_party") : null;
    memberVotes.push({ politicianId, bioguideId: l.bioguide, position, isParty });
  }
  memberVotes.sort((a, b) => a.politicianId.localeCompare(b.politicianId));

  const pool = totals.yea + totals.nay;
  const losing = Math.min(totals.yea, totals.nay);
  const question = one(xml, "vote-question");
  // Rule 8/12 admission is recorded per roll rather than assumed: all eleven are
  // 'On Passage', the plainest decisive form, which is why decisiveWhy is null
  // here and why no EXCEPTION had to be argued for this wave.
  if (!/^on passage/i.test(question)) throw new Error(`roll ${r.roll}: question '${question}' is not the passage form this wave admits`);

  out.votes.push({
    chamber: "house", congress: r.congress, session: r.session, rollNumber: r.roll,
    voteDate: isoStamp(xml),
    question, voteDesc: one(xml, "vote-desc"),
    actionType: "passage", result: one(xml, "vote-result"),
    requiredMajority: one(xml, "vote-type").toLowerCase().includes("2/3") ? "two_thirds" : "simple",
    admittedAs: "decisive", decisiveWhy: null,
    totals, partyTotals,
    marginShare: +(losing / pool).toFixed(5),
    sourceUrl: ROLL_URL(r),
    sourceLabel: "Office of the Clerk, U.S. House of Representatives",
    measure: { measureType: "bill", congress: r.congress, chamber: "house", number: r.measure, legisNum: one(xml, "legis-num") },
    _fullChamberRecorded: legs.length,
    _poolYeaNay: pool,
    _losingSide: losing,
    _losingSharePct: +((losing / pool) * 100).toFixed(3),
    _rule11Cleared: losing >= pool / 10,
    _attributed: memberVotes.length,
    _unresolvedRecorded: unresolved.length,
    _unresolvedBioguides: unresolved,
    memberVotes,
  });
}

for (const r of out.votes) if (!r._rule11Cleared) throw new Error(`${r.measure.number}: rule 11 one-tenth bar not cleared`);

out.rollCallCount = out.votes.length;
out.memberVoteCount = out.votes.reduce((a, r) => a + r.memberVotes.length, 0);
out.skippedVoteCount = out.votes.reduce((a, r) => a + r._unresolvedRecorded, 0);
out.newMeasures = out.votes.map((r) => r.measure.number);

out._counts = {
  rolls: out.votes.length,
  fullChamberRecordedRange: [Math.min(...out.votes.map((r) => r._fullChamberRecorded)), Math.max(...out.votes.map((r) => r._fullChamberRecorded))],
  attributedMemberVotes: out.memberVoteCount,
  attributionCeiling: Math.max(...out.votes.map((r) => r._attributed)),
  unresolvedRecordedTotal: out.skippedVoteCount,
  distinctSlugsTouched: new Set(out.votes.flatMap((r) => r.memberVotes.map((v) => v.politicianId))).size,
  losingShareRangePct: [Math.min(...out.votes.map((r) => r._losingSharePct)), Math.max(...out.votes.map((r) => r._losingSharePct))],
};

writeFileSync(join(ROOT, "db", "vr-federal-wave-f6-vote-seed.json"), JSON.stringify(out, null, 1) + "\n");
console.log("wrote db/vr-federal-wave-f6-vote-seed.json");
console.log(JSON.stringify(out._counts, null, 1));
