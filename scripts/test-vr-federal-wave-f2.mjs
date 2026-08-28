#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-vr-federal-wave-f2.mjs — the wave densified the record without moving a floor
// ─────────────────────────────────────────────────────────────────────────────
// F2 exists to turn `vehicle_only` and `incidental` rows into characterised reads by
// attributing standalone contested instruments. That is a coverage number going up,
// which is exactly the shape of change that is easiest to fake. There are four ways to
// fake it and this file closes all four:
//
//   1. LOWER A FLOOR. Drop _RD_MIN_PRIMARY to 0 and every `incidental` row in the corpus
//      becomes readable at once, for free, without a single new vote. Asserted unmoved,
//      by reading the literal out of stance-helpers.js.
//   2. INVENT A KEY. Mint a chip for whatever the unmapped measure happens to be about
//      and the refusal disappears. Asserted: zero keys added, every key F2 touches was
//      already in db/issue-keys.json, and H.R. 1069 — the measure F1 refused nine keys
//      on and F2 was told in as many words not to invent a key for — is still mapped
//      nowhere, in the seed or in any migration.
//   3. PILE SECONDARIES. Add a fifth non-primary row to a key and the coverage count
//      rises while the primary wall pushes members onto `incidental`. Asserted: the only
//      mappings this wave writes are PRIMARY, and the measure it merely attributes keeps
//      exactly the four rows it already had.
//   4. REPORT ONLY THE WINS. Publish `vehicle_only 911 → 816` and not the 29 rows that
//      stopped being characterised. Asserted: the disclosure exists, its arithmetic is
//      internally consistent, it names every affected member, and it agrees with the
//      migration's own header prose.
//
// WHY THE READ-LOSS CHECK IS PINNED HERE AND MEASURED THERE. The authoritative
// no-loss check compares, for every federal pid, the set of rows the engine marks
// `read` before the wave against the set after — and that needs the live database, which
// no test in this suite touches. So the comparison lives in scripts/vr-federal-fpi.mjs
// (readSets(), printed as "rows that stopped being characterised") and its RESULT is
// recorded in the decision seed. What this file guarantees is that the check still
// exists, that the recorded result is self-consistent and complete, and that nobody
// quietly reverted to the old tier-gated LOST list — which reported zero losses on this
// very wave, because it only diffed members whose shape counters had moved.
//
//   node scripts/test-vr-federal-wave-f2.mjs
//
// Exit code is non-zero on the first failure so it can gate CI.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const J = (f) => JSON.parse(R(f));

let passed = 0;
const failures = [];
// Returns the verdict, because one assertion below gates a whole block of field checks
// on it (`if (!ok(...)) continue;`). A void `ok` made that guard always continue, which
// silently skipped every tally, question and attribution check in section 1 — caught by
// the negative controls, not by the suite being green.
const ok = (cond, msg) => { if (cond) { passed++; return true; } failures.push(msg); return false; };
const eq = (a, b, msg) => ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);

const MIG_DIR = "netlify/database/migrations";
const MIG = "20261011000000_vr_federal_wave_f2.sql";
const VOTES = "db/vr-federal-wave-f2-vote-seed.json";
const DECIDE = "db/vr-federal-mapping-seed-f2.json";

// Read once, up front: section 1 checks the seed and the migration agree about when
// each vote happened, and section 4 reads the same text for everything else.
const MIG_SQL = existsSync(join(ROOT, MIG_DIR, MIG)) ? R(join(MIG_DIR, MIG)) : "";

const votes = J(VOTES);
const decide = J(DECIDE);
const memberMap = J("db/vr-member-map.json");
const ROSTER = new Set(Object.values(memberMap.map || {}));

// ── 1. the three admitted rolls, field by field ──────────────────────────────
// Every value here was read out of the Senate's own roll-call XML by the seed builder
// and is restated as a literal so a regenerated seed that drifts is caught rather than
// trusted. A tally is not a detail: it is what makes the vote quotable.
const WANT = [
  { chamber: "senate", congress: 119, session: 1, rollNumber: 95, number: "S.J.Res. 10",
    question: "On the Joint Resolution", result: "rejected", actionType: "passage",
    yea: 47, nay: 52, notVoting: 1, attributed: 98, voteDate: "2025-02-26T17:26:00-05:00" },
  { chamber: "senate", congress: 119, session: 1, rollNumber: 554, number: "S.J.Res. 71",
    question: "On the Joint Resolution", result: "rejected", actionType: "passage",
    yea: 47, nay: 51, notVoting: 2, attributed: 98, voteDate: "2025-10-08T19:05:00-04:00" },
  { chamber: "senate", congress: 119, session: 2, rollNumber: 53, number: "H.R. 6644",
    question: "On Passage of the Bill", result: "passed", actionType: "passage",
    yea: 89, nay: 10, notVoting: 1, attributed: 98, voteDate: "2026-03-12T11:33:00-04:00" },
];
eq((votes.votes || []).length, WANT.length, "F2 vote seed holds exactly the admitted rolls");
eq(votes.memberVoteCount, 294, "F2 vote seed member-vote total");

for (const want of WANT) {
  const v = (votes.votes || []).find((x) => x.chamber === want.chamber && x.congress === want.congress
    && x.session === want.session && x.rollNumber === want.rollNumber);
  const at = `${want.chamber} ${want.congress}/${want.session} roll ${want.rollNumber}`;
  if (!ok(!!v, `${at} (${want.number}) is missing from ${VOTES}`)) continue;
  eq(v.measure.number, want.number, `${at} sits on the right measure`);
  eq(v.question, want.question, `${at} question`);
  eq(v.result, want.result, `${at} result`);
  eq(v.actionType, want.actionType, `${at} action_type`);
  eq(v.totals.yea, want.yea, `${at} yea`);
  eq(v.totals.nay, want.nay, `${at} nay`);
  eq(v.totals.notVoting, want.notVoting, `${at} not voting`);
  eq(v.admittedAs, "decisive", `${at} is admitted as the decisive act`);

  // WHEN, to the minute, in the zone the Senate voted in. senate.gov prints Eastern wall
  // time with no offset on it; a seed that files the calendar day alone ships
  // TIMESTAMPTZ '2026-03-12', which Postgres reads as midnight in the server's zone and
  // can print the vote on 2026-03-11. So the literal asserted here is the full offset-
  // bearing timestamp, the offset is checked against Eastern daylight saving for that
  // date, and the migration is required to insert the same string the seed holds.
  eq(v.voteDate, want.voteDate, `${at} voteDate is not the timestamp the Senate document prints`);
  ok(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-0[45]:00$/.test(String(v.voteDate)),
    `${at} voteDate is not an offset-bearing ISO timestamp — a bare date lands as server-local midnight`);
  const nthSun = (y, mo, n) => { let c = 0; for (let d = 1; d <= 31; d++) { const dt = new Date(Date.UTC(y, mo - 1, d)); if (dt.getUTCMonth() !== mo - 1) break; if (dt.getUTCDay() === 0 && ++c === n) return d; } return null; };
  const [yy, mm, dd] = String(v.voteDate).slice(0, 10).split("-").map(Number);
  const dst = (mm > 3 || (mm === 3 && dd >= nthSun(yy, 3, 2))) && (mm < 11 || (mm === 11 && dd < nthSun(yy, 11, 1)));
  eq(String(v.voteDate).slice(-6), dst ? "-04:00" : "-05:00", `${at} voteDate offset does not match Eastern time on that date`);
  ok(MIG_SQL.includes(`TIMESTAMPTZ '${want.voteDate}'`),
    `${at} migration does not insert the seed's timestamp — the deployed row and the seed disagree about when the vote happened`);

  // Rule 11 / Utah §1121: below one tenth of the yea+nay pool on the losing side, the
  // vote differentiates nobody. Recomputed here rather than read from the seed, because
  // marginShare is the field a pass under pressure would be tempted to soften. H.R. 6644
  // clears it by a tenth of a point (10.101%) and that thinness is the point, not a
  // rounding artefact — the wave declined the same bill's 85-5 motion at 5.556% and its
  // own already-live House roll is 8.205%, below the bar.
  const pool = v.totals.yea + v.totals.nay;
  const share = Math.min(v.totals.yea, v.totals.nay) / pool;
  ok(share >= 0.1, `${at} losing side is ${(share * 100).toFixed(3)}% of the yea+nay pool — under rule 11's one-tenth bar`);
  // The seed stores marginShare rounded to five places (vr-build-federal-wave-f2-seed.mjs),
  // so that rounding is the contract asserted — not a tolerance window, which would let a
  // softened tally slip through as long as it landed close.
  eq(v.marginShare, Number(share.toFixed(5)), `${at} recorded marginShare does not match the tallies (${share})`);

  // Attribution is fail-closed by design, so the seed's own count and its member rows
  // have to agree, and every slug has to be on the roster. A slug that is not is not a
  // roster gap — it is a resolution bug that would file a vote against nobody.
  eq(v.memberVotes.length, want.attributed, `${at} attributed member count`);
  eq(v.resolution.attributed, want.attributed, `${at} recorded resolution.attributed`);
  eq(v.resolution.listed - v.resolution.attributed, (v.resolution.unmappedBioguide || []).length + (v.resolution.unresolvedLis || []).length,
    `${at} listed minus attributed is fully accounted for by named skips`);
  const seen = new Set();
  let dupes = 0, offRoster = [], badPos = [];
  for (const mv of v.memberVotes) {
    if (seen.has(mv.politicianId)) dupes++;
    seen.add(mv.politicianId);
    if (!ROSTER.has(mv.politicianId)) offRoster.push(mv.politicianId);
    if (!["yea", "nay", "present", "not_voting"].includes(mv.position)) badPos.push(`${mv.politicianId}=${mv.position}`);
  }
  eq(dupes, 0, `${at} attributes a member twice`);
  eq(offRoster.length, 0, `${at} attributes votes to slugs outside db/vr-member-map.json: ${offRoster.join(", ")}`);
  eq(badPos.length, 0, `${at} carries an unknown position: ${badPos.join(", ")}`);

  // The yea/nay counts in memberVotes must not exceed the document's own tallies. They
  // will be lower — two senators have no roster slug — but never higher.
  for (const side of ["yea", "nay"]) {
    const n = v.memberVotes.filter((m) => m.position === side).length;
    ok(n <= v.totals[side], `${at} attributes ${n} ${side} votes but the document records ${v.totals[side]}`);
  }
}

// ── 2. what the wave maps, and its polarity ─────────────────────────────────
// Two rows, one key, both PRIMARY, both yea_opposes. The polarity is the whole claim:
// Executive Order 14156 is already in this record at energy_production w100 PRIMARY
// yea_supports, and these resolutions terminate it, so a yea cuts AGAINST expanded
// domestic production. Flip support_meaning and every senator's row inverts silently.
const accepted = [];
const refused = [];
for (const m of decide.measures || []) {
  for (const i of m.issues || []) {
    if (i.decision === "ACCEPTED") accepted.push({ m, i });
    if (i.decision === "REFUSED") refused.push({ m, i });
  }
}
eq(accepted.length, 2, "F2 accepts exactly two mapped rows");
for (const { m, i } of accepted) {
  eq(i.issueKey, "energy_production", `${m.number} maps the intended key`);
  eq(i.weight, 90, `${m.number} energy_production weight`);
  eq(i.isPrimary, true, `${m.number} energy_production is PRIMARY — a fifth secondary would make the key worse, not better`);
  eq(i.supportMeaning, "yea_opposes", `${m.number} energy_production polarity — a termination resolution inverts the chip it terminates`);
  ok(typeof i.rationale === "string" && i.rationale.length >= 200, `${m.number} carries a real rationale`);
  ok(/^https:\/\//.test(i.sourceUrl || ""), `${m.number} carries an https primary source`);
}
eq(refused.length, 1, "F2 records exactly one refused mapping in writing");
eq(refused[0] && refused[0].i.issueKey, "congress_oversight", "the refused mapping is the process axis on the termination resolutions");
ok((refused[0].i.why || "").length >= 200, "the refusal carries an argument, not a label");

// The refusal that mattered most is a roll call, not a key: S.J.Res. 80 was standalone,
// single-subject, Senate-originated, decisively contested and about energy, and it was
// still declined because rule 3 files a CRA disapproval's primary axis as gov_regulation
// and admitting it as energy_production's fifth non-primary row would have made the key
// measurably worse. If that entry ever disappears, the wave's central discipline is gone.
const declined = decide.declinedRollCalls || [];
ok(declined.some((d) => (d.measure || "") === "S.J.Res. 80" && /rule 3/i.test(d.why || "")),
  "the S.J.Res. 80 refusal, and its rule-3 argument, is still recorded");
eq(decide._counts.rollCallsDeclined, 15, "declined roll-call count");
ok(declined.length > 0 && declined.every((d) => (d.why || "").length >= 80),
  "every declined roll call carries a written reason");

// ── 3. the retraction, guarded and argued ───────────────────────────────────
eq((decide.retractions || []).length, 1, "F2 retracts exactly one row");
const ret = (decide.retractions || [])[0] || {};
eq(ret.number, "H.R. 1048", "the retraction is on the measure follow-up 0e named");
eq(ret.issueKey, "america_first", "the retracted key");
eq(ret.was && ret.was.weight, 70, "the retracted row's weight");
eq(ret.was && ret.was.isPrimary, false, "the retracted row is not the measure's primary — the measure keeps gov_transparency");
eq(ret.was && ret.was.supportMeaning, "yea_supports", "the retracted row's polarity");
for (const field of ["why", "whyItIsSafeToRemove", "costDisclosed"]) {
  ok(typeof ret[field] === "string" && ret[field].length >= 200,
    `the retraction carries its ${field} — runbook rule 21 wants an argument, not a silent rewrite`);
}

// ── 4. no floor moved ────────────────────────────────────────────────────────
// The single cheapest way to fake this wave. _RD_MIN_PRIMARY = 0 turns every
// `incidental` row in the corpus readable for free. Read as a literal out of the engine.
const helpers = R("stance-helpers.js");
const floor = (name) => {
  const m = helpers.match(new RegExp(`var\\s+${name}\\s*=\\s*(\\d+)\\s*;`));
  return m ? Number(m[1]) : null;
};
eq(floor("_RD_MIN_PRIMARY"), 1, "_RD_MIN_PRIMARY is unmoved — this wave supplies primaries, it does not stop requiring one");
eq(floor("_RD_MIN_JUDGED"), 4, "_RD_MIN_JUDGED is unmoved");
eq(decide._counts.floorsMoved, 0, "the decision seed claims no floor moved");
eq(decide._counts.keysAdded, 0, "the decision seed claims no key added");

// ── 5. no key invented, and H.R. 1069 is still mapped nowhere ───────────────
const keyFile = J("db/issue-keys.json");
const KNOWN = new Set(keyFile.keys || []);
eq(KNOWN.size, keyFile.count, "db/issue-keys.json count matches its own key list");
for (const { m, i } of accepted) ok(KNOWN.has(i.issueKey), `${m.number} maps ${i.issueKey}, which is not in db/issue-keys.json — F2 added a key`);
for (const c of (decide.readLossDisclosure || {}).causes || []) {
  const k = (c.cause || "").split(",")[0].trim();
  ok(!k || KNOWN.has(k), `readLossDisclosure names ${k}, which is not a known key`);
}

// Scanned locally rather than by importing test-mapping-discipline.mjs, which runs its
// whole suite on import and can exit(1) — masking this file's result with another file's.
// A migration maps H.R. 1069 if it looks the measure up into a plpgsql local and then
// names that local in a vr_measure_issues insert.
const migFiles = readdirSync(join(ROOT, MIG_DIR)).filter((f) => f.endsWith(".sql")).sort();
const mapped1069 = [];
for (const f of migFiles) {
  const src = stripSqlComments(R(join(MIG_DIR, f)));
  if (!src.includes("H.R. 1069")) continue;
  const vars = new Set();
  for (const m of src.matchAll(/SELECT\s+id\s+INTO\s+(\w+)\s+FROM\s+vr_measures([\s\S]{0,300}?);/gi)) {
    if (m[2].includes("'H.R. 1069'")) vars.add(m[1]);
  }
  for (const m of src.matchAll(/INSERT INTO vr_measure_issues[\s\S]{0,4000}?;/gi)) {
    for (const v of vars) if (new RegExp(`\\(\\s*${v}\\s*,`).test(m[0])) mapped1069.push(`${f} (${v})`);
  }
}
eq(mapped1069.length, 0,
  `H.R. 1069 carries an issue mapping in a migration (${mapped1069.join(", ")}). F1 refused nine candidate keys `
  + "on it in writing and F2 was told not to invent one for the 1069-class vocabulary gap unless the V1 standing "
  + "rules all pass. They do not: the vocabulary has no key for foreign influence in domestic institutions.");
ok(!(J("db/vr-issue-seed.json").measures || []).some((m) => m.number === "H.R. 1069"),
  "H.R. 1069 is mapped in db/vr-issue-seed.json");

// ── 6. the migration says what the seeds say ────────────────────────────────
ok(existsSync(join(ROOT, MIG_DIR, MIG)), `${MIG} is on disk`);
const sql = MIG_SQL;
// Counting clauses has to ignore the ones the header prose names, or the migration is
// penalised for explaining itself. Quote-aware, because rationales contain '--'.
function stripSqlComments(src) {
  let out = "", i = 0, q = false;
  while (i < src.length) {
    if (q) { if (src[i] === "'") { if (src[i + 1] === "'") { out += "''"; i += 2; continue; } q = false; } out += src[i++]; continue; }
    if (src[i] === "'") { q = true; out += src[i++]; continue; }
    if (src[i] === "-" && src[i + 1] === "-") { while (i < src.length && src[i] !== "\n") i++; continue; }
    out += src[i++];
  }
  return out;
}
const code = stripSqlComments(sql);

for (const want of WANT) {
  ok(sql.includes(`AND session = ${want.session} AND roll_number = ${want.rollNumber} LIMIT 1;`),
    `${MIG} does not read back ${want.chamber} ${want.congress}/${want.session} roll ${want.rollNumber}`);
}
eq((code.match(/INSERT INTO vr_rollcalls/g) || []).length, 3, `${MIG} roll-call inserts`);
eq((code.match(/INSERT INTO vr_member_votes/g) || []).length, 3, `${MIG} member-vote inserts`);
eq((code.match(/INSERT INTO vr_measure_issues/g) || []).length, 2, `${MIG} mapping inserts — one per accepted measure, and none for the measure it merely attributes`);
eq((code.match(/ON CONFLICT \(rollcall_id, politician_id\) DO NOTHING/g) || []).length, 3,
  `${MIG} must top up member votes idempotently, never overwrite`);
eq((code.match(/ON CONFLICT \(measure_id, issue_key\) DO NOTHING/g) || []).length, 2,
  `${MIG} must never rewrite a live rationale`);

// Exactly one DELETE, and it is guarded on every field of the value it removes. An
// unguarded DELETE would be a silent rewrite; a DELETE guarded only on issue_key would
// clobber a later, better-informed row without reading it.
eq((code.match(/\bDELETE FROM\b/g) || []).length, 1, `${MIG} holds exactly one DELETE`);
for (const guard of ["issue_key = 'america_first'", "weight = 70", "is_primary = false",
  "support_meaning = 'yea_supports'", "AND rationale = 'Targets foreign influence"]) {
  ok(sql.includes(guard), `${MIG}'s DELETE is not guarded on ${guard}`);
}
// And no UPDATE at all: F2 adds, attributes and removes one argued row. It rewrites nothing.
eq((code.match(/^\s*UPDATE vr_/gm) || []).length, 0, `${MIG} rewrites a live row with an UPDATE`);

// Creation must be guarded: federal (measure_type, congress, chamber, number) has no
// unique index, so an unguarded INSERT duplicates the measure on a second run and splits
// its rolls across two ids.
for (const n of ["S.J.Res. 10", "S.J.Res. 71"]) {
  const varn = `m_119_s_j_res_${n.split(" ")[1]}`;
  ok(new RegExp(`IF ${varn} IS NULL THEN\\s*INSERT INTO vr_measures`).test(code),
    `${MIG} creates ${n} without an IF ... IS NULL guard`);
}
ok(!/vr_measures[\s\S]{0,400}?ON CONFLICT/.test(code.split("INSERT INTO vr_rollcalls")[0] || ""),
  `${MIG} relies on ON CONFLICT for vr_measures, which carries no unique index for federal measures`);

// The verification block's own tripwires.
for (const assertion of [
  "H.R. 1069 is deliberately unmapped",
  "expected exactly 4",                       // H.R. 6644's row count is pinned
  "still carries % america_first row(s)",     // the retraction actually happened
  "energy_production w90 PRIMARY yea_opposes",
  "housing_build PRIMARY measure",
]) ok(sql.includes(assertion), `${MIG}'s verification block dropped the assertion for: ${assertion}`);
ok(!/_RD_MIN_PRIMARY|_RD_MIN_JUDGED/.test(code),
  `${MIG} references an engine floor in executable SQL`);

// ── 7. the cost, disclosed and internally consistent ────────────────────────
// The acceptance criterion for this wave is that no row the engine already characterised
// stops being characterised. 29 do. Refusing to publish that would make the wave's own
// numbers unfalsifiable, so the disclosure is required to exist, to add up, and to name
// every affected member — and the four briefs the wave was measured on must be absent.
const disc = decide.readLossDisclosure;
ok(!!disc, `${DECIDE} has no readLossDisclosure — the wave stops characterising 29 rows and must say so`);
if (disc) {
  const named = (disc.causes || []).flatMap((c) => c.members || []);
  eq(named.length, disc.totals.lost, "readLossDisclosure names every lost row it counts");
  eq(new Set(named).size, named.length, "readLossDisclosure names a member twice");
  eq(disc.totals.lost, 29, "recorded read-loss total");
  ok(disc.totals.gained > disc.totals.lost, "readLossDisclosure claims a net gain it does not show");
  eq(Object.keys(disc.totals.lostTiers || {}).join(","), "thin",
    "every lost row must be from the weakest read tier — a clear or split read going unread is a different, worse finding");
  eq(disc.totals.lostTiers.thin, disc.totals.lost, "lostTiers does not account for every lost row");
  eq(Object.values(disc.totals.gainedTiers || {}).reduce((a, b) => a + b, 0), disc.totals.gained,
    "gainedTiers does not account for every gained row");
  eq(disc.utahSeven.lost, 0, "the Utah seven lose a characterised row");
  for (const pid of ["lee", "owens", "bmoore", "curtis", "kennedy", "maloy", "cstewart"]) {
    ok(!named.includes(pid),
      `${pid} appears in readLossDisclosure. The brief's named acceptance is that the Lee / Owens / Moore / Curtis `
      + "briefs do not lose characterised rows.");
  }
  for (const c of disc.causes || []) {
    ok((c.mechanism || "").length >= 200, `a readLossDisclosure cause has no mechanism written out`);
    ok((c.whyItIsNotFixed || "").length >= 150, `a readLossDisclosure cause does not say why it is not fixed`);
    eq(c.wasTier, "thin", "a readLossDisclosure cause claims a loss from a tier above thin");
  }
  // Neither cause may be a primary-wall trip. That is the one failure mode the wave was
  // told to avoid by name, and the distinction is load-bearing: `mixed_thin` is a
  // contradiction surfaced, `incidental` from a piled secondary is a wall tripped.
  const perm = (disc.causes || []).find((c) => (c.members || []).includes("barrasso"));
  ok(perm && perm.nowReason === "mixed_thin" && /not a wall trip/i.test(JSON.stringify(perm)),
    "the permitting_reform loss must be recorded as a surfaced contradiction, not a tripped wall");
  ok(sql.includes(`${disc.totals.gained} rows`) || sql.includes(`characterising ${disc.totals.gained}`),
    `${MIG}'s header does not quote the same gained-row count as ${DECIDE}`);
  ok(sql.includes(`STOPS characterising ${disc.totals.lost}`),
    `${MIG}'s header does not quote the same lost-row count as ${DECIDE}`);
}

// The measuring instrument itself. The tier-gated list reported ZERO losses on this very
// wave, because it only diffed members whose shape counters had moved. If the direct
// read-flag comparison is removed, the acceptance criterion becomes unmeasurable and the
// next wave's report will be wrong in exactly the way this one nearly was.
const fpi = R("scripts/vr-federal-fpi.mjs");
for (const marker of ["function readSets(", "if (r.read) keys.set(", "LOST_READS", "GAINED_READS",
  "rows that STOPPED being characterised"]) {
  ok(fpi.includes(marker),
    `scripts/vr-federal-fpi.mjs lost ${marker} — the direct read-flag no-loss check is the only thing that `
    + "measures this wave's acceptance criterion; the tier-gated list reported 0 losses when there were 29");
}

// ── 8. follow-up 0e's third item: owens and maloy carry a state ─────────────
// compare-table.js's _cmpStateCode() reads CMP_DATA[pid].state, walks a state-name map,
// then falls back to the first alphabetic run. With state "District 4" it returned
// "district" — so neither member resolved as a Utah member and neither could be matched
// to a Utah peer. The value has to name the state.
const cmp = R("cmp-data.js");
for (const [pid, want] of [["owens", "Utah · District 4"], ["maloy", "Utah · District 2"]]) {
  const block = cmp.slice(cmp.indexOf(`"${pid}": {`));
  const m = block.slice(0, 400).match(/"state":\s*"([^"]*)"/);
  eq(m && m[1], want, `${pid}'s CMP_DATA state field`);
}

// ── 9. the mapping came with its mechanism lines ─────────────────────────────
// A judged act on a Contradicted or Mixed row is gated at 100% curated coverage by
// scripts/test-mechanism-completeness.mjs, so landing these two rows without writing
// their _DOS_MECH entries would break the suite the moment the migration ran. It is
// pinned here as well because that gate reports a percentage over the whole corpus:
// it will say what is owed, but this file is where the wave's own debt is named. The
// entries also have to be per-issue prose rather than the derived restatement, which
// is what the `did`/`why` presence check below is for.
const cons = R("consistency.js");
const mech = (cons.match(/var _DOS_MECH = \{[\s\S]*?\n  \};/) || [""])[0];
ok(mech.length > 1000, "could not read _DOS_MECH out of consistency.js");
for (const num of ["S.J.Res. 10", "S.J.Res. 71"]) {
  const key = `'${num}|119|energy_production': {`;
  const at = mech.indexOf(key);
  if (!ok(at !== -1, `${num} has no curated mechanism entry — the row would render in the derived voice`)) continue;
  const entry = mech.slice(at, at + 2400);
  const body = entry.slice(0, entry.indexOf("\n    },"));
  ok(/\n      did: '[^']{80,}'/.test(body), `${num}'s mechanism entry has no "what it did" line of any substance`);
  ok(/\n      why: '[^']{80,}'/.test(body), `${num}'s mechanism entry has no "why it counts here" line of any substance`);
  ok(!/Counted on .+ because that is /.test(body), `${num}'s curated slot holds the derived restatement`);
  ok(/14156/.test(body), `${num}'s mechanism prose does not name the order the resolution terminates`);
}

// ── 10. the migration on disk is the one the generator writes ─────────────────
// The migration is generated, not hand-written, and the generator prints to stdout — so
// the file can fall behind the script that produces it without anything complaining. It
// had: the on-disk copy carried a two-line refusal for H.R. 6644's motions to proceed
// while the generator had grown the full rule-8-then-rule-11 argument, and the vote
// timestamps were a calendar day behind a builder fix. Byte-identical is the contract,
// because anything looser is a licence for the deployed SQL and its stated reasoning to
// drift apart.
const GEN = "scripts/vr-gen-federal-wave-f2-migration.mjs";
if (ok(existsSync(join(ROOT, GEN)), `${GEN} is on disk`)) {
  let out = "", genFailed = null;
  try {
    out = execFileSync(process.execPath, [join(ROOT, GEN)], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] });
  } catch (e) { genFailed = e.message; }
  if (ok(!genFailed, `${GEN} does not run: ${genFailed}`)) {
    ok(out === MIG_SQL,
      `${MIG} is not what ${GEN} writes — regenerate it (${out.length} bytes generated vs ${MIG_SQL.length} on disk)`);
  }
}

// ── report ───────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ federal wave F2: ${failures.length} of ${passed + failures.length} assertions failed\n`);
  for (const f of failures) console.error(`  · ${f}`);
  console.error("");
  process.exit(1);
}
console.log(`✓ federal wave F2: all ${passed} assertions passed`);
console.log(`  3 rolls · 294 attributed votes · 2 PRIMARY rows · 1 guarded retraction · 15 rolls declined · `
  + `0 keys added · 0 floors moved · ${decide.readLossDisclosure.totals.lost} read losses named, ${decide.readLossDisclosure.totals.gained} gained`);
