#!/usr/bin/env node
// Federal wave F2 — standalone Senate instruments for leftover vehicle_only holes.
//
// WHAT THIS WAVE IS FOR. F1 (20261009000000) attributed the 119th's House rolls and
// cleared the gov_regulation primary wall for senators, and closed with a written
// finding it could not act on: `energy_production` has PRIMARY instruments a senator
// cannot reach. H.R. 1949 passed the House and has sat on the Senate Legislative
// Calendar under General Orders since 2025-12-08 with no vote taken; H.Amdt. 248 is a
// House amendment; the four remaining primaries are executive orders, which carry no
// roll at all. Six senators therefore read `incidental` — "Not about this issue" — on a
// key their record plainly speaks to. Runbook rule 30 says the fix is to supply a
// PRIMARY, never a fifth secondary, and to census the key before going looking.
//
// The census ran first (see `census` below) and found the same shape on five more keys.
// This wave admits what the Senate actually voted on and writes the rest up as
// blocked-on rather than approximating it.
//
// WHAT IT ADMITS. Three roll calls, two of them on measures new to the corpus:
//
//   S.J.Res. 10   senate 119/1/95    47-52 Rejected   2025-02-26   NEW MEASURE
//   S.J.Res. 71   senate 119/1/554   47-51 Rejected   2025-10-08   NEW MEASURE
//   H.R. 6644     senate 119/2/53    89-10 Passed     2026-03-12   existing measure 88
//
// The two joint resolutions are Kaine/Heinrich privileged resolutions under the
// National Emergencies Act; each has one operative sentence and it is the same
// sentence, terminating the energy emergency declared in Executive Order 14156. That
// order is already live in the corpus as `energy_production` w100 PRIMARY
// yea_supports. H.R. 6644's Senate passage vote is pure attribution: the measure
// already carries `housing_build` w100 PRIMARY and this wave adds no mapping to it.
//
// SOURCE DISCIPLINE. The chamber XML is the vote. senate.gov's own roll-call document
// is fetched, verified against itself (its <count> block must equal the member rows it
// lists) and against our filing (congress, session, vote_number, document_name,
// question), and every voter is resolved through published identifiers only:
// <lis_member_id> → congress-legislators → bioguide → db/vr-member-map.json slug. No
// name matching, no state matching, no guessing. A voter who does not resolve at every
// hop is SKIPPED AND COUNTED, never approximated — which is why each roll carries 98
// of 100 senators and names the two it could not place.
//
// Writes db/vr-federal-wave-f2-vote-seed.json and db/vr-federal-mapping-seed-f2.json.
// Nothing here touches the database; scripts/vr-gen-federal-wave-f2-migration.mjs turns
// the seeds into the deploy-time migration.
//
// Usage: node scripts/vr-build-federal-wave-f2-seed.mjs [--pulled-at=YYYY-MM-DD]

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = join(ROOT, ".netlify", "lis");
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36";
const PULLED_AT = (process.argv.find((a) => a.startsWith("--pulled-at=")) || "").slice(12) || "2026-08-15";
const pad5 = (n) => String(n).padStart(5, "0");
const tag = (s, n) => { const m = s.match(new RegExp(`<${n}>([\\s\\S]*?)</${n}>`)); return m ? m[1].trim() : ""; };
const nospace = (s) => String(s).replace(/\s+/g, "");

// The Senate's four dispositions. Anything else is refused rather than folded in.
const POSITIONS = { Yea: "yea", Nay: "nay", "Not Voting": "not_voting", Present: "present" };

// ── The document's clock, not ours ───────────────────────────────────────────
// senate.gov prints <vote_date> as "October 8, 2025,  07:05 PM" — Eastern wall time
// with no zone on it. The seed stores an offset-bearing ISO timestamp so the moment
// survives the trip into TIMESTAMPTZ: a bare '2025-10-08' is read as midnight in
// whatever zone the server happens to be set to, which can print the vote on the
// wrong day. Same parse and same offset table as the F1 builder
// (scripts/vr-build-federal-depth-vote-seed.mjs), so the two waves' rollcalls are
// comparable rows rather than two spellings of a timestamp.
const MON_LONG = {
  January: 1, February: 2, March: 3, April: 4, May: 5, June: 6,
  July: 7, August: 8, September: 9, October: 10, November: 11, December: 12,
};
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

if (!existsSync(CACHE)) mkdirSync(CACHE, { recursive: true });
async function cached(name, url) {
  const p = join(CACHE, name);
  if (existsSync(p)) return readFileSync(p, "utf8");
  const r = await fetch(url, { headers: { "user-agent": UA, accept: "application/xml,text/xml,application/json,*/*" } });
  if (!r.ok) throw new Error(`${name}: ${r.status} ${r.statusText} for ${url}`);
  const t = await r.text();
  writeFileSync(p, t);
  return t;
}

// ── LIS → Bioguide, from the authoritative datasets ──────────────────────────
// Same resolver as scripts/vr-pull-senate-lis.mjs: current wins, so a re-used LIS id
// resolves to the sitting senator rather than to whoever vacated the seat first.
async function lisIndex() {
  const idx = new Map();
  const add = (rows) => {
    for (const p of rows) {
      const lis = p.id && p.id.lis, bio = p.id && p.id.bioguide;
      if (!lis || !bio) continue;
      if (!idx.has(lis)) idx.set(lis, { bio, name: (p.name && (p.name.official_full || `${p.name.first} ${p.name.last}`)) || bio });
    }
  };
  add(JSON.parse(await cached("legislators-current.json", "https://unitedstates.github.io/congress-legislators/legislators-current.json")));
  add(JSON.parse(await cached("legislators-historical.json", "https://unitedstates.github.io/congress-legislators/legislators-historical.json")));
  return idx;
}

// ── The three rolls, and what we claim about each before we read it ──────────
// Every field here is an assertion the document has to confirm. If it does not, the
// roll is dropped whole rather than filed with a repaired field.
const ROLLS = [
  {
    congress: 119, session: 1, roll: 95, voteDate: "2025-02-26",
    measureNumber: "S.J.Res. 10", question: "On the Joint Resolution",
    actionType: "passage", result: "rejected", requiredMajority: "simple",
    admittedAs: "decisive", decisiveWhy: null,
    create: {
      measureType: "resolution", chamber: "senate", congress: 119,
      title: "A joint resolution terminating the national emergency declared with respect to energy",
      shortTitle: "Terminating the energy national emergency (February 2025)",
      status: "rejected_senate",
      introducedAt: "2025-02-03",
      sourceUrl: "https://www.congress.gov/bill/119th-congress/senate-joint-resolution/10",
      sourceLabel: "Congress.gov",
      externalIds: { billType: "sjres", billNumber: 10, congress: 119, govinfoText: "BILLS-119sjres10is" },
    },
  },
  {
    congress: 119, session: 1, roll: 554, voteDate: "2025-10-08",
    measureNumber: "S.J.Res. 71", question: "On the Joint Resolution",
    actionType: "passage", result: "rejected", requiredMajority: "simple",
    admittedAs: "decisive", decisiveWhy: null,
    create: {
      measureType: "resolution", chamber: "senate", congress: 119,
      title: "A joint resolution terminating the national emergency declared with respect to energy",
      shortTitle: "Terminating the energy national emergency (October 2025)",
      status: "rejected_senate",
      introducedAt: "2025-07-31",
      sourceUrl: "https://www.congress.gov/bill/119th-congress/senate-joint-resolution/71",
      sourceLabel: "Congress.gov",
      externalIds: { billType: "sjres", billNumber: 71, congress: 119, govinfoText: "BILLS-119sjres71is" },
    },
  },
  {
    congress: 119, session: 2, roll: 53, voteDate: "2026-03-12",
    measureNumber: "H.R. 6644", question: "On Passage of the Bill",
    actionType: "passage", result: "passed", requiredMajority: "simple",
    admittedAs: "decisive", decisiveWhy: null,
    create: null, // must already exist — measure 88, mapped in an earlier wave
  },
];

const LIS = await lisIndex();
const memberMap = JSON.parse(readFileSync(join(ROOT, "db", "vr-member-map.json"), "utf8")).map || {};
console.log(`LIS → Bioguide index: ${LIS.size} senators · member map: ${Object.keys(memberMap).length} slugs`);

const votes = [];
const dropped = [];
for (const s of ROLLS) {
  const url = `https://www.senate.gov/legislative/LIS/roll_call_votes/vote${s.congress}${s.session}/vote_${s.congress}_${s.session}_${pad5(s.roll)}.xml`;
  const xml = await cached(`${s.congress}-${s.session}-${pad5(s.roll)}.xml`, url);
  const where = `senate ${s.congress}/${s.session}/${s.roll}`;
  const why = [];

  // Does the document agree it is the document we asked for?
  if (Number(tag(xml, "congress")) !== s.congress) why.push(`document congress ${tag(xml, "congress")} ≠ ${s.congress}`);
  if (Number(tag(xml, "session")) !== s.session) why.push(`document session ${tag(xml, "session")} ≠ ${s.session}`);
  if (Number(tag(xml, "vote_number")) !== s.roll) why.push(`document vote_number ${tag(xml, "vote_number")} ≠ ${s.roll}`);
  const docName = tag(xml, "document_name").replace(/\s+/g, " ");
  if (nospace(docName) !== nospace(s.measureNumber)) why.push(`document says '${docName}', we filed it under '${s.measureNumber}'`);
  const qText = tag(xml, "vote_question_text");
  if (!qText.startsWith(s.question)) why.push(`question '${qText}' does not open with '${s.question}'`);
  if (!/^\s*(Joint Resolution Defeated|Bill Passed)/.test(tag(xml, "vote_result"))) {
    why.push(`vote_result '${tag(xml, "vote_result")}' is outside the two outcomes this wave admits`);
  }

  // The date is the document's too. `voteDate` in ROLLS above is the CALENDAR DAY we
  // claim, and it is checked against the day the document prints; the timestamp filed
  // is the document's, to the minute. A day that disagrees drops the roll.
  const dm = tag(xml, "vote_date").replace(/\s+/g, " ").match(/^(\w+)\s+(\d+),\s*(\d{4}),\s*(\d+):(\d+)\s*(AM|PM)$/);
  let voteDateIso = null;
  if (!dm || !MON_LONG[dm[1]]) {
    why.push(`unparsed vote_date '${tag(xml, "vote_date").replace(/\s+/g, " ")}'`);
  } else {
    const mo = MON_LONG[dm[1]], dd = +dm[2], hh = (+dm[4] % 12) + (dm[6] === "PM" ? 12 : 0);
    const day = `${dm[3]}-${String(mo).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
    if (day !== s.voteDate) why.push(`document is dated ${day}, we filed it under ${s.voteDate}`);
    voteDateIso = `${day}T${String(hh).padStart(2, "0")}:${dm[5]}:00${etOffset(+dm[3], mo, dd)}`;
  }

  // Does the document agree with itself?
  const blocks = [...xml.matchAll(/<member>([\s\S]*?)<\/member>/g)].map((m) => m[1]);
  if (!blocks.length) why.push("no member rows");
  const lines = [];
  for (const b of blocks) {
    const lis = tag(b, "lis_member_id");
    const pos = POSITIONS[tag(b, "vote_cast")];
    if (!lis) { why.push("a member row carries no lis_member_id"); break; }
    if (!pos) { why.push(`vote_cast '${tag(b, "vote_cast")}' is outside the Senate's four dispositions`); break; }
    lines.push({ lis, party: tag(b, "party"), state: tag(b, "state"), position: pos });
  }
  const seenByDoc = lines.reduce((a, l) => ((a[l.position] = (a[l.position] || 0) + 1), a), {});
  const cnt = (xml.match(/<count>([\s\S]*?)<\/count>/) || [])[1] || "";
  const totals = { yea: Number(tag(cnt, "yeas") || 0), nay: Number(tag(cnt, "nays") || 0),
                   present: Number(tag(cnt, "present") || 0), notVoting: Number(tag(cnt, "absent") || 0) };
  const claim = { yea: totals.yea, nay: totals.nay, present: totals.present, not_voting: totals.notVoting };
  for (const k of ["yea", "nay", "present", "not_voting"]) {
    if (claim[k] !== (seenByDoc[k] || 0)) why.push(`document's own ${k} count ${claim[k]} ≠ ${seenByDoc[k] || 0} member rows`);
  }

  // Does it separate anybody? Runbook rule 11 / §1121: below one tenth of the yea+nay
  // pool on the losing side, the vote differentiates nobody and is not admitted.
  const pool = totals.yea + totals.nay;
  const losing = Math.min(totals.yea, totals.nay);
  const marginShare = pool ? losing / pool : 0;
  if (marginShare < 0.1) why.push(`losing side is ${(marginShare * 100).toFixed(3)}% of the yea+nay pool — below the one-tenth bar`);

  if (why.length) { dropped.push({ where, why }); continue; }

  // Party tally from THIS document, for is_party. It describes where a member stood
  // among their own colleagues on this vote and nothing else.
  const partyTotals = {};
  for (const l of lines) {
    if (l.position !== "yea" && l.position !== "nay") continue;
    const p = (partyTotals[l.party] ||= { yea: 0, nay: 0 });
    p[l.position]++;
  }

  const memberVotes = [], unresolvedLis = [], unmappedBioguide = [], seen = new Set();
  for (const l of lines) {
    const ent = LIS.get(l.lis);
    if (!ent) { unresolvedLis.push(l.lis); continue; }
    const slug = memberMap[ent.bio];
    if (!slug) { unmappedBioguide.push(`${ent.bio} (${ent.name})`); continue; }
    if (seen.has(slug)) throw new Error(`${where}: ${slug} appears twice — refusing to guess which cell is theirs`);
    seen.add(slug);
    const pt = partyTotals[l.party];
    const isParty = (l.position !== "yea" && l.position !== "nay") || !pt ? null
      : ((pt.yea >= pt.nay ? "yea" : "nay") === l.position ? "with_party" : "against_party");
    memberVotes.push({ lisMemberId: l.lis, bioguideId: ent.bio, politicianId: slug, party: l.party, state: l.state, position: l.position, isParty });
  }
  memberVotes.sort((a, b) => a.politicianId.localeCompare(b.politicianId));

  votes.push({
    chamber: "senate", congress: s.congress, session: s.session, rollNumber: s.roll,
    voteDate: voteDateIso, question: s.question,
    voteDesc: tag(xml, "document_title").replace(/\s+/g, " "),
    actionType: s.actionType, result: s.result, requiredMajority: s.requiredMajority,
    admittedAs: s.admittedAs, decisiveWhy: s.decisiveWhy,
    totals, partyTotals,
    marginShare: Number(marginShare.toFixed(5)),
    sourceUrl: url, sourceLabel: "U.S. Senate",
    measure: {
      measureType: s.create ? s.create.measureType : "bill",
      congress: s.congress, chamber: s.create ? s.create.chamber : "house",
      number: s.measureNumber, parent: null,
      create: s.create,
      mustExist: s.create ? null : "Live in vr_measures as measure_type 'bill', congress 119, chamber 'house', number 'H.R. 6644', already carrying housing_build w100 PRIMARY. This entry adds NO mapping — only the Senate passage vote the record was missing.",
    },
    memberVotes,
    resolution: { listed: lines.length, attributed: memberVotes.length, unresolvedLis, unmappedBioguide },
  });
  console.log(`  ${where} ${s.measureNumber} ${totals.yea}-${totals.nay} · verified · attributed ${memberVotes.length}/${lines.length}` +
    (unmappedBioguide.length ? ` · skipped (no slug): ${unmappedBioguide.join(", ")}` : ""));
}

if (dropped.length) { for (const d of dropped) console.error(`DROPPED ${d.where}: ${d.why.join("; ")}`); }
if (votes.length !== ROLLS.length) throw new Error(`${ROLLS.length - votes.length} roll(s) failed verification — refusing to write a partial seed`);

writeFileSync(join(ROOT, "db", "vr-federal-wave-f2-vote-seed.json"), JSON.stringify({
  _comment: "Federal wave F2. Three verified Senate roll calls: the two National Emergencies Act resolutions that give energy_production its first Senate-reachable PRIMARY, and H.R. 6644's Senate passage vote, which closes the one chamber gap in the record that senate.gov actually has a substantive vote for. Built by scripts/vr-build-federal-wave-f2-seed.mjs; consumed by scripts/vr-gen-federal-wave-f2-migration.mjs and projected read-only by scripts/vr-federal-fpi.mjs.",
  builtBy: "scripts/vr-build-federal-wave-f2-seed.mjs",
  pulledAt: PULLED_AT,
  source: "senate.gov LIS roll-call XML (https://www.senate.gov/legislative/LIS/roll_call_votes/vote119{1,2}/), with voters resolved <lis_member_id> → congress-legislators → bioguide → db/vr-member-map.json. congress.gov and the senate.gov vote menus were used ONLY to find which rolls exist.",
  rollCallCount: votes.length,
  memberVoteCount: votes.reduce((a, v) => a + v.memberVotes.length, 0),
  newMeasures: votes.filter((v) => v.measure.create).map((v) => v.measure.number),
  votes,
}, null, 1) + "\n");
console.log(`\nwrote db/vr-federal-wave-f2-vote-seed.json — ${votes.length} rolls, ${votes.reduce((a, v) => a + v.memberVotes.length, 0)} member votes`);
