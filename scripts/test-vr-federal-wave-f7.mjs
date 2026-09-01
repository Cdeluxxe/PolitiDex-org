#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-vr-federal-wave-f7.mjs — the wave that read the pool F6 left, and the
// seven rolls it deliberately did not map
// ─────────────────────────────────────────────────────────────────────────────
// F7 is an ingest wave like F6, but its shape is different in three ways that each
// create a failure mode F6's harness has no reason to check:
//
//   · IT IS MOSTLY SENATE. The LIS document carries no bioguide, so attribution runs
//     on (surname, state) and a Smith or a Lee collision resolves to nobody rather
//     than to a guess. And the LIS <vote_tally> element renders "51-42" as a display
//     string, which parses as the integer 5142 and hands rule 11 a losing side of
//     zero — the authority is <count><yeas>/<nays>, and section 3 checks the totals
//     it actually shipped against the full chamber rather than against the roster.
//   · IT ADMITS FOURTEEN ROLLS AND MAPS SEVEN. A privileged war-powers resolution
//     reaches the floor only if the committee is discharged, so the discharge motion
//     IS the vote — and eleven of these fourteen are the SAME text aimed at Iran.
//     Runbook rule 34 admits a repeat only where each roll is the only record of
//     somebody's position, so seven rolls ship ingested with zero issue mappings.
//     That decision is a read LOSS unless no senator's judged position lives only on
//     a withheld roll, and section 7 proves that from the vote seed rather than
//     taking the seed's word for it.
//   · IT KEYS FOUR DISTRICT OF COLUMBIA BILLS TO A SUBJECT. F6 ran the six vocab
//     rules on a District key and refused it on rule 5, venue is not subject. This
//     wave does not reopen that: the four admitted bills carry border_security,
//     deportations and tough_on_crime — chips a reader already knows — and section 5
//     requires no key, chip or tree slot naming the venue anywhere in the wave.
//
// Everything else is the standing contract, and it is checked the way F2-F6 check it:
// the refusal record first, the funnels closing arithmetically, the ceilings disclosed
// rather than implied, the walls (H.R. 1069 and H.R. 973 at zero mappings in every
// migration in the tree), the floors unmoved, data-only SQL declaring no object, the
// pack-generation declaration verbatim, one shipped file with a version note that says
// what a warm device would otherwise show, no party word in anything a reader sees, and
// a twin boot of HEAD against this tree requiring Direction Match, the scoped read and
// every per-issue row to come out identical.
//
// WHAT THIS FILE DOES NOT DO. It does not assert that the four refused Senate rolls,
// the five refused District measures or the 53 bridged-but-unread amendment rolls are
// unmappable — all of them are reopenable by a later pass on their own terms, and the
// seed names each with a reason. What is pinned is what THIS wave did, and that its own
// record of it is true.
//
//   node scripts/test-vr-federal-wave-f7.mjs
//
// Read-only. No database, no network.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const J = (f) => JSON.parse(R(f));

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) { passed++; return true; } failures.push(msg); return false; };
const eq = (a, b, msg) => ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);

const MIG_DIR = "netlify/database/migrations";
const MIGS = readdirSync(join(ROOT, MIG_DIR)).filter((f) => f.endsWith(".sql")).sort();
const MIGRATION = "20261023000000_vr_federal_wave_f7.sql";
const DECIDE = "db/vr-federal-mapping-seed-f7.json";
const VOTES_FILE = "db/vr-federal-wave-f7-vote-seed.json";

const KEYS = ["border_security", "deportations", "restraint", "strong_defense", "tough_on_crime", "war_powers"];
const ZERO_MAPPING = ["S.J.Res. 114", "S.J.Res. 116", "S.J.Res. 118", "S.J.Res. 123",
  "S.J.Res. 172", "S.J.Res. 180", "S.J.Res. 181"];

console.log("\n  F7 — fourteen Senate discharge rolls, four District bills, one NDAA amendment\n");
for (const f of [DECIDE, VOTES_FILE, join(MIG_DIR, MIGRATION), "db/vr-issue-seed.json",
                 "db/vr-member-map.json", "db/vr-roster-admitted.json"])
  ok(existsSync(join(ROOT, f)), `${f} is missing — the wave's own artifact`);

const decide = J(DECIDE);
const votes = J(VOTES_FILE);
const sql = R(join(MIG_DIR, MIGRATION));
const issueSeed = J("db/vr-issue-seed.json");
const memberMap = J("db/vr-member-map.json");
const roster = J("db/vr-roster-admitted.json");

// ── 1. the artifacts agree with each other, and with the migration ──────
{
  const c = decide._counts, s = decide.whatShipsThisWave;
  eq(c.measures, 19, "the seed does not admit nineteen measures");
  eq(c.rollcalls, 19, "the seed does not admit nineteen roll calls");
  eq(c.issueRows, 28, "the seed does not carry twenty-eight issue rows");
  eq(c.newKeys, 0, "keys added");
  eq(c.newRosterSlugs, 0, "roster slugs added — this wave votes only members already admitted");
  eq(c.measuresWithZeroIssueRows, 7, "the rule-34 decision is not seven measures wide");
  eq(s.measures, c.measures, "whatShipsThisWave and _counts disagree about measures");
  eq(s.rollcalls, c.rollcalls, "whatShipsThisWave and _counts disagree about roll calls");
  eq(s.issueRows, c.issueRows, "whatShipsThisWave and _counts disagree about issue rows");
  eq(s.memberVotes, c.memberVotes, "whatShipsThisWave and _counts disagree about member votes");
  eq(decide.measures.length, 19, "the seed's measures array is not nineteen long");
  eq(votes.votes.length, 19, "the vote seed does not hold nineteen rolls");
  eq(votes.rollCallCount, votes.votes.length, "rollCallCount disagrees with the file");
  eq(votes.memberVoteCount, votes.votes.reduce((a, r) => a + r.memberVotes.length, 0),
    "memberVoteCount disagrees with the file");
  eq(c.memberVotes, votes.memberVoteCount, "the decision seed and the vote seed disagree about attributed votes");
  eq(c.primaryRows + c.secondaryRows, c.issueRows, "the primary/secondary split does not sum to the issue rows");

  const rows = decide.measures.flatMap((m) => m.issues || []);
  eq(rows.length, 28, "the measures do not carry twenty-eight issue rows between them");
  eq(rows.filter((r) => r.isPrimary).length, c.primaryRows, "the seed's primary count is not its own rows");
  eq(rows.filter((r) => !r.isPrimary).length, c.secondaryRows, "the seed's secondary count is not its own rows");
  eq(decide.measures.filter((m) => !(m.issues || []).length).length, 7,
    "the number of measures shipping with no mapping is not seven");
  eq(decide.measures.filter((m) => !(m.issues || []).length).map((m) => m.number).sort().join(","),
    ZERO_MAPPING.join(","), "the seven zero-mapping measures are not the seven rule 34 withholds");
  // The migration has to write exactly what the seed decided — the counts, in SQL.
  const inserted = [...sql.matchAll(/\(m_[a-z0-9_]+, '([a-z_]+)', (\d+), (true|false), '(yea_[a-z]+)'/g)]
    .map((m) => ({ key: m[1], weight: +m[2], primary: m[3] === "true", polarity: m[4] }));
  eq(inserted.length, 28, "the migration does not write twenty-eight issue rows");
  eq(inserted.filter((r) => r.primary).length, 12, "the migration's primary-row count is not the seed's twelve");
  eq((sql.match(/INSERT INTO vr_rollcalls /g) || []).length, 19, "the migration does not insert nineteen roll calls");
  eq((sql.match(/INSERT INTO vr_measures /g) || []).length, 19, "the migration does not insert nineteen measures");
  for (const r of rows) {
    const hit = inserted.find((x) => x.key === r.issueKey && x.weight === r.weight
      && x.polarity === r.supportMeaning && x.primary === !!r.isPrimary);
    ok(!!hit, `a seeded row (${r.issueKey} w${r.weight} ${r.supportMeaning}${r.isPrimary ? " primary" : ""}) is not in the migration`);
  }
  const forms = s.admittedForms || {};
  eq(forms["exception: discharge"], 14, "the wave does not admit fourteen discharge motions");
  eq(forms.decisive, 4, "the wave does not admit four decisive passage votes");
  eq(forms["exception: amendment"], 1, "the wave does not admit one amendment roll");
  eq(Object.values(forms).reduce((a, b) => a + b, 0), 19, "the admitted forms do not add up to nineteen rolls");
}

// ── 2. the census, refusal record first ─────────────────────────────────
{
  const cen = decide.census;
  ok(/refusal record first/i.test(String(cen.ordering)),
    "the census must state the refusal-first ordering — F5's finding was that the order of the checks IS the census");
  const A = cen.questionA_refusalRecordFirst;
  ok((A.standingRefusalsReaffirmed || []).length >= 8,
    `only ${(A.standingRefusalsReaffirmed || []).length} standing refusals were reaffirmed — the brief names eight families`);
  const reaff = JSON.stringify(A.standingRefusalsReaffirmed);
  for (const needle of ["H.R. 1069", "H.R. 973", "S. 2503"])
    ok(reaff.includes(needle), `the refusal record does not reaffirm ${needle} by name`);
  ok(/no new issue key|writes no new issue key/i.test(String(A.noneReopened)),
    "the census must say why nothing above reopens — the brief reopens a refusal only for a new key");

  // Two funnels, and a funnel that does not close is a funnel written from memory.
  const chains = [
    ["senate", cen.questionB_theEighteenSenateRolls.funnel],
    ["amendment", cen.questionD_theAmendmentRolls.funnel],
  ];
  for (const [name, f] of chains) {
    ok(Array.isArray(f) && f.length >= 6, `the ${name} funnel has fewer than six steps`);
    const nums = (f || []).map((s) => (String(s).match(/(\d[\d,]*)/g) || []).map((n) => +n.replace(/,/g, "")));
    ok(nums.every((n) => n.length > 0), `a step of the ${name} funnel carries no number`);
  }
  const B = cen.questionB_theEighteenSenateRolls;
  eq(B.survivors, 18, "the census does not say eighteen Senate rolls survived F6's gate");
  eq(B.admitted + B.refused, B.survivors, "the Senate census does not split into admitted and refused");
  eq(B.admitted, 14, "the Senate census does not admit fourteen");
  eq(decide._counts.senatePoolSurvived, B.survivors, "_counts and the census disagree about the surviving pool");
  eq(decide._counts.senatePoolAdmitted, B.admitted, "_counts and the census disagree about what was admitted");
  ok(decide._counts.senatePoolAlreadyRefusedByName >= 25,
    `the refusal gate caught only ${decide._counts.senatePoolAlreadyRefusedByName} contested Senate rolls — F5's lesson is that this number is large`);
  eq(decide._counts.senatePoolContested - decide._counts.senatePoolAlreadyRefusedByName,
    decide._counts.senatePoolSurvived, "the Senate refusal pre-filter's arithmetic does not close");
  ok(/carried/i.test(String(B.twoRollsNotAdmittedAndWhyTheyAreNamed)),
    "the two follow-on Senate rolls are not named with the reason they are not admitted");

  // THE BRIEF'S STOP CONDITION, both halves of it: "if the Senate slice + honest D.C.
  // subject maps are empty after refusal-first, stop and say so." Neither was empty,
  // and the seed has to be the thing that says so.
  const C = cen.questionC_theNineDistrictMeasures;
  eq((C.admitted || []).length, 4, "the District census does not admit four measures");
  eq(C.refused, 5, "the District census does not refuse five measures");
  eq((C.admitted || []).length + C.refused, 9, "the nine District measures do not split into four and five");
  ok(/subject/i.test(String(C.method)), "the District census does not state that the test was on the subject");
  ok(/rule 5/i.test(String(C.venueChipWall)) || /venue/i.test(String(C.venueChipWall)),
    "the District census does not restate the venue wall");
  ok((C.refusedDetail || []).length >= 3, "the refused District measures carry no written detail");
  for (const d of C.refusedDetail || [])
    ok(String(d.why || d.reason || "").length >= 60, `a refused District measure carries no argument: ${JSON.stringify(d).slice(0, 80)}`);

  const D = cen.questionD_theAmendmentRolls;
  eq(D.admittedFromThisPool, 1, "the amendment census does not admit exactly one roll");
  ok(/principle rather than a budget|axis/i.test(String(D.whyOnlyOne)),
    "the amendment census does not say why only one of the bridged rolls was admitted");
  ok(/ambiguous/i.test(String(D.aBugWorthRecording)),
    "the bridge defect that produced 88 ambiguous matches is not recorded — F5's H.Amdt. 259 pattern is exactly this");
  ok((D.f5sBlockedOnClosedHere || []).length >= 3,
    "the amendment census does not say what happened to the rolls F5 failed closed on");

  const E = cen.questionE_thinFiles;
  eq(decide._counts.thinFilesBefore, 2, "the census does not count the two thin files");
  eq(decide._counts.thinFilesReachableByThisSlice, 0, "the census claims this slice reaches a thin file");
  ok(/lane/i.test(String(E.answer)), "the thin-file answer must name the cause as lane rather than depth");
  ok((E.theTwoThinFiles || []).length === 2, "the two thin files are not named");
  ok(/federal roster/i.test(String(E.whyThisSliceCannotReachThem)),
    "the thin-file answer does not say why a federal roll cannot reach a state-lane file");
}

// ── 3. attribution, the ceilings, and the full-chamber totals ───────────
{
  const SLUGS = new Set(Object.values(memberMap.map || {}));
  const POSITIONS = new Set(["yea", "nay", "present", "not_voting"]);
  const ACTIONS = new Set(["passage", "amendment", "motion"]);
  const touched = new Set();
  let rows = 0, senateRolls = 0, houseRolls = 0;
  for (const v of votes.votes) {
    const at = `roll ${v.congress}/${v.session}/${v.rollNumber}`;
    const seen = new Set();
    const by = { yea: 0, nay: 0, present: 0, not_voting: 0 };
    for (const mv of v.memberVotes) {
      rows++;
      ok(!!mv.bioguideId, `${at}: a member vote carries no bioguideId`);
      eq(memberMap.map[mv.bioguideId], mv.politicianId,
        `${at} ${mv.bioguideId}: the roster map does not agree with the seed's slug`);
      ok(SLUGS.has(mv.politicianId), `${at}: "${mv.politicianId}" is not a roster slug`);
      ok(POSITIONS.has(mv.position), `${at}: position "${mv.position}" is outside the closed vocabulary`);
      ok(!seen.has(mv.politicianId), `${at}: ${mv.politicianId} appears twice on one roll`);
      seen.add(mv.politicianId);
      touched.add(mv.politicianId);
      by[mv.position]++;
    }
    // THE ROSTER IS THE CEILING, NOT THE CHAMBER, checked per position: 50 attributed
    // yeas under a printed yea of 49 is impossible however the totals were assembled.
    const t = v.totals;
    const printed = { yea: t.yea, nay: t.nay, present: t.present, not_voting: t.notVoting };
    for (const pos of Object.keys(by))
      ok(by[pos] <= printed[pos], `${at}: ${by[pos]} attributed "${pos}" under a printed ${pos} of ${printed[pos]}`);
    const headcount = t.yea + t.nay + t.present + t.notVoting;
    ok(headcount >= v.memberVotes.length,
      `${at}: totals count ${headcount} members, fewer than the ${v.memberVotes.length} attributed`);
    // THE FULL-CHAMBER RULE, and the LIS display-string trap it closes. <vote_tally>
    // renders "51-42", which parses as 5142 and hands rule 11 a losing side of zero;
    // the authority is <count><yeas>/<nays>. A Senate roll that does not count exactly
    // 100 senators is a roster slice or a parse of the wrong element.
    if (v.chamber === "senate") {
      senateRolls++;
      eq(headcount, 100, `${at}: a Senate roll counting ${headcount} members is not the full chamber`);
      ok(t.yea + t.nay <= 100, `${at}: yea+nay exceeds the chamber`);
    } else {
      houseRolls++;
      ok(headcount >= 400 && headcount <= 440,
        `${at}: totals count ${headcount} members — the House has 435 seats, so this is a roster subset, not a chamber tally`);
    }
    ok(ACTIONS.has(v.actionType),
      `${at}: action_type "${v.actionType}" is outside vr_rollcalls' closed vocabulary — the DB would take it as procedural or reject it`);
    eq(v._attributed, v.memberVotes.length, `${at}: the disclosed attributed count is wrong`);
    // FAIL-CLOSED, DISCLOSED WHERE IT CAN BITE. The Senate path resolves on
    // (surname, state) and can collide, so every Senate roll carries the count of names
    // it refused to guess at. The House path resolves on the clerk's own bioguide, where
    // a collision is not expressible — so the field is absent there rather than zero.
    eq(v._ambiguousSkipped || 0, 0, `${at}: an ambiguous name was resolved rather than skipped — fail-closed means fail`);
    if (v.chamber === "senate")
      ok(typeof v._ambiguousSkipped === "number",
        `${at}: a Senate roll with no ambiguity disclosure — (surname, state) can collide, so the count is owed even when it is zero`);
    ok(v._unresolvedRecorded >= 0, `${at}: the unresolved count is missing`);
    eq(v._chamberRecorded, v.memberVotes.length + v._unresolvedRecorded,
      `${at}: attributed + unresolved does not equal the recorded count`);
    // The seeded roll must actually be written by the migration, on the tuple
    // vr_rollcalls is unique on, and read back so its id can carry the votes.
    ok(new RegExp(`VALUES \\(m_[a-z0-9_]+, '${v.chamber}', ${v.congress}, ${v.session}, ${v.rollNumber},`).test(sql),
      `${at}: the migration does not insert this roll`);
    ok(new RegExp(`chamber = '${v.chamber}' AND congress = ${v.congress} AND session = ${v.session} AND roll_number = ${v.rollNumber}\\b`).test(sql),
      `${at}: the migration does not read this roll back`);
    ok(new RegExp(`, '${v.actionType}', `).test(sql), `${at}: the migration writes a different action_type`);
  }
  eq(rows, 1948, "the vote seed does not carry 1,948 attributed member votes");
  eq(senateRolls, 14, "the wave does not hold fourteen Senate rolls — every one of them a discharge motion");
  eq(houseRolls, 5, "the wave does not hold five House rolls (four District bills and the NDAA amendment)");

  const ceiling = decide.attribution.ceiling;
  eq(ceiling.attributedPerRollMaxSenate,
    Math.max(...votes.votes.filter((v) => v.chamber === "senate").map((v) => v._attributed)),
    "the disclosed Senate attribution ceiling is not the seed's own maximum");
  eq(ceiling.attributedPerRollMaxHouse,
    Math.max(...votes.votes.filter((v) => v.chamber === "house").map((v) => v._attributed)),
    "the disclosed House attribution ceiling is not the seed's own maximum");
  eq(ceiling.attributedMemberVotes, rows, "the disclosed attributed total is not the seed's own sum");
  eq(ceiling.unresolvedRecordedTotal, votes.votes.reduce((a, v) => a + v._unresolvedRecorded, 0),
    "the disclosed unresolved total is not the seed's own sum");
  eq(ceiling.ambiguousSkippedTotal, 0, "the disclosed ambiguous total is not zero");
  eq(ceiling.distinctSlugsTouched, touched.size, "the disclosed distinct-slug count is not the seed's own");
  ok(/fail-closed/i.test(String(decide.attribution.rule)), "the attribution rule must be stated as fail-closed");
  ok(/surname/i.test(String(decide.attribution.senatePath)) && /state/i.test(String(decide.attribution.senatePath)),
    "the Senate attribution path must state the (surname, state) key it resolves on — there is no bioguide in the LIS document");
  ok(/bioguide/i.test(String(decide.attribution.housePath)),
    "the House attribution path must state that it resolves on the clerk's own bioguide");
  ok(/<count>|<yeas>|yeas/i.test(String(decide.attribution.totalsAreFullChamber)),
    "the seed must name the element the totals came from — the display string is the trap");
  ok(/<document_type>|OWN document/i.test(String(decide.attribution.rollToMeasureVerification)),
    "the seed must record that each roll's measure was read off the roll's own document");
  console.log(`      (attribution: ${rows} rows over ${votes.votes.length} rolls · ceilings ${ceiling.attributedPerRollMaxSenate}`
    + `/roll Senate, ${ceiling.attributedPerRollMaxHouse}/roll House · ${ceiling.unresolvedRecordedTotal} recorded members skipped and counted)`);

  // The resolver defect is disclosed, and what it exposed on ALREADY PUBLISHED rolls
  // is disclosed rather than silently backfilled — a wave that quietly rewrote four
  // older rolls would move percentages nobody was told about.
  const fix = decide.attribution.aResolverDefectFoundAndFixed;
  ok(String(fix.what || "").length >= 80, "the resolver defect is not written up");
  ok(/Ambiguity stayed at 0|ambiguity stayed at 0/.test(String(fix.effect)),
    "the resolver fix must state that it loosened nothing — a fix that admits an ambiguous match is a guess");
  const prior = decide.readDisclosure.priorRollsCarryingTheSameDefect;
  ok(String(prior.what || "").length >= 80, "the prior rolls carrying the same defect are not disclosed");
  ok(/not fixed here|not silently|disclosed/i.test(String(prior.whyItIsNotFixedHere) + String(fix.readLossItExposedElsewhere)),
    "the read loss on already-published rolls must be disclosed as a loss rather than backfilled inside a data wave");
  ok(/\b(eight|8)\b/.test(String(prior.sizeOfTheLoss)), "the size of that loss is not stated");

  // NO ROSTER MOVED IN THIS WAVE. F7 votes 215 slugs and admits none, so nothing it
  // ships may add, remove or repoint a roster entry. A LATER roster wave may add, and it
  // is named here — the same convention the migration generators use for the roster they
  // freeze, so an applied artifact keeps checking out against a roster that has since
  // grown. An addition belonging to a named later wave passes; a removal, a rewritten
  // earlier wave, or a bioguide repointed to a different slug still fails. A wave key that
  // is not in the roster file is a typo and fails rather than silently allowing everything.
  const ROSTER_WAVES_ADMITTED_AFTER_THIS_WAVE = ["federal_wave_f8_aug2026"];
  const head = (f) => { try { return execFileSync("git", ["show", `HEAD:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }); } catch (e) { return null; } };
  const laterSlugs = new Set();
  for (const key of ROSTER_WAVES_ADMITTED_AFTER_THIS_WAVE) {
    const w = (roster.waves || {})[key];
    if (ok(Array.isArray(w), `no roster wave "${key}" in db/vr-roster-admitted.json`)) for (const sl of w) laterSlugs.add(sl);
  }
  const headMap = head("db/vr-member-map.json");
  if (headMap !== null) {
    const was = JSON.parse(headMap).map || {};
    const now = JSON.parse(R("db/vr-member-map.json")).map || {};
    for (const [bio, sl] of Object.entries(was))
      eq(now[bio], sl, `db/vr-member-map.json dropped or repointed ${bio} — this wave admits no slug, and a later wave may only add`);
    for (const [bio, sl] of Object.entries(now))
      if (!(bio in was)) ok(laterSlugs.has(sl),
        `db/vr-member-map.json gained ${bio} → ${sl}, which belongs to no roster wave admitted after this one`);
  }
  const headRoster = head("db/vr-roster-admitted.json");
  if (headRoster !== null) {
    const was = JSON.parse(headRoster).waves || {};
    const now = roster.waves || {};
    for (const [key, sl] of Object.entries(was))
      eq(JSON.stringify(now[key]), JSON.stringify(sl), `db/vr-roster-admitted.json rewrote wave "${key}" — an earlier wave's admissions are a closed record`);
    for (const key of Object.keys(now))
      if (!(key in was)) ok(ROSTER_WAVES_ADMITTED_AFTER_THIS_WAVE.includes(key),
        `db/vr-roster-admitted.json gained wave "${key}", which this harness was not told about`);
  }
  const admitted = new Set(Object.values(roster.waves || {}).filter(Array.isArray).flat());
  for (const pid of touched)
    ok(admitted.has(pid), `${pid} is attributed a vote and is not admitted in db/vr-roster-admitted.json`);
}

// ── 4. the form gate: only the two exceptions, each shape-gated ─────────
{
  const DISCHARGE = /^On the Motion to Discharge (S\.J\.Res\. \d+)$/;
  let discharge = 0, decisive = 0, amendment = 0;
  for (const v of votes.votes) {
    const at = `roll ${v.congress}/${v.session}/${v.rollNumber}`;
    const num = (v.measure || {}).number || "";
    if (DISCHARGE.test(v.question)) {
      discharge++;
      eq(v.admittedAs, "exception: discharge", `${at}: a discharge motion is not admitted as the discharge exception`);
      eq(DISCHARGE.exec(v.question)[1], num,
        `${at}: the question names a different measure than the roll is filed under — the exception is shape-gated on the number`);
      ok(String(v.decisiveWhy || "").length >= 80,
        `${at}: an exception with no decisiveWhy — the shape is admitted only with the argument written`);
      ok(/discharg/i.test(String(v.decisiveWhy)), `${at}: the decisiveWhy does not argue the discharge form`);
    } else if (/^On Passage$/.test(v.question)) {
      decisive++;
      eq(v.admittedAs, "decisive", `${at}: "On Passage" is not admitted as decisive`);
      eq(v.decisiveWhy, null, `${at}: carries a decisiveWhy, but "On Passage" needs no exception argued`);
    } else if (/^On Agreeing to the Amendment$/.test(v.question)) {
      amendment++;
      eq(v.admittedAs, "exception: amendment", `${at}: the amendment roll is not admitted as the amendment exception`);
      ok(String(v.decisiveWhy || "").length >= 80, `${at}: the amendment exception carries no argument`);
      ok(/^H\.Amdt\. \d+$/.test(num), `${at}: an amendment roll filed under "${num}" rather than its own amendment number`);
    } else {
      ok(false, `${at}: question "${v.question}" is not one of the three admitted forms`);
    }
    // The forms that are NOT admitted, named so the gate cannot drift into them.
    for (const bad of [/Point of Order/i, /Motion to Proceed/i, /Cloture/i, /providing for consideration/i,
                       /Motion to Table/i, /^On the Nomination/i])
      ok(!bad.test(v.question), `${at}: "${v.question}" matches ${bad} — not an admitted form in this wave`);
    // RULE 11, per roll, from the totals the wave shipped.
    const pool = v.totals.yea + v.totals.nay;
    const losing = Math.min(v.totals.yea, v.totals.nay);
    ok(pool > 0, `${at}: an empty yea+nay pool — the display-string parse produces exactly this`);
    ok(losing * 10 >= pool, `${at}: the losing side is ${losing} of ${pool} — below rule 11's one-tenth bar`);
    eq(v._poolYeaNay, pool, `${at}: the disclosed yea+nay pool is wrong`);
    eq(v._losingSide, losing, `${at}: the disclosed losing side is wrong`);
    eq(v._rule11Cleared, true, `${at}: the seed does not record rule 11 as cleared`);
    eq(Math.round((losing / pool) * 1000) / 1000, Math.round(v._losingSharePct * 10) / 1000,
      `${at}: the disclosed losing share is not the share the totals produce`);
    ok(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00-0[45]:00$/.test(v.voteDate),
      `${at}: voteDate "${v.voteDate}" is not an ISO stamp with an Eastern offset`);
    ok(v.chamber === "senate"
      ? /^https:\/\/www\.senate\.gov\/legislative\/LIS\//.test(v.sourceUrl)
      : /^https:\/\/clerk\.house\.gov\/(evs|Votes)/.test(v.sourceUrl),
      `${at}: the source is not the chamber's own record — "${v.sourceUrl}"`);
  }
  eq(discharge, 14, "the wave does not admit fourteen discharge motions");
  eq(decisive, 4, "the wave does not admit four passage votes");
  eq(amendment, 1, "the wave does not admit one amendment roll");
  const shares = votes.votes.map((v) => v._losingSharePct);
  eq(decide._counts.losingShareRangePct[0], Math.min(...shares), "the disclosed minimum losing share is wrong");
  eq(decide._counts.losingShareRangePct[1], Math.max(...shares), "the disclosed maximum losing share is wrong");
  ok(Math.min(...shares) > 35,
    `the least contested roll in the slice is ${Math.min(...shares)}% — the wave claims a contested slice`);
  ok(!/providing for consideration/i.test(sql),
    "the migration mentions a rule providing for consideration — floor procedure is not policy");
  console.log(`      (form gate: 14 discharge · 4 passage · 1 amendment · losing share ${Math.min(...shares)}%–${Math.max(...shares)}%)`);
}

// ── 5. the vocabulary: nothing added, and no venue key anywhere ─────────
{
  const vd = decide.vocabDecision;
  ok(/adds NO issue key|no issue key/i.test(String(vd.outcome)), "the vocab outcome is not recorded as adding no key");
  ok(/rule 5|refused it on rule 5/i.test(String(vd.districtKeyNotReconsidered)),
    "the seed must say the District key stays refused on F6's rule 5 finding rather than being re-argued here");
  ok((vd.gapsNamedForTheNextWave || []).length >= 2,
    "the vocab decision names no gap for the next wave — a wave that adds no key owes the reason a key was not needed");
  const align = R("alignment-tool.js");
  const scope = R("issue-scope.js");
  for (const k of KEYS) {
    ok(new RegExp(`^\\s*['"]?${k}['"]?\\s*:\\s*\\{`, "m").test(align),
      `${k} is not a key in alignment-tool.js's ISSUE_MAP — this wave adds none, so every key it uses was already published`);
    ok(!/_balance$/.test(k), `${k} is a *_balance key — _rdSuppressedKey() returns balance_key and the row never reads`);
  }
  eq(decide._counts.keysUsed.slice().sort().join(","), KEYS.join(","),
    "the keys the seed says it used are not the six this test knows about");
  const used = new Set(decide.measures.flatMap((m) => (m.issues || []).map((i) => i.issueKey)));
  eq([...used].sort().join(","), KEYS.join(","), "the measures use keys the seed does not declare");
  for (const bad of ["gov_regulation", "public_schools", "states_federal_power", "enviro_balance", "foreign_balance"])
    ok(!used.has(bad), `${bad} was used to park a bill — the wave's own refusals say it was not`);
  // NO VENUE KEY, CHIP OR TREE SLOT. The four District bills are keyed to their
  // subject; a key naming the jurisdiction is what rule 5 refused in F6.
  for (const ins of sql.matchAll(/INSERT INTO vr_measure_issues[\s\S]*?;/g))
    ok(!/'(?:[a-z_]*district[a-z_]*|home_rule|dc_[a-z_]+)'/i.test(ins[0]),
      "the migration writes a key naming the venue — home rule failed vocab rule 5 and this wave does not reopen it");
  ok(!/'home_rule'|'district_of_columbia'/.test(align + scope),
    "a District of Columbia key appeared in the published vocabulary, and this wave did not write it");

  // NO NEW KEY MEANS NO PUBLISHED BOUNDARY MOVED.
  const head = (f) => { try { return execFileSync("git", ["show", `HEAD:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }); } catch (e) { return null; } };
  for (const f of ["issue-scope.js", "alignment-tool.js"]) {
    const h = head(f);
    if (ok(h !== null, `could not read HEAD:${f}`)) eq(R(f), h, `${f} changed, but this wave adds no key, so no published boundary moved`);
  }
  // AND THE SHELL BUMPED, for a reason that is not the SQL: the twenty-eight curated
  // mechanism pairs live in consistency.js, a precached asset. Commit-invariant, the
  // way F6 wrote it: everything checkable against the shipped file is checked there,
  // and HEAD is consulted only for the direction of travel when the two differ.
  const swNow = R("sw.js");
  const cv = swNow.match(/CACHE_VERSION\s*=\s*'v(\d+)'/);
  const hv = (head("sw.js") || "").match(/CACHE_VERSION\s*=\s*'v(\d+)'/);
  if (ok(!!cv, "CACHE_VERSION is not readable in sw.js")) {
    if (hv && hv[1] !== cv[1]) eq(+cv[1], +hv[1] + 1, "CACHE_VERSION did not move by exactly one version");
    ok(+cv[1] >= 98, `CACHE_VERSION is at v${cv[1]} — this wave ships a precached asset and owes a bump`);
    // THIS WAVE'S OWN NOTE, NOT WHATEVER THE CONSTANT POINTS AT TODAY. F7 shipped v98 and
    // a later wave that bumps the constant leaves the v98 entry where it is. Reading the note
    // for the CURRENT version would hand F7's content checks a later wave's note, which would
    // then fail for the honest reason that the later wave changed different files — so the
    // checks below are pinned to the version this wave is the bump note for.
    const MY_VERSION = 98;
    const noteAt = swNow.indexOf(`// v${MY_VERSION} `);
    ok(noteAt !== -1, `sw.js has no v${MY_VERSION} entry in the version log — this wave's bump note was removed`);
    const nextAt = swNow.indexOf(`// v${MY_VERSION - 1} `, noteAt);
    const note = swNow.slice(noteAt, nextAt === -1 ? noteAt + 6000 : nextAt);
    ok(/consistency\.js/.test(note), "the version note does not name the asset that changed");
    // AND THE SECOND SHIPPED FILE. db/share-index.json is not precached and no worker
    // version can invalidate it, which is exactly why the bump note is the place it has
    // to be named: it is the only reader-facing artifact in the wave whose staleness a
    // reader cannot see, and the crawl block it feeds moves further than the live lane.
    ok(/share-index\.json/.test(note),
      "the version note names only consistency.js — db/share-index.json is regenerated in this wave and its stale copy is served to crawlers");
    ok(/personRecord|crawl block/.test(note),
      "the version note names the snapshot file without saying what a reader would see out of it");
    ok(/derived/i.test(note), "the version note does not say what a warm device holding the old copy would show");
    ok(/_RD_NO_POLE|no direction|prints no/i.test(note),
      "the version note does not say what the no-pole rows would look like without their new copy — that is the sharper half of this bump");
    ok(swNow.includes("'/consistency.js'"), "consistency.js is no longer a precached shell asset, which is what made this a bump at all");
  }
  ok(scope.length > 1000, "issue-scope.js did not load");
}

// ── 6. the walls, and the standing refusals they rest on ────────────────
{
  const stripSqlComments = (src) => {
    let out = "", i = 0, q = false;
    while (i < src.length) {
      if (q) { if (src[i] === "'") { if (src[i + 1] === "'") { out += "''"; i += 2; continue; } q = false; } out += src[i++]; continue; }
      if (src[i] === "'") { q = true; out += src[i++]; continue; }
      if (src[i] === "-" && src[i + 1] === "-") { while (i < src.length && src[i] !== "\n") i++; continue; }
      out += src[i++];
    }
    return out;
  };
  const LIVE_IDS = { "H.R. 1069": 74 };
  const mappedRowsFor = (number) => {
    const hits = [];
    const lit = number.replace(/\./g, "\\.");
    for (const f of MIGS) {
      const src = stripSqlComments(R(join(MIG_DIR, f)));
      if (!src.includes(number)) continue;
      const vars = new Set();
      for (const m of src.matchAll(new RegExp(`(\\w+)\\s*:=\\s*[\\s\\S]{0,200}?'${lit}'`, "g"))) vars.add(m[1]);
      for (const m of src.matchAll(new RegExp(`\\bINTO\\s+(\\w+)\\b[\\s\\S]{0,200}?'${lit}'`, "g"))) vars.add(m[1]);
      const id = LIVE_IDS[number];
      for (const m of src.matchAll(/INSERT INTO vr_measure_issues[\s\S]*?;/g)) {
        for (const v of vars) if (new RegExp(`\\(\\s*${v}\\s*,`).test(m[0])) hits.push(`${f} (${v})`);
        if (id != null && new RegExp(`\\(\\s*${id}\\s*,\\s*'`).test(m[0])) hits.push(`${f} (id ${id} inline)`);
        if (new RegExp(`SELECT id FROM vr_measures[^;]*'${lit}'`).test(m[0])) hits.push(`${f} (inline subquery)`);
      }
    }
    return [...new Set(hits)];
  };
  for (const n of ["H.R. 1069", "H.R. 973"]) {
    const hits = mappedRowsFor(n);
    eq(hits.length, 0, `${n} carries an issue mapping in a migration (${hits.join(", ")}) — F1 through F6 assert zero and F7 does not reverse it`);
  }
  // The brief's one exemption: reopened only by a NEW key argued in this wave. There is
  // none, so the exemption cannot fire — asserted rather than assumed.
  eq(decide._counts.newKeys, 0,
    "this wave added a key, so the H.R. 1069 and H.R. 973 assertions need the vocab writeup read against the brief's exemption");
  for (const ins of sql.matchAll(/INSERT INTO vr_measure_issues[\s\S]*?;/g)) {
    ok(!/'public_schools'/.test(ins[0]), "the migration writes a public_schools row — it remains a funding-level chip");
    ok(!/'gov_regulation'/.test(ins[0]), "the migration writes a gov_regulation row — rule 3 walls it as the regulatory question");
  }
  // The refusal families the brief names, each still absent from this wave's measures.
  const numbers = new Set(decide.measures.map((m) => m.number));
  for (const n of ["H.R. 1069", "H.R. 973", "S. 2503", "H.R. 5371", "H.R. 6500", "H.R. 3944", "H.R. 4553",
                   "H.R. 3015", "H.R. 3638", "H.R. 3109", "H.R. 3617"])
    ok(!numbers.has(n), `${n} is admitted by this wave and it is on the brief's keep-refused list`);
  for (const n of [...numbers])
    ok(/^(H\.R\.|S\.J\.Res\.|H\.Amdt\.) \d+$/.test(n),
      `${n} is not a bill, joint resolution or amendment — no rule for consideration and no nomination is admitted`);
  const walls = decide.vocabDecision.wallsReaffirmed || [];
  ok(walls.length >= 4, "fewer than four walls reaffirmed");
  const wallText = walls.map((w) => JSON.stringify(w)).join(" ");
  for (const needle of ["_balance", "gov_regulation", "public_schools", "study"])
    ok(new RegExp(needle, "i").test(wallText), `the walls do not name ${needle}`);
  ok(/study-and-report|advisory commission/i.test(String(decide.refusedThisWave.theStudyAndReportWallHeld)),
    "the study-and-report wall is not recorded as having held this wave");
  eq(decide._counts.refusedMeasuresInWriting, 9, "the wave does not publish nine written measure refusals");
  ok(decide._counts.declinedKeysInWriting >= 28,
    `only ${decide._counts.declinedKeysInWriting} declined keys are written up — a mapped measure owes its near misses`);
}

// ── 7. rule 34: seven rolls ingested and not mapped, and nobody loses ───
{
  const r34 = decide.censusRule34;
  ok(/rule 34/i.test(String(r34.rule)), "the rule-34 decision does not cite the rule");
  eq(r34.counts.senateRollsIngested, 14, "the rule-34 record does not ingest fourteen Senate rolls");
  eq(r34.counts.senateRollsMapped, 7, "the rule-34 record does not map seven of them");
  eq(r34.counts.senateRollsIngestedWithZeroMappings, 7, "the rule-34 record does not withhold seven");
  eq(r34.counts.judgedPositionsLostByTheDecision, 0, "the rule-34 record admits a lost judged position");
  ok(/only record/i.test(String(r34.rule) + String(r34.whyItGovernsThisWave)),
    "the rule-34 argument does not turn on each roll being the only record of somebody's position");
  ok(String(r34.theSafetyCheckThatMadeThisAdmissible || "").length >= 100,
    "the safety check that made withholding admissible is not written up");
  ok(/ingested in full|every attributed member vote/i.test(String(r34.whatIsNotLost)),
    "the record does not say that the withheld rolls are still ingested in full");

  // AND THE CLAIM IS PROVED FROM THE VOTE SEED, not taken on trust. A senator whose
  // only yea-or-nay in this wave sits on a withheld roll would have a judged position
  // the ledger cannot see — which is the one thing this decision may not cost.
  const zero = new Set(ZERO_MAPPING);
  const mappedPids = new Set(), withheldPids = new Set();
  for (const v of votes.votes) {
    const num = (v.measure || {}).number || "";
    const target = zero.has(num) ? withheldPids : mappedPids;
    for (const mv of v.memberVotes)
      if (mv.position === "yea" || mv.position === "nay") target.add(mv.politicianId);
  }
  const orphans = [...withheldPids].filter((p) => !mappedPids.has(p));
  eq(orphans.length, 0,
    `${orphans.length} member(s) hold a judged position only on a withheld roll (${orphans.slice(0, 6).join(", ")}) — rule 34 admits the repeat in exactly that case`);
  ok(withheldPids.size > 90, `only ${withheldPids.size} senators voted on the withheld rolls, so the proof above is thin`);
  // The same proof is in the migration, as a guard that raises rather than a comment.
  ok(/zero_ids/.test(sql) && /w\.rollcall_id = ANY\(mapped_ids\)/.test(sql),
    "the migration does not re-prove the rule-34 safety condition in SQL — a comment is not a wall");
  // The seven withheld measures are ingested (their rolls are written) and carry no
  // issue row anywhere in the file.
  for (const n of ZERO_MAPPING) {
    ok(sql.includes(`'${n}'`), `${n} is withheld from mapping and not ingested either — the wave claims both`);
    const v = votes.votes.find((x) => (x.measure || {}).number === n);
    ok(!!v && v.memberVotes.length > 90, `${n} carries no attributed votes, so "ingested in full" is not true of it`);
  }
  // AND THE WITHHOLDING IS ON THE RECORD IN THE VOTE SEED, key by key. "Unmapped" and
  // "unread" are the same state to a reader unless the refusal is written down, which is
  // the bar test-vr-vote-seed.mjs sets for every roll whose measure carries no mapping:
  // named in measuresDeliberatelyUnmapped AND argued in declinedFacets. Seven withheld
  // rolls times the three candidate keys is twenty-one arguments, and each has to say
  // more than "see rule 34".
  eq((votes.measuresDeliberatelyUnmapped || []).length, 7,
    "the vote seed does not declare the seven withheld measures — an unmapped roll with no written refusal is a hole");
  for (const n of ZERO_MAPPING) {
    ok((votes.measuresDeliberatelyUnmapped || []).some((t) => String(t).includes(n)),
      `${n} is ingested with no mapping and is not declared in measuresDeliberatelyUnmapped`);
    const facets = (votes.declinedFacets || []).filter((f) => String(f.measure || "").includes(n));
    eq(facets.map((f) => f.facet).sort().join(","), "restraint,strong_defense,war_powers",
      `${n}: the three candidate keys are not each argued in declinedFacets`);
    for (const f of facets) {
      ok(String(f.why || "").length >= 200, `${n}/${f.facet}: the refusal is asserted rather than argued`);
      ok(/rule 34|repeat|already recorded|mapped sibling|double-count/i.test(String(f.why)),
        `${n}/${f.facet}: the refusal does not give the reason — the key FITS here, and that is why the argument is owed`);
    }
  }
  eq((votes.declinedFacets || []).length, 21, "the wave does not publish twenty-one written key-by-key refusals");
  console.log(`      (rule 34: 14 ingested · 7 mapped · 7 withheld · ${withheldPids.size} senators judged elsewhere in the wave · 0 orphaned`
    + ` · 7 declared, 21 keys argued)`);
}

// ── 8. rule 30: the primary wall, checked before the depth pass ─────────
{
  const rows = decide.measures.flatMap((m) => (m.issues || []).map((i) => ({ number: m.number, ...i })));
  for (const r of rows) {
    ok(r.weight >= 45 && r.weight <= 100, `${r.number}/${r.issueKey} carries weight ${r.weight}, outside the conventions`);
    ok(["yea_supports", "yea_opposes"].includes(r.supportMeaning), `${r.number}/${r.issueKey} has no readable polarity`);
    ok(String(r.rationale || "").length >= 200, `${r.number}/${r.issueKey}'s rationale is too short to be an argument`);
    ok(typeof r.isPrimary === "boolean", `${r.number}/${r.issueKey} does not declare a lane`);
  }
  // One instrument, one act — as many rows as the instrument's subjects, and every
  // multi-row measure declaring which row is the primary.
  for (const m of decide.measures) {
    const iss = m.issues || [];
    if (!iss.length) continue;
    eq(iss.filter((i) => i.isPrimary).length, 1,
      `${m.number} does not carry exactly one primary row — a measure with none prints "Not about this issue" at depth`);
    eq(new Set(iss.map((i) => i.issueKey)).size, iss.length, `${m.number} carries the same key twice`);
  }
  // THE HONEST SPLIT. Four keys gain a primary this wave and two gain only
  // secondaries, and rule 30 is satisfied not by asserting otherwise but by measuring
  // what the two secondary-only keys cost: nothing, because no member becomes readable
  // on them and no package sentence starts printing.
  const pw = decide.readDisclosure.primaryWallPerKey;
  const gains = (pw.keysGainingAPrimaryFromThisWave || []).slice().sort();
  const secOnly = (pw.keysGainingSecondariesOnly || []).slice().sort();
  const realGains = [...new Set(rows.filter((r) => r.isPrimary).map((r) => r.issueKey))].sort();
  const realSecOnly = KEYS.filter((k) => !realGains.includes(k)).sort();
  eq(gains.join(","), realGains.join(","), "the disclosed keys-gaining-a-primary are not the seed's own rows");
  eq(secOnly.join(","), realSecOnly.join(","), "the disclosed secondary-only keys are not the seed's own rows");
  eq(gains.length, 4, "the wave does not gain a primary on four keys");
  eq(secOnly.length, 2, "the wave does not have exactly two secondary-only keys");
  eq(pw.newlyReadableOnASecondaryOnlyKey, 0,
    "a member becomes readable on a key this wave only gives secondaries to — that is the rule 30 failure, measured");
  eq(pw.readingsThatStartPrintingThePackageSentence, 0,
    "a reading starts printing the package sentence, which is the surviving consumer of _RD_MIN_PRIMARY");
  ok(String(decide.readDisclosure.primaryWallChecked || "").includes("rule 30"),
    "the primary wall was not checked against rule 30 by name");
  ok(/_RD_MIN_PRIMARY/.test(String(decide.readDisclosure.primaryWallChecked)),
    "the primary-wall note does not read the constant it is about — the last characterisation lock on it was removed on purpose");
  for (const k of KEYS) {
    const per = (pw.perKey || {})[k];
    if (!ok(!!per, `${k} has no per-key row in the primary-wall disclosure`)) continue;
    eq(per.rows, rows.filter((r) => r.issueKey === k).length, `${k}: the disclosed row count is wrong`);
    eq(per.wavePrimaries, rows.filter((r) => r.issueKey === k && r.isPrimary).length,
      `${k}: the disclosed wave-primary count is wrong`);
  }

  // The pack-generation declaration, verbatim and flush inside the block with the rows.
  ok(/^[ \t]*--[ \t]*pack-generation:[ \t]*derived\b/m.test(sql),
    "the migration is missing the `-- pack-generation: derived` declaration the runbook requires");
  ok(/pack-generation: derived — the fingerprint moves with these rows; every\n[ \t]*--\s+affected member's pack retires and rebuilds on the next read\./.test(sql),
    "the pack-generation comment is not the runbook's verbatim form");
  ok(/scripts\/test-vr-pack-key-version\.mjs/.test(sql),
    "the pack-generation declaration does not name the harness that confirms the fingerprint covers these columns");

  // DATA ONLY, AND NOT ONE OBJECT DECLARED — the drizzle snapshot rule.
  for (const bad of [/\bALTER TABLE\b/i, /\bCREATE (TEMP(ORARY)?\s+)?TABLE\b/i, /\bDROP TABLE\b/i,
                     /\bCREATE (OR REPLACE )?(FUNCTION|VIEW|TYPE|SEQUENCE|TRIGGER|SCHEMA)\b/i,
                     /\bUPDATE vr_/i, /\bDELETE FROM vr_/i, /\bTRUNCATE\b/i, /\bCREATE INDEX\b/i])
    ok(!bad.test(sql), `the migration matches ${bad} — this wave is data-only and declares no object`);
  ok(/roll_ids integer\[\]/.test(sql) && /= ANY\(roll_ids\)/.test(sql),
    "the wave-scoped verification no longer holds its roll ids in a local array — if it went back to a temp table, the snapshot guard fires");
  const anyCount = (sql.match(/= ANY\((?:roll_ids|mapped_ids|zero_ids)\)/g) || []).length;
  ok(anyCount >= 6, `only ${anyCount} verification queries are scoped to this wave's roll ids — an unscoped guard audits the whole corpus`);

  // The curated mirror in db/vr-issue-seed.json, which is what the offline corpus and
  // every mechanism harness read. A mapped measure missing from it is a roll that
  // ranks nothing and a judged act with no mechanism pair.
  for (const m of decide.measures) {
    const mir = (issueSeed.measures || []).find((x) => x.congress === 119 && x.number === m.number);
    if (!(m.issues || []).length) {
      ok(!mir, `${m.number} ships with no mapping and yet is mirrored in db/vr-issue-seed.json — the corpus would judge it`);
      continue;
    }
    if (!ok(!!mir, `${m.number} is not mirrored in db/vr-issue-seed.json — its roll would rank nothing`)) continue;
    eq((mir.issues || []).length, m.issues.length, `${m.number}: the mirror carries a different number of rows`);
    for (const i of m.issues) {
      const mi = (mir.issues || []).find((x) => x.issueKey === i.issueKey);
      if (!ok(!!mi, `${m.number}/${i.issueKey} is missing from the mirror`)) continue;
      eq(mi.weight, i.weight, `${m.number}/${i.issueKey}: the mirror's weight disagrees`);
      eq(mi.isPrimary, i.isPrimary, `${m.number}/${i.issueKey}: the mirror's lane disagrees`);
      eq(mi.supportMeaning, i.supportMeaning, `${m.number}/${i.issueKey}: the mirror's polarity disagrees`);
      eq(mi.rationale, i.rationale, `${m.number}/${i.issueKey}: the mirror's rationale is not the shipped one`);
    }
  }
}

// ── 9. the floors, unmoved ──────────────────────────────────────────────
{
  const sh = R("stance-helpers.js");
  const FLOORS = { _RD_MIN_JUDGED: "4", _RD_MIN_PRIMARY: "1", _RD_THIN_MIN: "2", _RD_MIN_STRENGTH: "4",
    _RD_SPLIT_MIN_JUDGED: "6", _RD_SPLIT_MIN_SIDE: "2" };
  for (const [name, want] of Object.entries(FLOORS)) {
    const m = sh.match(new RegExp(`${name}\\s*=\\s*(\\d+)`));
    if (ok(!!m, `the ${name} literal is not in stance-helpers.js`)) eq(m[1], want, `${name} moved`);
  }
  const dom = sh.match(/_RD_DOMINANCE\s*=\s*([\d.]+)/);
  if (ok(!!dom, "the _RD_DOMINANCE literal is not in stance-helpers.js")) eq(dom[1], "0.75", "_RD_DOMINANCE moved");
  const mf = sh.match(/_RD_MEMBER_FLOOR\s*=\s*(\d+)/);
  if (ok(!!mf, "the member floor literal is not in stance-helpers.js")) eq(mf[1], "12", "the member floor moved");
  ok(/_PDX_RD_MEMBER_FLOOR/.test(sh), "the member floor is no longer re-exported on window, so the harnesses cannot read it");
  const proc = sh.match(/_RECORD_PROCEDURAL_FACTOR\s*=\s*([\d.]+)/);
  if (ok(!!proc, "the procedural factor literal is not in stance-helpers.js"))
    eq(proc[1], "0.25", "_RECORD_PROCEDURAL_FACTOR moved — fourteen of this wave's rolls are procedural and it is their weight");
  ok(/_RD_NO_POLE/.test(sh) && /war_powers/.test(sh),
    "war_powers is no longer in the no-pole table, so eight of this wave's rows would start printing a direction they were mapped without");
  ok(String(decide.readDisclosure.floorsUntouched || "").includes("_RD_MIN_PRIMARY"),
    "the seed does not list the floors it left alone");
}

// ── 10. the cost, published, and the read loss disclosed ────────────────
{
  const rd = decide.readDisclosure;
  eq(rd.promotes, 0, "this wave promotes a row");
  eq(rd.retractions, 0, "this wave retracts a row");
  eq(rd.weightChanges, 0, "this wave changes an existing weight");
  eq(rd.polarityChanges, 0, "this wave changes an existing polarity");
  const me = rd.measuredEffect;
  ok(!!me, "the wave publishes no measured read effect — a densification wave has to measure its own cost");
  ok(/vr-federal-fpi\.mjs/.test(String(me.harness)), "the measured effect names no harness that reproduces it");
  eq(me.rowsThatStoppedBeingCharacterised, 0,
    "a row stopped being characterised — the no-loss promise is the one an ingest wave must keep");
  ok(/read` flag|read flag/i.test(String(me.howThatWasChecked)) && /rule 36/i.test(String(me.howThatWasChecked)),
    "the no-loss check must be stated as being on the row model's own read flag over every pid (runbook rule 36), not on shape counters");
  ok(me.rowsThatStartedBeingCharacterised > 0, "the wave gained no readings at all");
  ok(/->|→/.test(String(me.memberKeyRows)) && /->|→/.test(String(me.laneVotes)),
    "the measured effect does not publish before-and-after counters");
  ok(String(me.bandUnchangedAndWhy || "").length >= 80,
    "the band does not move and the seed does not say why — an unchanged band is a census answer, not a silence");
  // THE DIRECTION CHANGES, TIED TO THE TALLY THAT MEASURED THEM. The count is not
  // asserted here as a literal: it is required to equal the seed's own mostly -> split
  // figure, so a list that goes stale against its own measurement fails instead of
  // passing on a >= that a shorter list satisfies. That is the shape of the defect this
  // section now exists to catch — the first draft published eight because the drift
  // instrument only looked at members whose SHAPE COUNTERS moved, and a member who
  // loses a direction on one key while gaining one on another nets out to identical
  // counters and never appeared. Fifteen rows moved; seven of them were invisible.
  const dir = me.theFifteenRowsThatChangedDIRECTION;
  ok(!!dir, "the rows that change direction are not disclosed");
  const named = dir.rows || dir.theRows || [];
  const toSplit = (me.tierTransitions || {})["mostly -> split"];
  ok(named.length >= 8, `only ${named.length} direction changes are named — each is a member whose published label moves`);
  eq(named.length, toSplit,
    `${named.length} direction changes are named but the wave's own tier tally counts ${toSplit} — the list and the measurement disagree`);
  ok(/_RD_DOMINANCE/.test(JSON.stringify(dir)) && /_RD_SPLIT_MIN/.test(JSON.stringify(dir)),
    "the disclosure does not name the floor a wave could have moved to make the changes disappear");
  // EVERY NAMED ROW IS A (pid, key, transition) A READER CAN RERUN, and the seven the
  // gated instrument hid are called out as such rather than folded in silently.
  for (const r of named)
    ok(/^[a-z_]+ [a-z_]+ (mostly|strong) -> split: \S/.test(String(r)),
      `a named direction change is not written as "<pid> <key> <from> -> split: <the vote>": ${String(r).slice(0, 60)}`);
  ok(String(dir.theLastSevenAreTheOnesTheGatedListHid || "").length >= 120,
    "the seven rows the first measurement missed are not identified as such");

  // THE INSTRUMENT'S OWN DEFECT IS DISCLOSED, and the fix is in the file that measures.
  const bug = me.theMeasurementDefectFoundWhileWritingThis;
  ok(!!bug, "the measurement defect that moved this figure from eight to fifteen is not disclosed");
  ok(/angus_king/.test(JSON.stringify(bug)), "the disclosure does not name the member whose netted-out counters exposed it");
  const fpi = R("scripts/vr-federal-fpi.mjs");
  ok(/DRIFT_ROWS\s*=\s*issueDrift\(ALL_PIDS\)/.test(fpi),
    "scripts/vr-federal-fpi.mjs still gates its per-issue drift list on the pids whose shape counters moved — the netting-out blind spot this wave's disclosure was wrong about");

  // AND THE OTHER LANE. The crawl-block snapshot is regenerated by this wave and moves
  // further than the live read does, for a reason (a thinner act inventory) that has to
  // be written down or the two published numbers simply contradict each other.
  const snap = me.theOfflineSnapshotThisWaveAlsoMoves;
  ok(!!snap, "db/share-index.json is regenerated in this wave and the seed does not disclose what it moved");
  ok(/share-index\.json/.test(JSON.stringify(snap)) && /vr-record-corpus\.mjs|shipped-seed|gen-crawl-record/.test(JSON.stringify(snap)),
    "that disclosure does not say which lane the snapshot is built from");
  ok(/lee/.test(JSON.stringify(snap)) && /Split/.test(JSON.stringify(snap)),
    "that disclosure carries no worked example of a row the two lanes read differently");
  ok(String(rd.theProceduralLabelOnTheFourteenSenateActs || "").length >= 200,
    "the action_type defect found before shipping is not written up — the fix is invisible in the shipped bytes, which is exactly why it is owed");
  ok(/motion|procedural/i.test(String(rd.theProceduralLabelOnTheFourteenSenateActs)),
    "that writeup does not name the label that was wrong");
  ok(/0\.25|byte-identical/i.test(String(rd.theProceduralLabelOnTheFourteenSenateActs)),
    "that writeup does not say what the wrong label would have cost a reader, or that the re-measurement was identical");
  console.log(`      (read effect: band ${me.bandBefore} → ${me.bandAfter} · ${me.rowsThatStartedBeingCharacterised} rows gained, `
    + `0 lost · ${named.length} changed direction · ${me.membersWhoseShapeMoved} shapes moved)`);
}

// ── 11. the twin boot, and the one file that moved ──────────────────────
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "consistency.js", "voting-record.js", "word-action.js",
];
const nowSrc = (f) => readFileSync(join(ROOT, f), "utf8");
const headSrc = (f) => {
  try { return execFileSync("git", ["show", `HEAD:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }); }
  catch (e) { return null; }
};
function boot(get, label) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  for (const f of FILES) {
    const src = get(f);
    if (src === null) return null;
    try { vm.runInContext(src, ctx, { filename: `${label}:${f}` }); } catch (e) { /* same handling in both trees */ }
  }
  return win;
}
{
  // TWIN-BOOT, THE BRIEF'S WORDS: "DM and formal rows identical except the keys this
  // wave actually writes." The keys this wave writes are written to the DATABASE, so a
  // twin boot of the shipped files must come out identical full stop — the mappings are
  // not in these bytes. What IS in these bytes is consistency.js's curated map, which
  // gained twenty-eight entries because a judged act owes a written mechanism line. So
  // the waiver is one file and the shape of its change is checked: appended prose inside
  // _DOS_MECH, nothing above it, nothing below it, no existing entry edited (rule 21
  // leaves a live rationale with its first writer).
  const WAIVED = ["consistency.js"];
  const touched = FILES.filter((f) => { const h = headSrc(f); return h !== null && h !== nowSrc(f); });
  const stray = touched.filter((f) => !WAIVED.includes(f));
  eq(stray.join(", "), "",
    `F7 changed a booted file outside its declared waiver (${stray.join(", ")}) — a data wave has no business editing the engine`);
  if (touched.includes("consistency.js")) {
    const a = headSrc("consistency.js"), b = nowSrc("consistency.js");
    const mech = (src) => {
      const i = src.indexOf("var _DOS_MECH = {");
      const j = src.indexOf("\n  };", i);
      return i === -1 || j === -1 ? null : { before: src.slice(0, i), map: src.slice(i, j), after: src.slice(j) };
    };
    const ma = mech(a), mb = mech(b);
    if (ok(!!ma && !!mb, "_DOS_MECH is not locatable in consistency.js on both sides")) {
      eq(mb.before, ma.before, "consistency.js changed above _DOS_MECH — the waiver is for curated prose, not for the engine");
      eq(mb.after, ma.after, "consistency.js changed below _DOS_MECH — the waiver is for curated prose, not for the renderer");
      ok(mb.map.startsWith(ma.map.replace(/\n?$/, "")),
        "an existing _DOS_MECH entry was edited — this wave only appends, because rule 21 leaves a live rationale with its first writer");
      // This counted F7's twenty-eight as the DIFF from HEAD, which was true while F7 was
      // the uncommitted wave and became untrue the moment a later wave appended: F9 adds
      // seven amendment pairs, so the diff is seven and F7's own twenty-eight are now
      // inside HEAD's copy. The block below already requires all twenty-eight to be
      // present in the shipped file without reference to HEAD, which is the claim that
      // actually matters. What is checked here is the narrower thing the diff can still
      // prove: whatever was appended after HEAD belongs to some OTHER wave, so nothing
      // re-wrote or re-added one of F7's pairs.
      const added = [...mb.map.slice(ma.map.length).matchAll(/'([^'|]+)\|119\|([a-z_]+)':/g)]
        .map((m) => `${m[1]}|${m[2]}`);
      const mine = new Set((decide.measures || []).flatMap((m) => (m.issues || []).map((i) => `${m.number}|${i.issueKey}`)));
      for (const a2 of added)
        ok(!mine.has(a2), `${a2} is one of F7's own pairs and was appended again after HEAD — rule 21 leaves a live rationale with its first writer`);
    }
  }
  {
    // AND THE TWENTY-EIGHT PAIRS ARE IN THE SHIPPED FILE, checked without reference to
    // HEAD: one per mapped (measure, key), written from the instrument rather than from
    // the short title, inside the face's length rules, and with no party word on it.
    const src = nowSrc("consistency.js");
    const i = src.indexOf("var _DOS_MECH = {");
    const map = i === -1 ? "" : src.slice(i, src.indexOf("\n  };", i));
    const PARTY_IN_MECH = /\b(Republicans?|Democrats?|Democratic|GOP|partisan|bipartisan)\b/i;
    let pairs = 0;
    for (const m of decide.measures) {
      for (const iss of m.issues || []) {
        const key = `'${m.number}|119|${iss.issueKey}': {`;
        const at = map.indexOf(key);
        if (!ok(at !== -1, `${m.number}/${iss.issueKey} is a judged act this wave creates and it carries no mechanism pair — it would render in the derived voice`)) continue;
        pairs++;
        const end = map.indexOf("\n    },", at);
        const entry = map.slice(at, end === -1 ? at + 2000 : end + 1);
        const did = /did: '((?:[^'\\]|\\.)*)'/.exec(entry);
        const why = /why: '((?:[^'\\]|\\.)*)'/.exec(entry);
        const more = /more: '((?:[^'\\]|\\.)*)'/.exec(entry);
        if (!ok(!!did && !!why, `${m.number}/${iss.issueKey}: the mechanism pair is missing one of its two slots`)) continue;
        // THE THIRD SLOT IS NOT OPTIONAL, and not decoration: an appended entry that
        // skips it is what test-person-crawl-block.mjs reads as a curated face the
        // renderer cannot fully page. It is also the one slot with room for the roll and
        // the tally, so it is checked for both — a `more` that says nothing the face did
        // not already say has displaced the mapping rationale in the fold for nothing.
        if (!ok(!!more, `${m.number}/${iss.issueKey}: the mechanism entry carries no \`more\` — the fold slot the appended-entry wall requires`)) continue;
        ok(more[1].length >= 200, `${m.number}/${iss.issueKey}: the \`more\` is thinner than the mapping rationale it displaces in the fold`);
        ok(/roll 119\/[12]\/\d+/i.test(more[1]), `${m.number}/${iss.issueKey}: the \`more\` does not cite the roll it is about`);
        ok(more[1].slice(0, 40).toLowerCase() !== why[1].slice(0, 40).toLowerCase(),
          `${m.number}/${iss.issueKey}: the \`more\` opens as a second draft of the line above it`);
        ok(did[1].trim().length > 60, `${m.number}/${iss.issueKey}: "what it did" is too short to say what the text does`);
        ok(why[1].trim().length > 60 && why[1].length <= 340,
          `${m.number}/${iss.issueKey}: "why it counts here" is ${why[1].length} characters, outside the face's length rules`);
        ok(!m.shortTitle || did[1].trim() !== m.shortTitle,
          `${m.number}/${iss.issueKey}: the "what it did" line is the short title`);
        ok(!PARTY_IN_MECH.test(entry),
          `${m.number}/${iss.issueKey}: the mechanism pair names a party — the split stays in the roll's totals, off the face`);
        ok(!/§/.test(did[1] + why[1] + more[1]) && !/\bU\.S\.C\.\s*\d/.test(did[1] + why[1] + more[1]),
          `${m.number}/${iss.issueKey}: a statute citation is on the row face`);
        ok(did[1].slice(0, 40).toLowerCase() !== why[1].slice(0, 40).toLowerCase(),
          `${m.number}/${iss.issueKey}: both mechanism lines open with the same clause`);
      }
    }
    eq(pairs, 28, "the shipped file does not carry a mechanism pair for all twenty-eight judged acts");
    // The withheld seven have no pairs, because they have no mappings to explain.
    for (const n of ZERO_MAPPING)
      ok(!map.includes(`'${n}|119|`), `${n} carries a mechanism pair and no mapping — prose explaining a link that does not exist`);
    // A no-pole row must not be given a direction in the copy it does carry.
    for (const m of decide.measures) {
      const wp = (m.issues || []).find((i) => i.issueKey === "war_powers");
      if (!wp) continue;
      const at = map.indexOf(`'${m.number}|119|war_powers': {`);
      if (at === -1) continue;
      const end = map.indexOf("\n    },", at);
      const entry = map.slice(at, end === -1 ? at + 2000 : end);
      ok(/inventory|no stance|prints no/i.test(entry),
        `${m.number}/war_powers: the face does not say that this chip prints no direction — war_powers is in _RD_NO_POLE and the row will render without one`);
    }
  }

  const head = boot(headSrc, "HEAD");
  const work = boot(nowSrc, "working");
  if (ok(!!(head && head.PDXWordAction && head.PDXWordAction.read), "the pre-wave engine booted from HEAD")
    && ok(!!(work && work.PDXWordAction && work.PDXWordAction.read), "the current engine booted")) {
    const PIDS = Object.keys(head.CMP_DATA || {});
    ok(PIDS.length > 100, `the roster booted (${PIDS.length} profiles)`);
    eq(Object.keys(work.CMP_DATA || {}).length, PIDS.length, "the roster changed size");

    const READ_KEYS = ["pct", "publishable", "word", "testedWeight"];
    const COV_KEYS = ["word", "scorable", "tested", "untested", "issueLinked", "notIssueLinked", "recordDerived", "warming"];
    let dm = 0, dmBad = 0;
    for (const pid of PIDS) {
      let a = null, b = null;
      try { a = head.PDXWordAction.read(pid); } catch (e) { continue; }
      try { b = work.PDXWordAction.read(pid); } catch (e) { b = null; }
      if (!a) continue;
      if (!b) { dmBad++; failures.push(`${pid}: Direction Match stopped returning`); continue; }
      dm++;
      for (const k of READ_KEYS) if (b[k] !== a[k]) { dmBad++; failures.push(`${pid}: DM ${k} moved — ${JSON.stringify(a[k])} → ${JSON.stringify(b[k])}`); }
      const ca = a.coverage || {}, cb = b.coverage || {};
      for (const k of COV_KEYS) if (cb[k] !== ca[k]) { dmBad++; failures.push(`${pid}: DM coverage.${k} moved`); }
    }
    ok(dm > 100, `the Direction Match sweep was wide enough to mean something (${dm} profiles)`);
    eq(dmBad, 0, "Direction Match drifted — F7 writes roll calls and mappings to the database, and no score, no stance and no support_meaning of any existing row");

    let rows = 0, rowBad = 0;
    for (const pid of PIDS) {
      let ra = [], rb = [];
      try { ra = head.PDXConsistency.issueRows(pid) || []; } catch (e) { continue; }
      try { rb = work.PDXConsistency.issueRows(pid) || []; } catch (e) { rb = []; }
      if (rb.map((r) => r.key).join("|") !== ra.map((r) => r.key).join("|")) { rowBad++; failures.push(`${pid}: the issue-row list changed`); }
      const byKey = {};
      for (const r of rb) byKey[r.key] = r;
      for (const r of ra) {
        const q = byKey[r.key];
        if (!q) continue;
        rows++;
        let sa = null, sb = null;
        try { sa = head.PDXConsistency.rowResult(r); } catch (e) { sa = { __err: 1 }; }
        try { sb = work.PDXConsistency.rowResult(q); } catch (e) { sb = { __err: 1 }; }
        if (!sa || !sb) continue;
        for (const k of ["state", "metric", "pct"]) if (sb[k] !== sa[k]) { rowBad++; failures.push(`${pid}/${r.key}: row ${k} moved`); }
        if ((q.verdict || {}).token !== (r.verdict || {}).token) { rowBad++; failures.push(`${pid}/${r.key}: the verdict moved`); }
      }
    }
    ok(rows > 500, `the issue-row sweep was wide enough to mean something (${rows} rows)`);
    eq(rowBad, 0, "a per-issue row drifted");
    console.log(`      (twin boot: ${dm} DM reads, ${rows} issue rows — all identical)`);
  }
}

// ── 12. no party word in anything a reader sees ─────────────────────────
{
  // The party split IS measured — it is in each roll's totals, where the model already
  // carries it — and it is never a reason. So the check is on the prose that reaches a
  // reader: the rationales the migration writes, their mirror in the curated seed, the
  // refusals the seed publishes, and this wave's mechanism pairs.
  const PARTY = /\b(Republican|Democrat|Democratic|GOP|partisan|bipartisan|left-wing|right-wing|conservative|liberal)\b/i;
  let scanned = 0;
  const scan = (text, where) => { scanned++; const m = PARTY.exec(String(text || "")); ok(!m, `${where} names a party ("${m && m[0]}") — the record is the formal record`); };
  for (const m of decide.measures) {
    scan(m.purpose, `${m.number} purpose`);
    for (const i of m.issues || []) scan(i.rationale, `${m.number}/${i.issueKey} rationale`);
    for (const d of m.declinedKeys || []) scan(d.why, `${m.number} declined ${d.issueKey}`);
    if (m.whyNoMapping) scan(m.whyNoMapping, `${m.number} why no mapping`);
  }
  for (const m of (issueSeed.measures || []).filter((x) => /wave F7/i.test(String(x._comment || ""))))
    for (const i of m.issues || []) scan(i.rationale, `db/vr-issue-seed.json ${m.number}/${i.issueKey}`);
  for (const m of sql.matchAll(/'(yea_[a-z]+)', '((?:[^']|'')+)'\)/g)) scan(m[2].replace(/''/g, "'"), "a migration rationale");
  for (const v of votes.votes) scan(v.decisiveWhy, `roll ${v.rollNumber} decisiveWhy`);
  ok(scanned >= 80, `only ${scanned} strings were scanned for party language`);
  // The measurement itself must still be there — a wave that deleted the party split to
  // pass this check would have thrown away a chamber measurement.
  for (const v of votes.votes)
    ok(v.partyTotals && Object.keys(v.partyTotals).length >= 2,
      `roll ${v.rollNumber}: the chamber's party split is not recorded — it is a measurement off the source, kept out of the reasoning, not deleted`);
}

if (failures.length) {
  console.error(`\n  ✗ F7: ${failures.length} failure(s) of ${passed + failures.length} checks\n`);
  for (const f of failures.slice(0, 40)) console.error(`    - ${f}`);
  if (failures.length > 40) console.error(`    … ${failures.length - 40} more`);
  process.exit(1);
}
console.log(`\n  ✓ F7: all ${passed} checks passed`);
console.log(`    19 measures · 19 rolls (14 discharge · 4 passage · 1 amendment) · ${votes.memberVoteCount} attributed member votes`);
console.log(`    28 issue rows on 6 live keys · 12 primary / 16 secondary · 7 rolls ingested and honestly unmapped`);
console.log(`    0 keys added · 0 slugs added · 0 floors moved · 0 rows unread · 0 judged positions lost\n`);
